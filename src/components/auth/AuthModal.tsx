/**
 * 认证模态框组件
 * 支持邮箱/手机号登录注册，以及支付宝扫码登录
 * 根据开发方案第 740-753 行实现认证功能对接
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Smartphone, QrCode, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { api, setAuthToken, ApiError } from '../../src/lib/api';
import { toast } from 'sonner';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

type AuthMethod = 'email' | 'phone' | 'alipay';
type AuthMode = 'login' | 'register';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const { t } = useLanguage();
  const [method, setMethod] = useState<AuthMethod>('email');
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  
  // 表单状态管理
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  
  // Verification Code Logic
  const [countdown, setCountdown] = useState(0);
  const [useCodeLogin, setUseCodeLogin] = useState(false); // Toggle for Phone Login (Password vs Code)

  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  /**
   * 发送验证码
   * 根据开发方案第 743、750 行实现
   * 
   * 注意：后端接口路径为 /api/auth/send-verification-code
   * 请求体格式：{ type: 'register' | 'login', email: string }
   */
  const handleSendCode = async () => {
    if (countdown > 0) return;
    
    const identifier = method === 'email' ? email : phone;
    if (!identifier) {
      toast.error(method === 'email' ? '请输入邮箱' : '请输入手机号');
      return;
    }
    
    // 【日志】记录发送验证码请求
    console.log('[AuthModal] 发送验证码请求:', {
      method,
      mode,
      identifier: method === 'email' ? email : phone
    });
    
    try {
      setIsLoading(true);
      
      // 构建请求参数
      // 【重要】后端接口只支持 email，不支持 phone（根据后端代码 server_py/app/routes/auth.py 第 38-41 行）
      // 如果用户选择手机号，需要提示使用邮箱
      if (method === 'phone') {
        toast.error('当前版本仅支持邮箱验证码，请切换到邮箱登录');
        setIsLoading(false);
        return;
      }
      
      const requestData: { type: 'register' | 'login', email: string } = {
        type: mode === 'register' ? 'register' : 'login',
        email: identifier // 此时 identifier 一定是 email
      };
      
      // 【日志】记录请求参数
      console.log('[AuthModal] API 请求参数:', requestData);
      
      const result = await api.auth.sendVerificationCode(requestData);
      
      // 【日志】记录响应结果
      console.log('[AuthModal] API 响应结果:', result);
      
      setCountdown(60);
      toast.success('验证码已发送');
    } catch (error: any) {
      // 【日志】记录错误信息
      console.error('[AuthModal] 发送验证码失败:', error);
      
      // 【重要】根据错误码显示不同的提示信息
      // 根据注册登录与权限设计方案第 2.3 节，登录模式下邮箱未注册应该提示用户切换到注册模式
      // 注意：错误码可能是字符串（如 'EMAIL_NOT_REGISTERED'）或数字（如 0 表示成功）
      const errorCode = error instanceof ApiError ? error.code : (error.code || null);
      const errorMessage = error instanceof ApiError ? error.message : (error.message || '发送验证码失败');
      
      // 【日志】记录错误码和错误消息
      console.log('[AuthModal] 错误码:', errorCode, '错误消息:', errorMessage);
      
      if (errorCode === 'EMAIL_NOT_REGISTERED' || errorMessage?.includes('邮箱未注册')) {
        // 登录模式下，邮箱未注册，提示用户切换到注册模式
        // 根据注册登录与权限设计方案第 2.3 节，应该提示用户先注册
        if (mode === 'login') {
          toast.error('该邮箱未注册，请切换到注册模式或使用已注册的邮箱登录');
          // 【可选】自动切换到注册模式（用户体验优化）
          // setMode('register');
        } else {
          // 注册模式下不应该出现此错误，但为了安全起见也处理
          toast.error('邮箱未注册，请先注册');
        }
      } else if (errorCode === 'EMAIL_ALREADY_REGISTERED' || errorMessage?.includes('邮箱已注册')) {
        // 注册模式下，邮箱已注册，提示用户切换到登录模式
        if (mode === 'register') {
          toast.error('该邮箱已注册，请切换到登录模式');
          // 【可选】自动切换到登录模式（用户体验优化）
          // setMode('login');
        } else {
          toast.error('邮箱已注册');
        }
      } else if (errorCode === 'SEND_CODE_TOO_FREQUENT' || errorMessage?.includes('发送过于频繁')) {
        toast.error('发送过于频繁，请稍后再试');
      } else if (errorCode === 'EMAIL_SEND_FAILED' || errorMessage?.includes('邮件发送失败')) {
        toast.error('邮件发送失败，请稍后重试');
      } else {
        // 其他错误，显示原始错误消息
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 提交表单（登录/注册）
   * 根据开发方案第 744-753 行实现
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const identifier = method === 'email' ? email : phone;
      
      // 注册流程
      if (mode === 'register') {
        if (!identifier || !password || !code) {
          toast.error('请填写完整信息');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          toast.error('两次密码不一致');
          setIsLoading(false);
          return;
        }
        
        const result: any = await api.auth.register({
          [method === 'email' ? 'email' : 'phone']: identifier,
          password,
          code
        });
        
        // 保存 token
        if (result?.accessToken) {
          setAuthToken(result.accessToken);
          // 获取用户信息
          const user = await api.auth.me();
          toast.success('注册成功');
          onLoginSuccess();
        }
      } 
      // 登录流程
      else {
        if (!identifier) {
          toast.error(method === 'email' ? '请输入邮箱' : '请输入手机号');
          setIsLoading(false);
          return;
        }
        
        let result;
        
        // 验证码登录
        if (useCodeLogin) {
          if (!code) {
            toast.error('请输入验证码');
            setIsLoading(false);
            return;
          }
          // 验证码登录只支持邮箱
          if (method === 'email') {
            result = await api.auth.loginWithCode({
              email: identifier,
              code
            });
          } else {
            toast.error('手机号验证码登录暂不支持，请使用密码登录');
            setIsLoading(false);
            return;
          }
        } 
        // 密码登录
        else {
          if (!password) {
            toast.error('请输入密码');
            setIsLoading(false);
            return;
          }
          result = await api.auth.login({
            [method === 'email' ? 'email' : 'phone']: identifier,
            password
          });
        }
        
        // 【日志记录】记录登录响应
        console.log('[AuthModal] ✅ 登录 API 调用成功，收到响应:', {
          hasResult: !!result,
          resultType: typeof result,
          resultKeys: result ? Object.keys(result) : [],
          hasAccessToken: !!(result as any)?.accessToken,
          timestamp: new Date().toISOString()
        });
        
        // 保存 token
        const loginResult: any = result;
        if (loginResult?.accessToken) {
          // 【日志记录】记录 Token 保存
          console.log('[AuthModal] 保存 Token 到本地存储...');
          setAuthToken(loginResult.accessToken);
          
          // 【日志记录】记录获取用户信息请求
          console.log('[AuthModal] 开始获取用户信息...');
          try {
          // 获取用户信息
          const user = await api.auth.me();
            console.log('[AuthModal] ✅ 用户信息获取成功:', {
              userId: user?.id,
              email: user?.email,
              timestamp: new Date().toISOString()
            });
          toast.success('登录成功');
          onLoginSuccess();
          } catch (meError: any) {
            // 【错误处理】获取用户信息失败，但登录已成功，仍然允许登录
            console.error('[AuthModal] ⚠️ 获取用户信息失败，但登录已成功:', meError);
            // 即使获取用户信息失败，也允许登录（因为 Token 已经保存）
            toast.success('登录成功（用户信息获取失败，请刷新页面）');
            onLoginSuccess();
          }
        } else {
          // 【错误处理】如果没有返回 accessToken，说明登录失败
          console.error('[AuthModal] ❌ 登录失败：未返回 accessToken', loginResult);
          toast.error('登录失败：服务器未返回有效凭证');
        }
      }
    } catch (error: any) {
      // 【错误处理】记录详细错误信息
      console.error('[AuthModal] 登录/注册错误:', error);
      console.error('[AuthModal] 错误类型:', error?.constructor?.name);
      console.error('[AuthModal] 错误消息:', error?.message);
      console.error('[AuthModal] 错误堆栈:', error?.stack);
      
      // 【用户友好的错误提示】
      let errorMessage = '操作失败，请重试';
      if (error instanceof ApiError) {
        // 如果是 ApiError，显示后端返回的错误消息
        errorMessage = error.message || '操作失败，请检查网络连接或稍后重试';
        // 特殊处理某些错误码
        if (error.code === 'AUTH_LOGIN_FAILED') {
          // 【优化】登录失败时，提示用户如果还没有账号可以注册
          // 注意：不区分"用户不存在"和"密码错误"是安全最佳实践，防止用户枚举攻击
          errorMessage = mode === 'login' 
            ? t('auth.login_failed_hint') // 使用翻译，支持中英文
            : '注册失败，请检查后重试';
        } else if (error.code === 'NETWORK_ERROR') {
          errorMessage = t('auth.network_error');
        } else if (error.code === 'TIMEOUT_ERROR') {
          errorMessage = t('auth.timeout_error');
        } else if (error.code === 'EMAIL_NOT_REGISTERED') {
          // 【新增】如果邮箱未注册，提示用户去注册
          errorMessage = t('auth.email_not_registered');
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset state when switching modes/methods
  React.useEffect(() => {
    setCountdown(0);
    setUseCodeLogin(false);
    // 清空表单
    setEmail('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setCode('');
  }, [method, mode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-md bg-carbon-900 border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
      >
        {/* Header Decoration */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-optic-accent to-transparent" />
        <div className="absolute top-0 right-0 p-4">
            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
                <X className="w-5 h-5" />
            </button>
        </div>

        <div className="p-8">
            <div className="mb-8 text-center">
                <h2 className="text-2xl font-display font-bold text-white tracking-wider mb-2">
                    {mode === 'login' ? t('auth.verify_identity') : t('auth.new_operator')}
                </h2>
                <p className="text-xs text-white/40 font-mono">{t('auth.protocol_v5')}</p>
            </div>

            {/* Method Tabs */}
            <div className="flex bg-black/40 rounded-lg p-1 mb-8 border border-white/5">
                {(['email', 'phone', 'alipay'] as const).map((m) => (
                    <button
                        key={m}
                        onClick={() => setMethod(m)}
                        className={`flex-1 flex items-center justify-center py-2 rounded-md text-xs font-bold transition-all ${
                            method === m ? 'bg-white/10 text-optic-accent shadow-sm' : 'text-white/30 hover:text-white/60'
                        }`}
                    >
                        {m === 'email' && <Mail className="w-4 h-4 mr-2" />}
                        {m === 'phone' && <Smartphone className="w-4 h-4 mr-2" />}
                        {m === 'alipay' && <QrCode className="w-4 h-4 mr-2" />}
                        <span className="uppercase">{m}</span>
                    </button>
                ))}
            </div>

            <div className="min-h-[200px]">
                <AnimatePresence mode="wait">
                    {/* EMAIL & PHONE FORM */}
                    {(method === 'email' || method === 'phone') && (
                        <motion.form
                            key="form"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onSubmit={handleSubmit}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-white/50 ml-1">
                                    {method === 'email' ? t('auth.email_addr') : t('auth.mobile_num')}
                                </label>
                                <Input 
                                    type={method === 'email' ? 'email' : 'tel'} 
                                    placeholder={method === 'email' ? 'operator@photoscience.ai' : '+86 1XX XXXX XXXX'}
                                    className="bg-black/20 border-white/10 text-white focus:border-optic-accent/50 h-12 font-mono"
                                    value={method === 'email' ? email : phone}
                                    onChange={(e) => method === 'email' ? setEmail(e.target.value) : setPhone(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Password Field - Hidden if using Code Login (Phone/Email login) */}
                            {!(mode === 'login' && useCodeLogin) && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] uppercase font-bold text-white/50 ml-1">
                                            {t('auth.password')}
                                        </label>
                                        {/* Switch for Code Login (Login Mode Only) */}
                                        {mode === 'login' && (
                                            <button 
                                                type="button" 
                                                onClick={() => setUseCodeLogin(true)}
                                                className="text-[10px] text-optic-accent hover:text-white transition-colors"
                                            >
                                                {t('auth.use_code')}
                                            </button>
                                        )}
                                    </div>
                                    <Input 
                                        type="password" 
                                        placeholder="••••••••••••"
                                        className="bg-black/20 border-white/10 text-white focus:border-optic-accent/50 h-12 font-mono"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required={!(mode === 'login' && useCodeLogin)}
                                    />
                                </div>
                            )}

                            {/* Confirm Password - Only in Register Mode */}
                            {mode === 'register' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-white/50 ml-1">
                                        {t('auth.confirm_password')}
                                    </label>
                                    <Input 
                                        type="password" 
                                        placeholder="••••••••••••"
                                        className="bg-black/20 border-white/10 text-white focus:border-optic-accent/50 h-12 font-mono"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            )}

                            {/* Verification Code Field */}
                            {/* Show if: Registering (Both) OR Login with Code (Both) */}
                            {(mode === 'register' || (mode === 'login' && useCodeLogin)) && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] uppercase font-bold text-white/50 ml-1">
                                            {method === 'email' ? t('auth.email_code') : t('auth.sms_code')}
                                        </label>
                                        {/* Switch back to Password for Login */}
                                        {mode === 'login' && useCodeLogin && (
                                            <button 
                                                type="button" 
                                                onClick={() => setUseCodeLogin(false)}
                                                className="text-[10px] text-optic-accent hover:text-white transition-colors"
                                            >
                                                {t('auth.use_pass')}
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Input 
                                            placeholder="6-Digit Code" 
                                            className="bg-black/20 border-white/10 text-white font-mono tracking-widest"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value)}
                                            maxLength={6}
                                            required
                                        />
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            onClick={handleSendCode}
                                            disabled={countdown > 0}
                                            className="border-white/10 text-white/70 whitespace-nowrap w-32 font-mono text-xs hover:bg-white/5 hover:text-white"
                                        >
                                            {countdown > 0 ? `${countdown}s` : t('auth.get_code')}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <Button 
                                type="submit" 
                                className="w-full bg-optic-accent hover:bg-optic-accent/80 text-black font-bold h-12 mt-4 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <span className="animate-pulse">{t('auth.verifying')}</span>
                                ) : (
                                    <span className="flex items-center">
                                        {mode === 'login' ? t('auth.access_system') : t('auth.establish_id')} 
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </span>
                                )}
                            </Button>
                        </motion.form>
                    )}

                    {/* ALIPAY QR CODE */}
                    {method === 'alipay' && (
                        <motion.div
                            key="alipay"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex flex-col items-center justify-center h-full py-4"
                        >
                            <div className="relative group cursor-pointer" onClick={onLoginSuccess}>
                                <div className="absolute -inset-1 bg-gradient-to-br from-[#1677FF] to-[#00A3FF] rounded-xl blur opacity-40 group-hover:opacity-70 transition-opacity"></div>
                                <div className="relative bg-white p-4 rounded-lg">
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PhotoScienceLogin_${Date.now()}`} 
                                        alt="Alipay QR" 
                                        className="w-40 h-40 mix-blend-multiply"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-lg">
                                        <span className="text-[#1677FF] font-bold text-sm">Click to Simulate Scan</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 flex items-center gap-2 text-white/60">
                                <ShieldCheck className="w-4 h-4 text-[#1677FF]" />
                                <span className="text-xs">Secured by Alipay Smart Guard</span>
                            </div>
                            <p className="text-[10px] text-white/30 mt-2 text-center max-w-[200px]">
                                Scan with Alipay App to instantly authorize access.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer Toggle */}
            <div className="mt-8 pt-6 border-t border-white/5 text-center">
                <p className="text-xs text-white/40">
                    {mode === 'login' ? t('auth.no_account') : t('auth.has_account')}
                    <button 
                        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                        className="text-optic-accent hover:text-white transition-colors font-bold ml-1 hover:underline"
                    >
                        {mode === 'login' ? t('auth.register') : t('auth.login')}
                    </button>
                </p>
            </div>
        </div>
      </motion.div>
    </div>
  );
};
