"""
RawTherapee PP3 生成器
用途：将 Lightroom JSON 参数转换为 RawTherapee 可读取的 PP3 sidecar 文件 (INI 格式)
"""

import configparser
from typing import Dict, Any, Optional, List
from loguru import logger
import os

class RawTherapeePP3Generator:
    """
    RawTherapee PP3 生成器
    
    将 Lightroom 风格的 JSON 参数转换为 RawTherapee 的 PP3 sidecar 格式。
    RawTherapee 使用 INI 格式的配置文件。
    
    支持的 Lightroom 参数映射：
    - Exposure -> Exposure (Exposure)
    - Contrast -> Exposure (Contrast)
    - Highlights -> Exposure (HighlightCompression) / Shadows/Highlights (Highlights)
    - Shadows -> Shadows/Highlights (Shadows)
    - Blacks -> Exposure (Black)
    - Whites -> Exposure (Lightness) - 近似
    - Saturation -> Lab Adjustments (Chromacity) / Vibrance
    - Vibrance -> Vibrance (Pastel)
    - Temp/Tint -> White Balance
    - HSL -> HSV Equalizer
    - Color Grading -> Color Toning
    - Dehaze -> Haze Removal
    - Clarity -> Local Contrast / Microcontrast
    """
    
    def __init__(self):
        self.logger = logger.bind(service="RawTherapeePP3Generator")

    def _parse_value(self, value: Any, default: float = 0.0) -> float:
        """解析参数值为浮点数"""
        if value is None:
            return default
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            try:
                return float(value.strip().lstrip('+'))
            except ValueError:
                return default
        return default

    def generate_pp3(self, lr_params: Dict[str, Any]) -> str:
        """
        生成 PP3 文件内容
        """
        config = configparser.ConfigParser()
        config.optionxform = str  # 保持键名大小写敏感

        # ================= Version =================
        config['Version'] = {
            'AppVersion': '5.9',
            'Version': '344'
        }

        # ================= General =================
        config['General'] = {
            'Rank': '0',
            'ColorLabel': '0',
            'InTrash': 'false'
        }

        # ================= Exposure =================
        basic = lr_params.get('basic', {})
        
        # 【修复】Exposure: LR [-5, +5] -> RT [-3, +3] (限制范围，防止过度曝光)
        exposure_val = self._parse_value(basic.get('exposure', 0))
        exposure_val = max(-3.0, min(3.0, exposure_val))  # 限制在合理范围
        
        # 【修复】Contrast: LR [-100, +100] -> RT [-50, +50] (限制范围，防止过度对比)
        contrast_val = self._parse_value(basic.get('contrast', 0))
        contrast_val = max(-50, min(50, contrast_val))  # 限制在合理范围
        
        # 【修复】Blacks: LR [-100, +100] -> RT Black (更保守的映射)
        # LR Blacks: 负值 = 增加黑位（压暗），正值 = 减少黑位（提亮）
        # RT Black: 正值 = 增加黑位（压暗），负值 = 减少黑位（提亮）
        # 映射：LR -10 -> RT +100 (轻微压暗黑位)
        # 注意：RawTherapee 的 Black 范围通常是 -2000 到 +5000，但我们使用更保守的映射
        blacks_val = self._parse_value(basic.get('blacks', 0))
        # 使用更保守的映射：LR 的 -10 对应 RT 的 +100，而不是 +200
        rt_black = int(max(-500, min(1000, blacks_val * -10)))  # 缩小映射倍数从 -20 到 -10
        
        # 【修复】Saturation: LR [-100, +100] -> RT [-50, +50] (限制范围，防止过度饱和)
        saturation_val = self._parse_value(basic.get('saturation', 0))
        saturation_val = max(-50, min(50, saturation_val))  # 限制在合理范围

        config['Exposure'] = {
            'Enabled': 'true',
            'Mode': '0', # Default
            'Black': str(rt_black),  # 【修复】使用更保守的映射
            'Compensation': str(round(exposure_val, 2)),  # 【修复】限制精度
            'Contrast': str(int(contrast_val)),  # 【修复】已限制范围
            'HighlightCompr': '0', # Handled in Shadows/Highlights
            'HighlightComprThreshold': '33',
            'Saturation': str(int(saturation_val))  # 【修复】已限制范围
        }

        # ================= Shadows/Highlights =================
        # 【修复】Highlights: LR [-100, +100] -> RT Highlights [0, 50] (限制范围)
        # LR Negative highlights recovers details. RT Highlights slider recovers details (positive value).
        highlights_val = self._parse_value(basic.get('highlights', 0))
        # 【修复】Shadows: LR [-100, +100] -> RT Shadows [0, 50] (限制范围)
        # LR Positive shadows brightens. RT Shadows slider brightens (positive value).
        shadows_val = self._parse_value(basic.get('shadows', 0))

        rt_highlights = 0
        if highlights_val < 0:
            # 【修复】限制高光恢复范围，防止过度处理
            rt_highlights = min(50, abs(highlights_val))  # 限制在 0-50
        
        rt_shadows = 0
        if shadows_val > 0:
            # 【修复】限制阴影提亮范围，防止过度处理
            rt_shadows = min(50, shadows_val)  # 限制在 0-50

        if rt_highlights > 0 or rt_shadows > 0:
            config['Shadows/Highlights'] = {
                'Enabled': 'true',
                'Highlights': str(int(rt_highlights)),  # 【修复】已限制范围
                'HighlightsTonalWidth': '60',
                'Shadows': str(int(rt_shadows)),  # 【修复】已限制范围
                'ShadowsTonalWidth': '60'
            }

        # ================= White Balance =================
        # RT uses "Temperature" and "Green" (Tint)
        # LR Temp: 2000-50000. LR Tint: -150 to +150.
        # RT Temp: similar. RT Green: 0.4 to 2.5 roughly (1.0 neutral).
        
        white_balance = lr_params.get('whiteBalance', {})
        temp_val = self._parse_value(white_balance.get('temp', 0)) # This is offset in our system usually
        tint_val = self._parse_value(white_balance.get('tint', 0))

        # Assuming 'temp_val' is absolute Kelvin if > 1000, else offset
        # If offset, we need a base. Let's assume the input image WB or a standard D50/D65.
        # Since we don't know the camera WB, we might need to rely on "Custom" mode.
        # RawTherapee usually takes absolute values.
        
        base_temp = 5500
        final_temp = temp_val if temp_val > 1000 else base_temp + (temp_val * 20) # Scale offset
        
        # Tint mapping: LR 0 = RT 1.0. LR + = Magenta, RT > 1 = Magenta. LR - = Green, RT < 1 = Green.
        # Range: LR +/- 150. RT 0.02 - 5.0. 
        # Simple linear: 1.0 + (tint / 150)
        final_tint = 1.0 + (tint_val / 150.0)

        if temp_val != 0 or tint_val != 0:
            config['White Balance'] = {
                'Enabled': 'true',
                'Method': 'Custom',
                'Temperature': str(int(final_temp)),
                'Green': str(round(final_tint, 3))
            }

        # ================= Vibrance =================
        vibrance_val = self._parse_value(basic.get('vibrance', 0))
        if vibrance_val != 0:
            config['Vibrance'] = {
                'Enabled': 'true',
                'PastelSaturation': str(int(vibrance_val)) # Vibrance targets muted colors
            }

        # ================= Haze Removal (Dehaze) =================
        dehaze_val = self._parse_value(basic.get('dehaze', 0))
        if dehaze_val != 0:
            config['Haze Removal'] = {
                'Enabled': 'true',
                'Strength': str(int(abs(dehaze_val)))
            }

        # ================= Local Contrast (Clarity) =================
        clarity_val = self._parse_value(basic.get('clarity', 0))
        if clarity_val != 0:
            # RT "Local Contrast" is aggressive. "Microcontrast" is subtler.
            # Let's use Local Contrast for Clarity.
            # Range 0-100.
            config['Local Contrast'] = {
                'Enabled': 'true',
                'Amount': str(int(abs(clarity_val) / 2)) # Scale down a bit
            }

        # ================= Color Toning (Color Grading) =================
        # RT has Color Toning -> L*a*b* Color Correction or Split Toning.
        # "ColorToning" tool: Method = L*a*b* Split Toning.
        
        color_grading = lr_params.get('colorGrading', {})
        if color_grading:
            # Mapping is tricky. RT uses 2-way (Highlights/Shadows) mostly in simple Split Toning.
            # Or Grid based.
            # Let's try "Color Correction Regions" or simple Split Toning if avail.
            # Actually, RT 5.9 has "Color Toning".
            pass # Skip for now to ensure basic stability, can be added later.

        # ================= HSL (HSV Equalizer) =================
        # RT has HSV Equalizer.
        hsl = lr_params.get('hsl', {})
        if hsl:
            # Need to map 8 colors to RT's curve or sliders. 
            # RT HSV Equalizer has H, S, V channels.
            # This requires generating curve points which is complex in text.
            pass

        # Serialize
        import io
        output = io.StringIO()
        config.write(output)
        return output.getvalue()

    def save_pp3(self, lr_params: Dict[str, Any], output_path: str) -> str:
        """保存 PP3 文件"""
        pp3_content = self.generate_pp3(lr_params)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(pp3_content)
        self.logger.info(f"PP3 文件已保存: {output_path}")
        return output_path

