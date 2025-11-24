/**
 * 空间窗口组件
 * 用于在 3D 场景中创建玻璃效果的窗口面板
 * 依赖：@react-three/drei, @react-spring/three, @react-three/fiber, three
 */
import React, { useState, useRef } from 'react';
import { Html, MeshTransmissionMaterial, RoundedBox, Text, useCursor } from '@react-three/drei';
import { useSpring, animated, config } from '@react-spring/three';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SpatialWindowProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  width?: number;
  height?: number;
  title?: string;
  children: React.ReactNode;
  delay?: number;
  active?: boolean; // If true, highlights the window
  onClick?: () => void;
}

export const SpatialWindow: React.FC<SpatialWindowProps> = ({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  width = 3,
  height = 4,
  title,
  children,
  delay = 0,
  active = false,
  onClick
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHover] = useState(false);
  useCursor(hovered); // Changes cursor to pointer on hover

  // Physics-based animation for entrance and hover state
  const { scaleAnim, positionAnim, rotationAnim, glowOpacity } = useSpring({
    scaleAnim: active ? 1.05 : (hovered ? 1.02 : 1),
    positionAnim: hovered ? [position[0], position[1] + 0.1, position[2] + 0.2] : position,
    rotationAnim: rotation, // We'll add dynamic tilt in useFrame instead of spring for smoother mouse follow
    glowOpacity: hovered || active ? 0.4 : 0,
    config: config.gentle
  });

  // Entrance Animation
  const { opacity } = useSpring({
    from: { opacity: 0 },
    to: { opacity: 1 },
    delay: delay,
    config: config.molasses
  });

  // Dynamic Tilt Logic
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Gentle floating
    const t = state.clock.getElapsedTime();
    groupRef.current.position.y = (positionAnim.get()[1] as number) + Math.sin(t * 0.5 + position[0]) * 0.05;
    
    // Mouse Look / Parallax
    if (hovered) {
       const mouseX = state.mouse.x * 0.2;
       const mouseY = state.mouse.y * 0.2;
       groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, rotation[0] - mouseY, 0.1);
       groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, rotation[1] + mouseX, 0.1);
    } else {
       // Return to base rotation
       groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, rotation[0], 0.05);
       groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, rotation[1], 0.05);
    }
  });

  return (
    <animated.group 
      ref={groupRef}
      position={positionAnim as any} 
      scale={scaleAnim}
      onClick={onClick}
    >
      {/* 1. The Glass Panel */}
      <group
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <RoundedBox args={[width, height, 0.1]} radius={0.15} smoothness={4}>
          <MeshTransmissionMaterial 
            backside
            samples={8} // Higher quality
            resolution={512}
            transmission={0.97}
            roughness={0.08}
            thickness={0.6}
            ior={1.5}
            chromaticAberration={0.06}
            anisotropy={0.1}
            distortion={0.2}
            distortionScale={0.3}
            temporalDistortion={0.1}
            color="#ffffff"
            background={new THREE.Color('#020008')}
          />
        </RoundedBox>
        
        {/* Glass Edge/Rim Light */}
        <RoundedBox args={[width + 0.02, height + 0.02, 0.08]} radius={0.15} smoothness={4}>
           <meshBasicMaterial color="#00F0FF" transparent opacity={hovered ? 0.2 : 0.05} side={THREE.BackSide} />
        </RoundedBox>

        {/* Background Glow for "Active/Hover" state */}
        <animated.mesh position={[0, 0, -0.2]} scale={[1.1, 1.1, 1]}>
           <planeGeometry args={[width, height]} />
           <meshBasicMaterial color="#00F0FF" transparent opacity={glowOpacity} blending={THREE.AdditiveBlending} />
        </animated.mesh>
      </group>

      {/* 2. Title Bar (Holo-projected) */}
      {title && (
        <group position={[0, height / 2 + 0.3, 0]}>
           <Text
              fontSize={0.12}
              color={hovered ? "#00F0FF" : "white"}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.005}
              outlineColor="#000000"
              font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
           >
              {title}
           </Text>
           {/* Decor line */}
           <mesh position={[0, -0.1, 0]}>
             <boxGeometry args={[0.5, 0.005, 0.01]} />
             <meshBasicMaterial color={hovered ? "#00F0FF" : "white"} transparent opacity={0.5} />
           </mesh>
        </group>
      )}

      {/* 3. HTML Content */}
      <Html 
        transform 
        position={[0, 0, 0.06]} // Slightly in front of glass
        style={{ 
          width: `${width * 100}px`, 
          height: `${height * 100}px`,
          pointerEvents: 'none' // Click events handled by parent group or specific interactive elements
        }}
        className="pointer-events-auto select-none"
      >
         <div className={`w-full h-full flex flex-col transition-opacity duration-500 ${hovered ? 'opacity-100' : 'opacity-90'}`}>
            {children}
         </div>
      </Html>

    </animated.group>
  );
};
