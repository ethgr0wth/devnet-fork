"""
DevNetwork storage adapter — AiAS v1.2 runs on NEDB.

DEVNET_STORAGE=nedb  (default) → RedisOnNedb shim over a nedbd daemon.
DEVNET_STORAGE=redis            → real Redis (the original deployment mode,
                                  kept for devnet.Interchained.org parity).

The shim is the battle-tested adapter from the AiAS v1 migration
(74-test parity suite; CAS-guarded read-modify-write on every mutation).
DevNet's Redis surface is a strict subset of what it already covers, plus
the six small methods added by DevnetRedisOnNedb below.

Pub/sub: DevNet uses exactly one channel family (bot:dm:{bot_id}) to fan
DM events out to bot websockets. Under NEDB we run single-process
(production.sh already pins WORKERS=1), so publish/subscribe collapses to
an in-process queue with the same redis-py message shapes — no broker.

Fresh start doctrine (Mark, 2026-07-12): v1.2 launches with ZERO inherited
data. No backfill, no dead-pointer seams — the shim only ever reads what
it wrote itself.
"""
from __future__ import annotations

import fnmatch
import os
import queue
import time
from typing import Any, Dict, List, Optional

STORAGE_MODE = os.environ.get("DEVNET_STORAGE", "nedb").lower()


# ── in-process pub/sub (single-worker doctrine) ─────────────────────────────

_PUBSUB_QUEUE: "queue.Queue[Dict[str, Any]]" = queue.Queue()


class LocalPubSub:
    """redis-py PubSub lookalike for the one pattern DevNet uses.

    Supports: psubscribe(pattern...), get_message(ignore_subscribe_messages,
    timeout) returning {"type": "pmessage", "channel": ..., "data": ...}.
    """

    def __init__(self) -> None:
        self._patterns: List[str] = []

    def psubscribe(self, *patterns: str) -> None:
        self._patterns.extend(patterns)

    def subscribe(self, *channels: str) -> None:
        self._patterns.extend(channels)

    def get_message(self, ignore_subscribe_messages: bool = False,
                    timeout: float = 0.0) -> Optional[Dict[str, Any]]:
        deadline = time.monotonic() + max(timeout, 0.0)
        while True:
            remaining = deadline - time.monotonic()
            try:
                msg = _PUBSUB_QUEUE.get(timeout=max(remaining, 0.001)) \
                    if remaining > 0 else _PUBSUB_QUEUE.get_nowait()
            except queue.Empty:
                return None
            for pat in self._patterns:
                if fnmatch.fnmatch(msg["channel"], pat):
                    return msg
            # not ours — requeue for other subscribers (none today, but safe)
            _PUBSUB_QUEUE.put(msg)
            if time.monotonic() >= deadline:
                return None

    def close(self) -> None:
        self._patterns = []


def _local_publish(channel: str, data: str) -> int:
    _PUBSUB_QUEUE.put({"type": "pmessage", "pattern": None,
                       "channel": channel, "data": data})
    return 1


# ── the NEDB-backed client ───────────────────────────────────────────────────

try:  # package-style boot: python -m uvicorn src.main:app (repo root on path)
    from src.nedb import NedbdClient, RedisOnNedb  # noqa: E402
except ImportError:  # script-style: src/ itself on sys.path
    from nedb import NedbdClient, RedisOnNedb  # noqa: E402


class DevnetRedisOnNedb(RedisOnNedb):
    """RedisOnNedb + the six methods DevNet uses that AiAS never did."""

    # lists ------------------------------------------------------------------
    def lset(self, key_s: str, index: int, value) -> bool:
        """Redis LSET: replace items[index]; error on missing key/range."""
        if self._get(key_s) is None:
            raise ValueError(f"lset on missing key {key_s!r}")

        def mut(doc):
            items = list(doc.get("items") or [])
            i = index if index >= 0 else len(items) + index
            if i < 0 or i >= len(items):
                raise IndexError(f"lset index {index} out of range for {key_s!r}")
            items[i] = str(value)
            doc["items"] = items
            return True
        return self._rmw(key_s, "list", {"items": []}, mut)

    def lindex(self, key_s: str, index: int) -> Optional[str]:
        d = self._get(key_s)
        items = list(d.get("items") or []) if d else []
        i = index if index >= 0 else len(items) + index
        return items[i] if 0 <= i < len(items) else None

    # strings / counters -----------------------------------------------------
    def setnx(self, key_s: str, value) -> bool:
        return self.set(key_s, value, nx=True) is not None

    def decr(self, key_s: str, amount: int = 1) -> int:
        return self.incrby(key_s, -amount)

    def decrby(self, key_s: str, amount: int = 1) -> int:
        return self.incrby(key_s, -amount)

    # zsets --------------------------------------------------------------────
    def zincrby(self, key_s: str, amount: float, member: str) -> float:
        cur = self.zscore(key_s, member) or 0.0
        new = float(cur) + float(amount)
        self.zadd(key_s, {str(member): new})
        return new

    def zrevrangebyscore(self, key_s: str, max, min,  # noqa: A002 (redis names)
                         start: Optional[int] = None,
                         num: Optional[int] = None,
                         withscores: bool = False):
        """Redis ZREVRANGEBYSCORE: descending, LIMIT applied post-reversal."""
        pairs = self.zrangebyscore(key_s, min, max, withscores=True)
        pairs.sort(key=lambda p: p[1], reverse=True)
        if start is not None:
            pairs = pairs[start:(start + num) if num is not None else None]
        return pairs if withscores else [m for m, _ in pairs]

    # pub/sub ------------------------------------------------------------────
    def publish(self, channel: str, data: str) -> int:
        return _local_publish(channel, data)

    def pubsub(self) -> LocalPubSub:
        return LocalPubSub()


# ── factory ──────────────────────────────────────────────────────────────────

def make_client():
    """The one storage client for main.py / system_bots / scripts."""
    if STORAGE_MODE == "redis":
        import redis
        return redis.Redis(
            host=os.environ.get("DEVNET_REDIS_HOST", "localhost"),
            port=int(os.environ.get("DEVNET_REDIS_PORT", "6379")),
            db=int(os.environ.get("DEVNET_REDIS_DB", "11")),
            decode_responses=True)
    client = NedbdClient(
        base=os.environ.get("NEDBD_URL", "http://localhost:7070"),
        token=os.environ.get("NEDBD_TOKEN"),
        db=os.environ.get("NEDB_DB", "devnet"))
    return DevnetRedisOnNedb(client)


def make_pubsub(client=None):
    """PubSub handle matching the storage mode (used by bot_dm_subscriber)."""
    if STORAGE_MODE == "redis":
        import redis
        return redis.Redis(
            host=os.environ.get("DEVNET_REDIS_HOST", "localhost"),
            port=int(os.environ.get("DEVNET_REDIS_PORT", "6379")),
            db=int(os.environ.get("DEVNET_REDIS_DB", "11"))).pubsub()
    return LocalPubSub()
