import React, { useEffect, useState, useRef } from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis } from 'recharts';

interface HistogramProps {
  imageSrc: string | null;
  className?: string;
  height?: number;
  color?: string;
}

export const Histogram = ({ imageSrc, className, height = 120, color = "#8884d8" }: HistogramProps) => {
  const [data, setData] = useState<{ index: number; r: number; g: number; b: number; l: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!imageSrc) return;

    const img = new Image();
    img.crossOrigin = "Anonymous"; // Enable CORS for external images
    img.src = imageSrc;

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Resize canvas to image size (or a smaller sample size for performance)
      // Sampling at 400px width is usually enough for histograms and much faster
      const scale = Math.min(1, 400 / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      
      // Initialize bins
      const rBins = new Array(256).fill(0);
      const gBins = new Array(256).fill(0);
      const bBins = new Array(256).fill(0);
      const lBins = new Array(256).fill(0);

      // Iterate pixels
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        // Luminance formula: 0.299R + 0.587G + 0.114B
        const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

        rBins[r]++;
        gBins[g]++;
        bBins[b]++;
        lBins[l]++;
      }

      // Normalize data for visualization
      const max = Math.max(...lBins);
      const histogramData = rBins.map((_, i) => ({
        index: i,
        r: rBins[i],
        g: gBins[i],
        b: bBins[i],
        l: lBins[i],
      }));

      setData(histogramData);
    };
  }, [imageSrc]);

  if (!imageSrc) return null;

  return (
    <div className={`w-full bg-black/20 border border-white/10 rounded p-2 backdrop-blur-sm ${className}`}>
      <canvas ref={canvasRef} className="hidden" />
      <div style={{ height: height, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorL" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorR" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff0000" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ff0000" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00ff00" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#00ff00" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorB" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0000ff" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0000ff" stopOpacity={0}/>
              </linearGradient>
            </defs>
            {/* Combined Luminance View by default, could be toggleable */}
            <Area type="monotone" dataKey="l" stroke="#ffffff" fillOpacity={1} fill="url(#colorL)" strokeWidth={1} isAnimationActive={false} />
            <Area type="monotone" dataKey="r" stroke="#ff4d4d" fillOpacity={1} fill="url(#colorR)" strokeWidth={1} strokeOpacity={0.5} isAnimationActive={false} />
            <Area type="monotone" dataKey="g" stroke="#4dff4d" fillOpacity={1} fill="url(#colorG)" strokeWidth={1} strokeOpacity={0.5} isAnimationActive={false} />
            <Area type="monotone" dataKey="b" stroke="#4d4dff" fillOpacity={1} fill="url(#colorB)" strokeWidth={1} strokeOpacity={0.5} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between px-2 mt-1">
        <span className="text-[8px] font-mono text-gray-500">0</span>
        <span className="text-[8px] font-mono text-gray-500">128</span>
        <span className="text-[8px] font-mono text-gray-500">255</span>
      </div>
    </div>
  );
};
