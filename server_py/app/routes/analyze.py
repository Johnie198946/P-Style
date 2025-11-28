"""
分析路由 - Part1/Part2/Feasibility/AI 诊断
根据开发方案第 4、16、26 节实现，新增 AI 诊断接口
提供可行性评估、两阶段分析、AI 诊断和任务查询接口
"""
import json
import asyncio  # 用于异步任务执行
import time  # 用于记录请求处理时间
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError  # 用于显著性检测的超时控制
from fastapi import APIRouter, Depends, HTTPException, Form, Request, Body
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func, desc  # func 用于 count 统计，desc 用于排序
from typing import Optional, Dict, Any, List
from loguru import logger  # 日志记录工具
from pydantic import BaseModel

from ..db import get_db
from ..models import User, AnalysisTask, Upload
from ..middleware.auth import get_current_user, security
from ..services.feasibility_service import FeasibilityService
from ..services.gemini_service import get_gemini_service
from ..services.prompt_template import PromptTemplateService
from ..services.analysis_formatter import AnalysisFormatter
from ..services.task_service import TaskService
from ..services.usage_service import UsageService
from ..services.saliency_service import SaliencyService  # 【新增】显著性检测服务
from ..utils.response import success_response, error_response
from ..constants.error_codes import ErrorCode
from ..schemas.analysis_schemas import (
    Part1RequestSchema,
    Part2RequestSchema,
    DiagnosisRequestSchema,
    validate_diagnosis_response
)

router = APIRouter(prefix="/api/analyze", tags=["analyze"])

# 初始化服务实例（单例模式）
feasibility_service = FeasibilityService()  # 可行性评估服务（CV 算法）
gemini_service = get_gemini_service()  # Gemini API 服务
prompt_template = PromptTemplateService()  # Prompt 模板服务
formatter = AnalysisFormatter()  # 结果格式化服务
task_service = TaskService()  # 任务管理服务
usage_service = UsageService()  # 用量统计服务
saliency_service = SaliencyService()  # 【新增】显著性检测服务（用于生成视觉重心遮罩图）


