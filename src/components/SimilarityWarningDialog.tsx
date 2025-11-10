import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ChevronDown, Info, X, RotateCcw } from 'lucide-react';
import { useState } from 'react';

interface SimilarityWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  similarity: number;
  onContinue: () => void;
}

export function SimilarityWarningDialog({ 
  open, 
  onOpenChange, 
  similarity,
  onContinue 
}: SimilarityWarningDialogProps) {
  const [showDetails, setShowDetails] = useState(false);

  const handleContinue = () => {
    onContinue();
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 模糊背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
          />

          {/* 模态框内容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
            className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100/80 hover:bg-gray-200/80 flex items-center justify-center transition-colors z-10"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>

            <div className="p-8">
              {/* 警告图标和标题 */}
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1, stiffness: 200, damping: 15 }}
                  className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 items-center justify-center mb-4"
                >
                  <AlertTriangle className="w-8 h-8 text-amber-600" />
                </motion.div>
                
                <h2 className="text-gray-900 text-xl mb-2">
                  检测到相似图片警告
                </h2>
                <p className="text-gray-500 text-sm">
                  两张图片相似度过高，可能影响 AI 智能分析效果
                </p>
              </div>

              {/* 相似度展示 */}
              <div className="mb-6 p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100/50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">相似度算法</div>
                    <div className="text-gray-900">SSIM（结构相似性）</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">检测结果</div>
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-3xl bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent"
                    >
                      {similarity}%
                    </motion.div>
                  </div>
                </div>

                {/* 进度条 */}
                <div className="relative h-2 bg-white/60 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${similarity}%` }}
                    transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                  />
                </div>
              </div>

              {/* 详细信息（可展开） */}
              <div className="mb-6">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50/80 hover:bg-gray-100/80 rounded-xl transition-colors group"
                >
                  <span className="text-gray-700 text-sm">查看算法详情</span>
                  <motion.div
                    animate={{ rotate: showDetails ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 p-4 bg-gray-50/50 rounded-xl">
                        <div className="space-y-3 text-sm">
                          <div>
                            <div className="text-gray-500 mb-1">算法标准</div>
                            <div className="text-gray-700">结构相似性指数（SSIM）</div>
                          </div>
                          <div>
                            <div className="text-gray-500 mb-1">阈值设定</div>
                            <div className="text-gray-700">建议相似度 {'<'} 85%</div>
                          </div>
                          <div>
                            <div className="text-gray-500 mb-1">评估维度</div>
                            <div className="text-gray-700">亮度、对比度、结构</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 提示信息 */}
              <div className="mb-6 p-4 bg-blue-50/80 rounded-xl flex items-start gap-3 border border-blue-100/50">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Info className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-blue-900 mb-1 text-sm">建议</div>
                  <p className="text-sm text-blue-700/90 leading-relaxed">
                    建议重新选择差异化更大的对比照片，以确保分析的准确性和有效性
                  </p>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3">
                {/* 重新设计的"重新选择"按钮 */}
                <motion.button
                  onClick={() => onOpenChange(false)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 hover:from-gray-200 hover:to-gray-100 border border-gray-300 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2 text-gray-700 group-hover:text-gray-900">
                    <motion.span
                      animate={{ rotate: [0, -15, 15, 0] }}
                      transition={{ 
                        duration: 0.5,
                        repeat: Infinity,
                        repeatDelay: 2
                      }}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </motion.span>
                    重新选择
                  </span>
                  {/* 悬停光效 */}
                  <motion.div
                    initial={{ x: '-100%', opacity: 0 }}
                    whileHover={{ x: '100%', opacity: [0, 0.3, 0] }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
                  />
                </motion.button>

                {/* 继续分析按钮 */}
                <motion.button
                  onClick={handleContinue}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    继续分析
                    <motion.span
                      animate={{ x: [0, 3, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      →
                    </motion.span>
                  </span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
