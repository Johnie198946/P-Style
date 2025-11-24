import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

interface LoginTransitionProps {
  onComplete: () => void;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  size: number;
  life: number;
}

export const LoginTransition: React.FC<LoginTransitionProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animationFrameId = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize Explosion Particles
    const createExplosion = () => {
      const particleCount = 800;
      const colors = ['#38BDF8', '#FFFFFF', '#818CF8', '#00FFFF']; // Brand colors

      for (let i = 0; i < particleCount; i++) {
        // Random spherical direction
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        
        const speed = 15 + Math.random() * 30; // High speed for explosion
        
        particles.current.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          z: 0, // Start at screen plane
          vx: speed * Math.sin(phi) * Math.cos(theta),
          vy: speed * Math.sin(phi) * Math.sin(theta),
          vz: speed * Math.cos(phi),
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 3 + 1,
          life: 1.0
        });
      }
    };

    createExplosion();

    // Animation Loop
    const render = () => {
      // Clear with fade effect for trails (optional, but here we want clean 3D movement)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Heavy fade for motion blur trail effect
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Sort particles by Z for correct depth rendering
      particles.current.sort((a, b) => b.z - a.z);

      const fov = 300; // Field of view
      
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        
        // Update Position
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;
        
        // Friction / Slow down slightly
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.vz *= 0.96;

        // Life decay
        p.life -= 0.01;

        if (p.life <= 0) {
          particles.current.splice(i, 1);
          continue;
        }

        // 3D Projection
        const scale = fov / (fov + p.z);
        
        // Skip if particle is behind camera or too far
        if (scale < 0 || p.z < -fov) continue;

        const x2d = (p.x - canvas.width / 2) * scale + canvas.width / 2;
        const y2d = (p.y - canvas.height / 2) * scale + canvas.height / 2;
        const size = p.size * scale;

        // Draw Particle
        ctx.beginPath();
        ctx.arc(x2d, y2d, Math.max(0.1, size), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life; // Fade out
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      if (particles.current.length > 0) {
        animationFrameId.current = requestAnimationFrame(render);
      } else {
         // Animation essentially done
      }
    };

    render();

    // Timeout to finish transition
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId.current);
      clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/90 pointer-events-none flex items-center justify-center"
    >
      <canvas ref={canvasRef} className="absolute inset-0 mix-blend-screen" />
      
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1.5, opacity: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="absolute inset-0 bg-optic-accent/20 rounded-full blur-3xl"
      />
      
      <motion.h2
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1.2, opacity: 1, textShadow: "0 0 20px rgba(56,189,248,0.8)" }}
        exit={{ opacity: 0, scale: 2 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-4xl md:text-6xl font-display font-bold text-white tracking-tighter uppercase"
      >
        Access Granted
      </motion.h2>
    </motion.div>
  );
};
