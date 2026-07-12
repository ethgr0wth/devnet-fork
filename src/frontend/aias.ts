/**
 * AiAS weave — v1 surfaces as native DevNetwork views.
 *
 * The bridge: aias v1 accepts requests from ANY origin via header sessions
 * (X-Session-Token), so devnet views call it directly — v1 brain, devnet
 * skin, no proxy. The token is connected once (email + password, optional
 * TOTP) and stored client-side, independent of the devnet session.
 *
 * First native view: Playground (sessions → SSE chat → model settings).
 * KeyStone / Artifacts / Image / Agents dock as link-outs until each gets
 * the same native treatment.
 */

const AIAS_TOKEN_KEY = "aias_session_token";

// ── bridge ───────────────────────────────────────────────────────────────────

export class AiasBridge {
  base = "https://api.aiassist.net";

  async init(): Promise<void> {
    try {
      const res = await fetch("/api/config");
      const cfg = await res.json();
      if (cfg.aias_api_base) this.base = String(cfg.aias_api_base).replace(/\/$/, "");
      // v2 identity federation: ONE identity. The token you signed in with
      // IS the aias production token — the weave adopts it automatically,
      // so the connect card never appears in federated mode.
      if (cfg.auth_mode === "aias") {
        const t = localStorage.getItem("devnetwork_hash");
        if (t && !t.startsWith("dvs_")) localStorage.setItem(AIAS_TOKEN_KEY, t);
      }
    } catch { /* keep default */ }
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
    if (this.token) headers["X-Session-Token"] = this.token;
    return fetch(`${this.base}${path}`, { ...init, headers });
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

// ── small utils ──────────────────────────────────────────────────────────────

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

// ── connect card (shared by all aias views) ─────────────────────────────────

function renderConnect(container: HTMLElement, onConnected: () => void): void {
  container.innerHTML = `
    <div class="flex items-center justify-center h-full px-4">
      <div class="max-w-sm w-full bg-zinc-900/70 border border-zinc-800 rounded-xl p-6 slide-up">
        <div class="text-center mb-4">
          <div class="text-2xl mb-1">🔗</div>
          <h2 class="text-lg font-bold">Connect AiAssist</h2>
          <p class="text-zinc-400 text-sm mt-1">Inline AiAS tools run on your v1 account. One-time connect — the session is stored on this device.</p>
        </div>
        <form id="aias-connect-form" class="space-y-3">
          <input type="email" name="email" class="input" placeholder="you@company.com" required autocomplete="email" />
          <input type="password" name="password" class="input" placeholder="AiAssist password" required autocomplete="current-password" />
          <div id="aias-2fa-row" class="hidden">
            <input type="text" name="code" class="input font-mono text-center tracking-widest" placeholder="000000" maxlength="6" pattern="[0-9]{6}" inputmode="numeric" autocomplete="one-time-code" />
          </div>
          <p id="aias-connect-err" class="hidden text-sm text-red-400"></p>
          <button type="submit" class="btn btn-gradient w-full py-2.5">Connect</button>
        </form>
      </div>
    </div>`;

  let pending: string | null = null;
  const err = (m: string) => {
    const el = document.getElementById("aias-connect-err")!;
    el.textContent = m; el.classList.remove("hidden");
  };

  document.getElementById("aias-connect-form")!.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    if (pending) {
      const r = await aias.verify2fa(pending, String(fd.get("code") || ""));
      if (r.ok) return onConnected();
      return err(r.error || "Invalid code.");
    }
    const r = await aias.login(String(fd.get("email") || ""), String(fd.get("password") || ""));
    if (r.ok) return onConnected();
    if (r.twofa && r.pending) {
      pending = r.pending;
      document.getElementById("aias-2fa-row")!.classList.remove("hidden");
      err("Enter the 6-digit code from your authenticator.");
      return;
    }
    err(r.error || "Sign-in failed.");
  });
}

// ── docked views (link-out until nativized) ──────────────────────────────────

