#!/bin/bash

# 检查 LR 面板数据流问题的诊断脚本

echo "=========================================="
echo "🔍 LR 面板数据流诊断"
echo "=========================================="
echo ""

# 1. 检查后端格式化日志
echo "📋 步骤 1: 检查后端格式化日志"
echo "----------------------------------------"
echo "最近一次 _format_lightroom 提取的参数:"
grep "【_format_lightroom】提取参数" /tmp/backend_8081.log 2>/dev/null | tail -n 15 | head -n 15 || echo "⚠️ 未找到日志文件或没有相关日志"
echo ""

echo "basic_dict 构建结果:"
grep "【_format_lightroom】✅ 构建 basic 字段完成" /tmp/backend_8081.log 2>/dev/null | tail -n 1 || echo "⚠️ 未找到日志"
echo ""

# 2. 检查数据库中的实际数据
echo "📋 步骤 2: 检查数据库中的实际数据"
echo "----------------------------------------"
cd "$(dirname "$0")"
python3 << 'PYTHON_SCRIPT'
import sys
from pathlib import Path
sys.path.insert(0, str(Path('.').absolute()))
from app.models import AnalysisTask
from app.config import get_settings
from sqlalchemy import create_engine, desc
from sqlalchemy.orm import sessionmaker
import json

try:
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    task = session.query(AnalysisTask).filter(AnalysisTask.status == 'completed').order_by(desc(AnalysisTask.created_at)).first()

    if task and task.structured_result:
        structured = task.structured_result if isinstance(task.structured_result, dict) else json.loads(task.structured_result)
        lightroom = structured.get('sections', {}).get('lightroom', {})
        lightroom_structured = lightroom.get('structured', {})
        basic = lightroom_structured.get('basic', {})
        
        print(f"✅ 找到任务: {task.id[:20]}...")
        print(f"✅ lightroom.structured.basic 存在: {bool(basic)}")
        print(f"✅ 参数数量: {len(basic)}")
        print(f"✅ 参数列表: {list(basic.keys())}")
        print("")
        print("📋 关键参数值:")
        for key in ['temp', 'tint', 'exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks']:
            if key in basic:
                param = basic[key]
                value = param.get('value', 'N/A')
                reason = param.get('reason', 'N/A')[:50] if param.get('reason') else 'N/A'
                print(f"  {key:12} = {value:8} | {reason}")
            else:
                print(f"  {key:12} = ❌ 缺失")
    else:
        print("❌ 没有找到已完成的任务或 structured_result 为空")

    session.close()
except Exception as e:
    print(f"❌ 错误: {e}")

PYTHON_SCRIPT

echo ""
echo "=========================================="
echo "✅ 诊断完成"
echo "=========================================="
echo ""
echo "💡 提示:"
echo "1. 如果后端日志显示参数已提取，但数据库中没有，可能是格式化失败"
echo "2. 如果数据库中有数据，但前端显示不对，可能是前端 dataAdapter 问题"
echo "3. 检查浏览器 Console 中的 [dataAdapter] 日志，查看前端转换过程"

