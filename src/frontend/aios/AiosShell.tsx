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
import React, { useEffect, useReducer, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Cpu, Sparkles, Code, Layers, Rocket, Target, BookOpen, Mic, Activity,
  Shield, History, Image, Users, MessageSquare, Newspaper, LogOut, LayoutGrid,
  Wrench, TrendingUp, GraduationCap, UserPlus, Boxes, Settings,
} from "lucide-react";
import AppWindow, { type WindowState } from "./AppWindow";
import { aias } from "../aias";
import { Toaster } from "sonner";
import { Toaster as ShadToaster } from "../v1/components/ui/toaster";
import OraclePlayground from "../v1/pages/OraclePlayground";
import ArtifactPortal from "../v1/pages/ArtifactPortal";
import ImageWorkstation from "../v1/pages/ImageWorkstation";
import CodeGenerator from "../v1/pages/CodeGenerator";
import Templates from "../v1/pages/Templates";
import DeployedAgents from "../v1/pages/DeployedAgents";
import Directives from "../v1/pages/Directives";
import BlogDashboard from "../v1/pages/BlogDashboard";
import VoiceChat from "../v1/pages/VoiceChat";
import ControlCenter from "../v1/pages/ControlCenter";
import PolicySnapshots from "../v1/pages/PolicySnapshots";
import ChangeLog from "../v1/pages/ChangeLog";
import QuestsPortal from "../v1/pages/QuestsPortal";
import QuestsWorkspace from "../v1/pages/QuestsWorkspace";
import KeystoneLiteWorkspace from "../v1/pages/KeystoneLiteWorkspace";
import ToolsHub from "../v1/pages/ToolsHub";
import LeadsPage from "../v1/pages/LeadsPage";
import FlashCards from "../v1/pages/FlashCards";
import TeamMembers from "../v1/pages/TeamMembers";
import Environments from "../v1/pages/Environments";
import AccountSettings from "../v1/pages/AccountSettings";
import { WindowRouter } from "../v1/lib/wouter-shim";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../v1/lib/queryClient";
import WorkspacesApp from "./apps/WorkspacesApp";

/** REAL v1 pages render full-page layouts; inside a window they own a
 *  scrolling canvas. */
function V1Page({ Page }: { Page: React.ComponentType<any> }) {
  return (
    <div className="h-full w-full overflow-y-auto bg-zinc-950 [color-scheme:dark]">
      <Page />
    </div>
  );
}

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
  { id: "workspaces", label: "Workspaces", icon: Users,         gradient: "from-teal-500 to-emerald-600", kind: "component", blurb: "Your v1 workspaces as communities" },
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
  // 100%-coverage sweep (Mark): the six pages nobody listed
  { id: "tools",        label: "Tools",        icon: Wrench,        gradient: "from-orange-400 to-amber-600",  kind: "component", blurb: "Custom tools hub" },
  { id: "leads",        label: "Leads",        icon: TrendingUp,    gradient: "from-blue-400 to-sky-600",      kind: "component", blurb: "Captured & scored leads" },
  { id: "flashcards",   label: "Study",        icon: GraduationCap, gradient: "from-emerald-400 to-teal-600",  kind: "component", blurb: "Study Buddy flashcards" },
  { id: "team",         label: "Team",         icon: UserPlus,      gradient: "from-teal-400 to-cyan-600",     kind: "component", blurb: "Team members & seats" },
  { id: "environments", label: "Environments", icon: Boxes,         gradient: "from-indigo-400 to-violet-600", kind: "component", blurb: "Environment switcher" },
  { id: "settings",     label: "Settings",     icon: Settings,      gradient: "from-zinc-400 to-zinc-600",     kind: "component", blurb: "Account & security" },
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

// KeyStone is a two-page world: portal → /keystone/:id → the IDE workspace.
// The WindowRouter serves wouter's API from window-local state.
// The portal is a page (it scrolls), the workspace is an IDE (it must own a
// fixed-height box and manage its own overflow) — so the scroll container
// wraps ONLY the portal route. Putting the whole app in a scroller breaks
// the workspace's percentage-height chain and collapses the chat column.
function KeystonePortalPage() {
  return (
    <div className="h-full w-full overflow-y-auto">
      <QuestsPortal />
    </div>
  );
}
function KeystoneApp() {
  return (
    <div className="h-full w-full overflow-hidden bg-zinc-950 [color-scheme:dark]">
      <WindowRouter
        initial="/keystone"
        routes={[
          { pattern: "/keystone", component: KeystonePortalPage },
          { pattern: "/keystone/:id", component: KeystoneLiteWorkspace },
        ]}
      />
    </div>
  );
}

