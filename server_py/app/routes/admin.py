"""
Admin 管理后台路由
根据开发方案第 27.1 节和注册登录与权限设计方案实现
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Optional
from datetime import datetime, timedelta
from jose import jwt

from ..db import get_db
from ..models import User, AnalysisTask, Subscription, SubscriptionPlan, Payment, AuthToken
from ..middleware.auth import get_current_user, security
from ..services.auth_service import AuthService
from ..config import get_settings
from ..utils.response import success_response, error_response
from ..constants.error_codes import ErrorCode

router = APIRouter(prefix="/api/admin", tags=["admin"])
auth_service = AuthService()
settings = get_settings()


class AdminLoginRequest(BaseModel):
    """管理员登录第一步：邮箱+密码"""
    email: EmailStr
    password: str


class AdminVerifyMfaRequest(BaseModel):
    """管理员登录第二步：MFA Token + 验证码"""
    mfaToken: str  # 第一步返回的临时 Token
    code: str  # 6位数字验证码


@router.post("/auth/login")
async def admin_login(
    request: AdminLoginRequest,
    db: Session = Depends(get_db),
):
    """
    管理员登录第一步：邮箱+密码
    根据注册登录与权限设计方案第 3.1 节实现
    返回 mfaToken，用于第二步验证
    """
    try:
        # 1. 验证邮箱和密码
        user = db.query(User).filter(User.email == request.email).first()
        if not user:
            raise error_response(ErrorCode.AUTH_LOGIN_FAILED, "邮箱或密码错误")
        
        if user.role != "admin":
            raise error_response(ErrorCode.AUTH_ADMIN_PERMISSION_DENIED, "非管理员账号")
        
        if user.status != "active":
            raise error_response(ErrorCode.AUTH_USER_DISABLED, "账号已被禁用")
        
        if not auth_service.verify_password(request.password, user.password_hash):
            raise error_response(ErrorCode.AUTH_LOGIN_FAILED, "邮箱或密码错误")
        
        # 2. 生成临时 MFA Token（有效期 5 分钟）
        expire = datetime.utcnow() + timedelta(minutes=5)
        mfa_payload = {
            "sub": user.id,
            "type": "admin_mfa_token",
            "role": "admin",
            "exp": expire,
        }
        mfa_token = jwt.encode(mfa_payload, settings.SECRET_KEY, algorithm="HS256")
        
        # 3. 发送验证码到邮箱
        code = auth_service.send_verification_code_for_admin_mfa(db, user.id, user.email)
        
        # 4. 返回 MFA Token（注意：验证码通过邮件发送，不在这里返回）
        return success_response(
            data={
                "mfaToken": mfa_token,
            },
            message="验证码已发送到您的邮箱",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise error_response(ErrorCode.INTERNAL_ERROR, f"登录失败: {str(e)}")


@router.post("/auth/verify-mfa")
async def admin_verify_mfa(
    request: AdminVerifyMfaRequest,
    db: Session = Depends(get_db),
):
    """
    管理员登录第二步：验证 MFA Token + 验证码
    根据注册登录与权限设计方案第 3.2 节实现
    返回 adminAuthToken，用于后续管理员操作
    """
    try:
        # 1. 验证 MFA Token
        try:
            payload = jwt.decode(request.mfaToken, settings.SECRET_KEY, algorithms=["HS256"])
        except Exception:
            raise error_response(ErrorCode.AUTH_TOKEN_INVALID, "MFA Token 无效或已过期")
        
        if payload.get("type") != "admin_mfa_token" or payload.get("role") != "admin":
            raise error_response(ErrorCode.AUTH_TOKEN_INVALID, "MFA Token 类型不正确")
        
        user_id = payload.get("sub")
        if not user_id:
            raise error_response(ErrorCode.AUTH_TOKEN_INVALID, "MFA Token 无效")
        
        # 2. 查询用户
        user = db.query(User).filter(User.id == user_id).first()
        if not user or user.role != "admin" or user.status != "active":
            raise error_response(ErrorCode.AUTH_ADMIN_PERMISSION_DENIED, "管理员账号无效")
        
        # 3. 验证验证码
        auth_service.verify_code(
            db, user.email, request.code, type="admin_mfa", user_id=user.id
        )
        
        # 4. 生成管理员会话 Token
        admin_token = auth_service.create_token(user.id, token_type="admin_session", role="admin")
        
        # 5. 保存 Token 到数据库
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        session_token = AuthToken(
            user_id=user.id,
            email=user.email,
            type="admin_session",
            token=admin_token,
            expired_at=expire,
            consumed=False,
        )
        db.add(session_token)
        db.commit()
        
        return success_response(
            data={
                "adminAuthToken": admin_token,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "display_name": user.display_name,
                    "avatar_url": user.avatar_url,
                    "role": user.role,
                },
            },
            message="登录成功",
        )
    except HTTPException:
        raise
    except ValueError as e:
        raise error_response(ErrorCode.AUTH_LOGIN_FAILED, str(e))
    except Exception as e:
        raise error_response(ErrorCode.INTERNAL_ERROR, f"验证失败: {str(e)}")


@router.get("/dashboard/metrics")
async def get_dashboard_metrics(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """Dashboard 运营概览指标"""
    current_user = await get_current_user(credentials=credentials, db=db, require_admin=True)
    
    # 用户统计
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.status == "active").scalar() or 0
    
    # 任务统计
    total_tasks = db.query(func.count(AnalysisTask.id)).scalar() or 0
    completed_tasks = db.query(func.count(AnalysisTask.id)).filter(
        AnalysisTask.status == "completed"
    ).scalar() or 0
    
    # 订阅统计
    total_subscriptions = db.query(func.count(Subscription.id)).filter(
        Subscription.status == "active"
    ).scalar() or 0
    
    # 支付统计（简化）
    total_payments = db.query(func.count(Payment.id)).scalar() or 0
    successful_payments = db.query(func.count(Payment.id)).filter(
        Payment.status == "succeeded"
    ).scalar() or 0
    
    # 最近7天趋势
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_users = db.query(func.count(User.id)).filter(
        User.created_at >= seven_days_ago
    ).scalar() or 0
    recent_tasks = db.query(func.count(AnalysisTask.id)).filter(
        AnalysisTask.created_at >= seven_days_ago
    ).scalar() or 0
    
    return success_response(
        data={
            "users": {
                "total": total_users,
                "active": active_users,
                "recent7Days": recent_users,
            },
            "tasks": {
                "total": total_tasks,
                "completed": completed_tasks,
                "recent7Days": recent_tasks,
            },
            "subscriptions": {
                "total": total_subscriptions,
            },
            "payments": {
                "total": total_payments,
                "successful": successful_payments,
            },
        },
    )


@router.get("/users")
async def get_users(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """用户管理列表"""
    current_user = await get_current_user(credentials=credentials, db=db, require_admin=True)
    
    query = db.query(User)
    
    if q:
        query = query.filter(
            (User.email.contains(q)) | (User.display_name.contains(q))
        )
    
    if status:
        query = query.filter(User.status == status)
    
    total = query.count()
    users = query.order_by(desc(User.created_at)).offset((page - 1) * pageSize).limit(pageSize).all()
    
    return success_response(
        data={
            "items": [
                {
                    "id": u.id,
                    "email": u.email,
                    "display_name": u.display_name,
                    "role": u.role,
                    "status": u.status,
                    "created_at": u.created_at.isoformat(),
                }
                for u in users
            ],
            "page": page,
            "pageSize": pageSize,
            "total": total,
        },
    )


@router.get("/users/{userId}")
async def get_user_detail(
    userId: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """获取用户详情"""
    current_user = await get_current_user(credentials=credentials, db=db, require_admin=True)
    
    user = db.query(User).filter(User.id == userId).first()
    if not user:
        raise error_response(ErrorCode.AUTH_USER_NOT_FOUND, "用户不存在")
    
    # 获取用户的任务统计
    task_count = db.query(func.count(AnalysisTask.id)).filter(
        AnalysisTask.user_id == userId
    ).scalar() or 0
    
    # 获取订阅信息
    subscription = db.query(Subscription).filter(
        Subscription.user_id == userId,
        Subscription.status == "active",
    ).first()
    
    return success_response(
        data={
            "user": {
                "id": user.id,
                "email": user.email,
                "display_name": user.display_name,
                "avatar_url": user.avatar_url,
                "role": user.role,
                "status": user.status,
                "created_at": user.created_at.isoformat(),
            },
            "stats": {
                "taskCount": task_count,
            },
            "subscription": {
                "plan_id": subscription.plan_id if subscription else None,
                "status": subscription.status if subscription else None,
            },
        },
    )


@router.patch("/users/{userId}/status")
async def update_user_status(
    userId: int,
    status: str = Query(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """更新用户状态"""
    current_user = await get_current_user(credentials=credentials, db=db, require_admin=True)
    
    user = db.query(User).filter(User.id == userId).first()
    if not user:
        raise error_response(ErrorCode.AUTH_USER_NOT_FOUND, "用户不存在")
    
    if status not in ["active", "disabled"]:
        raise error_response(ErrorCode.INVALID_REQUEST, "无效的状态值")
    
    user.status = status
    db.commit()
    
    return success_response(data={}, message="更新成功")


@router.get("/tasks")
async def get_tasks(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """任务管理列表"""
    current_user = await get_current_user(credentials=credentials, db=db, require_admin=True)
    
    query = db.query(AnalysisTask)
    
    if status:
        query = query.filter(AnalysisTask.status == status)
    
    if q:
        query = query.filter(AnalysisTask.id.contains(q))
    
    total = query.count()
    tasks = query.order_by(desc(AnalysisTask.created_at)).offset((page - 1) * pageSize).limit(pageSize).all()
    
    return success_response(
        data={
            "items": [
                {
                    "taskId": t.id,
                    "userId": t.user_id,
                    "status": t.status,
                    "part2_completed": t.part2_completed,
                    "created_at": t.created_at.isoformat(),
                    "updated_at": t.updated_at.isoformat(),
                }
                for t in tasks
            ],
            "page": page,
            "pageSize": pageSize,
            "total": total,
        },
    )


@router.get("/tasks/{taskId}")
async def get_task_detail(
    taskId: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """获取任务详情（包含原始 Gemini 输出和结构化结果）"""
    current_user = await get_current_user(credentials=credentials, db=db, require_admin=True)
    
    task = db.query(AnalysisTask).filter(AnalysisTask.id == taskId).first()
    if not task:
        raise error_response(ErrorCode.TASK_NOT_FOUND, "任务不存在")
    
    return success_response(
        data={
            "task": {
                "id": task.id,
                "userId": task.user_id,
                "status": task.status,
                "part2_completed": task.part2_completed,
                "created_at": task.created_at.isoformat(),
            },
            "gemini_result": task.gemini_result,
            "structured_result": task.structured_result,
            "feasibility_result": task.feasibility_result,
            "meta": {
                "warnings": [],
                "protocolVersion": "2025-02",
            },
        },
    )


@router.post("/tasks/{taskId}/retry")
async def retry_task(
    taskId: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """重试失败的任务"""
    current_user = await get_current_user(credentials=credentials, db=db, require_admin=True)
    
    task = db.query(AnalysisTask).filter(AnalysisTask.id == taskId).first()
    if not task:
        raise error_response(ErrorCode.TASK_NOT_FOUND, "任务不存在")
    
    # 重置任务状态
    task.status = "pending"
    task.part2_completed = False
    db.commit()
    
    return success_response(data={}, message="任务已重置，等待重新处理")


@router.get("/plans")
async def get_plans(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """获取订阅计划列表"""
    current_user = await get_current_user(credentials=credentials, db=db, require_admin=True)
    
    plans = db.query(SubscriptionPlan).order_by(SubscriptionPlan.sort_order).all()
    
    return success_response(
        data={
            "items": [
                {
                    "id": p.id,
                    "name": p.name,
                    "description": p.description,
                    "price": float(p.price) if p.price else 0,
                    "period": p.period,
                    "features": p.features,
                    "is_active": p.is_active,
                }
                for p in plans
            ],
        },
    )


@router.get("/payments")
async def get_payments(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    method: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """支付订单列表"""
    current_user = await get_current_user(credentials=credentials, db=db, require_admin=True)
    
    query = db.query(Payment)
    
    if status:
        query = query.filter(Payment.status == status)
    
    if method:
        query = query.filter(Payment.channel == method)
    
    if q:
        query = query.filter(
            (Payment.order_no.contains(q)) | (Payment.txn_id.contains(q))
        )
    
    total = query.count()
    payments = query.order_by(desc(Payment.created_at)).offset((page - 1) * pageSize).limit(pageSize).all()
    
    return success_response(
        data={
            "items": [
                {
                    "id": p.id,
                    "order_no": p.order_no,
                    "user_id": p.user_id,
                    "plan_id": p.plan_id,
                    "amount": float(p.amount) if p.amount else 0,
                    "currency": p.currency,
                    "status": p.status,
                    "channel": p.channel,
                    "created_at": p.created_at.isoformat(),
                }
                for p in payments
            ],
            "page": page,
            "pageSize": pageSize,
            "total": total,
        },
    )

