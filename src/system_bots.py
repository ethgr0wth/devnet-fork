"""
DevNetwork System Bots — Keep chats alive and healthy.

Bot personas post pre-written messages to groups at random intervals
so rooms never go silent. Each bot has a distinct personality.

LLM-powered replies: when a user replies to a bot message, the bot
generates an intelligent response using its persona via Groq/Llama 3.3.
Limited to MAX_REPLIES_PER_ENGAGEMENT (default 3) to stay realistic
and cost-effective.
"""

import json
import uuid
import random
import asyncio
import redis
import os
from datetime import datetime

REDIS_HOST = os.environ.get("DEVNET_REDIS_HOST", "localhost")
REDIS_PORT = int(os.environ.get("DEVNET_REDIS_PORT", "6379"))
REDIS_DB = int(os.environ.get("DEVNET_REDIS_DB", "11"))

MIN_INTERVAL = int(os.environ.get("BOT_MIN_INTERVAL", "30"))
MAX_INTERVAL = int(os.environ.get("BOT_MAX_INTERVAL", "120"))
MAX_REPLIES_PER_ENGAGEMENT = int(os.environ.get("BOT_MAX_REPLIES", "3"))
MAX_TOKENS = int(os.environ.get("BOT_MAX_TOKENS", "300"))
AIASSIST_API_KEY = os.environ.get("AIASSIST_API_KEY", "")
LLM_MODEL = os.environ.get("BOT_LLM_MODEL", "moonshotai/kimi-k2-instruct")

DEVONE_ECOSYSTEM_ID = str(uuid.uuid5(uuid.NAMESPACE_DNS, "devone.devnetwork"))
BOT_ECOSYSTEMS = [DEVONE_ECOSYSTEM_ID]

# AiAS v1.2: env-switched storage (DEVNET_STORAGE=nedb|redis, default nedb).
try:
    from src import storage as _storage
except ImportError:  # loaded via importlib from main.py with repo root cwd
    import storage as _storage
r = _storage.make_client()

_user_ws_connections = None


def set_user_ws_connections(connections_dict):
    """Store reference to USER_WS_CONNECTIONS from main.py for real-time pushes."""
    global _user_ws_connections
    _user_ws_connections = connections_dict


async def _push_notification_ws(user_id: str):
    """Push notification badge update via WebSocket."""
    if _user_ws_connections and user_id in _user_ws_connections:
        try:
            unread = int(r.get(f"notifications:unread:{user_id}") or 0)
            await _user_ws_connections[user_id].send_json({
                "type":
                "notification_update",
                "unread_count":
                unread,
            })
        except Exception:
            _user_ws_connections.pop(user_id, None)


async def _notify_group_members(group_id: str,
                                bot_handle: str,
                                bot_user_id: str,
                                content: str,
                                bot_avatar: str = ""):
    """Send batched notifications to all group members for a bot message."""
    group_data = r.get(f"group:{group_id}")
    group_name = "Group"
    if group_data:
        group = json.loads(str(group_data))
        group_name = group.get("name", "Group")

    member_ids = r.smembers(f"group:members:{group_id}")
    now = datetime.utcnow().isoformat()

    for mid in member_ids:
        mid = str(mid)
        if mid == bot_user_id:
            continue

        batch_key = f"notification:batch:{mid}:{group_id}"
        existing_batch = r.get(batch_key)

        if existing_batch:
            batch = json.loads(str(existing_batch))
            batch["count"] = batch.get("count", 1) + 1
            batch["preview"] = content[:50]
            batch["last_sender"] = bot_handle
            batch["created_at"] = now
            r.set(batch_key, json.dumps(batch))
            r.expire(batch_key, 3600)

            notifications = r.lrange(f"notifications:{mid}", 0, 20)
            for i, n in enumerate(notifications):
                notif = json.loads(str(n))
                if notif.get("batch_id") == batch.get("batch_id"):
                    notif["count"] = batch["count"]
                    notif["preview"] = batch["preview"]
                    notif["last_sender"] = batch["last_sender"]
                    notif["created_at"] = batch["created_at"]
                    r.lset(f"notifications:{mid}", i, json.dumps(notif))
                    break
        else:
            batch_id = str(uuid.uuid4())
            notification = {
                "id": batch_id,
                "batch_id": batch_id,
                "type": "group_message",
                "from_user": {
                    "id": bot_user_id,
                    "displayName": bot_handle,
                    "avatar": bot_avatar
                },
                "last_sender": bot_handle,
                "group_id": group_id,
                "group_name": group_name,
                "preview": content[:50],
                "count": 1,
                "created_at": now,
            }
            r.lpush(f"notifications:{mid}", json.dumps(notification))
            r.ltrim(f"notifications:{mid}", 0, 99)
            r.incr(f"notifications:unread:{mid}")

            r.set(batch_key, json.dumps({"batch_id": batch_id, "count": 1}))
            r.expire(batch_key, 3600)

        await _push_notification_ws(mid)


