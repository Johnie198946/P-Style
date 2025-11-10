import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Activity, 
  CheckSquare, 
  Database,
  LogOut,
  Menu,
  X,
  BarChart3,
  Settings,
  Wallet
} from 'lucide-react';
import { Button } from '../ui/button';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: '用户管理', icon: Users },
  { id: 'subscriptions', label: '订阅管理', icon: CreditCard },
  { id: 'payments', label: '支付管理', icon: Wallet },
  { id: 'usage', label: '资源用量', icon: Activity },
  { id: 'tasks', label: '任务管理', icon: CheckSquare },
  { id: 'content', label: '内容管理', icon: Database },
  { id: 'analytics', label: '数据分析', icon: BarChart3 },
];

export function AdminLayout({ children, currentPage, onNavigate, onLogout }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg text-gray-900" style={{ fontWeight: 700 }}>管理后台</h1>
              <p className="text-xs text-gray-500">Photo Style Clone Admin</p>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={onLogout}
          className="flex items-center gap-2 text-gray-700 hover:text-red-600"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">退出登录</span>
        </Button>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 z-40 overflow-y-auto"
          >
            <nav className="p-4 space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                    <span style={{ fontWeight: isActive ? 600 : 500 }}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Admin Info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gradient-to-br from-blue-50 to-purple-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white" style={{ fontWeight: 700 }}>
                  A
                </div>
                <div>
                  <div className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                    Admin
                  </div>
                  <div className="text-xs text-gray-500">
                    超级管理员
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div
        className={`pt-16 transition-all duration-300 ${
          sidebarOpen ? 'lg:pl-64' : 'pl-0'
        }`}
      >
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
