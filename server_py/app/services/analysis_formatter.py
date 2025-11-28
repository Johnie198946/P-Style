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

# 👇👇👇 加入这行测试代码 👇👇👇
print("\n" + "="*50)
print("🚀 正在加载 AnalysisFormatter (版本检查: V2025-Fixed-X)")
print("="*50 + "\n")


class AnalysisFormatter:
    """分析结果格式化器"""

    PROTOCOL_VERSION = "2025-02"

    def _normalize_point(self, val: Any, max_ref: Optional[float] = None) -> float:
        """
        辅助函数：归一化单个坐标值
        
        Args:
            val: 坐标值（可能是像素值、百分比、或 0-1 的小数）
            max_ref: 参考最大值（用于像素值转换，通常是图片宽度或高度）
        
        Returns:
            归一化后的百分比值 (0-100)
        """
        if val is None:
            return 0.0
        
        try:
            f_val = float(val)
            # 如果大于 100 且提供了 max_ref，说明是像素值，需要转换
            if f_val > 100 and max_ref:
                return (f_val / max_ref) * 100
            # 如果 <= 1，说明已经是 0-1 的小数，需要转换为百分比
            elif f_val <= 1:
                return f_val * 100
            # 如果已经在 1-100 之间，直接返回（已经是百分比）
            elif 1 < f_val <= 100:
                return f_val
            # 如果大于 100 但没有 max_ref，可能是错误的像素值，尝试假设是常见分辨率
            elif f_val > 100:
                # 假设是常见分辨率（1920 或 1080），进行转换
                assumed_max = 1920 if f_val > 1000 else 1080
                return (f_val / assumed_max) * 100
            else:
                return 0.0
        except (ValueError, TypeError):
            logger.warning(f"_normalize_point: 无法转换坐标值 {val}，使用默认值 0")
            return 0.0

    def _normalize_visual_mass(self, visual_mass: Dict[str, Any], image_width: Optional[int] = None, image_height: Optional[int] = None) -> Dict[str, Any]:
        """
        归一化 visual_mass 数据中的坐标
        
        Args:
            visual_mass: visual_mass 数据字典
            image_width: 图片宽度（可选，用于像素值转换）
            image_height: 图片高度（可选，用于像素值转换）
        
        Returns:
            归一化后的 visual_mass 数据
        """
        if not visual_mass or not isinstance(visual_mass, dict):
            return visual_mass
        
        normalized = visual_mass.copy()
        
        # 1. 清洗中心点（支持 center_point 和 center_of_gravity 两种格式）
        if "center_point" in normalized and isinstance(normalized["center_point"], dict):
            cp = normalized["center_point"]
            cp["x"] = self._normalize_point(cp.get("x"), image_width)
            cp["y"] = self._normalize_point(cp.get("y"), image_height)
        
        # 向后兼容：如果存在 center_of_gravity（数组格式），也进行归一化
        if "center_of_gravity" in normalized and isinstance(normalized["center_of_gravity"], list):
            cog = normalized["center_of_gravity"]
            if len(cog) >= 2:
                normalized["center_of_gravity"] = [
                    self._normalize_point(cog[0], image_width),
                    self._normalize_point(cog[1], image_height)
                ]
                # 如果 center_point 不存在，从 center_of_gravity 创建
                if "center_point" not in normalized:
                    normalized["center_point"] = {
                        "x": normalized["center_of_gravity"][0],
                        "y": normalized["center_of_gravity"][1]
                    }
        
        # 2. 清洗多边形点（支持 polygon_points 和 vertices 两种格式）
        # 优先使用 polygon_points（新格式），如果没有则使用 vertices（旧格式）
        polygon_points = None
        if "polygon_points" in normalized and isinstance(normalized["polygon_points"], list):
            polygon_points = normalized["polygon_points"]
        elif "vertices" in normalized and isinstance(normalized["vertices"], list):
            polygon_points = normalized["vertices"]
        
        if polygon_points:
            normalized_polygon = []
            for point in polygon_points:
                if isinstance(point, dict):
                    # 格式：{"x": number, "y": number}
                    normalized_polygon.append({
                        "x": self._normalize_point(point.get("x"), image_width),
                        "y": self._normalize_point(point.get("y"), image_height)
                    })
                elif isinstance(point, list) and len(point) >= 2:
                    # 格式：[x, y]
                    normalized_polygon.append({
                        "x": self._normalize_point(point[0], image_width),
                        "y": self._normalize_point(point[1], image_height)
                    })
            
            # 更新两个字段（保持向后兼容）
            normalized["polygon_points"] = normalized_polygon
            normalized["vertices"] = [[p["x"], p["y"]] for p in normalized_polygon]
        
        # 3. 确保 score 和 composition_rule 存在（如果缺失，设置默认值）
        if "score" not in normalized or normalized.get("score") is None:
            # 如果没有 score，尝试从 confidence 推断（confidence 通常是 0-1，转换为 0-100）
            if "confidence" in normalized and isinstance(normalized["confidence"], (int, float)):
                normalized["score"] = int(normalized["confidence"] * 100)
            else:
                normalized["score"] = 50  # 默认中等分数
        
        if "composition_rule" not in normalized or not normalized.get("composition_rule"):
            normalized["composition_rule"] = "Unknown"  # 默认值
        
        # 4. 确保 score 是整数且在 0-100 范围内
        try:
            score = int(normalized.get("score", 50))
            normalized["score"] = max(0, min(100, score))  # 限制在 0-100 范围内
        except (ValueError, TypeError):
            normalized["score"] = 50
        
        return normalized

    def _parse_range_string(self, range_str: str) -> Dict[str, str]:
        """
        解析范围字符串，支持多种格式
        
        支持的格式：
        1. 【新格式】Action(Value)|Reason："压暗 (-1.5) | 匹配低调氛围" → range: "-1.50", note: "匹配低调氛围", action: "压暗"
        2. 范围+描述："+0.3～+0.6，轻微提升使高光有"柔光"" → range: "+0.45", note: "轻微提升使高光有"柔光""
        3. 范围："+0.2 ~ +0.5" → range: "+0.35", note: ""
        4. 单个值："+0.3" → range: "+0.30", note: ""
        5. 描述："微调" → range: "+0", note: "微调"
        
        Args:
            range_str: 范围字符串
            
        Returns:
            {"range": str, "note": str, "action": str}  # action 字段可选
        """
        if not range_str or not isinstance(range_str, str):
            return {"range": "+0", "note": ""}
        
        range_str = range_str.strip()
        
        # 【新增】1. 尝试提取 "Action(Value)|Reason" 格式（新差距分析格式）
        # 例如："压暗 (-1.5) | 匹配低调氛围" 或 "提亮暗部 (+60) | 大幅提亮暗部"
        # 支持中英文括号和竖线分隔符
        action_value_reason_match = re.search(r'(.+?)\s*[（(]\s*([+-]?\d+\.?\d*)\s*[）)]\s*[|｜]\s*(.+)', range_str)
        if action_value_reason_match:
            action = action_value_reason_match.group(1).strip()
            val = float(action_value_reason_match.group(2))
            reason = action_value_reason_match.group(3).strip()
            return {
                "range": f"{val:+.2f}" if val != 0 else "+0",
                "note": reason,
                "action": action  # 【新增】保存动作描述
            }
        
        # 2. 尝试提取范围+描述格式（如："+0.3～+0.6，轻微提升使高光有"柔光""）
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
        
        # 3. 尝试提取范围格式（如："+0.2 ~ +0.5"）
        range_match = re.search(r'([+-]?\d+\.?\d*)\s*[～~]\s*([+-]?\d+\.?\d*)', range_str)
        if range_match:
            val1 = float(range_match.group(1))
            val2 = float(range_match.group(2))
            avg = (val1 + val2) / 2
            return {
                "range": f"{avg:+.2f}" if avg != 0 else "+0",
                "note": ""
            }
        
        # 4. 尝试提取 "范围 (描述)" 格式（如："-30 (保护高光细节)" 或 "+60 (大幅提亮暗部)"）
        # 【新增】支持 Gemini 返回的格式：数值后跟括号内的描述
        paren_match = re.search(r'([+-]?\d+\.?\d*)\s*[（(]\s*(.+?)\s*[）)]', range_str)
        if paren_match:
            val = float(paren_match.group(1))
            description = paren_match.group(2).strip()
            return {
                "range": f"{val:+.2f}" if val != 0 else "+0",
                "note": description
            }
        
        # 5. 尝试提取单个数值（如："+0.3" 或 "约 +0.3EV"）
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

    def format_part1(self, gemini_json: Union[str, Dict[str, Any], List[Any]], feasibility_result: Optional[Dict[str, Any]] = None, saliency_mask_url: Optional[str] = None) -> Dict[str, Any]:
        """
        格式化 Part1 结果
        使用 Pydantic Schema 进行严格验证
        
        Args:
            gemini_json: Gemini 返回的 JSON 字符串、字典或数组（根据实际响应格式）
            feasibility_result: 可行性评估结果（可选）
            saliency_mask_url: 显著性遮罩图 URL（可选，用于前端 Visual Mass 功能）
        
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
                # 【新增】传递显著性遮罩图 URL 到 _format_composition
                # 【修复】传递图片尺寸参数，用于坐标归一化
                # 【重要】由于 Gemini 返回的是百分比坐标（0-100），所以不需要图片尺寸
                # 但为了兼容性，仍然传递 None（如果后续需要像素值转换，可以从其他地方获取）
                composition_result = self._format_composition(
                    raw_data, 
                    saliency_mask_url=saliency_mask_url,
                    image_width=None,  # Gemini 返回百分比坐标，不需要像素尺寸
                    image_height=None  # Gemini 返回百分比坐标，不需要像素尺寸
                )
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
            # 【重要】优先使用 Gemini 返回的 feasibility_assessment，如果没有则使用 CV 算法的 feasibility_result
            # 检查 Gemini 是否返回了 feasibility_assessment（在 photoReview.structured.feasibility 中）
            gemini_feasibility = None
            if "structured" in structured["sections"]["photoReview"]:
                photo_review_structured = structured["sections"]["photoReview"]["structured"]
                if "feasibility" in photo_review_structured and photo_review_structured["feasibility"]:
                    gemini_feasibility = photo_review_structured["feasibility"]
                    logger.debug("检测到 Gemini 返回的 feasibility_assessment，优先使用")
            
            if feasibility_result:
                # 确保 feasibility_result 是字典类型
                if not isinstance(feasibility_result, dict):
                    logger.warning(f"feasibility_result 不是字典类型: {type(feasibility_result)}, 使用空字典")
                    feasibility_result = {}
                
                # 提取可行性数据（根据开发方案，feasibility_result 应该包含这些字段）
                # 【重要】如果 Gemini 返回了 feasibility_assessment，优先使用 Gemini 的数据
                # 否则使用 CV 算法的 feasibility_result
                if gemini_feasibility:
                    # 优先使用 Gemini 的 score、level、recommendation、confidence
                    feasibility_score = gemini_feasibility.get("score", 0) or feasibility_result.get("feasibilityScore", 0)
                    difficulty = gemini_feasibility.get("level", "") or feasibility_result.get("difficulty", "未知")
                    recommendation = (gemini_feasibility.get("recommendation") or 
                                    gemini_feasibility.get("conversion_feasibility", {}).get("recommendation") or 
                                    feasibility_result.get("explanation", ""))
                    confidence = gemini_feasibility.get("confidence", "") or feasibility_result.get("confidence", 0)
                    # 【修复】提取 limitations：Gemini 返回的可能是字符串（包含限制因素和评分逻辑）
                    # 根据 Prompt 模版，Gemini 应该输出字符串格式的 limitations
                    gemini_limitations = gemini_feasibility.get("limitations", "")
                    limiting_factors = (gemini_limitations if isinstance(gemini_limitations, str) else 
                                      gemini_feasibility.get("conversion_feasibility", {}).get("limiting_factors", []) or 
                                      feasibility_result.get("limiting_factors", []))
                    logger.debug(f"使用 Gemini 的可行性数据: score={feasibility_score}, level={difficulty}, recommendation={recommendation[:50] if recommendation else 'empty'}...")
                    logger.debug(f"使用 Gemini 的可行性数据: limitations 类型 = {type(limiting_factors)}, 值 = {str(limiting_factors)[:100] if limiting_factors else 'empty'}...")
                else:
                    # 使用 CV 算法的数据
                    feasibility_score = feasibility_result.get("feasibilityScore", 0)
                    difficulty = feasibility_result.get("difficulty", "未知")
                    recommendation = feasibility_result.get("explanation", "")
                    confidence = feasibility_result.get("confidence", 0)
                    limiting_factors = feasibility_result.get("limiting_factors", [])
                    logger.debug(f"使用 CV 算法的可行性数据: feasibilityScore={feasibility_score}, difficulty={difficulty}, explanation={recommendation[:50] if recommendation else 'empty'}...")
                    logger.debug(f"使用 CV 算法的可行性数据: limiting_factors 类型 = {type(limiting_factors)}, 值 = {str(limiting_factors)[:100] if limiting_factors else 'empty'}...")
                
                # 调试日志：记录可行性数据
                logger.debug(f"填充可行性信息: feasibilityScore = {feasibility_score}, difficulty = {difficulty}, confidence = {confidence}")
                logger.debug(f"填充可行性信息: limiting_factors 类型 = {type(limiting_factors)}, 值 = {str(limiting_factors)[:100] if limiting_factors else 'empty'}...")
                logger.debug(f"填充可行性信息: recommendation = {recommendation[:50] if recommendation else 'empty'}...")
                
                # 计算 can_transform（根据开发方案，feasibilityScore > 0.3 表示可转换）
                can_transform = float(feasibility_score) > 0.3 if isinstance(feasibility_score, (int, float)) else False
                
                # 【修复】确保 limiting_factors 格式统一：如果是数组，转换为字符串（用换行符连接）
                # 根据 Prompt 模版，Gemini 应该输出字符串格式的 limitations（包含限制因素和评分逻辑）
                # 但为了兼容 CV 算法返回的数组格式，需要统一处理
                if isinstance(limiting_factors, list):
                    # 如果是数组，转换为字符串（用换行符连接）
                    limiting_factors = '\n'.join(str(item) for item in limiting_factors if item)
                    logger.debug(f"填充可行性信息: limiting_factors 从数组转换为字符串，长度 = {len(limiting_factors)}")
                elif not isinstance(limiting_factors, str):
                    # 如果是其他类型，转换为字符串
                    limiting_factors = str(limiting_factors) if limiting_factors else ""
                    logger.warning(f"填充可行性信息: limiting_factors 类型异常: {type(limiting_factors)}, 转换为字符串")
                
                # 【重要】根据开发方案第 24 节，feasibility 应该放在 structured 中
                # 但为了向后兼容，也在 photoReview 顶层添加 feasibilityDescription
                # 注意：structured 中的 feasibility 已经由 _format_photo_review 填充，这里只需要在顶层添加 feasibilityDescription
                if "structured" in structured["sections"]["photoReview"]:
                    # 确保 structured 中的 feasibility 已正确填充（由 _format_photo_review 处理）
                    # 如果 Gemini 返回了 recommendation，更新 feasibility 中的 recommendation
                    if gemini_feasibility and recommendation:
                        if "feasibility" in structured["sections"]["photoReview"]["structured"]:
                            feasibility_obj = structured["sections"]["photoReview"]["structured"]["feasibility"]
                            if "conversion_feasibility" in feasibility_obj:
                                feasibility_obj["conversion_feasibility"]["recommendation"] = recommendation
                            if "recommendation" in feasibility_obj:
                                feasibility_obj["recommendation"] = recommendation
                    # 在顶层添加 feasibilityDescription 以便向后兼容
                    structured["sections"]["photoReview"]["feasibilityDescription"] = recommendation if recommendation else ""
                else:
                    # 如果 structured 不存在，直接添加 feasibility（向后兼容）
                    # 【修复】确保 limiting_factors 格式统一：如果是数组，转换为字符串
                    limiting_factors_for_cf = limiting_factors if isinstance(limiting_factors, list) else (
                        limiting_factors.split('\n') if isinstance(limiting_factors, str) and limiting_factors else []
                    )
                    structured["sections"]["photoReview"]["feasibility"] = {
                        "conversion_feasibility": {
                            "can_transform": can_transform,  # 布尔值，不是对象
                            "difficulty": str(difficulty) if difficulty else "未知",  # 字符串
                            "confidence": float(confidence) if isinstance(confidence, (int, float)) else 0.0,  # 数字
                            "limiting_factors": limiting_factors_for_cf,  # 数组格式（向后兼容）
                            "recommendation": recommendation,  # 【修复】使用优先的 recommendation
                        },
                        "feasibilityDescription": recommendation,  # 【修复】使用优先的 recommendation
                        # 【新增】顶层字段（便于前端直接访问）
                        "score": float(feasibility_score) if isinstance(feasibility_score, (int, float)) else 0.0,
                        "level": str(difficulty) if difficulty else "未知",
                        "recommendation": recommendation,
                        # 【修复】limitations 统一使用字符串格式（用于前端显示和解析）
                        "limitations": limiting_factors if isinstance(limiting_factors, str) else (
                            '\n'.join(str(item) for item in limiting_factors) if isinstance(limiting_factors, list) else ""
                        ),
                        "confidence": confidence if isinstance(confidence, (int, float)) else str(confidence) if confidence else "低",
                    }
            else:
                # 如果没有 feasibility_result，记录警告
                logger.warning("feasibility_result 为空，不填充可行性信息")

            # 使用 Pydantic Schema 验证（根据开发方案第 14 节）
            try:
                logger.info(">>> 正在进入 validate_part1_response...")
                validated = validate_part1_response(structured)
                # 验证并修复缺失字段
                self._validate_and_fix(validated)
                return validated
            except NameError as ne:
                # 🛑 专门捕获 NameError 并打印详细堆栈
                import traceback
                logger.error("🛑 捕获到 NameError (变量未定义)！")
                logger.error(f"❌ 错误详情: {str(ne)}")
                logger.error("📜 完整堆栈:\n" + traceback.format_exc())
                # 尝试从堆栈跟踪中提取文件名和行号
                if hasattr(ne, '__traceback__') and ne.__traceback__:
                    tb = ne.__traceback__
                    frame_count = 0
                    while tb and frame_count < 20:  # 限制最多20层，避免无限循环
                        filename = tb.tb_frame.f_code.co_filename
                        lineno = tb.tb_lineno
                        func_name = tb.tb_frame.f_code.co_name
                        # 读取该行的代码
                        try:
                            with open(filename, 'r', encoding='utf-8') as f:
                                code_lines = f.readlines()
                                if lineno <= len(code_lines):
                                    code_line = code_lines[lineno - 1].strip()
                                    logger.error(f"🛑 NameError 位置 {frame_count}: 文件={filename}, 行号={lineno}, 函数={func_name}, 代码={code_line}")
                        except Exception:
                            logger.error(f"🛑 NameError 位置 {frame_count}: 文件={filename}, 行号={lineno}, 函数={func_name}")
                        tb = tb.tb_next
                        frame_count += 1
                # 返回原始数据防止前端白屏
                logger.warning("⚠️ 由于 NameError，跳过 Schema 验证，返回原始 structured 数据")
                self._validate_and_fix(structured)
                return structured
            except Exception as schema_error:
                logger.warning(f"Part1 Schema 验证失败，使用兜底逻辑: {schema_error}")
                # 验证并修复缺失字段
                self._validate_and_fix(structured)
                return structured

        except Exception as e:
            # 👇👇👇 核弹级调试代码开始 👇👇👇
            import traceback
            import sys
            print("\n" + "!"*60)
            print("💥💥💥 抓到凶手了！详细报错如下：")
            print("!"*60)
            traceback.print_exc(file=sys.stdout)  # 强制打印堆栈到终端
            print("!"*60 + "\n")
            # 👆👆👆 核弹级调试代码结束 👆👆👆
            
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
                # 【新增】检查 simulatedHistogram 是否成功提取
                lightroom_structured = lightroom_result.get('structured', {}) if isinstance(lightroom_result, dict) else {}
                has_simulated_histogram = bool(lightroom_structured.get('simulatedHistogram'))
                logger.info(f"【format_part2】_format_lightroom simulatedHistogram 检查: 存在={has_simulated_histogram}")
                if has_simulated_histogram:
                    sim_hist = lightroom_structured.get('simulatedHistogram')
                    logger.info(f"【format_part2】simulatedHistogram 内容: description={bool(sim_hist.get('description'))}, rgb_values={bool(sim_hist.get('rgb_values'))}, histogram_data存在={sim_hist.get('histogram_data') is not None}")
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
                        "simulatedHistogram": None,  # 【修复】添加 simulatedHistogram 字段，即使为 None
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
                color_structured = color_result.get('structured', {}) if isinstance(color_result, dict) else {}
                logger.info(f"【format_part2】_format_color_part2 成功: has structured = {bool(color_structured)}, structured keys = {list(color_structured.keys()) if isinstance(color_structured, dict) else []}")
                # 【关键】检查三个新字段是否成功提取
                logger.info(f"【format_part2】_format_color_part2 phase_1_extraction 字段: master_style_recap = {bool(color_structured.get('master_style_recap'))}, style_summary_recap = {bool(color_structured.get('style_summary_recap'))}, key_adjustment_strategy = {bool(color_structured.get('key_adjustment_strategy'))}")
                if color_structured.get('master_style_recap'):
                    logger.info(f"【format_part2】master_style_recap 内容: {color_structured.get('master_style_recap')[:100]}...")
                if color_structured.get('style_summary_recap'):
                    logger.info(f"【format_part2】style_summary_recap 内容: {color_structured.get('style_summary_recap')[:100]}...")
                if color_structured.get('key_adjustment_strategy'):
                    logger.info(f"【format_part2】key_adjustment_strategy 内容: {color_structured.get('key_adjustment_strategy')[:100]}...")
            except Exception as e:
                logger.error(f"_format_color_part2 失败: {e}", exc_info=True)
                # 返回空结构，避免整个流程失败
                # 【修复】在异常处理的兜底逻辑中也包含三个字段，确保前端不会因为 undefined 而崩溃
                color_result = {
                    "naturalLanguage": {},
                    "structured": {
                        "styleKey": "",
                        "whiteBalance": {
                            "temp": {"range": "+0"},
                            "tint": {"range": "+0"},
                        },
                        "grading": {
                            "highlights": {"hue": 0, "saturation": 0, "reason": ""},  # 【修复】添加 reason 字段
                            "midtones": {"hue": 0, "saturation": 0, "reason": ""},  # 【修复】添加 reason 字段
                            "shadows": {"hue": 0, "saturation": 0, "reason": ""},  # 【修复】添加 reason 字段
                            "balance": 0,
                        },
                        "hsl": [],
                        # 【修复】确保三个字段至少是空字符串，而不是 undefined
                        "master_style_recap": "",
                        "style_summary_recap": "",
                        "key_adjustment_strategy": "",
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
        # 【修复】优先使用新结构 module_1_critique，如果没有则使用旧结构 professional_evaluation
        # 注意：如果 raw_data 经过了 _convert_new_prompt_to_old_structure 转换，module_1_critique 可能已经被转换
        # 但转换后的 professional_evaluation 中保留了所有字段，所以需要同时检查两个字段
        module_1 = raw.get("module_1_critique", {})
        pe = raw.get("professional_evaluation", {})
        
        # 【重要】如果 professional_evaluation 存在且包含新结构的字段（如 style_summary、comprehensive_review），
        # 说明已经经过转换，应该使用 professional_evaluation 而不是 module_1_critique
        # 但为了兼容，如果 module_1_critique 存在，优先使用 module_1_critique（原始数据）
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
            # 【新增】提取 overlays 字段（区域坐标数据，用于前端图片高亮显示）
            # 【重要】支持新旧三种格式：
            # 1. 最新格式（空间分析大一统）：spatial_analysis.ref_overlays 和 spatial_analysis.user_overlays
            # 2. 新格式：overlays.reference_overlays 和 overlays.user_overlays（两套坐标）
            # 3. 旧格式：overlays.visual_subject/focus_exposure/color_depth（一套坐标，向后兼容）
            # 【优先】检查是否有 spatial_analysis（最新格式）
            spatial_analysis = module_1.get("spatial_analysis", {})
            if spatial_analysis and isinstance(spatial_analysis, dict):
                # ==========================================================
                # 🛠️ 核心修复：字段别名映射 (Alias Mapping)
                # 前端找 "visual_mass"，但 Gemini 可能生成 "ref_visual_mass_polygon"
                # ==========================================================
                if "visual_mass" not in spatial_analysis:
                    # 尝试从 ref_visual_mass_polygon 提取
                    if "ref_visual_mass_polygon" in spatial_analysis:
                        spatial_analysis["visual_mass"] = spatial_analysis["ref_visual_mass_polygon"]
                        logger.info(f"_format_photo_review (新结构): ✅ 字段映射成功：ref_visual_mass_polygon -> visual_mass")
                    # 或者尝试从 visual_mass_polygon 提取 (防止 AI 变名字)
                    elif "visual_mass_polygon" in spatial_analysis:
                        spatial_analysis["visual_mass"] = spatial_analysis["visual_mass_polygon"]
                        logger.info(f"_format_photo_review (新结构): ✅ 字段映射成功：visual_mass_polygon -> visual_mass")
                    else:
                        logger.warning(f"_format_photo_review (新结构): ⚠️ spatial_analysis 中没有 visual_mass、ref_visual_mass_polygon 或 visual_mass_polygon 字段")
                
                # 2. 清洗 Visual Mass 数据 (确保坐标和分数格式正确)
                visual_mass = spatial_analysis.get("visual_mass", {})
                if visual_mass and isinstance(visual_mass, dict):
                    # 确保 score 存在
                    if "score" not in visual_mass or visual_mass.get("score") is None:
                        # 如果没有 score，尝试从 confidence 推断（confidence 通常是 0-1，转换为 0-100）
                        if "confidence" in visual_mass and isinstance(visual_mass["confidence"], (int, float)):
                            visual_mass["score"] = int(visual_mass["confidence"] * 100)
                        else:
                            visual_mass["score"] = 85  # 默认保底分
                        logger.info(f"_format_photo_review (新结构): ✅ visual_mass.score 已设置默认值: {visual_mass['score']}")
                    
                    # 确保 composition_rule 存在
                    if "composition_rule" not in visual_mass or not visual_mass.get("composition_rule"):
                        visual_mass["composition_rule"] = "AI Composition Analysis"  # 默认值
                        logger.info(f"_format_photo_review (新结构): ✅ visual_mass.composition_rule 已设置默认值")
                    
                    # 坐标归一化处理 (调用之前写的 _normalize_point)
                    if "center_point" in visual_mass:
                        cp = visual_mass["center_point"]
                        # 兼容数组格式 [x, y] 或 对象格式 {x, y}
                        if isinstance(cp, list) and len(cp) >= 2:
                            visual_mass["center_point"] = {
                                "x": self._normalize_point(cp[0], None),  # 注意：这里不传入 image_width，因为 Gemini 应该已经返回百分比格式
                                "y": self._normalize_point(cp[1], None)
                            }
                            logger.debug(f"_format_photo_review (新结构): ✅ visual_mass.center_point 从数组格式转换为对象格式")
                        elif isinstance(cp, dict):
                            cp["x"] = self._normalize_point(cp.get("x"), None)
                            cp["y"] = self._normalize_point(cp.get("y"), None)
                            logger.debug(f"_format_photo_review (新结构): ✅ visual_mass.center_point 坐标已归一化")
                    
                    # 多边形点清洗
                    if "polygon_points" in visual_mass:
                        points = visual_mass["polygon_points"]
                        if isinstance(points, list):
                            clean_points = []
                            for p in points:
                                # 兼容数组格式 [x, y]
                                if isinstance(p, list) and len(p) >= 2:
                                    clean_points.append({
                                        "x": self._normalize_point(p[0], None),
                                        "y": self._normalize_point(p[1], None)
                                    })
                                # 兼容对象格式 {x, y}
                                elif isinstance(p, dict):
                                    p["x"] = self._normalize_point(p.get("x"), None)
                                    p["y"] = self._normalize_point(p.get("y"), None)
                                    clean_points.append(p)
                            visual_mass["polygon_points"] = clean_points
                            logger.debug(f"_format_photo_review (新结构): ✅ visual_mass.polygon_points 已清洗，共 {len(clean_points)} 个点")
                    
                    # 向后兼容：如果存在 vertices 但没有 polygon_points，从 vertices 创建 polygon_points
                    if "polygon_points" not in visual_mass or not visual_mass.get("polygon_points"):
                        if "vertices" in visual_mass and isinstance(visual_mass["vertices"], list):
                            vertices = visual_mass["vertices"]
                            polygon_points = []
                            for v in vertices:
                                if isinstance(v, list) and len(v) >= 2:
                                    polygon_points.append({
                                        "x": self._normalize_point(v[0], None),
                                        "y": self._normalize_point(v[1], None)
                                    })
                            if polygon_points:
                                visual_mass["polygon_points"] = polygon_points
                                logger.info(f"_format_photo_review (新结构): ✅ 从 vertices 创建 polygon_points，共 {len(polygon_points)} 个点")
                    
                    # 向后兼容：如果存在 center_of_gravity 但没有 center_point，从 center_of_gravity 创建 center_point
                    if "center_point" not in visual_mass or not visual_mass.get("center_point"):
                        if "center_of_gravity" in visual_mass:
                            cog = visual_mass["center_of_gravity"]
                            if isinstance(cog, list) and len(cog) >= 2:
                                visual_mass["center_point"] = {
                                    "x": self._normalize_point(cog[0], None),
                                    "y": self._normalize_point(cog[1], None)
                                }
                                logger.info(f"_format_photo_review (新结构): ✅ 从 center_of_gravity 创建 center_point")
                    
                    logger.info(f"_format_photo_review (新结构): ✅ visual_mass 数据清洗完成: score={visual_mass.get('score', 'N/A')}, composition_rule={visual_mass.get('composition_rule', 'N/A')}, has_center_point={bool(visual_mass.get('center_point'))}, has_polygon_points={bool(visual_mass.get('polygon_points'))}")
                
                # 最新格式：从 spatial_analysis 中提取
                overlays_raw = {
                    "reference_overlays": spatial_analysis.get("ref_overlays", {}),
                    "user_overlays": spatial_analysis.get("user_overlays", {})
                }
                logger.info(f"_format_photo_review (新结构): ✅ 检测到最新格式（spatial_analysis），从 spatial_analysis 中提取 overlays")
            else:
                # 旧格式：从 overlays 中提取
                overlays_raw = module_1.get("overlays", {})
                logger.info(f"_format_photo_review (新结构): 使用旧格式（overlays），从 module_1.overlays 中提取")
            
            # 【增强日志】记录 Gemini 原始输出的 overlays 格式（用于排查问题）
            logger.info(f"_format_photo_review (新结构): Gemini 原始 overlays 类型 = {type(overlays_raw)}, keys = {list(overlays_raw.keys()) if isinstance(overlays_raw, dict) else 'not dict'}")
            if isinstance(overlays_raw, dict):
                logger.debug(f"_format_photo_review (新结构): Gemini 原始 overlays 完整内容 = {overlays_raw}")
            
            # 【修复】提取两套 overlays 坐标（参考图和用户图）
            reference_overlays = {}
            user_overlays = {}
            
            if isinstance(overlays_raw, dict):
                # 检查是否是新格式（包含 reference_overlays 和 user_overlays）
                if "reference_overlays" in overlays_raw and "user_overlays" in overlays_raw:
                    reference_overlays = overlays_raw.get("reference_overlays", {})
                    user_overlays = overlays_raw.get("user_overlays", {})
                    logger.info(f"_format_photo_review (新结构): ✅ 检测到新格式 overlays（两套坐标）")
                    logger.info(f"_format_photo_review (新结构): reference_overlays keys = {list(reference_overlays.keys())}, user_overlays keys = {list(user_overlays.keys())}")
                    # 【新增】验证两套坐标是否不同（如果完全相同，记录警告）
                    if reference_overlays == user_overlays:
                        logger.warning(f"_format_photo_review (新结构): ⚠️⚠️⚠️ 警告：reference_overlays 和 user_overlays 的坐标完全相同！")
                        logger.warning(f"_format_photo_review (新结构): ⚠️⚠️⚠️ 这通常表示 Gemini 没有正确分析两张图片，可能将参考图和用户图混淆了，或者只分析了一张图片。")
                        logger.warning(f"_format_photo_review (新结构): ⚠️⚠️⚠️ 建议检查 Prompt 模板，确保 Gemini 明确区分两张图片并输出不同的坐标。")
                        # 【新增】记录相同的坐标值，便于排查问题
                        if reference_overlays:
                            logger.warning(f"_format_photo_review (新结构): ⚠️ 相同的坐标值（两套坐标完全相同）：")
                            for key, rect in reference_overlays.items():
                                if isinstance(rect, dict):
                                    logger.warning(f"_format_photo_review (新结构): ⚠️   {key} = {{x: {rect.get('x', 'N/A')}, y: {rect.get('y', 'N/A')}, w: {rect.get('w', 'N/A')}, h: {rect.get('h', 'N/A')}}}")
                    else:
                        logger.info(f"_format_photo_review (新结构): ✅ 验证通过：reference_overlays 和 user_overlays 的坐标不同（符合预期）")
                        # 【新增】记录两套坐标的差异，便于验证
                        logger.debug(f"_format_photo_review (新结构): ✅ 两套坐标差异验证：")
                        for key in set(list(reference_overlays.keys()) + list(user_overlays.keys())):
                            ref_rect = reference_overlays.get(key, {})
                            user_rect = user_overlays.get(key, {})
                            if isinstance(ref_rect, dict) and isinstance(user_rect, dict):
                                ref_coords = f"x:{ref_rect.get('x', 'N/A')}, y:{ref_rect.get('y', 'N/A')}, w:{ref_rect.get('w', 'N/A')}, h:{ref_rect.get('h', 'N/A')}"
                                user_coords = f"x:{user_rect.get('x', 'N/A')}, y:{user_rect.get('y', 'N/A')}, w:{user_rect.get('w', 'N/A')}, h:{user_rect.get('h', 'N/A')}"
                                logger.debug(f"_format_photo_review (新结构): ✅   {key}: reference = {{{ref_coords}}}, user = {{{user_coords}}}")
                else:
                    # 旧格式：只有一套坐标，同时用于参考图和用户图（向后兼容）
                    reference_overlays = overlays_raw.copy()
                    user_overlays = overlays_raw.copy()
                    logger.warning(f"_format_photo_review (新结构): ⚠️⚠️⚠️ 检测到旧格式 overlays（只有一套坐标），将同时用于参考图和用户图。")
                    logger.warning(f"_format_photo_review (新结构): ⚠️⚠️⚠️ Gemini 输出格式不符合要求，缺少 reference_overlays 和 user_overlays 字段。")
                    logger.warning(f"_format_photo_review (新结构): ⚠️⚠️⚠️ 这是严重问题：Gemini 只输出了一套坐标，无法区分参考图和用户图的区域位置！")
                    logger.warning(f"_format_photo_review (新结构): ⚠️⚠️⚠️ 建议立即检查 Prompt 模板，确保 Gemini 输出新格式（包含 reference_overlays 和 user_overlays 两套坐标）。")
                    logger.warning(f"_format_photo_review (新结构): ⚠️⚠️⚠️ 旧格式 overlays keys = {list(overlays_raw.keys())}")
                    # 【新增】记录旧格式坐标的详细信息，便于排查问题
                    if overlays_raw:
                        for key, rect in overlays_raw.items():
                            if isinstance(rect, dict):
                                logger.warning(f"_format_photo_review (新结构): ⚠️ 旧格式 overlays.{key} = {{x: {rect.get('x', 'N/A')}, y: {rect.get('y', 'N/A')}, w: {rect.get('w', 'N/A')}, h: {rect.get('h', 'N/A')}}}")
            else:
                logger.error(f"_format_photo_review (新结构): ❌ overlays 不是字典类型，类型 = {type(overlays_raw)}")
            
            # 【修复】对坐标进行边界检查，防止溢出
            # 【防御性修复】确保所有坐标值在使用前都已正确处理 None 值，防止 TypeError 和 NameError
            def validate_and_fix_coords(overlays_dict: dict) -> dict:
                """
                验证并修复坐标，确保不溢出
                
                Args:
                    overlays_dict: 包含坐标的字典，格式为 {key: {x, y, w, h, label}}
                
                Returns:
                    修复后的坐标字典，所有坐标值都在 0-100 范围内，且 x+w ≤ 100, y+h ≤ 100
                """
                if not isinstance(overlays_dict, dict):
                    return {}
                fixed_overlays = {}
                for key, rect in overlays_dict.items():
                    if isinstance(rect, dict):
                        # 【防御性修复】确保所有坐标值在使用前都已正确处理 None 值
                        # 如果 rect.get("x") 返回 None，使用默认值 0
                        x_val = rect.get("x", 0)
                        y_val = rect.get("y", 0)
                        w_val = rect.get("w", 0)
                        h_val = rect.get("h", 0)
                        
                        # 【修复】处理 None 值：如果值为 None，使用默认值 0
                        if x_val is None:
                            x_val = 0
                        if y_val is None:
                            y_val = 0
                        if w_val is None:
                            w_val = 0
                        if h_val is None:
                            h_val = 0
                        
                        # 【修复】安全地将值转换为 float，防止 TypeError
                        # 【关键修复】初始化 x, y, w, h 为默认值，防止 NameError
                        x = 0
                        y = 0
                        w = 0
                        h = 0
                        try:
                            x = max(0, min(100, float(x_val)))
                            y = max(0, min(100, float(y_val)))
                            w = max(0, min(100, float(w_val)))
                            h = max(0, min(100, float(h_val)))
                        except (ValueError, TypeError) as e:
                            # 如果转换失败，使用默认值 0（已经在上面初始化）
                            logger.warning(f"_format_photo_review (新结构): ⚠️ 坐标值转换失败: {key} = {{x: {x_val}, y: {y_val}, w: {w_val}, h: {h_val}}}, 错误: {e}, 使用默认值 0")
                            # x, y, w, h 已经在上面初始化为 0，这里不需要再次赋值
                        
                        # 确保 x + w ≤ 100，y + h ≤ 100
                        if x + w > 100:
                            w = 100 - x
                        if y + h > 100:
                            h = 100 - y
                        
                        fixed_overlays[key] = {
                            "x": x,
                            "y": y,
                            "w": w,
                            "h": h,
                            "label": rect.get("label", key.upper())
                        }
                return fixed_overlays
            
            # 【新增】适配新的 key 名称：将 ref_visual_subject_box 等转换为 visual_subject
            # 原因：Prompt 模板使用"破坏性 Key 命名法"（ref_visual_subject_box）防止 Gemini 触发纠错机制，但前端期望标准 key 名称
            # 注意：现在使用破坏性命名（带 _box 后缀），复刻 AI 诊断的成功经验
            def normalize_overlay_keys(overlays_dict: dict, prefix: str) -> dict:
                """
                将带前缀和后缀的 key 名称转换为标准 key 名称
                
                Args:
                    overlays_dict: 原始 overlays 字典（可能包含 ref_visual_subject_box 等）
                    prefix: 前缀（"ref_" 或 "user_"）
                
                Returns:
                    标准化后的 overlays 字典（visual_subject、focus_exposure、color_depth）
                """
                if not isinstance(overlays_dict, dict):
                    return {}
                normalized = {}
                # 定义 key 映射规则：带前缀和后缀的 key -> 标准 key
                # 最新格式（破坏性命名）：ref_visual_subject_box -> visual_subject
                # 旧格式（向后兼容）：ref_visual_subject -> visual_subject
                key_mapping = {
                    f"{prefix}visual_subject_box": "visual_subject",  # 最新格式（破坏性命名）
                    f"{prefix}visual_subject": "visual_subject",     # 旧格式（向后兼容）
                    f"{prefix}focus_exposure_box": "focus_exposure",  # 最新格式（破坏性命名）
                    f"{prefix}focus_exposure": "focus_exposure",     # 旧格式（向后兼容）
                    f"{prefix}color_depth_box": "color_depth",        # 最新格式（破坏性命名）
                    f"{prefix}color_depth": "color_depth",            # 旧格式（向后兼容）
                }
                # 同时支持旧格式（不带前缀）和新格式（带前缀）
                for old_key, rect in overlays_dict.items():
                    # 如果 key 在映射表中，转换为标准 key
                    if old_key in key_mapping:
                        new_key = key_mapping[old_key]
                        normalized[new_key] = rect
                        logger.debug(f"_format_photo_review (新结构): ✅ Key 转换: {old_key} -> {new_key}")
                    # 如果 key 已经是标准格式，直接使用
                    elif old_key in ["visual_subject", "focus_exposure", "color_depth"]:
                        normalized[old_key] = rect
                        logger.debug(f"_format_photo_review (新结构): ✅ Key 已是标准格式: {old_key}")
                    # 其他未知 key，保留原样（向后兼容）
                    else:
                        normalized[old_key] = rect
                        logger.warning(f"_format_photo_review (新结构): ⚠️ 未知的 overlay key: {old_key}，保留原样")
                return normalized
            
            # 标准化 key 名称（将 ref_visual_subject 等转换为 visual_subject）
            reference_overlays = normalize_overlay_keys(reference_overlays, "ref_")
            user_overlays = normalize_overlay_keys(user_overlays, "user_")
            
            # 验证并修复参考图和用户图的坐标
            reference_overlays = validate_and_fix_coords(reference_overlays)
            user_overlays = validate_and_fix_coords(user_overlays)
            
            # 构建最终的 overlays 结构（包含两套坐标）
            # 【重要】无论 Gemini 输出新格式还是旧格式，后端都统一转换为 {reference: {...}, user: {...}} 格式
            # 这样前端可以统一处理，不需要关心 Gemini 输出的格式
            overlays = {
                "reference": reference_overlays,
                "user": user_overlays
            }
            
            # 【增强日志】记录最终输出的 overlays 结构
            logger.info(f"_format_photo_review (新结构): ✅ 最终 overlays 结构已构建，格式 = {{reference: {{...}}, user: {{...}}}}")
            logger.info(f"_format_photo_review (新结构): overlays.reference keys = {list(reference_overlays.keys())}, 坐标数量 = {len(reference_overlays)}")
            logger.info(f"_format_photo_review (新结构): overlays.user keys = {list(user_overlays.keys())}, 坐标数量 = {len(user_overlays)}")
            
            # 【详细日志】记录每套坐标的详细信息（仅在开发环境或调试模式）
            if reference_overlays:
                for key, rect in reference_overlays.items():
                    if isinstance(rect, dict):
                        logger.debug(f"_format_photo_review (新结构): overlays.reference.{key} = {{x: {rect.get('x', 'N/A')}, y: {rect.get('y', 'N/A')}, w: {rect.get('w', 'N/A')}, h: {rect.get('h', 'N/A')}, label: {rect.get('label', 'N/A')}}}")
            if user_overlays:
                for key, rect in user_overlays.items():
                    if isinstance(rect, dict):
                        logger.debug(f"_format_photo_review (新结构): overlays.user.{key} = {{x: {rect.get('x', 'N/A')}, y: {rect.get('y', 'N/A')}, w: {rect.get('w', 'N/A')}, h: {rect.get('h', 'N/A')}, label: {rect.get('label', 'N/A')}}}")
            # 【新增】提取风格分类字段（可选，保持向后兼容）
            style_classification = module_1.get("style_classification", {})
            master_archetype = ""
            visual_signature = ""
            if isinstance(style_classification, dict):
                master_archetype = style_classification.get("master_archetype", "")
                visual_signature = style_classification.get("visual_signature", "")
            # 【新增】如果 style_classification 不存在，尝试从扁平化字段提取
            if not master_archetype:
                master_archetype = module_1.get("master_archetype", "")
            if not visual_signature:
                visual_signature = module_1.get("visual_signature", "")
            
            # 【调试日志】记录提取的字段值（只记录前100个字符，避免日志过长）
            logger.debug(f"_format_photo_review (新结构): comprehensive_review = {comprehensive_review[:100] if comprehensive_review else 'empty'}...")
            logger.debug(f"_format_photo_review (新结构): visual_subject_analysis = {visual_subject_analysis[:100] if visual_subject_analysis else 'empty'}...")
            logger.debug(f"_format_photo_review (新结构): focus_exposure_analysis = {focus_exposure_analysis[:100] if focus_exposure_analysis else 'empty'}...")
            logger.debug(f"_format_photo_review (新结构): emotion = {emotion[:100] if emotion else 'empty'}...")
            logger.debug(f"_format_photo_review (新结构): pros_evaluation = {pros_evaluation[:100] if pros_evaluation else 'empty'}...")
            logger.debug(f"_format_photo_review (新结构): color_depth_analysis type = {type(color_depth_analysis)}, is_dict = {isinstance(color_depth_analysis, dict)}")
            
            # 提取直方图数据（兼容新旧两种结构）
            saturation_strategy = ""  # 【新增】饱和度策略
            tonal_intent = ""  # 【新增】影调意图
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
                "userDescription": "",  # 新结构中没有用户图描述，留空
                "description": color_depth_text if color_depth_text else ""  # 【兼容前端】添加 description 字段
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
                
                # 【修复】确保 limitations 格式统一：如果是数组，转换为字符串（用换行符连接）
                # 根据 Prompt 模版，Gemini 应该输出字符串格式的 limitations（包含限制因素和评分逻辑）
                # 但为了兼容 CV 算法返回的数组格式，需要统一处理
                if isinstance(limitations, list):
                    # 如果是数组，转换为字符串（用换行符连接）
                    limitations = '\n'.join(str(item) for item in limitations if item)
                    logger.debug(f"_format_photo_review (新结构): limitations 从数组转换为字符串，长度 = {len(limitations)}")
                elif not isinstance(limitations, str):
                    # 如果是其他类型，转换为字符串
                    limitations = str(limitations) if limitations else ""
                    logger.warning(f"_format_photo_review (新结构): limitations 类型异常: {type(limitations)}, 转换为字符串")
                
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
                
                # 【修复】确保 limitations 是字符串格式（用于前端显示）
                # 根据 Prompt 模版，Gemini 应该输出字符串格式的 limitations
                # 但为了兼容 CV 算法返回的数组格式，需要统一转换为字符串
                limitations_str = limitations if isinstance(limitations, str) else (
                    '\n'.join(str(item) for item in limitations) if isinstance(limitations, list) else str(limitations) if limitations else ""
                )
                
                feasibility_data = {
                    "conversion_feasibility": {
                        "can_transform": bool(can_transform),
                        "difficulty": str(level) if level else "未知",
                        "confidence": confidence_score,
                        # 【修复】limiting_factors 保持数组格式（向后兼容），但 limitations 使用字符串格式
                        "limiting_factors": limitations if isinstance(limitations, list) else (limitations.split('\n') if isinstance(limitations, str) and limitations else []),
                        "recommendation": str(recommendation) if recommendation else "",
                    },
                    "feasibilityDescription": str(recommendation) if recommendation else "",
                    # 【新增】顶层字段（便于前端直接访问）
                    "score": float(score) if isinstance(score, (int, float)) else 0.0,
                    "level": str(level) if level else "未知",
                    "recommendation": str(recommendation) if recommendation else "",  # 【重要】确保 recommendation 在顶层，便于前端提取
                    # 【修复】limitations 统一使用字符串格式（用于前端显示和解析）
                    "limitations": limitations_str,
                    "confidence": confidence if isinstance(confidence, (int, float)) else str(confidence) if confidence else "低",
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
                    # 【新增】顶层字段（对应前端 dataAdapter 的期望结构）
                    # 【重要】style_summary 字段：用于前端显示风格总结（核心策略）
                    # 根据 Prompt 模版，style_summary 是 Phase 2 的"参数宪法"，必须包含流派定调、色彩映射、光影重塑
                    "style_summary": style_summary,  # 【修复】添加 style_summary 字段，确保前端能正确提取
                    "comprehensive_review": comprehensive_review,  # 【修复】添加 comprehensive_review 字段，确保前端能正确提取
                    "master_archetype": master_archetype,
                    "visual_signature": visual_signature,
                    "saturation_strategy": saturation_strategy,
                    "tonal_intent": tonal_intent,
                    "simulated_histogram_data": histogram_data if histogram_data else None,
                    # 【新增】提取 image_verification 字段（图像验证描述）
                    # 用于前端在参考图和用户图下方显示图像内容描述
                    "image_verification": raw.get("image_verification", {}),
                    # 【兼容】同时保留嵌套结构（向后兼容）
                    "styleClassification": {
                        "masterArchetype": master_archetype,
                        "visualSignature": visual_signature
                    } if (master_archetype or visual_signature) else None,
                    "dimensions": {
                        "visualGuidance": {
                            "title": "视觉引导与主体",
                            "referenceDescription": visual_subject_analysis if visual_subject_analysis else "",  # 自然语言，不做表格对比
                            "userDescription": "",  # 新结构中没有用户图描述，留空
                            "description": visual_subject_analysis if visual_subject_analysis else ""  # 【兼容前端】添加 description 字段
                        },
                        "focusExposure": {
                            "title": "焦点与曝光",
                            "referenceDescription": focus_exposure_analysis if focus_exposure_analysis else "",  # 自然语言，不做表格对比
                            "userDescription": "",  # 新结构中没有用户图描述，留空
                            "description": focus_exposure_analysis if focus_exposure_analysis else ""  # 【兼容前端】添加 description 字段
                        },
                        "colorDepth": color_depth_dimension,  # 包含直方图数据
                        # 【重要】composition、technicalDetails、equipment 在新 Prompt 结构中不存在
                        # 为了保持前端兼容性，使用 referenceDescription 字段（与前端检查逻辑一致）
                        # 前端检查：dimension.referenceDescription || dimension.userDescription || dimension.description
                        "composition": {
                            "title": "构图",
                            "referenceDescription": "",  # 新结构中不存在，留空（前端会跳过空内容）
                            "userDescription": "",
                            "description": ""
                        },
                        "technicalDetails": {
                            "title": "技术细节",
                            "referenceDescription": "",  # 新结构中不存在，留空（前端会跳过空内容）
                            "userDescription": "",
                            "description": ""
                        },
                        "equipment": {
                            "title": "设备",
                            "referenceDescription": "",  # 新结构中不存在，留空（前端会跳过空内容）
                            "userDescription": "",
                            "description": ""
                        },
                        "colorEmotion": {
                            "title": "色彩与情感",
                            "referenceDescription": emotion if emotion else "",  # 自然语言，不做表格对比
                            "userDescription": "",  # 新结构中没有用户图描述，留空
                            "description": emotion if emotion else ""  # 【兼容前端】添加 description 字段
                        },
                        "advantages": {
                            "title": "优点评价",
                            "referenceDescription": pros_evaluation if pros_evaluation else "",  # 自然语言，不做表格对比
                            "userDescription": "",  # 新结构中没有用户图描述，留空
                            "description": pros_evaluation if pros_evaluation else ""  # 【兼容前端】添加 description 字段
                        },
                    },
                    "comparisonTable": comparison_table,
                    "photographerStyleSummary": style_summary,  # 【兼容】保留 photographerStyleSummary 字段（向后兼容）
                    # 【修复】确保 style_summary 在顶层（前端 dataAdapter 优先从 style_summary 提取）
                    "style_summary": style_summary,  # 【重要】添加 style_summary 字段，确保前端能正确提取
                    # 【修复】确保 comprehensive_review 在顶层（前端 dataAdapter 优先从 comprehensive_review 提取）
                    "comprehensive_review": comprehensive_review,  # 【重要】添加 comprehensive_review 字段，确保前端能正确提取
                    "feasibility": feasibility_data if feasibility_data else None,  # 添加可行性评估数据
                    # 【新增】风格分类字段（可选，保持向后兼容）
                    "styleClassification": {
                        "masterArchetype": master_archetype,
                        "visualSignature": visual_signature
                    } if (master_archetype or visual_signature) else None,
                    # 【新增】overlays 字段：区域坐标数据，用于前端图片高亮显示
                    # 根据 BACKEND_AI_SPECS.md 要求，必须包含 visual_subject、focus_exposure、color_depth 三个区域
                    "overlays": overlays if isinstance(overlays, dict) and overlays else {},
                    # 【补丁2：防止数据在最后一步丢失】必须显式透传 spatial_analysis
                    # 这是解决 visual_mass 丢失和单层 overlays 问题的关键数据
                    # 注意：spatial_analysis 包含 ref_visual_mass_polygon、ref_overlays、user_overlays
                    "spatial_analysis": spatial_analysis if isinstance(spatial_analysis, dict) and spatial_analysis else {},
                },
            }
            
            # =======================================================
            # 🔴 关键修复：确保 module_2_composition 被保留并清洗
            # =======================================================
            module_2 = raw.get("module_2_composition", {})
            if module_2 and isinstance(module_2, dict):
                logger.info(f"_format_photo_review (新结构): ✅ 检测到 module_2_composition，开始清洗 visual_flow 和 composition_clinic")
                
                # 清洗 visual_flow (向量数据)
                visual_flow = module_2.get("visual_flow", {})
                if visual_flow and isinstance(visual_flow, dict):
                    # 1. 清洗消失点 (Vanishing Point)
                    if "vanishing_point" in visual_flow:
                        vp = visual_flow["vanishing_point"]
                        if isinstance(vp, dict):
                            vp["x"] = self._normalize_point(vp.get("x"), None)  # 注意：Gemini 应该返回百分比格式
                            vp["y"] = self._normalize_point(vp.get("y"), None)
                            logger.debug(f"_format_photo_review (新结构): ✅ visual_flow.vanishing_point 已归一化: x={vp.get('x')}, y={vp.get('y')}")
                    
                    # 2. 清洗向量数组
                    vectors = visual_flow.get("vectors", [])
                    if isinstance(vectors, list):
                        clean_vectors = []
                        for v in vectors:
                            if isinstance(v, dict):
                                # 确保 start/end 存在且归一化
                                if "start" in v and isinstance(v["start"], dict):
                                    v["start"]["x"] = self._normalize_point(v["start"].get("x"), None)
                                    v["start"]["y"] = self._normalize_point(v["start"].get("y"), None)
                                if "end" in v and isinstance(v["end"], dict):
                                    v["end"]["x"] = self._normalize_point(v["end"].get("x"), None)
                                    v["end"]["y"] = self._normalize_point(v["end"].get("y"), None)
                                clean_vectors.append(v)
                        visual_flow["vectors"] = clean_vectors
                        logger.debug(f"_format_photo_review (新结构): ✅ visual_flow.vectors 已清洗，共 {len(clean_vectors)} 个向量")
                    else:
                        logger.warning(f"_format_photo_review (新结构): ⚠️ visual_flow.vectors 格式不正确，期望列表但得到 {type(vectors)}")
                
                # =======================================================
                # 🔴 重构修复：清洗并保留 composition_clinic 数据（基于用户图）
                # =======================================================
                composition_clinic = module_2.get("composition_clinic", {})
                if composition_clinic and isinstance(composition_clinic, dict):
                    logger.info(f"_format_photo_review (新结构): ✅ 检测到 composition_clinic，开始清洗（所有坐标基于用户图）")
                    
                    # 1. 清洗 suggested_crop 坐标 (x,y,w,h)
                    suggested_crop = composition_clinic.get("suggested_crop")
                    if suggested_crop and isinstance(suggested_crop, dict):
                        suggested_crop["x"] = self._normalize_point(suggested_crop.get("x"), None)
                        suggested_crop["y"] = self._normalize_point(suggested_crop.get("y"), None)
                        suggested_crop["w"] = self._normalize_point(suggested_crop.get("w"), None)
                        suggested_crop["h"] = self._normalize_point(suggested_crop.get("h"), None)
                        logger.debug(f"_format_photo_review (新结构): ✅ composition_clinic.suggested_crop 已归一化: x={suggested_crop.get('x')}, y={suggested_crop.get('y')}, w={suggested_crop.get('w')}, h={suggested_crop.get('h')}")
                    
                    # 2. 清洗 action_guides 数组（AR 标记）
                    action_guides = composition_clinic.get("action_guides", [])
                    if isinstance(action_guides, list):
                        clean_guides = []
                        for guide in action_guides:
                            if isinstance(guide, dict):
                                guide["x"] = self._normalize_point(guide.get("x"), None)
                                guide["y"] = self._normalize_point(guide.get("y"), None)
                                clean_guides.append(guide)
                        composition_clinic["action_guides"] = clean_guides
                        logger.debug(f"_format_photo_review (新结构): ✅ composition_clinic.action_guides 已清洗，共 {len(clean_guides)} 个标记")
                    
                    # 3. 清洗 grading_masks 数组（后期蒙版）
                    grading_masks = composition_clinic.get("grading_masks", [])
                    if isinstance(grading_masks, list):
                        clean_masks = []
                        for mask in grading_masks:
                            if isinstance(mask, dict):
                                area_polygon = mask.get("area_polygon", [])
                                if isinstance(area_polygon, list):
                                    clean_polygon = []
                                    for point in area_polygon:
                                        if isinstance(point, dict):
                                            point["x"] = self._normalize_point(point.get("x"), None)
                                            point["y"] = self._normalize_point(point.get("y"), None)
                                            clean_polygon.append(point)
                                    mask["area_polygon"] = clean_polygon
                                clean_masks.append(mask)
                        composition_clinic["grading_masks"] = clean_masks
                        logger.debug(f"_format_photo_review (新结构): ✅ composition_clinic.grading_masks 已清洗，共 {len(clean_masks)} 个蒙版")
                    
                    # 【关键】将清洗后的 clinic 塞回 module_2 对象
                    module_2["composition_clinic"] = composition_clinic
                    logger.info(f"_format_photo_review (新结构): ✅ composition_clinic 已塞回 module_2_composition（包含 suggested_crop, action_guides, grading_masks）")
                else:
                    logger.warning(f"_format_photo_review (新结构): ⚠️ composition_clinic 不存在或格式不正确")
                
                # 【关键】确保 comp 被更新回 raw_data（虽然这里我们直接添加到 returned，但为了完整性也更新 raw）
                raw["module_2_composition"] = module_2
                
                # 将清洗后的 module_2_composition 添加到返回结构
                returned["structured"]["module_2_composition"] = module_2
                # 【新增】同时将 composition_clinic 直接添加到 structured 顶层（便于前端直接访问）
                if composition_clinic:
                    returned["structured"]["composition_clinic"] = composition_clinic
                logger.info(f"_format_photo_review (新结构): ✅ module_2_composition 已添加到返回结构，包含 visual_flow={bool(visual_flow)}, composition_clinic={bool(composition_clinic)}")
            else:
                logger.warning(f"_format_photo_review (新结构): ⚠️ module_2_composition 不存在或格式不正确")
            
            # 【调试日志】记录关键数据
            logger.info(f"_format_photo_review (新结构): style_summary 长度 = {len(style_summary) if style_summary else 0} 字符")
            logger.info(f"_format_photo_review (新结构): comprehensive_review 长度 = {len(comprehensive_review) if comprehensive_review else 0} 字符")
            logger.info(f"_format_photo_review (新结构): histogram_data 是否存在 = {bool(histogram_data)}, keys = {list(histogram_data.keys()) if histogram_data else []}")
            
            # 【调试日志】记录 overlays 数据
            if overlays:
                logger.info(f"_format_photo_review (新结构): overlays keys = {list(overlays.keys()) if isinstance(overlays, dict) else 'not dict'}")
                if isinstance(overlays, dict):
                    for key, value in overlays.items():
                        if isinstance(value, dict):
                            logger.debug(f"_format_photo_review (新结构): overlays.{key} = {{x: {value.get('x', 'N/A')}, y: {value.get('y', 'N/A')}, w: {value.get('w', 'N/A')}, h: {value.get('h', 'N/A')}, label: {value.get('label', 'N/A')}}}")
            else:
                logger.warning(f"_format_photo_review (新结构): overlays 为空或格式不正确，类型 = {type(overlays)}")
                # 【重要】如果 overlays 为空，记录警告，提示需要检查 Prompt 模版和 Gemini 输出
                logger.warning(f"_format_photo_review (新结构): ⚠️ overlays 数据缺失，前端将无法显示图片区域高亮功能")
            
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

        # 【新增】提取新字段
        master_archetype = pe.get("master_archetype", "")
        visual_signature = pe.get("visual_signature", "")
        saturation_strategy = pe.get("saturation_strategy", "")
        tonal_intent = pe.get("tonal_intent", "")
        simulated_histogram_data = pe.get("simulated_histogram_data", {})
        # 【新增】提取 overlays 字段（区域坐标数据）
        overlays = pe.get("overlays", {})
        
        # 调试日志：记录提取的字段值（只记录前50个字符，避免日志过长）
        logger.debug(f"_format_photo_review: visual_guidance = {visual_guidance[:50] if visual_guidance else 'empty'}...")
        logger.debug(f"_format_photo_review: focus_exposure = {focus_exposure[:50] if focus_exposure else 'empty'}...")
        logger.debug(f"_format_photo_review: summary = {summary[:50] if summary else 'empty'}...")
        logger.debug(f"_format_photo_review: master_archetype = {master_archetype}")

        return {
            "naturalLanguage": {
                "summary": visual_guidance or summary,  # 优先使用 visual_guidance，如果没有则使用 summary
                "highlights": strengths,
                "technique": equipment_analysis,
                "comparison": comparison,
            },
            "structured": {
                "overviewSummary": visual_guidance or summary,  # 优先使用 visual_guidance，如果没有则使用 summary
                # 【新增】顶层字段（对应 Schema 更新）
                "master_archetype": master_archetype,
                "visual_signature": visual_signature,
                "saturation_strategy": saturation_strategy,
                "tonal_intent": tonal_intent,
                "simulated_histogram_data": simulated_histogram_data,
                # 【新增】overlays 字段：区域坐标数据，用于前端图片高亮显示
                "overlays": overlays if isinstance(overlays, dict) and overlays else {},
                # 兼容 StyleClassification 对象
                "style_classification": {
                    "master_archetype": master_archetype,
                    "visual_signature": visual_signature
                } if (master_archetype or visual_signature) else None,
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

    def _format_composition(self, raw: Dict[str, Any], saliency_mask_url: Optional[str] = None, image_width: Optional[int] = None, image_height: Optional[int] = None) -> Dict[str, Any]:
        """
        格式化构图分析
        
        Args:
            raw: Gemini 返回的原始数据（应该包含 composition 或 module_2_composition 字段）
            saliency_mask_url: 显著性遮罩图 URL（可选，用于前端 Visual Mass 功能）
            image_width: 图片宽度（可选，用于坐标归一化）
            image_height: 图片高度（可选，用于坐标归一化）
        
        Returns:
            标准化的构图分析结构
        """
        # ==========================================================
        # 🛠️ 核心修复：JSON 字符串解析 (JSON String Parsing)
        # 如果 raw 中的 composition 或 module_2_composition 是字符串，先解析成字典
        # ==========================================================
        import json
        import re
        
        # 1. 如果 raw 是字符串，先解析成 Python 字典
        if isinstance(raw, str):
            try:
                # 清理可能的 markdown 代码块标记 (```json ... ```)
                cleaned_str = raw.replace("```json", "").replace("```", "").strip()
                raw = json.loads(cleaned_str)
                logger.info(f"_format_composition: ✅ 从字符串解析 JSON 成功，类型 = {type(raw)}")
            except json.JSONDecodeError as e:
                logger.error(f"_format_composition: ❌ JSON 解析失败: {e}")
                # 尝试使用正则表达式提取 JSON
                json_match = re.search(r'\{.*\}', raw, re.DOTALL)
                if json_match:
                    try:
                        raw = json.loads(json_match.group())
                        logger.info(f"_format_composition: ✅ 使用正则表达式提取 JSON 成功")
                    except json.JSONDecodeError:
                        logger.error(f"_format_composition: ❌ 正则表达式提取的 JSON 也解析失败")
                        raw = {}  # 解析失败就使用空字典，防止报错
                else:
                    raw = {}  # 解析失败就使用空字典，防止报错
        
        # 2. 检查 composition 或 module_2_composition 字段是否是字符串
        if isinstance(raw, dict):
            # 检查 module_2_composition 是否是字符串
            if "module_2_composition" in raw and isinstance(raw["module_2_composition"], str):
                try:
                    cleaned_str = raw["module_2_composition"].replace("```json", "").replace("```", "").strip()
                    raw["module_2_composition"] = json.loads(cleaned_str)
                    logger.info(f"_format_composition: ✅ module_2_composition 从字符串解析为字典成功")
                except json.JSONDecodeError as e:
                    logger.error(f"_format_composition: ❌ module_2_composition JSON 解析失败: {e}")
                    raw["module_2_composition"] = {}  # 解析失败就使用空字典
            
            # 检查 composition 是否是字符串
            if "composition" in raw and isinstance(raw["composition"], str):
                try:
                    cleaned_str = raw["composition"].replace("```json", "").replace("```", "").strip()
                    raw["composition"] = json.loads(cleaned_str)
                    logger.info(f"_format_composition: ✅ composition 从字符串解析为字典成功")
                except json.JSONDecodeError as e:
                    logger.error(f"_format_composition: ❌ composition JSON 解析失败: {e}")
                    raw["composition"] = {}  # 解析失败就使用空字典
        
        # 优先使用新结构 module_2_composition，如果没有则使用旧结构 composition
        module_2 = raw.get("module_2_composition", {}) if isinstance(raw, dict) else {}
        comp = raw.get("composition", {}) if isinstance(raw, dict) else {}
        
        # 如果存在新结构，使用双宇宙结构（reference_analysis + composition_clinic）
        if module_2:
            # 【重构】检查是否是新双宇宙结构（reference_analysis + composition_clinic）
            reference_analysis = module_2.get("reference_analysis", {})
            composition_clinic = module_2.get("composition_clinic", {})
            
            # 如果存在 reference_analysis，说明是新双宇宙结构
            if reference_analysis:
                    logger.info("使用新双宇宙结构 (module_2_composition: reference_analysis + composition_clinic)")
                    
                    # 【新增】详细日志：记录 reference_analysis 中的所有字段
                    if isinstance(reference_analysis, dict):
                        logger.info(f"_format_composition: reference_analysis 字段列表: {list(reference_analysis.keys())}")
                        # 记录关键字段是否存在
                        logger.info(f"_format_composition: classification = {reference_analysis.get('classification', 'N/A')}")
                        logger.info(f"_format_composition: geometric_structure = {reference_analysis.get('geometric_structure', 'N/A')}")
                        logger.info(f"_format_composition: visual_quality_assessment = {bool(reference_analysis.get('visual_quality_assessment'))}")
                        logger.info(f"_format_composition: composition_quality = {bool(reference_analysis.get('composition_quality'))}")
                        logger.info(f"_format_composition: visual_weight = {bool(reference_analysis.get('visual_weight'))}")
                        logger.info(f"_format_composition: visual_flow = {bool(reference_analysis.get('visual_flow'))}")
                        logger.info(f"_format_composition: spatial_depth = {bool(reference_analysis.get('spatial_depth'))}")
                        logger.info(f"_format_composition: negative_space = {bool(reference_analysis.get('negative_space'))}")
                        # 记录 visual_weight 的详细字段
                        visual_weight = reference_analysis.get("visual_weight", {})
                        if isinstance(visual_weight, dict):
                            logger.info(f"_format_composition: visual_weight.score = {visual_weight.get('score', 'N/A')}")
                            logger.info(f"_format_composition: visual_weight.method = {visual_weight.get('method', 'N/A')}")
                            logger.info(f"_format_composition: visual_weight.description = {bool(visual_weight.get('description'))}")
                            logger.info(f"_format_composition: visual_weight.layers_visual_map = {len(visual_weight.get('layers_visual_map', []))} 个图层")
                        # 记录 visual_flow 的详细字段
                        visual_flow = reference_analysis.get("visual_flow", {})
                        if isinstance(visual_flow, dict):
                            logger.info(f"_format_composition: visual_flow.description = {bool(visual_flow.get('description'))}")
                            logger.info(f"_format_composition: visual_flow.vectors = {len(visual_flow.get('vectors', []))} 条向量")
                
            # ==========================================================
            # 🛠️ 清洗 Reference Analysis 数据（参考图分析 - 教科书标准）
            # ==========================================================
            if reference_analysis and isinstance(reference_analysis, dict):
                # 1. 清洗空间深度多边形 (Spatial Depth Polygons)
                # 【修复】确保所有坐标值在使用前都已正确初始化，防止 NameError
                spatial_depth = reference_analysis.get("spatial_depth", {})
                if spatial_depth and isinstance(spatial_depth, dict):
                    for plane in ["foreground", "midground", "background"]:
                        if plane in spatial_depth and isinstance(spatial_depth[plane], dict):
                            polygon = spatial_depth[plane].get("polygon", [])
                            if polygon and isinstance(polygon, list):
                                for p in polygon:
                                    # 【防御性检查】确保 p 是字典类型，且包含 x, y 键
                                    if isinstance(p, dict):
                                        # 【修复】使用 .get() 方法安全获取值，防止 KeyError
                                        p["x"] = self._normalize_point(p.get("x"), image_width)
                                        p["y"] = self._normalize_point(p.get("y"), image_height)
                                logger.debug(f"_format_composition: ✅ reference_analysis.spatial_depth.{plane}.polygon 已归一化，共 {len(polygon)} 个点")
                
                # 2. 清洗视觉权重图层 (Visual Weight Layers)
                # 【修复】确保所有坐标值在使用前都已正确初始化，防止 NameError
                visual_weight = reference_analysis.get("visual_weight", {})
                if visual_weight and isinstance(visual_weight, dict):
                    layers_visual_map = visual_weight.get("layers_visual_map", [])
                    if layers_visual_map and isinstance(layers_visual_map, list):
                        for layer in layers_visual_map:
                            # 【防御性检查】确保 layer 是字典类型，且包含 box 键
                            if isinstance(layer, dict) and "box" in layer:
                                box = layer["box"]
                                # 【防御性检查】确保 box 是字典类型
                                if isinstance(box, dict):
                                    # 【修复】使用 .get() 方法安全获取值，防止 KeyError
                                    box["x"] = self._normalize_point(box.get("x"), image_width)
                                    box["y"] = self._normalize_point(box.get("y"), image_height)
                                    box["w"] = self._normalize_point(box.get("w"), image_width)
                                    box["h"] = self._normalize_point(box.get("h"), image_height)
                        logger.info(f"_format_composition: ✅ reference_analysis.visual_weight.layers_visual_map 已归一化，共 {len(layers_visual_map)} 个图层")
                
                # 3. 清洗视觉流向量 (Visual Flow Vectors) - 复用之前的逻辑
                # 【修复】确保所有坐标值在使用前都已正确初始化，防止 NameError
                visual_flow = reference_analysis.get("visual_flow", {})
                if visual_flow and isinstance(visual_flow, dict):
                    # 清洗消失点
                    vp = visual_flow.get("vanishing_point")
                    # 【防御性检查】确保 vp 是字典类型
                    if vp and isinstance(vp, dict):
                        # 【修复】使用 .get() 方法安全获取值，防止 KeyError
                        vp["x"] = self._normalize_point(vp.get("x"), image_width)
                        vp["y"] = self._normalize_point(vp.get("y"), image_height)
                        logger.debug(f"_format_composition: ✅ reference_analysis.visual_flow.vanishing_point 已归一化: x={vp.get('x', 'N/A')}, y={vp.get('y', 'N/A')}")
                    
                    # 清洗向量数组
                    vectors = visual_flow.get("vectors", [])
                    if vectors and isinstance(vectors, list):
                        for v in vectors:
                            # 【防御性检查】确保 v 是字典类型
                            if not isinstance(v, dict):
                                continue
                            # 清洗 start 点
                            if "start" in v and isinstance(v["start"], dict):
                                # 【修复】使用 .get() 方法安全获取值，防止 KeyError
                                v["start"]["x"] = self._normalize_point(v["start"].get("x"), image_width)
                                v["start"]["y"] = self._normalize_point(v["start"].get("y"), image_height)
                            # 清洗 end 点
                            if "end" in v and isinstance(v["end"], dict):
                                # 【修复】使用 .get() 方法安全获取值，防止 KeyError
                                v["end"]["x"] = self._normalize_point(v["end"].get("x"), image_width)
                                v["end"]["y"] = self._normalize_point(v["end"].get("y"), image_height)
                            # 确保 strength 存在
                            if "strength" not in v or v.get("strength") is None:
                                v["strength"] = 70
                        logger.info(f"_format_composition: ✅ reference_analysis.visual_flow.vectors 已归一化，共 {len(vectors)} 条向量")
            
            # ==========================================================
            # 🛠️ 清洗 Composition Clinic 数据（用户图诊疗 - 手术台）
            # ==========================================================
            # 复用之前的 composition_clinic 清洗逻辑
            if composition_clinic and isinstance(composition_clinic, dict):
                # 清洗 suggested_crop 坐标
                # 【修复】确保所有坐标值在使用前都已正确初始化，防止 NameError
                suggested_crop = composition_clinic.get("suggested_crop")
                if suggested_crop and isinstance(suggested_crop, dict):
                    # 【修复】使用 .get() 方法安全获取值，防止 KeyError
                    suggested_crop["x"] = self._normalize_point(suggested_crop.get("x"), image_width)
                    suggested_crop["y"] = self._normalize_point(suggested_crop.get("y"), image_height)
                    suggested_crop["w"] = self._normalize_point(suggested_crop.get("w"), image_width)
                    suggested_crop["h"] = self._normalize_point(suggested_crop.get("h"), image_height)
                    logger.debug(f"_format_composition: ✅ composition_clinic.suggested_crop 已归一化")
                
                # 清洗 action_guides 坐标
                # 【修复】确保所有坐标值在使用前都已正确初始化，防止 NameError
                action_guides = composition_clinic.get("action_guides", [])
                if action_guides and isinstance(action_guides, list):
                    for guide in action_guides:
                        # 【防御性检查】确保 guide 是字典类型
                        if isinstance(guide, dict):
                            # 【修复】使用 .get() 方法安全获取值，防止 KeyError
                            guide["x"] = self._normalize_point(guide.get("x"), image_width)
                            guide["y"] = self._normalize_point(guide.get("y"), image_height)
                    logger.debug(f"_format_composition: ✅ composition_clinic.action_guides 已归一化，共 {len(action_guides)} 个指导")
                
                # 清洗 grading_masks 坐标
                # 【修复】确保所有坐标值在使用前都已正确初始化，防止 NameError
                grading_masks = composition_clinic.get("grading_masks", [])
                if grading_masks and isinstance(grading_masks, list):
                    for mask in grading_masks:
                        # 【防御性检查】确保 mask 是字典类型
                        if isinstance(mask, dict):
                            area_polygon = mask.get("area_polygon", [])
                            if area_polygon and isinstance(area_polygon, list):
                                for p in area_polygon:
                                    # 【防御性检查】确保 p 是字典类型
                                    if isinstance(p, dict):
                                        # 【修复】使用 .get() 方法安全获取值，防止 KeyError
                                        p["x"] = self._normalize_point(p.get("x"), image_width)
                                        p["y"] = self._normalize_point(p.get("y"), image_height)
                    logger.debug(f"_format_composition: ✅ composition_clinic.grading_masks 已归一化，共 {len(grading_masks)} 个蒙版")
            
            # 构建新双宇宙结构
            structured = {
                "reference_analysis": reference_analysis if isinstance(reference_analysis, dict) else None,
                "composition_clinic": composition_clinic if isinstance(composition_clinic, dict) else None,
            }
            
            # 【向后兼容】为了兼容旧的前端代码，也保留一些旧字段
            # 从 reference_analysis 中提取数据填充旧字段
            if reference_analysis and isinstance(reference_analysis, dict):
                # 【修复】字段映射关系：
                # - classification（构图类型，如"环境人像、风光、人文街景"）→ main_structure（分类）
                # - geometric_structure（几何结构，如"中心构图、三分法"）→ 保持原字段名
                structured["main_structure"] = reference_analysis.get("classification", "")  # 【修复】分类字段：classification 映射到 main_structure
                structured["style_class"] = reference_analysis.get("classification", "")  # 风格分类也使用 classification
                # 【新增】确保 geometric_structure 也传递到 structured 中（用于前端显示）
                structured["geometric_structure"] = reference_analysis.get("geometric_structure", "")
                
                # 提取 visual_weight 数据到旧字段
                ref_visual_weight = reference_analysis.get("visual_weight", {})
                if ref_visual_weight:
                    structured["subject_weight"] = {
                        "score": ref_visual_weight.get("score", 0),
                        "method": ref_visual_weight.get("method", ""),
                        "description": ref_visual_weight.get("description", ""),
                        "layers": ""  # 旧字段，从 layers_visual_map 可以推导
                    }
                
                # 提取 visual_flow 和 spatial_depth
                structured["visual_flow"] = reference_analysis.get("visual_flow", {})
                structured["spatial_depth"] = reference_analysis.get("spatial_depth", {})
                structured["negative_space"] = reference_analysis.get("negative_space", {})
                
                # 【新增】提取 ratios_negative_space 数据（用于前端显示留白比例详情）
                # 【修复】ratios_negative_space 可能在 reference_analysis 中，也可能在 module_2 的顶层
                ratios_negative_space = reference_analysis.get("ratios_negative_space", {}) or module_2.get("ratios_negative_space", {})
                if ratios_negative_space:
                    structured["ratios_negative_space"] = ratios_negative_space
                    logger.info(f"_format_composition: ✅ 已提取 ratios_negative_space: entity_ratio={ratios_negative_space.get('entity_ratio', 'N/A')}, space_ratio={ratios_negative_space.get('space_ratio', 'N/A')}, distribution={bool(ratios_negative_space.get('distribution'))}")
                else:
                    logger.warning(f"_format_composition: ⚠️ ratios_negative_space 字段不存在，前端可能无法显示留白比例详情")
                
                # 【新增】确保完整的 reference_analysis 对象被添加到 module_2_composition 中
                # 这样前端 CompositionAnalysisPanel 可以直接访问所有字段（包括 composition_quality）
                if "module_2_composition" not in structured:
                    structured["module_2_composition"] = {}
                structured["module_2_composition"]["reference_analysis"] = reference_analysis
                if composition_clinic:
                    structured["module_2_composition"]["composition_clinic"] = composition_clinic
                
                # 【新增】确保 ratios_negative_space 也传递到 structured 中（用于前端显示）
                if ratios_negative_space and "ratios_negative_space" not in structured:
                    structured["ratios_negative_space"] = ratios_negative_space
            
            return {
                "naturalLanguage": {
                    "framework": structured.get("main_structure", ""),
                    "subjectWeight": structured.get("subject_weight", {}).get("description", "") if isinstance(structured.get("subject_weight"), dict) else "",
                    "leadingLines": reference_analysis.get("visual_flow", {}).get("description", "") if isinstance(reference_analysis.get("visual_flow"), dict) else "",
                    "spaceLayers": "",
                    "proportion": "",
                    "balanceDynamics": "",
                },
                "structured": structured,
            }
        
        # 【向后兼容】如果不存在 reference_analysis，使用旧的 5 字段结构
        else:
            logger.info("使用旧 Prompt 结构 (module_2_composition) - 5字段结构（向后兼容）")
        
            main_structure = module_2.get("main_structure", "")
            subject_weight = module_2.get("subject_weight", {})
            visual_guidance = module_2.get("visual_guidance", {})
            ratios_negative_space = module_2.get("ratios_negative_space", {})
            style_class = module_2.get("style_class", "")
            
            # 【新增】提取 visual_flow 和 spatial_depth 数据（用于前端展示）
            visual_flow = module_2.get("visual_flow", {})
            spatial_depth = module_2.get("spatial_depth", {})
            # 【新增】提取 composition_clinic 数据（构图诊疗室）
            composition_clinic = module_2.get("composition_clinic", {})
            
            # ==========================================================
            # 🛠️ 核心修复：清洗 spatial_depth 数据（坐标归一化）- 仅针对旧结构
            # 【修复】确保所有坐标值在使用前都已正确初始化，防止 NameError
            # ==========================================================
            if spatial_depth and isinstance(spatial_depth, dict):
                # 清洗空间深度多边形 (Spatial Depth Polygons)
                for plane in ["foreground", "midground", "background"]:
                    if plane in spatial_depth and isinstance(spatial_depth[plane], dict):
                        polygon = spatial_depth[plane].get("polygon", [])
                        if polygon and isinstance(polygon, list):
                            for p in polygon:
                                # 【防御性检查】确保 p 是字典类型，且包含 x, y 键
                                if isinstance(p, dict):
                                    # 【修复】使用 .get() 方法安全获取值，防止 KeyError
                                    p["x"] = self._normalize_point(p.get("x"), image_width)
                                    p["y"] = self._normalize_point(p.get("y"), image_height)
                            logger.debug(f"_format_composition: ✅ spatial_depth.{plane}.polygon 已归一化，共 {len(polygon)} 个点")
            
            # ==========================================================
            # 🛠️ 核心修复：清洗 visual_flow 数据（坐标归一化）- 仅针对旧结构
            # 【修复】确保所有坐标值在使用前都已正确初始化，防止 NameError
            # ==========================================================
            if visual_flow and isinstance(visual_flow, dict):
                    # 1. 清洗消失点 (Vanishing Point)
                    vp = visual_flow.get("vanishing_point")
                    # 【防御性检查】确保 vp 是字典类型
                    if vp and isinstance(vp, dict):
                        # 【修复】使用 .get() 方法安全获取值，防止 KeyError
                        vp["x"] = self._normalize_point(vp.get("x"), image_width)
                        vp["y"] = self._normalize_point(vp.get("y"), image_height)
                        logger.debug(f"_format_composition: ✅ visual_flow.vanishing_point 已归一化: x={vp.get('x', 'N/A')}, y={vp.get('y', 'N/A')}")
                    
                    # 2. 清洗向量数组 (Vectors)
                    vectors = visual_flow.get("vectors", [])
                    if vectors and isinstance(vectors, list):
                        for idx, v in enumerate(vectors):
                            # 【防御性检查】确保 v 是字典类型
                            if not isinstance(v, dict):
                                continue
                            # 清洗 start 点
                            if "start" in v and isinstance(v["start"], dict):
                                # 【修复】使用 .get() 方法安全获取值，防止 KeyError
                                v["start"]["x"] = self._normalize_point(v["start"].get("x"), image_width)
                                v["start"]["y"] = self._normalize_point(v["start"].get("y"), image_height)
                            # 清洗 end 点
                            if "end" in v and isinstance(v["end"], dict):
                                # 【修复】使用 .get() 方法安全获取值，防止 KeyError
                                v["end"]["x"] = self._normalize_point(v["end"].get("x"), image_width)
                                v["end"]["y"] = self._normalize_point(v["end"].get("y"), image_height)
                            # 确保 strength 存在（如果没有则使用默认值）
                            if "strength" not in v or v.get("strength") is None:
                                v["strength"] = 70  # 默认强度
                        logger.info(f"_format_composition: ✅ visual_flow.vectors 已归一化，共 {len(vectors)} 条向量")
                    else:
                        logger.warning(f"_format_composition: ⚠️ visual_flow.vectors 不存在或格式不正确")
            else:
                logger.warning(f"_format_composition: ⚠️ visual_flow 不存在或格式不正确")
            
            # ==========================================================
            # 🛠️ 核心修复：清洗 composition_clinic 数据（坐标归一化）- 仅针对旧结构
            # ==========================================================
            if composition_clinic and isinstance(composition_clinic, dict):
                # 清洗 reframing_simulator 坐标
                # 【修复】确保所有坐标值在使用前都已正确初始化，防止 NameError
                reframing = composition_clinic.get("reframing_simulator")
                # 【防御性检查】确保 reframing 是字典类型
                if reframing and isinstance(reframing, dict):
                    # 【修复】使用 .get() 方法安全获取值，防止 KeyError
                    reframing["x"] = self._normalize_point(reframing.get("x"), image_width)
                    reframing["y"] = self._normalize_point(reframing.get("y"), image_height)
                    reframing["w"] = self._normalize_point(reframing.get("w"), image_width)
                    reframing["h"] = self._normalize_point(reframing.get("h"), image_height)
                    logger.debug(f"_format_composition: ✅ composition_clinic.reframing_simulator 已归一化: x={reframing.get('x', 'N/A')}, y={reframing.get('y', 'N/A')}, w={reframing.get('w', 'N/A')}, h={reframing.get('h', 'N/A')}")
                else:
                    logger.warning(f"_format_composition: ⚠️ composition_clinic.reframing_simulator 不存在或格式不正确")
            else:
                logger.warning(f"_format_composition: ⚠️ composition_clinic 不存在或格式不正确")
            
            # 【新增】提取 visual_mass 数据（用于前端Visual Mass功能 - 视觉质量/视觉重心）
            # 【重要】支持新旧两种格式：
            # 1. 最新格式（空间分析大一统）：module_1_critique.spatial_analysis.ref_visual_mass_polygon
            # 2. 旧格式：module_2_composition.visual_mass
            # ==========================================================
            # 🛠️ 核心修复：字段别名映射 (Alias Mapping)
            # 前端找 "visual_mass"，但 Gemini 可能生成 "ref_visual_mass_polygon"
            # ==========================================================
            # 【优先】检查是否有 spatial_analysis（最新格式）
            module_1 = raw.get("module_1_critique", {}) if isinstance(raw, dict) else {}
            spatial_analysis = module_1.get("spatial_analysis", {}) if isinstance(module_1, dict) else {}
            
            # 【修复】如果 spatial_analysis 是字符串，先解析
            if isinstance(spatial_analysis, str):
                try:
                    cleaned_str = spatial_analysis.replace("```json", "").replace("```", "").strip()
                    spatial_analysis = json.loads(cleaned_str)
                    logger.info(f"_format_composition: ✅ spatial_analysis 从字符串解析为字典成功")
                except json.JSONDecodeError as e:
                    logger.error(f"_format_composition: ❌ spatial_analysis JSON 解析失败: {e}")
                    spatial_analysis = {}
            
            if spatial_analysis and isinstance(spatial_analysis, dict):
                # ==========================================================
                # 🛠️ 字段别名映射：将 ref_visual_mass_polygon 映射到 visual_mass
                # ==========================================================
                if "visual_mass" not in spatial_analysis:
                    # 尝试从 ref_visual_mass_polygon 提取
                    if "ref_visual_mass_polygon" in spatial_analysis:
                        spatial_analysis["visual_mass"] = spatial_analysis["ref_visual_mass_polygon"]
                        logger.info(f"_format_composition (新结构): ✅ 字段映射成功：ref_visual_mass_polygon -> visual_mass")
                    # 或者尝试从 visual_mass_polygon 提取 (防止 AI 变名字)
                    elif "visual_mass_polygon" in spatial_analysis:
                        spatial_analysis["visual_mass"] = spatial_analysis["visual_mass_polygon"]
                        logger.info(f"_format_composition (新结构): ✅ 字段映射成功：visual_mass_polygon -> visual_mass")
                
                # 最新格式：从 spatial_analysis 中提取 visual_mass（映射后的字段）
                visual_mass = spatial_analysis.get("visual_mass", {})
                if visual_mass:
                    logger.info(f"_format_composition (新结构): ✅ 检测到最新格式（spatial_analysis.visual_mass），从 spatial_analysis 中提取 visual_mass")
                else:
                    # 如果 spatial_analysis 存在但没有 visual_mass，尝试从 module_2 获取（向后兼容）
                    visual_mass = module_2.get("visual_mass", {}) if isinstance(module_2, dict) else {}
                    if visual_mass:
                        logger.warning(f"_format_composition (新结构): ⚠️ spatial_analysis 存在但没有 visual_mass，回退到 module_2.visual_mass")
                    else:
                        logger.warning(f"_format_composition (新结构): ⚠️ spatial_analysis 存在但没有 visual_mass，且 module_2.visual_mass 也不存在")
            else:
                # 旧格式：从 module_2_composition 中提取
                visual_mass = module_2.get("visual_mass", {}) if isinstance(module_2, dict) else {}
                if visual_mass:
                    logger.info(f"_format_composition (新结构): 使用旧格式（module_2_composition.visual_mass）")
            
            # ==========================================================
            # 🛠️ 核心修复：数据清洗和补全 (Data Cleaning & Completion)
            # ==========================================================
            if visual_mass and isinstance(visual_mass, dict):
                # 确保 score 存在
                if "score" not in visual_mass or visual_mass.get("score") is None:
                    # 如果没有 score，尝试从 confidence 推断（confidence 通常是 0-1，转换为 0-100）
                    if "confidence" in visual_mass and isinstance(visual_mass["confidence"], (int, float)):
                        visual_mass["score"] = int(visual_mass["confidence"] * 100)
                    else:
                        visual_mass["score"] = 85  # 默认保底分
                    logger.info(f"_format_composition (新结构): ✅ visual_mass.score 已设置默认值: {visual_mass['score']}")
                
                # 确保 composition_rule 存在
                if "composition_rule" not in visual_mass or not visual_mass.get("composition_rule"):
                    visual_mass["composition_rule"] = "AI Composition Analysis"  # 默认值
                    logger.info(f"_format_composition (新结构): ✅ visual_mass.composition_rule 已设置默认值")
                
                # 【核心修复】归一化 visual_mass 数据中的坐标
                # 注意：这里不传入 image_width 和 image_height，因为 Gemini 应该已经返回百分比格式
                # 但为了安全，仍然进行归一化处理，以防 Gemini 返回像素值
                visual_mass = self._normalize_visual_mass(visual_mass, image_width=None, image_height=None)
                logger.info(f"_format_composition (新结构): ✅ visual_mass 数据已归一化，score = {visual_mass.get('score', 'N/A')}, composition_rule = {visual_mass.get('composition_rule', 'N/A')}")
            
            # 【修复】先处理 visual_mass 的创建和归一化，最后再构建 visual_mass_final
            # 注意：visual_mass_final 的赋值必须在 visual_mass 创建之后，否则会引用到旧的或未定义的 visual_mass
            
            # 【兜底逻辑】如果 visual_mass 不存在或没有 vertices/polygon_points，尝试基于 subject_weight.description 进行估算
            if not visual_mass or (not visual_mass.get("vertices") and not visual_mass.get("polygon_points")):
                logger.warning(f"_format_composition (新结构): visual_mass 字段缺失，尝试基于 subject_weight.description 进行估算")
                subject_desc = subject_weight.get("description", "") if isinstance(subject_weight, dict) else ""
                
                # 基于描述进行简单估算
                estimated_vertices = None
                estimated_polygon_points = None
                estimated_center = [0.5, 0.5]  # 默认中心点
                estimated_center_point = {"x": 50.0, "y": 50.0}  # 默认中心点（百分比格式）
                confidence = 0.6  # 估算的可信度较低
                estimated_score = 50  # 默认中等分数
                estimated_rule = "Unknown"  # 默认构图法则
                
                if subject_desc:
                    desc_lower = subject_desc.lower()
                    # 根据描述估算位置
                    if "中心" in desc_lower or "center" in desc_lower:
                        estimated_vertices = [[40, 40], [60, 40], [60, 60], [40, 60]]
                        estimated_polygon_points = [{"x": 40, "y": 40}, {"x": 60, "y": 40}, {"x": 60, "y": 60}, {"x": 40, "y": 60}]
                        estimated_center = [50, 50]
                        estimated_center_point = {"x": 50.0, "y": 50.0}
                        estimated_rule = "Central"
                    elif "右侧" in desc_lower or "right" in desc_lower:
                        estimated_vertices = [[60, 30], [90, 30], [90, 70], [60, 70]]
                        estimated_polygon_points = [{"x": 60, "y": 30}, {"x": 90, "y": 30}, {"x": 90, "y": 70}, {"x": 60, "y": 70}]
                        estimated_center = [75, 50]
                        estimated_center_point = {"x": 75.0, "y": 50.0}
                        estimated_rule = "Rule of Thirds"
                    elif "左侧" in desc_lower or "left" in desc_lower:
                        estimated_vertices = [[10, 30], [40, 30], [40, 70], [10, 70]]
                        estimated_polygon_points = [{"x": 10, "y": 30}, {"x": 40, "y": 30}, {"x": 40, "y": 70}, {"x": 10, "y": 70}]
                        estimated_center = [25, 50]
                        estimated_center_point = {"x": 25.0, "y": 50.0}
                        estimated_rule = "Rule of Thirds"
                    elif "上方" in desc_lower or "top" in desc_lower or "上" in desc_lower:
                        estimated_vertices = [[30, 10], [70, 10], [70, 40], [30, 40]]
                        estimated_polygon_points = [{"x": 30, "y": 10}, {"x": 70, "y": 10}, {"x": 70, "y": 40}, {"x": 30, "y": 40}]
                        estimated_center = [50, 25]
                        estimated_center_point = {"x": 50.0, "y": 25.0}
                        estimated_rule = "Rule of Thirds"
                    elif "下方" in desc_lower or "bottom" in desc_lower or "下" in desc_lower:
                        estimated_vertices = [[30, 60], [70, 60], [70, 90], [30, 90]]
                        estimated_polygon_points = [{"x": 30, "y": 60}, {"x": 70, "y": 60}, {"x": 70, "y": 90}, {"x": 30, "y": 90}]
                        estimated_center = [50, 75]
                        estimated_center_point = {"x": 50.0, "y": 75.0}
                        estimated_rule = "Rule of Thirds"
                    elif "极小" in desc_lower or ("占比" in desc_lower and "小" in desc_lower):
                        # 如果主体占比极小，输出一个小的中心区域
                        estimated_vertices = [[45, 45], [55, 45], [55, 55], [45, 55]]
                        estimated_polygon_points = [{"x": 45, "y": 45}, {"x": 55, "y": 45}, {"x": 55, "y": 55}, {"x": 45, "y": 55}]
                        estimated_center = [50, 50]
                        estimated_center_point = {"x": 50.0, "y": 50.0}
                        estimated_score = 30  # 占比极小，分数较低
                        estimated_rule = "Central"
                    else:
                        # 默认使用中心区域
                        estimated_vertices = [[40, 40], [60, 40], [60, 60], [40, 60]]
                        estimated_polygon_points = [{"x": 40, "y": 40}, {"x": 60, "y": 40}, {"x": 60, "y": 60}, {"x": 40, "y": 60}]
                        estimated_center = [50, 50]
                        estimated_center_point = {"x": 50.0, "y": 50.0}
                        estimated_rule = "Central"
                
                # 如果成功估算，创建 visual_mass 对象（包含所有必需字段）
                if estimated_vertices:
                    visual_mass = {
                        "type": "polygon",
                        "confidence": confidence,
                        "description": f"基于 subject_weight.description 的估算：{subject_desc[:50]}...",
                        "score": estimated_score,
                        "composition_rule": estimated_rule,
                        "vertices": estimated_vertices,
                        "polygon_points": estimated_polygon_points,
                        "center_of_gravity": estimated_center,
                        "center_point": estimated_center_point,
                        "note": "此数据是基于 subject_weight.description 的自动估算，因为 Gemini 未输出 visual_mass 字段"
                    }
                    logger.info(f"_format_composition (新结构): 已基于 subject_weight.description 估算 visual_mass，vertices = {estimated_vertices}, center = {estimated_center}, score = {estimated_score}, rule = {estimated_rule}")
                else:
                    # 如果无法估算，使用默认值（包含所有必需字段）
                    visual_mass = {
                        "type": "polygon",
                        "confidence": 0.5,
                        "description": "默认估算（Gemini 未输出 visual_mass 字段，且无法从 subject_weight.description 估算）",
                        "score": 50,
                        "composition_rule": "Unknown",
                        "vertices": [[40, 40], [60, 40], [60, 60], [40, 60]],
                        "polygon_points": [{"x": 40, "y": 40}, {"x": 60, "y": 40}, {"x": 60, "y": 60}, {"x": 40, "y": 60}],
                        "center_of_gravity": [50, 50],
                        "center_point": {"x": 50.0, "y": 50.0},
                        "note": "此数据是默认值，因为 Gemini 未输出 visual_mass 字段且无法估算"
                    }
                    logger.warning(f"_format_composition (新结构): 无法基于 subject_weight.description 估算 visual_mass，使用默认值")
                
            # 【修复】构建 visual_mass_final（如果提供了显著性遮罩图 URL，添加到 visual_mass 中）
            # 注意：必须在 visual_mass 创建/归一化完成后，再构建 visual_mass_final
            # 【防御性修复】确保 visual_mass_final 始终被定义，防止 UnboundLocalError
            # 注意：visual_mass 可能在上面的代码块中被定义，也可能没有被定义（如果上面的代码块未执行）
            # 因此，我们需要确保 visual_mass_final 在所有情况下都被初始化
            if 'visual_mass' in locals() and visual_mass:
                visual_mass_final = visual_mass
            else:
                visual_mass_final = None
            
            # 如果提供了显著性遮罩图 URL，添加到 visual_mass_final 中
            if visual_mass_final and isinstance(visual_mass_final, dict) and saliency_mask_url:
                visual_mass_final["saliency_mask_url"] = saliency_mask_url
                logger.info(f"_format_composition (新结构): ✅ 已添加显著性遮罩图 URL 到 visual_mass")
                
            # 构建新结构（5字段）
            structured = {
                "main_structure": main_structure,
                "subject_weight": {
                    "description": subject_weight.get("description", "") if isinstance(subject_weight, dict) else "",
                        "layers": subject_weight.get("layers", "") if isinstance(subject_weight, dict) else "",
                        # 【新增】提取 score 和 method 字段
                        "score": subject_weight.get("score", 0) if isinstance(subject_weight, dict) else 0,
                        "method": subject_weight.get("method", "") if isinstance(subject_weight, dict) else ""
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
                    "style_class": style_class,
                    # 【新增】添加 visual_flow 和 spatial_depth 数据（用于前端展示）
                    "visual_flow": visual_flow if isinstance(visual_flow, dict) and visual_flow else None,
                    "spatial_depth": spatial_depth if isinstance(spatial_depth, dict) and spatial_depth else None,
                    # 【新增】提取 composition_clinic 数据（构图诊疗室）
                    "composition_clinic": module_2.get("composition_clinic", {}) if isinstance(module_2.get("composition_clinic"), dict) else None,
                    # 【修复】提取 negative_space 数据（包含 horizontal_balance 和 vertical_balance）
                    "negative_space": module_2.get("negative_space", {}) if isinstance(module_2.get("negative_space"), dict) else None,
                    # 【新增】提取 visual_mass 数据（用于前端Visual Mass功能 - 视觉质量/视觉重心）
                    # 【重要】如果 visual_mass 存在且有 vertices，则使用；否则为 None（但通常不会为 None，因为上面有兜底逻辑）
                    # 【新增】如果提供了显著性遮罩图 URL，已在上面的代码中添加到 visual_mass_final 中
                    "visual_mass": visual_mass_final
                }
            
            # 【调试日志】记录提取的数据
            logger.info(f"_format_composition (新结构): subject_weight.score = {structured['subject_weight'].get('score', 'N/A')}")
            logger.info(f"_format_composition (新结构): subject_weight.method = {structured['subject_weight'].get('method', 'N/A')}")
            logger.debug(f"_format_composition (新结构): visual_flow = {visual_flow if isinstance(visual_flow, dict) else 'None'}")
            logger.debug(f"_format_composition (新结构): spatial_depth = {spatial_depth if isinstance(spatial_depth, dict) else 'None'}")
            # 【新增】记录 negative_space 数据
            negative_space_data = structured.get('negative_space', {})
            if negative_space_data:
                logger.info(f"_format_composition (新结构): negative_space.percentage = {negative_space_data.get('percentage', 'N/A')}")
                logger.info(f"_format_composition (新结构): negative_space.horizontal_balance = {negative_space_data.get('horizontal_balance', 'N/A')}")
                logger.info(f"_format_composition (新结构): negative_space.vertical_balance = {negative_space_data.get('vertical_balance', 'N/A')}")
            else:
                logger.warning(f"_format_composition (新结构): negative_space 数据缺失，前端将无法显示 H-Balance 和 V-Balance")
            # 【新增】记录 visual_mass 数据（增强日志，便于排查问题）
            visual_mass_data = structured.get('visual_mass', {})
            if visual_mass_data:
                vertices_count = len(visual_mass_data.get('vertices', []))
                confidence = visual_mass_data.get('confidence', 'N/A')
                center = visual_mass_data.get('center_of_gravity', 'N/A')
                mask_url = visual_mass_data.get('saliency_mask_url', None)
                vertices_preview = str(visual_mass_data.get('vertices', []))[:200] if visual_mass_data.get('vertices') else 'None'
                logger.info(f"_format_composition (新结构): visual_mass.vertices 数量 = {vertices_count}, confidence = {confidence}, center_of_gravity = {center}")
                logger.debug(f"_format_composition (新结构): visual_mass.vertices 预览 = {vertices_preview}")
                if mask_url:
                    logger.info(f"_format_composition (新结构): ✅ 显著性遮罩图 URL 已添加: {mask_url}")
                else:
                    logger.debug(f"_format_composition (新结构): 未提供显著性遮罩图 URL，前端将使用多边形方案（visual_mass.vertices）")
            else:
                # 【增强日志】记录 module_2 的完整 keys，帮助排查为什么 visual_mass 缺失
                module_2_keys = list(module_2.keys()) if isinstance(module_2, dict) else []
                logger.warning(f"_format_composition (新结构): visual_mass 数据缺失，前端将无法显示 Visual Mass 功能")
                logger.warning(f"_format_composition (新结构): module_2_composition 的 keys = {module_2_keys}")
                logger.warning(f"_format_composition (新结构): 请检查 Gemini 是否输出了 visual_mass 字段，如果没有，请强化 Prompt 要求")
                
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
            # 【修复】确保曲线点格式统一为对象数组格式 {x, y}，兼容 Gemini 输出的两种格式：
            # 1. 对象数组格式：[{ "x": 0, "y": 30 }, { "x": 64, "y": 100 }]
            # 2. 数组格式：[[0, 30], [64, 100]]
            # 【重要】曲线必须符合后期领域规范：必须包含起点 (0, 0) 和终点 (255, 255)
            def normalize_curve_points(points):
                """将曲线点统一转换为 {x, y} 对象数组格式，并确保包含起点和终点"""
                if not points or not isinstance(points, list):
                    # 如果为空，返回默认的起点和终点
                    return [{"x": 0, "y": 0}, {"x": 255, "y": 255}]
                
                normalized = []
                for point in points:
                    if isinstance(point, dict):
                        # 已经是对象格式，直接使用
                        normalized.append({"x": int(point.get("x", 0)), "y": int(point.get("y", 0))})
                    elif isinstance(point, (list, tuple)) and len(point) >= 2:
                        # 数组格式 [x, y]，转换为对象格式
                        normalized.append({"x": int(point[0]), "y": int(point[1])})
                
                # 【重要修复】确保曲线必须包含起点 (0, 0) 和终点 (255, 255)
                # 如果第一个点不是 (0, 0)，在开头添加
                if not normalized or normalized[0]["x"] != 0 or normalized[0]["y"] != 0:
                    normalized.insert(0, {"x": 0, "y": 0})
                
                # 如果最后一个点不是 (255, 255)，在末尾添加
                if not normalized or normalized[-1]["x"] != 255 or normalized[-1]["y"] != 255:
                    normalized.append({"x": 255, "y": 255})
                
                # 按 x 坐标排序，确保曲线点顺序正确
                normalized.sort(key=lambda p: p["x"])
                
                return normalized
            
            tone_curves_data = {}
            if isinstance(tone_curves, dict):
                tone_curves_data = {
                    "explanation": tone_curves.get("explanation", ""),
                    "points_rgb": normalize_curve_points(tone_curves.get("points_rgb", [])),  # 【修复】统一格式
                    "points_red": normalize_curve_points(tone_curves.get("points_red", [])),  # 【修复】统一格式
                    "points_green": normalize_curve_points(tone_curves.get("points_green", [])),  # 【修复】统一格式
                    "points_blue": normalize_curve_points(tone_curves.get("points_blue", [])),  # 【修复】统一格式
                }
                logger.info(f"_format_lighting: ✅ 已提取色调曲线数据: points_rgb={len(tone_curves_data['points_rgb'])}, points_red={len(tone_curves_data['points_red'])}, points_green={len(tone_curves_data['points_green'])}, points_blue={len(tone_curves_data['points_blue'])}")
            
            # 【新增】提取 action_priorities 数据（行动优先级）
            action_priorities = module_3.get("action_priorities", {})
            action_priorities_data = {}
            if isinstance(action_priorities, dict):
                action_priorities_data = {
                    "note": action_priorities.get("note", ""),
                    "primary_action": action_priorities.get("primary_action", {}),
                    "secondary_action": action_priorities.get("secondary_action", {}),
                    "tertiary_action": action_priorities.get("tertiary_action", {}),
                }
                logger.info(f"_format_lighting: ✅ 已提取 action_priorities: primary={action_priorities_data.get('primary_action', {}).get('tool', 'N/A')}")
            
            structured = {
                "basic": basic,
                "texture": texture,
            }
            
            # 如果有色调曲线数据，添加到 structured
            if tone_curves_data and (tone_curves_data.get("points_rgb") or tone_curves_data.get("points_red")):
                structured["toneCurves"] = tone_curves_data
            
            # 【新增】如果有 action_priorities 数据，添加到 structured
            if action_priorities_data and action_priorities_data.get("primary_action"):
                structured["action_priorities"] = action_priorities_data
            
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
        
        # 【新增】检查 lightroom_workflow 中是否包含 simulated_histogram
        if isinstance(lr_workflow, dict):
            has_sim_hist_in_lr_workflow = "simulated_histogram" in lr_workflow
            logger.info(f"【_format_lightroom】lightroom_workflow 中是否包含 simulated_histogram: {has_sim_hist_in_lr_workflow}")
            if has_sim_hist_in_lr_workflow:
                sim_hist_raw = lr_workflow.get("simulated_histogram")
                logger.info(f"【_format_lightroom】simulated_histogram 原始数据: 类型={type(sim_hist_raw).__name__}, 是否为字典={isinstance(sim_hist_raw, dict)}")
                if isinstance(sim_hist_raw, dict):
                    logger.info(f"【_format_lightroom】simulated_histogram keys: {list(sim_hist_raw.keys())}")
                    logger.info(f"【_format_lightroom】simulated_histogram 内容检查: description={bool(sim_hist_raw.get('description'))}, rgb_values={bool(sim_hist_raw.get('rgb_values'))}, histogram_data={bool(sim_hist_raw.get('histogram_data'))}")
        
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
            # 【修复】兼容两种格式：数组格式 [[x, y], ...] 和对象格式 [{"x": 0, "y": 0}, ...]
            # 从 tone_curve_obj 中提取 rgb_points，如果不存在则使用默认值
            raw_rgb_points = tone_curve_obj.get("rgb_points", [[0, 0], [64, 64], [128, 128], [192, 192], [255, 255]])
            # 统一转换为数组格式，便于后续处理
            if raw_rgb_points and len(raw_rgb_points) > 0:
                # 检查第一个点的格式
                first_point = raw_rgb_points[0]
                if isinstance(first_point, dict):
                    # 对象格式，转换为数组格式
                    tone_curve_points = [[int(p.get("x", 0)), int(p.get("y", 0))] for p in raw_rgb_points]
                else:
                    # 已经是数组格式，直接使用
                    tone_curve_points = raw_rgb_points
            else:
                tone_curve_points = [[0, 0], [64, 64], [128, 128], [192, 192], [255, 255]]
            
            # 【修复】同样处理单通道曲线，兼容两种格式
            def normalize_channel_points(channel_points):
                """将通道曲线点统一转换为数组格式"""
                if not channel_points or len(channel_points) == 0:
                    return []
                first_point = channel_points[0]
                if isinstance(first_point, dict):
                    # 对象格式，转换为数组格式
                    return [[int(p.get("x", 0)), int(p.get("y", 0))] for p in channel_points]
                else:
                    # 已经是数组格式，直接使用
                    return channel_points
            
            rgb_curves = {
                "red": normalize_channel_points(tone_curve_obj.get("red_channel", [])),
                "green": normalize_channel_points(tone_curve_obj.get("green_channel", [])),
                "blue": normalize_channel_points(tone_curve_obj.get("blue_channel", [])),
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
                
                # 【修复】提取 split_toning_detail 的 reason 字段，用于前端显示描述
                # 根据开发方案，split_toning_detail 的每个字段（highlights、shadows、balance）都应包含 reason 字段
                color_grading = {
                    "highlights": {
                        "hue": extract_number(highlights.get("h", 0)) if isinstance(highlights, dict) else 0,
                        "saturation": extract_number(highlights.get("s", 0)) if isinstance(highlights, dict) else 0,
                        "reason": highlights.get("reason", "") if isinstance(highlights, dict) else "",  # 【新增】提取高光调整原因描述
                    },
                    "midtones": {
                        "hue": 0,
                        "saturation": 0,
                        "reason": "",  # 【新增】中间调通常不在 split_toning_detail 中，设为空字符串
                    },
                    "shadows": {
                        "hue": extract_number(shadows.get("h", 0)) if isinstance(shadows, dict) else 0,
                        "saturation": extract_number(shadows.get("s", 0)) if isinstance(shadows, dict) else 0,
                        "reason": shadows.get("reason", "") if isinstance(shadows, dict) else "",  # 【新增】提取阴影调整原因描述
                    },
                    "balance": extract_number(balance.get("val", "0")) if isinstance(balance, dict) else 0,
                    "balance_reason": balance.get("reason", "") if isinstance(balance, dict) else "",  # 【新增】提取平衡调整原因描述（单独字段，因为 balance 是数值）
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
                    # 【关键修复】tone_curve_points 已经在上面统一转换为数组格式 [[x, y], ...]
                    # 所以这里可以直接访问 p[0] 和 p[1]
                    points_str = ", ".join([f"({p[0]}, {p[1]})" for p in tone_curve_points[:5]])  # 最多显示 5 个点
                    curve_params.append({
                        "name": "RGB 曲线",  # 【重要】名称必须包含 "RGB" 或 "rgb"，前端才能识别
                        "value": points_str,  # 格式："(0, 0), (128, 125), (255, 255)"
                        "reason": curve_reason if curve_reason else "色调曲线调整",
                    })
                    logger.info(f"【_format_lightroom】RGB 曲线已添加，点数: {len(tone_curve_points[:5])}, 值: {points_str}")
                else:
                    # 【修复】使用 f-string 或 repr() 安全输出，避免字符串格式化错误
                    # 如果使用普通字符串，Python 会将 {tone_curve_points} 解析为格式化占位符
                    # 当 tone_curve_points 包含 JSON 格式数据（如 [{"x": 0, "y": 0}]）时，会导致 "Invalid format specifier" 错误
                    logger.warning(f"【_format_lightroom】RGB 曲线点为空，tone_curve_points = {repr(tone_curve_points)}")
                
                # 如果有红色通道曲线
                if rgb_curves.get("red") and len(rgb_curves["red"]) > 0:
                    red_points = rgb_curves["red"][:5]  # 最多显示 5 个点
                    # 【修复】rgb_curves["red"] 已经在上面统一转换为数组格式，可以直接访问 p[0] 和 p[1]
                    red_str = ", ".join([f"({p[0]}, {p[1]})" for p in red_points])
                    curve_params.append({
                        "name": "红色通道曲线",
                        "value": red_str,
                        "reason": curve_reason if curve_reason else None,
                    })
                
                # 如果有绿色通道曲线
                if rgb_curves.get("green") and len(rgb_curves["green"]) > 0:
                    green_points = rgb_curves["green"][:5]
                    # 【修复】rgb_curves["green"] 已经在上面统一转换为数组格式，可以直接访问 p[0] 和 p[1]
                    green_str = ", ".join([f"({p[0]}, {p[1]})" for p in green_points])
                    curve_params.append({
                        "name": "绿色通道曲线",
                        "value": green_str,
                        "reason": curve_reason if curve_reason else None,
                    })
                
                # 如果有蓝色通道曲线
                if rgb_curves.get("blue") and len(rgb_curves["blue"]) > 0:
                    blue_points = rgb_curves["blue"][:5]
                    # 【修复】rgb_curves["blue"] 已经在上面统一转换为数组格式，可以直接访问 p[0] 和 p[1]
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
            
            # 【新增】提取 simulated_histogram 数据（直方图描述和 RGB 值）
            # 从 lightroom_workflow.simulated_histogram 中提取直方图描述、RGB 值和完整的直方图数据
            # 用于前端 Lightroom 面板显示模拟直方图信息
            simulated_histogram = lr_workflow.get("simulated_histogram", {})
            histogram_data = None  # 【修复】初始化为 None，只有真正有数据时才创建对象
            
            # 【调试日志】记录原始 simulated_histogram 数据
            logger.info(f"【_format_lightroom】🔍 开始提取 simulated_histogram: 存在={bool(simulated_histogram)}, 类型={type(simulated_histogram).__name__}")
            if isinstance(simulated_histogram, dict):
                logger.info(f"【_format_lightroom】simulated_histogram keys: {list(simulated_histogram.keys())}")
                description = simulated_histogram.get("description", "")  # 直方图形态描述（如："直方图整体大幅向右移动（高调）"）
                rgb_values = simulated_histogram.get("rgb_values", {})  # RGB 值（如：{"r": 200, "g": 200, "b": 210}）
                histogram_data_raw = simulated_histogram.get("histogram_data", {})  # 【新增】完整的直方图数据（256 个值）
                
                # 【新增】提取 histogram_data 中的 r、g、b、l 数组（每个数组包含 256 个值，对应亮度级别 0-255）
                histogram_r = histogram_data_raw.get("r", []) if isinstance(histogram_data_raw, dict) else []
                histogram_g = histogram_data_raw.get("g", []) if isinstance(histogram_data_raw, dict) else []
                histogram_b = histogram_data_raw.get("b", []) if isinstance(histogram_data_raw, dict) else []
                histogram_l = histogram_data_raw.get("l", []) if isinstance(histogram_data_raw, dict) else []
                
                # 【修复】支持非256长度的histogram_data数组，进行线性插值扩展到256个值
                # Gemini 可能输出少于256个值（如16个值），需要插值扩展以匹配标准直方图格式
                def interpolate_histogram(data: list, target_length: int = 256) -> list:
                    """
                    将直方图数据插值扩展到目标长度（256个值）
                    使用线性插值方法，确保数据平滑过渡
                    
                    Args:
                        data: 原始直方图数据数组（可能少于256个值）
                        target_length: 目标长度（默认256）
                    
                    Returns:
                        插值后的直方图数据数组（长度为target_length）
                    """
                    if not isinstance(data, list) or len(data) == 0:
                        return []
                    
                    # 如果已经是目标长度，直接返回
                    if len(data) == target_length:
                        return data
                    
                    # 如果数据长度大于目标长度，进行降采样
                    if len(data) > target_length:
                        step = len(data) / target_length
                        return [data[int(i * step)] for i in range(target_length)]
                    
                    # 如果数据长度小于目标长度，进行线性插值
                    result = []
                    source_length = len(data)
                    for i in range(target_length):
                        # 计算在源数组中的位置（浮点数）
                        source_pos = (i / (target_length - 1)) * (source_length - 1)
                        # 获取相邻两个点的索引
                        idx_low = int(source_pos)
                        idx_high = min(idx_low + 1, source_length - 1)
                        # 计算插值权重
                        weight = source_pos - idx_low
                        # 线性插值
                        interpolated_value = data[idx_low] * (1 - weight) + data[idx_high] * weight
                        result.append(interpolated_value)
                    
                    return result
                
                # 【修复】对每个通道进行插值扩展
                histogram_r_interpolated = interpolate_histogram(histogram_r) if histogram_r else []
                histogram_g_interpolated = interpolate_histogram(histogram_g) if histogram_g else []
                histogram_b_interpolated = interpolate_histogram(histogram_b) if histogram_b else []
                histogram_l_interpolated = interpolate_histogram(histogram_l) if histogram_l else []
                
                # 【日志记录】记录插值前后的数据长度
                if histogram_r and len(histogram_r) != 256:
                    logger.info(f"【_format_lightroom】histogram_data.r 插值: {len(histogram_r)} -> 256")
                if histogram_g and len(histogram_g) != 256:
                    logger.info(f"【_format_lightroom】histogram_data.g 插值: {len(histogram_g)} -> 256")
                if histogram_b and len(histogram_b) != 256:
                    logger.info(f"【_format_lightroom】histogram_data.b 插值: {len(histogram_b)} -> 256")
                if histogram_l and len(histogram_l) != 256:
                    logger.info(f"【_format_lightroom】histogram_data.l 插值: {len(histogram_l)} -> 256")
                
                # 【修复】即使只有 histogram_data_raw（没有 description），也应该创建 histogram_data 对象
                # 因为前端需要 histogram_data 来渲染直方图
                # 【修复】检查条件：只要有 description、rgb_values 或 histogram_data_raw 中的任何一个，就创建对象
                if description or rgb_values or histogram_data_raw:
                    # 【修复】检查插值后的数组是否有效（长度大于0）
                    # 注意：histogram_data_raw 可能是空字典 {}，需要检查是否真的包含数据
                    has_histogram_data_raw = (
                        histogram_data_raw and 
                        isinstance(histogram_data_raw, dict) and 
                        (histogram_r or histogram_g or histogram_b or histogram_l)
                    )
                    
                    has_valid_histogram_data = (
                        has_histogram_data_raw and 
                        (len(histogram_r_interpolated) > 0 or 
                         len(histogram_g_interpolated) > 0 or 
                         len(histogram_b_interpolated) > 0 or 
                         len(histogram_l_interpolated) > 0)
                    )
                    
                    # 【调试日志】记录原始数据检查
                    logger.info(f"【_format_lightroom】histogram_data_raw 检查: 存在={bool(histogram_data_raw)}, 类型={type(histogram_data_raw).__name__}, r长度={len(histogram_r)}, g长度={len(histogram_g)}, b长度={len(histogram_b)}, l长度={len(histogram_l)}")
                    
                    # 【修复】只要有 description、rgb_values 或有效的 histogram_data，就创建 histogram_data 对象
                    # 即使 histogram_data 为 None，也应该创建对象（前端需要 description 和 rgb_values）
                    if description or rgb_values or has_valid_histogram_data:
                        # 【新增】提取 stats_grid_description 和 palette_strip_description
                        stats_grid_description = simulated_histogram.get("stats_grid_description", "")
                        palette_strip_description = simulated_histogram.get("palette_strip_description", "")
                        
                        histogram_data = {
                            "description": description,
                            "rgb_values": rgb_values if isinstance(rgb_values, dict) else {},
                            # 【修复】添加插值后的完整直方图数据数组（256个值，用于前端绘制直方图）
                            # 只有当插值后的数组有效时才添加 histogram_data
                            "histogram_data": {
                                "r": histogram_r_interpolated,
                                "g": histogram_g_interpolated,
                                "b": histogram_b_interpolated,
                                "l": histogram_l_interpolated,
                            } if has_valid_histogram_data else None,
                            # 【新增】添加 Stats Grid 和 Palette Strip 的说明
                            "stats_grid_description": stats_grid_description,
                            "palette_strip_description": palette_strip_description,
                        }
                        logger.info(f"【_format_lightroom】✅ 已创建 simulated_histogram 对象: description={description[:50] if description else 'None'}, rgb_values={rgb_values}, histogram_data存在={has_valid_histogram_data}")
                        if has_valid_histogram_data:
                            logger.info(f"【_format_lightroom】✅ histogram_data 插值后数组长度: r={len(histogram_r_interpolated)}, g={len(histogram_g_interpolated)}, b={len(histogram_b_interpolated)}, l={len(histogram_l_interpolated)}")
                            logger.info(f"【_format_lightroom】histogram_data 原始数组长度: r={len(histogram_r)}, g={len(histogram_g)}, b={len(histogram_b)}, l={len(histogram_l)}")
                            # 【新增】记录前几个值，用于验证数据正确性
                            logger.debug(f"【_format_lightroom】histogram_data 插值后前5个值: r={histogram_r_interpolated[:5]}, g={histogram_g_interpolated[:5]}, b={histogram_b_interpolated[:5]}, l={histogram_l_interpolated[:5]}")
                        else:
                            logger.warning(f"【_format_lightroom】⚠️ histogram_data 无效或为空，但已创建对象（包含 description 和 rgb_values）: histogram_data_raw存在={bool(histogram_data_raw)}, has_histogram_data_raw={has_histogram_data_raw}, 插值后r长度={len(histogram_r_interpolated)}, g长度={len(histogram_g_interpolated)}, b长度={len(histogram_b_interpolated)}, l长度={len(histogram_l_interpolated)}")
                    else:
                        logger.warning(f"【_format_lightroom】⚠️ simulated_histogram 数据完全为空，不创建对象: description={bool(description)}, rgb_values={bool(rgb_values)}, histogram_data_raw={bool(histogram_data_raw)}")
            
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
            
            # 【新增】记录最终返回的 simulatedHistogram 状态
            logger.info(f"【_format_lightroom】📊 最终返回的 simulatedHistogram 状态: histogram_data存在={histogram_data is not None}, histogram_data类型={type(histogram_data).__name__ if histogram_data else 'None'}")
            if histogram_data:
                logger.info(f"【_format_lightroom】simulatedHistogram 内容: description={bool(histogram_data.get('description'))}, rgb_values={bool(histogram_data.get('rgb_values'))}, histogram_data={histogram_data.get('histogram_data') is not None}")
                if histogram_data.get('histogram_data'):
                    hist_data = histogram_data.get('histogram_data')
                    logger.info(f"【_format_lightroom】histogram_data 数组长度: r={len(hist_data.get('r', []))}, g={len(hist_data.get('g', []))}, b={len(hist_data.get('b', []))}, l={len(hist_data.get('l', []))}")
            
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
                    "simulatedHistogram": histogram_data,  # 【修复】直接返回 histogram_data，即使为 None 也返回（前端需要判断）
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
            
            # 【修复】提取 color_grading_wheels 的 reason 字段（用于前端显示描述）
            # 根据开发方案，color_grading_wheels 的每个字段（highlights、midtones、shadows）都应包含 reason 字段
            grading_result = {
                "highlights": {
                    "hue": extract_number(highlights.get("hue", 0)),
                    "saturation": extract_number(highlights.get("saturation", 0)),
                    "reason": highlights.get("reason", ""),  # 【新增】提取高光调整原因描述
                },
                "midtones": {
                    "hue": extract_number(midtones.get("hue", 0)),
                    "saturation": extract_number(midtones.get("saturation", 0)),
                    "reason": midtones.get("reason", ""),  # 【新增】提取中间调调整原因描述
                },
                "shadows": {
                    "hue": extract_number(shadows.get("hue", 0)),
                    "saturation": extract_number(shadows.get("saturation", 0)),
                    "reason": shadows.get("reason", ""),  # 【新增】提取阴影调整原因描述
                },
                "balance": balance_value,
            }
            
            # 【新增】记录 color_grading_wheels 提取结果，用于调试
            logger.info(f"_format_color_part2: ✅ 提取 color_grading_wheels 数据:")
            logger.info(f"  - highlights: hue={grading_result['highlights']['hue']}, saturation={grading_result['highlights']['saturation']}, reason={grading_result['highlights']['reason'][:50] if grading_result['highlights']['reason'] else 'EMPTY'}...")
            logger.info(f"  - midtones: hue={grading_result['midtones']['hue']}, saturation={grading_result['midtones']['saturation']}, reason={grading_result['midtones']['reason'][:50] if grading_result['midtones']['reason'] else 'EMPTY'}...")
            logger.info(f"  - shadows: hue={grading_result['shadows']['hue']}, saturation={grading_result['shadows']['saturation']}, reason={grading_result['shadows']['reason'][:50] if grading_result['shadows']['reason'] else 'EMPTY'}...")
            logger.info(f"  - balance: {balance_value}")
            
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
            # 【关键修复】首先检查 raw 的顶层结构，记录所有键
            logger.info(f"_format_color_part2: 🔍 raw 数据顶层键: {list(raw.keys()) if isinstance(raw, dict) else 'not dict'}")
            
            phase_1_extraction = raw.get("phase_1_extraction", {})
            
            # 【关键修复】添加详细日志，记录 phase_1_extraction 的提取情况
            logger.info(f"_format_color_part2: raw 数据检查: has phase_1_extraction = {bool(phase_1_extraction)}, phase_1_extraction type = {type(phase_1_extraction)}")
            if phase_1_extraction:
                logger.info(f"_format_color_part2: phase_1_extraction keys = {list(phase_1_extraction.keys()) if isinstance(phase_1_extraction, dict) else 'not dict'}")
                if isinstance(phase_1_extraction, dict):
                    master_style_recap_raw = phase_1_extraction.get('master_style_recap', 'NOT_FOUND')
                    style_summary_recap_raw = phase_1_extraction.get('style_summary_recap', 'NOT_FOUND')
                    key_adjustment_strategy_raw = phase_1_extraction.get('key_adjustment_strategy', 'NOT_FOUND')
                    
                    logger.info(f"_format_color_part2: phase_1_extraction.master_style_recap = {master_style_recap_raw[:100] if master_style_recap_raw and master_style_recap_raw != 'NOT_FOUND' else 'EMPTY/NOT_FOUND'}")
                    logger.info(f"_format_color_part2: phase_1_extraction.style_summary_recap = {style_summary_recap_raw[:100] if style_summary_recap_raw and style_summary_recap_raw != 'NOT_FOUND' else 'EMPTY/NOT_FOUND'}")
                    logger.info(f"_format_color_part2: phase_1_extraction.key_adjustment_strategy = {key_adjustment_strategy_raw[:100] if key_adjustment_strategy_raw and key_adjustment_strategy_raw != 'NOT_FOUND' else 'EMPTY/NOT_FOUND'}")
            else:
                logger.warning(f"_format_color_part2: ⚠️ raw 数据中没有 phase_1_extraction 字段！raw keys = {list(raw.keys()) if isinstance(raw, dict) else 'not dict'}")
                # 【新增】尝试从其他可能的位置查找 phase_1_extraction
                if isinstance(raw, dict):
                    for key in raw.keys():
                        if 'phase' in key.lower() or 'extraction' in key.lower():
                            logger.warning(f"_format_color_part2: 🔍 发现可能的 phase_1_extraction 字段: {key}")
            
            # 【新增】优先使用 master_style_recap（流派识别），如果没有则使用 key_adjustment_strategy
            master_style_recap = phase_1_extraction.get("master_style_recap", "") if isinstance(phase_1_extraction, dict) else ""
            style_key = phase_1_extraction.get("key_adjustment_strategy", "") if isinstance(phase_1_extraction, dict) else ""
            # 如果 master_style_recap 存在，优先使用它作为 styleKey
            if master_style_recap:
                style_key = master_style_recap
            elif not style_key:
                # 如果没有，尝试从旧结构的 color_mapping 中获取
                color_mapping_old = raw.get("color_mapping", {})
                style_key = color_mapping_old.get("suggested_LUT", "") if isinstance(color_mapping_old, dict) else ""
            
            # 【新增】提取 phase_1_extraction 的三个字段，用于前端色彩策略卡片展示
            # 根据开发方案，这三个字段需要在色彩策略中展示：
            # - master_style_recap: 主风格回顾（流派识别）
            # - style_summary_recap: 风格总结回顾（Phase 1 核心指导思想）
            # - key_adjustment_strategy: 关键调整策略（三大动作）
            style_summary_recap = phase_1_extraction.get("style_summary_recap", "") if isinstance(phase_1_extraction, dict) else ""
            key_adjustment_strategy = phase_1_extraction.get("key_adjustment_strategy", "") if isinstance(phase_1_extraction, dict) else ""
            
            # 【关键修复】确保三个字段至少是空字符串，而不是 None
            master_style_recap = master_style_recap or ""
            style_summary_recap = style_summary_recap or ""
            key_adjustment_strategy = key_adjustment_strategy or ""
            
            logger.info(f"_format_color_part2: 提取 phase_1_extraction 字段: master_style_recap={bool(master_style_recap)}, style_summary_recap={bool(style_summary_recap)}, key_adjustment_strategy={bool(key_adjustment_strategy)}")
            if master_style_recap:
                logger.info(f"_format_color_part2: master_style_recap 内容: {master_style_recap[:100]}...")
            if style_summary_recap:
                logger.info(f"_format_color_part2: style_summary_recap 内容: {style_summary_recap[:100]}...")
            if key_adjustment_strategy:
                logger.info(f"_format_color_part2: key_adjustment_strategy 内容: {key_adjustment_strategy[:100]}...")
            
            # 【关键修复】构建返回结构，确保三个字段都被包含
            result_structured = {
                "styleKey": style_key,
                "whiteBalance": white_balance_result,
                "grading": grading_result,
                "hsl": hsl_list,
                # 【新增】phase_1_extraction 三个字段，用于前端色彩策略卡片展示
                "master_style_recap": master_style_recap,  # 主风格回顾
                "style_summary_recap": style_summary_recap,  # 风格总结回顾
                "key_adjustment_strategy": key_adjustment_strategy,  # 关键调整策略
            }
            
            # 【关键修复】记录最终返回结构中的三个字段值
            logger.info(f"_format_color_part2: ✅ 最终返回 structured 中的三个字段: master_style_recap={bool(result_structured.get('master_style_recap'))}, style_summary_recap={bool(result_structured.get('style_summary_recap'))}, key_adjustment_strategy={bool(result_structured.get('key_adjustment_strategy'))}")
            logger.info(f"_format_color_part2: ✅ 最终返回 structured keys: {list(result_structured.keys())}")
            
            return {
                "naturalLanguage": {
                    "styleKey": style_key,
                    "whiteBalance": temp_reason + " " + tint_reason if temp_reason or tint_reason else "",
                    "colorGrading": "",
                    "hslAdjustments": "",
                },
                "structured": result_structured,
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
            # 提取 style_classification 中的字段
            style_classification = module_1.get("style_classification", {})
            master_archetype = style_classification.get("master_archetype", "") if isinstance(style_classification, dict) else ""
            visual_signature = style_classification.get("visual_signature", "") if isinstance(style_classification, dict) else ""
            
            # 提取 color_depth_analysis 中的字段
            color_depth_analysis = module_1.get("color_depth_analysis", {})
            saturation_strategy = ""
            tonal_intent = ""
            simulated_histogram_data = {}
            color_depth_text = ""
            
            if isinstance(color_depth_analysis, dict):
                color_depth_text = color_depth_analysis.get("text", "")
                saturation_strategy = color_depth_analysis.get("saturation_strategy", "")
                tonal_intent = color_depth_analysis.get("tonal_intent", "")
                simulated_histogram_data = color_depth_analysis.get("simulated_histogram_data", {})
            elif isinstance(color_depth_analysis, str):
                color_depth_text = color_depth_analysis
            
            # 【新增】提取 overlays 字段（区域坐标数据）
            overlays = module_1.get("overlays", {})

            converted["professional_evaluation"] = {
                "comprehensive_review": module_1.get("comprehensive_review", ""),
                "visual_subject_analysis": module_1.get("visual_subject_analysis", ""),
                "focus_exposure_analysis": module_1.get("focus_exposure_analysis", ""),
                # 构建兼容的 color_depth_analysis
                "color_depth_analysis": {
                    "text": color_depth_text,
                    "saturation_strategy": saturation_strategy,
                    "tonal_intent": tonal_intent,
                    "simulated_histogram_data": simulated_histogram_data
                },
                "emotion": module_1.get("emotion", ""),
                "pros_evaluation": module_1.get("pros_evaluation", ""),
                "parameter_comparison_table": module_1.get("parameter_comparison_table", []),
                "style_summary": module_1.get("style_summary", ""),
                "feasibility_assessment": module_1.get("feasibility_assessment", {}),
                # 【新增】添加 overlays 字段
                "overlays": overlays if isinstance(overlays, dict) else {},
                # 添加扁平化字段
                "master_archetype": master_archetype,
                "visual_signature": visual_signature,
                "saturation_strategy": saturation_strategy,
                "tonal_intent": tonal_intent,
                "simulated_histogram_data": simulated_histogram_data
            }
            # 保留新结构以便后续处理
            converted["module_1_critique"] = module_1
        
        # 转换 module_2_composition -> composition
        module_2 = raw.get("module_2_composition", {})
        if module_2:
            # 保留新结构以便后续处理
            converted["module_2_composition"] = module_2
            # 同时构建兼容的 composition 结构
            converted["composition"] = module_2
        
        # 转换 module_3_lighting_params -> lighting
        module_3 = raw.get("module_3_lighting_params", {})
        if module_3:
            # 保留新结构以便后续处理
            converted["module_3_lighting_params"] = module_3
        
        # 【新增】提取 image_verification 字段（图像验证描述）
        # 用于前端在参考图和用户图下方显示图像内容描述
        image_verification = raw.get("image_verification", {})
        if image_verification:
            converted["image_verification"] = image_verification
        
        # 保留其他字段
        for key, value in raw.items():
            if key not in ["module_1_critique", "module_2_composition", "module_3_lighting_params", "image_verification"]:
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

