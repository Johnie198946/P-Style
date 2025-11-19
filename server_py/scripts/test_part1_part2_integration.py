"""
Part1/Part2 完整功能测试脚本
测试 Gemini 3.0 迁移后的完整分析流程
"""
import sys
import os
import base64
import json
import time
from pathlib import Path
from typing import Optional
from loguru import logger

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import get_settings
from app.services.gemini_service import GeminiService
from app.services.prompt_template import PromptTemplateService
from app.services.analysis_formatter import AnalysisFormatter


class Part1Part2Tester:
    """Part1/Part2 完整功能测试器"""
    
    def __init__(self):
        settings = get_settings()
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY 未配置，请在 .env 文件中设置")
        
        self.gemini_service = GeminiService(
            api_key=settings.GEMINI_API_KEY,
            model=settings.GEMINI_MODEL,
            flash_model=settings.GEMINI_FLASH_MODEL,
        )
        self.prompt_template = PromptTemplateService()
        self.formatter = AnalysisFormatter()
        
        logger.info(f"初始化测试器: 模型={settings.GEMINI_MODEL}, Flash模型={settings.GEMINI_FLASH_MODEL}")
    
    def load_test_image(self, image_path: str) -> str:
        """加载测试图片并转换为 base64"""
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"测试图片不存在: {image_path}")
        
        with open(image_path, 'rb') as f:
            image_data = f.read()
        base64_data = base64.b64encode(image_data).decode('utf-8')
        return f"data:image/jpeg;base64,{base64_data}"
    
    def test_part1(self, source_image_path: str, target_image_path: Optional[str] = None, thinking_level: Optional[str] = None):
        """测试 Part1 分析"""
        logger.info("=" * 60)
        logger.info("开始 Part1 分析测试")
        logger.info("=" * 60)
        
        try:
            # 加载图片
            source_image = self.load_test_image(source_image_path)
            target_image = self.load_test_image(target_image_path) if target_image_path else None
            
            logger.info(f"源图: {source_image_path}")
            if target_image_path:
                logger.info(f"目标图: {target_image_path}")
            logger.info(f"思考水平: {thinking_level or 'default'}")
            
            # 获取 Prompt
            prompt = self.prompt_template.get_part1_prompt(
                reference_image=source_image,
                user_image=target_image,
                exif=None,
                options={},
            )
            
            # 构建请求内容
            contents = [{"role": "user", "parts": [{"text": prompt}]}]
            if source_image:
                contents[0]["parts"].append({
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": source_image.split(",")[-1] if "," in source_image else source_image,
                    }
                })
            if target_image:
                contents[0]["parts"].append({
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": target_image.split(",")[-1] if "," in target_image else target_image,
                    }
                })
            
            # 调用 Gemini API
            start_time = time.time()
            logger.info("调用 Gemini API...")
            
            gemini_response = self.gemini_service.generate_text(
                contents=contents,
                response_mime="application/json",
                stage="part1_test",
                use_cache=False,
                thinking_level=thinking_level,
            )
            
            elapsed = time.time() - start_time
            logger.info(f"✅ Gemini API 调用成功，耗时: {elapsed:.2f}s")
            logger.info(f"响应长度: {len(gemini_response)} 字符")
            
            # 解析 JSON
            try:
                gemini_json = json.loads(gemini_response)
                logger.info("✅ JSON 解析成功")
            except json.JSONDecodeError as e:
                logger.warning(f"JSON 解析失败，尝试正则提取: {e}")
                import re
                json_match = re.search(r'\{.*\}', gemini_response, re.DOTALL)
                if json_match:
                    gemini_json = json.loads(json_match.group())
                    logger.info("✅ 正则提取 JSON 成功")
                else:
                    raise ValueError("无法解析 Gemini 返回的 JSON")
            
            # 格式化结果
            logger.info("格式化分析结果...")
            structured_result = self.formatter.format_part1(gemini_json, feasibility_result=None)
            
            # 验证结果结构
            logger.info("验证结果结构...")
            self._validate_part1_result(structured_result)
            
            logger.info("=" * 60)
            logger.info("✅ Part1 分析测试通过")
            logger.info("=" * 60)
            
            return {
                "success": True,
                "elapsed": elapsed,
                "response_size": len(gemini_response),
                "structured_result": structured_result,
            }
            
        except Exception as e:
            logger.error(f"❌ Part1 分析测试失败: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }
    
    def test_part2(self, source_image_path: str, target_image_path: str, part1_context: dict, thinking_level: Optional[str] = None):
        """测试 Part2 分析"""
        logger.info("=" * 60)
        logger.info("开始 Part2 分析测试")
        logger.info("=" * 60)
        
        try:
            # 加载图片
            source_image = self.load_test_image(source_image_path)
            target_image = self.load_test_image(target_image_path)
            
            logger.info(f"源图: {source_image_path}")
            logger.info(f"目标图: {target_image_path}")
            logger.info(f"思考水平: {thinking_level or 'default'}")
            
            # 获取 Prompt
            prompt = self.prompt_template.get_part2_prompt(
                reference_image=source_image,
                user_image=target_image,
                part1_context=part1_context,
                feasibility_result=None,
                options={},
            )
            
            # 构建请求内容
            contents = [{"role": "user", "parts": [{"text": prompt}]}]
            if source_image:
                contents[0]["parts"].append({
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": source_image.split(",")[-1] if "," in source_image else source_image,
                    }
                })
            if target_image:
                contents[0]["parts"].append({
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": target_image.split(",")[-1] if "," in target_image else target_image,
                    }
                })
            
            # 调用 Gemini API
            start_time = time.time()
            logger.info("调用 Gemini API...")
            
            gemini_response = self.gemini_service.generate_text(
                contents=contents,
                response_mime="application/json",
                stage="part2_test",
                use_cache=False,
                thinking_level=thinking_level,
            )
            
            elapsed = time.time() - start_time
            logger.info(f"✅ Gemini API 调用成功，耗时: {elapsed:.2f}s")
            logger.info(f"响应长度: {len(gemini_response)} 字符")
            
            # 解析 JSON
            try:
                gemini_json = json.loads(gemini_response)
                logger.info("✅ JSON 解析成功")
            except json.JSONDecodeError as e:
                logger.warning(f"JSON 解析失败，尝试正则提取: {e}")
                import re
                json_match = re.search(r'\{.*\}', gemini_response, re.DOTALL)
                if json_match:
                    gemini_json = json.loads(json_match.group())
                    logger.info("✅ 正则提取 JSON 成功")
                else:
                    raise ValueError("无法解析 Gemini 返回的 JSON")
            
            # 格式化结果
            logger.info("格式化分析结果...")
            structured_result = self.formatter.format_part2(gemini_json, part1_result=None)
            
            # 验证结果结构
            logger.info("验证结果结构...")
            self._validate_part2_result(structured_result)
            
            logger.info("=" * 60)
            logger.info("✅ Part2 分析测试通过")
            logger.info("=" * 60)
            
            return {
                "success": True,
                "elapsed": elapsed,
                "response_size": len(gemini_response),
                "structured_result": structured_result,
            }
            
        except Exception as e:
            logger.error(f"❌ Part2 分析测试失败: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }
    
    def _validate_part1_result(self, result: dict):
        """验证 Part1 结果结构"""
        required_keys = ["protocolVersion", "stage", "meta", "sections"]
        for key in required_keys:
            if key not in result:
                raise ValueError(f"Part1 结果缺少必需字段: {key}")
        
        sections = result.get("sections", {})
        required_sections = ["photoReview", "composition", "lighting", "color"]
        for section in required_sections:
            if section not in sections:
                logger.warning(f"Part1 结果缺少 section: {section}")
        
        logger.info("✅ Part1 结果结构验证通过")
    
    def _validate_part2_result(self, result: dict):
        """验证 Part2 结果结构"""
        required_keys = ["protocolVersion", "stage", "meta", "sections"]
        for key in required_keys:
            if key not in result:
                raise ValueError(f"Part2 结果缺少必需字段: {key}")
        
        sections = result.get("sections", {})
        required_sections = ["lightroom", "photoshop", "color"]
        for section in required_sections:
            if section not in sections:
                logger.warning(f"Part2 结果缺少 section: {section}")
        
        logger.info("✅ Part2 结果结构验证通过")
    
    def run_full_test(self, source_image_path: str, target_image_path: Optional[str] = None, thinking_level: Optional[str] = None):
        """运行完整测试（Part1 + Part2）"""
        logger.info("=" * 60)
        logger.info("开始完整功能测试（Part1 + Part2）")
        logger.info("=" * 60)
        
        results = {}
        
        # Part1 测试
        part1_result = self.test_part1(source_image_path, target_image_path, thinking_level)
        results["part1"] = part1_result
        
        if not part1_result.get("success"):
            logger.error("Part1 测试失败，跳过 Part2 测试")
            return results
        
        # 等待一段时间
        logger.info("等待 3 秒后继续 Part2 测试...")
        time.sleep(3)
        
        # Part2 测试（需要目标图）
        if target_image_path:
            part1_context = {
                "professional_evaluation_summary": "测试摘要",
                "workflow_draft": {},
            }
            part2_result = self.test_part2(source_image_path, target_image_path, part1_context, thinking_level)
            results["part2"] = part2_result
        else:
            logger.warning("未提供目标图，跳过 Part2 测试")
        
        # 生成总结
        logger.info("=" * 60)
        logger.info("测试总结")
        logger.info("=" * 60)
        logger.info(f"Part1: {'✅ 通过' if results.get('part1', {}).get('success') else '❌ 失败'}")
        if "part2" in results:
            logger.info(f"Part2: {'✅ 通过' if results.get('part2', {}).get('success') else '❌ 失败'}")
        
        return results


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Part1/Part2 完整功能测试")
    parser.add_argument("--source", type=str, required=True, help="源图路径（必填）")
    parser.add_argument("--target", type=str, help="目标图路径（可选，用于 Part2 测试）")
    parser.add_argument("--thinking-level", type=str, choices=["high", "low"], help="思考水平（可选）")
    parser.add_argument("--part", type=str, choices=["part1", "part2", "full"], default="full", help="测试部分（默认：full）")
    
    args = parser.parse_args()
    
    try:
        tester = Part1Part2Tester()
        
        if args.part == "part1":
            tester.test_part1(args.source, args.target, args.thinking_level)
        elif args.part == "part2":
            if not args.target:
                logger.error("Part2 测试需要提供 --target 参数")
                return
            part1_context = {"professional_evaluation_summary": "测试摘要", "workflow_draft": {}}
            tester.test_part2(args.source, args.target, part1_context, args.thinking_level)
        else:
            tester.run_full_test(args.source, args.target, args.thinking_level)
            
    except Exception as e:
        logger.error(f"测试失败: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()

