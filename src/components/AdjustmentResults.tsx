import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, Sliders, Palette, Sun, Contrast, Droplet, Download, Copy, CheckCircle2,
  Grid3x3, Maximize2, Move, Aperture, Sunrise, Moon, TrendingUp, Pipette,
  Camera, Image as ImageIcon, Info, Sparkles, ChevronRight, ListOrdered, Lightbulb, Zap,
  Eye, Focus, Paintbrush, Layout, Settings, Smartphone, Target, Palette as PaletteIcon,
  Heart, ThumbsUp, GitCompare, Star, Circle
} from 'lucide-react';
import { useState, useRef, useEffect, forwardRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { ColorGradingVisualization } from './ColorWheel';
import { SimpleMaskVisualization } from './SimpleMaskVisualization';
import { ExportDialog } from './ExportDialog';
import { CurveVisualizationLR } from './CurveVisualizationLR';
import { compositionMockData } from './CompositionMockData';
import { realGeminiReviewData } from './RealGeminiMockData';

interface AdjustmentResultsProps {
  results: any;
  targetImageUrl?: string;
}

export function AdjustmentResults({ results, targetImageUrl }: AdjustmentResultsProps) {
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState('review');
  const [activeSubSection, setActiveSubSection] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['review']));
  const [showExportDialog, setShowExportDialog] = useState(false);
  const contentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    
    if (newExpanded.has(sectionId)) {
      // 收起
      newExpanded.delete(sectionId);
    } else {
      // 展开
      newExpanded.add(sectionId);
      // 滚动到该部分
      setTimeout(() => {
        const element = sectionRefs.current[sectionId];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
    
    setExpandedSections(newExpanded);
    setActiveSection(sectionId);
  };

  const scrollToSection = (sectionId: string) => {
    const element = contentRefs.current[sectionId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSubSection(sectionId);
    }
  };

  const navigation = [
    {
      id: 'review',
      title: '⭐ 专业摄影师评价',
      icon: <Star className="w-4 h-4" />,
      sections: [],
    },
    {
      id: 'composition',
      title: '🎨 构图分析',
      icon: <Grid3x3 className="w-4 h-4" />,
      sections: [],
    },
    {
      id: 'lighting',
      title: '☀️ 光影参数',
      icon: <Sun className="w-4 h-4" />,
      sections: [
        { id: 'lighting-basic', title: '基础调整' },
        { id: 'lighting-texture', title: '质感细节' },
      ],
    },
    {
      id: 'color',
      title: '🌈 色彩方案',
      icon: <Palette className="w-4 h-4" />,
      sections: [
        { id: 'white-balance', title: '白平衡' },
        { id: 'color-grading', title: '色彩分级' },
        { id: 'hsl', title: 'HSL 调整' },
        { id: 'curves', title: '曲线调整' },
        { id: 'color-contrast', title: '色彩对比' },
      ],
    },
    {
      id: 'lightroom',
      title: '📷 Lightroom',
      icon: <Camera className="w-4 h-4" />,
      sections: results.lightroom.map((panel: any, idx: number) => ({
        id: `lr-${idx}`,
        title: panel.title,
      })),
    },
    {
      id: 'photoshop',
      title: '🎨 Photoshop',
      icon: <Layers className="w-4 h-4" />,
      sections: results.photoshop.map((step: any, idx: number) => ({
        id: `ps-${idx}`,
        title: `步骤 ${idx + 1}`,
      })),
    },
    {
      id: 'workflow',
      title: '🎯 风格克隆方案',
      icon: <Zap className="w-4 h-4" />,
      sections: [],
    },
    {
      id: 'tips',
      title: '💡 额外小技巧',
      icon: <Lightbulb className="w-4 h-4" />,
      sections: [],
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-700">分析完成</span>
        </div>
        <h2 className="text-gray-900 text-3xl">AI 风格分析报告</h2>
        <p className="text-gray-500">使用左侧导航快速跳转到你需要的部分</p>
      </motion.div>

      {/* Main Content with Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-gray-900">快速导航</h3>
            </div>
            <ScrollArea className="h-[600px]">
              <div className="p-2">
                {navigation.map((nav) => (
                  <div key={nav.id} className="mb-2">
                    <button
                      onClick={() => toggleSection(nav.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                        expandedSections.has(nav.id)
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {nav.icon}
                      <span className="text-sm flex-1 text-left">{nav.title}</span>
                      <motion.div
                        animate={{ rotate: expandedSections.has(nav.id) ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </motion.div>
                    </button>
                    
                    <AnimatePresence>
                      {expandedSections.has(nav.id) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="ml-6 mt-1 space-y-1 overflow-hidden"
                        >
                          {nav.sections.map((section) => (
                            <button
                              key={section.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                scrollToSection(section.id);
                              }}
                              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                                activeSubSection === section.id
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              <ChevronRight className="w-3 h-3" />
                              <span className="text-left flex-1">{section.title}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Action Buttons in Sidebar */}
            <div className="p-4 border-t border-gray-100 space-y-2">
              <motion.button
                onClick={() => setShowExportDialog(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm relative overflow-hidden group"
              >
                <Download className="w-4 h-4" />
                <span>导出方案</span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.5 }}
                />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-8">
          {/* ⭐ 专业摄影师评价 */}
          <ContentSection
            ref={(el) => (sectionRefs.current['review'] = el)}
            id="review"
            title="⭐ 专业摄影师评价"
            gradient="from-indigo-500 to-purple-600"
            isExpanded={expandedSections.has('review')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ReviewCard
                icon={<Eye className="w-5 h-5" />}
                title="视觉引导与主体分析"
                color="blue"
              >
                {results.review.visualGuidance}
              </ReviewCard>

              <ReviewCard
                icon={<Focus className="w-5 h-5" />}
                title="焦点与曝光分析"
                color="purple"
              >
                {results.review.focusExposure}
              </ReviewCard>

              <ReviewCard
                icon={<Palette className="w-5 h-5" />}
                title="色彩与景深分析"
                color="pink"
              >
                {results.review.colorDepth}
              </ReviewCard>

              <ReviewCard
                icon={<Layout className="w-5 h-5" />}
                title="构图与表达分析"
                color="amber"
              >
                {results.review.compositionExpression}
              </ReviewCard>

              <ReviewCard
                icon={<Settings className="w-5 h-5" />}
                title="技术细节分析"
                color="teal"
              >
                {results.review.technicalDetails}
              </ReviewCard>

              <ReviewCard
                icon={<Smartphone className="w-5 h-5" />}
                title="设备分析"
                color="slate"
              >
                {results.review.equipment}
              </ReviewCard>

              <ReviewCard
                icon={<Aperture className="w-5 h-5" />}
                title="镜头分析"
                color="cyan"
              >
                {results.review.lens}
              </ReviewCard>

              <ReviewCard
                icon={<Target className="w-5 h-5" />}
                title="拍摄技巧"
                color="emerald"
              >
                {results.review.technique}
              </ReviewCard>

              <ReviewCard
                icon={<PaletteIcon className="w-5 h-5" />}
                title="色彩搭配"
                color="rose"
              >
                {results.review.colorMatching}
              </ReviewCard>

              <ReviewCard
                icon={<Heart className="w-5 h-5" />}
                title="照片情感"
                color="red"
              >
                {results.review.emotion}
              </ReviewCard>
            </div>

            <div className="mt-6">
              <ReviewCard
                icon={<ThumbsUp className="w-5 h-5" />}
                title="优点评价"
                color="green"
                fullWidth
              >
                {results.review.advantages}
              </ReviewCard>
            </div>

            <div className="mt-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-pink-600 rounded-lg">
                    <GitCompare className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-gray-900">对比分析</h4>
                </div>
                <ComparisonTable data={results.review.comparison} />
              </div>
            </div>
          </ContentSection>

          {/* 🎨 构图与焦点分析 */}
          <ContentSection
            ref={(el) => (sectionRefs.current['composition'] = el)}
            id="composition"
            title="🎨 构图与焦点分析"
            gradient="from-amber-500 to-orange-600"
            isExpanded={expandedSections.has('composition')}
          >
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CompositionInfoCard
                  icon={<ImageIcon className="w-4 h-4" />}
                  label="分辨率"
                  value={results.composition.basicInfo.resolution}
                  subtext="architecture"
                  color="blue"
                />
                <CompositionInfoCard
                  icon={<Grid3x3 className="w-4 h-4" />}
                  label="主体位置"
                  value="center"
                  subtext="居中对称（适用横竖屏展现）"
                  color="purple"
                />
                <CompositionInfoCard
                  icon={<Target className="w-4 h-4" />}
                  label="宽高比"
                  value="1600/935"
                  subtext="黄金分割（适用横竖屏展现）"
                  color="amber"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <CompositionInfoCard
                  icon={<Sunrise className="w-4 h-4" />}
                  label="构图与场景比重"
                  value="architecture（建筑物）"
                  subtext="黄金比例：中心位置，主题位于中央，呼应四周空白"
                  color="teal"
                  large
                />
                <CompositionInfoCard
                  icon={<Aperture className="w-4 h-4" />}
                  label="主体与景深"
                  value="建筑：广角主题"
                  subtext="黄金分割：中心位置主题，近景广角，中景对称，远景模糊（modern and calm）"
                  color="green"
                  large
                />
              </div>
            </div>

            <div className="mt-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
              <h4 className="flex items-center gap-2 text-amber-900 mb-4">
                <Info className="w-5 h-5" />
                详细分析
              </h4>
              <div className="space-y-4 text-sm text-gray-700">
                <div>
                  <p className="text-amber-800 mb-2"><strong>构图与取景比例：</strong></p>
                  <DetailedText content={results.composition.aspectRatioDetail} />
                </div>
                <div>
                  <p className="text-amber-800 mb-2"><strong>主体位置与留白：</strong></p>
                  <DetailedText content={results.composition.subjectAndSpace} />
                </div>
                <div>
                  <p className="text-amber-800 mb-2"><strong>焦点与景深：</strong></p>
                  <DetailedText content={results.composition.focusAndDepth} />
                </div>
              </div>
            </div>
          </ContentSection>

          {/* ☀️ 光影参数 */}
          <ContentSection
            ref={(el) => (sectionRefs.current['lighting'] = el)}
            id="lighting"
            title="☀️ 光影参数"
            gradient="from-yellow-500 to-orange-500"
            isExpanded={expandedSections.has('lighting')}
          >
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-800">
                💡 所有数值为复刻参考起点，实际使用时可 ± 微调 0.1–0.4 步或 2–8 点
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Sun className="w-5 h-5 text-yellow-600" />
                </div>
                <h4 className="text-gray-900">基础（整体）</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <CompactParameter
                  icon={<Sunrise className="w-4 h-4" />}
                  label="曝光 Exposure"
                  value={results.lighting.basic.exposure.range}
                />
                <CompactParameter
                  icon={<Contrast className="w-4 h-4" />}
                  label="对比度 Contrast"
                  value={results.lighting.basic.contrast.range}
                />
                <CompactParameter
                  icon={<Sun className="w-4 h-4" />}
                  label="高光 Highlights"
                  value={results.lighting.basic.highlights.range}
                />
                <CompactParameter
                  icon={<Moon className="w-4 h-4" />}
                  label="阴影 Shadows"
                  value={results.lighting.basic.shadows.range}
                />
                <CompactParameter
                  icon={<Sunrise className="w-4 h-4" />}
                  label="白色 Whites"
                  value={results.lighting.basic.whites.range}
                />
                <CompactParameter
                  icon={<Moon className="w-4 h-4" />}
                  label="黑色 Blacks"
                  value={results.lighting.basic.blacks.range}
                />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mt-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Sliders className="w-5 h-5 text-orange-600" />
                </div>
                <h4 className="text-gray-900">质感/细节</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <CompactParameter
                  icon={<Grid3x3 className="w-4 h-4" />}
                  label="纹理 Texture"
                  value={results.lighting.texture.texture.range}
                />
                <CompactParameter
                  icon={<Sparkles className="w-4 h-4" />}
                  label="清晰度 Clarity"
                  value={results.lighting.texture.clarity.range}
                />
                <CompactParameter
                  icon={<Sun className="w-4 h-4" />}
                  label="去雾 Dehaze"
                  value={results.lighting.texture.dehaze.range}
                />
                <CompactParameter
                  icon={<Droplet className="w-4 h-4" />}
                  label="饱和度 Saturation"
                  value={results.lighting.texture.saturation.range}
                />
                <CompactParameter
                  icon={<Droplet className="w-4 h-4" />}
                  label="活力 Vibrance"
                  value={results.lighting.texture.vibrance.range}
                />
              </div>
            </div>
          </ContentSection>

          {/* 🌈 色彩方案 */}
          <ContentSection
            ref={(el) => (sectionRefs.current['color'] = el)}
            id="color"
            title="🌈 色彩方案"
            gradient="from-pink-500 to-purple-600"
            isExpanded={expandedSections.has('color')}
          >
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-purple-800">
                🎨 {results.color.styleKey}
              </p>
            </div>

            <SubSectionCard
              ref={(el) => (contentRefs.current['white-balance'] = el)}
              title="色温/色调（白平衡）"
              icon={<Sun className="w-5 h-5" />}
              color="pink"
            >
              <div className="space-y-4">
                <RangeParameter
                  icon={<Sun className="w-4 h-4" />}
                  label="色温 Temp"
                  range={results.color.whiteBalance.temp.range}
                  note={results.color.whiteBalance.temp.note}
                  color="pink"
                />
                <RangeParameter
                  icon={<Palette className="w-4 h-4" />}
                  label="色调 Tint"
                  range={results.color.whiteBalance.tint.range}
                  note={results.color.whiteBalance.tint.note}
                  color="pink"
                />
              </div>
            </SubSectionCard>

            <SubSectionCard
              ref={(el) => (contentRefs.current['color-grading'] = el)}
              title="色彩分级（Color Grading）"
              icon={<Palette className="w-5 h-5" />}
              color="pink"
            >
              {/* 色轮可视化 */}
              <div className="mb-6 p-6 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl">
                <ColorGradingVisualization
                  highlights={parseGradingValue(results.color.grading.highlights)}
                  midtones={parseGradingValue(results.color.grading.midtones)}
                  shadows={parseGradingValue(results.color.grading.shadows)}
                  balance={parseBalanceValue(results.color.grading.balance)}
                />
              </div>

              {/* 详细参数卡片 */}
              <details className="group">
                <summary className="cursor-pointer px-4 py-2 bg-pink-50 hover:bg-pink-100 rounded-lg text-sm text-gray-700 transition-colors flex items-center justify-between">
                  <span>查看详细参数</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                </summary>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ColorGradingCard
                    title="高光 Highlights"
                    hue={results.color.grading.highlights.hue}
                    saturation={results.color.grading.highlights.saturation}
                  />
                  <ColorGradingCard
                    title="中间调 Midtones"
                    hue={results.color.grading.midtones.hue}
                    saturation={results.color.grading.midtones.saturation}
                  />
                  <ColorGradingCard
                    title="阴影 Shadows"
                    hue={results.color.grading.shadows.hue}
                    saturation={results.color.grading.shadows.saturation}
                  />
                </div>
              </details>
            </SubSectionCard>

            <SubSectionCard
              ref={(el) => (contentRefs.current['hsl'] = el)}
              title="HSL（色相/饱和度/明度）"
              icon={<Sliders className="w-5 h-5" />}
              color="pink"
            >
              <div className="space-y-3">
                {results.color.hsl.map((item: any, idx: number) => (
                  <HSLDetailCard key={idx} {...item} />
                ))}
              </div>
              {results.color.hslNote && (
                <div className="mt-4 p-3 bg-pink-50 rounded-lg">
                  <p className="text-sm text-pink-800">{results.color.hslNote}</p>
                </div>
              )}
            </SubSectionCard>

            <SubSectionCard
              ref={(el) => (contentRefs.current['curves'] = el)}
              title="曲线（Tone Curve）"
              icon={<TrendingUp className="w-5 h-5" />}
              color="pink"
            >
              <div className="mb-6">
                <h5 className="text-gray-900 mb-3">Luma 曲线（整体 S 曲线）</h5>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <CurveVisualizationLR points={results.color.curves.luma} channel="luma" />
                  </div>
                  <div className="space-y-2">
                    {results.color.curves.luma.map((point: any, idx: number) => (
                      <CurvePoint key={idx} {...point} />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h5 className="text-gray-900 mb-3">RGB 各通道微调</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {results.color.curves.rgb.map((channel: any, idx: number) => (
                    <div key={idx} className="space-y-3">
                      {/* 上面：曲线图 */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <CurveVisualizationLR points={channel.points} channel={channel.name} />
                      </div>
                      {/* 下面：通道信息 */}
                      <div>
                        <ChannelAdjustment {...channel} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SubSectionCard>

            <SubSectionCard
              ref={(el) => (contentRefs.current['color-contrast'] = el)}
              title="色彩对比度"
              icon={<Contrast className="w-5 h-5" />}
              color="pink"
            >
              <DetailedText content={results.color.colorContrast} />
            </SubSectionCard>
          </ContentSection>

          {/* 📷 Lightroom */}
          <ContentSection
            ref={(el) => (sectionRefs.current['lightroom'] = el)}
            id="lightroom"
            title="📷 Lightroom 调整方案"
            gradient="from-blue-500 to-blue-600"
            isExpanded={expandedSections.has('lightroom')}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {results.lightroom.filter((s: any) => !s.masks).map((section: any, idx: number) => (
                  <div
                    key={idx}
                    ref={(el) => (contentRefs.current[`lr-${idx}`] = el)}
                  >
                    <LightroomPanel {...section} targetImageUrl={targetImageUrl} />
                  </div>
                ))}
              </div>
              
              {/* 蒙版建议 - 全宽显示 */}
              {results.lightroom.filter((s: any) => s.masks).map((section: any, idx: number) => (
                <div key={`mask-${idx}`} className="space-y-4">
                  {section.masks.map((mask: any, maskIdx: number) => (
                    <SimpleMaskVisualization
                      key={maskIdx}
                      imageUrl={targetImageUrl || ''}
                      title={mask.title}
                      description={mask.description}
                      params={mask.params}
                    />
                  ))}
                </div>
              ))}
            </div>
          </ContentSection>

          {/* 🎨 Photoshop */}
          <ContentSection
            ref={(el) => (sectionRefs.current['photoshop'] = el)}
            id="photoshop"
            title="🎨 Photoshop 调整方案"
            gradient="from-purple-500 to-purple-600"
            isExpanded={expandedSections.has('photoshop')}
          >
            <div className="space-y-4">
              {results.photoshop.map((step: any, idx: number) => (
                <div
                  key={idx}
                  ref={(el) => (contentRefs.current[`ps-${idx}`] = el)}
                >
                  <PhotoshopStep {...step} index={idx} />
                </div>
              ))}
            </div>
          </ContentSection>

          {/* 🎯 风格克隆方案 */}
          <ContentSection
            ref={(el) => (sectionRefs.current['workflow'] = el)}
            id="workflow"
            title="🎯 风格克隆方案（便于复刻时复现）"
            gradient="from-emerald-500 to-teal-600"
            isExpanded={expandedSections.has('workflow')}
          >
            <div className="space-y-6">
              {/* Lightroom 部分 */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-blue-600">1. Lightroom / Camera Raw（基础调整）</h4>
                </div>
                <p className="text-gray-700 mb-3">
                  在 Lightroom 做 <strong className="text-blue-600">基础曝光</strong> + <strong className="text-blue-600">曲线</strong> + <strong className="text-blue-600">HSL</strong> + <strong className="text-blue-600">Color Grading</strong>（整体基调就绪）。
                </p>
              </div>

              {/* 蒙版建议 */}
              {targetImageUrl && (
                <SimpleMaskVisualization
                  imageUrl={targetImageUrl}
                  title="局部蒙版调整建议"
                  description="需要提亮中间主体，压暗四周暗角"
                  params={[
                    { name: '曝光 Exposure', value: '+0.3 到 +0.5' },
                    { name: '对比度 Contrast', value: '+15 到 +20' },
                    { name: '高光 Highlights', value: '-20 到 -30' },
                    { name: '阴影 Shadows', value: '+10 到 +20' },
                    { name: '清晰度 Clarity', value: '+8 到 +15' },
                    { name: '暗角 Vignette', value: '-25 到 -35' },
                  ]}
                />
              )}

              {/* Photoshop 详细部分 */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                    <Layers className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-purple-600">2. Photoshop（Camera Raw 滑块 + 图层��作 + 局部修饰）</h4>
                </div>
                
                <p className="text-gray-700 mb-4">
                  先在 Camera Raw 插入类似 LR 的基础滑块（上述 LR 同步），然后进 Photoshop 做以下局部与高级处理。
                </p>

                <div className="space-y-4">
                  {/* Camera Raw 基础 */}
                  <PhotoshopDetailCard
                    icon={<Camera className="w-4 h-4" />}
                    title="Camera Raw（基础）"
                    color="blue"
                  >
                    按 LR 的"基本"与"HSL/曲线/色彩分级"设置一遍（数值同上）。
                  </PhotoshopDetailCard>

                  {/* 曲线图层 */}
                  <PhotoshopDetailCard
                    icon={<TrendingUp className="w-4 h-4" />}
                    title="曲线（Curves）图层 - RGB 总曲线"
                    color="purple"
                  >
                    <div className="space-y-2">
                      <p>创建一个 Curves 调整图层：拉出 S 曲线（阴影轻抬，暗部稍收，亮部适度提升，高光顶部略压）。在 RGB 通道做小幅红/蓝通道交叉：</p>
                      <ul className="space-y-1.5 ml-4">
                        <li className="flex gap-2">
                          <span className="text-red-500">•</span>
                          <span><strong className="text-red-600">红通道</strong>中高调 +4%（暖高光），阴影小幅 -2%（保持深度）</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-blue-500">•</span>
                          <span><strong className="text-blue-600">蓝通道</strong>阴影 -6 到 -10（让阴影偏青），高光 +2（中和）</span>
                        </li>
                      </ul>
                      <p className="text-sm text-gray-600 italic mt-2">💡 具体点（像素级）可在曲线中��加 4 个点，形成温和 S 曲线。</p>
                    </div>
                  </PhotoshopDetailCard>

                  {/* 选择性颜色 */}
                  <PhotoshopDetailCard
                    icon={<Palette className="w-4 h-4" />}
                    title="选择性颜色（Selective Color）—— 精细��整中性色与红/黄"
                    color="pink"
                  >
                    <div className="space-y-2">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm mb-2"><strong>Neutrals:</strong></p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span>Cyan: <strong className="text-cyan-600">-4</strong></span>
                          <span>Magenta: <strong className="text-pink-600">+2</strong></span>
                          <span>Yellow: <strong className="text-yellow-600">+6</strong></span>
                          <span>Black: <strong className="text-gray-600">+2</strong></span>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">（微暖中间调）</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3">
                        <p className="text-sm mb-2"><strong>Reds & Yellows:</strong></p>
                        <div className="flex gap-4 text-sm">
                          <span>Yellow: <strong className="text-yellow-600">+8</strong>（强调暖色）</span>
                          <span>Black: <strong className="text-gray-600">-3</strong>（提亮）</span>
                        </div>
                      </div>
                    </div>
                  </PhotoshopDetailCard>

                  {/* 色彩查找 */}
                  <PhotoshopDetailCard
                    icon={<Pipette className="w-4 h-4" />}
                    title="色彩查找（Color Lookup，可选）"
                    color="teal"
                  >
                    可尝试 3DLUT <strong>"Crisp_Warm.look"</strong> 或手动构造 LUT：主旨是让高光偏暖、阴影偏冷与降低总体饱和。
                  </PhotoshopDetailCard>

                  {/* 局部光效 */}
                  <PhotoshopDetailCard
                    icon={<Sun className="w-4 h-4" />}
                    title="局部光效（Layer：Soft Light / Overlay + 大型渐变）"
                    color="amber"
                  >
                    <div className="space-y-2">
                      <p>新建图层，选择径向渐变或线性渐变（从右侧太阳方向到画面中心），填充暖橙色（<strong className="text-orange-600">R≈255 G≈180 B≈120</strong>），图层混合模式 <strong>Soft Light</strong> 或 <strong>Overlay</strong>，不透明度约 <strong>10–22%</strong>，用大尺寸高斯模糊（Radius 60–160 px）软化边界，以营造日出暖光溢出并与高光融合。</p>
                      <p className="text-sm text-amber-700">💡 对塔的边缘使用蒙版逐步减弱该图层以保持塔细节。</p>
                    </div>
                  </PhotoshopDetailCard>

                  {/* Dodging & Burning */}
                  <PhotoshopDetailCard
                    icon={<Contrast className="w-4 h-4" />}
                    title="Dodging & Burning（加深/点亮）"
                    color="slate"
                  >
                    <div className="space-y-2">
                      <p>新建 <strong>50% 灰图层</strong>（模式 Overlay），使用低流量（<strong>Flow 5–12%</strong>）白色刷子点亮塔的顶檐和富士山顶的高光区域，黑色刷子加深树木前景和城市暗部。</p>
                      <p className="text-sm text-slate-700">🎯 <strong>目的：</strong>增强立体感和导视。</p>
                    </div>
                  </PhotoshopDetailCard>

                  {/* 锐化与噪点 */}
                  <PhotoshopDetailCard
                    icon={<Sparkles className="w-4 h-4" />}
                    title="锐化（Smart Sharpen）与噪点处理"
                    color="green"
                  >
                    <div className="space-y-2">
                      <div>
                        <p className="mb-2">对整体使用 <strong>Camera Raw Filter → Sharpening</strong>：</p>
                        <div className="bg-green-50 rounded-lg p-3 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Amount:</span>
                            <strong className="text-green-600">40–70</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Radius:</span>
                            <strong className="text-green-600">0.8–1.2</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Detail:</span>
                            <strong className="text-green-600">25</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Masking:</span>
                            <strong className="text-green-600">40–60</strong>
                            <span className="text-xs text-gray-600">（保护天空）</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">若放大或有噪点，可局部用 <strong>Reduce Noise</strong> 在阴影区域轻微处理。</p>
                    </div>
                  </PhotoshopDetailCard>

                  {/* 最终色调微调 */}
                  <PhotoshopDetailCard
                    icon={<Sliders className="w-4 h-4" />}
                    title="最终色调微调（可选）"
                    color="indigo"
                  >
                    <div className="space-y-2">
                      <p>用 <strong>Color Balance</strong>：</p>
                      <div className="grid grid-cols-1 gap-2">
                        <div className="bg-indigo-50 rounded-lg p-2 text-sm">
                          <strong>Midtones:</strong> +6 Red, -4 Blue
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2 text-sm">
                          <strong>Shadows:</strong> -6 Blue（冷影）
                        </div>
                        <div className="bg-orange-50 rounded-lg p-2 text-sm">
                          <strong>Highlights:</strong> +6 Red（暖高光）
                        </div>
                      </div>
                    </div>
                  </PhotoshopDetailCard>
                </div>
              </div>

              {/* 备选风格提示 */}
              <div className="bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <Zap className="w-6 h-6 text-pink-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-pink-900">
                      <strong>备选风格：</strong>若想更强"胶片+治愈感"
                    </p>
                    <p className="text-sm text-pink-700">
                      增加 <strong>+2 粒子（Grain）</strong>并把对比度稍降低（<strong>-4</strong>）作为备选风格。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ContentSection>

          {/* 💡 额外小技巧 */}
          <ContentSection
            ref={(el) => (sectionRefs.current['tips'] = el)}
            id="tips"
            title="💡 额外小技巧（让作品更像原图的几个关键点）"
            gradient="from-yellow-500 to-amber-600"
            isExpanded={expandedSections.has('tips')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TipCard
                icon={<Sunrise className="w-5 h-5" />}
                title="压高光但保留暖色"
                color="orange"
              >
                原图高光并未彻底爆掉，而是宽展成柔和的暖光。用 <strong>Highlights 大幅负值</strong> + <strong>Whites 小幅正值</strong>可达成。
              </TipCard>

              <TipCard
                icon={<Palette className="w-5 h-5" />}
                title="去绿而保橙"
                color="green"
              >
                前景树木不是鲜绿色，而是偏褐/暗，这通过 <strong>Green 通道显著去饱和并下调亮度</strong>实现。
              </TipCard>

              <TipCard
                icon={<Sun className="w-5 h-5" />}
                title="局部径向暖光"
                color="amber"
              >
                在右侧塔与天际交接处做暖色径向溢出是照片识别度很高的细节。
              </TipCard>

              <TipCard
                icon={<Moon className="w-5 h-5" />}
                title="阴影偏青"
                color="blue"
              >
                阴影不是中性灰，而是带青蓝，这能增加远山/天空的"冷感"，同时让暖光更突出。
              </TipCard>
            </div>
          </ContentSection>
        </div>
      </div>

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        results={results}
      />
    </motion.div>
  );
}

// Container Components
const ContentSection = forwardRef<HTMLDivElement, any>(({ id, title, gradient, isExpanded, children }, ref) => {
  return (
    <AnimatePresence mode="wait">
      {isExpanded && (
        <motion.div
          ref={ref}
          id={id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="scroll-mt-4 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 bg-gradient-to-br ${gradient} rounded-xl shadow-lg`}>
              <Grid3x3 className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-900">{title}</h3>
          </div>
          
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

ContentSection.displayName = 'ContentSection';

const SubSectionCard = forwardRef<HTMLDivElement, any>(({ title, icon, color, children }, ref) => {
  const colorClasses = {
    amber: 'bg-amber-50 text-amber-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    pink: 'bg-pink-50 text-pink-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div ref={ref} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 scroll-mt-4">
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
        <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
        <h4 className="text-gray-900">{title}</h4>
      </div>
      {children}
    </div>
  );
});

SubSectionCard.displayName = 'SubSectionCard';

// Detail Components (keeping all the existing detail components)
function MetricCard({ label, value, detail }: any) {
  return (
    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
      <div className="text-xs text-amber-600 mb-1">{label}</div>
      <div className="text-gray-900 mb-1">{value}</div>
      <div className="text-xs text-gray-600">{detail}</div>
    </div>
  );
}

function DetailedText({ content }: { content: string[] }) {
  return (
    <div className="space-y-2">
      {content.map((text, idx) => (
        <div key={idx} className="flex gap-2">
          <span className="text-gray-400 mt-1">•</span>
          <p className="text-gray-700 text-sm flex-1">{text}</p>
        </div>
      ))}
    </div>
  );
}

function RangeParameter({ icon, label, range, note, color }: any) {
  const colorClasses = {
    yellow: 'text-yellow-600 bg-yellow-50 border-yellow-100',
    pink: 'text-pink-600 bg-pink-50 border-pink-100',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-gray-500">{icon}</div>
          <span className="text-gray-700 text-sm">{label}</span>
        </div>
        <div className={`px-3 py-1 rounded-lg border ${colorClasses[color as keyof typeof colorClasses]}`}>
          <span className="text-sm">{range}</span>
        </div>
      </div>
      {note && (
        <p className="text-xs text-gray-500 pl-8">{note}</p>
      )}
    </div>
  );
}

// 解析色彩分级数值，支持各种格式
function parseGradingValue(value: any): { hue: number; saturation: number } {
  if (!value) return { hue: 0, saturation: 0 };
  
  let hue = 0;
  let saturation = 0;
  
  // 解析色相
  if (typeof value.hue === 'string') {
    // 格式: "≈ 35°（橙黄）" 或 "≈ 28–40°" 或 "≈ 200–230°（冷蓝青）"
    const hueMatch = value.hue.match(/(\d+)/);
    hue = hueMatch ? parseInt(hueMatch[1]) : 0;
  } else {
    hue = value.hue || 0;
  }
  
  // 解析饱和度
  if (typeof value.saturation === 'string') {
    // 格式: "10–18" 或 "6–12（中间偏暖）"
    const satMatch = value.saturation.match(/(\d+)/);
    saturation = satMatch ? parseInt(satMatch[1]) : 0;
  } else {
    saturation = value.saturation || 0;
  }
  
  return { hue, saturation };
}

// 解析Balance值
function parseBalanceValue(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // 格式: "+5 到 +12（偏向高光/暖色）"
    const match = value.match(/([+\-]?\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
  return 0;
}

function ColorGradingCard({ title, hue, saturation }: any) {
  return (
    <div className="p-4 bg-white border border-pink-200 rounded-xl">
      <div className="text-sm text-gray-900 mb-3">{title}</div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600">Hue（色相）</span>
          <span className="text-sm text-pink-600">{hue}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600">Saturation（饱和度）</span>
          <span className="text-sm text-pink-600">{saturation}</span>
        </div>
      </div>
    </div>
  );
}

function HSLDetailCard({ color, hue, saturation, luminance, note }: any) {
  return (
    <div className="p-4 bg-pink-50 border border-pink-100 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-4 h-4 rounded-full ${getColorClass(color)}`} />
        <span className="text-gray-900">{color}</span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <div className="text-gray-500 mb-1">Hue</div>
          <div className="text-pink-600">{hue}</div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">Sat</div>
          <div className="text-pink-600">{saturation}</div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">Luma</div>
          <div className="text-pink-600">{luminance}</div>
        </div>
      </div>
      {note && (
        <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-pink-200">{note}</p>
      )}
    </div>
  );
}

function CurvePoint({ label, x, y, note }: any) {
  return (
    <div className="flex items-center justify-between p-2 bg-pink-50 rounded-lg">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">x≈{x} → y≈{y}</span>
        {note && <span className="text-xs text-pink-600">({note})</span>}
      </div>
    </div>
  );
}

function ChannelAdjustment({ channel, adjustment, note }: any) {
  return (
    <div className="p-3 bg-pink-50 border border-pink-100 rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-900">{channel}</span>
        <span className="text-sm text-pink-600">{adjustment}</span>
      </div>
      {note && <p className="text-xs text-gray-600">{note}</p>}
    </div>
  );
}

// 解析曲线参数，支持多种格式
function parseCurveParams(params: any[]) {
  const luma: any[] = [];
  const red: any[] = [];
  const green: any[] = [];
  const blue: any[] = [];
  
  params.forEach((param: any) => {
    const name = param.name.toLowerCase();
    const value = param.value;
    
    // 解析点坐标，支持多种格式：
    // "x≈0 → y≈10"
    // "输入 0 → 输出 10"
    // "(0, 10)"
    
    let x = 0, y = 0;
    
    // 格式 1: "x≈0 → y≈10" 或 "x≈60 → y≈58"
    const format1 = value.match(/x[≈=]\s*(\d+)\s*(?:→|->)\s*y[≈=]\s*(\d+)/);
    if (format1) {
      x = parseInt(format1[1]);
      y = parseInt(format1[2]);
    }
    
    // 格式 2: "输入 0 → 输出 10"
    const format2 = value.match(/输入\s*(\d+)\s*(?:→|->)\s*输出\s*(\d+)/);
    if (format2) {
      x = parseInt(format2[1]);
      y = parseInt(format2[2]);
    }
    
    // 格式 3: "输入 180 → 输出 188 (+8)"
    const format3 = value.match(/输入\s*(\d+)\s*(?:→|->)\s*输出\s*(\d+)\s*\([+\-]\d+\)/);
    if (format3) {
      x = parseInt(format3[1]);
      y = parseInt(format3[2]);
    }
    
    // 如果成功解析了坐标
    if (format1 || format2 || format3) {
      const point = { point: `(${x}, ${y})`, label: param.name };
      
      // 根据参数名称分类
      if (name.includes('luma') || name.includes('rgb')) {
        luma.push(point);
      } else if (name.includes('红') || name.includes('red')) {
        red.push(point);
      } else if (name.includes('绿') || name.includes('green')) {
        green.push(point);
      } else if (name.includes('蓝') || name.includes('blue')) {
        blue.push(point);
      }
    }
  });
  
  return { luma, red, green, blue };
}

// 解析色彩分级参数
function parseColorGradingParams(params: any[]) {
  const data: any = {
    highlights: null,
    midtones: null,
    shadows: null,
    balance: null,
  };
  
  params.forEach((param: any) => {
    const name = param.name.toLowerCase();
    const value = param.value;
    
    // 解析色相（度数）
    const hueMatch = value.match(/[≈~]?\s*(\d+)°/);
    // 解析饱和度（数字）
    const satMatch = value.match(/(\d+(?:\.\d+)?)\s*$/);
    
    // 高光
    if (name.includes('highlights') || name.includes('高光')) {
      if (!data.highlights) data.highlights = { hue: 0, saturation: 0 };
      if (name.includes('hue') || name.includes('色相')) {
        data.highlights.hue = hueMatch ? parseFloat(hueMatch[1]) : 0;
      }
      if (name.includes('sat') || name.includes('饱和')) {
        data.highlights.saturation = satMatch ? parseFloat(satMatch[1]) : 0;
      }
    }
    
    // 中间调
    if (name.includes('midtones') || name.includes('中间调')) {
      if (!data.midtones) data.midtones = { hue: 0, saturation: 0 };
      if (name.includes('hue') || name.includes('色相')) {
        data.midtones.hue = hueMatch ? parseFloat(hueMatch[1]) : 0;
      }
      if (name.includes('sat') || name.includes('饱和')) {
        data.midtones.saturation = satMatch ? parseFloat(satMatch[1]) : 0;
      }
    }
    
    // 阴影
    if (name.includes('shadows') || name.includes('阴影')) {
      if (!data.shadows) data.shadows = { hue: 0, saturation: 0 };
      if (name.includes('hue') || name.includes('色相')) {
        data.shadows.hue = hueMatch ? parseFloat(hueMatch[1]) : 0;
      }
      if (name.includes('sat') || name.includes('饱和')) {
        data.shadows.saturation = satMatch ? parseFloat(satMatch[1]) : 0;
      }
    }
    
    // Balance
    if (name.includes('balance')) {
      const balanceMatch = value.match(/([+\-]?\d+)/);
      if (balanceMatch) {
        data.balance = parseFloat(balanceMatch[1]);
      }
    }
  });
  
  return data;
}

function LightroomPanel({ title, icon, params }: any) {
  // 检查是否是曲线面板
  const isCurvePanel = title.includes('曲线') || title.toLowerCase().includes('curve');
  
  // 检查是否是色彩分级面板
  const isColorGradingPanel = title.includes('色彩分级') || title.toLowerCase().includes('color grading');
  
  // 如果是曲线面板，解析曲线数据
  const curveData = isCurvePanel ? parseCurveParams(params) : null;
  
  // 如果是色彩分级面板，解析色彩分级数据
  const colorGradingData = isColorGradingPanel ? parseColorGradingParams(params) : null;
  
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
          {icon}
        </div>
        <h4 className="text-gray-900">{title}</h4>
      </div>
      
      {isCurvePanel && curveData ? (
        <div className="space-y-6">
          {/* Luma 曲线可视化 - 横向布局 */}
          {curveData.luma.length > 0 && (
            <div>
              <h5 className="text-gray-700 text-sm mb-3">色调曲线</h5>
              <div className="flex gap-4 items-start bg-gray-50 rounded-xl p-4">
                {/* 左侧：曲线图 */}
                <div className="flex-1">
                  <CurveVisualizationLR points={curveData.luma} channel="luma" />
                </div>
                {/* 右侧：数据 */}
                <div className="w-64 space-y-2">
                  {params.filter((p: any) => p.name.includes('Luma')).map((param: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center gap-3 px-3 py-2 bg-white rounded-lg border border-gray-200 text-xs">
                      <span className="text-gray-700">{param.name}</span>
                      <span className="text-blue-600">{param.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* RGB 通道曲线 - 三个并排 */}
          {(curveData.red.length > 0 || curveData.green.length > 0 || curveData.blue.length > 0) && (
            <div>
              <h5 className="text-gray-700 text-sm mb-3">RGB 通道调整</h5>
              <div className="grid grid-cols-3 gap-3">
                {curveData.red.length > 0 && (
                  <div className="bg-red-50/50 rounded-xl p-3 border border-red-100">
                    <div className="bg-white rounded-lg p-3 mb-2">
                      <CurveVisualizationLR points={curveData.red} channel="红" />
                    </div>
                    <div className="space-y-1">
                      {params.filter((p: any) => p.name.includes('红')).map((param: any, idx: number) => (
                        <div key={idx} className="text-xs px-2 py-1 bg-white rounded text-gray-700">
                          <span className="text-red-600">{param.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {curveData.green.length > 0 && (
                  <div className="bg-green-50/50 rounded-xl p-3 border border-green-100">
                    <div className="bg-white rounded-lg p-3 mb-2">
                      <CurveVisualizationLR points={curveData.green} channel="绿" />
                    </div>
                    <div className="space-y-1">
                      {params.filter((p: any) => p.name.includes('绿')).map((param: any, idx: number) => (
                        <div key={idx} className="text-xs px-2 py-1 bg-white rounded text-gray-700">
                          <span className="text-green-600">{param.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {curveData.blue.length > 0 && (
                  <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100">
                    <div className="bg-white rounded-lg p-3 mb-2">
                      <CurveVisualizationLR points={curveData.blue} channel="蓝" />
                    </div>
                    <div className="space-y-1">
                      {params.filter((p: any) => p.name.includes('蓝')).map((param: any, idx: number) => (
                        <div key={idx} className="text-xs px-2 py-1 bg-white rounded text-gray-700">
                          <span className="text-blue-600">{param.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : isColorGradingPanel && colorGradingData ? (
        <div className="space-y-4">
          {/* 色轮可视化 */}
          <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl p-6">
            <ColorGradingVisualization
              highlights={colorGradingData.highlights}
              midtones={colorGradingData.midtones}
              shadows={colorGradingData.shadows}
              balance={colorGradingData.balance}
            />
          </div>
          
          {/* 详细参数列表 */}
          <details className="group">
            <summary className="cursor-pointer px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors flex items-center justify-between">
              <span>查看详细参数</span>
              <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
            </summary>
            <div className="mt-3 space-y-2">
              {params.map((param: any, pIdx: number) => (
                <div key={pIdx} className="flex justify-between items-center gap-3 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                  <span className="text-gray-700 text-sm">{param.name}</span>
                  <span className="text-blue-600 text-sm">{param.value}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      ) : (
        <div className="space-y-2">
          {params.map((param: any, pIdx: number) => (
            <div key={pIdx} className="flex justify-between items-center gap-3 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <span className="text-gray-700 text-sm">{param.name}</span>
              <span className="text-blue-600 text-sm">{param.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoshopStep({ title, description, params, steps, index }: any) {
  // 检查是否是曲线步骤
  const isCurveStep = title.includes('曲线') || title.toLowerCase().includes('curve');
  
  // 检查是否是色彩分级步骤
  const isColorGradingStep = title.includes('色彩分级') || title.toLowerCase().includes('color grading') || title.includes('色彩平衡');
  
  // 如果是曲线步骤，解析曲线数据
  const curveData = isCurveStep && params ? parseCurveParams(params) : null;
  
  // 如果是色彩分级步骤，解析色彩分级数据
  const colorGradingData = isColorGradingStep && params ? parseColorGradingParams(params) : null;
  
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
          <span className="text-purple-600">{index + 1}</span>
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h4 className="text-gray-900">{title}</h4>
            <p className="text-gray-500 text-sm mt-1">{description}</p>
          </div>
          
          {isCurveStep && curveData ? (
            <div className="space-y-6 pt-2">
              {/* RGB 曲线可视化 - 横向布局 */}
              {curveData.luma.length > 0 && (
                <div>
                  <h5 className="text-gray-700 text-sm mb-3">RGB 整体曲线</h5>
                  <div className="flex gap-4 items-start bg-gray-50 rounded-xl p-4">
                    {/* 左侧：曲线图 */}
                    <div className="flex-1">
                      <CurveVisualizationLR points={curveData.luma} channel="luma" />
                    </div>
                    {/* 右侧：数据 */}
                    <div className="w-64 space-y-2">
                      {params.filter((p: any) => p.name.includes('RGB')).map((param: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 text-xs">
                          <span className="text-gray-700">{param.name}</span>
                          <span className="text-purple-600">{param.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* 颜色通道曲线 - 三个并排 */}
              {(curveData.red.length > 0 || curveData.green.length > 0 || curveData.blue.length > 0) && (
                <div>
                  <h5 className="text-gray-700 text-sm mb-3">RGB 各通道微调</h5>
                  <div className="grid grid-cols-3 gap-3">
                    {curveData.red.length > 0 && (
                      <div className="bg-red-50/50 rounded-xl p-3 border border-red-100">
                        <div className="bg-white rounded-lg p-3 mb-2">
                          <CurveVisualizationLR points={curveData.red} channel="红" />
                        </div>
                        <div className="space-y-1">
                          {params.filter((p: any) => p.name.includes('红')).map((param: any, idx: number) => (
                            <div key={idx} className="text-xs px-2 py-1 bg-white rounded text-gray-700">
                              <span className="text-red-600">{param.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {curveData.green.length > 0 && (
                      <div className="bg-green-50/50 rounded-xl p-3 border border-green-100">
                        <div className="bg-white rounded-lg p-3 mb-2">
                          <CurveVisualizationLR points={curveData.green} channel="绿" />
                        </div>
                        <div className="space-y-1">
                          {params.filter((p: any) => p.name.includes('绿')).map((param: any, idx: number) => (
                            <div key={idx} className="text-xs px-2 py-1 bg-white rounded text-gray-700">
                              <span className="text-green-600">{param.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {curveData.blue.length > 0 && (
                      <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100">
                        <div className="bg-white rounded-lg p-3 mb-2">
                          <CurveVisualizationLR points={curveData.blue} channel="蓝" />
                        </div>
                        <div className="space-y-1">
                          {params.filter((p: any) => p.name.includes('蓝')).map((param: any, idx: number) => (
                            <div key={idx} className="text-xs px-2 py-1 bg-white rounded text-gray-700">
                              <span className="text-blue-600">{param.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : isColorGradingStep && colorGradingData ? (
            <div className="space-y-4 pt-2">
              {/* 色轮可视化 */}
              <div className="bg-gradient-to-br from-gray-50 to-purple-50/30 rounded-2xl p-6">
                <ColorGradingVisualization
                  highlights={colorGradingData.highlights}
                  midtones={colorGradingData.midtones}
                  shadows={colorGradingData.shadows}
                  balance={colorGradingData.balance}
                />
              </div>
              
              {/* 详细参数列表 */}
              <details className="group">
                <summary className="cursor-pointer px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors flex items-center justify-between">
                  <span>查看详细参数</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                </summary>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {params.map((param: any, pIdx: number) => (
                    <div key={pIdx} className="flex justify-between items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg border border-purple-100">
                      <span className="text-gray-700 text-sm">{param.name}</span>
                      <span className="text-purple-600 text-sm">{param.value}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ) : params ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
              {params.map((param: any, pIdx: number) => (
                <div key={pIdx} className="flex justify-between items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg border border-purple-100">
                  <span className="text-gray-700 text-sm">{param.name}</span>
                  <span className="text-purple-600 text-sm">{param.value}</span>
                </div>
              ))}
            </div>
          ) : null}
          
          {steps && (
            <div className="space-y-2 pt-2">
              {steps.map((step: string, sIdx: number) => (
                <div key={sIdx} className="flex gap-2">
                  <span className="text-purple-400 mt-1">•</span>
                  <p className="text-gray-700 text-sm flex-1">{step}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Workflow and Tips Components
function PhotoshopDetailCard({ icon, title, color, children }: any) {
  const colorClasses: { [key: string]: { bg: string; text: string; icon: string } } = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-600' },
    pink: { bg: 'bg-pink-50', text: 'text-pink-700', icon: 'text-pink-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-600' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-700', icon: 'text-teal-600' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-700', icon: 'text-slate-600' },
    green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-600' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: 'text-indigo-600' },
  };
  
  const classes = colorClasses[color] || colorClasses.purple;
  
  return (
    <div className={`${classes.bg} border-l-4 border-${color}-400 rounded-lg p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={classes.icon}>
          {icon}
        </div>
        <h5 className={classes.text}>{title}</h5>
      </div>
      <div className="text-sm text-gray-700 space-y-2">
        {children}
      </div>
    </div>
  );
}

function WorkflowStep({ number, title, color, icon, children }: any) {
  const colorClasses: { [key: string]: { bg: string; text: string; border: string } } = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  };
  
  const classes = colorClasses[color] || colorClasses.blue;
  
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center gap-2">
        <div className={`w-10 h-10 rounded-full ${classes.bg} ${classes.border} border-2 flex items-center justify-center shrink-0`}>
          <span className={`${classes.text}`}>{number}</span>
        </div>
        <div className="flex-1 w-0.5 bg-gray-200 min-h-[20px]" />
      </div>
      <div className="flex-1 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <div className={`${classes.text}`}>
            {icon}
          </div>
          <h4 className={`${classes.text}`}>{title}</h4>
        </div>
        {children}
      </div>
    </div>
  );
}

function TipCard({ icon, title, color, children }: any) {
  const colorClasses: { [key: string]: { bg: string; iconBg: string; text: string; border: string } } = {
    orange: { bg: 'bg-orange-50', iconBg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
    green: { bg: 'bg-green-50', iconBg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
    amber: { bg: 'bg-amber-50', iconBg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200' },
    blue: { bg: 'bg-blue-50', iconBg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
  };
  
  const classes = colorClasses[color] || colorClasses.orange;
  
  return (
    <div className={`${classes.bg} ${classes.border} border rounded-xl p-5 space-y-3 transition-all hover:shadow-md`}>
      <div className="flex items-center gap-3">
        <div className={`${classes.iconBg} p-2 rounded-lg ${classes.text}`}>
          {icon}
        </div>
        <h4 className={`${classes.text}`}>{title}</h4>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">
        {children}
      </p>
    </div>
  );
}

function ReviewCard({ icon, title, color, children, fullWidth }: any) {
  const colorClasses: { [key: string]: { bg: string; iconBg: string; text: string; border: string } } = {
    blue: { bg: 'bg-blue-50', iconBg: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-200' },
    purple: { bg: 'bg-purple-50', iconBg: 'bg-purple-500', text: 'text-purple-700', border: 'border-purple-200' },
    pink: { bg: 'bg-pink-50', iconBg: 'bg-pink-500', text: 'text-pink-700', border: 'border-pink-200' },
    amber: { bg: 'bg-amber-50', iconBg: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-200' },
    teal: { bg: 'bg-teal-50', iconBg: 'bg-teal-500', text: 'text-teal-700', border: 'border-teal-200' },
    slate: { bg: 'bg-slate-50', iconBg: 'bg-slate-500', text: 'text-slate-700', border: 'border-slate-200' },
    cyan: { bg: 'bg-cyan-50', iconBg: 'bg-cyan-500', text: 'text-cyan-700', border: 'border-cyan-200' },
    emerald: { bg: 'bg-emerald-50', iconBg: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-200' },
    rose: { bg: 'bg-rose-50', iconBg: 'bg-rose-500', text: 'text-rose-700', border: 'border-rose-200' },
    red: { bg: 'bg-red-50', iconBg: 'bg-red-500', text: 'text-red-700', border: 'border-red-200' },
    green: { bg: 'bg-green-50', iconBg: 'bg-green-500', text: 'text-green-700', border: 'border-green-200' },
  };
  
  const classes = colorClasses[color] || colorClasses.blue;
  
  return (
    <div className={`${classes.bg} ${classes.border} border rounded-xl p-5 ${fullWidth ? 'col-span-full' : ''}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`${classes.iconBg} p-2 rounded-lg text-white shrink-0`}>
          {icon}
        </div>
        <div className="flex-1">
          <h4 className={`${classes.text} mb-2`}>{title}</h4>
          <p className="text-sm text-gray-700 leading-relaxed">
            {children}
          </p>
        </div>
      </div>
    </div>
  );
}

function ComparisonTable({ data }: any) {
  if (!data || data.length === 0) {
    return <p className="text-gray-500 text-sm">暂无对比数据</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="text-left py-3 px-4 text-gray-700 bg-gray-50">对比项</th>
            <th className="text-left py-3 px-4 text-blue-700 bg-blue-50">源图（参考）</th>
            <th className="text-left py-3 px-4 text-purple-700 bg-purple-50">用户图（当前）</th>
            <th className="text-left py-3 px-4 text-green-700 bg-green-50">目标/建议</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row: any, idx: number) => (
            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="py-3 px-4 text-gray-800">{row.item}</td>
              <td className="py-3 px-4 text-blue-600">{row.source}</td>
              <td className="py-3 px-4 text-purple-600">{row.user}</td>
              <td className="py-3 px-4 text-green-600">{row.target}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompositionInfoCard({ icon, label, value, subtext, color, large }: any) {
  const colorClasses: { [key: string]: { bg: string; icon: string; text: string } } = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-700' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', text: 'text-purple-700' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', text: 'text-amber-700' },
    teal: { bg: 'bg-teal-50', icon: 'text-teal-600', text: 'text-teal-700' },
    green: { bg: 'bg-green-50', icon: 'text-green-600', text: 'text-green-700' },
  };
  
  const classes = colorClasses[color] || colorClasses.blue;
  
  return (
    <div className={`${classes.bg} rounded-xl p-4 ${large ? 'h-full' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`${classes.icon} mt-0.5`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-600 mb-1">{label}</div>
          <div className={`${classes.text} mb-1`}>{value}</div>
          <div className="text-xs text-gray-600 leading-relaxed">{subtext}</div>
        </div>
      </div>
    </div>
  );
}

function CompactParameter({ icon, label, value }: any) {
  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="text-yellow-600">
          {icon}
        </div>
        <div className="text-xs text-gray-600">{label}</div>
      </div>
      <div className="text-yellow-700 pl-6">{value}</div>
    </div>
  );
}

function getColorClass(color: string) {
  const classes: { [key: string]: string } = {
    '红': 'bg-red-500',
    '橙': 'bg-orange-500',
    '黄': 'bg-yellow-500',
    '绿': 'bg-green-500',
    '青': 'bg-cyan-500',
    '蓝': 'bg-blue-500',
    '紫': 'bg-purple-500',
    '洋红': 'bg-pink-500',
  };
  return classes[color] || 'bg-gray-500';
}

// Mock data generator (same as before)
export function generateMockResults() {
  return {
    review: realGeminiReviewData,
    _oldReview: {
      visualGuidance: '照片采用经典的三分法构图，以右侧红色塔楼为视觉主体，引导观者目光从前景树木逐步过渡到中景城市建筑，最终聚焦于远景的富士山。整体视觉动线流畅自然，层次分明。',
      focusExposure: '采用较小光圈（推测 f/8-f/11），保证了从前景到远景的清晰度。曝光控制得当，高光压制恰到好处，阴影细节丰富，整体呈现出宽容度很高的平衡曝光。',
      colorDepth: '色彩以暖调为主，使用了较大的景深范围，从前景树木到远处富士山都保持清晰。色调偏暖橙，呼应日出/日落时分的自然光线，营造出治愈感。',
      compositionExpression: '构图采用多层次景深安排：前景树木作为框架，中景城市建筑铺陈，远景富士山作为点睛之笔。整体表达出一种宁静、和谐的城市与自然共存之美。',
      technicalDetails: '照片锐度适中，未过度锐化，保留了自然质感。高光区域��天空）使用了较大幅度的压制，���影提亮适度，色彩分级倾向于电影感调色，整体技���处理专业且克制。',
      equipment: '从画质、动态范围和细节表现来看，推测使用了中高端相机（如 Sony A7 系列、Canon EOS R 系列或 Fujifilm X-T 系列），传感器尺寸至少为 APS-C 或全画幅。',
      lens: '根据视角和畸变控制，推测使用了 24-70mm 焦段的标准变焦镜头，��摄焦距约在 35-50mm 之间，能够很好地平衡广角视野和透视控制。',
      technique: '拍摄时机选择在黄金时段（Golden Hour），利用自然暖光；使用三脚架稳定拍摄，确保画面清晰；可能采用了包围曝光或 HDR 技术来平衡天空与地面的光比。',
      colorMatching: '整体色调以暖橙、暖黄为主色调，搭配青蓝色的阴影，形成冷暖对比。绿色树木被去饱和并偏褐色处理，增强了复古胶片感。色彩搭配和谐统一，情绪表达到位。',
      emotion: '照片传达出宁静、治愈、温暖的情绪基调。通过柔和的暖光、压制的高光和丰富的阴影细节，营造出一种怀旧而温馨的氛围，让观者感受到城市生活的诗意一面。',
      advantages: '✓ 构图层次分明，视觉引导自然流畅\n✓ 曝光控制精准，高光阴影细节丰富\n✓ 色彩调校专业，暖调营造出强烈的情绪感染力\n✓ 技术细节处理到位，画面质感优秀\n✓ 拍摄时机选择恰当，自然光线运用出��\n✓ 整体风格统一，具有很强的辨识度和艺术性',
      comparison: [
        { item: '分辨率', source: '2048 × 1366', user: '1920 × 1080', target: '保持或提升至 4K（3840 × 2560）' },
        { item: '主体位置', source: '右侧三分之一（塔楼）', user: '居中', target: '调整至右侧三分之一，符合黄金分割' },
        { item: '宽高比', source: '3:2（横向风景）', user: '16:9', target: '裁剪为 3:2 或 4:5（社交媒体）' },
        { item: '曝光', source: '中等偏亮（152/255）', user: '中等（128/255）', target: '提升 +0.2 EV 以增强暖光感' },
        { item: '高光压制', source: '较强（-60）', user: '轻微（-20）', target: '加强至 -60 到 -65' },
        { item: '阴影提亮', source: '中等（+45）', user: '较弱（+15）', target: '提升至 +40 到 +50' },
        { item: '色温', source: '偏暖（5500-6000K）', user: '标准（5200K）', target: '增加暖调至 5800-6200K' },
        { item: '饱和度', source: '中等偏低（-5）', user: '标准（0）', target: '降低至 -5 到 -10，保持克制' },
        { item: '清晰度', source: '适中（+15）', user: '较低（0）', target: '提升至 +12 到 +18' },
        { item: '对比度', source: '适中（+12）', user: '标准（0）', target: '提升至 +10 ��� +15' },
      ],
    },
    composition: compositionMockData,
    lighting: {
      basic: {
        exposure: { range: '+0.05 到 +0.15', note: '原图总体中间偏亮，仅微提以匹配晨光' },
        contrast: { range: '+10 到 +18', note: '' },
        highlights: { range: '-55 到 -65', note: '很大幅度压高光，保留细节' },
        shadows: { range: '+35 到 +55', note: '抬阴影，展现城市与树的细节' },
        whites: { range: '+12 到 +25', note: '轻微提升使高光有\"柔光\"' },
        blacks: { range: '-8 到 -18', note: '压黑增加层次深度' },
      },
      texture: {
        texture: { range: '+6 到 +12', note: '保留细节，但别太高' },
        clarity: { range: '+6 到 +14', note: '中低量，整体画面略柔和' },
        dehaze: { range: '-2 到 +4', note: '原图略有朦胧感，轻正值可加强山体与城市，过多会破坏晨光' },
        saturation: { range: '-4 到 -8', note: '总体略去饱和，制造低饱和美感' },
        vibrance: { range: '+6 到 +14', note: '适中提升暖色活力而不溢出' },
      },
    },
    color: {
      styleKey: '照片风格关键点：高光偏暖（橙/黄），阴影偏冷（青/蓝）；整体低饱和，局部橙/褐加强',
      whiteBalance: {
        temp: { range: '+600 到 +900 K', note: '向暖色偏移，让高光呈橙黄日出感' },
        tint: { range: '+6 到 +12', note: '偏品红，微调使皮肤/树木不过绿' },
      },
      grading: {
        highlights: { hue: '≈ 35°（橙黄）', saturation: '10–18' },
        midtones: { hue: '≈ 28–40°', saturation: '6–12（中间偏暖）' },
        shadows: { hue: '≈ 200–230°（冷蓝青）', saturation: '6–12' },
        balance: '+5 到 +12（偏向高光/暖色）',
      },
      hsl: [
        { color: '红', hue: '0 → +2', saturation: '-6', luminance: '+2', note: '不大改色相' },
        { color: '橙', hue: '-4 → -8', saturation: '+8 到 +18', luminance: '+6', note: '偏红一些，主要提升饱和度' },
        { color: '黄', hue: '-6', saturation: '-6 到 -10', luminance: '+4', note: '' },
        { color: '绿', hue: '+6 到 +12', saturation: '-20 到 -35', luminance: '-6 到 -12', note: '偏青，显著降低饱和度，暗化' },
        { color: '青', hue: '+4', saturation: '-6 到 -12', luminance: '+6', note: '' },
        { color: '蓝', hue: '-6 到 -10', saturation: '-4 到 +6', luminance: '+8', note: '偏青，提亮天空' },
      ],
      hslNote: '上面的方向是为了让树/城市变得偏褐/暖而不是鲜绿，同时把天空和远山保持冷色与通透感',
      curves: {
        luma: [
          { point: '(0, 10)', label: '阴影', note: '把黑提升一点' },
          { point: '(60, 58)', label: '暗部', note: '轻微抬暗部' },
          { point: '(128, 138)', label: '中间', note: '中间调略提' },
          { point: '(200, 210)', label: '高光', note: '保留高光但不溢' },
          { point: '(245, 238)', label: '极端高光', note: '压顶端' },
        ],
        rgb: [
          { 
            name: '红',
            channel: '红通道',
            adjustment: '中高调 +5 到 +8',
            note: '暖化高光',
            points: [
              { point: '(128, 128)', label: '中调', note: '保持' },
              { point: '(180, 188)', label: '高光', note: '+8' },
              { point: '(220, 225)', label: '亮部', note: '+5' },
            ]
          },
          { 
            name: '蓝',
            channel: '蓝通道',
            adjustment: '阴影区 -6 到 -12',
            note: '让阴影偏青/蓝',
            points: [
              { point: '(30, 18)', label: '暗部', note: '-12' },
              { point: '(60, 54)', label: '阴影', note: '-6' },
              { point: '(128, 128)', label: '中调', note: '保持' },
            ]
          },
          { 
            name: '绿',
            channel: '绿通道',
            adjustment: '中间调 -3 到 -6',
            note: '轻微降低',
            points: [
              { point: '(100, 97)', label: '中暗', note: '-3' },
              { point: '(150, 144)', label: '中亮', note: '-6' },
            ]
          },
        ],
      },
      colorContrast: [
        '通过局部选择性（右侧塔到太阳方向）加上橙色渐变叠加增强暖光区',
        'Photoshop 中使用渐变叠加/柔光模式',
        '对比度在塔与山之间制造过渡而不是突兀',
      ],
    },
    lightroom: [
      {
        title: '基本面板',
        icon: <Sun className="w-5 h-5" />,
        params: [
          { name: '色温 Temperature', value: '+200 到 +400（5800-6200K）' },
          { name: '色调 Tint', value: '-2 到 +4' },
          { name: '曝光 Exposure', value: '+0.05 到 +0.15' },
          { name: '对比度 Contrast', value: '+10 到 +18' },
          { name: '高光 Highlights', value: '-55 到 -65' },
          { name: '阴影 Shadows', value: '+35 到 +55' },
          { name: '白色 Whites', value: '+12 到 +25' },
          { name: '黑色 Blacks', value: '-8 到 -18' },
        ],
      },
      {
        title: '细节与质感',
        icon: <Focus className="w-5 h-5" />,
        params: [
          { name: '纹理 Texture', value: '+6 到 +12' },
          { name: '清晰度 Clarity', value: '+6 到 +14' },
          { name: '去雾 Dehaze', value: '-2 到 +4' },
        ],
      },
      {
        title: '色彩调整',
        icon: <Palette className="w-5 h-5" />,
        params: [
          { name: '饱和度 Saturation', value: '-4 到 -8' },
          { name: '自然饱和度 Vibrance', value: '+6 到 +14' },
        ],
      },
      {
        title: 'HSL / 颜色',
        icon: <Palette className="w-5 h-5" />,
        params: [
          { name: '橙色饱和度', value: '+8 到 +18' },
          { name: '橙色色相', value: '-4 到 -8（偏红）' },
          { name: '绿色饱和度', value: '-20 到 -35' },
          { name: '绿色明度', value: '-6 到 -12' },
          { name: '蓝色明度', value: '+8' },
        ],
      },
      {
        title: '色调分离',
        icon: <Sliders className="w-5 h-5" />,
        params: [
          { name: '高光色相', value: '35°（橙黄）' },
          { name: '高光饱和度', value: '10–18' },
          { name: '阴影色相', value: '200–230°（冷蓝青）' },
          { name: '阴影饱和度', value: '6–12' },
          { name: '平衡', value: '+5 到 +12（偏向高光）' },
        ],
      },
      {
        title: '色调曲线',
        icon: <TrendingUp className="w-5 h-5" />,
        params: [
          { name: '亮度曲线', value: 'S 型轻微提升中间调' },
          { name: '红通道高光', value: '+5 到 +8' },
          { name: '蓝通道阴影', value: '-6 到 -12' },
          { name: '绿通道中间调', value: '-3 到 -6' },
        ],
      },
    ],
    photoshop: [
      {
        title: '📸 Camera Raw 基础调整',
        description: '应用 ACR 滤镜，复用 Lightroom 参数作为调整基础',
        params: [
          { name: '曝光', value: '+0.10', reason: '微提亮度匹配源照片晨光氛围' },
          { name: '对比度', value: '+14', reason: '增强画面层次感和视觉冲击力' },
          { name: '高光', value: '-60', reason: '大幅压制高光，保留天空细节，防止过曝' },
          { name: '阴影', value: '+45', reason: '提亮暗部，展现城市和树木的细节层次' },
          { name: '白色', value: '+18', reason: '轻微提升白色点，营造柔光效果' },
          { name: '黑色', value: '-13', reason: '适度压黑，增加画面深度和对比' },
          { name: '色温', value: '+700K', reason: '向暖色偏移，模拟日出/日落黄金时段' },
          { name: '色调', value: '+8', reason: '微调品红方向，避免画面过绿' },
        ],
        details: '打开照片后，选择 滤镜 > Camera Raw 滤镜，在基本面板中按照以上参数调整。这一步是整个后期流程的基础，确立画面的基本色调和曝光。',
      },
      {
        title: '🎨 色彩分级（分离色调）',
        description: '使用曲线和色彩平衡实现高光暖调、阴影冷调的电影感',
        params: [
          { name: 'RGB 曲线 - 中间调', value: '输入 128 → 输出 138', reason: '轻微提升中间调亮度，保持画面通透' },
          { name: 'RGB 曲线 - 暗部', value: '输入 60 → 输出 58', reason: '暗部略微抬升，避免死黑' },
          { name: 'RGB 曲线 - 亮部', value: '输入 200 → 输出 210', reason: '高光适度保留，防止溢出' },
          { name: '红通道 - 高光', value: '+8', reason: '为高光区域添加暖红色，营造日出氛围' },
          { name: '蓝通道 - 阴影', value: '-10', reason: '在阴影区域减少蓝色，形成冷暖对比' },
          { name: '绿通道 - 中间调', value: '-5', reason: '减少绿色通道，让画面偏洋红/褐色' },
        ],
        details: '新建曲线调整图层，先在 RGB 通道调整整体明暗关系，然后分别在红、绿、蓝通道精细调整。这是实现电影感色调分离的关键步骤。',
        blendMode: '正常',
        opacity: '100%',
      },
      {
        title: '🌈 HSL 精细调色',
        description: '针对性调整特定颜色，降低绿色饱和度，增强橙色表现力',
        params: [
          { name: '橙色 - 色相', value: '-6', reason: '让橙色偏向红色，增强温暖感' },
          { name: '橙色 - 饱和度', value: '+12', reason: '提升橙色饱和度，强化日落/日出氛围' },
          { name: '橙色 - 明度', value: '+6', reason: '提亮橙色区域，使其更突出' },
          { name: '绿色 - 色相', value: '+10', reason: '让绿色偏青，减少鲜艳感' },
          { name: '绿色 - 饱和度', value: '-28', reason: '大幅降低绿色饱和度，使植被呈现褐色/橄榄色' },
          { name: '绿色 - 明度', value: '-9', reason: '压暗绿色，让树木融入暗部氛围' },
          { name: '蓝色 - 明度', value: '+8', reason: '提亮蓝色，增强天空的通透感' },
        ],
        details: '在 Camera Raw 滤镜中切换到 HSL/颜色 面板，按照以上参数调整各个颜色。这一步能精准控制画面中特定色彩的表现。',
      },
      {
        title: '🖌️ 可选颜色精调',
        description: '使用可选颜色工具进行 CMYK 四色微调，实现更专业的调色',
        params: [
          { name: '红色 - 青色', value: '-10%', reason: '减少红色中的青色成分，让红色更纯净' },
          { name: '红色 - 洋红', value: '+8%', reason: '增加洋红，让红色更饱满' },
          { name: '黄色 - 洋红', value: '+12%', reason: '让黄色偏橙，增强暖调' },
          { name: '黄色 - 黄色', value: '-6%', reason: '适度降低黄色纯度，避免过艳' },
          { name: '绿色 - 黄色', value: '+15%', reason: '让绿色偏黄褐色，符合源照片风格' },
          { name: '青色 - 青色', value: '-8%', reason: '降低青色纯度，保持低饱和美感' },
        ],
        details: '新建可选颜色调整图层（图层 > 新建调整图层 > 可选颜色），针对红、黄、绿、青等颜色进行 CMYK 微调。这是专业调色师常用的技巧。',
        blendMode: '正常',
        opacity: '80%',
      },
      {
        title: '✨ 局部光影塑造',
        description: '使用减淡/加深工具和蒙版，强化局部光影效果',
        params: [
          { name: '减淡工具 - 范围', value: '高光', reason: '仅作用于高光区域，避免影响暗部' },
          { name: '减淡工具 - 曝光度', value: '15-20%', reason: '轻微提亮，模拟自然光线' },
          { name: '加深工具 - 范围', value: '阴影', reason: '针对性压暗阴影，增强层次' },
          { name: '加深工具 - 曝光度', value: '10-15%', reason: '适度加深，避免死黑' },
        ],
        details: '新建空白图层，设置为 "柔光" 混合模式。使用减淡工具（O键）在需要提亮的区域（如建筑顶部、远山）轻刷；使用加深工具在前景暗部轻刷，增强立体感。',
        blendMode: '柔光',
        opacity: '60%',
      },
      {
        title: '🌅 氛围光晕添加',
        description: '手绘光晕效果，模拟日出/日落的温暖光线',
        params: [
          { name: '画笔硬度', value: '0%', reason: '使用完全柔边画笔，确保光晕自然过渡' },
          { name: '画笔不透明度', value: '8-12%', reason: '低不透明度多次叠加，避免生硬' },
          { name: '前景色', value: '#F4A460（橙黄色）', reason: '模拟黄金时段的暖光色温' },
          { name: '流量', value: '30%', reason: '控制颜色输出，便于精细控制' },
        ],
        details: '新建空白图层，使用大号柔边画笔（B键），在画面右侧（塔楼和富士山方向）轻刷橙黄色，模拟日出光线。图层混合模式设为 "滤色" 或 "柔光"，不透明度 20-35%。',
        blendMode: '滤色',
        opacity: '25%',
      },
      {
        title: '🔍 细节锐化',
        description: '使用高反差保留或 USM 锐化增强细节清晰度',
        params: [
          { name: '锐化方式', value: 'USM 锐化', reason: '对照片类图像效果最佳，可精确控制参数' },
          { name: '数量', value: '85%', reason: '适中强度，增强细节但不过度' },
          { name: '半径', value: '1.2px', reason: '适合高分辨率照片的锐化半径' },
          { name: '阈值', value: '3', reason: '避免锐化平滑区域（如天空），减少噪点' },
        ],
        details: '按 Ctrl+Alt+Shift+E 盖印所有可见图层，转为智能对象（右键 > 转换为智能对象）。执行 滤镜 > 锐化 > USM锐化，按照参数调整。锐化后可通过蒙版控制作用区域。',
      },
      {
        title: '🎞️ 胶片颗粒与质感',
        description: '添加细微颗粒效果，营造胶片质感和怀旧氛围',
        params: [
          { name: '颗粒类型', value: 'Camera Raw 颗粒', reason: 'ACR 的颗粒效果比 PS 杂色滤镜更自然' },
          { name: '数量', value: '18-25', reason: '适度的颗粒感，增强质感但不抢眼' },
          { name: '大小', value: '35-40', reason: '中等颗粒大小，模拟胶片效果' },
          { name: '粗糙度', value: '50', reason: '平衡自然感和规律性' },
        ],
        details: '在 Camera Raw 滤镜的 "效果" 面板中，找到 "颗粒" 选项，按照参数调整。颗粒会让画面更有质感，减少数码感。',
      },
      {
        title: '🌓 暗角与边缘处理',
        description: '添加自然暗角，引导视觉焦点，增强画面氛围',
        params: [
          { name: '暗角数量', value: '-15 到 -20', reason: '轻微暗角，不影响主体但增强聚焦感' },
          { name: '中点', value: '50', reason: '暗角从画面中等位置开始过渡' },
          { name: '圆度', value: '0', reason: '保持自然的椭圆形暗角' },
          { name: '羽化', value: '80', reason: '高羽化值确保暗角自然柔和' },
        ],
        details: '在 Camera Raw 滤镜的 "效果" 面板中，调整 "镜头晕影" 选项。或者新建曲线调整图层，添加蒙版，使用渐变工具在四周拉出暗角效果。',
      },
      {
        title: '🎯 最终色阶与输出',
        description: '微调整体色阶，确保完美的黑白场，准备导出',
        params: [
          { name: '黑场输入', value: '3-5', reason: '轻微提升黑场，避免纯黑，保留暗部细节' },
          { name: '白场输入', value: '250-252', reason: '轻微压低白场，防止高光溢出' },
          { name: '中间调灰度', value: '1.02', reason: '微调中间调，整体略提亮' },
        ],
        details: '新建色阶调整图层（图层 > 新建调整图层 > 色阶），观察直方图，微调黑白场滑块。完成后合并所有图层，转换为 sRGB 色彩空间，导出为 JPEG（品质 90-95%）或 PNG。',
        blendMode: '正常',
        opacity: '100%',
      },
    ],
  };
}