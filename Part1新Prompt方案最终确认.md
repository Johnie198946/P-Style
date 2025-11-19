# Part1 新 Prompt 方案最终确认

## 一、设计约束（严格遵守）

### 1.1 核心原则

**⚠️ 重要：前端方案只允许在设计上进行微小调整，不允许改变现有设计！**

### 1.2 具体约束

1. **直方图对比显示位置**（唯一允许的改动）
   - **精确位置**：照片点评块 → 色调与景深卡片 → 参考照片下面放一张 / 用户照片下面放一张
   - **不允许**：在其他任何地方添加直方图显示
   - **不允许**：改变现有的卡片布局和样式
   - **不允许**：添加新的可视化区域

2. **色调曲线**
   - **复用现有设计**：使用现有的 `CurveVisualizationLR` 组件
   - **不允许**：创建新的曲线组件或改变现有样式
   - **位置**：如果需要在 Part1 阶段显示，复用现有组件即可

3. **构图分析**
   - **选择方案B**：适配新结构（5个字段），需要前端改动
   - **允许**：修改 `CompositionSection.tsx` 以适配新的5字段结构
   - **不允许**：改变现有的7段显示样式（如果采用方案B，则改为5段）

4. **其他所有设计**
   - **不允许**：任何其他设计变更
   - **不允许**：添加新的可视化组件（除了直方图）
   - **不允许**：改变现有的UI布局和样式

---

## 二、前端实现方案（最小化改动）

### 2.1 直方图对比显示

#### 2.1.1 精确位置

**位置**：`ReviewSection.tsx` → `colorDepth` 维度 → 左右分栏布局中

**当前代码结构**（第 256-278 行）：
```tsx
<div className="grid md:grid-cols-2 divide-x divide-gray-200">
  {/* 参考图分析 */}
  <div className="p-6">
    <div className="flex items-center gap-2 mb-3">
      <div className="w-2 h-2 rounded-full bg-blue-500" />
      <span className="text-xs text-gray-500">参考照片</span>
    </div>
    <p className="text-gray-700 text-sm leading-relaxed">
      {dimension.referenceDescription}
    </p>
    {/* ⬇️ 在这里添加参考图直方图（仅 AI 反推直方图） */}
  </div>

  {/* 用户图分析 */}
  <div className="p-6 bg-gray-50/50">
    <div className="flex items-center gap-2 mb-3">
      <div className="w-2 h-2 rounded-full bg-purple-500" />
      <span className="text-xs text-gray-500">用户照片</span>
    </div>
    <p className="text-gray-700 text-sm leading-relaxed">
      {dimension.userDescription}
    </p>
    {/* ⬇️ 在这里添加用户图直方图（仅 AI 反推直方图） */}
  </div>
</div>
```

#### 2.1.2 实现方案

**修改 `ReviewSection.tsx`**：

```tsx
// 1. 导入直方图组件
import { HistogramChart } from '../HistogramChart';  // 新建组件

// 2. 在 colorDepth 维度渲染中添加直方图
{dimensionConfig.map((config, index) => {
  const dimension = data.dimensions?.[config.key as keyof typeof data.dimensions] as ComparisonDimension | undefined;
  if (!dimension) return null;

  const Icon = config.icon;
  
  // 检查是否是 colorDepth 维度，且包含直方图数据
  const isColorDepth = config.key === 'colorDepth';
  const histogramData = isColorDepth ? (dimension as any).histogramData : null;

  return (
    <motion.div key={config.key} ...>
      {/* 维度标题 */}
      <div className={`p-4 bg-gradient-to-r ${config.gradient} border-b border-gray-200`}>
        ...
      </div>

      {/* 对比内容 */}
      <div className="grid md:grid-cols-2 divide-x divide-gray-200">
        {/* 参考图分析 */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs text-gray-500">参考照片</span>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">
            {dimension.referenceDescription}
          </p>
          
          {/* 新增：参考图直方图（仅在 colorDepth 维度显示） */}
          {isColorDepth && histogramData?.reference && (
            <div className="mt-4">
              <HistogramChart 
                data={histogramData.reference.data_points}
                description={histogramData.reference.description}
                type="reference"
              />
            </div>
          )}
        </div>

        {/* 用户图分析 */}
        <div className="p-6 bg-gray-50/50">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-xs text-gray-500">用户照片</span>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">
            {dimension.userDescription}
          </p>
          
          {/* 新增：用户图直方图（仅在 colorDepth 维度显示） */}
          {isColorDepth && histogramData?.user && (
            <div className="mt-4">
              <HistogramChart 
                data={histogramData.user.data_points}
                description={histogramData.user.description}
                type="user"
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
})}
```

