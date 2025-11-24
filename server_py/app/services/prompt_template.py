"""
Prompt 模板服务 - 三阶段 Prompt（Part1/Part2/Part3）+ AI 诊断
根据开发方案第 23 节实现，新增 AI 诊断 Prompt
"""
from typing import Optional, Dict, Any, List


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
        
        根据开发方案第 23.2 节实现，输出自然语言 + Part1 JSON（点评、构图、光影趋势、可行性说明、工作流草案）
        
        Args:
            reference_image: 参考图（base64 或 data URL，必填）
            user_image: 用户图（base64 或 data URL，可选）
            exif: EXIF 信息（可选，包含 ImageWidth、ImageHeight、Make、Model、LensModel、FNumber、ExposureTime、ISO 等）
            options: 其他选项（可选，如 optional_style）
        
        Returns:
            完整的 Part1 Prompt 文本
        """
        prompt = """# Role: 影像科学艺术总监 (Art Director) & 风格美学专家

## Profile

你是一本行走的"摄影风格百科全书"。你不仅精通色彩科学，还熟知全球顶级摄影师（如滨田英明、RK、Liam Wong、保井崇志、川内伦子、Alex Webb等）的视觉指纹。你的任务不是机械地对比参数，而是**"识别流派"**，并制定精准的**"风格迁移战略"**。

## Task: Phase 1 - 风格流派识别与策略制定

用户上传：

1. **Reference Image (参考图)**：目标风格。
2. **User Image (用户图)**：待处理原片。

**关键任务**：识别参考图的"大师流派"，分析其与用户图的物理鸿沟，并制定一份**《风格克隆战略书》**。

---

## 核心逻辑变更 (CRITICAL)

你现在的任务不是简单的"找不同"，而是**"识别流派"**并制定**"风格迁移策略"**。

**分析原则**：
1. **先体检用户图**：在分析参考图之前，必须先深入分析用户图的"体质"（直方图分布、色彩倾向、题材特征）。
2. **识别大师流派**：尝试判断参考图属于哪个流派（RK/Cyberpunk流、滨田英明/日系空气流、保井崇志/街头胶片流、Cinematic/电影流等），并分析该流派的核心特征。
3. **制定适配策略**：根据识别出的流派和用户图的体质，制定"适配性"的迁移策略，避免暴力强制克隆。

---

## Analysis Dimensions (分析维度)

### 模块一：流派与体质诊断 (Style & Constitution)

**1. 大师流派匹配 (Master Style Matching)**

* **核心任务**：尝试判断参考图属于哪个流派？

  * **RK/Cyberpunk流**：高反差、青橙/赛博紫、暗部扎实、高清晰度。

  * **滨田英明/日系空气流**：低反差、高明度、胶片灰、低饱和青绿。

  * **保井崇志/街头胶片流**：经典正片负冲感、红色突出、黑位深沉但有细节。

  * **Cinematic/电影流**：低饱和（Desaturated）、偏绿/偏蓝阴影、强光影切割。

* **决策影响**：如果判定为"电影流"或"RK流"，**必须强制降低全局饱和度**，拒绝糖水片色调。

* **要求**：必须明确指出识别出的流派（`master_archetype`）和该流派的核心特征（`visual_signature`），并在 style_summary 中明确告诉 Phase 2 如何处理。

**2. 基础体质诊断 (Base Diagnosis)**

* **用户图直方图体质**：用户图是"高调（High-Key）"还是"低调（Low-Key）"？

  * *示例分析*："用户图是樱花场景，整体偏亮，直方图集中在右侧。这是一种脆弱的'高调美学'，任何过度的对比度增加都会导致画面变脏。"

  * *要求*：必须明确指出用户图的直方图分布特征（左偏/右偏/中间调集中），并评估其"脆弱性"（即对后期调整的敏感度）。

* **风险预判**：如果用户图是阴天平光，而参考图是RK式的强光影，需指出"光影重塑"是核心难点，而非仅仅调色。

**3. 分维度对比 (Detailed Comparison)**

* **视觉引导与主体**：*必须*检测两者题材是否一致（如风景 vs 人像）。如果不一致，必须在后续的"复刻可行性"中扣分。

* **焦点与曝光**：分析焦点逻辑和曝光策略（向右曝光/宁欠勿曝）。

* **色彩与景深 (核心)**：

    * **直方图逻辑**：你必须根据画面反推直方图数据。例如，胶片感的照片，黑色色阶通常是缺失的（直方图左端切断），暗部被提亮。

    * **色调分析**：精准分析肤色（Skin Tone）、高光倾向、阴影倾向。

* **情感**：照片传递的情绪（孤独、热烈、冷静等）。

### 模块二：色彩与影调的物理级分析

**1. 饱和度策略 (Saturation Strategy)**

* **核心判断**：参考图是"鲜艳（Vibrant）"还是"静谧/低饱和（Muted）"？

* **错误纠正**：很多"电影感"照片看似色彩浓郁，实则是**低饱和度 + 特定色偏**。不要被色偏欺骗而增加全局饱和度。

* **要求**：必须明确指出饱和度方向（如："全局去色(-20)，仅保留高光暖色"），并在 `color_depth_analysis.saturation_strategy` 字段中详细说明。

**2. 黑位逻辑 (Black Point Logic)**

* **Fade vs. Crush**：黑色是"发灰的（Matte）"还是"死黑的（Crushed）"？

* **要求**：必须明确指出影调方向（如："高对比度，压实暗部，高光保留细节"），并在 `color_depth_analysis.tonal_intent` 字段中详细说明。

