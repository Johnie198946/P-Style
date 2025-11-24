import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

interface SimulationTransitionProps {
  onComplete: () => void;
}

export const SimulationTransition: React.FC<SimulationTransitionProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000); // Total duration 2s

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Matrix Rain / Data Stream Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const columns = Math.floor(canvas.width / 20);
    const drops: number[] = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100; // Start above screen
    }

    const chars = "01XYZ∑π#";

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; // Fade effect
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0F0'; // Green text
      ctx.font = '15px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        // Color variation based on vertical position
        const y = drops[i] * 20;
        
        // Gradient color from Cyan to Purple
        const hue = (i / columns) * 60 + 180; 
        ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`;

        ctx.fillText(text, i * 20, y);

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      requestAnimationFrame(draw);
    };

    const animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden"
    >
        {/* Background Matrix Effect */}
        <canvas ref={canvasRef} className="absolute inset-0 opacity-30" />

        {/* Central Construct Animation */}
        <div className="relative z-10 flex flex-col items-center">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
            >
                <div className="w-24 h-24 border-2 border-optic-accent rounded-full flex items-center justify-center relative">
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, ease: "linear", repeat: Infinity }}
                        className="absolute inset-0 border-t-2 border-r-2 border-white rounded-full"
                    />
                     <motion.div 
                        animate={{ rotate: -360 }}
                        transition={{ duration: 3, ease: "linear", repeat: Infinity }}
                        className="absolute inset-2 border-b-2 border-l-2 border-purple-500 rounded-full"
                    />
                    <span className="font-mono text-2xl font-bold text-white">SIM</span>
                </div>
            </motion.div>

            <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-display font-bold text-white tracking-widest mb-2"
            >
                INITIALIZING SIMULATION
            </motion.h2>
            
            <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "200px" }}
                transition={{ delay: 0.5, duration: 1 }}
                className="h-1 bg-gradient-to-r from-transparent via-optic-accent to-transparent"
            />
            
            <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-4 font-mono text-xs text-optic-accent/70"
            >
                LOADING ASSETS...
            </motion.p>
        </div>

        {/* Scanning Line Overlay */}
        <motion.div 
            initial={{ top: "-10%" }}
            animate={{ top: "110%" }}
            transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
            className="absolute left-0 w-full h-20 bg-gradient-to-b from-transparent via-optic-accent/20 to-transparent pointer-events-none"
        />
    </motion.div>
  );
};
