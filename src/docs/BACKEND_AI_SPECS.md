# Backend & AI Integration Specifications

此文档定义了前端实现 "Photo Critique (照片点评)" 模块中 **双向视觉联动 (Text-to-Visual Interaction)** 所需的数据结构和逻辑。

## 核心需求

前端需要实现以下交互：
1. 用户悬停在 "Visual Subject (视觉主体)" 文字上 -> 图片上高亮显示主体的 Bounding Box。
2. 用户悬停在 "Focus & Exposure (对焦与曝光)" 文字上 -> 图片上高亮显示高光或焦点区域。
3. 用户悬停在 "Color & Emotion (色彩情感)" 文字上 -> 图片上高亮显示主要色彩区域。

因此，后端 Gemini 模型在进行 Part 1 分析时，**必须** 返回对应的图像坐标区域 (ROI)。

## JSON Response Schema (Part 1 Analysis)

后端 `/api/analyze/part1` 接口返回的 JSON 数据中，`structured_analysis` 字段必须包含 `overlays` 对象。

### 坐标系统说明
*   所有坐标必须为 **百分比 (0-100)**，而非像素值。这确保了前端在不同屏幕尺寸下的响应式适配。
*   原点 (0,0) 为图片左上角。
*   `x`: 左上角 X 轴百分比
*   `y`: 左上角 Y 轴百分比
*   `w`: 宽度百分比
*   `h`: 高度百分比

### 数据结构示例

```json
{
  "style_summary": "Cyberpunk aesthetic with high contrast...",
  
  // 必须包含以下三个具体的分析字段，ID 必须与前端硬编码匹配
  "visual_subject_analysis": "The main subject is positioned in the center...",
  "focus_exposure_analysis": "The lighting highlights the facial features...",
  "emotion": "The cool blue tones evoke a sense of mystery...",

  // 关键：视觉映射图层
  "overlays": {
    "visual_subject": {
      "x": 25.5,
      "y": 10.0,
      "w": 50.0,
      "h": 80.0,
      "label": "SUBJECT"
    },
    "focus_exposure": {
      "x": 40.0,
      "y": 20.0,
      "w": 20.0,
      "h": 15.0,
      "label": "HIGHLIGHTS"
    },
    "color_depth": {
      "x": 0.0,
      "y": 0.0,
      "w": 100.0,
      "h": 100.0,
      "label": "ATMOSPHERE" 
    }
  },

  // ... 其他现有字段 (histogram, feasibility 等)
}
```

## Pydantic 模型建议 (Python Backend)

在后端的 Pydantic Model 定义中，请确保包含以下结构：

```python
class BoundingBox(BaseModel):
    x: float = Field(..., description="X position in percentage (0-100)")
    y: float = Field(..., description="Y position in percentage (0-100)")
    w: float = Field(..., description="Width in percentage (0-100)")
    h: float = Field(..., description="Height in percentage (0-100)")
    label: str = Field(..., description="Short label for the region")

class AnalysisOverlays(BaseModel):
    visual_subject: BoundingBox
    focus_exposure: BoundingBox
    color_depth: BoundingBox

class StructuredAnalysisResult(BaseModel):
    # ... existing fields
    overlays: AnalysisOverlays
```

## 前端 ID 映射表

前端 `ReviewModal.tsx` 严格依赖以下 ID 进行映射，请勿更改 Key 名称：

| 前端组件 ID | 后端 JSON Key | 描述 | 建议 ROI 内容 |
| :--- | :--- | :--- | :--- |
| `visual_subject` | `visual_subject` | 视觉主体分析 | 框选画面中的主要人物或物体 |
| `focus_exposure` | `focus_exposure` | 曝光与焦点 | 框选画面中最亮的部分或对焦点 |
| `color_depth` | `color_depth` | 色彩与氛围 | 框选代表主色调的区域，或者是全图 |
