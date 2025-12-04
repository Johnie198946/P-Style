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
    
    【修复】JSON 数字格式问题：
    - JSON 标准不允许数字前导 '+' 号（如 `+10` 是无效的）
    - 但 `+/-` 有实际意义，表示相对变化（如 HSL 调整值、参数增量等）
    - 解决方案：将 `+数字` 转换为字符串 `"+数字"`，保留语义
    - 例如：`"l": +10` → `"l": "+10"`，`"s": +0.5` → `"s": "+0.5"`
    """
    import re
    
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
    
    # 4. 【修复】将 JSON 数字前导 '+' 号转换为字符串，保留 +/- 的语义意义
    # JSON 标准不支持数字前导的 '+' 号（如 `+10` 是无效的）
    # 但 `+/-` 有实际意义，表示相对变化（如 HSL 调整值、参数增量等）
    # 解决方案：将 `+数字` 转换为字符串 `"+数字"`，这样既能通过 JSON 解析，又能保留语义
    # 例如：`"l": +10` → `"l": "+10"`，`"s": +0.5` → `"s": "+0.5"`
    # 负号 `-` 是有效的 JSON 数字格式，无需处理：`"l": -10` 保持不变
    
    import logging
    logger = logging.getLogger(__name__)
    
    # 【调试日志】记录清洗前的内容（用于排查 HSL 问题）
    if 'hsl' in cleaned.lower() or 'hue' in cleaned.lower():
        logger.info(f"clean_json_response: 🔴 检测到 HSL 相关内容，准备转换 +数字 格式")
        # 检查是否有 +数字 格式需要转换
        plus_number_pattern = r':\s*\+\d+'
        plus_number_matches = re.findall(plus_number_pattern, cleaned)
        logger.info(f"clean_json_response: 🔴 发现 {len(plus_number_matches)} 个 +数字 格式需要转换: {plus_number_matches[:10]}")
    
    def replace_plus_number(match):
        """将 `+数字` 转换为字符串 `"+数字"`，保留语义"""
        colon_and_space = match.group(1)  # 冒号和空格
        number = match.group(2)  # 数字部分（整数或小数）
        return f'{colon_and_space}"+{number}"'  # 转换为字符串格式
    
    # 匹配模式：冒号后的可选空格、'+' 号、数字（整数或小数）
    # 例如：`"l": +10` 或 `"s": +0.5` 或 `"l":+10` 或 `"hue": +10`
    # 【修复】增强正则表达式，支持更多格式：
    # - `"hue": +10` → `"hue": "+10"`
    # - `"hue":+10` → `"hue":"+10"`
    # - `"hue": +10,` → `"hue": "+10",`
    # - `"hue": +10\n` → `"hue": "+10"\n`
    pattern = r'(:\s*)\+(\d+\.?\d*)'
    cleaned = re.sub(pattern, replace_plus_number, cleaned)
    
    # 【调试日志】记录转换后的结果（用于排查 HSL 问题）
    if 'hsl' in cleaned.lower() or 'hue' in cleaned.lower():
        # 检查 HSL 相关内容
        hsl_match = re.search(r'"hsl"\s*:\s*\{[^}]+\}', cleaned, re.DOTALL)
        if hsl_match:
            logger.info(f"clean_json_response: 🔴 转换后的 HSL 片段（前 500 字符）: {hsl_match.group()[:500]}")
    
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
      "master_archetype": "STRING: Identify specific lineage AND Category (Choose from: 'Japanese High-Key', 'Cinematic/Moody', 'Realistic/Standard', 'Other'). e.g. 'Japanese High-Key / Hamada'", 
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
    "style_summary": "STRING: PHASE 2 CONSTITUTION. Must include: [Protocol Category: A-HighKey / B-Cinematic / C-Realistic], [Strategy Name], [Color Mapping], [Light Shaping], [Forbidden Actions].",
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
      "contrast": "STRING: Calculate Contrast gap (⚠️绝对不能超过±10！). Format: 'Action(Value)|Reason'. Example: '微调对比度 (-5) | 轻微柔化'",
      "highlights": "STRING: Highlight recovery gap. Format: 'Action(Value)|Reason'. User blown out? '-'. Ref crisp? '+'. Example: '保护高光 (-30) | 保护高光细节'",
      "shadows": "STRING: Shadow tone gap. Format: 'Action(Value)|Reason'. Ref matte? '+' (Lift). Ref deep? '-' (Crush). Example: '提亮暗部 (+60) | 大幅提亮暗部'",
      "whites": "STRING: White point clipping gap. Format: 'Action(Value)|Reason'. Example: '柔化 (-10) | 柔化白色'",
      "blacks": "STRING: Black point anchoring gap. Format: 'Action(Value)|Reason'. Example: '制造灰度感 (+30) | 制造灰度感'"
    },
    "tone_curves": {
      "explanation": "STRING: Explain the curve needed to bridge the gap. e.g., '哑光胶片曲线：左下角黑点大幅上提（Fade Black），中间调平缓提升，高光轻微压暗。'",
      "points_rgb": [
        { "x": 0, "y": 0 },
        { "x": 64, "y": 80 },
        { "x": 128, "y": 128 },
        { "x": 192, "y": 200 },
        { "x": 255, "y": 255 }
      ],
      "points_red": [
        { "x": 0, "y": 0 },
        { "x": 255, "y": 255 }
      ],
      "points_green": [
        { "x": 0, "y": 0 },
        { "x": 255, "y": 255 }
      ],
      "points_blue": [
        { "x": 0, "y": 0 },
        { "x": 255, "y": 255 }
      ]
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
  },
  "module_4_visual_anchors": {
    "hero_subject": "STRING: Describe the main subject and its environment in User Image. e.g., 'Deep Blue Sea and Dark Asphalt Road'.",
    "hero_colors": ["STRING: Color 1 (e.g., 'Deep Blue')", "STRING: Color 2 (e.g., 'Dark Grey')"],
    "material_conflict": "STRING: Analyze if there is a material conflict between Reference and User image. e.g., 'Reference is White Concrete (High Key), User is Dark Asphalt (Low Key).'",
    "protection_strategy": "STRING: Define how to protect the Hero Colors. e.g., 'Do NOT bleach the asphalt to match the concrete. Do NOT desaturate the sea. Use Luminance to lift shadows instead.'",
    "hsl_constraints": {
      "blue_saturation_min": "NUMBER: e.g., -15 (Do not go lower than this)",
      "orange_saturation_min": "NUMBER: e.g., -10 (Protect skin tone)",
      "shadow_lift_max": "NUMBER: e.g., +60 (Prevent gray noise)"
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
  "analysis": {
    "scene_type": "例如：日系街头 / 室内人像",
    "lighting_strategy": "例如：用户图欠曝严重，需先提亮再做风格化",
    "key_colors": ["Teal", "Orange", "Matte Black"],
    "dynamic_range_analysis": "例如：参考图高调，用户图欠曝，需提升阴影",
    "color_calibration_strategy": "例如：红原色偏橙，蓝原色偏青，模仿 Kodak Portra 400"
  },
  "lightroom_workflow": {
    "basic_panel": {
      "temp": { "value": "-400", "reason": "⚠️正值=偏暖(黄)，负值=偏冷(蓝)。日系通常需要负值" },
      "tint": { "value": "+10", "reason": "正值=偏洋红，负值=偏绿" },
      "exposure": { "value": "+0.5", "reason": "优先修正亮度差" },
      "contrast": { "value": "-5", "reason": "⚠️绝对禁止超过±10" },
      "highlights": { "value": "-30", "reason": "找回高光细节" },
      "shadows": { "value": "+40", "reason": "提亮暗部，增加通透感" },
      "whites": { "value": "+0", "reason": "..." },
      "blacks": { "value": "+20", "reason": "提升黑点，制造哑光感" },
      "texture": { "value": "-5", "reason": "平滑皮肤或增加质感" },
      "clarity": { "value": "-15", "reason": "负值柔化光线" },
      "dehaze": { "value": "-20", "reason": "负去朦胧增加日系空气感" },
      "vibrance": { "value": "-10", "reason": "..." },
      "saturation": { "value": "-5", "reason": "..." }
    },
    "tone_curve": {
      "mode": "RGB_Channels",
      "style": "Matte Look / S-Curve",
      "reason": "中文解释曲线策略",
      "rgb_points": [[0,30], [60,65], [128,128], [190,200], [255,250]],
      "red_points": [[0,0], [255,255]],
      "green_points": [[0,0], [255,255]],
      "blue_points": [[0,10], [255,245]]
    },
    "hsl": {
      "red": { "hue": 0, "saturation": 0, "luminance": 0, "note": "无需调整" },
      "orange": { "hue": 0, "saturation": -10, "luminance": +10, "note": "肤色优化：降低饱和度，提高明度，保持肤色自然" },
      "yellow": { "hue": -10, "saturation": -20, "luminance": +10, "note": "植被去黄：色相向绿色偏移，降低饱和度，提高明度" },
      "green": { "hue": +20, "saturation": -30, "luminance": +10, "note": "植被青翠化：色相向黄色偏移，大幅降低饱和度，提高明度" },
      "aqua": { "hue": 0, "saturation": 0, "luminance": 0, "note": "无需调整" },
      "blue": { "hue": -10, "saturation": -20, "luminance": +20, "note": "天空通透感：色相向青色偏移，降低饱和度，大幅提高明度" },
      "purple": { "hue": 0, "saturation": 0, "luminance": 0, "note": "无需调整" },
      "magenta": { "hue": 0, "saturation": 0, "luminance": 0, "note": "无需调整" }
    },
    "color_grading": {
      "shadows": { "hue": 210, "saturation": 15, "luminance": 0, "reason": "阴影偏冷" },
      "midtones": { "hue": 40, "saturation": 10, "luminance": 0, "reason": "中间调偏暖" },
      "highlights": { "hue": 220, "saturation": 5, "luminance": 0, "reason": "高光微冷" },
      "blending": 50,
      "balance": 0
    },
    "calibration": {
      "red_primary": { "hue": 0, "saturation": 0, "note": "..." },
      "green_primary": { "hue": 0, "saturation": 0, "note": "..." },
      "blue_primary": { "hue": -50, "saturation": +50, "note": "胶片感核心：青橙色调" },
      "shadows_tint": 0
    },
    "effects": {
      "vignette_amount": -10,
      "grain_amount": 15
    },
    "simulated_histogram": {
      "description": "中文描述直方图形态",
      "rgb_values": { "r": 120, "g": 120, "b": 120 },
      "histogram_data": {
        "r": [0,0,0,0,5,10,20,40,60,80,90,80,60,40,20,10,5,2,0,0],
        "g": [0,0,0,0,5,12,22,42,62,82,92,82,62,42,22,12,5,2,0,0],
        "b": [0,0,0,0,8,15,25,45,65,85,95,85,65,45,25,15,8,2,0,0],
        "l": [0,0,0,0,6,12,22,42,62,82,92,82,62,42,22,12,6,2,0,0]
      },
      "stats_grid_description": "统计网格说明",
      "palette_strip_description": "HSL混色器说明"
    },
    "local_adjustments": [
      {
        "type": "gradient",
        "name": "天空渐变",
        "description": "压暗天空以匹配参考图的深邃感",
        "area": {
          "x": 0,
          "y": 0,
          "width": 100,
          "height": 40
        },
        "adjustments": {
          "exposure": "-0.5",
          "saturation": "+10"
        }
      }
    ]
  },
  "photoshop_workflow": {
    "logic_check": "中文分析",
    "selective_color": {
      "black_cyan": { "val": "+15", "reason": "黑色加青" }
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

class PromptTemplate:
    """Prompt 模板工具类 - 提供静态方法"""

    @staticmethod
    def _build_input_data_injection_section(image_analysis: Dict[str, Any]) -> str:
        """
        构建第一层：输入端的数据注入 (Input Data Injection)
        
        基于用户提供的 Implementation Specification，
        计算 luma_mean, histogram_dist, color_cast 并注入 Prompt。
        """
        if not image_analysis:
            return ""
        
        user = image_analysis.get("user", {})
        if not user:
            return ""
            
        hist = user.get("histogram", {})
        colors = user.get("colors", {})
        
        # 1. luma_mean (0-255)
        luma_mean = hist.get("avg_luminance", 128)
        luma_status = "Normal"
        if luma_mean < 60:
            luma_status = "Severely Underexposed"
        elif luma_mean > 200:
            luma_status = "Overexposed"
            
        # 2. histogram_dist
        dist = hist.get("distribution", {})
        shadows_pct = dist.get("shadows", 0)
        midtones_pct = dist.get("midtones", 0)
        highlights_pct = dist.get("highlights", 0)
        
        # 3. color_cast (B_avg vs R_avg)
        avg_rgb = colors.get("average_rgb", {})
        r_avg = avg_rgb.get("r", 0)
        b_avg = avg_rgb.get("b", 0)
        cast_val = b_avg - r_avg
        cast_desc = "Neutral"
        if cast_val > 10:
            cast_desc = "Cool (Blue dominant)"
        elif cast_val < -10:
            cast_desc = "Warm (Red/Yellow dominant)"
            
        return f"""
