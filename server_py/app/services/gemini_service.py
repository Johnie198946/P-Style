"""
Gemini 服务 - 增强版，支持 Part1/Part2/Part3 和缓存
根据开发方案第 22 节实现
"""
import os
import time
from typing import List, Dict, Any, Optional
from loguru import logger

try:
    from google import genai
except ImportError:
    genai = None
    logger.warning("google.genai 不可用，请安装: pip install google-genai")


class GeminiService:
    """Gemini API 服务封装"""

    def __init__(self, api_key: str, model: str = "gemini-2.5-pro", flash_model: str = "gemini-2.5-flash-image"):
        self.api_key = api_key
        self.model = model
        self.flash_model = flash_model
        self._client = None
        self._cache_map = {}  # cachedContent ID 映射

        if genai and api_key:
            self._client = genai.Client(api_key=api_key)
        else:
            logger.warning("Gemini SDK 不可用或未配置 API Key")

    def _ensure_client(self):
        if not self._client:
            raise RuntimeError("Gemini 客户端未初始化")

    def generate_text(
        self,
        contents: List[Dict[str, Any]],
        *,
        response_mime: Optional[str] = "application/json",
        stage: str = "unknown",
        use_cache: bool = True,
    ) -> str:
        """
        生成文本（Part1/Part2）
        
        Args:
            contents: 内容列表（包含文本和图片）
            response_mime: 响应 MIME 类型（默认 JSON）
            stage: 阶段标识（用于日志）
            use_cache: 是否使用 cachedContent
        """
        self._ensure_client()
        start_time = time.time()

        try:
            payload: Dict[str, Any] = {
                "model": self.model,
                "contents": contents,
            }

            if response_mime:
                payload["generation_config"] = {"response_mime_type": response_mime}

            # 尝试使用缓存（如果启用）
            if use_cache and stage in self._cache_map:
                cache_id = self._cache_map[stage]
                payload["cached_content"] = cache_id

            resp = self._client.models.generate_content(payload)

            elapsed = time.time() - start_time
            logger.info(f"Gemini {stage} 调用完成，耗时: {elapsed:.2f}s")

            # 提取文本
            text_parts = []
            for cand in getattr(resp, "response", {}).get("candidates", []):
                for part in cand.get("content", {}).get("parts", []):
                    if "text" in part:
                        text_parts.append(part["text"])

            result = "\n".join(text_parts).strip()
            if not result:
                raise ValueError("Gemini 返回为空")

            return result

        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"Gemini {stage} 调用失败，耗时: {elapsed:.2f}s，错误: {e}")
            raise

    def generate_image(
        self,
        contents: List[Dict[str, Any]],
        *,
        stage: str = "part3",
        use_cache: bool = True,
    ) -> str:
        """
        生成图片（Part3 - Gemini Flash Image）
        
        Args:
            contents: 内容列表
            stage: 阶段标识
            use_cache: 是否使用缓存
        
        Returns:
            Base64 编码的图片数据
        """
        self._ensure_client()
        start_time = time.time()

        try:
            payload: Dict[str, Any] = {
                "model": self.flash_model,
                "contents": contents,
            }

            if use_cache and stage in self._cache_map:
                cache_id = self._cache_map[stage]
                payload["cached_content"] = cache_id

            resp = self._client.models.generate_content(payload)

            elapsed = time.time() - start_time
            logger.info(f"Gemini {stage} 图片生成完成，耗时: {elapsed:.2f}s")

            # 提取图片
            for cand in getattr(resp, "response", {}).get("candidates", []):
                for part in cand.get("content", {}).get("parts", []):
                    if "inline_data" in part:
                        return part["inline_data"].get("data", "")
                    elif "file_data" in part:
                        # 如果是文件引用，需要下载
                        file_uri = part["file_data"].get("file_uri", "")
                        # TODO: 实现文件下载逻辑
                        logger.warning(f"收到文件引用: {file_uri}，暂不支持")

            raise ValueError("Gemini 未返回图片数据")

        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"Gemini {stage} 图片生成失败，耗时: {elapsed:.2f}s，错误: {e}")
            raise

    def create_cache(self, contents: List[Dict[str, Any]], ttl_seconds: int = 43200) -> str:
        """
        创建 cachedContent
        
        Args:
            contents: 固定指令内容
            ttl_seconds: 缓存有效期（秒）
        
        Returns:
            cache_id
        """
        self._ensure_client()
        try:
            resp = self._client.caches.create(
                contents=contents,
                ttl=f"{ttl_seconds}s",
            )
            cache_id = getattr(resp, "name", "").split("/")[-1]
            logger.info(f"创建 cachedContent: {cache_id}")
            return cache_id
        except Exception as e:
            logger.error(f"创建 cachedContent 失败: {e}")
            raise

    def register_cache(self, stage: str, cache_id: str):
        """注册缓存 ID 到阶段"""
        self._cache_map[stage] = cache_id
        logger.info(f"注册 {stage} 缓存: {cache_id}")


def get_gemini_service() -> GeminiService:
    """获取 Gemini 服务实例（单例）"""
    from ..config import get_settings

    settings = get_settings()
    return GeminiService(
        api_key=settings.GEMINI_API_KEY,
        model=settings.GEMINI_MODEL,
        flash_model=settings.GEMINI_FLASH_MODEL,
    )

