import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { FloatingHeroIcons } from './FloatingHeroIcons';
import { RegisterDialog } from './RegisterDialog';
import { LoginDialog } from './LoginDialog';
import { contentStore } from '../lib/contentStore';
import { Camera, Aperture, Image as ImageIcon, Palette, Paintbrush, Sparkles, Wand2, Droplet, Sun, Layers, Crop, Film } from 'lucide-react';

interface ScrollableHeroProps {
  children: React.ReactNode;
}

export function ScrollableHero({ children }: ScrollableHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [hasTriggeredRegister, setHasTriggeredRegister] = useState(false);
  
  // 从内容管理系统加载 Hero 内容
  const [heroContent, setHeroContent] = useState({
    title: '照片风格',
    subtitle: '克隆工具',
    description: '上传参考照片和目标照片，AI 将智能分析并生成专业的 Photoshop 和 Camera Raw 调整方案'
  });

  useEffect(() => {
    const loadHeroContent = () => {
      const content = contentStore.getContentByType('hero', 'home');
      if (content && content[0]) {
        setHeroContent({
          title: content[0].title,
          subtitle: content[0].subtitle || '',
          description: content[0].description || ''
        });
        console.log('🎨 Hero - 加载内容:', content[0]);
      }
    };

    loadHeroContent();
    const unsubscribe = contentStore.subscribe(loadHeroContent);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const maxScroll = 500; // 滚动500px时完成过渡
      const progress = Math.min(scrollTop / maxScroll, 1);
      setScrollProgress(progress);

      // 检查用户是否已登录
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      
      // 当滚动超过200px且未触发过注册弹窗且未登录时，弹出注册对话框
      if (scrollTop > 200 && !hasTriggeredRegister && !isLoggedIn) {
        setShowRegisterDialog(true);
        setHasTriggeredRegister(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasTriggeredRegister]);

  // 原地渐隐消失
  const heroOpacity = 1 - scrollProgress;
  // 原地渐现出现
  const uploadOpacity = scrollProgress;

  const handleSwitchToLogin = () => {
    setShowRegisterDialog(false);
    setShowLoginDialog(true);
  };

  const handleSwitchToRegister = () => {
    setShowLoginDialog(false);
    setShowRegisterDialog(true);
  };

  return (
    <>
      <div ref={containerRef} className="relative bg-white">
      {/* Hero Section - 原地渐隐，使用fixed定位固定位置 */}
      <div className="min-h-screen flex items-center justify-center relative" style={{ minHeight: '100vh' }}>
        <motion.div
          style={{ 
            opacity: heroOpacity,
            pointerEvents: scrollProgress > 0.5 ? 'none' : 'auto'
          }}
          className="fixed inset-0 flex items-center justify-center z-10 overflow-y-auto"
        >
          <div className="container mx-auto px-4 max-w-7xl">
          <FloatingHeroIcons>
            <div className="text-center flex flex-col min-h-screen">
              <div className="flex-1 flex flex-col justify-center space-y-8 pt-20">
                {/* 主标题 - 适中字体大小 */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-1"
                >
                  {heroContent.title && (
                    <h1 
                      className="text-gray-900 leading-tight"
                      style={{ 
                        fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                        fontWeight: 800,
                        letterSpacing: '-0.03em'
                      }}
                    >
                      {heroContent.title}
                    </h1>
                  )}
                  {heroContent.subtitle && (
                    <h1 
                      className="text-gray-900 leading-tight"
                      style={{ 
                        fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                        fontWeight: 800,
                        letterSpacing: '-0.03em'
                      }}
                    >
                      {heroContent.subtitle}
                    </h1>
                  )}
                </motion.div>

                {/* 描述文字 - 苹果风格，细字体，更小 */}
                {heroContent.description && (
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-gray-600 max-w-2xl mx-auto pt-4"
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif',
                      fontSize: '15px',
                      fontWeight: 400,
                      lineHeight: '1.5'
                    }}
                  >
                    {heroContent.description}
                  </motion.p>
                )}
              </div>

              {/* 滚动提示 - 固定在最底部 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="pb-12"
              >
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="inline-flex flex-col items-center gap-2 text-gray-400"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                  </svg>
                  <span className="text-sm">向下滚动开始</span>
                </motion.div>
              </motion.div>
            </div>
          </FloatingHeroIcons>
          </div>
        </motion.div>

        {/* Upload Section - 原地渐现（fixed定位在同一位置）*/}
        <motion.div
          style={{ 
            opacity: uploadOpacity,
            pointerEvents: scrollProgress >= 0.5 ? 'auto' : 'none'
          }}
          className="fixed inset-0 flex items-center justify-center z-20 overflow-y-auto"
        >
          <div className="container mx-auto px-4 max-w-6xl w-full py-20">
            {children}
          </div>
        </motion.div>
      </div>
      
        {/* 额外的空间用于滚动 */}
        <div style={{ height: '600px' }} />
      </div>

      {/* 注册对话框 */}
      <RegisterDialog 
        isOpen={showRegisterDialog} 
        onClose={() => setShowRegisterDialog(false)}
        onSwitchToLogin={handleSwitchToLogin}
      />

      {/* 登录对话框 */}
      <LoginDialog 
        isOpen={showLoginDialog} 
        onClose={() => setShowLoginDialog(false)}
      />
    </>
  );
}
