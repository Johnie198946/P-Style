# AI 诊断 Prompt 模版完整文档

## 📋 文档说明

**文件位置**：`server_py/app/services/prompt_template.py`  
**方法名称**：`get_diagnosis_prompt`  
**行号范围**：第 854-970 行  
**功能**：生成 AI 诊断的 Prompt，用于调用 Gemini API 进行专业摄影诊断

---

## 🔍 Prompt 模版完整内容

```python
def get_diagnosis_prompt(
    histogram_data: Dict[str, Any],
    dominant_colors: List[Dict[str, Any]],
) -> str:
    """
    AI 诊断 Prompt - 专业摄影诊断报告
    根据色彩雷达和AI诊断功能完整设计方案实现
    
    Args:
        histogram_data: 直方图统计数据
            {
                "r": [0, 1, 2, ...],  # 256 个整数，红色通道分布
                "g": [0, 1, 2, ...],  # 绿色通道分布
                "b": [0, 1, 2, ...],  # 蓝色通道分布
                "l": [0, 1, 2, ...],  # 亮度分布
                "avgL": 128,  # 平均亮度
                "shadows": 0.2,  # 暗部比例
                "midtones": 0.5,  # 中间调比例
                "highlights": 0.8  # 高光比例
            }
        dominant_colors: 主色调列表
            [
                {"h": 180, "s": 0.8, "v": 0.9, "hex": "#00FFFF"},
                ...
            ]
    
    Returns:
        完整的诊断 Prompt 文本
    """
    # 格式化主色调信息
    dominant_colors_text = "\n".join([
        f"- {i+1}. 色相 {color.get('h', 0):.0f}°, 饱和度 {color.get('s', 0):.2f}, 明度 {color.get('v', 0):.2f}, HEX: {color.get('hex', '#000000')}"
        for i, color in enumerate(dominant_colors[:5])  # 只显示前5个
    ])
    
    prompt = f"""你是一位专业的高级调色师和摄影导师。请分析这张图片的数据，并提供专业的诊断报告。

## 输入数据

### 直方图统计
- 平均亮度：{histogram_data.get('avgL', 0)}/255
- 暗部比例：{histogram_data.get('shadows', 0):.1%}
- 中间调比例：{histogram_data.get('midtones', 0):.1%}
- 高光比例：{histogram_data.get('highlights', 0):.1%}

### 主色调
{dominant_colors_text if dominant_colors else "未检测到明显主色调"}

## 分析任务

请从以下维度进行评分（0-10分）：
1. **曝光 (Exposure)**：评估曝光是否准确，是否有过曝或欠曝，高光/阴影细节是否保留
2. **色彩 (Color)**：评估色彩平衡、饱和度、色温是否合适，是否有色偏
3. **构图 (Composition)**：评估画面构图、视觉引导、主体位置、留白比例
4. **情感 (Mood)**：评估照片传递的情绪和氛围，是否符合拍摄意图

## 输出要求

请以 JSON 格式输出，结构如下：

```json
{{
  "scores": {{
    "exposure": 8.5,
    "color": 7.2,
    "composition": 9.0,
    "mood": 8.8
  }},
  "critique": "详细的分析文字，指出照片的优点和问题。例如：'高光部分细节丢失严重，建议降低曝光。画面整体偏暖，色温可以适当降低。构图采用了三分法，视觉重心在左下角，留白比例合适。'",
  "suggestions": [
    "尝试将色温滑块向左移动 -500K",
    "降低高光值以恢复天空细节",
    "提升阴影值以增加暗部层次"
  ],
  "issues": [
    {{
      "type": "exposure",
      "severity": "high",
      "description": "高光溢出",
      "region": "sky"
    }},
    {{
      "type": "color",
      "severity": "medium",
      "description": "白平衡偏黄",
      "region": null
    }}
  ]
}}
```

## 分析原则

1. **专业性**：使用专业术语，但解释要通俗易懂
2. **具体性**：不要泛泛而谈，要指出具体问题和具体建议
3. **可操作性**：建议要具体到参数调整（如"色温 -500K"、"高光 -30"）
4. **平衡性**：既要指出问题，也要肯定优点
5. **准确性**：评分要客观，不要过于宽松或严格

## 问题类型说明

- **exposure**: 曝光相关问题（过曝、欠曝、高光/阴影细节丢失）
- **color**: 色彩相关问题（色温、色偏、饱和度）
- **composition**: 构图相关问题（主体位置、视觉引导、留白）
- **mood**: 情感氛围相关问题（情绪表达、氛围营造）

## 严重程度说明

- **high**: 严重影响画面质量，必须修复
- **medium**: 影响画面质量，建议修复
- **low**: 轻微影响，可选修复

请开始分析。"""

    return prompt
```

