import React, { useEffect, useRef, useState } from 'react';

interface WebcamBackgroundProps {
  isSimulation?: boolean;
  onSuccess?: () => void;
}

export const WebcamBackground = React.forwardRef<HTMLVideoElement, WebcamBackgroundProps>(({ isSimulation = false, onSuccess }, ref) => {
  const localRef = useRef<HTMLVideoElement>(null);
  const videoRef = (ref as React.RefObject<HTMLVideoElement>) || localRef;
  
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
      // We just handle the visual simulation state here based on if video is playing
      const video = videoRef.current;
      if (!video) return;
      
      const handlePlaying = () => {
          setIsPlaying(true);
          onSuccess?.();
      };
      
      video.addEventListener('playing', handlePlaying);
      return () => video.removeEventListener('playing', handlePlaying);
  }, [videoRef, onSuccess]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden -z-50 bg-black">
      {/* Grain Overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-20 pointer-events-none"></div>
      
      {/* Scanlines */}
      <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] z-20 pointer-events-none opacity-20"></div>
      
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] z-20 pointer-events-none opacity-60"></div>

      {isSimulation ? (
        <div className="w-full h-full relative overflow-hidden bg-[#050505]">
             {/* High-tech Simulation Grid */}
             <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(circle_at_center,black_40%,transparent_100%)]"></div>
             
             {/* Central Pulse */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-optic-accent/5 rounded-full blur-[80px] animate-pulse"></div>

             {/* Animated Data Lines */}
             <div className="absolute inset-0 opacity-30">
                 <div className="absolute top-[20%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-optic-accent to-transparent animate-scan-fast"></div>
                 <div className="absolute top-[60%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-optic-accent to-transparent animate-scan-slow"></div>
             </div>
             
             {/* Simulation Status */}
             <div className="absolute bottom-12 left-0 right-0 text-center">
                 <div className="inline-block px-4 py-1 border border-optic-accent/30 rounded bg-black/50 backdrop-blur-sm text-optic-accent font-mono text-xs tracking-widest animate-pulse">
                     SIMULATION_MODE // MANUAL_OVERRIDE
                 </div>
             </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-1000 ${isPlaying ? 'opacity-40' : 'opacity-0'} filter grayscale contrast-125 sepia-[0.3]`}
        />
      )}
    </div>
  );
});
