"""
认证路由
根据注册登录与权限设计方案实现
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from loguru import logger

from ..db import get_db
from ..services.auth_service import AuthService
from ..middleware.auth import security, optional_security, get_current_user
from ..utils.response import success_response, error_response
from ..constants.error_codes import ErrorCode
from ..models import AuthToken
from ..config import get_settings
from typing import Optional

router = APIRouter(prefix="/api/auth", tags=["auth"])
auth_service = AuthService()


class RegisterRequest(BaseModel):
    """注册请求（传统方式：邮箱+密码）"""
    email: EmailStr
    password: str
    display_name: str | None = None


class LoginRequest(BaseModel):
    """登录请求（传统方式：邮箱+密码）"""
    email: EmailStr
    password: str


class SendVerificationCodeRequest(BaseModel):
    """发送验证码请求"""
    email: EmailStr
    type: str  # "register" 或 "login"


class RegisterWithCodeRequest(BaseModel):
    """使用验证码注册请求"""
    email: EmailStr
    code: str  # 6位数字验证码
    password: str
    display_name: str | None = None


class LoginWithCodeRequest(BaseModel):
    """使用验证码登录请求"""
    email: EmailStr
    code: str  # 6位数字验证码


@router.post("/register")
async def register(
    request: RegisterRequest, 
    db: Session = Depends(get_db),
    # 注意：注册接口是公开接口，不需要认证
    # 如果请求中带有 Token（可能是无效的残留 Token），我们忽略它，不进行验证
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
):
    """
    用户注册（公开接口，不需要认证）
    根据开发方案第 25.4 节，注册接口是公开接口，不需要 Token
    
    注意：
    - 如果请求中带有 Token（可能是无效的残留 Token），我们忽略它
    - 注册成功后，会返回新的 Token
    """
    try:
        user = auth_service.register_user(db, request.email, request.password, request.display_name)
        token = auth_service.create_token(user.id, token_type="session", role=user.role)
        
        # 保存 Token 到数据库（根据开发方案第 25.4 节，所有 session Token 必须保存到数据库）
        # 注意：如果不保存到数据库，后续的 Token 验证会失败，因为 get_current_user 会检查 Token 是否在数据库中
        settings = get_settings()
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        session_token = AuthToken(
            user_id=user.id,
            email=user.email,
            type="session",
            token=token,
            expired_at=expire,
            consumed=False,
        )
        db.add(session_token)
        db.commit()
        logger.info(f"用户注册成功并保存 Token 到数据库: {user.email}, user_id={user.id}")
        
        return success_response(
            data={
                "accessToken": token,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "display_name": user.display_name,
                    "avatar_url": user.avatar_url,
                    "role": user.role,
                },
            },
            message="注册成功",
        )
    except ValueError as e:
        raise error_response(ErrorCode.INVALID_REQUEST, str(e))


@router.post("/login")
async def login(
    request: LoginRequest, 
    db: Session = Depends(get_db),
    # 注意：登录接口是公开接口，不需要认证
    # 如果请求中带有 Token（可能是无效的残留 Token），我们忽略它，不进行验证
    # 使用 optional_security 而不是 security，这样即使请求中有 Authorization 头也不会强制验证
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
):
    """
    用户登录（公开接口，不需要认证）
    根据开发方案第 25.4 节，登录接口是公开接口，不需要 Token
    
    注意：
    - 如果请求中带有 Token（可能是无效的残留 Token），我们忽略它
    - 登录成功后，会返回新的 Token，覆盖旧的 Token
    """
    try:
        result = auth_service.login_user(db, request.email, request.password)
        return success_response(data=result, message="登录成功")
    except ValueError as e:
        raise error_response(ErrorCode.AUTH_LOGIN_FAILED, str(e))


@router.post("/send-verification-code")
async def send_verification_code(
    request: SendVerificationCodeRequest,
    db: Session = Depends(get_db),
    # 注意：发送验证码接口是公开接口，不需要认证
    # 如果请求中带有 Token（可能是无效的残留 Token），我们忽略它，不进行验证
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
):
    """
    发送验证码（注册或登录）
    根据注册登录与权限设计方案第 2.3 节实现
    
    注意：
    - 开发环境下，如果邮件发送失败，验证码仍然会保存到数据库和 Redis
    - 开发人员可以通过查看日志获取验证码，接口会返回明确的提示消息
    """
    try:
        # 导入配置，用于判断开发环境
        from ..config import get_settings
        settings = get_settings()
        
        if request.type == "register":
            # 发送注册验证码
            # 返回值为 (code, email_sent)，其中 email_sent 表示邮件是否发送成功
            result = auth_service.send_verification_code_for_register(db, request.email)
            code, email_sent = result if isinstance(result, tuple) else (result, True)
        elif request.type == "login":
            # 发送登录验证码
            # 返回值为 (code, email_sent)，其中 email_sent 表示邮件是否发送成功
            result = auth_service.send_verification_code_for_login(db, request.email)
            code, email_sent = result if isinstance(result, tuple) else (result, True)
        else:
            raise error_response(ErrorCode.INVALID_REQUEST, "type 必须是 'register' 或 'login'")
        
        # 根据邮件发送状态返回不同的消息
        # 开发环境下，如果邮件未发送，返回明确的提示，告知用户这是开发环境，邮件未发送
        # 生产环境下，如果邮件未发送，会抛出异常，不会执行到这里
        if not email_sent and settings.DEBUG:
            # 开发环境：邮件未发送，返回明确的提示消息
            # 注意：验证码已保存到数据库和 Redis，开发人员可以通过查看日志获取验证码
            return success_response(
                data={
                    "email_sent": False,  # 明确标记邮件未发送
                    "dev_mode": True,  # 标记这是开发环境
                },
                message="【开发环境】邮件服务不可用，验证码已生成但未发送。请查看后端日志获取验证码。",
            )
        else:
            # 生产环境或邮件发送成功：返回正常消息
            # 注意：实际验证码通过邮件发送，这里不返回验证码（安全考虑）
            # 返回 email_sent 和 dev_mode 字段，让前端能够正确判断邮件发送状态
            return success_response(
                data={
                    "email_sent": True,  # 明确标记邮件已发送
                    "dev_mode": settings.DEBUG,  # 标记是否为开发环境
                },
                message="验证码已发送到您的邮箱",
            )
    except ValueError as e:
        # ValueError 通常表示业务逻辑错误（如邮箱已注册、邮箱未注册、发送过于频繁等）
        error_msg = str(e)
        # 根据错误消息判断错误类型，返回更准确的错误码
        if "邮箱已注册" in error_msg:
            raise error_response(ErrorCode.EMAIL_ALREADY_REGISTERED, error_msg)
        elif "邮箱未注册" in error_msg:
            # 【重要】登录模式下，邮箱未注册应该返回 EMAIL_NOT_REGISTERED 错误码
            # 前端可以根据此错误码提示用户切换到注册模式
            raise error_response(ErrorCode.EMAIL_NOT_REGISTERED, error_msg)
        elif "发送过于频繁" in error_msg:
            raise error_response(ErrorCode.SEND_CODE_TOO_FREQUENT, error_msg)
        elif "邮件发送失败" in error_msg:
            # 邮件发送失败可能是配置问题或服务问题，返回内部错误
            raise error_response(ErrorCode.EMAIL_SEND_FAILED, error_msg)
        elif "已被禁用" in error_msg:
            # 账号被禁用
            raise error_response(ErrorCode.AUTH_USER_DISABLED, error_msg)
        else:
            raise error_response(ErrorCode.INVALID_REQUEST, error_msg)
    except Exception as e:
        # 其他异常（如数据库错误、网络错误等）返回内部错误
        from loguru import logger
        logger.exception(f"发送验证码时发生未预期的异常: {e}")
        raise error_response(ErrorCode.INTERNAL_ERROR, f"发送验证码失败: {str(e)}")


@router.post("/register-with-code")
async def register_with_code(
    request: RegisterWithCodeRequest,
    db: Session = Depends(get_db),
    # 注意：验证码注册接口是公开接口，不需要认证
    # 如果请求中带有 Token（可能是无效的残留 Token），我们忽略它，不进行验证
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
):
    """
    使用验证码注册
    根据注册登录与权限设计方案第 2.4 节实现
    """
    try:
        user = auth_service.register_with_code(
            db, request.email, request.code, request.password, request.display_name
        )
        token = auth_service.create_token(user.id, token_type="session", role=user.role)
        
        # 保存 Token 到数据库（根据开发方案第 25.4 节，所有 session Token 必须保存到数据库）
        # 注意：如果不保存到数据库，后续的 Token 验证会失败，因为 get_current_user 会检查 Token 是否在数据库中
        settings = get_settings()
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        session_token = AuthToken(
            user_id=user.id,
            email=user.email,
            type="session",
            token=token,
            expired_at=expire,
            consumed=False,
        )
        db.add(session_token)
        db.commit()
        logger.info(f"用户验证码注册成功并保存 Token 到数据库: {user.email}, user_id={user.id}")
        
        return success_response(
            data={
                "accessToken": token,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "display_name": user.display_name,
                    "avatar_url": user.avatar_url,
                    "role": user.role,
                },
            },
            message="注册成功",
        )
    except ValueError as e:
        # ValueError 通常表示业务逻辑错误（如验证码错误、邮箱已注册等）
        error_msg = str(e)
        # 根据错误消息判断错误类型，返回更准确的错误码
        if "验证码错误" in error_msg or "已过期" in error_msg:
            raise error_response(ErrorCode.INVALID_VERIFICATION_CODE, error_msg)
        elif "邮箱已注册" in error_msg or "已存在" in error_msg:
            raise error_response(ErrorCode.EMAIL_ALREADY_REGISTERED, error_msg)
        else:
            raise error_response(ErrorCode.INVALID_REQUEST, error_msg)
    except Exception as e:
        # 其他异常（如数据库错误、网络错误等）返回内部错误
        from loguru import logger
        logger.exception(f"验证码注册时发生未预期的异常: {e}")
        raise error_response(ErrorCode.INTERNAL_ERROR, f"注册失败: {str(e)}")


@router.post("/login-with-code")
async def login_with_code(
    request: LoginWithCodeRequest,
    db: Session = Depends(get_db),
    # 注意：验证码登录接口是公开接口，不需要认证
    # 如果请求中带有 Token（可能是无效的残留 Token），我们忽略它，不进行验证
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
):
    """
    使用验证码登录
    根据注册登录与权限设计方案第 2.3 节实现
    """
    try:
        result = auth_service.login_with_code(db, request.email, request.code)
        return success_response(data=result, message="登录成功")
    except ValueError as e:
        # ValueError 通常表示业务逻辑错误（如验证码错误、邮箱未注册等）
        error_msg = str(e)
        # 根据错误消息判断错误类型，返回更准确的错误码
        if "验证码错误" in error_msg or "已过期" in error_msg:
            raise error_response(ErrorCode.INVALID_VERIFICATION_CODE, error_msg)
        elif "邮箱未注册" in error_msg:
            raise error_response(ErrorCode.EMAIL_NOT_REGISTERED, error_msg)
        elif "已被禁用" in error_msg:
            raise error_response(ErrorCode.AUTH_USER_DISABLED, error_msg)
        else:
            raise error_response(ErrorCode.AUTH_LOGIN_FAILED, error_msg)
    except Exception as e:
        # 其他异常（如数据库错误、网络错误等）返回内部错误
        from loguru import logger
        logger.exception(f"验证码登录时发生未预期的异常: {e}")
        raise error_response(ErrorCode.INTERNAL_ERROR, f"登录失败: {str(e)}")


@router.get("/me")
async def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """获取当前用户信息"""
    current_user = await get_current_user(credentials=credentials, db=db, require_admin=False)
    return success_response(
        data={
            "user": {
                "id": current_user.id,
                "email": current_user.email,
                "display_name": current_user.display_name,
                "avatar_url": current_user.avatar_url,
                "role": current_user.role,
            },
        },
    )

