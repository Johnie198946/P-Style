import React, { useRef, useState } from 'react';
import { BaseModal } from './BaseModal';

export const LightingModal = ({ data, onClose }: any) => {
  const [tilt, setTilt] = useState({ x: 25, y: -15 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    // Map 0-1 to angles. Move +/- 20 deg
    setTilt({
        x: 10 + (y * 30), // Pitch
        y: -30 + (x * 60) // Yaw
    });
  };

  return (
    <BaseModal title="Lighting Parameters" onClose={onClose}>
      <div className="grid md:grid-cols-2 gap-0 h-full">
        
        {/* 6DoF Interactive Chart */}
        <div 
            ref={containerRef}
            onMouseMove={handleMouseMove}
            className="bg-carbon-950 flex items-center justify-center p-12 border-r border-white/5 relative perspective-1000 overflow-hidden cursor-move"
        >
           <div className="absolute top-4 left-4 text-[9px] font-mono text-gray-600 border border-gray-800 px-2 py-1 rounded">Interactive 3D Viewport</div>
           <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:40px_40px]"></div>

           <div 
             className="w-full aspect-square relative max-w-md transition-transform duration-100 ease-out preserve-3d"
             style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(0.85)` }}
           >
              {/* Floor Reflection */}
              <div className="absolute inset-0 bg-gradient-to-t from-optic-accent/10 to-transparent transform translate-z-[-50px] scale-y-[-1] opacity-20 blur-lg"></div>

              {/* 3D Axis Box */}
              <div className="absolute inset-0 border border-white/10 transform translate-z-[-30px]">
                  {/* Depth Markers */}
                  <div className="absolute right-0 top-0 h-full border-r border-white/10 transform rotateY(90deg) origin-right w-[60px]"></div>
              </div>

              {/* R G B Layers separated by Z (Depth) */}
              <svg viewBox="0 0 255 255" className="absolute inset-0 w-full h-full overflow-visible transform scale-y-[-1] translate-z-[-30px] opacity-40 pointer-events-none">
                 <path d="M0,0 C60,20 190,180 255,220" fill="none" stroke="#FF3B30" strokeWidth="3" />
              </svg>
              <svg viewBox="0 0 255 255" className="absolute inset-0 w-full h-full overflow-visible transform scale-y-[-1] translate-z-[0px] opacity-40 pointer-events-none">
                 <path d="M0,0 C50,40 200,210 255,255" fill="none" stroke="#34C759" strokeWidth="3" />
              </svg>
              <svg viewBox="0 0 255 255" className="absolute inset-0 w-full h-full overflow-visible transform scale-y-[-1] translate-z-[30px] opacity-40 pointer-events-none">
                 <path d="M0,10 C70,30 180,190 255,230" fill="none" stroke="#007AFF" strokeWidth="3" />
              </svg>

              {/* Master Curve (Interactive) */}
              <svg viewBox="0 0 255 255" className="absolute inset-0 w-full h-full overflow-visible transform scale-y-[-1] translate-z-[60px] drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)]">
                 <line x1="0" y1="0" x2="255" y2="255" stroke="#333" strokeWidth="1" strokeDasharray="4 4" />
                 <path d="M0,0 C60,30 190,200 255,240" fill="none" stroke="#fff" strokeWidth="3" />
                 {data.tone_curves.points_rgb.map((p:any, i:number) => (
                    <g key={i} className="group cursor-pointer">
                        <circle cx={p.x} cy={p.y} r="6" fill="#000" stroke="#fff" strokeWidth="2" />
                        <rect x={p.x + 10} y={p.y - 10} width="40" height="16" fill="black" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        <text x={p.x + 12} y={p.y + 2} fill="white" fontSize="10" className="opacity-0 group-hover:opacity-100 transition-opacity transform scale-y-[-1]">{p.x},{p.y}</text>
                    </g>
                 ))}
              </svg>

              {/* 3D Labels */}
              <div className="absolute -left-12 bottom-0 text-[9px] text-gray-500 font-mono -rotate-90 tracking-widest">OUTPUT LUMINANCE</div>
              <div className="absolute bottom-[-30px] left-0 w-full text-center text-[9px] text-gray-500 font-mono tracking-widest">INPUT VALUE</div>
              <div className="absolute top-0 -right-12 h-full flex items-center text-[9px] text-optic-accent font-mono rotate-90 tracking-widest">COLOR DEPTH (Z)</div>
           </div>
        </div>

        {/* Data Panel */}
        <div className="bg-carbon-900 overflow-y-auto custom-scrollbar p-12">
           <div className="mb-12">
              <h3 className="text-[10px] font-bold text-optic-gold uppercase mb-8 tracking-[0.2em] font-mono border-b border-white/5 pb-4">Exposure Matrix</h3>
              <div className="space-y-3">
                 {data.exposure_control.map((item: any, i: number) => (
                    <div key={i} className="group p-5 bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all duration-300 hover:translate-x-1 hover:bg-white/[0.04]">
                       <div className="flex justify-between items-baseline mb-2">
                          <span className="text-sm font-bold text-gray-200">{item.param}</span>
                          <span className="text-xs font-mono text-optic-gold">{item.range}</span>
                       </div>
                       {/* AI Reasoning */}
                       <div className="flex gap-3 mt-2 items-start opacity-60 group-hover:opacity-100 transition-opacity">
                           <div className="w-0.5 h-full min-h-[12px] bg-optic-accent/50 mt-1"></div>
                           <p className="text-xs text-gray-400 font-light leading-relaxed">{item.desc}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </BaseModal>
  );
};
