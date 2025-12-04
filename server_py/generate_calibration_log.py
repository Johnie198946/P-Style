#!/usr/bin/env python3
"""
校准数据日志生成脚本
用于生成校准前后的参数对比报告，便于调试和验证校准引擎的效果

使用方法：
    python3 generate_calibration_log.py [task_id]
    
如果不提供 task_id，将显示最近完成的 Part2 任务列表
"""

import sys
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
from sqlalchemy import create_engine, desc
from sqlalchemy.orm import sessionmaker

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from app.models import AnalysisTask
from app.config import get_settings


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


def extract_calibration_data(structured_result: Dict[str, Any]) -> Dict[str, Any]:
    """从 structured_result 中提取校准相关数据"""
    result = {
        "has_calibration_meta": False,
        "calibration_meta": {},
        "lightroom_structured": {},
        "basic_panel": {},
        "tone_curve": {},
        "hsl": {},
        "color_grading": {},
        "calibration": {},
    }
    
    # 提取校准元数据
    meta = structured_result.get("meta", {})
    if "calibration" in meta:
        result["has_calibration_meta"] = True
        result["calibration_meta"] = meta["calibration"]
    
    # 提取 Lightroom structured 数据
    sections = structured_result.get("sections", {})
    lightroom_section = sections.get("lightroom", {})
    lightroom_structured = lightroom_section.get("structured", {})
    result["lightroom_structured"] = lightroom_structured
    
    # 提取各个参数组
    result["basic_panel"] = lightroom_structured.get("basic", {})
    result["tone_curve"] = lightroom_structured.get("toneCurve", [])
    result["hsl"] = lightroom_structured.get("hsl", {})
    result["color_grading"] = lightroom_structured.get("colorGrading", {})
    result["calibration"] = lightroom_structured.get("calibration", {})
    
    return result


def extract_gemini_original_data(gemini_result: Dict[str, Any]) -> Dict[str, Any]:
    """从 Gemini 原始结果中提取参数（用于对比）"""
    result = {
        "basic_panel": {},
        "tone_curve": {},
        "hsl": {},
        "color_grading": {},
        "calibration": {},
    }
    
    # Gemini 输出格式：lightroom_workflow
    lr_workflow = gemini_result.get("lightroom_workflow", {})
    
    # 提取 basic_panel
    basic_panel = lr_workflow.get("basic_panel", {})
    for param_name, param_obj in basic_panel.items():
        if isinstance(param_obj, dict):
            result["basic_panel"][param_name] = {
                "value": param_obj.get("value", ""),
                "reason": param_obj.get("reason", ""),
            }
    
    # 提取 tone_curve
    tone_curve = lr_workflow.get("tone_curve", {})
    result["tone_curve"] = {
        "rgb_points": tone_curve.get("rgb_points", []),
        "red_points": tone_curve.get("red_points", []),
        "green_points": tone_curve.get("green_points", []),
        "blue_points": tone_curve.get("blue_points", []),
    }
    
    # 提取 hsl
    hsl = lr_workflow.get("hsl", {})
    result["hsl"] = hsl
    
    # 提取 color_grading
    color_grading = lr_workflow.get("color_grading", {})
    result["color_grading"] = color_grading
    
    # 提取 calibration
    calibration = lr_workflow.get("calibration", {})
    result["calibration"] = calibration
    
    return result


def format_param_value(param_obj: Any) -> str:
    """格式化参数值用于显示"""
    if param_obj is None:
        return "(空)"
    if isinstance(param_obj, dict):
        value = param_obj.get("value") or param_obj.get("range", "")
        if not value:
            return "(空)"
        reason = param_obj.get("reason") or param_obj.get("note", "")
        if reason:
            return f"{value} ({reason[:30]}...)" if len(reason) > 30 else f"{value} ({reason})"
        return str(value)
    if isinstance(param_obj, (int, float)):
        return str(param_obj)
    if isinstance(param_obj, str):
        return param_obj if param_obj else "(空)"
    return str(param_obj) if param_obj else "(空)"


