import { motion } from 'motion/react';
import { Camera, Sliders, Eye, Zap, Info, ChevronRight, TrendingUp, Palette, Layers, Lightbulb, Images, HelpCircle } from 'lucide-react';
import { SimpleMaskVisualization } from '../SimpleMaskVisualization';
import { ColorGradingVisualization } from '../ColorWheel';
import { CurveVisualizationLR } from '../CurveVisualizationLR';
import { ImageComparisonModal } from '../ImageComparisonModal';
import { Histogram } from '../Histogram';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { useState, useRef, useEffect } from 'react';

// 生成调整依据说明
function generateReasonText(paramName: string, paramValue: string, panelTitle: string): string {
  const name = paramName.toLowerCase();
  const value = paramValue.toLowerCase();
  
  // 基础调整
  if (panelTitle.includes('基础') || panelTitle.toLowerCase().includes('basic')) {
    if (name.includes('曝光') || name.includes('exposure')) {
      if (value.includes('+') || parseFloat(value) > 0) {
        return '增加曝光以提亮整体画面，使照片更加明亮通透';
      } else {
        return '降低曝光以压暗画面，营造更深沉的氛围';
      }
    }
    if (name.includes('对比') || name.includes('contrast')) {
      if (value.includes('+') || parseFloat(value) > 0) {
        return '提高对比度增强明暗差异，使画面更有层次和冲击力';
      } else {
        return '降低对比度柔和过渡，营造更柔和的视觉效果';
      }
    }
    if (name.includes('高光') || name.includes('highlight')) {
      if (value.includes('-') || parseFloat(value) < 0) {
        return '压低高光以恢复过曝区域的细节，保留天空和亮部纹理';
      } else {
        return '提升高光以增强明亮区域的表现力';
      }
    }
    if (name.includes('阴影') || name.includes('shadow')) {
      if (value.includes('+') || parseFloat(value) > 0) {
        return '提亮阴影以显现暗部细节，避免死黑区域';
      } else {
        return '压暗阴影以增加画面深度和神秘感';
      }
    }
    if (name.includes('白色') || name.includes('white')) {
      return '调整白色色阶以精确控制最亮区域的表现';
    }
    if (name.includes('黑色') || name.includes('black')) {
      return '调整黑色色阶以控制最暗区域的深度和纯度';
    }
  }
  
  // HSL调整
  if (panelTitle.includes('HSL') || panelTitle.includes('色相')) {
    if (name.includes('色相') || name.includes('hue')) {
      return '微调该颜色的色相以改变颜色倾向，使色调更符合目标风格';
    }
    if (name.includes('饱和度') || name.includes('saturation')) {
      if (value.includes('+') || parseFloat(value) > 0) {
        return '增加该颜色的饱和度使其更加鲜艳，增强视觉冲击力';
      } else {
        return '降低该颜色的饱和度使其更加柔和，营造高级质感';
      }
    }
    if (name.includes('明度') || name.includes('luminance')) {
      if (value.includes('+') || parseFloat(value) > 0) {
        return '提升该颜色的明度使其更加明亮';
      } else {
        return '降低该颜色的明度使其更加深沉';
      }
    }
  }
  
  // 色调分离
  if (panelTitle.includes('色调分离') || panelTitle.toLowerCase().includes('split toning')) {
    if (name.includes('高光') || name.includes('highlight')) {
      return '为高光区域添加色彩倾向，营造独特的色调氛围';
    }
    if (name.includes('阴影') || name.includes('shadow')) {
      return '为阴影区域添加色彩倾向，丰富画面的色彩层次';
    }
  }
  
  // 曲线
  if (panelTitle.includes('曲线') || panelTitle.toLowerCase().includes('curve')) {
    if (name.includes('luma') || name.includes('色调')) {
      return '通过调整色调曲线精确控制不同亮度区域的明暗关系';
    }
    if (name.includes('红') || name.includes('red')) {
      return '调整红色通道曲线以改变画面的红色倾向和色温';
    }
    if (name.includes('绿') || name.includes('green')) {
      return '调整绿色通道曲线以改变画面的绿色-洋红倾向';
    }
    if (name.includes('蓝') || name.includes('blue')) {
      return '调整蓝色通道曲线以改变画面的蓝色-黄色倾向';
    }
  }
  
  // 色彩分级
  if (panelTitle.includes('色彩分级') || panelTitle.toLowerCase().includes('color grading')) {
    if (name.includes('高光') || name.includes('highlight')) {
      return '为亮部区域添加精确的色彩偏移，营造高级电影感';
    }
    if (name.includes('中间调') || name.includes('midtone')) {
      return '为中间亮度区域添加色彩偏移，影响画面主体色调';
    }
    if (name.includes('阴影') || name.includes('shadow')) {
      return '为暗部区域添加色彩偏移，丰富阴影的色彩层次';
    }
  }
  
  // 细节
  if (panelTitle.includes('细节') || panelTitle.toLowerCase().includes('detail')) {
    if (name.includes('锐化') || name.includes('sharpen')) {
      return '增强边缘清晰度，使画面更加锐利';
    }
    if (name.includes('降噪') || name.includes('noise')) {
      return '降低画面噪点，使画面更加干净';
    }
  }
  
  // 默认说明
  return 'AI分析目标照片特征后给出的精确调整建议';
}

