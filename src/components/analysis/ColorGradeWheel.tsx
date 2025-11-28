import React, { useState } from 'react';
import { ColorGradingPoint } from '../../types/analysis';
import { Terminal } from 'lucide-react';
import { useLanguage } from '../../src/contexts/LanguageContext';

interface ColorGradeWheelProps {
  highlights: ColorGradingPoint;
  midtones: ColorGradingPoint;
  shadows: ColorGradingPoint;
}

const Wheel: React.FC<{ data: ColorGradingPoint; label: string; color: string; onHover: (t: string | null) => void }> = ({ data, label, color, onHover }) => {
  const { t } = useLanguage();
  const radius = (data.saturation / 100) * 40;
  const angleRad = (data.hue - 90) * (Math.PI / 180); 
  const x = 50 + radius * Math.cos(angleRad);
  const y = 50 + radius * Math.sin(angleRad);

  // 【功能】生成 hover 时显示的文本
  // 优先显示 reason 字段（调整原因描述），如果没有则显示默认文本
  const getHoverText = () => {
      // 【优先】如果有 reason 字段，直接显示（例如："高光注入微量青蓝，保持雪/浪花的冷洁感。"）
      if (data.reason) return `GRADING [${label.toUpperCase()}]: ${data.reason}`;
      
      // 【后备】如果没有 reason 字段，使用默认文本（包含色相和饱和度信息）
      const fallback = t('color.grade.pushing')
        .replace('{label}', label)
        .replace('{hue}', Math.round(data.hue).toString())
        .replace('{sat}', data.saturation.toString());
        
      return `GRADING [${label.toUpperCase()}]: ${fallback}`;
  };

  return (
    <div 
        className="flex flex-col items-center gap-2 group cursor-help"
        onMouseEnter={() => onHover(getHoverText())}
        onMouseLeave={() => onHover(null)}
    >
      <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-black/40 to-black/10 border border-white/10 shadow-inner overflow-hidden transition-all duration-300 group-hover:border-white/30 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]">
        <div className="absolute inset-0 opacity-30" style={{
           background: `conic-gradient(from 0deg, red, yellow, lime, cyan, blue, magenta, red)`
        }}></div>
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent mix-blend-overlay"></div>
        
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <div className="w-full h-px bg-white"></div>
            <div className="h-full w-px bg-white absolute"></div>
        </div>

        <div 
            className="absolute w-2 h-2 rounded-full border border-white shadow-[0_0_5px_rgba(255,255,255,0.8)] transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-out group-hover:scale-150"
            style={{ 
                left: `${x}%`, 
                top: `${y}%`,
                backgroundColor: color 
            }}
        ></div>
      </div>
      <div className="text-center">
        <div className="text-[10px] font-bold text-white/70 uppercase tracking-wider group-hover:text-white transition-colors">{label}</div>
        <div className="text-[9px] font-mono text-white/40 group-hover:text-optic-accent transition-colors">
            H:{Math.round(data.hue)}° S:{Math.round(data.saturation)}
        </div>
      </div>
    </div>
  );
};

export const ColorGradeWheel: React.FC<ColorGradeWheelProps> = ({ highlights, midtones, shadows }) => {
  const { t } = useLanguage();
  const [activeLog, setActiveLog] = useState<string | null>(null);

  const palette = [
    { h: shadows.hue, s: shadows.saturation, l: 20 },
    { h: midtones.hue, s: midtones.saturation, l: 50 },
    { h: highlights.hue, s: highlights.saturation, l: 80 },
  ];

  return (
    <div className="flex flex-col gap-4 relative min-h-full">
        {/* The Wheels */}
        <div className="flex justify-between gap-2 p-4 bg-black/20 rounded-lg border border-white/5">
            <Wheel data={shadows} label={t('modal.common.shadows')} color="#3b82f6" onHover={setActiveLog} />
            <Wheel data={midtones} label={t('modal.common.midtones')} color="#a855f7" onHover={setActiveLog} />
            <Wheel data={highlights} label={t('modal.common.highlights')} color="#f97316" onHover={setActiveLog} />
        </div>

        {/* Harmony Palette Strip */}
        <div className="flex h-8 rounded overflow-hidden border border-white/10">
            {palette.map((p, i) => (
                <div 
                    key={i} 
                    className="flex-1 flex items-end justify-center pb-1"
                    style={{ backgroundColor: `hsl(${p.h}, ${p.s}%, ${p.l}%)` }}
                >
                    <span className="text-[8px] font-mono text-white/50 drop-shadow-md mix-blend-difference">
                        {Math.round(p.h)}°
                    </span>
                </div>
            ))}
        </div>

        {/* Spacer */}
        <div className="h-16 w-full shrink-0"></div>

        {/* TACTICAL INTELLIGENCE TERMINAL - COLOR VARIANT */}
        <div className="sticky bottom-0 left-0 right-0 z-30 -mx-1 -mb-1">
            <div className="bg-[#0a0a0a]/95 backdrop-blur border-t border-white/20 p-3 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] rounded-b-lg">
                <div className="flex items-start gap-3">
                    <div className="mt-1 p-1 bg-orange-500/10 rounded border border-orange-500/20 shrink-0">
                        <Terminal className="w-3 h-3 text-orange-400" />
                    </div>
                    <div className="flex-1 font-mono text-[10px] md:text-xs leading-relaxed">
                        <span className="text-white/40 mr-2">{t('color.grade.engine')} {">"}</span>
                        {activeLog ? (
                            <span className="text-orange-300 animate-pulse-fast">{activeLog}</span>
                        ) : (
                            <span className="text-white/20 italic">{t('color.grade.awaiting')}</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
