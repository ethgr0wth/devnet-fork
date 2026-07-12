import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Wrench, Trash2, Edit, ToggleLeft, ToggleRight,
  Loader2, Search, Play, Clock, ChevronDown, ChevronUp, X,
  Webhook, Zap, Settings, AlertCircle, Check, Copy, RotateCcw,
  Shield, Eye, EyeOff, Activity, Globe, Code, Lock, Unlock,
  FileText, BarChart, Mail, StickyNote, UserCheck, Calendar,
  Terminal, CheckCircle, Calculator, BookOpen, Package, Radar
} from "lucide-react";
import { apiFetch } from "@/lib/queryClient";

interface ToolParameter {
  properties: Record<string, any>;
  required: string[];
}

interface WebhookConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  timeout_ms: number;
  retry_count: number;
  secret_header_name?: string;
  auth_secret_id?: string;
}

interface CustomTool {
  id: string;
  workspace_id?: string;
  org_id?: string;
  name: string;
  description: string;
  type: "webhook" | "builtin";
  webhook?: WebhookConfig;
  builtin_action?: string;
  parameters?: ToolParameter;
  response_schema?: Record<string, any>;
  scope: "workspace" | "organization" | "global";
  enabled: boolean;
  allowed_roles?: string[];
  plan_required?: string;
  created_at: string;
  updated_at: string;
  invocation_count: number;
  last_invoked_at?: string;
}

interface ToolInvocation {
  id: string;
  tool_id: string;
  tool_name: string;
  workspace_id: string;
  user_id: string;
  arguments: Record<string, any>;
  result: any;
  status: string;
  duration_ms: number;
  error?: string;
  created_at: string;
  is_replay: boolean;
}

interface PublicTool {
  id: string;
  name: string;
  description: string;
  type: string;
  builtin_action?: string;
  category: string;
  icon: string;
  enabled_for_org: boolean;
  scope: string;
}

interface HeaderEntry {
  key: string;
  value: string;
  masked: boolean;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  research: { label: "Research", color: "text-blue-400 bg-blue-500/10" },
  utilities: { label: "Utilities", color: "text-amber-400 bg-amber-500/10" },
  content: { label: "Content", color: "text-pink-400 bg-pink-500/10" },
  productivity: { label: "Productivity", color: "text-emerald-400 bg-emerald-500/10" },
  support: { label: "Support", color: "text-orange-400 bg-orange-500/10" },
  developer: { label: "Developer", color: "text-cyan-400 bg-cyan-500/10" },
  sales: { label: "Sales", color: "text-violet-400 bg-violet-500/10" },
  monitoring: { label: "Monitoring", color: "text-red-400 bg-red-500/10" },
  finance: { label: "Finance", color: "text-green-400 bg-green-500/10" },
  intelligence: { label: "Intelligence", color: "text-indigo-400 bg-indigo-500/10" },
  general: { label: "General", color: "text-gray-400 bg-gray-500/10" },
};

const ICON_MAP: Record<string, any> = {
  search: Search,
  globe: Globe,
  calculator: Calculator,
  code: Code,
  "file-text": FileText,
  "bar-chart": BarChart,
  mail: Mail,
  "sticky-note": StickyNote,
  "user-check": UserCheck,
  calendar: Calendar,
  terminal: Terminal,
  "check-circle": CheckCircle,
  wrench: Wrench,
  "book-open": BookOpen,
  "dollar-sign": Activity,
  clock: Clock,
  tag: Code,
  languages: Globe,
  "list-todo": CheckCircle,
  presentation: FileText,
  ticket: AlertCircle,
  "help-circle": Search,
  "user-plus": UserCheck,
  contact: UserCheck,
  "file-signature": FileText,
  "message-square": Mail,
  smartphone: Zap,
  activity: Activity,
  "scroll-text": FileText,
  receipt: FileText,
  wallet: Activity,
  regex: Code,
  radar: Radar,
};

const BUILTIN_ACTIONS = [
  { value: "create_note", label: "Create Note", description: "Save a note to the workspace" },
  { value: "escalate", label: "Escalate", description: "Escalate conversation to human" },
  { value: "schedule_callback", label: "Schedule Callback", description: "Schedule a follow-up callback" },
];

