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
        <div className="max-w-[210mm] mx-auto bg-white shadow-2xl space-y-8 pb-8" style={{ minHeight: '297mm' }}>
          {/* 第一页：标题页 + 概览 */}
          <div className="h-full flex flex-col p-12 space-y-6">
            {/* 精美标题页 */}
            <div className="text-center pb-6 border-b-2 border-gradient-to-r from-blue-400 to-purple-400">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 mb-3 shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl mb-1 text-gray-900 tracking-tight">照片风格克隆调整方案</h1>
              <p className="text-sm text-gray-500">AI 智能分析 · 专业后期指导</p>
              <div className="mt-3 text-xs text-gray-400">
                {new Date().toLocaleDateString('zh-CN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>

            {/* 两列布局 - 六大块概览 */}
            <div className="grid grid-cols-2 gap-4 flex-1">
              {/* 左列 */}
              <div className="space-y-3">
                {/* 1. 照片点评 */}
                {results.review && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm text-gray-900">照片点评</h3>
                    </div>
                    {results.review.dimensions?.visualGuidance?.referenceDescription && (
                      <p className="text-xs text-gray-700 leading-relaxed line-clamp-4">
                        {results.review.dimensions.visualGuidance.referenceDescription}
                      </p>
                    )}
                    {results.review.photographerStyleSummary && (
                      <div className="mt-2 p-2 bg-amber-100 rounded text-xs text-amber-800">
                        <strong>风格总结：</strong>{results.review.photographerStyleSummary}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. 构图分析 */}
                {results.composition && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Camera className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm text-gray-900">构图分析</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {results.composition.basicInfo?.resolution && (
                        <div className="bg-white rounded p-2">
                          <div className="text-gray-500 mb-0.5">分辨率</div>
                          <div className="text-gray-900">{results.composition.basicInfo.resolution}</div>
                        </div>
                      )}
                      {results.composition.basicInfo?.aspectRatio && (
                        <div className="bg-white rounded p-2">
                          <div className="text-gray-500 mb-0.5">宽高比</div>
                          <div className="text-gray-900">{results.composition.basicInfo.aspectRatio}</div>
                        </div>
                      )}
                    </div>
                    {results.composition.analysis && (
                      <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                        {results.composition.analysis}
                      </p>
                    )}
                  </div>
                )}

                {/* 3. 光影参数 */}
                {results.lighting && (
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Sun className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm text-gray-900">光影参数</h3>
                    </div>
                    <div className="space-y-1 text-xs">
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
              </div>

              {/* 右列 */}
              <div className="space-y-3">
                {/* 4. 色彩方案 */}
                {results.color?.grading && (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Palette className="w-4 h-4 text-purple-600" />
                      <h3 className="text-sm text-gray-900">色彩方案</h3>
                    </div>
                    {results.color.whiteBalance && (
                      <div className="space-y-1 text-xs mb-2">
                        <div className="flex justify-between bg-white rounded p-1.5">
                          <span className="text-gray-700">色温</span>
                          <span className="text-purple-700">{results.color.whiteBalance.temp?.range}</span>
                        </div>
                      </div>
                    )}
                    <div className="scale-[0.65] origin-top -mt-2">
                      <ColorGradingVisualization
                        highlights={results.color.grading.highlights}
                        midtones={results.color.grading.midtones}
                        shadows={results.color.grading.shadows}
                        balance={results.color.grading.balance}
                      />
                    </div>
                  </div>
                )}

                {/* 5. Lightroom 方案 */}
                {results.lightroom && results.lightroom.length > 0 && (
                  <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
                    <div className="flex items-center gap-2 mb-2">
                      <ImageIcon className="w-4 h-4 text-cyan-600" />
                      <h3 className="text-sm text-gray-900">Lightroom 调整</h3>
                    </div>
                    <div className="space-y-1 text-xs">
                      {results.lightroom.slice(0, 4).map((section: any, idx: number) => (
                        <div key={idx} className="bg-white rounded p-2">
                          <div className="text-gray-900">{section.title}</div>
                          {section.params && section.params.length > 0 && (
                            <div className="text-gray-500 text-xs mt-1">
                              {section.params.length} 个参数
                            </div>
                          )}
                        </div>
                      ))}
                      {results.lightroom.length > 4 && (
                        <div className="text-center text-gray-500 text-xs py-1">
                          ... 共 {results.lightroom.length} 个面板
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 6. Photoshop 方案 */}
                {results.photoshop && results.photoshop.length > 0 && (
                  <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                    <div className="flex items-center gap-2 mb-2">
                      <ImageIcon className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-sm text-gray-900">Photoshop 调整</h3>
                    </div>
                    <div className="space-y-1 text-xs">
                      {results.photoshop.slice(0, 4).map((step: any, idx: number) => (
                        <div key={idx} className="bg-white rounded p-2">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-xs">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <div className="text-gray-900 line-clamp-1">{step.title}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {results.photoshop.length > 4 && (
                        <div className="text-center text-gray-500 text-xs py-1">
                          ... 共 {results.photoshop.length} 个步骤
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 曲线调整预览 */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-gray-600" />
                    <h3 className="text-xs text-gray-900">色调曲线</h3>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    <div>
                      <MiniCurveVisualization channel="luma" />
                      <div className="text-center text-xs text-gray-600 mt-0.5">亮度</div>
                    </div>
                    <div>
                      <MiniCurveVisualization channel="red" />
                      <div className="text-center text-xs text-red-600 mt-0.5">红</div>
                    </div>
                    <div>
                      <MiniCurveVisualization channel="green" />
                      <div className="text-center text-xs text-green-600 mt-0.5">绿</div>
                    </div>
                    <div>
                      <MiniCurveVisualization channel="blue" />
                      <div className="text-center text-xs text-blue-600 mt-0.5">蓝</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 可行性评估 */}
            {results.review?.feasibility && (() => {
              // 提取 conversion_feasibility 对象（根据后端返回的数据结构）
              const conversionFeasibility = results.review.feasibility.conversion_feasibility;
              
              // 兼容处理：如果 conversion_feasibility 是对象，使用它；否则使用顶层的字段（向后兼容）
              const difficulty = (conversionFeasibility && typeof conversionFeasibility === 'object' && 'difficulty' in conversionFeasibility)
                ? conversionFeasibility.difficulty
                : (results.review.feasibility.difficulty || '未知');
              
              const confidence = (conversionFeasibility && typeof conversionFeasibility === 'object' && 'confidence' in conversionFeasibility)
                ? conversionFeasibility.confidence
                : (results.review.feasibility.confidence || 0);
              
              const canTransform = (conversionFeasibility && typeof conversionFeasibility === 'object' && 'can_transform' in conversionFeasibility)
                ? conversionFeasibility.can_transform
                : false;
              
              const recommendation = (conversionFeasibility && typeof conversionFeasibility === 'object' && 'recommendation' in conversionFeasibility)
                ? conversionFeasibility.recommendation
                : (results.review.feasibility.recommendation || '');
              
              return (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200 mt-4">
                  <h3 className="text-sm text-gray-900 mb-2">复刻可行性评估</h3>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-white rounded p-2 text-center">
                      <div className="text-gray-500 mb-1">可行性</div>
                      <div className="text-green-700">{difficulty === 'high' || difficulty === '高' || difficulty === '极高' ? '高难度' : difficulty === 'medium' || difficulty === '中' ? '中等难度' : '低难度'}</div>
                    </div>
                    <div className="bg-white rounded p-2 text-center">
                      <div className="text-gray-500 mb-1">置信度</div>
                      <div className="text-green-700">{(confidence * 100).toFixed(0)}%</div>
                    </div>
                    <div className="bg-white rounded p-2 text-center">
                      <div className="text-gray-500 mb-1">可转换</div>
                      <div className="text-green-700">{canTransform ? '✓ 是' : '✗ 否'}</div>
                    </div>
                  </div>
                  {recommendation && (
                    <p className="text-xs text-gray-700 mt-2 leading-relaxed line-clamp-3">
                      {recommendation}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* 页脚 */}
            <div className="text-center text-xs text-gray-400 border-t pt-3 mt-auto">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-3 h-3" />
                <span>由 AI 智能分析生成 · 照片风格克隆系统 · 第 1 页</span>
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
            <span>这是 PDF 导出预览（第1页），完整PDF包含六大块详细内容</span>
          </div>
          <div className="px-3 py-1 bg-white rounded-lg border border-gray-200 text-gray-700 text-xs">
            A4 尺寸 · 高品质
          </div>
        </div>
      </div>
    </div>
  );
}