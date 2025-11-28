"""
Prompt 模板服务 - 最终修正版 (Spatial Analysis Unification)

修复核心：解决 Gemini 因"模态切换疲劳"导致跳过 visual_mass 的问题。

策略：将 visual_mass 移入 spatial_analysis 区域，强制 AI 在"数学模式"下一次性完成所有坐标计算。
"""
from typing import Optional, Dict, Any, List
import json

# ==========================================
# 0. JSON 响应清洗工具函数
# ==========================================

def clean_json_response(response_text: str) -> str:
    """
    清洗 Gemini 返回的字符串，去除 Markdown 代码块标记，确保能被 json.loads 解析
    
    Args:
        response_text: Gemini 返回的原始响应文本
        
    Returns:
        清洗后的 JSON 字符串
        
    Examples:
        >>> clean_json_response("```json\\n{\"key\": \"value\"}\\n```")
        '{"key": "value"}'
        >>> clean_json_response("```\\n{\"key\": \"value\"}\\n```")
        '{"key": "value"}'
        >>> clean_json_response("{\"key\": \"value\"}")
        '{"key": "value"}'
    """
    cleaned = response_text.strip()
    
    # 1. 去除 ```json 开头
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    
    # 2. 去除 ``` 结尾
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    
    # 3. 去除可能的非 JSON 前缀文本 (有时候 AI 会说 "Here is the JSON:")
    # 简单策略：找到第一个 '{' 和最后一个 '}'
    start_idx = cleaned.find('{')
    end_idx = cleaned.rfind('}')
    
    if start_idx != -1 and end_idx != -1 and start_idx < end_idx:
        cleaned = cleaned[start_idx : end_idx + 1]
    
    return cleaned.strip()

# ==========================================
# 1. 定义静态 JSON 模板 (标准字符串)
# ==========================================

