"""
Multipart 文件大小限制中间件
用于配置 Starlette 的 MultiPartParser 的默认文件大小限制，解决 "Part exceeded maximum size of 1024KB" 错误
根据开发方案要求，将限制调整为 100MB
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.formparsers import MultiPartParser
from loguru import logger


class MultipartSizeMiddleware(BaseHTTPMiddleware):
    """
    Multipart 文件大小限制中间件
    配置 Starlette 的 MultiPartParser 的默认文件大小限制为 100MB
    
    注意：
        - Starlette 的 MultiPartParser 默认限制是 1024KB（1MB）
        - 这个限制是针对每个表单字段（part）的大小，不是整个请求体的大小
        - 通过修改 MultiPartParser.max_part_size 和 MultiPartParser.max_file_size 类属性来调整限制
        - 需要在应用启动时设置，确保所有 Form 数据解析都使用新的限制
    """
    
    # 100MB 限制（字节）
    MAX_PART_SIZE = 100 * 1024 * 1024  # 100MB
    
    def __init__(self, app, max_part_size: int = None):
        """
        初始化中间件
        
        Args:
            app: FastAPI 应用实例
            max_part_size: 最大 part 大小（字节），默认 100MB
        """
        super().__init__(app)
        # 设置最大 part 大小限制
        if max_part_size is None:
            max_part_size = self.MAX_PART_SIZE
        
        # 修改 Starlette 的 MultiPartParser 类属性
        # 注意：MultiPartParser.max_part_size 和 max_file_size 是类属性
        # 修改后，所有使用 MultiPartParser 的地方都会使用新的限制
        try:
            # 设置 max_part_size（用于 Form 字段，如 base64 图片数据）
            MultiPartParser.max_part_size = max_part_size
            # 设置 max_file_size（用于文件上传）
            MultiPartParser.max_file_size = max_part_size
            logger.info(f"已设置 MultiPartParser.max_part_size = {max_part_size / 1024 / 1024:.0f}MB")
            logger.info(f"已设置 MultiPartParser.max_file_size = {max_part_size / 1024 / 1024:.0f}MB")
        except Exception as e:
            logger.error(f"设置 MultiPartParser 大小限制失败: {e}")
            raise
        
        self.max_part_size = max_part_size
        logger.info(f"MultipartSizeMiddleware 已初始化，最大 part 大小: {max_part_size / 1024 / 1024:.0f}MB")
    
    async def dispatch(self, request: Request, call_next):
        """
        处理请求，确保 multipart 解析使用正确的大小限制
        
        Args:
            request: Starlette 请求对象
            call_next: 下一个中间件或路由处理函数
        
        Returns:
            Response: HTTP 响应对象
        """
        # 对于 multipart/form-data 请求，记录日志
        content_type = request.headers.get("content-type", "")
        if "multipart/form-data" in content_type:
            logger.debug(f"处理 multipart/form-data 请求，最大 part 大小限制: {self.max_part_size / 1024 / 1024:.0f}MB")
        
        # 继续处理请求
        response = await call_next(request)
        return response

