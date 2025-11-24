import React, { useEffect, useRef } from 'react';
import { HandLandmarkerResult } from '@mediapipe/tasks-vision';

interface HandVisualizerProps {
  results: HandLandmarkerResult | null;
}

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [0, 9], [9, 10], [10, 11], [11, 12], // Middle
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring
  [0, 17], [17, 18], [18, 19], [19, 20]  // Pinky
];

export const HandVisualizer: React.FC<HandVisualizerProps> = ({ results }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !results) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw each detected hand
    results.landmarks.forEach((landmarks) => {
        // 1. Draw Connections (Bones)
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)'; // Cyan Sci-fi

        CONNECTIONS.forEach(([start, end]) => {
            const p1 = landmarks[start];
            const p2 = landmarks[end];
            
            // Mirror X
            const x1 = (1 - p1.x) * canvas.width;
            const y1 = p1.y * canvas.height;
            const x2 = (1 - p2.x) * canvas.width;
            const y2 = p2.y * canvas.height;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        });

        // 2. Draw Joints (Nodes)
        landmarks.forEach((point, index) => {
             const x = (1 - point.x) * canvas.width;
             const y = point.y * canvas.height;
             
             ctx.beginPath();
             // Fingertips are larger
             const size = [4, 8, 12, 16, 20].includes(index) ? 6 : 3; 
             ctx.arc(x, y, size, 0, 2 * Math.PI);
             
             if ([4, 8].includes(index)) {
                 // Interaction points (Thumb/Index) are bright
                 ctx.fillStyle = '#00ffff';
                 ctx.shadowBlur = 10;
                 ctx.shadowColor = '#00ffff';
             } else {
                 ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                 ctx.shadowBlur = 0;
             }
             
             ctx.fill();
        });
    });

  }, [results]);

  return (
    <canvas 
        ref={canvasRef} 
        width={window.innerWidth} 
        height={window.innerHeight} 
        className="absolute inset-0 pointer-events-none z-[60]"
    />
  );
};
