"""
高保真渲染服务 (High-Fidelity Render Service)
用途：调用 RawTherapee CLI 生成高质量预览图
"""

import os
import subprocess
import hashlib
import json
import shutil
from typing import Dict, Any, Optional, Tuple
from pathlib import Path
from loguru import logger
from datetime import datetime

from .rawtherapee_pp3_generator import RawTherapeePP3Generator
from .python_render_engine import python_render_engine


class HiFiRenderService:
    """
    高保真渲染服务
    
    【当前实现】优先使用 RawTherapee CLI 进行高保真渲染，如果 Docker 不可用则回退到 Python 引擎。
    
    【工作流程】：
    1. 接收 Lightroom JSON 参数
    2. 检查 RawTherapee Docker 容器是否可用
    3. 如果可用：使用 RawTherapee CLI 渲染（高保真）
    4. 如果不可用：使用 Python 渲染引擎（近似效果）
    5. 返回渲染后的图片路径
    
    【特性】：
    - 基于参数哈希的缓存机制
    - 异步渲染支持
    - 错误处理和日志记录
    - 支持 RawTherapee CLI 和 Python 引擎双模式
    """
    
    # 默认配置
    DEFAULT_CONFIG = {
        'docker_container': 'pstyle-rawtherapee',
        'input_dir': 'storage/uploads',
        'output_dir': 'storage/rendered',
        'xmp_dir': 'storage/xmp', # Still using xmp dir for sidecars (pp3)
        'cache_dir': 'storage/cache/rendered',
        'output_width': 1920,
        'output_height': 0,  # 0 表示按比例
        'output_format': 'jpg',
        'output_quality': 90,
        'timeout_seconds': 60, # RawTherapee might take longer
    }
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        初始化高保真渲染服务
        
        Args:
            config: 配置字典，可覆盖默认配置
        """
        self.config = {**self.DEFAULT_CONFIG, **(config or {})}
        self.pp3_generator = RawTherapeePP3Generator()
        self.logger = logger.bind(service="HiFiRenderService")
        
        # 确保目录存在
        self._ensure_directories()
        
        self.logger.info(f"高保真渲染服务初始化完成，配置: {self.config}")
    
    def _ensure_directories(self):
        """确保必要的目录存在"""
        base_path = Path(__file__).parent.parent.parent  # server_py 目录
        
        for dir_key in ['output_dir', 'xmp_dir', 'cache_dir']:
            dir_path = base_path / self.config[dir_key]
            dir_path.mkdir(parents=True, exist_ok=True)
            self.logger.debug(f"确保目录存在: {dir_path}")
    
    def _get_base_path(self) -> Path:
        """获取项目根目录"""
        return Path(__file__).parent.parent.parent
    
    def _generate_cache_key(self, image_path: str, lr_params: Dict[str, Any]) -> str:
        """
        生成缓存键
        
        Args:
            image_path: 原图路径
            lr_params: Lightroom 参数
            
        Returns:
            缓存键字符串
        """
        # 组合图片路径和参数生成唯一哈希
        key_data = {
            'image': os.path.basename(image_path),
            'params': lr_params,
            'width': self.config['output_width'],
            'quality': self.config['output_quality'],
        }
        key_json = json.dumps(key_data, sort_keys=True)
        return hashlib.sha256(key_json.encode()).hexdigest()[:32]
    
    def _get_cached_result(self, cache_key: str) -> Optional[str]:
        """
        检查缓存中是否存在渲染结果
        
        Args:
            cache_key: 缓存键
            
        Returns:
            缓存的图片路径，如果不存在则返回 None
        """
        base_path = self._get_base_path()
        cache_dir = base_path / self.config['cache_dir']
        cached_file = cache_dir / f"{cache_key}.{self.config['output_format']}"
        
        if cached_file.exists():
            self.logger.info(f"命中缓存: {cache_key}")
            return str(cached_file)
        
        return None
    
    def _save_to_cache(self, cache_key: str, rendered_path: str) -> str:
        """
        将渲染结果保存到缓存
        
        Args:
            cache_key: 缓存键
            rendered_path: 渲染后的图片路径
            
        Returns:
            缓存文件路径
        """
        base_path = self._get_base_path()
        cache_dir = base_path / self.config['cache_dir']
        cached_file = cache_dir / f"{cache_key}.{self.config['output_format']}"
        
        # 复制到缓存目录
        shutil.copy2(rendered_path, cached_file)
        self.logger.info(f"保存到缓存: {cache_key}")
        
        return str(cached_file)
    
    def _check_docker_available(self) -> bool:
        """
        检查 Docker 和 RawTherapee 容器是否可用
        
        Returns:
            True 如果 Docker 和 RawTherapee 容器可用，否则返回 False
        """
        try:
            # 检查 Docker 是否运行
            result = subprocess.run(
                ['docker', 'info'],
                capture_output=True,
                timeout=5
            )
            if result.returncode != 0:
                self.logger.debug("Docker 未运行")
                return False
            
            # 检查 RawTherapee 容器是否存在并运行
            container_name = self.config['docker_container']
            result = subprocess.run(
                ['docker', 'ps', '-q', '-f', f'name={container_name}'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if not result.stdout.strip():
                self.logger.debug(f"RawTherapee 容器 '{container_name}' 未运行")
                return False
            
            self.logger.debug(f"Docker 和 RawTherapee 容器可用")
            return True
            
        except subprocess.TimeoutExpired:
            self.logger.debug("Docker 检查超时")
            return False
        except FileNotFoundError:
            self.logger.debug("Docker 命令未找到")
            return False
        except Exception as e:
            self.logger.debug(f"Docker 检查异常: {e}")
            return False
    
    def render(
        self,
        image_path: str,
        lr_params: Dict[str, Any],
        use_cache: bool = True
    ) -> Tuple[bool, str, Optional[str]]:
        """
        执行高保真渲染
        
        优先尝试使用 Darktable CLI 进行渲染（需要 Docker 容器 pstyle-darktable）。
        如果 Docker 不可用或渲染失败，则回退到 Python 渲染引擎。
        
        Args:
            image_path: 原图路径（相对于 input_dir 或绝对路径）
            lr_params: Lightroom 参数字典
            use_cache: 是否使用缓存
            
        Returns:
            Tuple[success: bool, message: str, output_path: Optional[str]]
        """
        self.logger.info(f"开始高保真渲染: {image_path}")
        
        # 解析图片路径
        base_path = self._get_base_path()
        if os.path.isabs(image_path):
            abs_image_path = Path(image_path)
        else:
            abs_image_path = base_path / self.config['input_dir'] / image_path
        
        if not abs_image_path.exists():
            return False, f"原图不存在: {abs_image_path}", None
        
        # 生成缓存键
        cache_key = self._generate_cache_key(str(abs_image_path), lr_params)
        
        # 检查缓存
        if use_cache:
            cached_path = self._get_cached_result(cache_key)
            if cached_path:
                return True, "从缓存加载", cached_path
        
        try:
            # 生成输出路径
            output_dir = base_path / self.config['output_dir']
            output_dir.mkdir(parents=True, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"hifi_{cache_key[:8]}_{timestamp}.{self.config['output_format']}"
            output_path = output_dir / output_filename
            
            # 【优先使用 RawTherapee CLI】检查 Docker 是否可用
            if self._check_docker_available():
                self.logger.info(f"使用 RawTherapee CLI 进行高保真渲染...")
                
                # 生成 PP3 文件
                xmp_dir = base_path / self.config['xmp_dir']
                pp3_path = xmp_dir / f"{cache_key}.pp3"
                self.pp3_generator.save_pp3(lr_params, str(pp3_path))
                self.logger.info(f"PP3 文件已生成: {pp3_path}")
            
                # 调用 RawTherapee CLI
                container_name = self.config['docker_container']
                input_image_name = abs_image_path.name
                pp3_filename = f"{cache_key}.pp3"
                container_pp3_path = f"/app/pp3/{pp3_filename}"
            
                # 复制 PP3 文件到容器
                try:
                    copy_cmd = ['docker', 'cp', str(pp3_path), f"{container_name}:{container_pp3_path}"]
                    self.logger.info(f"复制 PP3 文件到容器: {' '.join(copy_cmd)}")
                    copy_result = subprocess.run(copy_cmd, capture_output=True, text=True, timeout=10)
                    if copy_result.returncode != 0:
                        raise Exception(f"复制 PP3 文件失败: {copy_result.stderr}")
                except Exception as copy_error:
                    self.logger.warning(f"复制 PP3 到容器失败，回退到 Python 引擎: {copy_error}")
                    # 回退到 Python 引擎
                    return self._render_with_python(str(abs_image_path), str(output_path), lr_params, cache_key)
            
                # 构建 RawTherapee CLI 命令
                # 格式: rawtherapee-cli -o <output> [-j<quality>] -c <input> -p <pp3>
                cmd = [
                    'docker', 'exec', container_name,
                    'rawtherapee-cli',
                    '-o', f'/app/output/{output_filename}',
                    '-s',  # Silent mode (suppress progress)
                ]
            
                # RawTherapee 输出格式和质量
                if self.config['output_format'] == 'jpg':
                    cmd.extend(['-j', str(self.config['output_quality'])])
                elif self.config['output_format'] == 'png':
                    cmd.append('-n')  # PNG output (no quality option for PNG)
            
                # 添加输入文件和 PP3 配置文件
                cmd.extend([
                    '-c', f'/app/input/{input_image_name}',
                    '-p', container_pp3_path,
                ])
                
                self.logger.info(f"执行 RawTherapee 命令: {' '.join(cmd)}")
            
                # 执行渲染
                try:
                    result = subprocess.run(
                        cmd,
                        capture_output=True,
                        text=True,
                        timeout=self.config['timeout_seconds']
                    )
                    
                    # 清理容器内的 PP3 文件
                    subprocess.run(
                        ['docker', 'exec', container_name, 'rm', '-f', container_pp3_path],
                        capture_output=True,
                        timeout=5
                    )
                
                    if result.returncode != 0:
                        error_msg = result.stderr or result.stdout or "未知错误"
                        self.logger.warning(f"RawTherapee 渲染失败: {error_msg}，回退到 Python 引擎")
                        return self._render_with_python(str(abs_image_path), str(output_path), lr_params, cache_key)
                        
                except subprocess.TimeoutExpired:
                    self.logger.warning(f"RawTherapee 渲染超时，回退到 Python 引擎")
                    return self._render_with_python(str(abs_image_path), str(output_path), lr_params, cache_key)
                except Exception as e:
                    self.logger.warning(f"RawTherapee 渲染异常: {e}，回退到 Python 引擎")
                    return self._render_with_python(str(abs_image_path), str(output_path), lr_params, cache_key)
            
                # 检查输出文件
                if not output_path.exists():
                    self.logger.warning(f"RawTherapee 渲染完成但输出文件不存在，回退到 Python 引擎")
                    return self._render_with_python(str(abs_image_path), str(output_path), lr_params, cache_key)
                
                # 渲染成功，返回输出路径
                return str(output_path)
            else:
                # Docker 不可用，使用 Python 引擎
                self.logger.info(f"Docker 不可用，使用 Python 渲染引擎...")
                return self._render_with_python(str(abs_image_path), str(output_path), lr_params, cache_key)
            
            # 保存到缓存
            cached_path = self._save_to_cache(cache_key, str(output_path))
            
            self.logger.info(f"RawTherapee 渲染成功: {cached_path}")
            return True, "渲染成功 (RawTherapee)", cached_path
            
        except Exception as e:
            self.logger.exception(f"渲染异常: {e}")
            return False, f"渲染异常: {str(e)}", None
    
    def _render_with_python(
        self,
        abs_image_path: str,
        output_path: str,
        lr_params: Dict[str, Any],
        cache_key: str
    ) -> Tuple[bool, str, Optional[str]]:
        """
        使用 Python 渲染引擎进行渲染（备用方案）
        
        Args:
            abs_image_path: 绝对图片路径
            output_path: 输出路径
            lr_params: Lightroom 参数
            cache_key: 缓存键
            
        Returns:
            Tuple[success, message, output_path]
        """
        self.logger.info(f"使用 Python 渲染引擎进行渲染...")
        success, message = python_render_engine.render(
            abs_image_path,
            output_path,
            lr_params
        )
        
        if not success:
            self.logger.error(f"Python 渲染引擎渲染失败: {message}")
            return False, message, None
        
        # 检查输出文件
        output_path_obj = Path(output_path)
        if not output_path_obj.exists():
            return False, "渲染完成但输出文件不存在", None
        
        # 保存到缓存
        cached_path = self._save_to_cache(cache_key, output_path)
        
        self.logger.info(f"Python 渲染成功: {cached_path}")
        return True, "渲染成功 (Python)", cached_path
    
    def render_solo(
        self,
        image_path: str,
        lr_params: Dict[str, Any],
        solo_param: str,
        use_cache: bool = True
    ) -> Tuple[bool, str, Optional[str]]:
        """
        执行 SOLO 模式高保真渲染（仅应用指定的参数）
        
        【注意】RawTherapee 的 SOLO 模式需要过滤 PP3 文件，当前暂未实现。
        此方法暂时回退到完整渲染。
        
        Args:
            image_path: 原图路径
            lr_params: 完整的 Lightroom 参数字典
            solo_param: SOLO 参数名称（暂未使用）
            use_cache: 是否使用缓存
            
        Returns:
            Tuple[success: bool, message: str, output_path: Optional[str]]
        """
        self.logger.warning(f"SOLO 模式暂未实现，使用完整渲染: {image_path}, 参数: {solo_param}")
        # 暂时回退到完整渲染
        return self.render(image_path, lr_params, use_cache)
    
    def render_batch_solo(
        self,
        image_path: str,
        lr_params: Dict[str, Any],
        solo_params: list,
        use_cache: bool = True
    ) -> Dict[str, Tuple[bool, str, Optional[str]]]:
        """
        批量执行多个 SOLO 模式渲染
        
        用于一次性生成多个参数的独立预览，提高效率。
        
        Args:
            image_path: 原图路径
            lr_params: 完整的 Lightroom 参数字典
            solo_params: SOLO 参数名称列表
            use_cache: 是否使用缓存
            
        Returns:
            Dict[solo_param, Tuple[success, message, output_path]]
        """
        self.logger.info(f"开始批量 SOLO 渲染: {len(solo_params)} 个参数")
        
        results = {}
        for solo_param in solo_params:
            results[solo_param] = self.render_solo(
                image_path, lr_params, solo_param, use_cache
            )
        
        # 统计结果
        success_count = sum(1 for r in results.values() if r[0])
        self.logger.info(f"批量 SOLO 渲染完成: {success_count}/{len(solo_params)} 成功")
        
        return results
    
    def render_async(
        self,
        image_path: str,
        lr_params: Dict[str, Any],
        callback_url: Optional[str] = None
    ) -> str:
        """
        异步执行高保真渲染（返回任务 ID，后台处理）
        
        Args:
            image_path: 原图路径
            lr_params: Lightroom 参数字典
            callback_url: 渲染完成后的回调 URL
            
        Returns:
            任务 ID
        """
        # TODO: 实现异步任务队列（可使用 Celery 或 Redis Queue）
        task_id = hashlib.md5(f"{image_path}{datetime.now().isoformat()}".encode()).hexdigest()[:16]
        self.logger.info(f"创建异步渲染任务: {task_id}")
        
        # 目前简化为同步执行
        # 后续可改为放入任务队列
        
        return task_id
    
    def get_render_status(self, task_id: str) -> Dict[str, Any]:
        """
        获取异步渲染任务状态
        
        Args:
            task_id: 任务 ID
            
        Returns:
            任务状态字典
        """
        # TODO: 从任务队列中查询状态
        return {
            'task_id': task_id,
            'status': 'unknown',
            'progress': 0,
            'result_url': None,
            'error': None,
        }
    
    def cleanup_cache(self, max_age_hours: int = 24) -> int:
        """
        清理过期的缓存文件
        
        Args:
            max_age_hours: 最大缓存时间（小时）
            
        Returns:
            清理的文件数量
        """
        base_path = self._get_base_path()
        cache_dir = base_path / self.config['cache_dir']
        
        if not cache_dir.exists():
            return 0
        
        import time
        now = time.time()
        max_age_seconds = max_age_hours * 3600
        
        cleaned_count = 0
        for file_path in cache_dir.iterdir():
            if file_path.is_file():
                file_age = now - file_path.stat().st_mtime
                if file_age > max_age_seconds:
                    file_path.unlink()
                    cleaned_count += 1
                    self.logger.debug(f"清理缓存文件: {file_path.name}")
        
        self.logger.info(f"缓存清理完成，删除 {cleaned_count} 个文件")
        return cleaned_count


# 单例实例
_hifi_render_service: Optional[HiFiRenderService] = None


def get_hifi_render_service() -> HiFiRenderService:
    """获取高保真渲染服务单例"""
    global _hifi_render_service
    if _hifi_render_service is None:
        _hifi_render_service = HiFiRenderService()
    return _hifi_render_service