[SYSTEM_DETECTED_METRICS]
- User_Image_Luminance_Mean: {luma_mean} (Scale 0-255) -> STATUS: {luma_status}.
- User_Image_Histogram: Shadows({shadows_pct}%), Midtones({midtones_pct}%), Highlights({highlights_pct}%).
- Detected_Cast: {cast_desc} (B-R diff: {cast_val}).
"""

    @staticmethod
    def _build_quantitative_data_section(image_analysis: Dict[str, Any]) -> str:
        """
        构建量化分析数据注入段落
        
        将 OpenCV 分析的真实数据注入到 Prompt 中，
        让 Gemini 基于真实数据而非"拍脑袋"生成参数。
        
        Args:
            image_analysis: ImageAnalyzer.compare_images() 返回的数据
            
        Returns:
            格式化的 Markdown 段落，可直接注入 Prompt
        """
        if not image_analysis:
            return ""
        
        ref = image_analysis.get("reference", {})
        user = image_analysis.get("user", {})
        deltas = image_analysis.get("deltas", {})
        recommendations = image_analysis.get("recommendations", {})
        
        # 如果没有有效数据，返回空
        if not ref or not user:
            return ""
        
        section = """
## 📊 【重要】真实图像量化分析数据（OpenCV 计算结果）

**⚠️ 以下数据是通过 OpenCV 对两张图片进行真实分析得到的，请基于这些数据生成参数，而非凭感觉猜测！**

### 🎯 参考图分析结果
"""
        
        # 参考图直方图分析
        ref_hist = ref.get("histogram", {})
        if ref_hist:
            ref_black = ref_hist.get("black_point", {})
            ref_white = ref_hist.get("white_point", {})
            # 【修复】提取所有值，避免在 f-string 中直接调用 get() 方法
            # 这样可以防止某些值包含 JSON 格式字符串时被解析为格式化占位符
            ref_black_r = ref_black.get('r', 0)
            ref_black_g = ref_black.get('g', 0)
            ref_black_b = ref_black.get('b', 0)
            ref_black_lum = ref_black.get('luminance', 0)
            ref_white_r = ref_white.get('r', 255)
            ref_white_g = ref_white.get('g', 255)
            ref_white_b = ref_white.get('b', 255)
            ref_white_lum = ref_white.get('luminance', 255)
            ref_peak = ref_hist.get('peak_position', 128)
            ref_avg_lum = ref_hist.get('avg_luminance', 128)
            ref_shape = str(ref_hist.get('shape', '未知'))  # 【修复】使用 str() 确保转换为字符串
            ref_dist = ref_hist.get('distribution', {})
            ref_shadows_pct = ref_dist.get('shadows', 33)
            ref_midtones_pct = ref_dist.get('midtones', 34)
            ref_highlights_pct = ref_dist.get('highlights', 33)
            
            section += f"""
#### 直方图特征
- **黑点 (最暗 1% 像素)**：R={ref_black_r} G={ref_black_g} B={ref_black_b}，亮度={ref_black_lum}
- **白点 (最亮 1% 像素)**：R={ref_white_r} G={ref_white_g} B={ref_white_b}，亮度={ref_white_lum}
- **直方图峰值位置**：{ref_peak}
- **平均亮度**：{ref_avg_lum}
- **形态描述**：{ref_shape}
- **分布**：阴影 {ref_shadows_pct}% | 中间调 {ref_midtones_pct}% | 高光 {ref_highlights_pct}%
"""
        
        # 参考图色彩分析
        ref_colors = ref.get("colors", {})
        if ref_colors:
            ref_temp = ref_colors.get("color_temperature", {})
            # 【修复】提取所有值，避免在 f-string 中直接调用 get() 方法
            ref_estimated_k = ref_temp.get('estimated_k', 5500)
            ref_tendency = str(ref_temp.get('tendency', '中性'))  # 【修复】使用 str() 确保转换为字符串
            ref_avg_rgb = ref_colors.get('average_rgb', {})
            ref_avg_r = ref_avg_rgb.get('r', 128)
            ref_avg_g = ref_avg_rgb.get('g', 128)
            ref_avg_b = ref_avg_rgb.get('b', 128)
            ref_sat_level = str(ref_colors.get('saturation_level', '中等'))  # 【修复】使用 str() 确保转换为字符串
            
            section += f"""
