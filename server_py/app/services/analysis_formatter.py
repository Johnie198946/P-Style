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

    def _parse_range_string(self, range_str: str) -> Dict[str, str]:
        """
        解析范围字符串，支持多种格式
        
        支持的格式：
        1. 范围+描述："+0.3～+0.6，轻微提升使高光有"柔光"" → range: "+0.45", note: "轻微提升使高光有"柔光""
        2. 范围："+0.2 ~ +0.5" → range: "+0.35", note: ""
        3. 单个值："+0.3" → range: "+0.30", note: ""
        4. 描述："微调" → range: "+0", note: "微调"
        
        Args:
            range_str: 范围字符串
            
        Returns:
            {"range": str, "note": str}
        """
        if not range_str or not isinstance(range_str, str):
            return {"range": "+0", "note": ""}
        
        range_str = range_str.strip()
        
        # 1. 尝试提取范围+描述格式（如："+0.3～+0.6，轻微提升使高光有"柔光""）
        # 使用正则表达式匹配：范围部分（可能包含～或~）和描述部分（逗号后的内容）
        range_desc_match = re.search(r'([+-]?\d+\.?\d*)\s*[～~]\s*([+-]?\d+\.?\d*)\s*[，,]\s*(.+)', range_str)
        if range_desc_match:
            val1 = float(range_desc_match.group(1))
            val2 = float(range_desc_match.group(2))
            avg = (val1 + val2) / 2
            description = range_desc_match.group(3).strip()
            return {
                "range": f"{avg:+.2f}" if avg != 0 else "+0",
                "note": description
            }
        
        # 2. 尝试提取范围格式（如："+0.2 ~ +0.5"）
        range_match = re.search(r'([+-]?\d+\.?\d*)\s*[～~]\s*([+-]?\d+\.?\d*)', range_str)
        if range_match:
            val1 = float(range_match.group(1))
            val2 = float(range_match.group(2))
            avg = (val1 + val2) / 2
            return {
                "range": f"{avg:+.2f}" if avg != 0 else "+0",
                "note": ""
            }
        
        # 3. 尝试提取单个数值（如："+0.3" 或 "约 +0.3EV"）
        single_match = re.search(r'([+-]?\d+\.?\d*)', range_str)
        if single_match:
            val = float(single_match.group(1))
            # 如果原字符串包含描述性文字，保留为 note
            if any(keyword in range_str for keyword in ["约", "微调", "略微", "稍微", "适度", "轻微", "提升", "增强", "压暗", "提亮"]):
                return {
                    "range": f"{val:+.2f}" if val != 0 else "+0",
                    "note": range_str
                }
            return {
                "range": f"{val:+.2f}" if val != 0 else "+0",
                "note": ""
            }
        
        # 4. 模糊描述（如："微调"、"略微增加"）
        if any(keyword in range_str for keyword in ["微调", "略微", "稍微", "适度", "轻微"]):
            return {
                "range": "+0",
                "note": range_str
            }
        
        # 5. 默认值
        return {
            "range": "+0",
            "note": range_str
        }

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
            
            # 检测新 Prompt 结构（module_1_critique, module_2_composition, module_3_lighting_params）
            # 如果存在新结构，转换为旧结构以便后续处理
            if "module_1_critique" in raw_data or "module_2_composition" in raw_data or "module_3_lighting_params" in raw_data:
                logger.info("检测到新 Prompt 结构，开始转换...")
                raw_data = self._convert_new_prompt_to_old_structure(raw_data)
            
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
                
                # 【重要】根据开发方案第 24 节，feasibility 应该放在 structured 中
                # 但为了向后兼容，也在 photoReview 顶层添加 feasibilityDescription
                # 注意：structured 中的 feasibility 已经由 _format_photo_review 填充，这里只需要在顶层添加 feasibilityDescription
                if "structured" in structured["sections"]["photoReview"]:
                    # 确保 structured 中的 feasibility 已正确填充（由 _format_photo_review 处理）
                    # 这里只需要在顶层添加 feasibilityDescription 以便向后兼容
                    structured["sections"]["photoReview"]["feasibilityDescription"] = str(explanation) if explanation else ""
                else:
                    # 如果 structured 不存在，直接添加 feasibility（向后兼容）
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
                logger.info(f"【format_part2】_format_lightroom 成功: has structured = {bool(lightroom_result.get('structured') if isinstance(lightroom_result, dict) else False)}, panels count = {len(lightroom_result.get('structured', {}).get('panels', [])) if isinstance(lightroom_result, dict) and isinstance(lightroom_result.get('structured'), dict) else 0}")
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
                logger.warning(f"【format_part2】_format_lightroom 使用空结构兜底")
            
            try:
                photoshop_result = self._format_photoshop(raw_data)
                logger.info(f"【format_part2】_format_photoshop 成功: has structured = {bool(photoshop_result.get('structured') if isinstance(photoshop_result, dict) else False)}, steps count = {len(photoshop_result.get('structured', {}).get('steps', [])) if isinstance(photoshop_result, dict) and isinstance(photoshop_result.get('structured'), dict) else 0}")
            except Exception as e:
                logger.error(f"_format_photoshop 失败: {e}", exc_info=True)
                # 返回空结构，避免整个流程失败
                photoshop_result = {
                    "naturalLanguage": {},
                    "structured": {
                        "steps": [],
                    },
                }
                logger.warning(f"【format_part2】_format_photoshop 使用空结构兜底")
            
            try:
                color_result = self._format_color_part2(raw_data)
                logger.info(f"【format_part2】_format_color_part2 成功: has structured = {bool(color_result.get('structured') if isinstance(color_result, dict) else False)}, structured keys = {list(color_result.get('structured', {}).keys()) if isinstance(color_result, dict) and isinstance(color_result.get('structured'), dict) else []}")
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
                logger.warning(f"【format_part2】_format_color_part2 使用空结构兜底")

            # 【日志记录】记录格式化结果
            logger.info(f"【format_part2】格式化结果: lightroom_result keys = {list(lightroom_result.keys()) if isinstance(lightroom_result, dict) else 'not dict'}, has structured = {bool(lightroom_result.get('structured') if isinstance(lightroom_result, dict) else False)}")
            logger.info(f"【format_part2】格式化结果: photoshop_result keys = {list(photoshop_result.keys()) if isinstance(photoshop_result, dict) else 'not dict'}, has structured = {bool(photoshop_result.get('structured') if isinstance(photoshop_result, dict) else False)}")
            logger.info(f"【format_part2】格式化结果: color_result keys = {list(color_result.keys()) if isinstance(color_result, dict) else 'not dict'}, has structured = {bool(color_result.get('structured') if isinstance(color_result, dict) else False)}")
            
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
            
            # 【日志记录】记录构建的 structured 结构
            logger.info(f"【format_part2】构建的 structured sections keys: {list(structured.get('sections', {}).keys())}")
            logger.debug(f"【format_part2】构建的 structured 完整结构: {json.dumps(structured, ensure_ascii=False, indent=2)[:1000]}...")  # 只记录前 1000 字符

            # 使用 Pydantic Schema 验证（根据开发方案第 14 节）
            try:
                # 【调试日志】记录验证前的 lightroom panels 数据
                if "sections" in structured and "lightroom" in structured["sections"]:
                    lightroom_section = structured["sections"]["lightroom"]
                    if "structured" in lightroom_section:
                        lightroom_structured = lightroom_section["structured"]
                        if "panels" in lightroom_structured:
                            panels_before = lightroom_structured["panels"]
                            logger.info(f"【format_part2】验证前 lightroom panels 数量: {len(panels_before) if isinstance(panels_before, list) else 'not list'}")
                            if isinstance(panels_before, list) and len(panels_before) > 0:
                                first_panel_before = panels_before[0]
                                logger.debug(f"【format_part2】验证前第一个 panel: title={first_panel_before.get('title')}, params_count={len(first_panel_before.get('params', []))}")
                
                validated = validate_part2_response(structured)
                
                # 【调试日志】记录验证后的 lightroom panels 数据
                if "sections" in validated and "lightroom" in validated["sections"]:
                    lightroom_section = validated["sections"]["lightroom"]
                    if "structured" in lightroom_section:
                        lightroom_structured = lightroom_section["structured"]
                        if "panels" in lightroom_structured:
                            panels_after = lightroom_structured["panels"]
                            logger.info(f"【format_part2】验证后 lightroom panels 数量: {len(panels_after) if isinstance(panels_after, list) else 'not list'}")
                            if isinstance(panels_after, list) and len(panels_after) > 0:
                                first_panel_after = panels_after[0]
                                has_content = bool(first_panel_after.get("title") or first_panel_after.get("description") or first_panel_after.get("params"))
                                logger.debug(f"【format_part2】验证后第一个 panel: title={first_panel_after.get('title')}, params_count={len(first_panel_after.get('params', []))}, has_content={has_content}")
                                if not has_content:
                                    logger.error(f"【format_part2】❌ 验证后 panels 内容为空！第一个 panel: {json.dumps(first_panel_after, ensure_ascii=False)[:200]}")
                
                # 【日志记录】记录验证后的结构
                validated_sections_keys = list(validated.get("sections", {}).keys()) if isinstance(validated, dict) else []
                logger.info(f"【format_part2】Schema 验证成功, validated sections keys: {validated_sections_keys}")
                
                # 验证并修复缺失字段
                self._validate_and_fix(validated)
                
                # 【日志记录】记录修复后的结构
                fixed_sections_keys = list(validated.get("sections", {}).keys()) if isinstance(validated, dict) else []
                logger.info(f"【format_part2】修复后 sections keys: {fixed_sections_keys}")
                
                return validated
            except Exception as schema_error:
                logger.warning(f"Part2 Schema 验证失败，使用兜底逻辑: {schema_error}", exc_info=True)
                # 验证并修复缺失字段
                self._validate_and_fix(structured)
                
                # 【日志记录】记录兜底逻辑后的结构
                fallback_sections_keys = list(structured.get("sections", {}).keys()) if isinstance(structured, dict) else []
                logger.info(f"【format_part2】兜底逻辑后 sections keys: {fallback_sections_keys}")
                
                return structured

        except Exception as e:
            logger.error(f"Part2 格式化失败: {e}")
            return self._create_error_structure("part2", str(e))

    def _format_photo_review(self, raw: Dict[str, Any], feasibility: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """
        格式化照片点评
        
        Args:
            raw: Gemini 返回的原始数据（应该包含 professional_evaluation 或 module_1_critique 字段）
            feasibility: 可行性评估结果（可选）
        
        Returns:
            标准化的照片点评结构
        """
        # 优先使用新结构 module_1_critique，如果没有则使用旧结构 professional_evaluation
        module_1 = raw.get("module_1_critique", {})
        pe = raw.get("professional_evaluation", {})
        
        # 如果存在新结构，优先使用
        if module_1:
            logger.info("使用新 Prompt 结构 (module_1_critique)")
            # 提取新结构字段
            comprehensive_review = module_1.get("comprehensive_review", "")
            visual_subject_analysis = module_1.get("visual_subject_analysis", "")
            focus_exposure_analysis = module_1.get("focus_exposure_analysis", "")
            color_depth_analysis = module_1.get("color_depth_analysis", {})
            emotion = module_1.get("emotion", "")
            pros_evaluation = module_1.get("pros_evaluation", "")
            parameter_comparison_table = module_1.get("parameter_comparison_table", [])
            style_summary = module_1.get("style_summary", "")
            feasibility_assessment = module_1.get("feasibility_assessment", {})
            # 【新增】提取风格分类字段（可选，保持向后兼容）
            style_classification = module_1.get("style_classification", {})
            master_archetype = ""
            visual_signature = ""
            if isinstance(style_classification, dict):
                master_archetype = style_classification.get("master_archetype", "")
                visual_signature = style_classification.get("visual_signature", "")
            
            # 【调试日志】记录提取的字段值（只记录前100个字符，避免日志过长）
            logger.debug(f"_format_photo_review (新结构): comprehensive_review = {comprehensive_review[:100] if comprehensive_review else 'empty'}...")
            logger.debug(f"_format_photo_review (新结构): visual_subject_analysis = {visual_subject_analysis[:100] if visual_subject_analysis else 'empty'}...")
            logger.debug(f"_format_photo_review (新结构): focus_exposure_analysis = {focus_exposure_analysis[:100] if focus_exposure_analysis else 'empty'}...")
            logger.debug(f"_format_photo_review (新结构): emotion = {emotion[:100] if emotion else 'empty'}...")
            logger.debug(f"_format_photo_review (新结构): pros_evaluation = {pros_evaluation[:100] if pros_evaluation else 'empty'}...")
            logger.debug(f"_format_photo_review (新结构): color_depth_analysis type = {type(color_depth_analysis)}, is_dict = {isinstance(color_depth_analysis, dict)}")
            
            # 提取直方图数据（兼容新旧两种结构）
            histogram_data = {}
            if isinstance(color_depth_analysis, dict):
                simulated_histogram = color_depth_analysis.get("simulated_histogram_data", {})
                if isinstance(simulated_histogram, dict):
                    # 检查是新结构（只有 description 和 data_points）还是旧结构（有 reference 和 user）
                    if "reference" in simulated_histogram or "user" in simulated_histogram:
                        # 旧结构：有 reference 和 user 两个字段
                        reference_hist = simulated_histogram.get("reference", {})
                        user_hist = simulated_histogram.get("user", {})
                        
                        if reference_hist:
                            histogram_data["reference"] = {
                                "description": reference_hist.get("description", ""),
                                "data_points": reference_hist.get("data_points", [])
                            }
                        
                        if user_hist:
                            histogram_data["user"] = {
                                "description": user_hist.get("description", ""),
                                "data_points": user_hist.get("data_points", [])
                            }
                    else:
                        # 新结构：只有 description 和 data_points（作为参考图的直方图）
                        description = simulated_histogram.get("description", "")
                        data_points = simulated_histogram.get("data_points", [])
                        if description or data_points:
                            histogram_data["reference"] = {
                                "description": description,
                                "data_points": data_points
                            }
                            logger.info("使用新 Prompt 结构的直方图数据（单一结构）")
            
            # 构建 colorDepth 维度，包含直方图数据
            # 注意：color_depth_analysis 可能是字符串（自然语言）或字典（包含 text、saturation_strategy、tonal_intent 和 simulated_histogram_data）
            color_depth_text = ""
            saturation_strategy = ""  # 【新增】饱和度策略
            tonal_intent = ""  # 【新增】影调意图
            if isinstance(color_depth_analysis, dict):
                color_depth_text = color_depth_analysis.get("text", "")
                saturation_strategy = color_depth_analysis.get("saturation_strategy", "")  # 【新增】提取饱和度策略
                tonal_intent = color_depth_analysis.get("tonal_intent", "")  # 【新增】提取影调意图
            elif isinstance(color_depth_analysis, str):
                color_depth_text = color_depth_analysis
            
            # 构建 colorDepth 维度，包含直方图数据
            # 注意：根据新 Prompt 结构，color_depth_analysis 是自然语言输出，不做表格对比
            color_depth_dimension = {
                "title": "色彩与景深",
                "referenceDescription": color_depth_text if color_depth_text else "",  # 使用自然语言描述，不做表格对比
                "userDescription": ""  # 新结构中没有用户图描述，留空
            }
            # 【新增】如果有饱和度策略和影调意图，添加到 colorDepth 维度（可选字段，保持向后兼容）
            if saturation_strategy:
                color_depth_dimension["saturationStrategy"] = saturation_strategy
            if tonal_intent:
                color_depth_dimension["tonalIntent"] = tonal_intent
            # 如果有直方图数据，添加到 colorDepth 维度
            if histogram_data:
                color_depth_dimension["histogramData"] = histogram_data
            
            # 【调试日志】记录 colorDepth 维度构建结果
            logger.debug(f"_format_photo_review (新结构): colorDepth.referenceDescription = {color_depth_text[:50] if color_depth_text else 'empty'}...")
            logger.debug(f"_format_photo_review (新结构): colorDepth.histogramData = {'存在' if histogram_data else '不存在'}")
            
            # 转换 parameter_comparison_table 格式
            comparison_table = []
            if isinstance(parameter_comparison_table, list):
                for item in parameter_comparison_table:
                    if isinstance(item, dict):
                        comparison_table.append({
                            "dimension": item.get("dimension", ""),
                            "reference": item.get("ref_feature", ""),
                            "user": item.get("user_feature", "")
                        })
            
            # 提取 feasibility_assessment 数据
            feasibility_data = {}
            if isinstance(feasibility_assessment, dict):
                score = feasibility_assessment.get("score", 0)
                level = feasibility_assessment.get("level", "")
                can_transform = feasibility_assessment.get("can_transform", None)  # 优先使用 Gemini 输出的字段
                limitations = feasibility_assessment.get("limitations", [])
                recommendation = feasibility_assessment.get("recommendation", "")
                confidence = feasibility_assessment.get("confidence", "")
                
                # 如果 Gemini 没有输出 can_transform，根据 score 计算
                if can_transform is None:
                    can_transform = float(score) > 0.3 if isinstance(score, (int, float)) else False
                
                # 转换 confidence 字符串为数字（如果提供）
                confidence_score = float(score) if isinstance(score, (int, float)) else 0.0
                if isinstance(confidence, str):
                    if "高" in confidence or "high" in confidence.lower():
                        confidence_score = max(confidence_score, 0.8)
                    elif "中" in confidence or "medium" in confidence.lower():
                        confidence_score = max(confidence_score, 0.5)
                    elif "低" in confidence or "low" in confidence.lower():
                        confidence_score = max(confidence_score, 0.3)
                
                feasibility_data = {
                    "conversion_feasibility": {
                        "can_transform": bool(can_transform),
                        "difficulty": str(level) if level else "未知",
                        "confidence": confidence_score,
                        "limiting_factors": limitations if isinstance(limitations, (list, str)) else [],
                        "recommendation": str(recommendation) if recommendation else "",
                    },
                    "feasibilityDescription": str(recommendation) if recommendation else "",
                }
            
            # 构建返回结构
            returned = {
                "naturalLanguage": {
                    "summary": comprehensive_review,
                    "highlights": pros_evaluation,
                    "technique": "",
                    "comparison": visual_subject_analysis,
                },
                "structured": {
                    "overviewSummary": comprehensive_review,
                    "dimensions": {
                        "visualGuidance": {
                            "title": "视觉引导与主体",
                            "referenceDescription": visual_subject_analysis if visual_subject_analysis else "",  # 自然语言，不做表格对比
                            "userDescription": ""  # 新结构中没有用户图描述，留空
                        },
                        "focusExposure": {
                            "title": "焦点与曝光",
                            "referenceDescription": focus_exposure_analysis if focus_exposure_analysis else "",  # 自然语言，不做表格对比
                            "userDescription": ""  # 新结构中没有用户图描述，留空
                        },
                        "colorDepth": color_depth_dimension,  # 包含直方图数据
                        # 【重要】composition、technicalDetails、equipment 在新 Prompt 结构中不存在
                        # 为了保持前端兼容性，使用 referenceDescription 字段（与前端检查逻辑一致）
                        # 前端检查：dimension.referenceDescription || dimension.userDescription || dimension.description
                        "composition": {
                            "title": "构图",
                            "referenceDescription": "",  # 新结构中不存在，留空（前端会跳过空内容）
                            "userDescription": ""
                        },
                        "technicalDetails": {
                            "title": "技术细节",
                            "referenceDescription": "",  # 新结构中不存在，留空（前端会跳过空内容）
                            "userDescription": ""
                        },
                        "equipment": {
                            "title": "设备",
                            "referenceDescription": "",  # 新结构中不存在，留空（前端会跳过空内容）
                            "userDescription": ""
                        },
                        "colorEmotion": {
                            "title": "色彩与情感",
                            "referenceDescription": emotion if emotion else "",  # 自然语言，不做表格对比
                            "userDescription": ""  # 新结构中没有用户图描述，留空
                        },
                        "advantages": {
                            "title": "优点评价",
                            "referenceDescription": pros_evaluation if pros_evaluation else "",  # 自然语言，不做表格对比
                            "userDescription": ""  # 新结构中没有用户图描述，留空
                        },
                    },
                    "comparisonTable": comparison_table,
                    "photographerStyleSummary": style_summary,
                    "feasibility": feasibility_data if feasibility_data else None,  # 添加可行性评估数据
                    # 【新增】风格分类字段（可选，保持向后兼容）
                    "styleClassification": {
                        "masterArchetype": master_archetype,
                        "visualSignature": visual_signature
                    } if (master_archetype or visual_signature) else None,
                },
            }
            
            # 【调试日志】记录返回的 dimensions 结构
            dimensions_dict = returned.get('structured', {}).get('dimensions', {})
            logger.debug(f"_format_photo_review (新结构): 返回的 dimensions keys = {list(dimensions_dict.keys())}")
            logger.debug(f"_format_photo_review (新结构): visualGuidance.referenceDescription = {dimensions_dict.get('visualGuidance', {}).get('referenceDescription', '')[:50] if dimensions_dict.get('visualGuidance', {}).get('referenceDescription') else 'empty'}...")
            logger.debug(f"_format_photo_review (新结构): focusExposure.referenceDescription = {dimensions_dict.get('focusExposure', {}).get('referenceDescription', '')[:50] if dimensions_dict.get('focusExposure', {}).get('referenceDescription') else 'empty'}...")
            logger.debug(f"_format_photo_review (新结构): colorDepth.referenceDescription = {dimensions_dict.get('colorDepth', {}).get('referenceDescription', '')[:50] if dimensions_dict.get('colorDepth', {}).get('referenceDescription') else 'empty'}...")
            logger.debug(f"_format_photo_review (新结构): colorEmotion.referenceDescription = {dimensions_dict.get('colorEmotion', {}).get('referenceDescription', '')[:50] if dimensions_dict.get('colorEmotion', {}).get('referenceDescription') else 'empty'}...")
            logger.debug(f"_format_photo_review (新结构): advantages.referenceDescription = {dimensions_dict.get('advantages', {}).get('referenceDescription', '')[:50] if dimensions_dict.get('advantages', {}).get('referenceDescription') else 'empty'}...")
            
            return returned
        
        # 使用旧结构（向后兼容）
        logger.info("使用旧 Prompt 结构 (professional_evaluation)")
        
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
            raw: Gemini 返回的原始数据（应该包含 composition 或 module_2_composition 字段）
        
        Returns:
            标准化的构图分析结构
        """
        # 优先使用新结构 module_2_composition，如果没有则使用旧结构 composition
        module_2 = raw.get("module_2_composition", {})
        comp = raw.get("composition", {})
        
        # 如果存在新结构，使用 5 字段结构（方案A）
        if module_2:
            logger.info("使用新 Prompt 结构 (module_2_composition) - 5字段结构")
            
            main_structure = module_2.get("main_structure", "")
            subject_weight = module_2.get("subject_weight", {})
            visual_guidance = module_2.get("visual_guidance", {})
            ratios_negative_space = module_2.get("ratios_negative_space", {})
            style_class = module_2.get("style_class", "")
            
            # 构建新结构（5字段）
            structured = {
                "main_structure": main_structure,
                "subject_weight": {
                    "description": subject_weight.get("description", "") if isinstance(subject_weight, dict) else "",
                    "layers": subject_weight.get("layers", "") if isinstance(subject_weight, dict) else ""
                },
                "visual_guidance": {
                    "analysis": visual_guidance.get("analysis", "") if isinstance(visual_guidance, dict) else "",
                    "path": visual_guidance.get("path", "") if isinstance(visual_guidance, dict) else ""
                },
                "ratios_negative_space": {
                    "entity_ratio": ratios_negative_space.get("entity_ratio", "") if isinstance(ratios_negative_space, dict) else "",
                    "space_ratio": ratios_negative_space.get("space_ratio", "") if isinstance(ratios_negative_space, dict) else "",
                    "distribution": ratios_negative_space.get("distribution", "") if isinstance(ratios_negative_space, dict) else ""
                },
                "style_class": style_class
            }
            
            return {
                "naturalLanguage": {
                    "framework": main_structure,
                    "subjectWeight": subject_weight.get("description", "") if isinstance(subject_weight, dict) else "",
                    "leadingLines": visual_guidance.get("analysis", "") if isinstance(visual_guidance, dict) else "",
                    "spaceLayers": subject_weight.get("layers", "") if isinstance(subject_weight, dict) else "",
                    "proportion": ratios_negative_space.get("distribution", "") if isinstance(ratios_negative_space, dict) else "",
                    "balanceDynamics": visual_guidance.get("path", "") if isinstance(visual_guidance, dict) else "",
                },
                "structured": structured,
            }
        
        # 使用旧结构（向后兼容 - 7段结构）
        logger.info("使用旧 Prompt 结构 (composition) - 7段结构")
        
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
        """
        格式化光影参数
        
        Args:
            raw: Gemini 返回的原始数据（应该包含 lighting 或 module_3_lighting_params 字段）
        
        Returns:
            标准化的光影参数结构
        """
        # 优先使用新结构 module_3_lighting_params，如果没有则使用旧结构
        module_3 = raw.get("module_3_lighting_params", {})
        
        # 如果存在新结构，处理范围字符串和色调曲线
        if module_3:
            logger.info("使用新 Prompt 结构 (module_3_lighting_params)")
            
            exposure_control = module_3.get("exposure_control", {})
            tone_curves = module_3.get("tone_curves", {})
            texture_clarity = module_3.get("texture_clarity", {})
            
            # 解析曝光控制参数（范围+描述格式）
            basic = {}
            if isinstance(exposure_control, dict):
                basic["exposure"] = self._parse_range_string(exposure_control.get("exposure", ""))
                basic["contrast"] = self._parse_range_string(exposure_control.get("contrast", ""))
                basic["highlights"] = self._parse_range_string(exposure_control.get("highlights", ""))
                basic["shadows"] = self._parse_range_string(exposure_control.get("shadows", ""))
                basic["whites"] = self._parse_range_string(exposure_control.get("whites", ""))
                basic["blacks"] = self._parse_range_string(exposure_control.get("blacks", ""))
            else:
                # 默认值
                basic = {
                    "exposure": {"range": "+0", "note": ""},
                    "contrast": {"range": "+0", "note": ""},
                    "highlights": {"range": "+0", "note": ""},
                    "shadows": {"range": "+0", "note": ""},
                    "whites": {"range": "+0", "note": ""},
                    "blacks": {"range": "+0", "note": ""},
                }
            
            # 解析纹理与清晰度参数（范围+描述格式）
            texture = {}
            if isinstance(texture_clarity, dict):
                texture["texture"] = self._parse_range_string(texture_clarity.get("texture", ""))
                texture["clarity"] = self._parse_range_string(texture_clarity.get("clarity", ""))
                texture["dehaze"] = self._parse_range_string(texture_clarity.get("dehaze", ""))
            else:
                # 默认值
                texture = {
                    "texture": {"range": "+0", "note": ""},
                    "clarity": {"range": "+0", "note": ""},
                    "dehaze": {"range": "+0", "note": ""},
                }
            
            # 提取色调曲线数据
            tone_curves_data = {}
            if isinstance(tone_curves, dict):
                tone_curves_data = {
                    "explanation": tone_curves.get("explanation", ""),
                    "points_rgb": tone_curves.get("points_rgb", []),
                    "points_red": tone_curves.get("points_red", []),
                    "points_green": tone_curves.get("points_green", []),
                    "points_blue": tone_curves.get("points_blue", []),
                }
            
            structured = {
                "basic": basic,
                "texture": texture,
            }
            
            # 如果有色调曲线数据，添加到 structured
            if tone_curves_data and (tone_curves_data.get("points_rgb") or tone_curves_data.get("points_red")):
                structured["toneCurves"] = tone_curves_data
            
            return {
                "naturalLanguage": {
                    "exposureControl": "",
                    "toneCurve": tone_curves_data.get("explanation", ""),
                    "textureClarity": "",
                },
                "structured": structured,
            }
        
        # 使用旧结构（向后兼容）
        logger.info("使用旧 Prompt 结构 (lighting)")
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
        """
        格式化 Lightroom 参数（Part2）
        
        支持两种数据结构：
        1. 新结构（当前使用）：lightroom_workflow.basic_panel、presence、color_settings、tone_curve
        2. 旧结构（向后兼容）：lightroom、lightroom_panels
        """
        # 辅助函数：确保值为字符串格式（带正负号）
        def ensure_string(value, default="+0"):
            """将数值转换为字符串格式，带正负号"""
            if value is None:
                return default
            if isinstance(value, (int, float)):
                sign = "+" if value >= 0 else ""
                return f"{sign}{value}"
            return str(value)
        
        # 辅助函数：从范围字符串中提取数值（如 "+0.50 ~ +0.80" -> "+0.50"）
        def extract_range_value(range_str: str, default="+0") -> str:
            """从范围字符串中提取第一个值作为默认值"""
            if not range_str or not isinstance(range_str, str):
                return default
            # 匹配范围格式，如 "+0.50 ~ +0.80" 或 "+10 ~ +15"
            match = range_str.strip().split("~")[0].strip()
            return match if match else default
        
        # 辅助函数：将英文参数名转换为中文名称（根据开发方案，前端需要显示中文名称）
        def get_param_name_cn(param_name_en: str) -> str:
            """将英文参数名转换为中文名称"""
            param_name_map = {
                # 基础调整
                "exposure": "曝光",
                "contrast": "对比度",
                "highlights": "高光",
                "shadows": "阴影",
                "whites": "白色色阶",
                "blacks": "黑色色阶",
                # 存在感
                "texture": "纹理",
                "clarity": "清晰度",
                "dehaze": "去雾",
                # 颜色设置
                "saturation": "饱和度",
                "vibrance": "自然饱和度",
            }
            return param_name_map.get(param_name_en, param_name_en)
        
        # 优先使用新结构（lightroom_workflow）
        lr_workflow = raw.get("lightroom_workflow", {})
        
        # 【日志记录】记录 raw 数据中是否存在 lightroom_workflow
        logger.info(f"【_format_lightroom】raw 数据 keys: {list(raw.keys()) if isinstance(raw, dict) else 'not dict'}")
        logger.info(f"【_format_lightroom】是否存在 lightroom_workflow: {bool(lr_workflow)}, lightroom_workflow keys: {list(lr_workflow.keys()) if isinstance(lr_workflow, dict) else 'not dict'}")
        
        if lr_workflow:
            # 【新结构】使用 lightroom_workflow
            logger.info("【_format_lightroom】使用新 Part2 Prompt 结构 (lightroom_workflow)")
            
            # 1. 基础面板（basic_panel）
            basic_panel = lr_workflow.get("basic_panel", {})
            logger.info(f"【_format_lightroom】basic_panel keys: {list(basic_panel.keys()) if isinstance(basic_panel, dict) else 'not dict'}")
            basic_params = []
            
            # 【更新】基础面板参数列表：包含原有的6个参数，以及新增的 texture、clarity、dehaze、saturation、vibrance（如果存在）
            basic_panel_param_names = ["exposure", "contrast", "highlights", "shadows", "whites", "blacks"]
            # 【新增】检查 basic_panel 中是否包含新字段（texture、clarity、dehaze、saturation、vibrance）
            # 如果存在，则从 basic_panel 提取；如果不存在，则从 presence 和 color_settings 提取（向后兼容）
            extended_basic_params = ["texture", "clarity", "dehaze", "saturation", "vibrance"]
            for param_name in extended_basic_params:
                if param_name in basic_panel:
                    basic_panel_param_names.append(param_name)
                    logger.info(f"【_format_lightroom】检测到 basic_panel 中包含 {param_name} 字段，将从 basic_panel 提取")
            
            for param_name in basic_panel_param_names:
                param_obj = basic_panel.get(param_name, {})
                if isinstance(param_obj, dict):
                    param_val = param_obj.get("val", "+0")
                    param_reason = param_obj.get("reason", "")
                    # 从范围字符串中提取值
                    param_value = extract_range_value(param_val, "+0")
                    # 【重要修复】将英文参数名转换为中文名称，确保前端显示中文
                    param_name_cn = get_param_name_cn(param_name)
                    basic_params.append({
                        "name": param_name_cn,  # 使用中文名称
                        "value": param_value,
                        "purpose": param_reason if param_reason else None,
                        "reason": param_reason if param_reason else None,  # 同时提供 reason 字段，兼容前端
                    })
                else:
                    # 向后兼容：如果直接是字符串值
                    param_name_cn = get_param_name_cn(param_name)
                    basic_params.append({
                        "name": param_name_cn,  # 使用中文名称
                        "value": ensure_string(param_obj, "+0"),
                    })
            
            logger.info(f"【_format_lightroom】basic_params 数量: {len(basic_params)}")
            
            # 2. 存在感面板（presence）- 向后兼容：如果 basic_panel 中没有这些字段，则从 presence 提取
            presence = lr_workflow.get("presence", {})
            logger.info(f"【_format_lightroom】presence keys: {list(presence.keys()) if isinstance(presence, dict) else 'not dict'}")
            presence_params = []
            
            for param_name in ["texture", "clarity", "dehaze"]:
                # 【更新】优先从 basic_panel 提取，如果不存在则从 presence 提取（向后兼容）
                if param_name in basic_panel:
                    logger.debug(f"【_format_lightroom】{param_name} 已从 basic_panel 提取，跳过 presence")
                    continue
                param_obj = presence.get(param_name, {})
                if isinstance(param_obj, dict):
                    param_val = param_obj.get("val", "+0")
                    param_reason = param_obj.get("reason", "")
                    param_value = extract_range_value(param_val, "+0")
                    # 【重要修复】将英文参数名转换为中文名称
                    param_name_cn = get_param_name_cn(param_name)
                    presence_params.append({
                        "name": param_name_cn,  # 使用中文名称
                        "value": param_value,
                        "purpose": param_reason if param_reason else None,
                        "reason": param_reason if param_reason else None,  # 同时提供 reason 字段，兼容前端
                    })
                else:
                    param_name_cn = get_param_name_cn(param_name)
                    presence_params.append({
                        "name": param_name_cn,  # 使用中文名称
                        "value": ensure_string(param_obj, "+0"),
                    })
            
            logger.info(f"【_format_lightroom】presence_params 数量: {len(presence_params)}")
            
            # 3. 颜色设置（color_settings）- 向后兼容：如果 basic_panel 中没有这些字段，则从 color_settings 提取
            color_settings = lr_workflow.get("color_settings", {})
            logger.info(f"【_format_lightroom】color_settings keys: {list(color_settings.keys()) if isinstance(color_settings, dict) else 'not dict'}")
            color_params = []
            
            for param_name in ["saturation", "vibrance"]:
                # 【更新】优先从 basic_panel 提取，如果不存在则从 color_settings 提取（向后兼容）
                if param_name in basic_panel:
                    logger.debug(f"【_format_lightroom】{param_name} 已从 basic_panel 提取，跳过 color_settings")
                    continue
                param_obj = color_settings.get(param_name, {})
                if isinstance(param_obj, dict):
                    param_val = param_obj.get("val", "+0")
                    param_reason = param_obj.get("reason", "")
                    param_value = extract_range_value(param_val, "+0")
                    # 【重要修复】将英文参数名转换为中文名称
                    param_name_cn = get_param_name_cn(param_name)
                    color_params.append({
                        "name": param_name_cn,  # 使用中文名称
                        "value": param_value,
                        "purpose": param_reason if param_reason else None,
                        "reason": param_reason if param_reason else None,  # 同时提供 reason 字段，兼容前端
                    })
                else:
                    param_name_cn = get_param_name_cn(param_name)
                    color_params.append({
                        "name": param_name_cn,  # 使用中文名称
                        "value": ensure_string(param_obj, "+0"),
                    })
            
            logger.info(f"【_format_lightroom】color_params 数量: {len(color_params)}")
            
            # 4. 色调曲线（tone_curve）
            tone_curve_obj = lr_workflow.get("tone_curve", {})
            tone_curve_points = tone_curve_obj.get("rgb_points", [[0, 0], [64, 64], [128, 128], [192, 192], [255, 255]])
            rgb_curves = {
                "red": tone_curve_obj.get("red_channel", []),
                "green": tone_curve_obj.get("green_channel", []),
                "blue": tone_curve_obj.get("blue_channel", []),
            }
            
            # 5. 分离色调（split_toning_detail）
            split_toning = lr_workflow.get("split_toning_detail", {})
            color_grading = {}
            if split_toning:
                # 辅助函数：从字符串中提取数字（如 "35°" -> 35）
                def extract_number(value: any) -> int:
                    """从字符串或数字中提取整数值"""
                    if isinstance(value, (int, float)):
                        return int(value)
                    if isinstance(value, str):
                        # 匹配数字，如 "35°" -> 35
                        match = value.replace("°", "").replace("h", "").replace("s", "").strip()
                        try:
                            return int(float(match))
                        except:
                            return 0
                    return 0
                
                highlights = split_toning.get("highlights", {})
                shadows = split_toning.get("shadows", {})
                balance = split_toning.get("balance", {})
                
                color_grading = {
                    "highlights": {
                        "hue": extract_number(highlights.get("h", 0)) if isinstance(highlights, dict) else 0,
                        "saturation": extract_number(highlights.get("s", 0)) if isinstance(highlights, dict) else 0,
                    },
                    "midtones": {
                        "hue": 0,
                        "saturation": 0,
                    },
                    "shadows": {
                        "hue": extract_number(shadows.get("h", 0)) if isinstance(shadows, dict) else 0,
                        "saturation": extract_number(shadows.get("s", 0)) if isinstance(shadows, dict) else 0,
                    },
                    "balance": extract_number(balance.get("val", "0")) if isinstance(balance, dict) else 0,
                }
            
            # 构建 panels 数组
            # 【重要修复】问题2：确保 panels 数组始终有数据，即使某个面板为空
            # 原因：如果 basic_params、presence_params、color_params 都为空，panels 会是空数组，导致前端显示无数据
            # 解决方案：即使参数为空，也创建对应的面板（使用默认值），确保前端能显示面板结构
            panels = []
            
            # 1. 基础调整面板（即使 basic_params 为空，也创建面板）
            if basic_params:
                panels.append({
                    "title": "基础调整",
                    "description": "基础曝光和对比度调整",
                    "params": basic_params,
                })
            else:
                # 如果 basic_params 为空，创建默认面板（使用默认值 "+0"）
                logger.warning("【_format_lightroom】basic_params 为空，创建默认基础调整面板")
                panels.append({
                    "title": "基础调整",
                    "description": "基础曝光和对比度调整",
                    "params": [
                        {"name": "exposure", "value": "+0"},
                        {"name": "contrast", "value": "+0"},
                        {"name": "highlights", "value": "+0"},
                        {"name": "shadows", "value": "+0"},
                        {"name": "whites", "value": "+0"},
                        {"name": "blacks", "value": "+0"},
                    ],
                })
            
            # 2. 存在感面板（即使 presence_params 为空，也创建面板）
            if presence_params:
                panels.append({
                    "title": "存在感",
                    "description": "纹理、清晰度和去雾调整",
                    "params": presence_params,
                })
            else:
                # 如果 presence_params 为空，创建默认面板
                logger.warning("【_format_lightroom】presence_params 为空，创建默认存在感面板")
                panels.append({
                    "title": "存在感",
                    "description": "纹理、清晰度和去雾调整",
                    "params": [
                        {"name": "texture", "value": "+0"},
                        {"name": "clarity", "value": "+0"},
                        {"name": "dehaze", "value": "+0"},
                    ],
                })
            
            # 3. 色彩调整面板（即使 color_params 为空，也创建面板）
            # 【修复】根据设计规范，标题应为"色彩调整"而不是"颜色设置"
            if color_params:
                panels.append({
                    "title": "色彩调整",
                    "description": "饱和度和自然饱和度调整",
                    "params": color_params,
                })
            else:
                # 如果 color_params 为空，创建默认面板
                logger.warning("【_format_lightroom】color_params 为空，创建默认色彩调整面板")
                panels.append({
                    "title": "色彩调整",
                    "description": "饱和度和自然饱和度调整",
                    "params": [
                        {"name": "饱和度", "value": "+0"},
                        {"name": "自然饱和度", "value": "+0"},
                    ],
                })
            
            # 4. HSL/颜色面板（从 color_science_scheme 或 lightroom.HSL 中提取）
            # 【新增】根据设计规范，需要添加 HSL/颜色面板
            hsl_params = []
            color_scheme = raw.get("color_science_scheme", {})
            hsl_12_colors = color_scheme.get("hsl_detailed_12_colors", {})
            
            # 颜色映射：12 色 -> 前端需要的 8 色
            color_mapping = {
                "red": "红",
                "orange": "橙",
                "yellow": "黄",
                "yellow_green": "绿",
                "green": "绿",
                "green_cyan": "青",
                "cyan": "青",
                "cyan_blue": "蓝",
                "blue": "蓝",
                "blue_purple": "紫",
                "purple": "紫",
                "magenta": "洋红",
            }
            
            # 前端需要的 8 种颜色
            frontend_colors = ["红", "橙", "黄", "绿", "青", "蓝", "紫", "洋红"]
            
            for frontend_color in frontend_colors:
                # 找到映射到该前端颜色的新结构颜色键
                source_keys = [k for k, v in color_mapping.items() if v == frontend_color]
                
                # 优先使用第一个匹配的颜色数据
                hsl_data = None
                for key in source_keys:
                    if key in hsl_12_colors:
                        hsl_data = hsl_12_colors[key]
                        break
                
                # 如果找到数据，添加到参数列表
                if hsl_data and isinstance(hsl_data, dict):
                    h_val = str(hsl_data.get("h", "0"))
                    s_val = str(hsl_data.get("s", "0"))
                    l_val = str(hsl_data.get("l", "0"))
                    desc = hsl_data.get("desc", "")
                    
                    # 只有当至少有一个值不为 0 时才添加参数
                    if h_val != "0" or s_val != "0" or l_val != "0":
                        hsl_params.append({
                            "name": f"{frontend_color}色相",
                            "value": h_val,
                            "reason": desc if desc else None,
                        })
                        hsl_params.append({
                            "name": f"{frontend_color}饱和度",
                            "value": s_val,
                            "reason": desc if desc else None,
                        })
                        hsl_params.append({
                            "name": f"{frontend_color}明度",
                            "value": l_val,
                            "reason": desc if desc else None,
                        })
            
            # 如果新结构没有 HSL 数据，尝试从旧结构 lightroom.HSL 中提取
            if not hsl_params:
                lr_old = raw.get("lightroom", {})
                hsl_raw = lr_old.get("HSL", {})
                if hsl_raw:
                    color_names = ["red", "orange", "yellow", "green", "aqua", "blue", "purple", "magenta"]
                    color_names_cn = ["红", "橙", "黄", "绿", "青", "蓝", "紫", "洋红"]
                    
                    for en, cn in zip(color_names, color_names_cn):
                        hsl_data = hsl_raw.get(en, {})
                        if hsl_data:
                            h_val = str(hsl_data.get("hue", 0))
                            s_val = str(hsl_data.get("saturation", 0))
                            l_val = str(hsl_data.get("luminance", 0))
                            
                            if h_val != "0" or s_val != "0" or l_val != "0":
                                hsl_params.append({
                                    "name": f"{cn}色相",
                                    "value": h_val,
                                })
                                hsl_params.append({
                                    "name": f"{cn}饱和度",
                                    "value": s_val,
                                })
                                hsl_params.append({
                                    "name": f"{cn}明度",
                                    "value": l_val,
                                })
            
            # 添加 HSL/颜色面板
            if hsl_params:
                panels.append({
                    "title": "HSL/颜色",
                    "description": "色相、饱和度和明度调整",
                    "params": hsl_params,
                })
                logger.info(f"【_format_lightroom】HSL/颜色面板已创建，参数数量: {len(hsl_params)}")
            else:
                # 即使没有 HSL 数据，也创建空面板（使用默认值）
                logger.warning("【_format_lightroom】HSL 数据为空，创建默认 HSL/颜色面板")
                panels.append({
                    "title": "HSL/颜色",
                    "description": "色相、饱和度和明度调整",
                    "params": [],
                })
            
            # 5. 色调分离面板（从 split_toning_detail 中提取）
            # 【新增】根据设计规范，需要添加色调分离面板
            split_toning_params = []
            if split_toning:
                highlights = split_toning.get("highlights", {})
                shadows = split_toning.get("shadows", {})
                balance = split_toning.get("balance", {})
                
                # 辅助函数：从字符串中提取数字（如 "35°" -> 35）
                def extract_number(value: any) -> int:
                    """从字符串或数字中提取整数值"""
                    if isinstance(value, (int, float)):
                        return int(value)
                    if isinstance(value, str):
                        match = value.replace("°", "").replace("h", "").replace("s", "").strip()
                        try:
                            return int(float(match))
                        except:
                            return 0
                    return 0
                
                if isinstance(highlights, dict):
                    h_hue = extract_number(highlights.get("h", 0))
                    h_sat = extract_number(highlights.get("s", 0))
                    h_reason = highlights.get("reason", "")
                    
                    if h_hue != 0 or h_sat != 0:
                        split_toning_params.append({
                            "name": "高光色相",
                            "value": str(h_hue),
                            "reason": h_reason if h_reason else None,
                        })
                        split_toning_params.append({
                            "name": "高光饱和度",
                            "value": str(h_sat),
                            "reason": h_reason if h_reason else None,
                        })
                
                if isinstance(shadows, dict):
                    s_hue = extract_number(shadows.get("h", 0))
                    s_sat = extract_number(shadows.get("s", 0))
                    s_reason = shadows.get("reason", "")
                    
                    if s_hue != 0 or s_sat != 0:
                        split_toning_params.append({
                            "name": "阴影色相",
                            "value": str(s_hue),
                            "reason": s_reason if s_reason else None,
                        })
                        split_toning_params.append({
                            "name": "阴影饱和度",
                            "value": str(s_sat),
                            "reason": s_reason if s_reason else None,
                        })
                
                if isinstance(balance, dict):
                    bal_val = extract_number(balance.get("val", "0"))
                    bal_reason = balance.get("reason", "")
                    
                    if bal_val != 0:
                        split_toning_params.append({
                            "name": "平衡",
                            "value": str(bal_val),
                            "reason": bal_reason if bal_reason else None,
                        })
            
            # 添加色调分离面板
            if split_toning_params:
                panels.append({
                    "title": "色调分离",
                    "description": "高光和阴影的色调分离调整",
                    "params": split_toning_params,
                })
                logger.info(f"【_format_lightroom】色调分离面板已创建，参数数量: {len(split_toning_params)}")
            else:
                # 即使没有色调分离数据，也创建空面板
                logger.warning("【_format_lightroom】色调分离数据为空，创建默认色调分离面板")
                panels.append({
                    "title": "色调分离",
                    "description": "高光和阴影的色调分离调整",
                    "params": [],
                })
            
            # 6. 色调曲线面板（从 tone_curve 中提取）
            # 【新增】根据设计规范，需要添加色调曲线面板
            # 【修复】问题1：确保RGB曲线数据正确传递
            # 【修复】问题2：确保曲线点格式能被前端正确解析
            curve_params = []
            if tone_curve_obj:
                curve_reason = tone_curve_obj.get("reason", "")
                
                # 如果有 RGB 曲线点，添加参数
                # 【重要】RGB 曲线必须作为第一个参数，因为前端 parseCurveParams 会将包含 "rgb" 的参数解析到 luma 数组
                if tone_curve_points and len(tone_curve_points) > 0:
                    # 【修复】将曲线点转换为参数描述，格式："(x, y), (x, y), ..."
                    # 前端 parseCurveParams 会解析这个格式，并拆分成多个点
                    points_str = ", ".join([f"({p[0]}, {p[1]})" for p in tone_curve_points[:5]])  # 最多显示 5 个点
                    curve_params.append({
                        "name": "RGB 曲线",  # 【重要】名称必须包含 "RGB" 或 "rgb"，前端才能识别
                        "value": points_str,  # 格式："(0, 0), (128, 125), (255, 255)"
                        "reason": curve_reason if curve_reason else "色调曲线调整",
                    })
                    logger.info(f"【_format_lightroom】RGB 曲线已添加，点数: {len(tone_curve_points[:5])}, 值: {points_str}")
                else:
                    logger.warning("【_format_lightroom】RGB 曲线点为空，tone_curve_points = {tone_curve_points}")
                
                # 如果有红色通道曲线
                if rgb_curves.get("red") and len(rgb_curves["red"]) > 0:
                    red_points = rgb_curves["red"][:5]  # 最多显示 5 个点
                    red_str = ", ".join([f"({p[0]}, {p[1]})" for p in red_points])
                    curve_params.append({
                        "name": "红色通道曲线",
                        "value": red_str,
                        "reason": curve_reason if curve_reason else None,
                    })
                
                # 如果有绿色通道曲线
                if rgb_curves.get("green") and len(rgb_curves["green"]) > 0:
                    green_points = rgb_curves["green"][:5]
                    green_str = ", ".join([f"({p[0]}, {p[1]})" for p in green_points])
                    curve_params.append({
                        "name": "绿色通道曲线",
                        "value": green_str,
                        "reason": curve_reason if curve_reason else None,
                    })
                
                # 如果有蓝色通道曲线
                if rgb_curves.get("blue") and len(rgb_curves["blue"]) > 0:
                    blue_points = rgb_curves["blue"][:5]
                    blue_str = ", ".join([f"({p[0]}, {p[1]})" for p in blue_points])
                    curve_params.append({
                        "name": "蓝色通道曲线",
                        "value": blue_str,
                        "reason": curve_reason if curve_reason else None,
                    })
            
            # 添加色调曲线面板
            if curve_params:
                panels.append({
                    "title": "色调曲线",
                    "description": "RGB 和单通道曲线调整",
                    "params": curve_params,
                })
                logger.info(f"【_format_lightroom】色调曲线面板已创建，参数数量: {len(curve_params)}")
            else:
                # 即使没有曲线数据，也创建空面板
                logger.warning("【_format_lightroom】色调曲线数据为空，创建默认色调曲线面板")
                panels.append({
                    "title": "色调曲线",
                    "description": "RGB 和单通道曲线调整",
                    "params": [],
                })
            
            # 【修复】修正面板标题，使其符合设计规范
            # 1. 基础调整 -> 基本面板
            if panels and panels[0].get("title") == "基础调整":
                panels[0]["title"] = "基本面板"
                logger.info("【_format_lightroom】面板标题已修正：基础调整 -> 基本面板")
            
            # 2. 存在感 -> 细节与质感
            if len(panels) > 1 and panels[1].get("title") == "存在感":
                panels[1]["title"] = "细节与质感"
                logger.info("【_format_lightroom】面板标题已修正：存在感 -> 细节与质感")
            
            # 【日志记录】记录构建的 panels 数量
            logger.info(f"【_format_lightroom】构建的 panels 数量: {len(panels)}, taskId=unknown")
            logger.info(f"【_format_lightroom】panels 标题列表: {[p.get('title') for p in panels]}")
            
            # 【详细日志】检查 panels 的内容，确保每个 panel 都有有效数据
            for idx, panel in enumerate(panels):
                has_title = bool(panel.get("title"))
                has_description = bool(panel.get("description"))
                has_params = bool(panel.get("params") and len(panel.get("params", [])) > 0)
                logger.debug(f"【_format_lightroom】panel[{idx}]: title={has_title}, description={has_description}, params={has_params}, params_count={len(panel.get('params', []))}")
                if not has_title or not has_params:
                    logger.warning(f"【_format_lightroom】⚠️ panel[{idx}] 内容不完整: {json.dumps(panel, ensure_ascii=False)[:200]}")
            
            return {
                "naturalLanguage": {
                    "panelSummary": "",
                    "localAdjustments": "",
                },
                "structured": {
                    "panels": panels,
                    "toneCurve": tone_curve_points,
                    "rgbCurves": rgb_curves,
                    "colorGrading": color_grading,
                    "localAdjustments": raw.get("lightroom_local_adjustments", []),
                },
            }
        else:
            # 【旧结构】向后兼容：使用 lightroom 和 lightroom_panels
            logger.info("【_format_lightroom】使用旧 Part2 Prompt 结构 (lightroom/lightroom_panels)")
            
            lr = raw.get("lightroom", {})
            
            panels = raw.get("lightroom_panels", [])
            if not panels:
                # 如果没有 panels，从 lightroom 对象构建
                # 【修复】根据设计规范，创建 6 个面板
                panels = []
                
                # 1. 基本面板
                basic_params = []
                for param_name in ["exposure", "contrast", "highlights", "shadows", "whites", "blacks"]:
                    param_value = lr.get(param_name, "+0")
                    param_name_cn = get_param_name_cn(param_name)
                    basic_params.append({
                        "name": param_name_cn,
                        "value": ensure_string(param_value),
                    })
                panels.append({
                    "title": "基本面板",
                    "description": "基础曝光和对比度调整",
                    "params": basic_params,
                })
                
                # 2. 细节与质感
                presence_params = []
                for param_name in ["texture", "clarity", "dehaze"]:
                    param_value = lr.get(param_name, "+0")
                    param_name_cn = get_param_name_cn(param_name)
                    presence_params.append({
                        "name": param_name_cn,
                        "value": ensure_string(param_value),
                    })
                panels.append({
                    "title": "细节与质感",
                    "description": "纹理、清晰度和去雾调整",
                    "params": presence_params,
                })
                
                # 3. 色彩调整
                color_params = []
                for param_name in ["saturation", "vibrance"]:
                    param_value = lr.get(param_name, "+0")
                    param_name_cn = get_param_name_cn(param_name)
                    color_params.append({
                        "name": param_name_cn,
                        "value": ensure_string(param_value),
                    })
                panels.append({
                    "title": "色彩调整",
                    "description": "饱和度和自然饱和度调整",
                    "params": color_params,
                })
                
                # 4. HSL/颜色
                hsl_params = []
                hsl_raw = lr.get("HSL", {})
                color_names = ["red", "orange", "yellow", "green", "aqua", "blue", "purple", "magenta"]
                color_names_cn = ["红", "橙", "黄", "绿", "青", "蓝", "紫", "洋红"]
                
                for en, cn in zip(color_names, color_names_cn):
                    hsl_data = hsl_raw.get(en, {})
                    if hsl_data:
                        h_val = str(hsl_data.get("hue", 0))
                        s_val = str(hsl_data.get("saturation", 0))
                        l_val = str(hsl_data.get("luminance", 0))
                        
                        if h_val != "0" or s_val != "0" or l_val != "0":
                            hsl_params.append({
                                "name": f"{cn}色相",
                                "value": h_val,
                            })
                            hsl_params.append({
                                "name": f"{cn}饱和度",
                                "value": s_val,
                            })
                            hsl_params.append({
                                "name": f"{cn}明度",
                                "value": l_val,
                            })
                
                panels.append({
                    "title": "HSL/颜色",
                    "description": "色相、饱和度和明度调整",
                    "params": hsl_params,
                })
                
                # 5. 色调分离
                split_toning_params = []
                color_grading_old = lr.get("color_grading", {})
                if color_grading_old:
                    highlights = color_grading_old.get("highlights", {})
                    shadows = color_grading_old.get("shadows", {})
                    balance = color_grading_old.get("balance", 0)
                    
                    if highlights:
                        h_hue = highlights.get("hue", 0)
                        h_sat = highlights.get("saturation", 0)
                        if h_hue != 0 or h_sat != 0:
                            split_toning_params.append({
                                "name": "高光色相",
                                "value": str(h_hue),
                            })
                            split_toning_params.append({
                                "name": "高光饱和度",
                                "value": str(h_sat),
                            })
                    
                    if shadows:
                        s_hue = shadows.get("hue", 0)
                        s_sat = shadows.get("saturation", 0)
                        if s_hue != 0 or s_sat != 0:
                            split_toning_params.append({
                                "name": "阴影色相",
                                "value": str(s_hue),
                            })
                            split_toning_params.append({
                                "name": "阴影饱和度",
                                "value": str(s_sat),
                            })
                    
                    if balance != 0:
                        split_toning_params.append({
                            "name": "平衡",
                            "value": str(balance),
                        })
                
                panels.append({
                    "title": "色调分离",
                    "description": "高光和阴影的色调分离调整",
                    "params": split_toning_params,
                })
                
                # 6. 色调曲线
                curve_params = []
                tone_curve_old = lr.get("tone_curve", [])
                rgb_curves_old = lr.get("rgb_curves", {})
                
                if tone_curve_old and len(tone_curve_old) > 0:
                    points_str = ", ".join([f"({p[0]}, {p[1]})" for p in tone_curve_old[:5]])
                    curve_params.append({
                        "name": "RGB 曲线",
                        "value": points_str,
                        "reason": "色调曲线调整",
                    })
                
                if rgb_curves_old:
                    for channel in ["red", "green", "blue"]:
                        channel_curve = rgb_curves_old.get(channel, [])
                        if channel_curve and len(channel_curve) > 0:
                            channel_points = channel_curve[:5]
                            channel_str = ", ".join([f"({p[0]}, {p[1]})" for p in channel_points])
                            channel_name_cn = {"red": "红色", "green": "绿色", "blue": "蓝色"}.get(channel, channel)
                            curve_params.append({
                                "name": f"{channel_name_cn}通道曲线",
                                "value": channel_str,
                            })
                
                panels.append({
                    "title": "色调曲线",
                    "description": "RGB 和单通道曲线调整",
                    "params": curve_params,
                })
                
                logger.info(f"【_format_lightroom】旧结构：构建了 {len(panels)} 个面板")
                logger.info(f"【_format_lightroom】旧结构：panels 标题列表: {[p.get('title') for p in panels]}")

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
        """
        格式化 Photoshop 步骤（Part2）
        
        支持两种数据结构：
        1. 新结构（当前使用）：photoshop_workflow.logic_check、camera_raw_filter、ps_curves_adjustment、selective_color、local_dodge_burn、atmosphere_glow、details_sharpening、grain_texture、vignette、final_levels
        2. 旧结构（向后兼容）：photoshop.steps
        """
        # 优先使用新结构（photoshop_workflow）
        ps_workflow = raw.get("photoshop_workflow", {})
        
        if ps_workflow:
            # 【新结构】使用 photoshop_workflow
            logger.info("使用新 Part2 Prompt 结构 (photoshop_workflow)")
            
            steps = []
            
            # 1. Camera Raw 滤镜（camera_raw_filter）
            camera_raw = ps_workflow.get("camera_raw_filter", {})
            if camera_raw:
                exposure_tweak = camera_raw.get("exposure_tweak", {})
                contrast_tweak = camera_raw.get("contrast_tweak", {})
                
                if exposure_tweak or contrast_tweak:
                    step_params = []
                    if exposure_tweak:
                        step_params.append({
                            "name": "曝光微调",
                            "value": exposure_tweak.get("val", "+0") if isinstance(exposure_tweak, dict) else str(exposure_tweak),
                            "reason": exposure_tweak.get("reason", "") if isinstance(exposure_tweak, dict) else "",
                        })
                    if contrast_tweak:
                        step_params.append({
                            "name": "对比度微调",
                            "value": contrast_tweak.get("val", "+0") if isinstance(contrast_tweak, dict) else str(contrast_tweak),
                            "reason": contrast_tweak.get("reason", "") if isinstance(contrast_tweak, dict) else "",
                        })
                    
                    steps.append({
                        "title": "Camera Raw 滤镜",
                        "description": "在 Photoshop 中打开 Camera Raw 滤镜进行微调",
                        "params": step_params,
                        "details": "",
                    })
            
            # 2. PS 曲线调整（ps_curves_adjustment）
            ps_curves = ps_workflow.get("ps_curves_adjustment", {})
            if ps_curves:
                # 【新增】解析 PS 曲线调整的参数（类似 Lightroom 的处理）
                ps_curve_params = []
                curve_reason = ps_curves.get("reason", "") if isinstance(ps_curves, dict) else ""
                
                # 提取 RGB 曲线点（如果存在）
                # 支持多种可能的字段名：rgb_points, points_rgb, rgb_curve_points
                rgb_points = (
                    ps_curves.get("rgb_points", []) or
                    ps_curves.get("points_rgb", []) or
                    ps_curves.get("rgb_curve_points", [])
                ) if isinstance(ps_curves, dict) else []
                
                if rgb_points and len(rgb_points) > 0:
                    # 将曲线点转换为参数描述，格式："(x, y), (x, y), ..."
                    points_str = ", ".join([f"({p[0]}, {p[1]})" for p in rgb_points[:5]])  # 最多显示 5 个点
                    ps_curve_params.append({
                        "name": "RGB 曲线",  # 【重要】名称必须包含 "RGB" 或 "rgb"，前端才能识别
                        "value": points_str,  # 格式："(0, 0), (128, 125), (255, 255)"
                        "reason": curve_reason if curve_reason else "RGB 曲线调整",
                    })
                    logger.info(f"【_format_photoshop】RGB 曲线已添加，点数: {len(rgb_points[:5])}, 值: {points_str}")
                
                # 提取红色通道曲线点（如果存在）
                red_points = (
                    ps_curves.get("red_channel", []) or
                    ps_curves.get("points_red", []) or
                    ps_curves.get("red_curve_points", [])
                ) if isinstance(ps_curves, dict) else []
                
                if red_points and len(red_points) > 0:
                    red_str = ", ".join([f"({p[0]}, {p[1]})" for p in red_points[:5]])
                    ps_curve_params.append({
                        "name": "红色通道曲线",
                        "value": red_str,
                        "reason": curve_reason if curve_reason else None,
                    })
                    logger.info(f"【_format_photoshop】红色通道曲线已添加，点数: {len(red_points[:5])}, 值: {red_str}")
                
                # 提取绿色通道曲线点（如果存在）
                green_points = (
                    ps_curves.get("green_channel", []) or
                    ps_curves.get("points_green", []) or
                    ps_curves.get("green_curve_points", [])
                ) if isinstance(ps_curves, dict) else []
                
                if green_points and len(green_points) > 0:
                    green_str = ", ".join([f"({p[0]}, {p[1]})" for p in green_points[:5]])
                    ps_curve_params.append({
                        "name": "绿色通道曲线",
                        "value": green_str,
                        "reason": curve_reason if curve_reason else None,
                    })
                    logger.info(f"【_format_photoshop】绿色通道曲线已添加，点数: {len(green_points[:5])}, 值: {green_str}")
                
                # 提取蓝色通道曲线点（如果存在）
                blue_points = (
                    ps_curves.get("blue_channel", []) or
                    ps_curves.get("points_blue", []) or
                    ps_curves.get("blue_curve_points", [])
                ) if isinstance(ps_curves, dict) else []
                
                if blue_points and len(blue_points) > 0:
                    blue_str = ", ".join([f"({p[0]}, {p[1]})" for p in blue_points[:5]])
                    ps_curve_params.append({
                        "name": "蓝色通道曲线",
                        "value": blue_str,
                        "reason": curve_reason if curve_reason else None,
                    })
                    logger.info(f"【_format_photoshop】蓝色通道曲线已添加，点数: {len(blue_points[:5])}, 值: {blue_str}")
                
                # 如果没有曲线点数据，但存在文本描述，仍然添加步骤（前端会显示提示）
                if not ps_curve_params:
                    logger.warning(f"【_format_photoshop】PS 曲线调整步骤已添加，但未检测到曲线点数据。ps_curves 内容: {ps_curves}")
                
                steps.append({
                    "title": "曲线调整",
                    "description": ps_curves.get("rgb_tweak", "") if isinstance(ps_curves, dict) else "",
                    "params": ps_curve_params,  # 【修复】传递解析后的参数，而不是空数组
                    "details": curve_reason,
                })
                logger.info(f"【_format_photoshop】PS 曲线调整步骤已添加，参数数量: {len(ps_curve_params)}")
            
            # 3. 可选颜色（selective_color）
            selective_color = ps_workflow.get("selective_color", {})
            if selective_color:
                color_params = []
                # 遍历所有颜色通道（red_cyan, red_magenta, yellow_magenta 等）
                for key, value in selective_color.items():
                    if key != "settings" and isinstance(value, dict):
                        color_params.append({
                            "name": key,
                            "value": value.get("val", "0"),
                            "reason": value.get("reason", ""),
                        })
                
                if color_params:
                    settings = selective_color.get("settings", "")
                    steps.append({
                        "title": "可选颜色",
                        "description": "使用可选颜色调整特定颜色通道",
                        "params": color_params,
                        "details": settings if settings else "",
                        "blendMode": "正常",
                        "opacity": "100%",
                    })
            
            # 4. 局部 Dodge & Burn（local_dodge_burn）
            dodge_burn = ps_workflow.get("local_dodge_burn", {})
            if dodge_burn:
                steps.append({
                    "title": "局部光影重塑",
                    "description": dodge_burn.get("method", "") if isinstance(dodge_burn, dict) else "",
                    "params": [
                        {
                            "name": "目标区域",
                            "value": dodge_burn.get("target_area", "") if isinstance(dodge_burn, dict) else "",
                            "reason": "",
                        },
                        {
                            "name": "画笔设置",
                            "value": dodge_burn.get("brush_settings", "") if isinstance(dodge_burn, dict) else "",
                            "reason": "",
                        },
                    ],
                    "details": dodge_burn.get("reason", "") if isinstance(dodge_burn, dict) else "",
                })
            
            # 5. 氛围光晕（atmosphere_glow）
            atmosphere_glow = ps_workflow.get("atmosphere_glow", {})
            if atmosphere_glow:
                steps.append({
                    "title": "氛围光晕",
                    "description": atmosphere_glow.get("method", "") if isinstance(atmosphere_glow, dict) else "",
                    "params": [
                        {
                            "name": "步骤",
                            "value": atmosphere_glow.get("steps", "") if isinstance(atmosphere_glow, dict) else "",
                            "reason": "",
                        },
                        {
                            "name": "不透明度",
                            "value": atmosphere_glow.get("opacity", "") if isinstance(atmosphere_glow, dict) else "",
                            "reason": "",
                        },
                    ],
                    "details": atmosphere_glow.get("reason", "") if isinstance(atmosphere_glow, dict) else "",
                })
            
            # 6. 细节锐化（details_sharpening）
            sharpening = ps_workflow.get("details_sharpening", {})
            if sharpening:
                steps.append({
                    "title": "细节锐化",
                    "description": sharpening.get("method", "") if isinstance(sharpening, dict) else "",
                    "params": [
                        {
                            "name": "半径",
                            "value": sharpening.get("radius", "") if isinstance(sharpening, dict) else "",
                            "reason": "",
                        },
                        {
                            "name": "模式",
                            "value": sharpening.get("mode", "") if isinstance(sharpening, dict) else "",
                            "reason": "",
                        },
                    ],
                    "details": sharpening.get("reason", "") if isinstance(sharpening, dict) else "",
                })
            
            # 7. 颗粒纹理（grain_texture）
            grain = ps_workflow.get("grain_texture", {})
            if grain:
                steps.append({
                    "title": "颗粒纹理",
                    "description": f"添加{grain.get('type', '')}颗粒" if isinstance(grain, dict) else "",
                    "params": [
                        {
                            "name": "数量",
                            "value": grain.get("amount", "") if isinstance(grain, dict) else "",
                            "reason": "",
                        },
                        {
                            "name": "大小",
                            "value": grain.get("size", "") if isinstance(grain, dict) else "",
                            "reason": "",
                        },
                        {
                            "name": "粗糙度",
                            "value": grain.get("roughness", "") if isinstance(grain, dict) else "",
                            "reason": "",
                        },
                    ],
                    "details": grain.get("reason", "") if isinstance(grain, dict) else "",
                })
            
            # 8. 暗角（vignette）
            vignette = ps_workflow.get("vignette", {})
            if vignette:
                steps.append({
                    "title": "暗角",
                    "description": "添加暗角效果",
                    "params": [
                        {
                            "name": "数量",
                            "value": vignette.get("amount", "") if isinstance(vignette, dict) else "",
                            "reason": "",
                        },
                        {
                            "name": "中点",
                            "value": vignette.get("midpoint", "") if isinstance(vignette, dict) else "",
                            "reason": "",
                        },
                        {
                            "name": "圆度",
                            "value": vignette.get("roundness", "") if isinstance(vignette, dict) else "",
                            "reason": "",
                        },
                        {
                            "name": "羽化",
                            "value": vignette.get("feather", "") if isinstance(vignette, dict) else "",
                            "reason": "",
                        },
                    ],
                    "details": vignette.get("reason", "") if isinstance(vignette, dict) else "",
                })
            
            # 9. 最终色阶（final_levels）
            final_levels = ps_workflow.get("final_levels", {})
            if final_levels:
                steps.append({
                    "title": "最终色阶",
                    "description": "调整最终输出的黑白场",
                    "params": [
                        {
                            "name": "输入黑色",
                            "value": final_levels.get("input_black", "") if isinstance(final_levels, dict) else "",
                            "reason": "",
                        },
                        {
                            "name": "输入白色",
                            "value": final_levels.get("input_white", "") if isinstance(final_levels, dict) else "",
                            "reason": "",
                        },
                        {
                            "name": "中点",
                            "value": final_levels.get("midpoint", "") if isinstance(final_levels, dict) else "",
                            "reason": "",
                        },
                    ],
                    "details": final_levels.get("reason", "") if isinstance(final_levels, dict) else "",
                })
            
            # 构建自然语言摘要
            logic_check = ps_workflow.get("logic_check", "")
            natural_language = {
                "cameraRaw": "",
                "colorGrading": "",
                "gradientMap": "",
                "localAdjustments": "",
                "finalPolish": logic_check if logic_check else "",
            }
            
            return {
                "naturalLanguage": natural_language,
                "structured": {
                    "steps": steps,
                },
            }
        else:
            # 【旧结构】向后兼容：使用 photoshop.steps
            logger.info("使用旧 Part2 Prompt 结构 (photoshop.steps)")
            
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
        """
        格式化色彩方案（Part2）
        
        支持两种数据结构：
        1. 新结构（当前使用）：color_science_scheme.white_balance、color_grading_wheels、hsl_detailed_12_colors
        2. 旧结构（向后兼容）：lightroom.temperature/tint、lightroom.color_grading、lightroom.HSL
        
        Args:
            raw: Gemini 返回的原始 JSON 数据
            
        Returns:
            标准化的色彩方案结构，包含 whiteBalance、grading、hsl 等字段
        """
        # 辅助函数：确保值为字符串格式（带正负号）
        def ensure_string(value, default="+0"):
            """将数值转换为字符串格式，带正负号"""
            if value is None:
                return default
            if isinstance(value, (int, float)):
                sign = "+" if value >= 0 else ""
                return f"{sign}{value}"
            return str(value)
        
        # 辅助函数：从范围字符串中提取数值（如 "+600 ~ +900" -> "+600"）
        def extract_range_value(range_str: str, default="+0") -> str:
            """从范围字符串中提取第一个值作为默认值"""
            if not range_str or not isinstance(range_str, str):
                return default
            # 匹配范围格式，如 "+600 ~ +900" 或 "+10 ~ +15"
            match = range_str.strip().split("~")[0].strip()
            return match if match else default
        
        # 辅助函数：从字符串中提取数字（如 "35°" -> 35）
        def extract_number(value: any) -> int:
            """从字符串或数字中提取整数值"""
            if isinstance(value, (int, float)):
                return int(value)
            if isinstance(value, str):
                # 匹配数字，如 "35°" -> 35
                match = value.replace("°", "").strip()
                try:
                    return int(float(match))
                except:
                    return 0
            return 0
        
        # 优先使用新结构（color_science_scheme）
        color_scheme = raw.get("color_science_scheme", {})
        
        if color_scheme:
            # 【新结构】使用 color_science_scheme
            logger.info("使用新 Part2 Prompt 结构 (color_science_scheme)")
            
            # 1. 白平衡（white_balance）
            white_balance = color_scheme.get("white_balance", {})
            temp_obj = white_balance.get("temperature", {})
            tint_obj = white_balance.get("tint", {})
            
            temp_value = temp_obj.get("value", "+0") if isinstance(temp_obj, dict) else "+0"
            temp_reason = temp_obj.get("reason", "") if isinstance(temp_obj, dict) else ""
            tint_value = tint_obj.get("value", "+0") if isinstance(tint_obj, dict) else "+0"
            tint_reason = tint_obj.get("reason", "") if isinstance(tint_obj, dict) else ""
            
            # 从范围字符串中提取值（如 "+600 ~ +900" -> "+600"）
            temp_range = extract_range_value(temp_value, "+0")
            tint_range = extract_range_value(tint_value, "+0")
            
            white_balance_result = {
                "temp": {
                    "range": temp_range,
                    "note": temp_reason if temp_reason else None,
                },
                "tint": {
                    "range": tint_range,
                    "note": tint_reason if tint_reason else None,
                },
            }
            
            # 2. 色彩分级（color_grading_wheels）
            color_grading_wheels = color_scheme.get("color_grading_wheels", {})
            highlights = color_grading_wheels.get("highlights", {})
            midtones = color_grading_wheels.get("midtones", {})
            shadows = color_grading_wheels.get("shadows", {})
            balance_str = color_grading_wheels.get("balance", "0")
            
            # 提取 balance 数值（如 "-20 (偏向阴影)" -> -20）
            balance_value = 0
            if isinstance(balance_str, str):
                match = balance_str.strip().split("(")[0].strip()
                try:
                    balance_value = int(float(match))
                except:
                    balance_value = 0
            elif isinstance(balance_str, (int, float)):
                balance_value = int(balance_str)
            
            grading_result = {
                "highlights": {
                    "hue": extract_number(highlights.get("hue", 0)),
                    "saturation": extract_number(highlights.get("saturation", 0)),
                },
                "midtones": {
                    "hue": extract_number(midtones.get("hue", 0)),
                    "saturation": extract_number(midtones.get("saturation", 0)),
                },
                "shadows": {
                    "hue": extract_number(shadows.get("hue", 0)),
                    "saturation": extract_number(shadows.get("saturation", 0)),
                },
                "balance": balance_value,
            }
            
            # 3. HSL 12 色详细调整（hsl_detailed_12_colors）
            hsl_12_colors = color_scheme.get("hsl_detailed_12_colors", {})
            
            # 颜色映射：新结构中的 12 色 -> 前端需要的 8 色
            # 新结构：red, orange, yellow, yellow_green, green, green_cyan, cyan, cyan_blue, blue, blue_purple, purple, magenta
            # 前端需要：红, 橙, 黄, 绿, 青, 蓝, 紫, 洋红
            color_mapping = {
                "red": "红",
                "orange": "橙",
                "yellow": "黄",
                "yellow_green": "绿",  # yellow_green 映射到 绿
                "green": "绿",
                "green_cyan": "青",  # green_cyan 映射到 青
                "cyan": "青",
                "cyan_blue": "蓝",  # cyan_blue 映射到 蓝
                "blue": "蓝",
                "blue_purple": "紫",  # blue_purple 映射到 紫
                "purple": "紫",
                "magenta": "洋红",
            }
            
            # 前端需要的 8 种颜色
            frontend_colors = ["红", "橙", "黄", "绿", "青", "蓝", "紫", "洋红"]
            hsl_list = []
            
            # 为每种前端颜色查找对应的新结构颜色数据
            for frontend_color in frontend_colors:
                # 找到映射到该前端颜色的新结构颜色键
                source_keys = [k for k, v in color_mapping.items() if v == frontend_color]
                
                # 优先使用第一个匹配的颜色数据
                hsl_data = None
                for key in source_keys:
                    if key in hsl_12_colors:
                        hsl_data = hsl_12_colors[key]
                        break
                
                # 如果找到数据，使用它；否则使用默认值
                if hsl_data and isinstance(hsl_data, dict):
                    hsl_list.append({
                        "color": frontend_color,
                        "hue": str(hsl_data.get("h", "0")),
                        "saturation": str(hsl_data.get("s", "0")),
                        "luminance": str(hsl_data.get("l", "0")),
                        "note": hsl_data.get("desc", ""),
                    })
                else:
                    # 如果没有找到数据，使用默认值
                    hsl_list.append({
                        "color": frontend_color,
                        "hue": "0",
                        "saturation": "0",
                        "luminance": "0",
                    })
            
            # 4. styleKey（从 phase_1_extraction 或 color_mapping 中提取）
            phase_1_extraction = raw.get("phase_1_extraction", {})
            # 【新增】优先使用 master_style_recap（流派识别），如果没有则使用 key_adjustment_strategy
            master_style_recap = phase_1_extraction.get("master_style_recap", "")
            style_key = phase_1_extraction.get("key_adjustment_strategy", "")
            # 如果 master_style_recap 存在，优先使用它作为 styleKey
            if master_style_recap:
                style_key = master_style_recap
            elif not style_key:
                # 如果没有，尝试从旧结构的 color_mapping 中获取
                color_mapping_old = raw.get("color_mapping", {})
                style_key = color_mapping_old.get("suggested_LUT", "")
            
            return {
                "naturalLanguage": {
                    "styleKey": style_key,
                    "whiteBalance": temp_reason + " " + tint_reason if temp_reason or tint_reason else "",
                    "colorGrading": "",
                    "hslAdjustments": "",
                },
                "structured": {
                    "styleKey": style_key,
                    "whiteBalance": white_balance_result,
                    "grading": grading_result,
                    "hsl": hsl_list,
                },
            }
        else:
            # 【旧结构】向后兼容：使用 lightroom 和 color_mapping
            logger.info("使用旧 Part2 Prompt 结构 (lightroom/color_mapping)")
            
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

            # 确保所有滑块都是字符串格式
            def ensure_string(value, default="+0"):
                if value is None:
                    return default
                if isinstance(value, (int, float)):
                    sign = "+" if value >= 0 else ""
                    return f"{sign}{value}"
                return str(value)
            
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

    def _convert_new_prompt_to_old_structure(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """
        将新 Prompt 结构转换为旧结构，以便后续处理
        
        新结构：
        - module_1_critique: 照片点评
        - module_2_composition: 构图分析
        - module_3_lighting_params: 光影参数
        
        旧结构：
        - professional_evaluation: 照片点评
        - composition: 构图分析
        - lighting: 光影参数（在 _format_lighting 中处理）
        """
        converted = {}
        
        # 转换 module_1_critique -> professional_evaluation
        module_1 = raw.get("module_1_critique", {})
        if module_1:
            converted["professional_evaluation"] = {
                "comprehensive_review": module_1.get("comprehensive_review", ""),
                "visual_subject_analysis": module_1.get("visual_subject_analysis", ""),
                "focus_exposure_analysis": module_1.get("focus_exposure_analysis", ""),
                "color_depth_analysis": module_1.get("color_depth_analysis", {}),  # 包含直方图数据
                "emotion": module_1.get("emotion", ""),
                "pros_evaluation": module_1.get("pros_evaluation", ""),
                "parameter_comparison_table": module_1.get("parameter_comparison_table", []),
                "style_summary": module_1.get("style_summary", ""),
                "feasibility_assessment": module_1.get("feasibility_assessment", {}),
            }
            # 保留新结构以便后续处理
            converted["module_1_critique"] = module_1
        
        # 转换 module_2_composition -> composition
        module_2 = raw.get("module_2_composition", {})
        if module_2:
            # 保留新结构以便后续处理
            converted["module_2_composition"] = module_2
        
        # 转换 module_3_lighting_params -> lighting
        module_3 = raw.get("module_3_lighting_params", {})
        if module_3:
            # 保留新结构以便后续处理
            converted["module_3_lighting_params"] = module_3
        
        # 保留其他字段
        for key, value in raw.items():
            if key not in ["module_1_critique", "module_2_composition", "module_3_lighting_params"]:
                converted[key] = value
        
        return converted

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

