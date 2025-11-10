import { motion } from 'motion/react';
import { Palette, Thermometer, Droplet, TrendingUp } from 'lucide-react';
import { ColorGradingVisualization } from '../ColorWheel';

export function ColorSection({ data }: any) {
  if (!data) return null;

  // Helper to parse grading values
  const parseGradingValue = (value: any): { hue: number; saturation: number } => {
    if (!value) return { hue: 0, saturation: 0 };
    
    let hue = 0;
    let saturation = 0;
    
    if (typeof value.hue === 'string') {
      const hueMatch = value.hue.match(/(\d+)/);
      hue = hueMatch ? parseInt(hueMatch[1]) : 0;
    } else {
      hue = value.hue || 0;
    }
    
    if (typeof value.saturation === 'string') {
      const satMatch = value.saturation.match(/(\d+)/);
      saturation = satMatch ? parseInt(satMatch[1]) : 0;
    } else {
      saturation = value.saturation || 0;
    }
    
    return { hue, saturation };
  };

  const parseBalanceValue = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const match = value.match(/([+\-]?\d+)/);
      return match ? parseInt(match[1]) : 0;
    }
    return 0;
  };

  return (
    <div className="space-y-8">
      {/* Style Key */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl border border-pink-200"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-pink-100 rounded-xl">
            <Palette className="w-6 h-6 text-pink-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg text-gray-900 mb-2">色彩风格关键</h3>
            <p className="text-gray-700 leading-relaxed">{data.styleKey}</p>
          </div>
        </div>
      </motion.div>

      {/* White Balance */}
      <div>
        <h3 className="text-xl text-gray-900 mb-4 flex items-center gap-2">
          <Thermometer className="w-5 h-5 text-pink-600" />
          白平衡
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-gray-50 rounded-xl border border-gray-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-900">色温 Temperature</span>
              <span className="px-3 py-1.5 bg-orange-100 text-orange-700 text-sm rounded-lg border border-orange-200">
                {data.whiteBalance.temp.range}
              </span>
            </div>
            {data.whiteBalance.temp.note && (
              <p className="text-sm text-gray-600">{data.whiteBalance.temp.note}</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-5 bg-gray-50 rounded-xl border border-gray-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-900">色调 Tint</span>
              <span className="px-3 py-1.5 bg-purple-100 text-purple-700 text-sm rounded-lg border border-purple-200">
                {data.whiteBalance.tint.range}
              </span>
            </div>
            {data.whiteBalance.tint.note && (
              <p className="text-sm text-gray-600">{data.whiteBalance.tint.note}</p>
            )}
          </motion.div>
        </div>
      </div>

      {/* Color Grading */}
      <div>
        <h3 className="text-xl text-gray-900 mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-pink-600" />
          色彩分级
        </h3>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl border border-pink-200"
        >
          <ColorGradingVisualization
            highlights={parseGradingValue(data.grading.highlights)}
            midtones={parseGradingValue(data.grading.midtones)}
            shadows={parseGradingValue(data.grading.shadows)}
            balance={parseBalanceValue(data.grading.balance)}
          />
        </motion.div>
      </div>

      {/* HSL Adjustments */}
      <div>
        <h3 className="text-xl text-gray-900 mb-4 flex items-center gap-2">
          <Droplet className="w-5 h-5 text-rose-600" />
          HSL 色彩调整
        </h3>
        <div className="space-y-3">
          {data.hsl.map((item: any, index: number) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-5 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-all"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-lg border border-gray-300"
                  style={{
                    backgroundColor: getColorForHSL(item.color),
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-900">{item.color}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">色相</div>
                      <div className="text-sm text-pink-700 bg-pink-100 px-2 py-1 rounded">
                        {item.hue}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">饱和度</div>
                      <div className="text-sm text-purple-700 bg-purple-100 px-2 py-1 rounded">
                        {item.saturation}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">明度</div>
                      <div className="text-sm text-blue-700 bg-blue-100 px-2 py-1 rounded">
                        {item.luminance}
                      </div>
                    </div>
                  </div>
                  {item.note && (
                    <p className="text-xs text-gray-600 mt-3">{item.note}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper function to get color for HSL items
function getColorForHSL(colorName: string): string {
  const colorMap: { [key: string]: string } = {
    '红': '#ef4444',
    '橙': '#f97316',
    '黄': '#eab308',
    '绿': '#22c55e',
    '青': '#06b6d4',
    '蓝': '#3b82f6',
    '紫': '#a855f7',
    '洋红': '#ec4899',
  };
  return colorMap[colorName] || '#6b7280';
}
