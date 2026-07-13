import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronUp, Send, File, Folder, FolderOpen, Plus,
  Trash2, Edit2, Save, X, Code2, MessageSquare,
  Settings, Play, RefreshCw, ChevronRight,
  FileCode, FileJson, FileText, Sparkles, Bot, User, Square,
  AlertCircle, Download, GitBranch as Github, Loader2, FolderArchive,  // V2 EDIT: brand icons removed from lucide; GitBranch stands in
  Terminal, Rocket, ScrollText, Search, ChevronDown,
  Package, Server, Activity, Eye, Cpu, HardDrive,
  GitBranch, FolderGit, Zap, Shield, MoreHorizontal,
  ArrowDown, Filter, Clock, Braces, FunctionSquare, ScanSearch,
  RotateCcw, CheckCircle2, FileWarning, Copy, FileEdit, Pencil
} from "lucide-react";
import aiasLogo from "../assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import Editor, { DiffEditor } from "@monaco-editor/react";
import { apiFetch } from "@/lib/queryClient";
import { toast } from "sonner";
import { useAvailableModels } from "@/hooks/use-available-models";

interface QuestsEnvironment {
  id: string;
  name: string;
  description?: string;
  template_id?: string;
  llm_provider?: string;
  llm_model?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model_id?: string;
  provider_id?: string;
  timestamp: string;
  filesWritten?: string[];
  filesEdited?: string[];
  toolActive?: boolean;
}

interface LedgerEntry {
  ts: string;
  session_id: string;
  user_id: string;
  tool: string;
  request: Record<string, any>;
  result: Record<string, any>;
}

interface SearchHit {
  file: string;
  line: number;
  content: string;
}

const TOOL_COLORS: Record<string, string> = {
  clone_repo: "text-blue-400 bg-blue-500/10",
  checkout_ref: "text-blue-400 bg-blue-500/10",
  detect_stack: "text-blue-400 bg-blue-500/10",
  install_node_deps: "text-blue-400 bg-blue-500/10",
  install_python_deps: "text-blue-400 bg-blue-500/10",
  write_env_file: "text-blue-400 bg-blue-500/10",
  start_process: "text-blue-400 bg-blue-500/10",
  stop_process: "text-blue-400 bg-blue-500/10",
  check_port: "text-blue-400 bg-blue-500/10",
  http_health_check: "text-blue-400 bg-blue-500/10",
  stream_logs: "text-blue-400 bg-blue-500/10",
  capture_preview_metadata: "text-blue-400 bg-blue-500/10",
  export_artifacts: "text-blue-400 bg-blue-500/10",
  run_code: "text-emerald-400 bg-emerald-500/10",
  install_package: "text-emerald-400 bg-emerald-500/10",
  read_file: "text-amber-400 bg-amber-500/10",
  write_file: "text-amber-400 bg-amber-500/10",
  list_directory: "text-amber-400 bg-amber-500/10",
  search_in_files: "text-purple-400 bg-purple-500/10",
  functions_mapping: "text-purple-400 bg-purple-500/10",
  bracket_tracker: "text-purple-400 bg-purple-500/10",
  export_artifact: "text-amber-400 bg-amber-500/10",
  create_session: "text-slate-400 bg-slate-500/10",
  destroy_session: "text-red-400 bg-red-500/10",
  session_reset: "text-slate-400 bg-slate-500/10",
};

const extractFilePaths = (content: string): string[] => {
  const paths: string[] = [];
  const seen = new Set<string>();
  const patterns = [
    /<<<FILE\s+([^>]+)>>>/g,
    /<<<CREATE\s+([^>]+)>>>/g,
    /```filepath:([^\n]+)\n/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const p = match[1].trim();
      if (p && !seen.has(p)) {
        seen.add(p);
        paths.push(p);
      }
    }
  }
  return paths;
};

const extractEditPaths = (content: string): string[] => {
  const paths: string[] = [];
  const seen = new Set<string>();
  const patterns = [
    /<<<EDIT\s+([^>]+)>>>/g,
    /```edit:([^\n]+)\n/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const p = match[1].trim();
      if (p && !seen.has(p)) {
        seen.add(p);
        paths.push(p);
      }
    }
  }
  return paths;
};

interface ParsedBlock {
  type: "text" | "file" | "edit";
  content: string;
  filename?: string;
  language?: string;
  editOps?: { action: string; range: string; code: string }[];
}

type DiffLine = { type: "same" | "add" | "del"; text: string };
function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const N = oldLines.length;
  const M = newLines.length;
  const max = N + M;
  if (max > 8000) {
    const result: DiffLine[] = [];
    for (const l of oldLines) result.push({ type: "del", text: l });
    for (const l of newLines) result.push({ type: "add", text: l });
    return result;
  }
  const v = new Int32Array(2 * max + 2);
  const trace: Int32Array[] = [];
  v.fill(-1);
  v[max + 1] = 0;
  outer:
  for (let d = 0; d <= max; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[max + k - 1] < v[max + k + 1])) {
        x = v[max + k + 1];
      } else {
        x = v[max + k - 1] + 1;
      }
      let y = x - k;
      while (x < N && y < M && oldLines[x] === newLines[y]) { x++; y++; }
      v[max + k] = x;
      if (x >= N && y >= M) break outer;
    }
  }
  const edits: DiffLine[] = [];
  let cx = N, cy = M;
  for (let d = trace.length - 1; d > 0 && (cx > 0 || cy > 0); d--) {
    const pv = trace[d - 1];
    const k = cx - cy;
    let prevK: number;
    if (k === -(d - 1) - 1 || (k !== (d - 1) + 1 && pv[max + k - 1] < pv[max + k + 1])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }
    const prevX = pv[max + prevK];
    const prevY = prevX - prevK;
    while (cx > prevX && cy > prevY) { cx--; cy--; edits.push({ type: "same", text: ` ${oldLines[cx]}` }); }
    if (cx > prevX) { cx--; edits.push({ type: "del", text: `-${oldLines[cx]}` }); }
    else if (cy > prevY) { cy--; edits.push({ type: "add", text: `+${newLines[cy]}` }); }
  }
  while (cx > 0 && cy > 0) { cx--; cy--; edits.push({ type: "same", text: ` ${oldLines[cx]}` }); }
  while (cx > 0) { cx--; edits.push({ type: "del", text: `-${oldLines[cx]}` }); }
  while (cy > 0) { cy--; edits.push({ type: "add", text: `+${newLines[cy]}` }); }
  return edits.reverse();
}

const getLanguageFromFilename = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    js: "javascript", jsx: "jsx", ts: "typescript", tsx: "tsx", py: "python",
    html: "html", css: "css", scss: "scss", json: "json", md: "markdown",
    sh: "bash", yml: "yaml", yaml: "yaml", sql: "sql", xml: "xml",
    go: "go", rs: "rust", java: "java", cpp: "cpp", c: "c", rb: "ruby",
    php: "php", swift: "swift", kt: "kotlin", vue: "vue", svelte: "svelte",
  };
  return map[ext] || "text";
};

const markdownComponents = {
  code({ node, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || "");
    const codeStr = String(children).replace(/\n$/, "");
    if (match) {
      return (
        <SyntaxHighlighter language={match[1]} style={oneDark} customStyle={{ margin: 0, padding: "0.75rem", fontSize: "0.75rem", background: "rgba(0,0,0,0.3)", borderRadius: "0.375rem" }} wrapLongLines>
          {codeStr}
        </SyntaxHighlighter>
      );
    }
    return <code className={`${className || ""} text-cyan-300 bg-white/10 px-1 rounded text-xs`} {...props}>{children}</code>;
  },
};

const parseContentForDisplay = (content: string): ParsedBlock[] => {
  const blocks: ParsedBlock[] = [];
  const filePattern = /<<<(FILE|CREATE)\s+([^>]+)>>>([\s\S]*?)<<<END>>>/g;
  const fpPattern = /```filepath:([^\n]+)\n([\s\S]*?)```/g;
  let lastIndex = 0;

  const allMatches: { index: number; length: number; block: ParsedBlock }[] = [];

  let match;
  while ((match = filePattern.exec(content)) !== null) {
    const filename = match[2].trim();
    allMatches.push({ index: match.index, length: match[0].length, block: { type: "file", content: match[3].trim(), filename, language: getLanguageFromFilename(filename) } });
  }

  const editStartPattern = /<<<EDIT\s+([^>]+)>>>/g;
  let editMatch;
  while ((editMatch = editStartPattern.exec(content)) !== null) {
    const overlaps = allMatches.some(m => editMatch!.index >= m.index && editMatch!.index < m.index + m.length);
    if (overlaps) continue;
    const filename = editMatch[1].trim();
    const startIdx = editMatch.index;
    const bodyStart = startIdx + editMatch[0].length;
    let closingEnd = -1;
    const endScan = /<<<END>>>/g;
    endScan.lastIndex = bodyStart;
    let endHit;
    while ((endHit = endScan.exec(content)) !== null) {
      closingEnd = endHit.index;
      const afterEnd = content.slice(endHit.index + 9).trimStart();
      if (afterEnd.startsWith("<<<REPLACE") || afterEnd.startsWith("<<<INSERT") || afterEnd.startsWith("<<<DELETE")) {
        continue;
      }
      if (afterEnd.startsWith("<<<END>>>")) {
        closingEnd = endHit.index + 9 + afterEnd.indexOf("<<<END>>>") + 9;
        break;
      }
      closingEnd = endHit.index + 9;
      break;
    }
    if (closingEnd < 0) continue;
    const fullLength = closingEnd - startIdx;
    const body = content.slice(bodyStart, closingEnd);
    const ops: { action: string; range: string; code: string }[] = [];
    const opPattern = /<<<(REPLACE|INSERT|DELETE)\s*(.*?)>>>([\s\S]*?)(?=<<<(?:REPLACE|INSERT|DELETE|END)|$)/g;
    let opMatch;
    while ((opMatch = opPattern.exec(body)) !== null) {
      ops.push({ action: opMatch[1], range: opMatch[2].trim(), code: opMatch[3].trim() });
    }
    if (ops.length === 0 && body.trim()) {
      ops.push({ action: "REPLACE", range: "", code: body.replace(/<<<END>>>/g, "").trim() });
    }
    allMatches.push({ index: startIdx, length: fullLength, block: { type: "edit", content: "", filename, editOps: ops } });
  }

  while ((match = fpPattern.exec(content)) !== null) {
    const overlaps = allMatches.some(m => match!.index >= m.index && match!.index < m.index + m.length);
    if (!overlaps) {
      const filename = match[1].trim();
      allMatches.push({ index: match.index, length: match[0].length, block: { type: "file", content: match[2].trim(), filename, language: getLanguageFromFilename(filename) } });
    }
  }

  allMatches.sort((a, b) => a.index - b.index);

  for (const m of allMatches) {
    if (m.index > lastIndex) {
      const text = content.slice(lastIndex, m.index).trim();
      if (text) blocks.push({ type: "text", content: text });
    }
    blocks.push(m.block);
    lastIndex = m.index + m.length;
  }

  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) blocks.push({ type: "text", content: text });
  }

  return blocks.length > 0 ? blocks : [{ type: "text", content: content.trim() }];
};

const detectStreamingBlock = (content: string): { type: "file" | "edit" | "create"; filename: string; streamingCode: string } | null => {
  const openPattern = /<<<(FILE|EDIT|CREATE)\s+([^>]+)>>>/;
  const parts = content.split(/<<<END>>>/g);
  const tail = parts[parts.length - 1];
  const m = openPattern.exec(tail);
  if (m) {
    const afterTag = tail.slice(m.index + m[0].length);
    return { type: m[1].toLowerCase() as "file" | "edit" | "create", filename: m[2].trim(), streamingCode: afterTag.trim() };
  }
  return null;
};

const approxTokens = (text: string): number => Math.ceil(text.length / 3.5);

