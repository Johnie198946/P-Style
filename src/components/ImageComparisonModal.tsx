import { motion, AnimatePresence } from 'motion/react';
import { X, MoveHorizontal, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';

interface ImageComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetImageUrl: string;
  userImageUrl: string;
}

export function ImageComparisonModal({
  isOpen,
  onClose,
  targetImageUrl,
  userImageUrl,
}: ImageComparisonModalProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-7xl bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-8 py-6 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
              <div>
                <h2 className="text-gray-900" style={{ fontSize: '24px', fontWeight: 700 }}>
                  图片对比
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  拖动滑块或点击切换查看两张照片
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-all text-gray-700 hover:scale-110"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Main Content */}
            <div className="p-8 bg-gray-50">
              {/* Labels */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-100 to-blue-100 border border-cyan-300">
                  <ImageIcon className="w-4 h-4 text-cyan-600" />
                  <span className="text-cyan-900 text-sm" style={{ fontWeight: 600 }}>
                    目标照片
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-gradient-to-r from-cyan-400 to-pink-400 rounded-full" />
                  <MoveHorizontal className="w-5 h-5 text-gray-400" />
                  <div className="w-8 h-0.5 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full" />
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-100 to-purple-100 border border-pink-300">
                  <ImageIcon className="w-4 h-4 text-pink-600" />
                  <span className="text-pink-900 text-sm" style={{ fontWeight: 600 }}>
                    用户照片
                  </span>
                </div>
              </div>

              {/* Image Comparison Slider */}
              <div
                className="relative aspect-video bg-white rounded-2xl overflow-hidden border-2 border-gray-300 shadow-xl cursor-col-resize"
                onMouseMove={handleMouseMove}
                onTouchMove={handleTouchMove}
                onMouseDown={() => setIsDragging(true)}
                onTouchStart={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onTouchEnd={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
              >
                {/* Target Image (Left/Background) */}
                <div className="absolute inset-0">
                  <img
                    src={targetImageUrl}
                    alt="目标照片"
                    className="w-full h-full object-contain bg-gray-100"
                  />
                  {/* Label overlay */}
                  <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-cyan-500 backdrop-blur-sm border border-cyan-400 shadow-lg">
                    <span className="text-white text-xs" style={{ fontWeight: 600 }}>
                      目标
                    </span>
                  </div>
                </div>

                {/* User Image (Right/Overlay) */}
                <div
                  className="absolute inset-0"
                  style={{
                    clipPath: `inset(0 0 0 ${sliderPosition}%)`,
                  }}
                >
                  <img
                    src={userImageUrl}
                    alt="用户照片"
                    className="w-full h-full object-contain bg-gray-100"
                  />
                  {/* Label overlay */}
                  <div className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-pink-500 backdrop-blur-sm border border-pink-400 shadow-lg">
                    <span className="text-white text-xs" style={{ fontWeight: 600 }}>
                      用户
                    </span>
                  </div>
                </div>

                {/* Slider Handle */}
                <div
                  className="absolute top-0 bottom-0 w-1 cursor-col-resize z-10"
                  style={{
                    left: `${sliderPosition}%`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  {/* Slider Line */}
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 shadow-lg" />
                  
                  {/* Slider Circle Handle */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white shadow-2xl border-4 border-purple-500 flex items-center justify-center">
                    <MoveHorizontal className="w-5 h-5 text-purple-600" />
                  </div>

                  {/* Top Arrow */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-xl border-2 border-purple-500 flex items-center justify-center">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-purple-600" />
                  </div>

                  {/* Bottom Arrow */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-xl border-2 border-purple-500 flex items-center justify-center">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-purple-600" />
                  </div>
                </div>
              </div>

              {/* Quick Switch Buttons */}
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={() => setSliderPosition(0)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white transition-all shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <span className="text-sm" style={{ fontWeight: 600 }}>仅看目标</span>
                </button>
                <button
                  onClick={() => setSliderPosition(50)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <span className="text-sm" style={{ fontWeight: 600 }}>对半比较</span>
                </button>
                <button
                  onClick={() => setSliderPosition(100)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white transition-all shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <span className="text-sm" style={{ fontWeight: 600 }}>仅看用户</span>
                </button>
              </div>

              {/* Info */}
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
                <p className="text-sm text-gray-700 text-center">
                  💡 提示：拖动中间的滑块可以精确对比两张照片的差异
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
