import asyncio
import logging
import time
from functools import wraps
from typing import Callable


def setup_logging(debug: bool = False):
    """配置全局日志级别和格式"""
    level = logging.DEBUG if debug else logging.INFO
    fmt = (
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
        if debug
        else "%(asctime)s [%(levelname)s] %(message)s"
    )
    logging.basicConfig(level=level, format=fmt, datefmt="%H:%M:%S")
    if debug:
        # 抑制 chromadb 的 DEBUG 日志噪音
        logging.getLogger("chromadb").setLevel(logging.WARNING)
        logging.getLogger("chromadb.telemetry").setLevel(logging.WARNING)


def log_timing(operation: str):
    """装饰器：记录函数执行耗时，仅 DEBUG 级别输出。同时支持同步和异步函数"""

    def decorator(func: Callable):
        if asyncio.iscoroutinefunction(func):

            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                logger = logging.getLogger(func.__module__)
                start = time.perf_counter()
                try:
                    result = await func(*args, **kwargs)
                    logger.warning("[PERF] %s: %.3fs", operation, time.perf_counter() - start)
                    return result
                except Exception:
                    logger.warning("[PERF] %s: %.3fs (failed)", operation, time.perf_counter() - start)
                    raise

            return async_wrapper
        else:

            @wraps(func)
            def wrapper(*args, **kwargs):
                logger = logging.getLogger(func.__module__)
                start = time.perf_counter()
                try:
                    result = func(*args, **kwargs)
                    logger.warning("[PERF] %s: %.3fs", operation, time.perf_counter() - start)
                    return result
                except Exception:
                    logger.warning("[PERF] %s: %.3fs (failed)", operation, time.perf_counter() - start)
                    raise

            return wrapper

    return decorator