**5. 关键数据输出**

* **直方图数据**：生成一组 [0-255] 的数组，用于前端绘制直方图。

* **参数对比表**：对比两张图在内容、色调、影调上的关键差异。

### 模块三：风格克隆战略指导 (Style Summary - 核心产出)

**这是 Phase 2 的"参数宪法"。** 必须包含：

* **【流派定调】**：本次调色旨在模仿[XXX]风格，核心在于[低饱和/高对比]。例如："本次调色旨在模仿RK流高反差风格，核心在于低饱和青橙色调和强光影切割。"

* **【色彩映射】**：天空蓝色需要[降低饱和度/提升明度]，阴影注入[青色/深蓝]。例如："天空蓝色需要降低饱和度至-30，阴影注入深蓝以制造赛博感。"

* **【光影重塑】**：使用[S型/J型]曲线，[压实/提亮]暗部。务必使用PS的[加深减淡/奥顿柔光]来模拟质感。例如："使用强S型曲线，压实暗部至Blacks -20。务必使用PS的加深减淡来强化光影切割。"

* **要求**：这段文字将作为 Phase 2 生成 LR/PS 参数的直接依据，必须包含具体的参数限制和调整方法。必须更具强制性，针对不同流派给出明确的指令。

### 模块二：构图分析 (Composition - 仅分析参考图)

* **主结构**：视觉框架、几何关系。

* **视线引导**：描述"入口 -> 停留 -> 出口"的视觉路径。

* **空间层次**：前/中/后景的透视关系。

* **比例**：实体 vs 留白。

### 模块三：光影参数 (Lighting & Params - 仅分析参考图)

* **色调曲线 (Tone Curve)**：这是重点。你需要输出 RGB、红、绿、蓝四个通道的坐标点数组，供前端绘制曲线。同时解释每根曲线的调整意义。

* **纹理与清晰度**：给出参数范围建议。

---

## Output Format (JSON Structure)

你必须只输出一段完整的 JSON 代码，不要包含任何 Markdown 格式以外的废话。JSON 结构如下：

```json
{{
  "module_1_critique": {{
    "style_classification": {{
      "master_archetype": "文本：识别出的风格流派（如：类RK街头摄影风、滨田英明日系空气风、保井崇志街头胶片风、Cinematic电影风等）。",
      "visual_signature": "文本：该流派的核心特征（如：'高清晰度、低饱和青冷色调、强烈的明暗切割'）。"
    }},
    "comprehensive_review": "长文本：专业点评两张图的差距。按照是什么-为什么-怎么做的逻辑，包含题材、影调、色调、器材推测(如Sony A7系列或Fujifilm胶片模拟)、参数推测(光圈快门ISO)、拍摄时间分析。",

    "visual_subject_analysis": "长文本：分析两张图主体的匹配度（如：参考图是情绪特写，用户图是全身游客照，主体占比差异大）。",

    "focus_exposure_analysis": "文本：焦点位置及曝光策略。",

    "color_depth_analysis": {{
      "text": "长文本：深入分析色彩科学。例如：'参考图暗部偏青（Teal），肤色保持通透的橙色（Orange），这是典型的青橙色调。直方图显示暗部未触底，呈现哑光质感...'",
      "saturation_strategy": "文本：明确指出饱和度方向（如：'全局去色(-20)，仅保留高光暖色'）。",
      "tonal_intent": "文本：明确指出影调方向（如：'高对比度，压实暗部，高光保留细节'）。",
      "simulated_histogram_data": {{
        "description": "文本描述直方图特征（如：中间低两头高）",
        "data_points": [10, 15, 20, ... 255个整数表示0-255的亮度分布]
      }}
    }},

    "emotion": "文本：情感与意境描述。",

    "pros_evaluation": "文本：挖掘画面中的高级感来源。",

    "parameter_comparison_table": [
      {{"dimension": "照片内容", "ref_feature": "...", "user_feature": "..."}},
      {{"dimension": "照片色调", "ref_feature": "...", "user_feature": "..."}},
      {{"dimension": "照片影调", "ref_feature": "...", "user_feature": "..."}}
    ],

    "style_summary": "长文本（Phase 2 指令书）：必须包含以下所有内容（一个也不能少）：\\n\\n1. 【流派定调】本次调色旨在模仿[XXX]风格，核心在于[低饱和/高对比]。例如：'本次调色旨在模仿RK流高反差风格，核心在于低饱和青橙色调和强光影切割。'\\n\\n2. 【色彩映射】天空蓝色需要[降低饱和度/提升明度]，阴影注入[青色/深蓝]。例如：'天空蓝色需要降低饱和度至-30，阴影注入深蓝以制造赛博感。'\\n\\n3. 【光影重塑】使用[S型/J型]曲线，[压实/提亮]暗部。务必使用PS的[加深减淡/奥顿柔光]来模拟质感。例如：'使用强S型曲线，压实暗部至Blacks -20。务必使用PS的加深减淡来强化光影切割。'",

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
      "exposure": "范围描述 (如: +0.2 ~ +0.5)",
      "contrast": "范围描述",
      "highlights": "范围描述",
      "shadows": "范围描述",
      "whites": "范围描述",
      "blacks": "范围描述"
    }},
    "tone_curves": {{
      "explanation": "文本：解释曲线调整的逻辑和技巧。",
      "points_rgb": [[0,0], [60,50], [180,190], [255,255]],
      "points_red": [[0,0], ...],
      "points_green": [[0,0], ...],
      "points_blue": [[0,0], ...]
    }},
    "texture_clarity": {{
      "texture": "范围及描述",
      "clarity": "范围及描述",
      "dehaze": "范围及描述"
    }}
  }}
}}
```

