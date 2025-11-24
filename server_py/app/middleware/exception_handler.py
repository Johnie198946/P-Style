"""
统一异常处理中间件
根据开发方案第 15 节，所有错误响应统一为 {code, message, data} 格式
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException
from loguru import logger

from ..constants.error_codes import ErrorCode, get_http_status


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    处理 HTTPException，统一转换为 {code, message, data} 格式
    根据开发方案第 15 节实现
    
    Args:
        request: FastAPI 请求对象
        exc: HTTPException 异常对象
    
    Returns:
        JSONResponse: 统一格式的错误响应
    
    Note:
        - HTTPException 通常由 HTTPBearer、业务逻辑等抛出
        - 对于可行性评估接口，可能是认证失败（401/403）导致的
        - 需要记录详细的错误信息，便于排查问题
    """
    # 【重要】记录 HTTPException 的详细信息，特别是对于可行性评估接口
    logger.error(f"【HTTPException】被捕获: 状态码={exc.status_code}, 详情={exc.detail}, 路径={request.url.path}")
    
    # 特殊处理：如果是可行性评估接口的认证错误，提供更详细的日志
    if '/api/analyze/feasibility' in request.url.path:
        if exc.status_code in [401, 403]:
            logger.error(f"【HTTPException】可行性评估接口认证失败: 状态码={exc.status_code}")
            logger.error(f"【HTTPException】Authorization 头: {request.headers.get('Authorization', '未提供')}")
    
    # 如果 detail 已经是字典格式（使用 error_response 创建），直接使用
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.detail,
        )
    
    # 否则，将 FastAPI 默认的 detail 格式转换为统一格式
    # 根据 HTTP 状态码映射到错误码
    status_to_error_code = {
        status.HTTP_400_BAD_REQUEST: ErrorCode.INVALID_REQUEST,
        status.HTTP_401_UNAUTHORIZED: ErrorCode.UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN: ErrorCode.FORBIDDEN,
        status.HTTP_404_NOT_FOUND: ErrorCode.NOT_FOUND,
        status.HTTP_500_INTERNAL_SERVER_ERROR: ErrorCode.INTERNAL_ERROR,
    }
    
    error_code = status_to_error_code.get(exc.status_code, ErrorCode.INTERNAL_ERROR)
    message = str(exc.detail) if exc.detail else "操作失败"
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": error_code,
            "message": message,
            "data": None,
        },
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    处理未捕获的异常，统一转换为 {code, message, data} 格式
    根据开发方案第 15 节实现
    
    Args:
        request: FastAPI 请求对象
        exc: 异常对象
    
    Returns:
        JSONResponse: 统一格式的错误响应
    
    Note:
        - 此处理器会捕获所有未预期的异常（包括参数验证错误、数据解析错误等）
        - 对于参数验证错误（如 FastAPI 的 RequestValidationError），会返回 400 错误
        - 对于其他异常，会返回 500 错误
    """
    error_type = type(exc).__name__
    error_detail = str(exc)
    
    # 检查是否是参数验证错误（FastAPI 的 RequestValidationError）
    # 这通常发生在 Form 数据解析失败、参数类型不匹配等情况
    if "validation" in error_type.lower() or "value" in error_type.lower() or "form" in error_type.lower():
        logger.error(f"参数验证错误: {error_type}: {error_detail}")
        logger.error(f"请求路径: {request.url.path}")
        logger.error(f"请求方法: {request.method}")
        # 尝试获取请求体信息（但不记录完整的图片数据）
        try:
            if hasattr(request, '_body'):
                body_length = len(request._body) if request._body else 0
                logger.error(f"请求体长度: {body_length} 字节")
        except:
            pass
        
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "code": ErrorCode.INVALID_REQUEST,
                "message": f"请求参数错误: {error_detail}",
                "data": None,
            },
        )
    
    # 其他未预期的异常
    logger.error(f"未捕获的异常: {error_type}: {error_detail}", exc_info=True)
    logger.error(f"请求路径: {request.url.path}")
    logger.error(f"请求方法: {request.method}")
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "code": ErrorCode.INTERNAL_ERROR,
            "message": "服务器内部错误",
            "data": None,
        },
    )

