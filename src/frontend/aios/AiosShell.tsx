/**
 * AiOS — the AiAS v2 surface, woven into DevNet as a React island.
 *
 * Ported from v1's DashboardV3 (/aios) patterns: app-icon desktop, draggable/
 * resizable internal windows (AppWindow, ported verbatim), dock with running
 * apps. ONE deliberate change per Mark's law: NO IFRAMES — v1 used
 * same-origin IframeApp; here every window renders a real component from the
 * APP registry, calling production APIs with the federated session token.
 * Apps not yet ported render an honest "coming online" panel.
 */
import React, { useEffect, useReducer, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Cpu, Sparkles, Code, Layers, Rocket, Target, BookOpen, Mic, Activity,
  Shield, History, Image, Users, MessageSquare, Newspaper, Loader2, Send,
  Plus, Trash2, LogOut, LayoutGrid,
} from "lucide-react";
import AppWindow, { type WindowState } from "./AppWindow";
import { aias } from "../aias";

// ── app registry ─────────────────────────────────────────────────────────────

type AppDef = {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  gradient: string;
  kind: "component" | "classic";
  blurb?: string;
};

const APPS: AppDef[] = [
  // devnet-native surfaces (jump back to the classic shell views)
  { id: "feed",       label: "Feed",       icon: Newspaper,     gradient: "from-zinc-500 to-zinc-700",    kind: "classic", blurb: "The network feed" },
  { id: "workspaces", label: "Workspaces", icon: Users,         gradient: "from-teal-500 to-emerald-600", kind: "classic", blurb: "Groups & channels" },
  { id: "messages",   label: "Messages",   icon: MessageSquare, gradient: "from-blue-500 to-indigo-600",  kind: "classic", blurb: "Direct messages" },
  // v1 tools as windowed apps (component registry; ported one by one)
  { id: "playground", label: "Playground", icon: Sparkles, gradient: "from-amber-400 to-orange-500", kind: "component", blurb: "Test-drive models & personas" },
  { id: "artifacts",  label: "Artifacts",  icon: Cpu,      gradient: "from-cyan-500 to-blue-600",    kind: "component", blurb: "Agent artifact generator" },
  { id: "images",     label: "Images",     icon: Image,    gradient: "from-rose-400 to-pink-600",    kind: "component", blurb: "Image workstation" },
  { id: "codegen",    label: "Code Gen",   icon: Code,     gradient: "from-emerald-400 to-green-600", kind: "component", blurb: "Generate code from prompts" },
  { id: "templates",  label: "Templates",  icon: Layers,   gradient: "from-pink-500 to-rose-500",    kind: "component", blurb: "AI templates" },
  { id: "agents",     label: "Agents",     icon: Rocket,   gradient: "from-green-400 to-emerald-600", kind: "component", blurb: "Deployed agents" },
  { id: "directives", label: "Directives", icon: Target,   gradient: "from-purple-500 to-violet-600", kind: "component", blurb: "AI directives" },
  { id: "keystone",   label: "KeyStone",   icon: Code,     gradient: "from-indigo-500 to-blue-600",  kind: "component", blurb: "Build & ship apps" },
  { id: "blog",       label: "Blog",       icon: BookOpen, gradient: "from-teal-400 to-cyan-500",    kind: "component", blurb: "Blog studio" },
  { id: "voice",      label: "Voice",      icon: Mic,      gradient: "from-violet-500 to-purple-600", kind: "component", blurb: "Live voice sessions" },
  { id: "control",    label: "Control",    icon: Activity, gradient: "from-blue-500 to-indigo-600",  kind: "component", blurb: "Control center" },
  { id: "policies",   label: "Policies",   icon: Shield,   gradient: "from-cyan-400 to-teal-500",    kind: "component", blurb: "Policy snapshots" },
  { id: "changes",    label: "Changes",    icon: History,  gradient: "from-rose-500 to-red-600",     kind: "component", blurb: "Change log" },
];

// ── window store (v1 DashboardV3 reducer pattern) ────────────────────────────