const APP_COMPONENTS: Record<string, React.ComponentType<any>> = {
  playground: () => <V1Page Page={OraclePlayground} />,
  artifacts: () => <V1Page Page={ArtifactPortal} />,
  workspaces: WorkspacesApp,
  images: () => <V1Page Page={ImageWorkstation} />,
  codegen: () => <V1Page Page={CodeGenerator} />,
  templates: () => <V1Page Page={Templates} />,
  agents: () => <V1Page Page={DeployedAgents} />,
  directives: () => <V1Page Page={Directives} />,
  keystone: KeystoneApp,
  blog: () => <V1Page Page={BlogDashboard} />,
  voice: () => <V1Page Page={VoiceChat} />,
  control: () => <V1Page Page={ControlCenter} />,
  policies: () => <V1Page Page={PolicySnapshots} />,
  changes: () => <V1Page Page={ChangeLog} />,
  tools: () => <V1Page Page={ToolsHub} />,
  leads: () => <V1Page Page={LeadsPage} />,
  flashcards: () => <V1Page Page={FlashCards} />,
  team: () => <V1Page Page={TeamMembers} />,
  environments: () => <V1Page Page={Environments} />,
  settings: () => <V1Page Page={AccountSettings} />,
};

// ── The Briefing (desktop widget — v1.1 heritage, real data only) ────────────
// Composed client-side from what EXISTS today: v1 workspaces' attention
// flags + usage (federated token) and DevNet's own pings. Every line traces
// to a live endpoint; sources that fail are skipped, never faked.

interface BriefingData {
  attention: Array<{ id: string; title: string }>;
  unreadPings: number;
  usagePct: number | null;
  tokensUsed: number | null;
  wsCount: number;
}

function useBriefing(): BriefingData | null {
  const [data, setData] = useState<BriefingData | null>(null);
  useEffect(() => {
    let live = true;
    // POLITE POLLING (learned 2026-07-12, the day the desktop piled onto a
    // dying upstream): never stack a tick on an in-flight pull, and back off
    // exponentially while v1 is failing so a downed production API gets
    // silence to recover in, not a stampede.
    let inFlight = false;
    let failStreak = 0;
    let skipTicks = 0;
    const pull = async () => {
      if (inFlight) return;
      if (skipTicks > 0) { skipTicks -= 1; return; }
      inFlight = true;
      let v1ok = true;
      const out: BriefingData = { attention: [], unreadPings: 0, usagePct: null, tokensUsed: null, wsCount: 0 };
      // v1 production (federated): workspaces needing a human + usage
      try {
        const r = await aias.json<any>("/api/user/workspaces?limit=10");
        if (!r.ok) v1ok = false;
        const list = r.data?.workspaces || [];
        out.wsCount = list.length;
        out.attention = list
          .filter((w: any) => w.needs_human_attention === true || w.needs_human_attention === "true")
          .slice(0, 3)
          .map((w: any) => ({ id: w.id, title: w.title || `Workspace ${String(w.id).slice(0, 6)}` }));
      } catch { v1ok = false; /* v1 unreachable — skip */ }
      try {
        const r = await aias.json<any>("/api/user/usage");
        if (!r.ok) v1ok = false;
        if (r.ok && r.data && !r.data.unlimited && r.data.tokens_limit) {
          out.usagePct = Math.min(100, (r.data.tokens_used / r.data.tokens_limit) * 100);
          out.tokensUsed = r.data.tokens_used;
        } else if (r.ok && r.data) {
          out.tokensUsed = r.data.tokens_used ?? null;
        }
      } catch { v1ok = false; /* skip */ }
      // DevNet local: pings
      try {
        const tok = localStorage.getItem("devnetwork_hash") || "";
        const r = await fetch("/api/notifications", { headers: { "X-Auth-Hash": tok } });
        const b = await r.json();
        const list = Array.isArray(b) ? b : b.notifications || [];
        out.unreadPings = list.filter((n: any) => !n.read).length || list.length || 0;
      } catch { /* skip */ }
      if (live) setData(out);
      if (v1ok) {
        failStreak = 0; skipTicks = 0;
      } else {
        failStreak += 1;
        skipTicks = Math.min(2 ** failStreak, 10); // 1→2→4→8→10 ticks (max 5 min)
      }
      inFlight = false;
    };
    void pull();
    const t = setInterval(pull, 30_000);
    return () => { live = false; clearInterval(t); };
  }, []);
  return data;
}