// 解析曲线参数
function parseCurveParams(params: any[]) {
  const data = {
    luma: [] as any[],
    red: [] as any[],
    green: [] as any[],
    blue: [] as any[],
  };

  params.forEach((param) => {
    const name = param.name.toLowerCase();
    const value = param.value;

    if (name.includes('luma') || name.includes('色调曲线')) {
      const match = value.match(/x[≈=](\d+)\s*(?:→|->)\s*y[≈=](\d+)/);
      if (match) {
        data.luma.push({
          point: `(${match[1]}, ${match[2]})`,
          label: param.name,
          note: ''
        });
      }
    }
    
    if (name.includes('红') || name.includes('red')) {
      data.red.push({
        point: extractCurvePoint(value),
        label: param.name,
        note: value
      });
    }
    
    if (name.includes('绿') || name.includes('green')) {
      data.green.push({
        point: extractCurvePoint(value),
        label: param.name,
        note: value
      });
    }
    
    if (name.includes('蓝') || name.includes('blue')) {
      data.blue.push({
        point: extractCurvePoint(value),
        label: param.name,
        note: value
      });
    }
  });

  return data;
}

function extractCurvePoint(value: string): string {
  const match = value.match(/x[≈=](\d+)\s*(?:→|->)\s*y[≈=](\d+)/);
  if (match) {
    return `(${match[1]}, ${match[2]})`;
  }
  
  const inputMatch = value.match(/输入\s*[：:]\s*(\d+)/);
  const outputMatch = value.match(/输出\s*[：:]\s*(\d+)/);
  if (inputMatch && outputMatch) {
    return `(${inputMatch[1]}, ${outputMatch[1]})`;
  }
  
  return '(128, 128)';
}

