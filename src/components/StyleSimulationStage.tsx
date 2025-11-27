/**
 * 风格模拟阶段组件
 * 展示 AI 生成的风格预览图，支持分屏对比、差异图、风格匹配视图
 * 根据开发方案第 715-717 行实现风格模拟 API 对接
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Zap, User, Download } from 'lucide-react';
import { UserProfile } from './UserProfile';
import { DownloadPanel } from './DownloadPanel';
import { useLanguage } from '../src/contexts/LanguageContext';
import { api } from '../src/lib/api';
import { toast } from 'sonner@2.0.3';

// --- VFX: QUANTUM REVERSE BUTTON ---

const TimeReversalBtn = ({ onClick, disabled, label }: { onClick: () => void, disabled: boolean, label: string }) => {
    const { t } = useLanguage();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isImploding, setIsImploding] = useState(false);

    const handleClick = () => {
        if (disabled || isImploding) return;
        
        setIsImploding(true);
        
        // 1. Trigger Implosion Particles
        triggerImplosion();

        // 2. Delay actual callback for visual effect (600ms)
        setTimeout(() => {
            setIsImploding(false);
            onClick();
        }, 800);
    };

    const triggerImplosion = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        const particles: any[] = [];
        for (let i = 0; i < 50; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                angle: Math.random() * Math.PI * 2,
                dist: 100 + Math.random() * 100, // Start far
                speed: 10 + Math.random() * 10,
                size: Math.random() * 2 + 1,
                color: Math.random() > 0.5 ? '#00F0FF' : '#FFFFFF'
            });
        }

        let frame = 0;
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw "Suction" lines
            ctx.globalCompositeOperation = 'lighter';
            
            let activeCount = 0;
            particles.forEach(p => {
                if (p.dist > 5) {
                    p.dist -= p.speed;
                    p.speed *= 1.1; // Accelerate inward
                    
                    const lx = centerX + Math.cos(p.angle) * p.dist;
                    const ly = centerY + Math.sin(p.angle) * p.dist;
                    
                    ctx.beginPath();
                    ctx.fillStyle = p.color;
                    ctx.arc(lx, ly, p.size, 0, Math.PI*2);
                    ctx.fill();
                    
                    // Trail
                    ctx.beginPath();
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = p.size * 0.5;
                    ctx.moveTo(lx, ly);
                    ctx.lineTo(
                        lx + Math.cos(p.angle) * p.speed * 2,
                        ly + Math.sin(p.angle) * p.speed * 2
                    );
                    ctx.stroke();
                    
                    activeCount++;
                }
            });

            if (activeCount > 0 && frame < 40) {
                frame++;
                requestAnimationFrame(animate);
            } else {
                // EXPLODE FLASH
                ctx.clearRect(0,0,canvas.width, canvas.height);
            }
        };
        animate();
    };

    return (
        <div className="relative group">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-20 scale-150" />
            
            <motion.button
                onClick={handleClick}
                disabled={disabled || isImploding}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={isImploding ? { 
                    scale: [1, 0.8, 1.2, 1],
                    filter: ["brightness(1)", "brightness(2)", "brightness(1)"],
                    rotate: [0, -180, 0]
                } : {}}
                transition={{ duration: 0.6 }}
                className={`
                    relative z-10 overflow-hidden
                    bg-black hover:bg-carbon-900 
                    text-white px-6 py-2 
                    text-[10px] font-bold uppercase tracking-widest 
                    transition-all disabled:opacity-50 ml-4 
                    border border-optic-accent/30 hover:border-optic-accent
                    shadow-[0_0_10px_rgba(0,122,255,0.1)] hover:shadow-[0_0_20px_rgba(0,122,255,0.4)]
                    flex items-center gap-2
                `}
            >
                {/* Button Inner Glow */}
                <div className="absolute inset-0 bg-optic-accent/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                {isImploding ? (
                    <Zap className="w-3 h-3 animate-pulse text-yellow-400" />
                ) : (
                    <RotateCcw className="w-3 h-3 group-hover:-rotate-180 transition-transform duration-500" />
                )}
                
                <span className="relative z-10">{disabled ? t('simulation.rendering') : label}</span>
            </motion.button>
        </div>
    );
};

