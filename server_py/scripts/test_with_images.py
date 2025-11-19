"""
使用实际图片进行 Part1/Part2 完整测试
支持从 URL 或本地文件加载图片
"""
import sys
import os
import base64
import json
import time
import requests
from pathlib import Path
from typing import Optional
from loguru import logger
from io import BytesIO

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import get_settings
from app.services.gemini_service import GeminiService
from app.services.prompt_template import PromptTemplateService
from app.services.analysis_formatter import AnalysisFormatter
from app.services.feasibility_service import FeasibilityService


class ImageTestRunner:
    """图片测试运行器"""
    
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
        self.feasibility_service = FeasibilityService()
        
        logger.info(f"初始化测试器: 模型={settings.GEMINI_MODEL}")
    
    def load_image_from_url(self, url: str) -> str:
        """从 URL 加载图片并转换为 base64"""
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            image_data = response.content
            base64_data = base64.b64encode(image_data).decode('utf-8')
            # 尝试检测图片类型
            from PIL import Image
            img = Image.open(BytesIO(image_data))
            mime_type = f"image/{img.format.lower()}" if img.format else "image/jpeg"
            return f"data:{mime_type};base64,{base64_data}"
        except Exception as e:
            logger.error(f"从 URL 加载图片失败: {e}")
            raise
    
    def load_image_from_file(self, file_path: str) -> str:
        """从本地文件加载图片并转换为 base64"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"图片文件不存在: {file_path}")
        
        with open(file_path, 'rb') as f:
            image_data = f.read()
        base64_data = base64.b64encode(image_data).decode('utf-8')
        
        # 检测文件类型
        ext = os.path.splitext(file_path)[1].lower()
        mime_type_map = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
        }
        mime_type = mime_type_map.get(ext, 'image/jpeg')
        
        return f"data:{mime_type};base64,{base64_data}"
    
    def load_image(self, source: str) -> str:
        """加载图片（自动判断是 URL 还是文件路径）"""
        if source.startswith('http://') or source.startswith('https://'):
            logger.info(f"从 URL 加载图片: {source}")
            return self.load_image_from_url(source)
        else:
            logger.info(f"从本地文件加载图片: {source}")
            return self.load_image_from_file(source)
    
    def test_part1_full(self, source_image: str, target_image: Optional[str] = None, thinking_level: Optional[str] = None):
        """完整 Part1 测试（包括可行性评估）"""
        logger.info("=" * 80)
        logger.info("Part1 完整功能测试")
        logger.info("=" * 80)
        
        results = {
            "part1": None,
            "feasibility": None,
            "timing": {},
        }
        
        try:
            # 加载图片
            logger.info("加载图片...")
            source_image_data = self.load_image(source_image)
            target_image_data = self.load_image(target_image) if target_image else None
            
            logger.info(f"源图: {source_image}")
            if target_image:
                logger.info(f"目标图: {target_image}")
            logger.info(f"思考水平: {thinking_level or 'default'}")
            
            # 1. 可行性评估（如果有目标图）
            if target_image_data:
                logger.info("\n" + "-" * 80)
                logger.info("步骤 1: 可行性评估")
                logger.info("-" * 80)
                feasibility_start = time.time()
                feasibility_result = self.feasibility_service.evaluate(source_image_data, target_image_data)
                feasibility_elapsed = time.time() - feasibility_start
                
                logger.info(f"✅ 可行性评估完成，耗时: {feasibility_elapsed:.2f}s")
                logger.info(f"可行性得分: {feasibility_result.get('feasibilityScore', 0):.2f}")
                logger.info(f"难度: {feasibility_result.get('difficulty', '未知')}")
                
                results["feasibility"] = {
                    "success": True,
                    "result": feasibility_result,
                    "elapsed": feasibility_elapsed,
                }
            else:
                logger.info("未提供目标图，跳过可行性评估")
            
            # 2. Part1 分析
            logger.info("\n" + "-" * 80)
            logger.info("步骤 2: Part1 分析")
            logger.info("-" * 80)
            
            # 获取 Prompt
            prompt = self.prompt_template.get_part1_prompt(
                reference_image=source_image_data,
                user_image=target_image_data,
                exif=None,
                options={},
            )
            
            # 构建请求内容
            contents = [{"role": "user", "parts": [{"text": prompt}]}]
            if source_image_data:
                # 提取 base64 数据（去掉 data URL 前缀）
                image_base64 = source_image_data.split(",")[-1] if "," in source_image_data else source_image_data
                contents[0]["parts"].append({
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": image_base64,
                    }
                })
            if target_image_data:
                image_base64 = target_image_data.split(",")[-1] if "," in target_image_data else target_image_data
                contents[0]["parts"].append({
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": image_base64,
                    }
                })
            
            # 调用 Gemini API
            part1_start = time.time()
            logger.info("调用 Gemini API (gemini-3-pro-preview)...")
            
            gemini_response = self.gemini_service.generate_text(
                contents=contents,
                response_mime="application/json",
                stage="part1_test",
                use_cache=False,
                thinking_level=thinking_level,
            )
            
            part1_elapsed = time.time() - part1_start
            logger.info(f"✅ Gemini API 调用成功，耗时: {part1_elapsed:.2f}s")
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
            feasibility_result_for_format = results.get("feasibility", {}).get("result") if results.get("feasibility") else None
            structured_result = self.formatter.format_part1(gemini_json, feasibility_result_for_format)
            
            # 验证结果结构
            logger.info("验证结果结构...")
            self._validate_part1_result(structured_result)
            
            results["part1"] = {
                "success": True,
                "elapsed": part1_elapsed,
                "response_size": len(gemini_response),
                "structured_result": structured_result,
            }
            
            results["timing"] = {
                "feasibility": feasibility_elapsed if results.get("feasibility") else 0,
                "part1": part1_elapsed,
                "total": (feasibility_elapsed if results.get("feasibility") else 0) + part1_elapsed,
            }
            
            logger.info("\n" + "=" * 80)
            logger.info("✅ Part1 测试完成")
            logger.info("=" * 80)
            logger.info(f"可行性评估耗时: {results['timing']['feasibility']:.2f}s")
            logger.info(f"Part1 分析耗时: {results['timing']['part1']:.2f}s")
            logger.info(f"总耗时: {results['timing']['total']:.2f}s")
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Part1 测试失败: {e}", exc_info=True)
            results["part1"] = {
                "success": False,
                "error": str(e),
            }
            return results
    
    def test_part2_full(self, source_image: str, target_image: str, part1_context: dict, thinking_level: Optional[str] = None):
        """完整 Part2 测试"""
        logger.info("=" * 80)
        logger.info("Part2 完整功能测试")
        logger.info("=" * 80)
        
        results = {
            "part2": None,
            "timing": {},
        }
        
        try:
            # 加载图片
            logger.info("加载图片...")
            source_image_data = self.load_image(source_image)
            target_image_data = self.load_image(target_image)
            
            logger.info(f"源图: {source_image}")
            logger.info(f"目标图: {target_image}")
            logger.info(f"思考水平: {thinking_level or 'default'}")
            
            # 获取 Prompt
            prompt = self.prompt_template.get_part2_prompt(
                reference_image=source_image_data,
                user_image=target_image_data,
                part1_context=part1_context,
                feasibility_result=None,
                options={},
            )
            
            # 构建请求内容
            contents = [{"role": "user", "parts": [{"text": prompt}]}]
            if source_image_data:
                image_base64 = source_image_data.split(",")[-1] if "," in source_image_data else source_image_data
                contents[0]["parts"].append({
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": image_base64,
                    }
                })
            if target_image_data:
                image_base64 = target_image_data.split(",")[-1] if "," in target_image_data else target_image_data
                contents[0]["parts"].append({
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": image_base64,
                    }
                })
            
            # 调用 Gemini API
            part2_start = time.time()
            logger.info("调用 Gemini API (gemini-3-pro-preview)...")
            
            gemini_response = self.gemini_service.generate_text(
                contents=contents,
                response_mime="application/json",
                stage="part2_test",
                use_cache=False,
                thinking_level=thinking_level,
            )
            
            part2_elapsed = time.time() - part2_start
            logger.info(f"✅ Gemini API 调用成功，耗时: {part2_elapsed:.2f}s")
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
            
            results["part2"] = {
                "success": True,
                "elapsed": part2_elapsed,
                "response_size": len(gemini_response),
                "structured_result": structured_result,
            }
            
            results["timing"] = {
                "part2": part2_elapsed,
            }
            
            logger.info("\n" + "=" * 80)
            logger.info("✅ Part2 测试完成")
            logger.info("=" * 80)
            logger.info(f"Part2 分析耗时: {part2_elapsed:.2f}s")
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Part2 测试失败: {e}", exc_info=True)
            results["part2"] = {
                "success": False,
                "error": str(e),
            }
            return results
    
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
        
        # 检查构图七段
        composition = sections.get("composition", {})
        structured = composition.get("structured", {})
        advanced_sections = structured.get("advanced_sections", {})
        if isinstance(advanced_sections, dict):
            section_count = len(advanced_sections)
            logger.info(f"构图分析段落数: {section_count}/7")
            if section_count < 7:
                logger.warning(f"构图分析不完整，缺少 {7 - section_count} 段")
        
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
        
        # 检查 Lightroom 参数
        lightroom = sections.get("lightroom", {})
        structured = lightroom.get("structured", {})
        panels = structured.get("panels", [])
        logger.info(f"Lightroom 面板数: {len(panels)}")
        
        logger.info("✅ Part2 结果结构验证通过")
    
    def run_full_test(self, source_image: str, target_image: str, thinking_level: Optional[str] = None):
        """运行完整测试（Part1 + Part2）"""
        logger.info("=" * 80)
        logger.info("开始完整功能测试（Part1 + Part2）")
        logger.info("=" * 80)
        logger.info(f"参考图: {source_image}")
        logger.info(f"用户图: {target_image}")
        logger.info(f"思考水平: {thinking_level or 'default'}")
        logger.info("=" * 80)
        
        all_results = {}
        
        # Part1 测试
        part1_results = self.test_part1_full(source_image, target_image, thinking_level)
        all_results["part1"] = part1_results
        
        if not part1_results.get("part1", {}).get("success"):
            logger.error("Part1 测试失败，跳过 Part2 测试")
            return all_results
        
        # 等待一段时间
        logger.info("\n等待 5 秒后继续 Part2 测试...")
        time.sleep(5)
        
        # Part2 测试
        part1_context = {
            "professional_evaluation_summary": part1_results.get("part1", {}).get("structured_result", {}).get("sections", {}).get("photoReview", {}).get("structured", {}).get("overviewSummary", "测试摘要"),
            "workflow_draft": {},
        }
        part2_results = self.test_part2_full(source_image, target_image, part1_context, thinking_level)
        all_results["part2"] = part2_results
        
        # 生成总结
        logger.info("\n" + "=" * 80)
        logger.info("测试总结")
        logger.info("=" * 80)
        logger.info(f"Part1: {'✅ 通过' if part1_results.get('part1', {}).get('success') else '❌ 失败'}")
        if part1_results.get("part1", {}).get("success"):
            logger.info(f"  - 耗时: {part1_results.get('timing', {}).get('part1', 0):.2f}s")
        logger.info(f"Part2: {'✅ 通过' if part2_results.get('part2', {}).get('success') else '❌ 失败'}")
        if part2_results.get("part2", {}).get("success"):
            logger.info(f"  - 耗时: {part2_results.get('timing', {}).get('part2', 0):.2f}s")
        
        total_time = (part1_results.get('timing', {}).get('total', 0) + 
                     part2_results.get('timing', {}).get('part2', 0))
        logger.info(f"总耗时: {total_time:.2f}s")
        
        # 保存测试报告
        report_dir = Path(__file__).parent.parent / "test_reports"
        report_dir.mkdir(parents=True, exist_ok=True)
        report_path = report_dir / "part1_part2_test_report.json"
        
        report_data = {
            "test_time": time.strftime("%Y-%m-%d %H:%M:%S"),
            "source_image": source_image,
            "target_image": target_image,
            "thinking_level": thinking_level,
            "model": self.gemini_service.model,
            "results": all_results,
        }
        
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, indent=2, ensure_ascii=False, default=str)
        
        logger.info(f"\n详细测试报告已保存到: {report_path}")
        
        return all_results


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="使用实际图片进行 Part1/Part2 完整测试")
    parser.add_argument("--source", type=str, required=True, help="参考图路径或 URL（必填）")
    parser.add_argument("--target", type=str, required=True, help="用户图路径或 URL（必填）")
    parser.add_argument("--thinking-level", type=str, choices=["high", "low"], help="思考水平（可选）")
    parser.add_argument("--part", type=str, choices=["part1", "part2", "full"], default="full", help="测试部分（默认：full）")
    
    args = parser.parse_args()
    
    try:
        runner = ImageTestRunner()
        
        if args.part == "part1":
            runner.test_part1_full(args.source, args.target, args.thinking_level)
        elif args.part == "part2":
            part1_context = {"professional_evaluation_summary": "测试摘要", "workflow_draft": {}}
            runner.test_part2_full(args.source, args.target, part1_context, args.thinking_level)
        else:
            runner.run_full_test(args.source, args.target, args.thinking_level)
            
    except Exception as e:
        logger.error(f"测试失败: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()

