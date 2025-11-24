/**
 * 光学皮层容器组件
 * 用于展示 3D 视觉效果的演示组件
 * 
 * 依赖说明：
 * - @react-three/fiber: React Three.js 渲染器
 * - @react-three/drei: Three.js 辅助组件库
 * - @react-spring/three: Three.js 动画库
 * - three: Three.js 核心库
 */
import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float, Text, useCursor, MeshTransmissionMaterial, Image, Html, Sphere, Environment, RoundedBox } from '@react-three/drei';
import { useSpring, animated, config } from '@react-spring/three';
import * as THREE from 'three';

// IMPORTED ASSETS
import imgReference from 'figma:asset/68313abe5754991533fc3928582a330c901011ff.png';
import imgUserRaw from 'figma:asset/b1a4e0bc3cae8d9830d0fa8f47636221ea18acba.png';

// -----------------------------------------------------------------------------
// THEME & MATERIALS
// -----------------------------------------------------------------------------
const GLASS_OPTS = {
  transmission: 1,
  thickness: 0.05,
  roughness: 0.05,
  ior: 1.5,
  chromaticAberration: 0.04,
  anisotropy: 0.1,
  distortion: 0.1,
  distortionScale: 0.3,
  temporalDistortion: 0.1,
  clearcoat: 1,
  attenuationDistance: 0.5,
  attenuationColor: '#ffffff',
  color: '#f5f5f5',
  bg: '#ffffff'
};

// -----------------------------------------------------------------------------
// VISION OS COMPONENTS
// -----------------------------------------------------------------------------

const GazeCursor = () => {
  const ref = useRef<THREE.Mesh>(null);
  const { mouse, viewport } = useThree();
  
  useFrame(() => {
    if (ref.current) {
      const x = (mouse.x * viewport.width) / 2;
      const y = (mouse.y * viewport.height) / 2;
      ref.current.position.lerp(new THREE.Vector3(x, y, 5), 0.2);
    }
  });

  return (
    <mesh ref={ref} renderOrder={2000}>
      <circleGeometry args={[0.08, 32]} />
      <meshBasicMaterial color="white" transparent opacity={0.4} depthTest={false} />
    </mesh>
  );
};

const GlassPanel = ({ 
  position, 
  rotation = [0, 0, 0], 
  width, 
  height, 
  children,
  title 
}: any) => {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHover] = useState(false);
  useCursor(hovered);

  // Subtle "breathing" or "floating" animation for the panel
  useFrame((state) => {
    if(group.current) {
       group.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    }
  });

  return (
    <group ref={group} position={position} rotation={rotation}>
      {/* Glass Slab */}
      <group onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
        <RoundedBox args={[width, height, 0.04]} radius={0.1} smoothness={4}>
           <MeshTransmissionMaterial {...GLASS_OPTS} />
        </RoundedBox>
        
        {/* Grab Handle (Bottom) */}
        <mesh position={[0, -height/2 - 0.15, 0]}>
           <capsuleGeometry args={[0.02, width - 1, 4, 8]} />
           <meshStandardMaterial color="white" transparent opacity={0.4} roughness={0.2} />
           <mesh rotation={[0,0,Math.PI/2]}>
              <capsuleGeometry args={[0.02, width - 1, 4, 8]} />
              <meshStandardMaterial color="white" transparent opacity={0.4} />
           </mesh>
        </mesh>
      </group>

      {/* Content */}
      <Html transform position={[0, 0, 0.03]} style={{ width: `${width * 100}px`, height: `${height * 100}px`, pointerEvents: 'none' }} scale={1}>
         <div className="w-full h-full flex flex-col p-6 pointer-events-auto select-none text-white">
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                 <div className="text-xs font-medium text-white/60 tracking-widest uppercase">{title}</div>
                 <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                 </div>
              </div>
            )}
            {/* Body */}
            <div className="flex-1 relative overflow-hidden">
               {children}
            </div>
         </div>
      </Html>
    </group>
  );
};

