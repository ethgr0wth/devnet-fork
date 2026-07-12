/**
 * v1 runtime — wouter compat for pages living inside AiOS windows.
 *
 * There is no SPA router in the desktop; v1's internal navigation targets
 * (e.g. "/dashboard/tools") map to AiOS apps where possible, and otherwise
 * open the v1 web app in a new tab on the user's production account.
 */
import React from "react";

let APP_BASE = "https://aiassist.net";
void (async () => {
  try {
    const res = await fetch("/api/config");
    const cfg = await res.json();
    if (cfg.aias_api_base) {
      APP_BASE = String(cfg.aias_api_base).replace(/\/$/, "").replace("api.", "");
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
  const target = href || to || "/";
  return (
    <a
      href={`${APP_BASE}${target}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
        navigateV1(target);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

export function useLocation(): [string, (to: string) => void] {
  return ["/", (to: string) => navigateV1(to)];
}

export function useSearch(): string {
  return "";
}

export function useRoute(): [boolean, Record<string, string>] {
  return [false, {}];
}

export const Route = ({ children }: any) => <>{children}</>;
export const Switch = ({ children }: any) => <>{children}</>;
export const Router = ({ children }: any) => <>{children}</>;
export default { Link, useLocation, useSearch, useRoute, Route, Switch, Router };
