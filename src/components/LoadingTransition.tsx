import { motion } from 'motion/react';
import { Sparkles, Palette, Sliders, ImageIcon } from 'lucide-react';
import { useEffect } from 'react';

interface LoadingTransitionProps {
  section?: string;
  onComplete?: () => void;
}

export function LoadingTransition({ section, onComplete }: LoadingTransitionProps) {
  // Auto-complete after 2.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);
  // 根据不同section显示不同的标题和描述
  const getSectionInfo = () => {
    switch (section) {
      case 'color':
        return {
          title: 'AI 色彩分析中',
          subtitle: '正在生成HSL调整方案...',
          steps: ['分析主色调', '计算饱和度', '生成调整参数']
        };
      case 'lightroom':
        return {
          title: 'Lightroom 方案生成中',
          subtitle: '正在计算专业调色参数...',
          steps: ['基础调整分析', '曲线计算', 'HSL参数生成']
        };
      case 'photoshop':
        return {
          title: 'Photoshop 方案生成中',
          subtitle: '正在创建后期处理流程...',
          steps: ['图层规划', '蒙版方案', '滤镜参数']
        };
      case 'detailed':
        return {
          title: 'AI 深度分析中',
          subtitle: '正在生成完整的专业调色方案...',
          steps: ['色彩方案', 'Lightroom 参数', 'Photoshop 流程']
        };
      default:
        return {
          title: 'AI 深度分析中',
          subtitle: '正在生成完整的专业调色方案...',
          steps: ['色彩方案', 'Lightroom 参数', 'Photoshop 流程']
        };
    }
  };

  const sectionInfo = getSectionInfo();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
    >
      {/* Background with blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-gradient-to-br from-gray-900/95 via-purple-900/95 to-indigo-900/95 backdrop-blur-xl"
      />
      
      {/* Content container */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden z-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: 0,
            }}
            animate={{
              x: [
                Math.random() * window.innerWidth,
                Math.random() * window.innerWidth,
                Math.random() * window.innerWidth,
              ],
              y: [
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight,
              ],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: Math.random() * 2,
            }}
            className="absolute w-1 h-1 bg-white rounded-full"
          />
        ))}
      </div>

      {/* Center content */}
      <div className="relative z-20 flex flex-col items-center gap-8">
        {/* Animated icons */}
        <div className="relative">
          {/* Center glow */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full blur-3xl"
          />

          {/* Rotating icons */}
          <div className="relative w-48 h-48">
            {/* Color icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: 1, 
                rotate: 0,
                y: [0, -10, 0],
              }}
              transition={{
                scale: { type: 'spring', damping: 12, delay: 0.2 },
                rotate: { type: 'spring', damping: 12, delay: 0.2 },
                y: {
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.2,
                },
              }}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-2xl"
            >
              <Palette className="w-7 h-7 text-white" />
            </motion.div>

            {/* Lightroom icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: 1, 
                rotate: 0,
                y: [0, -10, 0],
              }}
              transition={{
                scale: { type: 'spring', damping: 12, delay: 0.4 },
                rotate: { type: 'spring', damping: 12, delay: 0.4 },
                y: {
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.6,
                },
              }}
              className="absolute bottom-4 left-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-2xl"
            >
              <Sliders className="w-7 h-7 text-white" />
            </motion.div>

            {/* Photoshop icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: 1, 
                rotate: 0,
                y: [0, -10, 0],
              }}
              transition={{
                scale: { type: 'spring', damping: 12, delay: 0.6 },
                rotate: { type: 'spring', damping: 12, delay: 0.6 },
                y: {
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 1,
                },
              }}
              className="absolute bottom-4 right-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-2xl"
            >
              <ImageIcon className="w-7 h-7 text-white" />
            </motion.div>

            {/* Center sparkle */}
            <motion.div
              animate={{
                rotate: 360,
                scale: [1, 1.1, 1],
              }}
              transition={{
                rotate: {
                  duration: 8,
                  repeat: Infinity,
                  ease: 'linear',
                },
                scale: {
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                },
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-white to-purple-200 flex items-center justify-center shadow-2xl"
            >
              <Sparkles className="w-10 h-10 text-purple-600" />
            </motion.div>
          </div>
        </div>

        {/* Text content */}
        <div className="text-center space-y-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, type: 'spring', damping: 20 }}
            className="text-white"
            style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            {sectionInfo.title}
          </motion.h2>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, type: 'spring', damping: 20 }}
            className="space-y-2"
          >
            <p className="text-purple-200" style={{ fontSize: '16px', fontWeight: 400 }}>
              {sectionInfo.subtitle}
            </p>
            
            {/* Progress steps */}
            <div className="flex items-center justify-center gap-4 mt-6">
              {sectionInfo.steps.map((step, index) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 1.2 + index * 0.2,
                    type: 'spring',
                    damping: 15,
                  }}
                  className="flex items-center gap-2"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: index * 0.3,
                    }}
                    className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
                  />
                  <span className="text-sm text-purple-300">{step}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Loading bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.8 }}
            className="relative w-64 h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm mx-auto mt-8"
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
            />
          </motion.div>
        </div>

        {/* Completion trigger - hidden but calls onComplete */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 3.5 }}
          onAnimationComplete={() => {
            console.log('Loading animation complete, calling onComplete');
            onComplete?.();
          }}
          className="absolute inset-0 pointer-events-none"
        />
        
        {/* Completion visual effect */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.5, 0] }}
            transition={{ delay: 3, duration: 0.6 }}
            className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm"
          />
        </motion.div>
      </div>
      </div>
    </motion.div>
  );
}
