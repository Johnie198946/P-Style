import React, { useState, useEffect, useRef } from "react";
import { Brain, Sparkles, RefreshCw, Ruler, ScanEye, Aperture, Layers, Sliders } from "lucide-react";
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
import { FullAnalysisData } from "../../types/analysis";
import { MOCK_PS_ADVANCED } from "../../src/lib/mockData";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { api, ApiError } from "../../src/lib/api";
import { toast } from "sonner@2.0.3";
import { DominantColor } from "./Vectorscope";

// Mock Data Generator (Simulates Backend Response)
const MOCK_FULL_DATA: FullAnalysisData = {
    review: {
        style_summary: "Cyberpunk Neo-Noir",
        comprehensive_review: "The image exhibits a strong high-contrast aesthetic typical of modern sci-fi cinema. The separation between the cool ambient fill and the warm practical lights creates a compelling depth.",
        pros_evaluation: "Excellent dynamic range usage."
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
        brief: { title: "MISSION REPORT", content: "Match reference aesthetic." },
        histogram: { r: [], g: [], b: [], l: [], avg_l: 0.4, shadows: 0.2, midtones: 0.5, highlights: 0.8 },
        basic_panel: {
            temp: { value: 4500, min: 2000, max: 10000, target_min: 4000, target_max: 5000, reason: "Cooler temp enhances the futuristic mood." },
            tint: { value: 12, min: -150, max: 150, target_min: 10, target_max: 20, reason: "Magenta shift to counteract green fluorescent cast." },
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
interface DiagnosisResult {
  scores: {
    exposure: number;
    color: number;
    composition: number;
    mood: number;
  };
  critique: string;
  suggestions: string[];
  issues: Array<{
    type: string;
    severity: string;
    description: string;
    region?: string | null;
  }>;
  processingTime?: number;
}

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
}

export const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({
  isAnalyzing,
  analysisData: propAnalysisData,
  onStartAnalysis,
  imageSrc,
  dominantColors = [],
}) => {
  const { t } = useLanguage();
  const [scanProgress, setScanProgress] = useState(0);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
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
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = imgSrc;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 400 / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
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
      };

      img.onerror = () => {
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

      img.onerror = () => {
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
   */
  const handleStartDiagnosis = async () => {
    if (!imageSrc) {
      toast.error('请先上传图片');
      return;
    }

    try {
      setIsAnalyzing(true);
      setScanProgress(0);
      setDiagnosisResult(null);
      setDisplayedText('');

      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 2;
        });
      }, 100);

      // 1. 计算直方图数据
      const histogramData = await calculateHistogramData(imageSrc);
      setScanProgress(30);

      // 2. 生成低分辨率图片
      const lowResImage = await getLowResImage(imageSrc, 512);
      setScanProgress(60);

      // 3. 调用诊断 API
      console.log('【AI 诊断】开始调用后端 API...', {
        imageUrlLength: lowResImage.length,
        histogramDataKeys: Object.keys(histogramData),
        dominantColorsCount: dominantColors.length
      });
      
      const result = await api.analyze.diagnosis({
        imageUrl: lowResImage,
        histogramData,
        dominantColors: dominantColors.length > 0 ? dominantColors : [],
      });

      console.log('【AI 诊断】API 调用成功，返回结果:', {
        hasScores: !!result.scores,
        hasCritique: !!result.critique,
        suggestionsCount: result.suggestions?.length || 0,
        issuesCount: result.issues?.length || 0,
        processingTime: result.processingTime
      });

      clearInterval(progressInterval);
      setScanProgress(100);

      // 4. 设置诊断结果（确保数据格式正确）
      if (!result || !result.scores) {
        throw new Error('API 返回的数据格式不正确：缺少 scores 字段');
      }
      
      setDiagnosisResult(result);
      setIsTypewriting(true); // 启动打字机效果

      // 5. 通知父组件分析完成
      if (onStartAnalysis) {
        onStartAnalysis();
      }

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
      } else if (error?.message) {
        errorMessage = error.message;
      } else {
        errorMessage = 'AI 诊断失败，请检查网络连接或稍后重试';
      }
      
      toast.error(errorMessage);
      setScanProgress(0);
      setDiagnosisResult(null);
      setDisplayedText('');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Simulate scanning effect (保留原有逻辑，用于兼容)
  useEffect(() => {
    if (isAnalyzing && !diagnosisResult) {
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
  }, [isAnalyzing, diagnosisResult]);

  /**
   * 【重要】显示逻辑：
   * 1. 优先显示 AI 诊断结果（diagnosisResult）- 这是从后端 API 获取的真实数据
   * 2. 如果没有诊断结果，但有待机界面或分析数据，显示相应界面
   * 3. 不再使用硬编码的 MOCK_FULL_DATA
   */
  const shouldShowDiagnosis = diagnosisResult !== null;
  // 【修复】只有当 propAnalysisData 存在时才显示分析数据，不再使用 MOCK_FULL_DATA
  const shouldShowAnalysisData = !shouldShowDiagnosis && propAnalysisData !== null;
  
  // 【日志】记录当前显示状态
  useEffect(() => {
    if (shouldShowDiagnosis) {
      console.log('【AI 诊断】显示诊断结果:', {
        scores: diagnosisResult?.scores,
        critiqueLength: diagnosisResult?.critique?.length,
        suggestionsCount: diagnosisResult?.suggestions?.length
      });
    } else if (shouldShowAnalysisData) {
      console.log('【AI 诊断】显示分析数据（来自 propAnalysisData）');
    } else {
      console.log('【AI 诊断】显示待机界面（等待用户点击启动扫描）');
    }
  }, [shouldShowDiagnosis, shouldShowAnalysisData, diagnosisResult]);

  if (!shouldShowDiagnosis && !shouldShowAnalysisData && !isAnalyzing) {
    return (
      <div className="w-full h-full flex flex-col bg-black/20 border border-white/10 rounded-xl overflow-hidden">
        {/* Live Monitor Section */}
        <div className="p-4 border-b border-white/10 bg-black/40">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-optic-accent" />
                    <span className="font-bold text-sm text-white">{t('ai.monitor.title')}</span>
                </div>
                <Badge variant="outline" className="bg-optic-accent/10 text-optic-accent border-optic-accent/20 text-[10px] animate-pulse">
                    {t('ai.live_signal')}
                </Badge>
            </div>
            
            {/* Real-time Zone System */}
            <div className="mb-2">
                <ZoneSystemVisualizer imageSrc={imageSrc || null} className="h-32" />
            </div>
        </div>

        {/* Call to Action */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-transparent to-black/40">
            <p className="text-sm text-white/50 max-w-xs mb-6">
            {t('ai.idle_desc')}
            </p>
            <Button onClick={handleStartDiagnosis} className="bg-optic-accent hover:bg-optic-accent/80 text-black font-bold transition-all hover:scale-105 shadow-[0_0_20px_rgba(56,189,248,0.3)]">
            <Sparkles className="w-4 h-4 mr-2" />
            {t('ai.btn_scan')}
            </Button>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center bg-black/20 border border-white/10 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
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
  const exposureItems = shouldShowAnalysisData && analysisData?.lightroom?.basic_panel ? [
      { param: t('modal.common.exposure'), ...analysisData.lightroom.basic_panel.exposure },
      { param: t('modal.common.contrast'), ...analysisData.lightroom.basic_panel.contrast },
      { param: t('modal.common.highlights'), ...analysisData.lightroom.basic_panel.highlights },
      { param: t('modal.common.shadows'), ...analysisData.lightroom.basic_panel.shadows },
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

  // 如果显示诊断结果，渲染诊断界面
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
                  {Object.entries(diagnosisResult.scores).map(([key, value]) => (
                    <div key={key} className="bg-white/5 rounded-lg p-4 border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-white/70 uppercase">{key}</span>
                        <span className="text-lg font-bold text-optic-accent">{value.toFixed(1)}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div 
                          className="bg-optic-accent h-2 rounded-full transition-all"
                          style={{ width: `${(value / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
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
            <Badge variant="outline" className="bg-white/5 text-white/60 border-white/10 text-[10px]">
                {t('ai.token')}: {analysisData.review.style_summary.toUpperCase().slice(0, 10)}
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
                             <section>
                                <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4">{t('ai.sec.style')}</h4>
                                <div className="text-xl font-bold text-white mb-2">{analysisData.review.style_summary}</div>
                                <p className="text-sm text-white/60 leading-relaxed border-l-2 border-optic-accent pl-4 italic">
                                    "{analysisData.review.comprehensive_review}"
                                </p>
                             </section>

                             {/* Section 2: Composition */}
                             <section>
                                <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4">{t('ai.sec.comp')}</h4>
                                <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                                    <div className="flex items-start gap-3 mb-3">
                                        <Ruler className="w-4 h-4 text-green-400 mt-1" />
                                        <div>
                                            <span className="text-xs font-bold text-white block">{t('ai.comp.struct')}</span>
                                            <span className="text-xs text-white/50">{analysisData.composition.structure.visual_frame}</span>
                                        </div>
                                    </div>
                                     <div className="flex items-start gap-3">
                                        <ScanEye className="w-4 h-4 text-green-400 mt-1" />
                                        <div>
                                            <span className="text-xs font-bold text-white block">{t('ai.comp.weight')}</span>
                                            <span className="text-xs text-white/50">{analysisData.composition.subject.analysis}</span>
                                        </div>
                                    </div>
                                </div>
                             </section>

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
                        <TabsContent value="color" className="space-y-8 m-0 animate-in slide-in-from-right-2 duration-300">
                            <section>
                                <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4">{t('ai.sec.harmony')}</h4>
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

                                {/* NEW HSL VISUALIZER */}
                                <div className="mb-6">
                                     <h5 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3 pl-1">{t('ai.color.hsl')}</h5>
                                     <HSLVisualizer data={analysisData.lightroom.hsl} />
                                </div>

                                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                                    <div className="grid grid-cols-2 gap-4 text-[10px] text-white/50">
                                         <div>
                                            <span className="block text-white/30 mb-1">{t('ai.color.wb')}</span>
                                            <div className="flex justify-between border-b border-white/10 pb-1 mb-1">
                                                <span>{t('modal.common.temp')}</span>
                                                <span className="text-white">{analysisData.lightroom.basic_panel.temp.value}K</span>
                                            </div>
                                            <div className="flex justify-between border-b border-white/10 pb-1">
                                                <span>{t('modal.common.tint')}</span>
                                                <span className="text-white">{analysisData.lightroom.basic_panel.tint.value}</span>
                                            </div>
                                         </div>
                                         <div>
                                             <span className="block text-white/30 mb-1">{t('ai.color.style_key')}</span>
                                             <p className="leading-tight">{analysisData.lightroom.brief?.content || "N/A"}</p>
                                         </div>
                                    </div>
                                </div>
                            </section>
                        </TabsContent>

                        {/* TAB: LIGHTROOM */}
                        <TabsContent value="lightroom" className="space-y-8 m-0 animate-in zoom-in-95 duration-300">
                             <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold">{t('ai.sec.lr')}</h4>
                                    <Sliders className="w-4 h-4 text-white/20" />
                                </div>
                                {/* INJECT COMPOSITION DATA INTO LIGHTROOM PANEL */}
                                <LightroomPanel data={{
                                    ...analysisData.lightroom,
                                    composition: analysisData.composition
                                }} />
                             </section>
                        </TabsContent>

                        {/* TAB: PHOTOSHOP */}
                        <TabsContent value="photoshop" className="space-y-8 m-0 animate-in zoom-in-95 duration-300">
                             <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold">{t('ai.sec.ps')}</h4>
                                    <Layers className="w-4 h-4 text-white/20" />
                                </div>
                                <PhotoshopPanel data={analysisData.photoshop} />
                             </section>
                        </TabsContent>
                    </div>
                </ScrollArea>
            </div>
        </Tabs>
      </div>
    </div>
    );
  }

  // 如果没有匹配的条件，返回 null（不应该到达这里）
  return null;
};
