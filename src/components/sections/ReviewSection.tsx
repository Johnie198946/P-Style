import { motion } from 'motion/react';
import { 
  Star, 
  Camera, 
  Zap, 
  Palette, 
  Layout, 
  Settings, 
  Cpu, 
  Heart,
  Award,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Quote
} from 'lucide-react';

interface ComparisonDimension {
  title: string;
  referenceDescription: string;
  userDescription: string;
}

interface FeasibilityData {
  conversion_feasibility: string;
  difficulty: string;
  confidence: number;
  limiting_factors: string;
  recommendation: string;
  notes?: string;
}

interface ReviewData {
  // 对比综述
  overviewSummary?: string;
  
  // 八个对比维度
  dimensions?: {
    visualGuidance?: ComparisonDimension;
    focusExposure?: ComparisonDimension;
    colorDepth?: ComparisonDimension;
    composition?: ComparisonDimension;
    technicalDetails?: ComparisonDimension;
    equipment?: ComparisonDimension;
    colorEmotion?: ComparisonDimension;
    advantages?: ComparisonDimension;
  };
  
  // 对比表格
  comparisonTable?: Array<{
    dimension: string;
    reference: string;
    user: string;
  }>;
  
  // 摄影师风格总结
  photographerStyleSummary?: string;
  
  // 复刻可行性评估
  feasibility?: FeasibilityData;
  
  // 复刻可行性描述
  feasibilityDescription?: string;
}

