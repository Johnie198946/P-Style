"""
任务服务 - 管理分析任务
"""
import uuid
import json
import copy
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified  # 用于标记 JSON 字段已修改
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
        """
        更新任务 Part1 结果
        
        注意：对于 JSON 字段（gemini_result、structured_result、feasibility_result），
        直接赋值时 SQLAlchemy 会自动检测到变更，但为了保险起见，也使用 flag_modified 标记
        """
        task = db.query(AnalysisTask).filter(AnalysisTask.id == task_id).first()
        if task:
            task.gemini_result = gemini_result
            flag_modified(task, "gemini_result")  # 标记 JSON 字段已修改
            
            task.structured_result = structured_result
            flag_modified(task, "structured_result")  # 标记 JSON 字段已修改
            
            task.natural_language_part1 = natural_language
            task.part1_summary = part1_summary
            task.workflow_draft = workflow_draft
            if feasibility_result:
                task.feasibility_result = feasibility_result
                flag_modified(task, "feasibility_result")  # 标记 JSON 字段已修改
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
        """
        更新任务 Part2 结果
        
        根据开发方案，Part2 结果应合并到现有的 structured_result 中，而不是覆盖
        合并逻辑：
        1. gemini_result：使用 update 合并（保留 Part1 的数据，添加 Part2 的数据）
        2. structured_result.sections：使用 update 合并（保留 Part1 的 sections，添加 Part2 的 sections）
        3. 其他字段：直接覆盖（如 protocolVersion、stage、meta 等）
        """
        task = db.query(AnalysisTask).filter(AnalysisTask.id == task_id).first()
        if task:
            # 【日志记录】记录合并前的状态
            logger.info(f"【update_task_part2】开始更新任务, taskId={task_id}")
            if task.structured_result:
                existing_sections_keys = list(task.structured_result.get("sections", {}).keys())
                logger.info(f"【update_task_part2】合并前 existing sections keys: {existing_sections_keys}, taskId={task_id}")
            else:
                logger.info(f"【update_task_part2】合并前 task.structured_result 为空, taskId={task_id}")
            
            # 【日志记录】记录 Part2 structured_result 的结构
            if structured_result:
                part2_sections_keys = list(structured_result.get("sections", {}).keys())
                logger.info(f"【update_task_part2】Part2 structured_result sections keys: {part2_sections_keys}, taskId={task_id}")
                logger.debug(f"【update_task_part2】Part2 structured_result keys: {list(structured_result.keys())}, taskId={task_id}")
            else:
                logger.warning(f"【update_task_part2】Part2 structured_result 为空, taskId={task_id}")
            
            # 合并 gemini_result 和 structured_result
            if task.gemini_result:
                # 【关键修复】对于 JSON 字段，直接修改嵌套字典时，需要使用深拷贝和 flag_modified
                merged_gemini_result = copy.deepcopy(task.gemini_result)
                merged_gemini_result.update(gemini_result)
                task.gemini_result = merged_gemini_result
                flag_modified(task, "gemini_result")  # 标记 JSON 字段已修改
            else:
                task.gemini_result = gemini_result
                flag_modified(task, "gemini_result")  # 标记 JSON 字段已修改

            if task.structured_result:
                # 合并 structured_result
                for key, value in structured_result.items():
                    if key == "sections":
                        if "sections" not in task.structured_result:
                            task.structured_result["sections"] = {}
                        
                        # 【日志记录】记录合并前的 sections 状态
                        before_merge_keys = list(task.structured_result["sections"].keys())
                        logger.info(f"【update_task_part2】合并 sections 前: {before_merge_keys}, taskId={task_id}")
                        logger.info(f"【update_task_part2】要合并的 Part2 sections keys: {list(value.keys()) if isinstance(value, dict) else 'not dict'}, taskId={task_id}")
                        
                        # 【重要】记录要合并的 Part2 sections 的详细内容（用于调试）
                        if isinstance(value, dict):
                            for section_key, section_value in value.items():
                                if isinstance(section_value, dict):
                                    has_structured = bool(section_value.get("structured"))
                                    structured_keys = list(section_value.get("structured", {}).keys()) if section_value.get("structured") else []
                                    logger.debug(f"【update_task_part2】要合并的 Part2 section '{section_key}': has structured = {has_structured}, structured keys = {structured_keys}, taskId={task_id}")
                        
                        # 【关键修复】合并 sections（使用深拷贝，避免 SQLAlchemy 无法检测到变更）
                        # 对于 JSON 字段，直接修改嵌套字典时，SQLAlchemy 可能无法检测到变更
                        # 因此需要先深拷贝，然后更新，最后标记为已修改
                        merged_sections = copy.deepcopy(task.structured_result["sections"])
                        merged_sections.update(value)
                        task.structured_result["sections"] = merged_sections
                        
                        # 【关键修复】标记 JSON 字段已修改，确保 SQLAlchemy 能检测到变更
                        # 这是 SQLAlchemy 的 JSON 字段特性：直接修改嵌套字典时，需要使用 flag_modified 标记
                        flag_modified(task, "structured_result")
                        
                        # 【日志记录】记录合并后的 sections 状态
                        after_merge_keys = list(task.structured_result["sections"].keys())
                        logger.info(f"【update_task_part2】合并 sections 后: {after_merge_keys}, taskId={task_id}")
                        
                        # 【详细日志】检查 lightroom 和 photoshop 是否存在
                        if "lightroom" in task.structured_result["sections"]:
                            lightroom_section = task.structured_result["sections"]["lightroom"]
                            lightroom_structured = lightroom_section.get("structured", {}) if isinstance(lightroom_section, dict) else {}
                            logger.info(f"【update_task_part2】lightroom section 已合并: has structured = {bool(lightroom_structured)}, structured type = {type(lightroom_structured)}, structured keys = {list(lightroom_structured.keys()) if isinstance(lightroom_structured, dict) else 'not dict'}, panels count = {len(lightroom_structured.get('panels', [])) if isinstance(lightroom_structured, dict) else 0}, taskId={task_id}")
                            # 【详细日志】记录 lightroom section 的完整结构（用于调试）
                            if isinstance(lightroom_section, dict):
                                logger.debug(f"【update_task_part2】lightroom section 完整结构: {json.dumps(lightroom_section, ensure_ascii=False)[:500]}..., taskId={task_id}")
                        else:
                            logger.warning(f"【update_task_part2】lightroom section 未找到, taskId={task_id}")
                        
                        if "photoshop" in task.structured_result["sections"]:
                            photoshop_section = task.structured_result["sections"]["photoshop"]
                            photoshop_structured = photoshop_section.get("structured", {}) if isinstance(photoshop_section, dict) else {}
                            logger.info(f"【update_task_part2】photoshop section 已合并: has structured = {bool(photoshop_structured)}, structured type = {type(photoshop_structured)}, structured keys = {list(photoshop_structured.keys()) if isinstance(photoshop_structured, dict) else 'not dict'}, steps count = {len(photoshop_structured.get('steps', [])) if isinstance(photoshop_structured, dict) else 0}, taskId={task_id}")
                            # 【详细日志】记录 photoshop section 的完整结构（用于调试）
                            if isinstance(photoshop_section, dict):
                                logger.debug(f"【update_task_part2】photoshop section 完整结构: {json.dumps(photoshop_section, ensure_ascii=False)[:500]}..., taskId={task_id}")
                        else:
                            logger.warning(f"【update_task_part2】photoshop section 未找到, taskId={task_id}")
                        
                        if "color" in task.structured_result["sections"]:
                            color_section = task.structured_result["sections"]["color"]
                            color_structured = color_section.get("structured", {}) if isinstance(color_section, dict) else {}
                            logger.info(f"【update_task_part2】color section 已合并: has structured = {bool(color_structured)}, structured type = {type(color_structured)}, structured keys = {list(color_structured.keys()) if isinstance(color_structured, dict) else 'not dict'}, taskId={task_id}")
                            # 【详细日志】记录 color section 的完整结构（用于调试）
                            if isinstance(color_section, dict):
                                logger.debug(f"【update_task_part2】color section 完整结构: {json.dumps(color_section, ensure_ascii=False)[:500]}..., taskId={task_id}")
                        else:
                            logger.warning(f"【update_task_part2】color section 未找到, taskId={task_id}")
                    else:
                        task.structured_result[key] = value
                        # 【关键修复】标记 JSON 字段已修改
                        flag_modified(task, "structured_result")
            else:
                task.structured_result = structured_result
                # 【关键修复】标记 JSON 字段已修改（直接赋值时也需要标记）
                flag_modified(task, "structured_result")
                # 【日志记录】如果 task.structured_result 为空，直接赋值
                if structured_result and "sections" in structured_result:
                    sections_keys = list(structured_result["sections"].keys())
                    logger.info(f"【update_task_part2】直接赋值 structured_result, sections keys: {sections_keys}, taskId={task_id}")

            task.natural_language_part2 = natural_language
            task.workflow_final = workflow_final
            task.workflow_alignment_notes = workflow_alignment_notes
            task.part2_completed = True
            task.status = "completed"
            task.updated_at = datetime.utcnow()
            db.commit()
            
            # 【日志记录】记录合并后的最终状态
            if task.structured_result and "sections" in task.structured_result:
                final_sections_keys = list(task.structured_result["sections"].keys())
                logger.info(f"【update_task_part2】数据库更新完成, 最终 sections keys: {final_sections_keys}, taskId={task_id}")
            else:
                logger.warning(f"【update_task_part2】数据库更新完成, 但 sections 为空, taskId={task_id}")

    @staticmethod
    def update_preview_image(db: Session, task_id: str, preview_image_url: str):
        """
        更新预览图 URL
        
        根据开发方案，预览图 URL 存储在 structured_result.sections.preview_image_url 中
        注意：修改 JSON 字段时必须使用 flag_modified 标记，确保 SQLAlchemy 能检测到变更
        
        Args:
            db: 数据库会话
            task_id: 任务 ID
            preview_image_url: 预览图 URL（Base64 字符串或对象存储 URL）
        """
        task = db.query(AnalysisTask).filter(AnalysisTask.id == task_id).first()
        if task:
            # 【关键修复】对于 JSON 字段，直接修改嵌套字典时，需要使用深拷贝和 flag_modified
            # 这是 SQLAlchemy 的 JSON 字段特性：直接修改嵌套字典时，需要使用 flag_modified 标记
            if not task.structured_result:
                task.structured_result = {}
                flag_modified(task, "structured_result")  # 标记 JSON 字段已修改
            if "sections" not in task.structured_result:
                task.structured_result["sections"] = {}
                flag_modified(task, "structured_result")  # 标记 JSON 字段已修改
            
            # 【关键修复】使用深拷贝修改嵌套字典，然后标记为已修改
            # 这样可以确保 SQLAlchemy 能正确检测到变更，避免 sqlite3.OperationError
            structured_result_copy = copy.deepcopy(task.structured_result)
            structured_result_copy["sections"]["preview_image_url"] = preview_image_url
            task.structured_result = structured_result_copy
            flag_modified(task, "structured_result")  # 标记 JSON 字段已修改
            
            task.updated_at = datetime.utcnow()
            db.commit()
            logger.info(f"【update_preview_image】预览图 URL 已更新: taskId={task_id}, URL 长度={len(preview_image_url)} 字符")

    @staticmethod
    def update_task_status(db: Session, task_id: str, status: str, status_reason: Optional[str] = None):
        """
        更新任务状态和原因
        
        用于后台任务失败时更新任务状态，便于前端轮询时获取失败信息
        
        Args:
            db: 数据库会话
            task_id: 任务 ID
            status: 任务状态（"pending", "part1_completed", "processing", "completed", "failed"）
            status_reason: 状态原因（可选，通常用于失败时记录错误信息）
               注意：如果任务状态为 "failed"，建议提供详细的失败原因，便于前端显示和调试
        """
        task = db.query(AnalysisTask).filter(AnalysisTask.id == task_id).first()
        if task:
            task.status = status
            # 【修复】保存 status_reason 到数据库（AnalysisTask 模型已添加 status_reason 字段）
            if status_reason:
                task.status_reason = status_reason
            elif status == "failed" and not status_reason:
                # 如果状态是 failed 但没有提供原因，设置默认原因
                task.status_reason = "任务执行失败，具体原因请查看日志"
            elif status != "failed":
                # 如果状态不是 failed，清空 status_reason（避免显示旧的失败原因）
                task.status_reason = None
            task.updated_at = datetime.utcnow()
            db.commit()
            logger.info(f"任务状态已更新: taskId={task_id}, status={status}, reason={status_reason if status_reason else 'N/A'}")

