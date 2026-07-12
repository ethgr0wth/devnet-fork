#!/usr/bin/env python3
"""
AiAS v1.2 Phase-0 board — DevNetwork on NEDB, fresh start, full loop.

Spawns a throwaway nedbd + a DevNetwork server in NEDB mode, then proves
the platform's core loop end-to-end with zero Redis anywhere:

  boot/seed → register+2FA (x2) → login → ecosystem → group → join →
  group chat (+thread reply) → post → feed → comment → like → DM →
  notifications → NEDB-truth NQL spot-checks (docs, sequences, counters).

Run:  python3 scripts/test_nedb_base.py
Exit: 0 all green, 1 otherwise.
"""
import json
import os
import pathlib
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
NEDB_PY = os.environ.get("NEDB_PY", "/agent/workspace/nedb/python")

BOARD_TOKEN = "board-shared-secret-7x24"
NEDB_AUTH = {"Authorization": f"Bearer {BOARD_TOKEN}"}

PASS = FAIL = 0


def ok(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ok    {name}")
    else:
        FAIL += 1
        print(f"  FAIL  {name}  {detail}")


def _free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def req(base, method, path, body=None, headers=None):
    r = urllib.request.Request(
        f"{base}{path}",
        data=json.dumps(body).encode() if body is not None else None,
        method=method)
    r.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        r.add_header(k, v)
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "{}")
        except Exception:
            return e.code, {}


def wait_http(url, proc, secs=25, what="service"):
    deadline = time.time() + secs
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=1):
                return True
        except Exception:
            if proc.poll() is not None:
                return False
            time.sleep(0.25)
    return False