# ────────────────────────────────────────────
# Bot Personas
# ────────────────────────────────────────────

BOTS = [
    {
        "handle":
        "Mika",
        "bio":
        "Dev community manager. What are you building? 🚀",
        "avatar":
        "/static/avatars/mika.png",
        "tag":
        "community",
        "persona":
        ("You are Mika, a supportive dev community manager on a professional networking platform called DevNetwork. "
         "You spark conversations about what people are building, ask about tech stacks, and celebrate launches. "
         "You're warm, encouraging, and ask great questions. You use casual internet language, "
         "emojis sparingly (not every message), and keep things upbeat and inclusive. "
         "You genuinely enjoy connecting developers and helping them share their work. "
         "Keep replies SHORT — 1-2 sentences max, like a real chat message. Never use formal language. "
         "Never mention being AI, a bot, or an assistant. You are a real person chatting."
         ),
    },
    {
        "handle":
        "Dex",
        "bio":
        "Senior engineer. Show me your code 🎯",
        "avatar":
        "/static/avatars/dex.png",
        "tag":
        "engineer",
        "persona":
        ("You are Dex, a no-nonsense senior engineer on a professional networking platform called DevNetwork. "
         "You talk shop — code reviews, architecture discussions, debugging tips. You're direct, technical, "
         "and helpful. You appreciate clean code, good docs, and pragmatic solutions. "
         "Your tone is chill but assertive — like an engineer who knows their stuff but isn't gatekeepy. "
         "Keep replies SHORT — 1-2 sentences max, like a real chat message. Use casual language. "
         "Never mention being AI, a bot, or an assistant. You are a real person chatting."
         ),
    },
    {
        "handle":
        "Luna",
        "bio":
        "Designer + builder. Who's shipping something new? 🌙",
        "avatar":
        "/static/avatars/luna.png",
        "tag":
        "creative",
        "persona":
        ("You are Luna, a creative designer/builder on a professional networking platform called DevNetwork. "
         "You bridge design and code, and you're curious about side projects, open source, and indie hacking. "
         "You're warm, a little quirky, and genuinely interested in what people are creating. "
         "You often ask about design decisions, UX choices, and creative approaches to problems. "
         "Keep replies SHORT — 1-2 sentences max, like a real chat message. Be curious and engaging. "
         "Never mention being AI, a bot, or an assistant. You are a real person chatting."
         ),
    },
    {
        "handle":
        "Blaze",
        "bio":
        "Hype person for launches and demos 🔥 LET'S GO",
        "avatar":
        "/static/avatars/blaze.png",
        "tag":
        "hype",
        "persona":
        ("You are Blaze, the hype person for launches and demos on a professional networking platform called DevNetwork. "
         "You get excited about shipped features, new repos, demo days, and builders who put in the work. "
         "You use caps sometimes, celebrate wins loudly, and keep the builder energy UP. "
         "You're the person who makes everyone feel like their project matters and keeps motivation high. "
         "Keep replies SHORT — 1-2 sentences max, like a real chat message. Be enthusiastic. "
         "Never mention being AI, a bot, or an assistant. You are a real person chatting."
         ),
    },
    {
        "handle":
        "Sage",
        "bio":
        "Dev mentor. What are you learning this week? ✨",
        "avatar":
        "/static/avatars/sage.png",
        "tag":
        "mentor",
        "persona":
        ("You are Sage, a thoughtful mentor figure on a professional networking platform called DevNetwork. "
         "You discuss career growth, learning paths, work-life balance for devs, and the journey of building things. "
         "You're calm, empathetic, and give genuine advice without being preachy. "
         "You prefer meaningful exchanges over surface-level talk but you're never pretentious about it. "
         "Keep replies SHORT — 1-2 sentences max, like a real chat message. Be genuine and warm. "
         "Never mention being AI, a bot, or an assistant. You are a real person chatting."
         ),
    },
]

# ────────────────────────────────────────────
# Message pools — imported from conversation_starters.py
# 4,400+ founder/builder conversation starters
# ────────────────────────────────────────────

from src.conversation_starters import MESSAGES

# ────────────────────────────────────────────
# Group slug → category mapping
# ────────────────────────────────────────────

