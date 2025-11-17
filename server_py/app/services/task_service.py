"""
任务服务 - 管理分析任务
"""
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from loguru import logger

from ..models import AnalysisTask


class TaskService:
    """任务服务"""

    @staticmethod
    def create_task(
        db: Session,
        user_id: Optional[int],
        source_image_data: Optional[str] = None,
        target_image_data: Optional[str] = None,
    ) -> AnalysisTask:
        """创建分析任务"""
        task_id = str(uuid.uuid4())
        task = AnalysisTask(
            id=task_id,
            user_id=user_id,
            source_image_data=source_image_data,
            target_image_data=target_image_data,
            status="pending",
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def get_task(db: Session, task_id: str) -> Optional[AnalysisTask]:
        """获取任务"""
        return db.query(AnalysisTask).filter(AnalysisTask.id == task_id).first()

    @staticmethod
    def update_task_part1(
        db: Session,
        task_id: str,
        gemini_result: Dict[str, Any],
        structured_result: Dict[str, Any],
        natural_language: str,
        part1_summary: str,
        workflow_draft: str,
        feasibility_result: Optional[Dict[str, Any]] = None,
    ):
        """更新任务 Part1 结果"""
        task = db.query(AnalysisTask).filter(AnalysisTask.id == task_id).first()
        if task:
            task.gemini_result = gemini_result
            task.structured_result = structured_result
            task.natural_language_part1 = natural_language
            task.part1_summary = part1_summary
            task.workflow_draft = workflow_draft
            if feasibility_result:
                task.feasibility_result = feasibility_result
            task.status = "part1_completed"
            task.updated_at = datetime.utcnow()
            db.commit()

    @staticmethod
    def update_task_part2(
        db: Session,
        task_id: str,
        gemini_result: Dict[str, Any],
        structured_result: Dict[str, Any],
        natural_language: str,
        workflow_final: str,
        workflow_alignment_notes: str,
    ):
        """更新任务 Part2 结果"""
        task = db.query(AnalysisTask).filter(AnalysisTask.id == task_id).first()
        if task:
            # 合并 gemini_result 和 structured_result
            if task.gemini_result:
                task.gemini_result.update(gemini_result)
            else:
                task.gemini_result = gemini_result

            if task.structured_result:
                # 合并 structured_result
                for key, value in structured_result.items():
                    if key == "sections":
                        if "sections" not in task.structured_result:
                            task.structured_result["sections"] = {}
                        task.structured_result["sections"].update(value)
                    else:
                        task.structured_result[key] = value
            else:
                task.structured_result = structured_result

            task.natural_language_part2 = natural_language
            task.workflow_final = workflow_final
            task.workflow_alignment_notes = workflow_alignment_notes
            task.part2_completed = True
            task.status = "completed"
            task.updated_at = datetime.utcnow()
            db.commit()

    @staticmethod
    def update_preview_image(db: Session, task_id: str, preview_image_url: str):
        """更新预览图 URL"""
        task = db.query(AnalysisTask).filter(AnalysisTask.id == task_id).first()
        if task:
            if not task.structured_result:
                task.structured_result = {}
            if "sections" not in task.structured_result:
                task.structured_result["sections"] = {}
            task.structured_result["sections"]["preview_image_url"] = preview_image_url
            task.updated_at = datetime.utcnow()
            db.commit()

