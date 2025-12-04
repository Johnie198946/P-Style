import React, { useState } from 'react';
import { HSLData } from '../../types/analysis';
import { cn } from '../ui/utils';
import { Terminal, Activity } from 'lucide-react';
import { useLanguage } from '../../src/contexts/LanguageContext';

interface HSLVisualizerProps {
  data: HSLData;
  onHover?: (text: string | null) => void;
}

const HolographicChannel = ({ name, code, data, onHover }: { name: string, code: string, data: any, onHover: (text: string | null) => void }) => {
    const { t } = useLanguage();
    const totalBlocks = 20; 
    const normalizedVal = Math.round(data.saturation / 10); 
    
    // 【修复】生成完整的通道调整说明文本
    // 优先使用后端返回的 reason 字段，如果没有则根据 HSL 值生成详细说明
    const getChannelReason = (name: string, data: any) => {
        // 【优先】如果后端提供了 reason 字段，直接使用
        if (data.reason && data.reason.trim()) {
            return data.reason;
        }
        
        // 【生成】根据 HSL 值生成详细的调整说明
        const changes = [];
        
        // 色相调整（即使值较小也显示，因为色相调整很重要）
        if (data.hue !== 0 && Math.abs(data.hue) > 0) {
            const hueDesc = data.hue > 0 
                ? t('hsl.reason.hue_plus').replace('{value}', Math.abs(data.hue).toString())
                : t('hsl.reason.hue_minus').replace('{value}', Math.abs(data.hue).toString());
            changes.push(hueDesc);
        }
        
        // 饱和度调整
        if (data.saturation !== 0 && Math.abs(data.saturation) > 0) {
            const satDesc = data.saturation > 0 
                ? t('hsl.reason.sat_plus').replace('{value}', Math.abs(data.saturation).toString())
                : t('hsl.reason.sat_minus').replace('{value}', Math.abs(data.saturation).toString());
            changes.push(satDesc);
        }
        
        // 明度调整
        if (data.luminance !== 0 && Math.abs(data.luminance) > 0) {
            const lumDesc = data.luminance > 0 
                ? t('hsl.reason.lum_plus').replace('{value}', Math.abs(data.luminance).toString())
                : t('hsl.reason.lum_minus').replace('{value}', Math.abs(data.luminance).toString());
            changes.push(lumDesc);
        }
        
        // 如果没有任何调整，返回默认说明
        if (changes.length === 0) {
            return t('hsl.reason.no_adjust').replace('{name}', name);
        }
        
        // 组合完整的说明文本
        const changesText = changes.join('，');
        return t('hsl.reason.full')
            .replace('{name}', name)
            .replace('{changes}', changesText);
    };

    return (
        <div 
            className="flex flex-col items-center gap-2 group flex-1 min-w-[40px] cursor-help"
            onMouseEnter={() => onHover(`CHANNEL [${name.toUpperCase()}]: ${getChannelReason(name, data)}`)}
            onMouseLeave={() => onHover(null)}
        >
            <div className="relative w-full h-48 bg-black/40 rounded border border-white/5 flex flex-col-reverse overflow-hidden backdrop-blur-sm transition-colors group-hover:border-white/20 group-hover:bg-white/5">
                <div className="absolute inset-x-0 top-1/2 h-px bg-white/20 z-10"></div>
                <div className="absolute inset-0 grid grid-rows-20 opacity-20 pointer-events-none">
                    {[...Array(20)].map((_, i) => (
                        <div key={i} className="border-t border-white/10 w-full h-full"></div>
                    ))}
                </div>
                <div className="absolute inset-0 w-full h-full pointer-events-none">
                   {[...Array(totalBlocks)].map((_, i) => {
                       const blockIndex = i;
                       const isTopHalf = blockIndex >= 10;
                       const distFromCenter = isTopHalf ? (blockIndex - 10) : (9 - blockIndex);
                       let isActive = false;
                       if (normalizedVal > 0 && isTopHalf) {
                           isActive = distFromCenter < normalizedVal;
                       } else if (normalizedVal < 0 && !isTopHalf) {
                           isActive = distFromCenter < Math.abs(normalizedVal);
                       }

                       const bottomPct = (blockIndex / totalBlocks) * 100;
                       const heightPct = 100 / totalBlocks;

                       if (!isActive) return null;

                       return (
                           <div 
                                key={i} 
                                className="absolute inset-x-0 shadow-[0_0_8px_currentColor] transition-all duration-500"
                                style={{ 
                                    bottom: `${bottomPct}%`,
                                    height: `${heightPct}%`,
                                    backgroundColor: code,
                                    color: code,
                                    opacity: 0.8 + (data.luminance / 200)
                                }}
                           ></div>
                       );
                   })}
                </div>
            </div>

            <div className="text-center w-full">
                <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold border border-white/10 mb-2 mx-auto shadow-[0_0_10px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: code, color: 'black' }}
                >
                    {name.charAt(0)}
                </div>
                <div className="flex flex-col text-[9px] font-mono text-white/50 gap-0.5 group-hover:text-white transition-colors">
                    <span className={data.hue !== 0 ? "text-white font-bold" : ""}>H {data.hue}</span>
                    <span className={data.saturation !== 0 ? "text-optic-accent font-bold" : ""}>S {data.saturation}</span>
                    <span className={data.luminance !== 0 ? "text-white font-bold" : ""}>L {data.luminance}</span>
                </div>
            </div>
        </div>
    );
}

