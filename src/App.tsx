import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PhotoUploadZone } from './components/PhotoUploadZone';
import { generateMockResults } from './components/AdjustmentResults';
import { ThemeCardsGrid } from './components/ThemeCardsGrid';
import { SimilarityWarningDialog } from './components/SimilarityWarningDialog';
import { UserMenu } from './components/UserMenu';
import { AnalysisLoading } from './components/AnalysisLoading';
import { ArrowRight, Loader2, Zap, Sparkles } from 'lucide-react';
import { Toaster } from './components/ui/sonner';

interface UploadedImage {
  file: File;
  preview: string;
}

export default function App() {
  const [sourceImage, setSourceImage] = useState<UploadedImage | null>(null);
  const [targetImage, setTargetImage] = useState<UploadedImage | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [showSimilarityWarning, setShowSimilarityWarning] = useState(false);
  const [similarityScore, setSimilarityScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  // 模拟图片相似度检测
  const checkImageSimilarity = async (): Promise<number> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return Math.floor(Math.random() * 20) + 80; // 返回 80-99 之间的随机数
  };

  const handleAnalyze = async () => {
    if (!sourceImage || !targetImage) return;

    setIsAnalyzing(true);
    setResults(null);

    try {
      // 首先检查图片相似度
      const similarity = await checkImageSimilarity();
      setSimilarityScore(similarity);

      // 如果相似度过高 (>85%)，显示警告对话框
      if (similarity > 85) {
        setIsAnalyzing(false);
        setShowSimilarityWarning(true);
        return;
      }

      // 继续正常分析流程
      await performAnalysis();
    } catch (error) {
      console.error('Analysis failed:', error);
      setIsAnalyzing(false);
    }
  };

  const performAnalysis = async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Generate mock results
    setResults(generateMockResults());
    setIsAnalyzing(false);
    setShowResults(true);
  };

  const handleContinueAnalysis = async () => {
    setIsAnalyzing(true);
    await performAnalysis();
  };

  const canAnalyze = sourceImage && targetImage && !isAnalyzing;

  const handleBackToUpload = () => {
    setShowResults(false);
    setResults(null);
  };

  // Show theme cards grid if analysis is complete
  if (showResults && results) {
    return (
      <>
        <ThemeCardsGrid
          results={results}
          sourceImageUrl={sourceImage?.preview || ''}
          targetImageUrl={targetImage?.preview || ''}
          onBack={handleBackToUpload}
        />
        <Toaster position="top-center" richColors closeButton />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* User Menu - Always visible */}
      <div className="fixed top-6 right-6 z-50">
        <UserMenu onNavigate={(page) => {
          // 处理导航 - 可以根据需要实现
          console.log('Navigate to:', page);
        }} />
      </div>
      
      <div className="relative min-h-screen flex items-center justify-center">
        {/* Subtle background gradient */}
        <div className="fixed inset-0 pointer-events-none">
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

        <div className="container mx-auto px-6 py-16 relative z-10">
          {/* Upload Section */}
          <div className="space-y-12 max-w-6xl mx-auto">
            {/* Section Title & Subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center space-y-4"
            >
              <h1 
                className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
                style={{ 
                  fontSize: '56px', 
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  lineHeight: '1.1'
                }}
              >
                照片风格克隆
              </h1>
              <p className="text-gray-600 max-w-2xl mx-auto" style={{ fontSize: '18px', lineHeight: '1.6' }}>
                上传参考照片和目标照片，AI 将分析并生成专业的调整方案
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 items-center">
              <PhotoUploadZone
                title="源照片"
                description="上传想要模仿风格的参考照片"
                onImageUpload={(file, preview) => setSourceImage({ file, preview })}
                image={sourceImage?.preview || null}
                onRemove={() => setSourceImage(null)}
                index={0}
              />

              <div className="flex justify-center lg:px-6">
                <motion.div
                  animate={{
                    x: [0, 8, 0],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="p-3 bg-white rounded-full shadow-lg border border-gray-200"
                >
                  <ArrowRight className="w-6 h-6 text-gray-400" />
                </motion.div>
              </div>

              <PhotoUploadZone
                title="目标照片"
                description="上传需要调整风格的照片"
                onImageUpload={(file, preview) => setTargetImage({ file, preview })}
                image={targetImage?.preview || null}
                onRemove={() => setTargetImage(null)}
                index={1}
              />
            </div>

            {/* Analyze Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex justify-center"
            >
              <motion.button
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                className={`group relative px-12 py-5 rounded-2xl overflow-hidden transition-all duration-300 ${
                  canAnalyze
                    ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 shadow-2xl hover:shadow-3xl cursor-pointer'
                    : 'bg-gray-200 cursor-not-allowed'
                }`}
                whileHover={canAnalyze ? { scale: 1.05, y: -2 } : {}}
                whileTap={canAnalyze ? { scale: 0.98 } : {}}
              >
                {/* Shine effect */}
                {canAnalyze && (
                  <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700" />
                )}
                
                <span className={`relative flex items-center gap-3 ${canAnalyze ? 'text-white' : 'text-gray-400'}`} style={{ fontSize: '18px', fontWeight: 700 }}>
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      正在分析中...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      开始 AI 分析
                    </>
                  )}
                </span>
              </motion.button>
            </motion.div>
          </div>

          {/* Loading State - Full Screen Beautiful Loading */}
          <AnimatePresence>
            {isAnalyzing && <AnalysisLoading />}
          </AnimatePresence>

          {/* Similarity Warning Dialog */}
          <SimilarityWarningDialog
            open={showSimilarityWarning}
            onOpenChange={setShowSimilarityWarning}
            similarity={similarityScore}
            onContinue={handleContinueAnalysis}
          />

          {/* Toast Notifications */}
          <Toaster 
            position="top-center"
            richColors
            closeButton
          />
        </div>
      </div>
    </div>
  );
}
