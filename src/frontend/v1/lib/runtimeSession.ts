/**
 * runtimeSession — Keystone-Lite parity for the runtime session lifecycle.
 *
 * Ports the desktop app's runtime contract (keystone-lite `runtime-api.ts`,
 * fix e42637a) onto devnet's same-origin `apiFetch`:
 *
 *   - sessions are BOUND to an environment_id at creation (aias PR #34 —
 *     Runtime B fails closed); never adopt a session unless it is already
 *     bound to THIS environment. `sessions[0]` roulette is how you earn a
 *     409 "runtime environment does not match session binding".
 *   - sync_workspace completes BEFORE the session is handed out — an
 *     unsynced workspace 409s "sync the environment before execution".
 *   - any 409 → destroy → recreate → sync → retry ONCE. The `recovering`
 *     guard makes a repeat 409 propagate instead of looping.
 */
import { apiFetch } from "./queryClient";

export type RuntimeStatus = "connecting" | "ready" | "error";

export interface RunCodeResult {
  exit_code: number;
  stdout: string;
  stderr: string;
  [k: string]: unknown;
}

export class RuntimeHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "RuntimeHttpError";
    this.status = status;
  }
}

async function readDetail(res: Response): Promise<string> {
  try {
    const d = await res.json();
    if (d && typeof d.detail === "string") return d.detail;
  } catch {
    /* non-JSON body */
  }
  return `HTTP ${res.status}`;
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export class RuntimeSession {
  private envId: string;
  private sessionId: string | null = null;
  private binding: Promise<string> | null = null;
  /** Guard: recover at most once per logical operation. */
  private recovering = false;
  private disposed = false;
  private onStatus?: (status: RuntimeStatus, sessionId: string | null) => void;

  constructor(
    envId: string,
    onStatus?: (status: RuntimeStatus, sessionId: string | null) => void
  ) {
    this.envId = envId;
    this.onStatus = onStatus;
  }

  private emit(status: RuntimeStatus): void {
    if (!this.disposed) this.onStatus?.(status, this.sessionId);
  }

  private async createAndSync(): Promise<string> {
    // Adopt an existing session ONLY when it is bound to this environment.
    let sessionId: string | null = null;
    try {
      const listRes = await apiFetch("/api/runtime/sessions");
      if (listRes.ok) {
        const d = await listRes.json();
        const sessions: Array<Record<string, unknown>> = Array.isArray(d?.sessions)
          ? d.sessions
          : [];
        const mine = sessions.find(
          (s) => (s.environment_id ?? s.environmentId) === this.envId
        );
        if (mine && typeof mine.session_id === "string") sessionId = mine.session_id;
      }
    } catch {
      /* listing is an optimization; creation below is the real path */
    }

    if (!sessionId) {
      const createRes = await apiFetch("/api/runtime/sessions", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ environment_id: this.envId }),
      });
      if (!createRes.ok) throw new RuntimeHttpError(createRes.status, await readDetail(createRes));
      sessionId = (await createRes.json()).session_id as string;
    }

    // Sync BEFORE first execution — awaited, not fire-and-forget.
    const syncRes = await apiFetch("/api/runtime/sync_workspace", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ session_id: sessionId, environment_id: this.envId }),
    });
    if (!syncRes.ok) throw new RuntimeHttpError(syncRes.status, await readDetail(syncRes));

    return sessionId;
  }

  bind(): Promise<string> {
    if (this.sessionId) return Promise.resolve(this.sessionId);
    if (!this.binding) {
      this.emit("connecting");
      this.binding = this.createAndSync()
        .then((id) => {
          this.sessionId = id;
          this.emit("ready");
          return id;
        })
        .catch((e: unknown) => {
          this.binding = null;
          this.emit("error");
          throw e;
        });
    }
    return this.binding;
  }

  /** Destroy the stale session (best effort), then bind fresh. */
  private async recover(): Promise<string> {
    const stale = this.sessionId;
    this.sessionId = null;
    this.binding = null;
    this.emit("connecting");
    if (stale) {
      try {
        await apiFetch(`/api/runtime/sessions/${stale}`, { method: "DELETE" });
      } catch {
        /* already gone server-side is fine */
      }
    }
    return this.bind();
  }

  /** Run op against the bound session; one 409 self-heal, a second propagates. */
  async withSession<T>(op: (sessionId: string) => Promise<T>): Promise<T> {
    const sessionId = await this.bind();
    try {
      const result = await op(sessionId);
      this.recovering = false;
      return result;
    } catch (e) {
      if (e instanceof RuntimeHttpError && e.status === 409) {
        if (this.recovering) {
          this.recovering = false;
          throw e; // never loop on a repeat 409
        }
        this.recovering = true;
        const fresh = await this.recover();
        const result = await op(fresh);
        this.recovering = false;
        return result;
      }
      throw e;
    }
  }

  runCode(
    language: "python" | "node",
    code: string,
    timeoutSeconds?: number
  ): Promise<RunCodeResult> {
    return this.withSession(async (sessionId) => {
      const res = await apiFetch("/api/runtime/run_code", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          session_id: sessionId,
          language,
          code,
          environment_id: this.envId,
          ...(timeoutSeconds ? { timeout_seconds: timeoutSeconds } : {}),
        }),
      });
      if (!res.ok) throw new RuntimeHttpError(res.status, await readDetail(res));
      return (await res.json()) as RunCodeResult;
    });
  }

  installPackage(
    ecosystem: "pip" | "npm",
    pkg: string
  ): Promise<Record<string, unknown>> {
    return this.withSession(async (sessionId) => {
      const res = await apiFetch("/api/runtime/install_package", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ session_id: sessionId, ecosystem, package: pkg }),
      });
      if (!res.ok) throw new RuntimeHttpError(res.status, await readDetail(res));
      return (await res.json()) as Record<string, unknown>;
    });
  }

  /** Local detach only — the server session stays for TTL/rebind-by-env. */
  dispose(): void {
    this.disposed = true;
    this.sessionId = null;
    this.binding = null;
    this.recovering = false;
  }
}
