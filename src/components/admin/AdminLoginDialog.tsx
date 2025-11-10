import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, User, Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface AdminLoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export function AdminLoginDialog({ isOpen, onClose, onLogin }: AdminLoginDialogProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 模拟登录验证
    setTimeout(() => {
      if (username === 'admin' && password === 'admin123') {
        onLogin();
        onClose();
        setUsername('');
        setPassword('');
      } else {
        setError('用户名或密码错误');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">管理员登录</DialogTitle>
          <DialogDescription className="text-center">
            请输入管理员凭据以访问后台
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Username Input */}
          <div className="space-y-2">
            <label className="text-sm text-gray-700" style={{ fontWeight: 600 }}>
              用户名
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="输入管理员用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <label className="text-sm text-gray-700" style={{ fontWeight: 600 }}>
              密码
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>登录中...</span>
              </div>
            ) : (
              <span>登录</span>
            )}
          </Button>

          {/* Demo Credentials */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800 text-center mb-1" style={{ fontWeight: 600 }}>
              演示账号
            </p>
            <p className="text-xs text-blue-700 text-center">
              用户名: <span style={{ fontWeight: 600 }}>admin</span> / 密码: <span style={{ fontWeight: 600 }}>admin123</span>
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