export const HSLVisualizer: React.FC<HSLVisualizerProps> = ({ data, onHover }) => {
  const { t } = useLanguage();
  const [activeLog, setActiveLog] = useState<string | null>(null);

  const handleHover = (text: string | null) => {
      if (onHover) {
          onHover(text);
      } else {
          setActiveLog(text);
      }
  };

  const channels = [
    { name: t('hsl.channel.red'), code: '#ef4444', val: data.red },
    { name: t('hsl.channel.orange'), code: '#f97316', val: data.orange },
    { name: t('hsl.channel.yellow'), code: '#eab308', val: data.yellow },
    { name: t('hsl.channel.green'), code: '#22c55e', val: data.green },
    { name: t('hsl.channel.aqua'), code: '#06b6d4', val: data.aqua },
    { name: t('hsl.channel.blue'), code: '#3b82f6', val: data.blue },
    { name: t('hsl.channel.purple'), code: '#a855f7', val: data.purple },
    { name: t('hsl.channel.magenta'), code: '#ec4899', val: data.magenta },
  ];

  return (
    <div className="flex flex-col relative min-h-full"> 
        <div className="p-6 bg-[#121212] rounded-lg border border-white/10">
            <div className="flex justify-between items-end gap-2 overflow-x-auto pb-4 custom-scrollbar">
                {channels.map(c => (
                    <HolographicChannel key={c.name} name={c.name} code={c.code} data={c.val} onHover={handleHover} />
                ))}
            </div>
            <div className="flex justify-between items-center border-t border-white/10 pt-3">
                <div className="text-[10px] text-white/30 uppercase tracking-[0.2em]">{t('hsl.matrix.title')}</div>
                <div className="flex gap-4 text-[9px] text-white/30">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 bg-white/20"></div> {t('hsl.matrix.sat')}</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 border border-white/20"></div> {t('hsl.matrix.lum')}</span>
                </div>
            </div>
        </div>

        {!onHover && (
            <>
                {/* Spacer */}
                <div className="h-16 w-full shrink-0"></div>

                {/* TACTICAL INTELLIGENCE TERMINAL - HSL VARIANT */}
                <div className="sticky bottom-0 left-0 right-0 z-30 -mx-1 -mb-1">
                    <div className="bg-[#0a0a0a]/95 backdrop-blur border-t border-white/20 p-3 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] rounded-b-lg">
                        <div className="flex items-start gap-3">
                            <div className="mt-1 p-1 bg-purple-500/10 rounded border border-purple-500/20 shrink-0">
                                <Terminal className="w-3 h-3 text-purple-400" />
                            </div>
                            <div className="flex-1 font-mono text-[10px] md:text-xs leading-relaxed">
                                <span className="text-white/40 mr-2">{t('hsl.matrix.engine')} {">"}</span>
                                {activeLog ? (
                                    <span className="text-purple-300 animate-pulse-fast">{activeLog}</span>
                                ) : (
                                    <span className="text-white/20 italic">{t('hsl.matrix.idle')}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </>
        )}
    </div>
  );
};
