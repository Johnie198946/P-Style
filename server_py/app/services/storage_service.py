"""
对象存储服务
根据永久化存储方案第 8 节实现
支持 MinIO（开发环境）和阿里云 OSS（生产环境）
"""
import os
import uuid
from typing import Optional, BinaryIO
from pathlib import Path
from loguru import logger

from ..config import get_settings

settings = get_settings()


class StorageService:
    """
    对象存储服务
    统一管理图片上传到对象存储，支持 MinIO 和阿里云 OSS
    """

    def __init__(self):
        """初始化存储服务"""
        self.storage_type = getattr(settings, "OSS_STORAGE_TYPE", "local")
        self._client = None
        
        if self.storage_type == "minio":
            self._init_minio()
        elif self.storage_type == "aliyun_oss":
            self._init_aliyun_oss()
        elif self.storage_type == "local":
            self._init_local()
        else:
            logger.warning(f"未知的存储类型: {self.storage_type}，使用本地文件系统")

    def _init_minio(self):
        """
        初始化 MinIO 客户端（开发环境）
        
        注意：
        - 如果 MinIO 服务未运行，初始化会失败，`self._client` 会被设置为 `None`
        - 这不会导致应用启动失败，但对象存储功能将不可用，会自动回退到 Base64 存储
        """
        try:
            from minio import Minio
            from minio.error import S3Error
            import socket
            
            endpoint = getattr(settings, "OSS_ENDPOINT", "localhost:9000")
            access_key = getattr(settings, "OSS_ACCESS_KEY_ID", "minioadmin")
            secret_key = getattr(settings, "OSS_ACCESS_KEY_SECRET", "minioadmin")
            secure = endpoint.startswith("https://")
            endpoint = endpoint.replace("http://", "").replace("https://", "")
            
            # 【重要】设置 socket 超时，防止 MinIO 连接失败时一直阻塞
            # 注意：MinIO Python SDK 的 `bucket_exists()` 和 `make_bucket()` 方法本身不支持超时参数
            # 但可以通过设置 socket 默认超时来控制
            original_timeout = socket.getdefaulttimeout()
            socket.setdefaulttimeout(5)  # 设置 5 秒超时（初始化时使用较短超时，避免启动阻塞）
            
            try:
                self._client = Minio(
                    endpoint,
                    access_key=access_key,
                    secret_key=secret_key,
                    secure=secure
                )
                self.bucket_name = getattr(settings, "OSS_BUCKET_NAME", "photostyle")
                
                # 【重要】确保存储桶存在（如果 MinIO 服务未运行，这里会超时或抛出异常）
                # 使用 try-except 捕获异常，避免初始化失败导致应用无法启动
                try:
                    if not self._client.bucket_exists(self.bucket_name):
                        self._client.make_bucket(self.bucket_name)
                        logger.info(f"创建 MinIO 存储桶: {self.bucket_name}")
                except (socket.timeout, Exception) as e:
                    # MinIO 连接失败或超时，记录错误但不抛出异常
                    logger.error(f"MinIO 存储桶检查/创建失败（MinIO 服务可能未运行）: {type(e).__name__}: {str(e)}")
                    logger.warning("MinIO 客户端初始化失败，将回退到 Base64 存储模式")
                    self._client = None  # 设置为 None，后续上传时会回退到 Base64
                    return  # 提前返回，不继续执行
                
                logger.info(f"MinIO 客户端初始化成功: {endpoint}")
            finally:
                # 恢复原始超时设置
                socket.setdefaulttimeout(original_timeout)
        except ImportError:
            logger.error("MinIO 客户端未安装，请运行: pip install minio")
            logger.warning("MinIO 客户端未安装，将回退到 Base64 存储模式")
            self._client = None
        except Exception as e:
            # 【重要】捕获所有异常，避免初始化失败导致应用无法启动
            logger.error(f"MinIO 初始化失败: {type(e).__name__}: {str(e)}")
            logger.warning("MinIO 初始化失败，将回退到 Base64 存储模式")
            self._client = None

    def _init_aliyun_oss(self):
        """初始化阿里云 OSS 客户端（生产环境）"""
        try:
            import oss2
            
            endpoint = getattr(settings, "OSS_ENDPOINT", "")
            access_key_id = getattr(settings, "OSS_ACCESS_KEY_ID", "")
            access_key_secret = getattr(settings, "OSS_ACCESS_KEY_SECRET", "")
            self.bucket_name = getattr(settings, "OSS_BUCKET_NAME", "photostyle")
            
            if not all([endpoint, access_key_id, access_key_secret]):
                logger.error("阿里云 OSS 配置不完整，请检查环境变量")
                self._client = None
                return
            
            auth = oss2.Auth(access_key_id, access_key_secret)
            self._client = oss2.Bucket(auth, endpoint, self.bucket_name)
            
            # 测试连接
            try:
                self._client.get_bucket_info()
                logger.info(f"阿里云 OSS 客户端初始化成功: {endpoint}/{self.bucket_name}")
            except Exception as e:
                logger.error(f"阿里云 OSS 连接测试失败: {e}")
                self._client = None
        except ImportError:
            logger.error("阿里云 OSS 客户端未安装，请运行: pip install oss2")
            self._client = None
        except Exception as e:
            logger.error(f"阿里云 OSS 初始化失败: {e}")
            self._client = None

    def _init_local(self):
        """初始化本地文件系统存储（开发环境备用）"""
        self.storage_path = Path("./storage")
        self.storage_path.mkdir(exist_ok=True)
        logger.info(f"本地文件系统存储初始化: {self.storage_path.absolute()}")

    def upload_image(
        self,
        image_data: bytes,
        user_id: Optional[int] = None,
        task_id: Optional[str] = None,
        image_type: str = "source",
        content_type: str = "image/jpeg"
    ) -> str:
        """
        上传图片到对象存储
        
        Args:
            image_data: 图片二进制数据
            user_id: 用户 ID（可选）
            task_id: 任务 ID（可选）
            image_type: 图片类型（source/target/preview/avatar）
            content_type: 图片 MIME 类型（如 image/jpeg）
        
        Returns:
            str: 对象存储 URL 或本地文件路径
        
        Raises:
            ValueError: 上传失败
        """
        # 生成唯一文件名
        file_ext = self._get_extension_from_content_type(content_type)
        file_name = f"{uuid.uuid4()}{file_ext}"
        
        # 构建存储路径（根据永久化存储方案第 8 节）
        # 注意：开发方案中的路径格式是示例（如 source.jpg），实际实现使用 UUID 作为文件名，避免冲突
        if image_type == "avatar":
            # 用户头像：avatars/{user_id}/{uuid}.jpg（使用 UUID 避免冲突）
            if not user_id:
                raise ValueError("上传头像需要提供 user_id")
            object_key = f"avatars/{user_id}/{file_name}"
        elif image_type in ["source", "target"]:
            # 上传图片：uploads/{user_id}/{task_id}/{image_type}-{uuid}.jpg（使用 UUID 避免同一任务多次上传时覆盖）
            if not user_id or not task_id:
                raise ValueError("上传源图/目标图需要提供 user_id 和 task_id")
            object_key = f"uploads/{user_id}/{task_id}/{image_type}-{file_name}"
        elif image_type == "preview":
            # 风格模拟预览图：results/{task_id}/preview-{uuid}.jpg（使用 UUID 避免同一任务多次生成时覆盖）
            if not task_id:
                raise ValueError("上传预览图需要提供 task_id")
            object_key = f"results/{task_id}/preview-{file_name}"
        elif image_type == "saliency_mask":
            # 显著性遮罩图：saliency_masks/{user_id}/{task_id}/{uuid}.png（使用 UUID 避免同一任务多次生成时覆盖）
            if not user_id or not task_id:
                raise ValueError("上传显著性遮罩图需要提供 user_id 和 task_id")
            object_key = f"saliency_masks/{user_id}/{task_id}/{file_name}"
        else:
            raise ValueError(f"未知的图片类型: {image_type}")
        
        # 根据存储类型上传
        if self.storage_type == "minio" and self._client:
            return self._upload_to_minio(object_key, image_data, content_type)
        elif self.storage_type == "aliyun_oss" and self._client:
            return self._upload_to_oss(object_key, image_data, content_type)
        else:
            # 回退到本地文件系统
            return self._upload_to_local(object_key, image_data)

    def _upload_to_minio(self, object_key: str, image_data: bytes, content_type: str) -> str:
        """
        上传到 MinIO
        注意：如果 MinIO 连接失败或超时，会抛出异常，由调用方处理
        """
        try:
            from io import BytesIO
            import socket
            
            # 设置超时（防止 MinIO 连接失败时一直阻塞）
            # 注意：MinIO Python SDK 的 put_object 方法本身不支持超时参数
            # 但可以通过设置 socket 默认超时来控制
            original_timeout = socket.getdefaulttimeout()
            socket.setdefaulttimeout(10)  # 设置 10 秒超时
            
            try:
                self._client.put_object(
                    self.bucket_name,
                    object_key,
                    BytesIO(image_data),
                    length=len(image_data),
                    content_type=content_type
                )
                
                # 构建访问 URL
                endpoint = getattr(settings, "OSS_ENDPOINT", "http://localhost:9000")
                if not endpoint.startswith("http"):
                    endpoint = f"http://{endpoint}"
                url = f"{endpoint}/{self.bucket_name}/{object_key}"
                logger.info(f"图片上传到 MinIO 成功: {object_key}")
                return url
            finally:
                # 恢复原始超时设置
                socket.setdefaulttimeout(original_timeout)
        except socket.timeout:
            logger.error(f"MinIO 上传超时: {object_key}")
            raise ValueError(f"图片上传超时，请检查 MinIO 服务是否正常运行")
        except Exception as e:
            logger.error(f"MinIO 上传失败: {e}")
            raise ValueError(f"图片上传失败: {str(e)}")

    def _upload_to_oss(self, object_key: str, image_data: bytes, content_type: str) -> str:
        """
        上传到阿里云 OSS
        注意：如果阿里云 OSS 连接失败或超时，会抛出异常，由调用方处理
        """
        try:
            import socket
            
            # 设置超时（防止阿里云 OSS 连接失败时一直阻塞）
            original_timeout = socket.getdefaulttimeout()
            socket.setdefaulttimeout(10)  # 设置 10 秒超时
            
            try:
                self._client.put_object(object_key, image_data, headers={"Content-Type": content_type})
                
                # 构建访问 URL（公开访问或签名 URL）
                endpoint = getattr(settings, "OSS_ENDPOINT", "")
                if not endpoint.startswith("http"):
                    endpoint = f"https://{endpoint}"
                url = f"{endpoint}/{object_key}"
                logger.info(f"图片上传到阿里云 OSS 成功: {object_key}")
                return url
            finally:
                # 恢复原始超时设置
                socket.setdefaulttimeout(original_timeout)
        except socket.timeout:
            logger.error(f"阿里云 OSS 上传超时: {object_key}")
            raise ValueError(f"图片上传超时，请检查阿里云 OSS 服务是否正常运行")
        except Exception as e:
            logger.error(f"阿里云 OSS 上传失败: {e}")
            raise ValueError(f"图片上传失败: {str(e)}")

    def _upload_to_local(self, object_key: str, image_data: bytes) -> str:
        """上传到本地文件系统"""
        file_path = self.storage_path / object_key
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(file_path, "wb") as f:
            f.write(image_data)
        
        # 返回相对路径（前端可以通过后端代理访问）
        url = f"/storage/{object_key}"
        logger.info(f"图片上传到本地存储成功: {object_key}")
        return url

    def delete_image(self, url: str) -> bool:
        """
        删除对象存储中的图片
        
        Args:
            url: 图片 URL
        
        Returns:
            bool: 是否删除成功
        
        注意：
        - 如果对象存储服务未运行（如 MinIO），会记录警告但不抛出异常
        - 对于 Base64 格式的 URL（data:image/...），直接返回 True（无需删除）
        """
        try:
            # Base64 格式的 URL 无需删除（存储在数据库中）
            if url.startswith("data:"):
                logger.debug(f"跳过 Base64 格式的 URL 删除: {url[:50]}...")
                return True
            
            # 从 URL 中提取 object_key
            if "/storage/" in url:
                # 本地文件系统
                object_key = url.replace("/storage/", "")
                file_path = self.storage_path / object_key
                if file_path.exists():
                    file_path.unlink()
                    logger.info(f"删除本地文件成功: {object_key}")
                    return True
                else:
                    logger.warning(f"本地文件不存在: {object_key}")
                    return False
            elif self.bucket_name in url:
                # MinIO 或 OSS
                object_key = url.split(f"{self.bucket_name}/")[-1]
                
                # 【重要】检查对象存储客户端是否可用
                if self.storage_type == "minio":
                    if not self._client:
                        logger.warning(f"MinIO 客户端未初始化，无法删除图片: {url}")
                        return False
                    try:
                        self._client.remove_object(self.bucket_name, object_key)
                        logger.info(f"删除 MinIO 图片成功: {object_key}")
                        return True
                    except Exception as e:
                        logger.error(f"删除 MinIO 图片失败: {object_key}, 错误: {e}")
                        return False
                elif self.storage_type == "aliyun_oss":
                    if not self._client:
                        logger.warning(f"阿里云 OSS 客户端未初始化，无法删除图片: {url}")
                        return False
                    try:
                        self._client.delete_object(object_key)
                        logger.info(f"删除阿里云 OSS 图片成功: {object_key}")
                        return True
                    except Exception as e:
                        logger.error(f"删除阿里云 OSS 图片失败: {object_key}, 错误: {e}")
                        return False
                else:
                    logger.warning(f"未知的存储类型: {self.storage_type}，无法删除图片: {url}")
                    return False
            else:
                logger.warning(f"无法识别图片 URL 格式: {url}")
                return False
        except Exception as e:
            logger.error(f"删除图片失败: {url}, 错误: {type(e).__name__}: {str(e)}")
            return False

    @staticmethod
    def _get_extension_from_content_type(content_type: str) -> str:
        """根据 Content-Type 获取文件扩展名"""
        mapping = {
            "image/jpeg": ".jpg",
            "image/jpg": ".jpg",
            "image/png": ".png",
            "image/gif": ".gif",
            "image/webp": ".webp",
        }
        return mapping.get(content_type.lower(), ".jpg")


# 创建全局存储服务实例（单例模式）
storage_service = StorageService()

