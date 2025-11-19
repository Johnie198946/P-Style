"""
分析路由 - Part1/Part2/Feasibility
根据开发方案第 4、16、26 节实现
提供可行性评估、两阶段分析和任务查询接口
"""
import json
from fastapi import APIRouter, Depends, HTTPException, Form
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func, desc  # func 用于 count 统计，desc 用于排序
from typing import Optional
from loguru import logger  # 日志记录工具

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
        # 1. 参数验证（确保图片数据不为空）
        if not sourceImage or not sourceImage.strip():
            logger.error("可行性评估失败: sourceImage 参数为空")
            raise error_response(ErrorCode.MISSING_REQUIRED_FIELD, "参考图（sourceImage）不能为空")
        
        if not targetImage or not targetImage.strip():
            logger.error("可行性评估失败: targetImage 参数为空")
            raise error_response(ErrorCode.MISSING_REQUIRED_FIELD, "用户图（targetImage）不能为空")
        
        # 记录请求信息（不记录完整的图片数据，只记录数据长度和格式）
        source_image_length = len(sourceImage)
        target_image_length = len(targetImage)
        source_image_format = "data URL" if sourceImage.startswith("data:image") else "base64"
        target_image_format = "data URL" if targetImage.startswith("data:image") else "base64"
        logger.info(f"可行性评估请求: sourceImage长度={source_image_length}, 格式={source_image_format}, targetImage长度={target_image_length}, 格式={target_image_format}, taskId={taskId}")
        
        # 2. 验证用户身份（根据注册登录与权限设计方案，所有分析接口需要登录）
        current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)
        logger.debug(f"可行性评估: 用户 {current_user.email} (ID: {current_user.id})")
        
        # 3. 调用 CV 算法进行可行性评估（系统算法主导，不依赖 Gemini）
        # 注意：feasibility_service.evaluate 方法内部已经处理了图片解码和异常
        # 如果图片解码失败，会返回错误结果而不是抛出异常
        result = feasibility_service.evaluate(sourceImage, targetImage)
        
        # 4. 检查评估结果是否包含错误
        if result.get("dealBreakers") and len(result.get("dealBreakers", [])) > 0:
            # 检查是否是图片解码错误
            deal_breakers = result.get("dealBreakers", [])
            if any("无法解码" in str(breaker) or "评估失败" in str(breaker) for breaker in deal_breakers):
                logger.error(f"可行性评估失败: 图片解码或处理错误, dealBreakers={deal_breakers}")
                raise error_response(ErrorCode.IMAGE_PROCESSING_FAILED, f"图片处理失败: {', '.join(deal_breakers)}")
        
        logger.info(f"可行性评估成功: feasibilityScore={result.get('feasibilityScore')}, difficulty={result.get('difficulty')}, user_id={current_user.id}")
        
        # 5. 如果提供了 taskId，将结果保存到任务记录
        if taskId:
            task = task_service.get_task(db, taskId)
            if task:
                task.feasibility_result = result
                db.commit()
                logger.debug(f"可行性评估结果已保存到任务: taskId={taskId}")

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
    """Part2 分析"""
    try:
        current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)
        
        task = task_service.get_task(db, taskId)
        if not task:
            raise error_response(ErrorCode.TASK_NOT_FOUND, "任务不存在")

        if task.user_id != current_user.id:
            raise error_response(ErrorCode.FORBIDDEN, "无权访问此任务")

        # 检查用量限制（严格限流，超出则返回错误码）
        # 注意：管理员账号不受用量限制（根据开发方案，管理员拥有所有权限）
        allowed, error_code = usage_service.check_usage_limit(db, current_user.id, "analysis", user_role=current_user.role)
        if not allowed:
            raise error_response(error_code, "分析次数已达上限")

        part1_context = {
            "professional_evaluation_summary": task.part1_summary or "",
            "workflow_draft": json.loads(task.workflow_draft) if task.workflow_draft else {},
        }

        prompt = prompt_template.get_part2_prompt(
            task.source_image_data or "",
            task.target_image_data,
            part1_context,
            task.feasibility_result,
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

        gemini_response = gemini_service.generate_text(contents, stage="part2")

        try:
            gemini_json = json.loads(gemini_response)
        except:
            import re
            json_match = re.search(r'\{.*\}', gemini_response, re.DOTALL)
            if json_match:
                gemini_json = json.loads(json_match.group())
            else:
                raise ValueError("无法解析 Gemini 返回的 JSON")

        # 调用 format_part2 格式化数据（添加异常处理，确保即使格式化失败也能返回错误结构）
        try:
            structured_result = formatter.format_part2(gemini_json, task.structured_result)
        except Exception as format_error:
            # 如果格式化失败，记录详细错误信息并返回错误结构
            logger.error(f"Part2 格式化过程发生异常: {format_error}", exc_info=True)
            # format_part2 内部已经有异常处理，但如果仍然抛出异常，说明是严重错误
            # 创建一个基本的错误结构，确保接口能正常返回
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

        task_service.update_task_part2(
            db,
            task.id,
            gemini_json,
            structured_result,
            gemini_response,
            json.dumps(structured_result.get("workflow_final", {})),
            structured_result.get("workflow_alignment_notes", ""),
        )

        return success_response(
            data={
                "taskId": task.id,
                "stage": "part2",
                "status": "completed",
                "structuredAnalysis": structured_result,
                "naturalLanguage": gemini_response,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise error_response(ErrorCode.INTERNAL_ERROR, f"Part2 分析失败: {str(e)}")


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

    return {
        "code": 0,
        "message": "ok",
        "data": {
            "task": {
                "id": task.id,
                "status": task.status,
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
