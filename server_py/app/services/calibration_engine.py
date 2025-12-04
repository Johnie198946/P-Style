"""
仿色校准引擎 - 基于统计矩匹配的 Lightroom 参数校准
根据《仿色校准算法.md》实现

核心功能：
1. VirtualLREngine：模拟 Lightroom 的图像处理逻辑
2. CalibrationEngine：使用优化算法校准 Gemini 输出的参数

设计原则：
- Gemini 负责"理解图片"和"定性"（如暖色调还是冷色调）
- Python 算法负责"定量"和"闭环验证"
- 使用 256px 下采样 + 统计矩匹配，控制处理时间在 500ms - 1s 级别
"""
import numpy as np
import cv2
import base64
from typing import Dict, Any, Optional, Tuple
from loguru import logger
from scipy.optimize import minimize


class VirtualLREngine:
    """
    虚拟 Lightroom 引擎
    模拟 Lightroom 的核心图像处理算法，用于校准循环中的参数验证
    
    特点：
    1. 基于 Gamma 解压缩 -> 线性处理 -> Gamma 压缩 的流程
    2. 白平衡使用 RGB 通道增益模拟（接近 LR 物理算法）
    3. 对比度使用 S 型曲线
    """
    
    @staticmethod
    def apply(image: np.ndarray, params: Dict[str, Any]) -> np.ndarray:
        """
        应用 Lightroom 参数到图片
        
        Args:
            image: 归一化的图片 (0-1 float, RGB 顺序)
            params: 参数字典，包含：
                - 基础参数：
                    - exposure: 曝光 (range: -5.0 to +5.0)
                    - temp: 色温 (range: -100 to +100)
                    - tint: 色调 (range: -100 to +100)
                    - contrast: 对比度 (range: -100 to +100)
                    - saturation: 饱和度 (range: -100 to +100)
                    - highlights: 高光 (range: -100 to +100)
                    - shadows: 阴影 (range: -100 to +100)
                    - whites: 白色 (range: -100 to +100)
                    - blacks: 黑色 (range: -100 to +100)
                - 色调曲线：
                    - tone_curve: RGB 曲线控制点列表 [[x1,y1], [x2,y2], ...]
                - HSL 调整：
                    - hsl: 字典，键为颜色名（red, orange, yellow, green, aqua, blue, purple, magenta），值为 {"hue": int, "saturation": int, "luminance": int}
                - 色彩分级：
                    - color_grading: 字典，包含 highlights/midtones/shadows 的 hue/saturation/luminance
                - 相机校准：
                    - calibration: 字典，包含 red_primary/green_primary/blue_primary 的 hue/saturation
        
        Returns:
            处理后的图片 (0-1 float, RGB 顺序)
        """
        # 拷贝避免修改原图
        img = image.copy().astype(np.float64)
        
        # 参数解包（使用默认值 0）
        exposure = params.get('exposure', 0)        # range: -5.0 to +5.0
        temp = params.get('temp', 0)                # range: -100 to +100
        tint = params.get('tint', 0)                # range: -100 to +100
        contrast = params.get('contrast', 0)        # range: -100 to +100
        saturation = params.get('saturation', 0)    # range: -100 to +100
        highlights = params.get('highlights', 0)    # range: -100 to +100
        shadows = params.get('shadows', 0)          # range: -100 to +100
        whites = params.get('whites', 0)            # range: -100 to +100
        blacks = params.get('blacks', 0)            # range: -100 to +100
        
        # ------------------------------------------------
        # 1. 线性化 (Linearize) - 模拟 RAW 处理环境
        # ------------------------------------------------
        # 简单近似：Gamma 2.2 解码
        img = np.power(np.clip(img, 1e-10, 1.0), 2.2)
        
        # ------------------------------------------------
        # 2. 白平衡 (White Balance) - 核心难点
        # ------------------------------------------------
        # LR 的色温是基于开尔文温标的，但在 JPG 模式下，
        # 我们使用通道增益来模拟。
        # Temp (Blue-Yellow): 暖色加红减蓝，冷色加蓝减红
        # Tint (Green-Magenta): 绿色加绿，品红加红蓝
        
        # 归一化系数 (根据经验微调灵敏度)
        t_val = temp / 100.0 * 0.4  # 限制幅度，防止过曝
        tn_val = tint / 100.0 * 0.4
        
        # 构建 RGB 增益矩阵 (r, g, b)
        # Temp: +warm => r++, b--
        # Tint: +magenta => g--, r++/b++
        r_gain = 1.0 + t_val + tn_val
        g_gain = 1.0 - tn_val
        b_gain = 1.0 - t_val + tn_val
        
        img[:, :, 0] *= r_gain  # R
        img[:, :, 1] *= g_gain  # G
        img[:, :, 2] *= b_gain  # B
        
        # ------------------------------------------------
        # 3. 曝光 (Exposure)
        # ------------------------------------------------
        # 摄影学公式：2的EV次方
        img = img * (2 ** exposure)
        
        # ------------------------------------------------
        # 4. 高光/阴影/白色/黑色调整
        # ------------------------------------------------
        # 这些参数影响特定亮度范围
        if highlights != 0 or shadows != 0 or whites != 0 or blacks != 0:
            # 计算亮度通道
            luminance = 0.2126 * img[:, :, 0] + 0.7152 * img[:, :, 1] + 0.0722 * img[:, :, 2]
            luminance = np.clip(luminance, 0, 1)
            
            # 【升级】高光调整（Highlights）- 使用 Gamma 压制高光区域
            # 核心原理：只对亮部进行 Gamma 变大（压暗），防止高光溢出
            # highlights 范围通常是 [-100, 0]，只允许压高光，不允许提亮高光
            if highlights < 0:
                # 构建一个高光掩膜，只对亮部（luminance > 0.5）进行压暗
                highlight_mask = np.clip((luminance - 0.5) * 2, 0, 1)  # 只影响 0.5 以上亮度的区域
                # 模拟压暗系数：highlights = -100 时，factor 最大
                factor = 1.0 - (abs(highlights) / 200.0) * highlight_mask  # 模拟压暗系数
                img = img * factor[:, :, np.newaxis]
                img = np.clip(img, 0, 1)
            
            # 阴影调整（影响亮度 < 0.5 的区域）
            if shadows != 0:
                shadow_mask = np.clip((0.5 - luminance) * 2, 0, 1)
                shadow_factor = 1.0 + (shadows / 100.0) * 0.5
                for c in range(3):
                    img[:, :, c] = img[:, :, c] * (1 + shadow_mask * (shadow_factor - 1))
            
            # 白色调整（影响最亮区域）
            if whites != 0:
                whites_mask = np.clip((luminance - 0.75) * 4, 0, 1)
                whites_factor = 1.0 + (whites / 100.0) * 0.3
                for c in range(3):
                    img[:, :, c] = img[:, :, c] * (1 + whites_mask * (whites_factor - 1))
            
            # 【升级】黑色调整（Blacks）- 使用线性拉伸模拟 LR 的黑位调整
            # 核心原理：将 [blacks, 1.0] 映射回 [0.0, 1.0]
            # blacks < 0 表示加深黑色（切掉暗部，增加通透感），blacks > 0 表示提升黑色（褪色感）
            if blacks != 0:
                # 将 blacks 从 [-100, 100] 范围转换为 [-0.2, 0.2] 的归一化值
                blacks_normalized = (blacks / 100.0) * 0.2
                # 线性拉伸：将 [blacks_normalized, 1.0] 映射回 [0.0, 1.0]
                # 如果 blacks_normalized < 0，则暗部会被切掉（变纯黑），增加通透感
                if blacks_normalized < 1.0:
                    img = (img - blacks_normalized) / (1.0 - blacks_normalized)
                    img = np.clip(img, 0, 1)
        
        # ------------------------------------------------
        # 5. 对比度 (Contrast) - S型曲线
        # ------------------------------------------------
        # 先转回 Gamma 空间处理对比度
        img = np.power(np.clip(img, 0, 1), 1/2.2)
        
        if contrast != 0:
            # 使用经典的 S-Curve 公式
            # factor 计算：contrast 0 -> 1, contrast 100 -> 3 (增强强度)
            f = (contrast + 100.0) / 100.0
            f = f ** 2  # 增加敏感度
            
            # 以 0.5 为中心拉伸
            img = (img - 0.5) * f + 0.5
        
        # ------------------------------------------------
        # 6. 饱和度 (Saturation)
        # ------------------------------------------------
        if saturation != 0:
            # 转 HSV 调整 S 通道
            # 注意：OpenCV 的 RGB2HSV 在 float 下 H是0-360, S,V是0-1
            img_clipped = np.clip(img, 0, 1).astype(np.float32)
            hsv = cv2.cvtColor(img_clipped, cv2.COLOR_RGB2HSV)
            sat_mult = 1.0 + (saturation / 100.0)
            hsv[:, :, 1] = np.clip(hsv[:, :, 1] * sat_mult, 0, 1)
            img = cv2.cvtColor(hsv, cv2.COLOR_HSV2RGB)
        
        # ------------------------------------------------
        # 7. 色调曲线 (Tone Curve) - 在 Gamma 空间应用
        # ------------------------------------------------
        tone_curve = params.get('tone_curve')
        if tone_curve and isinstance(tone_curve, list) and len(tone_curve) > 0:
            # tone_curve 格式：[[x1, y1], [x2, y2], ...]，x 和 y 范围 0-255
            # 转换为 0-1 范围
            points = np.array(tone_curve, dtype=np.float32) / 255.0
            # 使用线性插值构建查找表
            x_vals = np.linspace(0, 1, 256)
            y_vals = np.interp(x_vals, points[:, 0], points[:, 1])
            # 应用曲线
            img_uint8 = (np.clip(img, 0, 1) * 255).astype(np.uint8)
            for c in range(3):
                img_uint8[:, :, c] = y_vals[img_uint8[:, :, c]].astype(np.uint8)
            img = img_uint8.astype(np.float32) / 255.0
        
        # ------------------------------------------------
        # 8. HSL 调整 (HSL Adjustments) - 在 HSV 空间应用
        # ------------------------------------------------
        hsl = params.get('hsl')
        if hsl and isinstance(hsl, dict):
            img_clipped = np.clip(img, 0, 1).astype(np.float32)
            hsv = cv2.cvtColor(img_clipped, cv2.COLOR_RGB2HSV)
            
            # 颜色映射：前端颜色名 -> HSV 色相范围
            color_ranges = {
                'red': (0, 15),      # 0-15 和 345-360
                'orange': (15, 30),
                'yellow': (30, 60),
                'green': (60, 150),
                'aqua': (150, 210),
                'blue': (210, 270),
                'purple': (270, 300),
                'magenta': (300, 345),
            }
            
            for color_name, (h_min, h_max) in color_ranges.items():
                if color_name in hsl:
                    adj = hsl[color_name]
                    if isinstance(adj, dict):
                        h_shift = adj.get('hue', 0)  # 色相偏移（-180 到 +180）
                        s_adj = adj.get('saturation', 0)  # 饱和度调整（-100 到 +100）
                        l_adj = adj.get('luminance', 0)  # 明度调整（-100 到 +100）
                        
                        # 创建颜色遮罩
                        h_channel = hsv[:, :, 0]
                        if h_min < h_max:
                            mask = (h_channel >= h_min) & (h_channel < h_max)
                        else:  # red 跨越 0 度
                            mask = (h_channel >= h_min) | (h_channel < h_max)
                        
                        # 应用色相偏移
                        if h_shift != 0:
                            hsv[mask, 0] = (hsv[mask, 0] + h_shift) % 360
                        
                        # 应用饱和度调整
                        if s_adj != 0:
                            s_mult = 1.0 + (s_adj / 100.0)
                            hsv[mask, 1] = np.clip(hsv[mask, 1] * s_mult, 0, 1)
                        
                        # 应用明度调整（通过 V 通道）
                        if l_adj != 0:
                            v_mult = 1.0 + (l_adj / 100.0)
                            hsv[mask, 2] = np.clip(hsv[mask, 2] * v_mult, 0, 1)
            
            img = cv2.cvtColor(hsv, cv2.COLOR_HSV2RGB)
        
        # ------------------------------------------------
        # 9. 色彩分级 (Color Grading) - 在 LAB 空间应用
        # ------------------------------------------------
        color_grading = params.get('color_grading')
        if color_grading and isinstance(color_grading, dict):
            # 转 LAB 空间
            img_uint8 = (np.clip(img, 0, 1) * 255).astype(np.uint8)
            lab = cv2.cvtColor(img_uint8, cv2.COLOR_RGB2LAB).astype(np.float32)
            
            # 计算亮度通道用于区域遮罩
            l_channel = lab[:, :, 0] / 255.0  # 归一化到 0-1
            
            # 高光区域（L > 0.7）
            if 'highlights' in color_grading:
                h_adj = color_grading['highlights']
                if isinstance(h_adj, dict):
                    h_mask = np.clip((l_channel - 0.7) / 0.3, 0, 1)
                    h_hue = h_adj.get('hue', 0)
                    h_sat = h_adj.get('saturation', 0)
                    # 在 LAB 空间调整 A/B 通道（色相和饱和度）
                    # 【修复】移除 np.newaxis，因为 h_mask 和 lab[:, :, 1] 都是 2D 数组
                    if h_hue != 0 or h_sat != 0:
                        angle = np.radians(h_hue)
                        a_shift = np.cos(angle) * h_sat * 2.0
                        b_shift = np.sin(angle) * h_sat * 2.0
                        lab[:, :, 1] += h_mask * a_shift
                        lab[:, :, 2] += h_mask * b_shift
            
            # 中间调区域（0.3 < L < 0.7）
            if 'midtones' in color_grading:
                m_adj = color_grading['midtones']
                if isinstance(m_adj, dict):
                    m_mask = np.clip(np.minimum((l_channel - 0.3) / 0.4, (0.7 - l_channel) / 0.4), 0, 1)
                    m_hue = m_adj.get('hue', 0)
                    m_sat = m_adj.get('saturation', 0)
                    # 【修复】移除 np.newaxis，因为 m_mask 和 lab[:, :, 1] 都是 2D 数组
                    if m_hue != 0 or m_sat != 0:
                        angle = np.radians(m_hue)
                        a_shift = np.cos(angle) * m_sat * 2.0
                        b_shift = np.sin(angle) * m_sat * 2.0
                        lab[:, :, 1] += m_mask * a_shift
                        lab[:, :, 2] += m_mask * b_shift
            
            # 阴影区域（L < 0.3）
            if 'shadows' in color_grading:
                s_adj = color_grading['shadows']
                if isinstance(s_adj, dict):
                    s_mask = np.clip((0.3 - l_channel) / 0.3, 0, 1)
                    s_hue = s_adj.get('hue', 0)
                    s_sat = s_adj.get('saturation', 0)
                    # 【修复】移除 np.newaxis，因为 s_mask 和 lab[:, :, 1] 都是 2D 数组
                    if s_hue != 0 or s_sat != 0:
                        angle = np.radians(s_hue)
                        a_shift = np.cos(angle) * s_sat * 2.0
                        b_shift = np.sin(angle) * s_sat * 2.0
                        lab[:, :, 1] += s_mask * a_shift
                        lab[:, :, 2] += s_mask * b_shift
            
            # 转回 RGB
            lab = np.clip(lab, 0, 255).astype(np.uint8)
            img = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB).astype(np.float32) / 255.0
        
        # ------------------------------------------------
        # 10. 相机校准 (Calibration) - 在原色空间应用
        # ------------------------------------------------
        calibration = params.get('calibration')
        if calibration and isinstance(calibration, dict):
            # 相机校准影响原色，在 RGB 空间直接调整
            # 简化实现：通过 RGB 通道增益模拟
            red_primary = calibration.get('red_primary', {})
            green_primary = calibration.get('green_primary', {})
            blue_primary = calibration.get('blue_primary', {})
            
            if isinstance(red_primary, dict):
                r_hue = red_primary.get('hue', 0)  # 色相偏移
                r_sat = red_primary.get('saturation', 0)  # 饱和度调整
                # 简化：通过 R 通道增益和 G/B 通道微调模拟
                r_gain = 1.0 + (r_sat / 100.0) * 0.1
                img[:, :, 0] *= r_gain
            
            if isinstance(green_primary, dict):
                g_hue = green_primary.get('hue', 0)
                g_sat = green_primary.get('saturation', 0)
                g_gain = 1.0 + (g_sat / 100.0) * 0.1
                img[:, :, 1] *= g_gain
            
            if isinstance(blue_primary, dict):
                b_hue = blue_primary.get('hue', 0)
                b_sat = blue_primary.get('saturation', 0)
                b_gain = 1.0 + (b_sat / 100.0) * 0.1
                img[:, :, 2] *= b_gain
        
        # ------------------------------------------------
        # 11. 收尾
        # ------------------------------------------------
        return np.clip(img, 0, 1)


