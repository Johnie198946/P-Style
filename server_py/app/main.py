"""
FastAPI 应用主入口
根据开发方案实现，统一后端技术栈为 Python FastAPI
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.responses import JSONResponse
from fastapi import status
from loguru import logger

from .config import get_settings
from .db import Base, engine
from .middleware.exception_handler import http_exception_handler, general_exception_handler
from .middleware.request_logger import RequestLoggerMiddleware  # 请求日志中间件
from .middleware.multipart_size import MultipartSizeMiddleware  # Multipart 文件大小限制中间件
from .constants.error_codes import ErrorCode


def create_app() -> FastAPI:
    """
    创建 FastAPI 应用实例
    
    Returns:
        FastAPI 应用实例，包含所有路由和中间件配置
    """
    settings = get_settings()

    # 自动创建数据库表（开发环境，生产环境应使用迁移工具）
    # 根据永久化存储方案第 5 节，生产环境必须使用 Alembic 进行数据库迁移管理
    # 开发环境可使用此方式快速创建表，但生产环境应禁用此代码，改用 `alembic upgrade head`
    Base.metadata.create_all(bind=engine)

    app = FastAPI(
        title=settings.APP_NAME,
        debug=settings.DEBUG,
        version="0.1.0",
    )

    # CORS 中间件配置
    # 注意：当 allow_credentials=True 时，不能使用 allow_origins=["*"]
    # 浏览器安全策略要求必须明确指定允许的源
    # 根据开发方案第 0 节，前端运行在 http://localhost:3001
    if settings.DEBUG:
        # 开发环境：明确指定前端地址
        allowed_origins = [
            "http://localhost:3001",  # 前端开发服务器
            "http://127.0.0.1:3001",  # 兼容 localhost 和 127.0.0.1
        ]
    else:
        # 生产环境：从环境变量读取允许的前端域名（多个域名用逗号分隔）
        # 例如：FRONTEND_ORIGINS="https://example.com,https://www.example.com"
        frontend_origins = getattr(settings, "FRONTEND_ORIGINS", "").split(",")
        allowed_origins = [origin.strip() for origin in frontend_origins if origin.strip()]
        if not allowed_origins:
            # 如果未配置，默认不允许任何跨域请求（安全）
            allowed_origins = []
    
    # 添加 Multipart 文件大小限制中间件（必须在其他中间件之前，确保在解析 Form 数据之前设置限制）
    # 注意：这个中间件会修改 Starlette 的 MultiPartParser 类属性，影响所有 Form 数据解析
    # 将限制从默认的 1MB 调整为 100MB，解决 "Part exceeded maximum size of 1024KB" 错误
    app.add_middleware(MultipartSizeMiddleware)
    
    # 添加请求日志中间件（用于记录请求信息，特别是 Form 数据请求）
    # 注意：中间件的顺序很重要，RequestLoggerMiddleware 应该在 CORS 中间件之前
    # 这样可以记录所有请求，包括被 CORS 拒绝的请求
    app.add_middleware(RequestLoggerMiddleware)
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,  # 明确指定允许的源，不能使用 ["*"]
        allow_credentials=True,  # 允许携带 Cookie/Authorization 头
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],  # 允许的 HTTP 方法
        allow_headers=["*"],  # 允许所有请求头（包括 Authorization）
        expose_headers=["*"],  # 允许前端访问所有响应头
    )
    
    # 注册统一异常处理器（根据开发方案第 15 节，统一响应格式为 {code, message, data}）
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)
    
    # 注册 RequestValidationError 异常处理器（FastAPI 的参数验证错误）
    # 这通常发生在 Form 数据解析失败、参数类型不匹配、缺少必需参数等情况
    @app.exception_handler(RequestValidationError)
    async def request_validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        """
        处理 FastAPI 的参数验证错误（RequestValidationError）
        根据开发方案第 15 节，统一返回 {code, message, data} 格式
        
        Args:
            request: FastAPI 请求对象
            exc: RequestValidationError 异常对象
        
        Returns:
            JSONResponse: 统一格式的错误响应
        
        Note:
            - RequestValidationError 通常发生在 Form 数据解析失败时
            - 可能的原因包括：参数类型不匹配、缺少必需参数、数据格式错误等
            - 对于可行性评估接口，可能是图片数据太大或格式不正确
        """
        error_detail = str(exc)
        error_errors = exc.errors() if hasattr(exc, 'errors') else []
        
        # 记录详细的错误信息（不记录完整的图片数据）
        logger.error(f"参数验证错误: {error_detail}")
        logger.error(f"请求路径: {request.url.path}")
        logger.error(f"请求方法: {request.method}")
        logger.error(f"Content-Type: {request.headers.get('content-type', '未知')}")
        logger.error(f"Content-Length: {request.headers.get('content-length', '未知')}")
        
        if error_errors:
            logger.error(f"验证错误详情: {error_errors}")
            # 详细记录每个验证错误
            for idx, error in enumerate(error_errors):
                logger.error(f"  错误 {idx + 1}: 字段={error.get('loc', [])}, 类型={error.get('type', '未知')}, 消息={error.get('msg', '未知')}")
        
        # 尝试获取请求体信息（但不记录完整的图片数据）
        try:
            if hasattr(request, '_body'):
                body_length = len(request._body) if request._body else 0
                logger.error(f"请求体长度: {body_length} 字节 ({body_length / 1024 / 1024:.2f} MB)")
        except:
            pass
        
        # 尝试读取请求体（仅用于调试，不记录完整内容）
        try:
            # 注意：读取请求体后需要重新创建请求对象，否则后续无法读取
            # 这里只检查是否可以读取，不实际读取内容
            if hasattr(request, '_stream'):
                logger.error(f"请求流状态: {type(request._stream)}")
        except:
            pass
        
        # 构建友好的错误消息
        error_messages = []
        for error in error_errors:
            field = ".".join(str(loc) for loc in error.get("loc", []))
            error_msg = error.get("msg", "参数错误")
            error_type = error.get("type", "")
            
            # 针对常见错误类型提供更友好的消息
            if error_type == "missing":
                error_messages.append(f"缺少必需参数: {field}")
            elif error_type == "value_error":
                error_messages.append(f"参数值错误: {field} - {error_msg}")
            elif "form" in error_type.lower():
                error_messages.append(f"Form 数据解析失败: {field} - {error_msg}")
            else:
                error_messages.append(f"{field}: {error_msg}")
        
        error_message = "; ".join(error_messages) if error_messages else "请求参数错误"
        
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "code": ErrorCode.INVALID_REQUEST,
                "message": error_message,
                "data": None,
            },
        )

    # 挂载各业务路由模块
    from .routes import auth, upload, analyze, user, export, simulate, admin

    app.include_router(auth.router)      # 认证路由：注册/登录
    app.include_router(upload.router)    # 上传路由：图片上传
    app.include_router(analyze.router)   # 分析路由：可行性评估、Part1/Part2
    app.include_router(user.router)      # 用户路由：个人中心、用量、报告
    app.include_router(export.router)     # 导出路由：XMP/JSX/JSON/PDF
    app.include_router(simulate.router)  # 风格模拟路由：Part3
    app.include_router(admin.router)      # Admin 路由：管理后台

    @app.get("/health")
    def health_check():
        """
        健康检查接口
        
        Returns:
            服务状态，用于监控和负载均衡器检查
        """
        return {"status": "ok"}

    return app


# 创建应用实例（供 uvicorn 启动）
app = create_app()


