#!/usr/bin/env python3
"""
查看 Gemini Part1 和 Part2 原始输出脚本
可以直接在终端运行，自动处理路径

使用方法:
    python3 show_gemini_output.py                    # 列出最近的任务
    python3 show_gemini_output.py <task_id>          # 查看指定任务的完整输出
    python3 show_gemini_output.py <task_id> --part1 # 只查看 Part1
    python3 show_gemini_output.py <task_id> --part2 # 只查看 Part2
"""

import sys
import json
import os
from pathlib import Path

# 自动获取脚本所在目录，并添加到 Python 路径
SCRIPT_DIR = Path(__file__).parent.absolute()
sys.path.insert(0, str(SCRIPT_DIR))

# 设置工作目录
os.chdir(SCRIPT_DIR)

# 导入项目模块
from app.models import AnalysisTask
from app.config import get_settings
from sqlalchemy import create_engine, desc
from sqlalchemy.orm import sessionmaker


def load_json_safely(data):
    """安全地加载 JSON 数据"""
    if data is None:
        return {}
    if isinstance(data, dict):
        return data
    if isinstance(data, str):
        try:
            return json.loads(data)
        except:
            return {}
    return {}


def list_recent_tasks(limit=10):
    """列出最近的任务"""
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        tasks = session.query(AnalysisTask).order_by(desc(AnalysisTask.created_at)).limit(limit).all()
        
        result = []
        for task in tasks:
            gemini_result = load_json_safely(task.gemini_result)
            has_part1 = bool(gemini_result.get("part1") or gemini_result.get("phase_1_extraction"))
            has_part2 = bool(gemini_result.get("part2") or gemini_result.get("lightroom_workflow") or gemini_result.get("color_science_scheme"))
            
            result.append({
                "task_id": task.id,
                "status": task.status,
                "part2_completed": task.part2_completed,
                "has_part1": has_part1,
                "has_part2": has_part2,
                "created_at": task.created_at.strftime("%Y-%m-%d %H:%M:%S") if task.created_at else "N/A",
            })
        
        return result
    finally:
        session.close()


def show_gemini_output(task_id, show_part1=True, show_part2=True):
    """显示 Gemini 输出"""
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        task = session.query(AnalysisTask).filter(AnalysisTask.id == task_id).first()
        
        if not task:
            print(f"❌ 未找到任务: {task_id}")
            return
        
        gemini_result = load_json_safely(task.gemini_result)
        
        print("=" * 100)
        print(f"任务 ID: {task_id}")
        print(f"状态: {task.status}")
        print(f"Part2 完成: {'是' if task.part2_completed else '否'}")
        print(f"创建时间: {task.created_at.strftime('%Y-%m-%d %H:%M:%S') if task.created_at else 'N/A'}")
        print("=" * 100)
        
        if not gemini_result:
            print("⚠️  Gemini 输出为空")
            return
        
        # Part1 输出
        if show_part1:
            print("\n" + "=" * 100)
            print("📋 Part1 完整输出内容")
            print("=" * 100)
            
            part1_data = gemini_result.get("part1") or gemini_result.get("phase_1_extraction") or {}
            
            if part1_data:
                print(json.dumps(part1_data, ensure_ascii=False, indent=2))
            else:
                print("⚠️  Part1 数据不存在")
        
        # Part2 输出
        if show_part2:
            print("\n" + "=" * 100)
            print("📋 Part2 完整输出内容 (lightroom_workflow)")
            print("=" * 100)
            
            part2_data = gemini_result.get("lightroom_workflow") or {}
            
            if part2_data:
                print(json.dumps(part2_data, ensure_ascii=False, indent=2))
            else:
                print("⚠️  Part2 lightroom_workflow 数据不存在")
                # 尝试其他可能的字段
                if "part2" in gemini_result:
                    print("\n尝试从 'part2' 字段提取:")
                    print(json.dumps(gemini_result["part2"], ensure_ascii=False, indent=2))
                elif "color_science_scheme" in gemini_result:
                    print("\n尝试从 'color_science_scheme' 字段提取:")
                    print(json.dumps(gemini_result["color_science_scheme"], ensure_ascii=False, indent=2))
    
    finally:
        session.close()


def main():
    # 解析命令行参数
    show_part1 = True
    show_part2 = True
    task_id = None
    
    args = sys.argv[1:]
    for arg in args:
        if arg == "--part1":
            show_part1 = True
            show_part2 = False
        elif arg == "--part2":
            show_part1 = False
            show_part2 = True
        elif not arg.startswith("--"):
            task_id = arg
    
    if not task_id:
        # 列出最近的任务
        print("=" * 100)
        print("最近的任务列表")
        print("=" * 100)
        tasks = list_recent_tasks(limit=10)
        
        if not tasks:
            print("⚠️  没有找到任何任务")
            return
        
        print(f"{'任务 ID':<40} {'状态':<20} {'Part1':<8} {'Part2':<8} {'创建时间':<20}")
        print("-" * 100)
        for task in tasks:
            part1_status = "✅" if task["has_part1"] else "❌"
            part2_status = "✅" if task["has_part2"] else "❌"
            print(f"{task['task_id']:<40} {task['status']:<20} {part1_status:<8} {part2_status:<8} {task['created_at']:<20}")
        
        print("\n使用方法:")
        print("  python3 show_gemini_output.py <task_id>          # 查看完整输出")
        print("  python3 show_gemini_output.py <task_id> --part1  # 只查看 Part1")
        print("  python3 show_gemini_output.py <task_id> --part2  # 只查看 Part2")
    else:
        # 显示指定任务的输出
        show_gemini_output(task_id, show_part1=show_part1, show_part2=show_part2)


if __name__ == "__main__":
    main()