// --- VFX: SCREEN GLITCH ---
const GlitchOverlay = () => (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ 
            opacity: [0, 1, 0, 1, 0],
            background: [
                'rgba(255,0,0,0.1)', 
                'rgba(0,255,0,0.1)', 
                'rgba(0,0,255,0.1)', 
                'transparent'
            ]
        }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 z-[100] pointer-events-none mix-blend-difference overflow-hidden flex flex-col"
    >
        {[...Array(10)].map((_, i) => (
            <motion.div 
                key={i}
                className="w-full bg-white/20"
                style={{ height: Math.random() * 20 + 'px' }}
                initial={{ x: '-100%' }}
                animate={{ x: ['100%', '-100%', '50%'] }}
                transition={{ duration: 0.2, delay: Math.random() * 0.1 }}
            />
        ))}
    </motion.div>
);

// --- OPTICAL ENGINE CORE ---
// Translates AI Analysis Data into Real-time CSS Filters
const useOpticalEngine = (data: any) => {
  const [filters, setFilters] = useState<string>('');
  const [params, setParams] = useState<any>({});

  useEffect(() => {
    if (!data) return;

    // 1. Extract Parameters from Lightroom & Color Data
    // Handle both Mock Data structure and Backend API structure
    const lr = data.lightroom?.basic_panel || []; 
    
    const getVal = (label: string) => {
       if (Array.isArray(lr)) {
           const item = lr.find((i:any) => i.label === label || i.name === label);
           return item ? parseFloat(item.value) : 0;
       }
       return 0;
    };

    // Normalization Logic (Mapping AI values to CSS units)
    const exposure = getVal('Exposure'); // e.g. +1.65 -> brightness(1.65)
    const contrast = getVal('Contrast'); // e.g. -20 -> contrast(0.8)
    const temp = getVal('Temp');         // e.g. +800 -> sepia + color filter
    const saturation = getVal('Vibrance') || getVal('Saturation') || 0; 
    const highlights = getVal('Highlights');

    // Construct Filter String
    // Exposure: 0 is baseline (100%). +1 is 200%.
    const brightnessVal = 1 + (exposure / 2); 
    // Contrast: 0 is 100%. -100 is 0%.
    const contrastVal = 1 + (contrast / 100);
    // Saturation: 
    const satVal = 1 + (saturation / 100);
    // Temp (Simplified simulation): Positive = Warm (Sepia), Negative = Cool (Hue Rotate blue)
    const sepiaVal = temp > 0 ? Math.min(0.5, temp / 5000) : 0;
    
    const filterString = `
      brightness(${brightnessVal}) 
      contrast(${contrastVal}) 
      saturate(${satVal}) 
      sepia(${sepiaVal})
    `;

    setFilters(filterString);
    setParams({ exposure, contrast, temp, saturation, highlights });
  }, [data]);

  return { filters, params };
};

interface StyleSimulationStageProps {
  data: any; // Analysis result (Part 1 + Part 2 + Part 3)
  images: { source: string; target: string };
  taskId?: string | null;
}

