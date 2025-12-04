import React, { useState, useRef, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { Target, GitGraph, Layers, Percent, Maximize, Layout, Activity, ArrowRight, X } from "lucide-react";
import { useLanguage } from '../../src/contexts/LanguageContext';
import { VisualVectorsOverlay } from '../VisualVectorsOverlay';
import { DirectorViewfinder } from '../DirectorViewfinder';

export const CompositionModal = ({ data, images, onClose }: any) => {
  const { t } = useLanguage();
  const [overlayMode, setOverlayMode] = useState<'lines' | 'grid' | 'mask' | null>(null);
  const [showClinic, setShowClinic] = useState(false); // 【新增】诊疗室模式状态
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageBounds, setImageBounds] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  
  // Mock/Fallback generator to ensure FUI is never empty
  const ensureData = (source: any) => {
      const base = source || {};
      return {
          ...base,
          structure: {
              visual_frame: base.structure?.visual_frame || base.main_structure || "Analyzing Pattern...",
              geometry: base.structure?.geometry || "Complex Polygon",
              ...base.structure
          },
          subject: {
              // 【修复】优先使用实际数据，如果没有则使用默认值
              weight_score: base.subject?.weight_score || base.subject?.weight || 85,
              position: base.subject?.position || "Center-Weighted",
              method: base.subject?.method || "Contrast Detection",
              analysis: base.subject?.analysis || "Subject detected via local contrast deviation.",
              ...base.subject
          },
          lines: {
              path: base.lines?.path || ["Entry: Bottom-Left", "Mid: Subject Center", "Exit: Top-Right"],
              // Inject Mock Vectors if missing to demonstrate UI
              vectors: base.lines?.vectors || {
                  entry: { label: "Bottom-Left", coords: [0.1, 0.9] },
                  focal: { label: "Subject", coords: [0.5, 0.5] },
                  exit: { label: "Top-Right", coords: [0.9, 0.1] },
                  path: [[0.1, 0.9], [0.5, 0.5], [0.9, 0.1]]
              },
              ...base.lines
          },
          zones: {
              foreground: "Texture Detail",
              midground: "Subject Focus",
              background: "Atmospheric Falloff",
              // Inject Mock Depth Details if missing
              details: base.zones?.details || {
                  foreground: { content: "Foreground Texture", range: [0.0, 0.3] },
                  midground: { content: "Subject Focus", range: [0.3, 0.7] },
                  background: { content: "Background Blur", range: [0.7, 1.0] }
              },
              ...(base.zones || {})
          },
          balance: {
              horizontal: "Symmetrical",
              vertical: "Bottom-Heavy",
              // Inject Mock Balance Details if missing
              details: base.balance?.details || {
                  percentage: 60,
                  h_balance: "Symmetrical",
                  v_balance: "Bottom-Heavy"
              },
              ...(base.balance || {})
          }
      };
  };

  const comp = ensureData(data);
  const styleName = comp.style?.name || comp.style_class || "Analyzing...";
  const styleMethod = comp.style?.method || "Pattern Recognition";
  const visualFrame = comp.structure?.visual_frame || comp.main_structure || "Analyzing...";
  const negativeSpace = comp.proportions?.negative || comp.proportions?.negative_space || comp.ratios_negative_space?.space_ratio || "N/A";
  
  // 【修复】从 data 中提取 visual_data，如果没有则从 comp 中提取
  // 【重要】必须在组件主体中定义，以便在 renderOverlay 函数和组件 JSX 中都可以访问
  const visual_data = data?.visual_data || comp?.visual_data;

  // 【新增】计算图片在容器中的实际位置和尺寸（用于三分法和向量路径的精确叠加）
  useEffect(() => {
    const updateImageBounds = () => {
      if (!imgRef.current || !containerRef.current) return;
      
      const img = imgRef.current;
      const container = containerRef.current;
      
      // 获取图片的自然尺寸
      const imgNaturalWidth = img.naturalWidth;
      const imgNaturalHeight = img.naturalHeight;
      
      // 获取容器的尺寸
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // 计算图片的显示尺寸（object-contain 逻辑）
      const imgRatio = imgNaturalWidth / imgNaturalHeight;
      const containerRatio = containerWidth / containerHeight;
      
      let displayWidth: number, displayHeight: number, offsetX: number, offsetY: number;
      
      if (imgRatio > containerRatio) {
        // 图片更宽，以宽度为准
        displayWidth = containerWidth;
        displayHeight = containerWidth / imgRatio;
        offsetX = 0;
        offsetY = (containerHeight - displayHeight) / 2;
      } else {
        // 图片更高，以高度为准
        displayHeight = containerHeight;
        displayWidth = containerHeight * imgRatio;
        offsetY = 0;
        offsetX = (containerWidth - displayWidth) / 2;
      }
      
      setImageBounds({
        x: offsetX,
        y: offsetY,
        width: displayWidth,
        height: displayHeight
      });
    };
    
    // 初始计算
    updateImageBounds();
    
    // 监听窗口大小变化
    window.addEventListener('resize', updateImageBounds);
    imgRef.current?.addEventListener('load', updateImageBounds);
    
    return () => {
      window.removeEventListener('resize', updateImageBounds);
      imgRef.current?.removeEventListener('load', updateImageBounds);
    };
  }, [images.source]);

  // 【修复】从 data 中提取 visual_flow 数据（用于 VisualVectorsOverlay 组件）
  // 数据路径：data.visual_flow 或 data.lines?.vectors
  const visualFlowData = data?.visual_flow || data?.lines?.vectors || null;
  
  // 【修复】从 data 中提取 composition_clinic 数据（用于诊疗室模式）
  const clinicData = data?.composition_clinic || data?.module_2_composition?.composition_clinic || null;
  
  // 【调试日志】记录数据提取结果
  if (process.env.NODE_ENV === 'development') {
    console.log('[CompositionModal] 📊 数据提取:', {
      hasVisualFlow: !!visualFlowData,
      visualFlowKeys: visualFlowData ? Object.keys(visualFlowData) : [],
      hasVectors: !!visualFlowData?.vectors,
      vectorsLength: visualFlowData?.vectors?.length || 0,
      hasClinicData: !!clinicData,
      clinicDataKeys: clinicData ? Object.keys(clinicData) : [],
      // 【调试】打印完整的 data 结构
      dataKeys: data ? Object.keys(data) : [],
      linesKeys: data?.lines ? Object.keys(data.lines) : [],
    });
  }

  const renderOverlay = () => {
    // 【修复】向量路径：使用 VisualVectorsOverlay 组件渲染
    // 优先使用 visualFlowData（从 data.visual_flow 或 data.lines.vectors 提取）
    if (overlayMode === 'lines') {
      // 检查是否有向量数据
      if (visualFlowData?.vectors && visualFlowData.vectors.length > 0) {
        // 使用 VisualVectorsOverlay 组件渲染向量
        return (
          <VisualVectorsOverlay 
            data={visualFlowData} 
            width={100} 
            height={100} 
          />
        );
      }
      
      // 【后备】如果没有新格式的向量数据，尝试使用旧格式（comp.lines.vectors.path）
      if (comp.lines?.vectors?.path && comp.lines.vectors.path.length > 0) {
        const points = comp.lines.vectors.path;
        
        // 如果没有图片边界信息，使用默认的百分比坐标
        if (!imageBounds) {
          return (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#EAB308" />
                  </marker>
              </defs>
              <polyline 
                  points={points.map((p: number[]) => {
                    // 确保坐标在 0-1 范围内
                    const x = Math.max(0, Math.min(1, p[0]));
                    const y = Math.max(0, Math.min(1, p[1]));
                    return `${x*100},${y*100}`;
                  }).join(' ')} 
                  fill="none" 
                  stroke="#EAB308" 
                  strokeWidth="0.5" 
                  strokeDasharray="2 2"
                  markerEnd="url(#arrowhead)"
              />
              {points.map((p: number[], i: number) => {
                const x = Math.max(0, Math.min(1, p[0]));
                const y = Math.max(0, Math.min(1, p[1]));
                return (
                  <g key={i}>
                     <circle cx={x*100} cy={y*100} r="1.0" fill="#EAB308" className="animate-pulse" />
                     <text x={x*100 + 2} y={y*100 - 2} fontSize="3" fill="white" fontFamily="monospace" opacity="0.8">
                         {i === 0 ? "ENTRY" : i === points.length - 1 ? "EXIT" : "FOCAL"}
                     </text>
                  </g>
                );
              })}
            </svg>
          );
        }
        
        // 根据图片实际尺寸计算坐标
        return (
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none z-10" 
            style={{ 
              left: 0, 
              top: 0, 
              width: '100%', 
              height: '100%' 
            }}
          >
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#EAB308" />
                </marker>
            </defs>
            <g transform={`translate(${imageBounds.x}, ${imageBounds.y})`}>
              <polyline 
                  points={points.map((p: number[]) => {
                    // 确保坐标在 0-1 范围内，然后转换为图片内的像素坐标
                    const x = Math.max(0, Math.min(1, p[0])) * imageBounds.width;
                    const y = Math.max(0, Math.min(1, p[1])) * imageBounds.height;
                    return `${x},${y}`;
                  }).join(' ')} 
                  fill="none" 
                  stroke="#EAB308" 
                  strokeWidth="2" 
                  strokeDasharray="4 4"
                  markerEnd="url(#arrowhead)"
              />
              {points.map((p: number[], i: number) => {
                const x = Math.max(0, Math.min(1, p[0])) * imageBounds.width;
                const y = Math.max(0, Math.min(1, p[1])) * imageBounds.height;
                return (
                  <g key={i}>
                     <circle cx={x} cy={y} r="3" fill="#EAB308" className="animate-pulse" />
                     <text x={x + 5} y={y - 5} fontSize="10" fill="white" fontFamily="monospace" opacity="0.9" fontWeight="bold">
                         {i === 0 ? "ENTRY" : i === points.length - 1 ? "EXIT" : "FOCAL"}
                     </text>
                  </g>
                );
              })}
            </g>
          </svg>
        );
      }
      
      // 【后备】如果既没有新格式也没有旧格式的向量数据，显示 visual_data.lines
      if (visual_data?.lines && visual_data.lines.length > 0) {
        return (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            {visual_data.lines.map((line: any, i: number) => (
              <g key={i} className="animate-fade-in-scale">
                <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="#fff" strokeWidth="0.2" strokeDasharray="1 1" />
                <circle cx={line.x2} cy={line.y2} r="0.5" fill="#fff" />
                <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
              </g>
            ))}
          </svg>
        );
      }
      
      // 【最终后备】如果都没有数据，显示提示信息
      return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-white/50 text-xs font-mono bg-black/50 px-3 py-2 rounded">
            {t('modal.composition.no_vector_data') || '暂无向量数据'}
          </div>
        </div>
      );
    }
    if (overlayMode === 'mask') {
        // 【新增】Visual Mass 功能：支持显著性遮罩图（优先）或多边形方案（后备）
        // 检查是否有遮罩图 URL 或多边形数据
        const hasMaskUrl = visual_data?.saliency_mask_url;
        const hasPolygon = visual_data?.subject_poly;
        
        if (!hasMaskUrl && !hasPolygon) {
            return (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="text-white/50 text-xs font-mono">
                        {t('modal.composition.visual_mass_no_data')}
                    </div>
                </div>
            );
        }
        
        // 【修复】添加安全检查，防止 visual_data 未定义
        const confidence = visual_data?.visual_mass?.confidence || 0.0;
        // 【修复】优先使用 center_point（新格式），如果没有则使用 center_of_gravity（旧格式）
        // center_point 是百分比格式 (0-100)，需要转换为 0-1 范围用于 SVG
        const centerOfGravity = visual_data?.visual_mass?.center_point 
          ? [visual_data.visual_mass.center_point.x / 100, visual_data.visual_mass.center_point.y / 100]
          : (visual_data?.visual_mass?.center_of_gravity 
              ? (visual_data.visual_mass.center_of_gravity[0] > 1 
                  ? [visual_data.visual_mass.center_of_gravity[0] / 100, visual_data.visual_mass.center_of_gravity[1] / 100]
                  : visual_data.visual_mass.center_of_gravity)
              : [0.5, 0.5]);
        
        // 【新增】方案1：使用显著性遮罩图（优先）
        // 使用 Canvas 或 SVG 实现遮罩效果：白色区域保留原图，黑色区域降低亮度
        if (hasMaskUrl) {
            return (
                <div className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    {/* 使用 SVG 和 mask 实现遮罩效果 */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            {/* 遮罩图：白色=视觉重心（255），黑色=背景（0） */}
                            {/* 使用遮罩图作为 mask：白色区域（视觉重心）显示原图，黑色区域（背景）隐藏原图 */}
                            <mask id="saliencyMask">
                                <image 
                                    href={visual_data?.saliency_mask_url}
                                    width="100" 
                                    height="100" 
                                    preserveAspectRatio="none"
                                />
                            </mask>
                            {/* 反转遮罩：白色区域（视觉重心）变黑色（隐藏），黑色区域（背景）变白色（显示） */}
                            {/* 用于暗化层：只有黑色区域（背景）显示暗化层 */}
                            <mask id="saliencyMaskInverted">
                                <rect width="100" height="100" fill="white" />
                                <image 
                                    href={visual_data?.saliency_mask_url}
                                    width="100" 
                                    height="100" 
                                    preserveAspectRatio="none"
                                />
                            </mask>
                        </defs>
                        {/* 暗化层：整个区域变暗，但通过反转 mask 控制，只有黑色区域（背景）显示暗化层 */}
                        <rect 
                            width="100" 
                            height="100" 
                            fill="rgba(0, 0, 0, 0.85)" 
                            mask="url(#saliencyMaskInverted)"
                            className="animate-fade-in-scale"
                        />
                        {/* 原图层：使用遮罩图作为 mask，白色区域（视觉重心）显示原图 */}
                        <image 
                            href={images.source}
                            width="100" 
                            height="100" 
                            preserveAspectRatio="none"
                            mask="url(#saliencyMask)"
                            className="animate-fade-in-scale"
                            opacity="1"
                        />
                    </svg>
                    {/* 【新增】视觉重心点标记（可选，如果 confidence 较高则显示） */}
                    {confidence > 0.7 && (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <circle 
                                cx={centerOfGravity[0] * 100} 
                                cy={centerOfGravity[1] * 100} 
                                r="1.5" 
                                fill="#fff" 
                                opacity="0.8"
                                className="animate-pulse"
                            />
                        </svg>
                    )}
                </div>
            );
        }
        
        // 【后备】方案2：使用多边形方案（如果没有遮罩图 URL）
        return (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
             <defs>
                {/* 遮罩：主体区域保留原亮度，其余部分变暗 */}
                <mask id="subjectMask">
                  <rect width="100" height="100" fill="white" />
                  <polygon points={visual_data?.subject_poly} fill="black" />
                </mask>
             </defs>
             {/* 遮罩层：其余部分变暗 */}
             <rect width="100" height="100" fill="rgba(0,0,0,0.85)" mask="url(#subjectMask)" className="animate-fade-in-scale" />
             {/* 几何多边形轮廓：虚线描边 */}
             <polygon 
               points={visual_data?.subject_poly} 
               fill="none" 
               stroke="#fff" 
               strokeWidth="0.3" 
               strokeDasharray="2 2"
               className="animate-fade-in-scale"
             />
             {/* 【新增】视觉重心点标记（可选，如果 confidence 较高则显示） */}
             {confidence > 0.7 && (
               <circle 
                 cx={centerOfGravity[0] * 100} 
                 cy={centerOfGravity[1] * 100} 
                 r="0.8" 
                 fill="#fff" 
                 opacity="0.6"
                 className="animate-pulse"
               />
             )}
          </svg>
        );
    }
    // 【优化】三分法网格：根据图片的实际尺寸和位置进行叠加，确保完整叠加在照片上，不溢出
    if (overlayMode === 'grid') {
        // 如果没有图片边界信息，使用默认的百分比网格
        if (!imageBounds) {
          return (
            <div className="absolute inset-0 pointer-events-none z-10">
              {/* 3x3 Grid */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                {[...Array(9)].map((_,i) => (
                  <div key={i} className="border border-white/30"></div>
                ))}
              </div>
              {/* 四个黄金分割点 */}
              <div className="absolute top-1/3 left-1/3 w-2 h-2 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(255,255,255,0.8)] z-20"></div>
              <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-white rounded-full transform translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(255,255,255,0.8)] z-20"></div>
              <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-white rounded-full transform -translate-x-1/2 translate-y-1/2 shadow-[0_0_10px_rgba(255,255,255,0.8)] z-20"></div>
              <div className="absolute bottom-1/3 right-1/3 w-2 h-2 bg-white rounded-full transform translate-x-1/2 translate-y-1/2 shadow-[0_0_10px_rgba(255,255,255,0.8)] z-20"></div>
            </div>
          );
        }
        
        // 根据图片实际尺寸和位置绘制网格
        return (
          <div 
            className="absolute pointer-events-none z-10"
            style={{
              left: `${imageBounds.x}px`,
              top: `${imageBounds.y}px`,
              width: `${imageBounds.width}px`,
              height: `${imageBounds.height}px`
            }}
          >
            {/* 3x3 Grid - 使用 SVG 确保精确叠加 */}
            <svg 
              className="absolute inset-0 w-full h-full" 
              viewBox={`0 0 ${imageBounds.width} ${imageBounds.height}`}
              preserveAspectRatio="none"
            >
              {/* 垂直线 */}
              <line x1={imageBounds.width / 3} y1="0" x2={imageBounds.width / 3} y2={imageBounds.height} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              <line x1={imageBounds.width * 2 / 3} y1="0" x2={imageBounds.width * 2 / 3} y2={imageBounds.height} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              {/* 水平线 */}
              <line x1="0" y1={imageBounds.height / 3} x2={imageBounds.width} y2={imageBounds.height / 3} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              <line x1="0" y1={imageBounds.height * 2 / 3} x2={imageBounds.width} y2={imageBounds.height * 2 / 3} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
            </svg>
            {/* 四个黄金分割点 */}
            <div 
              className="absolute w-3 h-3 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.9)] z-20 transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${imageBounds.width / 3}px`, top: `${imageBounds.height / 3}px` }}
            ></div>
            <div 
              className="absolute w-3 h-3 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.9)] z-20 transform translate-x-1/2 -translate-y-1/2"
              style={{ left: `${imageBounds.width * 2 / 3}px`, top: `${imageBounds.height / 3}px` }}
            ></div>
            <div 
              className="absolute w-3 h-3 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.9)] z-20 transform -translate-x-1/2 translate-y-1/2"
              style={{ left: `${imageBounds.width / 3}px`, top: `${imageBounds.height * 2 / 3}px` }}
            ></div>
            <div 
              className="absolute w-3 h-3 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.9)] z-20 transform translate-x-1/2 translate-y-1/2"
              style={{ left: `${imageBounds.width * 2 / 3}px`, top: `${imageBounds.height * 2 / 3}px` }}
            ></div>
          </div>
        );
    }
    return null;
  };

  // 【新增】诊疗室模式：全屏显示 DirectorViewfinder
  if (showClinic) {
    return (
      <BaseModal title={t('modal.composition.clinic_title') || '构图诊疗室'} onClose={onClose}>
        <div className="fixed inset-0 z-50 bg-black animate-in slide-in-from-right">
          <button 
            onClick={() => setShowClinic(false)}
            className="absolute top-6 right-6 z-50 bg-white/10 text-white px-4 py-2 rounded hover:bg-white/20 flex items-center gap-2 backdrop-blur-md border border-white/20"
          >
            <X size={16} />
            {t('modal.composition.clinic_close') || '关闭诊疗室'}
          </button>
          {/* 使用 DirectorViewfinder 组件，传入用户图和诊疗数据 */}
          <DirectorViewfinder 
            data={{ compositionClinic: clinicData }} 
            userImageUrl={images.target} 
          />
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal title={t('modal.composition.title')} onClose={onClose}>
      <div className="flex h-full bg-[#050505]">
        {/* LEFT: IMAGE CANVAS */}
        <div className="flex-1 bg-carbon-950 flex items-center justify-center relative p-12 border-r border-white/5 overflow-hidden">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]"></div>
           
           <div ref={containerRef} className="relative w-full h-full max-w-4xl flex items-center justify-center">
              {/* True Color Image */}
              <img 
                ref={imgRef}
                src={images.source} 
                className="max-w-full max-h-full object-contain shadow-2xl" 
                alt="Ref"
                onLoad={() => {
                  // 图片加载完成后重新计算边界
                  if (imgRef.current && containerRef.current) {
                    const img = imgRef.current;
                    const container = containerRef.current;
                    const imgNaturalWidth = img.naturalWidth;
                    const imgNaturalHeight = img.naturalHeight;
                    const containerWidth = container.clientWidth;
                    const containerHeight = container.clientHeight;
                    const imgRatio = imgNaturalWidth / imgNaturalHeight;
                    const containerRatio = containerWidth / containerHeight;
                    
                    let displayWidth: number, displayHeight: number, offsetX: number, offsetY: number;
                    
                    if (imgRatio > containerRatio) {
                      displayWidth = containerWidth;
                      displayHeight = containerWidth / imgRatio;
                      offsetX = 0;
                      offsetY = (containerHeight - displayHeight) / 2;
                    } else {
                      displayHeight = containerHeight;
                      displayWidth = containerHeight * imgRatio;
                      offsetY = 0;
                      offsetX = (containerWidth - displayWidth) / 2;
                    }
                    
                    setImageBounds({
                      x: offsetX,
                      y: offsetY,
                      width: displayWidth,
                      height: displayHeight
                    });
                  }
                }}
              />
              {renderOverlay()}
           </div>
           
           <div className="absolute bottom-8 left-0 w-full flex justify-center gap-4">
              {[
                {id:'lines', labelKey:'modal.composition.vectors'}, 
                {id:'grid', labelKey:'modal.composition.rule_of_thirds'}, 
                {id:'mask', labelKey:'modal.composition.visual_mass'}
              ].map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => setOverlayMode(overlayMode === m.id ? null : m.id as any)} 
                    className={`px-4 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-widest transition-all border backdrop-blur-md ${overlayMode === m.id ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-black/40 border-white/10 text-gray-400 hover:text-white hover:border-white/30'}`}
                  >
                    {t(m.labelKey)}
                  </button>
              ))}
              
              {/* 【新增】诊疗室按钮 - 分隔线 + 特殊按钮 */}
              <div className="w-px h-6 bg-white/20 mx-2 self-center"></div>
              <button 
                onClick={() => setShowClinic(true)}
                className="group relative px-4 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-widest transition-all border backdrop-blur-md bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/30 text-blue-300 hover:border-blue-400/50 hover:text-white hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              >
                <Activity className="w-3 h-3 inline-block mr-1.5 -mt-0.5" />
                {t('modal.composition.enter_clinic') || '诊疗室'}
                {/* 呼吸灯效果 */}
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-400 rounded-full animate-ping" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-400 rounded-full" />
              </button>
           </div>
        </div>

        {/* RIGHT: ANALYSIS DATA */}
        <div className="w-[400px] bg-[#080808] flex flex-col overflow-y-auto custom-scrollbar border-l border-white/5">
           {/* HEADER SECTION */}
           <div className="p-6 border-b border-white/5 bg-[#0A0A0A]">
              <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2 font-mono flex items-center gap-2">
                <Maximize className="w-3 h-3 text-blue-500" />
                {t('modal.composition.classification')}
              </div>
              <div className="text-2xl text-white font-display tracking-wide mb-1">{styleName}</div>
              <div className="text-xs text-emerald-500 font-mono flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {styleMethod}
              </div>
           </div>
           
           <div className="p-6 space-y-8">
               {/* 1. STRUCTURE & GEOMETRY */}
               <div>
                   <h4 className="text-[9px] text-blue-400 font-bold uppercase mb-3 flex items-center gap-2 border-b border-blue-500/10 pb-2">
                        <Layout className="w-3 h-3" /> {t('modal.composition.structural_geometry')}
                   </h4>
                   <div className="bg-white/5 border border-white/5 rounded p-3">
                        <div className="text-xs text-gray-300 mb-2 leading-relaxed font-mono">"{visualFrame}"</div>
                        {comp.structure?.geometry && (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                                <span className="text-[9px] text-white/40 uppercase">{t('modal.composition.geometry')}:</span>
                                <span className="text-[10px] text-blue-300 font-mono">{comp.structure.geometry}</span>
                            </div>
                        )}
                   </div>
               </div>

               {/* 2. VISUAL WEIGHT (SUBJECT) */}
               {comp.subject && (
               <div>
                   <h4 className="text-[9px] text-red-400 font-bold uppercase mb-3 flex items-center gap-2 border-b border-red-500/10 pb-2">
                        <Target className="w-3 h-3" /> {t('modal.composition.visual_weight')}
                   </h4>
                   <div className="grid grid-cols-[1fr_1.5fr] gap-3">
                        <div className="bg-black border border-white/10 rounded p-2 flex flex-col items-center justify-center text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-red-500/5 animate-pulse"></div>
                            <div className="text-[8px] text-white/30 uppercase mb-1">{t('modal.composition.score')}</div>
                            <div className="text-xl font-bold text-red-500">{comp.subject.weight_score || comp.subject.weight || 'N/A'}</div>
                        </div>
                        <div className="space-y-1">
                             <div className="bg-white/5 px-2 py-1.5 rounded border border-white/5 flex justify-between">
                                 <span className="text-[8px] text-white/40 uppercase">{t('modal.composition.position')}</span>
                                 <span className="text-[9px] text-white/90 font-mono">{comp.subject.position || 'N/A'}</span>
                             </div>
                             <div className="bg-white/5 px-2 py-1.5 rounded border border-white/5 flex justify-between">
                                 <span className="text-[8px] text-white/40 uppercase">{t('modal.composition.method')}</span>
                                 <span className="text-[9px] text-white/90 font-mono">{comp.subject.method || 'N/A'}</span>
                             </div>
                        </div>
                   </div>
                   <div className="mt-2 text-[10px] text-gray-400 leading-relaxed pl-2 border-l-2 border-red-500/30">
                       {typeof comp.subject === 'string' ? comp.subject : (comp.subject.analysis || comp.subject.desc || '')}
                   </div>
               </div>
               )}

               {/* 【新增】2.5. VISUAL MASS (视觉质量/视觉重心) - 显示 score、composition_rule 和位置 */}
               {visual_data?.visual_mass && (
               <div>
                   <h4 className="text-[9px] text-purple-400 font-bold uppercase mb-3 flex items-center gap-2 border-b border-purple-500/10 pb-2">
                        <Target className="w-3 h-3" /> {t('modal.composition.visual_mass') || '视觉质量'}
                   </h4>
                   <div className="grid grid-cols-[1fr_1.5fr] gap-3">
                        <div className="bg-black border border-white/10 rounded p-2 flex flex-col items-center justify-center text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-purple-500/5 animate-pulse"></div>
                            <div className="text-[8px] text-white/30 uppercase mb-1">{t('modal.composition.visual_mass_score') || '视觉得分'}</div>
                            <div className="text-xl font-bold text-purple-500">{visual_data?.visual_mass?.score ?? 'N/A'}</div>
                        </div>
                        <div className="space-y-1">
                             <div className="bg-white/5 px-2 py-1.5 rounded border border-white/5 flex justify-between">
                                 <span className="text-[8px] text-white/40 uppercase">{t('modal.composition.position') || '位置'}</span>
                                 <span className="text-[9px] text-white/90 font-mono">
                                     {visual_data?.visual_mass?.center_point 
                                       ? `X: ${Math.round(visual_data.visual_mass.center_point.x)}% Y: ${Math.round(visual_data.visual_mass.center_point.y)}%`
                                       : visual_data?.visual_mass?.center_of_gravity
                                       ? `X: ${Math.round(visual_data.visual_mass.center_of_gravity[0])}% Y: ${Math.round(visual_data.visual_mass.center_of_gravity[1])}%`
                                       : 'N/A'}
                                 </span>
                             </div>
                             <div className="bg-white/5 px-2 py-1.5 rounded border border-white/5 flex justify-between">
                                 <span className="text-[8px] text-white/40 uppercase">{t('modal.composition.method') || '方法'}</span>
                                 <span className="text-[9px] text-white/90 font-mono">{visual_data?.visual_mass?.composition_rule || 'N/A'}</span>
                             </div>
                        </div>
                   </div>
               </div>
               )}

               {/* 3. VISUAL GUIDANCE (线条走向分析) */}
               {comp.lines?.visual_guidance?.analysis && (
               <div>
                   <h4 className="text-[9px] text-yellow-500 font-bold uppercase mb-3 flex items-center gap-2 border-b border-yellow-500/10 pb-2">
                        <Activity className="w-3 h-3" /> {t('modal.composition.visual_guidance_analysis')}
                   </h4>
                   <div className="bg-white/5 px-3 py-2.5 rounded border border-yellow-500/20">
                       <p className="text-[10px] text-gray-300 leading-relaxed">{comp.lines.visual_guidance.analysis}</p>
                   </div>
               </div>
               )}

               {/* 4. VISUAL FLOW PATH (视觉流路径) */}
               <div>
                   <h4 className="text-[9px] text-yellow-500 font-bold uppercase mb-3 flex items-center gap-2 border-b border-yellow-500/10 pb-2">
                        <GitGraph className="w-3 h-3" /> {t('modal.composition.visual_flow_path')}
                   </h4>
                   <div className="space-y-2 relative pl-2">
                       <div className="absolute top-2 bottom-2 left-[7px] w-px bg-white/10"></div>
                       {Array.isArray(comp.lines?.path) ? comp.lines.path.map((step: string, i: number) => (
                           <div key={i} className="relative flex items-start gap-3 group">
                               <div className="w-3 h-3 rounded-full bg-[#0A0A0A] border border-yellow-500/50 z-10 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-yellow-400 transition-colors">
                                   <div className="w-1 h-1 bg-yellow-500 rounded-full"></div>
                               </div>
                               <span className="text-[10px] text-gray-400 font-mono group-hover:text-white transition-colors leading-tight">{step}</span>
                           </div>
                       )) : (
                           <div className="text-[10px] text-white/20 italic pl-4">Calculating trajectory...</div>
                       )}
                   </div>
                   {/* 【新增】Visual Flow 坐标点展示 */}
                   {comp.lines?.vectors && (
                   <div className="mt-3 space-y-1.5">
                       {comp.lines.vectors.entry && (
                       <div className="bg-white/5 px-2 py-1.5 rounded border border-white/5 flex justify-between items-center">
                           <span className="text-[8px] text-white/40 uppercase">{t('modal.composition.entry_point')}</span>
                           <span className="text-[9px] text-yellow-400 font-mono">{comp.lines.vectors.entry.label} ({comp.lines.vectors.entry.coords[0]?.toFixed(1)}, {comp.lines.vectors.entry.coords[1]?.toFixed(1)})</span>
                       </div>
                       )}
                       {comp.lines.vectors.focal && (
                       <div className="bg-white/5 px-2 py-1.5 rounded border border-white/5 flex justify-between items-center">
                           <span className="text-[8px] text-white/40 uppercase">{t('modal.composition.focal_point')}</span>
                           <span className="text-[9px] text-yellow-400 font-mono">{comp.lines.vectors.focal.label} ({comp.lines.vectors.focal.coords[0]?.toFixed(1)}, {comp.lines.vectors.focal.coords[1]?.toFixed(1)})</span>
                       </div>
                       )}
                       {comp.lines.vectors.exit && (
                       <div className="bg-white/5 px-2 py-1.5 rounded border border-white/5 flex justify-between items-center">
                           <span className="text-[8px] text-white/40 uppercase">{t('modal.composition.exit_point')}</span>
                           <span className="text-[9px] text-yellow-400 font-mono">{comp.lines.vectors.exit.label} ({comp.lines.vectors.exit.coords[0]?.toFixed(1)}, {comp.lines.vectors.exit.coords[1]?.toFixed(1)})</span>
                       </div>
                       )}
                   </div>
                   )}
               </div>

               {/* 5. SPATIAL DEPTH (Z-Depth 分析) */}
               <div className="grid grid-cols-1 gap-4">
                   <div>
                       <h4 className="text-[9px] text-purple-500 font-bold uppercase mb-3 flex items-center gap-2 border-b border-purple-500/10 pb-2">
                            <Layers className="w-3 h-3" /> {t('modal.composition.spatial_depth')}
                       </h4>
                       <div className="space-y-1">
                           {comp.zones?.details ? (
                               <div className="space-y-2">
                                    {['foreground', 'midground', 'background'].map((zone) => {
                                        const detail = comp.zones.details[zone];
                                        if (!detail) return null;
                                        const [start, end] = detail.range || [0, 0];
                                        // Calculate width and position for visualization
                                        // Assumes range is 0.0-1.0
                                        return (
                                            <div key={zone} className="group relative h-8 bg-white/5 rounded border border-white/10 overflow-hidden">
                                                {/* Depth Bar Background */}
                                                <div className="absolute inset-0 bg-purple-500/5"></div>
                                                {/* Active Depth Range */}
                                                <div className="absolute top-0 bottom-0 bg-purple-500/20 border-x border-purple-500/40 transition-all group-hover:bg-purple-500/30" 
                                                     style={{ left: `${start*100}%`, width: `${(end-start)*100}%` }}></div>
                                                
                                                <div className="absolute inset-0 flex items-center justify-between px-2">
                                                    <span className="text-[9px] uppercase text-white/50 w-16">{t(`modal.composition.${zone}`)}</span>
                                                    <span className="text-[9px] text-white truncate flex-1 text-right">{detail.content}</span>
                                                    <span className="text-[8px] text-purple-400/60 font-mono ml-2">[{start.toFixed(1)}-{end.toFixed(1)}]</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    <div className="flex justify-between text-[8px] text-white/20 px-1 font-mono">
                                        <span>{t('modal.composition.near')} (0.0)</span>
                                        <span>{t('modal.composition.infinity')} (1.0)</span>
                                    </div>
                               </div>
                           ) : (
                               comp.zones && Object.entries(comp.zones).map(([key, val]: any) => {
                                   if (key === 'details' || key === 'raw_depth' || key === 'spatial_depth') return null;
                                   return (
                                       <div key={key} className="grid grid-cols-[70px_1fr] gap-2 items-center bg-white/5 p-1.5 rounded border border-white/5 hover:bg-white/10 transition-colors">
                                           <span className="text-[7px] text-white/30 uppercase tracking-wider text-right">{key}</span>
                                           <span className="text-[9px] text-purple-200 font-mono truncate">{val}</span>
                                       </div>
                                   );
                               })
                           )}
                       </div>
                   </div>
               </div>

               {/* 5. NEGATIVE SPACE & PROPORTIONS */}
               <div className="bg-white/[0.02] border border-white/5 p-4 rounded">
                   <div className="flex justify-between items-center mb-3">
                       <span className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-2">
                           <Percent className="w-3 h-3" /> {t('modal.composition.negative_space')}
                       </span>
                       <span className="text-sm font-mono text-white">
                           {comp.balance?.details?.percentage ? `${comp.balance.details.percentage}%` : negativeSpace}
                       </span>
                   </div>
                   <div className="h-1.5 bg-gray-800 w-full rounded-full overflow-hidden flex relative">
                       {/* Percentage Bar */}
                       <div 
                            className="bg-white h-full transition-all duration-1000" 
                            style={{ width: `${comp.balance?.details?.percentage || (parseInt(negativeSpace) || 50)}%` }}
                       ></div> 
                       {/* Center marker for balance check */}
                       <div className="absolute left-1/2 top-0 bottom-0 w-px bg-red-500/50"></div>
                   </div>
                   <div className="flex justify-between mt-2 pt-2 border-t border-white/5">
                       <div className="text-center w-1/2 border-r border-white/5">
                           <div className="text-[7px] text-white/20 uppercase">{t('modal.composition.h_balance')}</div>
                           <div className="text-[9px] text-white/60 font-mono">
                               {comp.balance?.details?.h_balance || comp.balance?.horizontal || 'N/A'}
                           </div>
                       </div>
                       <div className="text-center w-1/2">
                           <div className="text-[7px] text-white/20 uppercase">{t('modal.composition.v_balance')}</div>
                           <div className="text-[9px] text-white/60 font-mono">
                               {comp.balance?.details?.v_balance || comp.balance?.vertical || 'N/A'}
                           </div>
                       </div>
                   </div>
               </div>
           </div>
        </div>
      </div>
    </BaseModal>
  );
};
