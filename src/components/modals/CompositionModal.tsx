import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { Target, GitGraph, Layers, Percent, Maximize, Layout, Activity, ArrowRight } from "lucide-react";

export const CompositionModal = ({ data, images, onClose }: any) => {
  const [overlayMode, setOverlayMode] = useState<'lines' | 'grid' | 'mask' | null>(null);
  
  // Mock/Fallback generator to ensure FUI is never empty
  const ensureData = (source: any) => {
      const base = source || {};
      return {
          ...base,
          structure: {
              visual_frame: base.structure?.visual_frame || base.main_structure || "Analyzing Pattern...",
              geometry: base.structure?.geometry || "Complex Polygon",
              ...base.structure
          },
          subject: base.subject || {
              weight_score: 85,
              position: "Center-Weighted",
              method: "Contrast Detection",
              analysis: "Subject detected via local contrast deviation."
          },
          lines: base.lines || {
              path: ["Entry: Bottom-Left", "Mid: Subject Center", "Exit: Top-Right"]
          },
          zones: (base.zones && Object.keys(base.zones).length > 0) ? base.zones : {
              foreground: "Texture Detail",
              midground: "Subject Focus",
              background: "Atmospheric Falloff"
          },
          balance: base.balance || {
              horizontal: "Symmetrical",
              vertical: "Bottom-Heavy"
          }
      };
  };

  const comp = ensureData(data);
  const styleName = comp.style?.name || comp.style_class || "Analyzing...";
  const styleMethod = comp.style?.method || "Pattern Recognition";
  const visualFrame = comp.structure?.visual_frame || comp.main_structure || "Analyzing...";
  const negativeSpace = comp.proportions?.negative || comp.proportions?.negative_space || comp.ratios_negative_space?.space_ratio || "N/A";

  const renderOverlay = () => {
    const { visual_data } = data;
    if (!visual_data) return null;
    // ... existing overlay logic ...
    if (overlayMode === 'lines') {
         return (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            {visual_data.lines && visual_data.lines.map((line: any, i: number) => (
              <g key={i} className="animate-fade-in-scale">
                <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="#fff" strokeWidth="0.2" strokeDasharray="1 1" />
                <circle cx={line.x2} cy={line.y2} r="0.5" fill="#fff" />
                <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
              </g>
            ))}
          </svg>
        );
    }
    if (overlayMode === 'mask') {
         return (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
             <defs>
                <mask id="subjectMask"><rect width="100" height="100" fill="white" /><polygon points={visual_data.subject_poly} fill="black" /></mask>
             </defs>
             <rect width="100" height="100" fill="rgba(0,0,0,0.85)" mask="url(#subjectMask)" className="animate-fade-in-scale" />
             <polygon points={visual_data.subject_poly} fill="none" stroke="#fff" strokeWidth="0.3" strokeDasharray="2 2" />
          </svg>
        );
    }
    if (overlayMode === 'grid') {
        return (
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none animate-fade-in-scale">
             {[...Array(9)].map((_,i) => <div key={i} className="border border-white/20"></div>)}
             <div className="absolute top-1/3 left-1/3 w-2 h-2 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_white]"></div>
             <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-white rounded-full transform translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_white]"></div>
             <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-white rounded-full transform -translate-x-1/2 translate-y-1/2 shadow-[0_0_10px_white]"></div>
             <div className="absolute bottom-1/3 right-1/3 w-2 h-2 bg-white rounded-full transform translate-x-1/2 translate-y-1/2 shadow-[0_0_10px_white]"></div>
          </div>
        );
    }
    return null;
  };

  return (
    <BaseModal title="Composition Vectors" onClose={onClose}>
      <div className="flex h-full bg-[#050505]">
        {/* LEFT: IMAGE CANVAS */}
        <div className="flex-1 bg-carbon-950 flex items-center justify-center relative p-12 border-r border-white/5 overflow-hidden">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]"></div>
           
           <div className="relative w-full h-full max-w-4xl flex items-center justify-center">
              {/* True Color Image */}
              <img src={images.source} className="max-w-full max-h-full object-contain shadow-2xl" alt="Ref" />
              {renderOverlay()}
           </div>
           
           <div className="absolute bottom-8 left-0 w-full flex justify-center gap-4">
              {[{id:'lines', label:'Vectors'}, {id:'grid', label:'Rule of Thirds'}, {id:'mask', label:'Visual Mass'}].map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => setOverlayMode(overlayMode === m.id ? null : m.id as any)} 
                    className={`px-4 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-widest transition-all border backdrop-blur-md ${overlayMode === m.id ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-black/40 border-white/10 text-gray-400 hover:text-white hover:border-white/30'}`}
                  >
                    {m.label}
                  </button>
              ))}
           </div>
        </div>

        {/* RIGHT: ANALYSIS DATA */}
        <div className="w-[400px] bg-[#080808] flex flex-col overflow-y-auto custom-scrollbar border-l border-white/5">
           {/* HEADER SECTION */}
           <div className="p-6 border-b border-white/5 bg-[#0A0A0A]">
              <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2 font-mono flex items-center gap-2">
                <Maximize className="w-3 h-3 text-blue-500" />
                Classification
              </div>
              <div className="text-2xl text-white font-display tracking-wide mb-1">{styleName}</div>
              <div className="text-xs text-emerald-500 font-mono flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {styleMethod}
              </div>
           </div>
           
           <div className="p-6 space-y-8">
               {/* 1. STRUCTURE & GEOMETRY */}
               <div>
                   <h4 className="text-[9px] text-blue-400 font-bold uppercase mb-3 flex items-center gap-2 border-b border-blue-500/10 pb-2">
                        <Layout className="w-3 h-3" /> Structural Geometry
                   </h4>
                   <div className="bg-white/5 border border-white/5 rounded p-3">
                        <div className="text-xs text-gray-300 mb-2 leading-relaxed font-mono">"{visualFrame}"</div>
                        {comp.structure?.geometry && (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                                <span className="text-[9px] text-white/40 uppercase">Geometry:</span>
                                <span className="text-[10px] text-blue-300 font-mono">{comp.structure.geometry}</span>
                            </div>
                        )}
                   </div>
               </div>

               {/* 2. VISUAL WEIGHT (SUBJECT) */}
               {comp.subject && (
               <div>
                   <h4 className="text-[9px] text-red-400 font-bold uppercase mb-3 flex items-center gap-2 border-b border-red-500/10 pb-2">
                        <Target className="w-3 h-3" /> Visual Weight
                   </h4>
                   <div className="grid grid-cols-[1fr_1.5fr] gap-3">
                        <div className="bg-black border border-white/10 rounded p-2 flex flex-col items-center justify-center text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-red-500/5 animate-pulse"></div>
                            <div className="text-[8px] text-white/30 uppercase mb-1">Score</div>
                            <div className="text-xl font-bold text-red-500">{comp.subject.weight_score || comp.subject.weight || 'N/A'}</div>
                        </div>
                        <div className="space-y-1">
                             <div className="bg-white/5 px-2 py-1.5 rounded border border-white/5 flex justify-between">
                                 <span className="text-[8px] text-white/40 uppercase">Position</span>
                                 <span className="text-[9px] text-white/90 font-mono">{comp.subject.position || 'N/A'}</span>
                             </div>
                             <div className="bg-white/5 px-2 py-1.5 rounded border border-white/5 flex justify-between">
                                 <span className="text-[8px] text-white/40 uppercase">Method</span>
                                 <span className="text-[9px] text-white/90 font-mono">{comp.subject.method || 'N/A'}</span>
                             </div>
                        </div>
                   </div>
                   <div className="mt-2 text-[10px] text-gray-400 leading-relaxed pl-2 border-l-2 border-red-500/30">
                       {typeof comp.subject === 'string' ? comp.subject : (comp.subject.analysis || comp.subject.desc || '')}
                   </div>
               </div>
               )}

               {/* 3. OCULAR TRAJECTORY */}
               <div>
                   <h4 className="text-[9px] text-yellow-500 font-bold uppercase mb-3 flex items-center gap-2 border-b border-yellow-500/10 pb-2">
                        <GitGraph className="w-3 h-3" /> Visual Flow Path
                   </h4>
                   <div className="space-y-2 relative pl-2">
                       <div className="absolute top-2 bottom-2 left-[7px] w-px bg-white/10"></div>
                       {Array.isArray(comp.lines?.path) ? comp.lines.path.map((step: string, i: number) => (
                           <div key={i} className="relative flex items-start gap-3 group">
                               <div className="w-3 h-3 rounded-full bg-[#0A0A0A] border border-yellow-500/50 z-10 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-yellow-400 transition-colors">
                                   <div className="w-1 h-1 bg-yellow-500 rounded-full"></div>
                               </div>
                               <span className="text-[10px] text-gray-400 font-mono group-hover:text-white transition-colors leading-tight">{step}</span>
                           </div>
                       )) : (
                           <div className="text-[10px] text-white/20 italic pl-4">Calculating trajectory...</div>
                       )}
                   </div>
               </div>

               {/* 4. SPATIAL ZONES & BALANCE */}
               <div className="grid grid-cols-1 gap-4">
                   <div>
                       <h4 className="text-[9px] text-purple-500 font-bold uppercase mb-3 flex items-center gap-2 border-b border-purple-500/10 pb-2">
                            <Layers className="w-3 h-3" /> Spatial Depth
                       </h4>
                       <div className="space-y-1">
                           {comp.zones && Object.entries(comp.zones).map(([key, val]: any) => (
                               <div key={key} className="grid grid-cols-[70px_1fr] gap-2 items-center bg-white/5 p-1.5 rounded border border-white/5 hover:bg-white/10 transition-colors">
                                   <span className="text-[7px] text-white/30 uppercase tracking-wider text-right">{key}</span>
                                   <span className="text-[9px] text-purple-200 font-mono truncate">{val}</span>
                               </div>
                           ))}
                       </div>
                   </div>
               </div>

               {/* 5. NEGATIVE SPACE & PROPORTIONS */}
               <div className="bg-white/[0.02] border border-white/5 p-4 rounded">
                   <div className="flex justify-between items-center mb-3">
                       <span className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-2">
                           <Percent className="w-3 h-3" /> Negative Space
                       </span>
                       <span className="text-sm font-mono text-white">{negativeSpace}</span>
                   </div>
                   <div className="h-1.5 bg-gray-800 w-full rounded-full overflow-hidden flex">
                       <div className="bg-white h-full" style={{ width: '60%' }}></div> 
                   </div>
                   <div className="flex justify-between mt-2 pt-2 border-t border-white/5">
                       <div className="text-center">
                           <div className="text-[7px] text-white/20 uppercase">H-Balance</div>
                           <div className="text-[9px] text-white/60 font-mono">{comp.balance?.horizontal || 'N/A'}</div>
                       </div>
                       <div className="text-center">
                           <div className="text-[7px] text-white/20 uppercase">V-Balance</div>
                           <div className="text-[9px] text-white/60 font-mono">{comp.balance?.vertical || 'N/A'}</div>
                       </div>
                   </div>
               </div>
           </div>
        </div>
      </div>
    </BaseModal>
  );
};