const ImageCard = ({ src, label, active, onClick, subtitle }: any) => (
  <div 
    onClick={onClick}
    className={`
       relative aspect-video rounded-lg overflow-hidden cursor-pointer transition-all duration-500 group
       ${active ? 'ring-2 ring-[#007AFF] scale-[1.02] shadow-[0_0_30px_rgba(0,122,255,0.3)]' : 'hover:scale-[1.02] opacity-70 hover:opacity-100'}
    `}
  >
     <img src={src} className="w-full h-full object-cover" />
     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
     <div className="absolute bottom-3 left-3">
        <div className="text-sm font-medium text-white">{label}</div>
        {subtitle && <div className="text-[10px] text-white/60 font-mono mt-0.5">{subtitle}</div>}
     </div>
     {active && (
       <div className="absolute top-3 right-3 w-4 h-4 bg-[#007AFF] rounded-full flex items-center justify-center text-[10px]">✓</div>
     )}
  </div>
);

// -----------------------------------------------------------------------------
// MAIN APP
// -----------------------------------------------------------------------------

/**
 * 光学皮层容器组件
 * 用于展示 3D 视觉效果的演示组件
 * @param onClose - 关闭回调函数（可选）
 */
export const OpticalCortexContainer: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [step, setStep] = useState(0); // 0: Ref, 1: Raw, 2: Process, 3: Result
  const [selectedRef, setRef] = useState<string | null>(null);
  const [selectedRaw, setRaw] = useState<string | null>(null);
  
  // Reset Flow
  const reset = () => {
    setStep(0);
    setRef(null);
    setRaw(null);
  };

  return (
    <div className="w-full h-full bg-black relative cursor-none">
      <Canvas shadows gl={{ antialias: true }} dpr={[1, 2]}>
        {/* Wide FOV Camera for Spaciousness */}
        <PerspectiveCamera makeDefault position={[0, 0, 8.5]} fov={45} />
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI/1.8} rotateSpeed={0.1} />
        <Environment preset="city" background blur={0.6} />
        
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 10, 5]} intensity={1} castShadow />

        <GazeCursor />

        {/* --- LAYOUT: LEFT PANEL (STYLES) --- */}
        <GlassPanel 
          position={[-4.8, 0, -0.5]} 
          rotation={[0, 0.2, 0]} 
          width={3.5} 
          height={4.5} 
          title="Aesthetic Library"
        >
           <div className="flex flex-col gap-4">
              <ImageCard 
                 src={imgReference} 
                 label="Cyberpunk 2077" 
                 subtitle="NEON / HIGH CONTRAST"
                 active={selectedRef === imgReference}
                 onClick={() => { setRef(imgReference); if(step===0) setStep(1); }}
              />
              <ImageCard 
                 src="https://images.unsplash.com/photo-1493863641943-9b68992a8d07?auto=format&fit=crop&w=500" 
                 label="Kodak Portra 400" 
                 subtitle="ANALOG / WARM"
                 active={selectedRef === 'analog'}
                 onClick={() => { setRef('analog'); if(step===0) setStep(1); }}
              />
              <ImageCard 
                 src="https://images.unsplash.com/photo-1515462277126-2dd0c162007a?auto=format&fit=crop&w=500" 
                 label="Nordic Minimal" 
                 subtitle="DESATURATED / COOL"
                 active={selectedRef === 'nordic'}
                 onClick={() => { setRef('nordic'); if(step===0) setStep(1); }}
              />
           </div>
        </GlassPanel>

        {/* --- LAYOUT: CENTER PANEL (MAIN STAGE) --- */}
        <GlassPanel 
          position={[0, 0, 0.5]} 
          width={4.5} 
          height={5} 
          title="Quantum Darkroom"
        >
           <div className="h-full flex flex-col items-center justify-center text-center">
              {/* IDLE STATE */}
              {!selectedRef && (
                <div className="text-white/30 text-lg font-light tracking-wide animate-pulse">
                  Select a Style Reference to begin
                </div>
              )}

              {/* WAITING FOR RAW */}
              {selectedRef && !selectedRaw && (
                <div className="w-full h-64 rounded-lg border border-dashed border-white/20 flex items-center justify-center bg-white/5">
                   <div className="text-white/50 text-sm font-mono">WAITING FOR SOURCE MEDIA...</div>
                </div>
              )}

              {/* READY TO PROCESS */}
              {selectedRef && selectedRaw && step < 3 && (
                <div className="w-full h-full flex flex-col items-center p-4 gap-6">
                   <div className="relative w-full flex-1 rounded-lg overflow-hidden bg-black/40 border border-white/10">
                      <img src={selectedRaw} className={`w-full h-full object-cover transition-all duration-1000 ${step === 2 ? 'blur-md scale-110 opacity-50' : ''}`} />
                      
                      {/* Processing Overlay */}
                      {step === 2 && (
                         <div className="absolute inset-0 flex items-center justify-center flex-col gap-3">
                            <div className="w-12 h-12 border-4 border-white/20 border-t-[#007AFF] rounded-full animate-spin" />
                            <div className="text-xs font-mono text-[#007AFF] tracking-widest">COMPUTING NEURAL FIELD...</div>
                         </div>
                      )}
                   </div>

                   {step !== 2 && (
                     <button 
                       onClick={() => {
                          setStep(2);
                          setTimeout(() => setStep(3), 2500); // Mock process time
                       }}
                       className="w-full py-4 bg-white hover:bg-gray-100 text-black rounded-lg font-medium tracking-wide shadow-lg hover:scale-[1.02] transition-all"
                     >
                       INITIATE SIMULATION
                     </button>
                   )}
                </div>
              )}

              {/* RESULT */}
              {step === 3 && (
                <div className="w-full h-full relative group">
                   <img src={selectedRaw!} className="w-full h-full object-cover rounded-lg" style={{ filter: 'contrast(1.2) saturate(1.3) hue-rotate(-5deg)' }} />
                   <div className="absolute inset-0 rounded-lg ring-1 ring-white/10 pointer-events-none" />
                   <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button className="px-6 py-2 bg-black/60 backdrop-blur text-white text-xs rounded-full hover:bg-black/80">ADJUST</button>
                      <button className="px-6 py-2 bg-white/90 text-black text-xs rounded-full hover:bg-white">EXPORT</button>
                   </div>
                </div>
              )}
           </div>
        </GlassPanel>

        {/* --- LAYOUT: RIGHT PANEL (RAW ASSETS) --- */}
        <GlassPanel 
          position={[4.8, 0, -0.5]} 
          rotation={[0, -0.2, 0]} 
          width={3.5} 
          height={4.5} 
          title="Source Media"
        >
           <div className="flex flex-col gap-4">
              <ImageCard 
                 src={imgUserRaw} 
                 label="Tokyo_Street_Night.arw" 
                 subtitle="SONY A7III / 35MM"
                 active={selectedRaw === imgUserRaw}
                 onClick={() => { if(selectedRef) { setRaw(imgUserRaw); setStep(1); } }}
              />
              <ImageCard 
                 src="https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?auto=format&fit=crop&w=500" 
                 label="Model_Portrait_002.cr3" 
                 subtitle="CANON R5 / 85MM"
                 active={selectedRaw === 'portrait'}
                 onClick={() => { if(selectedRef) { setRaw('portrait'); setStep(1); } }}
              />
           </div>
        </GlassPanel>

        {/* VISION OS DOCK (Minimalist) */}
        <group position={[0, -3.8, 1]}>
           <Float floatIntensity={0.2} speed={2}>
              <mesh onClick={reset} onPointerOver={() => document.body.style.cursor='pointer'} onPointerOut={() => document.body.style.cursor='none'}>
                 <capsuleGeometry args={[0.15, 1.5, 4, 16]} />
                 <meshBasicMaterial color="black" transparent opacity={0.2} />
                 <mesh rotation={[0,0,Math.PI/2]}>
                   <capsuleGeometry args={[0.15, 1.5, 4, 16]} />
                   <MeshTransmissionMaterial {...GLASS_OPTS} thickness={0.1} color="white" />
                 </mesh>
              </mesh>
              {/* Home Indicator */}
              <mesh position={[0, 0, 0.16]}>
                 <capsuleGeometry args={[0.02, 0.5, 4, 8]} rotation={[0,0,Math.PI/2]} />
                 <meshBasicMaterial color="white" transparent opacity={0.8} />
              </mesh>
           </Float>
        </group>

      </Canvas>
    </div>
  );
};
