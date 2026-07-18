/**
 * v1 runtime — wouter compat for pages living inside AiOS windows.
 *
 * There is no SPA router in the desktop; v1's internal navigation targets
 * (e.g. "/dashboard/tools") map to AiOS apps where possible, and otherwise
 * open the v1 web app in a new tab on the user's production account.
 */
import React, { createContext, useContext, useMemo, useState } from "react";

// ── per-window mini router ───────────────────────────────────────────────────
// KeyStone (and any multi-view v1 page set) navigates INSIDE its window:
// QuestsPortal → setLocation("/keystone/:id") → QuestsWorkspace. A window
// wrapped in <WindowRouter> gets wouter's Link/useLocation/useParams served
// from window-local state; windows without one fall back to the global
// app-mapping behavior below.

interface WinNav { path: string; navigate: (to: string) => void; params: Record<string, string>; }
const WindowNavContext = createContext<WinNav | null>(null);

function matchPattern(pattern: string, path: string): Record<string, string> | null {
  const pp = pattern.split("/").filter(Boolean);
  const pa = path.split("?")[0].split("/").filter(Boolean);
  if (pp.length !== pa.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(":")) params[pp[i].slice(1)] = decodeURIComponent(pa[i]);
    else if (pp[i] !== pa[i]) return null;
  }
  return params;
}

export function WindowRouter({ initial, routes, fallback }: {
  initial: string;
  routes: Array<{ pattern: string; component: React.ComponentType<any> }>;
  fallback?: React.ComponentType<any>;
}) {
  const [path, setPath] = useState(initial);
  let params: Record<string, string> = {};
  let Comp: React.ComponentType<any> | null = null;
  for (const r of routes) {
    const m = matchPattern(r.pattern, path);
    if (m) { params = m; Comp = r.component; break; }
  }
  if (!Comp) Comp = fallback || routes[0].component;
  const nav = useMemo<WinNav>(() => ({ path, navigate: setPath, params }),
    [path, JSON.stringify(params)]);
  return (
    <WindowNavContext.Provider value={nav}>
      <Comp key={path} params={params} />
    </WindowNavContext.Provider>
  );
}

let APP_BASE = "https://aiassist.net";
void (async () => {
  try {
    const res = await fetch("/api/config");
    const cfg = await res.json();
    if (cfg.aias_app_base) {
      APP_BASE = String(cfg.aias_app_base).replace(/\/$/, "");
    }
  } catch { /* keep default */ }
})();

/** v1 path → AiOS app id (open in-place instead of leaving the desktop). */
const PATH_TO_APP: Array<[RegExp, string]> = [
  [/^\/dashboard\/artifact-portal/, "artifacts"],
  [/^\/(m\/)?playground/, "playground"],
  [/^\/dashboard\/playground/, "playground"],
  [/^\/dashboard\/image-workstation/, "images"],
  [/^\/dashboard\/code-generator/, "codegen"],
  [/^\/dashboard\/templates/, "templates"],
  [/^\/dashboard\/deployed-agents/, "agents"],
  [/^\/dashboard\/directives/, "directives"],
  [/^\/keystone/, "keystone"],
  [/^\/blog/, "blog"],
  [/^\/dashboard\/voice-chat/, "voice"],
  [/^\/dashboard\/control-center/, "control"],
  [/^\/dashboard\/policy-snapshots/, "policies"],
  [/^\/dashboard\/change-log/, "changes"],
  [/^\/dashboard\/tools/, "tools"],
  [/^\/dashboard\/leads/, "leads"],
  [/^\/flashcards/, "flashcards"],
  [/^\/dashboard\/team-members/, "team"],
  [/^\/dashboard\/environments/, "environments"],
  [/^\/dashboard\/settings/, "settings"],
  [/^\/workspaces/, "workspaces"],
];

export function navigateV1(href: string): void {
  for (const [re, appId] of PATH_TO_APP) {
    if (re.test(href)) {
      window.dispatchEvent(new CustomEvent("aios:open-app", { detail: { appId } }));
      return;
    }
  }
  window.open(`${APP_BASE}${href}`, "_blank", "noopener,noreferrer");
}

export function Link({ href, to, children, className, onClick, ...rest }: any) {
  const ctx = useContext(WindowNavContext);
  const target = href || to || "/";
  return (
    <a
      href={`${APP_BASE}${target}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
        if (ctx) ctx.navigate(target);
        else navigateV1(target);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

export function useLocation(): [string, (to: string) => void] {
  const ctx = useContext(WindowNavContext);
  if (ctx) return [ctx.path, ctx.navigate];
  return ["/", (to: string) => navigateV1(to)];
}

export function useSearch(): string {
  const ctx = useContext(WindowNavContext);
  if (ctx) return ctx.path.split("?")[1] || "";
  return "";
}

export function useParams<T = Record<string, string>>(): T {
  const ctx = useContext(WindowNavContext);
  return (ctx?.params || {}) as T;
}

export function useRoute(pattern?: string): [boolean, Record<string, string>] {
  const ctx = useContext(WindowNavContext);
  if (ctx && pattern) {
    const m = matchPattern(pattern, ctx.path);
    return [m !== null, m || {}];
  }
  return [false, {}];
}

export const Route = ({ children }: any) => <>{children}</>;
export const Switch = ({ children }: any) => <>{children}</>;
export const Router = ({ children }: any) => <>{children}</>;
export default { Link, useLocation, useSearch, useRoute, Route, Switch, Router };
