import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

interface AnalysisTransitionProps {
  onComplete: () => void;
}

export const AnalysisTransition = ({ onComplete }: AnalysisTransitionProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [statusText, setStatusText] = useState("ESTABLISHING NEURAL LINK");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    
    // Handle High DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // --- CONFIG ---
    const PARTICLE_COUNT = 1200;
    const CORE_SIZE = 80;
    
    // --- STATE ---
    let phase = 'ingest'; // ingest -> stabilize -> critical -> explode
    let frameId = 0;
    let shockwaves: Shockwave[] = [];

    // --- CLASSES ---

    class Shockwave {
        radius: number;
        width: number;
        opacity: number;
        speed: number;
        color: string;

        constructor() {
            this.radius = 10;
            this.width = 20;
            this.opacity = 1;
            this.speed = 15;
            this.color = `hsl(${180 + Math.random() * 60}, 100%, 50%)`; // Cyan to Blue
        }

        update() {
            this.radius += this.speed;
            this.speed *= 1.05; // Accelerate
            this.width *= 1.1;
            this.opacity -= 0.03;
        }

        draw(ctx: CanvasRenderingContext2D) {
            if (this.opacity <= 0) return;
            ctx.save();
            ctx.beginPath();
            ctx.arc(width/2, height/2, this.radius, 0, Math.PI * 2);
            ctx.lineWidth = this.width;
            ctx.strokeStyle = this.color.replace(')', `, ${this.opacity})`);
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.color;
            ctx.stroke();
            ctx.restore();
        }
    }

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      angle: number;
      speed: number;
      distance: number;
      type: 'data' | 'energy'; 

      constructor() {
        this.type = Math.random() > 0.8 ? 'data' : 'energy';
        this.angle = Math.random() * Math.PI * 2;
        this.distance = Math.max(width, height) * 0.8 + Math.random() * 300;
        this.x = width / 2 + Math.cos(this.angle) * this.distance;
        this.y = height / 2 + Math.sin(this.angle) * this.distance;
        this.speed = 2 + Math.random() * 5;
        this.size = this.type === 'data' ? Math.random() * 2 + 1 : Math.random() * 1.5;
        
        // Cyber Palette: Cyan, Electric Blue, White, faint Purple
        const hue = 180 + Math.random() * 60;
        this.color = `hsla(${hue}, 100%, 70%, ${0.5 + Math.random() * 0.5})`;
        this.vx = 0;
        this.vy = 0;
      }

      update(targetSpeedMultiplier: number) {
        const centerX = width / 2;
        const centerY = height / 2;

        if (phase === 'ingest') {
          // Swirling Inward
          this.distance -= this.speed * targetSpeedMultiplier;
          this.angle += (0.01 + (1000 / (this.distance + 100)) * 0.05); // Spin faster closer to center

          // Recycle
          if (this.distance < CORE_SIZE) {
             this.distance = Math.max(width, height) * 0.7;
             this.angle = Math.random() * Math.PI * 2;
          }

          this.x = centerX + Math.cos(this.angle) * this.distance;
          this.y = centerY + Math.sin(this.angle) * this.distance;

        } else if (phase === 'stabilize' || phase === 'critical') {
           // Orbital Mechanics
           const targetDist = CORE_SIZE + 20 + Math.random() * 100;
           this.distance += (targetDist - this.distance) * 0.05;
           this.angle += 0.05 * targetSpeedMultiplier;
           
           // Jitter for critical phase
           const jitter = phase === 'critical' ? (Math.random() - 0.5) * 5 : 0;
           
           this.x = centerX + Math.cos(this.angle) * this.distance + jitter;
           this.y = centerY + Math.sin(this.angle) * this.distance + jitter;

        } else if (phase === 'explode') {
           // High speed radial exit
           this.x += Math.cos(this.angle) * this.speed * 15;
           this.y += Math.sin(this.angle) * this.speed * 15;
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.color;
        
        if (this.type === 'data') {
            // Draw tiny squares for "data packets"
            ctx.fillRect(this.x, this.y, this.size, this.size);
        } else {
            // Draw circles for raw energy
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Trail Effect
        if (phase === 'ingest' || phase === 'explode') {
            ctx.beginPath();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.size * 0.5;
            ctx.moveTo(this.x, this.y);
            // Trail points backwards based on angle
            const trailLen = this.speed * (phase === 'explode' ? 4 : 2);
            ctx.lineTo(
                this.x - Math.cos(this.angle) * trailLen,
                this.y - Math.sin(this.angle) * trailLen
            );
            ctx.stroke();
        }
      }
    }

    // --- INIT ---
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
    
    // --- RENDER LOOP ---
    const animate = () => {
      // Clear with Fade for trails
      ctx.fillStyle = 'rgba(5, 5, 10, 0.25)'; 
      ctx.fillRect(0, 0, width, height);

      // Global Composite for glow
      ctx.globalCompositeOperation = 'lighter';

      const centerX = width / 2;
      const centerY = height / 2;

      // 1. Draw Particles
      let speedMult = 1;
      if (phase === 'stabilize') speedMult = 0.5;
      if (phase === 'critical') speedMult = 4;
      
      particles.forEach(p => {
        p.update(speedMult);
        p.draw(ctx);
      });

      // 2. Draw Core (Reactor)
      if (phase !== 'explode') {
          // Main Glow
          const gradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, CORE_SIZE * 1.5);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
          gradient.addColorStop(0.1, 'rgba(0, 200, 255, 0.8)');
          gradient.addColorStop(0.5, 'rgba(0, 100, 255, 0.2)');
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(centerX, centerY, CORE_SIZE, 0, Math.PI * 2);
          ctx.fill();

          // HUD Rings (Techy bits)
          ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
          ctx.lineWidth = 1;
          
          // Ring 1: Dashed rotating
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(frameId * 0.02);
          ctx.setLineDash([10, 20]);
          ctx.beginPath();
          ctx.arc(0, 0, CORE_SIZE + 20, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Ring 2: Counter rotating
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(-frameId * 0.03);
          ctx.setLineDash([2, 10]);
          ctx.beginPath();
          ctx.arc(0, 0, CORE_SIZE + 40, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          
          // Core instability shake
          if (phase === 'critical') {
             const shakeX = (Math.random() - 0.5) * 10;
             const shakeY = (Math.random() - 0.5) * 10;
             ctx.translate(shakeX, shakeY);
          }
      }

      // 3. Shockwaves (Explosion)
      shockwaves.forEach(sw => {
          sw.update();
          sw.draw(ctx);
      });

      // Clean up old shockwaves
      shockwaves = shockwaves.filter(sw => sw.opacity > 0);

      ctx.globalCompositeOperation = 'source-over';
      frameId++;
      
      requestAnimationFrame(animate);
    };

    animate();

    // --- TIMELINE SEQUENCE ---
    const runSequence = async () => {
        // 1. Ingest (0s - 2.0s)
        setStatusText("INGESTING RAW DATA");
        for (let i = 0; i <= 70; i++) {
            setProgress(i);
            await new Promise(r => setTimeout(r, 20));
        }

        // 2. Stabilize & Analyze (2.0s - 3.0s)
        phase = 'stabilize';
        setStatusText("ANALYZING TENSOR VECTORS");
        for (let i = 70; i <= 90; i++) {
            setProgress(i);
            await new Promise(r => setTimeout(r, 40));
        }

        // 3. Critical Mass (3.0s - 3.8s)
        phase = 'critical';
        setStatusText("ENERGY SURGE DETECTED");
        setProgress(100);
        await new Promise(r => setTimeout(r, 800));

        // 4. Explode
        phase = 'explode';
        // Spawn shockwaves
        for(let i=0; i<5; i++) {
            setTimeout(() => shockwaves.push(new Shockwave()), i * 100);
        }
        
        // Trigger completion after flash
        setTimeout(() => {
            onComplete();
        }, 600);
    };

    runSequence();

    const handleResize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden font-mono"
    >
        <canvas ref={canvasRef} className="absolute inset-0" />
        
        {/* Tech UI Overlay - Anchored to bottom center to avoid covering core */}
        <div className="absolute bottom-32 left-0 right-0 flex flex-col items-center gap-4 pointer-events-none">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={statusText}
                className="text-blue-400 text-xs tracking-[0.5em] font-bold bg-black/50 px-4 py-1 rounded border border-blue-500/30 backdrop-blur-md"
            >
                {statusText}
            </motion.div>
            
            {/* Progress Bar */}
            <div className="w-96 h-[2px] bg-white/10 relative overflow-hidden">
                <motion.div 
                    className="h-full bg-blue-500 shadow-[0_0_15px_#3b82f6]"
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "linear", duration: 0.2 }}
                />
            </div>
            
            <div className="flex justify-between w-96 text-[9px] text-blue-300/50 font-mono uppercase">
                <span>Sector 7G</span>
                <span>{progress.toFixed(0)}% COMPLETE</span>
            </div>
        </div>

        {/* Corner Decor */}
        <div className="absolute top-0 left-0 p-8 w-full flex justify-between text-[9px] text-white/20 font-mono pointer-events-none">
            <div className="space-y-1">
                <div className="flex gap-2 items-center">
                    <div className="w-2 h-2 bg-blue-500 animate-pulse"></div>
                    <span>SYS.DIAGNOSIS.RUNNING</span>
                </div>
                <div>MEM: 1024TB // VRAM: OPTIMIZED</div>
            </div>
            <div className="text-right space-y-1">
               <div>TENSORFLOW.JS :: ACTIVE</div>
               <div>LATENCY: &lt;1ms</div>
            </div>
        </div>
    </motion.div>
  );
};
