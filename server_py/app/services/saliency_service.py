"""
显著性检测服务
使用 U^2-Net 或 TRACER 等显著性检测模型生成黑白遮罩图
根据用户需求实现：后端返回显著性遮罩图，前端作为 Mask 贴图

算法：使用 U^2-Net 或 TRACER 等显著性检测模型
返回数据: 一张 PNG 图片 URL
黑色 = 背景
白色 = 视觉重心
"""
import cv2
import numpy as np
from typing import Optional, Tuple
from loguru import logger
from PIL import Image
import io
import base64
import uuid
from pathlib import Path

from .storage_service import StorageService


class SaliencyService:
    """显著性检测服务 - 生成视觉重心遮罩图"""
    
    def __init__(self):
        """初始化显著性检测服务"""
        self.storage_service = StorageService()
        # 【注意】U^2-Net 或 TRACER 模型需要单独安装和加载
        # 这里先实现一个基于 OpenCV 的简化版本，后续可以替换为深度学习模型
        logger.info("显著性检测服务初始化完成（当前使用 OpenCV 简化版本）")
    
    def generate_saliency_mask(
        self,
        image_data: str,
        task_id: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> Optional[str]:
        """
        生成显著性遮罩图（黑白图片）
        
        Args:
            image_data: 图片数据（base64 或 data URL）
            task_id: 任务 ID（可选，用于生成文件路径）
            user_id: 用户 ID（可选，用于生成文件路径）
        
        Returns:
            遮罩图 URL（如果生成成功），否则返回 None
        
        Note:
            - 黑色 = 背景（需要降低亮度）
            - 白色 = 视觉重心（保留原亮度）
            - 返回 PNG 格式的图片 URL
        """
        try:
            # 【步骤1】解码图片
            img_array = self._decode_image(image_data)
            if img_array is None:
                logger.error("显著性检测：图片解码失败")
                return None
            
            # 【步骤2】生成显著性遮罩（当前使用 OpenCV 简化版本）
            # TODO: 后续可以替换为 U^2-Net 或 TRACER 深度学习模型
            mask = self._generate_mask_opencv(img_array)
            if mask is None:
                logger.error("显著性检测：遮罩生成失败")
                return None
            
            # 【步骤3】将遮罩转换为 PNG 格式（黑白图片）
            mask_png_bytes = self._mask_to_png(mask)
            if mask_png_bytes is None:
                logger.error("显著性检测：遮罩转换为 PNG 失败")
                return None
            
            # 【步骤4】上传到对象存储
            mask_url = self._upload_mask_to_storage(
                mask_png_bytes,
                task_id=task_id,
                user_id=user_id
            )
            if mask_url is None:
                logger.error("显著性检测：遮罩上传失败")
                return None
            
            logger.info(f"显著性检测：遮罩图生成成功，URL = {mask_url}")
            return mask_url
            
        except Exception as e:
            logger.error(f"显著性检测失败: {type(e).__name__}: {str(e)}", exc_info=True)
            return None
    
    def _decode_image(self, image_data: str) -> Optional[np.ndarray]:
        """
        解码 base64 图片或 URL
        统一转换为 RGB 格式（3通道）
        
        Args:
            image_data: base64 字符串或 data URL 格式的图片数据
        
        Returns:
            numpy.ndarray: RGB 格式的图片数组，形状为 (H, W, 3)
            如果解码失败，返回 None
        """
        try:
            if image_data.startswith("data:image"):
                # data URL 格式：data:image/jpeg;base64,...
                header, encoded = image_data.split(",", 1)
                img_bytes = base64.b64decode(encoded)
            else:
                # 假设是 base64 字符串（无 data URL 前缀）
                img_bytes = base64.b64decode(image_data)
            
            # 使用 PIL 打开图片
            img = Image.open(io.BytesIO(img_bytes))
            
            # 统一转换为 RGB 格式（3通道）
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # 转换为 numpy 数组，形状为 (H, W, 3)
            return np.array(img)
        except Exception as e:
            logger.error(f"图片解码失败: {e}")
            return None
    
    def _generate_mask_opencv(self, img_array: np.ndarray) -> Optional[np.ndarray]:
        """
        使用 OpenCV 生成显著性遮罩（简化版本）
        
        Args:
            img_array: RGB 格式的图片数组，形状为 (H, W, 3)
        
        Returns:
            灰度遮罩数组，形状为 (H, W)，值域 0-255
            - 0（黑色）= 背景
            - 255（白色）= 视觉重心
        
        Note:
            这是一个简化版本，使用 OpenCV 的 GrabCut 算法
            后续可以替换为 U^2-Net 或 TRACER 深度学习模型
        """
        try:
            # 【方法1】使用 GrabCut 算法（需要前景和背景的初始估计）
            # 这里使用一个简化的方法：基于颜色和边缘检测
            
            # 转换为灰度图
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            
            # 【方法2】使用边缘检测 + 形态学操作
            # 1. 边缘检测
            edges = cv2.Canny(gray, 50, 150)
            
            # 2. 形态学操作（闭运算，连接边缘）
            kernel = np.ones((5, 5), np.uint8)
            closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
            
            # 3. 填充轮廓（找到最大轮廓并填充）
            contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if len(contours) > 0:
                # 找到最大轮廓
                largest_contour = max(contours, key=cv2.contourArea)
                # 创建遮罩：最大轮廓区域为白色（视觉重心），其余为黑色（背景）
                mask = np.zeros(gray.shape, dtype=np.uint8)
                cv2.fillPoly(mask, [largest_contour], 255)
            else:
                # 如果没有找到轮廓，使用基于亮度的简单方法
                # 假设较亮的区域是视觉重心（白色），较暗的区域是背景（黑色）
                _, mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                # 【重要】确保：较亮的区域（视觉重心）= 白色（255），较暗的区域（背景）= 黑色（0）
                # THRESH_BINARY + THRESH_OTSU 已经满足这个要求，不需要反转
            
            # 【方法3】使用 GrabCut 算法（更精确，但需要更多计算）
            # 这里先使用简化版本，后续可以优化
            
            # 确保遮罩是二值化的（0 或 255）
            _, mask_binary = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)
            
            logger.debug(f"显著性检测：遮罩生成完成，尺寸 = {mask_binary.shape}, 白色像素占比 = {np.sum(mask_binary == 255) / mask_binary.size * 100:.2f}%")
            
            return mask_binary
            
        except Exception as e:
            logger.error(f"遮罩生成失败: {e}", exc_info=True)
            return None
    
    def _mask_to_png(self, mask: np.ndarray) -> Optional[bytes]:
        """
        将遮罩数组转换为 PNG 格式的字节流
        
        Args:
            mask: 灰度遮罩数组，形状为 (H, W)，值域 0-255
        
        Returns:
            PNG 格式的字节流，如果转换失败返回 None
        """
        try:
            # 将 numpy 数组转换为 PIL Image
            mask_image = Image.fromarray(mask, mode='L')  # 'L' 表示灰度图
            
            # 转换为 PNG 格式的字节流
            png_buffer = io.BytesIO()
            mask_image.save(png_buffer, format='PNG')
            png_bytes = png_buffer.getvalue()
            
            logger.debug(f"遮罩转换为 PNG 完成，大小 = {len(png_bytes)} 字节")
            return png_bytes
            
        except Exception as e:
            logger.error(f"遮罩转换为 PNG 失败: {e}", exc_info=True)
            return None
    
    def _upload_mask_to_storage(
        self,
        mask_png_bytes: bytes,
        task_id: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> Optional[str]:
        """
        将遮罩图上传到对象存储
        
        Args:
            mask_png_bytes: PNG 格式的遮罩图字节流
            task_id: 任务 ID（可选，用于生成文件路径）
            user_id: 用户 ID（可选，用于生成文件路径）
        
        Returns:
            遮罩图 URL，如果上传失败返回 None
        """
        try:
            # 上传到对象存储（使用 upload_image 方法）
            # 注意：StorageService 的 upload_image 方法接受 bytes 数据
            # 新增的 image_type="saliency_mask" 已在 storage_service.py 中支持
            mask_url = self.storage_service.upload_image(
                image_data=mask_png_bytes,
                user_id=user_id,
                task_id=task_id,
                image_type="saliency_mask",  # 新增图片类型（已在 storage_service.py 中支持）
                content_type="image/png"
            )
            
            if mask_url:
                logger.info(f"遮罩图上传成功: {mask_url}")
            else:
                logger.warning("遮罩图上传失败，返回 None")
            
            return mask_url
            
        except Exception as e:
            logger.error(f"遮罩图上传失败: {e}", exc_info=True)
            return None

