"""
请求日志中间件
用于记录请求信息，特别是 Form 数据相关的请求，便于排查问题
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from loguru import logger
import time


class RequestLoggerMiddleware(BaseHTTPMiddleware):
    """
    请求日志中间件
    记录请求路径、方法、Content-Type、Content-Length 等信息
    不记录完整的请求体（避免日志过大），只记录关键信息
    """
    
    async def dispatch(self, request: Request, call_next):
        """
        处理请求并记录日志
        
        Args:
            request: Starlette 请求对象
            call_next: 下一个中间件或路由处理函数
        
        Returns:
            Response: HTTP 响应对象
        """
        start_time = time.time()
        
        # 【重要】记录所有请求（包括 OPTIONS 预检请求），用于调试
        # 这样可以确认请求是否到达后端
        path = request.url.path
        method = request.method
        logger.info(f"【请求中间件】收到请求: {method} {path}")
        
        # 记录请求基本信息
        content_type = request.headers.get("content-type", "")
        content_length = request.headers.get("content-length", "未知")
        
        # 【JSON 数据请求处理】对于 JSON 数据请求（如 Part1 接口），也记录详细信息
        if "application/json" in content_type:
            logger.info(f"【请求中间件】收到 JSON 数据请求: {method} {path}, Content-Type={content_type}, Content-Length={content_length}")
            # 【重要】特殊处理：如果是登录接口，记录详细信息
            if '/api/auth/login' in path:
                logger.info("=" * 80)
                logger.info(f"【请求中间件】🔐 用户登录接口请求: {method} {path}")
                logger.info(f"【请求中间件】Content-Type={content_type}, Content-Length={content_length}")
                # 记录 Origin 头，用于 CORS 调试
                origin = request.headers.get("Origin", "未提供")
                logger.info(f"【请求中间件】登录请求 Origin 头: {origin}")
                # 检查请求体大小
                if content_length != "未知":
                    try:
                        content_length_int = int(content_length)
                        logger.info(f"【请求中间件】登录请求体大小: {content_length_int} 字节")
                    except (ValueError, TypeError):
                        pass
                logger.info("=" * 80)
            # 【重要】特殊处理：如果是 AI 诊断接口，记录详细信息
            if '/api/analyze/diagnosis' in path:
                logger.info("=" * 80)
                logger.info(f"【请求中间件】🔍 AI 诊断接口请求: {method} {path}")
                logger.info(f"【请求中间件】Content-Type={content_type}, Content-Length={content_length}")
                # 记录 Authorization 头（但不记录完整的 Token，只记录是否存在）
                auth_header = request.headers.get("Authorization", "未提供")
                if auth_header != "未提供":
                    logger.info(f"【请求中间件】AI 诊断 Authorization 头: 已提供（长度={len(auth_header)} 字符）")
                else:
                    logger.warning(f"【请求中间件】⚠️ AI 诊断 Authorization 头: 未提供，可能导致认证失败")
                # 记录 Origin 头，用于 CORS 调试
                origin = request.headers.get("Origin", "未提供")
                logger.info(f"【请求中间件】AI 诊断 Origin 头: {origin}")
                # 检查请求体大小
                if content_length != "未知":
                    try:
                        content_length_int = int(content_length)
                        logger.info(f"【请求中间件】AI 诊断请求体大小: {content_length_int / 1024:.2f} KB")
                        if content_length_int > 10 * 1024 * 1024:  # 大于 10MB
                            logger.warning(f"【请求中间件】⚠️ AI 诊断请求体较大: {content_length_int / 1024 / 1024:.2f} MB")
                    except (ValueError, TypeError):
                        pass
                logger.info("=" * 80)
            # 特殊处理：如果是 Part1 接口，记录更详细的信息
            if '/api/analyze/part1' in path:
                logger.info(f"【请求中间件】Part1 分析接口请求: Content-Type={content_type}, Content-Length={content_length}")
                # 记录 Authorization 头（但不记录完整的 Token，只记录是否存在）
                auth_header = request.headers.get("Authorization", "未提供")
                if auth_header != "未提供":
                    logger.info(f"【请求中间件】Part1 Authorization 头: 已提供（长度={len(auth_header)} 字符）")
                else:
                    logger.warning(f"【请求中间件】Part1 Authorization 头: 未提供，可能导致认证失败")
                # 记录 Origin 头，用于 CORS 调试
                origin = request.headers.get("Origin", "未提供")
                logger.info(f"【请求中间件】Part1 Origin 头: {origin}")
                # 检查请求体大小
                if content_length != "未知":
                    try:
                        content_length_int = int(content_length)
                        logger.info(f"【请求中间件】Part1 请求体大小: {content_length_int / 1024:.2f} KB")
                        if content_length_int > 10 * 1024 * 1024:  # 大于 10MB
                            logger.warning(f"【请求中间件】Part1 请求体较大: {content_length_int / 1024 / 1024:.2f} MB")
                    except (ValueError, TypeError):
                        pass
        
        # 【Form 数据请求处理】对于 Form 数据请求，记录更详细的信息
        # 注意：multipart/form-data 请求需要特殊处理，因为可能包含大文件或大字符串
        if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
            logger.info(f"【请求中间件】收到 Form 数据请求: {method} {path}, Content-Type={content_type}, Content-Length={content_length}")
            
            # 特殊处理：如果是 Part2 接口，记录详细信息
            if '/api/analyze/part2' in path:
                logger.info(f"【请求中间件】Part2 接口请求: Content-Type={content_type}, Content-Length={content_length}")
                # 记录 Authorization 头（但不记录完整的 Token，只记录是否存在）
                auth_header = request.headers.get("Authorization", "未提供")
                if auth_header != "未提供":
                    logger.info(f"【请求中间件】Part2 Authorization 头: 已提供（长度={len(auth_header)} 字符）")
                else:
                    logger.warning(f"【请求中间件】Part2 Authorization 头: 未提供，可能导致认证失败")
            
            # 特殊处理：如果是可行性评估接口，记录更详细的信息
            if '/api/analyze/feasibility' in path:
                logger.info(f"【请求中间件】可行性评估接口请求: Content-Type={content_type}, Content-Length={content_length}")
                # 记录 Authorization 头（但不记录完整的 Token，只记录是否存在）
                auth_header = request.headers.get("Authorization", "未提供")
                if auth_header != "未提供":
                    logger.info(f"【请求中间件】Authorization 头: 已提供（长度={len(auth_header)} 字符）")
                    # 记录 Token 的前几个字符，便于调试（但不记录完整 Token）
                    token_preview = auth_header[:20] + "..." if len(auth_header) > 20 else auth_header
                    logger.debug(f"【请求中间件】Authorization 头预览: {token_preview}")
                else:
                    logger.warning(f"【请求中间件】Authorization 头: 未提供，可能导致认证失败")
            
            # 特殊处理：如果是 Part1 分析接口，记录更详细的信息
            if '/api/analyze/part1' in path:
                logger.info(f"【请求中间件】Part1 分析接口请求: Content-Type={content_type}, Content-Length={content_length}")
                # 记录 Authorization 头（但不记录完整的 Token，只记录是否存在）
                auth_header = request.headers.get("Authorization", "未提供")
                if auth_header != "未提供":
                    logger.info(f"【请求中间件】Part1 Authorization 头: 已提供（长度={len(auth_header)} 字符）")
                else:
                    logger.warning(f"【请求中间件】Part1 Authorization 头: 未提供，可能导致认证失败")
                # 记录 Origin 头，用于 CORS 调试
                origin = request.headers.get("Origin", "未提供")
                logger.info(f"【请求中间件】Part1 Origin 头: {origin}")
            
            # 特殊处理：如果是 AI 诊断接口，记录更详细的信息
            if '/api/analyze/diagnosis' in path:
                logger.info(f"【请求中间件】AI 诊断接口请求: Content-Type={content_type}, Content-Length={content_length}")
                # 记录 Authorization 头（但不记录完整的 Token，只记录是否存在）
                auth_header = request.headers.get("Authorization", "未提供")
                if auth_header != "未提供":
                    logger.info(f"【请求中间件】AI 诊断 Authorization 头: 已提供（长度={len(auth_header)} 字符）")
                    # 记录 Token 的前几个字符，便于调试（但不记录完整 Token）
                    token_preview = auth_header[:20] + "..." if len(auth_header) > 20 else auth_header
                    logger.debug(f"【请求中间件】AI 诊断 Authorization 头预览: {token_preview}")
                else:
                    logger.warning(f"【请求中间件】AI 诊断 Authorization 头: 未提供，可能导致认证失败")
                # 记录 Origin 头，用于 CORS 调试
                origin = request.headers.get("Origin", "未提供")
                logger.info(f"【请求中间件】AI 诊断 Origin 头: {origin}")
                
                # 【注意】不在这里读取请求体，因为：
                # 1. 读取请求体后需要正确恢复，否则会影响 FastAPI 的 Form 数据解析
                # 2. 如果 Form 解析失败，异常处理器会记录详细的错误信息
                # 3. 如果 Form 解析成功，路由函数会记录参数信息
                # 这里只记录请求头信息，避免影响请求处理
            
            # 尝试读取请求体大小（但不读取完整内容，避免内存问题）
            try:
                # 注意：读取请求体后需要重新创建请求对象，否则后续无法读取
                # 这里只记录 Content-Length，不实际读取请求体
                if content_length != "未知":
                    content_length_int = int(content_length)
                    logger.info(f"【请求中间件】请求体大小: {content_length_int / 1024 / 1024:.2f} MB, 路径={path}")
                    if content_length_int > 10 * 1024 * 1024:  # 大于 10MB
                        logger.warning(f"【请求中间件】请求体较大: {content_length_int / 1024 / 1024:.2f} MB, 路径={path}")
                    elif content_length_int > 100 * 1024 * 1024:  # 大于 100MB
                        logger.error(f"【请求中间件】请求体过大: {content_length_int / 1024 / 1024:.2f} MB, 路径={path}, 可能导致解析失败")
            except (ValueError, TypeError):
                pass
        
        # 处理请求
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # 【响应信息记录】记录响应状态码和耗时
            status_code = response.status_code
            if status_code >= 400:
                logger.warning(f"【请求中间件】请求返回错误: {method} {path}, 状态码={status_code}, 耗时={process_time:.3f}s")
                # 特殊处理：如果是可行性评估接口的 400 错误，记录更详细的信息
                if '/api/analyze/feasibility' in path and status_code == 400:
                    logger.error(f"【请求中间件】可行性评估接口返回 400 错误，可能是 Form 数据解析失败或参数验证失败")
                    logger.error(f"【请求中间件】Content-Type: {content_type}, Content-Length: {content_length}")
                # 特殊处理：如果是登录接口的错误，记录更详细的信息
                if '/api/auth/login' in path:
                    logger.error(f"【请求中间件】❌ 用户登录接口返回 {status_code} 错误")
                    logger.error(f"【请求中间件】Content-Type: {content_type}, Content-Length: {content_length}")
                    # 检查响应头是否包含 CORS 头
                    cors_origin = response.headers.get("Access-Control-Allow-Origin", "未设置")
                    logger.error(f"【请求中间件】登录响应 CORS 头: Access-Control-Allow-Origin={cors_origin}")
                    if cors_origin == "未设置":
                        logger.error(f"【请求中间件】⚠️ 登录响应缺少 CORS 头，可能导致浏览器阻止跨域请求")
                # 特殊处理：如果是 AI 诊断接口的错误，记录更详细的信息
                if '/api/analyze/diagnosis' in path:
                    logger.error(f"【请求中间件】❌ AI 诊断接口返回 {status_code} 错误")
                    logger.error(f"【请求中间件】Content-Type: {content_type}, Content-Length: {content_length}")
                    # 检查响应头是否包含 CORS 头
                    cors_origin = response.headers.get("Access-Control-Allow-Origin", "未设置")
                    logger.error(f"【请求中间件】AI 诊断响应 CORS 头: Access-Control-Allow-Origin={cors_origin}")
                    if cors_origin == "未设置":
                        logger.error(f"【请求中间件】⚠️ AI 诊断响应缺少 CORS 头，可能导致浏览器阻止跨域请求")
            else:
                # 【重要】对于登录接口的成功请求，也记录详细信息
                if '/api/auth/login' in path:
                    logger.info(f"【请求中间件】✅ 用户登录接口请求成功: {method} {path}, 状态码={status_code}, 耗时={process_time:.3f}s")
                # 【重要】对于 AI 诊断接口的成功请求，也记录详细信息
                elif '/api/analyze/diagnosis' in path:
                    logger.info(f"【请求中间件】✅ AI 诊断接口请求成功: {method} {path}, 状态码={status_code}, 耗时={process_time:.3f}s")
                else:
                    # 其他成功请求使用 debug 级别记录
                    logger.debug(f"【请求中间件】请求成功: {method} {path}, 状态码={status_code}, 耗时={process_time:.3f}s")
            
            return response
        except Exception as e:
            process_time = time.time() - start_time
            error_type = type(e).__name__
            error_detail = str(e)
            # 【重要】记录异常详情，特别是 RequestValidationError
            logger.error(f"【请求中间件】请求处理异常: {method} {path}, 异常类型={error_type}, 异常详情={error_detail}, 耗时={process_time:.3f}s")
            # 如果是 RequestValidationError，记录更详细的信息
            if "RequestValidationError" in error_type or "validation" in error_type.lower():
                logger.error(f"【请求中间件】这是参数验证错误，应该由 RequestValidationError 异常处理器处理")
                if hasattr(e, 'errors'):
                    try:
                        error_errors = e.errors()
                        logger.error(f"【请求中间件】验证错误详情: {error_errors}")
                    except:
                        pass
            # 重新抛出异常，让 FastAPI 的异常处理器处理
            raise