#### 2.1.3 新建组件：`HistogramChart.tsx`

**位置**：`src/components/HistogramChart.tsx`

**功能**：仅用于显示 AI 反推直方图（最小化实现）

```tsx
import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface HistogramChartProps {
  data: number[];  // 255 个整数
  description?: string;  // 直方图特征描述
  type: 'reference' | 'user';  // 类型
}

export function HistogramChart({ data, description, type }: HistogramChartProps) {
  // 准备图表数据
  const chartData = useMemo(() => {
    if (!data || data.length !== 256) return [];
    return data.map((value, index) => ({
      brightness: index,
      value: value
    }));
  }, [data]);

  if (chartData.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {/* 说明文字 */}
      {description && (
        <p className="text-xs text-gray-500 italic">
          {description}
        </p>
      )}
      
      {/* 图表 */}
      <div className="bg-white rounded-lg p-2 border border-gray-200">
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="brightness" 
              domain={[0, 255]}
              tick={false}
              axisLine={false}
            />
            <YAxis 
              tick={false}
              axisLine={false}
            />
            <Tooltip 
              formatter={(value: number) => [value, '像素分布']}
              labelFormatter={(label) => `亮度: ${label}`}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={type === 'reference' ? 'rgb(59, 130, 246)' : 'rgb(168, 85, 247)'}
              fill={type === 'reference' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(168, 85, 247, 0.1)'}
              name="AI 反推直方图"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* 提示文字 */}
      <p className="text-xs text-gray-400">
        AI 反推直方图（趋势参考）
      </p>
    </div>
  );
}
```

---

### 2.2 色调曲线（复用现有设计）

#### 2.2.1 实现方案

**使用现有组件**：`CurveVisualizationLR.tsx`

**位置**：Part1 的 `lighting` 部分（如果存在 `toneCurves` 数据）

**实现**：
```tsx
// 在 Part1 lighting 部分（如果存在）
{results.lighting?.toneCurves && (
  <div className="mt-4">
    <ToneCurvesDisplay 
      toneCurves={results.lighting.toneCurves}
      isStatic={true}
    />
  </div>
)}
```

**组件实现**：使用现有的 `CurveVisualizationLR` 组件，只需转换数据格式

**新建组件：`ToneCurvesDisplay.tsx`**（可选，如果需要在 Part1 阶段显示）

