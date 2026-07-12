/**
 * v1 runtime — queryClient compat.
 *
 * REAL v1 pages import `apiFetch` from "@/lib/queryClient" and expect the
 * raw fetch Response contract. In AiOS the "@" alias resolves here: same
 * signature, but every call rides the FEDERATED session (the aias
 * production token you signed in with) straight to AIAS_API_BASE.
 * No page edits required.
 */

let API_BASE = "https://api.aiassist.net";

// Resolve the real base once from devnet config (aias_api_base).
void (async () => {
  try {
    const res = await fetch("/api/config");
    const cfg = await res.json();
    if (cfg.aias_api_base) API_BASE = String(cfg.aias_api_base).replace(/\/$/, "");
  } catch { /* keep default */ }
})();

export const API_BASE_URL = ""; // v1 export parity (unused here)

function sessionToken(): string | null {
  // Federated mode: the devnet login token IS the aias production token.
  const t = localStorage.getItem("aias_session_token") ||
            localStorage.getItem("devnetwork_hash");
  return t && !t.startsWith("dvs_") ? t : null;
}

export function buildUrl(path: string): string {
  if (path.startsWith("/")) return `${API_BASE}${path}`;
  return path;
}

export async function apiFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const { headers, ...rest } = options;
  const token = sessionToken();
  return fetch(buildUrl(url), {
    ...rest,
    headers: {
      ...(headers || {}),
      ...(token ? { "X-Session-Token": token } : {}),
    },
    // cross-origin: header auth, not cookies
  });
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const res = await apiFetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  return res;
}


// ── react-query (pages like ChangeLog use useQuery) ─────────────────────────
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await apiFetch(queryKey.join("/") as string);
        if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
        return res.json();
      },
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});
