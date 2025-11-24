"""
分析路由 - Part1/Part2/Feasibility/AI 诊断
根据开发方案第 4、16、26 节实现，新增 AI 诊断接口
提供可行性评估、两阶段分析、AI 诊断和任务查询接口
"""
import json
import asyncio  # 用于异步任务执行
import time  # 用于记录请求处理时间
from fastapi import APIRouter, Depends, HTTPException, Form, Request, Body
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func, desc  # func 用于 count 统计，desc 用于排序
from typing import Optional, Dict, Any, List
from loguru import logger  # 日志记录工具
from pydantic import BaseModel

from ..db import get_db
from ..models import User, AnalysisTask
from ..middleware.auth import get_current_user, security
from ..services.feasibility_service import FeasibilityService
from ..services.gemini_service import get_gemini_service
from ..services.prompt_template import PromptTemplateService
from ..services.analysis_formatter import AnalysisFormatter
from ..services.task_service import TaskService
from ..services.usage_service import UsageService
from ..utils.response import success_response, error_response
from ..constants.error_codes import ErrorCode
from ..schemas.analysis_schemas import (
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
    sourceImage: str = Form(...),
    targetImage: Optional[str] = Form(None),
    optional_style: Optional[str] = Form(None),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    Part1 分析接口
    根据开发方案第 23.2 节实现，输出基础洞察（点评、构图、光影趋势、可行性说明、工作流草案）
    
    Args:
        sourceImage: 参考图（base64 或 data URL，必填）
        targetImage: 用户图（base64 或 data URL，可选）
        optional_style: 可选风格关键词（如 "日出暖光", "胶片感"）
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
        - 如果提供了 targetImage，会先进行可行性评估
        - 调用 Gemini API 生成分析结果，然后格式化并保存到数据库
    """
    try:
        # 验证用户身份
        current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)
        
        # 检查用量限制（严格限流，超出则返回错误码）
        # 注意：管理员账号不受用量限制（根据开发方案，管理员拥有所有权限）
        allowed, error_code = usage_service.check_usage_limit(db, current_user.id, "analysis", user_role=current_user.role)
        if not allowed:
            raise error_response(error_code, "分析次数已达上限")

        # 如果提供了目标图，先进行可行性评估
        feasibility_result = None
        if targetImage:
            feasibility_result = feasibility_service.evaluate(sourceImage, targetImage)

        # 创建分析任务记录
        task = task_service.create_task(db, current_user.id, sourceImage, targetImage)

        # 获取 Part1 Prompt 模板（根据开发方案第 23.2 节）
        prompt = prompt_template.get_part1_prompt(
            sourceImage, targetImage, exif=None, options={"optional_style": optional_style}
        )

        # 构建 Gemini API 请求内容（文本 + 图片）
        contents = [{"role": "user", "parts": [{"text": prompt}]}]
        if sourceImage:
            contents[0]["parts"].append({
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": sourceImage.split(",")[-1] if "," in sourceImage else sourceImage,
                }
            })
        if targetImage:
            contents[0]["parts"].append({
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": targetImage.split(",")[-1] if "," in targetImage else targetImage,
                }
            })

        gemini_response = gemini_service.generate_text(contents, stage="part1")
        
        # 调试日志：记录 Gemini 原始响应（只记录前 500 个字符，避免日志过长）
        logger.info(f"Part1 Gemini 原始响应长度: {len(gemini_response)} 字符")
        logger.debug(f"Part1 Gemini 原始响应前 500 字符: {gemini_response[:500]}...")
        
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

        try:
            gemini_json = json.loads(gemini_response)
            logger.info(f"Part1 Gemini JSON 解析成功: 类型 = {type(gemini_json)}")
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
        try:
            structured_result = formatter.format_part1(gemini_json, feasibility_result)
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
                    logger.debug(f"Part1 overviewSummary = {structured_data.get('overviewSummary', 'empty')[:100] if structured_data.get('overviewSummary') else 'empty'}...")
            if "composition" in sections:
                composition = sections.get("composition", {})
                logger.info(f"Part1 composition keys = {list(composition.keys())}")
                if "structured" in composition:
                    comp_structured = composition.get("structured", {})
                    logger.info(f"Part1 composition.structured keys = {list(comp_structured.keys())}")
                    if "advanced_sections" in comp_structured:
                        adv_sections = comp_structured.get("advanced_sections", {})
                        logger.info(f"Part1 advanced_sections keys = {list(adv_sections.keys()) if isinstance(adv_sections, dict) else 'not dict'}")

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
        raise error_response(ErrorCode.INTERNAL_ERROR, f"Part1 分析失败: {str(e)}")


@router.post("/part2")
async def analyze_part2(
    taskId: str = Form(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    Part2 分析接口（异步执行）
    
    根据开发方案第 16 节，Part2 接口应立即返回 { status: 'processing' }，
    实际的 Gemini 调用和数据库更新在后台异步执行，前端通过轮询获取结果。
    
    Args:
        taskId: 任务 ID（从 Part1 返回）
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
    logger.info(f"【Part2 请求开始】taskId={taskId}, 时间戳={request_start_time}")
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

        contents = [{"role": "user", "parts": [{"text": prompt}]}]
        if task.source_image_data:
            contents[0]["parts"].append({
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": task.source_image_data.split(",")[-1] if "," in task.source_image_data else task.source_image_data,
                }
            })
        if task.target_image_data:
            contents[0]["parts"].append({
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": task.target_image_data.split(",")[-1] if "," in task.target_image_data else task.target_image_data,
                }
            })

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
        # 【日志记录】记录函数入口
        logger.info(f"【AI 诊断】函数被调用，开始处理请求")
        logger.info(f"【AI 诊断】请求路径: /api/analyze/diagnosis")
        logger.info(f"【AI 诊断】histogramData keys: {list(request_data.histogramData.keys())}")
        logger.info(f"【AI 诊断】dominantColors 数量: {len(request_data.dominantColors)}")
        
        # 【身份验证】验证用户身份
        current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)
        logger.debug(f"【AI 诊断】用户身份验证成功: 用户 {current_user.email} (ID: {current_user.id})")
        
        # 【参数验证】检查必要字段
        if not request_data.imageUrl:
            logger.error("【AI 诊断】失败: imageUrl 参数为空")
            raise error_response(ErrorCode.MISSING_REQUIRED_FIELD, "图片 URL（imageUrl）不能为空")
        
        if not request_data.histogramData:
            logger.error("【AI 诊断】失败: histogramData 参数为空")
            raise error_response(ErrorCode.MISSING_REQUIRED_FIELD, "直方图数据（histogramData）不能为空")
        
        # 【构建 Prompt】使用诊断 Prompt 模板
        prompt = prompt_template.get_diagnosis_prompt(
            histogram_data=request_data.histogramData,
            dominant_colors=request_data.dominantColors
        )
        
        logger.debug(f"【AI 诊断】Prompt 生成完成，长度: {len(prompt)} 字符")
        
        # 【构建 Gemini 请求内容】包含文本和图片
        contents = [{"role": "user", "parts": [{"text": prompt}]}]
        
        # 添加图片（处理 base64 或 data URL）
        image_data = request_data.imageUrl
        if image_data.startswith("data:image"):
            # data URL 格式：data:image/jpeg;base64,...
            image_data = image_data.split(",")[-1]
        
        contents[0]["parts"].append({
            "inline_data": {
                "mime_type": "image/jpeg",
                "data": image_data,
            }
        })
        
        # 【调用 Gemini API】进行多模态分析
        logger.info("【AI 诊断】开始调用 Gemini API...")
        gemini_response = gemini_service.generate_text(contents, stage="diagnosis")
        logger.info(f"【AI 诊断】Gemini API 调用成功，响应长度: {len(gemini_response)} 字符")
        
        # 【解析和验证响应】使用 Schema 验证
        logger.debug("【AI 诊断】开始解析和验证响应...")
        validated_result = validate_diagnosis_response(gemini_response)
        logger.info("【AI 诊断】响应验证成功")
        
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
        error_type = type(e).__name__
        error_detail = str(e)
        logger.error(f"【AI 诊断】❌ 诊断失败: {error_type}: {error_detail}", exc_info=True)
        raise error_response(ErrorCode.INTERNAL_SERVER_ERROR, f"AI 诊断失败: {error_detail}")
