"""
Redis 缓存服务
根据永久化存储方案第 7 节实现
提供用户会话缓存、验证码缓存、任务结果缓存、用量统计缓存、订阅计划缓存、API 限流缓存
"""
import json
from typing import Optional, Any
from datetime import timedelta
import redis
from loguru import logger

from ..config import get_settings

settings = get_settings()


class CacheService:
    """
    Redis 缓存服务
    统一管理所有缓存操作，支持 TTL 和序列化
    """

    def __init__(self):
        """初始化 Redis 连接"""
        try:
            self.redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                password=settings.REDIS_PASSWORD,
                db=settings.REDIS_DB,
                decode_responses=True,  # 自动解码为字符串
                socket_connect_timeout=5,  # 连接超时 5 秒
                socket_timeout=5,  # 操作超时 5 秒
            )
            # 测试连接
            self.redis_client.ping()
            logger.info(f"Redis 连接成功: {settings.REDIS_HOST}:{settings.REDIS_PORT}")
        except Exception as e:
            logger.error(f"Redis 连接失败: {e}")
            self.redis_client = None

    def _is_available(self) -> bool:
        """检查 Redis 是否可用"""
        if self.redis_client is None:
            return False
        try:
            self.redis_client.ping()
            return True
        except Exception:
            return False

    def set(self, key: str, value: Any, ttl_seconds: int = 300) -> bool:
        """
        设置缓存值
        
        Args:
            key: 缓存键
            value: 缓存值（支持字符串、数字、字典、列表等，自动序列化）
            ttl_seconds: 过期时间（秒），默认 300 秒（5 分钟）
        
        Returns:
            bool: 是否设置成功
        """
        if not self._is_available():
            logger.warning(f"Redis 不可用，跳过缓存设置: {key}")
            return False
        
        try:
            # 如果是字典或列表，序列化为 JSON
            if isinstance(value, (dict, list)):
                value = json.dumps(value, ensure_ascii=False)
            elif not isinstance(value, str):
                value = str(value)
            
            self.redis_client.setex(key, ttl_seconds, value)
            return True
        except Exception as e:
            logger.error(f"设置缓存失败: {key}, 错误: {e}")
            return False

    def get(self, key: str) -> Optional[Any]:
        """
        获取缓存值
        
        Args:
            key: 缓存键
        
        Returns:
            Optional[Any]: 缓存值，如果不存在或 Redis 不可用则返回 None
        """
        if not self._is_available():
            return None
        
        try:
            value = self.redis_client.get(key)
            if value is None:
                return None
            
            # 尝试解析为 JSON（如果是字典或列表）
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                # 如果不是 JSON，直接返回字符串
                return value
        except Exception as e:
            logger.error(f"获取缓存失败: {key}, 错误: {e}")
            return None

    def delete(self, key: str) -> bool:
        """
        删除缓存
        
        Args:
            key: 缓存键
        
        Returns:
            bool: 是否删除成功
        """
        if not self._is_available():
            return False
        
        try:
            self.redis_client.delete(key)
            return True
        except Exception as e:
            logger.error(f"删除缓存失败: {key}, 错误: {e}")
            return False

    def exists(self, key: str) -> bool:
        """
        检查缓存是否存在
        
        Args:
            key: 缓存键
        
        Returns:
            bool: 是否存在
        """
        if not self._is_available():
            return False
        
        try:
            return self.redis_client.exists(key) > 0
        except Exception as e:
            logger.error(f"检查缓存失败: {key}, 错误: {e}")
            return False

    def increment(self, key: str, amount: int = 1, ttl_seconds: int = 60) -> Optional[int]:
        """
        递增缓存值（用于限流计数）
        
        Args:
            key: 缓存键
            amount: 递增数量，默认 1
            ttl_seconds: 过期时间（秒），默认 60 秒
        
        Returns:
            Optional[int]: 递增后的值，如果失败则返回 None
        """
        if not self._is_available():
            return None
        
        try:
            value = self.redis_client.incrby(key, amount)
            # 如果是新键，设置过期时间
            if value == amount:
                self.redis_client.expire(key, ttl_seconds)
            return value
        except Exception as e:
            logger.error(f"递增缓存失败: {key}, 错误: {e}")
            return None

    # ========== 业务缓存方法 ==========

    def cache_user_session(self, user_id: int, user_data: dict) -> bool:
        """
        缓存用户会话信息（TTL 5 分钟）
        
        Args:
            user_id: 用户 ID
            user_data: 用户数据字典（包含用户信息、订阅状态等）
        
        Returns:
            bool: 是否缓存成功
        """
        key = f"user:session:{user_id}"
        return self.set(key, user_data, ttl_seconds=300)  # 5 分钟

    def get_user_session(self, user_id: int) -> Optional[dict]:
        """
        获取用户会话缓存
        
        Args:
            user_id: 用户 ID
        
        Returns:
            Optional[dict]: 用户数据字典，如果不存在则返回 None
        """
        key = f"user:session:{user_id}"
        return self.get(key)

    def cache_verification_code(self, email: str, code: str, code_type: str = "register") -> bool:
        """
        缓存邮箱验证码（TTL 10 分钟）
        
        Args:
            email: 邮箱地址
            code: 验证码
            code_type: 验证码类型（register/login/admin_mfa），默认 register
        
        Returns:
            bool: 是否缓存成功
        """
        key = f"verification_code:{code_type}:{email}"
        return self.set(key, code, ttl_seconds=600)  # 10 分钟

    def get_verification_code(self, email: str, code_type: str = "register") -> Optional[str]:
        """
        获取邮箱验证码
        
        Args:
            email: 邮箱地址
            code_type: 验证码类型（register/login/admin_mfa），默认 register
        
        Returns:
            Optional[str]: 验证码，如果不存在则返回 None
        """
        key = f"verification_code:{code_type}:{email}"
        return self.get(key)

    def delete_verification_code(self, email: str, code_type: str = "register") -> bool:
        """
        删除邮箱验证码（验证成功后调用）
        
        Args:
            email: 邮箱地址
            code_type: 验证码类型（register/login/admin_mfa），默认 register
        
        Returns:
            bool: 是否删除成功
        """
        key = f"verification_code:{code_type}:{email}"
        return self.delete(key)

    def cache_task_result(self, task_id: str, task_data: dict) -> bool:
        """
        缓存分析任务结果（TTL 24 小时）
        
        Args:
            task_id: 任务 ID
            task_data: 任务数据字典
        
        Returns:
            bool: 是否缓存成功
        """
        key = f"task:result:{task_id}"
        return self.set(key, task_data, ttl_seconds=86400)  # 24 小时

    def get_task_result(self, task_id: str) -> Optional[dict]:
        """
        获取分析任务结果缓存
        
        Args:
            task_id: 任务 ID
        
        Returns:
            Optional[dict]: 任务数据字典，如果不存在则返回 None
        """
        key = f"task:result:{task_id}"
        return self.get(key)

    def cache_usage_stats(self, user_id: int, usage_data: dict) -> bool:
        """
        缓存用户当月用量统计（TTL 1 小时）
        
        Args:
            user_id: 用户 ID
            usage_data: 用量数据字典（包含 analysis_count、generation_count 等）
        
        Returns:
            bool: 是否缓存成功
        """
        key = f"usage:stats:{user_id}"
        return self.set(key, usage_data, ttl_seconds=3600)  # 1 小时

    def get_usage_stats(self, user_id: int) -> Optional[dict]:
        """
        获取用户当月用量统计缓存
        
        Args:
            user_id: 用户 ID
        
        Returns:
            Optional[dict]: 用量数据字典，如果不存在则返回 None
        """
        key = f"usage:stats:{user_id}"
        return self.get(key)

    def cache_subscription_plans(self, plans_data: list) -> bool:
        """
        缓存订阅套餐列表（TTL 1 小时）
        
        Args:
            plans_data: 套餐列表数据
        
        Returns:
            bool: 是否缓存成功
        """
        key = "subscription:plans:all"
        return self.set(key, plans_data, ttl_seconds=3600)  # 1 小时

    def get_subscription_plans(self) -> Optional[list]:
        """
        获取订阅套餐列表缓存
        
        Returns:
            Optional[list]: 套餐列表数据，如果不存在则返回 None
        """
        key = "subscription:plans:all"
        return self.get(key)

    def increment_api_rate_limit(self, user_id: int, endpoint: str) -> Optional[int]:
        """
        递增 API 限流计数（TTL 60 秒）
        
        Args:
            user_id: 用户 ID
            endpoint: API 端点（如 "analyze:part1"）
        
        Returns:
            Optional[int]: 当前请求次数，如果失败则返回 None
        """
        key = f"rate_limit:{user_id}:{endpoint}"
        return self.increment(key, amount=1, ttl_seconds=60)  # 60 秒窗口

    def get_api_rate_limit(self, user_id: int, endpoint: str) -> int:
        """
        获取 API 限流计数
        
        Args:
            user_id: 用户 ID
            endpoint: API 端点
        
        Returns:
            int: 当前请求次数，如果不存在或失败则返回 0
        """
        key = f"rate_limit:{user_id}:{endpoint}"
        value = self.get(key)
        return int(value) if value is not None else 0


# 创建全局缓存服务实例（单例模式）
cache_service = CacheService()