#### 色彩特征
- **估算色温**：{ref_estimated_k}K ({ref_tendency})
- **平均 RGB**：R={ref_avg_r} G={ref_avg_g} B={ref_avg_b}
- **饱和度水平**：{ref_sat_level}
"""
        
        # 参考图区域分析
        ref_zones = ref.get("zones", {})
        if ref_zones:
            section += "\n#### 区域分析\n"
            
            # 阴影区域（最重要，决定褪色感）
            shadows = ref_zones.get("shadows", {})
            if shadows.get("exists"):
                shadow_rgb = shadows.get("avg_rgb", {})
                # 【修复】提取所有值，避免在 f-string 中直接调用 get() 方法
                shadow_r = shadow_rgb.get('r', 0)
                shadow_g = shadow_rgb.get('g', 0)
                shadow_b = shadow_rgb.get('b', 0)
                shadow_tendency = str(shadows.get('color_tendency', '中性'))  # 【修复】使用 str() 确保转换为字符串
                shadow_coverage = shadows.get('coverage_percent', 0)
                section += f"- **阴影区域**：R={shadow_r} G={shadow_g} B={shadow_b}，{shadow_tendency}，占比 {shadow_coverage}%\n"
            
            # 高光区域
            highlights = ref_zones.get("highlights", {})
            if highlights.get("exists"):
                highlight_rgb = highlights.get("avg_rgb", {})
                # 【修复】提取所有值
                highlight_r = highlight_rgb.get('r', 255)
                highlight_g = highlight_rgb.get('g', 255)
                highlight_b = highlight_rgb.get('b', 255)
                highlight_tendency = str(highlights.get('color_tendency', '中性'))  # 【修复】使用 str() 确保转换为字符串
                highlight_coverage = highlights.get('coverage_percent', 0)
                section += f"- **高光区域**：R={highlight_r} G={highlight_g} B={highlight_b}，{highlight_tendency}，占比 {highlight_coverage}%\n"
            
            # 天空（如果检测到）
            sky = ref_zones.get("sky", {})
            if sky.get("detected"):
                sky_rgb = sky.get("avg_rgb", {})
                sky_hsv = sky.get("avg_hsv", {})
                # 【修复】提取所有值
                sky_r = sky_rgb.get('r', 200)
                sky_g = sky_rgb.get('g', 210)
                sky_b = sky_rgb.get('b', 230)
                sky_type = str(sky.get("sky_type", "未知"))  # 【修复】使用 str() 确保转换为字符串
                sky_h = sky_hsv.get('h', 210)
                sky_s = sky_hsv.get('s', 20)
                sky_v = sky_hsv.get('v', 80)
                section += f"- **天空区域**：R={sky_r} G={sky_g} B={sky_b}，类型={sky_type}，色相 {sky_h}°，饱和度 {sky_s}%，亮度 {sky_v}%\n"
            
            # 植被（如果检测到）
            vegetation = ref_zones.get("vegetation", {})
            if vegetation.get("detected"):
                veg_hsv = vegetation.get("avg_hsv", {})
                # 【修复】提取所有值
                veg_type = str(vegetation.get("vegetation_type", "未知"))  # 【修复】使用 str() 确保转换为字符串
                veg_h = veg_hsv.get('h', 110)
                veg_s = veg_hsv.get('s', 40)
                veg_v = veg_hsv.get('v', 50)
                section += f"- **植被区域**：类型={veg_type}，色相 {veg_h}°，饱和度 {veg_s}%，亮度 {veg_v}%\n"
        
        # 【新增】高级分析数据
        ref_advanced = ref.get("advanced", {})
        if ref_advanced:
            section += "\n#### 高级分析\n"
            
            # 曲线形态
            curve_shape = ref_advanced.get("curve_shape", {})
            if curve_shape.get("type") != "未知":
                # 【修复】使用 str() 确保值转换为字符串，避免 JSON 格式字符串被解析为格式化占位符
                curve_type = str(curve_shape.get('type', '未知'))
                curve_desc = str(curve_shape.get('description', ''))
                section += "- **曲线形态**：" + curve_type + " - " + curve_desc + "\n"
            
            # 色彩分级
            color_grading = ref_advanced.get("color_grading", {})
            shadows_grading = color_grading.get("shadows", {})
            highlights_grading = color_grading.get("highlights", {})
            if shadows_grading.get("hue") or highlights_grading.get("hue"):
                section += "- **色彩分级**："
                if shadows_grading.get("hue"):
                    # 【修复】使用 str() 确保值转换为字符串
                    shadow_tendency = str(shadows_grading.get('tendency', '中性'))
                    shadow_hue = shadows_grading.get('hue', 0)
                    section += f"阴影偏{shadow_tendency}({shadow_hue}°)，"
                if highlights_grading.get("hue"):
                    # 【修复】使用 str() 确保值转换为字符串
                    highlight_tendency = str(highlights_grading.get('tendency', '中性'))
                    highlight_hue = highlights_grading.get('hue', 0)
                    section += f"高光偏{highlight_tendency}({highlight_hue}°)"
                section += "\n"
            
            # 动态范围
            dynamic_range = ref_advanced.get("dynamic_range", {})
            if dynamic_range.get("effective_range", 0) > 0:
                # 【修复】使用 str() 确保值转换为字符串
                dynamic_desc = str(dynamic_range.get('description', ''))
                section += "- **动态范围**：" + dynamic_desc + "\n"
            
            # 色彩平衡
            color_balance = ref_advanced.get("color_balance", {})
            if color_balance.get("bias") != "未知":
                # 【修复】使用 str() 确保值转换为字符串
                balance_desc = str(color_balance.get('description', ''))
                section += "- **色彩平衡**：" + balance_desc + "\n"
        
        # 用户图分析
        section += "\n### 🖼️ 用户图分析结果\n"
        
        user_hist = user.get("histogram", {})
        if user_hist:
            user_black = user_hist.get("black_point", {})
            user_white = user_hist.get("white_point", {})
            # 【修复】提取所有值，避免在 f-string 中直接调用 get() 方法
            user_black_r = user_black.get('r', 0)
            user_black_g = user_black.get('g', 0)
            user_black_b = user_black.get('b', 0)
            user_black_lum = user_black.get('luminance', 0)
            user_white_r = user_white.get('r', 255)
            user_white_g = user_white.get('g', 255)
            user_white_b = user_white.get('b', 255)
            user_white_lum = user_white.get('luminance', 255)
            user_avg_lum = user_hist.get('avg_luminance', 128)
            user_shape = str(user_hist.get('shape', '未知'))  # 【修复】使用 str() 确保转换为字符串
            
            section += f"""
#### 直方图特征
- **黑点**：R={user_black_r} G={user_black_g} B={user_black_b}，亮度={user_black_lum}
- **白点**：R={user_white_r} G={user_white_g} B={user_white_b}，亮度={user_white_lum}
- **平均亮度**：{user_avg_lum}
- **形态描述**：{user_shape}
"""
        
        user_colors = user.get("colors", {})
        if user_colors:
            user_temp = user_colors.get("color_temperature", {})
            # 【修复】提取所有值
            user_estimated_k = user_temp.get('estimated_k', 5500)
            user_tendency = str(user_temp.get('tendency', '中性'))  # 【修复】使用 str() 确保转换为字符串
            user_sat_level = str(user_colors.get('saturation_level', '中等'))  # 【修复】使用 str() 确保转换为字符串
            
            section += f"""
#### 色彩特征
- **估算色温**：{user_estimated_k}K ({user_tendency})
- **饱和度水平**：{user_sat_level}
"""
        
        # 差值分析（最关键！）
        if deltas:
            # 【修复】提取所有差值数据，避免在 f-string 中直接调用 get() 方法
            # 这样可以防止某些值包含 JSON 格式字符串时被解析为格式化占位符
            black_point_lift = deltas.get('black_point_lift', 0)
            exposure_change = deltas.get('exposure_change', 0)
            color_temp_change = deltas.get('color_temp_change', 0)
            saturation_change = deltas.get('saturation_change', 0)
            contrast_change = deltas.get('contrast_change', 0)
            
            # 构建解释文本
            black_lift_desc = '参考图黑点被提升，有褪色感' if black_point_lift > 10 else '参考图黑点正常'
            exposure_desc = '需要提亮' if exposure_change > 0 else '需要压暗' if exposure_change < 0 else '曝光基本一致'
            temp_desc = '需要偏暖' if color_temp_change > 0 else '需要偏冷' if color_temp_change < 0 else '色温基本一致'
            sat_desc = '需要增加饱和度' if saturation_change > 0 else '需要降低饱和度' if saturation_change < 0 else '饱和度基本一致'
            contrast_desc = '需要增加对比度' if contrast_change > 0 else '需要降低对比度' if contrast_change < 0 else '对比度基本一致'
            
            section += f"""
### 📐 差值分析（参考图 - 用户图）

**⚠️ 请基于以下差值生成参数，而非凭感觉猜测！**

| 项目 | 差值 | 解释 |
|------|------|------|
| **黑点提升** | {black_point_lift} | {black_lift_desc} |
| **曝光调整** | {exposure_change:+.2f} EV | {exposure_desc} |
| **色温调整** | {color_temp_change:+d}K | {temp_desc} |
| **饱和度调整** | {saturation_change:+d}% | {sat_desc} |
| **对比度调整** | {contrast_change:+d} | {contrast_desc} |
"""
        
        # AI 建议
        if recommendations:
            notes = recommendations.get("notes", [])
            if notes:
                section += "\n### 💡 AI 调整建议\n"
                for note in notes:
                    # 【修复】使用 str() 确保值转换为字符串，避免 JSON 格式字符串被解析为格式化占位符
                    note_str = str(note)
                    section += "- " + note_str + "\n"
            
            # 曲线建议（特别重要）
            curve_rec = recommendations.get("curve", {})
            if curve_rec:
                # 【修复】使用 str() 确保值转换为字符串，避免 JSON 格式字符串被解析为格式化占位符
                curve_reason = str(curve_rec.get('reason', ''))
                black_point_y = curve_rec.get('black_point_y', 0)
                section += "\n**曲线建议**：" + curve_reason + "\n"
                section += "- 建议曲线起点 y 值：" + str(black_point_y) + "\n"
            
            # 【新增】直方图匹配曲线建议
            matching_curves = recommendations.get("matching_curves", {})
            if matching_curves:
                section += "\n**直方图匹配曲线建议 (Tone Mapping)**：\n"
                section += "这些曲线点是通过数学计算得出的，能将用户图的直方图完美映射到参考图。请重点参考这些数值！\n"
                
                # RGB 主曲线 (Luminance)
                if 'l' in matching_curves:
                    points_str = ", ".join([f"({p['x']}, {p['y']})" for p in matching_curves['l']])
                    section += f"- **建议 RGB 主曲线点**：[{points_str}]\n"
                
                # R/G/B 通道曲线 (Color Cast)
                if 'r' in matching_curves:
                    points_str = ", ".join([f"({p['x']}, {p['y']})" for p in matching_curves['r']])
                    section += f"- **建议红色通道曲线点**：[{points_str}]\n"
                if 'g' in matching_curves:
                    points_str = ", ".join([f"({p['x']}, {p['y']})" for p in matching_curves['g']])
                    section += f"- **建议绿色通道曲线点**：[{points_str}]\n"
                if 'b' in matching_curves:
                    points_str = ", ".join([f"({p['x']}, {p['y']})" for p in matching_curves['b']])
                    section += f"- **建议蓝色通道曲线点**：[{points_str}]\n"
        
        section += """
---

**⚠️ 重要提醒（防止过度褪色、死黑和发灰）**：
1. **不要生成死黑（Crushed Blacks）**：日系和胶片风格的暗部通常是提升的（Lifted Blacks/Deep Gray），不要把暗部压成纯黑（0,0,0）。
2. **黑点提升要适度**：通过 RGB 曲线起点提升来实现褪色感，而不是过度降低亮度。
3. **⚠️⚠️⚠️ 对比度绝对禁止超过 ±10**：无论任何风格，Contrast 只能在 -10 ~ +10 范围内！想要低对比度效果请用 Blacks/Shadows 代替，想要高对比度效果请用曲线代替！
4. **去朦胧（Dehaze）不要滥用**：负去朦胧（-10~-20）可以增加空气感，正去朦胧过度会让画面变脏变黑。
5. **直方图匹配曲线（Histogram Matching Curve）仅供参考**：这些是纯数学计算，可能产生不自然的锯齿。**如果曲线形状很怪异，请忽略它，使用你自己的美学判断生成平滑的 S 型或 J 型曲线。**
6. **美学优先**：如果量化数据与美学判断冲突，优先遵循美学判断，确保画面好看、干净、清爽。

