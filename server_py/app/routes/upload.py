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
from ..services.upload_service import UploadService, extract_exif_from_image_data
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
    # 【日志记录】记录函数入口，便于追踪问题
    logger.info(f"[上传接口] 收到上传请求，用户ID: {credentials.credentials[:10]}...")
    
    # 注意：get_current_user 在认证失败时会抛出 HTTPException（通过 error_response 创建）
    # 这个异常应该直接传播，不应该被捕获并转换为其他错误
    # 因此，我们需要先调用 get_current_user，如果抛出 HTTPException，让它正常传播
    current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)
    logger.info(f"[上传接口] 用户认证成功，用户ID: {current_user.id}")
    
    try:
        # 【日志记录】开始读取图片数据
        logger.info(f"[上传接口] 开始读取源图数据，文件名: {sourceImage.filename}, 大小: {sourceImage.size if hasattr(sourceImage, 'size') else '未知'}")
        source_data = await sourceImage.read()
        logger.info(f"[上传接口] 源图数据读取成功，大小: {len(source_data)} 字节")
        
        # 【新增】提取源图（参考图）的 EXIF 数据
        source_exif = extract_exif_from_image_data(source_data)
        logger.info(f"[上传接口] 源图 EXIF 提取完成: {source_exif}")
        
        target_data = None
        target_exif = {}  # 【新增】用户图的 EXIF 数据
        if targetImage:
            logger.info(f"[上传接口] 开始读取目标图数据，文件名: {targetImage.filename}, 大小: {targetImage.size if hasattr(targetImage, 'size') else '未知'}")
            target_data = await targetImage.read()
            logger.info(f"[上传接口] 目标图数据读取成功，大小: {len(target_data)} 字节")
            
            # 【新增】提取用户图的 EXIF 数据（用于显示 ISO、光圈等拍摄参数）
            target_exif = extract_exif_from_image_data(target_data)
            logger.info(f"[上传接口] 用户图 EXIF 提取完成: {target_exif}")
        
        # 生成上传记录 ID（用于对象存储路径）
        upload_id = str(uuid.uuid4())
        logger.info(f"[上传接口] 生成上传记录ID: {upload_id}")
        
        # 上传到对象存储（根据永久化存储方案第 8 节）
        # 注意：如果对象存储未配置，会回退到本地文件系统
        source_image_url = None
        target_image_url = None
        source_base64 = None
        target_base64 = None
        
        # 【优化】如果对象存储类型是 "local"，直接使用 Base64，不尝试上传到对象存储
        # 这样可以避免不必要的连接尝试和超时等待
        storage_type = getattr(storage_service, 'storage_type', 'local')
        if storage_type == "local" or not storage_service._client:
            # 直接使用 Base64 存储（开发环境默认模式）
            logger.info(f"[上传接口] 对象存储类型为 local 或未配置，直接使用 Base64 存储")
            source_base64 = base64.b64encode(source_data).decode("utf-8")
            source_image_url = f"data:{sourceImage.content_type};base64,{source_base64}"
            logger.info(f"[上传接口] 源图 Base64 编码完成，大小: {len(source_base64)} 字符")
        else:
            # 尝试上传到对象存储（MinIO 或阿里云 OSS）
            try:
                # 【日志记录】开始尝试上传到对象存储
                logger.info(f"[上传接口] 开始尝试上传源图到对象存储，用户ID: {current_user.id}, 任务ID: {upload_id}, 存储类型: {storage_type}")
                # 尝试上传到对象存储（添加超时控制，防止阻塞）
                # 注意：如果对象存储连接失败或超时，会抛出异常，回退到 Base64 存储
                # 【重要】对象存储上传可能会很慢（特别是 MinIO 连接失败时，会等待 10 秒超时）
                # 这可能导致前端请求超时或被取消，因此需要快速失败并回退到 Base64
                source_image_url = storage_service.upload_image(
                    source_data,
                    user_id=current_user.id,
                    task_id=upload_id,
                    image_type="source",
                    content_type=sourceImage.content_type or "image/jpeg"
                )
                logger.info(f"[上传接口] 源图上传到对象存储成功: {source_image_url}")
                # 【重要修复】即使对象存储成功，也需要保存 Base64 数据到数据库
                # 因为 Part1 接口需要从 source_image_data 字段读取图片数据
                # 根据开发方案，Part1 接口使用 upload.source_image_data 字段
                source_base64 = base64.b64encode(source_data).decode("utf-8")
                logger.info(f"[上传接口] 源图 Base64 编码完成（对象存储模式），大小: {len(source_base64)} 字符")
            except Exception as e:
                # 【日志记录】对象存储上传失败，记录详细错误信息
                logger.warning(f"[上传接口] 对象存储上传失败，回退到 Base64: {type(e).__name__}: {str(e)}")
                # 回退到 Base64 存储（兼容模式）
                # 【重要】Base64 编码是同步操作，不会阻塞，可以快速返回
                source_base64 = base64.b64encode(source_data).decode("utf-8")
                source_image_url = f"data:{sourceImage.content_type};base64,{source_base64}"
                logger.info(f"[上传接口] 源图 Base64 编码完成，大小: {len(source_base64)} 字符")
        
        if target_data:
            # 【优化】如果对象存储类型是 "local"，直接使用 Base64，不尝试上传到对象存储
            # 这样可以避免不必要的连接尝试和超时等待
            if storage_type == "local" or not storage_service._client:
                # 直接使用 Base64 存储（开发环境默认模式）
                logger.info(f"[上传接口] 对象存储类型为 local 或未配置，直接使用 Base64 存储（目标图）")
                target_base64 = base64.b64encode(target_data).decode("utf-8")
                target_image_url = f"data:{targetImage.content_type};base64,{target_base64}"
                logger.info(f"[上传接口] 目标图 Base64 编码完成，大小: {len(target_base64)} 字符")
            else:
                # 尝试上传到对象存储（MinIO 或阿里云 OSS）
                try:
                    # 【日志记录】开始尝试上传到对象存储
                    logger.info(f"[上传接口] 开始尝试上传目标图到对象存储，用户ID: {current_user.id}, 任务ID: {upload_id}, 存储类型: {storage_type}")
                    # 尝试上传到对象存储（添加超时控制，防止阻塞）
                    # 注意：如果对象存储连接失败或超时，会抛出异常，回退到 Base64 存储
                    # 【重要】对象存储上传可能会很慢（特别是 MinIO 连接失败时，会等待 10 秒超时）
                    # 这可能导致前端请求超时或被取消，因此需要快速失败并回退到 Base64
                    target_image_url = storage_service.upload_image(
                        target_data,
                        user_id=current_user.id,
                        task_id=upload_id,
                        image_type="target",
                        content_type=targetImage.content_type or "image/jpeg"
                    )
                    logger.info(f"[上传接口] 目标图上传到对象存储成功: {target_image_url}")
                    # 【重要修复】即使对象存储成功，也需要保存 Base64 数据到数据库
                    # 因为 Part1 接口需要从 target_image_data 字段读取图片数据（如果存在）
                    # 根据开发方案，Part1 接口使用 upload.target_image_data 字段
                    target_base64 = base64.b64encode(target_data).decode("utf-8")
                    logger.info(f"[上传接口] 目标图 Base64 编码完成（对象存储模式），大小: {len(target_base64)} 字符")
                except Exception as e:
                    # 【日志记录】对象存储上传失败，记录详细错误信息
                    logger.warning(f"[上传接口] 对象存储上传失败，回退到 Base64: {type(e).__name__}: {str(e)}")
                    # 回退到 Base64 存储（兼容模式）
                    # 【重要】Base64 编码是同步操作，不会阻塞，可以快速返回
                    target_base64 = base64.b64encode(target_data).decode("utf-8")
                    target_image_url = f"data:{targetImage.content_type};base64,{target_base64}"
                    logger.info(f"[上传接口] 目标图 Base64 编码完成，大小: {len(target_base64)} 字符")
        
        # 计算相似度（使用 Base64 数据，如果对象存储上传成功则使用 Base64 作为备用）
        similarity = 0.0
        if target_data:
            # 【日志记录】开始计算相似度
            logger.info(f"[上传接口] 开始计算相似度，源图URL长度: {len(source_image_url) if source_image_url else 0}, 目标图URL长度: {len(target_image_url) if target_image_url else 0}")
            # 优先使用 Base64 数据计算相似度（如果对象存储上传成功，Base64 可能为 None，使用 data URL）
            source_for_similarity = source_image_url  # 使用 URL 或 Base64 data URL
            target_for_similarity = target_image_url  # 使用 URL 或 Base64 data URL
            similarity = upload_service.calculate_similarity(source_for_similarity, target_for_similarity)
            logger.info(f"[上传接口] 相似度计算完成: {similarity}")

        # 【日志记录】开始创建上传记录
        logger.info(f"[上传接口] 开始创建上传记录，用户ID: {current_user.id}, 上传ID: {upload_id}")
        # 创建上传记录（同时保存 URL 和 Base64，支持渐进式迁移）
        upload = upload_service.create_upload(
            db, current_user.id, 
            source_image_data=source_base64,  # Base64（兼容模式）
            target_image_data=target_base64,  # Base64（兼容模式）
            source_image_url=source_image_url,  # 对象存储 URL
            target_image_url=target_image_url,  # 对象存储 URL
            upload_id=upload_id
        )
        logger.info(f"[上传接口] 上传记录创建成功，记录ID: {upload.id}")

        # 【日志记录】准备返回响应
        logger.info(f"[上传接口] 上传成功，准备返回响应，上传ID: {upload.id}, 相似度: {similarity}")
        return success_response(
            data={
                "uploadId": upload.id,
                "source_image_url": source_image_url,  # 优先返回对象存储 URL
                "target_image_url": target_image_url,  # 优先返回对象存储 URL
                "similarity_score": similarity,
                # 【新增】返回 EXIF 元数据，用于前端显示 ISO、光圈等拍摄参数
                "source_exif": source_exif,  # 参考图 EXIF（通常用不到，但提供完整性）
                "target_exif": target_exif,   # 用户图 EXIF（用于 LightroomPanel 显示 ISO 800, f/2.8 等）
            },
        )
    except HTTPException:
        # HTTPException（包括认证错误）应该直接传播，不进行转换
        # 这样认证错误（401）可以正确返回，而不是被转换为 500 错误
        logger.warning(f"[上传接口] HTTPException 传播: {type(HTTPException).__name__}")
        raise
    except Exception as e:
        # 其他异常（如数据库错误、文件读取错误等）才转换为上传失败错误
        # 【日志记录】记录详细的异常信息，包括异常类型和堆栈跟踪
        logger.error(f"[上传接口] 上传失败: {type(e).__name__}: {str(e)}")
        logger.exception(f"[上传接口] 上传失败异常堆栈:")
        raise error_response(ErrorCode.UPLOAD_FAILED, f"上传失败: {str(e)}")
