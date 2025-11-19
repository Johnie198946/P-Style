"""
上传路由 - 图片上传接口
根据开发方案第 18 节实现
提供源图片和目标图片的上传功能，并计算相似度
"""
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import base64
import uuid
from loguru import logger

from ..db import get_db
from ..middleware.auth import get_current_user, security
from ..services.upload_service import UploadService
from ..services.storage_service import storage_service
from ..utils.response import success_response, error_response
from ..constants.error_codes import ErrorCode

router = APIRouter(prefix="/api/photos", tags=["upload"])

# 初始化上传服务（单例模式）
upload_service = UploadService()  # 上传服务（处理图片上传和相似度计算）


@router.post("/upload")
async def upload_photos(
    sourceImage: UploadFile = File(...),
    targetImage: UploadFile | None = File(None),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    上传图片接口
    根据开发方案第 18 节实现，支持源图片和目标图片上传
    
    Args:
        sourceImage: 源图片文件（必填）
        targetImage: 目标图片文件（可选）
        credentials: JWT Token（Bearer）
        db: 数据库会话
    
    Returns:
        {
            "code": 0,
            "message": "ok",
            "data": {
                "uploadId": "uuid",
                "source_image_url": "data:image/jpeg;base64,...",
                "target_image_url": "data:image/jpeg;base64,...",
                "similarity_score": 0.85
            }
        }
    
    Note:
        - 需要登录才能上传
        - 如果提供了目标图片，会计算两张图片的相似度
        - 图片以 base64 格式存储在数据库中（后续可迁移到对象存储）
    """
    # 注意：get_current_user 在认证失败时会抛出 HTTPException（通过 error_response 创建）
    # 这个异常应该直接传播，不应该被捕获并转换为其他错误
    # 因此，我们需要先调用 get_current_user，如果抛出 HTTPException，让它正常传播
    current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)
    
    try:
        # 读取图片数据
        source_data = await sourceImage.read()
        target_data = None
        if targetImage:
            target_data = await targetImage.read()
        
        # 生成上传记录 ID（用于对象存储路径）
        upload_id = str(uuid.uuid4())
        
        # 上传到对象存储（根据永久化存储方案第 8 节）
        # 注意：如果对象存储未配置，会回退到本地文件系统
        source_image_url = None
        target_image_url = None
        source_base64 = None
        target_base64 = None
        
        try:
            # 尝试上传到对象存储（添加超时控制，防止阻塞）
            # 注意：如果对象存储连接失败或超时，会抛出异常，回退到 Base64 存储
            source_image_url = storage_service.upload_image(
                source_data,
                user_id=current_user.id,
                task_id=upload_id,
                image_type="source",
                content_type=sourceImage.content_type or "image/jpeg"
            )
            logger.info(f"源图上传到对象存储成功: {source_image_url}")
            source_base64 = None  # 对象存储成功，不需要 Base64
        except Exception as e:
            logger.warning(f"对象存储上传失败，回退到 Base64: {e}")
            # 回退到 Base64 存储（兼容模式）
            source_base64 = base64.b64encode(source_data).decode("utf-8")
            source_image_url = f"data:{sourceImage.content_type};base64,{source_base64}"
        
        if target_data:
            try:
                # 尝试上传到对象存储（添加超时控制，防止阻塞）
                # 注意：如果对象存储连接失败或超时，会抛出异常，回退到 Base64 存储
                target_image_url = storage_service.upload_image(
                    target_data,
                    user_id=current_user.id,
                    task_id=upload_id,
                    image_type="target",
                    content_type=targetImage.content_type or "image/jpeg"
                )
                logger.info(f"目标图上传到对象存储成功: {target_image_url}")
                target_base64 = None  # 对象存储成功，不需要 Base64
            except Exception as e:
                logger.warning(f"对象存储上传失败，回退到 Base64: {e}")
                # 回退到 Base64 存储（兼容模式）
                target_base64 = base64.b64encode(target_data).decode("utf-8")
                target_image_url = f"data:{targetImage.content_type};base64,{target_base64}"
        
        # 计算相似度（使用 Base64 数据，如果对象存储上传成功则使用 Base64 作为备用）
        similarity = 0.0
        if target_data:
            # 优先使用 Base64 数据计算相似度（如果对象存储上传成功，Base64 可能为 None，使用 data URL）
            source_for_similarity = source_image_url  # 使用 URL 或 Base64 data URL
            target_for_similarity = target_image_url  # 使用 URL 或 Base64 data URL
            similarity = upload_service.calculate_similarity(source_for_similarity, target_for_similarity)

        # 创建上传记录（同时保存 URL 和 Base64，支持渐进式迁移）
        upload = upload_service.create_upload(
            db, current_user.id, 
            source_image_data=source_base64,  # Base64（兼容模式）
            target_image_data=target_base64,  # Base64（兼容模式）
            source_image_url=source_image_url,  # 对象存储 URL
            target_image_url=target_image_url,  # 对象存储 URL
            upload_id=upload_id
        )

        return success_response(
            data={
                "uploadId": upload.id,
                "source_image_url": source_image_url,  # 优先返回对象存储 URL
                "target_image_url": target_image_url,  # 优先返回对象存储 URL
                "similarity_score": similarity,
            },
        )
    except HTTPException:
        # HTTPException（包括认证错误）应该直接传播，不进行转换
        # 这样认证错误（401）可以正确返回，而不是被转换为 500 错误
        raise
    except Exception as e:
        # 其他异常（如数据库错误、文件读取错误等）才转换为上传失败错误
        logger.error(f"上传失败: {e}")
        raise error_response(ErrorCode.UPLOAD_FAILED, f"上传失败: {str(e)}")
