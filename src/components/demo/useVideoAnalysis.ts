import { useEffect, useRef, useState } from 'react';

interface HistogramData {
  r: number[];
  g: number[];
  b: number[];
  luma: number[];
}

export const useVideoAnalysis = (videoRef: React.RefObject<HTMLVideoElement>, isActive: boolean) => {
  const [histogram, setHistogram] = useState<HistogramData>({
    r: new Array(256).fill(0),
    g: new Array(256).fill(0),
    b: new Array(256).fill(0),
    luma: new Array(100).fill(0)
  });

  const processingRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simOffset = useRef(0);

  useEffect(() => {
    if (!isActive) {
      cancelAnimationFrame(processingRef.current);
      return;
    }

    const analyzeFrame = () => {
      const video = videoRef.current;
      
      // --- SIMULATION MODE ---
      // If video is missing, paused, or ended (likely permission denied), run simulation
      if (!video || video.paused || video.ended || video.readyState < 2) {
        simOffset.current += 0.05;
        const t = simOffset.current;

        // Generate fake cool looking data using sine waves
        const generateChannel = (phase: number) => {
            return Array.from({ length: 256 }, (_, i) => {
                // Create a bell curve that moves
                const x = (i - 128) / 64;
                const pos = Math.sin(t * 0.5 + phase) * 50; // Moving center
                const center = 128 + pos;
                const dist = Math.abs(i - center);
                // Gaussian-ish shape + noise
                const val = Math.exp(-(dist * dist) / (2000 + Math.sin(t * 2) * 500));
                return Math.max(0, val * (0.5 + Math.random() * 0.1));
            });
        };
        
        const generateWave = () => {
            return Array.from({ length: 50 }, (_, i) => {
                 return 100 + Math.sin(i * 0.2 + t) * 50 + Math.random() * 20;
            });
        };

        setHistogram({
            r: generateChannel(0),
            g: generateChannel(2),
            b: generateChannel(4),
            luma: generateWave()
        });

        processingRef.current = requestAnimationFrame(analyzeFrame);
        return;
      }

      // --- REAL ANALYSIS MODE ---
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
        canvasRef.current.width = 160; 
        canvasRef.current.height = 90; 
      }

      const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      try {
        ctx.drawImage(video, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const frameData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height).data;
        
        const r = new Array(256).fill(0);
        const g = new Array(256).fill(0);
        const b = new Array(256).fill(0);
        const waveformCols = 50;
        const lumaWave = new Array(waveformCols).fill(0);
        
        let maxCount = 0;

        for (let i = 0; i < frameData.length; i += 4) {
          const red = frameData[i];
          const green = frameData[i + 1];
          const blue = frameData[i + 2];
          
          r[red]++;
          g[green]++;
          b[blue]++;
          
          maxCount = Math.max(maxCount, r[red], g[green], b[blue]);

          const pixelIndex = i / 4;
          const col = Math.floor((pixelIndex % canvasRef.current.width) / (canvasRef.current.width / waveformCols));
          if (col < waveformCols) {
             const y = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
             lumaWave[col] += y;
          }
        }
        
        const pixelsPerCol = (canvasRef.current.width / waveformCols) * canvasRef.current.height;
        const normalizedLuma = lumaWave.map(v => v / pixelsPerCol);
        const normalize = (arr: number[]) => arr.map(v => v / (maxCount || 1));

        setHistogram({
            r: normalize(r),
            g: normalize(g),
            b: normalize(b),
            luma: normalizedLuma
        });

      } catch (e) {
        // If context lost or other error, just ignore frame
      }

      processingRef.current = requestAnimationFrame(analyzeFrame);
    };

    processingRef.current = requestAnimationFrame(analyzeFrame);

    return () => cancelAnimationFrame(processingRef.current);
  }, [isActive, videoRef]);

  return histogram;
};
