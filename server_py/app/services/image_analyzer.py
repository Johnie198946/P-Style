"""
图像分析服务 - 使用 OpenCV 进行真正的图像量化分析

功能：
1. 直方图分析：黑点、白点、峰值、形态
2. 色彩分析：天空、植被、阴影、高光的 RGB/HSL
3. 差值计算：用户图与参考图的量化差异
4. 为 Gemini 提供精准的数据支撑

作者：AI Assistant
日期：2025-01-29
"""

import cv2
import numpy as np
from typing import Dict, Any, Optional, Tuple, List
from loguru import logger
import io


class ImageAnalyzer:
    """
    图像分析器 - 提供量化的图像分析数据
    
    使用 OpenCV 分析图像的直方图和色彩分布，
    为 Gemini 提供精准的数据支撑，避免"拍脑袋"生成参数。
    """
    
    def __init__(self):
        """初始化图像分析器"""
        pass
    
    def analyze_image(self, image_data: bytes) -> Dict[str, Any]:
        """
        分析单张图片，返回量化数据
        
        Args:
            image_data: 图片的二进制数据
            
        Returns:
            包含直方图分析、色彩分析等量化数据的字典
        """
        try:
            # 将二进制数据转换为 OpenCV 图像
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                logger.error("[ImageAnalyzer] 无法解码图片")
                return self._get_empty_analysis()
            
            # BGR 转 RGB（OpenCV 默认是 BGR）
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # 1. 直方图分析
            histogram_analysis = self._analyze_histogram(img_rgb)
            
            # 2. 色彩分析
            color_analysis = self._analyze_colors(img_rgb)
            
            # 3. 区域分析（天空、植被、阴影等）
            zone_analysis = self._analyze_zones(img_rgb)
            
            result = {
                "histogram": histogram_analysis,
                "colors": color_analysis,
            "zones": zone_analysis,
            "image_info": {
                "width": img.shape[1],
                "height": img.shape[0],
                "aspect_ratio": round(img.shape[1] / img.shape[0], 2)
            },
            # 【新增】高级分析
            "advanced": self._advanced_analysis(img_rgb, histogram_analysis)
        }
        
        logger.info(f"[ImageAnalyzer] 图像分析完成: {img.shape[1]}x{img.shape[0]}")
        return result
            
        except Exception as e:
            logger.error(f"[ImageAnalyzer] 分析图片失败: {e}")
            return self._get_empty_analysis()
    
    def _analyze_histogram(self, img_rgb: np.ndarray) -> Dict[str, Any]:
        """
        分析图像直方图
        
        返回：
        - 黑点位置（最暗处的 RGB）
        - 白点位置（最亮处的 RGB）
        - 直方图峰值位置
        - 直方图形态描述
        - 各通道直方图数据
        """
        # 分离 RGB 通道
        r, g, b = img_rgb[:,:,0], img_rgb[:,:,1], img_rgb[:,:,2]
        
        # 计算亮度通道 (使用标准权重)
        luminance = (0.299 * r + 0.587 * g + 0.114 * b).astype(np.uint8)
        
        # 计算各通道直方图
        hist_r = cv2.calcHist([r], [0], None, [256], [0, 256]).flatten()
        hist_g = cv2.calcHist([g], [0], None, [256], [0, 256]).flatten()
        hist_b = cv2.calcHist([b], [0], None, [256], [0, 256]).flatten()
        hist_l = cv2.calcHist([luminance], [0], None, [256], [0, 256]).flatten()
        
        # 归一化直方图（0-100）
        total_pixels = img_rgb.shape[0] * img_rgb.shape[1]
        hist_r_norm = (hist_r / total_pixels * 100).tolist()
        hist_g_norm = (hist_g / total_pixels * 100).tolist()
        hist_b_norm = (hist_b / total_pixels * 100).tolist()
        hist_l_norm = (hist_l / total_pixels * 100).tolist()
        
        # 计算黑点（最暗的 1% 像素的平均值）
        black_point = self._calculate_percentile_color(img_rgb, luminance, percentile=1, is_low=True)
        
        # 计算白点（最亮的 1% 像素的平均值）
        white_point = self._calculate_percentile_color(img_rgb, luminance, percentile=1, is_low=False)
        
        # 计算直方图峰值位置
        peak_position = int(np.argmax(hist_l))
        
        # 计算平均亮度
        avg_luminance = int(np.mean(luminance))
        
        # 计算阴影/中间调/高光的像素占比
        shadows_ratio = int(np.sum(luminance < 85) / total_pixels * 100)
        midtones_ratio = int(np.sum((luminance >= 85) & (luminance < 170)) / total_pixels * 100)
        highlights_ratio = int(np.sum(luminance >= 170) / total_pixels * 100)
        
        # 判断直方图形态
        histogram_shape = self._classify_histogram_shape(avg_luminance, shadows_ratio, highlights_ratio, black_point)
        
        return {
            "black_point": {
                "r": int(black_point[0]),
                "g": int(black_point[1]),
                "b": int(black_point[2]),
                "luminance": int(0.299 * black_point[0] + 0.587 * black_point[1] + 0.114 * black_point[2])
            },
            "white_point": {
                "r": int(white_point[0]),
                "g": int(white_point[1]),
                "b": int(white_point[2]),
                "luminance": int(0.299 * white_point[0] + 0.587 * white_point[1] + 0.114 * white_point[2])
            },
            "peak_position": peak_position,
            "avg_luminance": avg_luminance,
            "distribution": {
                "shadows": shadows_ratio,
                "midtones": midtones_ratio,
                "highlights": highlights_ratio
            },
            "shape": histogram_shape,
            "histogram_data": {
                "r": [round(v, 2) for v in hist_r_norm],
                "g": [round(v, 2) for v in hist_g_norm],
                "b": [round(v, 2) for v in hist_b_norm],
                "l": [round(v, 2) for v in hist_l_norm]
            }
        }
    
    def _calculate_percentile_color(self, img_rgb: np.ndarray, luminance: np.ndarray, 
                                     percentile: float, is_low: bool) -> Tuple[float, float, float]:
        """
        计算指定百分位的像素的平均颜色
        
        Args:
            img_rgb: RGB 图像
            luminance: 亮度通道
            percentile: 百分位（如 1 表示 1%）
            is_low: True 表示取最暗的，False 表示取最亮的
        """
        flat_luminance = luminance.flatten()
        
        if is_low:
            threshold = np.percentile(flat_luminance, percentile)
            mask = luminance <= threshold
        else:
            threshold = np.percentile(flat_luminance, 100 - percentile)
            mask = luminance >= threshold
        
        # 获取符合条件的像素
        selected_pixels = img_rgb[mask]
        
        if len(selected_pixels) == 0:
            return (0, 0, 0) if is_low else (255, 255, 255)
        
        # 计算平均值
        avg_color = np.mean(selected_pixels, axis=0)
        return tuple(avg_color)
    
    def _classify_histogram_shape(self, avg_luminance: int, shadows_ratio: int, 
                                   highlights_ratio: int, black_point: Tuple) -> str:
        """
        判断直方图形态
        """
        descriptions = []
        
        # 判断整体调性
        if avg_luminance > 150:
            descriptions.append("高调(High-key)")
        elif avg_luminance < 100:
            descriptions.append("低调(Low-key)")
        else:
            descriptions.append("中调(Mid-key)")
        
        # 判断是否有褪色感（黑点是否被提升）
        black_luminance = 0.299 * black_point[0] + 0.587 * black_point[1] + 0.114 * black_point[2]
        if black_luminance > 20:
            descriptions.append(f"有褪色感(黑点提升至{int(black_luminance)})")
        elif black_luminance > 10:
            descriptions.append(f"轻微褪色感(黑点约{int(black_luminance)})")
        else:
            descriptions.append("无褪色感(纯黑保留)")
        
        # 判断对比度
        if shadows_ratio > 30 and highlights_ratio > 20:
            descriptions.append("高对比")
        elif shadows_ratio < 15 and highlights_ratio < 15:
            descriptions.append("低对比")
        else:
            descriptions.append("中等对比")
        
        return "，".join(descriptions)
    
    def _analyze_colors(self, img_rgb: np.ndarray) -> Dict[str, Any]:
        """
        分析图像的整体色彩特征
        """
        # 转换到 HSV 色彩空间
        img_hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)
        
        # 计算平均颜色
        avg_rgb = np.mean(img_rgb, axis=(0, 1))
        avg_hsv = np.mean(img_hsv, axis=(0, 1))
        
        # 计算色温估算（基于 R-B 差值）
        # 正值偏暖，负值偏冷
        rb_diff = float(avg_rgb[0] - avg_rgb[2])
        estimated_temp = self._estimate_color_temperature(avg_rgb)
        
        # 计算主色调
        dominant_colors = self._get_dominant_colors(img_rgb, n_colors=5)
        
        return {
            "average_rgb": {
                "r": int(avg_rgb[0]),
                "g": int(avg_rgb[1]),
                "b": int(avg_rgb[2])
            },
            "average_hsv": {
                "h": int(avg_hsv[0] * 2),  # OpenCV 的 H 范围是 0-180，转换为 0-360
                "s": int(avg_hsv[1] / 255 * 100),  # 转换为百分比
                "v": int(avg_hsv[2] / 255 * 100)
            },
            "color_temperature": {
                "estimated_k": estimated_temp,
                "tendency": "偏暖" if rb_diff > 10 else ("偏冷" if rb_diff < -10 else "中性"),
                "rb_diff": round(rb_diff, 1)
            },
            "dominant_colors": dominant_colors,
            "saturation_level": self._classify_saturation(avg_hsv[1])
        }
    
    def _estimate_color_temperature(self, avg_rgb: np.ndarray) -> int:
        """
        估算色温（改进算法 - 基于 McCamy 公式的简化版本）
        基于 RGB 比例估算，比之前的算法更准确
        """
        r, g, b = avg_rgb
        
        # 归一化 RGB 到 0-1
        r_norm = r / 255.0
        g_norm = g / 255.0
        b_norm = b / 255.0
        
        # 避免除零
        if r_norm < 0.01 or b_norm < 0.01:
            return 5500
        
        # 计算色温（基于 McCamy 公式的简化版本）
        # 使用 xy 色度坐标估算
        # 这是一个更准确的近似算法
        n = (r_norm - g_norm) / (g_norm - b_norm + 0.0001)
        
        # 根据 n 值估算色温
        if n > 0:
            # 偏暖（红多蓝少）
            # 使用经验公式：temp ≈ 5500 + (n - 0.3) * 2000
            temp = 5500 + int((n - 0.3) * 2000)
        else:
            # 偏冷（蓝多红少）
            # 使用经验公式：temp ≈ 5500 - (abs(n) + 0.3) * 1500
            temp = 5500 - int((abs(n) + 0.3) * 1500)
        
        # 限制范围
        return max(3000, min(10000, temp))
    
    def _get_dominant_colors(self, img_rgb: np.ndarray, n_colors: int = 5) -> List[Dict]:
        """
        使用 K-Means 聚类获取主要颜色
        """
        # 缩小图片以加快处理速度
        small_img = cv2.resize(img_rgb, (100, 100))
        pixels = small_img.reshape(-1, 3).astype(np.float32)
        
        # K-Means 聚类
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
        _, labels, centers = cv2.kmeans(pixels, n_colors, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
        
        # 计算每个颜色的占比
        unique, counts = np.unique(labels, return_counts=True)
        total = len(labels)
        
        # 按占比排序
        color_info = []
        for i, (center, count) in enumerate(sorted(zip(centers, counts), key=lambda x: -x[1])):
            rgb = [int(c) for c in center]
            hsv = cv2.cvtColor(np.uint8([[rgb]]), cv2.COLOR_RGB2HSV)[0][0]
            color_info.append({
                "rgb": {"r": rgb[0], "g": rgb[1], "b": rgb[2]},
                "hsv": {"h": int(hsv[0] * 2), "s": int(hsv[1] / 255 * 100), "v": int(hsv[2] / 255 * 100)},
                "percentage": round(count / total * 100, 1)
            })
        
        return color_info
    
    def _classify_saturation(self, avg_saturation: float) -> str:
        """判断饱和度水平"""
        sat_percent = avg_saturation / 255 * 100
        if sat_percent > 50:
            return f"高饱和({int(sat_percent)}%)"
        elif sat_percent > 25:
            return f"中等饱和({int(sat_percent)}%)"
        else:
            return f"低饱和({int(sat_percent)}%)"
    
    def _analyze_zones(self, img_rgb: np.ndarray) -> Dict[str, Any]:
        """
        分析图像的不同区域（天空、植被、阴影等）
        """
        # 转换到 HSV
        img_hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)
        
        # 计算亮度
        luminance = (0.299 * img_rgb[:,:,0] + 0.587 * img_rgb[:,:,1] + 0.114 * img_rgb[:,:,2]).astype(np.uint8)
        
        # 1. 分析高光区域（亮度 > 170）
        highlights_mask = luminance > 170
        highlights_analysis = self._analyze_masked_region(img_rgb, img_hsv, highlights_mask, "高光区域")
        
        # 2. 分析中间调区域（85 <= 亮度 <= 170）
        midtones_mask = (luminance >= 85) & (luminance <= 170)
        midtones_analysis = self._analyze_masked_region(img_rgb, img_hsv, midtones_mask, "中间调区域")
        
        # 3. 分析阴影区域（亮度 < 85）
        shadows_mask = luminance < 85
        shadows_analysis = self._analyze_masked_region(img_rgb, img_hsv, shadows_mask, "阴影区域")
        
        # 4. 尝试检测天空（图像上部 + 蓝色/青色区域）
        sky_analysis = self._detect_sky(img_rgb, img_hsv)
        
        # 5. 尝试检测植被（绿色区域）
        vegetation_analysis = self._detect_vegetation(img_rgb, img_hsv)
        
        return {
            "highlights": highlights_analysis,
            "midtones": midtones_analysis,
            "shadows": shadows_analysis,
            "sky": sky_analysis,
            "vegetation": vegetation_analysis
        }
    
    def _analyze_masked_region(self, img_rgb: np.ndarray, img_hsv: np.ndarray, 
                                mask: np.ndarray, region_name: str) -> Dict[str, Any]:
        """分析遮罩区域的颜色"""
        if np.sum(mask) == 0:
            return {"exists": False, "region": region_name}
        
        # 获取该区域的像素
        pixels_rgb = img_rgb[mask]
        pixels_hsv = img_hsv[mask]
        
        # 计算平均颜色
        avg_rgb = np.mean(pixels_rgb, axis=0)
        avg_hsv = np.mean(pixels_hsv, axis=0)
        
        # 计算该区域占比
        coverage = np.sum(mask) / mask.size * 100
        
        return {
            "exists": True,
            "region": region_name,
            "coverage_percent": round(coverage, 1),
            "avg_rgb": {
                "r": int(avg_rgb[0]),
                "g": int(avg_rgb[1]),
                "b": int(avg_rgb[2])
            },
            "avg_hsv": {
                "h": int(avg_hsv[0] * 2),
                "s": int(avg_hsv[1] / 255 * 100),
                "v": int(avg_hsv[2] / 255 * 100)
            },
            "color_tendency": self._describe_color_tendency(avg_rgb)
        }
    
    def _describe_color_tendency(self, rgb: np.ndarray) -> str:
        """描述颜色倾向"""
        r, g, b = rgb
        
        tendencies = []
        
        # 判断冷暖
        if r > b + 15:
            tendencies.append("偏暖")
        elif b > r + 15:
            tendencies.append("偏冷")
        
        # 判断具体色相
        if g > r and g > b:
            tendencies.append("偏绿")
        elif b > r and b > g:
            tendencies.append("偏蓝")
        elif r > g and r > b:
            tendencies.append("偏红")
        
        # 判断是否偏灰
        max_diff = max(abs(r - g), abs(g - b), abs(r - b))
        if max_diff < 20:
            tendencies.append("偏灰/中性")
        
        return "，".join(tendencies) if tendencies else "中性"
    
    def _detect_sky(self, img_rgb: np.ndarray, img_hsv: np.ndarray) -> Dict[str, Any]:
        """
        检测天空区域（改进：更准确的检测算法）
        策略：
        1. 图像上部 1/3 区域
        2. 蓝色/青色色相（更宽的范围）
        3. 较高亮度（天空通常较亮）
        4. 较低饱和度（天空通常饱和度不高，除非是晚霞）
        5. 排除过暗的区域（可能是建筑或树木）
        """
        h, w = img_rgb.shape[:2]
        
        # 只分析上部 1/3（天空通常在图像上方）
        top_region = img_hsv[:h//3, :, :]
        top_rgb = img_rgb[:h//3, :, :]
        
        # 计算亮度
        top_luminance = (0.299 * top_rgb[:,:,0] + 0.587 * top_rgb[:,:,1] + 0.114 * top_rgb[:,:,2]).astype(np.uint8)
        
        h_channel = top_region[:, :, 0]
        s_channel = top_region[:, :, 1]
        v_channel = top_region[:, :, 2]
        
        # 【改进】更准确的天空检测条件
        # 1. 色相：蓝色/青色范围（OpenCV H: 90-130，对应 180-260°）
        # 2. 饱和度：中等或较低（天空通常饱和度不高，除非是晚霞，但晚霞偏红）
        # 3. 亮度：较高（天空通常较亮，除非是夜晚）
        # 4. 排除过暗的区域（可能是建筑或树木的剪影）
        sky_mask = (
            ((h_channel >= 85) & (h_channel <= 130)) &  # 蓝色/青色色相
            (s_channel >= 15) & (s_channel <= 200) &     # 中等饱和度（允许晚霞等特殊情况）
            (v_channel >= 80) &                          # 较高亮度
            (top_luminance >= 80)                        # 亮度通道也要求较高
        )
        
        # 如果检测到的天空像素太少，尝试放宽条件
        if np.sum(sky_mask) < 100:
            # 放宽条件：只要求蓝色/青色 + 较高亮度
            sky_mask = (
                ((h_channel >= 80) & (h_channel <= 135)) &
                (v_channel >= 70) &
                (top_luminance >= 70)
            )
        
        if np.sum(sky_mask) < 50:  # 天空像素仍然太少
            return {"detected": False, "reason": "未检测到明显天空区域"}
        
        # 分析天空颜色
        sky_pixels_rgb = top_rgb[sky_mask]
        sky_pixels_hsv = top_region[sky_mask]
        
        avg_rgb = np.mean(sky_pixels_rgb, axis=0)
        avg_hsv = np.mean(sky_pixels_hsv, axis=0)
        
        coverage = np.sum(sky_mask) / sky_mask.size * 100
        
        # 判断天空类型
        sky_hue = avg_hsv[0] * 2
        if 180 <= sky_hue <= 220:
            sky_type = "青色"
        elif 220 < sky_hue <= 260:
            sky_type = "蓝色"
        elif 260 < sky_hue <= 300:
            sky_type = "蓝紫色"
        else:
            sky_type = "其他"
        
        return {
            "detected": True,
            "coverage_percent": round(coverage, 1),
            "avg_rgb": {
                "r": int(avg_rgb[0]),
                "g": int(avg_rgb[1]),
                "b": int(avg_rgb[2])
            },
            "avg_hsv": {
                "h": int(sky_hue),
                "s": int(avg_hsv[1] / 255 * 100),
                "v": int(avg_hsv[2] / 255 * 100)
            },
            "sky_type": sky_type,
            "description": f"天空偏{sky_type}，饱和度{int(avg_hsv[1] / 255 * 100)}%，亮度{int(avg_hsv[2] / 255 * 100)}%"
        }
    
    def _detect_vegetation(self, img_rgb: np.ndarray, img_hsv: np.ndarray) -> Dict[str, Any]:
        """
        检测植被区域（改进：更准确的检测算法）
        策略：
        1. 绿色色相（更精确的范围）
        2. 中等或较高饱和度（植被通常有颜色）
        3. 排除过暗或过亮的区域（可能是阴影或高光）
        4. 排除天空区域（避免误检）
        """
        h, w = img_rgb.shape[:2]
        
        # 计算亮度
        luminance = (0.299 * img_rgb[:,:,0] + 0.587 * img_rgb[:,:,1] + 0.114 * img_rgb[:,:,2]).astype(np.uint8)
        
        h_channel = img_hsv[:, :, 0]
        s_channel = img_hsv[:, :, 1]
        v_channel = img_hsv[:, :, 2]
        
        # 【改进】更准确的植被检测条件
        # 1. 色相：绿色范围（OpenCV H: 35-85，对应 70-170°）
        # 2. 饱和度：中等或较高（植被通常有颜色，除非是枯叶）
        # 3. 亮度：中等（排除过暗的阴影和过亮的高光）
        # 4. 排除图像上部（可能是天空）
        vegetation_mask = (
            ((h_channel >= 35) & (h_channel <= 85)) &  # 绿色色相
            (s_channel >= 25) & (s_channel <= 255) &   # 中等或较高饱和度
            (v_channel >= 40) & (v_channel <= 200) &    # 中等亮度（排除过暗和过亮）
            (luminance >= 40) & (luminance <= 200)       # 亮度通道也要求中等
        )
        
        # 排除图像上部 1/4（可能是天空）
        top_exclude_mask = np.ones((h, w), dtype=bool)
        top_exclude_mask[:h//4, :] = False
        vegetation_mask = vegetation_mask & top_exclude_mask
        
        # 如果检测到的植被像素太少，尝试放宽条件
        if np.sum(vegetation_mask) < 100:
            # 放宽条件：只要求绿色色相 + 中等饱和度
            vegetation_mask = (
                ((h_channel >= 30) & (h_channel <= 90)) &
                (s_channel >= 20) &
                (v_channel >= 30) &
                (luminance >= 30)
            ) & top_exclude_mask
        
        if np.sum(vegetation_mask) < 50:
            return {"detected": False, "reason": "未检测到明显植被区域"}
        
        # 分析植被颜色
        veg_pixels_rgb = img_rgb[vegetation_mask]
        veg_pixels_hsv = img_hsv[vegetation_mask]
        
        avg_rgb = np.mean(veg_pixels_rgb, axis=0)
        avg_hsv = np.mean(veg_pixels_hsv, axis=0)
        
        coverage = np.sum(vegetation_mask) / vegetation_mask.size * 100
        
        # 判断植被类型
        veg_hue = avg_hsv[0] * 2
        if 70 <= veg_hue <= 100:
            veg_type = "黄绿色"
        elif 100 < veg_hue <= 130:
            veg_type = "绿色"
        elif 130 < veg_hue <= 150:
            veg_type = "青绿色"
        else:
            veg_type = "其他"
        
        return {
            "detected": True,
            "coverage_percent": round(coverage, 1),
            "avg_rgb": {
                "r": int(avg_rgb[0]),
                "g": int(avg_rgb[1]),
                "b": int(avg_rgb[2])
            },
            "avg_hsv": {
                "h": int(veg_hue),
                "s": int(avg_hsv[1] / 255 * 100),
                "v": int(avg_hsv[2] / 255 * 100)
            },
            "vegetation_type": veg_type,
            "description": f"植被偏{veg_type}，色相{int(veg_hue)}°，饱和度{int(avg_hsv[1] / 255 * 100)}%，亮度{int(avg_hsv[2] / 255 * 100)}%"
        }
    
    def compare_images(self, ref_data: bytes, user_data: bytes) -> Dict[str, Any]:
        """
        对比参考图和用户图，计算调整差值
        
        Args:
            ref_data: 参考图的二进制数据
            user_data: 用户图的二进制数据
            
        Returns:
            包含两图分析结果和调整建议的字典
        """
        # 分析两张图
        ref_analysis = self.analyze_image(ref_data)
        user_analysis = self.analyze_image(user_data)
        
        # 计算差值
        deltas = self._calculate_deltas(ref_analysis, user_analysis)
        
        # 生成调整建议
        recommendations = self._generate_recommendations(deltas, ref_analysis, user_analysis)
        
        # 【新增】计算直方图匹配曲线建议
        matching_curves = self._calculate_histogram_matching_curve(ref_analysis, user_analysis)
        recommendations["matching_curves"] = matching_curves
        
        return {
            "reference": ref_analysis,
            "user": user_analysis,
            "deltas": deltas,
            "recommendations": recommendations
        }
    
    def _calculate_weighted_std(self, histogram: List[float]) -> float:
        """
        计算加权标准差（用于估算对比度）
        
        Args:
            histogram: 256 个亮度级别的直方图数据（已归一化到 0-100）
            
        Returns:
            加权标准差（范围约 0-100）
        """
        if not histogram or len(histogram) != 256:
            return 0.0
        
        # 计算总像素数
        total = sum(histogram)
        if total == 0:
            return 0.0
        
        # 计算加权平均值（亮度中心）
        weighted_sum = sum(i * histogram[i] for i in range(256))
        mean = weighted_sum / total
        
        # 计算加权方差
        variance_sum = sum((i - mean) ** 2 * histogram[i] for i in range(256))
        variance = variance_sum / total
        
        # 标准差
        std = np.sqrt(variance)
        
        return float(std)
    
    def _calculate_deltas(self, ref: Dict, user: Dict) -> Dict[str, Any]:
        """计算两图之间的差值"""
        deltas = {}
        
        # 1. 黑点差值
        ref_black = ref["histogram"]["black_point"]["luminance"]
        user_black = user["histogram"]["black_point"]["luminance"]
        deltas["black_point_lift"] = ref_black - user_black
        
        # 2. 白点差值
        ref_white = ref["histogram"]["white_point"]["luminance"]
        user_white = user["histogram"]["white_point"]["luminance"]
        deltas["white_point_change"] = ref_white - user_white
        
        # 3. 平均亮度差值（用于估算曝光调整）
        ref_avg = ref["histogram"]["avg_luminance"]
        user_avg = user["histogram"]["avg_luminance"]
        deltas["exposure_change"] = round((ref_avg - user_avg) / 25, 2)  # 转换为 EV 近似值
        
        # 4. 色温差值
        ref_temp = ref["colors"]["color_temperature"]["estimated_k"]
        user_temp = user["colors"]["color_temperature"]["estimated_k"]
        deltas["color_temp_change"] = ref_temp - user_temp
        
        # 5. 饱和度差值
        ref_sat = ref["colors"]["average_hsv"]["s"]
        user_sat = user["colors"]["average_hsv"]["s"]
        deltas["saturation_change"] = ref_sat - user_sat
        
        # 6. 对比度估算（改进：使用标准差更准确）
        # 使用直方图的标准差来估算对比度，而不是简单的 highlights - shadows
        # 标准差越大，对比度越高
        ref_hist_l = ref["histogram"]["histogram_data"].get("l", [])
        user_hist_l = user["histogram"]["histogram_data"].get("l", [])
        
        if ref_hist_l and user_hist_l and len(ref_hist_l) == 256 and len(user_hist_l) == 256:
            # 计算加权标准差（考虑每个亮度级别的像素数量）
            ref_std = self._calculate_weighted_std(ref_hist_l)
            user_std = self._calculate_weighted_std(user_hist_l)
            # 转换为对比度差值（标准差差值，范围约 -50 到 +50）
            deltas["contrast_change"] = round((ref_std - user_std) / 2, 1)
        else:
            # 降级方案：使用原来的方法
            ref_contrast = ref["histogram"]["distribution"]["highlights"] - ref["histogram"]["distribution"]["shadows"]
            user_contrast = user["histogram"]["distribution"]["highlights"] - user["histogram"]["distribution"]["shadows"]
            deltas["contrast_change"] = ref_contrast - user_contrast
        
        return deltas
    
    def _generate_recommendations(self, deltas: Dict, ref: Dict, user: Dict) -> Dict[str, Any]:
        """基于差值生成调整建议"""
        recommendations = {
            "exposure": {},
            "contrast": {},
            "color_temperature": {},
            "saturation": {},
            "curve": {},
            "notes": []
        }
        
        # 曝光建议
        exp_change = deltas["exposure_change"]
        if abs(exp_change) > 0.1:
            recommendations["exposure"] = {
                "value": round(exp_change, 2),
                "reason": f"参考图平均亮度{'高' if exp_change > 0 else '低'}于用户图，建议曝光{'+' if exp_change > 0 else ''}{round(exp_change, 2)} EV"
            }
        
        # 对比度建议（改进：更保守，防止过度降低）
        contrast_change = deltas["contrast_change"]
        if abs(contrast_change) > 3:
            # 【修复】如果对比度差值过大（> 15），限制调整幅度，避免过度降低对比度
            if contrast_change < -15:
                limited_change = -15  # 限制最大降低幅度
                recommendations["contrast"] = {
                    "value": limited_change,
                    "reason": f"参考图对比度低于用户图约{abs(contrast_change):.1f}，但为避免过度降低对比度导致画面发闷，建议对比度限制在 {limited_change}（而非完全照搬差值）"
                }
                recommendations["notes"].append(f"⚠️ 重要：参考图对比度较低，但调色时不要过度降低对比度！适度调整即可，保持画面层次感和元素辨识度。")
            elif contrast_change > 15:
                limited_change = 15  # 限制最大增加幅度
                recommendations["contrast"] = {
                    "value": limited_change,
                    "reason": f"参考图对比度高于用户图约{contrast_change:.1f}，建议对比度增加 {limited_change}（适度调整）"
                }
            else:
                recommendations["contrast"] = {
                    "value": int(contrast_change),
                    "reason": f"参考图对比度{'高' if contrast_change > 0 else '低'}于用户图，建议对比度{'+' if contrast_change > 0 else ''}{int(contrast_change)}"
                }
        
        # 色温建议
        temp_change = deltas["color_temp_change"]
        if abs(temp_change) > 200:
            recommendations["color_temperature"] = {
                "value": int(temp_change),
                "reason": f"参考图色温约{ref['colors']['color_temperature']['estimated_k']}K，用户图约{user['colors']['color_temperature']['estimated_k']}K，建议调整{'+' if temp_change > 0 else ''}{int(temp_change)}K"
            }
        
        # 饱和度建议
        sat_change = deltas["saturation_change"]
        if abs(sat_change) > 5:
            recommendations["saturation"] = {
                "value": int(sat_change),
                "reason": f"参考图饱和度{'高' if sat_change > 0 else '低'}于用户图，建议饱和度{'+' if sat_change > 0 else ''}{int(sat_change)}%"
            }
        
        # 曲线建议（基于黑点，但更保守）
        black_lift = deltas["black_point_lift"]
        ref_black_lum = ref["histogram"]["black_point"]["luminance"]
        
        # 【修复】提高阈值，避免过度褪色
        # 只有当黑点提升 > 15 且参考图黑点 < 50 时才建议提升（防止过度褪色）
        if black_lift > 15 and ref_black_lum < 50:
            # 【修复】不要完全照搬参考图黑点，而是适度提升
            # 如果用户图黑点很低（< 10），适度提升到 15-25 即可，不要提升到参考图的完整值
            suggested_y = min(ref_black_lum, max(15, user["histogram"]["black_point"]["luminance"] + 15))
            
            recommendations["curve"] = {
                "black_point_y": int(suggested_y),
                "reason": f"参考图黑点约{ref_black_lum}，有褪色感，但为避免过度褪色，建议曲线起点适度提升至 y={int(suggested_y)}（而非完全照搬参考图的{ref_black_lum}）"
            }
            recommendations["notes"].append(f"⚠️ 重要：参考图有褪色感（黑点提升至{ref_black_lum}），但调色时不要过度应用！适度提升黑点即可，保持画面层次感和元素辨识度。")
        elif black_lift > 10 and ref_black_lum < 40:
            # 中等褪色感，更保守的建议
            suggested_y = min(25, max(10, user["histogram"]["black_point"]["luminance"] + 10))
            recommendations["curve"] = {
                "black_point_y": int(suggested_y),
                "reason": f"参考图有轻微褪色感（黑点约{ref_black_lum}），建议曲线起点适度提升至 y={int(suggested_y)}，保持画面层次"
            }
            recommendations["notes"].append(f"参考图有轻微褪色感，但调色时应保持适度，不要过度提升黑点导致画面发灰。")
        
        # 特殊提醒
        if ref["zones"]["sky"]["detected"] and user["zones"]["sky"]["detected"]:
            ref_sky_sat = ref["zones"]["sky"]["avg_hsv"]["s"]
            user_sky_sat = user["zones"]["sky"]["avg_hsv"]["s"]
            if ref_sky_sat < user_sky_sat - 10:
                recommendations["notes"].append(f"参考图天空饱和度({ref_sky_sat}%)低于用户图({user_sky_sat}%)，建议使用天空蒙版单独降低天空饱和度")
        
        if ref["zones"]["vegetation"]["detected"] and user["zones"]["vegetation"]["detected"]:
            ref_veg_h = ref["zones"]["vegetation"]["avg_hsv"]["h"]
            user_veg_h = user["zones"]["vegetation"]["avg_hsv"]["h"]
            if abs(ref_veg_h - user_veg_h) > 10:
                recommendations["notes"].append(f"参考图植被色相({ref_veg_h}°)与用户图({user_veg_h}°)有差异，建议调整绿色色相偏移{ref_veg_h - user_veg_h}°")
        
        return recommendations
    
    def _advanced_analysis(self, img_rgb: np.ndarray, histogram: Dict[str, Any]) -> Dict[str, Any]:
        """
        高级分析：曲线形态、色彩分级、动态范围等
        
        Args:
            img_rgb: RGB 图像
            histogram: 直方图分析结果
            
        Returns:
            包含高级分析数据的字典
        """
        # 1. 曲线形态分析
        curve_shape = self._analyze_curve_shape(histogram)
        
        # 2. 色彩分级分析（阴影/高光的色相偏移）
        color_grading = self._analyze_color_grading(img_rgb, histogram)
        
        # 3. 动态范围分析
        dynamic_range = self._analyze_dynamic_range(histogram)
        
        # 4. 色彩平衡分析
        color_balance = self._analyze_color_balance(img_rgb)
        
        # 5. 区域直方图对比
        regional_histograms = self._analyze_regional_histograms(img_rgb)
        
        return {
            "curve_shape": curve_shape,
            "color_grading": color_grading,
            "dynamic_range": dynamic_range,
            "color_balance": color_balance,
            "regional_histograms": regional_histograms
        }
    
        # 5. 区域直方图对比
        regional_histograms = self._analyze_regional_histograms(img_rgb)
        
        return {
            "curve_shape": curve_shape,
            "color_grading": color_grading,
            "dynamic_range": dynamic_range,
            "color_balance": color_balance,
            "regional_histograms": regional_histograms
        }
    
    def _calculate_histogram_matching_curve(self, ref: Dict, user: Dict) -> Dict[str, Any]:
        """
        计算直方图匹配曲线（关键算法）
        计算将用户图直方图映射到参考图所需的曲线
        
        Returns:
            包含 rgb, r, g, b 四个通道的建议曲线关键点
        """
        matching_curves = {}
        
        for channel in ['l', 'r', 'g', 'b']:
            ref_hist = ref["histogram"]["histogram_data"].get(channel, [])
            user_hist = user["histogram"]["histogram_data"].get(channel, [])
            
            if not ref_hist or not user_hist or len(ref_hist) != 256 or len(user_hist) != 256:
                matching_curves[channel] = []
                continue
                
            # 1. 计算累积分布函数 (CDF)
            ref_cdf = np.cumsum(ref_hist)
            user_cdf = np.cumsum(user_hist)
            
            # 归一化 CDF
            ref_cdf = ref_cdf / ref_cdf[-1]
            user_cdf = user_cdf / user_cdf[-1]
            
            # 2. 计算匹配映射
            # 对于用户图中的每个灰度级 i，找到 j 使得 ref_cdf[j] 尽可能接近 user_cdf[i]
            # 映射关系：Output(i) = j
            mapping = np.interp(user_cdf, ref_cdf, np.arange(256))
            
            # 3. 采样关键点 (0, 64, 128, 192, 255)
            key_points = []
            # 确保起点和终点合理
            # 起点：黑点
            black_in = 0
            black_out = int(mapping[0])
            key_points.append({"x": 0, "y": black_out})
            
            # 中间点
            for x in [64, 128, 192]:
                y = int(mapping[x])
                key_points.append({"x": x, "y": y})
                
            # 终点：白点
            white_in = 255
            white_out = int(mapping[255])
            key_points.append({"x": 255, "y": white_out})
            
            matching_curves[channel] = key_points
            
        return matching_curves

    def _analyze_curve_shape(self, histogram: Dict[str, Any]) -> Dict[str, Any]:
        """
        分析曲线形态（S型、直线型、提升型等）
        """
        black_lum = histogram["black_point"]["luminance"]
        white_lum = histogram["white_point"]["luminance"]
        avg_lum = histogram["avg_luminance"]
        peak_pos = histogram["peak_position"]
        
        # 判断曲线形态
        shape_type = "直线型"
        description = "曲线接近直线，对比度正常"
        
        # 黑点提升判断
        if black_lum > 20:
            shape_type = "提升型"
            description = f"曲线起点提升（黑点提升至{black_lum}），有明显褪色感"
        elif black_lum > 10:
            shape_type = "轻微提升型"
            description = f"曲线起点轻微提升（黑点约{black_lum}），有轻微褪色感"
        
        # S型判断（峰值位置和平均亮度差异）
        if peak_pos > avg_lum + 20:
            # 峰值偏右，可能是高调
            if shape_type == "直线型":
                shape_type = "高调型"
                description = "曲线整体偏右，高调明快"
        elif peak_pos < avg_lum - 20:
            # 峰值偏左，可能是低调
            if shape_type == "直线型":
                shape_type = "低调型"
                description = "曲线整体偏左，低调压抑"
        
        # 对比度判断（基于分布）
        dist = histogram["distribution"]
        contrast_ratio = (dist["highlights"] - dist["shadows"]) / 100.0
        
        if abs(contrast_ratio) > 0.2:
            if contrast_ratio > 0:
                description += "，高对比"
            else:
                description += "，低对比"
        
        return {
            "type": shape_type,
            "description": description,
            "black_lift": black_lum,
            "white_compression": 255 - white_lum,
            "contrast_ratio": round(contrast_ratio, 2)
        }
    
    def _analyze_color_grading(self, img_rgb: np.ndarray, histogram: Dict[str, Any]) -> Dict[str, Any]:
        """
        分析色彩分级（阴影/高光的色相偏移）
        """
        # 转换到 HSV
        img_hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)
        
        # 计算亮度
        luminance = (0.299 * img_rgb[:,:,0] + 0.587 * img_rgb[:,:,1] + 0.114 * img_rgb[:,:,2]).astype(np.uint8)
        
        # 阴影区域（亮度 < 85）
        shadows_mask = luminance < 85
        shadows_hsv = img_hsv[shadows_mask] if np.sum(shadows_mask) > 0 else None
        
        # 高光区域（亮度 > 170）
        highlights_mask = luminance > 170
        highlights_hsv = img_hsv[highlights_mask] if np.sum(highlights_mask) > 0 else None
        
        result = {
            "shadows": {},
            "highlights": {},
            "midtones": {}
        }
        
        if shadows_hsv is not None and len(shadows_hsv) > 0:
            avg_shadow_hsv = np.mean(shadows_hsv, axis=0)
            result["shadows"] = {
                "hue": int(avg_shadow_hsv[0] * 2),  # 转换为 0-360
                "saturation": int(avg_shadow_hsv[1] / 255 * 100),
                "tendency": self._describe_hue_tendency(avg_shadow_hsv[0] * 2)
            }
        
        if highlights_hsv is not None and len(highlights_hsv) > 0:
            avg_highlight_hsv = np.mean(highlights_hsv, axis=0)
            result["highlights"] = {
                "hue": int(avg_highlight_hsv[0] * 2),
                "saturation": int(avg_highlight_hsv[1] / 255 * 100),
                "tendency": self._describe_hue_tendency(avg_highlight_hsv[0] * 2)
            }
        
        # 中间调区域（85 <= 亮度 <= 170）
        midtones_mask = (luminance >= 85) & (luminance <= 170)
        midtones_hsv = img_hsv[midtones_mask] if np.sum(midtones_mask) > 0 else None
        
        if midtones_hsv is not None and len(midtones_hsv) > 0:
            avg_midtone_hsv = np.mean(midtones_hsv, axis=0)
            result["midtones"] = {
                "hue": int(avg_midtone_hsv[0] * 2),
                "saturation": int(avg_midtone_hsv[1] / 255 * 100),
                "tendency": self._describe_hue_tendency(avg_midtone_hsv[0] * 2)
            }
        
        return result
    
    def _describe_hue_tendency(self, hue: float) -> str:
        """描述色相倾向"""
        if 0 <= hue < 30 or hue >= 330:
            return "偏红"
        elif 30 <= hue < 60:
            return "偏橙"
        elif 60 <= hue < 90:
            return "偏黄"
        elif 90 <= hue < 150:
            return "偏绿"
        elif 150 <= hue < 210:
            return "偏青"
        elif 210 <= hue < 270:
            return "偏蓝"
        elif 270 <= hue < 330:
            return "偏紫"
        else:
            return "中性"
    
    def _analyze_dynamic_range(self, histogram: Dict[str, Any]) -> Dict[str, Any]:
        """
        分析动态范围（最暗到最亮的范围）
        """
        black_lum = histogram["black_point"]["luminance"]
        white_lum = histogram["white_point"]["luminance"]
        
        # 计算有效动态范围
        effective_range = white_lum - black_lum
        
        # 判断动态范围
        if effective_range > 200:
            range_level = "高动态范围"
        elif effective_range > 150:
            range_level = "中等动态范围"
        else:
            range_level = "低动态范围"
        
        return {
            "effective_range": int(effective_range),
            "level": range_level,
            "black_point": black_lum,
            "white_point": white_lum,
            "description": f"动态范围 {effective_range:.0f}，{range_level}"
        }
    
    def _analyze_color_balance(self, img_rgb: np.ndarray) -> Dict[str, Any]:
        """
        分析色彩平衡（整体色偏）
        """
        # 计算各通道的平均值
        avg_r = np.mean(img_rgb[:,:,0])
        avg_g = np.mean(img_rgb[:,:,1])
        avg_b = np.mean(img_rgb[:,:,2])
        
        # 计算色偏
        rg_diff = avg_r - avg_g
        gb_diff = avg_g - avg_b
        rb_diff = avg_r - avg_b
        
        # 判断色偏方向
        bias = "中性"
        if abs(rb_diff) > 15:
            if rb_diff > 0:
                bias = "偏暖（红多蓝少）"
            else:
                bias = "偏冷（蓝多红少）"
        elif abs(rg_diff) > 10:
            if rg_diff > 0:
                bias = "偏红"
            else:
                bias = "偏绿"
        elif abs(gb_diff) > 10:
            if gb_diff > 0:
                bias = "偏青"
            else:
                bias = "偏蓝"
        
        return {
            "rg_diff": round(rg_diff, 1),
            "gb_diff": round(gb_diff, 1),
            "rb_diff": round(rb_diff, 1),
            "bias": bias,
            "description": f"整体色彩平衡：{bias}"
        }
    
    def _analyze_regional_histograms(self, img_rgb: np.ndarray) -> Dict[str, Any]:
        """
        分析不同区域的直方图（上中下、左中右）
        """
        h, w = img_rgb.shape[:2]
        
        # 计算亮度
        luminance = (0.299 * img_rgb[:,:,0] + 0.587 * img_rgb[:,:,1] + 0.114 * img_rgb[:,:,2]).astype(np.uint8)
        
        # 上中下区域
        top_region = luminance[:h//3, :]
        mid_region = luminance[h//3:2*h//3, :]
        bottom_region = luminance[2*h//3:, :]
        
        # 左中右区域
        left_region = luminance[:, :w//3]
        center_region = luminance[:, w//3:2*w//3]
        right_region = luminance[:, 2*w//3:]
        
        def calc_region_stats(region):
            if region.size == 0:
                return {"avg": 0, "std": 0}
            return {
                "avg": int(np.mean(region)),
                "std": int(np.std(region))
            }
        
        return {
            "vertical": {
                "top": calc_region_stats(top_region),
                "middle": calc_region_stats(mid_region),
                "bottom": calc_region_stats(bottom_region)
            },
            "horizontal": {
                "left": calc_region_stats(left_region),
                "center": calc_region_stats(center_region),
                "right": calc_region_stats(right_region)
            },
            "description": "区域亮度分布分析，用于判断光照方向和画面平衡"
        }
    
    def _get_empty_analysis(self) -> Dict[str, Any]:
        """返回空的分析结果"""
        return {
            "histogram": {
                "black_point": {"r": 0, "g": 0, "b": 0, "luminance": 0},
                "white_point": {"r": 255, "g": 255, "b": 255, "luminance": 255},
                "peak_position": 128,
                "avg_luminance": 128,
                "distribution": {"shadows": 33, "midtones": 34, "highlights": 33},
                "shape": "无法分析",
                "histogram_data": {"r": [], "g": [], "b": [], "l": []}
            },
            "colors": {
                "average_rgb": {"r": 128, "g": 128, "b": 128},
                "average_hsv": {"h": 0, "s": 0, "v": 50},
                "color_temperature": {"estimated_k": 5500, "tendency": "中性", "rb_diff": 0},
                "dominant_colors": [],
                "saturation_level": "无法分析"
            },
            "zones": {
                "highlights": {"exists": False},
                "midtones": {"exists": False},
                "shadows": {"exists": False},
                "sky": {"detected": False},
                "vegetation": {"detected": False}
            },
            "image_info": {"width": 0, "height": 0, "aspect_ratio": 0},
            "advanced": {
                "curve_shape": {"type": "未知", "description": "无法分析"},
                "color_grading": {"shadows": {}, "highlights": {}, "midtones": {}},
                "dynamic_range": {"effective_range": 0, "level": "未知"},
                "color_balance": {"bias": "未知"},
                "regional_histograms": {}
            }
        }


# 创建全局实例
image_analyzer = ImageAnalyzer()


def analyze_image(image_data: bytes) -> Dict[str, Any]:
    """分析单张图片"""
    return image_analyzer.analyze_image(image_data)


def compare_images(ref_data: bytes, user_data: bytes) -> Dict[str, Any]:
    """对比两张图片"""
    return image_analyzer.compare_images(ref_data, user_data)

