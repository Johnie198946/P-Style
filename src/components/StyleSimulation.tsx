import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share2, ArrowLeftRight, Sparkles, RotateCcw, Zap, ArrowLeft } from 'lucide-react';

interface StyleSimulationProps {
  isOpen: boolean;
  onClose: () => void;
  sourceImageUrl: string;
  targetImageUrl: string;
  taskId?: string;
}

export function StyleSimulation({ isOpen, onClose, sourceImageUrl, targetImageUrl, taskId }: StyleSimulationProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && taskId) {
      handleSimulate();
    }
  }, [isOpen, taskId]);

  const handleSimulate = async () => {
    if (!taskId) {
      setError('缺少任务 ID');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { simulateApi } = await import('../lib/api');
      const result = await simulateApi.simulateStyle(taskId);
      setProcessedImage(result.processedImage);
      setIsProcessing(false);
    } catch (error: any) {
      console.error('Style simulation failed:', error);
      setError(error.message || '风格模拟失败');
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    const imageUrl = processedImage || targetImageUrl;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'style-cloned-photo.jpg';
    link.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '风格模拟结果',
          text: '查看我的照片风格克隆结果！',
        });
      } catch (error) {
        // 分享功能失败，静默处理（不影响主流程）
        // 可以在这里添加错误日志记录
      }
    }
  };

  const handleSliderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const updateSlider = (moveEvent: MouseEvent) => {
      const container = e.currentTarget.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        const x = moveEvent.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPosition(percentage);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', updateSlider);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', updateSlider);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleReset = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setSliderPosition(50);
    }, 3000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[300]"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[301] flex items-center justify-center p-4">
            <AnimatePresence mode="wait">
              {isProcessing ? (
                /* Loading State */
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  className="relative w-full max-w-2xl bg-white rounded-[28px] shadow-2xl overflow-hidden"
                >
                  {/* Close Button */}
                  <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 rounded-xl hover:bg-gray-100 transition-colors group z-10"
                  >
                    <X className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
                  </button>

                  {/* Content */}
                  <div className="px-10 py-16">
                    {/* Loading Animation */}
                    <div className="flex justify-center mb-8">
                      <div className="relative">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                          className="w-24 h-24"
                        >
                          <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 border-r-purple-500" />
                        </motion.div>
                        <motion.div
                          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <Sparkles className="w-10 h-10 text-indigo-600" />
                        </motion.div>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="text-center space-y-3 mb-8">
                      <h3 className="text-gray-900" style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                        AI 正在施展魔法
                      </h3>
                      <p className="text-gray-500" style={{ fontSize: '15px', fontWeight: 400, lineHeight: '1.6' }}>
                        正在分析色彩、光影、对比度等风格特征<br/>为你的照片注入全新的艺术灵魂...
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="max-w-md mx-auto mb-10">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"
                          initial={{ x: '-100%' }}
                          animate={{ x: '100%' }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                        />
                      </div>
                    </div>

                    {/* Preview Images */}
                    <div className="grid grid-cols-2 gap-6 max-w-xl mx-auto">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-3"
                      >
                        <p className="text-center text-gray-600" style={{ fontSize: '13px', fontWeight: 500 }}>
                          源照片风格
                        </p>
                        <div className="relative rounded-2xl overflow-hidden shadow-lg border border-gray-200">
                          <img
                            src={sourceImageUrl}
                            alt="源照片"
                            className="w-full h-56 object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="space-y-3"
                      >
                        <p className="text-center text-gray-600" style={{ fontSize: '13px', fontWeight: 500 }}>
                          目标照片
                        </p>
                        <div className="relative rounded-2xl overflow-hidden shadow-lg border border-gray-200">
                          <img
                            src={targetImageUrl}
                            alt="目标照片"
                            className="w-full h-56 object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        </div>
                      </motion.div>
                    </div>

                    {/* Processing Steps */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="mt-8 flex items-center justify-center gap-6 text-gray-400"
                    >
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                        className="flex items-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        <span style={{ fontSize: '12px', fontWeight: 500 }}>色彩分析</span>
                      </motion.div>
                      <div className="w-1 h-1 rounded-full bg-gray-300" />
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                        className="flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span style={{ fontSize: '12px', fontWeight: 500 }}>风格迁移</span>
                      </motion.div>
                      <div className="w-1 h-1 rounded-full bg-gray-300" />
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                        className="flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span style={{ fontSize: '12px', fontWeight: 500 }}>细节优化</span>
                      </motion.div>
                    </motion.div>
                  </div>
                </motion.div>
              ) : (
                /* Result Comparison */
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  className="relative w-full max-w-4xl bg-white rounded-[28px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                >
                  {/* Header */}
                  <div className="flex-shrink-0 bg-white/95 backdrop-blur-xl border-b border-gray-200">
                    <div className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-gray-900" style={{ fontSize: '18px', fontWeight: 600 }}>
                            风格模拟完成
                          </h2>
                          <p className="text-gray-500" style={{ fontSize: '12px', fontWeight: 400 }}>
                            拖动滑块对比原图和处理后的效果
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-gray-100 transition-colors group"
                      >
                        <X className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
                      </button>
                    </div>
                  </div>

                  {/* Content - 可滚动 */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {/* Comparison Slider */}
                    <div className="relative max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-2xl mb-6">
                      <div className="relative aspect-[16/10] bg-gray-100">
                        {/* Original Image */}
                        <div className="absolute inset-0">
                          <img
                            src={targetImageUrl}
                            alt="原始照片"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Processed Image with Clip */}
                        {processedImage && (
                          <div
                            className="absolute inset-0 transition-all"
                            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                          >
                            <img
                              src={processedImage}
                              alt="处理后"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Slider Handle */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-white cursor-ew-resize shadow-2xl z-10"
                          style={{ left: `${sliderPosition}%` }}
                          onMouseDown={handleSliderMouseDown}
                        >
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center border-4 border-white hover:scale-110 transition-transform">
                            <ArrowLeftRight className="w-4 h-4 text-gray-700" />
                          </div>
                        </div>

                        {/* Labels */}
                        <div className="absolute top-3 left-3 px-3 py-1.5 bg-black/70 backdrop-blur-sm rounded-lg">
                          <p className="text-white" style={{ fontSize: '12px', fontWeight: 500 }}>原图</p>
                        </div>
                        <div className="absolute top-3 right-3 px-3 py-1.5 bg-black/70 backdrop-blur-sm rounded-lg">
                          <p className="text-white" style={{ fontSize: '12px', fontWeight: 500 }}>风格模拟</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer - 操作按钮 */}
                  <div className="flex-shrink-0 bg-gradient-to-t from-gray-50 to-white border-t border-gray-200 px-6 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {/* 左侧：返回按钮 */}
                      <button
                        onClick={onClose}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl transition-all"
                        style={{ fontSize: '14px', fontWeight: 500 }}
                      >
                        <ArrowLeft className="w-4 h-4" />
                        返回上一步
                      </button>
                      
                      {/* 右侧：操作按钮组 */}
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={handleReset}
                          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl transition-all"
                          style={{ fontSize: '14px', fontWeight: 500 }}
                        >
                          <RotateCcw className="w-4 h-4" />
                          重新处理
                        </button>
                        <button
                          onClick={handleShare}
                          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl transition-all"
                          style={{ fontSize: '14px', fontWeight: 500 }}
                        >
                          <Share2 className="w-4 h-4" />
                          分享
                        </button>
                        <button
                          onClick={handleDownload}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl"
                          style={{ fontSize: '14px', fontWeight: 600 }}
                        >
                          <Download className="w-4 h-4" />
                          下载结果
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}