import React from 'react';

// 定义后端返回的数据结构 (对应 Part 1 的 overlays)
interface OverlayData {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

interface ImageOverlayViewerProps {
  imageUrl: string;
  // 传入 overlays 对象 (例如 data.overlays.reference_overlays)
  overlays: Record<string, OverlayData>; 
  color?: string; // 框的颜色，默认青色
  className?: string; // 额外的 CSS 类名
}

/**
 * 图片标注框查看器组件
 * 在图片上显示浮动标注框，复刻 AI 诊断的成功经验
 * 
 * 核心原理：CSS 绝对定位 (Absolute Positioning)
 * - 父容器：relative（相对定位），包裹图片
 * - 图片：宽度 100%
 * - 标注框：absolute（绝对定位），使用后端返回的百分比坐标
 * 
 * @param imageUrl - 图片 URL
 * @param overlays - 标注框数据对象，key 为标注类型（如 "ref_visual_subject"），value 为坐标和标签
 * @param color - 框的颜色，默认赛博朋克青 (#00E5FF)
 * @param className - 额外的 CSS 类名
 */
const ImageOverlayViewer: React.FC<ImageOverlayViewerProps> = ({ 
  imageUrl, 
  overlays, 
  color = '#00E5FF', // 赛博朋克青
  className = ''
}) => {
  
  // 将对象转换为数组以便遍历 (因为后端返回的是 key-value)
  const overlayList = Object.entries(overlays || {}).map(([key, value]) => ({
    id: key,
    ...value
  }));

  // 如果没有标注框数据，只显示图片
  if (!overlays || overlayList.length === 0) {
    return (
      <div className={`relative w-full rounded-lg overflow-hidden ${className}`}>
        <img 
          src={imageUrl} 
          alt="Analysis Base" 
          className="w-full h-auto object-cover block"
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full rounded-lg overflow-hidden group ${className}`}>
      {/* 1. 底图 */}
      <img 
        src={imageUrl} 
        alt="Analysis Base" 
        className="w-full h-auto object-cover block"
      />

      {/* 2. 遍历并渲染所有框 */}
      {overlayList.map((item) => (
        <div
          key={item.id}
          className="absolute border-2 shadow-[0_0_10px_rgba(0,0,0,0.3)] transition-all duration-300 hover:bg-white/10"
          style={{
            // 核心：使用后端返回的百分比进行定位
            left: `${item.x}%`,
            top: `${item.y}%`,
            width: `${item.w}%`,
            height: `${item.h}%`,
            borderColor: color,
            boxShadow: `0 0 8px ${color}40` // 给框加一点发光效果
          }}
        >
          {/* 3. 标签 (Label) - 悬浮在框的左上角 */}
          <div 
            className="absolute -top-7 left-0 px-2 py-0.5 text-xs font-bold text-black rounded-sm whitespace-nowrap flex items-center gap-1"
            style={{ backgroundColor: color }}
          >
            {/* 可选：加个小图标 */}
            <span className="w-1.5 h-1.5 bg-black rounded-full animate-pulse"></span>
            {item.label || item.id.replace('_', ' ')} {/* 这里显示 Gemini 生成的 "Red Umbrella" 等文案 */}
          </div>

          {/* 装饰：四个角的定位线 (让它看起来更像 AI HUD) */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white opacity-50"></div>
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-white opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-white opacity-50"></div>
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white opacity-50"></div>
        </div>
      ))}
    </div>
  );
};

export default ImageOverlayViewer;

