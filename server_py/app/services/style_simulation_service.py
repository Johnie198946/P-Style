"""
风格模拟服务 - 使用 Gemini API 生成风格迁移图片（Part3）
根据开发方案第 23.4 节和第三阶段开发需求实现
支持传递两张图片（参考图和用户图）和完整的 Part1/Part2 数据
"""
import base64
from typing import Dict, Any, Optional
from loguru import logger

from .gemini_service import GeminiService
from .prompt_template import PromptTemplateService


class StyleSimulationService:
    """
    风格模拟服务
    
    功能：根据 Part1/Part2 的分析结果，生成风格模拟图片
    - 接收参考图和用户原图两张图片
    - 提取完整的 Part1 风格分析理解和 Part2 色彩方案数据
    - 使用新的 Prompt 模板调用 Gemini API 生成 4K 图片
    """

    def __init__(self, gemini_service: GeminiService):
        self.gemini_service = gemini_service
        self.prompt_template = PromptTemplateService()

    def simulate_style(
        self,
        reference_image_data: str,
        user_image_data: str,
        color_grading_schema: Dict[str, Any],
        part1_style_analysis: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        生成风格模拟图片（Part3）
        
        Args:
            reference_image_data: 参考图（base64，用于理解目标风格）
            user_image_data: 用户原图（base64，需要处理的图片）
            color_grading_schema: 完整的色彩方案数据（包含曝光、对比度、HSL、曲线等参数）
            part1_style_analysis: Part1 的风格分析理解（可选）
            options: 可选参数
        
        Returns:
            {
                "originalImage": base64,
                "processedImage": base64,
                "stylePrompt": str,
                "processingTime": float,
            }
        """
        import time
        start_time = time.time()

        try:
            # 构建 Prompt（使用新的模板，包含两张图片和完整的色彩方案数据）
            prompt_text = self.prompt_template.get_part3_flash_prompt(
                reference_image_data,
                user_image_data,
                color_grading_schema,
                part1_style_analysis,
                options,
            )

            # 提取 base64 数据（去除 data URL 前缀）
            def extract_base64(data: str) -> str:
                """从 data URL 中提取 base64 数据"""
                if "," in data:
                    return data.split(",")[-1]
                return data

            reference_base64 = extract_base64(reference_image_data)
            user_base64 = extract_base64(user_image_data)

            # 【构建 contents（包含两张图片和文本）】
            # 【重要】图片顺序必须严格遵守：第一张图片 = 参考图，第二张图片 = 用户原图
            # Gemini API 支持多张图片输入，顺序为：参考图、用户图、Prompt 文本
            # 注意：图片顺序很重要，参考图在前用于理解目标风格，用户图在后是需要处理的图片
            # 【修复】在每张图片前添加明确的文本标记，确保 Gemini 能正确识别图片顺序
            contents = [
                {
                    "role": "user",
                    "parts": [
                        # 【明确标记】第一张图片：参考图（用于理解目标风格，但不直接处理）
                        {"text": "【第一张图片 = 参考图 (Reference Image)】这是目标风格图，仅用于参考，不直接处理。\n"},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": reference_base64,
                            }
                        },
                        # 【明确标记】第二张图片：用户原图（需要处理的图片）
                        {"text": "\n【第二张图片 = 用户原图 (User Image / Source Image)】这是需要处理的图片，必须按照参考图的风格进行调色。\n"},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": user_base64,
                            }
                        },
                        # Prompt 文本（包含完整的色彩方案数据和处理指令）
                        {"text": f"\n{prompt_text}"},
                    ],
                }
            ]

            # 【第三阶段日志】记录调用 Gemini API 前的信息（包含图片顺序标记）
            logger.info(f"【Part3 风格模拟】开始调用 Gemini API 生成图片")
            logger.info(f"【Part3 风格模拟】✅ 图片顺序确认：第一张 = 参考图，第二张 = 用户原图")
            logger.info(f"【Part3 风格模拟】参考图 Base64 长度: {len(reference_base64)} 字符")
            logger.info(f"【Part3 风格模拟】用户原图 Base64 长度: {len(user_base64)} 字符")
            # 【新增】记录图片的前几个字符，用于识别（不记录完整数据，避免日志过大）
            logger.info(f"【Part3 风格模拟】参考图 Base64 前缀: {reference_base64[:50]}...")
            logger.info(f"【Part3 风格模拟】用户原图 Base64 前缀: {user_base64[:50]}...")
            logger.info(f"【Part3 风格模拟】Prompt 文本长度: {len(prompt_text)} 字符")
            logger.info(f"【Part3 风格模拟】Prompt 预览（前 500 字符）: {prompt_text[:500]}...")
            # 【新增】检查 Prompt 中是否包含"对第二张图片"的关键词
            if "对第二张图片" in prompt_text or "第二张图片（用户原图）" in prompt_text:
                logger.info(f"【Part3 风格模拟】✅ Prompt 中包含明确的处理对象说明（对第二张图片进行调整）")
            else:
                logger.warning(f"【Part3 风格模拟】⚠️ 警告：Prompt 中可能缺少明确的处理对象说明")
            # 【新增】记录 contents 中 parts 的数量和类型，确保图片顺序正确
            parts_count = len(contents[0]["parts"])
            logger.info(f"【Part3 风格模拟】Contents parts 数量: {parts_count}")
            for i, part in enumerate(contents[0]["parts"]):
                if isinstance(part, dict):
                    if "inline_data" in part:
                        part_data = part['inline_data'].get('data', '')
                        logger.info(f"【Part3 风格模拟】  Part {i+1}: 图片数据（Base64 长度: {len(part_data)} 字符，前缀: {part_data[:30]}...）")
                    elif "text" in part:
                        text_preview = part["text"][:100] if len(part["text"]) > 100 else part["text"]
                        logger.info(f"【Part3 风格模拟】  Part {i+1}: 文本标记（长度: {len(part['text'])} 字符，预览: {text_preview}...）")
            
            # 调用 Gemini API 生成图片
            # 【注意】根据用户需求，优先使用 Gemini 3 Pro 图片生成模型（gemini-3-pro-image-preview）
            # 如果不支持图片生成或失败，会回退到 gemini-2.5-flash-image
            logger.info(f"【Part3 风格模拟】🚀 开始调用 Gemini API 生成图片...")
            logger.info(f"【Part3 风格模拟】Contents 结构: {len(contents)} 个消息，第一个消息包含 {len(contents[0].get('parts', []))} 个 parts")
            
            try:
                processed_image_base64 = self.gemini_service.generate_image(
                    contents, stage="part3", use_cache=True, use_gemini3_pro=True
                )
                logger.info(f"【Part3 风格模拟】✅ Gemini API 调用成功，返回图片 Base64 长度: {len(processed_image_base64)} 字符")
            except Exception as gemini_error:
                error_type = type(gemini_error).__name__
                error_message = str(gemini_error)
                logger.error(f"【Part3 风格模拟】❌ Gemini API 调用失败: 错误类型={error_type}, 错误消息={error_message}", exc_info=True)
                raise

            # 【第三阶段日志】记录 Gemini 返回的图片信息
            logger.info(f"【Part3 风格模拟】✅ Gemini API 调用成功，返回图片 Base64 长度: {len(processed_image_base64)} 字符")
            logger.info(f"【Part3 风格模拟】返回数据类型: {type(processed_image_base64).__name__}")
            # 【新增】对比返回的图片和输入的图片大小，用于判断是否处理了正确的图片
            # 注意：如果返回的图片和用户原图大小相似，可能是 Gemini 没有处理或处理错误
            user_image_size = len(user_image_data)
            processed_image_size = len(processed_image_base64)
            size_diff = abs(processed_image_size - user_image_size)
            logger.info(f"【Part3 风格模拟】图片大小对比：用户原图 {user_image_size} 字符，处理后图片 {processed_image_size} 字符，差异 {size_diff} 字符")
            # 【新增】记录图片的前几个字符，用于识别（不记录完整数据，避免日志过大）
            processed_prefix = processed_image_base64[:50] if len(processed_image_base64) > 50 else processed_image_base64
            user_prefix = user_image_data[:50] if len(user_image_data) > 50 else user_image_data
            logger.info(f"【Part3 风格模拟】处理后图片 Base64 前缀: {processed_prefix}...")
            logger.info(f"【Part3 风格模拟】用户原图 Base64 前缀: {user_prefix}...")
            # 【新增】检查处理后图片是否与用户原图相同（通过前缀比较）
            if processed_prefix == user_prefix:
                logger.warning(f"【Part3 风格模拟】⚠️ 警告：处理后图片的前缀与用户原图相同，可能 Gemini 没有处理或返回了错误的图片")
            if size_diff < user_image_size * 0.1:  # 如果大小差异小于 10%，可能没有处理
                logger.warning(f"【Part3 风格模拟】⚠️ 警告：处理后图片大小与用户原图非常接近（差异 < 10%），可能 Gemini 没有正确处理图片")

            # 【类型检查与转换】确保 processed_image_base64 是字符串类型
            # 如果 Gemini API 返回 bytes，需要先转换为字符串
            if isinstance(processed_image_base64, bytes):
                try:
                    processed_image_base64 = processed_image_base64.decode('utf-8')
                    logger.info(f"【Part3 风格模拟】⚠️ 检测到 bytes 类型，已转换为字符串")
                except UnicodeDecodeError:
                    # 如果 UTF-8 解码失败，使用 base64 编码（将 bytes 转换为 base64 字符串）
                    import base64 as b64_module
                    processed_image_base64 = b64_module.b64encode(processed_image_base64).decode('utf-8')
                    logger.info(f"【Part3 风格模拟】⚠️ bytes 类型 UTF-8 解码失败，使用 base64 编码转换")

            # 添加 data URL 前缀
            # 【重要】确保 processed_image_base64 是字符串类型，才能使用 startswith 方法
            if not processed_image_base64.startswith("data:image"):
                processed_image_base64 = f"data:image/jpeg;base64,{processed_image_base64}"

            elapsed = time.time() - start_time
            
            # 【第三阶段日志】记录处理完成信息
            logger.info(f"【Part3 风格模拟】✅ 风格模拟完成，总耗时: {elapsed:.2f} 秒")
            logger.info(f"【Part3 风格模拟】最终图片 Base64 长度（含 data URL 前缀）: {len(processed_image_base64)} 字符")

            return {
                "originalImage": user_image_data,
                "processedImage": processed_image_base64,
                "stylePrompt": prompt_text,
                "processingTime": elapsed,
            }

        except Exception as e:
            logger.error(f"风格模拟失败: {e}")
            raise

    def extract_color_grading_schema(
        self, structured_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        从结构化结果中提取完整的色彩方案数据（Color Grading Schema）
        包括 Part1 的照片点评完整数据和 Part2 的完整色彩、LR、PS调整方案
        
        【重要】根据第三阶段开发需求和开发方案第 23.4 节，需要提取完整的 Part1/Part2 数据，而不是简单的参数摘要
        
        Args:
            structured_result: 完整的结构化结果（包含 Part1 和 Part2 数据）
        
        Returns:
            完整的色彩方案数据字典，包含：
            - photo_review: Part1 照片点评完整数据（包括 style_summary、overviewSummary、dimensions、comparisonTable、feasibility）
            - lightroom: Lightroom 完整调整方案（panels、toneCurve、rgbCurves、colorGrading）
            - photoshop: Photoshop 完整调整方案（steps）
            - color: 色彩方案完整数据（whiteBalance、grading、hsl）
        
        【重要】变量命名规范：
            - 照片点评数据变量名：photo_review_data（必须正确定义，不能使用未定义的变量）
            - 提取路径：sections.get("photoReview", {}).get("structured", {})
            - style_summary 字段映射：从 structured.photographerStyleSummary 提取，如果没有则从 structured.overviewSummary 提取
        """
        sections = structured_result.get("sections", {})
        
        # 【提取 Part1 照片点评完整数据】
        # 根据开发方案第 23.4 节，需要提取完整的照片点评数据，包括：
        # - style_summary：风格克隆战略指导（最重要的字段）
        # - overviewSummary：整体概览
        # - dimensions：各维度分析（视觉引导、焦点曝光、色彩景深等）
        # - comparisonTable：参数对比表
        # - feasibility：可行性评估
        photo_review_data = {}
        photo_review = sections.get("photoReview", {})
        if photo_review:
            # 提取 structured 数据（包含所有结构化字段）
            structured = photo_review.get("structured", {})
            
            # 提取 style_summary（风格克隆战略指导，最重要的字段）
            # 优先从 photographerStyleSummary 提取（这是 Phase 1 的核心产出）
            style_summary = structured.get("photographerStyleSummary", "")
            # 如果没有，尝试从 overviewSummary 提取
            if not style_summary:
                style_summary = structured.get("overviewSummary", "")
            
            # 构建完整的照片点评数据字典
            photo_review_data = {
                "style_summary": style_summary,  # 风格克隆战略指导（最重要的字段）
                "overviewSummary": structured.get("overviewSummary", ""),  # 整体概览
                "dimensions": structured.get("dimensions", {}),  # 各维度分析
                "comparisonTable": structured.get("comparisonTable", []),  # 参数对比表
                "feasibility": structured.get("feasibility", {}),  # 可行性评估
            }
            
            logger.info(f"【extract_color_grading_schema】Part1 照片点评数据提取完成:")
            logger.info(f"  - style_summary 长度: {len(style_summary)} 字符")
            logger.info(f"  - overviewSummary 长度: {len(photo_review_data.get('overviewSummary', ''))} 字符")
            logger.info(f"  - dimensions keys: {list(photo_review_data.get('dimensions', {}).keys())}")
            logger.info(f"  - comparisonTable 数量: {len(photo_review_data.get('comparisonTable', []))}")
        else:
            logger.warning(f"【extract_color_grading_schema】⚠️ 未找到 photoReview 数据，使用空字典")
        
        # 【提取 Lightroom 完整数据】
        # 包括所有面板（基本面板、细节与质感、色彩调整、HSL/颜色、色调分离、色调曲线）
        # 以及色调曲线、RGB 曲线、色彩分级等完整数据
        lightroom_data = {}
        lr_section = sections.get("lightroom", {})
        if lr_section:
            lr_structured = lr_section.get("structured", {})
            # 提取所有面板数据（6 个面板：基本面板、细节与质感、色彩调整、HSL/颜色、色调分离、色调曲线）
            panels = lr_structured.get("panels", [])
            # 提取色调曲线（5 个控制点）
            tone_curve = lr_structured.get("toneCurve", [])
            # 提取 RGB 曲线（红、绿、蓝三个通道）
            rgb_curves = lr_structured.get("rgbCurves", {})
            # 提取色彩分级（高光、中间调、阴影的色相和饱和度）
            color_grading = lr_structured.get("colorGrading", {})
            
            lightroom_data = {
                "panels": panels,
                "toneCurve": tone_curve,
                "rgbCurves": rgb_curves,
                "colorGrading": color_grading,
            }
        
        # 【提取 Photoshop 完整数据】
        # 包括所有步骤（ACR 滤镜、曲线调整、可选颜色、局部 Dodge & Burn 等）
        photoshop_data = {}
        ps_section = sections.get("photoshop", {})
        if ps_section:
            ps_structured = ps_section.get("structured", {})
            # 提取所有步骤（每个步骤包含 title、description、params、details 等）
            steps = ps_structured.get("steps", [])
            photoshop_data = {
                "steps": steps,
            }
        
        # 【提取色彩方案完整数据】
        # 包括白平衡（色温、色调）、色彩分级（高光、中间调、阴影）、HSL 调整（8 种颜色）
        color_data = {}
        color_section = sections.get("color", {})
        if color_section:
            color_structured = color_section.get("structured", {})
            # 提取白平衡（temperature、tint）
            white_balance = color_structured.get("whiteBalance", {})
            # 提取色彩分级（highlights、midtones、shadows、balance）
            grading = color_structured.get("grading", {})
            # 提取 HSL 调整（8 种颜色：红、橙、黄、绿、青、蓝、紫、洋红）
            hsl = color_structured.get("hsl", [])
            
            color_data = {
                "whiteBalance": white_balance,
                "grading": grading,
                "hsl": hsl,
            }
        
        # 构建完整的色彩方案 Schema
        # 【重要】根据用户需求和开发方案第 23.4 节，输入内容包括：
        # - 照片点评（尤其是 style_summary）：Part1 照片点评完整数据
        # - 色彩方案：Part2 色彩方案完整数据
        # - Lightroom：Part2 Lightroom 完整调整方案
        # - Photoshop：Part2 Photoshop 完整调整方案
        color_grading_schema = {
            "photo_review": photo_review_data,  # Part1 照片点评完整数据（包括 style_summary、overviewSummary、dimensions、comparisonTable、feasibility）
            "lightroom": lightroom_data,  # Lightroom 完整调整方案（panels、toneCurve、rgbCurves、colorGrading）
            "photoshop": photoshop_data,  # Photoshop 完整调整方案（steps）
            "color": color_data,  # 色彩方案完整数据（whiteBalance、grading、hsl）
        }
        
        # 【第三阶段日志】记录提取完成的信息
        logger.info(f"【extract_color_grading_schema】✅ 提取完成:")
        logger.info(f"  - photo_review.style_summary 长度: {len(photo_review_data.get('style_summary', ''))} 字符")
        logger.info(f"  - photo_review.overviewSummary 长度: {len(photo_review_data.get('overviewSummary', ''))} 字符")
        logger.info(f"  - photo_review.dimensions keys: {list(photo_review_data.get('dimensions', {}).keys())}")
        logger.info(f"  - photo_review.comparisonTable 数量: {len(photo_review_data.get('comparisonTable', []))}")
        logger.info(f"  - lightroom.panels 数量: {len(lightroom_data.get('panels', []))}")
        logger.info(f"  - photoshop.steps 数量: {len(photoshop_data.get('steps', []))}")
        logger.info(f"  - color.hsl 数量: {len(color_data.get('hsl', []))}")
        
        return color_grading_schema

