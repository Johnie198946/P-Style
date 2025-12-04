#!/usr/bin/env python3
"""
验证 visual_anchors 字段是否正确提取和保存
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
    # 获取最近完成的任务（优先查找 Part 1 完成但 Part 2 未完成的任务）
    result = session.execute(text("""
        SELECT id, gemini_result, structured_result, part2_completed
        FROM analysis_tasks 
        WHERE status = 'completed' OR status = 'part1_completed'
        ORDER BY created_at DESC 
        LIMIT 1
    """))
    row = result.fetchone()
    
    if row:
        task_id, gemini_result, structured_result, part2_completed = row
        print("=" * 80)
        print(f"📋 任务 ID: {task_id[:30]}...")
        print(f"📋 Part 2 完成状态: {part2_completed}")
        print("=" * 80)
        print()
        
        # 1. 检查 gemini_result 中是否有 module_4_visual_anchors
        print("🔍 步骤 1: 检查 Gemini 原始输出 (gemini_result)")
        print("-" * 80)
        if gemini_result:
            if isinstance(gemini_result, str):
                gemini = json.loads(gemini_result)
            else:
                gemini = gemini_result
            
            module_4 = gemini.get('module_4_visual_anchors', {})
            if module_4:
                print("✅ gemini_result 中找到 module_4_visual_anchors")
                print(f"   - hero_subject: {module_4.get('hero_subject', 'N/A')[:100]}")
                print(f"   - hero_colors: {module_4.get('hero_colors', [])}")
                print(f"   - material_conflict: {module_4.get('material_conflict', 'N/A')[:100]}")
                print(f"   - protection_strategy: {module_4.get('protection_strategy', 'N/A')[:100]}")
                print(f"   - hsl_constraints: {module_4.get('hsl_constraints', {})}")
            else:
                print("❌ gemini_result 中未找到 module_4_visual_anchors")
                print("   可能原因：")
                print("   1. Part 1 Prompt 未正确更新")
                print("   2. Gemini 未返回该字段")
                print("   3. 这是旧的分析结果（在更新之前）")
        else:
            print("❌ gemini_result 为空")
        
        print()
        
        # 2. 检查 structured_result 中是否有 visualAnchors
        print("🔍 步骤 2: 检查格式化后的结果 (structured_result)")
        print("-" * 80)
        if structured_result:
            if isinstance(structured_result, str):
                structured = json.loads(structured_result)
            else:
                structured = structured_result
            
            sections = structured.get('sections', {})
            visual_anchors = sections.get('visualAnchors', {})
            
            if visual_anchors:
                print("✅ structured_result.sections 中找到 visualAnchors")
                print(f"   - hero_subject: {visual_anchors.get('hero_subject', 'N/A')[:100]}")
                print(f"   - hero_colors: {visual_anchors.get('hero_colors', [])}")
                print(f"   - material_conflict: {visual_anchors.get('material_conflict', 'N/A')[:100]}")
                print(f"   - protection_strategy: {visual_anchors.get('protection_strategy', 'N/A')[:100]}")
                print(f"   - hsl_constraints: {visual_anchors.get('hsl_constraints', {})}")
            else:
                print("❌ structured_result.sections 中未找到 visualAnchors")
                print(f"   sections keys: {list(sections.keys())}")
                print("   可能原因：")
                print("   1. _format_visual_anchors 方法未正确提取数据")
                print("   2. format_part1 方法未将 visualAnchors 加入 sections")
                print("   3. Pydantic Schema 验证时过滤掉了该字段")
        else:
            print("❌ structured_result 为空")
        
        print()
        
        # 3. 检查 Part 2 是否能访问到 Part 1 的 visual_anchors
        print("🔍 步骤 3: 检查 Part 2 是否能访问 Part 1 的 visual_anchors")
        print("-" * 80)
        if structured_result and isinstance(structured_result, dict) if not isinstance(structured_result, str) else True:
            if isinstance(structured_result, str):
                structured = json.loads(structured_result)
            else:
                structured = structured_result
            
            part1_sections = structured.get('sections', {})
            visual_anchors = part1_sections.get('visualAnchors', {})
            
            if visual_anchors:
                hero_colors = visual_anchors.get('hero_colors', [])
                print("✅ Part 1 的 visual_anchors 数据可用于 Part 2")
                print(f"   核心颜色: {hero_colors}")
                print()
                print("💡 提示：Part 2 Prompt 中的 VISUAL ANCHOR PROTECTION PROTOCOL")
                print("   应该能够读取这些数据并应用保护规则。")
            else:
                print("⚠️ Part 1 的 visual_anchors 数据不存在，Part 2 将无法应用保护规则")
        
        print()
        print("=" * 80)
        print("📝 验证总结")
        print("=" * 80)
        print()
        print("如果所有步骤都显示 ✅，说明 visual_anchors 字段工作正常。")
        print("如果有 ❌，请检查：")
        print("1. 后端日志中是否有 '_format_visual_anchors' 相关的错误")
        print("2. Part 1 Prompt 是否正确更新（包含 module_4_visual_anchors）")
        print("3. 是否需要重新运行 Part 1 分析（旧数据可能不包含新字段）")
        
    else:
        print("❌ 没有找到已完成的任务")
        print("   请先运行一次 Part 1 分析")

    session.close()
except Exception as e:
    print(f"❌ 错误: {e}")
    import traceback
    traceback.print_exc()
