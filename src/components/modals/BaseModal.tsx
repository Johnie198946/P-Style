import React, { useEffect } from 'react';

interface Props {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
  width?: string;
}

export const BaseModal: React.FC<Props> = ({ children, title, onClose, width = "max-w-7xl" }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if(e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    // Modified: top-20 to leave the header visible (80px header height)
    <div className="fixed inset-x-0 top-20 bottom-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className={`
            w-full ${width} h-full max-h-[98%] flex flex-col 
            animate-fade-in-scale transform-gpu
            relative overflow-hidden
            shadow-[0_0_100px_rgba(0,122,255,0.1)]
            border border-white/10 bg-[#050505]/95
        `}
        style={{
           backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .02) 25%, rgba(255, 255, 255, .02) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .02) 75%, rgba(255, 255, 255, .02) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .02) 25%, rgba(255, 255, 255, .02) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .02) 75%, rgba(255, 255, 255, .02) 76%, transparent 77%, transparent)',
           backgroundSize: '50px 50px'
        }}
      >
        {/* Holographic Glint */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/40 to-transparent animate-scan-line opacity-20"></div>

        {/* Industrial Header - z-index ensures it stays on top of content */}
        <div className="h-14 flex justify-between items-center px-6 select-none border-b border-white/10 bg-black/60 relative z-50 flex-shrink-0">
          <div className="flex items-center gap-6">
             {/* Status Light */}
             <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-optic-accent rounded-full animate-pulse-fast shadow-[0_0_8px_rgba(0,122,255,0.8)]"></div>
                 <div className="text-[9px] text-optic-accent font-mono tracking-[0.2em]">ONLINE</div>
             </div>

             <div className="h-4 w-px bg-white/10"></div>

             <div className="flex items-center gap-3">
                 <span className="text-xs font-mono text-optic-silver/50 uppercase tracking-[0.1em]">MOD.01</span>
                 <span className="text-sm font-display font-bold text-white tracking-wide uppercase">{title}</span>
             </div>
          </div>
          
          {/* Precision Close Button */}
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center border border-white/10 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-500 transition-all duration-300 group relative overflow-hidden"
          >
            <span className="absolute inset-0 bg-red-500/10 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></span>
            <svg className="w-4 h-4 text-gray-400 group-hover:text-red-500 relative z-10 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative bg-transparent z-0">
            {children}
        </div>

        {/* Tactical Corners */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-optic-accent/50 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-optic-accent/50 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-optic-accent/50 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-optic-accent/50 pointer-events-none"></div>

      </div>
    </div>
  );
};
