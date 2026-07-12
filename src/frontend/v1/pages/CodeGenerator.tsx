import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code, ArrowLeft, Sparkles, Download, Copy, Check, RefreshCw,
  FileCode, Layout, Database, Globe, Zap, FileJson, Eye,
  Accessibility, Search, Palette, Package, Rocket, Clock, Trash2, ChevronDown, Pencil, Send, Settings2
} from "lucide-react";
import SaveAsTemplateButton from "../components/SaveAsTemplateButton";
import { useUpgradeModal } from "../components/UpgradeModal";
import { useAvailableModels } from "@/hooks/use-available-models";
import { friendlyError } from "@/lib/errorMessages";
import { apiFetch } from "@/lib/queryClient";

interface GeneratedFile {
  filename: string;
  content: string;
  language: string;
}

interface CodeGeneration {
  id: string;
  files: GeneratedFile[];
  main_file: string;
  preview_html: string | null;
  generation_type: string;
  created_at: string;
}

interface CodeGenerationHistory {
  id: string;
  user_id: string;
  prompt: string;
  generation_type: string;
  files: GeneratedFile[];
  created_at: string;
}

type GenerationType = "landing_page" | "code_snippet" | "react_component" | "api_integration" | "full_website" | "database_schema";
type RegenerationMode = "make_modern" | "improve_accessibility" | "optimize_seo" | "convert_tailwind" | "convert_react" | "reduce_bundle" | "production_ready";

const GENERATION_TYPES: { value: GenerationType; label: string; icon: any; description: string }[] = [
  { value: "landing_page", label: "Landing Page", icon: Layout, description: "Complete HTML/CSS/JS landing page" },
  { value: "code_snippet", label: "Code Snippet", icon: FileCode, description: "Clean, documented code snippet" },
  { value: "react_component", label: "React Component", icon: Zap, description: "TypeScript React component" },
  { value: "api_integration", label: "API Integration", icon: FileJson, description: "API client with error handling" },
  { value: "full_website", label: "Full Website", icon: Globe, description: "Multi-page website structure" },
  { value: "database_schema", label: "Database Schema", icon: Database, description: "SQL/ORM schema with relations" },
];

const REGENERATION_MODES: { value: RegenerationMode; label: string; icon: any; color: string }[] = [
  { value: "make_modern", label: "Make it modern", icon: Sparkles, color: "bg-gradient-to-r from-purple-500 to-pink-500" },
  { value: "improve_accessibility", label: "Improve accessibility", icon: Accessibility, color: "bg-gradient-to-r from-blue-500 to-cyan-500" },
  { value: "optimize_seo", label: "Optimize for SEO", icon: Search, color: "bg-gradient-to-r from-green-500 to-emerald-500" },
  { value: "convert_tailwind", label: "Convert to Tailwind", icon: Palette, color: "bg-gradient-to-r from-cyan-500 to-blue-500" },
  { value: "convert_react", label: "Convert to React", icon: Zap, color: "bg-gradient-to-r from-blue-500 to-indigo-500" },
  { value: "reduce_bundle", label: "Reduce bundle size", icon: Package, color: "bg-gradient-to-r from-orange-500 to-amber-500" },
  { value: "production_ready", label: "Make production-ready", icon: Rocket, color: "bg-gradient-to-r from-red-500 to-pink-500" },
];

