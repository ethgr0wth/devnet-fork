import { useState, useEffect } from "react";
import { useAvailableModels } from "../hooks/use-available-models";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, Filter, Bot, Headphones, TrendingUp, Code, FileText, Briefcase,
  Plus, Copy, Rocket, Star, Users, Clock, Settings, X, Check, ChevronDown, 
  Layers, Shield, Zap, HelpCircle, Mail, BarChart2, Clipboard, Edit3, Loader2
} from "lucide-react";
import { ShimmerCard } from "../components/Shimmer";
import { useCapabilities } from "../hooks/use-capabilities";
import { useUpgradeModal } from "../components/UpgradeModal";
import { apiFetch } from "@/lib/queryClient";

interface DirectiveReference {
  directive_id: string;
  priority: number;
}

interface TakeoverConfig {
  enabled: boolean;
  triggers: string[];
  keywords: string[];
  sentiment_threshold: number;
  confidence_threshold: number;
  time_threshold_minutes: number;
  notification_channels: string[];
  auto_pause_ai: boolean;
}

interface AITemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  base_persona: string;
  directives: DirectiveReference[];
  knowledge_base_ids: string[];
  takeover_rules: TakeoverConfig | null;
  recommended_model: string;
  temperature: number;
  max_tokens: number;
  is_system: boolean;
  created_by: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string | null;
}

interface Workspace {
  id: string;
  title: string;
  mode: string;
  status: string;
  first_message?: string;
}

const CATEGORY_INFO: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  customer_support: { label: "Customer Support", icon: <Headphones size={16} />, color: "bg-blue-500" },
  sales_marketing: { label: "Sales & Marketing", icon: <TrendingUp size={16} />, color: "bg-green-500" },
  technical: { label: "Technical", icon: <Code size={16} />, color: "bg-purple-500" },
  content: { label: "Content", icon: <FileText size={16} />, color: "bg-orange-500" },
  business: { label: "Business", icon: <Briefcase size={16} />, color: "bg-slate-500" },
};

