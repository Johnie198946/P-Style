import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, Eye, EyeOff, Loader2, Phone, MessageSquare, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

interface RegisterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
}

export function RegisterDialog({ isOpen, onClose, onSwitchToLogin }: RegisterDialogProps) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [registerMethod, setRegisterMethod] = useState<'wechat' | 'email' | 'phone'>('wechat');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [wechatQRCode, setWechatQRCode] = useState<string | null>(null);
  const [isCheckingWechat, setIsCheckingWechat] = useState(false);

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (emailCountdown > 0) {
      const timer = setTimeout(() => setEmailCountdown(emailCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [emailCountdown]);

  // 微信扫码登录检测（功能待实现）
  useEffect(() => {
    if (isCheckingWechat && wechatQRCode) {
      const checkInterval = setInterval(async () => {
        // 微信注册功能待实现（需要接入微信 OAuth）
        // 当前为演示模式，不会真正完成注册
        const random = Math.random();
        if (random > 0.95) {
          clearInterval(checkInterval);
          setIsCheckingWechat(false);
          const { toast } = await import('sonner');
          toast.info('微信注册功能开发中，请使用邮箱注册');
        }
      }, 2000);

      return () => clearInterval(checkInterval);
    }
  }, [isCheckingWechat, wechatQRCode, onClose]);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone: string) => {
    const re = /^1[3-9]\d{9}$/;
    return re.test(phone);
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) return '密码至少需要8个字符';
    if (!/[A-Za-z]/.test(password)) return '密码需要包含字母';
    if (!/[0-9]/.test(password)) return '密码需要包含数字';
    return '';
  };

  const handleSendPhoneCode = async () => {
    if (!phone) {
      setErrors({ ...errors, phone: '请输入手机号' });
      return;
    }
    if (!validatePhone(phone)) {
      setErrors({ ...errors, phone: '请输入正确的手机号' });
      return;
    }

    // 清除错误
    const newErrors = { ...errors };
    delete newErrors.phone;
    setErrors(newErrors);

    // 手机验证码功能待实现（需要接入短信服务）
    const { toast } = await import('sonner');
    toast.info('手机验证码功能开发中，请使用邮箱注册');
  };

  const handleSendEmailCode = async () => {
    if (!email) {
      setErrors({ ...errors, email: '请输入邮箱地址' });
      return;
    }
    if (!validateEmail(email)) {
      setErrors({ ...errors, email: '请输入正确的邮箱地址' });
      return;
    }

    // 清除错误
    const newErrors = { ...errors };
    delete newErrors.email;
    setErrors(newErrors);

    try {
      const { authApi } = await import('../lib/api');
      await authApi.sendVerificationCode(email, 'register');
      setEmailCountdown(60);
      // 使用 toast 替代 alert
      const { toast } = await import('sonner');
      toast.success('验证码已发送到您的邮箱，请查收');
    } catch (error: any) {
      console.error('Send code failed:', error);
      const errorMessage = error.message || '发送验证码失败，请重试';
      setErrors({ ...errors, email: errorMessage });
      const { toast } = await import('sonner');
      toast.error(errorMessage);
    }
  };

  const handleWeChatRegister = () => {
    // 生成模拟二维码
    setWechatQRCode(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=wechat_login_${Date.now()}`);
    setIsCheckingWechat(true);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};

    if (!agreedToTerms) {
      const { toast } = await import('sonner');
      toast.error('请同意服务条款和隐私政策');
      return;
    }

    if (registerMethod === 'email') {
      if (!email || !validateEmail(email)) {
        newErrors.email = '请输入正确的邮箱地址';
      }
      if (!emailCode) {
        newErrors.emailCode = '请输入邮箱验证码';
      }
      if (!password) {
        newErrors.password = '请输入密码';
      } else {
        const passwordError = validatePassword(password);
        if (passwordError) {
          newErrors.password = passwordError;
        }
      }
      if (password !== confirmPassword) {
        newErrors.confirmPassword = '两次密码输入不一致';
      }
    } else if (registerMethod === 'phone') {
      if (!phone || !validatePhone(phone)) {
        newErrors.phone = '请输入正确的手机号';
      }
      if (!verificationCode) {
        newErrors.verificationCode = '请输入验证码';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    
    try {
      const { authApi } = await import('../lib/api');
      const { toast } = await import('sonner');
      
      if (registerMethod === 'email') {
        // 邮箱注册（使用验证码）
        if (!emailCode) {
          setErrors({ ...errors, emailCode: '请输入验证码' });
          setIsLoading(false);
          return;
        }
        
        const result = await authApi.registerWithCode({
          email,
          code: emailCode,
          password,
          display_name: email.split('@')[0],
        });
        
        localStorage.setItem('accessToken', result.accessToken);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userName', result.user.display_name || result.user.email);
        localStorage.setItem('userData', JSON.stringify(result.user));
        
        toast.success('注册成功！欢迎使用照片风格克隆');
        onClose();
      } else {
        // 手机号注册（暂时不支持，提示用户使用邮箱）
        toast.error('手机号注册功能暂未开放，请使用邮箱注册');
      }
    } catch (error: any) {
      console.error('Register failed:', error);
      const { toast } = await import('sonner');
      if (error.message) {
        toast.error(error.message);
        // 如果是验证码错误，在表单中显示
        if (error.message.includes('验证码')) {
          setErrors({ ...errors, emailCode: error.message });
        }
      } else {
        toast.error('注册失败，请重试');
      }
    } finally {
      setIsLoading(false);
    }
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
            onClick={() => {
              if (!isCheckingWechat) {
                onClose();
              }
            }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{
                type: 'spring',
                damping: 30,
                stiffness: 300,
              }}
              className="relative w-full max-w-[440px] bg-white rounded-[24px] shadow-2xl overflow-hidden my-8"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  if (!isCheckingWechat) {
                    onClose();
                  }
                }}
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
                    创建免费账号
                  </h2>
                  <p className="text-gray-500" style={{ fontSize: '15px', fontWeight: 400, lineHeight: '1.5' }}>
                    免费注册，开始你的照片风格克隆之旅
                  </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-2 p-1 bg-gray-100 rounded-[10px] mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterMethod('wechat');
                      setErrors({});
                      setWechatQRCode(null);
                      setIsCheckingWechat(false);
                    }}
                    className={`flex-1 px-3 py-2.5 rounded-[8px] transition-all flex items-center justify-center gap-1.5 ${
                      registerMethod === 'wechat'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    style={{ fontSize: '14px', fontWeight: 500 }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>微信</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterMethod('email');
                      setErrors({});
                      setWechatQRCode(null);
                      setIsCheckingWechat(false);
                    }}
                    className={`flex-1 px-3 py-2.5 rounded-[8px] transition-all flex items-center justify-center gap-1.5 ${
                      registerMethod === 'email'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    style={{ fontSize: '14px', fontWeight: 500 }}
                  >
                    <Mail className="w-4 h-4" />
                    <span>邮箱</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterMethod('phone');
                      setErrors({});
                      setWechatQRCode(null);
                      setIsCheckingWechat(false);
                    }}
                    className={`flex-1 px-3 py-2.5 rounded-[8px] transition-all flex items-center justify-center gap-1.5 ${
                      registerMethod === 'phone'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    style={{ fontSize: '14px', fontWeight: 500 }}
                  >
                    <Phone className="w-4 h-4" />
                    <span>手机</span>
                  </button>
                </div>

                {/* WeChat QR Code */}
                {registerMethod === 'wechat' && (
                  <div className="text-center">
                    {!wechatQRCode ? (
                      <button
                        onClick={handleWeChatRegister}
                        className="w-full flex flex-col items-center justify-center gap-4 px-4 py-8 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 hover:border-green-300 rounded-[16px] transition-all group"
                      >
                        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                          <MessageSquare className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <p className="text-gray-900 mb-1" style={{ fontSize: '16px', fontWeight: 600 }}>
                            使用微信注册
                          </p>
                          <p className="text-gray-500" style={{ fontSize: '13px', fontWeight: 400 }}>
                            快速安全，无需填写信息
                          </p>
                        </div>
                      </button>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-6 bg-white border-2 border-gray-200 rounded-[16px]">
                          <img 
                            src={wechatQRCode} 
                            alt="微信二维码" 
                            className="w-48 h-48 mx-auto"
                          />
                        </div>
                        <div className="flex items-center justify-center gap-2 text-gray-600">
                          {isCheckingWechat && <Loader2 className="w-4 h-4 animate-spin" />}
                          <p style={{ fontSize: '14px', fontWeight: 500 }}>
                            {isCheckingWechat ? '等待扫码...' : '请使用微信扫描二维码'}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setWechatQRCode(null);
                            setIsCheckingWechat(false);
                          }}
                          className="text-indigo-600 hover:text-indigo-700 transition-colors"
                          style={{ fontSize: '13px', fontWeight: 500 }}
                        >
                          刷新二维码
                        </button>
                      </div>
                    )}

                    {/* Terms for WeChat */}
                    {!wechatQRCode && (
                      <div className="mt-6">
                        <label className="flex items-start gap-2.5 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="text-gray-600 select-none text-left" style={{ fontSize: '13px', fontWeight: 400, lineHeight: '1.5' }}>
                            我已阅读并同意
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setShowTerms(true);
                              }}
                              className="text-indigo-600 hover:text-indigo-700 hover:underline ml-1"
                            >
                              服务条款
                            </button>
                            {' '}和{' '}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setShowPrivacy(true);
                              }}
                              className="text-indigo-600 hover:text-indigo-700 hover:underline"
                            >
                              隐私政策
                            </button>
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* Form */}
                {registerMethod !== 'wechat' && (
                  <form onSubmit={handleRegister} className="space-y-4">
                    {registerMethod === 'email' ? (
                      <>
                        {/* Email Input */}
                        <div>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              if (errors.email) {
                                const newErrors = { ...errors };
                                delete newErrors.email;
                                setErrors(newErrors);
                              }
                            }}
                            placeholder="输入邮箱地址"
                            className={`w-full px-4 py-3.5 bg-gray-50 border ${errors.email ? 'border-red-300' : 'border-gray-200'} rounded-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-400`}
                            style={{ fontSize: '15px' }}
                            required
                          />
                          {errors.email && (
                            <p className="mt-1.5 text-red-600 flex items-center gap-1" style={{ fontSize: '12px' }}>
                              <AlertCircle className="w-3.5 h-3.5" />
                              {errors.email}
                            </p>
                          )}
                        </div>

                        {/* Email Verification Code */}
                        <div>
                          <div className="flex gap-3">
                            <input
                              type="text"
                              value={emailCode}
                              onChange={(e) => {
                                setEmailCode(e.target.value);
                                if (errors.emailCode) {
                                  const newErrors = { ...errors };
                                  delete newErrors.emailCode;
                                  setErrors(newErrors);
                                }
                              }}
                              placeholder="输入邮箱验证码"
                              className={`flex-1 px-4 py-3.5 bg-gray-50 border ${errors.emailCode ? 'border-red-300' : 'border-gray-200'} rounded-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-400`}
                              style={{ fontSize: '15px' }}
                              required
                            />
                            <button
                              type="button"
                              onClick={handleSendEmailCode}
                              disabled={emailCountdown > 0}
                              className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[12px] transition-all whitespace-nowrap disabled:bg-gray-300 disabled:cursor-not-allowed"
                              style={{ fontSize: '14px', fontWeight: 500 }}
                            >
                              {emailCountdown > 0 ? `${emailCountdown}秒` : '获取验证码'}
                            </button>
                          </div>
                          {errors.emailCode && (
                            <p className="mt-1.5 text-red-600 flex items-center gap-1" style={{ fontSize: '12px' }}>
                              <AlertCircle className="w-3.5 h-3.5" />
                              {errors.emailCode}
                            </p>
                          )}
                        </div>

                        {/* Password Input */}
                        <div>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => {
                                setPassword(e.target.value);
                                if (errors.password) {
                                  const newErrors = { ...errors };
                                  delete newErrors.password;
                                  setErrors(newErrors);
                                }
                              }}
                              placeholder="设置密码（至少8位，包含字母和数字）"
                              className={`w-full px-4 py-3.5 pr-12 bg-gray-50 border ${errors.password ? 'border-red-300' : 'border-gray-200'} rounded-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-400`}
                              style={{ fontSize: '15px' }}
                              minLength={8}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {errors.password && (
                            <p className="mt-1.5 text-red-600 flex items-center gap-1" style={{ fontSize: '12px' }}>
                              <AlertCircle className="w-3.5 h-3.5" />
                              {errors.password}
                            </p>
                          )}
                        </div>

                        {/* Confirm Password Input */}
                        <div>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                if (errors.confirmPassword) {
                                  const newErrors = { ...errors };
                                  delete newErrors.confirmPassword;
                                  setErrors(newErrors);
                                }
                              }}
                              placeholder="确认密码"
                              className={`w-full px-4 py-3.5 pr-12 bg-gray-50 border ${errors.confirmPassword ? 'border-red-300' : 'border-gray-200'} rounded-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-400`}
                              style={{ fontSize: '15px' }}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {errors.confirmPassword && (
                            <p className="mt-1.5 text-red-600 flex items-center gap-1" style={{ fontSize: '12px' }}>
                              <AlertCircle className="w-3.5 h-3.5" />
                              {errors.confirmPassword}
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Phone Input */}
                        <div>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => {
                              setPhone(e.target.value);
                              if (errors.phone) {
                                const newErrors = { ...errors };
                                delete newErrors.phone;
                                setErrors(newErrors);
                              }
                            }}
                            placeholder="输入手机号码"
                            className={`w-full px-4 py-3.5 bg-gray-50 border ${errors.phone ? 'border-red-300' : 'border-gray-200'} rounded-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-400`}
                            style={{ fontSize: '15px' }}
                            pattern="[0-9]{11}"
                            maxLength={11}
                            required
                          />
                          {errors.phone && (
                            <p className="mt-1.5 text-red-600 flex items-center gap-1" style={{ fontSize: '12px' }}>
                              <AlertCircle className="w-3.5 h-3.5" />
                              {errors.phone}
                            </p>
                          )}
                        </div>

                        {/* Verification Code */}
                        <div>
                          <div className="flex gap-3">
                            <input
                              type="text"
                              value={verificationCode}
                              onChange={(e) => {
                                setVerificationCode(e.target.value);
                                if (errors.verificationCode) {
                                  const newErrors = { ...errors };
                                  delete newErrors.verificationCode;
                                  setErrors(newErrors);
                                }
                              }}
                              placeholder="输入验证码"
                              className={`flex-1 px-4 py-3.5 bg-gray-50 border ${errors.verificationCode ? 'border-red-300' : 'border-gray-200'} rounded-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-400`}
                              style={{ fontSize: '15px' }}
                              maxLength={6}
                              required
                            />
                            <button
                              type="button"
                              onClick={handleSendPhoneCode}
                              disabled={countdown > 0}
                              className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[12px] transition-all whitespace-nowrap disabled:bg-gray-300 disabled:cursor-not-allowed"
                              style={{ fontSize: '14px', fontWeight: 500 }}
                            >
                              {countdown > 0 ? `${countdown}秒` : '获取验证码'}
                            </button>
                          </div>
                          {errors.verificationCode && (
                            <p className="mt-1.5 text-red-600 flex items-center gap-1" style={{ fontSize: '12px' }}>
                              <AlertCircle className="w-3.5 h-3.5" />
                              {errors.verificationCode}
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    {/* Terms Agreement */}
                    <div className="pt-2">
                      <label className="flex items-start gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-gray-600 select-none text-left" style={{ fontSize: '13px', fontWeight: 400, lineHeight: '1.5' }}>
                          我已阅读并同意
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setShowTerms(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-700 hover:underline ml-1"
                          >
                            服务条款
                          </button>
                          {' '}和{' '}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setShowPrivacy(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-700 hover:underline"
                          >
                            隐私政策
                          </button>
                        </span>
                      </label>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading || !agreedToTerms}
                      className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-[12px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                      style={{ fontSize: '15px', fontWeight: 600 }}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          注册中...
                        </>
                      ) : (
                        '创建账号'
                      )}
                    </button>
                  </form>
                )}

                {/* Login Link */}
                <div className="mt-6 text-center">
                  <span className="text-gray-600" style={{ fontSize: '14px', fontWeight: 400 }}>
                    已有账号？
                  </span>
                  <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="ml-1 text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
                    style={{ fontSize: '14px', fontWeight: 500 }}
                  >
                    立即登录
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Terms Modal */}
          <AnimatePresence>
            {showTerms && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowTerms(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[202]"
                />
                <div className="fixed inset-0 z-[203] flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-2xl max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                  >
                    <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-gray-900" style={{ fontSize: '18px', fontWeight: 600 }}>
                        服务条款
                      </h3>
                      <button
                        onClick={() => setShowTerms(false)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-6">
                      <div className="prose prose-sm max-w-none">
                        <h4 className="text-gray-900" style={{ fontSize: '16px', fontWeight: 600 }}>1. 服务说明</h4>
                        <p className="text-gray-700" style={{ fontSize: '14px', lineHeight: '1.6' }}>
                          欢迎使用照片风格克隆服务。本服务由我们提供，旨在帮助用户通过AI技术分析和复制照片风格。使用本服务即表示您同意遵守以下条款。
                        </p>

                        <h4 className="text-gray-900 mt-4" style={{ fontSize: '16px', fontWeight: 600 }}>2. 用户责任</h4>
                        <p className="text-gray-700" style={{ fontSize: '14px', lineHeight: '1.6' }}>
                          • 您必须年满18岁或在监护人同意下使用本服务<br/>
                          • 您对上传的所有内容负责<br/>
                          • 不得上传侵犯他人版权、隐私或其他权利的内容<br/>
                          • 不得使用本服务进行非法活动
                        </p>

                        <h4 className="text-gray-900 mt-4" style={{ fontSize: '16px', fontWeight: 600 }}>3. 知识产权</h4>
                        <p className="text-gray-700" style={{ fontSize: '14px', lineHeight: '1.6' }}>
                          • 您保留上传内容的所有权<br/>
                          • 我们保留提供的AI分析结果和建议的知识产权<br/>
                          • 未经授权不得复制、分发或商业使用我们的服务
                        </p>

                        <h4 className="text-gray-900 mt-4" style={{ fontSize: '16px', fontWeight: 600 }}>4. 免责声明</h4>
                        <p className="text-gray-700" style={{ fontSize: '14px', lineHeight: '1.6' }}>
                          本服务"按原样"提供，我们不对服务的准确性、完整性或适用性做任何保证。使用本服务产生的结果仅供参考。
                        </p>

                        <h4 className="text-gray-900 mt-4" style={{ fontSize: '16px', fontWeight: 600 }}>5. 服务变更</h4>
                        <p className="text-gray-700" style={{ fontSize: '14px', lineHeight: '1.6' }}>
                          我们保留随时修改或终止服务的权利，恕不另行通知。
                        </p>

                        <p className="text-gray-500 mt-6" style={{ fontSize: '12px' }}>
                          最后更新：2025年11月9日
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>

          {/* Privacy Modal */}
          <AnimatePresence>
            {showPrivacy && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowPrivacy(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[202]"
                />
                <div className="fixed inset-0 z-[203] flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-2xl max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                  >
                    <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-gray-900" style={{ fontSize: '18px', fontWeight: 600 }}>
                        隐私政策
                      </h3>
                      <button
                        onClick={() => setShowPrivacy(false)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-6">
                      <div className="prose prose-sm max-w-none">
                        <h4 className="text-gray-900" style={{ fontSize: '16px', fontWeight: 600 }}>1. 信息收集</h4>
                        <p className="text-gray-700" style={{ fontSize: '14px', lineHeight: '1.6' }}>
                          我们收集以下信息以提供服务：<br/>
                          • 账户信息（邮箱、手机号、用户名）<br/>
                          • 上传的照片和图像<br/>
                          • 使用数据和分析记录<br/>
                          • 设备信息和IP地址
                        </p>

                        <h4 className="text-gray-900 mt-4" style={{ fontSize: '16px', fontWeight: 600 }}>2. 信息使用</h4>
                        <p className="text-gray-700" style={{ fontSize: '14px', lineHeight: '1.6' }}>
                          我们使用收集的信息用于：<br/>
                          • 提供和改进服务<br/>
                          • 进行AI模型训练和优化<br/>
                          • 发送服务通知和更新<br/>
                          • 防止欺诈和滥用
                        </p>

                        <h4 className="text-gray-900 mt-4" style={{ fontSize: '16px', fontWeight: 600 }}>3. 信息保护</h4>
                        <p className="text-gray-700" style={{ fontSize: '14px', lineHeight: '1.6' }}>
                          • 我们采用行业标准的加密技术保护您的数据<br/>
                          • 上传的照片仅用于分析，处理后会自动删除<br/>
                          • 未经您的同意，我们不会与第三方分享您的个人信息
                        </p>

                        <h4 className="text-gray-900 mt-4" style={{ fontSize: '16px', fontWeight: 600 }}>4. Cookie使用</h4>
                        <p className="text-gray-700" style={{ fontSize: '14px', lineHeight: '1.6' }}>
                          我们使用Cookie来改善用户体验、记住登录状态和分析使用情况。您可以通过浏览器设置管理Cookie。
                        </p>

                        <h4 className="text-gray-900 mt-4" style={{ fontSize: '16px', fontWeight: 600 }}>5. 您的权利</h4>
                        <p className="text-gray-700" style={{ fontSize: '14px', lineHeight: '1.6' }}>
                          您有权：<br/>
                          • 访问和下载您的数据<br/>
                          • 更正不准确的信息<br/>
                          • 删除您的账户和数据<br/>
                          • 拒绝某些数据处理活动
                        </p>

                        <h4 className="text-gray-900 mt-4" style={{ fontSize: '16px', fontWeight: 600 }}>6. 联系我们</h4>
                        <p className="text-gray-700" style={{ fontSize: '14px', lineHeight: '1.6' }}>
                          如有隐私相关问题，请联系：privacy@photoclone.com
                        </p>

                        <p className="text-gray-500 mt-6" style={{ fontSize: '12px' }}>
                          最后更新：2025年11月9日
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