## Constraints

1. **Tone**: Professional, Insightful, Human-like. Avoid "As an AI".
2. **Language**: Chinese (Simplified).
3. **Data Accuracy**: Generate plausible numerical data (histogram/curve points) that strictly matches your textual analysis.
4. **Critique Depth**: Don't just describe what looks different, describe how the light physics and sensor characteristics caused it.
5. **Analysis Priority**: **必须先体检用户图，再分析参考图**。不要只吹捧参考图，而是要深入分析用户图的"体质"和"脆弱性"。
6. **Protection Mechanism**: 如果检测到用户图是"高调片"或"柔美题材"，而参考图是"高对比/高饱和"风格，必须启动"通透感保护机制"，在 style_summary 中明确列出"禁止项"和"通透感配方"。如果检测到参考图是"低饱和/静音"或"强力/戏剧性"风格，必须在 style_summary 中明确告诉 Phase 2："这张图的重点是'去色'，而不是'上色'"。
7. **Style Summary Completeness**: style_summary 字段必须包含：策略名称、关键警告、影调重塑指令、色彩映射指令、禁止项、风格强度配方。一个也不能少。
8. **Style Intensity Assessment**: 必须根据参考图的"色彩饱和度策略"和"影调强度评估"结果，在 style_summary 中明确告诉 Phase 2 如何处理。对于低饱和/高对比风格，必须给出明确的"去色"和"压暗部"指令，而不是温和的描述。