---

## 📊 Prompt 结构分析

### 1. 角色定义

**角色**：专业的高级调色师和摄影导师

**职责**：
- 分析图片数据
- 提供专业诊断报告
- 给出具体改进建议

### 2. 输入数据

#### 2.1 直方图统计

**数据格式**：
```python
{
    "avgL": 128,      # 平均亮度（0-255）
    "shadows": 0.2,   # 暗部比例（0-1）
    "midtones": 0.5,  # 中间调比例（0-1）
    "highlights": 0.8 # 高光比例（0-1）
}
```

**用途**：
- 评估曝光准确性
- 判断高光/阴影细节保留情况
- 分析画面亮度分布

#### 2.2 主色调

**数据格式**：
```python
[
    {
        "h": 180,      # 色相（0-360）
        "s": 0.8,      # 饱和度（0-1）
        "v": 0.9,      # 明度（0-1）
        "hex": "#00FFFF" # HEX 颜色值
    },
    ...
]
```

**用途**：
- 分析色彩倾向
- 评估色彩平衡
- 识别色偏问题

### 3. 分析任务

**四个维度评分（0-10分）**：

1. **曝光 (Exposure)**
   - 评估曝光是否准确
   - 是否有过曝或欠曝
   - 高光/阴影细节是否保留

2. **色彩 (Color)**
   - 评估色彩平衡
   - 饱和度是否合适
   - 色温是否合适
   - 是否有色偏

3. **构图 (Composition)**
   - 评估画面构图
   - 视觉引导
   - 主体位置
   - 留白比例

4. **情感 (Mood)**
   - 评估照片传递的情绪
   - 氛围营造
   - 是否符合拍摄意图

### 4. 输出要求

**JSON 格式**：

```json
{
  "scores": {
    "exposure": 8.5,
    "color": 7.2,
    "composition": 9.0,
    "mood": 8.8
  },
  "critique": "详细的分析文字...",
  "suggestions": [
    "尝试将色温滑块向左移动 -500K",
    "降低高光值以恢复天空细节",
    "提升阴影值以增加暗部层次"
  ],
  "issues": [
    {
      "type": "exposure",
      "severity": "high",
      "description": "高光溢出",
      "region": "sky"
    }
  ]
}
```

**字段说明**：

- **scores**: 四个维度的评分（0-10分）
- **critique**: 详细的分析文字，指出优点和问题
- **suggestions**: 具体的改进建议（可操作）
- **issues**: 问题列表
  - **type**: 问题类型（exposure/color/composition/mood）
  - **severity**: 严重程度（high/medium/low）
  - **description**: 问题描述
  - **region**: 问题区域（sky/shadow/highlight/null）

### 5. 分析原则

1. **专业性**：使用专业术语，但解释要通俗易懂
2. **具体性**：不要泛泛而谈，要指出具体问题和具体建议
3. **可操作性**：建议要具体到参数调整（如"色温 -500K"、"高光 -30"）
4. **平衡性**：既要指出问题，也要肯定优点
5. **准确性**：评分要客观，不要过于宽松或严格

### 6. 问题类型说明

- **exposure**: 曝光相关问题（过曝、欠曝、高光/阴影细节丢失）
- **color**: 色彩相关问题（色温、色偏、饱和度）
- **composition**: 构图相关问题（主体位置、视觉引导、留白）
- **mood**: 情感氛围相关问题（情绪表达、氛围营造）

### 7. 严重程度说明

- **high**: 严重影响画面质量，必须修复
- **medium**: 影响画面质量，建议修复
- **low**: 轻微影响，可选修复

---

## 🔄 数据流

### 前端 → 后端

