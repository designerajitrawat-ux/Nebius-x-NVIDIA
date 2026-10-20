"""Egress filter for the test browser: a tiny local HTTP/CONNECT proxy that refuses private addresses.

Chromium sends every request through it (navigations, redirects, iframes, images, fetch, websockets),
so a public page can't make our server's browser read internal services (SSRF). The proxy resolves each
host itself and connects to exactly the IP it checked, so DNS rebinding can't slip a private address in
between the check and the connection. Disabled when ALLOW_PRIVATE_URLS is set (local development).
"""

from __future__ import annotations

import asyncio
import logging
import socket
from urllib.parse import urlsplit

from .url_safety import is_public_ip

log = logging.getLogger("fiveusers.egress")

HEAD_LIMIT = 64 * 1024
IDLE_TIMEOUT_S = 120
CONNECT_TIMEOUT_S = 10
_HOP_HEADERS = {b"proxy-connection", b"connection", b"keep-alive", b"proxy-authorization"}


class Blocked(Exception):
    pass


async def resolve_public(host: str, port: int) -> str:
    """One IP to connect to; Blocked if the host is (or also resolves to) a non-public address."""
    host = host.strip("[]")
    try:
        infos = await asyncio.get_running_loop().getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except socket.gaierror as e:
        raise Blocked(f"can't resolve {host}") from e
    ips = [info[4][0] for info in infos]
    if not ips or not all(is_public_ip(ip) for ip in ips):
        raise Blocked(f"{host} is a private address")
    return next((ip for ip in ips if ":" not in ip), ips[0])  # prefer IPv4


def split_host_port(target: str, default_port: int) -> tuple[str, int]:
    if target.startswith("["):  # [v6]:port
        host, _, rest = target[1:].partition("]")
        return host, int(rest[1:]) if rest.startswith(":") else default_port
    host, sep, port = target.rpartition(":")
    if sep and port.isdigit() and host:
        return host, int(port)
    return target, default_port


async def _pipe(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    try:
        while True:
            data = await asyncio.wait_for(reader.read(65536), IDLE_TIMEOUT_S)
            if not data:
                break
            writer.write(data)
            await writer.drain()
    except (asyncio.TimeoutError, ConnectionError, OSError):
        pass
    finally:
        try:
            writer.close()
        except (ConnectionError, OSError):
            pass


def _refuse(writer: asyncio.StreamWriter, reason: str) -> None:
    body = f"Blocked by FiveUsers: {reason}".encode()
    writer.write(b"HTTP/1.1 403 Forbidden\r\nContent-Type: text/plain\r\nConnection: close\r\n"
                 + f"Content-Length: {len(body)}\r\n\r\n".encode() + body)


class EgressProxy:
    def __init__(self) -> None:
        self._server: asyncio.base_events.Server | None = None
        self.port = 0

    @property
    def url(self) -> str:
        return f"http://127.0.0.1:{self.port}"

    async def start(self) -> None:
        self._server = await asyncio.start_server(self._handle, "127.0.0.1", 0, limit=HEAD_LIMIT)
        self.port = self._server.sockets[0].getsockname()[1]
        log.info("egress proxy on %s", self.url)

    async def close(self) -> None:
        if self._server:
            self._server.close()
            await self._server.wait_closed()

    async def _handle(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        try:
            head = await asyncio.wait_for(reader.readuntil(b"\r\n\r\n"), 15)
        except (asyncio.TimeoutError, asyncio.IncompleteReadError, asyncio.LimitOverrunError, ConnectionError):
            writer.close()
            return
        first, _, header_block = head.partition(b"\r\n")
        try:
            method, target, version = first.decode("latin-1").split(" ", 2)
        except ValueError:
            writer.close()
            return
        try:
            if method.upper() == "CONNECT":
                host, port = split_host_port(target, 443)
                ip = await resolve_public(host, port)
                up_r, up_w = await asyncio.wait_for(asyncio.open_connection(ip, port), CONNECT_TIMEOUT_S)
                writer.write(b"HTTP/1.1 200 Connection Established\r\n\r\n")
                await writer.drain()
            else:
                parts = urlsplit(target)
                if parts.scheme != "http" or not parts.hostname:
                    raise Blocked("unsupported request")
                port = parts.port or 80
                ip = await resolve_public(parts.hostname, port)
                up_r, up_w = await asyncio.wait_for(asyncio.open_connection(ip, port), CONNECT_TIMEOUT_S)
                path = (parts.path or "/") + (f"?{parts.query}" if parts.query else "")
                lines = [ln for ln in header_block.split(b"\r\n") if ln]
                kept = [ln for ln in lines if ln.split(b":", 1)[0].strip().lower() not in _HOP_HEADERS]
                # One request per upstream connection keeps hosts from mixing on a reused socket.
                up_w.write(f"{method} {path} {version}\r\n".encode("latin-1") + b"\r\n".join(kept)
                           + b"\r\nConnection: close\r\n\r\n")
                await up_w.drain()
        except Blocked as e:
            log.info("egress blocked: %s", e)
            _refuse(writer, str(e))
            writer.close()
            return
        except (asyncio.TimeoutError, OSError) as e:
            writer.write(b"HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\nContent-Length: 0\r\n\r\n")
            writer.close()
            log.info("egress connect failed: %s", type(e).__name__)
            return
        await asyncio.gather(_pipe(reader, up_w), _pipe(up_r, writer))


_proxy: EgressProxy | None = None
_lock = asyncio.Lock()


async def shared_proxy() -> EgressProxy:
    """One proxy per API process, started on first use."""
    global _proxy
    async with _lock:
        if _proxy is None:
            p = EgressProxy()
            await p.start()
            _proxy = p
    return _proxy
