import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, X, Check, Layers } from "lucide-react";
import { useUpgradeModal } from "./UpgradeModal";
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

interface SaveAsTemplateProps {
  sourceType: "directive" | "workspace" | "code_generation" | "chat_session";
  defaultName?: string;
  defaultDescription?: string;
  defaultCategory?: string;
  basePersona?: string;
  directives?: DirectiveReference[];
  knowledgeBaseIds?: string[];
  takeoverRules?: TakeoverConfig | null;
  recommendedModel?: string;
  temperature?: number;
  maxTokens?: number;
  onSaved?: (templateId: string) => void;
  className?: string;
  variant?: "button" | "icon" | "text";
}

const CATEGORIES = [
  { value: "customer_support", label: "Customer Support" },
  { value: "sales_marketing", label: "Sales & Marketing" },
  { value: "technical", label: "Technical" },
  { value: "content", label: "Content" },
  { value: "business", label: "Business" },
];

const ICONS = [
  "bot", "headphones", "trending-up", "filter", "code", 
  "file-text", "edit-3", "mail", "clipboard", "bar-chart-2", "help-circle"
];

export default function SaveAsTemplateButton({
  sourceType,
  defaultName = "",
  defaultDescription = "",
  defaultCategory = "business",
  basePersona = "",
  directives = [],
  knowledgeBaseIds = [],
  takeoverRules = null,
  recommendedModel = "llama-3.3-70b-versatile",
  temperature = 0.7,
  maxTokens = 2048,
  onSaved,
  className = "",
  variant = "button"
}: SaveAsTemplateProps) {
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const { showUpgradeModal, UpgradeModalComponent } = useUpgradeModal();
  
  const [formData, setFormData] = useState({
    name: defaultName,
    description: defaultDescription,
    category: defaultCategory,
    icon: "bot",
    base_persona: basePersona,
  });

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError("Template name is required");
      return;
    }
    if (!formData.base_persona.trim()) {
      setError("Base persona is required");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const res = await apiFetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          category: formData.category,
          icon: formData.icon,
          base_persona: formData.base_persona,
          directives: directives,
          knowledge_base_ids: knowledgeBaseIds,
          takeover_rules: takeoverRules,
          recommended_model: recommendedModel,
          temperature: temperature,
          max_tokens: maxTokens,
        }),
      });

      if (res.ok) {
        const template = await res.json();
        setSaved(true);
        onSaved?.(template.id);
        setTimeout(() => {
          setShowModal(false);
          setSaved(false);
        }, 1500);
      } else if (res.status === 402) {
        setShowModal(false);
        showUpgradeModal("Save as Template");
      } else {
        const data = await res.json();
        setError(data.detail || "Failed to save template");
      }
    } catch (err) {
      setError("Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const openModal = () => {
    setFormData({
      name: defaultName,
      description: defaultDescription,
      category: defaultCategory,
      icon: "bot",
      base_persona: basePersona,
    });
    setError("");
    setSaved(false);
    setShowModal(true);
  };

  const renderButton = () => {
    switch (variant) {
      case "icon":
        return (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openModal}
            className={`p-2 bg-black/40 hover:bg-white/10 rounded-lg transition-colors ${className}`}
            title="Save as Template"
            data-testid="button-save-as-template"
          >
            <Layers size={18} />
          </motion.button>
        );
      case "text":
        return (
          <button
            onClick={openModal}
            className={`text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 ${className}`}
            data-testid="button-save-as-template"
          >
            <Layers size={14} />
            Save as Template
          </button>
        );
      default:
        return (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openModal}
            className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-lg text-purple-300 hover:border-purple-500/50 transition-all ${className}`}
            data-testid="button-save-as-template"
          >
            <Layers size={16} />
            Save as Template
          </motion.button>
        );
    }
  };

  return (
    <>
      {renderButton()}

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !isSaving && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-xl p-6 max-w-lg w-full"
            >
              {saved ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={32} className="text-green-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Template Saved!</h3>
                  <p className="text-slate-400">Your template has been saved successfully.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-600/20 rounded-lg">
                        <Layers size={20} className="text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Save as Template</h3>
                        <p className="text-sm text-slate-400">
                          Create a reusable AI playbook from this {sourceType.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowModal(false)}
                      className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                      data-testid="button-close-template-modal"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Template Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Sales Outreach Assistant"
                        className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        data-testid="input-template-name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="What does this template do?"
                        rows={2}
                        className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                        data-testid="input-template-description"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Category
                        </label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 [&>option]:bg-slate-900 [&>option]:text-white"
                          data-testid="select-template-category"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Icon
                        </label>
                        <select
                          value={formData.icon}
                          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                          className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 [&>option]:bg-slate-900 [&>option]:text-white"
                          data-testid="select-template-icon"
                        >
                          {ICONS.map((icon) => (
                            <option key={icon} value={icon}>
                              {icon.replace("-", " ")}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Base Persona *
                      </label>
                      <textarea
                        value={formData.base_persona}
                        onChange={(e) => setFormData({ ...formData, base_persona: e.target.value })}
                        placeholder="Describe the AI's personality, role, and behavior..."
                        rows={4}
                        className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                        data-testid="input-template-persona"
                      />
                    </div>

                    {(directives.length > 0 || knowledgeBaseIds.length > 0 || takeoverRules) && (
                      <div className="p-3 bg-black/40 rounded-lg border border-white/10">
                        <p className="text-xs text-slate-400 mb-2">This template will include:</p>
                        <div className="flex flex-wrap gap-2">
                          {directives.length > 0 && (
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                              {directives.length} directive(s)
                            </span>
                          )}
                          {knowledgeBaseIds.length > 0 && (
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                              {knowledgeBaseIds.length} knowledge base(s)
                            </span>
                          )}
                          {takeoverRules && (
                            <span className="px-2 py-1 bg-amber-500/20 text-amber-300 rounded text-xs">
                              Takeover rules
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowModal(false)}
                      className="flex-1 px-4 py-3 bg-black/40 hover:bg-white/10 rounded-lg font-medium transition-colors"
                      data-testid="button-cancel-template"
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="button-confirm-template"
                    >
                      {isSaving ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      ) : (
                        <>
                          <Save size={18} />
                          Save Template
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
      <UpgradeModalComponent />
    </>
  );
}
