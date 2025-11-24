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
  
  // Image State
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [images, setImages] = useState({ source: "", target: "" });
  
  // API Data State
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Debug Check
  useEffect(() => {
    if (!api) console.error("CRITICAL: API module failed to load.");
  }, []);

  // 1. Handle Image Selection & Upload
  const handleFileSelect = async (type: 'source' | 'target', file: File) => {
    const url = URL.createObjectURL(file);
    setImages(prev => ({ ...prev, [type]: url }));
    if (type === 'source') setSourceFile(file);
    else setTargetFile(file);
  };

  // 2. Start Analysis (Part 1)
  const handleAnalyze = async () => {
    if (!sourceFile) {
      toast.error("Please upload a Reference Style image");
      return;
    }
    
    // Start Transition
    setShowTransition(true);
    setIsAnalyzing(true); // Lock button

    try {
        // Step A: Upload
        const formData = new FormData();
        formData.append('sourceImage', sourceFile);
        if (targetFile) formData.append('targetImage', targetFile);
        
        const uploadRes = await api.photos.upload(formData);
        setUploadId(uploadRes.uploadId);

        // Step B: Analyze Part 1
        const analyzeRes = await api.analyze.part1(uploadRes.uploadId);
        setTaskId(analyzeRes.taskId);
        // 使用数据适配器转换后端数据格式
        const adaptedData = adaptBackendToFrontend(analyzeRes.structuredAnalysis || analyzeRes);
        setAnalysisResult(adaptedData);
        
        // The transition component will call handleTransitionComplete when animation is done
    } catch (e) {
        console.error(e);
        toast.error("Analysis failed. Please try again.");
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
                    <div className="flex gap-20 mb-16">
                        <PhotoUploadZone 
                            label={t('stage.upload.ref_label')}
                            imageSrc={images.source} 
                            onFileSelect={(f) => handleFileSelect('source', f)} 
                            isScanning={isAnalyzing}
                        />
                        <PhotoUploadZone 
                            label={t('stage.upload.target_label')}
                            imageSrc={images.target} 
                            onFileSelect={(f) => handleFileSelect('target', f)} 
                            isScanning={isAnalyzing}
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
