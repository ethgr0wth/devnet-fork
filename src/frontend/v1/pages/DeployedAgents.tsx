import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft, Bot, Rocket, Power, PowerOff, Trash2, RefreshCw, 
  Settings, Zap, BookOpen, Clock, Check, AlertCircle, Loader2, Archive,
  Code, Copy, ChevronDown, ChevronUp, Terminal
} from "lucide-react";
import { useEpicModal } from "@/components/ui/epic-modal";
import { apiFetch } from "@/lib/queryClient";

interface DeployedAgent {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  version: number;
  status: "active" | "inactive" | "archived";
  source_session_id?: string;
  template_id?: string;
  template_name?: string;
  model_provider: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  persona?: string;
  directives: any[];
  knowledge_items: any[];
  inherit_global_directives: boolean;
  inherit_global_kb: boolean;
  deployed_at: string;
  created_at: string;
  updated_at: string;
}

interface IntegrationSnippets {
  endpoint: string;
  agent_id: string;
  curl: string;
  python: string;
  javascript: string;
}

export default function DeployedAgents() {
  const [agents, setAgents] = useState<DeployedAgent[]>([]);
  const [activeAgent, setActiveAgent] = useState<DeployedAgent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [snippetTab, setSnippetTab] = useState<"curl" | "python" | "javascript">("curl");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [integrationData, setIntegrationData] = useState<Record<string, IntegrationSnippets>>({});
  const [integrationLoading, setIntegrationLoading] = useState<string | null>(null);
  const { showModal, closeModal, ModalComponent } = useEpicModal();

  const loadIntegration = async (agentId: string) => {
    if (integrationData[agentId]) return;
    setIntegrationLoading(agentId);
    try {
      const res = await apiFetch(`/api/deployed-agents/${agentId}/integration`);
      if (res.ok) {
        const data = await res.json();
        setIntegrationData(prev => ({ ...prev, [agentId]: data }));
      }
    } catch (error) {
      console.error("Failed to load integration:", error);
    } finally {
      setIntegrationLoading(null);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const [agentsRes, activeRes] = await Promise.all([
        apiFetch("/api/deployed-agents?include_archived=false"),
        apiFetch("/api/deployed-agents/active")
      ]);

      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAgents(data);
      }
      if (activeRes.ok) {
        const active = await activeRes.json();
        setActiveAgent(active);
      }
    } catch (error) {
      console.error("Failed to load agents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const activateAgent = async (agentId: string) => {
    setActionLoading(agentId);
    try {
      const res = await apiFetch(`/api/deployed-agents/${agentId}/activate`, {
        method: "POST"
      });
      if (res.ok) {
        await loadAgents();
      }
    } catch (error) {
      console.error("Failed to activate agent:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const deactivateAll = async () => {
    setActionLoading("deactivate");
    try {
      const res = await apiFetch("/api/deployed-agents/deactivate", {
        method: "POST"
      });
      if (res.ok) {
        await loadAgents();
      }
    } catch (error) {
      console.error("Failed to deactivate:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const archiveAgent = (agentId: string) => {
    showModal({
      title: "Archive Agent",
      description: "This agent will be hidden from the list but can be restored later. Are you sure you want to archive it?",
      confirmText: "Archive",
      cancelText: "Keep Active",
      variant: "warning",
      icon: "archive",
      onConfirm: async () => {
        closeModal();
        setActionLoading(agentId);
        try {
          const res = await apiFetch(`/api/deployed-agents/${agentId}/archive`, {
            method: "POST"
          });
          if (res.ok) {
            await loadAgents();
          }
        } catch (error) {
          console.error("Failed to archive agent:", error);
        } finally {
          setActionLoading(null);
        }
      }
    });
  };

  const deleteAgent = (agentId: string) => {
    showModal({
      title: "Delete Agent Permanently",
      description: "This action cannot be undone. The agent and all its configuration will be permanently removed from your account.",
      confirmText: "Delete Forever",
      cancelText: "Cancel",
      variant: "danger",
      icon: "trash",
      onConfirm: async () => {
        closeModal();
        setActionLoading(agentId);
        try {
          const res = await apiFetch(`/api/deployed-agents/${agentId}`, {
            method: "DELETE"
          });
          if (res.ok) {
            await loadAgents();
          }
        } catch (error) {
          console.error("Failed to delete agent:", error);
        } finally {
          setActionLoading(null);
        }
      }
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white" data-testid="text-page-title">Deployed Agents</h1>
                <p className="text-sm text-slate-400">Manage your production AI agents</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {activeAgent && (
              <button
                onClick={deactivateAll}
                disabled={actionLoading === "deactivate"}
                className="flex items-center gap-2 px-3 py-2 border border-slate-600 text-slate-300 hover:bg-slate-800 rounded-lg text-xs sm:text-sm"
                data-testid="button-deactivate-all"
              >
                {actionLoading === "deactivate" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <PowerOff size={14} />
                )}
                <span className="hidden sm:inline">Use Global Settings</span>
                <span className="sm:hidden">Global</span>
              </button>
            )}
            <Link 
              href="/dashboard/playground"
              className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs sm:text-sm"
              data-testid="link-playground"
            >
              <Bot size={14} />
              <span className="hidden sm:inline">Go to Playground</span>
              <span className="sm:hidden">Playground</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {activeAgent && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-green-400 font-medium">Active Agent: {activeAgent.name}</p>
                <p className="text-green-400/70 text-sm">
                  v{activeAgent.version} - {activeAgent.model_name}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {agents.length === 0 ? (
          <div className="text-center py-16">
            <Rocket className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Deployed Agents</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Create and test your AI configuration in the Playground, then deploy it here for production use.
            </p>
            <Link
              href="/dashboard/playground"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              data-testid="link-create-first"
            >
              <Bot size={18} />
              Open Playground
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {agents.map(agent => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-5 rounded-xl border transition-colors ${
                  agent.status === "active"
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-slate-800/50 border-white/10 hover:border-white/20"
                }`}
                data-testid={`agent-card-${agent.id}`}
              >
                <div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="text-base sm:text-lg font-semibold text-white break-all">{agent.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                        agent.status === "active" 
                          ? "bg-green-500/20 text-green-400"
                          : "bg-slate-700 text-slate-400"
                      }`}>
                        v{agent.version}
                      </span>
                      {agent.status === "active" && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs shrink-0">
                          <Power size={12} /> Active
                        </span>
                      )}
                    </div>
                    
                    {agent.description && (
                      <p className="text-slate-400 text-sm mb-3 break-words">{agent.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Settings size={14} />
                        {agent.model_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap size={14} />
                        {agent.directives.length} directives
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen size={14} />
                        {agent.knowledge_items.length} KB items
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        Deployed {formatDate(agent.deployed_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {agent.inherit_global_directives && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                          + Global Directives
                        </span>
                      )}
                      {agent.inherit_global_kb && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                          + Global KB
                        </span>
                      )}
                      {agent.template_name && (
                        <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs">
                          Template: {agent.template_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <button
                      onClick={() => {
                        const isExpanding = expandedAgent !== agent.id;
                        setExpandedAgent(isExpanding ? agent.id : null);
                        setSnippetTab("curl");
                        if (isExpanding) loadIntegration(agent.id);
                      }}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs sm:text-sm transition-colors ${
                        expandedAgent === agent.id
                          ? "bg-purple-600/20 text-purple-400 border border-purple-500/30"
                          : "bg-white/5 hover:bg-white/10 text-slate-300"
                      }`}
                      data-testid={`button-integrate-${agent.id}`}
                    >
                      <Terminal size={14} />
                      Integrate
                      {expandedAgent === agent.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {agent.status !== "active" && (
                      <button
                        onClick={() => activateAgent(agent.id)}
                        disabled={actionLoading === agent.id}
                        className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs sm:text-sm"
                        data-testid={`button-activate-${agent.id}`}
                      >
                        {actionLoading === agent.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Power size={14} />
                        )}
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => archiveAgent(agent.id)}
                      disabled={actionLoading === agent.id}
                      className="p-2 text-slate-400 hover:text-yellow-400 rounded-lg hover:bg-slate-700"
                      title="Archive agent"
                      data-testid={`button-archive-${agent.id}`}
                    >
                      <Archive size={16} />
                    </button>
                    <button
                      onClick={() => deleteAgent(agent.id)}
                      disabled={actionLoading === agent.id}
                      className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-700"
                      title="Delete agent"
                      data-testid={`button-delete-${agent.id}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {expandedAgent === agent.id && (() => {
                  const snippets = integrationData[agent.id];
                  if (integrationLoading === agent.id || !snippets) {
                    return (
                      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center py-6">
                        <Loader2 size={20} className="animate-spin text-purple-400" />
                        <span className="ml-2 text-sm text-slate-400">Loading integration code...</span>
                      </div>
                    );
                  }
                  return (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-white/10"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
                          <Code size={14} />
                          Integration Code
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Agent ID:</span>
                          <code className="text-xs text-green-400 font-mono bg-black/30 px-2 py-0.5 rounded">{agent.id}</code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(agent.id);
                              setCopiedId(agent.id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            className="text-xs text-slate-400 hover:text-white"
                            data-testid={`button-copy-id-${agent.id}`}
                          >
                            {copiedId === agent.id ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-1 mb-2">
                        {(["curl", "python", "javascript"] as const).map(tab => (
                          <button
                            key={tab}
                            onClick={() => setSnippetTab(tab)}
                            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                              snippetTab === tab
                                ? "bg-purple-600 text-white"
                                : "bg-white/5 text-slate-400 hover:bg-white/10"
                            }`}
                            data-testid={`button-snippet-${tab}-${agent.id}`}
                          >
                            {tab === "curl" ? "cURL" : tab === "python" ? "Python" : "JavaScript"}
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <pre className="bg-black/50 border border-white/10 rounded-lg p-4 text-xs text-slate-300 font-mono overflow-x-auto max-h-56 whitespace-pre-wrap">
                          {snippets[snippetTab]}
                        </pre>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(snippets[snippetTab]);
                            setCopiedId(`snippet-${agent.id}`);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-slate-700/80 hover:bg-slate-600 rounded text-slate-300 transition-colors"
                          data-testid={`button-copy-snippet-${agent.id}`}
                        >
                          {copiedId === `snippet-${agent.id}` ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        Replace <code className="text-amber-400">aai_YOUR_API_KEY</code> with your API key from{" "}
                        <Link href="/dashboard/api-keys" className="text-purple-400 hover:text-purple-300 underline">
                          Settings
                        </Link>
                      </p>
                    </motion.div>
                  );
                })()}
              </motion.div>
            ))}
          </div>
        )}
      </main>
      <ModalComponent />
    </div>
  );
}
