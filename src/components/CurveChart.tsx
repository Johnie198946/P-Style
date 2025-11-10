import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';

type ChannelType = 'rgb' | 'red' | 'green' | 'blue';

interface CurveChartProps {
  className?: string;
}

export function CurveChart({ className = '' }: CurveChartProps) {
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>('rgb');
  const [hoveredPoint, setHoveredPoint] = useState<{ input: number; output: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // 生成曲线路径（模拟S曲线）
  const generateCurvePath = (channel: ChannelType) => {
    const points: [number, number][] = [];
    const width = 300;
    const height = 300;
    
    // 根据不同通道生成不同的曲线
    for (let x = 0; x <= width; x += 5) {
      const t = x / width;
      let y;
      
      switch (channel) {
        case 'rgb':
          // 标准S曲线（增加对比度）
          y = height * (1 - (Math.pow(t, 0.8) * 0.6 + t * 0.4));
          break;
        case 'red':
          // 红色通道略微提升
          y = height * (1 - (Math.pow(t, 0.75) * 0.55 + t * 0.45));
          break;
        case 'green':
          // 绿色通道保持平衡
          y = height * (1 - (Math.pow(t, 0.85) * 0.58 + t * 0.42));
          break;
        case 'blue':
          // 蓝色通道略微降低
          y = height * (1 - (Math.pow(t, 0.9) * 0.62 + t * 0.38));
          break;
      }
      
      points.push([x, Math.max(0, Math.min(height, y))]);
    }
    
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  };

  // 处理鼠标移动
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 转换为曲线坐标 (0-255)
    const padding = 10;
    const chartWidth = 300 - padding * 2;
    const chartHeight = 300 - padding * 2;
    
    if (x < padding || x > 300 - padding || y < padding || y > 300 - padding) {
      setHoveredPoint(null);
      return;
    }
    
    const input = Math.round(((x - padding) / chartWidth) * 255);
    const output = Math.round(((300 - padding - y) / chartHeight) * 255);
    
    setHoveredPoint({ input, output: Math.max(0, Math.min(255, output)) });
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  const channels: { type: ChannelType; label: string; color: string; strokeColor: string }[] = [
    { type: 'rgb', label: '曲线', color: 'bg-gray-700 text-white', strokeColor: '#374151' },
    { type: 'red', label: '红', color: 'bg-red-500 text-white', strokeColor: '#ef4444' },
    { type: 'green', label: '绿', color: 'bg-green-500 text-white', strokeColor: '#22c55e' },
    { type: 'blue', label: '蓝', color: 'bg-blue-500 text-white', strokeColor: '#3b82f6' },
  ];

  const currentChannel = channels.find(ch => ch.type === selectedChannel)!;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Curve Chart */}
      <div className="relative bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        {/* Channel Selector - Inside Chart (Top Right) */}
        <div className="absolute top-4 right-4 flex gap-1.5 z-10">
          {channels.map((channel) => (
            <button
              key={channel.type}
              onClick={() => setSelectedChannel(channel.type)}
              className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                selectedChannel === channel.type
                  ? channel.color
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {channel.label}
            </button>
          ))}
        </div>

        <svg
          ref={svgRef}
          viewBox="0 0 300 300"
          className="w-full h-auto"
          style={{ maxHeight: '300px' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Grid lines */}
          <g stroke="#e5e7eb" strokeWidth="1">
            {[0, 1, 2, 3, 4].map((i) => {
              const pos = (i * 300) / 4;
              return (
                <g key={i}>
                  <line x1={pos} y1="0" x2={pos} y2="300" />
                  <line x1="0" y1={pos} x2="300" y2={pos} />
                </g>
              );
            })}
          </g>

          {/* Diagonal reference line */}
          <line
            x1="0"
            y1="300"
            x2="300"
            y2="0"
            stroke="#d1d5db"
            strokeWidth="1.5"
            strokeDasharray="5,5"
          />

          {/* Curve */}
          <motion.path
            key={selectedChannel}
            d={generateCurvePath(selectedChannel)}
            fill="none"
            stroke={currentChannel.strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />

          {/* Control points */}
          {selectedChannel === 'rgb' && (
            <>
              <motion.circle
                cx="75"
                cy="240"
                r="4"
                fill={currentChannel.strokeColor}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4 }}
              />
              <motion.circle
                cx="150"
                cy="150"
                r="4"
                fill={currentChannel.strokeColor}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 }}
              />
              <motion.circle
                cx="225"
                cy="60"
                r="4"
                fill={currentChannel.strokeColor}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6 }}
              />
            </>
          )}

          {/* Hover crosshair */}
          {hoveredPoint && (
            <g opacity="0.5">
              <line
                x1={10 + (hoveredPoint.input / 255) * 280}
                y1="10"
                x2={10 + (hoveredPoint.input / 255) * 280}
                y2="290"
                stroke={currentChannel.strokeColor}
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <line
                x1="10"
                y1={290 - (hoveredPoint.output / 255) * 280}
                x2="290"
                y2={290 - (hoveredPoint.output / 255) * 280}
                stroke={currentChannel.strokeColor}
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <circle
                cx={10 + (hoveredPoint.input / 255) * 280}
                cy={290 - (hoveredPoint.output / 255) * 280}
                r="5"
                fill={currentChannel.strokeColor}
                stroke="white"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Labels */}
        <div className="absolute bottom-2 right-2 text-xs text-gray-400">
          输入 →
        </div>
        <div className="absolute top-8 left-2 text-xs text-gray-400">
          输出 ↑
        </div>

        {/* Hover tooltip */}
        {hoveredPoint && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap z-20"
          >
            <div className="flex gap-3">
              <span>输入: {hoveredPoint.input}</span>
              <span>输出: {hoveredPoint.output}</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Channel Info */}
      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
        {selectedChannel === 'rgb' && '调整整体明暗对比度'}
        {selectedChannel === 'red' && '调整画面红色通道'}
        {selectedChannel === 'green' && '调整画面绿色通道'}
        {selectedChannel === 'blue' && '调整画面蓝色通道'}
      </div>
    </div>
  );
}
