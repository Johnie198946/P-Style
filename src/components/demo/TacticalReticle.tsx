import React, { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'motion/react';

export const TacticalReticle: React.FC = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isMoving, setIsMoving] = useState(false);
  
  // Smooth spring follow
  const springConfig = { damping: 25, stiffness: 200 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      setIsMoving(true);
      
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsMoving(false), 1000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        clearTimeout(timeout);
    }
  }, [mouseX, mouseY]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] mix-blend-screen">
        {/* Main Reticle */}
        <motion.div 
            style={{ x, y, translateX: '-50%', translateY: '-50%' }}
            className="absolute w-24 h-24 flex items-center justify-center"
        >
            {/* Outer Ring - Rotates when moving */}
            <motion.div 
                animate={{ rotate: isMoving ? 180 : 0, scale: isMoving ? 0.8 : 1 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 border border-optic-accent/30 rounded-full border-dashed"
            />
            
            {/* Inner Crosshair */}
            <div className="w-1 h-4 bg-optic-accent/50 absolute" />
            <div className="w-4 h-1 bg-optic-accent/50 absolute" />
            
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-optic-accent" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-optic-accent" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-optic-accent" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-optic-accent" />

            {/* Data Tag */}
            <motion.div 
                className="absolute top-full left-full ml-2 mt-2 text-[8px] font-mono text-optic-accent/80 whitespace-nowrap"
                animate={{ opacity: isMoving ? 1 : 0 }}
            >
                TRGT_LOCK: AQUIRED <br/>
                VECTOR: {Math.round(mouseX.get())}, {Math.round(mouseY.get())}
            </motion.div>
        </motion.div>
    </div>
  );
};
