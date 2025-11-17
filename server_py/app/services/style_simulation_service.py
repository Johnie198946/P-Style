"""
风格模拟服务 - 使用 Gemini Flash Image 生成风格迁移图片
根据开发方案第 8 节和风格模拟功能方案实现
"""
import base64
from typing import Dict, Any, Optional
from loguru import logger

from .gemini_service import GeminiService
from .prompt_template import PromptTemplateService


class StyleSimulationService:
    """风格模拟服务"""

    def __init__(self, gemini_service: GeminiService):
        self.gemini_service = gemini_service
        self.prompt_template = PromptTemplateService()

    def simulate_style(
        self,
        user_image_data: str,
        style_summary: Dict[str, Any],
        options: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        生成风格模拟图片
        
        Args:
            user_image_data: 用户图（base64）
            style_summary: 风格参数摘要（从 Part2 结果中提取）
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
            # 构建 Prompt
            prompt_text = self.prompt_template.get_part3_flash_prompt(
                user_image_data, style_summary, options
            )

            # 构建 contents（包含图片和文本）
            contents = [
                {
                    "role": "user",
                    "parts": [
                        {"text": prompt_text},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": user_image_data.split(",")[-1] if "," in user_image_data else user_image_data,
                            }
                        },
                    ],
                }
            ]

            # 调用 Gemini Flash Image
            processed_image_base64 = self.gemini_service.generate_image(
                contents, stage="part3", use_cache=True
            )

            # 添加 data URL 前缀
            if not processed_image_base64.startswith("data:image"):
                processed_image_base64 = f"data:image/jpeg;base64,{processed_image_base64}"

            elapsed = time.time() - start_time

            return {
                "originalImage": user_image_data,
                "processedImage": processed_image_base64,
                "stylePrompt": prompt_text,
                "processingTime": elapsed,
            }

        except Exception as e:
            logger.error(f"风格模拟失败: {e}")
            raise

    def extract_style_summary(self, part2_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        从 Part2 结果中提取风格参数摘要
        
        Args:
            part2_result: Part2 的结构化结果
        
        Returns:
            风格参数摘要字典
        """
        sections = part2_result.get("sections", {})
        lr = sections.get("lightroom", {}).get("structured", {})
        color = sections.get("color", {}).get("structured", {})

        # 提取关键参数
        style_summary = {}

        # 基础参数
        if "panels" in lr:
            for panel in lr["panels"]:
                for param in panel.get("params", []):
                    name = param.get("name", "")
                    value = param.get("value", "")
                    if name in ["exposure", "contrast", "highlights", "shadows", "temperature", "tint"]:
                        style_summary[name] = value

        # 色彩分级
        color_grading = lr.get("colorGrading", {})
        if color_grading:
            if "shadows" in color_grading:
                style_summary["shadow_hue"] = color_grading["shadows"].get("hue", 0)
            if "highlights" in color_grading:
                style_summary["highlight_hue"] = color_grading["highlights"].get("hue", 0)

        return style_summary