def compare_params(original: Dict[str, Any], calibrated: Dict[str, Any], param_group: str) -> Dict[str, Any]:
    """对比原始参数和校准后的参数"""
    comparison = {
        "param_group": param_group,
        "params": [],
    }
    
    if param_group == "basic_panel":
        # 对比基础面板参数
        all_keys = set(original.keys()) | set(calibrated.keys())
        for key in sorted(all_keys):
            orig_val = original.get(key, {})
            calib_val = calibrated.get(key, {})
            
            orig_str = format_param_value(orig_val)
            calib_str = format_param_value(calib_val)
            
            is_changed = orig_str != calib_str
            
            comparison["params"].append({
                "name": key,
                "original": orig_str,
                "calibrated": calib_str,
                "changed": is_changed,
            })
    
    elif param_group == "hsl":
        # 对比 HSL 参数
        all_keys = set(original.keys()) | set(calibrated.keys())
        for key in sorted(all_keys):
            orig_val = original.get(key, {})
            calib_val = calibrated.get(key, {})
            
            if isinstance(orig_val, dict) and isinstance(calib_val, dict):
                orig_str = f"h:{orig_val.get('hue', 0)}, s:{orig_val.get('saturation', 0)}, l:{orig_val.get('luminance', 0)}"
                calib_str = f"h:{calib_val.get('hue', 0)}, s:{calib_val.get('saturation', 0)}, l:{calib_val.get('luminance', 0)}"
            else:
                orig_str = str(orig_val)
                calib_str = str(calib_val)
            
            is_changed = orig_str != calib_str
            
            comparison["params"].append({
                "name": key,
                "original": orig_str,
                "calibrated": calib_str,
                "changed": is_changed,
            })
    
    return comparison


def generate_report(task: AnalysisTask, output_format: str = "text") -> str:
    """生成校准报告"""
    structured_result = load_json_safely(task.structured_result)
    gemini_result = load_json_safely(task.gemini_result)
    
    # 提取校准数据
    calib_data = extract_calibration_data(structured_result)
    gemini_data = extract_gemini_original_data(gemini_result)
    
    if output_format == "json":
        # JSON 格式输出
        report = {
            "task_id": task.id,
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "updated_at": task.updated_at.isoformat() if task.updated_at else None,
            "part2_completed": task.part2_completed,
            "calibration_meta": calib_data["calibration_meta"],
            "comparison": {
                "basic_panel": compare_params(gemini_data["basic_panel"], calib_data["basic_panel"], "basic_panel"),
                "hsl": compare_params(gemini_data["hsl"], calib_data["hsl"], "hsl"),
            },
            "calibrated_data": {
                "basic_panel": calib_data["basic_panel"],
                "tone_curve": calib_data["tone_curve"],
                "hsl": calib_data["hsl"],
                "color_grading": calib_data["color_grading"],
                "calibration": calib_data["calibration"],
            },
            "original_data": gemini_data,
        }
        return json.dumps(report, ensure_ascii=False, indent=2)
    
    else:
        # 文本格式输出
        lines = []
        lines.append("=" * 80)
        lines.append(f"校准数据报告 - Task ID: {task.id}")
        lines.append("=" * 80)
        lines.append(f"创建时间: {task.created_at}")
        lines.append(f"更新时间: {task.updated_at}")
        lines.append(f"Part2 完成: {task.part2_completed}")
        lines.append("")
        
        # 校准元数据
        if calib_data["has_calibration_meta"]:
            meta = calib_data["calibration_meta"]
            lines.append("【校准元数据】")
            lines.append(f"  状态: {meta.get('status', 'N/A')}")
            if meta.get("status") == "success":
                lines.append(f"  初始 Loss: {meta.get('initial_loss', 'N/A')}")
                lines.append(f"  最终 Loss: {meta.get('final_loss', 'N/A')}")
                lines.append(f"  改善率: {meta.get('improvement', 'N/A')}%")
                lines.append(f"  迭代次数: {meta.get('iterations', 'N/A')}")
                lines.append(f"  优化参数数量: {meta.get('param_count', 'N/A')}")
                lines.append(f"  说明: {meta.get('note', 'N/A')}")
            else:
                lines.append(f"  失败原因: {meta.get('reason', 'N/A')}")
        else:
            lines.append("【校准元数据】")
            lines.append("  ⚠️ 未找到校准元数据（可能未执行校准）")
        
        lines.append("")
        
        # 参数对比
        lines.append("【参数对比】")
        
        # Basic Panel 对比
        basic_comparison = compare_params(gemini_data["basic_panel"], calib_data["basic_panel"], "basic_panel")
        lines.append("")
        lines.append("1. 基础面板 (Basic Panel):")
        changed_count = sum(1 for p in basic_comparison["params"] if p["changed"])
        lines.append(f"   总参数数: {len(basic_comparison['params'])}, 已更改: {changed_count}")
        lines.append("")
        
        for param in basic_comparison["params"]:
            if param["changed"]:
                lines.append(f"   ✅ {param['name']}:")
                lines.append(f"      原始: {param['original']}")
                lines.append(f"      校准: {param['calibrated']}")
            else:
                lines.append(f"   ⚪ {param['name']}: {param['original']} (未更改)")
        
        # HSL 对比
        hsl_comparison = compare_params(gemini_data["hsl"], calib_data["hsl"], "hsl")
        lines.append("")
        lines.append("2. HSL 调整:")
        changed_count = sum(1 for p in hsl_comparison["params"] if p["changed"])
        lines.append(f"   总颜色数: {len(hsl_comparison['params'])}, 已更改: {changed_count}")
        lines.append("")
        
        for param in hsl_comparison["params"]:
            if param["changed"]:
                lines.append(f"   ✅ {param['name']}:")
                lines.append(f"      原始: {param['original']}")
                lines.append(f"      校准: {param['calibrated']}")
            else:
                lines.append(f"   ⚪ {param['name']}: {param['original']} (未更改)")
        
        lines.append("")
        lines.append("=" * 80)
        
        return "\n".join(lines)