export const StyleSimulationStage = ({ data, images, taskId }: StyleSimulationStageProps) => {
  const { t } = useLanguage();
  const [sliderPos, setSliderPos] = useState(50);
  const [viewMode, setViewMode] = useState<'split' | 'diff' | 'match'>('split');
  const [isScanning, setIsScanning] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [simulationData, setSimulationData] = useState<any>(data); // 本地状态管理预览图数据
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 同步外部 data 变化到本地状态
  useEffect(() => {
    if (data) {
      setSimulationData(data);
    }
  }, [data]);
  
  // Determine Mode: Generative (Real) vs Optical (CSS Simulation)
  const generativeImage = simulationData?.preview_image_url;
  const mode = generativeImage ? 'GENERATIVE' : 'OPTICAL';

  const { filters, params } = useOpticalEngine(simulationData);

  const handleDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current || viewMode !== 'split') return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const pos = ((x - rect.left) / rect.width) * 100;
    setSliderPos(Math.min(100, Math.max(0, pos)));
  };

  /**
   * 运行风格模拟
   * 调用后端 API 生成新的预览图
   * 根据开发方案第 715-717 行实现
   */
  const runSimulation = async () => {
    if (!taskId) {
      toast.error("Task ID is missing");
      return;
    }
    
      setIsScanning(true);
      setSliderPos(0);
    
    try {
      // 调用后端生成预览图
      const result = await api.simulate.style(taskId);
      
      if (result.preview_image_url) {
        // 更新本地状态中的预览图
        setSimulationData((prev: any) => ({
          ...prev,
          preview_image_url: result.preview_image_url
        }));
        toast.success("风格模拟完成");
      } else {
        toast.info("使用光学引擎模拟");
      }
      
      // 动画效果
      let start = Date.now();
      const duration = 2000;
      const animate = () => {
          const now = Date.now();
          const progress = Math.min(1, (now - start) / duration);
          setSliderPos((1 - Math.pow(1 - progress, 3)) * 100);
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsScanning(false);
        }
      };
      requestAnimationFrame(animate);
    } catch (error: any) {
      console.error("Simulation error:", error);
      toast.error(error.message || "风格模拟失败，请重试");
      setIsScanning(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-0 animate-fade-in-scale bg-carbon-900 border border-white/10 shadow-2xl overflow-hidden relative">
      <AnimatePresence>
          {isScanning && <GlitchOverlay />}
          {isDownloadOpen && <DownloadPanel isOpen={isDownloadOpen} onClose={() => setIsDownloadOpen(false)} taskId={taskId} />}
      </AnimatePresence>
      
      {/* HEADER */}
      <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-carbon-950/90 backdrop-blur z-20">
         <div className="flex items-center gap-6">
            <div className="flex flex-col">
                <h2 className="text-sm font-bold text-white font-display tracking-[0.2em]">{t('simulation.title')}</h2>
                <span className="text-[9px] text-gray-500 font-mono tracking-widest">
                    {mode === 'GENERATIVE' ? t('simulation.subtitle.gen') : t('simulation.subtitle.opt')}
                </span>
            </div>
            <div className="h-8 w-px bg-white/10"></div>
            {isScanning ? (
                <span className="text-[10px] text-optic-accent font-mono animate-pulse">{t('simulation.processing')}</span>
            ) : (
                <div className="flex gap-4 text-[9px] font-mono text-gray-400">
                    <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> {t('simulation.engine_ready')}</div>
                    <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-optic-accent"></span> {t('simulation.gpu_accel')}</div>
                </div>
            )}
         </div>

         <div className="flex gap-2 items-center">
             <div className="flex bg-black/40 rounded p-1 border border-white/10">
                 <button onClick={() => setViewMode('split')} className={`px-3 py-1 text-[10px] uppercase transition-all ${viewMode==='split'?'bg-white text-black font-bold shadow-lg':'text-gray-500 hover:text-white'}`}>{t('simulation.split_view')}</button>
                 <button onClick={() => setViewMode('diff')} className={`px-3 py-1 text-[10px] uppercase transition-all ${viewMode==='diff'?'bg-optic-accent text-white font-bold shadow-lg':'text-gray-500 hover:text-white'}`}>{t('simulation.diff_map')}</button>
                 <button onClick={() => setViewMode('match')} className={`px-3 py-1 text-[10px] uppercase transition-all ${viewMode==='match'?'bg-optic-gold text-black font-bold shadow-lg':'text-gray-500 hover:text-white'}`}>{t('simulation.style_match')}</button>
             </div>
             
             <div className="h-8 w-px bg-white/10 mx-2"></div>

             <button
                onClick={() => setIsDownloadOpen(true)}
                className="bg-carbon-800 hover:bg-white hover:text-black text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all border border-white/10 hover:border-white shadow-lg flex items-center gap-2 rounded-sm"
             >
                <Download className="w-3 h-3" />
                {t('simulation.download')}
             </button>

             <div className="h-8 w-px bg-white/10 mx-2"></div>

             <TimeReversalBtn 
                onClick={runSimulation} 
                disabled={isScanning} 
                label={t('simulation.rerun')}
             />
         </div>
      </div>

      {/* VIEWPORT */}
      <div className="flex-1 relative bg-carbon-900 overflow-hidden group select-none flex">
         
         {/* LEFT: IMAGE CANVAS */}
         <div className="flex-1 relative bg-[#0a0a0a] overflow-hidden">
            {isScanning && (
                <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center pointer-events-none">
                    <div className="w-full h-1 bg-optic-accent absolute animate-scan-line shadow-[0_0_20px_#007AFF]"></div>
                </div>
            )}

            {viewMode === 'split' ? (
                <div 
                  ref={containerRef}
                  className="relative w-full h-full cursor-col-resize"
                  onMouseMove={(e) => e.buttons === 1 && handleDrag(e)}
                  onClick={handleDrag}
                  onTouchMove={handleDrag}
                >
                  {/* ORIGINAL IMAGE (Right Side / Underneath) */}
                  <img 
                    src={images.target} 
                    className="absolute inset-0 w-full h-full object-contain p-8 opacity-100" 
                    draggable={false}
                  />
                  
                  {/* PROCESSED IMAGE (Left Side / Clipped) */}
                  <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#0a0a0a]" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                     <img 
                        src={mode === 'GENERATIVE' ? generativeImage : images.target} 
                        className="absolute inset-0 w-full h-full object-contain p-8 transition-all duration-100" 
                        style={mode === 'OPTICAL' ? { filter: filters } : {}} // Apply CSS filter only in Optical mode
                        draggable={false}
                     />
                     <div className="absolute top-8 left-8 text-[10px] font-bold text-black font-mono tracking-widest uppercase bg-white/90 px-3 py-1 rounded backdrop-blur border border-white/50 shadow-lg">
                        {mode === 'GENERATIVE' ? t('simulation.ai_result') : t('simulation.quantum_grade')}
                     </div>
                  </div>
                  
                  {/* Slider Handle */}
                  <div className="absolute top-0 bottom-0 w-px bg-optic-accent z-20 shadow-[0_0_30px_#007AFF]" style={{ left: `${sliderPos}%` }}>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-black border border-optic-accent rounded-full flex items-center justify-center shadow-lg cursor-ew-resize">
                        <div className="w-1 h-4 bg-white/50 rounded-full mx-0.5"></div>
                        <div className="w-1 h-4 bg-white/50 rounded-full mx-0.5"></div>
                    </div>
                  </div>
                </div>
            ) : viewMode === 'diff' ? (
                <div className="flex h-full items-center justify-center">
                    <div className="relative w-full h-full max-w-4xl p-12">
                        <img src={images.target} className="absolute inset-0 w-full h-full object-contain p-12 opacity-100 mix-blend-difference filter invert" />
                        <img 
                            src={mode === 'GENERATIVE' ? generativeImage : images.target} 
                            className="absolute inset-0 w-full h-full object-contain p-12 mix-blend-screen opacity-80" 
                            style={mode === 'OPTICAL' ? { filter: `contrast(200%) ${filters}` } : {}} 
                        />
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-red-500/20 border border-red-500 text-red-500 px-4 py-2 rounded font-mono text-xs">{t('simulation.diff_heatmap')}</div>
                    </div>
                </div>
             ) : (
                // --- STYLE MATCH VIEW (DNA COMPARISON) ---
                <div className="flex w-full h-full relative bg-[#050505]">
                    {/* Center Connector (The DNA Bridge) */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-24 -translate-x-1/2 z-20 flex flex-col items-center justify-center">
                        <div className="h-full w-px bg-white/5 absolute"></div>
                        
                        {/* Similarity Score Badge */}
                        <motion.div 
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="relative z-30 bg-black border border-optic-gold/50 text-optic-gold px-3 py-2 rounded-full font-mono text-xs font-bold shadow-[0_0_20px_rgba(255,215,0,0.2)] flex flex-col items-center gap-1"
                        >
                            <span className="text-[9px] text-gray-500 tracking-widest uppercase">{t('simulation.match_score')}</span>
                            <span className="text-lg">94.2%</span>
                        </motion.div>

                        {/* Color DNA Links */}
                        <div className="flex flex-col gap-8 mt-12 w-full items-center">
                            {[
                                {c: '#FF5733', label: t('simulation.param.warmth')}, 
                                {c: '#33FF57', label: t('simulation.param.tint')}, 
                                {c: '#3357FF', label: t('simulation.param.shadow')}, 
                                {c: '#F333FF', label: t('simulation.param.highlight')}
                            ].map((item, i) => (
                                <div key={i} className="w-full flex items-center justify-center gap-2 group">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.c, boxShadow: `0 0 10px ${item.c}` }}></div>
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:via-white/60 transition-all"></div>
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.c, boxShadow: `0 0 10px ${item.c}` }}></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Left: Reference Style */}
                    <div className="flex-1 relative border-r border-white/5 p-8 group">
                         <div className="absolute top-4 left-8 z-10">
                             <h3 className="text-xs font-bold text-white font-display tracking-[0.2em]">{t('simulation.ref_dna')}</h3>
                             <p className="text-[9px] text-gray-500 font-mono">{t('simulation.source_input')}</p>
                         </div>
                         <div className="w-full h-full relative overflow-hidden rounded-lg border border-white/10 bg-black/50 group-hover:border-white/20 transition-colors">
                             <img src={images.source} className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                             {/* Corner Markers */}
                             <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/30"></div>
                             <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/30"></div>
                             <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/30"></div>
                             <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/30"></div>
                         </div>
                    </div>

                    {/* Right: Result */}
                    <div className="flex-1 relative p-8 group">
                         <div className="absolute top-4 right-8 z-10 text-right">
                             <h3 className="text-xs font-bold text-optic-gold font-display tracking-[0.2em]">{t('simulation.synth_clone')}</h3>
                             <p className="text-[9px] text-gray-500 font-mono">{t('simulation.final_output')}</p>
                         </div>
                         <div className="w-full h-full relative overflow-hidden rounded-lg border border-optic-gold/20 bg-black/50 group-hover:border-optic-gold/40 transition-colors shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                             <img 
                                src={mode === 'GENERATIVE' ? generativeImage : images.target} 
                                className="w-full h-full object-contain" 
                                style={mode === 'OPTICAL' ? { filter: filters } : {}}
                             />
                             {/* Scan Overlay */}
                             <div className="absolute inset-0 bg-gradient-to-b from-optic-gold/5 to-transparent pointer-events-none mix-blend-overlay"></div>
                             {/* Corner Markers */}
                             <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-optic-gold/30"></div>
                             <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-optic-gold/30"></div>
                             <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-optic-gold/30"></div>
                             <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-optic-gold/30"></div>
                         </div>
                    </div>
                </div>
             )}
         </div>

         {/* RIGHT: PARAMETER HUD */}
         <div className="w-80 bg-carbon-950 border-l border-white/5 p-6 overflow-y-auto custom-scrollbar z-10">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2 font-display">{t('simulation.active_params')}</h3>
            
            <div className="space-y-6">
                {Object.entries(params).map(([key, val]: any) => {
                    const label = t(`modal.common.${key}` as any) || key;
                    return (
                    <div key={key} className="group">
                        <div className="flex justify-between mb-2 text-[10px] font-mono uppercase">
                            <span className="text-gray-400">{label}</span>
                            <span className="text-optic-accent">{typeof val === 'number' ? val.toFixed(2) : val}</span>
                        </div>
                        <div className="h-1 bg-gray-800 rounded-full overflow-hidden relative">
                            <div 
                                className="h-full bg-white absolute transition-all duration-500"
                                style={{ 
                                    width: `${Math.min(100, Math.abs(val))}%`, 
                                    left: val < 0 ? 'auto' : '0',
                                    right: val < 0 ? '0' : 'auto'
                                }}
                            ></div>
                        </div>
                    </div>
                    );
                })}
            </div>

            <div className="mt-12 p-4 bg-white/[0.03] rounded border border-white/5">
                <h4 className="text-[9px] text-optic-gold uppercase tracking-widest mb-2">{t('simulation.ai_confidence')}</h4>
                <div className="flex items-end gap-1 h-12">
                    {[40, 60, 30, 80, 100, 70, 50, 90].map((h, i) => (
                        <div key={i} className="flex-1 bg-optic-gold/20 hover:bg-optic-gold transition-colors" style={{ height: `${h}%` }}></div>
                    ))}
                </div>
            </div>
         </div>

      </div>
    </div>
  );
};
