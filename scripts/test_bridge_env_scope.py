#!/usr/bin/env python3
"""
Algorithm test for the bridge's per-environment workspace pull + bucketing.

Mirrors the loop in main.py bridge_sync_workspaces (the per-env fetch, the
dedup-by-id, and the eco_id = returned-environment_id || active_env || DEVONE
bucketing) against a fake upstream, and proves the two regimes:

  NEW aias (#69 deployed): honors ?environment_id and returns environment_id
    on previews  → workspaces bucket PER environment.
  OLD aias (#69 not deployed): ignores the param (every env returns the active
    env's set) and omits environment_id  → dedup collapses the repeats and
    everything buckets under active_env == the pre-#69 (#64) behavior.

Run: python3 scripts/test_bridge_env_scope.py
"""
DEVONE = "devone-ecosystem"


def pull_and_bucket(envs, active_env, fetch, pages_per_env=5, global_budget=15):
    """Faithful reimplementation of the main.py pull+bucket loop."""
    env_ids = [e["id"] for e in envs if e.get("id")]
    if active_env and active_env not in env_ids:
        env_ids.append(active_env)
    if not env_ids:
        env_ids = [None]

    workspaces, seen, complete, pages_used = [], set(), True, 0
    first_attempt = True
    for eid in env_ids:
        if pages_used >= global_budget:
            complete = False
            break
        offset = 0
        exhausted = True
        for _ in range(pages_per_env):
            if pages_used >= global_budget:
                complete = False
                break
            pages_used += 1
            body = fetch(eid, offset)
            if body is None:
                if first_attempt:
                    raise RuntimeError("502 upstream unreachable")
                complete = False
                exhausted = False
                break
            first_attempt = False
            page = body.get("workspaces") or []
            for w in page:
                wid = w.get("id")
                if wid and wid not in seen:
                    seen.add(wid)
                    workspaces.append(w)
            if not page or not body.get("has_more"):
                exhausted = False
                break
            offset += len(page)
        if exhausted:
            complete = False

    buckets = {}
    for w in workspaces:
        eco = w.get("environment_id") or active_env or DEVONE
        buckets.setdefault(eco, []).append(w["id"])
    return workspaces, buckets, complete


passed = 0
def check(name, cond):
    global passed
    if cond:
        passed += 1
        print(f"  ✓ {name}")
    else:
        print(f"  ✗ {name}")
        raise SystemExit(1)


ENVS = [{"id": "env-prod-1", "name": "Production"},
        {"id": "env-stage-2", "name": "Staging"}]
ACTIVE = "env-prod-1"

# ── NEW aias: param honored, environment_id on previews ──
NEW = {
    "env-prod-1": [{"id": "ws-acme", "environment_id": "env-prod-1"},
                   {"id": "ws-beta", "environment_id": "env-prod-1"}],
    "env-stage-2": [{"id": "ws-stage", "environment_id": "env-stage-2"}],
}
def fetch_new(eid, offset):
    if offset > 0:
        return {"workspaces": [], "has_more": False}
    return {"workspaces": NEW.get(eid, []), "has_more": False}

print("NEW aias (#69 deployed):")
ws, buckets, complete = pull_and_bucket(ENVS, ACTIVE, fetch_new)
check("all 3 workspaces across both envs pulled", len(ws) == 3)
check("prod bucket has acme+beta", sorted(buckets["env-prod-1"]) == ["ws-acme", "ws-beta"])
check("stage bucket has stage (non-active env mapped!)", buckets["env-stage-2"] == ["ws-stage"])
check("nothing fell to DevOne", DEVONE not in buckets)
check("complete pull", complete is True)

# ── OLD aias: param ignored (always active-env set), no environment_id ──
ACTIVE_SET = [{"id": "ws-acme"}, {"id": "ws-beta"}]  # no environment_id
def fetch_old(eid, offset):
    if offset > 0:
        return {"workspaces": [], "has_more": False}
    return {"workspaces": ACTIVE_SET, "has_more": False}  # same set for every eid

print("OLD aias (#69 NOT deployed) — must equal #64 behavior:")
ws2, buckets2, complete2 = pull_and_bucket(ENVS, ACTIVE, fetch_old)
check("dedup collapses the repeated active-env set", len(ws2) == 2)
check("everything buckets under active_env", sorted(buckets2["env-prod-1"]) == ["ws-acme", "ws-beta"])
check("no per-env leakage, no DevOne", set(buckets2) == {"env-prod-1"})

# ── no active env + old aias → DevOne fallback (pre-fix safety net) ──
def fetch_noenv(eid, offset):
    return {"workspaces": ([{"id": "ws-x"}] if offset == 0 else []), "has_more": False}
print("No active env + no environment_id → DevOne fallback:")
_, buckets3, _ = pull_and_bucket([], "", fetch_noenv)
check("falls back to DevOne when nothing else resolves", buckets3 == {DEVONE: ["ws-x"]})

# ── global page budget guard ──
def fetch_infinite(eid, offset):
    return {"workspaces": [{"id": f"{eid}-{offset}"}], "has_more": True}
print("Governor guard:")
_, _, complete4 = pull_and_bucket([{"id": f"e{i}"} for i in range(10)], "", fetch_infinite)
check("hitting the global page budget marks the pull incomplete", complete4 is False)

print(f"\nAll {passed} tests passed.")