@router.post("/feasibility")
async def analyze_feasibility(
    request: Request,  # 【重要】添加 Request 参数，用于在 Form 解析之前记录日志
    sourceImage: str = Form(...),
    targetImage: str = Form(...),
    taskId: Optional[str] = Form(None),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    复刻可行性评估接口
    根据开发方案第 26 节实现，由系统 CV 算法主导，不依赖 Gemini
    
    Args:
        sourceImage: 参考图（base64 或 data URL，必填）
        targetImage: 用户图（base64 或 data URL，必填）
        taskId: 可选的任务 ID，用于关联可行性结果
        credentials: JWT Token（Bearer，必填）
        db: 数据库会话
    
    Returns:
        {
            "code": 0,
            "message": "ok",
            "data": {
                "feasibilityScore": 0.614,
                "difficulty": "中",
                "confidence": 0.78,
                "dealBreakers": [],
                "dominantFactors": [...],
                "recommendedActions": [...],
                "metrics": {...},
                "explanation": "..."
            }
        }
    
    Raises:
        HTTPException: 如果参数验证失败、用户未登录、或评估过程出错
    
    Note:
        - 可行性评估不计入单独用量，因为它通常作为 Part1 的前置步骤
        - Part1 接口会检查用量限制，因此这里不需要重复检查
        - 图片数据可以是 base64 字符串或 data URL 格式（如 data:image/jpeg;base64,...）
    """
    try:
        # 【日志记录】记录函数入口，便于排查问题
        # 注意：在 FastAPI 的 Form(...) 参数解析之前，如果请求格式不正确，会抛出 RequestValidationError
        # 这个异常会被 main.py 中的 request_validation_exception_handler 捕获
        # 如果函数被调用，说明 Form 数据解析成功，参数已经正确传递
        logger.info(f"【可行性评估】函数被调用，开始处理请求")
        logger.info(f"【可行性评估】请求路径: {request.url.path}")
        logger.info(f"【可行性评估】请求方法: {request.method}")
        logger.info(f"【可行性评估】Content-Type: {request.headers.get('content-type', '未知')}")
        logger.info(f"【可行性评估】Content-Length: {request.headers.get('content-length', '未知')}")
        logger.debug(f"【可行性评估】sourceImage 类型: {type(sourceImage)}, 是否为 None: {sourceImage is None}")
        logger.debug(f"【可行性评估】targetImage 类型: {type(targetImage)}, 是否为 None: {targetImage is None}")
        
        # 【参数验证】第一步：检查参数是否存在（None 检查）
        # 注意：FastAPI 的 Form(...) 参数在解析失败时会抛出 RequestValidationError
        # 但如果请求格式正确但字段值为空，Form(...) 可能返回 None 或空字符串
        # 这里需要先检查参数是否存在（可能为 None 或空字符串）
        if sourceImage is None:
            logger.error("【可行性评估】失败: sourceImage 参数为 None")
            raise error_response(ErrorCode.MISSING_REQUIRED_FIELD, "参考图（sourceImage）不能为空")
        
        # 【参数验证】第二步：检查参数类型（类型检查）
        # 注意：FastAPI 的 Form(...) 应该返回字符串，但如果前端发送的数据格式不正确，可能返回其他类型
        if not isinstance(sourceImage, str):
            logger.error(f"【可行性评估】失败: sourceImage 类型不正确，期望 str，实际 {type(sourceImage).__name__}")
            raise error_response(ErrorCode.INVALID_REQUEST, f"参考图（sourceImage）格式错误，期望字符串，实际类型: {type(sourceImage).__name__}")
        
        # 【参数验证】第三步：检查参数值是否为空（空值检查）
        # 注意：即使参数不是 None 且类型正确，也可能只包含空白字符
        if not sourceImage.strip():
            logger.error("【可行性评估】失败: sourceImage 参数为空字符串")
            raise error_response(ErrorCode.MISSING_REQUIRED_FIELD, "参考图（sourceImage）不能为空")
        
        # 【参数验证】对 targetImage 执行相同的三步验证
        if targetImage is None:
            logger.error("【可行性评估】失败: targetImage 参数为 None")
            raise error_response(ErrorCode.MISSING_REQUIRED_FIELD, "用户图（targetImage）不能为空")
        
        if not isinstance(targetImage, str):
            logger.error(f"【可行性评估】失败: targetImage 类型不正确，期望 str，实际 {type(targetImage).__name__}")
            raise error_response(ErrorCode.INVALID_REQUEST, f"用户图（targetImage）格式错误，期望字符串，实际类型: {type(targetImage).__name__}")
        
        if not targetImage.strip():
            logger.error("【可行性评估】失败: targetImage 参数为空字符串")
            raise error_response(ErrorCode.MISSING_REQUIRED_FIELD, "用户图（targetImage）不能为空")
        
        # 【日志记录】记录请求信息（不记录完整的图片数据，只记录数据长度和格式）
        # 注意：图片数据可能很大（几MB到几十MB），完整记录会导致日志文件过大
        # 只记录数据长度和格式，便于排查问题，同时避免日志文件过大
        source_image_length = len(sourceImage)
        target_image_length = len(targetImage)
        source_image_format = "data URL" if sourceImage.startswith("data:image") else "base64"
        target_image_format = "data URL" if targetImage.startswith("data:image") else "base64"
        logger.info(f"【可行性评估】请求信息: sourceImage长度={source_image_length}, 格式={source_image_format}, targetImage长度={target_image_length}, 格式={target_image_format}, taskId={taskId}")
        
        # 【身份验证】验证用户身份（根据注册登录与权限设计方案，所有分析接口需要登录）
        # 注意：security 依赖（HTTPBearer）会在 Token 无效时抛出 HTTPException (403)
        # 如果 Token 有效，get_current_user 会返回当前用户对象
        current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)
        logger.debug(f"【可行性评估】用户身份验证成功: 用户 {current_user.email} (ID: {current_user.id})")
        
        # 【业务逻辑】调用 CV 算法进行可行性评估（系统算法主导，不依赖 Gemini）
        # 注意：
        # 1. feasibility_service.evaluate 方法内部已经处理了图片解码和异常
        # 2. 如果图片解码失败，会返回错误结果而不是抛出异常
        # 3. 图片数据可以是 data URL 格式（data:image/jpeg;base64,...）或纯 base64 字符串
        # 4. feasibility_service 会自动识别并解析两种格式
        result = feasibility_service.evaluate(sourceImage, targetImage)
        
        # 【结果验证】检查评估结果是否包含错误
        # 注意：如果图片解码失败，feasibility_service 会在 dealBreakers 中添加错误信息
        # 这里需要检查是否是图片处理错误，如果是，应该抛出异常而不是返回错误结果
        if result.get("dealBreakers") and len(result.get("dealBreakers", [])) > 0:
            # 检查是否是图片解码错误
            deal_breakers = result.get("dealBreakers", [])
            if any("无法解码" in str(breaker) or "评估失败" in str(breaker) for breaker in deal_breakers):
                logger.error(f"【可行性评估】失败: 图片解码或处理错误, dealBreakers={deal_breakers}")
                raise error_response(ErrorCode.IMAGE_PROCESSING_FAILED, f"图片处理失败: {', '.join(deal_breakers)}")
        
        # 【日志记录】记录评估成功信息
        logger.info(f"【可行性评估】成功: feasibilityScore={result.get('feasibilityScore')}, difficulty={result.get('difficulty')}, user_id={current_user.id}")
        
        # 【数据持久化】如果提供了 taskId，将结果保存到任务记录
        # 注意：taskId 是可选的，如果前端没有提供，就不保存到任务记录
        # 可行性评估结果可以独立存在，不一定需要关联到任务
        if taskId:
            task = task_service.get_task(db, taskId)
            if task:
                task.feasibility_result = result
                db.commit()
                logger.debug(f"【可行性评估】结果已保存到任务: taskId={taskId}")
            else:
                logger.warning(f"【可行性评估】任务不存在: taskId={taskId}，跳过结果保存")

        # 【响应返回】返回统一格式的成功响应
        # 注意：根据开发方案第 15 节，所有接口必须返回 {code, message, data} 格式
        return success_response(data=result)
    except HTTPException:
        # 重新抛出 HTTPException（如 error_response 返回的异常）
        raise
    except Exception as e:
        # 捕获其他未预期的异常，记录详细错误信息
        error_type = type(e).__name__
        error_detail = str(e)
        logger.exception(f"可行性评估时发生未预期的异常: {error_type}: {error_detail}")
        raise error_response(ErrorCode.FEASIBILITY_CHECK_FAILED, f"可行性评估失败: {error_detail}")


@router.post("/part1")
async def analyze_part1(
    request_data: Part1RequestSchema = Body(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    Part1 分析接口
    根据开发方案第 23.2 节和第 763 行实现，输出基础洞察（点评、构图、光影趋势、可行性说明、工作流草案）
    
    Args:
        request_data: 请求数据
            {
                "uploadId": str,  # 上传记录 ID（必填，根据开发方案第 763 行）
                "optional_style": str  # 可选风格关键词（如 "日出暖光", "胶片感"）
            }
        credentials: JWT Token（Bearer）
        db: 数据库会话
    
    Returns:
        {
            "code": 0,
            "message": "ok",
            "data": {
                "taskId": "uuid",
                "stage": "part1",
                "status": "part1_completed",
                "structuredAnalysis": {...},  # 标准化的 Part1 结构
                "naturalLanguage": "...",  # 自然语言报告
                "protocolVersion": "2025-02"
            }
        }
        
    Note:
        - 需要先检查用户用量限制（Part1+Part2 计 1 次分析）
        - 根据 uploadId 从数据库获取图片数据（source_image_data 和 target_image_data）
        - 如果提供了 targetImage，会先进行可行性评估
        - 调用 Gemini API 生成分析结果，然后格式化并保存到数据库
    """
    try:
        # 【日志记录】记录函数入口，便于追踪问题  
        # 【增强日志】记录请求时间戳、请求头信息、客户端IP等详细信息
        import time
        request_start_time = time.time()
        logger.info("=" * 80)
        logger.info(f"【Part1 分析】收到分析请求")
        logger.info(f"【Part1 分析】请求时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"【Part1 分析】uploadId: {request_data.uploadId}")
        logger.info(f"【Part1 分析】optional_style: {request_data.optional_style}")
        logger.info("=" * 80)
        
        # 验证用户身份
        current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)
        logger.info(f"【Part1 分析】用户认证成功，用户ID: {current_user.id}, 用户邮箱: {current_user.email}")
        
        # 【重要】根据 uploadId 从数据库获取图片数据
        # 根据开发方案第 763 行，前端传递 uploadId，后端需要从 Upload 表中查询图片数据
        upload = db.query(Upload).filter(Upload.id == request_data.uploadId).first()
        if not upload:
            logger.error(f"【Part1 分析】上传记录不存在: uploadId={request_data.uploadId}")
            raise error_response(ErrorCode.MISSING_REQUIRED_FIELD, f"上传记录不存在: {request_data.uploadId}")
        
        # 【日志记录】记录查询到的上传记录信息
        logger.info(f"【Part1 分析】查询到上传记录: uploadId={upload.id}, 有源图: {upload.source_image_data is not None}, 有目标图: {upload.target_image_data is not None}")
        
        # 【重要】从上传记录中获取图片数据
        # 根据永久化存储方案，优先使用 source_image_data（Base64），如果不存在则尝试从 source_image_url 获取
        # 这样可以兼容对象存储模式和 Base64 模式
        sourceImage = upload.source_image_data
        targetImage = upload.target_image_data
        
        # 【兼容性处理】如果 source_image_data 为空，尝试从 source_image_url 获取
        # 注意：如果 source_image_url 是 data URL（data:image/jpeg;base64,...），需要提取 Base64 部分
        if not sourceImage and upload.source_image_url:
            logger.info(f"【Part1 分析】source_image_data 为空，尝试从 source_image_url 获取: {upload.source_image_url[:100]}...")
            if upload.source_image_url.startswith("data:"):
                # 提取 Base64 部分（格式：data:image/jpeg;base64,<base64_data>）
                try:
                    # 找到 base64, 后面的部分
                    base64_part = upload.source_image_url.split("base64,")[1] if "base64," in upload.source_image_url else None
                    if base64_part:
                        sourceImage = base64_part
                        logger.info(f"【Part1 分析】从 source_image_url 提取 Base64 数据成功，长度: {len(sourceImage)} 字符")
                    else:
                        logger.warning(f"【Part1 分析】source_image_url 格式不正确，无法提取 Base64 数据")
                except Exception as e:
                    logger.error(f"【Part1 分析】从 source_image_url 提取 Base64 数据失败: {type(e).__name__}: {str(e)}")
            else:
                # 如果是对象存储 URL，需要下载图片并转换为 Base64
                # 注意：这需要网络请求，可能会很慢，建议优先使用 source_image_data
                logger.warning(f"【Part1 分析】source_image_url 是对象存储 URL，需要下载图片，这可能会很慢")
                # TODO: 实现从对象存储 URL 下载图片并转换为 Base64 的逻辑
                # 当前暂时不支持，需要前端确保上传时保存 Base64 数据
        
        # 【验证】确保源图数据存在
        if not sourceImage:
            logger.error(f"【Part1 分析】源图数据为空: uploadId={request_data.uploadId}")
            logger.error(f"【Part1 分析】上传记录详情: source_image_data={upload.source_image_data is not None}, source_image_url={upload.source_image_url is not None}, target_image_data={upload.target_image_data is not None}, target_image_url={upload.target_image_url is not None}")
            raise error_response(ErrorCode.MISSING_REQUIRED_FIELD, "源图数据不存在，请重新上传")
        
        # 【日志记录】记录图片数据信息（不记录完整数据，只记录长度）
        source_image_size = len(sourceImage) if sourceImage else 0
        target_image_size = len(targetImage) if targetImage else 0
        logger.info(f"【Part1 分析】源图数据长度: {source_image_size} 字符, 目标图数据长度: {target_image_size} 字符")
        
        # 【性能优化】检查图片数据大小，如果过大则警告
        # Base64 编码的图片数据通常比原始图片大约 33%，10MB 的图片约等于 13MB 的 Base64 字符串
        MAX_IMAGE_SIZE = 20 * 1024 * 1024  # 20MB Base64 字符串（约 15MB 原始图片）
        if source_image_size > MAX_IMAGE_SIZE:
            logger.warning(f"【Part1 分析】⚠️ 源图数据过大: {source_image_size / 1024 / 1024:.2f}MB，可能影响处理速度")
        if target_image_size > MAX_IMAGE_SIZE:
            logger.warning(f"【Part1 分析】⚠️ 目标图数据过大: {target_image_size / 1024 / 1024:.2f}MB，可能影响处理速度")
        
        # 检查用量限制（严格限流，超出则返回错误码）
        # 注意：管理员账号不受用量限制（根据开发方案，管理员拥有所有权限）
        allowed, error_code = usage_service.check_usage_limit(db, current_user.id, "analysis", user_role=current_user.role)
        if not allowed:
            logger.warning(f"【Part1 分析】用户用量已达上限: user_id={current_user.id}")
            raise error_response(error_code, "分析次数已达上限")

        # 如果提供了目标图，先进行可行性评估
        feasibility_result = None
        if targetImage:
            logger.info(f"【Part1 分析】开始可行性评估...")
            feasibility_result = feasibility_service.evaluate(sourceImage, targetImage)
            logger.info(f"【Part1 分析】可行性评估完成: feasibilityScore={feasibility_result.get('feasibilityScore') if feasibility_result else 'None'}")

        # 创建分析任务记录（添加异常处理，确保数据库操作失败时能正确返回错误）
        try:
            task = task_service.create_task(db, current_user.id, sourceImage, targetImage)
            logger.info(f"【Part1 分析】任务创建成功: taskId={task.id}")
        except Exception as db_error:
            # 数据库操作失败（可能是图片数据太大导致 SQLite 操作超时或失败）
            error_type = type(db_error).__name__
            error_detail = str(db_error)
            logger.error(f"【Part1 分析】任务创建失败: {error_type}: {error_detail}", exc_info=True)
            # 检查是否是数据过大导致的错误
            if "too large" in error_detail.lower() or "exceeded" in error_detail.lower() or "timeout" in error_detail.lower():
                raise error_response(ErrorCode.INTERNAL_ERROR, f"图片数据过大，无法保存到数据库。请尝试使用较小的图片或联系管理员。")
            raise error_response(ErrorCode.INTERNAL_ERROR, f"数据库操作失败: {error_detail}")

        # 获取 Part1 Prompt 模板（根据开发方案第 23.2 节）
        try:
            prompt = prompt_template.get_part1_prompt(
                sourceImage, targetImage, exif=None, options={"optional_style": request_data.optional_style}
            )
            logger.info(f"【Part1 分析】Prompt 生成完成，长度: {len(prompt)} 字符")
        except Exception as prompt_error:
            # 👇👇👇 核弹级调试代码开始 👇👇👇
            import traceback
            import sys
            print("\n" + "!"*60)
            print("💥💥💥 在 get_part1_prompt 中抓到凶手了！详细报错如下：")
            print("!"*60)
            traceback.print_exc(file=sys.stdout)  # 强制打印堆栈到终端
            print("!"*60 + "\n")
            # 👆👆👆 核弹级调试代码结束 👆👆👆
            logger.error(f"【Part1 分析】Prompt 生成失败: {prompt_error}", exc_info=True)
            raise
        
        # 【调试】验证 prompt 是否包含关键要求（检查 overlays 相关要求）
        if "reference_overlays" in prompt and "user_overlays" in prompt:
            logger.info(f"【Part1 分析】✅ Prompt 包含 overlays 两套坐标要求（reference_overlays 和 user_overlays）")
        else:
            logger.warning(f"【Part1 分析】⚠️ Prompt 可能缺少 overlays 两套坐标要求，请检查 prompt 模板！")
        
        # 【调试】记录 prompt 的开头和结尾（用于验证 prompt 是否完整）
        logger.debug(f"【Part1 分析】Prompt 开头（前200字符）: {prompt[:200]}")
        logger.debug(f"【Part1 分析】Prompt 结尾（后200字符）: {prompt[-200:]}")

        # 构建 Gemini API 请求内容（文本 + 图片）
        # 【重要】从数据库获取的 source_image_data 和 target_image_data 是纯 base64 字符串（不带 data URL 前缀）
        # 因此可以直接使用，不需要 split(",")
        # 【方案2：图片标记】在每张图片前添加文本标记，明确标识图片类型，防止 Gemini 混淆图片顺序
        contents = [{"role": "user", "parts": [{"text": prompt}]}]
        
        if sourceImage:
            # 【处理】如果 sourceImage 是 data URL 格式（如 "data:image/jpeg;base64,..."），提取 base64 部分
            # 如果是纯 base64 字符串，直接使用
            source_base64 = sourceImage.split(",")[-1] if "," in sourceImage else sourceImage
            # 【方案2：图片标记】在参考图前添加文本标记，明确标识这是第一张图片（参考图）
            contents[0]["parts"].append({
                "text": "⚠️⚠️⚠️【图片1：参考图（Reference Image）】⚠️⚠️⚠️ 这是第一张图片，是目标风格图，用于理解目标色彩风格和构图特征。所有构图分析（module_2_composition）都必须基于这张图片进行。请分析这张图片的风格特征。⚠️⚠️⚠️ 这是参考图，不是用户图！⚠️⚠️⚠️"
            })
            contents[0]["parts"].append({
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": source_base64,
                }
            })
            logger.debug(f"【Part1 分析】源图（参考图，第一张图片）数据已添加到 Gemini 请求，base64 长度: {len(source_base64)} 字符")
        
        if targetImage:
            # 【处理】如果 targetImage 是 data URL 格式，提取 base64 部分
            # 如果是纯 base64 字符串，直接使用
            target_base64 = targetImage.split(",")[-1] if "," in targetImage else targetImage
            # 【方案2：图片标记】在用户图前添加文本标记，明确标识这是第二张图片（用户图）
            contents[0]["parts"].append({
                "text": "⚠️⚠️⚠️【图片2：用户图（User Image）】⚠️⚠️⚠️ 这是第二张图片，是需要处理的图片，需要参考第一张图片（参考图）的风格进行调整。这不是构图分析的对象。⚠️⚠️⚠️ 这是用户图，不是参考图！⚠️⚠️⚠️"
            })
            contents[0]["parts"].append({
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": target_base64,
                }
            })
            logger.debug(f"【Part1 分析】目标图（用户图，第二张图片）数据已添加到 Gemini 请求，base64 长度: {len(target_base64)} 字符")
        
        # 【方案4：验证日志】记录图片顺序的详细信息，便于排查问题
        logger.info(f"【Part1 分析】图片顺序确认：")
        logger.info(f"  - 第一张图片（参考图）：sourceImage, base64长度={len(source_base64) if sourceImage else 0}")
        logger.info(f"  - 第二张图片（用户图）：targetImage, base64长度={len(target_base64) if targetImage else 0}")
        logger.info(f"  - Gemini API contents parts 顺序：")
        for i, part in enumerate(contents[0]["parts"]):
            if "text" in part:
                part_text = part["text"]
                # 截断过长的文本，只显示前200字符和后200字符
                if len(part_text) > 400:
                    text_preview = part_text[:200] + f"... [中间省略 {len(part_text) - 400} 字符] ..." + part_text[-200:]
                else:
                    text_preview = part_text
                logger.info(f"    Part {i+1}: 文本（长度={len(part_text)}，预览={text_preview}）")
                # 【调试】验证 prompt 是否包含关键要求
                if i == 0:  # 第一个 part 是 prompt
                    if "reference_overlays" in part_text and "user_overlays" in part_text:
                        logger.info(f"    ✅ Part {i+1} (Prompt) 包含 overlays 两套坐标要求")
                    else:
                        logger.warning(f"    ⚠️ Part {i+1} (Prompt) 可能缺少 overlays 两套坐标要求！")
                    # 检查 prompt 开头是否包含关键警告
                    if "🚨🚨🚨 最关键的输出要求" in part_text[:500]:
                        logger.info(f"    ✅ Part {i+1} (Prompt) 开头包含关键警告")
                    else:
                        logger.warning(f"    ⚠️ Part {i+1} (Prompt) 开头可能缺少关键警告！")
            elif "inline_data" in part:
                data_length = len(part["inline_data"]["data"])
                logger.info(f"    Part {i+1}: 图片（base64长度={data_length}）")

        # 【第一层：真相层 - 打印完整 Prompt】在调用 Gemini API 的前一行，强制打印最终生成的完整 Prompt
        # 这是排查"幽灵行为"的关键：确认实际发送给 LLM 的内容
        logger.info("=" * 80)
        logger.info("【第一层排查：真相层】========== 完整 Prompt 字符串（发送给 Gemini 前） ==========")
        logger.info(f"Prompt 总长度: {len(prompt)} 字符")
        logger.info(f"Prompt 完整内容:\n{prompt}")
        logger.info("=" * 80)
        
        # 【第一层：真相层 - 打印完整 Contents】打印最终发送给 Gemini API 的完整 contents
        logger.info("=" * 80)
        logger.info("【第一层排查：真相层】========== 完整 Contents（发送给 Gemini 前） ==========")
        logger.info(f"Contents 结构: {json.dumps(contents, indent=2, ensure_ascii=False)}")
        logger.info("=" * 80)
        
        # 【Gemini API 调用】添加详细的日志和异常处理
        logger.info(f"【Part1 分析】准备调用 Gemini API，contents parts 数量: {len(contents[0]['parts'])}")
        try:
            gemini_response = gemini_service.generate_text(contents, stage="part1")
            logger.info(f"【Part1 分析】Gemini API 调用成功，响应长度: {len(gemini_response)} 字符")
        except NameError as name_error:
            # 👇👇👇 核弹级调试代码开始 👇👇👇
            import traceback
            import sys
            print("\n" + "!"*60)
            print("💥💥💥 在 Gemini API 调用中抓到凶手了！详细报错如下：")
            print("!"*60)
            traceback.print_exc(file=sys.stdout)  # 强制打印堆栈到终端
            print("!"*60 + "\n")
            # 👆👆👆 核弹级调试代码结束 👆👆👆
            logger.error(f"【Part1 分析】Gemini API 调用发生 NameError: {name_error}", exc_info=True)
            raise
        except TimeoutError as timeout_err:
            # 超时错误：记录详细日志并返回友好错误
            logger.error(f"【Part1 分析】Gemini API 调用超时: {str(timeout_err)}")
            raise error_response(ErrorCode.INTERNAL_ERROR, f"AI 分析超时，请稍后重试。如果问题持续，请联系管理员。")
        except ConnectionError as conn_err:
            # 【SSL/连接错误处理】SSL 连接错误或网络连接错误
            error_detail = str(conn_err)
            logger.error(f"【Part1 分析】Gemini API 连接失败: {error_detail}", exc_info=True)
            
            # 【关键修复】明确提示代理连接拒绝错误
            # [Errno 61] Connection refused 通常意味着代理服务器未启动
            if "Connection refused" in error_detail or "Errno 61" in error_detail:
                raise error_response(ErrorCode.INTERNAL_ERROR, "无法连接到代理服务器。请检查 ClashX(7890) 或 Clash Verge(7897) 是否已启动，并确认端口配置正确。")
            
            # 提供更友好的错误消息，指导用户检查网络和代理配置
            if "SSL" in error_detail or "ssl" in error_detail:
                raise error_response(ErrorCode.INTERNAL_ERROR, "AI 分析失败：SSL 连接错误。请检查网络连接或 ClashX 代理配置。")
            else:
                raise error_response(ErrorCode.INTERNAL_ERROR, f"AI 分析失败：网络连接错误。请检查网络连接或稍后重试。")
        except RuntimeError as runtime_err:
            # Gemini 客户端未初始化错误
            logger.error(f"【Part1 分析】Gemini 服务未初始化: {str(runtime_err)}")
            raise error_response(ErrorCode.INTERNAL_ERROR, f"AI 服务未配置，请联系管理员。")
        except TimeoutError as timeout_err:
            # 【超时错误处理】超时错误已在 gemini_service 中处理，这里只是转发
            error_detail = str(timeout_err)
            logger.error(f"【Part1 分析】Gemini API 调用超时: {error_detail}")
            raise error_response(ErrorCode.INTERNAL_ERROR, f"AI 分析超时，请稍后重试。如果问题持续，请联系管理员。")
        except Exception as gemini_err:
            # 其他 Gemini API 调用错误（包括重试后仍然失败的网络错误）
            error_type = type(gemini_err).__name__
            error_detail = str(gemini_err)
            logger.error(f"【Part1 分析】Gemini API 调用失败（已重试）: {error_type}: {error_detail}", exc_info=True)
            
            # 【SSL 错误特殊处理】检测 SSL 相关错误
            if "SSL" in error_detail or "ssl" in error_detail or "UNEXPECTED_EOF" in error_detail:
                raise error_response(ErrorCode.INTERNAL_ERROR, "AI 分析失败：SSL 连接错误。请检查网络连接或 ClashX 代理配置。")
            
            # 【网络连接错误特殊处理】检测网络连接错误（重试后仍然失败）
            if "Server disconnected" in error_detail or "Connection" in error_type or "RemoteProtocolError" in error_type:
                raise error_response(ErrorCode.INTERNAL_ERROR, "AI 分析失败：网络连接中断。已自动重试 3 次仍失败，请检查网络连接或稍后重试。")
            
            raise error_response(ErrorCode.INTERNAL_ERROR, f"AI 分析失败: {error_detail}")
        
        # 【步骤2：JSON 解析清洗逻辑】打印 Gemini 原始输出（完整 RAW OUTPUT）
        # ⚠️ 关键调试：打印最原始的返回，看看 AI 到底说了什么
        logger.info("=" * 80)
        logger.info("========== GEMINI RAW OUTPUT START ==========")
        logger.info(f"Part1 Gemini 原始响应长度: {len(gemini_response)} 字符")
        # 打印完整原始输出（用于调试）
        logger.info(f"Part1 Gemini 完整原始响应:\n{gemini_response}")
        logger.info("========== GEMINI RAW OUTPUT END ==========")
        logger.info("=" * 80)
        
        # 【重要】将完整的 Gemini 响应保存到文件，便于调试和查看
        # 文件路径：/tmp/gemini_response_part1_<timestamp>.json
        timestamp = int(time.time())
        gemini_response_file = f"/tmp/gemini_response_part1_{timestamp}.json"
        try:
            with open(gemini_response_file, 'w', encoding='utf-8') as f:
                f.write(gemini_response)
            logger.info(f"Part1 Gemini 完整响应已保存到: {gemini_response_file}")
        except Exception as save_error:
            logger.warning(f"保存 Gemini 响应到文件失败: {save_error}")

        # 【步骤2：JSON 解析清洗逻辑】使用 clean_json_response 清洗 JSON 响应
        # 防止 Markdown 代码块标记干扰 JSON 解析
        from ..services.prompt_template import clean_json_response
        cleaned_response = clean_json_response(gemini_response)
        logger.info(f"Part1 Gemini JSON 清洗后长度: {len(cleaned_response)} 字符")
        
        # 【步骤2：验证】检查清洗后的 JSON 是否包含新字段
        if "spatial_analysis" in cleaned_response:
            logger.info("✅ 清洗后的 JSON 包含 'spatial_analysis' 字段")
        else:
            logger.warning("⚠️ 清洗后的 JSON 不包含 'spatial_analysis' 字段")
        
        if "ref_visual_subject_box" in cleaned_response:
            logger.info("✅ 清洗后的 JSON 包含 'ref_visual_subject_box' 字段（破坏性命名）")
        else:
            logger.warning("⚠️ 清洗后的 JSON 不包含 'ref_visual_subject_box' 字段")
        
        if "ref_visual_mass_polygon" in cleaned_response:
            logger.info("✅ 清洗后的 JSON 包含 'ref_visual_mass_polygon' 字段")
        else:
            logger.warning("⚠️ 清洗后的 JSON 不包含 'ref_visual_mass_polygon' 字段")

        try:
            gemini_json = json.loads(cleaned_response)
            logger.info(f"Part1 Gemini JSON 解析成功: 类型 = {type(gemini_json)}")
        except NameError as name_error:
            # 👇👇👇 核弹级调试代码开始 👇👇👇
            import traceback
            import sys
            print("\n" + "!"*60)
            print("💥💥💥 在 JSON 解析中抓到凶手了！详细报错如下：")
            print("!"*60)
            traceback.print_exc(file=sys.stdout)  # 强制打印堆栈到终端
            print("!"*60 + "\n")
            # 👆👆👆 核弹级调试代码结束 👆👆👆
            logger.error(f"【Part1 分析】JSON 解析发生 NameError: {name_error}", exc_info=True)
            raise
            if isinstance(gemini_json, dict):
                logger.info(f"Part1 Gemini JSON 是字典，keys = {list(gemini_json.keys())}")
            elif isinstance(gemini_json, list):
                logger.info(f"Part1 Gemini JSON 是数组，长度 = {len(gemini_json)}")
                if len(gemini_json) > 0:
                    logger.info(f"Part1 Gemini JSON 数组第一个元素类型 = {type(gemini_json[0])}")
                    if isinstance(gemini_json[0], dict):
                        logger.info(f"Part1 Gemini JSON 数组第一个元素 keys = {list(gemini_json[0].keys())}")
        except Exception as parse_error:
            logger.warning(f"Part1 Gemini JSON 解析失败: {parse_error}, 尝试使用正则表达式提取")
            import re
            json_match = re.search(r'\{.*\}', gemini_response, re.DOTALL)
            if json_match:
                try:
                    gemini_json = json.loads(json_match.group())
                    logger.info(f"Part1 Gemini JSON 正则提取成功: 类型 = {type(gemini_json)}")
                except Exception as regex_error:
                    logger.error(f"Part1 Gemini JSON 正则提取也失败: {regex_error}")
                    raise ValueError("无法解析 Gemini 返回的 JSON")
            else:
                logger.error("Part1 Gemini 响应中未找到 JSON 格式的数据")
                raise ValueError("无法解析 Gemini 返回的 JSON")

        # 【新增】生成显著性遮罩图（用于前端 Visual Mass 功能）
        # 注意：遮罩图基于参考图（sourceImage）生成，因为构图分析都是针对参考图的
        # 【重要】显著性检测可能耗时较长，使用异步任务或超时控制，避免阻塞主流程
        saliency_mask_url = None
        if sourceImage:
            try:
                logger.info(f"【Part1 分析】开始生成显著性遮罩图（基于参考图）...")
                saliency_start_time = time.time()
                # 【超时控制】显著性检测可能耗时较长，设置超时时间（30秒）
                # 如果超时，不影响主流程，继续使用多边形方案
                # 使用线程池执行显著性检测，避免阻塞主流程（异步执行）
                def _generate_saliency():
                    try:
                        return saliency_service.generate_saliency_mask(
                            image_data=sourceImage,
                            task_id=task.id if task else None,
                            user_id=current_user.id
                        )
                    except Exception as e:
                        logger.error(f"显著性检测线程异常: {type(e).__name__}: {str(e)}", exc_info=True)
                        return None
                
                # 使用 ThreadPoolExecutor 执行显著性检测，设置超时
                # 【注意】concurrent.futures 已在文件顶部导入
                saliency_executor = ThreadPoolExecutor(max_workers=1)
                saliency_future = saliency_executor.submit(_generate_saliency)
                
                try:
                    # 设置超时时间：30秒（显著性检测不应该占用太长时间）
                    saliency_mask_url = saliency_future.result(timeout=30.0)
                    saliency_elapsed = time.time() - saliency_start_time
                    if saliency_mask_url:
                        logger.info(f"【Part1 分析】显著性遮罩图生成成功: {saliency_mask_url}，耗时: {saliency_elapsed:.2f}秒")
                    else:
                        logger.warning(f"【Part1 分析】显著性遮罩图生成失败（返回 None），耗时: {saliency_elapsed:.2f}秒，将使用多边形方案（visual_mass.vertices）")
                except FutureTimeoutError:
                    saliency_elapsed = time.time() - saliency_start_time
                    logger.warning(f"【Part1 分析】显著性遮罩图生成超时（超过 30 秒），耗时: {saliency_elapsed:.2f}秒，将使用多边形方案（visual_mass.vertices）")
                    # 取消任务（如果可能）
                    saliency_future.cancel()
                finally:
                    saliency_executor.shutdown(wait=False)  # 不等待，立即关闭线程池
                    
            except Exception as saliency_err:
                # 显著性检测失败不影响主流程，记录警告即可
                error_type = type(saliency_err).__name__
                error_detail = str(saliency_err)
                logger.warning(f"【Part1 分析】显著性遮罩图生成失败: {error_type}: {error_detail}，将使用多边形方案（visual_mass.vertices）")
                # 不抛出异常，继续执行主流程
        
        # 调试日志：记录传递给 format_part1 的数据类型和内容
        logger.info(f"Part1 调用 format_part1: gemini_json 类型 = {type(gemini_json)}, feasibility_result 类型 = {type(feasibility_result)}")
        if isinstance(gemini_json, dict):
            logger.info(f"Part1 gemini_json keys = {list(gemini_json.keys())}")
            # 检查是否包含 professional_evaluation 和 composition
            if "professional_evaluation" in gemini_json:
                pe = gemini_json.get("professional_evaluation", {})
                logger.info(f"Part1 gemini_json 包含 professional_evaluation: 类型 = {type(pe)}, keys = {list(pe.keys()) if isinstance(pe, dict) else 'not dict'}")
            else:
                logger.warning("Part1 gemini_json 不包含 professional_evaluation 字段！")
            if "composition" in gemini_json:
                comp = gemini_json.get("composition", {})
                logger.info(f"Part1 gemini_json 包含 composition: 类型 = {type(comp)}, keys = {list(comp.keys()) if isinstance(comp, dict) else 'not dict'}")
            else:
                logger.warning("Part1 gemini_json 不包含 composition 字段！")
        if feasibility_result:
            logger.debug(f"Part1 feasibility_result keys = {list(feasibility_result.keys()) if isinstance(feasibility_result, dict) else 'not dict'}")

        # 调用 format_part1 格式化数据（添加异常处理，确保即使格式化失败也能返回错误结构）
        # 【新增】传递显著性遮罩图 URL 到 formatter
        try:
            structured_result = formatter.format_part1(gemini_json, feasibility_result, saliency_mask_url=saliency_mask_url)
        except NameError as name_error:
            # 【关键修复】捕获 NameError，记录详细的错误信息，包括变量名和堆栈跟踪
            error_detail = str(name_error)
            import traceback
            tb_str = ''.join(traceback.format_exception(type(name_error), name_error, name_error.__traceback__))
            logger.error(f"Part1 格式化过程发生 NameError: {error_detail}", exc_info=True)
            logger.error(f"Part1 NameError 完整堆栈跟踪:\n{tb_str}")
            logger.error(f"Part1 NameError 详细信息: 错误类型={type(name_error).__name__}, 错误消息={error_detail}")
            # 如果是 'x' is not defined 错误，提供更详细的诊断信息
            if "'x' is not defined" in error_detail or "name 'x'" in error_detail:
                logger.error("Part1 NameError 诊断: 检测到 'x' 变量未定义错误，可能发生在坐标处理逻辑中")
                logger.error("Part1 NameError 诊断: 请检查 analysis_formatter.py 中的 validate_and_fix_coords 函数和所有坐标处理逻辑")
                # 尝试从堆栈跟踪中提取文件名和行号
                if hasattr(name_error, '__traceback__') and name_error.__traceback__:
                    tb = name_error.__traceback__
                    frame_count = 0
                    while tb and frame_count < 20:  # 限制最多20层，避免无限循环
                        filename = tb.tb_frame.f_code.co_filename
                        lineno = tb.tb_lineno
                        func_name = tb.tb_frame.f_code.co_name
                        # 读取该行的代码
                        try:
                            with open(filename, 'r', encoding='utf-8') as f:
                                code_lines = f.readlines()
                                if lineno <= len(code_lines):
                                    code_line = code_lines[lineno - 1].strip()
                                    logger.error(f"Part1 NameError 位置 {frame_count}: 文件={filename}, 行号={lineno}, 函数={func_name}, 代码={code_line}")
                        except Exception:
                            logger.error(f"Part1 NameError 位置 {frame_count}: 文件={filename}, 行号={lineno}, 函数={func_name}")
                        tb = tb.tb_next
                        frame_count += 1
            raise  # 重新抛出异常，让外层处理
        except Exception as format_error:
            # 如果格式化失败，记录详细错误信息并返回错误结构
            logger.error(f"Part1 格式化过程发生异常: {format_error}", exc_info=True)
            # format_part1 内部已经有异常处理，但如果仍然抛出异常，说明是严重错误
            # 创建一个基本的错误结构，确保接口能正常返回
            structured_result = {
                "protocolVersion": "2025-02",
                "stage": "part1",
                "meta": {
                    "warnings": [f"格式化失败: {str(format_error)}"],
                    "rawNaturalLanguage": "",
                },
                "sections": {
                    "photoReview": {
                        "naturalLanguage": {},
                        "structured": {
                            "overviewSummary": "",
                            "dimensions": {},
                            "photographerStyleSummary": "",
                        },
                    },
                    "composition": {
                        "naturalLanguage": {},
                        "structured": {
                            "advanced_sections": {},
                        },
                    },
                    "lighting": {
                        "naturalLanguage": {},
                        "structured": {},
                    },
                    "color": {
                        "naturalLanguage": {},
                        "structured": {},
                    },
                },
            }
        
        # 调试日志：记录格式化后的结果
        logger.info(f"Part1 格式化完成: structured_result keys = {list(structured_result.keys()) if isinstance(structured_result, dict) else 'not dict'}")
        if isinstance(structured_result, dict) and "sections" in structured_result:
            sections = structured_result.get("sections", {})
            logger.info(f"Part1 sections keys = {list(sections.keys())}")
            if "photoReview" in sections:
                photo_review = sections.get("photoReview", {})
                logger.info(f"Part1 photoReview keys = {list(photo_review.keys())}")
                if "structured" in photo_review:
                    structured_data = photo_review.get("structured", {})
                    logger.info(f"Part1 photoReview.structured keys = {list(structured_data.keys())}")
                    # 【新增】记录关键字段
                    logger.info(f"Part1 style_summary 长度 = {len(structured_data.get('style_summary', ''))} 字符")
                    logger.info(f"Part1 comprehensive_review 长度 = {len(structured_data.get('comprehensive_review', ''))} 字符")
                    logger.debug(f"Part1 overviewSummary = {structured_data.get('overviewSummary', 'empty')[:100] if structured_data.get('overviewSummary') else 'empty'}...")
                    # 【新增】记录 simulated_histogram_data
                    histogram_data = structured_data.get('simulated_histogram_data')
                    if histogram_data:
                        logger.info(f"Part1 simulated_histogram_data 存在, keys = {list(histogram_data.keys()) if isinstance(histogram_data, dict) else 'not dict'}")
                    else:
                        logger.warning(f"Part1 simulated_histogram_data 不存在或为空")
                    # 【新增】记录 overlays 数据（用于前端图片高亮显示）
                    overlays = structured_data.get('overlays', {})
                    if overlays and isinstance(overlays, dict):
                        logger.info(f"Part1 overlays keys = {list(overlays.keys())}")
                        for key, value in overlays.items():
                            if isinstance(value, dict):
                                logger.debug(f"Part1 overlays.{key} = {{x: {value.get('x', 'N/A')}, y: {value.get('y', 'N/A')}, w: {value.get('w', 'N/A')}, h: {value.get('h', 'N/A')}, label: {value.get('label', 'N/A')}}}")
                    else:
                        logger.warning(f"Part1 overlays 为空或格式不正确，类型 = {type(overlays)}")
                        logger.warning(f"Part1 ⚠️ overlays 数据缺失，前端将无法显示图片区域高亮功能")
            if "composition" in sections:
                composition = sections.get("composition", {})
                logger.info(f"Part1 composition keys = {list(composition.keys())}")
                if "structured" in composition:
                    comp_structured = composition.get("structured", {})
                    logger.info(f"Part1 composition.structured keys = {list(comp_structured.keys())}")
                    if "advanced_sections" in comp_structured:
                        adv_sections = comp_structured.get("advanced_sections", {})
                        logger.info(f"Part1 advanced_sections keys = {list(adv_sections.keys()) if isinstance(adv_sections, dict) else 'not dict'}")

        # 更新任务 Part1 结果（添加异常处理，确保数据库操作失败时能正确返回错误）
        try:
            task_service.update_task_part1(
                db,
                task.id,
                gemini_json,
                structured_result,
                gemini_response,
                structured_result.get("sections", {}).get("photoReview", {}).get("structured", {}).get("overviewSummary", ""),
                json.dumps(structured_result.get("workflow_draft", {})),
                feasibility_result,
            )
            logger.info(f"【Part1 分析】任务 Part1 结果更新成功: taskId={task.id}")
        except Exception as db_error:
            # 数据库操作失败（可能是数据太大导致 SQLite 操作超时或失败）
            error_type = type(db_error).__name__
            error_detail = str(db_error)
            logger.error(f"【Part1 分析】任务 Part1 结果更新失败: {error_type}: {error_detail}", exc_info=True)
            # 即使数据库更新失败，也尝试返回分析结果（因为分析已经完成）
            # 但记录警告，提示用户结果可能未保存
            logger.warning(f"【Part1 分析】⚠️ 分析结果已生成，但保存到数据库失败，将返回结果但不保存")
            # 不抛出异常，继续返回结果

        return success_response(
            data={
                "taskId": task.id,
                "stage": "part1",
                "status": "part1_completed",
                "structuredAnalysis": structured_result,
                "naturalLanguage": gemini_response,
                "protocolVersion": "2025-02",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        # 【增强错误处理】记录详细的错误信息，包括错误类型、错误消息、堆栈跟踪
        error_type = type(e).__name__
        error_detail = str(e)
        logger.error(f"【Part1 分析】❌ 分析失败: {error_type}: {error_detail}", exc_info=True)
        logger.error(f"【Part1 分析】请求路径: /api/analyze/part1")
        logger.error(f"【Part1 分析】uploadId: {request_data.uploadId if hasattr(request_data, 'uploadId') else 'unknown'}")
        raise error_response(ErrorCode.INTERNAL_ERROR, f"Part1 分析失败: {error_detail}")


@router.post("/part2")
async def analyze_part2(
    request_data: Part2RequestSchema = Body(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    Part2 分析接口（异步执行）
    
    根据开发方案第 16 节和第 793 行，Part2 接口应立即返回 { status: 'processing' }，
    实际的 Gemini 调用和数据库更新在后台异步执行，前端通过轮询获取结果。
    
    【重要】参数格式：
        - 请求体格式：JSON body { "taskId": "uuid" }
        - 根据开发方案第 793 行：接口：POST /api/analyze/part2，请求体 { taskId }
        - 前端发送的是 JSON 格式：body: JSON.stringify({ taskId })
    
    Args:
        request_data: 请求数据（JSON body）
            {
                "taskId": str  # 任务 ID（从 Part1 返回，必填）
            }
        credentials: JWT Token（Bearer）
        db: 数据库会话
        
    Returns:
        {
            "code": 0,
            "message": "ok",
            "data": {
                "taskId": "uuid",
                "stage": "part2",
                "status": "processing"  # 立即返回 processing 状态
            }
        }
        
    Note:
        - 后台任务会执行 Gemini API 调用、数据格式化、数据库更新
        - 前端需要通过 GET /api/analyze/{taskId} 轮询获取最终结果
        - 轮询间隔建议 3 秒，最大轮询时长 2 分钟
    """
    # 【日志记录】记录请求接收时间，用于追踪请求处理时间
    request_start_time = time.time()
    taskId = request_data.taskId  # 从请求数据中提取 taskId
    logger.info(f"【Part2 请求开始】taskId={taskId}, 时间戳={request_start_time}")
    logger.info(f"【Part2 请求数据】request_data={request_data.model_dump()}")
    try:
        # 1. 验证用户身份
        current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)
        logger.info(f"【Part2 用户验证完成】userId={current_user.id}, taskId={taskId}, 耗时={time.time() - request_start_time:.2f}秒")
        
        # 2. 获取任务信息
        task = task_service.get_task(db, taskId)
        if not task:
            raise error_response(ErrorCode.TASK_NOT_FOUND, "任务不存在")

        if task.user_id != current_user.id:
            raise error_response(ErrorCode.FORBIDDEN, "无权访问此任务")

        # 3. 检查用量限制（严格限流，超出则返回错误码）
        # 注意：管理员账号不受用量限制（根据开发方案，管理员拥有所有权限）
        allowed, error_code = usage_service.check_usage_limit(db, current_user.id, "analysis", user_role=current_user.role)
        if not allowed:
            raise error_response(error_code, "分析次数已达上限")

        # 4. 立即返回 processing 状态，并在后台执行实际分析
        # 根据开发方案第 16 节，Part2 接口应立即返回 { status: 'processing' }
        # 实际的 Gemini 调用和数据库更新在后台异步执行
        asyncio.create_task(
            _run_part2_analysis_job(
                task_id=taskId,
                user_id=current_user.id,
                db_session=db,
            )
        )
        request_elapsed_time = time.time() - request_start_time
        logger.info(f"【Part2 任务已提交后台】taskId={taskId}, 请求处理耗时={request_elapsed_time:.2f}秒, 即将返回响应")
        response_data = success_response(data={"taskId": taskId, "stage": "part2", "status": "processing"})
        logger.info(f"【Part2 请求完成】taskId={taskId}, 总耗时={time.time() - request_start_time:.2f}秒, 响应状态=processing")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"【Part2 请求失败】taskId={taskId}, 错误: {e}", exc_info=True)
        raise error_response(ErrorCode.INTERNAL_ERROR, f"Part2 分析请求失败: {str(e)}")


async def _run_part2_analysis_job(task_id: str, user_id: int, db_session: Session):
    """
    后台执行 Part2 分析任务的实际逻辑
    
    根据开发方案第 16 节，此函数在后台异步执行，包括：
    1. 调用 Gemini API 获取 Part2 分析结果
    2. 格式化数据（使用 analysis_formatter）
    3. 更新数据库（task_service.update_task_part2）
    4. 更新任务状态为 completed 或 failed
    
    Args:
        task_id: 任务 ID
        user_id: 用户 ID（用于日志记录）
        db_session: 数据库会话（注意：后台任务需要使用新的数据库会话）
        
    Note:
        - 此函数在后台异步执行，不会阻塞前端请求
        - 如果执行失败，会将任务状态更新为 failed，并记录详细错误信息
        - 前端通过轮询 GET /api/analyze/{taskId} 获取最终结果
    """
    # 【日志记录】记录后台任务开始时间
    job_start_time = time.time()
    logger.info(f"【Part2 后台任务开始】taskId={task_id}, 时间戳={job_start_time}, userId={user_id}")
    # 创建一个新的数据库会话，因为后台任务在不同的事件循环中运行
    # 并且 db_session 是通过 Depends 注入的，不能直接在后台任务中重用
    db: Session = next(get_db())
    try:
        # 1. 获取任务信息
        task = task_service.get_task(db, task_id)
        if not task:
            error_msg = f"任务不存在: taskId={task_id}"
            logger.error(f"【Part2 后台任务失败】{error_msg}")
            # 如果任务不存在，尝试更新任务状态为失败（虽然任务不存在，但为了前端能获取到错误信息）
            db_for_error: Session = next(get_db())
            try:
                task_service.update_task_status(db_for_error, task_id, "failed", error_msg)
                logger.info(f"【Part2 任务状态已更新为失败（任务不存在）】taskId={task_id}")
            except Exception:
                pass  # 如果任务不存在，更新状态也会失败，忽略此错误
            finally:
                db_for_error.close()
            return
        
        # 【日志记录】记录任务基本信息
        logger.info(f"【Part2 后台任务】任务信息: taskId={task_id}, userId={task.user_id}, 当前状态={task.status}, 是否有源图={bool(task.source_image_data)}, 是否有目标图={bool(task.target_image_data)}")
        
        # 2. 将任务状态设置为 processing（表示正在处理中）
        task_service.update_task_status(db, task_id, "processing")
        logger.info(f"【Part2 任务状态已设置为 processing】taskId={task_id}")

        # 3. 准备 Part1 上下文和 style_summary
        part1_context = {
            "professional_evaluation_summary": task.part1_summary or "",
            "workflow_draft": json.loads(task.workflow_draft) if task.workflow_draft else {},
        }
        
        # 从 Part1 结果中提取 style_summary（风格克隆战略指导）
        # 路径：structured_result.sections.photoReview.structured.photographerStyleSummary
        style_summary = ""
        if task.structured_result:
            try:
                sections = task.structured_result.get("sections", {})
                photo_review = sections.get("photoReview", {})
                structured = photo_review.get("structured", {})
                style_summary = structured.get("photographerStyleSummary", "")
                
                # 如果 photographerStyleSummary 为空，尝试从其他路径提取
                if not style_summary:
                    # 尝试从 gemini_result 中提取（新 Prompt 结构：module_1_critique.style_summary）
                    if task.gemini_result:
                        try:
                            module_1 = task.gemini_result.get("module_1_critique", {})
                            if isinstance(module_1, dict):
                                style_summary = module_1.get("style_summary", "")
                                if style_summary:
                                    logger.info(f"Part2 从 gemini_result.module_1_critique.style_summary 提取到 style_summary, taskId={task_id}")
                        except Exception as e:
                            logger.warning(f"Part2 从 gemini_result 提取 style_summary 失败: {e}, taskId={task_id}")
                    
                    if not style_summary:
                        logger.warning(f"Part2 未找到 style_summary，Part2 将无法使用 Phase 1 的战略指导, taskId={task_id}")
                
                logger.info(f"Part2 提取 style_summary 长度: {len(style_summary) if style_summary else 0} 字符, taskId={task_id}")
                if style_summary:
                    logger.debug(f"Part2 style_summary 前 200 字符: {style_summary[:200]}..., taskId={task_id}")
            except Exception as e:
                logger.error(f"Part2 提取 style_summary 失败: {e}, taskId={task_id}", exc_info=True)
                style_summary = ""

        # 4. 构建 Prompt 和 Gemini API 请求内容
        prompt = prompt_template.get_part2_prompt(
            task.source_image_data or "",
            task.target_image_data,
            part1_context,
            style_summary=style_summary,  # 传递 style_summary
            feasibility_result=task.feasibility_result,
        )

        # 【方案2：图片标记】在每张图片前添加文本标记，明确标识图片类型，防止 Gemini 混淆图片顺序
        contents = [{"role": "user", "parts": [{"text": prompt}]}]
        if task.source_image_data:
            # 【方案2：图片标记】在参考图前添加文本标记
            contents[0]["parts"].append({
                "text": "【图片1：参考图（Reference Image）】这是第一张图片，是目标风格图。"
            })
            contents[0]["parts"].append({
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": task.source_image_data.split(",")[-1] if "," in task.source_image_data else task.source_image_data,
                }
            })
        if task.target_image_data:
            # 【方案2：图片标记】在用户图前添加文本标记
            contents[0]["parts"].append({
                "text": "【图片2：用户图（User Image）】这是第二张图片，是需要处理的图片。"
            })
            contents[0]["parts"].append({
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": task.target_image_data.split(",")[-1] if "," in task.target_image_data else task.target_image_data,
                }
            })
        
        # 【方案4：验证日志】记录 Part2 图片顺序
        logger.info(f"【Part2 分析】图片顺序确认：第一张图片（参考图）base64长度={len(task.source_image_data.split(',')[-1]) if task.source_image_data and ',' in task.source_image_data else len(task.source_image_data) if task.source_image_data else 0}, 第二张图片（用户图）base64长度={len(task.target_image_data.split(',')[-1]) if task.target_image_data and ',' in task.target_image_data else len(task.target_image_data) if task.target_image_data else 0}")

        # 5. 调用 Gemini API
        logger.info(f"Part2 开始调用 Gemini API, taskId={task_id}")
        gemini_response = gemini_service.generate_text(contents, stage="part2")
        logger.info(f"Part2 Gemini API 调用完成，响应长度: {len(gemini_response)} 字符, taskId={task_id}")
        logger.debug(f"Part2 Gemini 原始响应前 500 字符: {gemini_response[:500]}..., taskId={task_id}")
        
        # 6. 保存 Gemini 响应到文件（便于调试）
        timestamp = int(time.time())
        gemini_response_file = f"/tmp/gemini_response_part2_{timestamp}.json"
        try:
            with open(gemini_response_file, 'w', encoding='utf-8') as f:
                f.write(gemini_response)
            logger.info(f"Part2 Gemini 完整响应已保存到: {gemini_response_file}, taskId={task_id}")
        except Exception as save_error:
            logger.warning(f"Part2 保存 Gemini 响应到文件失败: {save_error}, taskId={task_id}")

        # 7. 解析 Gemini JSON 响应
        try:
            gemini_json = json.loads(gemini_response)
            logger.info(f"Part2 Gemini JSON 解析成功: 类型 = {type(gemini_json)}, taskId={task_id}")
        except Exception as parse_error:
            logger.warning(f"Part2 Gemini JSON 解析失败: {parse_error}, 尝试使用正则表达式提取, taskId={task_id}")
            import re
            json_match = re.search(r'\{.*\}', gemini_response, re.DOTALL)
            if json_match:
                try:
                    gemini_json = json.loads(json_match.group())
                    logger.info(f"Part2 Gemini JSON 正则提取成功: 类型 = {type(gemini_json)}, taskId={task_id}")
                except Exception as regex_error:
                    logger.error(f"Part2 Gemini JSON 正则提取也失败: {regex_error}, taskId={task_id}")
                    raise ValueError("无法解析 Gemini 返回的 JSON")
            else:
                logger.error(f"Part2 Gemini 响应中未找到 JSON 格式的数据, taskId={task_id}")
                raise ValueError("无法解析 Gemini 返回的 JSON")

        # 8. 从 Gemini 响应中提取 workflow_execution_summary 和 workflow_alignment_notes
        # 【注意】新的 Part2 Prompt 结构不包含 workflow_execution_summary 字段
        # 新格式只包含 phase_1_extraction.style_summary_recap 和 phase_1_extraction.key_adjustment_strategy
        # 为了向后兼容，我们仍然尝试提取，但如果不存在则使用空字符串
        workflow_execution_summary = ""
        if isinstance(gemini_json, dict):
            # 优先从新格式中提取（虽然新格式不包含此字段，但为了向后兼容仍尝试）
            phase_1_extraction = gemini_json.get("phase_1_extraction", {})
            if isinstance(phase_1_extraction, dict):
                workflow_execution_summary = phase_1_extraction.get("workflow_execution_summary", "")
            # 如果没有，尝试从顶层获取（旧格式）
            if not workflow_execution_summary:
                workflow_execution_summary = gemini_json.get("workflow_execution_summary", "")
        
        # 如果仍然为空，尝试从 phase_1_extraction 中组合 style_summary_recap 和 key_adjustment_strategy
        # 作为 workflow_execution_summary 的替代（虽然不是完全相同的字段，但可以作为工作流摘要）
        if not workflow_execution_summary and isinstance(gemini_json, dict):
            phase_1_extraction = gemini_json.get("phase_1_extraction", {})
            if isinstance(phase_1_extraction, dict):
                style_summary_recap = phase_1_extraction.get("style_summary_recap", "")
                key_adjustment_strategy = phase_1_extraction.get("key_adjustment_strategy", "")
                if style_summary_recap or key_adjustment_strategy:
                    workflow_execution_summary = f"{style_summary_recap}\n\n{key_adjustment_strategy}".strip()
                    logger.info(f"Part2 从 phase_1_extraction 组合生成 workflow_execution_summary, taskId={task_id}")
        
        # workflow_alignment_notes 可能在新格式中不存在，使用空字符串
        workflow_alignment_notes = gemini_json.get("workflow_alignment_notes", "") if isinstance(gemini_json, dict) else ""

        # 9. 格式化数据
        logger.info(f"Part2 开始格式化数据: gemini_json 类型 = {type(gemini_json)}, keys = {list(gemini_json.keys()) if isinstance(gemini_json, dict) else 'not dict'}, taskId={task_id}")
        try:
            structured_result = formatter.format_part2(gemini_json, task.structured_result)
            logger.info(f"Part2 格式化成功: structured_result keys = {list(structured_result.keys()) if isinstance(structured_result, dict) else 'not dict'}, taskId={task_id}")
            
            # 【详细日志】记录格式化后的 sections 结构
            if isinstance(structured_result, dict) and "sections" in structured_result:
                sections = structured_result.get("sections", {})
                logger.info(f"Part2 sections keys: {list(sections.keys())}, taskId={task_id}")
                
                # 检查 color section
                if "color" in sections:
                    color_section = sections.get("color", {})
                    color_structured = color_section.get("structured", {})
                    logger.info(f"Part2 color section: has structured = {bool(color_structured)}, structured keys = {list(color_structured.keys()) if isinstance(color_structured, dict) else 'not dict'}, taskId={task_id}")
                    logger.debug(f"Part2 color structured preview: whiteBalance = {bool(color_structured.get('whiteBalance'))}, grading = {bool(color_structured.get('grading'))}, hsl = {len(color_structured.get('hsl', []))} items, taskId={task_id}")
                    # 【关键】检查三个新字段是否存在
                    logger.info(f"Part2 color phase_1_extraction 字段检查: master_style_recap = {bool(color_structured.get('master_style_recap'))}, style_summary_recap = {bool(color_structured.get('style_summary_recap'))}, key_adjustment_strategy = {bool(color_structured.get('key_adjustment_strategy'))}, taskId={task_id}")
                    if color_structured.get('master_style_recap'):
                        logger.info(f"Part2 color master_style_recap 内容预览: {color_structured.get('master_style_recap')[:100]}..., taskId={task_id}")
                    if color_structured.get('style_summary_recap'):
                        logger.info(f"Part2 color style_summary_recap 内容预览: {color_structured.get('style_summary_recap')[:100]}..., taskId={task_id}")
                    if color_structured.get('key_adjustment_strategy'):
                        logger.info(f"Part2 color key_adjustment_strategy 内容预览: {color_structured.get('key_adjustment_strategy')[:100]}..., taskId={task_id}")
                
                # 检查 lightroom section
                if "lightroom" in sections:
                    lightroom_section = sections.get("lightroom", {})
                    lightroom_structured = lightroom_section.get("structured", {})
                    logger.info(f"Part2 lightroom section: has structured = {bool(lightroom_structured)}, structured keys = {list(lightroom_structured.keys()) if isinstance(lightroom_structured, dict) else 'not dict'}, taskId={task_id}")
                    logger.debug(f"Part2 lightroom structured preview: panels = {len(lightroom_structured.get('panels', []))} items, has toneCurve = {bool(lightroom_structured.get('toneCurve'))}, has colorGrading = {bool(lightroom_structured.get('colorGrading'))}, taskId={task_id}")
                
                # 检查 photoshop section
                if "photoshop" in sections:
                    photoshop_section = sections.get("photoshop", {})
                    photoshop_structured = photoshop_section.get("structured", {})
                    logger.info(f"Part2 photoshop section: has structured = {bool(photoshop_structured)}, structured keys = {list(photoshop_structured.keys()) if isinstance(photoshop_structured, dict) else 'not dict'}, taskId={task_id}")
                    logger.debug(f"Part2 photoshop structured preview: steps = {len(photoshop_structured.get('steps', []))} items, taskId={task_id}")
        except Exception as format_error:
            logger.error(f"Part2 格式化过程发生异常: {format_error}, taskId={task_id}", exc_info=True)
            # 如果格式化失败，创建一个基本的错误结构，确保接口能正常返回
            structured_result = {
                "protocolVersion": "2025-02",
                "stage": "part2",
                "meta": {
                    "warnings": [f"格式化失败: {str(format_error)}"],
                    "rawNaturalLanguage": "",
                },
                "sections": {
                    "lightroom": {
                        "naturalLanguage": {},
                        "structured": {
                            "panels": [],
                            "toneCurve": [[0, 0], [64, 64], [128, 128], [192, 192], [255, 255]],
                            "rgbCurves": {},
                            "colorGrading": {},
                            "localAdjustments": [],
                        },
                    },
                    "photoshop": {
                        "naturalLanguage": {},
                        "structured": {
                            "steps": [],
                        },
                    },
                    "color": {
                        "naturalLanguage": {},
                        "structured": {
                            "styleKey": "",
                            "whiteBalance": {
                                "temp": {"range": "+0"},
                                "tint": {"range": "+0"},
                            },
                            "grading": {
                                "highlights": {"hue": 0, "saturation": 0},
                                "midtones": {"hue": 0, "saturation": 0},
                                "shadows": {"hue": 0, "saturation": 0},
                                "balance": 0,
                            },
                            "hsl": [],
                        },
                    },
                },
            }

        # 10. 准备数据库更新数据
        logger.info(f"Part2 格式化完成: structured_result keys = {list(structured_result.keys()) if isinstance(structured_result, dict) else 'not dict'}, taskId={task_id}")
        logger.info(f"Part2 workflow_execution_summary 长度: {len(workflow_execution_summary)} 字符, taskId={task_id}")
        logger.info(f"Part2 workflow_alignment_notes 长度: {len(workflow_alignment_notes)} 字符, taskId={task_id}")

        # 将 workflow_execution_summary 转换为 JSON 字符串（根据开发方案，workflow_final 应存储为 JSON 字符串）
        workflow_final_json = json.dumps({"workflow_execution_summary": workflow_execution_summary}) if workflow_execution_summary else json.dumps({"workflow_execution_summary": ""})
        
        # 10. 更新数据库
        logger.info(f"Part2 开始更新数据库..., taskId={task_id}")
        logger.info(f"Part2 更新数据库参数: taskId={task_id}, workflow_final_json长度={len(workflow_final_json)}, workflow_alignment_notes长度={len(workflow_alignment_notes)}")
        
        # 【详细日志】记录要更新的 structured_result 结构
        if isinstance(structured_result, dict) and "sections" in structured_result:
            sections_to_update = structured_result.get("sections", {})
            logger.info(f"Part2 要更新的 sections keys: {list(sections_to_update.keys())}, taskId={task_id}")
            logger.debug(f"Part2 要更新的 sections 详情: lightroom = {'存在' if 'lightroom' in sections_to_update else '不存在'}, photoshop = {'存在' if 'photoshop' in sections_to_update else '不存在'}, color = {'存在' if 'color' in sections_to_update else '不存在'}, taskId={task_id}")
        else:
            logger.warning(f"Part2 structured_result 中没有 sections 字段, taskId={task_id}")
        
        try:
            task_service.update_task_part2(
                db,
                task.id,
                gemini_json,
                structured_result,
                gemini_response,
                workflow_final_json,  # 使用 JSON 字符串格式的 workflow_final
                workflow_alignment_notes,
            )
            logger.info(f"Part2 数据库更新完成, taskId={task_id}")
        except Exception as db_error:
            logger.error(f"Part2 数据库更新失败: {db_error}, taskId={task_id}", exc_info=True)
            # 即使数据库更新失败，也尝试将任务状态设置为失败，并记录原因
            task_service.update_task_status(db, task_id, "failed", f"数据库更新失败: {str(db_error)}")
            raise error_response(ErrorCode.INTERNAL_ERROR, f"Part2 数据库更新失败: {str(db_error)}")
        
        # 【日志记录】记录后台任务完成时间和总耗时
        job_elapsed_time = time.time() - job_start_time
        logger.info(f"【Part2 后台任务成功】taskId={task_id}, 总耗时={job_elapsed_time:.2f}秒, 任务状态=completed")
    except Exception as e:
        # 【日志记录】记录后台任务失败时间和总耗时
        job_elapsed_time = time.time() - job_start_time
        # 【增强错误日志】记录详细的错误信息，包括错误类型、错误消息、堆栈跟踪
        error_type = type(e).__name__
        error_message = str(e)
        logger.error(f"【Part2 后台任务失败】taskId={task_id}, 错误类型: {error_type}, 错误消息: {error_message}, 耗时={job_elapsed_time:.2f}秒", exc_info=True)
        
        # 【关键修复】明确提示代理连接拒绝错误
        if "Connection refused" in error_message or "Errno 61" in error_message:
            error_message = "无法连接到代理服务器。请检查 ClashX(7890) 或 Clash Verge(7897) 是否已启动，并确认端口配置正确。"
            logger.error(f"【Part2 后台任务失败】检测到代理连接错误: {error_message}")
        
        # 【构建详细的失败原因】包含错误类型和错误消息，便于前端显示和调试
        status_reason = f"Part2 后台分析失败: {error_type}: {error_message}"
        # 如果错误消息过长，截取前 500 个字符（避免数据库字段过长）
        if len(status_reason) > 500:
            status_reason = status_reason[:500] + "..."
        
        # 确保任务状态被更新为失败
        db_for_update: Session = next(get_db())
        try:
            task_service.update_task_status(db_for_update, task_id, "failed", status_reason)
            logger.info(f"【Part2 任务状态已更新为失败】taskId={task_id}, status_reason={status_reason}")
        except Exception as status_error:
            logger.error(f"【Part2 更新任务状态失败】taskId={task_id}, 错误: {status_error}", exc_info=True)
        finally:
            db_for_update.close()
    finally:
        db.close()
        logger.info(f"【Part2 后台任务结束】taskId={task_id}, 数据库会话已关闭")


@router.get("/{taskId}")
async def get_task(
    taskId: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """获取任务详情"""
    current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)
    
    task = task_service.get_task(db, taskId)
    if not task:
        raise error_response(ErrorCode.TASK_NOT_FOUND, "任务不存在")

    if task.user_id != current_user.id:
        raise error_response(ErrorCode.FORBIDDEN, "无权访问此任务")

    # 【返回任务详情】根据开发方案，返回任务状态和结果
    # 注意：status_reason 字段用于记录任务失败原因（如果任务状态为 failed）
    # 【调试日志】记录返回的 structured_result 结构，用于排查数据丢失问题
    if task.structured_result and isinstance(task.structured_result, dict):
        sections = task.structured_result.get("sections", {})
        if "lightroom" in sections:
            lightroom_section = sections.get("lightroom", {})
            lightroom_structured = lightroom_section.get("structured", {}) if isinstance(lightroom_section, dict) else {}
            lightroom_panels = lightroom_structured.get("panels", []) if isinstance(lightroom_structured, dict) else []
            logger.info(f"【get_task】返回的 lightroom section: has structured = {bool(lightroom_structured)}, panels count = {len(lightroom_panels) if isinstance(lightroom_panels, list) else 0}, taskId={taskId}")
            # 【详细检查】检查 panels 的内容是否为空
            if isinstance(lightroom_panels, list) and len(lightroom_panels) > 0:
                first_panel = lightroom_panels[0]
                has_content = bool(first_panel.get("title") or first_panel.get("description") or first_panel.get("params"))
                logger.debug(f"【get_task】lightroom 第一个 panel 是否有内容: {has_content}, title = {first_panel.get('title')}, params count = {len(first_panel.get('params', []))}, taskId={taskId}")
                if not has_content:
                    logger.error(f"【get_task】❌ lightroom panels 内容为空！第一个 panel: {json.dumps(first_panel, ensure_ascii=False)[:200]}, taskId={taskId}")
    
    # 【日志记录】如果任务失败，记录失败原因
    if task.status == "failed":
        logger.warning(f"【get_task】⚠️ 任务失败: taskId={taskId}, status_reason={task.status_reason if hasattr(task, 'status_reason') and task.status_reason else '未提供失败原因'}")
    
    return {
        "code": 0,
        "message": "ok",
        "data": {
            "task": {
                "id": task.id,
                "status": task.status,
                "status_reason": task.status_reason if hasattr(task, 'status_reason') else None,  # 任务失败原因（可选）
                "feasibility_result": task.feasibility_result,
                "created_at": task.created_at.isoformat(),
            },
            "structuredResult": task.structured_result,
        },
    }


@router.get("/history")
async def get_history(
    limit: int = 20,
    page: int = 1,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """获取历史任务列表"""
    current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)

    tasks = (
        db.query(AnalysisTask)
        .filter(AnalysisTask.user_id == current_user.id)
        .order_by(desc(AnalysisTask.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    # 计算总数（用于分页）
    total = db.query(func.count(AnalysisTask.id)).filter(
        AnalysisTask.user_id == current_user.id
    ).scalar() or 0

    return success_response(
        data={
            "items": [
                {
                    "taskId": t.id,
                    "created_at": t.created_at.isoformat(),
                    "status": t.status,
                    "feasibilityScore": t.feasibility_result.get("feasibilityScore") if t.feasibility_result else None,
                }
                for t in tasks
            ],
            "page": page,
            "pageSize": limit,
            "total": total,  # 添加总数字段，前端需要用于分页
        },
    )


@router.post("/diagnosis")
async def analyze_diagnosis(
    request_data: DiagnosisRequestSchema = Body(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    AI 诊断接口
    根据色彩雷达和AI诊断功能完整设计方案实现
    提供专业的摄影诊断报告（多维评分、问题定位、改进建议）
    
    Args:
        request_data: 诊断请求数据
            {
                "imageUrl": str,  # 图片 URL 或 base64（低分辨率，建议 512x512）
                "histogramData": {
                    "r": [0, 1, 2, ...],  # 256 个整数，红色通道分布
                    "g": [0, 1, 2, ...],  # 绿色通道分布
                    "b": [0, 1, 2, ...],  # 蓝色通道分布
                    "l": [0, 1, 2, ...],  # 亮度分布
                    "avgL": 128,  # 平均亮度
                    "shadows": 0.2,  # 暗部比例
                    "midtones": 0.5,  # 中间调比例
                    "highlights": 0.8  # 高光比例
                },
                "dominantColors": [
                    {"h": 180, "s": 0.8, "v": 0.9, "hex": "#00FFFF"},
                    ...
                ],
                "taskId": str  # 可选，关联已有分析任务
            }
        credentials: JWT Token（Bearer，必填）
        db: 数据库会话
    
    Returns:
        {
            "code": 0,
            "message": "ok",
            "data": {
                "scores": {
                    "exposure": 8.5,  # 0-10 分
                    "color": 7.2,
                    "composition": 9.0,
                    "mood": 8.8
                },
                "critique": "高光部分细节丢失严重，建议降低曝光...",
                "suggestions": [
                    "尝试将色温滑块向左移动 -500K",
                    "降低高光值以恢复天空细节"
                ],
                "issues": [
                    {
                        "type": "exposure",
                        "severity": "high",
                        "description": "高光溢出",
                        "region": "sky"
                    }
                ],
                "processingTime": 2.5  # 处理时间（秒）
            }
        }
    
    Raises:
        HTTPException: 如果参数验证失败、用户未登录、或诊断过程出错
    
    Note:
        - 需要登录才能使用
        - 使用 Gemini 多模态分析（图片 + 数据）
        - 诊断结果可以缓存（相同图片 + 相同数据）
    """
    start_time = time.time()
    
    try:
        # 【日志记录】记录函数入口（使用 INFO 级别，确保日志被记录）
        logger.info("=" * 80)
        logger.info("【AI 诊断】=========================================")
        logger.info(f"【AI 诊断】函数被调用，开始处理请求")
        logger.info(f"【AI 诊断】请求路径: /api/analyze/diagnosis")
        logger.info(f"【AI 诊断】请求时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"【AI 诊断】histogramData keys: {list(request_data.histogramData.keys())}")
        logger.info(f"【AI 诊断】dominantColors 数量: {len(request_data.dominantColors)}")
        logger.info(f"【AI 诊断】imageUrl 长度: {len(request_data.imageUrl) if request_data.imageUrl else 0} 字符")
        logger.info("【AI 诊断】=========================================")
        logger.info("=" * 80)
        
        # 【身份验证】验证用户身份
        try:
            current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)
            logger.info(f"【AI 诊断】✅ 用户身份验证成功: 用户 {current_user.email} (ID: {current_user.id})")
        except Exception as auth_error:
            logger.error(f"【AI 诊断】❌ 用户身份验证失败: {type(auth_error).__name__}: {str(auth_error)}")
            raise
        
        # 【参数验证】检查必要字段
        if not request_data.imageUrl:
            logger.error("【AI 诊断】失败: imageUrl 参数为空")
            raise error_response(ErrorCode.MISSING_REQUIRED_FIELD, "图片 URL（imageUrl）不能为空")
        
        if not request_data.histogramData:
            logger.error("【AI 诊断】失败: histogramData 参数为空")
            raise error_response(ErrorCode.MISSING_REQUIRED_FIELD, "直方图数据（histogramData）不能为空")
        
        # 【参数验证】检查 histogramData 是否为空字典
        if isinstance(request_data.histogramData, dict) and len(request_data.histogramData) == 0:
            logger.warning("【AI 诊断】histogramData 为空字典，将使用默认值")
            # 设置默认的直方图数据，避免后续处理出错
            request_data.histogramData = {
                "r": [0] * 256,
                "g": [0] * 256,
                "b": [0] * 256,
                "l": [0] * 256,
                "avgL": 128,
                "shadows": 0.2,
                "midtones": 0.5,
                "highlights": 0.8
            }
        
        # 【构建 Prompt】使用诊断 Prompt 模板
        try:
            prompt = prompt_template.get_diagnosis_prompt(
                histogram_data=request_data.histogramData,
                dominant_colors=request_data.dominantColors
            )
            logger.debug(f"【AI 诊断】Prompt 生成完成，长度: {len(prompt)} 字符")
        except Exception as e:
            error_type = type(e).__name__
            error_detail = str(e)
            logger.error(f"【AI 诊断】Prompt 生成失败: {error_type}: {error_detail}", exc_info=True)
            raise error_response(ErrorCode.INTERNAL_ERROR, f"Prompt 生成失败: {error_detail}")
        
        # 【构建 Gemini 请求内容】包含文本和图片
        contents = [{"role": "user", "parts": [{"text": prompt}]}]
        
        # 【图片处理】添加图片（处理 base64 或 data URL）
        image_data = request_data.imageUrl
        logger.debug(f"【AI 诊断】原始 imageUrl 长度: {len(image_data)} 字符")
        logger.debug(f"【AI 诊断】imageUrl 前缀: {image_data[:50] if len(image_data) > 50 else image_data}")
        
        if image_data.startswith("data:image"):
            # data URL 格式：data:image/jpeg;base64,...
            image_data = image_data.split(",")[-1]
            logger.debug(f"【AI 诊断】提取 base64 数据，长度: {len(image_data)} 字符")
        else:
            logger.warning(f"【AI 诊断】imageUrl 不是 data URL 格式，直接使用原始数据")
        
        # 【验证】确保图片数据不为空
        if not image_data or len(image_data) < 100:
            logger.error(f"【AI 诊断】图片数据无效: 长度={len(image_data) if image_data else 0}")
            raise error_response(ErrorCode.MISSING_REQUIRED_FIELD, "图片数据无效或为空")
        
        contents[0]["parts"].append({
            "inline_data": {
                "mime_type": "image/jpeg",
                "data": image_data,
            }
        })
        
        logger.debug(f"【AI 诊断】Gemini 请求内容构建完成，parts 数量: {len(contents[0]['parts'])}")
        
        # 【调用 Gemini API】进行多模态分析
        logger.info("【AI 诊断】开始调用 Gemini API...")
        
        # 【验证】检查 Gemini 服务是否已初始化
        if not gemini_service or not gemini_service._client:
            logger.error("【AI 诊断】Gemini 服务未初始化，请检查 GEMINI_API_KEY 配置")
            raise error_response(ErrorCode.INTERNAL_ERROR, "Gemini 服务未配置，请联系管理员")
        
        try:
            logger.info("【AI 诊断】开始调用 Gemini API，预计耗时 30-60 秒...")
            gemini_start_time = time.time()
            gemini_response = gemini_service.generate_text(contents, stage="diagnosis", response_mime="application/json")
            gemini_duration = time.time() - gemini_start_time
            logger.info(f"【AI 诊断】Gemini API 调用成功，响应长度: {len(gemini_response)} 字符，耗时: {gemini_duration:.2f} 秒")
        except RuntimeError as e:
            # Gemini 客户端未初始化错误
            error_msg = str(e)
            logger.error(f"【AI 诊断】Gemini 客户端未初始化: {error_msg}")
            raise error_response(ErrorCode.INTERNAL_ERROR, f"Gemini 服务未配置: {error_msg}")
            raise error_response(ErrorCode.INTERNAL_ERROR, f"Gemini 服务未配置: {error_msg}")
        except ConnectionError as conn_err:
            # 【关键修复】明确提示代理连接拒绝错误
            error_detail = str(conn_err)
            if "Connection refused" in error_detail or "Errno 61" in error_detail:
                raise error_response(ErrorCode.INTERNAL_ERROR, "无法连接到代理服务器。请检查 ClashX(7890) 或 Clash Verge(7897) 是否已启动，并确认端口配置正确。")
            raise error_response(ErrorCode.INTERNAL_ERROR, f"Gemini API 连接失败: {error_detail}")
        except Exception as e:
            # 其他 Gemini API 调用错误
            error_type = type(e).__name__
            error_detail = str(e)
            logger.error(f"【AI 诊断】Gemini API 调用失败: {error_type}: {error_detail}", exc_info=True)
            raise error_response(ErrorCode.INTERNAL_ERROR, f"Gemini API 调用失败: {error_detail}")
        
        # 【解析和验证响应】使用 Schema 验证
        logger.debug("【AI 诊断】开始解析和验证响应...")
        logger.debug(f"【AI 诊断】Gemini 原始响应前 500 字符: {gemini_response[:500] if len(gemini_response) > 500 else gemini_response}")
        
        try:
            validated_result = validate_diagnosis_response(gemini_response)
            logger.info("【AI 诊断】响应验证成功")
        except Exception as e:
            # Schema 验证失败
            error_type = type(e).__name__
            error_detail = str(e)
            logger.error(f"【AI 诊断】响应验证失败: {error_type}: {error_detail}", exc_info=True)
            logger.error(f"【AI 诊断】Gemini 原始响应: {gemini_response[:1000]}")
            # 【修复】即使验证失败，也返回默认结构，而不是抛出 500 错误
            # 这样前端可以显示错误信息，而不是完全失败
            # 注意：validate_diagnosis_response 在验证失败时会返回默认结构，不会抛出异常
            # 但如果确实抛出异常，我们需要捕获并返回默认结构
            try:
                # 尝试使用默认值重新验证
                validated_result = validate_diagnosis_response(gemini_response)
            except:
                # 如果仍然失败，使用硬编码的默认结构
                logger.warning(f"【AI 诊断】使用硬编码默认结构返回，原始响应验证失败")
                validated_result = {
                    "scores": {
                        "exposure": {"value": 5.0, "description": "无法解析评分"},
                        "color": {"value": 5.0, "description": "无法解析评分"},
                        "composition": {"value": 5.0, "description": "无法解析评分"},
                        "mood": {"value": 5.0, "description": "无法解析评分"}
                    },
                    "critique": "AI 诊断响应格式错误，无法解析结果",
                    "suggestions": ["请重试诊断"],
                    "issues": []
                }
        
        # 【计算处理时间】
        processing_time = time.time() - start_time
        validated_result["processingTime"] = round(processing_time, 2)
        
        logger.info(f"【AI 诊断】✅ 诊断完成，处理时间: {processing_time:.2f} 秒")
        logger.info(f"【AI 诊断】评分: 曝光={validated_result['scores']['exposure']}, 色彩={validated_result['scores']['color']}, 构图={validated_result['scores']['composition']}, 情感={validated_result['scores']['mood']}")
        
        # 【返回结果】
        return success_response(
            data=validated_result,
            message="AI 诊断完成"
        )
        
    except HTTPException:
        # 重新抛出 HTTP 异常（如认证失败、参数错误等）
        raise
    except Exception as e:
        # 【错误处理】捕获所有未预期的异常
        error_type = type(e).__name__
        error_detail = str(e)
        error_traceback = None
        try:
            import traceback
            error_traceback = traceback.format_exc()
        except:
            pass
        
        logger.error(f"【AI 诊断】❌ 诊断失败: {error_type}: {error_detail}")
        if error_traceback:
            logger.error(f"【AI 诊断】错误堆栈:\n{error_traceback}")
        logger.error(f"【AI 诊断】请求数据摘要: imageUrl长度={len(request_data.imageUrl) if request_data.imageUrl else 0}, histogramDataKeys={list(request_data.histogramData.keys()) if request_data.histogramData else []}, dominantColorsCount={len(request_data.dominantColors)}")
        
        # 返回详细的错误信息，帮助调试
        raise error_response(ErrorCode.INTERNAL_ERROR, f"AI 诊断失败: {error_type}: {error_detail}")
