"""
数据库备份脚本
根据永久化存储方案第 9 节实现
支持 SQLite 和 MySQL/PostgreSQL 的自动备份
"""
import os
import sys
import subprocess
from datetime import datetime
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import get_settings
from loguru import logger

settings = get_settings()


def backup_sqlite(db_path: str, backup_dir: str) -> str:
    """
    备份 SQLite 数据库
    
    Args:
        db_path: SQLite 数据库文件路径
        backup_dir: 备份目录
    
    Returns:
        str: 备份文件路径
    """
    backup_dir_path = Path(backup_dir)
    backup_dir_path.mkdir(parents=True, exist_ok=True)
    
    # 生成备份文件名（根据永久化存储方案第 9 节）
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"photostyle_backup_{timestamp}.db"
    backup_path = backup_dir_path / backup_filename
    
    # 复制数据库文件
    import shutil
    shutil.copy2(db_path, backup_path)
    
    logger.info(f"SQLite 备份完成: {backup_path}")
    return str(backup_path)


def backup_mysql(host: str, port: int, user: str, password: str, database: str, backup_dir: str) -> str:
    """
    备份 MySQL 数据库
    
    Args:
        host: MySQL 主机地址
        port: MySQL 端口
        user: MySQL 用户名
        password: MySQL 密码
        database: 数据库名称
        backup_dir: 备份目录
    
    Returns:
        str: 备份文件路径
    """
    backup_dir_path = Path(backup_dir)
    backup_dir_path.mkdir(parents=True, exist_ok=True)
    
    # 生成备份文件名
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"photostyle_backup_{timestamp}.sql"
    backup_path = backup_dir_path / backup_filename
    
    # 执行 mysqldump
    cmd = [
        "mysqldump",
        f"--host={host}",
        f"--port={port}",
        f"--user={user}",
        f"--password={password}",
        database,
    ]
    
    with open(backup_path, "w") as f:
        result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, text=True)
        if result.returncode != 0:
            raise Exception(f"mysqldump 失败: {result.stderr}")
    
    logger.info(f"MySQL 备份完成: {backup_path}")
    return str(backup_path)


def backup_postgresql(host: str, port: int, user: str, password: str, database: str, backup_dir: str) -> str:
    """
    备份 PostgreSQL 数据库
    
    Args:
        host: PostgreSQL 主机地址
        port: PostgreSQL 端口
        user: PostgreSQL 用户名
        password: PostgreSQL 密码
        database: 数据库名称
        backup_dir: 备份目录
    
    Returns:
        str: 备份文件路径
    """
    backup_dir_path = Path(backup_dir)
    backup_dir_path.mkdir(parents=True, exist_ok=True)
    
    # 生成备份文件名
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"photostyle_backup_{timestamp}.sql"
    backup_path = backup_dir_path / backup_filename
    
    # 设置环境变量（pg_dump 使用环境变量读取密码）
    env = os.environ.copy()
    env["PGPASSWORD"] = password
    
    # 执行 pg_dump
    cmd = [
        "pg_dump",
        f"--host={host}",
        f"--port={port}",
        f"--username={user}",
        database,
    ]
    
    with open(backup_path, "w") as f:
        result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, text=True, env=env)
        if result.returncode != 0:
            raise Exception(f"pg_dump 失败: {result.stderr}")
    
    logger.info(f"PostgreSQL 备份完成: {backup_path}")
    return str(backup_path)


def cleanup_old_backups(backup_dir: str, days: int = 30):
    """
    清理超过指定天数的备份文件
    根据永久化存储方案第 9 节：生产环境保留 30 天备份
    
    Args:
        backup_dir: 备份目录
        days: 保留天数，默认 30 天
    """
    backup_dir_path = Path(backup_dir)
    if not backup_dir_path.exists():
        return
    
    cutoff_time = datetime.now().timestamp() - (days * 24 * 60 * 60)
    
    deleted_count = 0
    for backup_file in backup_dir_path.glob("photostyle_backup_*.sql"):
        if backup_file.stat().st_mtime < cutoff_time:
            backup_file.unlink()
            deleted_count += 1
    
    for backup_file in backup_dir_path.glob("photostyle_backup_*.db"):
        if backup_file.stat().st_mtime < cutoff_time:
            backup_file.unlink()
            deleted_count += 1
    
    if deleted_count > 0:
        logger.info(f"清理 {deleted_count} 个超过 {days} 天的备份文件")


def main():
    """主函数：执行数据库备份"""
    database_url = settings.DATABASE_URL
    backup_dir = os.getenv("BACKUP_DIR", "./backups")
    
    try:
        if database_url.startswith("sqlite"):
            # SQLite 备份
            db_path = database_url.replace("sqlite:///", "")
            backup_path = backup_sqlite(db_path, backup_dir)
        elif database_url.startswith("mysql"):
            # MySQL 备份（需要从 DATABASE_URL 解析连接信息）
            # 格式：mysql+pymysql://user:password@host:port/database
            from urllib.parse import urlparse
            parsed = urlparse(database_url.replace("mysql+pymysql://", "mysql://"))
            backup_path = backup_mysql(
                host=parsed.hostname or "localhost",
                port=parsed.port or 3306,
                user=parsed.username or "root",
                password=parsed.password or "",
                database=parsed.path.lstrip("/"),
                backup_dir=backup_dir
            )
        elif database_url.startswith("postgresql"):
            # PostgreSQL 备份
            from urllib.parse import urlparse
            parsed = urlparse(database_url)
            backup_path = backup_postgresql(
                host=parsed.hostname or "localhost",
                port=parsed.port or 5432,
                user=parsed.username or "postgres",
                password=parsed.password or "",
                database=parsed.path.lstrip("/"),
                backup_dir=backup_dir
            )
        else:
            logger.error(f"不支持的数据库类型: {database_url}")
            return
        
        # 清理旧备份（生产环境保留 30 天，开发环境保留 7 天）
        retention_days = 7 if settings.DEBUG else 30
        cleanup_old_backups(backup_dir, days=retention_days)
        
        logger.info(f"数据库备份完成: {backup_path}")
    except Exception as e:
        logger.error(f"数据库备份失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

