"""
认证服务 - 用户注册、登录、JWT 生成、验证码管理
根据注册登录与权限设计方案实现
"""
from jose import jwt, JWTError
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from loguru import logger

from ..models import User, AuthToken, Subscription, SubscriptionPlan
from ..config import get_settings
from ..services.email_service import EmailService
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
        """创建 JWT Token"""
        expire = datetime.utcnow() + timedelta(minutes=self.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {
            "sub": user_id,
            "type": token_type,
            "role": role,
            "exp": expire,
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
        """用户登录"""
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise ValueError("邮箱或密码错误")

        if not self.verify_password(password, user.password_hash):
            raise ValueError("邮箱或密码错误")

        if user.status != "active":
            raise ValueError("账号已被禁用")

        # 生成 Token
        token = self.create_token(user.id, token_type=token_type, role=user.role)

        # 保存 Token 到数据库
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
        """从 Token 获取当前用户"""
        payload = self.verify_token(token)
        if not payload:
            return None

        user_id = payload.get("sub")
        if not user_id:
            return None

        # 检查 Token 是否在数据库中且未消费
        auth_token = db.query(AuthToken).filter(
            AuthToken.token == token,
            AuthToken.consumed == False,
            AuthToken.expired_at > datetime.utcnow(),
        ).first()

        if not auth_token:
            return None

        return db.query(User).filter(User.id == user_id).first()

    def send_verification_code_for_register(self, db: Session, email: str) -> str:
        """
        发送注册验证码
        
        Args:
            db: 数据库会话
            email: 用户邮箱
        
        Returns:
            str: 验证码（6位数字）
        
        Raises:
            ValueError: 邮箱已注册或发送过于频繁
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
        email_service = EmailService()
        success = email_service.send_verification_code(email, code, type="register")
        if not success:
            raise ValueError("邮件发送失败，请稍后再试")
        
        return code

    def send_verification_code_for_login(self, db: Session, email: str) -> str:
        """
        发送登录验证码
        
        Args:
            db: 数据库会话
            email: 用户邮箱
        
        Returns:
            str: 验证码（6位数字）
        
        Raises:
            ValueError: 邮箱未注册或账号已禁用
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
        email_service = EmailService()
        success = email_service.send_verification_code(email, code, type="login")
        if not success:
            raise ValueError("邮件发送失败，请稍后再试")
        
        return code

    def send_verification_code_for_admin_mfa(self, db: Session, user_id: int, email: str) -> str:
        """
        发送管理员二次验证码
        
        Args:
            db: 数据库会话
            user_id: 管理员用户 ID
            email: 管理员邮箱
        
        Returns:
            str: 验证码（6位数字）
        
        Raises:
            ValueError: 发送过于频繁
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
        email_service = EmailService()
        success = email_service.send_verification_code(email, code, type="admin_mfa")
        if not success:
            raise ValueError("邮件发送失败，请稍后再试")
        
        return code

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

