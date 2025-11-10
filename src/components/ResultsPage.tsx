import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  Sun,
  Palette,
  Sliders,
  Image as ImageIcon,
  ChevronLeft,
  Sparkles,
  Download,
  ArrowRight,
  Wand2,
} from 'lucide-react';
import { ExportDialog } from './ExportDialog';
import { CompositionSection } from './sections/CompositionSection';
import { LightingSection } from './sections/LightingSection';
import { ColorSection } from './sections/ColorSection';
import { ReviewSection } from './sections/ReviewSection';
import { LightroomSection } from './sections/LightroomSection';
import { PhotoshopSection } from './sections/PhotoshopSection';
import { LoadingTransition } from './LoadingTransition';
import { StyleSimulation } from './StyleSimulation';

interface ResultsPageProps {
  results: any;
  targetImageUrl: string;
  sourceImageUrl?: string;
  onBack: () => void;
}

export function ResultsPage({ results, targetImageUrl, sourceImageUrl, onBack }: ResultsPageProps) {
  const [activeSection, setActiveSection] = useState('review');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showStyleSimulation, setShowStyleSimulation] = useState(false);
  
  // 两阶段加载状态
  const [stage, setStage] = useState<'stage1' | 'loading' | 'stage2'>('stage1');

  const handleViewDetailedPlan = () => {
    setStage('loading');
  };

  const handleLoadingComplete = () => {
    setStage('stage2');
  };

  // 卡片配置
  const stage1Cards = [
    {
      id: 'review',
      title: '照片点评',
      subtitle: 'AI 综合评价',
      icon: Camera,
      borderActive: 'border-amber-400 shadow-xl shadow-amber-100',
      borderHover: 'hover:border-amber-200',
      iconBg: 'bg-gradient-to-br from-amber-50 to-amber-100',
      iconColor: 'text-amber-500',
    },
    {
      id: 'composition',
      title: '构图分析',
      subtitle: '视觉焦点定位',
      icon: Camera,
      borderActive: 'border-blue-400 shadow-xl shadow-blue-100',
      borderHover: 'hover:border-blue-200',
      iconBg: 'bg-gradient-to-br from-blue-50 to-blue-100',
      iconColor: 'text-blue-500',
    },
    {
      id: 'lighting',
      title: '光影参数',
      subtitle: '曝光与对比度',
      icon: Sun,
      borderActive: 'border-yellow-400 shadow-xl shadow-yellow-100',
      borderHover: 'hover:border-yellow-200',
      iconBg: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
      iconColor: 'text-yellow-600',
    },
  ];

  const stage2Cards = [
    ...stage1Cards,
    {
      id: 'color',
      title: '色彩方案',
      subtitle: '色调与饱和度',
      icon: Palette,
      borderActive: 'border-purple-400 shadow-xl shadow-purple-100',
      borderHover: 'hover:border-purple-200',
      iconBg: 'bg-gradient-to-br from-purple-50 to-purple-100',
      iconColor: 'text-purple-500',
    },
    {
      id: 'lightroom',
      title: 'Lightroom',
      subtitle: 'LR 专业调整',
      icon: Sliders,
      borderActive: 'border-cyan-400 shadow-xl shadow-cyan-100',
      borderHover: 'hover:border-cyan-200',
      iconBg: 'bg-gradient-to-br from-cyan-50 to-cyan-100',
      iconColor: 'text-cyan-500',
      span2: true,
    },
    {
      id: 'photoshop',
      title: 'Photoshop',
      subtitle: 'PS 后期处理',
      icon: ImageIcon,
      borderActive: 'border-indigo-400 shadow-xl shadow-indigo-100',
      borderHover: 'hover:border-indigo-200',
      iconBg: 'bg-gradient-to-br from-indigo-50 to-indigo-100',
      iconColor: 'text-indigo-500',
      span2: true,
    },
  ];

  const renderSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case 'review':
        return <ReviewSection data={results?.review} />;
      case 'composition':
        return <CompositionSection data={results?.composition} />;
      case 'lighting':
        return <LightingSection data={results?.lighting} />;
      case 'color':
        return <ColorSection data={results?.color} />;
      case 'lightroom':
        return (
          <LightroomSection 
            data={results?.lightroom} 
            targetImageUrl={sourceImageUrl}
            userImageUrl={targetImageUrl}
            reviewData={results?.review?.emotion || ''}
            conversionData={results?.lightroom_extra}
          />
        );
      case 'photoshop':
        return (
          <PhotoshopSection 
            data={results?.photoshop}
            targetImageUrl={sourceImageUrl}
            userImageUrl={targetImageUrl}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 relative">
      {/* Loading Transition */}
      <AnimatePresence>
        {stage === 'loading' && (
          <LoadingTransition 
            section="detailed"
            onComplete={handleLoadingComplete} 
          />
        )}
      </AnimatePresence>

      {/* Style Simulation Modal */}
      <AnimatePresence>
        {showStyleSimulation && (
          <StyleSimulation
            originalImageUrl={targetImageUrl}
            onClose={() => setShowStyleSimulation(false)}
          />
        )}
      </AnimatePresence>

      {/* Subtle background pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgb(0 0 0) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Subtle gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.03, 0.05, 0.03],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -top-64 -right-64 w-[800px] h-[800px] bg-blue-400 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.03, 0.05, 0.03],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -bottom-64 -left-64 w-[800px] h-[800px] bg-purple-400 rounded-full blur-3xl"
        />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">返回</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-gray-100 border border-gray-200">
                <span className="text-sm text-gray-600">
                  {stage === 'stage2' ? '深度分析完成' : '基础分析完成'}
                </span>
              </div>
              {stage === 'stage2' && (
                <button
                  onClick={() => setShowExportDialog(true)}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl text-white"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm">导出方案</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12 relative z-10">
        {/* Stage 1 or Stage 2 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
              <h2 className="text-gray-900" style={{ fontSize: '24px', fontWeight: 700 }}>
                {stage === 'stage1' ? '基础分析' : '完整分析'}
              </h2>
              <div className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs" style={{ fontWeight: 600 }}>
                已完成
              </div>
            </div>

            {/* Stage 1: Show "查看详细方案" button */}
            {stage === 'stage1' && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', damping: 15 }}
                onClick={handleViewDetailedPlan}
                className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl text-white"
              >
                <Sparkles className="w-5 h-5" />
                <span style={{ fontWeight: 600 }}>查看详细方案</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            )}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(stage === 'stage1' ? stage1Cards : stage2Cards).map((card, index) => {
              const Icon = card.icon;
              const isActive = activeSection === card.id;
              
              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: stage === 'stage2' ? 0.1 + index * 0.05 : 0.2 + index * 0.1 }}
                  onClick={() => setActiveSection(card.id)}
                  className={`${card.span2 ? 'md:col-span-2' : ''} rounded-3xl overflow-hidden bg-white border-2 transition-all cursor-pointer ${
                    isActive
                      ? card.borderActive
                      : `border-gray-200 shadow-sm hover:shadow-lg ${card.borderHover}`
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                        <Icon className={`w-6 h-6 ${card.iconColor}`} />
                      </div>
                      <div>
                        <h3 className="text-lg text-gray-900">{card.title}</h3>
                        <p className="text-xs text-gray-500">{card.subtitle}</p>
                      </div>
                    </div>
                    
                    <AnimatePresence mode="wait">
                      {isActive ? (
                        <motion.div
                          key={`${card.id}-content`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                          className="max-h-[600px] overflow-y-auto pr-2"
                        >
                          {renderSectionContent(card.id)}
                        </motion.div>
                      ) : (
                        <motion.div
                          key={`${card.id}-placeholder`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-gray-400 text-xs"
                        >
                          点击查看详细内容
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Stage 2: Show Style Simulation Button */}
          {stage === 'stage2' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-8"
            >
              <button
                onClick={() => setShowStyleSimulation(true)}
                className="group w-full md:w-auto mx-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 transition-all shadow-2xl hover:shadow-3xl text-white"
              >
                <Wand2 className="w-6 h-6" />
                <span style={{ fontSize: '18px', fontWeight: 700 }}>风格模拟</span>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="w-5 h-5" />
                </motion.div>
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        results={results}
      />
    </div>
  );
}
