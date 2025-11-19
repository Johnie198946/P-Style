"""
分析结果格式化服务 - 将 Gemini 输出标准化
根据开发方案第 14、23、24 节实现
使用 Pydantic Schema 进行严格验证
"""
import json
import re
from typing import Dict, Any, Optional, Union, List
from loguru import logger
from ..schemas.analysis_schemas import validate_part1_response, validate_part2_response


class AnalysisFormatter:
    """分析结果格式化器"""

    PROTOCOL_VERSION = "2025-02"

    def format_part1(self, gemini_json: Union[str, Dict[str, Any], List[Any]], feasibility_result: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        格式化 Part1 结果
        使用 Pydantic Schema 进行严格验证
        
        Args:
            gemini_json: Gemini 返回的 JSON 字符串、字典或数组（根据实际响应格式）
            feasibility_result: 可行性评估结果（可选）
        
        Returns:
            标准化的 Part1 结构
        """
        try:
            # 解析 JSON（支持字符串、字典、数组格式）
            if isinstance(gemini_json, str):
                # 如果是字符串，尝试解析为 JSON
                try:
                    raw_data = json.loads(gemini_json)
                    logger.debug(f"format_part1: 从字符串解析 JSON 成功，类型 = {type(raw_data)}")
                except json.JSONDecodeError as e:
                    logger.error(f"format_part1: JSON 解析失败: {e}")
                    # 尝试使用正则表达式提取 JSON
                    import re
                    json_match = re.search(r'\{.*\}', gemini_json, re.DOTALL)
                    if json_match:
                        raw_data = json.loads(json_match.group())
                        logger.info(f"format_part1: 使用正则表达式提取 JSON 成功")
                    else:
                        raise ValueError(f"无法解析 Gemini 返回的 JSON: {e}")
            else:
                # 如果已经是字典或数组，直接使用
                raw_data = gemini_json
                logger.debug(f"format_part1: gemini_json 已经是 {type(raw_data)} 类型，直接使用")

            # 处理 Gemini 返回数组格式的情况（根据实际响应，Gemini 可能返回数组格式）
            # 例如：[{"phase": "第一阶段基础洞察", "report": {"expert_analysis": "...", "structured_data": {...}}}]
            if isinstance(raw_data, list) and len(raw_data) > 0:
                # 如果是数组，取第一个元素
                first_item = raw_data[0]
                if isinstance(first_item, dict):
                    # 如果第一个元素有 "report" 字段，提取其中的数据
                    if "report" in first_item:
                        report = first_item["report"]
                        if isinstance(report, dict):
                            # 从 report 中提取 structured_data 和 expert_analysis
                            structured_data = report.get("structured_data", {})
                            expert_analysis = report.get("expert_analysis", "")
                            
                            # 调试日志：记录提取的数据结构
                            logger.info(f"从数组格式提取数据: structured_data keys = {list(structured_data.keys()) if isinstance(structured_data, dict) else 'not dict'}")
                            
                            # 如果 structured_data 是字典，直接使用它作为 raw_data
                            # structured_data 应该包含 professional_evaluation、composition 等字段（根据 Prompt 模板）
                            if isinstance(structured_data, dict):
                                raw_data = structured_data
                            else:
                                # 如果 structured_data 不是字典，尝试使用 report 本身或 first_item
                                logger.warning(f"structured_data 不是字典类型: {type(structured_data)}, 尝试使用 report 或 first_item")
                                raw_data = report if isinstance(report, dict) else first_item
                            
                            # 将 expert_analysis 作为 natural_language
                            natural_language = expert_analysis if isinstance(expert_analysis, str) else ""
                        else:
                            # 如果 report 不是字典，尝试直接使用 first_item
                            logger.warning(f"report 不是字典类型: {type(report)}, 使用 first_item")
                            raw_data = first_item
                            natural_language = ""
                    else:
                        # 如果第一个元素没有 "report" 字段，直接使用 first_item
                        logger.info(f"first_item 没有 report 字段，直接使用 first_item")
                        raw_data = first_item
                        natural_language = ""
                else:
                    # 如果第一个元素不是字典，使用空字典
                    logger.warning(f"first_item 不是字典类型: {type(first_item)}, 使用空字典")
                    raw_data = {}
                    natural_language = ""
            else:
                # 如果不是数组，按原逻辑处理
                logger.info(f"Gemini 返回的不是数组格式，按原逻辑处理")
                natural_language = ""
                # 重要：如果 raw_data 是字典，检查是否包含 professional_evaluation 和 composition
                # 如果包含，说明数据结构正确，直接使用
                if isinstance(raw_data, dict):
                    if "professional_evaluation" in raw_data or "composition" in raw_data:
                        logger.info(f"raw_data 包含 professional_evaluation 或 composition，数据结构正确")
                    else:
                        logger.warning(f"raw_data 不包含 professional_evaluation 或 composition，keys = {list(raw_data.keys())}")

            # 确保 raw_data 是字典类型
            if not isinstance(raw_data, dict):
                logger.warning(f"raw_data 不是字典类型: {type(raw_data)}, 使用空字典")
                raw_data = {}
            
            # 调试日志：记录最终 raw_data 的键和内容（用于诊断数据为空的问题）
            logger.info(f"最终 raw_data keys = {list(raw_data.keys()) if isinstance(raw_data, dict) else 'not dict'}")
            logger.debug(f"raw_data 包含 professional_evaluation: {'professional_evaluation' in raw_data}")
            logger.debug(f"raw_data 包含 composition: {'composition' in raw_data}")
            logger.debug(f"raw_data 包含 analysis_meta: {'analysis_meta' in raw_data}")
            
            # 重要：如果 raw_data 不包含 professional_evaluation 和 composition，但包含其他字段
            # 可能是 Gemini 返回的数据结构不同，需要尝试从其他字段提取
            # 例如：如果 raw_data 是一个空字典或只包含其他字段，需要检查是否有嵌套结构
            if not isinstance(raw_data, dict) or (not raw_data.get("professional_evaluation") and not raw_data.get("composition")):
                logger.warning(f"raw_data 不包含 professional_evaluation 或 composition，尝试查找其他可能的数据结构")
                # 尝试从 raw_data 的所有键中查找可能的数据
                if isinstance(raw_data, dict):
                    logger.info(f"raw_data 的所有键: {list(raw_data.keys())}")
                    # 如果 raw_data 是空字典，记录警告
                    if not raw_data:
                        logger.error("raw_data 是空字典！无法提取数据！")
            
            # 详细记录 professional_evaluation 的内容（如果存在）
            if "professional_evaluation" in raw_data:
                pe = raw_data.get("professional_evaluation", {})
                logger.info(f"professional_evaluation 类型 = {type(pe)}")
                if isinstance(pe, dict):
                    logger.info(f"professional_evaluation keys = {list(pe.keys())}")
                    # 记录每个字段是否有值（只记录前 50 个字符）
                    for key, value in pe.items():
                        if isinstance(value, str) and value:
                            logger.debug(f"professional_evaluation.{key} = {value[:50]}...")
                        elif value:
                            logger.debug(f"professional_evaluation.{key} = {type(value)} (非空)")
                        else:
                            logger.debug(f"professional_evaluation.{key} = empty")
                else:
                    logger.warning(f"professional_evaluation 不是字典: {type(pe)} = {pe}")
            else:
                logger.warning("raw_data 中不包含 professional_evaluation 字段！")
                # 尝试从 raw_data 的其他字段中查找
                # 注意：在遍历字典时修改字典可能导致问题，所以先收集要修改的键值对
                if isinstance(raw_data, dict):
                    found_pe = None
                    for key, value in raw_data.items():
                        if isinstance(value, dict) and "visual_guidance" in value:
                            logger.info(f"在 raw_data.{key} 中找到可能的 professional_evaluation 数据")
                            # 记录找到的数据，稍后添加
                            found_pe = value
                            break  # 找到后立即退出循环，避免继续遍历
                    # 在循环外修改字典，避免在遍历时修改
                    if found_pe is not None:
                        raw_data["professional_evaluation"] = found_pe
            
            # 详细记录 composition 的内容（如果存在）
            if "composition" in raw_data:
                comp = raw_data.get("composition", {})
                logger.info(f"composition 类型 = {type(comp)}")
                if isinstance(comp, dict):
                    logger.info(f"composition keys = {list(comp.keys())}")
                    if "advanced_sections" in comp:
                        adv_sections = comp.get("advanced_sections", [])
                        logger.info(f"composition.advanced_sections 类型 = {type(adv_sections)}, 长度 = {len(adv_sections) if isinstance(adv_sections, list) else 'not list'}")
                        if isinstance(adv_sections, list) and len(adv_sections) > 0:
                            logger.debug(f"composition.advanced_sections[0] = {adv_sections[0]}")
                else:
                    logger.warning(f"composition 不是字典: {type(comp)} = {comp}")
            else:
                logger.warning("raw_data 中不包含 composition 字段！")
                # 尝试从 raw_data 的其他字段中查找
                # 注意：在遍历字典时修改字典可能导致问题，所以先收集要修改的键值对
                if isinstance(raw_data, dict):
                    found_comp = None
                    for key, value in raw_data.items():
                        if isinstance(value, dict) and "advanced_sections" in value:
                            logger.info(f"在 raw_data.{key} 中找到可能的 composition 数据")
                            # 记录找到的数据，稍后添加
                            found_comp = value
                            break  # 找到后立即退出循环，避免继续遍历
                    # 在循环外修改字典，避免在遍历时修改
                    if found_comp is not None:
                        raw_data["composition"] = found_comp

            # 提取自然语言部分（如果 Gemini 返回了混合格式）
            if not natural_language:
                natural_language = raw_data.get("natural_language", "")
            if not natural_language and "professional_evaluation" in raw_data:
                # 尝试从 professional_evaluation 提取
                pe = raw_data.get("professional_evaluation", {})
                if isinstance(pe, dict):
                    natural_language = "\n".join([str(v) for v in pe.values() if isinstance(v, str)])

            # 构建标准化结构
            # 注意：根据开发方案第 24 节，sections.photoReview 应该包含 naturalLanguage 和 structured 两个字段
            # 但前端期望扁平化的结构，所以前端需要在 handleFeasibilityContinue 中从 structured 提取数据
            # 为每个格式化方法添加异常处理，确保单个方法失败不会导致整个流程崩溃
            try:
                photo_review_result = self._format_photo_review(raw_data, feasibility_result)
            except Exception as e:
                logger.error(f"_format_photo_review 失败: {e}", exc_info=True)
                # 返回空结构，避免整个流程失败
                photo_review_result = {
                    "naturalLanguage": {},
                    "structured": {
                        "overviewSummary": "",
                        "dimensions": {},
                        "photographerStyleSummary": "",
                    },
                }
            
            try:
                composition_result = self._format_composition(raw_data)
            except Exception as e:
                logger.error(f"_format_composition 失败: {e}", exc_info=True)
                # 返回空结构，避免整个流程失败
                composition_result = {
                    "naturalLanguage": {},
                    "structured": {
                        "advanced_sections": {
                            "画面主结构分析": "",
                            "主体位置与视觉权重": "",
                            "线条与方向引导": "",
                            "空间层次与分区": "",
                            "比例与留白": "",
                            "视觉平衡与动势": "",
                            "构图风格归类与改进建议": "",
                        },
                    },
                }
            
            try:
                lighting_result = self._format_lighting(raw_data)
            except Exception as e:
                logger.error(f"_format_lighting 失败: {e}", exc_info=True)
                # 返回默认结构，避免整个流程失败
                lighting_result = {
                    "naturalLanguage": {},
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
            
            try:
                color_result = self._format_color(raw_data)
            except Exception as e:
                logger.error(f"_format_color 失败: {e}", exc_info=True)
                # 返回默认结构，避免整个流程失败
                color_result = {
                    "naturalLanguage": {},
                    "structured": {
                        "styleKey": "",
                        "whiteBalance": {
                            "temp": {"range": "+0"},
                            "tint": {"range": "+0"},
                        },
                        "grading": {
                            "highlights": {"hue": 0, "saturation": 0},
                            "midtones": {"hue": 0, "saturation": 0},
                            "shadows": {"hue": 0, "saturation": 0},
                            "balance": 0,
                        },
                        "hsl": [],
                    },
                }
            
            # 调试日志：记录格式化后的结果
            logger.info(f"format_part1: photoReview keys = {list(photo_review_result.keys())}")
            logger.info(f"format_part1: composition keys = {list(composition_result.keys())}")
            logger.debug(f"format_part1: photoReview.structured keys = {list(photo_review_result.get('structured', {}).keys())}")
            logger.debug(f"format_part1: composition.structured keys = {list(composition_result.get('structured', {}).keys())}")
            
            structured = {
                "protocolVersion": self.PROTOCOL_VERSION,
                "stage": "part1",
                "meta": {
                    "warnings": [],
                    "rawNaturalLanguage": natural_language,
                },
                "sections": {
                    "photoReview": photo_review_result,
                    "composition": composition_result,
                    "lighting": lighting_result,
                    "color": color_result,
                },
            }

            # 填充可行性信息（根据开发方案第 23.2 节，数据来源于 feasibility_result）
            if feasibility_result:
                # 确保 feasibility_result 是字典类型
                if not isinstance(feasibility_result, dict):
                    logger.warning(f"feasibility_result 不是字典类型: {type(feasibility_result)}, 使用空字典")
                    feasibility_result = {}
                
                # 提取可行性数据（根据开发方案，feasibility_result 应该包含这些字段）
                feasibility_score = feasibility_result.get("feasibilityScore", 0)
                difficulty = feasibility_result.get("difficulty", "未知")
                confidence = feasibility_result.get("confidence", 0)
                limiting_factors = feasibility_result.get("limiting_factors", [])
                explanation = feasibility_result.get("explanation", "")
                
                # 调试日志：记录可行性数据
                logger.debug(f"填充可行性信息: feasibilityScore = {feasibility_score}, difficulty = {difficulty}, confidence = {confidence}")
                logger.debug(f"填充可行性信息: limiting_factors = {limiting_factors}, explanation = {explanation[:50] if explanation else 'empty'}...")
                
                # 计算 can_transform（根据开发方案，feasibilityScore > 0.3 表示可转换）
                can_transform = float(feasibility_score) > 0.3 if isinstance(feasibility_score, (int, float)) else False
                
                # 确保 limiting_factors 是数组或字符串
                if not isinstance(limiting_factors, (list, str)):
                    logger.warning(f"limiting_factors 类型异常: {type(limiting_factors)}, 转换为空数组")
                    limiting_factors = []
                
                structured["sections"]["photoReview"]["feasibility"] = {
                    "conversion_feasibility": {
                        "can_transform": can_transform,  # 布尔值，不是对象
                        "difficulty": str(difficulty) if difficulty else "未知",  # 字符串
                        "confidence": float(confidence) if isinstance(confidence, (int, float)) else 0.0,  # 数字
                        "limiting_factors": limiting_factors,  # 数组或字符串
                        "recommendation": str(explanation) if explanation else "",  # 字符串
                    },
                    "feasibilityDescription": str(explanation) if explanation else "",  # 字符串
                }
            else:
                # 如果没有 feasibility_result，记录警告
                logger.warning("feasibility_result 为空，不填充可行性信息")

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

            # 为每个格式化方法添加异常处理，确保单个方法失败不会导致整个流程崩溃
            try:
                lightroom_result = self._format_lightroom(raw_data)
            except Exception as e:
                logger.error(f"_format_lightroom 失败: {e}", exc_info=True)
                # 返回空结构，避免整个流程失败
                lightroom_result = {
                    "naturalLanguage": {},
                    "structured": {
                        "panels": [],
                        "toneCurve": [[0, 0], [64, 64], [128, 128], [192, 192], [255, 255]],
                        "rgbCurves": {},
                        "colorGrading": {},
                        "localAdjustments": [],
                    },
                }
            
            try:
                photoshop_result = self._format_photoshop(raw_data)
            except Exception as e:
                logger.error(f"_format_photoshop 失败: {e}", exc_info=True)
                # 返回空结构，避免整个流程失败
                photoshop_result = {
                    "naturalLanguage": {},
                    "structured": {
                        "steps": [],
                    },
                }
            
            try:
                color_result = self._format_color_part2(raw_data)
            except Exception as e:
                logger.error(f"_format_color_part2 失败: {e}", exc_info=True)
                # 返回空结构，避免整个流程失败
                color_result = {
                    "naturalLanguage": {},
                    "structured": {
                        "styleKey": "",
                        "whiteBalance": {
                            "temp": {"range": "+0"},
                            "tint": {"range": "+0"},
                        },
                        "grading": {
                            "highlights": {"hue": 0, "saturation": 0},
                            "midtones": {"hue": 0, "saturation": 0},
                            "shadows": {"hue": 0, "saturation": 0},
                            "balance": 0,
                        },
                        "hsl": [],
                    },
                }

            structured = {
                "protocolVersion": self.PROTOCOL_VERSION,
                "stage": "part2",
                "meta": {
                    "warnings": [],
                    "rawNaturalLanguage": raw_data.get("workflow_execution_summary", ""),
                },
                "sections": {
                    "lightroom": lightroom_result,
                    "photoshop": photoshop_result,
                    "color": color_result,
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
        """
        格式化照片点评
        
        Args:
            raw: Gemini 返回的原始数据（应该包含 professional_evaluation 字段）
            feasibility: 可行性评估结果（可选）
        
        Returns:
            标准化的照片点评结构
        """
        # 从 raw 中提取 professional_evaluation（根据 Prompt 模板，应该在根级别）
        pe = raw.get("professional_evaluation", {})
        
        # 调试日志：记录 professional_evaluation 的类型和内容
        logger.debug(f"_format_photo_review: professional_evaluation type = {type(pe)}")
        if isinstance(pe, dict):
            logger.debug(f"_format_photo_review: professional_evaluation keys = {list(pe.keys())}")
        else:
            logger.warning(f"_format_photo_review: professional_evaluation 不是字典类型: {type(pe)}")
        
        if isinstance(pe, str):
            # 如果是字符串，尝试解析
            pe = {"summary": pe}
        elif not isinstance(pe, dict):
            # 如果不是字典也不是字符串，使用空字典
            logger.warning(f"_format_photo_review: professional_evaluation 类型异常: {type(pe)}, 使用空字典")
            pe = {}

        # 提取各个字段（根据 Prompt 模板的字段名）
        visual_guidance = pe.get("visual_guidance", "")
        focus_exposure = pe.get("focus_exposure", "")
        color_depth = pe.get("color_depth", "")
        composition_expression = pe.get("composition_expression", "")
        technical_details = pe.get("technical_details", "")
        equipment_analysis = pe.get("equipment_analysis", "")
        color_palette = pe.get("color_palette", "")
        photo_emotion = pe.get("photo_emotion", "")
        strengths = pe.get("strengths", "")
        comparison = pe.get("comparison", "")
        summary = pe.get("summary", "")
        
        # 调试日志：记录提取的字段值（只记录前50个字符，避免日志过长）
        logger.debug(f"_format_photo_review: visual_guidance = {visual_guidance[:50] if visual_guidance else 'empty'}...")
        logger.debug(f"_format_photo_review: focus_exposure = {focus_exposure[:50] if focus_exposure else 'empty'}...")
        logger.debug(f"_format_photo_review: summary = {summary[:50] if summary else 'empty'}...")

        return {
            "naturalLanguage": {
                "summary": visual_guidance or summary,  # 优先使用 visual_guidance，如果没有则使用 summary
                "highlights": strengths,
                "technique": equipment_analysis,
                "comparison": comparison,
            },
            "structured": {
                "overviewSummary": visual_guidance or summary,  # 优先使用 visual_guidance，如果没有则使用 summary
                "dimensions": {
                    "visualGuidance": {
                        "title": "视觉引导",
                        "referenceDescription": visual_guidance,  # 使用 visual_guidance 作为描述
                        "userDescription": ""  # 如果有对比分析，可以从 comparison 中提取
                    },
                    "focusExposure": {
                        "title": "焦点与曝光",
                        "description": focus_exposure
                    },
                    "colorDepth": {
                        "title": "色彩与景深",
                        "description": color_depth
                    },
                    "composition": {
                        "title": "构图",
                        "description": composition_expression
                    },
                    "technicalDetails": {
                        "title": "技术细节",
                        "description": technical_details
                    },
                    "equipment": {
                        "title": "设备",
                        "description": equipment_analysis
                    },
                    "colorEmotion": {
                        "title": "色彩与情感",
                        "description": color_palette or photo_emotion  # 优先使用 color_palette，如果没有则使用 photo_emotion
                    },
                    "advantages": {
                        "title": "优点",
                        "description": strengths
                    },
                },
                "photographerStyleSummary": summary,  # 摄影师风格总结
            },
        }

    def _format_composition(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """
        格式化构图分析
        
        Args:
            raw: Gemini 返回的原始数据（应该包含 composition 字段）
        
        Returns:
            标准化的构图分析结构
        """
        # 从 raw 中提取 composition（根据 Prompt 模板，应该在根级别）
        comp = raw.get("composition", {})
        
        # 调试日志：记录 composition 的类型和内容
        logger.debug(f"_format_composition: composition type = {type(comp)}")
        if isinstance(comp, dict):
            logger.debug(f"_format_composition: composition keys = {list(comp.keys())}")
        else:
            logger.warning(f"_format_composition: composition 不是字典类型: {type(comp)}")
        
        if not isinstance(comp, dict):
            # 如果不是字典，使用空字典
            logger.warning(f"_format_composition: composition 类型异常: {type(comp)}, 使用空字典")
            comp = {}
        
        # 提取 advanced_sections（根据 Prompt 模板，应该是数组格式）
        advanced_sections = comp.get("advanced_sections", [])

        # 调试日志：记录 advanced_sections 的类型和长度
        logger.debug(f"_format_composition: advanced_sections type = {type(advanced_sections)}, length = {len(advanced_sections) if isinstance(advanced_sections, list) else 'not list'}")

        # 确保有 7 段（根据 Prompt 模板要求）
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
                        # 根据 Prompt 模板，section 应该有 "title" 和 "content" 字段
                        content = section.get("content", section.get("text", ""))
                        sections_dict[title] = content
                        logger.debug(f"_format_composition: section {i} ({title}) = {content[:50] if content else 'empty'}...")
                    else:
                        sections_dict[title] = str(section)
                else:
                    # 如果 advanced_sections 长度不足 7 段，填充空字符串
                    sections_dict[title] = ""
                    logger.warning(f"_format_composition: section {i} ({title}) 缺失，填充空字符串")
        else:
            # 如果 advanced_sections 不是数组，所有段都填充空字符串
            logger.warning(f"_format_composition: advanced_sections 不是数组类型: {type(advanced_sections)}, 所有段填充空字符串")
            for title in section_titles:
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

