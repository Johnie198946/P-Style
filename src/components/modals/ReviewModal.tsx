import React, { useState, useRef, useEffect } from 'react';
import { BaseModal } from './BaseModal';

// --- PRECISION LOUPE (Absolute Follow with REAL Color) ---
const OpticalLoupe = ({ x, y, src, containerRect, show, colorData }: any) => {
    if (!show || !containerRect || !colorData) return null;

    const { r, g, b, hex, zone } = colorData;

    // Calculate relative position for visual feed
    const percX = (x / containerRect.width) * 100;
    const percY = (y / containerRect.height) * 100;

    return (
        <div 
            className="absolute z-50 pointer-events-none"
            style={{ 
                left: x, top: y,
                transform: 'translate(-50%, -50%)'
            }}
        >
            {/* Lens Body */}
            <div className="w-48 h-48 rounded-full border-2 border-white/80 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] bg-black relative">
                {/* Visual Feed (Approximation) */}
                <div 
                    className="absolute inset-0 w-full h-full"
                    style={{
                        backgroundImage: `url(${src})`,
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: `${containerRect.width * 4}px ${containerRect.height * 4}px`,
                        backgroundPosition: `${percX}% ${percY}%` 
                    }}
                />
                
                {/* Crosshair */}
                <div className="absolute inset-0 flex items-center justify-center opacity-70">
                    <div className="w-full h-px bg-optic-accent/80 shadow-[0_0_2px_rgba(0,0,0,1)]"></div>
                    <div className="h-full w-px bg-optic-accent/80 absolute shadow-[0_0_2px_rgba(0,0,0,1)]"></div>
                </div>
            </div>

            {/* Live Color HUD */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 bg-black/90 border border-optic-accent/50 px-4 py-3 rounded-md text-[10px] font-mono text-white shadow-xl whitespace-nowrap flex items-center gap-4 min-w-[200px] animate-in fade-in slide-in-from-top-2">
                <div className="w-8 h-8 rounded-full border-2 border-white shadow-lg" style={{ backgroundColor: `rgb(${r},${g},${b})` }}></div>
                <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1">
                    <div className="text-gray-500">RGB</div><div className="text-optic-accent text-right">{r} {g} {b}</div>
                    <div className="text-gray-500">HEX</div><div className="text-white text-right uppercase">{hex}</div>
                    <div className="text-gray-500">ZONE</div><div className="text-right font-bold bg-white/20 px-1 rounded text-center">{zone}</div>
                </div>
            </div>
        </div>
    );
};

const AdaptiveImage = ({ src, label, overlays, activeOverlay, onHoverOverlay }: any) => {
  const [showLoupe, setShowLoupe] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [colorData, setColorData] = useState<{r:number, g:number, b:number, hex:string, zone:number} | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize canvas on load
  const handleImageLoad = () => {
      if (!imgRef.current) return;
      const canvas = document.createElement('canvas');
      canvas.width = imgRef.current.naturalWidth;
      canvas.height = imgRef.current.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.drawImage(imgRef.current, 0, 0);
          canvasRef.current = canvas;
      }
  };

  const getOriginalCoords = (domX: number, domY: number, containerW: number, containerH: number, imgW: number, imgH: number) => {
      const containerRatio = containerW / containerH;
      const imgRatio = imgW / imgH;

      let renderW, renderH, offsetX, offsetY;

      // logic for object-fit: contain
      if (imgRatio > containerRatio) {
          // Image is wider than container (relative to aspect ratio)
          renderW = containerW;
          renderH = containerW / imgRatio;
          offsetX = 0;
          offsetY = (containerH - renderH) / 2;
      } else {
          // Image is taller
          renderH = containerH;
          renderW = containerH * imgRatio;
          offsetY = 0;
          offsetX = (containerW - renderW) / 2;
      }

      // Check if inside the image rect
      if (domX < offsetX || domX > offsetX + renderW || domY < offsetY || domY > offsetY + renderH) {
          return null;
      }

      // Map to original
      const relX = domX - offsetX;
      const relY = domY - offsetY;
      
      const scaleX = imgW / renderW;
      const scaleY = imgH / renderH;

      return {
          x: Math.floor(relX * scaleX),
          y: Math.floor(relY * scaleY)
      };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !imgRef.current || !canvasRef.current) return;

    const r = containerRef.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    
    setRect(r);
    setMousePos({ x, y });

    const coords = getOriginalCoords(x, y, r.width, r.height, imgRef.current.naturalWidth, imgRef.current.naturalHeight);

    if (coords) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            const pixel = ctx.getImageData(coords.x, coords.y, 1, 1).data;
            const red = pixel[0];
            const green = pixel[1];
            const blue = pixel[2];
            const hex = "#" + ((1 << 24) + (red << 16) + (green << 8) + blue).toString(16).slice(1).toUpperCase();
            
            const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
            const zoneVal = Math.floor(luma / 25.5); 

            setColorData({ r: red, g: green, b: blue, hex, zone: zoneVal });
        }
    } else {
        setColorData(null);
    }
  };

  return (
    <div 
        ref={containerRef}
        className="flex-1 relative bg-carbon-950 flex items-center justify-center border-r border-white/5 cursor-none group overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setShowLoupe(true)}
        onMouseLeave={() => setShowLoupe(false)}
    >
      <div className="relative w-full h-full p-12 flex items-center justify-center pointer-events-none">
         <img 
            ref={imgRef}
            src={src} 
            className="w-full h-full object-contain shadow-2xl opacity-100" 
            alt={label}
            onLoad={handleImageLoad}
            crossOrigin="anonymous"
         />
      </div>

      {/* Interactive Overlays Layer */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
          <div className="w-full h-full relative">
            {overlays && Object.entries(overlays).map(([key, rect]: any) => {
                const isActive = activeOverlay === key;
                return (
                    <div
                        key={key}
                        className={`
                            absolute z-20 cursor-crosshair transition-all duration-300 ease-out pointer-events-auto
                            ${isActive 
                                ? 'border-2 border-optic-accent bg-optic-accent/10 shadow-[0_0_30px_rgba(0,122,255,0.3)] opacity-100' 
                                : 'border border-white/20 bg-white/[0.01] opacity-0 hover:opacity-100'
                            }
                        `}
                        style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.w}%`, height: `${rect.h}%` }}
                        onMouseEnter={() => onHoverOverlay(key)}
                        onMouseLeave={() => onHoverOverlay(null)}
                    >
                        {isActive && (
                           <div className="absolute -top-3 left-0 text-[8px] text-white bg-optic-accent px-1.5 py-0.5 font-bold tracking-wider rounded-sm shadow-sm whitespace-nowrap animate-in fade-in slide-in-from-bottom-1">
                              {rect.label ? rect.label.toUpperCase() : key.replace('_', ' ').toUpperCase()}
                           </div>
                        )}
                    </div>
                );
            })}
          </div>
      </div>

      <OpticalLoupe x={mousePos.x} y={mousePos.y} src={src} show={showLoupe && colorData} containerRect={rect} colorData={colorData} />
      <div className="absolute bottom-6 left-6 font-mono text-[9px] text-optic-silver uppercase tracking-widest bg-black/50 px-2 py-1 rounded border border-white/5 pointer-events-none">{label}</div>
    </div>
  );
};

const Histogram3D = ({ data }: any) => {
    return (
        <div className="h-32 perspective-1000 relative flex items-end gap-2 p-4 mb-8">
            <div className="absolute inset-0 border-b border-white/10 transform rotateX(60deg) origin-bottom opacity-30 pointer-events-none"></div>
            {data.reference.map((val: number, i: number) => (
                <div key={i} className="flex-1 h-full relative flex items-end group preserve-3d transition-transform hover:translate-y-[-10px] duration-300 cursor-pointer">
                    <div className="w-full bg-white/5 absolute bottom-0 border border-white/10 cube-face transition-all" style={{ height: `${val}%`, transform: 'translateZ(-10px)' }}></div>
                    <div className="w-full bg-optic-accent/20 absolute bottom-0 border-t border-optic-accent cube-face shadow-[0_0_15px_rgba(0,122,255,0.3)]" style={{ height: `${data.user[i]}%`, transform: 'translateZ(10px)' }}></div>
                </div>
            ))}
        </div>
    );
};

const SectionBlock = ({ title, content, id, onHover, activeId }: any) => (
  <div 
    className={`
        p-6 border-l-[2px] transition-all duration-500 cursor-pointer relative group
        ${activeId === id ? 'border-optic-accent bg-white/[0.03]' : 'border-transparent hover:bg-white/[0.01] hover:border-white/10'}
    `}
    onMouseEnter={() => onHover(id)}
    onMouseLeave={() => onHover(null)}
  >
    <div className="flex justify-between items-center mb-3">
        <h4 className={`text-[10px] font-bold font-display uppercase tracking-widest transition-colors ${activeId === id ? 'text-white text-glow' : 'text-gray-500'}`}>{title}</h4>
        {activeId === id && <div className="w-1.5 h-1.5 bg-optic-accent rounded-full shadow-[0_0_8px_#007AFF]"></div>}
    </div>
    <p className={`text-sm leading-relaxed font-light transition-colors ${activeId === id ? 'text-gray-200' : 'text-gray-500'}`}>{content}</p>
  </div>
);

export const ReviewModal = ({ data, images, onClose }: any) => {
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  
  // Defensive check for data structure
  const overlays = data?.overlays || {};

  return (
    <BaseModal title="Visual Critique" onClose={onClose} width="max-w-[95vw]">
      <div className="flex h-full">
        <div className="flex-[1.6] flex bg-carbon-950 relative">
           <AdaptiveImage src={images.source} label="REF SOURCE" overlays={overlays} activeOverlay={hoveredSection} onHoverOverlay={setHoveredSection} />
           <AdaptiveImage src={images.target} label="TARGET INPUT" overlays={overlays} activeOverlay={hoveredSection} onHoverOverlay={setHoveredSection} />
        </div>
        <div className="w-[500px] bg-carbon-900 border-l border-white/5 flex flex-col relative z-10">
            <div className="overflow-y-auto flex-1 custom-scrollbar relative">
                <div className="p-10 space-y-12">
                    <div className="border border-white/10 p-6 bg-carbon-800 relative overflow-hidden group hover:border-optic-gold/30 transition-colors">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-bl-full transform translate-x-8 -translate-y-8"></div>
                        <div className="text-[9px] font-mono text-optic-gold mb-3 uppercase tracking-widest flex items-center gap-2"><span className="w-1 h-1 bg-optic-gold rounded-full animate-pulse"></span> Core Strategy</div>
                        <p className="text-lg font-medium text-white leading-relaxed">{data.style_summary}</p>
                    </div>
                    <div className="space-y-1">
                        {/* IDs must match the keys in BACKEND_AI_SPECS.md */}
                        <SectionBlock title="Visual Subject" content={data.visual_subject_analysis} id="visual_subject" onHover={setHoveredSection} activeId={hoveredSection} />
                        <SectionBlock title="Focus & Exposure" content={data.focus_exposure_analysis} id="focus_exposure" onHover={setHoveredSection} activeId={hoveredSection} />
                        <SectionBlock title="Color & Emotion" content={data.emotion} id="color_depth" onHover={setHoveredSection} activeId={hoveredSection} />
                    </div>
                    <div className="border-t border-white/5 pt-10">
                        <h4 className="text-[9px] font-mono text-gray-600 uppercase mb-6 tracking-widest">Volumetric Luminance</h4>
                        <Histogram3D data={data.simulated_histogram_data} />
                        <div className="bg-carbon-800 border border-white/5 text-xs">
                            <div className="grid grid-cols-4 gap-4 px-4 py-2 text-[9px] uppercase tracking-widest text-gray-500 font-bold border-b border-white/5 bg-black/20"><div>Param</div><div className="text-center">Current</div><div></div><div className="text-right text-optic-gold">Target</div></div>
                            {data.parameter_comparison_table.map((row:any, i:number) => (
                                <div key={i} className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors group">
                                    <div className="text-gray-300 font-medium text-[11px]">{row.param}</div>
                                    <div className="text-gray-500 text-center font-mono text-[10px]">{row.user}</div>
                                    <div className="text-center text-gray-700 text-[10px]">→</div>
                                    <div className="text-optic-gold font-mono text-[10px] text-right font-bold">{row.suggest}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-gradient-to-r from-white/[0.02] to-transparent p-6 border-l-2 border-white/20 flex items-center justify-between">
                        <div><div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Feasibility</div><div className="text-3xl font-display text-white tracking-tight">{data.feasibility_assessment.score}<span className="text-lg text-gray-600 ml-1">%</span></div></div>
                        <div className="text-right"><div className="text-[9px] text-green-500 font-mono mb-1 tracking-wide uppercase">{data.feasibility_assessment.level}</div><div className="text-[9px] text-gray-500 max-w-[150px] truncate opacity-60">{data.feasibility_assessment.recommendation}</div></div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </BaseModal>
  );
};
