"""
高保真渲染 API 路由
用途：提供高保真图片渲染服务的 REST API
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from loguru import logger
from sqlalchemy.orm import Session
from pathlib import Path
import os
import base64

from ..services.hifi_render_service import get_hifi_render_service
from ..db import get_db
from ..middleware.auth import security
from ..models import Upload, AnalysisTask
from ..utils.response import success_response, error_response  # 【新增】统一响应格式
from ..constants.error_codes import ErrorCode  # 【新增】错误码常量


router = APIRouter(prefix="/api/render", tags=["渲染服务"])


# ==================== 请求/响应模型 ====================

class BasicPanelParams(BaseModel):
    """基本面板参数"""
    exposure: Optional[str] = Field(default="0", description="曝光 (-5 to +5)")
    contrast: Optional[str] = Field(default="0", description="对比度 (-100 to +100)")
    highlights: Optional[str] = Field(default="0", description="高光 (-100 to +100)")
    shadows: Optional[str] = Field(default="0", description="阴影 (-100 to +100)")
    whites: Optional[str] = Field(default="0", description="白色 (-100 to +100)")
    blacks: Optional[str] = Field(default="0", description="黑色 (-100 to +100)")
    texture: Optional[str] = Field(default="0", description="纹理 (-100 to +100)")
    clarity: Optional[str] = Field(default="0", description="清晰度 (-100 to +100)")
    dehaze: Optional[str] = Field(default="0", description="去雾 (-100 to +100)")
    vibrance: Optional[str] = Field(default="0", description="自然饱和度 (-100 to +100)")
    saturation: Optional[str] = Field(default="0", description="饱和度 (-100 to +100)")


class HSLChannelParams(BaseModel):
    """HSL 通道参数"""
    hue: Optional[str] = Field(default="0", description="色相偏移 (-100 to +100)")
    saturation: Optional[str] = Field(default="0", description="饱和度 (-100 to +100)")
    luminance: Optional[str] = Field(default="0", description="明度 (-100 to +100)")


class ColorGradingZoneParams(BaseModel):
    """色彩分级区域参数"""
    hue: Optional[float] = Field(default=0, description="色相 (0-360)")
    saturation: Optional[float] = Field(default=0, description="饱和度 (0-100)")
    luminance: Optional[float] = Field(default=0, description="明度 (-100 to +100)")


class ColorGradingParams(BaseModel):
    """色彩分级参数"""
    shadows: Optional[ColorGradingZoneParams] = Field(default_factory=ColorGradingZoneParams)
    midtones: Optional[ColorGradingZoneParams] = Field(default_factory=ColorGradingZoneParams)
    highlights: Optional[ColorGradingZoneParams] = Field(default_factory=ColorGradingZoneParams)
    blending: Optional[float] = Field(default=50, description="混合 (0-100)")
    balance: Optional[float] = Field(default=0, description="平衡 (-100 to +100)")


class CalibrationPrimaryParams(BaseModel):
    """校准原色参数"""
    hue: Optional[str] = Field(default="0", description="色相偏移")
    saturation: Optional[str] = Field(default="0", description="饱和度")


class CalibrationParams(BaseModel):
    """相机校准参数"""
    red_primary: Optional[CalibrationPrimaryParams] = Field(default_factory=CalibrationPrimaryParams)
    green_primary: Optional[CalibrationPrimaryParams] = Field(default_factory=CalibrationPrimaryParams)
    blue_primary: Optional[CalibrationPrimaryParams] = Field(default_factory=CalibrationPrimaryParams)
    shadows_tint: Optional[str] = Field(default="0", description="阴影色调")


class WhiteBalanceParams(BaseModel):
    """白平衡参数"""
    temp: Optional[float] = Field(default=0, description="色温偏移")
    tint: Optional[float] = Field(default=0, description="色调偏移")


class HiFiRenderRequest(BaseModel):
    """高保真渲染请求"""
    image_path: Optional[str] = Field(default=None, description="原图路径（相对于上传目录或绝对路径）")
    task_id: Optional[str] = Field(default=None, description="任务 ID（如果提供，将从数据库查询实际文件路径）")
    basic: Optional[BasicPanelParams] = Field(default_factory=BasicPanelParams, description="基本面板参数")
    hsl: Optional[Dict[str, HSLChannelParams]] = Field(default=None, description="HSL 调整")
    colorGrading: Optional[ColorGradingParams] = Field(default=None, description="色彩分级")
    calibration: Optional[CalibrationParams] = Field(default=None, description="相机校准")
    whiteBalance: Optional[WhiteBalanceParams] = Field(default=None, description="白平衡")
    use_cache: bool = Field(default=True, description="是否使用缓存")
    
    class Config:
        json_schema_extra = {
            "example": {
                "image_path": "user_upload_12345.jpg",
                "basic": {
                    "exposure": "+0.8",
                    "contrast": "+10",
                    "highlights": "-40",
                    "shadows": "+60",
                    "dehaze": "+25"
                },
                "hsl": {
                    "green": {"hue": "+15", "saturation": "+20", "luminance": "+10"},
                    "blue": {"hue": "-10", "saturation": "+30", "luminance": "-20"}
                },
                "colorGrading": {
                    "shadows": {"hue": 210, "saturation": 10, "luminance": 0},
                    "highlights": {"hue": 45, "saturation": 5, "luminance": 0}
                }
            }
        }


class HiFiRenderResponse(BaseModel):
    """高保真渲染响应"""
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="消息")
    rendered_url: Optional[str] = Field(default=None, description="渲染后的图片 URL")
    cache_hit: bool = Field(default=False, description="是否命中缓存")
    render_time_ms: Optional[int] = Field(default=None, description="渲染耗时（毫秒）")


class AsyncRenderResponse(BaseModel):
    """异步渲染响应"""
    task_id: str = Field(..., description="任务 ID")
    status: str = Field(default="pending", description="任务状态")
    message: str = Field(default="任务已创建", description="消息")


class RenderStatusResponse(BaseModel):
    """渲染任务状态响应"""
    task_id: str = Field(..., description="任务 ID")
    status: str = Field(..., description="任务状态: pending/processing/completed/failed")
    progress: int = Field(default=0, description="进度 (0-100)")
    rendered_url: Optional[str] = Field(default=None, description="渲染后的图片 URL")
    error: Optional[str] = Field(default=None, description="错误信息")


# ==================== API 端点 ====================

@router.post("/high-fidelity")  # 【修复】移除 response_model，使用统一响应格式 {code, message, data}
async def render_high_fidelity(
    request: HiFiRenderRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    执行高保真渲染
    
    【当前实现】优先使用 Docker 容器中的 RawTherapee CLI 进行高保真渲染。
    如果 Docker 不可用或渲染失败，则自动回退到 Python 图像处理引擎（OpenCV/NumPy）。
    
    【技术细节】：
    1. 生成 RawTherapee 兼容的 PP3 sidecar 文件（INI 格式）
    2. 调用 pstyle-rawtherapee 容器执行渲染
    3. 支持缓存机制，避免重复渲染
    
    - **image_path**: 原图路径（可选，如果提供 task_id 则优先从数据库查询）
    - **task_id**: 任务 ID（可选，如果提供将从数据库查询实际文件路径）
    - **basic**: 基本面板参数（曝光、对比度、高光、阴影等）
    - **hsl**: HSL 调整（8 个颜色通道）
    - **colorGrading**: 色彩分级（阴影、中间调、高光）
    - **calibration**: 相机校准
    - **whiteBalance**: 白平衡
    - **use_cache**: 是否使用缓存（默认 True）
    """
    import time
    start_time = time.time()
    
    logger.info(f"【高保真渲染】收到请求: image_path={request.image_path}, task_id={request.task_id}")
    
    try:
        # 【修复】从 taskId 获取实际文件路径
        actual_image_path = request.image_path
        
        # 如果提供了 task_id，优先从数据库查询实际文件路径
        if request.task_id:
            try:
                # 查询分析任务
                task = db.query(AnalysisTask).filter(AnalysisTask.id == request.task_id).first()
                if not task:
                    logger.error(f"任务不存在: {request.task_id}")
                    raise HTTPException(status_code=404, detail=f"任务不存在: {request.task_id}")
                
                logger.info(f"找到任务: {request.task_id}, user_id: {task.user_id}")
                
                # 查询关联的上传记录（优先使用 analysis_task_id，如果没有则使用 upload.id == task_id）
                upload = db.query(Upload).filter(Upload.analysis_task_id == request.task_id).first()
                
                # 如果通过 analysis_task_id 找不到，尝试通过 upload.id 查找
                if not upload:
                    upload = db.query(Upload).filter(Upload.id == request.task_id).first()
                    logger.info(f"通过 upload.id 查找: {upload.id if upload else '未找到'}")
                
                if upload:
                    logger.info(f"找到上传记录: upload.id={upload.id}, target_image_url={upload.target_image_url[:50] if upload.target_image_url else 'None'}...")
                    
                    # 优先使用 target_image_url
                    if upload.target_image_url:
                        # 【修复】先检查是否是 HTTP/HTTPS URL（对象存储 URL），需要优先处理
                        # 因为 HTTP URL 中可能包含 "/uploads/"，会被误判为本地路径
                        if upload.target_image_url.startswith("http://") or upload.target_image_url.startswith("https://"):
                            # 【修复】如果是 HTTP/HTTPS URL（对象存储 URL），使用 StorageService 下载（支持认证）
                            logger.info(f"target_image_url 是 HTTP URL，使用 StorageService 下载: {upload.target_image_url[:100]}...")
                            try:
                                from ..services.storage_service import storage_service
                                
                                # 使用 StorageService 下载图片（支持 MinIO/OSS 认证）
                                image_data = storage_service.download_image(upload.target_image_url)
                                
                                if image_data is None:
                                    # StorageService 下载失败，可能是对象存储服务未运行或需要认证
                                    error_msg = f"无法从对象存储下载图片: {upload.target_image_url[:100]}..."
                                    logger.error(error_msg)
                                    raise HTTPException(status_code=500, detail=error_msg + "。请检查对象存储服务是否正常运行。")
                                
                                # 保存到临时文件
                                base_path = Path(__file__).parent.parent.parent
                                temp_dir = base_path / "storage" / "uploads"
                                temp_dir.mkdir(parents=True, exist_ok=True)
                                temp_file = temp_dir / f"temp_{request.task_id}_target.jpg"
                                with open(temp_file, "wb") as f:
                                    f.write(image_data)
                                actual_image_path = temp_file.name
                                logger.info(f"HTTP URL 图片已下载并保存为临时文件: {actual_image_path}, 大小: {len(image_data)} 字节")
                            except Exception as e:
                                logger.error(f"下载 HTTP URL 图片失败: {type(e).__name__}: {str(e)}", exc_info=True)
                                raise HTTPException(status_code=500, detail=f"下载图片失败: {str(e)}")
                        elif upload.target_image_url.startswith("data:"):
                            # 如果是 Base64 data URL，需要保存为临时文件
                            logger.warning("target_image_url 是 Base64 data URL，需要保存为临时文件")
                            try:
                                # 提取 Base64 数据
                                base64_data = upload.target_image_url.split(",")[1]
                                image_data = base64.b64decode(base64_data)
                                
                                # 保存到临时文件
                                base_path = Path(__file__).parent.parent.parent
                                temp_dir = base_path / "storage" / "uploads"
                                temp_dir.mkdir(parents=True, exist_ok=True)
                                temp_file = temp_dir / f"temp_{request.task_id}_target.jpg"
                                with open(temp_file, "wb") as f:
                                    f.write(image_data)
                                actual_image_path = temp_file.name
                                logger.info(f"Base64 数据已保存为临时文件: {actual_image_path}")
                            except Exception as e:
                                logger.error(f"保存 Base64 临时文件失败: {type(e).__name__}: {str(e)}")
                                raise HTTPException(status_code=500, detail=f"处理图片数据失败: {str(e)}")
                        elif upload.target_image_url.startswith("uploads/") or ("/uploads/" in upload.target_image_url and not upload.target_image_url.startswith("http")):
                            # 【修复】检查是否是本地对象存储路径（格式：uploads/{user_id}/{task_id}/target-{uuid}.jpg）
                            # 注意：需要排除 HTTP URL（因为 HTTP URL 中也可能包含 "/uploads/"）
                            # 提取相对路径
                            if "/uploads/" in upload.target_image_url:
                                actual_image_path = upload.target_image_url.split("/uploads/")[-1]
                            else:
                                actual_image_path = upload.target_image_url
                            logger.info(f"从数据库获取本地对象存储路径: {actual_image_path}")
                        else:
                            # 其他格式，直接使用
                            actual_image_path = upload.target_image_url
                            logger.info(f"使用 target_image_url: {actual_image_path}")
                    # 如果 target_image_url 为空，尝试使用 target_image_data（Base64）
                    elif upload.target_image_data:
                        logger.warning("target_image_url 为空，使用 target_image_data（Base64）")
                        try:
                            # Base64 数据保存为临时文件
                            image_data = base64.b64decode(upload.target_image_data)
                            base_path = Path(__file__).parent.parent.parent
                            temp_dir = base_path / "storage" / "uploads"
                            temp_dir.mkdir(parents=True, exist_ok=True)
                            temp_file = temp_dir / f"temp_{request.task_id}_target.jpg"
                            with open(temp_file, "wb") as f:
                                f.write(image_data)
                            actual_image_path = temp_file.name
                            logger.info(f"从 target_image_data 保存为临时文件: {actual_image_path}")
                        except Exception as e:
                            logger.error(f"处理 target_image_data 失败: {type(e).__name__}: {str(e)}")
                            raise HTTPException(status_code=500, detail=f"处理图片数据失败: {str(e)}")
                    else:
                        logger.warning(f"上传记录 {upload.id} 没有 target_image_url 和 target_image_data")
                else:
                    logger.warning(f"未找到关联的上传记录，task_id: {request.task_id}")
                    # 【修复】如果 Upload 表找不到，尝试从 AnalysisTask 表的 target_image_data 获取
                    if task.target_image_data:
                        logger.info(f"从 AnalysisTask.target_image_data 获取图片数据（Base64）")
                        try:
                            # Base64 数据保存为临时文件
                            image_data = base64.b64decode(task.target_image_data)
                            base_path = Path(__file__).parent.parent.parent
                            temp_dir = base_path / "storage" / "uploads"
                            temp_dir.mkdir(parents=True, exist_ok=True)
                            temp_file = temp_dir / f"temp_{request.task_id}_target.jpg"
                            with open(temp_file, "wb") as f:
                                f.write(image_data)
                            actual_image_path = temp_file.name
                            logger.info(f"从 AnalysisTask.target_image_data 保存为临时文件: {actual_image_path}")
                        except Exception as e:
                            logger.error(f"处理 AnalysisTask.target_image_data 失败: {type(e).__name__}: {str(e)}")
                            raise HTTPException(status_code=500, detail=f"处理图片数据失败: {str(e)}")
                    elif task.target_image_data is None:
                        logger.warning(f"AnalysisTask.target_image_data 也为空，task_id: {request.task_id}")
                        # 如果所有方式都找不到图片，记录详细信息用于调试
                        logger.error(f"【高保真渲染】无法获取图片路径，详细信息:")
                        logger.error(f"  - task_id: {request.task_id}")
                        logger.error(f"  - task.user_id: {task.user_id if task else 'N/A'}")
                        logger.error(f"  - upload 记录: {'未找到' if not upload else f'找到 (id={upload.id})'}")
                        logger.error(f"  - task.target_image_data: {'存在' if task and task.target_image_data else '不存在'}")
                        if task and task.target_image_data:
                            logger.error(f"  - task.target_image_data 长度: {len(task.target_image_data)} 字符")
                    
            except HTTPException:
                # 重新抛出 HTTPException
                raise
            except Exception as e:
                logger.error(f"从数据库查询文件路径失败: {type(e).__name__}: {str(e)}", exc_info=True)
                # 如果查询失败，继续使用提供的 image_path（如果存在）
                if not actual_image_path or actual_image_path.startswith("blob:"):
                    raise HTTPException(
                        status_code=500,
                        detail=f"无法从任务 {request.task_id} 获取图片路径: {str(e)}"
                    )
        
        # 如果 image_path 是 blob URL 或其他无效路径，且没有 task_id，报错
        if not actual_image_path or actual_image_path.startswith("blob:"):
            if not request.task_id:
                raise HTTPException(
                    status_code=400, 
                    detail="无效的图片路径。请提供有效的 image_path 或 task_id"
                )
            else:
                # 【修复】提供更详细的错误信息，帮助用户理解问题
                error_detail = f"无法从任务 {request.task_id} 获取图片路径。"
                error_detail += "可能原因：1) 任务不存在；2) 任务未关联上传记录；3) 任务中的图片数据已丢失。"
                error_detail += "请重新上传图片并进行分析。"
                logger.error(f"【高保真渲染】{error_detail}")
                raise HTTPException(
                    status_code=404,
                    detail=error_detail
                )
        
        logger.info(f"使用图片路径: {actual_image_path}")
        
        # 构建 Lightroom 参数字典
        lr_params = {
            "basic": request.basic.model_dump() if request.basic else {},
            "whiteBalance": request.whiteBalance.model_dump() if request.whiteBalance else {},
        }
        
        # 处理 HSL 参数
        if request.hsl:
            lr_params["hsl"] = {
                color: channel.model_dump() 
                for color, channel in request.hsl.items()
            }
        
        # 处理色彩分级参数
        if request.colorGrading:
            lr_params["colorGrading"] = request.colorGrading.model_dump()
        
        # 处理校准参数
        if request.calibration:
            lr_params["calibration"] = request.calibration.model_dump()
    
        # 执行渲染
        logger.info(f"【高保真渲染】开始调用渲染服务，图片路径: {actual_image_path}")
        service = get_hifi_render_service()
        success, message, output_path = service.render(
            image_path=actual_image_path,
            lr_params=lr_params,
            use_cache=request.use_cache
        )
        
        render_time_ms = int((time.time() - start_time) * 1000)
        logger.info(f"【高保真渲染】渲染服务返回: success={success}, message={message}, 耗时={render_time_ms}ms")
        
        if not success:
            logger.error(f"【高保真渲染】渲染失败: {message}")
            raise HTTPException(status_code=500, detail=message)
        
        # 生成可访问的 URL
        rendered_url = None
        if output_path:
            # 转换为相对 URL（假设 storage 目录被静态文件服务器提供）
            filename = os.path.basename(output_path)
            rendered_url = f"/static/rendered/{filename}"
            logger.info(f"【高保真渲染】渲染成功，输出URL: {rendered_url}")
        
        # 【修复】使用统一响应格式 {code: 0, message: ..., data: {...}}
        # 这确保与前端 apiClient 的期望格式一致
        # 注意：apiClient 只返回 data 部分，所以 message 也需要放在 data 中
        return success_response(
            data={
                "success": True,
                "message": message,  # 【重要】前端 HiFiRenderResponse 需要此字段
                "rendered_url": rendered_url,
                "cache_hit": ("缓存" in message),
                "render_time_ms": render_time_ms
            },
            message=message
        )
        
    except HTTPException:
        # 重新抛出 HTTPException
        raise
    except Exception as e:
        # 捕获所有其他异常，确保不会导致请求 pending
        render_time_ms = int((time.time() - start_time) * 1000)
        error_msg = f"高保真渲染异常: {type(e).__name__}: {str(e)}"
        logger.error(f"【高保真渲染】异常: {error_msg}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=error_msg
        )


