import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, User, Eye, EyeOff, Shield, AlertCircle, Mail } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { adminApi, ApiError } from '../../lib/api';
import { toast } from 'sonner';

interface AdminLoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export function AdminLoginDialog({ isOpen, onClose, onLogin }: AdminLoginDialogProps) {
  const [username, setUsername] = useState(''); // 用户名或邮箱（支持 admin 或 admin@admin.local）
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState<string | null>(null); // 第一步返回的 MFA Token
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState(0); // 验证码倒计时
  const [step, setStep] = useState<'login' | 'mfa'>('login'); // 当前步骤

  // 验证码倒计时
  useEffect(() => {
    if (codeCountdown > 0) {
      const timer = setTimeout(() => setCodeCountdown(codeCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [codeCountdown]);

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setStep('login');
      setUsername('');
      setPassword('');
      setMfaToken(null);
      setVerificationCode('');
      setError('');
      setCodeCountdown(0);
    }
  }, [isOpen]);

  // 第一步：用户名/邮箱+密码登录
  // 支持通过用户名（display_name）或邮箱（email）登录
  const handleStep1Login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await adminApi.login({ username, password });
      setMfaToken(result.mfaToken);
      setStep('mfa');
      setCodeCountdown(60); // 验证码已发送，开始倒计时
      
      // 使用后端返回的 message 字段显示提示消息
      // 开发环境下，如果邮件未发送，后端会返回明确的提示消息
      // 生产环境下，后端返回"验证码已发送到您的邮箱"
      const message = result.message || '验证码已发送到您的邮箱';
      if (result.dev_mode && !result.email_sent) {
        // 开发环境且邮件未发送：显示警告消息
        toast.warning(message);
      } else {
        // 正常情况：显示成功消息
        toast.success(message);
      }
    } catch (error: any) {
      console.error('Admin login failed:', error);
      if (error instanceof ApiError) {
        setError(error.message || '登录失败');
        toast.error(error.message || '登录失败');
      } else {
        setError('登录失败，请重试');
        toast.error('登录失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  // 第二步：验证码验证
  const handleStep2Verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaToken || !verificationCode) {
      setError('请输入验证码');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await adminApi.verifyMfa({
        mfaToken,
        code: verificationCode,
      });
      
      // 保存管理员 Token
      localStorage.setItem('adminAuthToken', result.adminAuthToken);
      localStorage.setItem('isAdminLoggedIn', 'true');
      localStorage.setItem('adminUserData', JSON.stringify(result.user));
      
      toast.success('管理员登录成功');
      onLogin();
      onClose();
    } catch (error: any) {
      console.error('Admin MFA verify failed:', error);
      if (error instanceof ApiError) {
        setError(error.message || '验证失败');
        toast.error(error.message || '验证失败');
      } else {
        setError('验证失败，请重试');
        toast.error('验证失败，请重试');
      }
    } finally {
      setLoading(false);
    }
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

        {step === 'login' ? (
          <form onSubmit={handleStep1Login} className="space-y-4 mt-4">
            {/* Username/Email Input */}
            <div className="space-y-2">
              <label className="text-sm text-gray-700" style={{ fontWeight: 600 }}>
                用户名/邮箱
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="输入用户名（如：admin）或邮箱"
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
                  <span>验证中...</span>
                </div>
              ) : (
                <span>下一步</span>
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleStep2Verify} className="space-y-4 mt-4">
            {/* Verification Code Input */}
            <div className="space-y-2">
              <label className="text-sm text-gray-700" style={{ fontWeight: 600 }}>
                验证码
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="输入邮箱验证码"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  className="flex-1"
                  required
                />
                <Button
                  type="button"
                  onClick={() => {
                    // 重新发送验证码（需要重新执行第一步）
                    setStep('login');
                    setMfaToken(null);
                    setVerificationCode('');
                    setCodeCountdown(0);
                  }}
                  disabled={codeCountdown > 0}
                  variant="outline"
                  className="whitespace-nowrap"
                >
                  {codeCountdown > 0 ? `${codeCountdown}秒` : '重新发送'}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                验证码已发送到您的邮箱，请查收
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || !verificationCode}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>验证中...</span>
                </div>
              ) : (
                <span>完成登录</span>
              )}
            </Button>

            {/* Back Button */}
            <Button
              type="button"
              onClick={() => {
                setStep('login');
                setMfaToken(null);
                setVerificationCode('');
                setCodeCountdown(0);
              }}
              variant="ghost"
              className="w-full"
            >
              返回上一步
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