const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function QuestsWorkspace() {
  const params = useParams<{ id: string }>();
  const envId = params.id;
  const [, setLocation] = useLocation();

  const [userPlan, setUserPlan] = useState<string>("free");
  const [environment, setEnvironment] = useState<QuestsEnvironment | null>(null);
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [tabContents, setTabContents] = useState<Record<string, { content: string; original: string }>>({});
  const [fileContentState, setFileContentState] = useState<string>("");
  const fileContentRef = useRef<string>("");
  const editorRef = useRef<any>(null);
  const diffContentDisposableRef = useRef<any>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const fileContentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileContent = fileContentState;
  const setFileContent = useCallback((v: string) => {
    fileContentRef.current = v;
    if (fileContentTimerRef.current) { clearTimeout(fileContentTimerRef.current); fileContentTimerRef.current = null; }
    setFileContentState(v);
    if (editorRef.current && editorRef.current.getValue() !== v) {
      editorRef.current.setValue(v);
    }
  }, []);
  const setFileContentDebounced = useCallback((v: string) => {
    fileContentRef.current = v;
    if (fileContentTimerRef.current) clearTimeout(fileContentTimerRef.current);
    fileContentTimerRef.current = setTimeout(() => setFileContentState(v), 300);
  }, []);
  const [originalContent, setOriginalContent] = useState<string>("");
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("chat");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<"keystone" | "focus">("keystone");
  const [readOnlyMode, setReadOnlyMode] = useState(false);
  const [mobileTab, setMobileTab] = useState<"files" | "code" | "chat" | "terminal">("chat");
  const [mobileDrawer, setMobileDrawer] = useState<"deploy" | "ledger" | "artifacts" | "settings" | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [githubCloneOpen, setGithubCloneOpen] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [githubBranch, setGithubBranch] = useState("main");
  const [isCloningRepo, setIsCloningRepo] = useState(false);
  const [isResettingContext, setIsResettingContext] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const [ksTemperature, setKsTemperature] = useState(0.7);
  const [ksMaxTokens, setKsMaxTokens] = useState(32768);
  const [ksPersona, setKsPersona] = useState("");
  interface KSArtifact { id: string; name: string; target_stack: string; status: string; created_at: string; }
  const [ksArtifacts, setKsArtifacts] = useState<KSArtifact[]>([]);
  const [ksArtifactsLoading, setKsArtifactsLoading] = useState(false);
  const [ksImporting, setKsImporting] = useState<string | null>(null);

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

  const loadKsArtifacts = async () => {
    setKsArtifactsLoading(true);
    try {
      const res = await apiFetch("/api/artifacts?limit=100");
      if (res.ok) {
        const data = await res.json();
        setKsArtifacts(data.artifacts || []);
      }
    } catch (e) { console.error("Failed to load artifacts:", e); }
    finally { setKsArtifactsLoading(false); }
  };

  useEffect(() => { loadKsArtifacts(); }, []);

  useEffect(() => {
    return () => {
      if (diffContentDisposableRef.current) {
        diffContentDisposableRef.current.dispose();
        diffContentDisposableRef.current = null;
      }
    };
  }, []);

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
        body: JSON.stringify({ path: filename, content: code })
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

  const [renamingKsArtifactId, setRenamingKsArtifactId] = useState<string | null>(null);
  const [renameKsArtifactValue, setRenameKsArtifactValue] = useState("");

  const startKsArtifactRename = (id: string, currentName: string) => {
    setRenamingKsArtifactId(id);
    setRenameKsArtifactValue(currentName);
  };

  const submitKsArtifactRename = async () => {
    if (!renamingKsArtifactId || !renameKsArtifactValue.trim()) { setRenamingKsArtifactId(null); return; }
    const old = ksArtifacts.find(a => a.id === renamingKsArtifactId);
    if (old && renameKsArtifactValue.trim() === old.name) { setRenamingKsArtifactId(null); return; }
    try {
      const res = await apiFetch(`/api/artifacts/${renamingKsArtifactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameKsArtifactValue.trim() })
      });
      if (res.ok) {
        toast.success("Artifact renamed");
        loadKsArtifacts();
      } else { toast.error("Rename failed"); }
    } catch (e) { console.error(e); toast.error("Rename failed"); }
    finally { setRenamingKsArtifactId(null); }
  };

  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const startRename = (filePath: string, currentName: string) => {
    setRenamingFile(filePath);
    setRenameValue(currentName);
  };

  const submitRename = async () => {
    if (!renamingFile || !renameValue.trim() || !envId) { setRenamingFile(null); return; }
    const dir = renamingFile.includes("/") ? renamingFile.substring(0, renamingFile.lastIndexOf("/") + 1) : "";
    const newPath = dir + renameValue.trim();
    if (newPath === renamingFile) { setRenamingFile(null); return; }
    try {
      const res = await apiFetch(`/api/keystone/environments/${envId}/files/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old_path: renamingFile, new_path: newPath })
      });
      if (res.ok) {
        toast.success(`Renamed to ${renameValue.trim()}`);
        loadFileTree();
        if (selectedFile === renamingFile) setSelectedFile(newPath);
      } else { toast.error("Rename failed"); }
    } catch (e) { console.error("Rename failed:", e); toast.error("Rename failed"); }
    finally { setRenamingFile(null); }
  };

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const { models, provider: detectedProvider, providers, getModelsForProvider, isLoading: isLoadingModels } = useAvailableModels();
  const [selectedProvider, setSelectedProvider] = useState("");

  const [gexRunning, setGexRunning] = useState(false);
  const [gexSnapshots, setGexSnapshots] = useState<Record<string, string>>({});
  const [gexModifiedFiles, setGexModifiedFiles] = useState<string[]>([]);
  const [gexPatchAccepted, setGexPatchAccepted] = useState<Set<string>>(new Set());
  const [chatSnapshots, setChatSnapshots] = useState<Record<string, string>>({});
  const chatSnapshotsRef = useRef<Record<string, string>>({});
  const [dismissedBlocks, setDismissedBlocks] = useState<Set<string>>(new Set());
  const [rejectedBlocks, setRejectedBlocks] = useState<Set<string>>(new Set());
  const [collapsedDiffs, setCollapsedDiffs] = useState<Set<string>>(new Set());
  const diffContentListenerRef = useRef<{ dispose: () => void } | null>(null);
  const sessionMessageIds = useRef<Set<string>>(new Set());

  const hasPendingReview = useMemo(() => {
    const lastAssistant = [...messages].reverse().find(m => m.role === "assistant" && m.content);
    if (!lastAssistant) return false;
    if (!sessionMessageIds.current.has(lastAssistant.id)) return false;
    const hasChanges = (lastAssistant.filesWritten && lastAssistant.filesWritten.length > 0) ||
                       (lastAssistant.filesEdited && lastAssistant.filesEdited.length > 0);
    if (!hasChanges) return false;
    const blocks = parseContentForDisplay(lastAssistant.content);
    return blocks.some((block, bi) => {
      if (block.type !== "file" && block.type !== "edit") return false;
      const blockKey = `${lastAssistant.id}-${bi}`;
      if (dismissedBlocks.has(blockKey) || rejectedBlocks.has(blockKey)) return false;
      if (block.type === "edit" && block.editOps) {
        const allOpsHandled = block.editOps.every((_, oi) => {
          const opKey = `${blockKey}-op-${oi}`;
          return rejectedBlocks.has(opKey);
        });
        if (allOpsHandled) return false;
      }
      return true;
    });
  }, [messages, dismissedBlocks, rejectedBlocks]);

  const [runtimeSessionId, setRuntimeSessionId] = useState<string | null>(null);
  const [runtimeLoading, setRuntimeLoading] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const PYTHON_EXAMPLE = `# AiOS Runtime — Python
import sys, platform, datetime

print(f"Python {sys.version}")
print(f"Platform: {platform.system()} {platform.machine()}")
print(f"Time: {datetime.datetime.now().isoformat()}")

# Try it: import a library, run calculations, etc.
nums = [x**2 for x in range(1, 11)]
print(f"Squares 1-10: {nums}")
print(f"Sum: {sum(nums)}")`;

  const NODE_EXAMPLE = `// AiOS Runtime — Node.js
const os = require('os');

console.log(\`Node \${process.version}\`);
console.log(\`Platform: \${os.platform()} \${os.arch()}\`);
console.log(\`Time: \${new Date().toISOString()}\`);

// Try it: run logic, import modules, etc.
const nums = Array.from({length: 10}, (_, i) => (i+1)**2);
console.log(\`Squares 1-10: [\${nums}]\`);
console.log(\`Sum: \${nums.reduce((a,b) => a+b, 0)}\`);`;

  const [termCode, setTermCode] = useState(PYTHON_EXAMPLE);
  const [termLang, setTermLang] = useState<"python" | "node">("python");
  const [termCodeEdited, setTermCodeEdited] = useState(false);

  const handleLangChange = (newLang: "python" | "node") => {
    const oldDefault = termLang === "python" ? PYTHON_EXAMPLE : NODE_EXAMPLE;
    const isDefault = termCode.trim() === oldDefault.trim() || !termCodeEdited;
    setTermLang(newLang);
    if (isDefault) {
      setTermCode(newLang === "python" ? PYTHON_EXAMPLE : NODE_EXAMPLE);
      setTermCodeEdited(false);
    }
  };
  const [termOutput, setTermOutput] = useState<{ stdout: string; stderr: string; exit_code: number } | null>(null);
  const [termRunning, setTermRunning] = useState(false);
  const [pkgName, setPkgName] = useState("");
  const [pkgEco, setPkgEco] = useState<"python" | "node">("python");
  const [pkgInstalling, setPkgInstalling] = useState(false);

  const [deployRepoUrl, setDeployRepoUrl] = useState("");
  const [deployTargetDir, setDeployTargetDir] = useState("myapp");
  const [deployRef, setDeployRef] = useState("");
  const [deployCloning, setDeployCloning] = useState(false);
  const [deployCheckingOut, setDeployCheckingOut] = useState(false);
  const [deployStack, setDeployStack] = useState<{ node: boolean; python: boolean; docker: boolean } | null>(null);
  const [deployDetecting, setDeployDetecting] = useState(false);
  const [deployRepoDir, setDeployRepoDir] = useState("myapp");
  const [deployInstallingNode, setDeployInstallingNode] = useState(false);
  const [deployInstallingPython, setDeployInstallingPython] = useState(false);
  const [deployFrozenLockfile, setDeployFrozenLockfile] = useState(true);
  const [deployDepsOutput, setDeployDepsOutput] = useState<string | null>(null);
  const [depsReqFile, setDepsReqFile] = useState("requirements.txt");
  const [singlePkg, setSinglePkg] = useState("");
  const [singlePkgEco, setSinglePkgEco] = useState<"python" | "node">("python");
  const [singlePkgInstalling, setSinglePkgInstalling] = useState(false);
  const [detectedDepFiles, setDetectedDepFiles] = useState<{ python: string[]; node: boolean }>({ python: [], node: false });
  const [detectedScripts, setDetectedScripts] = useState<Record<string, string>>({});
  const [envPairs, setEnvPairs] = useState<{ key: string; value: string }[]>([{ key: "", value: "" }]);
  const [envSaving, setEnvSaving] = useState(false);
  const [runtimeSyncing, setRuntimeSyncing] = useState(false);
  const [procName, setProcName] = useState("");
  const [procCommand, setProcCommand] = useState("");
  const [procPort, setProcPort] = useState("");
  const [procStarting, setProcStarting] = useState(false);
  const [runningProcs, setRunningProcs] = useState<{ name: string; pid: number; port?: number }[]>([]);
  const [procLogs, setProcLogs] = useState<Record<string, string>>({});
  const [procLogsOpen, setProcLogsOpen] = useState<string | null>(null);
  const [healthPort, setHealthPort] = useState("");
  const [healthHost, setHealthHost] = useState("127.0.0.1");
  const [healthUrl, setHealthUrl] = useState("");
  const [healthResult, setHealthResult] = useState<any>(null);
  const [healthChecking, setHealthChecking] = useState(false);
  const [exportDir, setExportDir] = useState("");
  const [exportResult, setExportResult] = useState<any>(null);
  const [exporting, setExporting] = useState(false);

  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerAutoRefresh, setLedgerAutoRefresh] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState("all");
  const [ledgerExpanded, setLedgerExpanded] = useState<Set<number>>(new Set());
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [fileSearchResults, setFileSearchResults] = useState<SearchHit[]>([]);
  const [fileSearching, setFileSearching] = useState(false);
  const [showFileSearch, setShowFileSearch] = useState(false);

  const [streamingContent, setStreamingContent] = useState("");

  useEffect(() => {
    if (providers.length > 0 && !selectedProvider) {
      const def = providers.find(p => p.is_default) || providers[0];
      setSelectedProvider(def.id);
    }
  }, [providers, selectedProvider]);

  useEffect(() => {
    if (selectedProvider) {
      const providerModels = getModelsForProvider(selectedProvider);
      if (providerModels.length > 0 && selectedModel && selectedModel !== "auto" && !providerModels.find(m => m.id === selectedModel)) {
        setSelectedModel("auto");
      }
    }
  }, [selectedProvider]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    apiFetch("/api/auth/me").then(r => r.json()).then(data => {
      const u = data?.user || data;
      if (u?.plan) setUserPlan(String(u.plan).toLowerCase());
      const role = String(u?.role || u?.user_role || "").toLowerCase();
      const adminRoles = ["admin", "manager", "super_admin", "superadmin", "owner", "root"];
      if (adminRoles.includes(role) || u?.is_admin === true || u?.is_superuser === true) {
        setUserPlan("enterprise");
      }
    }).catch(() => {});
  }, []);

  const isEnterprise = ["enterprise", "pro", "admin", "business", "team"].includes(String(userPlan || "").toLowerCase());

  useEffect(() => {
    window.scrollTo(0, 0);
    if (envId) {
      loadEnvironment();
      loadFileTree();
      loadChatHistory();
      initRuntimeSession();
    }
  }, [envId]);

  useEffect(() => {
    if (shouldAutoScroll) {
      const timer = setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [messages, shouldAutoScroll]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (ledgerAutoRefresh && activeTab === "ledger") {
      interval = setInterval(loadLedger, 5000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [ledgerAutoRefresh, activeTab, runtimeSessionId]);

  useEffect(() => {
    if (activeTab === "ledger") loadLedger();
  }, [activeTab]);

  const handleChatScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    setShouldAutoScroll(scrollHeight - scrollTop - clientHeight < 100);
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShouldAutoScroll(true);
  };

  const initRuntimeSession = async () => {
    setRuntimeLoading(true);
    setRuntimeError(null);
    try {
      let sessionId: string | null = null;
      const listRes = await apiFetch("/api/runtime/sessions");
      if (listRes.ok) {
        const data = await listRes.json();
        if (data.sessions && data.sessions.length > 0) {
          sessionId = data.sessions[0].session_id;
        }
      }
      if (!sessionId) {
        const createRes = await apiFetch("/api/runtime/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ environment_id: envId })
        });
        if (createRes.ok) {
          const session = await createRes.json();
          sessionId = session.session_id;
        } else {
          setRuntimeError("Could not create runtime session");
          return;
        }
      }
      if (sessionId && envId) {
        setRuntimeSessionId(sessionId);
        apiFetch("/api/runtime/sync_workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, environment_id: envId })
        }).catch(() => {});
        apiFetch("/api/runtime/list_processes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId })
        }).then(r => r.json()).then(data => {
          if (data.processes) {
            setRunningProcs(data.processes.filter((p: any) => p.alive).map((p: any) => ({
              name: p.name, pid: p.pid, port: p.port
            })));
          }
        }).catch(() => {});
      }
    } catch (e) {
      console.error("Failed to init runtime session:", e);
      setRuntimeError("Runtime connection failed");
    } finally {
      setRuntimeLoading(false);
    }
  };

  const loadEnvironment = async () => {
    try {
      const response = await apiFetch(`/api/keystone/environments/${envId}`).then(r => r.json());
      setEnvironment(response);
    } catch (error) {
      console.error("Failed to load environment:", error);
      setLocation("/keystone");
    }
  };

  const scanDepFiles = (node: FileNode): { python: string[]; node: boolean } => {
    const result = { python: [] as string[], node: false };
    const scan = (n: FileNode) => {
      if (n.type === "file") {
        if (n.name === "requirements.txt" || n.name === "requirements.in" || n.name === "Pipfile" || n.name === "pyproject.toml") result.python.push(n.path || n.name);
        if (n.name === "package.json") result.node = true;
      }
      n.children?.forEach(scan);
    };
    scan(node);
    return result;
  };

  const loadFileTree = async () => {
    try {
      const response = await apiFetch(`/api/keystone/environments/${envId}/files/tree`).then(r => r.json());
      const tree = response.tree || null;
      setFileTree(tree);
      setExpandedFolders(new Set([""]));
      if (tree) {
        const deps = scanDepFiles(tree);
        setDetectedDepFiles(deps);
        if (deps.python.length > 0) setDepsReqFile(deps.python[0]);
        if (deps.node) {
          apiFetch(`/api/keystone/environments/${envId}/files/read?path=package.json`)
            .then(r => r.json())
            .then(data => {
              try {
                const pkg = JSON.parse(data.content || "{}");
                if (pkg.scripts) setDetectedScripts(pkg.scripts);
              } catch {}
            }).catch(() => {});
        }
      }
    } catch (error) {
      console.error("Failed to load file tree:", error);
    }
  };

  const loadChatHistory = async () => {
    try {
      const response = await apiFetch(`/api/keystone/environments/${envId}/chat/history?limit=50`).then(r => r.json());
      const loadedMessages = (response.messages || []).map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        model_id: msg.model_id,
        provider_id: msg.provider_id,
        timestamp: msg.timestamp,
        filesWritten: msg.files_created || [],
        filesEdited: msg.files_modified || []
      }));
      setMessages(loadedMessages);
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  };

  const loadFile = async (path: string) => {
    if (selectedFile && selectedFile !== path) {
      setTabContents(prev => ({ ...prev, [selectedFile!]: { content: fileContent, original: originalContent } }));
    }
    const cached = tabContents[path];
    if (cached && openTabs.includes(path)) {
      setSelectedFile(path);
      setFileContent(cached.content);
      setOriginalContent(cached.original);
      if (isMobile) setMobileTab("code");
      return;
    }
    setIsLoadingFile(true);
    try {
      const response = await apiFetch(`/api/keystone/environments/${envId}/files/read?path=${encodeURIComponent(path)}`).then(r => r.json());
      const content = response.content || "";
      setSelectedFile(path);
      setFileContent(content);
      setOriginalContent(content);
      setOpenTabs(prev => prev.includes(path) ? prev : [...prev, path]);
      setTabContents(prev => ({ ...prev, [path]: { content, original: content } }));
      if (isMobile) setMobileTab("code");
    } catch (error) {
      console.error("Failed to load file:", error);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const closeTab = (path: string) => {
    setOpenTabs(prev => {
      const next = prev.filter(t => t !== path);
      if (selectedFile === path) {
        if (next.length > 0) {
          const idx = Math.min(prev.indexOf(path), next.length - 1);
          const nextFile = next[idx] || next[next.length - 1];
          const cached = tabContents[nextFile];
          setSelectedFile(nextFile);
          setFileContent(cached?.content || "");
          setOriginalContent(cached?.original || "");
        } else {
          setSelectedFile(null);
          setFileContent("");
          setOriginalContent("");
        }
      }
      return next;
    });
    setTabContents(prev => { const n = { ...prev }; delete n[path]; return n; });
  };

  const switchTab = (path: string) => {
    if (path === selectedFile) return;
    if (selectedFile) {
      setTabContents(prev => ({ ...prev, [selectedFile!]: { content: fileContent, original: originalContent } }));
    }
    const cached = tabContents[path];
    setSelectedFile(path);
    setFileContent(cached?.content || "");
    setOriginalContent(cached?.original || "");
  };

  const saveFile = async () => {
    if (fileContentTimerRef.current) { clearTimeout(fileContentTimerRef.current); fileContentTimerRef.current = null; }
    const currentContent = fileContentRef.current || fileContent;
    if (!selectedFile || currentContent === originalContent) return;
    setFileContent(currentContent);
    setIsSavingFile(true);
    try {
      await apiFetch(`/api/keystone/environments/${envId}/files/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selectedFile, content: currentContent })
      });
      setOriginalContent(currentContent);
      setTabContents(prev => ({ ...prev, [selectedFile!]: { content: currentContent, original: currentContent } }));
    } catch (error) {
      console.error("Failed to save file:", error);
    } finally {
      setIsSavingFile(false);
    }
  };

  const resetContext = async () => {
    setIsResettingContext(true);
    try {
      const response = await apiFetch(`/api/keystone/environments/${envId}/chat/reset-context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keep_summary: true })
      });
      if (!response.ok) throw new Error("Failed to reset context");
      const data = await response.json();
      setChatError(null);
      const divider: ChatMessage = {
        id: `ctx-reset-${Date.now()}`,
        role: "system",
        content: `Context refreshed — ${data.messages_cleared} messages cleared from LLM memory. Chat history preserved.`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, divider]);
      toast.success("LLM context refreshed");
    } catch (error) {
      console.error("Failed to reset context:", error);
      toast.error("Failed to reset context");
    } finally {
      setIsResettingContext(false);
    }
  };

  const cloneGithubRepo = async () => {
    if (!githubUrl.trim()) return;
    setIsCloningRepo(true);
    try {
      const response = await apiFetch(`/api/keystone/environments/${envId}/github/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: githubUrl.trim(), branch: githubBranch || "main" })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to clone repository");
      toast.success(`Cloned ${data.repo} (${data.files_copied} items)`);
      setGithubCloneOpen(false);
      setGithubUrl("");
      setGithubBranch("main");
      loadFileTree();
    } catch (error) {
      console.error("Failed to clone repository:", error);
      toast.error(error instanceof Error ? error.message : "Failed to clone repository");
    } finally {
      setIsCloningRepo(false);
    }
  };

  const runGex = async (targetFile?: string) => {
    if (gexRunning || isSendingMessage) return;
    setGexRunning(true);
    setActiveTab("chat");
    if (isMobile) setMobileTab("chat");

    const unrevertedFiles = gexModifiedFiles.filter(f => !gexPatchAccepted.has(f) && gexSnapshots[f] !== undefined);
    for (const fp of unrevertedFiles) {
      try {
        await apiFetch(`/api/keystone/environments/${envId}/files/write`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: fp, content: gexSnapshots[fp] })
        });
      } catch {}
    }

    setGexSnapshots({});
    setGexModifiedFiles([]);
    setGexPatchAccepted(new Set());

    const scanTarget = targetFile || "the entire project";
    const gexPrompt = targetFile
      ? `Scan and surgically fix: ${targetFile}`
      : "Scan the entire project for bugs, issues, and improvements. Apply surgical fixes.";

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: `_Gex scan: ${scanTarget}`,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setChatError(null);

    const assistantId = `gex-${Date.now()}`;
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "", timestamp: new Date().toISOString() }]);

    let collectedSnapshots: Record<string, string> = {};
    let allWritten: string[] = [];
    let allEdited: string[] = [];

    try {
      const response = await apiFetch(`/api/keystone/environments/${envId}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-AiAssist-Provider": selectedProvider || detectedProvider },
        body: JSON.stringify({
          message: gexPrompt,
          model: selectedModel && selectedModel !== "auto" ? selectedModel : undefined,
          gex_mode: true,
          temperature: ksTemperature,
          max_tokens: ksMaxTokens,
          persona: ksPersona || undefined
        }),
        credentials: "include"
      });

      if (!response.ok) {
        setChatError(`Gex scan failed: ${response.status}`);
        setMessages(prev => prev.filter(m => m.id !== assistantId));
        setGexRunning(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "content" && data.content) {
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + data.content } : m));
            } else if (data.type === "snapshots" && data.snapshots) {
              collectedSnapshots = { ...collectedSnapshots, ...data.snapshots };
            } else if (data.type === "done") {
              allWritten = data.files_written || [];
              allEdited = data.files_edited || [];
              const totalModified = [...allWritten, ...allEdited];

              if (totalModified.length > 0) {
                loadFileTree();
                const fullSnapshots = { ...collectedSnapshots };
                for (const fp of totalModified) {
                  if (fullSnapshots[fp] === undefined) fullSnapshots[fp] = "";
                }
                setGexSnapshots(fullSnapshots);
                setGexModifiedFiles(totalModified);

                for (const fp of totalModified) {
                  try {
                    const r = await apiFetch(`/api/keystone/environments/${envId}/files/read?path=${encodeURIComponent(fp)}`).then(r => r.json());
                    const c = r.content || "";
                    setOpenTabs(prev => prev.includes(fp) ? prev : [...prev, fp]);
                    setTabContents(prev => ({ ...prev, [fp]: { content: c, original: c } }));
                  } catch {}
                }
                if (totalModified.length > 0) {
                  const first = totalModified[0];
                  const r2 = await apiFetch(`/api/keystone/environments/${envId}/files/read?path=${encodeURIComponent(first)}`).then(r => r.json());
                  setSelectedFile(first);
                  setFileContent(r2.content || "");
                  setOriginalContent(r2.content || "");
                }

                toast(
                  <div className="flex flex-col gap-1" data-testid="gex-findings-toast">
                    <div className="flex items-center gap-2 font-semibold text-red-400">
                      <ScanSearch className="w-4 h-4" />
                      _Gex Surgery Complete
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {allWritten.length > 0 && <div className="text-green-400">{allWritten.length} file{allWritten.length > 1 ? "s" : ""} created</div>}
                      {allEdited.length > 0 && <div className="text-amber-400">{allEdited.length} file{allEdited.length > 1 ? "s" : ""} patched</div>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Review changes in the file panel — accept or revert each file.</div>
                  </div>,
                  { duration: 10000 }
                );
              } else {
                toast.info("_Gex scan complete — no changes needed.", { duration: 5000 });
              }

              if (data.gex_workspace_id) {
                setMessages(prev => [...prev, {
                  id: `gex-ws-${Date.now()}`,
                  role: "assistant" as const,
                  content: `_Gex surgery report saved to workspace.\n\n[View Surgery Report](/dashboard?workspace=${data.gex_workspace_id})`,
                  timestamp: new Date().toISOString(),
                }]);
              }
            } else if (data.type === "error") {
              setChatError(data.error);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      setChatError(`Gex scan error: ${err.message}`);
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      setGexRunning(false);
    }
  };

  const revertGexFile = async (filePath: string) => {
    const snapshot = gexSnapshots[filePath];
    if (snapshot === undefined) return;
    try {
      await apiFetch(`/api/keystone/environments/${envId}/files/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, content: snapshot })
      });
      if (selectedFile === filePath) {
        setFileContent(snapshot);
        setOriginalContent(snapshot);
      }
      setTabContents(prev => ({ ...prev, [filePath]: { content: snapshot, original: snapshot } }));
      setGexModifiedFiles(prev => prev.filter(f => f !== filePath));
      setGexPatchAccepted(prev => { const n = new Set(prev); n.delete(filePath); return n; });
      toast.success(`Reverted: ${filePath.split("/").pop()}`);
    } catch {
      toast.error("Revert failed");
    }
  };

  const acceptGexFile = (filePath: string) => {
    setGexPatchAccepted(prev => new Set(prev).add(filePath));
    toast.success(`Accepted: ${filePath.split("/").pop()}`);
  };

  const acceptAllGex = () => {
    setGexPatchAccepted(new Set(gexModifiedFiles));
    toast.success("All patches accepted");
  };

  const clearGexPatches = () => {
    setGexSnapshots({});
    setGexModifiedFiles([]);
    setGexPatchAccepted(new Set());
  };

  const dismissBlock = (blockKey: string) => {
    setDismissedBlocks(prev => new Set(prev).add(blockKey));
  };

  const rejectBlock = async (blockKey: string, filePath: string, blockContent?: string) => {
    const allSnapshots = { ...chatSnapshots, ...gexSnapshots };
    const snapshot = allSnapshots[filePath];

    let currentContent: string | null = null;
    try {
      const r = await apiFetch(`/api/keystone/environments/${envId}/files/read?path=${encodeURIComponent(filePath)}`).then(r => r.json());
      currentContent = r.content ?? null;
    } catch {}

    if (blockContent !== undefined && currentContent !== null && currentContent !== blockContent) {
      setRejectedBlocks(prev => new Set(prev).add(blockKey));
      toast.info(`File was modified after this block — skipped revert for ${filePath.split("/").pop()}`);
      return;
    }

    const restoreTo = (snapshot === undefined || snapshot === null) ? "" : snapshot;
    try {
      await apiFetch(`/api/keystone/environments/${envId}/files/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, content: restoreTo })
      });
      if (selectedFile === filePath) {
        setFileContent(restoreTo);
        setOriginalContent(restoreTo);
      }
      setTabContents(prev => ({ ...prev, [filePath]: { content: restoreTo, original: restoreTo } }));
    } catch {
      toast.error("Reject failed");
      return;
    }
    setRejectedBlocks(prev => new Set(prev).add(blockKey));
    toast.success(`Reverted: ${filePath.split("/").pop()}`);
  };

  const parseLineRange = (range: string): { start: number; end: number } | null => {
    const m = range.match(/lines?\s+(\d+)(?:\s*-\s*(\d+))?/i);
    if (!m) return null;
    return { start: parseInt(m[1]), end: m[2] ? parseInt(m[2]) : parseInt(m[1]) };
  };

  const parseInsertLine = (range: string): number | null => {
    const m = range.match(/(?:after\s+)?line\s+(\d+)/i);
    return m ? parseInt(m[1]) : null;
  };

  const revertSingleOp = async (opKey: string, filePath: string, op: { action: string; range: string; code: string }) => {
    const allSnapshots = { ...chatSnapshots, ...gexSnapshots };
    const snapshot = allSnapshots[filePath];
    if (snapshot === undefined) {
      toast.error("No snapshot available for revert");
      return;
    }
    const snapshotLines = snapshot.split("\n");

    let currentContent: string;
    try {
      const r = await apiFetch(`/api/keystone/environments/${envId}/files/read?path=${encodeURIComponent(filePath)}`).then(r => r.json());
      currentContent = r.content || "";
    } catch {
      toast.error("Failed to read current file");
      return;
    }
    const currentLines = currentContent.split("\n");

    let newLines = [...currentLines];
    const action = op.action.toUpperCase();

    if (action === "REPLACE") {
      const lr = parseLineRange(op.range);
      if (lr) {
        const originalSlice = snapshotLines.slice(lr.start - 1, lr.end);
        const replacedLineCount = op.code.split("\n").length;
        let insertIdx = -1;
        for (let i = 0; i <= newLines.length - replacedLineCount; i++) {
          const candidate = newLines.slice(i, i + replacedLineCount).join("\n");
          if (candidate === op.code) { insertIdx = i; break; }
        }
        if (insertIdx >= 0) {
          newLines.splice(insertIdx, replacedLineCount, ...originalSlice);
        }
      }
    } else if (action === "INSERT") {
      const afterLine = parseInsertLine(op.range);
      if (afterLine !== null) {
        const insertedLines = op.code.split("\n");
        const insertedCount = insertedLines.length;
        for (let i = 0; i <= newLines.length - insertedCount; i++) {
          const candidate = newLines.slice(i, i + insertedCount).join("\n");
          if (candidate === op.code) {
            newLines.splice(i, insertedCount);
            break;
          }
        }
      }
    } else if (action === "DELETE") {
      const lr = parseLineRange(op.range);
      if (lr) {
        const deletedLines = snapshotLines.slice(lr.start - 1, lr.end);
        let bestIdx = Math.min(lr.start - 1, newLines.length);
        newLines.splice(bestIdx, 0, ...deletedLines);
      }
    }

    const newContent = newLines.join("\n");
    try {
      await apiFetch(`/api/keystone/environments/${envId}/files/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, content: newContent })
      });
      if (selectedFile === filePath) {
        setFileContent(newContent);
        setOriginalContent(newContent);
      }
      setTabContents(prev => ({ ...prev, [filePath]: { content: newContent, original: newContent } }));
      setRejectedBlocks(prev => new Set(prev).add(opKey));
      toast.success(`Reverted ${action} ${op.range}`);
    } catch {
      toast.error("Revert failed");
    }
  };

  const rejectAllEditOps = async (blockKey: string, filePath: string, editOps: Array<{ action: string; range: string; code: string }>) => {
    for (let i = editOps.length - 1; i >= 0; i--) {
      const opKey = `${blockKey}-op-${i}`;
      if (rejectedBlocks.has(opKey)) continue;
      await revertSingleOp(opKey, filePath, editOps[i]);
    }
    setRejectedBlocks(prev => new Set(prev).add(blockKey));
  };

  const toggleDiff = (blockKey: string) => {
    setCollapsedDiffs(prev => {
      const n = new Set(prev);
      if (n.has(blockKey)) n.delete(blockKey); else n.add(blockKey);
      return n;
    });
  };

  const rejectChatFile = async (filePath: string) => {
    const allSnapshots = { ...chatSnapshots, ...gexSnapshots };
    const snapshot = allSnapshots[filePath];
    if (snapshot === undefined || snapshot === null) {
      try {
        await apiFetch(`/api/keystone/environments/${envId}/files/write`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: filePath, content: "" })
        });
      } catch {}
      toast.success(`Rejected: ${filePath.split("/").pop()}`);
      return;
    }
    try {
      await apiFetch(`/api/keystone/environments/${envId}/files/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, content: snapshot })
      });
      if (selectedFile === filePath) {
        setFileContent(snapshot);
        setOriginalContent(snapshot);
      }
      setTabContents(prev => ({ ...prev, [filePath]: { content: snapshot, original: snapshot } }));
      toast.success(`Rejected: ${filePath.split("/").pop()} — reverted`);
    } catch {
      toast.error("Reject failed");
    }
  };

  const sendMessage = async () => {
    const currentInput = textareaRef.current?.value?.trim() || chatInput.trim();
    if (!currentInput || isSendingMessage) return;
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: currentInput,
      timestamp: new Date().toISOString()
    };
    const tempAssistantId = `assistant-${Date.now()}`;
    sessionMessageIds.current.add(tempAssistantId);
    setMessages(prev => [...prev, userMessage]);
    if (textareaRef.current) textareaRef.current.value = "";
    setChatInput("");
    setIsSendingMessage(true);
    setStreamingContent("");
    setShouldAutoScroll(true);
    setMessages(prev => [...prev, {
      id: tempAssistantId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString()
    }]);

    try {
      setChatError(null);
      const abortCtrl = new AbortController();
      streamAbortRef.current = abortCtrl;
      const response = await apiFetch(`/api/keystone/environments/${envId}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-AiAssist-Provider": selectedProvider || detectedProvider },
        body: JSON.stringify({
          message: userMessage.content,
          model: selectedModel && selectedModel !== "auto" ? selectedModel : undefined,
          focus_mode: editorMode === "focus",
          read_only: readOnlyMode && editorMode !== "focus",
          temperature: ksTemperature,
          max_tokens: ksMaxTokens,
          persona: ksPersona || undefined
        }),
        credentials: "include",
        signal: abortCtrl.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Request failed" }));
        const errorMessage = errorData.detail || "Failed to send message";
        setChatError(errorMessage);
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "content") {
                  fullContent += data.content;
                  const detectedFiles = extractFilePaths(fullContent);
                  const detectedEdits = extractEditPaths(fullContent);
                  setMessages(prev => prev.map(m =>
                    m.id === tempAssistantId
                      ? { ...m, content: fullContent, filesWritten: detectedFiles, filesEdited: detectedEdits }
                      : m
                  ));
                } else if (data.type === "file_written") {
                  setMessages(prev => prev.map(m =>
                    m.id === tempAssistantId
                      ? { ...m, filesWritten: [...(m.filesWritten || []), data.path] }
                      : m
                  ));
                  loadFileTree();
                } else if (data.type === "files_written") {
                  if (data.files && data.files.length > 0) {
                    setMessages(prev => prev.map(m =>
                      m.id === tempAssistantId
                        ? { ...m, filesWritten: data.files }
                        : m
                    ));
                    loadFileTree();
                  }
                } else if (data.type === "file_edited") {
                  setMessages(prev => prev.map(m =>
                    m.id === tempAssistantId
                      ? { ...m, filesEdited: [...(m.filesEdited || []), data.path] }
                      : m
                  ));
                  loadFileTree();
                } else if (data.type === "files_edited") {
                  if (data.files && data.files.length > 0) {
                    setMessages(prev => prev.map(m =>
                      m.id === tempAssistantId
                        ? { ...m, filesEdited: data.files }
                        : m
                    ));
                    loadFileTree();
                  }
                } else if (data.type === "tool_call") {
                  const toolLabel = data.name === "read_file" ? `📄 Reading \`${data.arguments?.path || "file"}\``
                    : data.name === "search_files" ? `🔍 Searching for \`${data.arguments?.pattern}\`${data.arguments?.file_pattern ? ` in ${data.arguments.file_pattern}` : ""}`
                    : data.name === "glob_files" ? `📂 Finding files: \`${data.arguments?.pattern}\``
                    : data.name === "list_functions" ? `🔬 Analyzing \`${data.arguments?.path || "file"}\``
                    : `⚙️ ${data.name}`;
                  fullContent += `\n\n> ${toolLabel}\n\n`;
                  setMessages(prev => prev.map(m =>
                    m.id === tempAssistantId ? { ...m, content: fullContent, toolActive: true } : m
                  ));
                } else if (data.type === "tool_result") {
                  setMessages(prev => prev.map(m =>
                    m.id === tempAssistantId ? { ...m, toolActive: false } : m
                  ));
                } else if (data.type === "tool_fallback") {
                } else if (data.type === "snapshots" && data.snapshots) {
                  chatSnapshotsRef.current = { ...chatSnapshotsRef.current, ...data.snapshots };
                  setChatSnapshots(prev => ({ ...prev, ...data.snapshots }));
                } else if (data.type === "file_error") {
                  toast.error(`Failed to write ${data.path}: ${data.error}`);
                } else if (data.type === "edit_error") {
                  toast.error(`Failed to edit ${data.path}: ${data.error}`);
                } else if (data.type === "done") {
                  const finalFiles = data.files_written || extractFilePaths(fullContent);
                  const finalEdits = data.files_edited || extractEditPaths(fullContent);
                  if (data.message_id) sessionMessageIds.current.add(data.message_id);
                  setMessages(prev => prev.map(m =>
                    m.id === tempAssistantId
                      ? { ...m, id: data.message_id, content: fullContent, filesWritten: finalFiles, filesEdited: finalEdits }
                      : m
                  ));
                  const totalChanged = finalFiles.length + finalEdits.length;
                  if (totalChanged > 0) {
                    const parts = [];
                    if (finalFiles.length > 0) parts.push(`created ${finalFiles.length}`);
                    if (finalEdits.length > 0) parts.push(`edited ${finalEdits.length}`);
                    toast.success(`${parts.join(', ')} file${totalChanged > 1 ? 's' : ''}`);
                    loadFileTree();
                    const allChanged = [...finalFiles, ...finalEdits];

                    const mergedSnapshots: Record<string, string> = {};
                    for (const fp of allChanged) {
                      if (chatSnapshotsRef.current[fp] !== undefined) {
                        mergedSnapshots[fp] = chatSnapshotsRef.current[fp];
                      } else {
                        mergedSnapshots[fp] = "";
                      }
                    }
                    setGexSnapshots(prev => ({ ...prev, ...mergedSnapshots }));
                    setGexModifiedFiles(prev => [...new Set([...prev, ...allChanged])]);

                    for (const fp of allChanged) {
                      try {
                        const r = await apiFetch(`/api/keystone/environments/${envId}/files/read?path=${encodeURIComponent(fp)}`).then(r => r.json());
                        const c = r.content || "";
                        setOpenTabs(prev => prev.includes(fp) ? prev : [...prev, fp]);
                        setTabContents(prev => ({ ...prev, [fp]: { content: c, original: c } }));
                      } catch {}
                    }
                    if (allChanged.length > 0) {
                      const first = allChanged[0];
                      try {
                        const r2 = await apiFetch(`/api/keystone/environments/${envId}/files/read?path=${encodeURIComponent(first)}`).then(r => r.json());
                        setSelectedFile(first);
                        setFileContent(r2.content || "");
                        setOriginalContent(r2.content || "");
                      } catch {}
                    }
                  }
                } else if (data.type === "context_refresh") {
                  const trimmed = data.messages_trimmed || 0;
                  setMessages(prev => [...prev, {
                    id: `ctx-auto-${Date.now()}`,
                    role: "system" as const,
                    content: `🔄 Context automatically refreshed — ${trimmed} messages trimmed from LLM memory to fit within the model's context window. Your chat history is preserved, and the request is being retried.`,
                    timestamp: new Date().toISOString(),
                  }]);
                  toast.info("Context auto-refreshed — retrying your request");
                } else if (data.type === "error") {
                  setChatError(data.error);
                  toast.error(data.error);
                }
              } catch (e) {}
            }
          }
        }
      }
      loadFileTree();
    } catch (error: any) {
      if (error?.name === "AbortError") {
        toast.info("Stream stopped");
      } else {
        console.error("Failed to send message:", error);
        setMessages(prev => prev.filter(m => m.id !== tempAssistantId));
        if (!chatError) {
          const msg = error?.message || "Failed to send message";
          setChatError(msg);
          toast.error(msg);
        }
      }
    } finally {
      streamAbortRef.current = null;
      setIsSendingMessage(false);
      setStreamingContent("");
    }
  };

  const stopStream = () => {
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
    }
  };

  const runCode = async () => {
    if (!runtimeSessionId || termRunning) return;
    setTermRunning(true);
    setTermOutput(null);
    try {
      const res = await apiFetch("/api/runtime/run_code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: runtimeSessionId, language: termLang, code: termCode, environment_id: envId })
      });
      const data = await res.json();
      setTermOutput(data);
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
        body: JSON.stringify({ session_id: runtimeSessionId, ecosystem: pkgEco, package: pkgName.trim() })
      });
      const data = await res.json();
      toast.success(`Package ${data.package} recorded (${data.ecosystem})`);
      setPkgName("");
    } catch (e) {
      toast.error("Failed to install package");
    } finally {
      setPkgInstalling(false);
    }
  };

  const deployCloneRepo = async () => {
    if (!runtimeSessionId || !deployRepoUrl.trim()) return;
    setDeployCloning(true);
    try {
      const res = await apiFetch("/api/runtime/clone_repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: runtimeSessionId, repo_url: deployRepoUrl.trim(), target_dir: deployTargetDir })
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Repository cloned");
        setDeployRepoDir(deployTargetDir);
      } else {
        toast.error(data.stderr || "Clone failed");
      }
    } catch (e) {
      toast.error("Clone failed");
    } finally {
      setDeployCloning(false);
    }
  };

  const deployCheckoutRef = async () => {
    if (!runtimeSessionId || !deployRef.trim()) return;
    setDeployCheckingOut(true);
    try {
      const res = await apiFetch("/api/runtime/checkout_ref", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: runtimeSessionId, repo_dir: deployRepoDir, ref: deployRef.trim() })
      });
      const data = await res.json();
      data.ok ? toast.success(`Checked out ${deployRef}`) : toast.error(data.checkout_stderr || "Checkout failed");
    } catch (e) {
      toast.error("Checkout failed");
    } finally {
      setDeployCheckingOut(false);
    }
  };

  const deployDetectStack = async () => {
    if (!runtimeSessionId) return;
    setDeployDetecting(true);
    try {
      const res = await apiFetch("/api/runtime/detect_stack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: runtimeSessionId, repo_dir: deployRepoDir })
      });
      setDeployStack(await res.json());
    } catch (e) {
      toast.error("Detection failed");
    } finally {
      setDeployDetecting(false);
    }
  };

  const syncWorkspaceToRuntime = async () => {
    if (!runtimeSessionId || !envId) return false;
    try {
      const res = await apiFetch("/api/runtime/sync_workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: runtimeSessionId, environment_id: envId })
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const deployInstallDeps = async (type: "node" | "python") => {
    if (!runtimeSessionId) return;
    type === "node" ? setDeployInstallingNode(true) : setDeployInstallingPython(true);
    setDeployDepsOutput(null);
    try {
      const synced = await syncWorkspaceToRuntime();
      if (!synced) {
        toast.error("Failed to sync files to runtime");
        return;
      }
      const endpoint = type === "node" ? "/api/runtime/install_node_deps" : "/api/runtime/install_python_deps";
      const body: any = { session_id: runtimeSessionId, repo_dir: "." };
      if (type === "node") body.frozen_lockfile = deployFrozenLockfile;
      if (type === "python") body.requirements_file = depsReqFile;
      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      setDeployDepsOutput(data.ok ? (data.stdout || "Done") : (data.stderr || "Failed"));
      data.ok ? toast.success(`${type} deps installed`) : toast.error(`${type} deps failed`);
    } catch (e) {
      toast.error("Install failed");
    } finally {
      type === "node" ? setDeployInstallingNode(false) : setDeployInstallingPython(false);
    }
  };

  const installSinglePackage = async () => {
    if (!runtimeSessionId || !singlePkg.trim()) return;
    setSinglePkgInstalling(true);
    setDeployDepsOutput(null);
    try {
      const res = await apiFetch("/api/runtime/install_package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: runtimeSessionId, ecosystem: singlePkgEco, package: singlePkg.trim() })
      });
      const data = await res.json();
      setDeployDepsOutput(data.ok ? (data.stdout || `Installed ${singlePkg}`) : (data.stderr || "Failed"));
      data.ok ? toast.success(`${singlePkg} installed`) : toast.error(`Failed to install ${singlePkg}`);
      if (data.ok) setSinglePkg("");
    } catch (e) {
      toast.error("Install failed");
    } finally {
      setSinglePkgInstalling(false);
    }
  };

  const deploySaveEnv = async () => {
    if (!runtimeSessionId) return;
    setEnvSaving(true);
    try {
      const env: Record<string, string> = {};
      envPairs.filter(p => p.key.trim()).forEach(p => { env[p.key.trim()] = p.value; });
      const res = await apiFetch("/api/runtime/write_env_file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: runtimeSessionId, repo_dir: deployRepoDir, env })
      });
      const data = await res.json();
      toast.success(`Saved ${data.count} env vars`);
    } catch (e) {
      toast.error("Failed to save env");
    } finally {
      setEnvSaving(false);
    }
  };

  const deployStartProcess = async () => {
    if (!runtimeSessionId || !procName.trim() || !procCommand.trim()) return;
    setProcStarting(true);
    try {
      const synced = await syncWorkspaceToRuntime();
      if (!synced) {
        toast.error("Failed to sync files to runtime");
        return;
      }
      const res = await apiFetch("/api/runtime/start_process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: runtimeSessionId,
          repo_dir: ".",
          name: procName.trim(),
          command: procCommand.trim().split(/\s+/),
          port: procPort ? parseInt(procPort) : null
        })
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      const pName = procName.trim();
      setRunningProcs(prev => [...prev, { name: pName, pid: data.pid, port: data.port }]);
      toast.success(`Process ${pName} started (PID ${data.pid})`);
      setProcName("");
      setProcCommand("");
      setProcPort("");
      setTimeout(() => deployViewLogs(pName), 1500);
    } catch (e) {
      toast.error("Failed to start process");
    } finally {
      setProcStarting(false);
    }
  };

  const deployStopProcess = async (name: string) => {
    if (!runtimeSessionId) return;
    try {
      await apiFetch("/api/runtime/stop_process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: runtimeSessionId, name })
      });
      setRunningProcs(prev => prev.filter(p => p.name !== name));
      toast.success(`Process ${name} stopped`);
    } catch (e) {
      toast.error("Failed to stop process");
    }
  };

  const deployViewLogs = async (name: string) => {
    if (!runtimeSessionId) return;
    try {
      const res = await apiFetch("/api/runtime/stream_logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: runtimeSessionId, name, lines: 80 })
      });
      const data = await res.json();
      setProcLogs(prev => ({ ...prev, [name]: data.logs || "" }));
      setProcLogsOpen(procLogsOpen === name ? null : name);
    } catch (e) {
      toast.error("Failed to get logs");
    }
  };

  const deployCheckPort = async () => {
    if (!runtimeSessionId || !healthPort) return;
    setHealthChecking(true);
    try {
      const res = await apiFetch("/api/runtime/check_port", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: runtimeSessionId, port: parseInt(healthPort), host: healthHost })
      });
      setHealthResult(await res.json());
    } catch (e) {
      setHealthResult({ error: String(e) });
    } finally {
      setHealthChecking(false);
    }
  };

  const deployHttpCheck = async () => {
    if (!runtimeSessionId || !healthUrl.trim()) return;
    setHealthChecking(true);
    try {
      const res = await apiFetch("/api/runtime/http_health_check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: runtimeSessionId, url: healthUrl.trim() })
      });
      setHealthResult(await res.json());
    } catch (e) {
      setHealthResult({ error: String(e) });
    } finally {
      setHealthChecking(false);
    }
  };

  const deployExport = async () => {
    if (!runtimeSessionId || !exportDir.trim()) return;
    setExporting(true);
    try {
      const res = await apiFetch("/api/runtime/export_artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: runtimeSessionId, source_dir: exportDir.trim() })
      });
      setExportResult(await res.json());
      toast.success("Artifacts exported");
    } catch (e) {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const loadLedger = async () => {
    setLedgerLoading(true);
    try {
      const res = await apiFetch("/api/runtime/ledger?limit=200");
      if (res.ok) {
        const data = await res.json();
        setLedgerEntries(data.logs || []);
      }
    } catch (e) {
      console.error("Failed to load ledger:", e);
    } finally {
      setLedgerLoading(false);
    }
  };

  const searchInFiles = async () => {
    if (!runtimeSessionId || !fileSearchQuery.trim()) return;
    setFileSearching(true);
    try {
      const res = await apiFetch("/api/runtime/search_in_files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: runtimeSessionId, root: `/runtime/workspaces/${runtimeSessionId}`, pattern: fileSearchQuery.trim() })
      });
      const data = await res.json();
      setFileSearchResults(data.hits || []);
      if (data.count === 0) toast.info("No matches found");
    } catch (e) {
      toast.error("Search failed");
    } finally {
      setFileSearching(false);
    }
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const getFileIcon = (name: string) => {
    if (name.endsWith(".json")) return <FileJson className="w-4 h-4 text-yellow-400" />;
    if (name.endsWith(".ts") || name.endsWith(".tsx")) return <FileCode className="w-4 h-4 text-blue-400" />;
    if (name.endsWith(".js") || name.endsWith(".jsx")) return <FileCode className="w-4 h-4 text-yellow-400" />;
    if (name.endsWith(".py")) return <FileCode className="w-4 h-4 text-green-400" />;
    if (name.endsWith(".md")) return <FileText className="w-4 h-4 text-muted-foreground" />;
    if (name.endsWith(".css") || name.endsWith(".scss")) return <FileCode className="w-4 h-4 text-pink-400" />;
    return <File className="w-4 h-4 text-muted-foreground" />;
  };

  const getLanguageFromPath = (path: string): string => {
    const ext = path.split(".").pop()?.toLowerCase() || "";
    const langMap: Record<string, string> = {
      ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx", py: "python",
      json: "json", md: "markdown", css: "css", scss: "scss", html: "html",
      xml: "xml", yaml: "yaml", yml: "yaml", sh: "bash", bash: "bash", sql: "sql",
      go: "go", rs: "rust", rb: "ruby", php: "php", java: "java", c: "c",
      cpp: "cpp", h: "c", hpp: "cpp", swift: "swift", kt: "kotlin", dart: "dart",
      vue: "vue", svelte: "svelte", graphql: "graphql", dockerfile: "docker",
      toml: "toml", ini: "ini", env: "bash"
    };
    return langMap[ext] || "text";
  };

  const renderFileTree = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFile === node.path;

    if (node.type === "directory") {
      return (
        <div key={node.path}>
          <button
            onClick={() => toggleFolder(node.path)}
            className="flex items-center gap-2 w-full px-2 py-1 text-left text-sm hover:bg-muted/50 rounded transition-colors"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            data-testid={`folder-${node.path}`}
          >
            {isExpanded ? <FolderOpen className="w-4 h-4 text-amber-400" /> : <Folder className="w-4 h-4 text-amber-400" />}
            <span className="text-foreground/80 truncate">{node.name}</span>
          </button>
          {isExpanded && node.children && (
            <div>{node.children.map(child => renderFileTree(child, depth + 1))}</div>
          )}
        </div>
      );
    }

    const isGexModified = gexModifiedFiles.includes(node.path);
    const isGexAccepted = gexPatchAccepted.has(node.path);

    if (renamingFile === node.path) {
      return (
        <div key={node.path} className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft: `${depth * 12 + 8}px` }}>
          {getFileIcon(node.name)}
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitRename(); if (e.key === "Escape") setRenamingFile(null); }}
            onBlur={submitRename}
            autoFocus
            className="flex-1 bg-muted border border-border rounded px-1.5 py-0.5 text-sm text-foreground focus:outline-none focus:border-indigo-500 min-w-0"
            data-testid={`input-rename-${node.path}`}
          />
        </div>
      );
    }

    return (
      <div key={node.path} className="group relative flex items-center">
        <button
          onClick={() => loadFile(node.path)}
          onDoubleClick={(e) => { e.preventDefault(); startRename(node.path, node.name); }}
          className={`flex items-center gap-2 w-full px-2 py-1 text-left text-sm hover:bg-muted/50 rounded transition-colors ${
            isSelected ? "qw-file-active text-foreground" : ""
          } ${isGexModified && !isGexAccepted ? "ring-1 ring-red-500/40" : ""} ${isGexAccepted ? "ring-1 ring-green-500/30" : ""}`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          data-testid={`file-${node.path}`}
        >
          {getFileIcon(node.name)}
          <span className="truncate flex-1">{node.name}</span>
          {isGexModified && !isGexAccepted && <FileWarning className="w-3 h-3 text-red-400 shrink-0" />}
          {isGexAccepted && <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />}
        </button>
        {isGexModified && !isGexAccepted && (
          <div className="absolute right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button
              onClick={(e) => { e.stopPropagation(); acceptGexFile(node.path); }}
              className="p-0.5 rounded bg-green-600/80 hover:bg-green-500 text-white"
              title="Accept patch"
              data-testid={`gex-accept-${node.path}`}
            >
              <CheckCircle2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); revertGexFile(node.path); }}
              className="p-0.5 rounded bg-red-600/80 hover:bg-red-500 text-white"
              title="Revert to original"
              data-testid={`gex-revert-${node.path}`}
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        )}
        {!isGexModified && !gexRunning && (
          <div className="absolute right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button
              onClick={(e) => { e.stopPropagation(); startRename(node.path, node.name); }}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/80"
              title="Rename"
              data-testid={`rename-${node.path}`}
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); runGex(node.path); }}
              className="p-0.5 rounded text-red-400 hover:text-red-300 hover:bg-red-600/20"
              title={`Scan ${node.name} with _Gex`}
              data-testid={`gex-scan-${node.path}`}
            >
              <ScanSearch className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const hasUnsavedChanges = fileContent !== originalContent;

  const cardClass = "bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm";

  if (!environment) {
    return (
      <>
        <style>{`
          @keyframes ksShimmer {
            0% { background-position: 200% center; }
            100% { background-position: -200% center; }
          }
          .ks-shimmer {
            background: linear-gradient(90deg, rgba(99,102,241,0.9) 0%, rgba(6,182,212,0.8) 25%, rgba(139,92,246,0.7) 50%, rgba(6,182,212,0.8) 75%, rgba(99,102,241,0.9) 100%);
            background-size: 200% auto;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: ksShimmer 3s linear infinite;
          }
          @keyframes ksPulseRing {
            0%, 100% { transform: scale(1); opacity: 0.3; }
            50% { transform: scale(1.15); opacity: 0.6; }
          }
        `}</style>
        <div className="h-full min-h-full bg-[#0A0A0B] flex items-center justify-center relative overflow-hidden" data-testid="loading-environment">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-indigo-500/[0.06] blur-[100px] animate-pulse" />
            <div className="absolute -bottom-[30%] -right-[20%] w-[70%] h-[70%] rounded-full bg-cyan-500/[0.05] blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
            <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-violet-500/[0.04] blur-[80px] animate-pulse" style={{ animationDelay: "2s" }} />
          </div>
          <div className="text-center relative z-10 flex flex-col items-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl" style={{ animation: "ksPulseRing 2s ease-in-out infinite" }} />
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-amber-500/15 border border-white/10 flex items-center justify-center backdrop-blur-sm relative shadow-[0_0_24px_rgba(18,212,138,0.25)]">
                <span className="font-[family-name:var(--qw-font-display)] text-lg font-extrabold bg-gradient-to-br from-white to-emerald-400 bg-clip-text text-transparent">K</span>
              </div>
            </div>
            <div className="flex items-baseline gap-0 mb-1">
              <span className="text-[22px] font-bold tracking-tight bg-gradient-to-r from-white via-white/90 to-emerald-300/80 bg-clip-text text-transparent">Key</span><span className="text-[22px] font-light tracking-tight text-emerald-400/90">Stone</span>
            </div>
            <div className="flex items-center gap-2 mb-5">
              <div className="h-[1px] w-10 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
              <span className="text-[10px] font-semibold tracking-[0.35em] uppercase text-emerald-400/80">AiAssist Secure</span>
              <div className="h-[1px] w-10 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
            </div>
            <div className="flex items-center gap-1.5 mb-5">
              <span className="text-[10px] text-white/25 tracking-wide">by</span>
              <img src={aiasLogo} alt="AiAS" className="w-4 h-4 rounded-sm opacity-40" />
              <span className="text-[10px] font-medium tracking-wider text-white/30">AiAS</span>
            </div>
            <div className="w-5 h-5 border-2 border-white/15 border-t-emerald-400 rounded-full animate-spin mb-3" />
            <span className="text-[11px] text-white/30">Loading environment...</span>
          </div>
        </div>
      </>
    );
  }

  const renderTerminalTab = () => (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full qw-panel-body"
      data-testid="tab-content-terminal"
    >
      <div className="qw-panel-head-row" style={{ borderColor: "rgba(255,255,255,.07)", background: "rgba(0,0,0,.25)" }}>
        <Terminal className="w-4 h-4" style={{ color: "#12d48a" }} />
        <div className="min-w-0">
          <div className="qw-panel-kicker">Terminal</div>
          <span className="text-sm font-semibold text-foreground">Code Runner</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Select value={termLang} onValueChange={(v) => handleLangChange(v as "python" | "node")}>
            <SelectTrigger className="qw-select h-7 w-24 text-xs" data-testid="select-terminal-lang">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="node">Node.js</SelectItem>
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={runCode}
            disabled={termRunning || !runtimeSessionId}
            className="qw-run-btn"
            data-testid="button-run-code"
          >
            {termRunning ? <Loader2 className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            Run
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-[3] min-h-0">
          <Editor
            height="100%"
            language={termLang === "python" ? "python" : "javascript"}
            value={termCode}
            onChange={(v) => { setTermCode(v || ""); setTermCodeEdited(true); }}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              automaticLayout: true,
              padding: { top: 8, bottom: 8 }
            }}
            data-testid="editor-terminal-code"
          />
        </div>

        <div className="flex-[2] qw-term-output border-t" style={{ background: "rgba(0,0,0,.5)" }}>
          {termOutput ? (
            <div className="p-3 font-mono text-xs space-y-1.5" data-testid="terminal-output">
              <div className="qw-term-exit">
                EXIT CODE
                <b className={termOutput.exit_code === 0 ? "" : "err"}>{termOutput.exit_code}</b>
              </div>
              {termOutput.stdout && (
                <pre className="whitespace-pre-wrap text-emerald-300/90">{termOutput.stdout}</pre>
              )}
              {termOutput.stderr && (
                <pre className="whitespace-pre-wrap text-red-300/90">{termOutput.stderr}</pre>
              )}
            </div>
          ) : (
            <div className="qw-panel-empty h-full">
              <div className="qw-panel-empty-icon"><Terminal className="w-6 h-6" /></div>
              <p className="qw-panel-empty-title">No output yet</p>
              <p className="qw-panel-empty-sub">Run code to see stdout / stderr here.</p>
            </div>
          )}
        </div>
      </div>

      <div className="qw-pkg-row border-t" style={{ borderColor: "rgba(255,255,255,.07)", background: "rgba(0,0,0,.25)" }}>
        <Package className="w-4 h-4" style={{ color: "#8b8798" }} />
        <Select value={pkgEco} onValueChange={(v) => setPkgEco(v as "python" | "node")}>
          <SelectTrigger className="qw-select h-7 w-20 text-xs" data-testid="select-pkg-eco">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="python">pip</SelectItem>
            <SelectItem value="node">npm</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={pkgName}
          onChange={(e) => setPkgName(e.target.value)}
          placeholder="package name"
          className="qw-input flex-1 h-7 text-xs"
          onKeyDown={(e) => e.key === "Enter" && installPackage()}
          data-testid="input-pkg-name"
        />
        <button
          type="button"
          onClick={installPackage}
          disabled={!pkgName.trim() || pkgInstalling || !runtimeSessionId}
          className="qw-pkg-btn"
          data-testid="button-install-pkg"
        >
          {pkgInstalling ? <Loader2 className="w-3 h-3 animate-spin" /> : "Install"}
        </button>
      </div>
    </motion.div>
  );

  const renderSettingsContent = () => (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 space-y-6 overflow-y-auto flex-1 qw-panel-body" data-testid="tab-content-settings">
      <div className="mb-1">
        <div className="qw-panel-kicker">Settings</div>
        <h2 className="text-base font-semibold text-foreground">Environment</h2>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          AI Configuration
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Provider</label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger className="h-8 bg-muted/50 border-border text-xs" data-testid="settings-select-provider">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Model</label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="h-8 bg-muted/50 border-border text-xs" data-testid="settings-select-model">
                <SelectValue placeholder={isLoadingModels ? "Loading..." : "Auto"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                {(selectedProvider ? getModelsForProvider(selectedProvider) : models).map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Temperature: {ksTemperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={ksTemperature}
              onChange={(e) => setKsTemperature(parseFloat(e.target.value))}
              className="w-full accent-orange-500"
              data-testid="settings-slider-temperature"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Max Tokens</label>
            <input
              type="number"
              value={ksMaxTokens}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (!isNaN(v) && v > 0) setKsMaxTokens(v);
              }}
              className="w-full h-8 bg-muted/50 border border-border rounded-md px-3 text-xs text-foreground"
              data-testid="settings-input-max-tokens"
            />
          </div>
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Bot className="w-3.5 h-3.5" />
          Custom Persona
        </h3>
        <Textarea
          value={ksPersona}
          onChange={(e) => setKsPersona(e.target.value)}
          placeholder="Give the AI a custom role or personality for this session..."
          className="min-h-[100px] bg-muted/50 border-border text-xs resize-none"
          data-testid="settings-textarea-persona"
        />
        <p className="text-[10px] text-muted-foreground mt-1.5">Prepended to the system prompt for all messages.</p>
      </div>
      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" />
          Current Config
        </h3>
        <div className="bg-muted/30 rounded-lg p-3 space-y-1.5 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Provider</span><span className="text-foreground">{selectedProvider || detectedProvider || "Auto"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Model</span><span className="text-foreground">{selectedModel || "Auto"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Temperature</span><span className="text-foreground">{ksTemperature.toFixed(1)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Max Tokens</span><span className="text-foreground">{ksMaxTokens.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="text-foreground capitalize">{editorMode}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Persona</span><span className="text-foreground">{ksPersona ? "Custom" : "Default"}</span></div>
        </div>
      </div>
    </motion.div>
  );

  const renderDeployTab = () => (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full qw-panel-body"
      data-testid="tab-content-deploy"
    >
      <div className="flex items-center gap-2 p-3 border-b" style={{ borderColor: "rgba(255,255,255,.07)", background: "rgba(0,0,0,.25)" }}>
        <Rocket className="w-4 h-4 text-sky-400" />
        <div className="min-w-0 flex-1">
          <div className="qw-panel-kicker">Manage</div>
          <span className="text-sm font-semibold text-foreground">Processes & deploy</span>
        </div>
        {runtimeSessionId && (
          <span className="text-[10px] text-muted-foreground font-mono" data-testid="text-session-id">
            {runtimeSessionId.slice(0, 8)}
          </span>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          <Button size="sm" variant="outline" className="w-full h-8 text-xs" disabled={runtimeSyncing || !runtimeSessionId} onClick={async () => {
            setRuntimeSyncing(true);
            const ok = await syncWorkspaceToRuntime();
            ok ? toast.success("Files synced to runtime") : toast.error("Sync failed");
            setRuntimeSyncing(false);
          }} data-testid="button-sync-runtime">
            {runtimeSyncing ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <RefreshCw className="w-3 h-3 mr-2" />}
            Sync Files to Runtime
          </Button>
          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-3">
              <FolderGit className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">Clone & Checkout</span>
            </div>
            <div className="space-y-2">
              <Input value={deployRepoUrl} onChange={(e) => setDeployRepoUrl(e.target.value)} placeholder="https://github.com/user/repo.git" className="h-8 text-xs bg-muted border-border" data-testid="input-deploy-repo-url" />
              <div className="flex gap-2">
                <Input value={deployTargetDir} onChange={(e) => setDeployTargetDir(e.target.value)} placeholder="target dir" className="flex-1 h-8 text-xs bg-muted border-border" data-testid="input-deploy-target-dir" />
                <Button size="sm" onClick={deployCloneRepo} disabled={deployCloning || !runtimeSessionId} className="h-8 text-xs bg-blue-600 hover:bg-blue-700" data-testid="button-deploy-clone">
                  {deployCloning ? <Loader2 className="w-3 h-3 animate-spin" /> : "Clone"}
                </Button>
              </div>
              <div className="flex gap-2">
                <Input value={deployRef} onChange={(e) => setDeployRef(e.target.value)} placeholder="branch/tag/commit" className="flex-1 h-8 text-xs bg-muted border-border" data-testid="input-deploy-ref" />
                <Button size="sm" variant="outline" onClick={deployCheckoutRef} disabled={deployCheckingOut || !runtimeSessionId} className="h-8 text-xs" data-testid="button-deploy-checkout">
                  {deployCheckingOut ? <Loader2 className="w-3 h-3 animate-spin" /> : <><GitBranch className="w-3 h-3 mr-1" />Checkout</>}
                </Button>
              </div>
            </div>
          </div>

          {/* Stack Detection — commented out for now
          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium">Stack Detection</span>
            </div>
            <div className="flex gap-2 items-center">
              <Input value={deployRepoDir} onChange={(e) => setDeployRepoDir(e.target.value)} placeholder="repo dir" className="flex-1 h-8 text-xs bg-muted border-border" data-testid="input-deploy-repo-dir" />
              <Button size="sm" variant="outline" onClick={deployDetectStack} disabled={deployDetecting || !runtimeSessionId} className="h-8 text-xs" data-testid="button-detect-stack">
                {deployDetecting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Detect"}
              </Button>
            </div>
            {deployStack && (
              <div className="flex gap-2 mt-2" data-testid="stack-badges">
                {deployStack.node && <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">Node.js</span>}
                {deployStack.python && <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">Python</span>}
                {deployStack.docker && <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">Docker</span>}
                {!deployStack.node && !deployStack.python && !deployStack.docker && <span className="text-xs text-muted-foreground">No stack detected</span>}
              </div>
            )}
          </div>
          */}

          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium">Dependencies</span>
              <span className="ml-auto px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] rounded-full border border-emerald-500/20">Sandboxed</span>
            </div>
            <div className="space-y-3">
              {(detectedDepFiles.node || detectedDepFiles.python.length > 0) && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] text-muted-foreground mr-1">Detected:</span>
                  {detectedDepFiles.node && <span className="px-2 py-0.5 bg-green-500/15 text-green-400 text-[10px] rounded-full">package.json</span>}
                  {detectedDepFiles.python.map(f => (
                    <span key={f} className="px-2 py-0.5 bg-blue-500/15 text-blue-400 text-[10px] rounded-full">{f}</span>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                {detectedDepFiles.node && (
                  <Button size="sm" onClick={() => deployInstallDeps("node")} disabled={deployInstallingNode || !runtimeSessionId} className="h-7 text-xs bg-green-600 hover:bg-green-700 w-full" data-testid="button-install-node-deps">
                    {deployInstallingNode ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Package className="w-3 h-3 mr-1" />}
                    npm install
                  </Button>
                )}
                {detectedDepFiles.python.length > 0 && (
                  <Button size="sm" onClick={() => deployInstallDeps("python")} disabled={deployInstallingPython || !runtimeSessionId} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 w-full" data-testid="button-install-python-deps">
                    {deployInstallingPython ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Package className="w-3 h-3 mr-1" />}
                    pip install
                  </Button>
                )}
                {!detectedDepFiles.node && detectedDepFiles.python.length === 0 && (
                  <span className="text-[10px] text-muted-foreground">No dependency files detected</span>
                )}
                <div className="flex items-center gap-1" title="Use lockfile versions exactly (npm ci / pip --no-deps)">
                  <Switch checked={deployFrozenLockfile} onCheckedChange={setDeployFrozenLockfile} className="scale-75" />
                  <span className="text-[10px] text-muted-foreground">Frozen lockfile</span>
                </div>
              </div>

              <div className="border-t border-border/50 pt-2 space-y-1.5">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Add Package</span>
                <div className="flex gap-1 items-center">
                  <Select value={singlePkgEco} onValueChange={(v) => setSinglePkgEco(v as "python" | "node")}>
                    <SelectTrigger className="h-7 w-20 text-xs bg-muted border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="python">pip</SelectItem>
                      <SelectItem value="node">npm</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={singlePkg}
                    onChange={(e) => setSinglePkg(e.target.value)}
                    placeholder={singlePkgEco === "python" ? "flask requests numpy" : "express lodash"}
                    className="flex-1 h-7 text-xs bg-muted border-border font-mono"
                    onKeyDown={(e) => e.key === "Enter" && installSinglePackage()}
                    data-testid="input-single-package"
                  />
                  <Button size="sm" onClick={installSinglePackage} disabled={singlePkgInstalling || !runtimeSessionId || !singlePkg.trim()} className="h-7 text-xs" data-testid="button-install-single-pkg">
                    {singlePkgInstalling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  </Button>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground">Node → local <code className="text-emerald-400/70">node_modules/</code> · Python → local <code className="text-blue-400/70">.venv/</code></p>
            </div>
            {deployDepsOutput && (
              <pre className="text-[10px] font-mono bg-black/30 rounded p-2 mt-2 max-h-32 overflow-auto text-muted-foreground" data-testid="deps-output">{deployDepsOutput.slice(-2000)}</pre>
            )}
          </div>

          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium">Environment Variables</span>
            </div>
            <div className="space-y-1">
              {envPairs.map((pair, i) => (
                <div key={i} className="flex gap-1 items-center">
                  <Input value={pair.key} onChange={(e) => { const next = [...envPairs]; next[i] = { ...pair, key: e.target.value }; setEnvPairs(next); }} placeholder="KEY" className="flex-1 h-7 text-xs bg-muted border-border font-mono" />
                  <Input value={pair.value} onChange={(e) => { const next = [...envPairs]; next[i] = { ...pair, value: e.target.value }; setEnvPairs(next); }} placeholder="value" className="flex-1 h-7 text-xs bg-muted border-border font-mono" />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEnvPairs(envPairs.filter((_, j) => j !== i))}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEnvPairs([...envPairs, { key: "", value: "" }])}>
                  <Plus className="w-3 h-3 mr-1" />Add
                </Button>
                <Button size="sm" onClick={deploySaveEnv} disabled={envSaving || !runtimeSessionId} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" data-testid="button-save-env">
                  {envSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                  Save .env
                </Button>
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-medium">Processes</span>
            </div>
            <div className="space-y-2">
              {Object.keys(detectedScripts).length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">npm scripts</span>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(detectedScripts).map(([name, cmd]) => (
                      <Button key={name} size="sm" variant="outline" className="h-6 text-[10px] font-mono px-2" title={String(cmd)} disabled={procStarting || !runtimeSessionId} onClick={() => { setProcName(name); setProcCommand(`npm run ${name}`); }} data-testid={`button-script-${name}`}>
                        <Play className="w-2.5 h-2.5 mr-1" />{name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-1">
                <Input value={procName} onChange={(e) => setProcName(e.target.value)} placeholder="web" className="w-20 h-7 text-xs bg-muted border-border" data-testid="input-proc-name" />
                <Input value={procCommand} onChange={(e) => setProcCommand(e.target.value)} placeholder="node server.js" className="flex-1 h-7 text-xs bg-muted border-border font-mono" data-testid="input-proc-command" />
                <Input value={procPort} onChange={(e) => setProcPort(e.target.value)} placeholder="3000" className="w-16 h-7 text-xs bg-muted border-border font-mono" data-testid="input-proc-port" />
                <Button size="sm" onClick={deployStartProcess} disabled={procStarting || !runtimeSessionId} className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700" data-testid="button-start-proc">
                  {procStarting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                </Button>
              </div>
              {runningProcs.length > 0 && (
                <div className="space-y-1">
                  {runningProcs.map(proc => (
                    <div key={proc.name}>
                      <div className="flex items-center gap-2 p-2 bg-black/20 rounded text-xs min-w-0">
                        <Activity className="w-3 h-3 text-emerald-400 animate-pulse flex-shrink-0" />
                        <span className="font-mono text-foreground truncate">{proc.name}</span>
                        <span className="text-muted-foreground flex-shrink-0">PID {proc.pid}</span>
                        {proc.port && <span className="text-muted-foreground flex-shrink-0">:{proc.port}</span>}
                        <div className="ml-auto flex gap-1 flex-shrink-0">
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => deployViewLogs(proc.name)} data-testid={`button-logs-${proc.name}`}>
                            <ScrollText className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-red-400 hover:text-red-300" onClick={() => deployStopProcess(proc.name)} data-testid={`button-stop-${proc.name}`}>
                            <Square className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {procLogsOpen === proc.name && procLogs[proc.name] && (
                        <pre className="text-[10px] font-mono bg-black/30 rounded p-2 mt-1 max-h-32 overflow-auto text-muted-foreground">{procLogs[proc.name]}</pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium">Health Checks</span>
            </div>
            <div className="space-y-2">
              <div className="flex gap-1">
                <Input value={healthPort} onChange={(e) => setHealthPort(e.target.value)} placeholder="port" className="w-20 h-7 text-xs bg-muted border-border" data-testid="input-health-port" />
                <Input value={healthHost} onChange={(e) => setHealthHost(e.target.value)} placeholder="host" className="flex-1 h-7 text-xs bg-muted border-border" />
                <Button size="sm" variant="outline" onClick={deployCheckPort} disabled={healthChecking || !runtimeSessionId} className="h-7 text-xs" data-testid="button-check-port">
                  Port Check
                </Button>
              </div>
              <div className="flex gap-1">
                <Input value={healthUrl} onChange={(e) => setHealthUrl(e.target.value)} placeholder="http://localhost:3000/health" className="flex-1 h-7 text-xs bg-muted border-border" data-testid="input-health-url" />
                <Button size="sm" variant="outline" onClick={deployHttpCheck} disabled={healthChecking || !runtimeSessionId} className="h-7 text-xs" data-testid="button-http-check">
                  HTTP Check
                </Button>
              </div>
              {healthResult && (
                <div className={`p-2 rounded text-xs ${healthResult.open || healthResult.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`} data-testid="health-result">
                  {healthResult.open !== undefined && <span>Port {healthResult.port}: {healthResult.open ? "OPEN" : "CLOSED"}</span>}
                  {healthResult.ok !== undefined && healthResult.status_code && <span>HTTP {healthResult.status_code} — {healthResult.ok ? "OK" : "FAIL"}</span>}
                  {healthResult.error && <span>Error: {healthResult.error}</span>}
                </div>
              )}
            </div>
          </div>

          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-3">
              <HardDrive className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium">Export Artifacts</span>
            </div>
            <div className="flex gap-2">
              <Input value={exportDir} onChange={(e) => setExportDir(e.target.value)} placeholder="source directory" className="flex-1 h-8 text-xs bg-muted border-border" data-testid="input-export-dir" />
              <Button size="sm" onClick={deployExport} disabled={exporting || !runtimeSessionId} className="h-8 text-xs" data-testid="button-export">
                {exporting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Download className="w-3 h-3 mr-1" />}
                Export
              </Button>
            </div>
            {exportResult && (
              <div className="text-xs text-muted-foreground mt-2" data-testid="export-result">
                Exported {exportResult.file_count} files to {exportResult.artifact_dir}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </motion.div>
  );

  const renderLedgerTab = () => {
    const filteredEntries = ledgerFilter === "all"
      ? ledgerEntries
      : ledgerEntries.filter(e => e.tool === ledgerFilter);
    const toolNames = [...new Set(ledgerEntries.map(e => e.tool))].sort();

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col h-full"
        data-testid="tab-content-ledger"
      >
        <div className="flex items-center gap-2 p-3 border-b" style={{ borderColor: "rgba(255,255,255,.07)", background: "rgba(0,0,0,.25)" }}>
          <ScrollText className="w-4 h-4" style={{ color: "#f5a524" }} />
          <div className="min-w-0 flex-1">
            <div className="qw-panel-kicker">Ledger</div>
            <span className="text-sm font-semibold text-foreground">Tool Ledger</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Select value={ledgerFilter} onValueChange={setLedgerFilter}>
              <SelectTrigger className="h-7 w-28 text-xs bg-muted border-border" data-testid="select-ledger-filter">
                <Filter className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tools</SelectItem>
                {toolNames.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Switch checked={ledgerAutoRefresh} onCheckedChange={setLedgerAutoRefresh} className="scale-75" />
              <span className="text-[10px] text-muted-foreground">Auto</span>
            </div>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={loadLedger} disabled={ledgerLoading} data-testid="button-refresh-ledger">
              <RefreshCw className={`w-3 h-3 ${ledgerLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{ledgerLoading ? "Loading..." : "No tool invocations yet"}</p>
                <p className="text-xs mt-1">Run a tool to see entries here</p>
              </div>
            ) : (
              [...filteredEntries].reverse().map((entry, i) => {
                const idx = filteredEntries.length - 1 - i;
                const isOpen = ledgerExpanded.has(idx);
                const colorClass = TOOL_COLORS[entry.tool] || "text-slate-400 bg-slate-500/10";
                return (
                  <div key={i} className="border border-white/5 rounded-lg overflow-hidden">
                    <button
                      onClick={() => {
                        const next = new Set(ledgerExpanded);
                        isOpen ? next.delete(idx) : next.add(idx);
                        setLedgerExpanded(next);
                      }}
                      className="w-full flex items-center gap-2 p-2 text-left hover:bg-muted/30 transition-colors"
                      data-testid={`ledger-entry-${i}`}
                    >
                      <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-[10px] text-muted-foreground w-14 flex-shrink-0">{relativeTime(entry.ts)}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${colorClass}`}>
                        {entry.tool}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono ml-auto">{entry.session_id.slice(0, 8)}</span>
                      {isOpen ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                    </button>
                    {isOpen && (
                      <div className="px-2 pb-2 space-y-1">
                        <div>
                          <span className="text-[10px] text-muted-foreground font-medium">Request:</span>
                          <pre className="text-[10px] font-mono bg-black/30 rounded p-2 mt-0.5 max-h-40 overflow-auto text-foreground/70">
                            {JSON.stringify(entry.request, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground font-medium">Result:</span>
                          <pre className="text-[10px] font-mono bg-black/30 rounded p-2 mt-0.5 max-h-40 overflow-auto text-foreground/70">
                            {JSON.stringify(entry.result, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </motion.div>
    );
  };

  const renderChatPanel = (compact: boolean = false) => (
    // Anchored to the nearest positioned ancestor. Every layout-critical
    // property is set INLINE so the column fills its box even if a utility
    // class is missing from the prebuilt stylesheet or a merge drops one:
    // the desktop tab chain collapsed exactly this way (missing minHeight).
    <div
      className="qw-chat-root absolute inset-0 flex flex-col overflow-hidden"
      style={{
        position: "absolute", top: 0, right: 0, bottom: 0, left: 0,
        display: "flex", flexDirection: "column", overflow: "hidden",
        minHeight: 0, height: "100%",
        background: "linear-gradient(180deg, rgba(18,212,138,.04), transparent 140px)",
      }}
    >
      <div className="qw-chat-status" data-testid="chat-status-bar">
        <div className="left">
          <span className="label">KeyStone Agent</span>
          <span className="dot-s" style={{ background: runtimeSessionId ? "#12d48a" : "#6b7280", boxShadow: runtimeSessionId ? "0 0 8px #12d48a" : "none" }} title={runtimeSessionId ? "Runtime connected" : "Runtime offline"} />
        </div>
        <div className="meta">
          <span data-testid="status-mode">{editorMode === "focus" ? "FOCUS" : "KEYSTONE"}</span>
          {editorMode === "keystone" && (
            <span style={{ color: readOnlyMode ? "#f5a524" : "#12d48a" }}>{readOnlyMode ? "READ" : "R/W"}</span>
          )}
          <span data-testid="status-msg-count">{messages.length} MSG</span>
        </div>
      </div>
      <div
        ref={chatContainerRef}
        onScroll={handleChatScroll}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
        style={{ flex: "1 1 0%", minHeight: 0, overflowY: "auto", overflowX: "hidden" }}
      >
        <div className={`qw-chat-list ${compact ? "compact" : ""} min-w-0 max-w-full overflow-hidden`}>
          {messages.length === 0 ? (
            <div className="py-6 px-4 min-h-[240px] flex items-start justify-center" data-testid="chat-empty-state">
              <div className="qw-chat-empty w-full">
                <div className="qw-chat-empty-head">
                  <Bot className="w-4 h-4" style={{ color: "#12d48a" }} />
                  <span>KeyStone Agent</span>
                </div>
                <div className="qw-chat-empty-body">
                  <p>Reads your files. Writes code. Applies edits in place — with ownership at every layer.</p>
                  <p className="qw-hint">Select a command or type below</p>
                  <div className="mt-1">
                    {[
                      { k: "F1", label: "Explain this codebase", fill: "Explain this codebase" },
                      { k: "F2", label: "Fix a bug", fill: "Fix a bug: " },
                      { k: "F3", label: "Build a feature", fill: "Build a feature: " },
                    ].map((c) => (
                      <button
                        key={c.k}
                        onClick={() => { if (textareaRef.current) { textareaRef.current.value = c.fill; textareaRef.current.focus(); } }}
                        className="qw-cmd-btn"
                        data-testid={`key-${c.k.toLowerCase()}`}
                      >
                        <span className="qw-k">{c.k}</span>
                        <span className="qw-l">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="qw-msg w-full min-w-0 max-w-full overflow-hidden"
                  data-testid={`message-${msg.id}`}
                  data-role={msg.role}
                >
                  <div className={`qw-avatar ${isUser ? "user" : "ai"} flex-shrink-0`}>
                    {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <div
                    className={`qw-bubble ${isUser ? "user" : ""} min-w-0 overflow-hidden break-words text-foreground`}
                    style={{
                      flex: "1 1 0%", maxWidth: compact ? "350px" : "500px", overflowWrap: "anywhere",
                    }}
                  >
                    <div className="who">{isUser ? "You" : "KeyStone"}</div>
                    {isUser ? (
                      <p className="text-sm break-words" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "anywhere" }}>{msg.content}</p>
                    ) : (() => {
                      const isStreaming = (isSendingMessage || gexRunning) && msg.id === messages[messages.length - 1]?.id;
                      const parsedBlocks = parseContentForDisplay(msg.content);
                      const streamingBlock = isStreaming ? detectStreamingBlock(msg.content) : null;
                      const tokens = approxTokens(msg.content);
                      return (
                      <div className="space-y-2 min-w-0 max-w-full overflow-hidden">
                        {isStreaming && msg.content.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-3 mb-2 pb-2 border-b border-white/5"
                          >
                            <div className="flex items-center gap-1.5 text-[10px] text-cyan-400/70">
                              <Zap className="w-3 h-3 text-cyan-400 animate-pulse" />
                              <span className="font-medium">~{tokens} tokens</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                              <span>{msg.toolActive ? "Using tools..." : "Streaming..."}</span>
                            </div>
                            {msg.toolActive && (
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <Search className="w-3 h-3 text-amber-400 animate-pulse" />
                                <span className="text-amber-400/80 font-medium">Searching codebase</span>
                              </div>
                            )}
                          </motion.div>
                        )}
                        {((msg.filesWritten && msg.filesWritten.length > 0) || (msg.filesEdited && msg.filesEdited.length > 0)) && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {msg.filesWritten?.map((file, i) => (
                              <span key={`w-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-900/30 text-green-400 text-xs rounded border border-green-700/50 cursor-pointer hover:bg-green-900/50" onClick={() => { loadFile(file); if (isMobile) setMobileTab("code"); }}>
                                <Plus className="w-3 h-3" />{file}
                              </span>
                            ))}
                            {msg.filesEdited?.map((file, i) => (
                              <span key={`e-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-900/30 text-blue-400 text-xs rounded border border-blue-700/50 cursor-pointer hover:bg-blue-900/50" onClick={() => { loadFile(file); if (isMobile) setMobileTab("code"); }}>
                                <Edit2 className="w-3 h-3" />{file}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="space-y-2 min-w-0 max-w-full overflow-hidden">
                          {parsedBlocks.map((block, bi) => {
                            const blockKey = `${msg.id}-${bi}`;
                            const isDismissed = dismissedBlocks.has(blockKey);
                            if (block.type === "text") {
                              let displayText = block.content;
                              if (isStreaming) {
                                displayText = displayText.replace(/<<<(FILE|EDIT|CREATE)\s+[^>]*>>>[\s\S]*$/g, "").trim();
                                displayText = displayText.replace(/<<<(FILE|EDIT|CREATE)[^>]*$/g, "").trim();
                                displayText = displayText.replace(/<<<[^>]*$/g, "").trim();
                              }
                              if (!displayText) return null;
                              return (
                                <div key={bi} className="prose prose-invert prose-sm max-w-full text-sm break-words overflow-x-hidden [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-all [&_p]:break-words prose-p:my-1 prose-headings:my-2 prose-a:text-cyan-400 prose-code:text-cyan-300 prose-code:bg-white/10 prose-code:px-1 prose-code:rounded">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{displayText}</ReactMarkdown>
                                </div>
                              );
                            }
                            if (block.type === "file") {
                              const isRejected = rejectedBlocks.has(blockKey);
                              if (isRejected) {
                                return (
                                  <div key={bi} className="my-1 flex items-center gap-2 px-3 py-1 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                                    <RotateCcw className="w-3 h-3" />
                                    <span className="font-mono">{block.filename}</span>
                                    <span>reverted</span>
                                  </div>
                                );
                              }
                              if (isDismissed) {
                                return (
                                  <div key={bi} className="my-1 flex items-center gap-2 px-3 py-1 rounded bg-white/5 text-xs text-gray-500">
                                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                                    <span className="font-mono">{block.filename}</span>
                                    <span>applied</span>
                                  </div>
                                );
                              }
                              const snapshotContent = block.filename ? (chatSnapshots[block.filename] ?? gexSnapshots[block.filename]) : undefined;
                              const hasDiff = snapshotContent !== undefined && snapshotContent !== block.content;
                              const diffExpanded = !collapsedDiffs.has(blockKey);
                              return (
                                <div key={bi} className="my-2 rounded-lg overflow-hidden border border-green-500/30">
                                  <div className="px-3 py-1.5 bg-green-950/30 border-b border-green-500/20 space-y-1.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileCode className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                                      <span className="text-xs text-green-300 font-mono truncate">{block.filename}</span>
                                      <span className="text-[10px] text-green-500/60 flex-shrink-0">auto-written</span>
                                    </div>
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {hasDiff && (
                                        <button onClick={() => toggleDiff(blockKey)} className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-colors ${diffExpanded ? "bg-yellow-500/30 text-yellow-300" : "bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25"}`} data-testid={`button-diff-toggle-${bi}`}>
                                          <GitBranch className="w-3 h-3" />Diff
                                        </button>
                                      )}
                                      <button onClick={() => { if (block.filename) loadFile(block.filename); if (isMobile) setMobileTab("code"); }} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded transition-colors" data-testid={`button-open-file-${bi}`}>
                                        <Eye className="w-3 h-3" />Open
                                      </button>
                                      <button onClick={() => dismissBlock(blockKey)} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded transition-colors" data-testid={`button-dismiss-${bi}`} title="Dismiss (keep changes)">
                                        <CheckCircle2 className="w-3 h-3" />Keep
                                      </button>
                                      <button onClick={() => { if (block.filename) rejectBlock(blockKey, block.filename, block.content); }} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors" data-testid={`button-reject-${bi}`} title="Revert to original">
                                        <RotateCcw className="w-3 h-3" />Revert
                                      </button>
                                    </div>
                                  </div>
                                  {diffExpanded && hasDiff ? (
                                    <div className="max-h-64 overflow-auto text-xs font-mono">
                                      {computeDiff(snapshotContent || "", block.content || "").map((dl, di) => (
                                        <div key={di} className={`px-3 py-0 leading-5 ${dl.type === "add" ? "bg-green-500/15 text-green-300" : dl.type === "del" ? "bg-red-500/15 text-red-300" : "text-gray-500"}`}>
                                          {dl.text || " "}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="max-h-48 overflow-auto">
                                      <SyntaxHighlighter language={block.language || "text"} style={oneDark} customStyle={{ margin: 0, padding: "0.75rem", fontSize: "0.75rem", background: "rgba(0,0,0,0.3)", borderRadius: 0 }} wrapLongLines>
                                        {block.content}
                                      </SyntaxHighlighter>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            if (block.type === "edit" && block.editOps) {
                              const isRejected = rejectedBlocks.has(blockKey);
                              if (isRejected) {
                                return (
                                  <div key={bi} className="my-1 flex items-center gap-2 px-3 py-1 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                                    <RotateCcw className="w-3 h-3" />
                                    <span className="font-mono">{block.filename}</span>
                                    <span>reverted</span>
                                  </div>
                                );
                              }
                              if (isDismissed) {
                                return (
                                  <div key={bi} className="my-1 flex items-center gap-2 px-3 py-1 rounded bg-white/5 text-xs text-gray-500">
                                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                                    <span className="font-mono">{block.filename}</span>
                                    <span>patched</span>
                                  </div>
                                );
                              }
                              return (
                                <div key={bi} className="my-2 p-3 rounded-lg border bg-green-500/10 border-green-500/30">
                                  <div className="mb-2 space-y-1.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileEdit className="w-4 h-4 text-green-400 flex-shrink-0" />
                                      <span className="text-sm font-medium text-green-400 truncate">Applied to {block.filename}</span>
                                      <span className="text-xs text-gray-500 flex-shrink-0">({block.editOps.length} op{block.editOps.length > 1 ? "s" : ""})</span>
                                    </div>
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <button onClick={() => dismissBlock(blockKey)} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded transition-colors" data-testid={`button-dismiss-edit-${bi}`} title="Dismiss (keep changes)">
                                        <CheckCircle2 className="w-3 h-3" />Keep All
                                      </button>
                                      <button onClick={() => { if (block.filename && block.editOps) rejectAllEditOps(blockKey, block.filename, block.editOps); }} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors" data-testid={`button-reject-edit-${bi}`} title="Revert all ops">
                                        <RotateCcw className="w-3 h-3" />Revert All
                                      </button>
                                    </div>
                                  </div>
                                  <div className="space-y-2 text-xs">
                                    {(() => {
                                      const opSnapshot = block.filename ? (chatSnapshots[block.filename] ?? gexSnapshots[block.filename]) : undefined;
                                      const snapshotLines = opSnapshot ? opSnapshot.split("\n") : [];
                                      return block.editOps.map((op, oi) => {
                                        const opKey = `${blockKey}-op-${oi}`;
                                        const opReverted = rejectedBlocks.has(opKey);
                                        const opDiffOpen = !collapsedDiffs.has(opKey);
                                        const action = op.action.toUpperCase();
                                        const lr = action !== "INSERT" ? parseLineRange(op.range) : null;
                                        const insertLine = action === "INSERT" ? parseInsertLine(op.range) : null;
                                        const originalLines = lr ? snapshotLines.slice(lr.start - 1, lr.end) : [];
                                        const newOpLines = op.code ? op.code.split("\n") : [];
                                        const hasDiffData = opSnapshot !== undefined && (action === "REPLACE" ? originalLines.length > 0 || newOpLines.length > 0 : action === "DELETE" ? originalLines.length > 0 : action === "INSERT" ? newOpLines.length > 0 : false);
                                        return (
                                          <div key={oi} className={`border rounded-lg overflow-hidden ${opReverted ? "border-red-500/30 opacity-60" : "border-white/10"}`}>
                                            <div className="flex items-center justify-between px-2 py-1 bg-white/5">
                                              <div className="flex items-center gap-2">
                                                <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${opReverted ? "bg-red-500/20 text-red-400 line-through" : action === "INSERT" ? "bg-green-500/20 text-green-400" : action === "DELETE" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"}`}>
                                                  {opReverted ? "REVERTED" : op.action}
                                                </span>
                                                {op.range && <span className="text-gray-500 font-mono">{op.range}</span>}
                                              </div>
                                              <div className="flex items-center gap-1">
                                                {hasDiffData && !opReverted && (
                                                  <button
                                                    onClick={() => toggleDiff(opKey)}
                                                    className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded transition-colors ${opDiffOpen ? "bg-yellow-500/30 text-yellow-300" : "bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25"}`}
                                                    data-testid={`button-diff-op-${bi}-${oi}`}
                                                  >
                                                    <GitBranch className="w-2.5 h-2.5" />Diff
                                                  </button>
                                                )}
                                                {!opReverted && (
                                                  <button
                                                    onClick={() => { if (block.filename) revertSingleOp(opKey, block.filename, op); }}
                                                    className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-red-500/15 text-red-400 hover:bg-red-500/25 rounded transition-colors"
                                                    data-testid={`button-reject-op-${bi}-${oi}`}
                                                    title={`Revert this ${op.action}`}
                                                  >
                                                    <RotateCcw className="w-2.5 h-2.5" />Revert
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                            {!opReverted && opDiffOpen && hasDiffData ? (
                                              <div className="max-h-40 overflow-auto font-mono text-[11px] leading-5">
                                                {action === "REPLACE" && computeDiff(originalLines.join("\n"), newOpLines.join("\n")).map((dl, di) => (
                                                  <div key={di} className={`px-2 ${dl.type === "add" ? "bg-green-500/15 text-green-300" : dl.type === "del" ? "bg-red-500/15 text-red-300" : "text-gray-500"}`}>{dl.text || " "}</div>
                                                ))}
                                                {action === "DELETE" && originalLines.map((l, li) => (
                                                  <div key={`d-${li}`} className="px-2 bg-red-500/15 text-red-300">-{l}</div>
                                                ))}
                                                {action === "INSERT" && newOpLines.map((l, li) => (
                                                  <div key={`a-${li}`} className="px-2 bg-green-500/15 text-green-300">+{l}</div>
                                                ))}
                                              </div>
                                            ) : op.code && !opReverted ? (
                                              <div className="max-h-32 overflow-auto">
                                                <SyntaxHighlighter language={getLanguageFromFilename(block.filename || "")} style={oneDark} customStyle={{ margin: 0, padding: "0.5rem", fontSize: "0.7rem", background: "rgba(0,0,0,0.3)", borderRadius: 0 }} wrapLongLines>
                                                  {op.code}
                                                </SyntaxHighlighter>
                                              </div>
                                            ) : null}
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })}
                          {isStreaming && streamingBlock && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="my-2 rounded-lg overflow-hidden border border-cyan-500/30"
                            >
                              <div className="flex items-center justify-between px-3 py-1.5 bg-cyan-950/30 border-b border-cyan-500/20">
                                <div className="flex items-center gap-2">
                                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                                  <span className="text-xs text-cyan-300 font-mono font-medium">{streamingBlock.filename}</span>
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-cyan-500/15 rounded text-[10px] text-cyan-400">
                                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                    streaming
                                  </span>
                                </div>
                                <span className="text-[10px] text-white/30 font-mono">{getLanguageFromFilename(streamingBlock.filename)}</span>
                              </div>
                              {streamingBlock.streamingCode ? (
                                <div className="max-h-64 overflow-auto">
                                  <SyntaxHighlighter language={getLanguageFromFilename(streamingBlock.filename)} style={oneDark} customStyle={{ margin: 0, padding: "0.75rem", fontSize: "0.75rem", background: "rgba(0,0,0,0.3)", borderRadius: 0 }} wrapLongLines>
                                    {streamingBlock.streamingCode}
                                  </SyntaxHighlighter>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 px-3 py-3">
                                  <span className="text-[10px] text-white/30">Writing code...</span>
                                  <div className="flex gap-0.5">
                                    <span className="w-1 h-1 bg-cyan-400/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <span className="w-1 h-1 bg-cyan-400/50 rounded-full animate-bounce" style={{ animationDelay: "100ms" }} />
                                    <span className="w-1 h-1 bg-cyan-400/50 rounded-full animate-bounce" style={{ animationDelay: "200ms" }} />
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </div>
                      </div>
                      );
                    })()}
                  </div>
                </motion.div>
              );
            })
          )}
          {isSendingMessage && messages[messages.length - 1]?.content === "" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="w-7 h-7 rounded-sm flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, rgba(18,212,138,.25), rgba(245,165,36,.18))", border: "1px solid rgba(18,212,138,.3)", borderRadius: 8 }}>
                <Bot className="w-3.5 h-3.5" style={{ color: "#12d48a" }} />
              </div>
              <div className="px-3 py-2.5" style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12 }}>
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#12d48a" }} />
                  <span className="text-xs text-muted-foreground" style={{ letterSpacing: "0.04em", fontWeight: 600 }}>Thinking…</span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {!shouldAutoScroll && messages.length > 3 && (
        <div className="absolute bottom-28 right-6 z-10">
          <Button
            size="sm"
            variant="outline"
            className="rounded-sm h-7 w-7 p-0 shadow-lg"
            style={{ background: "rgba(0,0,0,.7)", border: "1px solid rgba(18,212,138,.45)", color: "#12d48a" }}
            onClick={scrollToBottom}
            data-testid="button-scroll-to-bottom"
          >
            <ArrowDown className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className={`qw-composer ${compact ? "compact" : ""}`} style={{ flexShrink: 0 }}>
        <div className="qw-composer-box space-y-2">
        {chatError && (
          <div className="flex items-center gap-2 p-2 bg-red-900/30 border border-red-700 rounded text-red-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1 truncate">{chatError}</span>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-red-400" onClick={() => setChatError(null)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
        <div className="qw-mode-row">
          <div className="qw-seg">
            <button
              onClick={() => setEditorMode("keystone")}
              type="button"
              className={editorMode === "keystone" ? "active" : ""}
              title="KeyStone Mode: Full code editor"
              data-testid="button-mode-keystone"
            >
              <Code2 className="w-3 h-3 inline mr-1" />KeyStone
            </button>
            <button
              onClick={() => setEditorMode("focus")}
              type="button"
              className={editorMode === "focus" ? "active focus" : ""}
              title="Focus Mode: Documentation & research only"
              data-testid="button-mode-focus"
            >
              <FileText className="w-3 h-3 inline mr-1" />Focus
            </button>
          </div>
          {editorMode === "keystone" && (
            <button
              onClick={() => setReadOnlyMode(!readOnlyMode)}
              type="button"
              className={`qw-rw-btn ${readOnlyMode ? "ro" : ""}`}
              title={readOnlyMode ? "Read-Only: AI explains code without making changes" : "Read & Write: AI can create and edit files"}
              data-testid="button-toggle-read-write"
            >
              {readOnlyMode ? <Eye className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
              <span>{readOnlyMode ? "Read only" : "Read & write"}</span>
            </button>
          )}
        </div>
        <div className="qw-provider-row">
          <Sparkles className="w-3 h-3" style={{ color: "#f5a524" }} />
          {providers.length > 1 && (
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger className="qw-select h-7 w-24 text-xs" data-testid="select-provider">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {providers.length <= 1 && (
            <span className="qw-provider-pill">
              <span className="spark" style={{ color: "#f5a524" }}>◆</span>
              {providers[0]?.name || (detectedProvider ? detectedProvider.charAt(0).toUpperCase() + detectedProvider.slice(1) : "AI")}
            </span>
          )}
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="qw-select flex-1 h-7 text-xs" data-testid="select-model">
              <SelectValue placeholder={isLoadingModels ? "Loading..." : "Auto"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              {(selectedProvider ? getModelsForProvider(selectedProvider) : models).map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {providers.length === 0 && !isLoadingModels && (
            <Link href="/dashboard">
              <button className="qw-tool-btn amber">
                <Settings className="w-3 h-3 mr-1" />
                Add Key
              </button>
            </Link>
          )}
          <button
            type="button"
            onClick={resetContext}
            disabled={isResettingContext || messages.length === 0}
            className="qw-tool-btn"
            data-testid="button-reset-context"
            title="Refresh LLM context (keeps chat history visible)"
          >
            {isResettingContext ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </button>
        </div>
        <div className="qw-ta-row">
          <Textarea
            ref={textareaRef}
            defaultValue=""
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isMobile) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={hasPendingReview ? "Review pending changes first…" : editorMode === "focus" ? "Ask about docs, specs, architecture…" : readOnlyMode ? "Ask about code, architecture, how to run…" : "Instruct the agent… files, tools, and runtime stay in scope."}
            className={`qw-ta ${hasPendingReview ? "opacity-50" : ""}`}
            disabled={hasPendingReview}
            data-testid="input-chat-message"
          />
          {isSendingMessage ? (
            <button
              onClick={stopStream}
              className="qw-send err"
              title="Stop generating"
              data-testid="button-stop-stream"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={hasPendingReview}
              className={`qw-send ${hasPendingReview ? "disabled" : ""}`}
              title={hasPendingReview ? "Review pending changes before sending" : undefined}
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    const pendingPatchCount = gexModifiedFiles.filter(f => !gexPatchAccepted.has(f)).length;
    return (
      <div className="qw-shell flex flex-col h-full min-h-0">
        <header className="qw-brandbar glass-header flex-shrink-0 relative overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 relative z-10 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Link href="/keystone" className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-white/5 rounded-lg" data-testid="link-back-portal-mobile">
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="qw-mark qw-mark-sm" aria-hidden="true"><span>K</span></div>
              <div className="min-w-0">
                <div className="qw-kicker !text-[9px]">KeyStone</div>
                <h1 className="text-sm ace-text-shimmer qw-env-title truncate">{environment.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {runtimeSessionId && (
                <span className="qw-chip !h-6 !text-[9px] !px-2" data-testid="badge-session-mobile">
                  <span className="qw-dot" />
                  {runtimeSessionId.slice(0, 6)}
                </span>
              )}
              <Button variant="outline" size="sm" className={`h-8 px-2.5 gap-1.5 text-xs border transition-colors ${showMobileMore ? "border-[var(--qw-emerald)]/50 text-[var(--qw-emerald)] bg-[var(--qw-emerald-dim)]" : "border-[var(--qw-line-strong)] text-muted-foreground hover:bg-white/5"}`} onClick={() => setShowMobileMore(!showMobileMore)} data-testid="button-mobile-more">
                {showMobileMore ? <ChevronUp className="w-4 h-4" /> : <MoreHorizontal className="w-4 h-4" />}
                More
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--qw-emerald)] animate-pulse" />
              </Button>
            </div>
          </div>
          {showMobileMore && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-border px-3 py-2 flex gap-2 flex-wrap relative z-10">
              {isEnterprise && (
                <Button size="sm" variant="outline" className={`h-8 text-xs gap-1.5 transition-all active:scale-95 ${mobileDrawer === "deploy" ? "border-blue-500/50 text-blue-400 bg-blue-500/10" : "hover:bg-muted/60"}`} onClick={() => { setMobileDrawer("deploy"); setShowMobileMore(false); }}>
                  <Rocket className="w-3.5 h-3.5" />Manage
                </Button>
              )}
              {isEnterprise && (
                <Button size="sm" variant="outline" className={`h-8 text-xs gap-1.5 transition-all active:scale-95 ${mobileDrawer === "ledger" ? "border-amber-500/50 text-amber-400 bg-amber-500/10" : "hover:bg-muted/60"}`} onClick={() => { setMobileDrawer("ledger"); setShowMobileMore(false); }}>
                  <ScrollText className="w-3.5 h-3.5" />Ledger
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 transition-all active:scale-95 hover:bg-muted/60" onClick={() => { window.open(`/api/keystone/environments/${envId}/files/download-all`, "_blank"); setShowMobileMore(false); }} data-testid="button-download-all-mobile">
                <FolderArchive className="w-3.5 h-3.5" />Export ZIP
              </Button>
              <Button size="sm" variant="outline" className={`h-8 text-xs gap-1.5 transition-all active:scale-95 ${mobileDrawer === "artifacts" ? "border-violet-500/50 text-violet-400 bg-violet-500/10" : "hover:bg-muted/60"}`} onClick={() => { setMobileDrawer("artifacts"); setShowMobileMore(false); }} data-testid="button-artifacts-mobile">
                <Package className="w-3.5 h-3.5" />Artifacts
                {ksArtifacts.length > 0 && <span className="ml-1 bg-violet-500/20 text-violet-300 text-[10px] px-1 rounded-full">{ksArtifacts.length}</span>}
              </Button>
              <Button size="sm" variant="outline" className={`h-8 text-xs gap-1.5 transition-all active:scale-95 ${mobileDrawer === "settings" ? "border-orange-500/50 text-orange-400 bg-orange-500/10" : "hover:bg-muted/60"}`} onClick={() => { setMobileDrawer("settings"); setShowMobileMore(false); }} data-testid="button-settings-mobile">
                <Settings className="w-3.5 h-3.5" />Settings
              </Button>
            </motion.div>
          )}
        </header>

        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {mobileTab === "files" && (
              <motion.div key="files" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <div className="h-full flex flex-col bg-background/50">
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Files</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setShowFileSearch(!showFileSearch)} data-testid="button-search-files-mobile">
                        <Search className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setGithubCloneOpen(true)} data-testid="button-clone-github-mobile">
                        <Github className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={loadFileTree} data-testid="button-refresh-files-mobile">
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {showFileSearch && (
                    <div className="p-2 border-b border-border">
                      <div className="flex gap-1">
                        <Input value={fileSearchQuery} onChange={(e) => setFileSearchQuery(e.target.value)} placeholder="Search in files..." className="flex-1 h-7 text-xs bg-muted border-border" onKeyDown={(e) => e.key === "Enter" && searchInFiles()} data-testid="input-file-search" />
                        <Button size="sm" variant="outline" onClick={searchInFiles} disabled={fileSearching || !runtimeSessionId} className="h-7 text-xs">
                          {fileSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                        </Button>
                      </div>
                      {fileSearchResults.length > 0 && (
                        <div className="mt-2 max-h-48 overflow-auto space-y-0.5">
                          {fileSearchResults.map((hit, i) => (
                            <button key={i} onClick={() => loadFile(hit.file)} className="w-full text-left px-2 py-1 text-xs hover:bg-muted/50 rounded" data-testid={`search-hit-${i}`}>
                              <span className="text-indigo-400 font-mono">{hit.file}</span>
                              <span className="text-muted-foreground">:{hit.line}</span>
                              <div className="text-muted-foreground truncate">{hit.content}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <ScrollArea className="flex-1">
                    <div className="p-2">
                      {fileTree ? fileTree.children?.map(child => renderFileTree(child, 0)) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">No files yet</div>
                      )}
                    </div>
                  </ScrollArea>
                  <div className="qw-gex-dock">
                    <div className="qw-gex-label">_Gex · surgical debug</div>
                    <button
                      onClick={() => runGex(selectedFile || undefined)}
                      disabled={gexRunning || isSendingMessage || hasPendingReview}
                      className={`qw-gex-btn ${
                        gexRunning ? "qw-gex-running" : hasPendingReview ? "qw-gex-blocked" : ""
                      }`}
                      data-testid="button-gex-debug-mobile"
                    >
                      {gexRunning
                        ? <><Loader2 className="w-4 h-4 animate-spin" />Scanning...</>
                        : <><ScanSearch className="w-4 h-4" />Debug w/ _Gex</>
                      }
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
            {mobileTab === "code" && (
              <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <div className="h-full flex flex-col bg-background">
                  {selectedFile ? (
                    <>
                      <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-background/50">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {getFileIcon(selectedFile)}
                          <span className="text-sm text-foreground/80 truncate">{selectedFile}</span>
                          {hasUnsavedChanges && <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />}
                          {gexModifiedFiles.includes(selectedFile) && !gexPatchAccepted.has(selectedFile) && <FileWarning className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button variant="ghost" size="sm" onClick={saveFile} disabled={!hasUnsavedChanges || isSavingFile} className="text-muted-foreground h-8 px-2" data-testid="button-save-file-mobile">
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => closeTab(selectedFile)} data-testid="button-close-file-mobile">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {gexModifiedFiles.includes(selectedFile) && !gexPatchAccepted.has(selectedFile) && gexSnapshots[selectedFile] !== undefined && (
                        <div className="flex items-center justify-between px-3 py-1.5 bg-red-950/30 border-b border-red-800/30 text-xs">
                          <span className="text-red-300 flex items-center gap-1">
                            <ScanSearch className="w-3 h-3" />_Gex patched
                          </span>
                          <div className="flex gap-2">
                            <button onClick={() => acceptGexFile(selectedFile)} className="text-green-400 hover:text-green-300 font-medium flex items-center gap-1" data-testid="button-mobile-accept">
                              <CheckCircle2 className="w-3 h-3" />Keep
                            </button>
                            <button onClick={() => revertGexFile(selectedFile)} className="text-red-400 hover:text-red-300 font-medium flex items-center gap-1" data-testid="button-mobile-revert">
                              <RotateCcw className="w-3 h-3" />Revert
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="flex-1 overflow-hidden relative">
                        {isLoadingFile ? (
                          <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
                          </div>
                        ) : (
                          <Editor height="100%" language={getLanguageFromPath(selectedFile)} defaultValue={fileContent} onChange={(v) => setFileContentDebounced(v || "")} theme="vs-dark" options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: "on", scrollBeyondLastLine: false, wordWrap: "on", automaticLayout: true, padding: { top: 8, bottom: 8 } }} key={`mobile-editor-${selectedFile}`} onMount={(editor) => { editorRef.current = editor; }} />
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center p-4">
                        <Code2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Select a file to edit</p>
                        <Button variant="ghost" size="sm" className="mt-3 text-indigo-400" onClick={() => setMobileTab("files")}>
                          <Folder className="w-4 h-4 mr-2" />Browse Files
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            {isEnterprise && mobileTab === "terminal" && (
              <motion.div key="terminal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                {renderTerminalTab()}
              </motion.div>
            )}
            {mobileTab === "chat" && (
              <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full relative">
                {renderChatPanel(true)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="border-t border-[var(--qw-line)] bg-[var(--qw-ink)]/90 backdrop-blur-sm flex-shrink-0" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div className="flex">
            {[
              { key: "files" as const, icon: Folder, label: "Files" },
              { key: "code" as const, icon: Code2, label: "Code", badge: hasUnsavedChanges },
              ...(isEnterprise ? [{ key: "terminal" as const, icon: Terminal, label: "Terminal" }] : []),
              { key: "chat" as const, icon: MessageSquare, label: "Chat" },
            ].map(({ key, icon: Icon, label, badge }) => (
              <button
                key={key}
                onClick={() => { setMobileTab(key); if (key === "chat") setActiveTab("chat"); }}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors relative ${
                  mobileTab === key ? "qw-mobile-nav-active text-[var(--qw-emerald)]" : "text-muted-foreground"
                }`}
                data-testid={`tab-${key}-mobile`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{label}</span>
                {badge && <span className="absolute top-2 right-1/4 w-2 h-2 rounded-full bg-amber-400" />}
              </button>
            ))}
          </div>
        </nav>

        <Dialog open={githubCloneOpen} onOpenChange={setGithubCloneOpen}>
          <DialogContent className="bg-background border-border">
            <DialogHeader>
              <DialogTitle>Clone GitHub Repository</DialogTitle>
              <DialogDescription className="text-muted-foreground">Clone a public GitHub repository into this environment.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Repository URL</Label>
                <Input placeholder="https://github.com/owner/repo" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} className="bg-muted border-border" data-testid="input-github-url-mobile" />
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Input placeholder="main" value={githubBranch} onChange={(e) => setGithubBranch(e.target.value)} className="bg-muted border-border" data-testid="input-github-branch-mobile" />
              </div>
              <Button onClick={cloneGithubRepo} disabled={!githubUrl.trim() || isCloningRepo} className="w-full" data-testid="button-clone-submit-mobile">
                {isCloningRepo ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cloning...</> : <><Github className="w-4 h-4 mr-2" />Clone Repository</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Drawer open={mobileDrawer === "deploy"} onOpenChange={(open) => { if (!open) setMobileDrawer(null); }}>
          <DrawerContent className="max-h-[85dvh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="flex items-center gap-2 text-blue-400"><Rocket className="w-4 h-4" />Manage</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto flex-1 px-1 pb-6" style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}>
              {renderDeployTab()}
            </div>
          </DrawerContent>
        </Drawer>

        <Drawer open={mobileDrawer === "ledger"} onOpenChange={(open) => { if (!open) setMobileDrawer(null); }}>
          <DrawerContent className="max-h-[85dvh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="flex items-center gap-2 text-amber-400"><ScrollText className="w-4 h-4" />Ledger</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto flex-1 px-1 pb-6" style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}>
              {renderLedgerTab()}
            </div>
          </DrawerContent>
        </Drawer>

        <Drawer open={mobileDrawer === "artifacts"} onOpenChange={(open) => { if (!open) setMobileDrawer(null); }}>
          <DrawerContent className="max-h-[85dvh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="flex items-center gap-2 text-violet-400"><Package className="w-4 h-4" />Artifacts</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto flex-1 p-4 space-y-3" style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}>
              <div className="flex items-center justify-end">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={loadKsArtifacts}><RefreshCw className="w-3.5 h-3.5" /></Button>
              </div>
              {ksArtifactsLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>
              ) : ksArtifacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Package className="w-7 h-7 mx-auto mb-2 opacity-50" />
                  <p>No artifacts yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {ksArtifacts.map((a) => (
                    <div key={a.id} className="bg-muted/30 border border-border rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{a.name}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{a.target_stack || "text"}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-violet-400" onClick={() => importArtifactToEnv(a)} disabled={ksImporting === a.id}>
                          {ksImporting === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Download className="w-3 h-3 mr-1" />Import</>}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DrawerContent>
        </Drawer>

        <Drawer open={mobileDrawer === "settings"} onOpenChange={(open) => { if (!open) setMobileDrawer(null); }}>
          <DrawerContent className="max-h-[85dvh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="flex items-center gap-2 text-orange-400"><Settings className="w-4 h-4" />Settings</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto flex-1" style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}>
              {renderSettingsContent()}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  const pendingPatchCount = gexModifiedFiles.filter(f => !gexPatchAccepted.has(f)).length;

  return (
    <div className="h-full w-full qw-shell flex flex-col min-h-0">
      <header className="qw-brandbar glass-header flex-shrink-0 relative overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 relative z-10 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/keystone" className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-white/5 rounded-lg" data-testid="link-back-portal">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="qw-mark" aria-hidden="true"><span>K</span></div>
            <div className="min-w-0">
              <div className="qw-kicker">KeyStone · AiAssist Secure</div>
              <h1 className="text-lg ace-text-shimmer qw-env-title truncate" data-testid="text-env-name">{environment.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {runtimeSessionId && (
              <span className="qw-chip" data-testid="badge-runtime-session">
                <span className="qw-dot" />
                runtime {runtimeSessionId.slice(0, 8)}
              </span>
            )}
            {runtimeLoading && (
              <span className="qw-chip">
                <Loader2 className="w-3 h-3 animate-spin" />Connecting...
              </span>
            )}
            {environment.llm_provider && (
              <span className="qw-chip qw-cool" data-testid="badge-provider">
                <span className="qw-dot" />
                {environment.llm_provider}{environment.llm_model ? ` · ${environment.llm_model}` : ""}
              </span>
            )}
            {pendingPatchCount > 0 && (
              <span className="qw-chip qw-warn">
                <span className="qw-dot" />
                {pendingPatchCount} pending patch{pendingPatchCount > 1 ? "es" : ""}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground h-8 w-8"
              title="Download all files as ZIP"
              onClick={() => window.open(`/api/keystone/environments/${envId}/files/download-all`, "_blank")}
              data-testid="button-download-all"
            >
              <FolderArchive className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className={`text-muted-foreground h-8 w-8 ${activeTab === "settings" ? "bg-orange-500/10 text-orange-400" : ""}`} onClick={() => setActiveTab(activeTab === "settings" ? "chat" : "settings")} data-testid="button-settings">
              <Settings className="w-4 h-4" />
            </Button>
            {!runtimeSessionId && !runtimeLoading && (
              <Button
                size="sm"
                className="h-8 text-xs px-3 gap-1.5 qw-btn-primary"
                onClick={initRuntimeSession}
                data-testid="button-init-runtime"
              >
                <Zap className="w-3.5 h-3.5" />
                {runtimeError ? "Retry Runtime" : "Init Runtime"}
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden min-h-0">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
            <div className="h-full flex flex-col bg-[var(--qw-panel)]/80 border-r border-[var(--qw-line)]">
              <div className="p-3 border-b border-[var(--qw-line)] flex items-center justify-between">
                <span className="qw-panel-head">Files</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setShowFileSearch(!showFileSearch)} title="Search in files" data-testid="button-toggle-search">
                    <Search className="w-3.5 h-3.5" />
                  </Button>
                  <Dialog open={githubCloneOpen} onOpenChange={setGithubCloneOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" title="Clone GitHub repository" data-testid="button-clone-github">
                        <Github className="w-3.5 h-3.5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-background border-border">
                      <DialogHeader>
                        <DialogTitle>Clone GitHub Repository</DialogTitle>
                        <DialogDescription className="text-muted-foreground">Clone a public GitHub repository into this environment.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Repository URL</Label>
                          <Input placeholder="https://github.com/owner/repo" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} className="bg-muted border-border" data-testid="input-github-url" />
                        </div>
                        <div className="space-y-2">
                          <Label>Branch</Label>
                          <Input placeholder="main" value={githubBranch} onChange={(e) => setGithubBranch(e.target.value)} className="bg-muted border-border" data-testid="input-github-branch" />
                        </div>
                        <div className="text-xs text-muted-foreground">Only public repositories are supported. Max size: 50MB.</div>
                        <Button onClick={cloneGithubRepo} disabled={!githubUrl.trim() || isCloningRepo} className="w-full" data-testid="button-clone-submit">
                          {isCloningRepo ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cloning...</> : <><Github className="w-4 h-4 mr-2" />Clone Repository</>}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={loadFileTree} data-testid="button-refresh-files">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {showFileSearch && (
                <div className="p-2 border-b border-border">
                  <div className="flex gap-1">
                    <Input
                      value={fileSearchQuery}
                      onChange={(e) => setFileSearchQuery(e.target.value)}
                      placeholder="Search pattern..."
                      className="flex-1 h-7 text-xs bg-muted border-border"
                      onKeyDown={(e) => e.key === "Enter" && searchInFiles()}
                      data-testid="input-file-search"
                    />
                    <Button size="sm" variant="outline" onClick={searchInFiles} disabled={fileSearching || !runtimeSessionId} className="h-7 px-2" data-testid="button-file-search">
                      {fileSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                    </Button>
                  </div>
                  {fileSearchResults.length > 0 && (
                    <ScrollArea className="mt-2 max-h-48">
                      <div className="space-y-0.5">
                        {fileSearchResults.map((hit, i) => (
                          <button
                            key={i}
                            onClick={() => loadFile(hit.file)}
                            className="w-full text-left px-2 py-1 text-xs hover:bg-muted/50 rounded"
                            data-testid={`search-hit-${i}`}
                          >
                            <span className="text-indigo-400 font-mono text-[10px]">{hit.file}</span>
                            <span className="text-muted-foreground text-[10px]">:{hit.line}</span>
                            <div className="text-muted-foreground truncate text-[10px]">{hit.content}</div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}

              <ScrollArea className="flex-1">
                <div className="p-2">
                  {fileTree ? fileTree.children?.map(child => renderFileTree(child, 0)) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">No files yet</div>
                  )}
                </div>
              </ScrollArea>

              <div className="qw-gex-dock">
                <div className="qw-gex-label">_Gex · surgical debug</div>
                <p className="text-xs text-muted-foreground mb-2.5">
                  {selectedFile
                    ? <>Target <span className="text-red-200 font-semibold">{selectedFile.split("/").pop()}</span>. Scan, patch, review diffs in-place.</>
                    : "Pick a file to target, or scan the whole environment."}
                </p>
                <button
                  onClick={() => runGex(selectedFile || undefined)}
                  disabled={gexRunning || isSendingMessage || hasPendingReview}
                  className={`qw-gex-btn ${
                    gexRunning ? "qw-gex-running" : hasPendingReview ? "qw-gex-blocked" : ""
                  }`}
                  data-testid="button-gex-debug"
                >
                  {gexRunning
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Scanning...</>
                    : <><ScanSearch className="w-4 h-4" />Debug w/ _Gex</>
                  }
                </button>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={45}>
            <div className="h-full flex flex-col bg-[var(--qw-ink)]">
              {openTabs.length > 0 ? (
                <>
                  <div className="border-b border-border bg-background/80 flex flex-col">
                    <div className="flex items-center overflow-x-auto scrollbar-thin">
                      {openTabs.map(tab => {
                        const isActive = tab === selectedFile;
                        const isGexMod = gexModifiedFiles.includes(tab);
                        const isAccepted = gexPatchAccepted.has(tab);
                        const tabDirty = tabContents[tab] && tabContents[tab].content !== tabContents[tab].original;
                        const fileName = tab.split("/").pop() || tab;
                        return (
                          <div
                            key={tab}
                            className={`group flex items-center gap-1 px-3 py-1.5 text-xs border-r border-border cursor-pointer shrink-0 transition-colors ${
                              isActive ? "qw-tab-active bg-[var(--qw-ink)] text-foreground border-b-2 border-b-[var(--qw-emerald)]" : "bg-white/[0.02] text-muted-foreground hover:bg-white/[0.04]"
                            } ${isGexMod && !isAccepted ? "border-t-2 border-t-red-500" : ""} ${isAccepted ? "border-t-2 border-t-green-500" : ""}`}
                            onClick={() => switchTab(tab)}
                            data-testid={`tab-${tab}`}
                          >
                            {getFileIcon(fileName)}
                            <span className="truncate max-w-[120px]">{fileName}</span>
                            {tabDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                            {isGexMod && !isAccepted && <FileWarning className="w-3 h-3 text-red-400 shrink-0" />}
                            {isAccepted && <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />}
                            <button
                              onClick={(e) => { e.stopPropagation(); closeTab(tab); }}
                              className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
                              data-testid={`close-tab-${tab}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {selectedFile && (
                      <div className="flex items-center justify-between px-2 py-1 bg-background/50 border-t border-border/50">
                        <div className="flex items-center gap-1">
                          {selectedFile.endsWith(".py") && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground text-xs h-6 px-2"
                                title="Functions Map"
                                onClick={async () => {
                                  try {
                                    const res = await apiFetch(`/api/keystone/environments/${envId}/files/analyze/functions?path=${encodeURIComponent(selectedFile)}`);
                                    const data = await res.json();
                                    const fns = data.functions || [];
                                    if (fns.length === 0) { toast.info("No functions found"); return; }
                                    toast.success(`${fns.length} functions: ${fns.map((f: any) => `${f.name}(${f.args.join(",")}):L${f.line}`).join(", ")}`, { duration: 8000 });
                                  } catch { toast.error("Analysis failed"); }
                                }}
                                data-testid="button-functions-map"
                              >
                                <FunctionSquare className="w-3 h-3 mr-1" />
                                Fns
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground text-xs h-6 px-2"
                                title="Bracket Check"
                                onClick={async () => {
                                  try {
                                    const res = await apiFetch(`/api/keystone/environments/${envId}/files/analyze/brackets?path=${encodeURIComponent(selectedFile)}`);
                                    const data = await res.json();
                                    data.balanced ? toast.success("Brackets balanced") : toast.error(`Bracket mismatch at position ${data.error_at || "unknown"}`);
                                  } catch { toast.error("Analysis failed"); }
                                }}
                                data-testid="button-bracket-check"
                              >
                                <Braces className="w-3 h-3 mr-1" />
                                Check
                              </Button>
                            </>
                          )}
                          {gexModifiedFiles.includes(selectedFile) && !gexPatchAccepted.has(selectedFile) && (
                            <div className="flex items-center gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-400 hover:text-green-300 text-xs h-6 px-2"
                                onClick={() => acceptGexFile(selectedFile)}
                                data-testid="button-accept-patch"
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Accept
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 text-xs h-6 px-2"
                                onClick={() => revertGexFile(selectedFile)}
                                data-testid="button-revert-patch"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Revert
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={saveFile} disabled={!hasUnsavedChanges || isSavingFile} className="text-muted-foreground text-xs h-6 px-2" data-testid="button-save-file">
                            <Save className="w-3 h-3 mr-1" />Save
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => window.open(`/api/keystone/environments/${envId}/files/download?path=${encodeURIComponent(selectedFile || "")}`, "_blank")} className="text-muted-foreground text-xs h-6 px-2" data-testid="button-download-file">
                            <Download className="w-3 h-3 mr-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  {gexModifiedFiles.length > 0 && gexModifiedFiles.some(f => !gexPatchAccepted.has(f)) && (
                    <div className="flex items-center justify-between px-3 py-1.5 bg-red-950/30 border-b border-red-800/30 text-xs">
                      <span className="text-red-300">
                        <ScanSearch className="w-3 h-3 inline mr-1" />
                        {gexModifiedFiles.filter(f => !gexPatchAccepted.has(f)).length} pending patch{gexModifiedFiles.filter(f => !gexPatchAccepted.has(f)).length > 1 ? "es" : ""}
                      </span>
                      <div className="flex gap-2">
                        <button onClick={acceptAllGex} className="text-green-400 hover:text-green-300 font-medium" data-testid="button-accept-all-patches">Accept All</button>
                        <button onClick={clearGexPatches} className="text-muted-foreground hover:text-foreground" data-testid="button-dismiss-patches">Dismiss</button>
                      </div>
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden relative">
                    {isLoadingFile ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
                      </div>
                    ) : selectedFile && gexModifiedFiles.includes(selectedFile) && !gexPatchAccepted.has(selectedFile) && gexSnapshots[selectedFile] !== undefined ? (
                      <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-red-950/20 border-b border-red-800/20 text-xs">
                          <div className="flex items-center gap-2 text-red-300">
                            <FileWarning className="w-3.5 h-3.5" />
                            <span>_Gex changes — review diff below</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => acceptGexFile(selectedFile)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-600/80 hover:bg-green-500 text-white text-xs font-medium transition-colors"
                              data-testid="button-diff-accept"
                            >
                              <CheckCircle2 className="w-3 h-3" />Accept
                            </button>
                            <button
                              onClick={() => revertGexFile(selectedFile)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-600/80 hover:bg-red-500 text-white text-xs font-medium transition-colors"
                              data-testid="button-diff-revert"
                            >
                              <RotateCcw className="w-3 h-3" />Revert
                            </button>
                          </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <DiffEditor
                            key={`diff-${selectedFile}`}
                            height="100%"
                            language={getLanguageFromPath(selectedFile || "")}
                            original={gexSnapshots[selectedFile] || ""}
                            modified={fileContent}
                            theme="vs-dark"
                            keepCurrentOriginalModel={true}
                            keepCurrentModifiedModel={true}
                            options={{
                              readOnly: false,
                              renderSideBySide: true,
                              minimap: { enabled: false },
                              fontSize: 13,
                              lineNumbers: "on",
                              scrollBeyondLastLine: false,
                              automaticLayout: true,
                              originalEditable: false,
                              padding: { top: 8, bottom: 8 }
                            }}
                            onMount={(editor) => {
                              if (diffContentDisposableRef.current) {
                                diffContentDisposableRef.current.dispose();
                                diffContentDisposableRef.current = null;
                              }
                              const modified = editor.getModifiedEditor();
                              diffContentDisposableRef.current = modified.onDidChangeModelContent(() => {
                                setFileContent(modified.getValue());
                              });
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <Editor
                        height="100%"
                        language={getLanguageFromPath(selectedFile || "")}
                        defaultValue={fileContent}
                        onChange={(v) => setFileContentDebounced(v || "")}
                        theme="vs-dark"
                        options={{ minimap: { enabled: true }, fontSize: 14, lineNumbers: "on", scrollBeyondLastLine: false, wordWrap: "on", automaticLayout: true, padding: { top: 8, bottom: 8 } }}
                        data-testid="editor-file-content"
                        key={`desktop-editor-${selectedFile}`}
                        onMount={(editor) => { editorRef.current = editor; }}
                      />
                    )}
                  </div>
                </>
              ) : (
                <div className="qw-editor-empty">
                  <div className="qw-editor-empty-inner">
                    <div className="qw-editor-empty-mark" aria-hidden="true"><span>K</span></div>
                    <div className="qw-editor-empty-title">Select a file to edit</div>
                    <p className="qw-editor-empty-sub">Open something from the tree, import an artifact, or ask the agent to scaffold it.</p>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={38} minSize={28}>
            <div className="h-full min-h-0 flex flex-col qw-agent-rail min-w-0" style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full min-h-0" style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
                <TabsList className="qw-agent-tabs border-b border-[var(--qw-line)] rounded-none bg-black/25 h-auto p-0 px-1.5 flex-shrink-0 flex flex-nowrap overflow-x-auto justify-start w-full">
                  <TabsTrigger value="chat" className="qw-agent-tab rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--qw-emerald)] data-[state=active]:bg-transparent data-[state=active]:text-foreground px-3 py-2.5 text-[11.5px] font-semibold shrink-0" data-testid="tab-chat">
                    <MessageSquare className="w-3.5 h-3.5 mr-1.5" />Chat
                    {messages.length > 0 && <span className="qw-tab-count ml-1.5">{messages.length}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="terminal" className="qw-agent-tab rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--qw-emerald)] data-[state=active]:bg-transparent data-[state=active]:text-foreground px-3 py-2.5 text-[11.5px] font-semibold shrink-0" data-testid="tab-terminal">
                    <Terminal className="w-3.5 h-3.5 mr-1.5" />Terminal
                  </TabsTrigger>
                  <TabsTrigger value="deploy" className="qw-agent-tab rounded-none border-b-2 border-transparent data-[state=active]:border-sky-400 data-[state=active]:bg-transparent data-[state=active]:text-foreground px-3 py-2.5 text-[11.5px] font-semibold shrink-0" data-testid="tab-deploy">
                    <Rocket className="w-3.5 h-3.5 mr-1.5" />Manage
                  </TabsTrigger>
                  <TabsTrigger value="ledger" className="qw-agent-tab rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--qw-amber)] data-[state=active]:bg-transparent data-[state=active]:text-foreground px-3 py-2.5 text-[11.5px] font-semibold shrink-0" data-testid="tab-ledger">
                    <ScrollText className="w-3.5 h-3.5 mr-1.5" />Ledger
                  </TabsTrigger>
                  <TabsTrigger value="artifacts" className="qw-agent-tab rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--qw-violet)] data-[state=active]:bg-transparent data-[state=active]:text-foreground px-3 py-2.5 text-[11.5px] font-semibold shrink-0" data-testid="tab-artifacts">
                    <Package className="w-3.5 h-3.5 mr-1.5" />Artifacts
                    {ksArtifacts.length > 0 && <span className="qw-tab-count ml-1.5">{ksArtifacts.length}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="qw-agent-tab rounded-none border-b-2 border-transparent data-[state=active]:border-orange-400 data-[state=active]:bg-transparent data-[state=active]:text-foreground px-3 py-2.5 text-[11.5px] font-semibold shrink-0" data-testid="tab-settings">
                    <Settings className="w-3.5 h-3.5 mr-1.5" />Settings
                  </TabsTrigger>
                </TabsList>

                  <TabsContent value="chat" className="flex-1 min-h-0 flex flex-col m-0 overflow-hidden relative" style={{ flex: "1 1 0%", minHeight: 0, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", margin: 0 }}>
                    {renderChatPanel()}
                  </TabsContent>

                  <TabsContent value="terminal" className="flex-1 min-h-0 flex flex-col m-0 overflow-hidden data-[state=inactive]:hidden" style={{ flex: "1 1 0%", minHeight: 0 }}>
                    {renderTerminalTab()}
                  </TabsContent>

                  <TabsContent value="deploy" className="flex-1 min-h-0 flex flex-col m-0 overflow-hidden data-[state=inactive]:hidden" style={{ flex: "1 1 0%", minHeight: 0 }}>
                    {renderDeployTab()}
                  </TabsContent>

                  <TabsContent value="ledger" className="flex-1 min-h-0 flex flex-col m-0 overflow-hidden data-[state=inactive]:hidden" style={{ flex: "1 1 0%", minHeight: 0 }}>
                    {renderLedgerTab()}
                  </TabsContent>

                  <TabsContent value="artifacts" className="flex-1 min-h-0 flex flex-col m-0 overflow-hidden data-[state=inactive]:hidden" style={{ flex: "1 1 0%", minHeight: 0 }}>
                    <div className="p-4 space-y-3 overflow-y-auto flex-1 qw-panel-body" data-testid="panel-artifacts-ks">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <div className="qw-panel-kicker">Artifacts</div>
                          <h3 className="text-sm font-semibold text-foreground">Saved from Playground</h3>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={loadKsArtifacts} title="Refresh">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      {ksArtifactsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                        </div>
                      ) : ksArtifacts.length === 0 ? (
                        <div className="qw-panel-empty">
                          <div className="qw-panel-empty-icon"><Package className="w-6 h-6" /></div>
                          <p className="qw-panel-empty-title">No artifacts yet</p>
                          <p className="qw-panel-empty-sub">Save code from Playground to import it here.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {ksArtifacts.map((artifact) => (
                            <div key={artifact.id} className="qw-artifact-card group">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  {renamingKsArtifactId === artifact.id ? (
                                    <input
                                      type="text"
                                      value={renameKsArtifactValue}
                                      onChange={(e) => setRenameKsArtifactValue(e.target.value)}
                                      onKeyDown={(e) => { if (e.key === "Enter") submitKsArtifactRename(); if (e.key === "Escape") setRenamingKsArtifactId(null); }}
                                      onBlur={submitKsArtifactRename}
                                      autoFocus
                                      className="w-full bg-muted border border-violet-500/40 rounded px-1.5 py-0.5 text-sm text-foreground focus:outline-none focus:border-violet-400 min-w-0"
                                      data-testid={`input-rename-ks-artifact-${artifact.id}`}
                                    />
                                  ) : (
                                    <p className="text-sm text-foreground truncate cursor-text hover:text-violet-300 transition-colors" onClick={() => startKsArtifactRename(artifact.id, artifact.name)} data-testid={`text-ks-artifact-${artifact.id}`}>{artifact.name}</p>
                                  )}
                                  <p className="text-[11px] text-muted-foreground mt-0.5">{artifact.target_stack || "text"}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                                  onClick={() => importArtifactToEnv(artifact)}
                                  disabled={ksImporting === artifact.id}
                                  data-testid={`button-import-artifact-${artifact.id}`}
                                >
                                  {ksImporting === artifact.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <><Download className="w-3 h-3 mr-1" />Import</>
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="settings" className="flex-1 flex flex-col m-0 overflow-hidden">
                    {renderSettingsContent()}
                  </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <footer className="qw-provenance">
        <span className="qw-own">Ownership · every layer</span>
        <span>
          session <b>{runtimeSessionId ? runtimeSessionId.slice(0, 8) : "—"}</b>
          {" · "}
          {environment.llm_provider || "provider"}
          {" · "}
          patches <b>{pendingPatchCount}</b>
        </span>
        <span>AiAssist Secure · KeyStone</span>
      </footer>
    </div>
  );
}
