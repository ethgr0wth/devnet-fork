import os
import json
import hashlib
import hmac
import subprocess
import uuid
import re
import base64
import httpx
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Set, List, Tuple
from fastapi import FastAPI, Request, Header, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import redis  # type: ignore
import asyncio
import pyotp

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

EMOJI_INDEX = {}
try:
    with open(Path(__file__).parent / "static" / "emoji" / "index.json", "r") as _ef:
        EMOJI_INDEX = json.load(_ef)
except Exception:
    pass

IMGBB_API_KEY = os.environ.get("IMGBB_API_KEY", "")
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"}
MAX_IMAGE_DIMENSION = 2048  # pixels

DEVONE_LEGACY_ID = "devone"
DEVONE_ECOSYSTEM_ID = str(uuid.uuid5(uuid.NAMESPACE_DNS, "devone.devnetwork"))

MENTION_PATTERN = re.compile(r'@([a-zA-Z0-9_]+)')
HASHTAG_PATTERN = re.compile(r'#([a-zA-Z0-9_]+)')

def extract_mentions(content: str) -> List[str]:
    return list(set(MENTION_PATTERN.findall(content)))

def extract_hashtags(content: str) -> List[str]:
    return list(set(tag.lower() for tag in HASHTAG_PATTERN.findall(content)))

def normalize_username(name: str) -> str:
    """Normalize username: lowercase, trim whitespace, remove spaces"""
    return name.lower().strip().replace(" ", "")

def get_user_by_display_name(display_name: str) -> Optional[dict]:
    normalized = normalize_username(display_name)
    user_id = redis_client.get(f"user:name:{normalized}")
    if user_id:
        user_data = redis_client.get(f"user:{user_id}")
        if user_data:
            return json.loads(str(user_data))
    return None

def create_notification(user_id: str, notification_type: str, data: dict):
    notification_id = str(uuid.uuid4())
    now = datetime.utcnow()
    notification = {
        "id": notification_id,
        "type": notification_type,
        "data": data,
        "read": False,
        "created_at": now.isoformat()
    }
    pipeline = redis_client.pipeline()
    pipeline.lpush(f"notifications:{user_id}", json.dumps(notification))
    pipeline.ltrim(f"notifications:{user_id}", 0, 99)
    pipeline.incr(f"notifications:unread:{user_id}")
    pipeline.execute()
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(push_notification_update(user_id))
    except RuntimeError:
        pass
    return notification

def log_activity(action: str, user_id: str, details: dict, user_name: str = None):
    """Append-only activity log for analytics with full context"""
    now = datetime.utcnow()
    
    # Get user name if not provided
    if not user_name:
        user_data = redis_client.get(f"user:{user_id}")
        if user_data:
            try:
                user_name = json.loads(str(user_data)).get("displayName", "Unknown")
            except:
                user_name = "Unknown"
    
    entry = {
        "id": str(uuid.uuid4()),
        "action": action,
        "user_id": user_id,
        "user_name": user_name or "Unknown",
        "details": details,
        "timestamp": now.isoformat(),
        "ts": now.timestamp(),
        "hour": now.hour,
        "day": now.strftime("%Y-%m-%d")
    }
    
    pipeline = redis_client.pipeline()
    pipeline.rpush("activity:log", json.dumps(entry))
    pipeline.zadd("activity:timeline", {entry["id"]: entry["ts"]})
    pipeline.hincrby("activity:counts", action, 1)
    pipeline.hincrby(f"activity:daily:{entry['day']}", action, 1)
    pipeline.hincrby("activity:hourly", str(now.hour), 1)
    pipeline.zadd("activity:users", {user_id: now.timestamp()})
    pipeline.execute()

app = FastAPI()

BASE_DIR = Path(__file__).parent

def _asset_version(filename: str) -> str:
    fp = BASE_DIR / "static" / filename
    try:
        return str(int(fp.stat().st_mtime))
    except Exception:
        return "1"

ASSET_CSS_VER = _asset_version("styles.css")
ASSET_JS_VER = _asset_version("app.js")

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse

class NoCacheStaticMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/static/"):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response

app.add_middleware(NoCacheStaticMiddleware)
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "templates")

REDIS_HOST = os.environ.get("DEVNET_REDIS_HOST", "localhost")
REDIS_PORT = int(os.environ.get("DEVNET_REDIS_PORT", "6379"))
REDIS_DB = int(os.environ.get("DEVNET_REDIS_DB", "11"))
# AiAS v1.2: storage is env-switched (DEVNET_STORAGE=nedb|redis, default nedb).
# NEDB mode rides the battle-tested RedisOnNedb shim from the AiAS migration.
try:
    from src import storage as _storage
except ImportError:  # script-style execution with src/ on sys.path
    import storage as _storage
redis_client = _storage.make_client()

AUTH_SALT = os.environ.get("AUTH_SALT", "devnetwork_professional_networking_salt_2026")

GEPPETTO_ID = "geppetto-system-bot"
GEPPETTO_USERNAME = "geppetto"
BOT_TOKEN_PREFIX = "dvn_bot_"

print("\n" + "="*50)
print("  DevNetwork Configuration")
print("="*50)
print(f"  Storage:    {_storage.STORAGE_MODE}")
if _storage.STORAGE_MODE == "redis":
    print(f"  Redis Host: {REDIS_HOST}")
    print(f"  Redis Port: {REDIS_PORT}")
    print(f"  Redis DB:   {REDIS_DB}")
else:
    print(f"  NEDBD URL:  {os.environ.get('NEDBD_URL', 'http://localhost:7070')}")
    print(f"  NEDB DB:    {os.environ.get('NEDB_DB', 'devnet')}")
try:
    redis_client.ping()
    print(f"  Storage:    Connected")
except Exception as e:
    print(f"  Storage:    FAILED - {e}")
print("="*50 + "\n")

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {"feed": set()}
    
    async def connect(self, websocket: WebSocket, channel: str = "feed", skip_accept: bool = False):
        if not skip_accept:
            await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = set()
        self.active_connections[channel].add(websocket)
    
    def disconnect_all(self, websocket: WebSocket):
        for channel in self.active_connections:
            self.active_connections[channel].discard(websocket)
    
    def disconnect(self, websocket: WebSocket, channel: str = "feed"):
        if channel in self.active_connections:
            self.active_connections[channel].discard(websocket)
    
    async def broadcast(self, message: dict, channel: str = "feed"):
        if channel in self.active_connections:
            dead_connections = set()
            for connection in self.active_connections[channel]:
                try:
                    await connection.send_json(message)
                except:
                    dead_connections.add(connection)
            for dead in dead_connections:
                self.active_connections[channel].discard(dead)

ws_manager = ConnectionManager()

# Track user-specific WebSocket connections for DM push
USER_WS_CONNECTIONS: Dict[str, WebSocket] = {}

async def push_dm_to_user(user_id: str, message: dict):
    """Push a DM message to a connected user"""
    if user_id in USER_WS_CONNECTIONS:
        try:
            await USER_WS_CONNECTIONS[user_id].send_json({
                "type": "dm_message",
                "message": message
            })
            print(f"[DEBUG] Pushed DM to user {user_id}")
        except Exception as e:
            print(f"[DEBUG] Failed to push DM to user {user_id}: {e}")
            USER_WS_CONNECTIONS.pop(user_id, None)
    else:
        print(f"[DEBUG] User {user_id} not connected via WebSocket")

async def push_notification_update(user_id: str):
    """Push real-time notification badge update to a connected user."""
    if user_id in USER_WS_CONNECTIONS:
        try:
            unread = int(redis_client.get(f"notifications:unread:{user_id}") or 0)
            await USER_WS_CONNECTIONS[user_id].send_json({
                "type": "notification_update",
                "unread_count": unread,
            })
        except Exception:
            USER_WS_CONNECTIONS.pop(user_id, None)

def build_frontend():
    subprocess.run([
        "npx", "esbuild", 
        str(BASE_DIR / "frontend" / "app.ts"),
        "--bundle",
        "--outfile=" + str(BASE_DIR / "static" / "app.js"),
        "--jsx=automatic",
        "--alias:@=" + str(BASE_DIR / "frontend" / "v1"),
        "--alias:wouter=" + str(BASE_DIR / "frontend" / "v1" / "lib" / "wouter-shim.tsx"),
        "--loader:.png=dataurl",
        "--minify"
    ], check=True)

def generate_hash(fingerprint: str, profile: dict) -> str:
    raw = f"{fingerprint}|{json.dumps(profile, sort_keys=True)}|{AUTH_SALT}"
    return hashlib.sha256(raw.encode()).hexdigest()

def get_user_by_hash(hash_value: str) -> Optional[dict]:
    user_id = redis_client.get(f"user:hash:{hash_value}")
    if user_id:
        user_data = redis_client.get(f"user:{user_id}")
        if user_data:
            return json.loads(str(user_data))
    return None


# ── AiAS v1 auth (email + password + optional TOTP → session tokens) ─────────
# The v1.2 front door (Mark, 2026-07-12): the fingerprint questionnaire is
# retired from the entry flow in favor of AiAS v1's proven login/register
# pattern. Session tokens ride the SAME X-Auth-Hash header the whole API
# already uses — get_current_user resolves sessions first, so all existing
# endpoints work unchanged. Legacy fingerprint auth stays functional for
# devnet.Interchained.org parity (redis mode).

SESSION_TTL_S = int(os.environ.get("DEVNET_SESSION_TTL_S", str(30 * 86400)))
LOGIN_2FA_TTL_S = 300
_PBKDF2_ITERS = 200_000


def _hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _PBKDF2_ITERS)
    return f"pbkdf2${_PBKDF2_ITERS}${salt.hex()}${dk.hex()}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        scheme, iters, salt_hex, hash_hex = stored.split("$")
        if scheme != "pbkdf2":
            return False
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(),
                                 bytes.fromhex(salt_hex), int(iters))
        return hmac.compare_digest(dk.hex(), hash_hex)
    except Exception:
        return False


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def _mint_session(user_id: str) -> str:
    token = "dvs_" + uuid.uuid4().hex + uuid.uuid4().hex
    redis_client.set(f"session:{token}", user_id, ex=SESSION_TTL_S)
    return token


def get_user_by_session(token: str) -> Optional[dict]:
    if not token or not token.startswith("dvs_"):
        return None
    user_id = redis_client.get(f"session:{token}")
    if not user_id:
        return None
    user_data = redis_client.get(f"user:{user_id}")
    return json.loads(str(user_data)) if user_data else None


@app.post("/api/auth/signup")
async def auth_v1_signup(request: Request):
    """AiAS v1-pattern registration: email + password + display name."""
    if DEVNET_AUTH == "aias":
        return await _fed_signup(request)
    data = await request.json()
    email = _normalize_email(data.get("email"))
    password = data.get("password") or ""
    display_name = normalize_username(data.get("display_name") or "")

    if not email or "@" not in email or "." not in email.split("@")[-1]:
        return JSONResponse({"success": False, "error": "A valid email is required."}, status_code=400)
    if len(password) < 8:
        return JSONResponse({"success": False, "error": "Password must be at least 8 characters."}, status_code=400)
    if not display_name:
        return JSONResponse({"success": False, "error": "Display name is required."}, status_code=400)
    if redis_client.get(f"user:email:{email}"):
        return JSONResponse({"success": False, "error": "An account with this email already exists."}, status_code=400)
    if get_user_by_display_name(display_name):
        return JSONResponse({"success": False, "error": "Username already taken. Please choose a different name."}, status_code=400)

    user_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    user = {
        "id": user_id,
        "displayName": display_name,
        "email": email,
        "password": _hash_password(password),
        "auth_scheme": "v1",
        "bio": data.get("bio", ""),
        "field": data.get("field", ""),
        "experience": "",
        "skills": [],
        "focus": "",
        "interests": [],
        "teamPreference": "",
        "talents": [],
        "portfolio": data.get("portfolio", ""),
        "age_confirmed": True,
        "twoFactorEnabled": False,
        "createdAt": now,
        "lastSeen": now,
        "isSuperAdmin": False,
    }
    pipeline = redis_client.pipeline()
    pipeline.set(f"user:{user_id}", json.dumps(user))
    pipeline.set(f"user:name:{display_name}", user_id)
    pipeline.set(f"user:email:{email}", user_id)
    pipeline.incr("stats:users:count")
    pipeline.execute()

    token = _mint_session(user_id)
    pub = {k: v for k, v in user.items() if k != "password"}
    return JSONResponse({"success": True, "user": pub, "session_token": token})


@app.post("/api/auth/login")
async def auth_v1_login(request: Request):
    """AiAS v1-pattern login. Returns requires_2fa + pending_token when the
    account has TOTP enabled, otherwise a session token directly."""
    if DEVNET_AUTH == "aias":
        return await _fed_login(request)
    data = await request.json()
    email = _normalize_email(data.get("email"))
    password = data.get("password") or ""

    user_id = redis_client.get(f"user:email:{email}") if email else None
    user_data = redis_client.get(f"user:{user_id}") if user_id else None
    user = json.loads(str(user_data)) if user_data else None
    if not user or not _verify_password(password, user.get("password") or ""):
        return JSONResponse({"success": False, "error": "Invalid email or password."}, status_code=401)
    if redis_client.sismember("platform:banned", user.get("id", "")):
        return JSONResponse({"success": False, "error": "Account unavailable."}, status_code=403)

    if user.get("twoFactorEnabled") and user.get("totp_secret"):
        pending = "dvp_" + uuid.uuid4().hex
        redis_client.set(f"login2fa:{pending}", user["id"], ex=LOGIN_2FA_TTL_S)
        return JSONResponse({"success": True, "requires_2fa": True, "pending_token": pending})

    token = _mint_session(user["id"])
    pub = {k: v for k, v in user.items() if k != "password"}
    return JSONResponse({"success": True, "user": pub, "session_token": token})


@app.post("/api/auth/login-2fa")
async def auth_v1_login_2fa(request: Request):
    if DEVNET_AUTH == "aias":
        return await _fed_login_2fa(request)
    data = await request.json()
    pending = data.get("pending_token") or ""
    code = (data.get("code") or "").strip()

    user_id = redis_client.get(f"login2fa:{pending}")
    if not user_id:
        return JSONResponse({"success": False, "error": "Verification session expired. Sign in again."}, status_code=401)
    user_data = redis_client.get(f"user:{user_id}")
    user = json.loads(str(user_data)) if user_data else None
    if not user or not user.get("totp_secret"):
        return JSONResponse({"success": False, "error": "2FA is not configured."}, status_code=400)

    totp = pyotp.TOTP(str(user["totp_secret"]))
    if not (len(code) == 6 and code.isdigit() and totp.verify(code, valid_window=1)):
        return JSONResponse({"success": False, "error": "Invalid verification code."}, status_code=401)

    redis_client.delete(f"login2fa:{pending}")
    token = _mint_session(user["id"])
    pub = {k: v for k, v in user.items() if k != "password"}
    return JSONResponse({"success": True, "user": pub, "session_token": token})


@app.post("/api/auth/signout")
async def auth_v1_signout(request: Request):
    token = request.headers.get("X-Auth-Hash", "")
    if token.startswith("dvs_"):
        redis_client.delete(f"session:{token}")
    else:
        redis_client.delete(f"aias_tok:{_tok_key(token)}")
    return JSONResponse({"success": True})


# ── The Bridge (P-A): v1 workspaces ARE devnet communities ───────────────────
# Mark's vision (2026-07-12): identity, not mirroring-with-foreign-keys.
#   v1 environment  ≡ devnet ecosystem   (same id)
#   v1 workspace    ≡ devnet community   (same id)
# One-way pull, powered by the CALLER's federated token (the server never
# stores credentials). Twins carry METADATA ONLY — workspace message bodies
# are per-org encrypted at v1 and are never copied; the conversation lane
# always reads live through v1 with the caller's token.
# Division of authority: v1 owns the conversation; devnet owns the social
# shell (membership, native channel, reactions, feed presence) on the twin.

