import React, { useState } from "react";
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

interface VisualAnalysisDashboardProps {
  imageSrc: string | null;
  histogramElement?: React.ReactNode; // Pass existing histogram as slot
  onToggleFalseColor: () => void;
  isFalseColorActive: boolean;
  analysisData?: any;
  onStartAnalysis?: () => void;
  isAnalyzing?: boolean;
}

export const VisualAnalysisDashboard: React.FC<VisualAnalysisDashboardProps> = ({
  imageSrc,
  histogramElement,
  onToggleFalseColor,
  isFalseColorActive,
  analysisData,
  onStartAnalysis,
  isAnalyzing = false,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"histogram" | "vectorscope" | "ai">("histogram");
  const [dominantColors, setDominantColors] = useState<DominantColor[]>([]); // 存储从色彩雷达提取的主色调

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
                isAnalyzing={!!isAnalyzing}
                analysisData={analysisData}
                onStartAnalysis={onStartAnalysis || (() => {})}
                imageSrc={imageSrc}
                dominantColors={dominantColors}  // 传递主色调数据
              />
           </div>
        )}

      </div>
    </div>
  );
};
