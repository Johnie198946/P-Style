import { motion } from 'motion/react';
import { 
  Camera, 
  Aperture, 
  Image as ImageIcon, 
  Palette, 
  Paintbrush, 
  Sparkles, 
  Wand2, 
  Droplet, 
  Sun, 
  Layers,
  Contrast,
  Sliders,
  Zap,
  Eye,
  Focus,
  Crop,
  Film,
  Grid3x3,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface IconConfig {
  Icon: any;
  position: { x: string; y: string };
  size: number;
  duration: number;
  delay: number;
  color: string;
  bgColor: string;
}

const iconConfigs: IconConfig[] = [
  // 左上区域
  { Icon: Camera, position: { x: '8%', y: '12%' }, size: 48, duration: 4.5, delay: 0, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { Icon: Aperture, position: { x: '15%', y: '25%' }, size: 42, duration: 5, delay: 0.2, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  { Icon: ImageIcon, position: { x: '6%', y: '40%' }, size: 38, duration: 4.8, delay: 0.5, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  { Icon: Palette, position: { x: '12%', y: '58%' }, size: 44, duration: 5.2, delay: 0.3, color: 'text-pink-600', bgColor: 'bg-pink-100' },
  { Icon: Paintbrush, position: { x: '8%', y: '75%' }, size: 40, duration: 4.6, delay: 0.7, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  
  // 右上区域
  { Icon: Wand2, position: { x: '92%', y: '28%' }, size: 40, duration: 5.1, delay: 0.4, color: 'text-green-600', bgColor: 'bg-green-100' },
  { Icon: Droplet, position: { x: '85%', y: '42%' }, size: 36, duration: 4.9, delay: 0.6, color: 'text-teal-600', bgColor: 'bg-teal-100' },
  { Icon: Sun, position: { x: '90%', y: '58%' }, size: 50, duration: 5.3, delay: 0.2, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  { Icon: Layers, position: { x: '87%', y: '72%' }, size: 42, duration: 4.8, delay: 0.8, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  
  // 顶部中间区域
  { Icon: Contrast, position: { x: '30%', y: '8%' }, size: 38, duration: 5, delay: 0.3, color: 'text-red-600', bgColor: 'bg-red-100' },
  { Icon: Sliders, position: { x: '45%', y: '6%' }, size: 44, duration: 4.6, delay: 0.5, color: 'text-violet-600', bgColor: 'bg-violet-100' },
  { Icon: Zap, position: { x: '60%', y: '9%' }, size: 40, duration: 5.2, delay: 0.1, color: 'text-lime-600', bgColor: 'bg-lime-100' },
  { Icon: Eye, position: { x: '72%', y: '12%' }, size: 46, duration: 4.7, delay: 0.4, color: 'text-sky-600', bgColor: 'bg-sky-100' },
  
  // 底部中间区域
  { Icon: Focus, position: { x: '25%', y: '88%' }, size: 42, duration: 5.1, delay: 0.2, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  { Icon: Crop, position: { x: '40%', y: '92%' }, size: 38, duration: 4.9, delay: 0.6, color: 'text-fuchsia-600', bgColor: 'bg-fuchsia-100' },
  { Icon: Film, position: { x: '55%', y: '90%' }, size: 44, duration: 5.3, delay: 0.3, color: 'text-rose-600', bgColor: 'bg-rose-100' },
  { Icon: Grid3x3, position: { x: '70%', y: '87%' }, size: 40, duration: 4.8, delay: 0.7, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  
  // 左侧中间
  { Icon: Maximize2, position: { x: '3%', y: '30%' }, size: 36, duration: 5, delay: 0.4, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { Icon: Minimize2, position: { x: '4%', y: '65%' }, size: 38, duration: 4.7, delay: 0.8, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  
  // 右侧中间
  { Icon: Maximize2, position: { x: '96%', y: '35%' }, size: 40, duration: 5.2, delay: 0.5, color: 'text-green-600', bgColor: 'bg-green-100' },
  { Icon: Minimize2, position: { x: '98.5%', y: '93%' }, size: 62, duration: 5.2, delay: 0.4, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
];

interface FloatingHeroIconsProps {
  children: React.ReactNode;
}

export function FloatingHeroIcons({ children }: FloatingHeroIconsProps) {
  return (
    <div className="relative min-h-[600px]">
      {/* 浮动图标层 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {iconConfigs.map((config, index) => {
          const { Icon, position, size, duration, delay, color, bgColor } = config;
          
          return (
            <motion.div
              key={index}
              className="absolute"
              style={{
                left: position.x,
                top: position.y,
                width: `${size}px`,
                height: `${size}px`,
              }}
              initial={{ opacity: 0, scale: 0, rotate: -180 }}
              animate={{ 
                opacity: [0, 0.6, 0.6, 0],
                scale: [0, 1, 1, 0.8],
                rotate: [0, 360],
                y: [0, -20, 20, 0],
              }}
              transition={{
                duration: duration,
                delay: delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <div className={`w-full h-full ${bgColor} rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-sm`}>
                <Icon className={`w-1/2 h-1/2 ${color}`} strokeWidth={1.5} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 内容层 */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}