interface BasicParam {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

const TOOL_TEMPLATES = [
  {
    name: "Price Lookup",
    description: "Look up prices or data from any public API — like crypto, stocks, or weather",
    example: "e.g. https://api.dex-trade.com/v1/public/book?pair=ITCUSDT",
    icon: "search",
    type: "webhook" as const,
    webhook_method: "GET",
    params: [{ name: "pair", type: "string", description: "The trading pair to look up (e.g. BTCUSDT)", required: true }],
  },
  {
    name: "Send Notification",
    description: "Send a message to Slack, Discord, or any service that accepts POST requests",
    example: "e.g. https://hooks.slack.com/services/...",
    icon: "mail",
    type: "webhook" as const,
    webhook_method: "POST",
    params: [
      { name: "message", type: "string", description: "The message to send", required: true },
      { name: "channel", type: "string", description: "Where to send it (optional)", required: false },
    ],
  },
  {
    name: "Submit Data",
    description: "Send data to a form, CRM, or any service that accepts submissions",
    example: "e.g. https://api.example.com/submit",
    icon: "file-text",
    type: "webhook" as const,
    webhook_method: "POST",
    params: [
      { name: "data", type: "string", description: "The data to submit", required: true },
    ],
  },
  {
    name: "Save Note",
    description: "Let the AI save notes and context to the workspace knowledge base",
    example: "",
    icon: "sticky-note",
    type: "builtin" as const,
    builtin_action: "create_note",
    params: [
      { name: "title", type: "string", description: "Note title", required: true },
      { name: "content", type: "string", description: "Note content", required: true },
    ],
  },
  {
    name: "Escalate to Human",
    description: "Hand off the conversation to a human agent when AI can't help",
    example: "",
    icon: "user-check",
    type: "builtin" as const,
    builtin_action: "escalate",
    params: [{ name: "reason", type: "string", description: "Why escalation is needed", required: true }],
  },
];

function paramsToJson(params: BasicParam[]): string {
  const properties: Record<string, any> = {};
  const required: string[] = [];
  for (const p of params) {
    if (!p.name.trim()) continue;
    properties[p.name.trim()] = { type: p.type, description: p.description };
    if (p.required) required.push(p.name.trim());
  }
  return JSON.stringify({ properties, required }, null, 2);
}

function jsonToParams(jsonStr: string): BasicParam[] {
  try {
    const parsed = JSON.parse(jsonStr);
    const props = parsed.properties || {};
    const req = new Set(parsed.required || []);
    return Object.entries(props).map(([name, def]: [string, any]) => ({
      name,
      type: def.type || "string",
      description: def.description || "",
      required: req.has(name),
    }));
  } catch {
    return [];
  }
}

export default function ToolsHub({ embedded }: { embedded?: boolean } = {}) {
  const [, setLocation] = useLocation();

  const [tools, setTools] = useState<CustomTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [editingTool, setEditingTool] = useState<CustomTool | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [invocations, setInvocations] = useState<Record<string, ToolInvocation[]>>({});
  const [invLoading, setInvLoading] = useState<string | null>(null);
  const [testingTool, setTestingTool] = useState<string | null>(null);
  const [testArgs, setTestArgs] = useState("{}");
  const [testResult, setTestResult] = useState<any>(null);
  const [showTestPanel, setShowTestPanel] = useState<string | null>(null);

  const [editorMode, setEditorMode] = useState<"basic" | "advanced">("basic");
  const [basicParams, setBasicParams] = useState<BasicParam[]>([{ name: "", type: "string", description: "", required: false }]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [webhookTestLoading, setWebhookTestLoading] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{ success: boolean; status_code?: number; elapsed_ms?: number; data?: any; error?: string } | null>(null);

  const [headers, setHeaders] = useState<HeaderEntry[]>([]);
  const [publicTools, setPublicTools] = useState<PublicTool[]>([]);
  const [publicLoading, setPublicLoading] = useState(true);
  const [publicTogglingId, setPublicTogglingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"private" | "public">("private");
  const [publicFilter, setPublicFilter] = useState<string>("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "webhook" as "webhook" | "builtin",
    builtin_action: "",
    webhook_url: "",
    webhook_method: "POST",
    webhook_timeout: 10000,
    webhook_retry: 1,
    parameters_json: '{\n  "properties": {},\n  "required": []\n}',
    response_schema_json: "",
    scope: "workspace",
    enabled: true,
    allowed_roles: "",
    plan_required: "",
    trigger_keywords: "",
  });

  useEffect(() => {
    loadAll();
    loadPublicCatalog();
  }, []);

  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => { setError(""); setSuccess(""); }, 4000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  const loadAll = async () => {
    try {
      const res = await apiFetch("/api/org/tools");
      if (!res.ok) {
        if (res.status === 401) { setLocation("/login"); return; }
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || "Failed to load tools");
        return;
      }
      const data = await res.json();
      setTools(data.tools || []);
    } catch (e) {
      console.error("Failed to load tools:", e);
      setError("Could not connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  const loadPublicCatalog = async () => {
    try {
      const res = await apiFetch("/api/org/tools/public/catalog");
      if (!res.ok) return;
      const data = await res.json();
      setPublicTools(data.tools || []);
    } catch (e) {
      console.error("Failed to load public catalog:", e);
    } finally {
      setPublicLoading(false);
    }
  };

  const handlePublicToggle = async (tool: PublicTool) => {
    setPublicTogglingId(tool.id);
    try {
      const action = tool.enabled_for_org ? "disable" : "enable";
      const res = await apiFetch(`/api/org/tools/public/${tool.id}/${action}`, { method: "POST" });
      if (res.ok) {
        setPublicTools((prev) =>
          prev.map((t) => t.id === tool.id ? { ...t, enabled_for_org: !t.enabled_for_org } : t)
        );
        setSuccess(tool.enabled_for_org ? `${tool.name} disabled` : `${tool.name} enabled for your org`);
      }
    } catch {
      setError("Failed to toggle public tool");
    } finally {
      setPublicTogglingId(null);
    }
  };

  const publicCategories = [...new Set(publicTools.map((t) => t.category))];
  const filteredPublicTools = publicTools.filter((t) => {
    if (publicFilter && t.category !== publicFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    }
    return true;
  });
  const enabledPublicCount = publicTools.filter((t) => t.enabled_for_org).length;

  const filteredTools = tools.filter((t) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
    }
    return true;
  });

  const addHeader = () => setHeaders([...headers, { key: "", value: "", masked: false }]);
  const removeHeader = (idx: number) => setHeaders(headers.filter((_, i) => i !== idx));
  const updateHeader = (idx: number, field: keyof HeaderEntry, val: string | boolean) => {
    setHeaders(headers.map((h, i) => i === idx ? { ...h, [field]: val } : h));
  };

  const headersToObj = (): Record<string, string> => {
    const obj: Record<string, string> = {};
    headers.forEach((h) => { if (h.key.trim()) obj[h.key.trim()] = h.value; });
    return obj;
  };

  const objToHeaders = (obj: Record<string, string>): HeaderEntry[] => {
    const entries = Object.entries(obj || {});
    if (entries.length === 0) return [];
    return entries.map(([key, value]) => ({
      key,
      value,
      masked: key.toLowerCase().includes("auth") || key.toLowerCase().includes("secret") || key.toLowerCase().includes("token") || key.toLowerCase().includes("api"),
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Tool name is required"); return; }
    if (form.type === "webhook" && !form.webhook_url.trim()) { setError("API endpoint URL is required"); return; }
    if (form.type === "builtin" && !form.builtin_action) { setError("Built-in action is required"); return; }

    const finalParamsJson = editorMode === "basic" ? paramsToJson(basicParams.filter((p) => p.name.trim())) : form.parameters_json;

    setIsSaving(true);
    setError("");
    try {
      let params = undefined;
      let responseSchema = undefined;
      try { params = JSON.parse(finalParamsJson); } catch { setError("Invalid parameters JSON"); setIsSaving(false); return; }
      if (form.response_schema_json.trim()) {
        try { responseSchema = JSON.parse(form.response_schema_json); } catch { setError("Invalid response schema JSON"); setIsSaving(false); return; }
      }

      const body: any = {
        name: form.name,
        description: form.description,
        type: form.type,
        parameters: params,
        response_schema: responseSchema || undefined,
        scope: "organization",
        enabled: form.enabled,
        allowed_roles: form.allowed_roles ? form.allowed_roles.split(",").map((r) => r.trim()) : undefined,
        plan_required: form.plan_required || undefined,
        trigger_keywords: form.trigger_keywords ? form.trigger_keywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined,
      };

      if (form.type === "webhook") {
        body.webhook = {
          url: form.webhook_url,
          method: form.webhook_method,
          headers: headersToObj(),
          timeout_ms: form.webhook_timeout,
          retry_count: form.webhook_retry,
        };
      } else {
        body.builtin_action = form.builtin_action;
      }

      const url = editingTool
        ? `/api/org/tools/${editingTool.id}`
        : `/api/org/tools`;
      const method = editingTool ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccess(editingTool ? "Tool updated successfully" : "Tool created successfully");
        resetForm();
        loadAll();
      } else {
        const data = await res.json();
        setError(data.detail || "Failed to save tool");
      }
    } catch (err) {
      setError("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (tool: CustomTool) => {
    if (!confirm(`Delete "${tool.name}"? This cannot be undone.`)) return;
    try {
      const res = await apiFetch(`/api/org/tools/${tool.id}`, { method: "DELETE" });
      if (res.ok) { setSuccess("Tool deleted"); loadAll(); }
      else setError("Failed to delete tool");
    } catch { setError("Failed to delete tool"); }
  };

  const handleToggle = async (tool: CustomTool) => {
    try {
      const res = await apiFetch(`/api/org/tools/${tool.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !tool.enabled }),
      });
      if (res.ok) loadAll();
    } catch {}
  };

  const handleEdit = (tool: CustomTool) => {
    setEditingTool(tool);
    setHeaders(objToHeaders(tool.webhook?.headers || {}));
    const paramJson = JSON.stringify(tool.parameters || { properties: {}, required: [] }, null, 2);
    setForm({
      name: tool.name,
      description: tool.description || "",
      type: tool.type,
      builtin_action: tool.builtin_action || "",
      webhook_url: tool.webhook?.url || "",
      webhook_method: tool.webhook?.method || "POST",
      webhook_timeout: tool.webhook?.timeout_ms || 10000,
      webhook_retry: tool.webhook?.retry_count || 1,
      parameters_json: paramJson,
      response_schema_json: tool.response_schema ? JSON.stringify(tool.response_schema, null, 2) : "",
      scope: tool.scope,
      enabled: tool.enabled,
      allowed_roles: tool.allowed_roles?.join(", ") || "",
      plan_required: tool.plan_required || "",
      trigger_keywords: tool.trigger_keywords?.join(", ") || "",
    });
    setBasicParams(jsonToParams(paramJson));
    setEditorMode("advanced");
    setShowTemplates(false);
    setShowEditor(true);
  };

  const applyTemplate = (tpl: typeof TOOL_TEMPLATES[number]) => {
    setForm((f) => ({
      ...f,
      name: tpl.name,
      description: tpl.description,
      type: tpl.type,
      builtin_action: (tpl as any).builtin_action || "",
      webhook_method: (tpl as any).webhook_method || "POST",
      parameters_json: paramsToJson(tpl.params),
    }));
    setBasicParams([...tpl.params]);
    setShowTemplates(false);
  };

  const testWebhookConnection = async () => {
    if (!form.webhook_url.trim()) { setError("Enter a webhook URL first"); return; }
    setWebhookTestLoading(true);
    setWebhookTestResult(null);
    setError("");
    try {
      const res = await apiFetch("/api/org/tools/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: form.webhook_url,
          method: form.webhook_method,
          headers: headersToObj(),
          arguments: {},
          timeout_ms: form.webhook_timeout,
        }),
      });
      const data = await res.json();
      setWebhookTestResult(data);
    } catch {
      setWebhookTestResult({ success: false, error: "Could not reach server" });
    } finally {
      setWebhookTestLoading(false);
    }
  };

  const resetForm = () => {
    setShowEditor(false);
    setEditingTool(null);
    setHeaders([]);
    setEditorMode("basic");
    setBasicParams([{ name: "", type: "string", description: "", required: false }]);
    setShowTemplates(false);
    setWebhookTestResult(null);
    setWebhookTestLoading(false);
    setForm({
      name: "", description: "", type: "webhook", builtin_action: "",
      webhook_url: "", webhook_method: "POST", webhook_timeout: 10000, webhook_retry: 1,
      parameters_json: '{\n  "properties": {},\n  "required": []\n}',
      response_schema_json: "", scope: "organization", enabled: true, allowed_roles: "", plan_required: "",
      trigger_keywords: "",
    });
    setError("");
  };

  const loadInvocations = async (tool: CustomTool) => {
    setInvLoading(tool.id);
    try {
      const res = await apiFetch(`/api/org/tools/${tool.id}/invocations?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setInvocations((prev) => ({ ...prev, [tool.id]: data.invocations || [] }));
      }
    } catch {}
    finally { setInvLoading(null); }
  };

  const handleTest = async (tool: CustomTool) => {
    setTestingTool(tool.id);
    setTestResult(null);
    try {
      let args = {};
      try { args = JSON.parse(testArgs); } catch { setError("Invalid test arguments JSON"); setTestingTool(null); return; }
      const res = await apiFetch(`/api/org/tools/${tool.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arguments: args }),
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult(data.result);
      } else {
        const data = await res.json();
        setTestResult({ error: data.detail || "Test failed" });
      }
    } catch { setTestResult({ error: "Request failed" }); }
    finally { setTestingTool(null); }
  };

  const handleReplay = async (tool: CustomTool, invId: string) => {
    try {
      const res = await apiFetch(`/api/org/tools/${tool.id}/replay/${invId}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setTestResult(data.replay);
        setSuccess("Replay completed");
      }
    } catch { setError("Replay failed"); }
  };

  const totalTools = tools.length;
  const activeTools = tools.filter((t) => t.enabled).length;
  const totalInvocations = tools.reduce((sum, t) => sum + (t.invocation_count || 0), 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500" />
      </div>
    );
  }

  const Outer = embedded ? React.Fragment : ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">{children}</div>
  );

  return (
    <Outer>
      <div className={embedded ? '' : 'max-w-7xl mx-auto px-4 py-8'}>
        {!embedded && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-lg bg-black/40 hover:bg-white/10 border border-white/10 transition-colors flex-shrink-0"
                  data-testid="button-back-dashboard"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </motion.button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
                  <Wrench className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400 flex-shrink-0" />
                  <span className="truncate">Custom Tools</span>
                </h1>
                <p className="text-gray-400 mt-1 text-sm sm:text-base">
                  Global tools available across all your workspaces
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { resetForm(); setShowEditor(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors text-sm whitespace-nowrap"
              data-testid="button-create-tool-hub"
            >
              <Plus className="w-5 h-5" />
              New Tool
            </motion.button>
          </div>
        )}
        {embedded && (
          <div className="flex justify-end mb-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { resetForm(); setShowEditor(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors text-sm whitespace-nowrap"
              data-testid="button-create-tool-embedded"
            >
              <Plus className="w-5 h-5" />
              New Tool
            </motion.button>
          </div>
        )}

        <AnimatePresence>
          {(error || success) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-6 p-4 rounded-lg border ${error ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {error ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  <span className="text-sm">{error || success}</span>
                </div>
                <button onClick={() => { setError(""); setSuccess(""); }} data-testid="button-dismiss-alert-hub">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white" data-testid="text-total-tools">{totalTools}</div>
            <div className="text-xs text-gray-400 mt-1">Private Tools</div>
          </div>
          <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400" data-testid="text-active-tools">{activeTools}</div>
            <div className="text-xs text-gray-400 mt-1">Active</div>
          </div>
          <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-violet-400" data-testid="text-public-enabled">{enabledPublicCount}</div>
            <div className="text-xs text-gray-400 mt-1">Public Enabled</div>
          </div>
          <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400" data-testid="text-total-invocations">{totalInvocations}</div>
            <div className="text-xs text-gray-400 mt-1">Invocations</div>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setActiveTab("private")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "private" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"}`}
              data-testid="tab-private-tools"
            >
              <Lock className="w-4 h-4" />
              Private ({totalTools})
            </button>
            <button
              onClick={() => setActiveTab("public")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "public" ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"}`}
              data-testid="tab-public-tools"
            >
              <Package className="w-4 h-4" />
              Public Catalog ({publicTools.length})
            </button>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === "private" ? "Search your tools..." : "Search public catalog..."}
              className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50"
              autoComplete="off"
              data-testid="input-search-tools"
            />
          </div>
        </div>

        {activeTab === "public" ? (
          <PublicToolsCatalog
            tools={filteredPublicTools}
            categories={publicCategories}
            activeFilter={publicFilter}
            onFilterChange={setPublicFilter}
            onToggle={handlePublicToggle}
            togglingId={publicTogglingId}
            isLoading={publicLoading}
          />
        ) : filteredTools.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Wrench className="w-16 h-16 text-white/10 mx-auto mb-4" />
            <h3 className="text-xl text-white/60 mb-2">
              {searchQuery ? "No tools match your search" : "No tools configured yet"}
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Create webhook or built-in tools that your AI agents can call during conversations to fetch data, take actions, or integrate with external services.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { resetForm(); setShowEditor(true); }}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
              data-testid="button-create-first-tool-hub"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Create Your First Tool
            </motion.button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredTools.map((tool) => (
              <motion.div
                key={tool.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black/40 border border-white/10 rounded-xl overflow-hidden"
                data-testid={`card-tool-hub-${tool.id}`}
              >
                <div className="p-4 sm:p-5 flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg ${tool.type === "webhook" ? "bg-cyan-500/10" : "bg-violet-500/10"} flex-shrink-0`}>
                    {tool.type === "webhook" ? (
                      <Globe className="w-5 h-5 text-cyan-400" />
                    ) : (
                      <Zap className="w-5 h-5 text-violet-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-white font-semibold truncate">{tool.name}</h3>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${tool.enabled ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-500/20 text-gray-400"}`}>
                        {tool.enabled ? "ACTIVE" : "DISABLED"}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-gray-400 font-mono">
                        {tool.type}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-300">
                        GLOBAL
                      </span>
                    </div>
                    {tool.description && (
                      <p className="text-gray-400 text-sm line-clamp-2">{tool.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {tool.invocation_count} calls
                      </span>
                      {tool.last_invoked_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(tool.last_invoked_at).toLocaleDateString()}
                        </span>
                      )}
                      {tool.webhook?.url && (
                        <span className="flex items-center gap-1 truncate max-w-[200px]">
                          <Globe className="w-3 h-3" />
                          {tool.webhook.url}
                        </span>
                      )}
                      {tool.webhook?.headers && Object.keys(tool.webhook.headers).length > 0 && (
                        <span className="flex items-center gap-1 text-amber-400/60">
                          <Shield className="w-3 h-3" />
                          {Object.keys(tool.webhook.headers).length} header{Object.keys(tool.webhook.headers).length > 1 ? "s" : ""}
                        </span>
                      )}
                      {tool.builtin_action && (
                        <span className="flex items-center gap-1">
                          <Code className="w-3 h-3" />
                          {tool.builtin_action}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(tool)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title={tool.enabled ? "Disable" : "Enable"}
                      data-testid={`button-toggle-hub-${tool.id}`}
                    >
                      {tool.enabled ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-gray-500" />}
                    </button>
                    <button
                      onClick={() => { setShowTestPanel(showTestPanel === tool.id ? null : tool.id); setTestResult(null); setTestArgs("{}"); }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Test tool"
                      data-testid={`button-test-hub-${tool.id}`}
                    >
                      <Play className="w-4 h-4 text-cyan-400" />
                    </button>
                    <button
                      onClick={() => {
                        setExpandedTool(expandedTool === tool.id ? null : tool.id);
                        if (!invocations[tool.id]) loadInvocations(tool);
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Invocation log"
                      data-testid={`button-invocations-hub-${tool.id}`}
                    >
                      <Clock className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleEdit(tool)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      data-testid={`button-edit-hub-${tool.id}`}
                    >
                      <Edit className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(tool)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      data-testid={`button-delete-hub-${tool.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {showTestPanel === tool.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/10 overflow-hidden"
                    >
                      <div className="p-4 bg-black/20">
                        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                          <Play className="w-4 h-4 text-cyan-400" />
                          Test Tool
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Arguments (JSON)</label>
                            <textarea
                              value={testArgs}
                              onChange={(e) => setTestArgs(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white font-mono resize-none h-20 focus:outline-none focus:border-cyan-500/50"
                              placeholder='{"key": "value"}'
                              data-testid="input-test-args-hub"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleTest(tool)}
                              disabled={!!testingTool}
                              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                              data-testid="button-run-test-hub"
                            >
                              {testingTool === tool.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                              Run Test
                            </motion.button>
                          </div>
                          {testResult && (
                            <div className="bg-black/40 border border-white/10 rounded-lg p-3 overflow-auto max-h-60">
                              <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap" data-testid="text-test-result-hub">
                                {JSON.stringify(testResult, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {expandedTool === tool.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/10 overflow-hidden"
                    >
                      <div className="p-4 bg-black/20">
                        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          Recent Invocations
                        </h4>
                        {invLoading === tool.id ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                          </div>
                        ) : !invocations[tool.id]?.length ? (
                          <p className="text-gray-500 text-sm py-4 text-center">No invocations yet</p>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-auto">
                            {invocations[tool.id].map((inv) => (
                              <div key={inv.id} className="bg-black/30 border border-white/5 rounded-lg p-3 text-xs" data-testid={`invocation-hub-${inv.id}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-1.5 py-0.5 rounded font-medium ${inv.status === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                                      {inv.status}
                                    </span>
                                    <span className="text-gray-500">{inv.duration_ms}ms</span>
                                    {inv.is_replay && <span className="text-amber-400/60 text-[10px]">REPLAY</span>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">{new Date(inv.created_at).toLocaleString()}</span>
                                    <button
                                      onClick={() => handleReplay(tool, inv.id)}
                                      className="p-1 hover:bg-white/10 rounded transition-colors"
                                      title="Replay"
                                      data-testid={`button-replay-hub-${inv.id}`}
                                    >
                                      <RotateCcw className="w-3 h-3 text-cyan-400" />
                                    </button>
                                  </div>
                                </div>
                                {inv.error && <p className="text-red-400/80 mb-1">Error: {inv.error}</p>}
                                <details className="text-gray-400">
                                  <summary className="cursor-pointer hover:text-white transition-colors">View details</summary>
                                  <pre className="mt-2 text-[11px] font-mono whitespace-pre-wrap bg-black/30 p-2 rounded">
                                    {JSON.stringify({ args: inv.arguments, result: inv.result }, null, 2)}
                                  </pre>
                                </details>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {showEditor && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto"
              >
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-cyan-400" />
                    {editingTool ? "Edit Tool" : "New Custom Tool"}
                  </h2>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (editorMode === "basic") {
                          setForm((f) => ({ ...f, parameters_json: paramsToJson(basicParams.filter((p) => p.name.trim())) }));
                        } else {
                          setBasicParams(jsonToParams(form.parameters_json));
                        }
                        setEditorMode(editorMode === "basic" ? "advanced" : "basic");
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-black/40 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white"
                      data-testid="button-toggle-editor-mode"
                    >
                      {editorMode === "basic" ? <><Code className="w-3 h-3" /> Advanced</> : <><Package className="w-3 h-3" /> Basic</>}
                    </button>
                    <button onClick={resetForm} className="p-2 hover:bg-white/10 rounded-lg transition-colors" data-testid="button-close-editor-hub">
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {!editingTool && editorMode === "basic" && !form.name && (
                    <div>
                      <button
                        onClick={() => setShowTemplates(!showTemplates)}
                        className="w-full text-left p-3 rounded-lg border border-dashed border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors flex items-center justify-between"
                        data-testid="button-show-templates"
                      >
                        <span className="text-sm text-cyan-400 flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Start from a template
                        </span>
                        {showTemplates ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-cyan-400" />}
                      </button>
                      <AnimatePresence>
                        {showTemplates && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-1 gap-2 mt-3">
                              {TOOL_TEMPLATES.map((tpl) => (
                                <button
                                  key={tpl.name}
                                  onClick={() => applyTemplate(tpl)}
                                  className="text-left p-3 rounded-lg border border-white/10 bg-black/20 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-colors"
                                  data-testid={`template-${tpl.icon}`}
                                >
                                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                                    {tpl.icon === "search" && <Search className="w-4 h-4 text-cyan-400" />}
                                    {tpl.icon === "mail" && <Mail className="w-4 h-4 text-cyan-400" />}
                                    {tpl.icon === "file-text" && <FileText className="w-4 h-4 text-cyan-400" />}
                                    {tpl.icon === "sticky-note" && <StickyNote className="w-4 h-4 text-violet-400" />}
                                    {tpl.icon === "user-check" && <UserCheck className="w-4 h-4 text-violet-400" />}
                                    {tpl.name}
                                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-gray-500">{tpl.type === "webhook" ? "api call" : tpl.type}</span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">{tpl.description}</p>
                                  {tpl.example && <p className="text-[10px] text-gray-600 mt-0.5 font-mono">{tpl.example}</p>}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-gray-300 block mb-1.5">Tool Name</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      placeholder="e.g. Lookup CRM Contact"
                      data-testid="input-tool-name-hub"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-300 block mb-1.5">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm resize-none h-16 focus:outline-none focus:border-cyan-500/50"
                      placeholder="Describe what this tool does — the AI reads this to decide when to use it"
                      data-testid="input-tool-desc-hub"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-300 block mb-1.5">Trigger Keywords</label>
                    <input
                      value={form.trigger_keywords}
                      onChange={(e) => setForm((f) => ({ ...f, trigger_keywords: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      placeholder="e.g. price, stock, quote, lookup — comma separated"
                      data-testid="input-tool-triggers-hub"
                    />
                    <p className="text-xs text-gray-500 mt-1">When a user's message contains any of these words, the AI will automatically use this tool</p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-300 block mb-1">Type</label>
                    {editorMode === "basic" && <p className="text-xs text-gray-500 mb-2">API Call = connects to any URL. Built-in = uses a built-in action.</p>}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setForm((f) => ({ ...f, type: "webhook" }))}
                        className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${form.type === "webhook" ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" : "bg-black/20 border-white/10 text-gray-400 hover:border-white/20"}`}
                        data-testid="button-type-webhook-hub"
                      >
                        <Globe className="w-4 h-4" /> API Call
                      </button>
                      <button
                        onClick={() => setForm((f) => ({ ...f, type: "builtin" }))}
                        className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${form.type === "builtin" ? "bg-violet-500/10 border-violet-500/40 text-violet-400" : "bg-black/20 border-white/10 text-gray-400 hover:border-white/20"}`}
                        data-testid="button-type-builtin-hub"
                      >
                        <Zap className="w-4 h-4" /> Built-in
                      </button>
                    </div>
                  </div>

                  {form.type === "webhook" && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-lg border border-white/5">
                      <div>
                        <label className="text-sm text-gray-300 block mb-1">API Endpoint URL</label>
                        {editorMode === "basic" && <p className="text-xs text-gray-500 mb-1.5">Paste the full URL your tool should call. Use the Test button to verify it works.</p>}
                        <div className="flex gap-2">
                          <input
                            value={form.webhook_url}
                            onChange={(e) => { setForm((f) => ({ ...f, webhook_url: e.target.value })); setWebhookTestResult(null); }}
                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                            placeholder="https://api.example.com/webhook"
                            data-testid="input-webhook-url-hub"
                          />
                          <button
                            onClick={testWebhookConnection}
                            disabled={webhookTestLoading || !form.webhook_url.trim()}
                            className="px-4 py-2.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-600/30 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                            data-testid="button-test-webhook"
                          >
                            {webhookTestLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                            Test
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {webhookTestResult && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className={`p-3 rounded-lg border ${webhookTestResult.success ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {webhookTestResult.success ? (
                                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <AlertCircle className="w-4 h-4 text-red-400" />
                                  )}
                                  <span className={`text-sm font-medium ${webhookTestResult.success ? "text-emerald-400" : "text-red-400"}`}>
                                    {webhookTestResult.success ? "Connection successful" : "Connection failed"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  {webhookTestResult.status_code && <span>HTTP {webhookTestResult.status_code}</span>}
                                  {webhookTestResult.elapsed_ms != null && <span>{webhookTestResult.elapsed_ms}ms</span>}
                                </div>
                              </div>
                              {webhookTestResult.error && !webhookTestResult.success && (
                                <p className="text-xs text-red-400/80 mb-2">{webhookTestResult.error}</p>
                              )}
                              {webhookTestResult.success && webhookTestResult.data && (
                                <div className="mt-2">
                                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Response Preview</p>
                                  <pre className="text-xs text-gray-300 bg-black/40 rounded p-2 max-h-32 overflow-auto font-mono whitespace-pre-wrap">{JSON.stringify(webhookTestResult.data, null, 2).slice(0, 2000)}</pre>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {editorMode === "advanced" && (
                        <>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Method</label>
                              <select
                                value={form.webhook_method}
                                onChange={(e) => setForm((f) => ({ ...f, webhook_method: e.target.value }))}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none [&>option]:bg-slate-900 [&>option]:text-white"
                                data-testid="select-method-hub"
                              >
                                <option value="POST">POST</option>
                                <option value="GET">GET</option>
                                <option value="PUT">PUT</option>
                                <option value="PATCH">PATCH</option>
                                <option value="DELETE">DELETE</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Timeout (ms)</label>
                              <input
                                type="number"
                                value={form.webhook_timeout}
                                onChange={(e) => setForm((f) => ({ ...f, webhook_timeout: Number(e.target.value) }))}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                                data-testid="input-timeout-hub"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Retries</label>
                              <input
                                type="number"
                                value={form.webhook_retry}
                                onChange={(e) => setForm((f) => ({ ...f, webhook_retry: Number(e.target.value) }))}
                                min={0} max={3}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                                data-testid="input-retry-hub"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm text-gray-300 flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5 text-amber-400" />
                                Custom Headers
                              </label>
                              <button
                                onClick={addHeader}
                                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                                data-testid="button-add-header"
                              >
                                <Plus className="w-3 h-3" /> Add Header
                              </button>
                            </div>
                            {headers.length === 0 ? (
                              <div className="text-center py-3 bg-black/30 rounded-lg border border-dashed border-white/10">
                                <p className="text-xs text-gray-500">No custom headers — click "Add Header" for auth tokens, API keys, etc.</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {headers.map((h, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <input
                                      value={h.key}
                                      onChange={(e) => updateHeader(idx, "key", e.target.value)}
                                      placeholder="Header name (e.g. Authorization)"
                                      className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                                      data-testid={`input-header-key-${idx}`}
                                    />
                                    <div className="relative flex-1">
                                      <input
                                        value={h.value}
                                        onChange={(e) => updateHeader(idx, "value", e.target.value)}
                                        type={h.masked ? "password" : "text"}
                                        placeholder="Value (e.g. Bearer sk-...)"
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 pr-8 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                                        data-testid={`input-header-val-${idx}`}
                                      />
                                      <button
                                        onClick={() => updateHeader(idx, "masked", !h.masked)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                        data-testid={`button-toggle-mask-${idx}`}
                                      >
                                        {h.masked ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                      </button>
                                    </div>
                                    <button
                                      onClick={() => removeHeader(idx)}
                                      className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                                      data-testid={`button-remove-header-${idx}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {form.type === "builtin" && (
                    <div className="p-4 bg-black/20 rounded-lg border border-white/5">
                      <label className="text-sm text-gray-300 block mb-2">Built-in Action</label>
                      <div className="space-y-2">
                        {BUILTIN_ACTIONS.map((action) => (
                          <button
                            key={action.value}
                            onClick={() => setForm((f) => ({ ...f, builtin_action: action.value }))}
                            className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${form.builtin_action === action.value ? "bg-violet-500/10 border-violet-500/40 text-violet-300" : "bg-black/20 border-white/10 text-gray-400 hover:border-white/20"}`}
                            data-testid={`button-action-hub-${action.value}`}
                          >
                            <span className="font-medium">{action.label}</span>
                            <span className="text-xs text-gray-500 block mt-0.5">{action.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {editorMode === "basic" ? (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm text-gray-300">Inputs</label>
                        <button
                          onClick={() => setBasicParams((p) => [...p, { name: "", type: "string", description: "", required: false }])}
                          className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                          data-testid="button-add-param"
                        >
                          <Plus className="w-3 h-3" /> Add Input
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">These are the values the AI will fill in when it uses this tool. For a price lookup, you might have an input called "pair" (like BTCUSDT). For a notification, an input called "message".</p>
                      {basicParams.length === 0 ? (
                        <div className="text-center py-4 bg-black/20 rounded-lg border border-dashed border-white/10">
                          <p className="text-xs text-gray-500">No inputs yet — add one so the AI knows what data to send</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {basicParams.map((p, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-black/20 rounded-lg border border-white/5">
                              <input
                                value={p.name}
                                onChange={(e) => {
                                  const updated = [...basicParams];
                                  updated[idx] = { ...updated[idx], name: e.target.value };
                                  setBasicParams(updated);
                                }}
                                placeholder="Name (e.g. query)"
                                className="w-28 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                                data-testid={`input-param-name-${idx}`}
                              />
                              <select
                                value={p.type}
                                onChange={(e) => {
                                  const updated = [...basicParams];
                                  updated[idx] = { ...updated[idx], type: e.target.value };
                                  setBasicParams(updated);
                                }}
                                className="w-24 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white text-xs focus:outline-none [&>option]:bg-slate-900 [&>option]:text-white"
                                data-testid={`select-param-type-${idx}`}
                              >
                                <option value="string">Text</option>
                                <option value="number">Number</option>
                                <option value="boolean">Yes/No</option>
                              </select>
                              <input
                                value={p.description}
                                onChange={(e) => {
                                  const updated = [...basicParams];
                                  updated[idx] = { ...updated[idx], description: e.target.value };
                                  setBasicParams(updated);
                                }}
                                placeholder="Description"
                                className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                                data-testid={`input-param-desc-${idx}`}
                              />
                              <button
                                onClick={() => {
                                  const updated = [...basicParams];
                                  updated[idx] = { ...updated[idx], required: !updated[idx].required };
                                  setBasicParams(updated);
                                }}
                                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${p.required ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-black/40 text-gray-500 border border-white/10 hover:text-gray-300"}`}
                                title={p.required ? "Required" : "Optional"}
                                data-testid={`button-param-required-${idx}`}
                              >
                                {p.required ? "Required" : "Optional"}
                              </button>
                              <button
                                onClick={() => setBasicParams((ps) => ps.filter((_, i) => i !== idx))}
                                className="p-1 hover:bg-red-500/20 rounded transition-colors"
                                data-testid={`button-remove-param-${idx}`}
                              >
                                <X className="w-3 h-3 text-red-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="text-sm text-gray-300 block mb-1.5">Parameters Schema (JSON)</label>
                        <textarea
                          value={form.parameters_json}
                          onChange={(e) => setForm((f) => ({ ...f, parameters_json: e.target.value }))}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white text-xs font-mono resize-none h-24 focus:outline-none focus:border-cyan-500/50"
                          placeholder='{"properties": {"query": {"type": "string"}}, "required": ["query"]}'
                          data-testid="input-params-json-hub"
                        />
                      </div>

                      <div>
                        <label className="text-sm text-gray-300 block mb-1.5">Response Schema (JSON, optional)</label>
                        <textarea
                          value={form.response_schema_json}
                          onChange={(e) => setForm((f) => ({ ...f, response_schema_json: e.target.value }))}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white text-xs font-mono resize-none h-16 focus:outline-none focus:border-cyan-500/50"
                          placeholder="Optional JSON schema for response validation"
                          data-testid="input-resp-schema-hub"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Allowed Roles (comma-separated, blank = all)</label>
                        <input
                          value={form.allowed_roles}
                          onChange={(e) => setForm((f) => ({ ...f, allowed_roles: e.target.value }))}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none"
                          placeholder="client, manager, super_admin"
                          data-testid="input-roles-hub"
                        />
                      </div>
                    </>
                  )}

                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-white/10 flex items-center justify-end gap-3">
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
                    data-testid="button-cancel-hub"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                    data-testid="button-save-tool-hub"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {editingTool ? "Update Tool" : "Create Tool"}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Outer>
  );
}

function PublicToolsCatalog({
  tools,
  categories,
  activeFilter,
  onFilterChange,
  onToggle,
  togglingId,
  isLoading,
}: {
  tools: PublicTool[];
  categories: string[];
  activeFilter: string;
  onFilterChange: (cat: string) => void;
  onToggle: (tool: PublicTool) => void;
  togglingId: string | null;
  isLoading: boolean;
}) {
  const LLM_ACTIONS = new Set(["summarize", "sentiment_analysis", "translate", "extract_keywords", "draft_email", "meeting_prep", "draft_proposal", "generate_invoice", "faq_lookup"]);
  const PROVIDERS = ["groq", "openai", "anthropic", "gemini", "mistral", "xai", "together", "openrouter", "deepseek", "fireworks", "perplexity"];
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testPanelId, setTestPanelId] = useState<string | null>(null);
  const [testArgs, setTestArgs] = useState("{}");
  const [testResult, setTestResult] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [testApiKey, setTestApiKey] = useState("");
  const [testProvider, setTestProvider] = useState("groq");

  const handleTest = async (tool: PublicTool) => {
    setTestingId(tool.id);
    setTestResult(null);
    try {
      let args = {};
      try { args = JSON.parse(testArgs); } catch { setTestResult({ error: "Invalid JSON arguments" }); setTestingId(null); return; }
      const payload: any = { arguments: args };
      if (testApiKey && LLM_ACTIONS.has(tool.builtin_action || "")) {
        payload.api_key = testApiKey;
        payload.provider = testProvider;
      }
      const res = await apiFetch(`/api/org/tools/public/${tool.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult(data.result);
      } else {
        setTestResult({ error: data.detail || "Test failed" });
      }
    } catch {
      setTestResult({ error: "Request failed" });
    } finally {
      setTestingId(null);
    }
  };

  const buildSampleArgs = (tool: PublicTool): string => {
    const params = (tool as any).parameters;
    if (!params?.properties) return "{}";
    const sample: Record<string, any> = {};
    for (const [k, v] of Object.entries(params.properties as Record<string, any>)) {
      if (v.type === "string") sample[k] = v.description ? `<${v.description}>` : "";
      else if (v.type === "number" || v.type === "integer") sample[k] = 0;
      else sample[k] = "";
    }
    return JSON.stringify(sample, null, 2);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  const grouped: Record<string, PublicTool[]> = {};
  tools.forEach((t) => {
    const cat = t.category || "general";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(t);
  });

  const sortedCategories = Object.keys(grouped).sort();

  return (
    <div data-testid="public-tools-catalog">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={() => onFilterChange("")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!activeFilter ? "bg-violet-600 text-white" : "bg-black/40 text-gray-400 hover:text-white border border-white/10"}`}
          data-testid="filter-all"
        >
          All ({tools.length})
        </button>
        {categories.sort().map((cat) => {
          const meta = CATEGORY_LABELS[cat] || CATEGORY_LABELS.general;
          return (
            <button
              key={cat}
              onClick={() => onFilterChange(activeFilter === cat ? "" : cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeFilter === cat ? "bg-violet-600 text-white" : `bg-black/40 border border-white/10 ${meta.color.split(" ")[0]} hover:bg-white/10`}`}
              data-testid={`filter-${cat}`}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      {tools.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No tools match your search</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedCategories.map((cat) => {
            const meta = CATEGORY_LABELS[cat] || CATEGORY_LABELS.general;
            return (
              <div key={cat}>
                <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${meta.color.split(" ")[0]}`}>
                  <span className={`px-2 py-0.5 rounded-md text-xs ${meta.color}`}>{meta.label}</span>
                  <span className="text-gray-600 text-xs font-normal">{grouped[cat].length} tools</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {grouped[cat].map((tool) => {
                    const IconComp = ICON_MAP[tool.icon] || Wrench;
                    const isExpanded = expandedId === tool.id;
                    const isTestOpen = testPanelId === tool.id;
                    return (
                      <motion.div
                        key={tool.id}
                        layout
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`bg-black/40 border rounded-xl overflow-hidden transition-all ${tool.enabled_for_org ? "border-violet-500/30 bg-violet-500/5" : "border-white/10 hover:border-white/20"}`}
                        data-testid={`public-tool-${tool.id}`}
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg flex-shrink-0 ${tool.enabled_for_org ? "bg-violet-500/20" : "bg-black/40"}`}>
                              <IconComp className={`w-5 h-5 ${tool.enabled_for_org ? "text-violet-400" : "text-gray-500"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-white font-medium text-sm truncate">{tool.name}</h4>
                                {tool.enabled_for_org && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-medium flex-shrink-0">
                                    ENABLED
                                  </span>
                                )}
                                {tool.category === "intelligence" && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium flex-shrink-0" data-testid={`badge-signal-${tool.id}`}>
                                    Powered by SaaS-Signal
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">{tool.description}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => {
                                  if (isTestOpen) { setTestPanelId(null); setTestResult(null); }
                                  else { setTestPanelId(tool.id); setTestArgs(buildSampleArgs(tool)); setTestResult(null); setExpandedId(null); }
                                }}
                                className={`p-1.5 rounded-lg transition-colors hover:bg-white/10 ${isTestOpen ? "bg-violet-500/20" : ""}`}
                                title="Test this tool"
                                data-testid={`test-public-${tool.id}`}
                              >
                                <Play className={`w-4 h-4 ${isTestOpen ? "text-violet-400" : "text-cyan-400"}`} />
                              </button>
                              <button
                                onClick={() => { setExpandedId(isExpanded ? null : tool.id); setTestPanelId(null); }}
                                className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                                title="View parameters"
                                data-testid={`expand-public-${tool.id}`}
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                              </button>
                              <button
                                onClick={() => onToggle(tool)}
                                disabled={togglingId === tool.id}
                                className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                                title={tool.enabled_for_org ? "Disable for your org" : "Enable for your org"}
                                data-testid={`toggle-public-${tool.id}`}
                              >
                                {togglingId === tool.id ? (
                                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                ) : tool.enabled_for_org ? (
                                  <ToggleRight className="w-5 h-5 text-violet-400" />
                                ) : (
                                  <ToggleLeft className="w-5 h-5 text-gray-500" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-white/10 overflow-hidden"
                            >
                              <div className="p-4 bg-black/20 space-y-3">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1 space-y-3">
                                    <div>
                                      <h5 className="text-[11px] font-semibold text-violet-400 uppercase tracking-wider mb-1">What it does</h5>
                                      <p className="text-xs text-gray-300 leading-relaxed">{tool.description}</p>
                                    </div>
                                    <div>
                                      <h5 className="text-[11px] font-semibold text-violet-400 uppercase tracking-wider mb-1">How it works</h5>
                                      <p className="text-xs text-gray-400 leading-relaxed">
                                        When enabled, your AI agents can call this tool during conversations. The agent decides when to use it based on context.
                                        {tool.type === "builtin" ? " This is a platform built-in — no external webhook or API setup needed." : " This tool calls an external webhook endpoint."}
                                      </p>
                                    </div>
                                    <div>
                                      <h5 className="text-[11px] font-semibold text-violet-400 uppercase tracking-wider mb-2">Inputs</h5>
                                      {(tool as any).parameters?.properties ? (
                                        <div className="space-y-1.5">
                                          {Object.entries((tool as any).parameters.properties as Record<string, any>).map(([paramName, paramDef]: [string, any]) => {
                                            const isRequired = ((tool as any).parameters?.required || []).includes(paramName);
                                            return (
                                              <div key={paramName} className="flex items-start gap-2 bg-black/30 rounded-lg px-3 py-2">
                                                <code className="text-[11px] text-cyan-400 font-mono flex-shrink-0">{paramName}</code>
                                                {isRequired && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium flex-shrink-0">REQ</span>}
                                                <span className="text-[11px] text-gray-500 flex-shrink-0">({paramDef.type})</span>
                                                <span className="text-[11px] text-gray-400">{paramDef.description || ""}</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-gray-500 italic">No parameters</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-4 pt-1 border-t border-white/5">
                                      <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                                        <Shield className="w-3 h-3" />
                                        <span>Scope: <span className="text-gray-400">All workspaces</span></span>
                                      </div>
                                      <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                                        <Code className="w-3 h-3" />
                                        <span>Action: <span className="text-white font-mono">{tool.builtin_action}</span></span>
                                      </div>
                                      <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                                        <Zap className="w-3 h-3" />
                                        <span>Type: <span className="text-gray-400 capitalize">{tool.type}</span></span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {isTestOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-white/10 overflow-hidden"
                            >
                              <div className="p-4 bg-black/20 space-y-3">
                                <h4 className="text-xs font-medium text-white flex items-center gap-2">
                                  <Play className="w-3.5 h-3.5 text-cyan-400" />
                                  Test — {tool.name}
                                </h4>
                                <div>
                                  <label className="text-[11px] text-gray-500 block mb-1">Arguments (JSON)</label>
                                  <textarea
                                    value={testArgs}
                                    onChange={(e) => setTestArgs(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white font-mono resize-none h-24 focus:outline-none focus:border-violet-500/50"
                                    data-testid={`test-args-public-${tool.id}`}
                                  />
                                </div>
                                {LLM_ACTIONS.has(tool.builtin_action || "") && (
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                      <label className="text-[11px] text-gray-500 block mb-1">API Key (optional — uses your configured provider if empty)</label>
                                      <input
                                        type="text"
                                        value={testApiKey}
                                        onChange={(e) => setTestApiKey(e.target.value)}
                                        placeholder="sk-... or gsk_..."
                                        autoComplete="off"
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-violet-500/50"
                                        data-testid={`test-api-key-${tool.id}`}
                                      />
                                    </div>
                                    <div className="w-36">
                                      <label className="text-[11px] text-gray-500 block mb-1">Provider</label>
                                      <select
                                        value={testProvider}
                                        onChange={(e) => setTestProvider(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50 [&>option]:bg-slate-900 [&>option]:text-white"
                                        data-testid={`test-provider-${tool.id}`}
                                      >
                                        {PROVIDERS.map((p) => (
                                          <option key={p} value={p}>{p}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleTest(tool)}
                                    disabled={!!testingId}
                                    className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                                    data-testid={`run-test-public-${tool.id}`}
                                  >
                                    {testingId === tool.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                                    Run Test
                                  </motion.button>
                                  <span className="text-[10px] text-gray-600">Tests run against the tool without enabling it</span>
                                </div>
                                {testResult && (
                                  <div className="bg-black/40 border border-white/10 rounded-lg p-3 overflow-auto max-h-48">
                                    <div className="flex items-center gap-2 mb-2">
                                      {testResult.error ? (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">ERROR</span>
                                      ) : (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
                                          {testResult.status || "SUCCESS"}
                                        </span>
                                      )}
                                      {testResult.duration_ms && (
                                        <span className="text-[10px] text-gray-500">{testResult.duration_ms}ms</span>
                                      )}
                                    </div>
                                    <pre className="text-[11px] text-gray-300 font-mono whitespace-pre-wrap" data-testid={`test-result-public-${tool.id}`}>
                                      {JSON.stringify(testResult, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
