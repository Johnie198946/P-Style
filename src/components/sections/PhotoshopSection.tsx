import { motion } from 'motion/react';
import { Layers, Image, Sliders, Sparkles, ChevronRight, Images, HelpCircle, Info } from 'lucide-react';
import { useState } from 'react';
import { CurveChart } from '../CurveChart';
import { ImageComparisonModal } from '../ImageComparisonModal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

// 生成PS调整依据说明
function generatePSReasonText(paramName: string, paramValue: string, stepTitle: string): string {
  const name = paramName.toLowerCase();
  const value = paramValue.toLowerCase();
  
  // ACR滤镜
  if (stepTitle.includes('ACR') || stepTitle.toLowerCase().includes('camera raw')) {
    if (name.includes('曝光') || name.includes('exposure')) {
      return '调整整体曝光度，为后续精细调整奠定基础';
    }
    if (name.includes('对比') || name.includes('contrast')) {
      return '控制画面整体对比度，建立明暗关系';
    }
    if (name.includes('高光') || name.includes('highlight')) {
      return '恢复高光区域细节，防止过曝';
    }
    if (name.includes('阴影') || name.includes('shadow')) {
      return '提亮或压暗阴影，控制暗部层次';
    }
    if (name.includes('色温') || name.includes('temperature')) {
      return '调整画面色温，营造冷暖氛围';
    }
    if (name.includes('色调') || name.includes('tint')) {
      return '调整绿-洋红色调平衡';
    }
  }
  
  // 曲线调整
  if (stepTitle.includes('曲线') || stepTitle.toLowerCase().includes('curve')) {
    if (name.includes('rgb') || name.includes('主曲线')) {
      return '通过RGB主曲线精确控制整体明暗对比和反差';
    }
    if (name.includes('红') || name.includes('red')) {
      return '调整红色通道以改变画面红-青色调倾向';
    }
    if (name.includes('绿') || name.includes('green')) {
      return '调整绿色通道以改变画面绿-洋红色调倾向';
    }
    if (name.includes('蓝') || name.includes('blue')) {
      return '调整蓝色通道以改变画面蓝-黄色调倾向和色温';
    }
    if (name.includes('高光') || name.includes('highlight')) {
      return '在曲线上调整高光点，精确控制亮部表现';
    }
    if (name.includes('阴影') || name.includes('shadow')) {
      return '在曲线上调整阴影点，精确控制暗部表现';
    }
    if (name.includes('中间调') || name.includes('midtone')) {
      return '在曲线上调整中间调，控制画面主体亮度';
    }
  }
  
  // 色彩平衡
  if (stepTitle.includes('色彩平衡') || stepTitle.toLowerCase().includes('color balance')) {
    if (name.includes('高光') || name.includes('highlight')) {
      return '为高光区域添加色彩倾向，营造氛围';
    }
    if (name.includes('中间调') || name.includes('midtone')) {
      return '为中间调区域添加色彩倾向，影响画面主体';
    }
    if (name.includes('阴影') || name.includes('shadow')) {
      return '为阴影区域添加色彩倾向，丰富暗部色彩';
    }
  }
  
  // 可选颜色
  if (stepTitle.includes('可选颜色') || stepTitle.toLowerCase().includes('selective color')) {
    return '针对特定颜色进行CMYK四色微调，实现精准调色';
  }
  
  // 色相/饱和度
  if (stepTitle.includes('色相') || stepTitle.includes('饱和度') || stepTitle.toLowerCase().includes('hue')) {
    if (name.includes('色相') || name.includes('hue')) {
      return '改变该颜色的色相倾向';
    }
    if (name.includes('饱和度') || name.includes('saturation')) {
      return '调整该颜色的鲜艳程度';
    }
    if (name.includes('明度') || name.includes('lightness')) {
      return '调整该颜色的明暗程度';
    }
  }
  
  // 锐化
  if (stepTitle.includes('锐化') || stepTitle.toLowerCase().includes('sharpen')) {
    if (name.includes('数量') || name.includes('amount')) {
      return '控制锐化的强度';
    }
    if (name.includes('半径') || name.includes('radius')) {
      return '控制锐化影响的边缘范围';
    }
    if (name.includes('阈值') || name.includes('threshold')) {
      return '控制锐化作用的最小对比度差异';
    }
  }
  
  // 图层混合
  if (stepTitle.includes('图层') || stepTitle.toLowerCase().includes('layer')) {
    if (name.includes('不透明度') || name.includes('opacity')) {
      return '控制调整图层的作用强度';
    }
    if (name.includes('混合模式') || name.includes('blend')) {
      return '改变图层与下层的混合方式';
    }
  }
  
  return 'AI分析目标照片特征后给出的专业PS调整建议';
}