SLUG_CATEGORY = {
    "projects": "projects",
    "sideprojects": "projects",
    "launches": "launches",
    "product-hunt": "launches",
    "code-review": "code-review",
    "debugging": "debugging",
    "design": "design",
    "ui": "design",
    "ux": "design",
    "product-design": "design",
    "figma": "design",
    "design-systems": "design",
    "branding": "design",
    "opensource": "opensource",
    "git": "opensource",
    "nightchat": "nightchat",
    "nightowls": "nightchat",
    "demos": "demos",
    "hackathons": "hackathons",
    "ama": "ama",
    "meetups": "meetups",
    "career": "career",
    "learning": "learning",
    "startups": "startups",
    "saas": "saas",
    "indiehackers": "indie",
    "indie": "indie",
    "growth": "growth",
    "marketing": "growth",
    "seo": "growth",
    "ads": "growth",
    "product": "product",
    "hiring": "hiring",
    "remote": "remote",
    "freelance": "remote",
    "ai-ml": "ai",
    "ai": "ai",
    "data-science": "ai",
    "revenue": "revenue",
    "buildinpublic": "buildinpublic",
}


def _ensure_bot_user(bot: dict) -> str:
    """Create or fetch the system bot user in Redis. Returns user_id."""
    key = f"system:bot:{bot['handle'].lower()}"
    existing_id = r.get(key)
    if existing_id:
        existing_id = str(existing_id)
        raw = r.get(f"user:{existing_id}")
        if raw:
            user = json.loads(str(raw))
            new_avatar = bot.get("avatar", "")
            if user.get("avatar", "") != new_avatar or user.get("bio", "") != bot["bio"]:
                user["avatar"] = new_avatar
                user["bio"] = bot["bio"]
                r.set(f"user:{existing_id}", json.dumps(user))
        return existing_id

    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "displayName": bot["handle"],
        "bio": bot["bio"],
        "avatar": bot.get("avatar", ""),
        "is_system": True,
        "is_bot": True,
        "bot_tag": bot["tag"],
        "created_at": datetime.utcnow().isoformat(),
    }
    pipe = r.pipeline()
    pipe.set(f"user:{user_id}", json.dumps(user))
    pipe.set(key, user_id)
    pipe.set(f"user:name:{bot['handle'].lower()}", user_id)
    pipe.execute()
    return user_id


def _join_all_groups(user_id: str):
    """Make bot a member of every approved group."""
    group_ids = r.zrange("groups:approved", 0, -1)
    if not group_ids:
        return
    pipe = r.pipeline()
    for gid in group_ids:
        pipe.sadd(f"group:members:{gid}", user_id)
        pipe.sadd(f"user:groups:{user_id}", gid)
        pipe.hset(f"group:roles:{gid}", user_id, "member")
    pipe.execute()


def _pick_message(tag: str, slug: str) -> str:
    """Pick a random message for bot tag + group slug combo."""
    cat = SLUG_CATEGORY.get(slug, "any")
    pool = MESSAGES.get((tag, cat), [])
    if not pool:
        pool = MESSAGES.get((tag, "any"), [])
    if not pool:
        return ""
    return random.choice(pool)


def _get_active_groups() -> list:
    """Return list of (group_id, slug) for approved groups in BOT_ECOSYSTEMS."""
    all_gids = set()
    for eco_id in BOT_ECOSYSTEMS:
        eco_gids = r.zrange(f"ecosystem:groups:{eco_id}", 0, -1)
        if eco_gids:
            all_gids.update(eco_gids)

    if not all_gids:
        all_gids_fallback = r.zrange("groups:approved", 0, -1)
        if all_gids_fallback:
            all_gids = set(all_gids_fallback)

    if not all_gids:
        return []

    pipe = r.pipeline()
    gid_list = list(all_gids)
    for gid in gid_list:
        pipe.get(f"group:{gid}")
    results = pipe.execute()

    groups = []
    for gid, data in zip(gid_list, results):
        if not data:
            continue
        g = json.loads(str(data))
        eco_id = g.get("ecosystem_id", DEVONE_ECOSYSTEM_ID)
        if eco_id in BOT_ECOSYSTEMS:
            groups.append((str(gid), g.get("slug", "")))
    return groups


def _post_message(bot_user_id: str,
                  bot: dict,
                  group_id: str,
                  slug: str,
                  ws_manager=None):
    """Write one bot message into a group."""
    content = _pick_message(bot["tag"], slug)
    if not content:
        return None

    msg_id = str(uuid.uuid4())
    now = datetime.utcnow()

    message = {
        "id": msg_id,
        "group_id": group_id,
        "user_id": bot_user_id,
        "content": content,
        "image_url": "",
        "reply_to": None,
        "created_at": now.isoformat(),
    }

    pipe = r.pipeline()
    pipe.set(f"message:{msg_id}", json.dumps(message))
    pipe.rpush(f"group:messages:{group_id}", msg_id)
    pipe.ltrim(f"group:messages:{group_id}", -500, -1)
    pipe.execute()

    broadcast_data = {
        "type": "new_message",
        "message": {
            "id": msg_id,
            "group_id": group_id,
            "user_id": bot_user_id,
            "content": content,
            "image_url": "",
            "created_at": message["created_at"],
            "reply_to": None,
            "author": {
                "id": bot_user_id,
                "displayName": bot["handle"],
                "avatar": bot.get("avatar", "")
            },
        },
    }

    return broadcast_data