type WinAction =
  | { type: "OPEN"; app: AppDef }
  | { type: "CLOSE"; id: string }
  | { type: "MINIMIZE"; id: string }
  | { type: "MAXIMIZE"; id: string }
  | { type: "FOCUS"; id: string }
  | { type: "MOVE"; id: string; x: number; y: number }
  | { type: "RESIZE"; id: string; w: number; h: number; x?: number; y?: number };

interface WinStore { windows: WindowState[]; nextZ: number; }

function winReducer(state: WinStore, action: WinAction): WinStore {
  switch (action.type) {
    case "OPEN": {
      const existing = state.windows.find((w) => w.appId === action.app.id);
      if (existing) {
        return {
          ...state, nextZ: state.nextZ + 1,
          windows: state.windows.map((w) => w.id === existing.id
            ? { ...w, minimized: false, zIndex: state.nextZ + 1 } : w),
        };
      }
      const n = state.windows.length;
      const win: WindowState = {
        id: `${action.app.id}-${Date.now()}`, appId: action.app.id,
        title: action.app.label, icon: action.app.icon, gradient: action.app.gradient,
        minimized: false, maximized: false,
        x: 90 + (n % 5) * 44, y: 64 + (n % 5) * 36,
        w: Math.min(980, window.innerWidth - 160), h: Math.min(640, window.innerHeight - 180),
        zIndex: state.nextZ + 1,
      };
      return { windows: [...state.windows, win], nextZ: state.nextZ + 1 };
    }
    case "CLOSE":
      return { ...state, windows: state.windows.filter((w) => w.id !== action.id) };
    case "MINIMIZE":
      return { ...state, windows: state.windows.map((w) => w.id === action.id ? { ...w, minimized: true } : w) };
    case "MAXIMIZE":
      return { ...state, windows: state.windows.map((w) => w.id === action.id ? { ...w, maximized: !w.maximized } : w) };
    case "FOCUS":
      return { ...state, nextZ: state.nextZ + 1,
        windows: state.windows.map((w) => w.id === action.id ? { ...w, minimized: false, zIndex: state.nextZ + 1 } : w) };
    case "MOVE":
      return { ...state, windows: state.windows.map((w) => w.id === action.id ? { ...w, x: action.x, y: action.y } : w) };
    case "RESIZE":
      return { ...state, windows: state.windows.map((w) => w.id === action.id ? {
        ...w, w: action.w, h: action.h,
        ...(action.x !== undefined ? { x: action.x } : {}),
        ...(action.y !== undefined ? { y: action.y } : {}) } : w) };
    default:
      return state;
  }
}

// ── window content: the component registry (NO IFRAMES) ─────────────────────

function ComingOnline({ app }: { app: AppDef }) {
  const Icon = app.icon;
  return (
    <div className="flex h-full items-center justify-center bg-zinc-950">
      <div className="text-center max-w-xs px-6">
        <div className={`mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${app.gradient}`}>
          <Icon className="h-7 w-7 text-white" />
        </div>
        <h3 className="text-lg font-bold text-white">{app.label}</h3>
        <p className="mt-1 text-sm text-zinc-400">{app.blurb}</p>
        <p className="mt-4 text-xs text-zinc-500">
          Coming online — this app is being ported from v1 as a native
          component. It runs on your AiAS production account.
        </p>
      </div>
    </div>
  );
}

// ── Playground: the first real windowed app ──────────────────────────────────

interface PgSession { id: string; name: string; model_provider?: string; model_name?: string; updated_at?: string; messages?: PgMsg[]; }
interface PgMsg { id: string; role: string; content: string; }

