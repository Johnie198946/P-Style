"""
FastAPI 应用启动入口
根据开发方案第 0 节，后端必须运行在 http://localhost:8081
"""
import uvicorn

if __name__ == "__main__":
    # 使用字符串形式传递应用以支持 reload 模式
    # 根据开发方案第 0 节，端口必须为 8081
    # 注意：limit_concurrency 和 limit_max_requests 用于限制并发和最大请求数
    # limit_max_requests 设置为 None 表示不限制最大请求数
    # 对于大文件上传（如 base64 图片数据），可能需要增加请求体大小限制
    # 但 FastAPI/Starlette 默认没有请求体大小限制，所以这里不需要额外配置
    uvicorn.run(
        "app.main:app",  # 使用字符串形式以支持 reload
        host="0.0.0.0",
        port=8081,
        reload=True,  # 开发环境启用热重载
        log_level="info",
        # 注意：如果需要限制请求体大小，可以使用 limit_max_requests 参数
        # 但默认情况下，FastAPI 没有请求体大小限制，可以处理任意大小的数据
    )

