"""
分析结果格式化服务 - 将 Gemini 输出标准化
根据开发方案第 14、23、24 节实现
使用 Pydantic Schema 进行严格验证
"""
import json
import re
from typing import Dict, Any, Optional
from loguru import logger
from ..schemas.analysis_schemas import validate_part1_response, validate_part2_response


class AnalysisFormatter:
    """分析结果格式化器"""

    PROTOCOL_VERSION = "2025-02"

    def format_part1(self, gemini_json: str, feasibility_result: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        格式化 Part1 结果
        使用 Pydantic Schema 进行严格验证
        
        Args:
            gemini_json: Gemini 返回的 JSON 字符串
            feasibility_result: 可行性评估结果（可选）
        
        Returns:
            标准化的 Part1 结构
        """
        try:
            # 解析 JSON
            raw_data = json.loads(gemini_json) if isinstance(gemini_json, str) else gemini_json

            # 提取自然语言部分（如果 Gemini 返回了混合格式）
            natural_language = raw_data.get("natural_language", "")
            if not natural_language and "professional_evaluation" in raw_data:
                # 尝试从 professional_evaluation 提取
                pe = raw_data.get("professional_evaluation", {})
                if isinstance(pe, dict):
                    natural_language = "\n".join([str(v) for v in pe.values() if isinstance(v, str)])

            # 构建标准化结构
            structured = {
                "protocolVersion": self.PROTOCOL_VERSION,
                "stage": "part1",
                "meta": {
                    "warnings": [],
                    "rawNaturalLanguage": natural_language,
                },
                "sections": {
                    "photoReview": self._format_photo_review(raw_data, feasibility_result),
                    "composition": self._format_composition(raw_data),
                    "lighting": self._format_lighting(raw_data),
                    "color": self._format_color(raw_data),
                },
            }

            # 填充可行性信息
            if feasibility_result:
                structured["sections"]["photoReview"]["feasibility"] = {
                    "conversion_feasibility": {
                        "can_transform": feasibility_result.get("feasibilityScore", 0) > 0.3,
                        "difficulty": feasibility_result.get("difficulty", "未知"),
                        "confidence": feasibility_result.get("confidence", 0),
                        "limiting_factors": feasibility_result.get("limiting_factors", []),
                        "recommendation": feasibility_result.get("explanation", ""),
                    },
                    "feasibilityDescription": feasibility_result.get("explanation", ""),
                }

            # 使用 Pydantic Schema 验证（根据开发方案第 14 节）
            try:
                validated = validate_part1_response(structured)
                # 验证并修复缺失字段
                self._validate_and_fix(validated)
                return validated
            except Exception as schema_error:
                logger.warning(f"Part1 Schema 验证失败，使用兜底逻辑: {schema_error}")
                # 验证并修复缺失字段
                self._validate_and_fix(structured)
                return structured

        except Exception as e:
            logger.error(f"Part1 格式化失败: {e}")
            return self._create_error_structure("part1", str(e))

    def format_part2(self, gemini_json: str, part1_result: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        格式化 Part2 结果
        使用 Pydantic Schema 进行严格验证
        
        Args:
            gemini_json: Gemini 返回的 JSON 字符串
            part1_result: Part1 结果（用于上下文）
        
        Returns:
            标准化的 Part2 结构
        """
        try:
            raw_data = json.loads(gemini_json) if isinstance(gemini_json, str) else gemini_json

            structured = {
                "protocolVersion": self.PROTOCOL_VERSION,
                "stage": "part2",
                "meta": {
                    "warnings": [],
                    "rawNaturalLanguage": raw_data.get("workflow_execution_summary", ""),
                },
                "sections": {
                    "lightroom": self._format_lightroom(raw_data),
                    "photoshop": self._format_photoshop(raw_data),
                    "color": self._format_color_part2(raw_data),
                },
            }

            # 使用 Pydantic Schema 验证（根据开发方案第 14 节）
            try:
                validated = validate_part2_response(structured)
                # 验证并修复缺失字段
                self._validate_and_fix(validated)
                return validated
            except Exception as schema_error:
                logger.warning(f"Part2 Schema 验证失败，使用兜底逻辑: {schema_error}")
                # 验证并修复缺失字段
                self._validate_and_fix(structured)
                return structured

        except Exception as e:
            logger.error(f"Part2 格式化失败: {e}")
            return self._create_error_structure("part2", str(e))

    def _format_photo_review(self, raw: Dict[str, Any], feasibility: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """格式化照片点评"""
        pe = raw.get("professional_evaluation", {})
        if isinstance(pe, str):
            # 如果是字符串，尝试解析
            pe = {"summary": pe}

        return {
            "naturalLanguage": {
                "summary": pe.get("visual_guidance", "") or pe.get("summary", ""),
                "highlights": pe.get("strengths", ""),
                "technique": pe.get("equipment_analysis", ""),
                "comparison": pe.get("comparison", ""),
            },
            "structured": {
                "overviewSummary": pe.get("visual_guidance", ""),
                "dimensions": {
                    "visualGuidance": {"title": "视觉引导", "referenceDescription": "", "userDescription": ""},
                    "focusExposure": {"title": "焦点与曝光", "description": pe.get("focus_exposure", "")},
                    "colorDepth": {"title": "色彩与景深", "description": pe.get("color_depth", "")},
                    "composition": {"title": "构图", "description": pe.get("composition_expression", "")},
                    "technicalDetails": {"title": "技术细节", "description": pe.get("technical_details", "")},
                    "equipment": {"title": "设备", "description": pe.get("equipment_analysis", "")},
                    "colorEmotion": {"title": "色彩与情感", "description": pe.get("color_palette", "")},
                    "advantages": {"title": "优点", "description": pe.get("strengths", "")},
                },
                "photographerStyleSummary": pe.get("summary", ""),
            },
        }

    def _format_composition(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """格式化构图分析"""
        comp = raw.get("composition", {})
        advanced_sections = comp.get("advanced_sections", [])

        # 确保有 7 段
        section_titles = [
            "画面主结构分析",
            "主体位置与视觉权重",
            "线条与方向引导",
            "空间层次与分区",
            "比例与留白",
            "视觉平衡与动势",
            "构图风格归类与改进建议",
        ]

        sections_dict = {}
        if isinstance(advanced_sections, list):
            for i, title in enumerate(section_titles):
                if i < len(advanced_sections):
                    section = advanced_sections[i]
                    if isinstance(section, dict):
                        sections_dict[title] = section.get("content", section.get("text", ""))
                    else:
                        sections_dict[title] = str(section)
                else:
                    sections_dict[title] = ""

        return {
            "naturalLanguage": {
                "framework": sections_dict.get("画面主结构分析", ""),
                "subjectWeight": sections_dict.get("主体位置与视觉权重", ""),
                "leadingLines": sections_dict.get("线条与方向引导", ""),
                "spaceLayers": sections_dict.get("空间层次与分区", ""),
                "proportion": sections_dict.get("比例与留白", ""),
                "balanceDynamics": sections_dict.get("视觉平衡与动势", ""),
            },
            "structured": {
                "advanced_sections": sections_dict,
            },
        }

    def _format_lighting(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """格式化光影参数"""
        # Part1 中 lighting 可能只有趋势描述
        return {
            "naturalLanguage": {
                "exposureControl": "",
                "toneCurve": "",
                "textureClarity": "",
            },
            "structured": {
                "basic": {
                    "exposure": {"range": "+0", "note": ""},
                    "contrast": {"range": "+0", "note": ""},
                    "highlights": {"range": "+0", "note": ""},
                    "shadows": {"range": "+0", "note": ""},
                    "whites": {"range": "+0", "note": ""},
                    "blacks": {"range": "+0", "note": ""},
                },
                "texture": {
                    "texture": {"range": "+0", "note": ""},
                    "clarity": {"range": "+0", "note": ""},
                    "dehaze": {"range": "+0", "note": ""},
                    "saturation": {"range": "+0", "note": ""},
                    "vibrance": {"range": "+0", "note": ""},
                },
            },
        }

    def _format_color(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """格式化色彩方案（Part1）"""
        return {
            "naturalLanguage": {
                "styleKey": "",
                "whiteBalance": "",
                "colorGrading": "",
                "hslAdjustments": "",
            },
            "structured": {
                "styleKey": "",
                "whiteBalance": {"temp": {"range": "+0"}, "tint": {"range": "+0"}},
                "grading": {
                    "highlights": {"hue": 0, "saturation": 0},
                    "midtones": {"hue": 0, "saturation": 0},
                    "shadows": {"hue": 0, "saturation": 0},
                    "balance": 0,
                },
                "hsl": [],
            },
        }

    def _format_lightroom(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """格式化 Lightroom 参数（Part2）"""
        lr = raw.get("lightroom", {})

        # 确保所有滑块都是字符串格式
        def ensure_string(value, default="+0"):
            if value is None:
                return default
            if isinstance(value, (int, float)):
                sign = "+" if value >= 0 else ""
                return f"{sign}{value}"
            return str(value)

        panels = raw.get("lightroom_panels", [])
        if not panels:
            # 如果没有 panels，从 lightroom 对象构建
            panels = [
                {
                    "title": "基础调整",
                    "description": "基础曝光和对比度调整",
                    "params": [
                        {"name": "exposure", "value": ensure_string(lr.get("exposure"))},
                        {"name": "contrast", "value": ensure_string(lr.get("contrast"))},
                        {"name": "highlights", "value": ensure_string(lr.get("highlights"))},
                        {"name": "shadows", "value": ensure_string(lr.get("shadows"))},
                    ],
                }
            ]

        return {
            "naturalLanguage": {
                "panelSummary": "",
                "localAdjustments": "",
            },
            "structured": {
                "panels": panels,
                "toneCurve": lr.get("tone_curve", [[0, 0], [64, 64], [128, 128], [192, 192], [255, 255]]),
                "rgbCurves": lr.get("rgb_curves", {}),
                "colorGrading": lr.get("color_grading", {}),
                "localAdjustments": raw.get("lightroom_local_adjustments", []),
            },
        }

    def _format_photoshop(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """格式化 Photoshop 步骤（Part2）"""
        ps = raw.get("photoshop", {})
        steps = ps.get("steps", [])

        return {
            "naturalLanguage": {
                "cameraRaw": "",
                "colorGrading": "",
                "gradientMap": "",
                "localAdjustments": "",
                "finalPolish": "",
            },
            "structured": {
                "steps": steps,
            },
        }

    def _format_color_part2(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """格式化色彩方案（Part2）"""
        lr = raw.get("lightroom", {})
        color_mapping = raw.get("color_mapping", {})

        hsl_list = []
        hsl_raw = lr.get("HSL", {})
        color_names = ["red", "orange", "yellow", "green", "aqua", "blue", "purple", "magenta"]
        color_names_cn = ["红", "橙", "黄", "绿", "青", "蓝", "紫", "洋红"]

        for i, (en, cn) in enumerate(zip(color_names, color_names_cn)):
            hsl_data = hsl_raw.get(en, {})
            hsl_list.append({
                "color": cn,
                "hue": str(hsl_data.get("hue", 0)),
                "saturation": str(hsl_data.get("saturation", 0)),
                "luminance": str(hsl_data.get("luminance", 0)),
            })

        return {
            "naturalLanguage": {
                "styleKey": color_mapping.get("suggested_LUT", ""),
                "whiteBalance": "",
                "colorGrading": "",
                "hslAdjustments": "",
            },
            "structured": {
                "styleKey": color_mapping.get("suggested_LUT", ""),
                "whiteBalance": {
                    "temp": {"range": ensure_string(lr.get("temperature", "+0"))},
                    "tint": {"range": ensure_string(lr.get("tint", "+0"))},
                },
                "grading": lr.get("color_grading", {}),
                "hsl": hsl_list,
            },
        }

    def _validate_and_fix(self, structured: Dict[str, Any]):
        """验证并修复缺失字段"""
        warnings = structured.get("meta", {}).get("warnings", [])

        # 检查构图七段
        comp = structured.get("sections", {}).get("composition", {})
        advanced = comp.get("structured", {}).get("advanced_sections", {})
        if not advanced or len(advanced) < 7:
            warnings.append("构图七段不完整")
            # 补齐缺失段落
            section_titles = [
                "画面主结构分析",
                "主体位置与视觉权重",
                "线条与方向引导",
                "空间层次与分区",
                "比例与留白",
                "视觉平衡与动势",
                "构图风格归类与改进建议",
            ]
            for title in section_titles:
                if title not in advanced:
                    advanced[title] = ""

        structured["meta"]["warnings"] = warnings

    def _create_error_structure(self, stage: str, error_msg: str) -> Dict[str, Any]:
        """创建错误结构"""
        return {
            "protocolVersion": self.PROTOCOL_VERSION,
            "stage": stage,
            "meta": {
                "warnings": [f"格式化失败: {error_msg}"],
                "rawNaturalLanguage": "",
            },
            "sections": {},
        }


def ensure_string(value, default="+0"):
    """确保值为字符串格式"""
    if value is None:
        return default
    if isinstance(value, (int, float)):
        sign = "+" if value >= 0 else ""
        return f"{sign}{value}"
    return str(value)

