import React, { useState } from 'react';
import { AdvancedPhotoshopData } from '../../src/lib/mockData';
import { Terminal, Activity, ChevronRight, Layers, MousePointer2, Sun, Eye, Sliders, Maximize2, Aperture, Droplets } from 'lucide-react';
import { cn } from '../ui/utils';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { ProfessionalHistogram } from './ProfessionalHistogram';

// --- STYLES & ANIMATIONS ---
const globalStyles = `
  @keyframes scanline {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100%); }
  }
  .animate-scanline {
    animation: scanline 8s linear infinite;
  }
  .text-shadow-blue {
    text-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
  }
`;

interface PhotoshopPanelProps {
  data: AdvancedPhotoshopData;
}

// --- INDUSTRIAL UI COMPONENTS ---

const ScanlineOverlay = () => (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden opacity-30 mix-blend-overlay">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none"></div>
        <div className="absolute inset-0 animate-scanline bg-gradient-to-b from-transparent via-blue-500/5 to-transparent h-[20%] w-full"></div>
    </div>
);

const TechCorner = ({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) => {
    const borderClass = 
        position === 'tl' ? 'border-t-2 border-l-2 rounded-tl-md' :
        position === 'tr' ? 'border-t-2 border-r-2 rounded-tr-md' :
        position === 'bl' ? 'border-b-2 border-l-2 rounded-bl-md' :
        'border-b-2 border-r-2 rounded-br-md';
    
    return (
        <div className={`absolute w-3 h-3 border-blue-500/40 ${borderClass} ${position === 'tl' ? 'top-0 left-0' : position === 'tr' ? 'top-0 right-0' : position === 'bl' ? 'bottom-0 left-0' : 'bottom-0 right-0'}`}></div>
    );
};

const BlendBadge = ({ mode, opacity }: { mode: string, opacity: number }) => (
    <div className="flex items-center gap-2 bg-black/60 px-2 py-0.5 rounded border border-white/10 backdrop-blur-sm">
        <span className="text-[8px] font-mono text-blue-400 uppercase tracking-wider">{mode}</span>
        <div className="h-2 w-px bg-white/10"></div>
        <span className="text-[8px] font-mono text-white/60">{opacity}%</span>
    </div>
);

// --- SEMANTIC THUMBNAILS ---

const LayerThumbnail = ({ type, color = '#fff' }: { type: string, color?: string }) => {
    return (
        <div className="w-8 h-8 bg-black border border-white/20 mr-3 shrink-0 relative overflow-hidden rounded-sm group-hover:border-blue-500/50 transition-colors">
            {/* Checkerboard transparency bg */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)', backgroundSize: '4px 4px' }}></div>
            
            {/* Content based on type */}
            {type === 'curves' && (
                <svg viewBox="0 0 10 10" className="absolute inset-0 w-full h-full p-1 stroke-white fill-none" strokeWidth="0.5">
                    <path d="M0 10 C 3 10, 7 0, 10 0" />
                </svg>
            )}
            {type === 'levels' && (
                <div className="absolute inset-0 bg-gradient-to-r from-black via-gray-500 to-white opacity-80"></div>
            )}
            {type === 'color' && (
                <div className="absolute inset-0 flex flex-wrap">
                    <div className="w-1/2 h-1/2 bg-red-500/50"></div>
                    <div className="w-1/2 h-1/2 bg-green-500/50"></div>
                    <div className="w-1/2 h-1/2 bg-blue-500/50"></div>
                    <div className="w-1/2 h-1/2 bg-yellow-500/50"></div>
                </div>
            )}
            {type === 'brush' && (
                <svg viewBox="0 0 10 10" className="absolute inset-0 w-full h-full p-1 fill-white/80">
                    <circle cx="5" cy="5" r="3" filter="blur(1px)" />
                    <path d="M2 8 Q 5 5, 8 2" stroke="white" strokeWidth="0.5" fill="none" />
                </svg>
            )}
             {type === 'atmos' && (
                <div className="absolute inset-0 blur-[2px]" style={{ background: `radial-gradient(circle at center, ${color}, transparent)` }}></div>
            )}
            {type === 'base' && (
                 <Sun className="w-4 h-4 text-white/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            )}
        </div>
    );
};

const LayerStrip = ({ 
    title, 
    icon: Icon, 
    children, 
    blendMode = "Normal", 
    opacity = 100, 
    isActive = false,
    visualizer,
    onToggle,
    isLast = false,
    type = 'generic', // new prop for thumbnail
    layerColor 
}: any) => {
    return (
        <div className="relative pl-6 group">
            {/* Timeline/Tree Connector Line */}
            <div className={cn(
                "absolute left-[11px] top-0 w-px bg-white/10 group-hover:bg-white/20 transition-colors",
                isLast ? "h-1/2" : "h-full"
            )}></div>
            <div className="absolute left-[7px] top-[22px] w-[9px] h-[9px] rounded-full border-2 border-[#0a0a0a] bg-white/10 group-hover:bg-blue-500 transition-colors z-10"></div>

            {/* Main Card */}
            <div className={cn(
                "mb-2 border transition-all duration-300 rounded-sm overflow-hidden",
                isActive 
                    ? "bg-[#0c0c0c] border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]" 
                    : "bg-[#080808] border-white/5 hover:border-white/10 hover:bg-[#0e0e0e]"
            )}>
                {/* Header */}
                <div 
                    className="flex items-center px-3 py-2 cursor-pointer"
                    onClick={onToggle}
                >
                    <div className="text-white/20 group-hover:text-white/60 transition-colors mr-3">
                        <Eye className="w-3.5 h-3.5" />
                    </div>

                    {/* NEW: Layer Thumbnail */}
                    <LayerThumbnail type={type} color={layerColor} />

                    <div className="flex flex-col flex-1 min-w-0 justify-center">
                        <div className="flex items-center gap-2 mb-0.5">
                             <Icon className={cn("w-3 h-3", isActive ? "text-blue-400" : "text-white/40")} />
                             <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wide truncate transition-colors", 
                                isActive ? "text-white" : "text-white/70"
                            )}>
                                {title}
                            </span>
                        </div>
                        {/* Micro-info under title */}
                         <div className="flex items-center gap-2 opacity-50">
                             <span className="text-[7px] font-mono uppercase text-white/60">{blendMode}</span>
                             <span className="w-px h-2 bg-white/20"></span>
                             <span className="text-[7px] font-mono uppercase text-white/60">{opacity}% OPACITY</span>
                         </div>
                    </div>

                    <ChevronRight className={cn("w-3 h-3 text-white/20 transition-transform duration-300", isActive && "rotate-90")} />
                </div>

                {/* Content Body */}
                <div className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-out",
                    isActive ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}>
                    <div className="overflow-hidden">
                        <div className="p-4 bg-[#050505] border-t border-white/5 relative">
                            {/* Inner shadow from top */}
                            <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/50 to-transparent pointer-events-none"></div>
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CyberSlider = ({ label, value, unit = '', min = -100, max = 100, onHover, reason }: any) => {
    const percentage = ((value - min) / (max - min)) * 100;
    const isBipolar = min < 0;
    
    return (
        <div className="group mb-4 last:mb-0 relative" onMouseEnter={() => onHover && onHover(`${label.toUpperCase()}: ${reason}`)} onMouseLeave={() => onHover && onHover(null)}>
            <div className="flex justify-between items-end mb-1.5">
                <span className="text-[9px] font-bold text-white/40 group-hover:text-blue-400 transition-colors uppercase">{label}</span>
                <span className="text-[9px] font-mono text-white bg-white/5 px-1.5 rounded">{value}{unit}</span>
            </div>
            <div className="h-4 relative cursor-crosshair flex items-center">
                <div className="absolute inset-x-0 h-0.5 bg-white/10 rounded-full"></div>
                {isBipolar && <div className="absolute left-[50%] top-1 bottom-1 w-px bg-white/20 h-2 -mt-0.5"></div>}
                <div 
                    className={cn("absolute h-0.5 bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)] transition-all duration-300 group-hover:bg-blue-400")}
                    style={{ 
                        left: isBipolar ? (value >= 0 ? '50%' : `${percentage}%`) : '0%',
                        width: isBipolar ? `${Math.abs(percentage - 50)}%` : `${percentage}%`
                    }}
                ></div>
                <div 
                    className="absolute w-1 h-2.5 bg-white shadow-sm transition-all duration-300 z-10"
                    style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}
                ></div>
            </div>
        </div>
    );
};

// --- VISUALIZATION WIDGETS ---

const SpatialGrid = ({ items, onHover }: any) => {
    const getIndices = (location: string) => {
        const loc = location.toLowerCase();
        if (loc.includes('corner') || loc.includes('edge')) return [0, 2, 6, 8];
        if (loc.includes('center') || loc.includes('subject') || loc.includes('face')) return [4];
        if (loc.includes('top') && loc.includes('left')) return [0];
        if (loc.includes('top') && loc.includes('right')) return [2];
        if (loc.includes('top')) return [1];
        if (loc.includes('bottom')) return [7];
        if (loc.includes('left')) return [3];
        if (loc.includes('right')) return [5];
        return [4];
    };

    return (
        <div className="flex gap-6">
            <div className="w-24 h-24 shrink-0 relative bg-[#1a1a1a] border border-white/10 p-px shadow-inner overflow-hidden">
                 {/* WIREFRAME BACKGROUND (Semantic Context) */}
                 <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <svg viewBox="0 0 100 100" className="w-full h-full stroke-white/50 fill-none" strokeWidth="0.5">
                        {/* Abstract Composition Lines */}
                        <circle cx="50" cy="40" r="20" /> {/* Head */}
                        <path d="M30 100 Q50 60 70 100" /> {/* Shoulders */}
                        <line x1="0" y1="0" x2="100" y2="100" strokeDasharray="2 2" />
                        <line x1="100" y1="0" x2="0" y2="100" strokeDasharray="2 2" />
                    </svg>
                 </div>

                {/* GRID OVERLAY */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-px">
                    {[...Array(9)].map((_, i) => {
                        const activeItem = items.find((item: any) => getIndices(item.location).includes(i));
                        const isDodge = activeItem?.tool === 'Dodge';
                        return (
                            <div 
                                key={i} 
                                className={cn(
                                    "transition-all duration-500 relative",
                                    activeItem ? (isDodge ? "bg-white/40 shadow-[inset_0_0_10px_white] z-10 backdrop-blur-sm" : "bg-black/60 shadow-inner z-10 backdrop-blur-sm") : "hover:bg-white/5"
                                )}
                            >
                                {activeItem && <div className={cn("absolute inset-0 border border-white/50", isDodge ? "animate-pulse" : "")}></div>}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="flex-1 space-y-2 py-1">
                {items.map((item: any, i: number) => (
                    <div key={i} className="group" onMouseEnter={() => onHover(`SPATIAL [${item.tool.toUpperCase()}]: ${item.reason}`)} onMouseLeave={() => onHover(null)}>
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                                <div className={cn("w-1.5 h-1.5 rounded-full", item.tool === 'Dodge' ? "bg-white shadow-[0_0_5px_white]" : "bg-black border border-white/50")}></div>
                                <span className="text-[9px] font-bold text-white/80 uppercase">{item.location}</span>
                            </div>
                            <span className="text-[8px] font-mono text-blue-400">{item.tool} {item.opacity}%</span>
                        </div>
                        <div className="text-[8px] text-gray-500 pl-3 leading-tight">{item.reason}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const AtmospherePreview = ({ color, opacity, type }: { color: string, opacity: number, type: 'fog' | 'grain' }) => {
    const { t } = useLanguage();
    if (type === 'grain') {
        return (
            <div className="w-full h-16 bg-[#111] border border-white/10 rounded relative overflow-hidden mb-4">
                <div className="absolute inset-0 opacity-40" style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='${opacity/100}'/%3E%3C/svg%3E")`,
                }}></div>
                <div className="absolute bottom-1 right-1 text-[7px] text-white/30 font-mono">{t('modal.ps.grain')}</div>
            </div>
        );
    }
    // Fog/Atmosphere
    return (
         <div className="w-full h-16 bg-[#111] border border-white/10 rounded relative overflow-hidden mb-4">
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent z-10"></div>
            {/* Fog Layer */}
            <div className="absolute inset-0 blur-xl transform scale-150" style={{ backgroundColor: color, opacity: opacity/100 }}></div>
            <div className="absolute bottom-1 right-1 text-[7px] text-white/30 font-mono z-20">{t('modal.ps.vol')}</div>
        </div>
    );
};

const HistogramSmall = () => (
    <div className="flex items-end gap-px h-4 w-10 opacity-30">
        {[...Array(8)].map((_, i) => (
            <div key={i} className="flex-1 bg-white" style={{ height: `${Math.random() * 100}%` }}></div>
        ))}
    </div>
);

// --- MAIN COMPONENT ---

export const PhotoshopPanel: React.FC<PhotoshopPanelProps> = ({ data }) => {
  const { t } = useLanguage();
  const [activeLog, setActiveLog] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<string | null>('levels'); 

  const toggleLayer = (id: string) => {
      setActiveLayer(activeLayer === id ? null : id);
  };

  return (
    <>
    <style>{globalStyles}</style>
    <div className="flex flex-col min-h-full relative bg-[#030303] text-gray-300 font-sans overflow-hidden">
        {/* GLOBAL FX */}
        <ScanlineOverlay />
        
        {/* VIGNETTE */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]"></div>
        
        {/* TOP: GLOBAL INFO */}
        <div className="p-5 border-b border-white/10 bg-[#080808] relative z-10">
            <TechCorner position="tl" />
            <TechCorner position="tr" />

            <div className="flex justify-between items-center mb-3">
                 <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_5px_#3b82f6]"></div>
                         <span className="text-[10px] font-bold text-blue-500 tracking-[0.2em] uppercase mb-0.5 text-shadow-blue">{t('modal.ps.hist')}</span>
                    </div>
                    <span className="text-[9px] text-white/20 font-mono pl-3.5">{t('modal.ps.render')}</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded border border-white/10 backdrop-blur-sm shadow-lg">
                    <Layers className="w-3 h-3 text-white/40" />
                    <span className="text-[9px] text-white/50 font-mono">{data.selective_color.length + 5} {t('modal.ps.layers_active')}</span>
                </div>
            </div>

            {/* Pro Histogram Reused */}
            <div className="mb-0 relative group">
                <div className="absolute -inset-4 bg-blue-500/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <div className="bg-[#050505] border border-white/10 rounded p-1 relative overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
                    <div className="absolute inset-0 opacity-10 bg-[linear-gradient(0deg,transparent_24%,rgba(255,255,255,.3)_25%,rgba(255,255,255,.3)_26%,transparent_27%,transparent_74%,rgba(255,255,255,.3)_75%,rgba(255,255,255,.3)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(255,255,255,.3)_25%,rgba(255,255,255,.3)_26%,transparent_27%,transparent_74%,rgba(255,255,255,.3)_75%,rgba(255,255,255,.3)_76%,transparent_77%,transparent)] bg-[length:30px_30px]"></div>
                    <ProfessionalHistogram 
                        r={data.histogram.r} 
                        g={data.histogram.g} 
                        b={data.histogram.b} 
                        l={data.histogram.l} 
                        className="h-24"
                    />
                    <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-white/30"></div>
                    <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-white/30"></div>
                </div>
            </div>
        </div>

        {/* MIDDLE: LAYER STACK */}
        <div className="flex-1 py-6 pr-4 relative z-10">
            <div className="px-6 mb-4">
                <div className="text-[9px] text-white/20 uppercase font-bold tracking-[0.2em]">{t('modal.ps.stack')}</div>
            </div>

            {/* 1. Camera Raw Base */}
            <LayerStrip 
                title={t('modal.ps.cr')} 
                icon={Sun} 
                blendMode="Normal" 
                isActive={activeLayer === 'cr'} 
                onToggle={() => toggleLayer('cr')}
                type="base"
            >
                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    <CyberSlider label={t('modal.common.exposure')} value={data.cr_base.exposure} reason={data.cr_base.reason} onHover={setActiveLog} />
                    <CyberSlider label={t('modal.common.contrast')} value={data.cr_base.contrast} reason={data.cr_base.reason} onHover={setActiveLog} />
                    <CyberSlider label={t('modal.common.highlights')} value={data.cr_base.highlights} reason={data.cr_base.reason} onHover={setActiveLog} />
                    <CyberSlider label={t('modal.common.shadows')} value={data.cr_base.shadows} reason={data.cr_base.reason} onHover={setActiveLog} />
                    <CyberSlider label={t('modal.common.texture')} value={data.cr_base.texture} reason={data.cr_base.reason} onHover={setActiveLog} />
                    <CyberSlider label={t('modal.common.dehaze')} value={data.cr_base.dehaze} reason={data.cr_base.reason} onHover={setActiveLog} />
                </div>
            </LayerStrip>

            {/* 2. Levels */}
            <LayerStrip 
                title={t('modal.ps.levels')} 
                icon={Sliders} 
                blendMode={data.levels.blend_mode} 
                opacity={data.levels.opacity}
                isActive={activeLayer === 'levels'} 
                onToggle={() => toggleLayer('levels')}
                visualizer={<HistogramSmall />}
                type="levels"
            >
                 <div className="space-y-4" onMouseEnter={() => setActiveLog(`LEVELS: ${data.levels.reason}`)} onMouseLeave={() => setActiveLog(null)}>
                     <div className="h-10 bg-gradient-to-r from-black via-gray-800 to-white rounded border border-white/20 relative mx-2 mt-2">
                         <div className="absolute -top-1.5 bottom-0 w-px bg-white z-10 shadow-[0_0_8px_white]" style={{ left: `${(data.levels.black_input/255)*100}%` }}></div>
                         <div className="absolute -top-1.5 bottom-0 w-px bg-white z-10 shadow-[0_0_8px_white]" style={{ left: `${(data.levels.white_input/255)*100}%` }}></div>
                         <div className="absolute -top-1.5 bottom-0 w-px bg-gray-400 z-10" style={{ left: '50%' }}></div>
                     </div>
                     <div className="flex justify-between text-[9px] font-mono text-gray-400 px-2">
                         <span>BLK: {data.levels.black_input}</span>
                         <span className="text-blue-400">GAMMA: {data.levels.gamma}</span>
                         <span>WHT: {data.levels.white_input}</span>
                     </div>
                 </div>
            </LayerStrip>

            {/* 3. Curves */}
            <LayerStrip 
                title={t('modal.ps.curves')} 
                icon={Activity} 
                blendMode="Normal" 
                opacity={90}
                isActive={activeLayer === 'curves'} 
                onToggle={() => toggleLayer('curves')}
                type="curves"
            >
                <div className="flex gap-6 items-center">
                    <div className="w-24 h-24 bg-[#0a0a0a] border border-white/10 rounded relative overflow-hidden shadow-inner"
                         onMouseEnter={() => setActiveLog(`CURVES: ${data.curves.reason}`)} onMouseLeave={() => setActiveLog(null)}
                    >
                         <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none opacity-10">
                            <div className="border-r border-white h-full"></div>
                            <div className="border-r border-white h-full"></div>
                            <div className="border-r border-white h-full"></div>
                            <div className="border-b border-white w-full col-span-4 row-start-2"></div>
                            <div className="border-b border-white w-full col-span-4 row-start-3"></div>
                            <div className="border-b border-white w-full col-span-4 row-start-4"></div>
                        </div>
                        <svg viewBox="0 0 255 255" className="absolute inset-0 w-full h-full p-2">
                             <line x1="0" y1="255" x2="255" y2="0" stroke="white" strokeOpacity="0.1" strokeDasharray="4" />
                             <path d={`M ${data.curves.rgb.map((p:any) => `${p.x},${255-p.y}`).join(' L ')}`} fill="none" stroke="#3b82f6" strokeWidth="2" />
                        </svg>
                    </div>
                    <div className="flex-1 text-[10px] text-gray-400 leading-relaxed italic border-l border-white/10 pl-4">
                        "{data.curves.reason}"
                    </div>
                </div>
            </LayerStrip>

            {/* 4. Selective Color */}
            <LayerStrip 
                title={t('modal.ps.sel_col')} 
                icon={Aperture} 
                blendMode="Normal" 
                isActive={activeLayer === 'sel_col'} 
                onToggle={() => toggleLayer('sel_col')}
                visualizer={<div className="flex gap-1"><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div><div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div></div>}
                type="color"
            >
                <div className="space-y-6">
                    {data.selective_color.map((sc: any, idx: number) => (
                         <div key={idx} className="bg-white/[0.02] p-3 rounded border border-white/5 hover:bg-white/[0.04] transition-colors" 
                              onMouseEnter={() => setActiveLog(`SELECTIVE [${sc.color}]: ${sc.reason}`)} onMouseLeave={() => setActiveLog(null)}>
                             <div className="flex justify-between mb-3 border-b border-white/5 pb-2">
                                 <div className="flex items-center gap-2">
                                     {/* Visual Color Dot */}
                                     <div className={cn("w-2 h-2 rounded-full", 
                                        sc.color === 'Reds' ? 'bg-red-500' : 
                                        sc.color === 'Yellows' ? 'bg-yellow-500' :
                                        sc.color === 'Greens' ? 'bg-green-500' :
                                        sc.color === 'Cyans' ? 'bg-cyan-500' :
                                        sc.color === 'Blues' ? 'bg-blue-500' :
                                        sc.color === 'Magentas' ? 'bg-magenta-500' :
                                        sc.color === 'Whites' ? 'bg-white' :
                                        sc.color === 'Neutrals' ? 'bg-gray-500' : 'bg-black border border-white/20'
                                     )}></div>
                                     <span className="text-[10px] font-bold text-white uppercase">{sc.color}</span>
                                 </div>
                                 <span className="text-[8px] font-mono text-gray-500 uppercase">{sc.method}</span>
                             </div>
                             <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                                 <CyberSlider label={t('modal.common.cyan')} value={sc.c} onHover={setActiveLog} reason="Cyan-Red Balance" />
                                 <CyberSlider label={t('modal.common.magenta')} value={sc.m} onHover={setActiveLog} reason="Magenta-Green Balance" />
                                 <CyberSlider label={t('modal.common.yellow')} value={sc.y} onHover={setActiveLog} reason="Yellow-Blue Balance" />
                                 <CyberSlider label={t('modal.common.black')} value={sc.k} onHover={setActiveLog} reason="Luminance Depth" />
                             </div>
                         </div>
                    ))}
                </div>
            </LayerStrip>

            {/* 5. Local Light (Dodge & Burn) */}
            <LayerStrip 
                title={t('modal.ps.db')} 
                icon={MousePointer2} 
                blendMode="Overlay" 
                isActive={activeLayer === 'db'} 
                onToggle={() => toggleLayer('db')}
                visualizer={<Maximize2 className="w-3 h-3" />}
                type="brush"
            >
                <SpatialGrid items={data.local_light} onHover={setActiveLog} />
            </LayerStrip>

            {/* 6. Atmosphere & Effects */}
            <LayerStrip 
                title={t('modal.ps.atmos')} 
                icon={Droplets} 
                blendMode="Screen" 
                opacity={data.atmosphere.opacity}
                isActive={activeLayer === 'atmos'} 
                onToggle={() => toggleLayer('atmos')}
                isLast={true}
                type="atmos"
                layerColor={data.atmosphere.color}
            >
                 <div className="grid grid-cols-2 gap-8">
                     <div className="bg-white/[0.02] p-3 rounded border border-white/5">
                         <h5 className="text-[9px] text-white/40 uppercase mb-4 font-bold flex items-center gap-2"><Sun className="w-3 h-3"/> {t('modal.ps.vol')}</h5>
                         <AtmospherePreview color={data.atmosphere.color} opacity={data.atmosphere.opacity} type="fog" />
                         <div className="flex items-center gap-4 mb-6">
                             <div className="w-8 h-8 rounded-full shadow-[0_0_15px_currentColor]" style={{ backgroundColor: data.atmosphere.color, color: data.atmosphere.color }}></div>
                             <div className="text-[9px] text-gray-400 leading-tight">{data.atmosphere.reason}</div>
                         </div>
                         <CyberSlider label="Flow" value={data.atmosphere.flow} unit="%" max={100} min={0} />
                     </div>
                     <div className="bg-white/[0.02] p-3 rounded border border-white/5">
                         <h5 className="text-[9px] text-white/40 uppercase mb-4 font-bold flex items-center gap-2"><Droplets className="w-3 h-3"/> {t('modal.ps.grain')}</h5>
                         <AtmospherePreview color="#fff" opacity={data.grain.amount} type="grain" />
                         <CyberSlider label="Amount" value={data.grain.amount} unit="%" max={100} min={0} />
                         <CyberSlider label="Roughness" value={data.grain.roughness} unit="%" max={100} min={0} />
                     </div>
                 </div>
            </LayerStrip>
        </div>

        {/* SPACER */}
        <div className="h-20 w-full shrink-0"></div>

        {/* FOOTER TERMINAL */}
        <div className="sticky bottom-0 left-0 right-0 z-30 bg-[#0a0a0a]/95 backdrop-blur border-t border-white/10 p-1 shadow-[0_-10px_40px_rgba(0,0,0,1)]">
             <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
             <div className="absolute -top-[1px] left-[80%] w-10 h-px bg-blue-400 shadow-[0_0_10px_#3b82f6] animate-[pulse_3s_infinite]"></div>

             <div className="flex items-center gap-3 px-2 py-1">
                <div className="p-1 bg-blue-500/10 rounded border border-blue-500/20 shrink-0 relative overflow-hidden">
                     <div className="absolute inset-0 bg-blue-500/20 animate-ping opacity-20"></div>
                    <Terminal className="w-3 h-3 text-blue-400" />
                </div>
                <div className="flex-1 font-mono text-[9px] leading-relaxed overflow-hidden whitespace-nowrap text-ellipsis flex items-center">
                    <span className="text-blue-500/50 mr-2 font-bold">&gt; PS.ENGINE:</span>
                    {activeLog ? (
                        <span className="text-blue-300 animate-pulse tracking-wide">{activeLog}</span>
                    ) : (
                        <span className="text-white/20 italic tracking-widest opacity-50">SELECT NODE...</span>
                    )}
                </div>
            </div>
        </div>
    </div>
    </>
  );
};
