#!/usr/bin/env python3
"""
检查 lightroom 数据缺失问题
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path('.').absolute()))

from app.models import AnalysisTask
from app.config import get_settings
from sqlalchemy import create_engine, desc
from sqlalchemy.orm import sessionmaker
import json

def main():
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # 获取最近完成的任务
        task = session.query(AnalysisTask).filter(
            AnalysisTask.status == 'completed'
        ).order_by(desc(AnalysisTask.created_at)).first()

        if not task:
            print("❌ 没有找到已完成的任务")
            return

        print("=" * 80)
        print(f"📋 任务 ID: {task.id[:30]}...")
        print(f"📅 创建时间: {task.created_at}")
        print("=" * 80)
        print()

        # 检查 structured_result
        if not task.structured_result:
            print("❌ structured_result 为空")
            return

        structured = task.structured_result
        if isinstance(structured, str):
            structured = json.loads(structured)

        # 检查 sections
        sections = structured.get('sections', {})
        print(f"✅ sections 存在: {bool(sections)}")
        print(f"✅ sections keys: {list(sections.keys())}")
        print()

        # 检查 lightroom section
        if 'lightroom' not in sections:
            print("❌❌❌ 问题确认：sections.lightroom 不存在！")
            print()
            print("可能的原因：")
            print("1. format_part2 没有正确创建 lightroom_result")
            print("2. Pydantic 验证时过滤掉了 lightroom section")
            print("3. 数据库更新时丢失了数据")
            return

        lightroom = sections.get('lightroom', {})
        print(f"✅ lightroom section 存在: {bool(lightroom)}")
        print(f"✅ lightroom keys: {list(lightroom.keys()) if isinstance(lightroom, dict) else 'not dict'}")
        print()

        # 检查 lightroom.structured
        lightroom_structured = lightroom.get('structured', {})
        print(f"✅ lightroom.structured 存在: {bool(lightroom_structured)}")
        if isinstance(lightroom_structured, dict):
            print(f"✅ lightroom.structured keys: {list(lightroom_structured.keys())}")
            print()

            # 检查 basic 字段
            basic = lightroom_structured.get('basic', {})
            print(f"✅ lightroom.structured.basic 存在: {bool(basic)}")
            if isinstance(basic, dict):
                print(f"✅ basic keys: {list(basic.keys())}")
                print()
                print("📋 basic 参数值:")
                for key in ['temp', 'tint', 'exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks']:
                    if key in basic:
                        param = basic[key]
                        value = param.get('value', 'N/A')
                        reason = param.get('reason', 'N/A')[:50] if param.get('reason') else 'N/A'
                        print(f"  {key:12} = {str(value):10} | {reason}")
                    else:
                        print(f"  {key:12} = ❌ 缺失")
            else:
                print(f"❌ basic 不是字典类型: {type(basic)}")
        else:
            print(f"❌ lightroom.structured 不是字典类型: {type(lightroom_structured)}")

        # 检查 panels
        panels = lightroom_structured.get('panels', [])
        print()
        print(f"✅ panels 存在: {bool(panels)}")
        if isinstance(panels, list):
            print(f"✅ panels 数量: {len(panels)}")
            for i, panel in enumerate(panels[:3]):  # 只显示前3个
                title = panel.get('title', 'N/A')
                params_count = len(panel.get('params', []))
                print(f"  Panel {i+1}: {title} ({params_count} 个参数)")

    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == '__main__':
    main()

