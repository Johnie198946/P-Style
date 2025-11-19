import { motion } from 'motion/react';
import { 
  Grid3x3, 
  Target, 
  TrendingUp, 
  Layers, 
  Maximize2, 
  Scale, 
  Lightbulb,
  Frame
} from 'lucide-react';

// 支持新结构（5字段）和旧结构（7段）
interface CompositionData {
  // 新结构（5字段）
  main_structure?: string;
  subject_weight?: {
    description?: string;
    layers?: string;
  };
  visual_guidance?: {
    analysis?: string;
    path?: string;
  };
  ratios_negative_space?: {
    entity_ratio?: string;
    space_ratio?: string;
    distribution?: string;
  };
  style_class?: string;
  
  // 旧结构（7段，向后兼容）
  画面主结构分析?: string;
  主体位置与视觉权重?: string;
  线条与方向引导?: string;
  空间层次与分区?: string;
  比例与留白?: string;
  视觉平衡与动势?: string;
  构图风格归类与改进建议?: string;
}

interface CompositionSectionProps {
  data: CompositionData;
}

// 新结构（5字段）配置
const newAnalysisItems = [
  {
    key: 'main_structure' as const,
    title: '画面主结构分析',
    subtitle: 'Main Structure',
    icon: Grid3x3,
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'from-blue-50 to-cyan-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    description: '几何框架 · 视觉轴线 · 平衡关系'
  },
  {
    key: 'subject_weight' as const,
    title: '主体位置与视觉权重',
    subtitle: 'Subject Weight',
    icon: Target,
    gradient: 'from-purple-500 to-pink-500',
    bg: 'from-purple-50 to-pink-50',
    border: 'border-purple-200',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    description: '位置分析 · 面积比例 · 权重关系'
  },
  {
    key: 'visual_guidance' as const,
    title: '线条与方向引导',
    subtitle: 'Visual Guidance',
    icon: TrendingUp,
    gradient: 'from-indigo-500 to-blue-500',
    bg: 'from-indigo-50 to-blue-50',
    border: 'border-indigo-200',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    description: '引导线 · 线条走向 · 视线动线'
  },
  {
    key: 'ratios_negative_space' as const,
    title: '比例与留白',
    subtitle: 'Proportion & Negative Space',
    icon: Maximize2,
    gradient: 'from-emerald-500 to-green-500',
    bg: 'from-emerald-50 to-green-50',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    description: '比例关系 · 留白节奏 · 元素密度'
  },
  {
    key: 'style_class' as const,
    title: '构图风格归类',
    subtitle: 'Style Classification',
    icon: Lightbulb,
    gradient: 'from-rose-500 to-red-500',
    bg: 'from-rose-50 to-red-50',
    border: 'border-rose-200',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    description: '风格判定 · 改进方向 · 优化建议'
  }
];

// 旧结构（7段）配置（向后兼容）
const oldAnalysisItems = [
  {
    key: '画面主结构分析' as keyof CompositionData,
    title: '画面主结构分析',
    subtitle: 'Compositional Framework',
    icon: Grid3x3,
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'from-blue-50 to-cyan-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    description: '几何框架 · 视觉轴线 · 平衡关系'
  },
  {
    key: '主体位置与视觉权重' as keyof CompositionData,
    title: '主体位置与视觉权重',
    subtitle: 'Subject Placement & Visual Weight',
    icon: Target,
    gradient: 'from-purple-500 to-pink-500',
    bg: 'from-purple-50 to-pink-50',
    border: 'border-purple-200',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    description: '位置分析 · 面积比例 · 权重关系'
  },
  {
    key: '线条与方向引导' as keyof CompositionData,
    title: '线条与方向引导',
    subtitle: 'Leading Lines & Visual Flow',
    icon: TrendingUp,
    gradient: 'from-indigo-500 to-blue-500',
    bg: 'from-indigo-50 to-blue-50',
    border: 'border-indigo-200',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    description: '引导线 · 线条走向 · 视线动线'
  },
  {
    key: '空间层次与分区' as keyof CompositionData,
    title: '空间层次与分区',
    subtitle: 'Spatial Depth & Layering',
    icon: Layers,
    gradient: 'from-cyan-500 to-teal-500',
    bg: 'from-cyan-50 to-teal-50',
    border: 'border-cyan-200',
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    description: '前中背景 · 透视关系 · 空间深度'
  },
  {
    key: '比例与留白' as keyof CompositionData,
    title: '比例与留白',
    subtitle: 'Proportion & Negative Space',
    icon: Maximize2,
    gradient: 'from-emerald-500 to-green-500',
    bg: 'from-emerald-50 to-green-50',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    description: '比例关系 · 留白节奏 · 元素密度'
  },
  {
    key: '视觉平衡与动势' as keyof CompositionData,
    title: '视觉平衡与动势',
    subtitle: 'Visual Balance & Dynamics',
    icon: Scale,
    gradient: 'from-amber-500 to-orange-500',
    bg: 'from-amber-50 to-orange-50',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    description: '水平垂直 · 稳定动态 · 视觉张力'
  },
  {
    key: '构图风格归类与改进建议' as keyof CompositionData,
    title: '构图风格归类与改进建议',
    subtitle: 'Style Classification & Improvements',
    icon: Lightbulb,
    gradient: 'from-rose-500 to-red-500',
    bg: 'from-rose-50 to-red-50',
    border: 'border-rose-200',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    description: '风格判定 · 改进方向 · 优化建议'
  }
];

