# test_prompts.py
import json
import os
import sys

# 确保能导入当前目录下的模块
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from prompt_template import PromptTemplateService

def print_separator(title):
    print(f"\n{'='*20} {title} {'='*20}")

def test_part1():
    print_separator("测试 Part 1 Prompt")
    try:
        # 模拟一些数据
        dummy_exif = {"Make": "Sony", "Model": "A7M4", "ISO": 100}
        
        # 调用生成方法
        prompt = PromptTemplateService.get_part1_prompt(
            reference_image="dummy_ref_base64",
            user_image="dummy_user_base64",
            exif=dummy_exif
        )
        
        # 验证 1: 检查是否包含关键的 JSON 结构
        if '"module_1_critique"' in prompt and '"visual_mass"' in prompt:
            print("✅ [通过] JSON 模板内嵌成功")
        else:
            print("❌ [失败] 未找到 JSON 模板内容")

        # 验证 2: 检查动态数据 (EXIF) 是否注入
        if '"Model": "A7M4"' in prompt:
            print("✅ [通过] 动态 EXIF 数据注入成功")
        else:
            print("❌ [失败] 动态 EXIF 数据丢失")

        # 验证 3: 检查转义符
        if "{{" in prompt:
            print("❌ [失败] 发现双大括号 '{{'，请检查 f-string")
        else:
            print("✅ [通过] 格式清洗干净 (无双大括号)")

    except Exception as e:
        print(f"❌ [致命错误] Part 1 运行崩溃: {e}")
        import traceback
        traceback.print_exc()

def test_part2():
    print_separator("测试 Part 2 Prompt")
    try:
        style_summary = "核心在于低饱和青橙色调，使用S型曲线。"
        prompt = PromptTemplateService.get_part2_prompt(
            reference_image="ref",
            user_image="user",
            part1_context={},
            style_summary=style_summary
        )
        
        if '"lightroom_workflow"' in prompt:
            print("✅ [通过] JSON 模板内嵌成功")
        else:
            print("❌ [失败] 未找到 JSON 模板内容")
            
        if "低饱和青橙色调" in prompt:
            print("✅ [通过] style_summary 注入成功")
        else:
            print("❌ [失败] style_summary 注入失败")

    except Exception as e:
        print(f"❌ [致命错误] Part 2 运行崩溃: {e}")

def test_part3():
    print_separator("测试 Part 3 Prompt")
    try:
        dummy_schema = {
            "photo_review": {"style_summary": "Test Summary"},
            "color": {"temp": 5000},
            "lightroom": {"exposure": 0.5},
            "photoshop": {"layers": []}
        }
        
        prompt = PromptTemplateService.get_part3_flash_prompt(
            reference_image="ref",
            user_image="user",
            color_grading_schema=dummy_schema
        )
        
        if "Technical Schema" in prompt and '"exposure": 0.5' in prompt:
            print("✅ [通过] Part 3 动态 Schema 注入成功")
        else:
            print("❌ [失败] Part 3 内容生成错误")

    except Exception as e:
        print(f"❌ [致命错误] Part 3 运行崩溃: {e}")

def test_diagnosis():
    print_separator("测试 AI 诊断 Prompt")
    try:
        dummy_hist = {"avgL": 100, "highlights": 0.8}
        dummy_colors = [{"h": 10, "s": 0.5}]
        
        prompt = PromptTemplateService.get_diagnosis_prompt(
            histogram_data=dummy_hist,
            dominant_colors=dummy_colors
        )
        
        if '"scores"' in prompt:
            print("✅ [通过] 诊断模板内嵌成功")
        else:
            print("❌ [失败] 诊断模板内容缺失")

    except Exception as e:
        print(f"❌ [致命错误] 诊断模块运行崩溃: {e}")

if __name__ == "__main__":
    print("🚀 开始测试 Single-File Prompt Service...")
    test_part1()
    test_part2()
    test_part3()
    test_diagnosis()
    print("\n✨ 所有测试结束 ✨")
