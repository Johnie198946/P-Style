"""
上传服务 - 处理图片上传和相似度计算
根据开发方案第 18 节和永久化存储方案实现
当前使用 Base64 存储，后续应迁移到对象存储（使用 source_image_url 和 target_image_url 字段）
"""
import uuid
import base64
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from loguru import logger

from ..models import Upload


class UploadService:
    """
    上传服务
    处理图片上传、相似度计算和上传记录管理
    """

    @staticmethod
    def create_upload(
        db: Session,
        user_id: Optional[int],
        source_image_data: Optional[str] = None,
        target_image_data: Optional[str] = None,
        source_image_url: Optional[str] = None,
        target_image_url: Optional[str] = None,
        upload_id: Optional[str] = None,
    ) -> Upload:
        """
        创建上传记录
        根据永久化存储方案第 8 节，支持同时存储 Base64 和对象存储 URL（渐进式迁移）
        
        Args:
            db: 数据库会话
            user_id: 用户 ID（可为 None 支持匿名上传）
            source_image_data: 源图 Base64 数据（兼容模式，对象存储失败时使用）
            target_image_data: 目标图 Base64 数据（兼容模式，对象存储失败时使用）
            source_image_url: 源图对象存储 URL（优先使用）
            target_image_url: 目标图对象存储 URL（优先使用）
            upload_id: 上传记录 ID（可选，如果不提供则自动生成）
        
        Returns:
            Upload: 创建的上传记录对象
        
        Note:
            根据永久化存储方案，优先使用对象存储 URL，Base64 作为兼容模式
            前端优先使用 source_image_url 和 target_image_url 字段
        """
        if not upload_id:
            upload_id = str(uuid.uuid4())  # 生成 UUID 作为上传记录 ID
        
        upload = Upload(
            id=upload_id,
            user_id=user_id,
            source_image_data=source_image_data,  # Base64（兼容模式）
            target_image_data=target_image_data,  # Base64（兼容模式）
            source_image_url=source_image_url,  # 对象存储 URL（优先）
            target_image_url=target_image_url,  # 对象存储 URL（优先）
            status="uploaded",  # 初始状态为 uploaded
        )
        db.add(upload)
        db.commit()
        db.refresh(upload)
        return upload

    @staticmethod
    def calculate_similarity(source_data: str, target_data: str) -> float:
        """
        计算图片相似度（简化实现）
        
        Args:
            source_data: 源图数据（Base64 或 data URL）
            target_data: 目标图数据（Base64 或 data URL）
        
        Returns:
            float: 相似度分数（0.00-100.00）
        
        Note:
            TODO: 使用更精确的相似度算法（如感知哈希、SSIM）
            当前简化返回固定值，后续应实现真实的相似度计算
        """
        # TODO: 使用更精确的相似度算法（如感知哈希、SSIM）
        # 这里简化返回一个固定值
        return 75.0  # 示例值

    @staticmethod
    def link_to_task(db: Session, upload_id: str, task_id: str):
        """
        将上传记录关联到分析任务
        
        Args:
            db: 数据库会话
            upload_id: 上传记录 ID
            task_id: 分析任务 ID
        
        Note:
            当上传记录被关联到分析任务后，状态更新为 "linked"
        """
        upload = db.query(Upload).filter(Upload.id == upload_id).first()
        if upload:
            upload.analysis_task_id = task_id  # 关联分析任务
            upload.status = "linked"  # 更新状态为已关联
            db.commit()