"""
        return section


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

        # 【关键修复】使用 f-string 时，如果字符串中包含 JSON 格式数据（如 {"x": 0, "y": 0}），
        # Python 会将其解析为格式化占位符，导致 "Invalid format specifier" 错误
        # 解决方案：在 JSON 模板插入处使用字符串拼接（""" + PART1_TEMPLATE + """），
        # 而不是 f-string 变量插值（{PART1_TEMPLATE}）
        # 同时，prompt 字符串中的 JSON 示例需要使用双花括号 {{}} 转义
        prompt = f"""
# ============================================================================
# 【强制中文输出】必须使用简体中文 (Simplified Chinese) 进行所有分析和输出
# ============================================================================

# ============================================================================
# ROLE & EXPERTISE (角色设定：专业电影调色师 & 摄影指导)
# ============================================================================

你是一位拥有20年经验的专业电影调色师和摄影指导，精通Lightroom Classic (LRC) 和 Photoshop 的色彩科学。
你的审美数据库融合了包括 Henri Cartier-Bresson (决定性瞬间), Ansel Adams (区域曝光法), Steve McCurry (色彩叙事), 以及 Annie Leibovitz (环境肖像) 等100位世界级大师的风格。

**任务目标：**
请分析我上传的 [Reference Image] (参考图)，提取其色彩美学特征；然后根据 [User Image] (用户原图) 的光影基础，提供一份能够将 [User Image] 调整为 [Reference Image] 风格的详细Lightroom调色参数方案。

**必须使用中文 (Simplified Chinese) 进行输出。**

---

# ============================================================================
# 📸 VISUAL IDENTIFICATION PROTOCOL (图像识别协议 - 强制要求)
# ============================================================================

你必须首先视觉识别哪张图片是哪张：

1.  **第一张图片 (FIRST IMAGE)** 是 **参考风格图 (Reference Image)**。这是目标风格，不要编辑它。

2.  **第二张图片 (SECOND IMAGE)** 是 **用户内容图 (Target Image)**。这是需要被编辑的源图片。

---

# ============================================================================
# ANALYSIS PROTOCOL (分析协议：结构化拆解)
# ============================================================================

在分析时，你必须赋予自己“高级调色师”的角色，并强制从光影（Luminance）、色彩（Chrominance）和风格（Style）三个维度进行拆解。

## Step 1: 深度分析【参考图】 (Deep Analysis of Reference)

1.  **摄影风格 (Style)**：
    *   用专业术语描述（如：胶片感、赛博朋克、日系过曝、低调人像、青橙色调等）。

2.  **光影逻辑 (Luminance)**：
    *   分析直方图特征（如：暗部是否褪色？高光是否抑制？对比度是强还是弱？）。
    *   光比分析：是硬光还是柔光？

3.  **色彩映射 (Chrominance)**：
    *   **高光主色调**：Hex或描述（例如：暖白、粉紫）。
    *   **阴影主色调**：Hex或描述（例如：青蓝、茶褐）。
    *   **关键颜色的偏移**：例如：绿色是否偏青？红色是否饱和度降低？肤色是如何处理的？

## Step 2: 诊断【用户原图】 (Diagnosis of User Image)

分析原图与参考图在以下三个维度的主要差距：

