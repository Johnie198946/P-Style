import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LoginDialog } from './LoginDialog';
import { RegisterDialog } from './RegisterDialog';
import { UserMenu } from './UserMenu';
import { UserCenter } from './UserCenter';

interface TopNavProps {
  onNavigateToSubscription?: () => void;
}

export function TopNav({ onNavigateToSubscription }: TopNavProps = {}) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  // 使用函数式初始化 useState，在组件初始化时立即从 localStorage 读取登录状态
  // 避免初始化时误判为未登录，导致用户菜单不显示
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (typeof window !== 'undefined') {
      const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
      // 调试日志：帮助排查登录状态初始化问题
      console.log('[TopNav] 组件初始化，检查登录状态:', {
        loggedIn,
        localStorage_isLoggedIn: localStorage.getItem('isLoggedIn'),
        accessToken: localStorage.getItem('accessToken') ? '存在' : '不存在',
      });
      return loggedIn;
    }
    return false;
  });
  const [userCenterOpen, setUserCenterOpen] = useState(false);
  const [userCenterPage, setUserCenterPage] = useState<'subscription' | 'usage' | 'gallery'>('subscription');

  // 检查登录状态的函数
  const checkLoginStatus = () => {
    if (typeof window === 'undefined') return;
    
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const accessToken = localStorage.getItem('accessToken');
    
    // 调试日志：帮助排查登录状态检查问题
    console.log('[TopNav] checkLoginStatus 调用:', {
      loggedIn,
      accessToken: accessToken ? '存在' : '不存在',
      localStorage_isLoggedIn: localStorage.getItem('isLoggedIn'),
      current_isLoggedIn_state: isLoggedIn,
    });
    
    // 数据一致性检查：如果 isLoggedIn 为 'true' 但 accessToken 不存在，说明数据不一致
    // 根据注册登录与权限设计方案，登录状态应该与 accessToken 保持一致
    if (loggedIn && !accessToken) {
      console.warn('[TopNav] 检测到数据不一致：isLoggedIn 为 true 但 accessToken 不存在，清除 isLoggedIn');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userData');
      setIsLoggedIn(false);
      return;
    }
    
    setIsLoggedIn(loggedIn);
  };

  useEffect(() => {
    // 初始化时检查登录状态
    checkLoginStatus();
    
    // 监听对话框打开/关闭事件（当对话框关闭时，可能已经登录成功）
    checkLoginStatus();
  }, [isLoginOpen, isRegisterOpen]);

  // 监听登录状态变化事件（当用户登录或登出时触发）
  useEffect(() => {
    // 监听自定义事件，当登录状态改变时更新
    const handleLoginStatusChanged = () => {
      checkLoginStatus();
    };
    
    window.addEventListener('loginStatusChanged', handleLoginStatusChanged);
    
    // 监听 storage 事件（跨标签页同步，但同标签页的 localStorage 变化不会触发）
    // 因此主要依赖自定义事件
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'isLoggedIn') {
        checkLoginStatus();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('loginStatusChanged', handleLoginStatusChanged);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleSwitchToRegister = () => {
    setIsLoginOpen(false);
    setIsRegisterOpen(true);
  };

  const handleSwitchToLogin = () => {
    setIsRegisterOpen(false);
    setIsLoginOpen(true);
  };

  const handleNavigateToUserCenter = (page: 'subscription' | 'usage' | 'gallery') => {
    if (page === 'subscription' && !isLoggedIn && onNavigateToSubscription) {
      // 如果未登录且点击订阅，导航到订阅落地页
      onNavigateToSubscription();
    } else if (isLoggedIn) {
      setUserCenterPage(page);
      setUserCenterOpen(true);
    } else {
      // 如果未登录，先打开登录对话框
      setIsLoginOpen(true);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute top-6 left-1/2 -translate-x-1/2 z-[100]"
      >
        <div className="bg-gray-100/90 backdrop-blur-sm rounded-[28px] px-8 py-3 shadow-sm border border-gray-200/50 w-[480px]">
          <div className="flex items-center justify-between">
            {/* Logo - QuantaNova */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 10C8 8.89543 8.89543 8 10 8H22C23.1046 8 24 8.89543 24 10V11C24 12.1046 23.1046 13 22 13H10C8.89543 13 8 12.1046 8 11V10Z" fill="white"/>
                  <path d="M8 15.5C8 14.3954 8.89543 13.5 10 13.5H16C17.1046 13.5 18 14.3954 18 15.5V22C18 23.1046 17.1046 24 16 24H10C8.89543 24 8 23.1046 8 22V15.5Z" fill="white"/>
                  <path d="M20 15.5C20 14.3954 20.8954 13.5 22 13.5C23.1046 13.5 24 14.3954 24 15.5V22C24 23.1046 23.1046 24 22 24C20.8954 24 20 23.1046 20 22V15.5Z" fill="white"/>
                </svg>
              </div>
              <span 
                className="text-gray-900 tracking-[-0.01em]"
                style={{ fontSize: '16px', fontWeight: 600 }}
              >
                QuantaNova
              </span>
            </div>

            {/* Right Side Navigation */}
            <div className="flex items-center gap-3">
              {isLoggedIn ? (
                <UserMenu onNavigate={handleNavigateToUserCenter} />
              ) : (
                <>
                  <button 
                    onClick={() => handleNavigateToUserCenter('subscription')}
                    className="px-5 py-2 text-gray-700 hover:text-gray-900 rounded-[16px] hover:bg-gray-200/60 transition-all"
                    style={{ fontSize: '14px', fontWeight: 500 }}
                  >
                    订阅
                  </button>
                  <button 
                    onClick={() => setIsLoginOpen(true)}
                    className="px-5 py-2 bg-gray-900 text-white rounded-[16px] hover:bg-gray-800 transition-all hover:shadow-md"
                    style={{ fontSize: '14px', fontWeight: 500 }}
                  >
                    Log in
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 登录对话框 */}
      <LoginDialog 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)}
        onSwitchToRegister={handleSwitchToRegister}
      />

      {/* 注册对话框 */}
      <RegisterDialog 
        isOpen={isRegisterOpen} 
        onClose={() => setIsRegisterOpen(false)}
        onSwitchToLogin={handleSwitchToLogin}
      />

      {/* 用户中心 */}
      <UserCenter
        isOpen={userCenterOpen}
        onClose={() => setUserCenterOpen(false)}
        initialPage={userCenterPage}
      />
    </>
  );
}
