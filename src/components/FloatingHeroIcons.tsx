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
  Crop,
  Film,
  Zap,
  Focus,
  Contrast,
  Circle,
  Square,
  Triangle,
  Star,
  Eye,
  Lightbulb,
  Minimize2,
  Maximize2,
  Grid,
  Sliders,
  type LucideIcon
} from 'lucide-react';

interface FloatingIcon {
  Icon: LucideIcon;
  position: { x: string; y: string };
  size: number;
  duration: number;
  delay: number;
  color: string;
  bgColor: string;
}

// 优化后的图标配置 - 减少15%（30个图标），更加分散均匀，避开中央文字区域
const floatingIcons: FloatingIcon[] = [
  // ===== 最左边缘（X: 1%-7%）- 更分散 =====
  { Icon: Camera, position: { x: '2%', y: '6%' }, size: 68, duration: 4.5, delay: 0, color: 'text-gray-900', bgColor: 'bg-white' },
  { Icon: Droplet, position: { x: '1.5%', y: '32%' }, size: 64, duration: 5.2, delay: 0.5, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { Icon: Sun, position: { x: '3%', y: '60%' }, size: 70, duration: 4.8, delay: 0.8, color: 'text-orange-500', bgColor: 'bg-orange-100' },
  { Icon: Layers, position: { x: '2%', y: '88%' }, size: 66, duration: 4.9, delay: 1.1, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  
  // ===== 左区域（X: 12%-18%）=====
  { Icon: Sparkles, position: { x: '13%', y: '3%' }, size: 56, duration: 5.3, delay: 0.9, color: 'text-violet-500', bgColor: 'bg-violet-100' },
  { Icon: Focus, position: { x: '17%', y: '24%' }, size: 66, duration: 5.1, delay: 0.3, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  { Icon: Sliders, position: { x: '14%', y: '68%' }, size: 64, duration: 5.0, delay: 0.9, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  { Icon: Wand2, position: { x: '16%', y: '94%' }, size: 60, duration: 5.2, delay: 1.3, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  
  // ===== 中左区域（X: 25%-30%）=====
  { Icon: Circle, position: { x: '27%', y: '2%' }, size: 62, duration: 5.4, delay: 0.7, color: 'text-blue-500', bgColor: 'bg-blue-100' },
  { Icon: Eye, position: { x: '29%', y: '18%' }, size: 58, duration: 4.8, delay: 1.1, color: 'text-lime-600', bgColor: 'bg-lime-100' },
  { Icon: Lightbulb, position: { x: '26%', y: '92%' }, size: 60, duration: 4.9, delay: 0.8, color: 'text-yellow-500', bgColor: 'bg-yellow-100' },
  
  // ===== 中央偏左（X: 36%-40%）- 只在上下区域 =====
  { Icon: Grid, position: { x: '38%', y: '5%' }, size: 60, duration: 4.9, delay: 1.4, color: 'text-teal-600', bgColor: 'bg-teal-100' },
  { Icon: Paintbrush, position: { x: '36%', y: '26%' }, size: 64, duration: 5.1, delay: 1.1, color: 'text-rose-600', bgColor: 'bg-rose-100' },
  { Icon: Crop, position: { x: '39%', y: '86%' }, size: 62, duration: 4.6, delay: 0.7, color: 'text-teal-600', bgColor: 'bg-teal-100' },
  
  // ===== 中央偏右（X: 60%-64%）- 只在上下区域 =====
  { Icon: Wand2, position: { x: '62%', y: '3%' }, size: 68, duration: 4.9, delay: 1.0, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  { Icon: Contrast, position: { x: '64%', y: '24%' }, size: 62, duration: 4.8, delay: 0.8, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  { Icon: Film, position: { x: '61%', y: '88%' }, size: 66, duration: 5.4, delay: 1.6, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  
  // ===== 中右区域（X: 70%-75%）=====
  { Icon: Star, position: { x: '72%', y: '8%' }, size: 64, duration: 5.1, delay: 0.5, color: 'text-purple-500', bgColor: 'bg-purple-100' },
  { Icon: Palette, position: { x: '74%', y: '20%' }, size: 66, duration: 5.0, delay: 1.3, color: 'text-rose-600', bgColor: 'bg-rose-100' },
  { Icon: Triangle, position: { x: '71%', y: '74%' }, size: 64, duration: 5.2, delay: 1.4, color: 'text-fuchsia-600', bgColor: 'bg-fuchsia-100' },
  { Icon: Circle, position: { x: '73%', y: '95%' }, size: 60, duration: 4.7, delay: 0.6, color: 'text-sky-500', bgColor: 'bg-sky-100' },
  
  // ===== 右区域（X: 82%-88%）=====
  { Icon: Eye, position: { x: '84%', y: '12%' }, size: 66, duration: 4.8, delay: 1.3, color: 'text-green-600', bgColor: 'bg-green-100' },
  { Icon: Lightbulb, position: { x: '87%', y: '36%' }, size: 60, duration: 4.9, delay: 0.8, color: 'text-yellow-500', bgColor: 'bg-yellow-100' },
  { Icon: Zap, position: { x: '85%', y: '63%' }, size: 66, duration: 5.2, delay: 1.2, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  { Icon: ImageIcon, position: { x: '83%', y: '84%' }, size: 70, duration: 5, delay: 1.5, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  
  // ===== 最右边缘（X: 93%-98.5%）- 更分散 =====
  { Icon: Palette, position: { x: '97%', y: '5%' }, size: 72, duration: 5.5, delay: 0.2, color: 'text-rose-600', bgColor: 'bg-rose-100' },
  { Icon: Aperture, position: { x: '96%', y: '28%' }, size: 68, duration: 4.3, delay: 0.9, color: 'text-gray-700', bgColor: 'bg-gray-100' },
  { Icon: Grid, position: { x: '98%', y: '54%' }, size: 64, duration: 4.8, delay: 0.5, color: 'text-teal-500', bgColor: 'bg-teal-100' },
  { Icon: Sparkles, position: { x: '97.5%', y: '78%' }, size: 64, duration: 4.7, delay: 0.4, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  { Icon: Minimize2, position: { x: '98.5%', y: '93%' }, size: 62, duration: 5.2, delay: 0.4, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
];

interface FloatingHeroIconsProps {
  children: React.ReactNode;
}

export function FloatingHeroIcons({ children }: FloatingHeroIconsProps) {
  return (
    <div className="relative min-h-[600px]">
      {/* 浮动图标层 */}
      <div className="absolute inset-0 overflow-visible pointer-events-none z-0">
        {floatingIcons.map((item, index) => {
          const { Icon, position, size, duration, delay, color, bgColor } = item;
          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                y: [0, -15, 0],
                x: [0, Math.sin(index) * 10, 0],
                rotate: [0, Math.cos(index) * 4, 0],
              }}
              transition={{
                opacity: { duration: 0.6, delay: delay * 0.3 },
                scale: { duration: 0.6, delay: delay * 0.3, type: 'spring' },
                y: {
                  duration: duration,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: delay,
                },
                x: {
                  duration: duration * 0.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: delay,
                },
                rotate: {
                  duration: duration * 1.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: delay,
                },
              }}
              className="absolute"
              style={{
                left: position.x,
                top: position.y,
                width: size,
                height: size,
              }}
            >
              <motion.div
                whileHover={{ scale: 1.15, rotate: 5 }}
                className={`w-full h-full ${bgColor} rounded-2xl shadow-lg border border-gray-200/50 flex items-center justify-center pointer-events-auto cursor-pointer transition-shadow hover:shadow-xl`}
              >
                <Icon className={`${color}`} style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={2} />
              </motion.div>
            </motion.div>
          );
        })}
      </div>
      
      {/* 内容区域 */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
