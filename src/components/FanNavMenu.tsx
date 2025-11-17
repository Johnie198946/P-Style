import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, LogIn } from 'lucide-react';

interface FanNavMenuProps {
  onSubscribe?: () => void;
  onLogin?: () => void;
}

export function FanNavMenu({ onSubscribe, onLogin }: FanNavMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div 
      className="fixed top-6 right-6 z-50"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="relative w-16 h-16">

        {/* 订阅按钮 */}
        <AnimatePresence>
          {isExpanded && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, x: 0 }}
              animate={{ opacity: 1, scale: 1, x: -100 }}
              exit={{ opacity: 0, scale: 0.5, x: 0 }}
              transition={{ 
                duration: 0.3, 
                ease: [0.4, 0, 0.2, 1],
                delay: 0.05 
              }}
              onClick={onSubscribe}
              className="absolute top-1/2 right-1/2 -translate-y-1/2 group"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-white border border-gray-200/60 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:border-indigo-200 transition-all">
                  <Bell className="w-5 h-5 text-gray-600 group-hover:text-indigo-600 transition-colors" strokeWidth={2} />
                </div>
                
                {/* Tooltip */}
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                >
                  <div className="px-2.5 py-1 rounded-lg bg-gray-900 text-white text-xs">
                    订阅
                  </div>
                </motion.div>
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* 登录按钮 */}
        <AnimatePresence>
          {isExpanded && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, x: 0 }}
              animate={{ opacity: 1, scale: 1, x: -180 }}
              exit={{ opacity: 0, scale: 0.5, x: 0 }}
              transition={{ 
                duration: 0.3, 
                ease: [0.4, 0, 0.2, 1],
                delay: 0.1 
              }}
              onClick={onLogin}
              className="absolute top-1/2 right-1/2 -translate-y-1/2 group"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:from-indigo-600 group-hover:to-purple-700 transition-all">
                  <LogIn className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                
                {/* Tooltip */}
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                >
                  <div className="px-2.5 py-1 rounded-lg bg-gray-900 text-white text-xs">
                    登录
                  </div>
                </motion.div>
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* 主触发按钮 */}
        <motion.div
          className="absolute top-1/2 right-1/2 -translate-y-1/2 translate-x-1/2"
          animate={{ 
            scale: isExpanded ? 0.9 : 1,
            rotate: isExpanded ? 180 : 0
          }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-white to-gray-50 border border-gray-200/80 shadow-lg hover:shadow-xl transition-shadow cursor-pointer flex items-center justify-center group">
            {/* 装饰性渐变边框 */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* 图标 */}
            <div className="relative">
              <motion.div
                animate={{ rotate: isExpanded ? 0 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-700">
                  <circle cx="12" cy="6" r="2" fill="currentColor" />
                  <circle cx="6" cy="12" r="2" fill="currentColor" />
                  <circle cx="18" cy="12" r="2" fill="currentColor" />
                  <circle cx="12" cy="18" r="2" fill="currentColor" />
                </svg>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}