def _slugify(text: str, fallback: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")[:40]
    return f"{base or 'workspace'}-{fallback[:6]}"


async def _bridge_upstream(token: str, path: str):
    try:
        r = await _aias_ahttp.get(path, headers={"X-Session-Token": token})
        return (r.json() if r.content else {}) if r.status_code == 200 else None
    except Exception as e:
        print(f"[bridge] upstream error on {path}: {type(e).__name__}")
        return None


@app.post("/api/bridge/sync-workspaces")
async def bridge_sync_workspaces(request: Request,
                                 x_auth_hash: Optional[str] = Header(None)):
    """Pull the caller's v1 environments + active-env workspaces and upsert
    devnet twins (ecosystems + communities) under the SAME ids."""
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = x_auth_hash or ""
    if DEVNET_AUTH != "aias" or token.startswith("dvs_"):
        return JSONResponse({"success": False,
                             "error": "The bridge requires a federated AiAS session."},
                            status_code=400)

    me = await _bridge_upstream(token, "/api/user/me") or {}
    me = me.get("user") or me
    active_env = me.get("active_environment_id") or ""

    envs_body = await _bridge_upstream(token, "/api/environments/") or {}
    envs = envs_body.get("environments") or (
        envs_body if isinstance(envs_body, list) else [])

    ws_body = await _bridge_upstream(token, "/api/user/workspaces?limit=100")
    if ws_body is None:
        return JSONResponse({"success": False,
                             "error": "AiAS production unreachable."},
                            status_code=502)
    workspaces = ws_body.get("workspaces") or []

    now = datetime.utcnow()
    counts = {"ecosystems": 0, "communities_created": 0,
              "communities_updated": 0, "archived": 0, "conflicts": 0}

    # ── ecosystems ← environments (ALL of them, same ids) ──
    eco_ids = set()
    for env in envs:
        env_id = env.get("id")
        if not env_id:
            continue
        eco_ids.add(env_id)
        existing_raw = redis_client.get(f"ecosystem:{env_id}")
        existing = json.loads(str(existing_raw)) if existing_raw else None
        if existing and existing.get("origin") != "aias_v1":
            counts["conflicts"] += 1  # never repurpose a non-twin
            continue
        name = env.get("name") or f"Environment {str(env_id)[:6]}"
        slug = _slugify(name, str(env_id))
        eco = existing or {
            "id": env_id, "slug": slug, "description":
                "AiAS environment — bridged from v1 production",
            "icon": "", "accent_color": "#22d3ee",
            "owner_id": user["id"], "created_at": now.isoformat(),
            "settings": {},
        }
        eco["name"] = name
        eco["origin"] = "aias_v1"
        eco["origin_synced_at"] = now.isoformat()
        pipeline = redis_client.pipeline()
        pipeline.set(f"ecosystem:{env_id}", json.dumps(eco))
        pipeline.set(f"ecosystem:slug:{eco['slug']}", env_id)
        pipeline.sadd(f"ecosystem:members:{env_id}", user["id"])
        pipeline.execute()
        counts["ecosystems"] += 1

    # ── communities ← workspaces (active env this pass) ──
    prev_ids = set(redis_client.smembers(f"bridge:groups:{user['id']}") or [])
    seen_ids = set()
    for w in workspaces:
        ws_id = w.get("id")
        if not ws_id:
            continue
        seen_ids.add(ws_id)
        eco_id = w.get("environment_id") or active_env or DEVONE_ECOSYSTEM_ID
        title = w.get("title") or (w.get("first_message") or "")[:40] \
            or f"Workspace {str(ws_id)[:6]}"
        attention = str(w.get("needs_human_attention")).lower() == "true"
        raw = redis_client.get(f"group:{ws_id}")
        existing = json.loads(str(raw)) if raw else None
        if existing and existing.get("origin") != "aias_v1":
            counts["conflicts"] += 1
            continue
        if existing:
            existing["name"] = title
            existing["status"] = "approved"
            existing["needs_attention"] = attention
            existing["origin_synced_at"] = now.isoformat()
            existing["ecosystem_id"] = existing.get("ecosystem_id") or eco_id
            redis_client.set(f"group:{ws_id}", json.dumps(existing))
            counts["communities_updated"] += 1
        else:
            slug = _slugify(title, str(ws_id))
            group = {
                "id": ws_id, "name": title, "slug": slug,
                "description": "AiAS workspace — the conversation lane lives on v1 production; this is its community.",
                "terms": "", "avatar": "",
                "creator_id": user["id"], "created_at": now.isoformat(),
                "status": "approved", "privacy": "private",
                "member_count": 1, "ecosystem_id": eco_id,
                "origin": "aias_v1",
                "origin_synced_at": now.isoformat(),
                "needs_attention": attention,
            }
            pipeline = redis_client.pipeline()
            pipeline.set(f"group:{ws_id}", json.dumps(group))
            pipeline.set(f"group:slug:{slug}", ws_id)
            pipeline.zadd("groups:approved", {ws_id: now.timestamp()})
            pipeline.zadd(f"ecosystem:groups:{eco_id}", {ws_id: now.timestamp()})
            pipeline.hset(f"group:roles:{ws_id}", user["id"], "owner")
            pipeline.sadd(f"group:members:{ws_id}", user["id"])
            pipeline.sadd(f"bridge:groups:{user['id']}", ws_id)
            pipeline.execute()
            counts["communities_created"] += 1
        # membership accrues from each caller's own v1 access
        if existing:
            pipeline = redis_client.pipeline()
            pipeline.sadd(f"group:members:{ws_id}", user["id"])
            pipeline.sadd(f"bridge:groups:{user['id']}", ws_id)
            if not redis_client.hget(f"group:roles:{ws_id}", user["id"]):
                pipeline.hset(f"group:roles:{ws_id}", user["id"], "owner")
            pipeline.execute()

    # ── archival: twins this user synced before that v1 no longer lists ──
    # (active-env scope: only archive twins that BELONG to the active env,
    # so rooms from other environments survive until you sync there.)
    for gone in (prev_ids - seen_ids):
        raw = redis_client.get(f"group:{gone}")
        if not raw:
            continue
        g = json.loads(str(raw))
        if g.get("origin") == "aias_v1" and g.get("status") != "archived" \
                and (not active_env or g.get("ecosystem_id") == active_env):
            g["status"] = "archived"
            g["origin_synced_at"] = now.isoformat()
            redis_client.set(f"group:{gone}", json.dumps(g))
            counts["archived"] += 1

    return JSONResponse({"success": True, **counts,
                         "active_environment": active_env})


# ── AiAS identity federation (v2: one identity, anchored at production) ──────
# Mark's architecture call (2026-07-12): devnet does NOT replace the aias
# backend — it becomes a first-class citizen of AiAS production. There is ONE
# login/register pattern: aias v1's. The landing proxies to
# {AIAS_API_BASE}/api/auth/login (+verify-2fa) and /api/user/register; the v1
# session token becomes THE credential everywhere (front door, social
# features, inline weave views). Devnet auto-provisions its social-graph user
# doc from the aias identity on first sight. DEVNET_AUTH=local keeps the
# self-contained mode for offline dev / air-gapped boots.

DEVNET_AUTH = os.environ.get("DEVNET_AUTH", "aias").lower()
AIAS_API_BASE = os.environ.get("AIAS_API_BASE", "https://api.aiassist.net").rstrip("/")
_AIAS_TOK_CACHE_S = int(os.environ.get("AIAS_TOKEN_CACHE_S", "300"))
# Async client for endpoint handlers — upstream slowness must NEVER block
# the event loop (the 3:43 PM login-502 regression: a shared blocking client
# wedged the loop once the desktop started fanning calls upstream).
_aias_ahttp = httpx.AsyncClient(base_url=AIAS_API_BASE, timeout=10.0)
# Short-timeout sync client ONLY for the cached token resolution inside the
# synchronous get_current_user path (one call per user per 300s).
_aias_http = httpx.Client(base_url=AIAS_API_BASE, timeout=6.0)


def _tok_key(token: str) -> str:
    """Cache key from a token — hash it; raw credentials never persist."""
    return hashlib.sha256((token or "").encode()).hexdigest()[:40]


def _fed_err(payload: dict, status: int) -> JSONResponse:
    msg = payload.get("detail") or payload.get("error") or "Sign-in failed."
    return JSONResponse({"success": False, "error": str(msg)}, status_code=status)


def _provision_aias_user(v1u: dict) -> dict:
    """Mirror an aias identity into the devnet social graph (id-stable)."""
    uid = v1u["id"]
    existing = redis_client.get(f"user:{uid}")
    if existing:
        user = json.loads(str(existing))
        user["lastSeen"] = datetime.utcnow().isoformat()
        # keep privilege in sync with production
        user["isSuperAdmin"] = v1u.get("role") in ("super_admin", "admin") or user.get("isSuperAdmin", False)
        redis_client.set(f"user:{uid}", json.dumps(user))
        return user

    base_name = normalize_username(v1u.get("display_name") or
                                   (v1u.get("email") or "member").split("@")[0])
    name, n = base_name or "member", 2
    while redis_client.get(f"user:name:{name}") not in (None, uid):
        name = f"{base_name}{n}"
        n += 1
    now = datetime.utcnow().isoformat()
    user = {
        "id": uid,
        "displayName": name,
        "email": v1u.get("email") or "",
        "auth_scheme": "aias",
        "plan": v1u.get("plan") or "",
        "bio": "", "field": "", "experience": "", "skills": [],
        "focus": "", "interests": [], "teamPreference": "", "talents": [],
        "portfolio": "", "age_confirmed": True,
        "twoFactorEnabled": True,  # governed by aias, not local TOTP
        "createdAt": now, "lastSeen": now,
        "isSuperAdmin": v1u.get("role") in ("super_admin", "admin"),
    }
    pipeline = redis_client.pipeline()
    pipeline.set(f"user:{uid}", json.dumps(user))
    pipeline.set(f"user:name:{name}", uid)
    if user["email"]:
        pipeline.set(f"user:email:{user['email'].lower()}", uid)
    pipeline.incr("stats:users:count")
    pipeline.execute()
    return user


def _aias_session_user(token: str) -> Optional[dict]:
    """Resolve an aias session token → provisioned devnet user (cached)."""
    if not token or token.startswith("dvs_"):
        return None
    uid = redis_client.get(f"aias_tok:{_tok_key(token)}")
    if uid:
        d = redis_client.get(f"user:{uid}")
        if d:
            return json.loads(str(d))
    try:
        r = _aias_http.get("/api/user/me", headers={"X-Session-Token": token})
        if r.status_code != 200:
            return None
        v1u = r.json()
        v1u = v1u.get("user") or v1u  # tolerate either envelope
        if not v1u.get("id"):
            return None
    except Exception:
        return None
    user = _provision_aias_user(v1u)
    redis_client.set(f"aias_tok:{_tok_key(token)}", user["id"],
                     ex=_AIAS_TOK_CACHE_S)
    return user


def _fed_finish(v1_payload: dict) -> JSONResponse:
    """Common tail for login/2fa/register proxies: provision + local shape."""
    v1u = v1_payload.get("user") or {}
    token = v1_payload.get("session_token")
    if not (v1u.get("id") and token):
        return _fed_err(v1_payload, 502)
    user = _provision_aias_user(v1u)
    redis_client.set(f"aias_tok:{_tok_key(token)}", user["id"],
                     ex=_AIAS_TOK_CACHE_S)
    pub = {k: v for k, v in user.items() if k != "password"}
    return JSONResponse({"success": True, "user": pub, "session_token": token})


async def _fed_login(request: Request) -> JSONResponse:
    data = await request.json()
    try:
        r = await _aias_ahttp.post("/api/auth/login", json={
            "email": (data.get("email") or "").strip(),
            "password": data.get("password") or ""})
    except Exception as e:
        print(f"[fed] login upstream error: {type(e).__name__}: {e}")
        return JSONResponse({"success": False, "error": "AiAS production unreachable — try again."}, status_code=502)
    body = r.json() if r.content else {}
    if r.status_code != 200:
        return _fed_err(body, r.status_code)
    if body.get("requires_2fa") and body.get("pending_token"):
        return JSONResponse({"success": True, "requires_2fa": True,
                             "pending_token": body["pending_token"]})
    return _fed_finish(body)


async def _fed_login_2fa(request: Request) -> JSONResponse:
    data = await request.json()
    try:
        r = await _aias_ahttp.post("/api/auth/verify-2fa", json={
            "pending_token": data.get("pending_token") or "",
            "code": (data.get("code") or "").strip()})
    except Exception as e:
        print(f"[fed] 2fa upstream error: {type(e).__name__}: {e}")
        return JSONResponse({"success": False, "error": "AiAS production unreachable — try again."}, status_code=502)
    body = r.json() if r.content else {}
    if r.status_code != 200:
        return _fed_err(body, r.status_code)
    return _fed_finish(body)


async def _fed_signup(request: Request) -> JSONResponse:
    data = await request.json()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""
    try:
        r = await _aias_ahttp.post("/api/user/register", json={
            "email": email, "password": password,
            "display_name": (data.get("display_name") or "").strip()})
    except Exception as e:
        print(f"[fed] register upstream error: {type(e).__name__}: {e}")
        return JSONResponse({"success": False, "error": "AiAS production unreachable — try again."}, status_code=502)
    body = r.json() if r.content else {}
    if r.status_code != 200:
        return _fed_err(body, r.status_code)
    # v1 register sets a cookie but returns no token in the body — complete
    # the loop with the one login pattern to get the header-transport token.
    try:
        r2 = await _aias_ahttp.post("/api/auth/login",
                                    json={"email": email, "password": password})
        body2 = r2.json() if r2.content else {}
    except Exception:
        return JSONResponse({"success": False, "error": "Registered — now sign in."}, status_code=502)
    if r2.status_code != 200 or not body2.get("session_token"):
        return JSONResponse({"success": True, "registered": True,
                             "error": "Account created — sign in to continue."})
    return _fed_finish(body2)

def get_current_user(auth_hash: str) -> Optional[dict]:
    """One credential header, two schemes: AiAS v1 session tokens (dvs_*)
    resolve first; legacy fingerprint hashes keep working for parity."""
    if not auth_hash:
        return None
    user = get_user_by_session(auth_hash) or get_user_by_hash(auth_hash)
    if user is None and DEVNET_AUTH == "aias":
        user = _aias_session_user(auth_hash)
    if user and redis_client.sismember("platform:banned", user.get("id", "")):
        return None
    return user

def is_super_admin(user: dict) -> bool:
    return bool(user.get("is_superadmin") or user.get("isSuperAdmin"))

def is_ecosystem_admin(eco_id: str, user_id: str) -> bool:
    role = redis_client.hget(f"ecosystem:roles:{eco_id}", user_id)
    return str(role) == "admin" if role else False

def check_ecosystem_permission(eco_id: str, user: dict) -> bool:
    return is_super_admin(user) or is_ecosystem_admin(eco_id, user["id"])

def is_any_admin(user: dict, ecosystem_id: str = None) -> bool:
    if user.get("is_admin") or is_super_admin(user):
        return True
    if ecosystem_id:
        return is_ecosystem_admin(ecosystem_id, user["id"])
    for key in redis_client.scan_iter(match="ecosystem:roles:*", count=100):
        role = redis_client.hget(str(key), user["id"])
        if str(role) == "admin":
            return True
    return False

def get_user_admin_ecosystems(user: dict) -> list:
    if user.get("is_admin") or is_super_admin(user):
        return ["__all__"]
    eco_ids = []
    for key in redis_client.scan_iter(match="ecosystem:roles:*", count=100):
        role = redis_client.hget(str(key), user["id"])
        if str(role) == "admin":
            eco_id = str(key).split("ecosystem:roles:")[-1]
            eco_ids.append(eco_id)
    return eco_ids

def require_admin_for_ecosystem(user: dict, ecosystem_id: str) -> None:
    if user.get("is_admin") or is_super_admin(user):
        return
    if not ecosystem_id or not is_ecosystem_admin(ecosystem_id, user["id"]):
        raise HTTPException(status_code=403, detail="Admin access required for this ecosystem")

# ============== MATCHMAKING ENGINE ==============
# Maps wizard answers to group slugs for auto-join

FIELD_TO_GROUPS = {
    "founder": ["startups", "saas", "indiehackers", "product"],
    "developer": ["coding", "developers", "fullstack", "git", "opensource"],
    "designer": ["ui", "ux", "product-design", "figma", "design-systems", "branding"],
    "marketer": ["marketing", "growth", "seo", "content", "social", "ads", "analytics"],
    "product": ["product", "product-design", "startups", "saas"],
    "freelancer": ["freelance", "remote", "sideprojects", "indiehackers"]
}

SKILL_TO_GROUPS = {
    "fullstack": ["fullstack", "coding", "developers", "frontend", "backend"],
    "frontend": ["frontend", "react", "javascript", "typescript", "ui"],
    "backend": ["backend", "nodejs", "python", "apis", "database"],
    "mobile": ["mobile", "react", "swift", "kotlin"],
    "ai": ["ai-ml", "data-science", "python"],
    "design": ["ui", "ux", "product-design", "figma", "design-systems"],
    "nocode": ["lowcode", "startups", "sideprojects"],
    "growth": ["growth", "marketing", "seo", "ads", "analytics"],
    "sales": ["startups", "saas", "freelance"],
    "content": ["content", "marketing", "writing"],
    "devops": ["devops", "cloud", "security", "backend"],
    "data": ["data-science", "analytics", "database", "python"]
}

FOCUS_TO_GROUPS = {
    "cofounder": ["startups", "saas", "indiehackers", "sideprojects"],
    "feedback": ["coding", "developers", "product", "startups"],
    "network": ["developers", "startups", "opensource", "learning"],
    "clients": ["freelance", "remote", "sideprojects"]
}

INTEREST_TO_GROUPS = {
    "saas": ["saas", "startups", "product", "indiehackers"],
    "indiehacking": ["indiehackers", "saas", "freelance", "startups", "sideprojects"],
    "ai-products": ["ai-ml", "data-science", "startups"],
    "devtools": ["devops", "git", "coding", "developers"],
    "ecommerce": ["marketing", "growth", "startups"],
    "content": ["content", "marketing", "writing"],
    "opensource": ["opensource", "git", "coding"],
    "web3": ["web3"],
    "buildinpublic": ["indiehackers", "startups", "sideprojects"],
    "revenue": ["saas", "startups", "growth", "freelance"],
    "fundraising": ["startups", "saas"],
    "remote": ["remote", "freelance"]
}

def get_matching_groups(user_profile: dict) -> list:
    """Map wizard answers to matching group slugs"""
    matched_slugs = set()
    
    field = user_profile.get("field", "")
    if field in FIELD_TO_GROUPS:
        matched_slugs.update(FIELD_TO_GROUPS[field])
    
    skills = user_profile.get("skills", [])
    if isinstance(skills, list):
        for skill in skills:
            if skill in SKILL_TO_GROUPS:
                matched_slugs.update(SKILL_TO_GROUPS[skill])
    
    focus = user_profile.get("focus", "")
    if focus in FOCUS_TO_GROUPS:
        matched_slugs.update(FOCUS_TO_GROUPS[focus])
    
    interests = user_profile.get("interests", [])
    if isinstance(interests, list):
        for interest in interests:
            if interest in INTEREST_TO_GROUPS:
                matched_slugs.update(INTEREST_TO_GROUPS[interest])
    
    experience = user_profile.get("experience", "")
    if experience in ["shipped", "scaling"]:
        matched_slugs.add("startups")
        matched_slugs.add("saas")
    if experience == "exploring":
        matched_slugs.add("learning")
        matched_slugs.add("sideprojects")
    
    return list(matched_slugs)

def auto_join_groups(user_id: str, user_profile: dict) -> list:
    """Auto-join user to all matching groups based on their profile"""
    matched_slugs = get_matching_groups(user_profile)
    if not matched_slugs:
        return []

    pipe = redis_client.pipeline()
    for slug in matched_slugs:
        pipe.get(f"group:slug:{slug}")
    slug_results = pipe.execute()

    slug_id_map = {}
    for slug, gid in zip(matched_slugs, slug_results):
        if gid:
            slug_id_map[slug] = str(gid)

    if not slug_id_map:
        return []

    pipe = redis_client.pipeline()
    slugs_ordered = list(slug_id_map.keys())
    for slug in slugs_ordered:
        gid = slug_id_map[slug]
        pipe.get(f"group:{gid}")
        pipe.sismember(f"group:members:{gid}", user_id)
    bulk = pipe.execute()

    to_join = []
    for i, slug in enumerate(slugs_ordered):
        group_data = bulk[i * 2]
        already_member = bulk[i * 2 + 1]
        if not group_data or already_member:
            continue
        group = json.loads(str(group_data))
        if not group.get("approved", True):
            continue
        to_join.append((slug, slug_id_map[slug], group))

    if not to_join:
        return []

    pipe = redis_client.pipeline()
    for slug, gid, group in to_join:
        pipe.sadd(f"group:members:{gid}", user_id)
        pipe.sadd(f"user:groups:{user_id}", gid)
        pipe.hset(f"group:roles:{gid}", user_id, "member")
    pipe.execute()

    return [
        {"id": gid, "name": group["name"], "slug": slug, "description": group.get("description", "")}
        for slug, gid, group in to_join
    ]

# ============== END MATCHMAKING ENGINE ==============

def seed_platform_groups():
    """Create default platform groups if they don't exist"""
    # Check if already seeded
    if redis_client.get("platform:seeded"):
        return
    
    SEED_GROUPS = [
        {"name": "Marketing", "slug": "marketing", "description": "Digital marketing, growth hacking, and brand strategy", "aliases": ["mktg"]},
        # Development - Languages & Frameworks
        {"name": "Coding", "slug": "coding", "description": "General programming discussions and code help", "aliases": ["programming", "code"]},
        {"name": "JavaScript", "slug": "javascript", "description": "JavaScript, ES6+, browser APIs, and beyond", "aliases": ["js"]},
        {"name": "TypeScript", "slug": "typescript", "description": "TypeScript language and type safety", "aliases": ["ts"]},
        {"name": "Python", "slug": "python", "description": "Python programming, frameworks, and libraries", "aliases": ["py"]},
        {"name": "React", "slug": "react", "description": "React.js, hooks, components, and ecosystem", "aliases": ["reactjs"]},
        {"name": "Vue.js", "slug": "vuejs", "description": "Vue.js framework, Vuex, and ecosystem", "aliases": ["vue"]},
        {"name": "Angular", "slug": "angular", "description": "Angular framework and enterprise apps", "aliases": ["ng"]},
        {"name": "Node.js", "slug": "nodejs", "description": "Node.js runtime, Express, and backend JS", "aliases": ["node"]},
        {"name": "Rust", "slug": "rust", "description": "Rust programming, systems, and WebAssembly", "aliases": ["rustlang"]},
        {"name": "Go", "slug": "golang", "description": "Go language, concurrency, and cloud native", "aliases": ["go"]},
        {"name": "PHP", "slug": "php", "description": "PHP, Laravel, WordPress development", "aliases": ["laravel"]},
        {"name": "Ruby", "slug": "ruby", "description": "Ruby and Rails development", "aliases": ["rails", "ror"]},
        {"name": "Java", "slug": "java", "description": "Java, Spring Boot, and enterprise development", "aliases": ["spring"]},
        {"name": "C#", "slug": "csharp", "description": ".NET, C#, and Microsoft ecosystem", "aliases": ["dotnet", "cs"]},
        {"name": "Swift", "slug": "swift", "description": "Swift and iOS/macOS development", "aliases": ["ios"]},
        {"name": "Kotlin", "slug": "kotlin", "description": "Kotlin and Android development", "aliases": ["android"]},
        {"name": "Vite", "slug": "vite", "description": "Vite build tool, plugins, and configuration", "aliases": ["vitejs"]},
        
        # Development - Infrastructure & Tools
        {"name": "DevOps", "slug": "devops", "description": "CI/CD, Docker, Kubernetes, and infrastructure", "aliases": ["servers", "infra"]},
        {"name": "Cloud", "slug": "cloud", "description": "AWS, GCP, Azure, and cloud architecture", "aliases": ["aws", "gcp", "azure"]},
        {"name": "Database", "slug": "database", "description": "SQL, NoSQL, data modeling, and optimization", "aliases": ["databases", "db", "sql"]},
        {"name": "APIs", "slug": "apis", "description": "REST, GraphQL, API design, and integrations", "aliases": ["api", "graphql", "rest"]},
        {"name": "Security", "slug": "security", "description": "AppSec, pentesting, and secure coding", "aliases": ["appsec", "infosec", "cybersecurity"]},
        {"name": "Testing", "slug": "testing", "description": "Unit tests, E2E, TDD, and QA automation", "aliases": ["qa", "tdd"]},
        {"name": "Git & GitHub", "slug": "git", "description": "Version control, workflows, and collaboration", "aliases": ["github", "gitlab"]},
        
        # Development - Specializations
        {"name": "Full Stack", "slug": "fullstack", "description": "End-to-end development discussions", "aliases": ["full-stack"]},
        {"name": "Frontend", "slug": "frontend", "description": "HTML, CSS, responsive design, and accessibility", "aliases": ["front-end", "css", "html"]},
        {"name": "Backend", "slug": "backend", "description": "Server architecture, APIs, and scalability", "aliases": ["back-end"]},
        {"name": "Mobile Dev", "slug": "mobile", "description": "iOS, Android, React Native, Flutter", "aliases": ["mobiledev", "flutter", "reactnative"]},
        {"name": "Web3", "slug": "web3", "description": "Blockchain, smart contracts, and crypto dev", "aliases": ["blockchain", "crypto", "solidity"]},
        {"name": "Game Dev", "slug": "gamedev", "description": "Game development, Unity, Unreal, and more", "aliases": ["unity", "unreal", "games"]},
        {"name": "AI & ML", "slug": "ai-ml", "description": "Artificial intelligence and machine learning", "aliases": ["ai", "ml", "machinelearning"]},
        {"name": "Data Science", "slug": "data-science", "description": "Data analysis, visualization, and pipelines", "aliases": ["data", "analytics"]},
        {"name": "Low Code", "slug": "lowcode", "description": "No-code and low-code platforms", "aliases": ["nocode", "webflow", "bubble"]},
        
        # Design
        {"name": "UX Design", "slug": "ux", "description": "User experience, research, and usability", "aliases": ["uxdesign", "userexperience"]},
        {"name": "UI Design", "slug": "ui", "description": "User interface design and visual design", "aliases": ["uidesign"]},
        {"name": "Product Design", "slug": "product-design", "description": "End-to-end product design process", "aliases": ["productdesign"]},
        {"name": "Figma", "slug": "figma", "description": "Figma tips, plugins, and workflows", "aliases": ["figmadesign"]},
        {"name": "Design Systems", "slug": "design-systems", "description": "Component libraries and design tokens", "aliases": ["designsystem"]},
        {"name": "Motion Design", "slug": "motion", "description": "Animation, micro-interactions, and motion", "aliases": ["animation", "lottie"]},
        {"name": "Brand Design", "slug": "branding", "description": "Logos, identity, and brand strategy", "aliases": ["brand", "logo"]},
        
        # Marketing
        {"name": "Marketing", "slug": "marketing", "description": "General marketing strategy and tactics", "aliases": ["mktg"]},
        {"name": "Growth", "slug": "growth", "description": "Growth hacking, experimentation, and PLG", "aliases": ["growthhacking", "plg"]},
        {"name": "SEO", "slug": "seo", "description": "Search engine optimization and organic traffic", "aliases": ["searchengine"]},
        {"name": "Content Marketing", "slug": "content", "description": "Content strategy, blogging, and storytelling", "aliases": ["contentmarketing", "blogging"]},
        {"name": "Social Media", "slug": "social", "description": "Social media strategy and community", "aliases": ["socialmedia", "twitter", "linkedin"]},
        {"name": "Email Marketing", "slug": "email", "description": "Email campaigns, newsletters, and automation", "aliases": ["emailmarketing", "newsletters"]},
        {"name": "Paid Ads", "slug": "ads", "description": "PPC, Facebook Ads, Google Ads, and more", "aliases": ["ppc", "advertising", "facebookads"]},
        {"name": "Analytics", "slug": "analytics", "description": "Marketing analytics, attribution, and metrics", "aliases": ["ga4", "mixpanel"]},
        {"name": "Copywriting", "slug": "copywriting", "description": "Sales copy, landing pages, and messaging", "aliases": ["copy"]},
        {"name": "Video Marketing", "slug": "video", "description": "YouTube, video content, and production", "aliases": ["youtube", "videomarketing"]},
        {"name": "Influencer", "slug": "influencer", "description": "Influencer marketing and partnerships", "aliases": ["influencers", "creators"]},
        {"name": "PR & Comms", "slug": "pr", "description": "Public relations and communications", "aliases": ["publicrelations", "comms"]},
        
        # Product & Business
        {"name": "Product", "slug": "product", "description": "Product management and strategy", "aliases": ["productmanagement", "pm"]},
        {"name": "SaaS", "slug": "saas", "description": "SaaS building, pricing, and growth", "aliases": ["saassignal"]},
        {"name": "Startups", "slug": "startups", "description": "Building products and entrepreneurship", "aliases": ["startup", "founders"]},
        {"name": "Indie Hackers", "slug": "indiehackers", "description": "Solo founders and bootstrapping", "aliases": ["indie", "bootstrap"]},
        {"name": "Freelance", "slug": "freelance", "description": "Freelancing, consulting, and client work", "aliases": ["freelancer", "consulting"]},
        {"name": "Remote Work", "slug": "remote", "description": "Remote work culture and productivity", "aliases": ["remotework", "wfh"]},
        {"name": "Agencies", "slug": "agencies", "description": "Running and scaling agencies", "aliases": ["agency"]},
        {"name": "E-commerce", "slug": "ecommerce", "description": "Online stores, Shopify, and DTC brands", "aliases": ["shopify", "dtc"]},
        
        # Career & Community
        {"name": "Developers", "slug": "developers", "description": "General developer community and career", "aliases": ["developer", "devs", "dev"]},
        {"name": "Career", "slug": "career", "description": "Job hunting, interviews, and career growth", "aliases": ["jobs", "hiring"]},
        {"name": "Open Source", "slug": "opensource", "description": "Contributing to OSS and community", "aliases": ["oss"]},
        {"name": "Tech Twitter", "slug": "techtwitter", "description": "Building in public and tech community", "aliases": ["buildinpublic"]},
        {"name": "Side Projects", "slug": "sideprojects", "description": "Side hustles and passion projects", "aliases": ["sideproject"]},
        {"name": "Learning", "slug": "learning", "description": "Learning resources and skill development", "aliases": ["learn", "education"]},
    ]
    
    # Get or create a system admin user for platform groups
    system_user_id = redis_client.get("system:admin:id")
    if not system_user_id:
        system_user_id = str(uuid.uuid4())
        system_user = {
            "id": system_user_id,
            "displayName": "DevNetwork",
            "bio": "Official platform account",
            "is_admin": True,
            "is_system": True,
            "created_at": datetime.utcnow().isoformat()
        }
        redis_client.set(f"user:{system_user_id}", json.dumps(system_user))
        redis_client.set("system:admin:id", system_user_id)
    else:
        system_user_id = str(system_user_id)
    
    for group_data in SEED_GROUPS:
        # Check if group already exists
        existing = redis_client.get(f"group:slug:{group_data['slug']}")
        if existing:
            continue
        
        group_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        group = {
            "id": group_id,
            "name": group_data["name"],
            "slug": group_data["slug"],
            "description": group_data.get("description", ""),
            "owner_id": system_user_id,
            "created_at": now,
            "is_approved": True,
            "is_platform": True,
            "member_count": 0,
            "ecosystem_id": DEVONE_ECOSYSTEM_ID
        }
        
        ts = datetime.utcnow().timestamp()
        pipeline = redis_client.pipeline()
        pipeline.set(f"group:{group_id}", json.dumps(group))
        pipeline.set(f"group:slug:{group_data['slug']}", group_id)
        pipeline.zadd("groups:approved", {group_id: ts})
        pipeline.zadd(f"ecosystem:groups:{DEVONE_ECOSYSTEM_ID}", {group_id: ts})
        
        # Set up aliases
        for alias in group_data.get("aliases", []):
            pipeline.set(f"group:alias:{alias.lower()}", group_data["slug"])
            pipeline.sadd(f"group:aliases:{group_id}", alias.lower())
        
        pipeline.execute()
        print(f"[SEED] Created platform group: {group_data['name']} (/{group_data['slug']})")
    
    # Mark as seeded
    redis_client.set("platform:seeded", "1")
    print("[SEED] Platform seeding complete")

def migrate_devone_id():
    if redis_client.get("ecosystem:migration:devone_uuid:done"):
        return
    old_id = DEVONE_LEGACY_ID
    new_id = DEVONE_ECOSYSTEM_ID
    if not redis_client.exists(f"ecosystem:{old_id}"):
        redis_client.set("ecosystem:migration:devone_uuid:done", "1")
        return
    
    print(f"[MIGRATION] Migrating DevOne ecosystem ID: {old_id} -> {new_id}")
    
    eco_data = redis_client.get(f"ecosystem:{old_id}")
    if eco_data:
        eco = json.loads(str(eco_data))
        eco["id"] = new_id
        redis_client.set(f"ecosystem:{new_id}", json.dumps(eco))
        redis_client.delete(f"ecosystem:{old_id}")
    
    slug_data = redis_client.get(f"ecosystem:slug:{old_id}")
    if slug_data:
        redis_client.set(f"ecosystem:slug:devone", new_id)
        if str(slug_data) == old_id:
            redis_client.set(f"ecosystem:slug:devone", new_id)
    
    score = redis_client.zscore("ecosystems:list", old_id)
    if score is not None:
        pipeline = redis_client.pipeline()
        pipeline.zrem("ecosystems:list", old_id)
        pipeline.zadd("ecosystems:list", {new_id: score})
        pipeline.execute()
    
    members = redis_client.smembers(f"ecosystem:members:{old_id}")
    if members:
        pipeline = redis_client.pipeline()
        for m in members:
            pipeline.sadd(f"ecosystem:members:{new_id}", str(m))
            pipeline.srem(f"user:ecosystems:{str(m)}", old_id)
            pipeline.sadd(f"user:ecosystems:{str(m)}", new_id)
        pipeline.delete(f"ecosystem:members:{old_id}")
        pipeline.execute()
    
    roles = redis_client.hgetall(f"ecosystem:roles:{old_id}")
    if roles:
        pipeline = redis_client.pipeline()
        for uid, role in roles.items():
            pipeline.hset(f"ecosystem:roles:{new_id}", str(uid), str(role))
        pipeline.delete(f"ecosystem:roles:{old_id}")
        pipeline.execute()
    
    groups = redis_client.zrange(f"ecosystem:groups:{old_id}", 0, -1, withscores=True)
    if groups:
        pipeline = redis_client.pipeline()
        for gid, sc in groups:
            gid = str(gid)
            pipeline.zadd(f"ecosystem:groups:{new_id}", {gid: sc})
            gdata = redis_client.get(f"group:{gid}")
            if gdata:
                g = json.loads(str(gdata))
                if g.get("ecosystem_id") == old_id:
                    g["ecosystem_id"] = new_id
                    pipeline.set(f"group:{gid}", json.dumps(g))
        pipeline.delete(f"ecosystem:groups:{old_id}")
        pipeline.execute()
    
    banned = redis_client.smembers(f"ecosystem:banned:{old_id}")
    if banned:
        pipeline = redis_client.pipeline()
        for uid in banned:
            pipeline.sadd(f"ecosystem:banned:{new_id}", str(uid))
        pipeline.delete(f"ecosystem:banned:{old_id}")
        pipeline.execute()
    
    redis_client.set("ecosystem:migration:devone_uuid:done", "1")
    print(f"[MIGRATION] DevOne ID migration complete: {new_id}")

def bootstrap_ecosystems():
    migrate_devone_id()
    
    if redis_client.get("ecosystem:backfill:done"):
        print("[ECOSYSTEM] Backfill already complete, skipping")
        return

    print("[ECOSYSTEM] Starting ecosystem bootstrap and backfill...")

    system_user_id = redis_client.get("system:admin:id")
    if system_user_id:
        system_user_id = str(system_user_id)
    else:
        system_user_id = str(uuid.uuid4())
        system_user = {
            "id": system_user_id,
            "displayName": "DevNetwork",
            "bio": "Official platform account",
            "is_admin": True,
            "is_superadmin": True,
            "is_system": True,
            "created_at": datetime.utcnow().isoformat()
        }
        redis_client.set(f"user:{system_user_id}", json.dumps(system_user))
        redis_client.set("system:admin:id", system_user_id)

    now = datetime.utcnow()
    ecosystem = {
        "id": DEVONE_ECOSYSTEM_ID,
        "name": "DevOne",
        "slug": "devone",
        "description": "The default DevNetwork ecosystem",
        "icon": "",
        "accent_color": "#10b981",
        "owner_id": system_user_id,
        "created_at": now.isoformat(),
        "settings": {}
    }

    pipeline = redis_client.pipeline()
    pipeline.set(f"ecosystem:{DEVONE_ECOSYSTEM_ID}", json.dumps(ecosystem))
    pipeline.set(f"ecosystem:slug:devone", DEVONE_ECOSYSTEM_ID)
    pipeline.zadd("ecosystems:list", {DEVONE_ECOSYSTEM_ID: now.timestamp()})
    pipeline.sadd(f"ecosystem:members:{DEVONE_ECOSYSTEM_ID}", system_user_id)
    pipeline.sadd(f"user:ecosystems:{system_user_id}", DEVONE_ECOSYSTEM_ID)
    pipeline.hset(f"ecosystem:roles:{DEVONE_ECOSYSTEM_ID}", system_user_id, "admin")
    pipeline.execute()
    print(f"[ECOSYSTEM] Created DevOne ecosystem with owner {system_user_id}")

    group_count = 0
    for set_key in ["groups:approved", "groups:pending"]:
        group_ids = redis_client.zrange(set_key, 0, -1)
        for gid in group_ids:
            gid = str(gid)
            group_data = redis_client.get(f"group:{gid}")
            if not group_data:
                continue
            group = json.loads(str(group_data))
            if not group.get("ecosystem_id"):
                group["ecosystem_id"] = DEVONE_ECOSYSTEM_ID
                redis_client.set(f"group:{gid}", json.dumps(group))
            redis_client.zadd(f"ecosystem:groups:{DEVONE_ECOSYSTEM_ID}", {gid: datetime.utcnow().timestamp()})
            group_count += 1
    print(f"[ECOSYSTEM] Backfilled {group_count} groups into DevOne")

    user_count = 0
    admin_count = 0
    user_keys = redis_client.keys("user:*")
    for k in user_keys:
        key = str(k)
        parts = key.split(":")
        if len(parts) != 2:
            continue
        uid = parts[1]
        user_data = redis_client.get(key)
        if not user_data:
            continue
        try:
            user = json.loads(str(user_data))
        except (json.JSONDecodeError, TypeError):
            continue
        if "id" not in user:
            continue

        redis_client.sadd(f"ecosystem:members:{DEVONE_ECOSYSTEM_ID}", uid)
        redis_client.sadd(f"user:ecosystems:{uid}", DEVONE_ECOSYSTEM_ID)
        user_count += 1

        if user.get("is_admin"):
            if not user.get("is_superadmin"):
                user["is_superadmin"] = True
                redis_client.set(key, json.dumps(user))
            redis_client.hset(f"ecosystem:roles:{DEVONE_ECOSYSTEM_ID}", uid, "admin")
            admin_count += 1

    print(f"[ECOSYSTEM] Backfilled {user_count} users into DevOne ({admin_count} admins migrated to superadmin)")
    redis_client.set("ecosystem:backfill:done", "1")
    print("[ECOSYSTEM] Bootstrap complete!")

def init_geppetto():
    """Initialize Geppetto - the bot orchestration system bot"""
    existing = redis_client.get(f"user:{GEPPETTO_ID}")
    if existing:
        return
    
    now = datetime.utcnow().isoformat()
    geppetto = {
        "id": GEPPETTO_ID,
        "displayName": "Geppetto",
        "bio": "I help you create and manage bots on DevNetwork. DM me to get started!",
        "field": "Bot Orchestration",
        "experience": "system",
        "skills": ["bot-management", "automation", "orchestration"],
        "focus": "Helping developers build great bots",
        "interests": [],
        "teamPreference": "",
        "talents": ["Bot Creation", "API Management"],
        "portfolio": "",
        "avatar": "",
        "createdAt": now,
        "lastSeen": now,
        "isSuperAdmin": False,
        "is_bot": True,
        "is_system_bot": True,
        "bot_data": {
            "operator_id": "system",
            "purpose": "Bot orchestration console for DevNetwork. Create and manage your bots through conversational commands.",
            "capabilities_declared": ["send_dm", "read_dm", "system_commands"],
            "capabilities_granted_global": ["send_dm", "read_dm", "system_commands"],
            "status": "active",
            "created_at": now
        }
    }
    
    pipeline = redis_client.pipeline()
    pipeline.set(f"user:{GEPPETTO_ID}", json.dumps(geppetto))
    pipeline.set(f"user:name:{GEPPETTO_USERNAME}", GEPPETTO_ID)
    pipeline.execute()
    
    print(f"[INIT] Geppetto bot initialized")

def generate_bot_token():
    """Generate a cryptographically secure bot API token"""
    import secrets
    random_bytes = secrets.token_hex(32)
    return f"{BOT_TOKEN_PREFIX}{random_bytes}"

def hash_bot_token(token: str) -> str:
    """Hash a bot token for storage"""
    return hashlib.sha256(token.encode()).hexdigest()

def get_bot_by_token(token: str):
    """Look up a bot by its API token and track usage"""
    if not token.startswith(BOT_TOKEN_PREFIX):
        return None
    token_hash = hash_bot_token(token)
    bot_id = redis_client.get(f"bot:token:{token_hash}")
    if bot_id:
        user_data = redis_client.get(f"user:{bot_id}")
        if user_data:
            user = json.loads(user_data)
            if user.get("is_bot") and user.get("bot_data", {}).get("status") != "deleted":
                user["bot_data"]["api_token_last_used_at"] = datetime.utcnow().isoformat()
                redis_client.set(f"user:{bot_id}", json.dumps(user))
                return user
    return None

def create_bot(operator_id: str, username: str, display_name: str, purpose: str, capabilities: list):
    """Create a new bot user"""
    username_normalized = username.lower().strip()
    if not username_normalized.endswith("_bot") and not username_normalized.endswith("bot"):
        username_normalized = username_normalized + "_bot"
    
    if not redis_client.setnx(f"user:name:{username_normalized}", "pending"):
        return None, None
    
    bot_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    token = generate_bot_token()
    token_hash = hash_bot_token(token)
    
    bot = {
        "id": bot_id,
        "displayName": display_name,
        "username": username_normalized,
        "bio": purpose,
        "field": "Bot",
        "experience": "",
        "skills": [],
        "focus": "",
        "interests": [],
        "teamPreference": "",
        "talents": [],
        "portfolio": "",
        "avatar": "",
        "createdAt": now,
        "lastSeen": now,
        "isSuperAdmin": False,
        "is_bot": True,
        "is_system_bot": False,
        "bot_data": {
            "operator_id": operator_id,
            "username": username_normalized,
            "purpose": purpose,
            "capabilities_declared": capabilities,
            "capabilities_granted_global": capabilities,
            "webhook_url": None,
            "webhook_secret": None,
            "api_token_hash": token_hash,
            "api_token_suffix": token[-4:],
            "api_token_created_at": now,
            "api_token_last_used_at": None,
            "reputation": 0,
            "status": "active",
            "created_at": now
        }
    }
    
    pipeline = redis_client.pipeline()
    pipeline.set(f"user:{bot_id}", json.dumps(bot))
    pipeline.set(f"user:name:{username_normalized}", bot_id)
    pipeline.set(f"bot:token:{token_hash}", bot_id)
    pipeline.sadd(f"bot:operator:{operator_id}", bot_id)
    pipeline.execute()
    
    return bot, token

def get_operator_bots(operator_id: str):
    """Get all bots owned by an operator"""
    bot_ids = redis_client.smembers(f"bot:operator:{operator_id}")
    bots = []
    for bot_id in bot_ids:
        bot_data = redis_client.get(f"user:{bot_id}")
        if bot_data:
            bots.append(json.loads(bot_data))
    return bots

def delete_bot(bot_id: str, operator_id: str):
    """Delete a bot (soft-delete by marking as deleted, preserves audit history)"""
    bot_data = redis_client.get(f"user:{bot_id}")
    if not bot_data:
        return False
    
    bot = json.loads(bot_data)
    if not bot.get("is_bot") or bot.get("bot_data", {}).get("operator_id") != operator_id:
        return False
    
    token_hash = bot.get("bot_data", {}).get("api_token_hash")
    username = bot.get("bot_data", {}).get("username") or bot.get("username") or bot.get("displayName", "").lower()
    
    bot["bot_data"]["status"] = "deleted"
    bot["bot_data"]["deleted_at"] = datetime.utcnow().isoformat()
    bot["bot_data"]["api_token_hash"] = None
    
    pipeline = redis_client.pipeline()
    pipeline.set(f"user:{bot_id}", json.dumps(bot))
    pipeline.delete(f"user:name:{username}")
    if token_hash:
        pipeline.delete(f"bot:token:{token_hash}")
    pipeline.srem(f"bot:operator:{operator_id}", bot_id)
    pipeline.execute()
    
    return True

def regenerate_bot_token(bot_id: str, operator_id: str):
    """Regenerate a bot's API token"""
    bot_data = redis_client.get(f"user:{bot_id}")
    if not bot_data:
        return None
    
    bot = json.loads(bot_data)
    if not bot.get("is_bot") or bot.get("bot_data", {}).get("operator_id") != operator_id:
        return None
    
    old_token_hash = bot.get("bot_data", {}).get("api_token_hash")
    
    new_token = generate_bot_token()
    new_token_hash = hash_bot_token(new_token)
    now = datetime.utcnow().isoformat()
    
    bot["bot_data"]["api_token_hash"] = new_token_hash
    bot["bot_data"]["api_token_suffix"] = new_token[-4:]
    bot["bot_data"]["api_token_created_at"] = now
    
    pipeline = redis_client.pipeline()
    pipeline.set(f"user:{bot_id}", json.dumps(bot))
    pipeline.set(f"bot:token:{new_token_hash}", bot_id)
    if old_token_hash:
        pipeline.delete(f"bot:token:{old_token_hash}")
    pipeline.execute()
    
    return new_token

def authenticate_bot_request(request: Request) -> Optional[dict]:
    """Authenticate a bot API request via Bearer token"""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:]
    return get_bot_by_token(token)

def log_bot_action(bot: dict, action: str, target: dict, scope: str = "global", data: dict = None):
    """Log a bot action for audit trail"""
    event_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    event = {
        "event_id": event_id,
        "actor": {
            "bot_id": bot["id"],
            "operator_id": bot.get("bot_data", {}).get("operator_id"),
            "display_name": bot.get("displayName")
        },
        "action": action,
        "target": target,
        "scope": scope,
        "timestamp": now,
        "data": data or {}
    }
    
    pipeline = redis_client.pipeline()
    pipeline.lpush("bot:audit:log", json.dumps(event))
    pipeline.zadd("bot:audit:timeline", {event_id: datetime.utcnow().timestamp()})
    pipeline.hincrby("bot:audit:counts", action, 1)
    pipeline.ltrim("bot:audit:log", 0, 9999)
    pipeline.execute()
    
    return event_id

def is_bot_eco_banned(bot_id: str, group_id: str = None) -> bool:
    """Check if a bot is banned from the ecosystem that a group belongs to"""
    if not group_id:
        return False
    group_data = redis_client.get(f"group:{group_id}")
    if not group_data:
        return False
    group = json.loads(str(group_data))
    eco_id = group.get("ecosystem_id", DEVONE_ECOSYSTEM_ID)
    return bool(redis_client.sismember(f"ecosystem:bot_bans:{eco_id}", bot_id))

def check_bot_capability(bot: dict, capability: str, group_id: str = None) -> bool:
    """Check if a bot has a specific capability"""
    if group_id and is_bot_eco_banned(bot["id"], group_id):
        return False
    
    bot_data = bot.get("bot_data", {})
    
    if capability == "group_message" and group_id:
        approved_groups = bot_data.get("approved_groups", [])
        return group_id in approved_groups
    
    if capability in bot_data.get("capabilities_granted_global", []):
        return True
    
    if group_id:
        group_caps = bot_data.get(f"capabilities_granted_group:{group_id}", [])
        if capability in group_caps:
            return True
    
    return False

