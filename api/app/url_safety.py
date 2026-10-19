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
    """Globally routable unicast only (rejects private, loopback, link-local, CGNAT, multicast, reserved)."""
    try:
        addr = ipaddress.ip_address(ip.split("%")[0])
    except ValueError:
        return False
    if isinstance(addr, ipaddress.IPv6Address):
        mapped = addr.ipv4_mapped or addr.sixtofour
        if mapped is not None:
            addr = mapped
    return addr.is_global and not addr.is_multicast


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


# Hosting platforms where every subdomain is a different owner (Public Suffix List, private section).
_SHARED_SUFFIXES = (
    "vercel.app", "netlify.app", "github.io", "hf.space", "pages.dev", "herokuapp.com", "onrender.com",
    "web.app", "firebaseapp.com", "azurewebsites.net", "cloudfront.net", "fly.dev", "railway.app",
)
_SECOND_LEVEL = {"co", "com", "org", "net", "ac", "gov", "edu", "ne", "or"}


def site_key(host: str) -> str:
    """Approximate registrable domain: app.example.com -> example.com, shop.example.co.uk -> example.co.uk."""
    host = host.lower().strip(".")
    try:
        ipaddress.ip_address(host.strip("[]"))
        return host
    except ValueError:
        pass
    labels = host.split(".")
    for suffix in _SHARED_SUFFIXES:
        if host == suffix or host.endswith("." + suffix):
            return ".".join(labels[-(suffix.count(".") + 2):])
    if len(labels) >= 3 and labels[-2] in _SECOND_LEVEL and len(labels[-1]) == 2:
        return ".".join(labels[-3:])
    return ".".join(labels[-2:])


def same_site(a: str, b: str) -> bool:
    """Same registrable domain (www., app., scheme and port changes are fine; other sites are not)."""
    ha, hb = urlsplit(a).hostname or "", urlsplit(b).hostname or ""
    return bool(ha) and bool(hb) and site_key(ha) == site_key(hb)