PART1_TEMPLATE = """
{
  "image_verification": {
    "ref_image_content": "STRING: Describe Image 1 content to prove you see it.",
    "user_image_content": "STRING: Describe Image 2 content to prove you see it."
  },
  "module_1_critique": {
    "spatial_analysis": {
      "note": "MANDATORY: All coordinate calculations must be done here first. ALL coordinates (x, y, w, h) MUST be percentages (0-100), NOT pixel values.",
      "ref_visual_mass_polygon": {
        "type": "polygon",
        "confidence": 0.9,
        "description": "STRING: Analyze the Reference Image's Visual Center of Gravity (Saliency Map).",
        "score": 0,
        "composition_rule": "STRING: The rule used, e.g., 'Rule of Thirds', 'Golden Spiral', 'Central' (构图法则)",
        "center_point": {"x": 0, "y": 0},
        "polygon_points": [],
        "vertices": [],
        "center_of_gravity": [0, 0]
      },
      "ref_overlays": {
        "ref_visual_subject_box": { "x": 0, "y": 0, "w": 0, "h": 0, "label": "STRING: 1-2 words (e.g. Red Umbrella)" },
        "ref_focus_exposure_box": { "x": 0, "y": 0, "w": 0, "h": 0, "label": "STRING: 1-2 words (e.g. Bright Sky)" },
        "ref_color_depth_box": { "x": 0, "y": 0, "w": 0, "h": 0, "label": "STRING: 1-2 words (e.g. Teal Shadow)" }
      },
      "user_overlays": {
        "user_visual_subject_box": { "x": 0, "y": 0, "w": 0, "h": 0, "label": "STRING: 1-2 words" },
        "user_focus_exposure_box": { "x": 0, "y": 0, "w": 0, "h": 0, "label": "STRING: 1-2 words" },
        "user_color_depth_box": { "x": 0, "y": 0, "w": 0, "h": 0, "label": "STRING: 1-2 words" }
      },
      "coordinate_format_note": "CRITICAL: All x, y, w, h values MUST be percentages (0-100), NOT pixel values. Example: x=50.5 means 50.5% from left edge."
    },
    "style_classification": {
      "master_archetype": "STRING: Identify specific lineage (e.g. 'Cyberpunk / Liam Wong', 'Airy / Hamada')", 
      "visual_signature": "STRING: Analyze Micro-contrast, Tonal Separation, and Color Harmony."
    },
    "comprehensive_review": "STRING: Deep dive comparison. Diagnose the User Image's histogram health vs the Reference's lighting.",
    "visual_subject_analysis": "STRING: Compare Subject Saliency and Depth of Field separation.",
    "focus_exposure_analysis": "STRING: Analyze Exposure Strategy (ETTR vs ETTL).",
    "color_depth_analysis": {
      "text": "STRING: Deep Color Science. Analyze HSL shifts.",
      "saturation_strategy": "STRING: Specific instruction (e.g. 'Global Desaturate -20').",
      "tonal_intent": "STRING: Curve strategy (e.g. 'Lift Blacks for Matte look').",
      "simulated_histogram_data": {
        "description": "STRING: Reference histogram shape.",
        "data_points": []
      }
    },
    "emotion": "STRING: Abstract mood description.",
    "pros_evaluation": "STRING: What makes the Reference look 'Premium'?",
    "parameter_comparison_table": [
      { "dimension": "Lighting", "ref_feature": "STRING", "user_feature": "STRING" },
      { "dimension": "Color", "ref_feature": "STRING", "user_feature": "STRING" },
      { "dimension": "Mood", "ref_feature": "STRING", "user_feature": "STRING" }
    ],
    "style_summary": "STRING: PHASE 2 CONSTITUTION. Must include: [Strategy Name], [Color Mapping], [Light Shaping], [Forbidden Actions].",
    "feasibility_assessment": {
      "score": 0,
      "level": "Easy/Medium/Hard",
      "limitations": "STRING: List physical conflicts.",
      "recommendation": "STRING: Actionable advice.",
      "confidence": "High"
    }
  },
  "module_2_composition": {
    "reference_analysis": {
      "classification": "STRING: e.g., Environmental Portrait, Minimalist Architecture",
      "geometric_structure": "STRING: e.g., Center Composition, Golden Spiral, Triangle",
      "visual_quality_assessment": "STRING: Top-tier critique of WHY this composition is good. (Description only)",
      "composition_quality": "STRING: Stand in the shoes of a top-tier photographer. Evaluate the overall composition quality from a professional perspective. Provide a detailed description of why this composition works well, focusing on advanced compositional techniques, visual harmony, and artistic excellence. (Description only, no scores)",
      "visual_weight": {
        "score": 0,
        "method": "STRING: e.g., Rule of Thirds, Golden Ratio",
        "description": "STRING: Subject prominence analysis.",
        "layers_visual_map": [
          {
            "label": "STRING: e.g., Main Subject, Secondary Element",
            "score": 0,
            "box": { "x": 0, "y": 0, "w": 0, "h": 0 }
          }
        ]
      },
      "visual_flow": {
        "description": "STRING: Deep explanation of the eye movement",
        "vanishing_point": {
          "x": 0,
          "y": 0
        },
        "vectors": [
          {
            "start": { "x": 0, "y": 0 },
            "end": { "x": 0, "y": 0 },
            "type": "leading",
            "strength": 0
          }
        ]
      },
      "spatial_depth": {
        "foreground": {
          "content": "STRING",
          "depth_range": [0, 0],
          "polygon": [
            { "x": 0, "y": 0 }
          ]
        },
        "midground": {
          "content": "STRING",
          "depth_range": [0, 0],
          "polygon": [
            { "x": 0, "y": 0 }
          ]
        },
        "background": {
          "content": "STRING",
          "depth_range": [0, 0],
          "polygon": [
            { "x": 0, "y": 0 }
          ]
        },
        "description": "STRING: Overall spatial depth analysis"
      },
      "negative_space": {
        "percentage": 0,
        "horizontal_balance": "STRING",
        "vertical_balance": "STRING"
      },
      "ratios_negative_space": {
        "entity_ratio": "STRING: e.g., 70%",
        "space_ratio": "STRING: e.g., 30%",
        "distribution": "STRING: Detailed description of negative space distribution"
      }
    },
    "composition_clinic": {
      "diagnosis_summary": "STRING: 一句话诊断用户图的核心问题 (e.g., '主体过小且偏离黄金点，且背景杂乱')",
      "suggested_crop": {
        "x": 0,
        "y": 0,
        "w": 0,
        "h": 0,
        "reason": "STRING: Why this crop? e.g., 'Remove distraction on left, center subject on rule of thirds'"
      },
      "action_guides": [
        {
          "x": 0,
          "y": 0,
          "icon": "move_camera",
          "instruction": "STRING: Short text shown on image, e.g., 'Step left' (2-4 words)",
          "vector_angle": 0
        }
      ],
      "grading_masks": [
        {
          "area_polygon": [
            {"x": 0, "y": 0}
          ],
          "action": "burn",
          "advice": "STRING: e.g., 'Darken sky to match reference mood'"
        }
      ]
    }
  },
  "module_3_lighting_params": {
    "exposure_control": {
      "exposure": "STRING: Calculate EV gap. Format: 'Action(Value)|Reason'. Ref brighter? '+'. Ref darker? '-'. Example: '压暗 (-1.5) | 匹配低调氛围'",
      "contrast": "STRING: Calculate Contrast gap. Format: 'Action(Value)|Reason'. Ref punchier? '+'. Ref flatter? '-'. Example: '降低对比度 (-20) | 模仿柔光效果'",
      "highlights": "STRING: Highlight recovery gap. Format: 'Action(Value)|Reason'. User blown out? '-'. Ref crisp? '+'. Example: '保护高光 (-30) | 保护高光细节'",
      "shadows": "STRING: Shadow tone gap. Format: 'Action(Value)|Reason'. Ref matte? '+' (Lift). Ref deep? '-' (Crush). Example: '提亮暗部 (+60) | 大幅提亮暗部'",
      "whites": "STRING: White point clipping gap. Format: 'Action(Value)|Reason'. Example: '柔化 (-10) | 柔化白色'",
      "blacks": "STRING: Black point anchoring gap. Format: 'Action(Value)|Reason'. Example: '制造灰度感 (+30) | 制造灰度感'"
    },
    "tone_curves": {
      "explanation": "STRING: Explain the curve needed to bridge the gap. e.g., '哑光胶片曲线：左下角黑点大幅上提（Fade Black），中间调平缓提升，高光轻微压暗。'",
      "points_rgb": [],
      "points_red": [],
      "points_green": [],
      "points_blue": []
    },
    "texture_clarity": {
      "texture": "STRING: Skin/Surface gap. Format: 'Action(Value)|Reason'. Example: '柔化纹理 (-15) | 柔化纹理'",
      "clarity": "STRING: Midtone structure gap. Format: 'Action(Value)|Reason'. Example: '增加朦胧感 (-25) | 增加朦胧感'",
      "dehaze": "STRING: Atmospheric gap. Format: 'Action(Value)|Reason'. Example: '模拟空气感 (-15) | 模拟空气感'"
    },
    "action_priorities": {
      "note": "STRING: Identify the top 3 most critical adjustments needed. Example: '根据用户图与参考图的差距，以下三个调整最为关键'",
      "primary_action": {
        "tool": "STRING: e.g., '整体曝光', '白平衡', '色调曲线'",
        "value": "STRING: e.g., '-1.5 EV', '+1500K', 'S-Curve'",
        "instruction": "STRING: Short guide, e.g., '由于你的照片过亮，需要大幅压暗以接近参考图的深夜氛围'"
      },
      "secondary_action": {
        "tool": "STRING",
        "value": "STRING",
        "instruction": "STRING"
      },
      "tertiary_action": {
        "tool": "STRING",
        "value": "STRING",
        "instruction": "STRING"
      }
    }
  }
}
"""

