import { motion } from 'motion/react';
import { useState } from 'react';

interface NavCardProps {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  isActive: boolean;
  onClick: () => void;
  index: number;
}

export function NavCard({
  id,
  title,
  subtitle,
  icon,
  color,
  gradient,
  isActive,
  onClick,
  index,
}: NavCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex-shrink-0 group relative snap-start"
      style={{ width: '320px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.button
        onClick={onClick}
        className="relative w-full"
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <div
          className={`relative h-40 rounded-3xl overflow-hidden transition-all duration-300 ${
            isActive
              ? 'bg-white shadow-2xl ring-2 ring-purple-500/20'
              : 'bg-white shadow-lg hover:shadow-xl'
          }`}
        >
          {/* 背景渐变装饰 */}
          <div className="absolute inset-0 opacity-[0.03]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, rgb(0 0 0) 1px, transparent 0)`,
                backgroundSize: '32px 32px',
              }}
            />
          </div>

          {/* 顶部装饰线 */}
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

          {/* Content */}
          <div className="relative h-full flex flex-col p-6">
            {/* Icon area */}
            <div className="flex items-start justify-between mb-auto">
              <motion.div
                animate={{
                  scale: isHovered ? 1.1 : 1,
                  rotate: isHovered ? [0, -10, 10, 0] : 0,
                }}
                transition={{ 
                  scale: { type: 'spring', stiffness: 400, damping: 15 },
                  rotate: { duration: 0.6 }
                }}
                className={`p-3 rounded-2xl transition-all duration-300 ${
                  isActive || isHovered
                    ? `${color} bg-gradient-to-br ${gradient}`
                    : 'text-gray-400 bg-gray-50'
                }`}
              >
                {icon}
              </motion.div>

              {isActive && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="px-3 py-1.5 rounded-full text-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                >
                  当前
                </motion.div>
              )}
            </div>

            {/* Text area */}
            <div className="space-y-1">
              <motion.h3
                className="transition-all duration-300 relative inline-block"
                animate={{
                  backgroundImage: isHovered
                    ? 'linear-gradient(135deg, rgb(99, 102, 241) 0%, rgb(168, 85, 247) 100%)'
                    : 'none',
                  WebkitBackgroundClip: isHovered ? 'text' : 'unset',
                  WebkitTextFillColor: isHovered ? 'transparent' : 'rgb(17, 24, 39)',
                  backgroundClip: isHovered ? 'text' : 'unset',
                }}
                transition={{ duration: 0.3 }}
              >
                {title}
              </motion.h3>
              <p className="text-sm text-gray-500">{subtitle}</p>
            </div>
          </div>

          {/* 底部蓝紫色渐变光效 */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="absolute inset-0 bg-gradient-to-t from-blue-500/20 via-purple-500/10 to-transparent blur-xl"
              style={{
                maskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />
          </motion.div>

          {/* Active state indicator */}
          {isActive && (
            <motion.div
              layoutId="activeIndicator"
              className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
        </div>
      </motion.button>
    </motion.div>
  );
}
