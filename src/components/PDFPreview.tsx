import { motion } from 'motion/react';
import { 
  FileText, 
  Palette, 
  Sun, 
  Camera,
  Image as ImageIcon,
  Star,
  Sparkles,
  TrendingUp,
  Layers
} from 'lucide-react';
import { ColorGradingVisualization } from './ColorWheel';
import { useRef, useEffect, useState } from 'react';

interface PDFPreviewProps {
  results: any;
  targetImageUrl?: string;
}

// 简化版曲线可视化（用于PDF）
function MiniCurveVisualization({ channel }: { channel: string }) {
  const colors: { [key: string]: string } = {
    luma: '#6b7280',
    red: '#ef4444',
    green: '#10b981',
    blue: '#3b82f6',
  };
  
  const color = colors[channel.toLowerCase()] || colors.luma;
  
  return (
    <svg width="80" height="80" className="mx-auto">
      <line x1="5" y1="5" x2="5" y2="75" stroke="#e5e7eb" strokeWidth="1" />
      <line x1="5" y1="75" x2="75" y2="75" stroke="#e5e7eb" strokeWidth="1" />
      <line x1="5" y1="75" x2="75" y2="5" stroke="#d1d5db" strokeWidth="1" strokeDasharray="2,2" />
      <path
        d="M 5 75 Q 25 60, 40 40 T 75 5"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="25" cy="60" r="2" fill={color} stroke="white" strokeWidth="1" />
      <circle cx="55" cy="20" r="2" fill={color} stroke="white" strokeWidth="1" />
    </svg>
  );
}

// 简化版蒙版预览（用于PDF）
function MiniMaskPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 120;
    const height = 80;

    // 绘制径向渐变
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.6;

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.7, 'rgba(128, 128, 128, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 边框
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);
  }, []);

  return (
    <div className="inline-block">
      <canvas ref={canvasRef} width="120" height="80" className="rounded" />
      <div className="text-center mt-1 text-xs text-gray-600">径向提亮蒙版</div>
    </div>
  );
}

