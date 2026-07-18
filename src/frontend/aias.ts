/**
 * AiAS weave — v1 surfaces as native DevNetwork views.
 *
 * SAME-ORIGIN (Mark: "every v1 surface belongs on devnet"): the browser
 * NEVER dials the aias API base directly. Every call is a relative /api
 * path — devnet serves its own routes and proxies unmatched v1 prefixes
 * server-side with the caller's federated token. The old direct-dial mode
 * leaked internal upstream addresses (e.g. 127.0.0.1:8000) into browser
 * fetches whenever AIAS_API_BASE pointed at loopback. Never again.
 *
 * `appBase` remains for LINK-OUTS only (opening the v1 web app in a new
 * tab) — a public web address, sourced from the sanitized `aias_app_base`
 * config key, never the API upstream.
 */

const AIAS_TOKEN_KEY = "aias_session_token";

// ── bridge ───────────────────────────────────────────────────────────────────

export class AiasBridge {
  /** API base: always same-origin. Kept as a field for call-site parity. */
  base = "";
  /** v1 web app for link-outs (new-tab opens) — NEVER used for fetches. */
  appBase = "https://aiassist.net";

  async init(): Promise<void> {
    try {
      const res = await fetch("/api/config");
      const cfg = await res.json();
      if (cfg.aias_app_base) this.appBase = String(cfg.aias_app_base).replace(/\/$/, "");
      // v2 identity federation: ONE identity. The token you signed in with
      // IS the aias production token — the weave adopts it automatically,
      // so the connect card never appears in federated mode.
      if (cfg.auth_mode === "aias") {
        const t = localStorage.getItem("devnetwork_hash");
        if (t && !t.startsWith("dvs_")) localStorage.setItem(AIAS_TOKEN_KEY, t);
      }
    } catch { /* keep defaults */ }
  }

  get token(): string | null {
    return localStorage.getItem(AIAS_TOKEN_KEY);
  }

  set token(v: string | null) {
    if (v) localStorage.setItem(AIAS_TOKEN_KEY, v);
    else localStorage.removeItem(AIAS_TOKEN_KEY);
  }

  get connected(): boolean {
    return !!this.token;
  }

  async api(path: string, init: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> || {}),
    };
    // Same-origin: relative path; devnet's v1 proxy accepts the token on
    // either header (parity with the v1 runtime's queryClient).
    if (this.token) {
      headers["X-Session-Token"] = this.token;
      headers["X-Auth-Hash"] = this.token;
    }
    return fetch(path, { ...init, headers });
  }

  async json<T = any>(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; data: T }> {
    const res = await this.api(path, init);
    let data: any = null;
    try { data = await res.json(); } catch { /* empty body */ }
    return { ok: res.ok, status: res.status, data };
  }

  /** email+password → session; returns {ok} | {twofa, pending} | {error}. */
  async login(email: string, password: string):
      Promise<{ ok?: true; twofa?: true; pending?: string; error?: string }> {
    const { ok, data } = await this.json<any>("/api/auth/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    });
    if (data?.requires_2fa && data?.pending_token) return { twofa: true, pending: data.pending_token };
    if (ok && data?.session_token) { this.token = data.session_token; return { ok: true }; }
    return { error: data?.detail || data?.error || "Sign-in failed." };
  }

  async verify2fa(pending: string, code: string): Promise<{ ok?: true; error?: string }> {
    const { ok, data } = await this.json<any>("/api/auth/verify-2fa", {
      method: "POST", body: JSON.stringify({ pending_token: pending, code }),
    });
    if (ok && data?.session_token) { this.token = data.session_token; return { ok: true }; }
    return { error: data?.detail || data?.error || "Invalid code." };
  }

  disconnect(): void { this.token = null; }
}

export const aias = new AiasBridge();

// ── superseded (2026-07-13) ──────────────────────────────────────────────────
// This file used to also own a hand-rolled Playground view + a "docked" stub
// system (renderConnect/DOCKED/renderDocked/PlaygroundView/showAiasView) that
// rendered cards describing FUTURE work directly to end users — e.g. "Arriving
// as a native AiOS app — no iframes." on a LIVE app. It predates AiosShell's
// real AppWindow/APP_COMPONENTS system and had been fully superseded — its
// one caller (app.ts's showAias) had zero remaining call sites of its own.
// Removed outright rather than left dormant: dead code that describes missing
// features to users is a landmine waiting to get re-wired by accident. If a
// FUTURE app genuinely isn't ported yet, AiosShell's ComingOnline panel is the
// one honest, generic fallback — extend that, don't resurrect this file.
