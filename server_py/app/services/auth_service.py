"""
认证服务 - 用户注册、登录、JWT 生成、验证码管理
根据注册登录与权限设计方案实现
"""
from jose import jwt, JWTError
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from loguru import logger

from ..models import User, AuthToken, Subscription, SubscriptionPlan
from ..config import get_settings
from ..services.email_service import EmailService  # 用于 generate_code 静态方法
from ..services.cache_service import cache_service


class AuthService:
    """认证服务"""

    def __init__(self):
        self.settings = get_settings()

    def hash_password(self, password: str) -> str:
        """加密密码"""
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def verify_password(self, password: str, hashed: str) -> bool:
        """验证密码"""
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

    def create_token(self, user_id: int, token_type: str = "session", role: str = "user") -> str:
        """
        创建 JWT Token
        根据注册登录与权限设计方案实现
        
        Args:
            user_id: 用户 ID（整数）
            token_type: Token 类型（"session" 普通用户 / "admin_session" 管理员）
            role: 用户角色（"user" / "admin"）
        
        Returns:
            str: JWT Token 字符串
        
        Note:
            - JWT 标准要求 "sub" (subject) 必须是字符串类型，因此需要将 user_id 转换为字符串
            - Token 过期时间由 settings.ACCESS_TOKEN_EXPIRE_MINUTES 配置（默认 120 分钟）
        """
        expire = datetime.utcnow() + timedelta(minutes=self.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {
            "sub": str(user_id),  # JWT 标准要求 sub 必须是字符串类型，将 user_id 转换为字符串
            "type": token_type,  # Token 类型：session（普通用户）或 admin_session（管理员）
            "role": role,  # 用户角色：user 或 admin
            "exp": expire,  # Token 过期时间
        }
        return jwt.encode(payload, self.settings.SECRET_KEY, algorithm="HS256")

    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """验证 Token"""
        try:
            payload = jwt.decode(token, self.settings.SECRET_KEY, algorithms=["HS256"])
            return payload
        except JWTError as e:
            logger.warning(f"Token 验证失败: {e}")
            return None

    def register_user(
        self, db: Session, email: str, password: str, display_name: Optional[str] = None
    ) -> User:
        """
        注册用户（传统方式：邮箱+密码）
        注意：新用户会自动创建免费版订阅
        
        Args:
            db: 数据库会话
            email: 邮箱
            password: 密码
            display_name: 显示名称（可选）
        
        Returns:
            User: 新创建的用户对象
        
        Raises:
            ValueError: 邮箱已存在
        """
        # 检查邮箱是否已存在
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise ValueError("邮箱已存在")

        # 创建用户
        user = User(
            email=email,
            password_hash=self.hash_password(password),
            display_name=display_name or email.split("@")[0],
            role="user",
            status="active",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # 自动创建免费版订阅（根据开发方案第 25.5 节）
        free_plan = db.query(SubscriptionPlan).filter(
            SubscriptionPlan.name.ilike("%免费%")
        ).first()
        
        if not free_plan:
            # 如果没有找到免费计划，创建一个默认的
            free_plan = SubscriptionPlan(
                name="免费版",
                description="免费版订阅",
                price=0.00,
                period="monthly",
                features={
                    "analysis_per_month": 10,
                    "generations_per_month": 5,
                },
                is_active=True,
                sort_order=0,
            )
            db.add(free_plan)
            db.commit()
            db.refresh(free_plan)
        
        # 创建订阅记录
        now = datetime.utcnow()
        subscription = Subscription(
            user_id=user.id,
            plan_id=free_plan.id,
            status="active",
            start_at=now,
            end_at=None,  # 免费版不设到期时间
            extra_data={"auto_renew": False},
        )
        db.add(subscription)
        db.commit()
        
        logger.info(f"用户注册成功并自动创建免费订阅: {email}, user_id={user.id}")
        
        return user

    def login_user(self, db: Session, email: str, password: str, token_type: str = "session") -> Dict[str, Any]:
        """
        用户登录
        根据注册登录与权限设计方案实现
        
        Args:
            db: 数据库会话
            email: 用户邮箱
            password: 用户密码（明文）
            token_type: Token 类型（默认 "session"）
        
        Returns:
            包含 accessToken 和 user 信息的字典
        
        Raises:
            ValueError: 如果邮箱或密码错误、账号被禁用等业务逻辑错误
            Exception: 如果数据库操作失败等未预期的错误
        """
        # 【日志记录】记录登录服务调用
        logger.info(f"【登录服务】开始处理登录请求: 邮箱={email}")
        
        # 【步骤 1】查找用户
        logger.debug(f"【登录服务】步骤 1：查找用户，邮箱={email}")
        user = db.query(User).filter(User.email == email).first()
        if not user:
            logger.warning(f"【登录服务】❌ 用户不存在: 邮箱={email}")
            raise ValueError("邮箱或密码错误")

        # 【步骤 2】验证密码
        logger.debug(f"【登录服务】步骤 2：验证密码，用户ID={user.id}")
        if not self.verify_password(password, user.password_hash):
            logger.warning(f"【登录服务】❌ 密码错误: 邮箱={email}, 用户ID={user.id}")
            raise ValueError("邮箱或密码错误")

        # 【步骤 3】检查账号状态
        logger.debug(f"【登录服务】步骤 3：检查账号状态，用户ID={user.id}, 状态={user.status}")
        if user.status != "active":
            logger.warning(f"【登录服务】❌ 账号已被禁用: 邮箱={email}, 用户ID={user.id}, 状态={user.status}")
            raise ValueError("账号已被禁用")

        # 【步骤 4】生成 Token
        logger.debug(f"【登录服务】步骤 4：生成 Token，用户ID={user.id}, 角色={user.role}")
        try:
            # 【修复】修复缩进错误：token 生成语句应该在 try 块内
            token = self.create_token(user.id, token_type=token_type, role=user.role)
            logger.debug(f"【登录服务】Token 生成成功，长度: {len(token)} 字符")
        except Exception as e:
            logger.error(f"【登录服务】❌ Token 生成失败: {type(e).__name__}: {str(e)}", exc_info=True)
            raise ValueError(f"Token 生成失败: {str(e)}")

        # 【步骤 5】保存 Token 到数据库
        logger.debug(f"【登录服务】步骤 5：保存 Token 到数据库，用户ID={user.id}")
        try:
            # 【修复】修复缩进错误：expire 和 auth_token 相关语句应该在 try 块内
            expire = datetime.utcnow() + timedelta(minutes=self.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            auth_token = AuthToken(
                user_id=user.id,
                type=token_type,
                token=token,
                expired_at=expire,
                consumed=False,
            )
            db.add(auth_token)
            db.commit()
            logger.debug(f"【登录服务】Token 已保存到数据库，过期时间: {expire.strftime('%Y-%m-%d %H:%M:%S')}")
        except Exception as e:
            # 数据库操作失败，回滚事务
            db.rollback()
            logger.error(f"【登录服务】❌ Token 保存失败: {type(e).__name__}: {str(e)}", exc_info=True)
            raise ValueError(f"Token 保存失败: {str(e)}")

        # 【步骤 6】返回结果
        logger.info(f"【登录服务】✅ 登录成功: 邮箱={email}, 用户ID={user.id}, 角色={user.role}")
        return {
            "accessToken": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "display_name": user.display_name,
                "avatar_url": user.avatar_url,
                "role": user.role,
            },
        }

    def get_current_user(self, db: Session, token: str) -> Optional[User]:
        """
        从 Token 获取当前用户
        根据注册登录与权限设计方案实现
        
        Args:
            db: 数据库会话
            token: JWT Token 字符串
        
        Returns:
            Optional[User]: 用户对象，如果 Token 无效或用户不存在则返回 None
        
        Note:
            - 验证 Token 的有效性（签名、过期时间）
            - 检查 Token 是否在数据库中且未过期
            - 对于验证码类型的 Token（email_otp、admin_mfa），需要检查 consumed 字段（必须为 False）
            - 对于 session Token（session、admin_session），不检查 consumed 字段（允许重复使用）
            - JWT 标准要求 "sub" 是字符串类型，因此需要将字符串转换为整数
        """
        # 1. 验证 Token（检查签名和过期时间）
        payload = self.verify_token(token)
        if not payload:
            logger.debug("Token 验证失败：签名无效或已过期")
            return None

        # 2. 从 payload 获取用户 ID
        # 注意：JWT 标准要求 "sub" 必须是字符串类型，因此需要将字符串转换为整数
        user_id_str = payload.get("sub")
        if not user_id_str:
            logger.debug("Token payload 中没有 sub 字段")
            return None
        
        # 将字符串转换为整数（JWT 标准要求 sub 是字符串）
        try:
            user_id = int(user_id_str)
        except (ValueError, TypeError):
            logger.warning(f"Token payload 中的 sub 字段无法转换为整数: {user_id_str}")
            return None

        # 3. 检查 Token 是否在数据库中
        # 注意：
        # - 对于 session Token（type="session" 或 "admin_session"），consumed 字段应该始终为 False，不需要检查
        # - consumed 字段主要用于一次性验证码（email_otp、admin_mfa），这些验证码在使用后会被标记为 consumed=True
        # - session Token 是可以重复使用的，直到过期或被用户主动登出
        # - 因此，对于 session Token，我们只检查 Token 是否存在、是否过期，不检查 consumed 字段
        token_type = payload.get("type", "")
        
        # 构建查询条件
        query = db.query(AuthToken).filter(
            AuthToken.token == token,
            AuthToken.expired_at > datetime.utcnow(),
        )
        
        # 对于验证码类型的 Token（email_otp、admin_mfa），需要检查 consumed 字段
        # 对于 session Token（session、admin_session），不需要检查 consumed 字段
        if token_type in ("email_otp", "admin_mfa"):
            # 验证码类型的 Token：必须未消费
            query = query.filter(AuthToken.consumed == False)
        # session Token 类型（session、admin_session）：不检查 consumed 字段，允许重复使用
        
        auth_token = query.first()

        if not auth_token:
            logger.debug(f"Token 不在数据库中或已过期: user_id={user_id}, type={token_type}")
            return None

        # 4. 从数据库获取用户
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.warning(f"Token 中的用户 ID 不存在: user_id={user_id}")
            return None
        
        # 5. 检查用户状态
        if user.status != "active":
            logger.warning(f"用户账号已被禁用: user_id={user_id}, status={user.status}")
            return None

        return user

    def send_verification_code_for_register(self, db: Session, email: str) -> Tuple[str, bool]:
        """
        发送注册验证码
        根据注册登录与权限设计方案第 2.3 节实现
        
        Args:
            db: 数据库会话
            email: 用户邮箱
        
        Returns:
            tuple[str, bool]: (验证码, 邮件是否发送成功)
                - 验证码：6位数字验证码
                - 邮件是否发送成功：True 表示邮件已发送，False 表示邮件未发送（仅开发环境）
        
        Raises:
            ValueError: 邮箱已注册或发送过于频繁（生产环境邮件发送失败也会抛出异常）
        
        Note:
            - 开发环境（DEBUG=True）：如果邮件发送失败，返回 (code, False)，不抛出异常
            - 生产环境（DEBUG=False）：如果邮件发送失败，抛出 ValueError 异常
        """
        # 1. 检查邮箱是否已注册
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise ValueError("邮箱已注册")
        
        # 2. 检查发送频率（60秒内只能发送一次）
        recent_code = db.query(AuthToken).filter(
            AuthToken.email == email,
            AuthToken.type == "email_otp",
            AuthToken.created_at > datetime.utcnow() - timedelta(seconds=60)
        ).first()
        if recent_code:
            raise ValueError("发送过于频繁，请稍后再试")
        
        # 3. 生成验证码
        code = EmailService.generate_code()
        
        # 4. 保存验证码到数据库（注册时 user_id 为 NULL）
        expire = datetime.utcnow() + timedelta(minutes=10)
        auth_token = AuthToken(
            user_id=None,  # 注册时用户还未创建
            email=email,  # 通过邮箱查找验证码
            type="email_otp",
            token=code,
            expired_at=expire,
            consumed=False,
        )
        db.add(auth_token)
        db.commit()
        
        # 5. 缓存验证码到 Redis（根据永久化存储方案第 7 节）
        cache_service.cache_verification_code(email, code, code_type="register")
        
        # 6. 发送邮件
        # 注意：开发环境下，如果邮件服务不可用，验证码仍然会保存到数据库和 Redis
        # 开发人员可以通过查看日志或数据库获取验证码，不会阻止开发流程
        # 使用单例模式的 email_service 实例，避免每次调用都重新初始化客户端
        from ..services.email_service import email_service
        success = email_service.send_verification_code(email, code, code_type="register")
        if not success:
            # 开发环境降级方案：如果邮件发送失败，记录日志但不抛出异常
            # 验证码已经保存到数据库和 Redis，开发人员可以通过查看日志获取验证码
            from ..config import get_settings
            settings = get_settings()
            if settings.DEBUG:
                # 开发环境：记录警告日志，但不抛出异常，允许继续开发
                logger.warning(f"【开发环境】邮件发送失败，但验证码已保存: {email}, code={code}")
                logger.warning("【开发环境】开发人员可以通过查看日志或数据库获取验证码")
                # 开发环境允许继续，返回验证码（虽然邮件未发送）
                # 注意：返回一个特殊标记，让路由层知道邮件未发送，可以返回不同的消息
                # 使用元组返回 (code, email_sent)，其中 email_sent=False 表示邮件未发送
                return (code, False)
            else:
                # 生产环境：邮件发送失败必须抛出异常
                raise ValueError("邮件发送失败，请稍后再试")
        
        # 邮件发送成功，返回验证码和发送状态
        return (code, True)

    def send_verification_code_for_login(self, db: Session, email: str) -> Tuple[str, bool]:
        """
        发送登录验证码
        根据注册登录与权限设计方案第 2.3 节实现
        
        Args:
            db: 数据库会话
            email: 用户邮箱
        
        Returns:
            tuple[str, bool]: (验证码, 邮件是否发送成功)
                - 验证码：6位数字验证码
                - 邮件是否发送成功：True 表示邮件已发送，False 表示邮件未发送（仅开发环境）
        
        Raises:
            ValueError: 邮箱未注册或账号已禁用（生产环境邮件发送失败也会抛出异常）
        
        Note:
            - 开发环境（DEBUG=True）：如果邮件发送失败，返回 (code, False)，不抛出异常
            - 生产环境（DEBUG=False）：如果邮件发送失败，抛出 ValueError 异常
        """
        # 1. 查询用户
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise ValueError("邮箱未注册")
        
        if user.status != "active":
            raise ValueError("账号已被禁用")
        
        # 2. 检查发送频率（60秒内只能发送一次）
        recent_code = db.query(AuthToken).filter(
            AuthToken.user_id == user.id,
            AuthToken.type == "email_otp",
            AuthToken.created_at > datetime.utcnow() - timedelta(seconds=60)
        ).first()
        if recent_code:
            raise ValueError("发送过于频繁，请稍后再试")
        
        # 3. 生成验证码
        code = EmailService.generate_code()
        
        # 4. 保存验证码到数据库（登录时已有 user_id）
        expire = datetime.utcnow() + timedelta(minutes=10)
        auth_token = AuthToken(
            user_id=user.id,  # 登录时已有 user_id
            email=email,  # 同时保存邮箱，便于查找
            type="email_otp",
            token=code,
            expired_at=expire,
            consumed=False,
        )
        db.add(auth_token)
        db.commit()
        
        # 5. 缓存验证码到 Redis（根据永久化存储方案第 7 节）
        cache_service.cache_verification_code(email, code, code_type="login")
        
        # 6. 发送邮件
        # 注意：开发环境下，如果邮件服务不可用，验证码仍然会保存到数据库和 Redis
        # 开发人员可以通过查看日志或数据库获取验证码，不会阻止开发流程
        # 使用单例模式的 email_service 实例，避免每次调用都重新初始化客户端
        from ..services.email_service import email_service
        success = email_service.send_verification_code(email, code, code_type="login")
        if not success:
            # 开发环境降级方案：如果邮件发送失败，记录日志但不抛出异常
            # 验证码已经保存到数据库和 Redis，开发人员可以通过查看日志获取验证码
            from ..config import get_settings
            settings = get_settings()
            if settings.DEBUG:
                # 开发环境：记录警告日志，但不抛出异常，允许继续开发
                logger.warning(f"【开发环境】邮件发送失败，但验证码已保存: {email}, code={code}")
                logger.warning("【开发环境】开发人员可以通过查看日志或数据库获取验证码")
                # 开发环境允许继续，返回验证码（虽然邮件未发送）
                # 注意：返回一个特殊标记，让路由层知道邮件未发送，可以返回不同的消息
                # 使用元组返回 (code, email_sent)，其中 email_sent=False 表示邮件未发送
                return (code, False)
            else:
                # 生产环境：邮件发送失败必须抛出异常
                raise ValueError("邮件发送失败，请稍后再试")
        
        # 邮件发送成功，返回验证码和发送状态
        return (code, True)

    def send_verification_code_for_admin_mfa(self, db: Session, user_id: int, email: str) -> Tuple[str, bool]:
        """
        发送管理员二次验证码
        根据注册登录与权限设计方案第 3.2 节实现
        
        Args:
            db: 数据库会话
            user_id: 管理员用户 ID
            email: 管理员邮箱
        
        Returns:
            tuple[str, bool]: (验证码, 邮件是否发送成功)
                - 验证码：6位数字验证码
                - 邮件是否发送成功：True 表示邮件已发送，False 表示邮件未发送（仅开发环境）
        
        Raises:
            ValueError: 发送过于频繁（生产环境邮件发送失败也会抛出异常）
        
        Note:
            - 开发环境（DEBUG=True）：如果邮件发送失败，返回 (code, False)，不抛出异常
            - 生产环境（DEBUG=False）：如果邮件发送失败，抛出 ValueError 异常
        """
        # 1. 检查发送频率（60秒内只能发送一次）
        recent_code = db.query(AuthToken).filter(
            AuthToken.user_id == user_id,
            AuthToken.type == "admin_mfa",
            AuthToken.created_at > datetime.utcnow() - timedelta(seconds=60)
        ).first()
        if recent_code:
            raise ValueError("发送过于频繁，请稍后再试")
        
        # 2. 生成验证码
        code = EmailService.generate_code()
        
        # 3. 保存验证码到数据库
        expire = datetime.utcnow() + timedelta(minutes=10)
        auth_token = AuthToken(
            user_id=user_id,
            email=email,
            type="admin_mfa",
            token=code,
            expired_at=expire,
            consumed=False,
        )
        db.add(auth_token)
        db.commit()
        
        # 4. 缓存验证码到 Redis（根据永久化存储方案第 7 节）
        cache_service.cache_verification_code(email, code, code_type="admin_mfa")
        
        # 5. 发送邮件
        # 注意：开发环境下，如果邮件服务不可用，验证码仍然会保存到数据库和 Redis
        # 开发人员可以通过查看日志或数据库获取验证码，不会阻止开发流程
        # 使用单例模式的 email_service 实例，避免每次调用都重新初始化客户端
        from ..services.email_service import email_service
        success = email_service.send_verification_code(email, code, code_type="admin_mfa")
        if not success:
            # 开发环境降级方案：如果邮件发送失败，记录日志但不抛出异常
            # 验证码已经保存到数据库和 Redis，开发人员可以通过查看日志获取验证码
            from ..config import get_settings
            settings = get_settings()
            if settings.DEBUG:
                # 开发环境：记录警告日志，但不抛出异常，允许继续开发
                logger.warning(f"【开发环境】邮件发送失败，但验证码已保存: {email}, code={code}")
                logger.warning("【开发环境】开发人员可以通过查看日志或数据库获取验证码")
                # 开发环境允许继续，返回验证码（虽然邮件未发送）
                # 注意：返回一个特殊标记，让路由层知道邮件未发送，可以返回不同的消息
                # 使用元组返回 (code, email_sent)，其中 email_sent=False 表示邮件未发送
                return (code, False)
            else:
                # 生产环境：邮件发送失败必须抛出异常
                raise ValueError("邮件发送失败，请稍后再试")
        
        # 邮件发送成功，返回验证码和发送状态
        return (code, True)

    def verify_code(
        self, 
        db: Session, 
        email: str, 
        code: str, 
        type: str = "email_otp",
        user_id: Optional[int] = None
    ) -> bool:
        """
        验证验证码
        优先从 Redis 缓存读取，如果 Redis 不可用则回退到数据库查询
        根据永久化存储方案第 7 节实现
        
        Args:
            db: 数据库会话
            email: 邮箱
            code: 验证码
            type: 验证码类型（"email_otp" 或 "admin_mfa"）
            user_id: 用户 ID（用于双重验证，确保验证码属于该用户）
        
        Returns:
            bool: 验证是否通过
        
        Raises:
            ValueError: 验证码错误或已过期
        """
        # 1. 优先从 Redis 缓存读取验证码（根据永久化存储方案第 7 节）
        code_type_map = {
            "email_otp": "register" if not user_id else "login",
            "admin_mfa": "admin_mfa"
        }
        cache_code_type = code_type_map.get(type, "register")
        cached_code = cache_service.get_verification_code(email, code_type=cache_code_type)
        
        if cached_code and cached_code == code:
            # Redis 缓存命中，验证通过
            # 删除 Redis 缓存（一次性验证码）
            cache_service.delete_verification_code(email, code_type=cache_code_type)
            
            # 同时标记数据库中的验证码为已消费（保持数据一致性）
            query = db.query(AuthToken).filter(
                AuthToken.type == type,
                AuthToken.token == code,
                AuthToken.consumed == False,
                AuthToken.expired_at > datetime.utcnow()
            )
            if type == "email_otp":
                if user_id:
                    query = query.filter(AuthToken.user_id == user_id)
                else:
                    query = query.filter(AuthToken.email == email, AuthToken.user_id.is_(None))
            elif type == "admin_mfa":
                if not user_id:
                    raise ValueError("管理员验证码需要提供 user_id")
                query = query.filter(AuthToken.user_id == user_id)
            
            auth_token = query.first()
            if auth_token:
                auth_token.consumed = True
                db.commit()
            
            return True
        
        # 2. Redis 缓存未命中或不可用，回退到数据库查询
        query = db.query(AuthToken).filter(
            AuthToken.type == type,
            AuthToken.token == code,
            AuthToken.consumed == False,
            AuthToken.expired_at > datetime.utcnow()
        )
        
        # 根据类型选择查询方式
        if type == "email_otp":
            # 注册验证码：通过邮箱查找（user_id 为 NULL）
            # 登录验证码：通过 user_id 查找（如果提供了 user_id）
            if user_id:
                query = query.filter(AuthToken.user_id == user_id)
            else:
                query = query.filter(AuthToken.email == email, AuthToken.user_id.is_(None))
        elif type == "admin_mfa":
            # 管理员验证码：必须通过 user_id 查找
            if not user_id:
                raise ValueError("管理员验证码需要提供 user_id")
            query = query.filter(AuthToken.user_id == user_id)
        
        auth_token = query.first()
        
        if not auth_token:
            raise ValueError("验证码错误或已过期")
        
        # 标记验证码为已消费
        auth_token.consumed = True
        db.commit()
        
        return True

    def register_with_code(
        self, 
        db: Session, 
        email: str, 
        code: str, 
        password: str, 
        display_name: Optional[str] = None
    ) -> User:
        """
        使用验证码注册用户
        
        Args:
            db: 数据库会话
            email: 邮箱
            code: 验证码
            password: 密码
            display_name: 显示名称（可选）
        
        Returns:
            User: 新创建的用户对象
        
        Raises:
            ValueError: 验证码错误、密码不符合要求或邮箱已注册
        """
        # 1. 验证验证码
        self.verify_code(db, email, code, type="email_otp")
        
        # 2. 检查邮箱是否已注册（双重检查，防止并发）
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise ValueError("邮箱已注册")
        
        # 3. 验证密码强度（至少8位，包含字母和数字）
        if len(password) < 8:
            raise ValueError("密码至少需要8个字符")
        if not any(c.isalpha() for c in password):
            raise ValueError("密码需要包含字母")
        if not any(c.isdigit() for c in password):
            raise ValueError("密码需要包含数字")
        
        # 4. 创建用户
        user = User(
            email=email,
            password_hash=self.hash_password(password),
            display_name=display_name or email.split("@")[0],
            role="user",
            status="active",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # 5. 自动创建免费版订阅（根据开发方案第 25.5 节）
        free_plan = db.query(SubscriptionPlan).filter(
            SubscriptionPlan.name.ilike("%免费%")
        ).first()
        
        if not free_plan:
            # 如果没有找到免费计划，创建一个默认的
            free_plan = SubscriptionPlan(
                name="免费版",
                description="免费版订阅",
                price=0.00,
                period="monthly",
                features={
                    "analysis_per_month": 10,
                    "generations_per_month": 5,
                },
                is_active=True,
                sort_order=0,
            )
            db.add(free_plan)
            db.commit()
            db.refresh(free_plan)
        
        # 创建订阅记录
        now = datetime.utcnow()
        subscription = Subscription(
            user_id=user.id,
            plan_id=free_plan.id,
            status="active",
            start_at=now,
            end_at=None,  # 免费版不设到期时间
            extra_data={"auto_renew": False},
        )
        db.add(subscription)
        db.commit()
        
        logger.info(f"用户注册成功并自动创建免费订阅: {email}, user_id={user.id}")
        
        return user

    def login_with_code(self, db: Session, email: str, code: str) -> Dict[str, Any]:
        """
        使用验证码登录
        
        Args:
            db: 数据库会话
            email: 用户邮箱
            code: 验证码（6位数字）
        
        Returns:
            Dict[str, Any]: 包含 accessToken 和 user 信息
        
        Raises:
            ValueError: 验证码错误、已过期或邮箱不匹配
        """
        # 1. 查询用户
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise ValueError("邮箱未注册")
        
        if user.status != "active":
            raise ValueError("账号已被禁用")
        
        # 2. 验证验证码（通过 user_id 验证，确保验证码属于该用户）
        self.verify_code(db, email, code, type="email_otp", user_id=user.id)
        
        # 3. 生成 JWT Token
        token = self.create_token(user.id, token_type="session", role=user.role)
        
        # 4. 保存 Token 到数据库
        expire = datetime.utcnow() + timedelta(minutes=self.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        session_token = AuthToken(
            user_id=user.id,
            email=email,
            type="session",
            token=token,
            expired_at=expire,
            consumed=False,
        )
        db.add(session_token)
        db.commit()
        
        return {
            "accessToken": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "display_name": user.display_name,
                "avatar_url": user.avatar_url,
                "role": user.role,
            },
        }