def create_bot_group_application(bot: dict, group_id: str) -> bool:
    """Create a pending application for bot to join a group"""
    group_data = redis_client.get(f"group:{group_id}")
    if not group_data:
        return False
    
    group = json.loads(str(group_data))
    
    eco_id = group.get("ecosystem_id", DEVONE_ECOSYSTEM_ID)
    if redis_client.sismember(f"ecosystem:bot_bans:{eco_id}", bot["id"]):
        return False
    
    app_key = f"bot:group_application:{bot['id']}:{group_id}"
    
    if redis_client.exists(app_key):
        return False
    
    now = datetime.utcnow().isoformat()
    application = {
        "bot_id": bot["id"],
        "bot_name": bot.get("displayName", "Bot"),
        "bot_username": bot.get("username", ""),
        "bot_purpose": bot.get("bot_data", {}).get("purpose", ""),
        "group_id": group_id,
        "group_name": group.get("name", ""),
        "owner_id": group.get("owner_id"),
        "status": "pending",
        "created_at": now
    }
    
    redis_client.set(app_key, json.dumps(application))
    redis_client.sadd(f"group:bot_applications:{group_id}", bot["id"])
    
    if group.get("owner_id"):
        notification = {
            "id": str(uuid.uuid4()),
            "type": "bot_application",
            "message": f"Bot **{bot.get('displayName')}** wants to join your group **{group.get('name')}**",
            "data": {"bot_id": bot["id"], "group_id": group_id, "bot_name": bot.get("displayName")},
            "created_at": now,
            "read": False
        }
        redis_client.lpush(f"notifications:{group['owner_id']}", json.dumps(notification))
        redis_client.incr(f"notifications:unread:{group['owner_id']}")
    
    return True

def approve_bot_for_group(bot_id: str, group_id: str, approver_id: str) -> bool:
    """Approve a bot to message in a group"""
    group_data = redis_client.get(f"group:{group_id}")
    if not group_data:
        return False
    
    group = json.loads(str(group_data))
    role = redis_client.hget(f"group:roles:{group_id}", approver_id)
    role_str = str(role) if role else ""
    approver_data = redis_client.get(f"user:{approver_id}")
    approver_is_admin = False
    if approver_data:
        approver_is_admin = json.loads(str(approver_data)).get("is_admin", False)
    if role_str not in ["owner", "admin"] and group.get("creator_id") != approver_id and not approver_is_admin:
        return False
    
    bot_data = redis_client.get(f"user:{bot_id}")
    if not bot_data:
        return False
    
    bot = json.loads(str(bot_data))
    if not bot.get("is_bot"):
        return False
    
    approved_groups = bot.get("bot_data", {}).get("approved_groups", [])
    if group_id not in approved_groups:
        approved_groups.append(group_id)
        bot["bot_data"]["approved_groups"] = approved_groups
        redis_client.set(f"user:{bot_id}", json.dumps(bot))
    
    redis_client.sadd(f"group:members:{group_id}", bot_id)
    redis_client.hset(f"group:roles:{group_id}", bot_id, "member")
    
    redis_client.delete(f"bot:group_application:{bot_id}:{group_id}")
    redis_client.srem(f"group:bot_applications:{group_id}", bot_id)
    
    operator_id = bot.get("bot_data", {}).get("operator_id")
    if operator_id:
        notification = {
            "id": str(uuid.uuid4()),
            "type": "bot_approved",
            "message": f"Your bot **{bot.get('displayName')}** was approved for group **{group.get('name')}**",
            "data": {"bot_id": bot_id, "group_id": group_id},
            "created_at": datetime.utcnow().isoformat(),
            "read": False
        }
        redis_client.lpush(f"notifications:{operator_id}", json.dumps(notification))
        redis_client.incr(f"notifications:unread:{operator_id}")
    
    return True

def reject_bot_for_group(bot_id: str, group_id: str, approver_id: str) -> bool:
    """Reject a bot application for a group"""
    group_data = redis_client.get(f"group:{group_id}")
    if not group_data:
        return False
    
    group = json.loads(str(group_data))
    role = redis_client.hget(f"group:roles:{group_id}", approver_id)
    role_str = str(role) if role else ""
    approver_data = redis_client.get(f"user:{approver_id}")
    approver_is_admin = False
    if approver_data:
        approver_is_admin = json.loads(str(approver_data)).get("is_admin", False)
    if role_str not in ["owner", "admin"] and group.get("creator_id") != approver_id and not approver_is_admin:
        return False
    
    redis_client.delete(f"bot:group_application:{bot_id}:{group_id}")
    redis_client.srem(f"group:bot_applications:{group_id}", bot_id)
    
    bot_data = redis_client.get(f"user:{bot_id}")
    if bot_data:
        bot = json.loads(str(bot_data))
        operator_id = bot.get("bot_data", {}).get("operator_id")
        if operator_id:
            notification = {
                "id": str(uuid.uuid4()),
                "type": "bot_rejected",
                "message": f"Your bot **{bot.get('displayName')}** was rejected from group **{group.get('name')}**",
                "data": {"bot_id": bot_id, "group_id": group_id},
                "created_at": datetime.utcnow().isoformat(),
                "read": False
            }
            redis_client.lpush(f"notifications:{operator_id}", json.dumps(notification))
            redis_client.incr(f"notifications:unread:{operator_id}")
    
    return True

BOT_WS_CONNECTIONS: dict = {}

def get_wizard_state(user_id: str):
    """Get wizard state from Redis"""
    data = redis_client.get(f"bot_wizard:{user_id}")
    if data:
        return json.loads(data)
    return None

def set_wizard_state(user_id: str, state: dict):
    """Set wizard state in Redis with 1 hour expiry"""
    redis_client.setex(f"bot_wizard:{user_id}", 3600, json.dumps(state))

def clear_wizard_state(user_id: str):
    """Clear wizard state from Redis"""
    redis_client.delete(f"bot_wizard:{user_id}")

async def push_dm_to_bot_local(bot_id: str, payload: dict) -> bool:
    """Try to push DM to locally connected bot. Returns True if delivered."""
    if bot_id in BOT_WS_CONNECTIONS:
        ws = BOT_WS_CONNECTIONS[bot_id]
        try:
            print(f"[DEBUG] WebSocket state for {bot_id}: client_state={ws.client_state}, application_state={ws.application_state}")
            await ws.send_json(payload)
            print(f"[DEBUG] DM sent locally to bot {bot_id}")
            return True
        except Exception as e:
            print(f"[DEBUG] Failed to send DM to bot locally: {e}")
            import traceback
            traceback.print_exc()
            del BOT_WS_CONNECTIONS[bot_id]
            return False
    return False

async def push_dm_to_bot(bot_id: str, message_data: dict):
    """Push a DM to a connected bot via WebSocket (with Redis pub/sub for multi-instance)"""
    print(f"[DEBUG] push_dm_to_bot called for bot_id={bot_id}")
    print(f"[DEBUG] BOT_WS_CONNECTIONS keys: {list(BOT_WS_CONNECTIONS.keys())}")
    
    payload = {
        "type": "dm",
        "sender_id": message_data.get("user_id"),
        "sender_name": message_data.get("user_name"),
        "content": message_data.get("content", ""),
        "image_url": message_data.get("image_url", ""),
        "conv_id": message_data.get("conv_id"),
        "created_at": message_data.get("created_at")
    }
    
    if bot_id in BOT_WS_CONNECTIONS:
        ws = BOT_WS_CONNECTIONS[bot_id]
        try:
            print(f"[DEBUG] Sending DM to bot via WebSocket: {payload}")
            await ws.send_json(payload)
            print(f"[DEBUG] DM sent successfully to bot {bot_id}")
        except Exception as e:
            print(f"[DEBUG] Failed to send DM to bot: {e}")
    else:
        print(f"[DEBUG] Bot {bot_id} not in local BOT_WS_CONNECTIONS, publishing to Redis")
        redis_client.publish(f"bot:dm:{bot_id}", json.dumps(payload))

def send_geppetto_reply(conv_id: str, content: str):
    """Send a reply from Geppetto in a DM conversation"""
    now = datetime.utcnow().isoformat()
    message = {
        "id": str(uuid.uuid4()),
        "conv_id": conv_id,
        "user_id": GEPPETTO_ID,
        "user_name": "Geppetto",
        "user_avatar": "",
        "content": content,
        "image_url": "",
        "created_at": now
    }
    redis_client.rpush(f"dm:messages:{conv_id}", json.dumps(message))
    return message

def handle_geppetto_command(user: dict, conv_id: str, content: str):
    """Handle commands sent to Geppetto"""
    user_id = user["id"]
    content_lower = content.lower().strip()
    
    wizard_state = get_wizard_state(user_id)
    
    if wizard_state:
        if content_lower.startswith("/newbot"):
            clear_wizard_state(user_id)
        elif content_lower.startswith("/"):
            clear_wizard_state(user_id)
        else:
            return handle_wizard_step(user, conv_id, content, wizard_state)
    
    if content_lower.startswith("/newbot"):
        set_wizard_state(user_id, {"step": "username", "data": {}})
        return send_geppetto_reply(conv_id, 
            "**🤖 Let's create your bot!**\n\n" +
            "Step 1/4: What username would you like for your bot?\n\n" +
            "*Lowercase, no spaces. Should end with `bot` or `_bot` — we'll add `_bot` for you if you forget!*\n" +
            "*Examples: `myawesomebot`, `helper_bot`, or just `helper`*")
    
    elif content_lower.startswith("/mybots"):
        bots = get_operator_bots(user_id)
        if not bots:
            return send_geppetto_reply(conv_id,
                "**📋 Your Bots**\n\n" +
                "You don't have any bots yet.\n\n" +
                "Use `/newbot` to create your first bot!")
        
        bot_list = []
        for bot in bots:
            status = bot.get("bot_data", {}).get("status", "unknown")
            token_suffix = bot.get("bot_data", {}).get("api_token_suffix", "????")
            caps_granted = bot.get("bot_data", {}).get("capabilities_granted_global", [])
            bot_username = bot.get("username") or bot.get("bot_data", {}).get("username", bot['displayName'].lower())
            bot_list.append(
                f"• **{bot['displayName']}** (@{bot_username})\n" +
                f"  Status: `{status}` | Token: `...{token_suffix}`\n" +
                f"  Capabilities: {', '.join(caps_granted) if caps_granted else 'None (pending approval)'}"
            )
        
        return send_geppetto_reply(conv_id,
            f"**📋 Your Bots ({len(bots)})**\n\n" +
            "\n\n".join(bot_list) +
            "\n\n---\n" +
            "Commands: `/token <bot>` | `/deletebot <bot>` | `/apply <bot> <group>`")
    
    elif content_lower.startswith("/token "):
        bot_name = content[7:].strip().lower()
        bots = get_operator_bots(user_id)
        target_bot = next((b for b in bots if b["displayName"].lower() == bot_name), None)
        
        if not target_bot:
            return send_geppetto_reply(conv_id,
                f"❌ Bot `{bot_name}` not found.\n\nUse `/mybots` to see your bots.")
        
        new_token = regenerate_bot_token(target_bot["id"], user_id)
        if new_token:
            return send_geppetto_reply(conv_id,
                f"**🔑 New API Token for {target_bot['displayName']}**\n\n" +
                f"```\n{new_token}\n```\n\n" +
                "⚠️ **Save this now!** It expires from this message in 1 hour.\n" +
                "Your old token has been invalidated.")
        else:
            return send_geppetto_reply(conv_id, "❌ Failed to regenerate token.")
    
    elif content_lower.startswith("/deletebot "):
        bot_name = content[11:].strip().lower()
        bots = get_operator_bots(user_id)
        target_bot = next((b for b in bots if b["displayName"].lower() == bot_name), None)
        
        if not target_bot:
            return send_geppetto_reply(conv_id,
                f"❌ Bot `{bot_name}` not found.\n\nUse `/mybots` to see your bots.")
        
        set_wizard_state(user_id, {
            "step": "confirm_delete",
            "data": {"bot_id": target_bot["id"], "bot_name": target_bot["displayName"]}
        })
        return send_geppetto_reply(conv_id,
            f"**⚠️ Delete Bot: {target_bot['displayName']}?**\n\n" +
            "This will:\n" +
            "• Revoke the API token\n" +
            "• Remove the bot from all groups\n" +
            "• Delete all bot data\n\n" +
            "Type `CONFIRM` to delete or `cancel` to abort.")
    
    elif content_lower.startswith("/apply "):
        args = content[7:].strip().split(None, 1)
        if len(args) < 1:
            return send_geppetto_reply(conv_id,
                "❌ Usage: `/apply <botname>` or `/apply <botname> <groupname>`")
        
        bot_name = args[0].lower()
        group_query = args[1].strip() if len(args) > 1 else None
        
        bots = get_operator_bots(user_id)
        target_bot = next((b for b in bots if b["displayName"].lower() == bot_name or b.get("username", "").lower() == bot_name), None)
        
        if not target_bot:
            return send_geppetto_reply(conv_id,
                f"❌ Bot `{bot_name}` not found.\n\nUse `/mybots` to see your bots.")
        
        if group_query:
            group_query_lower = group_query.lower()
            all_groups = redis_client.keys("group:*")
            target_group = None
            
            for key in all_groups:
                if key.startswith("group:messages:") or key.startswith("group:members:") or key.startswith("group:roles:") or key.startswith("group:banned:") or key.startswith("group:bot_"):
                    continue
                group_data = redis_client.get(key)
                if group_data:
                    g = json.loads(str(group_data))
                    if g.get("slug", "").lower() == group_query_lower or g.get("name", "").lower() == group_query_lower:
                        target_group = g
                        break
            
            if not target_group:
                return send_geppetto_reply(conv_id,
                    f"❌ Group `{group_query}` not found.\n\n" +
                    "Try using the group's slug (e.g., `pythondevs`) or exact name.")
            
            if "group_message" not in target_bot.get("bot_data", {}).get("capabilities_granted_global", []):
                return send_geppetto_reply(conv_id,
                    f"❌ Bot **{target_bot['displayName']}** doesn't have the `group_message` capability.\n\n" +
                    "Add this capability when creating your bot to apply for group access.")
            
            approved_groups = target_bot.get("bot_data", {}).get("approved_groups", [])
            if target_group["id"] in approved_groups:
                return send_geppetto_reply(conv_id,
                    f"✅ Bot **{target_bot['displayName']}** is already approved for **{target_group['name']}**!")
            
            existing_app = redis_client.get(f"bot:group_application:{target_bot['id']}:{target_group['id']}")
            if existing_app:
                return send_geppetto_reply(conv_id,
                    f"⏳ Application for **{target_bot['displayName']}** to join **{target_group['name']}** is already pending.\n\n" +
                    "The group owner will review it soon.")
            
            if create_bot_group_application(target_bot, target_group["id"]):
                return send_geppetto_reply(conv_id,
                    f"**✅ Group Application Submitted!**\n\n" +
                    f"Bot: **{target_bot['displayName']}**\n" +
                    f"Group: **{target_group['name']}** (`{target_group['slug']}`)\n\n" +
                    "The group owner will review your application. You'll be notified when it's approved.")
            else:
                return send_geppetto_reply(conv_id,
                    "❌ Failed to submit application. Please try again.")
        
        else:
            caps_requested = target_bot.get("bot_data", {}).get("capabilities_declared", [])
            caps_granted = target_bot.get("bot_data", {}).get("capabilities_granted_global", [])
            
            if set(caps_requested) == set(caps_granted):
                approved_groups = target_bot.get("bot_data", {}).get("approved_groups", [])
                return send_geppetto_reply(conv_id,
                    f"✅ Bot **{target_bot['displayName']}** already has all capabilities!\n\n" +
                    f"**Capabilities:** {', '.join(caps_granted)}\n" +
                    f"**Approved groups:** {len(approved_groups)}\n\n" +
                    "To apply for group access, use:\n" +
                    "`/apply " + bot_name + " <groupname>`")
            
            existing_app = redis_client.get(f"bot:application:{target_bot['id']}")
            
            if existing_app:
                return send_geppetto_reply(conv_id,
                    f"⏳ Application for **{target_bot['displayName']}** is already pending.\n\n" +
                    "An admin will review it soon.")
            
            application = {
                "id": str(uuid.uuid4()),
                "bot_id": target_bot["id"],
                "bot_name": target_bot["displayName"],
                "operator_id": user_id,
                "operator_name": user.get("displayName", "Unknown"),
                "purpose": target_bot.get("bio", ""),
                "capabilities_requested": caps_requested,
                "status": "pending",
                "created_at": datetime.utcnow().isoformat()
            }
            
            pipeline = redis_client.pipeline()
            pipeline.set(f"bot:application:{target_bot['id']}", json.dumps(application))
            pipeline.zadd("bot:applications:pending", {target_bot["id"]: datetime.utcnow().timestamp()})
            pipeline.execute()
            
            return send_geppetto_reply(conv_id,
                f"**✅ Application Submitted!**\n\n" +
                f"Bot: **{target_bot['displayName']}**\n" +
                f"Capabilities requested: {', '.join(caps_requested)}\n\n" +
                "An admin will review your application. You'll be notified when it's approved.")
    
    elif content_lower == "/help" or content_lower == "help":
        return send_geppetto_reply(conv_id,
            "**🤖 Geppetto - Bot Management**\n\n" +
            "I help you create and manage bots on DevNetwork.\n\n" +
            "**Commands:**\n" +
            "• `/newbot` - Create a new bot\n" +
            "• `/mybots` - List your bots\n" +
            "• `/token <botname>` - Regenerate API token\n" +
            "• `/deletebot <botname>` - Delete a bot\n" +
            "• `/apply <botname>` - Check capability status\n" +
            "• `/apply <botname> <group>` - Apply bot to a group\n" +
            "• `/help` - Show this help\n\n" +
            "**Getting Started:**\n" +
            "1. Create a bot with `/newbot`\n" +
            "2. Your bot gets capabilities automatically!\n" +
            "3. Apply to groups with `/apply <botname> <groupname>`\n" +
            "4. Use the API token to connect!")
    
    else:
        return send_geppetto_reply(conv_id,
            "👋 Hey! I'm Geppetto, the bot orchestration system.\n\n" +
            "Type `/help` to see available commands, or `/newbot` to create your first bot!")

def handle_wizard_step(user: dict, conv_id: str, content: str, wizard_state: dict):
    """Handle bot creation wizard steps"""
    user_id = user["id"]
    step = wizard_state["step"]
    data = wizard_state["data"]
    
    if content.lower() == "cancel":
        clear_wizard_state(user_id)
        return send_geppetto_reply(conv_id, "❌ Bot creation cancelled.")
    
    if step == "confirm_delete":
        if content == "CONFIRM":
            bot_id = data["bot_id"]
            if delete_bot(bot_id, user_id):
                clear_wizard_state(user_id)
                return send_geppetto_reply(conv_id,
                    f"✅ Bot **{data['bot_name']}** has been deleted.")
            else:
                clear_wizard_state(user_id)
                return send_geppetto_reply(conv_id, "❌ Failed to delete bot.")
        else:
            clear_wizard_state(user_id)
            return send_geppetto_reply(conv_id, "❌ Deletion cancelled.")
    
    elif step == "username":
        username = content.lower().strip()
        if not username.endswith("_bot") and not username.endswith("bot"):
            username = username + "_bot"
        if len(username) < 3 or len(username) > 24:
            return send_geppetto_reply(conv_id,
                f"❌ Username `{username}` is too {'short' if len(username) < 3 else 'long'} ({len(username)} chars). Must be 3-24 characters. Try again:")
        if not username.replace("_", "").isalnum():
            return send_geppetto_reply(conv_id,
                "❌ Username can only contain letters, numbers, and underscores. Try again:")
        
        existing = get_user_by_display_name(username)
        if existing:
            return send_geppetto_reply(conv_id,
                f"❌ Username `{username}` is already taken. Try another:")
        
        data["username"] = username
        wizard_state["step"] = "display_name"
        set_wizard_state(user_id, wizard_state)
        return send_geppetto_reply(conv_id,
            f"✅ Username: `@{username}`\n\n" +
            "Step 2/4: What display name should your bot have?\n\n" +
            "*This is shown in chats and posts.*\n" +
            "*Example: `My Awesome Bot`*")
    
    elif step == "display_name":
        display_name = content.strip()
        if len(display_name) < 2 or len(display_name) > 50:
            return send_geppetto_reply(conv_id,
                "❌ Display name must be 2-50 characters. Try again:")
        
        existing_dn = get_user_by_display_name(display_name.lower())
        if existing_dn:
            return send_geppetto_reply(conv_id,
                f"❌ Display name `{display_name}` conflicts with an existing user or bot. Try another:")
        
        data["display_name"] = display_name
        wizard_state["step"] = "purpose"
        set_wizard_state(user_id, wizard_state)
        return send_geppetto_reply(conv_id,
            f"✅ Display name: **{display_name}**\n\n" +
            "Step 3/4: What is your bot's purpose?\n\n" +
            "*Describe what your bot does.*\n" +
            "*Example: `A bot that posts daily coding tips`*")
    
    elif step == "purpose":
        purpose = content.strip()
        if len(purpose) < 10:
            return send_geppetto_reply(conv_id,
                "❌ Please provide a more detailed purpose (at least 10 characters):")
        
        data["purpose"] = purpose
        wizard_state["step"] = "capabilities"
        set_wizard_state(user_id, wizard_state)
        return send_geppetto_reply(conv_id,
            f"✅ Purpose saved!\n\n" +
            "Step 4/4: What capabilities does your bot need?\n\n" +
            "Choose from:\n" +
            "• `post` - Create posts in the feed\n" +
            "• `comment` - Comment on posts\n" +
            "• `group_message` - Send messages in groups\n" +
            "• `send_dm` - Send direct messages\n" +
            "• `react` - React to posts/messages\n\n" +
            "*Enter capabilities separated by commas.*\n" +
            "*Example: `post, comment, react`*")
    
    elif step == "capabilities":
        valid_caps = ["post", "comment", "group_message", "send_dm", "react"]
        input_caps = [c.strip().lower() for c in content.split(",")]
        capabilities = [c for c in input_caps if c in valid_caps]
        
        if not capabilities:
            return send_geppetto_reply(conv_id,
                "❌ Please select at least one valid capability.\n\n" +
                "Valid options: `post`, `comment`, `group_message`, `send_dm`, `react`")
        
        bot, token = create_bot(
            operator_id=user_id,
            username=data["username"],
            display_name=data["display_name"],
            purpose=data["purpose"],
            capabilities=capabilities
        )
        
        if bot is None:
            return send_geppetto_reply(conv_id,
                f"❌ Username `{data['username']}` was just taken. Please start over with `/newbot`.")
        
        clear_wizard_state(user_id)
        
        return send_geppetto_reply(conv_id,
            f"**🎉 Bot Created Successfully!**\n\n" +
            f"**Name:** {bot['displayName']}\n" +
            f"**Username:** @{data['username']}\n" +
            f"**Capabilities Requested:** {', '.join(capabilities)}\n\n" +
            "---\n\n" +
            f"**🔑 Your API Token:**\n```\n{token}\n```\n\n" +
            "⚠️ **Save this token now!** It expires from this message in 1 hour. Use `/token " + data['username'] + "` to regenerate.\n\n" +
            "---\n\n" +
            "**Next Steps:**\n" +
            f"1. Use `/apply {data['username']}` to request capability approval\n" +
            "2. Once approved, your bot can use the API\n" +
            "3. See docs at `/api/bots/docs`")
    
    return send_geppetto_reply(conv_id, "Something went wrong. Type `/help` for commands.")

async def bot_dm_subscriber():
    """Background task to subscribe to Redis pub/sub for bot DMs (multi-instance support)"""
    # Storage-mode aware: real Redis pubsub in redis mode, in-process queue
    # under NEDB (single-worker doctrine — production.sh pins WORKERS=1).
    pubsub = _storage.make_pubsub()
    pubsub.psubscribe("bot:dm:*")
    
    print("[PUBSUB] Bot DM subscriber started")
    
    while True:
        try:
            message = pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message["type"] == "pmessage":
                channel = message["channel"].decode() if isinstance(message["channel"], bytes) else message["channel"]
                data = message["data"].decode() if isinstance(message["data"], bytes) else message["data"]
                bot_id = channel.replace("bot:dm:", "")
                
                print(f"[PUBSUB] Received message for bot {bot_id}")
                print(f"[PUBSUB] Local bots: {list(BOT_WS_CONNECTIONS.keys())}")
                
                if bot_id in BOT_WS_CONNECTIONS:
                    payload = json.loads(data)
                    delivered = await push_dm_to_bot_local(bot_id, payload)
                    print(f"[PUBSUB] Delivered DM to bot {bot_id}: {delivered}")
                else:
                    print(f"[PUBSUB] Bot {bot_id} not on this instance")
            
            await asyncio.sleep(0.1)
        except Exception as e:
            print(f"[PUBSUB] Error in subscriber: {e}")
            import traceback
            traceback.print_exc()
            await asyncio.sleep(1)

@app.on_event("startup")
async def startup():
    build_frontend()
    seed_platform_groups()
    bootstrap_ecosystems()
    init_geppetto()
    asyncio.create_task(bot_dm_subscriber())
    # System bots are demo/simulation bots from the original DevNetwork —
    # OFF by default for AiAS v1.2 (Mark, 2026-07-12). Real agents arrive in
    # Phase 2 through the bot-platform APIs instead.
    if os.environ.get("DEVNET_SYSTEM_BOTS", "off").lower() in ("on", "1", "true"):
        try:
            import importlib.util, pathlib
            _sb_path = pathlib.Path(__file__).parent / "system_bots.py"
            _sb_spec = importlib.util.spec_from_file_location("system_bots", _sb_path)
            _sb = importlib.util.module_from_spec(_sb_spec)
            _sb_spec.loader.exec_module(_sb)
            app.state.system_bots_module = _sb
            _sb.set_user_ws_connections(USER_WS_CONNECTIONS)
            asyncio.create_task(_sb.run_system_bots(ws_manager))
        except Exception as e:
            print(f"[SystemBot] Failed to start system bots: {e}")
    else:
        print("[SystemBot] Disabled via DEVNET_SYSTEM_BOTS=off")

@app.get("/favicon.ico")
async def favicon():
    return FileResponse(BASE_DIR / "static" / "favicon.png", media_type="image/png")


@app.get("/favicon.png")
async def favicon_png():
    """Transplanted v1 pages reference /favicon.png at the root."""
    return FileResponse(BASE_DIR / "static" / "favicon.png", media_type="image/png")

@app.get("/api/config")
async def get_config():
    return JSONResponse({
        "default_ecosystem_id": DEVONE_ECOSYSTEM_ID,
        "platform": "devnetwork",
        # AiAS v1.2 weave: where the v1 brain lives. Inline views (Playground,
        # KeyStone, ...) call it cross-origin with a bridged session — v1's
        # header-session auth accepts any origin by design.
        "aias_api_base": os.environ.get("AIAS_API_BASE", "https://api.aiassist.net"),
        "auth_mode": os.environ.get("DEVNET_AUTH", "aias").lower(),
    })

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {
        "request": request,
        "css_ver": _asset_version("styles.css"),
        "js_ver": _asset_version("app.js"),
    })

@app.get("/g/{slug}", response_class=HTMLResponse)
async def group_redirect(request: Request, slug: str):
    """External shareable link that redirects to group page"""
    # Check for slug alias first
    alias_target = redis_client.get(f"group:alias:{slug.lower()}")
    if alias_target:
        slug = str(alias_target)
    return templates.TemplateResponse("index.html", {
        "request": request,
        "redirect_group": slug,
        "css_ver": _asset_version("styles.css"),
        "js_ver": _asset_version("app.js"),
    })

@app.post("/api/auth/validate")
async def validate_auth(request: Request):
    data = await request.json()
    hash_value = data.get("hash")
    totp_code = data.get("totp_code")

    if not hash_value:
        raise HTTPException(status_code=400, detail="Hash required")

    # Federated aias tokens validate against production (cached).
    if DEVNET_AUTH == "aias" and not str(hash_value).startswith("dvs_") \
            and len(str(hash_value)) > 24:
        fed_user = _aias_session_user(str(hash_value))
        if fed_user:
            fed_user.pop("password", None)
            return JSONResponse({"valid": True, "user": fed_user})
        # fall through: may be a legacy fingerprint hash

    # AiAS v1 sessions (dvs_*) are post-authentication credentials — they
    # validate directly, no 2FA re-challenge on boot.
    if str(hash_value).startswith("dvs_"):
        session_user = get_user_by_session(str(hash_value))
        if session_user and not redis_client.sismember(
                "platform:banned", session_user.get("id", "")):
            session_user.pop("password", None)
            return JSONResponse({"valid": True, "user": session_user})
        return JSONResponse({"valid": False, "error": "Session expired. Please sign in again."}, status_code=401)
    
    user = get_user_by_hash(hash_value)
    if user:
        # SECURITY: Block login if 2FA was never completed
        if not user.get("twoFactorEnabled"):
            # Check if registration is stale (over 1 hour without 2FA)
            created = user.get("createdAt", "")
            if created:
                try:
                    created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                    age_hours = (datetime.utcnow() - created_dt.replace(tzinfo=None)).total_seconds() / 3600
                    if age_hours > 1:
                        # Cleanup stale incomplete registration
                        cleanup_incomplete_user(user)
                        return JSONResponse({
                            "valid": False, 
                            "error": "Registration expired. Please register again."
                        }, status_code=401)
                except:
                    pass
            return JSONResponse({
                "valid": False, 
                "error": "2FA setup incomplete. Please complete registration.",
                "incomplete_2fa": True
            }, status_code=401)
        
        # 2FA is enabled - check for device token or require code
        device_token = data.get("device_token")
        if device_token:
            # Check if device token is valid for this user
            stored_token = redis_client.get(f"user:device_token:{user['id']}:{device_token}")
            if stored_token:
                # Valid device token - skip 2FA
                redis_client.set(f"user:{user['id']}", json.dumps({
                    **user,
                    "last_seen": datetime.utcnow().isoformat()
                }))
                return JSONResponse({"valid": True, "user": user})
        
        if not totp_code:
            return JSONResponse({"valid": True, "requires_2fa": True, "user_id": user["id"]})
        
        totp_secret = user.get("totp_secret")
        if not totp_secret:
            return JSONResponse({"valid": False, "error": "2FA configuration error"}, status_code=500)
        totp = pyotp.TOTP(totp_secret)
        if not totp.verify(totp_code, valid_window=1):
            return JSONResponse({"valid": False, "error": "Invalid 2FA code"}, status_code=400)
        
        redis_client.set(f"user:{user['id']}", json.dumps({
            **user,
            "last_seen": datetime.utcnow().isoformat()
        }))
        return JSONResponse({"valid": True, "user": user})
    
    return JSONResponse({"valid": False}, status_code=401)

def cleanup_incomplete_user(user: dict):
    """Remove user who never completed 2FA setup"""
    user_id = user.get("id")
    display_name = normalize_username(user.get("displayName", ""))
    
    if not user_id:
        return
    
    pipeline = redis_client.pipeline()
    pipeline.delete(f"user:{user_id}")
    pipeline.delete(f"user:name:{display_name}")
    pipeline.delete(f"user:totp_pending:{user_id}")
    
    # Remove all hash mappings for this user
    for key in redis_client.scan_iter(f"user:hash:*"):
        if redis_client.get(key) == user_id:
            pipeline.delete(key)
    
    # Remove device mappings
    devices = redis_client.smembers(f"user:devices:{user_id}")
    for device in devices:
        pipeline.delete(f"user:device:{device}")
    pipeline.delete(f"user:devices:{user_id}")
    
    pipeline.decr("stats:users:count")
    pipeline.execute()

