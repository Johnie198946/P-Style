"""
数据模型定义
根据开发方案第 25 节和顶层设计文档实现
包含用户、认证令牌、分析任务、上传记录、订阅、支付等核心实体
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column,
    String,
    Integer,
    DateTime,
    Text,
    JSON,
    Boolean,
    Enum,
    ForeignKey,
    DECIMAL,
)
from sqlalchemy.orm import relationship

from .db import Base


class User(Base):
    """
    用户模型
    存储用户基本信息、角色、状态等
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)  # 用户 ID（主键）
    email = Column(String(255), unique=True, index=True, nullable=False)  # 邮箱（唯一，索引）
    password_hash = Column(String(255), nullable=False)  # 密码哈希（bcrypt 加密）
    display_name = Column(String(255), nullable=True)  # 显示名称（昵称）
    avatar_url = Column(String(512), nullable=True)  # 头像 URL
    role = Column(String(32), default="user", nullable=False)  # 角色（user/admin）
    status = Column(String(32), default="active", nullable=False)  # 状态（active/disabled）
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)  # 创建时间
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)  # 更新时间

    # 关联关系：一个用户可以有多个订阅
    subscriptions = relationship("Subscription", back_populates="user")


class AuthToken(Base):
    """
    认证令牌模型
    统一管理所有登录会话与一次性验证码，支持单点登出与安全审计
    根据开发方案第 25 节和注册登录与权限设计方案实现
    """
    __tablename__ = "auth_tokens"

    id = Column(Integer, primary_key=True, index=True)  # 令牌 ID（主键）
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # 用户 ID（外键，注册时为 NULL，登录时为对应用户 ID）
    email = Column(String(255), nullable=True)  # 邮箱（用于注册验证码查找，登录验证码通过 user_id 查找）
    type = Column(String(32), nullable=False)  # 令牌类型（session/admin_session/email_otp/admin_mfa）
    token = Column(String(512), unique=True, index=True, nullable=False)  # JWT Token 或验证码（唯一，索引）
    expired_at = Column(DateTime, nullable=False)  # 过期时间
    consumed = Column(Boolean, default=False, nullable=False)  # 是否已消费（用于一次性验证码）
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)  # 创建时间


class AnalysisTask(Base):
    """
    分析任务模型
    存储两阶段分析（Part1/Part2）和风格模拟（Part3）的完整数据
    根据开发方案第 4、16 节和顶层设计文档实现
    """
    __tablename__ = "analysis_tasks"

    id = Column(String(36), primary_key=True, index=True)  # 任务 ID（UUID，主键）
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # 用户 ID（外键，可为空支持匿名）
    source_image_data = Column(Text, nullable=True)  # 源图（Base64，后续替换为对象存储 URL）
    target_image_data = Column(Text, nullable=True)  # 目标图（Base64，可选）
    gemini_result = Column(JSON, nullable=True)  # Gemini 原始返回（保持完整结构，用于调试）
    structured_result = Column(JSON, nullable=True)  # 规范映射后的结构化结果（供前端使用）
    mapping_result = Column(JSON, nullable=True)  # 色彩映射二次结构化结果
    part1_summary = Column(Text, nullable=True)  # Part1 自然语言摘要（用于前端 Summary 卡片）
    workflow_draft = Column(Text, nullable=True)  # Part1 工作流草案（JSON 字符串）
    workflow_final = Column(Text, nullable=True)  # Part2 工作流成品（JSON 字符串）
    workflow_alignment_notes = Column(Text, nullable=True)  # 草案 vs 执行差异说明
    natural_language_part1 = Column(Text, nullable=True)  # Part1 全量自然语言报告
    natural_language_part2 = Column(Text, nullable=True)  # Part2 全量自然语言报告
    part2_completed = Column(Boolean, default=False, nullable=False)  # Part2 是否完成
    feasibility_result = Column(JSON, nullable=True)  # 可行性评估结果（第 26 节 JSON 结构）
    status = Column(String(20), default="pending", nullable=False)  # 任务状态（pending/part1_completed/completed/failed）
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)  # 创建时间
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)  # 更新时间


