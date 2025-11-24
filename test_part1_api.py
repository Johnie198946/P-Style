#!/usr/bin/env python3
"""
测试 Part1 API 接口
直接调用后端接口，验证是否能成功返回响应
"""
import requests
import json
import os
import sys
from pathlib import Path

# 配置
API_BASE_URL = "http://localhost:8081"
API_ENDPOINT = "/api/analyze/part1"
LOGIN_ENDPOINT = "/api/auth/login"

# 从环境变量获取 Token（如果已登录）
ACCESS_TOKEN = os.environ.get("ACCESS_TOKEN", "")

# 测试用户凭据（如果未提供 Token，使用这些凭据登录）
TEST_EMAIL = os.environ.get("TEST_EMAIL", "test@example.com")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "test123456")

def create_test_image_data_url():
    """
    创建一个最小的测试图片（1x1 像素的 PNG，base64 编码）
    用于测试 API 是否能正常处理请求
    """
    # 1x1 像素的透明 PNG 图片（base64）
    # 这是一个最小的有效 PNG 图片
    base64_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    return f"data:image/png;base64,{base64_image}"

def register_test_user():
    """注册测试用户"""
    print(f"\n   尝试注册测试用户...")
    register_endpoint = "/api/auth/register"
    
    try:
        response = requests.post(
            f"{API_BASE_URL}{register_endpoint}",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "display_name": "测试用户",
            },
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("code") == 0:
                print(f"   ✅ 注册成功")
                return True
            else:
                # 用户可能已存在
                if "已存在" in data.get("message", "") or "exists" in data.get("message", "").lower():
                    print(f"   ℹ️  用户已存在，跳过注册")
                    return True
                else:
                    print(f"   ❌ 注册失败: {data.get('message', '未知错误')}")
                    return False
        else:
            print(f"   ❌ 注册请求失败: HTTP {response.status_code}")
            try:
                error_data = response.json()
                if "已存在" in error_data.get("message", "") or "exists" in error_data.get("message", "").lower():
                    print(f"   ℹ️  用户已存在，跳过注册")
                    return True
                print(f"   - 错误信息: {error_data.get('message', '未知错误')}")
            except:
                print(f"   - 响应内容: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"   ❌ 注册异常: {type(e).__name__}: {e}")
        return False

def login_and_get_token():
    """登录并获取 Token"""
    print(f"\n1. 尝试登录获取 Token...")
    print(f"   - 登录地址: {API_BASE_URL}{LOGIN_ENDPOINT}")
    print(f"   - 测试邮箱: {TEST_EMAIL}")
    
    # 先尝试注册（如果用户不存在）
    if not register_test_user():
        print(f"   ⚠️  注册失败，继续尝试登录...")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}{LOGIN_ENDPOINT}",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
            },
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("code") == 0:
                token = data.get("data", {}).get("accessToken")
                if token:
                    print(f"   ✅ 登录成功，获取到 Token")
                    return token
                else:
                    print(f"   ❌ 登录响应中未找到 accessToken")
                    return None
            else:
                print(f"   ❌ 登录失败: {data.get('message', '未知错误')}")
                return None
        else:
            print(f"   ❌ 登录请求失败: HTTP {response.status_code}")
            try:
                error_data = response.json()
                print(f"   - 错误信息: {error_data.get('message', '未知错误')}")
            except:
                print(f"   - 响应内容: {response.text[:200]}")
            return None
    except Exception as e:
        print(f"   ❌ 登录异常: {type(e).__name__}: {e}")
        return None