1.  **曝光 (Exposure)**：用户图是过曝还是欠曝？对比度是否需要调整？
2.  **白平衡 (White Balance)**：用户图偏冷还是偏暖？需要如何修正？
3.  **色彩分离 (Color Separation)**：用户图的色彩是否混浊？高光和阴影是否需要分离色调？

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
""" + PART1_TEMPLATE + """
```
        # 【修复说明】使用字符串拼接而不是 f-string 变量插值，避免 PART1_TEMPLATE 中的 JSON 格式数据被解析为格式化占位符

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
        image_analysis: Optional[Dict[str, Any]] = None,  # 【新增】OpenCV 图像分析数据
    ) -> str:
        """Part2 Prompt - 强制中文，支持注入量化分析数据"""
        
        style_summary_note = ""
        if style_summary:
            style_summary_note = f"""
**Phase 1 风格克隆战略指导 (style_summary)**：
{style_summary}

**重要**：这是 Phase 1 的核心产出，你必须严格按照这个战略指导生成参数。
"""
        else:
            style_summary_note = "**注意**：未提供 Phase 1 的 style_summary，请基于参考图和用户图的对比分析生成参数。"

        # 【新增】构建量化分析数据注入段落
        quantitative_data_section = ""
        input_data_injection_section = ""  # 【新增】输入数据注入段落
        visual_anchors_section = ""  # 【新增】视觉锚点数据注入段落
        if image_analysis:
            quantitative_data_section = PromptTemplate._build_quantitative_data_section(image_analysis)
            input_data_injection_section = PromptTemplate._build_input_data_injection_section(image_analysis) # 【新增】构建输入数据注入段落
        
        # 【新增】从 Part 1 上下文提取 visual_anchors 数据并注入 Prompt
        if part1_context and isinstance(part1_context, dict):
            sections = part1_context.get("sections", {})
            visual_anchors = sections.get("visualAnchors", {})
            if visual_anchors:
                hero_colors = visual_anchors.get("hero_colors", [])
                material_conflict = visual_anchors.get("material_conflict", "")
                protection_strategy = visual_anchors.get("protection_strategy", "")
                hsl_constraints = visual_anchors.get("hsl_constraints", {})
                
                visual_anchors_section = f"""
## 🎯 Part 1 视觉锚点分析结果（必须严格遵守）

**⚠️⚠️⚠️ 这是 Part 1 识别出的核心色彩和保护策略，你必须严格遵守！**

### 核心色彩 (Hero Colors)
{', '.join(hero_colors) if hero_colors else '未识别'}

### 材质冲突分析
{material_conflict if material_conflict else '无冲突'}

### 保护策略
{protection_strategy if protection_strategy else '无特殊策略'}

### HSL 约束条件（硬性限制）
"""
                if hsl_constraints:
                    for key, value in hsl_constraints.items():
                        visual_anchors_section += f"- **{key}**: {value}\n"
                else:
                    visual_anchors_section += "- 无特殊约束\n"
                
                visual_anchors_section += """
**重要**：以上约束条件必须严格遵守，即使与参考图风格冲突，也要优先保护核心色彩！
"""

        # 【关键修复】使用字符串拼接而不是 f-string，避免 quantitative_data_section 和 input_data_injection_section 中的 JSON 格式数据被解析为格式化占位符
        # 问题：如果 quantitative_data_section 中包含 JSON 格式字符串（如 '{"saturation": "+10"}'），
        # 当使用 f-string 插入时，Python 会尝试解析其中的花括号作为格式化占位符，导致 ValueError: Invalid format specifier
        # 解决方案：使用字符串拼接，确保 JSON 格式数据不会被解析
        prompt = """# Role: 专业电影调色师 & 摄影指导 (Professional Colorist & DP)

## Profile
你拥有20年经验，精通 Lightroom Classic (LRC) 和 Photoshop 的色彩科学。你擅长从光影（Luminance）、色彩（Chrominance）和风格（Style）三个维度拆解影像。
**生成的 Phase 2 参数解释必须完全使用简体中文**。

## Task: 生成 Lightroom 调色配方 (Generate Grading Recipe)
请根据 Part 1 的分析结果，以及下方的【认知仿色流】思考过程，提供一份详细的 Lightroom 调色参数方案。

目标：**将 [User Image] (用户原图) 调整为 [Reference Image] (参考图) 的风格。**

""" + input_data_injection_section + """

""" + style_summary_note + """

""" + quantitative_data_section + """

""" + visual_anchors_section + """

## 🛡️ VISUAL ANCHOR PROTECTION PROTOCOL (CRITICAL - 最高优先级)

**⚠️⚠️⚠️ 这是最高优先级的规则，必须严格遵守！即使与参考图风格冲突，也要优先保护核心色彩！**

### 1. Hero Color Identification
- **从 Part 1 读取**：`structured_result.sections.visualAnchors.hero_colors` 和 `hsl_constraints`
- **识别对应通道**：
  - "Deep Blue" / "Royal Blue" / "宝蓝" → **Blue** 和 **Aqua** 通道
  - "Dark Grey" / "Asphalt" / "沥青" → **全局 Blacks/Shadows** 和 **Blue/Grey** 通道
  - "Black" → **全局 Blacks** 和 **Shadows**

### 2. Protection Rules (强制执行)

#### **RULE A (Saturation Clamp - 饱和度硬性限制)**
- **如果 Part 1 识别出蓝色为核心色彩**：
  - **Blue Saturation 绝对禁止低于 -15**（即使参考图是低饱和风格）
  - **Aqua Saturation 绝对禁止低于 -10**（保护浅海区域）
  - **如果 Part 1 的 `hsl_constraints.blue_saturation_min` 存在，必须遵守该值**
- **如果 Part 1 识别出其他核心色彩**：
  - **对应通道的 Saturation 绝对禁止低于 -20**

#### **RULE B (Material Respect - 材质尊重)**
- **如果用户图是深色材质（如沥青、深蓝海）**：
  - **Blacks 绝对禁止高于 +30**（防止发灰）
  - **Exposure 绝对禁止高于 +1.5**（防止过曝导致噪点）
  - **Dehaze 绝对禁止低于 -10**（防止加雾导致发灰）
  - **Contrast 绝对禁止低于 -25**（防止画面变平）

#### **RULE C (Anti-Gray Protocol - 防灰协议)**
- **如果画面发灰，检查以下参数组合**：
  - **Blacks + Dehaze 负值过大** → 这是发灰的主要原因！
  - **解决方案**：
    1. 降低 Blacks 提升幅度（+20 以内）
    2. 使用正值 Dehaze（+10~+20）去除灰雾
    3. 保持 Contrast 在 -15 以上
    4. 使用 Shadows 提亮暗部（而不是 Blacks）

#### **RULE D (Blue Richness Protection - 蓝色浓郁度保护)**
- **如果 Part 1 识别出蓝色为核心色彩**：
  - **Blue Saturation 必须保持在 -15 以上**（如果原始值很高，可以降到 -15，但不能再低）
  - **Blue Luminance 可以提升（+20~+40），但必须配合保持饱和度**
  - **如果蓝色变白/变灰，说明 Luminance 过高或 Saturation 过低，必须调整**

### 3. Conflict Resolution (冲突解决)
- **IF (Reference is High-Key/Low-Saturation) AND (User has Deep Blue/Deep Colors)**:
  - **优先级**：核心色彩保护 > 参考图风格模仿
  - **策略**：
    1. **不要强行降低饱和度**来匹配参考图
    2. **使用 Luminance 提升**来制造"明亮感"，而不是降低 Saturation
    3. **保持色彩的"身份"**（蓝色仍然是蓝色，不是灰色）

### 4. 实际应用示例

**场景：用户图是深蓝大海 + 黑色马路，参考图是日系高调风格**

❌ **错误做法**：
- Blue Saturation: -50（杀死蓝色）
- Blacks: +60（导致发灰）
- Dehaze: -25（加雾导致更灰）
- Contrast: -40（画面变平）

✅ **正确做法**：
- Blue Saturation: -10（微调，保持蓝色）
- Blue Luminance: +30（提亮但保持蓝色）
- Blacks: +15（适度提亮，不过度）
- Dehaze: +10（去雾，防止发灰）
- Contrast: -15（适度降低，保持层次）
- Shadows: +50（提亮暗部，制造空气感）

## 🛡️ STYLE-SPECIFIC SAFETY PROTOCOLS (必须严格遵守的风格安全协议)

**你必须首先判断参考图属于哪种风格类别，并强制执行相应的安全协议：**

### Protocol A: 日系/高调/空气感 (Japanese High-Key / Airy / Fresh)
*   **触发关键词**：日系, 空气感, 清新, High-Key, Airy, Bright, Seaside, 滨海.
*   **核心特征**：明亮、通透、低饱和但色彩分明。
*   **常见陷阱 (必须避免)**：
    1.  **过曝死白**：为了模仿高调，把曝光提太高，导致细节全无。
    2.  **发灰/雾霾感 (最严重问题)**：为了模仿空气感，大量使用负去雾 (Dehaze -30) 和大幅提亮黑点 (Blacks +50)，**导致照片像起雾了一样灰，这是绝对禁止的！**
    3.  **蓝色丢失**：为了模仿日系青蓝，把蓝色明度提太高 (+60) 且饱和度降太低 (-50)，导致天空/海面变成惨白，失去了"滨海"的蓝色特征。
*   **🛡️ 强制约束 (Safety Rails)**：
    1.  **去朦胧 (Dehaze)**：**禁止低于 -10**！如果画面发灰，必须使用**正值** Dehaze (+10~+20) 去除灰雾！日系的空气感是靠光线和阴影提亮，不是靠加雾霾。
    2.  **黑点 (Blacks)**：**禁止高于 +25**！必须保留一定的黑位，否则画面会发灰。如果 Part 1 识别出深色材质，Blacks 必须控制在 +20 以内。
    3.  **对比度 (Contrast)**：**禁止低于 -20**！可以降对比度，但不能让画面变平。如果画面发灰，Contrast 必须保持在 -15 以上。
    4.  **蓝色 HSL (Blue Channel) - 核心色彩保护**：
        *   **⚠️⚠️⚠️ 如果 Part 1 识别出蓝色为核心色彩，以下规则优先级最高**：
        *   **Saturation (饱和度)**：**绝对禁止低于 -15**（即使参考图是低饱和风格，也不能低于 -15）！
        *   **Luminance (明度)**：**禁止高于 +40**。过高会让蓝色变白。
        *   **如果 Part 1 的 `hsl_constraints.blue_saturation_min` 存在，必须遵守该值**（可能更严格，如 -10 或 -5）
        *   **Aqua (青色) Saturation**：**禁止低于 -10**（保护浅海区域）
    5.  **阴影 (Shadows)**：可以大幅提亮 (+40~+60)，这是制造空气感的正确方式（比提亮 Blacks 更安全）。

### Protocol B: 胶片/电影感/情绪 (Cinematic / Film / Moody)
*   **触发关键词**：胶片, 电影感, 情绪, 复古, Film, Cinematic, Moody, Matte, Portra.
*   **核心特征**：宽容度高、色调分离、黑位哑光。
*   **🛡️ 强制约束 (Safety Rails)**：
    1.  **阴影 (Shadows)**：必须提亮 (+20~+40) 以模拟胶片宽容度。
    2.  **曲线黑点**：可以轻微抬起 (Fade Black)，但不要超过 15%。
    3.  **颗粒**：适量增加 Grain (+15~+25)。

### Protocol C: 真实/纪实/风光 (Realistic / Documentary / Landscape)
*   **触发关键词**：真实, 纪实, 风光, 还原, Realistic, Documentary, Landscape.
*   **🛡️ 强制约束 (Safety Rails)**：
    1.  **参数克制**：所有参数幅度控制在 ±20 以内。
    2.  **去朦胧**：如果是风光，通常需要正值去雾 (+10)。

---

## 🧠 COGNITIVE PROCESS (思维链 - 必须严格按此步骤思考)

**关键逻辑（必读）：**
不要直接套用风格滤镜！你必须先观察【用户图】的底子。我看不到直方图，所以你必须通过视觉预估。

### 第一步：基础正常化 (Step 1: Normalization / Gap Analysis) - 这一步最关键！
**对比两张图的基础光影差异。**

1.  **曝光分析**：【用户图】相比【参考图】是偏暗还是偏亮？（例如：如果用户图有明显的窗框遮挡和暗部，是否需要大幅度提高曝光和阴影？）
2.  **反差/去雾**：【用户图】看起来有点灰/雾蒙蒙，是否需要由“去朦胧 (Dehaze)”来修复？
3.  **正常化目标**：请构思一组让【用户图】在亮度及清晰度上接近【参考图】的“基础面板”数值（例如：曝光、对比度、阴影、黑色色阶）。

### 第二步：风格注入 (Step 2: Stylization)
**在画面亮度一致后，再进行色彩风格模仿。**

1.  **白平衡修正**：参考图是冷调还是暖调？用户图当前色温如何？
2.  **色彩校准 (Calibration)**：这是模仿日系/胶片感的关键。请指定红/绿/蓝三原色通道的色相(Hue)和饱和度(Sat)偏移量。
3.  **颜色分级 (Color Grading)**：指定高光和阴影的色轮方向（色相/饱和度）。
4.  **HSL / 混色器**：针对画面中主要颜色（红/橙/黄/绿/蓝）的具体调整。
    *   **肤色**：通常橙色明度提亮，饱和度微降。
    *   **植被**：日系通常偏青黄，降低绿色饱和度。
    *   **天空**：日系通常偏青蓝，降低蓝色饱和度，提高明度。
    *   **⚠️⚠️⚠️ 关键要求（必须遵守）**：
        - **HSL 调整必须至少包含 3-5 个有实际调整的颜色通道**（hue、saturation、luminance 至少有一个不为 0），**绝对不能全部为 0**！
        - **每个颜色通道的 `note` 字段必须填写调整原因**（中文，如 "天空向青色偏移，增加通透感"、"植被去黄，更翠绿"）。
        - **如果某个颜色通道不需要调整，可以设为 0，但至少要有 3-5 个颜色通道有非零调整**。
        - **⚠️⚠️⚠️ 核心色彩保护（最高优先级）**：
          * **如果 Part 1 识别出蓝色为核心色彩**：
            - `blue` saturation **绝对禁止低于 -15**（即使参考图是低饱和风格）
            - `blue` luminance 可以提升（+20~+40），但必须配合保持饱和度
            - `aqua` saturation **绝对禁止低于 -10**
          * **如果 Part 1 识别出其他核心色彩**：
            - 对应通道的 saturation **绝对禁止低于 -20**
        - **示例**：如果参考图是日系风格，通常需要调整：
          * `blue`: hue -10~-20（向青色偏移），**saturation -10~-15（⚠️不能低于 -15！）**，luminance +20~+40（提高明度）
          * `green`: hue +10~+25（向黄色偏移），saturation -10~-30（降低饱和度），luminance +20~+40（提高明度）
          * `yellow`: hue -10~-15（向绿色偏移），saturation -10~-20（降低饱和度），luminance +10~+20（提高明度）
          * `orange`: saturation -5~-15（降低饱和度，保护肤色），luminance +5~+15（提高明度）
        - **禁止输出所有颜色通道都为 0 的情况**！如果所有颜色都是 0，说明你没有进行 HSL 调整，这是错误的。

5.  **局部调整 (Local Adjustments)**：如果参考图和用户图在特定区域有明显差异，需要创建局部调整蒙版。
    *   **何时需要局部调整**：
        - 参考图天空较暗，但用户图天空较亮 → 创建天空渐变蒙版，压暗天空
        - 参考图前景较暗，但用户图前景较亮 → 创建径向蒙版，压暗前景
        - 参考图特定颜色区域需要调整 → 创建颜色范围蒙版
    *   **如果不需要局部调整**：`local_adjustments` 字段应设为空数组 `[]`
    *   **如果需要局部调整**：每个蒙版必须包含 `type`（类型：gradient/radial/color_range/luminosity_range）、`name`（名称）、`description`（描述）、`area`（区域坐标，0-100%）、`adjustments`（调整参数）

### 第三步：最终配方汇总 (Step 3: Final Recipe)
请将上述思考结果转化为 JSON 参数。

### ⚠️ 元素调色手册 (Element Grading Manual - 参考)
*   **天空 (Sky)**：
    *   日系"淡、透、亮"：Blue Saturation -20~-40, Luminance +20~+40, Hue +5~+15 (微青)。
    *   欧美"深、蓝、暗"：Blue Saturation +10~+20, Luminance -20~-40。
*   **植被 (Vegetation)**：
    *   日系"清新、翠绿"：Green Hue +10~+25 (偏青!), Luminance +20~+40, Saturation -10~-30。
    *   森系"墨绿、深沉"：Green Hue +5~+10 (微青), Luminance -20, Saturation -30。
*   **通透感**：
    *   **⚠️ 去雾 (Dehaze) 是关键**：如果原图灰蒙蒙，必须用 **正值** Dehaze +15~+40 去除灰雾！
    *   **⚠️ Dehaze 正值 = 去雾增透，负值 = 加雾变灰**，不要搞反！
    *   Blacks +10~+30 提升暗部细节，避免死黑。
    *   Shadows +20~+50 提亮阴影，增加空气感。

### Step 4: 虚拟审图与自我批判 (Virtual Simulation & Critique)
**在输出参数前，请闭上眼睛，想象如果你应用了上述参数，画面会变成什么样？**
*   **审美检查**：好不好看？有没有偏色？
*   **死黑检查**：暗部是不是死黑一团？如果是，**立刻提亮阴影 (Shadows+)**！
*   **脏感检查**：去朦胧 (Dehaze) 是不是加多了？
*   **⚠️ 对比度检查**：
    - 对比度建议范围：**-15 ~ +15**
    - 日系/胶片风格：建议 **-10 ~ +5**
    - 电影/欧美风格：建议 **+5 ~ +15**
    - **严禁超过 ±30**，但不要太保守！
*   **🚨🚨🚨 防灰检查（最最最重要！！！）**：
    - ❌ 画面是否发灰/雾蒙蒙？如果是，**立刻增加 Dehaze +15~+40**！
    - ❌ 暗部是否发闷？如果是，**立刻提亮 Shadows +30~+60**！
    - ❌ 颜色是否寡淡？如果是，**立刻增加 Vibrance +15~+30**！
*   **参数幅度检查**：HSL 可以大胆给 +/- 40 以上，Shadows/Blacks 可以给 +/- 60，Dehaze 可以给 +/- 40！

### Step 6: 最终参数生成 (Final Output)
*   只有通过了 Step 5 的检查，才将参数填入 JSON。

---

## ⚠️ 绝对禁忌 (CRITICAL WARNINGS)

1.  **严禁死黑 (NO CRUSHED BLACKS)**：
    *   除非是剪影风格，否则**绝不允许**把暗部压成纯黑。
    *   日系/胶片风格必须有**通透的暗部**（Shadows +30~+60, Blacks +10~+30）。

2.  **慎用增强反差工具 - 但也不要太保守导致画面发灰**：
    *   **⚠️ 对比度 (Contrast)**：
        - 建议范围：**-15 ~ +15**，日系风格建议 **-5 ~ +5**，电影风格建议 **+5 ~ +15**。
        - **严禁超过 ±30**，这会严重破坏画面！
    *   **⚠️⚠️⚠️ 去朦胧 (Dehaze) - 防止发灰的关键**：
        - **如果原图灰蒙蒙/有雾气**：必须用 **正值** Dehaze +15~+40 去雾！
        - **日系空气感**：不是靠负去雾实现的！是靠 Shadows 提亮 + 低对比度 + 偏冷色温实现的。
        - **⚠️ Dehaze 正值 = 去雾增透，负值 = 加雾变灰**！
        - **严禁盲目使用负去雾**，这会让画面更灰更脏！
    *   **清晰度 (Clarity)**：人像/日系风格给**负值** (-10 ~ -20) 以柔化皮肤。风景可给正值 +5~+15。

3.  **肤色保护 (Skin Tone Protection)**：
    *   无论怎么调色，**绝不能让肤色变绿、变紫或死灰**。
    *   橙色通道 (Orange HSL) 必须小心处理。

4.  **美学优先 (Aesthetics First)**：
    *   如果"还原参考图"会导致用户图变丑（如：参考图是夜景，用户图是白天，强行压暗会很怪），请优先保证**用户图好看**，保留参考图的"色调倾向"即可，不要强行匹配亮度。

5.  **🚨🚨🚨 防止发灰 (ANTI-GREY PROTOCOL) - 最重要！**：
    *   **⚠️ 灰蒙蒙的画面是最大的失败！** 以下情况必须警惕：
        - 原图透过玻璃拍摄 → 必须 Dehaze +20~+40
        - 原图有雾气/阴天 → 必须 Dehaze +15~+35
        - 原图整体偏暗 → 必须 Exposure +0.5~+1.5, Shadows +30~+60
    *   **⚠️ 日系风格 ≠ 灰蒙蒙**：
        - 日系是"清透、干净、空气感"，不是"灰、脏、雾蒙蒙"！
        - 日系通透感来自：Shadows +30~+60, Whites +20~+40, 适当正值 Dehaze
    *   **⚠️ 宁可鲜艳一点，也不要发灰！**
        - Vibrance +15~+30, Saturation +5~+15 是安全的
        - HSL 饱和度可以大胆给 +20~+40

---

## ⚠️ 重要：Phase 1 提取字段 (phase_1_extraction)
**必须**在 JSON 输出的 `phase_1_extraction` 对象中填写以下三个字段：
1. **master_style_recap**: 确认识别到的流派（例如："日系冬日极简 / 高调雪景风格"）
2. **style_summary_recap**: 简要回顾核心指导思想。
3. **key_adjustment_strategy**: 总结三大关键调整动作（基于上述 Step 4 的差异化补齐策略）。

## ⚠️⚠️⚠️ 关键：HSL 混色器字段要求（必须严格遵守）
在 `lightroom_workflow.hsl` 中，**必须**包含至少 3-5 个有实际调整的颜色通道：

1. **每个颜色通道**（red/orange/yellow/green/aqua/blue/purple/magenta）必须包含：
   - `hue`: 色相偏移值（数字，如 `+10`、`-15`，或字符串如 `"+10"`、`"-15"`）
   - `saturation`: 饱和度调整值（数字或字符串）
   - `luminance`: 明度调整值（数字或字符串）
   - `note`: **必须填写**调整原因（中文，如 "天空向青色偏移，增加通透感"、"植被去黄，更翠绿"）

2. **⚠️⚠️⚠️ 绝对禁止**：所有颜色通道都为 0 的情况！**至少 3-5 个颜色通道必须有非零调整**（hue、saturation、luminance 至少有一个不为 0）。

3. **常见调整示例**（根据参考图风格选择）：
   - **日系风格**：通常需要调整 `blue`（向青色偏移，降低饱和度，提高明度）、`green`（向黄色偏移，降低饱和度，提高明度）、`yellow`（向绿色偏移，降低饱和度，提高明度）
   - **欧美风格**：通常需要调整 `blue`（保持蓝色，增加饱和度，降低明度）、`green`（保持绿色，增加饱和度）
   - **胶片风格**：通常需要调整 `blue`（向青色偏移，大幅增加饱和度）、`green`（向青色偏移，增加饱和度）

4. **palette_strip_description**: 在 `simulated_histogram.palette_strip_description` 中，**必须**用中文说明 HSL 混色器调整面板的含义，例如："HSL条带显示:蓝色向青色大幅偏移(hue -15, saturation -30, luminance +25),绿色向黄色微偏且明度极高(hue +20, saturation -25, luminance +30)。"

## ⚠️ 重要：局部调整字段要求
在 `lightroom_workflow.local_adjustments` 中：
1. **如果不需要局部调整**：必须设为空数组 `[]`，并在 `note` 中说明原因（如 "无需局部调整蒙版"）。
2. **如果需要局部调整**：每个蒙版必须包含：
   - `type`: 蒙版类型（"gradient" 渐变、"radial" 径向、"color_range" 颜色范围、"luminosity_range" 亮度范围）
   - `name`: 蒙版名称（中文，如 "天空渐变"、"前景压暗"）
   - `description`: 蒙版描述（中文，说明调整目的）
   - `area`: 区域坐标对象（x, y, width, height，均为 0-100 的百分比）
   - `adjustments`: 调整参数对象（如 `{"exposure": "-0.5", "saturation": "+10"}`）

## ⚠️ 重要：simulated_histogram 字段要求
在 `lightroom_workflow.simulated_histogram` 中，**必须**包含以下字段：
1. **description**: **【虚拟审图报告】**。请在这里写下你的 Step 5 思考过程。例如：“经过模拟，我发现原计划对比度过高导致暗部死黑，因此我将对比度调整为 -30，并大幅提亮了阴影。现在的画面保留了参考图的青冷色调，但暗部细节丰富，肤色保持自然，整体通透感强。”
2. **rgb_values**: RGB 平均值对象。
3. **histogram_data**: **必需字段**，包含完整的直方图数据对象 (r, g, b, l 四个数组，每组至少 20 个 0-100 的数值)。反映你调整后的理想直方图形态。
4. **stats_grid_description**: 中文说明统计网格的含义。
5. **palette_strip_description**: 中文说明 HSL 混色器调整面板的含义（**必须**包含具体调整的颜色和原因）。

## Output Format (JSON Structure)
只输出 JSON。填充下方模板，所有解释字段必须用 **简体中文**。

```json
""" + PART2_TEMPLATE + """
```
"""
        # 【修复说明】使用字符串拼接而不是 f-string 变量插值，避免 PART2_TEMPLATE 中的 JSON 格式数据被解析为格式化占位符
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
""" + DIAGNOSIS_TEMPLATE + """
```
"""
        # 【修复说明】使用字符串拼接而不是 f-string 变量插值，避免 DIAGNOSIS_TEMPLATE 中的 JSON 格式数据被解析为格式化占位符
        return prompt

    @staticmethod
    def get_iteration_prompt(
        user_feedback: str,
        reference_image_description: str,
        previous_parameters: Dict[str, Any],
        iteration_number: int,
        color_palette: Optional[List[str]] = None,
    ) -> str:
        """
        迭代调色反馈 Prompt - 用于用户反馈后重新生成调色方案
        
        核心策略：
        1. 强制数据化描述：要求 Gemini 输出具体的色彩倾向（如 Hue 值）
        2. 对比分析：对比当前预览图与参考图的差异
        3. 修正建议：给出具体的参数修正方案
        4. 肤色保护：优先保证肤色自然
        
        Args:
            user_feedback: 用户的反馈文本（如"阴影里的青色太多了"）
            reference_image_description: 参考图的描述（来自 Part1）
            previous_parameters: 上一次的调色参数
            iteration_number: 迭代序号
            color_palette: 从参考图提取的色卡（可选，5色）
        
        Returns:
            格式化的 Prompt 字符串
        """
        
        # 构建色卡参考段落
        color_palette_section = ""
        if color_palette and len(color_palette) > 0:
            palette_text = ", ".join(color_palette[:5])
            color_palette_section = f"""
