import React, { useState, useMemo, useCallback, useRef } from 'react';
import { LightroomData } from '../../types/analysis';
import { Terminal, Activity, ChevronRight, Sun, Sliders, Palette, Aperture, RotateCcw, Layout, Target, Eye, EyeOff, Grid3X3, Maximize, Layers, Percent, Scale, GitGraph, Monitor, MonitorOff, X, Zap, Send, History, RefreshCw, MessageSquare, Loader2, CheckCircle, SplitSquareVertical, GripVertical, Image, Camera, Sparkles } from 'lucide-react';
import { cn } from '../ui/utils';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { HSLVisualizer } from './HSLVisualizer';
import { ProfessionalHistogram } from './ProfessionalHistogram';
import { LivePreviewCanvas, LivePreviewCanvasRef, predictHistogram, LiveHistogramData } from './LivePreviewCanvas';
import { FilterParams, DEFAULT_PARAMS } from '../../src/lib/ImageEngine';
import { api, getAuthToken } from '../../src/lib/api'; // 【新增】导入统一的 API 客户端和认证函数
import { hifiRenderService } from '../../src/lib/hifiRenderService'; // 【新增】高保真渲染服务

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
  userImageUrl?: string; // 【新增】用户图片 URL，用于预览功能
  refImageUrl?: string;  // 【新增】参考图 URL，用于对比功能
  taskId?: string | null; // 【新增】任务 ID，用于迭代反馈功能
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

// 【新增】色彩匹配协议卡片组件
// 用于展示 Gemini 输出的 analysis 字段中的 5 个关键信息
interface AnalysisCardData {
  scene_type?: string;
  lighting_strategy?: string;
  key_colors?: string[];
  dynamic_range_analysis?: string;
  color_calibration_strategy?: string;
}

