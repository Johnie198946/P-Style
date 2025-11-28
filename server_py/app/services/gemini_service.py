"""
Gemini 服务 - 增强版，支持 Part1/Part2/Part3 和缓存
根据开发方案第 22 节实现

【错误处理增强】
- 添加重试机制：对于网络连接错误（如 Server disconnected），自动重试最多 3 次
- 指数退避：每次重试间隔递增（1s, 2s, 4s）
- 区分错误类型：网络错误可重试，业务错误不重试
"""
import os
import time
from typing import List, Dict, Any, Optional
from loguru import logger
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
import random  # 用于添加随机抖动，避免重试风暴

try:
    from google import genai
except ImportError:
    genai = None
    logger.warning("google.genai 不可用，请安装: pip install google-genai")


class GeminiService:
    """Gemini API 服务封装"""

    def __init__(
        self,
        api_key: str,
        model: str = "gemini-3-pro-preview",
        flash_model: str = "gemini-2.5-flash-image",
        image_model: str = "gemini-3-pro-image-preview",
        timeout_ms: int = 180000,  # 【修复】默认 180 秒（毫秒），与配置文件保持一致
        # 注意：实际使用时应该通过 get_gemini_service() 获取实例，它会从配置文件读取 GEMINI_TIMEOUT_MS
        # 这个默认值仅用于直接实例化 GeminiService 的情况（如测试脚本）
    ):
        """
        初始化 Gemini 服务
        
        Args:
            api_key: Gemini API Key
            model: Part1/Part2 使用的模型（默认 gemini-3-pro-preview）
            flash_model: Part3 风格模拟使用的回退模型（默认 gemini-2.5-flash-image，快速生成，1024 像素分辨率）
            image_model: Part3 风格模拟使用的主要模型（默认 gemini-3-pro-image-preview，支持 4K 输出）
            timeout_ms: Gemini API 调用超时时间（毫秒），默认 180 秒（与配置文件保持一致）
                【重要】根据实际测试，Part1 分析可能需要 60-70 秒，AI 诊断可能需要 70+ 秒
                考虑到网络延迟和 Gemini API 响应时间波动，设置为 180 秒以确保稳定性
        """
        self.api_key = api_key
        self.model = model
        self.flash_model = flash_model
        self.image_model = image_model  # Gemini 3 Pro 图片生成模型
        self.timeout_ms = timeout_ms
        self.timeout_seconds = timeout_ms / 1000.0  # 转换为秒，用于 ThreadPoolExecutor
        self._client = None
        self._cache_map = {}  # cachedContent ID 映射
        self._executor = ThreadPoolExecutor(max_workers=1)  # 用于超时控制的线程池

        if genai and api_key:
            self._client = genai.Client(api_key=api_key)
            logger.info(f"Gemini 服务初始化成功: model={model}, flash_model={flash_model}, image_model={image_model}, timeout={timeout_ms}ms")
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
        
        Returns:
            Gemini API 返回的文本内容
        
        Raises:
            RuntimeError: 如果 Gemini 客户端未初始化
            FutureTimeoutError: 如果请求超时
            Exception: 如果 Gemini API 调用失败
        """
        self._ensure_client()
        start_time = time.time()
        
        # 【超时控制】使用 ThreadPoolExecutor 实现超时控制
        # 注意：google-genai SDK 的 generate_content 是同步方法，不能直接使用 asyncio.wait_for
        # 因此使用 ThreadPoolExecutor 在后台线程中执行，并设置超时
        def _call_gemini():
            """在后台线程中调用 Gemini API"""
            # 构建生成配置（根据开发方案第 22 节，支持 response_mime_type 和 thinking_level）
            from google.genai import types
            
            # 【补丁3：Gemini SDK 配置写法】根据 google-genai SDK 标准写法，设置 temperature 和 top_p
            # 对于结构化输出任务，temperature 设为 0.2（越低越好），top_p 设为 0.95
            # 注意：google-genai SDK 使用 types.GenerateContentConfig 来配置生成参数
            config = None
            try:
                # 【补丁3】根据 google-genai SDK 标准写法，通过 GenerateContentConfig 传递所有配置参数
                generation_config_params = {}
                if response_mime:
                    generation_config_params["response_mime_type"] = response_mime
                generation_config_params["temperature"] = 0.2  # 保持冷静，不要胡编乱造（对于结构化输出任务，越低越好）
                generation_config_params["top_p"] = 0.95
                generation_config_params["top_k"] = 64
                generation_config_params["max_output_tokens"] = 8192
                
                # 设置 thinking_level（Gemini 3.0 新特性）
                # 注意：需要确认 google-genai SDK 是否支持 thinking_level 参数
                if thinking_level:
                    # 尝试设置 thinking_level（如果 SDK 支持）
                    logger.info(f"【补丁3】Gemini 3.0 thinking_level={thinking_level} (尝试设置)")
                    # TODO: 如果 SDK 支持，取消下面的注释
                    # generation_config_params["thinking_level"] = thinking_level
                
                # 使用 types.GenerateContentConfig 创建配置对象
                config = types.GenerateContentConfig(**generation_config_params)
                logger.info(f"【补丁3】Gemini generation_config 已设置: temperature=0.2, top_p=0.95, top_k=64, max_output_tokens=8192")
            except Exception as e:
                # 如果 SDK 不支持某些参数，回退到只设置 response_mime_type
                logger.warning(f"【补丁3】设置 generation_config 失败（可能 SDK 版本不支持）: {e}，回退到只设置 response_mime_type")
                try:
                    if response_mime:
                        config = types.GenerateContentConfig(response_mime_type=response_mime)
                    else:
                        config = None
                except Exception as fallback_e:
                    logger.warning(f"【补丁3】回退配置也失败: {fallback_e}，使用 None")
                    config = None

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

        # 【重试机制】对于网络连接错误，自动重试最多 3 次
        max_retries = 3
        retry_delays = [1, 2, 4]  # 指数退避：1秒、2秒、4秒
        
        for attempt in range(max_retries):
            try:
                # 【超时控制】使用 ThreadPoolExecutor 执行 Gemini API 调用，并设置超时
                if attempt == 0:
                    logger.info(f"Gemini {stage} 开始调用，超时设置: {self.timeout_seconds:.1f}秒")
                else:
                    logger.info(f"Gemini {stage} 第 {attempt + 1} 次重试，超时设置: {self.timeout_seconds:.1f}秒")
                
                future = self._executor.submit(_call_gemini)
                result = future.result(timeout=self.timeout_seconds)
                
                elapsed = time.time() - start_time
                thinking_info = f", thinking_level={thinking_level}" if thinking_level else ""
                if attempt > 0:
                    logger.info(f"Gemini {stage} 调用成功（第 {attempt + 1} 次重试），耗时: {elapsed:.2f}s, 模型: {self.model}{thinking_info}")
                else:
                    logger.info(f"Gemini {stage} 调用完成，耗时: {elapsed:.2f}s, 模型: {self.model}{thinking_info}")
                
                return result

            except FutureTimeoutError:
                elapsed = time.time() - start_time
                logger.error(f"Gemini {stage} 调用超时，耗时: {elapsed:.2f}s，超时设置: {self.timeout_seconds:.1f}秒")
                # 超时错误不重试，直接抛出
                raise TimeoutError(f"Gemini API 调用超时（超过 {self.timeout_seconds:.1f} 秒）")
            
            except Exception as e:
                elapsed = time.time() - start_time
                error_type = type(e).__name__
                error_detail = str(e)
                
                # 【判断是否可重试的错误】网络连接错误可以重试，业务错误不重试
                is_retryable = (
                    "Server disconnected" in error_detail or
                    "Connection" in error_type or
                    "RemoteProtocolError" in error_type or
                    "ConnectionError" in error_type or
                    "UNEXPECTED_EOF" in error_detail or
                    "Broken pipe" in error_detail or
                    "Connection reset" in error_detail
                )
                
                # 如果是最后一次尝试，或者不是可重试的错误，直接抛出
                if attempt == max_retries - 1 or not is_retryable:
                    logger.error(f"Gemini {stage} 调用失败，耗时: {elapsed:.2f}s，错误: {error_type}: {error_detail}")
                    raise
                
                # 如果是可重试的错误，等待后重试
                wait_time = retry_delays[attempt] + random.uniform(0, 0.5)  # 添加随机抖动，避免重试风暴
                logger.warning(f"Gemini {stage} 调用失败（可重试错误），耗时: {elapsed:.2f}s，错误: {error_type}: {error_detail}，将在 {wait_time:.2f} 秒后重试（第 {attempt + 1}/{max_retries} 次）")
                time.sleep(wait_time)

    def generate_image(
        self,
        contents: List[Dict[str, Any]],
        *,
        stage: str = "part3",
        use_cache: bool = True,
        use_gemini3_pro: bool = False,
    ) -> str:
        """
        生成图片（Part3 - 风格模拟）
        
        Args:
            contents: 内容列表（可包含多张图片和文本）
            stage: 阶段标识
            use_cache: 是否使用缓存
            use_gemini3_pro: 是否尝试使用 Gemini 3 Pro（如果支持图片生成）
        
        Returns:
            Base64 编码的图片数据
        
        Note:
            - 优先尝试使用 Gemini 3 Pro（如果 use_gemini3_pro=True）
            - 如果 Gemini 3 Pro 不支持图片生成或失败，回退到 Flash 模型
            - 根据用户需求，输出 4K 分辨率图片
        """
        self._ensure_client()
        start_time = time.time()

        try:
            # 尝试使用缓存（如果启用）
            cached_content = None
            if use_cache and stage in self._cache_map:
                cached_content = self._cache_map[stage]

            # 【模型选择策略】
            # 根据 Google Gemini API 文档（https://ai.google.dev/gemini-api/docs/image-generation），
            # Gemini 3 Pro 图片预览版（gemini-3-pro-image-preview）支持图片生成，可生成分辨率高达 4K 的图像
            # 1. 如果 use_gemini3_pro=True，优先使用 Gemini 3 Pro 图片生成模型（gemini-3-pro-image-preview）
            # 2. 如果失败，回退到 Flash 模型（gemini-2.5-flash-image，快速生成，1024 像素分辨率）
            
            model_to_use = self.flash_model  # 默认使用 Flash 模型（快速回退方案）
            if use_gemini3_pro:
                # 使用 Gemini 3 Pro 图片生成模型（支持 4K 输出）
                # 模型名称：gemini-3-pro-image-preview（根据 Google 官方文档）
                model_to_use = self.image_model  # gemini-3-pro-image-preview
                logger.info(f"【generate_image】使用 Gemini 3 Pro 图片生成模型: {model_to_use}（支持 4K 输出）")

            # 构建生成配置（支持 4K 输出）
            # 注意：根据 Google Gemini API 文档，可能需要通过 config 参数指定输出分辨率
            # 但当前 google-genai SDK 可能不支持直接指定分辨率，需要根据实际 API 文档调整
            config = {}
            # 如果 API 支持，可以添加：
            # config["generation_config"] = {"resolution": "4K"}  # 或其他配置项

            # 【第三阶段日志】记录 API 调用前的信息
            logger.info(f"【Part3 图片生成】=========================================")
            logger.info(f"【Part3 图片生成】准备调用 Gemini API，模型: {model_to_use}")
            logger.info(f"【Part3 图片生成】Contents 数量: {len(contents)}")
            logger.info(f"【Part3 图片生成】调用时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
            logger.info(f"【Part3 图片生成】=========================================")
            if contents and len(contents) > 0:
                parts_count = len(contents[0].get("parts", []))
                logger.info(f"【Part3 图片生成】Parts 数量: {parts_count}")
                # 记录每个 part 的类型
                for i, part in enumerate(contents[0].get("parts", [])):
                    if isinstance(part, dict):
                        if "inline_data" in part:
                            data_size = len(part["inline_data"].get("data", ""))
                            logger.info(f"【Part3 图片生成】  Part {i+1}: 图片数据，Base64 长度: {data_size} 字符")
                        elif "text" in part:
                            text_preview = part["text"][:200] if len(part["text"]) > 200 else part["text"]
                            logger.info(f"【Part3 图片生成】  Part {i+1}: 文本数据，长度: {len(part['text'])} 字符，预览: {text_preview}...")
            
            # 调用 Gemini API
            try:
                if cached_content:
                    logger.info(f"【Part3 图片生成】使用缓存内容调用 API")
                    resp = self._client.models.generate_content(
                        model=model_to_use,
                        contents=contents,
                        cached_content=cached_content,
                        config=config if config else None,
                    )
                else:
                    logger.info(f"【Part3 图片生成】直接调用 API（未使用缓存）")
                    resp = self._client.models.generate_content(
                        model=model_to_use,
                        contents=contents,
                        config=config if config else None,
                    )
            except Exception as e:
                # 如果 Gemini 3 Pro 图片生成模型调用失败，回退到 Flash 模型
                if use_gemini3_pro and model_to_use == self.image_model:
                    logger.warning(f"【Part3 图片生成】⚠️ Gemini 3 Pro 图片生成模型调用失败，回退到 Flash 模型")
                    logger.warning(f"【Part3 图片生成】错误信息: {str(e)}")
                    model_to_use = self.flash_model
                    # 重试使用 Flash 模型（快速生成，1024 像素分辨率）
                    logger.info(f"【Part3 图片生成】重试使用 Flash 模型: {model_to_use}")
                    if cached_content:
                        resp = self._client.models.generate_content(
                            model=model_to_use,
                            contents=contents,
                            cached_content=cached_content,
                        )
                    else:
                        resp = self._client.models.generate_content(
                            model=model_to_use,
                            contents=contents,
                        )
                    logger.info(f"【Part3 图片生成】✅ 已回退到 Flash 模型并成功调用: {model_to_use}")
                else:
                    logger.error(f"【Part3 图片生成】❌ Gemini API 调用失败: {str(e)}")
                    raise

            elapsed = time.time() - start_time
            logger.info(f"【Part3 图片生成】✅ Gemini API 调用成功，使用模型: {model_to_use}，耗时: {elapsed:.2f}s")

            # 【辅助函数】保存图片到本地文件（用于调试）
            def save_image_to_local(image_base64) -> None:
                """
                将 Base64 图片保存到本地文件
                
                Args:
                    image_base64: Base64 编码的图片数据（字符串或 bytes）
                
                Note:
                    - 如果传入的是 bytes，会先转换为字符串
                    - Base64 字符串会被解码为 bytes 并保存为 JPEG 文件
                """
                try:
                    import base64
                    from pathlib import Path
                    from datetime import datetime
                    
                    # 【类型检查】确保 image_base64 是字符串类型
                    if isinstance(image_base64, bytes):
                        try:
                            image_base64 = image_base64.decode('utf-8')
                            logger.debug(f"【Part3 图片生成】save_image_to_local: bytes 已转换为字符串")
                        except UnicodeDecodeError:
                            # 如果 UTF-8 解码失败，使用 base64 编码（将 bytes 转换为 base64 字符串）
                            image_base64 = base64.b64encode(image_base64).decode('utf-8')
                            logger.debug(f"【Part3 图片生成】save_image_to_local: bytes 使用 base64 编码转换")
                    
                    # 创建保存目录
                    test_reports_dir = Path(__file__).parent.parent / "test_reports"
                    part3_images_dir = test_reports_dir / "part3_generated_images"
                    part3_images_dir.mkdir(parents=True, exist_ok=True)
                    
                    # 生成文件名（包含时间戳）
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    image_filename = f"part3_generated_{timestamp}.jpg"
                    image_path = part3_images_dir / image_filename
                    
                    # 解码 Base64 并保存
                    # 【重要】base64.b64decode 期望接收字符串类型，如果传入 bytes 会报错
                    image_bytes = base64.b64decode(image_base64)
                    with open(image_path, "wb") as f:
                        f.write(image_bytes)
                    
                    logger.info(f"【Part3 图片生成】📸 图片已保存到本地文件: {image_path.absolute()}")
                    logger.info(f"【Part3 图片生成】💡 查看图片方法：")
                    logger.info(f"   1. 直接打开文件: open {image_path.absolute()}")
                    logger.info(f"   2. 在 Finder 中打开: open {part3_images_dir.absolute()}")
                    logger.info(f"   3. 图片文件大小: {len(image_bytes)} 字节 ({len(image_bytes) / 1024:.2f} KB)")
                except Exception as save_error:
                    logger.warning(f"【Part3 图片生成】保存图片到本地失败（不影响功能）: {save_error}")

            # 提取图片（根据 google-genai SDK，响应对象可能有不同的结构）
            # 注意：新版本的 SDK 响应对象可能直接有图片数据，或需要从 candidates 中提取
            candidates = []
            if hasattr(resp, "candidates"):
                candidates = resp.candidates
                logger.info(f"【Part3 图片生成】从 resp.candidates 获取数据，candidates 数量: {len(candidates)}")
            elif hasattr(resp, "response"):
                candidates = resp.response.get("candidates", [])
                logger.info(f"【Part3 图片生成】从 resp.response.candidates 获取数据，candidates 数量: {len(candidates)}")
            else:
                # 尝试直接访问（如果响应是字典格式）
                candidates = getattr(resp, "candidates", [])
                logger.info(f"【Part3 图片生成】从 resp.candidates（getattr）获取数据，candidates 数量: {len(candidates)}")

            if not candidates:
                logger.error(f"【Part3 图片生成】❌ 响应中没有 candidates 数据")
                raise ValueError("Gemini 响应中没有 candidates 数据")

            logger.info(f"【Part3 图片生成】开始遍历 {len(candidates)} 个 candidates")
            
            for idx, cand in enumerate(candidates):
                logger.info(f"【Part3 图片生成】处理 candidate {idx+1}/{len(candidates)}")
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
                            image_base64 = inline_data.data
                            
                            # 【类型转换】确保返回字符串类型，而不是 bytes
                            # Google Gemini API 可能返回 bytes 或字符串，需要统一转换为字符串
                            if isinstance(image_base64, bytes):
                                # 如果是 bytes，需要先解码为字符串
                                # 注意：Base64 数据本身是 ASCII 字符串，可以直接解码
                                try:
                                    image_base64 = image_base64.decode('utf-8')
                                    logger.info(f"【Part3 图片生成】⚠️ 检测到 bytes 类型，已转换为字符串")
                                except UnicodeDecodeError:
                                    # 如果 UTF-8 解码失败，尝试使用 base64 编码（将 bytes 转换为 base64 字符串）
                                    import base64 as b64_module
                                    image_base64 = b64_module.b64encode(image_base64).decode('utf-8')
                                    logger.info(f"【Part3 图片生成】⚠️ bytes 类型 UTF-8 解码失败，使用 base64 编码转换")
                            
                            # 【第三阶段日志】记录 Gemini 输出的图片信息
                            image_size = len(image_base64)
                            logger.info(f"【Part3 图片生成】✅ Gemini 成功返回图片，Base64 数据长度: {image_size} 字符")
                            logger.info(f"【Part3 图片生成】图片数据类型: {type(image_base64).__name__}")
                            logger.info(f"【Part3 图片生成】图片数据预览（前 100 字符）: {image_base64[:100]}...")
                            
                            # 【调试功能】将图片保存到本地文件（用于调试和查看）
                            logger.info(f"【Part3 图片生成】准备保存图片到本地文件...")
                            try:
                                save_image_to_local(image_base64)
                                logger.info(f"【Part3 图片生成】✅ 图片已成功保存到本地文件")
                            except Exception as save_error:
                                logger.warning(f"【Part3 图片生成】⚠️ 保存图片到本地失败（不影响功能）: {type(save_error).__name__}: {str(save_error)}")
                            
                            logger.info(f"【Part3 图片生成】✅ 成功返回图片 Base64 数据，长度: {len(image_base64)} 字符")
                            return image_base64
                        elif isinstance(inline_data, dict):
                            image_base64 = inline_data.get("data", "")
                            if image_base64:
                                # 【类型转换】确保返回字符串类型，而不是 bytes
                                if isinstance(image_base64, bytes):
                                    try:
                                        image_base64 = image_base64.decode('utf-8')
                                        logger.info(f"【Part3 图片生成】⚠️ 检测到 bytes 类型（字典），已转换为字符串")
                                    except UnicodeDecodeError:
                                        import base64 as b64_module
                                        image_base64 = b64_module.b64encode(image_base64).decode('utf-8')
                                        logger.info(f"【Part3 图片生成】⚠️ bytes 类型 UTF-8 解码失败（字典），使用 base64 编码转换")
                                
                                # 【第三阶段日志】记录 Gemini 输出的图片信息
                                image_size = len(image_base64)
                                logger.info(f"【Part3 图片生成】✅ Gemini 成功返回图片，Base64 数据长度: {image_size} 字符")
                                logger.info(f"【Part3 图片生成】图片数据类型: {type(image_base64).__name__}")
                                
                                # 【调试功能】将图片保存到本地文件
                                logger.info(f"【Part3 图片生成】准备保存图片到本地文件（字典格式）...")
                                try:
                                    save_image_to_local(image_base64)
                                    logger.info(f"【Part3 图片生成】✅ 图片已成功保存到本地文件（字典格式）")
                                except Exception as save_error:
                                    logger.warning(f"【Part3 图片生成】⚠️ 保存图片到本地失败（不影响功能）: {type(save_error).__name__}: {str(save_error)}")
                                
                                logger.info(f"【Part3 图片生成】✅ 成功返回图片 Base64 数据（字典格式），长度: {len(image_base64)} 字符")
                                return image_base64
                    elif isinstance(part, dict):
                        if "inline_data" in part:
                            image_base64 = part["inline_data"].get("data", "")
                            if image_base64:
                                # 【类型转换】确保返回字符串类型，而不是 bytes
                                if isinstance(image_base64, bytes):
                                    try:
                                        image_base64 = image_base64.decode('utf-8')
                                        logger.info(f"【Part3 图片生成】⚠️ 检测到 bytes 类型（part 字典），已转换为字符串")
                                    except UnicodeDecodeError:
                                        import base64 as b64_module
                                        image_base64 = b64_module.b64encode(image_base64).decode('utf-8')
                                        logger.info(f"【Part3 图片生成】⚠️ bytes 类型 UTF-8 解码失败（part 字典），使用 base64 编码转换")
                                
                                # 【第三阶段日志】记录 Gemini 输出的图片信息
                                image_size = len(image_base64)
                                logger.info(f"【Part3 图片生成】✅ Gemini 成功返回图片，Base64 数据长度: {image_size} 字符")
                                logger.info(f"【Part3 图片生成】图片数据类型: {type(image_base64).__name__}")
                                
                                # 【调试功能】将图片保存到本地文件
                                logger.info(f"【Part3 图片生成】准备保存图片到本地文件（part 字典格式）...")
                                try:
                                    save_image_to_local(image_base64)
                                    logger.info(f"【Part3 图片生成】✅ 图片已成功保存到本地文件（part 字典格式）")
                                except Exception as save_error:
                                    logger.warning(f"【Part3 图片生成】⚠️ 保存图片到本地失败（不影响功能）: {type(save_error).__name__}: {str(save_error)}")
                                
                                logger.info(f"【Part3 图片生成】✅ 成功返回图片 Base64 数据（part 字典格式），长度: {len(image_base64)} 字符")
                                return image_base64
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
    """
    获取 Gemini 服务实例（单例）
    根据开发方案第 22 节，支持 ClashX 代理配置
    """
    from ..config import get_settings

    settings = get_settings()
    
    # 【代理配置】根据开发方案第 22 节，设置 HTTP/HTTPS 代理环境变量
    # Gemini SDK 默认遵守上述代理环境变量，无需在代码中硬编码代理
    # 注意：只有在配置中设置了代理时才设置环境变量，避免覆盖系统已有的代理设置
    if settings.HTTP_PROXY:
        os.environ["HTTP_PROXY"] = settings.HTTP_PROXY
        logger.info(f"【Gemini 代理】设置 HTTP_PROXY={settings.HTTP_PROXY}")
    if settings.HTTPS_PROXY:
        os.environ["HTTPS_PROXY"] = settings.HTTPS_PROXY
        logger.info(f"【Gemini 代理】设置 HTTPS_PROXY={settings.HTTPS_PROXY}")
    
    # 如果配置中都没有设置，但系统环境变量中已有，则使用系统环境变量
    if not settings.HTTP_PROXY and not settings.HTTPS_PROXY:
        if "HTTP_PROXY" in os.environ or "HTTPS_PROXY" in os.environ:
            logger.info(f"【Gemini 代理】使用系统环境变量: HTTP_PROXY={os.environ.get('HTTP_PROXY', '未设置')}, HTTPS_PROXY={os.environ.get('HTTPS_PROXY', '未设置')}")
        else:
            # 【重要提示】如果没有配置代理，Gemini API 在国内无法访问
            # 建议用户配置 ClashX (7890) 或 Clash Verge (7897) 代理
            logger.warning("【Gemini 代理】未配置代理，如果无法访问 Gemini API，请检查网络或配置代理 (ClashX: 7890, Clash Verge: 7897)")
    
    return GeminiService(
        api_key=settings.GEMINI_API_KEY,
        model=settings.GEMINI_MODEL,
        flash_model=settings.GEMINI_FLASH_MODEL,
        image_model=getattr(settings, "GEMINI_IMAGE_MODEL", "gemini-3-pro-image-preview"),  # Gemini 3 Pro 图片生成模型
        timeout_ms=settings.GEMINI_TIMEOUT_MS,  # 【重要】使用配置中的超时时间
    )

