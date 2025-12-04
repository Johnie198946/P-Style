"""
数据库迁移服务
用于在应用启动时自动检查和添加缺失的数据库字段

根据开发方案第 5.2 节，生产环境应使用 Alembic 进行数据库迁移管理
开发环境可使用此方式快速添加字段，但生产环境应禁用此代码，改用 `alembic upgrade head`

注意：此服务仅用于开发环境，生产环境必须使用 Alembic 迁移
"""
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from loguru import logger

from ..db import engine


def check_and_add_column(
    db: Session,
    table_name: str,
    column_name: str,
    column_type: str,
    nullable: bool = True,
    default_value: str = None,
) -> bool:
    """
    检查表是否存在指定列，如果不存在则添加
    
    Args:
        db: 数据库会话
        table_name: 表名
        column_name: 列名
        column_type: 列类型（SQL 类型字符串，如 "TEXT", "INTEGER", "VARCHAR(255)"）
        nullable: 是否允许 NULL
        default_value: 默认值（可选）
    
    Returns:
        bool: 如果列已存在返回 False，如果成功添加返回 True
    
    Note:
        此函数仅支持 SQLite 和 MySQL，其他数据库可能需要不同的语法
    """
    inspector = inspect(engine)
    
    # 检查表是否存在
    if table_name not in inspector.get_table_names():
        logger.warning(f"【数据库迁移】表 {table_name} 不存在，跳过列检查")
        return False
    
    # 检查列是否存在
    columns = [col["name"] for col in inspector.get_columns(table_name)]
    if column_name in columns:
        logger.debug(f"【数据库迁移】表 {table_name} 的列 {column_name} 已存在，跳过")
        return False
    
    # 构建 ALTER TABLE 语句
    # SQLite 和 MySQL 的语法略有不同
    database_url = str(engine.url)
    if database_url.startswith("sqlite"):
        # SQLite 语法：ALTER TABLE table_name ADD COLUMN column_name column_type
        alter_sql = f'ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}'
        if not nullable:
            alter_sql += " NOT NULL"
        if default_value is not None:
            alter_sql += f" DEFAULT {default_value}"
    elif database_url.startswith("mysql"):
        # MySQL 语法：ALTER TABLE table_name ADD COLUMN column_name column_type
        alter_sql = f'ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}'
        if not nullable:
            alter_sql += " NOT NULL"
        if default_value is not None:
            alter_sql += f" DEFAULT {default_value}"
    else:
        logger.warning(f"【数据库迁移】不支持的数据库类型: {database_url}，跳过列添加")
        return False
    
    try:
        # 执行 ALTER TABLE 语句
        db.execute(text(alter_sql))
        db.commit()
        logger.info(f"【数据库迁移】✅ 成功添加列: {table_name}.{column_name} ({column_type})")
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"【数据库迁移】❌ 添加列失败: {table_name}.{column_name}, 错误: {type(e).__name__}: {str(e)}")
        return False


def check_and_create_table(db: Session, table_name: str, create_sql: str) -> bool:
    """
    检查表是否存在，如果不存在则创建
    
    Args:
        db: 数据库会话
        table_name: 表名
        create_sql: 创建表的 SQL 语句
    
    Returns:
        bool: 如果表已存在返回 False，如果成功创建返回 True
    """
    inspector = inspect(engine)
    
    if table_name in inspector.get_table_names():
        logger.debug(f"【数据库迁移】表 {table_name} 已存在，跳过创建")
        return False
    
    try:
        db.execute(text(create_sql))
        db.commit()
        logger.info(f"【数据库迁移】✅ 成功创建表: {table_name}")
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"【数据库迁移】❌ 创建表失败: {table_name}, 错误: {type(e).__name__}: {str(e)}")
        return False


def migrate_database():
    """
    执行数据库迁移，添加缺失的字段和表
    
    此函数在应用启动时调用，自动检查并添加缺失的字段和表
    仅用于开发环境，生产环境应使用 Alembic 迁移
    
    Note:
        - 此函数会检查所有需要迁移的字段和表
        - 如果字段/表已存在，会跳过
        - 如果字段/表不存在，会尝试添加/创建
        - 如果操作失败，会记录错误但不中断应用启动
    """
    from ..db import SessionLocal
    
    db = SessionLocal()
    try:
        logger.info("【数据库迁移】开始检查数据库表结构...")
        
        # 检查并添加 analysis_tasks.status_reason 字段
        # 根据开发方案第 16.6 节，此字段用于记录任务失败原因
        check_and_add_column(
            db=db,
            table_name="analysis_tasks",
            column_name="status_reason",
            column_type="TEXT",
            nullable=True,
        )
        
        # 【新增】创建 color_grading_iterations 表
        # 用于存储迭代调色反馈历史记录
        create_iterations_table_sql = """
        CREATE TABLE IF NOT EXISTS color_grading_iterations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id VARCHAR(36) NOT NULL,
            user_id INTEGER NOT NULL,
            iteration_number INTEGER NOT NULL,
            user_feedback TEXT NOT NULL,
            preview_image_data TEXT,
            gemini_analysis TEXT,
            gemini_suggestions JSON,
            new_parameters JSON,
            parameter_changes JSON,
            status VARCHAR(32) DEFAULT 'pending' NOT NULL,
            status_reason TEXT,
            processing_time DECIMAL(6, 2),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
            FOREIGN KEY (task_id) REFERENCES analysis_tasks(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
        check_and_create_table(
            db=db,
            table_name="color_grading_iterations",
            create_sql=create_iterations_table_sql,
        )
        
        logger.info("【数据库迁移】数据库表结构检查完成")
    except Exception as e:
        logger.error(f"【数据库迁移】❌ 数据库迁移过程出错: {type(e).__name__}: {str(e)}", exc_info=True)
    finally:
        db.close()