## 📎 参考图色卡 (Color Palette from Reference)
以下是从参考图提取的关键色卡，请确保 HSL 调整方案能还原这些关键色：
**{palette_text}**

"""
        
        # 构建上一次参数摘要
        prev_params_summary = json.dumps(previous_parameters, ensure_ascii=False, indent=2) if previous_parameters else "{}"
        
        prompt = f"""# Role: 专业电影调色师 (Professional Colorist) - 迭代修正模式

## Profile
你是一位拥有20年经验的专业调色师，正在与用户进行迭代调色。这是第 **{iteration_number}** 次迭代。

## 🖼️ 你将收到的图片 (Images You Will Receive)
**请仔细观察以下两张图片进行对比分析：**

1. **【图片1：参考图 + 色卡】**
   - 这是用户想要模仿的目标风格图
   - 图片底部附有从参考图提取的 5 色主色卡
   - **请特别关注色卡中的颜色，确保调色方案能还原这些关键色**

2. **【图片2：当前预览图】**
   - 这是用户按照你上一次建议调整后的效果
   - **请直接用眼睛对比两张图片的差异，而不仅仅依赖文字描述**

---

## 任务 (Task)
用户已按照你之前的建议调整了图片，但仍然不满意。

**⚠️ 核心原则：你是专业调色师，必须自主判断！**
1. **首先**：自己观察对比参考图和当前预览图的差距
2. **然后**：基于专业判断，确定现阶段还缺什么
3. **最后**：参考用户反馈（用户反馈只是参考，不是命令！）
4. **输出**：综合专业分析 + 用户意见，给出平衡的修正方案