class SoloRenderRequest(BaseModel):
    """SOLO 模式渲染请求"""
    image_path: str = Field(..., description="原图路径")
    solo_param: str = Field(..., description="SOLO 参数名称（如 exposure, hsl_green, grading_shadows）")
    basic: Optional[BasicPanelParams] = Field(default_factory=BasicPanelParams)
    hsl: Optional[Dict[str, HSLChannelParams]] = Field(default=None)
    colorGrading: Optional[ColorGradingParams] = Field(default=None)
    calibration: Optional[CalibrationParams] = Field(default=None)
    whiteBalance: Optional[WhiteBalanceParams] = Field(default=None)
    use_cache: bool = Field(default=True)
    
    class Config:
        json_schema_extra = {
            "example": {
                "image_path": "user_upload_12345.jpg",
                "solo_param": "hsl_green",
                "hsl": {
                    "green": {"hue": "+15", "saturation": "+20", "luminance": "+10"}
                }
            }
        }


class BatchSoloRenderRequest(BaseModel):
    """批量 SOLO 模式渲染请求"""
    image_path: str = Field(..., description="原图路径")
    solo_params: List[str] = Field(..., description="SOLO 参数名称列表")
    basic: Optional[BasicPanelParams] = Field(default_factory=BasicPanelParams)
    hsl: Optional[Dict[str, HSLChannelParams]] = Field(default=None)
    colorGrading: Optional[ColorGradingParams] = Field(default=None)
    calibration: Optional[CalibrationParams] = Field(default=None)
    whiteBalance: Optional[WhiteBalanceParams] = Field(default=None)
    use_cache: bool = Field(default=True)


