import { useState, useRef } from 'react';

interface CurveVisualizationProps {
  points: any[];
  channel: string;
}

export function CurveVisualizationLR({ points, channel }: CurveVisualizationProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ input: number; output: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const channelColors: { [key: string]: string } = {
    luma: '#6b7280',
    red: '#ef4444',
    green: '#10b981',
    blue: '#3b82f6',
    红: '#ef4444',
    绿: '#10b981',
    蓝: '#3b82f6',
  };
  
  const color = channelColors[channel.toLowerCase()] || channelColors.luma;
  
  // 解析所有点位数据
  const parsedPoints = points?.map((point: any) => {
    const match = point.point?.match(/\((\d+),\s*(\d+)\)/);
    if (match) {
      return {
        x: parseInt(match[1]),
        y: parseInt(match[2])
      };
    }
    return null;
  }).filter(Boolean) || [];

  // 添加起点和终点
  const allPoints = [...parsedPoints];
  if (allPoints.length > 0) {
    if (allPoints[0].x > 0) {
      allPoints.unshift({ x: 0, y: 0 });
    }
    if (allPoints[allPoints.length - 1].x < 255) {
      allPoints.push({ x: 255, y: 255 });
    }
  }

  // 根据输入值插值计算输出值
  const getOutputValue = (inputValue: number) => {
    if (allPoints.length === 0) return inputValue;
    
    for (let i = 0; i < allPoints.length - 1; i++) {
      const p1 = allPoints[i];
      const p2 = allPoints[i + 1];
      
      if (inputValue >= p1.x && inputValue <= p2.x) {
        const t = (inputValue - p1.x) / (p2.x - p1.x);
        return Math.round(p1.y + t * (p2.y - p1.y));
      }
    }
    
    return inputValue;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const padding = 10;
    const chartWidth = 180;
    const chartHeight = 180;
    
    if (x >= padding && x <= padding + chartWidth && y >= padding && y <= padding + chartHeight) {
      const inputValue = Math.round(((x - padding) / chartWidth) * 255);
      const outputValue = getOutputValue(inputValue);
      
      setHoveredPoint({ input: inputValue, output: outputValue });
    } else {
      setHoveredPoint(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };
  
  const createPath = () => {
    if (allPoints.length === 0) return '';
    
    const width = 200;
    const height = 200;
    const padding = 10;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const scaledPoints = allPoints.map((p: any) => ({
      x: padding + (p.x / 255) * chartWidth,
      y: height - padding - (p.y / 255) * chartHeight
    }));
    
    let path = `M ${scaledPoints[0].x} ${scaledPoints[0].y}`;
    
    for (let i = 1; i < scaledPoints.length; i++) {
      path += ` L ${scaledPoints[i].x} ${scaledPoints[i].y}`;
    }
    
    return path;
  };
  
  const pathData = createPath();
  
  return (
    <div className="relative bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <svg 
        ref={svgRef}
        width="200" 
        height="200" 
        className="mx-auto cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <line x1="10" y1="10" x2="10" y2="190" stroke="#e5e7eb" strokeWidth="1" />
        <line x1="10" y1="190" x2="190" y2="190" stroke="#e5e7eb" strokeWidth="1" />
        <line x1="10" y1="10" x2="190" y2="10" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2,2" />
        <line x1="190" y1="10" x2="190" y2="190" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2,2" />
        
        <line x1="10" y1="190" x2="190" y2="10" stroke="#d1d5db" strokeWidth="1" strokeDasharray="4,4" />
        
        {pathData && (
          <path
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        
        {points && points.map((point: any, idx: number) => {
          const match = point.point?.match(/\((\d+),\s*(\d+)\)/);
          if (match) {
            const x = 10 + (parseInt(match[1]) / 255) * 180;
            const y = 190 - (parseInt(match[2]) / 255) * 180;
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r="3"
                fill={color}
                stroke="white"
                strokeWidth="1.5"
              />
            );
          }
          return null;
        })}

        {hoveredPoint && (
          <g>
            <line 
              x1={10 + (hoveredPoint.input / 255) * 180} 
              y1="10" 
              x2={10 + (hoveredPoint.input / 255) * 180} 
              y2="190" 
              stroke={color} 
              strokeWidth="1" 
              strokeDasharray="2,2"
              opacity="0.5"
            />
            <line 
              x1="10" 
              y1={190 - (hoveredPoint.output / 255) * 180} 
              x2="190" 
              y2={190 - (hoveredPoint.output / 255) * 180} 
              stroke={color} 
              strokeWidth="1" 
              strokeDasharray="2,2"
              opacity="0.5"
            />
            <circle
              cx={10 + (hoveredPoint.input / 255) * 180}
              cy={190 - (hoveredPoint.output / 255) * 180}
              r="4"
              fill={color}
              stroke="white"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {/* Labels at bottom */}
      <div className="mt-2 text-center text-xs text-gray-400">
        输入 → 输出
      </div>

      {/* Hover tooltip */}
      {hoveredPoint && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap z-20">
          <div className="flex gap-3">
            <span>输入: {hoveredPoint.input}</span>
            <span>输出: {hoveredPoint.output}</span>
          </div>
        </div>
      )}
    </div>
  );
}
