#!/bin/bash
# 查看最近一个任务的 Part1 和 Part2 输出

cd "$(dirname "$0")"
python3 -c "
import sys
from pathlib import Path
sys.path.insert(0, str(Path('.').absolute()))
from app.models import AnalysisTask
from app.config import get_settings
from sqlalchemy import create_engine, desc
from sqlalchemy.orm import sessionmaker
import json

settings = get_settings()
engine = create_engine(settings.DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

task = session.query(AnalysisTask).filter(AnalysisTask.status == 'completed').order_by(desc(AnalysisTask.created_at)).first()

if not task:
    print('❌ 没有找到已完成的任务')
    sys.exit(1)

gemini_result = task.gemini_result if isinstance(task.gemini_result, dict) else json.loads(task.gemini_result) if task.gemini_result else {}

print('=' * 100)
print(f'📋 最近的任务: {task.id}')
print(f'创建时间: {task.created_at.strftime(\"%Y-%m-%d %H:%M:%S\") if task.created_at else \"N/A\"}')
print('=' * 100)

print('\n' + '=' * 100)
print('📋 Part1 输出')
print('=' * 100)
part1 = gemini_result.get('part1') or gemini_result.get('phase_1_extraction') or {}
if part1:
    print(json.dumps(part1, ensure_ascii=False, indent=2))
else:
    print('⚠️  Part1 数据不存在')

print('\n' + '=' * 100)
print('📋 Part2 输出 (lightroom_workflow)')
print('=' * 100)
part2 = gemini_result.get('lightroom_workflow') or {}
if part2:
    print(json.dumps(part2, ensure_ascii=False, indent=2))
else:
    print('⚠️  Part2 数据不存在')

session.close()
" 2>&1 | grep -v "INFO\|DEBUG\|WARNING\|🚀\|正在加载\|ERROR.*MinIO"

