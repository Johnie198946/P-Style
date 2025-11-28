import React from 'react';

/**
 * 视觉质量（视觉重心）覆盖层组件
 * 显示视觉重心多边形和中心点
 */
interface VisualMassOverlayProps {
  visualData?: {
    saliency_mask_url?: string;
    subject_poly?: string;
    visual_mass?: {
      center_point?: { x: number; y: number };
      polygon_points?: Array<{ x: number; y: number }>;
      vertices?: number[][];
      score?: number;
      composition_rule?: string;
    };
  };
  className?: string;
}

export const VisualMassOverlay: React.FC<VisualMassOverlayProps> = ({ 
  visualData, 
  className = '' 
}) => {
  if (!visualData) return null;

  const visualMass = visualData.visual_mass;
  if (!visualMass) return null;

  // 优先使用遮罩图 URL（如果有）
  if (visualData.saliency_mask_url) {
    return (
      <div className={`absolute inset-0 pointer-events-none z-10 ${className}`}>
        <img 
          src={visualData.saliency_mask_url} 
          alt="Visual Mass Mask" 
          className="w-full h-full object-contain mix-blend-screen opacity-50"
        />
        {/* 中心点标记 */}
        {visualMass.center_point && (
          <div 
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${visualMass.center_point.x}%`,
              top: `${visualMass.center_point.y}%`,
            }}
          >
            <div className="w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.8)] animate-pulse" />
          </div>
        )}
      </div>
    );
  }

  // 后备方案：使用多边形
  const polygonPoints = visualMass.polygon_points || 
    (visualMass.vertices ? visualMass.vertices.map((v: number[]) => ({ x: v[0], y: v[1] })) : []);

  if (polygonPoints.length === 0) return null;

  const points = polygonPoints.map((p: { x: number; y: number }) => {
    // 确保坐标是百分比格式（0-100）
    const x = typeof p.x === 'string' ? parseFloat(p.x.replace('%', '')) : (p.x > 1 ? p.x : p.x * 100);
    const y = typeof p.y === 'string' ? parseFloat(p.y.replace('%', '')) : (p.y > 1 ? p.y : p.y * 100);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className={`absolute inset-0 pointer-events-none z-10 ${className}`}>
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          {/* 光晕效果 */}
          <filter id="glow-mass">
            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          {/* 渐变填充 */}
          <radialGradient id="mass-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(250, 204, 21, 0.4)" />
            <stop offset="100%" stopColor="rgba(250, 204, 21, 0.1)" />
          </radialGradient>
        </defs>
        
        {/* 多边形填充 */}
        <polygon 
          points={points} 
          fill="url(#mass-gradient)" 
          stroke="rgba(250, 204, 21, 0.8)" 
          strokeWidth="0.5"
          filter="url(#glow-mass)"
          className="animate-pulse"
          style={{ animationDuration: '3s' }}
        />
        
        {/* 中心点（视觉重心） */}
        {visualMass.center_point && (
          <g className="animate-pulse">
            <circle 
              cx={visualMass.center_point.x} 
              cy={visualMass.center_point.y} 
              r="1.5" 
              fill="rgba(250, 204, 21, 0.9)" 
              stroke="rgba(250, 204, 21, 1)" 
              strokeWidth="0.3"
              filter="url(#glow-mass)"
            />
            {/* 十字准星 */}
            <line 
              x1={visualMass.center_point.x - 2} 
              y1={visualMass.center_point.y} 
              x2={visualMass.center_point.x + 2} 
              y2={visualMass.center_point.y} 
              stroke="rgba(250, 204, 21, 1)" 
              strokeWidth="0.2" 
              opacity="0.8"
            />
            <line 
              x1={visualMass.center_point.x} 
              y1={visualMass.center_point.y - 2} 
              x2={visualMass.center_point.x} 
              y2={visualMass.center_point.y + 2} 
              stroke="rgba(250, 204, 21, 1)" 
              strokeWidth="0.2" 
              opacity="0.8"
            />
          </g>
        )}
      </svg>
    </div>
  );
};

