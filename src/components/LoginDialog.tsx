import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2 } from 'lucide-react';
import { authApi, ApiError } from '../lib/api';
import { toast } from 'sonner';

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister?: () => void;
}

export function LoginDialog({ isOpen, onClose, onSwitchToRegister }: LoginDialogProps) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone' | 'code'>('email');
  const [codeCountdown, setCodeCountdown] = useState(0); // 验证码倒计时

  // 验证码倒计时
  useEffect(() => {
    if (codeCountdown > 0) {
      const timer = setTimeout(() => setCodeCountdown(codeCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [codeCountdown]);

  // 发送验证码
  const handleSendCode = async () => {
    if (!email) {
      toast.error('请输入邮箱地址');
      return;
    }
    
    try {
      const result = await authApi.sendVerificationCode(email, 'login');
      setCodeCountdown(60);
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
      console.error('Send code failed:', error);
      if (error instanceof ApiError) {
        toast.error(error.message || '发送验证码失败');
      } else {
        toast.error('发送验证码失败，请重试');
      }
    }
  };

  // 登录处理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      let result;
      
      if (loginMethod === 'code') {
        // 验证码登录
        if (!verificationCode) {
          toast.error('请输入验证码');
          setIsLoading(false);
          return;
        }
        result = await authApi.loginWithCode({
          email,
          code: verificationCode,
        });
      } else {
        // 密码登录
        result = await authApi.login({
          email: loginMethod === 'email' ? email : `${phone}@temp.com`, // 临时处理手机号
          password,
        });
      }
      
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userName', result.user.display_name || result.user.email);
      localStorage.setItem('userData', JSON.stringify(result.user));
      
      // 触发自定义事件，通知其他组件登录状态已改变（根据注册登录与权限设计方案）
      // 这样 TopNav 等组件可以立即更新显示状态
      window.dispatchEvent(new CustomEvent('loginStatusChanged'));
      
      toast.success('登录成功');
      onClose();
    } catch (error: any) {
      console.error('Login failed:', error);
      if (error instanceof ApiError) {
        toast.error(error.message || '登录失败');
      } else {
        toast.error('登录失败，请重试');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleWeChatLogin = async () => {
    // 微信登录功能待实现（需要接入微信 OAuth）
    const { toast } = await import('sonner');
    toast.info('微信登录功能开发中，请使用邮箱登录');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{
                type: 'spring',
                damping: 30,
                stiffness: 300,
              }}
              className="relative w-full max-w-[440px] bg-white rounded-[24px] shadow-2xl overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-5 right-5 p-2 rounded-lg hover:bg-gray-100 transition-colors group z-10"
              >
                <X className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
              </button>

              {/* Content */}
              <div className="px-10 py-10">
                {/* Logo */}
                <div className="flex justify-center mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[16px] flex items-center justify-center shadow-lg">
                    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 10C8 8.89543 8.89543 8 10 8H22C23.1046 8 24 8.89543 24 10V11C24 12.1046 23.1046 13 22 13H10C8.89543 13 8 12.1046 8 11V10Z" fill="white"/>
                      <path d="M8 15.5C8 14.3954 8.89543 13.5 10 13.5H16C17.1046 13.5 18 14.3954 18 15.5V22C18 23.1046 17.1046 24 16 24H10C8.89543 24 8 23.1046 8 22V15.5Z" fill="white"/>
                      <path d="M20 15.5C20 14.3954 20.8954 13.5 22 13.5C23.1046 13.5 24 14.3954 24 15.5V22C24 23.1046 23.1046 24 22 24C20.8954 24 20 23.1046 20 22V15.5Z" fill="white"/>
                    </svg>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center mb-8">
                  <h2 className="text-gray-900 mb-2" style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-0.02em' }}>
                    欢迎回来
                  </h2>
                  <p className="text-gray-500" style={{ fontSize: '15px', fontWeight: 400, lineHeight: '1.5' }}>
                    登录继续你的照片风格克隆之旅
                  </p>
                </div>

                {/* WeChat Login Button */}
                <button
                  onClick={handleWeChatLogin}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-[12px] transition-all group mb-4"
                  style={{ fontSize: '15px', fontWeight: 500 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#07C160">
                    <path d="M8.5 8.5c.5 0 1-.4 1-1s-.4-1-1-1-1 .4-1 1 .5 1 1 1zm7 0c.5 0 1-.4 1-1s-.4-1-1-1-1 .4-1 1 .5 1 1 1zM12 2C6.5 2 2 5.8 2 10.5c0 2.4 1.2 4.5 3.2 6 0 .1-.1.3-.3.7-.3.6-.7 1.5-.7 1.5-.1.2 0 .4.1.5.1.1.3.2.5.1 0 0 2.4-.9 3.5-1.3.8.2 1.6.3 2.5.3 5.5 0 10-3.8 10-8.5S17.5 2 12 2zm6.8 12.5c.2.5-.2 1.1-.8 1.1-.2 0-.3 0-.5-.1-.7-.3-1.4-.5-2.2-.5-2.8 0-5 1.7-5 3.8 0 .2 0 .4.1.6-4.5-.3-8-3.3-8-7 0-3.9 3.8-7 8.5-7s8.5 3.1 8.5 7c0 1.4-.5 2.7-1.4 3.8.3.4.6.9.8 1.3z"/>
                  </svg>
                  <span className="text-gray-900">使用微信登录</span>
                </button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 bg-white text-gray-400" style={{ fontSize: '13px', fontWeight: 400 }}>
                      或
                    </span>
                  </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-2 p-1 bg-gray-100 rounded-[10px] mb-6">
                  <button
                    type="button"
                    onClick={() => setLoginMethod('email')}
                    className={`flex-1 px-4 py-2.5 rounded-[8px] transition-all ${
                      loginMethod === 'email'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    style={{ fontSize: '14px', fontWeight: 500 }}
                  >
                    密码登录
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('code')}
                    className={`flex-1 px-4 py-2.5 rounded-[8px] transition-all ${
                      loginMethod === 'code'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    style={{ fontSize: '14px', fontWeight: 500 }}
                  >
                    验证码登录
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="space-y-4">
                  {loginMethod === 'code' ? (
                    <>
                      {/* Email Input */}
                      <div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="输入邮箱地址"
                          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-400"
                          style={{ fontSize: '15px' }}
                          required
                        />
                      </div>

                      {/* Verification Code */}
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          placeholder="输入验证码"
                          maxLength={6}
                          className="flex-1 px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-400"
                          style={{ fontSize: '15px' }}
                          required
                        />
                        <button
                          type="button"
                          onClick={handleSendCode}
                          disabled={codeCountdown > 0}
                          className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[12px] transition-all whitespace-nowrap disabled:bg-gray-300 disabled:cursor-not-allowed"
                          style={{ fontSize: '14px', fontWeight: 500 }}
                        >
                          {codeCountdown > 0 ? `${codeCountdown}秒` : '获取验证码'}
                        </button>
                      </div>
                    </>
                  ) : loginMethod === 'email' ? (
                    <>
                      {/* Email Input */}
                      <div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="输入邮箱地址"
                          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-400"
                          style={{ fontSize: '15px' }}
                          required
                        />
                      </div>

                      {/* Password Input */}
                      <div>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="输入密码"
                          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-400"
                          style={{ fontSize: '15px' }}
                          required
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Phone Input */}
                      <div>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="输入手机号码"
                          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-400"
                          style={{ fontSize: '15px' }}
                          pattern="[0-9]{11}"
                          required
                        />
                      </div>

                      {/* Verification Code */}
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          placeholder="输入验证码"
                          className="flex-1 px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-400"
                          style={{ fontSize: '15px' }}
                          required
                        />
                        <button
                          type="button"
                          className="px-5 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[12px] transition-all whitespace-nowrap"
                          style={{ fontSize: '14px', fontWeight: 500 }}
                        >
                          获取验证码
                        </button>
                      </div>
                    </>
                  )}

                  {/* Remember & Forgot Password */}
                  {loginMethod === 'email' && (
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-gray-600 select-none" style={{ fontSize: '14px', fontWeight: 400 }}>
                          记住我
                        </span>
                      </label>
                      <button
                        type="button"
                        className="text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
                        style={{ fontSize: '14px', fontWeight: 500 }}
                      >
                        忘记密码？
                      </button>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-[12px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                    style={{ fontSize: '15px', fontWeight: 600 }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        登录中...
                      </>
                    ) : (
                      '登录'
                    )}
                  </button>
                </form>

                {/* Terms */}
                <p className="mt-6 text-center text-gray-500" style={{ fontSize: '13px', fontWeight: 400, lineHeight: '1.5' }}>
                  登录即表示您同意我们的
                  <a href="#" className="text-indigo-600 hover:text-indigo-700 hover:underline mx-1">服务条款</a>
                  和
                  <a href="#" className="text-indigo-600 hover:text-indigo-700 hover:underline ml-1">隐私政策</a>
                </p>

                {/* Register Link */}
                <div className="mt-6 text-center">
                  <span className="text-gray-600" style={{ fontSize: '14px', fontWeight: 400 }}>
                    还没有账号？
                  </span>
                  <button
                    type="button"
                    onClick={onSwitchToRegister}
                    className="ml-1 text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
                    style={{ fontSize: '14px', fontWeight: 500 }}
                  >
                    立即注册
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