export function ReviewSection({ data }: { data?: ReviewData }) {
  console.log('ReviewSection received data:', data);
  
  if (!data) {
    console.log('ReviewSection: No data received!');
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">没有接收到数据</p>
      </div>
    );
  }

  // 维度配置
  const dimensionConfig = [
    {
      key: 'visualGuidance',
      title: '视觉引导与主体',
      icon: Camera,
      color: 'blue',
      gradient: 'from-blue-50 to-blue-100',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-600'
    },
    {
      key: 'focusExposure',
      title: '焦点与曝光',
      icon: Zap,
      color: 'yellow',
      gradient: 'from-yellow-50 to-yellow-100',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      titleColor: 'text-yellow-600'
    },
    {
      key: 'colorDepth',
      title: '色彩与景深',
      icon: Palette,
      color: 'purple',
      gradient: 'from-purple-50 to-purple-100',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      titleColor: 'text-purple-600'
    },
    {
      key: 'composition',
      title: '构图与表达',
      icon: Layout,
      color: 'green',
      gradient: 'from-green-50 to-green-100',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      titleColor: 'text-green-600'
    },
    {
      key: 'technicalDetails',
      title: '技术细节',
      icon: Settings,
      color: 'orange',
      gradient: 'from-orange-50 to-orange-100',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      titleColor: 'text-orange-600'
    },
    {
      key: 'equipment',
      title: '设备与技术（推断）',
      icon: Cpu,
      color: 'cyan',
      gradient: 'from-cyan-50 to-cyan-100',
      iconBg: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
      titleColor: 'text-cyan-600'
    },
    {
      key: 'colorEmotion',
      title: '色彩与情感',
      icon: Heart,
      color: 'pink',
      gradient: 'from-pink-50 to-pink-100',
      iconBg: 'bg-pink-100',
      iconColor: 'text-pink-600',
      titleColor: 'text-pink-600'
    },
    {
      key: 'advantages',
      title: '优点评价',
      icon: Award,
      color: 'emerald',
      gradient: 'from-emerald-50 to-emerald-100',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      titleColor: 'text-emerald-600'
    }
  ];

  // 可行性指标配置
  const getDifficultyConfig = (difficulty: string) => {
    const lower = difficulty?.toLowerCase() || '';
    if (lower === 'low' || lower.includes('低')) {
      return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', label: '低难度' };
    } else if (lower === 'medium' || lower.includes('中')) {
      return { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-100', label: '中等难度' };
    } else {
      return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: '高难度' };
    }
  };

  const getConfidenceConfig = (confidence: number) => {
    if (confidence >= 0.8) {
      return { color: 'text-green-600', bg: 'bg-green-100', label: '高信心' };
    } else if (confidence >= 0.5) {
      return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: '中等信心' };
    } else {
      return { color: 'text-red-600', bg: 'bg-red-100', label: '低信心' };
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. 对比综述 */}
      {data.overviewSummary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative p-8 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl border border-indigo-200 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <Star className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-gray-900 mb-2">综合评估</h3>
                <div className="flex items-center gap-2">
                  <div className="h-1 w-20 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
                  <span className="text-xs text-gray-500">专业对比分析</span>
                </div>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed">{data.overviewSummary}</p>
          </div>
        </motion.div>
      )}

      {/* 2. 八个对比维度 */}
      {data.dimensions && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
            <h3 className="text-gray-900">分维度对比分析</h3>
          </div>
          
          <div className="space-y-4">
            {dimensionConfig.map((config, index) => {
              const dimension = data.dimensions?.[config.key as keyof typeof data.dimensions] as ComparisonDimension | undefined;
              if (!dimension) return null;

              const Icon = config.icon;

              return (
                <motion.div
                  key={config.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* 维度标题 */}
                  <div className={`p-4 bg-gradient-to-r ${config.gradient} border-b border-gray-200`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 ${config.iconBg} rounded-lg`}>
                        <Icon className={`w-5 h-5 ${config.iconColor}`} />
                      </div>
                      <h4 className={`${config.titleColor}`}>{config.title}</h4>
                    </div>
                  </div>

                  {/* 对比内容 */}
                  <div className="grid md:grid-cols-2 divide-x divide-gray-200">
                    {/* 参考图分析 */}
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-xs text-gray-500">参考照片</span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {dimension.referenceDescription}
                      </p>
                    </div>

                    {/* 用户图分析 */}
                    <div className="p-6 bg-gray-50/50">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <span className="text-xs text-gray-500">用户照片</span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {dimension.userDescription}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. 对比表格 */}
      {data.comparisonTable && data.comparisonTable.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-teal-500 rounded-full" />
            <h3 className="text-gray-900">参数对比总览</h3>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <th className="text-left p-4 text-sm text-gray-600">评估维度</th>
                    <th className="text-left p-4 text-sm text-gray-600">参考照片</th>
                    <th className="text-left p-4 text-sm text-gray-600">用户照片</th>
                  </tr>
                </thead>
                <tbody>
                  {data.comparisonTable.map((row, index) => (
                    <motion.tr
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="p-4 text-gray-900 text-sm">{row.dimension}</td>
                      <td className="p-4 text-gray-600 text-sm">{row.reference}</td>
                      <td className="p-4 text-gray-600 text-sm">{row.user}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}

      {/* 4. 摄影师风格总结 */}
      {data.photographerStyleSummary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative p-8 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200 overflow-hidden"
        >
          <div className="absolute top-4 left-4 opacity-10">
            <Quote className="w-24 h-24 text-amber-600" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-amber-600">摄影师风格总结</span>
            </div>
            <p className="text-gray-900 italic leading-relaxed text-lg">
              "{data.photographerStyleSummary}"
            </p>
          </div>
        </motion.div>
      )}

      {/* 5. 复刻可行性评估 */}
      {data.feasibility && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-gradient-to-b from-rose-500 to-orange-500 rounded-full" />
            <h3 className="text-gray-900">复刻可行性评估</h3>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
          >
            {/* 指标卡片 */}
            <div className="p-6 border-b border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* 可行性 */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500 mb-2">转换可行性</div>
                  <div className="text-gray-900">
                    {data.feasibility.conversion_feasibility === 'can_transform: true' 
                      ? '✓ 可转换' 
                      : data.feasibility.conversion_feasibility}
                  </div>
                </div>

                {/* 难度 */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500 mb-2">难度等级</div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const config = getDifficultyConfig(data.feasibility.difficulty);
                      const Icon = config.icon;
                      return (
                        <>
                          <div className={`p-1 ${config.bg} rounded`}>
                            <Icon className={`w-4 h-4 ${config.color}`} />
                          </div>
                          <span className="text-gray-900 text-sm">{data.feasibility.difficulty}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* 信心度 */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500 mb-2">信心指数</div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const config = getConfidenceConfig(data.feasibility.confidence);
                      return (
                        <>
                          <div className={`px-2 py-1 ${config.bg} rounded`}>
                            <span className={`text-sm ${config.color}`}>
                              {(data.feasibility.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <span className="text-gray-600 text-xs">{config.label}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* 详细信息表格 */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="p-4 text-sm text-gray-500 w-1/4">限制因素</td>
                    <td className="p-4 text-sm text-gray-700">{data.feasibility.limiting_factors}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="p-4 text-sm text-gray-500 w-1/4">推荐方案</td>
                    <td className="p-4 text-sm text-gray-700">{data.feasibility.recommendation}</td>
                  </tr>
                  {data.feasibility.notes && (
                    <tr>
                      <td className="p-4 text-sm text-gray-500 w-1/4">备注</td>
                      <td className="p-4 text-sm text-gray-700">{data.feasibility.notes}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}

      {/* 6. 复刻可行性描述 */}
      {data.feasibilityDescription && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200"
        >
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-blue-100 rounded-lg flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="text-blue-900 mb-3">可行性详细说明</h4>
              <p className="text-gray-700 leading-relaxed text-sm">
                {data.feasibilityDescription}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}