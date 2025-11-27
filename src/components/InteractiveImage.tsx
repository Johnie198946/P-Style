import React from 'react';
import { ANALYSIS_SECTIONS, AnalysisSectionConfig } from './config/AnalysisConfig';

interface OverlayData {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

interface InteractiveImageProps {
  imageUrl: string;
  overlays: Record<string, OverlayData>; // 例如 { ref_visual_subject: {...}, user_visual_subject: {...} }
  type: 'ref' | 'user'; // 参考图或用户图
  activeId: string | null; // 当前激活的 section id（例如 'visual_subject'）
  onBoxClick: (sectionId: string) => void; // 点击框时回调，用于反向激活文字
  className?: string;
}

/**
 * 交互式图片组件
 * 根据 activeId 条件渲染标注框，实现聚焦效果
 * 
 * 核心逻辑：
 * - 如果 activeId 为 null：所有框以 30% 透明度显示（概览模式）
 * - 如果 activeId 有值：选中的框 100% 显示，其他的降到 10% 或隐藏（聚焦模式）
 * - 点击框可以反向激活文字（双向互动）
 */
export const InteractiveImage: React.FC<InteractiveImageProps> = ({ 
  imageUrl, 
  overlays, 
  type, 
  activeId, 
  onBoxClick,
  className = ''
}) => {
  
  if (!overlays || Object.keys(overlays).length === 0) {
    return (
      <div className={`relative flex-1 bg-gray-900 rounded-lg overflow-hidden ${className}`}>
        <img 
          src={imageUrl} 
          alt={type === 'ref' ? 'Reference Image' : 'User Image'} 
          className="w-full h-full object-contain opacity-80" 
        />
      </div>
    );
  }

  return (
    <div className={`relative flex-1 bg-gray-900 rounded-lg overflow-hidden group ${className}`}>
      {/* 底图 */}
      <img 
        src={imageUrl} 
        alt={type === 'ref' ? 'Reference Image' : 'User Image'} 
        className="w-full h-full object-contain opacity-80" 
      />
      
      {/* SVG 覆盖层 - 使用 viewBox="0 0 100 100" 直接使用百分比坐标 */}
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none" 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
      >
        {ANALYSIS_SECTIONS.map((section: AnalysisSectionConfig) => {
          // 动态拼装 Key: ref_visual_subject 或 user_visual_subject
          // 注意：overlays 的键格式应该是 "ref_visual_subject" 或 "user_visual_subject"
          const boxKey = `${type}_${section.boxSuffix}`;
          const boxData = overlays[boxKey];
          
          // 【调试日志】仅在开发环境记录
          if (process.env.NODE_ENV === 'development' && !boxData) {
            console.debug(`[InteractiveImage] ${type} 图片未找到 ${boxKey} 的标注框数据`);
          }

          if (!boxData) return null;

          // 判断是否高亮
          const isSelected = activeId === section.id;
          
          // 【核心逻辑】解决"一股脑显示"问题
          // 如果没有任何选中项：所有框都以 30% 透明度显示（概览模式）
          // 如果选了某个东西：选中的框 100% 显示，其他的降到 10%（聚焦模式）
          const opacity = activeId ? (isSelected ? 1 : 0.1) : 0.3;
          const strokeWidth = isSelected ? 0.8 : 0.3;

          return (
            <g 
              key={section.id} 
              onClick={() => onBoxClick(section.id)} // 点击框反向激活文字
              className="pointer-events-auto cursor-pointer transition-all duration-300"
            >
              {/* 标注框 */}
              <rect
                x={boxData.x}
                y={boxData.y}
                width={boxData.w}
                height={boxData.h}
                fill="transparent"
                stroke={section.color}
                strokeWidth={strokeWidth}
                style={{ opacity }}
                className="hover:opacity-100 transition-opacity duration-200"
              />
              
              {/* 仅在选中时显示 Label */}
              {isSelected && (
                <text 
                  x={boxData.x} 
                  y={Math.max(boxData.y - 2, 2)} 
                  fill={section.color} 
                  fontSize="3" 
                  fontWeight="bold"
                  className="pointer-events-none"
                >
                  {boxData.label || section.title}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

