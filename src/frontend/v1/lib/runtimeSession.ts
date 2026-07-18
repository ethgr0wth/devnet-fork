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

export interface ShellResult extends RunCodeResult {
  /** Workspace-relative cwd AFTER the command ran ('.' = workspace root). */
  cwd: string;
}

/** Inner shell timeout; the run_code cap rides 10s above it (lite parity). */
const SHELL_TIMEOUT_SECONDS = 55;

export interface ShellRunCode {
  code: string;
  marker: string;
  timeoutSeconds: number;
}

/**
 * Build the python run_code payload for ONE interactive shell line — the
 * pure half of keystone-lite's runShellCommand + runRemoteTerminalCommand,
 * exported so pages with their own session plumbing (QuestsWorkspace's
 * bottom shell dock) ride the exact same wrapper:
 *   - cwd containment (realpath under the workspace root)
 *   - process-group SIGKILL + exit 124 + notice on timeout
 *   - a per-call cwd marker captures the shell's final $PWD so `cd`
 *     persists to the next line
 */
export function buildShellRunCode(command: string, workingDirectory = "."): ShellRunCode {
  const marker = `__KEYSTONE_CWD_${crypto.randomUUID().replace(/-/g, "")}__`;
  const shellCommand = [
    command,
    "__keystone_exit=$?",
    `printf '\\n${marker}%s\\n' "$PWD"`,
    'exit "$__keystone_exit"',
  ].join("\n");
  const code = [
    "import os, signal, subprocess, sys",
    "root = os.path.realpath(os.getcwd())",
    `requested = ${JSON.stringify(workingDirectory)}`,
    "workdir = os.path.realpath(os.path.join(root, requested))",
    "if os.path.commonpath([root, workdir]) != root or not os.path.isdir(workdir):",
    "    sys.stderr.write('Invalid remote working directory')",
    "    sys.exit(2)",
    `p = subprocess.Popen(${JSON.stringify(shellCommand)}, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, cwd=workdir, start_new_session=True)`,
    "try:",
    `    out, err = p.communicate(timeout=${SHELL_TIMEOUT_SECONDS})`,
    "except subprocess.TimeoutExpired:",
    "    os.killpg(p.pid, signal.SIGKILL)",
    "    out, err = p.communicate()",
    "    sys.stdout.write(out or '')",
    "    sys.stderr.write(err or '')",
    `    sys.stderr.write('\\n[command timed out after ${SHELL_TIMEOUT_SECONDS}s]')`,
    "    sys.exit(124)",
    "sys.stdout.write(out or '')",
    "sys.stderr.write(err or '')",
    "sys.exit(p.returncode or 0)",
  ].join("\n");
  return { code, marker, timeoutSeconds: SHELL_TIMEOUT_SECONDS + 10 };
}

/**
 * Post-process a shell run: strip the cwd marker, compute the
 * workspace-relative cwd, and scrub the runtime's absolute workspace root
 * (/…/workspaces/{sessionId}) from output so host paths never leak.
 */
export function parseShellRunResult(
  result: RunCodeResult,
  marker: string,
  sessionId: string,
  workingDirectory = "."
): ShellResult {
  let stdout = result.stdout || "";
  let stderr = result.stderr || "";
  let cwd = workingDirectory;
  const markerIndex = stdout.lastIndexOf(marker);
  if (markerIndex >= 0) {
    const beforeMarker = stdout.slice(0, markerIndex).replace(/\n$/, "");
    const absoluteCwd = stdout
      .slice(markerIndex + marker.length)
      .split(/\r?\n/, 1)[0]
      .trim();
    stdout = beforeMarker;

    const workspaceToken = `/workspaces/${sessionId}`;
    const workspaceIndex = absoluteCwd.indexOf(workspaceToken);
    if (workspaceIndex >= 0) {
      const runtimeWorkspaceRoot = absoluteCwd.slice(0, workspaceIndex + workspaceToken.length);
      stdout = stdout.split(runtimeWorkspaceRoot).join("/workspace");
      stderr = stderr.split(runtimeWorkspaceRoot).join("/workspace");
      const relative = absoluteCwd
        .slice(workspaceIndex + workspaceToken.length)
        .replace(/^\/+/, "");
      cwd = relative || ".";
    }
  }
  return { ...result, stdout, stderr, cwd };
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
      // Raise the per-execution cap above the shell wrapper's inner timeout
      // so long builds/installs hit the friendly exit-124 path instead of a
      // 500 (keystone-lite runtime-api.ts, verbatim rationale).
      const createRes = await apiFetch("/api/runtime/sessions", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          environment_id: this.envId,
          policy: { max_execution_seconds: SHELL_TIMEOUT_SECONDS + 10 },
        }),
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

  private async execRunCode(
    sessionId: string,
    language: "python" | "node",
    code: string,
    timeoutSeconds?: number
  ): Promise<RunCodeResult> {
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
  }

  runCode(
    language: "python" | "node",
    code: string,
    timeoutSeconds?: number
  ): Promise<RunCodeResult> {
    return this.withSession((sessionId) =>
      this.execRunCode(sessionId, language, code, timeoutSeconds)
    );
  }

  /**
   * One interactive shell line inside the remote workspace — port of
   * keystone-lite's runShellCommand + runRemoteTerminalCommand:
   *
   *   - python wrapper: cwd containment (realpath under the workspace
   *     root), process-group kill + exit 124 on timeout
   *   - a per-call cwd marker captures the shell's final directory, so
   *     `cd src` persists to the next line
   *   - the runtime's absolute workspace root is scrubbed from output
   *     (shown as /workspace), never leaking host paths
   */
  runShell(command: string, workingDirectory = "."): Promise<ShellResult> {
    return this.withSession(async (sessionId) => {
      const { code, marker, timeoutSeconds } = buildShellRunCode(command, workingDirectory);
      const result = await this.execRunCode(sessionId, "python", code, timeoutSeconds);
      return parseShellRunResult(result, marker, sessionId, workingDirectory);
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