## 用户反馈 (User Feedback) - ⚠️仅供参考，不要盲目照搬！
**"{user_feedback}"**

**【重要提醒】**：
- 用户反馈是主观感受，可能不够精确（如"偏冷一点"不代表要大幅降低色温）
- 你必须自己判断：与参考图相比，到底需要调整多少？
- 如果用户反馈与你的专业判断冲突，以参考图为准！

{color_palette_section}
## 上一次调色参数 (Previous Parameters)
```json
{prev_params_summary}
```

## 参考图风格描述 (Reference Style Description)
{reference_image_description}

---

## 🔍 分析步骤 (Analysis Steps)

### Step 1: 专业视觉对比 (Visual Gap Analysis - 正常化视角)
**请用你专业调色师的眼睛仔细观察两张图片，优先分析基础光影和色温差异：**

1.  **正常化差距 (Normalization Gap)**：
    *   **曝光/亮度**：当前预览图是否比参考图更暗或更亮？（如：参考图整体较亮，但预览图阴影死黑，需要提亮阴影）
    *   **反差/雾度**：当前预览图是否比参考图更“灰”或更“透”？（如：参考图通透，预览图发灰，需要负值去朦胧 + 提升黑点）
    *   **基础色温**：当前预览图的基础白平衡是否准确？（如：参考图是清冷调，预览图偏黄暖，需要大幅降低色温）

2.  **风格化差距 (Stylization Gap)**：
    *   **色调分离**：高光/阴影的色彩倾向是否一致？（如：参考图阴影是 Teal 青色，预览图阴影是纯绿色）
    *   **关键色还原**：色卡中的关键颜色（如天空蓝、植被绿、肤色）是否已还原？还有多大差距？

### Step 2: 你的专业诊断 (Professional Diagnosis)
**基于 Step 1 的观察，制定分步调整策略：**

*   **优先级 1：基础正常化**（如果曝光/白平衡不对，先修这个！）：
    *   是否需要先调整 Exposure, Contrast, Dehaze, Temp/Tint？
*   **优先级 2：风格注入**（在基础对齐后，再修风格）：
    *   是否需要调整 Color Grading (Shadows/Highlights Hue)？
    *   是否需要调整 HSL (特定颜色的 Hue/Sat/Lum)？

### Step 3: 参考用户反馈 (User Feedback Check)
*   用户说了什么？
*   用户的描述与你的专业判断是否一致？
*   **如果用户说"偏冷一点"，这只是方向，不代表要大幅调整！你要自己判断调多少！**
*   **如果用户反馈与参考图分析冲突，以参考图为准！**

### Step 3: 色调分离量化分析（最关键！）
请从以下维度进行**精确量化对比**（**必须给出 Hue 角度**）：

**1. 高光 (Highlights) RGB/Hue 倾向分析**：
*   **参考图高光**：偏什么色？给出 Hue 角度（如：偏暖黄 Hue 40-60，偏冷蓝 Hue 200-220，偏青 Hue 170-190）
*   **当前预览图高光**：偏什么色？给出 Hue 角度
*   **差距**：差多少度？需要往哪个方向调整？

**2. 中间调 (Midtones) RGB/Hue 倾向分析**：
*   **参考图中间调**：偏什么色？给出 Hue 角度
*   **当前预览图中间调**：偏什么色？给出 Hue 角度
*   **差距**：差多少度？

**3. 阴影 (Shadows) RGB/Hue 倾向分析**：
*   **参考图阴影**：偏什么色？（如：偏 Teal 青色 Hue 180，偏 Green 绿色 Hue 120，偏墨绿 Hue 150）
*   **当前预览图阴影**：偏什么色？给出 Hue 角度
*   **差距**：差多少度？需要通过颜色分级 Shadows Hue 调整多少？

**⚠️ 常见 Hue 角度参考**：
- 红色: 0° | 橙色: 30° | 黄色: 60° | 黄绿: 90° | 绿色: 120° | 青绿: 150°
- 青色(Teal): 180° | 天蓝: 200° | 蓝色: 240° | 紫色: 270° | 洋红: 300° | 玫红: 330°

### Step 4: 摄影元素颜色分析 (Element Grading - 参考手册)
**参考以下标准，检查特定元素的 HSL 设置是否合理：**

**1. 天空 (Sky)**：
*   **参考图天空**：是“淡透亮”（日系）还是“深蓝暗”（欧美）？
*   **调整建议**：
    *   日系：Blue Sat -20~-40, Lum +20~+40, Hue +5~+15 (微青)。
    *   欧美：Blue Sat +10~+20, Lum -20~-40。

**2. 植被 (Vegetation)**：
*   **参考图植被**：是“清新翠绿”（日系）还是“墨绿深沉”（森系）？
*   **调整建议**：
    *   日系：Green Hue +10~+25 (偏黄), Lum +20~+40, Sat -10~-30。
    *   森系：Green Hue +5~+10 (微青), Lum -20, Sat -30。

**3. 肤色（如有）**：
*   当前肤色是否自然？如果偏绿/偏紫，优先修正 Orange/Red 通道。

### Step 5: 基于分析生成修正方案
**⚠️ 重要：你必须基于 Step 1 的差距分析来生成参数！**

你已知用户之前应用的所有参数（见"上一次调色参数"）。现在请**在之前参数的基础上进行增量调整**：

**调整逻辑 (Priority Order)**：
1.  **基础面板 (Basic)**：优先修正曝光、白平衡、去朦胧差距。
2.  **颜色分级 (Color Grading)**：基于 Step 1 的色调分离分析，微调高光/阴影的 Hue。
3.  **HSL 混色器**：基于 Step 4 的元素分析，调整特定颜色通道。
4.  **曲线**：微调对比度或褪色感。

请给出具体的参数修正建议（**必须是在上次参数基础上的增量调整**）：
*   **参数名称**：上次值 + 本次调整 = 新值 | 修正原因

---

## ⚠️ 重要原则

0.  **⚠️⚠️⚠️ 色温方向（最容易出错！）**：
    *   **正值 (+) = 偏暖 (黄/橙色调)** - 例如 `temperature: +500` 让画面变暖
    *   **负值 (-) = 偏冷 (蓝/青色调)** - 例如 `temperature: -500` 让画面变冷
    *   **日系/胶片风格通常需要负值偏冷！** 如果 reason 说"需要偏冷"，value 必须是负数！
    *   **绝对禁止**：reason 说"偏冷"但 value 给正数，或 reason 说"偏暖"但 value 给负数！

1.  **以图为准**：
    *   **基于实际图片观察进行分析**，而不是猜测。
    *   如果色卡显示参考图有某种颜色，但预览图中看不到，必须指出。

2.  **强制数据化**：
    *   不要使用模糊描述（如"偏暖一点"）。
    *   必须给出具体的数值（如"色温 -500K = 偏冷"、"Blue Hue +15"）。

3.  **肤色优先**：
    *   如果画面中有人物，**优先保证肤色的自然和通透**。
    *   在此基础上模拟环境色调。