const ColorMatchProtocolCards = ({ analysis, t }: { analysis: AnalysisCardData; t: (key: string) => string }) => {
  // 【调试日志】记录 analysis 数据
  console.log('[ColorMatchProtocolCards] 🔍 analysis 数据:', {
    hasAnalysis: !!analysis,
    analysisKeys: analysis ? Object.keys(analysis) : [],
    scene_type: analysis?.scene_type || 'N/A',
    lighting_strategy: analysis?.lighting_strategy?.substring(0, 50) || 'N/A',
    key_colors: analysis?.key_colors || [],
    dynamic_range_analysis: analysis?.dynamic_range_analysis?.substring(0, 50) || 'N/A',
    color_calibration_strategy: analysis?.color_calibration_strategy?.substring(0, 50) || 'N/A',
  });
  
  if (!analysis || Object.keys(analysis).length === 0) {
    console.log('[ColorMatchProtocolCards] ⚠️ analysis 数据为空，不渲染组件');
    return null;
  }
  
  // 卡片配置：图标、标题键、内容字段
  const cards = [
    {
      icon: <Camera className="w-3.5 h-3.5" />,
      titleKey: 'modal.lr.analysis.scene_type',
      title: '场景类型',
      content: analysis.scene_type,
      color: 'emerald',
    },
    {
      icon: <Sun className="w-3.5 h-3.5" />,
      titleKey: 'modal.lr.analysis.lighting_strategy',
      title: '光影策略',
      content: analysis.lighting_strategy,
      color: 'amber',
    },
    {
      icon: <Palette className="w-3.5 h-3.5" />,
      titleKey: 'modal.lr.analysis.key_colors',
      title: '关键色彩',
      content: analysis.key_colors?.join(' · '),
      color: 'purple',
    },
    {
      icon: <Activity className="w-3.5 h-3.5" />,
      titleKey: 'modal.lr.analysis.dynamic_range',
      title: '动态范围',
      content: analysis.dynamic_range_analysis,
      color: 'blue',
    },
    {
      icon: <Zap className="w-3.5 h-3.5" />,
      titleKey: 'modal.lr.analysis.calibration',
      title: '校准策略',
      content: analysis.color_calibration_strategy,
      color: 'rose',
    },
  ];
  
  // 颜色配置
  const colorClasses: Record<string, { border: string; icon: string; title: string; bg: string }> = {
    emerald: { border: 'border-emerald-500/30', icon: 'text-emerald-400', title: 'text-emerald-400', bg: 'bg-emerald-500/5' },
    amber: { border: 'border-amber-500/30', icon: 'text-amber-400', title: 'text-amber-400', bg: 'bg-amber-500/5' },
    purple: { border: 'border-purple-500/30', icon: 'text-purple-400', title: 'text-purple-400', bg: 'bg-purple-500/5' },
    blue: { border: 'border-blue-500/30', icon: 'text-blue-400', title: 'text-blue-400', bg: 'bg-blue-500/5' },
    rose: { border: 'border-rose-500/30', icon: 'text-rose-400', title: 'text-rose-400', bg: 'bg-rose-500/5' },
  };
  
  // 过滤掉空内容的卡片
  const validCards = cards.filter(card => card.content);
  
  if (validCards.length === 0) return null;
  
  return (
    <div className="mb-6">
      <h5 className="text-[9px] text-cyan-500 uppercase font-bold border-l-2 border-cyan-500 pl-2 mb-3 tracking-wider">
        {t('modal.lr.analysis_title') || 'SCENE ANALYSIS'}
      </h5>
      <div className="grid grid-cols-1 gap-2">
        {validCards.map((card, idx) => {
          const colors = colorClasses[card.color] || colorClasses.emerald;
          return (
            <div 
              key={idx}
              className={`${colors.bg} ${colors.border} border rounded-lg p-3 relative overflow-hidden group hover:border-opacity-50 transition-all duration-300`}
            >
              {/* 装饰性背景 */}
              <div className="absolute top-0 right-0 w-16 h-16 opacity-5 transform translate-x-4 -translate-y-4">
                {card.icon && React.cloneElement(card.icon as React.ReactElement<{ className?: string }>, { className: 'w-16 h-16' })}
              </div>
              
              {/* 标题行 */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className={colors.icon}>{card.icon}</span>
                <span className={`text-[9px] font-bold ${colors.title} uppercase tracking-wider`}>
                  {t(card.titleKey) || card.title}
                </span>
              </div>
              
              {/* 内容 */}
              <p className="text-[10px] text-gray-300 leading-relaxed font-mono pl-5">
                {card.content}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Enhanced Slider with Target Range Visualization
// 【新增】layerKey 属性用于 Solo 模式，onClick 用于点击触发
// 【新增】isOverridden 属性用于显示迭代覆盖标记
const TargetLockSlider = ({ 
  label, 
  value, 
  unit = '', 
  min = -100, 
  max = 100, 
  targetMin, 
  targetMax, 
  reason, 
  onHover,
  layerKey,      // 【新增】图层标识，用于 Solo 模式
  onSoloClick,   // 【新增】点击回调，用于触发 Solo 模式
  isSolo,        // 【新增】是否处于 Solo 模式
  isOverridden,  // 【新增】是否被迭代覆盖
  originalValue  // 【新增】原始值（被覆盖前的值）
}: any) => {
    const percentage = ((value - min) / (max - min)) * 100;
    const isBipolar = min < 0;
    
    // Calculate Target Zone
    const targetStart = targetMin !== undefined ? ((targetMin - min) / (max - min)) * 100 : null;
    const targetWidth = (targetMin !== undefined && targetMax !== undefined) 
        ? ((targetMax - targetMin) / (max - min)) * 100 
        : 0;

    return (
        <div 
          className={cn(
            "group mb-4 relative transition-all duration-200",
            isSolo && "bg-blue-500/10 -mx-2 px-2 py-1 rounded border border-blue-500/30",
            isOverridden && !isSolo && "bg-orange-500/10 -mx-2 px-2 py-1 rounded border border-orange-500/30",
            onSoloClick && "cursor-pointer hover:bg-white/5 -mx-2 px-2 py-1 rounded"
          )}
          onMouseEnter={() => onHover && onHover(`${label.toUpperCase()}: ${reason}`)} 
          onMouseLeave={() => onHover && onHover(null)}
          onClick={() => onSoloClick && onSoloClick(layerKey)}
        >
            {/* Header */}
            <div className="flex justify-between items-end mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[9px] font-bold transition-colors uppercase tracking-wider",
                    isOverridden ? "text-orange-400" : (isSolo ? "text-blue-400" : "text-white/50 group-hover:text-blue-400")
                  )}>{label}</span>
                  {isSolo && (
                    <span className="text-[7px] font-mono text-blue-400 bg-blue-500/20 px-1 rounded">SOLO</span>
                  )}
                  {/* 【新增】迭代覆盖标记 */}
                  {isOverridden && (
                    <span className="text-[7px] font-mono text-orange-400 bg-orange-500/20 px-1 rounded animate-pulse">AI</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                    {targetMin !== undefined && (
                        <span className="text-[8px] font-mono text-emerald-500/70 bg-emerald-500/5 px-1 rounded border border-emerald-500/10">
                            TARGET: {targetMin > 0 ? '+' : ''}{targetMin}{unit} ~ {targetMax > 0 ? '+' : ''}{targetMax}{unit}
                        </span>
                    )}
                    {/* 【新增】显示原始值和新值的对比 */}
                    {isOverridden && originalValue !== undefined && (
                      <span className="text-[8px] font-mono text-white/30 line-through mr-1">
                        {originalValue > 0 && isBipolar ? '+' : ''}{Math.round(originalValue)}{unit}
                      </span>
                    )}
                    <span className={cn(
                      "text-[10px] font-mono px-1.5 rounded min-w-[3ch] text-right",
                      isOverridden ? "text-orange-300 bg-orange-500/20" : "text-white bg-white/5"
                    )}>
                      {value > 0 && isBipolar ? '+' : ''}{typeof value === 'number' ? Math.round(value) : value}{unit}
                    </span>
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

// 12-Channel Spectrum Matrix (FUI Grid) - 【增强】添加点击支持用于 Solo 模式（支持多选）
const SpectrumMatrix = ({ 
  channels, 
  onSoloClick,
  soloLayers // 【修改】改为 Set 支持多选
}: { 
  channels: any[]; 
  onSoloClick?: (layerKey: string) => void;
  soloLayers?: Set<string>;
}) => {
    // 颜色名称到 layerKey 的映射
    // 【修复】支持多种名称格式：英文单数/复数、中文、简写等
    const colorToLayerKey: Record<string, string> = {
        // 英文
        'red': 'hslRed',
        'reds': 'hslRed',
        'orange': 'hslOrange',
        'oranges': 'hslOrange',
        'yellow': 'hslYellow',
        'yellows': 'hslYellow',
        'yellowgreen': 'hslYellow', // 黄绿色映射到黄色
        'green': 'hslGreen',
        'greens': 'hslGreen',
        'greencyan': 'hslGreen', // 绿青色映射到绿色
        'cyan': 'hslCyan',
        'cyans': 'hslCyan',
        'aqua': 'hslCyan',
        'aquas': 'hslCyan',
        'cyanblue': 'hslCyan', // 青蓝色映射到青色
        'blue': 'hslBlue',
        'blues': 'hslBlue',
        'bluepurple': 'hslBlue', // 蓝紫色映射到蓝色
        'purple': 'hslPurple',
        'purples': 'hslPurple',
        'magenta': 'hslMagenta',
        'magentas': 'hslMagenta',
        'purplemagenta': 'hslMagenta', // 紫洋红映射到洋红
    };
    
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
                {channels.map((ch, i) => {
                    // 【修复】使用索引来映射 layerKey，而不是依赖名称
                    // 索引顺序：red(0), orange(1), yellow(2), yellow_green(3), green(4), green_cyan(5), 
                    //          cyan(6), cyan_blue(7), blue(8), blue_purple(9), magenta(10), purple_magenta(11)
                    const indexToLayerKey: Record<number, string> = {
                        0: 'hslRed',
                        1: 'hslOrange',
                        2: 'hslYellow',
                        3: 'hslYellow',  // yellow_green → yellow
                        4: 'hslGreen',
                        5: 'hslGreen',   // green_cyan → green
                        6: 'hslCyan',
                        7: 'hslCyan',    // cyan_blue → cyan
                        8: 'hslBlue',
                        9: 'hslBlue',    // blue_purple → blue
                        10: 'hslMagenta',
                        11: 'hslMagenta', // purple_magenta → magenta
                    };
                    
                    // 优先使用索引映射，fallback 到名称映射
                    const colorKey = ch.name?.toLowerCase().replace(/[^a-z]/g, '') || '';
                    const layerKey = indexToLayerKey[i] || colorToLayerKey[colorKey] || `hsl${ch.name}`;
                    const isSolo = soloLayers?.has(layerKey) || false; // 【修改】使用 Set.has()
                    
                    // 【调试】输出映射关系
                    if (onSoloClick) {
                        console.log(`[SpectrumMatrix] 行 ${i}: name="${ch.name}", colorKey="${colorKey}", layerKey="${layerKey}", isSolo=${isSolo}`);
                    }
                    
                    return (
                      <div 
                        key={i} 
                        className={cn(
                          "grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-px group transition-colors items-center h-7",
                          isSolo ? "bg-blue-500/20" : "hover:bg-white/5",
                          onSoloClick && "cursor-pointer"
                        )}
                        onClick={() => onSoloClick && onSoloClick(layerKey)}
                      >
                        <div className="pl-2 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_3px_currentColor]" style={{ backgroundColor: ch.color }}></div>
                            <span className={cn(
                              "text-[9px] font-mono truncate",
                              isSolo ? "text-blue-300" : "text-white/70"
                            )}>{ch.name}</span>
                            {isSolo && <span className="text-[6px] font-mono text-blue-400 bg-blue-500/30 px-1 rounded">S</span>}
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
                    );
                })}
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

// 【新增】曲线监视器属性接口 - 支持 Solo 预览模式
interface AdvancedCurveMonitorProps {
    curveData: any;
    previewMode?: boolean;
    onSoloClick?: (layerKey: string) => void;
    isSoloActive?: (layerKey: string) => boolean;
}

const AdvancedCurveMonitor = ({ 
    curveData, 
    previewMode = false, 
    onSoloClick, 
    isSoloActive 
}: AdvancedCurveMonitorProps) => {
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

    // 【修复】简化曲线 Solo 模式 - 只支持全局曲线开关
    const isCurveSolo = isSoloActive?.('curve') ?? true;
    
    // 【修复】处理通道点击事件 - 只切换显示通道，不影响 Solo
    const handleChannelClick = (channel: 'rgb' | 'red' | 'green' | 'blue') => {
        setActiveChannel(channel);
    };

    return (
        <div className={cn(
            "bg-[#0c0c0c] border rounded p-4 mb-4 shadow-lg transition-all duration-300",
            previewMode && isCurveSolo ? "border-blue-500/50 ring-1 ring-blue-500/20" : "border-white/10"
        )}>
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                 <div className="flex items-center gap-2">
                 <h4 className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Curve Dynamics</h4>
                     {/* 【新增】预览模式指示器 */}
                     {previewMode && (
                         <div className="flex items-center gap-1">
                             {isCurveSolo && (
                                 <span className="px-1.5 py-0.5 text-[7px] font-bold bg-blue-500/20 text-blue-400 rounded uppercase tracking-wider animate-pulse">
                                     SOLO
                                 </span>
                             )}
                         </div>
                     )}
                 </div>
                 <div className="flex gap-1 items-center">
                     {/* 【修复】全局曲线 Solo 按钮 */}
                     {previewMode && onSoloClick && (
                         <button
                             onClick={() => onSoloClick('curve')}
                             className={cn(
                                 "text-[8px] font-mono uppercase px-2 py-1 rounded border transition-all mr-2",
                                 isCurveSolo 
                                     ? "bg-blue-500/20 text-blue-400 border-blue-500/50" 
                                     : "text-white/30 border-white/10 hover:bg-white/5"
                             )}
                             title="Toggle curve preview"
                         >
                             <Eye className="w-3 h-3" />
                         </button>
                     )}
                     {/* 通道切换按钮（仅切换显示，不影响预览） */}
                     {(['rgb', 'red', 'green', 'blue'] as const).map(c => (
                         <button
                            key={c}
                            onClick={() => handleChannelClick(c)}
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
                                d={getPath(allChannelPoints.rgb) || undefined} 
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
                                d={getPath(allChannelPoints.red) || undefined} 
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
                                d={getPath(allChannelPoints.green) || undefined} 
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
                                d={getPath(allChannelPoints.blue) || undefined} 
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

// 【增强】ColorGradeWheel 添加点击支持，用于 Solo 模式
// 【更新】添加 luminance 参数支持，显示三个参数（H、S、L）
const ColorGradeWheel = ({ 
  hue, 
  saturation, 
  luminance = 0,  // 【新增】明度参数，默认值为 0
  label, 
  onHover, 
  reason,
  layerKey,      // 【新增】图层标识
  onSoloClick,   // 【新增】点击回调
  isSolo         // 【新增】是否 Solo 模式
}: any) => {
    const { t } = useLanguage();
    return (
        <div 
          className={cn(
            "flex flex-col items-center gap-2 transition-all duration-200",
            isSolo && "bg-blue-500/10 p-2 rounded-lg border border-blue-500/30",
            onSoloClick && "cursor-pointer"
          )}
          onMouseEnter={() => {
            if (onHover) {
              const hoverText = reason 
                ? `${label.toUpperCase()}: ${reason}` 
                : `${label.toUpperCase()}: ${t('modal.lr.shadows_default') || 'No reason provided'}`;
              onHover(hoverText);
            }
          }}
          onMouseLeave={() => onHover && onHover(null)}
          onClick={() => onSoloClick && onSoloClick(layerKey)}
        >
            <div className={cn(
              "w-20 h-20 rounded-full border relative bg-[#050505] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center group cursor-crosshair transition-colors",
              isSolo ? "border-blue-500/50 hover:border-blue-500/70" : "border-white/10 hover:border-white/30"
            )}>
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
                
                <div className={cn(
                  "text-[9px] font-bold z-10 uppercase tracking-widest transition-colors",
                  isSolo ? "text-blue-400" : "text-white/30 group-hover:text-white/60"
                )}>{label}</div>
                
                {/* Solo 标记 */}
                {isSolo && (
                  <div className="absolute -top-1 -right-1 text-[6px] font-mono text-blue-400 bg-blue-500/30 px-1 rounded">SOLO</div>
                )}
            </div>
            {/* 【更新】显示三个参数：H（色相）、S（饱和度）、L（明度） */}
            <div className="flex gap-1.5 text-[8px] font-mono text-white/40 bg-white/5 px-1.5 py-1 rounded border border-white/5">
                <span>H:<span className="text-white">{hue}°</span></span>
                <span className="w-px h-3 bg-white/10"></span>
                <span>S:<span className="text-white">{saturation}</span></span>
                <span className="w-px h-3 bg-white/10"></span>
                <span>L:<span className={luminance >= 0 ? "text-emerald-400" : "text-rose-400"}>{luminance >= 0 ? '+' : ''}{luminance}</span></span>
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

// ============================================================================
// 【新增】局部调整蒙版组件 - 显示 Gemini 推荐的蒙版调整
// ============================================================================
interface MaskData {
  mask_id?: number;
  mask_name: string;
  mask_type: string;
  mask_target: string;
  mask_parameters?: {
    luminosity_range?: { min: number; max: number; feather?: number };
    color_range?: { hue_center: number; hue_range: number };
    gradient?: { start_y_percent: number; end_y_percent: number; angle?: number };
    radial?: { center_x_percent: number; center_y_percent: number; radius_percent: number; feather?: number };
    invert?: boolean;
  };
  adjustments: {
    exposure?: string;
    contrast?: string;
    highlights?: string;
    shadows?: string;
    whites?: string;
    blacks?: string;
    temperature?: string;
    tint?: string;
    saturation?: string;
    clarity?: string;
    dehaze?: string;
    sharpness?: string;
  };
  reason: string;
}

interface TonalZoneData {
  highlights_zone?: {
    elements: string;
    color_treatment: string;
    detail_treatment: string;
    target_rgb?: { r: number; g: number; b: number };
    brightness_range?: string;
  };
  midtones_zone?: {
    elements: string;
    color_treatment: string;
    detail_treatment: string;
    target_rgb?: { r: number; g: number; b: number };
    brightness_range?: string;
  };
  shadows_zone?: {
    elements: string;
    color_treatment: string;
    detail_treatment: string;
    target_rgb?: { r: number; g: number; b: number };
    brightness_range?: string;
    black_point_lifted?: boolean;
  };
}

const LocalAdjustmentsMasks: React.FC<{
  masks: MaskData[];
  tonalZones?: TonalZoneData;
  onHover: (text: string | null) => void;
}> = ({ masks, tonalZones, onHover }) => {
  const { t } = useLanguage();
  const [expandedMask, setExpandedMask] = useState<number | null>(null);
  const [activeZone, setActiveZone] = useState<'highlights' | 'midtones' | 'shadows' | null>(null);

  // 蒙版类型图标和颜色映射
  const getMaskTypeInfo = (type: string) => {
    const typeMap: Record<string, { icon: string; color: string; label: string }> = {
      'sky_ai': { icon: '☁️', color: 'from-blue-500/20 to-cyan-500/20', label: t('modal.lr.mask_sky') },
      'luminosity_range': { icon: '◐', color: 'from-gray-500/20 to-white/20', label: t('modal.lr.mask_luminosity') },
      'color_range': { icon: '🎨', color: 'from-purple-500/20 to-pink-500/20', label: t('modal.lr.mask_color') },
      'gradient': { icon: '▽', color: 'from-orange-500/20 to-yellow-500/20', label: t('modal.lr.mask_gradient') },
      'radial': { icon: '◎', color: 'from-green-500/20 to-emerald-500/20', label: t('modal.lr.mask_radial') },
      'subject_ai': { icon: '👤', color: 'from-red-500/20 to-orange-500/20', label: t('modal.lr.mask_subject') },
    };
    return typeMap[type] || { icon: '⬚', color: 'from-gray-500/20 to-gray-600/20', label: type };
  };

  // 格式化调整值
  const formatAdjustment = (key: string, value: string) => {
    const labelMap: Record<string, string> = {
      'exposure': 'EXP',
      'contrast': 'CON',
      'highlights': 'HI',
      'shadows': 'SH',
      'whites': 'WH',
      'blacks': 'BL',
      'temperature': 'TEMP',
      'tint': 'TINT',
      'saturation': 'SAT',
      'clarity': 'CLR',
      'dehaze': 'DHZ',
      'sharpness': 'SHP',
    };
    return { label: labelMap[key] || key.toUpperCase(), value };
  };

  // 渲染影调分区分析
  const renderTonalZones = () => {
    if (!tonalZones) return null;

    const zones = [
      { key: 'highlights', data: tonalZones.highlights_zone, color: 'bg-gradient-to-r from-yellow-500/30 to-white/30', borderColor: 'border-yellow-500/50' },
      { key: 'midtones', data: tonalZones.midtones_zone, color: 'bg-gradient-to-r from-gray-500/30 to-gray-400/30', borderColor: 'border-gray-500/50' },
      { key: 'shadows', data: tonalZones.shadows_zone, color: 'bg-gradient-to-r from-blue-900/30 to-gray-800/30', borderColor: 'border-blue-500/50' },
    ] as const;

    return (
      <div className="mb-4">
        <div className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
          <Layers className="w-3 h-3" />
          {t('modal.lr.tonal_zones')}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {zones.map(({ key, data, color, borderColor }) => {
            if (!data) return null;
            const isActive = activeZone === key;
            const zoneLabel = key === 'highlights' ? t('modal.lr.zone_highlights') 
                           : key === 'midtones' ? t('modal.lr.zone_midtones') 
                           : t('modal.lr.zone_shadows');
            
            return (
              <div
                key={key}
                className={cn(
                  "relative p-2 rounded border cursor-pointer transition-all duration-300",
                  color,
                  isActive ? `${borderColor} border-2 scale-[1.02]` : "border-white/10 hover:border-white/20"
                )}
                onClick={() => setActiveZone(isActive ? null : key as any)}
                onMouseEnter={() => onHover(`${zoneLabel}: ${data.elements}`)}
                onMouseLeave={() => onHover(null)}
              >
                {/* 目标 RGB 颜色预览 */}
                {data.target_rgb && (
                  <div 
                    className="absolute top-1 right-1 w-3 h-3 rounded-full border border-white/30"
                    style={{ backgroundColor: `rgb(${data.target_rgb.r}, ${data.target_rgb.g}, ${data.target_rgb.b})` }}
                  />
                )}
                
                <div className="text-[8px] font-bold text-white/90 uppercase tracking-wider mb-1">
                  {zoneLabel}
                </div>
                
                {isActive && (
                  <div className="mt-2 space-y-1 text-[7px] text-white/70">
                    <div><span className="text-blue-400">{t('modal.lr.zone_elements')}:</span> {data.elements}</div>
                    <div><span className="text-blue-400">{t('modal.lr.zone_color')}:</span> {data.color_treatment}</div>
                    <div><span className="text-blue-400">{t('modal.lr.zone_detail')}:</span> {data.detail_treatment}</div>
                    {data.target_rgb && (
                      <div><span className="text-blue-400">{t('modal.lr.zone_target_rgb')}:</span> R{data.target_rgb.r} G{data.target_rgb.g} B{data.target_rgb.b}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 如果没有蒙版数据
  if (masks.length === 0 && !tonalZones) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-white/30">
        <Target className="w-8 h-8 mb-2 opacity-30" />
        <span className="text-[10px] font-mono uppercase tracking-wider">
          {t('modal.lr.no_masks')}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2">
      {/* 影调分区分析 */}
      {renderTonalZones()}

      {/* 蒙版列表 */}
      {masks.length > 0 && (
        <div>
          <div className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Target className="w-3 h-3" />
            {t('modal.lr.masks')} ({masks.length})
          </div>
          
          <div className="space-y-2">
            {masks.map((mask, index) => {
              const typeInfo = getMaskTypeInfo(mask.mask_type);
              const isExpanded = expandedMask === index;
              const adjustmentEntries = Object.entries(mask.adjustments).filter(([_, v]) => v && v !== '0');

              return (
                <div
                  key={mask.mask_id || index}
                  className={cn(
                    "relative rounded border transition-all duration-300 overflow-hidden",
                    `bg-gradient-to-r ${typeInfo.color}`,
                    isExpanded ? "border-blue-500/50" : "border-white/10 hover:border-white/20"
                  )}
                >
                  {/* 蒙版头部 */}
                  <div
                    className="flex items-center gap-2 p-2 cursor-pointer"
                    onClick={() => setExpandedMask(isExpanded ? null : index)}
                    onMouseEnter={() => onHover(mask.reason)}
                    onMouseLeave={() => onHover(null)}
                  >
                    <span className="text-lg">{typeInfo.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-white/90 truncate">
                        {mask.mask_name}
                      </div>
                      <div className="text-[8px] text-white/50 truncate">
                        {mask.mask_target}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] text-white/40 font-mono">
                        {adjustmentEntries.length} adj
                      </span>
                      <ChevronRight 
                        className={cn(
                          "w-3 h-3 text-white/40 transition-transform duration-300",
                          isExpanded && "rotate-90"
                        )} 
                      />
                    </div>
                  </div>

                  {/* 展开的详细内容 */}
                  {isExpanded && (
                    <div className="px-2 pb-2 border-t border-white/10">
                      {/* 蒙版参数 */}
                      {mask.mask_parameters && (
                        <div className="mt-2 p-2 bg-black/20 rounded text-[8px] font-mono text-white/60">
                          <div className="text-[7px] text-blue-400 uppercase mb-1">{t('modal.lr.mask_type')}: {typeInfo.label}</div>
                          {mask.mask_parameters.luminosity_range && (
                            <div>Luminosity: {mask.mask_parameters.luminosity_range.min}-{mask.mask_parameters.luminosity_range.max}</div>
                          )}
                          {mask.mask_parameters.gradient && (
                            <div>Gradient: {mask.mask_parameters.gradient.start_y_percent}% → {mask.mask_parameters.gradient.end_y_percent}%</div>
                          )}
                        </div>
                      )}

                      {/* 调整参数 */}
                      <div className="mt-2">
                        <div className="text-[7px] text-blue-400 uppercase mb-1">{t('modal.lr.mask_adjustments')}</div>
                        <div className="flex flex-wrap gap-1">
                          {adjustmentEntries.map(([key, value]) => {
                            const { label } = formatAdjustment(key, value as string);
                            const numValue = parseFloat(value as string);
                            const isPositive = numValue > 0;
                            return (
                              <span
                                key={key}
                                className={cn(
                                  "px-1.5 py-0.5 rounded text-[8px] font-mono",
                                  isPositive ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                                )}
                              >
                                {label} {value}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* 原因说明 */}
                      <div className="mt-2 p-2 bg-blue-500/10 rounded border-l-2 border-blue-500/50">
                        <div className="text-[7px] text-blue-400 uppercase mb-0.5">{t('modal.lr.mask_reason')}</div>
                        <div className="text-[9px] text-white/70 leading-relaxed">
                          {mask.reason}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
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

export const LightroomPanel: React.FC<LightroomPanelProps> = ({ data, userImageUrl, refImageUrl, taskId: propTaskId }) => {
  const { t } = useLanguage();
  const [activeLog, setActiveLog] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>('basic');
  
  // ============================================================================
  // 【预览模式状态】控制是否显示实时预览分屏
  // ============================================================================
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [enableAces, setEnableAces] = useState<boolean>(false); // 【新增】ACES 电影级色调映射开关
  
  // ============================================================================
  // 【高保真渲染状态】使用 Darktable CLI 进行高质量渲染
  // ============================================================================
  const [isHiFiRendering, setIsHiFiRendering] = useState<boolean>(false); // 是否正在渲染
  const [hiFiAvailable, setHiFiAvailable] = useState<boolean>(false); // 服务是否可用
  const [hiFiRenderedUrl, setHiFiRenderedUrl] = useState<string | null>(null); // 渲染结果 URL
  const [showHiFiResult, setShowHiFiResult] = useState<boolean>(false); // 是否显示高保真结果
  
  // ============================================================================
  // 【新增】对比模式状态 - 控制预览图与参考图的对比显示方式
  // ============================================================================
  const [compareMode, setCompareMode] = useState<'none' | 'split' | 'slider'>('none');
  const [sliderPosition, setSliderPosition] = useState<number>(50); // 滑块位置百分比
  
  // 【调试】监控高保真渲染状态变化
  React.useEffect(() => {
    console.log('[LightroomPanel] 高保真渲染状态变化:', {
      showHiFiResult,
      hiFiRenderedUrl,
      compareMode
    });
  }, [showHiFiResult, hiFiRenderedUrl, compareMode]);
  
  // ============================================================================
  // 【Solo 模式状态】支持多选 - 使用 Set 存储选中的图层
  // ============================================================================
  const [soloLayers, setSoloLayers] = useState<Set<string>>(new Set());
  
  // ============================================================================
  // 【迭代调色反馈状态】用于用户与 Gemini 的迭代调色对话
  // ============================================================================
  const [iterationFeedback, setIterationFeedback] = useState<string>(''); // 用户反馈文本
  const [isIterating, setIsIterating] = useState<boolean>(false); // 是否正在迭代中
  const [iterationHistory, setIterationHistory] = useState<Array<{
    id: number;
    iterationNumber: number;
    userFeedback: string;
    suggestions: string[];
    status: string;
    createdAt: string;
  }>>([]); // 迭代历史记录
  const [showIterationHistory, setShowIterationHistory] = useState<boolean>(false); // 是否显示历史记录
  const [iterationResult, setIterationResult] = useState<{
    suggestions: string[];
    newParameters: any;
    selfCritique: any;
  } | null>(null); // 最新迭代结果
  const previewCanvasRef = useRef<LivePreviewCanvasRef>(null); // 【修复】预览画布引用，用于截图（使用正确的类型）
  
  // 【新增】迭代参数覆盖状态 - 用于自动应用 AI 返回的新参数到预览
  const [iterationOverrideParams, setIterationOverrideParams] = useState<{
    white_balance?: { temperature?: { value: string }, tint?: { value: string } };
    basic_panel?: Record<string, { val: string }>;
    color_grading_wheels?: { highlights?: any, midtones?: any, shadows?: any, balance?: string };
    hsl_adjustments?: Record<string, { h: string, s: string, l: string }>;
    tone_curve?: { rgb_points?: number[][] };
  } | null>(null);
  
  // 【直方图预测状态】将在 safeData 定义后初始化
  // 参见下方 baseHistogram 的定义
  
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
  
  // ============================================================================
  // 【Solo 模式切换】点击调整项时切换 Solo 模式（支持多选）
  // ============================================================================
  const handleSoloToggle = useCallback((layerKey: string) => {
    console.log('[LightroomPanel] handleSoloToggle 调用:', { layerKey, previewMode });
    if (!previewMode) {
      console.log('[LightroomPanel] 非预览模式，忽略点击');
      return; // 非预览模式下不触发
    }
    setSoloLayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(layerKey)) {
        newSet.delete(layerKey); // 已选中则取消
        console.log('[LightroomPanel] 取消选中:', layerKey);
      } else {
        newSet.add(layerKey); // 未选中则添加
        console.log('[LightroomPanel] 选中:', layerKey);
      }
      console.log('[LightroomPanel] 当前 soloLayers:', Array.from(newSet));
      return newSet;
    });
  }, [previewMode]);
  
  // 【辅助函数】检查某个图层是否处于 Solo 模式
  const isSoloActive = useCallback((layerKey: string): boolean => {
    return soloLayers.has(layerKey);
  }, [soloLayers]);
  
  // 【辅助函数】检查是否有任何图层处于 Solo 模式
  const hasAnySolo = useMemo(() => soloLayers.size > 0, [soloLayers]);
  
  // ============================================================================
  // 【高保真渲染处理函数】使用 Darktable CLI 生成高质量预览
  // ============================================================================
  
  // 检查高保真渲染服务可用性
  React.useEffect(() => {
    const checkHiFiAvailability = async () => {
      try {
        const available = await hifiRenderService.getAvailability();
        setHiFiAvailable(available);
        console.log('[LightroomPanel] 高保真渲染服务可用性:', available);
      } catch (error) {
        console.warn('[LightroomPanel] 检查高保真渲染服务失败:', error);
        setHiFiAvailable(false);
      }
    };
    checkHiFiAvailability();
  }, []);
  
  // 【注意】handleHiFiRender 函数定义在 filterParams 之后，见下方
  
  // ============================================================================
  // 【迭代调色反馈处理函数】
  // ============================================================================
  
  // 获取当前任务 ID（优先使用 props，其次从 sessionStorage 读取）
  const getTaskId = useCallback((): string | null => {
    // 优先使用 props 传入的 taskId
    if (propTaskId) {
      return propTaskId;
    }
    // 如果没有 props，则从 sessionStorage 读取
    try {
      const taskId = sessionStorage.getItem('current_task_id');
      if (taskId) {
        console.log('[LightroomPanel] 从 sessionStorage 读取 taskId:', taskId);
        return taskId;
      }
    } catch (e) {
      console.warn('[LightroomPanel] 从 sessionStorage 读取 taskId 失败:', e);
    }
    return null;
  }, [propTaskId]);
  
  // 【修复】使用统一的 API 客户端，不再需要单独的 getAuthToken 函数
  // 因为 apiClient 内部已经处理了认证
  
  /**
   * 提交迭代反馈
   * 用户在 LR 面板中输入反馈后，调用此函数提交给后端进行重新分析
   */
  const handleIterationSubmit = useCallback(async () => {
    // 【参数验证】检查反馈文本是否为空
    if (!iterationFeedback.trim()) {
      setActiveLog(t('modal.lr.iteration_feedback_empty') || '请输入您的反馈意见');
      return;
    }
    
    // 【参数验证】获取任务 ID
    const taskId = getTaskId();
    if (!taskId) {
      console.error('[LightroomPanel] 无法获取 taskId');
      setActiveLog(t('modal.lr.task_id_missing') || '无法获取任务 ID，请刷新页面重试');
      return;
    }
    
    // 【修复】检查认证状态（通过尝试获取 token）
    const token = getAuthToken();
    if (!token) {
      console.error('[LightroomPanel] 未检测到认证 token');
      setActiveLog(t('modal.lr.please_login') || '请先登录');
      return;
    }
    
    console.log('[LightroomPanel] 开始提交迭代反馈:', {
      taskId,
      feedbackLength: iterationFeedback.trim().length,
      hasPreviewMode: previewMode,
    });
    
    setIsIterating(true);
    setActiveLog(t('modal.lr.analyzing') || '正在分析您的反馈，请稍候...');
    
    try {
      // 【功能】截取预览图（如果预览模式开启）
      // 预览图用于帮助 Gemini 理解用户当前调整后的效果
      let previewImageData: string | undefined;
      if (previewMode && previewCanvasRef.current) {
        try {
          // 【修复】通过 ref 的 getCanvas 方法获取 canvas 元素
          const canvas = previewCanvasRef.current.getCanvas();
          if (canvas) {
            previewImageData = canvas.toDataURL('image/jpeg', 0.8);
            console.log('[LightroomPanel] 预览图截取成功，大小:', previewImageData.length, '字符');
          } else {
            console.warn('[LightroomPanel] canvas 元素不存在，无法截取预览图');
          }
        } catch (e) {
          console.warn('[LightroomPanel] 截取预览图失败:', e);
          // 预览图截取失败不影响主流程，继续提交反馈
        }
      }
      
      // 【API 调用】使用统一的 API 客户端调用迭代接口
      // 使用 api.analyze.iterate 而不是直接使用 fetch，确保：
      // 1. 使用正确的 API base URL
      // 2. 统一的错误处理
      // 3. 统一的认证处理
      // 4. 统一的日志记录
      const result = await api.analyze.iterate({
        taskId,
        userFeedback: iterationFeedback.trim(),
        previewImageData,
      }) as {
        iterationId: number;
        iterationNumber: number;
        suggestions: string[];
        newParameters: any;
        selfCritique: any;
        parameterChanges: any;
        processingTime: number;
      };
      
      console.log('[LightroomPanel] 迭代反馈提交成功:', {
        iterationId: result.iterationId,
        iterationNumber: result.iterationNumber,
        suggestionsCount: result.suggestions?.length || 0,
      });
      
      // 【数据处理】保存迭代结果到状态
      setIterationResult({
        suggestions: result.suggestions || [],
        newParameters: result.newParameters,
        selfCritique: result.selfCritique,
      });
      
      // 【新增】自动应用 AI 返回的新参数到预览
      // 这样用户可以立即看到 AI 建议的调整效果
      if (result.newParameters) {
        console.log('[LightroomPanel] 自动应用 AI 返回的新参数:', result.newParameters);
        setIterationOverrideParams(result.newParameters);
        
        // 【重要】同时打开预览模式，让用户看到效果
        if (!previewMode) {
          setPreviewMode(true);
        }
        
        // 【重要】选中所有图层以显示完整效果
        const allLayers = new Set([
          'temperature', 'tint',
          'exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks',
          'saturation', 'vibrance',
          'shadowTint', 'midtoneTint', 'highlightTint', 'gradingBalance',
          'hslRed', 'hslOrange', 'hslYellow', 'hslGreen', 'hslCyan', 'hslBlue', 'hslPurple', 'hslMagenta',
          'curve'
        ]);
        setSoloLayers(allLayers);
      }
      
      // 【UI 更新】清空输入框
      setIterationFeedback('');
      
      // 【UI 更新】更新日志显示
      const suggestionsText = result.suggestions?.slice(0, 2).join('; ') || (t('modal.lr.analysis_complete') || '分析完成');
      setActiveLog(`${t('modal.lr.iteration_complete') || '迭代'} #${result.iterationNumber} ${t('modal.lr.complete') || '完成'}: ${suggestionsText}`);
      
      // 【数据同步】刷新历史记录
      fetchIterationHistory();
    } catch (error: any) {
      // 【错误处理】记录详细错误信息
      console.error('[LightroomPanel] 迭代失败:', {
        errorType: error?.name,
        errorMessage: error?.message,
        errorCode: error?.code,
        fullError: error,
      });
      
      // 【用户提示】显示友好的错误信息
      let errorMessage = error?.message || (t('modal.lr.iteration_failed') || '迭代失败');
      if (error?.code === 'TIMEOUT_ERROR') {
        errorMessage = t('modal.lr.iteration_timeout') || '迭代请求超时，请稍后重试';
      } else if (error?.code === 'NETWORK_ERROR') {
        errorMessage = t('modal.lr.network_error') || '网络连接失败，请检查网络设置';
      }
      setActiveLog(`${t('modal.lr.iteration_failed') || '迭代失败'}: ${errorMessage}`);
    } finally {
      setIsIterating(false);
    }
  }, [iterationFeedback, previewMode, getTaskId, t]);
  
  /**
   * 获取迭代历史记录
   * 从后端获取当前任务的所有迭代记录，用于显示历史列表
   */
  const fetchIterationHistory = useCallback(async () => {
    const taskId = getTaskId();
    
    // 【参数验证】检查任务 ID
    if (!taskId) {
      console.warn('[LightroomPanel] 无法获取 taskId，跳过历史记录获取');
      return;
    }
    
    // 【认证检查】检查是否已登录
    const token = getAuthToken();
    if (!token) {
      console.warn('[LightroomPanel] 未检测到认证 token，跳过历史记录获取');
      return;
    }
    
    try {
      console.log('[LightroomPanel] 开始获取迭代历史记录:', { taskId });
      
      // 【API 调用】使用统一的 API 客户端
      const result = await api.analyze.getIterations(taskId) as {
        taskId: string;
        totalIterations: number;
        iterations: Array<{
          id: number;
          iterationNumber: number;
          userFeedback: string;
          suggestions: string[];
          status: string;
          createdAt: string;
        }>;
      };
      
      console.log('[LightroomPanel] 迭代历史记录获取成功:', {
        totalIterations: result.totalIterations,
        iterationsCount: result.iterations?.length || 0,
      });
      
      // 【数据处理】更新历史记录状态
      if (result.iterations) {
        setIterationHistory(result.iterations);
      }
    } catch (error: any) {
      // 【错误处理】历史记录获取失败不影响主功能，只记录警告
      console.warn('[LightroomPanel] 获取迭代历史失败:', {
        errorType: error?.name,
        errorMessage: error?.message,
        errorCode: error?.code,
      });
    }
  }, [getTaskId]);
  
  // 组件挂载时获取迭代历史
  React.useEffect(() => {
    fetchIterationHistory();
  }, [fetchIterationHistory]);
  
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
  // 【修复】移除重复的展开操作，避免 TypeScript 警告
  // 【辅助函数】从 HSL 数据中提取调整值（移到组件顶层，供 JSX 使用）
  // 【修复】增强解析逻辑，支持字符串格式（如 "+10"、"-5"）和数字格式
  const getHslValue = useCallback((colorData: any, field: 'h' | 's' | 'l'): number => {
    if (!colorData) return 0;
    
    // 【修复】根据字段名获取原始值
    let rawValue: any;
    if (field === 'h') {
      rawValue = colorData.hue !== undefined ? colorData.hue : (colorData.h !== undefined ? colorData.h : 0);
    } else if (field === 's') {
      rawValue = colorData.saturation !== undefined ? colorData.saturation : (colorData.s !== undefined ? colorData.s : 0);
    } else if (field === 'l') {
      rawValue = colorData.luminance !== undefined ? colorData.luminance : (colorData.l !== undefined ? colorData.l : 0);
    } else {
      return 0;
    }
    
    // 【修复】如果原始值是数字，直接返回
    if (typeof rawValue === 'number') return rawValue;
    
    // 【修复】如果原始值是字符串，解析它（支持 "+10"、"-5"、"0" 等格式）
    if (typeof rawValue === 'string') {
      const str = rawValue.trim();
      // 处理 "+0"、"-0"、"0" 等特殊情况
      if (str === "+0" || str === "-0" || str === "0" || str === "") return 0;
      // 使用正则表达式提取数字部分
      const numberMatch = str.match(/^([+-]?)(\d+\.?\d*)$/);
      if (numberMatch) {
        const sign = numberMatch[1]; // "+"、"-" 或 ""
        const number = parseFloat(numberMatch[2]);
        if (isNaN(number)) return 0;
        // 如果有符号，应用符号；否则返回解析后的数字
        if (sign === '+') return Math.abs(number);
        if (sign === '-') return -Math.abs(number);
        return number;
      }
      // 【向后兼容】如果正则匹配失败，尝试直接解析
      const parsed = parseFloat(str.replace(/[^0-9.-]/g, '') || '0');
      if (isNaN(parsed)) return 0;
      // 如果字符串以 '+' 开头，返回正数；如果以 '-' 开头，返回负数；否则返回解析后的值
      if (str.startsWith('+')) return Math.abs(parsed);
      if (str.startsWith('-')) return -Math.abs(parsed);
      return parsed;
    }
    
    // 【修复】如果原始值是 null 或 undefined，返回 0
    if (rawValue === null || rawValue === undefined) return 0;
    
    // 【修复】其他类型，尝试转换为数字
    const parsed = parseFloat(String(rawValue)) || 0;
    return isNaN(parsed) ? 0 : parsed;
  }, []);
  
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
  
  // ============================================================================
  // 【直方图预测】根据调整参数预测直方图变化
  // 基础直方图来自 Gemini 分析的原图数据
  // 预测直方图根据用户选择的调整参数计算
  // ============================================================================
  const baseHistogram = useMemo(() => {
    return {
      r: data.simulated_histogram?.histogram_data?.r || safeData.histogram.r || [],
      g: data.simulated_histogram?.histogram_data?.g || safeData.histogram.g || [],
      b: data.simulated_histogram?.histogram_data?.b || safeData.histogram.b || [],
      l: data.simulated_histogram?.histogram_data?.l || safeData.histogram.l || [],
    };
  }, [data.simulated_histogram, safeData.histogram]);
  
  // ============================================================================
  // 【预览参数转换】将 Lightroom 数据转换为 ImageEngine 的 FilterParams
  // 用于实时预览功能，将 Gemini 输出的调整参数映射到 WebGL 渲染引擎
  // 【重要】现在支持：基础调整、色彩分级、HSL、曲线
  // 【新增】支持迭代参数覆盖：AI 返回的新参数会自动应用到预览
  // ============================================================================
  const filterParams: FilterParams = useMemo(() => {
    // 从 basic_panel 提取参数值（处理不同格式）
    const getParamValue = (param: any): number => {
      if (typeof param === 'number') return param;
      if (param?.value !== undefined) return param.value;
      return 0;
    };
    
    // 【新增】从迭代参数提取值（支持字符串格式如 "+10"、"-5"）
    const getIterationParamValue = (paramObj: any): number | null => {
      if (!paramObj) return null;
      const val = paramObj.val || paramObj.value;
      if (val === undefined || val === null) return null;
      if (typeof val === 'number') return val;
      // 处理字符串格式，支持 "+10"、"-5"、"0" 等
      const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, '') || '0');
      return isNaN(parsed) ? null : (String(val).startsWith('+') ? parsed : (String(val).startsWith('-') ? -Math.abs(parsed) : parsed));
    };
    
    // 【注意】getHslValue 函数已在组件顶层定义（使用 useCallback），这里直接使用
    
    // 【新增】从迭代 HSL 参数中提取值
    const getIterationHslValue = (colorData: any, field: 'h' | 's' | 'l'): number | null => {
      if (!colorData) return null;
      const val = colorData[field];
      if (val === undefined || val === null) return null;
      if (typeof val === 'number') return val;
      const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, '') || '0');
      return isNaN(parsed) ? null : (String(val).startsWith('+') ? parsed : (String(val).startsWith('-') ? -Math.abs(parsed) : parsed));
    };
    
    // 【调试】打印迭代覆盖参数
    if (iterationOverrideParams) {
      console.log('[LightroomPanel] 🔄 应用迭代覆盖参数:', iterationOverrideParams);
    }
    
    // 【调试】打印原始数据
    console.log('[LightroomPanel] 构建 filterParams，原始 basic_panel:', data.basic_panel);
    console.log('[LightroomPanel] 构建 filterParams，safeBasicPanel:', {
      temp: safeBasicPanel.temp,
      tint: safeBasicPanel.tint,
      whites: safeBasicPanel.whites,
      blacks: safeBasicPanel.blacks,
      whites_value: getParamValue(safeBasicPanel.whites),
      blacks_value: getParamValue(safeBasicPanel.blacks),
    });
    console.log('[LightroomPanel] getParamValue 结果:', {
      temp_value: getParamValue(safeBasicPanel.temp),
      tint_value: getParamValue(safeBasicPanel.tint),
      temp_converted: ((getParamValue(safeBasicPanel.temp) || 5500) - 5500) / 25,
    });
    
    // 获取 HSL 数据（使用 any 类型避免类型检查问题）
    const hslData = data.hsl as any;
    const curveData = safeData.curve as any;
    
    // 【调试日志】详细记录 data.hsl 的完整内容
    console.log('[LightroomPanel] 🔍 data.hsl 完整检查:', {
      hasDataHsl: !!data.hsl,
      dataHslType: typeof data.hsl,
      dataHslKeys: data.hsl ? Object.keys(data.hsl) : [],
      dataHslFull: data.hsl, // 完整对象
    });
    
    // 【调试日志】详细记录每个颜色通道的完整数据
    if (hslData) {
      const colorChannels = ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'];
      colorChannels.forEach(colorKey => {
        const colorData = hslData[colorKey];
        if (colorData) {
          console.log(`[LightroomPanel] 🔍 HSL 通道 ${colorKey} 完整数据:`, {
            colorData,
            colorDataKeys: Object.keys(colorData),
            hue: colorData.hue,
            hueType: typeof colorData.hue,
            saturation: colorData.saturation,
            saturationType: typeof colorData.saturation,
            luminance: colorData.luminance,
            luminanceType: typeof colorData.luminance,
            // 【新增】检查是否有其他可能的字段名
            h: colorData.h,
            s: colorData.s,
            l: colorData.l,
            // 【新增】检查 getHslValue 的返回值
            getHslValue_h: getHslValue(colorData, 'h'),
            getHslValue_s: getHslValue(colorData, 's'),
            getHslValue_l: getHslValue(colorData, 'l'),
          });
        } else {
          console.log(`[LightroomPanel] ⚠️ HSL 通道 ${colorKey} 不存在`);
        }
      });
    }
    
    // 构建完整参数
    // 【修复】从正确的数据源获取色温和色调
    // data.white_balance 是 UI 显示的数据源（包含实际的色温值如 5485K）
    // data.basic_panel 可能没有正确的色温值
    console.log('[LightroomPanel] data.white_balance:', data.white_balance);
    console.log('[LightroomPanel] data.white_balance?.temp:', data.white_balance?.temp);
    
    // 【修复】确保获取数值类型
    // 【重要】优先使用 data.white_balance（数据适配器已从 basic_panel 提取并转换）
    // 【修复】色温值提取逻辑（与 ColorModal 保持一致）：
    // 1. 如果有实际色温值（value 不为 null），使用该值
    // 2. 如果没有实际色温值（value 为 null），使用调整值（adjustment 或从 range 解析）
    // 3. 不再假设所有照片都是 5500K
    let tempValue: number | null = null;
    let tempAdjustment: number = 0;
    
    if (data.white_balance?.temp?.value !== undefined && data.white_balance.temp.value !== null) {
      // 有实际色温值（已计算好的最终色温）
      tempValue = typeof data.white_balance.temp.value === 'number' 
        ? data.white_balance.temp.value 
        : parseFloat(data.white_balance.temp.value) || null;
      console.log('[LightroomPanel] ✅ 从 data.white_balance 获取色温值（实际值）:', tempValue);
    } else if (data.white_balance?.temp?.adjustment !== undefined) {
      // 没有实际色温值，但有调整值
      tempAdjustment = data.white_balance.temp.adjustment;
      console.log('[LightroomPanel] ⚠️ 只有调整值，没有实际色温值:', tempAdjustment);
    } else if (data.white_balance?.temp?.range) {
      // 从 range 字符串解析调整值
      const rangeStr = data.white_balance.temp.range;
      tempAdjustment = parseFloat(rangeStr.replace(/[^0-9.-]/g, '') || "0");
      console.log('[LightroomPanel] ⚠️ 从 range 解析调整值:', tempAdjustment);
    } else if (safeBasicPanel.temp?.value !== undefined) {
      // 【备用方案】如果 white_balance 不存在，从 basic_panel 提取
      const tempRelative = typeof safeBasicPanel.temp.value === 'number'
        ? safeBasicPanel.temp.value
        : parseFloat(safeBasicPanel.temp.value) || 0;
      tempAdjustment = tempRelative;
      console.log('[LightroomPanel] ⚠️ 从 safeBasicPanel 获取调整值:', tempAdjustment);
    }
    
    // 【调试日志】记录最终值
    console.log('[LightroomPanel] 色温值提取结果:', { 
      tempValue, 
      tempAdjustment, 
      hasActualValue: tempValue !== null,
      willShowAdjustment: tempValue === null,
    });
    
    let tintValue = 0;
    if (data.white_balance?.tint?.value !== undefined) {
      tintValue = typeof data.white_balance.tint.value === 'number'
        ? data.white_balance.tint.value
        : parseFloat(data.white_balance.tint.value) || 0;
      console.log('[LightroomPanel] ✅ 从 data.white_balance 获取色调值:', tintValue);
    } else if (safeBasicPanel.tint?.value !== undefined) {
      // 【备用方案】如果 white_balance 不存在，从 basic_panel 提取（tint 是相对值，直接使用）
      tintValue = typeof safeBasicPanel.tint.value === 'number'
        ? safeBasicPanel.tint.value
        : parseFloat(safeBasicPanel.tint.value) || 0;
      console.log('[LightroomPanel] ⚠️ 从 safeBasicPanel 获取色调值:', tintValue);
    }
    
    console.log('[LightroomPanel] 最终色温/色调值:', { tempValue, tintValue, whiteBalance: data.white_balance, basicPanelTemp: safeBasicPanel.temp, basicPanelTint: safeBasicPanel.tint });
    
    // 【新增】迭代覆盖参数提取
    const iterBasic = iterationOverrideParams?.basic_panel;
    const iterWb = iterationOverrideParams?.white_balance;
    const iterGrading = iterationOverrideParams?.color_grading_wheels;
    const iterHsl = iterationOverrideParams?.hsl_adjustments;
    const iterCurve = iterationOverrideParams?.tone_curve;
    
    // 【新增】计算迭代覆盖后的色温值
    // 【修复】如果 tempValue 是 null（只有调整值），迭代覆盖应该基于调整值
    let finalTempValue: number | null = tempValue;
    if (iterWb?.temperature?.value) {
      const iterTempVal = getIterationParamValue({ val: iterWb.temperature.value });
      if (iterTempVal !== null) {
        if (tempValue !== null && tempValue !== undefined && Math.abs(tempValue) > 1000) {
          // 有实际色温值：迭代参数是相对变化值，需要加到当前值上
          finalTempValue = tempValue + (iterTempVal * 50); // 假设 "+1" 表示 +50K
          console.log('[LightroomPanel] 迭代覆盖色温（实际值）:', { 原值: tempValue, 迭代值: iterTempVal, 最终值: finalTempValue });
        } else {
          // 只有调整值：迭代参数直接加到调整值上
          finalTempValue = (tempAdjustment || 0) + iterTempVal;
          console.log('[LightroomPanel] 迭代覆盖色温（调整值）:', { 原调整值: tempAdjustment, 迭代值: iterTempVal, 最终值: finalTempValue });
        }
      }
    }
    
    let finalTintValue = tintValue;
    if (iterWb?.tint?.value) {
      const iterTintVal = getIterationParamValue({ val: iterWb.tint.value });
      if (iterTintVal !== null) {
        finalTintValue = tintValue + iterTintVal;
        console.log('[LightroomPanel] 迭代覆盖色调:', { 原值: tintValue, 迭代值: iterTintVal, 最终值: finalTintValue });
      }
    }

    // 【新增】安全检查逻辑 (Safety Clamps) - 基于 Implementation Specification
    // 1. 获取量化分析数据
    const userMetrics = data.meta?.image_analysis?.user;
    const lumaMean = userMetrics?.histogram?.avg_luminance ?? 128;
    
    // 2. 判断场景类型 (用于肤色保护)
    // 尝试从多个字段获取场景描述
    const sceneDesc = (
      data.color?.scene_type || 
      data.analysis?.scene_type || 
      data.phase_1_extraction?.master_style_recap || 
      ""
    ).toLowerCase();
    const isPortrait = sceneDesc.includes('portrait') || sceneDesc.includes('人像') || sceneDesc.includes('people');

    console.log('[LightroomPanel] 安全检查初始化:', { lumaMean, isPortrait, sceneDesc });
    
    const fullParams: FilterParams = {
      // 【新增】高级渲染选项
      enableAces: enableAces,

      // ===== 基础调整（支持迭代覆盖 + SOLO 模式）=====
      // 【修复】所有基础参数都支持 SOLO 模式
      // 当 SOLO 模式激活时，只显示被 SOLO 的参数效果，其他参数归零
      
      // 曝光：优先使用迭代参数
      // 【Safety Check 1: Auto-Exposure Override】
      exposure: (() => {
        // 【SOLO 模式】如果有其他参数被 SOLO 且当前参数未被 SOLO，则归零
        if (hasAnySolo && !soloLayers.has('exposure')) return 0;
        
        let rawVal = getIterationParamValue(iterBasic?.exposure) ?? getParamValue(safeBasicPanel.exposure);
        // 如果全图平均亮度极低 (< 50/255)，强制曝光补偿至少 +1.0 EV
        if (lumaMean < 50) {
           const minExposure = 1.0;
           if (rawVal < minExposure) {
             console.log(`[Safety Clamp] 触发自动曝光补偿: lumaMean=${lumaMean}, 原值=${rawVal}, 修正为=${minExposure}`);
             rawVal = minExposure;
           }
        }
        return rawVal / 20;
      })(),
      // 【安全限制】对比度限制在 -50 到 +50，防止死黑/死白
      // 【SOLO 模式】
      contrast: (hasAnySolo && !soloLayers.has('contrast')) ? 0 : 
        Math.max(-50, Math.min(50, getIterationParamValue(iterBasic?.contrast) ?? getParamValue(safeBasicPanel.contrast))),
      // 高光【SOLO 模式】
      highlights: (hasAnySolo && !soloLayers.has('highlights')) ? 0 : 
        (getIterationParamValue(iterBasic?.highlights) ?? getParamValue(safeBasicPanel.highlights)),
      // 阴影【SOLO 模式】
      shadows: (hasAnySolo && !soloLayers.has('shadows')) ? 0 : 
        (getIterationParamValue(iterBasic?.shadows) ?? getParamValue(safeBasicPanel.shadows)),
      // 白色【SOLO 模式】
      whites: (hasAnySolo && !soloLayers.has('whites')) ? 0 : 
        (getIterationParamValue(iterBasic?.whites) ?? getParamValue(safeBasicPanel.whites)),
      // 【安全限制】黑点限制在 -60 到 +100，防止过度死黑
      // 【SOLO 模式】
      blacks: (hasAnySolo && !soloLayers.has('blacks')) ? 0 : 
        Math.max(-60, Math.min(100, getIterationParamValue(iterBasic?.blacks) ?? getParamValue(safeBasicPanel.blacks))),
      // 色温【SOLO 模式】
      // 【修复】如果 finalTempValue 是 null（只有调整值），使用调整值；否则使用实际色温值
      temperature: (hasAnySolo && !soloLayers.has('temperature')) ? 0 : (
        finalTempValue !== null && finalTempValue !== undefined && Math.abs(finalTempValue) > 1000
          ? (finalTempValue - 5500) / 25  // 实际色温值：转换为相对值用于渲染
          : (tempAdjustment || 0) / 25    // 只有调整值：直接使用调整值
      ),
      // 色调【SOLO 模式】
      tint: (hasAnySolo && !soloLayers.has('tint')) ? 0 : finalTintValue,
      // 【Safety Check 3: Dynamic Range Clamp】
      // 饱和度限制在 -40 到 +40 (用户指定)，防止色彩溢出
      // 【SOLO 模式】
      saturation: (hasAnySolo && !soloLayers.has('saturation')) ? 0 : 
        Math.max(-40, Math.min(40, getIterationParamValue(iterBasic?.saturation) ?? getParamValue(safeBasicPanel.saturation))),
      // 自然饱和度【SOLO 模式】
      vibrance: (hasAnySolo && !soloLayers.has('vibrance')) ? 0 : 
        (getIterationParamValue(iterBasic?.vibrance) ?? getParamValue(safeBasicPanel.vibrance)),
      
      // ===== 存在感参数（支持迭代覆盖 + SOLO 模式）=====
      texture: (hasAnySolo && !soloLayers.has('texture')) ? 0 : 
        (getIterationParamValue(iterBasic?.texture) ?? getParamValue(safeBasicPanel.texture)),
      clarity: (hasAnySolo && !soloLayers.has('clarity')) ? 0 : 
        (getIterationParamValue(iterBasic?.clarity) ?? getParamValue(safeBasicPanel.clarity)),
      dehaze: (hasAnySolo && !soloLayers.has('dehaze')) ? 0 : 
        (getIterationParamValue(iterBasic?.dehaze) ?? getParamValue(safeBasicPanel.dehaze)),
      
      // ===== 色彩分级（支持迭代覆盖和 Solo 模式）=====
      // 【修复】如果启用了 Solo 模式，只应用选中的色彩分级参数
      shadowsHue: (hasAnySolo && !soloLayers.has('shadowTint')) ? 0 : ((parseFloat(iterGrading?.shadows?.hue || '0') || data.color_grading?.shadows?.hue) ?? 220),
      shadowsSat: (hasAnySolo && !soloLayers.has('shadowTint')) ? 0 : ((parseFloat(iterGrading?.shadows?.saturation || '0') || data.color_grading?.shadows?.saturation) ?? 15),
      shadowsLum: (hasAnySolo && !soloLayers.has('shadowTint')) ? 0 : ((parseFloat(iterGrading?.shadows?.luminance || '0') || data.color_grading?.shadows?.luminance) ?? 0),  // 【新增】阴影明度
      midtonesHue: (hasAnySolo && !soloLayers.has('midtoneTint')) ? 0 : ((parseFloat(iterGrading?.midtones?.hue || '0') || data.color_grading?.midtones?.hue) ?? 190),
      midtonesSat: (hasAnySolo && !soloLayers.has('midtoneTint')) ? 0 : ((parseFloat(iterGrading?.midtones?.saturation || '0') || data.color_grading?.midtones?.saturation) ?? 10),
      midtonesLum: (hasAnySolo && !soloLayers.has('midtoneTint')) ? 0 : ((parseFloat(iterGrading?.midtones?.luminance || '0') || data.color_grading?.midtones?.luminance) ?? 0),  // 【新增】中间调明度
      highlightsHue: (hasAnySolo && !soloLayers.has('highlightTint')) ? 0 : ((parseFloat(iterGrading?.highlights?.hue || '0') || data.color_grading?.highlights?.hue) ?? 210),
      highlightsSat: (hasAnySolo && !soloLayers.has('highlightTint')) ? 0 : ((parseFloat(iterGrading?.highlights?.saturation || '0') || data.color_grading?.highlights?.saturation) ?? 5),
      highlightsLum: (hasAnySolo && !soloLayers.has('highlightTint')) ? 0 : ((parseFloat(iterGrading?.highlights?.luminance || '0') || data.color_grading?.highlights?.luminance) ?? 0),  // 【新增】高光明度
      gradingBalance: (hasAnySolo && !soloLayers.has('gradingBalance')) ? 0 : ((parseFloat(iterGrading?.balance || '0') || data.color_grading?.balance) ?? -10),
      gradingBlending: data.color_grading?.blending ?? 50,  // 【新增】混合程度
      
      // ===== 相机校准（支持迭代覆盖）=====
      calibration: data.calibration ? {
        redHue: data.calibration.red_primary?.hue ?? 0,
        redSat: data.calibration.red_primary?.saturation ?? 0,
        greenHue: data.calibration.green_primary?.hue ?? 0,
        greenSat: data.calibration.green_primary?.saturation ?? 0,
        blueHue: data.calibration.blue_primary?.hue ?? 0,
        blueSat: data.calibration.blue_primary?.saturation ?? 0,
        shadowsTint: data.calibration.shadows_tint ?? 0,
      } : undefined,
      
      // ===== HSL 调整（支持迭代覆盖）=====
      hsl: {
        red: { 
          h: getIterationHslValue(iterHsl?.red, 'h') ?? getHslValue(hslData?.red, 'h'), 
          s: getIterationHslValue(iterHsl?.red, 's') ?? getHslValue(hslData?.red, 's'), 
          l: getIterationHslValue(iterHsl?.red, 'l') ?? getHslValue(hslData?.red, 'l') 
        },
        orange: { 
          // 【Safety Check 2: Skin Tone Lock】
          h: (() => {
             let h = getIterationHslValue(iterHsl?.orange, 'h') ?? getHslValue(hslData?.orange, 'h');
             if (isPortrait) {
               // 强制 Hue 在 -5 到 +5 之间，防止肤色偏绿/偏紫
               const clamped = Math.max(-5, Math.min(5, h));
               if (h !== clamped) console.log(`[Safety Clamp] 触发肤色 Hue 保护: 原值=${h}, 修正为=${clamped}`);
               return clamped;
             }
             return h;
          })(),
          s: (() => {
             let s = getIterationHslValue(iterHsl?.orange, 's') ?? getHslValue(hslData?.orange, 's');
             if (isPortrait) {
               // 强制 Saturation > -10，防止肤色死灰
               const clamped = Math.max(-10, s);
               if (s !== clamped) console.log(`[Safety Clamp] 触发肤色 Sat 保护: 原值=${s}, 修正为=${clamped}`);
               return clamped;
             }
             return s;
          })(),
          l: getIterationHslValue(iterHsl?.orange, 'l') ?? getHslValue(hslData?.orange, 'l') 
        },
        yellow: { 
          h: getIterationHslValue(iterHsl?.yellow, 'h') ?? getHslValue(hslData?.yellow, 'h'), 
          s: getIterationHslValue(iterHsl?.yellow, 's') ?? getHslValue(hslData?.yellow, 's'), 
          l: getIterationHslValue(iterHsl?.yellow, 'l') ?? getHslValue(hslData?.yellow, 'l') 
        },
        green: { 
          h: getIterationHslValue(iterHsl?.green, 'h') ?? getHslValue(hslData?.green, 'h'), 
          s: getIterationHslValue(iterHsl?.green, 's') ?? getHslValue(hslData?.green, 's'), 
          l: getIterationHslValue(iterHsl?.green, 'l') ?? getHslValue(hslData?.green, 'l') 
        },
        cyan: { 
          h: getIterationHslValue(iterHsl?.cyan, 'h') ?? getHslValue(hslData?.cyan || hslData?.aqua, 'h'), 
          s: getIterationHslValue(iterHsl?.cyan, 's') ?? getHslValue(hslData?.cyan || hslData?.aqua, 's'), 
          l: getIterationHslValue(iterHsl?.cyan, 'l') ?? getHslValue(hslData?.cyan || hslData?.aqua, 'l') 
        },
        blue: { 
          h: getIterationHslValue(iterHsl?.blue, 'h') ?? getHslValue(hslData?.blue, 'h'), 
          s: getIterationHslValue(iterHsl?.blue, 's') ?? getHslValue(hslData?.blue, 's'), 
          l: getIterationHslValue(iterHsl?.blue, 'l') ?? getHslValue(hslData?.blue, 'l') 
        },
        purple: { 
          h: getIterationHslValue(iterHsl?.purple, 'h') ?? getHslValue(hslData?.purple, 'h'), 
          s: getIterationHslValue(iterHsl?.purple, 's') ?? getHslValue(hslData?.purple, 's'), 
          l: getIterationHslValue(iterHsl?.purple, 'l') ?? getHslValue(hslData?.purple, 'l') 
        },
        magenta: { 
          h: getIterationHslValue(iterHsl?.magenta, 'h') ?? getHslValue(hslData?.magenta, 'h'), 
          s: getIterationHslValue(iterHsl?.magenta, 's') ?? getHslValue(hslData?.magenta, 's'), 
          l: getIterationHslValue(iterHsl?.magenta, 'l') ?? getHslValue(hslData?.magenta, 'l') 
        },
      },
      
      // ===== 曲线（支持迭代覆盖）=====
      curve: iterCurve?.rgb_points || curveData?.points_rgb || curveData?.rgb || undefined,
      curveRed: curveData?.points_red || curveData?.red || undefined,
      curveGreen: curveData?.points_green || curveData?.green || undefined,
      curveBlue: curveData?.points_blue || curveData?.blue || undefined,
    };
    
    console.log('[LightroomPanel] 最终 filterParams:', fullParams);
    console.log('[LightroomPanel] Solo 模式状态:', { hasAnySolo, soloLayers: Array.from(soloLayers) });
    
    return fullParams;
  }, [safeBasicPanel, data.color_grading, data.calibration, data.hsl, safeData.curve, iterationOverrideParams, enableAces, hasAnySolo, soloLayers]);
  
  // ============================================================================
  // 【高保真渲染处理函数】在 filterParams 定义之后，确保可以正确访问
  // ============================================================================
  const handleHiFiRender = useCallback(async () => {
    if (!userImageUrl || isHiFiRendering) return;
    
    console.log('[LightroomPanel] 开始高保真渲染...');
    setIsHiFiRendering(true);
    setActiveLog(t('modal.lr.hifi_rendering') || '正在生成高保真预览...');
    
    try {
      // 【修复】优先使用 taskId 获取实际文件路径，避免 blob URL 问题
      // 如果 userImageUrl 是 blob URL，则必须提供 taskId
      let imagePath = userImageUrl || '';
      
      // 检查是否是 blob URL
      const isBlobUrl = imagePath.startsWith('blob:');
      
      // 获取 taskId（优先使用 props，其次从 sessionStorage 读取）
      const currentTaskId = propTaskId || sessionStorage.getItem('current_task_id');
      
      // 如果 userImageUrl 是 blob URL 或无效路径，且没有 taskId，报错
      if ((isBlobUrl || !imagePath) && !currentTaskId) {
        throw new Error('无法获取图片路径。请确保已上传图片并完成分析。');
      }
      
      // 如果不是 blob URL，尝试提取相对路径
      if (!isBlobUrl && imagePath) {
        if (imagePath.includes('/static/uploads/')) {
          imagePath = imagePath.split('/static/uploads/').pop() || imagePath;
        } else if (imagePath.includes('/uploads/')) {
          imagePath = imagePath.split('/uploads/').pop() || imagePath;
        }
      }
      
      // 使用当前计算好的 filterParams（已在 useMemo 中定义）
      // 构建渲染请求（使用当前的 filterParams 和 taskId）
      const request = hifiRenderService.buildRequestFromFilterParams(
        imagePath,
        filterParams,
        currentTaskId // 【修复】传递 taskId，让后端从数据库查询实际文件路径
      );
      
      console.log('[LightroomPanel] 渲染请求:', request);
      
      // 执行渲染
      const response = await hifiRenderService.render(request);
      
      if (response.success && response.rendered_url) {
        console.log('[LightroomPanel] 渲染成功，设置状态:', {
          rendered_url: response.rendered_url,
          will_set_showHiFiResult: true
        });
        setHiFiRenderedUrl(response.rendered_url);
        setShowHiFiResult(true);
        setActiveLog(
          (response.cache_hit 
            ? (t('modal.lr.hifi_cached') || '从缓存加载高保真预览') 
            : (t('modal.lr.hifi_success') || '高保真预览生成完成')) +
          (response.render_time_ms ? ` (${response.render_time_ms}ms)` : '')
        );
      } else {
        setActiveLog(t('modal.lr.hifi_failed') || '高保真渲染失败: ' + response.message);
      }
    } catch (error: any) {
      console.error('[LightroomPanel] 高保真渲染错误:', error);
      setActiveLog(t('modal.lr.hifi_error') || '高保真渲染出错: ' + (error.message || '未知错误'));
    } finally {
      setIsHiFiRendering(false);
    }
  }, [userImageUrl, isHiFiRendering, t, filterParams]); // 依赖 filterParams，确保使用最新值
  
  // ============================================================================
  // 【新增】UI 显示数据：当有迭代覆盖参数时，显示应用后的值
  // 用于在面板上标记 AI 建议的参数值
  // ============================================================================
  const displayData = useMemo(() => {
    // 辅助函数：解析迭代参数值
    const parseIterValue = (val: string | number | undefined, baseValue: number = 0): number => {
      if (val === undefined || val === null) return baseValue;
      if (typeof val === 'number') return baseValue + val;
      const str = String(val);
      const num = parseFloat(str.replace(/[^0-9.-]/g, '') || '0');
      if (str.startsWith('+')) return baseValue + num;
      if (str.startsWith('-')) return baseValue - Math.abs(num);
      return num; // 绝对值
    };
    
    const iterBasic = iterationOverrideParams?.basic_panel;
    const iterWb = iterationOverrideParams?.white_balance;
    const iterGrading = iterationOverrideParams?.color_grading_wheels;
    const iterHsl = iterationOverrideParams?.hsl_adjustments;
    
    // 【修复】原始值提取逻辑：
    // 1. 如果有实际色温值（value 不为 null），使用该值
    // 2. 如果没有实际色温值（value 为 null），使用调整值（adjustment）
    // 3. 不再假设所有照片都是 5500K
    const origTemp = (() => {
      const tempValue = data.white_balance?.temp?.value;
      if (tempValue !== null && tempValue !== undefined) {
        // 有实际色温值
        return typeof tempValue === 'number' ? tempValue : parseFloat(String(tempValue)) || null;
      } else {
        // 没有实际色温值，使用调整值（用于显示）
        const adjustment = data.white_balance?.temp?.adjustment;
        if (adjustment !== undefined) {
          return adjustment; // 返回调整值，前端将显示为相对值
        } else {
          // 从 range 解析调整值
          const rangeStr = data.white_balance?.temp?.range || "+0";
          return parseFloat(rangeStr.replace(/[^0-9.-]/g, '') || "0");
        }
      }
    })();
    const origTint = data.white_balance?.tint?.value ?? 0;
    
    // 是否有迭代覆盖
    const hasOverride = iterationOverrideParams !== null;
    
    // 【修复】确保 white_balance 对象始终存在，即使 data.white_balance 是 undefined
    // 这样前端UI可以始终显示色温色调面板
    const whiteBalanceData = data.white_balance || {
      temp: { value: 5500, range: "+0", reason: "" },
      tint: { value: 0, range: "+0", reason: "" },
    };
    
    return {
      hasOverride, // 标记是否有迭代覆盖
      // 白平衡
      white_balance: {
        temp: {
          value: hasOverride && iterWb?.temperature?.value 
            ? parseIterValue(iterWb.temperature.value, origTemp)
            : origTemp,
          original: origTemp,
          changed: hasOverride && iterWb?.temperature?.value !== undefined,
        },
        tint: {
          value: hasOverride && iterWb?.tint?.value
            ? parseIterValue(iterWb.tint.value, origTint)
            : origTint,
          original: origTint,
          changed: hasOverride && iterWb?.tint?.value !== undefined,
        },
      },
      // 基础面板
      basic_panel: {
        exposure: {
          value: hasOverride && iterBasic?.exposure?.val !== undefined
            ? parseIterValue(iterBasic.exposure.val, safeBasicPanel.exposure?.value || 0)
            : safeBasicPanel.exposure?.value || 0,
          changed: hasOverride && iterBasic?.exposure?.val !== undefined,
        },
        contrast: {
          value: hasOverride && iterBasic?.contrast?.val !== undefined
            ? parseIterValue(iterBasic.contrast.val, safeBasicPanel.contrast?.value || 0)
            : safeBasicPanel.contrast?.value || 0,
          changed: hasOverride && iterBasic?.contrast?.val !== undefined,
        },
        highlights: {
          value: hasOverride && iterBasic?.highlights?.val !== undefined
            ? parseIterValue(iterBasic.highlights.val, safeBasicPanel.highlights?.value || 0)
            : safeBasicPanel.highlights?.value || 0,
          changed: hasOverride && iterBasic?.highlights?.val !== undefined,
        },
        shadows: {
          value: hasOverride && iterBasic?.shadows?.val !== undefined
            ? parseIterValue(iterBasic.shadows.val, safeBasicPanel.shadows?.value || 0)
            : safeBasicPanel.shadows?.value || 0,
          changed: hasOverride && iterBasic?.shadows?.val !== undefined,
        },
        whites: {
          value: hasOverride && iterBasic?.whites?.val !== undefined
            ? parseIterValue(iterBasic.whites.val, safeBasicPanel.whites?.value || 0)
            : safeBasicPanel.whites?.value || 0,
          changed: hasOverride && iterBasic?.whites?.val !== undefined,
        },
        blacks: {
          value: hasOverride && iterBasic?.blacks?.val !== undefined
            ? parseIterValue(iterBasic.blacks.val, safeBasicPanel.blacks?.value || 0)
            : safeBasicPanel.blacks?.value || 0,
          changed: hasOverride && iterBasic?.blacks?.val !== undefined,
        },
        saturation: {
          value: hasOverride && iterBasic?.saturation?.val !== undefined
            ? parseIterValue(iterBasic.saturation.val, safeBasicPanel.saturation?.value || 0)
            : safeBasicPanel.saturation?.value || 0,
          changed: hasOverride && iterBasic?.saturation?.val !== undefined,
        },
        vibrance: {
          value: hasOverride && iterBasic?.vibrance?.val !== undefined
            ? parseIterValue(iterBasic.vibrance.val, safeBasicPanel.vibrance?.value || 0)
            : safeBasicPanel.vibrance?.value || 0,
          changed: hasOverride && iterBasic?.vibrance?.val !== undefined,
        },
        // 【新增】texture, clarity, dehaze 参数（存在感面板）
        texture: {
          value: hasOverride && iterBasic?.texture?.val !== undefined
            ? parseIterValue(iterBasic.texture.val, safeBasicPanel.texture?.value || 0)
            : safeBasicPanel.texture?.value || 0,
          changed: hasOverride && iterBasic?.texture?.val !== undefined,
        },
        clarity: {
          value: hasOverride && iterBasic?.clarity?.val !== undefined
            ? parseIterValue(iterBasic.clarity.val, safeBasicPanel.clarity?.value || 0)
            : safeBasicPanel.clarity?.value || 0,
          changed: hasOverride && iterBasic?.clarity?.val !== undefined,
        },
        dehaze: {
          value: hasOverride && iterBasic?.dehaze?.val !== undefined
            ? parseIterValue(iterBasic.dehaze.val, safeBasicPanel.dehaze?.value || 0)
            : safeBasicPanel.dehaze?.value || 0,
          changed: hasOverride && iterBasic?.dehaze?.val !== undefined,
        },
      },
      // 色彩分级
      color_grading: {
        shadows: {
          hue: hasOverride && iterGrading?.shadows?.hue !== undefined
            ? parseFloat(iterGrading.shadows.hue || '0') || (data.color_grading?.shadows?.hue ?? 220)
            : data.color_grading?.shadows?.hue ?? 220,
          saturation: hasOverride && iterGrading?.shadows?.saturation !== undefined
            ? parseFloat(iterGrading.shadows.saturation || '0') || (data.color_grading?.shadows?.saturation ?? 15)
            : data.color_grading?.shadows?.saturation ?? 15,
          changed: hasOverride && (iterGrading?.shadows?.hue !== undefined || iterGrading?.shadows?.saturation !== undefined),
        },
        midtones: {
          hue: hasOverride && iterGrading?.midtones?.hue !== undefined
            ? parseFloat(iterGrading.midtones.hue || '0') || (data.color_grading?.midtones?.hue ?? 190)
            : data.color_grading?.midtones?.hue ?? 190,
          saturation: hasOverride && iterGrading?.midtones?.saturation !== undefined
            ? parseFloat(iterGrading.midtones.saturation || '0') || (data.color_grading?.midtones?.saturation ?? 10)
            : data.color_grading?.midtones?.saturation ?? 10,
          changed: hasOverride && (iterGrading?.midtones?.hue !== undefined || iterGrading?.midtones?.saturation !== undefined),
        },
        highlights: {
          hue: hasOverride && iterGrading?.highlights?.hue !== undefined
            ? parseFloat(iterGrading.highlights.hue || '0') || (data.color_grading?.highlights?.hue ?? 210)
            : data.color_grading?.highlights?.hue ?? 210,
          saturation: hasOverride && iterGrading?.highlights?.saturation !== undefined
            ? parseFloat(iterGrading.highlights.saturation || '0') || (data.color_grading?.highlights?.saturation ?? 5)
            : data.color_grading?.highlights?.saturation ?? 5,
          changed: hasOverride && (iterGrading?.highlights?.hue !== undefined || iterGrading?.highlights?.saturation !== undefined),
        },
        balance: {
          value: hasOverride && iterGrading?.balance !== undefined
            ? parseFloat(iterGrading.balance || '0') || (data.color_grading?.balance ?? -10)
            : data.color_grading?.balance ?? -10,
          changed: hasOverride && iterGrading?.balance !== undefined,
        },
      },
      // HSL（简化版，完整版需要更多字段）
      hsl_changed: hasOverride && iterHsl !== undefined,
    };
  }, [data.white_balance, data.color_grading, safeBasicPanel, iterationOverrideParams]);
  
  // 【调试日志】记录数据检查（仅在组件首次挂载或数据变化时输出，通过 useEffect 控制）
  // 【优化】移除每次渲染的日志，改用 useEffect 仅在数据变化时输出

  // ============================================================================
  // 【主渲染】根据预览模式决定布局
  // ============================================================================
  return (
    <div className="flex flex-col h-full overflow-hidden">
    <style>{globalStyles}</style>
    
    {/* ========================================================================
        顶部工具栏：包含预览模式切换按钮
       ======================================================================== */}
    <div className="shrink-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/10 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_6px_#3b82f6]"></div>
        <span className="text-[10px] font-bold text-blue-400 tracking-[0.15em] uppercase">
          {t('modal.lr.title')}
        </span>
      </div>
      
      {/* 【预览模式按钮组】 */}
      {userImageUrl && (
        <div className="flex items-center gap-2">
          {/* WebGL 预览模式切换按钮 */}
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all duration-300",
              previewMode 
                ? "bg-blue-500/20 border-blue-500/50 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
                : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70 hover:border-white/20"
            )}
          >
            {previewMode ? <MonitorOff className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
            <span>{previewMode ? (t('modal.lr.preview_off') || 'CLOSE PREVIEW') : (t('modal.lr.preview_on') || 'PREVIEW MODE')}</span>
          </button>
          
          {/* 【新增】高保真渲染按钮（HQ Preview） */}
          {previewMode && (
            <button
              onClick={handleHiFiRender}
              disabled={isHiFiRendering}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all duration-300",
                isHiFiRendering
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400 cursor-wait"
                  : hiFiAvailable
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    : "bg-white/5 border-white/10 text-white/30 cursor-not-allowed"
              )}
              title={hiFiAvailable ? (t('modal.lr.hifi_render') || '高保真渲染') : (t('modal.lr.hifi_unavailable') || 'Docker 未启动')}
            >
              {isHiFiRendering ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('modal.lr.rendering') || 'RENDERING...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('modal.lr.hifi_render') || 'HQ RENDER'}</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
    
    {/* ========================================================================
        主内容区：根据预览模式切换布局
       ======================================================================== */}
    <div className={cn(
      "flex flex-1 min-h-0",
      previewMode ? "flex-row overflow-hidden" : "flex-col overflow-hidden"
    )}>
      
      {/* ====================================================================
          左侧/主面板：参数控制区
          【修复】确保在非预览模式下也能正常滚动
         ==================================================================== */}
      <div className={cn(
        "flex flex-col relative bg-[#030303] text-gray-300 font-sans selection:bg-blue-500/30",
        previewMode 
          ? "w-1/2 border-r border-white/10 overflow-y-auto custom-scrollbar" 
          : "w-full flex-1 overflow-y-auto custom-scrollbar"
      )}>
        {/* GLOBAL FX - 仅在非预览模式显示 */}
        {!previewMode && (
          <>
        <ScanlineOverlay />
        <DataStreamVertical />
          </>
        )}

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

                {/* A2. SCENE ANALYSIS CARDS */}
                {/* 【新增】色彩匹配协议分析卡片：展示 Gemini 输出的 5 个关键分析字段 */}
                {/* scene_type, lighting_strategy, key_colors, dynamic_range_analysis, color_calibration_strategy */}
                <ColorMatchProtocolCards analysis={data.analysis || {}} t={t} />

                {/* B. WHITE BALANCE STRATEGY */}
                {/* 【修复】使用 Gemini 输出的白平衡数据（从 color_science_scheme.white_balance 中提取），如果没有则使用默认值 */}
                {/* 白平衡数据从色彩分级（color_scheme）中获取，显示在关键任务点下方 */}
                {/* 【新增】支持迭代覆盖参数显示 - 使用 displayData */}
                {/* 【修复】移除条件渲染，确保色温色调面板始终显示（即使数据是默认值） */}
                <div className="mb-6">
                     <h5 className="text-[9px] text-emerald-500 uppercase font-bold border-l-2 border-emerald-500 pl-2 mb-3">{t('modal.color.wb_target')}</h5>
                     <TargetLockSlider 
                        label={t('modal.common.temp')} 
                        // 【修复】显示逻辑：
                        // 1. 如果有实际色温值（value 不为 null 且 > 1000），显示绝对色温值（如 5492K）
                        // 2. 如果没有实际色温值（value 为 null 或 <= 1000），显示调整值（如 -8）
                        value={(() => {
                          const tempValue = displayData.white_balance.temp.value;
                          // 判断是否为实际色温值（> 1000）还是调整值（<= 1000）
                          if (tempValue !== null && tempValue !== undefined && Math.abs(tempValue) > 1000) {
                            return tempValue; // 实际色温值
                          } else {
                            return tempValue ?? 0; // 调整值（相对值）
                          }
                        })()}
                        unit={(() => {
                          const tempValue = displayData.white_balance.temp.value;
                          // 如果是实际色温值（> 1000），显示 "K"；如果是调整值，不显示单位
                          if (tempValue !== null && tempValue !== undefined && Math.abs(tempValue) > 1000) {
                            return "K";
                          } else {
                            return ""; // 调整值不显示单位
                          }
                        })()}
                        min={(() => {
                          const tempValue = displayData.white_balance.temp.value;
                          // 如果是实际色温值，范围是 2000-10000K；如果是调整值，范围是 -500 到 +500
                          if (tempValue !== null && tempValue !== undefined && Math.abs(tempValue) > 1000) {
                            return 2000;
                          } else {
                            return -500;
                          }
                        })()}
                        max={(() => {
                          const tempValue = displayData.white_balance.temp.value;
                          if (tempValue !== null && tempValue !== undefined && Math.abs(tempValue) > 1000) {
                            return 10000;
                          } else {
                            return 500;
                          }
                        })()}
                        targetMin={data.white_balance?.temp?.target_min || (data.white_balance?.temp?.value && Math.abs(data.white_balance.temp.value) > 1000 ? data.white_balance.temp.value - 200 : undefined)} 
                        targetMax={data.white_balance?.temp?.target_max || (data.white_balance?.temp?.value && Math.abs(data.white_balance.temp.value) > 1000 ? data.white_balance.temp.value + 200 : undefined)}
                        reason={data.white_balance?.temp?.reason || t('modal.lr.wb_temp_default')}
                        onHover={setActiveLog} 
                        layerKey="temperature"
                        onSoloClick={previewMode ? handleSoloToggle : undefined}
                        isSolo={isSoloActive('temperature')}
                        isOverridden={displayData.white_balance.temp.changed}
                        originalValue={displayData.white_balance.temp.original}
                    />
                    <TargetLockSlider 
                        label={t('modal.common.tint')} 
                        value={displayData.white_balance.tint.value} 
                        min={-150} 
                        max={150} 
                        targetMin={data.white_balance?.tint?.target_min || (data.white_balance?.tint?.value ? data.white_balance.tint.value - 5 : -5)} 
                        targetMax={data.white_balance?.tint?.target_max || (data.white_balance?.tint?.value ? data.white_balance.tint.value + 5 : 5)}
                        reason={data.white_balance?.tint?.reason || t('modal.lr.wb_tint_default')}
                        onHover={setActiveLog} 
                        layerKey="tint"
                        onSoloClick={previewMode ? handleSoloToggle : undefined}
                        isSolo={isSoloActive('tint')}
                        isOverridden={displayData.white_balance.tint.changed}
                        originalValue={displayData.white_balance.tint.original}
                    />
                </div>

                {/* B2. TONE CONTROLS - 曝光/对比度/高光/阴影/白色/黑色 */}
                {/* 【新增】专业的影调控制区，包含 LR 基础面板的核心参数 */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h5 className="text-[9px] text-emerald-500 uppercase font-bold border-l-2 border-emerald-500 pl-2">
                          {t('modal.lr.tone_controls') || 'TONE CONTROLS'}
                        </h5>
                        <button
                            onClick={() => setEnableAces(!enableAces)}
                            className={`text-[10px] px-3 py-1 rounded border transition-all flex items-center gap-1.5 ${
                                enableAces 
                                ? 'bg-emerald-500 text-black border-emerald-500 font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                                : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:border-white/30'
                            }`}
                            title="Toggle Cinematic ACES Tone Mapping (Movie-grade Highlight Roll-off)"
                        >
                            {enableAces ? <Zap className="w-3 h-3 fill-current" /> : <Activity className="w-3 h-3" />}
                            ACES FILM
                        </button>
                    </div>
                    
                    {/* 曝光 - 最重要的参数，单独一行 */}
                    {/* 【新增】支持迭代覆盖参数显示 */}
                    <TargetLockSlider 
                        label={t('modal.common.exposure') || 'Exposure'} 
                        value={displayData.basic_panel.exposure.value} 
                        unit="" 
                        min={-5} 
                        max={5} 
                        targetMin={(safeBasicPanel.exposure?.value ?? 0) - 0.3} 
                        targetMax={(safeBasicPanel.exposure?.value ?? 0) + 0.3}
                        reason={safeBasicPanel.exposure?.reason || t('modal.lr.exposure_default') || '调整整体亮度'}
                        onHover={setActiveLog}
                        layerKey="exposure"
                        onSoloClick={previewMode ? handleSoloToggle : undefined}
                        isSolo={isSoloActive('exposure')}
                        isOverridden={displayData.basic_panel.exposure.changed}
                        originalValue={safeBasicPanel.exposure?.value ?? 0}
                    />
                    
                    {/* 对比度 */}
                    <TargetLockSlider 
                        label={t('modal.common.contrast') || 'Contrast'} 
                        value={displayData.basic_panel.contrast.value} 
                        unit="" 
                        min={-100} 
                        max={100} 
                        targetMin={(safeBasicPanel.contrast?.value ?? 0) - 5} 
                        targetMax={(safeBasicPanel.contrast?.value ?? 0) + 5}
                        reason={safeBasicPanel.contrast?.reason || t('modal.lr.contrast_default') || '调整明暗对比'}
                        onHover={setActiveLog}
                        layerKey="contrast"
                        onSoloClick={previewMode ? handleSoloToggle : undefined}
                        isSolo={isSoloActive('contrast')}
                        isOverridden={displayData.basic_panel.contrast.changed}
                        originalValue={safeBasicPanel.contrast?.value ?? 0}
                    />
                    
                    {/* 高光/阴影 - 两列布局 */}
                    <div className="grid grid-cols-2 gap-3">
                      <TargetLockSlider 
                          label={t('modal.common.highlights') || 'Highlights'} 
                          value={displayData.basic_panel.highlights.value} 
                          unit="" 
                          min={-100} 
                          max={100} 
                          targetMin={(safeBasicPanel.highlights?.value ?? 0) - 10} 
                          targetMax={(safeBasicPanel.highlights?.value ?? 0) + 10}
                          reason={safeBasicPanel.highlights?.reason || t('modal.lr.highlights_default') || '恢复高光细节'}
                          onHover={setActiveLog}
                          layerKey="highlights"
                          onSoloClick={previewMode ? handleSoloToggle : undefined}
                          isSolo={isSoloActive('highlights')}
                          isOverridden={displayData.basic_panel.highlights.changed}
                          originalValue={safeBasicPanel.highlights?.value ?? 0}
                      />
                      <TargetLockSlider 
                          label={t('modal.common.shadows') || 'Shadows'} 
                          value={displayData.basic_panel.shadows.value} 
                          unit="" 
                          min={-100} 
                          max={100} 
                          targetMin={(safeBasicPanel.shadows?.value ?? 0) - 10} 
                          targetMax={(safeBasicPanel.shadows?.value ?? 0) + 10}
                          reason={safeBasicPanel.shadows?.reason || t('modal.lr.shadows_default') || '提亮阴影区域'}
                          onHover={setActiveLog}
                          layerKey="shadows"
                          onSoloClick={previewMode ? handleSoloToggle : undefined}
                          isSolo={isSoloActive('shadows')}
                          isOverridden={displayData.basic_panel.shadows.changed}
                          originalValue={safeBasicPanel.shadows?.value ?? 0}
                      />
                    </div>
                    
                    {/* 白色/黑色 - 两列布局 */}
                    <div className="grid grid-cols-2 gap-3">
                      <TargetLockSlider 
                          label={t('modal.common.whites') || 'Whites'} 
                          value={displayData.basic_panel.whites.value} 
                          unit="" 
                          min={-100} 
                          max={100} 
                          targetMin={(safeBasicPanel.whites?.value ?? 0) - 10} 
                          targetMax={(safeBasicPanel.whites?.value ?? 0) + 10}
                          reason={safeBasicPanel.whites?.reason || t('modal.lr.whites_default') || '设置白点'}
                          onHover={setActiveLog}
                          layerKey="whites"
                          onSoloClick={previewMode ? handleSoloToggle : undefined}
                          isSolo={isSoloActive('whites')}
                          isOverridden={displayData.basic_panel.whites.changed}
                          originalValue={safeBasicPanel.whites?.value ?? 0}
                      />
                      <TargetLockSlider 
                          label={t('modal.common.blacks') || 'Blacks'} 
                          value={displayData.basic_panel.blacks.value} 
                          unit="" 
                          min={-100} 
                          max={100} 
                          targetMin={(safeBasicPanel.blacks?.value ?? 0) - 10} 
                          targetMax={(safeBasicPanel.blacks?.value ?? 0) + 10}
                          reason={safeBasicPanel.blacks?.reason || t('modal.lr.blacks_default') || '设置黑点'}
                          onHover={setActiveLog}
                          layerKey="blacks"
                          onSoloClick={previewMode ? handleSoloToggle : undefined}
                          isSolo={isSoloActive('blacks')}
                          isOverridden={displayData.basic_panel.blacks.changed}
                          originalValue={safeBasicPanel.blacks?.value ?? 0}
                      />
                    </div>
                </div>

                {/* D. PRESENCE PANEL - 存在感面板 */}
                {/* 【新增】显示 texture, clarity, dehaze, vibrance, saturation 参数 */}
                {/* 这些参数控制图像的质感、清晰度、去雾效果和色彩饱和度 */}
                <div className="mb-6">
                    <h5 className="text-[9px] text-purple-500 uppercase font-bold border-l-2 border-purple-500 pl-2 mb-3 flex items-center gap-2">
                      {t('modal.lr.presence') || 'PRESENCE'}
                      <span className="text-[8px] text-gray-500 font-normal lowercase">/ {t('modal.lr.presence_desc') || 'texture & clarity'}</span>
                    </h5>
                    
                    {/* 纹理/清晰度/去雾 - 三列布局 */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {/* 纹理 (Texture) */}
                      <TargetLockSlider 
                          label={t('modal.common.texture') || 'Texture'} 
                          value={displayData.basic_panel.texture?.value ?? safeBasicPanel.texture?.value ?? 0} 
                          unit="" 
                          min={-100} 
                          max={100} 
                          targetMin={(safeBasicPanel.texture?.value ?? 0) - 10} 
                          targetMax={(safeBasicPanel.texture?.value ?? 0) + 10}
                          reason={safeBasicPanel.texture?.reason || t('modal.lr.texture_default') || '控制细节纹理'}
                          onHover={setActiveLog}
                          layerKey="texture"
                          onSoloClick={previewMode ? handleSoloToggle : undefined}
                          isSolo={isSoloActive('texture')}
                          isOverridden={displayData.basic_panel.texture?.changed ?? false}
                          originalValue={safeBasicPanel.texture?.value ?? 0}
                      />
                      
                      {/* 清晰度 (Clarity) */}
                      <TargetLockSlider 
                          label={t('modal.common.clarity') || 'Clarity'} 
                          value={displayData.basic_panel.clarity?.value ?? safeBasicPanel.clarity?.value ?? 0} 
                          unit="" 
                          min={-100} 
                          max={100} 
                          targetMin={(safeBasicPanel.clarity?.value ?? 0) - 10} 
                          targetMax={(safeBasicPanel.clarity?.value ?? 0) + 10}
                          reason={safeBasicPanel.clarity?.reason || t('modal.lr.clarity_default') || '增强中间调对比'}
                          onHover={setActiveLog}
                          layerKey="clarity"
                          onSoloClick={previewMode ? handleSoloToggle : undefined}
                          isSolo={isSoloActive('clarity')}
                          isOverridden={displayData.basic_panel.clarity?.changed ?? false}
                          originalValue={safeBasicPanel.clarity?.value ?? 0}
                      />
                      
                      {/* 去雾 (Dehaze) */}
                      <TargetLockSlider 
                          label={t('modal.common.dehaze') || 'Dehaze'} 
                          value={displayData.basic_panel.dehaze?.value ?? safeBasicPanel.dehaze?.value ?? 0} 
                          unit="" 
                          min={-100} 
                          max={100} 
                          targetMin={(safeBasicPanel.dehaze?.value ?? 0) - 10} 
                          targetMax={(safeBasicPanel.dehaze?.value ?? 0) + 10}
                          reason={safeBasicPanel.dehaze?.reason || t('modal.lr.dehaze_default') || '控制空气感/雾感'}
                          onHover={setActiveLog}
                          layerKey="dehaze"
                          onSoloClick={previewMode ? handleSoloToggle : undefined}
                          isSolo={isSoloActive('dehaze')}
                          isOverridden={displayData.basic_panel.dehaze?.changed ?? false}
                          originalValue={safeBasicPanel.dehaze?.value ?? 0}
                      />
                    </div>
                    
                    {/* 自然饱和度/饱和度 - 两列布局 */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* 自然饱和度 (Vibrance) */}
                      <TargetLockSlider 
                          label={t('modal.common.vibrance') || 'Vibrance'} 
                          value={displayData.basic_panel.vibrance?.value ?? safeBasicPanel.vibrance?.value ?? 0} 
                          unit="" 
                          min={-100} 
                          max={100} 
                          targetMin={(safeBasicPanel.vibrance?.value ?? 0) - 10} 
                          targetMax={(safeBasicPanel.vibrance?.value ?? 0) + 10}
                          reason={safeBasicPanel.vibrance?.reason || t('modal.lr.vibrance_default') || '智能饱和度调整'}
                          onHover={setActiveLog}
                          layerKey="vibrance"
                          onSoloClick={previewMode ? handleSoloToggle : undefined}
                          isSolo={isSoloActive('vibrance')}
                          isOverridden={displayData.basic_panel.vibrance?.changed ?? false}
                          originalValue={safeBasicPanel.vibrance?.value ?? 0}
                      />
                      
                      {/* 饱和度 (Saturation) */}
                      <TargetLockSlider 
                          label={t('modal.common.saturation') || 'Saturation'} 
                          value={displayData.basic_panel.saturation?.value ?? safeBasicPanel.saturation?.value ?? 0} 
                          unit="" 
                          min={-100} 
                          max={100} 
                          targetMin={(safeBasicPanel.saturation?.value ?? 0) - 10} 
                          targetMax={(safeBasicPanel.saturation?.value ?? 0) + 10}
                          reason={safeBasicPanel.saturation?.reason || t('modal.lr.saturation_default') || '全局饱和度调整'}
                          onHover={setActiveLog}
                          layerKey="saturation"
                          onSoloClick={previewMode ? handleSoloToggle : undefined}
                          isSolo={isSoloActive('saturation')}
                          isOverridden={displayData.basic_panel.saturation?.changed ?? false}
                          originalValue={safeBasicPanel.saturation?.value ?? 0}
                      />
                    </div>
                </div>

                {/* E. TRINITY GRADING */}
                {/* 【修复】使用 Gemini 输出的色彩分级数据，如果没有则使用默认值 */}
                {data.color_grading && (
                <div className="mb-6">
                    <h5 className="text-[9px] text-emerald-500 uppercase font-bold border-l-2 border-emerald-500 pl-2 mb-3">{t('modal.color.grading_vectors')}</h5>
                    {/* 【更新】添加 luminance 参数到 ColorGradeWheel 组件 */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                         <ColorGradeWheel 
                            hue={data.color_grading.shadows?.hue || 210} 
                            saturation={data.color_grading.shadows?.saturation || 20} 
                            luminance={data.color_grading.shadows?.luminance || 0}
                            label={t('modal.common.shadows')} 
                            onHover={setActiveLog} 
                            reason={data.color_grading.shadows?.reason || t('modal.lr.shadows_default')} 
                            layerKey="shadowTint"
                            onSoloClick={previewMode ? handleSoloToggle : undefined}
                            isSolo={isSoloActive('shadowTint')}
                         />
                         <ColorGradeWheel 
                            hue={data.color_grading.midtones?.hue || 45} 
                            saturation={data.color_grading.midtones?.saturation || 15} 
                            luminance={data.color_grading.midtones?.luminance || 0}
                            label={t('modal.common.midtones')} 
                            onHover={setActiveLog} 
                            reason={data.color_grading.midtones?.reason || t('modal.lr.midtones_default')} 
                            layerKey="midtoneTint"
                            onSoloClick={previewMode ? handleSoloToggle : undefined}
                            isSolo={isSoloActive('midtoneTint')}
                         />
                         <ColorGradeWheel 
                            hue={data.color_grading.highlights?.hue || 180} 
                            saturation={data.color_grading.highlights?.saturation || 5} 
                            luminance={data.color_grading.highlights?.luminance || 0}
                            label={t('modal.common.highlights')} 
                            onHover={setActiveLog} 
                            reason={data.color_grading.highlights?.reason || t('modal.lr.highlights_default')} 
                            layerKey="highlightTint"
                            onSoloClick={previewMode ? handleSoloToggle : undefined}
                            isSolo={isSoloActive('highlightTint')}
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
                        layerKey="gradingBalance"
                        onSoloClick={previewMode ? handleSoloToggle : undefined}
                        isSolo={isSoloActive('gradingBalance')}
                    />
                </div>
                )}

                {/* F. CALIBRATION PANEL - 相机校准面板 */}
                {/* 【新增】显示红/绿/蓝原色的色相和饱和度调整，以及阴影色调 */}
                {/* 这是模仿胶片/电影感的关键参数，用于改变三原色的定义 */}
                {data.calibration && (
                <div className="mb-6">
                    <h5 className="text-[9px] text-rose-500 uppercase font-bold border-l-2 border-rose-500 pl-2 mb-3 flex items-center gap-2">
                      {t('modal.lr.calibration') || 'CALIBRATION'}
                      <span className="text-[8px] text-gray-500 font-normal lowercase">/ {t('modal.lr.calibration_desc') || 'camera profiles'}</span>
                    </h5>
                    
                    {/* 三原色调整 - 红/绿/蓝 */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {/* 红原色 (Red Primary) */}
                      <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <span className="text-[9px] text-red-400 font-bold uppercase">{t('modal.lr.red_primary') || 'Red Primary'}</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[8px]">
                            <span className="text-gray-500">Hue</span>
                            <span className={cn(
                              "font-mono",
                              (data.calibration.red_primary?.hue || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                            )}>
                              {(data.calibration.red_primary?.hue || 0) >= 0 ? '+' : ''}{data.calibration.red_primary?.hue || 0}
                            </span>
                          </div>
                          <div className="flex justify-between text-[8px]">
                            <span className="text-gray-500">Sat</span>
                            <span className={cn(
                              "font-mono",
                              (data.calibration.red_primary?.saturation || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                            )}>
                              {(data.calibration.red_primary?.saturation || 0) >= 0 ? '+' : ''}{data.calibration.red_primary?.saturation || 0}
                            </span>
                          </div>
                        </div>
                        {data.calibration.red_primary?.note && (
                          <p className="text-[8px] text-gray-500 mt-2 border-t border-red-500/10 pt-2">{data.calibration.red_primary.note}</p>
                        )}
                      </div>
                      
                      {/* 绿原色 (Green Primary) */}
                      <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-[9px] text-green-400 font-bold uppercase">{t('modal.lr.green_primary') || 'Green Primary'}</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[8px]">
                            <span className="text-gray-500">Hue</span>
                            <span className={cn(
                              "font-mono",
                              (data.calibration.green_primary?.hue || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                            )}>
                              {(data.calibration.green_primary?.hue || 0) >= 0 ? '+' : ''}{data.calibration.green_primary?.hue || 0}
                            </span>
                          </div>
                          <div className="flex justify-between text-[8px]">
                            <span className="text-gray-500">Sat</span>
                            <span className={cn(
                              "font-mono",
                              (data.calibration.green_primary?.saturation || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                            )}>
                              {(data.calibration.green_primary?.saturation || 0) >= 0 ? '+' : ''}{data.calibration.green_primary?.saturation || 0}
                            </span>
                          </div>
                        </div>
                        {data.calibration.green_primary?.note && (
                          <p className="text-[8px] text-gray-500 mt-2 border-t border-green-500/10 pt-2">{data.calibration.green_primary.note}</p>
                        )}
                      </div>
                      
                      {/* 蓝原色 (Blue Primary) */}
                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="text-[9px] text-blue-400 font-bold uppercase">{t('modal.lr.blue_primary') || 'Blue Primary'}</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[8px]">
                            <span className="text-gray-500">Hue</span>
                            <span className={cn(
                              "font-mono",
                              (data.calibration.blue_primary?.hue || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                            )}>
                              {(data.calibration.blue_primary?.hue || 0) >= 0 ? '+' : ''}{data.calibration.blue_primary?.hue || 0}
                            </span>
                          </div>
                          <div className="flex justify-between text-[8px]">
                            <span className="text-gray-500">Sat</span>
                            <span className={cn(
                              "font-mono",
                              (data.calibration.blue_primary?.saturation || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                            )}>
                              {(data.calibration.blue_primary?.saturation || 0) >= 0 ? '+' : ''}{data.calibration.blue_primary?.saturation || 0}
                            </span>
                          </div>
                        </div>
                        {data.calibration.blue_primary?.note && (
                          <p className="text-[8px] text-gray-500 mt-2 border-t border-blue-500/10 pt-2">{data.calibration.blue_primary.note}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* 阴影色调 (Shadows Tint) */}
                    {data.calibration.shadows_tint !== undefined && (
                    <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                      <span className="text-[9px] text-gray-400">{t('modal.lr.shadows_tint') || 'Shadows Tint'}</span>
                      <span className={cn(
                        "text-[10px] font-mono",
                        data.calibration.shadows_tint >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {data.calibration.shadows_tint >= 0 ? '+' : ''}{data.calibration.shadows_tint}
                      </span>
                    </div>
                    )}
                </div>
                )}

                 {/* G. SPECTRUM MATRIX (12 CHANNELS) */}
                 {/* 【修复】使用 Gemini 输出的 HSL 数据，如果没有则使用默认值 */}
                 {/* 从 data.hsl 中提取 HSL 数据，转换为 SpectrumMatrix 需要的格式 */}
                 <div>
                    <h5 className="text-[9px] text-emerald-500 uppercase font-bold border-l-2 border-emerald-500 pl-2 mb-3">{t('modal.color.spectrum')}</h5>
                    <SpectrumMatrix 
                      channels={(() => {
                      // 【修复】从 data.hsl 中提取 HSL 数据，转换为 SpectrumMatrix 需要的格式
                      // data.hsl 结构：{ red: { hue, saturation, luminance }, orange: {...}, ... }
                      const hsl = data.hsl || {};
                      
                      // 【调试日志】记录 HSL 数据提取过程
                      console.log('[LightroomPanel] 🔍 SpectrumMatrix HSL 数据提取:', {
                        hasDataHsl: !!data.hsl,
                        dataHslKeys: data.hsl ? Object.keys(data.hsl) : [],
                        dataHslType: typeof data.hsl,
                        dataHslSample: data.hsl ? Object.keys(data.hsl).slice(0, 3).map(key => ({
                          key,
                          data: data.hsl[key],
                        })) : [],
                        hslKeys: Object.keys(hsl),
                        hslSample: Object.keys(hsl).slice(0, 3).map(key => ({
                          key,
                          data: hsl[key],
                        })),
                      });
                      
                      // 颜色映射表：将后端颜色键映射到前端显示名称和颜色值
                      // 【修复】支持多种颜色键格式（red, orange, yellow, green, aqua, blue, purple, magenta）
                      const colorMap = [
                        { key: 'red', name: t('modal.color.reds'), color: '#ff0000' },
                        { key: 'orange', name: t('modal.color.orange') || 'Orange', color: '#ffa500' },
                        { key: 'yellow', name: t('modal.color.yellows'), color: '#ffff00' },
                        { key: 'yellow_green', name: t('modal.color.yellow_green') || 'Yellow-Green', color: '#9acd32' },
                        { key: 'green', name: t('modal.color.greens'), color: '#008000' },
                        { key: 'green_cyan', name: t('modal.color.green_cyan') || 'Green-Cyan', color: '#00a86b' },
                        { key: 'cyan', name: t('modal.color.cyans'), color: '#00ffff' },
                        { key: 'aqua', name: t('modal.color.cyans'), color: '#00ffff' },  // 【新增】支持 aqua 键
                        { key: 'cyan_blue', name: t('modal.color.cyan_blue') || 'Cyan-Blue', color: '#007fff' },
                        { key: 'blue', name: t('modal.color.blues'), color: '#0000ff' },
                        { key: 'blue_purple', name: t('modal.color.blue_purple') || 'Blue-Purple', color: '#8a2be2' },
                        { key: 'magenta', name: t('modal.color.magentas'), color: '#800080' },
                        { key: 'purple', name: t('modal.color.purples') || 'Purple', color: '#a855f7' },  // 【新增】支持 purple 键
                        { key: 'purple_magenta', name: t('modal.color.purple_magenta') || 'Purple-Magenta', color: '#c71585' },
                      ];
                      
                      // 将后端 HSL 数据转换为前端 SpectrumMatrix 需要的格式
                      const channels = colorMap.map(({ key, name, color }) => {
                        // 【修复】支持多种键名格式（优先使用 key，如果没有则尝试其他可能的键名）
                        const hslData = hsl[key] || hsl[key.toLowerCase()] || {};
                        
                        // 【修复】使用 getHslValue 函数来解析 HSL 值，确保正确处理字符串格式
                        // 注意：getHslValue 函数已经在上面定义，支持字符串格式（如 "+10"、"-5"）和数字格式
                        const hValue = getHslValue(hslData, 'h');
                        const sValue = getHslValue(hslData, 's');
                        const lValue = getHslValue(hslData, 'l');
                        
                        // 【调试日志】记录每个通道的数据提取（详细版本）
                        if (process.env.NODE_ENV === 'development' && (key === 'red' || key === 'green' || key === 'blue' || key === 'yellow')) {
                          console.log(`[LightroomPanel] 🔍 HSL 通道 ${key} 详细数据:`, {
                            hasHslData: !!hslData,
                            hslDataKeys: hslData ? Object.keys(hslData) : [],
                            hslDataFull: hslData, // 完整对象
                            // 【新增】检查原始值
                            rawHue: hslData?.hue,
                            rawHueType: typeof hslData?.hue,
                            rawSaturation: hslData?.saturation,
                            rawSaturationType: typeof hslData?.saturation,
                            rawLuminance: hslData?.luminance,
                            rawLuminanceType: typeof hslData?.luminance,
                            // 【新增】检查解析后的值
                            parsedHue: hValue,
                            parsedSaturation: sValue,
                            parsedLuminance: lValue,
                          });
                        }
                        
                        return {
                          name,
                          h: hValue,  // 色相调整值（使用 getHslValue 解析）
                          s: sValue,  // 饱和度调整值（使用 getHslValue 解析）
                          l: lValue,  // 明度调整值（使用 getHslValue 解析）
                          color,
                        };
                      });
                      
                      // 【调试日志】记录最终生成的 channels 数据
                      console.log('[LightroomPanel] 🔍 SpectrumMatrix channels 最终数据:', {
                        channelsLength: channels.length,
                        channelsSample: channels.slice(0, 3).map(ch => ({
                          name: ch.name,
                          h: ch.h,
                          s: ch.s,
                          l: ch.l,
                        })),
                        hasNonZeroValues: channels.some(ch => ch.h !== 0 || ch.s !== 0 || ch.l !== 0),
                      });
                      
                      return channels;
                    })()}
                      onSoloClick={previewMode ? handleSoloToggle : undefined}
                      soloLayers={soloLayers}
                    />
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
                      // 【修复】预览模式下使用预测直方图，否则使用 Gemini 模拟数据
                      let histogramR, histogramG, histogramB, histogramL;
                      
                      if (previewMode && soloLayers.size > 0 && baseHistogram.l.length > 0) {
                        // 预览模式且有 Solo 选中：根据调整参数预测直方图
                        // 使用 filterParams 中的参数来预测直方图变化
                        const predicted = predictHistogram(baseHistogram, filterParams);
                        histogramR = predicted.r;
                        histogramG = predicted.g;
                        histogramB = predicted.b;
                        histogramL = predicted.l;
                      } else {
                        // 非预览模式或无 Solo 选中：使用原图直方图
                        histogramR = baseHistogram.r;
                        histogramG = baseHistogram.g;
                        histogramB = baseHistogram.b;
                        histogramL = baseHistogram.l;
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
                       maxVal: 100, // 占位值
                       color: "text-emerald-500",
                       isClipping: true // 特殊处理，不显示进度条
                     }
                 ].map((stat, i) => (
                     <div key={i} className="p-1.5 text-center bg-[#0c0c0c] hover:bg-[#151515] transition-colors relative overflow-hidden group">
                         <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100"></div>
                         <div className="text-[7px] text-white/30 uppercase tracking-wider mb-0.5 font-bold">{stat.label}</div>
                         
                         {/* 【优化】添加可视化进度条（仅对数值类型显示） */}
                         {!stat.isClipping && typeof stat.val === 'number' && stat.maxVal && (
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
            {/* 【新增】曲线支持 Solo 预览模式 */}
            <PanelStrip title={t('modal.lr.curve')} icon={Activity} isActive={activeSection === 'curve'} onToggle={() => toggleSection('curve')}>
                <AdvancedCurveMonitor 
                    curveData={safeData.curve} 
                    previewMode={previewMode}
                    onSoloClick={previewMode ? handleSoloToggle : undefined}
                    isSoloActive={isSoloActive}
                />
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
                         {(() => {
                           console.log('[LightroomPanel] HSL 数据传递给 HSLVisualizer:', data.hsl);
                           return <HSLVisualizer data={data.hsl || {}} onHover={setActiveLog} />;
                         })()}
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

            {/* LOCAL ADJUSTMENTS / MASKS - 局部调整蒙版 */}
            <PanelStrip 
              title={t('modal.lr.local_adjustments')} 
              icon={Target} 
              isActive={activeSection === 'masks'} 
              onToggle={() => toggleSection('masks')}
            >
              <LocalAdjustmentsMasks 
                masks={data.local_adjustments_masks?.masks || []}
                tonalZones={data.tonal_zone_analysis}
                onHover={setActiveLog}
              />
            </PanelStrip>

            {/* ================================================================
                迭代调色反馈区 - 用户与 Gemini 的迭代对话
               ================================================================ */}
            <div className="mx-2 mb-4 border border-cyan-500/30 rounded-lg bg-gradient-to-br from-cyan-950/20 to-slate-950/40 overflow-hidden">
              {/* 标题栏 */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20 bg-cyan-950/30">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-cyan-500/20 rounded-md">
                    <RefreshCw className="w-4 h-4 text-cyan-400" />
                  </div>
                  <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                    {t('modal.lr.iteration_feedback') || '迭代调色'}
                  </span>
                  {iterationHistory.length > 0 && (
                    <span className="px-1.5 py-0.5 text-[9px] bg-cyan-500/20 text-cyan-300 rounded-full">
                      #{iterationHistory.length}
                    </span>
                  )}
                </div>
                {/* 【优化】历史记录展开按钮：更明显的视觉样式 */}
                <button
                  onClick={() => setShowIterationHistory(!showIterationHistory)}
                  className={cn(
                    "px-2 py-1 rounded-md transition-all flex items-center gap-1.5",
                    showIterationHistory 
                      ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/30" 
                      : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60 border border-white/10"
                  )}
                  title={t('modal.lr.view_history') || '查看历史'}
                >
                  <History className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-medium uppercase">
                    {showIterationHistory ? (t('modal.lr.hide_history') || '收起') : (t('modal.lr.view_history') || '历史')}
                  </span>
                </button>
              </div>
              
              {/* 反馈输入区 */}
              <div className="p-4 space-y-3">
                {/* 提示文本 */}
                <p className="text-[10px] text-white/40 leading-relaxed">
                  {t('modal.lr.iteration_hint') || '描述您对当前调色效果的不满意之处，AI 将分析并给出修正建议。'}
                </p>
                
                {/* 输入框 */}
                <div className="relative">
                  <textarea
                    value={iterationFeedback}
                    onChange={(e) => setIterationFeedback(e.target.value)}
                    placeholder={t('modal.lr.iteration_placeholder') || '例如：阴影里的青色太多了，天空饱和度太高...'}
                    className={cn(
                      "w-full h-20 px-3 py-2 text-xs bg-black/40 border rounded-lg resize-none",
                      "text-white/80 placeholder:text-white/20",
                      "focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50",
                      "transition-all",
                      isIterating ? "border-cyan-500/30 opacity-50" : "border-white/10"
                    )}
                    disabled={isIterating}
                    maxLength={1000}
                  />
                  <span className="absolute bottom-2 right-2 text-[9px] text-white/20">
                    {iterationFeedback.length}/1000
                  </span>
                </div>
                
                {/* 提交按钮 */}
                <button
                  onClick={handleIterationSubmit}
                  disabled={isIterating || !iterationFeedback.trim()}
                  className={cn(
                    "w-full py-2.5 rounded-lg font-medium text-xs uppercase tracking-wider",
                    "flex items-center justify-center gap-2 transition-all",
                    isIterating || !iterationFeedback.trim()
                      ? "bg-white/5 text-white/30 cursor-not-allowed"
                      : "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-500/20"
                  )}
                >
                  {isIterating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('modal.lr.analyzing') || '分析中...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{t('modal.lr.submit_feedback') || '提交反馈'}</span>
                    </>
                  )}
                </button>
              </div>
              
              {/* 最新迭代结果 */}
              {iterationResult && iterationResult.suggestions.length > 0 && (
                <div className="px-4 pb-4">
                  <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 rounded-lg">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                          {t('modal.lr.ai_suggestions') || 'AI 修正建议'}
                        </span>
                      </div>
                      {/* 【新增】迭代参数应用状态指示和撤销按钮 */}
                      {iterationOverrideParams && (
                        <button
                          onClick={() => {
                            setIterationOverrideParams(null);
                            setActiveLog(t('modal.lr.iteration_reset') || '已恢复原始参数');
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 transition-all"
                          title={t('modal.lr.reset_to_original') || '撤销迭代应用，恢复原始参数'}
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>{t('modal.lr.reset') || '撤销'}</span>
                        </button>
                      )}
                    </div>
                    {/* 【新增】应用状态提示 */}
                    {iterationOverrideParams && (
                      <div className="mb-2 text-[9px] text-emerald-400 bg-emerald-950/50 px-2 py-1 rounded flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>{t('modal.lr.params_applied') || '✓ 迭代参数已自动应用到预览'}</span>
                      </div>
                    )}
                    <ul className="space-y-1.5">
                      {iterationResult.suggestions.slice(0, 3).map((suggestion, idx) => (
                        <li key={idx} className="text-[10px] text-white/70 leading-relaxed flex items-start gap-2">
                          <span className="text-emerald-400 shrink-0">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {/* 迭代历史记录（可折叠）*/}
              {showIterationHistory && iterationHistory.length > 0 && (
                <div className="px-4 pb-4 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                      {t('modal.lr.iteration_history') || '迭代历史'}
                    </div>
                    <span className="text-[9px] text-white/30">
                      {t('modal.lr.total_iterations') || '共'} {iterationHistory.length} {t('modal.lr.records') || '条'}
                    </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                    {iterationHistory.slice().reverse().map((item) => (
                      <div 
                        key={item.id}
                        className={cn(
                          "p-3 rounded-lg text-[9px] transition-all",
                          item.status === 'completed' 
                            ? "bg-emerald-950/20 border border-emerald-500/10" 
                            : item.status === 'failed'
                            ? "bg-red-950/20 border border-red-500/10"
                            : "bg-black/20 border border-white/5"
                        )}
                      >
                        {/* 头部：迭代编号 + 状态 + 时间 */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-cyan-400 font-bold text-[11px]">#{item.iterationNumber}</span>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[8px] font-medium",
                              item.status === 'completed' ? "bg-emerald-500/20 text-emerald-300" :
                              item.status === 'failed' ? "bg-red-500/20 text-red-300" :
                              "bg-yellow-500/20 text-yellow-300"
                            )}>
                              {item.status === 'completed' ? '✓ 完成' :
                               item.status === 'failed' ? '✗ 失败' :
                               '⋯ 处理中'}
                            </span>
                          </div>
                          {item.createdAt && (
                            <span className="text-white/30 text-[8px]">
                              {new Date(item.createdAt).toLocaleString('zh-CN', {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>
                        
                        {/* 用户反馈 */}
                        <div className="mb-2">
                          <span className="text-white/30 text-[8px] uppercase mr-1">反馈:</span>
                          <p className="text-white/60 line-clamp-2 leading-relaxed">{item.userFeedback}</p>
                        </div>
                        
                        {/* AI 建议 */}
                        {item.suggestions && item.suggestions.length > 0 && (
                          <div className="pt-2 border-t border-white/5">
                            <span className="text-emerald-400/50 text-[8px] uppercase mr-1">AI:</span>
                            <ul className="space-y-1 mt-1">
                              {item.suggestions.slice(0, 2).map((suggestion, idx) => (
                                <li key={idx} className="text-emerald-400/70 leading-relaxed flex items-start gap-1">
                                  <span className="shrink-0">→</span>
                                  <span className="line-clamp-1">{suggestion}</span>
                                </li>
                              ))}
                              {item.suggestions.length > 2 && (
                                <li className="text-white/30 text-[8px]">
                                  +{item.suggestions.length - 2} {t('modal.lr.more_suggestions') || '更多建议...'}
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 空历史提示 */}
              {showIterationHistory && iterationHistory.length === 0 && (
                <div className="px-4 pb-4">
                  <div className="text-center py-4 text-[10px] text-white/30">
                    {t('modal.lr.no_history') || '暂无迭代记录'}
                  </div>
                </div>
              )}
            </div>

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
      {/* 左侧面板结束 */}
      
      {/* ====================================================================
          右侧面板：实时预览区（仅在预览模式下显示）
          【修复】使用 flex-1 而不是 h-full，确保正确填充剩余空间
          【新增】支持与参考图对比功能
         ==================================================================== */}
      {previewMode && userImageUrl && (
        <div className="w-1/2 flex flex-col bg-[#050505] relative min-h-0">
          {/* 【修改】对比模式工具栏 - 移到底部中央，不遮挡图片 */}
          {refImageUrl && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-black/80 backdrop-blur-sm rounded-full px-2 py-1 border border-white/20 shadow-lg">
              <span className="text-[8px] text-white/50 uppercase tracking-wider mr-1">{t('modal.lr.compare') || 'Compare'}</span>
              <button
                onClick={() => setCompareMode('none')}
                className={cn(
                  "p-1.5 rounded-full transition-all",
                  compareMode === 'none' 
                    ? "bg-blue-500 text-white" 
                    : "text-white/50 hover:text-white hover:bg-white/10"
                )}
                title={t('modal.lr.compare_none') || '仅预览'}
              >
                <Image className="w-3 h-3" />
              </button>
              <button
                onClick={() => setCompareMode('split')}
                className={cn(
                  "p-1.5 rounded-full transition-all",
                  compareMode === 'split' 
                    ? "bg-blue-500 text-white" 
                    : "text-white/50 hover:text-white hover:bg-white/10"
                )}
                title={t('modal.lr.compare_split') || '分屏对比'}
              >
                <SplitSquareVertical className="w-3 h-3" />
              </button>
              <button
                onClick={() => setCompareMode('slider')}
                className={cn(
                  "p-1.5 rounded-full transition-all",
                  compareMode === 'slider' 
                    ? "bg-blue-500 text-white" 
                    : "text-white/50 hover:text-white hover:bg-white/10"
                )}
                title={t('modal.lr.compare_slider') || '滑动对比'}
              >
                <GripVertical className="w-3 h-3" />
              </button>
            </div>
          )}
          
          {/* 根据对比模式显示不同内容 */}
          {compareMode === 'none' && (
            // 【修复】优先显示高保真渲染结果（如果存在），否则显示 WebGL 实时预览
            showHiFiResult && hiFiRenderedUrl ? (
              // 高保真渲染结果模式：直接显示渲染后的图片（不使用 WebGL）
              <div className="relative h-full w-full">
                <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-emerald-500/80 text-white text-[9px] font-bold uppercase rounded flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>{t('modal.lr.hifi_result') || 'HQ RENDERED'}</span>
                </div>
                <img 
                  src={hiFiRenderedUrl} 
                  alt="High-fidelity rendered" 
                  className="w-full h-full object-contain bg-black"
                />
                {/* 【新增】切换回 WebGL 预览的按钮 */}
                <button
                  onClick={() => {
                    setShowHiFiResult(false);
                    setActiveLog(t('modal.lr.switched_to_preview') || '已切换回实时预览');
                  }}
                  className="absolute top-2 right-2 z-10 px-2 py-1 bg-blue-500/80 hover:bg-blue-500 text-white text-[9px] font-bold uppercase rounded transition-all flex items-center gap-1"
                  title={t('modal.lr.switch_to_preview') || '切换回实时预览'}
                >
                  <Monitor className="w-3 h-3" />
                  <span>{t('modal.lr.preview') || 'PREVIEW'}</span>
                </button>
              </div>
            ) : (
              // WebGL 实时预览模式：使用 LivePreviewCanvas 应用 filterParams
              <LivePreviewCanvas 
                ref={previewCanvasRef}
                imageUrl={userImageUrl}
                params={filterParams}
                className="h-full"
                soloLayers={soloLayers}
                onSoloLayersChange={setSoloLayers}
              />
            )
          )}
          
          {compareMode === 'split' && refImageUrl && (
            // 【新增】分屏对比模式：左参考图，右预览图
            <div className="flex h-full">
              {/* 左侧：参考图 */}
              <div className="w-1/2 h-full relative border-r border-white/20">
                <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-emerald-500/80 text-white text-[9px] font-bold uppercase rounded">
                  {t('modal.lr.reference') || 'REFERENCE'}
                </div>
                <img 
                  src={refImageUrl} 
                  alt="Reference" 
                  className="w-full h-full object-contain bg-black"
                />
              </div>
              {/* 右侧：预览图 */}
              <div className="w-1/2 h-full relative">
                <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-blue-500/80 text-white text-[9px] font-bold uppercase rounded">
                  {showHiFiResult && hiFiRenderedUrl ? (t('modal.lr.hifi_result') || 'HQ RENDERED') : (t('modal.lr.preview') || 'PREVIEW')}
                </div>
                {showHiFiResult && hiFiRenderedUrl ? (
                  // 高保真渲染结果
                  <img 
                    src={hiFiRenderedUrl} 
                    alt="High-fidelity rendered" 
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  // WebGL 实时预览
                  <LivePreviewCanvas 
                    ref={previewCanvasRef}
                    imageUrl={userImageUrl}
                    params={filterParams}
                    className="h-full"
                    soloLayers={soloLayers}
                    onSoloLayersChange={setSoloLayers}
                  />
                )}
              </div>
            </div>
          )}
          
          {compareMode === 'slider' && refImageUrl && (
            // 【新增】滑动对比模式：滑块控制显示比例
            <div 
              className="relative h-full cursor-ew-resize select-none"
              onMouseMove={(e) => {
                if (e.buttons === 1) { // 鼠标左键按下时
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
                  setSliderPosition(percentage);
                }
              }}
              onMouseDown={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
                setSliderPosition(percentage);
              }}
            >
              {/* 底层：预览图 */}
              <div className="absolute inset-0">
                {showHiFiResult && hiFiRenderedUrl ? (
                  // 高保真渲染结果
                  <img 
                    src={hiFiRenderedUrl} 
                    alt="High-fidelity rendered" 
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  // WebGL 实时预览
                  <LivePreviewCanvas 
                    ref={previewCanvasRef}
                    imageUrl={userImageUrl}
                    params={filterParams}
                    className="h-full"
                    soloLayers={soloLayers}
                    onSoloLayersChange={setSoloLayers}
                  />
                )}
              </div>
              
              {/* 上层：参考图（裁切显示） */}
              <div 
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <img 
                  src={refImageUrl} 
                  alt="Reference" 
                  className="w-full h-full object-contain bg-black"
                />
              </div>
              
              {/* 滑块分隔线 */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] z-10 pointer-events-none"
                style={{ left: `${sliderPosition}%` }}
              >
                {/* 滑块手柄 */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <GripVertical className="w-4 h-4 text-gray-600" />
                </div>
                {/* 标签：参考图 */}
                <div className="absolute top-2 -left-12 px-2 py-1 bg-emerald-500/80 text-white text-[8px] font-bold uppercase rounded whitespace-nowrap">
                  {t('modal.lr.reference') || 'REF'}
                </div>
                {/* 标签：预览图 */}
                <div className="absolute top-2 left-4 px-2 py-1 bg-blue-500/80 text-white text-[8px] font-bold uppercase rounded whitespace-nowrap">
                  {t('modal.lr.preview') || 'PREVIEW'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
    </div>
    {/* 主内容区结束 */}
    
    </div>
  );
};
