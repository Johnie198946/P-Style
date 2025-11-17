import { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, FileText } from 'lucide-react';
import { ReviewSection } from './sections/ReviewSection';
import { realGeminiReviewData } from './RealGeminiMockData';

/**
 * ReviewSection演示页面
 * 用于展示和测试新设计的照片点评组件
 * 使用真实的Gemini返回数据
 */
export function ReviewSectionDemo() {
  const [showDemo, setShowDemo] = useState(false);

  if (!showDemo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <FileText className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-gray-900 mb-4">照片点评 - 新版设计预览</h1>
          <p className="text-gray-600 mb-2 max-w-md">
            基于Gemini专业分析结果重新设计的照片点评界面
          </p>
          <p className="text-sm text-gray-500 mb-8 max-w-md">
            使用真实案例：现代建筑 vs 动漫星空（你的名字）
          </p>
          <button
            onClick={() => setShowDemo(true)}
            className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            查看演示
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowDemo(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">返回</span>
            </button>

            <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200">
              <span className="text-sm text-indigo-700">演示模式 - 真实Gemini数据</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-2 h-10 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
            <div>
              <h1 className="text-gray-900">照片点评</h1>
              <p className="text-sm text-gray-500">现代建筑 vs 动漫星空 · 8维度对比 · 可行性评估</p>
            </div>
          </div>

          {/* ReviewSection Card Container */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl border-2 border-gray-200 shadow-lg overflow-hidden"
          >
            <div className="p-8">
              <ReviewSection data={realGeminiReviewData} />
            </div>
          </motion.div>

          {/* Info Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-200"
          >
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
              <div className="text-sm text-gray-700 space-y-2">
                <p>
                  <strong className="text-blue-900">真实案例：</strong>
                  参考图为现代主义建筑摄影，用户图为《你的名字》动漫星空插画。Gemini AI提供了极其专业和犀利的对比分析。
                </p>
                <p className="text-xs text-gray-600">
                  包含功能：对比综述 · 8维度分析 · 参数对比表格 · 摄影师风格总结 · 复刻可行性评估（difficulty: high, confidence: 0.80）
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}