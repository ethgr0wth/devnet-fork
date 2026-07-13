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
 * Behavior: agent file changes are AUTO-APPROVED — no review gate. Changes
 * stream in, are applied by the backend, and this UI simply refreshes and
 * opens the touched files.
 *
 * Mobile (<768px) renders the original QuestsWorkspace untouched.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import {
  ChevronLeft, ChevronRight, ChevronDown, Send, File, Folder, FolderOpen,
  Save, X, Play, Square, Loader2, Terminal, RefreshCw, Search, Package,
  Zap, Bot, User, FileCode, FileJson, FileText, Trash2, Plus, Circle,
  RotateCcw, CheckCircle2, Cpu, MessageSquare,
} from "lucide-react";
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
import { apiFetch } from "@/lib/queryClient";
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

interface ChatMsg {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  filesTouched?: string[];
  toolActive?: boolean;
}

interface TermResult {
  stdout?: string;
  stderr?: string;
  exit_code?: number;
  duration_ms?: number;
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

  // chat
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // models / provider
  const { providers, provider: defaultProvider, getModelsForProvider } =
    useAvailableModels();
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const effectiveProvider = selectedProvider || defaultProvider || "";
  const providerModels = effectiveProvider
    ? getModelsForProvider(effectiveProvider)
    : [];

