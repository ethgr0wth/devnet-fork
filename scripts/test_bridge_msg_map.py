#!/usr/bin/env python3
"""
Test the v1-workspace → community-room message mapping used when a bridged
community (origin aias_v1) loads its history. The room renders msg.user_id
(isMe check), msg.content, msg.created_at, msg.author.displayName/avatar.

Run: python3 scripts/test_bridge_msg_map.py
"""
import ast
import sys

# Extract _map_v1_workspace_messages from main.py without importing the whole
# FastAPI app (no server / deps needed for a pure function).
src = open("src/main.py").read()
tree = ast.parse(src)
fn = next(n for n in tree.body
          if isinstance(n, ast.FunctionDef) and n.name == "_map_v1_workspace_messages")
ns = {}
exec(compile(ast.Module([fn], []), "main.py", "exec"), ns)
mapv1 = ns["_map_v1_workspace_messages"]

passed = 0
def check(name, cond):
    global passed
    if cond:
        passed += 1; print(f"  ok  {name}")
    else:
        print(f"  FAIL {name}"); raise SystemExit(1)

V1 = [
    {"id": "m1", "role": "user", "content": "hi", "created_at": "2026-07-14T10:00:00"},
    {"id": "m2", "role": "ai", "content": "hello", "created_at": "2026-07-14T10:00:05"},
    {"id": "m3", "role": "manager", "content": "jumping in", "created_at": "2026-07-14T10:01:00"},
    {"id": "m4", "role": "assistant", "content": "alias", "created_at": "2026-07-14T10:02:00"},
    {"id": "m5", "content": "no role", "timestamp": "2026-07-14T10:03:00"},
]
out = mapv1(V1, "user-mark", "Mark")

check("count preserved", len(out) == 5)
check("user → Client, non-viewer id", out[0]["author"]["displayName"] == "Client" and out[0]["user_id"] == "aias:client")
check("ai → AI", out[1]["author"]["displayName"] == "AI" and out[1]["user_id"] == "aias:ai")
check("manager → viewer id (renders as me)", out[2]["user_id"] == "user-mark" and out[2]["author"]["displayName"] == "Mark")
check("assistant aliases to AI", out[3]["user_id"] == "aias:ai")
check("missing role defaults to user/Client", out[4]["user_id"] == "aias:client")
check("content + created_at carried", out[0]["content"] == "hi" and out[0]["created_at"] == "2026-07-14T10:00:00")
check("timestamp fallback when no created_at", out[4]["created_at"] == "2026-07-14T10:03:00")
check("required render fields present", all(
    set(m) >= {"id", "user_id", "content", "created_at", "author"} and
    set(m["author"]) >= {"id", "displayName", "avatar"} for m in out))
check("origin tagged aias_v1", all(m["origin"] == "aias_v1" for m in out))
check("empty in → empty out", mapv1([], "u", "n") == [])

print(f"\nAll {passed} tests passed.")
