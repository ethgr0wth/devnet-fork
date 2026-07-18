import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, Plus, Edit, Trash2, ToggleLeft, ToggleRight,
  ArrowLeft, Search, Filter, Copy, Sparkles, MessageSquare,
  FileText, Shield, User, AlertCircle, Check, X, ChevronDown
} from "lucide-react";
import SaveAsTemplateButton from "../components/SaveAsTemplateButton";
import { useEpicModal } from "@/components/ui/epic-modal";
import { useCapabilities } from "../hooks/use-capabilities";
import { useUpgradeModal } from "../components/UpgradeModal";
import { apiFetch } from "@/lib/queryClient";

interface Directive {
  id: string;
  workspace_id: string | null;
  organization_id: string | null;
  created_by: string;
  content: string;
  directive_type: string;
  priority: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

type DirectiveType = "guidance" | "tone" | "context" | "constraint" | "persona";

const DIRECTIVE_TYPES: { value: DirectiveType; label: string; icon: any; description: string; color: string }[] = [
  { value: "guidance", label: "Guidance", icon: Target, description: "Instructions the AI should follow", color: "bg-blue-500" },
  { value: "tone", label: "Tone", icon: MessageSquare, description: "Communication style and voice", color: "bg-purple-500" },
  { value: "context", label: "Context", icon: FileText, description: "Background information to remember", color: "bg-green-500" },
  { value: "constraint", label: "Constraint", icon: Shield, description: "Hard rules the AI must follow", color: "bg-red-500" },
  { value: "persona", label: "Persona", icon: User, description: "Complete personality override", color: "bg-amber-500" },
];

export default function DirectivesPage() {
  const [, setLocation] = useLocation();
  const [directives, setDirectives] = useState<Directive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingDirective, setEditingDirective] = useState<Directive | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { showModal, closeModal, ModalComponent } = useEpicModal();
  const { canUsePremiumFeatures } = useCapabilities();
  const { showUpgradeModal, UpgradeModalComponent } = useUpgradeModal();

  const [formData, setFormData] = useState({
    content: "",
    directive_type: "guidance" as DirectiveType,
    priority: 5,
    workspace_id: null as string | null,
  });

  useEffect(() => {
    loadDirectives();
  }, []);

