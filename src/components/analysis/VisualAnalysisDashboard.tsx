import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { Vectorscope, DominantColor } from "./Vectorscope";
import { Info, Activity, PieChart, Eye, Brain, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { Button } from "../ui/button";
import { AIAnalysisPanel } from "./AIAnalysisPanel";
import { useLanguage } from '../../src/contexts/LanguageContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { DiagnosisRegion } from "../../types/analysis";

interface VisualAnalysisDashboardProps {
  imageSrc: string | null;
  histogramElement?: React.ReactNode; // Pass existing histogram as slot
  onToggleFalseColor: () => void;
  isFalseColorActive: boolean;
  analysisData?: any;
  onStartAnalysis?: () => void;
  isAnalyzing?: boolean;
  onActiveRegionsChange?: (regions: DiagnosisRegion[]) => void;
  hoverColor?: {r:number, g:number, b:number, hex:string} | null;
}

export const VisualAnalysisDashboard = forwardRef<{ triggerDiagnosis: () => void }, VisualAnalysisDashboardProps>(({
  imageSrc,
  histogramElement,
  onToggleFalseColor,
  isFalseColorActive,
  analysisData,
  onStartAnalysis,
  isAnalyzing = false,
  onActiveRegionsChange,
  hoverColor,
}, ref) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"histogram" | "vectorscope" | "ai">("histogram");
  const [dominantColors, setDominantColors] = useState<DominantColor[]>([]); // 存储从色彩雷达提取的主色调
  const aiPanelRef = useRef<{ triggerDiagnosis: () => void } | null>(null); // 用于直接调用 AI 诊断
  const [aiDiagnosing, setAiDiagnosing] = useState(false); // AI 诊断状态（持久化）
  
  // 【修复】将诊断结果状态提升到父组件，避免组件卸载时丢失状态
  // 这样即使切换到其他标签页再切换回来，诊断结果也不会丢失
  // 【增强】使用 localStorage 持久化诊断结果，即使组件完全卸载也能恢复
  // 【重要修复】由于 imageSrc 是 blob URL，每次刷新都会变化，所以需要使用图片内容的 hash 作为 key
  // 使用图片的 base64 数据的 hash 作为 key，确保不同图片的诊断结果不会混淆
  const [imageHash, setImageHash] = useState<string | null>(null); // 存储图片的 hash
  
  // 【重要】计算图片的 hash，用于生成稳定的 localStorage key
  // 由于 blob URL 每次刷新都会变化，我们需要使用图片内容的 hash
  useEffect(() => {
    if (!imageSrc) {
      setImageHash(null);
      return;
    }
    
    // 异步计算图片的 hash
    const calculateImageHash = async () => {
      try {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageSrc;
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        
        // 将图片转换为 base64，然后计算 hash
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(img.width, 100); // 使用小尺寸计算 hash，提高性能
        canvas.height = Math.min(img.height, 100);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('[VisualAnalysisDashboard] 无法创建 Canvas 上下文');
          setImageHash(null);
          return;
        }
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // 计算简单的 hash（使用像素数据的简单 hash）
        let hash = 0;
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          // 只使用 RGB 通道，忽略 Alpha
          hash = ((hash << 5) - hash) + data[i];     // R
          hash = ((hash << 5) - hash) + data[i + 1]; // G
          hash = ((hash << 5) - hash) + data[i + 2]; // B
          hash = hash & hash; // 转换为 32 位整数
        }
        
        // 使用图片尺寸和 hash 组合，确保唯一性
        const finalHash = `${img.width}_${img.height}_${Math.abs(hash).toString(36)}`;
        console.log('[VisualAnalysisDashboard] 图片 hash 计算完成:', {
          hash: finalHash,
          imageSize: `${img.width}x${img.height}`,
          imageSrc: imageSrc.substring(0, 50) + '...'
        });
        setImageHash(finalHash);
      } catch (error) {
        console.error('[VisualAnalysisDashboard] 计算图片 hash 失败:', error);
        setImageHash(null);
      }
    };
    
    calculateImageHash();
  }, [imageSrc]);
  
  // 【修复】使用图片 hash 作为 localStorage key，而不是 blob URL
  // 这样可以确保即使刷新页面，blob URL 变化，也能正确恢复诊断结果
  const getDiagnosisStorageKey = (hash: string | null) => {
    if (!hash) return null;
    return `diagnosis_${hash}`;
  };
  
  // 【初始化】从 localStorage 恢复诊断结果（如果存在）
  // 【修复】由于 imageHash 是异步计算的，初始状态为 null，所以初始诊断结果也为 null
  // 当 imageHash 计算完成后，会通过 useEffect 恢复诊断结果
  const [diagnosisResult, setDiagnosisResult] = useState<any>(null);
  
  // 【重要】使用 useRef 跟踪上一次的 imageHash，只有真正变化时才恢复诊断结果
  const prevImageHashRef = useRef<string | null>(null);
  
  // 【重要】当 imageHash 计算完成后，尝试从 localStorage 恢复诊断结果
  // 【修复】只有当 imageHash 真正变化时（从一张图切换到另一张图），才恢复诊断结果
  useEffect(() => {
    if (!imageHash) {
      // 如果还没有 hash，不清空诊断结果（可能正在计算中）
      return;
    }
    
    // 【修复】只有当 imageHash 真正变化时，才从 localStorage 恢复诊断结果
    // 如果 imageHash 与上一次相同，说明是同一张图，不需要恢复
    if (prevImageHashRef.current === imageHash) {
      console.log('[VisualAnalysisDashboard] imageHash 未变化，跳过恢复:', {
        hash: imageHash
      });
      return;
    }
    
    // 【重要】记录 hash 变化
    console.log('[VisualAnalysisDashboard] imageHash 变化，尝试恢复诊断结果:', {
      prevHash: prevImageHashRef.current,
      newHash: imageHash
    });
    
    const storageKey = getDiagnosisStorageKey(imageHash);
    if (storageKey) {
      try {
        // 【详细日志】记录恢复过程
        console.log('[VisualAnalysisDashboard] 【恢复检查】尝试从 localStorage 恢复诊断结果:', {
          storageKey: storageKey,
          hash: imageHash,
          localStorageLength: localStorage.length
        });
        
        // 【调试】列出所有以 'diagnosis_' 开头的 key
        const allDiagnosisKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('diagnosis_')) {
            allDiagnosisKeys.push(key);
          }
        }
        console.log('[VisualAnalysisDashboard] 【调试】所有 diagnosis_ 开头的 key:', allDiagnosisKeys);
        
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('[VisualAnalysisDashboard] ✅ 从 localStorage 恢复诊断结果:', {
            storageKey: storageKey,
            hash: imageHash,
            hasResult: parsed !== null,
            resultKeys: parsed ? Object.keys(parsed) : [],
            storedLength: stored.length
          });
          setDiagnosisResult(parsed);
        } else {
          console.log('[VisualAnalysisDashboard] ⚠️ localStorage 中没有找到诊断结果:', {
            storageKey: storageKey,
            hash: imageHash,
            allDiagnosisKeys: allDiagnosisKeys,
            // 【调试】检查是否有类似的 key（可能是 hash 计算不一致）
            similarKeys: allDiagnosisKeys.filter(k => k.includes(imageHash.split('_')[0]) || k.includes(imageHash.split('_')[1]))
          });
          // 【修复】如果没有找到诊断结果，不清空当前状态，保持现状
          // 因为可能是新图片，还没有诊断结果
        }
      } catch (error) {
        console.error('[VisualAnalysisDashboard] ❌ 恢复诊断结果失败:', error);
      }
    } else {
      console.warn('[VisualAnalysisDashboard] ⚠️ 无法生成 storageKey，无法恢复诊断结果');
    }
    
    // 更新上一次的 imageHash
    prevImageHashRef.current = imageHash;
  }, [imageHash]);
  
  // 【修复】使用 useRef 跟踪上一次的 imageSrc，只有真正变化时才清空诊断结果
  // 这样可以避免组件重新挂载或切换标签页时误清空诊断结果
  const prevImageSrcRef = useRef<string | null>(imageSrc);
  
  // 【重要】当图片真正切换时（从一张图切换到另一张图），清空旧的诊断结果
  // 因为不同图片的诊断结果不同，必须重新分析
  // 【修复】只有当 imageSrc 真正变化时才清空，而不是每次组件挂载时都清空
  useEffect(() => {
    // 【日志】记录 imageSrc 变化情况
    console.log('[VisualAnalysisDashboard] imageSrc 变化检查:', {
      currentImageSrc: imageSrc?.substring(0, 50) + '...',
      prevImageSrc: prevImageSrcRef.current?.substring(0, 50) + '...',
      hasDiagnosisResult: diagnosisResult !== null,
      isImageChanged: prevImageSrcRef.current !== imageSrc
    });
    
    // 【修复】只有当 imageSrc 从一张图切换到另一张图时才清空旧的诊断结果
    // 如果 imageSrc 为 null 或与上一次相同，不清空
    // 【重要】使用 prevImageSrcRef.current 而不是 diagnosisResult 来判断，避免循环依赖
    // 【注意】由于现在使用 imageHash 作为 key，图片切换时 hash 会变化，所以不需要手动清空
    // hash 变化时，useEffect 会自动尝试从 localStorage 恢复新图片的诊断结果
    if (imageSrc && prevImageSrcRef.current !== null && prevImageSrcRef.current !== imageSrc) {
      console.log('[VisualAnalysisDashboard] ⚠️ 图片切换，等待新的 hash 计算:', {
        prevImageSrc: prevImageSrcRef.current?.substring(0, 50) + '...',
        newImageSrc: imageSrc.substring(0, 50) + '...',
        hadDiagnosisResult: diagnosisResult !== null
      });
      // 【重要】图片切换时，重置 AI 诊断状态，避免卡在"正在分析"状态
      // 因为新图片需要重新分析，旧的分析状态不应该保留
      setAiDiagnosing(false);
      console.log('[VisualAnalysisDashboard] ✅ 图片切换：AI 诊断状态已重置为 false');
      // 图片切换时，imageHash 会重新计算，useEffect 会自动处理恢复逻辑
      // 这里不需要手动清空，因为新的 hash 会触发 useEffect 恢复新图片的诊断结果
    } else {
      console.log('[VisualAnalysisDashboard] ✅ 图片未切换，保留诊断结果:', {
        imageSrc: imageSrc?.substring(0, 50) + '...',
        hasDiagnosisResult: diagnosisResult !== null
      });
    }
    // 更新上一次的 imageSrc
    prevImageSrcRef.current = imageSrc;
    // 【修复】移除 diagnosisResult 依赖，避免循环依赖导致的问题
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc]);
  
  // 【持久化】当诊断结果更新时，保存到 localStorage
  // 【修复】使用 imageHash 作为 key，而不是 imageSrc（blob URL）
  // 【重要】只有当诊断结果不为 null 时才保存，当诊断结果为 null 时不清空 localStorage
  // 因为诊断结果为 null 可能是组件初始化或切换标签页导致的，不应该清空已保存的数据
  useEffect(() => {
    // 【详细日志】记录诊断结果和 imageHash 的状态
    console.log('[VisualAnalysisDashboard] 【持久化检查】诊断结果更新:', {
      hasImageHash: !!imageHash,
      imageHash: imageHash,
      hasDiagnosisResult: diagnosisResult !== null,
      diagnosisResultType: typeof diagnosisResult,
      diagnosisResultKeys: diagnosisResult ? Object.keys(diagnosisResult) : []
    });
    
    if (!imageHash) {
      // 如果还没有 hash，无法保存
      console.warn('[VisualAnalysisDashboard] ⚠️ 无法保存诊断结果：imageHash 还未计算完成');
      return;
    }
    
    if (diagnosisResult !== null) {
      // 【保存】只有当诊断结果不为 null 时才保存到 localStorage
      const storageKey = getDiagnosisStorageKey(imageHash);
      if (storageKey) {
        try {
          const serialized = JSON.stringify(diagnosisResult);
          localStorage.setItem(storageKey, serialized);
          console.log('[VisualAnalysisDashboard] ✅ 诊断结果已保存到 localStorage:', {
            storageKey: storageKey,
            hash: imageHash,
            hasResult: diagnosisResult !== null,
            resultKeys: diagnosisResult ? Object.keys(diagnosisResult) : [],
            serializedLength: serialized.length,
            // 【验证】立即读取验证保存是否成功
            verification: localStorage.getItem(storageKey) ? '✅ 验证成功' : '❌ 验证失败'
          });
        } catch (error) {
          console.error('[VisualAnalysisDashboard] ❌ 保存诊断结果到 localStorage 失败:', error);
          // 【错误处理】如果是存储空间不足，尝试清理旧数据
          if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            console.warn('[VisualAnalysisDashboard] ⚠️ localStorage 存储空间不足，尝试清理旧数据...');
            // 清理所有以 'diagnosis_' 开头的旧数据
            try {
              const keysToRemove: string[] = [];
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('diagnosis_') && key !== storageKey) {
                  keysToRemove.push(key);
                }
              }
              keysToRemove.forEach(key => localStorage.removeItem(key));
              console.log(`[VisualAnalysisDashboard] 已清理 ${keysToRemove.length} 个旧的诊断结果`);
              // 重试保存
              localStorage.setItem(storageKey, JSON.stringify(diagnosisResult));
              console.log('[VisualAnalysisDashboard] ✅ 重试保存成功');
            } catch (retryError) {
              console.error('[VisualAnalysisDashboard] ❌ 重试保存失败:', retryError);
            }
          }
        }
      } else {
        console.warn('[VisualAnalysisDashboard] ⚠️ 无法生成 storageKey');
      }
    } else {
      console.log('[VisualAnalysisDashboard] ℹ️ 诊断结果为 null，不保存到 localStorage（不清空已保存的数据）');
    }
    // 【修复】移除清空 localStorage 的逻辑
    // 因为诊断结果为 null 可能是组件初始化或切换标签页导致的，不应该清空已保存的数据
    // 只有当图片切换（imageHash 变化）时，才会尝试恢复新图片的诊断结果
  }, [diagnosisResult, imageHash]);

  // 【重要】使用 useImperativeHandle 暴露 triggerDiagnosis 方法
  // 这样父组件（App.tsx）可以通过 ref 同时触发两个图片的诊断
  // 【修复】使用 useRef 存储 aiPanelRef，避免闭包问题和无限循环
  // 注意：不要将 aiPanelRef.current 放在 useEffect 依赖数组中，因为它是对象引用，会导致无限循环
  useImperativeHandle(ref, () => ({
    triggerDiagnosis: () => {
      console.log('[VisualAnalysisDashboard] triggerDiagnosis 被调用，切换到 AI 标签页');
      // 【重要修复】不要在这里设置 setAiDiagnosing(true)
      // 因为如果 handleStartDiagnosis 没有被真正调用（被防重复触发机制阻止），
      // 状态会一直保持为 true，导致后续调用都被阻止
      // 应该在 handleStartDiagnosis 真正开始执行时再设置状态
      // 切换到 AI 标签页
      setActiveTab("ai");
      // 【重要】延迟触发，确保 AI 标签页已渲染，然后通过 ref 直接调用 handleStartDiagnosis
      // 使用 requestAnimationFrame 确保 DOM 更新完成后再触发
      // 【防重复触发】使用 setTimeout 的返回值来跟踪是否已经触发，避免重复触发
      requestAnimationFrame(() => {
        setTimeout(() => {
          // 使用最新的 ref 值，避免闭包问题
          const currentPanel = aiPanelRef.current;
          if (currentPanel) {
            console.log('[VisualAnalysisDashboard] 通过 ref 触发 AI 诊断');
            currentPanel.triggerDiagnosis();
            // 【重要修复】只有在成功触发诊断后才设置状态
            // 这样如果触发被阻止（如防重复触发），状态不会错误地保持为 true
            // 注意：实际的状态设置应该在 handleStartDiagnosis 内部进行
          } else {
            console.warn('[VisualAnalysisDashboard] aiPanelRef.current 为空，无法触发诊断');
            // 【重试机制】如果 ref 为空，可能是 AI 标签页还未渲染，延迟重试一次
            setTimeout(() => {
              const retryPanel = aiPanelRef.current;
              if (retryPanel) {
                console.log('[VisualAnalysisDashboard] 重试触发 AI 诊断');
                retryPanel.triggerDiagnosis();
              }
            }, 200);
          }
        }, 100); // 减少延迟时间，从 200ms 改为 100ms
      });
    }
  }), []); // 【重要】空依赖数组，避免重复创建 triggerDiagnosis 方法

  if (!imageSrc) return null;

  return (
    <div className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden flex flex-col md:flex-row">
      {/* Left Control / Context Panel */}
      <div className="p-4 border-b md:border-b-0 md:border-r border-white/10 md:w-48 flex flex-col gap-4 bg-black/20">
        <div className="space-y-1">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">{t('vad.tools')}</h3>
          <p className="text-[10px] text-white/40">{t('vad.scopes')}</p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant={activeTab === "histogram" ? "secondary" : "ghost"}
            size="sm"
            className="justify-start text-xs"
            onClick={() => setActiveTab("histogram")}
          >
            <Activity className="w-3 h-3 mr-2" />
            {t('vad.histogram')}
          </Button>
          
          <Button
            variant={activeTab === "vectorscope" ? "secondary" : "ghost"}
            size="sm"
            className="justify-start text-xs"
            onClick={() => setActiveTab("vectorscope")}
          >
            <PieChart className="w-3 h-3 mr-2" />
            {t('vad.vectorscope')}
          </Button>
          
          <Button
            variant={activeTab === "ai" ? "secondary" : "ghost"}
            size="sm"
            className={`justify-start text-xs ${activeTab === 'ai' ? 'text-optic-accent' : ''}`}
            onClick={() => setActiveTab("ai")}
          >
            <Brain className="w-3 h-3 mr-2" />
            {t('vad.ai_diagnosis')}
          </Button>
        </div>

        <div className="my-2 border-t border-white/10" />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase font-bold text-white/60">{t('vad.overlays')}</label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3 h-3 text-white/30 hover:text-white" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px]">
                  <p className="text-xs">{t('vad.false_color_desc')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <Button
            variant={isFalseColorActive ? "destructive" : "outline"}
            size="sm"
            className={`w-full justify-start text-xs transition-all ${isFalseColorActive ? "bg-pink-500/20 text-pink-200 border-pink-500/50 hover:bg-pink-500/30" : "bg-transparent border-white/20 text-white/70 hover:bg-white/5"}`}
            onClick={onToggleFalseColor}
          >
            <Eye className="w-3 h-3 mr-2" />
            {isFalseColorActive ? t('vad.hide_map') : t('vad.show_map')}
          </Button>
        </div>
      </div>

      {/* Main Visualization Area */}
      <div className="flex-1 p-4 flex flex-col relative min-h-[280px] justify-center items-center bg-gradient-to-b from-black/0 to-black/20">
        
        {activeTab === "histogram" && (
          <div className="w-full h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-white/50">{t('vad.luma_dist')}</span>
              <span className="text-[10px] text-white/30">{t('vad.luma_range')}</span>
            </div>
            <div className="flex-1 relative">
              {histogramElement}
            </div>
            <p className="mt-2 text-[10px] text-white/40 text-center">
              {t('vad.hist_desc')}
            </p>
          </div>
        )}

        {activeTab === "vectorscope" && (
          <div className="w-full h-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
             <div className="flex items-center justify-between w-full mb-2 px-4">
              <span className="text-xs font-mono text-white/50">{t('vad.chroma_vec')}</span>
              <span className="text-[10px] text-white/30">{t('vad.chroma_range')}</span>
            </div>
            
            {/* 【重要】色彩雷达组件：前端实时计算，不使用硬编码模拟数据 */}
            {/* 数据来源：从 imageSrc 图片中实时提取像素数据，进行 HSV 转换和降维处理 */}
            {imageSrc ? (
              <Vectorscope 
                imageSrc={imageSrc} 
                width={256} 
                height={256}
                onDominantColorsExtracted={(colors) => {
                  // 【日志】记录主色调数据接收
                  console.log('[VisualAnalysisDashboard] 接收到主色调数据:', colors);
                  setDominantColors(colors);
                }}
                hoverColor={hoverColor}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">
                <p>{t('vad.upload_image_first') || '请先上传图片'}</p>
              </div>
            )}
            
            <div className="mt-4 flex flex-col items-center gap-1">
              <p className="text-[10px] text-white/40 text-center max-w-xs">
                <strong className="text-green-400">{t('vad.vector_desc')}</strong>
              </p>
              
              <Popover>
                <PopoverTrigger asChild>
                  <button className="group flex items-center gap-1.5 text-[10px] text-pink-400 hover:text-pink-300 transition-colors cursor-help py-1 px-2 rounded-full hover:bg-pink-500/10 border border-transparent hover:border-pink-500/20">
                    <span>{t('vad.skin_tone')}</span>
                    <HelpCircle className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" className="w-64 p-0 bg-black/90 backdrop-blur-xl border-white/10 shadow-2xl">
                  <div className="p-4 space-y-3">
                    {/* 【标题】肤色指示线说明 - 支持中英文 */}
                    <div className="border-b border-white/10 pb-2 mb-2 flex items-center justify-between">
                      <h4 className="font-medium text-white text-xs flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.8)]"></div>
                        {t('vad.skin_tone_title')}
                      </h4>
                      <span className="text-[9px] text-white/30 font-mono">{t('vad.skin_tone_subtitle')}</span>
                    </div>
                    
                    {/* 【内容】位置和含义说明 - 支持中英文 */}
                    <div className="space-y-2 text-[10px] text-white/70 leading-relaxed">
                      <div className="flex gap-2 items-start">
                        <span className="text-pink-400 whitespace-nowrap font-mono opacity-80">📍 {t('vad.skin_tone_location')}</span>
                        <span>{t('vad.skin_tone_location_desc')}</span>
                      </div>
                      
                      <div className="flex gap-2 items-start">
                        <span className="text-pink-400 whitespace-nowrap font-mono opacity-80">💡 {t('vad.skin_tone_meaning')}</span>
                        <span>{t('vad.skin_tone_meaning_desc')}</span>
                      </div>

                      {/* 【判断指南】颜色编码的清单 - 支持中英文 */}
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-white/40 mb-2 font-mono text-[9px] uppercase tracking-wider flex items-center gap-1">
                          <Activity className="w-2.5 h-2.5" />
                          {t('vad.skin_tone_guide')}
                        </p>
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2 text-green-400/90 bg-green-500/5 p-1.5 rounded border border-green-500/10">
                            <CheckCircle2 className="w-3 h-3 shrink-0" /> 
                            <span>{t('vad.skin_tone_accurate')}</span>
                          </li>
                          <li className="flex items-center gap-2 text-yellow-400/90 hover:bg-yellow-500/5 p-1 rounded transition-colors">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>{t('vad.skin_tone_yellow')}</span>
                          </li>
                          <li className="flex items-center gap-2 text-red-400/90 hover:bg-red-500/5 p-1 rounded transition-colors">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>{t('vad.skin_tone_red')}</span>
                          </li>
                          <li className="flex items-center gap-2 text-emerald-400/90 hover:bg-emerald-500/5 p-1 rounded transition-colors">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>{t('vad.skin_tone_green')}</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
        
        {activeTab === "ai" && (
           <div className="w-full h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
              <AIAnalysisPanel 
                isAnalyzing={aiDiagnosing} // 【修复】使用持久化的 AI 诊断状态
                onAnalysisStateChange={setAiDiagnosing} // 【修复】允许子组件更新状态
                analysisData={analysisData}
                onStartAnalysis={onStartAnalysis || (() => {})}
                imageSrc={imageSrc}
                dominantColors={dominantColors}  // 传递主色调数据（来自色彩雷达）
                ref={aiPanelRef} // 【重要】传递 ref，用于从外部触发诊断
                diagnosisResult={diagnosisResult} // 【修复】传递诊断结果状态
                onDiagnosisResultChange={(result) => {
                  // 【日志】记录诊断结果更新
                  console.log('[VisualAnalysisDashboard] 诊断结果更新:', {
                    hasResult: result !== null,
                    resultKeys: result ? Object.keys(result) : [],
                    imageSrc: imageSrc?.substring(0, 50) + '...',
                    prevDiagnosisResult: diagnosisResult !== null
                  });
                  setDiagnosisResult(result);
                }} // 【修复】传递状态更新函数
                onActiveRegionsChange={onActiveRegionsChange} // 【新增】传递区域更新函数
              />
           </div>
        )}

      </div>
    </div>
  );
});
