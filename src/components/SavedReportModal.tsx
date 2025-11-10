import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share2, Trash2, Camera, Sun, Palette, Sliders, Image as ImageIcon, Sparkles, ChevronRight } from 'lucide-react';
import { generateMockResults } from './AdjustmentResults';

interface SavedReportModalProps {
  reportId: string | null;
  onClose: () => void;
}

export function SavedReportModal({ reportId, onClose }: SavedReportModalProps) {
  const [activeSection, setActiveSection] = useState('review');

  if (!reportId) return null;

  // 模拟获取保存的报告数据
  const report = {
    id: reportId,
    name: '日落海滩照片',
    date: '2025-11-08 14:30',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
    results: generateMockResults(),
  };

  const sections = [
    { id: 'review', icon: <Sparkles className="w-5 h-5" />, label: '照片点评', color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
    { id: 'composition', icon: <Camera className="w-5 h-5" />, label: '构图分析', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    { id: 'lighting', icon: <Sun className="w-5 h-5" />, label: '光影参数', color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
    { id: 'color', icon: <Palette className="w-5 h-5" />, label: '色彩方案', color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
    { id: 'lightroom', icon: <Sliders className="w-5 h-5" />, label: 'Lightroom', color: 'text-cyan-600', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-200' },
    { id: 'photoshop', icon: <ImageIcon className="w-5 h-5" />, label: 'Photoshop', color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
  ];

  const activeTheme = sections.find(s => s.id === activeSection);

  const handleDownload = () => {
    console.log('下载报告:', reportId);
    alert('报告下载功能已触发！');
  };

  const handleShare = () => {
    console.log('分享报告:', reportId);
    alert('报告分享功能已触发！');
  };

  const handleDelete = () => {
    if (confirm('确定要删除这个报告吗？')) {
      console.log('删除报告:', reportId);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-[400]"
        />

        {/* Modal */}
        <div className="fixed inset-0 z-[401] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-[28px] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 px-8 py-6 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-gray-900 mb-1" style={{ fontSize: '22px', fontWeight: 600 }}>
                    {report.name}
                  </h2>
                  <p className="text-gray-500" style={{ fontSize: '13px', fontWeight: 400 }}>
                    创建时间: {report.date}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownload}
                    className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
                    title="下载报告"
                  >
                    <Download className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
                    title="分享报告"
                  >
                    <Share2 className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-2.5 hover:bg-red-50 rounded-xl transition-colors"
                    title="删除报告"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                  <div className="w-px h-6 bg-gray-200 mx-1" />
                  <button
                    onClick={onClose}
                    className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex-shrink-0 px-8 py-4 border-b border-gray-200 bg-gray-50 overflow-x-auto">
              <div className="flex gap-2">
                {sections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                      activeSection === section.id
                        ? `${section.bgColor} ${section.color} shadow-sm border ${section.borderColor}`
                        : 'text-gray-600 hover:bg-white'
                    }`}
                    style={{ fontSize: '14px', fontWeight: activeSection === section.id ? 600 : 500 }}
                  >
                    <div className={activeSection === section.id ? '' : 'opacity-60'}>
                      {section.icon}
                    </div>
                    {section.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50">
              <div className="p-8">
                {/* Image Preview */}
                <div className="mb-8">
                  <div className="relative rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-white">
                    <img
                      src={report.thumbnail}
                      alt={report.name}
                      className="w-full max-h-[400px] object-contain"
                    />
                  </div>
                </div>

                {/* Section Content */}
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
                >
                  {activeSection === 'review' && (
                    <div className="space-y-6">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className={`w-12 h-12 ${activeTheme?.bgColor} rounded-xl flex items-center justify-center ${activeTheme?.color}`}>
                          {activeTheme?.icon}
                        </div>
                        <div>
                          <h3 className="text-gray-900" style={{ fontSize: '20px', fontWeight: 600 }}>
                            照片点评
                          </h3>
                          <p className="text-gray-500" style={{ fontSize: '13px', fontWeight: 400 }}>
                            专业摄影师的全面评价
                          </p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {/* Visual Guidance */}
                        {report.results.review?.visualGuidance && (
                          <div>
                            <h4 className="text-gray-900 mb-3 flex items-center gap-2" style={{ fontSize: '16px', fontWeight: 600 }}>
                              <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
                              视觉引导
                            </h4>
                            <p className="text-gray-700 leading-relaxed bg-amber-50 p-4 rounded-xl border border-amber-100" style={{ fontSize: '15px', fontWeight: 400 }}>
                              {report.results.review.visualGuidance}
                            </p>
                          </div>
                        )}

                        {/* Focus Exposure */}
                        {report.results.review?.focusExposure && (
                          <div>
                            <h4 className="text-gray-900 mb-3 flex items-center gap-2" style={{ fontSize: '16px', fontWeight: 600 }}>
                              <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                              焦点与曝光
                            </h4>
                            <p className="text-gray-700 leading-relaxed bg-blue-50 p-4 rounded-xl border border-blue-100" style={{ fontSize: '15px', fontWeight: 400 }}>
                              {report.results.review.focusExposure}
                            </p>
                          </div>
                        )}

                        {/* Color Depth */}
                        {report.results.review?.colorDepth && (
                          <div>
                            <h4 className="text-gray-900 mb-3 flex items-center gap-2" style={{ fontSize: '16px', fontWeight: 600 }}>
                              <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                              色彩与景深
                            </h4>
                            <p className="text-gray-700 leading-relaxed bg-purple-50 p-4 rounded-xl border border-purple-100" style={{ fontSize: '15px', fontWeight: 400 }}>
                              {report.results.review.colorDepth}
                            </p>
                          </div>
                        )}

                        {/* Emotion */}
                        {report.results.review?.emotion && (
                          <div>
                            <h4 className="text-gray-900 mb-3 flex items-center gap-2" style={{ fontSize: '16px', fontWeight: 600 }}>
                              <span className="w-1.5 h-6 bg-pink-500 rounded-full"></span>
                              情绪表达
                            </h4>
                            <p className="text-gray-700 leading-relaxed bg-pink-50 p-4 rounded-xl border border-pink-100" style={{ fontSize: '15px', fontWeight: 400 }}>
                              {report.results.review.emotion}
                            </p>
                          </div>
                        )}

                        {/* Advantages */}
                        {report.results.review?.advantages && (
                          <div>
                            <h4 className="text-gray-900 mb-3 flex items-center gap-2" style={{ fontSize: '16px', fontWeight: 600 }}>
                              <span className="w-1.5 h-6 bg-green-500 rounded-full"></span>
                              优点
                            </h4>
                            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                              <p className="text-gray-700 leading-relaxed whitespace-pre-line" style={{ fontSize: '14px', fontWeight: 400 }}>
                                {report.results.review.advantages}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Comparison */}
                        {report.results.review?.comparison && Array.isArray(report.results.review.comparison) && (
                          <div>
                            <h4 className="text-gray-900 mb-3 flex items-center gap-2" style={{ fontSize: '16px', fontWeight: 600 }}>
                              <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                              参数对比
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-indigo-50 border-b border-indigo-100">
                                    <th className="px-4 py-3 text-left text-gray-700" style={{ fontSize: '13px', fontWeight: 600 }}>项目</th>
                                    <th className="px-4 py-3 text-left text-gray-700" style={{ fontSize: '13px', fontWeight: 600 }}>源照片</th>
                                    <th className="px-4 py-3 text-left text-gray-700" style={{ fontSize: '13px', fontWeight: 600 }}>你的照片</th>
                                    <th className="px-4 py-3 text-left text-gray-700" style={{ fontSize: '13px', fontWeight: 600 }}>目标</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {report.results.review.comparison.map((item: any, i: number) => (
                                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                                      <td className="px-4 py-3 text-gray-900" style={{ fontSize: '13px', fontWeight: 600 }}>{item.item}</td>
                                      <td className="px-4 py-3 text-gray-700" style={{ fontSize: '13px', fontWeight: 400 }}>{item.source}</td>
                                      <td className="px-4 py-3 text-gray-700" style={{ fontSize: '13px', fontWeight: 400 }}>{item.user}</td>
                                      <td className="px-4 py-3 text-indigo-700" style={{ fontSize: '13px', fontWeight: 500 }}>{item.target}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeSection === 'composition' && (
                    <div className="space-y-6">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className={`w-12 h-12 ${activeTheme?.bgColor} rounded-xl flex items-center justify-center ${activeTheme?.color}`}>
                          {activeTheme?.icon}
                        </div>
                        <div>
                          <h3 className="text-gray-900" style={{ fontSize: '20px', fontWeight: 600 }}>
                            构图分析
                          </h3>
                          <p className="text-gray-500" style={{ fontSize: '13px', fontWeight: 400 }}>
                            焦点布局与视觉引导
                          </p>
                        </div>
                      </div>

                      {/* Basic Info */}
                      {report.results.composition?.basicInfo && (
                        <div>
                          <h4 className="text-gray-900 mb-4 flex items-center gap-2" style={{ fontSize: '16px', fontWeight: 600 }}>
                            <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                            基本信息
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            {Object.entries(report.results.composition.basicInfo).map(([key, value]) => (
                              <div key={key} className="p-5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                                <p className="text-gray-600 mb-2" style={{ fontSize: '13px', fontWeight: 500 }}>
                                  {key}
                                </p>
                                <p className="text-blue-700" style={{ fontSize: '15px', fontWeight: 600 }}>
                                  {String(value)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Aspect Ratio Detail */}
                      {report.results.composition?.aspectRatioDetail && Array.isArray(report.results.composition.aspectRatioDetail) && (
                        <div>
                          <h4 className="text-gray-900 mb-3 flex items-center gap-2" style={{ fontSize: '16px', fontWeight: 600 }}>
                            <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                            宽高比建议
                          </h4>
                          <ul className="space-y-2">
                            {report.results.composition.aspectRatioDetail.map((item: string, i: number) => (
                              <li key={i} className="flex items-start gap-3 bg-blue-50 p-3 rounded-xl border border-blue-100">
                                <span className="text-blue-600 mt-0.5">•</span>
                                <span className="text-gray-700 flex-1" style={{ fontSize: '14px', fontWeight: 400 }}>
                                  {item}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Subject and Space */}
                      {report.results.composition?.subjectAndSpace && Array.isArray(report.results.composition.subjectAndSpace) && (
                        <div>
                          <h4 className="text-gray-900 mb-3 flex items-center gap-2" style={{ fontSize: '16px', fontWeight: 600 }}>
                            <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                            主体与空间
                          </h4>
                          <ul className="space-y-2">
                            {report.results.composition.subjectAndSpace.map((item: string, i: number) => (
                              <li key={i} className="flex items-start gap-3 bg-blue-50 p-3 rounded-xl border border-blue-100">
                                <span className="text-blue-600 mt-0.5">•</span>
                                <span className="text-gray-700 flex-1" style={{ fontSize: '14px', fontWeight: 400 }}>
                                  {item}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Focus and Depth */}
                      {report.results.composition?.focusAndDepth && Array.isArray(report.results.composition.focusAndDepth) && (
                        <div>
                          <h4 className="text-gray-900 mb-3 flex items-center gap-2" style={{ fontSize: '16px', fontWeight: 600 }}>
                            <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                            焦点与景深
                          </h4>
                          <ul className="space-y-2">
                            {report.results.composition.focusAndDepth.map((item: string, i: number) => (
                              <li key={i} className="flex items-start gap-3 bg-blue-50 p-3 rounded-xl border border-blue-100">
                                <span className="text-blue-600 mt-0.5">•</span>
                                <span className="text-gray-700 flex-1" style={{ fontSize: '14px', fontWeight: 400 }}>
                                  {item}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {activeSection === 'lighting' && (
                    <div className="space-y-6">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className={`w-12 h-12 ${activeTheme?.bgColor} rounded-xl flex items-center justify-center ${activeTheme?.color}`}>
                          {activeTheme?.icon}
                        </div>
                        <div>
                          <h3 className="text-gray-900" style={{ fontSize: '20px', fontWeight: 600 }}>
                            光影参数
                          </h3>
                          <p className="text-gray-500" style={{ fontSize: '13px', fontWeight: 400 }}>
                            曝光对比与明暗层次
                          </p>
                        </div>
                      </div>

                      {/* Basic Lighting */}
                      {report.results.lighting?.basic && (
                        <div>
                          <h4 className="text-gray-800 mb-4 flex items-center gap-2" style={{ fontSize: '16px', fontWeight: 600 }}>
                            <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
                            基础调整
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            {Object.entries(report.results.lighting.basic).map(([key, value]: [string, any]) => (
                              <div key={key} className="p-5 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl border border-orange-100">
                                <p className="text-gray-600 mb-2" style={{ fontSize: '13px', fontWeight: 500 }}>
                                  {key}
                                </p>
                                <p className="text-orange-700 mb-1" style={{ fontSize: '16px', fontWeight: 700 }}>
                                  {value.range}
                                </p>
                                {value.note && (
                                  <p className="text-gray-500" style={{ fontSize: '11px', fontWeight: 400 }}>
                                    {value.note}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Texture */}
                      {report.results.lighting?.texture && (
                        <div>
                          <h4 className="text-gray-800 mb-4 flex items-center gap-2" style={{ fontSize: '16px', fontWeight: 600 }}>
                            <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
                            质感细节
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            {Object.entries(report.results.lighting.texture).map(([key, value]: [string, any]) => (
                              <div key={key} className="p-5 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl border border-orange-100">
                                <p className="text-gray-600 mb-2" style={{ fontSize: '13px', fontWeight: 500 }}>
                                  {key}
                                </p>
                                <p className="text-orange-700 mb-1" style={{ fontSize: '16px', fontWeight: 700 }}>
                                  {value.range}
                                </p>
                                {value.note && (
                                  <p className="text-gray-500" style={{ fontSize: '11px', fontWeight: 400 }}>
                                    {value.note}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeSection === 'color' && (
                    <div className="space-y-6">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className={`w-12 h-12 ${activeTheme?.bgColor} rounded-xl flex items-center justify-center ${activeTheme?.color}`}>
                          {activeTheme?.icon}
                        </div>
                        <div>
                          <h3 className="text-gray-900" style={{ fontSize: '20px', fontWeight: 600 }}>
                            色彩方案
                          </h3>
                          <p className="text-gray-500" style={{ fontSize: '13px', fontWeight: 400 }}>
                            色调饱和与色彩搭配
                          </p>
                        </div>
                      </div>

                      {/* Style Key */}
                      {report.results.color?.styleKey && (
                        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                          <h4 className="text-gray-800 mb-2" style={{ fontSize: '14px', fontWeight: 600 }}>
                            风格关键
                          </h4>
                          <p className="text-gray-700" style={{ fontSize: '14px', fontWeight: 400 }}>
                            {report.results.color.styleKey}
                          </p>
                        </div>
                      )}

                      {/* White Balance */}
                      {report.results.color?.whiteBalance && (
                        <div>
                          <h4 className="text-gray-800 mb-4 flex items-center gap-2" style={{ fontSize: '16px', fontWeight: 600 }}>
                            <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                            白平衡
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            {Object.entries(report.results.color.whiteBalance).map(([key, value]: [string, any]) => (
                              <div key={key} className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                                <p className="text-gray-600 mb-2" style={{ fontSize: '13px', fontWeight: 500 }}>
                                  {key}
                                </p>
                                <p className="text-purple-700 mb-1" style={{ fontSize: '16px', fontWeight: 700 }}>
                                  {value.range}
                                </p>
                                {value.note && (
                                  <p className="text-gray-500" style={{ fontSize: '11px', fontWeight: 400 }}>
                                    {value.note}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Color Grading */}
                      {report.results.color?.grading && (
                        <div>
                          <h4 className="text-gray-800 mb-4 flex items-center gap-2" style={{ fontSize: '16px', fontWeight: 600 }}>
                            <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                            色彩分级
                          </h4>
                          <div className="space-y-3">
                            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                              <p className="text-gray-600 mb-1" style={{ fontSize: '12px', fontWeight: 500 }}>高光 Highlights</p>
                              <p className="text-gray-800" style={{ fontSize: '14px', fontWeight: 600 }}>
                                色相: {report.results.color.grading.highlights?.hue} / 饱和度: {report.results.color.grading.highlights?.saturation}
                              </p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
                              <p className="text-gray-600 mb-1" style={{ fontSize: '12px', fontWeight: 500 }}>中间调 Midtones</p>
                              <p className="text-gray-800" style={{ fontSize: '14px', fontWeight: 600 }}>
                                色相: {report.results.color.grading.midtones?.hue} / 饱和度: {report.results.color.grading.midtones?.saturation}
                              </p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                              <p className="text-gray-600 mb-1" style={{ fontSize: '12px', fontWeight: 500 }}>阴影 Shadows</p>
                              <p className="text-gray-800" style={{ fontSize: '14px', fontWeight: 600 }}>
                                色相: {report.results.color.grading.shadows?.hue} / 饱和度: {report.results.color.grading.shadows?.saturation}
                              </p>
                            </div>
                            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                              <p className="text-gray-600 mb-1" style={{ fontSize: '12px', fontWeight: 500 }}>平衡 Balance</p>
                              <p className="text-purple-700" style={{ fontSize: '14px', fontWeight: 600 }}>
                                {report.results.color.grading.balance}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* HSL */}
                      {report.results.color?.hsl && Array.isArray(report.results.color.hsl) && (
                        <div>
                          <h4 className="text-gray-800 mb-4 flex items-center gap-2" style={{ fontSize: '16px', fontWeight: 600 }}>
                            <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                            HSL 调整
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            {report.results.color.hsl.map((item: any, i: number) => (
                              <div key={i} className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                                <p className="text-purple-700 mb-2" style={{ fontSize: '14px', fontWeight: 600 }}>
                                  {item.color}
                                </p>
                                <div className="space-y-1 text-gray-700" style={{ fontSize: '12px' }}>
                                  <p>色相: {item.hue}</p>
                                  <p>饱和度: {item.saturation}</p>
                                  <p>明度: {item.luminance}</p>
                                  {item.note && <p className="text-gray-500 italic">{item.note}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeSection === 'lightroom' && (
                    <div className="space-y-6">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className={`w-12 h-12 ${activeTheme?.bgColor} rounded-xl flex items-center justify-center ${activeTheme?.color}`}>
                          {activeTheme?.icon}
                        </div>
                        <div>
                          <h3 className="text-gray-900" style={{ fontSize: '20px', fontWeight: 600 }}>
                            Lightroom 调整方案
                          </h3>
                          <p className="text-gray-500" style={{ fontSize: '13px', fontWeight: 400 }}>
                            Adobe Lightroom 专业参数
                          </p>
                        </div>
                      </div>

                      {/* Lightroom Panels */}
                      {report.results.lightroom && Array.isArray(report.results.lightroom) && report.results.lightroom.map((panel: any, panelIndex: number) => (
                        <div key={panelIndex}>
                          <h4 className="text-gray-800 mb-4 flex items-center gap-2" style={{ fontSize: '16px', fontWeight: 600 }}>
                            <span className="w-1.5 h-6 bg-cyan-500 rounded-full"></span>
                            {panel.title}
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            {panel.params && Array.isArray(panel.params) && panel.params.map((param: any, paramIndex: number) => (
                              <div key={paramIndex} className="flex items-center justify-between p-4 bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl border border-cyan-100">
                                <span className="text-gray-700" style={{ fontSize: '13px', fontWeight: 500 }}>
                                  {param.name}
                                </span>
                                <span className="text-cyan-700 px-3 py-1 bg-white rounded-lg" style={{ fontSize: '14px', fontWeight: 700 }}>
                                  {param.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeSection === 'photoshop' && (
                    <div className="space-y-6">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className={`w-12 h-12 ${activeTheme?.bgColor} rounded-xl flex items-center justify-center ${activeTheme?.color}`}>
                          {activeTheme?.icon}
                        </div>
                        <div>
                          <h3 className="text-gray-900" style={{ fontSize: '20px', fontWeight: 600 }}>
                            Photoshop 处理方案
                          </h3>
                          <p className="text-gray-500" style={{ fontSize: '13px', fontWeight: 400 }}>
                            Adobe Photoshop 后期步骤
                          </p>
                        </div>
                      </div>

                      <div className="space-y-5">
                        {report.results.photoshop && Array.isArray(report.results.photoshop) && report.results.photoshop.map((step: any, i: number) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="p-5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100"
                          >
                            <div className="flex items-start gap-4 mb-4">
                              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl flex items-center justify-center flex-shrink-0">
                                <span style={{ fontSize: '14px', fontWeight: 700 }}>{i + 1}</span>
                              </div>
                              <div className="flex-1">
                                <h4 className="text-gray-900 mb-2" style={{ fontSize: '16px', fontWeight: 600 }}>
                                  {step.title}
                                </h4>
                                <p className="text-gray-700 leading-relaxed mb-3" style={{ fontSize: '14px', fontWeight: 400 }}>
                                  {step.description}
                                </p>
                              </div>
                            </div>
                            {/* Parameters */}
                            {step.params && Array.isArray(step.params) && step.params.length > 0 && (
                              <div className="grid grid-cols-2 gap-2 ml-12">
                                {step.params.map((param: any, paramIndex: number) => (
                                  <div key={paramIndex} className="flex items-center justify-between p-2 bg-white rounded-lg">
                                    <span className="text-gray-600" style={{ fontSize: '12px', fontWeight: 500 }}>
                                      {param.name}
                                    </span>
                                    <span className="text-indigo-700" style={{ fontSize: '12px', fontWeight: 600 }}>
                                      {param.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Masks if available */}
                            {step.masks && Array.isArray(step.masks) && step.masks.length > 0 && (
                              <div className="ml-12 mt-3 space-y-3">
                                {step.masks.map((mask: any, maskIndex: number) => (
                                  <div key={maskIndex} className="p-3 bg-white rounded-lg border border-indigo-100">
                                    <p className="text-indigo-700 mb-1" style={{ fontSize: '13px', fontWeight: 600 }}>
                                      {mask.title}
                                    </p>
                                    <p className="text-gray-600 mb-2" style={{ fontSize: '12px', fontWeight: 400 }}>
                                      {mask.description}
                                    </p>
                                    {mask.params && (
                                      <div className="grid grid-cols-2 gap-2 mt-2">
                                        {mask.params.map((param: any, pIndex: number) => (
                                          <div key={pIndex} className="flex items-center justify-between text-gray-700" style={{ fontSize: '11px' }}>
                                            <span>{param.name}:</span>
                                            <span className="font-semibold">{param.value}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </>
    </AnimatePresence>
  );
}
