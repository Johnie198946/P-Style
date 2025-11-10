import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { LucideIcon } from 'lucide-react';

interface HoverTextWithIconsProps {
  text: string;
  leftIcon: LucideIcon;
  rightIcon: LucideIcon;
  accentColor?: string;
  className?: string;
}

export function HoverTextWithIcons({
  text,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  accentColor = 'blue',
  className = '',
}: HoverTextWithIconsProps) {
  const [isHovered, setIsHovered] = useState(false);

  const colorClasses: { [key: string]: string } = {
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    pink: 'text-pink-600',
    green: 'text-green-600',
    amber: 'text-amber-600',
    orange: 'text-orange-600',
    cyan: 'text-cyan-600',
  };

  const iconBgClasses: { [key: string]: string } = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    orange: 'bg-orange-500',
    cyan: 'bg-cyan-500',
  };

  const textColor = colorClasses[accentColor] || colorClasses.blue;
  const iconBg = iconBgClasses[accentColor] || iconBgClasses.blue;

  // 左侧彩色图标数据
  const leftIcons = [
    { emoji: '🎨', top: -60, left: -80, delay: 0, rotation: -15 },
    { emoji: '✨', top: -40, left: -100, delay: 0.05, rotation: 10 },
    { emoji: '🎭', top: -20, left: -90, delay: 0.1, rotation: -5 },
    { emoji: '🎪', top: 0, left: -110, delay: 0.15, rotation: 20 },
    { emoji: '🎯', top: 20, left: -95, delay: 0.2, rotation: -10 },
  ];

  // 右侧彩色图标数据
  const rightIcons = [
    { emoji: '🚀', top: -60, right: -80, delay: 0, rotation: 15 },
    { emoji: '⭐', top: -40, right: -100, delay: 0.05, rotation: -10 },
    { emoji: '💎', top: -20, right: -90, delay: 0.1, rotation: 5 },
    { emoji: '🎨', top: 0, right: -110, delay: 0.15, rotation: -20 },
    { emoji: '🌟', top: 20, right: -95, delay: 0.2, rotation: 10 },
  ];

  return (
    <span
      className={`inline-flex items-center relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Left Icon */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.5 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.5 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="inline-flex items-center justify-center mr-2"
          >
            <div className={`p-2 ${iconBg} rounded-lg shadow-lg`}>
              <LeftIcon className="w-5 h-5 text-white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Text with gradient and scale */}
      <span className="relative inline-block cursor-pointer">
        <motion.span
          className={isHovered ? "bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent" : "text-gray-900"}
          animate={{
            scale: isHovered ? 1.05 : 1,
          }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {text}
        </motion.span>
        
        {/* Underline effect */}
        <motion.div
          className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
        
        {/* Left side colorful emoji icons */}
        <AnimatePresence>
          {isHovered && leftIcons.map((item, index) => (
            <motion.div
              key={`left-${index}`}
              initial={{ 
                opacity: 0,
                scale: 0,
                x: 20,
              }}
              animate={{ 
                opacity: 1,
                scale: 1,
                x: 0,
                rotate: item.rotation,
              }}
              exit={{ 
                opacity: 0,
                scale: 0,
              }}
              transition={{
                duration: 0.4,
                delay: item.delay,
                ease: 'easeOut',
              }}
              className="absolute pointer-events-none"
              style={{ 
                top: `${item.top}px`,
                left: `${item.left}px`,
                fontSize: '24px',
              }}
            >
              {item.emoji}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Right side colorful emoji icons */}
        <AnimatePresence>
          {isHovered && rightIcons.map((item, index) => (
            <motion.div
              key={`right-${index}`}
              initial={{ 
                opacity: 0,
                scale: 0,
                x: -20,
              }}
              animate={{ 
                opacity: 1,
                scale: 1,
                x: 0,
                rotate: item.rotation,
              }}
              exit={{ 
                opacity: 0,
                scale: 0,
              }}
              transition={{
                duration: 0.4,
                delay: item.delay,
                ease: 'easeOut',
              }}
              className="absolute pointer-events-none"
              style={{ 
                top: `${item.top}px`,
                right: `${item.right}px`,
                fontSize: '24px',
              }}
            >
              {item.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </span>

      {/* Right Icon */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.5 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.5 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="inline-flex items-center justify-center ml-2"
          >
            <div className={`p-2 ${iconBg} rounded-lg shadow-lg`}>
              <RightIcon className="w-5 h-5 text-white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
