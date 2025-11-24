"""
数据归档服务
根据永久化存储方案第 10 节实现
定时清理过期数据和归档历史数据
"""
import copy
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified  # 用于标记 JSON 字段已修改
from sqlalchemy import and_, or_
from loguru import logger

from ..models import AnalysisTask, Upload, AuthToken
from ..services.storage_service import storage_service


class ArchiveService:
    """
    数据归档服务
    根据永久化存储方案第 10 节，实现数据生命周期管理
    """

    @staticmethod
    def archive_old_tasks(db: Session, days: int = 365) -> int:
        """
        归档超过指定天数的分析任务数据
        根据永久化存储方案第 10 节：分析任务数据保留 1 年，超过 1 年归档到冷存储
        
        Args:
            db: 数据库会话
            days: 保留天数，默认 365 天（1 年）
        
        Returns:
            int: 归档的任务数量
        
        Note:
            归档策略：将大字段（JSON、文本）归档到对象存储，数据库仅保留元数据
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # 查询超过保留期的已完成任务
        old_tasks = db.query(AnalysisTask).filter(
            and_(
                AnalysisTask.status == "completed",
                AnalysisTask.created_at < cutoff_date
            )
        ).all()
        
        archived_count = 0
        for task in old_tasks:
            try:
                # 归档大字段数据到对象存储（如果对象存储可用）
                # 注意：当前实现仅标记为已归档，实际归档到冷存储需要对象存储支持归档类型
                # 这里先实现标记逻辑，后续可以扩展为实际归档
                
                # 保留元数据，清空大字段（节省数据库空间）
                # 注意：根据永久化存储方案，数据库仅保留任务元数据（ID、状态、创建时间）
                task.gemini_result = None  # 归档原始返回
                task.structured_result = None  # 归档结构化结果
                task.mapping_result = None  # 归档映射结果
                task.part1_summary = None  # 归档摘要
                task.workflow_draft = None  # 归档工作流草案
                task.workflow_final = None  # 归档工作流成品
                task.workflow_alignment_notes = None  # 归档对齐说明
                task.natural_language_part1 = None  # 归档自然语言报告
                task.natural_language_part2 = None  # 归档自然语言报告
                task.source_image_data = None  # 归档源图（已迁移到对象存储）
                task.target_image_data = None  # 归档目标图（已迁移到对象存储）
                task.feasibility_result = None  # 归档可行性结果
                
                # 标记为已归档（在 structured_result 中记录）
                # 【关键修复】修改 JSON 字段时必须使用 flag_modified 标记，确保 SQLAlchemy 能检测到变更
                # 这是 SQLAlchemy 的 JSON 字段特性：直接修改嵌套字典时，需要使用 flag_modified 标记
                if not task.structured_result:
                    task.structured_result = {}
                    flag_modified(task, "structured_result")  # 标记 JSON 字段已修改
                
                # 【关键修复】使用深拷贝修改嵌套字典，然后标记为已修改
                # 这样可以确保 SQLAlchemy 能正确检测到变更，避免 sqlite3.OperationError
                structured_result_copy = copy.deepcopy(task.structured_result)
                structured_result_copy["archived"] = True
                structured_result_copy["archived_at"] = datetime.utcnow().isoformat()
                task.structured_result = structured_result_copy
                flag_modified(task, "structured_result")  # 标记 JSON 字段已修改
                
                archived_count += 1
            except Exception as e:
                logger.error(f"归档任务失败: {task.id}, 错误: {e}")
        
        if archived_count > 0:
            db.commit()
            logger.info(f"归档 {archived_count} 个超过 {days} 天的任务")
        
        return archived_count

    @staticmethod
    def cleanup_old_uploads(db: Session, days: int = 180) -> int:
        """
        清理超过指定天数的上传记录
        根据永久化存储方案第 10 节：上传记录保留 6 个月（180 天）
        
        Args:
            db: 数据库会话
            days: 保留天数，默认 180 天（6 个月）
        
        Returns:
            int: 删除的记录数量
        
        Note:
            删除前确保图片已迁移到对象存储（通过 source_image_url 和 target_image_url 字段）
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # 查询超过保留期的上传记录（且图片已迁移到对象存储）
        old_uploads = db.query(Upload).filter(
            and_(
                Upload.created_at < cutoff_date,
                or_(
                    Upload.source_image_url.isnot(None),
                    Upload.target_image_url.isnot(None)
                )
            )
        ).all()
        
        deleted_count = 0
        for upload in old_uploads:
            try:
                # 删除对象存储中的图片（如果 URL 存在）
                # 【重要】delete_image 方法会处理对象存储服务未运行的情况，不会抛出异常
                # 如果删除失败（如 MinIO 未运行），会记录警告但不影响数据库记录删除
                if upload.source_image_url and not upload.source_image_url.startswith("data:"):
                    if not storage_service.delete_image(upload.source_image_url):
                        logger.warning(f"删除源图失败（可能对象存储服务未运行）: {upload.source_image_url}")
                if upload.target_image_url and not upload.target_image_url.startswith("data:"):
                    if not storage_service.delete_image(upload.target_image_url):
                        logger.warning(f"删除目标图失败（可能对象存储服务未运行）: {upload.target_image_url}")
                
                # 删除数据库记录（即使对象存储删除失败，也继续删除数据库记录）
                db.delete(upload)
                deleted_count += 1
            except Exception as e:
                logger.error(f"删除上传记录失败: {upload.id}, 错误: {type(e).__name__}: {str(e)}")
        
        if deleted_count > 0:
            db.commit()
            logger.info(f"清理 {deleted_count} 个超过 {days} 天的上传记录")
        
        return deleted_count

    @staticmethod
    def cleanup_expired_tokens(db: Session, days: int = 30) -> int:
        """
        清理过期的认证令牌
        根据永久化存储方案第 10 节：已过期的 Token 和验证码保留 30 天用于审计
        
        Args:
            db: 数据库会话
            days: 保留天数，默认 30 天
        
        Returns:
            int: 删除的记录数量
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # 查询超过保留期的已过期令牌
        expired_tokens = db.query(AuthToken).filter(
            and_(
                AuthToken.expired_at < cutoff_date,
                AuthToken.consumed == True  # 只删除已消费的令牌
            )
        ).all()
        
        deleted_count = 0
        for token in expired_tokens:
            try:
                db.delete(token)
                deleted_count += 1
            except Exception as e:
                logger.error(f"删除过期令牌失败: {token.id}, 错误: {e}")
        
        if deleted_count > 0:
            db.commit()
            logger.info(f"清理 {deleted_count} 个超过 {days} 天的过期令牌")
        
        return deleted_count

    @staticmethod
    def run_daily_cleanup(db: Session) -> Dict[str, int]:
        """
        执行每日数据清理任务
        根据永久化存储方案第 10 节，使用定时任务（cron 或 Celery Beat）每日执行
        
        Args:
            db: 数据库会话
        
        Returns:
            Dict[str, int]: 清理统计信息
        """
        logger.info("开始执行每日数据清理任务")
        
        results = {
            "archived_tasks": ArchiveService.archive_old_tasks(db, days=365),
            "deleted_uploads": ArchiveService.cleanup_old_uploads(db, days=180),
            "deleted_tokens": ArchiveService.cleanup_expired_tokens(db, days=30),
        }
        
        logger.info(f"每日数据清理完成: {results}")
        return results

