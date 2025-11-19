"""
认证中间件
根据注册登录与权限设计方案实现
"""
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional

from ..db import get_db
from ..services.auth_service import AuthService
from ..models import User
from ..utils.response import error_response
from ..constants.error_codes import ErrorCode


# 强制要求 Token（根据注册登录与权限设计方案，所有需要认证的接口必须提供 Token）
# 注意：此 security 对象用于需要认证的接口，公开接口（如登录/注册）不应使用此对象
security = HTTPBearer(auto_error=True)

# 可选的 Token（用于公开接口，如果请求中带有 Token 则验证，但不强制要求）
# 注意：登录/注册接口可以使用此对象，允许用户携带 Token（如刷新 Token），但不强制要求
# 注意：HTTPBearer(auto_error=False) 只在没有 Authorization 头时返回 None
# 如果请求中带有无效 Token 或格式不正确的 Authorization 头，仍然可能抛出异常
# 因此需要自定义依赖函数来手动解析 Authorization 头，避免 HTTPBearer 的异常
async def optional_security(
    request: Request
) -> Optional[HTTPAuthorizationCredentials]:
    """
    可选的 Token 依赖函数
    用于公开接口（如登录/注册），允许请求中带有 Token，但不强制要求
    
    Args:
        request: FastAPI 请求对象（用于手动解析 Authorization 头）
    
    Returns:
        Optional[HTTPAuthorizationCredentials]: Token 凭证，如果请求中没有 Token 或 Token 格式不正确则返回 None
    
    Note:
        - 此函数用于公开接口，如果请求中带有 Token（可能是无效的残留 Token），我们忽略它，不进行验证
        - 即使 Token 无效（如过期、格式错误），也不会抛出异常，而是返回 None
        - 这样可以让登录/注册接口正常工作，即使请求中带有无效的 Token
        - 手动解析 Authorization 头，避免 HTTPBearer 在格式不正确时抛出异常
    """
    # 手动解析 Authorization 头，避免 HTTPBearer 在格式不正确时抛出异常
    authorization = request.headers.get("Authorization")
    if not authorization:
        # 请求中没有 Authorization 头，返回 None
        return None
    
    # 检查 Authorization 头格式是否为 "Bearer <token>"
    if not authorization.startswith("Bearer "):
        # Authorization 头格式不正确，返回 None（不抛出异常）
        return None
    
    # 提取 Token（去掉 "Bearer " 前缀）
    token = authorization[7:]  # "Bearer " 长度为 7
    
    # 如果 Token 为空，返回 None
    if not token:
        return None
    
    # 返回 HTTPAuthorizationCredentials 对象（但不验证 Token 的有效性）
    # 注意：我们只是解析了 Token，不会验证它的有效性（如签名、过期时间等）
    # 这样可以让登录/注册接口正常工作，即使请求中带有无效的 Token
    from fastapi.security import HTTPAuthorizationCredentials
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

auth_service = AuthService()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    require_admin: bool = False,
) -> User:
    """
    获取当前用户（中间件）
    根据注册登录与权限设计方案实现
    
    Args:
        credentials: Bearer Token（从 HTTP Authorization 头获取）
        db: 数据库会话
        require_admin: 是否要求管理员权限（True 表示需要管理员权限，False 表示普通用户即可）
    
    Returns:
        User 对象（当前登录用户）
    
    Raises:
        HTTPException: 认证失败（Token 无效、过期、类型不正确、用户不存在等）
    
    Note:
        - 此中间件用于所有需要认证的接口（如上传、分析、导出等）
        - Token 验证包括：签名验证、过期时间检查、Token 类型检查、数据库验证、用户状态检查
        - JWT 标准要求 "sub" 必须是字符串类型，因此 Token 创建时会将 user_id 转换为字符串
        - Token 验证时需要将 "sub" 从字符串转换为整数
    """
    # 1. 从 credentials 获取 token
    if not credentials:
        raise error_response(ErrorCode.UNAUTHORIZED, "未提供认证 Token")
    token = credentials.credentials

    # 2. 验证 Token（检查签名和过期时间）
    # 注意：verify_token 方法会检查 Token 的签名和过期时间，如果无效则返回 None
    payload = auth_service.verify_token(token)
    if not payload:
        raise error_response(ErrorCode.AUTH_TOKEN_INVALID, "Token 无效或已过期")

    # 3. 检查 Token 类型
    # 注意：普通用户接口需要 type="session"，管理员接口需要 type="admin_session"
    # 管理员可以使用 admin_session Token 访问普通用户接口（管理员拥有所有权限）
    token_type = payload.get("type", "")
    user_role = payload.get("role", "")
    
    if require_admin:
        # 管理员接口：必须同时满足 type="admin_session" 和 role="admin"
        if token_type != "admin_session" or user_role != "admin":
            raise error_response(ErrorCode.AUTH_ADMIN_PERMISSION_DENIED, "需要管理员权限")
    else:
        # 普通用户接口：允许 type="session" 或 type="admin_session"（管理员可以访问）
        # 注意：管理员使用 admin_session Token 访问普通用户接口时，应该被允许
        # 这样管理员可以同时使用主站功能和管理后台功能，无需切换 Token
        if token_type == "session":
            # 普通用户的 session Token，允许访问
            pass
        elif token_type == "admin_session" and user_role == "admin":
            # 管理员的 admin_session Token，也允许访问普通用户接口
            # 这样管理员可以使用同一个 Token 访问所有功能
            pass
        else:
            # 其他类型的 Token 不允许访问普通用户接口
            raise error_response(ErrorCode.AUTH_TOKEN_INVALID, "Token 类型不正确")

    # 4. 从数据库获取用户
    # 注意：get_current_user 方法会检查 Token 是否在数据库中、是否已过期
    # 对于验证码类型的 Token（email_otp、admin_mfa），还会检查 consumed 字段（必须为 False）
    # 对于 session Token（session、admin_session），不检查 consumed 字段（允许重复使用）
    # 还会检查用户是否存在、用户状态是否为 active
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

