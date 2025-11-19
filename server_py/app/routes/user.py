"""
用户路由 - 个人中心相关接口
根据开发方案第 14 节实现
提供用户信息、用量统计、历史报告、个人资料管理等功能
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional

from ..db import get_db
from ..models import AnalysisTask, Subscription, SubscriptionPlan
from ..middleware.auth import get_current_user, security
from ..services.usage_service import UsageService
from ..services.auth_service import AuthService
from ..utils.response import success_response, error_response
from ..constants.error_codes import ErrorCode

router = APIRouter(prefix="/api/user", tags=["user"])

# 初始化服务实例（单例模式）
usage_service = UsageService()  # 用量统计服务


@router.get("/me")
async def get_user_info(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    获取当前用户信息和订阅摘要
    根据开发方案第 14 节实现
    
    Args:
        credentials: JWT Token（Bearer）
        db: 数据库会话
    
    Returns:
        {
            "code": 0,
            "message": "ok",
            "data": {
                "user": {...},
                "subscriptionSummary": {...}
            }
        }
    """
    current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)
    
    # 查询用户真实订阅信息（根据开发方案第 14 节，不再硬编码返回"免费版"）
    subscription = db.query(Subscription).filter(
        Subscription.user_id == current_user.id,
        Subscription.status == "active",
    ).first()
    
    # 默认值（如果没有订阅）
    plan_id = None
    plan_name = "免费版"
    status = "active"
    end_at = None
    auto_renew = False
    limits = {"analysis_per_month": 10, "generations_per_month": 5}  # 免费版默认限制
    
    # 如果有订阅，查询订阅计划信息
    if subscription:
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == subscription.plan_id).first()
        if plan:
            plan_id = plan.id
            plan_name = plan.name
            status = subscription.status
            end_at = subscription.end_at.isoformat() if subscription.end_at else None
            # 从 extra_data 中获取 auto_renew（如果存在）
            if subscription.extra_data and isinstance(subscription.extra_data, dict):
                auto_renew = subscription.extra_data.get("auto_renew", False)
            # 从 plan.features 中获取用量限制
            if plan.features and isinstance(plan.features, dict):
                limits = {
                    "analysis_per_month": plan.features.get("analysis_per_month", 10),
                    "generations_per_month": plan.features.get("generations_per_month", 5),
                }
    
    # 管理员账号：显示特殊标识（管理员不受用量限制）
    if current_user.role == "admin":
        plan_name = "管理员版"
        limits = {"analysis_per_month": -1, "generations_per_month": -1}  # -1 表示无限
    
    return success_response(
        data={
            "user": {
                "id": current_user.id,
                "email": current_user.email,
                "display_name": current_user.display_name,
                "avatar_url": current_user.avatar_url,
                "role": current_user.role,
            },
            "subscriptionSummary": {
                "plan_id": plan_id,
                "plan_name": plan_name,
                "status": status,
                "end_at": end_at,
                "auto_renew": auto_renew,
                "limits": limits,
            },
        },
    )


@router.get("/usage")
async def get_usage(
    month: str | None = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    获取用户资源用量统计
    根据开发方案第 27 节实现
    
    Args:
        month: 月份（格式：YYYY-MM），默认当前月
        credentials: JWT Token（Bearer）
        db: 数据库会话
    
    Returns:
        {
            "code": 0,
            "message": "ok",
            "data": {
                "analysisUsed": 5,
                "analysisLimit": 10,
                "generationUsed": 2,
                "generationLimit": 5,
                "period": "2025-01"
            }
        }
    """
    current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)
    # 获取用户用量（传入 user_role 以便管理员返回无限限制）
    usage = usage_service.get_user_usage(db, current_user.id, month, user_role=current_user.role)
    return success_response(data=usage)


@router.get("/reports")
async def get_reports(
    page: int = 1,
    pageSize: int = 20,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    获取我的仿色列表（历史报告）
    根据开发方案第 14 节实现
    
    Args:
        page: 页码（从 1 开始）
        pageSize: 每页数量
        credentials: JWT Token（Bearer）
        db: 数据库会话
    
    Returns:
        {
            "code": 0,
            "message": "ok",
            "data": {
                "items": [...],
                "page": 1,
                "pageSize": 20,
                "total": 100
            }
        }
    """
    current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)

    tasks = (
        db.query(AnalysisTask)
        .filter(
            AnalysisTask.user_id == current_user.id,
            AnalysisTask.status == "completed",
        )
        .order_by(desc(AnalysisTask.created_at))
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .all()
    )

    return success_response(
        data={
            "items": [
                {
                    "taskId": t.id,
                    "created_at": t.created_at.isoformat(),
                    "feasibilityScore": t.feasibility_result.get("feasibilityScore") if t.feasibility_result else None,
                    "difficulty": t.feasibility_result.get("difficulty") if t.feasibility_result else None,
                    "preview_image_url": t.structured_result.get("sections", {}).get("preview_image_url") if t.structured_result else None,
                    "status": t.status,
                }
                for t in tasks
            ],
            "page": page,
            "pageSize": pageSize,
            "total": len(tasks),
        },
    )


class UpdateProfileRequest(BaseModel):
    display_name: str | None = None
    avatar_url: str | None = None


@router.put("/profile")
async def update_profile(
    request: UpdateProfileRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    更新个人资料
    根据开发方案第 14 节实现
    
    Args:
        request: 更新请求（display_name, avatar_url）
        credentials: JWT Token（Bearer）
        db: 数据库会话
    
    Returns:
        {
            "code": 0,
            "message": "更新成功",
            "data": {}
        }
    """
    current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)
    if request.display_name:
        current_user.display_name = request.display_name
    if request.avatar_url:
        current_user.avatar_url = request.avatar_url
    db.commit()
    return success_response(data={}, message="更新成功")


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    修改密码
    根据开发方案第 14 节实现
    
    Args:
        request: 修改密码请求（old_password, new_password）
        credentials: JWT Token（Bearer）
        db: 数据库会话
    
    Returns:
        {
            "code": 0,
            "message": "密码修改成功",
            "data": {}
        }
    
    Raises:
        HTTPException: 旧密码错误
    """
    current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)
    auth_service = AuthService()
    if not auth_service.verify_password(request.old_password, current_user.password_hash):
        raise error_response(ErrorCode.AUTH_PASSWORD_INCORRECT, "旧密码错误")

    current_user.password_hash = auth_service.hash_password(request.new_password)
    db.commit()
    return success_response(data={}, message="密码修改成功")
