"""
认证中间件
"""
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from ..db import get_db
from ..services.auth_service import AuthService
from ..models import User
from ..utils.response import error_response
from ..constants.error_codes import ErrorCode


# 强制要求 Token（根据注册登录与权限设计方案，所有需要认证的接口必须提供 Token）
security = HTTPBearer(auto_error=True)
auth_service = AuthService()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    require_admin: bool = False,
) -> User:
    """
    获取当前用户（中间件）
    
    Args:
        credentials: Bearer Token
        db: 数据库会话
        require_admin: 是否要求管理员权限
    
    Returns:
        User 对象
    
    Raises:
        HTTPException: 认证失败
    """
    # 从 credentials 获取 token
    if not credentials:
        raise error_response(ErrorCode.UNAUTHORIZED, "未提供认证 Token")
    token = credentials.credentials

    # 验证 Token
    payload = auth_service.verify_token(token)
    if not payload:
        raise error_response(ErrorCode.AUTH_TOKEN_INVALID, "Token 无效或已过期")

    # 检查 Token 类型
    token_type = payload.get("type", "")
    if require_admin:
        if token_type != "admin_session" or payload.get("role") != "admin":
            raise error_response(ErrorCode.AUTH_ADMIN_PERMISSION_DENIED, "需要管理员权限")
    else:
        if token_type != "session":
            raise error_response(ErrorCode.AUTH_TOKEN_INVALID, "Token 类型不正确")

    # 从数据库获取用户
    user = auth_service.get_current_user(db, token)
    if not user:
        raise error_response(ErrorCode.AUTH_USER_NOT_FOUND, "用户不存在或 Token 已失效")

    return user


def require_auth(func):
    """装饰器：要求认证"""
    async def wrapper(*args, **kwargs):
        request = kwargs.get("request") or args[0] if args else None
        if not request:
            raise HTTPException(status_code=500, detail="无法获取请求对象")
        
        user = await get_current_user(request, require_admin=False)
        kwargs["current_user"] = user
        return await func(*args, **kwargs)
    return wrapper


def require_admin(func):
    """装饰器：要求管理员权限"""
    async def wrapper(*args, **kwargs):
        request = kwargs.get("request") or args[0] if args else None
        if not request:
            raise HTTPException(status_code=500, detail="无法获取请求对象")
        
        user = await get_current_user(request, require_admin=True)
        kwargs["current_user"] = user
        return await func(*args, **kwargs)
    return wrapper

