/**
 * v1 runtime — queryClient compat.
 *
 * REAL v1 pages import `apiFetch` from "@/lib/queryClient" and expect the
 * raw fetch Response contract. In AiOS the "@" alias resolves here: same
 * signature, but every call rides the FEDERATED session (the aias
 * production token you signed in with) straight to AIAS_API_BASE.
 * No page edits required.
 */

// SAME-ORIGIN (Mark: "every v1 surface belongs on devnet"): pages call
// their original relative /api paths; devnet's backend proxies unmatched
// v1 prefixes to production server-side with the caller's token forwarded
// as BOTH X-Session-Token and the legacy session cookie. No CORS, no
// cross-origin 401 class, no deploy races.
export const API_BASE_URL = ""; // v1 export parity

function sessionToken(): string | null {
  // Federated mode: the devnet login token IS the aias production token.
  const t = localStorage.getItem("devnetwork_hash") ||
            localStorage.getItem("aias_session_token");
  return t && !t.startsWith("dvs_") ? t : null;
}

export function buildUrl(path: string): string {
  return path; // same-origin: devnet serves or proxies every /api path
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
      ...(token ? { "X-Auth-Hash": token, "X-Session-Token": token } : {}),
    },
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