// 解析色彩分级参数
function parseColorGradingParams(params: any[]) {
  const data: any = {
    highlights: null,
    midtones: null,
    shadows: null,
    balance: null,
  };

  params.forEach((param) => {
    const name = param.name.toLowerCase();
    const value = String(param.value || '');

    // 多种格式的匹配模式
    // 格式1: "色相：+10" 或 "Hue: +10"
    const hueMatch = value.match(/色相\s*[：:]\s*([+-]?\d+)/i) || 
                     value.match(/hue\s*[：:]\s*([+-]?\d+)/i) ||
                     value.match(/([+-]?\d+)\s*°/); // "±10°"
    
    const satMatch = value.match(/饱和度\s*[：:]\s*([+-]?\d+)/i) || 
                     value.match(/saturation\s*[：:]\s*([+-]?\d+)/i) ||
                     value.match(/sat\s*[：:]\s*([+-]?\d+)/i);

    // 如果是单个数字或者带符号的数字（如"+10"），尝试按顺序解析
    const numMatch = value.match(/([+-]?\d+)/g);

    if (name.includes('高光') || name.includes('highlight')) {
      if (hueMatch && satMatch) {
        data.highlights = {
          hue: parseInt(hueMatch[1]) + 180, // 转换为0-360度
          saturation: Math.abs(parseInt(satMatch[1])),
        };
      } else if (numMatch && numMatch.length >= 2) {
        // 假设第一个是色相，第二个是饱和度
        data.highlights = {
          hue: parseInt(numMatch[0]) + 180,
          saturation: Math.abs(parseInt(numMatch[1])),
        };
      } else if (hueMatch) {
        // 只有色相，假设饱和度为中等值
        data.highlights = {
          hue: parseInt(hueMatch[1]) + 180,
          saturation: 50,
        };
      }
    }

    if (name.includes('中间调') || name.includes('midtone')) {
      if (hueMatch && satMatch) {
        data.midtones = {
          hue: parseInt(hueMatch[1]) + 180,
          saturation: Math.abs(parseInt(satMatch[1])),
        };
      } else if (numMatch && numMatch.length >= 2) {
        data.midtones = {
          hue: parseInt(numMatch[0]) + 180,
          saturation: Math.abs(parseInt(numMatch[1])),
        };
      } else if (hueMatch) {
        data.midtones = {
          hue: parseInt(hueMatch[1]) + 180,
          saturation: 50,
        };
      }
    }

    if (name.includes('阴影') || name.includes('shadow')) {
      if (hueMatch && satMatch) {
        data.shadows = {
          hue: parseInt(hueMatch[1]) + 180,
          saturation: Math.abs(parseInt(satMatch[1])),
        };
      } else if (numMatch && numMatch.length >= 2) {
        data.shadows = {
          hue: parseInt(numMatch[0]) + 180,
          saturation: Math.abs(parseInt(numMatch[1])),
        };
      } else if (hueMatch) {
        data.shadows = {
          hue: parseInt(hueMatch[1]) + 180,
          saturation: 50,
        };
      }
    }

    if (name.includes('balance') || name.includes('平衡')) {
      const balanceMatch = value.match(/([+-]?\d+)/);
      if (balanceMatch) {
        data.balance = parseInt(balanceMatch[1]);
      }
    }
  });

  // 如果没有解析到任何数据，提供默认值以便至少显示一些内容
  if (!data.highlights && !data.midtones && !data.shadows) {
    console.warn('Color grading params not parsed:', params);
    // 可以设置默认值
    data.highlights = { hue: 180, saturation: 0 };
    data.midtones = { hue: 180, saturation: 0 };
    data.shadows = { hue: 180, saturation: 0 };
  }

  return data;
}

