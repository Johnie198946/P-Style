import { motion } from 'motion/react';
import { Sparkles, Camera, Palette, Sun, Zap } from 'lucide-react';

export function AnalysisLoading() {
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
        className="absolute inset-0 bg-gradient-to-br from-blue-900/95 via-purple-900/95 to-pink-900/95 backdrop-blur-xl"
      />
      
      {/* Content container */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden z-0">
          {[...Array(30)].map((_, i) => (
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
                opacity: [0, 0.8, 0],
              }}
              transition={{
                duration: Math.random() * 4 + 3,
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
          {/* Animated icons circle */}
          <div className="relative">
            {/* Center glow */}
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 bg-gradient-to-br from-blue-400 to-pink-400 rounded-full blur-3xl"
            />

            {/* Rotating icons container */}
            <div className="relative w-56 h-56">
              {/* Camera icon - Top */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ 
                  scale: 1, 
                  rotate: 0,
                  y: [0, -12, 0],
                }}
                transition={{
                  scale: { type: 'spring', damping: 12, delay: 0.1 },
                  rotate: { type: 'spring', damping: 12, delay: 0.1 },
                  y: {
                    duration: 2.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0,
                  },
                }}
                className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-2xl"
              >
                <Camera className="w-8 h-8 text-white" />
              </motion.div>

              {/* Sun icon - Right */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ 
                  scale: 1, 
                  rotate: 0,
                  x: [0, 12, 0],
                }}
                transition={{
                  scale: { type: 'spring', damping: 12, delay: 0.3 },
                  rotate: { type: 'spring', damping: 12, delay: 0.3 },
                  x: {
                    duration: 2.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.5,
                  },
                }}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center shadow-2xl"
              >
                <Sun className="w-8 h-8 text-white" />
              </motion.div>

              {/* Palette icon - Bottom */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ 
                  scale: 1, 
                  rotate: 0,
                  y: [0, 12, 0],
                }}
                transition={{
                  scale: { type: 'spring', damping: 12, delay: 0.5 },
                  rotate: { type: 'spring', damping: 12, delay: 0.5 },
                  y: {
                    duration: 2.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 1,
                  },
                }}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-2xl"
              >
                <Palette className="w-8 h-8 text-white" />
              </motion.div>

              {/* Zap icon - Left */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ 
                  scale: 1, 
                  rotate: 0,
                  x: [0, -12, 0],
                }}
                transition={{
                  scale: { type: 'spring', damping: 12, delay: 0.7 },
                  rotate: { type: 'spring', damping: 12, delay: 0.7 },
                  x: {
                    duration: 2.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 1.5,
                  },
                }}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-2xl"
              >
                <Zap className="w-8 h-8 text-white" />
              </motion.div>

              {/* Center sparkle */}
              <motion.div
                animate={{
                  rotate: 360,
                  scale: [1, 1.15, 1],
                }}
                transition={{
                  rotate: {
                    duration: 10,
                    repeat: Infinity,
                    ease: 'linear',
                  },
                  scale: {
                    duration: 2.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-gradient-to-br from-white to-blue-200 flex items-center justify-center shadow-2xl"
              >
                <Sparkles className="w-12 h-12 text-blue-600" />
              </motion.div>
            </div>
          </div>

          {/* Text content */}
          <div className="text-center space-y-4">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, type: 'spring', damping: 20 }}
              className="text-white"
              style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              AI 正在分析照片风格
            </motion.h2>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, type: 'spring', damping: 20 }}
              className="space-y-3"
            >
              <p className="text-blue-200" style={{ fontSize: '16px', fontWeight: 400 }}>
                正在识别色彩、光影、构图与风格特征...
              </p>
              
              {/* Progress steps */}
              <div className="flex items-center justify-center gap-4 mt-6">
                {['分析构图', '识别色彩', '提取光影'].map((step, index) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: 1.3 + index * 0.2,
                      type: 'spring',
                      damping: 15,
                    }}
                    className="flex items-center gap-2"
                  >
                    <motion.div
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        delay: index * 0.4,
                      }}
                      className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-pink-400"
                    />
                    <span className="text-sm text-blue-300">{step}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Loading bar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.9 }}
              className="relative w-72 h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm mx-auto mt-8"
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
        </div>
      </div>
    </motion.div>
  );
}
