import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, CreditCard, BarChart3, Palette, LogOut, ChevronRight } from 'lucide-react';

interface UserMenuProps {
  onNavigate: (page: 'subscription' | 'usage' | 'gallery') => void;
}

export function UserMenu({ onNavigate }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const userName = localStorage.getItem('userName') || '用户';
  const userEmail = 'user@example.com';

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userName');
    window.location.reload();
  };

  const menuItems = [
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

  return (
    <div className="relative">
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 transition-all group"
      >
        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center ring-2 ring-white shadow-md group-hover:ring-indigo-100 transition-all">
          <User className="w-5 h-5 text-white" />
        </div>
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
                      onNavigate(item.id as any);
                      setIsOpen(false);
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
    </div>
  );
}
