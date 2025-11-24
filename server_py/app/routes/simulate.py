"""
风格模拟路由 - Part3 风格模拟
根据开发方案第 23.4 节实现
提供基于 Part1/Part2 分析结果的风格模拟功能
"""
import time
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

        # 【检查图片数据】
        # 第三阶段需要两张图片：参考图（用于理解目标风格）和用户原图（需要处理的图片）
        if not task.source_image_data:
            raise error_response(ErrorCode.INVALID_PARAMS, "参考图数据缺失")
        if not task.target_image_data:
            raise error_response(ErrorCode.INVALID_PARAMS, "用户图数据缺失")

        # 【第三阶段日志】记录接口调用信息
        from loguru import logger
        logger.info(f"【Part3 风格模拟接口】=========================================")
        logger.info(f"【Part3 风格模拟接口】开始处理任务: taskId={taskId}, userId={current_user.id}")
        logger.info(f"【Part3 风格模拟接口】请求时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"【Part3 风格模拟接口】=========================================")
        
        # 【提取完整的色彩方案数据】
        # 包括照片点评（尤其是 style_summary）、色彩方案、Lightroom、Photoshop 的完整数据
        color_grading_schema = simulation_service.extract_color_grading_schema(task.structured_result)
        
        # 【第三阶段日志】记录提取的数据信息
        photo_review = color_grading_schema.get("photo_review", {})
        style_summary = photo_review.get("style_summary", "")
        logger.info(f"【Part3 风格模拟接口】数据提取完成:")
        logger.info(f"  - style_summary 长度: {len(style_summary)} 字符")
        logger.info(f"  - Lightroom panels 数量: {len(color_grading_schema.get('lightroom', {}).get('panels', []))}")
        logger.info(f"  - Photoshop steps 数量: {len(color_grading_schema.get('photoshop', {}).get('steps', []))}")
        logger.info(f"  - Color HSL 数量: {len(color_grading_schema.get('color', {}).get('hsl', []))}")
        
        # 【调用风格模拟服务】
        # 传递两张图片（参考图和用户原图）和完整的色彩方案数据
        # 根据新的 Prompt 模板，Gemini 将严格按照色彩方案数据对用户原图进行处理
        # 注意：part1_style_analysis 已包含在 color_grading_schema.photo_review 中，不需要单独传递
        result = simulation_service.simulate_style(
            task.source_image_data,  # 参考图（用于理解目标风格）
            task.target_image_data,   # 用户原图（需要处理的图片）
            color_grading_schema,     # 完整的色彩方案数据（包含照片点评、Lightroom、Photoshop、色彩方案）
            None,  # part1_style_analysis 已包含在 color_grading_schema.photo_review 中
        )

        # 【第三阶段日志】记录结果信息
        logger.info(f"【Part3 风格模拟接口】✅ 风格模拟成功，处理时间: {result.get('processingTime', 0):.2f} 秒")
        logger.info(f"【Part3 风格模拟接口】生成的图片 Base64 长度: {len(result.get('processedImage', ''))} 字符")

        # 【更新预览图到数据库】
        # 注意：update_preview_image 方法会修改 JSON 字段，需要使用 flag_modified 标记
        try:
            task_service.update_preview_image(db, taskId, result["processedImage"])
            logger.info(f"【Part3 风格模拟接口】✅ 任务预览图已更新到数据库: taskId={taskId}")
        except Exception as db_error:
            # 【错误处理】如果数据库更新失败，记录详细错误信息，但不影响返回结果
            # 因为图片已经生成成功，前端可以正常显示，只是预览图没有保存到数据库
            error_type = type(db_error).__name__
            error_message = str(db_error)
            logger.error(f"【Part3 风格模拟接口】❌ 更新预览图到数据库失败: taskId={taskId}, 错误类型: {error_type}, 错误消息: {error_message}", exc_info=True)
            # 不抛出异常，允许接口正常返回结果（图片已生成成功）
            # 前端可以正常显示图片，只是预览图没有保存到数据库

        return success_response(data=result)
    except HTTPException:
        raise
    except Exception as e:
        # 【增强错误日志】记录详细的错误信息，包括错误类型、错误消息、堆栈跟踪
        error_type = type(e).__name__
        error_message = str(e)
        logger.error(f"【Part3 风格模拟接口】❌ 风格模拟失败: taskId={taskId}, 错误类型: {error_type}, 错误消息: {error_message}", exc_info=True)
        raise error_response(ErrorCode.INTERNAL_ERROR, f"风格模拟失败: {error_type}: {error_message}")
