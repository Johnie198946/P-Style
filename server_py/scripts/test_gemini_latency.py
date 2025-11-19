"""
Gemini API 时延测试脚本
测试直接调用 Gemini API 的时延（TTFB 和总时间）
根据 Gemini时延测试方案.md 实现
"""
import os
import sys
import time
import json
import base64
from pathlib import Path
from typing import Dict, Any, List, Optional
from loguru import logger

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import get_settings
from app.services.gemini_service import GeminiService


class LatencyTester:
    """时延测试器"""
    
    def __init__(self):
        settings = get_settings()
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY 未配置，请在 .env 文件中设置")
        
        self.gemini_service = GeminiService(
            api_key=settings.GEMINI_API_KEY,
            model=settings.GEMINI_MODEL,
            flash_model=settings.GEMINI_FLASH_MODEL,
        )
        self.results: List[Dict[str, Any]] = []
    
    def load_test_image(self, image_path: str) -> str:
        """加载测试图片并转换为 base64"""
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"测试图片不存在: {image_path}")
        
        with open(image_path, 'rb') as f:
            image_data = f.read()
        base64_data = base64.b64encode(image_data).decode('utf-8')
        return f"data:image/jpeg;base64,{base64_data}"
    
    def test_api_call(
        self,
        scenario_name: str,
        contents: List[Dict[str, Any]],
        model: str,
        thinking_level: Optional[str] = None,
        response_mime: Optional[str] = "application/json",
        num_runs: int = 3,
    ) -> Dict[str, Any]:
        """
        测试 API 调用的时延
        
        Args:
            scenario_name: 测试场景名称
            contents: 请求内容
            model: 模型名称
            thinking_level: 思考水平（"high" 或 "low"）
            response_mime: 响应 MIME 类型
            num_runs: 运行次数（取平均值）
        
        Returns:
            测试结果字典
        """
        logger.info(f"开始测试场景: {scenario_name}")
        logger.info(f"模型: {model}, 思考水平: {thinking_level}, 运行次数: {num_runs}")
        
        ttfb_times = []  # Time To First Byte
        total_times = []  # Total Time
        response_sizes = []  # 响应大小
        
        for run in range(num_runs):
            logger.info(f"第 {run + 1}/{num_runs} 次运行...")
            
            try:
                # 记录开始时间
                start_time = time.time()
                
                # 调用 Gemini API
                response_text = self.gemini_service.generate_text(
                    contents=contents,
                    response_mime=response_mime,
                    stage=scenario_name,
                    use_cache=False,  # 测试时不使用缓存，确保每次都是真实调用
                    thinking_level=thinking_level,
                )
                
                # 计算时延
                total_time = time.time() - start_time
                # 注意：非流式调用无法准确测量 TTFB，使用总时间作为近似值
                ttfb_time = total_time
                response_size = len(response_text)
                
                ttfb_times.append(ttfb_time)
                total_times.append(total_time)
                response_sizes.append(response_size)
                
                logger.info(f"  TTFB: {ttfb_time:.2f}s, 总时间: {total_time:.2f}s, 响应大小: {response_size} 字符")
                
                # 等待一段时间再运行下一次（避免速率限制）
                if run < num_runs - 1:
                    time.sleep(2)
            
            except Exception as e:
                logger.error(f"第 {run + 1} 次运行失败: {e}", exc_info=True)
                continue
        
        # 计算统计信息
        result = {
            "scenario": scenario_name,
            "model": model,
            "thinking_level": thinking_level,
            "num_runs": num_runs,
            "ttfb": {
                "min": min(ttfb_times) if ttfb_times else 0,
                "max": max(ttfb_times) if ttfb_times else 0,
                "avg": sum(ttfb_times) / len(ttfb_times) if ttfb_times else 0,
                "values": ttfb_times,
            },
            "total_time": {
                "min": min(total_times) if total_times else 0,
                "max": max(total_times) if total_times else 0,
                "avg": sum(total_times) / len(total_times) if total_times else 0,
                "values": total_times,
            },
            "response_size": {
                "min": min(response_sizes) if response_sizes else 0,
                "max": max(response_sizes) if response_sizes else 0,
                "avg": sum(response_sizes) / len(response_sizes) if response_sizes else 0,
                "values": response_sizes,
            },
        }
        
        self.results.append(result)
        return result
    
    def test_part1_scenario(self, image_path: str, thinking_level: Optional[str] = None):
        """测试 Part1 场景"""
        # 加载图片
        image_data = self.load_test_image(image_path)
        
        # 构建 Prompt（简化版，用于测试）
        prompt = """你是一名资深摄影师。请分析这张图片，输出 JSON 格式的分析结果，包括：
1. 专业评价（visual_guidance, focus_exposure, color_depth）
2. 构图分析（composition）
3. 可行性说明（conversion_feasibility）

请输出 JSON 格式。"""
        
        # 构建请求内容
        contents = [
            {
                "role": "user",
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": image_data.split(",")[-1] if "," in image_data else image_data,
                        }
                    },
                ],
            }
        ]
        
        scenario_name = f"Part1 分析 (thinking_level={thinking_level or 'default'})"
        return self.test_api_call(
            scenario_name=scenario_name,
            contents=contents,
            model=self.gemini_service.model,
            thinking_level=thinking_level,
            response_mime="application/json",
            num_runs=3,
        )
    
    def test_part2_scenario(self, image_path: str, thinking_level: Optional[str] = None):
        """测试 Part2 场景"""
        # 加载图片
        image_data = self.load_test_image(image_path)
        
        # 构建 Prompt（简化版，用于测试）
        prompt = """你是一名影像后期专家。请为这张图片生成 Lightroom 调色参数，输出 JSON 格式，包括：
1. 基础调整（exposure, contrast, highlights, shadows）
2. 色彩分级（color_grading）
3. HSL 调整

请输出 JSON 格式。"""
        
        # 构建请求内容
        contents = [
            {
                "role": "user",
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": image_data.split(",")[-1] if "," in image_data else image_data,
                        }
                    },
                ],
            }
        ]
        
        scenario_name = f"Part2 分析 (thinking_level={thinking_level or 'default'})"
        return self.test_api_call(
            scenario_name=scenario_name,
            contents=contents,
            model=self.gemini_service.model,
            thinking_level=thinking_level,
            response_mime="application/json",
            num_runs=3,
        )
    
    def test_simple_text_scenario(self, thinking_level: Optional[str] = None):
        """测试简单文本场景"""
        prompt = "请用一句话描述什么是摄影。"
        
        contents = [{"role": "user", "parts": [{"text": prompt}]}]
        
        scenario_name = f"简单文本任务 (thinking_level={thinking_level or 'default'})"
        return self.test_api_call(
            scenario_name=scenario_name,
            contents=contents,
            model=self.gemini_service.model,
            thinking_level=thinking_level,
            response_mime=None,  # 不使用 JSON 模式
            num_runs=3,
        )
    
    def run_all_tests(self, test_image_path: str):
        """运行所有测试场景"""
        logger.info("=" * 60)
        logger.info("开始 Gemini API 时延测试")
        logger.info("=" * 60)
        
        # Part1 测试
        logger.info("\n" + "=" * 60)
        logger.info("Part1 分析测试")
        logger.info("=" * 60)
        self.test_part1_scenario(test_image_path, thinking_level="high")
        self.test_part1_scenario(test_image_path, thinking_level="low")
        
        # Part2 测试
        logger.info("\n" + "=" * 60)
        logger.info("Part2 分析测试")
        logger.info("=" * 60)
        self.test_part2_scenario(test_image_path, thinking_level="high")
        self.test_part2_scenario(test_image_path, thinking_level="low")
        
        # 简单文本测试
        logger.info("\n" + "=" * 60)
        logger.info("简单文本任务测试")
        logger.info("=" * 60)
        self.test_simple_text_scenario(thinking_level="high")
        self.test_simple_text_scenario(thinking_level="low")
        
        # 生成报告
        self.generate_report()
    
    def generate_report(self):
        """生成测试报告"""
        logger.info("\n" + "=" * 60)
        logger.info("测试报告")
        logger.info("=" * 60)
        
        for result in self.results:
            logger.info(f"\n场景: {result['scenario']}")
            logger.info(f"模型: {result['model']}")
            logger.info(f"思考水平: {result['thinking_level']}")
            logger.info(f"运行次数: {result['num_runs']}")
            logger.info(f"TTFB - 最小: {result['ttfb']['min']:.2f}s, 最大: {result['ttfb']['max']:.2f}s, 平均: {result['ttfb']['avg']:.2f}s")
            logger.info(f"总时间 - 最小: {result['total_time']['min']:.2f}s, 最大: {result['total_time']['max']:.2f}s, 平均: {result['total_time']['avg']:.2f}s")
            logger.info(f"响应大小 - 最小: {result['response_size']['min']}, 最大: {result['response_size']['max']}, 平均: {result['response_size']['avg']:.0f}")
        
        # 保存 JSON 报告
        report_dir = Path(__file__).parent.parent / "test_reports"
        report_dir.mkdir(parents=True, exist_ok=True)
        report_path = report_dir / "gemini_latency_report.json"
        
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)
        
        logger.info(f"\n详细报告已保存到: {report_path}")


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Gemini API 时延测试")
    parser.add_argument("--image", type=str, help="测试图片路径（可选，如果提供则测试 Part1/Part2）")
    parser.add_argument("--scenario", type=str, choices=["all", "part1", "part2", "text"], default="all", help="测试场景")
    parser.add_argument("--thinking-level", type=str, choices=["high", "low"], help="思考水平（可选）")
    
    args = parser.parse_args()
    
    try:
        tester = LatencyTester()
        
        if args.scenario == "all":
            if not args.image:
                logger.error("运行所有测试需要提供 --image 参数")
                return
            tester.run_all_tests(args.image)
        elif args.scenario == "part1":
            if not args.image:
                logger.error("Part1 测试需要提供 --image 参数")
                return
            tester.test_part1_scenario(args.image, thinking_level=args.thinking_level)
            tester.generate_report()
        elif args.scenario == "part2":
            if not args.image:
                logger.error("Part2 测试需要提供 --image 参数")
                return
            tester.test_part2_scenario(args.image, thinking_level=args.thinking_level)
            tester.generate_report()
        elif args.scenario == "text":
            tester.test_simple_text_scenario(thinking_level=args.thinking_level)
            tester.generate_report()
    except Exception as e:
        logger.error(f"测试失败: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()

