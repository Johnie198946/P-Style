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
    console.log('[DirectorViewfinder 2.0]接收到的数据:', {
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
      <div className="flex items-center justify-center h-full text-gray-500 bg-black font-mono text-xs">
        {t('modal.composition.clinic_loading') || '[SYSTEM] WAITING_FOR_DATA_STREAM...'}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white overflow-hidden relative font-sans select-none">
      
      {/* === 顶部：HUD 诊断条 (玻璃拟态) === */}
      <div className="absolute top-4 left-4 right-4 z-30 flex justify-between items-start pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-3 rounded-lg shadow-2xl max-w-2xl flex gap-4">
           <div className="mt-1 relative">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute opacity-75" />
             <div className="w-2 h-2 rounded-full bg-red-500 relative" />
           </div>
           <div>
             <h3 className="text-[10px] font-bold text-red-400 tracking-[0.2em] uppercase mb-1">
               {t('modal.composition.clinic_diagnosis_title') || 'AI DIAGNOSIS'}
             </h3>
             <p className="text-sm font-medium text-gray-200 leading-relaxed shadow-sm">
               {clinic.diagnosis_summary || t('modal.composition.clinic_analyzing') || '正在分析构图问题...'}
             </p>
           </div>
        </div>
      </div>

      {/* === 中间：主视口 (Viewport) === */}
      <div className="flex-1 relative flex items-center justify-center p-4 sm:p-8 overflow-hidden">

        {/* 图片容器：动态适配横图和竖图，确保图片完整显示 */}
        <div
          className="relative shadow-2xl group inline-block"
          style={{
            // 【横竖图适配】根据图片宽高比动态设置最大尺寸
            // 【调整】减小图片尺寸，避免遮挡其他核心信息
            // 横图（aspectRatio > 1）：限制最大宽度为 65vw，高度自适应
            // 竖图（aspectRatio <= 1）：限制最大高度为 65vh，宽度自适应
            maxWidth: imageSize && imageSize.aspectRatio > 1 ? '65vw' : 'none',
            maxHeight: imageSize && imageSize.aspectRatio <= 1 ? '65vh' : 'none',
            // 使用 inline-block 确保容器大小与图片一致
            display: 'inline-block',
          }}
        >
          
          <img 
            ref={imgRef}
            src={userImageUrl} 
            className={`
              block w-auto h-auto object-contain 
              transition-all duration-700 ease-in-out
              ${mode === 'crop' ? 'opacity-30 blur-sm scale-95' : 'opacity-100'}
            `}
            style={{
              // 【横竖图适配】根据图片宽高比设置最大尺寸
              // 【调整】减小图片尺寸，避免遮挡其他核心信息
              // 横图：限制宽度为 65vw，高度自适应
              // 竖图：限制高度为 65vh，宽度自适应
              maxWidth: imageSize && imageSize.aspectRatio > 1 ? '65vw' : 'none',
              maxHeight: imageSize && imageSize.aspectRatio <= 1 ? '65vh' : 'none',
              // 确保图片保持原始宽高比
              display: 'block',
            }}
            alt="Analysis Target"
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

          {/* ---------------------------
             MODE: 智能构图 (CROP) 
             --------------------------- */}
          {mode === 'crop' && clinic.suggested_crop && (
            <div className="absolute inset-0">
               {/* 聚光灯裁剪框 */}
               <div 
                 className="absolute border border-yellow-400/80 z-10 transition-all duration-700"
                 style={{
                   left: `${clinic.suggested_crop.x}%`,
                   top: `${clinic.suggested_crop.y}%`,
                   width: `${clinic.suggested_crop.w}%`,
                   height: `${clinic.suggested_crop.h}%`,
                   boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.85)' // 影院模式遮罩
                 }}
               >
                 {/* 黄金分割线 (极细) */}
                 <div className="w-full h-full grid grid-cols-3 grid-rows-3 opacity-20">
                   <div className="border-r border-yellow-400" />
                   <div className="border-r border-yellow-400" />
                   <div className="border-b border-yellow-400 row-span-1 w-full absolute top-1/3" />
                   <div className="border-b border-yellow-400 row-span-1 w-full absolute top-2/3" />
                 </div>
                 
                 {/* 尺寸标记 */}
                 <div className="absolute -top-5 left-0 text-[9px] text-yellow-500 font-mono tracking-widest bg-black px-1">
                   {t('modal.composition.clinic_crop_preview') || 'AI_REFRAME_RATIO'}
                 </div>
               </div>

               {/* 右下角浮动说明卡片 */}
               <div className="absolute bottom-10 right-10 max-w-xs bg-yellow-950/90 backdrop-blur border-l-2 border-yellow-400 p-4 shadow-2xl z-20 animate-in slide-in-from-right-4">
                  <div className="text-yellow-400 text-xs font-bold mb-1 flex items-center gap-2">
                    <Crop size={12} /> {t('modal.composition.clinic_mode_crop_title') || '构图建议'}
                  </div>
                  <div className="text-xs text-gray-200">
                    {clinic.suggested_crop.reason || t('modal.composition.clinic_crop_default_reason') || 'AI 建议通过二次构图改善画面结构'}
                  </div>
               </div>
            </div>
          )}

          {/* ---------------------------
             MODE: 拍摄指导 (GUIDE) - AR 风格
             --------------------------- */}
          {mode === 'guide' && clinic.action_guides?.map((guide: ActionGuide, idx: number) => (
            <div 
              key={idx}
              className="absolute z-20"
              style={{ left: `${guide.x}%`, top: `${guide.y}%` }}
            >
              {/* AR 锚点：一个脉冲的圆圈，表示"这里有问题" */}
              <div className="relative group">
                {/* 脉冲光环 */}
                <div className="absolute -inset-4 bg-cyan-500/20 rounded-full animate-ping pointer-events-none" />
                <div className="absolute -inset-1 bg-cyan-500/10 rounded-full border border-cyan-500/30 w-full h-full animate-[spin_10s_linear_infinite]" />
                
                {/* 核心图标按钮 */}
                <div className="relative flex items-center justify-center w-8 h-8 bg-black/80 backdrop-blur rounded-full border border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)] cursor-help hover:scale-110 transition-transform">
                  {getIconForGuide(guide.icon)}
                </div>

                {/* 连接线 + 指令卡片 (一直显示，制造科技感) */}
                <div className="absolute left-full top-1/2 ml-4 -translate-y-1/2 flex items-center gap-0 w-64">
                   {/* 连接线 */}
                   <div className="w-4 h-[1px] bg-cyan-400/50" />
                   <div className="w-1 h-1 bg-cyan-400 rounded-full" />
                   
                   {/* 卡片内容 */}
                   <div className="bg-black/80 backdrop-blur border-l-2 border-cyan-400 px-3 py-2 ml-2 shadow-xl">
                      <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-0.5">
                        {guide.icon.replace('_', ' ')}
                      </div>
                      <div className="text-xs text-white font-medium">
                        {guide.instruction}
                      </div>
                   </div>
                </div>

                {/* 动态 AR 箭头 (如果是移动指令) */}
                {guide.icon.includes('move') && (
                  <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 pointer-events-none" 
                       style={{ transform: `translate(-50%, -50%) rotate(${guide.vector_angle || 0}deg)` }}>
                    <defs>
                      <marker id={`arrow-cyan-${idx}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L6,3 z" fill="#22d3ee" />
                      </marker>
                    </defs>
                    {/* 箭头路径 */}
                    <line x1="16" y1="16" x2="100" y2="16" stroke="#22d3ee" strokeWidth="1.5" markerEnd={`url(#arrow-cyan-${idx})`} strokeDasharray="6 3" className="animate-[dash_1s_linear_infinite]" />
                  </svg>
                )}
              </div>
            </div>
          ))}

          {/* ---------------------------
             MODE: 后期蒙版 (MASK) - Photoshop 图层风格
             --------------------------- */}
          {mode === 'mask' && (
            <>
              <svg 
                className="absolute inset-0 z-10 pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{
                  // 【横竖图适配】确保 SVG 覆盖整个图片区域
                  width: '100%',
                  height: '100%',
                }}
              >
                <defs>
                  {/* 高级纹理：斜线 (Burn) */}
                  <pattern id="pattern-burn-hd" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="2" height="4" transform="translate(0,0)" fill="#000" fillOpacity="0.8" />
                  </pattern>
                  {/* 高级纹理：网格 (Dodge) */}
                  <pattern id="pattern-dodge-hd" width="4" height="4" patternUnits="userSpaceOnUse">
                     <circle cx="1" cy="1" r="1" fill="#fff" fillOpacity="0.8" />
                  </pattern>
                </defs>

                {clinic.grading_masks?.map((mask: GradingMask, idx: number) => {
                   const isActive = activeMaskIndex === idx || activeMaskIndex === null; // 默认全显示，Hover时单显
                   // 【修复】确保 polygon points 格式正确（数字，不是百分比字符串）
                   const points = mask.area_polygon.map((p: { x: number; y: number }) => {
                     // 确保是数字类型，如果是字符串百分比则转换
                     const x = typeof p.x === 'string' ? parseFloat(p.x.replace('%', '')) : p.x;
                     const y = typeof p.y === 'string' ? parseFloat(p.y.replace('%', '')) : p.y;
                     return `${x},${y}`;
                   }).join(' ');
                   const isBurn = mask.action === 'burn';
                   const isDodge = mask.action === 'dodge';
                   
                   return (
                     <g key={idx} 
                        className={`transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-10'}`}
                     >
                       {/* 轮廓线 (像选区蚂蚁线) */}
                       <polygon 
                         points={points} 
                         fill={isBurn ? 'url(#pattern-burn-hd)' : isDodge ? 'url(#pattern-dodge-hd)' : 'rgba(236, 72, 153, 0.2)'}
                         stroke={isBurn ? 'black' : isDodge ? 'white' : '#ec4899'}
                         strokeWidth="1.5"
                         strokeDasharray="4 2"
                         className="animate-[dash_20s_linear_infinite]"
                       />
                     </g>
                   )
                })}
              </svg>

              {/* 悬浮图层控制面板 (类似 Photoshop) */}
              <div className="absolute top-4 right-4 w-64 bg-[#1a1a1a] border border-gray-800 rounded-lg shadow-2xl overflow-hidden z-30 animate-in slide-in-from-right">
                <div className="bg-gray-800 px-3 py-2 text-[10px] text-gray-400 font-bold tracking-widest border-b border-gray-700 flex items-center gap-2">
                   <Layers size={12} /> {t('modal.composition.clinic_mode_mask_title') || 'GRADING LAYERS'}
                </div>
                <div className="flex flex-col">
                  {clinic.grading_masks?.map((mask: GradingMask, idx: number) => (
                    <div 
                      key={idx}
                      onMouseEnter={() => setActiveMaskIndex(idx)}
                      onMouseLeave={() => setActiveMaskIndex(null)}
                      className={`
                        px-3 py-3 border-b border-gray-800 cursor-pointer flex items-center gap-3 transition-colors
                        ${activeMaskIndex === idx ? 'bg-purple-900/30' : 'hover:bg-gray-800'}
                      `}
                    >
                      {/* 图标 */}
                      <div className={`p-1.5 rounded ${mask.action === 'burn' ? 'bg-black text-white' : mask.action === 'dodge' ? 'bg-white text-black' : 'bg-pink-500 text-white'}`}>
                         {mask.action === 'burn' ? <Moon size={12}/> : mask.action === 'dodge' ? <Sun size={12}/> : <Palette size={12}/>}
                      </div>
                      
                      {/* 文字 */}
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-xs font-bold text-gray-200 capitalize">{mask.action} Layer</span>
                          <span className="text-[9px] text-gray-500 font-mono">OP: 40%</span>
                        </div>
                        <div className="text-[10px] text-gray-400 line-clamp-2 leading-tight">
                          {mask.advice}
                        </div>
                      </div>
                      
                      <Eye size={12} className={activeMaskIndex === idx ? 'text-purple-400' : 'text-gray-600'} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {/* === 底部：模式切换 (Mac Dock 风格) === */}
      <div className="h-24 bg-[#050505] border-t border-white/5 flex items-center justify-center gap-4 z-40">
        <ControlBtn 
          active={mode === 'original'} 
          onClick={() => setMode('original')} 
          icon={<Eye />} 
          label={t('modal.composition.clinic_mode_original') || 'RAW PREVIEW'} 
        />
        <div className="w-px h-8 bg-gray-800 mx-2" />
        <ControlBtn 
          active={mode === 'crop'} 
          onClick={() => setMode('crop')} 
          icon={<Crop />} 
          label={t('modal.composition.clinic_mode_crop') || 'COMPOSITION'} 
          highlightColor="yellow" 
        />
        <ControlBtn 
          active={mode === 'guide'} 
          onClick={() => setMode('guide')} 
          icon={<Navigation />} 
          label={t('modal.composition.clinic_mode_guide') || 'AR GUIDE'} 
          highlightColor="cyan" 
        />
        <ControlBtn 
          active={mode === 'mask'} 
          onClick={() => setMode('mask')} 
          icon={<Layers />} 
          label={t('modal.composition.clinic_mode_mask') || 'GRADING'} 
          highlightColor="purple" 
        />
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
  if (iconName.includes('move')) return <Navigation size={14} className="text-cyan-400" />;
  if (iconName.includes('remove')) return <X size={14} className="text-red-400" />;
  if (iconName.includes('focus')) return <Crosshair size={14} className="text-cyan-400" />;
  return <Camera size={14} className="text-cyan-400" />;
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
  const activeClass = active ? 'bg-white/10 text-white scale-105 border-white/20' : 'text-gray-500 border-transparent hover:text-gray-300';
  const glowClass = active && highlightColor !== 'white' ? `shadow-[0_0_20px_-5px_var(--${highlightColor}-color)]` : '';
  
  // Tailwind 动态颜色映射
  const colorMap: Record<string, string> = { 
    yellow: 'text-yellow-400', 
    cyan: 'text-cyan-400', 
    purple: 'text-purple-400', 
    white: 'text-white' 
  };
  const textColor = active ? colorMap[highlightColor] : 'text-gray-500';

  return (
    <button 
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center w-16 h-16 rounded-2xl border transition-all duration-300
        ${activeClass} ${glowClass}
      `}
    >
      <div className={`mb-1.5 ${textColor}`}>
        {React.cloneElement(icon, { size: 22, strokeWidth: 1.5 })}
      </div>
      <span className="text-[9px] font-bold tracking-wider">{label}</span>
    </button>
  );
};
