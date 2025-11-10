import { motion } from 'motion/react';
import { Sun, Moon, Contrast, Droplet, Sparkles } from 'lucide-react';
import { CurveChart } from '../CurveChart';

export function LightingSection({ data }: any) {
  if (!data) return null;

  const renderParameter = (icon: React.ReactNode, label: string, value: { range: string; note?: string }, index: number = 0) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-5 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-all"
    >
      <div className="flex items-start gap-4">
        <div className="p-2 bg-amber-100 rounded-lg">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-900">{label}</span>
            <span className="px-3 py-1.5 bg-amber-100 text-amber-700 text-sm rounded-lg border border-amber-200">
              {value.range}
            </span>
          </div>
          {value.note && (
            <p className="text-sm text-gray-600 leading-relaxed">{value.note}</p>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-8">
      {/* Exposure - Basic */}
      {data.basic && (
        <div>
          <h3 className="text-xl text-gray-900 mb-4 flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-600" />
            曝光控制
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.basic.exposure && renderParameter(
              <Sun className="w-5 h-5 text-amber-600" />,
              '曝光 Exposure',
              data.basic.exposure,
              0
            )}
            {data.basic.contrast && renderParameter(
              <Contrast className="w-5 h-5 text-yellow-600" />,
              '对比度 Contrast',
              data.basic.contrast,
              1
            )}
            {data.basic.highlights && renderParameter(
              <Sun className="w-5 h-5 text-yellow-600" />,
              '高光 Highlights',
              data.basic.highlights,
              2
            )}
            {data.basic.shadows && renderParameter(
              <Moon className="w-5 h-5 text-blue-600" />,
              '阴影 Shadows',
              data.basic.shadows,
              3
            )}
            {data.basic.whites && renderParameter(
              <Sun className="w-5 h-5 text-orange-600" />,
              '白色 Whites',
              data.basic.whites,
              4
            )}
            {data.basic.blacks && renderParameter(
              <Moon className="w-5 h-5 text-gray-600" />,
              '黑色 Blacks',
              data.basic.blacks,
              5
            )}
          </div>
        </div>
      )}

      {/* Tone Curve - After Exposure */}
      <div>
        <h3 className="text-xl text-gray-900 mb-4 flex items-center gap-2">
          <Contrast className="w-5 h-5 text-gray-600" />
          色调曲线
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CurveChart />
          <div className="space-y-3">
            <div className="p-5 bg-gray-50 rounded-xl border border-gray-200">
              <h4 className="text-gray-900 mb-2">曲线调整说明</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• <strong>曲线 (RGB)</strong>: 整体对比度调整，提亮中间调</p>
                <p>• <strong>红色通道</strong>: 增强暖色调，适用于肤色和日落场景</p>
                <p>• <strong>绿色通道</strong>: 优化植物和自然场景的色彩平衡</p>
                <p>• <strong>蓝色通道</strong>: 调整天空和水面的冷色调表现</p>
              </div>
            </div>
            <div className="p-5 bg-blue-50 rounded-xl border border-blue-200">
              <h4 className="text-blue-900 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                调整技巧
              </h4>
              <div className="space-y-1.5 text-sm text-blue-700">
                <p>• S 型曲线可增加画面对比度</p>
                <p>• 提升暗部可保留阴影细节</p>
                <p>• 压低高光可恢复过曝区域</p>
                <p>• 分别调整 RGB 通道可实现色彩偏移效果</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Texture & Clarity */}
      {data.texture && (
        <div>
          <h3 className="text-xl text-gray-900 mb-4 flex items-center gap-2">
            <Contrast className="w-5 h-5 text-yellow-600" />
            纹理与清晰度
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.texture.texture && renderParameter(
              <Contrast className="w-5 h-5 text-yellow-600" />,
              '纹理 Texture',
              data.texture.texture,
              0
            )}
            {data.texture.clarity && renderParameter(
              <Sparkles className="w-5 h-5 text-cyan-600" />,
              '清晰度 Clarity',
              data.texture.clarity,
              1
            )}
            {data.texture.dehaze && renderParameter(
              <Droplet className="w-5 h-5 text-blue-600" />,
              '去朦胧 Dehaze',
              data.texture.dehaze,
              2
            )}
            {data.texture.saturation && renderParameter(
              <Droplet className="w-5 h-5 text-pink-600" />,
              '饱和度 Saturation',
              data.texture.saturation,
              3
            )}
            {data.texture.vibrance && renderParameter(
              <Sparkles className="w-5 h-5 text-purple-600" />,
              '自然饱和度 Vibrance',
              data.texture.vibrance,
              4
            )}
          </div>
        </div>
      )}
    </div>
  );
}
