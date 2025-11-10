import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  FileText, 
  Code2, 
  Copy, 
  CheckCircle2, 
  X,
  FileDown,
  Sparkles,
  Info,
  ChevronRight,
  Eye,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PDFPreview } from './PDFPreview';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: any;
}

export function ExportDialog({ open, onOpenChange, results }: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'xml' | 'text'>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);

  if (!open) return null;

  // 生成XML格式（适用于Photoshop）
  const generateXML = () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<photoshop-adjustment-preset>
  <metadata>
    <name>AI Style Clone Preset</name>
    <description>AI生成的照片风格克隆调整方案</description>
    <version>1.0</version>
  </metadata>
  
  <!-- Camera Raw / Lightroom 基础调整 -->
  <basic-adjustments>
    <exposure value="${results.lighting.basic.exposure.range}" />
    <contrast value="${results.lighting.basic.contrast.range}" />
    <highlights value="${results.lighting.basic.highlights.range}" />
    <shadows value="${results.lighting.basic.shadows.range}" />
    <whites value="${results.lighting.basic.whites.range}" />
    <blacks value="${results.lighting.basic.blacks.range}" />
    <texture value="${results.lighting.texture.texture.range}" />
    <clarity value="${results.lighting.texture.clarity.range}" />
    <dehaze value="${results.lighting.texture.dehaze.range}" />
    <saturation value="${results.lighting.texture.saturation.range}" />
    <vibrance value="${results.lighting.texture.vibrance.range}" />
  </basic-adjustments>
  
  <!-- 白平衡 -->
  <white-balance>
    <temperature value="${results.color.whiteBalance.temp.range}" />
    <tint value="${results.color.whiteBalance.tint.range}" />
  </white-balance>
  
  <!-- 色彩分级 -->
  <color-grading>
    <highlights hue="${results.color.grading.highlights.hue}" saturation="${results.color.grading.highlights.saturation}" />
    <midtones hue="${results.color.grading.midtones.hue}" saturation="${results.color.grading.midtones.saturation}" />
    <shadows hue="${results.color.grading.shadows.hue}" saturation="${results.color.grading.shadows.saturation}" />
    <balance value="${results.color.grading.balance}" />
  </color-grading>
  
  <!-- HSL调整 -->
  <hsl-adjustments>
    ${results.color.hsl.map((hsl: any) => `
    <color name="${hsl.color}">
      <hue value="${hsl.hue}" />
      <saturation value="${hsl.saturation}" />
      <luminance value="${hsl.luminance}" />
    </color>`).join('')}
  </hsl-adjustments>
  
  <!-- 曲线调整 -->
  <tone-curve>
    <luma-curve>
      ${results.color.curves.luma.map((point: any) => `
      <point input="${point.point.split(',')[0].replace('(', '')}" output="${point.point.split(',')[1].replace(')', '')}" label="${point.label}" />`).join('')}
    </luma-curve>
    <rgb-curves>
      ${results.color.curves.rgb.map((curve: any) => `
      <channel name="${curve.name}">
        ${curve.points.map((point: any) => `
        <point input="${point.point.split(',')[0].replace('(', '')}" output="${point.point.split(',')[1].replace(')', '')}" label="${point.label}" />`).join('')}
      </channel>`).join('')}
    </rgb-curves>
  </tone-curve>
</photoshop-adjustment-preset>`;
    return xml;
  };

  // 生成纯文本格式
  const generateText = () => {
    return `照片风格克隆调整方案
================================

⭐ 专业摄影师评价
${results.review.photographer}

🎨 构图与焦点分析
分辨率: ${results.composition.basicInfo.resolution}
宽高比: ${results.composition.basicInfo.aspectRatio}
主体位置: ${results.composition.basicInfo.subjectPosition}

☀️ 光影参数
- 曝光: ${results.lighting.basic.exposure.range}
- 对比度: ${results.lighting.basic.contrast.range}
- 高光: ${results.lighting.basic.highlights.range}
- 阴影: ${results.lighting.basic.shadows.range}
- 白色: ${results.lighting.basic.whites.range}
- 黑色: ${results.lighting.basic.blacks.range}

🌈 色彩方案
色温: ${results.color.whiteBalance.temp.range}
色调: ${results.color.whiteBalance.tint.range}

色彩分级:
- 高光: 色相 ${results.color.grading.highlights.hue}，饱和度 ${results.color.grading.highlights.saturation}
- 中间调: 色相 ${results.color.grading.midtones.hue}，饱和度 ${results.color.grading.midtones.saturation}
- 阴影: 色相 ${results.color.grading.shadows.hue}，饱和度 ${results.color.grading.shadows.saturation}

