import React, { useState, useEffect, useRef } from 'react';
import { ThemeCardsGrid } from './components/ThemeCardsGrid';
import { StyleSimulationStage } from './components/StyleSimulationStage';
import { PhotoUploadZone } from './components/PhotoUploadZone';
import { api } from './src/lib/api';
import { adaptBackendToFrontend } from './src/lib/dataAdapter';
import { toast } from 'sonner@2.0.3';

import { AnalysisTransition } from './components/transitions/AnalysisTransition';
import { SimulationTransition } from './components/transitions/SimulationTransition';
import { LoginTransition } from './components/transitions/LoginTransition';
import { AnimatePresence } from 'motion/react';
import { UserProfile } from './components/UserProfile';
import { Lock } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "./components/ui/tooltip";
import { LandingPage } from './components/landing/LandingPage';
import { ParticleBackground } from './components/ui/ParticleBackground';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';

// --- WRAPPER COMPONENT FOR LANGUAGE CONTEXT ACCESS ---
const AppContent = () => {
  const { t } = useLanguage();
  const [view, setView] = useState<'landing' | 'app'>('landing');
  const [stage, setStage] = useState<'upload' | 'analysis' | 'simulation'>('upload');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [showSimTransition, setShowSimTransition] = useState(false);
  const [showLoginTransition, setShowLoginTransition] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); // 【新增】标记是否正在检查登录状态
  
  // Image State
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [images, setImages] = useState({ source: "", target: "" });
  
  // API Data State
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  
  // 【重要】用于同时触发两个图片的 AI 诊断
  // 用户需求：无论点击哪一个"启动深度扫描"按钮，两边都同时启动 AI 分析
  const sourceDashboardRef = useRef<{ triggerDiagnosis: () => void } | null>(null);
  const targetDashboardRef = useRef<{ triggerDiagnosis: () => void } | null>(null);
  
  // 【重要】处理"启动深度扫描"按钮点击
  // 无论点击哪一个按钮，都同时触发两个图片的诊断
  // 【修复】添加防重复触发机制，避免多次点击导致重复触发
  const isTriggeringRef = useRef(false); // 用于跟踪是否正在触发诊断
  
  const handleStartDiagnosis = () => {
    // 【防重复触发】如果正在触发中，直接返回
    if (isTriggeringRef.current) {
      console.warn('[App] 诊断正在触发中，跳过重复调用');
      return;
    }
    
    console.log('[App] handleStartDiagnosis 被调用，准备同时触发两个图片的诊断');
    
    // 设置触发标志
    isTriggeringRef.current = true;
    
    try {
      // 【重要】同时触发参考图和用户图的 AI 诊断
      // 直接调用 triggerDiagnosis，不需要 Promise.all，因为 triggerDiagnosis 是同步的
      if (sourceDashboardRef.current) {
        console.log('[App] 触发参考图诊断');
        try {
          sourceDashboardRef.current.triggerDiagnosis();
        } catch (error) {
          console.error('[App] 参考图诊断触发失败:', error);
        }
      }
      
      if (targetDashboardRef.current) {
        console.log('[App] 触发用户图诊断');
        try {
          targetDashboardRef.current.triggerDiagnosis();
        } catch (error) {
          console.error('[App] 用户图诊断触发失败:', error);
        }
      }
      
      console.log('[App] 两个图片的诊断已同时触发');
    } catch (error) {
      console.error('[App] 同时触发诊断时发生错误:', error);
      // 即使出错，也不影响用户体验，继续执行
    } finally {
      // 【重要】延迟重置触发标志，避免短时间内重复触发
      // 设置 500ms 的防抖时间，确保诊断请求已发送
      setTimeout(() => {
        isTriggeringRef.current = false;
      }, 500);
    }
  };

  // Debug Check
  useEffect(() => {
    if (!api) console.error("CRITICAL: API module failed to load.");
  }, []);

  // 【重要】检查登录状态持久化
  // 用户需求：刷新浏览器后不丢失登录状态
  // 在应用启动时检查 localStorage 中是否有 token，如果有则自动登录
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // 从 localStorage 读取 token
        const token = localStorage.getItem('accessToken');
        
        if (token) {
          // 【日志】记录 token 检查
          console.log('[App] 检测到已保存的 token，验证登录状态...');
          
          // 验证 token 有效性（调用 /api/auth/me 接口）
          try {
            const user = await api.auth.me();
            
            // 【日志】记录验证成功
            console.log('[App] Token 验证成功，用户已登录:', user);
            
            // 如果验证成功，直接进入应用界面，跳过登录
            setView('app');
          } catch (error: any) {
            // 【日志】记录验证失败
            console.error('[App] Token 验证失败，清除无效 token:', error);
            
            // Token 无效或已过期，清除 localStorage 中的 token
            localStorage.removeItem('accessToken');
            
            // 保持在 landing 页面，需要重新登录
            setView('landing');
          }
        } else {
          // 【日志】记录无 token
          console.log('[App] 未检测到 token，需要登录');
          
          // 没有 token，保持在 landing 页面
          setView('landing');
        }
      } catch (error: any) {
        // 【错误处理】如果检查过程中出现异常，清除可能无效的 token
        console.error('[App] 检查登录状态时出错:', error);
        localStorage.removeItem('accessToken');
        setView('landing');
      } finally {
        // 【重要】无论成功或失败，都要标记检查完成
        setIsCheckingAuth(false);
      }
    };

    // 执行检查
    checkAuthStatus();
  }, []); // 只在组件挂载时执行一次

  // 1. Handle Image Selection & Upload
  const handleFileSelect = async (type: 'source' | 'target', file: File) => {
    const url = URL.createObjectURL(file);
    setImages(prev => ({ ...prev, [type]: url }));
    if (type === 'source') setSourceFile(file);
    else setTargetFile(file);
  };

  /**
   * 开始分析（Part 1）
   * 根据用户需求：转场动画应该在 Part1 完成后才开始，而不是在 Part1 开始时
   * 这样可以确保转场动画与 Part1 输出时间对齐，避免进入下一个画面时 Part1 内容还没加载出来
   * 
   * 流程：
   * 1. 上传图片
   * 2. 调用 Part1 API（等待 50-60 秒）
   * 3. Part1 完成后，设置分析结果
   * 4. 启动转场动画
   * 5. 转场动画完成后，切换到分析结果页面
   */
  const handleAnalyze = async () => {
    if (!sourceFile) {
      toast.error("Please upload a Reference Style image");
      return;
    }
    
    // 【重要】锁定按钮，防止重复点击
    setIsAnalyzing(true);

    try {
        // Step A: Upload
        const formData = new FormData();
        formData.append('sourceImage', sourceFile);
        if (targetFile) formData.append('targetImage', targetFile);
        
        console.log('[App] 开始上传图片...');
        const uploadRes = await api.photos.upload(formData);
        setUploadId(uploadRes.uploadId);
        console.log('[App] 图片上传完成，uploadId:', uploadRes.uploadId);

        // 【新增】存储用户图的 EXIF 数据（ISO、光圈等拍摄参数），用于 LightroomPanel 显示
        // EXIF 数据来自后端从图片中提取的元数据
        const targetExif = uploadRes.target_exif || {};
        console.log('[App] 用户图 EXIF 数据:', targetExif);
        // 存储到 sessionStorage，供 LightroomPanel 读取
        if (Object.keys(targetExif).length > 0) {
          sessionStorage.setItem('user_image_exif', JSON.stringify(targetExif));
        }

        // Step B: Analyze Part 1（等待 50-60 秒）
        console.log('[App] 开始 Part1 分析（预计需要 50-60 秒）...');
        const startTime = Date.now();
        const analyzeRes = await api.analyze.part1(uploadRes.uploadId);
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(1);
        console.log(`[App] Part1 分析完成，耗时: ${duration} 秒`);
        
        setTaskId(analyzeRes.taskId);
        
        // 【新增】将 taskId 存储到 sessionStorage，供 LightroomPanel 迭代反馈功能使用
        if (analyzeRes.taskId) {
          sessionStorage.setItem('current_task_id', analyzeRes.taskId);
          console.log('[App] taskId 已存储到 sessionStorage:', analyzeRes.taskId);
        }
        
        // 【重要】使用数据适配器转换后端数据格式
        // 后端返回的数据结构：{ taskId, stage, status, structuredAnalysis, naturalLanguage, protocolVersion }
        // structuredAnalysis 包含 sections.photoReview, sections.composition 等
        console.log('[App] Part1 API 返回结果:', {
          hasStructuredAnalysis: !!analyzeRes.structuredAnalysis,
          structuredAnalysisKeys: analyzeRes.structuredAnalysis ? Object.keys(analyzeRes.structuredAnalysis) : [],
          hasSections: !!analyzeRes.structuredAnalysis?.sections,
          sectionsKeys: analyzeRes.structuredAnalysis?.sections ? Object.keys(analyzeRes.structuredAnalysis.sections) : [],
        });
        
        const adaptedData = adaptBackendToFrontend(analyzeRes.structuredAnalysis || analyzeRes);
        
        console.log('[App] 数据适配器转换后的结果:', {
          hasReview: !!adaptedData.review,
          reviewKeys: adaptedData.review ? Object.keys(adaptedData.review) : [],
          hasComposition: !!adaptedData.composition,
          hasLighting: !!adaptedData.lighting,
          hasColor: !!adaptedData.color,
          fullAdaptedData: adaptedData,
        });
        
        // 【重要】先设置分析结果，确保数据已准备好
        setAnalysisResult(adaptedData);
        
        // 【修复】Part1 完成后，再启动转场动画
        // 这样可以确保转场动画与 Part1 输出时间对齐
        console.log('[App] Part1 数据已准备好，启动转场动画...');
        setShowTransition(true);
        
        // 转场动画组件会在动画完成后调用 handleTransitionComplete
    } catch (e: any) {
        console.error('[App] Part1 分析失败:', e);
        // 【中英文支持】根据后端返回的错误消息显示，如果后端返回中文，前端直接显示
        // 如果后端返回错误码，前端可以根据错误码显示对应的翻译消息
        const errorMessage = e?.message || (e?.code === 'TIMEOUT_ERROR' ? t('auth.timeout_error') : t('analysis.part1_failed') || 'Part1 分析失败，请稍后重试');
        toast.error(errorMessage);
        setIsAnalyzing(false);
        setShowTransition(false);
    }
  };

  const handleTransitionComplete = () => {
      setStage('analysis');
      setShowTransition(false);
      setIsAnalyzing(false);
  };

  const handleSimTransitionComplete = () => {
      setStage('simulation');
      setShowSimTransition(false);
  };

  const handleLoginTransitionComplete = () => {
      setView('app');
      setShowLoginTransition(false);
  };

  const isAnalysisComplete = !!analysisResult;

  // 【重要】在检查登录状态时显示加载状态，避免闪烁
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen relative bg-carbon-950 text-optic-white font-sans overflow-x-hidden selection:bg-optic-accent/30 flex items-center justify-center">
        <ParticleBackground />
        <div className="relative z-10 text-center">
          <div className="w-12 h-12 border-4 border-optic-accent/30 border-t-optic-accent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60 text-sm font-mono">正在验证登录状态...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-carbon-950 text-optic-white font-sans overflow-x-hidden selection:bg-optic-accent/30">
      <ParticleBackground />
      
      <AnimatePresence>
        {showLoginTransition && <LoginTransition onComplete={handleLoginTransitionComplete} />}
      </AnimatePresence>

      {view === 'landing' ? (
        <LandingPage onEnterApp={() => setShowLoginTransition(true)} />
      ) : (
        <>
            <AnimatePresence>
                {showTransition && <AnalysisTransition onComplete={handleTransitionComplete} />}
                {showSimTransition && <SimulationTransition onComplete={handleSimTransitionComplete} />}
            </AnimatePresence>

            {/* HEADER */}
            <header className="h-20 fixed top-0 w-full z-50 bg-carbon-900/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-10 shadow-lg">
                <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setStage('upload')}>
                    <div className="w-10 h-10 bg-gradient-to-br from-carbon-800 to-carbon-950 border border-white/10 rounded-lg flex items-center justify-center font-display font-bold text-sm text-optic-accent tracking-widest shadow-inner group-hover:border-optic-accent/50 transition-colors">SC</div>
                    <div className="flex flex-col">
                        <span className="font-display font-bold text-white text-lg tracking-widest">STYLE<span className="text-optic-silver">CLONE</span></span>
                        <span className="text-[9px] text-gray-500 font-mono uppercase tracking-[0.25em]">Quantum Lens V5.0</span>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    {stage !== 'upload' && (
                        <div className="flex bg-carbon-950 rounded-lg p-1 border border-white/5 backdrop-blur-md shadow-inner">
                            <button 
                                onClick={() => setStage('analysis')} 
                                className={`px-8 py-2.5 text-[10px] font-bold rounded-md transition-all duration-300 uppercase tracking-[0.2em] font-mono ${stage === 'analysis' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                            >
                                {t('nav.analysis')}
                            </button>
                            
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span tabIndex={0} className="inline-flex">
                                            <button 
                                                onClick={() => {
                                                    if (isAnalysisComplete && stage !== 'simulation') {
                                                        setShowSimTransition(true);
                                                    }
                                                }}
                                                disabled={!isAnalysisComplete || stage === 'simulation'}
                                                className={`
                                                    px-8 py-2.5 text-[10px] font-bold rounded-md transition-all duration-300 uppercase tracking-[0.2em] font-mono flex items-center gap-2
                                                    ${stage === 'simulation' ? 'bg-white text-black shadow-lg' : ''}
                                                    ${!isAnalysisComplete ? 'text-white/20 cursor-not-allowed' : (stage !== 'simulation' ? 'text-gray-500 hover:text-white hover:bg-white/5' : '')}
                                                `}
                                            >
                                                {!isAnalysisComplete && <Lock className="w-3 h-3" />}
                                                {t('nav.simulation')}
                                            </button>
                                        </span>
                                    </TooltipTrigger>
                                    {!isAnalysisComplete && (
                                        <TooltipContent side="bottom" className="bg-black border border-white/10 text-white text-xs">
                                            <p>{t('nav.unlock_sim')}</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    )}

                    {/* User Profile Entry Node */}
                    <button 
                        onClick={() => setIsProfileOpen(true)}
                        className="w-10 h-10 rounded-full bg-black border border-white/20 hover:border-optic-accent relative overflow-hidden group transition-all shadow-lg flex-shrink-0"
                    >
                        <img 
                            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80" 
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                        {/* Status Light - Connected */}
                        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-carbon-900 rounded-full shadow-[0_0_8px_#00FF00] animate-pulse"></div>
                    </button>
                </div>
            </header>

            <main className="pt-32 pb-12 px-10 max-w-[1920px] mx-auto relative z-10">
                
                {/* UPLOAD STAGE */}
                {stage === 'upload' && (
                <div className="flex flex-col items-center justify-center min-h-[75vh] animate-fade-in-scale">
                    <div className="text-center mb-16 relative">
                        <h1 className="text-7xl font-display font-bold text-white mb-4 tracking-tighter">{t('stage.upload.title')}</h1>
                        <div className="h-px w-16 bg-optic-accent mx-auto mb-6"></div>
                        <p className="text-gray-500 text-xs font-mono tracking-[0.4em] uppercase">{t('stage.upload.subtitle')}</p>
                    </div>

                    {/* Upload Zones */}
                    {/* 【重要】两个图片上传区域，每个都有自己的分析面板 */}
                    {/* 用户需求：无论点击哪一个"启动深度扫描"按钮，两边都同时启动 AI 分析 */}
                    <div className="flex gap-20 mb-16">
                        <PhotoUploadZone 
                            label={t('stage.upload.ref_label')}
                            imageSrc={images.source} 
                            onFileSelect={(f) => handleFileSelect('source', f)} 
                            isScanning={isAnalyzing}
                            dashboardRef={sourceDashboardRef} // 【重要】传递 ref，用于从外部触发诊断
                            onStartDiagnosis={handleStartDiagnosis} // 【重要】传递处理函数，用于同时触发两个图片的诊断
                        />
                        <PhotoUploadZone 
                            label={t('stage.upload.target_label')}
                            imageSrc={images.target} 
                            onFileSelect={(f) => handleFileSelect('target', f)} 
                            isScanning={isAnalyzing}
                            dashboardRef={targetDashboardRef} // 【重要】传递 ref，用于从外部触发诊断
                            onStartDiagnosis={handleStartDiagnosis} // 【重要】传递处理函数，用于同时触发两个图片的诊断
                        />
                    </div>

                    {/* Action Button */}
                    <button 
                        onClick={handleAnalyze} 
                        disabled={isAnalyzing || !images.source}
                        className={`
                            group relative px-20 py-5 bg-white text-black text-xs font-bold font-mono uppercase tracking-[0.2em] 
                            transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)]
                            ${(isAnalyzing || !images.source) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-optic-white hover:shadow-[0_0_60px_rgba(255,255,255,0.3)]'}
                        `}
                    >
                        {isAnalyzing ? (
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-black rounded-full animate-bounce"></span>
                                {t('stage.upload.btn_analyzing')}
                            </span>
                        ) : t('stage.upload.btn_analyze')}
                    </button>
                    
                    {/* 【Part1 分析进度提示】在 Part1 进行期间显示加载状态 */}
                    {isAnalyzing && !showTransition && (
                        <div className="mt-8 text-center">
                            <div className="inline-flex items-center gap-3 px-6 py-3 bg-black/50 border border-white/10 rounded-lg backdrop-blur-sm">
                                <div className="w-4 h-4 border-2 border-optic-accent/30 border-t-optic-accent rounded-full animate-spin"></div>
                                <span className="text-xs font-mono text-white/80 tracking-wider">
                                    {t('stage.upload.analyzing_part1') || "正在分析 Part1（预计 50-60 秒）..."}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                )}

                {/* ANALYSIS STAGE (Part 1) */}
                {stage === 'analysis' && analysisResult && (
                    <ThemeCardsGrid 
                        data={analysisResult} 
                        images={images} 
                        taskId={taskId} // Pass taskId for Part 2
                        onSimulate={() => setStage('simulation')} 
                    />
                )}

                {/* SIMULATION STAGE (Part 2/3) */}
                {stage === 'simulation' && analysisResult && (
                    <StyleSimulationStage 
                        data={analysisResult} 
                        images={images}
                        taskId={taskId}
                    />
                )}

            </main>
            
            <UserProfile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
