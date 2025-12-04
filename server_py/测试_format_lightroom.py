#!/usr/bin/env python3
"""
测试 _format_lightroom 函数是否能正确处理 Gemini 输出
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path('.').absolute()))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import json
import os

# 从环境变量或配置文件读取数据库 URL
db_url = os.getenv('DATABASE_URL', 'sqlite:///./photostyle.db')
engine = create_engine(db_url)
Session = sessionmaker(bind=engine)
session = Session()

try:
    # 获取最近完成的任务的 gemini_result
    result = session.execute(text("""
        SELECT gemini_result 
        FROM analysis_tasks 
        WHERE status = 'completed' 
        ORDER BY created_at DESC 
        LIMIT 1
    """))
    row = result.fetchone()
    
    if row:
        gemini_result = row[0]
        if gemini_result:
            if isinstance(gemini_result, str):
                gemini = json.loads(gemini_result)
            else:
                gemini = gemini_result
            
            # 提取 lightroom_workflow
            lr_workflow = gemini.get('lightroom_workflow', {})
            if lr_workflow:
                print("=" * 80)
                print("📋 测试 _format_lightroom 函数")
                print("=" * 80)
                print()
                print(f"✅ lightroom_workflow 存在")
                print(f"✅ basic_panel keys: {list(lr_workflow.get('basic_panel', {}).keys())}")
                print()
                
                # 模拟调用 _format_lightroom
                from app.services.analysis_formatter import AnalysisFormatter
                formatter = AnalysisFormatter()
                
                # 构建 raw_data（_format_lightroom 期望的格式）
                raw_data = {
                    "lightroom_workflow": lr_workflow
                }
                
                try:
                    result = formatter._format_lightroom(raw_data)
                    print("✅ _format_lightroom 调用成功")
                    print(f"✅ 返回结果类型: {type(result)}")
                    print(f"✅ 返回结果 keys: {list(result.keys()) if isinstance(result, dict) else 'not dict'}")
                    
                    structured = result.get('structured', {})
                    print(f"✅ structured 存在: {bool(structured)}")
                    print(f"✅ structured keys: {list(structured.keys()) if isinstance(structured, dict) else 'not dict'}")
                    
                    basic = structured.get('basic', {})
                    print(f"✅ basic 存在: {bool(basic)}")
                    print(f"✅ basic keys: {list(basic.keys()) if isinstance(basic, dict) else 'not dict'}")
                    
                    if basic:
                        print()
                        print("📋 basic 参数值:")
                        for key in ['temp', 'tint', 'exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks']:
                            if key in basic:
                                param = basic[key]
                                value = param.get('value', 'N/A')
                                print(f"  {key:12} = {str(value):10}")
                            else:
                                print(f"  {key:12} = ❌ 缺失")
                except Exception as e:
                    print(f"❌ _format_lightroom 调用失败: {e}")
                    import traceback
                    traceback.print_exc()
            else:
                print("❌ gemini_result 中没有 lightroom_workflow")
    else:
        print("❌ 没有找到已完成的任务")

    session.close()
except Exception as e:
    print(f"❌ 错误: {e}")
    import traceback
    traceback.print_exc()

