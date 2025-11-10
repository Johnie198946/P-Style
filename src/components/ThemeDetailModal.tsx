import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, Sun, Palette, Sliders, Image as ImageIcon, Sparkles } from 'lucide-react';
import { CompositionSection } from './sections/CompositionSection';
import { LightingSection } from './sections/LightingSection';
import { ColorSection } from './sections/ColorSection';
import { ReviewSection } from './sections/ReviewSection';
import { LightroomSection } from './sections/LightroomSection';
import { PhotoshopSection } from './sections/PhotoshopSection';

interface ThemeDetailModalProps {
  themeId: string | null;
  onClose: () => void;
  results: any;
  targetImageUrl: string;
  sourceImageUrl?: string;
}

const themeInfo: { [key: string]: { 
  title: string; 
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
} } = {
  review: { 
    title: '照片点评', 
    subtitle: '整体分析与专业评价',
    icon: <Sparkles className="w-7 h-7" />,
    color: 'text-amber-600',
    bgColor: 'bg-gradient-to-br from-amber-50 to-orange-50',
  },
  composition: { 
    title: '构图分析', 
    subtitle: '焦点布局与视觉引导',
    icon: <Camera className="w-7 h-7" />,
    color: 'text-blue-600',
    bgColor: 'bg-gradient-to-br from-blue-50 to-cyan-50',
  },
  lighting: { 
    title: '光影参数', 
    subtitle: '曝光对比与明暗层次',
    icon: <Sun className="w-7 h-7" />,
    color: 'text-orange-600',
    bgColor: 'bg-gradient-to-br from-orange-50 to-yellow-50',
  },
  color: { 
    title: '色彩方案', 
    subtitle: '色调饱和与色彩搭配',
    icon: <Palette className="w-7 h-7" />,
    color: 'text-purple-600',
    bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50',
  },
  lightroom: { 
    title: 'Lightroom', 
    subtitle: 'Adobe LR 专业调整方案',
    icon: <Sliders className="w-7 h-7" />,
    color: 'text-cyan-600',
    bgColor: 'bg-gradient-to-br from-cyan-50 to-teal-50',
  },
  photoshop: { 
    title: 'Photoshop', 
    subtitle: 'Adobe PS 后期处理方案',
    icon: <ImageIcon className="w-7 h-7" />,
    color: 'text-indigo-600',
    bgColor: 'bg-gradient-to-br from-indigo-50 to-blue-50',
  },
};

export function ThemeDetailModal({
  themeId,
  onClose,
  results,
  targetImageUrl,
  sourceImageUrl,
}: ThemeDetailModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (themeId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [themeId]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const renderContent = () => {
    if (!themeId) return null;

    switch (themeId) {
      case 'composition':
        return <CompositionSection data={results?.composition} />;
      case 'lighting':
        return <LightingSection data={results?.lighting} />;
      case 'color':
        return <ColorSection data={results?.color} />;
      case 'lightroom':
        return (
          <LightroomSection 
            data={results?.lightroom} 
            targetImageUrl={sourceImageUrl}
            userImageUrl={targetImageUrl}
            reviewData={results?.review?.emotion || ''}
            conversionData={results?.lightroom_extra}
          />
        );
      case 'photoshop':
        return (
          <PhotoshopSection 
            data={results?.photoshop}
            targetImageUrl={sourceImageUrl}
            userImageUrl={targetImageUrl}
          />
        );
      case 'review':
        return <ReviewSection data={results?.review} />;
      default:
        return null;
    }
  };

  const info = themeId ? themeInfo[themeId] : null;

  return (
    <AnimatePresence>
      {themeId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{
                type: 'spring',
                damping: 25,
                stiffness: 300,
              }}
              className="relative w-full max-w-5xl max-h-[75vh] bg-white rounded-3xl shadow-2xl overflow-hidden pointer-events-auto"
            >
              {/* Header with Title */}
              <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xl border-b border-gray-200">
                <div className="px-8 py-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Icon and Title */}
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ 
                          type: 'spring',
                          damping: 15,
                          stiffness: 200,
                          delay: 0.1
                        }}
                        className={`flex-shrink-0 w-16 h-16 ${info?.bgColor} rounded-2xl flex items-center justify-center ${info?.color} shadow-sm`}
                      >
                        {info?.icon}
                      </motion.div>

                      {/* Title and Subtitle */}
                      <div>
                        <motion.h2
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                          className="text-gray-900"
                          style={{ fontSize: '24px', fontWeight: 700, lineHeight: '32px' }}
                        >
                          {info?.title}
                        </motion.h2>
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="text-gray-500 mt-0.5"
                          style={{ fontSize: '14px', fontWeight: 400 }}
                        >
                          {info?.subtitle}
                        </motion.p>
                      </div>
                    </div>

                    {/* Close Button */}
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      onClick={onClose}
                      className="flex-shrink-0 p-2 rounded-xl hover:bg-gray-100 transition-colors group"
                    >
                      <X className="w-6 h-6 text-gray-400 group-hover:text-gray-900 transition-colors" />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(75vh-140px)]">
                <div className="px-8 py-6">
                  {renderContent()}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