  const loadDirectives = async () => {
    try {
      const res = await apiFetch("/api/directives");
      if (res.status === 401 || res.status === 403) {
        setLocation("/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setDirectives(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load directives:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.content.trim()) {
      setError("Content is required");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      if (editingDirective) {
        const res = await apiFetch(`/api/directives/${editingDirective.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: formData.content,
            priority: formData.priority,
          }),
        });
        if (res.ok) {
          setSuccess("Directive updated successfully");
          loadDirectives();
          resetForm();
        } else {
          setError("Failed to update directive");
        }
      } else {
        const res = await apiFetch("/api/directives", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          setSuccess("Directive created successfully");
          loadDirectives();
          resetForm();
        } else if (res.status === 402) {
          resetForm();
          showUpgradeModal("Custom Directives");
        } else {
          setError("Failed to create directive");
        }
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (directive: Directive) => {
    try {
      const res = await apiFetch(`/api/directives/${directive.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !directive.active }),
      });
      if (res.ok) {
        loadDirectives();
      }
    } catch (err) {
      console.error("Failed to toggle directive:", err);
    }
  };

  const handleDelete = (id: string) => {
    showModal({
      title: "Deactivate Directive",
      description: "This directive will be deactivated and no longer applied to AI responses. You can reactivate it later if needed.",
      confirmText: "Deactivate",
      cancelText: "Keep Active",
      variant: "warning",
      icon: "power",
      onConfirm: async () => {
        closeModal();
        try {
          const res = await apiFetch(`/api/directives/${id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            setSuccess("Directive deactivated");
            loadDirectives();
          }
        } catch (err) {
          setError("Failed to delete directive");
        }
      }
    });
  };

  const handleEdit = (directive: Directive) => {
    setEditingDirective(directive);
    setFormData({
      content: directive.content,
      directive_type: directive.directive_type as DirectiveType,
      priority: directive.priority,
      workspace_id: directive.workspace_id,
    });
    setShowForm(true);
  };

  const handleDuplicate = (directive: Directive) => {
    setEditingDirective(null);
    setFormData({
      content: directive.content,
      directive_type: directive.directive_type as DirectiveType,
      priority: directive.priority,
      workspace_id: directive.workspace_id,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingDirective(null);
    setFormData({
      content: "",
      directive_type: "guidance",
      priority: 5,
      workspace_id: null,
    });
  };

  const filteredDirectives = directives.filter((d) => {
    const matchesSearch = d.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || d.directive_type === filterType;
    return matchesSearch && matchesType;
  });

  const getTypeInfo = (type: string) => {
    return DIRECTIVE_TYPES.find((t) => t.value === type) || DIRECTIVE_TYPES[0];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-lg bg-black/40 hover:bg-white/10 border border-white/10 transition-colors flex-shrink-0"
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </motion.button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
                <Target className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 flex-shrink-0" />
                <span className="truncate">AI Directives</span>
              </h1>
              <p className="text-gray-400 mt-1 text-sm sm:text-base">
                Control how your AI behaves across all interactions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <SaveAsTemplateButton
              sourceType="directive"
              defaultName="My Directive Stack"
              defaultDescription="Custom directive configuration"
              defaultCategory="business"
              basePersona="A helpful AI assistant that follows custom directives."
              directives={directives.filter(d => d.active).map(d => ({ directive_id: d.id, priority: d.priority }))}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (!canUsePremiumFeatures) {
                  showUpgradeModal("Custom Directives");
                  return;
                }
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm sm:text-base whitespace-nowrap"
              data-testid="button-create-directive"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">New Directive</span>
              <span className="sm:hidden">New</span>
            </motion.button>
          </div>
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400"
            >
              <AlertCircle className="w-5 h-5" />
              {error}
              <button onClick={() => setError("")} className="ml-auto">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3 text-green-400"
            >
              <Check className="w-5 h-5" />
              {success}
              <button onClick={() => setSuccess("")} className="ml-auto">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search directives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              data-testid="input-search-directives"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-10 pr-8 py-2 bg-black/40 border border-white/10 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:border-purple-500 transition-colors [&>option]:bg-slate-900 [&>option]:text-white"
              data-testid="select-filter-type"
            >
              <option value="all" className="bg-slate-900">All Types</option>
              {DIRECTIVE_TYPES.map((type) => (
                <option key={type.value} value={type.value} className="bg-slate-900">
                  {type.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Directive Type Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {DIRECTIVE_TYPES.map((type) => {
            const count = directives.filter((d) => d.directive_type === type.value && d.active).length;
            const Icon = type.icon;
            return (
              <motion.div
                key={type.value}
                whileHover={{ scale: 1.02 }}
                onClick={() => setFilterType(filterType === type.value ? "all" : type.value)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  filterType === type.value
                    ? "bg-white/10 border-purple-500"
                    : "bg-black/40 border-white/10 hover:border-white/20"
                }`}
                data-testid={`card-type-${type.value}`}
              >
                <div className={`w-10 h-10 ${type.color} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-white font-medium">{type.label}</h3>
                <p className="text-gray-500 text-sm">{count} active</p>
              </motion.div>
            );
          })}
        </div>

        {/* Directives List */}
        {filteredDirectives.length === 0 ? (
          <div className="text-center py-16 bg-black/40 rounded-xl border border-white/10">
            <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No directives found</h3>
            <p className="text-gray-400 mb-4">
              {searchQuery || filterType !== "all"
                ? "Try adjusting your search or filter"
                : "Create your first directive to control AI behavior"}
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
              data-testid="button-create-first-directive"
            >
              Create Directive
            </motion.button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDirectives.map((directive) => {
              const typeInfo = getTypeInfo(directive.directive_type);
              const Icon = typeInfo.icon;
              return (
                <motion.div
                  key={directive.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl border transition-all ${
                    directive.active
                      ? "bg-black/40 border-white/10"
                      : "bg-white/[0.02] border-white/5 opacity-60"
                  }`}
                  data-testid={`card-directive-${directive.id}`}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className={`w-10 h-10 ${typeInfo.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300 uppercase tracking-wide">
                          {typeInfo.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          {directive.priority}/10
                        </span>
                        {directive.workspace_id ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                            Workspace
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                            Global
                          </span>
                        )}
                      </div>
                      <p className="text-white text-sm leading-relaxed">
                        {directive.content}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-gray-500 text-xs">
                          Created {new Date(directive.created_at).toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleToggleActive(directive)}
                            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                              directive.active
                                ? "text-green-400 hover:bg-green-500/10"
                                : "text-gray-500 hover:bg-black/40"
                            }`}
                            title={directive.active ? "Deactivate" : "Activate"}
                            data-testid={`button-toggle-${directive.id}`}
                          >
                            {directive.active ? (
                              <ToggleRight className="w-4 h-4 sm:w-5 sm:h-5" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                            )}
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDuplicate(directive)}
                            className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-white hover:bg-black/40 transition-colors"
                            title="Duplicate"
                            data-testid={`button-duplicate-${directive.id}`}
                          >
                            <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleEdit(directive)}
                            className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-white hover:bg-black/40 transition-colors"
                            title="Edit"
                            data-testid={`button-edit-${directive.id}`}
                          >
                            <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDelete(directive.id)}
                            className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete"
                            data-testid={`button-delete-${directive.id}`}
                          >
                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Create/Edit Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={(e) => e.target === e.currentTarget && resetForm()}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-lg p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">
                    {editingDirective ? "Edit Directive" : "Create Directive"}
                  </h2>
                  <button
                    onClick={resetForm}
                    className="p-2 rounded-lg hover:bg-black/40 text-gray-400 hover:text-white transition-colors"
                    data-testid="button-close-form"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Directive Type
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {DIRECTIVE_TYPES.map((type) => {
                        const Icon = type.icon;
                        return (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, directive_type: type.value })}
                            className={`p-3 rounded-lg border text-center transition-all ${
                              formData.directive_type === type.value
                                ? `${type.color} border-transparent text-white`
                                : "bg-black/40 border-white/10 text-gray-400 hover:border-white/20"
                            }`}
                            title={type.description}
                            disabled={!!editingDirective}
                            data-testid={`button-type-${type.value}`}
                          >
                            <Icon className="w-5 h-5 mx-auto mb-1" />
                            <span className="text-xs">{type.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Content
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder={
                        formData.directive_type === "guidance"
                          ? "e.g., Always suggest actionable next steps at the end of your response"
                          : formData.directive_type === "tone"
                          ? "e.g., Professional yet warm and approachable"
                          : formData.directive_type === "context"
                          ? "e.g., We are a B2B SaaS company focused on AI solutions"
                          : formData.directive_type === "constraint"
                          ? "e.g., Never discuss competitor products or pricing"
                          : "e.g., You are a senior software architect with 15 years of experience..."
                      }
                      rows={4}
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                      data-testid="textarea-content"
                    />
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Priority: {formData.priority}/10
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                      className="w-full accent-purple-500"
                      data-testid="slider-priority"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={resetForm}
                      className="flex-1 px-4 py-2 bg-black/40 hover:bg-white/10 border border-white/10 text-white rounded-lg font-medium transition-colors"
                      data-testid="button-cancel"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isSaving || !formData.content.trim()}
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      data-testid="button-submit"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                          Saving...
                        </>
                      ) : editingDirective ? (
                        "Update Directive"
                      ) : (
                        "Create Directive"
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ModalComponent />
      <UpgradeModalComponent />
    </div>
  );
}
