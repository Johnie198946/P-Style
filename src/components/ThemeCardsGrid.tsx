import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import {
  Camera,
  Sun,
  Palette,
  Sliders,
  Image as ImageIcon,
  Sparkles,
  ChevronRight,
  Wand2,
  ArrowRight,
  ChevronLeft,
} from 'lucide-react';
import { ThemeDetailModal } from './ThemeDetailModal';
import { StyleSimulation } from './StyleSimulation';
import { LoadingTransition } from './LoadingTransition';
import { UserMenu } from './UserMenu';

interface ThemeCardsGridProps {
  results: any;
  sourceImageUrl: string;
  targetImageUrl: string;
  onBack: () => void;
}

interface ThemeCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const themeCards: ThemeCard[] = [
  {
    id: 'review',
    title: '照片点评',
    subtitle: '整体分析与专业评价',
    description: '获取全面的照片质量评估',
    icon: <Sparkles className="w-8 h-8" />,
    color: 'text-amber-600',
    bgColor: 'bg-gradient-to-br from-amber-50/80 to-orange-50/50',
  },
  {
    id: 'composition',
    title: '构图分析',
    subtitle: '焦点布局与视觉引导',
    description: '了解照片的构图技巧',
    icon: <Camera className="w-8 h-8" />,
    color: 'text-blue-600',
    bgColor: 'bg-gradient-to-br from-blue-50/80 to-cyan-50/50',
  },
  {
    id: 'lighting',
    title: '光影参数',
    subtitle: '曝光对比与明暗层次',
    description: '掌握光影的运用方法',
    icon: <Sun className="w-8 h-8" />,
    color: 'text-orange-600',
    bgColor: 'bg-gradient-to-br from-orange-50/80 to-yellow-50/50',
  },
  {
    id: 'color',
    title: '色彩方案',
    subtitle: '色调饱和与色彩搭配',
    description: '深入理解色彩处理',
    icon: <Palette className="w-8 h-8" />,
    color: 'text-purple-600',
    bgColor: 'bg-gradient-to-br from-purple-50/80 to-pink-50/50',
  },
  {
    id: 'lightroom',
    title: 'Lightroom',
    subtitle: 'Adobe LR 专业调整方案',
    description: '完整的 Lightroom 参数',
    icon: <Sliders className="w-8 h-8" />,
    color: 'text-cyan-600',
    bgColor: 'bg-gradient-to-br from-cyan-50/80 to-teal-50/50',
  },
  {
    id: 'photoshop',
    title: 'Photoshop',
    subtitle: 'Adobe PS 后期处理方案',
    description: '精细的 Photoshop 步骤',
    icon: <ImageIcon className="w-8 h-8" />,
    color: 'text-indigo-600',
    bgColor: 'bg-gradient-to-br from-indigo-50/80 to-blue-50/50',
  },
];