def list_recent_tasks(db_session, limit: int = 10):
    """列出最近完成的 Part2 任务"""
    tasks = db_session.query(AnalysisTask).filter(
        AnalysisTask.part2_completed == True
    ).order_by(desc(AnalysisTask.updated_at)).limit(limit).all()
    
    if not tasks:
        print("❌ 未找到已完成的 Part2 任务")
        return
    
    print(f"\n📋 最近完成的 Part2 任务（最多 {limit} 个）:\n")
    print(f"{'序号':<6} {'Task ID':<40} {'创建时间':<20} {'更新时间':<20}")
    print("-" * 90)
    
    for idx, task in enumerate(tasks, 1):
        created_str = task.created_at.strftime("%Y-%m-%d %H:%M:%S") if task.created_at else "N/A"
        updated_str = task.updated_at.strftime("%Y-%m-%d %H:%M:%S") if task.updated_at else "N/A"
        print(f"{idx:<6} {task.id:<40} {created_str:<20} {updated_str:<20}")
    
    print("\n💡 使用方法: python3 generate_calibration_log.py <task_id>")


def main():
    """主函数"""
    # 解析命令行参数
    task_id = sys.argv[1] if len(sys.argv) > 1 else None
    output_format = sys.argv[2] if len(sys.argv) > 2 else "text"
    
    if output_format not in ["text", "json"]:
        print(f"❌ 无效的输出格式: {output_format}，支持: text, json")
        sys.exit(1)
    
    # 连接数据库
    settings = get_settings()
    database_url = settings.DATABASE_URL
    
    # 如果是 SQLite，检查文件是否存在
    if database_url.startswith("sqlite"):
        db_path = database_url.replace("sqlite:///", "")
        if not os.path.exists(db_path):
            print(f"❌ 数据库文件不存在: {db_path}")
            sys.exit(1)
    
    engine = create_engine(database_url, connect_args={"check_same_thread": False} if database_url.startswith("sqlite") else {})
    Session = sessionmaker(bind=engine)
    db_session = Session()
    
    try:
        if task_id:
            # 查询指定任务
            task = db_session.query(AnalysisTask).filter(AnalysisTask.id == task_id).first()
            if not task:
                print(f"❌ 未找到任务: {task_id}")
                sys.exit(1)
            
            # 生成报告
            report = generate_report(task, output_format)
            print(report)
            
            # 如果是指定格式，保存到文件
            if output_format == "json":
                output_file = f"calibration_log_{task_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                with open(output_file, "w", encoding="utf-8") as f:
                    f.write(report)
                print(f"\n✅ 报告已保存到: {output_file}")
            else:
                output_file = f"calibration_log_{task_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
                with open(output_file, "w", encoding="utf-8") as f:
                    f.write(report)
                print(f"\n✅ 报告已保存到: {output_file}")
        else:
            # 列出最近的任务
            list_recent_tasks(db_session)
    
    finally:
        db_session.close()


if __name__ == "__main__":
    main()

