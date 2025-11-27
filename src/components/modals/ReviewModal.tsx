import React, { useState, useRef, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import ImageOverlayViewer from '../ImageOverlayViewer';
import { InteractiveImage } from '../InteractiveImage';
import { AnalysisTextBlock } from '../AnalysisTextBlock';
import { ANALYSIS_SECTIONS } from '../config/AnalysisConfig';

// --- PRECISION LOUPE (Absolute Follow with REAL Color) ---
const OpticalLoupe = ({ x, y, src, containerRect, show, colorData }: any) => {
    if (!show || !containerRect || !colorData) return null;

    const { r, g, b, hex, zone } = colorData;

    // Calculate relative position for visual feed
    const percX = (x / containerRect.width) * 100;
    const percY = (y / containerRect.height) * 100;

    return (
        <div 
            className="absolute z-50 pointer-events-none"
            style={{ 
                left: x, top: y,
                transform: 'translate(-50%, -50%)'
            }}
        >
            {/* Lens Body */}
            <div className="w-48 h-48 rounded-full border-2 border-white/80 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] bg-black relative">
                {/* Visual Feed (Approximation) */}
                <div 
                    className="absolute inset-0 w-full h-full"
                    style={{
                        backgroundImage: `url(${src})`,
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: `${containerRect.width * 4}px ${containerRect.height * 4}px`,
                        backgroundPosition: `${percX}% ${percY}%` 
                    }}
                />
                
                {/* Crosshair */}
                <div className="absolute inset-0 flex items-center justify-center opacity-70">
                    <div className="w-full h-px bg-optic-accent/80 shadow-[0_0_2px_rgba(0,0,0,1)]"></div>
                    <div className="h-full w-px bg-optic-accent/80 absolute shadow-[0_0_2px_rgba(0,0,0,1)]"></div>
                </div>
            </div>

            {/* Live Color HUD */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 bg-black/90 border border-optic-accent/50 px-4 py-3 rounded-md text-[10px] font-mono text-white shadow-xl whitespace-nowrap flex items-center gap-4 min-w-[200px] animate-in fade-in slide-in-from-top-2">
                <div className="w-8 h-8 rounded-full border-2 border-white shadow-lg" style={{ backgroundColor: `rgb(${r},${g},${b})` }}></div>
                <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1">
                    <div className="text-gray-500">RGB</div><div className="text-optic-accent text-right">{r} {g} {b}</div>
                    <div className="text-gray-500">HEX</div><div className="text-white text-right uppercase">{hex}</div>
                    <div className="text-gray-500">ZONE</div><div className="text-right font-bold bg-white/20 px-1 rounded text-center">{zone}</div>
                </div>
            </div>
        </div>
    );
};

const AdaptiveImage = ({ src, label, overlays, activeOverlay, onHoverOverlay }: any) => {
  const [showLoupe, setShowLoupe] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [colorData, setColorData] = useState<{r:number, g:number, b:number, hex:string, zone:number} | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize canvas on load
  const handleImageLoad = () => {
      if (!imgRef.current) return;
      const canvas = document.createElement('canvas');
      canvas.width = imgRef.current.naturalWidth;
      canvas.height = imgRef.current.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.drawImage(imgRef.current, 0, 0);
          canvasRef.current = canvas;
      }
  };

  const getOriginalCoords = (domX: number, domY: number, containerW: number, containerH: number, imgW: number, imgH: number) => {
      const containerRatio = containerW / containerH;
      const imgRatio = imgW / imgH;

      let renderW, renderH, offsetX, offsetY;

      // logic for object-fit: contain
      if (imgRatio > containerRatio) {
          // Image is wider than container (relative to aspect ratio)
          renderW = containerW;
          renderH = containerW / imgRatio;
          offsetX = 0;
          offsetY = (containerH - renderH) / 2;
      } else {
          // Image is taller
          renderH = containerH;
          renderW = containerH * imgRatio;
          offsetY = 0;
          offsetX = (containerW - renderW) / 2;
      }

      // Check if inside the image rect
      if (domX < offsetX || domX > offsetX + renderW || domY < offsetY || domY > offsetY + renderH) {
          return null;
      }

      // Map to original
      const relX = domX - offsetX;
      const relY = domY - offsetY;
      
      const scaleX = imgW / renderW;
      const scaleY = imgH / renderH;

      return {
          x: Math.floor(relX * scaleX),
          y: Math.floor(relY * scaleY)
      };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !imgRef.current || !canvasRef.current) return;

    const r = containerRef.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    
    setRect(r);
    setMousePos({ x, y });

    const coords = getOriginalCoords(x, y, r.width, r.height, imgRef.current.naturalWidth, imgRef.current.naturalHeight);

    if (coords) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            const pixel = ctx.getImageData(coords.x, coords.y, 1, 1).data;
            const red = pixel[0];
            const green = pixel[1];
            const blue = pixel[2];
            const hex = "#" + ((1 << 24) + (red << 16) + (green << 8) + blue).toString(16).slice(1).toUpperCase();
            
            const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
            const zoneVal = Math.floor(luma / 25.5); 

            setColorData({ r: red, g: green, b: blue, hex, zone: zoneVal });
        }
    } else {
        setColorData(null);
    }
  };

  return (
    <div 
        ref={containerRef}
        className="flex-1 relative bg-carbon-950 flex items-center justify-center border-r border-white/5 cursor-none group overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setShowLoupe(true)}
        onMouseLeave={() => setShowLoupe(false)}
    >
      <div className="relative w-full h-full p-12 flex items-center justify-center pointer-events-none">
         <img 
            ref={imgRef}
            src={src} 
            className="w-full h-full object-contain shadow-2xl opacity-100" 
            alt={label}
            onLoad={handleImageLoad}
            crossOrigin="anonymous"
         />
      </div>

      {/* Interactive Overlays Layer */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
          <div className="w-full h-full relative">
            {overlays && Object.entries(overlays).map(([key, rect]: any) => {
                const isActive = activeOverlay === key;
                return (
                    <div
                        key={key}
                        className={`
                            absolute z-20 cursor-crosshair transition-all duration-300 ease-out pointer-events-auto
                            ${isActive 
                                ? 'border-2 border-optic-accent bg-optic-accent/10 shadow-[0_0_30px_rgba(0,122,255,0.3)] opacity-100' 
                                : 'border border-white/20 bg-white/[0.01] opacity-0 hover:opacity-100'
                            }
                        `}
                        style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.w}%`, height: `${rect.h}%` }}
                        onMouseEnter={() => onHoverOverlay(key)}
                        onMouseLeave={() => onHoverOverlay(null)}
                    >
                        {isActive && (
                           <div className="absolute -top-3 left-0 text-[8px] text-white bg-optic-accent px-1.5 py-0.5 font-bold tracking-wider rounded-sm shadow-sm whitespace-nowrap animate-in fade-in slide-in-from-bottom-1">
                              {rect.label ? rect.label.toUpperCase() : key.replace('_', ' ').toUpperCase()}
                           </div>
                        )}
                    </div>
                );
            })}
          </div>
      </div>

      <OpticalLoupe x={mousePos.x} y={mousePos.y} src={src} show={showLoupe && colorData} containerRect={rect} colorData={colorData} />
      <div className="absolute bottom-6 left-6 font-mono text-[9px] text-optic-silver uppercase tracking-widest bg-black/50 px-2 py-1 rounded border border-white/5 pointer-events-none">{label}</div>
    </div>
  );
};

/**
 * 3D 直方图组件
 * 显示参考图和用户图的亮度分布对比
 * 
 * @param data - 直方图数据，格式：{ reference: number[], user: number[] }
 *   - reference: 参考图的亮度分布数组（0-255，通常归一化为百分比）
 *   - user: 用户图的亮度分布数组（0-255，通常归一化为百分比）
 */
const Histogram3D = ({ data, t }: any) => {
    // 【安全访问】确保 data 和 data.reference 存在且为数组
    if (!data || !data.reference || !Array.isArray(data.reference)) {
        // 【调试日志】记录直方图数据缺失的详细信息（仅在开发环境）
        if (process.env.NODE_ENV === 'development') {
            console.warn('[Histogram3D] 直方图数据格式不正确:', {
                hasData: !!data,
                hasReference: !!data?.reference,
                referenceIsArray: Array.isArray(data?.reference),
                dataKeys: data ? Object.keys(data) : [],
                dataType: typeof data
            });
        }
        return (
            <div className="h-32 flex items-center justify-center text-white/40 text-sm">
                {t('review.histogram.unavailable') || "直方图数据不可用"}
            </div>
        );
    }
    
    // 【安全访问】确保 data.user 存在且为数组，如果不存在则使用空数组
    const userData = Array.isArray(data.user) ? data.user : [];
    
    return (
        <div className="h-32 perspective-1000 relative flex items-end gap-2 p-4 mb-8">
            <div className="absolute inset-0 border-b border-white/10 transform rotateX(60deg) origin-bottom opacity-30 pointer-events-none"></div>
            {data.reference.map((val: number, i: number) => (
                <div key={i} className="flex-1 h-full relative flex items-end group preserve-3d transition-transform hover:translate-y-[-10px] duration-300 cursor-pointer">
                    {/* 参考图直方图（背景层） */}
                    <div className="w-full bg-white/5 absolute bottom-0 border border-white/10 cube-face transition-all" style={{ height: `${val}%`, transform: 'translateZ(-10px)' }}></div>
                    {/* 用户图直方图（前景层） */}
                    <div className="w-full bg-optic-accent/20 absolute bottom-0 border-t border-optic-accent cube-face shadow-[0_0_15px_rgba(0,122,255,0.3)]" style={{ height: `${userData[i] || 0}%`, transform: 'translateZ(10px)' }}></div>
                </div>
            ))}
        </div>
    );
};

// --- TECH-PUNK UI COMPONENTS ---

const TechContainer = ({ children, className = "", active = false, onClick, decorative = true }: any) => (
  <div 
    className={`
            relative overflow-hidden transition-all duration-500 border
            ${active 
                ? 'bg-optic-accent/5 border-optic-accent/50 shadow-[0_0_20px_rgba(0,122,255,0.15)]' 
                : 'bg-black/20 border-white/5 hover:border-white/20 hover:bg-white/[0.02]'
            }
            ${onClick ? 'cursor-pointer' : ''}
            ${className}
        `}
        onClick={onClick}
    >
        {/* Decorative Corners */}
        {decorative && (
            <>
                <div className={`absolute top-0 left-0 w-2 h-2 border-t border-l transition-colors ${active ? 'border-optic-accent' : 'border-white/20'}`}></div>
                <div className={`absolute top-0 right-0 w-2 h-2 border-t border-r transition-colors ${active ? 'border-optic-accent' : 'border-white/20'}`}></div>
                <div className={`absolute bottom-0 left-0 w-2 h-2 border-b border-l transition-colors ${active ? 'border-optic-accent' : 'border-white/20'}`}></div>
                <div className={`absolute bottom-0 right-0 w-2 h-2 border-b border-r transition-colors ${active ? 'border-optic-accent' : 'border-white/20'}`}></div>
            </>
        )}
        
        {children}
    </div>
);

const ComparisonContent = ({ content }: { content: string }) => {
  if (!content) return null;

  // Split content based on tags (Enhanced Regex to cover more variations)
  // Supports: 【参考图】, [参考图], Reference:, Ref:, 参考:, 【用户图】, [用户图], User:, 用户:
  const parts = content.split(/(\n|^)(?=【|\[|Reference:|Ref:|User:|参考:|用户:)/gi);
  
  // Categorize parts
  const referenceParts: string[] = [];
  const userParts: string[] = [];
  const generalParts: string[] = [];

  parts.forEach(part => {
      if (!part.trim()) return;
      
      // Check for Reference markers
      if (part.match(/【参考图】|\[参考图\]|Reference:|Ref:|参考:/i)) {
          referenceParts.push(part.replace(/【参考图】|\[参考图\]|Reference:|Ref:|参考:/i, "").trim());
      } 
      // Check for User markers
      else if (part.match(/【用户图】|\[用户图\]|User:|用户:/i)) {
          userParts.push(part.replace(/【用户图】|\[用户图\]|User:|用户:/i, "").trim());
      } 
      else {
          generalParts.push(part);
      }
  });

  // Helper for bold text
  const renderText = (text: string, colorClass: string = "text-gray-400") => {
      const boldParts = text.split(/(\*\*.*?\*\*)/g);
      return (
          <span className={`${colorClass} whitespace-pre-wrap`}>
              {boldParts.map((p, i) => {
                  if (p.startsWith('**') && p.endsWith('**')) {
                      return <strong key={i} className="text-white font-medium">{p.slice(2, -2)}</strong>;
                  }
                  return p;
              })}
          </span>
      );
  };

  return (
    <div className="space-y-4">
        {/* 1. General/Summary Content */}
        {generalParts.length > 0 && (
            <div className="text-sm leading-relaxed font-light">
                {generalParts.map((part, i) => (
                    <p key={i} className="mb-2 last:mb-0">{renderText(part)}</p>
                ))}
            </div>
        )}

        {/* 2. Comparison Grid (Reference vs User) */}
        {(referenceParts.length > 0 || userParts.length > 0) && (
            <div className="grid grid-cols-1 gap-3 mt-3">
                {/* Reference Card */}
                {referenceParts.map((part, i) => (
                    <div key={`ref-${i}`} className="relative pl-3 border-l-2 border-optic-gold/50 bg-optic-gold/[0.03] p-3 rounded-r-sm">
                        <div className="text-[9px] font-mono text-optic-gold uppercase tracking-widest mb-1 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-optic-gold rounded-full"></div>
                            REF SOURCE
                        </div>
                        <p className="text-xs leading-relaxed">{renderText(part, "text-optic-gold/80")}</p>
                    </div>
                ))}

                {/* User Card */}
                {userParts.map((part, i) => (
                    <div key={`user-${i}`} className="relative pl-3 border-l-2 border-optic-accent/50 bg-optic-accent/[0.03] p-3 rounded-r-sm">
                        <div className="text-[9px] font-mono text-optic-accent uppercase tracking-widest mb-1 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-optic-accent rounded-full"></div>
                            USER INPUT
                        </div>
                        <p className="text-xs leading-relaxed">{renderText(part, "text-optic-accent/80")}</p>
                    </div>
                ))}
            </div>
        )}
        </div>
    );
};

/**
 * SectionBlock 组件
 * 支持点击文字高亮对应图片区域的交互功能
 * 
 * @param title - 区块标题
 * @param content - 区块内容
 * @param id - 区块ID（必须与 overlays 中的 key 匹配，如 "visual_subject"、"focus_exposure"、"color_depth"）
 * @param onHover - 悬停回调函数（鼠标悬停时触发）
 * @param onClick - 点击回调函数（点击文字时触发，用于持久高亮）
 * @param activeId - 当前激活的区块ID（用于显示高亮状态）
 */
const SectionBlock = ({ title, content, id, onHover, onClick, activeId }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // 【点击处理】点击标题或整个区块时：
  // 1. 切换展开/收起状态
  // 2. 触发点击回调，高亮对应图片区域
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡
    setIsOpen(!isOpen); // 切换展开/收起
    if (onClick) {
      onClick(id); // 触发点击回调，高亮对应区域
    }
  };
  
  return (
  <TechContainer 
    active={activeId === id}
    onClick={handleClick}
    className="p-5 mb-2 group cursor-pointer transition-all duration-300"
  >
  {/* 【悬停层】鼠标悬停时临时高亮（不影响点击状态） */}
  <div 
        className="absolute inset-0 z-10"
    onMouseEnter={() => onHover && onHover(id)}
    onMouseLeave={() => onHover && onHover(null)}
    ></div>

    <div className="flex justify-between items-center relative z-0">
        <div className="flex items-center gap-2">
            {/* 【视觉指示器】激活时显示蓝色，未激活时显示灰色 */}
            <div className={`w-1 h-4 transition-colors ${activeId === id ? 'bg-optic-accent' : 'bg-white/20'}`}></div>
            {/* 【标题】可点击，激活时高亮显示 */}
            <h4 
              className={`text-[11px] font-bold font-display uppercase tracking-widest transition-colors ${activeId === id ? 'text-white text-glow' : 'text-gray-400'}`}
              onClick={handleClick}
            >
                {title}
            </h4>
        </div>
        
        {/* Tech Deco: Data Bars + Expand Icon */}
        <div className="flex items-center gap-3">
            <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className={`w-1 h-2 ${i < 3 ? (activeId === id ? 'bg-optic-accent/60' : 'bg-white/10') : 'bg-transparent border border-white/5'}`}></div>
                ))}
            </div>
            {/* 【展开图标】根据展开状态旋转 */}
            <div className={`text-[10px] text-white/40 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>▼</div>
        </div>
    </div>
    
    {/* 【折叠内容】点击标题时展开/收起内容 */}
    <div className={`relative z-0 overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
        <ComparisonContent content={content} />
  </div>
  </TechContainer>
)};

/**
 * 综合审查面板组件
 * 显示照片点评的完整信息，包括风格总结、综合点评、各维度分析和可行性评估
 * 
 * @param data - 照片点评数据，包含以下字段：
 *   - style_summary: 风格总结（核心策略）
 *   - comprehensive_review: 综合点评（整体分析）
 *   - pros_evaluation: 优点评估
 *   - visual_subject_analysis: 视觉主体分析
 *   - focus_exposure_analysis: 焦点与曝光分析
 *   - emotion: 色彩与情感
 *   - simulated_histogram_data: 直方图数据
 *   - parameter_comparison_table: 参数对比表
 *   - feasibility_assessment: 可行性评估
 *   - overlays: 覆盖层数据（用于图片标注）
 * @param images - 图片对象，包含 source（参考图）和 target（用户图）
 * @param onClose - 关闭回调函数
 */
export const ReviewModal = ({ data, images, onClose }: any) => {
  const { t } = useLanguage();
  // 【核心状态】当前高亮的模块 ID（例如 'visual_subject'）
  // 使用新的交互式系统，统一管理激活状态
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // 【向后兼容】保留旧的悬停和点击状态（用于其他功能）
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [clickedSection, setClickedSection] = useState<string | null>(null);
  const activeOverlay = clickedSection || hoveredSection;
  
  // 【点击处理函数】点击文字时切换高亮状态（新系统）
  const handleSectionClick = (sectionId: string | null) => {
    // 如果点击的是当前已激活的区域，则取消激活；否则激活新区域
    setActiveId(prev => prev === sectionId ? null : sectionId);
    // 同时更新旧的点击状态（向后兼容）
    setClickedSection(prev => prev === sectionId ? null : sectionId);
  };
  
  // 【安全访问】防御性检查数据结构，确保所有必需字段都存在
  // 【修复】overlays 数据用于前端图片区域高亮显示
  // 新格式：overlays.reference 和 overlays.user（两套坐标，分别用于参考图和用户图）
  // 旧格式：overlays.visual_subject/focus_exposure/color_depth（一套坐标，向后兼容）
  const overlaysRaw = data?.overlays || {};
  
  // 【修复】提取参考图和用户图的 overlays，并转换为新格式（ref_xxx 和 user_xxx）
  // 新格式：overlays.reference 和 overlays.user（两套坐标，分别用于参考图和用户图）
  // 需要转换为 InteractiveImage 期望的格式：{ ref_visual_subject: {...}, user_visual_subject: {...} }
  let referenceOverlays: any = {};
  let userOverlays: any = {};
  
  if (overlaysRaw && typeof overlaysRaw === 'object' && !Array.isArray(overlaysRaw) && 'reference' in overlaysRaw && 'user' in overlaysRaw) {
    // 新格式：分别提取参考图和用户图的 overlays，并添加前缀
    const refData = overlaysRaw.reference || {};
    const userData = overlaysRaw.user || {};
    
    // 转换为新格式：添加 ref_ 和 user_ 前缀
    // 例如：{ visual_subject: {...} } -> { ref_visual_subject: {...} }
    referenceOverlays = {};
    userOverlays = {};
    
    Object.entries(refData).forEach(([key, value]) => {
      referenceOverlays[`ref_${key}`] = value;
    });
    
    Object.entries(userData).forEach(([key, value]) => {
      userOverlays[`user_${key}`] = value;
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[ReviewModal] ✅ 检测到新格式 overlays（两套坐标），已转换为 InteractiveImage 格式:', {
        referenceKeys: Object.keys(referenceOverlays),
        userKeys: Object.keys(userOverlays)
      });
    }
  } else {
    // 旧格式：向后兼容，将同一套坐标同时用于参考图和用户图，并添加前缀
    Object.entries(overlaysRaw).forEach(([key, value]) => {
      referenceOverlays[`ref_${key}`] = value;
      userOverlays[`user_${key}`] = value;
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ReviewModal] ⚠️ 检测到旧格式 overlays（只有一套坐标），已转换为新格式并同时用于参考图和用户图。');
      console.warn('[ReviewModal] ⚠️ 建议后端更新为两套坐标格式（reference 和 user）。');
      console.warn('[ReviewModal] ⚠️ 旧格式 overlays keys:', Object.keys(overlaysRaw));
    }
  }
  
  // 【调试日志】记录接收到的完整数据（仅在开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.log('[ReviewModal] 接收到的 data:', {
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
      hasStyleSummary: !!data?.style_summary,
      styleSummaryLength: data?.style_summary ? data.style_summary.length : 0,
      hasComprehensiveReview: !!data?.comprehensive_review,
      comprehensiveReviewLength: data?.comprehensive_review ? data.comprehensive_review.length : 0,
      hasOverlays: !!data?.overlays,
      overlaysType: typeof data?.overlays,
      overlaysIsArray: Array.isArray(data?.overlays),
      overlaysKeys: data?.overlays && typeof data.overlays === 'object' && !Array.isArray(data.overlays) ? Object.keys(data.overlays) : [],
      overlaysCount: data?.overlays && typeof data.overlays === 'object' && !Array.isArray(data.overlays) ? Object.keys(data.overlays).length : 0,
      hasReferenceOverlays: !!(data?.overlays && typeof data.overlays === 'object' && 'reference' in data.overlays),
      hasUserOverlays: !!(data?.overlays && typeof data.overlays === 'object' && 'user' in data.overlays),
      referenceOverlaysKeys: data?.overlays?.reference && typeof data.overlays.reference === 'object' ? Object.keys(data.overlays.reference) : [],
      userOverlaysKeys: data?.overlays?.user && typeof data.overlays.user === 'object' ? Object.keys(data.overlays.user) : [],
      hasSimulatedHistogramData: !!data?.simulated_histogram_data,
      simulatedHistogramDataType: typeof data?.simulated_histogram_data,
      simulatedHistogramDataKeys: data?.simulated_histogram_data && typeof data.simulated_histogram_data === 'object' ? Object.keys(data.simulated_histogram_data) : [],
    });
  }
  
  // 【调试日志】记录 overlays 数据（仅在开发环境）
  if (process.env.NODE_ENV === 'development') {
    if (referenceOverlays && typeof referenceOverlays === 'object' && Object.keys(referenceOverlays).length > 0) {
      console.log('[ReviewModal] referenceOverlays 数据:', referenceOverlays);
      Object.entries(referenceOverlays).forEach(([key, value]: [string, any]) => {
        if (value && typeof value === 'object' && 'x' in value && 'y' in value) {
          console.log(`[ReviewModal] referenceOverlays.${key}:`, { x: value.x, y: value.y, w: value.w, h: value.h, label: value.label });
        }
      });
    }
    if (userOverlays && typeof userOverlays === 'object' && Object.keys(userOverlays).length > 0) {
      console.log('[ReviewModal] userOverlays 数据:', userOverlays);
      Object.entries(userOverlays).forEach(([key, value]: [string, any]) => {
        if (value && typeof value === 'object' && 'x' in value && 'y' in value) {
          console.log(`[ReviewModal] userOverlays.${key}:`, { x: value.x, y: value.y, w: value.w, h: value.h, label: value.label });
        }
      });
    }
    if ((!referenceOverlays || Object.keys(referenceOverlays).length === 0) && (!userOverlays || Object.keys(userOverlays).length === 0)) {
      console.warn('[ReviewModal] overlays 数据为空或格式不正确:', {
        overlaysRaw,
        overlaysType: typeof overlaysRaw,
        overlaysIsArray: Array.isArray(overlaysRaw),
        overlaysKeys: overlaysRaw && typeof overlaysRaw === 'object' && !Array.isArray(overlaysRaw) ? Object.keys(overlaysRaw) : [],
      });
    }
  }
  
  // 【调试日志】记录提取的字段值（仅在开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.log('[ReviewModal] 提取字段值:', {
      styleSummary: data?.style_summary ? `${data.style_summary.substring(0, 50)}...` : 'empty',
      styleSummaryLength: data?.style_summary ? data.style_summary.length : 0,
      comprehensiveReview: data?.comprehensive_review ? `${data.comprehensive_review.substring(0, 50)}...` : 'empty',
      comprehensiveReviewLength: data?.comprehensive_review ? data.comprehensive_review.length : 0,
      prosEvaluation: data?.pros_evaluation ? `${data.pros_evaluation.substring(0, 50)}...` : 'empty',
      prosEvaluationLength: data?.pros_evaluation ? data.pros_evaluation.length : 0,
    });
  }
  
  const styleSummary = data?.style_summary || "";
  const comprehensiveReview = data?.comprehensive_review || "";
  const prosEvaluation = data?.pros_evaluation || "";
  const feasibilityAssessment = data?.feasibility_assessment || {
    score: 0,
    level: t('review.feasibility.unknown') || "未知",
    recommendation: t('review.feasibility.no_recommendation') || "暂无建议"
  };

  // 【新增】是否使用新的 ImageOverlayViewer 组件（复刻 AI 诊断的成功经验）
  // 默认使用新组件，提供更好的视觉效果
  const useNewOverlayViewer = true;

  return (
    <BaseModal title={t('review.title') || "Visual Critique"} onClose={onClose} width="max-w-[95vw]">
      <div className="flex h-full">
        <div className="flex-[1.6] flex bg-carbon-950 relative">
           {/* 【新增】使用新的交互式图片组件（支持点击文字高亮图片区域，点击图片高亮文字） */}
           {useNewOverlayViewer ? (
             <>
               {/* 参考图：使用交互式组件 */}
               <div className="flex-1 flex flex-col items-center justify-center p-8">
                 <div className="w-full max-w-full">
                   <h3 className="mb-4 text-white text-sm font-bold uppercase tracking-wider">{t('review.label.ref_source') || "REF SOURCE"}</h3>
                   <InteractiveImage 
                     imageUrl={images.source}
                     overlays={referenceOverlays}
                     type="ref"
                     activeId={activeId}
                     onBoxClick={setActiveId}
                   />
                   {/* 【新增】图像验证描述卡片 - 参考图 */}
                   {data?.image_verification?.ref_image_content && (
                     <div className="mt-4 relative pl-3 border-l-2 border-optic-gold/50 bg-optic-gold/[0.03] p-3 rounded-r-sm">
                       <div className="text-[9px] font-mono text-optic-gold uppercase tracking-widest mb-1 flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-optic-gold rounded-full"></div>
                         {t('review.image_verification.ref') || "REF IMAGE DESCRIPTION"}
                       </div>
                       <p className="text-xs leading-relaxed text-gray-300">{data.image_verification.ref_image_content}</p>
                     </div>
                   )}
                 </div>
               </div>
               {/* 用户图：使用交互式组件 */}
               <div className="flex-1 flex flex-col items-center justify-center p-8 border-l border-white/5">
                 <div className="w-full max-w-full">
                   <h3 className="mb-4 text-white text-sm font-bold uppercase tracking-wider">{t('review.label.target_input') || "TARGET INPUT"}</h3>
                   <InteractiveImage 
                     imageUrl={images.target}
                     overlays={userOverlays}
                     type="user"
                     activeId={activeId}
                     onBoxClick={setActiveId}
                   />
                   {/* 【新增】图像验证描述卡片 - 用户图 */}
                   {data?.image_verification?.user_image_content && (
                     <div className="mt-4 relative pl-3 border-l-2 border-optic-accent/50 bg-optic-accent/[0.03] p-3 rounded-r-sm">
                       <div className="text-[9px] font-mono text-optic-accent uppercase tracking-widest mb-1 flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-optic-accent rounded-full"></div>
                         {t('review.image_verification.user') || "USER IMAGE DESCRIPTION"}
                       </div>
                       <p className="text-xs leading-relaxed text-gray-300">{data.image_verification.user_image_content}</p>
                     </div>
                   )}
                 </div>
               </div>
             </>
           ) : (
             <>
               {/* 【保留】原有的 AdaptiveImage 组件（向后兼容） */}
               <div className="flex-1 flex flex-col items-center justify-center p-8">
                 <AdaptiveImage src={images.source} label={t('review.label.ref_source') || "REF SOURCE"} overlays={referenceOverlays} activeOverlay={activeOverlay} onHoverOverlay={setHoveredSection} />
                 {/* 【新增】图像验证描述卡片 - 参考图 */}
                 {data?.image_verification?.ref_image_content && (
                   <div className="mt-4 w-full relative pl-3 border-l-2 border-optic-gold/50 bg-optic-gold/[0.03] p-3 rounded-r-sm">
                     <div className="text-[9px] font-mono text-optic-gold uppercase tracking-widest mb-1 flex items-center gap-2">
                       <div className="w-1.5 h-1.5 bg-optic-gold rounded-full"></div>
                       {t('review.image_verification.ref') || "REF IMAGE DESCRIPTION"}
                     </div>
                     <p className="text-xs leading-relaxed text-gray-300">{data.image_verification.ref_image_content}</p>
                   </div>
                 )}
               </div>
               <div className="flex-1 flex flex-col items-center justify-center p-8 border-l border-white/5">
                 <AdaptiveImage src={images.target} label={t('review.label.target_input') || "TARGET INPUT"} overlays={userOverlays} activeOverlay={activeOverlay} onHoverOverlay={setHoveredSection} />
                 {/* 【新增】图像验证描述卡片 - 用户图 */}
                 {data?.image_verification?.user_image_content && (
                   <div className="mt-4 w-full relative pl-3 border-l-2 border-optic-accent/50 bg-optic-accent/[0.03] p-3 rounded-r-sm">
                     <div className="text-[9px] font-mono text-optic-accent uppercase tracking-widest mb-1 flex items-center gap-2">
                       <div className="w-1.5 h-1.5 bg-optic-accent rounded-full"></div>
                       {t('review.image_verification.user') || "USER IMAGE DESCRIPTION"}
                     </div>
                     <p className="text-xs leading-relaxed text-gray-300">{data.image_verification.user_image_content}</p>
                   </div>
                 )}
               </div>
             </>
           )}
        </div>
        <div className="w-[500px] bg-carbon-900 border-l border-white/5 flex flex-col relative z-10">
            <div className="overflow-y-auto flex-1 custom-scrollbar relative">
                <div className="p-10 space-y-12">
                    {/* 【核心策略】风格总结 - 优化视觉设计 (Tech-Punk / High-End) */}
                    <div className="relative group">
                        {/* 背景特效 */}
                        <div className="absolute inset-0 bg-gradient-to-r from-optic-gold/10 to-transparent opacity-20 rounded-sm transition-opacity group-hover:opacity-30"></div>
                        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-optic-gold shadow-[0_0_15px_rgba(255,215,0,0.6)]"></div>
                        
                        {/* 装饰性线条 */}
                        <div className="absolute top-0 right-0 w-24 h-[1px] bg-gradient-to-l from-transparent via-optic-gold/50 to-transparent"></div>
                        <div className="absolute bottom-0 right-0 w-16 h-[1px] bg-gradient-to-l from-transparent via-optic-gold/30 to-transparent"></div>

                        <div className="p-6 relative overflow-hidden bg-black/20 backdrop-blur-sm border border-optic-gold/10 hover:border-optic-gold/20 transition-colors duration-500">
                            {/* 角标装饰 */}
                            <div className="absolute top-0 right-0 p-2">
                                <div className="w-2 h-2 border-t border-r border-optic-gold/40"></div>
                            </div>
                            <div className="absolute bottom-0 left-0 p-2">
                                <div className="w-2 h-2 border-b border-l border-optic-gold/40"></div>
                            </div>

                            {/* 标题栏 */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex flex-col items-center justify-center w-8 h-8 border border-optic-gold/30 rounded-sm bg-optic-gold/5">
                                    <span className="text-[10px] font-mono text-optic-gold font-bold">CS</span>
                                </div>
                                <div>
                                    <div className="text-[9px] font-mono text-optic-gold uppercase tracking-[0.2em] leading-none mb-1">
                                        {t('review.section.core_strategy') || "CORE STRATEGY"}
                                    </div>
                                    <div className="text-[10px] text-gray-500 font-mono tracking-wider scale-90 origin-left">
                                        STYLE REPLICATION PROTOCOL
                                    </div>
                                </div>
                            </div>

                            {/* 内容区域 */}
                            <div className="relative">
                                <p className="text-sm font-light text-gray-200 leading-relaxed whitespace-pre-wrap font-sans tracking-wide">
                                    {styleSummary || (t('review.no_style_summary') || "暂无风格总结")}
                                </p>
                                
                                {/* 底部扫描线动画 */}
                                <div className="absolute -bottom-6 left-0 right-0 h-[1px] bg-optic-gold/20 animate-pulse"></div>
                            </div>
                        </div>
                    </div>

                    {/* 【风格定义】Master Archetype & Visual Signature */}
                    {(data.master_archetype || data.visual_signature) && (
                        <div className="grid grid-cols-1 gap-4 mb-6">
                            {data.master_archetype && (
                                <TechContainer className="p-4 bg-white/[0.02] border-l-2 border-optic-accent">
                                    <div className="text-[9px] font-mono text-optic-accent uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-optic-accent rounded-full"></div>
                                        MASTER ARCHETYPE
                                    </div>
                                    <div className="text-sm font-medium text-white tracking-wide">
                                        {data.master_archetype}
                                    </div>
                                </TechContainer>
                            )}
                            {data.visual_signature && (
                                <TechContainer className="p-4 bg-white/[0.02] border-l-2 border-optic-gold">
                                    <div className="text-[9px] font-mono text-optic-gold uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-optic-gold rounded-full"></div>
                                        VISUAL SIGNATURE
                                    </div>
                                    <div className="text-xs text-gray-300 leading-relaxed italic">
                                        "{data.visual_signature}"
                                    </div>
                                </TechContainer>
                            )}
                        </div>
                    )}

                    {/* 【综合点评】整体分析（优化：Grid布局 + 卡片化） */}
                    <TechContainer className="p-6 mb-8 bg-gradient-to-br from-white/[0.03] to-transparent">
                        <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-3">
                            <div className="w-6 h-6 rounded-sm bg-white/10 flex items-center justify-center">
                                <span className="text-[10px] text-white">∑</span>
                            </div>
                            <div className="text-[10px] font-mono text-white/60 uppercase tracking-widest">
                                {t('review.section.comprehensive_review') || "COMPREHENSIVE REVIEW"}
                            </div>
                        </div>
                        {/* 使用 Grid 布局替代垂直堆叠 */}
                        <div className="grid grid-cols-1 gap-4">
                            {comprehensiveReview ? (
                                comprehensiveReview.split('\n\n').map((para: string, idx: number) => {
                                    if (!para.trim()) return null;
                                    
                                    // Check for headers like 【...】
                                    const isHeader = para.match(/^【(.*?)】/);
                                    if (isHeader) {
                                        const headerText = isHeader[1];
                                        const contentText = para.replace(/^【.*?】/, '').trim();
                                        
                                        return (
                                            <div key={idx} className="bg-black/40 p-4 rounded border-l-2 border-optic-gold/50 hover:border-optic-gold transition-colors group">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-1.5 h-1.5 bg-optic-gold/50 rounded-full group-hover:bg-optic-gold group-hover:shadow-[0_0_5px_#FFD700]"></div>
                                                    <h5 className="text-[10px] font-bold text-optic-gold/90 tracking-wider uppercase">{headerText}</h5>
                                                </div>
                                                <p className="text-xs text-gray-300 leading-relaxed font-light">{contentText}</p>
                                            </div>
                                        );
                                    }
                                    
                                    // 普通段落，作为次要信息显示
                                    return (
                                        <div key={idx} className="pl-4 border-l border-white/10">
                                            <p className="text-xs text-gray-400 leading-relaxed">
                                                {para}
                                            </p>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-sm text-gray-500 italic text-center py-4">
                                    {t('review.no_data') || "Waiting for detailed analysis..."}
                                </div>
                            )}
                        </div>
                    </TechContainer>

                    {/* 【维度分析】各维度详细分析 - 使用新的交互式文本块组件 */}
                    <div className="space-y-4">
                        {/* 【重要】使用新的交互式系统，支持点击文字高亮图片区域，点击图片高亮文字 */}
                        {ANALYSIS_SECTIONS.map((section) => {
                          // 根据 textKey 从 data 中提取内容
                          const content = data[section.textKey];
                          
                          return (
                            <AnalysisTextBlock
                              key={section.id}
                              sectionConfig={section}
                              content={content}
                              isActive={activeId === section.id}
                              onClick={() => handleSectionClick(section.id)}
                            />
                          );
                        })}
                        
                        {/* 【向后兼容】保留旧的 SectionBlock 用于其他没有配置的区块 */}
                        
                        {/* 【色彩策略】Saturation & Tonal Intent (折叠收纳) */}
                        {/* 注意：此区块没有对应的 overlay，所以不支持高亮功能 */}
                        {(data.saturation_strategy || data.tonal_intent) && (
                            <TechContainer className="p-5 mb-2 group">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1 h-4 bg-purple-500/50"></div>
                                    <h4 className="text-[11px] font-bold font-display uppercase tracking-widest text-gray-300">
                                        COLOR STRATEGY
                                    </h4>
                                </div>
                                <div className="space-y-4">
                                    {data.saturation_strategy && (
                                        <div>
                                            <div className="text-[9px] font-mono text-purple-400 uppercase tracking-widest mb-1">SATURATION STRATEGY</div>
                                            <p className="text-xs text-gray-400 leading-relaxed">{data.saturation_strategy}</p>
                                        </div>
                                    )}
                                    {data.tonal_intent && (
                                        <div>
                                            <div className="text-[9px] font-mono text-purple-400 uppercase tracking-widest mb-1">TONAL INTENT</div>
                                            <p className="text-xs text-gray-400 leading-relaxed">{data.tonal_intent}</p>
                                        </div>
                                    )}
                                </div>
                            </TechContainer>
                        )}

                        {/* 【优点评估】新增字段 */}
                        {/* 注意：此区块的 id 为 "advantages"，如果 overlays 中没有对应的 key，则不支持高亮功能 */}
                        {prosEvaluation && (
                            <SectionBlock 
                                title={t('review.section.pros_evaluation') || "Pros Evaluation"} 
                                content={prosEvaluation} 
                                id="advantages" 
                                onHover={setHoveredSection} 
                                onClick={handleSectionClick}
                                activeId={activeOverlay} 
                            />
                        )}
                    </div>
                    {/* 【直方图与参数对比】 */}
                    <div className="border-t border-white/5 pt-10">
                        <h4 className="text-[9px] font-mono text-gray-600 uppercase mb-6 tracking-widest">
                            {t('review.section.volumetric_luminance') || "Volumetric Luminance"}
                        </h4>
                        {/* 直方图描述 */}
                        {data.simulated_histogram_data?.description && (
                            <div className="mb-4 px-4">
                                <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1">HISTOGRAM ANALYSIS</div>
                                <p className="text-xs text-gray-400 leading-relaxed">{data.simulated_histogram_data.description}</p>
                            </div>
                        )}
                        {data.simulated_histogram_data?.ref_description && (
                             <div className="mb-4 px-4">
                                <div className="text-[9px] font-mono text-optic-gold/70 uppercase tracking-widest mb-1">REF HISTOGRAM</div>
                                <p className="text-xs text-gray-400 leading-relaxed">{data.simulated_histogram_data.ref_description}</p>
                            </div>
                        )}
                        <Histogram3D data={data.simulated_histogram_data} t={t} />
                        <div className="bg-carbon-800 border border-white/5 text-xs">
                            <div className="grid grid-cols-4 gap-4 px-4 py-2 text-[9px] uppercase tracking-widest text-gray-500 font-bold border-b border-white/5 bg-black/20">
                                <div>{t('review.table.param') || "Param"}</div>
                                <div className="text-center">{t('review.table.current') || "Current"}</div>
                                <div></div>
                                <div className="text-right text-optic-gold">{t('review.table.target') || "Target"}</div>
                            </div>
                            {/* 【安全访问】确保 parameter_comparison_table 存在且为数组 */}
                            {Array.isArray(data.parameter_comparison_table) && data.parameter_comparison_table.length > 0 ? (
                              data.parameter_comparison_table.map((row:any, i:number) => (
                                <div key={i} className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors group">
                                    <div className="text-gray-300 font-medium text-[11px]">{row.param}</div>
                                    <div className="text-gray-500 text-center font-mono text-[10px]">{row.user}</div>
                                    <div className="text-center text-gray-700 text-[10px]">→</div>
                                    <div className="text-optic-gold font-mono text-[10px] text-right font-bold">{row.suggest || row.ref || ""}</div>
                                </div>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-center text-white/40 text-sm">
                                {t('review.table.no_data') || "暂无参数对比数据"}
                              </div>
                            )}
                        </div>
                    </div>

                    {/* 【可行性评估】 */}
                    <div className="bg-gradient-to-r from-white/[0.02] to-transparent p-6 border-l-2 border-white/20">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">
                                    {t('review.feasibility.title') || "Feasibility"}
                                </div>
                                <div className="text-3xl font-display text-white tracking-tight">
                                    {feasibilityAssessment.score || 0}
                                    <span className="text-lg text-gray-600 ml-1">%</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[9px] text-green-500 font-mono mb-1 tracking-wide uppercase">
                                    {feasibilityAssessment.level || (t('review.feasibility.unknown') || "未知")}
                                </div>
                                <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <span>CONFIDENCE: <span className="text-white">{feasibilityAssessment.confidence || "LOW"}</span></span>
                                    {/* 【计算逻辑入口】在 confidence 旁添加 Popover - 硬编码算法逻辑和评分标准 */}
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button className="text-optic-accent hover:text-optic-accent/80 transition-colors cursor-pointer" title={t('review.feasibility.calculation_logic') || "查看计算逻辑"}>
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[500px] max-h-[600px] overflow-y-auto bg-carbon-900 border-white/10 text-white" align="end">
                                            <div className="space-y-4">
                                                {/* 标题 */}
                                                <div className="text-[10px] font-mono text-optic-accent uppercase tracking-widest mb-3 border-b border-white/10 pb-2">
                                                    {t('review.feasibility.calculation_logic') || "CALCULATION LOGIC"}
                                                </div>
                                                
                                                {/* 【硬编码】算法逻辑和评分标准 */}
                                                <div className="space-y-4 text-xs leading-relaxed">
                                                    {/* 综合得分计算公式 */}
                                                    <div className="bg-black/30 p-3 rounded border border-optic-gold/20">
                                                        <div className="text-optic-gold font-semibold mb-2 text-[11px] uppercase tracking-wider">
                                                            {t('review.feasibility.formula') || "SCORING FORMULA"}
                                                        </div>
                                                        <div className="font-mono text-gray-300 text-[11px]">
                                                            {t('review.feasibility.formula_content') || "Score = (L×25% + C×20% + S×18% + P×12% + D×5% + T×5% + Q×3% + R×7%) × 100"}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* 评分维度与权重 */}
                                                    <div>
                                                        <div className="text-optic-accent font-semibold mb-2 text-[11px] uppercase tracking-wider">
                                                            {t('review.feasibility.dimensions') || "SCORING DIMENSIONS & WEIGHTS"}
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            {[
                                                                { key: 'L', weight: '25%', name: t('review.feasibility.dim_L') || 'Lighting Similarity', desc: t('review.feasibility.dim_L_desc') || 'Light type, directionality, intensity' },
                                                                { key: 'C', weight: '20%', name: t('review.feasibility.dim_C') || 'Color Similarity', desc: t('review.feasibility.dim_C_desc') || 'Color tendency, saturation, temperature' },
                                                                { key: 'S', weight: '18%', name: t('review.feasibility.dim_S') || 'Semantic/Scene Similarity', desc: t('review.feasibility.dim_S_desc') || 'Scene type, subject type, theme' },
                                                                { key: 'P', weight: '12%', name: t('review.feasibility.dim_P') || 'Composition/Perspective', desc: t('review.feasibility.dim_P_desc') || 'Composition method, perspective, structure' },
                                                                { key: 'D', weight: '5%', name: t('review.feasibility.dim_D') || 'Dynamic/Exposure', desc: t('review.feasibility.dim_D_desc') || 'Dynamic range, exposure strategy, contrast' },
                                                                { key: 'T', weight: '5%', name: t('review.feasibility.dim_T') || 'Texture/Grain', desc: t('review.feasibility.dim_T_desc') || 'Texture detail, grain, sharpness' },
                                                                { key: 'Q', weight: '3%', name: t('review.feasibility.dim_Q') || 'Resolution/Quality', desc: t('review.feasibility.dim_Q_desc') || 'Resolution, image quality, noise' },
                                                                { key: 'R', weight: '7%', name: t('review.feasibility.dim_R') || 'Post-processing', desc: t('review.feasibility.dim_R_desc') || 'Post-processing style, color grading, effects' },
                                                            ].map((dim) => (
                                                                <div key={dim.key} className="pl-2 border-l-2 border-optic-accent/30 flex items-start gap-2">
                                                                    <div className="flex-shrink-0 w-16">
                                                                        <span className="text-optic-accent font-semibold">{dim.key}</span>
                                                                        <span className="text-gray-500 ml-1">({dim.weight})</span>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="text-gray-300 font-medium">{dim.name}</div>
                                                                        <div className="text-gray-500 text-[10px] mt-0.5">{dim.desc}</div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* 评分标准 */}
                                                    <div>
                                                        <div className="text-optic-accent font-semibold mb-2 text-[11px] uppercase tracking-wider">
                                                            {t('review.feasibility.scoring_standard') || "SCORING STANDARD"}
                                                        </div>
                                                        <div className="space-y-1.5 text-gray-300">
                                                            <div className="pl-2 border-l-2 border-green-500/30">
                                                                <span className="text-green-400 font-semibold">90-100分: </span>
                                                                <span>{t('review.feasibility.score_90_100') || "Highly consistent"}</span>
                                                            </div>
                                                            <div className="pl-2 border-l-2 border-blue-500/30">
                                                                <span className="text-blue-400 font-semibold">70-89分: </span>
                                                                <span>{t('review.feasibility.score_70_89') || "Similar with differences"}</span>
                                                            </div>
                                                            <div className="pl-2 border-l-2 border-yellow-500/30">
                                                                <span className="text-yellow-400 font-semibold">50-69分: </span>
                                                                <span>{t('review.feasibility.score_50_69') || "Different but adjustable"}</span>
                                                            </div>
                                                            <div className="pl-2 border-l-2 border-orange-500/30">
                                                                <span className="text-orange-400 font-semibold">30-49分: </span>
                                                                <span>{t('review.feasibility.score_30_49') || "Significant differences"}</span>
                                                            </div>
                                                            <div className="pl-2 border-l-2 border-red-500/30">
                                                                <span className="text-red-400 font-semibold">0-29分: </span>
                                                                <span>{t('review.feasibility.score_0_29') || "Almost impossible to convert"}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* 难度等级映射 */}
                                                    <div>
                                                        <div className="text-optic-accent font-semibold mb-2 text-[11px] uppercase tracking-wider">
                                                            {t('review.feasibility.difficulty_mapping') || "DIFFICULTY MAPPING"}
                                                        </div>
                                                        <div className="space-y-1.5 text-gray-300">
                                                            <div className="pl-2 border-l-2 border-green-500/30">
                                                                <span className="text-green-400 font-semibold">80-100分: </span>
                                                                <span>{t('review.feasibility.diff_easy') || "Easy"}</span>
                                                            </div>
                                                            <div className="pl-2 border-l-2 border-blue-500/30">
                                                                <span className="text-blue-400 font-semibold">60-79分: </span>
                                                                <span>{t('review.feasibility.diff_medium') || "Medium"}</span>
                                                            </div>
                                                            <div className="pl-2 border-l-2 border-yellow-500/30">
                                                                <span className="text-yellow-400 font-semibold">40-59分: </span>
                                                                <span>{t('review.feasibility.diff_medium_high') || "Medium-High"}</span>
                                                            </div>
                                                            <div className="pl-2 border-l-2 border-orange-500/30">
                                                                <span className="text-orange-400 font-semibold">20-39分: </span>
                                                                <span>{t('review.feasibility.diff_hard') || "Hard"}</span>
                                                            </div>
                                                            <div className="pl-2 border-l-2 border-red-500/30">
                                                                <span className="text-red-400 font-semibold">0-19分: </span>
                                                                <span>{t('review.feasibility.diff_very_hard') || "Very Hard"}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* 说明 */}
                                                    <div className="bg-black/20 p-2 rounded border border-white/5 text-[10px] text-gray-400 italic">
                                                        {t('review.feasibility.note') || "Note: The AI evaluates feasibility based on comprehensive analysis conclusions, not strictly following the formula. The score reflects the actual conversion difficulty."}
                                                    </div>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </div>
                        
                        {/* 限制因素 */}
                        {feasibilityAssessment.limitations && (
                            <div className="mb-3 text-xs">
                                <div className="text-[9px] text-red-400/70 uppercase tracking-widest mb-1">
                                    {t('review.feasibility.limitations') || "LIMITATIONS"}
                                </div>
                                {/* 【修复】解析 limitations，支持数组和字符串两种格式 */}
                                {(() => {
                                    const rawLimitations = feasibilityAssessment.limitations;
                                    
                                    // 【类型检查】处理数组和字符串两种格式
                                    // 根据后端代码，limitations 可能是：
                                    // 1. 字符串：Gemini 返回的文本（包含限制因素和评分逻辑）
                                    // 2. 数组：CV 算法返回的限制因素列表
                                    let limitations: string;
                                    if (Array.isArray(rawLimitations)) {
                                        // 如果是数组，转换为字符串（用换行符连接）
                                        limitations = rawLimitations.join('\n');
                                    } else if (typeof rawLimitations === 'string') {
                                        // 如果是字符串，直接使用
                                        limitations = rawLimitations;
                                    } else {
                                        // 如果是其他类型，转换为字符串
                                        limitations = String(rawLimitations || "");
                                    }
                                    
                                    // 如果 limitations 为空，不显示
                                    if (!limitations || limitations.trim() === "") {
                                        return null;
                                    }
                                    
                                    // 查找【可行性评分逻辑】或【可行性评分计算】部分的位置
                                    const calculationMatch = limitations.match(/【可行性评分[逻辑计算]】/);
                                    if (calculationMatch && calculationMatch.index !== undefined) {
                                        // 如果包含计算逻辑部分，只显示限制因素部分（计算逻辑在 Popover 中显示）
                                        const limitationsOnly = limitations.substring(0, calculationMatch.index).trim();
                                        return (
                                            <p className="text-gray-400 leading-relaxed whitespace-pre-wrap">
                                                {limitationsOnly || limitations}
                                            </p>
                                        );
                                    }
                                    // 如果没有计算逻辑部分，显示完整内容
                                    return (
                                        <p className="text-gray-400 leading-relaxed whitespace-pre-wrap">
                                            {limitations}
                                        </p>
                                    );
                                })()}
                            </div>
                        )}

                        {/* 建议 */}
                        <div className="text-xs">
                            <div className="text-[9px] text-optic-gold/70 uppercase tracking-widest mb-1">
                                {t('review.feasibility.recommendation') || "RECOMMENDATION"}
                            </div>
                            <p className="text-gray-300 leading-relaxed">
                                {feasibilityAssessment.recommendation || (t('review.feasibility.no_recommendation') || "暂无建议")}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </BaseModal>
  );
};
