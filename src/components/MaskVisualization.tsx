import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Layers, Info } from 'lucide-react';

interface MaskSuggestion {
  type: string; // '提亮主体' | '压暗暗角' | '局部调整'
  description: string;
  areas: Array<{
    x: number; // 百分比 0-100
    y: number; // 百分比 0-100
    width: number; // 百分比
    height: number; // 百分比
    shape: 'ellipse' | 'rectangle';
  }>;
  params: Array<{
    name: string;
    value: string;
  }>;
}

interface MaskVisualizationProps {
  imageUrl: string;
  suggestions: MaskSuggestion[];
}

export function MaskVisualization({ imageUrl, suggestions }: MaskVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
      setImageDimensions({ width, height });

      // 绘制原图
      ctx.drawImage(img, 0, 0, width, height);

      // 绘制半透明红色蒙版
      suggestions.forEach((suggestion) => {
        suggestion.areas.forEach((area) => {
          ctx.save();
          
          // 设置蒙版颜色和透明度
          ctx.fillStyle = 'rgba(255, 50, 50, 0.4)';
          ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)';
          ctx.lineWidth = 2;

          const x = (area.x / 100) * width;
          const y = (area.y / 100) * height;
          const w = (area.width / 100) * width;
          const h = (area.height / 100) * height;

          if (area.shape === 'ellipse') {
            // 绘制椭圆
            ctx.beginPath();
            ctx.ellipse(
              x + w / 2,
              y + h / 2,
              w / 2,
              h / 2,
              0,
              0,
              2 * Math.PI
            );
            ctx.fill();
            ctx.stroke();
          } else {
            // 绘制矩形
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
          }

          ctx.restore();
        });
      });

      setImageLoaded(true);
    };

    img.onerror = () => {
      console.error('Failed to load image for mask visualization');
      setImageLoaded(false);
    };

    img.src = imageUrl;
  }, [imageUrl, suggestions]);

  return (
    <div className="space-y-4">
      {suggestions.map((suggestion, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {/* 标题 */}
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-gray-900">{suggestion.type}</h4>
                <p className="text-sm text-gray-600 mt-0.5">{suggestion.description}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-3 gap-6">
              {/* 左侧：蒙版示意图 (2/3) */}
              <div className="col-span-2">
                <div className="bg-gray-900 rounded-xl overflow-hidden relative">
                  {imageLoaded ? (
                    <motion.canvas
                      ref={canvasRef}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="w-full h-auto"
                    />
                  ) : (
                    <div className="aspect-video flex items-center justify-center">
                      <div className="text-gray-400 text-sm">加载中...</div>
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
                <div className="sticky top-4">
                  <h5 className="text-gray-700 mb-3">蒙版参数</h5>
                  <div className="space-y-2">
                    {suggestion.params.map((param, pIdx) => (
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
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>• 使用渐变工具创建蒙版</p>
                      <p>• 羽化值: 50-80px</p>
                      <p>• 不透明度: 70-90%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// 从分析结果中解析蒙版建议
export function parseMaskSuggestions(lightroomData: any, imageUrl: string): { hasMask: boolean; component: JSX.Element | null } {
  // 查找包含"蒙版"、"mask"、"局部"等关键词的建议
  const maskSuggestions: MaskSuggestion[] = [];
  
  // 示例：从 Lightroom 数据中提取蒙版信息
  // 这里需要根据实际的 LLM 返回格式进行调整
  if (lightroomData?.sections) {
    lightroomData.sections.forEach((section: any) => {
      const title = section.title?.toLowerCase() || '';
      
      // 检测是否包含蒙版相关内容
      if (title.includes('蒙版') || title.includes('mask') || title.includes('局部')) {
        const suggestion: MaskSuggestion = {
          type: section.title,
          description: section.description || '局部调整建议',
          areas: [],
          params: section.params || [],
        };

        // 根据描述自动生成蒙版区域
        // 这是一个示例，实际应该从 LLM 返回的数据中解析
        const description = (section.description || '').toLowerCase();
        
        if (description.includes('中间') || description.includes('主体') || description.includes('提亮')) {
          // 中心区域
          suggestion.areas.push({
            x: 25,
            y: 25,
            width: 50,
            height: 50,
            shape: 'ellipse',
          });
        }
        
        if (description.includes('暗角') || description.includes('四周') || description.includes('边缘')) {
          // 四个角落
          suggestion.areas.push(
            { x: 0, y: 0, width: 30, height: 30, shape: 'ellipse' },
            { x: 70, y: 0, width: 30, height: 30, shape: 'ellipse' },
            { x: 0, y: 70, width: 30, height: 30, shape: 'ellipse' },
            { x: 70, y: 70, width: 30, height: 30, shape: 'ellipse' }
          );
        }

        if (suggestion.areas.length > 0) {
          maskSuggestions.push(suggestion);
        }
      }
    });
  }

  if (maskSuggestions.length > 0) {
    return {
      hasMask: true,
      component: <MaskVisualization imageUrl={imageUrl} suggestions={maskSuggestions} />,
    };
  }

  return { hasMask: false, component: null };
}