export function PhotoshopSection({ data, targetImageUrl, userImageUrl }: any) {
  if (!data || !Array.isArray(data)) return null;

  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));
  const [showComparison, setShowComparison] = useState(false);

  const toggleStep = (index: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSteps(newExpanded);
  };
  
  // 判断是否是曲线调整步骤（通常是第二步，index=1）
  const isCurveStep = (step: any, index: number) => {
    return index === 1 || step.title?.includes('曲线') || step.title?.toLowerCase().includes('curve');
  };

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

      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <p className="text-sm text-purple-800">
          💡 按照以下步骤在 Photoshop 中进行调整，可以获得最佳效果
        </p>
      </div>

      <div className="space-y-4">
        {data.map((step: any, index: number) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
          >
            <button
              onClick={() => toggleStep(index)}
              className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center justify-center">
                  {index + 1}
                </div>
                <div className="text-left">
                  <h4 className="text-gray-900">{step.title}</h4>
                  <p className="text-sm text-gray-500">{step.description}</p>
                </div>
              </div>
              <motion.div
                animate={{ rotate: expandedSteps.has(index) ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </motion.div>
            </button>

            {expandedSteps.has(index) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-gray-200"
              >
                {/* 如果是曲线步骤，使用左右布局 */}
                {isCurveStep(step, index) ? (
                  <div className="p-5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* 左边：曲线图 */}
                      <div>
                        <CurveChart />
                      </div>
                      
                      {/* 右边：文字参数 */}
                      <div className="space-y-4">
                        {/* 参数设置 */}
                        {step.params && step.params.length > 0 && (
                          <div>
                            <h5 className="text-sm text-gray-700 mb-3 flex items-center gap-2">
                              <Sliders className="w-4 h-4" />
                              调整参数
                            </h5>
                            <div className="grid gap-2 grid-cols-1">
                              {step.params.map((param: any, idx: number) => (
                                <TooltipProvider key={idx}>
                                  <Tooltip delayDuration={200}>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-purple-50 transition-colors cursor-help group">
                                        <span className="text-sm text-gray-700 flex items-center gap-2">
                                          {param.name}
                                          <HelpCircle className="w-3.5 h-3.5 text-gray-400 group-hover:text-purple-500 transition-colors" />
                                        </span>
                                        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-lg border border-purple-200">
                                          {param.value}
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="max-w-xs bg-gradient-to-br from-gray-900 to-gray-800 text-white border-gray-700">
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-purple-300 text-xs">
                                          <Info className="w-3.5 h-3.5" />
                                          <span>调整依据</span>
                                        </div>
                                        <p className="text-sm leading-relaxed">
                                          {param.reason || generatePSReasonText(param.name, param.value, step.title)}
                                        </p>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 详细说明 */}
                        {step.details && (
                          <div className="p-4 bg-purple-50 rounded-lg">
                            <h5 className="text-sm text-purple-800 mb-2 flex items-center gap-2">
                              <Sparkles className="w-4 h-4" />
                              详细说明
                            </h5>
                            <p className="text-sm text-gray-700 leading-relaxed">{step.details}</p>
                          </div>
                        )}

                        {/* 图层混合模式 */}
                        {step.blendMode && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600">混合模式：</span>
                            <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-sm rounded">
                              {step.blendMode}
                            </span>
                            {step.opacity && (
                              <span className="ml-2 text-sm text-gray-600">
                                不透明度：{step.opacity}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 其他步骤保持原样 */
                  <div className="p-5 space-y-4">
                    {/* 参数设置 */}
                    {step.params && step.params.length > 0 && (
                      <div>
                        <h5 className="text-sm text-gray-700 mb-3 flex items-center gap-2">
                          <Sliders className="w-4 h-4" />
                          调整参数
                        </h5>
                        <div className={`grid gap-2 ${
                          (step.title.includes('Camera Raw') || step.title.includes('ACR') || index === 0) 
                            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' 
                            : 'grid-cols-1'
                        }`}>
                          {step.params.map((param: any, idx: number) => (
                            <TooltipProvider key={idx}>
                              <Tooltip delayDuration={200}>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-purple-50 transition-colors cursor-help group">
                                    <span className="text-sm text-gray-700 flex items-center gap-2">
                                      {param.name}
                                      <HelpCircle className="w-3.5 h-3.5 text-gray-400 group-hover:text-purple-500 transition-colors" />
                                    </span>
                                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-lg border border-purple-200">
                                      {param.value}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs bg-gradient-to-br from-gray-900 to-gray-800 text-white border-gray-700">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-purple-300 text-xs">
                                      <Info className="w-3.5 h-3.5" />
                                      <span>调整依据</span>
                                    </div>
                                    <p className="text-sm leading-relaxed">
                                      {param.reason || generatePSReasonText(param.name, param.value, step.title)}
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 详细说明 */}
                    {step.details && (
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <h5 className="text-sm text-purple-800 mb-2 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          详细说明
                        </h5>
                        <p className="text-sm text-gray-700 leading-relaxed">{step.details}</p>
                      </div>
                    )}

                    {/* 图层混合模式 */}
                    {step.blendMode && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">混合模式：</span>
                        <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-sm rounded">
                          {step.blendMode}
                        </span>
                        {step.opacity && (
                          <span className="ml-2 text-sm text-gray-600">
                            不透明度：{step.opacity}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
