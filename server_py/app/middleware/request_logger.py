"""
请求日志中间件
用于记录请求信息，特别是 Form 数据相关的请求，便于排查问题
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from loguru import logger
import time


class RequestLoggerMiddleware(BaseHTTPMiddleware):
    """
    请求日志中间件
    记录请求路径、方法、Content-Type、Content-Length 等信息
    不记录完整的请求体（避免日志过大），只记录关键信息
    """
    
    async def dispatch(self, request: Request, call_next):
        """
        处理请求并记录日志
        
        Args:
            request: Starlette 请求对象
            call_next: 下一个中间件或路由处理函数
        
        Returns:
            Response: HTTP 响应对象
        """
        start_time = time.time()
        
        # 记录请求基本信息
        path = request.url.path
        method = request.method
        content_type = request.headers.get("content-type", "")
        content_length = request.headers.get("content-length", "未知")
        
        # 对于 Form 数据请求，记录更详细的信息
        if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
            logger.info(f"收到 Form 数据请求: {method} {path}, Content-Type={content_type}, Content-Length={content_length}")
            
            # 尝试读取请求体大小（但不读取完整内容，避免内存问题）
            try:
                # 注意：读取请求体后需要重新创建请求对象，否则后续无法读取
                # 这里只记录 Content-Length，不实际读取请求体
                if content_length != "未知":
                    content_length_int = int(content_length)
                    logger.info(f"请求体大小: {content_length_int / 1024 / 1024:.2f} MB, 路径={path}")
                    if content_length_int > 10 * 1024 * 1024:  # 大于 10MB
                        logger.warning(f"请求体较大: {content_length_int / 1024 / 1024:.2f} MB, 路径={path}")
                    elif content_length_int > 100 * 1024 * 1024:  # 大于 100MB
                        logger.error(f"请求体过大: {content_length_int / 1024 / 1024:.2f} MB, 路径={path}, 可能导致解析失败")
            except (ValueError, TypeError):
                pass
        
        # 处理请求
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # 记录响应信息
            status_code = response.status_code
            if status_code >= 400:
                logger.warning(f"请求返回错误: {method} {path}, 状态码={status_code}, 耗时={process_time:.3f}s")
            else:
                logger.debug(f"请求成功: {method} {path}, 状态码={status_code}, 耗时={process_time:.3f}s")
            
            return response
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(f"请求处理异常: {method} {path}, 异常={type(e).__name__}: {str(e)}, 耗时={process_time:.3f}s")
            raise

