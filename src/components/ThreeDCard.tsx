import React, { useRef, useState } from 'react';

export const ThreeDCard = ({ children, onClick, delay = 0 }: any) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate rotation (max 15 degrees)
    const rY = ((x / rect.width) - 0.5) * 15;
    const rX = ((y / rect.height) - 0.5) * -15;

    setRotation({ x: rX, y: rY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotation({ x: 0, y: 0 });
  };

  return (
    <div 
      className="perspective-1000 h-64 w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div 
        ref={cardRef}
        className={`
            relative w-full h-full transition-transform duration-100 ease-out transform-gpu
            bg-space-800/60 border border-white/5 rounded-xl overflow-hidden
            shadow-[0_0_15px_rgba(0,0,0,0.5)] group cursor-pointer
            hover:border-tech-cyan/50 hover:shadow-[0_0_30px_rgba(0,240,255,0.15)]
        `}
        style={{
          transform: isHovered 
            ? `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(1.02, 1.02, 1.02)`
            : 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          transition: isHovered ? 'none' : 'transform 0.5s ease-out'
        }}
      >
        {/* Glossy Reflection */}
        <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-20"
            style={{
                background: `linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.1) 45%, rgba(255, 255, 255, 0.0) 50%)`,
                transform: `translateX(${rotation.y * 2}%) translateY(${rotation.x * 2}%)`
            }}
        />
        
        {/* Content */}
        <div className="relative z-10 h-full">
            {children}
        </div>

      </div>
    </div>
  );
};