PART2_TEMPLATE = """
{
  "phase_1_extraction": {
    "master_style_recap": "文本：确认识别到的流派",
    "style_summary_recap": "文本：简要回顾Phase 1的核心指导思想",
    "key_adjustment_strategy": "文本：总结三大动作"
  },
  "color_science_scheme": {
    "white_balance": {
      "temperature": { "value": "+600", "reason": "中文解释" },
      "tint": { "value": "+10", "reason": "中文解释" }
    },
    "color_grading_wheels": {
      "highlights": { "hue": "35", "saturation": "10", "reason": "中文解释" },
      "midtones": { "hue": "210", "saturation": "5", "reason": "中文解释" },
      "shadows": { "hue": "220", "saturation": "15", "reason": "中文解释" },
      "balance": "-20"
    },
    "hsl_detailed_12_colors": {
      "note": "中文解释关键策略",
      "red": { "h": "0", "s": "0", "l": "0", "desc": "中文建议" },
      "orange": { "h": "0", "s": "0", "l": "0", "desc": "肤色核心调整" },
      "yellow": { "h": "0", "s": "0", "l": "0", "desc": "..." },
      "green": { "h": "+10", "s": "-20", "l": "+10", "desc": "植被调整" },
      "cyan": { "h": "0", "s": "0", "l": "0", "desc": "天空调整" },
      "blue": { "h": "-10", "s": "-30", "l": "+10", "desc": "天空核心" },
      "purple": { "h": "0", "s": "0", "l": "0", "desc": "..." },
      "magenta": { "h": "0", "s": "0", "l": "0", "desc": "..." }
    }
  },
  "lightroom_workflow": {
    "simulated_histogram": {
      "description": "中文描述直方图形态",
      "rgb_values": { "r": 120, "g": 120, "b": 120 }
    },
    "basic_panel": {
      "exposure": { "val": "+0.5", "reason": "中文解释" },
      "contrast": { "val": "-10", "reason": "中文解释" },
      "highlights": { "val": "-40", "reason": "中文解释" },
      "shadows": { "val": "+30", "reason": "中文解释" },
      "whites": { "val": "+10", "reason": "中文解释" },
      "blacks": { "val": "+10", "reason": "中文解释" },
      "texture": { "val": "+5", "reason": "中文解释" },
      "clarity": { "val": "-10", "reason": "中文解释" },
      "dehaze": { "val": "-5", "reason": "中文解释" },
      "saturation": { "val": "-20", "reason": "中文解释" },
      "vibrance": { "val": "-10", "reason": "中文解释" }
    },
    "tone_curve": {
      "rgb_points": [[0,0], [255,255]],
      "red_channel": [[0,0], [255,255]],
      "green_channel": [[0,0], [255,255]],
      "blue_channel": [[0,0], [255,255]],
      "reason": "中文解释曲线逻辑"
    }
  },
  "photoshop_workflow": {
    "logic_check": "中文分析",
    "post_histogram_target": { "description": "中文描述" },
    "ps_curves_adjustment": {
      "rgb_tweak": "中文建议",
      "reason": "中文解释",
      "rgb_points": [[0,0], [255,255]]
    },
    "selective_color": {
      "red_cyan": { "val": "-10", "reason": "中文解释" },
      "white_black": { "val": "-10", "reason": "中文解释" },
      "black_cyan": { "val": "-5", "reason": "中文解释" }
    },
    "atmosphere_glow": {
      "method": "Orton Effect",
      "opacity": "10%",
      "reason": "中文解释"
    },
    "grain_texture": {
      "type": "Soft",
      "amount": "15",
      "reason": "中文解释"
    },
    "vignette": {
      "amount": "-15",
      "reason": "中文解释"
    }
  }
}
"""