export function ThemeCardsGrid({ results, sourceImageUrl, targetImageUrl, onBack }: ThemeCardsGridProps) {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showStyleSimulation, setShowStyleSimulation] = useState(false);
  
  // Two-stage loading state
  const [showStage, setShowStage] = useState<'stage1' | 'loading' | 'stage2'>('stage1');
  
  // Horizontal scroll navigation
  const [activeNavIndex, setActiveNavIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const handleCardClick = (themeId: string) => {
    setSelectedTheme(themeId);
  };

  const handleViewDetailedPlan = async () => {
    setShowStage('loading');
    // Simulate loading
    await new Promise(resolve => setTimeout(resolve, 2500));
    setShowStage('stage2');
  };

  // Stage 1: First 3 cards (review, composition, lighting)
  const stage1Cards = themeCards.slice(0, 3);
  // Stage 2: All 6 cards
  const stage2Cards = themeCards;

  const displayCards = showStage === 'stage1' ? stage1Cards : stage2Cards;

  // Check scroll position
  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener('resize', checkScrollButtons);
    return () => window.removeEventListener('resize', checkScrollButtons);
  }, [displayCards]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount);
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  const scrollToCard = (index: number) => {
    if (scrollContainerRef.current) {
      const cardWidth = 200;
      const gap = 12;
      const scrollPosition = index * (cardWidth + gap);
      scrollContainerRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
      setActiveNavIndex(index);
    }
  };

  return (
    <>
      {/* Loading Transition */}
      <AnimatePresence>
        {showStage === 'loading' && (
          <LoadingTransition 
            onComplete={() => setShowStage('stage2')}
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-[#f5f5f7]">
        {/* Back Button - Top Left */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed top-6 left-6 z-50"
        >
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md rounded-full border border-gray-200/60 shadow-sm hover:shadow-md hover:bg-white transition-all text-gray-700 hover:text-gray-900"
            style={{ fontSize: '14px', fontWeight: 500 }}
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
        </motion.div>

        {/* User Menu - Top Right */}
        <div className="fixed top-6 right-6 z-50">
          <UserMenu onNavigate={(page) => {
            // 处理导航
            console.log('Navigate to:', page);
          }} />
        </div>

        {/* Top Right Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed top-6 right-24 z-50 flex items-center gap-3"
        >
          {/* Show Style Simulation button only in Stage 2 */}
          {showStage === 'stage2' && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              onClick={() => setShowStyleSimulation(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all group"
              style={{ fontSize: '14px', fontWeight: 600 }}
            >
              <Wand2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              风格模拟
            </motion.button>
          )}
        </motion.div>

        {/* Main Content */}
        <div className="container mx-auto px-6 pt-24 pb-16">
          {/* Header */}
          <motion.div
            key={showStage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            {showStage === 'stage2' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300 rounded-full mb-4"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-4 h-4 text-green-600" />
                </motion.div>
                <span className="text-green-700 text-sm" style={{ fontWeight: 600 }}>
                  分析完成
                </span>
              </motion.div>
            )}
            
            <h1 
              className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4"
              style={{ 
                fontSize: '48px', 
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: '1.1'
              }}
            >
              {showStage === 'stage1' ? '基础分析完成' : '完整专业方案'}
            </h1>
            <p 
              className="text-gray-600 max-w-2xl mx-auto"
              style={{ fontSize: '18px', lineHeight: '1.6' }}
            >
              {showStage === 'stage1' 
                ? 'AI 已完成照片的基础分析，点击下方按钮获取完整的调色方案'
                : '完整的专业调色方案已生成，包含 Lightroom 和 Photoshop 的详细参数'
              }
            </p>
          </motion.div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {displayCards.map((card, index) => {
              const isNewCard = showStage === 'stage2' && index >= 3;
              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    delay: isNewCard ? (index - 3) * 0.15 : index * 0.1,
                    type: 'spring',
                    damping: 20,
                    stiffness: 100
                  }}
                  onClick={() => {
                    handleCardClick(card.id);
                    setActiveNavIndex(index);
                  }}
                  onMouseEnter={() => setHoveredCard(card.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className="group cursor-pointer relative"
                >
                  {/* New badge for newly revealed cards */}
                  {isNewCard && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0, rotate: -12 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={{ delay: (index - 3) * 0.15 + 0.3, type: 'spring', damping: 12 }}
                      className="absolute -top-2 -right-2 z-10 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full shadow-lg"
                      style={{ fontSize: '11px', fontWeight: 700 }}
                    >
                      NEW
                    </motion.div>
                  )}
                  
                  <div className={`
                    relative h-full p-8 rounded-3xl border-2 border-gray-200/60
                    ${card.bgColor}
                    backdrop-blur-sm
                    transition-all duration-300
                    hover:border-gray-300
                    hover:shadow-xl
                    hover:scale-[1.02]
                    hover:-translate-y-1
                  `}>
                    {/* Icon */}
                    <div className="mb-6">
                      <div className={`
                        inline-flex p-4 rounded-2xl
                        bg-white/80 backdrop-blur-sm
                        border border-gray-200/60
                        ${card.color}
                        transition-transform duration-300
                        group-hover:scale-110
                        group-hover:rotate-3
                      `}>
                        {card.icon}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="mb-6">
                      <h3 
                        className="text-gray-900 mb-1"
                        style={{ 
                          fontSize: '19px',
                          fontWeight: 700,
                          letterSpacing: '-0.02em',
                          lineHeight: '1.1'
                        }}
                      >
                        {card.title}
                      </h3>
                      <p 
                        className="text-gray-700 mb-0.5"
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          letterSpacing: '-0.01em',
                          lineHeight: '1.3'
                        }}
                      >
                        {card.subtitle}
                      </p>
                      <p 
                        className="text-gray-500"
                        style={{
                          fontSize: '12px',
                          fontWeight: 400,
                          lineHeight: '1.4',
                        }}
                      >
                        {card.description}
                      </p>
                    </div>

                    {/* Learn More Link */}
                    <motion.div
                      animate={{
                        x: hoveredCard === card.id ? 4 : 0,
                      }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-1 text-blue-600"
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      <span>查看详情</span>
                      <ChevronRight 
                        className="w-3.5 h-3.5 transition-transform"
                      />
                    </motion.div>

                    {/* Hover Glow Effect */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* View Detailed Plan Button (Stage 1 Only) */}
          {showStage === 'stage1' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col items-center gap-6"
            >
              {/* Decorative background */}
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 rounded-full scale-150" />
                
                <motion.button
                  onClick={handleViewDetailedPlan}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative px-12 py-5 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white shadow-2xl hover:shadow-3xl overflow-hidden transition-all duration-300"
                >
                  {/* Animated background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Content */}
                  <div className="relative flex items-center gap-3">
                    <span style={{ fontSize: '18px', fontWeight: 700 }}>
                      查看详细方案
                    </span>
                    <motion.div
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ArrowRight className="w-5 h-5" />
                    </motion.div>
                  </div>

                  {/* Shine effect */}
                  <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700" />
                </motion.button>
              </div>

              {/* Helper text */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-gray-500 text-sm"
              >
                包含色彩方案、Lightroom 和 Photoshop 的完整调整参数
              </motion.p>
            </motion.div>
          )}

          {/* Stage indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex justify-center items-center gap-2 mt-8"
          >
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
              showStage === 'stage1' ? 'bg-blue-500 w-6' : 'bg-gray-300'
            }`} />
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
              showStage === 'stage2' ? 'bg-blue-500 w-6' : 'bg-gray-300'
            }`} />
          </motion.div>
        </div>
      </div>

      {/* Theme Detail Modal */}
      <ThemeDetailModal
        themeId={selectedTheme}
        onClose={() => setSelectedTheme(null)}
        results={results}
        targetImageUrl={targetImageUrl}
        sourceImageUrl={sourceImageUrl}
      />

      {/* Style Simulation */}
      <StyleSimulation
        isOpen={showStyleSimulation}
        onClose={() => setShowStyleSimulation(false)}
        sourceImageUrl={sourceImageUrl}
        targetImageUrl={targetImageUrl}
      />
    </>
  );
}