```tsx
import { CurveVisualizationLR } from '../CurveVisualizationLR';

interface ToneCurvesDisplayProps {
  toneCurves: {
    explanation: string;
    points_rgb: [number, number][];
    points_red: [number, number][];
    points_green: [number, number][];
    points_blue: [number, number][];
  };
  isStatic?: boolean;
}

export function ToneCurvesDisplay({ toneCurves, isStatic = true }: ToneCurvesDisplayProps) {
  // 转换坐标点格式（适配现有 CurveVisualizationLR 组件）
  const convertPoints = (points: [number, number][], label: string) => {
    return points.map(([x, y], index) => ({
      point: `(${x}, ${y})`,
      label: index === 0 ? `${label}起点` : index === points.length - 1 ? `${label}终点` : `${label}控制点${index}`,
      note: `输入:${x} → 输出:${y}`
    }));
  };

  return (
    <div className="space-y-6">
      {/* 说明文字 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-800">
          💡 <strong>形态参考</strong>：以下曲线是 AI 分析的"形态参考"（如 S 型），用于理解调色思路，非精确数值。
        </p>
        {toneCurves.explanation && (
          <p className="text-sm text-amber-700 mt-2">
            {toneCurves.explanation}
          </p>
        )}
      </div>

      {/* RGB 曲线 */}
      <div>
        <h5 className="text-gray-700 text-sm mb-3">RGB 色调曲线（Luma）</h5>
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <CurveVisualizationLR 
            points={convertPoints(toneCurves.points_rgb, 'RGB')} 
            channel="luma"
          />
        </div>
      </div>

      {/* RGB 各通道曲线 */}
      <div>
        <h5 className="text-gray-700 text-sm mb-3">RGB 各通道微调</h5>
        <div className="grid grid-cols-3 gap-3">
          {/* 红色通道 */}
          <div className="bg-red-50/50 rounded-xl p-3 border border-red-100">
            <div className="bg-white rounded-lg p-3 mb-2">
              <CurveVisualizationLR 
                points={convertPoints(toneCurves.points_red, '红')} 
                channel="红"
              />
            </div>
          </div>

          {/* 绿色通道 */}
          <div className="bg-green-50/50 rounded-xl p-3 border border-green-100">
            <div className="bg-white rounded-lg p-3 mb-2">
              <CurveVisualizationLR 
                points={convertPoints(toneCurves.points_green, '绿')} 
                channel="绿"
              />
            </div>
          </div>

          {/* 蓝色通道 */}
          <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100">
            <div className="bg-white rounded-lg p-3 mb-2">
              <CurveVisualizationLR 
                points={convertPoints(toneCurves.points_blue, '蓝')} 
                channel="蓝"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### 2.3 构图分析（方案B：适配新结构）

#### 2.3.1 新 Prompt 结构

```json
{
  "module_2_composition": {
    "main_structure": "文本：视觉框架与几何关系",
    "subject_weight": {
      "description": "文本：主体位置、占比及权重",
      "layers": "文本：前景/中景/远景分布"
    },
    "visual_guidance": {
      "analysis": "文本：线条走向分析",
      "path": "文本：入口点 -> 停留点 -> 终点"
    },
    "ratios_negative_space": {
      "entity_ratio": "如：60%",
      "space_ratio": "如：40%",
      "distribution": "文本：留白分布位置"
    },
    "style_class": "文本：构图风格归类（如：三分法、引导线构图）"
  }
}
```

#### 2.3.2 前端适配

**修改 `CompositionSection.tsx`**：

```tsx
interface CompositionData {
  // 新结构：5个字段
  main_structure?: string;
  subject_weight?: {
    description?: string;
    layers?: string;
  };
  visual_guidance?: {
    analysis?: string;
    path?: string;
  };
  ratios_negative_space?: {
    entity_ratio?: string;
    space_ratio?: string;
    distribution?: string;
  };
  style_class?: string;
}