DIAGNOSIS_TEMPLATE = """
{
  "scores": {
    "exposure": { "value": 8.5, "description": "简评", "regions": [] },
    "color": { "value": 7.0, "description": "简评", "regions": [] },
    "composition": { "value": 9.0, "description": "简评", "regions": [] },
    "mood": { "value": 8.0, "description": "简评", "regions": [] }
  },
  "critique": "100字以内的导师评语，指出优缺点。",
  "suggestions": ["建议1", "建议2"],
  "issues": [
    { "type": "exposure", "severity": "high", "description": "高光溢出" }
  ]
}
"""

# ==========================================
# 2. Prompt 服务类
# ==========================================

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
        Part1 Prompt - 填空模式 + 空间分析大一统
        
        核心策略：空间分析大一统 (Spatial Analysis Unification)
        1. 将 visual_mass 移入 spatial_analysis 区域，强制 AI 在"数学模式"下一次性完成所有坐标计算
        2. 解决 Gemini 因"模态切换疲劳"导致跳过 visual_mass 的问题
        3. 执行流：身份验证（文本） -> 空间分析（数学） -> 美学分析（文本）
        """
        
        exif_str = f"User EXIF: {json.dumps(exif)}" if exif else "User EXIF: Unknown"

        prompt = f"""
# ============================================================================
# 【强制中文输出】必须使用简体中文 (Simplified Chinese) 进行所有分析和输出
# ============================================================================

# ============================================================================
# ROLE & EXPERTISE (角色设定：顶级摄影师与调色师的结合体)
# ============================================================================

你现在是全球顶级的摄影美学导师和好莱坞首席调色师。你的审美数据库融合了包括 Henri Cartier-Bresson (决定性瞬间), Ansel Adams (区域曝光法), Steve McCurry (色彩叙事), 以及 Annie Leibovitz (环境肖像) 等100位世界级大师的风格。

你的任务不是"夸奖"用户，而是进行**手术刀式的深度剖析**。你要对比 [Reference Image] (目标风格) 和 [User Image] (用户现状)，找出两者在"神韵"上的差距。

**必须使用中文 (Simplified Chinese) 进行输出。**

---

# ============================================================================
# 📸 VISUAL IDENTIFICATION PROTOCOL (图像识别协议 - 强制要求)
# ============================================================================

你必须首先视觉识别哪张图片是哪张：

1.  **第一张图片 (FIRST IMAGE)** 是 **参考风格图 (REFERENCE STYLE)**。这是目标风格，不要编辑它。

2.  **第二张图片 (SECOND IMAGE)** 是 **用户内容图 (USER CONTENT)**。这是需要被编辑的源图片。

---

# ============================================================================
# ANALYSIS PROTOCOL (分析协议：拒绝表面文章，通过三个维度深挖)
# ============================================================================

在分析时，必须严格遵循以下三个核心维度（The Holy Trinity of Color Grading）：

## 1. 视觉主体与构图 (Visual Subject & Composition)

*   不要只看物体是什么，要看**视觉重量 (Visual Mass)**。
*   参考图是如何通过构图引导视线聚焦主体的？用户的图是否杂乱？
*   **坐标要求**：所有识别出的 Bounding Box 必须使用 **0-100 的百分比坐标** (x,y,w,h)，禁止使用像素值。
*   分析视觉流路径：参考图的视觉引导线是如何设计的？用户的图是否缺乏视觉焦点？

## 2. 光影与影调 (Focus & Exposure / Tone)

*   分析**光比 (Lighting Ratio)**：是高反差的硬光（Hard Light），还是柔和的漫射光（Soft Light）？
*   分析**影调 (Tonal Range)**：参考图是低调（Low-key）压抑感，还是高调（High-key）明快感？
*   **痛点分析**：用户的照片是过曝了？还是暗部死黑？还是中间调太平（Flat）？
*   分析曝光策略：参考图是 ETTR (Expose To The Right) 还是 ETTL (Expose To The Left)？

## 3. 色彩与氛围 (Color Depth & Mood) - **这是仿色的核心**

*   不要只说"蓝色"，要说具体的色彩倾向（如：青蓝 Teal, 暖橙 Orange, 莫兰迪灰 Desaturated）。
*   分析**色彩分离 (Color Separation)**：高光偏什么色？阴影偏什么色？（Split Toning）。
*   分析**饱和度策略**：参考图是整体低饱和但突出某个色块，还是全画幅高饱和？
*   分析**色相偏移 (Hue Shift)**：参考图的 HSL 曲线是如何调整的？
*   **数码味 vs 胶片感**：参考图是否有胶片感的颗粒质感？用户的图是否数码味太重、太锐利？