HSL 调整:
${results.color.hsl.map((hsl: any) => `- ${hsl.color}: 色相 ${hsl.hue}, 饱和度 ${hsl.saturation}, 明度 ${hsl.luminance}`).join('\n')}
`;
  };

  // 导出为PDF（模拟）
  const exportToPDF = async () => {
    setIsExporting(true);
    
    // 模拟导出过程
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsExporting(false);
    toast.success('PDF 导出成功！', {
      description: '调整方案已保存为 PDF 文件'
    });
    setShowPDFPreview(false);
    onOpenChange(false);
  };

  // 显示PDF预览
  const showPreview = () => {
    setShowPDFPreview(true);
  };

  // 导出为XML
  const exportToXML = () => {
    const xml = generateXML();
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'photoshop-adjustment-preset.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('XML 导出成功！', {
      description: '可以直接导入到 Photoshop 中使用'
    });
  };

  // 复制到剪贴板
  const copyToClipboard = async () => {
    const text = generateText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('复制成功！', {
        description: '调整方案已复制到剪贴板'
      });
    } catch (err) {
      toast.error('复制失败', {
        description: '请手动复制内容'
      });
    }
  };

  const formats = [
    {
      id: 'pdf',
      name: 'PDF 文档',
      description: '完整的调整方案，适合打印和分享',
      icon: FileText,
      color: 'from-red-500 to-orange-500',
      action: exportToPDF
    },
    {
      id: 'xml',
      name: 'XML 预设',
      description: '可直接导入 Photoshop Camera Raw',
      icon: Code2,
      color: 'from-purple-500 to-pink-500',
      action: exportToXML
    },
    {
      id: 'text',
      name: '纯文本',
      description: '复制到剪贴板，方便粘贴使用',
      icon: Copy,
      color: 'from-blue-500 to-cyan-500',
      action: copyToClipboard
    }
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
          />

          {/* 模态框 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
            className="relative w-full max-w-2xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100/80 hover:bg-gray-200/80 flex items-center justify-center transition-colors z-10"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>

            <div className="p-8">
              {/* 标题 */}
              {!showPDFPreview ? (
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.1, stiffness: 200, damping: 15 }}
                    className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 items-center justify-center mb-4"
                  >
                    <Download className="w-8 h-8 text-blue-600" />
                  </motion.div>
                  
                  <h2 className="text-gray-900 text-2xl mb-2">
                    导出调整方案
                  </h2>
                  <p className="text-gray-500 text-sm">
                    选择合适的格式导出 AI 生成的调整方案
                  </p>
                </div>
              ) : (
                <div className="mb-6">
                  <button
                    onClick={() => setShowPDFPreview(false)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm">返回格式选择</span>
                  </button>
                  <h2 className="text-gray-900 text-2xl mb-2">
                    PDF 预览
                  </h2>
                  <p className="text-gray-500 text-sm">
                    预览导出效果，确认无误后点击导出
                  </p>
                </div>
              )}

              {/* 内容区域 */}
              {showPDFPreview ? (
                <div className="mb-6">
                  <PDFPreview results={results} />
                </div>
              ) : (
                <>
              {/* 格式选项 */}
              <div className="space-y-3 mb-6">
                {formats.map((format, index) => {
                  const Icon = format.icon;
                  const isSelected = selectedFormat === format.id;
                  
                  return (
                    <motion.button
                      key={format.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setSelectedFormat(format.id as any)}
                      className={`w-full p-5 rounded-2xl border-2 transition-all text-left group ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-500/10'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* 图标 */}
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${format.color} flex items-center justify-center shadow-lg`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        
                        {/* 内容 */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-gray-900">{format.name}</h3>
                            {format.id === 'xml' && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                PS 专用
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{format.description}</p>
                        </div>
                        
                        {/* 选中指示器 */}
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: isSelected ? 1 : 0 }}
                          className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"
                        >
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </motion.div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* XML格式说明 */}
              {selectedFormat === 'xml' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 p-4 bg-purple-50/80 rounded-xl border border-purple-100/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
                      <Info className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-purple-900 mb-2 text-sm">如何在 Photoshop 中使用</div>
                      <div className="space-y-1 text-sm text-purple-700/90">
                        <p>1. 在 Photoshop 中打开目标图片</p>
                        <p>2. 进入 Camera Raw 滤镜（Shift + Cmd/Ctrl + A）</p>
                        <p>3. 点击预设面板右上角菜单 → "载入设置"</p>
                        <p>4. 选择导出的 XML 文件即可应用所有调整</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

                </>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-3">
                {/* 重新设计的取消按钮 */}
                <motion.button
                  onClick={() => {
                    setShowPDFPreview(false);
                    onOpenChange(false);
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 h-12 rounded-xl bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 transition-all shadow-sm hover:shadow-md relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <X className="w-4 h-4" />
                    取消
                  </span>
                  <motion.div
                    initial={{ scale: 0, opacity: 0.5 }}
                    whileHover={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 bg-gray-200 rounded-xl"
                  />
                </motion.button>
                
                {/* 主操作按钮 - PDF预览或导出 */}
                {showPDFPreview ? (
                  <motion.button
                    onClick={exportToPDF}
                    disabled={isExporting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                  >
                    {isExporting ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Sparkles className="w-5 h-5" />
                        </motion.div>
                        导出中...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <FileDown className="w-5 h-5" />
                        确认导出 PDF
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={() => {
                      if (selectedFormat === 'pdf') {
                        showPreview();
                      } else {
                        const selected = formats.find(f => f.id === selectedFormat);
                        selected?.action();
                      }
                    }}
                    disabled={isExporting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                  >
                    <span className="flex items-center justify-center gap-2">
                      {selectedFormat === 'pdf' ? (
                        <>
                          <Eye className="w-5 h-5" />
                          预览 PDF
                        </>
                      ) : (
                        <>
                          <FileDown className="w-5 h-5" />
                          {selectedFormat === 'text' ? '复制' : '导出'}
                        </>
                      )}
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