function Chip({ color, children, onClick }: { color: "amber" | "cyan" | "violet"; children: React.ReactNode; onClick?: () => void }) {
  const styles = {
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
    violet: "border-violet-500/25 bg-violet-500/10 text-violet-300",
  }[color];
  return (
    <button onClick={onClick}
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[12px] font-semibold align-baseline transition hover:-translate-y-px ${styles} ${onClick ? "cursor-pointer" : "cursor-default"}`}>
      {children}
    </button>
  );
}

function BriefingWidget({ onOpen }: { onOpen: (appId: string) => void }) {
  const b = useBriefing();
  if (!b) {
    return <div className="mt-4 h-5 w-72 animate-pulse rounded bg-white/5" />;
  }
  const lines: React.ReactNode[] = [];
  if (b.attention.length) {
    lines.push(
      <p key="attn" className="text-[14px] leading-relaxed text-zinc-300">
        <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400 align-middle" />
        {b.attention.length === 1 ? "One conversation needs you: " : `${b.attention.length} conversations need you — first up: `}
        <Chip color="amber" onClick={() => onOpen("workspaces")}>{b.attention[0].title}</Chip>
        {" "}flagged for a human on your v1 workspaces.
      </p>);
  }
  const bits: React.ReactNode[] = [];
  if (b.unreadPings > 0) bits.push(<React.Fragment key="p"><Chip color="cyan" onClick={() => window.dispatchEvent(new CustomEvent("aios:classic", { detail: "feed" }))}>{b.unreadPings} ping{b.unreadPings === 1 ? "" : "s"}</Chip> waiting here on AiAssist Secure</React.Fragment>);
  if (b.tokensUsed !== null) bits.push(<React.Fragment key="u"><Chip color="violet">{b.usagePct !== null ? `${b.usagePct.toFixed(0)}% of tokens` : `${(b.tokensUsed / 1000).toFixed(1)}k tokens`}</Chip> used this month</React.Fragment>);
  if (bits.length) {
    lines.push(
      <p key="pulse" className="text-[14px] leading-relaxed text-zinc-300">
        {bits.map((x, i) => <React.Fragment key={i}>{i > 0 && " · "}{x}</React.Fragment>)}
        {b.attention.length === 0 && " — nothing is waiting on you. Clear runway."}
      </p>);
  }
  if (!lines.length) {
    lines.push(<p key="quiet" className="text-[14px] text-zinc-400">All quiet — nothing needs you right now.</p>);
  }
  return (
    <div className="mt-4 max-w-2xl space-y-1.5">
      {lines}
    </div>
  );
}

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
  /** Deep link: open this app's window immediately (sidebar → window). */
  initialApp?: string;
  onClassic: (view: "feed" | "workspaces" | "messages") => void;
  onSignOut: () => void;
}

function AiosShell({ opts }: { opts: AiosOpts }) {
  const [store, dispatch] = useReducer(winReducer, { windows: [], nextZ: 10 });

  // v1 pages navigate via the wouter shim → open the target as an app.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const appId = (e as CustomEvent).detail?.appId;
      const app = APPS.find((a) => a.id === appId);
      if (app) dispatch({ type: "OPEN", app });
    };
    const onClassic = (e: Event) => {
      const v = (e as CustomEvent).detail;
      if (v === "feed" || v === "workspaces" || v === "messages") opts.onClassic(v);
    };
    window.addEventListener("aios:open-app", onOpen);
    window.addEventListener("aios:classic", onClassic);
    // Sidebar deep link: land with the requested window already open.
    if (opts.initialApp) {
      const app = APPS.find((a) => a.id === opts.initialApp);
      if (app && app.kind === "component") dispatch({ type: "OPEN", app });
    }
    return () => {
      window.removeEventListener("aios:open-app", onOpen);
      window.removeEventListener("aios:classic", onClassic);
    };
  }, []);

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
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0a0a0f]"
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
          <BriefingWidget onOpen={(appId) => {
            const app = APPS.find((a) => a.id === appId);
            if (app) dispatch({ type: "OPEN", app });
          }} />
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

      <Toaster theme="dark" position="bottom-right" richColors closeButton />
      <ShadToaster />

      {/* dock — slides away while any window is open so it never sits on top
          of app UIs (composer bars, bottom navs); reappears when everything
          is closed or minimized. */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-3 z-40 flex justify-center transition-all duration-300 ${
          store.windows.some((w) => !w.minimized) ? "opacity-0" : ""
        }`}
        style={{ transform: store.windows.some((w) => !w.minimized) ? "translateY(6rem)" : "translateY(0)" }}
      >
        <div className={`flex items-center gap-1.5 rounded-2xl border border-white/10 bg-black/50 px-2.5 py-1.5 backdrop-blur-xl ${
          store.windows.some((w) => !w.minimized) ? "pointer-events-none" : "pointer-events-auto"
        }`}>
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
let mounted: HTMLElement | null = null;
let prevClassName: string | null = null;

export async function mountAios(container: HTMLElement, opts: AiosOpts): Promise<void> {
  await aias.init();
  container.innerHTML = "";
  // The classic shell's container is a flex-CENTERING stage (built for the
  // auth card) — a mounted desktop must own the full canvas instead.
  mounted = container;
  prevClassName = container.className;
  container.className = "relative h-full w-full overflow-hidden";
  root = createRoot(container);
  root.render(
    <QueryClientProvider client={queryClient}>
      <AiosShell opts={opts} />
    </QueryClientProvider>,
  );
}

export function unmountAios(): void {
  root?.unmount();
  root = null;
  if (mounted && prevClassName !== null) mounted.className = prevClassName;
  mounted = null;
  prevClassName = null;
}
