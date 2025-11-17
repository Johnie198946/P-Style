import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, CreditCard, BarChart3, Palette, LogOut, ChevronRight, Shield } from 'lucide-react';
import { AdminLoginDialog } from './admin/AdminLoginDialog';
import { UserDrawer } from './UserDrawer';

interface UserMenuProps {
  onNavigate: (page: 'subscription' | 'usage' | 'gallery' | 'user-center' | 'admin') => void;
}

export function UserMenu({ onNavigate }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserDrawer, setShowUserDrawer] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  
  const userName = userData?.display_name || localStorage.getItem('userName') || '用户';
  const userEmail = userData?.email || 'user@example.com';

  useEffect(() => {
    // 加载用户信息
    // 根据注册登录与权限设计方案：只有已登录用户才能调用 /api/user/me 接口
    const loadUserInfo = async () => {
      // 先检查登录状态，如果未登录则不调用 API（避免 403 错误）
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      if (!isLoggedIn) {
        // 未登录时，不调用 API，直接返回
        return;
      }

      try {
        const stored = localStorage.getItem('userData');
        if (stored) {
          setUserData(JSON.parse(stored));
        } else {
          const { userApi } = await import('../lib/api');
          const data = await userApi.getMe();
          setUserData(data.user);
          localStorage.setItem('userData', JSON.stringify(data.user));
        }
      } catch (error) {
        console.error('Failed to load user info:', error);
        // 如果 API 调用失败（如 401/403），清除本地存储的用户数据
        localStorage.removeItem('userData');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('accessToken');
      }
    };
    loadUserInfo();
  }, []);

  // 检查是否已经是管理员
  useEffect(() => {
    const checkAdminStatus = () => {
      const adminStatus = localStorage.getItem('isAdmin') === 'true';
      setIsAdmin(adminStatus);
    };
    
    checkAdminStatus();
    
    // 监听自定义事件，当管理员状态改变时更新
    window.addEventListener('adminStatusChanged', checkAdminStatus);
    
    return () => {
      window.removeEventListener('adminStatusChanged', checkAdminStatus);
    };
  }, []);

  // 监听键盘快捷键 Ctrl+Shift+A 打开管理员登录
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setShowAdminLogin(true);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // 点击头像5次触发管理员登录
  const handleAvatarClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    if (newCount >= 5) {
      setShowAdminLogin(true);
      setClickCount(0);
    }
    
    // 2秒后重置计数
    setTimeout(() => setClickCount(0), 2000);
    
    setIsOpen(!isOpen);
  };

  const handleAdminLogin = () => {
    localStorage.setItem('isAdmin', 'true');
    setIsAdmin(true);
    // 触发自定义事件通知其他组件管理员状态已改变
    window.dispatchEvent(new CustomEvent('adminStatusChanged'));
    onNavigate('admin');
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userName');
    localStorage.removeItem('isAdmin');
    // 触发自定义事件通知其他组件管理员状态已改变
    window.dispatchEvent(new CustomEvent('adminStatusChanged'));
    window.location.reload();
  };

  const menuItems = [
    {
      id: 'user-center',
      icon: <User className="w-5 h-5" />,
      label: '个人中心',
      description: '管理个人信息和设置',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
    {
      id: 'subscription',
      icon: <CreditCard className="w-5 h-5" />,
      label: '我的订阅',
      description: '查看订阅计划和权益',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'usage',
      icon: <BarChart3 className="w-5 h-5" />,
      label: '资源用量',
      description: '查看使用情况和配额',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      id: 'gallery',
      icon: <Palette className="w-5 h-5" />,
      label: '我的仿色',
      description: '管理已保存的分析报告',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ];

  // 如果是管理员，添加管理后台入口
  if (isAdmin) {
    menuItems.push({
      id: 'admin',
      icon: <Shield className="w-5 h-5" />,
      label: '管理后台',
      description: '系统管理和配置',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    });
  }

  return (
    <div className="relative">
      {/* Avatar Button */}
      <button
        onClick={handleAvatarClick}
        className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 transition-all group relative"
        title="点击5次打开管理员登录，或按 Ctrl+Shift+A"
      >
        <div className={`w-9 h-9 bg-gradient-to-br ${isAdmin ? 'from-red-500 to-orange-600' : 'from-indigo-500 to-purple-600'} rounded-full flex items-center justify-center ring-2 ring-white shadow-md group-hover:ring-indigo-100 transition-all`}>
          {isAdmin ? <Shield className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
        </div>
        {/* Click counter indicator */}
        {clickCount > 0 && clickCount < 5 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
            style={{ fontWeight: 700 }}
          >
            {clickCount}
          </motion.div>
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[100]"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-[101]"
            >
              {/* User Info */}
              <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 truncate" style={{ fontSize: '15px', fontWeight: 600 }}>
                      {userName}
                    </p>
                    <p className="text-gray-500 truncate" style={{ fontSize: '13px', fontWeight: 400 }}>
                      {userEmail}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'user-center' || item.id === 'subscription' || item.id === 'usage' || item.id === 'gallery') {
                        setShowUserDrawer(true);
                        setIsOpen(false);
                      } else {
                        onNavigate(item.id as any);
                        setIsOpen(false);
                      }
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors group"
                  >
                    <div className={`w-10 h-10 ${item.bgColor} rounded-xl flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-gray-900" style={{ fontSize: '14px', fontWeight: 600 }}>
                        {item.label}
                      </p>
                      <p className="text-gray-500" style={{ fontSize: '12px', fontWeight: 400 }}>
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>

              {/* Logout */}
              <div className="px-4 py-3 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  style={{ fontSize: '14px', fontWeight: 500 }}
                >
                  <LogOut className="w-4 h-4" />
                  退出登录
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Admin Login Dialog */}
      <AdminLoginDialog
        isOpen={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
        onLogin={handleAdminLogin}
      />

      {/* User Drawer */}
      <UserDrawer
        open={showUserDrawer}
        onClose={() => setShowUserDrawer(false)}
        initialPanel="profile"
      />
    </div>
  );
}
