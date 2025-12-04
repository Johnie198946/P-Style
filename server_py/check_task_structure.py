#!/usr/bin/env python3
"""
检查任务 structured_result 的完整结构
"""

import sys
import json
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from app.models import AnalysisTask
from app.config import get_settings


def check_task_structure(task_id: str):
    """检查任务的 structured_result 结构"""
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    try:
        task = db.query(AnalysisTask).filter(AnalysisTask.id == task_id).first()
        if not task:
            print(f"❌ 未找到任务: {task_id}")
            return
        
        if not task.structured_result:
            print(f"❌ structured_result 为空")
            return
        
        structured = task.structured_result
        
        # 打印完整结构（限制深度）
        def print_structure(obj, prefix="", max_depth=3, current_depth=0):
            if current_depth >= max_depth:
                print(f"{prefix}... (max depth reached)")
                return
            
            if isinstance(obj, dict):
                for key, value in obj.items():
                    if isinstance(value, (dict, list)):
                        print(f"{prefix}{key}: {type(value).__name__} ({len(value) if isinstance(value, (dict, list)) else 'N/A'})")
                        print_structure(value, prefix + "  ", max_depth, current_depth + 1)
                    else:
                        value_str = str(value)[:50] if value else "None"
                        print(f"{prefix}{key}: {value_str}")
            elif isinstance(obj, list):
                if len(obj) > 0:
                    print(f"{prefix}[0]: {type(obj[0]).__name__}")
                    if isinstance(obj[0], (dict, list)):
                        print_structure(obj[0], prefix + "  ", max_depth, current_depth + 1)
        
        print(f"\n📊 structured_result 完整结构:")
        print_structure(structured)
        
        # 检查 sections
        sections = structured.get("sections", {})
        print(f"\n📁 sections keys: {list(sections.keys())}")
        
        # 检查 lightroom
        if "lightroom" in sections:
            lightroom = sections["lightroom"]
            print(f"\n🎨 lightroom section:")
            print(f"  type: {type(lightroom).__name__}")
            if isinstance(lightroom, dict):
                print(f"  keys: {list(lightroom.keys())}")
                if "structured" in lightroom:
                    lr_structured = lightroom["structured"]
                    print(f"  structured type: {type(lr_structured).__name__}")
                    if isinstance(lr_structured, dict):
                        print(f"  structured keys: {list(lr_structured.keys())}")
        
        # 检查 meta
        meta = structured.get("meta", {})
        print(f"\n🔧 meta:")
        print(f"  type: {type(meta).__name__}")
        if isinstance(meta, dict):
            print(f"  keys: {list(meta.keys())}")
            if "calibration" in meta:
                calib = meta["calibration"]
                print(f"  calibration: {calib}")
        
    finally:
        db.close()


if __name__ == "__main__":
    task_id = sys.argv[1] if len(sys.argv) > 1 else "38145dcf-d242-4c27-b44c-292e226442c7"
    check_task_structure(task_id)

