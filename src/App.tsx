import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PhotoUploadZone } from './components/PhotoUploadZone';
import { ThemeCardsGrid } from './components/ThemeCardsGrid';
import { SimilarityWarningDialog } from './components/SimilarityWarningDialog';
import { UserMenu } from './components/UserMenu';
import { AnalysisLoading } from './components/AnalysisLoading';
import { ScrollableHero } from './components/ScrollableHero';
import { UserCenter } from './components/UserCenter';
import { AdminPage } from './components/admin/AdminPage';
import { AdminLoginDialog } from './components/admin/AdminLoginDialog';
import { FanNavMenu } from './components/FanNavMenu';
// 注意：TopNav 组件用于其他页面（如订阅页面），home 页面不使用 TopNav，而是直接使用 UserMenu
import { TopNav } from './components/TopNav';
import { SubscriptionPage } from './components/SubscriptionPage';
import { FeasibilityDialog } from './components/FeasibilityDialog';
import { LoginDialog } from './components/LoginDialog';
import { ArrowRight, Loader2, Zap, Sparkles } from 'lucide-react';
import { Toaster } from './components/ui/sonner';
import { analyzeApi, uploadApi, ApiError } from './lib/api';
import { toast } from 'sonner';

interface UploadedImage {
  file: File;
  preview: string;
  uploadId?: string; // 上传后返回的 uploadId
}