class SoloRenderResponse(BaseModel):
    """SOLO 模式渲染响应"""
    success: bool
    message: str
    solo_param: str
    rendered_url: Optional[str] = None
    cache_hit: bool = False
    render_time_ms: Optional[int] = None


class BatchSoloRenderResponse(BaseModel):
    """批量 SOLO 模式渲染响应"""
    total: int
    success_count: int
    results: Dict[str, SoloRenderResponse]


@router.post("/solo", response_model=SoloRenderResponse)
async def render_solo(request: SoloRenderRequest):
    """
    执行 SOLO 模式高保真渲染
    
    只应用指定的参数，其他参数保持默认值。
    用于帮助用户理解每个调整的独立效果。
    
    支持的 SOLO 参数：
    - 基本面板: exposure, contrast, highlights, shadows, whites, blacks, temperature, tint
    - 存在感: texture, clarity, dehaze, vibrance, saturation
    - HSL: hsl_red, hsl_orange, hsl_yellow, hsl_green, hsl_aqua, hsl_blue, hsl_purple, hsl_magenta
    - 色彩分级: grading_shadows, grading_midtones, grading_highlights
    - 校准: calibration
    """
    import time
    start_time = time.time()
    
    logger.info(f"收到 SOLO 渲染请求: {request.image_path}, 参数: {request.solo_param}")
    
    # 构建 Lightroom 参数字典
    lr_params = {
        "basic": request.basic.model_dump() if request.basic else {},
        "whiteBalance": request.whiteBalance.model_dump() if request.whiteBalance else {},
    }
    
    if request.hsl:
        lr_params["hsl"] = {
            color: channel.model_dump() 
            for color, channel in request.hsl.items()
        }
    
    if request.colorGrading:
        lr_params["colorGrading"] = request.colorGrading.model_dump()
    
    if request.calibration:
        lr_params["calibration"] = request.calibration.model_dump()
    
    # 执行 SOLO 渲染
    service = get_hifi_render_service()
    success, message, output_path = service.render_solo(
        image_path=request.image_path,
        lr_params=lr_params,
        solo_param=request.solo_param,
        use_cache=request.use_cache
    )
    
    render_time_ms = int((time.time() - start_time) * 1000)
    
    if not success:
        logger.error(f"SOLO 渲染失败: {message}")
        raise HTTPException(status_code=500, detail=message)
    
    # 生成可访问的 URL
    rendered_url = None
    if output_path:
        import os
        filename = os.path.basename(output_path)
        rendered_url = f"/static/rendered/{filename}"
    
    return SoloRenderResponse(
        success=True,
        message=message,
        solo_param=request.solo_param,
        rendered_url=rendered_url,
        cache_hit=("缓存" in message),
        render_time_ms=render_time_ms
    )