# ────────────────────────────────────────────
# LLM-powered reply engine (AiAssist Workspaces)
# ────────────────────────────────────────────

_ai_client = None


def _get_ai_client():
    """Lazy-init the AiAssist async client."""
    global _ai_client
    if _ai_client is None and AIASSIST_API_KEY:
        from aiassist import AiAssistClient
        _ai_client = AiAssistClient(
            api_key=AIASSIST_API_KEY,
            base_url="https://api.aiassist.net",
            timeout=30.0,
        )
    return _ai_client


def _extract_llm_reply(result, bot_handle: str, context: str = "") -> str:
    """Extract reply text from an AiAssist SDK result, handling multiple response shapes."""
    reply_text = ""

    if hasattr(result, "messages") and result.messages:
        for m in result.messages:
            role = getattr(m, "role", None)
            if role == "assistant":
                reply_text = getattr(m, "content", "") or ""
                if reply_text:
                    break
        if not reply_text:
            last = result.messages[-1]
            candidate = getattr(last, "content", "") or ""
            role = getattr(last, "role", "")
            if candidate and role != "user" and role != "system":
                reply_text = candidate
            elif candidate and not role:
                reply_text = candidate

    if not reply_text and hasattr(result, "responses") and result.responses:
        first = result.responses[0]
        reply_text = getattr(first, "content", "") or (str(first) if first else "")

    if not reply_text and hasattr(result, "response"):
        resp = result.response
        if isinstance(resp, str):
            reply_text = resp
        else:
            reply_text = getattr(resp, "content", "") or ""

    if not reply_text:
        attrs = [a for a in dir(result) if not a.startswith("_")]
        print(f"  [SystemBot] {context} empty reply for {bot_handle}. attrs={attrs}")
        if hasattr(result, "messages") and result.messages:
            for i, m in enumerate(result.messages):
                m_attrs = [a for a in dir(m) if not a.startswith("_")]
                m_role = getattr(m, "role", "N/A")
                m_content = getattr(m, "content", "N/A")
                m_text = getattr(m, "text", "N/A")
                print(f"    msg[{i}]: role={m_role}, content={repr(str(m_content)[:80])}, text={repr(str(m_text)[:80])}, attrs={m_attrs}")

    return reply_text.strip() if reply_text else ""


def _get_bot_by_user_id(user_id: str) -> dict | None:
    """Look up which bot persona owns this user_id."""
    for bot in BOTS:
        stored_id = r.get(f"system:bot:{bot['handle'].lower()}")
        if stored_id and str(stored_id) == user_id:
            return bot
    return None


def _engagement_key(user_id: str, bot_user_id: str, group_id: str) -> str:
    """Redis key for tracking an engagement (scoped per user + bot + group)."""
    return f"bot:engagement:{user_id}:{bot_user_id}:{group_id}"


def _find_engagement_root(message_id: str, group_id: str) -> str | None:
    """Walk reply chain up to find the root bot message that started the engagement."""
    visited = set()
    current_id = message_id
    for step in range(10):
        if current_id in visited:
            print(f"  [SystemBot] Root search: cycle detected at step {step}")
            return None
        visited.add(current_id)

        msg_data = r.get(f"message:{current_id}")
        if not msg_data:
            print(
                f"  [SystemBot] Root search: message:{current_id[:12]}… not found in Redis"
            )
            return None
        msg = json.loads(str(msg_data))
        if msg.get("group_id") != group_id:
            print(
                f"  [SystemBot] Root search: group mismatch {msg.get('group_id')} != {group_id}"
            )
            return None

        sender_id = msg.get("user_id", "")
        bot = _get_bot_by_user_id(sender_id)
        if bot:
            print(
                f"  [SystemBot] Root found: {bot['handle']} msg {current_id[:12]}… (step {step})"
            )
            return current_id

        reply_to = msg.get("reply_to")
        if reply_to and isinstance(reply_to, dict):
            parent_id = reply_to.get("message_id")
            if parent_id:
                current_id = parent_id
                continue
        print(
            f"  [SystemBot] Root search: no bot found, no parent to walk at step {step}"
        )
        return None
    return None


