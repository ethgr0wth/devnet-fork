# AiAS v1.2 — DevNetwork on NEDB

**The AiAS v1.2 client**: DevNetwork's social chassis (feed, ecosystems,
groups, DMs, bot platform) running on a **NEDB** engine with **AiAS v1
auth patterns** as the front door and v1 surfaces woven inline.

## Three-systems doctrine

| System | Status |
|---|---|
| **aias v1** (`api.aiassist.net`) | Untouched. Referenced over its API — the AI brain for inline views and (Phase 2) agents. |
| **devnet.Interchained.org** | Untouched. The original deployment keeps its users on Redis (`DEVNET_STORAGE=redis` preserves that mode). |
| **AiAS v1.2** (this repo) | New deployment, fresh data, NEDB engine. No migration, ever. |

**Vocabulary map**: ecosystems → *Environments* · groups → *Workspaces* ·
bots → *Agents* · devnet is the v1.2 theme.

## Quickstart

```bash
# 1. Start a NEDB daemon (engine ≥ 2.7.0 — pip install nedb-engine)
python3 -m nedb.server --host 127.0.0.1 --port 7070 --data ./nedb-data

# 2. Configure (defaults work for a local boot)
cp .env.example .env        # then export or use your process manager

# 3. Run — checks nedbd health, creates the database, builds, serves
./production.sh 4633

# 4. First account: sign up on the landing (email + password), then
#    promote yourself:
python3 scripts/create_superadmin.py <display_name>
```

## Environment

See **`.env.example`** for every variable. The load-bearing ones:

| Var | Default | Meaning |
|---|---|---|
| `DEVNET_STORAGE` | `nedb` | `nedb` (v1.2) or `redis` (legacy parity) |
| `NEDBD_URL` | `http://localhost:7070` | nedbd daemon |
| `NEDB_DB` | `devnet` | database name |
| `AIAS_API_BASE` | `https://api.aiassist.net` | the v1 brain for inline AiAS views |
| `DEVNET_SYSTEM_BOTS` | `off` | demo sim bots (real agents arrive in Phase 2) |
| `WORKERS` | `1` | NEDB mode enforces 1 (in-process pub/sub + WS state) |

## Auth

- **v1.2 front door**: email + password (+ optional TOTP) → `dvs_*` session
  tokens riding the `X-Auth-Hash` header the whole API already speaks.
- **Legacy fingerprint auth** still works (original devnet parity).

## The AiAS weave

The sidebar's **AiAS** section (Playground, KeyStone, Artifacts, Image,
Agents) runs on your v1 account via a one-time connect (session stored
client-side; v1 accepts any origin via header sessions). Playground is
fully native (SSE streaming chat); the rest dock as link-outs until each
is nativized.

## Tests

```bash
python3 scripts/test_nedb_base.py   # spawns throwaway nedbd + server
# BOARD: 31 passed / 0 failed — zero Redis anywhere
```

---
© INTERCHAINED LLC — see LICENSE.