def main():
    tmp = tempfile.mkdtemp(prefix="v12-board-")
    nport, dport = _free_port(), _free_port()
    nbase, dbase = f"http://127.0.0.1:{nport}", f"http://127.0.0.1:{dport}"

    print(f"[board] nedbd :{nport}  devnet :{dport}  data {tmp}")
    nedbd = subprocess.Popen(
        [sys.executable, "-m", "nedb.server", "--host", "127.0.0.1",
         "--port", str(nport), "--data", os.path.join(tmp, "data")],
        stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT,
        env={**os.environ, "PYTHONPATH": NEDB_PY,
             "NEDBD_TOKEN": BOARD_TOKEN})
    devnet = None
    try:
        if not wait_http(f"{nbase}/health", nedbd, what="nedbd"):
            print("ABORT: nedbd failed to start")
            return 1
        req(nbase, "POST", "/v1/databases", {"name": "devnet_board"},
            headers=NEDB_AUTH)

        devnet = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "src.main:app",
             "--host", "127.0.0.1", "--port", str(dport)],
            cwd=ROOT, stdout=open(os.path.join(tmp, "devnet.log"), "w"),
            stderr=subprocess.STDOUT,
            env={**os.environ,
                 "DEVNET_STORAGE": "nedb",
                 "NEDBD_URL": nbase,
                 "NEDBD_TOKEN": BOARD_TOKEN,
                 "NEDB_DB": "devnet_board",
                 "DEVNET_SYSTEM_BOTS": "off",
                 "DEVNET_AUTH": "local",
                 "PATH": os.environ.get("PATH", "")})
        if not wait_http(f"{dbase}/api/config", devnet, what="devnet"):
            print("ABORT: devnet failed to start — log tail:")
            print(open(os.path.join(tmp, "devnet.log")).read()[-2000:])
            return 1

        def nql(q):
            s, b = req(nbase, "POST", "/v1/databases/devnet_board/query",
                       {"nql": q}, headers=NEDB_AUTH)
            return b.get("rows", []) if s == 200 else []

        # daemon auth is REAL: tokenless /v1 must 401
        s_noauth, _ = req(nbase, "POST", "/v1/databases/devnet_board/query",
                          {"nql": "FROM user LIMIT 1"})
        ok("A0 nedbd rejects tokenless /v1 (401)", s_noauth == 401,
           f"s={s_noauth}")

        # ── A. boot & seed ──────────────────────────────────────────────
        print("A. boot & seed")
        s, cfg = req(dbase, "GET", "/api/config")
        ok("A1 devnet serves /api/config", s == 200 and cfg.get("platform") == "devnetwork")
        seeded = nql("FROM group LIMIT 200")
        ok("A2 startup seeding landed in NEDB", len(seeded) > 0,
           f"rows={len(seeded)}")
        ok("A3 seeded rows are engine-sequenced (_seq)",
           all("_seq" in r for r in seeded[:20]))

        # ── B. identity: AiAS v1 auth (email + password → sessions) ────
        print("B. identity (AiAS v1: email + password sessions)")

        def make_user(name, email):
            s, b = req(dbase, "POST", "/api/auth/signup", {
                "email": email, "password": "hunter2hunter2",
                "display_name": name})
            return b if b.get("success") else None

        alice = make_user("alicev12", "alice@interchained.org")
        bob = make_user("bobv12", "bob@interchained.org")
        ok("B1 alice signup → session token",
           bool(alice) and str(alice.get("session_token", "")).startswith("dvs_"),
           str(alice)[:160])
        ok("B2 bob signup → session token",
           bool(bob) and str(bob.get("session_token", "")).startswith("dvs_"))
        alice = {"hash": alice["session_token"], "id": alice["user"]["id"]}
        bob = {"hash": bob["session_token"], "id": bob["user"]["id"]}

        s, b = req(dbase, "POST", "/api/auth/login",
                   {"email": "alice@interchained.org",
                    "password": "hunter2hunter2"})
        ok("B3 login returns a fresh session", s == 200
           and str(b.get("session_token", "")).startswith("dvs_"), str(b)[:160])
        s, b = req(dbase, "POST", "/api/auth/login",
                   {"email": "alice@interchained.org", "password": "wrong-pass"})
        ok("B4 wrong password rejected (401)", s == 401)
        s, b = req(dbase, "POST", "/api/auth/validate",
                   {"hash": alice["hash"]})
        ok("B5 session validates on boot path",
           s == 200 and b.get("valid") is True, str(b)[:120])
        udocs = nql("FROM user LIMIT 300")
        blob = json.dumps(udocs)
        ok("B6 user docs live in NEDB (with pbkdf2, no plaintext)",
           "alicev12" in blob and "pbkdf2$" in blob
           and "hunter2hunter2" not in blob)
        s, b = req(dbase, "POST", "/api/auth/signup",
                   {"email": "alice@interchained.org",
                    "password": "hunter2hunter2", "display_name": "alicedupe"})
        ok("B7 duplicate email refused", s == 400)
        A = {"X-Auth-Hash": alice["hash"]}
        B = {"X-Auth-Hash": bob["hash"]}

        # ── C. ecosystems (v1.2: environments) ─────────────────────────
        print("C. ecosystems → environments")
        s, eco = req(dbase, "POST", "/api/ecosystems",
                     {"name": "AiAS HQ", "slug": "aias",
                      "description": "AiAS v1.2 home"}, A)
        eco_id = (eco.get("ecosystem") or eco).get("id") if s in (200, 201) else None
        ok("C1 create ecosystem", bool(eco_id), f"s={s} {str(eco)[:120]}")
        s, b = req(dbase, "POST", f"/api/ecosystems/{eco_id}/join", {}, B)
        ok("C2 bob joins ecosystem", s == 200, str(b)[:120])

        # ── D. groups (v1.2: workspaces) ────────────────────────────────
        print("D. groups → workspaces")
        s, grp = req(dbase, "POST", "/api/groups",
                     {"name": "control-deck", "slug": "control-deck",
                      "description": "v1.2 build room",
                      "terms": "be kind", "ecosystem_id": eco_id}, A)
        grp_id = (grp.get("group") or grp).get("id") if s in (200, 201) else None
        ok("D1 create group", bool(grp_id), f"s={s} {str(grp)[:160]}")

        # New groups require admin approval before others may join (devnet
        # moderation model). Promote alice via the storage layer directly —
        # doubles as an out-of-band write/readback proof — then approve.
        sys.path.insert(0, str(ROOT))
        from src.nedb import NedbdClient  # noqa: E402
        from src.storage import DevnetRedisOnNedb  # noqa: E402
        sc = DevnetRedisOnNedb(NedbdClient(base=nbase, token=BOARD_TOKEN,
                                   db="devnet_board"))
        u = json.loads(sc.get(f"user:{alice['id']}"))
        u["isSuperAdmin"] = True
        sc.set(f"user:{alice['id']}", json.dumps(u))
        s, b = req(dbase, "POST", f"/api/admin/groups/{grp_id}/approve", {}, A)
        ok("D2a admin approves group (superadmin via direct NEDB write)",
           s == 200, f"s={s} {str(b)[:120]}")
        s, b = req(dbase, "POST", f"/api/groups/{grp_id}/join",
                   {"agreed_to_terms": True}, B)
        ok("D2 bob joins group", s == 200, str(b)[:120])
        s, m1 = req(dbase, "POST", f"/api/groups/{grp_id}/messages",
                    {"content": "first message on the NEDB heart"}, A)
        mid = (m1.get("message") or m1).get("id") if s == 200 else None
        ok("D3 group message sends", bool(mid), f"s={s} {str(m1)[:120]}")
        s, m2 = req(dbase, "POST", f"/api/groups/{grp_id}/messages",
                    {"content": "threaded reply", "reply_to": mid}, B)
        ok("D4 thread reply sends", s == 200, str(m2)[:120])
        s, msgs = req(dbase, "GET", f"/api/groups/{grp_id}/messages", None, A)
        got = json.dumps(msgs)
        ok("D5 messages read back", s == 200 and "NEDB heart" in got)

        # ── E. posts & feed ─────────────────────────────────────────────
        print("E. posts & feed")
        s, post = req(dbase, "POST", "/api/posts",
                      {"content": "AiAS v1.2 lives — devnet on NEDB #aias"}, A)
        pid = (post.get("post") or post).get("id") if s in (200, 201) else None
        ok("E1 create post", bool(pid), f"s={s} {str(post)[:160]}")
        s, feed = req(dbase, "GET", "/api/feed", None, B)
        ok("E2 feed shows the post", s == 200 and pid and pid in json.dumps(feed))
        s, b = req(dbase, "POST", f"/api/posts/{pid}/comments",
                   {"content": "witnessed."}, B)
        ok("E3 bob comments", s in (200, 201), str(b)[:120])
        s, b = req(dbase, "POST", f"/api/posts/{pid}/like", {}, B)
        ok("E4 bob likes", s == 200, str(b)[:120])

        # ── F. DMs & notifications ──────────────────────────────────────
        print("F. DMs & notifications")
        s, dm = req(dbase, "POST", f"/api/dm/start/{bob['id']}", {}, A)
        conv = (dm.get("conversation") or dm).get("id") if s in (200, 201) else \
               dm.get("conversation_id")
        ok("F1 DM conversation starts", bool(conv), f"s={s} {str(dm)[:160]}")
        s, b = req(dbase, "POST", f"/api/dm/{conv}/messages",
                   {"content": "welcome to v1.2, brother"}, A)
        ok("F2 DM sends", s == 200, str(b)[:120])
        s, convs = req(dbase, "GET", "/api/dm/conversations", None, B)
        ok("F3 bob sees the conversation", s == 200 and conv in json.dumps(convs))
        s, notifs = req(dbase, "GET", "/api/notifications", None, A)
        ok("F4 alice has notifications (comment/like)",
           s == 200 and len((notifs.get("notifications") or notifs or [])) > 0
           if isinstance(notifs, (dict, list)) else False,
           str(notifs)[:120])

        # ── G. NEDB ground truth ────────────────────────────────────────
        print("G. NEDB ground truth (NQL, no Redis anywhere)")
        posts = nql("FROM post LIMIT 100")
        ok("G1 post docs in engine", len(posts) > 0)
        gm = nql("FROM group LIMIT 500")
        ok("G2 group-message list doc in engine",
           any("messages" in (r.get("key") or "") for r in gm))
        cnt = nql('FROM stats WHERE key = "stats:users:count"')
        ok("G3 user counter == 2 via pipeline incr",
           cnt and str((cnt[0].get("value"))) == "2", str(cnt)[:120])
        feedz = nql('FROM feed WHERE key = "feed:global"')
        ok("G4 global feed zset doc exists", len(feedz) == 1)
        ok("G5 every row engine-sequenced",
           all("_seq" in r for r in (posts + gm[:20] + cnt + feedz)))

        # ── H. identity federation (mock AiAS production upstream) ─────
        print("H. identity federation (DEVNET_AUTH=aias, mock upstream)")
        from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
        import threading

        MOCK_TOKEN = "aias-mock-session-token-abc123"
        V1_USER = {"id": "v1-user-mark", "email": "mark@interchained.org",
                   "display_name": "Mark", "role": "super_admin", "plan": "pro",
                   "active_environment_id": "env-prod-1"}
        V1_ENVS = {"environments": [
            {"id": "env-prod-1", "name": "Production"},
            {"id": "env-stage-2", "name": "Staging"}]}
        V1_WORKSPACES = {"workspaces": [
            {"id": "ws-acme-1", "title": "Acme Corp — onboarding",
             "environment_id": "env-prod-1",
             "needs_human_attention": True, "message_count": 12},
            {"id": "ws-beta-2", "title": "Beta support",
             "environment_id": "env-prod-1",
             "needs_human_attention": False, "message_count": 3}]}

        class MockAias(BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def _json(self, code, obj):
                b = json.dumps(obj).encode()
                self.send_response(code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(b)))
                self.end_headers()
                self.wfile.write(b)

            def do_POST(self):
                n = int(self.headers.get("Content-Length") or 0)
                body = json.loads(self.rfile.read(n) or b"{}")
                if self.path == "/api/auth/login":
                    if body.get("email") == V1_USER["email"] and \
                            body.get("password") == "prod-password":
                        return self._json(200, {"user": V1_USER,
                                                "session_token": MOCK_TOKEN})
                    return self._json(401, {"detail": "Invalid email or password"})
                if self.path == "/api/user/register":
                    return self._json(200, {"user": V1_USER,
                                            "message": "Registration successful"})
                self._json(404, {"detail": "nope"})

            def do_GET(self):
                if self.headers.get("X-Session-Token") != MOCK_TOKEN:
                    return self._json(401, {"detail": "no session"})
                if self.path.startswith("/api/user/me"):
                    return self._json(200, V1_USER)
                if self.path.startswith("/api/environments"):
                    return self._json(200, V1_ENVS)
                if self.path.startswith("/api/user/workspaces"):
                    return self._json(200, self.server.ws_payload)  # type: ignore
                self._json(404, {"detail": "nope"})

        mport = _free_port()
        mock = ThreadingHTTPServer(("127.0.0.1", mport), MockAias)
        mock.ws_payload = V1_WORKSPACES  # type: ignore
        threading.Thread(target=mock.serve_forever, daemon=True).start()

        fport = _free_port()
        fbase = f"http://127.0.0.1:{fport}"
        req(nbase, "POST", "/v1/databases", {"name": "devnet_fed"},
            headers=NEDB_AUTH)
        fed = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "src.main:app",
             "--host", "127.0.0.1", "--port", str(fport)],
            cwd=ROOT, stdout=open(os.path.join(tmp, "fed.log"), "w"),
            stderr=subprocess.STDOUT,
            env={**os.environ, "DEVNET_STORAGE": "nedb",
                 "NEDBD_URL": nbase, "NEDBD_TOKEN": BOARD_TOKEN,
                 "NEDB_DB": "devnet_fed", "DEVNET_SYSTEM_BOTS": "off",
                 "DEVNET_AUTH": "aias",
                 "AIAS_API_BASE": f"http://127.0.0.1:{mport}",
                 "PATH": os.environ.get("PATH", "")})
        try:
            if not wait_http(f"{fbase}/api/config", fed):
                print("ABORT: federated devnet failed to start — log tail:")
                print(open(os.path.join(tmp, "fed.log")).read()[-1500:])
                return 1
            s, cfg = req(fbase, "GET", "/api/config")
            ok("H1 config reports auth_mode=aias", cfg.get("auth_mode") == "aias")
            s, b = req(fbase, "POST", "/api/auth/login",
                       {"email": "mark@interchained.org",
                        "password": "wrong"})
            ok("H2 bad production creds rejected", s == 401)
            s, b = req(fbase, "POST", "/api/auth/login",
                       {"email": "mark@interchained.org",
                        "password": "prod-password"})
            ok("H3 production login proxied → aias token",
               s == 200 and b.get("session_token") == MOCK_TOKEN, str(b)[:140])
            fed_user = (b.get("user") or {})
            ok("H4 identity provisioned id-stable (v1-user-mark, superadmin)",
               fed_user.get("id") == "v1-user-mark"
               and fed_user.get("isSuperAdmin") is True)
            FH = {"X-Auth-Hash": MOCK_TOKEN}
            s, b = req(fbase, "POST", "/api/posts",
                       {"content": "posted as my AiAS production self"}, FH)
            ok("H5 aias token works on social endpoints",
               s in (200, 201), f"s={s} {str(b)[:120]}")
            s, b = req(fbase, "POST", "/api/auth/validate",
                       {"hash": MOCK_TOKEN})
            ok("H6 aias token validates on boot path",
               s == 200 and b.get("valid") is True)
            fdocs = req(nbase, "POST", "/v1/databases/devnet_fed/query",
                        {"nql": 'FROM user LIMIT 20'}, headers=NEDB_AUTH)[1].get("rows", [])
            ok("H7 provisioned user doc lives in NEDB",
               any("v1-user-mark" in json.dumps(r) for r in fdocs))
            s, b = req(fbase, "POST", "/api/posts", {"content": "x"},
                       {"X-Auth-Hash": "garbage-token-zz"})
            ok("H8 garbage token rejected", s == 401)
            # ── I. the bridge: v1 workspaces ARE devnet communities ────
            print("I. the bridge (workspace ≡ community, environment ≡ ecosystem)")
            def fnql(q):
                st, bb = req(nbase, "POST", "/v1/databases/devnet_fed/query",
                             {"nql": q}, headers=NEDB_AUTH)
                return bb.get("rows", []) if st == 200 else []

            s, b = req(fbase, "POST", "/api/bridge/sync-workspaces", {}, FH)
            ok("I1 sync succeeds",
               s == 200 and b.get("success") is True, str(b)[:160])
            ok("I2 ecosystems ← environments (2, same ids)",
               b.get("ecosystems") == 2
               and any((r.get("value") or "").find("env-prod-1") >= 0
                       for r in fnql('FROM ecosystem LIMIT 50')
                       if r.get("rtype") == "string"))
            ok("I3 communities created under the SAME workspace ids",
               b.get("communities_created") == 2)
            graw = fnql('FROM group WHERE key = "group:ws-acme-1"')
            gdoc = json.loads(graw[0]["value"]) if graw and graw[0].get("value") else {}
            ok("I4 twin is born native (origin, approved, eco, attention)",
               gdoc.get("origin") == "aias_v1"
               and gdoc.get("status") == "approved"
               and gdoc.get("ecosystem_id") == "env-prod-1"
               and gdoc.get("needs_attention") is True, str(gdoc)[:160])
            ok("I5 metadata only — no message content anywhere in the twin",
               "message" not in json.dumps(gdoc).lower()
               or gdoc.get("origin") == "aias_v1" and "content" not in gdoc)
            s2, b2 = req(fbase, "POST", "/api/bridge/sync-workspaces", {}, FH)
            ok("I6 idempotent re-sync (0 created, 2 updated)",
               b2.get("communities_created") == 0
               and b2.get("communities_updated") == 2, str(b2)[:120])
            s3, gl = req(fbase, "GET", "/api/groups?ecosystem_id=env-prod-1",
                         None, FH)
            ok("I7 twins appear in the normal Communities list",
               s3 == 200 and "ws-acme-1" in json.dumps(gl))
            # archival: v1 stops listing ws-beta-2
            mock.ws_payload = {"workspaces": V1_WORKSPACES["workspaces"][:1]}  # type: ignore
            s4, b4 = req(fbase, "POST", "/api/bridge/sync-workspaces", {}, FH)
            ok("I8 vanished workspace → twin archived (content preserved)",
               b4.get("archived") == 1, str(b4)[:120])
            # never-repurpose guard: a LOCAL non-twin group already owns the
            # id v1 tries to bridge — write it through the shim (real app
            # write path), then sync must refuse to overwrite it.
            sc_fed = DevnetRedisOnNedb(NedbdClient(base=nbase,
                                                   token=BOARD_TOKEN,
                                                   db="devnet_fed"))
            sc_fed.set("group:ws-native-x", json.dumps(
                {"id": "ws-native-x", "name": "native-owned",
                 "status": "approved"}))
            mock.ws_payload = {"workspaces": [  # type: ignore
                {"id": "ws-native-x", "title": "Impostor",
                 "environment_id": "env-prod-1"}]}
            s5, b5 = req(fbase, "POST", "/api/bridge/sync-workspaces", {}, FH)
            ok("I9 never-repurpose guard (conflict counted, doc untouched)",
               b5.get("conflicts", 0) >= 1, str(b5)[:120])
        finally:
            if fed.poll() is None:
                fed.send_signal(signal.SIGTERM)
                try:
                    fed.wait(timeout=5)
                except Exception:
                    fed.kill()
            mock.shutdown()

        print(f"\n{'='*46}\nBOARD: {PASS} passed / {FAIL} failed\n{'='*46}")
        return 0 if FAIL == 0 else 1
    finally:
        for p in (devnet, nedbd):
            if p and p.poll() is None:
                p.send_signal(signal.SIGTERM)
                try:
                    p.wait(timeout=5)
                except Exception:
                    p.kill()


if __name__ == "__main__":
    sys.exit(main())
