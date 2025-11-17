"""
FastAPI 应用启动入口
根据开发方案第 0 节，后端必须运行在 http://localhost:8081
"""
import uvicorn

if __name__ == "__main__":
    # 使用字符串形式传递应用以支持 reload 模式
    # 根据开发方案第 0 节，端口必须为 8081
    uvicorn.run(
        "app.main:app",  # 使用字符串形式以支持 reload
        host="0.0.0.0",
        port=8081,
        reload=True,  # 开发环境启用热重载
        log_level="info",
    )

