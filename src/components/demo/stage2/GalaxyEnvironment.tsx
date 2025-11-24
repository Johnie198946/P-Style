/**
 * 银河环境组件
 * 用于在 3D 场景中创建星空背景效果
 * 依赖：@react-three/drei, @react-three/fiber, three
 */
import React, { useRef } from 'react';
import { Stars, Sparkles, Cloud, Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const GalaxyEnvironment = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Slow rotation of the galaxy
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.02;
    }
  });

  return (
    <group>
      {/* Deep Background Color */}
      <color attach="background" args={['#020008']} />
      
      {/* Distant Stars */}
      <Stars radius={100} depth={50} count={7000} factor={4} saturation={0} fade speed={0.5} />
      
      {/* Galaxy/Nebula Simulation using Clouds/Particles */}
      <group ref={groupRef}>
         {/* Floating "Space Dust" */}
         <Sparkles count={500} scale={20} size={2} speed={0.4} opacity={0.5} color="#4C1D95" />
         <Sparkles count={300} scale={15} size={3} speed={0.2} opacity={0.3} color="#00F0FF" />
         
         {/* Simulated Nebula Glows (Billboards) */}
         <Cloud position={[-10, 2, -20]} opacity={0.1} speed={0.1} width={10} depth={1.5} segments={20} color="#4C1D95" />
         <Cloud position={[10, -5, -15]} opacity={0.1} speed={0.1} width={10} depth={1.5} segments={20} color="#2D5BFF" />
      </group>
      
      {/* Ambient Light for UI */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#fff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
    </group>
  );
};
