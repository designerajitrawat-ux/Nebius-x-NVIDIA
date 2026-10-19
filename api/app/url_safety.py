"""Which URLs the test browser may open. Blocks private/internal addresses (SSRF) unless allowed."""

from __future__ import annotations

import asyncio
import ipaddress
import socket
from urllib.parse import urlsplit, urlunsplit


class BadUrl(ValueError):
    pass


def normalize_url(raw: str) -> str:
    """Add https:// if missing, drop fragments, reject non-http schemes and credentials."""
    s = raw.strip()
    if not s:
        raise BadUrl("Enter a URL to test.")
    if "://" not in s:
        s = "https://" + s
    parts = urlsplit(s)
    if parts.scheme not in {"http", "https"}:
        raise BadUrl("Only http and https URLs can be tested.")
    if not parts.hostname:
        raise BadUrl("That doesn't look like a URL. Try something like https://your-site.com")
    if parts.username or parts.password:
        raise BadUrl("Remove the username and password from the URL.")
    return urlunsplit((parts.scheme, parts.netloc, parts.path or "/", parts.query, ""))


def is_public_ip(ip: str) -> bool:
    addr = ipaddress.ip_address(ip)
    return not (
        addr.is_private
        or addr.is_loopback
        or addr.is_link_local
        or addr.is_multicast
        or addr.is_reserved
        or addr.is_unspecified
    )


async def check_public(url: str) -> None:
    """Raise BadUrl if the host resolves to any non-public address."""
    host = urlsplit(url).hostname or ""
    try:
        infos = await asyncio.get_running_loop().getaddrinfo(host, None, type=socket.SOCK_STREAM)
    except socket.gaierror as e:
        raise BadUrl(f"We couldn't find {host}. Check the URL for typos.") from e
    ips = {info[4][0] for info in infos}
    if not ips or not all(is_public_ip(ip) for ip in ips):
        raise BadUrl("That address points to a private network, so we can't test it.")


def same_site(a: str, b: str) -> bool:
    """True if hosts match, ignoring a leading www. (scheme/port changes are fine)."""
    ha = (urlsplit(a).hostname or "").removeprefix("www.")
    hb = (urlsplit(b).hostname or "").removeprefix("www.")
    return bool(ha) and ha == hb
