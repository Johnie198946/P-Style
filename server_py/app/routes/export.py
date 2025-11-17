"""
导出路由 - 分析结果导出接口
根据开发方案第 14 节实现
提供 XMP、JSX、JSON、PDF 四种格式的导出功能
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from ..db import get_db
from ..middleware.auth import get_current_user, security
from ..services.task_service import TaskService
from ..services.export_service import ExportService
from ..utils.response import error_response
from ..constants.error_codes import ErrorCode

router = APIRouter(prefix="/api/export", tags=["export"])

# 初始化服务实例（单例模式）
task_service = TaskService()  # 任务管理服务
export_service = ExportService()  # 导出服务


@router.get("/xmp")
async def export_xmp(
    taskId: str = Query(...),
    token: str = Query(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    导出 XMP 文件（Lightroom 预设）
    根据开发方案第 14 节实现
    
    Args:
        taskId: 任务 ID
        token: 安全令牌（用于验证下载权限）
        credentials: JWT Token（Bearer）
        db: 数据库会话
    
    Returns:
        Response: XMP 文件内容（application/xml）
    
    Note:
        - 需要登录才能导出
        - 只能导出自己的任务
    """
    current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)
    task = task_service.get_task(db, taskId)
    if not task or task.user_id != current_user.id:
        raise error_response(ErrorCode.TASK_NOT_FOUND, "任务不存在")

    xmp_content = export_service.generate_xmp(task.structured_result or {})
    return Response(
        content=xmp_content,
        media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="style_{taskId}.xmp"'},
    )


@router.get("/jsx")
async def export_jsx(
    taskId: str = Query(...),
    token: str = Query(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    导出 JSX 文件（Photoshop 脚本）
    根据开发方案第 14 节实现
    
    Args:
        taskId: 任务 ID
        token: 安全令牌（用于验证下载权限）
        credentials: JWT Token（Bearer）
        db: 数据库会话
    
    Returns:
        Response: JSX 文件内容（application/javascript）
    """
    current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)
    task = task_service.get_task(db, taskId)
    if not task or task.user_id != current_user.id:
        raise error_response(ErrorCode.TASK_NOT_FOUND, "任务不存在")

    jsx_content = export_service.generate_jsx(task.structured_result or {})
    return Response(
        content=jsx_content,
        media_type="application/javascript",
        headers={"Content-Disposition": f'attachment; filename="style_{taskId}.jsx"'},
    )


@router.get("/json")
async def export_json(
    taskId: str = Query(...),
    token: str = Query(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    导出 JSON 文件（原始数据）
    根据开发方案第 14 节实现
    
    Args:
        taskId: 任务 ID
        token: 安全令牌（用于验证下载权限）
        credentials: JWT Token（Bearer）
        db: 数据库会话
    
    Returns:
        Response: JSON 文件内容（application/json）
    """
    current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)
    task = task_service.get_task(db, taskId)
    if not task or task.user_id != current_user.id:
        raise error_response(ErrorCode.TASK_NOT_FOUND, "任务不存在")

    json_content = export_service.generate_json(task.structured_result or {})
    return Response(
        content=json_content,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="style_{taskId}.json"'},
    )


@router.get("/pdf")
async def export_pdf(
    taskId: str = Query(...),
    token: str = Query(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    导出 PDF 报告
    根据开发方案第 14 节实现
    
    Args:
        taskId: 任务 ID
        token: 安全令牌（用于验证下载权限）
        credentials: JWT Token（Bearer）
        db: 数据库会话
    
    Returns:
        Response: PDF 文件内容（application/pdf）
    
    Note:
        - PDF 生成使用 reportlab 库
        - 包含完整的分析结果和可视化图表
    """
    current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)
    task = task_service.get_task(db, taskId)
    if not task or task.user_id != current_user.id:
        raise error_response(ErrorCode.TASK_NOT_FOUND, "任务不存在")

    pdf_content = export_service.generate_pdf(task.structured_result or {}, taskId)
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="style_{taskId}.pdf"'},
    )
