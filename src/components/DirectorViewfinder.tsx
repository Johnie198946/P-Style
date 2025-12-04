import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Crop, Move, Zap, Eye, Check, X,
  ArrowRight, Camera, XCircle, Sun, Moon, Palette, Layers, Navigation, Crosshair,
  Scan, Target, Activity, Grid, ChevronRight, Maximize2
} from 'lucide-react';
import { useLanguage } from '../src/contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';

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
  pre_shoot_guidance?: {
    camera_position?: string;
    angle_adjustment?: string;
    element_management?: string;
  };
  post_processing?: {
    crop_ratio?: string;
    crop_instruction?: string;
    geometry_correction?: string;
  };
}

// ============================================================================
// 【诊疗室 UI 3.0 - Quantum Surgical Theatre】
// 设计理念：融合医疗手术室的精密感 + 科幻电影的全息投影 + 专业摄影工作室的高端感
// ============================================================================

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
  // 【信息面板展开状态】
  const [infoPanelExpanded, setInfoPanelExpanded] = useState(true);

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
      <div className="flex flex-col items-center justify-center h-full bg-[#030303] font-mono">
        {/* 加载动画 - 全息扫描效果 */}
        <div className="relative w-32 h-32 mb-8">
          <motion.div 
            className="absolute inset-0 border border-blue-500/30 rounded-full"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute inset-0 border border-cyan-500/30 rounded-full"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity size={32} className="text-blue-500 animate-pulse" />
          </div>
        </div>
        <div className="text-blue-400 text-xs tracking-[0.3em] uppercase animate-pulse">
          {t('modal.composition.clinic_loading') || 'INITIALIZING SURGICAL THEATRE'}
        </div>
        <div className="mt-2 text-gray-600 text-[10px] tracking-widest">
          AWAITING DATA STREAM...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#030303] text-white overflow-hidden relative font-sans select-none">
      
      {/* =========================================================
          背景装饰层 - 科技网格 + 渐变氛围
         ========================================================= */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 网格背景 */}
        <div 
          className="absolute inset-0 opacity-[0.02]" 
          style={{ 
            backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
            backgroundSize: '50px 50px' 
          }} 
        />
        {/* 角落渐变光晕 */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      {/* =========================================================
          LEFT: 主视口 (沉浸式画布)
         ========================================================= */}
      <div className="flex-1 relative flex flex-col">
        
        {/* 顶部状态栏 - 手术室风格 */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-white/5 bg-black/40 backdrop-blur-sm z-10">
          <div className="flex items-center gap-4">
            {/* 系统状态 */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
              <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase">
                {t('modal.composition.clinic_analyzing') || 'SURGICAL MODE ACTIVE'}
              </span>
            </div>
            {/* 分隔线 */}
            <div className="w-px h-4 bg-white/10" />
            {/* 模式标签 */}
            <div className="text-[10px] text-gray-500 font-mono tracking-widest">
              {mode === 'original' && 'BASELINE VIEW'}
              {mode === 'crop' && 'REFRAME ANALYSIS'}
              {mode === 'guide' && 'AR GUIDANCE'}
              {mode === 'mask' && 'GRADING ZONES'}
            </div>
          </div>
          
          {/* 右侧信息 */}
          <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500">
            <span>RES: {imageSize ? `${imageSize.width}×${imageSize.height}` : '...'}</span>
            <span>AI_CONF: 98.7%</span>
          </div>
        </div>

        {/* 图片视口 */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden p-8">

        {/* 图片容器 */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          style={{
            // 【横竖图适配】根据图片宽高比动态设置最大尺寸
              maxWidth: imageSize && imageSize.aspectRatio > 1 ? '70%' : 'none',
              maxHeight: imageSize && imageSize.aspectRatio <= 1 ? '70vh' : 'none',
          }}
        >
            {/* 外框装饰 - 高端相框效果 */}
            <div className="absolute -inset-4 border border-white/5 rounded-lg pointer-events-none" />
            <div className="absolute -inset-8 border border-white/[0.02] rounded-xl pointer-events-none" />
            
            {/* 角标装饰 */}
            <CornerBracket position="top-left" />
            <CornerBracket position="top-right" />
            <CornerBracket position="bottom-left" />
            <CornerBracket position="bottom-right" />
          
          <img 
            ref={imgRef}
            src={userImageUrl} 
            className={`
                block max-w-full max-h-[70vh] w-auto h-auto object-contain 
              transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]
              ${mode === 'crop' ? 'opacity-30 blur-sm scale-[0.98]' : 'opacity-100'}
                shadow-2xl
            `}
            style={{
                maxWidth: imageSize && imageSize.aspectRatio > 1 ? '100%' : 'none',
                maxHeight: imageSize && imageSize.aspectRatio <= 1 ? '70vh' : 'none',
            }}
            alt="Target"
            onLoad={() => {
              // 图片加载完成后触发尺寸检测
              if (imgRef.current) {
                const img = imgRef.current;
                setImageSize({
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    aspectRatio: img.naturalWidth / img.naturalHeight
                });
              }
            }}
          />

            {/* MODE: 智能构图 (CROP) - 影院聚光灯效果 */}
            <AnimatePresence>
          {mode === 'crop' && clinic.suggested_crop && (
                <motion.div 
                  className="absolute inset-0 z-20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
               {/* 裁剪框 */}
                  <motion.div 
                    className="absolute border-2 border-amber-400/90"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                 style={{
                   left: `${clinic.suggested_crop.x}%`,
                   top: `${clinic.suggested_crop.y}%`,
                   width: `${clinic.suggested_crop.w}%`,
                   height: `${clinic.suggested_crop.h}%`,
                   // 核心：利用超大阴影制造聚光灯效果，遮蔽周围
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.88)' 
                 }}
               >
                    {/* 三分线网格 */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                      {[...Array(9)].map((_, i) => (
                        <div key={i} className="border border-amber-400/20" />
                      ))}
                 </div>
                 
                    {/* 角标装饰 - 更精致 */}
                    <div className="absolute -top-0.5 -left-0.5 w-4 h-4 border-t-2 border-l-2 border-amber-400"/>
                    <div className="absolute -top-0.5 -right-0.5 w-4 h-4 border-t-2 border-r-2 border-amber-400"/>
                    <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 border-b-2 border-l-2 border-amber-400"/>
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 border-b-2 border-r-2 border-amber-400"/>
                 
                 {/* 尺寸标记 */}
                    <div className="absolute -top-8 left-0 flex items-center gap-2">
                      <div className="text-[10px] text-amber-400 font-mono tracking-widest bg-black/80 px-2 py-1 rounded border border-amber-400/30">
                        <Crop size={10} className="inline mr-1" />
                   {t('modal.composition.clinic_crop_preview') || 'AI REFRAME'}
                  </div>
               </div>
                  </motion.div>
                </motion.div>
          )}
            </AnimatePresence>

            {/* MODE: 拍摄指导 (GUIDE) - AR 增强现实风格 */}
            <AnimatePresence>
          {mode === 'guide' && clinic.action_guides?.map((guide: ActionGuide, idx: number) => (
                <motion.div 
              key={idx}
              className="absolute z-30"
              style={{ left: `${guide.x}%`, top: `${guide.y}%` }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.1 }}
            >
              <div className="relative group cursor-help">
                    {/* 锚点 - 全息投影感 */}
                <div className="absolute -translate-x-1/2 -translate-y-1/2">
                      <motion.div 
                        className="w-16 h-16 border border-cyan-500/40 rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      />
                      <motion.div 
                        className="absolute inset-2 border border-cyan-500/30 rounded-full"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                      />
                   <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_15px_#22d3ee,0_0_30px_#22d3ee50]" />
                   </div>
                </div>

                    {/* 动态箭头 (如果是移动指令) */}
                {guide.icon.includes('move') && (
                      <motion.svg 
                        className="absolute top-0 left-0 w-32 h-32 pointer-events-none" 
                    style={{ 
                      transform: `translate(-50%, -50%) rotate(${guide.vector_angle || 0}deg)`,
                    }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.8 }}
                  >
                    <defs>
                      <marker id={`arrow-${idx}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L6,3 z" fill="#22d3ee" />
                      </marker>
                          <filter id={`glow-${idx}`}>
                            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                            <feMerge>
                              <feMergeNode in="coloredBlur"/>
                              <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                          </filter>
                    </defs>
                        <motion.line 
                          x1="20" 
                      y1="20" 
                          x2="70" 
                      y2="20" 
                      stroke="#22d3ee" 
                          strokeWidth="2" 
                      markerEnd={`url(#arrow-${idx})`} 
                          filter={`url(#glow-${idx})`}
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.5, delay: idx * 0.1 + 0.3 }}
                    />
                      </motion.svg>
                )}

                    {/* 悬浮指令卡片 */}
                    <div className="absolute left-8 top-8 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto transform group-hover:translate-x-1">
                      <div className="bg-[#0a0a0a]/95 backdrop-blur-xl border border-cyan-500/30 pl-4 py-3 pr-5 rounded-lg shadow-2xl min-w-[200px]">
                        <div className="flex items-center gap-2 text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-1.5">
                        {getIconForGuide(guide.icon)}
                          <span>{guide.icon.replace(/_/g, ' ')}</span>
                      </div>
                        <div className="text-sm text-white font-medium leading-relaxed">
                        {guide.instruction}
                      </div>
                   </div>
                </div>
              </div>
                </motion.div>
          ))}
            </AnimatePresence>

            {/* MODE: 后期蒙版 (MASK) - 工程图纸风格 */}
            <AnimatePresence>
          {mode === 'mask' && (
                <motion.svg 
              className="absolute inset-0 w-full h-full z-20 pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
              >
                <defs>
                {/* 纹理：Burn (黑色斜线) */}
                    <pattern id="pattern-burn" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <rect width="3" height="6" fill="black" fillOpacity="0.7" />
                </pattern>
                {/* 纹理：Dodge (白色点阵) */}
                    <pattern id="pattern-dodge" width="5" height="5" patternUnits="userSpaceOnUse">
                      <circle cx="2.5" cy="2.5" r="1" fill="white" fillOpacity="0.7" />
                  </pattern>
                    {/* 纹理：Color (渐变) */}
                    <linearGradient id="gradient-color" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ec4899" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
                    </linearGradient>
                </defs>

                {clinic.grading_masks?.map((mask: GradingMask, idx: number) => {
                 const isActive = activeMaskIndex === idx || activeMaskIndex === null;
                   // 【修复】确保 polygon points 格式正确（数字，不是百分比字符串）
                   const points = mask.area_polygon.map((p: { x: number; y: number }) => {
                     const x = typeof p.x === 'string' ? parseFloat(p.x.replace('%', '')) : p.x;
                     const y = typeof p.y === 'string' ? parseFloat(p.y.replace('%', '')) : p.y;
                     return `${x},${y}`;
                   }).join(' ');
                 
                    let fillUrl = 'url(#gradient-color)';
                 let strokeColor = '#ec4899';
                    if (mask.action === 'burn') { fillUrl = 'url(#pattern-burn)'; strokeColor = 'rgba(50,50,50,0.8)'; }
                 if (mask.action === 'dodge') { fillUrl = 'url(#pattern-dodge)'; strokeColor = 'rgba(255,255,255,0.8)'; }
                   
                   return (
                      <motion.g 
                     key={idx} 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isActive ? 1 : 0.15 }}
                        transition={{ duration: 0.3 }}
                     >
                       <polygon 
                         points={points} 
                       fill={fillUrl}
                       stroke={strokeColor}
                          strokeWidth="0.8"
                          strokeDasharray="3 2"
                       />
                      </motion.g>
                 );
                })}
                </motion.svg>
          )}
            </AnimatePresence>

          </motion.div>
        </div>

        {/* 底部控制栏 */}
        <div className="h-20 flex items-center justify-center border-t border-white/5 bg-black/40 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/5 rounded-2xl">
        <ControlBtn 
          active={mode === 'original'} 
          onClick={() => setMode('original')} 
          icon={<Eye />} 
              label={t('modal.composition.clinic_mode_original') || 'ORIGINAL'} 
        />
            <div className="w-px h-6 bg-white/10 mx-1" />
        <ControlBtn 
          active={mode === 'crop'} 
          onClick={() => setMode('crop')} 
          icon={<Crop />} 
              label={t('modal.composition.clinic_mode_crop') || 'REFRAME'} 
              highlightColor="amber" 
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

      {/* =========================================================
          RIGHT: 信息面板 (可折叠)
         ========================================================= */}
      <motion.div 
        className="w-[380px] border-l border-white/5 bg-[#080808] flex flex-col overflow-hidden"
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {/* 面板头部 */}
        <div className="p-5 border-b border-white/5 bg-gradient-to-r from-[#0a0a0a] to-[#080808]">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-red-500/10 rounded-lg">
              <Activity size={14} className="text-red-400" />
            </div>
            <span className="text-[10px] font-bold text-red-400 tracking-[0.2em] uppercase">
              {t('modal.composition.clinic_diagnosis_title') || 'SURGICAL DIAGNOSIS'}
            </span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">
            {clinic.diagnosis_summary || t('modal.composition.clinic_analyzing') || '正在分析构图问题...'}
          </p>
        </div>

        {/* 可滚动内容区 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
          
          {/* 当前模式详情 */}
          <AnimatePresence mode="wait">
            {mode === 'crop' && clinic.suggested_crop && (
              <motion.div
                key="crop-info"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <SectionHeader icon={<Crop size={12} />} title={t('modal.composition.clinic_mode_crop_title') || 'AI REFRAME'} color="amber" />
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {clinic.suggested_crop.reason || t('modal.composition.clinic_crop_default_reason') || '根据黄金分割法则重新裁剪，去除干扰元素。'}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <DataChip label="X" value={`${clinic.suggested_crop.x}%`} />
                    <DataChip label="Y" value={`${clinic.suggested_crop.y}%`} />
                    <DataChip label="W" value={`${clinic.suggested_crop.w}%`} />
                    <DataChip label="H" value={`${clinic.suggested_crop.h}%`} />
                  </div>
                </div>
              </motion.div>
            )}

            {mode === 'guide' && clinic.action_guides && clinic.action_guides.length > 0 && (
              <motion.div
                key="guide-info"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <SectionHeader icon={<Navigation size={12} />} title={t('modal.composition.clinic_mode_guide_title') || 'AR GUIDANCE'} color="cyan" />
                <div className="space-y-3">
                  {clinic.action_guides.map((guide: ActionGuide, idx: number) => (
                    <div key={idx} className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 bg-cyan-500/20 rounded">
                          {getIconForGuide(guide.icon)}
                        </div>
                        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                          {guide.icon.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {guide.instruction}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {mode === 'mask' && clinic.grading_masks && clinic.grading_masks.length > 0 && (
              <motion.div
                key="mask-info"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <SectionHeader icon={<Layers size={12} />} title={t('modal.composition.clinic_mode_mask_title') || 'GRADING ZONES'} color="purple" />
                <div className="space-y-3">
                  {clinic.grading_masks.map((mask: GradingMask, idx: number) => (
                    <div 
                      key={idx} 
                      className={`border rounded-xl p-4 cursor-pointer transition-all ${
                        activeMaskIndex === idx 
                          ? 'bg-purple-500/10 border-purple-500/40' 
                          : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                      }`}
                      onMouseEnter={() => setActiveMaskIndex(idx)}
                      onMouseLeave={() => setActiveMaskIndex(null)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <MaskBadge action={mask.action} />
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {mask.advice || `Apply ${mask.action} adjustment to this area`}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {mode === 'original' && (
              <motion.div
                key="original-info"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <SectionHeader icon={<Eye size={12} />} title="BASELINE VIEW" color="gray" />
                <p className="text-sm text-gray-500 leading-relaxed">
                  {t('modal.composition.clinic_guide_default_text') || '选择上方的模式查看 AI 构图分析结果。'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 前期指导 */}
          {clinic.pre_shoot_guidance && (
            <div className="space-y-3">
              <SectionHeader icon={<Camera size={12} />} title={t('modal.composition.clinic_pre_shoot_title') || 'PRE-SHOOT GUIDANCE'} color="blue" />
              <div className="space-y-2">
                {clinic.pre_shoot_guidance.camera_position && (
                  <InfoRow label={t('modal.composition.clinic_camera_position') || 'Camera Position'} value={clinic.pre_shoot_guidance.camera_position} />
                )}
                {clinic.pre_shoot_guidance.angle_adjustment && (
                  <InfoRow label={t('modal.composition.clinic_angle_adjustment') || 'Angle Adjustment'} value={clinic.pre_shoot_guidance.angle_adjustment} />
                )}
                {clinic.pre_shoot_guidance.element_management && (
                  <InfoRow label={t('modal.composition.clinic_element_management') || 'Element Management'} value={clinic.pre_shoot_guidance.element_management} />
                )}
              </div>
            </div>
          )}

          {/* 后期处理 */}
          {clinic.post_processing && (
            <div className="space-y-3">
              <SectionHeader icon={<Palette size={12} />} title={t('modal.composition.clinic_post_processing_title') || 'POST-PROCESSING'} color="pink" />
              <div className="space-y-2">
                {clinic.post_processing.crop_ratio && (
                  <InfoRow label={t('modal.composition.clinic_crop_ratio_label') || 'Aspect Ratio'} value={clinic.post_processing.crop_ratio} />
                )}
                {clinic.post_processing.crop_instruction && (
                  <InfoRow label={t('modal.composition.clinic_crop_instruction') || 'Crop Strategy'} value={clinic.post_processing.crop_instruction} />
                )}
                {clinic.post_processing.geometry_correction && (
                  <InfoRow label={t('modal.composition.clinic_geometry_correction') || 'Geometry'} value={clinic.post_processing.geometry_correction} />
                )}
              </div>
            </div>
          )}

        </div>
      </motion.div>

    </div>
  );
};

// ============================================================================
// 辅助组件
// ============================================================================

/** 角标装饰组件 */
const CornerBracket: React.FC<{ position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }> = ({ position }) => {
  const positionClasses = {
    'top-left': '-top-2 -left-2 border-t border-l',
    'top-right': '-top-2 -right-2 border-t border-r',
    'bottom-left': '-bottom-2 -left-2 border-b border-l',
    'bottom-right': '-bottom-2 -right-2 border-b border-r',
  };
  
  return (
    <div className={`absolute w-6 h-6 border-white/20 pointer-events-none ${positionClasses[position]}`} />
  );
};

/** 区块标题组件 */
const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; color: string }> = ({ icon, title, color }) => {
  const colorClasses: Record<string, string> = {
    amber: 'text-amber-400 bg-amber-500/10',
    cyan: 'text-cyan-400 bg-cyan-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    pink: 'text-pink-400 bg-pink-500/10',
    gray: 'text-gray-400 bg-gray-500/10',
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className={`p-1 rounded ${colorClasses[color]}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-bold tracking-[0.15em] uppercase ${colorClasses[color].split(' ')[0]}`}>
        {title}
      </span>
    </div>
  );
};

/** 数据标签组件 */
const DataChip: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2">
    <span className="text-[10px] text-gray-500 font-mono">{label}</span>
    <span className="text-xs text-amber-400 font-mono font-medium">{value}</span>
  </div>
);

/** 信息行组件 */
const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</div>
    <div className="text-sm text-gray-300 leading-relaxed">{value}</div>
  </div>
);

/** 蒙版类型标签 */
const MaskBadge: React.FC<{ action: string }> = ({ action }) => {
  if (action === 'burn') {
    return (
      <span className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-[10px] text-gray-300 font-bold">
        ▼ BURN (压暗)
      </span>
    );
  }
  if (action === 'dodge') {
    return (
      <span className="px-2 py-1 bg-white border border-gray-300 rounded text-[10px] text-gray-900 font-bold">
        ▲ DODGE (提亮)
      </span>
    );
  }
  return (
    <span className="px-2 py-1 bg-purple-900/50 border border-purple-500/50 rounded text-[10px] text-purple-200 font-bold">
      ● COLOR (调色)
    </span>
  );
};

/** 根据图标名称返回对应的图标组件 */
const getIconForGuide = (iconName: string) => {
  if (iconName.includes('move')) return <Navigation size={12} className="text-cyan-400" />;
  if (iconName.includes('remove')) return <XCircle size={12} className="text-cyan-400" />;
  return <Crosshair size={12} className="text-cyan-400" />;
};

// ============================================================================
// 控制按钮组件
// ============================================================================

interface ControlBtnProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactElement;
  label: string;
  highlightColor?: 'white' | 'amber' | 'cyan' | 'purple';
}

const ControlBtn: React.FC<ControlBtnProps> = ({ active, onClick, icon, label, highlightColor = 'white' }) => {
  // 动态计算颜色类名
  const colorMap: Record<string, { bg: string; text: string; glow: string }> = {
    white: { bg: 'bg-white/10', text: 'text-white', glow: 'shadow-white/20' },
    amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', glow: 'shadow-amber-500/30' },
    cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', glow: 'shadow-cyan-500/30' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', glow: 'shadow-purple-500/30' },
  };
  
  const colors = colorMap[highlightColor];

  return (
    <button 
      onClick={onClick}
      className={`
        group relative flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-300
        ${active 
          ? `${colors.bg} ${colors.text} shadow-lg ${colors.glow}` 
          : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
        }
      `}
    >
      <div className="mb-1 transition-transform group-hover:scale-110">
        {React.cloneElement(icon, { size: 18, strokeWidth: 1.5 })}
      </div>
      <span className="text-[9px] font-bold tracking-wider">{label}</span>
      
      {/* 底部光点 */}
      {active && (
        <motion.div 
          className={`absolute -bottom-1 w-1.5 h-1.5 rounded-full ${
            highlightColor === 'amber' ? 'bg-amber-400' :
            highlightColor === 'cyan' ? 'bg-cyan-400' :
            highlightColor === 'purple' ? 'bg-purple-400' : 'bg-white'
          }`}
          layoutId="activeIndicator"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  );
};
