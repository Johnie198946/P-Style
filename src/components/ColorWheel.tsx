import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';

interface ColorWheelProps {
  hue: number; // 0-360度
  saturation: number; // 0-100
  label: string;
  size?: number;
}

export function ColorWheel({ hue, saturation, label, size = 120 }: ColorWheelProps) {
  const [isHovered, setIsHovered] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 计算点的位置（基于极坐标）
  const radius = (size / 2) * 0.75; // 色轮半径
  const normalizedSat = saturation / 100; // 归一化饱和度到 0-1
  const pointRadius = radius * normalizedSat;
  
  // 转换为笛卡尔坐标（注意：0度在右侧，顺时针）
  const angleRad = (hue - 90) * (Math.PI / 180); // -90度使0度指向上方
  const pointX = size / 2 + pointRadius * Math.cos(angleRad);
  const pointY = size / 2 + pointRadius * Math.sin(angleRad);
  
  // 绘制色轮
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const centerX = size / 2;
    const centerY = size / 2;
    
    // 清空画布
    ctx.clearRect(0, 0, size, size);
    
    // 绘制色轮（使用多个扇形）
    for (let angle = 0; angle < 360; angle++) {
      const startAngle = (angle - 90) * Math.PI / 180;
      const endAngle = (angle + 1 - 90) * Math.PI / 180;
      
      // 创建渐变（从中心到边缘）
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, `hsl(${angle}, 0%, 100%)`); // 中心白色
      gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`); // 边缘全饱和
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }
    
    // 绘制外圈
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
  }, [size, radius]);
  
  return (
    <div className="relative inline-block">
      <div
        className="relative"
        style={{ width: size, height: size }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Canvas 色轮 */}
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="absolute inset-0"
        />
        
        {/* 指示点 */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg z-10"
          style={{
            left: pointX - 8,
            top: pointY - 8,
            backgroundColor: `hsl(${hue}, ${saturation}%, 50%)`,
          }}
        >
          {/* 内圈 */}
          <div className="w-full h-full rounded-full border border-gray-900/20" />
        </motion.div>
        
        {/* 中心点 */}
        <div
          className="absolute w-2 h-2 rounded-full bg-gray-300 border border-gray-400 z-10"
          style={{
            left: size / 2 - 4,
            top: size / 2 - 4,
          }}
        />
        
        {/* 悬停提示 */}
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -bottom-12 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-white backdrop-blur-xl border border-gray-200 text-gray-900 text-xs rounded-lg whitespace-nowrap shadow-lg z-20"
          >
            <div className="flex flex-col gap-0.5">
              <div>色相: {Math.round(hue)}°</div>
              <div>饱和度: {saturation}</div>
            </div>
            {/* 小箭头 */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white backdrop-blur-xl border-l border-t border-gray-200 rotate-45" />
          </motion.div>
        )}
      </div>
      
      {/* 标签 */}
      <div className="text-center mt-2 text-sm text-gray-600">{label}</div>
    </div>
  );
}

// 色彩分级组件 - 显示三个色轮（高光、中间调、阴影）
interface ColorGradingVisualizationProps {
  highlights?: { hue: number; saturation: number } | null;
  midtones?: { hue: number; saturation: number } | null;
  shadows?: { hue: number; saturation: number } | null;
  balance?: number | null;
}

export function ColorGradingVisualization({
  highlights,
  midtones,
  shadows,
  balance,
}: ColorGradingVisualizationProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        {highlights && (
          <div className="flex flex-col items-center">
            <ColorWheel
              hue={highlights.hue}
              saturation={highlights.saturation}
              label="高光 Highlights"
              size={110}
            />
          </div>
        )}
        
        {midtones && (
          <div className="flex flex-col items-center">
            <ColorWheel
              hue={midtones.hue}
              saturation={midtones.saturation}
              label="中间调 Midtones"
              size={110}
            />
          </div>
        )}
        
        {shadows && (
          <div className="flex flex-col items-center">
            <ColorWheel
              hue={shadows.hue}
              saturation={shadows.saturation}
              label="阴影 Shadows"
              size={110}
            />
          </div>
        )}
      </div>
      
      {/* Balance 滑块显示 */}
      {balance !== undefined && balance !== null && (
        <div className="mt-4 px-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Balance（高光偏好）</span>
            <span className="text-sm text-gray-900">{balance > 0 ? '+' : ''}{balance}</span>
          </div>
          <div className="relative h-2 bg-gradient-to-r from-blue-200 via-gray-100 to-amber-200 rounded-full overflow-hidden border border-gray-200">
            <motion.div
              initial={{ left: '50%' }}
              animate={{ left: `${50 + balance}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-gray-300 rounded-full shadow-lg"
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>阴影</span>
            <span>高光</span>
          </div>
        </div>
      )}
    </div>
  );
}
