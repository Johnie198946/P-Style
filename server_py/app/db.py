"""
数据库连接与会话管理
使用 SQLAlchemy ORM，支持 SQLite（开发）和 MySQL（生产）
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session

from .config import get_settings

settings = get_settings()

# 创建数据库引擎
# SQLite 需要 check_same_thread=False 以支持多线程
# MySQL/PostgreSQL 不需要此参数
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {},
    future=True,  # 使用 SQLAlchemy 2.0 风格
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)

# 声明式基类（用于定义数据模型）
Base = declarative_base()


def get_db() -> Session:
    """
    获取数据库会话（依赖注入）
    
    Yields:
        Session: SQLAlchemy 数据库会话
        
    Note:
        此函数作为 FastAPI 的依赖项使用，确保每个请求结束后自动关闭会话
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