@router.post("/solo/batch", response_model=BatchSoloRenderResponse)
async def render_batch_solo(request: BatchSoloRenderRequest):
    """
    批量执行多个 SOLO 模式渲染
    
    一次性生成多个参数的独立预览，用于快速对比不同参数的效果。
    """
    logger.info(f"收到批量 SOLO 渲染请求: {len(request.solo_params)} 个参数")
    
    # 构建 Lightroom 参数字典
    lr_params = {
        "basic": request.basic.model_dump() if request.basic else {},
        "whiteBalance": request.whiteBalance.model_dump() if request.whiteBalance else {},
    }
    
    if request.hsl:
        lr_params["hsl"] = {
            color: channel.model_dump() 
            for color, channel in request.hsl.items()
        }
    
    if request.colorGrading:
        lr_params["colorGrading"] = request.colorGrading.model_dump()
    
    if request.calibration:
        lr_params["calibration"] = request.calibration.model_dump()
    
    # 执行批量 SOLO 渲染
    service = get_hifi_render_service()
    batch_results = service.render_batch_solo(
        image_path=request.image_path,
        lr_params=lr_params,
        solo_params=request.solo_params,
        use_cache=request.use_cache
    )
    
    # 转换结果格式
    results = {}
    success_count = 0
    for solo_param, (success, message, output_path) in batch_results.items():
        rendered_url = None
        if output_path:
            import os
            filename = os.path.basename(output_path)
            rendered_url = f"/static/rendered/{filename}"
        
        if success:
            success_count += 1
        
        results[solo_param] = SoloRenderResponse(
            success=success,
            message=message,
            solo_param=solo_param,
            rendered_url=rendered_url,
            cache_hit=("缓存" in message),
            render_time_ms=None
        )
    
    return BatchSoloRenderResponse(
        total=len(request.solo_params),
        success_count=success_count,
        results=results
    )