def test_part1_api():
    """测试 Part1 API 接口"""
    print("=" * 80)
    print("开始测试 Part1 API 接口")
    print("=" * 80)
    
    # 获取 Token
    token = ACCESS_TOKEN
    if not token:
        print(f"\n⚠️  未提供 Token，尝试自动登录...")
        token = login_and_get_token()
        if not token:
            print(f"\n❌ 无法获取 Token，测试终止")
            print(f"   提示：可以手动设置环境变量：")
            print(f"   export ACCESS_TOKEN='your_token_here'")
            return False
    
    # 创建测试图片数据
    source_image = create_test_image_data_url()
    target_image = create_test_image_data_url()
    
    print(f"\n2. 准备请求数据...")
    print(f"   - API 地址: {API_BASE_URL}{API_ENDPOINT}")
    print(f"   - Source Image 大小: {len(source_image)} 字符")
    print(f"   - Target Image 大小: {len(target_image)} 字符")
    print(f"   - Access Token: {'已提供' if token else '未提供'}")
    
    # 准备请求数据
    form_data = {
        "sourceImage": source_image,
        "targetImage": target_image,
    }
    
    # 准备请求头
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
        print(f"\n3. 使用 Token 进行认证...")
    else:
        print(f"\n3. ⚠️  未提供 Token，请求可能会失败（401 未授权）")
    
    print(f"\n4. 发送请求到后端...")
    print(f"   ⚠️  注意：Part1 分析可能需要 60-90 秒，请耐心等待...")
    try:
        response = requests.post(
            f"{API_BASE_URL}{API_ENDPOINT}",
            data=form_data,
            headers=headers,
            timeout=180  # 3 分钟超时（Part1 分析可能需要较长时间）
        )
        
        print(f"\n5. 收到响应:")
        print(f"   - 状态码: {response.status_code}")
        print(f"   - 响应头 Content-Type: {response.headers.get('Content-Type', '未知')}")
        print(f"   - 响应体大小: {len(response.content)} 字节")
        
        # 尝试解析响应
        if response.status_code == 200:
            try:
                # 先读取响应文本（用于调试）
                response_text = response.text
                print(f"   - 响应文本大小: {len(response_text)} 字符")
                print(f"   - 响应前 200 字符: {response_text[:200]}")
                
                response_data = json.loads(response_text)
                print(f"\n6. ✅ 响应解析成功:")
                print(f"   - Code: {response_data.get('code', 'N/A')}")
                print(f"   - Message: {response_data.get('message', 'N/A')}")
                
                if response_data.get('code') == 0:
                    data = response_data.get('data', {})
                    print(f"\n7. ✅ 业务逻辑成功:")
                    print(f"   - TaskId: {data.get('taskId', 'N/A')}")
                    print(f"   - Stage: {data.get('stage', 'N/A')}")
                    print(f"   - Status: {data.get('status', 'N/A')}")
                    
                    structured_analysis = data.get('structuredAnalysis', {})
                    if structured_analysis:
                        print(f"   - StructuredAnalysis keys: {list(structured_analysis.keys())}")
                        sections = structured_analysis.get('sections', {})
                        if sections:
                            print(f"   - Sections keys: {list(sections.keys())}")
                            # 显示每个 section 的 keys
                            for section_name, section_data in sections.items():
                                if isinstance(section_data, dict):
                                    print(f"     - {section_name} keys: {list(section_data.keys())}")
                    
                    print(f"\n   📊 响应数据结构（前 2000 字符）:")
                    data_json = json.dumps(data, indent=2, ensure_ascii=False)
                    if len(data_json) > 2000:
                        print(data_json[:2000] + "\n   ... (响应数据较大，已截断)")
                    else:
                        print(data_json)
                    
                    return True
                else:
                    print(f"\n7. ❌ 业务逻辑失败:")
                    print(f"   - 错误码: {response_data.get('code')}")
                    print(f"   - 错误消息: {response_data.get('message')}")
                    print(f"   - 错误数据: {response_data.get('data')}")
                    return False
                    
            except json.JSONDecodeError as e:
                print(f"\n6. ❌ JSON 解析失败:")
                print(f"   - 错误: {e}")
                print(f"   - 响应内容（前 500 字符）: {response.text[:500]}")
                return False
        else:
            print(f"\n6. ❌ HTTP 请求失败:")
            print(f"   - 状态码: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   - 错误信息: {json.dumps(error_data, indent=2, ensure_ascii=False)}")
            except:
                print(f"   - 响应内容: {response.text[:500]}")
            return False
            
    except requests.exceptions.Timeout:
        print(f"\n5. ❌ 请求超时（超过 180 秒）")
        print(f"   提示：Part1 分析可能需要较长时间，请检查后端日志")
        return False
    except requests.exceptions.ConnectionError:
        print(f"\n5. ❌ 连接失败")
        print(f"   提示：请确保后端服务正在运行在 {API_BASE_URL}")
        return False
    except Exception as e:
        print(f"\n5. ❌ 请求异常: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("Part1 API 直接测试脚本")
    print("=" * 80)
    print("\n说明：")
    print("1. 此脚本会直接调用后端 Part1 API 接口")
    print("2. 使用最小的测试图片（1x1 像素 PNG）")
    print("3. 如果未提供 Token，请求可能会失败（401 未授权）")
    print("4. 如果需要 Token，请先登录获取，然后设置环境变量：")
    print("   export ACCESS_TOKEN='your_token_here'")
    print("\n" + "=" * 80 + "\n")
    
    success = test_part1_api()
    
    print("\n" + "=" * 80)
    if success:
        print("✅ 测试通过：后端 Part1 API 接口正常工作")
    else:
        print("❌ 测试失败：请检查后端日志和配置")
    print("=" * 80 + "\n")
    
    sys.exit(0 if success else 1)

