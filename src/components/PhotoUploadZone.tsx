import React, { useState, useRef, useEffect } from 'react';
import { Histogram } from './Histogram';
import { VisualAnalysisDashboard } from './analysis/VisualAnalysisDashboard';
import { FalseColorOverlay } from './analysis/FalseColorOverlay';
import { motion } from 'motion/react';
import { useLanguage } from '../src/contexts/LanguageContext';

interface PhotoUploadZoneProps {
  label: string;
  imageSrc: string | null;
  onFileSelect: (file: File) => void;
  className?: string;
  isScanning?: boolean;
}

export const PhotoUploadZone = ({ label, imageSrc, onFileSelect, className, isScanning }: PhotoUploadZoneProps) => {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [hoverPos, setHoverPos] = useState<{x: number, y: number} | null>(null);
  const [colorInfo, setColorInfo] = useState<{r:number, g:number, b:number, hex:string} | null>(null);
  const [isFalseColorActive, setIsFalseColorActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);

  const handleStartAnalysis = () => {
      setIsAnalyzing(true);
      // Mock API call delay
      setTimeout(() => {
          // In a real app, this would come from api.analyze.getTask()
          setAnalysisData({
              review: {
                  style_summary: "电影感青橙色调",
                  comprehensive_review: "画面呈现出强烈的冷暖对比，温暖的肤色（橙色）与冷调的阴影（青色）形成鲜明反差。光线柔和且具方向性，是典型的电影人像风格。",
                  pros_evaluation: "主体与背景的分离度极佳。"
              },
              lighting: {
                  exposure_control: [
                      { param: "曝光", range: "+0.5", desc: "略微欠曝以保留高光细节。" },
                      { param: "对比度", range: "+15", desc: "高对比度以增强戏剧效果。" }
                  ]
              },
              color: {
                  white_balance: { temp: { range: "5600K", reason: "日光平衡。" } },
                  grading: { balance: "偏暖" }
              },
              composition: {
                  main_structure: "三分法构图",
                  subject_weight: { description: "主体占据画面 40% 的比例。" }
              }
          });
          setIsAnalyzing(false);
      }, 3000);
  };

  // Reset state when image changes
  useEffect(() => {
    if (!imageSrc) {
        setHoverPos(null);
        setColorInfo(null);
        canvasRef.current = null;
        setIsFalseColorActive(false);
        setAnalysisData(null);
        setIsAnalyzing(false);
    }
  }, [imageSrc]);

  const handleImageLoad = () => {
      if (!imgRef.current || !imageSrc) return;
      // Create offscreen canvas for pixel reading
      const canvas = document.createElement('canvas');
      canvas.width = imgRef.current.naturalWidth;
      canvas.height = imgRef.current.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.drawImage(imgRef.current, 0, 0);
          canvasRef.current = canvas;
      }
  };

  // Precise Coordinate Mapping for object-fit: cover
  const getOriginalCoords = (domX: number, domY: number, containerW: number, containerH: number, imgW: number, imgH: number) => {
      const containerRatio = containerW / containerH;
      const imgRatio = imgW / imgH;

      let renderW, renderH, offsetX, offsetY;

      if (imgRatio > containerRatio) {
          // Image is wider than container: Height matches, Width is cropped
          renderH = containerH;
          renderW = imgH * imgRatio;
          offsetY = 0;
          offsetX = (renderW - containerW) / 2; // Crop is centered
      } else {
          // Image is taller than container: Width matches, Height is cropped
          renderW = containerW;
          renderH = containerW / imgRatio;
          offsetX = 0;
          offsetY = (renderH - containerH) / 2; // Crop is centered
      }
      
      // 1. Convert DOM (0,0 at top-left of container) to Render Space (0,0 at top-left of rendered image)
      const renderX = domX + offsetX;
      const renderY = domY + offsetY;

      // 2. Scale Render Space to Original Image Space
      const scaleX = imgW / renderW;
      const scaleY = imgH / renderH;

      return {
          x: Math.floor(renderX * scaleX),
          y: Math.floor(renderY * scaleY)
      };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!imageSrc || !containerRef.current || !imgRef.current || !canvasRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setHoverPos({ x, y });

      const { naturalWidth, naturalHeight } = imgRef.current;
      const { width, height } = rect;

      const coords = getOriginalCoords(x, y, width, height, naturalWidth, naturalHeight);
      
      if (coords.x >= 0 && coords.x < naturalWidth && coords.y >= 0 && coords.y < naturalHeight) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
              // 1x1 pixel read
              const pixel = ctx.getImageData(coords.x, coords.y, 1, 1).data;
              const r = pixel[0];
              const g = pixel[1];
              const b = pixel[2];
              const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
              setColorInfo({ r, g, b, hex });
          }
      } else {
          setColorInfo(null); // Mouse over padding/border but outside image
      }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
      if (!imageSrc) inputRef.current?.click();
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div 
        ref={containerRef}
        className={`
          w-80 h-[32rem] border border-white/5 rounded bg-carbon-900 shadow-2xl cursor-crosshair
          flex flex-col items-center justify-center gap-4 transition-all duration-500 group relative overflow-hidden 
          ${isDragging ? 'border-optic-accent bg-white/[0.02]' : 'hover:border-optic-accent/30'}
        `}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setHoverPos(null); handleDragLeave(); }}
      >
         <input 
            type="file" 
            ref={inputRef} 
            className="hidden" 
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
         />
         
         {imageSrc ? (
           <>
             <img 
                ref={imgRef}
                src={imageSrc} 
                onLoad={handleImageLoad}
                className="absolute inset-0 w-full h-full object-cover opacity-100 transition-all duration-200" 
                crossOrigin="anonymous"
             />
             
             <FalseColorOverlay 
                imageSrc={imageSrc} 
                isVisible={isFalseColorActive}
                width={320}
                height={512}
             />
             
             {/* Gradient Overlay - Hide when inspecting to see clear colors */}
             <div className={`absolute inset-0 bg-gradient-to-t from-carbon-950 to-transparent pointer-events-none transition-opacity duration-200 ${hoverPos ? 'opacity-0' : 'opacity-90'}`}></div>
             
             {/* SCANNING EFFECT */}
             {isScanning && (
                 <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden rounded bg-optic-accent/5">
                     {/* Grid */}
                     <div className="absolute inset-0 opacity-20" style={{ 
                         backgroundImage: 'linear-gradient(0deg, transparent 24%, #007AFF 25%, #007AFF 26%, transparent 27%, transparent 74%, #007AFF 75%, #007AFF 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #007AFF 25%, #007AFF 26%, transparent 27%, transparent 74%, #007AFF 75%, #007AFF 76%, transparent 77%, transparent)',
                         backgroundSize: '50px 50px'
                     }}></div>
                     
                     {/* Scanning Line */}
                     <motion.div 
                        className="absolute left-0 right-0 h-1 bg-optic-accent shadow-[0_0_20px_#007AFF,0_0_10px_white]"
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                     />
                     
                     {/* Data Noise */}
                     <div className="absolute bottom-10 left-4 text-[10px] font-mono text-optic-accent opacity-70">
                         <div>{t('upload.wavelength')}: {Math.random().toFixed(4)}nm</div>
                         <div>{t('upload.flux')}</div>
                     </div>
                 </div>
             )}

             {/* MAGNIFIER & INSPECTOR */}
             {hoverPos && colorInfo && !isFalseColorActive && (
                <div 
                    className="absolute z-50 pointer-events-none flex flex-col items-center gap-2"
                    style={{ 
                        left: hoverPos.x, 
                        top: hoverPos.y,
                        transform: 'translate(-50%, -120%)' 
                    }}
                >
                    {/* Lens */}
                    <div className="w-24 h-24 rounded-full border-2 border-white/20 bg-carbon-950/50 backdrop-blur-xl overflow-hidden relative shadow-2xl flex items-center justify-center">
                         <div className="absolute inset-0" style={{ backgroundColor: colorInfo.hex }}></div>
                         <div className="w-full h-px bg-white/50 absolute top-1/2"></div>
                         <div className="h-full w-px bg-white/50 absolute left-1/2"></div>
                    </div>

                    {/* Data Panel */}
                    <div className="bg-black/80 border border-white/10 backdrop-blur rounded p-2 text-[9px] font-mono min-w-[100px]">
                        <div className="flex justify-between gap-4 mb-1">
                            <span className="text-gray-400">HEX</span>
                            <span className="text-optic-accent font-bold">{colorInfo.hex}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400">RGB</span>
                            <span className="text-white">{colorInfo.r} {colorInfo.g} {colorInfo.b}</span>
                        </div>
                    </div>
                </div>
             )}

           </>
         ) : (
           <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center text-white/20 group-hover:text-optic-accent group-hover:border-optic-accent/50 transition-all">
              <span className="text-2xl">+</span>
           </div>
         )}
         
         {!imageSrc && (
            <div className="relative z-10 px-6 py-2 font-mono text-[9px] text-white tracking-widest border border-white/10 bg-carbon-950/80 backdrop-blur rounded group-hover:text-optic-accent transition-colors">
                {label.toUpperCase()}
            </div>
         )}
      </div>

      {/* Integrated Analysis Dashboard */}
      {/* 【重要】分析工具面板：包含直方图、色彩雷达、AI 诊断 */}
      {/* 色彩雷达和直方图都是前端实时计算，不使用硬编码模拟数据 */}
      <div className={`transition-opacity duration-500 ${imageSrc ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
         <VisualAnalysisDashboard 
           imageSrc={imageSrc}
           isFalseColorActive={isFalseColorActive}
           onToggleFalseColor={() => setIsFalseColorActive(!isFalseColorActive)}
           histogramElement={<Histogram imageSrc={imageSrc} height={120} className="border-0 bg-transparent p-0" />}
           analysisData={analysisData}
           isAnalyzing={isAnalyzing}
           onStartAnalysis={handleStartAnalysis}
         />
      </div>
    </div>
  );
};