type PageView = 'home' | 'upload' | 'results' | 'user-center' | 'admin' | 'subscription';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageView>('home');
  const [sourceImage, setSourceImage] = useState<UploadedImage | null>(null);
  const [targetImage, setTargetImage] = useState<UploadedImage | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [showSimilarityWarning, setShowSimilarityWarning] = useState(false);
  const [similarityScore, setSimilarityScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [showFeasibilityDialog, setShowFeasibilityDialog] = useState(false);
  const [feasibilityResult, setFeasibilityResult] = useState<any>(null);
  // 当前任务 ID（从 Part1 返回，用于 Part2 和风格模拟）
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  // 登录对话框状态（根据注册登录与权限设计方案，点击"开始分析"时检查登录）
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  // 管理员登录对话框状态（根据顶层设计文档第 3.3 节，Ctrl+Shift+A 唤醒管理后台）
  const [showAdminLoginDialog, setShowAdminLoginDialog] = useState(false);
  // home 页面登录状态（根据设计规范：home 页面右上角应该只显示一个头像，而不是居中显示的 TopNav）
  // 使用 state 管理登录状态，并监听 loginStatusChanged 事件，确保登录状态变化时及时更新 UI
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isLoggedIn') === 'true';
    }
    return false;
  });

  // 用于取消正在进行的请求（防止重复请求和 pending 状态）
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  // 用于取消正在进行的上传请求（防止重复上传和 pending 状态）
  const [uploadAbortController, setUploadAbortController] = useState<AbortController | null>(null);

  // 监听登录状态变化事件（当用户登录或登出时触发）
  useEffect(() => {
    const handleLoginStatusChanged = () => {
      if (typeof window !== 'undefined') {
        const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
        setIsLoggedIn(loggedIn);
      }
    };
    
    window.addEventListener('loginStatusChanged', handleLoginStatusChanged);
    
    return () => {
      window.removeEventListener('loginStatusChanged', handleLoginStatusChanged);
    };
  }, []);

  // 组件卸载时取消所有正在进行的请求
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
      if (uploadAbortController) {
        uploadAbortController.abort();
      }
    };
  }, [abortController, uploadAbortController]);

  /**
   * 处理"开始分析"按钮点击
   * 根据注册登录与权限设计方案：必须先登录才能使用分析功能
   * 根据开发方案第 26 节：先进行可行性评估，再决定是否继续
   */
  const handleAnalyze = async () => {
    if (!sourceImage || !targetImage) return;

    // 如果正在分析，取消之前的请求
    if (abortController) {
      abortController.abort();
    }

    // 检查登录状态（根据注册登录与权限设计方案，未登录不允许使用分析功能）
    const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      // 弹出登录对话框
      setShowLoginDialog(true);
      toast.error('请先登录后再使用分析功能');
      return;
    }

    // 创建新的 AbortController，用于取消请求
    const controller = new AbortController();
    setAbortController(controller);

    try {
      // 第一步：执行可行性评估（根据开发方案第 26 节，由系统 CV 算法主导）
      const feasibility = await analyzeApi.feasibility(
        sourceImage.preview,
        targetImage.preview,
        undefined,  // taskId
        controller.signal  // 传递 AbortSignal，支持取消请求
      );
      setFeasibilityResult(feasibility);

      // 检查是否有致命不兼容因子（deal-breakers）
      if (feasibility.dealBreakers && feasibility.dealBreakers.length > 0) {
        toast.error('检测到致命不兼容因素，无法继续分析');
        return;
      }

      // 显示可行性评估对话框，让用户决定是否继续
      setShowFeasibilityDialog(true);
      
      // 清除 AbortController（请求成功完成）
      setAbortController(null);
    } catch (error) {
      console.error('Feasibility check failed:', error);
      
      // 清除 AbortController（请求已完成，无论成功或失败）
      setAbortController(null);
      
      if (error instanceof ApiError) {
        // 如果是请求取消（499），不显示错误提示
        if (error.code === 499) {
          console.log('请求已取消');
          return;
        }
        // 如果是 401 错误，说明 Token 已失效，弹出登录对话框
        if (error.code === 401) {
          setShowLoginDialog(true);
        }
        toast.error(error.message);
      } else {
        toast.error('可行性评估失败，请重试');
      }
    }
  };

  /**
   * 处理可行性评估后的"继续分析"操作
   * 根据开发方案第 14 节：调用 Part1 分析接口
   */
  const handleFeasibilityContinue = async () => {
    setShowFeasibilityDialog(false);
    setIsAnalyzing(true);
    setResults(null);

    // 如果正在分析，取消之前的请求
    if (abortController) {
      abortController.abort();
    }

    // 创建新的 AbortController，用于取消请求
    const controller = new AbortController();
    setAbortController(controller);

    try {
      // 调用 Part1 分析接口（根据开发方案第 14 节）
      const part1Result = await analyzeApi.part1(
        sourceImage.preview,
        targetImage.preview,
        undefined,  // optionalStyle
        controller.signal  // 传递 AbortSignal，支持取消请求
      );

      // 保存 taskId 和 Part1 结果
      setCurrentTaskId(part1Result.taskId);
      
      // 根据开发方案第 14 节，将 structuredAnalysis.sections 映射到 results 对象
      // sections.photoReview → results.review
      // sections.composition → results.composition
      // sections.lighting → results.lighting
      // sections.color → results.color
      const structuredAnalysis = part1Result.structuredAnalysis || {};
      const sections = structuredAnalysis.sections || {};
      
      // 构建 results 对象（根据开发方案第 14 节）
      // 注意：后端返回的 sections.photoReview 包含 naturalLanguage 和 structured 两个字段
      // 前端需要从 structured 中提取数据，并合并 feasibility 字段
      const photoReview = sections.photoReview || {};
      const photoReviewStructured = photoReview.structured || {};
      const photoReviewFeasibility = photoReview.feasibility || null;
      const photoReviewFeasibilityDescription = photoReview.feasibilityDescription || '';
      
      // 扁平化 photoReview 数据（从 structured 中提取字段）
      const flattenedReview = {
        overviewSummary: photoReviewStructured.overviewSummary || '',
        dimensions: photoReviewStructured.dimensions || {},
        photographerStyleSummary: photoReviewStructured.photographerStyleSummary || '',
        feasibility: photoReviewFeasibility,
        feasibilityDescription: photoReviewFeasibilityDescription,
        // 保留 naturalLanguage 以便后续使用
        naturalLanguage: photoReview.naturalLanguage || {},
      };
      
      // 同样处理 composition（从 structured 中提取 advanced_sections）
      const composition = sections.composition || {};
      const compositionStructured = composition.structured || {};
      const flattenedComposition = {
        ...compositionStructured.advanced_sections,  // 展开 advanced_sections 对象
        // 保留 naturalLanguage 以便后续使用
        naturalLanguage: composition.naturalLanguage || {},
      };
      
      // 同样处理 lighting（从 structured 中提取数据）
      const lighting = sections.lighting || {};
      const lightingStructured = lighting.structured || {};
      const flattenedLighting = {
        ...lightingStructured,  // 展开 structured 对象
        // 保留 naturalLanguage 以便后续使用
        naturalLanguage: lighting.naturalLanguage || {},
      };
      
      // 同样处理 color（从 structured 中提取数据）
      const color = sections.color || {};
      const colorStructured = color.structured || {};
      const flattenedColor = {
        ...colorStructured,  // 展开 structured 对象
        // 保留 naturalLanguage 以便后续使用
        naturalLanguage: color.naturalLanguage || {},
      };
      
      const mappedResults = {
        review: flattenedReview,
        composition: flattenedComposition,
        lighting: flattenedLighting,
        color: flattenedColor,
        // 保留原始 structuredAnalysis 以便后续使用
        _structuredAnalysis: structuredAnalysis,
      };
      
      setResults(mappedResults);
      setIsAnalyzing(false);
      setShowResults(true);
      
      // 清除 AbortController（请求成功完成）
      setAbortController(null);
    } catch (error) {
      console.error('Analysis failed:', error);
      setIsAnalyzing(false);
      
      // 清除 AbortController（请求已完成，无论成功或失败）
      setAbortController(null);
      
      if (error instanceof ApiError) {
        // 如果是请求取消（499），不显示错误提示
        if (error.code === 499) {
          console.log('请求已取消');
          return;
        }
        // 检查是否超出用量限制（根据开发方案第 0 节，严格限流）
        if (error.code === 403 && error.message.includes('USAGE_ANALYSIS_LIMIT_EXCEEDED')) {
          toast.error('分析次数已用完，请升级套餐');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('分析失败，请重试');
      }
    }
  };

  const performAnalysis = async () => {
    // 此函数已不再使用，保留用于兼容性
    await handleFeasibilityContinue();
  };

  const handleContinueAnalysis = async () => {
    setIsAnalyzing(true);
    await performAnalysis();
  };

  const canAnalyze = sourceImage && targetImage && !isAnalyzing;

  const handleBackToUpload = () => {
    setShowResults(false);
    setResults(null);
    setCurrentPage('upload');
  };

  const handleNavigate = (page: string) => {
    if (page === 'user-center') {
      setCurrentPage('user-center');
    } else if (page === 'admin') {
      setCurrentPage('admin');
    } else if (page === 'home') {
      setCurrentPage('home');
      setShowResults(false);
      setResults(null);
      setSourceImage(null);
      setTargetImage(null);
    } else if (page === 'upload') {
      setCurrentPage('upload');
      setShowResults(false);
      setResults(null);
    } else if (page === 'subscription') {
      setCurrentPage('subscription');
    }
  };

  // 监听键盘快捷键 Ctrl+Shift+A 打开管理员登录（根据顶层设计文档第 3.3 节）
  // 注意：此快捷键应该在全局范围内生效，不依赖于 UserMenu 组件是否挂载
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // 检查是否按下 Ctrl+Shift+A（Mac 上可能是 Cmd+Shift+A）
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        // 打开管理员登录对话框
        setShowAdminLoginDialog(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // 处理管理员登录成功
  const handleAdminLogin = () => {
    setShowAdminLoginDialog(false);
    setCurrentPage('admin');
  };

  // Show admin page
  if (currentPage === 'admin') {
    return (
      <>
        <AdminPage onBack={() => setCurrentPage('home')} />
        <Toaster position="top-center" richColors closeButton />
        {/* 管理员登录对话框（全局快捷键 Ctrl+Shift+A 触发） */}
        <AdminLoginDialog
          isOpen={showAdminLoginDialog}
          onClose={() => setShowAdminLoginDialog(false)}
          onLogin={handleAdminLogin}
        />
      </>
    );
  }

  // Show subscription page
  if (currentPage === 'subscription') {
    return (
      <>
        <SubscriptionPage onBack={() => setCurrentPage('home')} />
        <Toaster position="top-center" richColors closeButton />
        {/* 管理员登录对话框（全局快捷键 Ctrl+Shift+A 触发） */}
        <AdminLoginDialog
          isOpen={showAdminLoginDialog}
          onClose={() => setShowAdminLoginDialog(false)}
          onLogin={handleAdminLogin}
        />
      </>
    );
  }

  // Show user center
  if (currentPage === 'user-center') {
    return (
      <>
        <UserCenter onBack={() => setCurrentPage('home')} />
        <Toaster position="top-center" richColors closeButton />
        {/* 管理员登录对话框（全局快捷键 Ctrl+Shift+A 触发） */}
        <AdminLoginDialog
          isOpen={showAdminLoginDialog}
          onClose={() => setShowAdminLoginDialog(false)}
          onLogin={handleAdminLogin}
        />
      </>
    );
  }

  // Show theme cards grid if analysis is complete
  if (showResults && results) {
    return (
      <>
        <ThemeCardsGrid
          results={results}
          sourceImageUrl={sourceImage?.preview || ''}
          targetImageUrl={targetImage?.preview || ''}
          onBack={handleBackToUpload}
          taskId={currentTaskId || undefined}
        />
        <Toaster position="top-center" richColors closeButton />
        {/* 管理员登录对话框（全局快捷键 Ctrl+Shift+A 触发） */}
        <AdminLoginDialog
          isOpen={showAdminLoginDialog}
          onClose={() => setShowAdminLoginDialog(false)}
          onLogin={handleAdminLogin}
        />
      </>
    );
  }

  // 将 renderUploadContent 和 renderUploadPage 作为组件内部的普通函数
  // 它们不是 hooks，只是普通的渲染函数，不会导致 React Hooks 顺序错误
  // React Hooks 顺序错误是指 useState、useEffect 等 hooks 的调用顺序不一致
  const renderUploadContent = () => {
    return (
      <div className="space-y-12 max-w-6xl mx-auto">
        {/* Section Title & Subtitle */}
        <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center space-y-4"
            >
              <h1 
                className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
                style={{ 
                  fontSize: '56px', 
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  lineHeight: '1.1'
                }}
              >
                照片风格克隆
              </h1>
              <p className="text-gray-600 max-w-2xl mx-auto" style={{ fontSize: '18px', lineHeight: '1.6' }}>
                上传参考照片和目标照片，AI 将分析并生成专业的调整方案
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 items-center">
              <PhotoUploadZone
                title="源照片"
                description="上传想要模仿风格的参考照片"
                onImageUpload={async (file, preview) => {
                  // 检查登录状态（根据注册登录与权限设计方案，上传需要登录）
                  const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('isLoggedIn') === 'true';
                  if (!isLoggedIn) {
                    toast.error('请先登录后再上传照片');
                    setShowLoginDialog(true);
                    return;
                  }
                  
                  // 如果正在上传，取消之前的请求
                  if (uploadAbortController) {
                    uploadAbortController.abort();
                  }
                  
                  // 创建新的 AbortController，用于取消上传请求
                  const controller = new AbortController();
                  setUploadAbortController(controller);
                  
                  // 先设置预览
                  setSourceImage({ file, preview });
                  // 然后调用上传 API
                  try {
                    const response = await uploadApi.uploadPhotos(file, undefined, controller.signal);
                    // 后端返回的字段是 uploadId，不是 source_image_id
                    setSourceImage(prev => prev ? { ...prev, uploadId: response.uploadId } : null);
                    // 清除 AbortController（请求成功完成）
                    setUploadAbortController(null);
                  } catch (error) {
                    console.error('源照片上传失败:', error);
                    // 清除 AbortController（请求已完成，无论成功或失败）
                    setUploadAbortController(null);
                    
                    if (error instanceof ApiError) {
                      // 如果是请求取消（499），不显示错误提示
                      if (error.code === 499) {
                        console.log('上传请求已取消');
                        return;
                      }
                      // 如果是 401 错误，说明 Token 已失效，弹出登录对话框
                      if (error.code === 401) {
                        toast.error('登录已过期，请重新登录');
                        setShowLoginDialog(true);
                      } else {
                        toast.error(error.message || '源照片上传失败，请重试');
                      }
                    } else {
                      toast.error('源照片上传失败，请重试');
                    }
                  }
                }}
                image={sourceImage?.preview || null}
                onRemove={() => setSourceImage(null)}
                index={0}
              />

              <div className="flex justify-center lg:px-6">
                <motion.div
                  animate={{
                    x: [0, 8, 0],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="p-3 bg-white rounded-full shadow-lg border border-gray-200"
                >
                  <ArrowRight className="w-6 h-6 text-gray-400" />
                </motion.div>
              </div>

              <PhotoUploadZone
                title="目标照片"
                description="上传需要调整风格的照片"
                onImageUpload={async (file, preview) => {
                  // 检查登录状态（根据注册登录与权限设计方案，上传需要登录）
                  const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('isLoggedIn') === 'true';
                  if (!isLoggedIn) {
                    toast.error('请先登录后再上传照片');
                    setShowLoginDialog(true);
                    return;
                  }
                  
                  // 如果正在上传，取消之前的请求
                  if (uploadAbortController) {
                    uploadAbortController.abort();
                  }
                  
                  // 创建新的 AbortController，用于取消上传请求
                  const controller = new AbortController();
                  setUploadAbortController(controller);
                  
                  // 先设置预览
                  setTargetImage({ file, preview });
                  // 然后调用上传 API
                  try {
                    const response = await uploadApi.uploadPhotos(sourceImage?.file || file, file, controller.signal);
                    // 后端返回的字段是 uploadId，不是 target_image_id
                    setTargetImage(prev => prev ? { ...prev, uploadId: response.uploadId } : null);
                    // 清除 AbortController（请求成功完成）
                    setUploadAbortController(null);
                  } catch (error) {
                    console.error('目标照片上传失败:', error);
                    // 清除 AbortController（请求已完成，无论成功或失败）
                    setUploadAbortController(null);
                    
                    if (error instanceof ApiError) {
                      // 如果是请求取消（499），不显示错误提示
                      if (error.code === 499) {
                        console.log('上传请求已取消');
                        return;
                      }
                      // 如果是 401 错误，说明 Token 已失效，弹出登录对话框
                      if (error.code === 401) {
                        toast.error('登录已过期，请重新登录');
                        setShowLoginDialog(true);
                      } else {
                        toast.error(error.message || '目标照片上传失败，请重试');
                      }
                    } else {
                      toast.error('目标照片上传失败，请重试');
                    }
                  }
                }}
                image={targetImage?.preview || null}
                onRemove={() => setTargetImage(null)}
                index={1}
              />
            </div>

            {/* Analyze Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex justify-center"
            >
              <motion.button
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                className={`group relative px-12 py-5 rounded-2xl overflow-hidden transition-all duration-300 ${
                  canAnalyze
                    ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 shadow-2xl hover:shadow-3xl cursor-pointer'
                    : 'bg-gray-200 cursor-not-allowed'
                }`}
                whileHover={canAnalyze ? { scale: 1.05, y: -2 } : {}}
                whileTap={canAnalyze ? { scale: 0.98 } : {}}
              >
                {/* Shine effect */}
                {canAnalyze && (
                  <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700" />
                )}
                
                <span className={`relative flex items-center gap-3 ${canAnalyze ? 'text-white' : 'text-gray-400'}`} style={{ fontSize: '18px', fontWeight: 700 }}>
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      正在分析中...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      开始 AI 分析
                    </>
                  )}
                </span>
              </motion.button>
            </motion.div>

          {/* Loading State - Full Screen Beautiful Loading */}
          <AnimatePresence>
            {isAnalyzing && <AnalysisLoading />}
          </AnimatePresence>

          {/* Similarity Warning Dialog */}
          <SimilarityWarningDialog
            open={showSimilarityWarning}
            onOpenChange={setShowSimilarityWarning}
            similarity={similarityScore}
            onContinue={handleContinueAnalysis}
          />

          {/* Feasibility Dialog */}
          <FeasibilityDialog
            open={showFeasibilityDialog}
            onClose={() => setShowFeasibilityDialog(false)}
            onContinue={handleFeasibilityContinue}
            sourceImage={sourceImage?.preview || ''}
            targetImage={targetImage?.preview || ''}
            feasibilityResult={feasibilityResult}
          />

          {/* Login Dialog - 点击"开始分析"时如果未登录则弹出 */}
          <LoginDialog
            isOpen={showLoginDialog}
            onClose={() => setShowLoginDialog(false)}
          />
          
          {/* 管理员登录对话框（全局快捷键 Ctrl+Shift+A 触发） */}
          <AdminLoginDialog
            isOpen={showAdminLoginDialog}
            onClose={() => setShowAdminLoginDialog(false)}
            onLogin={handleAdminLogin}
          />
      </div>
    );
  };

  const renderUploadPage = () => {
    return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* User Menu - Always visible */}
      <div className="fixed top-6 right-6 z-50">
        <UserMenu onNavigate={handleNavigate} />
      </div>
      
      <div className="relative min-h-screen flex items-center justify-center">
        {/* Subtle background gradient */}
        <div className="fixed inset-0 pointer-events-none">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.03, 0.05, 0.03],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute -top-64 -right-64 w-[800px] h-[800px] bg-blue-400 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.03, 0.05, 0.03],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute -bottom-64 -left-64 w-[800px] h-[800px] bg-purple-400 rounded-full blur-3xl"
          />
        </div>

        <div className="container mx-auto px-6 py-16 relative z-10">
          {renderUploadContent()}
          
          {/* Toast Notifications */}
          <Toaster 
            position="top-center"
            richColors
            closeButton
          />
          
          {/* 管理员登录对话框（全局快捷键 Ctrl+Shift+A 触发） */}
          <AdminLoginDialog
            isOpen={showAdminLoginDialog}
            onClose={() => setShowAdminLoginDialog(false)}
            onLogin={handleAdminLogin}
          />
        </div>
      </div>
    </div>
    );
  };

  // Show home page with hero
  if (currentPage === 'home') {
    // 根据设计规范：home 页面右上角应该只显示一个头像（UserMenu），而不是居中显示的 TopNav
    // 如果已登录，显示 UserMenu；如果未登录，ScrollableHero 中的 FanNavMenu 会处理登录/订阅按钮
    return (
      <>
        {/* 右上角用户菜单（仅当已登录时显示） */}
        {isLoggedIn && (
          <div className="fixed top-6 right-6 z-50">
            <UserMenu onNavigate={handleNavigate} />
          </div>
        )}
        <ScrollableHero onNavigate={handleNavigate}>
          {renderUploadContent()}
        </ScrollableHero>
        <Toaster position="top-center" richColors closeButton />
        {/* 管理员登录对话框（全局快捷键 Ctrl+Shift+A 触发） */}
        <AdminLoginDialog
          isOpen={showAdminLoginDialog}
          onClose={() => setShowAdminLoginDialog(false)}
          onLogin={handleAdminLogin}
        />
      </>
    );
  }

  // Show upload page directly
  return renderUploadPage();
}