---

## Phase 3: 光影参数分析 - 差距计算协议 (Lighting Parameters - Gap Analysis Protocol)

**🚨 核心原则：你不是在猜测参考图的原始参数，而是在计算将用户图转换为参考图所需的调整差值 (ADJUSTMENT DELTA)**

### 🔧 GAP ANALYSIS PROTOCOL (FOR MODULE 3)

**CRITICAL INSTRUCTION:**

You are NOT guessing the original parameters of the Reference Image.

You are calculating the **ADJUSTMENT DELTA** required to transform the [User Image] into the [Reference Image].

**Logic:**

1.  **Analyze User Image State:** e.g., "Too Bright (High-Key), Low Saturation".

2.  **Analyze Reference Target:** e.g., "Dark (Low-Key), High Saturation".

3.  **Calculate the Move:**

    *   Exposure: User is Bright -> Target is Dark = **Output Negative Value (e.g., "-1.5 EV")**.

    *   Temp: User is Cool -> Target is Warm = **Output Positive Value (e.g., "+1500K")**.

**Format Constraint:**

All numerical fields in `module_3_lighting_params` MUST follow this format:

`"Action Direction (Value) | Motivation"`

*   Example: `"压暗 (-1.5) | 匹配低调氛围"`

*   Example: `"增暖 (+1500K) | 模拟日落色调"`

*   Example: `"提亮暗部 (+60) | 大幅提亮暗部以恢复细节"`

**Action Priorities (行动优先级):**

在 `action_priorities` 字段中，识别出最关键的 3 个调整动作，按重要性排序：

*   `primary_action`: 最重要的调整（例如：整体曝光、白平衡）
*   `secondary_action`: 次要调整（例如：对比度、高光恢复）
*   `tertiary_action`: 第三重要调整（例如：纹理、清晰度）

每个 action 包含：
*   `tool`: 工具名称（例如："整体曝光"、"白平衡"、"色调曲线"）
*   `value`: 调整数值（例如："-1.5 EV"、"+1500K"）
*   `instruction`: 简短指导语（例如："由于你的照片过亮，需要大幅压暗以接近参考图的深夜氛围"）

---

# ============================================================================
# CRITICAL TONE (暴论与毒舌模式：拒绝废话，一针见血)
# ============================================================================

*   **拒绝废话**：不要说"这张照片很有趣"。直接说"构图松散，主体缺乏视觉张力"。
*   **一针见血**：指出模仿失败的根本原因（例如："参考图是胶片感的颗粒质感，而你的图数码味太重，太锐利"）。
*   **专业术语**：适当使用专业词汇（如：动态范围、黑柔滤镜感、色相偏移、对比度曲线、HSL分区调整、区域曝光法、高光阴影分离）。
*   **具体数值**：不要只说"对比度不够"，要说"参考图的对比度曲线在中间调提升了 15%，而你的图是平的"。
*   **拒绝"不错、很好"**：只谈差距和具体调整数值，不要用空洞的赞美。

---

# ============================================================================
# 🧠 EXECUTION FLOW (执行流程：强制顺序)
# ============================================================================

## Phase 1: 空间分析与坐标计算 (Spatial Analysis - Math Mode)

*   首先，完成所有坐标计算。
*   **识别参考图的 `visual_mass` (视觉重心/中心) - 这是关键步骤！**
*      - **识别锚点 (Anchor)**：眼睛首先落在哪里？这就是视觉重心。
*      - **绘制多边形 (Draw Polygon)**：生成 `polygon_points`（3-5 个点），大致勾勒出主体轮廓。不是矩形，而是形状。
*      - **计算分数 (Calculate Score)**：`score` (0-100)。它有多占主导地位？（例如：90 = 占据画面，30 = 淹没在背景中）。
*      - **命名法则 (Name Rule)**：`composition_rule`（例如："Golden Ratio"、"Leading Lines"、"Dead Center"、"Rule of Thirds"）。
*      - **坐标**：必须是 0-100 百分比。
*   *识别 `ref_overlays` 和 `user_overlays`，使用简短标签（1-2 个词）。*
*   **🚨 关键要求**：所有坐标 (x, y, w, h) 必须是百分比 (0-100)，禁止使用像素值。例如：如果物体距离左边缘 50%，使用 x=50.0，而不是 x=960 (像素)。
*   *在文本分析之前完成此步骤，确保准确性。*

## Phase 1.5: 几何向量分析 (Vector Analysis - X-Ray Vision Mode)

*   **任务**：执行"X-Ray Geometry Scan"（几何透视眼扫描）。忽略纹理，寻找线条。
*   **消失点 (Vanishing Point)**：识别透视线条汇聚的坐标 (x, y)。如果照片有明显的透视（如街道、隧道、建筑），必须识别消失点。坐标必须是 0-100 百分比。
*   **向量 (Vectors)**：提取 3-8 条关键线条：
    - `leading`：引导视线到主体的线条（例如：道路、栅栏、引导线）。
    - `perspective`：定义建筑边缘或深度的透视线条。
    - `horizon`：地平线（如果存在）。
    - `distraction`：干扰构图的线条（例如：横穿画面的树枝、电线）。
