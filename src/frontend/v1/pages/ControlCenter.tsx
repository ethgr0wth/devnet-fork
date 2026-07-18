import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Sparkles,
  Shield,
  Target,
  Bot,
  Activity,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  ArrowLeft,
  Lock,
  Zap,
  Server,
  Settings,
  Eye
} from "lucide-react";
import { apiFetch } from "@/lib/queryClient";

interface DirectivesSummary {
  total: number;
  by_type: Record<string, number>;
  active: number;
}

interface AgentsSummary {
  total_deployed: number;
  active_count: number;
  agents: { id: string; name: string; status: string; template_name?: string; created_at?: string }[];
}

interface ProviderStatus {
  name: string;
  status: string;
  model?: string;
}

interface AuditEvent {
  timestamp: string;
  event_type: string;
  description: string;
  user_id?: string;
  user_name?: string;
}

interface WorkspaceModeSummary {
  total: number;
  ai: number;
  shadow: number;
  takeover: number;
}

interface AIHealth {
  overall: string;
  llm_provider: string;
  cloud: string;
  response_latency_ms: number;
}

interface ControlCenterData {
  directives: DirectivesSummary;
  agents: AgentsSummary;
  providers: ProviderStatus[];
  workspace_modes: WorkspaceModeSummary;
  recent_audit_events: AuditEvent[];
  ai_health: AIHealth;
}

const DIRECTIVE_TYPE_LABELS: Record<string, string> = {
  guidance: "Guidance",
  tone: "Tone & Voice",
  context: "Context",
  constraint: "Constraints",
  persona: "Persona"
};