export function PDFPreview({ results, targetImageUrl }: PDFPreviewProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* PDF 预览区域 */}
      <div className="h-[600px] overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        {/* A4 纸张模拟 */}
        <div className="max-w-[210mm] mx-auto bg-white shadow-2xl" style={{ aspectRatio: '210/297' }}>
          {/* 页面内容 */}
          <div className="h-full flex flex-col p-12 space-y-6">
            {/* 精美标题页 */}
            <div className="text-center pb-6 border-b-2 border-gradient-to-r from-blue-400 to-purple-400">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 mb-3 shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl mb-1 text-gray-900 tracking-tight">照片风格调整方案</h1>
              <p className="text-sm text-gray-500">AI 智能分析 · 专业后期指导</p>
              <div className="mt-3 text-xs text-gray-400">
                {new Date().toLocaleDateString('zh-CN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>

            {/* 两列布局 */}
            <div className="grid grid-cols-2 gap-6 flex-1">
              {/* 左列 */}
              <div className="space-y-4">
                {/* 照片点评 */}
                {results.review && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm text-gray-900">照片点评</h3>
                    </div>
                    {results.review.visualGuidance && (
                      <p className="text-xs text-gray-700 leading-relaxed line-clamp-3">
                        {results.review.visualGuidance}
                      </p>
                    )}
                  </div>
                )}

                {/* 构图分析 */}
                {results.composition && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Camera className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm text-gray-900">构图分析</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white rounded p-2">
                        <div className="text-gray-500 mb-0.5">分辨率</div>
                        <div className="text-gray-900">{results.composition.basicInfo?.resolution}</div>
                      </div>
                      <div className="bg-white rounded p-2">
                        <div className="text-gray-500 mb-0.5">宽高比</div>
                        <div className="text-gray-900">{results.composition.basicInfo?.aspectRatio}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 光影参数 */}
                {results.lighting && (
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Sun className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm text-gray-900">光影参数</h3>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {results.lighting.basic?.exposure && (
                        <div className="flex justify-between items-center p-1.5 bg-white rounded">
                          <span className="text-gray-700">曝光</span>
                          <span className="text-amber-700 text-xs">{results.lighting.basic.exposure.range}</span>
                        </div>
                      )}
                      {results.lighting.basic?.contrast && (
                        <div className="flex justify-between items-center p-1.5 bg-white rounded">
                          <span className="text-gray-700">对比度</span>
                          <span className="text-amber-700 text-xs">{results.lighting.basic.contrast.range}</span>
                        </div>
                      )}
                      {results.lighting.basic?.highlights && (
                        <div className="flex justify-between items-center p-1.5 bg-white rounded">
                          <span className="text-gray-700">高光</span>
                          <span className="text-amber-700 text-xs">{results.lighting.basic.highlights.range}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 曲线调整 */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-gray-600" />
                    <h3 className="text-sm text-gray-900">色调曲线</h3>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <MiniCurveVisualization channel="luma" />
                      <div className="text-center text-xs text-gray-600 mt-1">Luma</div>
                    </div>
                    <div>
                      <MiniCurveVisualization channel="red" />
                      <div className="text-center text-xs text-red-600 mt-1">红</div>
                    </div>
                    <div>
                      <MiniCurveVisualization channel="green" />
                      <div className="text-center text-xs text-green-600 mt-1">绿</div>
                    </div>
                    <div>
                      <MiniCurveVisualization channel="blue" />
                      <div className="text-center text-xs text-blue-600 mt-1">蓝</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 右列 */}
              <div className="space-y-4">
                {/* 色彩分级（色轮）*/}
                {results.color?.grading && (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Palette className="w-4 h-4 text-purple-600" />
                      <h3 className="text-sm text-gray-900">色彩分级</h3>
                    </div>
                    <div className="scale-75 origin-top">
                      <ColorGradingVisualization
                        highlights={results.color.grading.highlights}
                        midtones={results.color.grading.midtones}
                        shadows={results.color.grading.shadows}
                        balance={results.color.grading.balance}
                      />
                    </div>
                  </div>
                )}

                {/* 蒙版效果 */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4 text-gray-600" />
                    <h3 className="text-sm text-gray-900">局部调整蒙版</h3>
                  </div>
                  <div className="flex justify-center">
                    <MiniMaskPreview />
                  </div>
                  <div className="mt-2 text-xs text-gray-600 text-center">
                    中心主体提亮，边缘自然过渡
                  </div>
                </div>

                {/* Lightroom 方案 */}
                {results.lightroom && results.lightroom.length > 0 && (
                  <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
                    <div className="flex items-center gap-2 mb-2">
                      <ImageIcon className="w-4 h-4 text-cyan-600" />
                      <h3 className="text-sm text-gray-900">Lightroom 调整</h3>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {results.lightroom.slice(0, 3).map((section: any, idx: number) => (
                        <div key={idx} className="bg-white rounded p-2">
                          <div className="text-gray-900">{section.title}</div>
                          <div className="text-gray-500 text-xs line-clamp-1">{section.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Photoshop 方案 */}
                {results.photoshop && results.photoshop.length > 0 && (
                  <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                    <div className="flex items-center gap-2 mb-2">
                      <ImageIcon className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-sm text-gray-900">Photoshop 调整</h3>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {results.photoshop.slice(0, 3).map((step: any, idx: number) => (
                        <div key={idx} className="bg-white rounded p-2">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-xs">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <div className="text-gray-900">{step.title}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 页脚 */}
            <div className="text-center text-xs text-gray-400 border-t pt-3 mt-auto">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-3 h-3" />
                <span>由 AI 智能分析生成 · 照片风格克隆系统</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 预览提示 */}
      <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 p-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <FileText className="w-4 h-4" />
            <span>这是 PDF 导出预览，实际导出将包含完整详细内容</span>
          </div>
          <div className="px-3 py-1 bg-white rounded-lg border border-gray-200 text-gray-700 text-xs">
            A4 尺寸 · 高品质
          </div>
        </div>
      </div>
    </div>
  );
}