export function CompositionSection({ data }: { data?: CompositionData }) {
  if (!data) return null;

  const compositionItems = [
    {
      key: 'main_structure',
      title: '画面主结构分析',
      subtitle: 'Main Structure',
      icon: Grid3x3,
      content: data.main_structure,
      gradient: 'from-blue-500 to-cyan-500',
      bg: 'from-blue-50 to-cyan-50',
      border: 'border-blue-200',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      key: 'subject_weight',
      title: '主体位置与视觉权重',
      subtitle: 'Subject Weight',
      icon: Target,
      content: data.subject_weight?.description,
      layers: data.subject_weight?.layers,
      gradient: 'from-purple-500 to-pink-500',
      bg: 'from-purple-50 to-pink-50',
      border: 'border-purple-200',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      key: 'visual_guidance',
      title: '线条与方向引导',
      subtitle: 'Visual Guidance',
      icon: TrendingUp,
      content: data.visual_guidance?.analysis,
      path: data.visual_guidance?.path,
      gradient: 'from-indigo-500 to-blue-500',
      bg: 'from-indigo-50 to-blue-50',
      border: 'border-indigo-200',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
    },
    {
      key: 'ratios_negative_space',
      title: '比例与留白',
      subtitle: 'Proportion & Negative Space',
      icon: Maximize2,
      content: data.ratios_negative_space?.distribution,
      ratios: data.ratios_negative_space,
      gradient: 'from-emerald-500 to-green-500',
      bg: 'from-emerald-50 to-green-50',
      border: 'border-emerald-200',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      key: 'style_class',
      title: '构图风格归类',
      subtitle: 'Style Classification',
      icon: Lightbulb,
      content: data.style_class,
      gradient: 'from-rose-500 to-red-500',
      bg: 'from-rose-50 to-red-50',
      border: 'border-rose-200',
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
    }
  ];

  return (
    <div className="space-y-6">
      {compositionItems.map((item, index) => {
        if (!item.content) return null;

        const Icon = item.icon;

        return (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group"
          >
            <div className={`
              relative overflow-hidden rounded-2xl border ${item.border}
              bg-gradient-to-br ${item.bg}
              hover:shadow-lg transition-all duration-300
            `}>
              {/* 装饰性渐变线 */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.gradient}`} />
              
              <div className="p-6">
                {/* 标题 */}
                <div className="flex items-start gap-4 mb-6">
                  <div className={`p-3 ${item.iconBg} rounded-xl`}>
                    <Icon className={`w-6 h-6 ${item.iconColor}`} />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-xl text-gray-900 mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                {/* 内容 */}
                <div className="relative">
                  <div className={`absolute -left-2 top-0 w-1 h-full rounded-full bg-gradient-to-b ${item.gradient} opacity-40`} />
                  
                  <div className="pl-6 pr-2">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {item.content}
                    </p>
                    
                    {/* 额外信息（如果有） */}
                    {item.layers && (
                      <div className="mt-3 p-3 bg-white/50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>空间层次：</strong>{item.layers}
                        </p>
                      </div>
                    )}
                    
                    {item.path && (
                      <div className="mt-3 p-3 bg-white/50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>视觉路径：</strong>{item.path}
                        </p>
                      </div>
                    )}
                    
                    {item.ratios && (
                      <div className="mt-3 p-3 bg-white/50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>比例：</strong>实体 {item.ratios.entity_ratio}，留白 {item.ratios.space_ratio}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
```

---

## 三、后端数据映射调整

### 3.1 直方图数据映射

**修改 `server_py/app/services/analysis_formatter.py`**：

```python
def _format_photo_review(self, raw: Dict[str, Any], feasibility: Optional[Dict[str, Any]], user_image_data: Optional[str] = None) -> Dict[str, Any]:
    # ... 现有代码 ...
    
    # 提取 color_depth_analysis（新 Prompt 结构）
    color_depth_analysis = pe.get("color_depth_analysis", {})
    if isinstance(color_depth_analysis, dict):
        # 提取直方图数据
        simulated_histogram = color_depth_analysis.get("simulated_histogram_data", {})
        
        # 构建直方图数据（参考图和用户图）
        histogram_data = {}
        if simulated_histogram:
            # 参考图直方图（AI 反推）
            histogram_data["reference"] = {
                "description": simulated_histogram.get("description", ""),
                "data_points": simulated_histogram.get("data_points", [])
            }
            
            # 用户图直方图（如果有，也使用 AI 反推的）
            # 注意：新 Prompt 中，两张图的直方图都在 color_depth_analysis 中
            # 需要根据实际 Prompt 输出调整
            # 如果 Prompt 只输出一张图的直方图，则只设置 reference
        
        # 将直方图数据添加到 colorDepth 维度
        dimensions["colorDepth"]["histogramData"] = histogram_data
    
    # ... 后续代码 ...
```

### 3.2 构图分析映射（方案B）

**修改 `server_py/app/services/analysis_formatter.py`**：

```python
def _format_composition(self, raw: Dict[str, Any]) -> Dict[str, Any]:
    # 从 raw 中提取 composition（新 Prompt 结构：module_2_composition）
    comp = raw.get("module_2_composition", {})
    
    if not isinstance(comp, dict):
        comp = {}
    
    # 直接使用新结构的5个字段（方案B）
    return {
        "naturalLanguage": {},
        "structured": {
            "main_structure": comp.get("main_structure", ""),
            "subject_weight": comp.get("subject_weight", {}),
            "visual_guidance": comp.get("visual_guidance", {}),
            "ratios_negative_space": comp.get("ratios_negative_space", {}),
            "style_class": comp.get("style_class", "")
        }
    }
```

### 3.3 色调曲线映射

**修改 `server_py/app/services/analysis_formatter.py`**：

```python
def _format_lighting(self, raw: Dict[str, Any]) -> Dict[str, Any]:
    # 从 raw 中提取 lighting_params（新 Prompt 结构：module_3_lighting_params）
    lighting_params = raw.get("module_3_lighting_params", {})
    
    if not isinstance(lighting_params, dict):
        lighting_params = {}
    
    # 提取色调曲线
    tone_curves = lighting_params.get("tone_curves", {})
    
    # 解析曝光控制参数（范围字符串）
    exposure_control = lighting_params.get("exposure_control", {})
    basic_params = {}
    if exposure_control:
        basic_params = {
            "exposure": self._parse_range_string(exposure_control.get("exposure", "+0")),
            "contrast": self._parse_range_string(exposure_control.get("contrast", "+0")),
            "highlights": self._parse_range_string(exposure_control.get("highlights", "+0")),
            "shadows": self._parse_range_string(exposure_control.get("shadows", "+0")),
            "whites": self._parse_range_string(exposure_control.get("whites", "+0")),
            "blacks": self._parse_range_string(exposure_control.get("blacks", "+0"))
        }
    
    # 解析纹理清晰度参数
    texture_clarity = lighting_params.get("texture_clarity", {})
    texture_params = {}
    if texture_clarity:
        texture_params = {
            "texture": self._parse_range_string(texture_clarity.get("texture", "+0")),
            "clarity": self._parse_range_string(texture_clarity.get("clarity", "+0")),
            "dehaze": self._parse_range_string(texture_clarity.get("dehaze", "+0"))
        }
    
    return {
        "naturalLanguage": {},
        "structured": {
            "basic": basic_params,
            "texture": texture_params,
            "toneCurves": tone_curves if tone_curves else None  # 新增
        }
    }

def _parse_range_string(self, range_str: str) -> Dict[str, str]:
    """
    解析范围字符串（如 "+0.2 ~ +0.5"）为 range 和 note
    
    Args:
        range_str: 范围字符串
    
    Returns:
        {"range": "+0.35", "note": "范围描述"}
    """
    if not range_str:
        return {"range": "+0", "note": ""}
    
    # 尝试提取数值
    import re
    numbers = re.findall(r'([+-]?\d+\.?\d*)', range_str)
    
    if len(numbers) >= 2:
        # 如果有范围，计算平均值
        try:
            avg = (float(numbers[0]) + float(numbers[1])) / 2
            range_value = f"{avg:+.2f}" if avg != 0 else "+0"
        except:
            range_value = "+0"
    elif len(numbers) == 1:
        # 如果只有一个数值，直接使用
        try:
            range_value = f"{float(numbers[0]):+.2f}" if float(numbers[0]) != 0 else "+0"
        except:
            range_value = "+0"
    else:
        range_value = "+0"
    
    return {
        "range": range_value,
        "note": range_str
    }
```

---

## 四、前端修改清单

### 4.1 必须修改的文件

1. **`src/components/sections/ReviewSection.tsx`**
   - 在 `colorDepth` 维度中添加直方图显示
   - 仅在参考照片和用户照片下方添加，不改变其他布局

2. **`src/components/CompositionSection.tsx`**
   - 适配新的5字段结构（方案B）
   - 移除7段固定标题的映射逻辑

3. **`src/components/HistogramChart.tsx`**（新建）
   - 最小化实现，仅用于显示 AI 反推直方图
   - 使用 recharts 的 AreaChart

### 4.2 可选修改的文件

1. **`src/components/ToneCurvesDisplay.tsx`**（新建，可选）
   - 如果需要在 Part1 阶段显示色调曲线
   - 复用现有的 `CurveVisualizationLR` 组件

### 4.3 不允许修改的文件

- 所有其他组件和样式文件
- 现有的布局和设计

---

## 五、后端修改清单

### 5.1 必须修改的文件

1. **`server_py/app/services/prompt_template.py`**
   - 替换 Part1 Prompt 为新模版

2. **`server_py/app/services/analysis_formatter.py`**
   - 实现新 Prompt 结构到现有结构的映射
   - 处理直方图数据提取
   - 处理构图分析方案B映射
   - 处理色调曲线映射
   - 实现范围字符串解析

3. **`server_py/app/schemas/analysis_schemas.py`**（可选）
   - 新增字段定义（如果需要）

---

## 六、总结

### 6.1 设计约束确认

- ✅ **直方图**：仅在 colorDepth 维度、参考照片和用户照片下方显示
- ✅ **色调曲线**：复用现有设计
- ✅ **构图分析**：方案B（适配新结构，5字段）
- ❌ **不允许**：任何其他设计变更

### 6.2 实施优先级

1. **高优先级**：后端数据映射
2. **高优先级**：直方图显示（最小化改动）
3. **中优先级**：构图分析适配（方案B）
4. **低优先级**：色调曲线显示（如果需要在 Part1 阶段显示）

---

**重要提醒**：严格遵守设计约束，只允许在指定位置添加直方图，不允许任何其他设计变更！