export default function ControlCenterPage() {
  const [data, setData] = useState<ControlCenterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadControlCenterData();
  }, []);

  const loadControlCenterData = async () => {
    setIsRefreshing(true);
    try {
      const res = await apiFetch("/api/control-center");
      if (res.ok) {
        const result = await res.json();
        setData(result);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error("Failed to load control center data:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getEventTypeIcon = (eventType: string) => {
    if (eventType.includes("directive")) return <Target className="w-4 h-4 text-purple-400" />;
    if (eventType.includes("template") || eventType.includes("agent") || eventType.includes("deployed")) return <Bot className="w-4 h-4 text-pink-400" />;
    if (eventType.includes("takeover") || eventType.includes("workspace")) return <Users className="w-4 h-4 text-amber-400" />;
    if (eventType.includes("snapshot") || eventType.includes("policy")) return <Shield className="w-4 h-4 text-cyan-400" />;
    if (eventType.includes("provider")) return <Server className="w-4 h-4 text-emerald-400" />;
    return <Activity className="w-4 h-4 text-gray-400" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
      case "active":
      case "healthy":
        return "text-emerald-400";
      case "paused":
      case "degraded":
      case "not_configured":
        return "text-amber-400";
      case "disconnected":
      case "unhealthy":
        return "text-red-400";
      default:
        return "text-white/50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
      case "active":
      case "healthy":
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case "paused":
      case "not_configured":
        return <Clock className="w-4 h-4 text-amber-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-red-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/60">
          <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
          <span>Loading Control Center...</span>
        </div>
      </div>
    );
  }

  const health = data?.ai_health;
  const modes = data?.workspace_modes;
  const takeoverRate = modes && modes.total > 0 
    ? Math.round(((modes.shadow + modes.takeover) / modes.total) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-background" data-testid="page-control-center">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" data-testid="link-home">
            <img src="/favicon.png" alt="AiAssist" className="w-7 h-7 object-contain" />
            <span className="font-display font-bold text-lg">AiAssist</span>
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Secure</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40 hidden sm:block">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
            <button
              onClick={loadControlCenterData}
              disabled={isRefreshing}
              className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              data-testid="button-refresh"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold" data-testid="text-page-title">AI Control Center</h1>
              <span className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white/50">
                <Eye className="w-3 h-3" />
                Read-Only
              </span>
            </div>
            <p className="text-white/60 mt-1">Executive dashboard for AI governance and compliance</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-8 p-4 rounded-xl border ${
            health?.overall === "healthy"
              ? "bg-emerald-500/10 border-emerald-500/20"
              : health?.overall === "degraded"
                ? "bg-amber-500/10 border-amber-500/20"
                : "bg-red-500/10 border-red-500/20"
          }`}
          data-testid="banner-ai-health"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {health?.overall === "healthy" ? (
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              ) : health?.overall === "degraded" ? (
                <AlertCircle className="w-6 h-6 text-amber-400" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-400" />
              )}
              <div>
                <span className={`font-medium ${getStatusColor(health?.overall || "")}`} data-testid="text-health-status">
                  AI System {health?.overall === "healthy" ? "Healthy" : health?.overall === "degraded" ? "Degraded" : "Unhealthy"}
                </span>
                <span className="text-white/50 ml-2 text-sm">
                  {health?.response_latency_ms}ms cloud latency
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-white/40" />
                <span className={getStatusColor(health?.llm_provider || "")} data-testid="text-llm-status">
                  LLM: {health?.llm_provider === "connected" ? "Connected" : "Not Configured"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-white/40" />
                <span className={getStatusColor(health?.cloud || "")} data-testid="text-cloud-status">
                  Cloud: {health?.cloud === "connected" ? "Connected" : "Down"}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 border border-white/10 rounded-xl p-6"
            data-testid="card-directives"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Active Directives</h3>
                  <p className="text-sm text-white/50" data-testid="text-directives-count">
                    {data?.directives.active || 0} of {data?.directives.total || 0} active
                  </p>
                </div>
              </div>
              <Link href="/dashboard/directives" className="text-xs text-purple-400 hover:underline" data-testid="link-manage-directives">
                Manage →
              </Link>
            </div>
            <div className="space-y-2">
              {Object.entries(data?.directives.by_type || {}).filter(([, count]) => count > 0).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-3 bg-white/5 rounded-lg" data-testid={`directive-type-${type}`}>
                  <span className="text-sm">{DIRECTIVE_TYPE_LABELS[type] || type}</span>
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">{count}</span>
                </div>
              ))}
              {(data?.directives.total || 0) === 0 && (
                <div className="text-center py-6 text-white/40 text-sm">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No directives configured</p>
                  <Link href="/dashboard/directives" className="text-xs text-purple-400 hover:underline mt-1 inline-block">
                    Add your first directive →
                  </Link>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 border border-white/10 rounded-xl p-6"
            data-testid="card-agents"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Deployed Agents</h3>
                  <p className="text-sm text-white/50" data-testid="text-agents-count">
                    {data?.agents.active_count || 0} active of {data?.agents.total_deployed || 0} total
                  </p>
                </div>
              </div>
              <Link href="/dashboard/templates" className="text-xs text-pink-400 hover:underline" data-testid="link-browse-agents">
                Browse →
              </Link>
            </div>
            <div className="space-y-2">
              {data?.agents.agents && data.agents.agents.length > 0 ? (
                data.agents.agents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg" data-testid={`agent-${agent.id}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      {agent.status === "active" ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-white/20 flex-shrink-0" />
                      )}
                      <span className="text-sm truncate">{agent.name}</span>
                    </div>
                    <span className={`text-xs capitalize ${agent.status === "active" ? "text-emerald-400" : "text-white/40"}`}>
                      {agent.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-white/40 text-sm">
                  <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No agents deployed</p>
                  <Link href="/dashboard/templates" className="text-xs text-pink-400 hover:underline mt-1 inline-block">
                    Deploy from templates →
                  </Link>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 border border-white/10 rounded-xl p-6"
            data-testid="card-workspace-modes"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold">Workspace Modes</h3>
                <p className="text-sm text-white/50">{modes?.total || 0} total workspaces</p>
              </div>
            </div>

            {modes && modes.total > 0 ? (
              <div className="space-y-4">
                <div className="flex gap-1 h-4 rounded-full overflow-hidden bg-white/5">
                  {modes.ai > 0 && (
                    <div
                      className="bg-cyan-500 transition-all"
                      style={{ width: `${(modes.ai / modes.total) * 100}%` }}
                      title={`AI: ${modes.ai}`}
                    />
                  )}
                  {modes.shadow > 0 && (
                    <div
                      className="bg-amber-500 transition-all"
                      style={{ width: `${(modes.shadow / modes.total) * 100}%` }}
                      title={`Shadow: ${modes.shadow}`}
                    />
                  )}
                  {modes.takeover > 0 && (
                    <div
                      className="bg-violet-500 transition-all"
                      style={{ width: `${(modes.takeover / modes.total) * 100}%` }}
                      title={`Human: ${modes.takeover}`}
                    />
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-lg font-bold text-cyan-400" data-testid="text-ai-count">{modes.ai}</div>
                    <div className="text-xs text-white/50">AI</div>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-lg font-bold text-amber-400" data-testid="text-shadow-count">{modes.shadow}</div>
                    <div className="text-xs text-white/50">Shadow</div>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-lg font-bold text-violet-400" data-testid="text-takeover-count">{modes.takeover}</div>
                    <div className="text-xs text-white/50">Human</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-white/40">
                    Human intervention rate: <span className={takeoverRate > 30 ? "text-amber-400" : "text-emerald-400"}>{takeoverRate}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-white/40 text-sm">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No workspaces yet</p>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/5 border border-white/10 rounded-xl p-6"
            data-testid="card-providers"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Server className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-semibold">AI Providers</h3>
                <p className="text-sm text-white/50">BYOK LLM infrastructure</p>
              </div>
            </div>
            <div className="space-y-2">
              {data?.providers && data.providers.length > 0 ? (
                data.providers.map((provider, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg" data-testid={`provider-${idx}`}>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(provider.status)}
                      <span className="text-sm">{provider.name}</span>
                      {provider.model && (
                        <span className="text-xs text-white/40 bg-white/5 px-1.5 py-0.5 rounded">{provider.model}</span>
                      )}
                    </div>
                    <span className={`text-xs capitalize ${getStatusColor(provider.status)}`}>
                      {provider.status.replace("_", " ")}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <Server className="w-8 h-8 mx-auto mb-2 text-white/20" />
                  <p className="text-white/40 text-sm">No AI providers configured</p>
                  <p className="text-xs text-white/30 mt-1">Add your own API keys to connect LLM providers</p>
                  <Link href="/dashboard" className="text-xs text-cyan-400 hover:underline mt-2 inline-flex items-center gap-1" data-testid="link-add-provider">
                    <Settings className="w-3 h-3" />
                    Configure in Settings →
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 bg-white/5 border border-white/10 rounded-xl p-6"
          data-testid="card-audit-events"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">Recent Activity</h3>
                <p className="text-sm text-white/50">Audit log for governance and compliance</p>
              </div>
            </div>
            <Link href="/dashboard/policy-snapshots" className="text-xs text-cyan-400 hover:underline" data-testid="link-view-snapshots">
              View Snapshots →
            </Link>
          </div>
          <div className="space-y-1">
            {data?.recent_audit_events && data.recent_audit_events.length > 0 ? (
              data.recent_audit_events.map((event, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg text-sm transition-colors"
                  data-testid={`audit-event-${idx}`}
                >
                  {getEventTypeIcon(event.event_type)}
                  <span className="text-white/80 flex-1">{event.description}</span>
                  {event.user_name && (
                    <span className="text-xs text-white/30 hidden sm:block">{event.user_name}</span>
                  )}
                  <span className="text-white/30 text-xs min-w-[60px] text-right flex-shrink-0">
                    {formatTimestamp(event.timestamp)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-white/40 text-sm">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No recent activity</p>
                <p className="text-xs text-white/30 mt-1">Actions like adding directives, deploying agents, and mode changes will appear here</p>
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
