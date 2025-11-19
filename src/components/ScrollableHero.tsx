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
  // 使用 state 管理登录状态，而不是每次都从 localStorage 读取（提高性能和响应性）
  // 初始化时立即从 localStorage 读取登录状态，避免初始化时误判为未登录
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    // 在组件初始化时立即检查登录状态（避免滚动事件在状态更新前触发）
    if (typeof window !== 'undefined') {
      const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const accessToken = localStorage.getItem('accessToken');
      // 调试日志：帮助排查初始化问题
      console.log('[ScrollableHero] 组件初始化，检查登录状态:', {
        loggedIn,
        accessToken: accessToken ? '存在' : '不存在',
        localStorage_isLoggedIn: localStorage.getItem('isLoggedIn'),
      });
      return loggedIn;
    }
    return false;
  });
  
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

  // 检查登录状态的函数（用于对话框关闭时调用）
  // 注意：此函数需要在 useEffect 之前定义，以便在 useEffect 中使用
  const checkLoginStatus = () => {
    if (typeof window === 'undefined') return;
    
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const accessToken = localStorage.getItem('accessToken');
    
    // 调试日志：帮助排查登录状态检查问题
    console.log('[ScrollableHero] checkLoginStatus 调用:', {
      loggedIn,
      accessToken: accessToken ? '存在' : '不存在',
      localStorage_isLoggedIn: localStorage.getItem('isLoggedIn'),
      current_isLoggedIn_state: isLoggedIn,
    });
    
    // 数据一致性检查：如果 isLoggedIn 为 'true' 但 accessToken 不存在，说明数据不一致
    // 根据注册登录与权限设计方案，登录状态应该与 accessToken 保持一致
    if (loggedIn && !accessToken) {
      console.warn('[ScrollableHero] 检测到数据不一致：isLoggedIn 为 true 但 accessToken 不存在，清除 isLoggedIn');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userData');
      setIsLoggedIn(false);
      return;
    }
    
    setIsLoggedIn(loggedIn);
    // 如果用户已登录，重置触发状态，允许正常滚动
    if (loggedIn) {
      setHasTriggeredRegister(false);
      console.log('[ScrollableHero] 用户已登录，重置 hasTriggeredRegister 为 false');
    }
  };

  // 初始化时检查登录状态（补充检查，确保状态同步）
  useEffect(() => {
    checkLoginStatus();
  }, []);

  // 监听登录状态变化事件（当用户登录或登出时触发）
  useEffect(() => {
    const handleLoginStatusChanged = () => {
      // 使用统一的 checkLoginStatus 函数，确保数据一致性检查
      checkLoginStatus();
    };
    
    window.addEventListener('loginStatusChanged', handleLoginStatusChanged);
    
    return () => {
      window.removeEventListener('loginStatusChanged', handleLoginStatusChanged);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const maxScroll = 500; // 滚动500px时完成过渡
      const progress = Math.min(scrollTop / maxScroll, 1);
      
      // 状态验证：如果 isLoggedIn state 与 localStorage 不一致，立即同步
      // 这可以确保即使状态不同步，也能及时修复
      const localStorageLoggedIn = typeof window !== 'undefined' && localStorage.getItem('isLoggedIn') === 'true';
      if (isLoggedIn !== localStorageLoggedIn) {
        console.warn('[ScrollableHero] 检测到状态不一致，立即同步:', {
          state_isLoggedIn: isLoggedIn,
          localStorage_isLoggedIn: localStorageLoggedIn,
          scrollTop,
        });
        setIsLoggedIn(localStorageLoggedIn);
        if (localStorageLoggedIn) {
          setHasTriggeredRegister(false);
        }
        // 同步后，使用新的状态重新判断（注意：这里不能直接使用 localStorageLoggedIn，因为 state 更新是异步的）
        // 所以我们需要在下次滚动时再判断，或者直接使用 localStorageLoggedIn
        if (!localStorageLoggedIn && scrollTop > 200 && !hasTriggeredRegister) {
          console.log('[ScrollableHero] 状态同步后触发注册对话框：未登录且滚动超过200px');
          setShowRegisterDialog(true);
          setHasTriggeredRegister(true);
          setScrollProgress(0.4);
          return;
        }
      }
      
      // 调试日志：帮助排查滚动逻辑问题
      // 注意：生产环境可以移除这些日志
      if (scrollTop > 190 && scrollTop < 210) {
        console.log('[ScrollableHero] 滚动检查:', {
          scrollTop,
          isLoggedIn,
          hasTriggeredRegister,
          localStorage_isLoggedIn: localStorage.getItem('isLoggedIn'),
          shouldTriggerRegister: !isLoggedIn && scrollTop > 200 && !hasTriggeredRegister,
        });
      }
      
      // 根据注册登录与权限设计方案第 1.1 节：当滚动超过200px且未登录时，弹出注册对话框
      // 如果未登录，阻止滚动进度继续增加，直到用户登录
      if (!isLoggedIn && scrollTop > 200 && !hasTriggeredRegister) {
        console.log('[ScrollableHero] 触发注册对话框：未登录且滚动超过200px');
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
  }, [hasTriggeredRegister, isLoggedIn]);

  // 登录状态已通过 state 管理，无需再次从 localStorage 读取

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

      {/* 扇形导航菜单（仅当未登录时显示，已登录时右上角显示 UserMenu） */}
      {!isLoggedIn && (
      <FanNavMenu 
        onSubscribe={() => onNavigate?.('subscription')}
        onLogin={() => setShowLoginDialog(true)}
      />
      )}

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
          // 关闭注册对话框后，检查登录状态（可能用户在对话框中已登录）
          checkLoginStatus();
        }}
        onSwitchToLogin={handleSwitchToLogin}
      />

      {/* 登录对话框 */}
      {/* 根据注册登录与权限设计方案：支持从注册对话框切换到登录对话框 */}
      <LoginDialog 
        isOpen={showLoginDialog} 
        onClose={() => {
          setShowLoginDialog(false);
          // 关闭登录对话框后，检查登录状态（可能用户在对话框中已登录）
          checkLoginStatus();
        }}
        onSwitchToRegister={handleSwitchToRegister}
      />
    </>
  );
}