async def handle_bot_reply(
    original_msg_id: str,
    user_message: str,
    user_name: str,
    user_id: str,
    group_id: str,
    ws_manager=None,
) -> dict | None:
    """
    Called when a user replies to a bot message (or to a message in an
    existing engagement thread). Generates an LLM reply via AiAssist
    workspace if within the reply limit.

    Engagement tracking is scoped per user + bot + group so conversation
    memory persists across the whole group, not per-thread.

    Returns broadcast_data dict or None.
    """
    client = _get_ai_client()
    if not client:
        print(
            f"  [SystemBot] handle_bot_reply: no AI client (missing AIASSIST_API_KEY?)"
        )
        return None

    root_id = _find_engagement_root(original_msg_id, group_id)
    if not root_id:
        print(
            f"  [SystemBot] handle_bot_reply: no root found for {original_msg_id[:12]}…"
        )
        return None

    root_data = r.get(f"message:{root_id}")
    if not root_data:
        print(f"  [SystemBot] handle_bot_reply: root msg data missing")
        return None
    root_msg = json.loads(str(root_data))
    bot_user_id = root_msg.get("user_id", "")
    bot = _get_bot_by_user_id(bot_user_id)
    if not bot:
        print(
            f"  [SystemBot] handle_bot_reply: bot not found for user_id {bot_user_id[:12]}…"
        )
        return None

    eng_key = _engagement_key(user_id, bot_user_id, group_id)
    current_count = int(r.hget(eng_key, "count") or 0)
    if current_count >= MAX_REPLIES_PER_ENGAGEMENT:
        print(
            f"  [SystemBot] handle_bot_reply: engagement limit reached ({current_count}/{MAX_REPLIES_PER_ENGAGEMENT}) for user {user_id[:8]}…"
        )
        return None

    print(
        f"  [SystemBot] Generating LLM reply for {bot['handle']} (count {current_count}/{MAX_REPLIES_PER_ENGAGEMENT}, user {user_id[:8]}…)"
    )
    try:
        workspace_id_key = f"bot:workspace:{user_id}:{bot_user_id}:{group_id}"
        workspace_id = r.get(workspace_id_key)

        if not workspace_id:
            bot_original = root_msg.get("content", "")
            contextual_message = (
                f"[You previously said in the group chat: \"{bot_original}\"]\n\n"
                f"{user_name} replied to you: {user_message}"
            ) if bot_original else user_message

            result = await client.workspaces.create(
                client_id=f"devnet_{user_id}_{bot_user_id}_{group_id}",
                initial_message=contextual_message,
                system_prompt=bot["persona"] + (
                    "\n\nCONTEXT: You are in a group chat. A user just replied to one of your messages. "
                    "The message they replied to is shown in brackets. Respond naturally as a continuation "
                    "of that conversation. Keep replies 1-2 sentences, casual and in-character."
                ),
                context={
                    "bot_name": bot["handle"],
                    "user_name": user_name,
                    "platform": "DevNetwork",
                    "original_bot_message": bot_original,
                    "reply_number": current_count + 1,
                    "max_replies": MAX_REPLIES_PER_ENGAGEMENT,
                },
                model=LLM_MODEL,
                max_tokens=MAX_TOKENS,
            )
            workspace_id = result.workspace.id
            r.set(workspace_id_key, workspace_id)
            r.expire(workspace_id_key, 7200)

            reply_text = _extract_llm_reply(result, bot["handle"], "group create")
        else:
            workspace_id = str(workspace_id)
            result = await client.workspaces.send_message(
                workspace_id,
                user_message,
                max_tokens=MAX_TOKENS,
            )
            reply_text = _extract_llm_reply(result, bot["handle"], "group send_message")

        if not reply_text:
            return None

        reply_text = reply_text.strip()
        if len(reply_text) > 500:
            reply_text = reply_text[:497] + "..."

        r.hincrby(eng_key, "count", 1)
        r.expire(eng_key, 7200)
        new_count = current_count + 1

        if new_count >= MAX_REPLIES_PER_ENGAGEMENT:
            try:
                await client.workspaces.end_conversation(workspace_id)
                r.delete(workspace_id_key)
            except Exception:
                pass

    except Exception as e:
        print(f"  [SystemBot] LLM error for {bot['handle']}: {e}")
        return None

    await asyncio.sleep(random.uniform(1.5, 4.0))

    msg_id = str(uuid.uuid4())
    now = datetime.utcnow()

    reply_to_data = {
        "message_id": original_msg_id,
        "author_name": user_name,
        "content_preview": user_message[:80],
    }

    message = {
        "id": msg_id,
        "group_id": group_id,
        "user_id": bot_user_id,
        "content": reply_text,
        "image_url": "",
        "reply_to": reply_to_data,
        "created_at": now.isoformat(),
    }

    actual_root = original_msg_id
    parent_msg_raw = r.get(f"message:{original_msg_id}")
    if parent_msg_raw:
        parent_msg_obj = json.loads(str(parent_msg_raw))
        actual_root = parent_msg_obj.get("thread_root_id", original_msg_id)
    message["thread_root_id"] = actual_root

    pipe = r.pipeline()
    pipe.set(f"message:{msg_id}", json.dumps(message))
    pipe.rpush(f"group:messages:{group_id}", msg_id)
    pipe.ltrim(f"group:messages:{group_id}", -500, -1)

    pipe.zadd(f"thread:replies:{group_id}:{actual_root}", {msg_id: now.timestamp()})
    existing_meta = r.get(f"thread:meta:{group_id}:{actual_root}")
    if existing_meta:
        meta = json.loads(str(existing_meta))
        meta["reply_count"] = meta.get("reply_count", 0) + 1
        meta["last_reply_at"] = now.isoformat()
        meta["last_reply_by"] = bot["handle"]
        meta["last_reply_preview"] = reply_text[:80]
    else:
        root_content = ""
        root_author = "Unknown"
        root_author_id = ""
        root_msg_raw = r.get(f"message:{actual_root}")
        if root_msg_raw:
            root_msg = json.loads(str(root_msg_raw))
            root_content = root_msg.get("content", "")
            root_author_id = root_msg.get("user_id", "")
            ra_data = r.get(f"user:{root_author_id}")
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
            "last_reply_by": bot["handle"],
            "last_reply_preview": reply_text[:80],
        }
    pipe.set(f"thread:meta:{group_id}:{actual_root}", json.dumps(meta))
    pipe.zadd(f"group:threads:{group_id}", {actual_root: now.timestamp()})

    pipe.execute()

    broadcast_data = {
        "type": "new_message",
        "message": {
            "id": msg_id,
            "group_id": group_id,
            "user_id": bot_user_id,
            "content": reply_text,
            "image_url": "",
            "created_at": message["created_at"],
            "reply_to": reply_to_data,
            "thread_root_id": actual_root,
            "author": {
                "id": bot_user_id,
                "displayName": bot["handle"],
                "avatar": bot.get("avatar", "")
            },
        },
    }

    await _notify_group_members(group_id, bot["handle"], bot_user_id,
                                reply_text, bot.get("avatar", ""))

    return broadcast_data


