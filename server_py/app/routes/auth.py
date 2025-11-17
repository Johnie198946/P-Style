"""
认证路由
根据注册登录与权限设计方案实现
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from ..db import get_db
from ..services.auth_service import AuthService
from ..middleware.auth import security, get_current_user
from ..utils.response import success_response, error_response
from ..constants.error_codes import ErrorCode

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
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """用户注册"""
    try:
        user = auth_service.register_user(db, request.email, request.password, request.display_name)
        token = auth_service.create_token(user.id, token_type="session", role=user.role)
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
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """用户登录"""
    try:
        result = auth_service.login_user(db, request.email, request.password)
        return success_response(data=result, message="登录成功")
    except ValueError as e:
        raise error_response(ErrorCode.AUTH_LOGIN_FAILED, str(e))


@router.post("/send-verification-code")
async def send_verification_code(
    request: SendVerificationCodeRequest,
    db: Session = Depends(get_db),
):
    """
    发送验证码（注册或登录）
    根据注册登录与权限设计方案第 2.3 节实现
    """
    try:
        if request.type == "register":
            # 发送注册验证码
            code = auth_service.send_verification_code_for_register(db, request.email)
        elif request.type == "login":
            # 发送登录验证码
            code = auth_service.send_verification_code_for_login(db, request.email)
        else:
            raise error_response(ErrorCode.INVALID_REQUEST, "type 必须是 'register' 或 'login'")
        
        # 注意：实际验证码通过邮件发送，这里不返回验证码（安全考虑）
        return success_response(
            data={},
            message="验证码已发送到您的邮箱",
        )
    except ValueError as e:
        # ValueError 通常表示业务逻辑错误（如邮箱已注册、发送过于频繁等）
        error_msg = str(e)
        # 根据错误消息判断错误类型，返回更准确的错误码
        if "邮箱已注册" in error_msg:
            raise error_response(ErrorCode.EMAIL_ALREADY_REGISTERED, error_msg)
        elif "发送过于频繁" in error_msg:
            raise error_response(ErrorCode.SEND_CODE_TOO_FREQUENT, error_msg)
        elif "邮件发送失败" in error_msg:
            # 邮件发送失败可能是配置问题或服务问题，返回内部错误
            raise error_response(ErrorCode.EMAIL_SEND_FAILED, error_msg)
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