class CalibrationEngine:
    """
    校准引擎
    使用统计矩匹配方法校准 Gemini 输出的 Lightroom 参数
    
    核心原理：
    1. 计算参考图的色彩统计特征（均值、标准差）
    2. 使用优化算法找到最佳参数，使用户图处理后的统计特征接近参考图
    """
    
    def __init__(self, target_size: Tuple[int, int] = (256, 256)):
        """
        初始化校准引擎
        
        Args:
            target_size: 下采样目标尺寸（用于加速计算）
        """
        self.target_size = target_size
        self.virtual_lr = VirtualLREngine()
    
    def _decode_image(self, image_data: str) -> Optional[np.ndarray]:
        """
        解码 Base64 图片数据
        
        Args:
            image_data: Base64 编码的图片数据（可能带有 data URL 前缀）
        
        Returns:
            解码后的图片 (0-1 float, RGB 顺序)，失败返回 None
        """
        try:
            # 移除 data URL 前缀
            if "," in image_data:
                image_data = image_data.split(",")[-1]
            
            # Base64 解码
            image_bytes = base64.b64decode(image_data)
            
            # 转换为 numpy 数组
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                logger.error("【校准引擎】图片解码失败：cv2.imdecode 返回 None")
                return None
            
            # BGR -> RGB
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # Resize 到目标尺寸（加速计算）
            img = cv2.resize(img, self.target_size)
            
            # 归一化到 0-1
            img = img.astype(np.float64) / 255.0
            
            return img
        except Exception as e:
            logger.error(f"【校准引擎】图片解码异常: {type(e).__name__}: {str(e)}")
            return None
    
    def _get_image_stats(self, image_lab: np.ndarray) -> Dict[str, float]:
        """
        【升级】计算图像 Lab 三通道的统计特征（百分位锚定 + 均值/标准差）
        
        核心改进：引入百分位值（L_p1, L_p99）来解决"发灰"问题
        - L_p1: 最暗点，决定黑位是否扎实
        - L_p99: 最亮点，决定高光是否过曝
        
        Args:
            image_lab: LAB 空间的图像 (float)
        
        Returns:
            包含以下字段的字典：
            - l_p1, l_p99: L通道的1%和99%分位值（动态范围锚定）
            - l_std: L通道标准差（对比度）
            - a_mean, b_mean: 色度均值（色温色调）
            - a_std, b_std: 色度标准差（色彩丰富度）
        """
        # 展平
        l = image_lab[:, :, 0].flatten()
        a = image_lab[:, :, 1].flatten()
        b = image_lab[:, :, 2].flatten()
        
        # 【新增】百分位值（解决"发灰"问题的关键）
        l_p1 = np.percentile(l, 1)
        l_p99 = np.percentile(l, 99)
        
        # 统计量
        stats = {
            'l_p1': float(l_p1),
            'l_p99': float(l_p99),
            'l_std': float(np.std(l)),
            'a_mean': float(np.mean(a)),
            'a_std': float(np.std(a)),
            'b_mean': float(np.mean(b)),
            'b_std': float(np.std(b)),
        }
        
        return stats
    
    def _calculate_loss(
        self, 
        simulated_img: np.ndarray, 
        ref_stats: Dict[str, float],
        current_params: Optional[np.ndarray] = None,
        original_params: Optional[np.ndarray] = None,
        param_weights: Optional[np.ndarray] = None
    ) -> float:
        """
        【升级】计算模拟图与参考图的色彩差距（百分位锚定 Loss + 正则化惩罚）
        
        核心改进：从"让两张图的平均颜色一样"，转变为"让用户图的最暗点和最亮点去对齐参考图"
        这一改动能解决 80% 的"数码味"和"发灰"问题。
        
        Args:
            simulated_img: 当前参数渲染出的 RGB 图 (0-1 float)
            ref_stats: 参考图的统计特征字典（包含 l_p1, l_p99, l_std, a_mean, a_std, b_mean, b_std）
            current_params: 当前优化参数向量（用于正则化）
            original_params: Gemini 原始参数向量（用于正则化）
            param_weights: 正则化权重向量（用于正则化）
        
        Returns:
            损失值（越小越好）
        """
        # RGB -> LAB（必须在 LAB 空间计算差距，才符合人眼感知）
        sim_uint8 = (np.clip(simulated_img, 0, 1) * 255).astype(np.uint8)
        sim_lab = cv2.cvtColor(sim_uint8, cv2.COLOR_RGB2LAB).astype(np.float64)
        
        # 计算当前统计量
        sim_stats = self._get_image_stats(sim_lab)
        
        # 1. 动态范围锚定（最重要！权重 x10）- 解决"没有黑位"的问题
        # 强制用户图的最暗点去贴合参考图的最暗点
        loss_range = (sim_stats['l_p1'] - ref_stats['l_p1'])**2 * 10.0 + \
                     (sim_stats['l_p99'] - ref_stats['l_p99'])**2 * 5.0
        
        # 2. 对比度匹配（权重 x1）
        loss_contrast = (sim_stats['l_std'] - ref_stats['l_std'])**2
        
        # 3. 色彩匹配（权重降低，防止过饱和）
        # 相比均值，我们更看重标准差（色彩分布的宽窄），这能避免把白墙染成绿色
        loss_color_mean = (sim_stats['a_mean'] - ref_stats['a_mean'])**2 * 0.5 + \
                          (sim_stats['b_mean'] - ref_stats['b_mean'])**2 * 0.5
        
        loss_color_std = (sim_stats['a_std'] - ref_stats['a_std'])**2 * 1.0 + \
                         (sim_stats['b_std'] - ref_stats['b_std'])**2 * 1.0
        # -------------------------------------------------------------------------
        # 3. 混合 Loss：图像差异 + 正则化惩罚（橡皮筋机制）
        # -------------------------------------------------------------------------
        # Loss = Loss_Image + lambda * || current_params - gemini_params ||^2
        # 这确保了参数在优化过程中不会大幅偏离 Gemini 的原始意图（创作意图）
        
        reg_loss = 0.0
        if current_params is not None and original_params is not None and param_weights is not None:
            # 计算正则化损失
            # param_weights 是一个数组，对应每个参数的惩罚权重
            # HSL 等创作参数权重极高（10000.0），Basic 等物理参数权重较低（10.0-50.0）
            diff = (current_params - original_params) ** 2
            reg_loss = np.sum(diff * param_weights)
            
            # 【关键修复】大幅增加正则化权重，确保 HSL 参数几乎不动
            # Image Loss 通常在 1000-100000 量级
            # 对于 HSL 参数（权重 10000.0），即使只调整 1，正则化损失也会是 10000 * 1^2 * 50000 = 500000000
            # 这足以压倒任何图像损失，确保 HSL 参数几乎不动
            # 从 5000.0 增加到 50000.0，极强地拉住参数
            reg_loss *= 50000.0  # 【关键修复】极大幅度增加权重，确保 HSL 参数几乎不动
            
        image_loss = loss_range + loss_contrast + loss_color_mean + loss_color_std
        total_loss = image_loss + reg_loss
        
        # 【修复】记录详细 Loss 用于调试（每次迭代都记录，帮助诊断问题）
        # 这样可以清楚地看到图像损失和正则化损失的贡献
        if current_params is not None and original_params is not None:
            max_param_diff = np.max(np.abs(current_params - original_params))
            logger.debug(f"【Loss 分解】图像损失={image_loss:.1f}, 正则化损失={reg_loss:.1f}, 总损失={total_loss:.1f}, 最大参数偏差={max_param_diff:.2f}")
        
        return total_loss

    def _get_dynamic_bounds(self, x0: np.ndarray, metadata: Dict[str, Any]) -> Tuple[List[Tuple[float, float]], np.ndarray]:
        """
        生成动态边界和正则化权重
        
        核心理念：
        1. 物理参数（曝光、色温等）：允许适度调整，边界较宽，权重较低
        2. 创作参数（HSL、色彩分级）：严格限制调整，边界极窄，权重极高
        
        Args:
            x0: Gemini 初始参数向量
            metadata: 参数元数据
            
        Returns:
            bounds: 边界列表
            weights: 正则化权重向量
        """
        bounds = []
        weights = []
        idx = 0
        
        # 1. 基础参数（Basic Panel）- 物理修正层
        # 允许适度调整以匹配直方图和白平衡
        basic_names = metadata.get("basic_names", [])
        for name in basic_names:
            val = x0[idx]
            idx += 1
            
            if name == 'exposure':
                # 【修复】曝光：物理参数，允许 ±0.5 EV（从 ±1.0 缩小到 ±0.5）
                bounds.append((max(-2.0, val - 0.5), min(2.0, val + 0.5)))
                weights.append(10.0)  # 【修复】从 5.0 增加到 10.0，更严格
            elif name in ['temp', 'tint']:
                # 【修复】白平衡：物理参数，允许 ±10（从 ±20 缩小到 ±10）
                bounds.append((max(-100, val - 10), min(100, val + 10)))
                weights.append(20.0)  # 【修复】从 5.0 增加到 20.0，更严格
            elif name in ['contrast', 'whites', 'blacks', 'shadows', 'highlights']:
                # 【修复】光影：物理参数，允许 ±10（从 ±20 缩小到 ±10）
                # 注意：Blacks 和 Highlights 有特殊的物理限制
                if name == 'blacks':
                    bounds.append((max(-30, val - 10), min(20, val + 10)))  # 【修复】从 ±15 缩小到 ±10
                elif name == 'highlights':
                    bounds.append((max(-100, val - 10), min(20, val + 10)))  # 【修复】从 ±20 缩小到 ±10
                else:
                    bounds.append((max(-100, val - 10), min(100, val + 10)))  # 【修复】从 ±20 缩小到 ±10
                weights.append(20.0)  # 【修复】从 10.0 增加到 20.0，更严格
            elif name == 'saturation':
                # 【修复】全局饱和度：风险参数，限制 ±5（从 ±10 缩小到 ±5）
                bounds.append((max(-50, val - 5), min(30, val + 5)))
                weights.append(50.0)  # 【修复】从 20.0 增加到 50.0，更严格
            else:
                # 其他参数（Texture 等）：通常不动
                bounds.append((val - 5, val + 5))
                weights.append(100.0) # 高权重，锁住
                
        # 2. 色调曲线（Tone Curve）- 风格参数
        # 允许微调 ±10
        tone_curve_count = metadata.get("tone_curve_count", 0)
        for _ in range(tone_curve_count):
            val = x0[idx]
            idx += 1
            bounds.append((max(0, val - 10), min(255, val + 10)))
            weights.append(50.0) # 较高权重
            
        # 3. HSL - 纯创作参数
        # 【关键修复】完全禁止优化 HSL 参数！只允许在原始值基础上微调 ±1
        # 如果用户需要 HSL 调整，应该由 Gemini 决定，而不是算法优化
        hsl_colors = metadata.get("hsl_colors", [])
        for _ in hsl_colors:
            # Hue, Saturation, Luminance
            for i in range(3): 
                val = x0[idx]
                idx += 1
                # 【关键修复】只允许在当前值基础上微调 ±1（从 ±3 缩小到 ±1）
                # 这样即使优化器尝试调整，也只能做极小的微调
                if i == 0: # Hue
                    bounds.append((max(-180, val - 1), min(180, val + 1)))  # 【修复】从 ±3 缩小到 ±1
                else: # Sat/Lum
                    bounds.append((max(-100, val - 1), min(100, val + 1)))  # 【修复】从 ±3 缩小到 ±1
                weights.append(10000.0) # 【关键修复】从 1000.0 增加到 10000.0，极强地拉住 HSL 参数，几乎不允许任何调整
        
        # 4. 色彩分级 - 创作参数
        # 限制 ±5
        regions = metadata.get("color_grading_regions", [])
        for _ in regions:
            # Hue, Saturation
            for i in range(2):
                val = x0[idx]
                idx += 1
                if i == 0: # Hue (0-360)
                    bounds.append((max(0, val - 10), min(360, val + 10)))
                else: # Sat
                    bounds.append((max(0, val - 5), min(100, val + 5)))
                weights.append(200.0)
                
        # 5. Calibration - 风格底座
        # 限制 ±10
        primaries = metadata.get("calibration_primaries", [])
        for _ in primaries:
            # Hue, Saturation
            for i in range(2):
                val = x0[idx]
                idx += 1
                bounds.append((max(-100, val - 10), min(100, val + 10)))
                weights.append(100.0)
                
        return bounds, np.array(weights)

    def _parse_gemini_params(self, gemini_params: Dict[str, Any]) -> Dict[str, float]:
        """
        解析 Gemini 输出的参数格式，转换为校准引擎期望的格式
        
        Gemini 输出格式：{"exposure": {"value": "+0.5", "reason": "..."}, ...}
        校准引擎格式：{"exposure": 0.5, ...}
        
        Args:
            gemini_params: Gemini 输出的参数字典（basic_panel 格式）
        
        Returns:
            校准引擎期望的参数字典
        """
        result = {}
        
        # 参数名称映射和默认值
        param_mapping = {
            'exposure': 0.0,
            'temp': 0.0,
            'tint': 0.0,
            'contrast': 0.0,
            'saturation': 0.0,
            'highlights': 0.0,
            'shadows': 0.0,
            'whites': 0.0,
            'blacks': 0.0,
        }
        
        for param_name, default_value in param_mapping.items():
            param_obj = gemini_params.get(param_name, {})
            
            if isinstance(param_obj, dict):
                # 格式：{"value": "+0.5", "reason": "..."}
                val_str = param_obj.get('value') or param_obj.get('val') or param_obj.get('range', '+0')
            elif isinstance(param_obj, (int, float)):
                # 直接是数值
                result[param_name] = float(param_obj)
                continue
            elif isinstance(param_obj, str):
                # 直接是字符串
                val_str = param_obj
            else:
                result[param_name] = default_value
                continue
            
            # 解析字符串值（如 "+0.5"、"-30"）
            try:
                val_str = str(val_str).strip()
                if val_str.startswith('+'):
                    result[param_name] = float(val_str[1:])
                else:
                    result[param_name] = float(val_str)
            except (ValueError, TypeError):
                result[param_name] = default_value
        
        return result
    
    def _format_calibrated_params(
        self, 
        calibrated: Dict[str, float], 
        original_params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        将校准后的参数格式化为后端期望的格式，用于覆盖 basic 字段
        
        后端 basic 字段格式：
        {
            "exposure": {"range": "+0.5", "note": "...", "reason": "..."},
            "temp": {"range": "+20", "note": "...", "reason": "..."},
            ...
        }
        
        Args:
            calibrated: 校准后的参数 {"exposure": 0.5, ...}
            original_params: 原始 Gemini 参数（用于保留 reason 字段）
        
        Returns:
            格式化后的参数字典，可直接用于覆盖 basic
        """
        result = {}
        
        for param_name, value in calibrated.items():
            # 格式化数值为字符串（带正负号）
            if value >= 0:
                value_str = f"+{value:.2f}" if param_name == 'exposure' else f"+{int(round(value))}"
            else:
                value_str = f"{value:.2f}" if param_name == 'exposure' else f"{int(round(value))}"
            
            # 保留原始的 reason/note 字段
            original_obj = original_params.get(param_name, {})
            if isinstance(original_obj, dict):
                original_reason = original_obj.get('reason') or original_obj.get('note', '')
            else:
                original_reason = ''
            
            # 构建校准后的备注
            calibrated_note = f"[校准后] {original_reason}" if original_reason else "[校准后]"
            
            # 【修复】同时包含 value 和 range 字段，以匹配前端期望
            result[param_name] = {
                'value': value_str,  # 【新增】前端主要使用 value 字段
                'range': value_str,  # 【保留】向后兼容
                'note': calibrated_note,
                'reason': calibrated_note,
            }
        
        return result
    
    def calibrate(
        self,
        user_image_data: str,
        ref_image_data: str,
        gemini_params: Dict[str, Any],
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        校准 Gemini 输出的参数
        
        Args:
            user_image_data: 用户图 Base64 数据
            ref_image_data: 参考图 Base64 数据
            gemini_params: Gemini 输出的参数（basic_panel 格式）
        
        Returns:
            Tuple[校准后的参数（Gemini 格式）, 校准元数据]
        """
        logger.info("【校准引擎】开始校准...")
        
        # 1. 解码图片
        user_img = self._decode_image(user_image_data)
        ref_img = self._decode_image(ref_image_data)
        
        if user_img is None or ref_img is None:
            logger.error("【校准引擎】图片解码失败，返回原始参数")
            return gemini_params, {"status": "failed", "reason": "image_decode_error"}
        
        logger.info(f"【校准引擎】图片解码成功，尺寸: user={user_img.shape}, ref={ref_img.shape}")
        
        # 2. 计算参考图的统计特征（使用新的百分位锚定方法）
        ref_uint8 = (np.clip(ref_img, 0, 1) * 255).astype(np.uint8)
        ref_lab = cv2.cvtColor(ref_uint8, cv2.COLOR_RGB2LAB).astype(np.float64)
        ref_stats = self._get_image_stats(ref_lab)
        logger.info(f"【校准引擎】参考图统计特征: L_p1={ref_stats['l_p1']:.2f}, L_p99={ref_stats['l_p99']:.2f}, L_std={ref_stats['l_std']:.2f}, A_mean={ref_stats['a_mean']:.2f}, B_mean={ref_stats['b_mean']:.2f}")
        
        # 3. 解析 Gemini 参数作为初始值
        x0_dict = self._parse_gemini_params(gemini_params)
        logger.info(f"【校准引擎】Gemini 初始参数: {x0_dict}")
        
        # 转换为数组（优化器需要）
        param_names = ['exposure', 'temp', 'tint', 'contrast', 'saturation', 'highlights', 'shadows', 'whites', 'blacks']
        x0 = [x0_dict.get(name, 0.0) for name in param_names]
        
        # 4. 定义优化目标函数
        def objective(x):
            params = {
                'exposure': x[0],
                'temp': x[1],
                'tint': x[2],
                'contrast': x[3],
                'saturation': x[4],
                'highlights': x[5],
                'shadows': x[6],
                'whites': x[7],
                'blacks': x[8],
            }
            # 渲染
            sim_img = self.virtual_lr.apply(user_img, params)
            # 算 Loss
            return self._calculate_loss(sim_img, ref_stats)
        
        # 5. 【升级】参数范围限制 - 严格的边界控制，防止色彩溢出和过曝
        bounds = [
            (-1.5, 1.5),      # Exposure: 曝光不宜大幅度调整，否则画质劣化
            (-50, 50),        # Temp: 色温调整范围
            (-50, 50),        # Tint: 色调调整范围
            (-30, 50),        # Contrast: 允许加对比度，适度允许减
            (-40, 20),        # Saturation: 【重点限制】最高只给 +20，防止荧光化
            (-100, 0),        # Highlights: 【核心参数】只允许压高光，不允许提亮高光（易过曝）
            (-50, 50),        # Shadows: 阴影调整范围
            (-30, 30),        # Whites: 白色调整范围
            (-15, 5),         # Blacks: 【核心参数】倾向于负值（加深黑色），极少允许正值（提亮黑位）
        ]
        
        # 6. 运行优化器
        logger.info("【校准引擎】开始优化...")
        initial_loss = objective(x0)
        logger.info(f"【校准引擎】初始 Loss: {initial_loss:.4f}")
        
        try:
            # Powell 算法不需要导数，鲁棒性强
            res = minimize(
                objective, 
                x0, 
                method='Powell', 
                bounds=bounds, 
                options={'maxiter': 100, 'ftol': 1e-3}
            )
            
            final_loss = res.fun
            logger.info(f"【校准引擎】优化完成，最终 Loss: {final_loss:.4f}，迭代次数: {res.nit}")
            
            # 7. 提取优化结果
            calibrated_dict = {
                'exposure': round(float(res.x[0]), 2),
                'temp': int(round(res.x[1])),
                'tint': int(round(res.x[2])),
                'contrast': int(round(res.x[3])),
                'saturation': int(round(res.x[4])),
                'highlights': int(round(res.x[5])),
                'shadows': int(round(res.x[6])),
                'whites': int(round(res.x[7])),
                'blacks': int(round(res.x[8])),
            }
            
            logger.info(f"【校准引擎】校准后参数: {calibrated_dict}")
            
            # 8. 格式化为 Gemini 格式
            calibrated_formatted = self._format_calibrated_params(calibrated_dict, gemini_params)
            
            # 9. 校准元数据
            calibration_meta = {
                "status": "success",
                "initial_loss": round(initial_loss, 4),
                "final_loss": round(final_loss, 4),
                "improvement": round((initial_loss - final_loss) / initial_loss * 100, 2) if initial_loss > 0 else 0,
                "iterations": res.nit,
                "original_params": x0_dict,
                "calibrated_params": calibrated_dict,
            }
            
            return calibrated_formatted, calibration_meta
            
        except Exception as e:
            logger.error(f"【校准引擎】优化失败: {type(e).__name__}: {str(e)}")
            return gemini_params, {"status": "failed", "reason": str(e)}
    
    def _parse_all_params(self, gemini_lightroom_structured: Dict[str, Any]) -> Dict[str, Any]:
        """
        解析所有 Gemini 参数，转换为校准引擎期望的格式
        
        Args:
            gemini_lightroom_structured: Gemini 输出的 lightroom.structured 完整数据
        
        Returns:
            包含所有参数的字典
        """
        result = {}
        
        # 1. 基础参数（basic_panel）
        basic_panel = gemini_lightroom_structured.get("basic", {})
        result["basic"] = self._parse_gemini_params(basic_panel)
        
        # 2. 色调曲线（toneCurve）- 简化为只优化 RGB 曲线的 y 值
        tone_curve = gemini_lightroom_structured.get("toneCurve", [])
        if isinstance(tone_curve, list) and len(tone_curve) >= 5:
            # 提取 RGB 曲线的 y 值（x 值固定为 [0, 64, 128, 192, 255]）
            result["tone_curve_y"] = [float(point[1]) if isinstance(point, (list, tuple)) and len(point) >= 2 else 128.0 
                                     for point in tone_curve[:5]]
        else:
            result["tone_curve_y"] = [0.0, 64.0, 128.0, 192.0, 255.0]  # 默认直线
        
        # 3. HSL 调整（hsl）- 8 种颜色 × 3 个参数
        hsl = gemini_lightroom_structured.get("hsl", [])
        hsl_dict = {}
        if isinstance(hsl, list):
            # 前端格式：列表，每个元素包含 name 和 value
            color_names = ["红", "橙", "黄", "绿", "青", "蓝", "紫", "洋红"]
            color_names_en = ["red", "orange", "yellow", "green", "aqua", "blue", "purple", "magenta"]
            for item in hsl:
                if isinstance(item, dict):
                    name_cn = item.get("name", "")
                    # 找到对应的英文名称
                    for cn, en in zip(color_names, color_names_en):
                        if cn in name_cn:
                            param_type = "hue" if "色相" in name_cn else ("saturation" if "饱和度" in name_cn else "luminance")
                            if en not in hsl_dict:
                                hsl_dict[en] = {"hue": 0, "saturation": 0, "luminance": 0}
                            val_str = str(item.get("value", "0"))
                            try:
                                val = float(val_str.replace("+", ""))
                                hsl_dict[en][param_type] = val
                            except:
                                pass
        elif isinstance(hsl, dict):
            # 后端格式：字典，键为颜色名
            hsl_dict = {}
            for color_name, color_data in hsl.items():
                if isinstance(color_data, dict):
                    # 【修复】正确处理字符串格式（如 "+10"、"-5"）
                    def parse_hsl_value(val):
                        if val is None:
                            return 0.0
                        if isinstance(val, (int, float)):
                            return float(val)
                        val_str = str(val).strip()
                        if val_str.startswith('+'):
                            return float(val_str[1:])
                        return float(val_str)
                    
                    hsl_dict[color_name] = {
                        "hue": parse_hsl_value(color_data.get("hue", 0)),
                        "saturation": parse_hsl_value(color_data.get("saturation", 0)),
                        "luminance": parse_hsl_value(color_data.get("luminance", 0)),
                    }
        result["hsl"] = hsl_dict
        
        # 4. 色彩分级（colorGrading）
        # 提取字段：shadows, midtones, highlights 的 hue, saturation, luminance 和 blending, balance
        color_grading = gemini_lightroom_structured.get("colorGrading", {})
        result["color_grading"] = {}
        for region in ["highlights", "midtones", "shadows"]:
            region_data = color_grading.get(region, {})
            if isinstance(region_data, dict):
                # 【修复】正确处理数值（可能是字符串或数字）
                def parse_grading_value(val):
                    if val is None:
                        return 0.0
                    if isinstance(val, (int, float)):
                        return float(val)
                    val_str = str(val).strip()
                    return float(val_str)
                
                result["color_grading"][region] = {
                    "hue": parse_grading_value(region_data.get("hue", 0)),
                    "saturation": parse_grading_value(region_data.get("saturation", 0)),
                    "luminance": parse_grading_value(region_data.get("luminance", 0)),
                }
            else:
                result["color_grading"][region] = {"hue": 0, "saturation": 0, "luminance": 0}
        
        # 保留 blending 和 balance（不优化，但需要保留）
        if "blending" in color_grading:
            result["color_grading"]["blending"] = color_grading["blending"]
        if "balance" in color_grading:
            result["color_grading"]["balance"] = color_grading["balance"]
        
        # 5. 相机校准（calibration）
        # 提取字段：red_primary, green_primary, blue_primary 的 hue, saturation 和 shadows_tint
        calibration = gemini_lightroom_structured.get("calibration", {})
        result["calibration"] = {}
        for primary in ["red_primary", "green_primary", "blue_primary"]:
            primary_data = calibration.get(primary, {})
            if isinstance(primary_data, dict):
                # 【修复】正确处理字符串格式（如 "+15"、"-10"）
                def parse_calibration_value(val):
                    if val is None:
                        return 0.0
                    if isinstance(val, (int, float)):
                        return float(val)
                    val_str = str(val).strip()
                    if val_str.startswith('+'):
                        return float(val_str[1:])
                    return float(val_str)
                
                result["calibration"][primary] = {
                    "hue": parse_calibration_value(primary_data.get("hue", 0)),
                    "saturation": parse_calibration_value(primary_data.get("saturation", 0)),
                }
            else:
                result["calibration"][primary] = {"hue": 0, "saturation": 0}
        
        # 保留 shadows_tint（不优化，但需要保留）
        if "shadows_tint" in calibration:
            result["calibration"]["shadows_tint"] = calibration["shadows_tint"]
        
        return result
    
    def _encode_all_params(self, params_dict: Dict[str, Any]) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        将所有参数编码为优化器可以处理的数值向量
        
        Args:
            params_dict: 包含所有参数的字典
        
        Returns:
            Tuple[参数向量, 参数元数据（用于解码）]
        """
        x = []
        metadata = {}
        
        # 1. 基础参数（9 个）
        basic = params_dict.get("basic", {})
        basic_names = ['exposure', 'temp', 'tint', 'contrast', 'saturation', 'highlights', 'shadows', 'whites', 'blacks']
        for name in basic_names:
            x.append(basic.get(name, 0.0))
        metadata["basic_names"] = basic_names
        
        # 2. 色调曲线（5 个 y 值）
        tone_curve_y = params_dict.get("tone_curve_y", [0.0, 64.0, 128.0, 192.0, 255.0])
        x.extend(tone_curve_y[:5])
        metadata["tone_curve_count"] = 5
        
        # 3. HSL 调整（8 种颜色 × 3 个参数 = 24 个）
        hsl = params_dict.get("hsl", {})
        color_names = ["red", "orange", "yellow", "green", "aqua", "blue", "purple", "magenta"]
        for color_name in color_names:
            color_data = hsl.get(color_name, {"hue": 0, "saturation": 0, "luminance": 0})
            x.append(color_data.get("hue", 0))
            x.append(color_data.get("saturation", 0))
            x.append(color_data.get("luminance", 0))
        metadata["hsl_colors"] = color_names
        
        # 4. 色彩分级（3 个区域 × 3 个参数 = 9 个，但通常只优化 hue 和 saturation）
        color_grading = params_dict.get("color_grading", {})
        for region in ["highlights", "midtones", "shadows"]:
            region_data = color_grading.get(region, {"hue": 0, "saturation": 0, "luminance": 0})
            x.append(region_data.get("hue", 0))
            x.append(region_data.get("saturation", 0))
            # luminance 通常为 0，不优化
            # x.append(region_data.get("luminance", 0))
        metadata["color_grading_regions"] = ["highlights", "midtones", "shadows"]
        metadata["color_grading_optimize_luminance"] = False
        
        # 5. 相机校准（3 个原色 × 2 个参数 = 6 个）
        calibration = params_dict.get("calibration", {})
        for primary in ["red_primary", "green_primary", "blue_primary"]:
            primary_data = calibration.get(primary, {"hue": 0, "saturation": 0})
            x.append(primary_data.get("hue", 0))
            x.append(primary_data.get("saturation", 0))
        metadata["calibration_primaries"] = ["red_primary", "green_primary", "blue_primary"]
        
        return np.array(x), metadata
    
    def _decode_all_params(self, x: np.ndarray, metadata: Dict[str, Any], original_structured: Dict[str, Any]) -> Dict[str, Any]:
        """
        将优化后的参数向量解码回原始格式
        
        【重要】直接复制原始结构，只更新数值字段，保留所有元数据（reason、note等）
        
        Args:
            x: 优化后的参数向量
            metadata: 参数元数据
            original_structured: 原始的 lightroom.structured 数据（用于保留格式和元数据）
        
        Returns:
            校准后的 lightroom.structured 数据（格式与原始数据完全一致）
        """
        import copy
        idx = 0
        result = copy.deepcopy(original_structured)  # 深拷贝，避免修改原始数据
        
        # 1. 基础参数（basic_panel）
        # 提取字段：temp, tint, exposure, contrast, highlights, shadows, whites, blacks, texture, clarity, dehaze, vibrance, saturation
        basic_names = metadata["basic_names"]
        original_basic = result.get("basic", {})
        
        for name in basic_names:
            calibrated_value = x[idx]
            idx += 1
            
            # 格式化数值为字符串（带正负号）
            if name == 'exposure':
                value_str = f"{calibrated_value:+.2f}" if calibrated_value >= 0 else f"{calibrated_value:.2f}"
            else:
                value_str = f"+{int(round(calibrated_value))}" if calibrated_value >= 0 else f"{int(round(calibrated_value))}"
            
            # 保留原始结构，只更新 value 字段
            if name in original_basic:
                original_param = original_basic[name]
                if isinstance(original_param, dict):
                    # 保留原有的 reason、note 等字段，只更新 value
                    original_basic[name] = {
                        **original_param,  # 保留所有原有字段
                        "value": value_str,  # 更新 value
                    }
                    # 如果没有 range 字段，也更新它
                    if "range" not in original_basic[name]:
                        original_basic[name]["range"] = value_str
                else:
                    # 如果原始不是字典，创建新字典
                    original_basic[name] = {
                        "value": value_str,
                        "range": value_str,
                    }
            else:
                # 如果原始不存在，创建新字段
                original_basic[name] = {
                    "value": value_str,
                    "range": value_str,
                }
        
        result["basic"] = original_basic
        
        # 2. 色调曲线
        tone_curve_count = metadata["tone_curve_count"]
        tone_curve_y = [float(x[idx + i]) for i in range(tone_curve_count)]
        idx += tone_curve_count
        # 构建色调曲线（x 值固定）
        tone_curve_x = [0, 64, 128, 192, 255]
        result["toneCurve"] = [[int(tone_curve_x[i]), int(np.clip(tone_curve_y[i], 0, 255))] for i in range(tone_curve_count)]
        
        # 3. HSL 调整
        # 提取字段：red, orange, yellow, green, aqua, blue, purple, magenta 的 hue, saturation, luminance
        hsl_colors = metadata["hsl_colors"]
        original_hsl = result.get("hsl", {})
        
        # 判断原始格式
        is_list_format = isinstance(original_hsl, list)
        
        if is_list_format:
            # 前端格式：列表，需要重新构建
            hsl_result = []
            color_names_cn = ["红", "橙", "黄", "绿", "青", "蓝", "紫", "洋红"]
            for i, (color_name, color_cn) in enumerate(zip(hsl_colors, color_names_cn)):
                hue = int(round(x[idx]))
                saturation = int(round(x[idx + 1]))
                luminance = int(round(x[idx + 2]))
                idx += 3
                
                # 只有当值不为 0 时才添加（保持与原始格式一致）
                if hue != 0:
                    hsl_result.append({
                        "name": f"{color_cn}色相",
                        "value": f"{hue:+d}",
                    })
                if saturation != 0:
                    hsl_result.append({
                        "name": f"{color_cn}饱和度",
                        "value": f"{saturation:+d}",
                    })
                if luminance != 0:
                    hsl_result.append({
                        "name": f"{color_cn}明度",
                        "value": f"{luminance:+d}",
                    })
            result["hsl"] = hsl_result
        else:
            # 后端格式：字典，直接更新数值，保留原有的 note 等字段
            hsl_result = original_hsl if isinstance(original_hsl, dict) else {}
            for color_name in hsl_colors:
                hue = int(round(x[idx]))
                saturation = int(round(x[idx + 1]))
                luminance = int(round(x[idx + 2]))
                idx += 3
                
                # 格式化数值为字符串（带正负号），匹配 Gemini 输出格式
                hue_str = f"{hue:+d}" if hue != 0 else "0"
                saturation_str = f"{saturation:+d}" if saturation != 0 else "0"
                luminance_str = f"{luminance:+d}" if luminance != 0 else "0"
                
                # 保留原有结构，只更新数值字段
                if color_name in hsl_result:
                    original_color_data = hsl_result[color_name]
                    if isinstance(original_color_data, dict):
                        # 检查原始格式：如果是字符串格式，使用字符串；如果是数字格式，使用数字
                        original_hue = original_color_data.get("hue", 0)
                        use_string_format = isinstance(original_hue, str)
                        
                        hsl_result[color_name] = {
                            **original_color_data,  # 保留所有原有字段（包括 note）
                            "hue": hue_str if use_string_format else hue,  # 更新数值，保持格式一致
                            "saturation": saturation_str if use_string_format else saturation,
                            "luminance": luminance_str if use_string_format else luminance,
                        }
                    else:
                        hsl_result[color_name] = {
                            "hue": hue_str,
                            "saturation": saturation_str,
                            "luminance": luminance_str,
                        }
                else:
                    hsl_result[color_name] = {
                        "hue": hue_str,
                        "saturation": saturation_str,
                        "luminance": luminance_str,
                    }
            result["hsl"] = hsl_result
        
        # 4. 色彩分级
        # 提取字段：shadows, midtones, highlights 的 hue, saturation, luminance 和 blending, balance
        color_grading_regions = metadata["color_grading_regions"]
        original_color_grading = result.get("colorGrading", {})
        color_grading_result = original_color_grading if isinstance(original_color_grading, dict) else {}
        
        for region in color_grading_regions:
            hue = int(round(x[idx]))
            saturation = int(round(x[idx + 1]))
            idx += 2
            
            # 保留原有结构，只更新数值字段
            if region in color_grading_result:
                original_region_data = color_grading_result[region]
                if isinstance(original_region_data, dict):
                    color_grading_result[region] = {
                        **original_region_data,  # 保留所有原有字段（包括 reason、luminance）
                        "hue": hue,  # 更新数值
                        "saturation": saturation,
                    }
                else:
                    color_grading_result[region] = {
                        "hue": hue,
                        "saturation": saturation,
                        "luminance": 0,
                    }
            else:
                color_grading_result[region] = {
                    "hue": hue,
                    "saturation": saturation,
                    "luminance": 0,
                }
        
        # 保留 blending 和 balance（不优化，直接复制原始值）
        if "blending" in original_color_grading:
            color_grading_result["blending"] = original_color_grading["blending"]
        if "balance" in original_color_grading:
            color_grading_result["balance"] = original_color_grading["balance"]
        
        result["colorGrading"] = color_grading_result
        
        # 5. 相机校准
        # 提取字段：red_primary, green_primary, blue_primary 的 hue, saturation 和 shadows_tint
        calibration_primaries = metadata["calibration_primaries"]
        original_calibration = result.get("calibration", {})
        calibration_result = original_calibration if isinstance(original_calibration, dict) else {}
        
        for primary in calibration_primaries:
            hue = int(round(x[idx]))
            saturation = int(round(x[idx + 1]))
            idx += 2
            
            # 保留原有结构，只更新数值字段
            if primary in calibration_result:
                original_primary = calibration_result[primary]
                if isinstance(original_primary, dict):
                    calibration_result[primary] = {
                        **original_primary,  # 保留所有原有字段（包括 note）
                        "hue": hue,  # 更新数值
                        "saturation": saturation,
                    }
                else:
                    calibration_result[primary] = {
                        "hue": hue,
                        "saturation": saturation,
                    }
            else:
                calibration_result[primary] = {
                    "hue": hue,
                    "saturation": saturation,
                }
        
        # 保留 shadows_tint（不优化，直接复制原始值）
        if "shadows_tint" in original_calibration:
            calibration_result["shadows_tint"] = original_calibration["shadows_tint"]
        
        result["calibration"] = calibration_result
        
        return result
    
    def _params_dict_to_virtual_lr_params(self, params_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        将参数字典转换为 VirtualLREngine 可以使用的格式
        
        Args:
            params_dict: 包含所有参数的字典
        
        Returns:
            VirtualLREngine 参数字典
        """
        result = {}
        
        # 基础参数
        basic = params_dict.get("basic", {})
        for key in ['exposure', 'temp', 'tint', 'contrast', 'saturation', 'highlights', 'shadows', 'whites', 'blacks']:
            result[key] = basic.get(key, 0.0)
        
        # 色调曲线
        tone_curve_y = params_dict.get("tone_curve_y", [0.0, 64.0, 128.0, 192.0, 255.0])
        tone_curve_x = [0, 64, 128, 192, 255]
        result["tone_curve"] = [[int(tone_curve_x[i]), int(np.clip(tone_curve_y[i], 0, 255))] for i in range(5)]
        
        # HSL 调整
        hsl = params_dict.get("hsl", {})
        result["hsl"] = hsl
        
        # 色彩分级
        color_grading = params_dict.get("color_grading", {})
        result["color_grading"] = color_grading
        
        # 相机校准
        calibration = params_dict.get("calibration", {})
        result["calibration"] = calibration
        
        return result
    
    def calibrate_all(
        self,
        user_image_data: str,
        ref_image_data: str,
        gemini_lightroom_structured: Dict[str, Any],
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        校准所有 Lightroom 参数（包括 basic、toneCurve、hsl、colorGrading、calibration）
        
        策略：分阶段优化
        1. 第一阶段：优化基础参数（basic_panel）
        2. 第二阶段：在基础参数的基础上，优化其他参数
        
        Args:
            user_image_data: 用户图 Base64 数据
            ref_image_data: 参考图 Base64 数据
            gemini_lightroom_structured: Gemini 输出的 lightroom.structured 完整数据
        
        Returns:
            Tuple[校准后的 lightroom.structured, 校准元数据]
        """
        logger.info("【校准引擎-完整】开始校准所有 Lightroom 参数...")
        
        # 1. 解码图片
        user_img = self._decode_image(user_image_data)
        ref_img = self._decode_image(ref_image_data)
        
        if user_img is None or ref_img is None:
            logger.error("【校准引擎-完整】图片解码失败，返回原始参数")
            return gemini_lightroom_structured, {"status": "failed", "reason": "image_decode_error"}
        
        logger.info(f"【校准引擎-完整】图片解码成功，尺寸: user={user_img.shape}, ref={ref_img.shape}")
        
        # 2. 计算参考图的统计特征（使用新的百分位锚定方法）
        ref_uint8 = (np.clip(ref_img, 0, 1) * 255).astype(np.uint8)
        ref_lab = cv2.cvtColor(ref_uint8, cv2.COLOR_RGB2LAB).astype(np.float64)
        ref_stats = self._get_image_stats(ref_lab)
        logger.info(f"【校准引擎-完整】参考图统计特征: L_p1={ref_stats['l_p1']:.2f}, L_p99={ref_stats['l_p99']:.2f}, L_std={ref_stats['l_std']:.2f}, A_mean={ref_stats['a_mean']:.2f}, B_mean={ref_stats['b_mean']:.2f}")
        
        # 3. 解析所有 Gemini 参数
        params_dict = self._parse_all_params(gemini_lightroom_structured)
        logger.info(f"【校准引擎-完整】解析参数完成: basic={len(params_dict.get('basic', {}))}, tone_curve={len(params_dict.get('tone_curve_y', []))}, hsl={len(params_dict.get('hsl', {}))}")
        
        # 4. 编码参数为向量
        x0, metadata = self._encode_all_params(params_dict)
        logger.info(f"【校准引擎-完整】参数向量长度: {len(x0)}")
        
        # 5. 生成动态边界和正则化权重（橡皮筋机制）
        # 基于 Gemini 的初始值 x0，为每个参数设定安全活动范围和偏离惩罚
        bounds, reg_weights = self._get_dynamic_bounds(x0, metadata)
        
        # 6. 定义优化目标函数
        def objective(x):
            # 【修复】双重保险：在目标函数内部裁剪参数到边界内
            # 即使优化器忽略 bounds，这里也会强制参数在合理范围内
            x_clipped = np.array([np.clip(x[i], bounds[i][0], bounds[i][1]) for i in range(len(x))])
            
            # 解码参数（使用裁剪后的参数）
            decoded_params = {}
            idx = 0
            
            # 基础参数（使用裁剪后的参数）
            basic_names = metadata["basic_names"]
            decoded_params["basic"] = {name: x_clipped[idx + i] for i, name in enumerate(basic_names)}
            idx += len(basic_names)
            
            # 色调曲线（使用裁剪后的参数）
            tone_curve_count = metadata["tone_curve_count"]
            decoded_params["tone_curve_y"] = [float(x_clipped[idx + i]) for i in range(tone_curve_count)]
            idx += tone_curve_count
            
            # HSL（使用裁剪后的参数）
            hsl_colors = metadata["hsl_colors"]
            decoded_params["hsl"] = {}
            for color_name in hsl_colors:
                decoded_params["hsl"][color_name] = {
                    "hue": x_clipped[idx],
                    "saturation": x_clipped[idx + 1],
                    "luminance": x_clipped[idx + 2],
                }
                idx += 3
            
            # 色彩分级（使用裁剪后的参数）
            color_grading_regions = metadata["color_grading_regions"]
            decoded_params["color_grading"] = {}
            for region in color_grading_regions:
                decoded_params["color_grading"][region] = {
                    "hue": x_clipped[idx],
                    "saturation": x_clipped[idx + 1],
                    "luminance": 0,
                }
                idx += 2
            
            # 相机校准（使用裁剪后的参数）
            calibration_primaries = metadata["calibration_primaries"]
            decoded_params["calibration"] = {}
            for primary in calibration_primaries:
                decoded_params["calibration"][primary] = {
                    "hue": x_clipped[idx],
                    "saturation": x_clipped[idx + 1],
                }
                idx += 2
            
            # 转换为 VirtualLREngine 格式
            virtual_lr_params = self._params_dict_to_virtual_lr_params(decoded_params)
            
            # 渲染
            sim_img = self.virtual_lr.apply(user_img, virtual_lr_params)
            
            # 计算 Loss（带正则化）
            # 传入当前参数 x_clipped（裁剪后的参数）、原始参数 x0 和权重向量，用于计算橡皮筋拉力
            return self._calculate_loss(sim_img, ref_stats, current_params=x_clipped, original_params=np.array(x0), param_weights=reg_weights)
        
        # 7. 运行优化器
        logger.info("【校准引擎-完整】开始优化所有参数...")
        # 记录初始 Loss (包含正则化项，初始时为0)
        initial_loss = objective(x0) 
        logger.info(f"【校准引擎-完整】初始 Loss: {initial_loss:.4f}")
        
        try:
            # 【修复】Powell 方法不支持 bounds 参数！必须改用支持 bounds 的方法
            # 使用 L-BFGS-B 方法（支持 bounds，且性能好，适合大规模优化）
            # 注意：L-BFGS-B 需要梯度，但我们可以使用数值梯度（通过 finite differences）
            res = minimize(
                objective,
                x0,
                method='L-BFGS-B',  # 【修复】改用支持 bounds 的方法
                bounds=bounds,  # 【修复】现在 bounds 会真正生效
                options={'maxiter': 50, 'ftol': 1e-2, 'maxls': 20}  # maxls: 最大线搜索步数
            )
            
            final_loss = res.fun
            logger.info(f"【校准引擎-完整】优化完成，最终 Loss: {final_loss:.4f}，迭代次数: {res.nit}")
            
            # 【关键修复】在使用 res.x 之前，强制裁剪到边界内
            # 即使优化器返回的值超出了边界，也要强制裁剪
            x_final = np.array([np.clip(res.x[i], bounds[i][0], bounds[i][1]) for i in range(len(res.x))])
            
            # 【调试日志】检查是否有参数被裁剪
            param_diff = np.abs(x_final - res.x)
            if np.any(param_diff > 1e-6):
                logger.warning(f"【校准引擎-完整】⚠️ 检测到 {np.sum(param_diff > 1e-6)} 个参数超出边界，已强制裁剪")
                max_diff_idx = np.argmax(param_diff)
                logger.warning(f"【校准引擎-完整】⚠️ 最大偏差: 索引 {max_diff_idx}, 原始值={res.x[max_diff_idx]:.2f}, 裁剪后={x_final[max_diff_idx]:.2f}, 边界=[{bounds[max_diff_idx][0]:.2f}, {bounds[max_diff_idx][1]:.2f}]")
            
            # 8. 解码优化结果（使用裁剪后的参数）
            calibrated_structured = self._decode_all_params(x_final, metadata, gemini_lightroom_structured)
            
            # 9. 校准元数据
            calibration_meta = {
                "status": "success",
                "initial_loss": round(initial_loss, 4),
                "final_loss": round(final_loss, 4),
                "improvement": round((initial_loss - final_loss) / initial_loss * 100, 2) if initial_loss > 0 else 0,
                "iterations": res.nit,
                "param_count": len(x0),
                "note": "已优化所有参数：basic、toneCurve、hsl、colorGrading、calibration",
            }
            
            logger.info(f"【校准引擎-完整】✅ 校准完成，Loss 改善: {calibration_meta['improvement']:.2f}%")
            return calibrated_structured, calibration_meta
            
        except Exception as e:
            logger.error(f"【校准引擎-完整】优化失败: {type(e).__name__}: {str(e)}")
            return gemini_lightroom_structured, {"status": "failed", "reason": str(e)}


# 全局校准引擎实例（单例模式）
_calibration_engine: Optional[CalibrationEngine] = None


def get_calibration_engine() -> CalibrationEngine:
    """获取校准引擎实例（单例模式）"""
    global _calibration_engine
    if _calibration_engine is None:
        _calibration_engine = CalibrationEngine()
    return _calibration_engine


def calibrate_lightroom_params(
    user_image_data: str,
    ref_image_data: str,
    gemini_basic_panel: Dict[str, Any],
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    校准 Lightroom 基础面板参数（便捷函数）
    
    Args:
        user_image_data: 用户图 Base64 数据
        ref_image_data: 参考图 Base64 数据
        gemini_basic_panel: Gemini 输出的 basic_panel 参数
    
    Returns:
        Tuple[校准后的 basic_panel, 校准元数据]
    """
    engine = get_calibration_engine()
    return engine.calibrate(user_image_data, ref_image_data, gemini_basic_panel)


def calibrate_all_lightroom_params(
    user_image_data: str,
    ref_image_data: str,
    gemini_lightroom_structured: Dict[str, Any],
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    校准所有 Lightroom 参数（包括 basic、toneCurve、hsl、colorGrading、calibration）
    
    Args:
        user_image_data: 用户图 Base64 数据
        ref_image_data: 参考图 Base64 数据
        gemini_lightroom_structured: Gemini 输出的 lightroom.structured 完整数据
    
    Returns:
        Tuple[校准后的 lightroom.structured, 校准元数据]
    """
    engine = get_calibration_engine()
    return engine.calibrate_all(user_image_data, ref_image_data, gemini_lightroom_structured)

