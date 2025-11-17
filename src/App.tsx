import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PhotoUploadZone } from './components/PhotoUploadZone';
import { ThemeCardsGrid } from './components/ThemeCardsGrid';
import { SimilarityWarningDialog } from './components/SimilarityWarningDialog';
import { UserMenu } from './components/UserMenu';
import { AnalysisLoading } from './components/AnalysisLoading';
import { ScrollableHero } from './components/ScrollableHero';
import { UserCenter } from './components/UserCenter';
import { AdminPage } from './components/admin/AdminPage';
import { FanNavMenu } from './components/FanNavMenu';
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

  /**
   * 处理"开始分析"按钮点击
   * 根据注册登录与权限设计方案：必须先登录才能使用分析功能
   * 根据开发方案第 26 节：先进行可行性评估，再决定是否继续
   */
  const handleAnalyze = async () => {
    if (!sourceImage || !targetImage) return;

    // 检查登录状态（根据注册登录与权限设计方案，未登录不允许使用分析功能）
    const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      // 弹出登录对话框
      setShowLoginDialog(true);
      toast.error('请先登录后再使用分析功能');
      return;
    }

    try {
      // 第一步：执行可行性评估（根据开发方案第 26 节，由系统 CV 算法主导）
      const feasibility = await analyzeApi.feasibility(
        sourceImage.preview,
        targetImage.preview
      );
      setFeasibilityResult(feasibility);

      // 检查是否有致命不兼容因子（deal-breakers）
      if (feasibility.dealBreakers && feasibility.dealBreakers.length > 0) {
        toast.error('检测到致命不兼容因素，无法继续分析');
        return;
      }

      // 显示可行性评估对话框，让用户决定是否继续
    setShowFeasibilityDialog(true);
    } catch (error) {
      console.error('Feasibility check failed:', error);
      if (error instanceof ApiError) {
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

    try {
      // 调用 Part1 分析接口（根据开发方案第 14 节）
      const part1Result = await analyzeApi.part1(
        sourceImage.preview,
        targetImage.preview
      );

      // 保存 taskId 和 Part1 结果
      setCurrentTaskId(part1Result.taskId);
      setResults(part1Result.structuredAnalysis);
        setIsAnalyzing(false);
      setShowResults(true);
    } catch (error) {
      console.error('Analysis failed:', error);
      setIsAnalyzing(false);
      if (error instanceof ApiError) {
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

  // Show admin page
  if (currentPage === 'admin') {
    return (
      <>
        <AdminPage onBack={() => setCurrentPage('home')} />
        <Toaster position="top-center" richColors closeButton />
      </>
    );
  }

  // Show subscription page
  if (currentPage === 'subscription') {
    return (
      <>
        <SubscriptionPage onBack={() => setCurrentPage('home')} />
        <Toaster position="top-center" richColors closeButton />
      </>
    );
  }

  // Show user center
  if (currentPage === 'user-center') {
    return (
      <>
        <UserCenter onBack={() => setCurrentPage('home')} />
        <Toaster position="top-center" richColors closeButton />
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
      </>
    );
  }

  // Show home page with hero
  if (currentPage === 'home') {
    const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('isLoggedIn') === 'true';
    
    return (
      <>
        {isLoggedIn && (
          <div className="fixed top-6 right-6 z-50">
            <UserMenu onNavigate={handleNavigate} />
          </div>
        )}
        <ScrollableHero onNavigate={handleNavigate}>
          {renderUploadContent()}
        </ScrollableHero>
        <Toaster position="top-center" richColors closeButton />
      </>
    );
  }

  // Show upload page directly
  return renderUploadPage();

  function renderUploadContent() {
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
                  // 先设置预览
                  setSourceImage({ file, preview });
                  // 然后调用上传 API
                  try {
                    const response = await uploadApi.uploadPhotos(file);
                    setSourceImage(prev => prev ? { ...prev, uploadId: response.source_image_id } : null);
                  } catch (error) {
                    console.error('源照片上传失败:', error);
                    toast.error('源照片上传失败，请重试');
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
                  // 先设置预览
                  setTargetImage({ file, preview });
                  // 然后调用上传 API
                  try {
                    const response = await uploadApi.uploadPhotos(sourceImage?.file || file, file);
                    setTargetImage(prev => prev ? { ...prev, uploadId: response.target_image_id || response.source_image_id } : null);
                  } catch (error) {
                    console.error('目标照片上传失败:', error);
                    toast.error('目标照片上传失败，请重试');
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
      </div>
    );
  }

  function renderUploadPage() {
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
        </div>
      </div>
    </div>
    );
  }
}