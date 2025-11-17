import { X, Download, FileText } from 'lucide-react';
import { motion } from 'motion/react';

interface ColorCloningReportProps {
  open: boolean;
  onClose: () => void;
  results: any;
  sourceImageUrl: string;
  targetImageUrl: string;
}

export function ColorCloningReport({ 
  open, 
  onClose, 
  results,
  sourceImageUrl,
  targetImageUrl 
}: ColorCloningReportProps) {
  if (!open) return null;

  const handleDownload = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* 报告容器 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-5xl max-h-[90vh] mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* 顶部工具栏 */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-indigo-600" />
            <h2 className="text-gray-900" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              仿色分析报告
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <motion.button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ fontWeight: 600 }}
            >
              <Download className="w-4 h-4" />
              下载报告
            </motion.button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white hover:bg-gray-100 flex items-center justify-center transition-colors border border-gray-200"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* 报告内容 - 可滚动 */}
        <div className="flex-1 overflow-y-auto">
          <div id="report-content" className="p-12 bg-white">
            {/* 论文样式的报告 */}
            <ReportContent 
              results={results}
              sourceImageUrl={sourceImageUrl}
              targetImageUrl={targetImageUrl}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ReportContent({ results, sourceImageUrl, targetImageUrl }: any) {
  // 默认数据和安全检查 - 确保所有数据都是数组
  const reviewDimensions = Array.isArray(results?.review?.dimensions) 
    ? results.review.dimensions 
    : [
        { name: '构图布局', score: 8.5, description: '采用三分法构图，视觉平衡性好' },
        { name: '光影控制', score: 9.0, description: '曝光准确，高光阴影细节丰富' },
        { name: '色彩表现', score: 8.0, description: '色调统一，暖色调营造氛围感' },
        { name: '清晰度', score: 8.5, description: '对焦准确，细节清晰' },
        { name: '创意性', score: 7.5, description: '拍摄角度常规，构图稳健' },
      ];
  
  const compositionPrinciples = Array.isArray(results?.composition?.principles)
    ? results.composition.principles
    : [
        { name: '三分法则', description: '主体位于画面黄金分割点，符合视觉审美规律' },
        { name: '引导线', description: '利用前景元素引导视线至主体' },
        { name: '层次感', description: '前景、中景、远景层次分明，增强空间感' },
      ];
  
  const lightingParameters = Array.isArray(results?.lighting?.parameters)
    ? results.lighting.parameters
    : [
        { name: '曝光', source: '+0.3 EV', target: '0 EV', adjustment: '+0.3 EV' },
        { name: '对比度', source: '+15', target: '0', adjustment: '+15' },
        { name: '高光', source: '-60', target: '-20', adjustment: '-40' },
        { name: '阴影', source: '+45', target: '+15', adjustment: '+30' },
      ];
  
  const sourceColors = results?.color?.sourceColors || [
    { hex: '#E8A87C', percentage: 35 },
    { hex: '#5C8AA8', percentage: 25 },
    { hex: '#3A5F4C', percentage: 20 },
    { hex: '#F4D5B0', percentage: 20 },
  ];
  
  const targetColors = results?.color?.targetColors || [
    { hex: '#A8C0D8', percentage: 30 },
    { hex: '#E0E8F0', percentage: 28 },
    { hex: '#6C8EA8', percentage: 22 },
    { hex: '#B8C8D8', percentage: 20 },
  ];
  
  const hslAdjustments = results?.color?.hsl || [
    { hue: '红色', hueShift: '+2', saturation: '-6', luminance: '+2' },
    { hue: '橙色', hueShift: '-6', saturation: '+12', luminance: '+6' },
    { hue: '黄色', hueShift: '-6', saturation: '-8', luminance: '+4' },
    { hue: '绿色', hueShift: '+10', saturation: '-28', luminance: '-9' },
    { hue: '青色', hueShift: '+4', saturation: '-9', luminance: '+6' },
    { hue: '蓝色', hueShift: '-8', saturation: '0', luminance: '+8' },
  ];
  
  const lrBasic = results?.lightroom?.basic || [
    { name: '曝光', value: '+0.10', description: '微提亮度匹配晨光氛围' },
    { name: '对比度', value: '+14', description: '增强画面层次感' },
    { name: '高光', value: '-60', description: '大幅压制保留细节' },
    { name: '阴影', value: '+45', description: '提亮展现细节' },
    { name: '白色', value: '+18', description: '柔光效果' },
    { name: '黑色', value: '-13', description: '增加深度' },
  ];
  
  const psLayers = results?.photoshop?.layers || [
    { 
      name: 'Camera Raw 滤镜', 
      description: '应用与 Lightroom 相同的基础参数调整',
      settings: { '曝光': '+0.10', '对比度': '+14', '高光': '-60', '阴影': '+45' }
    },
    { 
      name: '色彩查找表 (LUT)', 
      description: '选择暖调电影感预设，不透明度 60-80%',
      settings: null
    },
    { 
      name: '曲线调整层', 
      description: '精细调整 RGB 通道实现冷暖分离',
      settings: { '红通道高光': '+8', '蓝通道阴影': '-10' }
    },
    { 
      name: '色相/饱和度', 
      description: '针对绿色降低饱和度 -25，使植被偏褐色',
      settings: null
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 text-gray-900">
      {/* 报告标题 */}
      <div className="text-center pb-8 border-b-2 border-gray-900">
        <h1 className="mb-4" style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
          照片风格克隆分析报告
        </h1>
        <p className="text-gray-600 mb-2">Photo Style Cloning Analysis Report</p>
        <p className="text-gray-500 text-sm">生成日期：{new Date().toLocaleDateString('zh-CN')}</p>
      </div>

      {/* 摘要 */}
      <section>
        <h2 className="mb-4 pb-2 border-b border-gray-300" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          摘要 (Abstract)
        </h2>
        <p className="leading-relaxed text-gray-700" style={{ textAlign: 'justify', lineHeight: '1.8' }}>
          本报告基于深度学习算法对源照片与目标照片进行了全方位的风格分析，涵盖构图、光影、色彩三大维度，
          并提供了详细的 Adobe Lightroom 和 Photoshop 调整方案。通过对照片的多维度量化分析，
          为实现精准的风格克隆提供科学依据和可操作的调整参数。
        </p>
      </section>

      {/* 图像对比 */}
      <section>
        <h2 className="mb-6 pb-2 border-b border-gray-300" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          1. 图像对比分析
        </h2>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <div className="aspect-[4/3] rounded-xl overflow-hidden border-2 border-gray-300 mb-3">
              <img src={sourceImageUrl} alt="源图" className="w-full h-full object-cover" />
            </div>
            <p className="text-center" style={{ fontWeight: 600 }}>图1-1 源照片（参考风格）</p>
          </div>
          <div>
            <div className="aspect-[4/3] rounded-xl overflow-hidden border-2 border-gray-300 mb-3">
              <img src={targetImageUrl} alt="目标图" className="w-full h-full object-cover" />
            </div>
            <p className="text-center" style={{ fontWeight: 600 }}>图1-2 目标照片（待调整）</p>
          </div>
        </div>
      </section>

      {/* 2. 构图与焦点分析 */}
      <section>
        <h2 className="mb-6 pb-2 border-b border-gray-300" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          2. 构图与焦点分析
        </h2>
        
        <h3 className="mb-3" style={{ fontSize: '1.125rem', fontWeight: 600 }}>2.1 构图维度评估</h3>
        <div className="mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left" style={{ fontWeight: 600 }}>维度</th>
                <th className="border border-gray-300 px-4 py-2 text-left" style={{ fontWeight: 600 }}>评分</th>
                <th className="border border-gray-300 px-4 py-2 text-left" style={{ fontWeight: 600 }}>描述</th>
              </tr>
            </thead>
            <tbody>
              {reviewDimensions.map((dim: any, i: number) => (
                <tr key={i}>
                  <td className="border border-gray-300 px-4 py-2">{dim.name}</td>
                  <td className="border border-gray-300 px-4 py-2">{dim.score}/10</td>
                  <td className="border border-gray-300 px-4 py-2">{dim.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mb-3" style={{ fontSize: '1.125rem', fontWeight: 600 }}>2.2 构图原则应用</h3>
        <ul className="space-y-2 ml-6 list-disc text-gray-700">
          {compositionPrinciples.map((principle: any, i: number) => (
            <li key={i} style={{ lineHeight: '1.8' }}>
              <strong>{principle.name}：</strong>{principle.description}
            </li>
          ))}
        </ul>
      </section>

      {/* 3. 光影参数分析 */}
      <section>
        <h2 className="mb-6 pb-2 border-b border-gray-300" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          3. 光影参数分析
        </h2>
        
        <h3 className="mb-3" style={{ fontSize: '1.125rem', fontWeight: 600 }}>3.1 曝光参数对比</h3>
        <div className="mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left" style={{ fontWeight: 600 }}>参数</th>
                <th className="border border-gray-300 px-4 py-2 text-left" style={{ fontWeight: 600 }}>源照片</th>
                <th className="border border-gray-300 px-4 py-2 text-left" style={{ fontWeight: 600 }}>目标照片</th>
                <th className="border border-gray-300 px-4 py-2 text-left" style={{ fontWeight: 600 }}>调整建议</th>
              </tr>
            </thead>
            <tbody>
              {lightingParameters.map((param: any, i: number) => (
                <tr key={i}>
                  <td className="border border-gray-300 px-4 py-2">{param.name}</td>
                  <td className="border border-gray-300 px-4 py-2">{param.source}</td>
                  <td className="border border-gray-300 px-4 py-2">{param.target}</td>
                  <td className="border border-gray-300 px-4 py-2">{param.adjustment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mb-3" style={{ fontSize: '1.125rem', fontWeight: 600 }}>3.2 色调曲线调整</h3>
        <p className="text-gray-700 leading-relaxed mb-4" style={{ lineHeight: '1.8' }}>
          {results?.lighting?.curveAdjustment || '基于源照片的色调分布，建议采用 S 型曲线提升对比度，暗部抬高 15 单位，亮部压低 10 单位，中间调保持不变。'}
        </p>
      </section>

      {/* 4. 色彩方案分析 */}
      <section>
        <h2 className="mb-6 pb-2 border-b border-gray-300" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          4. 色彩方案分析
        </h2>
        
        <h3 className="mb-3" style={{ fontSize: '1.125rem', fontWeight: 600 }}>4.1 色彩分布</h3>
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="mb-3" style={{ fontWeight: 600 }}>源照片主色调</p>
              <div className="flex gap-2">
                {sourceColors.map((color: any, i: number) => (
                  <div key={i} className="flex-1">
                    <div 
                      className="h-16 rounded-lg border border-gray-300 mb-2" 
                      style={{ backgroundColor: color.hex }}
                    />
                    <p className="text-xs text-center text-gray-600">{color.percentage}%</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3" style={{ fontWeight: 600 }}>目标照片主色调</p>
              <div className="flex gap-2">
                {targetColors.map((color: any, i: number) => (
                  <div key={i} className="flex-1">
                    <div 
                      className="h-16 rounded-lg border border-gray-300 mb-2" 
                      style={{ backgroundColor: color.hex }}
                    />
                    <p className="text-xs text-center text-gray-600">{color.percentage}%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <h3 className="mb-3" style={{ fontSize: '1.125rem', fontWeight: 600 }}>4.2 HSL 调整方案</h3>
        <div className="mb-6">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left" style={{ fontWeight: 600 }}>色相</th>
                <th className="border border-gray-300 px-3 py-2 text-left" style={{ fontWeight: 600 }}>色相偏移</th>
                <th className="border border-gray-300 px-3 py-2 text-left" style={{ fontWeight: 600 }}>饱和度</th>
                <th className="border border-gray-300 px-3 py-2 text-left" style={{ fontWeight: 600 }}>明度</th>
              </tr>
            </thead>
            <tbody>
              {hslAdjustments.map((adj: any, i: number) => (
                <tr key={i}>
                  <td className="border border-gray-300 px-3 py-2">{adj.hue}</td>
                  <td className="border border-gray-300 px-3 py-2">{adj.hueShift}</td>
                  <td className="border border-gray-300 px-3 py-2">{adj.saturation}</td>
                  <td className="border border-gray-300 px-3 py-2">{adj.luminance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Lightroom 调整方案 */}
      <section>
        <h2 className="mb-6 pb-2 border-b border-gray-300" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          5. Adobe Lightroom 调整方案
        </h2>
        
        <h3 className="mb-3" style={{ fontSize: '1.125rem', fontWeight: 600 }}>5.1 基本面板</h3>
        <div className="mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left" style={{ fontWeight: 600 }}>参数</th>
                <th className="border border-gray-300 px-4 py-2 text-left" style={{ fontWeight: 600 }}>数值</th>
                <th className="border border-gray-300 px-4 py-2 text-left" style={{ fontWeight: 600 }}>说明</th>
              </tr>
            </thead>
            <tbody>
              {lrBasic.map((param: any, i: number) => (
                <tr key={i}>
                  <td className="border border-gray-300 px-4 py-2">{param.name}</td>
                  <td className="border border-gray-300 px-4 py-2">{param.value}</td>
                  <td className="border border-gray-300 px-4 py-2">{param.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mb-3" style={{ fontSize: '1.125rem', fontWeight: 600 }}>5.2 色调曲线</h3>
        <p className="text-gray-700 leading-relaxed mb-4" style={{ lineHeight: '1.8' }}>
          {results?.lightroom?.toneCurve || '建议使用线性曲线作为基础，在暗部（输入 0-64）提升 20%，高光部分（输入 192-255）降低 15%，以增强整体对比度。'}
        </p>

        <h3 className="mb-3" style={{ fontSize: '1.125rem', fontWeight: 600 }}>5.3 HSL/颜色面板</h3>
        <p className="text-gray-700 leading-relaxed" style={{ lineHeight: '1.8' }}>
          详见第4.2节 HSL 调整方案表格。
        </p>
      </section>

      {/* 6. Photoshop 调整方案 */}
      <section>
        <h2 className="mb-6 pb-2 border-b border-gray-300" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          6. Adobe Photoshop 调整方案
        </h2>
        
        <h3 className="mb-3" style={{ fontSize: '1.125rem', fontWeight: 600 }}>6.1 调整图层序列</h3>
        <div className="mb-6">
          <ol className="space-y-3 ml-6 list-decimal text-gray-700">
            {psLayers.map((layer: any, i: number) => (
              <li key={i} style={{ lineHeight: '1.8' }}>
                <strong>{layer.name}：</strong>{layer.description}
                {layer.settings && (
                  <ul className="mt-2 ml-4 list-disc text-sm">
                    {Object.entries(layer.settings).map(([key, value]: any, j: number) => (
                      <li key={j}>{key}: {value}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </div>

        <h3 className="mb-3" style={{ fontSize: '1.125rem', fontWeight: 600 }}>6.2 滤镜应用</h3>
        <p className="text-gray-700 leading-relaxed" style={{ lineHeight: '1.8' }}>
          {results?.photoshop?.filters || '建议在完成色调调整后，应用高斯模糊（半径 0.5px）配合减淡模式，不透明度 30%，以柔化皮肤质感；再使用锐化滤镜（数量 80%，半径 1.0px）增强细节。'}
        </p>
      </section>

      {/* 7. 结论 */}
      <section>
        <h2 className="mb-6 pb-2 border-b border-gray-300" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          7. 结论
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4" style={{ textAlign: 'justify', lineHeight: '1.8' }}>
          通过对源照片和目标照片的全方位分析，本报告提供了详细的风格克隆调整方案。
          主要调整重点包括：色温偏移约 {results?.lighting?.colorTemperatureShift || '+15'}K、
          曝光补偿 {results?.lighting?.exposureCompensation || '+0.3'}EV、
          饱和度提升 {results?.color?.saturationBoost || '+12'}%。
          建议按照 Lightroom 基础调整 → HSL 精细调整 → Photoshop 细节优化的顺序进行，
          以达到最佳的风格克隆效果。
        </p>
      </section>

      {/* 页脚 */}
      <div className="pt-8 border-t border-gray-300 text-center text-gray-500 text-sm">
        <p>本报告由 AI 照片风格克隆系统自动生成</p>
        <p className="mt-1">© {new Date().getFullYear()} Photo Style Cloning Analysis System</p>
      </div>
    </div>
  );
}