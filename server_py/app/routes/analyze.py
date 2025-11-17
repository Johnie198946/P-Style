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
        sourceImage: 参考图（base64 或 data URL）
        targetImage: 用户图（base64 或 data URL）
        taskId: 可选的任务 ID，用于关联可行性结果
        credentials: JWT Token（Bearer）
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
    """
    try:
        # 验证用户身份（根据注册登录与权限设计方案，所有分析接口需要登录）
        current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)
        
        # 注意：可行性评估不计入单独用量，因为它通常作为 Part1 的前置步骤
        # Part1 接口会检查用量限制，因此这里不需要重复检查
        
        # 调用 CV 算法进行可行性评估（系统算法主导，不依赖 Gemini）
        result = feasibility_service.evaluate(sourceImage, targetImage)

        # 如果提供了 taskId，将结果保存到任务记录
        if taskId:
            task = task_service.get_task(db, taskId)
            if task:
                task.feasibility_result = result
                db.commit()

        return success_response(data=result)
    except Exception as e:
        raise error_response(ErrorCode.FEASIBILITY_CHECK_FAILED, f"可行性评估失败: {str(e)}")


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
        allowed, error_code = usage_service.check_usage_limit(db, current_user.id, "analysis")
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

        try:
            gemini_json = json.loads(gemini_response)
        except:
            import re
            json_match = re.search(r'\{.*\}', gemini_response, re.DOTALL)
            if json_match:
                gemini_json = json.loads(json_match.group())
            else:
                raise ValueError("无法解析 Gemini 返回的 JSON")

        structured_result = formatter.format_part1(gemini_json, feasibility_result)

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

        allowed, error_code = usage_service.check_usage_limit(db, current_user.id, "analysis")
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

        structured_result = formatter.format_part2(gemini_json, task.structured_result)

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
