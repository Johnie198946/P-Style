import React from 'react';

/**
 * 三分构图网格覆盖层组件
 * 实现"Rule of Thirds"（三分法构图）可视化
 * 
 * 核心功能：
 * - 渲染 3x3 网格线（九宫格）
 * - 显示四个黄金分割点（焦点位置）
 * - 支持淡入淡出动画
 */
interface GridOverlayProps {
  className?: string;
}

export const GridOverlay: React.FC<GridOverlayProps> = ({ className = '' }) => {
  return (
    <div className={`absolute inset-0 pointer-events-none z-10 ${className}`}>
      {/* 3x3 网格 */}
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          {/* 光晕效果 */}
          <filter id="glow-grid">
            <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* 垂直分割线 */}
        <line 
          x1="33.333" 
          y1="0" 
          x2="33.333" 
          y2="100" 
          stroke="rgba(255, 255, 255, 0.3)" 
          strokeWidth="0.3"
          strokeDasharray="1,2"
          filter="url(#glow-grid)"
        />
        <line 
          x1="66.666" 
          y1="0" 
          x2="66.666" 
          y2="100" 
          stroke="rgba(255, 255, 255, 0.3)" 
          strokeWidth="0.3"
          strokeDasharray="1,2"
          filter="url(#glow-grid)"
        />
        
        {/* 水平分割线 */}
        <line 
          x1="0" 
          y1="33.333" 
          x2="100" 
          y2="33.333" 
          stroke="rgba(255, 255, 255, 0.3)" 
          strokeWidth="0.3"
          strokeDasharray="1,2"
          filter="url(#glow-grid)"
        />
        <line 
          x1="0" 
          y1="66.666" 
          x2="100" 
          y2="66.666" 
          stroke="rgba(255, 255, 255, 0.3)" 
          strokeWidth="0.3"
          strokeDasharray="1,2"
          filter="url(#glow-grid)"
        />
        
        {/* 四个黄金分割点（焦点） */}
        {/* 左上 */}
        <g className="animate-pulse">
          <circle 
            cx="33.333" 
            cy="33.333" 
            r="1.2" 
            fill="rgba(255, 255, 255, 0.9)" 
            stroke="rgba(59, 130, 246, 0.8)" 
            strokeWidth="0.3"
            filter="url(#glow-grid)"
          />
          <circle 
            cx="33.333" 
            cy="33.333" 
            r="0.8" 
            fill="rgba(59, 130, 246, 0.6)"
          />
        </g>
        
        {/* 右上 */}
        <g className="animate-pulse" style={{ animationDelay: '0.25s' }}>
          <circle 
            cx="66.666" 
            cy="33.333" 
            r="1.2" 
            fill="rgba(255, 255, 255, 0.9)" 
            stroke="rgba(59, 130, 246, 0.8)" 
            strokeWidth="0.3"
            filter="url(#glow-grid)"
          />
          <circle 
            cx="66.666" 
            cy="33.333" 
            r="0.8" 
            fill="rgba(59, 130, 246, 0.6)"
          />
        </g>
        
        {/* 左下 */}
        <g className="animate-pulse" style={{ animationDelay: '0.5s' }}>
          <circle 
            cx="33.333" 
            cy="66.666" 
            r="1.2" 
            fill="rgba(255, 255, 255, 0.9)" 
            stroke="rgba(59, 130, 246, 0.8)" 
            strokeWidth="0.3"
            filter="url(#glow-grid)"
          />
          <circle 
            cx="33.333" 
            cy="66.666" 
            r="0.8" 
            fill="rgba(59, 130, 246, 0.6)"
          />
        </g>
        
        {/* 右下 */}
        <g className="animate-pulse" style={{ animationDelay: '0.75s' }}>
          <circle 
            cx="66.666" 
            cy="66.666" 
            r="1.2" 
            fill="rgba(255, 255, 255, 0.9)" 
            stroke="rgba(59, 130, 246, 0.8)" 
            strokeWidth="0.3"
            filter="url(#glow-grid)"
          />
          <circle 
            cx="66.666" 
            cy="66.666" 
            r="0.8" 
            fill="rgba(59, 130, 246, 0.6)"
          />
        </g>
      </svg>
    </div>
  );
};