Let's begin the Phase 1 Analysis based on the provided images."""

        return prompt

    @staticmethod
    def get_part2_prompt(
        reference_image: str,
        user_image: Optional[str],
        part1_context: Dict[str, Any],
        style_summary: Optional[str] = None,
        feasibility_result: Optional[Dict[str, Any]] = None,
        options: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Part2 Prompt - 执行参数与工作流
        
        根据新的 Prompt 模版实现，生成精确的、可操作的参数和步骤
        
        Args:
            reference_image: 参考图（base64 或 data URL，必填）
            user_image: 用户图（base64 或 data URL，可选）
            part1_context: Part1 上下文（包含 workflow_draft 等）
            style_summary: Phase 1 的 style_summary（风格克隆战略指导，最重要的字段）
            feasibility_result: 可行性评估结果（可选）
            options: 其他选项（可选）
        
        Returns:
            完整的 Part2 Prompt 文本
        """
        # 构建 style_summary 说明（如果提供）
        style_summary_note = ""
        if style_summary:
            style_summary_note = f"""
**Phase 1 风格克隆战略指导 (style_summary)**：
{style_summary}

**重要**：这是 Phase 1 的核心产出，你必须严格按照这个战略指导生成参数。每一个参数都必须有据可依，必须源于上述 style_summary 的分析结果。严禁产生与 Phase 1 矛盾的参数。
"""
        else:
            style_summary_note = """
**注意**：未提供 Phase 1 的 style_summary，请基于参考图和用户图的对比分析生成参数。
"""

        prompt = f"""# Role: 影像科学高级数字影像技师 (Senior DIT) & 调色专家

## Profile

你是一位精通 Adobe Lightroom Classic 和 Photoshop 的顶级修图师。你极其擅长通过参数复刻大师（如 Hideaki Hamada, RK, Takashi Yasui）的视觉风格。你深知"通透"和"质感"往往来自于**克制的色彩**和**精准的光影**，而非简单的饱和度堆叠。在 Phase 1 中，你的艺术总监已经识别出了参考图的"大师流派"并制定了宏观的《风格克隆战略》（即 `style_summary` 和 `style_classification`）。现在的任务是**执行**——将这些战略转化为精确的、可操作的参数和步骤。

## 【重要】语言要求 (Language Requirement)

**你必须使用简体中文（Chinese Simplified）输出所有文本内容**，包括：
- 所有 `reason` 字段（解释字段）
- 所有 `description` 字段（描述字段）
- 所有 `text` 字段（文本字段）
- 所有自然语言说明

**禁止使用英文**。如果发现任何英文文本，将被视为格式错误。

## Task: Phase 2 - 风格参数生成

用户提供：

1. **Phase 1 分析报告**（包含 `style_classification` 和 `style_summary`）。
2. **原始图片**。

**目标**：将 Phase 1 的战略转化为精确的 LR/PS 参数。

{style_summary_note}

---

## Processing Logic (大师级调色逻辑)

**1. 减法法则 (The Law of Subtraction - 默认生效)**

* **饱和度陷阱**：除非参考图是极度鲜艳的"糖水片"，否则 LR 的 `Saturation` 和 `Vibrance` 默认倾向于 **负值 (-5 ~ -20)**。

* **高级感来源**：色彩的高级感通常来自于"低饱和度 + 特定的色相偏移"。例如：天空不是纯蓝，是"低饱和的青灰蓝"。

**2. 流派逻辑锁 (Style Logic Locks)**

* **如果 Phase 1 识别为 [滨田英明/日系空气风]**：
  * `Contrast`: 低 (-10 ~ -20)
  * `Highlights`: 大幅降低 (-50)
  * `Shadows`: 大幅提升 (+40)
  * `Dehaze`: 负值 (-10)
  * `Clarity`: 负值 (-10)

* **如果 Phase 1 识别为 [RK/赛博/街头风]**：
  * `Contrast`: 中高 (+10 ~ +20)
  * `Blacks`: 降低 (-10 ~ -30) -> 制造深邃感
  * `Clarity` / `Dehaze`: 正值 (+10 ~ +20) -> 强化纹理
  * `HSL`: 极端的青橙色调，蓝色饱和度极低。

* **如果 Phase 1 识别为 [保井崇志/胶片风]**：
  * `Curve`: S型，但在暗部起点抬高 (Fade Black)。
  * `Grain`: 必须添加颗粒。

---

**3. 继承战略**：你生成的每一个参数（如色温、曲线点）都必须有据可依，必须源于 Phase 1 的分析结果。严禁产生与 Phase 1 矛盾的参数（例如 Phase 1 说要冷调，你却加暖色温）。

**4. 软件分工**：

   * **Lightroom (80%)**：负责定调。完成白平衡、曝光、基础色相/饱和度、颜色分级。

   * **Photoshop (20%)**：负责精修。完成局部光影（Dodge & Burn）、氛围光晕（Glow）、特定颜色的更精细偏移（可选颜色）、质感锐化。

**5. 数据精度**：

   * 数值应为**范围**（如 `+10 ~ +15`），给予用户一定的容错空间。

   * 解释（Reasoning）必须从视觉原理出发，必须解释它如何贡献于"风格匹配度"（例如："提升蓝色明度是为了让天空更轻盈，而不是像深海一样沉重" 或 "降低蓝色饱和度是为了匹配参考图的低饱和电影风格，抽离杂色以获得静音感"），而不能是废话。

---

## Output Format (JSON Structure)

你必须只输出一段完整的 JSON 代码。JSON 结构必须严格对应以下字段：

### 1. 色彩方案 (Color Scheme) - 字段逻辑细化

```json
{{
  "phase_1_extraction": {{
    "master_style_recap": "文本：确认识别到的流派（如：RK流高反差风格、滨田英明日系空气风、保井崇志街头胶片风、Cinematic电影风等）。",
    "style_summary_recap": "文本：简要回顾Phase 1的核心指导思想（提取自上一阶段的style_summary）。",
    "key_adjustment_strategy": "文本：总结三大动作（如：全局降饱和、强化清晰度、高光注入青色）。"
  }},
  "color_science_scheme": {{
    "white_balance": {{
      "temperature": {{
        "value": "如：+600 ~ +900",
        "reason": "文本：追求'中性白'。如果画面发黄/发蓝，必须先归零色偏。解释为何这样调整（如：原图偏冷，需纠正至中性偏暖以匹配参考图日落氛围）。"
      }},
      "tint": {{
        "value": "如：+6 ~ +12",
        "reason": "文本：追求'中性白'。解释为何调整色调（如：增加洋红以中和皮肤的菜色，消除色偏）。"
      }}
    }},
    "color_grading_wheels": {{
      "highlights": {{
        "hue": "35°",
        "saturation": "5 ~ 15 或 0 ~ 5（根据 Phase 1 的色彩饱和度策略：低饱和风格为 0 ~ 5，鲜艳/自然风格可为 5 ~ 15）",
        "reason": "**重要**：根据 Phase 1 的色彩饱和度策略判断。在低饱和风格中，色轮的 Saturation 值通常很低（比如 5-15），只要一点点倾向就够了，不能给太多。如果是鲜艳/自然风格，可为 5 ~ 15。"
      }},
      "midtones": {{
        "hue": "210°",
        "saturation": "0 ~ 5 或 5 ~ 10（根据 Phase 1 的色彩饱和度策略：低饱和风格为 0 ~ 5，鲜艳/自然风格可为 5 ~ 10）",
        "reason": "**重要**：根据 Phase 1 的色彩饱和度策略判断。在低饱和风格中，色轮的 Saturation 值通常很低，只要一点点倾向就够了。如果是鲜艳/自然风格，可为 5 ~ 10。"
      }},
      "shadows": {{
        "hue": "220°",
        "saturation": "5 ~ 15 或 0 ~ 5（根据 Phase 1 的色彩饱和度策略：低饱和风格为 0 ~ 5，鲜艳/自然风格可为 5 ~ 15）",
        "reason": "**重要**：根据 Phase 1 的色彩饱和度策略判断。在低饱和风格中，色轮的 Saturation 值通常很低，只要一点点倾向就够了。如果是鲜艳/自然风格，可为 5 ~ 15，制造电影感互补色。"
      }},
      "balance": "如：-20 (偏向阴影)"
    }},
    "hsl_detailed_12_colors": {{
      "note": "关键策略：根据流派决定是提Luminance（空气感）还是降Saturation（电影感）。针对标准HSL及PS可选颜色的综合指导。",
      "red": {{"h": "0", "s": "0", "l": "0", "desc": "调整建议"}},
      "orange": {{"h": "0", "s": "0", "l": "0", "desc": "肤色核心调整"}},
      "yellow": {{"h": "0", "s": "0", "l": "0", "desc": "..."}},
      "yellow_green": {{"h": "0", "s": "0", "l": "0", "desc": "植被高光"}},
      "green": {{
        "h": "如：+10 ~ +20 (向暖绿/黄绿偏移，去除死板的深绿)",
        "s": "如：-10 ~ -20 (降低饱和度，避免荧光绿)",
        "l": "如：+10 (提升明度，让树叶有透光感)",
        "desc": "针对植被：色相向暖绿/黄绿偏移，降低饱和度，提升明度以获得透光感。"
      }},
      "green_cyan": {{"h": "0", "s": "0", "l": "0", "desc": "..."}},
      "cyan": {{"h": "0", "s": "0", "l": "0", "desc": "天空青色偏移"}},
      "cyan_blue": {{"h": "0", "s": "0", "l": "0", "desc": "..."}},
      "blue": {{
        "h": "如：-5 ~ -10 (向青色偏移，看起来更清爽)",
        "s": "如：-40 ~ -20 或 +5 ~ +15（根据流派：电影感请降饱和，空气感请提明度）",
        "l": "如：+10 ~ +30 或 -10 ~ +10（根据流派：电影感可根据需要微调，空气感必须为正值）",
        "desc": "天空核心：若为电影感，请降饱和；若为空气感，请提明度。"
      }},
      "blue_purple": {{"h": "0", "s": "0", "l": "0", "desc": "..."}},
      "purple": {{"h": "0", "s": "0", "l": "0", "desc": "..."}},
      "magenta": {{"h": "0", "s": "0", "l": "0", "desc": "纠正色偏"}}
    }}
  }},
  "lightroom_workflow": {{
    "simulated_histogram": {{
      "description": "文本：预判调色后的直方图形态。通透照片的直方图最左端通常不触底（Fade Look）。",
      "rgb_values": {{"r": 120, "g": 110, "b": 130}},
      "zone_values": {{"shadows": 20, "midtones": 128, "highlights": 230, "average_brightness": 110}}
    }},
    "basic_panel": {{
      "exposure": {{"val": "+0.50 ~ +0.80", "reason": "提升整体亮度..."}},
      "contrast": {{
        "val": "-20 ~ +20（根据流派调整：滨田风为 -10 ~ -20，RK风为 +10 ~ +20）",
        "reason": "根据流派调整。滨田英明日系空气风为低对比 (-10 ~ -20)，RK/赛博/街头风为中高对比 (+10 ~ +20)。"
      }},
      "highlights": {{
        "val": "-30 ~ -50",
        "reason": "保护云层和樱花细节，避免高光溢出。"
      }},
      "shadows": {{
        "val": "+20 ~ +40",
        "reason": "日系通透感的关键，提亮阴影以获得空气感。"
      }},
      "whites": {{
        "val": "+10 ~ +30",
        "reason": "拉开光比的关键，让白色更白，增加画面层次。"
      }},
      "blacks": {{
        "val": "+5 ~ +15 或 -10 ~ -30（RK风可为负，日系风必须为正）",
        "reason": "RK风可为负值 (-10 ~ -30) 制造深邃感，日系风必须为正值 (+5 ~ +15) 不让暗部死黑，制造胶片感。"
      }},
      "texture": {{
        "val": "+5 ~ +10",
        "reason": "保留质感，但不要过度。"
      }},
      "clarity": {{
        "val": "-10 ~ +20（根据流派调整：滨田风为负值 -10，RK风为正值 +10 ~ +20）",
        "reason": "根据流派调整。滨田英明日系空气风为负值 (-10)，RK/赛博/街头风为正值 (+10 ~ +20) 强化纹理。"
      }},
      "dehaze": {{
        "val": "-10 ~ +20（根据流派调整：滨田风为负值 -10，RK风为正值 +10 ~ +20）",
        "reason": "根据流派调整。滨田英明日系空气风为负值 (-10) 增加空气感，RK/赛博/街头风为正值 (+10 ~ +20) 强化纹理。"
      }},
      "saturation": {{
        "val": "-20 ~ -5",
        "reason": "默认执行'减法法则'，避免油腻。除非参考图是极度鲜艳的'糖水片'，否则默认倾向于负值 (-5 ~ -20)。"
      }},
      "vibrance": {{
        "val": "-10 ~ +10",
        "reason": "根据流派调整。低饱和风格为负值 (-10 ~ -20)，鲜艳/自然风格可为正值 (+5 ~ +15)。"
      }}
    }},
    "presence": {{
      "texture": {{
        "val": "+5 ~ +10",
        "reason": "保留质感，但不要过度。"
      }},
      "clarity": {{
        "val": "-10 ~ +20（根据流派调整：滨田风为负值 -10，RK风为正值 +10 ~ +20）",
        "reason": "根据流派调整。滨田英明日系空气风为负值 (-10)，RK/赛博/街头风为正值 (+10 ~ +20) 强化纹理。"
      }},
      "dehaze": {{
        "val": "-10 ~ +20（根据流派调整：滨田风为负值 -10，RK风为正值 +10 ~ +20）",
        "reason": "根据流派调整。滨田英明日系空气风为负值 (-10) 增加空气感，RK/赛博/街头风为正值 (+10 ~ +20) 强化纹理。"
      }}
    }},
    "color_settings": {{
      "saturation": {{"val": "-20 ~ -5", "reason": "默认执行'减法法则'，避免油腻。除非参考图是极度鲜艳的'糖水片'，否则默认倾向于负值 (-5 ~ -20)。"}},
      "vibrance": {{"val": "-10 ~ +10", "reason": "根据流派调整。低饱和风格为负值 (-10 ~ -20)，鲜艳/自然风格可为正值 (+5 ~ +15)。"}}
    }},
    "note": "**重要说明**：`texture`、`clarity`、`dehaze`、`saturation`、`vibrance` 字段可以在 `basic_panel` 中，也可以在 `presence` 和 `color_settings` 中。后端会兼容处理两种格式。建议优先使用 `basic_panel` 中的字段（新格式），同时保留 `presence` 和 `color_settings` 字段（向后兼容）。",
    "tone_curve": {{
      "rgb_points": [[0,10], [60,50], [190,200], [255,255]],
      "red_channel": [[0,0], [128,128], [255,255]],
      "green_channel": [[0,0], [128,128], [255,255]],
      "blue_channel": [[0,0], [128,120], [255,255]],
      "reason": "**重要**：根据 Phase 1 的影调强度评估判断。如果是高调/柔美风格，RGB曲线必须描述为'J型'或'缓S型'，暗部端点(0,0)需上移至 (0, 10~20) 以制造哑光黑，提亮亮部，保持暗部柔和。如果是强力/戏剧性风格，必须使用强S型曲线，压实暗部以制造沉浸感，暗部端点可以保持在 (0, 0) 或略微上移，不再优先考虑暗部细节的通透性。"
    }},
    "split_toning_detail": {{
       "highlights": {{"h": "...", "s": "...", "reason": "..."}},
       "shadows": {{"h": "...", "s": "...", "reason": "..."}},
       "balance": {{"val": "...", "reason": "..."}}
    }}
  }},
  "photoshop_workflow": {{
    "logic_check": "文本：分析LR调整后的状态，指出PS需要补充的不足（如：LR只能做全局，PS需要做局部光塑）。",
    "post_histogram_target": {{
      "description": "文本：PS精修完成后的最终直方图理想状态。",
      "zone_values": {{"shadows": 10, "midtones": 130, "highlights": 245}}
    }},
    "camera_raw_filter": {{
      "exposure_tweak": {{"val": "...", "reason": "微调"}},
      "contrast_tweak": {{"val": "...", "reason": "..."}}
    }},
    "ps_curves_adjustment": {{
      "rgb_tweak": "文本：描述微调建议（如：使用蒙版提亮面部）",
      "reason": "详细解释曲线调整的逻辑和技巧",
      "rgb_points": [[0,0], [60,50], [190,200], [255,255]],
      "red_channel": [[0,0], [128,128], [255,255]],
      "green_channel": [[0,0], [128,128], [255,255]],
      "blue_channel": [[0,0], [128,120], [255,255]]
    }},
    "selective_color": {{
      "red_cyan": {{"val": "-10 ~ -5", "reason": "减少肤色中的青色，使红润"}},
      "red_magenta": {{"val": "...", "reason": "..."}},
      "yellow_magenta": {{"val": "...", "reason": "..."}},
      "yellow_yellow": {{"val": "...", "reason": "..."}},
      "green_yellow": {{"val": "...", "reason": "..."}},
      "cyan_cyan": {{"val": "...", "reason": "..."}},
      "black_cyan": {{
        "val": "-5",
        "reason": "**针对'不通透'的修补**：黑色/中性色减少青色，修正环境色偏。"
      }},
      "black_magenta": {{
        "val": "-2",
        "reason": "**针对'不通透'的修补**：黑色/中性色减少洋红，修正环境色偏。"
      }},
      "white_black": {{
        "val": "-10",
        "reason": "**针对'不通透'的修补**：白色减少黑色，提亮高光纯净度。"
      }},
      "settings": "混合模式：正常，不透明度：100%"
    }},
    "local_dodge_burn": {{
      "target_area": "如：人物面部T区、背景建筑轮廓",
      "method": "如：双曲线磨皮法 或 50%灰图层叠加",
      "brush_settings": "流量: 1-2%, 不透明度: 100%",
      "reason": "文本：通过重塑光影结构来模仿参考图的立体感。"
    }},
    "atmosphere_glow": {{
      "method": "如：Orton Effect (奥顿柔光)",
      "steps": "盖印图层 -> 高斯模糊(20px) -> 混合模式(滤色)",
      "opacity": "10-15%",
      "reason": "模拟参考图的梦幻空气感。"
    }},
    "details_sharpening": {{
      "method": "如：高反差保留 (High Pass) 或 Lab 模式明度通道锐化（高级技巧）",
      "radius": "1.5 ~ 2.0 px",
      "mode": "叠加 (Overlay)",
      "reason": "**Lab 模式明度通道锐化（高级技巧）**：仅在明度通道锐化，不破坏色彩信息，防止噪点增加。强化边缘线条的同时保持色彩纯净。"
    }},
    "grain_texture": {{
      "type": "如：软颗粒",
      "amount": "15 ~ 20",
      "size": "20",
      "roughness": "50",
      "reason": "模拟胶片介质感。"
    }},
    "vignette": {{
      "amount": "-15",
      "midpoint": "40",
      "roundness": "0",
      "feather": "80",
      "reason": "压暗四周引导视线。"
    }},
    "final_levels": {{
      "input_black": "5",
      "input_white": "250",
      "midpoint": "1.05",
      "reason": "确保最终输出的黑白场在安全范围内。"
    }}
  }}
}}
```

## Constraints (生成限制)

1. **一致性 (Consistency)**：生成的参数必须严格遵循 "Phase 1 Style Summary" 的逻辑。严禁产生与 Phase 1 矛盾的参数。

2. **完整性 (Completeness)**：不要留空字段。如果某个调整不需要（例如：图像中没有植被，不需要调整黄绿色），输出 "0" 或 "无" 但必须用中文解释原因（例如："图像中无植被，无需调整黄绿色"）。

3. **人性化 (Human-Touch)**："Reason" 字段应该像专业摄影师解释修图过程一样，而不是机器人的语气。使用专业但易懂的中文表达。

4. **语言要求 (Language Requirement)**：**必须使用简体中文（Chinese Simplified）输出所有文本内容**。所有 `reason`、`description`、`text` 字段必须使用中文。禁止使用英文。如果输出英文，将被视为格式错误。

5. **Logic Check (逻辑自检)**：如果你发现生成的 Saturation 总和超过 +50，必须触发自我修正，降低数值。检查所有饱和度参数，确保总和不超过 +50。

6. **Reasoning (推理要求)**：每一个参数的 `reason` 字段，必须解释它如何贡献于"风格匹配度"（例如："提升蓝色明度是为了让天空更轻盈，而不是像深海一样沉重" 或 "降低蓝色饱和度是为了匹配参考图的低饱和电影风格，抽离杂色以获得静音感"）。不能只是描述参数本身，必须说明其对风格匹配度的贡献。

7. **减法法则和流派逻辑锁遵守**：必须严格遵守上述"减法法则"和"流派逻辑锁"：
      - **减法法则**：默认执行"先做减法"，`Saturation` 和 `Vibrance` 默认倾向于负值 (-5 ~ -20)，除非参考图是极度鲜艳的"糖水片"
      - **流派逻辑锁**：根据 Phase 1 识别出的流派（滨田英明/日系空气风、RK/赛博/街头风、保井崇志/胶片风、Cinematic/电影风），强制锁定特定的参数范围
      - 去雾值严禁超过 +10（日系风应为负值）
      - 对比度通过曲线实现，不通过滑块（但根据流派，滨田风为低对比，RK风为中高对比）

**再次强调**：所有文本字段（reason、description、text、explanation 等）必须使用简体中文，禁止使用英文。所有参数必须遵循通透感物理定律，避免过度饱和和反差过大。

Let's generate the Phase 2 Detailed Execution Plan based on the provided context."""

        return prompt

    @staticmethod
    def get_part3_flash_prompt(
        reference_image: str,
        user_image: str,
        color_grading_schema: Dict[str, Any],
        part1_style_analysis: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Part3 Prompt - 风格模拟（使用新的 Prompt 模板）
        根据用户提供的新 Prompt 模板实现
        
        Args:
            reference_image: 参考图（base64，用于上下文理解，但不直接处理）
            user_image: 用户原图（base64，需要处理的图片）
            color_grading_schema: 完整的色彩方案数据，包含：
                - photo_review: Part1 照片点评完整数据（包括 style_summary、dimensions、comparisonTable 等）
                - lightroom: Lightroom 完整调整方案
                - photoshop: Photoshop 完整调整方案
                - color: 色彩方案完整数据
            part1_style_analysis: Part1 的风格分析理解（可选，已包含在 color_grading_schema.photo_review 中）
            options: 可选参数
        
        Returns:
            Prompt 文本
        """
        import json
        
        # 提取照片点评数据（尤其是 style_summary 字段）
        photo_review = color_grading_schema.get("photo_review", {})
        style_summary = photo_review.get("style_summary", "")
        photo_review_json = json.dumps(photo_review, ensure_ascii=False, indent=2)
        
        # 提取 Lightroom 数据
        lightroom_data = color_grading_schema.get("lightroom", {})
        lightroom_json = json.dumps(lightroom_data, ensure_ascii=False, indent=2)
        
        # 提取 Photoshop 数据
        photoshop_data = color_grading_schema.get("photoshop", {})
        photoshop_json = json.dumps(photoshop_data, ensure_ascii=False, indent=2)
        
        # 提取色彩方案数据
        color_data = color_grading_schema.get("color", {})
        color_json = json.dumps(color_data, ensure_ascii=False, indent=2)
        
        # 构建 Prompt（使用用户提供的新模板）
        # 【重要】在 Prompt 开头用最醒目的方式标注图片顺序，确保 Gemini 不会混淆
        prompt = f"""# ⚠️⚠️⚠️ 图片识别（必须严格遵守，这是最关键的部分）⚠️⚠️⚠️

**你现在接收到了两张图片，顺序如下：**

1. **第一张图片 = 参考图 (Reference Image / Target Style Image)**
   - 这是目标风格图，用于理解目标色彩风格、影调特征和整体氛围
   - **重要：这张图片不直接处理，仅用于参考和理解目标风格**
   - **严禁对第一张图片进行任何修改或处理**

2. **第二张图片 = 用户原图 (User Image / Source Image / Image to Process)**
   - 这是需要处理的图片，**必须按照参考图的风格进行调色**
   - **重要：只处理这一张图片，将用户原图调整为参考图的风格**
   - **输出结果必须是第二张图片（用户原图）经过调色后的版本**

---

# Role (角色设定)

你是一位拥有20年经验的高级数字影像技师 (DIT) 和商业修图师。你精通 Adobe Lightroom Classic 和 Photoshop 的色彩科学。

现在的任务不是生成一张新图片，而是**严格按照给定的色彩方案数据（Schema）对用户提供的原图（第二张图片）进行"冲印"和"显影"处理**，使其风格与参考图（第一张图片）一致。

**【关键提醒】图片识别（必须严格遵守）**：
- **第一张图片 = 参考图 (Reference Image)**：目标风格图，仅用于参考，**不直接处理**
- **第二张图片 = 用户原图 (User Image / Source Image)**：需要处理的图片，**必须按照参考图的风格进行调色**

# Input Data (输入数据)

**【重要】图片顺序说明**：
- **第一张图片**：**参考图 (Reference Image)** - 这是目标风格图，用于理解目标色彩风格，**不直接处理**
- **第二张图片**：**用户原图 (User Image / Source Image)** - 这是需要处理的图片，**必须按照参考图的风格进行调色**

1.  **参考图 (Reference Image)**: [已提供，作为**第一张图片**]
    - **作用**：这是目标风格图，用于理解目标色彩风格、影调特征和整体氛围
    - **注意**：参考图**不直接处理**，仅用于理解目标风格，指导如何调整用户原图

2.  **用户原图 (User Image / Source Image)**: [已提供，作为**第二张图片**]
    - **作用**：这是需要处理的图片，**必须按照参考图的风格进行调色**
    - **注意**：**只处理这一张图片**，将用户原图调整为参考图的风格

3.  **照片点评 (Photo Review)** - 包含风格克隆战略指导（style_summary）和完整的照片分析：

    ```json
    {photo_review_json}
    ```
    
    **【重要】style_summary 字段说明**：
    {style_summary if style_summary else "（未提供）"}
    
    这是 Phase 1 的核心产出，包含：
    - 内容策略：如何处理题材差异
    - 影调重塑：具体的明暗调整方向
    - 色彩映射：具体的调色方向

4.  **色彩方案 (Color Grading Schema)**:

    ```json
    {color_json}
    ```

5.  **Lightroom 调整方案 (Lightroom Adjustment Schema)**:

    ```json
    {lightroom_json}
    ```

6.  **Photoshop 调整方案 (Photoshop Adjustment Schema)**:

    ```json
    {photoshop_json}
    ```

# Processing Instructions (处理指令)

**【重要】处理对象明确（必须严格遵守）**：
- **只处理第二张图片（用户原图 / User Image / Source Image）**
- **参考第一张图片（参考图 / Reference Image）的风格**进行调色
- **严禁**修改画面内容、构图、人物面部特征或添加任何新物体。你的工作仅限于光影和色彩的映射。
- **严禁**对第一张图片（参考图）进行任何处理或修改

请按以下步骤**对第二张图片（用户原图）**进行调整，参考**第一张图片（参考图）**的风格：

## Step 1: 基础影调重塑 (Global Tone Mapping) - 对第二张图片（用户原图）进行调整

**【重要】处理对象：第二张图片（用户原图）**

* **曝光与对比**: 对第二张图片（用户原图）读取 Schema 中的 `Exposure` 和 `Contrast` 数值。如果数值为正，提亮第二张图片的画面；如果为负，压暗第二张图片的画面。

* **白平衡**: 对第二张图片（用户原图）根据 `Temperature` (色温) 和 `Tint` (色调) 调整画面的冷暖倾向。

* **光比控制**: 对第二张图片（用户原图）严格执行 Schema 中的 `Highlights` (高光) 和 `Shadows` (阴影) 参数。例如，如果 Schema 要求降低高光，请务必在第二张图片中找回亮部细节；如果要求提升阴影，请增加第二张图片的暗部亮度。

## Step 2: 色彩分级 (Color Grading Strategy) - 对第二张图片（用户原图）进行调整

**【重要】处理对象：第二张图片（用户原图）**

* **HSL 偏移**: 对第二张图片（用户原图）读取 Schema 中的 HSL 数据并应用。

    * **Hue (色相)**: 对第二张图片（用户原图）将指定颜色的色相向目标值偏移（例如：将天空的蓝色向青色偏移，将皮肤的橙色向黄色偏移）。

    * **Saturation (饱和度)**: 对第二张图片（用户原图）增强或降低特定颜色的鲜艳度。

    * **Luminance (明度)**: 对第二张图片（用户原图）改变特定颜色的亮度（例如：压暗天空的蓝色以增加深邃感）。

* **分离色调 (Split Toning)**: 对第二张图片（用户原图）按照 Schema，在高光中注入 [高光色值]，在阴影中注入 [阴影色值]。

## Step 3: 质感与氛围 (Texture & Atmosphere) - 对第二张图片（用户原图）进行调整

**【重要】处理对象：第二张图片（用户原图）**

* **曲线**: 对第二张图片（用户原图）模拟 Schema 中描述的曲线形态（如"S型曲线"增加通透感，或"哑光曲线"提升黑位）。

* **特效**: 对第二张图片（用户原图）如果 Schema 中包含 `Grain` (颗粒) 或 `Vignette` (暗角)，请按比例添加。

# Negative Constraints (负向约束 - 绝对禁止)

* 禁止改变原有构图。

* 禁止改变人物的面部特征、表情或肢体动作。

* 禁止添加原图中不存在的物体（如云彩、飞鸟等）。

* 禁止过度 HDR 导致画面脏乱。

# Output Goal (输出目标)

生成一张**照片级真实 (Photorealistic)** 的图像。

**【重要】输出要求明确（再次强调图片顺序）**：
- **输入**：第一张图片（参考图）用于理解风格，第二张图片（用户原图）需要处理
- **输出**：必须是**第二张图片（用户原图）经过调色后的结果**
- 这张图看起来应该就是用户原图，但经过了电影级的后期调色处理
- **完美复刻参考图（第一张图片）的色彩风格**
- 保持用户原图的构图、内容、人物特征不变，只改变光影和色彩

**【最后确认】图片处理对象**：
- ✅ 处理：第二张图片（用户原图）
- ❌ 不处理：第一张图片（参考图）

**输出要求**：
- 输出分辨率：4K（3840x2160 或更高）
- 保持原始图片的宽高比
- 输出格式：JPEG，质量：高质量
- 只输出图片，不返回 JSON 或其他文本"""

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

    @staticmethod
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

