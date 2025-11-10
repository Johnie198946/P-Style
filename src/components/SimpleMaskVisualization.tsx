import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Layers, Info } from 'lucide-react';

interface SimpleMaskVisualizationProps {
  imageUrl: string;
  title: string;
  description: string;
  params: Array<{
    name: string;
    value: string;
  }>;
}

export function SimpleMaskVisualization({
  imageUrl,
  title,
  description,
  params,
}: SimpleMaskVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // 设置canvas尺寸
      const maxWidth = 600;
      const scale = Math.min(1, maxWidth / img.width);
      const width = img.width * scale;
      const height = img.height * scale;

      canvas.width = width;
      canvas.height = height;

      // 绘制原图
      ctx.drawImage(img, 0, 0, width, height);

      // 根据描述绘制蒙版区域
      ctx.save();
      ctx.fillStyle = 'rgba(255, 60, 60, 0.35)';
      ctx.strokeStyle = 'rgba(255, 60, 60, 0.8)';
      ctx.lineWidth = 2;

      const desc = description.toLowerCase();

      if (desc.includes('中间') || desc.includes('主体') || desc.includes('提亮')) {
        // 中心椭圆区域
        ctx.beginPath();
        ctx.ellipse(width / 2, height / 2, width * 0.25, height * 0.3, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }

      if (desc.includes('暗角') || desc.includes('四周') || desc.includes('边缘') || desc.includes('压暗')) {
        // 四个角落的暗角
        const cornerSize = Math.min(width, height) * 0.18;
        
        // 左上
        ctx.beginPath();
        ctx.ellipse(cornerSize * 0.5, cornerSize * 0.5, cornerSize, cornerSize, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // 右上
        ctx.beginPath();
        ctx.ellipse(width - cornerSize * 0.5, cornerSize * 0.5, cornerSize, cornerSize, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // 左下
        ctx.beginPath();
        ctx.ellipse(cornerSize * 0.5, height - cornerSize * 0.5, cornerSize, cornerSize, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // 右下
        ctx.beginPath();
        ctx.ellipse(width - cornerSize * 0.5, height - cornerSize * 0.5, cornerSize, cornerSize, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
      setImageLoaded(true);
    };

    img.onerror = () => {
      console.error('Failed to load image');
      setImageLoaded(false);
    };

    img.src = imageUrl;
  }, [imageUrl, description]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      {/* 标题 */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-gray-900">{title}</h4>
            <p className="text-sm text-gray-600 mt-0.5">{description}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-3 gap-6">
          {/* 左侧：蒙版示意图 (2/3) */}
          <div className="col-span-2">
            <div className="bg-gray-900 rounded-xl overflow-hidden relative">
              {imageLoaded && imageUrl ? (
                <motion.canvas
                  ref={canvasRef}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full h-auto"
                />
              ) : (
                <div className="aspect-video flex items-center justify-center bg-gray-800">
                  <div className="text-gray-400 text-sm">
                    {imageUrl ? '加载中...' : '等待图片上传'}
                  </div>
                </div>
              )}

              {/* 图例 */}
              <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 text-xs text-white">
                  <div className="w-4 h-4 bg-red-500/60 border border-red-400 rounded"></div>
                  <span>蒙版区域</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-start gap-2 text-sm text-gray-500">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>红色区域表示需要应用蒙版调整的位置</p>
            </div>
          </div>

          {/* 右侧：蒙版参数 (1/3) */}
          <div className="col-span-1">
            <div className="sticky top-4 space-y-4">
              <h5 className="text-gray-700">蒙版参数</h5>
              <div className="space-y-2">
                {params.map((param, pIdx) => (
                  <div
                    key={pIdx}
                    className="px-3 py-2.5 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-100"
                  >
                    <div className="text-xs text-gray-600 mb-1">{param.name}</div>
                    <div className="text-sm text-blue-700">{param.value}</div>
                  </div>
                ))}
              </div>

              {/* 操作说明 */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 space-y-1.5">
                  <p>💡 <strong>操作建议：</strong></p>
                  <p>• 使用渐变工具创建蒙版</p>
                  <p>• 羽化值: 50-80px</p>
                  <p>• 不透明度: 70-90%</p>
                  <p>• 流量: 50-70%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