const DOCKED: Record<string, { title: string; blurb: string; path: string; icon: string }> = {
  keystone:  { title: "KeyStone",  blurb: "Build & ship full apps in the KeyStone IDE. Arriving as a native AiOS app — no iframes.", path: "/keystone", icon: "💎" },
  artifacts: { title: "Artifacts", blurb: "The agent artifact generator — already translated to the Portal client, docked here from v1.", path: "/dashboard/artifact-portal", icon: "✨" },
  image:     { title: "Image Studio", blurb: "Generate and edit imagery with your BYOK providers.", path: "/dashboard/image-workstation", icon: "🖼️" },
  agents:    { title: "Agents", blurb: "Your deployed v1 agents. Phase 2 registers them as first-class DevNet citizens through the bot platform.", path: "/dashboard/deployed-agents", icon: "🤖" },
};

function renderDocked(container: HTMLElement, key: string, appBase: string): void {
  const d = DOCKED[key];
  container.innerHTML = `
    <div class="flex items-center justify-center h-full px-4">
      <div class="max-w-md w-full bg-zinc-900/70 border border-zinc-800 rounded-xl p-6 text-center slide-up">
        <div class="text-3xl mb-2">${d.icon}</div>
        <h2 class="text-xl font-bold mb-1">${esc(d.title)}</h2>
        <p class="text-zinc-400 text-sm mb-4">${esc(d.blurb)}</p>
        <a href="${appBase}${d.path}" target="_blank" rel="noopener noreferrer" class="btn btn-gradient w-full py-2.5 inline-block">Open ${esc(d.title)} ↗</a>
        <p class="text-[11px] text-zinc-500 mt-3">Runs on your connected AiAssist account</p>
      </div>
    </div>`;
}

// ── Playground: the first NATIVE inline view ─────────────────────────────────

interface PgSession {
  id: string; name: string; model_provider: string; model_name: string;
  message_count?: number; updated_at?: string; messages?: PgMessage[];
}
interface PgMessage { id: string; role: string; content: string; timestamp?: string; }
interface Provider { id: string; name: string; models?: { id: string; name: string }[]; }

class PlaygroundView {
  private sessions: PgSession[] = [];
  private current: PgSession | null = null;
  private providers: Provider[] = [];
  private streaming = false;

  constructor(private root: HTMLElement) {}

  async mount(): Promise<void> {
    this.root.innerHTML = `<div class="flex items-center justify-center h-full text-zinc-500 text-sm">Loading Playground…</div>`;
    const [ses, prov] = await Promise.all([
      aias.json<PgSession[]>("/api/playground/sessions"),
      aias.json<any>("/api/providers"),
    ]);
    if (ses.status === 401) { aias.disconnect(); renderConnect(this.root, () => this.mount()); return; }
    this.sessions = Array.isArray(ses.data) ? ses.data : [];
    const plist = prov.data?.providers ?? prov.data;
    this.providers = Array.isArray(plist) ? plist : [];
    this.render();
    if (this.sessions.length) this.select(this.sessions[0].id);
  }

