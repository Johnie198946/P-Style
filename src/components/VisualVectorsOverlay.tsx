import React from 'react';

// 定义类型
interface Point { 
  x: number; 
  y: number; 
}

interface Vector {
  start: Point;
  end: Point;
  type: 'leading' | 'perspective' | 'horizon' | 'distraction';
  strength?: number;
}

interface VisualFlowData {
  vanishing_point?: Point;
  vectors?: Vector[];
}

interface Props {
  data: VisualFlowData;
  width: number;  // 图片容器宽
  height: number; // 图片容器高
}

/**
 * 视觉向量覆盖层组件
 * 实现"X-Ray Vision"（几何透视眼）效果，显示消失点和向量线条
 * 
 * 核心功能：
 * - 渲染消失点（紫红色十字准星，带脉冲动画）
 * - 渲染向量线条（根据类型使用不同颜色和样式）
 * - 支持箭头标记（引导线和透视线）
 * - 支持渐变效果（模拟视线流动）
 * 
 * @param data - 视觉流数据，包含消失点和向量数组
 * @param width - 图片容器宽度（用于计算，但实际使用百分比坐标）
 * @param height - 图片容器高度（用于计算，但实际使用百分比坐标）
 */
export const VisualVectorsOverlay: React.FC<Props> = ({ data, width, height }) => {
  if (!data?.vectors || data.vectors.length === 0) {
    return null;
  }

  // 颜色配置字典
  const COLOR_MAP = {
    leading: { 
      stroke: "#FFD700", // 金色：主引导线
      opacity: 0.9, 
      width: 2 
    },
    perspective: { 
      stroke: "#00FFFF", // 青色：透视辅助线
      opacity: 0.5, 
      width: 1 
    },
    horizon: { 
      stroke: "#FFFFFF", // 白色虚线：地平线
      opacity: 0.6, 
      width: 1, 
      dash: "5,5" 
    },
    distraction: { 
      stroke: "#FF0000", // 红色：干扰线
      opacity: 0.8, 
      width: 2 
    }
  };

  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox="0 0 100 100" 
      preserveAspectRatio="none"
      className="absolute inset-0 pointer-events-none z-10"
    >
      <defs>
        {/* 定义箭头标记 */}
        <marker 
          id="arrow-leading" 
          markerWidth="10" 
          markerHeight="10" 
          refX="9" 
          refY="3" 
          orient="auto"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="#FFD700" />
        </marker>
        <marker 
          id="arrow-perspective" 
          markerWidth="8" 
          markerHeight="8" 
          refX="7" 
          refY="3" 
          orient="auto"
        >
          <path d="M0,0 L0,6 L7,3 z" fill="#00FFFF" opacity="0.6"/>
        </marker>
        
        {/* 定义渐变：从实到虚，模拟视线流动 */}
        <linearGradient id="fade-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* 1. 渲染消失点 (Vanishing Point) */}
      {data.vanishing_point && (
        <g className="animate-pulse">
          <circle 
            cx={data.vanishing_point.x} 
            cy={data.vanishing_point.y} 
            r="1.5" 
            fill="white" 
            stroke="#FF00FF" 
            strokeWidth="0.5"
          />
          {/* 十字准星 */}
          <line 
            x1={data.vanishing_point.x - 3} 
            y1={data.vanishing_point.y} 
            x2={data.vanishing_point.x + 3} 
            y2={data.vanishing_point.y} 
            stroke="#FF00FF" 
            strokeWidth="0.2" 
            opacity="0.7"
          />
          <line 
            x1={data.vanishing_point.x} 
            y1={data.vanishing_point.y - 3} 
            x2={data.vanishing_point.x} 
            y2={data.vanishing_point.y + 3} 
            stroke="#FF00FF" 
            strokeWidth="0.2" 
            opacity="0.7"
          />
        </g>
      )}

      {/* 2. 渲染向量线 (Vectors) */}
      {data.vectors.map((vec, idx) => {
        const style = COLOR_MAP[vec.type] || COLOR_MAP.perspective;
        const markerUrl = vec.type === 'leading' 
          ? 'url(#arrow-leading)' 
          : vec.type === 'perspective' 
            ? 'url(#arrow-perspective)' 
            : '';

        return (
          <g key={idx} className="vector-group">
            {/* 核心线条 */}
            <line
              x1={vec.start.x}
              y1={vec.start.y}
              x2={vec.end.x}
              y2={vec.end.y}
              stroke={style.stroke}
              strokeWidth={style.width * 0.4} // SVG坐标系下线宽需调整
              strokeDasharray={style.dash}
              opacity={style.opacity}
              markerEnd={markerUrl}
              strokeLinecap="round"
            />
            
            {/* 可选：如果是主引导线，加一个很淡的粗光晕 */}
            {vec.type === 'leading' && (
              <line
                x1={vec.start.x}
                y1={vec.start.y}
                x2={vec.end.x}
                y2={vec.end.y}
                stroke={style.stroke}
                strokeWidth="1"
                opacity="0.1"
                filter="blur(1px)"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};


