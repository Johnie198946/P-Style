#!/usr/bin/env python3
"""
查看 Gemini 输出脚本
用于查看 Part1 和 Part2 的 Gemini 原始输出内容

使用方法：
    python3 view_gemini_output.py [task_id]
    
如果不提供 task_id，将显示最近完成的 Part2 任务列表

示例：
    python3 view_gemini_output.py                    # 列出最近的任务
    python3 view_gemini_output.py abc-123-def        # 查看指定任务的 Gemini 输出
    python3 view_gemini_output.py abc-123-def --part1 # 只查看 Part1 输出
    python3 view_gemini_output.py abc-123-def --part2 # 只查看 Part2 输出
    python3 view_gemini_output.py abc-123-def --json  # 以 JSON 格式输出
"""

import sys
import json
import os
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
from sqlalchemy import create_engine, desc
from sqlalchemy.orm import sessionmaker

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from app.models import AnalysisTask
from app.config import get_settings
from app.db import get_db


def load_json_safely(data: Any) -> Dict[str, Any]:
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


def list_recent_tasks(limit: int = 10) -> List[Dict[str, Any]]:
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
                "updated_at": task.updated_at.strftime("%Y-%m-%d %H:%M:%S") if task.updated_at else "N/A",
            })
        
        return result
    finally:
        session.close()


def view_gemini_output(task_id: str, show_part1: bool = True, show_part2: bool = True, json_format: bool = False):
    """查看指定任务的 Gemini 输出"""
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
        
        if json_format:
            # JSON 格式输出
            output = {
                "task_id": task_id,
                "status": task.status,
                "part2_completed": task.part2_completed,
                "created_at": task.created_at.isoformat() if task.created_at else None,
                "updated_at": task.updated_at.isoformat() if task.updated_at else None,
            }
            
            if show_part1:
                part1_data = gemini_result.get("part1") or gemini_result.get("phase_1_extraction") or {}
                output["part1"] = part1_data
            
            if show_part2:
                part2_data = {}
                # 尝试从多个可能的字段中提取 Part2 数据
                if "part2" in gemini_result:
                    part2_data = gemini_result["part2"]
                elif "lightroom_workflow" in gemini_result:
                    part2_data["lightroom_workflow"] = gemini_result["lightroom_workflow"]
                elif "color_science_scheme" in gemini_result:
                    part2_data["color_science_scheme"] = gemini_result["color_science_scheme"]
                else:
                    # 如果都没有，尝试提取所有可能的 Part2 相关字段
                    part2_keys = [k for k in gemini_result.keys() if k not in ["part1", "phase_1_extraction"]]
                    for key in part2_keys:
                        part2_data[key] = gemini_result[key]
                
                output["part2"] = part2_data
            
            print(json.dumps(output, ensure_ascii=False, indent=2))
        else:
            # 人类可读格式输出
            print("=" * 80)
            print(f"任务 ID: {task_id}")
            print(f"状态: {task.status}")
            print(f"Part2 完成: {'是' if task.part2_completed else '否'}")
            print(f"创建时间: {task.created_at.strftime('%Y-%m-%d %H:%M:%S') if task.created_at else 'N/A'}")
            print(f"更新时间: {task.updated_at.strftime('%Y-%m-%d %H:%M:%S') if task.updated_at else 'N/A'}")
            print("=" * 80)
            
            if not gemini_result:
                print("⚠️  Gemini 输出为空")
                return
            
            # Part1 输出
            if show_part1:
                print("\n" + "=" * 80)
                print("📋 Part1 输出")
                print("=" * 80)
                
                part1_data = gemini_result.get("part1") or gemini_result.get("phase_1_extraction") or {}
                
                if part1_data:
                    print(json.dumps(part1_data, ensure_ascii=False, indent=2))
                else:
                    print("⚠️  Part1 数据不存在")
            
            # Part2 输出
            if show_part2:
                print("\n" + "=" * 80)
                print("📋 Part2 输出")
                print("=" * 80)
                
                part2_data = {}
                # 尝试从多个可能的字段中提取 Part2 数据
                if "part2" in gemini_result:
                    part2_data = gemini_result["part2"]
                elif "lightroom_workflow" in gemini_result:
                    part2_data["lightroom_workflow"] = gemini_result["lightroom_workflow"]
                elif "color_science_scheme" in gemini_result:
                    part2_data["color_science_scheme"] = gemini_result["color_science_scheme"]
                else:
                    # 如果都没有，尝试提取所有可能的 Part2 相关字段
                    part2_keys = [k for k in gemini_result.keys() if k not in ["part1", "phase_1_extraction"]]
                    for key in part2_keys:
                        part2_data[key] = gemini_result[key]
                
                if part2_data:
                    print(json.dumps(part2_data, ensure_ascii=False, indent=2))
                else:
                    print("⚠️  Part2 数据不存在")
            
            # 显示完整的 gemini_result（如果用户想看）
            print("\n" + "=" * 80)
            print("📋 完整 Gemini 输出（所有字段）")
            print("=" * 80)
            print(f"字段列表: {list(gemini_result.keys())}")
            print(f"总字段数: {len(gemini_result)}")
            
            # 显示每个字段的简要信息
            for key, value in gemini_result.items():
                if isinstance(value, dict):
                    print(f"  - {key}: 字典，包含 {len(value)} 个键")
                    if len(value) <= 5:
                        print(f"    键: {list(value.keys())}")
                elif isinstance(value, list):
                    print(f"  - {key}: 列表，包含 {len(value)} 个元素")
                elif isinstance(value, str):
                    print(f"  - {key}: 字符串，长度 {len(value)}")
                else:
                    print(f"  - {key}: {type(value).__name__}")
    
    finally:
        session.close()


def main():
    parser = argparse.ArgumentParser(description="查看 Gemini 输出内容")
    parser.add_argument("task_id", nargs="?", help="任务 ID（如果不提供，将列出最近的任务）")
    parser.add_argument("--part1", action="store_true", help="只显示 Part1 输出")
    parser.add_argument("--part2", action="store_true", help="只显示 Part2 输出")
    parser.add_argument("--json", action="store_true", help="以 JSON 格式输出")
    parser.add_argument("--limit", type=int, default=10, help="列出任务时的数量限制（默认 10）")
    
    args = parser.parse_args()
    
    if not args.task_id:
        # 列出最近的任务
        print("=" * 80)
        print("最近的任务列表")
        print("=" * 80)
        tasks = list_recent_tasks(limit=args.limit)
        
        if not tasks:
            print("⚠️  没有找到任何任务")
            return
        
        print(f"{'任务 ID':<40} {'状态':<20} {'Part1':<8} {'Part2':<8} {'创建时间':<20}")
        print("-" * 80)
        for task in tasks:
            part1_status = "✅" if task["has_part1"] else "❌"
            part2_status = "✅" if task["has_part2"] else "❌"
            print(f"{task['task_id']:<40} {task['status']:<20} {part1_status:<8} {part2_status:<8} {task['created_at']:<20}")
        
        print("\n使用方法: python3 view_gemini_output.py <task_id>")
    else:
        # 查看指定任务的输出
        show_part1 = not args.part2 if (args.part1 or args.part2) else True
        show_part2 = not args.part1 if (args.part1 or args.part2) else True
        
        view_gemini_output(args.task_id, show_part1=show_part1, show_part2=show_part2, json_format=args.json)


if __name__ == "__main__":
    main()


