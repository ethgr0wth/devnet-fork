import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Send,
  Settings,
  Bot,
  Layers,
  Zap,
  BookOpen,
  ChevronDown,
  ChevronRight,
  X,
  Copy,
  RotateCcw,
  Clock,
  Play,
  Pause,
  Loader2,
  MessageSquare,
  FileText,
  Sparkles,
  Check,
  AlertCircle,
  Menu,
  SlidersHorizontal,
  Rocket,
  Mic,
  MicOff,
  Phone,
  Volume2,
  VolumeX,
  Lightbulb,
  ListChecks,
  CheckCircle2,
  Target,
  Paperclip,
  Wrench,
  Package,
  Download,
  ExternalLink,
  Code2,
  Save,
  RefreshCw,
  GitBranch,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useAvailableModels } from "@/hooks/use-available-models";
import { useVoiceToText } from "@/hooks/use-voice-to-text";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useUpgradeModal } from "@/components/UpgradeModal";
import { useEpicErrorModal } from "@/components/ui/epic-error-modal";
import { apiFetch } from "@/lib/queryClient";
import { VoiceSession } from "@/components/voice/VoiceSession";
import DocumentUpload from "@/components/DocumentUpload";

interface PlaygroundDirective {
  content: string;
  directive_type: string;
  priority: number;
  active: boolean;
}

interface PlaygroundKnowledgeItem {
  id?: string;
  title: string;
  content: string;
  category: string;
  is_reference: boolean;
}

interface PlaygroundMessage {
  id: string;
  role: string;
  content: string;
  thinking_content?: string;
  model_used?: string;
  tokens_used?: number;
  timestamp: string;
}

interface PlaygroundSession {
  id: string;
  owner_id: string;
  name: string;
  status: string;
  template_id?: string;
  template_name?: string;
  model_provider: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  reasoning_effort?: string;
  persona?: string;
  directives: PlaygroundDirective[];
  knowledge_items: PlaygroundKnowledgeItem[];
  messages: PlaygroundMessage[];
  message_count: number;
  total_tokens_used: number;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

interface AITemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  base_persona: string;
  recommended_model: string;
  temperature: number;
  max_tokens: number;
}

const REASONING_EFFORT_LABELS: Record<string, string> = {
  light: "Light",
  medium: "Medium",
  high: "High",
  xhigh: "Extra High",
};

const DIRECTIVE_TYPES = [
  {
    value: "guidance",
    label: "Guidance",
    description: "Instructions for the AI",
  },
  { value: "tone", label: "Tone", description: "Communication style" },
  { value: "context", label: "Context", description: "Background information" },
  {
    value: "constraint",
    label: "Constraint",
    description: "Limitations and rules",
  },
];

