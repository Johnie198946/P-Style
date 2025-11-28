import React, { useState } from 'react';
import { LightroomData } from '../../types/analysis';
import { Terminal, Activity, ChevronRight, Sun, Sliders, Palette, Aperture, RotateCcw, Layout, Target, Eye, Grid3X3, Maximize, Layers, Percent, Scale, GitGraph } from 'lucide-react';
import { cn } from '../ui/utils';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { HSLVisualizer } from './HSLVisualizer';
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

interface LightroomPanelProps {
  data: LightroomData;
}

// --- FX & DECORATORS ---

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

const DataStreamVertical = () => (
    <div className="hidden md:flex flex-col gap-1 absolute right-1 top-20 bottom-20 w-4 overflow-hidden opacity-20 font-mono text-[6px] text-blue-400 leading-none select-none pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => (
            <span key={i} className="animate-pulse" style={{ animationDelay: `${Math.random()}s` }}>
                {Math.random().toString(16).substr(2, 2).toUpperCase()}
            </span>
        ))}
    </div>
);

// --- ADVANCED UI COMPONENTS ---

const TacticalBrief = ({ title, content }: { title: string, content: string }) => (
    <div className="bg-[#0c0c0c] border-l-2 border-blue-500/50 p-3 mb-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-1 opacity-20">
            <Activity className="w-4 h-4 text-blue-500" />
        </div>
        <h4 className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1">{title}</h4>
        <p className="text-[10px] font-mono text-gray-400 leading-relaxed opacity-90">
            {content}
        </p>
    </div>
);

// Enhanced Slider with Target Range Visualization
const TargetLockSlider = ({ label, value, unit = '', min = -100, max = 100, targetMin, targetMax, reason, onHover }: any) => {
    const percentage = ((value - min) / (max - min)) * 100;
    const isBipolar = min < 0;
    
    // Calculate Target Zone
    const targetStart = targetMin !== undefined ? ((targetMin - min) / (max - min)) * 100 : null;
    const targetWidth = (targetMin !== undefined && targetMax !== undefined) 
        ? ((targetMax - targetMin) / (max - min)) * 100 
        : 0;

    return (
        <div className="group mb-4 relative" onMouseEnter={() => onHover && onHover(`${label.toUpperCase()}: ${reason}`)} onMouseLeave={() => onHover(null)}>
            {/* Header */}
            <div className="flex justify-between items-end mb-1.5">
                <span className="text-[9px] font-bold text-white/50 group-hover:text-blue-400 transition-colors uppercase tracking-wider">{label}</span>
                <div className="flex items-center gap-2">
                    {targetMin !== undefined && (
                        <span className="text-[8px] font-mono text-emerald-500/70 bg-emerald-500/5 px-1 rounded border border-emerald-500/10">
                            TARGET: {targetMin > 0 ? '+' : ''}{targetMin}{unit} ~ {targetMax > 0 ? '+' : ''}{targetMax}{unit}
                        </span>
                    )}
                    <span className="text-[10px] font-mono text-white bg-white/5 px-1.5 rounded min-w-[3ch] text-right">{value > 0 && isBipolar ? '+' : ''}{value}{unit}</span>
                </div>
            </div>

            {/* Track */}
            <div className="h-4 relative cursor-crosshair flex items-center">
                <div className="absolute inset-x-0 h-0.5 bg-white/10 rounded-full overflow-hidden"></div>
                
                {/* Target Zone (Green Area) */}
                {targetStart !== null && (
                    <div 
                        className="absolute h-1 bg-emerald-500/30 border-x border-emerald-500/50 z-0"
                        style={{ left: `${targetStart}%`, width: `${targetWidth}%` }}
                    >
                        {/* Hatching pattern for target zone */}
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(16,185,129,0.2)_25%,rgba(16,185,129,0.2)_50%,transparent_50%,transparent_75%,rgba(16,185,129,0.2)_75%,rgba(16,185,129,0.2)_100%)] bg-[length:4px_4px]"></div>
                    </div>
                )}

                {/* Center Marker */}
                {isBipolar && <div className="absolute left-[50%] top-1 bottom-1 w-px bg-white/20 h-2"></div>}

                {/* Fill Bar */}
                <div 
                    className={cn("absolute h-0.5 transition-all duration-300", 
                        targetStart !== null && percentage >= targetStart && percentage <= (targetStart + targetWidth) 
                            ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" 
                            : "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                    )}
                    style={{ 
                        left: isBipolar ? (value >= 0 ? '50%' : `${percentage}%`) : '0%',
                        width: isBipolar ? `${Math.abs(percentage - 50)}%` : `${percentage}%`
                    }}
                ></div>

                {/* Handle */}
                <div 
                    className={cn("absolute w-1 h-2.5 shadow-sm transition-all duration-300 z-10 group-hover:scale-125",
                         targetStart !== null && percentage >= targetStart && percentage <= (targetStart + targetWidth) 
                            ? "bg-emerald-100" 
                            : "bg-white"
                    )}
                    style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}
                ></div>
            </div>
            
            {/* 【新增】显示描述文本（reason） */}
            {reason && (
                <div className="mt-1.5 text-[9px] text-white/50 leading-relaxed">
                    <span className="text-white/40">→</span> {reason}
                </div>
            )}
        </div>
    );
};

