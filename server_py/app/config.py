"""
应用配置管理
从环境变量和 .env 文件加载配置，支持开发/生产环境分离
"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    应用配置类
    所有配置项均可通过环境变量或 .env 文件覆盖
    """
    
    # ========== 基础配置 ==========
    APP_NAME: str = "PhotoStyle Backend"  # 应用名称
    DEBUG: bool = True  # 调试模式（生产环境应为 False）
    API_V1_STR: str = "/api"  # API 版本前缀

    # ========== 数据库配置 ==========
    # 默认使用本地 SQLite（开发环境），生产环境应切换到 MySQL/PostgreSQL
    DATABASE_URL: str = "sqlite:///./photostyle.db"

    # ========== 安全配置 ==========
    SECRET_KEY: str = "CHANGE_ME_IN_PROD"  # JWT 签名密钥（生产环境必须通过环境变量覆盖）
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120  # Token 过期时间（分钟）
    ADMIN_MAX_FAILED_ATTEMPTS: int = 5  # 管理员最大连续失败登录次数
    ADMIN_LOCK_MINUTES: int = 15  # 管理员账号锁定时长（分钟）

    # ========== Gemini API 配置 ==========
    GEMINI_API_KEY: str = ""  # Gemini API Key（必须通过环境变量配置）
    GEMINI_MODEL: str = "gemini-2.5-pro"  # Part1/Part2 使用的模型
    GEMINI_FLASH_MODEL: str = "gemini-2.5-flash-image"  # Part3 风格模拟使用的模型
    GEMINI_TIMEOUT_MS: int = 120000  # Gemini API 调用超时时间（毫秒），默认 120 秒

    # ========== 代理配置（ClashX） ==========
    # 用于访问 Gemini API 的 HTTP/HTTPS 代理
    HTTP_PROXY: str | None = None  # 例如：http://127.0.0.1:7890
    HTTPS_PROXY: str | None = None  # 例如：http://127.0.0.1:7890
    
    # ========== CORS 配置 ==========
    # 生产环境允许的前端域名（多个域名用逗号分隔）
    # 例如：FRONTEND_ORIGINS="https://example.com,https://www.example.com"
    FRONTEND_ORIGINS: str = ""  # 开发环境不需要配置，代码中已硬编码 localhost:3001

    # ========== 阿里云邮件服务配置 ==========
    # 根据注册登录与权限设计方案第 2.5.1 节配置
    ALIYUN_ACCESS_KEY_ID: str = ""  # AccessKey ID
    ALIYUN_ACCESS_KEY_SECRET: str = ""  # AccessKey Secret
    ALIYUN_EMAIL_FROM: str = "noreply@t-react.com"  # 发信地址
    ALIYUN_EMAIL_TEMPLATE_ID: str = "417051"  # 验证码邮件模版ID

    # ========== Redis 缓存配置（根据永久化存储方案第 7 节） ==========
    # 当前未实现，预留配置项，待第一阶段实施时启用
    REDIS_HOST: str = "localhost"  # Redis 服务器地址（默认 localhost）
    REDIS_PORT: int = 6379  # Redis 端口（默认 6379）
    REDIS_PASSWORD: str | None = None  # Redis 密码（可选，生产环境建议设置）
    REDIS_DB: int = 0  # Redis 数据库编号（默认 0）

    # ========== 对象存储配置（根据永久化存储方案第 8 节） ==========
    # 开发环境：使用 MinIO（docker run -d -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"）
    # 生产环境：使用阿里云 OSS
    OSS_STORAGE_TYPE: str = "local"  # 存储类型：local/minio/aliyun_oss（默认 local，开发环境建议使用 minio）
    OSS_ENDPOINT: str = ""  # 对象存储端点（MinIO: http://localhost:9000，阿里云 OSS: https://oss-cn-hangzhou.aliyuncs.com）
    OSS_ACCESS_KEY_ID: str = ""  # AccessKey ID（MinIO 默认: minioadmin，阿里云 OSS 需要配置）
    OSS_ACCESS_KEY_SECRET: str = ""  # AccessKey Secret（MinIO 默认: minioadmin，阿里云 OSS 需要配置）
    OSS_BUCKET_NAME: str = "photostyle"  # 存储桶名称（默认 photostyle）

    class Config:
        """Pydantic 配置"""
        env_file = ".env"  # 从 .env 文件加载配置
        env_file_encoding = "utf-8"  # 文件编码
        extra = "ignore"  # 忽略未定义的字段（允许环境变量中有额外字段，但不报错）


@lru_cache()
def get_settings() -> Settings:
    """
    获取配置实例（单例模式）
    
    Returns:
        Settings 配置实例
    """
    return Settings()


