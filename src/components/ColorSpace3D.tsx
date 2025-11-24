import React, { useRef, useEffect } from 'react';

interface ColorSpace3DProps {
  imageSrc: string | null;
  width?: number;
  height?: number;
  className?: string;
}

export const ColorSpace3D = ({ imageSrc, width = 300, height = 300, className }: ColorSpace3DProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  
  // 3D State
  const rotation = useRef({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  
  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Load Image & Sample Pixels
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageSrc;
    
    img.onload = () => {
      // Create a temp canvas to read pixel data
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 100; // Downsample for performance
      tempCanvas.height = 100 * (img.height / img.width);
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;
      
      tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
      const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
      
      // Generate 3D Points (Particles)
      const particles: {x:number, y:number, z:number, color:string}[] = [];
      const step = 4; // Sampling step
      
      for (let i = 0; i < imgData.length; i += 4 * step) {
        const r = imgData[i];
        const g = imgData[i+1];
        const b = imgData[i+2];
        // Alpha check
        if (imgData[i+3] < 128) continue; 

        // Map RGB (0-255) to 3D Space (-1 to 1)
        particles.push({
          x: (r / 127.5) - 1,     // Red is X axis
          y: (g / 127.5) - 1,     // Green is Y axis
          z: (b / 127.5) - 1,     // Blue is Z axis
          color: `rgb(${r},${g},${b})`
        });
      }

      // 2. 3D Rendering Loop
      const render = () => {
        // Smooth rotation interpolation
        rotation.current.x += (targetRotation.current.x - rotation.current.x) * 0.1;
        rotation.current.y += (targetRotation.current.y - rotation.current.y) * 0.1;
        
        // Auto rotate slightly if not interacting
        if (!isDragging.current) {
            targetRotation.current.y += 0.002;
        }

        ctx.clearRect(0, 0, width, height);
        
        // Center of canvas
        const cx = width / 2;
        const cy = height / 2;
        const fov = 250; // Field of view

        // Sort particles by Z for correct occlusion (Painter's Algorithm)
        // Calculating rotated Z for sorting is expensive, so we do a simplified sort or skip for performance
        // For a point cloud, additive blending often looks better without strict sorting
        
        ctx.globalCompositeOperation = 'screen'; // Glow effect

        particles.forEach(p => {
          // Rotate Y
          const cosY = Math.cos(rotation.current.y);
          const sinY = Math.sin(rotation.current.y);
          let x1 = p.x * cosY - p.z * sinY;
          let z1 = p.z * cosY + p.x * sinY;
          
          // Rotate X
          const cosX = Math.cos(rotation.current.x);
          const sinX = Math.sin(rotation.current.x);
          let y2 = p.y * cosX - z1 * sinX;
          let z2 = z1 * cosX + p.y * sinX;

          // Project to 2D
          // Push z back so we don't divide by zero
          const scale = fov / (fov + (z2 * 100) + 300); 
          const x2d = cx + x1 * 100 * scale;
          const y2d = cy + y2 * 100 * scale;
          const size = Math.max(0.5, 2 * scale);

          // Draw
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(x2d, y2d, size, 0, Math.PI * 2);
          ctx.fill();
        });
        
        // Draw Axis Labels (Optional)
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'white';
        ctx.font = '10px monospace';
        ctx.fillText('RGB CUBE', 10, 20);

        animationRef.current = requestAnimationFrame(render);
      };

      render();
    };

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [imageSrc, width, height]);

  // Mouse Interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - lastMouse.current.x;
    const deltaY = e.clientY - lastMouse.current.y;
    
    targetRotation.current.y += deltaX * 0.01;
    targetRotation.current.x += deltaY * 0.01;
    
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <div 
        ref={containerRef}
        className={`relative border border-white/10 bg-black/50 rounded overflow-hidden cursor-move ${className}`}
        style={{ width, height }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
      <canvas ref={canvasRef} width={width} height={height} />
      
      {/* Decorative UI Overlay */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-2 right-2 flex gap-1">
             <div className="w-1 h-1 bg-red-500 rounded-full"></div>
             <div className="w-1 h-1 bg-green-500 rounded-full"></div>
             <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
        </div>
        <div className="absolute bottom-2 left-2 text-[8px] text-gray-500 font-mono">R-G-B SPACE</div>
      </div>
    </div>
  );
};
