import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { FloatingHeroIcons } from './FloatingHeroIcons';
import { FanNavMenu } from './FanNavMenu';
import { RegisterDialog } from './RegisterDialog';
import { LoginDialog } from './LoginDialog';
import { contentStore } from '../lib/contentStore';
import { Camera, Aperture, Image as ImageIcon, Palette, Paintbrush, Sparkles, Wand2, Droplet, Sun, Layers, Crop, Film } from 'lucide-react';

interface ScrollableHeroProps {
  children: React.ReactNode;
  onNavigate?: (page: string) => void;
}

export function ScrollableHero({ children, onNavigate }: ScrollableHeroProps) {
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
      
      // 检查用户是否已登录
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      
      // 根据注册登录与权限设计方案第 1.1 节：当滚动超过200px且未登录时，弹出注册对话框
      // 如果未登录，阻止滚动进度继续增加，直到用户登录
      if (!isLoggedIn && scrollTop > 200 && !hasTriggeredRegister) {
        // 弹出注册对话框
        setShowRegisterDialog(true);
        setHasTriggeredRegister(true);
        // 阻止滚动，保持进度在 0.4（200px/500px），不显示上传区域
        setScrollProgress(0.4);
        return;
      }
      
      // 已登录用户或未触发注册弹窗时，正常更新滚动进度
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasTriggeredRegister]);

  // 检查用户是否已登录（用于控制上传区域的显示）
  const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('isLoggedIn') === 'true';

  // 原地渐隐消失
  const heroOpacity = 1 - scrollProgress;
  // 原地渐现出现
  // 根据注册登录与权限设计方案：未登录时，即使滚动也不显示上传区域
  const uploadOpacity = isLoggedIn ? scrollProgress : 0;

  const handleSwitchToLogin = () => {
    setShowRegisterDialog(false);
    setShowLoginDialog(true);
  };

  const handleSwitchToRegister = () => {
    setShowLoginDialog(false);
    setShowRegisterDialog(true);
  };

  const handleScrollToUpload = () => {
    window.scrollTo({ top: 600, behavior: 'smooth' });
  };

  return (
    <>
      {/* 流动渐变背景 - 固定位置 */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1603716694030-4cdd1325d3cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGdyYWRpZW50JTIwZmxvdyUyMHNvZnQlMjBwYXN0ZWx8ZW58MXx8fHwxNzYzMDE0MDM5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(80px) saturate(0.2) brightness(1.6)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/85 to-white/90" />
        
        {/* 添加细腻的噪点纹理 */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* 扇形导航菜单 */}
      <FanNavMenu 
        onSubscribe={() => onNavigate?.('subscription')}
        onLogin={() => setShowLoginDialog(true)}
      />

      <div ref={containerRef} className="relative">
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
                  transition={{ delay: 0.2, duration: 0.8 }}
                  className="space-y-4"
                >
                  <h1 
                    className="text-gray-900 leading-tight"
                    style={{ 
                      fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                      fontWeight: 800,
                      letterSpacing: '-0.02em'
                    }}
                  >
                    {heroContent.title}
                  </h1>

                  <h2 
                    className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight"
                    style={{ 
                      fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                      fontWeight: 800,
                      letterSpacing: '-0.02em'
                    }}
                  >
                    {heroContent.subtitle}
                  </h2>

                  {/* 描述文字 */}
                  {heroContent.description && (
                    <p
                      className="text-gray-600 max-w-2xl mx-auto mt-6"
                      style={{
                        fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                        lineHeight: '1.6',
                        fontWeight: 400,
                      }}
                    >
                      {heroContent.description}
                    </p>
                  )}
                </motion.div>

                {/* CTA 按钮 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="flex justify-center"
                >
                  <motion.button
                    onClick={handleScrollToUpload}
                    className="group relative px-10 py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl hover:shadow-2xl transition-all overflow-hidden"
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    style={{ fontWeight: 700, fontSize: 'clamp(1rem, 2vw, 1.125rem)' }}
                  >
                    {/* Animated gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Shine effect */}
                    <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700" />
                    
                    <span className="relative flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      开始分析
                    </span>
                  </motion.button>
                </motion.div>
              </div>

              {/* 滚动提示 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 1 }}
                className="pb-16"
              >
                <motion.div
                  animate={{
                    y: [0, 10, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="flex flex-col items-center gap-2 text-gray-400"
                >
                  <span className="text-sm">向下滚动查看更多</span>
                  <svg 
                    className="w-6 h-6" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M19 14l-7 7m0 0l-7-7m7 7V3" 
                    />
                  </svg>
                </motion.div>
              </motion.div>
            </div>
          </FloatingHeroIcons>
          </div>
        </motion.div>

        {/* Upload Section - 原地渐现（fixed定位在同一位置）*/}
        {/* 根据注册登录与权限设计方案：未登录时，不显示上传区域，必须先登录或注册 */}
        <motion.div
          style={{ 
            opacity: uploadOpacity,
            pointerEvents: (isLoggedIn && scrollProgress >= 0.5) ? 'auto' : 'none'
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
      {/* 根据注册登录与权限设计方案第 1.1 节：滚动超过 200px 且未登录时弹出注册对话框 */}
      <RegisterDialog 
        isOpen={showRegisterDialog} 
        onClose={() => {
          setShowRegisterDialog(false);
          // 关闭注册对话框后，如果用户已登录，允许继续滚动查看上传区域
          const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
          if (loggedIn) {
            // 用户已登录，重置触发状态，允许正常滚动
            setHasTriggeredRegister(false);
          }
        }}
        onSwitchToLogin={handleSwitchToLogin}
      />

      {/* 登录对话框 */}
      {/* 根据注册登录与权限设计方案：支持从注册对话框切换到登录对话框 */}
      <LoginDialog 
        isOpen={showLoginDialog} 
        onClose={() => {
          setShowLoginDialog(false);
          // 关闭登录对话框后，如果用户已登录，允许继续滚动查看上传区域
          const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
          if (loggedIn) {
            // 用户已登录，重置触发状态，允许正常滚动
            setHasTriggeredRegister(false);
          }
        }}
        onSwitchToRegister={handleSwitchToRegister}
      />
    </>
  );
}