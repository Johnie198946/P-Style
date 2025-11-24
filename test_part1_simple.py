#!/usr/bin/env python3
"""
简化版 Part1 API 测试脚本
使用已存在的用户凭据（从浏览器 localStorage 获取）
"""
import requests
import json
import sys

API_BASE_URL = "http://localhost:8081"
API_ENDPOINT = "/api/analyze/part1"

# 从命令行参数获取 Token
if len(sys.argv) < 2:
    print("用法: python3 test_part1_simple.py <access_token>")
    print("\n提示：从浏览器控制台获取 Token：")
    print("  localStorage.getItem('accessToken')")
    sys.exit(1)

ACCESS_TOKEN = sys.argv[1]

def create_test_image_data_url():
    """创建最小的测试图片"""
    base64_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    return f"data:image/png;base64,{base64_image}"

print("=" * 80)
print("Part1 API 直接测试（使用提供的 Token）")
print("=" * 80)

source_image = create_test_image_data_url()
target_image = create_test_image_data_url()

form_data = {
    "sourceImage": source_image,
    "targetImage": target_image,
}

headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}"
}

print(f"\n发送请求到: {API_BASE_URL}{API_ENDPOINT}")
print(f"⚠️  注意：Part1 分析可能需要 60-90 秒，请耐心等待...\n")

try:
    response = requests.post(
        f"{API_BASE_URL}{API_ENDPOINT}",
        data=form_data,
        headers=headers,
        timeout=180
    )
    
    print(f"状态码: {response.status_code}")
    print(f"响应大小: {len(response.content)} 字节\n")
    
    if response.status_code == 200:
        response_text = response.text
        print(f"响应文本大小: {len(response_text)} 字符")
        print(f"响应前 200 字符:\n{response_text[:200]}\n")
        
        try:
            data = json.loads(response_text)
            print(f"✅ JSON 解析成功")
            print(f"Code: {data.get('code')}")
            print(f"Message: {data.get('message')}\n")
            
            if data.get('code') == 0:
                result_data = data.get('data', {})
                print(f"✅ 业务逻辑成功")
                print(f"TaskId: {result_data.get('taskId')}")
                print(f"Stage: {result_data.get('stage')}")
                print(f"Status: {result_data.get('status')}\n")
                
                structured = result_data.get('structuredAnalysis', {})
                if structured:
                    print(f"StructuredAnalysis keys: {list(structured.keys())}")
                    sections = structured.get('sections', {})
                    if sections:
                        print(f"Sections keys: {list(sections.keys())}\n")
                
                print("=" * 80)
                print("✅ 测试通过：后端 Part1 API 接口正常工作")
                print("=" * 80)
                sys.exit(0)
            else:
                print(f"❌ 业务逻辑失败: {data.get('message')}")
                sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"❌ JSON 解析失败: {e}")
            print(f"响应内容（前 500 字符）:\n{response_text[:500]}")
            sys.exit(1)
    else:
        print(f"❌ HTTP 请求失败")
        try:
            error_data = response.json()
            print(json.dumps(error_data, indent=2, ensure_ascii=False))
        except:
            print(response.text[:500])
        sys.exit(1)
        
except requests.exceptions.Timeout:
    print("❌ 请求超时（超过 180 秒）")
    sys.exit(1)
except Exception as e:
    print(f"❌ 请求异常: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
