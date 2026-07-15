/**
 * KeystoneLiteWorkspace — clean-room desktop IDE for KeyStone environments.
 *
 * Written from scratch as a new file (NOT a refactor of QuestsWorkspace.tsx).
 * Layout parity with Keystone Lite (keystone-lite/):
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ TitleBar (h-10)                                              │
 *   ├──────────┬──────────────────────────────┬────────────────────┤
 *   │ Files    │ Editor tabs + Monaco (65%)   │ Chat               │
 *   │ (20%)    ├──────────────────────────────┤ (30%)              │
 *   │          │ Terminal dock (35%)          │                    │
 *   ├──────────┴──────────────────────────────┴────────────────────┤
 *   │ StatusBar (h-6)                                              │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Design system: bg #0a0a0f, cyan-400 accents, border-white/5, mono type.
 * Behavior: chat modes follow Keystone-Lite (_Gex · Focus · Keystone).
 * Keystone mode auto-applies. _Gex/Focus hold streamed changes in a review
 * gate — Keep accepts, Revert restores the exact pre-change snapshots the
 * backend streams. Edits land in the env workspace immediately either way;
 * the gate governs ACCEPTANCE, riding the snapshot/rollback rails.
 *
 * Mobile (<768px) renders the original QuestsWorkspace untouched.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { registerPortalTarget, isPortalBarMounted, subscribePortalBus } from "../../aios/portalBus";
import {
  ChevronLeft, ChevronRight, ChevronDown, Send, File, Folder, FolderOpen,
  Save, X, Play, Square, Loader2, Terminal, RefreshCw, Search, Package,
  Zap, Bot, User, FileCode, FileJson, FileText, Trash2, Plus, Circle,
  RotateCcw, CheckCircle2, Cpu, MessageSquare, Eye, Pencil,
  Settings, Sparkles, Activity, Download, Globe, Link2, ScrollText, History,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import Editor from "@monaco-editor/react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/queryClient";
import { RuntimeSession } from "@/lib/runtimeSession";
import { parseSurgicalEdits, stripPartialSentinels } from "@/lib/surgicalEdit";
import { buildKeystoneChatBody, type EditorMode } from "@/lib/keystoneChat";
import { toast } from "sonner";
import { useAvailableModels } from "@/hooks/use-available-models";
import QuestsWorkspace from "./QuestsWorkspace";

// ── types ────────────────────────────────────────────────────────────────────

interface FileNode {
  name: string;
  path?: string;
  type: "file" | "directory";
  children?: FileNode[];
}

interface ToolCallEvent {
  id: string;
  name: string;
  arguments: Record<string, any>;
  status: "running" | "done";
  preview?: string;
}

interface ChatMsg {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  filesTouched?: string[];
  toolActive?: boolean;
  toolCalls?: ToolCallEvent[];
}

interface TermResult {
  stdout?: string;
  stderr?: string;
  exit_code?: number;
  duration_ms?: number;
  cwd?: string;
}

// One line of terminal scrollback. "agent" entries arrive from the SAME
// SSE stream driving the chat (a run_command tool call) — the backend runs
// the command exactly once; this is a second render of that one result, not
// a second execution. "pending" is true from the moment the tool_call event
// arrives until its matching tool_result fills the entry in, so the agent's
// commands feel live the same way a human's own "running…" state does.
interface TermEntry {
  id: string;
  source: "human" | "agent";
  label: string;
  pending?: boolean;
  result?: TermResult;
}

// Saved KeyStone artifact (parity with QuestsWorkspace's KSArtifact).
interface KSArtifact {
  id: string;
  name: string;
  target_stack: string;
  status: string;
  created_at: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const EXT_LANG: Record<string, string> = {
  py: "python", js: "javascript", jsx: "javascript", ts: "typescript",
  tsx: "typescript", json: "json", html: "html", css: "css", md: "markdown",
  yml: "yaml", yaml: "yaml", sh: "shell", sql: "sql", txt: "plaintext",
  toml: "ini", env: "ini",
};

function langOf(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  return EXT_LANG[ext] || "plaintext";
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["py", "js", "jsx", "ts", "tsx", "sh"].includes(ext))
    return <FileCode className="h-3.5 w-3.5 text-cyan-400/70 shrink-0" />;
  if (ext === "json")
    return <FileJson className="h-3.5 w-3.5 text-amber-400/70 shrink-0" />;
  if (["md", "txt"].includes(ext))
    return <FileText className="h-3.5 w-3.5 text-zinc-400 shrink-0" />;
  return <File className="h-3.5 w-3.5 text-zinc-500 shrink-0" />;
}

function baseName(p: string): string {
  return p.split("/").pop() || p;
}

// Live activity card metadata for each KEYSTONE_IDE_TOOLS entry (backend:
// aias api/routes/quests.py). Replaces the old plain-text "> ⚙ label"
// injected into the markdown stream — see toolMeta() call sites below.
const TOOL_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; label: (a: Record<string, any>) => string }
> = {
  read_file: { icon: FileCode, label: (a) => `Reading ${a?.path || "file"}` },
  search_files: { icon: Search, label: (a) => `Searching "${a?.pattern || ""}"` },
  glob_files: { icon: FolderOpen, label: (a) => `Finding files matching ${a?.pattern || ""}` },
  list_functions: { icon: Activity, label: (a) => `Analyzing ${a?.path || "file"}` },
  clone_repo: { icon: Download, label: (a) => `Cloning ${a?.url || "repository"}` },
  // Keystone-Lite tool parity (backend: aias api/routes/quests.py KEYSTONE_IDE_TOOLS)
  tavily_search: { icon: Globe, label: (a) => `Searching the web for "${a?.query || ""}"` },
  web_scrape: { icon: Link2, label: (a) => `Reading ${a?.url || "a page"}` },
  run_command: { icon: Terminal, label: (a) => `Running \`${a?.command || ""}\`` },
  start_app: { icon: Play, label: (a) => `Starting \`${a?.command || "the app"}\`` },
  stop_app: { icon: Square, label: () => "Stopping the app" },
  get_logs: { icon: ScrollText, label: () => "Reading app logs" },
  recall_context: { icon: History, label: (a) => `Recalling "${a?.query || ""}" from earlier` },
};

function toolMeta(name: string) {
  return TOOL_META[name] || { icon: Cpu, label: () => name || "Running tool" };
}

// The one tool whose live activity also gets mirrored into the Terminal
// panel's output transcript (not just the chat's tool-call card) — see the
// termHistory wiring below. Scoped to run_command only: it's the direct
// analog of what a human types into this SAME terminal, so seeing it there
// too (not just in chat) is the point. start_app/stop_app/get_logs stay
// chat-card-only for now — mirroring those would mean parsing their
// free-text result strings client-side, which is a separate, more fragile
// problem this doesn't attempt to solve.
const TERMINAL_MIRROR_TOOLS = new Set(["run_command"]);

// ── component ────────────────────────────────────────────────────────────────

export default function KeystoneLiteWorkspace() {
  const params = useParams<{ id: string }>();
  const envId = params.id;
  const [, setLocation] = useLocation();

  // mobile keeps the original workspace untouched
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < 768
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // environment
  const [envName, setEnvName] = useState<string>("");

  // file explorer
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set([""]));
  const [fileFilter, setFileFilter] = useState("");
  const [treeLoading, setTreeLoading] = useState(true);

  // editor
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [tabContents, setTabContents] = useState<
    Record<string, { content: string; original: string }>
  >({});
  const [saving, setSaving] = useState(false);
  // brief success flash on the Save button — separate from `saving` so the
  // checkmark can hold for a beat after the request already finished
  const [justSaved, setJustSaved] = useState(false);

  // chat
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  // modes — QuestsWorkspace parity: keystone (agentic, auto-apply) | focus
  // (research/docs), plus the independent Read-Only ⟷ Read & Write toggle.
  // _Gex is NOT a mode — it returns as a one-shot scan button with its own
  // patch pipeline in a later parity increment.
  const [editorMode, setEditorMode] = useState<EditorMode>("keystone");
  const [readOnlyMode, setReadOnlyMode] = useState(false);
  // chat settings — QW-parity request fields. The settings panel (gear icon
  // in the Agent header) surfaces editor-less setters for these; they flow
  // straight into buildKeystoneChatBody on every chat send.
  const [ksTemperature, setKsTemperature] = useState(0.7);
  const [ksMaxTokens, setKsMaxTokens] = useState(32768);
  const [ksPersona, setKsPersona] = useState("");
  // settings panel visibility — desktop parity with QuestsWorkspace's settings
  // tab + mobile drawer (mobile already renders QW untouched, so this is the
  // desktop-only surface).
  const [settingsOpen, setSettingsOpen] = useState(false);
  // rollback: auto-apply stays on, but every applied change keeps a snapshot
  // (path → pre-change content; created=true means revert deletes the file)
  const [agentChanges, setAgentChanges] = useState<
    Record<string, { snap: string; created: boolean }>
  >({});
  const snapshotsRef = useRef<Record<string, string>>({});
  const streamAbortRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const termEndRef = useRef<HTMLDivElement>(null);

  // models / provider
  const { providers, provider: defaultProvider, getModelsForProvider } =
    useAvailableModels();
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("auto");

  // single-prompt bus: KeyStone (desktop) is a portal target. Keeps its
  // mode/model/read-write chips but surrenders its text input to the portal
  // bar when a bar is mounted (mirrors QuestsWorkspace on mobile).
  const [portalDriven, setPortalDriven] = useState(isPortalBarMounted());
  const sendRef = useRef<(t?: string) => void>(() => {});
  useEffect(() => { sendRef.current = sendMessage; });
  useEffect(() => subscribePortalBus(() => setPortalDriven(isPortalBarMounted())), []);
  useEffect(() => {
    if (isMobile) return; // mobile renders QuestsWorkspace, which registers its own
    return registerPortalTarget({
      appId: "keystone",
      label: envName ? `KeyStone · ${envName}` : "KeyStone",
      placeholder: readOnlyMode
        ? "Ask KeyStone about the code…"
        : editorMode === "focus"
          ? "Ask KeyStone about docs & architecture…"
          : "Tell KeyStone what to build…",
      submit: (t) => sendRef.current?.(t),
    });
  }, [envName, editorMode, readOnlyMode, isMobile]);
  const effectiveProvider = selectedProvider || defaultProvider || "";
  const providerModels = effectiveProvider
    ? getModelsForProvider(effectiveProvider)
    : [];

  // ── artifacts (parity with QuestsWorkspace) ────────────────────────────────
  // Saved KeyStone artifacts (/api/artifacts): list, import-into-env, rename,
  // delete. Mirrors QW's ksArtifacts surface; desktop panel toggled from the
  // Agent header (Package button), mobile falls back to QW which already has it.
  const [ksArtifacts, setKsArtifacts] = useState<KSArtifact[]>([]);
  const [ksArtifactsLoading, setKsArtifactsLoading] = useState(false);
  const [ksImporting, setKsImporting] = useState<string | null>(null);
  const [renamingKsArtifactId, setRenamingKsArtifactId] = useState<string | null>(null);
  const [renameKsArtifactValue, setRenameKsArtifactValue] = useState("");
  const [artifactsOpen, setArtifactsOpen] = useState(false);

  const KS_LANG_EXT: Record<string, string> = {
    python: ".py", py: ".py", javascript: ".js", js: ".js",
    typescript: ".ts", ts: ".ts", tsx: ".tsx", jsx: ".jsx",
    html: ".html", css: ".css", json: ".json",
    markdown: ".md", md: ".md", sql: ".sql",
    bash: ".sh", sh: ".sh", shell: ".sh",
    go: ".go", rust: ".rs", rs: ".rs",
    java: ".java", ruby: ".rb", rb: ".rb",
    php: ".php", swift: ".swift", kotlin: ".kt",
    yaml: ".yaml", yml: ".yaml", xml: ".xml",
    c: ".c", cpp: ".cpp", "c++": ".cpp",
    vue: ".vue", svelte: ".svelte",
  };

  const loadKsArtifacts = useCallback(async () => {
    setKsArtifactsLoading(true);
    try {
      const res = await apiFetch("/api/artifacts?limit=100");
      if (res.ok) {
        const data = await res.json();
        setKsArtifacts(data.artifacts || []);
      }
    } catch (e) { console.error("Failed to load artifacts:", e); }
    finally { setKsArtifactsLoading(false); }
  }, []);

  useEffect(() => { loadKsArtifacts(); }, [loadKsArtifacts]);

  const importArtifactToEnv = async (artifact: KSArtifact) => {
    if (!envId) return;
    setKsImporting(artifact.id);
    try {
      const fullRes = await apiFetch(`/api/artifacts/${artifact.id}`);
      if (!fullRes.ok) { setKsImporting(null); return; }
      const full = await fullRes.json();
      const code = full.source_code || "";
      if (!code) { setKsImporting(null); return; }
      const stack = (full.target_stack || "").toLowerCase().trim();
      let filename = artifact.name;
      const ext = KS_LANG_EXT[stack] || "";
      const hasDot = filename.includes(".");
      if (ext) {
        if (!filename.endsWith(ext)) filename = filename.replace(/\.[^.]*$/, "") + ext;
      } else if (!hasDot && stack) {
        filename += `.${stack}`;
      } else if (!hasDot) {
        filename += ".txt";
      }
      const writeRes = await apiFetch(`/api/keystone/environments/${envId}/files/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filename, content: code }),
      });
      if (writeRes.ok) {
        loadFileTree();
        toast.success(`Imported ${filename}`);
      } else {
        toast.error("Failed to import artifact");
      }
    } catch (e) { console.error("Failed to import artifact:", e); toast.error("Failed to import artifact"); }
    finally { setKsImporting(null); }
  };

  const startKsArtifactRename = (id: string, currentName: string) => {
    setRenamingKsArtifactId(id);
    setRenameKsArtifactValue(currentName);
  };

  const submitKsArtifactRename = async () => {
    if (!renamingKsArtifactId || !renameKsArtifactValue.trim()) { setRenamingKsArtifactId(null); return; }
    const old = ksArtifacts.find((a) => a.id === renamingKsArtifactId);
    if (old && renameKsArtifactValue.trim() === old.name) { setRenamingKsArtifactId(null); return; }
    try {
      const res = await apiFetch(`/api/artifacts/${renamingKsArtifactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameKsArtifactValue.trim() }),
      });
      if (res.ok) {
        toast.success("Artifact renamed");
        loadKsArtifacts();
      } else { toast.error("Rename failed"); }
    } catch (e) { console.error(e); toast.error("Rename failed"); }
    finally { setRenamingKsArtifactId(null); }
  };

  const deleteKsArtifact = async (id: string) => {
    try {
      const res = await apiFetch(`/api/artifacts/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Artifact deleted");
        loadKsArtifacts();
      } else { toast.error("Delete failed"); }
    } catch (e) { console.error(e); toast.error("Delete failed"); }
  };

  // runtime / terminal
  const [runtimeSessionId, setRuntimeSessionId] = useState<string | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<
    "connecting" | "ready" | "error"
  >("connecting");
  const runtimeRef = useRef<RuntimeSession | null>(null);
  const [termLang, setTermLang] = useState<"shell" | "python" | "node">("shell");
  // shell mode: workspace-relative cwd persists between lines (lite parity)
  const [termCwd, setTermCwd] = useState(".");
  const [termCode, setTermCode] = useState("");
  // Scrollback transcript — human-typed runs AND mirrored agent run_command
  // calls, oldest first. See TermEntry above for why "agent" entries don't
  // mean double execution.
  const [termHistory, setTermHistory] = useState<TermEntry[]>([]);
  const [termRunning, setTermRunning] = useState(false);
  const [pkgEco, setPkgEco] = useState<"pip" | "npm">("pip");
  const [pkgName, setPkgName] = useState("");
  const [pkgInstalling, setPkgInstalling] = useState(false);
  // app process (lite parity: keystone-api run/stop/logs — dev servers live
  // here with a preview URL; the shell is for one-shot commands)
  const [appCmd, setAppCmd] = useState("");
  const [appRunning, setAppRunning] = useState(false);
  const [appBusy, setAppBusy] = useState(false);
  const [appInfo, setAppInfo] = useState<{
    port?: number | null;
    preview_url?: string;
    command?: string;
  } | null>(null);

  // ── data loading ───────────────────────────────────────────────────────────

  const loadEnvironment = useCallback(async () => {
    try {
      const r = await apiFetch(`/api/keystone/environments/${envId}`).then(
        (r) => r.json()
      );
      setEnvName(r.name || r.environment?.name || envId);
    } catch {
      setLocation("/keystone");
    }
  }, [envId, setLocation]);

  const loadFileTree = useCallback(async () => {
    try {
      const r = await apiFetch(
        `/api/keystone/environments/${envId}/files/tree`
      ).then((r) => r.json());
      setFileTree(r.tree || null);
    } catch {
      /* tree stays as-is */
    } finally {
      setTreeLoading(false);
    }
  }, [envId]);

  const loadChatHistory = useCallback(async () => {
    try {
      const r = await apiFetch(
        `/api/keystone/environments/${envId}/chat/history?limit=50`
      ).then((r) => r.json());
      setMessages(
        (r.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          filesTouched: [
            ...(m.files_created || []),
            ...(m.files_modified || []),
          ],
        }))
      );
    } catch {
      /* empty history is fine */
    }
  }, [envId]);

  const initRuntime = useCallback(async () => {
    // Keystone-Lite parity: sessions are adopted only when bound to THIS
    // environment, workspace sync is awaited before ready, and every
    // execution self-heals one 409 (destroy → recreate → sync → retry).
    runtimeRef.current?.dispose();
    setTermCwd(".");
    const rs = new RuntimeSession(envId!, (status, sessionId) => {
      setRuntimeStatus(status);
      setRuntimeSessionId(sessionId);
    });
    runtimeRef.current = rs;
    try {
      await rs.bind();
    } catch {
      /* status already shows the failure; file editing still works */
    }
  }, [envId]);

  useEffect(() => {
    if (!envId || isMobile) return;
    loadEnvironment();
    loadFileTree();
    loadChatHistory();
    initRuntime();
  }, [envId, isMobile, loadEnvironment, loadFileTree, loadChatHistory, initRuntime]);

  useEffect(() => () => runtimeRef.current?.dispose(), []);

  // ── editor actions ─────────────────────────────────────────────────────────

  const openFile = useCallback(
    async (path: string) => {
      setActivePath(path);
      setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
      if (tabContents[path] === undefined) {
        try {
          const r = await apiFetch(
            `/api/keystone/environments/${envId}/files/read?path=${encodeURIComponent(path)}`
          ).then((r) => r.json());
          const c = r.content ?? "";
          setTabContents((prev) => ({
            ...prev,
            [path]: { content: c, original: c },
          }));
        } catch {
          toast.error(`Could not read ${baseName(path)}`);
        }
      }
    },
    [envId, tabContents]
  );

  const closeTab = (path: string) => {
    const next = openTabs.filter((p) => p !== path);
    setOpenTabs(next);
    if (activePath === path) setActivePath(next[next.length - 1] || null);
    setTabContents((prev) => {
      const { [path]: _drop, ...rest } = prev;
      return rest;
    });
  };

  const saveActiveFile = useCallback(async () => {
    if (!activePath) return;
    const tab = tabContents[activePath];
    if (!tab || tab.content === tab.original) return;
    setSaving(true);
    try {
      await apiFetch(`/api/keystone/environments/${envId}/files/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: activePath, content: tab.content }),
      });
      setTabContents((prev) => ({
        ...prev,
        [activePath]: { ...prev[activePath], original: tab.content },
      }));
      toast.success(`Saved ${baseName(activePath)}`);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1200);
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }, [activePath, tabContents, envId]);

  // Ctrl/Cmd+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveActiveFile();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveActiveFile]);

  const createFile = async () => {
    const path = window.prompt("New file path (e.g. src/app.py):");
    if (!path?.trim()) return;
    try {
      await apiFetch(`/api/keystone/environments/${envId}/files/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: path.trim(), content: "" }),
      });
      await loadFileTree();
      openFile(path.trim());
      toast.success(`Created ${baseName(path.trim())}`);
    } catch {
      toast.error("Could not create file");
    }
  };

  // reload the content of files the agent touched (auto-approve: no gate)
  const absorbAgentChanges = useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) return;
      loadFileTree();
      for (const fp of paths) {
        try {
          const r = await apiFetch(
            `/api/keystone/environments/${envId}/files/read?path=${encodeURIComponent(fp)}`
          ).then((r) => r.json());
          const c = r.content ?? "";
          setOpenTabs((prev) => (prev.includes(fp) ? prev : [...prev, fp]));
          setTabContents((prev) => {
            const existing = prev[fp];
            // don't clobber the user's unsaved edits in this tab — keep their
            // buffer, but update `original` so the dirty marker stays honest
            if (existing && existing.content !== existing.original) {
              toast.warning(
                `${baseName(fp)} changed by the agent — your unsaved edits kept (save to overwrite)`,
                { duration: 6000 }
              );
              return { ...prev, [fp]: { ...existing, original: c } };
            }
            return { ...prev, [fp]: { content: c, original: c } };
          });
        } catch {
          /* file may have been deleted */
        }
      }
      setActivePath(paths[0]);
      toast.success(
        `${paths.length} change${paths.length > 1 ? "s" : ""} auto-applied`,
        { duration: 4000 }
      );
    },
    [envId, loadFileTree]
  );

  // ── rollback (undo auto-applied agent changes) ─────────────────────────────

  const revertFile = useCallback(
    async (fp: string, entry?: { snap: string; created: boolean }) => {
      const change = entry ?? agentChanges[fp];
      if (!change) return;
      try {
        if (change.created) {
          // file didn't exist before the agent — revert = delete it
          await apiFetch(
            `/api/keystone/environments/${envId}/files/delete?path=${encodeURIComponent(fp)}`,
            { method: "DELETE" }
          );
          setOpenTabs((prev) => prev.filter((p) => p !== fp));
          setActivePath((prev) => (prev === fp ? null : prev));
          setTabContents((prev) => {
            const { [fp]: _drop, ...rest } = prev;
            return rest;
          });
        } else {
          // restore the pre-change snapshot
          await apiFetch(`/api/keystone/environments/${envId}/files/write`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: fp, content: change.snap }),
          });
          setTabContents((prev) =>
            prev[fp] !== undefined
              ? {
                  ...prev,
                  [fp]: { content: change.snap, original: change.snap },
                }
              : prev
          );
        }
        delete snapshotsRef.current[fp];
        setAgentChanges((prev) => {
          const { [fp]: _drop, ...rest } = prev;
          return rest;
        });
        loadFileTree();
        toast.success(
          change.created
            ? `Removed ${baseName(fp)}`
            : `Reverted ${baseName(fp)}`
        );
      } catch {
        toast.error(`Could not revert ${baseName(fp)}`);
      }
    },
    [agentChanges, envId, loadFileTree]
  );

  const revertAll = async () => {
    for (const [fp, entry] of Object.entries(agentChanges)) {
      await revertFile(fp, entry);
    }
  };

  const dismissChanges = () => {
    snapshotsRef.current = {};
    setAgentChanges({});
    toast.info("Changes kept — undo history cleared");
  };

  // ── chat ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (autoScrollRef.current)
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onChatScroll = () => {
    const el = chatScrollRef.current;
    if (!el) return;
    autoScrollRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const sendMessage = async (textArg?: string) => {
    const text = (textArg ?? chatInput).trim();
    if (!text || sending) return;
    setChatError(null);
    setChatInput("");
    autoScrollRef.current = true;

    const userMsg: ChatMsg = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    const draftId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: draftId, role: "assistant", content: "", timestamp: new Date().toISOString() },
    ]);
    setSending(true);

    let fullContent = "";
    const touched = new Set<string>();
    const writtenSet = new Set<string>();

    try {
      const abortCtrl = new AbortController();
      streamAbortRef.current = abortCtrl;
      // Same token transport as apiFetch — the raw SSE fetch must ride the
      // federated session exactly like every sibling call in this file.
      const tok =
        localStorage.getItem("devnetwork_hash") ||
        localStorage.getItem("aias_session_token");
      const response = await fetch(
        `/api/keystone/environments/${envId}/chat/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-AiAssist-Provider": effectiveProvider,
            ...(tok && !tok.startsWith("dvs_")
              ? { "X-Auth-Hash": tok, "X-Session-Token": tok }
              : {}),
          },
          body: JSON.stringify(
            // QuestsWorkspace-exact request body (see lib/keystoneChat.ts,
            // matrix-tested in scripts/test-frontend-libs.mjs)
            buildKeystoneChatBody({
              message: text,
              model: selectedModel,
              editorMode,
              readOnlyMode,
              settings: {
                temperature: ksTemperature,
                maxTokens: ksMaxTokens,
                persona: ksPersona,
              },
            })
          ),
          credentials: "include",
          signal: abortCtrl.signal,
        }
      );

      if (!response.ok) {
        const err = await response
          .json()
          .catch(() => ({ detail: "Request failed" }));
        throw new Error(err.detail || `Chat failed (${response.status})`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const patchDraft = (fn: (m: ChatMsg) => ChatMsg) =>
        setMessages((prev) => prev.map((m) => (m.id === draftId ? fn(m) : m)));

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let data: any;
          try {
            data = JSON.parse(line.slice(6));
          } catch {
            continue;
          }
          switch (data.type) {
            case "content":
              if (data.content) {
                fullContent += data.content;
                patchDraft((m) => ({ ...m, content: fullContent }));
              }
              break;
            case "tool_call": {
              // Structured activity, not text: rendered as a live card (see
              // the toolCalls map in the message list) so tool use reads the
              // same visual language as the Surgical Edits card, instead of
              // a plain "> ⚙ label" line injected into the markdown stream.
              const call: ToolCallEvent = {
                id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                name: data.name || "tool",
                arguments: data.arguments || {},
                status: "running",
              };
              patchDraft((m) => ({
                ...m,
                toolCalls: [...(m.toolCalls || []), call],
                toolActive: true,
              }));
              // run_command ALSO shows up in the Terminal panel — the same
              // single server-side execution result, rendered in a second
              // place, not run twice. See TERMINAL_MIRROR_TOOLS.
              if (TERMINAL_MIRROR_TOOLS.has(call.name)) {
                pushTermEntry({
                  source: "agent",
                  label: toolMeta(call.name).label(call.arguments),
                  pending: true,
                });
              }
              break;
            }
            case "tool_result":
              // Tool calls execute one at a time server-side (quests.py runs
              // them in strict call→result order), so the last "running"
              // entry is always the one this result belongs to.
              patchDraft((m) => {
                const calls = m.toolCalls || [];
                const idx = calls.map((c) => c.status).lastIndexOf("running");
                if (idx === -1) return { ...m, toolActive: false };
                const next = calls.slice();
                next[idx] = { ...next[idx], status: "done", preview: data.preview };
                return { ...m, toolCalls: next, toolActive: false };
              });
              if (data.name && TERMINAL_MIRROR_TOOLS.has(data.name)) {
                // Same correlation rule as the chat's toolCalls array: at
                // most one pending AGENT entry exists at a time (strict
                // call→result order server-side), so "last pending agent
                // entry" always means this result.
                setTermHistory((prev) => {
                  const idx = prev
                    .map((e) => e.source === "agent" && e.pending)
                    .lastIndexOf(true);
                  if (idx === -1) return prev;
                  const next = prev.slice();
                  next[idx] = {
                    ...next[idx],
                    pending: false,
                    result: {
                      stdout: data.stdout ?? "",
                      stderr: data.stderr ?? "",
                      exit_code: data.exit_code ?? null,
                      cwd: data.cwd,
                    },
                  };
                  return next;
                });
                if (typeof data.cwd === "string") setTermCwd(data.cwd);
              }
              break;
            case "file_written":
            case "file_edited":
              if (data.path) {
                touched.add(data.path);
                if (data.type === "file_written") writtenSet.add(data.path);
                patchDraft((m) => ({ ...m, filesTouched: [...touched] }));
              }
              break;
            case "files_written":
            case "files_edited":
              for (const f of data.files || []) {
                touched.add(f);
                if (data.type === "files_written") writtenSet.add(f);
              }
              patchDraft((m) => ({ ...m, filesTouched: [...touched] }));
              break;
            case "snapshots":
              // pre-change contents — first snapshot wins (the true original)
              for (const [p, c] of Object.entries(data.snapshots || {})) {
                if (snapshotsRef.current[p] === undefined)
                  snapshotsRef.current[p] = String(c ?? "");
              }
              break;
            case "file_error":
              toast.error(`Write failed: ${data.path} — ${data.error}`);
              break;
            case "edit_error":
              toast.error(`Edit failed: ${data.path} — ${data.error}`);
              break;
            case "context_refresh":
              setMessages((prev) => [
                ...prev,
                {
                  id: `ctx-${Date.now()}`,
                  role: "system",
                  content: `Context auto-refreshed — ${data.messages_trimmed || 0} messages trimmed. Retrying.`,
                  timestamp: new Date().toISOString(),
                },
              ]);
              break;
            case "done": {
              for (const f of data.files_written || []) {
                touched.add(f);
                writtenSet.add(f);
              }
              for (const f of data.files_edited || []) touched.add(f);
              const finalTouched = [...touched];
              // remember how to undo each change (QW parity: auto-apply with
              // the applied-changes strip as the undo)
              const entries: Record<string, { snap: string; created: boolean }> = {};
              for (const f of finalTouched) {
                const snap = snapshotsRef.current[f] ?? "";
                entries[f] = { snap, created: writtenSet.has(f) && !snap };
              }
              if (finalTouched.length > 0) {
                setAgentChanges((prev) => ({ ...entries, ...prev }));
              }
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === draftId
                    ? {
                        ...m,
                        id: data.message_id || m.id,
                        content: fullContent,
                        filesTouched: finalTouched,
                        toolActive: false,
                      }
                    : m
                )
              );
              // QW parity: auto-apply; focus/read-only chats produce no
              // file changes, so this is a no-op there.
              await absorbAgentChanges(finalTouched);
              break;
            }
            case "error":
              setChatError(data.error);
              toast.error(data.error);
              break;
          }
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        toast.info("Stream stopped");
        // don't leave a tool-call card pulsing "running" forever if the user
        // stopped the stream mid-execution. patchDraft is scoped to the try{}
        // above, so this uses setMessages directly.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === draftId
              ? {
                  ...m,
                  toolActive: false,
                  toolCalls: (m.toolCalls || []).map((c) =>
                    c.status === "running" ? { ...c, status: "done", preview: "stopped" } : c
                  ),
                }
              : m
          )
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== draftId));
        const msg = err?.message || "Failed to send message";
        setChatError(msg);
        toast.error(msg);
      }
    } finally {
      streamAbortRef.current = null;
      setSending(false);
    }
  };

  const stopStream = () => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
  };

  const resetContext = async () => {
    try {
      await apiFetch(
        `/api/keystone/environments/${envId}/chat/reset-context`,
        { method: "POST" }
      );
      toast.success("Context reset — the agent starts fresh");
    } catch {
      toast.error("Reset failed");
    }
  };

  // ── terminal ───────────────────────────────────────────────────────────────

  useEffect(() => {
    termEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [termHistory]);

  const pushTermEntry = (entry: Omit<TermEntry, "id">): string => {
    const id = `term-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setTermHistory((prev) => [...prev, { ...entry, id }]);
    return id;
  };

  const updateTermEntry = (id: string, patch: Partial<TermEntry>) => {
    setTermHistory((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const runCode = async () => {
    const rs = runtimeRef.current;
    if (!rs || termRunning || !termCode.trim()) return;
    const command = termCode;
    setTermRunning(true);
    const entryId = pushTermEntry({
      source: "human",
      label: termLang === "shell" ? `$ ${command}` : command,
      pending: true,
    });
    try {
      if (termLang === "shell") {
        // lite parity: cwd marker rides every line — `cd` persists, runtime
        // host paths are scrubbed to /workspace before display
        const r = await rs.runShell(command, termCwd);
        setTermCwd(r.cwd || ".");
        updateTermEntry(entryId, { pending: false, result: r as TermResult });
        setTermCode("");
      } else {
        const r = await rs.runCode(termLang, command);
        updateTermEntry(entryId, { pending: false, result: r as TermResult });
      }
    } catch (e) {
      updateTermEntry(entryId, {
        pending: false,
        result: { stdout: "", stderr: e instanceof Error ? e.message : String(e), exit_code: -1 },
      });
    } finally {
      setTermRunning(false);
    }
  };

  const installPackage = async () => {
    const rs = runtimeRef.current;
    if (!rs || !pkgName.trim() || pkgInstalling) return;
    setPkgInstalling(true);
    try {
      const d = await rs.installPackage(pkgEco, pkgName.trim());
      toast.success(`Package ${d.package || pkgName.trim()} recorded (${d.ecosystem || pkgEco})`);
      setPkgName("");
    } catch {
      toast.error("Package install failed");
    } finally {
      setPkgInstalling(false);
    }
  };

  // ── app process (run / stop / logs — quests.py allowlisted app runner) ────

  const startApp = async () => {
    const cmd = appCmd.trim();
    if (!cmd || appBusy || appRunning) return;
    setAppBusy(true);
    try {
      const r = await apiFetch(`/api/keystone/environments/${envId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "App start failed");
      setAppRunning(true);
      setAppInfo(d);
      toast.success(`App started${d.port ? ` on :${d.port}` : ""}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setAppBusy(false);
    }
  };

  const stopApp = async () => {
    if (appBusy) return;
    setAppBusy(true);
    try {
      await apiFetch(`/api/keystone/environments/${envId}/stop`, { method: "POST" });
      setAppRunning(false);
      setAppInfo(null);
      toast.success("App stopped");
    } catch {
      toast.error("Stop failed");
    } finally {
      setAppBusy(false);
    }
  };

  const fetchAppLogs = async () => {
    try {
      const r = await apiFetch(
        `/api/keystone/environments/${envId}/logs?lines=120`
      ).then((r) => r.json());
      const logs = Array.isArray(r.logs) ? r.logs.join("\n") : String(r.logs ?? "");
      pushTermEntry({ source: "human", label: "app logs", result: { stdout: logs || "(no app logs yet)" } });
    } catch {
      toast.error("Could not fetch app logs");
    }
  };

  // ── file tree rendering ────────────────────────────────────────────────────

  const matchesFilter = (node: FileNode): boolean => {
    if (!fileFilter) return true;
    const q = fileFilter.toLowerCase();
    if (node.name.toLowerCase().includes(q)) return true;
    return (node.children || []).some(matchesFilter);
  };

  const renderNode = (node: FileNode, depth: number, parentPath: string) => {
    const path = node.path || (parentPath ? `${parentPath}/${node.name}` : node.name);
    if (!matchesFilter(node)) return null;
    if (node.type === "directory") {
      const isOpen = expanded.has(path) || !!fileFilter;
      return (
        <div key={path}>
          <button
            className="flex w-full items-center gap-1.5 rounded px-1.5 py-[3px] text-left text-[12px] text-zinc-300 hover:bg-white/5"
            style={{ paddingLeft: `${6 + depth * 12}px` }}
            onClick={() =>
              setExpanded((prev) => {
                const n = new Set(prev);
                n.has(path) ? n.delete(path) : n.add(path);
                return n;
              })
            }
            data-testid={`ksl-folder-${path}`}
          >
            {isOpen ? (
              <ChevronDown className="h-3 w-3 text-zinc-500 shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 text-zinc-500 shrink-0" />
            )}
            {isOpen ? (
              <FolderOpen className="h-3.5 w-3.5 text-cyan-400/60 shrink-0" />
            ) : (
              <Folder className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
          </button>
          {isOpen &&
            (node.children || []).map((c) => renderNode(c, depth + 1, path))}
        </div>
      );
    }
    const isActive = activePath === path;
    return (
      <button
        key={path}
        className={`flex w-full items-center gap-1.5 rounded px-1.5 py-[3px] text-left text-[12px] ${
          isActive
            ? "bg-cyan-500/10 text-cyan-300"
            : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
        }`}
        style={{ paddingLeft: `${6 + depth * 12 + 12}px` }}
        onClick={() => openFile(path)}
        data-testid={`ksl-file-${path}`}
      >
        {fileIcon(node.name)}
        <span className="truncate">{node.name}</span>
      </button>
    );
  };

  // ── markdown for chat ──────────────────────────────────────────────────────

  const mdComponents = {
    code({ inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || "");
      if (!inline && match) {
        return (
          <SyntaxHighlighter
            style={oneDark as any}
            language={match[1]}
            PreTag="div"
            customStyle={{
              margin: "8px 0",
              borderRadius: 6,
              fontSize: 11.5,
              background: "#0d1117",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        );
      }
      return (
        <code
          className="rounded bg-white/10 px-1 py-0.5 font-mono text-[11px] text-cyan-300"
          {...props}
        >
          {children}
        </code>
      );
    },
    p: ({ children }: any) => (
      <p className="mb-2 leading-relaxed last:mb-0">{children}</p>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="my-1.5 border-l-2 border-cyan-500/40 pl-2 text-[11.5px] italic text-zinc-500">
        {children}
      </blockquote>
    ),
    ul: ({ children }: any) => (
      <ul className="mb-2 list-disc pl-4">{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className="mb-2 list-decimal pl-4">{children}</ol>
    ),
    a: ({ href, children }: any) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">
        {children}
      </a>
    ),
  };

  // ── settings panel (desktop parity with QuestsWorkspace) ───────────────────
  // Same field set + data-testids as QW's renderSettingsContent(), restyled to
  // the KLW dark design system (bg #0a0a0f / cyan-400 accent / mono type) so it
  // reads as native chrome rather than a transplanted QW tab.
  const renderSettingsContent = () => (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-1 flex-col gap-5 overflow-y-auto p-3"
      data-testid="ksl-settings-content"
    >
      <div>
        <h3 className="mb-2.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          <Sparkles className="h-3 w-3" />
          AI Configuration
        </h3>
        <div className="space-y-3.5">
          <div>
            <label className="mb-1 block text-[11px] text-zinc-500">
              Temperature: {ksTemperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={ksTemperature}
              onChange={(e) => setKsTemperature(parseFloat(e.target.value))}
              className="w-full accent-cyan-400"
              data-testid="settings-slider-temperature"
            />
            <div className="mt-0.5 flex justify-between text-[9.5px] text-zinc-600">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-500">Max Tokens</label>
            <input
              type="number"
              value={ksMaxTokens}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (!isNaN(v) && v > 0) setKsMaxTokens(v);
              }}
              className="h-7 w-full rounded border border-white/10 bg-white/[0.03] px-2.5 text-[11.5px] text-zinc-300"
              data-testid="settings-input-max-tokens"
            />
          </div>
        </div>
      </div>
      <div className="border-t border-white/5 pt-3.5">
        <h3 className="mb-2.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          <Bot className="h-3 w-3" />
          Custom Persona
        </h3>
        <Textarea
          value={ksPersona}
          onChange={(e) => setKsPersona(e.target.value)}
          placeholder="Give the AI a custom role or personality for this session…"
          className="min-h-[96px] resize-none border-white/10 bg-white/[0.03] text-[11.5px] text-zinc-300"
          data-testid="settings-textarea-persona"
        />
        <p className="mt-1.5 text-[9.5px] text-zinc-600">
          Prepended to the system prompt for all messages.
        </p>
      </div>
      <div className="border-t border-white/5 pt-3.5">
        <h3 className="mb-2.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          <Activity className="h-3 w-3" />
          Current Config
        </h3>
        <div className="space-y-1.5 rounded border border-white/5 bg-white/[0.02] p-2.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-zinc-500">Provider</span>
            <span className="text-zinc-300">{effectiveProvider || "Auto"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Model</span>
            <span className="text-zinc-300">{selectedModel || "Auto"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Temperature</span>
            <span className="text-zinc-300">{ksTemperature.toFixed(1)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Max Tokens</span>
            <span className="text-zinc-300">{ksMaxTokens.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Mode</span>
            <span className="text-zinc-300 capitalize">{editorMode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Persona</span>
            <span className="text-zinc-300">{ksPersona ? "Custom" : "Default"}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // ── artifacts panel (desktop parity with QuestsWorkspace) ──────────────────
  // Same shape + data-testids as QW's artifacts tab, restyled to the KLW dark
  // design system. List of saved artifacts with import-into-env, rename, delete.
  const renderArtifactsContent = () => (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-1 flex-col overflow-y-auto p-3"
      data-testid="ksl-artifacts-content"
    >
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          <Package className="h-3 w-3" />
          Saved Artifacts
          {ksArtifacts.length > 0 && (
            <span className="rounded border border-violet-500/30 bg-violet-500/10 px-1 text-[9px] text-violet-300">
              {ksArtifacts.length}
            </span>
          )}
        </h3>
        <button
          onClick={loadKsArtifacts}
          title="Refresh"
          className="rounded p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
          data-testid="ksl-artifacts-refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      {ksArtifactsLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin text-violet-400/70" />
        </div>
      ) : ksArtifacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-zinc-600">
          <Package className="mb-2 h-6 w-6 opacity-50" />
          <p className="text-[12px]">No artifacts yet</p>
          <p className="mt-1 text-[10px] opacity-60">
            Save code from Playground to see them here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {ksArtifacts.map((artifact) => (
            <div
              key={artifact.id}
              className="group rounded border border-white/5 bg-white/[0.02] p-2.5 transition-colors hover:border-violet-500/30"
              data-testid={`ksl-artifact-${artifact.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {renamingKsArtifactId === artifact.id ? (
                    <input
                      type="text"
                      value={renameKsArtifactValue}
                      onChange={(e) => setRenameKsArtifactValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitKsArtifactRename();
                        if (e.key === "Escape") setRenamingKsArtifactId(null);
                      }}
                      onBlur={submitKsArtifactRename}
                      autoFocus
                      className="w-full min-w-0 rounded border border-violet-500/40 bg-white/[0.03] px-1.5 py-0.5 text-[11.5px] text-zinc-200 focus:border-violet-400 focus:outline-none"
                      data-testid={`input-rename-ks-artifact-${artifact.id}`}
                    />
                  ) : (
                    <p
                      className="cursor-text truncate text-[12px] text-zinc-300 transition-colors hover:text-violet-300"
                      onClick={() => startKsArtifactRename(artifact.id, artifact.name)}
                      data-testid={`text-ks-artifact-${artifact.id}`}
                    >
                      {artifact.name}
                    </p>
                  )}
                  <p className="mt-0.5 text-[10px] text-zinc-600">
                    {artifact.target_stack || "text"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => importArtifactToEnv(artifact)}
                    disabled={ksImporting === artifact.id}
                    title="Import into this environment"
                    className="flex items-center gap-1 rounded border border-violet-500/25 bg-violet-500/10 px-1.5 py-1 text-[10px] text-violet-300 transition-colors hover:bg-violet-500/20 disabled:opacity-50"
                    data-testid={`button-import-artifact-${artifact.id}`}
                  >
                    {ksImporting === artifact.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Download className="h-3 w-3" />
                        Import
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => deleteKsArtifact(artifact.id)}
                    title="Delete artifact"
                    className="rounded p-1 text-zinc-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                    data-testid={`button-delete-artifact-${artifact.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );

  // ── mobile fallback ────────────────────────────────────────────────────────

  if (isMobile) return <QuestsWorkspace />;

  // ── render ─────────────────────────────────────────────────────────────────

  const activeTab = activePath ? tabContents[activePath] : undefined;
  const activeDirty = !!activeTab && activeTab.content !== activeTab.original;

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#0a0a0f] font-sans text-zinc-200">
      {/* ── title bar ── */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/5 px-3">
        <button
          onClick={() => setLocation("/keystone")}
          className="flex items-center gap-1 rounded px-1.5 py-1 text-[12px] text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
          data-testid="ksl-back"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-cyan-500/15">
            <Zap className="h-3 w-3 text-cyan-400" />
          </div>
          <span className="text-[13px] font-semibold tracking-tight text-zinc-100" data-testid="ksl-env-name">
            {envName || "…"}
          </span>
          <span className="rounded border border-white/5 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
            {envId}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="flex items-center gap-1.5 rounded border border-white/5 bg-white/[0.03] px-2 py-0.5 text-[10.5px] text-zinc-400">
            <Circle
              className={`h-2 w-2 transition-all duration-500 ${
                runtimeStatus === "ready"
                  ? "fill-emerald-400 text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.9)]"
                  : runtimeStatus === "connecting"
                    ? "fill-amber-400 text-amber-400 animate-pulse"
                    : "fill-red-400 text-red-400"
              }`}
            />
            {runtimeStatus === "ready"
              ? "runtime ready"
              : runtimeStatus === "connecting"
                ? "connecting…"
                : "runtime offline"}
          </span>
          <button
            onClick={() => { loadFileTree(); toast.info("Files refreshed"); }}
            className="rounded p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
            title="Refresh files"
            data-testid="ksl-refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={resetContext}
            className="rounded p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
            title="Reset agent context"
            data-testid="ksl-reset-context"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── main 3-column body ── */}
      <div className="min-h-0 flex-1">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* files */}
          <ResizablePanel defaultSize={18} minSize={12} maxSize={30}>
            <div className="flex h-full min-h-0 flex-col border-r border-white/5 bg-[#0c0c12]">
              <div className="flex h-8 shrink-0 items-center justify-between border-b border-white/5 px-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  Files
                </span>
                <button
                  onClick={createFile}
                  className="rounded p-1 text-zinc-500 hover:bg-white/5 hover:text-cyan-300"
                  title="New file"
                  data-testid="ksl-new-file"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="shrink-0 border-b border-white/5 p-1.5">
                <div className="flex items-center gap-1.5 rounded bg-white/[0.04] px-2 py-1">
                  <Search className="h-3 w-3 text-zinc-600" />
                  <input
                    value={fileFilter}
                    onChange={(e) => setFileFilter(e.target.value)}
                    placeholder="Filter files…"
                    className="w-full bg-transparent text-[11px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none"
                    data-testid="ksl-file-filter"
                  />
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-1">
                {treeLoading ? (
                  <div className="flex items-center gap-2 p-3 text-[11px] text-zinc-500">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading tree…
                  </div>
                ) : fileTree ? (
                  (fileTree.children || []).map((c) => renderNode(c, 0, ""))
                ) : (
                  <div className="p-3 text-[11px] text-zinc-600">
                    No files yet — ask the agent to create some.
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle className="w-px bg-white/5 hover:bg-cyan-500/40" />

          {/* center: editor + terminal */}
          <ResizablePanel defaultSize={52} minSize={30}>
            <ResizablePanelGroup direction="vertical" className="h-full">
              <ResizablePanel defaultSize={65} minSize={30}>
                <div className="flex h-full min-h-0 flex-col bg-[#0a0a0f]">
                  {/* tab strip */}
                  <div className="flex h-8 shrink-0 items-center border-b border-white/5 bg-[#0c0c12]">
                    <div className="flex min-w-0 flex-1 items-center overflow-x-auto">
                      {openTabs.length === 0 && (
                        <span className="px-3 text-[11px] text-zinc-600">
                          No file open
                        </span>
                      )}
                      {openTabs.map((p) => {
                        const dirty =
                          tabContents[p] &&
                          tabContents[p].content !== tabContents[p].original;
                        return (
                          <div
                            key={p}
                            className={`group flex h-8 shrink-0 cursor-pointer items-center gap-1.5 border-r border-white/5 px-2.5 text-[11.5px] transition-colors ${
                              activePath === p
                                ? "border-b border-b-cyan-400 bg-[#0a0a0f] text-zinc-100 shadow-[inset_0_-1px_6px_rgba(34,211,238,0.35)]"
                                : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300"
                            }`}
                            onClick={() => setActivePath(p)}
                            data-testid={`ksl-tab-${p}`}
                          >
                            {fileIcon(baseName(p))}
                            <span className="max-w-[140px] truncate">
                              {baseName(p)}
                            </span>
                            {dirty && (
                              <Circle className="h-1.5 w-1.5 fill-amber-400 text-amber-400" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                closeTab(p);
                              }}
                              className="rounded p-0.5 opacity-0 hover:bg-white/10 group-hover:opacity-100"
                              data-testid={`ksl-tab-close-${p}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={saveActiveFile}
                      disabled={!activeDirty || saving}
                      className={`mx-2 flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors duration-300 ${
                        justSaved
                          ? "bg-emerald-500/20 text-emerald-300"
                          : activeDirty
                            ? "bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25"
                            : "text-zinc-600"
                      }`}
                      data-testid="ksl-save"
                    >
                      {saving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : justSaved ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                      {justSaved ? "Saved" : "Save"}
                    </button>
                  </div>
                  {/* monaco */}
                  <div className="min-h-0 flex-1">
                    {activePath && activeTab ? (
                      <Editor
                        height="100%"
                        theme="vs-dark"
                        path={activePath}
                        language={langOf(activePath)}
                        value={activeTab.content}
                        onChange={(v) =>
                          setTabContents((prev) => ({
                            ...prev,
                            [activePath]: {
                              ...prev[activePath],
                              content: v ?? "",
                            },
                          }))
                        }
                        options={{
                          fontSize: 12.5,
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          padding: { top: 8 },
                          fontFamily:
                            "'JetBrains Mono', ui-monospace, monospace",
                          renderLineHighlight: "gutter",
                          smoothScrolling: true,
                        }}
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-700">
                        <div className="rounded-full p-2 shadow-[0_0_18px_4px_rgba(34,211,238,0.08)]">
                          <FileCode className="h-8 w-8" />
                        </div>
                        <span className="text-[12px]">
                          Select a file to edit
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle className="h-px bg-white/5 hover:bg-cyan-500/40" />

              {/* terminal dock */}
              <ResizablePanel defaultSize={35} minSize={15}>
                <div className="flex h-full min-h-0 flex-col bg-[#0c0c12]">
                  <div className="flex h-8 shrink-0 items-center gap-2 border-b border-white/5 px-2.5">
                    <Terminal className="h-3.5 w-3.5 text-cyan-400/70" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                      Terminal
                    </span>
                    <div className="ml-2 flex overflow-hidden rounded border border-white/10 text-[10.5px]">
                      {(["shell", "python", "node"] as const).map((l) => (
                        <button
                          key={l}
                          onClick={() => setTermLang(l)}
                          className={`px-2 py-0.5 ${
                            termLang === l
                              ? "bg-cyan-500/20 text-cyan-300"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                          data-testid={`ksl-term-lang-${l}`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                    {termLang === "shell" && (
                      <span className="font-mono text-[10px] text-emerald-400/70" data-testid="ksl-term-cwd">
                        ~/workspace{termCwd === "." ? "" : `/${termCwd}`} $
                      </span>
                    )}
                    <div className="ml-auto flex items-center gap-1.5">
                      <div className="flex items-center gap-1 rounded border border-white/10 px-1.5 py-0.5">
                        <Package className="h-3 w-3 text-zinc-500" />
                        <select
                          value={pkgEco}
                          onChange={(e) => setPkgEco(e.target.value as any)}
                          className="bg-transparent text-[10.5px] text-zinc-400 focus:outline-none"
                          data-testid="ksl-pkg-eco"
                        >
                          <option value="pip">pip</option>
                          <option value="npm">npm</option>
                        </select>
                        <input
                          value={pkgName}
                          onChange={(e) => setPkgName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && installPackage()}
                          placeholder="package…"
                          className="w-24 bg-transparent text-[10.5px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none"
                          data-testid="ksl-pkg-name"
                        />
                        <button
                          onClick={installPackage}
                          disabled={pkgInstalling || !pkgName.trim()}
                          className="text-cyan-400 disabled:text-zinc-700"
                          data-testid="ksl-pkg-install"
                        >
                          {pkgInstalling ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Plus className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                      <button
                        onClick={runCode}
                        disabled={
                          !runtimeSessionId || termRunning || !termCode.trim()
                        }
                        className="flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-300 hover:bg-emerald-500/25 disabled:bg-white/5 disabled:text-zinc-600"
                        data-testid="ksl-run"
                      >
                        {termRunning ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        Run
                      </button>
                    </div>
                  </div>
                  <div className="flex h-7 shrink-0 items-center gap-2 border-b border-white/5 px-2.5">
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-zinc-600">
                      App
                    </span>
                    <input
                      value={appCmd}
                      onChange={(e) => setAppCmd(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !appRunning && startApp()}
                      placeholder="npm run dev"
                      disabled={appRunning}
                      className="max-w-[280px] flex-1 bg-transparent font-mono text-[10.5px] text-zinc-300 placeholder:text-zinc-700 focus:outline-none disabled:text-zinc-500"
                      data-testid="ksl-app-cmd"
                    />
                    {!appRunning ? (
                      <button
                        onClick={startApp}
                        disabled={appBusy || !appCmd.trim()}
                        className="flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300 hover:bg-emerald-500/25 disabled:bg-white/5 disabled:text-zinc-600"
                        data-testid="ksl-app-start"
                      >
                        {appBusy ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Play className="h-2.5 w-2.5" />}
                        start
                      </button>
                    ) : (
                      <button
                        onClick={stopApp}
                        disabled={appBusy}
                        className="flex items-center gap-1 rounded bg-red-500/15 px-2 py-0.5 text-[10px] text-red-300 hover:bg-red-500/25"
                        data-testid="ksl-app-stop"
                      >
                        <Square className="h-2.5 w-2.5" /> stop
                      </button>
                    )}
                    <button
                      onClick={fetchAppLogs}
                      className="rounded border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-200"
                      data-testid="ksl-app-logs"
                    >
                      logs
                    </button>
                    {appRunning && appInfo?.port != null && (
                      <span className="font-mono text-[10px] text-emerald-400/80">:{appInfo.port}</span>
                    )}
                    {appRunning && appInfo?.preview_url && (
                      <a
                        href={appInfo.preview_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-300 hover:bg-cyan-500/20"
                        data-testid="ksl-app-preview"
                      >
                        preview ↗
                      </a>
                    )}
                  </div>
                  <div className="grid min-h-0 flex-1 grid-cols-2">
                    <textarea
                      value={termCode}
                      onChange={(e) => setTermCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (termLang === "shell" && e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          runCode();
                        }
                      }}
                      placeholder={
                        termLang === "shell"
                          ? "$ shell — cd persists between runs\nls -la"
                          : termLang === "python"
                            ? '# python code…\nprint("hello")'
                            : '// node code…\nconsole.log("hello")'
                      }
                      spellCheck={false}
                      className="h-full resize-none border-r border-white/5 bg-transparent p-2.5 font-mono text-[11.5px] text-zinc-200 placeholder:text-zinc-700 focus:outline-none"
                      data-testid="ksl-term-code"
                    />
                    <div className="min-h-0 overflow-y-auto p-2.5 font-mono text-[11.5px] space-y-2.5" data-testid="ksl-term-output">
                      {termHistory.length === 0 && (
                        <span className="text-zinc-700">
                          output appears here
                        </span>
                      )}
                      {termHistory.map((entry) => (
                        <div key={entry.id} data-testid={`ksl-term-entry-${entry.id}`}>
                          <div className="mb-1 flex items-center gap-1.5">
                            {entry.source === "agent" && (
                              <span className="rounded bg-cyan-500/15 px-1 py-0 text-[9px] font-semibold uppercase tracking-wider text-cyan-300">
                                agent
                              </span>
                            )}
                            <span className={entry.source === "agent" ? "text-cyan-300/80" : "text-zinc-400"}>
                              {entry.label}
                            </span>
                            {entry.pending && (
                              <Loader2 className="h-3 w-3 shrink-0 animate-spin text-zinc-500" />
                            )}
                          </div>
                          {entry.result?.stdout && (
                            <pre className="whitespace-pre-wrap text-zinc-300">
                              {entry.result.stdout}
                            </pre>
                          )}
                          {entry.result?.stderr && (
                            <pre className="whitespace-pre-wrap text-red-400">
                              {entry.result.stderr}
                            </pre>
                          )}
                          {entry.result?.exit_code != null && (
                            <div className="mt-1 text-[10px] text-zinc-600">
                              exit {entry.result.exit_code}
                              {entry.result.duration_ms != null &&
                                ` · ${entry.result.duration_ms}ms`}
                            </div>
                          )}
                        </div>
                      ))}
                      <div ref={termEndRef} />
                    </div>
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle className="w-px bg-white/5 hover:bg-cyan-500/40" />

          {/* chat */}
          <ResizablePanel defaultSize={30} minSize={20} maxSize={45}>
            <div className="flex h-full min-h-0 flex-col border-l border-white/5 bg-[#0c0c12]">
              <div className="flex h-8 shrink-0 items-center gap-2 border-b border-white/5 px-2.5">
                <MessageSquare className="h-3.5 w-3.5 text-cyan-400/70" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  Agent
                </span>
                <div className="ml-1 flex rounded border border-white/10 bg-black/40 p-0.5" data-testid="ksl-mode">
                  {([
                    ["keystone", "Keystone", "Keystone Mode: agentic coding with auto-apply", "bg-amber-500/15 text-amber-300"],
                    ["focus", "Focus", "Focus Mode: research & documentation only", "bg-purple-500/15 text-purple-300"],
                  ] as const).map(([id, label, title, on]) => (
                    <button
                      key={id}
                      onClick={() => setEditorMode(id)}
                      title={title}
                      data-testid={`ksl-mode-${id}`}
                      className={`rounded-sm px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider transition-colors ${
                        editorMode === id ? on : "text-zinc-600 hover:text-zinc-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setReadOnlyMode((v) => !v)}
                  title={
                    readOnlyMode
                      ? "Read-Only: AI explains code without making changes"
                      : "Read & Write: AI can create and edit files"
                  }
                  data-testid="ksl-toggle-read-write"
                  className={`ml-1 flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider ${
                    readOnlyMode
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      : "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-300"
                  }`}
                >
                  {readOnlyMode ? <Eye className="h-2.5 w-2.5" /> : <Pencil className="h-2.5 w-2.5" />}
                  {readOnlyMode ? "Read only" : "Read & write"}
                </button>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => {
                      setArtifactsOpen((v) => !v);
                      setSettingsOpen(false);
                    }}
                    title="Saved artifacts — import into this environment"
                    data-testid="ksl-artifacts-toggle"
                    className={`relative flex h-6 w-6 items-center justify-center rounded border transition-colors ${
                      artifactsOpen
                        ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
                        : "border-white/10 bg-white/[0.03] text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Package className="h-3.5 w-3.5" />
                    {ksArtifacts.length > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-3 min-w-3 items-center justify-center rounded bg-violet-500 px-0.5 text-[8px] font-semibold text-white">
                        {ksArtifacts.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setSettingsOpen((v) => !v);
                      setArtifactsOpen(false);
                    }}
                    title="AI settings — temperature, max tokens, persona"
                    data-testid="ksl-settings-toggle"
                    className={`flex h-6 w-6 items-center justify-center rounded border transition-colors ${
                      settingsOpen
                        ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                        : "border-white/10 bg-white/[0.03] text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* ── second ledge: provider + model — clear, breathing buttons ── */}
              <div
                className="flex h-8 shrink-0 items-center gap-2.5 border-b border-white/5 bg-[#0a0a0f] px-2.5"
                data-testid="ksl-config-ledge"
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                  Provider
                </span>
                <Select
                  value={effectiveProvider}
                  onValueChange={(v) => {
                    setSelectedProvider(v);
                    setSelectedModel("auto");
                  }}
                >
                  <SelectTrigger
                    className="h-6 w-[124px] border-white/10 bg-white/[0.03] px-2 text-[11px] text-zinc-300"
                    data-testid="ksl-provider"
                  >
                    <SelectValue placeholder="provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                  Model
                </span>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger
                    className="h-6 w-[156px] border-white/10 bg-white/[0.03] px-2 text-[11px] text-zinc-300"
                    data-testid="ksl-model"
                  >
                    <SelectValue placeholder="model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto" className="text-xs">
                      Auto
                    </SelectItem>
                    {providerModels.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* settings + artifacts panels swap in over the message list when
                  open — desktop parity with QuestsWorkspace's tabs. They're
                  mutually exclusive (the header toggles close the other). */}
              <AnimatePresence initial={false}>
                {settingsOpen && (
                  <motion.div
                    key="ksl-settings"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex min-h-0 flex-1 flex-col border-b border-white/5 bg-[#0a0a0f]"
                    data-testid="ksl-settings-panel"
                  >
                    {renderSettingsContent()}
                  </motion.div>
                )}
                {artifactsOpen && (
                  <motion.div
                    key="ksl-artifacts"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex min-h-0 flex-1 flex-col border-b border-white/5 bg-[#0a0a0f]"
                    data-testid="ksl-artifacts-panel"
                  >
                    {renderArtifactsContent()}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* messages — hidden while a panel is open so it fully replaces
                  the message view (QW tab parity). */}
              {!settingsOpen && !artifactsOpen && (
              <div
                ref={chatScrollRef}
                onScroll={onChatScroll}
                className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2"
                data-testid="ksl-chat-scroll"
              >
                {messages.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-zinc-600">
                    <div className="rounded-full p-2 shadow-[0_0_18px_4px_rgba(34,211,238,0.12)]">
                      <Bot className="h-7 w-7 text-zinc-500" />
                    </div>
                    <p className="text-[12px]">
                      Ask the agent to build something.
                      <br />
                      {readOnlyMode
                        ? "Read-only: the AI explains without changing files."
                        : editorMode === "focus"
                          ? "Focus: research & docs — no file changes."
                          : "File changes are applied automatically."}
                    </p>
                  </div>
                )}
                {messages.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="mb-3"
                    data-testid={`ksl-msg-${m.id}`}
                  >
                    {m.role === "system" ? (
                      <div className="rounded border border-white/5 bg-white/[0.02] px-2 py-1.5 text-[11px] italic text-zinc-500">
                        {m.content}
                      </div>
                    ) : (
                      <>
                        <div className="mb-1 flex items-center gap-1.5">
                          {m.role === "user" ? (
                            <User className="h-3 w-3 text-zinc-500" />
                          ) : (
                            <Bot className="h-3 w-3 text-cyan-400" />
                          )}
                          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                            {m.role === "user" ? "You" : "Agent"}
                          </span>
                          {m.toolActive && (
                            <Loader2 className="h-3 w-3 animate-spin text-cyan-400/70" />
                          )}
                        </div>
                        {m.toolCalls && m.toolCalls.length > 0 && (
                          <div className="mb-1.5 flex flex-col gap-1">
                            {m.toolCalls.map((tc) => {
                              const meta = toolMeta(tc.name);
                              const Icon = meta.icon;
                              const running = tc.status === "running";
                              return (
                                <div
                                  key={tc.id}
                                  className={`flex items-center gap-1.5 rounded border px-2 py-1 text-[10.5px] transition-colors duration-300 ${
                                    running
                                      ? "border-cyan-500/25 bg-cyan-500/[0.06] text-cyan-300"
                                      : "border-white/5 bg-white/[0.02] text-zinc-500"
                                  }`}
                                  data-testid={`ksl-toolcall-${tc.id}`}
                                  title={tc.preview ? tc.preview.slice(0, 300) : undefined}
                                >
                                  <Icon
                                    className={`h-3 w-3 shrink-0 ${running ? "animate-pulse text-cyan-400" : "text-zinc-600"}`}
                                  />
                                  <span className="truncate">{meta.label(tc.arguments)}</span>
                                  {running ? (
                                    <Loader2 className="ml-auto h-2.5 w-2.5 shrink-0 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="ml-auto h-2.5 w-2.5 shrink-0 text-emerald-400/60" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div
                          className={`rounded-md px-2.5 py-2 text-[12px] leading-relaxed ${
                            m.role === "user"
                              ? "bg-cyan-500/10 text-zinc-200"
                              : "bg-white/[0.03] text-zinc-300"
                          }`}
                        >
                          {m.content ? (
                            (() => {
                              if (m.role !== "assistant") {
                                return (
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={mdComponents as any}
                                  >
                                    {m.content}
                                  </ReactMarkdown>
                                );
                              }
                              // lite parity (ChatPanel.renderMessageContent):
                              // sentinel blocks never render raw — they become
                              // the Surgical Edits card; prose renders clean.
                              const { edits, explanation, inProgressFile } =
                                parseSurgicalEdits(m.content);
                              const clean = stripPartialSentinels(explanation);
                              const streaming =
                                !!inProgressFile || edits.some((e) => e.partial);
                              const applied = !streaming;
                              return (
                                <>
                                  {(edits.length > 0 || inProgressFile) && (
                                    <div
                                      className={`mb-2 rounded border px-2 py-1.5 ${
                                        streaming
                                          ? "border-cyan-500/25 bg-cyan-500/[0.06]"
                                          : applied
                                            ? "border-emerald-500/25 bg-emerald-500/[0.06]"
                                            : "border-amber-500/25 bg-amber-500/[0.06]"
                                      }`}
                                      data-testid="ksl-edits-card"
                                    >
                                      <div
                                        className={`mb-1 font-mono text-[9.5px] uppercase tracking-[0.15em] ${
                                          streaming
                                            ? "animate-pulse text-cyan-300"
                                            : applied
                                              ? "text-emerald-300"
                                              : "text-amber-300"
                                        }`}
                                      >
                                        {streaming ? "Editing — streaming" : "Applied"}{" "}
                                        ({edits.length || 1})
                                      </div>
                                      {inProgressFile &&
                                        !edits.some((e) => e.partial) && (
                                          <div className="flex animate-pulse items-center gap-1.5 font-mono text-[10px] text-cyan-300/80">
                                            <FileCode className="h-2.5 w-2.5 shrink-0" />
                                            <span className="truncate">{inProgressFile}</span>
                                            <span className="text-zinc-500">receiving edit…</span>
                                          </div>
                                        )}
                                      {edits.map((ed, i) => (
                                        <div
                                          key={`${ed.file}-${i}`}
                                          className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400"
                                        >
                                          <FileCode className="h-2.5 w-2.5 shrink-0 text-zinc-500" />
                                          <button
                                            onClick={() => openFile(ed.file)}
                                            className="truncate hover:text-cyan-300"
                                            title={ed.file}
                                          >
                                            {ed.file}
                                          </button>
                                          <span
                                            className={`shrink-0 ${ed.partial ? "animate-pulse text-cyan-400/80" : "text-zinc-600"}`}
                                          >
                                            {ed.type === "replace"
                                              ? `replace ${ed.startLine}–${ed.endLine ?? ed.startLine}`
                                              : ed.type === "insert"
                                                ? `insert @${ed.startLine}`
                                                : ed.type === "delete"
                                                  ? `delete ${ed.startLine}–${ed.endLine ?? ed.startLine}`
                                                  : ed.type === "create"
                                                    ? "new file"
                                                    : "full write"}
                                            {ed.partial ? " · writing…" : ""}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {(clean || edits.length === 0) && (
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm]}
                                      components={mdComponents as any}
                                    >
                                      {clean || m.content}
                                    </ReactMarkdown>
                                  )}
                                </>
                              );
                            })()
                          ) : (
                            m.role === "assistant" &&
                            sending && (
                              <span className="flex items-center gap-2 text-zinc-500">
                                <Loader2 className="h-3 w-3 animate-spin" />{" "}
                                thinking…
                              </span>
                            )
                          )}
                          {sending &&
                            i === messages.length - 1 &&
                            m.role === "assistant" &&
                            !!m.content && (
                              <span
                                className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-cyan-400/80 align-middle"
                                data-testid="ksl-stream-caret"
                              />
                            )}
                        </div>
                        {m.filesTouched && m.filesTouched.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {m.filesTouched.map((fp) => (
                              <button
                                key={fp}
                                onClick={() => openFile(fp)}
                                className="flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300 hover:bg-emerald-500/20"
                                data-testid={`ksl-filechip-${fp}`}
                              >
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                {baseName(fp)}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                ))}
                <div ref={chatEndRef} />
              </div>
              )}

              {/* applied-changes strip: auto-apply stays on, this is the undo */}
              {Object.keys(agentChanges).length > 0 && (
                <div
                  className="shrink-0 border-t border-white/5 bg-white/[0.02] px-2.5 py-1.5"
                  data-testid="ksl-changes-strip"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                      Applied changes ({Object.keys(agentChanges).length})
                    </span>
                    <button
                      onClick={revertAll}
                      className="ml-auto flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300 hover:bg-amber-500/20"
                      data-testid="ksl-revert-all"
                    >
                      <RotateCcw className="h-2.5 w-2.5" /> Revert all
                    </button>
                    <button
                      onClick={dismissChanges}
                      className="rounded p-0.5 text-zinc-600 hover:bg-white/5 hover:text-zinc-300"
                      title="Keep changes and clear undo history"
                      data-testid="ksl-dismiss-changes"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex max-h-20 flex-wrap gap-1 overflow-y-auto">
                    {Object.entries(agentChanges).map(([fp, ch]) => (
                      <span
                        key={fp}
                        className="flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-zinc-300"
                      >
                        <button
                          onClick={() => openFile(fp)}
                          className="hover:text-cyan-300"
                          title={fp}
                          data-testid={`ksl-change-open-${fp}`}
                        >
                          {baseName(fp)}
                        </button>
                        {ch.created && (
                          <span className="text-emerald-400/70">new</span>
                        )}
                        <button
                          onClick={() => revertFile(fp)}
                          title={
                            ch.created
                              ? "Undo create (deletes file)"
                              : "Revert to previous content"
                          }
                          className="text-zinc-500 hover:text-amber-300"
                          data-testid={`ksl-revert-${fp}`}
                        >
                          <RotateCcw className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {chatError && (
                <div className="shrink-0 border-t border-red-500/20 bg-red-500/5 px-2.5 py-1.5 text-[11px] text-red-400" data-testid="ksl-chat-error">
                  {chatError}
                </div>
              )}

              {/* composer — hidden when the portal bar drives this chat */}
              {portalDriven ? (
                <div className="shrink-0 border-t border-white/5 p-2">
                  <div className="flex items-center gap-2 rounded-md border border-dashed border-white/10 bg-white/[0.02] px-2.5 py-2 text-[11px] text-zinc-500" data-testid="ksl-portal-hint">
                    <Sparkles className="h-3 w-3 shrink-0 text-cyan-400/80" />
                    <span className="flex-1">Prompt from the portal bar — it drives this KeyStone chat.</span>
                    {sending && (
                      <button onClick={stopStream} className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-red-500/15 text-red-400 hover:bg-red-500/25" title="Stop" data-testid="ksl-stop">
                        <Square className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
              <div className="shrink-0 border-t border-white/5 p-2">
                <div className="flex items-end gap-1.5 rounded-md border border-white/10 bg-white/[0.03] p-1.5 focus-within:border-cyan-500/40">
                  <textarea
                    ref={inputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    rows={2}
                    placeholder="Tell the agent what to build…"
                    className="max-h-32 w-full resize-none bg-transparent px-1 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                    data-testid="ksl-chat-input"
                  />
                  {sending ? (
                    <button
                      onClick={stopStream}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-red-500/15 text-red-400 hover:bg-red-500/25"
                      title="Stop"
                      data-testid="ksl-stop"
                    >
                      <Square className="h-3 w-3" />
                    </button>
                  ) : (
                    <button
                      onClick={() => sendMessage()}
                      disabled={!chatInput.trim()}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 disabled:bg-white/5 disabled:text-zinc-700"
                      title="Send"
                      data-testid="ksl-send"
                    >
                      <Send className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="mt-1 px-1 text-[9.5px] text-zinc-700">
                  Enter to send · Shift+Enter for newline · auto-apply on, revert anytime
                </div>
              </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* ── status bar ── */}
      <div className="flex h-6 shrink-0 items-center gap-3 border-t border-white/5 bg-[#0c0c12] px-3 text-[10px] text-zinc-600">
        <span className="flex items-center gap-1 font-semibold uppercase tracking-widest text-cyan-400/80">
          <Zap className="h-2.5 w-2.5" /> Keystone
        </span>
        <span className="flex items-center gap-1">
          <Circle
            className={`h-1.5 w-1.5 ${
              runtimeStatus === "ready"
                ? "fill-emerald-400 text-emerald-400"
                : runtimeStatus === "connecting"
                  ? "fill-amber-400 text-amber-400"
                  : "fill-red-400 text-red-400"
            }`}
          />
          {runtimeSessionId
            ? `session ${runtimeSessionId.slice(0, 8)}`
            : "no session"}
        </span>
        <span className="flex items-center gap-1">
          <Cpu className="h-2.5 w-2.5" />
          {effectiveProvider || "—"}
          {selectedModel !== "auto" ? ` · ${selectedModel}` : " · auto"}
        </span>
        <span className="ml-auto flex items-center gap-3">
          {activePath && (
            <span className="font-mono text-zinc-500" data-testid="ksl-status-file">
              {activePath}
              {activeDirty ? " ●" : ""}
            </span>
          )}
          <span>{messages.length} msgs</span>
          <span className="text-emerald-400/70">auto-approve on</span>
        </span>
      </div>
    </div>
  );
}
