import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface FalseColorOverlayProps {
  imageSrc: string | null;
  isVisible: boolean;
  width: number;
  height: number;
}

export const FalseColorOverlay: React.FC<FalseColorOverlayProps> = ({
  imageSrc,
  isVisible,
  width,
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [legendVisible, setLegendVisible] = useState(false);

  useEffect(() => {
    if (!imageSrc || !canvasRef.current || !isVisible) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;

    img.onload = () => {
      // Set canvas dimensions to match display size for sharpness, 
      // or match image natural size for accuracy. 
      // Here we match the rendered size passed via props for alignment.
      canvas.width = width;
      canvas.height = height;

      // Draw original image first to get pixel data
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // ARRI False Color Scale (Approximate)
      // Purple (0-3%): Underexposed / Crushed Black
      // Blue (3-10%): Near Black
      // Grey (10-38%): Shadows
      // Green (38-42%): 18% Grey (Middle Grey / Skin Tone Shadow)
      // Pink (42-48%): Skin Tone Highlight (Caucasion/Asian avg)
      // Grey (48-95%): Highlights
      // Yellow (95-99%): Near White
      // Red (99-100%): Overexposed / Clipped

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Calculate Luminance (Rec.709 coefficients)
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        // Normalize to 0-100 scale
        const ire = (luma / 255) * 100;

        // Apply False Color Map
        let newR, newG, newB;

        if (ire < 3) { // Purple (Crushed Black)
          newR = 128; newG = 0; newB = 128; 
        } else if (ire < 10) { // Blue (Deep Shadow)
          newR = 0; newG = 0; newB = 255;
        } else if (ire >= 38 && ire < 42) { // Green (Middle Grey)
          newR = 0; newG = 255; newB = 0;
        } else if (ire >= 52 && ire < 58) { // Pink (Skin Tone)
          newR = 255; newG = 105; newB = 180;
        } else if (ire > 95 && ire < 99) { // Yellow (Near Clip)
          newR = 255; newG = 255; newB = 0;
        } else if (ire >= 99) { // Red (Clipped)
          newR = 255; newG = 0; newB = 0;
        } else {
          // Retain original greyscale for context in other areas
          // or map to distinct greys to reduce distraction
          const greyVal = luma * 0.5; // Dim the non-critical areas
          newR = greyVal; newG = greyVal; newB = greyVal;
        }

        data[i] = newR;
        data[i + 1] = newG;
        data[i + 2] = newB;
      }

      ctx.putImageData(imageData, 0, 0);
    };
  }, [imageSrc, isVisible, width, height]);

  if (!isVisible) return null;

  return (
    <div 
      className="absolute inset-0 z-20 pointer-events-none transition-opacity duration-300"
      onMouseEnter={() => setLegendVisible(true)}
      onMouseLeave={() => setLegendVisible(false)}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover"
        style={{ imageRendering: "pixelated" }}
      />
      
      {/* Legend Overlay - Always visible when False Color is active for clarity */}
      <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-lg text-xs font-mono space-y-1.5 shadow-2xl pointer-events-auto">
        <div className="text-white/50 mb-2 font-bold uppercase tracking-wider">Exposure Map</div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[rgb(255,0,0)] rounded-full shadow-[0_0_8px_rgba(255,0,0,0.8)]"></span>
          <span className="text-red-200">Clipped (Overexposed)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[rgb(255,255,0)] rounded-full shadow-[0_0_8px_rgba(255,255,0,0.6)]"></span>
          <span className="text-yellow-200">Near White</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[rgb(255,105,180)] rounded-full shadow-[0_0_8px_rgba(255,105,180,0.6)]"></span>
          <span className="text-pink-300 font-bold">Skin Tones (Face)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[rgb(0,255,0)] rounded-full shadow-[0_0_8px_rgba(0,255,0,0.6)]"></span>
          <span className="text-green-300 font-bold">Middle Grey (Exposure Target)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[rgb(0,0,255)] rounded-full shadow-[0_0_8px_rgba(0,0,255,0.6)]"></span>
          <span className="text-blue-300">Deep Shadow</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[rgb(128,0,128)] rounded-full shadow-[0_0_8px_rgba(128,0,128,0.6)]"></span>
          <span className="text-purple-300">Crushed Black (Loss of Detail)</span>
        </div>
      </div>
    </div>
  );
};
