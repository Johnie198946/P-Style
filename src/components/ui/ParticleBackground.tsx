import React, { useEffect, useRef } from 'react';

export const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const PARTICLE_COUNT = 80; 
    const REPULSION_RADIUS = 250;
    const CONNECT_DISTANCE = 120;
    
    class Particle {
      x: number; y: number; originX: number; originY: number; vx: number; vy: number; size: number;
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.originX = this.x; this.originY = this.y;
        this.vx = 0; this.vy = 0;
        this.size = Math.random() * 2 + 0.5;
      }
      update() {
        const dx = mouseRef.current.x - this.x;
        const dy = mouseRef.current.y - this.y;
        const distSq = dx*dx + dy*dy;
        if(distSq < REPULSION_RADIUS * REPULSION_RADIUS) {
            const dist = Math.sqrt(distSq);
            const angle = Math.atan2(dy, dx);
            const force = (REPULSION_RADIUS - dist) / REPULSION_RADIUS;
            this.vx -= Math.cos(angle) * force * 1.5;
            this.vy -= Math.sin(angle) * force * 1.5;
        }
        this.vx += (this.originX - this.x) * 0.03;
        this.vy += (this.originY - this.y) * 0.03;
        this.vx *= 0.9; this.vy *= 0.9;
        this.x += this.vx; this.y += this.vy;
      }
      draw() {
        if (!ctx) return;
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.fill();
      }
    }

    const particles = Array.from({length: PARTICLE_COUNT}, () => new Particle());
    let animationFrameId: number;

    const draw = () => {
        if (!canvas || !ctx) return;
        ctx.clearRect(0,0,width,height);
        for(let i=0; i<particles.length; i++){
            particles[i].update(); 
            particles[i].draw();
        }
        ctx.lineWidth = 0.2;
        for(let i=0; i<particles.length; i++){
            const p1 = particles[i];
            for(let j=i+1; j<particles.length; j++){
                const p2 = particles[j];
                const dx = p1.x - p2.x; const dy = p1.y - p2.y;
                const distSq = dx*dx+dy*dy;
                if(distSq < CONNECT_DISTANCE * CONNECT_DISTANCE) {
                    const d = Math.sqrt(distSq);
                    ctx.strokeStyle = `rgba(255,255,255,${0.15 * (1 - d/CONNECT_DISTANCE)})`;
                    ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke();
                }
            }
        }
        animationFrameId = requestAnimationFrame(draw);
    };
    draw();

    const handleResize = () => { width = window.innerWidth; height = window.innerHeight; canvas.width = width; canvas.height = height; };
    const handleMouseMove = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => { 
      window.removeEventListener('resize', handleResize); 
      window.removeEventListener('mousemove', handleMouseMove); 
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1]" />;
};