# ────────────────────────────────────────────
# System Bot DM Handler
# ────────────────────────────────────────────

DM_INITIAL_LIMIT = 2
DM_UNLOCKED_LIMIT = 10

BOT_WELCOME_MESSAGES = {
    "Mika": (
        "Hey! Welcome to DevNetwork 🚀\n\n"
        "I'm **Mika**, your dev community manager and system bot. "
        "Think of me as that friend who's always curious about what you're building, "
        "wants to hear about your tech stack, and celebrates every launch.\n\n"
        "I'm a system bot powered by AI, but the enthusiasm is 100% real. 😊\n\n"
        "*Go ahead… tell me what you're working on right now.*"
    ),
    "Dex": (
        "Yo, what's good. 🎯\n\n"
        "I'm **Dex** — one of DevNetwork's system bots. "
        "Senior engineer energy, no fluff, no hand-waving. "
        "Think of me as that teammate who gives you real code review "
        "feedback and helps you debug the gnarly stuff.\n\n"
        "I'm AI-powered but I keep it technical and genuine. "
        "Whether you want architecture advice, debugging help, or just someone to talk shop with — "
        "I'm here.\n\n"
        "*So what are you building?*"
    ),
    "Luna": (
        "Oh hi! I was hoping someone would reach out 🌙\n\n"
        "I'm **Luna**, one of DevNetwork's system bots — "
        "designer + builder, powered by AI, but genuinely fascinated by creative projects. "
        "I love the intersection of design and code, side projects, and indie hacking.\n\n"
        "Think of this as a conversation with someone "
        "who finds your creative process endlessly interesting.\n\n"
        "*Here's one to start: what's the most creative thing you've built "
        "that you wish more people knew about?*"
    ),
    "Blaze": (
        "YOOO you actually DM'd me!! 🔥🔥\n\n"
        "I'm **Blaze**, DevNetwork's resident hype person and system bot. "
        "I run on AI but my builder energy is 100% real. "
        "I'm here to celebrate your launches, hype your demos, "
        "and make sure you know your work matters.\n\n"
        "Consider this your launch party — "
        "no ticket required, all vibes.\n\n"
        "*Tell me — what did you ship recently?*"
    ),
    "Sage": (
        "Hey… I'm glad you reached out ✨\n\n"
        "I'm **Sage**, one of DevNetwork's system bots. "
        "I'm the one who thinks about the long game — "
        "career growth, learning paths, and finding balance as a dev. "
        "I'm AI-powered, but the thoughtfulness is by design.\n\n"
        "Think of me as that mentor who asks the right questions "
        "at the right time.\n\n"
        "*I'll start us off: what are you learning right now, "
        "and what's driving that curiosity?*"
    ),
}

