import { motion } from 'motion/react';
import { Star, ThumbsUp, Lightbulb, TrendingUp, Heart } from 'lucide-react';

export function ReviewSection({ data }: any) {
  if (!data) return null;

  // Split advantages into array if it's a string
  const advantages = typeof data.advantages === 'string' 
    ? data.advantages.split('\n').filter((line: string) => line.trim())
    : data.advantages || [];

  return (
    <div className="space-y-8">
      {/* Overall Assessment */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-100 rounded-xl">
            <Star className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg text-gray-900 mb-3">专业评价</h3>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              {data.visualGuidance && (
                <div>
                  <h4 className="text-sm text-emerald-600 mb-1">构图视觉引导</h4>
                  <p>{data.visualGuidance}</p>
                </div>
              )}
              {data.focusExposure && (
                <div>
                  <h4 className="text-sm text-emerald-600 mb-1">焦点与曝光</h4>
                  <p>{data.focusExposure}</p>
                </div>
              )}
              {data.colorDepth && (
                <div>
                  <h4 className="text-sm text-emerald-600 mb-1">色彩与景深</h4>
                  <p>{data.colorDepth}</p>
                </div>
              )}
              {data.emotion && (
                <div>
                  <h4 className="text-sm text-emerald-600 mb-1">情绪表达</h4>
                  <p>{data.emotion}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Advantages */}
      {advantages.length > 0 && (
        <div>
          <h3 className="text-xl text-gray-900 mb-4 flex items-center gap-2">
            <ThumbsUp className="w-5 h-5 text-emerald-600" />
            优势亮点
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {advantages.map((advantage: string, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:border-emerald-300 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-gray-800 leading-relaxed flex-1">{advantage}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Equipment & Technique */}
      {(data.equipment || data.lens || data.technique) && (
        <div>
          <h3 className="text-xl text-gray-900 mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-teal-600" />
            技术分析
          </h3>
          <div className="space-y-4">
            {data.equipment && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-gray-50 rounded-xl border border-gray-200"
              >
                <h4 className="text-sm text-teal-600 mb-2">推测设备</h4>
                <p className="text-gray-700 leading-relaxed">{data.equipment}</p>
              </motion.div>
            )}
            {data.lens && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="p-5 bg-gray-50 rounded-xl border border-gray-200"
              >
                <h4 className="text-sm text-teal-600 mb-2">镜头分析</h4>
                <p className="text-gray-700 leading-relaxed">{data.lens}</p>
              </motion.div>
            )}
            {data.technique && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-5 bg-gray-50 rounded-xl border border-gray-200"
              >
                <h4 className="text-sm text-teal-600 mb-2">拍摄技术</h4>
                <p className="text-gray-700 leading-relaxed">{data.technique}</p>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Comparison Table */}
      {data.comparison && data.comparison.length > 0 && (
          <div>
            <h3 className="text-xl text-gray-900 mb-4">参数对比</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 text-sm text-gray-500">项目</th>
                    <th className="text-left p-3 text-sm text-gray-500">源照片</th>
                    <th className="text-left p-3 text-sm text-gray-500">用户照片</th>
                    <th className="text-left p-3 text-sm text-gray-500">目标建议</th>
                  </tr>
                </thead>
                <tbody>
                  {data.comparison.map((row: any, index: number) => (
                    <motion.tr
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="p-3 text-gray-700">{row.item}</td>
                      <td className="p-3 text-gray-600 text-sm">{row.source}</td>
                      <td className="p-3 text-gray-600 text-sm">{row.user}</td>
                      <td className="p-3 text-emerald-600 text-sm">{row.target}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }
