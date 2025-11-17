import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface FeasibilityDialogProps {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  sourceImage: string;
  targetImage: string;
  feasibilityResult?: {
    feasibilityScore: number;
    difficulty: string;
    confidence: number;
    dealBreakers: string[];
    dominantFactors: Array<{
      name: string;
      score: number;
      weight: number;
      reason: string;
    }>;
    recommendedActions: Array<{
      action: string;
      why: string;
    }>;
    metrics: Record<string, number>;
    explanation: string;
  } | null;
}

export function FeasibilityDialog({ 
  open, 
  onClose, 
  onContinue,
  sourceImage,
  targetImage,
  feasibilityResult
}: FeasibilityDialogProps) {
  if (!open) return null;

  // 使用真实数据或默认值
  const feasibilityScore = feasibilityResult 
    ? Math.round(feasibilityResult.feasibilityScore * 100)
    : 62;
  const difficulty = feasibilityResult?.difficulty || '中';
  
  const metrics = feasibilityResult?.dominantFactors?.slice(0, 3).map(factor => ({
    name: factor.name,
    value: factor.score,
    description: factor.reason
  })) || [
    {
      name: '色彩相似度',
      value: 0.5,
      description: '目标偏冷 180K，主色蓝占比高'
    },
    {
      name: '光线相似度',
      value: 0.5,
      description: '目标阳光、源图正面光'
    },
    {
      name: '语义相似度',
      value: 0.9,
      description: '主体均为人像且背景简单'
    }
  ];

  const circumference = 2 * Math.PI * 45; // radius = 45
  const offset = circumference - (feasibilityScore / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
      {/* 遮罩层 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* 对话框内容 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-2xl max-h-full mx-auto bg-white rounded-3xl shadow-2xl overflow-y-auto"
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        <div className="p-12">
          {/* 标题 */}
          <div className="text-center mb-8">
            <h2 className="text-gray-900 mb-3" style={{ fontSize: '2rem', fontWeight: 700 }}>
              复刻可行性评估
            </h2>
            <p className="text-gray-600">
              我们先核查断两目标风格是否能够您的照片有效复遗刻
              <br />
              (遗克无效等待)
            </p>
          </div>

          {/* 图片和进度区域 */}
          <div className="flex items-center justify-center gap-8 mb-10">
            {/* 源图 */}
            <div className="text-center">
              <div className="w-36 h-36 rounded-2xl overflow-hidden mb-3 shadow-lg">
                <img src={sourceImage} alt="源图" className="w-full h-full object-cover" />
              </div>
              <span className="text-gray-900" style={{ fontWeight: 600 }}>源图</span>
            </div>

            {/* 目标图 */}
            <div className="text-center">
              <div className="w-36 h-36 rounded-2xl overflow-hidden mb-3 shadow-lg">
                <img src={targetImage} alt="目标图" className="w-full h-full object-cover" />
              </div>
              <span className="text-gray-900" style={{ fontWeight: 600 }}>目标图</span>
            </div>

            {/* 可行性进度圆环 */}
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32">
                {/* 背景圆环 */}
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="45"
                    stroke="#E5E7EB"
                    strokeWidth="8"
                    fill="none"
                  />
                  {/* 进度圆环 */}
                  <circle
                    cx="64"
                    cy="64"
                    r="45"
                    stroke="url(#progressGradient)"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366F1" />
                      <stop offset="100%" stopColor="#A855F7" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* 百分比文字 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-indigo-600" style={{ fontSize: '2rem', fontWeight: 700 }}>
                      {feasibilityScore}%
                    </div>
                    <div className="text-gray-600 text-sm">可行</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-gray-900" style={{ fontWeight: 600 }}>
                难度：<span className="text-indigo-600">{difficulty}</span>
              </div>
            </div>
          </div>

          {/* 其实度向 */}
          <div className="mb-8">
            <h3 className="text-gray-900 mb-6" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              其实度向
            </h3>

            <div className="space-y-6">
              {metrics.map((metric, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-900" style={{ fontWeight: 600 }}>
                      {metric.name}
                    </span>
                    <span className="text-gray-900" style={{ fontWeight: 600 }}>
                      {metric.value}
                    </span>
                  </div>
                  {/* 进度条 */}
                  <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${metric.value * 100}%` }}
                      transition={{ duration: 1, delay: index * 0.2 }}
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    />
                  </div>
                  <p className="text-sm text-gray-600">{metric.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 按钮组 */}
          <div className="flex gap-4">
            <motion.button
              onClick={onContinue}
              className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-purple-700 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ fontWeight: 600 }}
            >
              继续分析 (扫接受风险)
            </motion.button>
            
            <motion.button
              onClick={onClose}
              className="flex-1 py-4 px-6 rounded-2xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ fontWeight: 600 }}
            >
              拒绝并调整并重新上传
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}