import { motion } from 'motion/react';
import { HelpCircle } from 'lucide-react';

interface GlowCardProps {
  className?: string;
}

export function GlowCard({ className = '' }: GlowCardProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Outer glow container */}
      <div className="relative p-8">
        {/* Animated blue glow */}
        <motion.div
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 bg-gradient-to-br from-blue-400 via-blue-300 to-purple-400 blur-3xl rounded-full"
          style={{ filter: 'blur(60px)' }}
        />
        
        {/* Card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="relative bg-white rounded-3xl p-12 shadow-xl"
        >
          {/* Icon with gradient background */}
          <div className="flex items-center justify-center">
            <div className="relative">
              {/* Icon glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 blur-xl opacity-40 rounded-full" />
              
              {/* Icon */}
              <div className="relative flex items-center justify-center w-32 h-32 bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl">
                <HelpCircle className="w-16 h-16 text-blue-500" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
