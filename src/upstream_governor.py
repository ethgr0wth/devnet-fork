"""
Upstream governor — match devnet's call rate to the AiAS API's REAL capacity,
and stop piling onto it when it's sick.

Why this exists (2026-07-12 post-mortem, proven by a live py-spy dump):
    aias production runs ONE uvicorn worker doing BLOCKING urllib I/O directly
    on its event loop. It therefore truly serves ~one heavy request at a time —
    while a single fan-out endpoint (e.g. list_user_workspaces) is mid-flight,
    the whole loop is frozen and every other request (even login) stacks up
    behind it as a ReadTimeout.

    The AiOS desktop is a NEW load shape: where a v1 page hit one endpoint at a
    time, the desktop mounts and fans ~ten heavy calls upstream in one breath
    (bridge ×3 + briefing + each open window). Firing ten-at-once at a
    one-at-a-time server manufactures a timeout cascade that freezes it for
    everyone — including real v1 users on aiassist.net.

    We do NOT modify aias (it stays sacred). We make the CLIENT civil:

      • SEMAPHORE  — never more than MAX_INFLIGHT concurrent upstream requests.
                     Excess waits briefly, then fails fast rather than queueing
                     unboundedly. A civil trickle sized to aias's real capacity.
      • BREAKER    — after FAIL_THRESHOLD consecutive upstream *timeouts/transport
                     errors*, OPEN for COOLDOWN_S: governed calls fail fast (the
                     caller returns 503) WITHOUT opening a new socket, giving a
                     drowning aias silent room to recover. After the cooldown,
                     traffic flows again; the first success fully resets it.

    Scope: guards the fan-out paths (the v1 same-origin proxy + the bridge
    sync). Auth (login/register) is deliberately NOT governed — it is a
    low-volume trickle that must never be locked out by an open breaker, and
    a successful login is a fine natural probe that aias is back.

    An HTTP response with ANY status (200/404/...) counts as SUCCESS — the
    server answered, it is not down. Only transport-level failures (ReadTimeout,
    ConnectError, ...) trip the breaker.
"""

import os
import time
import asyncio
from typing import Optional
from contextlib import asynccontextmanager


class UpstreamDown(Exception):
    """Raised by the governor to fail fast instead of touching a sick upstream.

    reason is one of: "circuit_open" (breaker tripped) or "saturated"
    (no slot free within the acquire budget)."""

    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(reason)


class UpstreamGovernor:
    def __init__(
        self,
        max_inflight: Optional[int] = None,
        fail_threshold: Optional[int] = None,
        cooldown_s: Optional[float] = None,
        acquire_timeout_s: Optional[float] = None,
    ):
        self.max_inflight = max_inflight if max_inflight is not None \
            else int(os.environ.get("AIAS_MAX_INFLIGHT", "3"))
        self.fail_threshold = fail_threshold if fail_threshold is not None \
            else int(os.environ.get("AIAS_BREAKER_FAILS", "4"))
        self.cooldown_s = cooldown_s if cooldown_s is not None \
            else float(os.environ.get("AIAS_BREAKER_COOLDOWN_S", "20"))
        self.acquire_timeout_s = acquire_timeout_s if acquire_timeout_s is not None \
            else float(os.environ.get("AIAS_ACQUIRE_TIMEOUT_S", "8"))
        self._sem = asyncio.Semaphore(self.max_inflight)
        self._fails = 0
        self._open_until = 0.0

    # ── breaker state ─────────────────────────────────────────────────────────
    @property
    def is_open(self) -> bool:
        return time.monotonic() < self._open_until

    def record(self, ok: bool) -> None:
        """Feed the breaker. ok=True on any completed HTTP response;
        ok=False only on transport failure (timeout/connect)."""
        if ok:
            self._fails = 0
            self._open_until = 0.0
        else:
            self._fails += 1
            if self._fails >= self.fail_threshold:
                self._open_until = time.monotonic() + self.cooldown_s

    # ── concurrency slot ──────────────────────────────────────────────────────
    @asynccontextmanager
    async def slot(self):
        """Acquire one upstream slot. Raises UpstreamDown immediately if the
        breaker is open, or if no slot frees within the acquire budget."""
        if self.is_open:
            raise UpstreamDown("circuit_open")
        try:
            await asyncio.wait_for(self._sem.acquire(),
                                   timeout=self.acquire_timeout_s)
        except asyncio.TimeoutError:
            raise UpstreamDown("saturated")
        try:
            yield
        finally:
            self._sem.release()


# The one governor every fan-out upstream path shares.
governor = UpstreamGovernor()