function PlaygroundApp() {
  const [sessions, setSessions] = useState<PgSession[] | null>(null);
  const [current, setCurrent] = useState<PgSession | null>(null);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const r = await aias.json<PgSession[]>("/api/playground/sessions");
    setSessions(Array.isArray(r.data) ? r.data : []);
    if (Array.isArray(r.data) && r.data.length) void select(r.data[0].id);
  };
  const select = async (id: string) => {
    const r = await aias.json<PgSession>(`/api/playground/sessions/${id}`);
    if (r.ok) setCurrent(r.data);
  };
  const create = async () => {
    const r = await aias.json<PgSession>("/api/playground/sessions", {
      method: "POST",
      body: JSON.stringify({ name: `AiOS session ${new Date().toLocaleTimeString()}` }),
    });
    if (r.ok) { setSessions((s) => [r.data, ...(s || [])]); setCurrent(r.data); }
  };
  const remove = async (id: string) => {
    await aias.json(`/api/playground/sessions/${id}`, { method: "DELETE" });
    setSessions((s) => (s || []).filter((x) => x.id !== id));
    setCurrent((c) => (c?.id === id ? null : c));
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [current?.messages?.length, streaming]);

  const send = async () => {
    if (!current || streaming) return;
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setStreaming(true);
    setStatus("Streaming…");
    const asst: PgMsg = { id: "live", role: "assistant", content: "" };
    setCurrent((c) => c && ({ ...c, messages: [...(c.messages || []),
      { id: "u" + Date.now(), role: "user", content: text }, asst] }));
    try {
      const res = await aias.api(`/api/playground/sessions/${current.id}/chat/stream`, {
        method: "POST", body: JSON.stringify({ message: text }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({} as any));
        asst.content = `⚠️ ${err?.detail || `Request failed (${res.status})`}`;
        setCurrent((c) => c && ({ ...c }));
        return;
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
              setCurrent((c) => c && ({ ...c }));
            } else if (ev.type === "tool_exec") {
              setStatus(`Tool: ${ev.tool_name}…`);
            }
          } catch { /* keep-alive */ }
        }
      }
      await select(current.id);
    } finally {
      setStreaming(false);
      setStatus("");
    }
  };

  if (sessions === null) {
    return <div className="flex h-full items-center justify-center bg-zinc-950">
      <Loader2 className="h-6 w-6 animate-spin text-white/30" />
    </div>;
  }

  return (
    <div className="flex h-full bg-zinc-950 text-zinc-100">
      <div className="flex w-52 shrink-0 flex-col border-r border-white/10">
        <div className="flex items-center justify-between border-b border-white/10 p-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Sessions</span>
          <button onClick={() => void create()} title="New session"
                  className="rounded-md border border-emerald-500/30 bg-emerald-500/15 p-1 text-emerald-400 hover:bg-emerald-500/25">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto p-1.5">
          {(sessions || []).map((s) => (
            <div key={s.id}
                 className={`group flex items-center rounded-lg ${current?.id === s.id ? "bg-white/10" : "hover:bg-white/5"}`}>
              <button onClick={() => void select(s.id)} className="min-w-0 flex-1 px-2 py-1.5 text-left">
                <span className="block truncate text-[12.5px] font-medium">{s.name || "Untitled"}</span>
                <span className="block truncate text-[10.5px] text-zinc-500">{s.model_name || "auto"}</span>
              </button>
              <button onClick={() => void remove(s.id)}
                      className="hidden px-1.5 text-zinc-500 hover:text-red-400 group-hover:block">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {!sessions.length && <p className="px-2 py-6 text-center text-xs text-zinc-500">No sessions yet.</p>}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto p-3">
          {!current && <div className="py-16 text-center text-sm text-zinc-500">Select or create a session.</div>}
          {current && !(current.messages || []).length &&
            <div className="py-16 text-center text-sm text-zinc-500">Fresh session — say something.</div>}
          {(current?.messages || []).map((m, i) => (
            <div key={m.id + i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-xl border px-3 py-2 text-[13px] ${
                m.role === "user"
                  ? "border-emerald-600/30 bg-emerald-600/20"
                  : "border-white/10 bg-white/5"}`}>
                {m.content}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 p-2.5">
          <div className="flex gap-2">
            <textarea value={draft} rows={1} placeholder="Message the model…"
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                      className="flex-1 resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-emerald-500/50" />
            <button onClick={() => void send()} disabled={streaming}
                    className="rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 px-3.5 text-zinc-950 disabled:opacity-50">
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 h-4 text-[10.5px] text-zinc-500">{status}</p>
        </div>
      </div>
    </div>
  );
}

const APP_COMPONENTS: Record<string, React.ComponentType<any>> = {
  playground: PlaygroundApp,
};

// ── the desktop ──────────────────────────────────────────────────────────────

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t); }, []);
  return <span className="num text-xs text-zinc-400">
    {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
  </span>;
}

export interface AiosOpts {
  displayName: string;
  onClassic: (view: "feed" | "workspaces" | "messages") => void;
  onSignOut: () => void;
}

function AiosShell({ opts }: { opts: AiosOpts }) {
  const [store, dispatch] = useReducer(winReducer, { windows: [], nextZ: 10 });

  const open = (app: AppDef) => {
    if (app.kind === "classic") {
      opts.onClassic(app.id as "feed" | "workspaces" | "messages");
      return;
    }
    dispatch({ type: "OPEN", app });
  };

  const h = new Date().getHours();
  const greet = h < 5 ? "Burning the midnight oil" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#0a0a0f]"
         style={{ backgroundImage: "radial-gradient(80% 60% at 20% 0%, rgba(99,102,241,.14), transparent 60%), radial-gradient(70% 55% at 90% 100%, rgba(16,185,129,.10), transparent 60%)" }}>
      {/* top bar */}
      <div className="z-10 flex items-center gap-3 border-b border-white/10 px-4 py-2 backdrop-blur">
        <span className="flex items-center gap-2 text-sm font-bold text-white">
          <LayoutGrid className="h-4 w-4 text-emerald-400" /> AiOS
          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">v2</span>
        </span>
        <span className="flex-1" />
        <Clock />
        <button onClick={opts.onSignOut} title="Sign out"
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-200">
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {/* desktop */}
      <div className="relative min-h-0 flex-1">
        <div className="h-full overflow-y-auto px-6 pb-24 pt-6">
          <h1 className="text-xl font-bold text-white">{greet}, {opts.displayName} <span className="align-middle">👋</span></h1>
          <p className="mt-0.5 text-sm text-zinc-400">Your whole platform, one desktop. Open anything.</p>
          <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-3">
            {APPS.map((app) => {
              const Icon = app.icon;
              return (
                <button key={app.id} onClick={() => open(app)} title={app.blurb}
                        className="group flex flex-col items-center gap-1.5 rounded-xl p-2.5 transition hover:bg-white/5">
                  <span className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${app.gradient} shadow-lg transition group-hover:scale-105 group-active:scale-95`}>
                    <Icon className="h-6 w-6 text-white" strokeWidth={1.8} />
                  </span>
                  <span className="text-[11px] font-medium text-zinc-300">{app.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* windows */}
        {store.windows.map((w) => {
          const app = APPS.find((a) => a.id === w.appId)!;
          const Content = APP_COMPONENTS[w.appId] || (() => <ComingOnline app={app} />);
          return (
            <AppWindow key={w.id} win={w}
              onClose={(id) => dispatch({ type: "CLOSE", id })}
              onMinimize={(id) => dispatch({ type: "MINIMIZE", id })}
              onMaximize={(id) => dispatch({ type: "MAXIMIZE", id })}
              onFocus={(id) => dispatch({ type: "FOCUS", id })}
              onMove={(id, x, y) => dispatch({ type: "MOVE", id, x, y })}
              onResize={(id, ww, hh, x, y) => dispatch({ type: "RESIZE", id, w: ww, h: hh, x, y })}>
              <Content />
            </AppWindow>
          );
        })}
      </div>

      {/* dock */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-40 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-white/10 bg-black/50 px-2.5 py-1.5 backdrop-blur-xl">
          {APPS.slice(0, 8).map((app) => {
            const Icon = app.icon;
            const running = store.windows.some((w) => w.appId === app.id);
            return (
              <button key={app.id} onClick={() => open(app)} title={app.label} className="group relative p-0.5">
                <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${app.gradient} transition group-hover:scale-110 group-active:scale-95`}>
                  <Icon className="h-5 w-5 text-white" strokeWidth={1.8} />
                </span>
                {running && <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-400" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── island mount ─────────────────────────────────────────────────────────────

let root: ReturnType<typeof createRoot> | null = null;

export async function mountAios(container: HTMLElement, opts: AiosOpts): Promise<void> {
  await aias.init();
  container.innerHTML = "";
  root = createRoot(container);
  root.render(<AiosShell opts={opts} />);
}

export function unmountAios(): void {
  root?.unmount();
  root = null;
}
