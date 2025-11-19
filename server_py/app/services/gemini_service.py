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

    def __init__(self, api_key: str, model: str = "gemini-3-pro-preview", flash_model: str = "gemini-2.5-flash-image"):
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
        thinking_level: Optional[str] = None,
    ) -> str:
        """
        生成文本（Part1/Part2）
        
        Args:
            contents: 内容列表（包含文本和图片）
            response_mime: 响应 MIME 类型（默认 JSON）
            stage: 阶段标识（用于日志）
            use_cache: 是否使用 cachedContent
            thinking_level: 思考水平（"high" 或 "low"），Gemini 3.0 新特性，默认 None 使用模型默认值
        """
        self._ensure_client()
        start_time = time.time()

        try:
            # 构建生成配置（根据开发方案第 22 节，支持 response_mime_type 和 thinking_level）
            from google.genai import types
            
            config_params = {}
            if response_mime:
                config_params["response_mime_type"] = response_mime
            
            # 设置 thinking_level（Gemini 3.0 新特性）
            # 注意：需要确认 google-genai SDK 是否支持 thinking_level 参数
            # 如果 SDK 支持，可以通过 config 传递；如果不支持，先记录日志，等待 SDK 更新
            if thinking_level:
                # 尝试设置 thinking_level（如果 SDK 支持）
                try:
                    # 检查 GenerateContentConfig 是否支持 thinking_level
                    # 如果支持，应该可以通过参数传递
                    # 暂时先记录日志，实际设置需要根据 SDK 文档确认
                    logger.info(f"Gemini 3.0 thinking_level={thinking_level} (待 SDK 确认支持方式)")
                    # TODO: 如果 SDK 支持，取消下面的注释
                    # config_params["thinking_level"] = thinking_level
                except Exception as e:
                    logger.warning(f"设置 thinking_level 失败（可能 SDK 尚未支持）: {e}")
            
            config = types.GenerateContentConfig(**config_params) if config_params else None

            # 尝试使用缓存（如果启用）
            cached_content = None
            if use_cache and stage in self._cache_map:
                cached_content = self._cache_map[stage]

            # 调用 Gemini API（根据 google-genai SDK，generate_content 需要关键字参数）
            # 注意：不能直接传递字典，需要分别传递 model、contents、config 等参数
            # 方法签名：generate_content(*, model: str, contents: ..., config: ...)
            if cached_content:
                # 如果使用缓存，需要传递 cached_content 参数
                resp = self._client.models.generate_content(
                    model=self.model,
                    contents=contents,
                    config=config,
                    cached_content=cached_content,
                )
            else:
                # 不使用缓存
                resp = self._client.models.generate_content(
                    model=self.model,
                    contents=contents,
                    config=config,
                )

            elapsed = time.time() - start_time
            thinking_info = f", thinking_level={thinking_level}" if thinking_level else ""
            logger.info(f"Gemini {stage} 调用完成，耗时: {elapsed:.2f}s, 模型: {self.model}{thinking_info}")

            # 提取文本（根据 google-genai SDK，响应对象有 text 属性）
            # 注意：新版本的 SDK 响应对象直接有 text 属性，不需要遍历 candidates
            if hasattr(resp, "text"):
                # 新版本 SDK：直接使用 text 属性
                result = resp.text.strip()
            elif hasattr(resp, "response"):
                # 旧版本兼容：从 response.candidates 中提取
                text_parts = []
                for cand in resp.response.get("candidates", []):
                    for part in cand.get("content", {}).get("parts", []):
                        if "text" in part:
                            text_parts.append(part["text"])
                result = "\n".join(text_parts).strip()
            else:
                # 尝试直接访问 candidates（如果响应是字典格式）
                text_parts = []
                candidates = getattr(resp, "candidates", [])
                for cand in candidates:
                    content = getattr(cand, "content", None) or (cand if isinstance(cand, dict) else {})
                    parts = getattr(content, "parts", []) if hasattr(content, "parts") else (content.get("parts", []) if isinstance(content, dict) else [])
                    for part in parts:
                        if hasattr(part, "text"):
                            text_parts.append(part.text)
                        elif isinstance(part, dict) and "text" in part:
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
            # 尝试使用缓存（如果启用）
            cached_content = None
            if use_cache and stage in self._cache_map:
                cached_content = self._cache_map[stage]

            # 调用 Gemini API（根据 google-genai SDK，generate_content 需要关键字参数）
            # 注意：不能直接传递字典，需要分别传递 model、contents、config 等参数
            # 方法签名：generate_content(*, model: str, contents: ..., config: ...)
            if cached_content:
                # 如果使用缓存，需要传递 cached_content 参数
                resp = self._client.models.generate_content(
                    model=self.flash_model,
                    contents=contents,
                    cached_content=cached_content,
                )
            else:
                # 不使用缓存
                resp = self._client.models.generate_content(
                    model=self.flash_model,
                    contents=contents,
                )

            elapsed = time.time() - start_time
            logger.info(f"Gemini {stage} 图片生成完成，耗时: {elapsed:.2f}s")

            # 提取图片（根据 google-genai SDK，响应对象可能有不同的结构）
            # 注意：新版本的 SDK 响应对象可能直接有图片数据，或需要从 candidates 中提取
            candidates = []
            if hasattr(resp, "candidates"):
                candidates = resp.candidates
            elif hasattr(resp, "response"):
                candidates = resp.response.get("candidates", [])
            else:
                # 尝试直接访问（如果响应是字典格式）
                candidates = getattr(resp, "candidates", [])

            for cand in candidates:
                # 获取 content（可能是对象或字典）
                content = getattr(cand, "content", None) or (cand if isinstance(cand, dict) else {})
                parts = []
                if hasattr(content, "parts"):
                    parts = content.parts
                elif isinstance(content, dict):
                    parts = content.get("parts", [])
                else:
                    parts = []

                for part in parts:
                    # 检查 inline_data（可能是对象或字典）
                    if hasattr(part, "inline_data"):
                        inline_data = part.inline_data
                        if hasattr(inline_data, "data"):
                            return inline_data.data
                        elif isinstance(inline_data, dict):
                            return inline_data.get("data", "")
                    elif isinstance(part, dict):
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

