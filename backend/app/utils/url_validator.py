import ipaddress
import logging
from typing import Optional
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

BLOCKED_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "metadata.google.internal"}

BLOCKED_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("0.0.0.0/8"),
]


def validate_base_url(url: Optional[str]) -> bool:
    """校验 base_url 不指向内网地址，防止 SSRF 攻击"""
    if not url:
        return True

    try:
        parsed = urlparse(url)
    except Exception:
        return False

    hostname = parsed.hostname
    if not hostname:
        return False

    if hostname in BLOCKED_HOSTS:
        logger.warning("SSRF blocked: blocked hostname %s", hostname)
        return False

    try:
        ip = ipaddress.ip_address(hostname)
        for net in BLOCKED_NETWORKS:
            if ip in net:
                logger.warning("SSRF blocked: internal network %s (%s)", hostname, ip)
                return False
    except ValueError:
        pass

    return True