export default function MobilePlayground({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const {
    models: availableModels,
    provider: modelProvider,
    providers,
    isLoading: modelsLoading,
  } = useAvailableModels();
  const { showUpgradeModal, UpgradeModalComponent } = useUpgradeModal();
  const { showError, ErrorModalComponent } = useEpicErrorModal();
  const [sessions, setSessions] = useState<PlaygroundSession[]>([]);
  const [activeSession, setActiveSession] = useState<PlaygroundSession | null>(
    null,
  );
  const [templates, setTemplates] = useState<AITemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const messageInputRef = useRef<HTMLInputElement>(null);
  const [reasoningEnabled, setReasoningEnabled] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingThinking, setStreamingThinking] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [tokenProgress, setTokenProgress] = useState({ current: 0, max: 0 });
  const [streamingToolStatus, setStreamingToolStatus] = useState<{
    active: boolean;
    toolName?: string;
    count?: number;
  } | null>(null);
  const [expandedThinking, setExpandedThinking] = useState<
    Record<string, boolean>
  >({});

  const {
    isListening,
    isSupported: voiceSupported,
    toggleListening,
  } = useVoiceToText({
    onTranscript: (text) => {
      const newVal = messageInputRef.current
        ? messageInputRef.current.value
          ? `${messageInputRef.current.value} ${text}`
          : text
        : text;
      setMessageInput(newVal);
      if (messageInputRef.current) messageInputRef.current.value = newVal;
    },
  });
  const [showSessionsDrawer, setShowSessionsDrawer] = useState(false);
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showVoiceSession, setShowVoiceSession] = useState(false);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [showDirectiveModal, setShowDirectiveModal] = useState(false);
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [allTools, setAllTools] = useState<
    {
      id: string;
      name: string;
      description: string;
      type: string;
      enabled: boolean;
    }[]
  >([]);
  const [expandedToolId, setExpandedToolId] = useState<string | null>(null);
  const [togglingToolId, setTogglingToolId] = useState<string | null>(null);
  const [deployForm, setDeployForm] = useState({
    name: "",
    description: "",
    inherit_global_directives: true,
    inherit_global_kb: true,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [, setLocation] = useLocation();

  interface SavedArtifact {
    id: string;
    name: string;
    target_stack: string;
    status: string;
    created_at: string;
  }
  const [savedArtifacts, setSavedArtifacts] = useState<SavedArtifact[]>([]);
  const [savingCodeBlock, setSavingCodeBlock] = useState<string | null>(null);
  const [savedCodeBlocks, setSavedCodeBlocks] = useState<Set<string>>(
    new Set(),
  );
  const [updatingCodeBlock, setUpdatingCodeBlock] = useState<string | null>(
    null,
  );
  const [updatedCodeBlocks, setUpdatedCodeBlocks] = useState<Set<string>>(
    new Set(),
  );
  const [copiedCodeBlock, setCopiedCodeBlock] = useState<string | null>(null);
  const [artifactsLoading, setArtifactsLoading] = useState(false);
  const [rightSidebarTab, setRightSidebarTab] = useState<
    "config" | "artifacts"
  >("config");

  const [selectedArtifactIds, setSelectedArtifactIds] = useState<Set<string>>(
    new Set(),
  );
  const [showCreateArtifact, setShowCreateArtifact] = useState(false);
  const [newArtifactName, setNewArtifactName] = useState("");
  const [newArtifactStack, setNewArtifactStack] = useState("python");
  const [newArtifactCode, setNewArtifactCode] = useState("");
  const [isCreatingArtifact, setIsCreatingArtifact] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [renamingArtifactId, setRenamingArtifactId] = useState<string | null>(
    null,
  );
  const [renameArtifactValue, setRenameArtifactValue] = useState("");

  const startArtifactRename = (
    id: string,
    currentName: string,
    e?: React.MouseEvent,
  ) => {
    if (e) e.stopPropagation();
    setRenamingArtifactId(id);
    setRenameArtifactValue(currentName);
  };

  const submitArtifactRename = async () => {
    if (!renamingArtifactId || !renameArtifactValue.trim()) {
      setRenamingArtifactId(null);
      return;
    }
    const oldArtifact = savedArtifacts.find((a) => a.id === renamingArtifactId);
    if (oldArtifact && renameArtifactValue.trim() === oldArtifact.name) {
      setRenamingArtifactId(null);
      return;
    }
    try {
      const res = await apiFetch(`/api/artifacts/${renamingArtifactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameArtifactValue.trim() }),
      });
      if (res.ok) {
        toast.success("Artifact renamed");
        loadArtifacts();
      } else {
        toast.error("Rename failed");
      }
    } catch (e) {
      console.error(e);
      toast.error("Rename failed");
    } finally {
      setRenamingArtifactId(null);
    }
  };

  const toggleArtifactSelection = (id: string) => {
    setSelectedArtifactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createArtifactManual = async () => {
    if (!newArtifactName.trim() || !newArtifactCode.trim()) return;
    setIsCreatingArtifact(true);
    try {
      const res = await apiFetch("/api/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newArtifactName.trim(),
          prompt: "",
          source_code: newArtifactCode,
          target_stack: newArtifactStack,
          description: "Created manually in Playground",
          session_id: activeSession?.id || "",
          status: "ready",
        }),
      });
      if (res.ok) {
        toast.success(`Artifact "${newArtifactName}" created`);
        setShowCreateArtifact(false);
        setNewArtifactName("");
        setNewArtifactCode("");
        loadArtifacts();
      } else {
        toast.error("Failed to create artifact");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to create artifact");
    } finally {
      setIsCreatingArtifact(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setNewArtifactCode(reader.result as string);
      if (!newArtifactName.trim()) setNewArtifactName(file.name);
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const extMap: Record<string, string> = {
        py: "python",
        js: "javascript",
        ts: "typescript",
        tsx: "tsx",
        jsx: "jsx",
        html: "html",
        css: "css",
        json: "json",
        md: "markdown",
        sql: "sql",
        sh: "bash",
        go: "go",
        rs: "rust",
        java: "java",
        rb: "ruby",
        php: "php",
      };
      if (extMap[ext]) setNewArtifactStack(extMap[ext]);
    };
    reader.readAsText(file);
  };

  const updateArtifactCode = async (
    artifactId: string,
    newCode: string,
    blockKey?: string,
  ) => {
    if (blockKey) setUpdatingCodeBlock(blockKey);
    try {
      const res = await apiFetch(`/api/artifacts/${artifactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_code: newCode }),
      });
      if (res.ok) {
        toast.success("Artifact updated");
        if (blockKey)
          setUpdatedCodeBlocks((prev) => new Set(prev).add(blockKey));
        loadArtifacts();
      } else toast.error("Failed to update artifact");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update artifact");
    } finally {
      if (blockKey) setUpdatingCodeBlock(null);
    }
  };

  const loadArtifacts = async () => {
    setArtifactsLoading(true);
    try {
      const res = await apiFetch("/api/artifacts?limit=100");
      if (res.ok) {
        const data = await res.json();
        setSavedArtifacts(data.artifacts || []);
      }
    } catch (e) {
      console.error("Failed to load artifacts:", e);
    } finally {
      setArtifactsLoading(false);
    }
  };

  useEffect(() => {
    loadArtifacts();
  }, []);

  const LANG_EXTENSIONS: Record<string, string> = {
    python: ".py",
    py: ".py",
    javascript: ".js",
    js: ".js",
    typescript: ".ts",
    ts: ".ts",
    tsx: ".tsx",
    jsx: ".jsx",
    html: ".html",
    css: ".css",
    json: ".json",
    markdown: ".md",
    md: ".md",
    sql: ".sql",
    bash: ".sh",
    sh: ".sh",
    shell: ".sh",
    go: ".go",
    rust: ".rs",
    rs: ".rs",
    java: ".java",
    ruby: ".rb",
    rb: ".rb",
    php: ".php",
    swift: ".swift",
    kotlin: ".kt",
    yaml: ".yaml",
    yml: ".yaml",
    xml: ".xml",
    c: ".c",
    cpp: ".cpp",
    "c++": ".cpp",
    vue: ".vue",
    svelte: ".svelte",
  };

  const saveAsArtifact = async (code: string, language: string) => {
    const blockKey = `${language}:${code.slice(0, 50)}`;
    if (savedCodeBlocks.has(blockKey)) return;
    setSavingCodeBlock(blockKey);
    try {
      const langClean = language.toLowerCase().trim().split(/[\s(]/)[0];
      const ext = LANG_EXTENSIONS[langClean] || `.${langClean}`;
      const name = `snippet_${Date.now()}${ext}`;
      const res = await apiFetch("/api/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          prompt: "",
          source_code: code,
          target_stack: langClean,
          description: `Saved from Playground${activeSession ? ` — ${activeSession.name}` : ""}`,
          session_id: activeSession?.id || "",
          status: "ready",
        }),
      });
      if (res.ok) {
        setSavedCodeBlocks((prev) => new Set(prev).add(blockKey));
        loadArtifacts();
        toast.success("Saved as artifact");
      } else {
        toast.error("Failed to save artifact");
      }
    } catch (e) {
      console.error("Failed to save artifact:", e);
      toast.error("Failed to save artifact");
    } finally {
      setSavingCodeBlock(null);
    }
  };

  const deleteArtifact = async (artifactId: string) => {
    try {
      const res = await apiFetch(`/api/artifacts/${artifactId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSavedArtifacts((prev) => prev.filter((a) => a.id !== artifactId));
        toast.success("Artifact deleted");
      } else toast.error("Failed to delete artifact");
    } catch (e) {
      console.error("Failed to delete artifact:", e);
      toast.error("Failed to delete artifact");
    }
  };

  const [deployingArtifactId, setDeployingArtifactId] = useState<string | null>(
    null,
  );

  const [showEnvLimitModal, setShowEnvLimitModal] = useState(false);
  const [envLimitInfo, setEnvLimitInfo] = useState({ current: 0, limit: 0 });

  const deployToKeystone = async (artifact: SavedArtifact) => {
    setDeployingArtifactId(artifact.id);
    try {
      const fullRes = await apiFetch(`/api/artifacts/${artifact.id}`);
      if (!fullRes.ok) {
        toast.error("Failed to load artifact");
        setDeployingArtifactId(null);
        return;
      }
      const full = await fullRes.json();
      const code = full.source_code || "";
      if (!code) {
        toast.error("Artifact has no code");
        setDeployingArtifactId(null);
        return;
      }

      const envRes = await apiFetch("/api/keystone/environments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: artifact.name,
          description: `Deployed from Playground artifact`,
          template_id: "blank",
        }),
      });
      if (envRes.status === 403) {
        const errData = await envRes.json().catch(() => ({}));
        const limitMatch = (errData.detail || "").match(/\((\d+)\)/);
        const listRes = await apiFetch("/api/keystone/environments");
        const listData = listRes.ok ? await listRes.json() : [];
        setEnvLimitInfo({
          current: Array.isArray(listData) ? listData.length : 0,
          limit: limitMatch ? parseInt(limitMatch[1]) : 0,
        });
        setShowEnvLimitModal(true);
        setDeployingArtifactId(null);
        return;
      }
      if (!envRes.ok) {
        toast.error("Failed to create environment");
        setDeployingArtifactId(null);
        return;
      }
      const env = await envRes.json();

      const stack = (full.target_stack || "").toLowerCase().trim();
      let filename = artifact.name;
      const ext = LANG_EXTENSIONS[stack] || "";
      const hasDot = filename.includes(".");
      if (ext) {
        if (!filename.endsWith(ext))
          filename = filename.replace(/\.[^.]*$/, "") + ext;
      } else if (!hasDot && stack) {
        filename += `.${stack}`;
      } else if (!hasDot) {
        filename += ".txt";
      }

      await apiFetch(`/api/keystone/environments/${env.id}/files/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filename, content: code }),
      });
      setLocation(`/keystone/${env.id}`);
    } catch (e) {
      console.error("Failed to deploy to KeyStone:", e);
      toast.error("Failed to deploy");
    } finally {
      setDeployingArtifactId(null);
    }
  };

  const [gitCloneOffer, setGitCloneOffer] = useState<{
    url: string;
    repo: string;
    sessionId: string;
  } | null>(null);
  const [gitCloneEnvs, setGitCloneEnvs] = useState<
    { id: string; name: string }[]
  >([]);
  const [gitCloneTarget, setGitCloneTarget] = useState<string>("__new__");
  const [gitCloneBusy, setGitCloneBusy] = useState(false);
  const [gitCloneDone, setGitCloneDone] = useState<{
    envId: string;
    repo: string;
    files: number;
  } | null>(null);

  const offerGitClone = async (url: string, repo: string, sessionId: string) => {
    setGitCloneDone(null);
    setGitCloneTarget("__new__");
    setGitCloneOffer({ url, repo, sessionId });
    try {
      const res = await apiFetch("/api/keystone/environments");
      if (res.ok) {
        const data = await res.json();
        setGitCloneEnvs(Array.isArray(data) ? data : []);
      }
    } catch {
      // env list is optional; card still works with "new environment"
    }
  };

  const handleGitClone = async () => {
    if (!gitCloneOffer || gitCloneBusy) return;
    setGitCloneBusy(true);
    try {
      let envId = gitCloneTarget;
      if (envId === "__new__") {
        const envRes = await apiFetch("/api/keystone/environments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: gitCloneOffer.repo,
            description: `Cloned from ${gitCloneOffer.url}`,
            template_id: "blank",
          }),
        });
        if (envRes.status === 403) {
          const errData = await envRes.json().catch(() => ({}));
          const limitMatch = (errData.detail || "").match(/\((\d+)\)/);
          setEnvLimitInfo({
            current: gitCloneEnvs.length,
            limit: limitMatch ? parseInt(limitMatch[1]) : 0,
          });
          setShowEnvLimitModal(true);
          return;
        }
        if (!envRes.ok) {
          toast.error("Failed to create environment");
          return;
        }
        envId = (await envRes.json()).id;
      }
      const res = await apiFetch(
        `/api/keystone/environments/${envId}/github/clone`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: gitCloneOffer.url }),
        },
      );
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        toast.error(e.detail || "Failed to clone repository");
        return;
      }
      const data = await res.json();
      setGitCloneDone({
        envId,
        repo: data.repo,
        files: data.files_copied,
      });

      const envName =
        gitCloneTarget === "__new__"
          ? gitCloneOffer.repo
          : gitCloneEnvs.find((env) => env.id === envId)?.name || envId;
      const traceLines = [
        `Cloned **${data.repo}** into KeyStone.`,
        ``,
        `- Repository: [${data.repo}](${gitCloneOffer.url})`,
        `- Branch: \`${data.branch}\``,
        `- Items copied: ${data.files_copied}`,
        `- Target folder: \`${data.target || "/"}\``,
        `- Environment: **${envName}** (\`${envId}\`)${gitCloneTarget === "__new__" ? " — newly created" : " — existing"}`,
        `- Cloned at: ${new Date().toISOString()}`,
        ``,
        `[Open in KeyStone](/keystone/${envId})`,
      ];
      const traceContent = traceLines.join("\n");
      const traceMsg: PlaygroundMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: traceContent,
        timestamp: new Date().toISOString(),
      };
      setActiveSession((prev) =>
        prev && prev.id === gitCloneOffer.sessionId
          ? {
              ...prev,
              messages: [...(prev.messages || []), traceMsg],
            }
          : prev,
      );
      try {
        const saveRes = await apiFetch(
          `/api/playground/sessions/${gitCloneOffer.sessionId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role: "assistant",
              content: traceContent,
            }),
          },
        );
        if (!saveRes.ok) {
          toast.error("Clone succeeded, but saving it to chat history failed");
        }
      } catch {
        toast.error("Clone succeeded, but saving it to chat history failed");
      }
      setGitCloneOffer(null);
    } catch (e) {
      console.error("Git clone failed:", e);
      toast.error("Failed to clone repository");
    } finally {
      setGitCloneBusy(false);
    }
  };

  const [newSession, setNewSession] = useState({
    name: "New Session",
    model_provider: modelProvider,
    model_name: "",
    temperature: 0.7,
    max_tokens: 2048,
    reasoning_effort: "",
    persona: "",
    ttl_hours: 24,
  });

  const [newSessionProvider, setNewSessionProvider] = useState(modelProvider);
  const newSessionModels =
    providers.find((p) => p.id === newSessionProvider)?.models ||
    availableModels;

  const getModelEntry = (
    providerId: string | undefined,
    modelId: string | undefined,
  ) =>
    (
      providers.find((p) => p.id === providerId)?.models || availableModels
    ).find((m) => m.id === modelId);

  const defaultEffortFor = (
    entry: { reasoning_efforts?: string[]; default_reasoning_effort?: string } | undefined,
  ) =>
    entry?.reasoning_efforts?.length
      ? entry.default_reasoning_effort || entry.reasoning_efforts[0]
      : "";

  useEffect(() => {
    if (modelProvider && !newSession.model_provider) {
      setNewSession((prev) => ({ ...prev, model_provider: modelProvider }));
      setNewSessionProvider(modelProvider);
    }
  }, [modelProvider]);

  useEffect(() => {
    if (newSessionModels.length > 0) {
      const currentValid = newSessionModels.some(
        (m) => m.id === newSession.model_name,
      );
      if (!currentValid) {
        setNewSession((prev) => ({
          ...prev,
          model_name: newSessionModels[0].id,
          model_provider: newSessionProvider,
          reasoning_effort: defaultEffortFor(newSessionModels[0]),
        }));
      }
    }
  }, [newSessionProvider, newSessionModels]);

  const [newDirective, setNewDirective] = useState({
    content: "",
    directive_type: "guidance",
    priority: 5,
  });

  const [newKnowledge, setNewKnowledge] = useState({
    title: "",
    content: "",
    category: "custom",
  });
  const [knowledgeInputMode, setKnowledgeInputMode] = useState<
    "manual" | "upload"
  >("manual");

  // Voice Action state
  type VoiceActionScope = "off" | "next_only" | "all_future";
  type VoiceActionType =
    | "explain"
    | "summarize"
    | "extract-actions"
    | "decision";
  const [voiceActionScope, setVoiceActionScope] =
    useState<VoiceActionScope>("off");
  const [activeVoiceAction, setActiveVoiceAction] =
    useState<VoiceActionType | null>(null);
  const [voiceActionLoading, setVoiceActionLoading] = useState(false);

  // Web Tool state
  type WebToolType = "none" | "search" | "visit";
  const [webTool, setWebTool] = useState<WebToolType>("none");

  // TTS playback state
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (shouldAutoScroll && activeSession?.messages?.length) {
      // Small delay to ensure DOM has updated with new messages
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeSession?.messages?.length, shouldAutoScroll]);

  useEffect(() => {
    setShouldAutoScroll(true);
  }, [activeSession?.id]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isNearBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShouldAutoScroll(true);
  };

  const loadData = async () => {
    try {
      const [sessionsRes, templatesRes, orgToolsRes, publicToolsRes] =
        await Promise.all([
          apiFetch("/api/playground/sessions"),
          apiFetch("/api/templates?limit=200"),
          apiFetch("/api/org/tools"),
          apiFetch("/api/org/tools/public/catalog"),
        ]);

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data);
        if (data.length > 0 && !activeSession) {
          setActiveSession(data[0]);
        }
      }

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        const allTemplates = data.templates || [];
        const sortedTemplates = allTemplates.sort((a: any, b: any) => {
          if (a.is_system === b.is_system) {
            return (a.name || "").localeCompare(b.name || "");
          }
          return a.is_system ? 1 : -1;
        });
        setTemplates(sortedTemplates);
      }

      const combined: typeof allTools = [];
      if (orgToolsRes.ok) {
        const data = await orgToolsRes.json();
        (data.tools || []).forEach((t: any) => {
          combined.push({
            id: t.id,
            name: t.name,
            description: t.description || "",
            type: "custom",
            enabled: t.enabled !== false,
          });
        });
      }
      if (publicToolsRes.ok) {
        const data = await publicToolsRes.json();
        (data.tools || []).forEach((t: any) => {
          combined.push({
            id: t.id,
            name: t.name,
            description: t.description || "",
            type: "public",
            enabled: !!t.enabled_for_org,
          });
        });
      }
      setAllTools(combined);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createSession = async () => {
    try {
      const res = await apiFetch("/api/playground/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSession),
      });

      if (res.status === 402) {
        showUpgradeModal("AI Playground");
        return;
      }

      if (res.ok) {
        const session = await res.json();
        setSessions((prev) => [session, ...prev]);
        setActiveSession(session);
        setShowNewSessionModal(false);
        setNewSession({
          name: "New Session",
          model_provider: modelProvider,
          model_name: availableModels[0]?.id || "",
          temperature: 0.7,
          max_tokens: 2048,
          reasoning_effort: defaultEffortFor(availableModels[0]),
          persona: "",
          ttl_hours: 24,
        });
        setNewSessionProvider(modelProvider);
      }
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const res = await apiFetch(`/api/playground/sessions/${sessionId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (activeSession?.id === sessionId) {
          setActiveSession(sessions.find((s) => s.id !== sessionId) || null);
        }
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  const handleDeploy = async () => {
    if (!activeSession || !deployForm.name.trim()) return;

    setIsDeploying(true);
    try {
      const res = await apiFetch("/api/deployed-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: deployForm.name,
          description: deployForm.description,
          session_id: activeSession.id,
          inherit_global_directives: deployForm.inherit_global_directives,
          inherit_global_kb: deployForm.inherit_global_kb,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        showError({
          title: "Agent Deployed Successfully",
          message:
            "Your agent is deployed but inactive. Go to Deployed Agents to activate it.",
          technicalDetails: result.message,
          severity: "warning",
        });
        setShowDeployModal(false);
        setDeployForm({
          name: "",
          description: "",
          inherit_global_directives: true,
          inherit_global_kb: true,
        });
      } else {
        const error = await res.json();
        showError({
          title: "Deployment Failed",
          message:
            "We couldn't deploy your agent. Please check your configuration and try again.",
          technicalDetails: `Error: ${error.detail || "Unknown error"}`,
        });
      }
    } catch (error) {
      console.error("Failed to deploy agent:", error);
      showError({
        title: "Connection Error",
        message:
          "Unable to reach the server. Please check your connection and try again.",
        technicalDetails: `Network error: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const openDeployModal = () => {
    if (activeSession) {
      setDeployForm({
        name: activeSession.name,
        description: "",
        inherit_global_directives: true,
        inherit_global_kb: true,
      });
      setShowDeployModal(true);
    }
  };

  const sendMessage = async () => {
    const currentInput = messageInputRef.current?.value || messageInput;
    if (!activeSession || !currentInput.trim() || isSending) return;

    setIsSending(true);
    const message = currentInput;
    setMessageInput("");
    if (messageInputRef.current) messageInputRef.current.value = "";

    try {
      // If AI Assist action is active, ONLY call the action endpoint (single completion)
      if (activeVoiceAction && voiceActionScope !== "off") {
        console.log(
          "[OraclePlayground] AI Assist direct mode:",
          activeVoiceAction,
        );

        // Add user message to UI
        const userMessage: PlaygroundMessage = {
          id: `user-${Date.now()}`,
          role: "user",
          content: message,
          timestamp: new Date().toISOString(),
        };
        setActiveSession((prev) =>
          prev
            ? {
                ...prev,
                messages: [...(prev.messages || []), userMessage],
              }
            : prev,
        );

        // Call action endpoint directly with user's message
        const voiceResult = await processVoiceAction(
          message,
          activeVoiceAction,
        );

        if (voiceResult) {
          const actionLabel =
            activeVoiceAction.charAt(0).toUpperCase() +
            activeVoiceAction.slice(1);
          const actionMessage: PlaygroundMessage = {
            id: `action-${Date.now()}`,
            role: "assistant",
            content: `**🎯 ${actionLabel}:**\n\n${voiceResult}`,
            timestamp: new Date().toISOString(),
          };
          setActiveSession((prev) =>
            prev
              ? {
                  ...prev,
                  messages: [...(prev.messages || []), actionMessage],
                }
              : prev,
          );
        }

        // Reset scope if "next_only"
        if (voiceActionScope === "next_only") {
          setVoiceActionScope("off");
          setActiveVoiceAction(null);
        }

        setIsSending(false);
        return;
      }

      const ghMatch = message.match(
        /https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?=[\s/?#]|$)/,
      );
      const isCloneIntent =
        !!ghMatch &&
        (/\b(clone|import|pull|fork|checkout)\b/i.test(message) ||
          message.trim().replace(/\.git$/, "") ===
            ghMatch[0].replace(/\.git$/, ""));
      if (ghMatch && isCloneIntent) {
        const cloneUserMsg: PlaygroundMessage = {
          id: `user-${Date.now()}`,
          role: "user",
          content: message,
          timestamp: new Date().toISOString(),
        };
        setActiveSession((prev) =>
          prev
            ? {
                ...prev,
                messages: [...(prev.messages || []), cloneUserMsg],
              }
            : prev,
        );
        if (activeSession) {
          try {
            await apiFetch(
              `/api/playground/sessions/${activeSession.id}/messages`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: "user", content: message }),
              },
            );
          } catch {
            // non-fatal: clone can proceed, history entry may be missing
          }
          await offerGitClone(
            ghMatch[0],
            ghMatch[2].replace(/\.git$/, ""),
            activeSession.id,
          );
        }
        setIsSending(false);
        return;
      }

      const userMessage: PlaygroundMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      };
      setActiveSession((prev) =>
        prev
          ? {
              ...prev,
              messages: [...(prev.messages || []), userMessage],
            }
          : prev,
      );

      const artifactCtx =
        selectedArtifactIds.size > 0
          ? Array.from(selectedArtifactIds).map((id) => ({ id }))
          : [];

      const res = await apiFetch(
        `/api/playground/sessions/${activeSession.id}/chat/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-AiAssist-Provider":
              activeSession?.model_provider || modelProvider,
          },
          body: JSON.stringify({
            message,
            web_tool: webTool,
            reasoning: reasoningEnabled,
            artifact_context: artifactCtx,
          }),
        },
      );

      if (res.status === 402) {
        setMessageInput(message);
        if (messageInputRef.current) messageInputRef.current.value = message;
        showUpgradeModal("AI Chat");
        setIsSending(false);
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Chat error:", res.status, errorData);
        setMessageInput(message);
        if (messageInputRef.current) messageInputRef.current.value = message;
        showError({
          title: "AI Response Failed",
          message:
            "We couldn't get a response from the AI. Please check your API key configuration in settings.",
          technicalDetails: `Status: ${res.status}\nDetail: ${errorData.detail || "Unknown error"}`,
        });
        return;
      }

      setIsStreaming(true);
      setStreamingContent("");
      setStreamingThinking("");
      setStreamingToolStatus(null);
      setTokenProgress({ current: 0, max: activeSession.max_tokens });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let rawAccum = "";
      let sseBuffer = "";

      const stripThink = (text: string) => {
        let r = text;
        r = r.replace(/<<<THINK>>>([\s\S]*?)<<<THOUGHT>>>/g, "");
        r = r.replace(/<think>([\s\S]*?)<\/think>/g, "");
        r = r.replace(/<<<THINK>>>[\s\S]*/g, "");
        r = r.replace(/<think>[\s\S]*/g, "");
        return r.trim();
      };

      const extractThink = (text: string) => {
        const parts: string[] = [];
        const m1 = text.match(/<<<THINK>>>([\s\S]*?)<<<THOUGHT>>>/);
        if (m1) parts.push(m1[1].trim());
        else {
          const m1b = text.match(/<<<THINK>>>([\s\S]*)/);
          if (m1b) parts.push(m1b[1].trim());
        }
        const m2 = text.match(/<think>([\s\S]*?)<\/think>/);
        if (m2) parts.push(m2[1].trim());
        else {
          const m2b = text.match(/<think>([\s\S]*)/);
          if (m2b) parts.push(m2b[1].trim());
        }
        return parts.filter(Boolean).join("\n");
      };

      const hasOpenThinkTag = (text: string) => {
        const hasCustomOpen =
          text.includes("<<<THINK>>>") && !text.includes("<<<THOUGHT>>>");
        const hasNativeOpen =
          text.includes("<think>") && !text.includes("</think>");
        return hasCustomOpen || hasNativeOpen;
      };

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });

          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6);
            try {
              const evt = JSON.parse(jsonStr);

              if (evt.type === "meta") {
                setTokenProgress({ current: 0, max: evt.max_tokens });
              } else if (evt.type === "chunk") {
                rawAccum += evt.content;
                setTokenProgress((prev) => ({
                  ...prev,
                  current: evt.tokens_so_far || prev.current,
                }));

                const visibleContent = stripThink(rawAccum);
                const isThinking = hasOpenThinkTag(rawAccum);

                setStreamingContent(visibleContent);
                setStreamingThinking(isThinking ? "active" : "");
              } else if (evt.type === "done") {
                const finalRaw = rawAccum;
                const finalResponse = stripThink(finalRaw);
                const finalThink = extractThink(finalRaw);

                const assistantMsg: PlaygroundMessage = {
                  id: evt.message?.id || `ai-${Date.now()}`,
                  role: "assistant",
                  content: finalResponse,
                  thinking_content: finalThink || undefined,
                  tokens_used: evt.tokens_used,
                  timestamp: evt.message?.timestamp || new Date().toISOString(),
                };

                setActiveSession((prev) => {
                  if (!prev) return prev;
                  const msgs = prev.messages.filter(
                    (m) => m.id !== userMessage.id,
                  );
                  return {
                    ...prev,
                    messages: [...msgs, userMessage, assistantMsg],
                    total_tokens_used:
                      prev.total_tokens_used + (evt.tokens_used || 0),
                  };
                });
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === activeSession.id
                      ? {
                          ...s,
                          total_tokens_used:
                            s.total_tokens_used + (evt.tokens_used || 0),
                        }
                      : s,
                  ),
                );

                if (finalThink) {
                  setExpandedThinking((prev) => ({
                    ...prev,
                    [assistantMsg.id]: false,
                  }));
                }

                const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
                let cbMatch;
                while (
                  (cbMatch = codeBlockRegex.exec(finalResponse)) !== null
                ) {
                  const lang = cbMatch[1] || "text";
                  const code = cbMatch[2].trim();
                  if (code.length > 0) {
                    saveAsArtifact(code, lang);
                  }
                }
              } else if (evt.type === "tool_start") {
                setStreamingToolStatus({ active: true, count: evt.count });
              } else if (evt.type === "tool_exec") {
                setStreamingToolStatus({
                  active: true,
                  toolName: evt.tool_name,
                  count: evt.count,
                });
              } else if (evt.type === "tool_done") {
                setStreamingToolStatus(null);
              } else if (evt.type === "error") {
                showError({
                  title: "AI Response Failed",
                  message: evt.detail || "Stream error",
                });
              }
            } catch {}
          }
        }
      }

      setIsStreaming(false);
      setStreamingContent("");
      setStreamingThinking("");
      setStreamingToolStatus(null);
      setTokenProgress({ current: 0, max: 0 });
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessageInput(message);
      if (messageInputRef.current) messageInputRef.current.value = message;
      showError({
        title: "Connection Error",
        message:
          "Unable to reach the server. Please check your internet connection and try again.",
        technicalDetails: `Network error: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setIsSending(false);
    }
  };

  const configTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateSessionConfig = async (
    updates: Partial<PlaygroundSession>,
    immediate = false,
  ) => {
    if (!activeSession) return;

    setActiveSession((prev) => (prev ? { ...prev, ...updates } : prev));
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSession.id ? { ...s, ...updates } : s)),
    );

    if (configTimerRef.current) clearTimeout(configTimerRef.current);

    const doUpdate = async () => {
      try {
        await apiFetch(`/api/playground/sessions/${activeSession.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
      } catch (error) {
        console.error("Failed to update session:", error);
      }
    };

    if (immediate) {
      doUpdate();
    } else {
      configTimerRef.current = setTimeout(doUpdate, 500);
    }
  };

  const addDirective = async () => {
    if (!activeSession || !newDirective.content.trim()) return;

    try {
      const res = await apiFetch(
        `/api/playground/sessions/${activeSession.id}/directives`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newDirective),
        },
      );

      if (res.status === 402) {
        showUpgradeModal("Playground Directives");
        return;
      }

      if (res.ok) {
        const updatedRes = await apiFetch(
          `/api/playground/sessions/${activeSession.id}`,
        );
        if (updatedRes.ok) {
          const updated = await updatedRes.json();
          setActiveSession(updated);
          setSessions((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s)),
          );
        }
        setShowDirectiveModal(false);
        setNewDirective({
          content: "",
          directive_type: "guidance",
          priority: 5,
        });
      }
    } catch (error) {
      console.error("Failed to add directive:", error);
    }
  };

  const removeDirective = async (index: number) => {
    if (!activeSession) return;

    try {
      const res = await apiFetch(
        `/api/playground/sessions/${activeSession.id}/directives/${index}`,
        {
          method: "DELETE",
        },
      );

      if (res.ok) {
        const updatedRes = await apiFetch(
          `/api/playground/sessions/${activeSession.id}`,
        );
        if (updatedRes.ok) {
          const updated = await updatedRes.json();
          setActiveSession(updated);
          setSessions((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s)),
          );
        }
      }
    } catch (error) {
      console.error("Failed to remove directive:", error);
    }
  };

  const addKnowledge = async () => {
    if (
      !activeSession ||
      !newKnowledge.title.trim() ||
      !newKnowledge.content.trim()
    )
      return;

    try {
      const res = await apiFetch(
        `/api/playground/sessions/${activeSession.id}/knowledge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newKnowledge),
        },
      );

      if (res.status === 402) {
        showUpgradeModal("Playground Knowledge");
        return;
      }

      if (res.ok) {
        const updatedRes = await apiFetch(
          `/api/playground/sessions/${activeSession.id}`,
        );
        if (updatedRes.ok) {
          const updated = await updatedRes.json();
          setActiveSession(updated);
          setSessions((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s)),
          );
        }
        setShowKnowledgeModal(false);
        setNewKnowledge({ title: "", content: "", category: "custom" });
      }
    } catch (error) {
      console.error("Failed to add knowledge:", error);
    }
  };

  const removeKnowledge = async (itemId: string) => {
    if (!activeSession) return;

    try {
      const res = await apiFetch(
        `/api/playground/sessions/${activeSession.id}/knowledge/${itemId}`,
        {
          method: "DELETE",
        },
      );

      if (res.ok) {
        const updatedRes = await apiFetch(
          `/api/playground/sessions/${activeSession.id}`,
        );
        if (updatedRes.ok) {
          const updated = await updatedRes.json();
          setActiveSession(updated);
          setSessions((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s)),
          );
        }
      }
    } catch (error) {
      console.error("Failed to remove knowledge:", error);
    }
  };

  const toggleTool = async (tool: (typeof allTools)[0]) => {
    setTogglingToolId(tool.id);
    try {
      if (tool.type === "custom") {
        await apiFetch(`/api/org/tools/${tool.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: !tool.enabled }),
        });
      } else {
        await apiFetch(
          `/api/org/tools/public/${tool.id}/${tool.enabled ? "disable" : "enable"}`,
          { method: "POST" },
        );
      }
      setAllTools((prev) =>
        prev.map((t) => (t.id === tool.id ? { ...t, enabled: !t.enabled } : t)),
      );
    } catch (error) {
      console.error("Failed to toggle tool:", error);
    } finally {
      setTogglingToolId(null);
    }
  };

  const [templateError, setTemplateError] = useState<string | null>(null);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  const applyTemplate = async (templateId: string) => {
    if (!activeSession) {
      setTemplateError("Please select or create a session first");
      return;
    }

    setIsApplyingTemplate(true);
    setTemplateError(null);

    try {
      const res = await apiFetch(
        `/api/playground/sessions/${activeSession.id}/apply-template`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template_id: templateId,
            apply_persona: true,
            apply_directives: true,
            apply_knowledge: true,
            clear_existing: false,
          }),
        },
      );

      if (res.status === 402) {
        setIsApplyingTemplate(false);
        showUpgradeModal("AI Templates");
        return;
      }

      if (res.ok) {
        const updated = await res.json();
        setActiveSession(updated);
        setSessions((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s)),
        );
        setShowTemplateModal(false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setTemplateError(
          errorData.detail || `Failed to apply template (${res.status})`,
        );
      }
    } catch (error) {
      console.error("Failed to apply template:", error);
      setTemplateError("Network error - please try again");
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  const clearMessages = async () => {
    if (!activeSession) return;

    try {
      const res = await apiFetch(
        `/api/playground/sessions/${activeSession.id}/messages`,
        {
          method: "DELETE",
        },
      );

      if (res.ok) {
        const updatedRes = await apiFetch(
          `/api/playground/sessions/${activeSession.id}`,
        );
        if (updatedRes.ok) {
          const updated = await updatedRes.json();
          setActiveSession(updated);
          setSessions((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s)),
          );
        }
      }
    } catch (error) {
      console.error("Failed to clear messages:", error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Voice action handler
  const handleVoiceAction = (action: VoiceActionType) => {
    if (voiceActionScope === "off") {
      setVoiceActionScope("next_only");
    }
    setActiveVoiceAction(action === activeVoiceAction ? null : action);
  };

  const cycleVoiceScope = () => {
    const scopes: VoiceActionScope[] = ["off", "next_only", "all_future"];
    const currentIdx = scopes.indexOf(voiceActionScope);
    const nextIdx = (currentIdx + 1) % scopes.length;
    const newScope = scopes[nextIdx];
    setVoiceActionScope(newScope);
    if (newScope === "off") {
      setActiveVoiceAction(null);
    }
  };

  // TTS playback handler
  const handleListenMessage = async (messageId: string, content: string) => {
    if (playingMessageId === messageId) {
      audioRef.current?.pause();
      setPlayingMessageId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    setTtsLoading(messageId);
    try {
      const res = await apiFetch("/api/tts/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: content.slice(0, 4000),
          voice_id: "en-US-Wavenet-D",
        }),
      });

      if (res.status === 402) {
        showUpgradeModal("Voice Playback");
        return;
      }

      if (!res.ok) {
        console.error("TTS failed:", await res.text());
        return;
      }

      const data = await res.json();
      if (data.audio_content) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audio_content}`);
        audioRef.current = audio;
        audio.onended = () => setPlayingMessageId(null);
        audio.onerror = () => setPlayingMessageId(null);
        await audio.play();
        setPlayingMessageId(messageId);
      }
    } catch (error) {
      console.error("TTS error:", error);
    } finally {
      setTtsLoading(null);
    }
  };

  // Enhanced send message with voice action processing
  const processVoiceAction = async (
    content: string,
    action: VoiceActionType,
  ): Promise<string | null> => {
    try {
      // Map action names to API endpoints
      const actionEndpoint =
        action === "extract-actions" ? "extract-actions" : action;
      const res = await apiFetch(`/api/voice/actions/${actionEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          context: activeSession?.messages.slice(-5).map((m) => m.content),
        }),
      });

      if (res.status === 402 || res.status === 403) {
        showUpgradeModal("AI Assist");
        return null;
      }

      if (!res.ok) return null;
      const data = await res.json();
      return data.result?.text || null;
    } catch (error) {
      console.error("AI Assist error:", error);
      return null;
    }
  };

  if (isLoading) {
    return (
      <>
        <style>{`
          @keyframes aceShimmerLoad {
            0% { background-position: 200% center; }
            100% { background-position: -200% center; }
          }
          .ace-text-shimmer-load {
            background: linear-gradient(90deg, rgba(6,182,212,0.9) 0%, rgba(139,92,246,0.8) 25%, rgba(236,72,153,0.7) 50%, rgba(139,92,246,0.8) 75%, rgba(6,182,212,0.9) 100%);
            background-size: 200% auto;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: aceShimmerLoad 3s linear infinite;
          }
        `}</style>
        <div className="flex items-center justify-center h-screen bg-[#0A0A0B] relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-cyan-500/[0.08] blur-[100px] animate-pulse" />
            <div
              className="absolute -bottom-[30%] -right-[20%] w-[70%] h-[70%] rounded-full bg-violet-500/[0.06] blur-[100px] animate-pulse"
              style={{ animationDelay: "1s" }}
            />
          </div>
          <div className="text-center relative z-10 flex flex-col items-center">
            <img
              src="/favicon.png"
              alt=""
              className="w-14 h-14 object-contain mb-3"
              style={{
                filter:
                  "drop-shadow(0 0 16px rgba(6,182,212,0.5)) drop-shadow(0 0 6px rgba(139,92,246,0.3))",
              }}
            />
            <div className="flex items-baseline gap-0 mb-1">
              <span className="text-[22px] font-bold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                Ai
              </span>
              <span className="text-[22px] font-light tracking-tight ace-text-shimmer-load">
                Assist
              </span>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-[1px] w-10 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
              <span className="text-[10px] font-semibold tracking-[0.35em] uppercase ace-text-shimmer-load">
                Secure
              </span>
              <div className="h-[1px] w-10 bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
            </div>
            <div className="w-5 h-5 border-2 border-white/15 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        </div>
      </>
    );
  }

  const SessionsPanel = () => (
    <div className="p-4 h-full overflow-y-auto">
      <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
        Sessions
      </h2>

      {sessions.length === 0 ? (
        <div className="text-center py-8">
          <Bot className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/50 text-sm">No sessions yet</p>
          <button
            onClick={() => {
              setShowSessionsDrawer(false);
              setShowNewSessionModal(true);
            }}
            className="mt-3 text-cyan-400 hover:text-cyan-300 text-xs"
            data-testid="button-create-first-session"
          >
            Create your first session
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => {
                setActiveSession(session);
                setShowSessionsDrawer(false);
              }}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                activeSession?.id === session.id
                  ? "bg-cyan-500/15 border border-cyan-500/30"
                  : "bg-white/[0.04] hover:bg-white/[0.05] border border-transparent"
              }`}
              data-testid={`session-card-${session.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">
                    {session.name}
                  </h3>
                  <p className="text-xs text-white/50 mt-1">
                    {session.model_name}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-white/30">
                    <MessageSquare size={12} />
                    <span>{session.message_count} msgs</span>
                    <span>•</span>
                    <span>{session.total_tokens_used} tokens</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  className="text-white/30 hover:text-red-400 p-1"
                  data-testid={`button-delete-session-${session.id}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const ConfigPanel = () => (
    <div className="p-4 h-full overflow-y-auto space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Settings size={14} />
          Configuration
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/50 mb-1">
              Session Name
            </label>
            <input
              type="text"
              key={`name-${activeSession?.id}`}
              defaultValue={activeSession?.name || ""}
              onBlur={(e) =>
                updateSessionConfig({ name: e.target.value }, true)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm"
              data-testid="input-session-name"
            />
          </div>

          <div>
            <label className="block text-sm text-white/50 mb-1">Provider</label>
            <select
              value={activeSession?.model_provider || modelProvider}
              onChange={(e) =>
                updateSessionConfig({ model_provider: e.target.value as any })
              }
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm [&>option]:bg-slate-900 [&>option]:text-white"
              data-testid="select-provider"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.is_default ? " (default)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-white/50 mb-1">Model</label>
            <select
              value={activeSession?.model_name || ""}
              onChange={(e) => {
                const entry = getModelEntry(
                  activeSession?.model_provider || modelProvider,
                  e.target.value,
                );
                updateSessionConfig({
                  model_name: e.target.value,
                  reasoning_effort: defaultEffortFor(entry),
                });
              }}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm [&>option]:bg-slate-900 [&>option]:text-white"
              data-testid="select-model"
            >
              {(
                providers.find(
                  (p) =>
                    p.id === (activeSession?.model_provider || modelProvider),
                )?.models || availableModels
              ).map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-white/50 mb-1">
              Temperature: {activeSession?.temperature || 0}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={activeSession?.temperature || 0}
              onChange={(e) =>
                updateSessionConfig({ temperature: parseFloat(e.target.value) })
              }
              className="w-full"
              data-testid="slider-temperature"
            />
          </div>

          {(() => {
            const entry = getModelEntry(
              activeSession?.model_provider || modelProvider,
              activeSession?.model_name,
            );
            if (!entry?.reasoning_efforts?.length) return null;
            return (
              <div>
                <label className="block text-sm text-white/50 mb-1">
                  Reasoning Effort
                </label>
                <select
                  value={
                    activeSession?.reasoning_effort ||
                    entry.default_reasoning_effort ||
                    entry.reasoning_efforts[0]
                  }
                  onChange={(e) =>
                    updateSessionConfig({ reasoning_effort: e.target.value })
                  }
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm [&>option]:bg-slate-900 [&>option]:text-white"
                  data-testid="select-reasoning-effort"
                >
                  {entry.reasoning_efforts.map((eff) => (
                    <option key={eff} value={eff}>
                      {REASONING_EFFORT_LABELS[eff] || eff}
                    </option>
                  ))}
                </select>
              </div>
            );
          })()}

          <div>
            <label className="block text-sm text-white/50 mb-1">
              Max Tokens
            </label>
            <input
              type="number"
              key={activeSession?.id}
              defaultValue={activeSession?.max_tokens || 2048}
              onBlur={(e) => {
                const v = parseInt(e.target.value);
                if (!isNaN(v) && v > 0)
                  updateSessionConfig({ max_tokens: v }, true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm"
              data-testid="input-max-tokens"
            />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
            <Layers size={14} />
            Template
          </h2>
          <button
            onClick={() => {
              setShowConfigDrawer(false);
              setShowTemplateModal(true);
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300"
            data-testid="button-apply-template"
          >
            Apply Template
          </button>
        </div>

        {activeSession?.template_name ? (
          <div className="bg-white/[0.05] rounded-lg p-3">
            <p className="text-white text-sm font-medium">
              {activeSession.template_name}
            </p>
          </div>
        ) : (
          <p className="text-white/30 text-sm">No template applied</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
            <Zap size={14} />
            Directives ({activeSession?.directives.length || 0})
          </h2>
          <button
            onClick={() => {
              setShowConfigDrawer(false);
              setShowDirectiveModal(true);
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300"
            data-testid="button-add-directive"
          >
            <Plus size={14} />
          </button>
        </div>

        {!activeSession?.directives.length ? (
          <p className="text-white/30 text-sm">No directives added</p>
        ) : (
          <div className="space-y-2">
            {activeSession.directives.map((d, idx) => (
              <div
                key={idx}
                className="bg-white/[0.05] rounded-lg p-3 relative group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-cyan-400 uppercase">
                      {d.directive_type}
                    </span>
                    <p className="text-white text-sm mt-1 line-clamp-2">
                      {d.content}
                    </p>
                  </div>
                  <button
                    onClick={() => removeDirective(idx)}
                    className="text-white/30 hover:text-red-400 p-1"
                    data-testid={`button-remove-directive-${idx}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
            <BookOpen size={14} />
            Knowledge ({activeSession?.knowledge_items.length || 0})
          </h2>
          <button
            onClick={() => {
              setShowConfigDrawer(false);
              setShowKnowledgeModal(true);
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300"
            data-testid="button-add-knowledge"
          >
            <Plus size={14} />
          </button>
        </div>

        {!activeSession?.knowledge_items.length ? (
          <p className="text-white/30 text-sm">No knowledge added</p>
        ) : (
          <div className="space-y-2">
            {activeSession.knowledge_items.map((k, idx) => (
              <div
                key={k.id || idx}
                className="bg-white/[0.05] rounded-lg p-3 relative group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-blue-400 uppercase">
                      {k.category}
                    </span>
                    <p className="text-white text-sm font-medium mt-1">
                      {k.title}
                    </p>
                    <p className="text-white/50 text-xs mt-1 line-clamp-2">
                      {k.content}
                    </p>
                  </div>
                  <button
                    onClick={() => k.id && removeKnowledge(k.id)}
                    className="text-white/30 hover:text-red-400 p-1"
                    data-testid={`button-remove-knowledge-${idx}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeSession?.attachments && activeSession.attachments.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2 mb-3">
            <Paperclip size={14} />
            Attached Files
          </h2>
          <div className="flex flex-wrap gap-2">
            {activeSession.attachments.map(
              (
                att: {
                  id?: string;
                  filename: string;
                  file_type: string;
                  size_bytes: number;
                },
                idx: number,
              ) => (
                <span
                  key={att.id || idx}
                  className="inline-flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.08] rounded-full px-3 py-1 text-xs text-slate-300 group"
                  data-testid={`chip-attachment-${idx}`}
                >
                  <Paperclip size={12} className="text-cyan-400" />
                  <span className="max-w-[120px] truncate">{att.filename}</span>
                  <span className="text-white/30">{att.file_type}</span>
                  <button
                    onClick={async () => {
                      if (!att.id || !activeSession) return;
                      await apiFetch(
                        `/api/playground/sessions/${activeSession.id}/attachments/${att.id}`,
                        { method: "DELETE" },
                      );
                      const updatedRes = await apiFetch(
                        `/api/playground/sessions/${activeSession.id}`,
                      );
                      if (updatedRes.ok) {
                        const updated = await updatedRes.json();
                        setActiveSession(updated);
                        setSessions((prev) =>
                          prev.map((s) => (s.id === updated.id ? updated : s)),
                        );
                      }
                    }}
                    className="text-white/20 hover:text-red-400 transition-colors ml-0.5"
                    data-testid={`button-remove-attachment-${idx}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ),
            )}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
            <FileText size={14} />
            Persona
          </h2>
        </div>
        <textarea
          key={`persona-${activeSession?.id}`}
          defaultValue={activeSession?.persona || ""}
          onBlur={(e) => updateSessionConfig({ persona: e.target.value }, true)}
          placeholder="Custom persona for the AI..."
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm min-h-[100px] resize-none"
          data-testid="textarea-persona"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
            <Wrench size={14} />
            Tools ({allTools.filter((t) => t.enabled).length}/{allTools.length})
          </h2>
          <Link
            href="/dashboard/tools"
            className="text-xs text-purple-400 hover:text-purple-300"
            data-testid="link-manage-tools"
          >
            Manage
          </Link>
        </div>

        {allTools.length === 0 ? (
          <p className="text-white/30 text-sm" data-testid="text-no-tools">
            No tools configured
          </p>
        ) : (
          <div className="space-y-1" data-testid="list-enabled-tools">
            {allTools.map((tool) => (
              <div
                key={tool.id}
                className={`rounded-lg px-3 py-2 transition-colors ${tool.enabled ? "bg-white/[0.05]" : "bg-white/[0.02] opacity-60"}`}
                data-testid={`tool-item-${tool.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() =>
                      setExpandedToolId(
                        expandedToolId === tool.id ? null : tool.id,
                      )
                    }
                    className="flex items-center gap-2 min-w-0 flex-1 text-left"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tool.type === "custom" ? "bg-orange-400" : "bg-violet-400"}`}
                    />
                    <span
                      className={`text-sm truncate ${tool.enabled ? "text-white" : "text-white/40"}`}
                    >
                      {tool.name}
                    </span>
                    <ChevronDown
                      size={12}
                      className={`text-white/30 flex-shrink-0 transition-transform ${expandedToolId === tool.id ? "rotate-180" : ""}`}
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTool(tool);
                    }}
                    disabled={togglingToolId === tool.id}
                    className={`relative w-8 h-[18px] rounded-full flex-shrink-0 transition-colors ${tool.enabled ? "bg-cyan-500" : "bg-white/20"} ${togglingToolId === tool.id ? "opacity-50" : ""}`}
                    data-testid={`toggle-tool-${tool.id}`}
                  >
                    <span
                      className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${tool.enabled ? "left-[16px]" : "left-[2px]"}`}
                    />
                  </button>
                </div>
                {expandedToolId === tool.id && tool.description && (
                  <p className="text-xs text-white/40 mt-1.5 pl-3.5 leading-relaxed">
                    {tool.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={`${embedded ? "h-full" : "h-[100dvh]"} bg-[#0A0A0B] flex flex-col relative overflow-hidden`}
    >
      <style>{`
        @keyframes ace-aurora { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -20px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.95); } }
        @keyframes ace-shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes ace-movingBorder { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes ace-glow { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        .mp-ace-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); position: relative; overflow: hidden; }
        .mp-ace-card::before { content: ''; position: absolute; inset: 0; background: radial-gradient(400px circle at var(--x, 50%) var(--y, 50%), rgba(6,182,212,0.06), transparent 40%); pointer-events: none; z-index: 0; }
        .mp-shimmer-text { background: linear-gradient(110deg, #06b6d4 0%, #a78bfa 45%, #06b6d4 55%, #ec4899 100%); background-size: 200% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: ace-shimmer 4s ease-in-out infinite; }
        .ace-text-shimmer { background: linear-gradient(110deg, #06b6d4 0%, #a78bfa 45%, #06b6d4 55%, #ec4899 100%); background-size: 200% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: ace-shimmer 4s ease-in-out infinite; }
        .mp-glow-border { position: relative; }
        .mp-glow-border::after { content: ''; position: absolute; inset: -1px; border-radius: inherit; padding: 1px; background: linear-gradient(135deg, rgba(6,182,212,0.3), rgba(139,92,246,0.2), rgba(236,72,153,0.15), rgba(6,182,212,0.3)); background-size: 300% 300%; animation: ace-movingBorder 6s ease infinite; -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; z-index: 1; }
        .mp-screen-glow { position: fixed; inset: 0; z-index: 60; pointer-events: none; border: 1.5px solid transparent; border-image: linear-gradient(135deg, rgba(6,182,212,0.5), rgba(139,92,246,0.4), rgba(236,72,153,0.3), rgba(6,182,212,0.5)) 1; animation: ace-glow 4s ease-in-out infinite; }
      `}</style>

      {!embedded && <div className="mp-screen-glow" />}

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-[30%] -left-[15%] w-[60%] h-[60%] rounded-full bg-cyan-500/[0.04] blur-[120px]"
          style={{ animation: "ace-aurora 12s ease-in-out infinite" }}
        />
        <div
          className="absolute top-[30%] -right-[20%] w-[50%] h-[50%] rounded-full bg-violet-500/[0.03] blur-[100px]"
          style={{
            animation: "ace-aurora 15s ease-in-out infinite",
            animationDelay: "4s",
          }}
        />
        <div
          className="absolute -bottom-[20%] left-[10%] w-[45%] h-[45%] rounded-full bg-blue-500/[0.03] blur-[100px]"
          style={{
            animation: "ace-aurora 18s ease-in-out infinite",
            animationDelay: "8s",
          }}
        />
      </div>

      <header className="border-b border-white/[0.06] bg-[#0A0A0B]/90 backdrop-blur-xl sticky top-0 z-50 flex-shrink-0 relative">
        <div className="px-3 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {!embedded && (
              <Link
                href="/m/dashboard"
                className="text-white/40 hover:text-white transition-colors flex-shrink-0"
              >
                <ArrowLeft size={18} />
              </Link>
            )}
            <div className="flex items-center gap-2 min-w-0">
              <img
                src="/favicon.png"
                alt=""
                className="w-8 h-8 object-contain flex-shrink-0"
                style={{
                  filter:
                    "drop-shadow(0 0 12px rgba(6,182,212,0.5)) drop-shadow(0 0 4px rgba(139,92,246,0.3))",
                }}
              />
              <div
                className="min-w-0 flex flex-col items-center"
                data-testid="text-page-title"
              >
                <div className="flex items-baseline gap-0 mb-0.5">
                  <span className="text-[22px] font-bold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                    Ai
                  </span>
                  <span className="text-[22px] font-light tracking-tight ace-text-shimmer">
                    Assist
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-[1px] w-10 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                  <span className="text-[10px] font-semibold tracking-[0.35em] uppercase ace-text-shimmer">
                    Secure
                  </span>
                  <div className="h-[1px] w-10 bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
                </div>
                <span className="text-[9px] font-semibold tracking-[0.25em] uppercase ace-text-shimmer mt-0.5">
                  Playground
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Sheet
              open={showSessionsDrawer}
              onOpenChange={setShowSessionsDrawer}
            >
              <SheetTrigger asChild>
                <button
                  className="lg:hidden p-2 text-white/50 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
                  data-testid="button-toggle-sessions"
                >
                  <Menu size={20} />
                </button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[300px] bg-[#111113] border-white/10 p-0"
              >
                <SheetHeader className="p-4 border-b border-white/10">
                  <SheetTitle className="text-white">Sessions</SheetTitle>
                </SheetHeader>
                <SessionsPanel />
              </SheetContent>
            </Sheet>

            <Sheet open={showConfigDrawer} onOpenChange={setShowConfigDrawer}>
              <SheetTrigger asChild>
                <button
                  className="lg:hidden p-2 text-white/50 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
                  data-testid="button-toggle-config"
                >
                  <SlidersHorizontal size={20} />
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[320px] bg-[#111113] border-white/10 p-0 overflow-y-auto"
              >
                <SheetHeader className="p-4 border-b border-white/10">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRightSidebarTab("config")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${rightSidebarTab === "config" ? "bg-cyan-500/20 text-cyan-300" : "text-white/50 hover:text-white"}`}
                    >
                      Config
                    </button>
                    <button
                      onClick={() => setRightSidebarTab("artifacts")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${rightSidebarTab === "artifacts" ? "bg-cyan-500/20 text-cyan-300" : "text-white/50 hover:text-white"}`}
                    >
                      Artifacts
                      {savedArtifacts.length > 0 && (
                        <span className="bg-cyan-500/30 text-cyan-200 text-[10px] px-1 rounded-full">
                          {savedArtifacts.length}
                        </span>
                      )}
                    </button>
                  </div>
                </SheetHeader>
                {rightSidebarTab === "config" ? (
                  activeSession && <ConfigPanel />
                ) : (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-white">
                        Artifacts
                      </h3>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setShowConfigDrawer(false);
                            setShowCreateArtifact(true);
                          }}
                          className="text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={loadArtifacts}
                          className="text-white/40 hover:text-white transition-colors"
                        >
                          <RotateCcw size={13} />
                        </button>
                      </div>
                    </div>
                    {selectedArtifactIds.size > 0 && (
                      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2 text-[11px] text-cyan-300">
                        {selectedArtifactIds.size} selected as AI context
                      </div>
                    )}
                    {artifactsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2
                          size={20}
                          className="animate-spin text-cyan-400"
                        />
                      </div>
                    ) : savedArtifacts.length === 0 ? (
                      <div className="text-center py-8 text-white/30 text-sm">
                        <Package
                          size={28}
                          className="mx-auto mb-2 opacity-50"
                        />
                        <p>No artifacts yet</p>
                        <p className="text-xs mt-1 text-white/20">
                          Create or save code blocks
                        </p>
                      </div>
                    ) : (
                      <>
                        {savedArtifacts.map((a) => {
                          const sel = selectedArtifactIds.has(a.id);
                          const mLang = (a.target_stack || "text")
                            .split(/[\s(]/)[0]
                            .toLowerCase();
                          return (
                            <div
                              key={a.id}
                              className={`border rounded-lg p-3 group transition-colors cursor-pointer ${sel ? "bg-cyan-500/10 border-cyan-500/30" : "bg-white/[0.04] border-white/[0.08]"}`}
                              onClick={() => toggleArtifactSelection(a.id)}
                            >
                              <div className="flex items-start gap-2">
                                <div
                                  className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${sel ? "bg-cyan-500 border-cyan-500" : "border-white/20"}`}
                                >
                                  {sel && (
                                    <Check size={10} className="text-white" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  {renamingArtifactId === a.id ? (
                                    <input
                                      type="text"
                                      value={renameArtifactValue}
                                      onChange={(e) =>
                                        setRenameArtifactValue(e.target.value)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter")
                                          submitArtifactRename();
                                        if (e.key === "Escape")
                                          setRenamingArtifactId(null);
                                      }}
                                      onBlur={submitArtifactRename}
                                      onClick={(e) => e.stopPropagation()}
                                      autoFocus
                                      className="w-full bg-white/10 border border-cyan-500/40 rounded px-1.5 py-0.5 text-sm text-white focus:outline-none focus:border-cyan-400 min-w-0"
                                      data-testid={`input-rename-artifact-mobile-${a.id}`}
                                    />
                                  ) : (
                                    <p
                                      className="text-sm text-white truncate cursor-text hover:text-cyan-200 transition-colors"
                                      onClick={(e) =>
                                        startArtifactRename(a.id, a.name, e)
                                      }
                                    >
                                      {a.name}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[11px] text-white/40">
                                      {a.target_stack || "text"}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deployToKeystone(a);
                                      }}
                                      disabled={deployingArtifactId === a.id}
                                      className="text-[11px] text-cyan-400/70 hover:text-cyan-300 transition-colors flex items-center gap-0.5"
                                    >
                                      {deployingArtifactId === a.id ? (
                                        <Loader2
                                          size={10}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <ExternalLink size={10} />
                                      )}
                                      Deploy to KeyStone
                                    </button>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteArtifact(a.id);
                                  }}
                                  className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                              {sel && a.source_code && (
                                <div
                                  className="mt-2 rounded-md overflow-hidden border border-white/[0.06] max-h-[200px] overflow-y-auto"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <SyntaxHighlighter
                                    language={mLang}
                                    style={oneDark}
                                    customStyle={{
                                      margin: 0,
                                      padding: "8px 10px",
                                      fontSize: "11px",
                                      lineHeight: "1.4",
                                      background: "rgba(0,0,0,0.3)",
                                    }}
                                    wrapLongLines
                                  >
                                    {a.source_code}
                                  </SyntaxHighlighter>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </SheetContent>
            </Sheet>

            {activeSession && (
              <button
                onClick={openDeployModal}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                data-testid="button-deploy-agent"
              >
                <Rocket size={16} />
                <span className="hidden sm:inline">Deploy</span>
              </button>
            )}

            <button
              onClick={() => setShowNewSessionModal(true)}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:bg-cyan-600 text-white rounded-lg transition-colors text-sm"
              data-testid="button-new-session"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">New Session</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside
          className={`hidden lg:flex flex-col border-r border-white/10 bg-white/[0.02] flex-shrink-0 transition-all duration-300 ${leftSidebarCollapsed ? "w-12" : "w-72"}`}
        >
          <button
            onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
            className="p-3 text-white/50 hover:text-white hover:bg-white/[0.04] transition-colors border-b border-white/10"
            title={
              leftSidebarCollapsed ? "Expand sessions" : "Collapse sessions"
            }
          >
            <ChevronRight
              size={16}
              className={`transition-transform ${leftSidebarCollapsed ? "" : "rotate-180"}`}
            />
          </button>
          {!leftSidebarCollapsed && <SessionsPanel />}
        </aside>

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {activeSession ? (
            <>
              <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-3 sm:p-6"
              >
                <div className="max-w-3xl mx-auto space-y-4">
                  {activeSession.messages.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border border-white/[0.06] flex items-center justify-center">
                        <img
                          src="/favicon.png"
                          alt=""
                          className="w-14 h-14 object-contain"
                          style={{
                            filter:
                              "drop-shadow(0 0 12px rgba(6,182,212,0.5)) drop-shadow(0 0 4px rgba(139,92,246,0.3))",
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2.5 mb-1 justify-center">
                        <div className="flex items-baseline gap-0">
                          <span className="text-[22px] font-bold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                            Ai
                          </span>
                          <span className="text-[22px] font-light tracking-tight ace-text-shimmer">
                            Assist
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 justify-center">
                        <div className="h-[1px] w-10 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                        <span className="text-[10px] font-semibold tracking-[0.35em] uppercase ace-text-shimmer">
                          Secure
                        </span>
                        <div className="h-[1px] w-10 bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
                      </div>
                      <div className="mt-1 mb-2">
                        <span className="text-[11px] font-semibold tracking-[0.25em] uppercase ace-text-shimmer">
                          Playground
                        </span>
                      </div>
                      <p className="text-white/40 max-w-md mx-auto text-sm">
                        Configure your AI with the settings panel, then send a
                        message to start.
                      </p>
                    </div>
                  ) : (
                    activeSession.messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                            msg.role === "user"
                              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/10"
                              : "mp-ace-card rounded-2xl text-white/90"
                          }`}
                          data-testid={`message-${msg.id}`}
                        >
                          {msg.role !== "user" ? (
                            <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  code({
                                    node,
                                    className,
                                    children,
                                    ...props
                                  }) {
                                    const match = /language-(\w+)/.exec(
                                      className || "",
                                    );
                                    const isInline =
                                      !match &&
                                      !String(children).includes("\n");
                                    return isInline ? (
                                      <code
                                        className="bg-white/[0.08] px-1.5 py-0.5 rounded text-cyan-300 text-xs"
                                        {...props}
                                      >
                                        {children}
                                      </code>
                                    ) : (
                                      <div className="my-3 rounded-lg overflow-hidden">
                                        <div className="bg-white/[0.05] px-3 py-1.5 text-xs text-white/50 border-b border-white/[0.08] flex items-center justify-between">
                                          <span>{match?.[1] || "code"}</span>
                                          <div className="flex items-center gap-1.5">
                                            {(() => {
                                              const extractText = (
                                                node: any,
                                              ): string => {
                                                if (typeof node === "string")
                                                  return node;
                                                if (Array.isArray(node))
                                                  return node
                                                    .map(extractText)
                                                    .join("");
                                                if (node?.props?.children)
                                                  return extractText(
                                                    node.props.children,
                                                  );
                                                return String(node ?? "");
                                              };
                                              const codeStr = extractText(
                                                children,
                                              ).replace(/\n$/, "");
                                              const lang = match?.[1] || "text";
                                              const bk = `${lang}:${codeStr.slice(0, 50)}`;
                                              const isSaved =
                                                savedCodeBlocks.has(bk);
                                              const isSaving =
                                                savingCodeBlock === bk;
                                              const isUpdating =
                                                updatingCodeBlock === bk;
                                              const isUpdated =
                                                updatedCodeBlocks.has(bk);
                                              const isCopied =
                                                copiedCodeBlock === bk;
                                              const hasSelected =
                                                selectedArtifactIds.size > 0;
                                              return (
                                                <>
                                                  {hasSelected && (
                                                    <button
                                                      onClick={() => {
                                                        const tid =
                                                          Array.from(
                                                            selectedArtifactIds,
                                                          )[0];
                                                        updateArtifactCode(
                                                          tid,
                                                          codeStr,
                                                          bk,
                                                        );
                                                      }}
                                                      disabled={
                                                        isUpdating || isUpdated
                                                      }
                                                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${isUpdated ? "bg-green-500/20 text-green-400" : "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 hover:text-amber-300"}`}
                                                      data-testid={`button-update-artifact-${msg.id}`}
                                                    >
                                                      {isUpdating ? (
                                                        <Loader2
                                                          size={11}
                                                          className="animate-spin"
                                                        />
                                                      ) : isUpdated ? (
                                                        <>
                                                          <Check size={11} />
                                                          <span>Updated</span>
                                                        </>
                                                      ) : (
                                                        <>
                                                          <RefreshCw
                                                            size={11}
                                                          />
                                                          <span>Update</span>
                                                        </>
                                                      )}
                                                    </button>
                                                  )}
                                                  <button
                                                    onClick={() =>
                                                      saveAsArtifact(
                                                        codeStr,
                                                        lang,
                                                      )
                                                    }
                                                    disabled={
                                                      isSaved || isSaving
                                                    }
                                                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${isSaved ? "bg-green-500/20 text-green-400" : "bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300"}`}
                                                    data-testid={`button-save-artifact-${msg.id}`}
                                                  >
                                                    {isSaving ? (
                                                      <Loader2
                                                        size={11}
                                                        className="animate-spin"
                                                      />
                                                    ) : isSaved ? (
                                                      <>
                                                        <Check size={11} />
                                                        <span>Saved</span>
                                                      </>
                                                    ) : (
                                                      <>
                                                        <Save size={11} />
                                                        <span>Save</span>
                                                      </>
                                                    )}
                                                  </button>
                                                  <button
                                                    onClick={() => {
                                                      navigator.clipboard.writeText(
                                                        codeStr,
                                                      );
                                                      setCopiedCodeBlock(bk);
                                                      toast.success("Copied");
                                                      setTimeout(
                                                        () =>
                                                          setCopiedCodeBlock(
                                                            null,
                                                          ),
                                                        2000,
                                                      );
                                                    }}
                                                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${isCopied ? "bg-green-500/20 text-green-400" : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"}`}
                                                    data-testid={`button-copy-code-${msg.id}`}
                                                  >
                                                    {isCopied ? (
                                                      <>
                                                        <Check size={11} />
                                                        <span>Copied</span>
                                                      </>
                                                    ) : (
                                                      <>
                                                        <Copy size={11} />
                                                        <span>Copy</span>
                                                      </>
                                                    )}
                                                  </button>
                                                </>
                                              );
                                            })()}
                                          </div>
                                        </div>
                                        <SyntaxHighlighter
                                          style={oneDark}
                                          language={match?.[1] || "text"}
                                          PreTag="div"
                                          customStyle={{
                                            margin: 0,
                                            borderRadius: 0,
                                            fontSize: "0.8rem",
                                            padding: "1rem",
                                            background: "#1e293b",
                                            overflowX: "auto",
                                            maxWidth: "100%",
                                          }}
                                          codeTagProps={{
                                            style: {
                                              fontFamily:
                                                'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
                                            },
                                          }}
                                          wrapLines={true}
                                          wrapLongLines={true}
                                        >
                                          {String(children).replace(/\n$/, "")}
                                        </SyntaxHighlighter>
                                      </div>
                                    );
                                  },
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p>{msg.content}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs opacity-60">
                            <span>{formatTime(msg.timestamp)}</span>
                            {msg.tokens_used && (
                              <>
                                <span>•</span>
                                <span>{msg.tokens_used} tokens</span>
                              </>
                            )}
                            {msg.role !== "user" && (
                              <button
                                onClick={() =>
                                  handleListenMessage(msg.id, msg.content)
                                }
                                className={`ml-auto p-1 rounded transition-colors ${
                                  playingMessageId === msg.id
                                    ? "text-cyan-400"
                                    : "hover:text-white"
                                }`}
                                disabled={ttsLoading === msg.id}
                                title={
                                  playingMessageId === msg.id
                                    ? "Stop playback"
                                    : "Listen to response"
                                }
                                data-testid={`button-listen-${msg.id}`}
                              >
                                {ttsLoading === msg.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : playingMessageId === msg.id ? (
                                  <VolumeX size={14} />
                                ) : (
                                  <Volume2 size={14} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                  {isStreaming && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div
                        className="max-w-[85%] rounded-2xl px-4 py-3 mp-ace-card text-white/90"
                        data-testid="streaming-message"
                      >
                        {tokenProgress.max > 0 && (
                          <div
                            className="mb-3"
                            data-testid="token-progress-bar"
                          >
                            <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
                              <span className="flex items-center gap-1">
                                <Zap size={10} className="text-cyan-400" />
                                Token Budget
                              </span>
                              <span>
                                {tokenProgress.current} / {tokenProgress.max}
                              </span>
                            </div>
                            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full rounded-full transition-colors ${
                                  tokenProgress.current / tokenProgress.max >
                                  0.85
                                    ? "bg-red-500"
                                    : tokenProgress.current /
                                          tokenProgress.max >
                                        0.6
                                      ? "bg-amber-500"
                                      : "bg-cyan-500"
                                }`}
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${Math.min(100, (tokenProgress.current / tokenProgress.max) * 100)}%`,
                                }}
                                transition={{ duration: 0.15, ease: "linear" }}
                              />
                            </div>
                          </div>
                        )}
                        {streamingThinking &&
                          !streamingContent &&
                          !streamingToolStatus && (
                            <div className="flex items-center gap-2 text-white/40 text-sm">
                              <Loader2 size={14} className="animate-spin" />
                              <span>Thinking...</span>
                            </div>
                          )}
                        {streamingToolStatus && (
                          <div
                            className="mb-3"
                            data-testid="tool-execution-indicator"
                          >
                            <div className="p-3 rounded-lg bg-violet-500/[0.08] border border-violet-500/15">
                              <div className="flex items-center gap-2 text-xs text-violet-300/80 mb-1.5">
                                <div className="w-4 h-4 rounded-full bg-violet-500/20 flex items-center justify-center">
                                  <Loader2
                                    size={10}
                                    className="animate-spin text-violet-400"
                                  />
                                </div>
                                <span className="font-medium">
                                  Executing Tool
                                  {streamingToolStatus.count &&
                                  streamingToolStatus.count > 1
                                    ? "s"
                                    : ""}
                                </span>
                              </div>
                              {streamingToolStatus.toolName && (
                                <div className="flex items-center gap-2 ml-6">
                                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                                  <span className="text-[11px] text-white/50 font-mono">
                                    {streamingToolStatus.toolName}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {streamingContent ? (
                          <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                code({ node, className, children, ...props }) {
                                  const match = /language-(\w+)/.exec(
                                    className || "",
                                  );
                                  const isInline =
                                    !match && !String(children).includes("\n");
                                  return isInline ? (
                                    <code
                                      className="bg-white/[0.08] px-1.5 py-0.5 rounded text-cyan-300 text-xs"
                                      {...props}
                                    >
                                      {children}
                                    </code>
                                  ) : (
                                    <div className="my-3 rounded-lg overflow-hidden">
                                      <div className="bg-white/[0.05] px-3 py-1.5 text-xs text-white/50 border-b border-white/[0.08] flex items-center justify-between">
                                        <span>{match?.[1] || "code"}</span>
                                        <span className="flex items-center gap-1 text-[10px] text-cyan-400/60">
                                          <Zap size={9} />
                                          streaming
                                        </span>
                                      </div>
                                      <SyntaxHighlighter
                                        style={oneDark}
                                        language={match?.[1] || "text"}
                                        PreTag="div"
                                        customStyle={{
                                          margin: 0,
                                          borderRadius: 0,
                                          fontSize: "0.8rem",
                                          padding: "1rem",
                                          background: "#1e293b",
                                          overflowX: "auto",
                                          maxWidth: "100%",
                                        }}
                                        codeTagProps={{
                                          style: {
                                            fontFamily:
                                              'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
                                          },
                                        }}
                                        wrapLines
                                        wrapLongLines
                                      >
                                        {String(children).replace(/\n$/, "")}
                                      </SyntaxHighlighter>
                                    </div>
                                  );
                                },
                              }}
                            >
                              {streamingContent}
                            </ReactMarkdown>
                          </div>
                        ) : !streamingThinking && !streamingToolStatus ? (
                          <div className="flex items-center gap-2 text-white/40 text-sm">
                            <Loader2 size={14} className="animate-spin" />
                            <span>Generating...</span>
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  )}
                  {(gitCloneOffer || gitCloneDone) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div
                        className="mp-ace-card rounded-2xl px-4 py-3 w-full sm:max-w-[420px]"
                        data-testid="card-git-clone"
                      >
                        {gitCloneDone ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <CheckCircle2
                                size={16}
                                className="text-emerald-400 shrink-0"
                              />
                              <span className="text-sm text-white/90 font-medium">
                                Cloned {gitCloneDone.repo}
                              </span>
                              <button
                                onClick={() => setGitCloneDone(null)}
                                className="ml-auto text-white/40 hover:text-white/70"
                                data-testid="button-git-clone-dismiss"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            <p className="text-xs text-white/50">
                              {gitCloneDone.files} items copied into your
                              KeyStone environment.
                            </p>
                            <button
                              onClick={() =>
                                setLocation(`/keystone/${gitCloneDone.envId}`)
                              }
                              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-cyan-500/10 hover:opacity-90 transition-opacity"
                              data-testid="button-open-keystone"
                            >
                              <ExternalLink size={14} />
                              Open in KeyStone
                            </button>
                          </div>
                        ) : gitCloneOffer ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <GitBranch
                                size={16}
                                className="text-cyan-400 shrink-0"
                              />
                              <span className="text-sm text-white/90 font-medium">
                                Clone repository
                              </span>
                              <button
                                onClick={() => setGitCloneOffer(null)}
                                className="ml-auto text-white/40 hover:text-white/70"
                                data-testid="button-git-clone-cancel"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            <p className="text-xs text-white/50 break-all">
                              {gitCloneOffer.url}
                            </p>
                            <p className="text-xs text-white/60">
                              Git repos live in KeyStone environments. Pick
                              where this one should go:
                            </p>
                            <select
                              value={gitCloneTarget}
                              onChange={(e) =>
                                setGitCloneTarget(e.target.value)
                              }
                              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-cyan-500/50"
                              data-testid="select-git-clone-env"
                            >
                              <option value="__new__">
                                New environment: {gitCloneOffer.repo}
                              </option>
                              {gitCloneEnvs.map((env) => (
                                <option key={env.id} value={env.id}>
                                  {env.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={handleGitClone}
                              disabled={gitCloneBusy}
                              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-cyan-500/10 hover:opacity-90 transition-opacity disabled:opacity-50"
                              data-testid="button-git-clone-confirm"
                            >
                              {gitCloneBusy ? (
                                <>
                                  <Loader2
                                    size={14}
                                    className="animate-spin"
                                  />
                                  Cloning...
                                </>
                              ) : (
                                <>
                                  <GitBranch size={14} />
                                  Clone
                                </>
                              )}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <AnimatePresence>
                {!shouldAutoScroll && activeSession.messages.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    onClick={scrollToBottom}
                    className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:bg-cyan-600 text-white rounded-full shadow-lg flex items-center gap-2 z-10"
                    data-testid="button-scroll-to-bottom"
                  >
                    <ChevronDown size={16} />
                    <span className="text-sm">New messages</span>
                  </motion.button>
                )}
              </AnimatePresence>

              <div className="border-t border-white/10 p-2 sm:p-4 bg-[#0A0A0B]/90 flex-shrink-0">
                <div className="max-w-3xl mx-auto space-y-2">
                  {/* AI Assist Bar */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-white/30 font-medium">
                      AI Assist:
                    </span>
                    <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-1">
                      {[
                        {
                          action: "explain" as VoiceActionType,
                          icon: Lightbulb,
                          label: "Explain",
                        },
                        {
                          action: "summarize" as VoiceActionType,
                          icon: FileText,
                          label: "Summarize",
                        },
                        {
                          action: "extract-actions" as VoiceActionType,
                          icon: ListChecks,
                          label: "Actions",
                        },
                        {
                          action: "decision" as VoiceActionType,
                          icon: Target,
                          label: "Decide",
                        },
                      ].map(({ action, icon: Icon, label }) => (
                        <button
                          key={action}
                          onClick={() => handleVoiceAction(action)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                            activeVoiceAction === action
                              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                              : "text-white/50 hover:text-white hover:bg-white/[0.08]"
                          }`}
                          title={`${label} (click to toggle)`}
                          data-testid={`button-ai-assist-${action}`}
                        >
                          <Icon size={14} />
                          <span className="hidden sm:inline">{label}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={cycleVoiceScope}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        voiceActionScope === "off"
                          ? "bg-white/[0.04] text-white/30"
                          : voiceActionScope === "next_only"
                            ? "bg-amber-600/20 text-amber-400 border border-amber-500/30"
                            : "bg-green-600/20 text-green-400 border border-green-500/30"
                      }`}
                      title={`Scope: ${voiceActionScope === "off" ? "Off" : voiceActionScope === "next_only" ? "Next message only" : "All future messages"}`}
                      data-testid="button-ai-assist-scope"
                    >
                      {voiceActionScope === "off" && "Off"}
                      {voiceActionScope === "next_only" && "Next Only"}
                      {voiceActionScope === "all_future" && "Always On"}
                    </button>
                    {activeVoiceAction && voiceActionScope !== "off" && (
                      <span className="text-xs text-cyan-400">
                        {activeVoiceAction.charAt(0).toUpperCase() +
                          activeVoiceAction.slice(1)}{" "}
                        active
                      </span>
                    )}

                    {/* Web Tools Divider */}
                    <div className="w-px h-5 bg-white/[0.08] mx-1 hidden sm:block" />

                    {/* Web Tools Toggle */}
                    <span className="text-xs text-white/30 font-medium hidden sm:inline">
                      Web:
                    </span>
                    <div className="flex items-center gap-0.5 bg-white/[0.04] rounded-lg p-0.5">
                      <button
                        onClick={() => setWebTool("none")}
                        className={`px-2 py-1 rounded-md text-xs transition-colors ${
                          webTool === "none"
                            ? "bg-white/[0.08] text-white"
                            : "text-white/30 hover:text-slate-300"
                        }`}
                        title="Web tools disabled"
                        data-testid="button-web-tool-off"
                      >
                        Off
                      </button>
                      <button
                        onClick={() => setWebTool("search")}
                        className={`px-2 py-1 rounded-md text-xs transition-colors ${
                          webTool === "search"
                            ? "bg-blue-600 text-white"
                            : "text-white/30 hover:text-slate-300"
                        }`}
                        title="Enable web search"
                        data-testid="button-web-tool-search"
                      >
                        Search
                      </button>
                      <button
                        onClick={() => setWebTool("visit")}
                        className={`px-2 py-1 rounded-md text-xs transition-colors ${
                          webTool === "visit"
                            ? "bg-emerald-600 text-white"
                            : "text-white/30 hover:text-slate-300"
                        }`}
                        title="Enable URL visiting"
                        data-testid="button-web-tool-visit"
                      >
                        Visit
                      </button>
                    </div>
                    <button
                      onClick={() => setReasoningEnabled(!reasoningEnabled)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                        reasoningEnabled
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "text-white/30 hover:text-white/50 hover:bg-white/[0.04]"
                      }`}
                      title={
                        reasoningEnabled
                          ? "Reasoning mode ON — LLM will show its thinking"
                          : "Enable reasoning mode"
                      }
                      data-testid="button-reasoning-toggle"
                    >
                      <Lightbulb size={12} />
                      <span className="hidden sm:inline">Think</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => setShowVoiceSession(true)}
                      className="p-2.5 sm:p-3 rounded-xl text-white/50 hover:text-cyan-400 hover:bg-white/[0.05] transition-all flex-shrink-0 group"
                      title="Start voice conversation"
                      data-testid="button-voice-session"
                    >
                      <Phone
                        size={18}
                        className="group-hover:text-cyan-400 transition-colors"
                      />
                    </button>
                    <button
                      onClick={clearMessages}
                      className="hidden sm:block p-2 text-white/50 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
                      title="Clear messages"
                      data-testid="button-clear-messages"
                    >
                      <RotateCcw size={18} />
                    </button>
                    {selectedArtifactIds.size > 0 && (
                      <div
                        className="flex flex-wrap gap-1.5 mb-2 px-1"
                        data-testid="selected-artifacts-bar"
                      >
                        <span className="text-[10px] text-white/30 self-center mr-1">
                          Context:
                        </span>
                        {savedArtifacts
                          .filter((a) => selectedArtifactIds.has(a.id))
                          .map((a) => (
                            <span
                              key={a.id}
                              className="inline-flex items-center gap-1 bg-cyan-500/15 text-cyan-300 text-[11px] px-2 py-0.5 rounded-full border border-cyan-500/20"
                            >
                              <Code2 size={10} />
                              {a.name}
                              <button
                                onClick={() => toggleArtifactSelection(a.id)}
                                className="hover:text-white ml-0.5"
                              >
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                      </div>
                    )}
                    <div className="flex-1 relative flex items-center gap-2">
                      <input
                        ref={messageInputRef}
                        type="text"
                        defaultValue=""
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            setMessageInput(e.currentTarget.value);
                            setTimeout(sendMessage, 0);
                          }
                        }}
                        placeholder={
                          selectedArtifactIds.size > 0
                            ? `Chat with ${selectedArtifactIds.size} artifact(s) as context...`
                            : isListening
                              ? "Listening..."
                              : "Type a message..."
                        }
                        className={`w-full bg-white/[0.05] border rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white placeholder-white/20 focus:outline-none text-sm sm:text-base ${
                          isListening
                            ? "border-red-500/30"
                            : "border-white/[0.08] focus:border-cyan-500"
                        }`}
                        disabled={isSending}
                        data-testid="input-message"
                      />
                      {voiceSupported && (
                        <button
                          onClick={toggleListening}
                          className={`p-2.5 sm:p-3 rounded-xl transition-all flex-shrink-0 ${
                            isListening
                              ? "bg-red-500/20 text-red-400 animate-pulse border border-red-500/30"
                              : "text-white/50 hover:text-white hover:bg-white/[0.05]"
                          }`}
                          title={
                            isListening ? "Click to stop" : "Click to speak"
                          }
                          data-testid="button-voice-input"
                        >
                          {isListening ? (
                            <MicOff size={18} />
                          ) : (
                            <Mic size={18} />
                          )}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (messageInputRef.current)
                          setMessageInput(messageInputRef.current.value);
                        setTimeout(sendMessage, 0);
                      }}
                      disabled={isSending}
                      className="p-2.5 sm:p-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:bg-cyan-600 disabled:bg-white/[0.08] disabled:cursor-not-allowed text-white rounded-xl transition-colors flex-shrink-0"
                      data-testid="button-send-message"
                    >
                      {isSending ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Send size={18} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center relative z-10">
              <div className="text-center px-6">
                <div className="w-28 h-28 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border border-white/[0.06] flex items-center justify-center mp-glow-border">
                  <img
                    src="/favicon.png"
                    alt=""
                    className="w-16 h-16 object-contain"
                    style={{
                      filter:
                        "drop-shadow(0 0 12px rgba(6,182,212,0.5)) drop-shadow(0 0 4px rgba(139,92,246,0.3))",
                    }}
                  />
                </div>
                <div className="flex items-center gap-2.5 mb-1 justify-center">
                  <div className="flex items-baseline gap-0">
                    <span className="text-[22px] font-bold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                      Ai
                    </span>
                    <span className="text-[22px] font-light tracking-tight ace-text-shimmer">
                      Assist
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <div className="h-[1px] w-10 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                  <span className="text-[10px] font-semibold tracking-[0.35em] uppercase ace-text-shimmer">
                    Secure
                  </span>
                  <div className="h-[1px] w-10 bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
                </div>
                <div className="mt-1 mb-3">
                  <span className="text-xs font-semibold tracking-[0.25em] uppercase ace-text-shimmer">
                    Playground
                  </span>
                </div>
                <p className="text-white/40 mb-5 text-sm">
                  Create or select a session to start building with AI
                </p>
                <button
                  onClick={() => setShowNewSessionModal(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
                  data-testid="button-create-session"
                >
                  Create Session
                </button>
              </div>
            </div>
          )}
        </main>

        {activeSession && (
          <aside
            className={`hidden lg:flex flex-col border-l border-white/10 bg-white/[0.02] flex-shrink-0 transition-all duration-300 ${rightSidebarCollapsed ? "w-12" : "w-80"}`}
          >
            <div className="flex items-center border-b border-white/10">
              <button
                onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
                className="p-3 text-white/50 hover:text-white hover:bg-white/[0.04] transition-colors"
                title={rightSidebarCollapsed ? "Expand" : "Collapse"}
              >
                <ChevronRight
                  size={16}
                  className={`transition-transform ${rightSidebarCollapsed ? "rotate-180" : ""}`}
                />
              </button>
              {!rightSidebarCollapsed && (
                <div className="flex flex-1">
                  <button
                    onClick={() => setRightSidebarTab("config")}
                    className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${rightSidebarTab === "config" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-white/50 hover:text-white"}`}
                    data-testid="tab-config"
                  >
                    <SlidersHorizontal size={13} /> Config
                  </button>
                  <button
                    onClick={() => setRightSidebarTab("artifacts")}
                    className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${rightSidebarTab === "artifacts" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-white/50 hover:text-white"}`}
                    data-testid="tab-artifacts"
                  >
                    <Package size={13} /> Artifacts
                    {savedArtifacts.length > 0 && (
                      <span className="bg-cyan-500/20 text-cyan-300 text-[10px] px-1.5 rounded-full">
                        {savedArtifacts.length}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
            {!rightSidebarCollapsed && (
              <div className="flex-1 overflow-y-auto">
                {rightSidebarTab === "config" ? (
                  <ConfigPanel />
                ) : (
                  <div className="p-4 space-y-3" data-testid="panel-artifacts">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-white">
                        Artifacts
                      </h3>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setShowCreateArtifact(true)}
                          className="text-cyan-400 hover:text-cyan-300 transition-colors"
                          title="Create artifact"
                          data-testid="button-create-artifact"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={loadArtifacts}
                          className="text-white/40 hover:text-white transition-colors"
                          title="Refresh"
                        >
                          <RotateCcw size={13} />
                        </button>
                      </div>
                    </div>
                    {selectedArtifactIds.size > 0 && (
                      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2 text-[11px] text-cyan-300">
                        {selectedArtifactIds.size} artifact(s) selected as
                        context — the AI can see and collaborate on these
                      </div>
                    )}
                    {artifactsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2
                          size={20}
                          className="animate-spin text-cyan-400"
                        />
                      </div>
                    ) : savedArtifacts.length === 0 ? (
                      <div className="text-center py-8 text-white/30 text-sm">
                        <Package
                          size={28}
                          className="mx-auto mb-2 opacity-50"
                        />
                        <p>No artifacts yet</p>
                        <p className="text-xs mt-1 text-white/20">
                          Create or save code blocks to build your collection
                        </p>
                      </div>
                    ) : (
                      <>
                        {savedArtifacts.map((artifact) => {
                          const isSelected = selectedArtifactIds.has(
                            artifact.id,
                          );
                          const lang = (artifact.target_stack || "text")
                            .split(/[\s(]/)[0]
                            .toLowerCase();
                          return (
                            <div
                              key={artifact.id}
                              className={`border rounded-lg p-3 group transition-colors cursor-pointer ${isSelected ? "bg-cyan-500/10 border-cyan-500/30" : "bg-white/[0.04] border-white/[0.08] hover:border-cyan-500/20"}`}
                              onClick={() =>
                                toggleArtifactSelection(artifact.id)
                              }
                              data-testid={`artifact-card-${artifact.id}`}
                            >
                              <div className="flex items-start gap-2">
                                <div
                                  className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? "bg-cyan-500 border-cyan-500" : "border-white/20"}`}
                                >
                                  {isSelected && (
                                    <Check size={10} className="text-white" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  {renamingArtifactId === artifact.id ? (
                                    <input
                                      type="text"
                                      value={renameArtifactValue}
                                      onChange={(e) =>
                                        setRenameArtifactValue(e.target.value)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter")
                                          submitArtifactRename();
                                        if (e.key === "Escape")
                                          setRenamingArtifactId(null);
                                      }}
                                      onBlur={submitArtifactRename}
                                      onClick={(e) => e.stopPropagation()}
                                      autoFocus
                                      className="w-full bg-white/10 border border-cyan-500/40 rounded px-1.5 py-0.5 text-sm text-white focus:outline-none focus:border-cyan-400 min-w-0"
                                      data-testid={`input-rename-artifact-${artifact.id}`}
                                    />
                                  ) : (
                                    <p
                                      className="text-sm text-white truncate cursor-text hover:text-cyan-200 transition-colors"
                                      onClick={(e) =>
                                        startArtifactRename(
                                          artifact.id,
                                          artifact.name,
                                          e,
                                        )
                                      }
                                      data-testid={`text-artifact-name-${artifact.id}`}
                                    >
                                      {artifact.name}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[11px] text-white/40">
                                      {artifact.target_stack || "text"}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deployToKeystone(artifact);
                                      }}
                                      disabled={
                                        deployingArtifactId === artifact.id
                                      }
                                      className="text-[11px] text-cyan-400/70 hover:text-cyan-300 transition-colors flex items-center gap-0.5"
                                      data-testid={`link-deploy-keystone-${artifact.id}`}
                                    >
                                      {deployingArtifactId === artifact.id ? (
                                        <Loader2
                                          size={10}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <ExternalLink size={10} />
                                      )}
                                      Deploy to KeyStone
                                    </button>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteArtifact(artifact.id);
                                  }}
                                  className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                  title="Delete"
                                  data-testid={`button-delete-artifact-${artifact.id}`}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                              {isSelected && artifact.source_code && (
                                <div
                                  className="mt-2 rounded-md overflow-hidden border border-white/[0.06] max-h-[200px] overflow-y-auto"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <SyntaxHighlighter
                                    language={lang}
                                    style={oneDark}
                                    customStyle={{
                                      margin: 0,
                                      padding: "8px 10px",
                                      fontSize: "11px",
                                      lineHeight: "1.4",
                                      background: "rgba(0,0,0,0.3)",
                                    }}
                                    wrapLongLines
                                    data-testid={`code-preview-${artifact.id}`}
                                  >
                                    {artifact.source_code}
                                  </SyntaxHighlighter>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </aside>
        )}
      </div>

      <AnimatePresence>
        {showNewSessionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowNewSessionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111113] border border-white/10 rounded-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white mb-4">New Session</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/50 mb-1">
                    Session Name
                  </label>
                  <input
                    type="text"
                    value={newSession.name}
                    onChange={(e) =>
                      setNewSession((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white"
                    data-testid="input-new-session-name"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-1">
                    Provider
                  </label>
                  <select
                    value={newSessionProvider}
                    onChange={(e) => setNewSessionProvider(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white [&>option]:bg-slate-900 [&>option]:text-white"
                    data-testid="select-new-session-provider"
                  >
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.is_default ? " (default)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-1">
                    Model
                  </label>
                  <select
                    value={newSession.model_name}
                    onChange={(e) => {
                      const entry = newSessionModels.find(
                        (m) => m.id === e.target.value,
                      );
                      setNewSession((prev) => ({
                        ...prev,
                        model_name: e.target.value,
                        reasoning_effort: defaultEffortFor(entry),
                      }));
                    }}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white [&>option]:bg-slate-900 [&>option]:text-white"
                    data-testid="select-new-session-model"
                  >
                    {newSessionModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-1">
                    Temperature: {newSession.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={newSession.temperature}
                    onChange={(e) =>
                      setNewSession((prev) => ({
                        ...prev,
                        temperature: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full"
                    data-testid="slider-new-session-temperature"
                  />
                </div>

                {(() => {
                  const entry = newSessionModels.find(
                    (m) => m.id === newSession.model_name,
                  );
                  if (!entry?.reasoning_efforts?.length) return null;
                  return (
                    <div>
                      <label className="block text-sm text-white/50 mb-1">
                        Reasoning Effort
                      </label>
                      <select
                        value={
                          newSession.reasoning_effort ||
                          entry.default_reasoning_effort ||
                          entry.reasoning_efforts[0]
                        }
                        onChange={(e) =>
                          setNewSession((prev) => ({
                            ...prev,
                            reasoning_effort: e.target.value,
                          }))
                        }
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white [&>option]:bg-slate-900 [&>option]:text-white"
                        data-testid="select-new-session-reasoning-effort"
                      >
                        {entry.reasoning_efforts.map((eff) => (
                          <option key={eff} value={eff}>
                            {REASONING_EFFORT_LABELS[eff] || eff}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })()}

                <div>
                  <label className="block text-sm text-white/50 mb-1">
                    Session Duration
                  </label>
                  <select
                    value={newSession.ttl_hours}
                    onChange={(e) =>
                      setNewSession((prev) => ({
                        ...prev,
                        ttl_hours: parseInt(e.target.value),
                      }))
                    }
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white [&>option]:bg-slate-900 [&>option]:text-white"
                    data-testid="select-new-session-ttl"
                  >
                    <option value={1}>1 hour</option>
                    <option value={6}>6 hours</option>
                    <option value={24}>24 hours</option>
                    <option value={72}>3 days</option>
                    <option value={168}>1 week</option>
                    <option value={0}>Unlimited</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowNewSessionModal(false)}
                  className="flex-1 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-white/[0.05]"
                  data-testid="button-cancel-new-session"
                >
                  Cancel
                </button>
                <button
                  onClick={createSession}
                  className="flex-1 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:bg-cyan-600 text-white rounded-lg"
                  data-testid="button-confirm-new-session"
                >
                  Create Session
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDirectiveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDirectiveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111113] border border-white/10 rounded-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white mb-4">
                Add Directive
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/50 mb-1">
                    Type
                  </label>
                  <select
                    value={newDirective.directive_type}
                    onChange={(e) =>
                      setNewDirective((prev) => ({
                        ...prev,
                        directive_type: e.target.value,
                      }))
                    }
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white [&>option]:bg-slate-900 [&>option]:text-white"
                    data-testid="select-directive-type"
                  >
                    {DIRECTIVE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-1">
                    Content
                  </label>
                  <textarea
                    value={newDirective.content}
                    onChange={(e) =>
                      setNewDirective((prev) => ({
                        ...prev,
                        content: e.target.value,
                      }))
                    }
                    placeholder="Enter directive content..."
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white min-h-[100px] resize-none"
                    data-testid="textarea-directive-content"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-1">
                    Priority: {newDirective.priority}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={newDirective.priority}
                    onChange={(e) =>
                      setNewDirective((prev) => ({
                        ...prev,
                        priority: parseInt(e.target.value),
                      }))
                    }
                    className="w-full"
                    data-testid="slider-directive-priority"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDirectiveModal(false)}
                  className="flex-1 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-white/[0.05]"
                  data-testid="button-cancel-directive"
                >
                  Cancel
                </button>
                <button
                  onClick={addDirective}
                  disabled={!newDirective.content.trim()}
                  className="flex-1 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:bg-cyan-600 disabled:bg-white/[0.08] text-white rounded-lg"
                  data-testid="button-confirm-directive"
                >
                  Add Directive
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showKnowledgeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowKnowledgeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111113] border border-white/10 rounded-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white mb-4">
                Add Knowledge
              </h2>

              <div
                className="flex gap-1 mb-4 bg-white/[0.05] rounded-lg p-1"
                data-testid="knowledge-mode-toggle"
              >
                <button
                  onClick={() => setKnowledgeInputMode("manual")}
                  className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${knowledgeInputMode === "manual" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white" : "text-white/50 hover:text-white"}`}
                  data-testid="button-mode-manual"
                >
                  Manual
                </button>
                <button
                  onClick={() => setKnowledgeInputMode("upload")}
                  className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${knowledgeInputMode === "upload" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white" : "text-white/50 hover:text-white"}`}
                  data-testid="button-mode-upload"
                >
                  Upload File
                </button>
              </div>

              {knowledgeInputMode === "upload" ? (
                <DocumentUpload
                  onApply={async (title, content, metadata) => {
                    if (!activeSession) return;
                    try {
                      const res = await apiFetch(
                        `/api/playground/sessions/${activeSession.id}/knowledge`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            title,
                            content,
                            category: "custom",
                          }),
                        },
                      );
                      if (res.status === 402) {
                        showUpgradeModal("Playground Knowledge");
                        return;
                      }
                      if (res.ok) {
                        await apiFetch(
                          `/api/playground/sessions/${activeSession.id}/attachments`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              filename: metadata.filename,
                              file_type: metadata.file_type,
                              size_bytes: metadata.size_bytes,
                            }),
                          },
                        );
                        const updatedRes = await apiFetch(
                          `/api/playground/sessions/${activeSession.id}`,
                        );
                        if (updatedRes.ok) {
                          const updated = await updatedRes.json();
                          setActiveSession(updated);
                          setSessions((prev) =>
                            prev.map((s) =>
                              s.id === updated.id ? updated : s,
                            ),
                          );
                        }
                        setShowKnowledgeModal(false);
                        setKnowledgeInputMode("manual");
                      } else {
                        const errData = await res.json().catch(() => null);
                        alert(
                          errData?.detail ||
                            "Failed to save knowledge entry. Please try again.",
                        );
                      }
                    } catch (error) {
                      console.error(
                        "Failed to add knowledge from upload:",
                        error,
                      );
                      alert("Network error — could not save knowledge entry.");
                    }
                  }}
                  onCancel={() => {
                    setShowKnowledgeModal(false);
                    setKnowledgeInputMode("manual");
                  }}
                />
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-white/50 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={newKnowledge.title}
                        onChange={(e) =>
                          setNewKnowledge((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        placeholder="Knowledge item title"
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white"
                        data-testid="input-knowledge-title"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-white/50 mb-1">
                        Content
                      </label>
                      <textarea
                        value={newKnowledge.content}
                        onChange={(e) =>
                          setNewKnowledge((prev) => ({
                            ...prev,
                            content: e.target.value,
                          }))
                        }
                        placeholder="Enter knowledge content..."
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white min-h-[100px] resize-none"
                        data-testid="textarea-knowledge-content"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-white/50 mb-1">
                        Category
                      </label>
                      <select
                        value={newKnowledge.category}
                        onChange={(e) =>
                          setNewKnowledge((prev) => ({
                            ...prev,
                            category: e.target.value,
                          }))
                        }
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white [&>option]:bg-slate-900 [&>option]:text-white"
                        data-testid="select-knowledge-category"
                      >
                        <option value="custom">Custom</option>
                        <option value="product">Product</option>
                        <option value="faq">FAQ</option>
                        <option value="policy">Policy</option>
                        <option value="procedure">Procedure</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowKnowledgeModal(false)}
                      className="flex-1 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-white/[0.05]"
                      data-testid="button-cancel-knowledge"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addKnowledge}
                      disabled={
                        !newKnowledge.title.trim() ||
                        !newKnowledge.content.trim()
                      }
                      className="flex-1 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:bg-cyan-600 disabled:bg-white/[0.08] text-white rounded-lg"
                      data-testid="button-confirm-knowledge"
                    >
                      Add Knowledge
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTemplateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowTemplateModal(false);
              setTemplateError(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111113] border border-white/10 rounded-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white mb-4">
                Apply Template
              </h2>

              {templateError && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {templateError}
                </div>
              )}

              {!activeSession && (
                <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-300 text-sm">
                  Create or select a session first to apply a template
                </div>
              )}

              {templates.length === 0 ? (
                <p className="text-white/50 text-center py-8">
                  No templates available
                </p>
              ) : (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() =>
                        !isApplyingTemplate && applyTemplate(template.id)
                      }
                      className={`p-4 bg-white/[0.05] hover:bg-white/[0.08] rounded-lg cursor-pointer transition-colors ${isApplyingTemplate ? "opacity-50 cursor-wait" : ""}`}
                      data-testid={`template-option-${template.id}`}
                    >
                      <h3 className="text-white font-medium">
                        {template.name}
                      </h3>
                      <p className="text-white/50 text-sm mt-1">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-white/30">
                        <span className="px-2 py-0.5 bg-white/[0.08] rounded">
                          {template.category}
                        </span>
                        <span>{template.recommended_model}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setTemplateError(null);
                }}
                className="w-full mt-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-white/[0.05]"
                data-testid="button-close-template-modal"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeployModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeployModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111113] border border-white/10 rounded-2xl w-full max-w-lg p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <Rocket className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Deploy Agent</h2>
                  <p className="text-sm text-white/50">
                    Freeze this configuration for production use
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/50 mb-1">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    value={deployForm.name}
                    onChange={(e) =>
                      setDeployForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="My Production Agent"
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white"
                    data-testid="input-deploy-name"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={deployForm.description}
                    onChange={(e) =>
                      setDeployForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="What this agent does..."
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white min-h-[80px] resize-none"
                    data-testid="textarea-deploy-description"
                  />
                </div>

                <div className="space-y-3 py-3 border-y border-white/[0.08]">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deployForm.inherit_global_directives}
                      onChange={(e) =>
                        setDeployForm((prev) => ({
                          ...prev,
                          inherit_global_directives: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded bg-white/[0.05] border-slate-600"
                      data-testid="checkbox-inherit-directives"
                    />
                    <div>
                      <span className="text-white text-sm">
                        Inherit Global Directives
                      </span>
                      <p className="text-xs text-white/30">
                        Apply your global directives to this agent
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deployForm.inherit_global_kb}
                      onChange={(e) =>
                        setDeployForm((prev) => ({
                          ...prev,
                          inherit_global_kb: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded bg-white/[0.05] border-slate-600"
                      data-testid="checkbox-inherit-kb"
                    />
                    <div>
                      <span className="text-white text-sm">
                        Inherit Global Knowledge Base
                      </span>
                      <p className="text-xs text-white/30">
                        Include your global knowledge items
                      </p>
                    </div>
                  </label>
                </div>

                <div className="bg-white/[0.04] rounded-lg p-3 text-sm">
                  <h4 className="text-slate-300 font-medium mb-2">
                    Configuration Summary
                  </h4>
                  <div className="space-y-1 text-white/50">
                    <p>
                      Model:{" "}
                      <span className="text-white">
                        {activeSession?.model_name}
                      </span>
                    </p>
                    <p>
                      Temperature:{" "}
                      <span className="text-white">
                        {activeSession?.temperature}
                      </span>
                    </p>
                    {activeSession?.reasoning_effort && (
                      <p>
                        Reasoning:{" "}
                        <span className="text-white">
                          {REASONING_EFFORT_LABELS[
                            activeSession.reasoning_effort
                          ] || activeSession.reasoning_effort}
                        </span>
                      </p>
                    )}
                    <p>
                      Max Tokens:{" "}
                      <span className="text-white">
                        {activeSession?.max_tokens}
                      </span>
                    </p>
                    <p>
                      Directives:{" "}
                      <span className="text-white">
                        {activeSession?.directives.length || 0}
                      </span>
                    </p>
                    <p>
                      Knowledge Items:{" "}
                      <span className="text-white">
                        {activeSession?.knowledge_items.length || 0}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDeployModal(false)}
                  className="flex-1 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-white/[0.05]"
                  data-testid="button-cancel-deploy"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeploy}
                  disabled={!deployForm.name.trim() || isDeploying}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-white/[0.08] text-white rounded-lg flex items-center justify-center gap-2"
                  data-testid="button-confirm-deploy"
                >
                  {isDeploying ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Rocket size={16} />
                      Deploy Agent
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVoiceSession && (
          <VoiceSession
            onClose={() => setShowVoiceSession(false)}
            workspaceId={activeSession?.id}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateArtifact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateArtifact(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111113] border border-white/10 rounded-2xl w-full max-w-lg p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Package size={18} className="text-cyan-400" />
                Create Artifact
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/50 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newArtifactName}
                    onChange={(e) => setNewArtifactName(e.target.value)}
                    placeholder="e.g. api_handler.py"
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-cyan-500 text-sm"
                    data-testid="input-artifact-name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/50 mb-1">
                    Language / Stack
                  </label>
                  <select
                    value={newArtifactStack}
                    onChange={(e) => setNewArtifactStack(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-sm"
                    data-testid="select-artifact-stack"
                  >
                    {Object.keys(LANG_EXTENSIONS).map((lang) => (
                      <option key={lang} value={lang} className="bg-[#111113]">
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm text-white/50">
                      Content
                    </label>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      data-testid="button-upload-file"
                    >
                      <Download size={11} /> Upload file
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      accept=".py,.js,.ts,.tsx,.jsx,.html,.css,.json,.md,.sql,.sh,.go,.rs,.java,.rb,.php,.txt,.yaml,.xml,.vue,.svelte"
                    />
                  </div>
                  <textarea
                    value={newArtifactCode}
                    onChange={(e) => setNewArtifactCode(e.target.value)}
                    placeholder="Paste your code or content here..."
                    rows={10}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-cyan-500 text-sm font-mono resize-none"
                    data-testid="textarea-artifact-code"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={createArtifactManual}
                    disabled={
                      !newArtifactName.trim() ||
                      !newArtifactCode.trim() ||
                      isCreatingArtifact
                    }
                    className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    data-testid="button-save-new-artifact"
                  >
                    {isCreatingArtifact ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    Create Artifact
                  </button>
                  <button
                    onClick={() => setShowCreateArtifact(false)}
                    className="px-4 py-2.5 text-white/50 hover:text-white border border-white/10 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <UpgradeModalComponent />
      <ErrorModalComponent />

      <AnimatePresence>
        {showEnvLimitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowEnvLimitModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md mp-ace-card rounded-2xl p-6 relative"
              onClick={(e) => e.stopPropagation()}
              data-testid="modal-env-limit"
            >
              <button
                onClick={() => setShowEnvLimitModal(false)}
                className="absolute top-4 right-4 text-white/30 hover:text-white/60"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Environment Limit Reached
                  </h3>
                  <p className="text-xs text-white/40">
                    You've used all available KeyStone slots
                  </p>
                </div>
              </div>

              <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/60">
                    Environments Used
                  </span>
                  <span className="text-sm font-semibold text-amber-400">
                    {envLimitInfo.current} / {envLimitInfo.limit}
                  </span>
                </div>
                <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div className="space-y-2 mb-5">
                <p className="text-sm text-white/70">
                  To deploy this artifact, you can:
                </p>
                <div className="flex items-start gap-2 text-sm text-white/50">
                  <span className="text-cyan-400 mt-0.5">1.</span>
                  <span>
                    Go to{" "}
                    <button
                      onClick={() => {
                        setShowEnvLimitModal(false);
                        setLocation("/keystone");
                      }}
                      className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                    >
                      KeyStone
                    </button>{" "}
                    and delete environments you no longer need
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm text-white/50">
                  <span className="text-cyan-400 mt-0.5">2.</span>
                  <span>
                    Download your files first using the export button in each
                    environment
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm text-white/50">
                  <span className="text-cyan-400 mt-0.5">3.</span>
                  <span>
                    Upgrade to{" "}
                    <span className="text-violet-400 font-medium">
                      Enterprise
                    </span>{" "}
                    for up to 100 environments
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowEnvLimitModal(false);
                    setLocation("/keystone");
                  }}
                  className="flex-1 px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-xl text-sm text-white font-medium transition-colors"
                  data-testid="button-manage-envs"
                >
                  Manage Environments
                </button>
                <button
                  onClick={() => {
                    setShowEnvLimitModal(false);
                    showUpgradeModal("KeyStone Environments");
                  }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl text-sm text-white font-medium transition-colors"
                  data-testid="button-upgrade-enterprise"
                >
                  Upgrade to Enterprise
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
