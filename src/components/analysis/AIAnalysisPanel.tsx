import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import { Brain, Sparkles, RefreshCw, Ruler, ScanEye, Aperture, Layers, Sliders, AlertTriangle } from "lucide-react";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { ZoneSystemVisualizer } from "./ZoneSystemVisualizer";
import { ColorGradeWheel } from "./ColorGradeWheel";
import { LightroomPanel } from "./LightroomPanel";
import { PhotoshopPanel } from "./PhotoshopPanel";
import { HSLVisualizer } from "./HSLVisualizer";
import { FullAnalysisData, DiagnosisResult, DiagnosisRegion } from "../../types/analysis";
import { MOCK_PS_ADVANCED } from "../../src/lib/mockData";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { api, ApiError } from "../../src/lib/api";
import { toast } from "sonner";
import { DominantColor } from "./Vectorscope";

// Mock Data Generator (Simulates Backend Response)
const MOCK_FULL_DATA: FullAnalysisData = {
    review: {
        style_summary: "Cyberpunk Neo-Noir",
        comprehensive_review: "The image exhibits a strong high-contrast aesthetic typical of modern sci-fi cinema. The separation between the cool ambient fill and the warm practical lights creates a compelling depth.",
        pros_evaluation: "Excellent dynamic range usage."
    },
    lighting: {
        exposure_control: [
            { param: "Exposure", range: "+0.5", desc: "Slight push for midtone visibility." }
        ]
    },
    color: {
        style_key_points: "Cyberpunk Teal & Orange",
        white_balance: {
            temp: { value: 4500, range: "4000-5000K", reason: "Cooler temp" },
            tint: { value: 12, range: "+10 to +20", reason: "Magenta shift" }
        },
        color_grading: {
            highlights: { hue: 40, saturation: 20, reason: "Warm highlights" },
            midtones: { hue: 0, saturation: 0, reason: "Neutral" },
            shadows: { hue: 210, saturation: 15, reason: "Cool shadows" },
            balance: 0
        },
        hsl: {
            red: { hue: 0, saturation: 10, luminance: 0 },
            orange: { hue: -5, saturation: 15, luminance: 5 },
            yellow: { hue: -15, saturation: -10, luminance: 0 },
            green: { hue: 0, saturation: -40, luminance: -10 },
            aqua: { hue: 10, saturation: 20, luminance: 0 },
            blue: { hue: 5, saturation: 30, luminance: -5 },
            purple: { hue: 0, saturation: 0, luminance: 0 },
            magenta: { hue: 0, saturation: 10, luminance: 0 }
        }
    },
    composition: {
        structure: { visual_frame: "Central Perspective", geometry: "Triangular", balance: "Asymmetrical" },
        subject: { position: "Lower Third", weight_score: 85, method: "Rule of Thirds", analysis: "The subject is anchored in the lower third, creating a sense of scale." },
        lines: { path: ["Lead-in from bottom", "Converge at center"], guide: "Linear" },
        zones: { foreground: "Street", midground: "Character", background: "Cityscape", perspective: "Deep" },
        proportions: { entities: "60%", negative: "40%", distribution: "Balanced" },
        balance: { horizontal: "Weighted Left", vertical: "Bottom Heavy", strategy: "Counterpoint" },
        style: { name: "Cinematic", method: "Depth of Field", features: "High Contrast" }
    },
    lightroom: {
        histogram: { r: [], g: [], b: [], l: [], avg_l: 0.4, shadows: 0.2, midtones: 0.5, highlights: 0.8 },
        basic_panel: {
            temp: { value: 4500, min: 2000, max: 10000, target_min: 4000, target_max: 5000, range: "4500K", reason: "Cooler temp enhances the futuristic mood." },
            tint: { value: 12, min: -150, max: 150, target_min: 10, target_max: 20, range: "+12", reason: "Magenta shift to counteract green fluorescent cast." },
            exposure: { value: 0.5, min: -5, max: 5, target_min: 0.4, target_max: 0.6, range: "+0.5", reason: "Slight push for midtone visibility." },
            contrast: { value: 20, min: -100, max: 100, target_min: 15, target_max: 25, range: "+20", reason: "Cinematic punch." },
            highlights: { value: -30, min: -100, max: 100, target_min: -35, target_max: -25, range: "-30", reason: "Recover highlight details." },
            shadows: { value: 15, min: -100, max: 100, target_min: 10, target_max: 20, range: "+15", reason: "Lift crushed blacks." },
            whites: { value: 5, min: -100, max: 100, target_min: 0, target_max: 10, range: "+5", reason: "Clean whites." },
            blacks: { value: -10, min: -100, max: 100, target_min: -15, target_max: -5, range: "-10", reason: "Deepen blacks." },
            texture: { value: 10, min: -100, max: 100, target_min: 5, target_max: 15, range: "+10", reason: "Enhance surface details." },
            clarity: { value: 15, min: -100, max: 100, target_min: 10, target_max: 20, range: "+15", reason: "Local contrast boost." },
            dehaze: { value: 5, min: -100, max: 100, target_min: 0, target_max: 10, range: "+5", reason: "Cut through smog." },
            vibrance: { value: 10, min: -100, max: 100, target_min: 5, target_max: 15, range: "+10", reason: "Boost muted colors." },
            saturation: { value: -5, min: -100, max: 100, target_min: -10, target_max: 0, range: "-5", reason: "Control neon spill." }
        },
        curve: {
            rgb: [], red: [], green: [], blue: [],
            analysis: { rgb: "S-Curve", red: "Warm Mids" },
            tips: ["Lift blacks", "Roll off highlights"],
            reason: "S-Curve for contrast with lifted blacks for film look."
        },
        hsl: {
            red: { hue: 0, saturation: 10, luminance: 0 },
            orange: { hue: -5, saturation: 15, luminance: 5 },
            yellow: { hue: -15, saturation: -10, luminance: 0 },
            green: { hue: 0, saturation: -40, luminance: -10 },
            aqua: { hue: 10, saturation: 20, luminance: 0 },
            blue: { hue: 5, saturation: 30, luminance: -5 },
            purple: { hue: 0, saturation: 0, luminance: 0 },
            magenta: { hue: 0, saturation: 10, luminance: 0 }
        },
        split_toning: {
            highlights: { hue: 40, saturation: 20, reason: "Warm highlights" },
            midtones: { hue: 0, saturation: 0, reason: "Neutral" },
            shadows: { hue: 210, saturation: 15, reason: "Cool shadows" },
            balance: { value: 0, min: -100, max: 100, target_min: -10, target_max: 10, reason: "Balanced" }
        }
    },
    photoshop: MOCK_PS_ADVANCED as any
};

/**
 * AI 诊断结果接口
 */

interface AIAnalysisPanelProps {
  isAnalyzing: boolean;
  analysisData: FullAnalysisData | null;
  onStartAnalysis: () => void;
  imageSrc?: string | null;
  /**
   * 主色调列表（从色彩雷达提取）
   * 用于 AI 诊断分析
   */
  dominantColors?: DominantColor[];
  /**
   * 【修复】诊断结果状态（从父组件传入，避免组件卸载时丢失）
   * 如果提供了这个 prop，则使用它；否则使用内部状态
   */
  diagnosisResult?: DiagnosisResult | null;
  /**
   * 【修复】诊断结果状态更新函数（从父组件传入）
   * 如果提供了这个 prop，则使用它更新父组件状态；否则使用内部状态
   */
  onDiagnosisResultChange?: (result: DiagnosisResult | null) => void;
  /**
   * 【新增】当需要高亮显示区域时调用
   */
  onActiveRegionsChange?: (regions: DiagnosisRegion[]) => void;
  /**
   * 【新增】分析状态变更回调
   */
  onAnalysisStateChange?: (isAnalyzing: boolean) => void;
}

