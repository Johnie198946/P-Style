"""
统一响应格式工具
根据开发方案第 15 节，所有接口统一返回 {code, message, data} 格式
"""
from fastapi import HTTPException, status
from typing import Any, Optional

from ..constants.error_codes import ErrorCode, get_http_status


def success_response(data: Any = None, message: str = "ok") -> dict:
    """
    成功响应
    
    Args:
        data: 响应数据
        message: 响应消息，默认 "ok"
    
    Returns:
        dict: {code: 0, message: "ok", data: {...}}
    """
    return {
        "code": 0,
        "message": message,
        "data": data or {},
    }


def error_response(
    error_code: str,
    message: Optional[str] = None,
    data: Optional[Any] = None,
    http_status: Optional[int] = None,
) -> HTTPException:
    """
    错误响应
    根据开发方案第 15 节，统一返回 {code, message, data} 格式
    
    Args:
        error_code: 错误码（ErrorCode 常量）
        message: 错误消息（可选，如果不提供则使用默认消息）
        data: 错误附加数据（可选）
        http_status: HTTP 状态码（可选，如果不提供则根据错误码自动映射）
    
    Returns:
        HTTPException: FastAPI 异常对象，包含统一格式的错误响应
    
    Example:
        raise error_response(ErrorCode.UNAUTHORIZED, "请先登录")
        # 返回: HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "请先登录", "data": None})
    """
    # 错误码到默认消息的映射
    error_messages = {
        ErrorCode.UNAUTHORIZED: "未授权，请先登录",
        ErrorCode.FORBIDDEN: "无权限访问",
        ErrorCode.NOT_FOUND: "资源不存在",
        ErrorCode.INVALID_REQUEST: "请求参数错误",
        ErrorCode.INTERNAL_ERROR: "服务器内部错误",
        ErrorCode.AUTH_TOKEN_INVALID: "Token 无效或已过期",
        ErrorCode.AUTH_TOKEN_EXPIRED: "Token 已过期",
        ErrorCode.AUTH_LOGIN_FAILED: "登录失败",
        ErrorCode.AUTH_PASSWORD_INCORRECT: "密码错误",
        ErrorCode.AUTH_USER_NOT_FOUND: "用户不存在",
        ErrorCode.AUTH_USER_DISABLED: "账号已被禁用",
        ErrorCode.USAGE_ANALYSIS_LIMIT_EXCEEDED: "分析次数已达上限",
        ErrorCode.USAGE_GENERATION_LIMIT_EXCEEDED: "生成次数已达上限",
        ErrorCode.TASK_NOT_FOUND: "任务不存在",
        ErrorCode.UPLOAD_FAILED: "上传失败",
        ErrorCode.VALIDATION_FAILED: "数据验证失败",
        ErrorCode.MISSING_REQUIRED_FIELD: "缺少必需字段",
        ErrorCode.INVALID_FIELD_FORMAT: "字段格式错误",
    }
    
    # 使用提供的消息或默认消息
    error_message = message or error_messages.get(error_code, "操作失败")
    
    # 获取 HTTP 状态码
    if http_status is None:
        http_status = get_http_status(error_code)
    
    # 返回统一格式的错误响应
    # 注意：FastAPI 的 HTTPException 使用 detail 字段，我们需要将其设置为字典格式
    # 但 FastAPI 默认会将 detail 序列化为 JSON，所以这里直接返回字典
    return HTTPException(
        status_code=http_status,
        detail={
            "code": error_code,
            "message": error_message,
            "data": data,
        },
    )