const ICON_MAP: Record<string, React.ReactNode> = {
  headphones: <Headphones size={24} />,
  "help-circle": <HelpCircle size={24} />,
  "trending-up": <TrendingUp size={24} />,
  filter: <Filter size={24} />,
  code: <Code size={24} />,
  "file-text": <FileText size={24} />,
  "edit-3": <Edit3 size={24} />,
  mail: <Mail size={24} />,
  clipboard: <Clipboard size={24} />,
  "bar-chart-2": <BarChart2 size={24} />,
  bot: <Bot size={24} />,
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<AITemplate[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showUserOnly, setShowUserOnly] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AITemplate | null>(null);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
  const [deployGlobally, setDeployGlobally] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{
    message: string;
    agent_id: string;
    agent_name: string;
    integration: {
      endpoint: string;
      agent_id: string;
      curl: string;
      python: string;
      javascript: string;
    };
  } | null>(null);
  const [deploySuccess, setDeploySuccess] = useState<string | null>(null);
  const [snippetTab, setSnippetTab] = useState<"curl" | "python" | "javascript">("curl");
  const [copied, setCopied] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    category: "customer_support",
    icon: "bot",
    base_persona: "",
    recommended_model: "",
    temperature: 0.7,
    max_tokens: 2048,
    enableTakeover: false,
    takeover_keywords: "",
    takeover_auto_pause: true
  });
  
  const { models, isLoading: modelsLoading } = useAvailableModels();
  const { canUsePremiumFeatures } = useCapabilities();
  const { showUpgradeModal, UpgradeModalComponent } = useUpgradeModal();
  
  useEffect(() => {
    if (models.length > 0 && !createForm.recommended_model) {
      setCreateForm(prev => ({ ...prev, recommended_model: models[0].id }));
    }
  }, [models]);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedCategory, showUserOnly]);

  const loadData = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append("category", selectedCategory);
      if (showUserOnly) params.append("user_only", "true");

      const [templatesRes, workspacesRes] = await Promise.all([
        apiFetch(`/api/templates?${params}`),
        apiFetch("/api/workspaces?active_only=false")
      ]);

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates);
      }

      if (workspacesRes.ok) {
        const data = await workspacesRes.json();
        setWorkspaces(data.workspaces || []);
      } else if (workspacesRes.status === 403) {
        const userWsRes = await apiFetch("/api/user/workspaces");
        if (userWsRes.ok) {
          const data = await userWsRes.json();
          setWorkspaces(data.workspaces || []);
        }
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const category = template.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {} as Record<string, AITemplate[]>);

  const handleDeploy = async () => {
    if (!selectedTemplate || (!selectedWorkspace && !deployGlobally)) return;

    setIsDeploying(true);
    try {
      const res = await apiFetch(`/api/templates/${selectedTemplate.id}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: deployGlobally ? null : selectedWorkspace,
          template_id: selectedTemplate.id,
          deploy_globally: deployGlobally,
          apply_persona: true,
          apply_directives: true,
          apply_takeover_rules: true
        })
      });

      if (res.ok) {
        const result = await res.json();
        if (result.deployed_agent_id && result.integration) {
          setDeployResult({
            message: result.message,
            agent_id: result.deployed_agent_id,
            agent_name: result.agent_name || selectedTemplate.name,
            integration: result.integration
          });
          setSnippetTab("curl");
          setCopied(false);
        } else {
          setDeploySuccess(result.message);
          setTimeout(() => {
            setShowDeployModal(false);
            setDeploySuccess(null);
            setDeployGlobally(false);
            setSelectedWorkspace("");
          }, 2000);
        }
      } else if (res.status === 402) {
        setShowDeployModal(false);
        showUpgradeModal("Template Deployment");
      }
    } catch (error) {
      console.error("Deploy failed:", error);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleClone = async (template: AITemplate) => {
    try {
      const res = await apiFetch(`/api/templates/${template.id}/clone`, {
        method: "POST"
      });

      if (res.ok) {
        await loadData();
      } else if (res.status === 402) {
        showUpgradeModal("Template Cloning");
      }
    } catch (error) {
      console.error("Clone failed:", error);
    }
  };

  const handleClearGlobalTemplate = async () => {
    setIsClearing(true);
    try {
      const res = await apiFetch("/api/templates/deployments/global", {
        method: "DELETE"
      });
      if (res.ok) {
        const result = await res.json();
        setClearSuccess(result.message);
        setTimeout(() => setClearSuccess(null), 3000);
      }
    } catch (error) {
      console.error("Clear global template failed:", error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearWorkspaceTemplate = async (workspaceId: string, clearPrompt: boolean = false) => {
    setIsClearing(true);
    try {
      const res = await apiFetch(`/api/templates/deployments/workspace/${workspaceId}?clear_system_prompt=${clearPrompt}`, {
        method: "DELETE"
      });
      if (res.ok) {
        const result = await res.json();
        setClearSuccess(result.message);
        setTimeout(() => setClearSuccess(null), 3000);
      }
    } catch (error) {
      console.error("Clear workspace template failed:", error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!createForm.name.trim() || !createForm.base_persona.trim()) {
      setCreateError("Name and persona are required");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const payload: any = {
        name: createForm.name,
        description: createForm.description,
        category: createForm.category,
        icon: createForm.icon,
        base_persona: createForm.base_persona,
        recommended_model: createForm.recommended_model,
        temperature: createForm.temperature,
        max_tokens: createForm.max_tokens,
        directives: [],
        knowledge_base_ids: []
      };

      if (createForm.enableTakeover) {
        payload.takeover_rules = {
          enabled: true,
          triggers: ["keyword_match"],
          keywords: createForm.takeover_keywords.split(",").map(k => k.trim()).filter(k => k),
          sentiment_threshold: -0.5,
          confidence_threshold: 0.6,
          time_threshold_minutes: 30,
          notification_channels: ["email", "in_app"],
          auto_pause_ai: createForm.takeover_auto_pause
        };
      }

      const res = await apiFetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowCreateModal(false);
        setCreateForm({
          name: "",
          description: "",
          category: "customer_support",
          icon: "bot",
          base_persona: "",
          recommended_model: models.length > 0 ? models[0].id : "",
          temperature: 0.7,
          max_tokens: 2048,
          enableTakeover: false,
          takeover_keywords: "",
          takeover_auto_pause: true
        });
        await loadData();
      } else if (res.status === 402) {
        setShowCreateModal(false);
        showUpgradeModal("Template Creation");
      } else {
        const error = await res.json();
        setCreateError(error.detail || "Failed to create template");
      }
    } catch (error) {
      console.error("Create failed:", error);
      setCreateError("Failed to create template");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-lg bg-black/40 hover:bg-white/10 transition-colors"
                data-testid="button-back"
              >
                <ArrowLeft size={20} />
              </motion.button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                AI Templates
              </h1>
              <p className="text-slate-400 mt-1">Deployable AI Playbooks with composable layers</p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
            data-testid="button-create-template"
          >
            <Plus size={18} />
            Create Template
          </motion.button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-64 shrink-0">
            <div className="sticky top-8">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  data-testid="input-search-templates"
                />
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    !selectedCategory ? "bg-purple-600/20 text-purple-400" : "hover:bg-black/40"
                  }`}
                  data-testid="button-category-all"
                >
                  <Layers size={18} />
                  <span>All Templates</span>
                  <span className="ml-auto text-sm text-slate-500">{templates.length}</span>
                </button>

                {Object.entries(CATEGORY_INFO).map(([key, info]) => {
                  const count = templates.filter(t => t.category === key).length;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        selectedCategory === key ? "bg-purple-600/20 text-purple-400" : "hover:bg-black/40"
                      }`}
                      data-testid={`button-category-${key}`}
                    >
                      {info.icon}
                      <span>{info.label}</span>
                      <span className="ml-auto text-sm text-slate-500">{count}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 p-4 bg-black/40 rounded-lg border border-white/10">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showUserOnly}
                    onChange={(e) => setShowUserOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500"
                    data-testid="checkbox-user-only"
                  />
                  <span className="text-sm">My Templates Only</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex-1">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="templates-loading-grid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ShimmerCard key={i} testId={`shimmer-template-${i}`} />
                ))}
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-16">
                <Bot size={48} className="mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400">No templates found</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className={`p-1.5 rounded-lg ${CATEGORY_INFO[category]?.color || "bg-slate-600"}`}>
                        {CATEGORY_INFO[category]?.icon}
                      </div>
                      <h2 className="text-lg font-semibold">{CATEGORY_INFO[category]?.label || category}</h2>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {categoryTemplates.map((template) => (
                        <motion.div
                          key={template.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-black/40 border border-white/10 rounded-xl p-5 hover:border-purple-500/50 transition-all group"
                          data-testid={`card-template-${template.id}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-lg">
                                {ICON_MAP[template.icon] || <Bot size={24} />}
                              </div>
                              <div>
                                <h3 className="font-semibold">{template.name}</h3>
                                {template.is_system && (
                                  <span className="text-xs text-purple-400 flex items-center gap-1">
                                    <Star size={10} /> System Template
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <p className="text-sm text-slate-400 mb-4 line-clamp-2">{template.description}</p>

                          <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                            <span className="flex items-center gap-1">
                              <Users size={12} />
                              {template.usage_count} uses
                            </span>
                            <span className="flex items-center gap-1">
                              <Zap size={12} />
                              {template.recommended_model.split("-")[0]}
                            </span>
                            {template.takeover_rules?.enabled && (
                              <span className="flex items-center gap-1 text-amber-500">
                                <Shield size={12} />
                                Takeover
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setSelectedTemplate(template);
                                setShowDeployModal(true);
                              }}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-sm font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
                              data-testid={`button-deploy-${template.id}`}
                            >
                              <Rocket size={14} />
                              Deploy
                            </motion.button>

                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleClone(template)}
                              className="px-3 py-2 bg-black/40 hover:bg-white/10 rounded-lg text-sm transition-colors"
                              title="Clone template"
                              data-testid={`button-clone-${template.id}`}
                            >
                              <Copy size={14} />
                            </motion.button>

                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setSelectedTemplate(template)}
                              className="px-3 py-2 bg-black/40 hover:bg-white/10 rounded-lg text-sm transition-colors"
                              title="View details"
                              data-testid={`button-view-${template.id}`}
                            >
                              <Settings size={14} />
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showDeployModal && selectedTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !isDeploying && !deployResult && setShowDeployModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`bg-slate-900 border border-white/10 rounded-xl p-6 w-full ${deployResult ? "max-w-2xl" : "max-w-md"}`}
            >
              {deployResult ? (
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
                      <Check size={24} className="text-green-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold" data-testid="text-deploy-success">Agent Live: {deployResult.agent_name}</h3>
                      <p className="text-slate-400 text-sm">{deployResult.message}</p>
                    </div>
                  </div>

                  <div className="mb-4 p-3 bg-black/40 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 uppercase tracking-wider">Agent ID</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(deployResult.agent_id);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                        data-testid="button-copy-agent-id"
                      >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <code className="text-sm text-green-400 font-mono mt-1 block" data-testid="text-agent-id">{deployResult.agent_id}</code>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-slate-300 mb-3">Use this code to call your agent:</p>
                    <div className="flex gap-1 mb-2">
                      {(["curl", "python", "javascript"] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setSnippetTab(tab)}
                          className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                            snippetTab === tab
                              ? "bg-purple-600 text-white"
                              : "bg-black/40 text-slate-400 hover:bg-white/10"
                          }`}
                          data-testid={`button-tab-${tab}`}
                        >
                          {tab === "curl" ? "cURL" : tab === "python" ? "Python" : "JavaScript"}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <pre className="bg-black/50 border border-white/10 rounded-lg p-4 text-xs text-slate-300 font-mono overflow-x-auto max-h-64 whitespace-pre-wrap" data-testid="code-snippet">
                        {deployResult.integration[snippetTab]}
                      </pre>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(deployResult.integration[snippetTab]);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-slate-700/80 hover:bg-slate-600 rounded text-slate-300 transition-colors"
                        data-testid="button-copy-snippet"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Link
                      href="/dashboard/deployed-agents"
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-sm font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
                      data-testid="link-view-agents"
                    >
                      <Rocket size={16} />
                      View All Agents
                    </Link>
                    <button
                      onClick={() => {
                        setShowDeployModal(false);
                        setDeployResult(null);
                        setDeployGlobally(false);
                        setSelectedWorkspace("");
                      }}
                      className="px-4 py-2.5 bg-black/40 hover:bg-white/10 rounded-lg text-sm transition-colors"
                      data-testid="button-close-success"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : deploySuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={32} className="text-green-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Deployed Successfully!</h3>
                  <p className="text-slate-400">{deploySuccess}</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold">Deploy Template</h3>
                    <button
                      onClick={() => setShowDeployModal(false)}
                      className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                      data-testid="button-close-deploy"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="bg-black/40 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-purple-600/20 rounded-lg">
                        {ICON_MAP[selectedTemplate.icon] || <Bot size={20} />}
                      </div>
                      <div>
                        <h4 className="font-medium">{selectedTemplate.name}</h4>
                        <p className="text-xs text-slate-400">{selectedTemplate.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-purple-600/10 border border-purple-500/30 rounded-lg hover:bg-purple-600/20 transition-colors">
                      <input
                        type="checkbox"
                        checked={deployGlobally}
                        onChange={(e) => {
                          setDeployGlobally(e.target.checked);
                          if (e.target.checked) setSelectedWorkspace("");
                        }}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500"
                        data-testid="checkbox-deploy-globally"
                      />
                      <div>
                        <span className="font-medium text-purple-300">Deploy Globally</span>
                        <p className="text-xs text-slate-400 mt-0.5">Apply to all current and future workspaces</p>
                      </div>
                    </label>
                  </div>

                  {!deployGlobally && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Or Select Specific Workspace
                      </label>
                      <select
                        value={selectedWorkspace}
                        onChange={(e) => setSelectedWorkspace(e.target.value)}
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 [&>option]:bg-slate-900 [&>option]:text-white"
                        data-testid="select-workspace"
                      >
                        <option value="">Choose a workspace...</option>
                        {workspaces.length === 0 ? (
                          <option value="" disabled>No workspaces available</option>
                        ) : (
                          workspaces.map((ws) => (
                            <option key={ws.id} value={ws.id}>
                              {ws.title || ws.first_message || `Workspace ${ws.id.slice(0, 8)}`}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  )}

                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
                    <p className="text-sm text-amber-200">
                      {deployGlobally 
                        ? "This will apply the template's persona, directives, and takeover rules to ALL workspaces."
                        : "This will apply the template's persona, directives, and takeover rules to the selected workspace."}
                    </p>
                  </div>

                  {clearSuccess && (
                    <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-300 text-sm flex items-center gap-2">
                      <Check size={16} />
                      {clearSuccess}
                    </div>
                  )}

                  <div className="border-t border-white/10 pt-4 mb-4">
                    <h4 className="text-sm font-medium text-slate-300 mb-3">Remove Deployed Templates</h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleClearGlobalTemplate}
                        disabled={isClearing}
                        className="px-3 py-2 text-sm bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg transition-colors disabled:opacity-50"
                        data-testid="button-clear-global-template"
                      >
                        {isClearing ? "Clearing..." : "Clear Global Default"}
                      </button>
                      {selectedWorkspace && (
                        <button
                          onClick={() => handleClearWorkspaceTemplate(selectedWorkspace, true)}
                          disabled={isClearing}
                          className="px-3 py-2 text-sm bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg transition-colors disabled:opacity-50"
                          data-testid="button-clear-workspace-template"
                        >
                          {isClearing ? "Clearing..." : "Remove from Workspace"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeployModal(false)}
                      className="flex-1 px-4 py-3 bg-black/40 hover:bg-white/10 rounded-lg font-medium transition-colors"
                      data-testid="button-cancel-deploy"
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleDeploy}
                      disabled={(!selectedWorkspace && !deployGlobally) || isDeploying}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="button-confirm-deploy"
                    >
                      {isDeploying ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      ) : (
                        <>
                          <Rocket size={18} />
                          Deploy Now
                        </>
                      )}
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTemplate && !showDeployModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedTemplate(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-lg">
                    {ICON_MAP[selectedTemplate.icon] || <Bot size={28} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedTemplate.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-xs ${CATEGORY_INFO[selectedTemplate.category]?.color}`}>
                        {CATEGORY_INFO[selectedTemplate.category]?.label}
                      </span>
                      {selectedTemplate.is_system && (
                        <span className="px-2 py-0.5 bg-purple-600/30 text-purple-300 rounded text-xs flex items-center gap-1">
                          <Star size={10} /> System
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  data-testid="button-close-details"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-slate-400 mb-6">{selectedTemplate.description}</p>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <Bot size={16} /> Base Persona
                  </h4>
                  <div className="bg-black/40 rounded-lg p-4 text-sm text-slate-300">
                    {selectedTemplate.base_persona}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-black/40 rounded-lg p-4">
                    <p className="text-xs text-slate-500 mb-1">Model</p>
                    <p className="text-sm font-medium">{selectedTemplate.recommended_model}</p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-4">
                    <p className="text-xs text-slate-500 mb-1">Temperature</p>
                    <p className="text-sm font-medium">{selectedTemplate.temperature}</p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-4">
                    <p className="text-xs text-slate-500 mb-1">Max Tokens</p>
                    <p className="text-sm font-medium">{selectedTemplate.max_tokens}</p>
                  </div>
                </div>

                {selectedTemplate.takeover_rules?.enabled && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                      <Shield size={16} className="text-amber-500" /> Human Takeover Rules
                    </h4>
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedTemplate.takeover_rules.triggers.map((trigger) => (
                          <span key={trigger} className="px-2 py-1 bg-amber-500/20 text-amber-300 rounded text-xs">
                            {trigger.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                      {selectedTemplate.takeover_rules.keywords.length > 0 && (
                        <p className="text-xs text-amber-200/70">
                          Keywords: {selectedTemplate.takeover_rules.keywords.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 pt-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users size={14} />
                    {selectedTemplate.usage_count} deployments
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    Created {new Date(selectedTemplate.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-white/10">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowDeployModal(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium"
                  data-testid="button-deploy-from-details"
                >
                  <Rocket size={18} />
                  Deploy to Workspace
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    handleClone(selectedTemplate);
                    setSelectedTemplate(null);
                  }}
                  className="px-4 py-3 bg-black/40 hover:bg-white/10 rounded-lg font-medium flex items-center gap-2"
                  data-testid="button-clone-from-details"
                >
                  <Copy size={18} />
                  Clone
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Template Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/10"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Create New Template</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  data-testid="button-close-create-modal"
                >
                  <X size={20} />
                </button>
              </div>

              {createError && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                  {createError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Template Name *</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="e.g., Customer Onboarding Assistant"
                    className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    data-testid="input-template-name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                  <input
                    type="text"
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="Brief description of what this template does"
                    className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500"
                    data-testid="input-template-description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                    <select
                      value={createForm.category}
                      onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                      className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-500 [&>option]:bg-slate-900 [&>option]:text-white"
                      data-testid="select-template-category"
                    >
                      <option value="customer_support">Customer Support</option>
                      <option value="sales_marketing">Sales & Marketing</option>
                      <option value="technical">Technical</option>
                      <option value="content">Content</option>
                      <option value="business">Business</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Icon</label>
                    <select
                      value={createForm.icon}
                      onChange={(e) => setCreateForm({ ...createForm, icon: e.target.value })}
                      className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-500 [&>option]:bg-slate-900 [&>option]:text-white"
                      data-testid="select-template-icon"
                    >
                      <option value="bot">Bot</option>
                      <option value="headphones">Headphones</option>
                      <option value="help-circle">Help Circle</option>
                      <option value="trending-up">Trending Up</option>
                      <option value="code">Code</option>
                      <option value="file-text">File Text</option>
                      <option value="mail">Mail</option>
                      <option value="clipboard">Clipboard</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Base Persona *</label>
                  <textarea
                    value={createForm.base_persona}
                    onChange={(e) => setCreateForm({ ...createForm, base_persona: e.target.value })}
                    placeholder="Describe the AI's personality, tone, and behavior..."
                    rows={4}
                    className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 resize-none"
                    data-testid="input-template-persona"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Model</label>
                    <select
                      value={createForm.recommended_model}
                      onChange={(e) => setCreateForm({ ...createForm, recommended_model: e.target.value })}
                      className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-500 [&>option]:bg-slate-900 [&>option]:text-white"
                      data-testid="select-template-model"
                      disabled={modelsLoading}
                    >
                      {modelsLoading ? (
                        <option value="">Loading models...</option>
                      ) : (
                        models.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Temperature</label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={createForm.temperature}
                      onChange={(e) => setCreateForm({ ...createForm, temperature: parseFloat(e.target.value) })}
                      className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-500"
                      data-testid="input-template-temperature"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Max Tokens</label>
                    <input
                      type="number"
                      min="256"
                      max="8192"
                      step="256"
                      value={createForm.max_tokens}
                      onChange={(e) => setCreateForm({ ...createForm, max_tokens: parseInt(e.target.value) })}
                      className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-500"
                      data-testid="input-template-max-tokens"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-600 pt-4">
                  <label className="flex items-center gap-3 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={createForm.enableTakeover}
                      onChange={(e) => setCreateForm({ ...createForm, enableTakeover: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500"
                      data-testid="checkbox-enable-takeover"
                    />
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Shield size={16} className="text-amber-500" />
                      Enable Human Takeover Rules
                    </span>
                  </label>

                  {createForm.enableTakeover && (
                    <div className="space-y-4 pl-7">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Trigger Keywords (comma-separated)</label>
                        <input
                          type="text"
                          value={createForm.takeover_keywords}
                          onChange={(e) => setCreateForm({ ...createForm, takeover_keywords: e.target.value })}
                          placeholder="e.g., refund, cancel, speak to manager"
                          className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500"
                          data-testid="input-takeover-keywords"
                        />
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={createForm.takeover_auto_pause}
                          onChange={(e) => setCreateForm({ ...createForm, takeover_auto_pause: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500"
                          data-testid="checkbox-auto-pause"
                        />
                        <span className="text-sm">Auto-pause AI when triggered</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-slate-600">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
                  data-testid="button-cancel-create"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateTemplate}
                  disabled={isCreating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium disabled:opacity-50"
                  data-testid="button-submit-create"
                >
                  {isCreating ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <>
                      <Plus size={18} />
                      Create Template
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <UpgradeModalComponent />
    </div>
  );
}
