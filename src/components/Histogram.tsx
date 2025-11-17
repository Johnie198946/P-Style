import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

interface HistogramProps {
  imageUrl?: string;
  type?: 'source' | 'target';
  className?: string;
}

export function Histogram({ imageUrl, type = 'target', className = '' }: HistogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stats, setStats] = useState({
    mean: 0,
    shadows: 0,
    midtones: 0,
    highlights: 0,
  });

  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // 创建临时画布来分析图像
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      tempCtx.drawImage(img, 0, 0);

      const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;

      // 初始化直方图数据
      const histogramR = new Array(256).fill(0);
      const histogramG = new Array(256).fill(0);
      const histogramB = new Array(256).fill(0);
      const histogramLuma = new Array(256).fill(0);

      // 计算直方图
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        histogramR[r]++;
        histogramG[g]++;
        histogramB[b]++;
        
        // 计算亮度 (使用感知亮度公式)
        const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        histogramLuma[luma]++;
      }

      // 找到最大值用于归一化
      const maxR = Math.max(...histogramR);
      const maxG = Math.max(...histogramG);
      const maxB = Math.max(...histogramB);
      const maxLuma = Math.max(...histogramLuma);

      // 计算统计信息
      const totalPixels = data.length / 4;
      let sumLuma = 0;
      let shadows = 0;
      let midtones = 0;
      let highlights = 0;

      for (let i = 0; i < 256; i++) {
        sumLuma += i * histogramLuma[i];
        if (i < 85) shadows += histogramLuma[i];
        else if (i < 170) midtones += histogramLuma[i];
        else highlights += histogramLuma[i];
      }

      setStats({
        mean: Math.round(sumLuma / totalPixels),
        shadows: Math.round((shadows / totalPixels) * 100),
        midtones: Math.round((midtones / totalPixels) * 100),
        highlights: Math.round((highlights / totalPixels) * 100),
      });

      // 绘制直方图
      const width = canvas.width;
      const height = canvas.height;
      
      // 清空画布
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, width, height);

      // 绘制网格线
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      
      // 垂直网格线
      for (let i = 0; i <= 4; i++) {
        const x = (width / 4) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // 水平网格线
      for (let i = 0; i <= 4; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 绘制RGB直方图
      const drawChannel = (histogram: number[], max: number, color: string, opacity: number) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = opacity;

        for (let i = 0; i < 256; i++) {
          const x = (i / 256) * width;
          const normalizedValue = histogram[i] / max;
          const y = height - (normalizedValue * height * 0.9);
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.stroke();
        ctx.globalAlpha = 1;
      };

      // 绘制各个通道（从暗到亮叠加）
      drawChannel(histogramB, maxB, '#3b82f6', 0.6); // 蓝色
      drawChannel(histogramG, maxG, '#10b981', 0.6); // 绿色
      drawChannel(histogramR, maxR, '#ef4444', 0.6); // 红色
      
      // 绘制亮度直方图（白色，半透明）
      drawChannel(histogramLuma, maxLuma, '#ffffff', 0.4);

      // 绘制阴影/高光分界线
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      
      // 阴影/中间调分界 (85/255)
      const shadowMidBoundary = (85 / 256) * width;
      ctx.beginPath();
      ctx.moveTo(shadowMidBoundary, 0);
      ctx.lineTo(shadowMidBoundary, height);
      ctx.stroke();
      
      // 中间调/高光分界 (170/255)
      const midHighBoundary = (170 / 256) * width;
      ctx.beginPath();
      ctx.moveTo(midHighBoundary, 0);
      ctx.lineTo(midHighBoundary, height);
      ctx.stroke();
      
      ctx.setLineDash([]);
    };

    img.onerror = () => {
      console.error('Failed to load image for histogram');
    };

    img.src = imageUrl;
  }, [imageUrl]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 border border-gray-700 ${className}`}
    >
      {/* 标题 */}
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-white text-sm" style={{ fontWeight: 600 }}>
          直方图分析
          {type === 'source' && <span className="ml-2 text-xs text-blue-400">(源照片)</span>}
          {type === 'target' && <span className="ml-2 text-xs text-purple-400">(目标照片)</span>}
        </h5>
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-400">R</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-400">G</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-400">B</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-white"></div>
            <span className="text-gray-400">L</span>
          </div>
        </div>
      </div>

      {/* 画布 */}
      <canvas
        ref={canvasRef}
        width={600}
        height={160}
        className="w-full h-auto rounded-lg"
        style={{ imageRendering: 'crisp-edges' }}
      />

      {/* 统计信息 */}
      <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
        <div className="bg-gray-800/50 rounded-lg p-2 text-center border border-gray-700/50">
          <div className="text-gray-400 mb-1">平均亮度</div>
          <div className="text-white" style={{ fontWeight: 600 }}>{stats.mean}/255</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2 text-center border border-gray-700/50">
          <div className="text-gray-400 mb-1">阴影</div>
          <div className="text-white" style={{ fontWeight: 600 }}>{stats.shadows}%</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2 text-center border border-gray-700/50">
          <div className="text-gray-400 mb-1">中间调</div>
          <div className="text-white" style={{ fontWeight: 600 }}>{stats.midtones}%</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2 text-center border border-gray-700/50">
          <div className="text-gray-400 mb-1">高光</div>
          <div className="text-white" style={{ fontWeight: 600 }}>{stats.highlights}%</div>
        </div>
      </div>

      {/* 区域标签 */}
      <div className="mt-2 flex justify-between text-xs text-gray-500 px-1">
        <span>暗部 ◀</span>
        <span>中间调</span>
        <span>▶ 亮部</span>
      </div>
    </motion.div>
  );
}