@router.post("/high-fidelity/async", response_model=AsyncRenderResponse)
async def render_high_fidelity_async(
    request: HiFiRenderRequest,
    background_tasks: BackgroundTasks
):
    """
    异步执行高保真渲染
    
    立即返回任务 ID，渲染在后台执行。使用 GET /render/status/{task_id} 查询状态。
    """
    logger.info(f"收到异步渲染请求: {request.image_path}")
    
    # 构建 Lightroom 参数字典
    lr_params = {
        "basic": request.basic.model_dump() if request.basic else {},
        "whiteBalance": request.whiteBalance.model_dump() if request.whiteBalance else {},
    }
    
    if request.hsl:
        lr_params["hsl"] = {
            color: channel.model_dump() 
            for color, channel in request.hsl.items()
        }
    
    if request.colorGrading:
        lr_params["colorGrading"] = request.colorGrading.model_dump()
    
    if request.calibration:
        lr_params["calibration"] = request.calibration.model_dump()
    
    # 创建异步任务
    service = get_hifi_render_service()
    task_id = service.render_async(
        image_path=request.image_path,
        lr_params=lr_params
    )
    
    # TODO: 添加后台任务执行
    # background_tasks.add_task(service.render, request.image_path, lr_params)
    
    return AsyncRenderResponse(
        task_id=task_id,
        status="pending",
        message="渲染任务已创建，请使用 task_id 查询状态"
    )


