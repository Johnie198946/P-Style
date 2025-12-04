#!/usr/bin/env python3
"""
直接测试 _format_visual_anchors 方法是否能正确提取数据
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path('.').absolute()))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import json
import os

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
    
    if row and row[0]:
        gemini_result = row[0]
        if isinstance(gemini_result, str):
            gemini = json.loads(gemini_result)
        else:
            gemini = gemini_result
        
        # 测试 _format_visual_anchors 方法
        from app.services.analysis_formatter import AnalysisFormatter
        formatter = AnalysisFormatter()
        
        print("=" * 80)
        print("📋 测试 _format_visual_anchors 方法")
        print("=" * 80)
        print()
        
        try:
            result = formatter._format_visual_anchors(gemini)
            print("✅ _format_visual_anchors 调用成功")
            print(f"✅ 返回结果类型: {type(result)}")
            print(f"✅ 返回结果 keys: {list(result.keys()) if isinstance(result, dict) else 'not dict'}")
            print()
            
            if isinstance(result, dict) and result:
                print("📋 提取的数据:")
                print(f"  - hero_subject: {result.get('hero_subject', 'N/A')[:100]}")
                print(f"  - hero_colors: {result.get('hero_colors', [])}")
                print(f"  - material_conflict: {result.get('material_conflict', 'N/A')[:100]}")
                print(f"  - protection_strategy: {result.get('protection_strategy', 'N/A')[:100]}")
                print(f"  - hsl_constraints: {result.get('hsl_constraints', {})}")
            else:
                print("⚠️ 返回结果为空，可能原因：")
                print("   1. gemini_result 中没有 module_4_visual_anchors")
                print("   2. 这是旧的分析结果（在更新 Prompt 之前）")
        except Exception as e:
            print(f"❌ _format_visual_anchors 调用失败: {e}")
            import traceback
            traceback.print_exc()
    else:
        print("❌ 没有找到已完成的任务")

    session.close()
except Exception as e:
    print(f"❌ 错误: {e}")
    import traceback
    traceback.print_exc()