*   **约束**：`start` 和 `end` 点必须是 0-100 百分比。
*   **方向**：`start` 是视线起始点，`end` 是视线移动方向。
*   **强度 (Strength)**：0-100，表示线条的视觉强度（例如：90 = 非常明显，30 = 微弱）。

## Phase 2: 构图分析 - 双宇宙模式 (Composition Analysis - Dual Universe Mode)

**🚨 核心原则：物理隔离，防止混淆**

你必须将 Module 2 分为两个严格隔离的平行宇宙：

### **PART A: THE MASTERPIECE ANALYSIS (Target: [Reference Image] ONLY)**

**在这个部分，完全忽略用户图。你的目标是解构参考图作为教学范例。**

1.  **分类与结构 (Classification & Structure)**：
    - `classification`：识别参考图的构图类型（例如："Environmental Portrait", "Minimalist Architecture"）。
    - `geometric_structure`：识别几何结构（例如："Rule of Thirds", "S-Curve", "Triangle", "Center Composition"）。

2.  **视觉质量评价 (Visual Quality Assessment)**：
    - `visual_quality_assessment`：顶级摄影师视角的深度评价，解释**为什么这个构图是好的**。
    - 使用专业术语，分析构图的高级之处。
    - `composition_quality`：站在顶级摄影师的角度，深入浅出地评价当前构图的质量。提供详细的描述，说明为什么这个构图在专业层面是优秀的，重点关注高级构图技巧、视觉和谐和艺术卓越性。（仅描述，不包含分数）

3.  **视觉权重 (Visual Weight)**：
    - `visual_weight.score`：整体视觉权重分数（0-100）。
    - `visual_weight.method`：使用的构图法则（例如："Rule of Thirds", "Golden Ratio"）。
    - `visual_weight.description`：主体突出度分析。
    - **🚨 关键：`layers_visual_map`**：在参考图上**画出框**（`box`），标记主要主体和次要元素。
    - 每个图层包含：`label`（标签）、`score`（权重分数）、`box`（坐标框，x,y,w,h 为 0-100%）。

4.  **视觉流 (Visual Flow)**：
    - `visual_flow.description`：基于顶级摄影师视角，深入浅出地描述视觉路径。解释视线如何在画面中移动，从入口点到焦点再到出口点，分析引导线的设计意图和视觉流动的艺术性。使用通俗易懂的语言，让非专业用户也能理解构图的高级之处。
    - `visual_flow.vanishing_point`：消失点坐标（x, y 为 0-100%）。
    - `visual_flow.vectors`：在参考图上**画出向量线**，显示视线如何移动。
    - 向量类型：`leading`（引导线）、`perspective`（透视线）、`horizon`（地平线）、`distraction`（干扰线）。

5.  **空间深度 (Spatial Depth)**：
    - `spatial_depth.foreground/midground/background`：
      - `content`：内容描述。
      - `depth_range`：深度范围 [0-100]。
      - **🚨 关键：`polygon`**：在参考图上**画出多边形**，标记前中后景区域。
      - 每个多边形包含多个点 `{{x, y}}`（0-100%）。

6.  **留白平衡 (Negative Space)**：
    - `negative_space.percentage`：留白比例。
    - `negative_space.horizontal_balance`：水平平衡（例如："Left Heavy", "Balanced"）。
    - `negative_space.vertical_balance`：垂直平衡（例如："Top Heavy", "Bottom Heavy"）。
    - `ratios_negative_space`：留白比例详情
      - `entity_ratio`：实体比例（例如："70%"）。
      - `space_ratio`：留白比例（例如："30%"）。
      - `distribution`：留白分布描述（例如："前景遮挡过多，导致呼吸感不足。"）。

**⚠️ 重要：所有坐标（box, polygon, vectors）必须基于参考图（Reference Image），不是用户图！**

### **PART B: THE SURGICAL CLINIC (Target: [User Image] ONLY)**

**现在，切换到用户图。对比参考图，输出 `composition_clinic` 对象来修复用户图。**

*   **核心逻辑翻转**：参考图是教科书，用户图是作业，请修改作业！
*   **你现在是 AI 摄影导师，分析用户图，让它看起来像参考图。**
*   **所有坐标 (x,y,w,h) 必须基于用户图 (User Image)，不是参考图！**

*   **诊断总结 (Diagnosis Summary)**：
    - 一句话诊断用户图的核心问题（例如："主体过小且偏离黄金点，背景杂乱"）。
    - 对比参考图的构图优势，指出用户图的缺陷。

*   **智能构图 (Suggested Crop)**：
    - 观察参考图的构图（例如：中心对称、三分法则）。
    - 在用户图中找到最佳裁剪区域，模仿参考图的构图。
    - 如果参考图是竖构图而用户图是横构图，建议在主体上做竖裁。
    - `suggested_crop` 坐标 (x,y,w,h) 必须是 0-100%，基于用户图。
    - `reason` 字段：简短说明为什么这样裁剪（例如："去除左侧干扰，将主体置于三分点"）。

