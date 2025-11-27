import React, { useState, useRef, useEffect } from 'react';
import { ReviewModal } from './modals/ReviewModal';
import { LightingModal } from './modals/LightingModal';
import { ColorModal } from './modals/ColorModal';
import { LightroomModal } from './modals/LightroomModal';
import { CompositionModal } from './modals/CompositionModal';
import { PhotoshopModal } from './modals/PhotoshopModal';
import { BaseModal } from './modals/BaseModal';
import { api } from '../src/lib/api';
import { adaptBackendToFrontend } from '../src/lib/dataAdapter';
import { toast } from 'sonner@2.0.3';
import { Lock, Unlock, Cpu, Zap, Eye, Layers, Aperture, Activity, Hexagon, Terminal, Scan } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../src/contexts/LanguageContext';

// --- VFX COMPONENTS ---

// 1. "Matrix Rain" Decryption Effect
const MatrixDecryption = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 500;
    canvas.height = canvas.parentElement?.clientHeight || 300;

    const chars = '01XYZ$%#@&*';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; // Fade out trail
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#007AFF'; // Blue text
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);
    return () => clearInterval(interval);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 opacity-30 mix-blend-screen pointer-events-none" />;
};

// 2. Holographic Scanner Line
const ScannerLine = () => (
  <motion.div 
    initial={{ top: '0%', opacity: 0 }}
    animate={{ top: '100%', opacity: [0, 1, 1, 0] }}
    transition={{ duration: 1.5, ease: "linear" }}
    className="absolute left-0 right-0 h-24 bg-gradient-to-b from-transparent via-blue-500/20 to-transparent z-50 pointer-events-none border-b border-blue-400/50 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
  />
);

// 3. Warp Drive Transition Overlay (ENHANCED)
const WarpOverlay = () => {
    // Generate more stars for density
    const stars = [...Array(60)]; 
    
    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center bg-black overflow-hidden perspective-[1000px]"
        >
            {/* Central Singularity - Distorting Space */}
            <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                    scale: [0, 0.5, 50], 
                    opacity: [0, 1, 1],
                }}
                transition={{ duration: 1.5, times: [0, 0.5, 1], ease: "circIn" }}
                className="absolute z-20 w-2 h-2 bg-white rounded-full shadow-[0_0_100px_rgba(255,255,255,1)]"
            />
            
            {/* Speed Tunnel / Grid Effect */}
             <div className="absolute inset-0 flex items-center justify-center">
                {[...Array(5)].map((_, i) => (
                    <motion.div
                        key={`grid-${i}`}
                        initial={{ scale: 0, opacity: 0, borderWidth: '1px' }}
                        animate={{ 
                            scale: 5, 
                            opacity: [0, 0.5, 0],
                            borderWidth: '20px'
                        }}
                        transition={{ 
                            duration: 1, 
                            delay: i * 0.1, 
                            repeat: Infinity,
                            ease: "easeIn"
                        }}
                        className="absolute w-64 h-36 border border-blue-500/30 rounded-lg"
                    />
                ))}
            </div>

            {/* Star Streaks */}
            <div className="absolute inset-0 flex items-center justify-center">
                 {stars.map((_, i) => {
                     const angle = Math.random() * 360;
                     const delay = Math.random() * 0.5;
                     const duration = 0.5 + Math.random() * 0.5;
                     
                     return (
                         <motion.div 
                            key={i}
                            initial={{ 
                                x: 0, 
                                y: 0, 
                                scaleX: 0,
                                width: 2,
                                opacity: 0 
                            }}
                            animate={{ 
                                scaleX: [0, 1, 50], // Stretch into lines
                                translateX: [0, Math.cos(angle * Math.PI / 180) * 1000],
                                translateY: [0, Math.sin(angle * Math.PI / 180) * 1000],
                                opacity: [0, 1, 0],
                            }}
                            transition={{ 
                                duration: duration, 
                                delay: delay, 
                                repeat: Infinity,
                                ease: "easeIn" 
                            }}
                            className="absolute h-[2px] bg-blue-100 origin-left mix-blend-screen shadow-[0_0_10px_#fff]"
                            style={{ 
                                rotate: `${angle}deg`,
                                width: `${100 + Math.random() * 200}px`
                            }}
                         />
                     );
                 })}
            </div>
            
            {/* Chromatic Aberration Shake (Simulated via CSS Filters) */}
            <motion.div 
                animate={{ 
                    filter: ["blur(0px)", "blur(2px) hue-rotate(90deg)", "blur(0px)"],
                    scale: [1, 1.05, 1.5]
                }}
                transition={{ duration: 1.5, ease: "circIn" }}
                className="absolute inset-0 bg-transparent mix-blend-overlay pointer-events-none"
            />
        </motion.div>
    );
};

