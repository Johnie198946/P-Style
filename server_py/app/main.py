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
    
    # 【数据库迁移】检查并添加缺失的字段（仅开发环境）
    # 根据开发方案第 16.6 节，添加 status_reason 字段用于记录任务失败原因
    # 注意：生产环境应使用 Alembic 迁移，不应依赖此自动迁移功能
    try:
        from .services.db_migration import migrate_database
        migrate_database()
    except Exception as e:
        # 迁移失败不应中断应用启动，只记录错误
        logger.error(f"【数据库迁移】应用启动时迁移失败: {type(e).__name__}: {str(e)}", exc_info=True)

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
    # 【重要】异常处理器的注册顺序很重要：
    # 1. 先注册更具体的异常类型（RequestValidationError）
    # 2. 再注册通用异常类型（Exception）
    # 这样 FastAPI 会优先匹配更具体的异常类型
    
    # 注册 RequestValidationError 异常处理器（FastAPI 的参数验证错误）
    # 这通常发生在 Form 数据解析失败、参数类型不匹配、缺少必需参数等情况
    # 必须在 Exception 处理器之前注册，确保 RequestValidationError 被正确捕获
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
            - 常见错误：
              1. 缺少必需参数（如 sourceImage 或 targetImage）
              2. 参数类型不匹配（如期望字符串但收到文件对象）
              3. 数据大小超过限制（MultiPartParser.max_part_size）
        """
        error_detail = str(exc)
        error_errors = exc.errors() if hasattr(exc, 'errors') else []
        
        # 【重要】强制记录详细的错误信息（不记录完整的图片数据）
        # 使用 logger.exception 确保异常堆栈被记录
        logger.exception(f"【参数验证错误】RequestValidationError 被捕获")
        logger.error(f"【参数验证错误】请求路径: {request.url.path}")
        logger.error(f"【参数验证错误】请求方法: {request.method}")
        logger.error(f"【参数验证错误】Content-Type: {request.headers.get('content-type', '未知')}")
        logger.error(f"【参数验证错误】Content-Length: {request.headers.get('content-length', '未知')}")
        logger.error(f"【参数验证错误】错误详情: {error_detail}")
        
        if error_errors:
            logger.error(f"【参数验证错误】验证错误详情（共 {len(error_errors)} 个错误）: {error_errors}")
            # 详细记录每个验证错误
            for idx, error in enumerate(error_errors):
                error_loc = error.get('loc', [])
                error_type = error.get('type', '未知')
                error_msg = error.get('msg', '未知')
                error_input = error.get('input', '未知')
                logger.error(f"【参数验证错误】  错误 {idx + 1}: 字段={error_loc}, 类型={error_type}, 消息={error_msg}, 输入类型={type(error_input).__name__}")
                
                # 特殊处理：如果是可行性评估接口的参数错误，提供更友好的错误消息
                if '/api/analyze/feasibility' in request.url.path:
                    if 'sourceImage' in str(error_loc) or 'targetImage' in str(error_loc):
                        if 'missing' in error_type.lower():
                            logger.error(f"【参数验证错误】    可能原因: 前端未正确发送图片数据，或图片数据为空")
                        elif 'type' in error_type.lower():
                            logger.error(f"【参数验证错误】    可能原因: 图片数据格式不正确（期望字符串，但收到其他类型）")
                        elif 'value_error' in error_type.lower():
                            logger.error(f"【参数验证错误】    可能原因: 图片数据值错误（可能是数据太大或格式不正确）")
        else:
            logger.warning(f"【参数验证错误】error_errors 为空，可能异常对象结构异常")
        
        # 尝试获取请求体信息（但不记录完整的图片数据）
        try:
            if hasattr(request, '_body'):
                body_length = len(request._body) if request._body else 0
                logger.error(f"【参数验证错误】请求体长度: {body_length} 字节 ({body_length / 1024 / 1024:.2f} MB)")
        except Exception as e:
            logger.warning(f"【参数验证错误】无法获取请求体长度: {e}")
        
        # 尝试读取请求体（仅用于调试，不记录完整内容）
        try:
            # 注意：读取请求体后需要重新创建请求对象，否则后续无法读取
            # 这里只检查是否可以读取，不实际读取内容
            if hasattr(request, '_stream'):
                logger.error(f"【参数验证错误】请求流状态: {type(request._stream)}")
        except Exception as e:
            logger.warning(f"【参数验证错误】无法检查请求流状态: {e}")
        
        # 【错误消息构建】构建友好的错误消息，便于前端显示
        # 注意：对于可行性评估接口，提供更具体的错误消息
        error_messages = []
        for error in error_errors:
            field = ".".join(str(loc) for loc in error.get("loc", []))
            error_msg = error.get("msg", "参数错误")
            error_type = error.get("type", "")
            
            # 特殊处理：如果是可行性评估接口的 sourceImage 或 targetImage 字段错误
            if '/api/analyze/feasibility' in request.url.path:
                if 'sourceImage' in field or 'targetImage' in field:
                    if 'missing' in error_type.lower():
                        error_messages.append(f"缺少必需参数: {field}（参考图或用户图未提供）")
                    elif 'type' in error_type.lower():
                        error_messages.append(f"参数类型错误: {field}（期望字符串，但收到其他类型）")
                    elif 'value_error' in error_type.lower():
                        error_messages.append(f"参数值错误: {field}（可能是数据太大或格式不正确）")
                    elif "form" in error_type.lower():
                        error_messages.append(f"Form 数据解析失败: {field}（可能是数据格式不正确）")
                    else:
                        error_messages.append(f"{field}: {error_msg}")
                else:
                    # 其他字段的错误
                    if error_type == "missing":
                        error_messages.append(f"缺少必需参数: {field}")
                    elif error_type == "value_error":
                        error_messages.append(f"参数值错误: {field} - {error_msg}")
                    elif "form" in error_type.lower():
                        error_messages.append(f"Form 数据解析失败: {field} - {error_msg}")
                    else:
                        error_messages.append(f"{field}: {error_msg}")
            else:
                # 其他接口的错误处理
                if error_type == "missing":
                    error_messages.append(f"缺少必需参数: {field}")
                elif error_type == "value_error":
                    error_messages.append(f"参数值错误: {field} - {error_msg}")
                elif "form" in error_type.lower():
                    error_messages.append(f"Form 数据解析失败: {field} - {error_msg}")
                else:
                    error_messages.append(f"{field}: {error_msg}")
        
        # 构建最终错误消息
        error_message = "; ".join(error_messages) if error_messages else "请求参数错误"
        
        # 特殊处理：如果是可行性评估接口，提供更具体的错误消息
        if '/api/analyze/feasibility' in request.url.path:
            # 检查是否是图片数据相关错误
            if any('sourceImage' in str(error.get('loc', [])) or 'targetImage' in str(error.get('loc', [])) for error in error_errors):
                # 如果已经有具体的错误消息，使用它；否则使用通用消息
                if not error_messages or all('图片数据格式错误' not in msg for msg in error_messages):
                    error_message = "图片数据格式错误，请确保正确上传图片。如果问题持续，请检查图片大小是否超过 100MB"
        
        # 【CORS 头处理】获取请求的 Origin 头，用于设置 CORS 响应头
        # 根据开发方案第 0 节，前端运行在 http://localhost:3001
        origin = request.headers.get("Origin", "")
        allowed_origins = ["http://localhost:3001", "http://127.0.0.1:3001"]
        
        # 构建响应头（包含 CORS 头）
        headers = {}
        if origin in allowed_origins:
            headers["Access-Control-Allow-Origin"] = origin
            headers["Access-Control-Allow-Credentials"] = "true"
            headers["Access-Control-Expose-Headers"] = "*"
        
        # 【响应返回】返回统一格式的错误响应
        # 注意：根据开发方案第 15 节，所有错误响应必须统一为 {code, message, data} 格式
        # 对于 RequestValidationError，返回 400 状态码和 INVALID_REQUEST 错误码
        # 【重要】异常处理器返回的响应必须包含 CORS 头，否则浏览器会阻止跨域请求
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "code": ErrorCode.INVALID_REQUEST,
                "message": error_message,
                "data": {
                    "detail": error_detail,
                    "errors": error_errors if error_errors else None,
                } if settings.DEBUG else None,  # 仅在调试模式下返回详细错误信息
            },
            headers=headers,  # 【重要】添加 CORS 头
        )
    
    # 注册 HTTPException 异常处理器（在 RequestValidationError 之后）
    app.add_exception_handler(HTTPException, http_exception_handler)
    
    # 注册通用异常处理器（最后注册，作为兜底）
    # 注意：RequestValidationError 是 Exception 的子类，但由于已经单独注册了 RequestValidationError 处理器
    # FastAPI 会优先使用更具体的 RequestValidationError 处理器
    app.add_exception_handler(Exception, general_exception_handler)

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