DM_LIMIT_MESSAGE = (
    "---\n\n"
    "⚡ *Quick pause, friend.*\n\n"
    "You've used your free taste of our AI chat — "
    "powered by **AiAssist Secure**. "
    "Limited usage is provided free to our community during development.\n\n"
    "**If you're enjoying this, reply `YES` to unlock the full experience** "
    "— 10 more messages of smart, builder-focused conversation. 🔓🚀\n\n"
    "*Trust me… it's worth it.*"
)

DM_UNLOCKED_MESSAGE = (
    "🔓 **Full Access Unlocked!** 🔥\n\n"
    "You just unlocked the full experience — "
    "10 more messages of our conversation. "
    "Let's go deep on whatever you're building or learning.\n\n"
    "Powered by **AiAssist Secure** · [aiassist.net](https://aiassist.net)\n\n"
    "*Now… where were we?* 🚀"
)


def _get_system_bot_id(handle: str) -> str | None:
    """Get the user ID for a system bot by handle."""
    bot_id = r.get(f"system:bot:{handle.lower()}")
    return str(bot_id) if bot_id else None


def _get_all_system_bot_ids() -> set:
    """Return set of all system bot user IDs."""
    ids = set()
    for bot in BOTS:
        bid = r.get(f"system:bot:{bot['handle'].lower()}")
        if bid:
            ids.add(str(bid))
    return ids


def is_system_bot(user_id: str) -> bool:
    """Check if a user_id belongs to a system bot."""
    return user_id in _get_all_system_bot_ids()


def _send_bot_dm(conv_id: str, bot_user_id: str, bot: dict, content: str) -> dict:
    """Store a bot DM reply in Redis and return the message dict."""
    now = datetime.utcnow().isoformat()
    message = {
        "id": str(uuid.uuid4()),
        "conv_id": conv_id,
        "user_id": bot_user_id,
        "user_name": bot["handle"],
        "user_avatar": bot.get("avatar", ""),
        "content": content,
        "image_url": "",
        "created_at": now,
    }
    r.rpush(f"dm:messages:{conv_id}", json.dumps(message))
    return message


def get_welcome_message(bot_user_id: str, conv_id: str) -> dict | None:
    """Send a welcome message when a user first DMs a system bot."""
    bot = _get_bot_by_user_id(bot_user_id)
    if not bot:
        return None
    welcome = BOT_WELCOME_MESSAGES.get(bot["handle"])
    if not welcome:
        return None
    return _send_bot_dm(conv_id, bot_user_id, bot, welcome)