// Refined 3D Tilt Card
const TiltCard = ({ children, onClick, locked, delay, index }: any) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current || locked) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; 
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateY = ((x - centerX) / centerX) * 5; 
    const rotateX = ((y - centerY) / centerY) * -5;

    setRotation({ x: rotateX, y: rotateY });
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: locked ? 0.5 : 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: delay * 0.001, type: "spring", stiffness: 50 }}
      className={`relative h-80 w-full perspective-1000 group z-10 ${locked ? 'cursor-not-allowed grayscale blur-[2px]' : 'cursor-pointer'}`}
      onMouseEnter={() => !locked && setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { setIsHovered(false); setRotation({ x: 0, y: 0 }); }}
      onClick={!locked ? onClick : undefined}
    >
      <div 
        ref={cardRef}
        className={`
            relative w-full h-full 
            transition-transform duration-100 ease-linear 
            bg-[#080808] border border-white/10 rounded-sm
            overflow-hidden
        `}
        style={{
          transformStyle: 'preserve-3d',
          transform: isHovered 
            ? `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(1.02, 1.02, 1.02)`
            : 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          boxShadow: isHovered 
            ? '0 20px 50px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(0, 122, 255, 0.4)' 
            : '0 10px 30px -10px rgba(0, 0, 0, 0.8)'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
        <div className="relative z-20 h-full p-6 flex flex-col justify-between" style={{ transform: 'translateZ(20px)' }}>
            {children}
        </div>
        <div 
            className="absolute inset-0 pointer-events-none z-30 mix-blend-overlay transition-opacity duration-300"
            style={{
                opacity: isHovered ? 0.4 : 0,
                background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.0) 50%)`,
                transform: `translateX(${rotation.y * 2}%) translateZ(1px)`
            }}
        />
        {!locked && (
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/10 blur-2xl rounded-full -mr-10 -mb-10 z-0 pointer-events-none"></div>
        )}
      </div>
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-px h-8 bg-white/10 z-0"></div>
    </motion.div>
  );
};

const CardContent = ({ title, subtitle, number, icon: Icon }: any) => (
  <>
    <div className="flex justify-between items-start">
        <div className="p-2 bg-white/5 rounded border border-white/5 backdrop-blur-sm">
            <Icon className="w-5 h-5 text-blue-400" />
        </div>
        <span className="text-[60px] font-display font-bold text-white/10 leading-none -mt-2 -mr-2">
            0{number}
        </span>
    </div>
    <div>
        <h3 className="text-xl font-bold text-white mb-1 tracking-wide font-display">{title}</h3>
        <p className="text-xs text-gray-400 font-mono uppercase tracking-wider flex items-center gap-2">
            <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
            {subtitle}
        </p>
    </div>
  </>
);

// --- MAIN COMPONENT ---

interface ThemeCardsGridProps {
  data: any;
  images: { source: string; target: string };
  taskId?: string | null;
  onSimulate: () => void;
}

/**
 * 主题卡片网格组件
 * 显示分析结果的各种卡片（Review、Composition、Lighting等）
 * 
 * @param data - 分析结果数据（从 App.tsx 传入，已通过 adaptBackendToFrontend 转换）
 * @param images - 图片对象，包含 source（参考图）和 target（用户图）
 * @param taskId - 任务ID，用于触发 Part2 分析
 * @param onSimulate - 模拟回调函数
 */
export const ThemeCardsGrid = ({ data, images, taskId, onSimulate }: ThemeCardsGridProps) => {
  const { t } = useLanguage();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [workflowStage, setWorkflowStage] = useState<'diagnosis' | 'decrypting' | 'synthesis' | 'simulating'>('diagnosis');
  const [results, setResults] = useState<any>(data);
  const [isWarping, setIsWarping] = useState(false);

  // 【重要】监听 data 变化，同步更新 results
  // 当父组件传入新的 data 时（例如 Part2 数据更新），需要更新 results
  useEffect(() => {
    if (data) {
      console.log('[ThemeCardsGrid] data 更新:', {
        hasReview: !!data.review,
        reviewKeys: data.review ? Object.keys(data.review) : [],
        hasComposition: !!data.composition,
        hasLighting: !!data.lighting,
        hasColor: !!data.color,
        hasLightroom: !!data.lightroom,
        hasPhotoshop: !!data.photoshop,
      });
      setResults((prev: any) => {
        // 【合并策略】保留现有数据，只更新新传入的字段
        // 这样可以避免覆盖已有的 Part2 数据
        return { ...prev, ...data };
      });
    }
  }, [data]);

  // Unlock Animation Sequence
  const handleUnlock = async () => {
    setWorkflowStage('decrypting');
    
    if (!taskId) {
      toast.error("Task ID is missing");
      return;
    }

    try {
      // 1. 触发 Part2 分析（立即返回 processing）
      await api.analyze.part2(taskId);
      
      // 2. 启动轮询机制（每3秒轮询一次，直到 status === 'completed'）
      const pollInterval = 3000; // 3秒
      const maxAttempts = 30; // 最多轮询30次（90秒）
      let attempts = 0;
      
      const pollPart2Result = async () => {
        try {
          const res = await api.analyze.getTask(taskId!);
          
          // 检查状态
          if (res.status === 'completed') {
            // 验证数据完整性：检查 sections 中是否有 Part2 数据
            const structuredResult = res.structured_result || res;
            const sections = structuredResult.sections || structuredResult;
            
            const hasPart2Data = sections.color || sections.lightroom || sections.photoshop;
            
            if (hasPart2Data) {
              // 使用数据适配器转换数据
              const adaptedData = adaptBackendToFrontend(structuredResult);
              
              // 合并数据到现有结果
              setResults((prev: any) => ({ ...prev, ...adaptedData }));
              
              // 切换到 synthesis 阶段
              setWorkflowStage('synthesis');
              toast.success("EXECUTION VECTORS DECRYPTED");
              return true; // 停止轮询
            } else {
              // 数据未准备好，继续轮询
              console.log("Part2 data not ready yet, continuing to poll...");
            }
          } else if (res.status === 'failed' || res.status === 'error') {
            toast.error("Part2 analysis failed");
            setWorkflowStage('diagnosis');
            return true; // 停止轮询
          }
          
          // 检查是否超过最大尝试次数
          attempts++;
          if (attempts >= maxAttempts) {
            toast.error("Part2 analysis timeout");
            setWorkflowStage('diagnosis');
            return true; // 停止轮询
          }
          
          return false; // 继续轮询
        } catch (error) {
          console.error("Polling error:", error);
          attempts++;
          if (attempts >= maxAttempts) {
            toast.error("Part2 analysis timeout");
            setWorkflowStage('diagnosis');
            return true;
          }
          return false;
        }
      };
      
      // 首次轮询（等待2秒后开始，给后端一些处理时间）
      setTimeout(async () => {
        let shouldContinue = true;
        while (shouldContinue) {
          shouldContinue = !(await pollPart2Result());
          if (shouldContinue) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
          }
        }
      }, 2000);
      
    } catch (error) {
      console.error("Part2 trigger error:", error);
      toast.error("Failed to trigger Part2 analysis");
      setWorkflowStage('diagnosis');
    }
  };

  // Simulation Animation Sequence
  const handleSimulate = () => {
      setWorkflowStage('simulating');
      setIsWarping(true);
      
      // 1. Trigger Warp Effect (1.5s duration to match warp transition)
      setTimeout(() => {
          onSimulate(); // Navigate away
      }, 1500);
  };

  return (
    <div className="space-y-12 pb-24 relative z-10 w-full max-w-[1400px] mx-auto px-4">
      <AnimatePresence>
          {isWarping && <WarpOverlay />}
      </AnimatePresence>

      {/* HEADER - WORKFLOW STATUS */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-12">
          <div className="flex items-center gap-4">
              <motion.div 
                 animate={{ opacity: [1, 0.5, 1] }} 
                 transition={{ duration: 2, repeat: Infinity }}
                 className="w-2 h-2 bg-blue-500 rounded-full"
              />
              <div className="text-xs font-mono text-blue-400 tracking-[0.2em]">
                  {workflowStage === 'diagnosis' ? t('status.awaiting') : workflowStage === 'decrypting' ? t('status.decrypting') : t('status.ready')}
              </div>
          </div>
          <div className="flex gap-2">
              {[1, 2, 3].map(step => (
                  <motion.div 
                      key={step} 
                      animate={{ 
                          backgroundColor: (step === 1 && workflowStage === 'diagnosis') || 
                          (step === 2 && (workflowStage === 'synthesis' || workflowStage === 'decrypting')) ||
                          (step === 3 && workflowStage === 'simulating') 
                          ? '#3b82f6' : '#333'
                      }}
                      className="h-1 w-12 rounded-full"
                  />
              ))}
          </div>
      </div>

      {/* SEQUENCE 01: DIAGNOSIS (Analysis Layer) */}
      <div className="relative">
         <div className="absolute -top-16 left-0 text-[120px] font-bold text-white/[0.02] font-display pointer-events-none select-none">
            {t('cards.analysis_bg')}
         </div>
         
         <div className="flex items-center gap-4 mb-8 pl-2 border-l-2 border-blue-500">
            <h2 className="text-sm font-display font-bold text-white tracking-widest">{t('cards.diag_layer')}</h2>
            <span className="text-xs font-mono text-gray-500 uppercase">{t('cards.ai_assess')}</span>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0,1,2].map((i) => (
                 <TiltCard 
                    key={i} 
                    onClick={() => {
                      const modalType = ['review','composition','lighting'][i];
                      console.log(`[ThemeCardsGrid] 点击卡片，打开 ${modalType} 模态框:`, {
                        modalType,
                        hasData: !!results[modalType],
                        dataKeys: results[modalType] ? Object.keys(results[modalType]) : [],
                        fullResults: results,
                      });
                      setActiveModal(modalType);
                    }} 
                    delay={i * 100} 
                    locked={false} 
                    index={i}
                 >
                    <CardContent 
                        title={[t('cards.review'),t('cards.composition'),t('cards.lighting')][i]} 
                        subtitle={[t('cards.aesthetic'),t('cards.geometry'),t('cards.zone')][i]} 
                        number={i+1} 
                        icon={[Eye, Layers, Zap][i]} 
                    />
                </TiltCard>
            ))}
         </div>
      </div>

      {/* TRANSITION CONTROL - THE CORE INTERACTION */}
      <div className="relative h-24 flex items-center justify-center my-12">
          <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
               <div className="h-full w-px bg-gradient-to-b from-white/10 via-blue-500/50 to-white/10"></div>
          </div>

          <AnimatePresence mode="wait">
            {workflowStage === 'diagnosis' && (
                <motion.button 
                    key="unlock-btn"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
                    onClick={handleUnlock}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative z-20 px-10 py-4 bg-black border border-white/20 text-white hover:bg-white hover:text-black hover:border-white transition-colors duration-300 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)] group"
                >
                    <span className="flex items-center gap-3 text-xs font-bold tracking-[0.2em] uppercase font-display">
                        <Unlock className="w-3 h-3" /> {t('cards.unlock_btn')}
                    </span>
                </motion.button>
            )}

            {workflowStage === 'decrypting' && (
                <motion.div 
                    key="decrypting-loader"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 300, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative z-20 h-10 bg-black border border-blue-500/50 rounded-full overflow-hidden flex items-center justify-center"
                >
                    <div className="absolute inset-0 bg-blue-500/10 animate-pulse"></div>
                    <motion.div 
                        className="absolute left-0 top-0 bottom-0 bg-blue-600/50"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                    />
                    <div className="relative z-10 flex items-center gap-3 px-6">
                       <Scan className="w-4 h-4 text-blue-400 animate-spin" />
                       <span className="text-[10px] font-mono text-blue-400 tracking-[0.2em] animate-pulse">{t('cards.decrypting_vec')}</span>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>
      </div>

      {/* SEQUENCE 02: SYNTHESIS (Execution Layer) */}
      <div className="relative min-h-[400px]">
         {/* Layer Title */}
         <div className="absolute -top-16 right-0 text-[120px] font-bold text-white/[0.02] font-display pointer-events-none select-none text-right">
            {t('cards.exec_bg')}
         </div>

         <div className="flex items-center gap-4 mb-8 pl-2 border-l-2 border-amber-500">
            <h2 className="text-sm font-display font-bold text-white tracking-widest">{t('cards.exec_layer')}</h2>
            <span className="text-xs font-mono text-gray-500 uppercase">{t('cards.tech_proc')}</span>
         </div>
         
         <div className="relative">
             {/* Decryption Effects */}
             <AnimatePresence>
                {workflowStage === 'decrypting' && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 border border-blue-500/20 bg-black/50 backdrop-blur-sm overflow-hidden rounded-lg"
                    >
                        <MatrixDecryption />
                        <ScannerLine />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-4xl font-display font-bold text-white/10 tracking-widest animate-pulse">{t('cards.locked')}</div>
                        </div>
                    </motion.div>
                )}
             </AnimatePresence>

             {/* The Grid */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[3,4,5].map((i) => (
                    <TiltCard 
                        key={i} 
                        onClick={() => setActiveModal(['color','lightroom','photoshop'][i-3])} 
                        delay={(i-3) * 150} // Staggered entry
                        locked={workflowStage === 'diagnosis' || workflowStage === 'decrypting'}
                        index={i}
                    >
                        <CardContent 
                            title={[t('cards.color'),t('cards.lightroom'),t('cards.photoshop')][i-3]} 
                            subtitle={[t('cards.spectral'),t('cards.raw_dev'),t('cards.retouch')][i-3]} 
                            number={i+1} 
                            icon={[Activity, Aperture, Hexagon][i-3]} 
                        />
                    </TiltCard>
                ))}
             </div>
         </div>
         
         {/* FINAL RENDER BUTTON */}
         <AnimatePresence>
            {workflowStage === 'synthesis' && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="flex justify-center mt-24 relative"
                >
                    <motion.button 
                      onClick={handleSimulate}
                      whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(0,122,255,0.6)" }}
                      whileTap={{ scale: 0.95 }}
                      className="
                        relative z-20 group
                        px-24 py-8 
                        bg-blue-600 text-white 
                        transition-all duration-300 
                        rounded-sm overflow-hidden
                        shadow-[0_0_40px_rgba(0,122,255,0.3)]
                      "
                    >
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                        <span className="relative z-10 flex items-center gap-4 text-lg font-bold font-display tracking-[0.2em] uppercase">
                            <Cpu className="w-6 h-6" /> {t('cards.init_sim')}
                        </span>
                        {/* Button Shine */}
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent transform skew-x-12"></div>
                    </motion.button>
                </motion.div>
            )}
         </AnimatePresence>
      </div>

      {/* Modals */}
      {/* 【修复】添加安全检查，确保数据存在时才渲染模态框 */}
      {activeModal === 'review' && (
        (() => {
          console.log('[ThemeCardsGrid] 渲染 ReviewModal:', {
            hasReview: !!results.review,
            reviewData: results.review,
            reviewKeys: results.review ? Object.keys(results.review) : [],
          });
          
          // 【安全检查】如果 review 数据不存在，显示错误提示
          if (!results.review) {
            console.error('[ThemeCardsGrid] ⚠️ review 数据不存在，无法打开 ReviewModal');
            return (
              <BaseModal title={t('review.title') || "Visual Critique"} onClose={() => setActiveModal(null)} width="max-w-[95vw]">
                <div className="flex items-center justify-center h-full p-10">
                  <div className="text-center">
                    <div className="text-red-500 text-lg font-bold mb-4">数据加载错误</div>
                    <p className="text-white/60 text-sm mb-4">Review 数据不存在，请重新进行分析</p>
                    <button 
                      onClick={() => setActiveModal(null)}
                      className="px-6 py-2 bg-optic-accent text-white rounded hover:bg-optic-accent/80 transition-colors"
                    >
                      关闭
                    </button>
                  </div>
                </div>
              </BaseModal>
            );
          }
          
          return <ReviewModal data={results.review} images={images} onClose={() => setActiveModal(null)} />;
        })()
      )}
      {activeModal === 'composition' && <CompositionModal data={results.composition} images={images} onClose={() => setActiveModal(null)} />}
      {activeModal === 'lighting' && <LightingModal data={results.lighting} onClose={() => setActiveModal(null)} />}
      {activeModal === 'color' && <ColorModal data={results.color} onClose={() => setActiveModal(null)} />}
      {activeModal === 'lightroom' && <LightroomModal data={results.lightroom} onClose={() => setActiveModal(null)} />}
      {activeModal === 'photoshop' && <PhotoshopModal data={results.photoshop} onClose={() => setActiveModal(null)} />}
    </div>
  );
};