const DEFAULT_MODELS: { value: string; label: string; description: string }[] = [
  { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", description: "Best quality" },
  { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B", description: "Fast" },
];

const LANGUAGE_COLORS: Record<string, string> = {
  html: "bg-orange-500",
  css: "bg-blue-500",
  javascript: "bg-yellow-500",
  js: "bg-yellow-500",
  typescript: "bg-blue-600",
  ts: "bg-blue-600",
  tsx: "bg-blue-600",
  jsx: "bg-yellow-600",
  python: "bg-green-500",
  sql: "bg-purple-500",
  json: "bg-gray-500",
};

export default function CodeGeneratorPage() {
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [generationType, setGenerationType] = useState<GenerationType>("landing_page");
  const [language, setLanguage] = useState("");
  const [framework, setFramework] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [generation, setGeneration] = useState<CodeGeneration | null>(null);
  const [selectedFile, setSelectedFile] = useState<number>(0);
  const [showPreview, setShowPreview] = useState(false);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [history, setHistory] = useState<CodeGenerationHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [editedFiles, setEditedFiles] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [quickEditInput, setQuickEditInput] = useState("");
  const [isQuickEditing, setIsQuickEditing] = useState(false);
  const [customDirectives, setCustomDirectives] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { showUpgradeModal, closeUpgradeModal, UpgradeModalComponent } = useUpgradeModal();
  
  const { models: dynamicModels, provider: currentProvider, providers, getModelsForProvider, isLoading: modelsLoading } = useAvailableModels();
  const [selectedProvider, setSelectedProvider] = useState("");

  const currentProviderModels = selectedProvider ? getModelsForProvider(selectedProvider) : dynamicModels;
  const availableModels = currentProviderModels.length > 0 
    ? currentProviderModels.map(m => ({ value: m.id, label: m.name, description: "" }))
    : dynamicModels.length > 0
    ? dynamicModels.map(m => ({ value: m.id, label: m.name, description: "" }))
    : DEFAULT_MODELS;

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (providers.length > 0 && !selectedProvider) {
      const def = providers.find(p => p.is_default) || providers[0];
      setSelectedProvider(def.id);
    }
  }, [providers, selectedProvider]);
  
  useEffect(() => {
    if (availableModels.length > 0 && (!selectedModel || !availableModels.find(m => m.value === selectedModel))) {
      setSelectedModel(availableModels[0].value);
    }
  }, [selectedProvider]);

  const loadHistory = async () => {
    try {
      const res = await apiFetch("/api/code-generator/history");
      if (res.status === 401 || res.status === 403) {
        setLocation("/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  const [generationStage, setGenerationStage] = useState(0);
  const [generationElapsed, setGenerationElapsed] = useState(0);

  useEffect(() => {
    if (!isGenerating) {
      setGenerationStage(0);
      setGenerationElapsed(0);
      return;
    }
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setGenerationElapsed(elapsed);
      if (elapsed >= 60) setGenerationStage(5);
      else if (elapsed >= 30) setGenerationStage(4);
      else if (elapsed >= 15) setGenerationStage(3);
      else if (elapsed >= 8) setGenerationStage(2);
      else if (elapsed >= 3) setGenerationStage(1);
    }, 500);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please describe what you want to generate");
      return;
    }

    setIsGenerating(true);
    setError("");
    setGeneration(null);

    try {
      const res = await apiFetch("/api/code-generator/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-AiAssist-Provider": selectedProvider || currentProvider },
        body: JSON.stringify({
          prompt: prompt.trim(),
          generation_type: generationType,
          language: language || undefined,
          framework: framework || undefined,
          model: selectedModel,
          custom_directives: customDirectives.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 402) {
          showUpgradeModal("Code Generation");
          setIsGenerating(false);
          return;
        }
        throw new Error(data.detail || "Generation failed");
      }

      const data = await res.json();
      setGeneration(data);
      setSelectedFile(0);
      setShowPreview(data.preview_html !== null);
      setEditedFiles({});
      loadHistory();
    } catch (err: any) {
      setError(friendlyError(err, "Code generation failed. Please check your API key and try again."));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async (mode: RegenerationMode) => {
    if (!generation) return;

    setIsRegenerating(true);
    setError("");

    try {
      const res = await apiFetch("/api/code-generator/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-AiAssist-Provider": selectedProvider || currentProvider },
        body: JSON.stringify({
          generation_id: generation.id,
          mode,
          model: selectedModel,
          edited_files: Object.keys(editedFiles).length > 0 ? editedFiles : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 402) {
          showUpgradeModal("Code Regeneration");
          setIsRegenerating(false);
          return;
        }
        throw new Error(data.detail || "Regeneration failed");
      }

      const data = await res.json();
      setGeneration(data);
      setSelectedFile(0);
      setEditedFiles({});
      loadHistory();
    } catch (err: any) {
      setError(friendlyError(err, "Code regeneration failed. Please try again."));
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleQuickEdit = async () => {
    if (!generation || !quickEditInput.trim()) return;

    setIsQuickEditing(true);
    setError("");

    try {
      const targetFile = generation.files[selectedFile]?.filename;
      const res = await apiFetch("/api/code-generator/quick-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-AiAssist-Provider": selectedProvider || currentProvider },
        body: JSON.stringify({
          generation_id: generation.id,
          edit_instruction: quickEditInput.trim(),
          target_file: targetFile,
          model: selectedModel,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 402) {
          showUpgradeModal("Quick Edit");
          setIsQuickEditing(false);
          return;
        }
        throw new Error(data.detail || "Quick edit failed");
      }

      const data = await res.json();
      setGeneration(data);
      setQuickEditInput("");
      setEditedFiles({});
      loadHistory();
    } catch (err: any) {
      setError(friendlyError(err, "Quick edit failed. Please try again."));
    } finally {
      setIsQuickEditing(false);
    }
  };

  const handleDownload = async () => {
    if (!generation) return;
    window.open(`/api/code-generator/${generation.id}/download`, "_blank");
  };

  const handleCopy = async (content: string, filename: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFile(filename);
      setTimeout(() => setCopiedFile(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const loadFromHistory = async (historyItem: CodeGenerationHistory) => {
    setGeneration({
      id: historyItem.id,
      files: historyItem.files,
      main_file: historyItem.files[0]?.filename || "",
      preview_html: null,
      generation_type: historyItem.generation_type,
      created_at: historyItem.created_at,
    });
    setPrompt(historyItem.prompt);
    setSelectedFile(0);
    setEditedFiles({});
    setShowHistory(false);
  };

  const getFileContent = (file: GeneratedFile) => {
    return editedFiles[file.filename] ?? file.content;
  };

  const handleCodeEdit = (filename: string, newContent: string) => {
    setEditedFiles(prev => ({ ...prev, [filename]: newContent }));
  };

  const getPreviewHtml = () => {
    if (!generation) return "";
    
    const htmlFile = generation.files.find(f => f.language === "html" || f.filename.endsWith(".html"));
    const cssFile = generation.files.find(f => f.language === "css" || f.filename.endsWith(".css"));
    const jsFile = generation.files.find(f => f.language === "javascript" || f.language === "js" || f.filename.endsWith(".js"));
    
    if (!htmlFile) return "";
    
    let html = getFileContent(htmlFile);
    
    if (cssFile) {
      const cssContent = getFileContent(cssFile);
      if (html.includes("</head>")) {
        html = html.replace("</head>", `<style>\n${cssContent}\n</style>\n</head>`);
      } else if (html.includes("<head>")) {
        html = html.replace("<head>", `<head>\n<style>\n${cssContent}\n</style>`);
      } else {
        html = `<style>\n${cssContent}\n</style>\n${html}`;
      }
    }
    
    if (jsFile) {
      const jsContent = getFileContent(jsFile);
      if (html.includes("</body>")) {
        html = html.replace("</body>", `<script>\n${jsContent}\n</script>\n</body>`);
      } else {
        html = `${html}\n<script>\n${jsContent}\n</script>`;
      }
    }
    
    return html;
  };

  const deleteFromHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiFetch(`/api/code-generator/${id}`, {
        method: "DELETE",
      });
      loadHistory();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const selectedType = GENERATION_TYPES.find(t => t.value === generationType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg">
                  <Code className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white" data-testid="text-page-title">AI Code Generator</h1>
                  <p className="text-sm text-gray-400">Generate production-ready code in seconds</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              data-testid="button-toggle-history"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
              {history.length > 0 && (
                <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full">{history.length}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">What do you want to build?</h2>
              
              <div className="relative mb-4">
                <button
                  onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                  className="w-full flex items-center justify-between p-3 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
                  data-testid="button-generation-type"
                >
                  <div className="flex items-center gap-3">
                    {selectedType && <selectedType.icon className="w-5 h-5 text-emerald-400" />}
                    <div className="text-left">
                      <div className="text-white font-medium">{selectedType?.label}</div>
                      <div className="text-sm text-gray-400">{selectedType?.description}</div>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showTypeDropdown ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {showTypeDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-10 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden"
                    >
                      {GENERATION_TYPES.map((type) => (
                        <button
                          key={type.value}
                          onClick={() => {
                            setGenerationType(type.value);
                            setShowTypeDropdown(false);
                          }}
                          className={`w-full flex items-center gap-3 p-3 hover:bg-gray-700 transition-colors ${
                            generationType === type.value ? "bg-gray-700" : ""
                          }`}
                          data-testid={`button-type-${type.value}`}
                        >
                          <type.icon className="w-5 h-5 text-emerald-400" />
                          <div className="text-left">
                            <div className="text-white font-medium">{type.label}</div>
                            <div className="text-sm text-gray-400">{type.description}</div>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to create... e.g., 'A modern SaaS landing page with a hero section, pricing table, and testimonials'"
                className="w-full h-32 p-4 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                data-testid="input-prompt"
              />

              <div className="grid grid-cols-3 gap-4 mt-4">
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Language (optional)"
                  className="p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-emerald-500"
                  data-testid="input-language"
                />
                <input
                  type="text"
                  value={framework}
                  onChange={(e) => setFramework(e.target.value)}
                  placeholder="Framework (optional)"
                  className="p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-emerald-500"
                  data-testid="input-framework"
                />
                <div className="relative">
                  <div className="absolute -top-2 right-2 z-10">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      (selectedProvider || currentProvider) === "openai" ? "bg-emerald-500/20 text-emerald-400" :
                      (selectedProvider || currentProvider) === "anthropic" ? "bg-orange-500/20 text-orange-400" :
                      (selectedProvider || currentProvider) === "gemini" ? "bg-purple-500/20 text-purple-400" :
                      "bg-blue-500/20 text-blue-400"
                    }`} data-testid="text-provider">
                      {providers.find(p => p.id === (selectedProvider || currentProvider))?.name || (selectedProvider || currentProvider)}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white flex items-center justify-between hover:border-emerald-500 transition-colors"
                    data-testid="button-model-select"
                  >
                    <span className="truncate">{availableModels.find(m => m.value === selectedModel)?.label || "Select Model"}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showModelDropdown ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {showModelDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden z-50"
                      >
                        {providers.length > 1 && (
                          <div className="p-2 border-b border-gray-700 flex flex-wrap gap-1">
                            {providers.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => setSelectedProvider(p.id)}
                                data-testid={`provider-tab-${p.id}`}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                  selectedProvider === p.id
                                    ? "bg-emerald-600 text-white"
                                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                }`}
                              >
                                {p.name}
                              </button>
                            ))}
                          </div>
                        )}
                        {availableModels.map((model) => (
                          <button
                            key={model.value}
                            onClick={() => {
                              setSelectedModel(model.value);
                              setShowModelDropdown(false);
                            }}
                            className={`w-full flex items-center justify-between p-3 hover:bg-gray-700 transition-colors ${
                              selectedModel === model.value ? "bg-gray-700" : ""
                            }`}
                            data-testid={`button-model-${model.value}`}
                          >
                            <span className="text-white font-medium">{model.label}</span>
                            <span className="text-sm text-gray-400">{model.description}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                  data-testid="button-toggle-advanced"
                >
                  <Settings2 className="w-4 h-4" />
                  Advanced Options
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                </button>
                
                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 overflow-hidden"
                    >
                      <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                        <label className="block text-sm font-medium text-white mb-2">
                          Custom Directives
                        </label>
                        <p className="text-xs text-gray-400 mb-2">
                          Add specific requirements for the generated code (branding, colors, features, etc.)
                        </p>
                        <textarea
                          value={customDirectives}
                          onChange={(e) => setCustomDirectives(e.target.value)}
                          placeholder="Example: Use our brand colors #4F46E5 and #10B981. Include a contact form. Make the hero section full-width with a video background."
                          className="w-full h-24 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm resize-none focus:outline-none focus:border-cyan-500 transition-colors"
                          data-testid="textarea-custom-directives"
                        />
                        <div className="mt-2 flex flex-wrap gap-1">
                          {["Use brand color #4F46E5", "Add contact form", "Include testimonials", "Dark mode theme", "Minimalist design"].map((example) => (
                            <button
                              key={example}
                              onClick={() => setCustomDirectives(prev => prev ? `${prev}\n${example}` : example)}
                              className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 hover:text-white transition-colors"
                              data-testid={`button-directive-${example.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}
                            >
                              + {example}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                data-testid="button-generate"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Code
                  </>
                )}
              </button>
            </div>

            {generation && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-emerald-400" />
                  Quick Regenerate
                </h3>
                <p className="text-sm text-gray-400 mb-4">One-click improvements for your code</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {REGENERATION_MODES.map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => handleRegenerate(mode.value)}
                      disabled={isRegenerating}
                      className={`flex items-center gap-2 p-3 ${mode.color} text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-all text-sm font-medium`}
                      data-testid={`button-regen-${mode.value}`}
                    >
                      <mode.icon className="w-4 h-4" />
                      {mode.label}
                    </button>
                  ))}
                </div>

                {isRegenerating && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-emerald-400">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Regenerating...</span>
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-gray-700">
                  <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-cyan-400" />
                    Quick Edit
                  </h4>
                  <p className="text-xs text-gray-400 mb-3">
                    Make simple changes without full regeneration
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={quickEditInput}
                      onChange={(e) => setQuickEditInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !isQuickEditing && handleQuickEdit()}
                      placeholder="e.g., Change button color to blue..."
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                      disabled={isQuickEditing}
                      data-testid="input-quick-edit"
                    />
                    <button
                      onClick={handleQuickEdit}
                      disabled={isQuickEditing || !quickEditInput.trim()}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                      data-testid="button-quick-edit"
                    >
                      {isQuickEditing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {["Change colors", "Update text", "Make larger", "Add shadow", "Center content"].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setQuickEditInput(suggestion)}
                        className="px-2 py-1 text-xs bg-gray-800 text-gray-400 rounded hover:bg-gray-700 hover:text-white transition-colors"
                        data-testid={`button-suggestion-${suggestion.replace(/\s+/g, "-").toLowerCase()}`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {generation ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden"
              >
                <div className="border-b border-gray-800 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {generation.files.some(f => f.language === "html" || f.filename.endsWith(".html")) && (
                        <button
                          onClick={() => setShowPreview(true)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                            showPreview ? "bg-emerald-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                          }`}
                          data-testid="button-preview"
                        >
                          <Eye className="w-4 h-4" />
                          Preview
                        </button>
                      )}
                      {generation.files.map((file, index) => (
                        <button
                          key={file.filename}
                          onClick={() => {
                            setSelectedFile(index);
                            setShowPreview(false);
                          }}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                            !showPreview && selectedFile === index
                              ? "bg-gray-700 text-white"
                              : "bg-gray-800 text-gray-400 hover:text-white"
                          }`}
                          data-testid={`button-file-${index}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${LANGUAGE_COLORS[file.language] || "bg-gray-500"}`} />
                          {file.filename}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => handleCopy(
                        getFileContent(generation.files[selectedFile]) || "",
                        generation.files[selectedFile]?.filename || ""
                      )}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                      data-testid="button-copy"
                    >
                      {copiedFile === generation.files[selectedFile]?.filename ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="h-96 overflow-auto">
                  {showPreview && getPreviewHtml() ? (
                    <iframe
                      srcDoc={getPreviewHtml()}
                      className="w-full h-full bg-white"
                      title="Preview"
                      sandbox="allow-scripts"
                    />
                  ) : (
                    <textarea
                      value={getFileContent(generation.files[selectedFile]) || "No content"}
                      onChange={(e) => handleCodeEdit(generation.files[selectedFile]?.filename, e.target.value)}
                      className="w-full h-full p-4 text-sm text-gray-300 font-mono bg-transparent border-none resize-none focus:outline-none focus:ring-0"
                      spellCheck={false}
                      data-testid="textarea-code-editor"
                    />
                  )}
                </div>

                <div className="border-t border-gray-800 p-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <button
                      onClick={handleDownload}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-cyan-600 transition-all"
                      data-testid="button-download"
                    >
                      <Download className="w-4 h-4" />
                      Download ZIP
                    </button>
                    <div className="flex-1 flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-sm text-emerald-400">
                        You fully own this code. No lock-in. No royalties.
                      </span>
                    </div>
                    <SaveAsTemplateButton
                      sourceType="code_generation"
                      defaultName="Code Generation Template"
                      defaultDescription={prompt || "Custom code generation template"}
                      defaultCategory="technical"
                      basePersona={`You are an expert code generator specializing in ${generationType.replace("_", " ")} creation. Generate clean, well-documented, production-ready code.`}
                      variant="button"
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                {isGenerating ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full max-w-sm"
                    data-testid="generation-progress"
                  >
                    <div className="relative mb-6">
                      <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center">
                        <Code className="w-8 h-8 text-white animate-pulse" />
                      </div>
                      <motion.div
                        className="absolute inset-0 w-16 h-16 mx-auto rounded-full border-2 border-emerald-400/30"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {generationStage === 0 && "Sending to AI..."}
                      {generationStage === 1 && "AI is planning your code..."}
                      {generationStage === 2 && "Writing code..."}
                      {generationStage === 3 && "Generating HTML, CSS & JS..."}
                      {generationStage === 4 && "Almost done — finalizing..."}
                      {generationStage >= 5 && "Still working — complex generation..."}
                    </h3>
                    <p className="text-sm text-gray-400 mb-4">
                      {generationStage <= 1 && "Advanced models may take 30-60 seconds"}
                      {generationStage === 2 && "Building responsive layouts and styling"}
                      {generationStage === 3 && "Adding interactivity and polish"}
                      {generationStage === 4 && "Wrapping up the finishing touches"}
                      {generationStage >= 5 && "Reasoning models think deeply — hang tight"}
                    </p>
                    <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                        initial={{ width: "5%" }}
                        animate={{ width: generationStage >= 5 ? "95%" : generationStage === 4 ? "85%" : generationStage === 3 ? "70%" : generationStage === 2 ? "45%" : generationStage === 1 ? "20%" : "8%" }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{generationElapsed}s elapsed</p>
                  </motion.div>
                ) : (
                  <>
                    <div className="p-4 bg-gray-800 rounded-full mb-4">
                      <Code className="w-8 h-8 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-400 mb-2">No code generated yet</h3>
                    <p className="text-sm text-gray-500 max-w-md">
                      Describe what you want to build and click Generate to create production-ready code instantly.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowHistory(false)}
            />
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-gray-900 border-l border-gray-800 z-50 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Generation History</h2>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    data-testid="button-close-history"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>

                {history.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No generation history yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 cursor-pointer group transition-colors"
                        onClick={() => loadFromHistory(item)}
                        data-testid={`history-item-${item.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{item.prompt}</p>
                            <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                              <span className="capitalize">{item.generation_type.replace("_", " ")}</span>
                              <span>•</span>
                              <span>{item.files.length} file(s)</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(item.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={(e) => deleteFromHistory(item.id, e)}
                            className="p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            data-testid={`button-delete-${item.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <UpgradeModalComponent />
    </div>
  );
}