export const AIAnalysisPanel = forwardRef<{ triggerDiagnosis: () => void }, AIAnalysisPanelProps>(({
  isAnalyzing,
  analysisData: propAnalysisData,
  onStartAnalysis,
  imageSrc,
  dominantColors = [],
  diagnosisResult: propDiagnosisResult, // 【修复】从父组件传入的诊断结果
  onDiagnosisResultChange, // 【修复】诊断结果更新函数
  onActiveRegionsChange, // 【新增】
  onAnalysisStateChange, // 【新增】
}, ref) => {
  const { t } = useLanguage();
  // 【状态管理】AI 诊断相关的内部状态
  // 注意：isAnalyzing 从 props 传入，但我们需要内部状态来管理诊断流程
  const [internalIsAnalyzing, setInternalIsAnalyzing] = useState(false);
  
  // 【修复】使用 onAnalysisStateChange 如果提供，否则使用内部状态
  const currentIsAnalyzing = onAnalysisStateChange ? isAnalyzing : internalIsAnalyzing;
  const setCurrentIsAnalyzing = (value: boolean | ((prev: boolean) => boolean)) => {
      if (onAnalysisStateChange) {
          const newValue = typeof value === 'function' ? value(isAnalyzing) : value;
          onAnalysisStateChange(newValue);
      } else {
          setInternalIsAnalyzing(value);
      }
  };

  const [scanProgress, setScanProgress] = useState(0);
  // 【修复】如果父组件提供了诊断结果状态，则使用父组件的状态；否则使用内部状态
  // 这样可以避免组件卸载时丢失诊断结果
  const [internalDiagnosisResult, setInternalDiagnosisResult] = useState<DiagnosisResult | null>(null);
  // 【修复】使用 propDiagnosisResult !== undefined 来判断是否使用父组件状态
  // 如果 propDiagnosisResult 为 null，仍然使用父组件状态（null 也是有效值）
  // 只有当 propDiagnosisResult 为 undefined 时，才使用内部状态
  const diagnosisResult = propDiagnosisResult !== undefined ? propDiagnosisResult : internalDiagnosisResult;
  const setDiagnosisResult = onDiagnosisResultChange || setInternalDiagnosisResult;
  
  // 【状态】当前选中的评分维度（用于高亮显示）
  const [activeScore, setActiveScore] = useState<string | null>(null);

  // 【交互】点击评分卡片
  const handleScoreClick = (key: string, scoreData: any) => {
      console.log('[AIAnalysisPanel] 点击评分卡片:', key, scoreData);
      
      // 切换选中状态
      const newActiveScore = activeScore === key ? null : key;
      setActiveScore(newActiveScore);
      
      // 更新高亮区域
      if (onActiveRegionsChange) {
          if (newActiveScore && scoreData && typeof scoreData === 'object' && scoreData.regions) {
              console.log('[AIAnalysisPanel] 激活区域高亮:', scoreData.regions);
              onActiveRegionsChange(scoreData.regions);
          } else {
              console.log('[AIAnalysisPanel] 清除区域高亮');
              onActiveRegionsChange([]);
          }
      }
  };
  
  // 【日志】记录诊断结果状态来源
  useEffect(() => {
    console.log('[AIAnalysisPanel] 诊断结果状态检查:', {
      propDiagnosisResult: propDiagnosisResult !== undefined ? (propDiagnosisResult !== null ? '有值' : 'null') : 'undefined',
      internalDiagnosisResult: internalDiagnosisResult !== null ? '有值' : 'null',
      finalDiagnosisResult: diagnosisResult !== null ? '有值' : 'null',
      usingParentState: propDiagnosisResult !== undefined,
      imageSrc: imageSrc?.substring(0, 50) + '...'
    });
  }, [propDiagnosisResult, internalDiagnosisResult, diagnosisResult, imageSrc]);
  const [displayedText, setDisplayedText] = useState(''); // 打字机效果显示的文本
  const [isTypewriting, setIsTypewriting] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  
  
  // 【重要】移除硬编码数据回退逻辑
  // 只使用从父组件传入的真实分析数据（propAnalysisData）
  // 不再使用 MOCK_FULL_DATA，确保 AI 诊断功能使用真实 API 数据
  const analysisData = propAnalysisData || null;

  /**
   * 计算直方图数据
   * 从 Histogram 组件逻辑中提取，用于 AI 诊断
   */
  /**
   * 计算直方图数据
   * 从图片中提取 RGB 和亮度（Luminance）直方图数据
   * 
   * @param imgSrc - 图片 URL（blob URL 或 base64）
   * @returns Promise<直方图数据>
   */
  const calculateHistogramData = async (imgSrc: string): Promise<{
    r: number[];
    g: number[];
    b: number[];
    l: number[];
    avgL: number;
    shadows: number;
    midtones: number;
    highlights: number;
  }> => {
    return new Promise((resolve, reject) => {
      console.log('[AIAnalysisPanel] calculateHistogramData 开始，imgSrc:', imgSrc.substring(0, 50) + '...');
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = imgSrc;

      img.onload = () => {
        console.log('[AIAnalysisPanel] calculateHistogramData 图片加载成功，开始计算直方图', {
          imgWidth: img.width,
          imgHeight: img.height
        });
        try {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 400 / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error('[AIAnalysisPanel] calculateHistogramData 无法创建 Canvas 上下文');
            reject(new Error('无法创建 Canvas 上下文'));
            return;
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const pixels = imageData.data;
          
          // 初始化 bins
          const rBins = new Array(256).fill(0);
          const gBins = new Array(256).fill(0);
          const bBins = new Array(256).fill(0);
          const lBins = new Array(256).fill(0);

          // 遍历像素
          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            // Luminance formula: 0.299R + 0.587G + 0.114B
            const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

            rBins[r]++;
            gBins[g]++;
            bBins[b]++;
            lBins[l]++;
          }

          // 计算统计数据
          const totalPixels = pixels.length / 4;
          let sumL = 0;
          let shadowsCount = 0;
          let midtonesCount = 0;
          let highlightsCount = 0;

          for (let i = 0; i < 256; i++) {
            sumL += lBins[i] * i;
            if (i < 85) shadowsCount += lBins[i];
            else if (i < 170) midtonesCount += lBins[i];
            else highlightsCount += lBins[i];
          }

          const avgL = sumL / totalPixels;
          const shadows = shadowsCount / totalPixels;
          const midtones = midtonesCount / totalPixels;
          const highlights = highlightsCount / totalPixels;

          console.log('[AIAnalysisPanel] calculateHistogramData 计算完成', {
            avgL: avgL.toFixed(2),
            shadows: shadows.toFixed(2),
            midtones: midtones.toFixed(2),
            highlights: highlights.toFixed(2)
          });

          resolve({
            r: rBins,
            g: gBins,
            b: bBins,
            l: lBins,
            avgL,
            shadows,
            midtones,
            highlights
          });
        } catch (error) {
          console.error('[AIAnalysisPanel] calculateHistogramData 计算过程中发生错误:', error);
          reject(error);
        }
      };

      img.onerror = (error) => {
        console.error('[AIAnalysisPanel] calculateHistogramData 图片加载失败:', {
          imgSrc: imgSrc.substring(0, 50) + '...',
          error: error
        });
        reject(new Error('图片加载失败'));
      };
    });
  };

  /**
   * 生成低分辨率图片（用于发送到后端）
   * @param imgSrc - 原始图片 URL
   * @param maxSize - 最大尺寸（默认 512）
   */
  const getLowResImage = async (imgSrc: string, maxSize: number = 512): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = imgSrc;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建 Canvas 上下文'));
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // 转换为 base64
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        resolve(base64);
      };

      img.onerror = (error) => {
        console.error('[AIAnalysisPanel] getLowResImage 图片加载失败:', {
          imgSrc: imgSrc.substring(0, 50) + '...',
          error: error
        });
        reject(new Error('图片加载失败'));
      };
    });
  };

  /**
   * 打字机效果：逐字显示文本
   */
  useEffect(() => {
    if (!diagnosisResult || !isTypewriting) {
      setDisplayedText('');
      return;
    }

    const text = diagnosisResult.critique;
    let currentIndex = 0;
    setDisplayedText('');

    const timer = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(timer);
        setIsTypewriting(false);
      }
    }, 30); // 每 30ms 显示一个字符

    return () => clearInterval(timer);
  }, [diagnosisResult, isTypewriting]);

  /**
   * 处理 AI 诊断启动
   * 收集数据并调用后端 API
   * 
   * 【重要】每个 AIAnalysisPanel 使用自己的数据：
   * - imageSrc: 当前面板对应的图片（参考图或用户图）
   * - histogramData: 从当前图片计算的直方图数据（通过 calculateHistogramData(imageSrc)）
   * - dominantColors: 从当前图片的色彩雷达提取的主色调（通过 props 传入）
   * 
   * 虽然 prompt 模板相同，但输入数据不同，所以输出结果也不同
   * 
   * 【修复】使用 useCallback 包裹，避免每次渲染时重新创建函数
   * 这样可以防止 useImperativeHandle 重复创建，导致多次触发诊断
   */
  /**
   * 启动 AI 诊断
   * 根据用户需求：无论点击哪一个"启动深度扫描"按钮，两边都同时启动 AI 分析
   * 
   * 【重要】错误处理：
   * 1. 如果 API 调用失败，必须重置所有状态（isAnalyzing, scanProgress, diagnosisResult）
   * 2. 必须清除进度更新定时器，避免内存泄漏
   * 3. 必须调用 onAnalysisStateChange(false)，确保父组件的状态也重置
   */
  const handleStartDiagnosis = useCallback(async () => {
    console.log('[AIAnalysisPanel] 🟢 handleStartDiagnosis 函数被调用', {
      timestamp: new Date().toISOString(),
      hasImageSrc: !!imageSrc,
      imageSrc: imageSrc?.substring(0, 50) + '...',
      isAnalyzingRef: isAnalyzingRef.current,
      currentIsAnalyzing: currentIsAnalyzing
    });
    
    if (!imageSrc) {
      console.error('[AIAnalysisPanel] ❌ 无法启动诊断：imageSrc 为空');
      toast.error('请先上传图片');
      return;
    }

    // 【防重复触发】如果正在分析中，直接返回，不重复触发
    // 【重要】使用 ref 检查，确保检查的是最新状态
    if (isAnalyzingRef.current) {
      console.warn('[AIAnalysisPanel] ⚠️ 诊断正在进行中，跳过重复调用', {
        isAnalyzingRef: isAnalyzingRef.current,
        currentIsAnalyzing: currentIsAnalyzing,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 【日志】记录当前诊断使用的数据来源
    console.log('[AIAnalysisPanel] 📊 handleStartDiagnosis 开始，使用当前面板的数据:', {
      imageSrc: imageSrc.substring(0, 50) + '...',
      dominantColorsCount: dominantColors.length,
      dominantColors: dominantColors.map(c => ({ h: c.h, s: c.s, v: c.v, hex: c.hex })),
      timestamp: new Date().toISOString()
    });

    // 【重要】进度更新定时器引用，用于在错误处理时清除
    let progressInterval: NodeJS.Timeout | null = null;
    // 【重要】超时监控定时器引用，用于在成功或失败时清除
    let timeoutMonitor: NodeJS.Timeout | null = null;

    try {
      // 【状态更新】设置内部分析状态为 true
      // 【重要】立即同步更新 ref，确保防重复触发机制正常工作
      // 因为 useEffect 更新 ref 是异步的，所以需要在这里立即更新
      // 【重要修复】必须在 try 块的最开始就设置状态，确保即使后续步骤失败，状态也能被正确重置
      isAnalyzingRef.current = true;
      setCurrentIsAnalyzing(true);
      setScanProgress(0);
      setDiagnosisResult(null);
      setDisplayedText('');
      
      // 【重要】记录状态设置，确保能看到状态变化
      console.log('[AIAnalysisPanel] ✅ 已设置分析状态为 true', {
        isAnalyzingRef: isAnalyzingRef.current,
        timestamp: new Date().toISOString()
      });

      // 【进度更新】模拟分析进度，从 0% 到 90%
      // 注意：进度更新定时器必须在成功或失败时都清除，避免内存泄漏
      // 【重要】添加超时监控，如果超过 200 秒（3分20秒）还没有结果，自动重置状态
      timeoutMonitor = setTimeout(() => {
        console.error('【AI 诊断】⚠️ 请求超时监控：超过 200 秒未收到响应，自动重置状态');
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        isAnalyzingRef.current = false;
        setCurrentIsAnalyzing(false);
        setScanProgress(0);
        setDiagnosisResult(null);
        toast.error('AI 诊断请求超时，请检查网络连接或稍后重试');
      }, 200000); // 200 秒超时监控
      
      progressInterval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 90) {
            // 达到 90% 后停止更新，等待 API 返回结果
            if (progressInterval) {
              clearInterval(progressInterval);
              progressInterval = null;
            }
            return 90;
          }
          return prev + 2;
        });
      }, 100);

      // 1. 计算直方图数据
      console.log('【AI 诊断】步骤 1：开始计算直方图数据...');
      const histogramData = await calculateHistogramData(imageSrc);
      console.log('【AI 诊断】步骤 1：直方图数据计算完成', {
        hasHistogramData: !!histogramData,
        histogramDataKeys: histogramData ? Object.keys(histogramData) : [],
        avgL: histogramData?.avgL
      });
      setScanProgress(30);

      // 2. 生成低分辨率图片
      console.log('【AI 诊断】步骤 2：开始生成低分辨率图片...');
      const lowResImage = await getLowResImage(imageSrc, 512);
      console.log('【AI 诊断】步骤 2：低分辨率图片生成完成', {
        hasLowResImage: !!lowResImage,
        lowResImageLength: lowResImage?.length || 0
      });
      setScanProgress(60);

      // 3. 调用诊断 API
      // 【重要】每个 AIAnalysisPanel 使用自己的数据：
      // - imageSrc: 当前面板对应的图片（参考图或用户图）
      // - histogramData: 从当前图片计算的直方图数据
      // - dominantColors: 从当前图片的色彩雷达提取的主色调
      // 虽然 prompt 模板相同，但输入数据不同，所以输出结果也不同
      console.log('【AI 诊断】开始调用后端 API...', {
        imageSrc: imageSrc?.substring(0, 50) + '...', // 只显示前50个字符，避免日志过长
        imageUrlLength: lowResImage.length,
        histogramDataKeys: Object.keys(histogramData),
        histogramDataAvgL: histogramData.avgL,
        histogramDataShadows: histogramData.shadows,
        histogramDataMidtones: histogramData.midtones,
        histogramDataHighlights: histogramData.highlights,
        dominantColorsCount: dominantColors.length,
        dominantColors: dominantColors.map(c => ({ h: c.h, s: c.s, v: c.v, hex: c.hex })) // 只记录关键信息
      });
      
      // 【重要】记录 API 调用前的状态，确保请求真的被发送
      console.log('【AI 诊断】准备发送 API 请求，当前状态:', {
        isAnalyzingRef: isAnalyzingRef.current,
        currentIsAnalyzing: currentIsAnalyzing,
        hasImageSrc: !!imageSrc,
        hasLowResImage: !!lowResImage,
        histogramDataSize: JSON.stringify(histogramData).length,
        dominantColorsCount: dominantColors.length,
        timestamp: new Date().toISOString()
      });
      
      // 【重要】在 API 调用前记录，确保能看到请求是否真的被发送
      console.log('【AI 诊断】🚀 即将发送 API 请求到后端...', {
        endpoint: '/analyze/diagnosis',
        method: 'POST',
        hasImageUrl: !!lowResImage,
        imageUrlLength: lowResImage?.length || 0,
        hasHistogramData: !!histogramData,
        histogramDataKeys: histogramData ? Object.keys(histogramData) : [],
        dominantColorsCount: dominantColors.length,
        timestamp: new Date().toISOString()
      });
      
      // 【重要】添加超时监控，记录请求开始时间
      const requestStartTime = Date.now();
      console.log('【AI 诊断】⏱️ 开始发送 API 请求，开始时间:', new Date().toISOString());
      
      let result;
      try {
        result = await api.analyze.diagnosis({
        imageUrl: lowResImage,
        histogramData,
        dominantColors: dominantColors.length > 0 ? dominantColors : [],
      });
      
        const requestDuration = Date.now() - requestStartTime;
      console.log('【AI 诊断】✅ API 调用成功，收到响应:', {
        hasResult: !!result,
        resultType: typeof result,
        resultKeys: result ? Object.keys(result) : [],
          requestDuration: `${requestDuration}ms`,
        timestamp: new Date().toISOString()
      });
      } catch (apiError: any) {
        const requestDuration = Date.now() - requestStartTime;
        console.error('【AI 诊断】❌ API 调用失败:', {
          error: apiError,
          errorType: apiError?.constructor?.name,
          errorMessage: apiError?.message,
          errorCode: apiError?.code,
          requestDuration: `${requestDuration}ms`,
          timestamp: new Date().toISOString()
        });
        // 重新抛出错误，让 catch 块处理
        throw apiError;
      }

      // 【重要】详细记录 API 返回结果，用于调试
      const apiResult = result as any;
      console.log('【AI 诊断】API 调用成功，返回结果:', {
        result: apiResult, // 完整结果对象
        hasScores: !!apiResult.scores,
        scoresKeys: apiResult.scores ? Object.keys(apiResult.scores) : [],
        hasCritique: !!apiResult.critique,
        critiqueLength: apiResult.critique?.length || 0,
        suggestionsCount: apiResult.suggestions?.length || 0,
        issuesCount: apiResult.issues?.length || 0,
        processingTime: apiResult.processingTime,
        resultType: typeof apiResult,
        isArray: Array.isArray(apiResult),
        isNull: apiResult === null,
        isUndefined: apiResult === undefined
      });

      // 【重要】清除进度更新定时器和超时监控（成功时）
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      if (timeoutMonitor) {
        clearTimeout(timeoutMonitor);
      }
      setScanProgress(100);

      // 4. 设置诊断结果（确保数据格式正确）
      // 【重要】后端返回的 scores 可能是对象格式 {exposure: {value: 8.5, description: ""}}
      // 需要检查并标准化数据格式
      if (!apiResult) {
        console.error('【AI 诊断】API 返回的数据为空:', {
          result: apiResult,
          resultType: typeof apiResult
        });
        throw new Error('API 返回的数据为空');
      }
      
      // 【数据格式标准化】确保 scores 格式正确
      if (!apiResult.scores) {
        console.error('【AI 诊断】API 返回的数据格式不正确: 缺少 scores 字段', {
          result: apiResult,
          resultKeys: Object.keys(apiResult || {})
        });
        throw new Error('API 返回的数据格式不正确：缺少 scores 字段');
      }
      
      // 【数据格式验证】检查 scores 是否包含必需的字段
      const requiredScoreKeys = ['exposure', 'color', 'composition', 'mood'];
      const missingKeys = requiredScoreKeys.filter(key => !apiResult.scores[key]);
      if (missingKeys.length > 0) {
        console.warn('【AI 诊断】scores 缺少部分字段，将使用默认值:', {
          missingKeys,
          existingKeys: Object.keys(apiResult.scores)
        });
        // 为缺失的字段添加默认值
        missingKeys.forEach(key => {
          if (!apiResult.scores[key]) {
            apiResult.scores[key] = { value: 5.0, description: '' };
          }
        });
      }
      
      // 【数据格式转换】如果 scores 是简单数值格式，转换为对象格式
      // 后端可能返回两种格式：{exposure: 8.5} 或 {exposure: {value: 8.5, description: ""}}
      Object.keys(apiResult.scores).forEach(key => {
        const scoreValue = apiResult.scores[key];
        if (typeof scoreValue === 'number') {
          // 简单数值格式，转换为对象格式
          apiResult.scores[key] = {
            value: scoreValue,
            description: ''
          };
        } else if (typeof scoreValue === 'object' && scoreValue !== null) {
          // 已经是对象格式，确保有 value 字段
          if (typeof scoreValue.value === 'undefined') {
            apiResult.scores[key] = {
              value: 5.0,
              description: scoreValue.description || ''
            };
          }
        }
      });
      
      console.log('【AI 诊断】数据格式标准化完成:', {
        scores: apiResult.scores,
        scoresKeys: Object.keys(apiResult.scores)
      });
      
      // 【重要】在设置诊断结果前，先记录状态
      console.log('【AI 诊断】准备设置诊断结果，当前状态:', {
        currentDiagnosisResult: diagnosisResult,
        willSetResult: apiResult,
        internalIsAnalyzing: internalIsAnalyzing
      });
      
      // 【修复】使用函数式更新，确保状态更新正确
      // 注意：setDiagnosisResult 可能不支持函数式更新（取决于父组件的实现）
      // 如果是 useState 的 setter，它支持；如果是自定义函数，可能不支持
      // 为了安全起见，直接传入新值，而不是函数
      if (onDiagnosisResultChange) {
          onDiagnosisResultChange(apiResult);
      } else {
          setInternalDiagnosisResult(apiResult);
      }
      
      setIsTypewriting(true); // 启动打字机效果
      
      // 【重要】在设置诊断结果后，立即重置分析状态
      // 这样界面会从"正在分析"切换到"显示诊断结果"
      // 注意：必须在 setDiagnosisResult 之后执行，确保状态更新顺序正确
      // 【修复】使用 setTimeout 确保状态更新顺序，避免 React 批处理导致的状态更新问题
      // 【重要】立即同步更新 ref，确保防重复触发机制正常工作
      isAnalyzingRef.current = false;
      setTimeout(() => {
        setCurrentIsAnalyzing(false);
        console.log('【AI 诊断】✅ 分析状态已重置为 false');
      }, 0);
      
      // 【重要】验证状态更新是否成功
      setTimeout(() => {
        console.log('【AI 诊断】状态更新后的验证:', {
          hasDiagnosisResult: !!apiResult,
          diagnosisResultKeys: apiResult ? Object.keys(apiResult) : [],
          internalIsAnalyzing: internalIsAnalyzing,
          currentIsAnalyzing: currentIsAnalyzing,
          shouldShowDiagnosis: apiResult !== null
        });
      }, 100);

      // 【修复】移除 onStartAnalysis() 调用，避免重复触发诊断
      // onStartAnalysis 应该只在用户点击按钮时调用，不应该在诊断完成后调用
      // 否则会导致诊断完成后再次触发诊断，形成无限循环

      toast.success('AI 诊断完成');
    } catch (error: any) {
      // 【错误处理】记录详细错误信息
      console.error('【AI 诊断】前端错误:', error);
      console.error('【AI 诊断】错误类型:', error?.constructor?.name);
      console.error('【AI 诊断】错误消息:', error?.message);
      console.error('【AI 诊断】错误堆栈:', error?.stack);
      
      // 【用户友好的错误提示】
      let errorMessage = 'AI 诊断失败，请重试';
      if (error instanceof ApiError) {
        // 如果是 ApiError，显示后端返回的错误消息
        errorMessage = error.message || 'AI 诊断失败，请检查网络连接或稍后重试';
        console.error('【AI 诊断】后端错误码:', error.code);
        
        // 【特殊处理】根据错误码提供更具体的错误提示
        if (error.code === 'NETWORK_ERROR') {
          errorMessage = '网络请求失败，请检查后端服务是否运行（端口 8081）或 CORS 配置是否正确';
        } else if (error.code === 'TIMEOUT_ERROR') {
          errorMessage = 'AI 诊断请求超时（超过 3 分钟），可能是图片较大或网络较慢，请稍后重试';
        } else if (error.code === 'INTERNAL_SERVER_ERROR' || error.code === 'INTERNAL_ERROR') {
          errorMessage = '服务器内部错误，请稍后重试。如果问题持续，请联系管理员';
        } else if (error.code === 'UNAUTHORIZED') {
          errorMessage = '登录已过期，请重新登录';
        }
      } else if (error?.message) {
        errorMessage = error.message;
        // 【网络错误特殊处理】
        if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
          errorMessage = '网络请求失败，请检查后端服务是否运行（端口 8081）或 CORS 配置是否正确';
        }
      } else {
        errorMessage = 'AI 诊断失败，请检查网络连接或稍后重试';
      }
      
      toast.error(errorMessage);
      
      // 【重要】清除进度更新定时器和超时监控（失败时）
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      if (timeoutMonitor) {
        clearTimeout(timeoutMonitor);
      }
      
      // 【错误处理】失败时重置所有状态
      setScanProgress(0);
      setDiagnosisResult(null);
      setDisplayedText('');
      
      // 【重要】失败时也要重置分析状态
      // 【重要】立即同步更新 ref，确保防重复触发机制正常工作
      isAnalyzingRef.current = false;
      // 使用 setTimeout 确保状态更新顺序正确
      setTimeout(() => {
        setCurrentIsAnalyzing(false);
        console.log('【AI 诊断】❌ 错误处理：分析状态已重置为 false');
      }, 0);
    }
  }, [imageSrc, dominantColors, onStartAnalysis, onDiagnosisResultChange, diagnosisResult, internalIsAnalyzing, onAnalysisStateChange, isAnalyzing]); // 【重要】依赖 imageSrc 和 dominantColors，确保使用最新的数据
  
  // 【重要】使用 useImperativeHandle 暴露 handleStartDiagnosis 方法
  // 这样父组件可以通过 ref 直接调用，实现"无论点击哪一个按钮，两边都同时启动 AI 分析"
  // 【修复】使用 useRef 存储最新的状态和函数，避免闭包问题和重复触发
  const isAnalyzingRef = useRef(false);
  const imageSrcRef = useRef(imageSrc);
  const handleStartDiagnosisRef = useRef(handleStartDiagnosis);
  // 【优化】使用 useRef 记录上次日志状态，避免重复日志
  const lastLogStateRef = useRef<{shouldShowDiagnosis: boolean, currentIsAnalyzing: boolean, diagnosisResult: any} | null>(null);
  
  // 【同步 ref 和 state】
  // 【重要】这个 useEffect 用于同步 ref 和 state，但不会覆盖手动设置的值
  // 在 handleStartDiagnosis 中，我们会立即手动设置 isAnalyzingRef.current = true
  // 这个 useEffect 主要用于从外部状态变化时同步 ref（如父组件重置状态）
  // 【重要修复】只有当 state 为 false 时才同步到 ref，避免外部状态错误地设置为 true 时覆盖手动设置
  // 这样可以确保只有在 handleStartDiagnosis 真正执行时才设置 ref 为 true
  useEffect(() => {
    // 【重要修复】只处理状态重置的情况（从 true 变为 false）
    // 不处理从 false 变为 true 的情况，因为这种情况应该由 handleStartDiagnosis 手动设置
    // 这样可以避免外部状态错误地设置为 true 时覆盖手动设置的值
    if (currentIsAnalyzing === false && isAnalyzingRef.current === true) {
      console.log('[AIAnalysisPanel] 同步 ref 和 state（状态重置）:', {
        refValue: isAnalyzingRef.current,
        stateValue: currentIsAnalyzing,
        willUpdate: true,
        timestamp: new Date().toISOString()
      });
      isAnalyzingRef.current = false;
    }
    // 【重要】不处理 currentIsAnalyzing === true && isAnalyzingRef.current === false 的情况
    // 因为这种情况应该由 handleStartDiagnosis 手动设置，而不是由外部状态变化触发
    // 这样可以避免外部状态错误地设置为 true 时覆盖手动设置的值
    // 如果 state 和 ref 都是 true 或都是 false，不需要更新，避免覆盖手动设置的值
  }, [currentIsAnalyzing]);
  
  useEffect(() => {
    imageSrcRef.current = imageSrc;
  }, [imageSrc]);
  
  // 【重要】同步 handleStartDiagnosis 函数引用
  // 使用 useCallback 后，函数引用在依赖不变时保持稳定，但为了确保使用最新版本，仍然需要同步
  useEffect(() => {
    handleStartDiagnosisRef.current = handleStartDiagnosis;
  }, [handleStartDiagnosis]);
  
  // 【修复】移除 useImperativeHandle 依赖数组中的 handleStartDiagnosis
  // 使用 ref 存储的函数引用，避免每次 handleStartDiagnosis 重新创建时都重新创建 triggerDiagnosis
  useImperativeHandle(ref, () => ({
    triggerDiagnosis: () => {
      console.log('[AIAnalysisPanel] 🔵 triggerDiagnosis 被调用（通过 ref）', {
        timestamp: new Date().toISOString(),
        isAnalyzingRef: isAnalyzingRef.current,
        hasImageSrc: !!imageSrcRef.current,
        imageSrc: imageSrcRef.current?.substring(0, 50) + '...',
        hasHandleStartDiagnosis: !!handleStartDiagnosisRef.current
      });
      
      // 【重要】使用 ref 检查状态，避免闭包问题
      // 这样可以确保即使两个诊断同时触发，也能正确检查状态
      // 【防重复触发】如果正在分析中，直接返回，不重复触发
      if (isAnalyzingRef.current) {
        console.warn('[AIAnalysisPanel] ⚠️ 诊断正在进行中，跳过重复触发', {
          isAnalyzingRef: isAnalyzingRef.current,
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      if (imageSrcRef.current) {
        console.log('[AIAnalysisPanel] ✅ 准备调用 handleStartDiagnosis', {
          timestamp: new Date().toISOString(),
          imageSrc: imageSrcRef.current.substring(0, 50) + '...'
        });
        // 使用 ref 存储的函数引用，确保使用最新版本
        try {
          handleStartDiagnosisRef.current();
          console.log('[AIAnalysisPanel] ✅ handleStartDiagnosis 调用成功');
        } catch (error) {
          console.error('[AIAnalysisPanel] ❌ handleStartDiagnosis 调用失败:', error);
        }
      } else {
        console.warn('[AIAnalysisPanel] ❌ 无法触发诊断: imageSrc 不存在', {
          imageSrcRef: imageSrcRef.current,
          timestamp: new Date().toISOString()
        });
      }
    }
  }), []); // 【重要】空依赖数组，避免重复创建 triggerDiagnosis 方法

  // 【扫描效果】模拟扫描进度（保留原有逻辑，用于兼容）
  useEffect(() => {
    if (currentIsAnalyzing && !diagnosisResult) {
      // 如果正在分析但没有诊断结果，使用原有的进度模拟
      const interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 2;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [currentIsAnalyzing, diagnosisResult]);

  /**
   * 【重要】显示逻辑：
   * 1. 优先显示 AI 诊断结果（diagnosisResult）- 这是从后端 API 获取的真实数据
   * 2. 如果没有诊断结果，但有待机界面或分析数据，显示相应界面
   * 3. 不再使用硬编码的 MOCK_FULL_DATA
   * 
   * 【修复】确保诊断结果存在且有效时才显示
   * 检查 diagnosisResult 是否有 scores 字段，确保数据完整
   */
  const shouldShowDiagnosis = diagnosisResult !== null && diagnosisResult !== undefined && !!diagnosisResult.scores;
  // 【修复】只有当 propAnalysisData 存在时才显示分析数据，不再使用 MOCK_FULL_DATA
  const shouldShowAnalysisData = !shouldShowDiagnosis && propAnalysisData !== null;
  
  // 【日志】记录当前显示状态
  useEffect(() => {
    console.log('【AI 诊断】渲染状态检查:', {
      diagnosisResult: diagnosisResult,
      shouldShowDiagnosis: shouldShowDiagnosis,
      shouldShowAnalysisData: shouldShowAnalysisData,
      currentIsAnalyzing: currentIsAnalyzing,
      internalIsAnalyzing: internalIsAnalyzing,
      isAnalyzing: isAnalyzing,
      propAnalysisData: propAnalysisData !== null
    });
    
    if (shouldShowDiagnosis) {
      console.log('【AI 诊断】✅ 应该显示诊断结果:', {
        scores: diagnosisResult?.scores,
        critiqueLength: diagnosisResult?.critique?.length,
        suggestionsCount: diagnosisResult?.suggestions?.length,
        issuesCount: diagnosisResult?.issues?.length
      });
    } else if (shouldShowAnalysisData) {
      console.log('【AI 诊断】显示分析数据（来自 propAnalysisData）');
    } else if (currentIsAnalyzing) {
      console.log('【AI 诊断】显示分析进度界面（正在分析中）');
    } else {
      console.log('【AI 诊断】显示待机界面（等待用户点击启动扫描）');
    }
  }, [shouldShowDiagnosis, shouldShowAnalysisData, diagnosisResult, currentIsAnalyzing, internalIsAnalyzing, isAnalyzing, propAnalysisData]);

  // 【重要】渲染顺序调整：
  // 1. 优先显示诊断结果（即使 currentIsAnalyzing 为 true，只要有结果就显示）
  // 2. 如果没有结果但正在分析，显示分析进度界面
  // 3. 如果都没有，显示待机界面
  
  // 【渲染条件 1】如果显示诊断结果，优先渲染诊断界面
  // 注意：即使 currentIsAnalyzing 为 true，只要有诊断结果就显示结果界面
  // 这样可以确保在状态更新后能立即显示结果，不会卡在"正在分析"状态
  // 【修复】将诊断结果检查放在最前面，确保优先显示结果
  // 诊断结果界面的完整代码在下面（第 668 行），这里先跳过，让下面的代码处理
  
  // 【渲染条件 2】如果没有诊断结果但正在分析中，显示分析进度界面
  // 注意：这个检查必须在诊断结果检查之后，确保有结果时优先显示结果
  // 【重要】只有在没有诊断结果时才显示进度界面
  // 【修复】确保诊断结果检查在最前面，避免进度界面检查提前返回
  // 【优化】减少日志输出频率，避免控制台刷屏
  if (!shouldShowDiagnosis && currentIsAnalyzing) {
    // 【日志优化】只在状态变化时记录，避免重复日志
    const currentState = {shouldShowDiagnosis, currentIsAnalyzing, diagnosisResult};
    const lastState = lastLogStateRef.current;
    if (!lastState || 
        lastState.shouldShowDiagnosis !== currentState.shouldShowDiagnosis ||
        lastState.currentIsAnalyzing !== currentState.currentIsAnalyzing ||
        lastState.diagnosisResult !== currentState.diagnosisResult) {
      console.log('【AI 诊断】渲染分析进度界面，原因:', currentState);
      lastLogStateRef.current = currentState;
    }
    return (
      <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center bg-black/20 border border-white/10 rounded-xl p-6 relative overflow-hidden">
        {/* 【修复】移除外部资源依赖，使用本地渐变背景替代 */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20 opacity-10"></div>
        <div className="z-10 flex flex-col items-center w-full max-w-sm">
          <div className="relative mb-8">
             <div className="absolute inset-0 bg-optic-accent blur-xl opacity-20 animate-pulse"></div>
             <RefreshCw className="w-12 h-12 text-optic-accent animate-spin" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">{t('ai.analyzing')}</h3>
          <div className="flex flex-col items-center w-full gap-2">
             <span className="text-xs font-mono text-optic-accent/80 animate-pulse">
                {scanProgress < 30 ? t('ai.step.hist') : 
                 scanProgress < 60 ? t('ai.step.color') : 
                 scanProgress < 90 ? t('ai.step.style') : t('ai.step.report')}
             </span>
             <Progress value={scanProgress} className="h-1 w-full bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  // 【辅助函数】从 lightroom basic panel 提取曝光项（仅当有真实分析数据时）
  // 【安全访问】使用可选链操作符，避免访问 undefined 属性
  const exposureItems = shouldShowAnalysisData && analysisData?.lightroom?.basic_panel ? [
      { param: t('modal.common.exposure'), ...(analysisData.lightroom.basic_panel.exposure || {}) },
      { param: t('modal.common.contrast'), ...(analysisData.lightroom.basic_panel.contrast || {}) },
      { param: t('modal.common.highlights'), ...(analysisData.lightroom.basic_panel.highlights || {}) },
      { param: t('modal.common.shadows'), ...(analysisData.lightroom.basic_panel.shadows || {}) },
  ] : [];

  /**
   * 点击问题文字，高亮图片区域
   */
  const handleIssueClick = (issue: { type: string; severity: string; description: string; region?: string | null }) => {
    if (!imageRef.current || !issue.region) return;
    
    // 创建遮罩层
    const mask = document.createElement('div');
    mask.className = 'absolute inset-0 bg-yellow-500/30 pointer-events-none z-50';
    
    // 根据 region 设置遮罩位置和大小
    if (issue.region === 'sky') {
      mask.style.top = '0';
      mask.style.height = '40%';
    } else if (issue.region === 'shadow' || issue.region === 'shadows') {
      mask.style.bottom = '0';
      mask.style.height = '30%';
    } else if (issue.region === 'highlight' || issue.region === 'highlights') {
      mask.style.top = '0';
      mask.style.height = '30%';
    }
    
    const container = imageRef.current.parentElement;
    if (container) {
      container.style.position = 'relative';
      container.appendChild(mask);
      
      // 3秒后移除遮罩
      setTimeout(() => {
        mask.remove();
      }, 3000);
    }
  };

  // 【渲染条件 3】如果显示诊断结果，渲染诊断界面（重复检查，确保不会遗漏）
  // 注意：这个检查已经在第 523 行执行过，但为了代码清晰，这里保留作为备用
  if (shouldShowDiagnosis && diagnosisResult) {
    return (
      <div className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-optic-accent" />
            <span className="font-bold text-sm text-white">{t('ai.report.title')}</span>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-optic-accent/10 text-optic-accent border-optic-accent/20 text-[10px]">
              GEMINI 3.0 PRO
            </Badge>
            {diagnosisResult.processingTime && (
              <Badge variant="outline" className="bg-white/5 text-white/60 border-white/10 text-[10px]">
                {diagnosisResult.processingTime}s
              </Badge>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* 评分仪表盘 */}
              <section>
                <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4">多维评分</h4>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(diagnosisResult.scores).map(([key, value]) => {
                    // 【数据适配】支持两种格式：简单数值或带描述的格式
                    const scoreValue = typeof value === 'number' ? value : (value as any)?.value || 0;
                    const scoreDescription = typeof value === 'object' && value !== null ? (value as any)?.description || '' : '';
                    const maxScore = scoreValue > 10 ? 100 : 10; // 支持 0-10 或 0-100 分
                    
                    const isActive = activeScore === key;
                    
                    return (
                      <div 
                        key={key} 
                        className={`bg-white/5 rounded-lg p-4 border cursor-pointer transition-all duration-200 group relative overflow-hidden ${
                            isActive 
                                ? 'border-optic-accent shadow-[0_0_15px_rgba(56,189,248,0.2)] bg-optic-accent/10' 
                                : 'border-white/5 hover:border-white/20 hover:bg-white/10'
                        }`}
                        onClick={() => handleScoreClick(key, value)}
                      >
                        {isActive && (
                            <div className="absolute inset-0 bg-optic-accent/5 animate-pulse pointer-events-none"></div>
                        )}
                        <div className="flex items-center justify-between mb-2 relative z-10">
                          <span className={`text-[10px] font-bold uppercase transition-colors ${isActive ? 'text-optic-accent' : 'text-white/70'}`}>
                            {key}
                          </span>
                          <span className="text-lg font-bold text-optic-accent">{scoreValue.toFixed(1)}</span>
                        </div>
                        {scoreDescription && (
                          <p className={`text-[9px] mb-2 transition-colors relative z-10 ${isActive ? 'text-white/90' : 'text-white/50'}`}>
                            {scoreDescription}
                          </p>
                        )}
                        <div className="w-full bg-white/10 rounded-full h-2 relative z-10">
                          <div 
                            className={`h-2 rounded-full transition-all ${isActive ? 'bg-optic-accent shadow-[0_0_10px_rgba(56,189,248,0.5)]' : 'bg-optic-accent/70'}`}
                            style={{ width: `${(scoreValue / maxScore) * 100}%` }}
                          />
                        </div>
                        
                        {/* 指示图标 */}
                        <div className={`absolute top-2 right-2 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                           <ScanEye className="w-3 h-3 text-optic-accent" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 诊断文字（打字机效果） */}
              <section>
                <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4">诊断报告</h4>
                <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                  <p className="text-sm text-white/80 leading-relaxed">
                    {isTypewriting ? (
                      <>
                        {displayedText}
                        <span className="animate-pulse">|</span>
                      </>
                    ) : (
                      diagnosisResult.critique
                    )}
                  </p>
                </div>
              </section>

              {/* 改进建议 */}
              {diagnosisResult.suggestions.length > 0 && (
                <section>
                  <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4">改进建议</h4>
                  <div className="space-y-2">
                    {diagnosisResult.suggestions.map((suggestion, index) => (
                      <div key={index} className="bg-white/5 rounded-lg p-3 border border-white/5 flex items-start gap-3">
                        <span className="text-optic-accent font-bold text-xs mt-0.5">{index + 1}.</span>
                        <span className="text-sm text-white/70 flex-1">{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 问题列表（可点击高亮） */}
              {diagnosisResult.issues.length > 0 && (
                <section>
                  <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4">问题定位</h4>
                  <div className="space-y-2">
                    {diagnosisResult.issues.map((issue, index) => (
                      <div 
                        key={index} 
                        className={`bg-white/5 rounded-lg p-3 border ${
                          issue.severity === 'high' ? 'border-red-500/50' : 
                          issue.severity === 'medium' ? 'border-yellow-500/50' : 
                          'border-white/5'
                        } cursor-pointer hover:bg-white/10 transition-colors`}
                        onClick={() => handleIssueClick(issue)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-white uppercase">{issue.type}</span>
                              <Badge 
                                variant="outline" 
                                className={`text-[9px] ${
                                  issue.severity === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/50' : 
                                  issue.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 
                                  'bg-white/5 text-white/60 border-white/10'
                                }`}
                              >
                                {issue.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-white/70">{issue.description}</p>
                            {issue.region && (
                              <p className="text-[10px] text-white/40 mt-1">点击高亮区域: {issue.region}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              
              {/* 【重新扫描按钮】在诊断结果界面底部 */}
              {/* 用户需求：无论点击哪一个"启动深度扫描"按钮，两边都同时启动 AI 分析 */}
              <section className="pt-4 border-t border-white/10">
                <div className="flex justify-center">
                  <Button 
                    onClick={() => {
                      // 【重要】用户需求：无论点击哪一个"启动深度扫描"按钮，两边都同时启动 AI 分析
                      // 调用 onStartAnalysis，它会通过 App.tsx 的 handleStartDiagnosis 同时触发两个图片的诊断
                      // 注意：每个 AIAnalysisPanel 会使用自己的数据（各自的 imageSrc、histogramData、dominantColors）
                      // 虽然 prompt 模板相同，但输入数据不同，所以输出结果也不同
                      console.log('[AIAnalysisPanel] 重新扫描按钮点击，准备触发诊断，当前图片:', imageSrc?.substring(0, 50) + '...');
                      if (onStartAnalysis) {
                        onStartAnalysis();
                      }
                    }} 
                    className="bg-optic-accent hover:bg-optic-accent/80 text-black font-bold transition-all hover:scale-105 shadow-[0_0_20px_rgba(56,189,248,0.3)]"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('ai.btn_rescan')}
                  </Button>
                </div>
              </section>
            </div>
          </ScrollArea>
        </div>

        {/* 隐藏的图片引用，用于高亮区域 */}
        {imageSrc && (
          <img ref={imageRef} src={imageSrc} alt="" className="hidden" />
        )}
      </div>
    );
  }

  // 如果显示原有分析数据，渲染原有界面
  // 【渲染逻辑】只有当有真实的 propAnalysisData 时才显示分析数据界面
  // 不再使用 MOCK_FULL_DATA，确保只显示真实数据
  if (shouldShowAnalysisData && analysisData && propAnalysisData) {
    console.log('【AI 诊断】渲染分析数据界面（来自 propAnalysisData）');
    return (
    <div className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
        <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-optic-accent" />
            <span className="font-bold text-sm text-white">{t('ai.report.title')}</span>
        </div>
        <div className="flex gap-2">
            {/* 【安全访问】检查 review 和 style_summary 是否存在 */}
            <Badge variant="outline" className="bg-white/5 text-white/60 border-white/10 text-[10px]">
                {t('ai.token')}: {analysisData.review?.style_summary?.toUpperCase().slice(0, 10) || 'N/A'}
            </Badge>
            <Badge variant="outline" className="bg-optic-accent/10 text-optic-accent border-optic-accent/20 text-[10px]">
                GEMINI 1.5 PRO
            </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="overview" className="w-full h-full flex flex-col">
            <div className="px-4 pt-2 border-b border-white/10 bg-black/20 shrink-0">
                <TabsList className="bg-transparent p-0 h-9 gap-4">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-optic-accent data-[state=active]:text-optic-accent text-white/40 text-xs rounded-none px-0 pb-2">
                        {t('ai.tab.overview')}
                    </TabsTrigger>
                     <TabsTrigger value="color" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-optic-accent data-[state=active]:text-optic-accent text-white/40 text-xs rounded-none px-0 pb-2">
                        {t('ai.tab.color')}
                    </TabsTrigger>
                     <TabsTrigger value="lightroom" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-optic-accent data-[state=active]:text-optic-accent text-white/40 text-xs rounded-none px-0 pb-2">
                        {t('ai.tab.lr')}
                    </TabsTrigger>
                     <TabsTrigger value="photoshop" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-optic-accent data-[state=active]:text-optic-accent text-white/40 text-xs rounded-none px-0 pb-2">
                        {t('ai.tab.ps')}
                    </TabsTrigger>
                </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="p-6 pb-20">
                        {/* TAB: OVERVIEW */}
                        <TabsContent value="overview" className="space-y-8 m-0 animate-in slide-in-from-left-2 duration-300">
                             {/* Section 1: Style Summary */}
                             {/* 【安全访问】检查 review 是否存在 */}
                             {analysisData.review && (
                                <section>
                                    <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4">{t('ai.sec.style')}</h4>
                                    <div className="text-xl font-bold text-white mb-2">{analysisData.review.style_summary || 'N/A'}</div>
                                    <p className="text-sm text-white/60 leading-relaxed border-l-2 border-optic-accent pl-4 italic">
                                        "{analysisData.review.comprehensive_review || 'N/A'}"
                                    </p>
                                </section>
                             )}

                             {/* Section 2: Composition */}
                             {/* 【安全访问】使用可选链操作符，避免访问 undefined 属性 */}
                             {analysisData.composition && (
                                <section>
                                    <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4">{t('ai.sec.comp')}</h4>
                                    <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                                        {/* 【安全访问】检查 structure 是否存在 */}
                                        {analysisData.composition.structure && (
                                            <div className="flex items-start gap-3 mb-3">
                                                <Ruler className="w-4 h-4 text-green-400 mt-1" />
                                                <div>
                                                    <span className="text-xs font-bold text-white block">{t('ai.comp.struct')}</span>
                                                    <span className="text-xs text-white/50">{analysisData.composition.structure.visual_frame || 'N/A'}</span>
                                                </div>
                                            </div>
                                        )}
                                        {/* 【安全访问】检查 subject 是否存在 */}
                                        {analysisData.composition.subject && (
                                            <div className="flex items-start gap-3">
                                                <ScanEye className="w-4 h-4 text-green-400 mt-1" />
                                                <div>
                                                    <span className="text-xs font-bold text-white block">{t('ai.comp.weight')}</span>
                                                    <span className="text-xs text-white/50">{analysisData.composition.subject.analysis || 'N/A'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>
                             )}

                             {/* Section 3: Lighting (Zone System) */}
                             <section>
                                <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4">{t('ai.sec.zone')}</h4>
                                <ZoneSystemVisualizer imageSrc={imageSrc || null} className="mb-4" />
                                <div className="grid grid-cols-2 gap-2">
                                    {exposureItems.map((item, i) => (
                                        <div key={i} className="bg-white/5 p-2 rounded border border-white/5">
                                            <div className="text-[10px] font-bold text-white/70">{item.param}</div>
                                            <div className="text-[10px] text-optic-accent font-mono">
                                                {item.value > 0 ? '+' : ''}{item.value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             </section>
                        </TabsContent>

                        {/* TAB: COLOR SCHEME */}
                        {/* 【安全访问】检查 lightroom 是否存在 */}
                        {analysisData.lightroom && (
                            <TabsContent value="color" className="space-y-8 m-0 animate-in slide-in-from-right-2 duration-300">
                                <section>
                                    <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4">{t('ai.sec.harmony')}</h4>
                                    {/* 【安全访问】检查 split_toning 是否存在 */}
                                    {analysisData.lightroom.split_toning && (
                                        <div className="bg-white/5 p-4 rounded-lg border border-white/5 mb-6">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Aperture className="w-4 h-4 text-purple-400" />
                                                <span className="text-sm font-bold text-white">{t('ai.color.grading')}</span>
                                            </div>
                                            <ColorGradeWheel 
                                                highlights={analysisData.lightroom.split_toning.highlights}
                                                midtones={analysisData.lightroom.split_toning.midtones}
                                                shadows={analysisData.lightroom.split_toning.shadows}
                                            />
                                        </div>
                                    )}

                                    {/* NEW HSL VISUALIZER */}
                                    {/* 【安全访问】检查 hsl 是否存在 */}
                                    {analysisData.lightroom.hsl && (
                                        <div className="mb-6">
                                             <h5 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3 pl-1">{t('ai.color.hsl')}</h5>
                                             <HSLVisualizer data={analysisData.lightroom.hsl} />
                                        </div>
                                    )}

                                    {/* 【安全访问】检查 basic_panel 是否存在 */}
                                    {analysisData.lightroom.basic_panel && (
                                        <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                                            <div className="grid grid-cols-2 gap-4 text-[10px] text-white/50">
                                                 <div>
                                                    <span className="block text-white/30 mb-1">{t('ai.color.wb')}</span>
                                                    <div className="flex justify-between border-b border-white/10 pb-1 mb-1">
                                                        <span>{t('modal.common.temp')}</span>
                                                        <span className="text-white">{analysisData.lightroom.basic_panel.temp?.value || 'N/A'}K</span>
                                                    </div>
                                                    <div className="flex justify-between border-b border-white/10 pb-1">
                                                        <span>{t('modal.common.tint')}</span>
                                                        <span className="text-white">{analysisData.lightroom.basic_panel.tint?.value || 'N/A'}</span>
                                                    </div>
                                                 </div>
                                                <div>
                                                    <span className="block text-white/30 mb-1">{t('ai.color.style_key')}</span>
                                                    <p className="leading-tight">{analysisData.review?.style_summary || "N/A"}</p>
                                                </div>
                                           </div>
                                       </div>
                                   )}
                               </section>
                           </TabsContent>
                       )}

                       {/* TAB: LIGHTROOM */}
                       {/* 【安全访问】检查 lightroom 是否存在 */}
                       {analysisData.lightroom && (
                           <TabsContent value="lightroom" className="space-y-8 m-0 animate-in zoom-in-95 duration-300">
                                <section>
                                   <div className="flex items-center justify-between mb-4">
                                       <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold">{t('ai.sec.lr')}</h4>
                                       <Sliders className="w-4 h-4 text-white/20" />
                                   </div>
                                   {/* INJECT COMPOSITION DATA INTO LIGHTROOM PANEL */}
                                   <LightroomPanel data={analysisData.lightroom} />
                                </section>
                           </TabsContent>
                       )}

                        {/* TAB: PHOTOSHOP */}
                        {/* 【安全访问】检查 photoshop 是否存在 */}
                        {analysisData.photoshop && (
                            <TabsContent value="photoshop" className="space-y-8 m-0 animate-in zoom-in-95 duration-300">
                                 <section>
                                   <div className="flex items-center justify-between mb-4">
                                       <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold">{t('ai.sec.ps')}</h4>
                                       <Layers className="w-4 h-4 text-white/20" />
                                   </div>
                                   <PhotoshopPanel data={analysisData.photoshop as any} />
                                </section>
                           </TabsContent>
                       )}
                    </div>
                </ScrollArea>
            </div>
        </Tabs>
      </div>
    </div>
    );
  }

  // 【渲染条件 4】待机界面：当没有诊断结果、不在分析中、也没有分析数据时，显示待机界面
  // 这是默认界面，显示"启动深度扫描"按钮，引导用户开始 AI 诊断
  console.log('【AI 诊断】渲染待机界面（默认界面）:', {
    shouldShowDiagnosis,
    shouldShowAnalysisData,
    currentIsAnalyzing,
    hasImageSrc: !!imageSrc
  });
  
  return (
    <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-black/40 backdrop-blur-md border border-white/10 rounded-xl relative overflow-hidden group">
      {/* --- 1. 背景层 (Background Layer) --- */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.05),transparent_70%)]"></div>
      {/* 【修复】移除外部资源依赖，使用本地渐变背景替代 */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/10 opacity-[0.03]"></div>
      
      {/* --- 2. 技术网格 (Tech Grid) --- */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        {/* 十字准星 (Crosshairs) */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent"></div>
        
        {/* 角落标记 (Corner Markers) */}
        <div className="absolute top-8 left-8 w-4 h-4 border-l border-t border-white/30"></div>
        <div className="absolute top-8 right-8 w-4 h-4 border-r border-t border-white/30"></div>
        <div className="absolute bottom-8 left-8 w-4 h-4 border-l border-b border-white/30"></div>
        <div className="absolute bottom-8 right-8 w-4 h-4 border-r border-b border-white/30"></div>
        
        {/* 数据读数 (Data Readouts - Decorative) */}
        <div className="absolute bottom-8 left-16 text-[9px] font-mono text-white/20 tracking-widest">
          SYS.V5.0 // NEURAL_ENGINE
        </div>
        <div className="absolute bottom-8 right-16 text-[9px] font-mono text-white/20 tracking-widest text-right">
          SENSOR: ONLINE // FLUX: STABLE
        </div>
      </div>

      {/* --- 3. 中央核心 (Central Core) --- */}
      <div className="z-10 flex flex-col items-center w-full max-w-md gap-10 p-8">
        
        {/* 传感器可视化 (Sensor Visualization) */}
        <div className="relative group-hover:scale-105 transition-transform duration-700 ease-out">
          {/* 外部旋转环 (Outer Rotating Ring) - 逆时针慢速 */}
          <div className="absolute inset-[-40px] border border-dashed border-white/10 rounded-full animate-[spin_20s_linear_infinite_reverse]"></div>
          
          {/* 中间刻度环 (Middle Scale Ring) - 静态 */}
          <div className="absolute inset-[-20px] border border-white/5 rounded-full"></div>
          <div className="absolute inset-[-20px] border-t-2 border-optic-accent/20 rounded-full rotate-45"></div>
          <div className="absolute inset-[-20px] border-b-2 border-optic-accent/20 rounded-full rotate-45"></div>
          
          {/* 内部脉冲核心 (Inner Pulse Core) */}
          <div className="relative w-32 h-32 bg-black/50 backdrop-blur-sm rounded-full border border-white/10 flex items-center justify-center shadow-[0_0_50px_rgba(56,189,248,0.1)]">
            {/* 扫描光效 (Scanning Light) */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-transparent animate-[spin_3s_linear_infinite]"></div>
            
            <Brain className="w-12 h-12 text-optic-accent opacity-90 relative z-10" />
            
            {/* 状态指示点 (Status Dot) */}
            <div className={`absolute top-4 right-10 w-1.5 h-1.5 rounded-full ${imageSrc ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'} animate-pulse`}></div>
          </div>
          
          {/* 状态标签 (Status Label) */}
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 whitespace-nowrap">
            <span className="text-[9px] font-mono text-optic-accent tracking-[0.2em] uppercase opacity-70">
              {t('ai.idle.system_status')}
            </span>
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
              <div className={`w-1.5 h-1.5 rounded-full ${imageSrc ? 'bg-green-500' : 'bg-amber-500'}`}></div>
              <span className="text-[10px] font-mono text-white/90 tracking-widest">
                {imageSrc ? t('ai.idle.ready') : t('ai.idle.waiting')}
              </span>
            </div>
          </div>
        </div>
        
        {/* 标题与描述 (Title & Description) */}
        <div className="text-center space-y-4 mt-6">
          <div>
            <h3 className="text-xl font-bold text-white tracking-[0.1em] font-mono">
              {t('ai.idle.title')}
            </h3>
            <p className="text-[10px] text-optic-accent/60 font-mono tracking-widest mt-1">
              {t('ai.idle.subtitle')}
            </p>
          </div>
          <p className="text-xs text-white/40 max-w-xs mx-auto font-light leading-relaxed tracking-wide">
            {t('ai.idle.description')}
          </p>
        </div>
        
        {/* 启动按钮 (Launch Button) */}
        <div className="flex flex-col items-center gap-3 w-full">
          <Button
            onClick={() => {
              console.log('[AIAnalysisPanel] 🖱️ 待机界面：启动深度扫描按钮点击', {
                hasOnStartAnalysis: !!onStartAnalysis,
                hasImageSrc: !!imageSrc,
                imageSrc: imageSrc?.substring(0, 50) + '...',
                timestamp: new Date().toISOString()
              });
              if (onStartAnalysis) {
                console.log('[AIAnalysisPanel] 调用 onStartAnalysis（会同时触发两个图片的诊断）');
                onStartAnalysis();
              } else {
                console.warn('[AIAnalysisPanel] ⚠️ onStartAnalysis 未提供，尝试直接触发诊断');
                if (imageSrc) {
                  console.log('[AIAnalysisPanel] 直接调用 handleStartDiagnosis');
                  handleStartDiagnosis();
                } else {
                  console.error('[AIAnalysisPanel] ❌ 无法触发诊断：imageSrc 不存在');
                  toast.error(t('ai.idle.no_image'));
                }
              }
            }}
            disabled={!imageSrc}
            className="relative w-full max-w-[260px] h-12 bg-white/5 hover:bg-optic-accent/10 border border-white/20 hover:border-optic-accent text-white font-mono text-xs tracking-[0.15em] transition-all duration-300 group/btn overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* 按钮背景扫光动画 */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]"></div>
            
            {/* 按钮角标 */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/50"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/50"></div>
            
            <span className="relative flex items-center justify-center gap-3">
              <ScanEye className="w-4 h-4 text-optic-accent" />
              {t('ai.idle.initiate')}
            </span>
          </Button>
          
          {/* 错误提示 (Error Hint) */}
          {!imageSrc && (
            <span className="text-[10px] text-amber-500/70 font-mono animate-pulse tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" />
              [{t('ai.idle.no_image')}]
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