  private render(): void {
    this.root.innerHTML = `
      <div class="flex h-full min-h-0">
        <div class="w-60 shrink-0 border-r border-zinc-800 flex flex-col min-h-0">
          <div class="p-3 flex items-center justify-between border-b border-zinc-800">
            <span class="text-sm font-bold">Playground</span>
            <button id="pg-new" class="text-xs px-2 py-1 rounded-md bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/30">+ New</button>
          </div>
          <div id="pg-sessions" class="flex-1 overflow-y-auto p-2 space-y-1"></div>
          <div class="p-2 border-t border-zinc-800">
            <button id="pg-disconnect" class="text-[11px] text-zinc-500 hover:text-zinc-300">Disconnect AiAssist</button>
          </div>
        </div>
        <div class="flex-1 flex flex-col min-h-0">
          <div id="pg-toolbar" class="px-4 py-2.5 border-b border-zinc-800 flex items-center gap-2 flex-wrap"></div>
          <div id="pg-messages" class="flex-1 overflow-y-auto px-4 py-4 space-y-3"></div>
          <div class="p-3 border-t border-zinc-800">
            <form id="pg-form" class="flex gap-2">
              <textarea id="pg-input" class="input flex-1 resize-none" rows="1" placeholder="Message the model… (Enter to send, Shift+Enter for newline)"></textarea>
              <button id="pg-send" class="btn btn-gradient px-4" type="submit">Send</button>
            </form>
            <p id="pg-status" class="text-[11px] text-zinc-500 mt-1.5 h-4"></p>
          </div>
        </div>
      </div>`;

    document.getElementById("pg-new")!.addEventListener("click", () => this.create());
    document.getElementById("pg-disconnect")!.addEventListener("click", () => {
      aias.disconnect(); renderConnect(this.root, () => this.mount());
    });
    const form = document.getElementById("pg-form")!;
    form.addEventListener("submit", (e) => { e.preventDefault(); void this.send(); });
    const input = document.getElementById("pg-input") as HTMLTextAreaElement;
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void this.send(); }
    });
    this.renderSessions();
    this.renderToolbar();
    this.renderMessages();
  }

  private renderSessions(): void {
    const el = document.getElementById("pg-sessions");
    if (!el) return;
    if (!this.sessions.length) {
      el.innerHTML = `<p class="text-xs text-zinc-500 px-2 py-4 text-center">No sessions yet — start one.</p>`;
      return;
    }
    el.innerHTML = this.sessions.map((s) => `
      <div class="group flex items-center gap-1 rounded-lg ${this.current?.id === s.id ? "bg-zinc-800" : "hover:bg-zinc-800/60"}">
        <button data-pg-sel="${esc(s.id)}" class="flex-1 text-left px-2.5 py-2 min-w-0">
          <span class="block text-[13px] font-medium truncate">${esc(s.name || "Untitled")}</span>
          <span class="block text-[11px] text-zinc-500 truncate">${esc(s.model_name || "auto")} · ${timeAgo(s.updated_at)}</span>
        </button>
        <button data-pg-del="${esc(s.id)}" class="hidden group-hover:block px-1.5 text-zinc-500 hover:text-red-400" title="Delete">✕</button>
      </div>`).join("");
    el.querySelectorAll("[data-pg-sel]").forEach((b) =>
      b.addEventListener("click", () => this.select((b as HTMLElement).dataset.pgSel!)));
    el.querySelectorAll("[data-pg-del]").forEach((b) =>
      b.addEventListener("click", () => this.remove((b as HTMLElement).dataset.pgDel!)));
  }

  private renderToolbar(): void {
    const el = document.getElementById("pg-toolbar");
    if (!el) return;
    if (!this.current) {
      el.innerHTML = `<span class="text-sm text-zinc-500">Select or create a session</span>`;
      return;
    }
    const provOpts = this.providers.map((p) =>
      `<option value="${esc(p.id)}" ${p.id === this.current!.model_provider ? "selected" : ""}>${esc(p.name || p.id)}</option>`).join("");
    const active = this.providers.find((p) => p.id === this.current!.model_provider);
    const modelOpts = (active?.models || []).map((m) =>
      `<option value="${esc(m.id)}" ${m.id === this.current!.model_name ? "selected" : ""}>${esc(m.name || m.id)}</option>`).join("");
    el.innerHTML = `
      <span class="text-sm font-semibold truncate max-w-[200px]">${esc(this.current.name || "Untitled")}</span>
      <span class="flex-1"></span>
      <select id="pg-provider" class="input !w-auto !py-1 text-xs">${provOpts || `<option value="">default</option>`}</select>
      <select id="pg-model" class="input !w-auto !py-1 text-xs">${modelOpts || `<option value="">auto</option>`}</select>`;
    document.getElementById("pg-provider")?.addEventListener("change", (e) =>
      void this.patch({ model_provider: (e.target as HTMLSelectElement).value }));
    document.getElementById("pg-model")?.addEventListener("change", (e) =>
      void this.patch({ model_name: (e.target as HTMLSelectElement).value }));
  }

  private renderMessages(): void {
    const el = document.getElementById("pg-messages");
    if (!el) return;
    const msgs = this.current?.messages || [];
    if (!this.current) { el.innerHTML = ""; return; }
    if (!msgs.length) {
      el.innerHTML = `<div class="text-center text-zinc-500 text-sm py-16">Fresh session — say something.</div>`;
      return;
    }
    el.innerHTML = msgs.map((m) => `
      <div class="flex ${m.role === "user" ? "justify-end" : "justify-start"}">
        <div class="max-w-[82%] rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words ${
          m.role === "user" ? "bg-emerald-600/25 border border-emerald-600/30" : "bg-zinc-800/80 border border-zinc-700/50"
        }">${esc(m.content)}</div>
      </div>`).join("");
    el.scrollTop = el.scrollHeight;
  }

  private status(msg: string): void {
    const el = document.getElementById("pg-status");
    if (el) el.textContent = msg;
  }

  private async create(): Promise<void> {
    const { ok, data } = await aias.json<PgSession>("/api/playground/sessions", {
      method: "POST", body: JSON.stringify({ name: `DevNet session ${new Date().toLocaleTimeString()}` }),
    });
    if (!ok) { this.status("Could not create session."); return; }
    this.sessions.unshift(data);
    this.render();
    this.select(data.id);
  }

  private async remove(id: string): Promise<void> {
    await aias.json(`/api/playground/sessions/${id}`, { method: "DELETE" });
    this.sessions = this.sessions.filter((s) => s.id !== id);
    if (this.current?.id === id) this.current = null;
    this.renderSessions(); this.renderToolbar(); this.renderMessages();
  }

  private async select(id: string): Promise<void> {
    const { ok, data } = await aias.json<PgSession>(`/api/playground/sessions/${id}`);
    if (!ok) return;
    this.current = data;
    this.renderSessions(); this.renderToolbar(); this.renderMessages();
  }

  private async patch(body: Record<string, unknown>): Promise<void> {
    if (!this.current) return;
    const { ok, data } = await aias.json<PgSession>(`/api/playground/sessions/${this.current.id}`, {
      method: "PATCH", body: JSON.stringify(body),
    });
    if (ok) { this.current = { ...this.current, ...data }; this.renderToolbar(); }
  }

  private async send(): Promise<void> {
    if (this.streaming || !this.current) return;
    const input = document.getElementById("pg-input") as HTMLTextAreaElement;
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    this.streaming = true;
    (document.getElementById("pg-send") as HTMLButtonElement).disabled = true;

    this.current.messages = this.current.messages || [];
    this.current.messages.push({ id: "u", role: "user", content: text });
    const asst: PgMessage = { id: "a", role: "assistant", content: "" };
    this.current.messages.push(asst);
    this.renderMessages();
    this.status("Streaming…");

    try {
      const res = await aias.api(`/api/playground/sessions/${this.current.id}/chat/stream`, {
        method: "POST", body: JSON.stringify({ message: text }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({} as any));
        asst.content = `⚠️ ${err?.detail || `Request failed (${res.status})`}`;
        this.renderMessages(); return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const frames = buf.split("\n\n");
        buf = frames.pop() || "";
        for (const f of frames) {
          const line = f.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "chunk" && ev.content) {
              asst.content += ev.content;
              this.renderMessages();
            } else if (ev.type === "tool_start") {
              this.status(`Running ${ev.count} tool${ev.count === 1 ? "" : "s"}…`);
            } else if (ev.type === "tool_exec") {
              this.status(`Tool: ${ev.tool_name}…`);
            } else if (ev.type === "tool_done") {
              this.status("Streaming…");
            } else if (ev.type === "error") {
              asst.content += `\n⚠️ ${ev.message || "stream error"}`;
              this.renderMessages();
            }
          } catch { /* keep-alive or partial frame */ }
        }
      }
      // Re-sync from the server so ids/tokens are canonical.
      await this.select(this.current.id);
    } catch (e) {
      asst.content += "\n⚠️ Network error.";
      this.renderMessages();
    } finally {
      this.streaming = false;
      (document.getElementById("pg-send") as HTMLButtonElement).disabled = false;
      this.status("");
    }
  }
}

// ── entry ────────────────────────────────────────────────────────────────────

export type AiasViewKey = "playground" | "keystone" | "artifacts" | "image" | "agents";

export async function showAiasView(container: HTMLElement, view: AiasViewKey): Promise<void> {
  await aias.init();
  const appBase = aias.base.replace("api.", "").replace(/\/$/, "");
  if (!aias.connected) {
    renderConnect(container, () => void showAiasView(container, view));
    return;
  }
  if (view === "playground") {
    await new PlaygroundView(container).mount();
    return;
  }
  renderDocked(container, view, appBase);
}