// 蒙版渲染组件（简化版，避免CORS问题）
function MaskVisualizationWithRendering({ imageUrl, mask }: any) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="p-5">
        {/* 标题 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Layers className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h4 className="text-gray-900">{mask.title}</h4>
            <p className="text-sm text-gray-500">{mask.description}</p>
          </div>
        </div>

        {/* 蒙版效果 + 参数 - 左右布局 */}
        <div className="flex gap-4">
          {/* 左侧：蒙版效果预览 (2/3) - 使用渐变模拟 */}
          <div className="flex-[2] bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
            <div className="aspect-video relative flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              {/* 模拟径向蒙版效果 */}
              <div className="absolute inset-0 bg-gradient-radial from-red-500/30 via-red-500/15 to-transparent" />
              <div className="relative z-10 text-center p-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/90 backdrop-blur-sm shadow-lg">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-gray-700">蒙版效果区域</span>
                </div>
                <p className="mt-3 text-xs text-gray-600 max-w-xs">
                  红色高亮区域表示调整的重点范围
                </p>
              </div>
            </div>
          </div>

          {/* 右侧：参数列表 (1/3) */}
          <div className="flex-1 space-y-2">
            {mask.params && mask.params.map((param: any, idx: number) => (
              <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                <div className="text-xs text-gray-600 mb-1">{param.name}</div>
                <div className="px-2 py-1 bg-purple-100 text-purple-700 text-sm rounded border border-purple-200 inline-block">
                  {param.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LightroomSection({ data, targetImageUrl, userImageUrl, reviewData, conversionData }: any) {
  if (!data || !Array.isArray(data)) return null;

  const [expandedPanels, setExpandedPanels] = useState<Set<number>>(new Set());
  const [showComparison, setShowComparison] = useState(false);

  const togglePanel = (index: number) => {
    const newExpanded = new Set(expandedPanels);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedPanels(newExpanded);
  };

  // 分离蒙版和非蒙版部分
  const regularPanels = data.filter((s: any) => !s.masks);
  const maskPanels = data.filter((s: any) => s.masks);

  return (
    <div className="space-y-6">
      {/* Image Comparison Modal */}
      <ImageComparisonModal
        isOpen={showComparison}
        onClose={() => setShowComparison(false)}
        targetImageUrl={targetImageUrl || ''}
        userImageUrl={userImageUrl || ''}
      />

      {/* Image Comparison Button - Small, top right */}
      <div className="flex justify-end mb-4">
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setShowComparison(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg text-white text-sm"
        >
          <Images className="w-4 h-4" />
          <span style={{ fontWeight: 600 }}>图片对比</span>
        </motion.button>
      </div>

      {/* 调色思路 */}
      {conversionData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
        >
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-gray-900" style={{ fontSize: '18px', fontWeight: 700 }}>
                  调色思路
                </h3>
                <p className="text-gray-600 text-sm">AI 分析的调色可行性与建议</p>
              </div>
            </div>

            {/* Conversion Feasibility */}
            {conversionData.conversion_feasibility && (
              <div className="space-y-4">
                {/* Can Transform & Difficulty */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className={`px-4 py-2 rounded-lg ${
                    conversionData.conversion_feasibility.can_transform
                      ? 'bg-green-100 border border-green-300'
                      : 'bg-red-100 border border-red-300'
                  }`}>
                    <span className={`text-sm ${
                      conversionData.conversion_feasibility.can_transform
                        ? 'text-green-800'
                        : 'text-red-800'
                    }`} style={{ fontWeight: 600 }}>
                      {conversionData.conversion_feasibility.can_transform ? '✅ 可以转换' : '❌ 难以转换'}
                    </span>
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-blue-100 border border-blue-300">
                    <span className="text-sm text-blue-800" style={{ fontWeight: 600 }}>
                      难度：{
                        conversionData.conversion_feasibility.difficulty === 'easy' ? '简单' :
                        conversionData.conversion_feasibility.difficulty === 'medium' ? '中等' : '困难'
                      }
                    </span>
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-purple-100 border border-purple-300">
                    <span className="text-sm text-purple-800" style={{ fontWeight: 600 }}>
                      置信度：{Math.round((conversionData.conversion_feasibility.confidence || 0) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Review Summary */}
                {reviewData && (
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                    <h4 className="text-gray-900 text-sm mb-2" style={{ fontWeight: 600 }}>
                      📸 照片点评
                    </h4>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {reviewData}
                    </p>
                  </div>
                )}

                {/* Limiting Factors */}
                {conversionData.conversion_feasibility.limiting_factors && 
                 conversionData.conversion_feasibility.limiting_factors.length > 0 && (
                  <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-200">
                    <h4 className="text-gray-900 text-sm mb-3" style={{ fontWeight: 600 }}>
                      ⚠️ 限制因素
                    </h4>
                    <ul className="space-y-2">
                      {conversionData.conversion_feasibility.limiting_factors.map((factor: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-orange-500 mt-0.5">•</span>
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendation */}
                {conversionData.conversion_feasibility.recommendation && (
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                    <h4 className="text-gray-900 text-sm mb-2 flex items-center gap-2" style={{ fontWeight: 600 }}>
                      <Lightbulb className="w-4 h-4 text-purple-600" />
                      💡 调色建议
                    </h4>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {conversionData.conversion_feasibility.recommendation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          💡 以下是完整的 Lightroom 调整参数，可直接应用到你的照片
        </p>
      </div>

      {/* 直方图分析 */}
      {targetImageUrl && (
        <Histogram imageUrl={targetImageUrl} type="target" />
      )}

      {/* 常规调整面板 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {regularPanels.map((panel: any, index: number) => {
          // 检查是否是曲线面板
          const isCurvePanel = panel.title.includes('曲线') || panel.title.toLowerCase().includes('curve');
          const curveData = isCurvePanel ? parseCurveParams(panel.params) : null;

          // 检查是否是色彩分级面板
          const isColorGradingPanel = panel.title.includes('色彩分级') || panel.title.toLowerCase().includes('color grading');
          const colorGradingData = isColorGradingPanel ? parseColorGradingParams(panel.params) : null;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm ${
                isCurvePanel ? 'lg:col-span-2' : ''
              }`}
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {isCurvePanel ? <TrendingUp className="w-5 h-5 text-blue-600" /> : <Sliders className="w-5 h-5 text-blue-600" />}
                  </div>
                  <h4 className="text-gray-900">{panel.title}</h4>
                </div>

                {isCurvePanel && curveData ? (
                  <div className="space-y-6">
                    {/* Luma 曲线 */}
                    {curveData.luma.length > 0 && (
                      <div>
                        <h5 className="text-gray-700 text-sm mb-3">色调曲线（Luma）</h5>
                        <div className="flex gap-4 items-start bg-gray-50 rounded-xl p-4">
                          <div className="flex-1">
                            <CurveVisualizationLR points={curveData.luma} channel="luma" />
                          </div>
                          <div className="w-64 space-y-2">
                            {panel.params.filter((p: any) => p.name.includes('Luma')).map((param: any, idx: number) => (
                              <TooltipProvider key={idx}>
                                <Tooltip delayDuration={200}>
                                  <TooltipTrigger asChild>
                                    <div className="flex justify-between items-center gap-3 px-3 py-2 bg-white rounded-lg border border-gray-200 text-xs hover:bg-blue-50 transition-colors cursor-help group">
                                      <span className="text-gray-700 flex items-center gap-1.5">
                                        {param.name}
                                        <HelpCircle className="w-3 h-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                      </span>
                                      <span className="text-blue-600">{param.value}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="max-w-xs bg-gradient-to-br from-gray-900 to-gray-800 text-white border-gray-700">
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 text-blue-300 text-xs">
                                        <Info className="w-3.5 h-3.5" />
                                        <span>调整依据</span>
                                      </div>
                                      <p className="text-sm leading-relaxed">
                                        {param.reason || generateReasonText(param.name, param.value, panel.title)}
                                      </p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* RGB 通道曲线 */}
                    {(curveData.red.length > 0 || curveData.green.length > 0 || curveData.blue.length > 0) && (
                      <div>
                        <h5 className="text-gray-700 text-sm mb-3">RGB 各通道微调</h5>
                        <div className="grid grid-cols-3 gap-3">
                          {curveData.red.length > 0 && (
                            <div className="bg-red-50/50 rounded-xl p-3 border border-red-100">
                              <div className="bg-white rounded-lg p-3 mb-2">
                                <CurveVisualizationLR points={curveData.red} channel="红" />
                              </div>
                              <div className="space-y-1">
                                {panel.params.filter((p: any) => p.name.includes('红')).map((param: any, idx: number) => (
                                  <TooltipProvider key={idx}>
                                    <Tooltip delayDuration={200}>
                                      <TooltipTrigger asChild>
                                        <div className="text-xs px-2 py-1 bg-white rounded text-gray-700 hover:bg-red-50 transition-colors cursor-help group">
                                          <span className="text-red-600 flex items-center gap-1 justify-center">
                                            {param.value}
                                            <HelpCircle className="w-2.5 h-2.5 text-gray-400 group-hover:text-red-500 transition-colors" />
                                          </span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs bg-gradient-to-br from-gray-900 to-gray-800 text-white border-gray-700">
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2 text-red-300 text-xs">
                                            <Info className="w-3.5 h-3.5" />
                                            <span>调整依据</span>
                                          </div>
                                          <p className="text-sm leading-relaxed">
                                            {param.reason || generateReasonText(param.name, param.value, panel.title)}
                                          </p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ))}
                              </div>
                            </div>
                          )}
                          {curveData.green.length > 0 && (
                            <div className="bg-green-50/50 rounded-xl p-3 border border-green-100">
                              <div className="bg-white rounded-lg p-3 mb-2">
                                <CurveVisualizationLR points={curveData.green} channel="绿" />
                              </div>
                              <div className="space-y-1">
                                {panel.params.filter((p: any) => p.name.includes('绿')).map((param: any, idx: number) => (
                                  <TooltipProvider key={idx}>
                                    <Tooltip delayDuration={200}>
                                      <TooltipTrigger asChild>
                                        <div className="text-xs px-2 py-1 bg-white rounded text-gray-700 hover:bg-green-50 transition-colors cursor-help group">
                                          <span className="text-green-600 flex items-center gap-1 justify-center">
                                            {param.value}
                                            <HelpCircle className="w-2.5 h-2.5 text-gray-400 group-hover:text-green-500 transition-colors" />
                                          </span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs bg-gradient-to-br from-gray-900 to-gray-800 text-white border-gray-700">
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2 text-green-300 text-xs">
                                            <Info className="w-3.5 h-3.5" />
                                            <span>调整依据</span>
                                          </div>
                                          <p className="text-sm leading-relaxed">
                                            {param.reason || generateReasonText(param.name, param.value, panel.title)}
                                          </p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ))}
                              </div>
                            </div>
                          )}
                          {curveData.blue.length > 0 && (
                            <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100">
                              <div className="bg-white rounded-lg p-3 mb-2">
                                <CurveVisualizationLR points={curveData.blue} channel="蓝" />
                              </div>
                              <div className="space-y-1">
                                {panel.params.filter((p: any) => p.name.includes('蓝')).map((param: any, idx: number) => (
                                  <TooltipProvider key={idx}>
                                    <Tooltip delayDuration={200}>
                                      <TooltipTrigger asChild>
                                        <div className="text-xs px-2 py-1 bg-white rounded text-gray-700 hover:bg-blue-50 transition-colors cursor-help group">
                                          <span className="text-blue-600 flex items-center gap-1 justify-center">
                                            {param.value}
                                            <HelpCircle className="w-2.5 h-2.5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                          </span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs bg-gradient-to-br from-gray-900 to-gray-800 text-white border-gray-700">
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2 text-blue-300 text-xs">
                                            <Info className="w-3.5 h-3.5" />
                                            <span>调整依据</span>
                                          </div>
                                          <p className="text-sm leading-relaxed">
                                            {param.reason || generateReasonText(param.name, param.value, panel.title)}
                                          </p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : isColorGradingPanel && colorGradingData ? (
                  <div className="space-y-4">
                    {/* 色轮可视化 */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                      <ColorGradingVisualization
                        highlights={colorGradingData.highlights}
                        midtones={colorGradingData.midtones}
                        shadows={colorGradingData.shadows}
                        balance={colorGradingData.balance}
                      />
                    </div>

                    {/* 详细参数列表 */}
                    <details className="group">
                      <summary className="cursor-pointer px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors flex items-center justify-between">
                        <span>查看详细参数</span>
                        <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                      </summary>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {panel.params.map((param: any, pIdx: number) => (
                          <TooltipProvider key={pIdx}>
                            <Tooltip delayDuration={200}>
                              <TooltipTrigger asChild>
                                <div className="flex justify-between items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors cursor-help group">
                                  <span className="text-gray-700 text-sm flex items-center gap-1.5">
                                    {param.name}
                                    <HelpCircle className="w-3 h-3 text-gray-400 group-hover:text-purple-500 transition-colors" />
                                  </span>
                                  <span className="text-purple-600 text-sm">{param.value}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs bg-gradient-to-br from-gray-900 to-gray-800 text-white border-gray-700">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-purple-300 text-xs">
                                    <Info className="w-3.5 h-3.5" />
                                    <span>调整依据</span>
                                  </div>
                                  <p className="text-sm leading-relaxed">
                                    {param.reason || generateReasonText(param.name, param.value, panel.title)}
                                  </p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </details>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {panel.params && panel.params.map((param: any, idx: number) => (
                      <TooltipProvider key={idx}>
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors cursor-help group">
                              <span className="text-sm text-gray-700 flex items-center gap-2">
                                {param.name}
                                <HelpCircle className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                              </span>
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-lg border border-blue-200">
                                {param.value}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs bg-gradient-to-br from-gray-900 to-gray-800 text-white border-gray-700">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-blue-300 text-xs">
                                <Info className="w-3.5 h-3.5" />
                                <span>调整依据</span>
                              </div>
                              <p className="text-sm leading-relaxed">
                                {param.reason || generateReasonText(param.name, param.value, panel.title)}
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                )}

                {panel.note && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">{panel.note}</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 蒙版调整 - 只显示第一个 */}
      {maskPanels.length > 0 && maskPanels[0].masks && maskPanels[0].masks.length > 0 && (
        <div className="mt-6">
          <MaskVisualizationWithRendering
            imageUrl={targetImageUrl || ''}
            mask={maskPanels[0].masks[0]}
          />
        </div>
      )}
    </div>
  );
}