4.  **⚠️⚠️⚠️ 渐进式调整（严格限制！防止抖动！）**：
    
    **【单次迭代最大调整幅度表】绝不能超过！**
    | 参数 | 单次最大调整量 | 说明 |
    |------|----------------|------|
    | **色温 (Temperature)** | **±300K** | 用户说"偏冷"只调 -200K，不是 -1500K！ |
    | **色调 (Tint)** | **±10** | 小幅微调 |
    | **曝光 (Exposure)** | **±0.3 EV** | 微调亮度 |
    | **对比度 (Contrast)** | **±5** | 绝对不能超过！ |
    | **高光/阴影** | **±15** | 适度调整 |
    | **白色/黑色** | **±15** | 适度调整 |
    | **HSL 各通道** | **H ±15, S ±20, L ±15** | 渐进微调 |
    | **颜色分级 Hue** | **±20°** | 小步调整色相 |
    | **颜色分级 Saturation** | **±10** | 饱和度微调 |
    
    **【抖动警告】**：
    - 如果上次调了 +200K，这次发现偏暖了，不要直接改成 -500K！
    - 正确做法：在 +200K 基础上减少 -300K = -100K（累积值）
    - **避免来回震荡！** 一次调整不够？下次再微调！
    
5.  **色卡还原**：
    *   如果参考图色卡中有某个关键色，调整方案必须能让预览图呈现相似的颜色。

6.  **用户反馈只是参考**：
    *   用户说"偏冷一点"不代表要调很多，你要自己判断差距！
    *   用户的主观感受可能不准确，以参考图为准！
    *   如果用户反馈与参考图分析结果冲突，优先参考图！

---

## Output Format (JSON)

**⚠️ 重要：JSON 格式要求**
- 所有数字类型的相对变化值（如 HSL 调整值、参数增量）如果是正数，必须使用字符串格式，如 `"+10"`、`"+0.5"`
- JSON 标准不支持数字前导 '+' 号，所以正数相对变化必须写成字符串 `"+10"` 而不是数字 `+10`
- 负数和零可以是数字格式，如 `-10`、`0`
- 例如：`"l": "+10"`（正数，字符串）或 `"l": -10`（负数，数字）或 `"l": 0`（零，数字）

```json
{{
  "iteration_analysis": {{
    "professional_diagnosis": {{
      "_note": "【最重要】你自己的专业判断，不受用户反馈影响",
      "visual_observation": {{
        "normalization_gap": "STRING: 基础光影差距（如'预览图比参考图暗，且偏灰'）",
        "stylization_gap": "STRING: 风格色彩差距（如'预览图阴影偏绿，而参考图阴影是 Teal 青色'）",
        "temperature_diff": "STRING: 例如'当前预览图比参考图偏暖约 200K，需要微调 -200K'",
        "color_palette_match": "STRING: 例如'色卡 5 色中已还原 3 色，青色和暖黄色还差'"
      }},
      "top3_priorities": [
        "STRING: 优先级1（如：'阴影色调需要从绿色往青色偏移 +30°'）",
        "STRING: 优先级2",
        "STRING: 优先级3"
      ],
      "initial_adjustment_plan": "STRING: 你的初步调整建议（不考虑用户反馈）"
    }},
    "user_feedback_analysis": {{
      "_note": "分析用户反馈，但用户反馈只是参考！",
      "user_said": "STRING: 用户原话",
      "user_direction": "STRING: 用户想要的方向（如'偏冷'）",
      "professional_interpretation": "STRING: 用户说'偏冷一点'，但根据参考图分析，实际只需调整 -200K，而不是大幅调整",
      "conflict_with_reference": "STRING: 用户反馈是否与参考图分析冲突？如冲突以谁为准？"
    }},
    "final_decision": {{
      "_note": "综合专业分析 + 用户反馈的最终决策",
      "adjustment_strategy": "STRING: 最终调整策略说明",
      "key_adjustments": ["STRING: 调整1（含数值）", "STRING: 调整2"]
    }},
    "key_issues_identified": ["STRING: 问题1", "STRING: 问题2"],
    "tonal_separation_analysis": {{
      "highlights": {{
        "reference_hue": 45,
        "current_hue": 30,
        "hue_gap": 15,
        "adjustment_needed": "STRING: 例如'需要通过 Color Grading Highlights Hue 往黄色方向调整 +15'"
      }},
      "shadows": {{
        "reference_hue": 180,
        "current_hue": 120,
        "hue_gap": 60,
        "adjustment_needed": "STRING: 例如'需要通过 Color Grading Shadows Hue 从 120° 往 180° 调整，即 +60'"
      }}
    }},
    "element_colors": {{
      "sky": {{
        "status": "STRING: 描述当前天空与参考图差距",
        "adjustment": "STRING: 调整建议"
      }},
      "vegetation": {{
        "status": "STRING: 描述当前植被与参考图差距",
        "adjustment": "STRING: 调整建议"
      }}
    }},
    "overall_mood": {{
      "contrast": {{ "current": "STRING", "target": "STRING" }},
      "transparency": {{ "current": "STRING", "target": "STRING" }},
      "faded_look": {{ "current": "STRING", "target": "STRING" }}
    }}
  }},
  "correction_suggestions": [
    "STRING: 建议1（基于上方 tonal_separation_analysis 的分析结果，例如：'阴影偏绿(120°)需往青色(180°)调整，颜色分级阴影 Hue +60'）",
    "STRING: 建议2（基于 element_colors 分析，例如：'植被过于饱和，Green S -20'）",
    "STRING: 建议3"
  ],
  "new_parameters": {{
    "_note": "【重要】以下参数必须基于上方 tonal_separation_analysis 和 element_colors 的分析结果生成！这是累积调整，在上次参数基础上增量修改。",
    "white_balance": {{
      "temperature": {{ "value": "+0", "change": "STRING: 例如'上次 5500K + 本次 -300K = 5200K'", "reason": "STRING: ⚠️正值=偏暖(黄)，负值=偏冷(蓝)。若需偏冷，必须给负值！" }},
      "tint": {{ "value": "+0", "change": "STRING", "reason": "STRING: 正值=偏洋红，负值=偏绿" }}
    }},
    "basic_panel": {{
      "exposure": {{ "val": "+0", "change": "STRING", "reason": "STRING" }},
      "contrast": {{ "val": "+0", "change": "STRING", "reason": "STRING: 对比度变化必须在 -10~+10 范围内" }},
      "highlights": {{ "val": "+0", "change": "STRING", "reason": "STRING" }},
      "shadows": {{ "val": "+0", "change": "STRING", "reason": "STRING" }},
      "whites": {{ "val": "+0", "change": "STRING", "reason": "STRING" }},
      "blacks": {{ "val": "+0", "change": "STRING", "reason": "STRING" }},
      "texture": {{ "val": "+0", "change": "STRING", "reason": "STRING" }},
      "clarity": {{ "val": "+0", "change": "STRING", "reason": "STRING" }},
      "dehaze": {{ "val": "+0", "change": "STRING", "reason": "STRING" }},
      "saturation": {{ "val": "+0", "change": "STRING", "reason": "STRING" }},
      "vibrance": {{ "val": "+0", "change": "STRING", "reason": "STRING" }}
    }},
    "color_grading_wheels": {{
      "_note": "【基于 tonal_separation_analysis】高光/中间调/阴影的 Hue 必须对应上方分析的目标值！",
      "highlights": {{
        "hue": "45",
        "saturation": "15",
        "change": "STRING: 例如'上次 Hue 30 + 本次 +15 = 45，对应分析中的参考图高光 Hue 45°'",
        "reason": "STRING: 例如'参考图高光偏暖黄(45°)，当前偏橙(30°)，需要 +15'"
      }},
      "midtones": {{
        "hue": "60",
        "saturation": "10",
        "change": "STRING",
        "reason": "STRING: 基于 tonal_separation_analysis.midtones 的分析"
      }},
      "shadows": {{
        "hue": "180",
        "saturation": "20",
        "change": "STRING: 例如'上次 Hue 120 + 本次 +60 = 180，实现参考图的 Teal 阴影'",
        "reason": "STRING: 例如'参考图阴影偏 Teal 青色(180°)，当前偏绿(120°)，调整 +60'"
      }},
      "balance": "0"
    }},
    "hsl_adjustments": {{
      "_note": "【基于 element_colors 分析】Green/Yellow 参数必须对应上方植被分析的调整建议！",
      "red": {{ "h": "0", "s": "0", "l": "0", "change": "STRING", "reason": "STRING" }},
      "orange": {{ "h": "0", "s": "0", "l": "0", "change": "STRING", "reason": "STRING: 肤色相关调整" }},
      "yellow": {{
        "h": "+5",
        "s": "-10",
        "l": "+10",
        "change": "STRING: 例如'上次 H=0 + 本次 +5 = +5'",
        "reason": "STRING: 基于 element_colors.vegetation.hsl_adjustment.yellow 的分析"
      }},
      "green": {{
        "h": "-40",
        "s": "-20",
        "l": "+15",
        "change": "STRING: 例如'上次 H=0 + 本次 -40 = -40，让绿色往黄色偏移'",
        "reason": "STRING: 基于 element_colors.vegetation 分析，参考图植被偏黄绿(80°)，当前偏纯绿(120°)，需要 H -40"
      }},
      "cyan": {{ "h": "0", "s": "0", "l": "0", "change": "STRING", "reason": "STRING" }},
      "blue": {{
        "h": "-10",
        "s": "-20",
        "l": "+10",
        "change": "STRING",
        "reason": "STRING: 基于 element_colors.sky 分析"
      }},
      "purple": {{ "h": "0", "s": "0", "l": "0", "change": "STRING", "reason": "STRING" }},
      "magenta": {{ "h": "0", "s": "0", "l": "0", "change": "STRING", "reason": "STRING" }}
    }},
    "tone_curve": {{
      "rgb_points": [[0,10], [64,70], [128,128], [192,185], [255,245]],
      "change": "STRING: 例如'暗部抬起 +10 实现褪色感，亮部压 -10 保护高光'",
      "reason": "STRING: 基于 overall_mood.faded_look 分析"
    }}
  }},
  "self_critique": {{
    "expected_improvement": "STRING: 预期这次调整会带来什么改善",
    "potential_risks": "STRING: 这次调整可能带来的风险（如：肤色可能偏绿）",
    "next_iteration_hint": "STRING: 如果用户仍不满意，下一步可能需要关注什么"
  }}
}}
```

---

## 【再次强调】必须使用简体中文进行所有分析和输出
"""
        return prompt