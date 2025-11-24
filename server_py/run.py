"""
FastAPI 应用启动入口
根据开发方案第 0 节和顶层设计文档第 2.2 节，后端必须运行在 http://localhost:8081

【重要】启动方式：
- ✅ 正确：使用 `python3 run.py` 或 `python run.py` 启动（端口自动设置为 8081）
- ❌ 错误：直接使用 `uvicorn app.main:app --port 8000` 启动（会导致端口不一致）

【端口配置说明】：
- 前端配置：`src/lib/api.ts` 中的 `API_BASE_URL` 默认为 `http://localhost:8081`
- 后端配置：本文件中的 `port=8081`（必须与前端配置一致）
- 如果端口不一致，前端请求会发送到错误的端口，导致 400 Bad Request 或其他连接错误

【开发环境要求】：
- 前端必须运行在 `http://localhost:3001`（vite.config.ts 中配置）
- 后端必须运行在 `http://localhost:8081`（本文件中配置）
- 两个端口都是强制要求，不允许修改
"""
import uvicorn

if __name__ == "__main__":
    # 【端口配置】根据开发方案第 0 节，端口必须为 8081
    # 注意：这个端口必须与前端 `src/lib/api.ts` 中的 `API_BASE_URL` 保持一致
    # 如果修改了端口，必须同时修改前端配置，否则会导致请求失败
    
    # 【启动参数说明】
    # - host="0.0.0.0"：监听所有网络接口，允许从其他设备访问（开发环境）
    # - port=8081：监听端口（必须为 8081，与开发方案一致）
    # - reload=True：开发环境启用热重载，代码修改后自动重启
    # - log_level="info"：日志级别（info 会显示请求和响应信息）
    
    # 【请求体大小限制】
    # 注意：limit_concurrency 和 limit_max_requests 用于限制并发和最大请求数
    # limit_max_requests 设置为 None 表示不限制最大请求数
    # 对于大文件上传（如 base64 图片数据），可能需要增加请求体大小限制
    # 但 FastAPI/Starlette 默认没有请求体大小限制，所以这里不需要额外配置
    # 如果需要限制，可以使用 limit_max_requests 参数
    
    # 【日志配置】配置 loguru 输出到文件和控制台
    # 注意：loguru 默认输出到 stderr，这里配置同时输出到文件和控制台
    from loguru import logger
    import sys
    
    # 移除默认的 handler
    logger.remove()
    
    # 添加控制台输出（stderr，带颜色）
    logger.add(
        sys.stderr,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level="DEBUG",
        colorize=True,
    )
    
    # 添加文件输出（追加模式，便于查看历史日志）
    logger.add(
        "/tmp/backend_8081.log",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        level="DEBUG",
        rotation="100 MB",  # 当日志文件超过 100MB 时自动轮转
        retention="7 days",  # 保留 7 天的日志
        compression="zip",  # 压缩旧日志文件
    )
    
    logger.info("=" * 80)
    logger.info("后端服务启动中...")
    logger.info(f"日志文件: /tmp/backend_8081.log")
    logger.info(f"监听地址: http://0.0.0.0:8081")
    logger.info("=" * 80)
    
    uvicorn.run(
        "app.main:app",  # 使用字符串形式以支持 reload（代码修改后自动重启）
        host="0.0.0.0",  # 监听所有网络接口（开发环境）
        port=8081,       # 【重要】端口必须为 8081，与开发方案和前端配置一致
        reload=True,     # 开发环境启用热重载
        log_level="info",  # 日志级别（info 会显示请求和响应信息）
        # 注意：如果需要限制请求体大小，可以使用 limit_max_requests 参数
        # 但默认情况下，FastAPI 没有请求体大小限制，可以处理任意大小的数据
    )

