"""
邮箱验证码服务 - 使用阿里云邮件服务发送验证码
根据注册登录与权限设计方案第 2.5 节实现
"""
import secrets
from typing import Optional
from loguru import logger

from ..config import get_settings

try:
    from alibabacloud_dm20151123.client import Client as DmClient
    from alibabacloud_tea_openapi import models as open_api_models
    from alibabacloud_dm20151123 import models as dm_models
    ALIYUN_SDK_AVAILABLE = True
except ImportError:
    ALIYUN_SDK_AVAILABLE = False
    logger.warning("阿里云邮件服务 SDK 未安装，请运行: pip install alibabacloud-dm20151123")


class EmailService:
    """邮箱验证码服务"""
    
    def __init__(self):
        """
        初始化邮箱服务
        根据注册登录与权限设计方案第 2.5.2 节实现
        """
        self.settings = get_settings()
        self.client = None
        
        # 检查 SDK 是否可用
        if not ALIYUN_SDK_AVAILABLE:
            logger.warning("阿里云邮件服务 SDK 未安装，邮件发送功能将不可用")
            return
        
        # 检查配置是否完整
        if not self.settings.ALIYUN_ACCESS_KEY_ID or not self.settings.ALIYUN_ACCESS_KEY_SECRET:
            logger.warning("阿里云邮件服务 AccessKey 未配置，邮件发送功能将不可用")
            return
        
        # 初始化阿里云邮件服务客户端
        try:
            config = open_api_models.Config(
                access_key_id=self.settings.ALIYUN_ACCESS_KEY_ID,
                access_key_secret=self.settings.ALIYUN_ACCESS_KEY_SECRET,
            )
            config.endpoint = "dm.aliyuncs.com"
            self.client = DmClient(config)
            logger.info(f"阿里云邮件服务客户端初始化成功: {self.settings.ALIYUN_EMAIL_FROM}")
        except Exception as e:
            logger.error(f"初始化阿里云邮件服务客户端失败: {e}")
            logger.error(f"请检查 AccessKey 配置是否正确: ALIYUN_ACCESS_KEY_ID={self.settings.ALIYUN_ACCESS_KEY_ID[:10] if self.settings.ALIYUN_ACCESS_KEY_ID else '(空)'}...")
            self.client = None
    
    def send_verification_code(
        self, 
        email: str, 
        code: str, 
        type: str = "register"
    ) -> bool:
        """
        发送验证码邮件
        
        Args:
            email: 收件人邮箱
            code: 验证码（6位数字）
            type: 验证码类型（"register" 注册 / "login" 登录 / "admin_mfa" 管理员二次验证）
        
        Returns:
            bool: 发送是否成功
        """
        # 检查客户端是否已初始化
        if not self.client:
            error_msg = "阿里云邮件服务客户端未初始化，无法发送验证码"
            logger.error(error_msg)
            # 记录详细的初始化失败原因，便于排查问题
            if not ALIYUN_SDK_AVAILABLE:
                logger.error("原因: 阿里云邮件服务 SDK 未安装")
            elif not self.settings.ALIYUN_ACCESS_KEY_ID or not self.settings.ALIYUN_ACCESS_KEY_SECRET:
                logger.error("原因: 阿里云邮件服务 AccessKey 未配置")
            else:
                logger.error("原因: 客户端初始化时发生异常（请查看启动日志）")
            return False
        
        try:
            # 根据类型选择邮件主题
            if type == "register":
                subject = "注册验证码"
            elif type == "login":
                subject = "登录验证码"
            elif type == "admin_mfa":
                subject = "管理员登录验证码"
            else:
                subject = "验证码"
            
            # 构建模板参数（JSON 字符串格式）
            template_param = f'{{"code":"{code}"}}'
            
            # 创建发送请求
            request = dm_models.SingleSendMailRequest(
                account_name=self.settings.ALIYUN_EMAIL_FROM,  # 发信地址
                address_type=1,  # 1 表示使用发信地址
                to_address=email,  # 收件人
                subject=subject,  # 邮件主题
                template_code=self.settings.ALIYUN_EMAIL_TEMPLATE_ID,  # 模板 ID
                template_param=template_param,  # 模板参数（JSON 字符串）
            )
            
            # 发送邮件
            # 根据阿里云 SDK 文档，如果没有异常抛出，表示请求成功
            # 响应对象包含 body 属性，其中包含 request_id 等信息
            response = self.client.single_send_mail(request)
            
            # 检查响应（阿里云 SDK 的响应对象没有 status_code 属性）
            # 如果没有异常抛出，通常表示请求成功
            # 可以通过检查 response.body 中的 request_id 来确认
            if response and hasattr(response, 'body'):
                request_id = getattr(response.body, 'request_id', None) if hasattr(response, 'body') else None
                logger.info(f"验证码邮件发送成功: {email}, type={type}, request_id={request_id}")
                return True
            else:
                # 如果响应对象异常，记录详细信息
                logger.error(f"验证码邮件发送失败: {email}, 响应对象异常: {response}")
                return False
                
        except Exception as e:
            # 捕获所有异常，记录详细错误信息
            logger.error(f"发送验证码邮件时发生异常: {email}, type={type}, 错误类型: {type(e).__name__}, 错误详情: {str(e)}")
            # 如果是阿里云 SDK 的特定异常，记录更多信息
            if hasattr(e, 'code'):
                logger.error(f"阿里云错误码: {e.code}, 错误消息: {e.message if hasattr(e, 'message') else 'N/A'}")
            return False
    
    @staticmethod
    def generate_code() -> str:
        """
        生成 6 位数字验证码
        
        Returns:
            str: 6 位数字验证码（000000-999999）
        """
        return f"{secrets.randbelow(1000000):06d}"



