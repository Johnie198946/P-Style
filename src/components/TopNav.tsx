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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userCenterOpen, setUserCenterOpen] = useState(false);
  const [userCenterPage, setUserCenterPage] = useState<'subscription' | 'usage' | 'gallery'>('subscription');

  useEffect(() => {
    // 检查登录状态
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedIn);
  }, [isLoginOpen, isRegisterOpen]);

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
