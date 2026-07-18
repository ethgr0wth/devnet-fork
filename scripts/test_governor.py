#!/usr/bin/env python3
"""
Unit board for the upstream governor (src/upstream_governor.py).

Deterministic, no network, no sleep beyond a tiny cooldown — drives the
semaphore + circuit-breaker state machine directly. This is the "tests"
half of the load-discipline PR: the governor logic that keeps devnet from
flooding a single-worker aias is proven here in isolation, while the full
NEDB board proves the proxy/bridge contract still holds end to end.
"""
import os
import sys
import time
import asyncio

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from upstream_governor import UpstreamGovernor, UpstreamDown  # noqa: E402

PASS = 0
FAIL = 0


def ok(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ok    {name}")
    else:
        FAIL += 1
        print(f"  FAIL  {name}  {detail}")


async def main():
    print("Governor. semaphore + circuit breaker")

    # ── G1: concurrency cap ──────────────────────────────────────────────────
    g = UpstreamGovernor(max_inflight=2, fail_threshold=3,
                         cooldown_s=0.3, acquire_timeout_s=0.4)
    live = {"n": 0, "peak": 0}

    async def worker():
        async with g.slot():
            live["n"] += 1
            live["peak"] = max(live["peak"], live["n"])
            await asyncio.sleep(0.15)
            live["n"] -= 1

    await asyncio.gather(*[worker() for _ in range(6)])
    ok("G1 semaphore caps concurrency at max_inflight",
       live["peak"] == 2, f"peak={live['peak']}")

    # ── G2: saturation fails fast (not queue-forever) ───────────────────────
    g2 = UpstreamGovernor(max_inflight=1, fail_threshold=3,
                          cooldown_s=0.3, acquire_timeout_s=0.2)

    async def hold():
        async with g2.slot():
            await asyncio.sleep(0.5)

    async def contend():
        t0 = time.monotonic()
        try:
            async with g2.slot():
                return ("acquired", time.monotonic() - t0)
        except UpstreamDown as e:
            return (e.reason, time.monotonic() - t0)

    holder = asyncio.create_task(hold())
    await asyncio.sleep(0.02)
    reason, waited = await contend()
    ok("G2 saturation raises UpstreamDown('saturated') within budget",
       reason == "saturated" and waited < 0.4, f"{reason} in {waited:.2f}s")
    await holder

    # ── G3: breaker opens after threshold transport failures ─────────────────
    g3 = UpstreamGovernor(max_inflight=4, fail_threshold=3,
                          cooldown_s=0.3, acquire_timeout_s=0.4)
    ok("G3a breaker starts closed", not g3.is_open)
    g3.record(False)
    g3.record(False)
    ok("G3b still closed below threshold", not g3.is_open)
    g3.record(False)  # 3rd → trip
    ok("G3c breaker OPEN at threshold", g3.is_open)

    # ── G4: open breaker fails fast without a slot ───────────────────────────
    tripped = None
    try:
        async with g3.slot():
            pass
    except UpstreamDown as e:
        tripped = e.reason
    ok("G4 open breaker raises UpstreamDown('circuit_open')",
       tripped == "circuit_open", str(tripped))

    # ── G5: breaker auto-closes after cooldown ───────────────────────────────
    time.sleep(0.35)  # > cooldown_s
    ok("G5a breaker closes after cooldown", not g3.is_open)
    reopened = True
    try:
        async with g3.slot():
            reopened = False
    except UpstreamDown:
        reopened = True
    ok("G5b calls flow again post-cooldown", reopened is False)

    # ── G6: a success fully resets the failure streak ────────────────────────
    g6 = UpstreamGovernor(max_inflight=4, fail_threshold=3,
                          cooldown_s=0.3, acquire_timeout_s=0.4)
    g6.record(False)
    g6.record(False)
    g6.record(True)   # answer → reset
    g6.record(False)
    g6.record(False)
    ok("G6 success resets streak (2+2 fails, still closed)", not g6.is_open)

    print(f"\n{'='*46}\nGOVERNOR: {PASS} passed / {FAIL} failed\n{'='*46}")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