*   **现场指导 (Action Guides - AR Markers)**：
    - 在用户图上放置 AR 标记，提供物理拍摄指导。
    - 如果主体太远，放置标记说"靠近主体"。
    - 如果有垃圾桶破坏画面，在垃圾桶上放置 "remove_object" 标记。
    - 文字保持简短（2-4 个词）。
    - `action_guides` 数组中的每个标记：
      - `x, y`：标记位置（0-100%，基于用户图）。
      - `icon`：图标类型（"move_camera", "remove_object", "add_light", "focus_here"）。
      - `instruction`：显示在图片上的简短文字（例如："向右移动两步"）。
      - `vector_angle`：箭头方向（0-360 度）。

*   **后期蒙版 (Grading Masks)**：
    - 识别用户图中需要修复的区域，以匹配参考图。
    - 例如：如果参考图有深色天空但用户图有明亮天空，在用户图的天空区域创建多边形蒙版，action 为 "burn"（压暗）。
    - `grading_masks` 数组中的每个蒙版：
      - `area_polygon`：多边形区域（每个点的 x, y 为 0-100%，基于用户图）。
      - `action`：操作类型（"dodge" 提亮、"burn" 压暗、"desaturate" 降饱和、"color_warp" 色彩调整）。
      - `advice`：调色建议（例如："压暗天空以匹配参考图的深邃感"）。

---

# ============================================================================
# 🚨 OUTPUT INSTRUCTION: TEMPLATE COMPLETION MODE
# ============================================================================

**不要生成你自己的 JSON 结构。**

**填写下面模板中的缺失值。**

**填写规则：**

1.  **首先填写 `image_verification`**：确认两张图片的身份。

2.  **其次填写 `spatial_analysis`**：完成所有多边形/框的坐标计算。

3.  **标签**：使用简短、具体的词作为 overlay 标签（1-2 个词）。

4.  **原始 JSON**：只输出有效的 JSON。

5.  **所有文本字段必须使用简体中文**。

```json
{PART1_TEMPLATE}
```

---

# ============================================================================
# 🚨🚨🚨 [CRITICAL COORDINATE INSTRUCTION] 🚨🚨🚨
# ============================================================================

**所有坐标 (x, y, w, h) 必须在 0 到 100 的相对比例（百分比）上，其中：**

- **x=0, y=0** 是图片的**左上角**。
- **x=100, y=100** 是图片的**右下角**。
- **禁止使用绝对像素值**（例如：980, 470, 320）。
- **使用百分比**（例如：50.5, 23.4, 15.8）。

**示例：**
- ❌ **错误**：`{{"x": 980, "y": 470, "w": 320, "h": 390}}` (像素值)
- ✅ **正确**：`{{"x": 50.5, "y": 23.4, "w": 15.8, "h": 19.5}}` (百分比)

**这适用于所有坐标字段：**
- `ref_visual_subject_box`, `ref_focus_exposure_box`, `ref_color_depth_box` (x, y, w, h)
- `user_visual_subject_box`, `user_focus_exposure_box`, `user_color_depth_box` (x, y, w, h)
- `ref_visual_mass_polygon.vertices` (每个顶点为 [x, y]，其中 x, y 为 0-100)
- `ref_visual_mass_polygon.center_of_gravity` ([x, y]，其中 x, y 为 0-100)
- `module_2_composition.reference_analysis.visual_weight.layers_visual_map[].box` (x, y, w, h 为 0-100，**基于参考图**)
- `module_2_composition.reference_analysis.visual_flow.vanishing_point.x`, `module_2_composition.reference_analysis.visual_flow.vanishing_point.y` (x, y 为 0-100，**基于参考图**)
- `module_2_composition.reference_analysis.visual_flow.vectors[].start.x`, `module_2_composition.reference_analysis.visual_flow.vectors[].start.y` (x, y 为 0-100，**基于参考图**)
- `module_2_composition.reference_analysis.visual_flow.vectors[].end.x`, `module_2_composition.reference_analysis.visual_flow.vectors[].end.y` (x, y 为 0-100，**基于参考图**)
- `module_2_composition.reference_analysis.spatial_depth.foreground/midground/background.polygon[].x`, `module_2_composition.reference_analysis.spatial_depth.foreground/midground/background.polygon[].y` (x, y 为 0-100，**基于参考图**)
- `module_2_composition.composition_clinic.suggested_crop.x`, `module_2_composition.composition_clinic.suggested_crop.y`, `module_2_composition.composition_clinic.suggested_crop.w`, `module_2_composition.composition_clinic.suggested_crop.h` (x, y, w, h 为 0-100，**基于用户图**)
- `module_2_composition.composition_clinic.action_guides[].x`, `module_2_composition.composition_clinic.action_guides[].y` (x, y 为 0-100，**基于用户图**)
- `module_2_composition.composition_clinic.grading_masks[].area_polygon[].x`, `module_2_composition.composition_clinic.grading_masks[].area_polygon[].y` (x, y 为 0-100，**基于用户图**)