1. **前端收集数据**：
   - 计算直方图数据（`calculateHistogramData`）
   - 生成低分辨率图片（`getLowResImage`，512x512）
   - 提取主色调（从色彩雷达获取）

2. **前端发送请求**：
   ```typescript
   await api.analyze.diagnosis({
     imageUrl: lowResImage,      // base64 图片
     histogramData: histogramData,  // 直方图数据
     dominantColors: dominantColors  // 主色调列表
   });
   ```

3. **后端接收请求**：
   - 验证参数（`DiagnosisRequestSchema`）
   - 构建 Prompt（`get_diagnosis_prompt`）
   - 调用 Gemini API（多模态：图片 + 文本）

4. **后端返回结果**：
   - 验证响应（`validate_diagnosis_response`）
   - 返回结构化数据

### 后端 → Gemini API

1. **构建请求内容**：
   ```python
   contents = [{
       "role": "user",
       "parts": [
           {"text": prompt},  # 文本 Prompt
           {
               "inline_data": {
                   "mime_type": "image/jpeg",
                   "data": image_data  # base64 图片数据
               }
           }
       ]
   }]
   ```

2. **调用 Gemini API**：
   ```python
   gemini_response = gemini_service.generate_text(
       contents,
       stage="diagnosis",
       response_mime="application/json"
   )
   ```

3. **验证响应**：
   - 解析 JSON
   - 验证字段完整性
   - 验证数据类型

---

## 📝 使用示例

### 示例 1：正常调用

**输入数据**：
```python
histogram_data = {
    "avgL": 128,
    "shadows": 0.2,
    "midtones": 0.5,
    "highlights": 0.8
}

dominant_colors = [
    {"h": 180, "s": 0.8, "v": 0.9, "hex": "#00FFFF"},
    {"h": 30, "s": 0.7, "v": 0.8, "hex": "#FF8000"}
]
```

**生成的 Prompt**：
```
你是一位专业的高级调色师和摄影导师。请分析这张图片的数据，并提供专业的诊断报告。

## 输入数据

### 直方图统计
- 平均亮度：128/255
- 暗部比例：20.0%
- 中间调比例：50.0%
- 高光比例：80.0%

### 主色调
- 1. 色相 180°, 饱和度 0.80, 明度 0.90, HEX: #00FFFF
- 2. 色相 30°, 饱和度 0.70, 明度 0.80, HEX: #FF8000

## 分析任务
...
```

### 示例 2：无主色调

**输入数据**：
```python
histogram_data = {...}
dominant_colors = []
```

**生成的 Prompt**：
```
### 主色调
未检测到明显主色调
```

---

## ⚙️ 技术细节

### 1. Prompt 格式化

- 使用 Python f-string 格式化
- 动态插入直方图统计和主色调数据
- 确保数据格式正确（百分比、小数等）

### 2. 主色调格式化

- 只显示前 5 个主色调（`dominant_colors[:5]`）
- 格式化输出：色相（度）、饱和度（小数）、明度（小数）、HEX 值
- 如果没有主色调，显示"未检测到明显主色调"

### 3. JSON 输出要求

- 使用 JSON 格式（`response_mime="application/json"`）
- 确保字段完整性和类型正确
- 使用 Schema 验证响应

---

## 🔍 验证和测试

### 1. Prompt 验证

- 检查 Prompt 长度（不应过长）
- 检查数据格式化（百分比、小数等）
- 检查主色调格式化

### 2. 响应验证

- 使用 `validate_diagnosis_response` 验证
- 检查必需字段（scores, critique, suggestions, issues）
- 检查数据类型和范围

### 3. 错误处理

- 如果 Gemini 返回格式不正确，记录日志
- 如果验证失败，返回错误信息
- 确保前端能正确处理错误

---

## 📚 相关文件

- **Prompt 模版**：`server_py/app/services/prompt_template.py`
- **Schema 定义**：`server_py/app/schemas/analysis_schemas.py`
- **API 路由**：`server_py/app/routes/analyze.py`
- **前端组件**：`src/components/analysis/AIAnalysisPanel.tsx`
- **API 客户端**：`src/src/lib/api.ts`

---

**文档版本**：V1.0  
**创建时间**：2025-01-24  
**说明**：本文档展示 AI 诊断功能的完整 Prompt 模版