@router.get("/status/{task_id}", response_model=RenderStatusResponse)
async def get_render_status(task_id: str):
    """
    获取异步渲染任务状态
    
    - **task_id**: 任务 ID（从异步渲染接口返回）
    """
    service = get_hifi_render_service()
    status = service.get_render_status(task_id)
    
    rendered_url = None
    if status.get('result_url'):
        import os
        filename = os.path.basename(status['result_url'])
        rendered_url = f"/static/rendered/{filename}"
    
    return RenderStatusResponse(
        task_id=task_id,
        status=status.get('status', 'unknown'),
        progress=status.get('progress', 0),
        rendered_url=rendered_url,
        error=status.get('error')
    )


@router.post("/cleanup-cache")
async def cleanup_cache(max_age_hours: int = 24):
    """
    清理过期的渲染缓存
    
    - **max_age_hours**: 最大缓存时间（小时），默认 24 小时
    """
    service = get_hifi_render_service()
    cleaned_count = service.cleanup_cache(max_age_hours)
    
    return {
        "success": True,
        "message": f"已清理 {cleaned_count} 个过期缓存文件"
    }


@router.get("/health")
async def health_check():
    """
    检查渲染服务健康状态
    
    返回 Docker/RawTherapee 可用性和当前使用的渲染引擎。
    """
    service = get_hifi_render_service()
    docker_available = service._check_docker_available()
    
    return {
        "status": "healthy",
        "rawtherapee_available": docker_available,
        "render_engine": "rawtherapee" if docker_available else "python (fallback)",
        "message": "高保真渲染服务可用" + (" - RawTherapee CLI" if docker_available else " - Python 引擎（回退模式）")
    }

