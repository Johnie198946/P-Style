"""
上传服务 - 处理图片上传和相似度计算
根据开发方案第 18 节和永久化存储方案实现
当前使用 Base64 存储，后续应迁移到对象存储（使用 source_image_url 和 target_image_url 字段）
"""
import uuid
import base64
import io
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from loguru import logger
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

from ..models import Upload


def extract_exif_from_image_data(image_data: bytes) -> Dict[str, Any]:
    """
    从图片二进制数据中提取 EXIF 元数据
    
    【功能说明】
    提取用户上传图片的拍摄参数，包括 ISO、光圈、快门、焦距、相机型号等
    这些数据用于在 Lightroom 面板中显示图片的原始拍摄信息
    
    Args:
        image_data: 图片的二进制数据
    
    Returns:
        Dict: 包含 EXIF 信息的字典，主要字段：
            - iso: ISO 感光度（如 800）
            - aperture: 光圈值（如 "f/2.8"）
            - shutter_speed: 快门速度（如 "1/125"）
            - focal_length: 焦距（如 "50mm"）
            - camera_make: 相机品牌（如 "Sony"）
            - camera_model: 相机型号（如 "A7M4"）
            - lens: 镜头型号
            - date_taken: 拍摄日期时间
            - width: 图片宽度
            - height: 图片高度
    
    Note:
        - 如果图片没有 EXIF 数据（如截图、网络图片），返回空字典
        - JPEG/TIFF 格式通常包含完整 EXIF，PNG 格式通常没有
    """
    exif_info = {}
    
    try:
        # 使用 PIL 打开图片
        image = Image.open(io.BytesIO(image_data))
        
        # 获取图片基本信息（即使没有 EXIF 也能获取）
        exif_info["width"] = image.width
        exif_info["height"] = image.height
        exif_info["format"] = image.format
        
        # 尝试获取 EXIF 数据
        exif_data = image._getexif()
        
        if not exif_data:
            logger.info("[EXIF] 图片没有 EXIF 数据")
            return exif_info
        
        # 解析 EXIF 标签
        for tag_id, value in exif_data.items():
            tag_name = TAGS.get(tag_id, tag_id)
            
            # 【ISO 感光度】
            if tag_name == "ISOSpeedRatings":
                # ISO 可能是单个值或元组
                exif_info["iso"] = value[0] if isinstance(value, tuple) else value
            
            # 【光圈值】FNumber
            elif tag_name == "FNumber":
                if hasattr(value, 'numerator') and hasattr(value, 'denominator'):
                    # EXIF 中光圈值通常是分数形式
                    aperture = float(value.numerator) / float(value.denominator) if value.denominator else 0
                    exif_info["aperture"] = f"f/{aperture:.1f}"
                    exif_info["aperture_value"] = aperture
                elif isinstance(value, (int, float)):
                    exif_info["aperture"] = f"f/{value:.1f}"
                    exif_info["aperture_value"] = value
            
            # 【快门速度】ExposureTime
            elif tag_name == "ExposureTime":
                if hasattr(value, 'numerator') and hasattr(value, 'denominator'):
                    numerator = value.numerator
                    denominator = value.denominator
                    if numerator == 1:
                        exif_info["shutter_speed"] = f"1/{denominator}"
                    elif denominator == 1:
                        exif_info["shutter_speed"] = f"{numerator}s"
                    else:
                        exif_info["shutter_speed"] = f"{numerator}/{denominator}"
                elif isinstance(value, (int, float)):
                    if value < 1:
                        exif_info["shutter_speed"] = f"1/{int(1/value)}"
                    else:
                        exif_info["shutter_speed"] = f"{value}s"
            
            # 【焦距】FocalLength
            elif tag_name == "FocalLength":
                if hasattr(value, 'numerator') and hasattr(value, 'denominator'):
                    focal = float(value.numerator) / float(value.denominator) if value.denominator else 0
                    exif_info["focal_length"] = f"{focal:.0f}mm"
                    exif_info["focal_length_value"] = focal
                elif isinstance(value, (int, float)):
                    exif_info["focal_length"] = f"{value:.0f}mm"
                    exif_info["focal_length_value"] = value
            
            # 【相机品牌】Make
            elif tag_name == "Make":
                exif_info["camera_make"] = str(value).strip()
            
            # 【相机型号】Model
            elif tag_name == "Model":
                exif_info["camera_model"] = str(value).strip()
            
            # 【镜头型号】LensModel
            elif tag_name == "LensModel":
                exif_info["lens"] = str(value).strip()
            
            # 【拍摄日期】DateTimeOriginal
            elif tag_name == "DateTimeOriginal":
                exif_info["date_taken"] = str(value)
            
            # 【曝光补偿】ExposureBiasValue
            elif tag_name == "ExposureBiasValue":
                if hasattr(value, 'numerator') and hasattr(value, 'denominator'):
                    ev = float(value.numerator) / float(value.denominator) if value.denominator else 0
                    exif_info["exposure_compensation"] = f"{ev:+.1f} EV"
                elif isinstance(value, (int, float)):
                    exif_info["exposure_compensation"] = f"{value:+.1f} EV"
            
            # 【白平衡】WhiteBalance
            elif tag_name == "WhiteBalance":
                wb_modes = {0: "Auto", 1: "Manual"}
                exif_info["white_balance_mode"] = wb_modes.get(value, str(value))
        
        logger.info(f"[EXIF] 成功提取 EXIF 数据: ISO={exif_info.get('iso')}, 光圈={exif_info.get('aperture')}, 快门={exif_info.get('shutter_speed')}")
        
    except Exception as e:
        logger.warning(f"[EXIF] 提取 EXIF 数据失败: {type(e).__name__}: {str(e)}")
        # 返回已提取的基本信息（即使 EXIF 提取失败）
    
    return exif_info


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

