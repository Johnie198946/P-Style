import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface LanguageTransitionProps {
  from: 'en' | 'zh';
  to: 'en' | 'zh';
  onComplete: () => void;
}

export const LanguageTransition: React.FC<LanguageTransitionProps> = ({ from, to, onComplete }) => {
  const [text, setText] = useState("INITIALIZING LANGUAGE MODULE");
  
  useEffect(() => {
    const sequence = async () => {
      // Phase 1: Glitch Text
      const glitchTexts = [
        "SYSTEM REBOOT...",
        "LOADING LOCALE PACK...",
        "0x1F4C2 OVERWRITE...",
        "SYNCHRONIZING...",
        to === 'zh' ? "加载中文模块..." : "LOADING ENGLISH MODULE..."
      ];
      
      for (let i = 0; i < glitchTexts.length; i++) {
        setText(glitchTexts[i]);
        await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
      }
      
      // Complete
      setTimeout(onComplete, 500);
    };

    sequence();
  }, [to, onComplete]);

  // Matrix / Glitch strips
  const renderGlitches = () => {
    return Array.from({ length: 10 }).map((_, i) => (
      <motion.div
        key={i}
        initial={{ 
          x: Math.random() * window.innerWidth, 
          y: Math.random() * window.innerHeight,
          width: Math.random() * 300,
          height: 2,
          opacity: 0
        }}
        animate={{ 
          opacity: [0, 1, 0],
          x: Math.random() * window.innerWidth
        }}
        transition={{ 
          duration: 0.2, 
          repeat: Infinity, 
          repeatDelay: Math.random() * 0.5 
        }}
        className="absolute bg-optic-accent/50"
      />
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center overflow-hidden cursor-wait"
    >
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      {/* Glitch Elements */}
      {renderGlitches()}

      {/* Central Loader */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="relative w-64 h-2 bg-carbon-800 rounded-full overflow-hidden border border-white/20">
          <motion.div 
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="h-full bg-optic-accent shadow-[0_0_15px_rgba(56,189,248,0.8)]"
          />
        </div>

        <div className="font-mono text-optic-accent text-sm tracking-[0.2em] h-6">
          {text}
        </div>

        <div className="flex gap-8 text-4xl font-display font-bold text-white/20">
            <motion.span 
                animate={{ opacity: from === 'en' ? [1, 0.2] : 0.2, color: from === 'en' ? '#FFF' : '#333' }}
                className="uppercase"
            >
                {from === 'en' ? 'ENGLISH' : '中文'}
            </motion.span>
            <span className="text-optic-accent animate-pulse">→</span>
            <motion.span 
                 animate={{ opacity: [0.2, 1], color: ['#333', '#FFF'] }}
                 transition={{ delay: 1 }}
                 className="uppercase"
            >
                {to === 'en' ? 'ENGLISH' : '中文'}
            </motion.span>
        </div>
      </div>

      {/* Footer Tech Text */}
      <div className="absolute bottom-10 left-10 font-mono text-[10px] text-white/30 space-y-1">
        <p>MEM_ADDR: 0x7FF4C2</p>
        <p>LOCALE_SWAP: INIT</p>
        <p>RENDER: OK</p>
      </div>
    </motion.div>
  );
};
