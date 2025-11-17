"""
FastAPI 应用主入口
根据开发方案实现，统一后端技术栈为 Python FastAPI
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import HTTPException

from .config import get_settings
from .db import Base, engine
from .middleware.exception_handler import http_exception_handler, general_exception_handler


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