export function CompositionSection({ data }: CompositionSectionProps) {
  if (!data) return null;

  // 检测是否使用新结构（5字段）
  const isNewStructure = data.main_structure !== undefined || data.subject_weight !== undefined || 
                         data.visual_guidance !== undefined || data.ratios_negative_space !== undefined || 
                         data.style_class !== undefined;
  
  const analysisItems = isNewStructure ? newAnalysisItems : oldAnalysisItems;
  const totalItems = isNewStructure ? 5 : 7;

  return (
    <div className="space-y-6">
      {/* Analysis Grid */}
      <div className="grid grid-cols-1 gap-6">
        {analysisItems.map((item, index) => {
          let content: string | undefined = '';
          let subContent: { label: string; value: string }[] = [];

          if (isNewStructure) {
            // 新结构处理
            switch (item.key) {
              case 'main_structure':
                content = data.main_structure;
                break;
              case 'subject_weight':
                content = data.subject_weight?.description;
                if (data.subject_weight?.layers) {
                  subContent.push({ label: '空间层次', value: data.subject_weight.layers });
                }
                break;
              case 'visual_guidance':
                content = data.visual_guidance?.analysis;
                if (data.visual_guidance?.path) {
                  subContent.push({ label: '视觉路径', value: data.visual_guidance.path });
                }
                break;
              case 'ratios_negative_space':
                content = data.ratios_negative_space?.distribution;
                if (data.ratios_negative_space?.entity_ratio || data.ratios_negative_space?.space_ratio) {
                  subContent.push({ 
                    label: '比例', 
                    value: `实体 ${data.ratios_negative_space.entity_ratio || 'N/A'}，留白 ${data.ratios_negative_space.space_ratio || 'N/A'}` 
                  });
                }
                break;
              case 'style_class':
                content = data.style_class;
                break;
            }
          } else {
            // 旧结构处理（向后兼容）
            content = data[item.key as keyof CompositionData] as string | undefined;
          }

          if (!content) return null;

          const Icon = item.icon;

          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <div className={`
                relative overflow-hidden rounded-2xl border ${item.border}
                bg-gradient-to-br ${item.bg}
                hover:shadow-lg hover:shadow-${item.iconColor}/10
                transition-all duration-300
              `}>
                {/* Decorative gradient line */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.gradient}`} />
                
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-6">
                    <div className={`
                      p-3 ${item.iconBg} rounded-xl
                      group-hover:scale-110 transition-transform duration-300
                    `}>
                      <Icon className={`w-6 h-6 ${item.iconColor}`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl text-gray-900">
                          {item.title}
                        </h3>
                        <div className={`
                          px-3 py-1 rounded-full text-xs
                          bg-gradient-to-r ${item.gradient}
                          text-white shadow-sm
                        `}>
                          {index + 1}/{totalItems}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        {item.subtitle}
                      </p>
                      <p className="text-xs text-gray-400">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="relative">
                    {/* Quote decoration */}
                    <div className={`
                      absolute -left-2 top-0 w-1 h-full rounded-full
                      bg-gradient-to-b ${item.gradient} opacity-40
                    `} />
                    
                    <div className="pl-6 pr-2">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line mb-4">
                        {content}
                      </p>
                      
                      {/* 子字段显示（新结构） */}
                      {subContent.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {subContent.map((sub, idx) => (
                            <div key={idx} className="p-3 bg-white/50 rounded-lg border border-gray-200/50">
                              <p className="text-xs text-gray-600 mb-1">
                                <strong>{sub.label}：</strong>
                              </p>
                              <p className="text-sm text-gray-700">
                                {sub.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer decoration */}
                  <div className="mt-4 pt-4 border-t border-gray-200/50">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${item.gradient}`} />
                      <span>专业摄影构图分析</span>
                    </div>
                  </div>
                </div>

                {/* Hover effect overlay */}
                <div className={`
                  absolute inset-0 bg-gradient-to-br ${item.gradient}
                  opacity-0 group-hover:opacity-[0.02]
                  transition-opacity duration-300 pointer-events-none
                `} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-8 p-6 bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl border border-gray-200"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Frame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-lg text-gray-900">构图分析说明</h4>
            <p className="text-sm text-gray-500">Analysis Guidelines</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
            <div>
              <p className="text-gray-600 mb-1">分析标准</p>
              <p className="text-gray-500 text-xs">专业摄影术语，客观具体</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5" />
            <div>
              <p className="text-gray-600 mb-1">评价方式</p>
              <p className="text-gray-500 text-xs">结构化分析，可操作建议</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5" />
            <div>
              <p className="text-gray-600 mb-1">输出风格</p>
              <p className="text-gray-500 text-xs">大师点评，专业指导</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Professional Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="p-4 bg-blue-50/50 rounded-xl border border-blue-100"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg mt-0.5">
            <Lightbulb className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-1">💡 专业提示</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              以上分析聚焦于画面空间结构与视觉引导关系，不涉及色彩或光影描述。
              所有建议均基于构图原理与视觉心理学，旨在帮助理解画面的结构逻辑与改进方向。
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
