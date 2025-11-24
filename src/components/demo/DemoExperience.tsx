/**
 * 演示体验组件
 * 用于展示 3D 视觉效果的演示页面
 * 注意：这是一个演示组件，不是核心功能
 */
import React, { Suspense } from 'react';
import { OpticalCortexContainer } from './stage2/OpticalCortexContainer';

export const DemoExperience: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[50] bg-black text-white font-sans">
      <Suspense fallback={
        <div className="flex items-center justify-center w-full h-full bg-black text-white">
           <div className="text-xs font-mono tracking-widest opacity-50 animate-pulse">
              INITIALIZING OPTICAL CORTEX...
           </div>
        </div>
      }>
         <OpticalCortexContainer onClose={onClose} />
      </Suspense>
    </div>
  );
};
