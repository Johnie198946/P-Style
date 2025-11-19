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
    """
    邮箱验证码服务
    根据注册登录与权限设计方案第 2.5 节实现
    
    注意：
    - 每次创建实例时都会尝试初始化客户端
    - 如果初始化失败，`self.client` 为 `None`，发送邮件时会返回 `False`
    - 建议使用单例模式（`email_service`）来复用客户端实例，避免重复初始化
    """
    
    def __init__(self):
        """
        初始化邮箱服务
        根据注册登录与权限设计方案第 2.5.2 节实现
        
        注意：
        - 每次创建实例时都会尝试初始化客户端
        - 如果初始化失败，`self.client` 为 `None`，发送邮件时会返回 `False`
        - 建议使用单例模式（`email_service`）来复用客户端实例，避免重复初始化
        """
        self.settings = get_settings()
        self.client = None
        
        # 检查 SDK 是否可用
        if not ALIYUN_SDK_AVAILABLE:
            logger.warning("阿里云邮件服务 SDK 未安装，邮件发送功能将不可用")
            logger.warning("解决方案: 运行 pip install alibabacloud-dm20151123")
            return
        
        # 检查配置是否完整
        if not self.settings.ALIYUN_ACCESS_KEY_ID or not self.settings.ALIYUN_ACCESS_KEY_SECRET:
            logger.warning("阿里云邮件服务 AccessKey 未配置，邮件发送功能将不可用")
            logger.warning(f"ALIYUN_ACCESS_KEY_ID: {'已配置' if self.settings.ALIYUN_ACCESS_KEY_ID else '(空)'}")
            logger.warning(f"ALIYUN_ACCESS_KEY_SECRET: {'已配置' if self.settings.ALIYUN_ACCESS_KEY_SECRET else '(空)'}")
            logger.warning("解决方案: 在 .env 文件或环境变量中配置 ALIYUN_ACCESS_KEY_ID 和 ALIYUN_ACCESS_KEY_SECRET")
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
            # 记录详细的初始化失败信息，便于排查问题
            error_type = type(e).__name__
            error_detail = str(e)
            logger.error(f"初始化阿里云邮件服务客户端失败: {error_type}: {error_detail}")
            logger.error(f"请检查 AccessKey 配置是否正确: ALIYUN_ACCESS_KEY_ID={self.settings.ALIYUN_ACCESS_KEY_ID[:10] if self.settings.ALIYUN_ACCESS_KEY_ID else '(空)'}...")
            logger.error("解决方案: 检查 AccessKey 是否正确，网络连接是否正常，SDK 版本是否兼容")
            self.client = None
    
    def send_verification_code(
        self, 
        email: str, 
        code: str, 
        code_type: str = "register"
    ) -> bool:
        """
        发送验证码邮件
        根据注册登录与权限设计方案第 2.5.2 节实现
        
        Args:
            email: 收件人邮箱
            code: 验证码（6位数字）
            code_type: 验证码类型（"register" 注册 / "login" 登录 / "admin_mfa" 管理员二次验证）
        
        Returns:
            bool: 发送是否成功
        
        Note:
            - 开发环境（DEBUG=True）：如果邮件服务不可用，记录日志但不抛出异常，允许继续开发
            - 生产环境（DEBUG=False）：邮件服务必须可用，否则返回 False
        """
        # 检查客户端是否已初始化
        # 注意：如果客户端未初始化，说明初始化时出现了问题（SDK 未安装、AccessKey 未配置或初始化异常）
        # 这种情况下，即使测试时可以正常发送，实际环境中也可能因为配置问题导致初始化失败
        if not self.client:
            error_msg = "阿里云邮件服务客户端未初始化，无法发送验证码"
            logger.error(error_msg)
            # 记录详细的初始化失败原因，便于排查问题
            if not ALIYUN_SDK_AVAILABLE:
                logger.error("原因: 阿里云邮件服务 SDK 未安装")
                logger.error("解决方案: 运行 pip install alibabacloud-dm20151123")
            elif not self.settings.ALIYUN_ACCESS_KEY_ID or not self.settings.ALIYUN_ACCESS_KEY_SECRET:
                logger.error("原因: 阿里云邮件服务 AccessKey 未配置")
                logger.error(f"ALIYUN_ACCESS_KEY_ID: {'已配置' if self.settings.ALIYUN_ACCESS_KEY_ID else '(空)'}")
                logger.error(f"ALIYUN_ACCESS_KEY_SECRET: {'已配置' if self.settings.ALIYUN_ACCESS_KEY_SECRET else '(空)'}")
                logger.error("解决方案: 在 .env 文件或环境变量中配置 ALIYUN_ACCESS_KEY_ID 和 ALIYUN_ACCESS_KEY_SECRET")
            else:
                logger.error("原因: 客户端初始化时发生异常（请查看启动日志）")
                logger.error("解决方案: 检查 AccessKey 是否正确，网络连接是否正常")
            
            # 开发环境降级方案：如果邮件服务不可用，记录日志但不阻止开发流程
            # 注意：验证码仍然会保存到数据库和 Redis，只是不发送邮件
            # 开发人员可以通过查看日志或数据库获取验证码
            if self.settings.DEBUG:
                logger.warning(f"【开发环境】邮件服务不可用，验证码已生成但未发送: {email}, code={code}, code_type={code_type}")
                logger.warning("【开发环境】如需测试邮件发送功能，请检查上述错误原因并修复配置")
                # 开发环境允许继续，但返回 False 表示邮件未发送
                return False
            else:
                # 生产环境必须可用
                return False
        
        try:
            # 根据类型选择邮件主题
            if code_type == "register":
                subject = "注册验证码"
            elif code_type == "login":
                subject = "登录验证码"
            elif code_type == "admin_mfa":
                subject = "管理员登录验证码"
            else:
                subject = "验证码"
            
            # 构建模板参数（字典格式，根据阿里云 SDK 文档）
            # template_data 需要是 Dict[str, str] 格式
            # 变量名需要与邮件模板中定义的变量名完全一致（不包括花括号）
            # 模板 ID 417051 中使用的是 {变量名称} 作为占位符，因此变量名为 "变量名称"
            # 根据配置获取模板变量名（默认 "变量名称"）
            template_var_name = getattr(self.settings, 'ALIYUN_EMAIL_TEMPLATE_VAR_NAME', '变量名称')
            template_data = {template_var_name: str(code)}  # 使用配置的变量名，确保 code 是字符串类型
            logger.debug(f"邮件模板变量配置: 变量名={template_var_name}, 验证码={code}, template_data={template_data}")
            
            # 创建模板对象（根据阿里云 SDK，需要使用 SingleSendMailRequestTemplate）
            template = dm_models.SingleSendMailRequestTemplate(
                template_id=self.settings.ALIYUN_EMAIL_TEMPLATE_ID,  # 模板 ID
                template_data=template_data,  # 模板参数（字典格式）
            )
            
            # 创建发送请求
            # 注意：阿里云邮件服务要求 reply_to_address 参数（回复地址）
            # 使用 from_alias 参数设置发件人昵称，用户收到邮件时显示为"图像科学"而不是完整的邮箱地址
            # 根据阿里云邮件推送服务文档，from_alias 参数用于设置发件人显示名称
            # 参考文档：https://help.aliyun.com/document_detail/29444.html
            from_alias_value = getattr(self.settings, 'ALIYUN_EMAIL_FROM_ALIAS', '图像科学')
            logger.debug(f"邮件发送配置: 发信地址={self.settings.ALIYUN_EMAIL_FROM}, 发件人昵称={from_alias_value}")
            
            request = dm_models.SingleSendMailRequest(
                account_name=self.settings.ALIYUN_EMAIL_FROM,  # 发信地址（必填）
                address_type=1,  # 1 表示使用发信地址（必填）
                to_address=email,  # 收件人邮箱（必填）
                subject=subject,  # 邮件主题（必填）
                reply_to_address=True,  # 启用回复地址（阿里云要求，必填）
                template=template,  # 模板对象（包含 template_id 和 template_data，必填）
                from_alias=from_alias_value,  # 发件人昵称（显示名称），用户收到邮件时显示为"图像科学"而不是完整的邮箱地址（可选，但建议设置）
            )
            
            # 验证 from_alias 是否正确设置到请求对象中
            # 注意：某些阿里云 SDK 版本可能不支持 from_alias 参数，如果属性不存在，记录警告日志
            if hasattr(request, 'from_alias'):
                logger.debug(f"请求对象 from_alias 值: {request.from_alias}")
            else:
                logger.warning("请求对象没有 from_alias 属性，可能 SDK 版本不支持，发件人昵称可能无法生效")
            
            # 发送邮件
            # 根据阿里云 SDK 文档，如果没有异常抛出，表示请求成功
            # 响应对象包含 body 属性，其中包含 request_id 等信息
            # 注意：在实际环境中，如果出现网络问题、API 调用失败等情况，可能会抛出异常
            # 这些异常会被下面的 except 块捕获，并记录详细的错误信息
            logger.debug(f"开始发送验证码邮件: {email}, code_type={code_type}")
            response = self.client.single_send_mail(request)
            
            # 检查响应（阿里云 SDK 的响应对象没有 status_code 属性）
            # 如果没有异常抛出，通常表示请求成功
            # 可以通过检查 response.body 中的 request_id 来确认
            # 注意：阿里云 SDK 的响应对象可能为 None，或者没有 body 属性
            # 如果响应对象存在，通常表示请求成功（阿里云 SDK 在失败时会抛出异常）
            if response is not None:
                # 尝试获取 request_id（如果存在）
                request_id = None
                try:
                    if hasattr(response, 'body') and response.body is not None:
                        request_id = getattr(response.body, 'request_id', None)
                except Exception as e:
                    # 如果获取 request_id 时出错，记录但不影响判断
                    logger.debug(f"获取 request_id 时出错: {e}")
                
                # 如果响应对象存在，通常表示请求成功（阿里云 SDK 在失败时会抛出异常）
                logger.info(f"验证码邮件发送成功: {email}, code_type={code_type}, request_id={request_id}")
                return True
            else:
                # 如果响应对象为 None，记录详细信息
                # 注意：这种情况很少见，因为阿里云 SDK 在失败时会抛出异常
                # 如果出现这种情况，可能是 SDK 版本问题或 API 调用异常
                logger.error(f"验证码邮件发送失败: {email}, 响应对象为 None")
                logger.error("这可能表示阿里云 SDK 返回了异常响应，但未抛出异常")
                logger.error("请检查：1. 阿里云 SDK 版本是否正确 2. API 调用是否正常 3. 网络连接是否正常")
                return False
                
        except Exception as e:
            # 捕获所有异常，记录详细错误信息
            # 注意：使用 type(e) 而不是 type，因为 type 是 Python 内置函数，不能用作变量名
            error_type = type(e).__name__
            error_detail = str(e)
            logger.error(f"发送验证码邮件时发生异常: {email}, code_type={code_type}, 错误类型: {error_type}, 错误详情: {error_detail}")
            
            # 如果是阿里云 SDK 的特定异常，记录更多信息
            if hasattr(e, 'code'):
                error_code = getattr(e, 'code', 'N/A')
                error_message = getattr(e, 'message', 'N/A') if hasattr(e, 'message') else 'N/A'
                logger.error(f"阿里云错误码: {error_code}, 错误消息: {error_message}")
            
            # 开发环境降级方案：如果邮件发送失败，记录详细日志但不阻止开发流程
            # 注意：验证码仍然会保存到数据库和 Redis，只是不发送邮件
            # 开发人员可以通过查看日志或数据库获取验证码
            # 同时，开发环境下应该尽量修复邮件发送问题，确保邮件能够正常发送
            if self.settings.DEBUG:
                logger.warning(f"【开发环境】邮件发送失败，验证码已生成但未发送: {email}, code={code}, code_type={code_type}")
                logger.warning(f"【开发环境】错误类型: {error_type}")
                logger.warning(f"【开发环境】错误详情: {error_detail}")
                # 提供详细的排查建议
                if hasattr(e, 'code'):
                    logger.warning(f"【开发环境】阿里云错误码: {error_code}, 错误消息: {error_message}")
                    logger.warning("【开发环境】请检查：")
                    logger.warning("  1. 阿里云邮件服务 AccessKey 是否正确")
                    logger.warning("  2. 发信地址是否已通过验证")
                    logger.warning("  3. 邮件模板 ID 是否正确")
                    logger.warning("  4. 模板变量名是否与模板中的变量名一致")
                    logger.warning("  5. 网络连接是否正常（可以访问阿里云 API）")
                else:
                    logger.warning("【开发环境】请检查：")
                    logger.warning("  1. 网络连接是否正常（可以访问阿里云 API）")
                    logger.warning("  2. 阿里云邮件服务配置是否正确")
                    logger.warning("  3. 邮件模板配置是否正确")
                # 开发环境允许继续，但返回 False 表示邮件未发送
                # 注意：开发环境下应该尽量修复邮件发送问题，确保邮件能够正常发送
                return False
            else:
                # 生产环境必须可用，邮件发送失败必须返回 False
                return False
    
    @staticmethod
    def generate_code() -> str:
        """
        生成 6 位数字验证码
        
        Returns:
            str: 6 位数字验证码（000000-999999）
        """
        return f"{secrets.randbelow(1000000):06d}"


# 创建全局邮件服务实例（单例模式）
# 注意：使用单例模式可以避免每次调用都重新初始化客户端
# 这样可以确保客户端只初始化一次，避免重复初始化导致的问题
email_service = EmailService()



