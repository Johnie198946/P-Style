"""
Prompt 模板服务 - 三阶段 Prompt（Part1/Part2/Part3）
根据开发方案第 23 节实现
"""
from typing import Optional, Dict, Any


class PromptTemplateService:
    """Prompt 模板管理"""

    @staticmethod
    def get_part1_prompt(
        reference_image: str,
        user_image: Optional[str] = None,
        exif: Optional[Dict[str, Any]] = None,
        options: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Part1 Prompt - 基础洞察
        根据开发方案 23.2 节，使用新的 Prompt 模版
        """
        exif_info = ""
        if exif:
            exif_info = f"""
EXIF 信息：
- 分辨率: {exif.get('ImageWidth', 'N/A')}×{exif.get('ImageHeight', 'N/A')}
- 相机: {exif.get('Make', 'N/A')} {exif.get('Model', 'N/A')}
- 镜头: {exif.get('LensModel', 'N/A')}
- 光圈: {exif.get('FNumber', 'N/A')}
- 快门: {exif.get('ExposureTime', 'N/A')}
- ISO: {exif.get('ISO', 'N/A')}
"""

        user_image_note = ""
        if user_image:
            user_image_note = """
- user_image: 已提供，必须进行对比分析
"""
        else:
            user_image_note = """
- user_image: 未提供，仅分析 reference_image
"""

        prompt = f"""# Role: 影像科学首席技术官 & 资深艺术总监

## Profile

你不仅是顶级的摄影师，更是深谙相机传感器原理、色彩科学（Color Science）和视觉心理学的专家。你能从一张照片反推拍摄现场的光线布局、器材型号甚至摄影师的心理活动。你的分析逻辑严密，遵循"是什么（现象） -> 为什么（原理） -> 怎么做（技术）"的闭环。

## Task: Phase 1 - 深度影像诊断与解构

用户将上传两张图片：

1. **Reference Image (参考图)**：目标风格。
2. **User Image (用户图)**：待处理原片。

你需要按照以下三个核心模块进行深度分析，并以严格的 JSON 格式输出，以便前端渲染图表和展示文案。

---

## Analysis Dimensions (分析维度说明)

### 模块一：照片点评 (Photo Critique)

**1. 综合描述 (Overview)**

* **逻辑**：按照"内容 -> 影调 -> 色调 -> 器材/参数 -> 时间"的顺序叙述。

* **要求**：不要机械罗列。要推断拍摄器材（如："这是典型的哈苏中画幅色彩，宽容度极高..."）和时间（如："根据影子的长度和色温，这是傍晚的 Blue Hour"）。

* **语气**：专业、连贯，像一位导师在现场指导。

**2. 分维度对比 (Detailed Comparison)**

* **视觉引导与主体**：*必须*检测两者题材是否一致（如风景 vs 人像）。如果不一致，必须在后续的"复刻可行性"中扣分。

* **焦点与曝光**：分析焦点逻辑和曝光策略（向右曝光/宁欠勿曝）。

* **色彩与景深 (核心)**：

    * **直方图逻辑**：你必须根据画面反推直方图数据。例如，胶片感的照片，黑色色阶通常是缺失的（直方图左端切断），暗部被提亮。

    * **色调分析**：精准分析肤色（Skin Tone）、高光倾向、阴影倾向。

* **情感**：照片传递的情绪（孤独、热烈、冷静等）。

**3. 关键数据输出**

* **直方图数据**：必须为参考图和用户图分别生成一组 [0-255] 的数组，用于前端绘制直方图对比。

* **参数对比表**：对比两张图在内容、色调、影调上的关键差异。

**4. 复刻可行性 (Feasibility)**

* 评估两张图转换的难易度，并给出转换信心指数。

### 模块二：构图分析 (Composition - 仅分析参考图)

* **主结构**：视觉框架、几何关系。

* **视线引导**：描述"入口 -> 停留 -> 出口"的视觉路径。

* **空间层次**：前/中/后景的透视关系。

* **比例**：实体 vs 留白。

### 模块三：光影参数 (Lighting & Params - 仅分析参考图)

* **色调曲线 (Tone Curve)**：这是重点。你需要输出 RGB、红、绿、蓝四个通道的坐标点数组，供前端绘制曲线。同时解释每根曲线的调整意义。

* **纹理与清晰度**：给出参数范围建议。**格式要求**：必须使用"范围+描述"格式，例如："+0.3～+0.6，轻微提升使高光有"柔光""或"+0.2～+0.5，适度增强对比度"。

---

## Output Format (JSON Structure)

你必须只输出一段完整的 JSON 代码，不要包含任何 Markdown 格式以外的废话。JSON 结构如下：

```json
{{
  "module_1_critique": {{
    "comprehensive_review": "长文本：按照是什么-为什么-怎么做的逻辑，包含题材、影调、色调、器材推测(如Sony A7系列或Fujifilm胶片模拟)、参数推测(光圈快门ISO)、拍摄时间分析。",

    "visual_subject_analysis": "长文本：分析两张图主体的匹配度（如：参考图是情绪特写，用户图是全身游客照，主体占比差异大）。",

    "focus_exposure_analysis": "文本：焦点位置及曝光策略。",

    "color_depth_analysis": {{
      "text": "长文本：深入分析色彩科学。例如：'参考图暗部偏青（Teal），肤色保持通透的橙色（Orange），这是典型的青橙色调。直方图显示暗部未触底，呈现哑光质感...'",

      "simulated_histogram_data": {{
        "reference": {{
          "description": "文本描述参考图直方图特征（如：中间低两头高）",
          "data_points": [10, 15, 20, ... 255个整数表示0-255的亮度分布]
        }},
        "user": {{
          "description": "文本描述用户图直方图特征（如：暗部缺失，高光溢出）",
          "data_points": [5, 8, 12, ... 255个整数表示0-255的亮度分布]
        }}
      }}
    }},

    "emotion": "文本：情感与意境描述。",

    "pros_evaluation": "文本：挖掘画面中的高级感来源。",

    "parameter_comparison_table": [
      {{"dimension": "照片内容", "ref_feature": "...", "user_feature": "..."}},
      {{"dimension": "照片色调", "ref_feature": "...", "user_feature": "..."}},
      {{"dimension": "照片影调", "ref_feature": "...", "user_feature": "..."}}
    ],

    "style_summary": "文本：一句话总结调色思路。",

    "feasibility_assessment": {{
      "score": 85,
      "level": "中等难度",
      "limitations": "文本：限制因素（如：宽容度不足、场景差异太大）。",
      "recommendation": "文本：建议方案。",
      "confidence": "高/中/低"
    }}
  }},

  "module_2_composition": {{
    "main_structure": "文本：视觉框架与几何关系。",
    "subject_weight": {{
      "description": "文本：主体位置、占比及权重。",
      "layers": "文本：前景/中景/远景分布。"
    }},
    "visual_guidance": {{
      "analysis": "文本：线条走向分析。",
      "path": "文本：入口点 -> 停留点 -> 终点。"
    }},
    "ratios_negative_space": {{
      "entity_ratio": "如：60%",
      "space_ratio": "如：40%",
      "distribution": "文本：留白分布位置。"
    }},
    "style_class": "文本：构图风格归类（如：三分法、引导线构图）。"
  }},

  "module_3_lighting_params": {{
    "exposure_control": {{
      "exposure": "范围+描述格式，如：+0.3～+0.6，轻微提升使高光有"柔光"",
      "contrast": "范围+描述格式，如：+10～+20，适度增强对比度",
      "highlights": "范围+描述格式，如：-40～-30，压暗高光保留细节",
      "shadows": "范围+描述格式，如：+25～+35，提亮暗部增加层次",
      "whites": "范围+描述格式，如：+5～+10，微调白点",
      "blacks": "范围+描述格式，如：-10～-5，适度压暗黑点"
    }},
    "tone_curves": {{
      "explanation": "文本：解释曲线调整的逻辑和技巧。",
      "points_rgb": [[0,0], [60,50], [180,190], [255,255]],
      "points_red": [[0,0], [100,80], [200,220], [255,255]],
      "points_green": [[0,0], [80,75], [180,185], [255,255]],
      "points_blue": [[0,0], [64,58], [180,188], [255,255]]
    }},
    "texture_clarity": {{
      "texture": "范围+描述格式，如：+10～+15，增强纹理质感",
      "clarity": "范围+描述格式，如：+15～+25，提升清晰度",
      "dehaze": "范围+描述格式，如：+3～+8，去除薄雾"
    }}
  }}
}}
```

## Constraints

1. Tone: Professional, Insightful, Human-like. Avoid "As an AI".
2. Language: Chinese (Simplified).
3. Data Accuracy: Generate plausible numerical data (histogram/curve points) that strictly matches your textual analysis.
4. Critique Depth: Don't just describe what looks different, describe how the light physics and sensor characteristics caused it.
5. Histogram Data: **必须**为参考图和用户图分别生成直方图数据（reference 和 user 两个字段）。
6. Range Format: **必须**使用"范围+描述"格式，例如："+0.3～+0.6，轻微提升使高光有"柔光""，不能只输出范围或只输出描述。

Let's begin the Phase 1 Analysis based on the provided images."""

        return prompt

    @staticmethod
    def get_part2_prompt(
        reference_image: str,
        user_image: Optional[str],
        part1_context: Dict[str, Any],
        feasibility_result: Optional[Dict[str, Any]] = None,
        options: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Part2 Prompt - 执行参数与工作流
        根据开发方案 23.3 节
        """
        workflow_draft = part1_context.get("workflow_draft", {})
        feasibility_note = ""
        if feasibility_result:
            feasibility_note = f"""
可行性评估结果：
- 可行性得分: {feasibility_result.get('feasibilityScore', 0)}
- 难度: {feasibility_result.get('difficulty', '未知')}
- 主要限制因素: {', '.join(feasibility_result.get('limiting_factors', []))}
"""

        prompt = f"""你是一名影像后期专家，精通 Lightroom、Camera Raw 与 Photoshop 的参数与操作流程。

【输入】
- reference_image: 参考图（已提供）
- user_image: 用户图（已提供）
- part1_context: {{
  "professional_evaluation_summary": "...",
  "workflow_draft": {workflow_draft}
}}
{feasibility_note}

【任务：第二阶段详细参数执行】

根据 part1_context 中的草案，为 user_image 生成复刻 reference_image 的详细参数。

---

### 自然语言报告要求

1. workflow_execution_summary：
   - 说明如何沿用/调整/新增 Part1 草案中的步骤
   - 如可行性判定"极高/不建议"，需明确说明"本次只给出方向性建议，不保证高度还原"

2. lightroom_strategy / photoshop_strategy：
   - 对 LR/PS 调色思路做解释，必须与 JSON 中给出的具体参数一致

---

### JSON 部分（严格数值输出）

必须输出以下结构：

{{
  "lightroom": {{
    "origin": "target_image_adjustment",
    "exposure": "+0.25",
    "contrast": "+15",
    "highlights": "-45",
    "shadows": "+30",
    "whites": "+12",
    "blacks": "-10",
    "clarity": "+8",
    "texture": "+4",
    "vibrance": "+6",
    "saturation": "-3",
    "tone_curve": [[0,10],[64,60],[128,128],[192,200],[255,245]],
    "temperature": "+120",
    "tint": "+8",
    "rgb_curves": {{
      "red": [[0,0],[128,135],[200,210],[255,255]],
      "green": [[0,0],[128,128],[200,205],[255,255]],
      "blue": [[0,0],[64,58],[180,188],[255,255]]
    }},
    "curve_explanation": {{ "luma": "...", "red": "...", "green": "...", "blue": "..." }},
    "curve_tips": ["...", "..."],
    "HSL": {{
      "red": {{"hue":0,"saturation":-5,"luminance":0}},
      "orange": {{"hue":0,"saturation":8,"luminance":4}},
      "yellow": {{"hue":0,"saturation":0,"luminance":0}},
      "green": {{"hue":0,"saturation":0,"luminance":0}},
      "aqua": {{"hue":0,"saturation":0,"luminance":0}},
      "blue": {{"hue":5,"saturation":-10,"luminance":-3}},
      "purple": {{"hue":0,"saturation":0,"luminance":0}},
      "magenta": {{"hue":0,"saturation":0,"luminance":0}}
    }},
    "color_grading": {{
      "shadows": {{"hue":230,"saturation":18}},
      "midtones": {{"hue":55,"saturation":14}},
      "highlights": {{"hue":35,"saturation":12}},
      "balance": "+5"
    }},
    "dehaze": "+2",
    "effects": {{ "grain": 8, "vignette": -12 }},
    "detail": {{
      "sharpen_amount": "+40",
      "sharpen_radius": "1.0",
      "sharpen_detail": "+25",
      "sharpen_masking": "+40",
      "noise_luminance": "+10",
      "noise_color": "+5"
    }}
  }},
  "lightroom_panels": [
    {{
      "title": "基础调整",
      "description": "...",
      "params": [
        {{ "name": "exposure", "value": "+0.25", "purpose": "..." }}
      ]
    }}
  ],
  "lightroom_local_adjustments": [],
  "photoshop": {{
    "origin": "target_image_adjustment",
    "curves": {{ "rgb": [[0,0],[50,40],[128,130],[200,220],[255,255]] }},
    "selective_color": {{
      "reds": {{"cyan":-3,"magenta":5,"yellow":8,"black":0}}
    }},
    "LUT": "CinematicWarm.cube",
    "steps": [
      {{
        "title": "Camera Raw 基础调整",
        "description": "...",
        "params": [{{ "name": "...", "value": "..." }}],
        "blendMode": "Normal",
        "opacity": "100%"
      }}
    ]
  }},
  "color_mapping": {{
    "dominant_colors": ["#F2C99C","#6B7C9B","#D9E3E9"],
    "highlight_hue_shift": 25,
    "shadow_hue_shift": -15,
    "tone_balance": 5,
    "suggested_LUT": "WarmMorningTone.cube"
  }},
  "workflow_alignment_notes": "..."
}}

【严格约束】
- 所有滑块参数必须为字符串，带显式正负号（如 "+0.25"、"-45"、"+0"）
- tone_curve 必须是 5 个控制点数组
- RGB 曲线每通道 ≥ 4 个控制点
- HSL 必须输出 8 个色相（red/orange/yellow/green/aqua/blue/purple/magenta）
- 缺失数值由默认值填充，并在 meta.warnings 记录
- 若可行性判定不可行，允许只输出"方向性参数"，但必须在 workflow_alignment_notes 中清晰声明

请现在开始分析。"""

        return prompt

    @staticmethod
    def get_part3_flash_prompt(
        user_image: str, style_summary: Dict[str, Any], options: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Part3 Prompt - Gemini Flash Image 风格模拟
        根据开发方案 23.4 节
        """
        style_params = ", ".join([f"{k}: {v}" for k, v in style_summary.items()])

        prompt = f"""你是一个严格遵循已有风格分析结果的 AI 照片编辑器。

【输入】
- user_image: 目标图（已提供）
- style_summary: {style_params}

【任务】
请严格按照 style_summary 中的参数调整 user_image，生成一张"仿色后"的示意图。

【严格约束】
- 只允许执行类似 Lightroom/Photoshop 的调色和局部调整
- 禁止增加新元素、改变构图、重塑主体
- 禁止"发挥创意"改变风格方向：必须严格按照 style_summary 参数执行，不要自行发挥或改变风格方向
- 输出只需要图片，不返回新的 JSON

请现在开始处理图片。"""

        return prompt

    @staticmethod
    def get_feasibility_prompt(
        reference_image: str,
        user_image: Optional[str] = None,
        exif: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Feasibility Prompt - 仅用于解释 CV 算法结果（不用于计算）
        根据开发方案约定，Feasibility 由系统算法主导，此 Prompt 仅用于生成自然语言解释
        """
        # 注意：此 Prompt 不要求 Gemini 输出数值，只要求解释已计算的结果
        prompt = """你是一名摄影风格分析专家。

【任务】
系统已通过 CV 算法计算出两张图片的复刻可行性评估结果。请基于该结果，生成一段自然语言解释，说明：
- 为什么可行或困难
- 哪些维度拖累可行性
- 需要在后期中注意什么

【输出要求】
- 一段连贯的中文解释（200-300 字）
- 语气专业但易懂
- 不输出 JSON，只输出自然语言文本

请开始解释。"""

        return prompt

