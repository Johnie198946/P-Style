"""
Python 图像渲染引擎
用途：使用 Python 图像处理库（Pillow、NumPy）实现 Lightroom 风格的图像调整
替代 Darktable CLI（因为 Darktable XMP 格式过于复杂）

作者：P-Style Team
日期：2024-12
"""

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
from typing import Dict, Any, Optional, Tuple
from pathlib import Path
from loguru import logger
import cv2


class PythonRenderEngine:
    """
    Python 图像渲染引擎
    
    使用 NumPy 和 OpenCV 实现 Lightroom 风格的图像调整。
    支持的调整包括：
    - 曝光 (Exposure)
    - 对比度 (Contrast)
    - 高光 (Highlights)
    - 阴影 (Shadows)
    - 白色 (Whites)
    - 黑色 (Blacks)
    - 色温 (Temperature)
    - 色调 (Tint)
    - 自然饱和度 (Vibrance)
    - 饱和度 (Saturation)
    - 清晰度 (Clarity)
    - 去雾 (Dehaze)
    - HSL 调整
    - 色彩分级
    """
    
    def __init__(self):
        """初始化渲染引擎"""
        self.logger = logger.bind(service="PythonRenderEngine")
        self.logger.info("Python 图像渲染引擎初始化完成")
    
    def render(self, input_path: str, output_path: str, 
               lr_params: Dict[str, Any]) -> Tuple[bool, str]:
        """
        渲染图像
        
        Args:
            input_path: 输入图像路径
            output_path: 输出图像路径
            lr_params: Lightroom 风格的参数字典
        
        Returns:
            (成功状态, 消息)
        """
        try:
            self.logger.info(f"开始渲染: {input_path}")
            self.logger.debug(f"参数: {lr_params}")
            
            # 读取图像
            img = cv2.imread(input_path)
            if img is None:
                return False, f"无法读取图像: {input_path}"
            
            # 转换为 RGB（OpenCV 默认是 BGR）
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # 转换为浮点数以便精确计算
            img = img.astype(np.float32) / 255.0
            
            # 提取参数
            basic = lr_params.get('basic', {})
            white_balance = lr_params.get('whiteBalance', lr_params.get('white_balance', {}))
            color_grading = lr_params.get('colorGrading', lr_params.get('color_grading', {}))
            hsl = lr_params.get('hsl', {})
            calibration = lr_params.get('calibration', {})  # 【校准 v2】相机校准参数
            
            # 应用调整（按照 Lightroom 的处理顺序）
            
            # 1. 白平衡/色温调整
            temp = self._parse_value(white_balance.get('temp', 0))
            tint = self._parse_value(white_balance.get('tint', 0))
            if temp != 0 or tint != 0:
                img = self._apply_white_balance(img, temp, tint)
            
            # 2. 曝光调整
            exposure = self._parse_value(basic.get('exposure', 0))
            if exposure != 0:
                img = self._apply_exposure(img, exposure)
            
            # 3. 对比度调整
            contrast = self._parse_value(basic.get('contrast', 0))
            if contrast != 0:
                img = self._apply_contrast(img, contrast)
            
            # 4. 高光/阴影恢复
            highlights = self._parse_value(basic.get('highlights', 0))
            shadows = self._parse_value(basic.get('shadows', 0))
            if highlights != 0 or shadows != 0:
                img = self._apply_highlights_shadows(img, highlights, shadows)
            
            # 5. 白色/黑色调整
            whites = self._parse_value(basic.get('whites', 0))
            blacks = self._parse_value(basic.get('blacks', 0))
            if whites != 0 or blacks != 0:
                img = self._apply_whites_blacks(img, whites, blacks)
            
            # 6. 清晰度（局部对比度）
            clarity = self._parse_value(basic.get('clarity', 0))
            if clarity != 0:
                img = self._apply_clarity(img, clarity)
            
            # 7. 去雾
            dehaze = self._parse_value(basic.get('dehaze', 0))
            if dehaze != 0:
                img = self._apply_dehaze(img, dehaze)
            
            # 8. 饱和度/自然饱和度
            vibrance = self._parse_value(basic.get('vibrance', 0))
            saturation = self._parse_value(basic.get('saturation', 0))
            if vibrance != 0 or saturation != 0:
                img = self._apply_saturation(img, saturation, vibrance)
            
            # 9. HSL 调整
            if hsl and isinstance(hsl, dict):
                img = self._apply_hsl(img, hsl)
            
            # 10. 色彩分级
            if color_grading and isinstance(color_grading, dict):
                img = self._apply_color_grading(img, color_grading)
            
            # 11.【校准 v2 新增】相机校准 - 胶片感关键
            if calibration and isinstance(calibration, dict):
                img = self._apply_calibration(img, calibration)
            
            # 裁剪到 [0, 1] 范围
            img = np.clip(img, 0, 1)
            
            # 转换回 8 位
            img = (img * 255).astype(np.uint8)
            
            # 转换回 BGR 并保存
            img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            cv2.imwrite(output_path, img, [cv2.IMWRITE_JPEG_QUALITY, 95])
            
            self.logger.info(f"渲染完成: {output_path}")
            return True, "渲染成功"
            
        except Exception as e:
            error_msg = f"渲染失败: {type(e).__name__}: {str(e)}"
            self.logger.error(error_msg, exc_info=True)
            return False, error_msg
    
    def _parse_value(self, value: Any) -> float:
        """解析参数值（处理字符串格式如 '+0.5' 或 '-10'）"""
        if value is None:
            return 0.0
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            try:
                # 移除可能的空格
                value = value.strip()
                # 处理带 + 号的字符串
                if value.startswith('+'):
                    value = value[1:]
                return float(value)
            except ValueError:
                return 0.0
        if isinstance(value, dict):
            # 处理 {"value": "0.5"} 格式
            return self._parse_value(value.get('value', 0))
        return 0.0
    
    def _apply_white_balance(self, img: np.ndarray, temp: float, tint: float) -> np.ndarray:
        """
        应用白平衡调整 (校准版 v2 - 2024-12)
        
        Args:
            img: 输入图像 [0, 1] 范围
            temp: 色温调整 (-100 到 100)，正值偏暖（黄），负值偏冷（蓝/青）
            tint: 色调调整 (-100 到 100)，正值偏洋红，负值偏绿
        
        【校准 v2 说明】
        - 色温系数从 0.6 增大到 0.85，增强青/暖色调效果
        - 色调系数从 0.4 增大到 0.6
        - 冷色调时绿通道增益从 0.3 增大到 0.5，产生更正宗的青色
        """
        # 【校准 v2】色温系数：0.6 → 0.85
        temp_factor = temp / 100.0 * 0.85
        
        if temp < 0:
            # 偏冷（青蓝色调）：增加蓝色，减少红色，同时增加绿色产生青感
            img[:, :, 0] = img[:, :, 0] * (1 + temp_factor)  # R 减少
            img[:, :, 2] = img[:, :, 2] * (1 - temp_factor)  # B 增加
            # 【校准 v2】绿通道增益从 0.3 → 0.5，增强青色
            img[:, :, 1] = img[:, :, 1] * (1 - temp_factor * 0.5)  # G 增加
        else:
            # 偏暖（黄色调）：增加红色，减少蓝色
            img[:, :, 0] = img[:, :, 0] * (1 + temp_factor)  # R 增加
            img[:, :, 2] = img[:, :, 2] * (1 - temp_factor)  # B 减少
        
        # 【校准 v2】色调系数：0.4 → 0.6
        tint_factor = tint / 100.0 * 0.6
        img[:, :, 1] = img[:, :, 1] * (1 - tint_factor)  # G
        if tint > 0:
            img[:, :, 0] = img[:, :, 0] * (1 + tint_factor * 0.4)  # 微增红
            img[:, :, 2] = img[:, :, 2] * (1 + tint_factor * 0.4)  # 微增蓝
        
        self.logger.debug(f"应用白平衡(校准v2): temp={temp}, tint={tint}, temp_factor={temp_factor:.3f}")
        return img
    
    def _apply_exposure(self, img: np.ndarray, exposure: float) -> np.ndarray:
        """
        应用曝光调整
        
        Args:
            img: 输入图像 [0, 1] 范围
            exposure: 曝光调整 (-5 到 5 EV)
        """
        # 曝光调整：每 1 EV 亮度翻倍/减半
        factor = 2 ** exposure
        img = img * factor
        self.logger.debug(f"应用曝光: {exposure} EV, factor={factor:.3f}")
        return img
    
    def _apply_contrast(self, img: np.ndarray, contrast: float) -> np.ndarray:
        """
        应用对比度调整 (校准版 - 使用 S 曲线)
        
        Args:
            img: 输入图像 [0, 1] 范围
            contrast: 对比度调整 (-100 到 100)
        
        【校准说明】
        - 原算法使用线性对比度，效果平淡
        - 改用 S 曲线 (Sigmoid) 模拟 Lightroom 效果
        - S 曲线能更好地保护高光和阴影细节
        """
        if abs(contrast) < 1:
            return img
        
        # 【校准】使用 S 曲线（Sigmoid）实现更自然的对比度
        # contrast > 0: S 曲线更陡峭
        # contrast < 0: S 曲线更平缓
        
        # 计算 S 曲线参数
        # factor 控制曲线陡峭程度，范围约 0.5 到 2.0
        factor = 1 + contrast / 100.0 * 1.5  # 【校准】从 1.0 增大到 1.5
        
        # 应用 S 曲线：使用改进的对比度公式
        # 以 0.5 为中心点，使用 power 函数模拟 S 曲线
        midpoint = 0.5
        
        # 分别处理暗部和亮部
        dark_mask = img < midpoint
        light_mask = ~dark_mask
        
        result = np.zeros_like(img)
        
        # 【校准 v2】暗部/亮部 gamma 增强
        # gamma_dark: 0.5 → 0.6, gamma_light: 0.3 → 0.4
        if contrast > 0:
            gamma_dark = 1 + contrast / 100.0 * 0.6   # 【校准 v2】
            gamma_light = 1 - contrast / 100.0 * 0.4  # 【校准 v2】
        else:
            gamma_dark = 1 + contrast / 100.0 * 0.4
            gamma_light = 1 - contrast / 100.0 * 0.6
        
        # 暗部处理
        dark_normalized = img[dark_mask] / midpoint
        result[dark_mask] = np.power(dark_normalized, gamma_dark) * midpoint
        
        # 亮部处理
        light_normalized = (img[light_mask] - midpoint) / midpoint
        result[light_mask] = midpoint + (1 - np.power(1 - light_normalized, gamma_light)) * midpoint
        
        self.logger.debug(f"应用对比度(校准版-S曲线): {contrast}, gamma_dark={gamma_dark:.3f}, gamma_light={gamma_light:.3f}")
        return result
    
    def _apply_highlights_shadows(self, img: np.ndarray, 
                                  highlights: float, shadows: float) -> np.ndarray:
        """
        应用高光/阴影恢复
        
        Args:
            img: 输入图像 [0, 1] 范围
            highlights: 高光调整 (-100 到 100)，负值恢复高光细节
            shadows: 阴影调整 (-100 到 100)，正值提亮阴影
        """
        # 计算亮度
        luminance = 0.299 * img[:, :, 0] + 0.587 * img[:, :, 1] + 0.114 * img[:, :, 2]
        
        # 高光恢复（针对亮部）
        if highlights != 0:
            highlight_mask = np.clip(luminance - 0.5, 0, 0.5) * 2  # 只影响亮部
            highlight_factor = -highlights / 100.0 * 0.5
            for c in range(3):
                img[:, :, c] = img[:, :, c] + highlight_mask * img[:, :, c] * highlight_factor
        
        # 阴影提亮（针对暗部）
        if shadows != 0:
            shadow_mask = np.clip(0.5 - luminance, 0, 0.5) * 2  # 只影响暗部
            shadow_factor = shadows / 100.0 * 0.5
            for c in range(3):
                img[:, :, c] = img[:, :, c] + shadow_mask * shadow_factor
        
        self.logger.debug(f"应用高光/阴影: highlights={highlights}, shadows={shadows}")
        return img
    
    def _apply_whites_blacks(self, img: np.ndarray, 
                             whites: float, blacks: float) -> np.ndarray:
        """
        应用白色/黑色调整（校准版 v2 - 安全边界 + Faded Black）
        
        Args:
            img: 输入图像 [0, 1] 范围
            whites: 白色调整 (-100 到 100)
            blacks: 黑色调整 (-100 到 100)
        
        【校准 v2 说明】
        - 白色调整改用线性缩放（替代 gamma），防止溢出
        - 黑位 offset 从 0.1 增大到 0.15，增强 Faded Black 效果
        - 添加安全裁剪防止溢出
        """
        # 【校准 v2】白色调整：改用线性缩放，更安全
        if whites != 0:
            # 计算缩放因子，限制在合理范围
            white_factor = 1 + whites / 100.0 * 0.25  # 减小系数防止溢出
            # 只影响高光区域（亮度 > 0.5）
            luminance = 0.299 * img[:, :, 0] + 0.587 * img[:, :, 1] + 0.114 * img[:, :, 2]
            white_mask = np.clip((luminance - 0.5) * 2, 0, 1)
            for c in range(3):
                img[:, :, c] = img[:, :, c] + white_mask * img[:, :, c] * (white_factor - 1) * 0.5
        
        # 【校准 v2】黑色调整：offset 从 0.1 → 0.15 (Faded Black 效果)
        if blacks != 0:
            black_offset = blacks / 100.0 * 0.15  # 【校准 v2】增强 Faded 效果
            # 正值提升黑位（Faded），负值压低黑位
            img = img + black_offset
        
        # 【校准 v2】安全裁剪，防止溢出
        img = np.clip(img, 0, 1)
        
        self.logger.debug(f"应用白色/黑色(校准v2): whites={whites}, blacks={blacks}")
        return img
    
    def _apply_clarity(self, img: np.ndarray, clarity: float) -> np.ndarray:
        """
        应用清晰度（局部对比度增强）
        
        Args:
            img: 输入图像 [0, 1] 范围
            clarity: 清晰度 (-100 到 100)
        """
        if abs(clarity) < 1:
            return img
        
        # 使用高通滤波实现局部对比度
        # 转换为 8 位进行滤波
        img_8bit = (np.clip(img, 0, 1) * 255).astype(np.uint8)
        
        # 高斯模糊
        blurred = cv2.GaussianBlur(img_8bit, (0, 0), sigmaX=30)
        
        # 高通 = 原图 - 模糊
        high_pass = cv2.subtract(img_8bit, blurred)
        
        # 添加高通分量
        factor = clarity / 100.0 * 0.5
        result = cv2.addWeighted(img_8bit, 1.0, high_pass, factor, 0)
        
        self.logger.debug(f"应用清晰度: {clarity}")
        return result.astype(np.float32) / 255.0
    
    def _apply_dehaze(self, img: np.ndarray, dehaze: float) -> np.ndarray:
        """
        应用去雾 (校准版 v2 - 修复溢出问题)
        
        Args:
            img: 输入图像 [0, 1] 范围
            dehaze: 去雾强度 (-100 到 100)
        
        【校准 v2 说明】
        - omega 从 0.6 降低到 0.45，防止过度去雾导致溢出
        - 透射率下限从 0.15 提高到 0.3，保护暗部细节
        - 添加安全裁剪防止高光溢出
        """
        if abs(dehaze) < 1:
            return img
        
        factor = dehaze / 100.0
        
        if dehaze > 0:
            # 1. 计算暗通道
            dark_channel = np.min(img, axis=2)
            
            # 2. 估计大气光（使用暗通道最亮区域的均值）
            flat_dark = dark_channel.flatten()
            num_top = max(1, int(len(flat_dark) * 0.001))
            top_indices = np.argsort(flat_dark)[-num_top:]
            atmosphere = np.mean([img.reshape(-1, 3)[i] for i in top_indices], axis=0)
            # 【校准 v2】限制大气光范围，防止溢出
            atmosphere = np.clip(atmosphere, 0.6, 0.95)
            
            # 3. 【校准 v2】透射率计算
            # omega 从 0.6 → 0.45，透射率下限从 0.15 → 0.3
            omega = factor * 0.45  # 【校准 v2】降低去雾强度
            transmission = 1 - omega * (dark_channel / np.max(atmosphere))
            transmission = np.clip(transmission, 0.3, 1.0)  # 【校准 v2】提高下限防止溢出
            
            # 4. 恢复场景辐射
            transmission_3d = transmission[:, :, np.newaxis]
            img = (img - atmosphere[np.newaxis, np.newaxis, :] * (1 - transmission_3d)) / transmission_3d
            
            # 5. 【新增】饱和度补偿（去雾后颜色会变淡）
            sat_boost = 1 + factor * 0.2
            img_hsv = cv2.cvtColor((np.clip(img, 0, 1) * 255).astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
            img_hsv[:, :, 1] = np.clip(img_hsv[:, :, 1] * sat_boost, 0, 255)
            img = cv2.cvtColor(img_hsv.astype(np.uint8), cv2.COLOR_HSV2RGB).astype(np.float32) / 255.0
            
        else:
            # 负去雾（添加雾感）
            # 简单地降低对比度和提亮暗部
            img = (img - 0.5) * (1 + factor * 0.5) + 0.5
            img = img + abs(factor) * 0.1
        
        self.logger.debug(f"应用去雾(校准版): {dehaze}, factor={factor:.3f}")
        return img
    
    def _apply_saturation(self, img: np.ndarray, 
                          saturation: float, vibrance: float) -> np.ndarray:
        """
        应用饱和度/自然饱和度
        
        Args:
            img: 输入图像 [0, 1] 范围
            saturation: 饱和度 (-100 到 100)
            vibrance: 自然饱和度 (-100 到 100)
        """
        # 转换到 HSV
        img_hsv = cv2.cvtColor((img * 255).astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
        
        # 饱和度调整
        if saturation != 0:
            sat_factor = 1 + saturation / 100.0
            img_hsv[:, :, 1] = img_hsv[:, :, 1] * sat_factor
        
        # 自然饱和度调整（只增强低饱和度区域）
        if vibrance != 0:
            vib_factor = vibrance / 100.0
            # 计算当前饱和度的反比因子（低饱和度区域增强更多）
            sat_inverse = 1 - img_hsv[:, :, 1] / 255.0
            img_hsv[:, :, 1] = img_hsv[:, :, 1] * (1 + vib_factor * sat_inverse * 0.5)
        
        # 裁剪饱和度
        img_hsv[:, :, 1] = np.clip(img_hsv[:, :, 1], 0, 255)
        
        # 转换回 RGB
        img = cv2.cvtColor(img_hsv.astype(np.uint8), cv2.COLOR_HSV2RGB).astype(np.float32) / 255.0
        
        self.logger.debug(f"应用饱和度: sat={saturation}, vib={vibrance}")
        return img
    
    def _apply_hsl(self, img: np.ndarray, hsl: Dict[str, Any]) -> np.ndarray:
        """
        应用 HSL 调整 (校准版 v2 - 绿色偏青增强)
        
        Args:
            img: 输入图像 [0, 1] 范围
            hsl: HSL 参数字典
        
        【校准 v2 说明】
        - 绿色色相系数从 1.0 增大到 1.8，让绿色更偏青
        - 蓝色色相系数从 1.0 增大到 1.5，让蓝色更偏青
        - 其他颜色保持 1.0 系数
        - 饱和度系数从 1.5 降低到 1.3，避免过饱和
        """
        # 转换到 HSV
        img_hsv = cv2.cvtColor((img * 255).astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
        
        # 颜色范围（OpenCV HSV 色相范围：0-180）
        color_ranges = {
            'red': [(0, 10), (170, 180)],
            'orange': [(10, 25)],
            'yellow': [(25, 40)],
            'green': [(40, 85)],
            'aqua': [(85, 100)],
            'cyan': [(85, 100)],
            'blue': [(100, 130)],
            'purple': [(130, 150)],
            'magenta': [(150, 170)],
        }
        
        # 【校准 v2】每种颜色的色相系数（关键：绿色和蓝色偏青）
        hue_coefficients = {
            'red': 1.0,
            'orange': 1.0,
            'yellow': 1.2,     # 黄色轻微偏绿
            'green': 1.8,      # 【校准 v2】绿色大幅偏青
            'aqua': 1.2,
            'cyan': 1.2,
            'blue': 1.5,       # 【校准 v2】蓝色偏青
            'purple': 1.0,
            'magenta': 1.0,
        }
        
        for color_name, params in hsl.items():
            if color_name not in color_ranges:
                continue
            
            hue_shift = self._parse_value(params.get('hue', params.get('h', 0)))
            sat_shift = self._parse_value(params.get('saturation', params.get('s', 0)))
            lum_shift = self._parse_value(params.get('luminance', params.get('l', 0)))
            
            if hue_shift == 0 and sat_shift == 0 and lum_shift == 0:
                continue
            
            # 获取该颜色的色相系数
            hue_coef = hue_coefficients.get(color_name, 1.0)
            
            for hue_range in color_ranges[color_name]:
                low_h, high_h = hue_range
                hue_channel = img_hsv[:, :, 0]
                
                # 软蒙版计算
                center = (low_h + high_h) / 2
                width = (high_h - low_h) / 2
                distance = np.abs(hue_channel - center)
                if color_name == 'red':
                    distance = np.minimum(distance, 180 - distance)
                soft_mask = np.clip(1 - (distance - width) / 10, 0, 1)
                
                # 【校准 v2】应用颜色特定的色相系数
                if hue_shift != 0:
                    hue_delta = hue_shift * hue_coef * soft_mask
                    img_hsv[:, :, 0] = (img_hsv[:, :, 0] + hue_delta) % 180
                
                # 【校准 v2】饱和度系数从 1.5 → 1.3
                if sat_shift != 0:
                    sat_factor = 1 + sat_shift / 100.0 * 1.3
                    sat_delta = (sat_factor - 1) * soft_mask
                    img_hsv[:, :, 1] = np.clip(
                        img_hsv[:, :, 1] * (1 + sat_delta),
                        0, 255
                    )
                
                # 【校准】明度调整
                if lum_shift != 0:
                    lum_factor = 1 + lum_shift / 100.0 * 1.2  # 【校准】微调
                    lum_delta = (lum_factor - 1) * soft_mask
                    img_hsv[:, :, 2] = np.clip(
                        img_hsv[:, :, 2] * (1 + lum_delta),
                        0, 255
                    )
        
        # 转换回 RGB
        img = cv2.cvtColor(img_hsv.astype(np.uint8), cv2.COLOR_HSV2RGB).astype(np.float32) / 255.0
        
        self.logger.debug(f"应用 HSL 调整(校准版)")
        return img
    
    def _apply_color_grading(self, img: np.ndarray, 
                             grading: Dict[str, Any]) -> np.ndarray:
        """
        应用色彩分级（阴影/中间调/高光着色）
        
        Args:
            img: 输入图像 [0, 1] 范围
            grading: 色彩分级参数
        """
        # 计算亮度
        luminance = 0.299 * img[:, :, 0] + 0.587 * img[:, :, 1] + 0.114 * img[:, :, 2]
        
        # 处理阴影
        shadows = grading.get('shadows', {})
        if shadows:
            shadow_hue = self._parse_value(shadows.get('hue', shadows.get('h', 0)))
            shadow_sat = self._parse_value(shadows.get('saturation', shadows.get('s', 0)))
            if shadow_hue != 0 or shadow_sat != 0:
                shadow_mask = np.clip(0.33 - luminance, 0, 0.33) * 3
                img = self._apply_tint(img, shadow_mask, shadow_hue, shadow_sat)
        
        # 处理中间调
        midtones = grading.get('midtones', {})
        if midtones:
            mid_hue = self._parse_value(midtones.get('hue', midtones.get('h', 0)))
            mid_sat = self._parse_value(midtones.get('saturation', midtones.get('s', 0)))
            if mid_hue != 0 or mid_sat != 0:
                mid_mask = 1 - np.abs(luminance - 0.5) * 2
                mid_mask = np.clip(mid_mask, 0, 1)
                img = self._apply_tint(img, mid_mask, mid_hue, mid_sat)
        
        # 处理高光
        highlights = grading.get('highlights', {})
        if highlights:
            high_hue = self._parse_value(highlights.get('hue', highlights.get('h', 0)))
            high_sat = self._parse_value(highlights.get('saturation', highlights.get('s', 0)))
            if high_hue != 0 or high_sat != 0:
                high_mask = np.clip(luminance - 0.67, 0, 0.33) * 3
                img = self._apply_tint(img, high_mask, high_hue, high_sat)
        
        self.logger.debug(f"应用色彩分级")
        return img
    
    def _apply_tint(self, img: np.ndarray, mask: np.ndarray, 
                    hue: float, saturation: float) -> np.ndarray:
        """
        应用色调叠加 (校准版)
        
        Args:
            img: 输入图像
            mask: 影响范围蒙版
            hue: 色相 (0-360)
            saturation: 饱和度 (0-100)
        
        【校准说明】
        - 着色强度从 0.3 增大到 0.5
        - 使用叠加混合模式，更接近 LR 效果
        """
        if saturation == 0:
            return img
        
        # 将色相转换为 RGB
        hue_normalized = (hue % 360) / 360.0
        
        # HSV 到 RGB 转换
        h = hue_normalized * 6
        x = 1 - abs((h % 2) - 1)
        
        if h < 1:
            tint_color = np.array([1, x, 0])
        elif h < 2:
            tint_color = np.array([x, 1, 0])
        elif h < 3:
            tint_color = np.array([0, 1, x])
        elif h < 4:
            tint_color = np.array([0, x, 1])
        elif h < 5:
            tint_color = np.array([x, 0, 1])
        else:
            tint_color = np.array([1, 0, x])
        
        # 【校准 v2】着色强度从 0.5 增大到 0.6
        strength = saturation / 100.0 * 0.6
        mask_3d = mask[:, :, np.newaxis]
        
        # 【校准】使用软光混合模式，更自然
        # Soft Light: result = 2 * base * overlay (for overlay < 0.5)
        #             result = 1 - 2 * (1-base) * (1-overlay) (for overlay >= 0.5)
        for c in range(3):
            overlay = tint_color[c]
            base = img[:, :, c]
            
            if overlay < 0.5:
                blended = 2 * base * overlay
            else:
                blended = 1 - 2 * (1 - base) * (1 - overlay)
            
            # 按蒙版混合
            img[:, :, c] = base * (1 - mask_3d[:, :, 0] * strength) + \
                          blended * mask_3d[:, :, 0] * strength
        
        return img
    
    def _apply_calibration(self, img: np.ndarray, calibration: Dict[str, Any]) -> np.ndarray:
        """
        应用相机校准 (校准版 v2 - 胶片感关键)
        
        Args:
            img: 输入图像 [0, 1] 范围
            calibration: 校准参数字典
        
        【校准 v2 说明】
        - 这是模仿胶片色的关键功能
        - 通过偏移 RGB 三原色的色相和饱和度，改变整体色彩映射
        - 例如：蓝原色偏青 + 高饱和度 = Teal & Orange 基础
        """
        # 红原色校准
        red_primary = calibration.get('red_primary', {})
        red_hue = self._parse_value(red_primary.get('hue', 0))
        red_sat = self._parse_value(red_primary.get('saturation', 0))
        
        # 绿原色校准
        green_primary = calibration.get('green_primary', {})
        green_hue = self._parse_value(green_primary.get('hue', 0))
        green_sat = self._parse_value(green_primary.get('saturation', 0))
        
        # 蓝原色校准
        blue_primary = calibration.get('blue_primary', {})
        blue_hue = self._parse_value(blue_primary.get('hue', 0))
        blue_sat = self._parse_value(blue_primary.get('saturation', 0))
        
        # 阴影色调
        shadows_tint = self._parse_value(calibration.get('shadows_tint', 0))
        
        # 如果所有参数都为 0，跳过处理
        if all(v == 0 for v in [red_hue, red_sat, green_hue, green_sat, blue_hue, blue_sat, shadows_tint]):
            return img
        
        self.logger.debug(f"应用相机校准: red=({red_hue}, {red_sat}), green=({green_hue}, {green_sat}), blue=({blue_hue}, {blue_sat})")
        
        # 转换到 HSV 进行处理
        img_hsv = cv2.cvtColor((np.clip(img, 0, 1) * 255).astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
        
        # 【关键】根据原色校准偏移整体色彩
        # 原理：Lightroom 的 Calibration 会改变 RGB 到 HSV 的映射关系
        
        # 1. 红原色调整（影响红色和橙色区域）
        if red_hue != 0 or red_sat != 0:
            # 红色区域蒙版 (0-15, 165-180)
            red_mask = ((img_hsv[:, :, 0] <= 15) | (img_hsv[:, :, 0] >= 165)).astype(np.float32)
            # 橙色区域也受影响
            orange_mask = ((img_hsv[:, :, 0] > 15) & (img_hsv[:, :, 0] <= 30)).astype(np.float32) * 0.5
            combined_mask = np.clip(red_mask + orange_mask, 0, 1)
            
            if red_hue != 0:
                img_hsv[:, :, 0] = img_hsv[:, :, 0] + red_hue * 0.5 * combined_mask
            if red_sat != 0:
                sat_factor = 1 + red_sat / 100.0
                img_hsv[:, :, 1] = img_hsv[:, :, 1] * (1 + (sat_factor - 1) * combined_mask)
        
        # 2. 绿原色调整（影响绿色和青色区域）
        if green_hue != 0 or green_sat != 0:
            green_mask = ((img_hsv[:, :, 0] >= 40) & (img_hsv[:, :, 0] <= 100)).astype(np.float32)
            
            if green_hue != 0:
                # 【校准 v2】绿原色色相偏移增强
                img_hsv[:, :, 0] = img_hsv[:, :, 0] + green_hue * 0.8 * green_mask
            if green_sat != 0:
                sat_factor = 1 + green_sat / 100.0
                img_hsv[:, :, 1] = img_hsv[:, :, 1] * (1 + (sat_factor - 1) * green_mask)
        
        # 3. 蓝原色调整（影响蓝色和紫色区域）- 【关键：青橙色调基础】
        if blue_hue != 0 or blue_sat != 0:
            blue_mask = ((img_hsv[:, :, 0] >= 100) & (img_hsv[:, :, 0] <= 150)).astype(np.float32)
            # 天空等大面积蓝色区域也受影响
            
            if blue_hue != 0:
                # 【校准 v2】蓝原色偏青效果增强
                img_hsv[:, :, 0] = img_hsv[:, :, 0] + blue_hue * 1.0 * blue_mask
            if blue_sat != 0:
                # 【校准 v2】蓝原色饱和度大幅增强
                sat_factor = 1 + blue_sat / 100.0 * 1.5
                img_hsv[:, :, 1] = img_hsv[:, :, 1] * (1 + (sat_factor - 1) * blue_mask)
        
        # 4. 阴影色调（整体阴影偏绿或偏洋红）
        if shadows_tint != 0:
            # 计算亮度
            luminance = img_hsv[:, :, 2] / 255.0
            shadow_mask = np.clip(0.4 - luminance, 0, 0.4) * 2.5
            
            # 正值偏洋红，负值偏绿
            if shadows_tint > 0:
                # 阴影偏洋红（减少绿色）
                img[:, :, 1] = img[:, :, 1] - shadow_mask * shadows_tint / 100.0 * 0.1
            else:
                # 阴影偏绿
                img[:, :, 1] = img[:, :, 1] - shadow_mask * shadows_tint / 100.0 * 0.1
        
        # 裁剪 HSV 值
        img_hsv[:, :, 0] = img_hsv[:, :, 0] % 180
        img_hsv[:, :, 1] = np.clip(img_hsv[:, :, 1], 0, 255)
        
        # 转换回 RGB
        img = cv2.cvtColor(img_hsv.astype(np.uint8), cv2.COLOR_HSV2RGB).astype(np.float32) / 255.0
        
        self.logger.debug(f"应用相机校准(校准v2)完成")
        return img


# 创建全局实例
python_render_engine = PythonRenderEngine()