**⚠️ 违反此规则将导致解析错误。 ⚠️**

---

# ============================================================================
# 【再次强调】必须使用简体中文 (Simplified Chinese) 进行所有分析和输出
# ============================================================================
"""
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
        """Part2 Prompt - 强制中文"""
        
        style_summary_note = ""
        if style_summary:
            style_summary_note = f"""
**Phase 1 风格克隆战略指导 (style_summary)**：
{style_summary}

**重要**：这是 Phase 1 的核心产出，你必须严格按照这个战略指导生成参数。
"""
        else:
            style_summary_note = "**注意**：未提供 Phase 1 的 style_summary，请基于参考图和用户图的对比分析生成参数。"

        # 修复点：这里直接使用 PART2_TEMPLATE 常量
        prompt = f"""# Role: 影像科学高级数字影像技师 (Senior DIT)

## Profile
你是一位精通 Lightroom 和 Photoshop 的顶级修图师。**生成的 Phase 2 参数解释必须完全使用简体中文**。

## Task: Phase 2 - 风格参数生成
目标：将战略转化为 LR/PS 参数。

{style_summary_note}

## Processing Logic
1.  **减法法则**: 默认倾向于降低饱和度，除非是糖水片。
2.  **流派锁**:
    *   **日系/滨田**: 低对比，提亮阴影，负Dehaze。
    *   **赛博/RK**: 高对比，压暗黑位，正Clarity，青橙色调。
    *   **胶片/保井**: S型曲线，哑光黑位(Fade Black)，加颗粒。

## Output Format (JSON Structure)
只输出 JSON。填充下方模板，所有解释字段必须用 **简体中文**。

```json
{PART2_TEMPLATE}
```
"""
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
        Part 3: 三重身份锁定
        
        核心策略：通过多重身份锁定机制，确保 AI 正确识别和处理图片
        """
        
        photo_review = color_grading_schema.get("photo_review", {})
        style_summary = photo_review.get("style_summary", "")
        
        context_data = {
            "style_summary": style_summary,
            "color_grading": color_grading_schema.get("color", {}),
            "lightroom_params": color_grading_schema.get("lightroom", {}),
            "photoshop_params": color_grading_schema.get("photoshop", {})
        }
        context_json = json.dumps(context_data, ensure_ascii=False, indent=2)
        
        prompt = f"""# ⚠️⚠️⚠️ CRITICAL: IMAGE IDENTITY LOCK ⚠️⚠️⚠️

I am sending you TWO images. You must identify them correctly:

**IMAGE #1 (Top/First)**: REFERENCE STYLE (The Masterpiece)
*   Instruction: LOOK ONLY. Do not edit. Analyze its colors/mood.

**IMAGE #2 (Bottom/Second)**: USER RAW PHOTO (The Input)
*   Instruction: EDIT THIS IMAGE. Transform it to look like Image #1.

---

# Role: Senior Digital Imaging Technician (DIT)

Mission: Process **IMAGE #2** to match the aesthetic of **IMAGE #1**, applying the technical schema below.

# Technical Schema (The Recipe)

```json
{context_json}
```

# Execution Rules

*   **Target**: Only modify Image #2.
*   **Goal**: Make Image #2 look like it belongs in the same portfolio as Image #1.
*   **Forbidden**: Do not return Image #1. Do not merge them into a collage.

# Output

Return ONLY the processed Image #2.
"""
        return prompt

    @staticmethod
    def get_feasibility_prompt(
        reference_image: str,
        user_image: Optional[str] = None,
        exif: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Feasibility Prompt - 自然语言解释"""
        prompt = """你是一名摄影风格分析专家。
系统已通过 CV 算法计算出两张图片的复刻可行性。请生成一段自然语言解释（200字以内）：
1. 为什么可行或困难（基于光线、场景、色彩）？
2. 哪些维度是短板？
3. 给用户的简短建议。

输出一段纯文本，语气专业。"""
        return prompt

    @staticmethod
    def get_diagnosis_prompt(
        histogram_data: Dict[str, Any],
        dominant_colors: List[Dict[str, Any]],
    ) -> str:
        """诊断: 填空模式"""
        
        dominant_colors_text = "\n".join([
            f"- 色相 {c.get('h',0):.0f}, 饱和度 {c.get('s',0):.2f}" 
            for i, c in enumerate(dominant_colors[:5])
        ])
        
        # 修复点：这里直接使用 DIAGNOSIS_TEMPLATE 常量
        prompt = f"""# Role: 摄影导师
Task: 为用户照片生成一份"AI 诊断卡片"。

## 数据
* 平均亮度: {histogram_data.get('avgL', 0)}/255
* 高光占比: {histogram_data.get('highlights', 0):.1%}
* 主色调: {dominant_colors_text}

## Output JSON
Fill in the template below:

```json
{DIAGNOSIS_TEMPLATE}
```
"""
        return prompt