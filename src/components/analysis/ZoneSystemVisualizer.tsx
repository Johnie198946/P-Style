import React, { useEffect, useState, useRef, useMemo } from "react";
import { motion } from "motion/react";
import { useLanguage } from "../../src/contexts/LanguageContext";

interface ZoneSystemVisualizerProps {
  imageSrc: string | null;
  className?: string;
}

export const ZoneSystemVisualizer: React.FC<ZoneSystemVisualizerProps> = ({ imageSrc, className }) => {
  const { t } = useLanguage();
  const [zoneData, setZoneData] = useState<number[]>(new Array(11).fill(0));
  const [peakZone, setPeakZone] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Ansel Adams Zone System Definitions (Localized)
  const ZONES = useMemo(() => [
    { id: 0, label: "0", name: t('zone.name.0'), range: [0, 25], color: "#000000", desc: t('zone.desc.0') },
    { id: 1, label: "I", name: t('zone.name.1'), range: [26, 50], color: "#1a1a1a", desc: t('zone.desc.1') },
    { id: 2, label: "II", name: t('zone.name.2'), range: [51, 75], color: "#333333", desc: t('zone.desc.2') },
    { id: 3, label: "III", name: t('zone.name.3'), range: [76, 100], color: "#4d4d4d", desc: t('zone.desc.3') },
    { id: 4, label: "IV", name: t('zone.name.4'), range: [101, 126], color: "#666666", desc: t('zone.desc.4') },
    { id: 5, label: "V", name: t('zone.name.5'), range: [127, 152], color: "#808080", desc: t('zone.desc.5') },
    { id: 6, label: "VI", name: t('zone.name.6'), range: [153, 177], color: "#999999", desc: t('zone.desc.6') },
    { id: 7, label: "VII", name: t('zone.name.7'), range: [178, 203], color: "#b3b3b3", desc: t('zone.desc.7') },
    { id: 8, label: "VIII", name: t('zone.name.8'), range: [204, 228], color: "#cccccc", desc: t('zone.desc.8') },
    { id: 9, label: "IX", name: t('zone.name.9'), range: [229, 245], color: "#e6e6e6", desc: t('zone.desc.9') },
    { id: 10, label: "X", name: t('zone.name.10'), range: [246, 255], color: "#ffffff", desc: t('zone.desc.10') },
  ], [t]);

  useEffect(() => {
    if (!imageSrc) return;

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageSrc;

    img.onload = () => {
      const canvas = document.createElement("canvas"); // Offscreen
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Downsample for performance
      const scale = Math.min(1, 300 / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const totalPixels = data.length / 4;

      const zones = new Array(11).fill(0);

      for (let i = 0; i < data.length; i += 4) {
        // Standard Luma Rec.709
        const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        
        // Find which zone this pixel belongs to
        const zoneIndex = Math.floor((luma / 256) * 11);
        const safeIndex = Math.min(10, Math.max(0, zoneIndex));
        zones[safeIndex]++;
      }

      // Normalize to percentages
      const normalizedZones = zones.map(count => (count / totalPixels) * 100);
      setZoneData(normalizedZones);
      
      // Find peak zone
      const maxVal = Math.max(...normalizedZones);
      setPeakZone(normalizedZones.indexOf(maxVal));
    };
  }, [imageSrc]);

  return (
    <div className={`w-full flex flex-col gap-4 ${className}`}>
      <div className="flex items-center justify-between mb-1">
         <span className="text-xs font-bold text-white uppercase tracking-wider">{t('zone.system.title')}</span>
         <span className="text-[10px] text-white/40 font-mono">{t('zone.system.subtitle')}</span>
      </div>

      {/* The Visualizer */}
      <div className="relative h-32 w-full bg-black/40 border border-white/10 rounded-lg flex items-end justify-between px-2 pb-6 pt-2 overflow-hidden">
         {/* Grid Lines */}
         <div className="absolute inset-0 flex flex-col justify-between py-6 px-2 pointer-events-none opacity-20">
            <div className="w-full h-px bg-white border-t border-dashed border-white/50"></div>
            <div className="w-full h-px bg-white border-t border-dashed border-white/50"></div>
            <div className="w-full h-px bg-white border-t border-dashed border-white/50"></div>
         </div>

         {ZONES.map((zone, index) => {
            const heightPercent = Math.min(100, Math.max(2, zoneData[index] * 4)); // Amplify small values for visibility
            const isPeak = index === peakZone;
            const isSkinZone = index === 6;

            return (
               <div key={zone.id} className="flex-1 h-full flex flex-col justify-end items-center gap-1 group relative z-10">
                  {/* Bar */}
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    className={`w-full max-w-[18px] rounded-t-sm relative transition-all duration-300 
                        ${isPeak ? 'bg-optic-accent shadow-[0_0_10px_rgba(56,189,248,0.5)]' : 'bg-white/20 hover:bg-white/40'}
                    `}
                  >
                    {/* Skin Tone Marker (Zone VI) */}
                    {isSkinZone && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-max">
                            <div className="bg-pink-500/20 text-pink-300 text-[8px] px-1 py-0.5 rounded border border-pink-500/50 backdrop-blur-sm">
                                {t('zone.face')}
                            </div>
                            <div className="w-px h-2 bg-pink-500/50 mx-auto"></div>
                        </div>
                    )}
                  </motion.div>

                  {/* Label */}
                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-white/50 font-bold">
                    {zone.label}
                  </div>

                  {/* Tooltip (On Hover) */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 min-w-[100px]">
                     <div className="bg-black/90 border border-white/20 rounded p-2 text-[9px] text-center backdrop-blur-md shadow-xl">
                        <div className="font-bold text-white mb-0.5">Zone {zone.label}</div>
                        <div className="text-white/70">{zone.name}</div>
                        <div className="text-white/40 mt-1">{zone.desc}</div>
                        <div className="text-optic-accent mt-1 font-mono">{zoneData[index].toFixed(1)}%</div>
                     </div>
                  </div>
               </div>
            );
         })}
      </div>
      
      <div className="flex justify-between text-[9px] text-white/30 px-2">
          <span>{t('zone.pure_black')}</span>
          <span>{t('zone.middle_grey')}</span>
          <span>{t('zone.pure_white')}</span>
      </div>
    </div>
  );
};
