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
        根据开发方案 23.2 节
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

        prompt = f"""你是一名资深摄影师与影像后期专家，精通 Lightroom、Camera Raw 与 Photoshop 的各项参数与操作流程。

【输入说明】
- reference_image: 参考图（已提供）
{user_image_note}
- optional_style: {options.get('optional_style', '无') if options else '无'}
{exif_info}

【任务：第一阶段基础洞察】

请输出两部分内容：
1. 自然语言分析报告（摄影师口吻、连贯叙述）
2. 严格结构化的 JSON

---

### Step 1 — 专业摄影师视角评价（必须输出）

以专业摄影师口吻连贯叙述，内容覆盖以下维度，均需说明"为什么/如何/体现在哪里"：

1. 视觉引导与主体（第一视觉焦点、视线引导路径、颜色/亮度/位置对视线的影响）
2. 焦点与曝光（对焦与景深、曝光是否有意为之、对整体情绪的影响）
3. 色彩与景深（主体与背景色彩关系、空间感与景深表现）
4. 构图与表达（主体位置、构图法则、视觉平衡、情绪与主题表达）
5. 技术细节（剪裁/拍摄角度/后期方向的具体建议）
6. 设备与技术（若有 EXIF 优先使用；若无则基于画面推断相机/镜头类型，并说明依据）
7. 色彩与情感（颜色组合与情绪）
8. 优点评价（"好在哪里"，并给出技术或艺术层面的证据）
9. 对比分析（若提供 user_image，必须给出结构化对比：对比项 / 参考图 / 用户图 / 差异 / 调整建议）

结尾必须有一句「摄影师风格总结」短句，用于前端 Summary 卡片。

---

### Step 2 — 整体影像分析（量化）

- 场景类型识别（例如 "landscape"/"portrait"/"architecture"/"documentary" 等）
- 画面结构：主体位置（例如 "right_third" 或精确百分比）、留白说明、三分法/对称/引导线识别
- 分辨率：若 EXIF 提供 ImageWidth/ImageHeight，必须使用 EXIF 值；否则用真实像素尺寸；禁止猜测
- 输出平均亮度（示例格式 "152/255"）、景深描述（浅/长）、拍摄时间段（如 "golden_hour"）、光线方向（如 "from_left_45deg"）
- 若有 EXIF，相机/镜头/光圈/快门/ISO 信息必须列出并用于后续分析

---

### Step 4 — 可复刻可行性说明

引用系统已计算的可行性评估结果（feasibilityScore、difficulty、confidence、Top-3 拖累项），以自然语言解释：
- 为什么可行或困难
- 哪些维度拖累可行性
- 需要在后期中注意什么

---

### Step 6 — 结构化输出（JSON，必须）

最终必须返回符合以下 JSON 模板：

{{
  "professional_evaluation": {{
    "visual_guidance": "<string>",
    "focus_exposure": "<string>",
    "color_depth": "<string>",
    "composition_expression": "<string>",
    "technical_details": "<string>",
    "equipment_analysis": "<string>",
    "color_palette": "<string>",
    "photo_emotion": "<string>",
    "strengths": "<string>",
    "comparison": "<if user_image provided: structured table/array; else: 'no user_image provided'>"
  }},
  "analysis_meta": {{
    "conversion_feasibility": {{
      "can_transform": true,
      "difficulty": "中",
      "confidence": 0.82,
      "limiting_factors": ["..."],
      "recommendation": "..."
    }},
    "parameter_interpretation": {{
      "temperature": {{ "value": "+120", "meaning": "..." }},
      "tint": {{ "value": "+8", "meaning": "..." }}
    }},
    "notes": {{ "composition": "...", "lighting": "...", "color": "..." }}
  }},
  "composition": {{
    "origin": "source_image",
    "type": "landscape",
    "focus_area": "right_third",
    "light_direction": "from_left",
    "mood": "warm and calm",
    "resolution": "7952×5304",
    "avg_brightness": "152/255",
    "depth_of_field": "广角长景深",
    "advanced_sections": [
      {{ "title": "画面主结构分析", "content": "..." }},
      {{ "title": "主体位置与视觉权重", "content": "..." }},
      {{ "title": "线条与方向引导", "content": "..." }},
      {{ "title": "空间层次与分区", "content": "..." }},
      {{ "title": "比例与留白", "content": "..." }},
      {{ "title": "视觉平衡与动势", "content": "..." }},
      {{ "title": "构图风格归类与改进建议", "content": "..." }}
    ]
  }},
  "workflow_draft": {{
    "stages": [
      {{ "name": "基础调整", "target": "...", "actions": ["..."] }}
    ],
    "risks": ["..."],
    "alignment": "..."
  }}
}}

【严格约束】
- 所有字段必须存在，不可使用占位词（"示例"、"未提供"、"N/A"）
- 构图七段（advanced_sections）必须全部输出，缺一不可
- 若无需调整，返回 "+0" 或省略字段并在 analysis_meta.notes 说明原因
- 输出必须包含自然语言报告与 JSON，两部分内容必须一致

请现在开始分析。"""

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