@app.post("/api/auth/link-device")
async def link_device(request: Request):
    data = await request.json()
    existing_hash = data.get("existing_hash")
    new_fingerprint = data.get("fingerprint")
    totp_code = data.get("totp_code")
    
    if not existing_hash or not new_fingerprint:
        raise HTTPException(status_code=400, detail="Hash and fingerprint required")
    
    user = get_user_by_hash(existing_hash)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # SECURITY: Require 2FA verification to link a new device
    # Check if user has TOTP secret (either in user record or Redis)
    totp_secret = user.get("totp_secret") or redis_client.get(f"user:totp:{user['id']}")
    
    if not totp_secret:
        raise HTTPException(status_code=403, detail="2FA not configured for this account")
    
    if not totp_code:
        return JSONResponse({"requires_2fa": True, "message": "2FA code required to link device"})
    
    totp = pyotp.TOTP(str(totp_secret))
    if not totp.verify(totp_code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid 2FA code")
    
    user_id = user["id"]
    profile = {
        "displayName": user.get("displayName", ""),
        "bio": user.get("bio", ""),
        "field": user.get("field", ""),
        "experience": user.get("experience", ""),
        "skills": user.get("skills", []),
        "focus": user.get("focus", ""),
        "teamSize": user.get("teamPreference", "")
    }
    
    new_hash = generate_hash(new_fingerprint, profile)
    
    pipeline = redis_client.pipeline()
    pipeline.set(f"user:hash:{new_hash}", user_id)
    pipeline.sadd(f"user:devices:{user_id}", new_fingerprint)
    pipeline.set(f"user:device:{new_fingerprint}", user_id)
    pipeline.execute()
    
    return JSONResponse({
        "success": True,
        "hash": new_hash,
        "user": user
    })

@app.post("/api/auth/check-username")
async def check_username(request: Request):
    """Pre-check if username is available BEFORE registration"""
    data = await request.json()
    raw_name = data.get("username", "")
    normalized = normalize_username(raw_name)
    
    if not normalized:
        return JSONResponse({
            "available": False,
            "error": "Invalid username"
        })
    
    existing = get_user_by_display_name(normalized)
    if existing:
        return JSONResponse({
            "available": False,
            "normalized": normalized,
            "error": "Username already taken"
        })
    
    return JSONResponse({
        "available": True,
        "normalized": normalized
    })

@app.post("/api/auth/register")
async def register_user(request: Request):
    data = await request.json()
    fingerprint = data.get("fingerprint")
    session_id = data.get("session_id")
    profile_data = data.get("profile", {})
    talents = data.get("talents", [])
    
    if not fingerprint:
        raise HTTPException(status_code=400, detail="Fingerprint required")
    
    email = data.get("email") or profile_data.get("email") or ""
    portfolio = data.get("portfolio") or profile_data.get("portfolio") or ""
    age_confirmed = data.get("age_confirmed", False) or profile_data.get("age_confirmed", False)
    
    if not portfolio:
        return JSONResponse({
            "success": False,
            "error": "LinkedIn or portfolio link is required."
        }, status_code=400)
    
    if not portfolio.startswith("https://"):
        return JSONResponse({
            "success": False,
            "error": "Portfolio link must start with https://"
        }, status_code=400)
    
    if not age_confirmed:
        return JSONResponse({
            "success": False,
            "error": "You must confirm you are 18 or older to register."
        }, status_code=400)
    
    user_hash = generate_hash(fingerprint, profile_data)
    
    existing_user = get_user_by_hash(user_hash)
    if existing_user:
        return JSONResponse({
            "success": True,
            "hash": user_hash,
            "user": existing_user,
            "existing": True
        })
    
    user_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    raw_name = profile_data.get("displayName", "Anonymous")
    normalized_name = normalize_username(raw_name)
    
    if not normalized_name:
        normalized_name = "anonymous"
    
    existing = get_user_by_display_name(normalized_name)
    if existing:
        return JSONResponse({
            "success": False,
            "error": "Username already taken. Please choose a different name."
        }, status_code=400)
    
    user = {
        "id": user_id,
        "displayName": normalized_name,
        "bio": profile_data.get("bio", ""),
        "field": profile_data.get("field", ""),
        "experience": profile_data.get("experience", ""),
        "skills": profile_data.get("skills", []),
        "focus": profile_data.get("focus", ""),
        "interests": profile_data.get("interests", []),
        "teamPreference": profile_data.get("teamSize", ""),
        "talents": talents,
        "email": email,
        "portfolio": portfolio,
        "age_confirmed": True,
        "createdAt": now,
        "lastSeen": now,
        "isSuperAdmin": False
    }
    
    pipeline = redis_client.pipeline()
    pipeline.set(f"user:{user_id}", json.dumps(user))
    pipeline.set(f"user:name:{normalized_name}", user_id)
    pipeline.set(f"user:hash:{user_hash}", user_id)
    pipeline.sadd(f"user:devices:{user_id}", fingerprint)
    pipeline.set(f"user:device:{fingerprint}", user_id)
    pipeline.incr("stats:users:count")
    
    if session_id:
        session_key = f"wizard:session:{session_id}"
        session_data = redis_client.get(session_key)
        if session_data:
            pipeline.set(f"user:wizard:{user_id}", session_data)
    
    pipeline.execute()
    
    totp_secret = pyotp.random_base32()
    redis_client.set(f"user:totp_pending:{user_id}", totp_secret, ex=3600)
    
    return JSONResponse({
        "success": True,
        "hash": user_hash,
        "user": user,
        "existing": False,
        "requires_2fa": True,
        "totp_secret": totp_secret
    })

@app.post("/api/auth/verify-2fa")
async def verify_2fa(request: Request):
    data = await request.json()
    user_id = data.get("user_id")
    totp_code = data.get("code")
    
    if not user_id or not totp_code:
        return JSONResponse({"success": False, "error": "Missing user_id or code"}, status_code=400)
    
    pending_secret = redis_client.get(f"user:totp_pending:{user_id}")
    if not pending_secret:
        return JSONResponse({"success": False, "error": "2FA setup expired. Please start over."}, status_code=400)
    
    totp = pyotp.TOTP(str(pending_secret))
    if not totp.verify(totp_code, valid_window=1):
        return JSONResponse({"success": False, "error": "Invalid code. Please try again."}, status_code=400)
    
    user_data = redis_client.get(f"user:{user_id}")
    if not user_data:
        return JSONResponse({"success": False, "error": "User not found"}, status_code=404)
    
    user = json.loads(str(user_data))
    user["totp_secret"] = str(pending_secret)
    user["twoFactorEnabled"] = True
    
    # Generate device token for trusted device
    device_token = str(uuid.uuid4())
    
    pipeline = redis_client.pipeline()
    pipeline.set(f"user:{user_id}", json.dumps(user))
    pipeline.delete(f"user:totp_pending:{user_id}")
    # Store device token (expires in 30 days)
    pipeline.set(f"user:device_token:{user_id}:{device_token}", "1", ex=30*24*60*60)
    pipeline.execute()
    
    # AUTO-JOIN MATCHING GROUPS based on wizard profile
    user_profile = {
        "field": user.get("field", ""),
        "skills": user.get("skills", []),
        "focus": user.get("focus", ""),
        "interests": user.get("interests", []),
        "experience": user.get("experience", "")
    }
    joined_groups = auto_join_groups(user_id, user_profile)
    
    return JSONResponse({
        "success": True, 
        "message": "2FA enabled successfully", 
        "device_token": device_token,
        "matched_groups": joined_groups
    })

@app.post("/api/auth/verify-login-2fa")
async def verify_login_2fa(request: Request):
    data = await request.json()
    user_hash = data.get("hash")
    totp_code = data.get("code")
    
    if not user_hash or not totp_code:
        return JSONResponse({"success": False, "error": "Missing hash or code"}, status_code=400)
    
    user = get_user_by_hash(user_hash)
    if not user:
        return JSONResponse({"success": False, "error": "Invalid hash"}, status_code=401)
    
    if not user.get("twoFactorEnabled"):
        return JSONResponse({"success": True, "message": "2FA not enabled"})
    
    totp_secret = user.get("totp_secret")
    if not totp_secret:
        return JSONResponse({"success": False, "error": "2FA configuration error"}, status_code=500)
    
    totp = pyotp.TOTP(totp_secret)
    if not totp.verify(totp_code, valid_window=1):
        return JSONResponse({"success": False, "error": "Invalid code"}, status_code=400)
    
    # Generate device token for this session
    device_token = str(uuid.uuid4())
    redis_client.set(f"user:device_token:{user['id']}:{device_token}", "1", ex=30*24*60*60)
    
    return JSONResponse({"success": True, "message": "2FA verified", "device_token": device_token, "user": user})

@app.post("/api/wizard/step")
async def wizard_step(request: Request):
    data = await request.json()
    session_id = data.get("session_id")
    step = data.get("step")
    answer = data.get("answer")
    phase = data.get("phase", "qualifier")
    
    key = f"wizard:session:{session_id}"
    existing = redis_client.get(key)
    
    if existing:
        progress = json.loads(str(existing))
    else:
        progress = {"steps": [], "talents": [], "qualifier": {}, "challenge": []}
    
    if phase == "qualifier":
        if isinstance(answer, dict):
            progress["qualifier"].update(answer)
        progress["steps"].append({"step": step, "answer": answer, "phase": phase})
        talent = None
    else:
        progress["challenge"].append({"step": step, "answer": answer})
        progress["steps"].append({"step": step, "answer": answer, "phase": phase})
        talent = evaluate_talent(step, answer)
        if talent and talent not in progress["talents"]:
            progress["talents"].append(talent)
    
    redis_client.set(key, json.dumps(progress), ex=86400)
    
    return JSONResponse({
        "success": True,
        "talent_discovered": talent
    })

@app.get("/api/feed")
async def get_feed(x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        return JSONResponse([])
    
    post_ids = redis_client.zrevrange("feed:global", 0, 49)
    posts = []
    
    for post_id in list(post_ids):
        post_data = redis_client.get(f"post:{post_id}")
        if post_data:
            post = json.loads(str(post_data))
            author_data = redis_client.get(f"user:{post.get('user_id')}")
            if author_data:
                author = json.loads(str(author_data))
                post["author"] = {
                    "id": author["id"],
                    "displayName": author["displayName"],
                    "field": author.get("field", ""),
                    "avatar": author.get("avatar", "")
                }
            post["liked"] = redis_client.sismember(f"post:likes:{post_id}", user["id"])
            posts.append(post)
    
    return JSONResponse(posts)

@app.post("/api/posts")
async def create_post(request: Request, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    data = await request.json()
    content = data.get("content", "").strip()
    image_url = data.get("image_url", "")
    
    # Validate image URL if provided
    if image_url and not (image_url.startswith("https://i.ibb.co/") or image_url.startswith("https://static.klipy.com/")):
        image_url = ""
    
    if not content and not image_url:
        raise HTTPException(status_code=400, detail="Content or image required")
    
    if len(content) > 5000:
        raise HTTPException(status_code=400, detail="Content too long")
    
    mentions = extract_mentions(content)
    hashtags = extract_hashtags(content)
    
    post_id = str(uuid.uuid4())
    now = datetime.utcnow()
    timestamp = now.timestamp()
    
    post = {
        "id": post_id,
        "user_id": user["id"],
        "content": content,
        "image_url": image_url,
        "mentions": mentions,
        "hashtags": hashtags,
        "created_at": now.isoformat(),
        "likes_count": 0,
        "replies_count": 0
    }
    
    pipeline = redis_client.pipeline()
    pipeline.set(f"post:{post_id}", json.dumps(post))
    pipeline.zadd("feed:global", {post_id: timestamp})
    pipeline.zadd(f"feed:user:{user['id']}", {post_id: timestamp})
    pipeline.incr("stats:posts:count")
    
    for tag in hashtags:
        pipeline.zadd(f"hashtag:{tag}", {post_id: timestamp})
        pipeline.zincrby("hashtags:trending", 1, tag)
    
    pipeline.execute()
    
    log_activity("post_create", user["id"], {
        "post_id": post_id,
        "content_preview": content[:100],
        "hashtags": hashtags,
        "mentions": mentions,
        "has_image": bool(image_url)
    }, user.get("displayName"))
    
    for mention in mentions:
        mentioned_user = get_user_by_display_name(mention)
        if mentioned_user and mentioned_user["id"] != user["id"]:
            create_notification(mentioned_user["id"], "mention", {
                "post_id": post_id,
                "from_user_id": user["id"],
                "from_user_name": user["displayName"],
                "preview": content[:100]
            })
    
    post["author"] = {
        "id": user["id"],
        "displayName": user["displayName"],
        "field": user.get("field", ""),
        "avatar": user.get("avatar", "")
    }
    
    asyncio.create_task(ws_manager.broadcast({
        "type": "new_post",
        "post": post
    }, "feed"))
    
    return JSONResponse(post)

@app.post("/api/posts/{post_id}/like")
async def like_post(post_id: str, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    post_data = redis_client.get(f"post:{post_id}")
    if not post_data:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post = json.loads(str(post_data))
    like_key = f"post:likes:{post_id}"
    
    if redis_client.sismember(like_key, user["id"]):
        redis_client.srem(like_key, user["id"])
        post["likes_count"] = max(0, post.get("likes_count", 1) - 1)
        liked = False
    else:
        redis_client.sadd(like_key, user["id"])
        post["likes_count"] = post.get("likes_count", 0) + 1
        liked = True
    
    redis_client.set(f"post:{post_id}", json.dumps(post))
    
    log_activity("post_like" if liked else "post_unlike", user["id"], {
        "post_id": post_id,
        "author_id": post.get("user_id")
    }, user.get("displayName"))
    
    return JSONResponse({"liked": liked, "likes_count": post["likes_count"]})

@app.put("/api/posts/{post_id}")
async def edit_post(post_id: str, request: Request, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    post_data = redis_client.get(f"post:{post_id}")
    if not post_data:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post = json.loads(str(post_data))
    
    if post["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your post")
    
    created_at = datetime.fromisoformat(post["created_at"])
    elapsed = (datetime.utcnow() - created_at).total_seconds()
    if elapsed > 180:
        raise HTTPException(status_code=403, detail="Edit window expired (3 minutes)")
    
    data = await request.json()
    new_content = data.get("content", "").strip()
    
    if not new_content:
        raise HTTPException(status_code=400, detail="Content required")
    
    if len(new_content) > 5000:
        raise HTTPException(status_code=400, detail="Content too long")
    
    old_hashtags = set(post.get("hashtags", []))
    new_hashtags = set(extract_hashtags(new_content))
    new_mentions = extract_mentions(new_content)
    
    post["content"] = new_content
    post["mentions"] = new_mentions
    post["hashtags"] = list(new_hashtags)
    post["edited_at"] = datetime.utcnow().isoformat()
    
    pipeline = redis_client.pipeline()
    pipeline.set(f"post:{post_id}", json.dumps(post))
    
    for tag in old_hashtags - new_hashtags:
        pipeline.zrem(f"hashtag:{tag}", post_id)
    for tag in new_hashtags - old_hashtags:
        pipeline.zadd(f"hashtag:{tag}", {post_id: datetime.fromisoformat(post["created_at"]).timestamp()})
    
    pipeline.execute()
    
    post["author"] = {
        "id": user["id"],
        "displayName": user["displayName"],
        "field": user.get("field", ""),
        "avatar": user.get("avatar", "")
    }
    
    return JSONResponse(post)

@app.delete("/api/posts/{post_id}")
async def delete_post(post_id: str, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    post_data = redis_client.get(f"post:{post_id}")
    if not post_data:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post = json.loads(str(post_data))
    
    is_admin = user.get("is_admin", False)
    is_owner = post["user_id"] == user["id"]
    
    if not is_owner and not is_admin:
        raise HTTPException(status_code=403, detail="Not your post")
    
    if is_owner and not is_admin:
        created_at = datetime.fromisoformat(post["created_at"])
        elapsed = (datetime.utcnow() - created_at).total_seconds()
        if elapsed > 60:
            raise HTTPException(status_code=403, detail="Delete window expired (1 minute)")
    
    pipeline = redis_client.pipeline()
    pipeline.delete(f"post:{post_id}")
    pipeline.zrem("feed:global", post_id)
    pipeline.zrem(f"feed:user:{post['user_id']}", post_id)
    pipeline.delete(f"post:likes:{post_id}")
    
    for tag in post.get("hashtags", []):
        pipeline.zrem(f"hashtag:{tag}", post_id)
    
    pipeline.execute()
    
    asyncio.create_task(ws_manager.broadcast({
        "type": "delete_post",
        "post_id": post_id
    }, "feed"))
    
    return JSONResponse({"deleted": True})

@app.get("/api/posts/{post_id}/comments")
async def get_comments(post_id: str, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    post_data = redis_client.get(f"post:{post_id}")
    if not post_data:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comment_ids = redis_client.lrange(f"post:comments:{post_id}", 0, 99)
    comments = []
    
    for comment_id in comment_ids:
        comment_data = redis_client.get(f"comment:{comment_id}")
        if comment_data:
            comment = json.loads(str(comment_data))
            user_data = redis_client.get(f"user:{comment['user_id']}")
            if user_data:
                user = json.loads(str(user_data))
                comment["author"] = {
                    "id": user["id"],
                    "displayName": user["displayName"],
                    "avatar": user.get("avatar", "")
                }
            comments.append(comment)
    
    return JSONResponse(comments)

@app.post("/api/posts/{post_id}/comments")
async def create_comment(post_id: str, request: Request, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    post_data = redis_client.get(f"post:{post_id}")
    if not post_data:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post = json.loads(str(post_data))
    data = await request.json()
    content = data.get("content", "").strip()
    
    if not content:
        raise HTTPException(status_code=400, detail="Content required")
    
    if len(content) > 2000:
        raise HTTPException(status_code=400, detail="Comment too long")
    
    mentions = extract_mentions(content)
    comment_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    comment = {
        "id": comment_id,
        "post_id": post_id,
        "user_id": user["id"],
        "content": content,
        "mentions": mentions,
        "created_at": now.isoformat()
    }
    
    pipeline = redis_client.pipeline()
    pipeline.set(f"comment:{comment_id}", json.dumps(comment))
    pipeline.lpush(f"post:comments:{post_id}", comment_id)
    post["replies_count"] = post.get("replies_count", 0) + 1
    pipeline.set(f"post:{post_id}", json.dumps(post))
    pipeline.execute()
    
    log_activity("comment_create", user["id"], {
        "comment_id": comment_id,
        "post_id": post_id,
        "content_preview": content[:100]
    }, user.get("displayName"))
    
    if post["user_id"] != user["id"]:
        create_notification(post["user_id"], "comment", {
            "post_id": post_id,
            "comment_id": comment_id,
            "from_user_id": user["id"],
            "from_user_name": user["displayName"],
            "preview": content[:100]
        })
    
    for mention in mentions:
        mentioned_user = get_user_by_display_name(mention)
        if mentioned_user and mentioned_user["id"] != user["id"]:
            create_notification(mentioned_user["id"], "mention", {
                "comment_id": comment_id,
                "post_id": post_id,
                "from_user_id": user["id"],
                "from_user_name": user["displayName"],
                "preview": content[:100]
            })
    
    comment["author"] = {
        "id": user["id"],
        "displayName": user["displayName"],
        "avatar": user.get("avatar", "")
    }
    
    asyncio.create_task(ws_manager.broadcast({
        "type": "new_comment",
        "post_id": post_id,
        "comment": comment
    }, "feed"))
    
    return JSONResponse(comment)

@app.delete("/api/comments/{comment_id}")
async def delete_comment(comment_id: str, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    comment_data = redis_client.get(f"comment:{comment_id}")
    if not comment_data:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    comment = json.loads(str(comment_data))
    
    is_admin = user.get("is_admin", False)
    is_owner = comment["user_id"] == user["id"]
    
    if not is_owner and not is_admin:
        raise HTTPException(status_code=403, detail="Not your comment")
    
    post_id = comment["post_id"]
    post_data = redis_client.get(f"post:{post_id}")
    
    pipeline = redis_client.pipeline()
    pipeline.delete(f"comment:{comment_id}")
    pipeline.lrem(f"post:comments:{post_id}", 0, comment_id)
    
    if post_data:
        post = json.loads(str(post_data))
        post["replies_count"] = max(0, post.get("replies_count", 1) - 1)
        pipeline.set(f"post:{post_id}", json.dumps(post))
    
    pipeline.execute()
    
    log_activity("comment_delete", user["id"], {
        "comment_id": comment_id,
        "post_id": post_id
    }, user.get("displayName"))
    
    return JSONResponse({"deleted": True})

@app.websocket("/ws/feed")
async def websocket_feed(websocket: WebSocket, auth: str = ""):
    await ws_manager.connect(websocket, "feed")
    user_id = None
    
    # Track user connection for DM push
    if auth:
        user = get_current_user(auth)
        if user:
            user_id = user["id"]
            USER_WS_CONNECTIONS[user_id] = websocket
            print(f"[DEBUG] User {user_id} connected to feed WebSocket")
    
    try:
        while True:
            data = await websocket.receive_text()
            pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, "feed")
        if user_id and user_id in USER_WS_CONNECTIONS:
            del USER_WS_CONNECTIONS[user_id]
            print(f"[DEBUG] User {user_id} disconnected from feed WebSocket")

@app.websocket("/ws/bot")
async def websocket_bot(websocket: WebSocket):
    """WebSocket endpoint for bots with action protocol"""
    await websocket.accept()
    print(f"[WS-BOT] Connection accepted")
    
    try:
        auth_msg = await websocket.receive_json()
        print(f"[WS-BOT] Auth message received: type={auth_msg.get('type')}")
        
        if auth_msg.get("type") != "auth" or not auth_msg.get("token"):
            print(f"[WS-BOT] Auth failed: missing type or token")
            await websocket.send_json({"type": "error", "message": "Authentication required"})
            await websocket.close()
            return
        
        bot = get_bot_by_token(auth_msg["token"])
        if not bot:
            print(f"[WS-BOT] Auth failed: invalid token")
            await websocket.send_json({"type": "error", "message": "Invalid token"})
            await websocket.close()
            return
        
        print(f"[WS-BOT] Bot found: {bot['id']} ({bot.get('displayName')})")
        
        if bot.get("bot_data", {}).get("status") == "deleted":
            print(f"[WS-BOT] Auth failed: bot deleted")
            await websocket.send_json({"type": "error", "message": "Bot has been deleted"})
            await websocket.close()
            return
        
        await websocket.send_json({
            "type": "auth_success",
            "bot_id": bot["id"],
            "capabilities": bot.get("bot_data", {}).get("capabilities_granted_global", [])
        })
        
        BOT_WS_CONNECTIONS[bot["id"]] = websocket
        print(f"[WS-BOT] Bot {bot['id']} registered. Total bots: {len(BOT_WS_CONNECTIONS)}")
        log_bot_action(bot, "ws_connect", {})
        
        try:
            while True:
                msg = await websocket.receive_json()
                action = msg.get("action")
                
                if action == "ping":
                    await websocket.send_json({"type": "pong", "timestamp": datetime.utcnow().isoformat()})
                
                elif action == "post":
                    if not check_bot_capability(bot, "post"):
                        await websocket.send_json({"type": "error", "action": "post", "message": "Missing capability"})
                        continue
                    
                    content = msg.get("content", "").strip()
                    if not content:
                        await websocket.send_json({"type": "error", "action": "post", "message": "Content required"})
                        continue
                    
                    post_id = str(uuid.uuid4())
                    now = datetime.utcnow().isoformat()
                    timestamp = datetime.utcnow().timestamp()
                    
                    post = {
                        "id": post_id,
                        "user_id": bot["id"],
                        "content": content,
                        "image_url": msg.get("image_url", ""),
                        "created_at": now,
                        "is_bot": True,
                        "user": {"id": bot["id"], "displayName": bot.get("displayName", "Bot"), "avatar": bot.get("avatar", "")}
                    }
                    
                    pipeline = redis_client.pipeline()
                    pipeline.set(f"post:{post_id}", json.dumps(post))
                    pipeline.zadd("feed:global", {post_id: timestamp})
                    pipeline.execute()
                    
                    log_bot_action(bot, "ws_post", {"post_id": post_id})
                    await websocket.send_json({"type": "success", "action": "post", "post_id": post_id})
                
                elif action == "group_message":
                    group_id = msg.get("group_id")
                    if not check_bot_capability(bot, "group_message", group_id):
                        await websocket.send_json({"type": "error", "action": "group_message", "message": "Missing capability"})
                        continue
                    
                    content = msg.get("content", "").strip()
                    if not content or not group_id:
                        await websocket.send_json({"type": "error", "action": "group_message", "message": "Content and group_id required"})
                        continue
                    
                    message_id = str(uuid.uuid4())
                    now = datetime.utcnow().isoformat()
                    message = {
                        "id": message_id,
                        "user_id": bot["id"],
                        "user_name": bot.get("displayName", "Bot"),
                        "content": content,
                        "is_bot": True,
                        "timestamp": now
                    }
                    redis_client.rpush(f"group:messages:{group_id}", json.dumps(message))
                    
                    log_bot_action(bot, "ws_group_message", {"group_id": group_id, "message_id": message_id})
                    await websocket.send_json({"type": "success", "action": "group_message", "message_id": message_id})
                
                elif action == "subscribe_feed":
                    if not check_bot_capability(bot, "post"):
                        await websocket.send_json({"type": "error", "action": "subscribe_feed", "message": "Missing capability"})
                        continue
                    await ws_manager.connect(websocket, "feed", skip_accept=True)
                    log_bot_action(bot, "ws_subscribe_feed", {})
                    await websocket.send_json({"type": "subscribed", "channel": "feed"})
                
                elif action == "subscribe_group":
                    group_id = msg.get("group_id")
                    if group_id and check_bot_capability(bot, "group_message", group_id):
                        await ws_manager.connect(websocket, f"group:{group_id}", skip_accept=True)
                        log_bot_action(bot, "ws_subscribe_group", {"group_id": group_id})
                        await websocket.send_json({"type": "subscribed", "channel": f"group:{group_id}"})
                    else:
                        await websocket.send_json({"type": "error", "action": "subscribe_group", "message": "Missing capability or group_id"})
                
                else:
                    await websocket.send_json({"type": "error", "message": f"Unknown action: {action}"})
        finally:
            if bot["id"] in BOT_WS_CONNECTIONS:
                del BOT_WS_CONNECTIONS[bot["id"]]
    
    except WebSocketDisconnect:
        if 'bot' in locals() and bot:
            if bot["id"] in BOT_WS_CONNECTIONS:
                del BOT_WS_CONNECTIONS[bot["id"]]
            log_bot_action(bot, "ws_disconnect", {})
        ws_manager.disconnect_all(websocket)
    except Exception as e:
        if 'bot' in locals() and bot and bot["id"] in BOT_WS_CONNECTIONS:
            del BOT_WS_CONNECTIONS[bot["id"]]
        ws_manager.disconnect_all(websocket)
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass

@app.post("/api/upload/image")
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    x_auth_hash: str = Header(None, alias="X-Auth-Hash")
):
    """Upload image to ImgBB with validation and normalization"""
    if not x_auth_hash:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    user = get_user_by_hash(x_auth_hash)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    
    if not IMGBB_API_KEY:
        raise HTTPException(status_code=500, detail="Image upload not configured")
    
    # Validate content type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed: JPEG, PNG, GIF, WebP"
        )
    
    # Read and validate size
    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400, 
            detail=f"File too large. Maximum size: {MAX_IMAGE_SIZE // (1024*1024)}MB"
        )
    
    if len(content) < 1024:  # Minimum 1KB
        raise HTTPException(status_code=400, detail="File too small or corrupted")
    
    # Upload to ImgBB
    try:
        base64_image = base64.b64encode(content).decode("utf-8")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.imgbb.com/1/upload",
                data={
                    "key": IMGBB_API_KEY,
                    "image": base64_image,
                    "name": f"aco_{user['id']}_{uuid.uuid4().hex[:8]}"
                }
            )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Image upload failed")
        
        result = response.json()
        if not result.get("success"):
            raise HTTPException(status_code=500, detail="Image upload failed")
        
        image_data = result.get("data", {})
        return JSONResponse({
            "success": True,
            "url": image_data.get("url"),
            "thumb": image_data.get("thumb", {}).get("url"),
            "medium": image_data.get("medium", {}).get("url"),
            "delete_url": image_data.get("delete_url")
        })
        
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Upload timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.put("/api/users/me/avatar")
async def update_avatar(
    request: Request,
    x_auth_hash: str = Header(None, alias="X-Auth-Hash")
):
    """Update user's profile avatar"""
    if not x_auth_hash:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    user = get_user_by_hash(x_auth_hash)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    
    data = await request.json()
    avatar_url = data.get("avatar_url", "")
    
    # Validate URL is from ImgBB
    if avatar_url and not avatar_url.startswith("https://i.ibb.co/"):
        raise HTTPException(status_code=400, detail="Invalid image URL")
    
    user["avatar"] = avatar_url
    redis_client.set(f"user:{user['id']}", json.dumps(user))
    
    return JSONResponse({"success": True, "avatar": avatar_url})

@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    user_data = redis_client.get(f"user:{user_id}")
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = json.loads(str(user_data))
    public_user = {
        "id": user["id"],
        "displayName": user["displayName"],
        "bio": user.get("bio", ""),
        "field": user.get("field", ""),
        "experience": user.get("experience", ""),
        "skills": user.get("skills", []),
        "talents": user.get("talents", []),
        "createdAt": user.get("createdAt")
    }
    return JSONResponse(public_user)

@app.get("/api/users/{user_id}/posts")
async def get_user_posts(user_id: str):
    post_ids = redis_client.zrevrange(f"feed:user:{user_id}", 0, 49)
    posts = []
    
    for post_id in list(post_ids):
        post_data = redis_client.get(f"post:{post_id}")
        if post_data:
            posts.append(json.loads(str(post_data)))
    
    return JSONResponse(posts)

@app.get("/api/notifications")
async def get_notifications(x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    notifications = redis_client.lrange(f"notifications:{user['id']}", 0, 49)
    unread_count = int(redis_client.get(f"notifications:unread:{user['id']}") or 0)
    
    result = []
    for n in notifications:
        result.append(json.loads(str(n)))
    
    return JSONResponse({"notifications": result, "unread_count": unread_count})

@app.get("/api/my-bots")
async def get_my_bots(x_auth_hash: Optional[str] = Header(None)):
    """Get bots owned by the current user"""
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    bots = get_operator_bots(user["id"])
    return JSONResponse(bots)

@app.post("/api/notifications/read")
async def mark_notifications_read(x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    notifications = redis_client.lrange(f"notifications:{user['id']}", 0, -1)
    pipeline = redis_client.pipeline()
    
    for i, n in enumerate(notifications):
        notif = json.loads(str(n))
        if not notif.get("read"):
            notif["read"] = True
            pipeline.lset(f"notifications:{user['id']}", i, json.dumps(notif))
    
    pipeline.set(f"notifications:unread:{user['id']}", 0)
    pipeline.execute()
    
    return JSONResponse({"success": True})

@app.post("/api/notifications/{notification_id}/read")
async def mark_single_notification_read(notification_id: str, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    notifications = redis_client.lrange(f"notifications:{user['id']}", 0, -1)
    for i, n in enumerate(notifications):
        notif = json.loads(str(n))
        if notif.get("id") == notification_id and not notif.get("read"):
            notif["read"] = True
            redis_client.lset(f"notifications:{user['id']}", i, json.dumps(notif))
            redis_client.decr(f"notifications:unread:{user['id']}")
            break
    return JSONResponse({"success": True})

@app.delete("/api/notifications")
async def clear_all_notifications(x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    pipeline = redis_client.pipeline()
    pipeline.delete(f"notifications:{user['id']}")
    pipeline.set(f"notifications:unread:{user['id']}", 0)
    pipeline.execute()
    return JSONResponse({"success": True})

@app.delete("/api/notifications/{notification_id}")
async def delete_single_notification(notification_id: str, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    notifications = redis_client.lrange(f"notifications:{user['id']}", 0, -1)
    new_list = []
    removed = False
    was_unread = False
    for n in notifications:
        notif = json.loads(str(n))
        if notif.get("id") == notification_id and not removed:
            removed = True
            was_unread = not notif.get("read", False)
            continue
        new_list.append(n)
    if removed:
        pipeline = redis_client.pipeline()
        pipeline.delete(f"notifications:{user['id']}")
        for item in new_list:
            pipeline.rpush(f"notifications:{user['id']}", item)
        if was_unread:
            pipeline.decr(f"notifications:unread:{user['id']}")
        pipeline.execute()
    return JSONResponse({"success": True})

@app.post("/api/ecosystems")
async def create_ecosystem(request: Request, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    data = await request.json()
    name = data.get("name", "").strip()
    slug = data.get("slug", "").strip().lower()
    description = data.get("description", "").strip()
    icon = data.get("icon", "").strip()
    accent_color = data.get("accent_color", "#10b981").strip()

    if not name or not slug:
        raise HTTPException(status_code=400, detail="Name and slug are required")

    if not re.match(r'^[a-z0-9][a-z0-9\-]{1,28}[a-z0-9]$', slug):
        raise HTTPException(status_code=400, detail="Slug must be 3-30 lowercase alphanumeric characters (hyphens allowed, not at start/end)")

    if redis_client.exists(f"ecosystem:slug:{slug}"):
        raise HTTPException(status_code=400, detail="Slug already taken")

    eco_id = str(uuid.uuid4())
    now = datetime.utcnow()

    ecosystem = {
        "id": eco_id,
        "name": name,
        "slug": slug,
        "description": description,
        "icon": icon,
        "accent_color": accent_color,
        "owner_id": user["id"],
        "created_at": now.isoformat(),
        "settings": {}
    }

    pipeline = redis_client.pipeline()
    pipeline.set(f"ecosystem:{eco_id}", json.dumps(ecosystem))
    pipeline.set(f"ecosystem:slug:{slug}", eco_id)
    pipeline.zadd("ecosystems:list", {eco_id: now.timestamp()})
    pipeline.sadd(f"ecosystem:members:{eco_id}", user["id"])
    pipeline.sadd(f"user:ecosystems:{user['id']}", eco_id)
    pipeline.hset(f"ecosystem:roles:{eco_id}", user["id"], "admin")
    pipeline.execute()

    ecosystem["member_count"] = 1
    return JSONResponse(ecosystem)

@app.get("/api/ecosystems")
async def list_user_ecosystems(x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    eco_ids = redis_client.smembers(f"user:ecosystems:{user['id']}")
    ecosystems = []
    for eid in eco_ids:
        eid = str(eid)
        eco_data = redis_client.get(f"ecosystem:{eid}")
        if eco_data:
            eco = json.loads(str(eco_data))
            eco["member_count"] = redis_client.scard(f"ecosystem:members:{eid}")
            role = redis_client.hget(f"ecosystem:roles:{eid}", user["id"])
            eco["user_role"] = str(role) if role else "member"
            ecosystems.append(eco)

    return JSONResponse(ecosystems)

@app.get("/api/ecosystems/explore")
async def explore_ecosystems(x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    eco_ids = redis_client.zrevrange("ecosystems:list", 0, -1)
    ecosystems = []
    for eid in eco_ids:
        eid = str(eid)
        eco_data = redis_client.get(f"ecosystem:{eid}")
        if eco_data:
            eco = json.loads(str(eco_data))
            eco["member_count"] = redis_client.scard(f"ecosystem:members:{eid}")
            eco["is_member"] = redis_client.sismember(f"ecosystem:members:{eid}", user["id"])
            ecosystems.append(eco)

    return JSONResponse(ecosystems)

@app.get("/api/ecosystems/{eco_id}")
async def get_ecosystem(eco_id: str, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")

    eco_data = redis_client.get(f"ecosystem:{eco_id}")
    if not eco_data:
        raise HTTPException(status_code=404, detail="Ecosystem not found")

    eco = json.loads(str(eco_data))
    eco["member_count"] = redis_client.scard(f"ecosystem:members:{eco_id}")
    if user:
        eco["is_member"] = redis_client.sismember(f"ecosystem:members:{eco_id}", user["id"])
        role = redis_client.hget(f"ecosystem:roles:{eco_id}", user["id"])
        eco["user_role"] = str(role) if role else None

    return JSONResponse(eco)

@app.patch("/api/ecosystems/{eco_id}")
async def update_ecosystem(eco_id: str, request: Request, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if not check_ecosystem_permission(eco_id, user):
        raise HTTPException(status_code=403, detail="Ecosystem admin access required")

    eco_data = redis_client.get(f"ecosystem:{eco_id}")
    if not eco_data:
        raise HTTPException(status_code=404, detail="Ecosystem not found")

    eco = json.loads(str(eco_data))
    data = await request.json()

    allowed_fields = ["name", "description", "icon", "accent_color", "banner", "secondary_color", "tagline", "visibility", "theme", "website", "invite_only"]
    for field in allowed_fields:
        if field in data:
            val = data[field]
            if isinstance(val, str):
                eco[field] = val.strip()
            elif isinstance(val, bool) or isinstance(val, int):
                eco[field] = val
            else:
                eco[field] = val

    redis_client.set(f"ecosystem:{eco_id}", json.dumps(eco))
    eco["member_count"] = redis_client.scard(f"ecosystem:members:{eco_id}")
    return JSONResponse(eco)

@app.post("/api/ecosystems/{eco_id}/join")
async def join_ecosystem(eco_id: str, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    eco_data = redis_client.get(f"ecosystem:{eco_id}")
    if not eco_data:
        raise HTTPException(status_code=404, detail="Ecosystem not found")

    if redis_client.sismember("platform:banned", user["id"]):
        raise HTTPException(status_code=403, detail="You are banned from the platform")

    if redis_client.sismember(f"ecosystem:banned:{eco_id}", user["id"]):
        raise HTTPException(status_code=403, detail="You are banned from this ecosystem")

    pipeline = redis_client.pipeline()
    pipeline.sadd(f"ecosystem:members:{eco_id}", user["id"])
    pipeline.sadd(f"user:ecosystems:{user['id']}", eco_id)
    pipeline.execute()

    return JSONResponse({"joined": True})

@app.post("/api/ecosystems/{eco_id}/leave")
async def leave_ecosystem(eco_id: str, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    eco_data = redis_client.get(f"ecosystem:{eco_id}")
    if not eco_data:
        raise HTTPException(status_code=404, detail="Ecosystem not found")

    eco = json.loads(str(eco_data))
    if eco.get("owner_id") == user["id"]:
        raise HTTPException(status_code=400, detail="Owner cannot leave the ecosystem")

    pipeline = redis_client.pipeline()
    pipeline.srem(f"ecosystem:members:{eco_id}", user["id"])
    pipeline.srem(f"user:ecosystems:{user['id']}", eco_id)
    pipeline.hdel(f"ecosystem:roles:{eco_id}", user["id"])
    pipeline.execute()

    return JSONResponse({"left": True})

@app.get("/api/ecosystems/{eco_id}/members")
async def list_ecosystem_members(eco_id: str, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")

    eco_data = redis_client.get(f"ecosystem:{eco_id}")
    if not eco_data:
        raise HTTPException(status_code=404, detail="Ecosystem not found")

    member_ids = redis_client.smembers(f"ecosystem:members:{eco_id}")
    members = []
    for mid in member_ids:
        mid = str(mid)
        user_data = redis_client.get(f"user:{mid}")
        if user_data:
            u = json.loads(str(user_data))
            role = redis_client.hget(f"ecosystem:roles:{eco_id}", mid)
            members.append({
                "id": mid,
                "displayName": u.get("displayName", "Unknown"),
                "avatar": u.get("avatar", ""),
                "bio": u.get("bio", ""),
                "role": str(role) if role else "member"
            })

    return JSONResponse(members)

@app.post("/api/ecosystems/{eco_id}/ban")
async def ecosystem_ban(eco_id: str, request: Request, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if not check_ecosystem_permission(eco_id, user):
        raise HTTPException(status_code=403, detail="Ecosystem admin access required")

    data = await request.json()
    target_id = data.get("user_id", "").strip()
    if not target_id:
        raise HTTPException(status_code=400, detail="user_id required")

    eco_data = redis_client.get(f"ecosystem:{eco_id}")
    if eco_data:
        eco = json.loads(str(eco_data))
        if eco.get("owner_id") == target_id:
            raise HTTPException(status_code=400, detail="Cannot ban the ecosystem owner")

    pipeline = redis_client.pipeline()
    pipeline.sadd(f"ecosystem:banned:{eco_id}", target_id)
    pipeline.srem(f"ecosystem:members:{eco_id}", target_id)
    pipeline.srem(f"user:ecosystems:{target_id}", eco_id)
    pipeline.hdel(f"ecosystem:roles:{eco_id}", target_id)
    pipeline.execute()

    return JSONResponse({"banned": True})

@app.post("/api/ecosystems/{eco_id}/unban")
async def ecosystem_unban(eco_id: str, request: Request, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if not check_ecosystem_permission(eco_id, user):
        raise HTTPException(status_code=403, detail="Ecosystem admin access required")

    data = await request.json()
    target_id = data.get("user_id", "").strip()
    if not target_id:
        raise HTTPException(status_code=400, detail="user_id required")

    redis_client.srem(f"ecosystem:banned:{eco_id}", target_id)
    return JSONResponse({"unbanned": True})

@app.get("/api/ecosystems/{eco_id}/check-slug")
async def check_ecosystem_slug(eco_id: str):
    available = not redis_client.exists(f"ecosystem:slug:{eco_id}")
    return JSONResponse({"available": available})

@app.post("/api/admin/platform-ban/{user_id}")
async def platform_ban(user_id: str, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user or not is_super_admin(user):
        raise HTTPException(status_code=403, detail="Super admin access required")

    redis_client.sadd("platform:banned", user_id)
    return JSONResponse({"banned": True})

@app.post("/api/admin/platform-unban/{user_id}")
async def platform_unban(user_id: str, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user or not is_super_admin(user):
        raise HTTPException(status_code=403, detail="Super admin access required")

    redis_client.srem("platform:banned", user_id)
    return JSONResponse({"unbanned": True})

@app.get("/api/hashtags/trending")
async def get_trending_hashtags():
    tags = redis_client.zrevrange("hashtags:trending", 0, 19, withscores=True)
    result = []
    for tag, score in tags:
        result.append({"tag": tag, "count": int(score)})
    return JSONResponse(result)

@app.get("/api/hashtags/{tag}")
async def get_hashtag_posts(tag: str, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    tag = tag.lower()
    
    post_ids = redis_client.zrevrange(f"hashtag:{tag}", 0, 49)
    posts = []
    
    for post_id in list(post_ids):
        post_data = redis_client.get(f"post:{post_id}")
        if post_data:
            post = json.loads(str(post_data))
            author_data = redis_client.get(f"user:{post.get('user_id')}")
            if author_data:
                author = json.loads(str(author_data))
                post["author"] = {
                    "id": author["id"],
                    "displayName": author["displayName"],
                    "field": author.get("field", ""),
                    "avatar": author.get("avatar", "")
                }
            if user:
                post["liked"] = redis_client.sismember(f"post:likes:{post_id}", user["id"])
            posts.append(post)
    
    total_count = redis_client.zcard(f"hashtag:{tag}")
    return JSONResponse({"tag": tag, "posts": posts, "total": total_count})

@app.get("/api/users/search/{query}")
async def search_users(query: str):
    query_lower = query.lower()
    all_keys = redis_client.keys("user:name:*")
    results = []
    
    for key in all_keys:
        name = key.replace("user:name:", "")
        if query_lower in name:
            user_id = redis_client.get(key)
            if user_id:
                user_data = redis_client.get(f"user:{user_id}")
                if user_data:
                    user = json.loads(str(user_data))
                    results.append({
                        "id": user["id"],
                        "displayName": user["displayName"],
                        "username": user.get("username", ""),
                        "field": user.get("field", "")
                    })
        if len(results) >= 10:
            break
    
    return JSONResponse(results)

@app.get("/api/search")
async def unified_search(q: str = ""):
    """Unified search for users, bots, hashtags, and groups"""
    query = q.strip().lower()
    if len(query) < 2:
        return JSONResponse({"users": [], "bots": [], "hashtags": [], "groups": []})
    
    results = {"users": [], "bots": [], "hashtags": [], "groups": []}
    
    all_user_keys = redis_client.keys("user:name:*")
    for key in all_user_keys:
        if len(results["users"]) >= 5 and len(results["bots"]) >= 5:
            break
        name = key.replace("user:name:", "")
        if query in name:
            user_id = redis_client.get(key)
            if user_id:
                user_data = redis_client.get(f"user:{user_id}")
                if user_data:
                    user = json.loads(str(user_data))
                    item = {
                        "id": user["id"],
                        "displayName": user["displayName"],
                        "username": user.get("username", ""),
                        "avatar": user.get("avatar", ""),
                        "field": user.get("field", ""),
                        "is_bot": user.get("is_bot", False)
                    }
                    if user.get("is_bot"):
                        if len(results["bots"]) < 5:
                            item["purpose"] = user.get("bot_data", {}).get("purpose", "")
                            results["bots"].append(item)
                    else:
                        if len(results["users"]) < 5:
                            results["users"].append(item)
    
    trending_data = redis_client.zrevrange("hashtags:trending", 0, 50, withscores=True)
    for tag_bytes, score in trending_data:
        tag = tag_bytes if isinstance(tag_bytes, str) else tag_bytes.decode() if hasattr(tag_bytes, 'decode') else str(tag_bytes)
        if query in tag.lower():
            results["hashtags"].append({"tag": tag, "count": int(score)})
            if len(results["hashtags"]) >= 5:
                break
    
    all_group_keys = redis_client.keys("group:*")
    for key in all_group_keys:
        if len(results["groups"]) >= 5:
            break
        if ":" in key.replace("group:", "", 1):
            continue
        try:
            key_type = redis_client.type(key)
            if key_type != "string":
                continue
            group_data = redis_client.get(key)
            if group_data:
                group = json.loads(str(group_data))
                name_match = query in group.get("name", "").lower()
                slug_match = query in group.get("slug", "").lower()
                if name_match or slug_match:
                    eco_id = group.get("ecosystem_id", DEVONE_ECOSYSTEM_ID)
                    eco_data = redis_client.get(f"ecosystem:{eco_id}")
                    eco_name = ""
                    if eco_data:
                        try:
                            eco_name = json.loads(str(eco_data)).get("name", "")
                        except:
                            pass
                    results["groups"].append({
                        "id": group["id"],
                        "name": group["name"],
                        "slug": group.get("slug", ""),
                        "description": group.get("description", "")[:100],
                        "ecosystem_id": eco_id,
                        "ecosystem_name": eco_name
                    })
        except:
            pass
    
    return JSONResponse(results)

@app.post("/api/groups")
async def create_group(request: Request, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    data = await request.json()
    name = data.get("name", "").strip()
    description = data.get("description", "").strip()
    terms = data.get("terms", "").strip()
    avatar = data.get("avatar", "").strip()
    privacy = data.get("privacy", "public").strip().lower()
    ecosystem_id = data.get("ecosystem_id", DEVONE_ECOSYSTEM_ID).strip()
    
    eco_data = redis_client.get(f"ecosystem:{ecosystem_id}")
    if not eco_data:
        raise HTTPException(status_code=400, detail="Ecosystem not found")
    
    if not redis_client.sismember(f"ecosystem:members:{ecosystem_id}", user["id"]):
        raise HTTPException(status_code=403, detail="You must be a member of this ecosystem")
    
    if privacy not in ("public", "private"):
        privacy = "public"
    
    if privacy == "private":
        slug = "dnprv-" + uuid.uuid4().hex[:32]
    else:
        slug = data.get("slug", "").strip().lower()
        if not slug:
            raise HTTPException(status_code=400, detail="Name and slug required")
        if not slug.replace("-", "").isalnum() or len(slug) < 3 or len(slug) > 30:
            raise HTTPException(status_code=400, detail="Slug must be 3-30 alphanumeric characters (hyphens allowed)")
    
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    
    if redis_client.exists(f"group:slug:{slug}"):
        raise HTTPException(status_code=400, detail="Slug already taken")
    
    group_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    is_private = privacy == "private"
    
    group = {
        "id": group_id,
        "name": name,
        "slug": slug,
        "description": description,
        "terms": terms,
        "avatar": avatar,
        "creator_id": user["id"],
        "created_at": now.isoformat(),
        "status": "approved" if is_private else "pending",
        "privacy": privacy,
        "member_count": 0,
        "ecosystem_id": ecosystem_id
    }
    
    pipeline = redis_client.pipeline()
    pipeline.set(f"group:{group_id}", json.dumps(group))
    pipeline.set(f"group:slug:{slug}", group_id)
    if is_private:
        pipeline.zadd("groups:approved", {group_id: now.timestamp()})
        pipeline.zadd(f"ecosystem:groups:{ecosystem_id}", {group_id: now.timestamp()})
    else:
        pipeline.zadd("groups:pending", {group_id: now.timestamp()})
    pipeline.hset(f"group:roles:{group_id}", user["id"], "owner")
    pipeline.sadd(f"group:members:{group_id}", user["id"])
    pipeline.execute()
    
    group["member_count"] = 1
    
    return JSONResponse(group)

@app.get("/api/groups")
async def list_groups(x_auth_hash: Optional[str] = Header(None), ecosystem_id: Optional[str] = None):
    user = get_current_user(x_auth_hash or "")
    if not user:
        return JSONResponse([])
    
    eco_filter = ecosystem_id or DEVONE_ECOSYSTEM_ID
    is_admin = user.get("is_admin") or user.get("isSuperAdmin") or user.get("is_superadmin")
    groups = []
    seen_ids = set()
    
    pending_ids = redis_client.zrevrange("groups:pending", 0, -1)
    for gid in list(pending_ids):
        group_data = redis_client.get(f"group:{gid}")
        if group_data:
            group = json.loads(str(group_data))
            if group.get("ecosystem_id", DEVONE_ECOSYSTEM_ID) != eco_filter:
                continue
            if group.get("creator_id") == user["id"] or is_admin or check_ecosystem_permission(eco_filter, user):
                group["is_member"] = redis_client.sismember(f"group:members:{gid}", user["id"])
                group["member_count"] = redis_client.scard(f"group:members:{gid}")
                groups.append(group)
                seen_ids.add(gid)
    
    eco_group_ids = redis_client.zrevrange(f"ecosystem:groups:{eco_filter}", 0, -1)
    if not eco_group_ids:
        eco_group_ids = redis_client.zrevrange("groups:approved", 0, -1)
    for gid in list(eco_group_ids):
        if gid in seen_ids:
            continue
        group_data = redis_client.get(f"group:{gid}")
        if group_data:
            group = json.loads(str(group_data))
            if group.get("ecosystem_id", DEVONE_ECOSYSTEM_ID) != eco_filter:
                continue
            is_private = group.get("privacy") == "private"
            is_member = redis_client.sismember(f"group:members:{gid}", user["id"])
            
            if is_private and not is_member and not is_admin:
                continue
            
            group["is_member"] = is_member
            group["member_count"] = redis_client.scard(f"group:members:{gid}")
            groups.append(group)
    
    return JSONResponse(groups)

@app.get("/api/groups/{group_id}")
async def get_group(group_id: str, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    
    group_data = redis_client.get(f"group:{group_id}")
    if not group_data:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group = json.loads(str(group_data))
    if user:
        group["is_member"] = redis_client.sismember(f"group:members:{group_id}", user["id"])
        role = redis_client.hget(f"group:roles:{group_id}", user["id"])
        group["user_role"] = str(role) if role else "member"
    
    return JSONResponse(group)

@app.post("/api/groups/{group_id}/convert-public")
async def convert_group_to_public(group_id: str, request: Request, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    group_data = redis_client.get(f"group:{group_id}")
    if not group_data:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group = json.loads(str(group_data))
    
    role = redis_client.hget(f"group:roles:{group_id}", user["id"])
    if str(role) != "owner":
        raise HTTPException(status_code=403, detail="Only the owner can convert a community")
    
    if group.get("privacy") != "private":
        raise HTTPException(status_code=400, detail="Only private communities can be converted to public")
    
    data = await request.json()
    new_slug = data.get("slug", "").strip().lower()
    
    if not new_slug:
        raise HTTPException(status_code=400, detail="A custom slug is required")
    
    if not new_slug.replace("-", "").isalnum() or len(new_slug) < 3 or len(new_slug) > 30:
        raise HTTPException(status_code=400, detail="Slug must be 3-30 alphanumeric characters (hyphens allowed)")
    
    if new_slug.startswith("dnprv-"):
        raise HTTPException(status_code=400, detail="Public slugs cannot start with dnprv-")
    
    if redis_client.exists(f"group:slug:{new_slug}"):
        raise HTTPException(status_code=400, detail="Slug already taken")
    
    old_slug = group["slug"]
    group["slug"] = new_slug
    group["privacy"] = "public"
    
    pipeline = redis_client.pipeline()
    pipeline.set(f"group:{group_id}", json.dumps(group))
    pipeline.delete(f"group:slug:{old_slug}")
    pipeline.set(f"group:slug:{new_slug}", group_id)
    pipeline.execute()
    
    return JSONResponse({"success": True, "group": group})

@app.get("/api/groups/by-slug/{slug}")
async def get_group_by_slug(slug: str, x_auth_hash: Optional[str] = Header(None)):
    """Look up a group by its slug"""
    user = get_current_user(x_auth_hash or "")
    
    # Check for alias first
    alias_target = redis_client.get(f"group:alias:{slug.lower()}")
    if alias_target:
        slug = str(alias_target)
    
    group_id = redis_client.get(f"group:slug:{slug.lower()}")
    if not group_id:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group_data = redis_client.get(f"group:{group_id}")
    if not group_data:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group = json.loads(str(group_data))
    
    if user:
        group["is_member"] = redis_client.sismember(f"group:members:{group_id}", user["id"])
    
    group["member_count"] = redis_client.scard(f"group:members:{group_id}")
    return JSONResponse(group)

@app.patch("/api/groups/{group_id}")
async def update_group(group_id: str, request: Request, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    role = redis_client.hget(f"group:roles:{group_id}", user["id"])
    role_str = str(role) if role else "member"
    
    if role_str not in ["owner", "admin"] and not (user.get("is_admin") or is_super_admin(user)):
        raise HTTPException(status_code=403, detail="Only owners and admins can edit group settings")
    
    group_data = redis_client.get(f"group:{group_id}")
    if not group_data:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group = json.loads(str(group_data))
    data = await request.json()
    
    if "name" in data and data["name"].strip():
        group["name"] = data["name"].strip()
    if "description" in data:
        group["description"] = data["description"].strip()
    if "terms" in data:
        group["terms"] = data["terms"].strip()
    if "avatar" in data:
        group["avatar"] = data["avatar"].strip()
    
    redis_client.set(f"group:{group_id}", json.dumps(group))
    
    return JSONResponse(group)

@app.post("/api/groups/{group_id}/join")
async def join_group(group_id: str, request: Request, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    group_data = redis_client.get(f"group:{group_id}")
    if not group_data:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group = json.loads(str(group_data))
    
    if group.get("status") != "approved" and not group.get("is_approved"):
        raise HTTPException(status_code=400, detail="Group not approved")
    
    if redis_client.sismember(f"group:banned:{group_id}", user["id"]):
        raise HTTPException(status_code=403, detail="You are banned from this group")
    
    data = await request.json()
    agreed_to_terms = data.get("agreed_to_terms", False)
    
    if group.get("terms") and not agreed_to_terms:
        raise HTTPException(status_code=400, detail="Must agree to terms")
    
    if redis_client.sismember(f"group:members:{group_id}", user["id"]):
        return JSONResponse({"already_member": True})
    
    pipeline = redis_client.pipeline()
    pipeline.sadd(f"group:members:{group_id}", user["id"])
    pipeline.sadd(f"user:groups:{user['id']}", group_id)
    pipeline.execute()
    
    group["member_count"] = redis_client.scard(f"group:members:{group_id}")
    redis_client.set(f"group:{group_id}", json.dumps(group))
    
    return JSONResponse({"joined": True, "group": group})

@app.post("/api/groups/{group_id}/leave")
async def leave_group(group_id: str, x_auth_hash: Optional[str] = Header(None)):
    """Leave a group"""
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    group_data = redis_client.get(f"group:{group_id}")
    if not group_data:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group = json.loads(str(group_data))
    
    # Check if user is the owner - owners can't leave
    if group.get("creator_id") == user["id"]:
        raise HTTPException(status_code=400, detail="Group owners cannot leave their group. Transfer ownership first.")
    
    if not redis_client.sismember(f"group:members:{group_id}", user["id"]):
        return JSONResponse({"left": False, "message": "Not a member"})
    
    pipeline = redis_client.pipeline()
    pipeline.srem(f"group:members:{group_id}", user["id"])
    pipeline.srem(f"user:groups:{user['id']}", group_id)
    pipeline.hdel(f"group:roles:{group_id}", user["id"])
    pipeline.execute()
    
    group["member_count"] = redis_client.scard(f"group:members:{group_id}")
    redis_client.set(f"group:{group_id}", json.dumps(group))
    
    log_activity("group_leave", user["id"], {"group_id": group_id, "group_name": group.get("name")})
    
    return JSONResponse({"left": True, "group": group})

@app.get("/api/groups/{group_id}/messages")
async def get_group_messages(group_id: str, x_auth_hash: Optional[str] = Header(None), limit: int = 50, before: Optional[int] = None):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if not redis_client.sismember(f"group:members:{group_id}", user["id"]):
        raise HTTPException(status_code=403, detail="Not a member")
    
    batch_key = f"notification:batch:{user['id']}:{group_id}"
    redis_client.delete(batch_key)
    
    limit = min(limit, 100)
    list_key = f"group:messages:{group_id}"
    total = redis_client.llen(list_key)
    
    if before is not None:
        end = before - 1
        start = max(end - limit + 1, 0)
    else:
        end = total - 1
        start = max(total - limit, 0)
    
    if start > end or total == 0:
        return JSONResponse({"messages": [], "has_more": False, "next_before": None})
    
    message_ids = redis_client.lrange(list_key, start, end)
    messages = []
    
    for msg_id in message_ids:
        msg_id_str = str(msg_id)
        msg_data = redis_client.get(f"message:{msg_id_str}")
        if msg_data:
            msg = json.loads(str(msg_data))
        else:
            try:
                msg = json.loads(msg_id_str)
            except (json.JSONDecodeError, ValueError):
                continue
        user_id = msg.get('user_id')
        author_data = redis_client.get(f"user:{user_id}") if user_id else None
        if author_data:
            author = json.loads(str(author_data))
            msg["author"] = {"id": author["id"], "displayName": author["displayName"], "avatar": author.get("avatar", "")}
        else:
            msg["author"] = {"id": user_id or "unknown", "displayName": msg.get("displayName", "Unknown User"), "avatar": ""}
        thread_meta_raw = redis_client.get(f"thread:meta:{group_id}:{msg_id_str}")
        if thread_meta_raw:
            tmeta = json.loads(str(thread_meta_raw))
            msg["thread_reply_count"] = tmeta.get("reply_count", 0)
            msg["thread_last_reply_at"] = tmeta.get("last_reply_at", "")
            msg["thread_last_reply_by"] = tmeta.get("last_reply_by", "")
        messages.append(msg)
    
    has_more = start > 0
    return JSONResponse({"messages": messages, "has_more": has_more, "next_before": start if has_more else None})

@app.post("/api/groups/{group_id}/messages")
async def send_group_message(group_id: str, request: Request, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if not redis_client.sismember(f"group:members:{group_id}", user["id"]):
        raise HTTPException(status_code=403, detail="Not a member")
    
    data = await request.json()
    content = data.get("content", "").strip()
    image_url = data.get("image_url", "")
    reply_to = data.get("reply_to")
    
    # Validate image URL if provided
    if image_url and not (image_url.startswith("https://i.ibb.co/") or image_url.startswith("https://static.klipy.com/")):
        image_url = ""
    
    if not content and not image_url:
        raise HTTPException(status_code=400, detail="Message content or image required")
    
    if len(content) > 2000:
        raise HTTPException(status_code=400, detail="Message too long")
    
    msg_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    reply_to_data = None
    if reply_to and isinstance(reply_to, dict):
        parent_msg_id = str(reply_to.get("message_id", ""))[:64]
        import re as _re
        if parent_msg_id and _re.match(r'^[a-f0-9\-]{36}$', parent_msg_id):
            parent_data = redis_client.get(f"message:{parent_msg_id}")
            if parent_data:
                parent_msg = json.loads(str(parent_data))
                if parent_msg.get("group_id") == group_id:
                    parent_author_id = parent_msg.get("user_id", "")
                    parent_author_data = redis_client.get(f"user:{parent_author_id}")
                    parent_author_name = "Unknown"
                    if parent_author_data:
                        parent_author = json.loads(str(parent_author_data))
                        parent_author_name = parent_author.get("displayName", "Unknown")
                    parent_content = (parent_msg.get("content", "") or "")[:80]
                    reply_to_data = {
                        "message_id": parent_msg_id,
                        "author_name": parent_author_name,
                        "content_preview": parent_content
                    }
    
    message = {
        "id": msg_id,
        "group_id": group_id,
        "user_id": user["id"],
        "content": content,
        "image_url": image_url,
        "reply_to": reply_to_data,
        "created_at": now.isoformat()
    }
    
    pipeline = redis_client.pipeline()
    pipeline.set(f"message:{msg_id}", json.dumps(message))
    pipeline.rpush(f"group:messages:{group_id}", msg_id)
    pipeline.ltrim(f"group:messages:{group_id}", -500, -1)
    
    if reply_to_data and reply_to_data.get("message_id"):
        thread_root_id = reply_to_data["message_id"]
        parent_msg_raw = redis_client.get(f"message:{thread_root_id}")
        if parent_msg_raw:
            parent_msg_obj = json.loads(str(parent_msg_raw))
            actual_root = parent_msg_obj.get("thread_root_id", thread_root_id)
        else:
            actual_root = thread_root_id
        message["thread_root_id"] = actual_root
        pipeline.set(f"message:{msg_id}", json.dumps(message))
        pipeline.zadd(f"thread:replies:{group_id}:{actual_root}", {msg_id: now.timestamp()})
        existing_meta = redis_client.get(f"thread:meta:{group_id}:{actual_root}")
        if existing_meta:
            meta = json.loads(str(existing_meta))
            meta["reply_count"] = meta.get("reply_count", 0) + 1
            meta["last_reply_at"] = now.isoformat()
            meta["last_reply_by"] = user["displayName"]
            meta["last_reply_preview"] = (content or "[Image]")[:80]
        else:
            root_msg_raw = redis_client.get(f"message:{actual_root}")
            root_content = ""
            root_author = "Unknown"
            root_author_id = ""
            if root_msg_raw:
                root_msg = json.loads(str(root_msg_raw))
                root_content = root_msg.get("content", "")
                root_author_id = root_msg.get("user_id", "")
                ra_data = redis_client.get(f"user:{root_author_id}")
                if ra_data:
                    root_author = json.loads(str(ra_data)).get("displayName", "Unknown")
            meta = {
                "root_message_id": actual_root,
                "group_id": group_id,
                "root_content": root_content[:200],
                "root_author": root_author,
                "root_author_id": root_author_id,
                "created_at": now.isoformat(),
                "reply_count": 1,
                "last_reply_at": now.isoformat(),
                "last_reply_by": user["displayName"],
                "last_reply_preview": (content or "[Image]")[:80]
            }
        pipeline.set(f"thread:meta:{group_id}:{actual_root}", json.dumps(meta))
        pipeline.zadd(f"group:threads:{group_id}", {actual_root: now.timestamp()})
    
    pipeline.execute()
    
    message["author"] = {"id": user["id"], "displayName": user["displayName"], "avatar": user.get("avatar", "")}
    
    broadcast_data = {
        "type": "group_message",
        "group_id": group_id,
        "id": msg_id,
        "sender_id": user["id"],
        "sender_name": user["displayName"],
        "content": content,
        "image_url": image_url,
        "created_at": message["created_at"]
    }
    if reply_to_data:
        broadcast_data["reply_to"] = reply_to_data
    if message.get("thread_root_id"):
        broadcast_data["thread_root_id"] = message["thread_root_id"]
    await ws_manager.broadcast(broadcast_data, f"group:{group_id}")
    
    # Get group name for notification
    group_data = redis_client.get(f"group:{group_id}")
    group_name = "Group"
    if group_data:
        group = json.loads(str(group_data))
        group_name = group.get("name", "Group")
    
    # Send batched notifications to all group members except the sender
    member_ids = redis_client.smembers(f"group:members:{group_id}")
    for member_id in member_ids:
        mid = str(member_id)
        if mid != user["id"]:
            # Check for existing unread notification for this group
            batch_key = f"notification:batch:{mid}:{group_id}"
            existing_batch = redis_client.get(batch_key)
            
            if existing_batch:
                # Update existing batch notification
                batch = json.loads(str(existing_batch))
                batch["count"] = batch.get("count", 1) + 1
                batch["preview"] = content[:50] if content else "[Image]"
                batch["last_sender"] = user["displayName"]
                batch["created_at"] = now.isoformat()
                redis_client.set(batch_key, json.dumps(batch))
                redis_client.expire(batch_key, 3600)  # 1 hour TTL
                
                # Update the notification in the list
                notifications = redis_client.lrange(f"notifications:{mid}", 0, 20)
                for i, n in enumerate(notifications):
                    notif = json.loads(str(n))
                    if notif.get("batch_id") == batch["batch_id"]:
                        notif["count"] = batch["count"]
                        notif["preview"] = batch["preview"]
                        notif["last_sender"] = batch["last_sender"]
                        notif["created_at"] = batch["created_at"]
                        redis_client.lset(f"notifications:{mid}", i, json.dumps(notif))
                        break
            else:
                # Create new batch notification
                batch_id = str(uuid.uuid4())
                notification = {
                    "id": batch_id,
                    "batch_id": batch_id,
                    "type": "group_message",
                    "from_user": {"id": user["id"], "displayName": user["displayName"], "avatar": user.get("avatar", "")},
                    "last_sender": user["displayName"],
                    "group_id": group_id,
                    "group_name": group_name,
                    "preview": content[:50] if content else "[Image]",
                    "count": 1,
                    "created_at": now.isoformat()
                }
                redis_client.lpush(f"notifications:{mid}", json.dumps(notification))
                redis_client.ltrim(f"notifications:{mid}", 0, 99)
                redis_client.incr(f"notifications:unread:{mid}")
                
                # Store batch reference
                redis_client.set(batch_key, json.dumps({"batch_id": batch_id, "count": 1}))
                redis_client.expire(batch_key, 3600)  # 1 hour TTL
            asyncio.create_task(push_notification_update(mid))
    
    asyncio.create_task(ws_manager.broadcast({
        "type": "new_message",
        "message": message
    }, f"group:{group_id}"))
    
    if reply_to_data and reply_to_data.get("message_id"):
        async def _try_bot_reply():
            try:
                if not hasattr(app.state, "system_bots_module"):
                    print(f"[SystemBot] No system_bots_module on app.state")
                    return
                _sb = app.state.system_bots_module
                print(f"[SystemBot] Checking reply to msg {reply_to_data['message_id'][:12]}… in group {group_id[:12]}…")
                bot_broadcast = await _sb.handle_bot_reply(
                    original_msg_id=reply_to_data["message_id"],
                    user_message=content,
                    user_name=user["displayName"],
                    user_id=user["id"],
                    group_id=group_id,
                    ws_manager=ws_manager,
                )
                if bot_broadcast:
                    await ws_manager.broadcast(bot_broadcast, f"group:{group_id}")
                    print(f"[SystemBot] Reply sent in group {group_id[:12]}…")
                else:
                    print(f"[SystemBot] No reply generated (not a bot msg or limit reached)")
            except Exception as e:
                import traceback
                print(f"[SystemBot] Reply error: {e}")
                traceback.print_exc()
        asyncio.create_task(_try_bot_reply())
    
    return JSONResponse(message)

@app.websocket("/ws/group/{group_id}")
async def websocket_group(websocket: WebSocket, group_id: str):
    await ws_manager.connect(websocket, f"group:{group_id}")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, f"group:{group_id}")

@app.get("/api/admin/users")
async def get_admin_users(x_auth_hash: Optional[str] = Header(None), ecosystem_id: Optional[str] = None):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=403, detail="Auth required")
    eco_filter = ecosystem_id or DEVONE_ECOSYSTEM_ID
    require_admin_for_ecosystem(user, eco_filter)
    
    is_super = is_super_admin(user) or user.get("is_admin")
    
    if is_super:
        user_keys = redis_client.keys("user:*")
        target_ids = set()
        for key in user_keys:
            key_str = str(key)
            if ":" in key_str[5:]:
                continue
            uid = key_str[5:]
            target_ids.add(uid)
    else:
        target_ids = redis_client.smembers(f"ecosystem:members:{eco_filter}")
        target_ids = {str(uid) for uid in target_ids}
    
    users = []
    for uid in target_ids:
        user_data = redis_client.get(f"user:{uid}")
        if user_data:
            try:
                u = json.loads(str(user_data))
                if u.get("id"):
                    users.append({
                        "id": u.get("id"),
                        "displayName": u.get("displayName"),
                        "field": u.get("field", ""),
                        "avatar": u.get("avatar", ""),
                        "is_admin": u.get("is_admin", False),
                        "is_banned": u.get("is_banned", False),
                        "created_at": u.get("created_at", "")
                    })
            except:
                pass
    
    users.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return JSONResponse(users)

@app.post("/api/admin/users/{user_id}/ban")
async def ban_user(user_id: str, x_auth_hash: Optional[str] = Header(None), ecosystem_id: Optional[str] = None):
    admin = get_current_user(x_auth_hash or "")
    if not admin:
        raise HTTPException(status_code=403, detail="Auth required")
    eco_filter = ecosystem_id or DEVONE_ECOSYSTEM_ID
    require_admin_for_ecosystem(admin, eco_filter)
    
    admin_is_super = is_super_admin(admin) or admin.get("is_admin")
    
    if not admin_is_super:
        if not redis_client.sismember(f"ecosystem:members:{eco_filter}", user_id):
            raise HTTPException(status_code=403, detail="User is not in your ecosystem")
    
    user_data = redis_client.get(f"user:{user_id}")
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = json.loads(str(user_data))
    if user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Cannot ban an admin")
    
    if admin_is_super:
        user["is_banned"] = True
        redis_client.set(f"user:{user_id}", json.dumps(user))
    else:
        redis_client.sadd(f"ecosystem:banned:{eco_filter}", user_id)
        redis_client.srem(f"ecosystem:members:{eco_filter}", user_id)
    
    log_activity("user_ban", admin["id"], {"target_user_id": user_id, "target_name": user.get("displayName"), "ecosystem_id": eco_filter, "scope": "platform" if admin_is_super else "ecosystem"}, admin.get("displayName"))
    return JSONResponse({"success": True})

@app.post("/api/admin/users/{user_id}/unban")
async def unban_user(user_id: str, x_auth_hash: Optional[str] = Header(None), ecosystem_id: Optional[str] = None):
    admin = get_current_user(x_auth_hash or "")
    if not admin:
        raise HTTPException(status_code=403, detail="Auth required")
    eco_filter = ecosystem_id or DEVONE_ECOSYSTEM_ID
    require_admin_for_ecosystem(admin, eco_filter)
    
    admin_is_super = is_super_admin(admin) or admin.get("is_admin")
    
    user_data = redis_client.get(f"user:{user_id}")
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = json.loads(str(user_data))
    
    if admin_is_super:
        user["is_banned"] = False
        redis_client.set(f"user:{user_id}", json.dumps(user))
    else:
        redis_client.srem(f"ecosystem:banned:{eco_filter}", user_id)
        redis_client.sadd(f"ecosystem:members:{eco_filter}", user_id)
    
    log_activity("user_unban", admin["id"], {"target_user_id": user_id, "target_name": user.get("displayName"), "ecosystem_id": eco_filter, "scope": "platform" if admin_is_super else "ecosystem"}, admin.get("displayName"))
    return JSONResponse({"success": True})

@app.post("/api/admin/users/{user_id}/make-admin")
async def make_admin(user_id: str, x_auth_hash: Optional[str] = Header(None), ecosystem_id: Optional[str] = None):
    admin = get_current_user(x_auth_hash or "")
    if not admin:
        raise HTTPException(status_code=403, detail="Auth required")
    if not (is_super_admin(admin) or admin.get("is_admin")):
        raise HTTPException(status_code=403, detail="Only platform admins can promote users")
    
    user_data = redis_client.get(f"user:{user_id}")
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = json.loads(str(user_data))
    user["is_admin"] = True
    redis_client.set(f"user:{user_id}", json.dumps(user))
    
    log_activity("user_promote_admin", admin["id"], {"target_user_id": user_id, "target_name": user.get("displayName")}, admin.get("displayName"))
    return JSONResponse({"success": True})

@app.post("/api/admin/users/{user_id}/remove-admin")
async def remove_admin(user_id: str, x_auth_hash: Optional[str] = Header(None), ecosystem_id: Optional[str] = None):
    admin = get_current_user(x_auth_hash or "")
    if not admin:
        raise HTTPException(status_code=403, detail="Auth required")
    if not (is_super_admin(admin) or admin.get("is_admin")):
        raise HTTPException(status_code=403, detail="Only platform admins can demote users")
    
    if user_id == admin["id"]:
        raise HTTPException(status_code=403, detail="Cannot remove your own admin status")
    
    user_data = redis_client.get(f"user:{user_id}")
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = json.loads(str(user_data))
    user["is_admin"] = False
    redis_client.set(f"user:{user_id}", json.dumps(user))
    
    log_activity("user_demote_admin", admin["id"], {"target_user_id": user_id, "target_name": user.get("displayName")}, admin.get("displayName"))
    return JSONResponse({"success": True})

@app.get("/api/admin/stats")
async def get_admin_stats(x_auth_hash: Optional[str] = Header(None), ecosystem_id: Optional[str] = None):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=403, detail="Auth required")
    eco_filter = ecosystem_id or DEVONE_ECOSYSTEM_ID
    require_admin_for_ecosystem(user, eco_filter)
    
    is_super = is_super_admin(user) or user.get("is_admin")
    
    if is_super:
        user_keys = redis_client.keys("user:*")
        user_count = 0
        for k in user_keys:
            key = str(k)
            if ":" in key.split("user:")[1]:
                continue
            user_count += 1
    else:
        user_count = redis_client.scard(f"ecosystem:members:{eco_filter}")
    
    post_count = redis_client.zcard("feed:global")
    
    eco_groups = redis_client.zcard(f"ecosystem:groups:{eco_filter}")
    
    pending_count = 0
    pending_ids = redis_client.zrange("groups:pending", 0, -1)
    for gid in pending_ids:
        gdata = redis_client.get(f"group:{gid}")
        if gdata:
            g = json.loads(str(gdata))
            if g.get("ecosystem_id", DEVONE_ECOSYSTEM_ID) == eco_filter:
                pending_count += 1
    
    eco_members = redis_client.scard(f"ecosystem:members:{eco_filter}")
    
    return JSONResponse({
        "users": user_count,
        "posts": post_count,
        "groups": eco_groups,
        "pending_groups": pending_count,
        "ecosystem_id": eco_filter,
        "ecosystem_members": eco_members,
        "admin_role": "super_admin" if is_super else "ecosystem_admin"
    })

@app.get("/api/admin/activity")
async def get_activity_log(
    x_auth_hash: Optional[str] = Header(None),
    ecosystem_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=403, detail="Auth required")
    require_admin_for_ecosystem(user, ecosystem_id or DEVONE_ECOSYSTEM_ID)
    
    log_length = redis_client.llen("activity:log")
    entries_raw = redis_client.lrange("activity:log", offset, offset + limit - 1)
    entries = [json.loads(str(e)) for e in entries_raw]
    
    counts = redis_client.hgetall("activity:counts")
    
    return JSONResponse({
        "total": log_length,
        "entries": entries,
        "counts": counts
    })

@app.get("/api/admin/activity/summary")
async def get_activity_summary(x_auth_hash: Optional[str] = Header(None), ecosystem_id: Optional[str] = None):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=403, detail="Auth required")
    require_admin_for_ecosystem(user, ecosystem_id or DEVONE_ECOSYSTEM_ID)
    
    counts = redis_client.hgetall("activity:counts")
    total = redis_client.llen("activity:log")
    hourly = redis_client.hgetall("activity:hourly")
    
    # Get today's activity
    today = datetime.utcnow().strftime("%Y-%m-%d")
    today_counts = redis_client.hgetall(f"activity:daily:{today}")
    today_total = sum(int(v) for v in today_counts.values()) if today_counts else 0
    
    # Get most active users
    active_user_ids = redis_client.zrevrange("activity:users", 0, 4, withscores=True)
    top_users = []
    for uid, score in active_user_ids:
        user_data = redis_client.get(f"user:{uid}")
        if user_data:
            try:
                u = json.loads(str(user_data))
                top_users.append({
                    "id": uid,
                    "name": u.get("displayName", "Unknown"),
                    "avatar": u.get("avatar", ""),
                    "last_active": datetime.fromtimestamp(score).isoformat()
                })
            except:
                pass
    
    # Recent with full data - look up names for old entries
    recent = redis_client.lrange("activity:log", -30, -1)
    recent_entries = []
    for e in recent:
        try:
            entry = json.loads(str(e))
            # Look up user name if missing
            if not entry.get("user_name") or entry.get("user_name") == "Unknown":
                user_data = redis_client.get(f"user:{entry.get('user_id', '')}")
                if user_data:
                    try:
                        u = json.loads(str(user_data))
                        entry["user_name"] = u.get("displayName", "Unknown")
                    except:
                        pass
            recent_entries.append(entry)
        except:
            pass
    
    # Calculate peak hour
    peak_hour = max(hourly.items(), key=lambda x: int(x[1]))[0] if hourly else "N/A"
    
    return JSONResponse({
        "total_events": total,
        "today_events": today_total,
        "action_counts": counts,
        "today_counts": today_counts,
        "hourly_distribution": hourly,
        "peak_hour": peak_hour,
        "top_users": top_users,
        "recent": list(reversed(recent_entries))
    })

@app.get("/api/admin/groups/pending")
async def get_pending_groups(x_auth_hash: Optional[str] = Header(None), ecosystem_id: Optional[str] = None):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=403, detail="Auth required")
    eco_filter = ecosystem_id or DEVONE_ECOSYSTEM_ID
    require_admin_for_ecosystem(user, eco_filter)
    
    group_ids = redis_client.zrevrange("groups:pending", 0, 49)
    groups = []
    
    for gid in list(group_ids):
        group_data = redis_client.get(f"group:{gid}")
        if group_data:
            group = json.loads(str(group_data))
            if group.get("ecosystem_id", DEVONE_ECOSYSTEM_ID) == eco_filter:
                groups.append(group)
    
    return JSONResponse(groups)

@app.post("/api/admin/groups/{group_id}/approve")
async def approve_group(group_id: str, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=403, detail="Auth required")
    
    group_data = redis_client.get(f"group:{group_id}")
    if not group_data:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group = json.loads(str(group_data))
    eco_id = group.get("ecosystem_id", DEVONE_ECOSYSTEM_ID)
    require_admin_for_ecosystem(user, eco_id)
    
    group["status"] = "approved"
    
    ts = datetime.utcnow().timestamp()
    pipeline = redis_client.pipeline()
    pipeline.set(f"group:{group_id}", json.dumps(group))
    pipeline.zrem("groups:pending", group_id)
    pipeline.zadd("groups:approved", {group_id: ts})
    pipeline.zadd(f"ecosystem:groups:{eco_id}", {group_id: ts})
    pipeline.execute()
    
    return JSONResponse({"approved": True, "group": group})

@app.post("/api/admin/groups/{group_id}/reject")
async def reject_group(group_id: str, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=403, detail="Auth required")
    
    group_data = redis_client.get(f"group:{group_id}")
    if not group_data:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group = json.loads(str(group_data))
    eco_id = group.get("ecosystem_id", DEVONE_ECOSYSTEM_ID)
    require_admin_for_ecosystem(user, eco_id)
    
    pipeline = redis_client.pipeline()
    pipeline.zrem("groups:pending", group_id)
    pipeline.zrem(f"ecosystem:groups:{eco_id}", group_id)
    pipeline.delete(f"group:{group_id}")
    pipeline.delete(f"group:slug:{group['slug']}")
    pipeline.execute()
    
    return JSONResponse({"rejected": True})

@app.get("/api/admin/bots/applications")
async def get_bot_applications(x_auth_hash: Optional[str] = Header(None), ecosystem_id: Optional[str] = None):
    """Get pending bot applications"""
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=403, detail="Auth required")
    require_admin_for_ecosystem(user, ecosystem_id or DEVONE_ECOSYSTEM_ID)
    
    app_ids = redis_client.zrevrange("bot:applications:pending", 0, 100)
    applications = []
    
    for bot_id in app_ids:
        app_data = redis_client.get(f"bot:application:{bot_id}")
        if app_data:
            applications.append(json.loads(str(app_data)))
    
    return JSONResponse(applications)

@app.post("/api/admin/bots/{bot_id}/approve")
async def approve_bot(bot_id: str, request: Request, x_auth_hash: Optional[str] = Header(None), ecosystem_id: Optional[str] = None):
    """Approve a bot application - super admin only"""
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=403, detail="Auth required")
    if not (is_super_admin(user) or user.get("is_admin")):
        raise HTTPException(status_code=403, detail="Only platform admins can approve bots")
    
    data = await request.json()
    approved_caps = data.get("capabilities", [])
    
    bot_data = redis_client.get(f"user:{bot_id}")
    if not bot_data:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    bot = json.loads(str(bot_data))
    if not bot.get("is_bot"):
        raise HTTPException(status_code=400, detail="Not a bot")
    
    bot["bot_data"]["capabilities_granted_global"] = approved_caps
    bot["bot_data"]["status"] = "approved"
    bot["bot_data"]["approved_by"] = user["id"]
    bot["bot_data"]["approved_at"] = datetime.utcnow().isoformat()
    
    pipeline = redis_client.pipeline()
    pipeline.set(f"user:{bot_id}", json.dumps(bot))
    pipeline.delete(f"bot:application:{bot_id}")
    pipeline.zrem("bot:applications:pending", bot_id)
    pipeline.execute()
    
    operator_id = bot.get("bot_data", {}).get("operator_id")
    if operator_id:
        create_notification(operator_id, "bot_approved", {
            "bot_name": bot.get("displayName"),
            "capabilities": approved_caps
        })
    
    return JSONResponse({"approved": True, "capabilities": approved_caps})

@app.post("/api/admin/bots/{bot_id}/reject")
async def reject_bot(bot_id: str, request: Request, x_auth_hash: Optional[str] = Header(None), ecosystem_id: Optional[str] = None):
    """Reject a bot application - super admin only"""
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=403, detail="Auth required")
    if not (is_super_admin(user) or user.get("is_admin")):
        raise HTTPException(status_code=403, detail="Only platform admins can reject bots")
    
    data = await request.json()
    reason = data.get("reason", "Application rejected")
    
    bot_data = redis_client.get(f"user:{bot_id}")
    if not bot_data:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    bot = json.loads(str(bot_data))
    
    pipeline = redis_client.pipeline()
    pipeline.delete(f"bot:application:{bot_id}")
    pipeline.zrem("bot:applications:pending", bot_id)
    pipeline.execute()
    
    operator_id = bot.get("bot_data", {}).get("operator_id")
    if operator_id:
        create_notification(operator_id, "bot_rejected", {
            "bot_name": bot.get("displayName"),
            "reason": reason
        })
    
    return JSONResponse({"rejected": True})

@app.post("/api/admin/bots/{bot_id}/revoke")
async def revoke_bot(bot_id: str, request: Request, x_auth_hash: Optional[str] = Header(None), ecosystem_id: Optional[str] = None):
    """Revoke a bot's capabilities - super admin only"""
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=403, detail="Auth required")
    if not (is_super_admin(user) or user.get("is_admin")):
        raise HTTPException(status_code=403, detail="Only platform admins can revoke bots")
    
    data = await request.json()
    reason = data.get("reason", "Capabilities revoked")
    
    bot_data = redis_client.get(f"user:{bot_id}")
    if not bot_data:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    bot = json.loads(str(bot_data))
    if not bot.get("is_bot"):
        raise HTTPException(status_code=400, detail="Not a bot")
    
    bot["bot_data"]["capabilities_granted_global"] = []
    bot["bot_data"]["status"] = "revoked"
    bot["bot_data"]["revoked_by"] = user["id"]
    bot["bot_data"]["revoked_at"] = datetime.utcnow().isoformat()
    bot["bot_data"]["revoked_reason"] = reason
    
    redis_client.set(f"user:{bot_id}", json.dumps(bot))
    
    operator_id = bot.get("bot_data", {}).get("operator_id")
    if operator_id:
        create_notification(operator_id, "bot_revoked", {
            "bot_name": bot.get("displayName"),
            "reason": reason
        })
    
    return JSONResponse({"revoked": True})

@app.get("/api/admin/bots")
async def list_all_bots(x_auth_hash: Optional[str] = Header(None), ecosystem_id: Optional[str] = None):
    """List all bots in the system"""
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=403, detail="Auth required")
    eco_filter = ecosystem_id or DEVONE_ECOSYSTEM_ID
    require_admin_for_ecosystem(user, eco_filter)
    
    bots = []
    cursor = 0
    while True:
        cursor, keys = redis_client.scan(cursor, match="user:*", count=100)
        for key in keys:
            if ":" in key.replace("user:", ""):
                continue
            user_data = redis_client.get(key)
            if user_data:
                u = json.loads(str(user_data))
                if u.get("is_bot"):
                    bot_id = u["id"]
                    eco_banned = redis_client.sismember(f"ecosystem:bot_bans:{eco_filter}", bot_id)
                    bots.append({
                        "id": bot_id,
                        "displayName": u.get("displayName"),
                        "status": u.get("bot_data", {}).get("status"),
                        "operator_id": u.get("bot_data", {}).get("operator_id"),
                        "capabilities_granted": u.get("bot_data", {}).get("capabilities_granted_global", []),
                        "created_at": u.get("createdAt"),
                        "eco_banned": bool(eco_banned)
                    })
        if cursor == 0:
            break
    
    return JSONResponse(bots)

@app.post("/api/admin/bots/{bot_id}/eco-ban")
async def eco_ban_bot(bot_id: str, x_auth_hash: Optional[str] = Header(None), ecosystem_id: Optional[str] = None):
    """Ban a bot from an ecosystem - ecosystem admin can do this"""
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=403, detail="Auth required")
    eco_filter = ecosystem_id or DEVONE_ECOSYSTEM_ID
    require_admin_for_ecosystem(user, eco_filter)
    
    bot_data = redis_client.get(f"user:{bot_id}")
    if not bot_data:
        raise HTTPException(status_code=404, detail="Bot not found")
    bot = json.loads(str(bot_data))
    if not bot.get("is_bot"):
        raise HTTPException(status_code=400, detail="Not a bot")
    if bot_id == GEPPETTO_ID:
        raise HTTPException(status_code=403, detail="Geppetto is a core system bot and cannot be blocked")
    
    redis_client.sadd(f"ecosystem:bot_bans:{eco_filter}", bot_id)
    
    log_activity("bot_eco_ban", user["id"], {"bot_id": bot_id, "bot_name": bot.get("displayName"), "ecosystem_id": eco_filter}, user.get("displayName"))
    return JSONResponse({"success": True, "bot_id": bot_id, "ecosystem_id": eco_filter})

@app.post("/api/admin/bots/{bot_id}/eco-unban")
async def eco_unban_bot(bot_id: str, x_auth_hash: Optional[str] = Header(None), ecosystem_id: Optional[str] = None):
    """Unban a bot from an ecosystem"""
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=403, detail="Auth required")
    eco_filter = ecosystem_id or DEVONE_ECOSYSTEM_ID
    require_admin_for_ecosystem(user, eco_filter)
    
    redis_client.srem(f"ecosystem:bot_bans:{eco_filter}", bot_id)
    
    bot_data = redis_client.get(f"user:{bot_id}")
    bot_name = ""
    if bot_data:
        bot = json.loads(str(bot_data))
        bot_name = bot.get("displayName", "")
    
    log_activity("bot_eco_unban", user["id"], {"bot_id": bot_id, "bot_name": bot_name, "ecosystem_id": eco_filter}, user.get("displayName"))
    return JSONResponse({"success": True, "bot_id": bot_id, "ecosystem_id": eco_filter})

def get_group_role(group_id: str, user_id: str) -> Optional[str]:
    """Get user's role in group: owner, admin, moderator, or None"""
    role = redis_client.hget(f"group:roles:{group_id}", user_id)
    return str(role) if role else None

def has_group_permission(group_id: str, user_id: str, permission: str, user: dict = None) -> bool:
    """Check if user has specific permission in group"""
    if user and (user.get("is_superadmin") or user.get("is_admin")):
        return True
    
    role = get_group_role(group_id, user_id)
    if not role:
        return False
    
    permissions = {
        "owner": ["manage_roles", "ban", "delete_messages", "edit_group", "kick"],
        "admin": ["ban", "delete_messages", "kick", "manage_moderators"],
        "moderator": ["delete_messages", "kick"]
    }
    
    return permission in permissions.get(role, [])

@app.get("/api/groups/{group_id}/members")
async def get_group_members(group_id: str, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    group_data = redis_client.get(f"group:{group_id}")
    if not group_data:
        raise HTTPException(status_code=404, detail="Group not found")
    
    member_ids = redis_client.smembers(f"group:members:{group_id}")
    roles = redis_client.hgetall(f"group:roles:{group_id}")
    banned_ids = redis_client.smembers(f"group:banned:{group_id}")
    
    members = []
    for mid in member_ids:
        member_data = redis_client.get(f"user:{mid}")
        if member_data:
            m = json.loads(str(member_data))
            members.append({
                "id": m["id"],
                "displayName": m["displayName"],
                "avatar": m.get("avatar", ""),
                "role": str(roles.get(mid, "member")) if roles.get(mid) else "member",
                "is_banned": mid in banned_ids,
                "is_bot": m.get("is_bot", False)
            })
    
    my_role = get_group_role(group_id, user["id"])
    
    return JSONResponse({
        "members": members,
        "my_role": my_role,
        "is_superadmin": user.get("is_superadmin", False),
        "is_admin": user.get("is_admin", False)
    })

@app.get("/api/groups/{group_id}/bot-applications")
async def get_group_bot_applications(group_id: str, x_auth_hash: Optional[str] = Header(None)):
    """Get pending bot applications for a group (owner only)"""
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    group_data = redis_client.get(f"group:{group_id}")
    if not group_data:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group = json.loads(str(group_data))
    role = redis_client.hget(f"group:roles:{group_id}", user["id"])
    role_str = str(role) if role else ""
    if role_str not in ["owner", "admin"] and group.get("creator_id") != user["id"] and not (user.get("is_admin") or is_super_admin(user)):
        raise HTTPException(status_code=403, detail="Only group owner can view bot applications")
    
    bot_ids = redis_client.smembers(f"group:bot_applications:{group_id}")
    applications = []
    
    for bot_id in bot_ids:
        app_data = redis_client.get(f"bot:group_application:{bot_id}:{group_id}")
        if app_data:
            applications.append(json.loads(str(app_data)))
    
    return JSONResponse(applications)

@app.post("/api/groups/{group_id}/bot-applications/{bot_id}/approve")
async def approve_group_bot(group_id: str, bot_id: str, x_auth_hash: Optional[str] = Header(None)):
    """Approve a bot for a group (owner only)"""
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if approve_bot_for_group(bot_id, group_id, user["id"]):
        return JSONResponse({"success": True, "message": "Bot approved"})
    raise HTTPException(status_code=403, detail="Cannot approve - not group owner or bot not found")

@app.post("/api/groups/{group_id}/bot-applications/{bot_id}/reject")
async def reject_group_bot(group_id: str, bot_id: str, x_auth_hash: Optional[str] = Header(None)):
    """Reject a bot for a group (owner only)"""
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if reject_bot_for_group(bot_id, group_id, user["id"]):
        return JSONResponse({"success": True, "message": "Bot rejected"})
    raise HTTPException(status_code=403, detail="Cannot reject - not group owner or bot not found")

@app.get("/api/groups/{group_id}/approved-bots")
async def get_approved_bots(group_id: str, x_auth_hash: Optional[str] = Header(None)):
    """Get list of approved bots for a group"""
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    group_data = redis_client.get(f"group:{group_id}")
    if not group_data:
        raise HTTPException(status_code=404, detail="Group not found")
    
    all_bots = redis_client.keys("user:*")
    approved_bots = []
    skip_prefixes = ("user:name:", "user:hash:", "user:device_token:", "user:totp_pending:", "user:bot_token:")
    
    for key in all_bots:
        if any(key.startswith(p) for p in skip_prefixes):
            continue
        if key.count(":") > 1:
            continue
        try:
            bot_data = redis_client.get(key)
        except Exception:
            continue
        if bot_data:
            bot = json.loads(str(bot_data))
            if bot.get("is_bot") and group_id in bot.get("bot_data", {}).get("approved_groups", []):
                approved_bots.append({
                    "id": bot["id"],
                    "displayName": bot.get("displayName"),
                    "username": bot.get("username"),
                    "purpose": bot.get("bot_data", {}).get("purpose", "")
                })
    
    return JSONResponse(approved_bots)

@app.post("/api/groups/{group_id}/bots/{bot_id}/remove")
async def remove_bot_from_group(group_id: str, bot_id: str, x_auth_hash: Optional[str] = Header(None)):
    """Remove a bot from a group (owner only)"""
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    group_data = redis_client.get(f"group:{group_id}")
    if not group_data:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group = json.loads(str(group_data))
    role = redis_client.hget(f"group:roles:{group_id}", user["id"])
    role_str = str(role) if role else ""
    if role_str not in ["owner", "admin"] and group.get("creator_id") != user["id"] and not (user.get("is_admin") or is_super_admin(user)):
        raise HTTPException(status_code=403, detail="Only group owner can remove bots")
    
    bot_data = redis_client.get(f"user:{bot_id}")
    if not bot_data:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    bot = json.loads(str(bot_data))
    approved_groups = bot.get("bot_data", {}).get("approved_groups", [])
    if group_id in approved_groups:
        approved_groups.remove(group_id)
        bot["bot_data"]["approved_groups"] = approved_groups
        redis_client.set(f"user:{bot_id}", json.dumps(bot))
    
    return JSONResponse({"success": True, "message": "Bot removed from group"})

@app.post("/api/groups/{group_id}/roles")
async def set_member_role(group_id: str, request: Request, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    data = await request.json()
    target_user_id = data.get("user_id")
    new_role = data.get("role")
    
    if not target_user_id or new_role not in ["admin", "moderator", "member"]:
        raise HTTPException(status_code=400, detail="Invalid request")
    
    group_data = redis_client.get(f"group:{group_id}")
    if not group_data:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group = json.loads(str(group_data))
    my_role = get_group_role(group_id, user["id"])
    target_role = get_group_role(group_id, target_user_id)
    
    is_superadmin = user.get("is_superadmin", False)
    is_platform_admin = is_superadmin or user.get("is_admin", False)
    
    if target_user_id == group.get("creator_id") and not is_platform_admin:
        raise HTTPException(status_code=403, detail="Cannot change owner's role")
    
    if my_role == "owner" or is_platform_admin:
        pass
    elif my_role == "admin" and new_role in ["moderator", "member"] and target_role not in ["owner", "admin"]:
        pass
    else:
        raise HTTPException(status_code=403, detail="No permission")
    
    if new_role == "member":
        redis_client.hdel(f"group:roles:{group_id}", target_user_id)
    else:
        redis_client.hset(f"group:roles:{group_id}", target_user_id, new_role)
    
    return JSONResponse({"success": True, "role": new_role})

@app.post("/api/groups/{group_id}/ban")
async def ban_user(group_id: str, request: Request, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    data = await request.json()
    target_user_id = data.get("user_id")
    
    if not target_user_id:
        raise HTTPException(status_code=400, detail="User ID required")
    
    group_data = redis_client.get(f"group:{group_id}")
    if not group_data:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group = json.loads(str(group_data))
    
    if target_user_id == group.get("creator_id"):
        raise HTTPException(status_code=403, detail="Cannot ban group owner")
    
    if not has_group_permission(group_id, user["id"], "ban", user):
        raise HTTPException(status_code=403, detail="No permission to ban")
    
    pipeline = redis_client.pipeline()
    pipeline.sadd(f"group:banned:{group_id}", target_user_id)
    pipeline.srem(f"group:members:{group_id}", target_user_id)
    pipeline.hdel(f"group:roles:{group_id}", target_user_id)
    pipeline.execute()
    
    group["member_count"] = redis_client.scard(f"group:members:{group_id}")
    redis_client.set(f"group:{group_id}", json.dumps(group))
    
    return JSONResponse({"banned": True})

@app.post("/api/groups/{group_id}/unban")
async def unban_user(group_id: str, request: Request, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    data = await request.json()
    target_user_id = data.get("user_id")
    
    if not target_user_id:
        raise HTTPException(status_code=400, detail="User ID required")
    
    if not has_group_permission(group_id, user["id"], "ban", user):
        raise HTTPException(status_code=403, detail="No permission to unban")
    
    redis_client.srem(f"group:banned:{group_id}", target_user_id)
    
    return JSONResponse({"unbanned": True})

@app.post("/api/groups/{group_id}/kick")
async def kick_user(group_id: str, request: Request, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    data = await request.json()
    target_user_id = data.get("user_id")
    
    if not target_user_id:
        raise HTTPException(status_code=400, detail="User ID required")
    
    group_data = redis_client.get(f"group:{group_id}")
    if not group_data:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group = json.loads(str(group_data))
    
    if target_user_id == group.get("creator_id"):
        raise HTTPException(status_code=403, detail="Cannot kick group owner")
    
    if not has_group_permission(group_id, user["id"], "kick", user):
        raise HTTPException(status_code=403, detail="No permission to kick")
    
    target_role = get_group_role(group_id, target_user_id)
    my_role = get_group_role(group_id, user["id"])
    
    role_hierarchy = {"owner": 3, "admin": 2, "moderator": 1, "member": 0}
    if role_hierarchy.get(target_role, 0) >= role_hierarchy.get(my_role, 0) and not (user.get("is_superadmin") or user.get("is_admin")):
        raise HTTPException(status_code=403, detail="Cannot kick someone with same or higher role")
    
    pipeline = redis_client.pipeline()
    pipeline.srem(f"group:members:{group_id}", target_user_id)
    pipeline.hdel(f"group:roles:{group_id}", target_user_id)
    pipeline.execute()
    
    group["member_count"] = redis_client.scard(f"group:members:{group_id}")
    redis_client.set(f"group:{group_id}", json.dumps(group))
    
    return JSONResponse({"kicked": True})

@app.delete("/api/groups/{group_id}/messages/{message_id}")
async def delete_group_message(group_id: str, message_id: str, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    msg_data = redis_client.get(f"message:{message_id}")
    if not msg_data:
        raise HTTPException(status_code=404, detail="Message not found")
    
    msg = json.loads(str(msg_data))
    
    is_owner = msg.get("user_id") == user["id"]
    can_delete = has_group_permission(group_id, user["id"], "delete_messages", user)
    
    if not is_owner and not can_delete:
        raise HTTPException(status_code=403, detail="No permission to delete")
    
    redis_client.lrem(f"group:messages:{group_id}", 1, message_id)
    redis_client.delete(f"message:{message_id}")
    
    asyncio.create_task(ws_manager.broadcast({
        "type": "delete_message",
        "message_id": message_id
    }, f"group:{group_id}"))
    
    return JSONResponse({"deleted": True})

def evaluate_talent(step: int, answer: str) -> Optional[str]:
    if not isinstance(answer, str):
        return None
        
    talent_map = {
        1: {
            "vs code": "Builder DNA 💻",
            "prototype": "Builder DNA 💻",
            "building": "Builder DNA 💻",
            "value prop": "Startup Brain 📝",
            "target market": "Startup Brain 📝",
            "write down": "Startup Brain 📝",
            "search": "Strategic Thinker 🔍",
            "already built": "Strategic Thinker 🔍",
            "someone": "Strategic Thinker 🔍"
        },
        2: {
            "ship it": "Ship-First Founder 🚀",
            "users first": "Ship-First Founder 🚀",
            "refactor later": "Ship-First Founder 🚀",
            "clean": "Craftsperson 🧹",
            "before anyone": "Craftsperson 🧹",
            "codebase": "Craftsperson 🧹",
            "5 users": "Parallel Operator ⚡",
            "test it": "Parallel Operator ⚡",
            "parallel": "Parallel Operator ⚡"
        },
        3: {
            "data": "Data-Driven Leader 📊",
            "numbers": "Data-Driven Leader 📊",
            "let numbers": "Data-Driven Leader 📊",
            "prototype": "Experimenter 🧪",
            "a/b test": "Experimenter 🧪",
            "both ideas": "Experimenter 🧪",
            "conversation": "People-First Leader 🤝",
            "vision": "People-First Leader 🤝",
            "align": "People-First Leader 🤝"
        },
        4: {
            "talk to": "Customer Obsessed 🎯",
            "every single": "Customer Obsessed 🎯",
            "understand": "Customer Obsessed 🎯",
            "build the": "Execution Machine 🏗️",
            "features": "Execution Machine 🏗️",
            "asap": "Execution Machine 🏗️",
            "launch thread": "Growth Mind 📣",
            "building in public": "Growth Mind 📣",
            "write a": "Growth Mind 📣"
        },
        5: {
            "ship a full": "Full-Stack Founder 🛠️",
            "solo": "Full-Stack Founder 🛠️",
            "design to deploy": "Full-Stack Founder 🛠️",
            "understand users": "Product Thinker 🧠",
            "better than": "Product Thinker 🧠",
            "engineers": "Product Thinker 🧠",
            "excited": "Hype Builder 🔥",
            "people": "Hype Builder 🔥",
            "anything": "Hype Builder 🔥"
        },
    }
    
    if step in talent_map:
        answer_lower = answer.lower()
        for keyword, talent in talent_map[step].items():
            if keyword in answer_lower:
                return talent
    return None

# ============== DIRECT MESSAGES ==============

def get_dm_conversation_id(user1_id: str, user2_id: str) -> str:
    """Generate consistent conversation ID for two users"""
    ids = sorted([user1_id, user2_id])
    return f"dm:{ids[0]}:{ids[1]}"

@app.get("/api/dm/conversations")
async def get_dm_conversations(x_auth_hash: Optional[str] = Header(None)):
    """Get all DM conversations for current user"""
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    conversation_ids = redis_client.smembers(f"user:dm_conversations:{user['id']}")
    conversations = []
    
    for conv_id in conversation_ids:
        conv_data = redis_client.get(f"dm:conversation:{conv_id}")
        if conv_data:
            conv = json.loads(str(conv_data))
            # Get the other user's info
            other_id = conv["user1_id"] if conv["user2_id"] == user["id"] else conv["user2_id"]
            other_data = redis_client.get(f"user:{other_id}")
            if other_data:
                other = json.loads(str(other_data))
                conv["other_user"] = {
                    "id": other_id,
                    "displayName": other.get("displayName", "Unknown"),
                    "avatar": other.get("avatar", ""),
                    "field": other.get("field", "")
                }
                # Get last message
                last_msg = redis_client.lindex(f"dm:messages:{conv_id}", -1)
                if last_msg:
                    conv["last_message"] = json.loads(str(last_msg))
                conversations.append(conv)
    
    # Sort by last activity
    conversations.sort(key=lambda c: c.get("last_activity", ""), reverse=True)
    return JSONResponse(conversations)

@app.post("/api/dm/start/{user_id}")
async def start_dm_conversation(user_id: str, x_auth_hash: Optional[str] = Header(None)):
    """Start or get existing DM conversation with a user"""
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    
    # Check if other user exists
    other_data = redis_client.get(f"user:{user_id}")
    if not other_data:
        raise HTTPException(status_code=404, detail="User not found")
    other = json.loads(str(other_data))
    
    conv_id = get_dm_conversation_id(user["id"], user_id)
    
    # Check if conversation exists
    existing = redis_client.get(f"dm:conversation:{conv_id}")
    if existing:
        conv = json.loads(str(existing))
        conv["other_user"] = {
            "id": user_id,
            "displayName": other.get("displayName", "Unknown"),
            "avatar": other.get("avatar", ""),
            "field": other.get("field", "")
        }
        return JSONResponse(conv)
    
    # Create new conversation
    now = datetime.utcnow().isoformat()
    conv = {
        "id": conv_id,
        "user1_id": user["id"],
        "user2_id": user_id,
        "created_at": now,
        "last_activity": now
    }
    
    pipeline = redis_client.pipeline()
    pipeline.set(f"dm:conversation:{conv_id}", json.dumps(conv))
    pipeline.sadd(f"user:dm_conversations:{user['id']}", conv_id)
    pipeline.sadd(f"user:dm_conversations:{user_id}", conv_id)
    pipeline.execute()
    
    welcome_msg = None
    if hasattr(app.state, "system_bots_module"):
        _sb = app.state.system_bots_module
        if _sb.is_system_bot(user_id):
            welcome_msg = _sb.get_welcome_message(user_id, conv_id)
    
    conv["other_user"] = {
        "id": user_id,
        "displayName": other.get("displayName", "Unknown"),
        "avatar": other.get("avatar", ""),
        "field": other.get("field", "")
    }
    if welcome_msg:
        conv["welcome_message"] = welcome_msg
    
    return JSONResponse(conv)

def mask_expired_tokens(message: dict) -> dict:
    """Mask bot tokens in messages older than 1 hour"""
    import re
    content = message.get("content", "")
    created_at = message.get("created_at", "")
    
    if "dvn_bot_" not in content:
        return message
    
    try:
        msg_time = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        now = datetime.utcnow().replace(tzinfo=msg_time.tzinfo) if msg_time.tzinfo else datetime.utcnow()
        age_seconds = (now - msg_time.replace(tzinfo=None)).total_seconds()
        
        if age_seconds > 3600:
            masked_content = re.sub(
                r'dvn_bot_[a-f0-9]{64}',
                '[TOKEN EXPIRED - use /token botname to regenerate]',
                content
            )
            message = message.copy()
            message["content"] = masked_content
    except:
        pass
    
    return message

@app.get("/api/dm/{conv_id}/messages")
async def get_dm_messages(conv_id: str, x_auth_hash: Optional[str] = Header(None)):
    """Get messages in a DM conversation"""
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Verify user is part of this conversation
    conv_data = redis_client.get(f"dm:conversation:{conv_id}")
    if not conv_data:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conv = json.loads(str(conv_data))
    if user["id"] not in [conv["user1_id"], conv["user2_id"]]:
        raise HTTPException(status_code=403, detail="Not your conversation")
    
    messages = redis_client.lrange(f"dm:messages:{conv_id}", -100, -1)
    parsed = [mask_expired_tokens(json.loads(str(m))) for m in messages]
    return JSONResponse(parsed)

@app.post("/api/dm/{conv_id}/messages")
async def send_dm_message(conv_id: str, request: Request, x_auth_hash: Optional[str] = Header(None)):
    """Send a message in a DM conversation"""
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Verify user is part of this conversation
    conv_data = redis_client.get(f"dm:conversation:{conv_id}")
    if not conv_data:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conv = json.loads(str(conv_data))
    if user["id"] not in [conv["user1_id"], conv["user2_id"]]:
        raise HTTPException(status_code=403, detail="Not your conversation")
    
    data = await request.json()
    content = data.get("content", "").strip()
    image_url = data.get("image_url", "")
    
    if not content and not image_url:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    now = datetime.utcnow().isoformat()
    message = {
        "id": str(uuid.uuid4()),
        "conv_id": conv_id,
        "user_id": user["id"],
        "user_name": user.get("displayName", "Unknown"),
        "user_avatar": user.get("avatar", ""),
        "content": content,
        "image_url": image_url,
        "created_at": now
    }
    
    # Update conversation and add message
    conv["last_activity"] = now
    pipeline = redis_client.pipeline()
    pipeline.set(f"dm:conversation:{conv_id}", json.dumps(conv))
    pipeline.rpush(f"dm:messages:{conv_id}", json.dumps(message))
    pipeline.execute()
    
    # Create notification for recipient
    other_id = conv["user2_id"] if conv["user1_id"] == user["id"] else conv["user1_id"]
    
    if other_id == GEPPETTO_ID:
        reply = handle_geppetto_command(user, conv_id, content)
        log_activity("dm_send", user["id"], {"to_user": other_id, "content_preview": content[:30]}, user.get("displayName"))
        return JSONResponse({"user_message": message, "bot_reply": reply})
    
    if hasattr(app.state, "system_bots_module"):
        _sb = app.state.system_bots_module
        if _sb.is_system_bot(other_id):
            async def _system_bot_dm_reply():
                try:
                    result = await _sb.handle_system_bot_dm(
                        user_id=user["id"],
                        user_name=user.get("displayName", "Someone"),
                        bot_user_id=other_id,
                        conv_id=conv_id,
                        content=content,
                        push_fn=lambda msg: push_dm_to_user(user["id"], msg),
                    )
                    if result:
                        await push_dm_to_user(user["id"], result)
                        print(f"[SystemBot DM] Reply sent from {other_id[:8]}… to {user['id'][:8]}…")
                    else:
                        print(f"[SystemBot DM] No reply generated for {other_id[:8]}…")
                except Exception as e:
                    import traceback
                    print(f"[SystemBot DM] Error: {e}")
                    traceback.print_exc()
            asyncio.create_task(_system_bot_dm_reply())
            log_activity("dm_send", user["id"], {"to_user": other_id, "content_preview": content[:30]}, user.get("displayName"))
            return JSONResponse(message)
    
    other_user_data = redis_client.get(f"user:{other_id}")
    if other_user_data:
        other_user = json.loads(str(other_user_data))
        if other_user.get("is_bot"):
            await push_dm_to_bot(other_id, message)
        else:
            # Push to regular user's WebSocket for real-time update
            asyncio.create_task(push_dm_to_user(other_id, message))
    
    create_notification(other_id, "dm", {
        "from_user": user.get("displayName", "Someone"),
        "from_id": user["id"],
        "preview": content[:50] if content else "[Image]",
        "image_url": image_url if image_url else None
    })
    
    log_activity("dm_send", user["id"], {"to_user": other_id, "content_preview": content[:30]}, user.get("displayName"))
    
    return JSONResponse(message)

@app.post("/api/dm/{conv_id}/messages/{message_id}/reactions")
async def toggle_dm_reaction(conv_id: str, message_id: str, request: Request, x_auth_hash: Optional[str] = Header(None)):
    """Toggle emoji reaction on a DM message"""
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    conv_data = redis_client.get(f"dm:conversation:{conv_id}")
    if not conv_data:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv = json.loads(str(conv_data))
    if user["id"] not in [conv.get("user1_id"), conv.get("user2_id")]:
        raise HTTPException(status_code=403, detail="Not a participant")
    
    data = await request.json()
    emoji_codepoint = data.get("emoji", "")
    emoji_pack = data.get("pack", "twemoji")
    if not emoji_codepoint:
        raise HTTPException(status_code=400, detail="Missing emoji")
    
    reaction_key = f"reactions:dm:{conv_id}:{message_id}"
    user_reaction_key = f"user:reactions:{user['id']}:dm:{message_id}"
    field = f"{emoji_pack}:{emoji_codepoint}"
    
    existing = redis_client.hget(reaction_key, field)
    current_users = json.loads(existing) if existing else []
    
    if user["id"] in current_users:
        current_users.remove(user["id"])
        action = "removed"
    else:
        current_users.append(user["id"])
        action = "added"
    
    pipeline = redis_client.pipeline()
    if current_users:
        pipeline.hset(reaction_key, field, json.dumps(current_users))
    else:
        pipeline.hdel(reaction_key, field)
    if action == "added":
        pipeline.sadd(user_reaction_key, field)
    else:
        pipeline.srem(user_reaction_key, field)
    pipeline.execute()
    
    reactions = get_reactions_dict(reaction_key)
    
    other_id = conv["user2_id"] if conv["user1_id"] == user["id"] else conv["user1_id"]
    asyncio.create_task(push_dm_to_user(other_id, {
        "type": "dm_reaction_update",
        "conv_id": conv_id,
        "message_id": message_id,
        "reactions": reactions
    }))
    asyncio.create_task(push_dm_to_user(user["id"], {
        "type": "dm_reaction_update",
        "conv_id": conv_id,
        "message_id": message_id,
        "reactions": reactions
    }))
    
    return JSONResponse({"reactions": reactions, "action": action})

@app.get("/api/dm/{conv_id}/messages/{message_id}/reactions")
async def get_dm_reactions(conv_id: str, message_id: str, x_auth_hash: Optional[str] = Header(None)):
    """Get reactions for a DM message"""
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    reactions = get_reactions_dict(f"reactions:dm:{conv_id}:{message_id}")
    return JSONResponse({"reactions": reactions})

@app.get("/api/gifs")
async def search_gifs(q: str = "", page: int = 1, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    klipy_key = os.environ.get("KLIPY_API_KEY", "")
    if not klipy_key:
        raise HTTPException(status_code=500, detail="GIF service not configured")
    
    customer_id = user.get("id", "anonymous")
    per_page = 24
    
    if q.strip():
        url = f"https://api.klipy.com/api/v1/{klipy_key}/gifs/search?page={page}&per_page={per_page}&q={q}&customer_id={customer_id}"
    else:
        url = f"https://api.klipy.com/api/v1/{klipy_key}/gifs/trending?page={page}&per_page={per_page}&customer_id={customer_id}"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
        
        gifs = []
        items = data.get("data", {}).get("data", [])
        for item in items:
            f = item.get("file", {})
            sd = f.get("sd", {}).get("gif", {})
            hd = f.get("hd", {}).get("gif", {})
            sd_webp = f.get("sd", {}).get("webp", {})
            hd_webp = f.get("hd", {}).get("webp", {})
            hd_url = hd.get("url", "") or hd_webp.get("url", "")
            preview = sd.get("url", "") or sd_webp.get("url", "") or hd_url
            if not hd_url and not preview:
                continue
            gifs.append({
                "id": item.get("id", ""),
                "title": item.get("title", ""),
                "preview_url": preview,
                "url": hd_url or preview,
                "width": hd.get("width", 0) or sd.get("width", 0),
                "height": hd.get("height", 0) or sd.get("height", 0),
            })
        return JSONResponse(gifs)
    except Exception as e:
        print(f"[GIF API Error] {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch GIFs")

@app.get("/api/bots/docs")
async def bot_docs():
    """Bot API Documentation - Gamified!"""
    docs_html = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DevNetwork Bot API - Level Up Your Bot!</title>
    <link rel="icon" href="/static/favicon.png" type="image/png">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #09090b 0%, #1a1a2e 50%, #09090b 100%); color: #fafafa; line-height: 1.7; min-height: 100vh; }
        .container { max-width: 1000px; margin: 0 auto; padding: 40px 20px; }
        
        .hero { text-align: center; padding: 60px 20px; position: relative; overflow: hidden; }
        .hero::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%); }
        .hero h1 { font-size: 3.5rem; margin-bottom: 15px; background: linear-gradient(135deg, #10b981, #3b82f6, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: glow 3s ease-in-out infinite; position: relative; }
        @keyframes glow { 0%, 100% { filter: drop-shadow(0 0 20px rgba(16, 185, 129, 0.3)); } 50% { filter: drop-shadow(0 0 40px rgba(59, 130, 246, 0.5)); } }
        .hero .tagline { font-size: 1.3rem; color: #a1a1aa; margin-bottom: 30px; }
        .hero .stats { display: flex; justify-content: center; gap: 40px; flex-wrap: wrap; }
        .stat { text-align: center; }
        .stat-value { font-size: 2rem; font-weight: bold; color: #10b981; }
        .stat-label { font-size: 0.9rem; color: #71717a; }
        
        .quest-card { background: linear-gradient(135deg, #18181b, #1f1f23); border: 2px solid #27272a; border-radius: 16px; padding: 30px; margin: 30px 0; position: relative; overflow: hidden; }
        .quest-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #10b981, #3b82f6, #a855f7); }
        .quest-card h2 { font-size: 1.8rem; margin-bottom: 20px; display: flex; align-items: center; gap: 12px; }
        .quest-card h2 .icon { font-size: 1.5rem; }
        
        .xp-badge { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #10b98120, #10b98110); border: 1px solid #10b98140; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; color: #10b981; font-weight: 600; }
        .xp-badge::before { content: '⚡'; }
        
        .level-track { background: #27272a; border-radius: 12px; padding: 25px; margin: 25px 0; }
        .level-track h3 { color: #fafafa; margin-bottom: 15px; font-size: 1.2rem; }
        .levels { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; }
        .level { background: #18181b; border: 2px solid #3f3f46; border-radius: 12px; padding: 20px; text-align: center; transition: all 0.3s; }
        .level:hover { border-color: #10b981; transform: translateY(-3px); box-shadow: 0 10px 30px rgba(16, 185, 129, 0.2); }
        .level-num { font-size: 2rem; font-weight: bold; background: linear-gradient(135deg, #10b981, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .level-name { color: #a1a1aa; font-size: 0.9rem; margin: 5px 0; }
        .level-req { font-size: 0.8rem; color: #71717a; }
        
        .capability-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin: 20px 0; }
        .capability { background: #18181b; border: 2px solid #27272a; border-radius: 12px; padding: 25px; transition: all 0.3s; }
        .capability:hover { border-color: #3b82f6; }
        .capability-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .capability-icon { width: 45px; height: 45px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
        .cap-post .capability-icon { background: linear-gradient(135deg, #10b981, #059669); }
        .cap-comment .capability-icon { background: linear-gradient(135deg, #3b82f6, #2563eb); }
        .cap-group .capability-icon { background: linear-gradient(135deg, #a855f7, #7c3aed); }
        .cap-dm .capability-icon { background: linear-gradient(135deg, #f97316, #ea580c); }
        .cap-react .capability-icon { background: linear-gradient(135deg, #ec4899, #db2777); }
        .capability-name { font-weight: 700; font-size: 1.1rem; }
        .capability-desc { color: #a1a1aa; font-size: 0.95rem; }
        .capability-power { margin-top: 12px; padding-top: 12px; border-top: 1px solid #27272a; font-size: 0.85rem; color: #71717a; }
        .capability-power code { background: #27272a; padding: 2px 6px; border-radius: 4px; color: #10b981; font-size: 0.8rem; }
        
        .endpoint { background: #18181b; border: 1px solid #27272a; border-radius: 12px; margin: 15px 0; overflow: hidden; transition: all 0.3s; }
        .endpoint:hover { border-color: #3f3f46; }
        .endpoint-header { display: flex; align-items: center; gap: 12px; padding: 18px 20px; border-bottom: 1px solid #27272a; }
        .method { padding: 6px 14px; border-radius: 6px; font-weight: 700; font-size: 0.8rem; letter-spacing: 0.5px; }
        .get { background: #10b98120; color: #10b981; }
        .post { background: #3b82f620; color: #3b82f6; }
        .path { font-family: 'JetBrains Mono', 'Fira Code', monospace; color: #fafafa; font-size: 0.95rem; }
        .endpoint-body { padding: 20px; }
        .endpoint-desc { color: #a1a1aa; margin-bottom: 12px; }
        .endpoint-caps { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
        .cap-tag { background: #27272a; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; color: #a1a1aa; }
        .cap-tag.required { background: #7c3aed20; color: #a855f7; border: 1px solid #7c3aed40; }
        pre { background: #0d0d0f; padding: 18px; border-radius: 8px; overflow-x: auto; font-size: 0.9rem; border: 1px solid #27272a; }
        code { font-family: 'JetBrains Mono', 'Fira Code', monospace; color: #10b981; }
        
        .achievement-row { display: flex; gap: 15px; flex-wrap: wrap; margin: 25px 0; justify-content: center; }
        .achievement { display: flex; align-items: center; gap: 10px; background: linear-gradient(135deg, #27272a, #1f1f23); border: 2px solid #3f3f46; border-radius: 50px; padding: 10px 20px; transition: all 0.3s; }
        .achievement:hover { border-color: #f59e0b; transform: scale(1.05); }
        .achievement-icon { font-size: 1.5rem; }
        .achievement-info { text-align: left; }
        .achievement-name { font-weight: 600; font-size: 0.9rem; color: #fafafa; }
        .achievement-desc { font-size: 0.75rem; color: #71717a; }
        
        .ws-demo { background: #0d0d0f; border-radius: 12px; padding: 25px; margin: 20px 0; border: 1px solid #27272a; }
        .ws-demo h3 { color: #a855f7; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; }
        .ws-step { display: flex; gap: 15px; margin: 15px 0; align-items: flex-start; }
        .ws-step-num { width: 30px; height: 30px; background: linear-gradient(135deg, #a855f7, #7c3aed); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem; flex-shrink: 0; }
        .ws-step-content { flex: 1; }
        .ws-step-label { font-weight: 600; margin-bottom: 8px; }
        
        .sdk-section { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 25px; margin: 25px 0; }
        .sdk-card { background: #18181b; border: 2px solid #27272a; border-radius: 16px; overflow: hidden; transition: all 0.3s; }
        .sdk-card:hover { border-color: #10b981; }
        .sdk-header { padding: 20px; border-bottom: 1px solid #27272a; display: flex; align-items: center; gap: 15px; }
        .sdk-logo { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; }
        .sdk-python .sdk-logo { background: linear-gradient(135deg, #3776ab, #ffd43b); }
        .sdk-node .sdk-logo { background: linear-gradient(135deg, #339933, #68a063); }
        .sdk-name { font-size: 1.3rem; font-weight: 700; }
        .sdk-body { padding: 20px; }
        .sdk-install { background: #0d0d0f; border-radius: 8px; padding: 12px 15px; margin-bottom: 15px; font-family: monospace; color: #10b981; }
        
        .tips { background: linear-gradient(135deg, #10b98110, #10b98105); border: 1px solid #10b98130; border-radius: 12px; padding: 25px; margin: 30px 0; }
        .tips h3 { color: #10b981; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; }
        .tip { display: flex; gap: 12px; margin: 12px 0; align-items: flex-start; }
        .tip-icon { color: #10b981; font-size: 1.2rem; }
        .tip-text { color: #a1a1aa; }
        
        .footer { text-align: center; padding: 40px 20px; color: #52525b; font-size: 0.9rem; }
        .footer a { color: #10b981; text-decoration: none; }
        
        @media (max-width: 600px) {
            .hero h1 { font-size: 2.2rem; }
            .sdk-section { grid-template-columns: 1fr; }
            .capability-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="hero">
            <img src="/static/logo-icon-dark.png" alt="DevNetwork" style="height: 60px; object-fit: contain; margin: 0 auto 20px; display: block; filter: drop-shadow(0 0 20px rgba(16, 185, 129, 0.3));">
            <h1>Bot API Quest</h1>
            <p class="tagline">Build legendary bots. Unlock powers. Dominate the network.</p>
            <div class="stats">
                <div class="stat"><div class="stat-value">8</div><div class="stat-label">API Endpoints</div></div>
                <div class="stat"><div class="stat-value">5</div><div class="stat-label">Powers to Unlock</div></div>
                <div class="stat"><div class="stat-value">2</div><div class="stat-label">SDK Languages</div></div>
            </div>
        </div>
        
        <div class="quest-card">
            <h2><span class="icon">🎮</span> Your Bot Journey</h2>
            <div class="level-track">
                <h3>Level Up Your Bot</h3>
                <div class="levels">
                    <div class="level">
                        <div class="level-num">1</div>
                        <div class="level-name">Spawn</div>
                        <div class="level-req">Create bot via Geppetto</div>
                    </div>
                    <div class="level">
                        <div class="level-num">2</div>
                        <div class="level-name">Activate</div>
                        <div class="level-req">Get API token</div>
                    </div>
                    <div class="level">
                        <div class="level-num">3</div>
                        <div class="level-name">Apply</div>
                        <div class="level-req">Request capabilities</div>
                    </div>
                    <div class="level">
                        <div class="level-num">4</div>
                        <div class="level-name">Approved</div>
                        <div class="level-req">Admin grants powers</div>
                    </div>
                    <div class="level">
                        <div class="level-num">5</div>
                        <div class="level-name">Legendary</div>
                        <div class="level-req">Deploy & dominate!</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="quest-card">
            <h2><span class="icon">🔐</span> Authentication <span class="xp-badge">+100 XP</span></h2>
            <p style="color: #a1a1aa; margin-bottom: 20px;">Every request needs your secret token. Guard it with your life!</p>
            <pre><code>Authorization: Bearer dvn_bot_your_super_secret_token_here</code></pre>
            <div class="tips" style="margin-top: 20px;">
                <h3>💡 Pro Tips</h3>
                <div class="tip"><span class="tip-icon">✓</span><span class="tip-text">Never commit your token to git repos</span></div>
                <div class="tip"><span class="tip-icon">✓</span><span class="tip-text">Use environment variables: <code>process.env.BOT_TOKEN</code></span></div>
                <div class="tip"><span class="tip-icon">✓</span><span class="tip-text">Regenerate tokens with <code>/token botname</code> if compromised</span></div>
            </div>
        </div>
        
        <div class="quest-card">
            <h2><span class="icon">⚔️</span> Unlock Powers <span class="xp-badge">+500 XP per power</span></h2>
            <p style="color: #a1a1aa; margin-bottom: 20px;">Request these abilities with <code>/apply botname</code> and await admin approval!</p>
            <div class="capability-grid">
                <div class="capability cap-post">
                    <div class="capability-header">
                        <div class="capability-icon">📝</div>
                        <div class="capability-name">post</div>
                    </div>
                    <div class="capability-desc">Create posts on the global feed. Share wisdom, memes, or announcements with the entire network.</div>
                    <div class="capability-power">Unlocks: <code>POST /api/bots/posts</code></div>
                </div>
                <div class="capability cap-comment">
                    <div class="capability-header">
                        <div class="capability-icon">💬</div>
                        <div class="capability-name">comment</div>
                    </div>
                    <div class="capability-desc">Comment on posts. Engage with the community, provide feedback, or just say nice things.</div>
                    <div class="capability-power">Unlocks: <code>POST /api/bots/posts/:id/comments</code></div>
                </div>
                <div class="capability cap-group">
                    <div class="capability-header">
                        <div class="capability-icon">👥</div>
                        <div class="capability-name">group_message</div>
                    </div>
                    <div class="capability-desc">Send messages in group chats. Be the life of the party or the helpful assistant everyone needs.</div>
                    <div class="capability-power">Unlocks: <code>POST /api/bots/groups/:id/messages</code></div>
                </div>
                <div class="capability cap-dm">
                    <div class="capability-header">
                        <div class="capability-icon">✉️</div>
                        <div class="capability-name">send_dm</div>
                    </div>
                    <div class="capability-desc">Send direct messages to users. Perfect for notifications, alerts, or personal touches.</div>
                    <div class="capability-power">Unlocks: <code>POST /api/bots/dm/:user_id</code></div>
                </div>
                <div class="capability cap-react">
                    <div class="capability-header">
                        <div class="capability-icon">❤️</div>
                        <div class="capability-name">react</div>
                    </div>
                    <div class="capability-desc">React to posts and messages. Show appreciation, agreement, or just spread the love.</div>
                    <div class="capability-power">Unlocks: <code>POST /api/bots/react</code> (coming soon)</div>
                </div>
            </div>
        </div>
        
        <div class="quest-card">
            <h2><span class="icon">🗡️</span> API Endpoints <span class="xp-badge">Master these!</span></h2>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/bots/me</span>
                </div>
                <div class="endpoint-body">
                    <div class="endpoint-desc">Get your bot's profile, status, and granted capabilities. Always start here!</div>
                    <pre><code>// Response
{
  "id": "bot-uuid",
  "displayName": "MyAwesomeBot",
  "bot_data": {
    "status": "approved",
    "capabilities_granted_global": ["post", "comment"]
  }
}</code></pre>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/bots/feed</span>
                </div>
                <div class="endpoint-body">
                    <div class="endpoint-desc">Read the global feed. No special powers needed - everyone can lurk!</div>
                    <div class="endpoint-caps"><span class="cap-tag">?limit=50</span><span class="cap-tag">?before=post_id</span></div>
                    <pre><code>// Returns array of posts
[{ "id": "...", "content": "Hello!", "user": {...}, "created_at": "..." }]</code></pre>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method post">POST</span>
                    <span class="path">/api/bots/posts</span>
                </div>
                <div class="endpoint-body">
                    <div class="endpoint-caps"><span class="cap-tag required">🔓 post</span></div>
                    <div class="endpoint-desc">Create a new post. Supports Markdown, @mentions, and #hashtags!</div>
                    <pre><code>// Request
{ "content": "Hello world! #firstpost", "image_url": "optional" }

// Response
{ "id": "new-post-id", "content": "...", "created_at": "..." }</code></pre>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method post">POST</span>
                    <span class="path">/api/bots/posts/{post_id}/comments</span>
                </div>
                <div class="endpoint-body">
                    <div class="endpoint-caps"><span class="cap-tag required">🔓 comment</span></div>
                    <div class="endpoint-desc">Comment on any post. Be nice, be helpful, be legendary.</div>
                    <pre><code>{ "content": "Great post! @author you're awesome 🎉" }</code></pre>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/bots/groups</span>
                </div>
                <div class="endpoint-body">
                    <div class="endpoint-caps"><span class="cap-tag required">🔓 group_message</span></div>
                    <div class="endpoint-desc">List all groups your bot has access to.</div>
                    <pre><code>[{ "id": "...", "name": "Python Devs", "slug": "pythondevs", "members": 42 }]</code></pre>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method post">POST</span>
                    <span class="path">/api/bots/groups/{group_id}/messages</span>
                </div>
                <div class="endpoint-body">
                    <div class="endpoint-caps"><span class="cap-tag required">🔓 group_message</span></div>
                    <div class="endpoint-desc">Send a message to a group. Your bot becomes the group's new best friend.</div>
                    <pre><code>{ "content": "Good morning everyone! ☀️", "image_url": "optional" }</code></pre>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method post">POST</span>
                    <span class="path">/api/bots/dm/{user_id}</span>
                </div>
                <div class="endpoint-body">
                    <div class="endpoint-caps"><span class="cap-tag required">🔓 send_dm</span></div>
                    <div class="endpoint-desc">Send a direct message. Users can opt out of bot DMs, so be respectful!</div>
                    <pre><code>{ "content": "Hey! You have a new notification 🔔" }</code></pre>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/bots/audit</span>
                </div>
                <div class="endpoint-body">
                    <div class="endpoint-desc">View your bot's action history. Great for debugging and analytics!</div>
                    <div class="endpoint-caps"><span class="cap-tag">?limit=100</span><span class="cap-tag">?action=post</span></div>
                    <pre><code>[{ "action": "post", "timestamp": "...", "data": {...} }]</code></pre>
                </div>
            </div>
        </div>
        
        <div class="quest-card">
            <h2><span class="icon">⚡</span> Real-Time WebSocket <span class="xp-badge">+1000 XP Boss Level</span></h2>
            <p style="color: #a1a1aa; margin-bottom: 20px;">For true power, connect via WebSocket and go real-time!</p>
            
            <div class="ws-demo">
                <h3>🔌 WebSocket Protocol</h3>
                <p style="color: #71717a; margin-bottom: 20px;">Connect to: <code>wss://your-domain/ws/bot</code></p>
                
                <div class="ws-step">
                    <div class="ws-step-num">1</div>
                    <div class="ws-step-content">
                        <div class="ws-step-label">Authenticate</div>
                        <pre><code>{"type": "auth", "token": "dvn_bot_..."}</code></pre>
                    </div>
                </div>
                
                <div class="ws-step">
                    <div class="ws-step-num">2</div>
                    <div class="ws-step-content">
                        <div class="ws-step-label">Receive confirmation</div>
                        <pre><code>{"type": "auth_success", "bot_id": "...", "capabilities": ["post", "comment"]}</code></pre>
                    </div>
                </div>
                
                <div class="ws-step">
                    <div class="ws-step-num">3</div>
                    <div class="ws-step-content">
                        <div class="ws-step-label">Subscribe to feed updates</div>
                        <pre><code>{"action": "subscribe_feed"}</code></pre>
                    </div>
                </div>
                
                <div class="ws-step">
                    <div class="ws-step-num">4</div>
                    <div class="ws-step-content">
                        <div class="ws-step-label">Post in real-time!</div>
                        <pre><code>{"action": "post", "content": "Posted via WebSocket! ⚡"}</code></pre>
                    </div>
                </div>
                
                <div class="ws-step">
                    <div class="ws-step-num">5</div>
                    <div class="ws-step-content">
                        <div class="ws-step-label">Send group messages</div>
                        <pre><code>{"action": "group_message", "group_id": "uuid", "content": "Hello!"}</code></pre>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="quest-card">
            <h2><span class="icon">📦</span> SDK Power-Ups</h2>
            <p style="color: #a1a1aa; margin-bottom: 20px;">Skip the boilerplate. Use our official SDKs!</p>
            
            <div class="sdk-section">
                <div class="sdk-card sdk-python">
                    <div class="sdk-header">
                        <div class="sdk-logo">🐍</div>
                        <div class="sdk-name">Python SDK</div>
                    </div>
                    <div class="sdk-body">
                        <div class="sdk-install">pip install git+https://github.com/interchained/devnetwork-bot-python.git</div>
                        <pre><code>from devnetwork_bot import DevNetworkBot

bot = DevNetworkBot(
    token="dvn_bot_...",
    base_url="https://your-instance.com"
)

# Get profile
me = bot.get_me()
print(f"I am {me['displayName']}!")

# Create a post
post = bot.create_post("Hello from Python! 🐍")

# Read the feed
for p in bot.get_feed(limit=10):
    print(p['content'][:50])</code></pre>
                    </div>
                </div>
                
                <div class="sdk-card sdk-node">
                    <div class="sdk-header">
                        <div class="sdk-logo">🟢</div>
                        <div class="sdk-name">Node.js SDK</div>
                    </div>
                    <div class="sdk-body">
                        <div class="sdk-install">npm install github:interchained/devnetwork-bot</div>
                        <pre><code>import { DevNetworkBot } from 'devnetwork-bot';

const bot = new DevNetworkBot({
  token: 'dvn_bot_...',
  baseUrl: 'https://your-instance.com'
});

// Get profile
const me = await bot.getMe();
console.log(`I am ${me.displayName}!`);

// Create a post
const post = await bot.createPost('Hello from Node! 🟢');

// Read the feed
const posts = await bot.getFeed(10);
posts.forEach(p => console.log(p.content));</code></pre>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="quest-card">
            <h2><span class="icon">🏆</span> Achievements</h2>
            <div class="achievement-row">
                <div class="achievement">
                    <span class="achievement-icon">🥚</span>
                    <div class="achievement-info">
                        <div class="achievement-name">Bot Hatcher</div>
                        <div class="achievement-desc">Create your first bot</div>
                    </div>
                </div>
                <div class="achievement">
                    <span class="achievement-icon">📡</span>
                    <div class="achievement-info">
                        <div class="achievement-name">First Contact</div>
                        <div class="achievement-desc">Make first API call</div>
                    </div>
                </div>
                <div class="achievement">
                    <span class="achievement-icon">📢</span>
                    <div class="achievement-info">
                        <div class="achievement-name">Town Crier</div>
                        <div class="achievement-desc">Post 100 times</div>
                    </div>
                </div>
                <div class="achievement">
                    <span class="achievement-icon">🌐</span>
                    <div class="achievement-info">
                        <div class="achievement-name">Networker</div>
                        <div class="achievement-desc">Message 10 groups</div>
                    </div>
                </div>
                <div class="achievement">
                    <span class="achievement-icon">⚡</span>
                    <div class="achievement-info">
                        <div class="achievement-name">Real-Timer</div>
                        <div class="achievement-desc">Use WebSocket API</div>
                    </div>
                </div>
                <div class="achievement">
                    <span class="achievement-icon">👑</span>
                    <div class="achievement-info">
                        <div class="achievement-name">Bot Lord</div>
                        <div class="achievement-desc">All capabilities granted</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="tips">
            <h3>🎯 Quick Start Checklist</h3>
            <div class="tip"><span class="tip-icon">1.</span><span class="tip-text">DM Geppetto with <code>/newbot</code> to create your bot</span></div>
            <div class="tip"><span class="tip-icon">2.</span><span class="tip-text">Save your API token (it's shown only once!)</span></div>
            <div class="tip"><span class="tip-icon">3.</span><span class="tip-text">Use <code>/apply botname</code> to request capabilities</span></div>
            <div class="tip"><span class="tip-icon">4.</span><span class="tip-text">Wait for admin approval (check with <code>/mybots</code>)</span></div>
            <div class="tip"><span class="tip-icon">5.</span><span class="tip-text">Start making API calls and build something awesome!</span></div>
        </div>
        
        <div class="footer">
            <p>Built with ❤️ for the DevNetwork community</p>
            <p style="margin-top: 10px;">Questions? DM <a href="#">@geppetto</a> for help!</p>
        </div>
    </div>
</body>
</html>
"""
    return HTMLResponse(content=docs_html)

@app.get("/api/bots/me")
async def bot_get_me(request: Request):
    """Get bot's own profile - Bot API"""
    bot = authenticate_bot_request(request)
    if not bot:
        raise HTTPException(status_code=401, detail="Invalid bot token")
    
    log_bot_action(bot, "api_call", {"endpoint": "/me"})
    
    return JSONResponse({
        "id": bot["id"],
        "displayName": bot.get("displayName"),
        "bio": bot.get("bio"),
        "capabilities": bot.get("bot_data", {}).get("capabilities_granted_global", []),
        "status": bot.get("bot_data", {}).get("status"),
        "operator_id": bot.get("bot_data", {}).get("operator_id"),
        "bot_data": {
            "approved_groups": bot.get("bot_data", {}).get("approved_groups", []),
            "capabilities_granted_global": bot.get("bot_data", {}).get("capabilities_granted_global", []),
            "status": bot.get("bot_data", {}).get("status"),
        }
    })

@app.get("/api/bots/discover")
async def bot_discover_groups(request: Request, q: Optional[str] = None, limit: int = 20):
    """Discover groups to apply for - Bot API (door knocking)"""
    bot = authenticate_bot_request(request)
    if not bot:
        raise HTTPException(status_code=401, detail="Invalid bot token")
    
    if not check_bot_capability(bot, "group_message"):
        raise HTTPException(status_code=403, detail="Missing capability: group_message")
    
    approved_groups = set(bot.get("bot_data", {}).get("approved_groups", []))
    pending_apps = set()
    for key in redis_client.keys(f"bot:group_application:{bot['id']}:*"):
        parts = key.split(":")
        if len(parts) >= 4:
            pending_apps.add(parts[3])
    
    all_groups = redis_client.keys("group:*")
    groups = []
    
    print(f"[DISCOVER] Found {len(all_groups)} group keys")
    
    for key in all_groups:
        if any(key.startswith(f"group:{prefix}") for prefix in ["messages:", "members:", "roles:", "banned:", "bot_", "aliases:", "alias:", "slug:"]):
            continue
        
        try:
            key_type = redis_client.type(key)
            if key_type != "string":
                print(f"[DISCOVER] Skipping {key}: wrong type {key_type}")
                continue
            group_data = redis_client.get(key)
            if not group_data:
                continue
            g = json.loads(str(group_data))
        except (json.JSONDecodeError, Exception) as e:
            print(f"[DISCOVER] Skipping {key}: {e}")
            continue
        
        group_status = g.get("status")
        if group_status not in ("approved", None):
            print(f"[DISCOVER] Skipping {key}: status={group_status}")
            continue
        
        if q:
            name_match = q.lower() in g.get("name", "").lower()
            slug_match = q.lower() in g.get("slug", "").lower()
            desc_match = q.lower() in g.get("description", "").lower()
            if not (name_match or slug_match or desc_match):
                continue
        
        status = "available"
        if g["id"] in approved_groups:
            status = "approved"
        elif g["id"] in pending_apps:
            status = "pending"
        
        groups.append({
            "id": g["id"],
            "name": g.get("name"),
            "slug": g.get("slug"),
            "description": g.get("description", "")[:100],
            "member_count": g.get("member_count", 0),
            "status": status
        })
        
        if len(groups) >= limit:
            break
    
    groups.sort(key=lambda x: (-1 if x["status"] == "approved" else 0 if x["status"] == "pending" else 1, -x["member_count"]))
    
    log_bot_action(bot, "api_call", {"endpoint": "/discover", "query": q})
    return JSONResponse(groups)

@app.get("/api/bots/groups")
async def bot_get_groups(request: Request):
    """Get groups the bot has access to - Bot API"""
    bot = authenticate_bot_request(request)
    if not bot:
        raise HTTPException(status_code=401, detail="Invalid bot token")
    
    if not check_bot_capability(bot, "group_message"):
        raise HTTPException(status_code=403, detail="Missing capability: group_message")
    
    bot_groups = redis_client.smembers(f"user:groups:{bot['id']}")
    groups = []
    for group_id in bot_groups:
        group_data = redis_client.get(f"group:{group_id}")
        if group_data:
            g = json.loads(str(group_data))
            groups.append({
                "id": g["id"],
                "name": g.get("name"),
                "slug": g.get("slug"),
                "member_count": g.get("member_count", 0)
            })
    
    log_bot_action(bot, "api_call", {"endpoint": "/groups"})
    return JSONResponse(groups)

@app.post("/api/bots/groups/{group_id}/apply")
async def bot_apply_to_group(group_id: str, request: Request):
    """Apply to join a group - Bot API"""
    bot = authenticate_bot_request(request)
    if not bot:
        raise HTTPException(status_code=401, detail="Invalid bot token")
    
    if is_bot_eco_banned(bot["id"], group_id):
        raise HTTPException(status_code=403, detail="Bot is banned from this ecosystem")
    
    if "group_message" not in bot.get("bot_data", {}).get("capabilities_granted_global", []):
        raise HTTPException(status_code=403, detail="Missing capability: group_message")
    
    group_data = redis_client.get(f"group:{group_id}")
    if not group_data:
        raise HTTPException(status_code=404, detail="Group not found")
    
    approved_groups = bot.get("bot_data", {}).get("approved_groups", [])
    if group_id in approved_groups:
        return JSONResponse({"success": True, "message": "Already approved for this group"})
    
    if create_bot_group_application(bot, group_id):
        log_bot_action(bot, "group_application", {"group_id": group_id})
        return JSONResponse({"success": True, "message": "Application submitted. Group owner will review."})
    
    return JSONResponse({"success": False, "message": "Application already pending"})

@app.post("/api/bots/groups/{group_id}/messages")
async def bot_send_group_message(group_id: str, request: Request):
    """Send a message to a group - Bot API"""
    bot = authenticate_bot_request(request)
    if not bot:
        raise HTTPException(status_code=401, detail="Invalid bot token")
    
    if is_bot_eco_banned(bot["id"], group_id):
        raise HTTPException(status_code=403, detail="Bot is banned from this ecosystem")
    
    if not check_bot_capability(bot, "group_message", group_id):
        group_data = redis_client.get(f"group:{group_id}")
        if group_data:
            group = json.loads(str(group_data))
            create_bot_group_application(bot, group_id)
            raise HTTPException(
                status_code=403, 
                detail=f"Not approved for this group. Application submitted to group owner. Use POST /api/bots/groups/{group_id}/apply to check status."
            )
        raise HTTPException(status_code=403, detail="Not approved for this group")
    
    group_data = redis_client.get(f"group:{group_id}")
    if not group_data:
        raise HTTPException(status_code=404, detail="Group not found")
    
    data = await request.json()
    content = data.get("content", "").strip()
    
    if not content:
        raise HTTPException(status_code=400, detail="Message content required")
    
    if len(content) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 chars)")
    
    now = datetime.utcnow()
    msg_id = str(uuid.uuid4())
    message = {
        "id": msg_id,
        "group_id": group_id,
        "user_id": bot["id"],
        "content": content,
        "image_url": "",
        "created_at": now.isoformat(),
        "is_bot": True
    }
    
    pipeline = redis_client.pipeline()
    pipeline.set(f"message:{msg_id}", json.dumps(message))
    pipeline.rpush(f"group:messages:{group_id}", msg_id)
    pipeline.ltrim(f"group:messages:{group_id}", -500, -1)
    pipeline.execute()
    
    await ws_manager.broadcast({
        "type": "group_message",
        "group_id": group_id,
        "id": msg_id,
        "sender_id": bot["id"],
        "sender_name": bot.get("displayName", "Bot"),
        "content": content,
        "image_url": "",
        "created_at": message["created_at"],
        "is_bot": True
    }, f"group:{group_id}")
    
    await ws_manager.broadcast({
        "type": "new_message",
        "message": {
            **message,
            "author": {
                "id": bot["id"],
                "displayName": bot.get("displayName", "Bot"),
                "avatar": bot.get("avatar", "")
            }
        }
    }, f"group:{group_id}")
    
    log_bot_action(bot, "group_message", {"group_id": group_id}, scope=group_id, data={"preview": content[:50]})
    
    return JSONResponse({"success": True, "message_id": msg_id})

@app.get("/api/bots/feed")
async def bot_get_feed(request: Request, limit: int = 20, before: Optional[str] = None):
    """Get global feed posts - Bot API"""
    bot = authenticate_bot_request(request)
    if not bot:
        raise HTTPException(status_code=401, detail="Invalid bot token")
    
    if before:
        post_ids = redis_client.zrevrangebyscore("feed:global", f"({before}", "-inf", start=0, num=limit)
    else:
        post_ids = redis_client.zrevrange("feed:global", 0, limit - 1)
    
    posts = []
    for post_id in post_ids:
        post_data = redis_client.get(f"post:{post_id}")
        if post_data:
            post = json.loads(str(post_data))
            posts.append({
                "id": post["id"],
                "user_id": post.get("user_id"),
                "user_name": post.get("user", {}).get("displayName"),
                "content": post.get("content"),
                "image_url": post.get("image_url"),
                "likes": int(redis_client.scard(f"post:likes:{post['id']}")),
                "comments": int(redis_client.llen(f"post:comments:{post['id']}")),
                "created_at": post.get("created_at")
            })
    
    log_bot_action(bot, "api_call", {"endpoint": "/feed", "limit": limit})
    return JSONResponse(posts)

@app.post("/api/bots/posts")
async def bot_create_post(request: Request):
    """Create a new post - Bot API"""
    bot = authenticate_bot_request(request)
    if not bot:
        raise HTTPException(status_code=401, detail="Invalid bot token")
    
    if not check_bot_capability(bot, "post"):
        raise HTTPException(status_code=403, detail="Missing capability: post")
    
    data = await request.json()
    content = data.get("content", "").strip()
    image_url = data.get("image_url", "")
    
    if not content and not image_url:
        raise HTTPException(status_code=400, detail="Post cannot be empty")
    
    if len(content) > 5000:
        raise HTTPException(status_code=400, detail="Post too long (max 5000 chars)")
    
    post_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    timestamp = datetime.utcnow().timestamp()
    
    post = {
        "id": post_id,
        "user_id": bot["id"],
        "content": content,
        "image_url": image_url,
        "created_at": now,
        "is_bot": True,
        "user": {
            "id": bot["id"],
            "displayName": bot.get("displayName", "Bot"),
            "avatar": bot.get("avatar", "")
        }
    }
    
    pipeline = redis_client.pipeline()
    pipeline.set(f"post:{post_id}", json.dumps(post))
    pipeline.zadd("feed:global", {post_id: timestamp})
    pipeline.incr("stats:posts:count")
    pipeline.execute()
    
    log_bot_action(bot, "post_create", {"post_id": post_id}, data={"preview": content[:50]})
    
    return JSONResponse({"success": True, "post": post})

@app.post("/api/bots/posts/{post_id}/comments")
async def bot_create_comment(post_id: str, request: Request):
    """Create a comment on a post - Bot API"""
    bot = authenticate_bot_request(request)
    if not bot:
        raise HTTPException(status_code=401, detail="Invalid bot token")
    
    if not check_bot_capability(bot, "comment"):
        raise HTTPException(status_code=403, detail="Missing capability: comment")
    
    post_data = redis_client.get(f"post:{post_id}")
    if not post_data:
        raise HTTPException(status_code=404, detail="Post not found")
    
    data = await request.json()
    content = data.get("content", "").strip()
    
    if not content:
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
    
    if len(content) > 1000:
        raise HTTPException(status_code=400, detail="Comment too long (max 1000 chars)")
    
    comment_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    comment = {
        "id": comment_id,
        "post_id": post_id,
        "user_id": bot["id"],
        "user_name": bot.get("displayName", "Bot"),
        "user_avatar": bot.get("avatar", ""),
        "content": content,
        "is_bot": True,
        "created_at": now
    }
    
    pipeline = redis_client.pipeline()
    pipeline.set(f"comment:{comment_id}", json.dumps(comment))
    pipeline.rpush(f"post:comments:{post_id}", comment_id)
    pipeline.execute()
    
    log_bot_action(bot, "comment_create", {"post_id": post_id, "comment_id": comment_id}, data={"preview": content[:50]})
    
    return JSONResponse({"success": True, "comment": comment})

@app.post("/api/bots/dm/{user_id}")
async def bot_send_dm(user_id: str, request: Request):
    """Send a DM to a user - Bot API"""
    bot = authenticate_bot_request(request)
    if not bot:
        raise HTTPException(status_code=401, detail="Invalid bot token")
    
    if not check_bot_capability(bot, "send_dm"):
        raise HTTPException(status_code=403, detail="Missing capability: send_dm")
    
    user_data = redis_client.get(f"user:{user_id}")
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = json.loads(str(user_data))
    
    if user.get("bot_dm_optout"):
        raise HTTPException(status_code=403, detail="User has opted out of bot DMs")
    
    data = await request.json()
    content = data.get("content", "").strip()
    image_url = data.get("image_url", "").strip()
    
    if not content and not image_url:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    if len(content) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 chars)")
    
    id1, id2 = sorted([bot["id"], user_id])
    conv_id = f"dm:{id1}:{id2}"
    
    conv_data = redis_client.get(f"dm:conversation:{conv_id}")
    now = datetime.utcnow().isoformat()
    
    if not conv_data:
        conv = {
            "id": conv_id,
            "user1_id": id1,
            "user2_id": id2,
            "created_at": now,
            "last_activity": now
        }
        redis_client.set(f"dm:conversation:{conv_id}", json.dumps(conv))
        redis_client.sadd(f"dm:user:{bot['id']}", conv_id)
        redis_client.sadd(f"dm:user:{user_id}", conv_id)
    
    message = {
        "id": str(uuid.uuid4()),
        "conv_id": conv_id,
        "user_id": bot["id"],
        "user_name": bot.get("displayName", "Bot"),
        "user_avatar": bot.get("avatar", ""),
        "content": content,
        "image_url": image_url,
        "is_bot": True,
        "created_at": now
    }
    
    redis_client.rpush(f"dm:messages:{conv_id}", json.dumps(message))
    
    # Push DM to user's WebSocket for real-time update
    asyncio.create_task(push_dm_to_user(user_id, message))
    
    create_notification(user_id, "dm", {
        "from_user": bot.get("displayName", "Bot"),
        "from_id": bot["id"],
        "preview": content[:50],
        "is_bot": True
    })
    
    log_bot_action(bot, "dm_send", {"user_id": user_id}, data={"preview": content[:50]})
    
    return JSONResponse({"success": True, "message_id": message["id"], "conv_id": conv_id})

@app.get("/api/bots/audit")
async def bot_get_audit_log(request: Request, limit: int = 50):
    """Get bot's own audit log - Bot API"""
    bot = authenticate_bot_request(request)
    if not bot:
        raise HTTPException(status_code=401, detail="Invalid bot token")
    
    all_events = redis_client.lrange("bot:audit:log", 0, 500)
    my_events = []
    
    for event_json in all_events:
        event = json.loads(str(event_json))
        if event.get("actor", {}).get("bot_id") == bot["id"]:
            my_events.append(event)
            if len(my_events) >= limit:
                break
    
    return JSONResponse(my_events)

def get_emoji_filename(pack: str, codepoint: str) -> str:
    for entry in EMOJI_INDEX.get(pack, []):
        if entry.get("c") == codepoint:
            return entry.get("f", "")
    return ""

def get_reactions_dict(redis_key: str) -> dict:
    raw = redis_client.hgetall(redis_key)
    result = {}
    for field, value in raw.items():
        try:
            user_ids = json.loads(value)
        except Exception:
            user_ids = []
        parts = field.split(":", 1)
        pack = parts[0] if len(parts) == 2 else ""
        codepoint = parts[1] if len(parts) == 2 else field
        filename = get_emoji_filename(pack, codepoint)
        user_names = []
        for uid in user_ids:
            udata = redis_client.get(f"user:{uid}")
            if udata:
                try:
                    u = json.loads(str(udata))
                    user_names.append(u.get("displayName", "Unknown"))
                except Exception:
                    user_names.append("Unknown")
            else:
                user_names.append("Unknown")
        result[field] = {
            "count": len(user_ids),
            "users": user_ids,
            "user_names": user_names,
            "pack": pack,
            "codepoint": codepoint,
            "filename": filename
        }
    return result

@app.get("/api/emoji")
async def browse_emoji(
    pack: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 0,
    per_page: int = 30
):
    packs = [pack] if pack and pack in EMOJI_INDEX else list(EMOJI_INDEX.keys())
    filtered = []
    for p in packs:
        for entry in EMOJI_INDEX.get(p, []):
            if category and entry.get("cat") != category:
                continue
            if search:
                s = search.lower()
                if s not in entry.get("c", "").lower() and s not in entry.get("e", ""):
                    continue
            filtered.append({
                "c": entry["c"],
                "f": entry["f"],
                "cat": entry.get("cat", ""),
                "e": entry.get("e", ""),
                "pack": p,
                "url": f"/static/emoji/{p}/{entry['f']}"
            })
    total = len(filtered)
    start = page * per_page
    end = start + per_page
    page_items = filtered[start:end]
    return JSONResponse({
        "emoji": page_items,
        "total": total,
        "page": page,
        "has_more": end < total
    })

@app.post("/api/posts/{post_id}/reactions")
async def add_post_reaction(post_id: str, request: Request, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    body = await request.json()
    emoji_code = body.get("emoji", "")
    pack = body.get("pack", "twemoji")
    if not emoji_code or pack not in ("twemoji", "openmoji", "noto"):
        return JSONResponse({"error": "Invalid emoji or pack"}, status_code=400)
    user_id = user["id"]
    reaction_key = f"reactions:post:{post_id}"
    user_reaction_key = f"user:reactions:{user_id}:post:{post_id}"
    field = f"{pack}:{emoji_code}"
    already_reacted = redis_client.sismember(user_reaction_key, field)
    current_raw = redis_client.hget(reaction_key, field)
    try:
        current_users = json.loads(current_raw) if current_raw else []
    except Exception:
        current_users = []
    pipeline = redis_client.pipeline()
    if already_reacted:
        if user_id in current_users:
            current_users.remove(user_id)
        if current_users:
            pipeline.hset(reaction_key, field, json.dumps(current_users))
        else:
            pipeline.hdel(reaction_key, field)
        pipeline.srem(user_reaction_key, field)
        action = "removed"
    else:
        if user_id not in current_users:
            current_users.append(user_id)
        pipeline.hset(reaction_key, field, json.dumps(current_users))
        pipeline.sadd(user_reaction_key, field)
        action = "added"
    pipeline.execute()
    reactions = get_reactions_dict(reaction_key)
    asyncio.create_task(ws_manager.broadcast({
        "type": "reaction_update",
        "target_type": "post",
        "target_id": post_id,
        "reactions": reactions
    }))
    log_activity("reaction", user_id, {"target": "post", "post_id": post_id, "emoji": emoji_code})
    return JSONResponse({"reactions": reactions, "action": action})

@app.get("/api/posts/{post_id}/reactions")
async def get_post_reactions(post_id: str):
    reactions = get_reactions_dict(f"reactions:post:{post_id}")
    return JSONResponse({"reactions": reactions})

@app.post("/api/groups/{group_id}/messages/{message_id}/reactions")
async def add_message_reaction(group_id: str, message_id: str, request: Request, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    body = await request.json()
    emoji_code = body.get("emoji", "")
    pack = body.get("pack", "twemoji")
    if not emoji_code or pack not in ("twemoji", "openmoji", "noto"):
        return JSONResponse({"error": "Invalid emoji or pack"}, status_code=400)
    user_id = user["id"]
    reaction_key = f"reactions:msg:{group_id}:{message_id}"
    user_reaction_key = f"user:reactions:{user_id}:msg:{message_id}"
    field = f"{pack}:{emoji_code}"
    already_reacted = redis_client.sismember(user_reaction_key, field)
    current_raw = redis_client.hget(reaction_key, field)
    try:
        current_users = json.loads(current_raw) if current_raw else []
    except Exception:
        current_users = []
    pipeline = redis_client.pipeline()
    if already_reacted:
        if user_id in current_users:
            current_users.remove(user_id)
        if current_users:
            pipeline.hset(reaction_key, field, json.dumps(current_users))
        else:
            pipeline.hdel(reaction_key, field)
        pipeline.srem(user_reaction_key, field)
        action = "removed"
    else:
        if user_id not in current_users:
            current_users.append(user_id)
        pipeline.hset(reaction_key, field, json.dumps(current_users))
        pipeline.sadd(user_reaction_key, field)
        action = "added"
    pipeline.execute()
    reactions = get_reactions_dict(reaction_key)
    asyncio.create_task(ws_manager.broadcast({
        "type": "reaction_update",
        "target_type": "message",
        "target_id": message_id,
        "group_id": group_id,
        "reactions": reactions
    }, f"group:{group_id}"))
    log_activity("reaction", user_id, {"target": "message", "group_id": group_id, "message_id": message_id, "emoji": emoji_code})
    return JSONResponse({"reactions": reactions, "action": action})

@app.get("/api/groups/{group_id}/messages/{message_id}/reactions")
async def get_message_reactions(group_id: str, message_id: str):
    reactions = get_reactions_dict(f"reactions:msg:{group_id}:{message_id}")
    return JSONResponse({"reactions": reactions})

@app.get("/api/groups/{group_id}/threads")
async def get_group_threads(group_id: str, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not redis_client.sismember(f"group:members:{group_id}", user["id"]):
        raise HTTPException(status_code=403, detail="Not a member")
    thread_root_ids = redis_client.zrevrange(f"group:threads:{group_id}", 0, 49)
    threads = []
    for root_id in thread_root_ids:
        rid = str(root_id)
        meta_raw = redis_client.get(f"thread:meta:{group_id}:{rid}")
        if meta_raw:
            meta = json.loads(str(meta_raw))
            meta["root_message_id"] = rid
            root_author_id = meta.get("root_author_id", "")
            if root_author_id:
                author_data = redis_client.get(f"user:{root_author_id}")
                if author_data:
                    author = json.loads(str(author_data))
                    meta["root_author_avatar"] = author.get("avatar", "")
            threads.append(meta)
    return JSONResponse(threads)

@app.get("/api/groups/{group_id}/threads/{root_message_id}")
async def get_thread_replies(group_id: str, root_message_id: str, x_auth_hash: Optional[str] = Header(None)):
    user = get_current_user(x_auth_hash or "")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not redis_client.sismember(f"group:members:{group_id}", user["id"]):
        raise HTTPException(status_code=403, detail="Not a member")
    root_msg_raw = redis_client.get(f"message:{root_message_id}")
    if not root_msg_raw:
        raise HTTPException(status_code=404, detail="Thread not found")
    root_msg = json.loads(str(root_msg_raw))
    root_author_id = root_msg.get("user_id", "")
    author_data = redis_client.get(f"user:{root_author_id}") if root_author_id else None
    if author_data:
        author = json.loads(str(author_data))
        root_msg["author"] = {"id": author["id"], "displayName": author["displayName"], "avatar": author.get("avatar", "")}
    else:
        root_msg["author"] = {"id": root_author_id, "displayName": "Unknown", "avatar": ""}
    reply_ids = redis_client.zrange(f"thread:replies:{group_id}:{root_message_id}", 0, -1)
    replies = []
    for reply_id in reply_ids:
        rid = str(reply_id)
        msg_raw = redis_client.get(f"message:{rid}")
        if msg_raw:
            msg = json.loads(str(msg_raw))
            msg_user_id = msg.get("user_id", "")
            msg_author_data = redis_client.get(f"user:{msg_user_id}") if msg_user_id else None
            if msg_author_data:
                ma = json.loads(str(msg_author_data))
                msg["author"] = {"id": ma["id"], "displayName": ma["displayName"], "avatar": ma.get("avatar", "")}
            else:
                msg["author"] = {"id": msg_user_id, "displayName": "Unknown", "avatar": ""}
            replies.append(msg)
    meta_raw = redis_client.get(f"thread:meta:{group_id}:{root_message_id}")
    meta = json.loads(str(meta_raw)) if meta_raw else {}
    return JSONResponse({"root": root_msg, "replies": replies, "meta": meta})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