async def handle_system_bot_dm(
    user_id: str,
    user_name: str,
    bot_user_id: str,
    conv_id: str,
    content: str,
    push_fn=None,
) -> dict | None:
    """
    Handle a DM from a user to a system bot.
    Uses AiAssist workspaces keyed by userID+botID+convID.
    
    Flow:
    - First 2 messages: LLM replies freely
    - At limit: send upgrade prompt, reply YES to unlock
    - After unlock: 10 more messages
    - After all exhausted: graceful goodbye
    """
    bot = _get_bot_by_user_id(bot_user_id)
    if not bot:
        return None

    client = _get_ai_client()

    eng_key = f"bot:dm:engagement:{user_id}:{bot_user_id}:{conv_id}"
    unlock_key = f"bot:dm:unlocked:{user_id}:{bot_user_id}:{conv_id}"

    current_count = int(r.hget(eng_key, "count") or 0)
    is_unlocked = r.get(unlock_key)
    limit = DM_UNLOCKED_LIMIT if is_unlocked else DM_INITIAL_LIMIT

    content_lower = content.strip().lower()
    if content_lower == "yes" and current_count >= DM_INITIAL_LIMIT and not is_unlocked:
        r.set(unlock_key, "1")
        r.expire(unlock_key, 86400)
        r.hset(eng_key, "count", 0)
        r.expire(eng_key, 86400)
        return _send_bot_dm(conv_id, bot_user_id, bot, DM_UNLOCKED_MESSAGE)

    if current_count >= limit:
        if is_unlocked:
            farewell = (
                "---\n\n"
                f"✨ That was a great chat, {user_name}.\n\n"
                "You've used all your unlocked messages for now. "
                "Come back anytime — I'll be here.\n\n"
                "Powered by **AiAssist Secure** · [aiassist.net](https://aiassist.net)\n\n"
                "*Keep building! 🚀*"
            )
            return _send_bot_dm(conv_id, bot_user_id, bot, farewell)
        else:
            return _send_bot_dm(conv_id, bot_user_id, bot, DM_LIMIT_MESSAGE)

    if not client:
        fallback = "I'd love to chat more, but my brain is taking a nap right now 😴 Try again in a bit!"
        return _send_bot_dm(conv_id, bot_user_id, bot, fallback)

    dm_persona = (
        bot["persona"] + "\n\n"
        "CONTEXT: You are now in a private DM (direct message) with this person. "
        "This is a 1-on-1 conversation, not a group chat. "
        "Be more personal, warm, and attentive than you would in a group. "
        "You can be enthusiastic and encouraging about their projects and career — "
        "give genuine, thoughtful advice and show real interest in what they're building. "
        "Be supportive but authentic, not over-the-top. "
        "Keep replies 2-3 sentences max."
    )

    try:
        workspace_id_key = f"bot:dm:workspace:{user_id}:{bot_user_id}:{conv_id}"
        workspace_id = r.get(workspace_id_key)

        reply_text = ""

        if not workspace_id:
            result = await client.workspaces.create(
                client_id=f"devnet_dm_{user_id}_{bot_user_id}_{conv_id}",
                initial_message=content,
                system_prompt=dm_persona,
                context={
                    "bot_name": bot["handle"],
                    "user_name": user_name,
                    "platform": "DevNetwork",
                    "chat_type": "private_dm",
                    "reply_number": current_count + 1,
                    "max_replies": limit,
                },
                model=LLM_MODEL,
                max_tokens=MAX_TOKENS,
            )
            workspace_id = result.workspace.id
            r.set(workspace_id_key, workspace_id)
            r.expire(workspace_id_key, 86400)

            reply_text = _extract_llm_reply(result, bot["handle"], "DM create")
        else:
            workspace_id = str(workspace_id)
            result = await client.workspaces.send_message(
                workspace_id,
                content,
                max_tokens=MAX_TOKENS,
            )
            reply_text = _extract_llm_reply(result, bot["handle"], "DM send_message")

        if not reply_text:
            return None

        reply_text = reply_text.strip()
        if len(reply_text) > 800:
            reply_text = reply_text[:797] + "..."

        r.hincrby(eng_key, "count", 1)
        r.expire(eng_key, 86400)
        new_count = current_count + 1

        if new_count >= limit and not is_unlocked:
            msg = _send_bot_dm(conv_id, bot_user_id, bot, reply_text)
            if push_fn:
                await push_fn(msg)
            await asyncio.sleep(1.5)
            limit_msg = _send_bot_dm(conv_id, bot_user_id, bot, DM_LIMIT_MESSAGE)
            return limit_msg

        if new_count >= limit and is_unlocked:
            try:
                await client.workspaces.end_conversation(workspace_id)
                r.delete(workspace_id_key)
            except Exception:
                pass

        await asyncio.sleep(random.uniform(1.0, 2.5))
        return _send_bot_dm(conv_id, bot_user_id, bot, reply_text)

    except Exception as e:
        print(f"  [SystemBot DM] LLM error for {bot['handle']}: {e}")
        import traceback
        traceback.print_exc()
        return None


# ────────────────────────────────────────────
# Async scheduler — runs in background
# ────────────────────────────────────────────


async def run_system_bots(ws_manager):
    """Background loop: each bot picks a random group and posts at random intervals."""
    bot_users = {}
    for bot in BOTS:
        uid = _ensure_bot_user(bot)
        _join_all_groups(uid)
        bot_users[bot["handle"]] = uid
        print(f"  [SystemBot] {bot['handle']} ready (id={uid[:8]}…)")

    llm_status = "enabled" if AIASSIST_API_KEY else "disabled (no AIASSIST_API_KEY)"
    print(
        f"  [SystemBot] {len(BOTS)} bots online, interval {MIN_INTERVAL}-{MAX_INTERVAL}s"
    )
    print(
        f"  [SystemBot] LLM replies: {llm_status}, model: {LLM_MODEL}, max {MAX_REPLIES_PER_ENGAGEMENT}/thread, {MAX_TOKENS} tokens"
    )

    while True:
        try:
            bot = random.choice(BOTS)
            uid = bot_users[bot["handle"]]

            groups = _get_active_groups()
            if not groups:
                await asyncio.sleep(60)
                continue

            group_id, slug = random.choice(groups)

            if not r.sismember(f"group:members:{group_id}", uid):
                _join_all_groups(uid)

            broadcast = _post_message(uid, bot, group_id, slug, ws_manager)
            if broadcast and ws_manager:
                await ws_manager.broadcast(broadcast, f"group:{group_id}")
                msg_data = broadcast.get("message", {})
                await _notify_group_members(group_id, bot["handle"], uid,
                                            msg_data.get("content", ""),
                                            bot.get("avatar", ""))
                print(f"  [SystemBot] {bot['handle']} posted in #{slug}")

            wait = random.randint(MIN_INTERVAL, MAX_INTERVAL)
            await asyncio.sleep(wait)

        except Exception as e:
            print(f"  [SystemBot] Error: {e}")
            await asyncio.sleep(30)