  // runtime / terminal
  const [runtimeSessionId, setRuntimeSessionId] = useState<string | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<
    "connecting" | "ready" | "error"
  >("connecting");
  const [termLang, setTermLang] = useState<"python" | "node">("python");
  const [termCode, setTermCode] = useState("");
  const [termOutput, setTermOutput] = useState<TermResult | null>(null);
  const [termRunning, setTermRunning] = useState(false);
  const [pkgEco, setPkgEco] = useState<"pip" | "npm">("pip");
  const [pkgName, setPkgName] = useState("");
  const [pkgInstalling, setPkgInstalling] = useState(false);

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
    setRuntimeStatus("connecting");
    try {
      let sessionId: string | null = null;
      const listRes = await apiFetch("/api/runtime/sessions");
      if (listRes.ok) {
        const d = await listRes.json();
        if (d.sessions?.length > 0) sessionId = d.sessions[0].session_id;
      }
      if (!sessionId) {
        const createRes = await apiFetch("/api/runtime/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ environment_id: envId }),
        });
        if (!createRes.ok) {
          setRuntimeStatus("error");
          return;
        }
        sessionId = (await createRes.json()).session_id;
      }
      if (sessionId) {
        setRuntimeSessionId(sessionId);
        setRuntimeStatus("ready");
        apiFetch("/api/runtime/sync_workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            environment_id: envId,
          }),
        }).catch(() => {});
      }
    } catch {
      setRuntimeStatus("error");
    }
  }, [envId]);

  useEffect(() => {
    if (!envId || isMobile) return;
    loadEnvironment();
    loadFileTree();
    loadChatHistory();
    initRuntime();
  }, [envId, isMobile, loadEnvironment, loadFileTree, loadChatHistory, initRuntime]);

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
    setOpenTabs((prev) => {
      const next = prev.filter((p) => p !== path);
      if (activePath === path) setActivePath(next[next.length - 1] || null);
      return next;
    });
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
          setTabContents((prev) => ({
            ...prev,
            [fp]: { content: c, original: c },
          }));
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

  const sendMessage = async () => {
    const text = chatInput.trim();
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

    try {
      const abortCtrl = new AbortController();
      streamAbortRef.current = abortCtrl;
      const response = await fetch(
        `/api/keystone/environments/${envId}/chat/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-AiAssist-Provider": effectiveProvider,
          },
          body: JSON.stringify({
            message: text,
            model:
              selectedModel && selectedModel !== "auto"
                ? selectedModel
                : undefined,
          }),
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
              const label =
                data.name === "read_file"
                  ? `Reading \`${data.arguments?.path || "file"}\``
                  : data.name === "search_files"
                    ? `Searching \`${data.arguments?.pattern || ""}\``
                    : data.name === "glob_files"
                      ? `Finding files \`${data.arguments?.pattern || ""}\``
                      : data.name === "list_functions"
                        ? `Analyzing \`${data.arguments?.path || "file"}\``
                        : data.name || "tool";
              fullContent += `\n\n> ⚙ ${label}\n\n`;
              patchDraft((m) => ({ ...m, content: fullContent, toolActive: true }));
              break;
            }
            case "tool_result":
              patchDraft((m) => ({ ...m, toolActive: false }));
              break;
            case "file_written":
            case "file_edited":
              if (data.path) {
                touched.add(data.path);
                patchDraft((m) => ({ ...m, filesTouched: [...touched] }));
              }
              break;
            case "files_written":
            case "files_edited":
              for (const f of data.files || []) touched.add(f);
              patchDraft((m) => ({ ...m, filesTouched: [...touched] }));
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
              for (const f of data.files_written || []) touched.add(f);
              for (const f of data.files_edited || []) touched.add(f);
              const finalTouched = [...touched];
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
              // AUTO-APPROVE: absorb the agent's writes immediately
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

  const runCode = async () => {
    if (!runtimeSessionId || termRunning || !termCode.trim()) return;
    setTermRunning(true);
    setTermOutput(null);
    try {
      const res = await apiFetch("/api/runtime/run_code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: runtimeSessionId,
          language: termLang,
          code: termCode,
          environment_id: envId,
        }),
      });
      setTermOutput(await res.json());
    } catch (e) {
      setTermOutput({ stdout: "", stderr: String(e), exit_code: -1 });
    } finally {
      setTermRunning(false);
    }
  };

  const installPackage = async () => {
    if (!runtimeSessionId || !pkgName.trim() || pkgInstalling) return;
    setPkgInstalling(true);
    try {
      const res = await apiFetch("/api/runtime/install_package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: runtimeSessionId,
          ecosystem: pkgEco,
          package: pkgName.trim(),
        }),
      });
      const d = await res.json();
      toast.success(`Package ${d.package || pkgName.trim()} recorded (${d.ecosystem || pkgEco})`);
      setPkgName("");
    } catch {
      toast.error("Package install failed");
    } finally {
      setPkgInstalling(false);
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
              className={`h-2 w-2 ${
                runtimeStatus === "ready"
                  ? "fill-emerald-400 text-emerald-400"
                  : runtimeStatus === "connecting"
                    ? "fill-amber-400 text-amber-400"
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
                            className={`group flex h-8 shrink-0 cursor-pointer items-center gap-1.5 border-r border-white/5 px-2.5 text-[11.5px] ${
                              activePath === p
                                ? "border-b border-b-cyan-400 bg-[#0a0a0f] text-zinc-100"
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
                      className={`mx-2 flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[11px] ${
                        activeDirty
                          ? "bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25"
                          : "text-zinc-600"
                      }`}
                      data-testid="ksl-save"
                    >
                      {saving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                      Save
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
                        <FileCode className="h-8 w-8" />
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
                      {(["python", "node"] as const).map((l) => (
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
                  <div className="grid min-h-0 flex-1 grid-cols-2">
                    <textarea
                      value={termCode}
                      onChange={(e) => setTermCode(e.target.value)}
                      placeholder={
                        termLang === "python"
                          ? '# python code…\nprint("hello")'
                          : '// node code…\nconsole.log("hello")'
                      }
                      spellCheck={false}
                      className="h-full resize-none border-r border-white/5 bg-transparent p-2.5 font-mono text-[11.5px] text-zinc-200 placeholder:text-zinc-700 focus:outline-none"
                      data-testid="ksl-term-code"
                    />
                    <div className="min-h-0 overflow-y-auto p-2.5 font-mono text-[11.5px]" data-testid="ksl-term-output">
                      {termRunning && (
                        <div className="flex items-center gap-2 text-zinc-500">
                          <Loader2 className="h-3 w-3 animate-spin" /> running…
                        </div>
                      )}
                      {!termRunning && !termOutput && (
                        <span className="text-zinc-700">
                          output appears here
                        </span>
                      )}
                      {termOutput && (
                        <>
                          {termOutput.stdout && (
                            <pre className="whitespace-pre-wrap text-zinc-300">
                              {termOutput.stdout}
                            </pre>
                          )}
                          {termOutput.stderr && (
                            <pre className="whitespace-pre-wrap text-red-400">
                              {termOutput.stderr}
                            </pre>
                          )}
                          <div className="mt-1.5 text-[10px] text-zinc-600">
                            exit {termOutput.exit_code ?? "?"}
                            {termOutput.duration_ms != null &&
                              ` · ${termOutput.duration_ms}ms`}
                          </div>
                        </>
                      )}
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
                <div className="ml-auto flex items-center gap-1">
                  <Select
                    value={effectiveProvider}
                    onValueChange={(v) => {
                      setSelectedProvider(v);
                      setSelectedModel("auto");
                    }}
                  >
                    <SelectTrigger className="h-6 w-[86px] border-white/10 bg-white/[0.03] px-1.5 text-[10.5px] text-zinc-400" data-testid="ksl-provider">
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
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="h-6 w-[110px] border-white/10 bg-white/[0.03] px-1.5 text-[10.5px] text-zinc-400" data-testid="ksl-model">
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
              </div>

              {/* messages */}
              <div
                ref={chatScrollRef}
                onScroll={onChatScroll}
                className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2"
                data-testid="ksl-chat-scroll"
              >
                {messages.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-zinc-600">
                    <Bot className="h-7 w-7" />
                    <p className="text-[12px]">
                      Ask the agent to build something.
                      <br />
                      File changes are applied automatically.
                    </p>
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className="mb-3" data-testid={`ksl-msg-${m.id}`}>
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
                        <div
                          className={`rounded-md px-2.5 py-2 text-[12px] leading-relaxed ${
                            m.role === "user"
                              ? "bg-cyan-500/10 text-zinc-200"
                              : "bg-white/[0.03] text-zinc-300"
                          }`}
                        >
                          {m.content ? (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={mdComponents as any}
                            >
                              {m.content}
                            </ReactMarkdown>
                          ) : (
                            m.role === "assistant" &&
                            sending && (
                              <span className="flex items-center gap-2 text-zinc-500">
                                <Loader2 className="h-3 w-3 animate-spin" />{" "}
                                thinking…
                              </span>
                            )
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
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {chatError && (
                <div className="shrink-0 border-t border-red-500/20 bg-red-500/5 px-2.5 py-1.5 text-[11px] text-red-400" data-testid="ksl-chat-error">
                  {chatError}
                </div>
              )}

              {/* composer */}
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
                      onClick={sendMessage}
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
                  Enter to send · Shift+Enter for newline · changes auto-apply
                </div>
              </div>
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