// 12-Channel Spectrum Matrix (FUI Grid)
const SpectrumMatrix = ({ channels }: { channels: any[] }) => {
    // Channels should be an array of 12 objects: { name, h, s, l }
    // Names: Red, Orange, Yellow, Yellow-Green, Green, Green-Cyan, Cyan, Cyan-Blue, Blue, Blue-Purple, Purple, Purple-Magenta
    
    return (
        <div className="border border-white/10 rounded bg-[#050505] overflow-hidden">
            {/* Header Row */}
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-px bg-white/5 text-[8px] font-bold text-white/40 uppercase text-center py-1.5">
                <div className="text-left pl-2">Channel</div>
                <div>Hue</div>
                <div>Sat</div>
                <div>Lum</div>
            </div>
            
            {/* Rows */}
            <div className="divide-y divide-white/5">
                {channels.map((ch, i) => (
                    <div key={i} className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-px group hover:bg-white/5 transition-colors items-center h-7">
                        <div className="pl-2 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_3px_currentColor]" style={{ backgroundColor: ch.color }}></div>
                            <span className="text-[9px] font-mono text-white/70 truncate">{ch.name}</span>
                        </div>
                        
                        {/* Hue Cell */}
                        <div className="flex justify-center relative h-full items-center">
                            <div className="absolute inset-y-1 bg-white/5 w-0.5"></div>
                             <div className="w-full h-full absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none"></div>
                            <span className={cn("text-[9px] font-mono relative z-10", ch.h !== 0 ? "text-blue-400" : "text-white/20")}>{ch.h > 0 ? '+' : ''}{ch.h}</span>
                        </div>

                         {/* Sat Cell */}
                         <div className="flex justify-center relative h-full items-center">
                            <div className="absolute inset-0 bg-white/5 scale-x-0 group-hover:scale-x-100 transition-transform origin-left opacity-10"></div>
                            <span className={cn("text-[9px] font-mono relative z-10", ch.s !== 0 ? "text-emerald-400" : "text-white/20")}>{ch.s > 0 ? '+' : ''}{ch.s}</span>
                        </div>

                         {/* Lum Cell */}
                         <div className="flex justify-center relative h-full items-center">
                             <div className="absolute inset-0 bg-white/5 scale-x-0 group-hover:scale-x-100 transition-transform origin-left opacity-10"></div>
                            <span className={cn("text-[9px] font-mono relative z-10", ch.l !== 0 ? "text-yellow-400" : "text-white/20")}>{ch.l > 0 ? '+' : ''}{ch.l}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const CyberSlider = TargetLockSlider; // Alias for compatibility if needed, or just use TargetLockSlider

// 1. LUMA SPHERE (For Exposure/Contrast)
// A CSS-based sphere that reacts to exposure (brightness) and contrast (gradient hardness)
const LumaSphere = ({ exposure, contrast }: { exposure: number, contrast: number }) => {
    // Normalize values
    const brightness = 1 + (exposure / 5); // 0.5 to 2
    const hardness = Math.max(0, Math.min(100, (contrast + 100) / 2)); // 0% to 100%
    
    return (
        <div className="w-24 h-24 shrink-0 bg-[#080808] rounded border border-white/10 flex items-center justify-center relative overflow-hidden shadow-inner group">
            {/* Grid BG */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:4px_4px]"></div>
            <div className="absolute top-1 left-1 text-[7px] font-mono text-white/30">LUMA_SCOPE</div>
            
            {/* The Sphere */}
            <div 
                className="w-16 h-16 rounded-full transition-all duration-300 shadow-2xl"
                style={{
                    background: `radial-gradient(circle at 30% 30%, 
                        hsl(0, 0%, ${100 * brightness}%) 0%, 
                        hsl(0, 0%, ${50 * brightness}%) ${100 - hardness}%, 
                        hsl(0, 0%, ${10 * brightness}%) 100%)`,
                    filter: `brightness(${brightness}) contrast(${1 + contrast/100})`
                }}
            ></div>
        </div>
    );
};

// 2. DETAIL MESH (For Texture/Clarity/Dehaze)
// A pattern that becomes sharper or blurrier
const DetailMesh = ({ texture, clarity }: { texture: number, clarity: number }) => {
    // Clarity affects local contrast (simulated by opacity contrast)
    // Texture affects sharpness (simulated by blur)
    
    const blurAmount = Math.max(0, (100 - (texture + 100) / 2) / 10); // 0 to 10px
    const contrastVal = 1 + (clarity / 100); 

    return (
        <div className="w-24 h-24 shrink-0 bg-[#080808] rounded border border-white/10 relative overflow-hidden shadow-inner flex items-center justify-center">
            <div className="absolute top-1 left-1 text-[7px] font-mono text-white/30">DETAIL_MESH</div>
            
            {/* The Pattern */}
            <div className="w-16 h-16 grid grid-cols-4 grid-rows-4 gap-1 transition-all duration-300"
                 style={{ 
                     filter: `blur(${blurAmount}px) contrast(${contrastVal})`,
                     opacity: 0.8
                 }}
            >
                {[...Array(16)].map((_, i) => (
                    <div key={i} className="bg-white/40 rounded-sm border border-white/20">
                        <div className="w-full h-full bg-gradient-to-br from-white/80 to-transparent"></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// 3. COLOR PRISM (For Vibrance/Saturation)
const ColorPrism = ({ sat, vib }: { sat: number, vib: number }) => {
    const saturation = 1 + (sat / 100);
    const lightness = 1 + (vib / 200); // Vibrance affects muted tones more, simplified here

    return (
        <div className="w-24 h-24 shrink-0 bg-[#080808] rounded border border-white/10 relative overflow-hidden shadow-inner flex items-center justify-center">
            <div className="absolute top-1 left-1 text-[7px] font-mono text-white/30">CHROMA_METER</div>
            
            {/* Spectral Bars */}
            <div className="flex gap-1 h-12 items-end">
                {['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'].map((c, i) => (
                    <div key={i} 
                         className="w-2 rounded-t-sm transition-all duration-300"
                         style={{ 
                             height: `${40 + Math.random() * 40}%`,
                             backgroundColor: c,
                             filter: `saturate(${saturation}) brightness(${lightness})`
                         }}
                    ></div>
                ))}
            </div>
        </div>
    );
};

// --- COMPLEX MONITORS ---

const AdvancedCurveMonitor = ({ curveData }: { curveData: any }) => {
    const [activeChannel, setActiveChannel] = useState<'rgb' | 'red' | 'green' | 'blue'>('rgb');

    // 【修复】优先使用 curveData.analysis 或 curveData.reason（曲线描述）
    // 如果都没有，则使用默认的通道描述
    const explanation = curveData?.analysis || curveData?.reason || "";
    const analysis = explanation ? {
        rgb: explanation,
        red: explanation,
        green: explanation,
        blue: explanation
    } : {
        rgb: "整体对比度调整，提亮中间调",
        red: "增强暖色调，适用于肤色和日落场景",
        green: "优化植物和自然场景的色彩平衡",
        blue: "调整天空和水面的冷色调表现"
    };
    
    const tips = curveData?.tips || [
        "S 型曲线可增加画面对比度",
        "提升暗部可保留阴影细节",
        "压低高光可恢复过曝区域",
        "分别调整 RGB 通道可实现色彩偏移效果"
    ];

    const channelColors = {
        rgb: 'text-white border-white/50',
        red: 'text-red-400 border-red-500/50',
        green: 'text-green-400 border-green-500/50',
        blue: 'text-blue-400 border-blue-500/50'
    };

    const channelStroke = {
        rgb: '#ffffff',
        red: '#ef4444',
        green: '#22c55e',
        blue: '#3b82f6'
    };

    // 【修复】生成平滑的贝塞尔曲线路径（符合后期领域规范）
    // 【重要】不自动增补点，严格按照 Gemini 输出的点绘制
    const getPath = (points: any[]) => {
        if (!points || points.length === 0) {
            // 如果没有数据，返回 null（不绘制曲线）
            return null;
        }
        
        // 统一转换为 {x, y} 对象格式
        let normalizedPoints = points.map((p: any) => {
            if (Array.isArray(p)) {
                return { x: p[0], y: p[1] };
            }
            return p.x !== undefined && p.y !== undefined ? p : null;
        }).filter((p: any) => p !== null);
        
        // 【专业修复】直接使用 Gemini 给出的所有点，不强制添加 (0, 0) 和 (255, 255)
        // Gemini 输出的点（如 {x: 0, y: 30}）已经是曲线的起点，不需要再添加 (0, 0)
        // 只有当完全没有数据时，才返回 null
        
        // 按 x 坐标排序（确保点的顺序正确）
        normalizedPoints.sort((a, b) => a.x - b.x);
        
        // SVG 坐标系：y 轴向下，需要翻转（255 - y）
        const flippedPoints = normalizedPoints.map((p: any) => ({ x: p.x, y: 255 - p.y }));
        
        // 生成平滑的贝塞尔曲线路径
        if (flippedPoints.length < 2) {
            return null; // 不绘制，而不是默认直线
        }
        
        if (flippedPoints.length === 2) {
            // 两个点：直接连接
            return `M ${flippedPoints[0].x},${flippedPoints[0].y} L ${flippedPoints[1].x},${flippedPoints[1].y}`;
        }
        
        // 三个或更多点：使用 Catmull-Rom 样条曲线（通过三次贝塞尔曲线近似）
        let path = `M ${flippedPoints[0].x},${flippedPoints[0].y}`;
        
        for (let i = 1; i < flippedPoints.length; i++) {
            const prev = flippedPoints[i - 1];
            const curr = flippedPoints[i];
            const next = flippedPoints[i + 1] || curr;
            
            // 计算控制点（Catmull-Rom 样条曲线的切线）
            const tension = 0.5; // 张力系数，控制曲线平滑度
            const cp1x = prev.x + (curr.x - prev.x) * tension;
            const cp1y = prev.y + (curr.y - prev.y) * tension;
            const cp2x = curr.x - (next.x - prev.x) * tension;
            const cp2y = curr.y - (next.y - prev.y) * tension;
            
            path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
        }
        
        return path;
    };

    // 【修复】确保 currentPoints 格式正确，兼容不同的数据格式
    // 【重要】不自动增补点，严格按照 Gemini 输出的点绘制
    const getCurrentPoints = (channel: string) => {
        const channelData = curveData?.[channel];
        if (!channelData || channelData.length === 0) {
            // 如果没有数据，返回空数组（不绘制曲线）
            return [];
        }
        
        // 统一转换为 {x, y} 对象格式
        let normalizedPoints = channelData.map((p: any) => {
            if (Array.isArray(p)) {
                return { x: p[0], y: p[1] };
            }
            return p.x !== undefined && p.y !== undefined ? p : null;
        }).filter((p: any) => p !== null);
        
        // 【专业修复】直接使用 Gemini 给出的所有点，不强制添加 (0, 0) 和 (255, 255)
        // Gemini 输出的点（如 {x: 0, y: 30}）已经是曲线的起点，不需要再添加 (0, 0)
        // 只有当完全没有数据时，才返回空数组
        
        // 按 x 坐标排序（确保点的顺序正确）
        normalizedPoints.sort((a, b) => a.x - b.x);
        
        return normalizedPoints;
    };

    const currentPoints = getCurrentPoints(activeChannel);
    
    // 【新增】获取所有通道的点数据，用于显示所有通道的点值标记
    const allChannelPoints = {
        rgb: getCurrentPoints('rgb'),
        red: getCurrentPoints('red'),
        green: getCurrentPoints('green'),
        blue: getCurrentPoints('blue'),
    };

    return (
        <div className="bg-[#0c0c0c] border border-white/10 rounded p-4 mb-4 shadow-lg">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                 <h4 className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Curve Dynamics</h4>
                 <div className="flex gap-1">
                     {(['rgb', 'red', 'green', 'blue'] as const).map(c => (
                         <button
                            key={c}
                            onClick={() => setActiveChannel(c)}
                            className={cn(
                                "text-[9px] font-mono uppercase px-2 py-1 rounded border transition-all",
                                activeChannel === c ? `bg-white/10 ${channelColors[c]}` : "text-white/20 border-transparent hover:bg-white/5"
                            )}
                         >
                             {c}
                         </button>
                     ))}
                 </div>
            </div>

            <div className="flex gap-6 flex-col sm:flex-row">
                {/* The Graph */}
                <div className="w-full sm:w-48 h-48 bg-[#050505] border border-white/10 relative overflow-hidden shadow-inner shrink-0 group">
                    {/* Grid */}
                    <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none opacity-20">
                        <div className="border-r border-white/30 h-full"></div>
                        <div className="border-r border-white/30 h-full"></div>
                        <div className="border-r border-white/30 h-full"></div>
                        <div className="border-b border-white/30 w-full col-span-4 row-start-2"></div>
                        <div className="border-b border-white/30 w-full col-span-4 row-start-3"></div>
                        <div className="border-b border-white/30 w-full col-span-4 row-start-4"></div>
                    </div>
                    
                    {/* Diagonal Reference */}
                    <svg viewBox="0 0 255 255" className="absolute inset-0 w-full h-full p-4 opacity-30">
                        <line x1="0" y1="255" x2="255" y2="0" stroke="white" strokeDasharray="4" />
                    </svg>

                    {/* Active Curve */}
                    <svg viewBox="0 0 255 255" className="absolute inset-0 w-full h-full p-4 z-10 overflow-visible">
                        {/* 绘制所有通道的曲线（当前激活通道更明显） */}
                        {allChannelPoints.rgb.length > 0 && getPath(allChannelPoints.rgb) && (
                        <path 
                                d={getPath(allChannelPoints.rgb)} 
                            fill="none" 
                                stroke={channelStroke.rgb} 
                                strokeWidth={activeChannel === 'rgb' ? "2" : "1"} 
                            className="drop-shadow-[0_0_3px_rgba(0,0,0,1)]"
                            strokeLinecap="round"
                                opacity={activeChannel === 'rgb' ? 1 : 0.3}
                            />
                        )}
                        {allChannelPoints.red.length > 0 && getPath(allChannelPoints.red) && (
                            <path 
                                d={getPath(allChannelPoints.red)} 
                                fill="none" 
                                stroke={channelStroke.red} 
                                strokeWidth={activeChannel === 'red' ? "2" : "1"} 
                                className="drop-shadow-[0_0_3px_rgba(0,0,0,1)]"
                                strokeLinecap="round"
                                opacity={activeChannel === 'red' ? 1 : 0.3}
                            />
                        )}
                        {allChannelPoints.green.length > 0 && getPath(allChannelPoints.green) && (
                            <path 
                                d={getPath(allChannelPoints.green)} 
                                fill="none" 
                                stroke={channelStroke.green} 
                                strokeWidth={activeChannel === 'green' ? "2" : "1"} 
                                className="drop-shadow-[0_0_3px_rgba(0,0,0,1)]"
                                strokeLinecap="round"
                                opacity={activeChannel === 'green' ? 1 : 0.3}
                            />
                        )}
                        {allChannelPoints.blue.length > 0 && getPath(allChannelPoints.blue) && (
                            <path 
                                d={getPath(allChannelPoints.blue)} 
                                fill="none" 
                                stroke={channelStroke.blue} 
                                strokeWidth={activeChannel === 'blue' ? "2" : "1"} 
                                className="drop-shadow-[0_0_3px_rgba(0,0,0,1)]"
                                strokeLinecap="round"
                                opacity={activeChannel === 'blue' ? 1 : 0.3}
                            />
                        )}
                        {/* 绘制所有通道的点值和标签 */}
                        {allChannelPoints.rgb.map((p: any, i: number) => (
                            <g key={`rgb-${i}`} className="group cursor-pointer">
                                <circle cx={p.x} cy={255 - p.y} r="3" fill="#000" stroke={channelStroke.rgb} strokeWidth="1.5" className="hover:scale-150 transition-transform" />
                                <g transform={`translate(${p.x}, ${255 - p.y})`}>
                                    <rect x="8" y="-8" width="50" height="40" fill="rgba(0,0,0,0.85)" rx="2" />
                                    <text x="11" y="5" fill={channelStroke.rgb} fontSize="7" fontFamily="monospace" fontWeight="bold">RGB</text>
                                    <text x="11" y="18" fill="white" fontSize="7" fontFamily="monospace">({p.x},{p.y})</text>
                                </g>
                            </g>
                        ))}
                        {allChannelPoints.red.map((p: any, i: number) => (
                            <g key={`red-${i}`} className="group cursor-pointer">
                                <circle cx={p.x} cy={255 - p.y} r="3" fill="#000" stroke={channelStroke.red} strokeWidth="1.5" className="hover:scale-150 transition-transform" />
                                <g transform={`translate(${p.x}, ${255 - p.y})`}>
                                    <rect x="8" y="-8" width="45" height="40" fill="rgba(0,0,0,0.85)" rx="2" />
                                    <text x="11" y="5" fill={channelStroke.red} fontSize="7" fontFamily="monospace" fontWeight="bold">R</text>
                                    <text x="11" y="18" fill="white" fontSize="7" fontFamily="monospace">({p.x},{p.y})</text>
                                </g>
                            </g>
                        ))}
                        {allChannelPoints.green.map((p: any, i: number) => (
                            <g key={`green-${i}`} className="group cursor-pointer">
                                <circle cx={p.x} cy={255 - p.y} r="3" fill="#000" stroke={channelStroke.green} strokeWidth="1.5" className="hover:scale-150 transition-transform" />
                                <g transform={`translate(${p.x}, ${255 - p.y})`}>
                                    <rect x="8" y="-8" width="45" height="40" fill="rgba(0,0,0,0.85)" rx="2" />
                                    <text x="11" y="5" fill={channelStroke.green} fontSize="7" fontFamily="monospace" fontWeight="bold">G</text>
                                    <text x="11" y="18" fill="white" fontSize="7" fontFamily="monospace">({p.x},{p.y})</text>
                                </g>
                            </g>
                        ))}
                        {allChannelPoints.blue.map((p: any, i: number) => (
                            <g key={`blue-${i}`} className="group cursor-pointer">
                                <circle cx={p.x} cy={255 - p.y} r="3" fill="#000" stroke={channelStroke.blue} strokeWidth="1.5" className="hover:scale-150 transition-transform" />
                                <g transform={`translate(${p.x}, ${255 - p.y})`}>
                                    <rect x="8" y="-8" width="45" height="40" fill="rgba(0,0,0,0.85)" rx="2" />
                                    <text x="11" y="5" fill={channelStroke.blue} fontSize="7" fontFamily="monospace" fontWeight="bold">B</text>
                                    <text x="11" y="18" fill="white" fontSize="7" fontFamily="monospace">({p.x},{p.y})</text>
                                </g>
                            </g>
                         ))}
                    </svg>

                    <div className="absolute bottom-1 left-1 text-[7px] font-mono text-white/30">IN: 0-255</div>
                    <div className="absolute top-1 right-1 text-[7px] font-mono text-white/30">OUT: 0-255</div>
                </div>

                {/* Analysis Console */}
                <div className="flex-1 flex flex-col justify-between min-h-[12rem]">
                    <div className="mb-4">
                        <h5 className="text-[9px] text-blue-500 uppercase font-bold mb-2 flex items-center gap-2">
                            <Activity className="w-3 h-3" />
                            Channel Analysis
                        </h5>
                        <div className="p-3 bg-blue-500/5 border-l-2 border-blue-500 text-[10px] font-mono text-gray-300 leading-relaxed relative overflow-hidden">
                            {/* Typewriter cursor effect */}
                            <span className="absolute top-0 right-0 w-2 h-2 bg-blue-500/20 animate-pulse"></span>
                            {analysis[activeChannel]}
                        </div>
                    </div>

                    <div>
                        <h5 className="text-[9px] text-emerald-500 uppercase font-bold mb-2 flex items-center gap-2">
                            <Terminal className="w-3 h-3" />
                            Optimization Protocols
                        </h5>
                        <ul className="space-y-1">
                            {tips.map((tip: string, i: number) => (
                                <li key={i} className="text-[9px] font-mono text-white/50 flex items-center gap-2 group">
                                    <span className="w-1 h-1 bg-emerald-500/50 rounded-full group-hover:bg-emerald-400 transition-colors"></span>
                                    <span className="group-hover:text-emerald-200 transition-colors">{tip}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- COMPOSITION ANALYSIS UI ---

const CompositionMonitor = ({ data }: { data: any }) => {
    // Fallback data to prevent crash if data is missing
    const comp = data || {
        structure: { visual_frame: "Analyzing...", geometry: "Triangular", balance: "Asymmetrical" },
        subject: { position: "Right-Center", weight_score: 85, method: "Rule of Thirds", analysis: "塔楼与富士山形成'主次呼应'关系——塔楼通过色彩对比获得视觉优先级。" },
        lines: { path: ["入口点：左下角前景", "第一停留：城市建筑群", "转折点：右侧塔楼", "终点：富士山顶端"] },
        zones: { foreground: "树木城市", midground: "塔楼", background: "富士山", perspective: "Atmospheric" },
        proportions: { entities: "65%", negative: "35%", distribution: "Balanced" },
        balance: { horizontal: "Architecture", vertical: "Tower", strategy: "Dynamic" },
        style: { name: "Landscape / Architectural", method: "Leading Lines", features: "Depth, Contrast" }
    };

    return (
        <div className="space-y-4">
            {/* 1. MAIN STRUCTURE & STYLE */}
            <div className="grid grid-cols-[1.5fr_1fr] gap-4">
                <div className="bg-[#0c0c0c] border border-white/10 p-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10"><Layout className="w-8 h-8" /></div>
                    <h4 className="text-[9px] text-blue-500 font-bold uppercase mb-2 flex items-center gap-2">
                        <Maximize className="w-3 h-3" /> Structural Analysis
                    </h4>
                    <div className="space-y-2">
                         <div className="flex justify-between border-b border-white/5 pb-1">
                             <span className="text-[9px] text-white/40 uppercase">Visual Frame</span>
                             <span className="text-[9px] text-white/80 font-mono">{comp.structure.visual_frame}</span>
                         </div>
                         <div className="flex justify-between border-b border-white/5 pb-1">
                             <span className="text-[9px] text-white/40 uppercase">Geometry</span>
                             <span className="text-[9px] text-emerald-400 font-mono">{comp.structure.geometry}</span>
                         </div>
                         <div className="bg-blue-500/5 p-2 border-l border-blue-500/50 text-[9px] text-gray-400 leading-relaxed mt-2">
                             {comp.style.features}
                         </div>
                    </div>
                </div>

                {/* Style Classification Badge */}
                <div className="bg-[#0c0c0c] border border-white/10 p-3 flex flex-col justify-center items-center text-center relative group">
                     <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                     <div className="text-[8px] text-white/30 uppercase tracking-widest mb-1">Detected Style</div>
                     <div className="text-[11px] text-white font-bold border px-2 py-1 border-white/20 rounded bg-white/5 mb-2">
                         {comp.style.name}
                     </div>
                     <div className="text-[8px] text-emerald-500 font-mono">{comp.style.method}</div>
                </div>
            </div>

            {/* 2. SUBJECT & VISUAL WEIGHT */}
            <div className="bg-[#0c0c0c] border border-white/10 p-4 relative">
                <h4 className="text-[9px] text-emerald-500 font-bold uppercase mb-3 flex items-center gap-2">
                    <Target className="w-3 h-3" /> Visual Weight & Subject
                </h4>
                <div className="flex gap-4 flex-col sm:flex-row">
                    {/* Mock Radar / Position Map */}
                    <div className="w-24 h-24 shrink-0 border border-white/10 bg-black relative grid grid-cols-3 grid-rows-3">
                         {[...Array(9)].map((_,i) => <div key={i} className="border border-white/5"></div>)}
                         {/* Simulated Subject Position */}
                         <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_#ef4444] animate-pulse"></div>
                         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                             <div className="w-16 h-16 border border-white/20 rounded-full opacity-50"></div>
                             <div className="w-24 h-px bg-white/20 absolute rotate-45"></div>
                             <div className="w-24 h-px bg-white/20 absolute -rotate-45"></div>
                         </div>
                         <div className="absolute bottom-0 right-0 bg-red-500/20 text-red-500 text-[7px] px-1">PRIORITY_1</div>
                    </div>
                    
                    <div className="flex-1 space-y-2">
                        <div className="text-[10px] text-white/80 font-mono leading-relaxed border-l-2 border-red-500/50 pl-2">
                            {typeof comp.subject === 'string' ? comp.subject : comp.subject.analysis || comp.subject.desc}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                             <div className="bg-white/5 p-1.5 rounded">
                                 <div className="text-[7px] text-white/30 uppercase">Weight Score</div>
                                 <div className="text-[10px] text-red-400 font-mono">{comp.subject.weight_score || comp.subject.weight || 'N/A'}</div>
                             </div>
                             <div className="bg-white/5 p-1.5 rounded">
                                 <div className="text-[7px] text-white/30 uppercase">Method</div>
                                 <div className="text-[10px] text-white font-mono">{comp.subject.method || 'N/A'}</div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. VISUAL FLOW PATH */}
            <div className="bg-[#0c0c0c] border border-white/10 p-4">
                <h4 className="text-[9px] text-blue-400 font-bold uppercase mb-3 flex items-center gap-2">
                    <GitGraph className="w-3 h-3" /> Ocular Trajectory (Visual Flow)
                </h4>
                <div className="relative pl-4 border-l border-white/10 space-y-4">
                    {Array.isArray(comp.lines?.path) && comp.lines.path.length > 0 ? comp.lines.path.map((step: string, i: number) => (
                        <div key={i} className="relative group">
                            <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-[#0c0c0c] border border-blue-500 rounded-full flex items-center justify-center group-hover:scale-125 transition-transform z-10">
                                <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono group-hover:text-white transition-colors">
                                <span className="text-blue-500/50 mr-2">0{i+1}</span>
                                {step}
                            </div>
                        </div>
                    )) : (
                        <div className="text-[10px] text-white/20 italic">No linear trajectory detected.</div>
                    )}
                </div>
            </div>

            {/* 4. ZONES & PROPORTIONS */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0c0c0c] border border-white/10 p-3">
                     <h4 className="text-[9px] text-yellow-500 font-bold uppercase mb-2 flex items-center gap-2">
                        <Layers className="w-3 h-3" /> Spatial Zones
                     </h4>
                     <div className="space-y-1.5">
                         {comp.zones && Object.keys(comp.zones).length > 0 ? Object.entries(comp.zones).map(([key, val]: any) => (
                             <div key={key} className="flex flex-col bg-white/5 p-1.5 rounded border border-white/5">
                                 <span className="text-[7px] text-white/30 uppercase tracking-wider">{key}</span>
                                 <span className="text-[9px] text-white/80 font-mono truncate">{val}</span>
                             </div>
                         )) : (
                             <div className="text-[10px] text-white/20 italic">Spatial data pending...</div>
                         )}
                     </div>
                </div>
                
                <div className="bg-[#0c0c0c] border border-white/10 p-3">
                     <h4 className="text-[9px] text-purple-500 font-bold uppercase mb-2 flex items-center gap-2">
                        <Percent className="w-3 h-3" /> Balance & Prop.
                     </h4>
                     <div className="space-y-2">
                        <div className="relative pt-1">
                             <div className="flex justify-between text-[8px] text-white/50 mb-1">
                                 <span>ENTITIES</span>
                                 <span>NEGATIVE</span>
                             </div>
                             <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden flex">
                                 <div className="bg-white h-full" style={{ width: '65%' }}></div>
                                 <div className="bg-purple-500 h-full" style={{ width: '35%' }}></div>
                             </div>
                             <div className="flex justify-between text-[8px] font-mono mt-1">
                                 <span className="text-white">{comp.proportions.entities || '65%'}</span>
                                 <span className="text-purple-400">{comp.proportions.negative || comp.proportions.negative_space || '35%'}</span>
                             </div>
                        </div>
                        
                        <div className="pt-2 border-t border-white/5 mt-2">
                             <div className="text-[8px] text-white/30 uppercase mb-1">Balance Strategy</div>
                             <div className="text-[9px] text-purple-300 font-mono leading-tight">
                                 {comp.balance.horizontal ? `H: ${comp.balance.horizontal}` : ''}
                                 {comp.balance.horizontal && comp.balance.vertical ? ' / ' : ''}
                                 {comp.balance.vertical ? `V: ${comp.balance.vertical}` : ''}
                             </div>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};

const ControlGroup = ({ title, children, visualizer }: any) => (
    <div className="bg-[#0A0A0A] border border-white/5 rounded p-4 mb-4 relative overflow-hidden group">
        {/* Subtle active glow */}
        <div className="absolute top-0 left-0 w-1 h-full bg-white/10 group-hover:bg-blue-500 transition-colors"></div>
        
        <div className="flex gap-6">
            {/* Left: Controls */}
            <div className="flex-1 min-w-0">
                <h4 className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-4 pl-2 border-b border-white/5 pb-2">{title}</h4>
                <div className="space-y-1">
                    {children}
                </div>
            </div>

            {/* Right: Visualizer (Fixed width) */}
            <div className="hidden sm:flex flex-col justify-center items-center border-l border-white/5 pl-4 pt-6">
                {visualizer}
            </div>
        </div>
    </div>
);

// An abstract landscape/portrait topology represented by SVG paths
// Used to visualize which part of the image is being affected by sliders
const ZoneTopologyMap = ({ activeZone }: { activeZone: string | null }) => {
    const getOpacity = (zone: string) => {
        if (!activeZone) return 0.3;
        return activeZone.toLowerCase().includes(zone) ? 1 : 0.1;
    };

    return (
        <div className="w-full h-32 bg-[#050505] border border-white/10 rounded mb-4 relative overflow-hidden group">
            {/* Grid Background */}
            <div className="absolute inset-0 bg-[size:10px_10px] bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)]"></div>
            
            {/* Abstract Image Topology (A face-like structure) */}
            <svg viewBox="0 0 200 100" className="w-full h-full absolute inset-0 p-4" preserveAspectRatio="xMidYMid meet">
                {/* Defs for glow effects */}
                <defs>
                    <filter id="glow-zone" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* Highlights / Whites (Forehead, Nose bridge) */}
                <path 
                    d="M90 20 Q100 10 110 20 T130 30" 
                    fill="none" 
                    stroke="#fff" 
                    strokeWidth="2"
                    className="transition-all duration-500"
                    style={{ opacity: getOpacity('white') || getOpacity('highlight'), filter: activeZone?.match(/white|highlight/i) ? 'url(#glow-zone)' : 'none' }} 
                />
                
                {/* Midtones (Cheeks, Skin) */}
                <path 
                    d="M70 40 Q60 60 80 80 M130 80 Q150 60 140 40" 
                    fill="none" 
                    stroke="#888" 
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                    className="transition-all duration-500"
                    style={{ opacity: getOpacity('exposure') || getOpacity('contrast'), stroke: activeZone?.match(/exposure|contrast/i) ? '#3b82f6' : '#888' }}
                />

                {/* Shadows / Blacks (Hair, Neck, Edges) */}
                <path 
                    d="M50 30 Q40 50 50 90 M150 30 Q160 50 150 90 M60 95 Q100 110 140 95" 
                    fill="none" 
                    stroke="#444" 
                    strokeWidth="3"
                    className="transition-all duration-500"
                    style={{ opacity: getOpacity('black') || getOpacity('shadow') }} 
                />
            </svg>

            {/* Overlay Text */}
            <div className="absolute bottom-2 right-2 text-[7px] font-mono text-blue-500/50 border border-blue-500/20 px-1 rounded bg-black/80">
                ZONE MAP: {activeZone ? activeZone.toUpperCase() : 'STANDBY'}
            </div>
        </div>
    );
};

const PanelStrip = ({ 
    title, 
    icon: Icon, 
    children, 
    isActive = false,
    onToggle 
}: any) => {
    return (
        <div className="border-b border-white/5 bg-[#080808] relative">
            {/* Active Indicator Line */}
            {isActive && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>}
            
            <button 
                className={cn(
                    "flex items-center gap-3 w-full px-4 py-3 transition-all duration-200 group outline-none relative overflow-hidden",
                    isActive ? "bg-white/[0.03]" : "hover:bg-white/[0.01]"
                )}
                onClick={onToggle}
            >
                {/* Hover Glitch Effect Background */}
                <div className="absolute inset-0 bg-blue-500/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300 skew-x-12 origin-left"></div>

                <div className={cn(
                    "p-1 rounded-sm transition-colors z-10", 
                    isActive ? "text-blue-400 bg-blue-500/10" : "text-white/40 bg-white/5 group-hover:text-white/60"
                )}>
                    <Icon className="w-3 h-3" />
                </div>
                <span className={cn(
                    "text-[10px] font-bold uppercase tracking-[0.15em] flex-1 text-left transition-colors z-10 flex items-center gap-2",
                    isActive ? "text-white text-shadow-blue" : "text-white/60 group-hover:text-white/80"
                )}>
                    {title}
                    {isActive && <span className="text-[6px] bg-blue-500 text-black px-1 py-px rounded animate-pulse">ACTV</span>}
                </span>
                <ChevronRight className={cn("w-3 h-3 text-white/20 transition-transform duration-300 z-10", isActive && "rotate-90")} />
            </button>

            <div className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                isActive ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            )}>
                <div className="overflow-hidden">
                    <div className="p-5 bg-[#050505] border-y border-white/[0.02] shadow-inner relative">
                         {/* Tech Background Grid */}
                        <div className="absolute inset-0 opacity-5 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                        <div className="relative z-10">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ColorGradeWheel = ({ hue, saturation, label, onHover, reason }: any) => {
    return (
        <div className="flex flex-col items-center gap-3" onMouseEnter={() => onHover(`${label.toUpperCase()}: ${reason}`)} onMouseLeave={() => onHover(null)}>
            <div className="w-24 h-24 rounded-full border border-white/10 relative bg-[#050505] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center group cursor-crosshair hover:border-white/30 transition-colors">
                {/* Gradient Ring */}
                <div className="absolute inset-1 rounded-full opacity-40" style={{ background: 'conic-gradient(from 90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' }}></div>
                <div className="absolute inset-[5px] rounded-full bg-[#0a0a0a]"></div>
                
                {/* Crosshairs */}
                <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                    <div className="w-full h-px bg-white"></div>
                    <div className="h-full w-px bg-white absolute"></div>
                </div>

                {/* Puck */}
                <div 
                    className="w-2.5 h-2.5 rounded-full border border-white bg-transparent shadow-[0_0_5px_white] absolute transition-all duration-500 z-10"
                    style={{ 
                        transform: `rotate(${hue}deg) translate(${saturation/2.5}px) rotate(-${hue}deg)` 
                    }}
                >
                    <div className="absolute inset-0.5 bg-white rounded-full opacity-50"></div>
                </div>
                
                <div className="text-[9px] font-bold text-white/30 z-10 uppercase tracking-widest group-hover:text-white/60 transition-colors">{label}</div>
            </div>
            <div className="flex gap-2 text-[9px] font-mono text-white/40 bg-white/5 px-2 py-1 rounded border border-white/5">
                <span>H:<span className="text-white">{hue}</span></span>
                <span className="w-px h-3 bg-white/10"></span>
                <span>S:<span className="text-white">{saturation}</span></span>
            </div>
        </div>
    );
};

// --- NEW VISUAL WIDGETS ---

// 【重新设计】HSL 调整面板组件
// 功能：显示 HSL 调整的重点颜色，每个色块显示颜色名称和 H/S/L 调整值
// 用途：让用户直观看到哪些颜色需要在 LR 混色器中调整，以及调整方向
const PaletteStrip = ({ hslData }: { hslData: any }) => {
    const { t } = useLanguage();
    
    // 【优化】颜色映射配置：颜色键名 -> 显示颜色和中英文标签
    const colorConfig: Record<string, { color: string; labelEn: string; labelCn: string }> = {
        red: { color: '#ef4444', labelEn: 'Red', labelCn: '红' },
        orange: { color: '#f97316', labelEn: 'Orange', labelCn: '橙' },
        yellow: { color: '#eab308', labelEn: 'Yellow', labelCn: '黄' },
        green: { color: '#22c55e', labelEn: 'Green', labelCn: '绿' },
        aqua: { color: '#06b6d4', labelEn: 'Aqua', labelCn: '青' },
        blue: { color: '#3b82f6', labelEn: 'Blue', labelCn: '蓝' },
        purple: { color: '#8b5cf6', labelEn: 'Purple', labelCn: '紫' },
        magenta: { color: '#ec4899', labelEn: 'Magenta', labelCn: '洋红' },
    };
    
    // 【优化】提取有调整的颜色，并按调整幅度排序
    const extractAdjustedColors = () => {
        if (!hslData || typeof hslData !== 'object' || Object.keys(hslData).length === 0) {
            return []; // 如果没有 HSL 数据，返回空数组
        }
        
        const adjustedColors: Array<{
            key: string;
            color: string;
            label: string;
            h: number;
            s: number;
            l: number;
            desc: string;
            totalAdjustment: number; // 用于排序
        }> = [];
        
        // 遍历所有颜色，提取有调整的颜色
        for (const [key, config] of Object.entries(colorConfig)) {
            const hslItem = hslData[key];
            if (hslItem) {
                const h = hslItem.hue || hslItem.h || 0;
                const s = hslItem.saturation || hslItem.s || 0;
                const l = hslItem.luminance || hslItem.l || 0;
                const desc = hslItem.desc || hslItem.note || '';
                
                // 只显示有调整的颜色（任一值不为 0）
                if (h !== 0 || s !== 0 || l !== 0) {
                    adjustedColors.push({
                        key,
                        color: config.color,
                        label: t('lang') === 'zh' ? config.labelCn : config.labelEn,
                        h,
                        s,
                        l,
                        desc,
                        totalAdjustment: Math.abs(h) + Math.abs(s) + Math.abs(l),
                    });
                }
            }
        }
        
        // 按调整幅度降序排序，显示最重要的调整
        adjustedColors.sort((a, b) => b.totalAdjustment - a.totalAdjustment);
        
        return adjustedColors;
    };
    
    const adjustedColors = extractAdjustedColors();
    
    // 【优化】格式化调整值显示
    const formatValue = (val: number) => {
        if (val === 0) return '';
        return val > 0 ? `+${val}` : `${val}`;
    };

    // 如果没有调整数据，显示提示信息
    if (adjustedColors.length === 0) {
        return (
            <div className="flex h-14 w-full rounded overflow-hidden border border-white/10 shadow-lg mb-4 bg-[#0c0c0c] items-center justify-center">
                <span className="text-[9px] text-white/30 font-mono uppercase tracking-wider">
                    {t('lang') === 'zh' ? 'HSL 混色器：无显著调整' : 'HSL MIXER: No significant adjustments'}
                </span>
            </div>
        );
    }

    return (
        <div className="flex h-14 w-full rounded overflow-hidden border border-white/10 shadow-lg mb-4">
            {adjustedColors.slice(0, 5).map((item, i) => (
                <div 
                    key={item.key} 
                    className="flex-1 relative group transition-all duration-300 hover:flex-[1.2]" 
                    style={{ backgroundColor: item.color }}
                    title={item.desc || `${item.label}: H${formatValue(item.h)} S${formatValue(item.s)} L${formatValue(item.l)}`}
                >
                    {/* 悬停时的遮罩效果 */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300"></div>
                    
                    {/* 颜色名称（始终显示） */}
                    <div className="absolute top-1 left-1 right-1">
                        <div className="text-[8px] font-bold text-white/90 uppercase tracking-wider drop-shadow-lg">
                            {item.label}
                        </div>
                    </div>
                    
                    {/* HSL 调整值（始终显示，核心信息） */}
                    <div className="absolute bottom-1 left-1 right-1 flex flex-col gap-0">
                        {/* H/S/L 调整值 - 使用醒目的显示方式 */}
                        <div className="flex justify-between text-[7px] font-mono text-white/90 drop-shadow-lg">
                            {item.h !== 0 && <span className="bg-black/50 px-0.5 rounded">H{formatValue(item.h)}</span>}
                            {item.s !== 0 && <span className="bg-black/50 px-0.5 rounded">S{formatValue(item.s)}</span>}
                            {item.l !== 0 && <span className="bg-black/50 px-0.5 rounded">L{formatValue(item.l)}</span>}
                        </div>
                    </div>
                    
                    {/* 悬停时显示详细说明 */}
                    {item.desc && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-1">
                            <div className="text-[7px] text-white text-center leading-tight bg-black/70 p-1 rounded max-w-full overflow-hidden">
                                {item.desc.length > 30 ? item.desc.substring(0, 30) + '...' : item.desc}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

const ZoneSystemStrip = ({ exposure }: { exposure: number }) => {
    // Visual bar representing Zone 0 (Black) to Zone X (White)
    return (
        <div className="w-full h-4 bg-gradient-to-r from-black via-gray-500 to-white rounded-sm border border-white/10 relative mt-2 mb-4 opacity-80">
            {/* Zones Markers */}
            <div className="absolute inset-0 flex justify-between px-px">
                {[...Array(11)].map((_, i) => (
                     <div key={i} className="w-px h-full bg-red-500/30 mix-blend-difference"></div>
                ))}
            </div>
            {/* Indicator */}
            <div 
                className="absolute top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_8px_#3b82f6] transition-all duration-500"
                style={{ left: `${50 + (exposure * 10)}%` }} // Assume exp -5 to +5 maps roughly
            >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[7px] font-mono text-blue-400 bg-black/80 px-1 rounded">
                    EV{exposure > 0 ? '+' : ''}{exposure}
                </div>
            </div>
        </div>
    );
};

export const LightroomPanel: React.FC<LightroomPanelProps> = ({ data }) => {
  const { t } = useLanguage();
  const [activeLog, setActiveLog] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>('basic');
  
  // 【新增】从 sessionStorage 读取用户图的 EXIF 数据（ISO、光圈、快门等拍摄参数）
  // EXIF 数据由后端在图片上传时从原图中提取，存储在 sessionStorage 中
  const [userExif, setUserExif] = useState<{
    iso?: number;
    aperture?: string;
    shutter_speed?: string;
    focal_length?: string;
    camera_make?: string;
    camera_model?: string;
  }>({});
  
  // 组件挂载时读取 EXIF 数据
  React.useEffect(() => {
    try {
      const exifStr = sessionStorage.getItem('user_image_exif');
      if (exifStr) {
        const exif = JSON.parse(exifStr);
        setUserExif(exif);
        console.log('[LightroomPanel] 读取用户图 EXIF:', exif);
      }
    } catch (e) {
      console.warn('[LightroomPanel] 读取 EXIF 数据失败:', e);
    }
  }, []);

  const toggleSection = (id: string) => {
      setActiveSection(activeSection === id ? null : id);
  };
  
  // 【修复】安全检查：确保 data.basic_panel 及其所有必需字段都存在
  // 如果数据不完整，使用默认值避免崩溃
  // 定义默认值对象
  const defaultBasicPanelValue = {
    value: 0,
    range: "+0",
    reason: "",
    target_min: undefined,
    target_max: undefined,
  };
  
  // 构建安全的 basic_panel，确保所有必需字段都有值
  const safeBasicPanel = {
    temp: data.basic_panel?.temp || defaultBasicPanelValue,
    tint: data.basic_panel?.tint || defaultBasicPanelValue,
    exposure: data.basic_panel?.exposure || defaultBasicPanelValue,
    contrast: data.basic_panel?.contrast || defaultBasicPanelValue,
    highlights: data.basic_panel?.highlights || defaultBasicPanelValue,
    shadows: data.basic_panel?.shadows || defaultBasicPanelValue,
    whites: data.basic_panel?.whites || defaultBasicPanelValue,
    blacks: data.basic_panel?.blacks || defaultBasicPanelValue,
    texture: data.basic_panel?.texture || defaultBasicPanelValue,
    clarity: data.basic_panel?.clarity || defaultBasicPanelValue,
    dehaze: data.basic_panel?.dehaze || defaultBasicPanelValue,
    vibrance: data.basic_panel?.vibrance || defaultBasicPanelValue,
    saturation: data.basic_panel?.saturation || defaultBasicPanelValue,
    // 保留实际数据，覆盖默认值（如果存在）
    ...(data.basic_panel || {}),
  };
  
  // 构建安全的 data 对象，确保所有字段都有默认值
  const safeData = {
    ...data,
    basic_panel: safeBasicPanel,
    // 【修复】为其他字段也提供默认值，避免类似的 undefined 错误
    histogram: data.histogram || {
      r: [], g: [], b: [], l: [],
      avg_l: 0, shadows: 0, midtones: 0, highlights: 0,
    },
    curve: data.curve || {
      rgb: [],
      red: [],
      green: [],
      blue: [],
      reason: "",
      analysis: "",
    },
    hsl: data.hsl || {},
    split_toning: data.split_toning || {
      highlights: { hue: 0, saturation: 0, reason: "" },
      midtones: { hue: 0, saturation: 0, reason: "" },
      shadows: { hue: 0, saturation: 0, reason: "" },
      balance: { value: 0, reason: "" },
    },
  };
  
  // 【调试日志】记录数据检查（包含 simulated_histogram 数据）
  if (process.env.NODE_ENV === 'development') {
    console.log('[LightroomPanel] 🔍 数据检查:', {
      hasData: !!data,
      hasBasicPanel: !!data.basic_panel,
      basicPanelKeys: data.basic_panel ? Object.keys(data.basic_panel) : [],
      safeBasicPanelKeys: Object.keys(safeBasicPanel),
      hasTemp: !!data.basic_panel?.temp,
      tempValue: data.basic_panel?.temp?.value,
      safeTempValue: safeBasicPanel.temp.value,
      missingFields: ['temp', 'tint', 'exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks', 'texture', 'clarity', 'dehaze', 'vibrance', 'saturation'].filter(
        field => !data.basic_panel?.[field]
      ),
      // 【新增】检查 simulated_histogram 数据
      hasSimulatedHistogram: !!data.simulated_histogram,
      simulatedHistogramKeys: data.simulated_histogram ? Object.keys(data.simulated_histogram) : [],
      hasHistogramData: !!data.simulated_histogram?.histogram_data,
      histogramDataKeys: data.simulated_histogram?.histogram_data ? Object.keys(data.simulated_histogram.histogram_data) : [],
      histogramDataLengths: data.simulated_histogram?.histogram_data ? {
        r: data.simulated_histogram.histogram_data.r?.length || 0,
        g: data.simulated_histogram.histogram_data.g?.length || 0,
        b: data.simulated_histogram.histogram_data.b?.length || 0,
        l: data.simulated_histogram.histogram_data.l?.length || 0,
      } : null,
      hasDescription: !!data.simulated_histogram?.description,
      descriptionPreview: data.simulated_histogram?.description?.substring(0, 50) || 'None',
      // 【新增】检查 fallback histogram 数据
      hasFallbackHistogram: !!data.histogram,
      fallbackHistogramLengths: data.histogram ? {
        r: data.histogram.r?.length || 0,
        g: data.histogram.g?.length || 0,
        b: data.histogram.b?.length || 0,
        l: data.histogram.l?.length || 0,
      } : null,
    });
  }

  return (
    <>
    <style>{globalStyles}</style>
    <div className="flex flex-col min-h-full relative bg-[#030303] text-gray-300 font-sans selection:bg-blue-500/30">
        {/* GLOBAL FX */}
        <ScanlineOverlay />
        <DataStreamVertical />

        {/* VIGNETTE */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]"></div>

            {/* 1. COLOR MATCH PROTOCOL (NEW TOP SECTION) */}
            <div className="p-4 border-b border-white/10 bg-[#080808] relative z-30">
                <div className="flex items-center gap-2 mb-4">
                     <div className="w-2 h-2 bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
                     <span className="text-[11px] font-bold text-emerald-500 tracking-[0.2em] uppercase text-shadow-blue">{t('modal.lr.protocol')}</span>
                     <span className="text-[9px] text-white/30 font-mono ml-auto">REF_LINK: ACTIVE</span>
                </div>

                {/* A. TACTICAL BRIEF */}
                {/* 【修复】使用 Gemini 输出的 simulated_histogram.description，如果没有则使用默认值 */}
                {/* 从 data.simulated_histogram.description 中提取直方图描述，用于显示战术简报 */}
                <TacticalBrief 
                    title={t('modal.lr.brief')} 
                    content={data.simulated_histogram?.description || "根据用户图与参考图的差距，以下调整最为关键"} 
                />

                {/* B. WHITE BALANCE STRATEGY */}
                {/* 【修复】使用 Gemini 输出的白平衡数据（从 color_science_scheme.white_balance 中提取），如果没有则使用默认值 */}
                {/* 白平衡数据从色彩分级（color_scheme）中获取，显示在关键任务点下方 */}
                {data.white_balance && (
                <div className="mb-6">
                     <h5 className="text-[9px] text-emerald-500 uppercase font-bold border-l-2 border-emerald-500 pl-2 mb-3">{t('modal.color.wb_target')}</h5>
                     <TargetLockSlider 
                        label={t('modal.common.temp')} 
                        value={data.white_balance.temp?.value || 5500} 
                        unit="K" 
                        min={2000} 
                        max={10000} 
                        targetMin={data.white_balance.temp?.target_min || (data.white_balance.temp?.value ? data.white_balance.temp.value - 200 : 5300)} 
                        targetMax={data.white_balance.temp?.target_max || (data.white_balance.temp?.value ? data.white_balance.temp.value + 200 : 5700)}
                        reason={data.white_balance.temp?.reason || t('modal.lr.wb_temp_default')}
                        onHover={setActiveLog} 
                    />
                    <TargetLockSlider 
                        label={t('modal.common.tint')} 
                        value={data.white_balance.tint?.value || 0} 
                        min={-150} 
                        max={150} 
                        targetMin={data.white_balance.tint?.target_min || (data.white_balance.tint?.value ? data.white_balance.tint.value - 5 : -5)} 
                        targetMax={data.white_balance.tint?.target_max || (data.white_balance.tint?.value ? data.white_balance.tint.value + 5 : 5)}
                        reason={data.white_balance.tint?.reason || t('modal.lr.wb_tint_default')}
                        onHover={setActiveLog} 
                    />
                </div>
                )}

                {/* C. TRINITY GRADING */}
                {/* 【修复】使用 Gemini 输出的色彩分级数据，如果没有则使用默认值 */}
                {data.color_grading && (
                <div className="mb-6">
                    <h5 className="text-[9px] text-emerald-500 uppercase font-bold border-l-2 border-emerald-500 pl-2 mb-3">{t('modal.color.grading_vectors')}</h5>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                         <ColorGradeWheel 
                            hue={data.color_grading.shadows?.hue || 210} 
                            saturation={data.color_grading.shadows?.saturation || 20} 
                            label={t('modal.common.shadows')} 
                            onHover={setActiveLog} 
                            reason={data.color_grading.shadows?.reason || t('modal.lr.shadows_default')} 
                         />
                         <ColorGradeWheel 
                            hue={data.color_grading.midtones?.hue || 45} 
                            saturation={data.color_grading.midtones?.saturation || 15} 
                            label={t('modal.common.midtones')} 
                            onHover={setActiveLog} 
                            reason={data.color_grading.midtones?.reason || t('modal.lr.midtones_default')} 
                         />
                         <ColorGradeWheel 
                            hue={data.color_grading.highlights?.hue || 180} 
                            saturation={data.color_grading.highlights?.saturation || 5} 
                            label={t('modal.common.highlights')} 
                            onHover={setActiveLog} 
                            reason={data.color_grading.highlights?.reason || t('modal.lr.highlights_default')} 
                         />
                    </div>
                    <TargetLockSlider 
                        label={t('modal.color.balance')} 
                        value={data.color_grading.balance || -10} 
                        min={-100} 
                        max={100} 
                        targetMin={(data.color_grading.balance || -10) - 5} 
                        targetMax={(data.color_grading.balance || -10) + 5} 
                        reason={t('modal.lr.balance_default')}
                        onHover={setActiveLog}
                    />
                </div>
                )}

                 {/* D. SPECTRUM MATRIX (12 CHANNELS) */}
                 {/* 【修复】使用 Gemini 输出的 HSL 数据，如果没有则使用默认值 */}
                 {/* 从 data.hsl 中提取 HSL 数据，转换为 SpectrumMatrix 需要的格式 */}
                 <div>
                    <h5 className="text-[9px] text-emerald-500 uppercase font-bold border-l-2 border-emerald-500 pl-2 mb-3">{t('modal.color.spectrum')}</h5>
                    <SpectrumMatrix channels={(() => {
                      // 【修复】从 data.hsl 中提取 HSL 数据，转换为 SpectrumMatrix 需要的格式
                      // data.hsl 结构：{ red: { hue, saturation, luminance }, orange: {...}, ... }
                      const hsl = data.hsl || {};
                      // 颜色映射表：将后端颜色键映射到前端显示名称和颜色值
                      const colorMap = [
                        { key: 'red', name: t('modal.color.reds'), color: '#ff0000' },
                        { key: 'orange', name: t('modal.color.orange') || 'Orange', color: '#ffa500' },
                        { key: 'yellow', name: t('modal.color.yellows'), color: '#ffff00' },
                        { key: 'yellow_green', name: t('modal.color.yellow_green') || 'Yellow-Green', color: '#9acd32' },
                        { key: 'green', name: t('modal.color.greens'), color: '#008000' },
                        { key: 'green_cyan', name: t('modal.color.green_cyan') || 'Green-Cyan', color: '#00a86b' },
                        { key: 'cyan', name: t('modal.color.cyans'), color: '#00ffff' },
                        { key: 'cyan_blue', name: t('modal.color.cyan_blue') || 'Cyan-Blue', color: '#007fff' },
                        { key: 'blue', name: t('modal.color.blues'), color: '#0000ff' },
                        { key: 'blue_purple', name: t('modal.color.blue_purple') || 'Blue-Purple', color: '#8a2be2' },
                        { key: 'magenta', name: t('modal.color.magentas'), color: '#800080' },
                        { key: 'purple_magenta', name: t('modal.color.purple_magenta') || 'Purple-Magenta', color: '#c71585' },
                      ];
                      
                      // 将后端 HSL 数据转换为前端 SpectrumMatrix 需要的格式
                      return colorMap.map(({ key, name, color }) => {
                        const hslData = hsl[key] || {};
                        return {
                          name,
                          h: hslData.hue || hslData.h || 0,  // 色相调整值
                          s: hslData.saturation || hslData.s || 0,  // 饱和度调整值
                          l: hslData.luminance || hslData.l || 0,  // 明度调整值
                          color,
                        };
                      });
                    })()} />
                 </div>
            </div>

            {/* 2. PRO SIGNAL HEADER (Existing) */}
            <div className="p-5 border-b border-white/10 bg-[#080808] relative z-10">
            {/* Tech Corners */}
            <TechCorner position="tl" />
            <TechCorner position="tr" />

            <div className="flex justify-between items-end mb-3">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_5px_#3b82f6]"></div>
                        <span className="text-[10px] font-bold text-blue-500 tracking-[0.2em] uppercase mb-0.5 text-shadow-blue">{t('modal.lr.signal')}</span>
                    </div>
                    <span className="text-[9px] text-white/20 font-mono pl-3.5">{t('modal.lr.rgb_parade')}</span>
                </div>
                {/* 【修复】使用从图片 EXIF 中提取的 ISO 和光圈值，WB 使用 Gemini 推荐的白平衡值 */}
                <div className="flex gap-4 text-[9px] font-mono text-white/40 bg-white/5 px-2 py-1 rounded border border-white/10 backdrop-blur-sm shadow-lg">
                    <span className="flex items-center gap-1">
                      <Sun className="w-2.5 h-2.5" /> 
                      {userExif.iso ? `ISO ${userExif.iso}` : 'ISO --'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Aperture className="w-2.5 h-2.5" /> 
                      {userExif.aperture || '--'}
                    </span>
                    <span className="text-blue-400 border-l border-white/10 pl-4 ml-2">
                      WB {safeData.basic_panel.temp.value}K
                    </span>
                </div>
            </div>
            
            {/* NEW PRO HISTOGRAM CONTAINER */}
            {/* 【修复】信号监视器：使用 Gemini 输出的 simulated_histogram 数据渲染直方图 */}
            <div className="mb-4 relative group transition-all duration-500" 
                 onMouseEnter={() => {
                   const desc = data.simulated_histogram?.description || t('modal.lr.signal') + ": " + (t('vad.hist_desc') || "Visualizing tonal distribution across channels.");
                   setActiveLog(desc);
                 }} 
                 onMouseLeave={() => setActiveLog(null)}>
                
                {/* Holographic Glow Behind */}
                <div className="absolute -inset-4 bg-blue-500/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                
                <div className="bg-[#050505] border border-white/10 rounded p-1 relative overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
                     {/* Grid Background */}
                    <div className="absolute inset-0 opacity-10 bg-[linear-gradient(0deg,transparent_24%,rgba(255,255,255,.3)_25%,rgba(255,255,255,.3)_26%,transparent_27%,transparent_74%,rgba(255,255,255,.3)_75%,rgba(255,255,255,.3)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(255,255,255,.3)_25%,rgba(255,255,255,.3)_26%,transparent_27%,transparent_74%,rgba(255,255,255,.3)_75%,rgba(255,255,255,.3)_76%,transparent_77%,transparent)] bg-[length:30px_30px]"></div>
                    
                    {/* 【修复】优先使用 simulated_histogram.histogram_data，如果没有则使用 fallback histogram */}
                    {(() => {
                      // 提取直方图数据（优先使用 simulated_histogram，否则使用 fallback）
                      const histogramR = data.simulated_histogram?.histogram_data?.r || safeData.histogram.r || [];
                      const histogramG = data.simulated_histogram?.histogram_data?.g || safeData.histogram.g || [];
                      const histogramB = data.simulated_histogram?.histogram_data?.b || safeData.histogram.b || [];
                      const histogramL = data.simulated_histogram?.histogram_data?.l || safeData.histogram.l || [];
                      
                      // 【调试日志】记录传递给 ProfessionalHistogram 的数据
                      if (process.env.NODE_ENV === 'development') {
                        console.log('[LightroomPanel] 📊 传递给 ProfessionalHistogram 的数据:', {
                          source: data.simulated_histogram?.histogram_data ? 'simulated_histogram' : 'fallback_histogram',
                          rLength: histogramR.length,
                          gLength: histogramG.length,
                          bLength: histogramB.length,
                          lLength: histogramL.length,
                          rSample: histogramR.slice(0, 5),
                          gSample: histogramG.slice(0, 5),
                          bSample: histogramB.slice(0, 5),
                          lSample: histogramL.slice(0, 5),
                        });
                      }
                      
                      return (
                        <ProfessionalHistogram 
                          r={histogramR} 
                          g={histogramG} 
                          b={histogramB} 
                          l={histogramL} 
                        />
                      );
                    })()}
                    {/* Corner Brackets inside Histogram */}
                    <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-white/30"></div>
                    <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-white/30"></div>
                </div>
            </div>

            {/* PALETTE STRIP (Visual Context) */}
            {/* 【修复】使用 Gemini 输出的 palette_strip_description，如果没有则使用默认值 */}
            <div className="mb-2 relative z-20" 
                 onMouseEnter={() => {
                   const desc = data.simulated_histogram?.palette_strip_description || "COLOR PALETTE: Extracted key dominant tones.";
                   setActiveLog(desc);
                 }} 
                 onMouseLeave={() => setActiveLog(null)}>
                 <PaletteStrip hslData={safeData.hsl} />
            </div>

            {/* Stats Grid */}
            {/* 【修复】使用 Gemini 输出的 stats_grid_description，如果没有则使用默认值 */}
            {/* 【优化】添加可视化进度条，让数值更直观 */}
            <div className="grid grid-cols-4 gap-px border border-white/5 rounded bg-white/5 overflow-hidden backdrop-blur-md"
                 onMouseEnter={() => {
                   const desc = data.simulated_histogram?.stats_grid_description || "STATS GRID: Histogram statistics showing shadows, exposure, and highlights distribution.";
                   setActiveLog(desc);
                 }}
                 onMouseLeave={() => setActiveLog(null)}>
                 {[
                     { 
                       label: t('modal.common.blacks'), 
                       val: safeData.histogram.shadows,
                       maxVal: 100, // 阴影区域占比，最大 100%
                       color: "bg-gray-800", // 暗色调
                       barColor: "bg-gray-600"
                     },
                     { 
                       label: t('modal.common.exposure'), 
                       val: safeData.histogram.avg_l,
                       maxVal: 255, // 平均亮度，最大 255
                       color: "bg-blue-900/30",
                       barColor: "bg-blue-500"
                     },
                     { 
                       label: t('modal.common.whites'), 
                       val: safeData.histogram.highlights,
                       maxVal: 100, // 高光区域占比，最大 100%
                       color: "bg-gray-700",
                       barColor: "bg-gray-400"
                     },
                     { 
                       label: "Clipping", 
                       val: "NONE", 
                       color: "text-emerald-500",
                       isClipping: true // 特殊处理，不显示进度条
                     }
                 ].map((stat, i) => (
                     <div key={i} className="p-1.5 text-center bg-[#0c0c0c] hover:bg-[#151515] transition-colors relative overflow-hidden group">
                         <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100"></div>
                         <div className="text-[7px] text-white/30 uppercase tracking-wider mb-0.5 font-bold">{stat.label}</div>
                         
                         {/* 【优化】添加可视化进度条（仅对数值类型显示） */}
                         {!stat.isClipping && typeof stat.val === 'number' && (
                             <div className="relative w-full h-1 bg-black/50 rounded-full mb-1 overflow-hidden">
                                 <div 
                                     className={cn("h-full transition-all duration-500", stat.barColor || "bg-white/40")}
                                     style={{ width: `${Math.min(100, (stat.val / stat.maxVal) * 100)}%` }}
                                 ></div>
                             </div>
                         )}
                         
                         <div className={cn("text-[10px] font-mono", stat.color || "text-white")}>{stat.val}</div>
                     </div>
                 ))}
            </div>
        </div>

        {/* 2. DEVELOP MODULES */}
        <div className="flex-1 relative z-10">

            {/* CURVE (REPLACED WITH ADVANCED MONITOR) */}
            <PanelStrip title={t('modal.lr.curve')} icon={Activity} isActive={activeSection === 'curve'} onToggle={() => toggleSection('curve')}>
                <AdvancedCurveMonitor curveData={safeData.curve} />
            </PanelStrip>

            {/* COMPOSITION ANALYSIS (NEW) */}
            <PanelStrip title={t('modal.lr.comp')} icon={Layout} isActive={activeSection === 'composition'} onToggle={() => toggleSection('composition')}>
                <CompositionMonitor data={data.composition} />
            </PanelStrip>

            {/* CURVE (REPLACED WITH ADVANCED MONITOR) */}


            {/* HSL */}
            <PanelStrip title={t('modal.lr.hsl_mixer')} icon={Palette} isActive={activeSection === 'hsl'} onToggle={() => toggleSection('hsl')}>
                <div className="-mx-5 -my-2"> 
                    <div className="scale-95 origin-top w-[105%]">
                         <HSLVisualizer data={data.hsl} onHover={setActiveLog} />
                    </div>
                </div>
            </PanelStrip>

            {/* SPLIT TONING */}
            <PanelStrip title={t('modal.lr.grading')} icon={Aperture} isActive={activeSection === 'grading'} onToggle={() => toggleSection('grading')}>
                 <div className="flex justify-center gap-10 py-6 relative">
                     {/* Connection Line */}
                     <div className="absolute top-1/2 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                     
                     <ColorGradeWheel 
                        hue={safeData.split_toning.shadows.hue} 
                        saturation={safeData.split_toning.shadows.saturation} 
                        label={t('modal.common.shadows')} 
                        reason={safeData.split_toning.shadows.reason}
                        onHover={setActiveLog} 
                     />
                     <ColorGradeWheel 
                        hue={safeData.split_toning.highlights.hue} 
                        saturation={safeData.split_toning.highlights.saturation} 
                        label={t('modal.common.highlights')} 
                        reason={safeData.split_toning.highlights.reason}
                        onHover={setActiveLog} 
                     />
                 </div>
                 <div className="bg-black/20 p-4 rounded border border-white/5 mx-2">
                    <CyberSlider label={t('modal.color.balance')} value={safeData.split_toning.balance.value} reason={safeData.split_toning.balance.reason} onHover={setActiveLog} />
                 </div>
            </PanelStrip>

        </div>

        {/* SPACER */}
        <div className="h-24 w-full shrink-0"></div>

        {/* FOOTER TERMINAL */}
        {/* 【优化】SYS.LOG 区域：支持多行显示，长文本自动换行，最大高度限制 */}
        <div className="sticky bottom-0 left-0 right-0 z-30 bg-[#0a0a0a]/95 backdrop-blur border-t border-white/10 p-1 shadow-[0_-10px_40px_rgba(0,0,0,1)]">
             {/* Progress / Beat Line */}
             <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
             <div className="absolute -top-[1px] left-[20%] w-10 h-px bg-blue-400 shadow-[0_0_10px_#3b82f6] animate-[pulse_2s_infinite]"></div>

             <div className="flex items-start gap-3 px-2 py-1">
                <div className="p-1 bg-blue-500/10 rounded border border-blue-500/20 shrink-0 relative overflow-hidden mt-0.5">
                    <div className="absolute inset-0 bg-blue-500/20 animate-ping opacity-20"></div>
                    <Terminal className="w-3 h-3 text-blue-400" />
                </div>
                {/* 【修复】移除 whitespace-nowrap 和 text-ellipsis，支持多行显示 */}
                <div className="flex-1 font-mono text-[9px] leading-relaxed overflow-hidden max-h-16 overflow-y-auto">
                    <span className="text-blue-500/50 mr-2 font-bold">&gt; SYS.LOG:</span>
                    {activeLog ? (
                        <span className="text-blue-300 tracking-wide break-words">{activeLog}</span>
                    ) : (
                        <span className="text-white/20 italic tracking-widest opacity-50">AWAITING INPUT_</span>
                    )}
                </div>
                {/* Fake Graph Mini */}
                <div className="hidden sm:flex gap-px items-end h-3 opacity-30 shrink-0">
                     {[...Array(10)].map((_, i) => (
                         <div key={i} className="w-1 bg-blue-500" style={{ height: `${Math.random() * 100}%` }}></div>
                     ))}
                </div>
            </div>
        </div>

    </div>
    </>
  );
};
