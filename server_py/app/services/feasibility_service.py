"""
复刻可行性评估服务（系统算法主导，不依赖 Gemini）
根据开发方案第 26 节实现
"""
import cv2
import numpy as np
from typing import Dict, Any, Optional, Tuple
from loguru import logger
from PIL import Image
import io
import base64


class FeasibilityService:
    """复刻可行性评估服务 - 由 CV 算法主导"""

    # 权重配置（与开发方案第 26 节对齐）
    WEIGHTS = {
        "L": 0.25,  # 光线相似度
        "C": 0.20,  # 色彩相似度
        "S": 0.18,  # 语义/场景相似度
        "P": 0.12,  # 构图/透视相似度
        "D": 0.05,  # 动态/曝光属性
        "T": 0.05,  # 纹理/颗粒相似度
        "Q": 0.03,  # 分辨率与质量
        "R": 0.07,  # 后期特征
    }

    def __init__(self):
        pass

    def evaluate(
        self, source_image_data: str, target_image_data: str
    ) -> Dict[str, Any]:
        """
        评估两张图片的复刻可行性
        
        Args:
            source_image_data: 参考图（base64 或 URL）
            target_image_data: 用户图（base64 或 URL）
        
        Returns:
            符合开发方案第 26 节的 JSON 结构
        """
        try:
            # 解码图片
            source_img = self._decode_image(source_image_data)
            target_img = self._decode_image(target_image_data)

            if source_img is None or target_img is None:
                return self._create_error_result("无法解码图片")

            # 检测 deal-breakers
            deal_breakers = self._detect_deal_breakers(source_img, target_img)
            if deal_breakers:
                return self._create_deal_breaker_result(deal_breakers)

            # 计算各维度得分
            metrics = {
                "L": self._calculate_lighting_similarity(source_img, target_img),
                "C": self._calculate_color_similarity(source_img, target_img),
                "S": self._calculate_semantic_similarity(source_img, target_img),
                "P": self._calculate_composition_similarity(source_img, target_img),
                "D": self._calculate_dynamic_similarity(source_img, target_img),
                "T": self._calculate_texture_similarity(source_img, target_img),
                "Q": self._calculate_quality_score(source_img, target_img),
                "R": self._calculate_postprocessing_similarity(source_img, target_img),
            }

            # 计算综合得分
            feasibility_score = sum(
                self.WEIGHTS[k] * metrics[k] for k in self.WEIGHTS.keys()
            )

            # 确定难度
            difficulty = self._map_difficulty(feasibility_score)

            # 计算置信度
            confidence = self._calculate_confidence(metrics)

            # 找出 Top-3 拖累因子
            dominant_factors = self._get_dominant_factors(metrics)

            # 生成推荐操作
            recommended_actions = self._generate_recommendations(
                metrics, dominant_factors
            )

            # 生成解释
            explanation = self._generate_explanation(
                feasibility_score, difficulty, dominant_factors
            )

            return {
                "feasibilityScore": float(feasibility_score),
                "difficulty": difficulty,
                "confidence": float(confidence),
                "dealBreakers": [],
                "dominantFactors": dominant_factors,
                "recommendedActions": recommended_actions,
                "metrics": {k: float(v) for k, v in metrics.items()},
                "explanation": explanation,
            }

        except Exception as e:
            logger.error(f"Feasibility evaluation failed: {e}")
            return self._create_error_result(f"评估失败: {str(e)}")

    def _decode_image(self, image_data: str) -> Optional[np.ndarray]:
        """解码 base64 图片或 URL"""
        try:
            if image_data.startswith("data:image"):
                # base64
                header, encoded = image_data.split(",", 1)
                img_bytes = base64.b64decode(encoded)
            else:
                # 假设是 base64 字符串（无 data URL 前缀）
                img_bytes = base64.b64decode(image_data)

            img = Image.open(io.BytesIO(img_bytes))
            return np.array(img)
        except Exception as e:
            logger.error(f"Image decode failed: {e}")
            return None

    def _detect_deal_breakers(
        self, source_img: np.ndarray, target_img: np.ndarray
    ) -> list:
        """检测致命不兼容因子"""
        deal_breakers = []

        # 1. 拍摄时间/环境强矛盾（通过亮度分布判断）
        source_brightness = np.mean(cv2.cvtColor(source_img, cv2.COLOR_RGB2GRAY))
        target_brightness = np.mean(cv2.cvtColor(target_img, cv2.COLOR_RGB2GRAY))
        if abs(source_brightness - target_brightness) > 100:
            deal_breakers.append("亮度差异过大，可能为夜景 vs 白天或室内 vs 室外")

        # 2. 主体类型不匹配（简化：通过颜色分布和纹理判断）
        # 这里简化处理，实际可用语义分割模型
        source_colors = np.mean(source_img, axis=(0, 1))
        target_colors = np.mean(target_img, axis=(0, 1))
        color_diff = np.linalg.norm(source_colors - target_colors)
        if color_diff > 80:
            deal_breakers.append("色彩分布差异过大，主体类型可能不匹配")

        # 3. 极端镜头差异（通过图片尺寸和边缘检测判断）
        source_edges = cv2.Canny(
            cv2.cvtColor(source_img, cv2.COLOR_RGB2GRAY), 50, 150
        )
        target_edges = cv2.Canny(
            cv2.cvtColor(target_img, cv2.COLOR_RGB2GRAY), 50, 150
        )
        source_edge_density = np.sum(source_edges > 0) / source_edges.size
        target_edge_density = np.sum(target_edges > 0) / target_edges.size
        if abs(source_edge_density - target_edge_density) > 0.3:
            deal_breakers.append("边缘密度差异过大，可能为微距 vs 远景等极端镜头差异")

        return deal_breakers

    def _calculate_lighting_similarity(
        self, source_img: np.ndarray, target_img: np.ndarray
    ) -> float:
        """计算光线相似度（0-1）"""
        # 转换为灰度图
        source_gray = cv2.cvtColor(source_img, cv2.COLOR_RGB2GRAY)
        target_gray = cv2.cvtColor(target_img, cv2.COLOR_RGB2GRAY)

        # 计算直方图
        hist_source = cv2.calcHist([source_gray], [0], None, [256], [0, 256])
        hist_target = cv2.calcHist([target_gray], [0], None, [256], [0, 256])

        # 归一化
        hist_source = hist_source / (hist_source.sum() + 1e-6)
        hist_target = hist_target / (hist_target.sum() + 1e-6)

        # 计算相关性
        correlation = cv2.compareHist(hist_source, hist_target, cv2.HISTCMP_CORREL)
        return max(0.0, min(1.0, correlation))

    def _calculate_color_similarity(
        self, source_img: np.ndarray, target_img: np.ndarray
    ) -> float:
        """计算色彩相似度（0-1）"""
        # 计算平均颜色
        source_mean = np.mean(source_img, axis=(0, 1))
        target_mean = np.mean(target_img, axis=(0, 1))

        # 计算颜色距离（归一化到 0-1）
        color_diff = np.linalg.norm(source_mean - target_mean)
        similarity = 1.0 - min(1.0, color_diff / 255.0)
        return similarity

    def _calculate_semantic_similarity(
        self, source_img: np.ndarray, target_img: np.ndarray
    ) -> float:
        """计算语义相似度（简化：基于颜色和纹理）"""
        # 简化实现：基于颜色分布和纹理特征
        source_colors = cv2.calcHist(
            [source_img], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256]
        )
        target_colors = cv2.calcHist(
            [target_img], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256]
        )

        # 归一化
        source_colors = source_colors / (source_colors.sum() + 1e-6)
        target_colors = target_colors / (target_colors.sum() + 1e-6)

        # 计算相关性
        correlation = cv2.compareHist(
            source_colors, target_colors, cv2.HISTCMP_CORREL
        )
        return max(0.0, min(1.0, correlation))

    def _calculate_composition_similarity(
        self, source_img: np.ndarray, target_img: np.ndarray
    ) -> float:
        """计算构图相似度（基于边缘和关键点）"""
        # 使用 ORB 特征点匹配
        orb = cv2.ORB_create()
        kp1, des1 = orb.detectAndCompute(
            cv2.cvtColor(source_img, cv2.COLOR_RGB2GRAY), None
        )
        kp2, des2 = orb.detectAndCompute(
            cv2.cvtColor(target_img, cv2.COLOR_RGB2GRAY), None
        )

        if des1 is None or des2 is None or len(des1) < 10 or len(des2) < 10:
            return 0.5  # 默认中等相似度

        # 特征匹配
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = bf.match(des1, des2)
        matches = sorted(matches, key=lambda x: x.distance)

        # 计算匹配率
        match_ratio = len(matches) / max(len(kp1), len(kp2))
        return min(1.0, match_ratio * 2)  # 归一化到 0-1

    def _calculate_dynamic_similarity(
        self, source_img: np.ndarray, target_img: np.ndarray
    ) -> float:
        """计算动态属性相似度（简化：基于模糊度）"""
        # 使用拉普拉斯算子检测模糊度
        source_blur = cv2.Laplacian(
            cv2.cvtColor(source_img, cv2.COLOR_RGB2GRAY), cv2.CV_64F
        ).var()
        target_blur = cv2.Laplacian(
            cv2.cvtColor(target_img, cv2.COLOR_RGB2GRAY), cv2.CV_64F
        ).var()

        # 计算相似度
        blur_diff = abs(source_blur - target_blur) / max(source_blur, target_blur, 1)
        return max(0.0, 1.0 - blur_diff)

    def _calculate_texture_similarity(
        self, source_img: np.ndarray, target_img: np.ndarray
    ) -> float:
        """计算纹理相似度"""
        # 使用局部二值模式（LBP）简化实现
        # 这里简化为基于灰度共生矩阵的对比度
        source_gray = cv2.cvtColor(source_img, cv2.COLOR_RGB2GRAY)
        target_gray = cv2.cvtColor(target_img, cv2.COLOR_RGB2GRAY)

        # 计算对比度（简化）
        source_std = np.std(source_gray)
        target_std = np.std(target_gray)

        std_diff = abs(source_std - target_std) / max(source_std, target_std, 1)
        return max(0.0, 1.0 - std_diff)

    def _calculate_quality_score(
        self, source_img: np.ndarray, target_img: np.ndarray
    ) -> float:
        """计算图像质量得分"""
        # 基于分辨率和清晰度
        source_resolution = source_img.shape[0] * source_img.shape[1]
        target_resolution = target_img.shape[0] * target_img.shape[1]

        # 分辨率相似度
        res_ratio = min(source_resolution, target_resolution) / max(
            source_resolution, target_resolution
        )

        # 清晰度（拉普拉斯方差）
        source_sharp = cv2.Laplacian(
            cv2.cvtColor(source_img, cv2.COLOR_RGB2GRAY), cv2.CV_64F
        ).var()
        target_sharp = cv2.Laplacian(
            cv2.cvtColor(target_img, cv2.COLOR_RGB2GRAY), cv2.CV_64F
        ).var()

        sharp_ratio = min(source_sharp, target_sharp) / max(source_sharp, target_sharp, 1)

        return (res_ratio + sharp_ratio) / 2

    def _calculate_postprocessing_similarity(
        self, source_img: np.ndarray, target_img: np.ndarray
    ) -> float:
        """计算后期特征相似度"""
        # 检测 vignette（暗角）和对比度
        source_center = source_img[
            source_img.shape[0] // 4 : 3 * source_img.shape[0] // 4,
            source_img.shape[1] // 4 : 3 * source_img.shape[1] // 4,
        ]
        target_center = target_img[
            target_img.shape[0] // 4 : 3 * target_img.shape[0] // 4,
            target_img.shape[1] // 4 : 3 * target_img.shape[1] // 4,
        ]

        source_center_bright = np.mean(source_center)
        target_center_bright = np.mean(target_center)
        source_edge_bright = np.mean(
            np.concatenate(
                [
                    source_img[0, :].flatten(),
                    source_img[-1, :].flatten(),
                    source_img[:, 0].flatten(),
                    source_img[:, -1].flatten(),
                ]
            )
        )
        target_edge_bright = np.mean(
            np.concatenate(
                [
                    target_img[0, :].flatten(),
                    target_img[-1, :].flatten(),
                    target_img[:, 0].flatten(),
                    target_img[:, -1].flatten(),
                ]
            )
        )

        source_vignette = source_center_bright - source_edge_bright
        target_vignette = target_center_bright - target_edge_bright

        vignette_diff = abs(source_vignette - target_vignette) / max(
            abs(source_vignette), abs(target_vignette), 1
        )
        return max(0.0, 1.0 - vignette_diff)

    def _map_difficulty(self, score: float) -> str:
        """映射难度等级"""
        if score >= 0.75:
            return "低"
        elif score >= 0.50:
            return "中"
        elif score >= 0.30:
            return "高"
        else:
            return "极高/不建议"

    def _calculate_confidence(self, metrics: Dict[str, float]) -> float:
        """计算置信度"""
        # 基于各指标的一致性
        values = list(metrics.values())
        std = np.std(values)
        mean = np.mean(values)
        consistency = 1.0 - min(1.0, std / (mean + 1e-6))
        return max(0.5, consistency)

    def _get_dominant_factors(self, metrics: Dict[str, float]) -> list:
        """获取 Top-3 拖累因子"""
        factor_names = {
            "L": "光线相似度",
            "C": "色彩相似度",
            "S": "语义相似度",
            "P": "构图相似度",
            "D": "动态属性",
            "T": "纹理相似度",
            "Q": "分辨率与质量",
            "R": "后期特征",
        }

        # 按得分排序，找出最低的 3 个
        sorted_factors = sorted(metrics.items(), key=lambda x: x[1])
        top3 = sorted_factors[:3]

        return [
            {
                "name": factor_names[k],
                "score": float(v),
                "weight": float(self.WEIGHTS[k]),
                "reason": self._get_factor_reason(k, v),
            }
            for k, v in top3
        ]

    def _get_factor_reason(self, factor_key: str, score: float) -> str:
        """获取因子原因说明"""
        reasons = {
            "L": "光线方向或强度差异明显",
            "C": "色温差或主色调差异较大",
            "S": "场景元素或主体类型差异",
            "P": "构图或透视关系差异",
            "D": "动态效果或曝光属性差异",
            "T": "纹理或颗粒感差异",
            "Q": "分辨率或图像质量差异",
            "R": "后期处理特征差异",
        }
        base_reason = reasons.get(factor_key, "该维度存在差异")
        if score < 0.3:
            return f"{base_reason}，差异较大"
        elif score < 0.5:
            return f"{base_reason}，存在一定差异"
        else:
            return f"{base_reason}，差异较小"

    def _generate_recommendations(
        self, metrics: Dict[str, float], dominant_factors: list
    ) -> list:
        """生成推荐操作"""
        recommendations = []
        for factor in dominant_factors[:2]:  # Top-2
            name = factor["name"]
            if "色彩" in name:
                recommendations.append(
                    {
                        "action": "统一白平衡",
                        "why": "色温差距可能导致肤色或天空颜色偏移",
                    }
                )
            elif "光线" in name:
                recommendations.append(
                    {
                        "action": "调整拍摄角度或补光",
                        "why": "光源方向差异会影响整体氛围",
                    }
                )
            elif "构图" in name:
                recommendations.append(
                    {
                        "action": "尝试裁切目标图以对齐构图",
                        "why": "构图差异会影响风格复刻效果",
                    }
                )
            else:
                recommendations.append(
                    {
                        "action": f"调整{name}相关参数",
                        "why": "该维度差异可能影响最终效果",
                    }
                )
        return recommendations

    def _generate_explanation(
        self, score: float, difficulty: str, dominant_factors: list
    ) -> str:
        """生成自然语言解释"""
        score_pct = int(score * 100)
        if difficulty == "低":
            base = f"总体可行（{score_pct}%），"
        elif difficulty == "中":
            base = f"总体可行但需注意（{score_pct}%），"
        elif difficulty == "高":
            base = f"复刻难度较高（{score_pct}%），"
        else:
            base = f"复刻难度极高（{score_pct}%），"

        if dominant_factors:
            top_factor = dominant_factors[0]["name"]
            base += f"主要限制因素为{top_factor}。"
        else:
            base += "各维度表现均衡。"

        return base

    def _create_deal_breaker_result(self, deal_breakers: list) -> Dict[str, Any]:
        """创建 deal-breaker 结果"""
        return {
            "feasibilityScore": 0.0,
            "difficulty": "极高/不建议",
            "confidence": 0.9,
            "dealBreakers": deal_breakers,
            "dominantFactors": [],
            "recommendedActions": [
                {"action": "更换目标图", "why": "存在致命不兼容因素"},
                {"action": "重新拍摄", "why": "建议在相似条件下拍摄"},
            ],
            "metrics": {k: 0.0 for k in self.WEIGHTS.keys()},
            "explanation": f"检测到致命不兼容因素：{', '.join(deal_breakers)}，不建议继续复刻。",
        }

    def _create_error_result(self, error_msg: str) -> Dict[str, Any]:
        """创建错误结果"""
        return {
            "feasibilityScore": 0.0,
            "difficulty": "极高/不建议",
            "confidence": 0.0,
            "dealBreakers": [error_msg],
            "dominantFactors": [],
            "recommendedActions": [],
            "metrics": {k: 0.0 for k in self.WEIGHTS.keys()},
            "explanation": f"评估失败：{error_msg}",
        }

