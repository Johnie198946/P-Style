import React, { useEffect, useRef } from 'react';

interface RealtimeHistogramProps {
  data: {
    r: number[];
    g: number[];
    b: number[];
    luma: number[];
  };
  height?: number;
}

export const RealtimeHistogram: React.FC<RealtimeHistogramProps> = ({ data, height = 64 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Blend mode for overlapping colors
    ctx.globalCompositeOperation = 'screen';
    
    const drawChannel = (channelData: number[], color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      
      const barWidth = canvas.width / 256;
      
      channelData.forEach((val, i) => {
        const barHeight = val * canvas.height;
        ctx.lineTo(i * barWidth, canvas.height - barHeight);
      });
      
      ctx.lineTo(canvas.width, canvas.height);
      ctx.fill();
    };

    drawChannel(data.r, 'rgba(255, 50, 50, 0.6)');
    drawChannel(data.g, 'rgba(50, 255, 50, 0.6)');
    drawChannel(data.b, 'rgba(50, 50, 255, 0.6)');
    
    // Draw RGB Parade / Waveform overlay (simplified line)
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const waveWidth = canvas.width / data.luma.length;
    data.luma.forEach((val, i) => {
       const y = canvas.height - (val / 255 * canvas.height);
       if (i === 0) ctx.moveTo(0, y);
       else ctx.lineTo(i * waveWidth, y);
    });
    ctx.stroke();

  }, [data]);

  return (
    <div className="relative w-full bg-black/40 border border-white/10 rounded overflow-hidden backdrop-blur-sm">
       <canvas 
         ref={canvasRef} 
         width={300} 
         height={height} 
         className="w-full h-full opacity-80"
       />
       <div className="absolute top-1 left-1 text-[8px] font-mono text-white/50 uppercase">RGB_HISTOGRAM // LIVE_FEED</div>
    </div>
  );
};
