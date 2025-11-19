"""
风格模拟路由 - Part3 风格模拟
根据开发方案第 23.4 节实现
提供基于 Part1/Part2 分析结果的风格模拟功能
"""
from fastapi import APIRouter, Depends, HTTPException, Form
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from ..db import get_db
from ..middleware.auth import get_current_user, security
from ..services.task_service import TaskService
from ..services.style_simulation_service import StyleSimulationService
from ..services.gemini_service import get_gemini_service
from ..services.usage_service import UsageService
from ..utils.response import success_response, error_response
from ..constants.error_codes import ErrorCode

router = APIRouter(prefix="/api/simulate", tags=["simulate"])

# 初始化服务实例（单例模式）
task_service = TaskService()  # 任务管理服务
gemini_service = get_gemini_service()  # Gemini API 服务
simulation_service = StyleSimulationService(gemini_service)  # 风格模拟服务
usage_service = UsageService()  # 用量统计服务


@router.post("/style")
async def simulate_style(
    taskId: str = Form(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    风格模拟接口（Part3）
    根据开发方案第 23.4 节实现，基于 Part1/Part2 分析结果生成风格模拟图像
    
    Args:
        taskId: 分析任务 ID（必须已完成 Part1 和 Part2）
        credentials: JWT Token（Bearer）
        db: 数据库会话
    
    Returns:
        {
            "code": 0,
            "message": "ok",
            "data": {
                "originalImage": "base64...",
                "processedImage": "base64...",
                "stylePrompt": "...",
                "processingTime": 1234
            }
        }
    
    Note:
        - 需要先检查用户生成次数限制（generation）
        - 任务必须已完成 Part1 和 Part2
        - 使用 Gemini Flash 模型进行快速风格模拟
    """
    try:
        current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)
        
        # 检查用量限制（严格限流，超出则返回错误码）
        # 注意：管理员账号不受用量限制（根据开发方案，管理员拥有所有权限）
        allowed, error_code = usage_service.check_usage_limit(db, current_user.id, "generation", user_role=current_user.role)
        if not allowed:
            raise error_response(error_code, "生成次数已达上限")

        task = task_service.get_task(db, taskId)
        if not task:
            raise error_response(ErrorCode.TASK_NOT_FOUND, "任务不存在")

        if task.user_id != current_user.id:
            raise error_response(ErrorCode.FORBIDDEN, "无权访问此任务")

        if not task.structured_result:
            raise error_response(ErrorCode.TASK_PROCESSING, "任务分析结果不完整，请先完成 Part1 和 Part2")

        style_summary = simulation_service.extract_style_summary(task.structured_result)
        result = simulation_service.simulate_style(
            task.target_image_data or "",
            style_summary,
        )

        task_service.update_preview_image(db, taskId, result["processedImage"])

        return success_response(data=result)
    except HTTPException:
        raise
    except Exception as e:
        raise error_response(ErrorCode.INTERNAL_ERROR, f"风格模拟失败: {str(e)}")
