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
import { toast } from 'sonner';
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

  // 【新增】组件挂载时检查任务状态，如果 Part2 已完成，自动加载数据
  useEffect(() => {
    const checkPart2Status = async () => {
      if (!taskId) return;
      
      try {
        console.log('[ThemeCardsGrid] 🔍 检查 Part2 状态...', { taskId });
        const res = await api.analyze.getTask(taskId);
        console.log('[ThemeCardsGrid] 🔍 初始 API 响应:', {
          resType: typeof res,
          resKeys: res ? Object.keys(res) : [],
          fullRes: res,
        });
        
        const responseData = (res as any)?.data || res;
        const taskStatus = responseData?.task?.status || (res as any)?.task?.status || (res as any)?.status;
        const structuredResult = responseData?.structuredResult || responseData?.structured_result || (res as any)?.structuredResult || (res as any)?.structured_result || (res as any);
        
        console.log('[ThemeCardsGrid] 🔍 初始状态检查:', {
          taskStatus,
          hasResponseData: !!responseData,
          responseDataKeys: responseData ? Object.keys(responseData) : [],
          hasStructuredResult: !!structuredResult,
          structuredResultType: typeof structuredResult,
          structuredResultKeys: structuredResult ? Object.keys(structuredResult) : [],
          hasSections: !!structuredResult?.sections,
          sectionsKeys: structuredResult?.sections ? Object.keys(structuredResult.sections) : [],
          // 【新增】打印完整的 structuredResult 结构（前 2000 字符）
          structuredResultPreview: structuredResult ? JSON.stringify(structuredResult).substring(0, 2000) : 'null',
        });
        
        // 如果 Part2 已完成，检查是否有 Part2 数据
        if (taskStatus === 'completed') {
          // 【修复】使用与轮询逻辑相同的数据解析方式
          let sections: any = {};
          if (structuredResult?.sections) {
            sections = structuredResult.sections;
          } else if (structuredResult && typeof structuredResult === 'object') {
            // 如果 structuredResult 本身包含 color/lightroom/photoshop，说明它就是 sections
            if (structuredResult.color || structuredResult.lightroom || structuredResult.photoshop) {
              sections = structuredResult;
            } else {
              sections = structuredResult;
            }
          }
          
          const hasColor = !!(sections.color);
          const hasLightroom = !!(sections.lightroom);
          const hasPhotoshop = !!(sections.photoshop);
          const hasPart2Data = hasColor || hasLightroom || hasPhotoshop;
          
          console.log('[ThemeCardsGrid] 🔍 Part2 数据检查（修复后）:', {
            hasPart2Data,
            hasColor,
            hasLightroom,
            hasPhotoshop,
            sectionsType: typeof sections,
            sectionsKeys: sections ? Object.keys(sections) : [],
            colorKeys: sections.color ? Object.keys(sections.color) : [],
            lightroomKeys: sections.lightroom ? Object.keys(sections.lightroom) : [],
            photoshopKeys: sections.photoshop ? Object.keys(sections.photoshop) : [],
            // 【新增】打印 sections 预览
            sectionsPreview: sections ? JSON.stringify(sections).substring(0, 500) : 'null',
          });
          
          if (hasPart2Data) {
            console.log('[ThemeCardsGrid] ✅ Part2 已完成，自动加载数据');
            // 转换并加载数据
            let dataToAdapt: any;
            if (structuredResult?.sections) {
              dataToAdapt = structuredResult;
              console.log('[ThemeCardsGrid] ✅ 使用标准结构（structuredResult.sections）');
            } else if (sections && (sections.color || sections.lightroom || sections.photoshop)) {
              dataToAdapt = { sections: sections };
              console.log('[ThemeCardsGrid] ✅ 使用 sections 包装结构');
            } else {
              dataToAdapt = { sections: structuredResult || {} };
              console.log('[ThemeCardsGrid] ⚠️ 使用默认包装结构');
            }
            
            console.log('[ThemeCardsGrid] 📦 数据适配前:', {
              dataToAdaptKeys: dataToAdapt ? Object.keys(dataToAdapt) : [],
              hasSections: !!dataToAdapt?.sections,
              sectionsKeys: dataToAdapt?.sections ? Object.keys(dataToAdapt.sections) : [],
            });
            
            const adaptedData = adaptBackendToFrontend(dataToAdapt);
            
            console.log('[ThemeCardsGrid] ✅ 数据适配后:', {
              adaptedDataKeys: Object.keys(adaptedData),
              hasColor: !!adaptedData.color,
              hasLightroom: !!adaptedData.lightroom,
              hasPhotoshop: !!adaptedData.photoshop,
            });
            
            // 【修复】检查适配后的数据是否包含 Part2 内容
            const hasAdaptedPart2Data = adaptedData.color || adaptedData.lightroom || adaptedData.photoshop;
            
            if (hasAdaptedPart2Data) {
              setResults((prev: any) => {
                const merged = { ...prev, ...adaptedData };
                console.log('[ThemeCardsGrid] ✅ 数据合并成功:', {
                  prevKeys: Object.keys(prev),
                  mergedKeys: Object.keys(merged),
                  hasColor: !!merged.color,
                  hasLightroom: !!merged.lightroom,
                  hasPhotoshop: !!merged.photoshop,
                });
                return merged;
              });
              setWorkflowStage('synthesis');
              console.log('[ThemeCardsGrid] ✅ workflowStage 已切换到 synthesis');
            } else {
              console.error('[ThemeCardsGrid] ❌ 数据适配后仍然没有 Part2 数据！', {
                adaptedDataKeys: Object.keys(adaptedData),
                adaptedData,
              });
              // 【修复】即使适配失败，也强制切换到 synthesis 阶段
              setWorkflowStage('synthesis');
              toast.warning("Part2 数据格式异常，界面已显示但可能缺少部分数据");
            }
          } else {
            console.warn('[ThemeCardsGrid] ⚠️ Part2 已完成但数据缺失:', {
              taskStatus,
              hasStructuredResult: !!structuredResult,
              structuredResultType: typeof structuredResult,
              structuredResultKeys: structuredResult ? Object.keys(structuredResult) : [],
              sectionsKeys: sections ? Object.keys(sections) : [],
              // 【新增】打印完整 structuredResult 预览
              structuredResultPreview: structuredResult ? JSON.stringify(structuredResult).substring(0, 1000) : 'null',
            });
            // 【修复】即使数据缺失，也强制切换到 synthesis 阶段，让用户看到界面
            setWorkflowStage('synthesis');
            toast.warning("Part2 数据缺失，界面已显示但可能缺少部分数据");
          }
        } else {
          console.log('[ThemeCardsGrid] ℹ️ Part2 未完成，状态:', taskStatus);
        }
      } catch (error) {
        console.error('[ThemeCardsGrid] ❌ 检查 Part2 状态失败:', error);
      }
    };
    
    checkPart2Status();
  }, [taskId]);

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
      const maxAttempts = 120; // 最多轮询120次（6分钟），因为 Part2 分析可能需要更长时间
      let attempts = 0;
      
      /**
       * 【Part2 轮询函数】
       * 功能：轮询后端任务状态，检测 Part2 分析是否完成，并加载 Part2 数据
       * 
       * 数据流：
       * 1. 后端 getTask 返回：{ code: 0, data: { task: {...}, structuredResult: {...} } }
       * 2. apiClient 自动解包 data 字段，返回：{ task: {...}, structuredResult: {...} }
       * 3. structuredResult 结构：{ sections: { color: {...}, lightroom: {...}, photoshop: {...} } }
       * 4. 使用 adaptBackendToFrontend 转换数据格式
       * 5. 更新 results 状态并切换到 synthesis 阶段
       * 
       * @returns {Promise<boolean>} true 表示停止轮询，false 表示继续轮询
       */
      const pollPart2Result = async () => {
        try {
          const res = await api.analyze.getTask(taskId!);
          
          // 【数据解析】apiClient 已经解包了 data 字段，所以 res 直接是 { task: {...}, structuredResult: {...} }
          // 但为了兼容性，也支持从 res.data 中提取（如果 apiClient 没有解包）
          console.log('[Part2 Poll] 🔍 原始 API 响应:', {
            resType: typeof res,
            resKeys: res ? Object.keys(res) : [],
            resIsArray: Array.isArray(res),
            fullRes: res,
          });
          
          const responseData = (res as any)?.data || res; // apiClient 可能已经解包了 data
          const taskStatus = responseData?.task?.status || (res as any)?.task?.status || (res as any)?.status || 'unknown';
          const structuredResult = responseData?.structuredResult || (res as any)?.structuredResult || (res as any)?.structured_result || (res as any);
          
          // 【调试日志】记录轮询结果（详细）
          console.log('[Part2 Poll] 🔍 轮询结果（详细）:', {
            taskStatus,
            responseDataKeys: responseData ? Object.keys(responseData) : [],
            resKeys: res ? Object.keys(res) : [],
            hasTask: !!responseData?.task,
            hasStructuredResult: !!structuredResult,
            structuredResultType: typeof structuredResult,
            structuredResultKeys: structuredResult ? Object.keys(structuredResult) : [],
            hasSections: !!structuredResult?.sections,
            sectionsKeys: structuredResult?.sections ? Object.keys(structuredResult.sections) : [],
            // 【关键】检查 Part2 数据是否存在
            hasColorSection: !!structuredResult?.sections?.color,
            hasLightroomSection: !!structuredResult?.sections?.lightroom,
            hasPhotoshopSection: !!structuredResult?.sections?.photoshop,
            // 打印 sections 的完整结构（仅前 500 字符，避免日志过长）
            sectionsPreview: structuredResult?.sections ? JSON.stringify(structuredResult.sections).substring(0, 500) : 'null',
          });
          
          // 【修复】只检查 completed 状态，不检查 part1_completed（因为 part1_completed 表示 Part1 完成，Part2 可能还在处理中）
          if (taskStatus === 'completed') {
            // 【修复】验证数据完整性：检查 sections 中是否有 Part2 数据
            // 根据后端代码，structured_result 的结构应该是：
            // { sections: { color: {...}, lightroom: {...}, photoshop: {...} } }
            // 【关键修复】如果 structuredResult 本身就是 sections（没有嵌套），直接使用
            let sections: any = {};
            if (structuredResult?.sections) {
              sections = structuredResult.sections;
            } else if (structuredResult && typeof structuredResult === 'object') {
              // 如果 structuredResult 本身包含 color/lightroom/photoshop，说明它就是 sections
              if (structuredResult.color || structuredResult.lightroom || structuredResult.photoshop) {
                sections = structuredResult;
              } else {
                // 否则尝试将其作为 sections 使用
                sections = structuredResult;
              }
            }
            
            // 【关键修复】检查 Part2 数据的标准结构
            // Part2 数据应该包含 color、lightroom、photoshop 三个 section
            const hasColor = !!(sections.color);
            const hasLightroom = !!(sections.lightroom);
            const hasPhotoshop = !!(sections.photoshop);
            const hasPart2Data = hasColor || hasLightroom || hasPhotoshop;
            
            // 【新增】详细日志，用于排查问题
            console.log('[Part2 Poll] 🔍 数据检查（修复后）:', {
              taskStatus,
              hasStructuredResult: !!structuredResult,
              structuredResultType: typeof structuredResult,
              structuredResultKeys: structuredResult ? Object.keys(structuredResult) : [],
              hasSections: !!structuredResult?.sections,
              sectionsType: typeof sections,
              sectionsKeys: sections ? Object.keys(sections) : [],
              hasColor,
              hasLightroom,
              hasPhotoshop,
              hasPart2Data,
              // 【新增】打印 sections 的完整结构（仅前 1000 字符）
              sectionsPreview: sections ? JSON.stringify(sections).substring(0, 1000) : 'null',
            });
            
            // 【详细日志】记录数据检查结果
            console.log('[Part2 Poll] 📊 数据检查（详细）:', {
              hasPart2Data,
              hasColor,
              hasLightroom,
              hasPhotoshop,
              // 检查每个 section 是否有 structured 字段
              colorHasStructured: !!(sections.color?.structured),
              lightroomHasStructured: !!(sections.lightroom?.structured),
              photoshopHasStructured: !!(sections.photoshop?.structured),
              // 检查 sections 的键
              sectionsKeys: Object.keys(sections),
              // 打印每个 section 的键（如果存在）
              colorKeys: sections.color ? Object.keys(sections.color) : [],
              lightroomKeys: sections.lightroom ? Object.keys(sections.lightroom) : [],
              photoshopKeys: sections.photoshop ? Object.keys(sections.photoshop) : [],
            });
            
            if (hasPart2Data) {
              // 【修复】使用数据适配器转换数据
              // 根据后端代码，structuredResult 的结构应该是：
              // { sections: { color: {...}, lightroom: {...}, photoshop: {...} } }
              // 所以直接传入 structuredResult 即可
              let dataToAdapt: any;
              if (structuredResult?.sections) {
                // 标准结构：structuredResult 包含 sections
                dataToAdapt = structuredResult;
                console.log('[Part2 Poll] ✅ 使用标准结构（structuredResult.sections）');
              } else if (sections && (sections.color || sections.lightroom || sections.photoshop)) {
                // 【修复】如果 sections 本身包含 Part2 数据，直接包装
                dataToAdapt = { sections: sections };
                console.log('[Part2 Poll] ✅ 使用 sections 包装结构');
              } else if (structuredResult && typeof structuredResult === 'object') {
                // 如果 structuredResult 本身看起来像是 sections（有 color/lightroom/photoshop 等字段）
                if (structuredResult.color || structuredResult.lightroom || structuredResult.photoshop) {
                  dataToAdapt = { sections: structuredResult };
                  console.log('[Part2 Poll] ⚠️ 使用包装结构（将 structuredResult 包装为 sections）');
                } else {
                  // 否则，尝试将其作为 sections 包装
                  dataToAdapt = { sections: structuredResult };
                  console.log('[Part2 Poll] ⚠️ 使用默认包装结构');
                }
              } else {
                dataToAdapt = { sections: structuredResult || {} };
                console.log('[Part2 Poll] ⚠️ 使用空结构');
              }
              
              console.log('[Part2 Poll] 📦 数据适配前:', {
                dataToAdaptKeys: dataToAdapt ? Object.keys(dataToAdapt) : [],
                hasSections: !!dataToAdapt?.sections,
                sectionsKeys: dataToAdapt?.sections ? Object.keys(dataToAdapt.sections) : [],
              });
              
              const adaptedData = adaptBackendToFrontend(dataToAdapt);
              
              console.log('[Part2 Poll] ✅ 数据适配后:', {
                adaptedDataKeys: Object.keys(adaptedData),
                hasColor: !!adaptedData.color,
                hasLightroom: !!adaptedData.lightroom,
                hasPhotoshop: !!adaptedData.photoshop,
                // 打印每个 section 的键（如果存在）
                colorKeys: adaptedData.color ? Object.keys(adaptedData.color) : [],
                lightroomKeys: adaptedData.lightroom ? Object.keys(adaptedData.lightroom) : [],
                photoshopKeys: adaptedData.photoshop ? Object.keys(adaptedData.photoshop) : [],
              });
              
              // 【修复】检查适配后的数据是否包含 Part2 内容
              const hasAdaptedPart2Data = adaptedData.color || adaptedData.lightroom || adaptedData.photoshop;
              
              if (hasAdaptedPart2Data) {
              // 合并数据到现有结果
                setResults((prev: any) => {
                  const merged = { ...prev, ...adaptedData };
                  console.log('[Part2 Poll] ✅ 数据合并成功:', {
                    prevKeys: Object.keys(prev),
                    mergedKeys: Object.keys(merged),
                    hasColor: !!merged.color,
                    hasLightroom: !!merged.lightroom,
                    hasPhotoshop: !!merged.photoshop,
                  });
                  return merged;
                });
              
              // 切换到 synthesis 阶段
              setWorkflowStage('synthesis');
              toast.success("EXECUTION VECTORS DECRYPTED");
              return true; // 停止轮询
            } else {
                console.error('[Part2 Poll] ❌ 数据适配后仍然没有 Part2 数据！', {
                  adaptedDataKeys: Object.keys(adaptedData),
                  adaptedData,
                  // 【新增】打印原始数据，帮助排查问题
                  originalStructuredResult: structuredResult,
                  originalSections: sections,
                });
                
                // 【修复】即使适配失败，也尝试强制切换到 synthesis 阶段
                // 因为可能是数据格式问题，但至少让用户看到界面
                console.warn('[Part2 Poll] ⚠️ 数据适配失败，但强制切换到 synthesis 阶段');
                setWorkflowStage('synthesis');
                toast.warning("Part2 数据格式异常，界面已显示但可能缺少部分数据");
                return true; // 停止轮询，避免无限循环
            }
            } else {
              // 【错误处理】任务已完成但 Part2 数据缺失
              // 可能的原因：
              // 1. Part2 分析失败（但状态没有更新为 failed）
              // 2. 数据格式不正确
              // 3. 数据还在保存中（但状态已经更新为 completed）
              console.error('[Part2 Poll] ❌ 任务已完成但 Part2 数据缺失！', {
                taskStatus,
                hasStructuredResult: !!structuredResult,
                structuredResultType: typeof structuredResult,
                structuredResultKeys: structuredResult ? Object.keys(structuredResult) : [],
                hasSections: !!structuredResult?.sections,
                sectionsKeys: structuredResult?.sections ? Object.keys(structuredResult.sections) : [],
                // 【新增】检查 structuredResult 的值类型
                structuredResultValueType: structuredResult ? (Array.isArray(structuredResult) ? 'array' : typeof structuredResult) : 'null',
                // 打印完整的 structuredResult（仅前 2000 字符，避免日志过长）
                structuredResultPreview: structuredResult ? JSON.stringify(structuredResult).substring(0, 2000) : 'null',
                fullRes: res,
                // 【新增】打印 responseData 的完整结构
                responseDataKeys: responseData ? Object.keys(responseData) : [],
                responseDataPreview: responseData ? JSON.stringify(responseData).substring(0, 2000) : 'null',
              });
              
              // 检查是否有 status_reason（失败原因）
              const statusReason = responseData?.task?.status_reason || (res as any)?.task?.status_reason;
              if (statusReason) {
                console.error('[Part2 Poll] ❌ 任务失败原因:', statusReason);
            toast.error(`Part2 分析失败: ${statusReason}`);
            setWorkflowStage('diagnosis');
            return true; // 停止轮询
              }
              
              // 【修复】如果状态是 completed 但没有数据，可能是：
              // 1. 后端数据保存延迟（继续轮询）
              // 2. Part2 分析失败但没有更新状态（检查是否有错误信息）
              // 3. 数据格式问题（输出详细错误信息）
              if (taskStatus === 'completed') {
                console.warn('[Part2 Poll] ⚠️ 状态为 completed 但无 Part2 数据，可能原因：');
                console.warn('  1. 后端数据保存延迟（继续等待）');
                console.warn('  2. Part2 分析失败但没有更新状态');
                console.warn('  3. 数据格式问题');
                console.warn(`  当前轮询次数: ${attempts}/${maxAttempts}`);
                
                // 如果已经轮询了很多次仍然没有数据，可能是真的失败了
                if (attempts >= maxAttempts * 0.8) {
                  console.error('[Part2 Poll] ❌ 轮询次数过多，可能 Part2 分析失败');
                  toast.error("Part2 分析可能失败，请检查后端日志");
                  setWorkflowStage('diagnosis');
                  return true; // 停止轮询
                }
                
                // 继续轮询
              }
            }
          } else if (taskStatus === 'failed' || taskStatus === 'error') {
            // 【增强】显示失败原因（如果有）
            // 【修复】从 responseData 中提取 status_reason（后端返回格式：{ data: { task: { status_reason: ... } } }）
            const failReason = responseData?.task?.status_reason || (res as any)?.task?.status_reason || 'Unknown error';
            console.error('[Part2 Poll] ❌ 任务失败:', {
              taskStatus,
              failReason,
              responseDataKeys: responseData ? Object.keys(responseData) : [],
              hasTask: !!responseData?.task,
              taskKeys: responseData?.task ? Object.keys(responseData.task) : [],
            });
            
            // 【国际化】支持中英文错误提示
            const errorMessage = failReason.includes('无法解析') || failReason.includes('JSON') 
              ? `Part2 分析失败: ${failReason}` 
              : `Part2 analysis failed: ${failReason}`;
            toast.error(errorMessage);
            setWorkflowStage('diagnosis');
            return true; // 停止轮询
          } else if (taskStatus === 'processing') {
            console.log('[Part2 Poll] 任务处理中，继续等待...');
          } else {
            console.log(`[Part2 Poll] 未知状态: ${taskStatus}，继续轮询...`);
          }
          
          // 检查是否超过最大尝试次数
          attempts++;
          if (attempts >= maxAttempts) {
            console.error(`[Part2 Poll] 超过最大尝试次数 (${maxAttempts})，停止轮询`);
            toast.error("Part2 analysis timeout");
            setWorkflowStage('diagnosis');
            return true; // 停止轮询
          }
          
          return false; // 继续轮询
        } catch (error: any) {
          console.error("[Part2 Poll] 轮询错误:", error);
          attempts++;
          if (attempts >= maxAttempts) {
            toast.error("Part2 analysis timeout");
            setWorkflowStage('diagnosis');
            return true;
          }
          // 发生错误时也继续轮询（可能是网络临时问题）
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
      
    } catch (error: any) {
      // 【修复】增强错误处理，显示更详细的错误信息
      console.error("Part2 trigger error:", error);
      
      // 【修复】根据错误类型显示不同的错误消息
      let errorMessage = "Part2 分析触发失败";
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.name === 'ApiError') {
        errorMessage = error.message || "API 请求失败";
      }
      
      // 【修复】区分不同类型的错误，提供更准确的错误提示
      // 1. 超时错误：可能是后端服务异常或网络问题
      if (error?.code === 'TIMEOUT_ERROR' || errorMessage.includes('超时') || errorMessage.includes('timeout')) {
        errorMessage = errorMessage.includes('Part2') 
          ? errorMessage 
          : "Part2 分析请求超时，请检查后端服务是否正常运行";
        toast.error(errorMessage);
      } 
      // 2. 认证错误：跳转到登录页
      else if (error?.code === 'AUTH_TOKEN_MISSING' || error?.code === 'AUTH_TOKEN_INVALID' || error?.code === 'UNAUTHORIZED' || error?.code === 'FORBIDDEN') {
        errorMessage = "认证失败，请重新登录";
        toast.error(errorMessage);
        // 延迟跳转，让用户看到错误提示
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } 
      // 3. 网络错误：提示检查网络连接
      else if (error?.code === 'NETWORK_ERROR' || errorMessage.includes('网络') || errorMessage.includes('network')) {
        toast.error(errorMessage || "网络连接失败，请检查您的网络设置或后端服务是否运行");
      }
      // 4. 其他错误：显示原始错误消息
      else {
        toast.error(errorMessage);
      }
      
      // 【修复】无论什么错误，都重置到 diagnosis 阶段，让用户可以重试
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
      {activeModal === 'lightroom' && <LightroomModal data={results.lightroom} imageAnalysis={results.image_analysis} userImageUrl={images.target} refImageUrl={images.source} taskId={taskId} onClose={() => setActiveModal(null)} />}
      {activeModal === 'photoshop' && <PhotoshopModal data={results.photoshop} onClose={() => setActiveModal(null)} />}
    </div>
  );
};
