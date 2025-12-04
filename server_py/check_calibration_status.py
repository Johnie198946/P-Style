#!/usr/bin/env python3
"""
校准状态检查脚本
用于快速检查任务是否执行了校准，以及查看校准后的数据

使用方法：
    python3 check_calibration_status.py [task_id]
    
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


def format_param_value(param_obj: Any) -> str:
    """格式化参数值"""
    if isinstance(param_obj, dict):
        return param_obj.get("value", param_obj.get("val", "N/A"))
    return str(param_obj)


def check_calibration_status(task_id: str) -> Dict[str, Any]:
    """检查任务的校准状态"""
    db = next(get_db())
    
    try:
        task = db.query(AnalysisTask).filter(AnalysisTask.id == task_id).first()
        
        if not task:
            return {"error": f"任务 {task_id} 不存在"}
        
        result = {
            "task_id": task_id,
            "created_at": task.created_at.isoformat() if task.created_at else "N/A",
            "updated_at": task.updated_at.isoformat() if task.updated_at else "N/A",
            "status": task.status,
            "part2_completed": task.part2_completed,
            "has_source_image": bool(task.source_image_data),
            "has_target_image": bool(task.target_image_data),
            "calibration_status": "unknown",
            "calibration_meta": {},
            "calibrated_params": {},
            "original_params": {},
        }
        
        # 检查 structured_result
        if not task.structured_result:
            result["calibration_status"] = "no_structured_result"
            return result
        
        structured_result = load_json_safely(task.structured_result)
        
        # 检查 meta.calibration
        meta = structured_result.get("meta", {})
        calibration_meta = meta.get("calibration", {})
        
        if not calibration_meta:
            result["calibration_status"] = "no_calibration_meta"
            return result
        
        result["calibration_meta"] = calibration_meta
        calibration_status = calibration_meta.get("status", "unknown")
        result["calibration_status"] = calibration_status
        
        # 检查 lightroom.structured（校准后的数据）
        sections = structured_result.get("sections", {})
        lightroom_section = sections.get("lightroom", {})
        lightroom_structured = lightroom_section.get("structured", {}) if isinstance(lightroom_section, dict) else {}
        
        if lightroom_structured:
            result["calibrated_params"] = {
                "basic": lightroom_structured.get("basic", {}),
                "hsl": lightroom_structured.get("hsl", {}),
                "colorGrading": lightroom_structured.get("colorGrading", {}),
                "calibration": lightroom_structured.get("calibration", {}),
                "toneCurve": lightroom_structured.get("toneCurve", []),
            }
        
        # 尝试从 gemini_result 获取原始参数（用于对比）
        if task.gemini_result:
            gemini_result = load_json_safely(task.gemini_result)
            lightroom_workflow = gemini_result.get("lightroom_workflow", {})
            
            if lightroom_workflow:
                # 提取原始 basic_panel
                basic_panel = lightroom_workflow.get("basic_panel", {})
                original_basic = {}
                for param_name, param_obj in basic_panel.items():
                    if isinstance(param_obj, dict):
                        original_basic[param_name] = {
                            "value": param_obj.get("value", ""),
                            "reason": param_obj.get("reason", ""),
                        }
                
                result["original_params"] = {
                    "basic": original_basic,
                    "hsl": lightroom_workflow.get("hsl", {}),
                    "color_grading": lightroom_workflow.get("color_grading", {}),
                    "calibration": lightroom_workflow.get("calibration", {}),
                    "tone_curve": lightroom_workflow.get("tone_curve", {}),
                }
        
        return result
        
    finally:
        db.close()


def print_calibration_status(result: Dict[str, Any]):
    """打印校准状态报告"""
    print("=" * 80)
    print(f"📋 校准状态检查 - Task ID: {result['task_id']}")
    print("=" * 80)
    print(f"创建时间: {result['created_at']}")
    print(f"更新时间: {result['updated_at']}")
    print(f"任务状态: {result['status']}")
    print(f"Part2 完成: {result['part2_completed']}")
    print(f"有参考图: {result['has_source_image']}")
    print(f"有用户图: {result['has_target_image']}")
    print()
    
    # 校准状态
    status = result['calibration_status']
    if status == "success":
        print("✅ 【校准状态】已执行并成功")
    elif status == "failed":
        print("❌ 【校准状态】已执行但失败")
    elif status == "no_calibration_meta":
        print("⚠️ 【校准状态】未找到校准元数据（可能未执行校准）")
    elif status == "no_structured_result":
        print("❌ 【校准状态】未找到 structured_result（任务可能未完成）")
    else:
        print(f"❓ 【校准状态】未知状态: {status}")
    
    print()
    
    # 校准元数据
    calibration_meta = result.get("calibration_meta", {})
    if calibration_meta:
        print("【校准元数据】")
        print(f"  状态: {calibration_meta.get('status', 'N/A')}")
        if calibration_meta.get('status') == 'success':
            print(f"  ✅ 初始 Loss: {calibration_meta.get('initial_loss', 'N/A')}")
            print(f"  ✅ 最终 Loss: {calibration_meta.get('final_loss', 'N/A')}")
            print(f"  ✅ Loss 改善: {calibration_meta.get('improvement', 'N/A')}%")
            print(f"  ✅ 迭代次数: {calibration_meta.get('iterations', 'N/A')}")
            print(f"  ✅ 优化参数数量: {calibration_meta.get('param_count', 'N/A')}")
            if calibration_meta.get('note'):
                print(f"  📝 说明: {calibration_meta.get('note')}")
        else:
            print(f"  ❌ 失败原因: {calibration_meta.get('reason', 'N/A')}")
        print()
    
    # 参数对比
    calibrated_params = result.get("calibrated_params", {})
    original_params = result.get("original_params", {})
    
    if calibrated_params and original_params:
        print("【参数对比】")
        print()
        
        # Basic Panel 对比
        calibrated_basic = calibrated_params.get("basic", {})
        original_basic = original_params.get("basic", {})
        
        if calibrated_basic and original_basic:
            print("1. 基础面板 (Basic Panel):")
            changed_count = 0
            unchanged_count = 0
            
            # 合并所有参数名
            all_param_names = set(list(calibrated_basic.keys()) + list(original_basic.keys()))
            
            for param_name in sorted(all_param_names):
                calibrated_value = format_param_value(calibrated_basic.get(param_name, {}))
                original_value = format_param_value(original_basic.get(param_name, {}))
                
                if calibrated_value != original_value and original_value != "N/A":
                    changed_count += 1
                    original_reason = ""
                    if isinstance(original_basic.get(param_name), dict):
                        original_reason = original_basic[param_name].get("reason", "")
                    print(f"   ✅ {param_name}:")
                    print(f"      原始: {original_value} {f'({original_reason[:50]}...)' if original_reason else ''}")
                    print(f"      校准: {calibrated_value}")
                elif original_value != "N/A":
                    unchanged_count += 1
                    original_reason = ""
                    if isinstance(original_basic.get(param_name), dict):
                        original_reason = original_basic[param_name].get("reason", "")
                    print(f"   ⚪ {param_name}: {original_value} {f'({original_reason[:50]}...)' if original_reason else ''} (未更改)")
            
            print(f"   总参数数: {len(all_param_names)}, 已更改: {changed_count}, 未更改: {unchanged_count}")
            print()
        
        # HSL 对比
        calibrated_hsl = calibrated_params.get("hsl", {})
        original_hsl = original_params.get("hsl", {})
        
        if calibrated_hsl and original_hsl:
            print("2. HSL 调整:")
            color_names = ["red", "orange", "yellow", "green", "aqua", "blue", "purple", "magenta"]
            changed_count = 0
            
            # 辅助函数：解析 HSL 值（支持字符串和数字格式）
            def parse_hsl_value(val):
                if val is None:
                    return 0.0
                if isinstance(val, (int, float)):
                    return float(val)
                val_str = str(val).strip()
                if val_str.startswith('+'):
                    return float(val_str[1:])
                return float(val_str)
            
            for color_name in color_names:
                calibrated_color = calibrated_hsl.get(color_name, {})
                original_color = original_hsl.get(color_name, {})
                
                if calibrated_color and original_color:
                    cal_h = parse_hsl_value(calibrated_color.get("hue", 0))
                    cal_s = parse_hsl_value(calibrated_color.get("saturation", 0))
                    cal_l = parse_hsl_value(calibrated_color.get("luminance", 0))
                    
                    orig_h = parse_hsl_value(original_color.get("hue", 0))
                    orig_s = parse_hsl_value(original_color.get("saturation", 0))
                    orig_l = parse_hsl_value(original_color.get("luminance", 0))
                    
                    if cal_h != orig_h or cal_s != orig_s or cal_l != orig_l:
                        changed_count += 1
                        print(f"   ✅ {color_name}:")
                        print(f"      原始: h:{orig_h:+.0f}, s:{orig_s:+.0f}, l:{orig_l:+.0f}")
                        print(f"      校准: h:{cal_h:+.0f}, s:{cal_s:+.0f}, l:{cal_l:+.0f}")
            
            print(f"   总颜色数: {len(color_names)}, 已更改: {changed_count}")
            print()
    
    # 校准后的参数摘要
    if calibrated_params:
        print("【校准后的参数摘要】")
        calibrated_basic = calibrated_params.get("basic", {})
        if calibrated_basic:
            print("基础面板参数:")
            for param_name in sorted(calibrated_basic.keys()):
                param_obj = calibrated_basic[param_name]
                if isinstance(param_obj, dict):
                    value = param_obj.get("value", "N/A")
                    print(f"  {param_name}: {value}")
        print()
    
    print("=" * 80)


def list_recent_tasks(limit: int = 10):
    """列出最近的 Part2 完成的任务"""
    db = next(get_db())
    
    try:
        tasks = db.query(AnalysisTask).filter(
            AnalysisTask.part2_completed == True
        ).order_by(desc(AnalysisTask.updated_at)).limit(limit).all()
        
        if not tasks:
            print("未找到 Part2 完成的任务")
            return
        
        print(f"📋 最近 {len(tasks)} 个 Part2 完成的任务:")
        print()
        
        for i, task in enumerate(tasks, 1):
            structured_result = load_json_safely(task.structured_result)
            meta = structured_result.get("meta", {})
            calibration_meta = meta.get("calibration", {})
            
            status_icon = "✅" if calibration_meta.get("status") == "success" else "❌" if calibration_meta else "⚠️"
            calibration_status = calibration_meta.get("status", "未执行") if calibration_meta else "未执行"
            
            print(f"{i}. {status_icon} {task.id}")
            print(f"   更新时间: {task.updated_at.isoformat() if task.updated_at else 'N/A'}")
            print(f"   校准状态: {calibration_status}")
            if calibration_meta.get("status") == "success":
                print(f"   Loss 改善: {calibration_meta.get('improvement', 'N/A')}%")
            print()
        
    finally:
        db.close()


def main():
    """主函数"""
    if len(sys.argv) > 1:
        task_id = sys.argv[1]
        result = check_calibration_status(task_id)
        
        if "error" in result:
            print(f"❌ 错误: {result['error']}")
            sys.exit(1)
        
        print_calibration_status(result)
    else:
        list_recent_tasks()
        print()
        print("💡 使用方法: python3 check_calibration_status.py <task_id>")


if __name__ == "__main__":
    main()
