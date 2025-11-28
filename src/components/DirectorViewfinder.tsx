import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Crop, Move, Zap, Eye, Check, X,
  ArrowRight, Camera, XCircle, Sun, Moon, Palette, Layers, Navigation, Crosshair 
} from 'lucide-react';
import { useLanguage } from '../src/contexts/LanguageContext';

// --- 类型定义 ---
interface DirectorViewfinderProps {
  data: any;
  userImageUrl: string;
}

interface ActionGuide {
  x: number;
  y: number;
  icon: string;
  instruction: string;
  vector_angle?: number;
}

interface GradingMask {
  area_polygon: Array<{ x: number; y: number }>;
  action: string;
  advice: string;
}

interface SuggestedCrop {
  x: number;
  y: number;
  w: number;
  h: number;
  reason?: string;
}

interface ClinicData {
  diagnosis_summary?: string;
  suggested_crop?: SuggestedCrop;
  action_guides?: ActionGuide[];
  grading_masks?: GradingMask[];
}

export const DirectorViewfinder: React.FC<DirectorViewfinderProps> = ({ data, userImageUrl }) => {
  const { t } = useLanguage();
  
  // 【安全获取数据】支持多种数据路径
  const clinic: ClinicData | undefined = useMemo(() => {
    return data?.compositionClinic || 
           data?.composition_clinic || 
           data?.module_2_composition?.composition_clinic ||
           data?.structured?.composition_clinic ||
           data?.composition?.composition_clinic;
  }, [data]);

  // 【模式状态】控制显示模式
  const [mode, setMode] = useState<'original' | 'crop' | 'guide' | 'mask'>('original');
  // 【蒙版高亮状态】控制哪个蒙版被高亮显示
  const [activeMaskIndex, setActiveMaskIndex] = useState<number | null>(null);

  // 【图片尺寸检测】用于适配横图和竖图
  const [imageSize, setImageSize] = useState<{ width: number; height: number; aspectRatio: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // 【图片加载完成后检测尺寸】确保横图和竖图都能正确显示
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const handleLoad = () => {
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      const aspectRatio = naturalWidth / naturalHeight;

      setImageSize({
        width: naturalWidth,
        height: naturalHeight,
        aspectRatio
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('[DirectorViewfinder] 📐 图片尺寸检测:', {
          width: naturalWidth,
          height: naturalHeight,
          aspectRatio: aspectRatio.toFixed(2),
          orientation: aspectRatio > 1 ? '横图 (Landscape)' : '竖图 (Portrait)'
        });
      }
    };

    // 如果图片已经加载完成，立即检测
    if (img.complete) {
      handleLoad();
    } else {
      img.addEventListener('load', handleLoad);
      return () => img.removeEventListener('load', handleLoad);
    }
  }, [userImageUrl]);

  // 【调试日志】仅在开发环境记录
  if (process.env.NODE_ENV === 'development') {
    console.log('[DirectorViewfinder 3.0] 接收到的数据:', {
      hasData: !!data,
      hasClinic: !!clinic,
      clinicKeys: clinic ? Object.keys(clinic) : [],
      hasSuggestedCrop: !!clinic?.suggested_crop,
      hasActionGuides: !!clinic?.action_guides,
      actionGuidesCount: clinic?.action_guides?.length || 0,
      hasGradingMasks: !!clinic?.grading_masks,
      gradingMasksCount: clinic?.grading_masks?.length || 0,
    });
  }

  // 【空状态处理】如果没有数据，显示等待状态
  if (!clinic) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 bg-black font-mono text-xs tracking-widest uppercase">
        <span className="animate-pulse">
          {t('modal.composition.clinic_loading') || 'System Initializing... Waiting for Data Stream'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white overflow-hidden relative font-sans select-none">
      
      {/* =========================================================
          TOP: HUD 诊断条 (玻璃拟态悬浮舱)
         ========================================================= */}
      <div className="absolute top-6 left-6 right-6 z-40 flex justify-center pointer-events-none">
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-2xl shadow-2xl max-w-3xl flex items-start gap-5 animate-in slide-in-from-top-4">
           {/* 动态脉冲点 */}
           <div className="mt-1.5 relative shrink-0">
             <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping absolute opacity-75" />
             <div className="w-2.5 h-2.5 rounded-full bg-red-500 relative shadow-[0_0_10px_#ef4444]" />
           </div>
           
           {/* 诊断内容 */}
           <div>
             <h3 className="text-[10px] font-bold text-red-400 tracking-[0.25em] uppercase mb-1 flex items-center gap-2">
               {t('modal.composition.clinic_diagnosis_title') || 'AI SURGICAL DIAGNOSIS'} 
               <div className="h-px w-8 bg-red-500/50"/>
             </h3>
             <p className="text-sm font-medium text-gray-200 leading-relaxed shadow-sm tracking-wide">
               {clinic.diagnosis_summary || t('modal.composition.clinic_analyzing') || '正在分析构图问题...'}
             </p>
           </div>
        </div>
      </div>

      {/* =========================================================
          CENTER: 主视口 (沉浸式画布)
         ========================================================= */}
      <div className="flex-1 relative flex items-center justify-center bg-[#0a0a0a] overflow-hidden group">
        
        {/* 背景网格 (提升科技感) */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none" 
          style={{ 
            backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', 
            backgroundSize: '30px 30px' 
          }} 
        />

        {/* 图片容器 */}
        <div 
          className="relative max-w-full max-h-[82vh] transition-all duration-700 ease-out shadow-2xl"
          style={{
            // 【横竖图适配】根据图片宽高比动态设置最大尺寸
            maxWidth: imageSize && imageSize.aspectRatio > 1 ? '65vw' : 'none',
            maxHeight: imageSize && imageSize.aspectRatio <= 1 ? '65vh' : 'none',
          }}
        >
          
          <img 
            ref={imgRef}
            src={userImageUrl} 
            className={`
              block max-w-full max-h-[82vh] w-auto h-auto object-contain 
              transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]
              ${mode === 'crop' ? 'opacity-30 blur-sm scale-[0.98]' : 'opacity-100'}
            `}
            style={{
              maxWidth: imageSize && imageSize.aspectRatio > 1 ? '65vw' : 'none',
              maxHeight: imageSize && imageSize.aspectRatio <= 1 ? '65vh' : 'none',
            }}
            alt="Target"
            onLoad={() => {
              // 图片加载完成后触发尺寸检测
              if (imgRef.current) {
                const img = imgRef.current;
                const naturalWidth = img.naturalWidth;
                const naturalHeight = img.naturalHeight;
                const aspectRatio = naturalWidth / naturalHeight;

                setImageSize({
                  width: naturalWidth,
                  height: naturalHeight,
                  aspectRatio
                });
              }
            }}
          />

          {/* -----------------------------------------------------
             MODE: 智能构图 (CROP) - 影院聚光灯效果
             ----------------------------------------------------- */}
          {mode === 'crop' && clinic.suggested_crop && (
            <div className="absolute inset-0 z-20">
               {/* 裁剪框 */}
               <div 
                 className="absolute border border-yellow-400/90 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
                 style={{
                   left: `${clinic.suggested_crop.x}%`,
                   top: `${clinic.suggested_crop.y}%`,
                   width: `${clinic.suggested_crop.w}%`,
                   height: `${clinic.suggested_crop.h}%`,
                   // 核心：利用超大阴影制造聚光灯效果，遮蔽周围
                   boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.85)' 
                 }}
               >
                 {/* 三分线网格 (极细) */}
                 <div className="w-full h-full grid grid-cols-3 grid-rows-3 opacity-30">
                   <div className="border-r border-yellow-400" />
                   <div className="border-r border-yellow-400" />
                   <div className="border-b border-yellow-400 row-span-1 w-full absolute top-1/3" />
                   <div className="border-b border-yellow-400 row-span-1 w-full absolute top-2/3" />
                 </div>
                 
                 {/* 角标装饰 */}
                 <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-yellow-400"/>
                 <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-yellow-400"/>
                 <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-yellow-400"/>
                 <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-yellow-400"/>
                 
                 {/* 尺寸标记 */}
                 <div className="absolute -top-6 left-0 text-[10px] text-yellow-400 font-mono tracking-widest bg-black/80 px-2 py-0.5 rounded">
                   {t('modal.composition.clinic_crop_preview') || 'AI REFRAME'}
                 </div>
               </div>
            </div>
          )}

          {/* -----------------------------------------------------
             MODE: 拍摄指导 (GUIDE) - AR 增强现实风格
             ----------------------------------------------------- */}
          {mode === 'guide' && clinic.action_guides?.map((guide: ActionGuide, idx: number) => (
            <div 
              key={idx}
              className="absolute z-30"
              style={{ left: `${guide.x}%`, top: `${guide.y}%` }}
            >
              <div className="relative group cursor-help">

                {/* 1. 锚点 (全息投影感) */}
                <div className="absolute -translate-x-1/2 -translate-y-1/2">
                   <div className="w-12 h-12 border border-cyan-500/30 rounded-full animate-[spin_4s_linear_infinite]" />
                   <div className="absolute inset-0 w-12 h-12 border border-cyan-500/30 rounded-full animate-[spin_4s_linear_infinite_reverse] scale-75" />
                   <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee]" />
                   </div>
                </div>

                {/* 2. 动态箭头 (如果是移动指令) */}
                {guide.icon.includes('move') && (
                  <svg 
                    className="absolute top-0 left-0 w-32 h-32 pointer-events-none opacity-80" 
                    style={{ 
                      transform: `translate(-50%, -50%) rotate(${guide.vector_angle || 0}deg)`,
                      filter: 'drop-shadow(0 0 2px #22d3ee)'
                    }}
                  >
                    <defs>
                      <marker id={`arrow-${idx}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L6,3 z" fill="#22d3ee" />
                      </marker>
                    </defs>
                    <line 
                      x1="0" 
                      y1="20" 
                      x2="60" 
                      y2="20" 
                      stroke="#22d3ee" 
                      strokeWidth="1.5" 
                      markerEnd={`url(#arrow-${idx})`} 
                      strokeDasharray="4 2" 
                      className="animate-[dash_1s_linear_infinite]" 
                    />
                  </svg>
                )}

                {/* 3. 悬浮指令卡片 (连接线样式) - 仅悬停显示 */}
                <div className="absolute left-6 top-6 flex items-start opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto">
                   {/* 折线连接 */}
                   <svg width="40" height="40" className="absolute -left-8 -top-8 pointer-events-none">
                      <path d="M0,0 L15,15 L40,15" fill="none" stroke="#22d3ee" strokeWidth="1" strokeOpacity="0.5" />
                   </svg>
                   
                   <div className="bg-black/80 backdrop-blur-md border-l-2 border-cyan-400 pl-3 py-1 pr-4 shadow-2xl ml-2">
                      <div className="flex items-center gap-2 text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-0.5">
                        {getIconForGuide(guide.icon)}
                        {guide.icon.replace('_', ' ')}
                      </div>
                      <div className="text-xs text-white font-medium whitespace-nowrap">
                        {guide.instruction}
                      </div>
                   </div>
                </div>
              </div>
            </div>
          ))}

          {/* -----------------------------------------------------
             MODE: 后期蒙版 (MASK) - 工程图纸风格
             ----------------------------------------------------- */}
          {mode === 'mask' && (
            <svg 
              className="absolute inset-0 w-full h-full z-20 pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                {/* 纹理：Burn (黑色斜线) */}
                <pattern id="pattern-burn" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="4" height="8" transform="translate(0,0)" fill="black" fillOpacity="0.6" />
                </pattern>
                {/* 纹理：Dodge (白色点阵) */}
                <pattern id="pattern-dodge" width="6" height="6" patternUnits="userSpaceOnUse">
                   <circle cx="2" cy="2" r="1.5" fill="white" fillOpacity="0.6" />
                </pattern>
                {/* 纹理：Color (方格) */}
                <pattern id="pattern-color" width="8" height="8" patternUnits="userSpaceOnUse">
                   <path d="M0 0h8v8H0z" fill="none" stroke="rgba(236, 72, 153, 0.5)" strokeWidth="1"/>
                </pattern>
              </defs>

              {clinic.grading_masks?.map((mask: GradingMask, idx: number) => {
                 const isActive = activeMaskIndex === idx || activeMaskIndex === null;
                 // 【修复】确保 polygon points 格式正确（数字，不是百分比字符串）
                 const points = mask.area_polygon.map((p: { x: number; y: number }) => {
                   const x = typeof p.x === 'string' ? parseFloat(p.x.replace('%', '')) : p.x;
                   const y = typeof p.y === 'string' ? parseFloat(p.y.replace('%', '')) : p.y;
                   return `${x},${y}`;
                 }).join(' ');
                 
                 let fillUrl = 'url(#pattern-color)';
                 let strokeColor = '#ec4899';
                 if (mask.action === 'burn') { fillUrl = 'url(#pattern-burn)'; strokeColor = 'rgba(0,0,0,0.5)'; }
                 if (mask.action === 'dodge') { fillUrl = 'url(#pattern-dodge)'; strokeColor = 'rgba(255,255,255,0.8)'; }

                 return (
                   <g 
                     key={idx} 
                     className={`transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-10'}`}
                   >
                     <polygon 
                       points={points} 
                       fill={fillUrl}
                       stroke={strokeColor}
                       strokeWidth="1.5"
                       strokeDasharray="4 2"
                       className="animate-[dash_30s_linear_infinite]"
                     />
                   </g>
                 );
              })}
            </svg>
          )}

        </div>
      </div>

      {/* =========================================================
          BOTTOM: 悬浮 HUD 信息面板 (文字说明区)
         ========================================================= */}
      {mode !== 'original' && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-full max-w-lg z-30 px-4">
          <div className="bg-[#111]/80 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl flex items-start gap-5 animate-in slide-in-from-bottom-6">
            
            {/* 动态图标 */}
            <div className={`p-3 rounded-xl shrink-0 ${
               mode === 'crop' ? 'bg-yellow-500/10 text-yellow-400' : 
               mode === 'guide' ? 'bg-cyan-500/10 text-cyan-400' : 
               'bg-purple-500/10 text-purple-400'
            }`}>
               {mode === 'crop' && <Crop size={24} />}
               {mode === 'guide' && <Navigation size={24} />}
               {mode === 'mask' && <Layers size={24} />}
            </div>

            {/* 内容区 */}
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-sm font-bold text-white tracking-wide">
                  {mode === 'crop' && (t('modal.composition.clinic_mode_crop_title') || 'AI 构图重构')}
                  {mode === 'guide' && (t('modal.composition.clinic_mode_guide_title') || '现场拍摄指导')}
                  {mode === 'mask' && (t('modal.composition.clinic_mode_mask_title') || '局部调色蒙版')}
                </h4>
                {/* 装饰性数据 */}
                <span className="text-[10px] font-mono text-gray-500">AI_CONF: 98%</span>
              </div>
              
              <div className="text-xs text-gray-400 leading-relaxed">
                {mode === 'crop' && (clinic.suggested_crop?.reason || t('modal.composition.clinic_crop_default_reason') || '根据黄金分割法则重新裁剪，去除干扰元素。')}
                
                {mode === 'guide' && (
                  <ul className="list-disc list-inside space-y-1 mt-1 text-gray-300">
                    {clinic.action_guides?.map((g: ActionGuide, i: number) => (
                      <li key={i}>{g.instruction}</li>
                    ))}
                  </ul>
                )}

                {mode === 'mask' && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {clinic.grading_masks?.map((m: GradingMask, i: number) => (
                      <span 
                        key={i} 
                        onMouseEnter={() => setActiveMaskIndex(i)}
                        onMouseLeave={() => setActiveMaskIndex(null)}
                        className={`
                          px-2 py-1 rounded text-[10px] border cursor-pointer transition-colors
                          ${m.action === 'burn' ? 'bg-black border-gray-600 text-gray-300' : 
                            m.action === 'dodge' ? 'bg-white text-black border-white' : 
                            'bg-purple-900/30 border-purple-500 text-purple-200'}
                          ${activeMaskIndex === i ? 'ring-2 ring-offset-1 ring-offset-black ring-blue-500' : ''}
                        `}
                      >
                        {m.action === 'burn' ? '▼ 压暗 (Burn)' : m.action === 'dodge' ? '▲ 提亮 (Dodge)' : '● 调色 (Color)'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          DOCK: 底部控制栏 (Mac 风格悬浮)
         ========================================================= */}
      <div className="h-24 flex items-center justify-center z-40 bg-gradient-to-t from-black via-black/80 to-transparent">
        <div className="flex items-center gap-3 px-4 py-3 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)]">
          <ControlBtn 
            active={mode === 'original'} 
            onClick={() => setMode('original')} 
            icon={<Eye />} 
            label={t('modal.composition.clinic_mode_original') || 'RAW'} 
          />
          <div className="w-px h-8 bg-white/10 mx-1" />
          <ControlBtn 
            active={mode === 'crop'} 
            onClick={() => setMode('crop')} 
            icon={<Crop />} 
            label={t('modal.composition.clinic_mode_crop') || 'CROP'} 
            highlightColor="yellow" 
          />
          <ControlBtn 
            active={mode === 'guide'} 
            onClick={() => setMode('guide')} 
            icon={<Navigation />} 
            label={t('modal.composition.clinic_mode_guide') || 'GUIDE'} 
            highlightColor="cyan" 
          />
          <ControlBtn 
            active={mode === 'mask'} 
            onClick={() => setMode('mask')} 
            icon={<Layers />} 
            label={t('modal.composition.clinic_mode_mask') || 'MASK'} 
            highlightColor="purple" 
          />
        </div>
      </div>

    </div>
  );
};

// --- 辅助函数 ---

/**
 * 根据图标名称返回对应的图标组件
 * @param iconName 图标名称（如 'move_camera', 'remove_object', 'focus_here'）
 * @returns React 图标组件
 */
const getIconForGuide = (iconName: string) => {
  if (iconName.includes('move')) return <Navigation size={12} />;
  if (iconName.includes('remove')) return <XCircle size={12} />;
  return <Crosshair size={12} />;
};

// --- 辅助组件 ---

interface ControlBtnProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactElement;
  label: string;
  highlightColor?: 'white' | 'yellow' | 'cyan' | 'purple';
}

/**
 * 控制按钮组件（Mac Dock 风格）
 */
const ControlBtn: React.FC<ControlBtnProps> = ({ active, onClick, icon, label, highlightColor = 'white' }) => {
  // 动态计算颜色类名
  let activeBg = 'bg-white/10 text-white border-white/20';
  let activeText = 'text-white';
  
  if (active) {
    if (highlightColor === 'yellow') { activeBg = 'bg-yellow-500/20 border-yellow-500/50'; activeText = 'text-yellow-400'; }
    if (highlightColor === 'cyan') { activeBg = 'bg-cyan-500/20 border-cyan-500/50'; activeText = 'text-cyan-400'; }
    if (highlightColor === 'purple') { activeBg = 'bg-purple-500/20 border-purple-500/50'; activeText = 'text-purple-400'; }
  }

  return (
    <button 
      onClick={onClick}
      className={`
        group relative flex flex-col items-center justify-center w-14 h-14 rounded-xl border transition-all duration-300
        ${active ? `${activeBg} scale-105 shadow-lg` : 'border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300'}
      `}
    >
      <div className={`mb-1 ${active ? activeText : 'text-current'} transition-colors`}>
        {React.cloneElement(icon, { size: 20, strokeWidth: 1.5 })}
      </div>
      <span className="text-[9px] font-bold tracking-wider opacity-80">{label}</span>
      
      {/* 底部光点 */}
      {active && (
        <div className={`absolute -bottom-1 w-1 h-1 rounded-full ${
          highlightColor === 'yellow' ? 'bg-yellow-500' :
          highlightColor === 'cyan' ? 'bg-cyan-500' :
          highlightColor === 'purple' ? 'bg-purple-500' : 'bg-white'
        }`} />
      )}
    </button>
  );
};