class Upload(Base):
    """
    上传记录模型
    存储图片上传记录和相似度计算结果
    根据永久化存储方案，当前使用 Base64 存储，后续应迁移到对象存储（使用 source_image_url 和 target_image_url）
    """
    __tablename__ = "uploads"

    id = Column(String(64), primary_key=True, index=True)  # 上传记录 ID（UUID，主键）
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # 用户 ID（外键，可为空）
    source_image_data = Column(Text, nullable=True)  # 源图 Base64（当前使用，后续应迁移到对象存储）
    target_image_data = Column(Text, nullable=True)  # 目标图 Base64（当前使用，后续应迁移到对象存储）
    source_image_url = Column(Text, nullable=True)  # 源图对象存储 URL（预留字段，待对象存储迁移后使用）
    target_image_url = Column(Text, nullable=True)  # 目标图对象存储 URL（预留字段，待对象存储迁移后使用）
    similarity_score = Column(DECIMAL(5, 2), nullable=True)  # 相似度分数（0.00-1.00）
    analysis_task_id = Column(String(64), ForeignKey("analysis_tasks.id"), nullable=True)  # 关联的分析任务 ID（外键）
    status = Column(String(32), default="uploaded", nullable=False)  # 状态（uploaded/processing/completed）
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)  # 创建时间
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)  # 更新时间


class SubscriptionPlan(Base):
    """
    订阅计划模型
    定义订阅套餐模板，由管理员维护
    根据永久化存储方案和注册登录与权限设计方案实现
    """
    __tablename__ = "subscription_plans"

    id = Column(Integer, primary_key=True, index=True)  # 套餐 ID（主键）
    name = Column(String(255), nullable=False)  # 套餐名称（如"免费版"、"专业版"）
    description = Column(Text, nullable=True)  # 套餐描述文本
    price = Column(DECIMAL(10, 2), nullable=False)  # 价格（DECIMAL(10,2)）
    period = Column(String(32), default="monthly", nullable=False)  # 计费周期（monthly/yearly）
    features = Column(JSON, nullable=True)  # 功能特性 JSON（包含 analysis_per_month、generations_per_month 等用量限制）
    is_active = Column(Boolean, default=True, nullable=False)  # 是否启用
    sort_order = Column(Integer, default=0, nullable=False)  # 排序顺序
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)  # 创建时间
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)  # 更新时间


class Subscription(Base):
    """
    订阅记录模型
    记录用户的订阅关系，支持一个用户拥有多个历史订阅记录
    根据永久化存储方案和注册登录与权限设计方案实现
    """
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)  # 订阅 ID（主键）
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # 用户 ID（外键）
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=False)  # 套餐 ID（外键）
    status = Column(String(32), default="active", nullable=False)  # 订阅状态（active/cancelled/expired）
    start_at = Column(DateTime, nullable=False)  # 订阅开始时间
    end_at = Column(DateTime, nullable=True)  # 订阅结束时间（免费版可为 NULL）
    cancelled_at = Column(DateTime, nullable=True)  # 取消时间（可选）
    extra_data = Column(JSON, nullable=True)  # 扩展数据 JSON（存储 auto_renew 等配置，注意：不能使用 metadata，因为这是 SQLAlchemy 的保留字）
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)  # 创建时间
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)  # 更新时间

    user = relationship("User", back_populates="subscriptions")  # 关联关系：反向引用到 User 模型


class Payment(Base):
    """
    支付记录模型
    记录支付订单信息，用于支付对账和财务审计
    根据永久化存储方案，支付记录永久保留
    """
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)  # 支付 ID（主键）
    order_no = Column(String(64), unique=True, index=True, nullable=False)  # 订单号（唯一索引）
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # 用户 ID（外键）
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=True)  # 套餐 ID（外键，可选）
    amount = Column(DECIMAL(10, 2), nullable=False)  # 支付金额（DECIMAL(10,2)）
    currency = Column(String(8), default="CNY", nullable=False)  # 货币类型（默认 CNY）
    status = Column(String(32), default="pending", nullable=False)  # 支付状态（pending/succeeded/failed/refunded）
    channel = Column(String(32), nullable=True)  # 支付渠道（如 "alipay"、"wechat"）
    txn_id = Column(String(128), nullable=True)  # 第三方交易 ID（可选）
    paid_at = Column(DateTime, nullable=True)  # 支付完成时间（可选）
    extra_data = Column(JSON, nullable=True)  # 扩展数据 JSON（存储第三方回调数据，注意：不能使用 metadata，因为这是 SQLAlchemy 的保留字）
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)  # 创建时间
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)  # 更新时间


