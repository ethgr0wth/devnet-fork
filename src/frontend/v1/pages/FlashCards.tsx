import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Sparkles, Plus, Trash2, BookOpen, Wand2, Loader2, AlertCircle,
  Type, FileText, Edit3, Brain, ChevronDown, X, Check, Key, Settings, Eye, EyeOff, ExternalLink,
} from "lucide-react";
import { fcApi, fcStore, FCDeck, FCProvider, FCAvailableProvider, FCConfiguredProvider, FCModelInfo, PROVIDER_LABELS, PROVIDER_DOTS, DEFAULT_MODELS } from "@/lib/flashcardsApi";

const STARTER_PROMPTS = [
  "AWS Solutions Architect Associate exam, 20 cards",
  "French verbs and conjugation patterns, A2 level",
  "GMAT vocabulary, advanced",
  "Photosynthesis and the Calvin cycle, college bio",
  "USMLE Step 1: cardiovascular pharmacology",
  "Spanish present tense irregulars",
  "JavaScript event loop, microtasks vs macrotasks",
  "Latin American capitals and flags",
  "Italian renaissance painters and famous works",
  "Linear algebra: eigenvalues and eigenvectors",
  "Greek mythology — Olympian gods and domains",
  "Music theory: intervals, scales, modes",
  "TypeScript utility types: Partial, Pick, Omit, Record",
  "Mandarin HSK 1 vocabulary, 30 words",
  "World capitals — Africa",
  "Organic chemistry: SN1 vs SN2 reactions",
  "Quantum mechanics: postulates and operators",
  "Bar exam: California torts",
  "CFA Level 1: equity valuation models",
  "Kubernetes objects: Pod, Deployment, Service, Ingress",
  "Roman emperors in chronological order",
  "Stoic philosophy: Marcus Aurelius core ideas",
  "Statistics: Type I vs Type II errors, p-values",
  "C++ smart pointers: unique, shared, weak",
  "Japanese hiragana characters, 46 cards",
  "Constitutional amendments 1-10",
  "Renewable energy technologies and efficiency",
  "Macroeconomics: GDP, CPI, monetary policy tools",
  "SAT vocabulary, 30 high-frequency words",
  "Periodic table groups and trends",
  "Git commands cheatsheet",
  "Music history: classical period composers",
  "Algorithm complexity: Big-O of common ops",
  "Human anatomy: skeletal system bones",
  "World religions: core tenets compared",
  "Tarot major arcana, traditional meanings",
  "MBTI personality types overview",
  "Roman Empire wars and major battles",
  "Internet protocols: TCP, UDP, HTTP/2, QUIC",
  "Wine grape varieties: red and white",
  "Coffee brewing methods and ratios",
  "REST vs GraphQL key differences",
  "SQL window functions",
  "Data structures: trees, heaps, tries",
  "Cognitive biases — top 25",
  "Microeconomics: elasticity, surplus, externalities",
  "Spanish irregular preterite verbs",
  "JLPT N5 kanji, basic 80",
];

const MARQUEE_ROWS = [
  STARTER_PROMPTS.slice(0, 12),
  STARTER_PROMPTS.slice(12, 24),
  STARTER_PROMPTS.slice(24, 36),
  STARTER_PROMPTS.slice(36, 48),
];

type Mode = "topic" | "text" | "manual";

export default function FlashCards() {
  const [, setLocation] = useLocation();
  const [authChecked, setAuthChecked] = useState(false);
  const [decks, setDecks] = useState<FCDeck[]>([]);
  const [userProviders, setUserProviders] = useState<FCProvider[]>([]);
  const [allProviders, setAllProviders] = useState<FCAvailableProvider[]>([]);
  const [configuredProviders, setConfiguredProviders] = useState<FCConfiguredProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mode, setMode] = useState<Mode>("topic");
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [count, setCount] = useState(12);
  const [difficulty, setDifficulty] = useState("intermediate");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void load(); }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-testid="button-provider-picker"]') && !target.closest('[data-testid^="option-provider-"]') && !target.closest('[data-testid="button-open-settings-from-picker"]')) {
        setShowProviderPicker(false);
      }
      if (!target.closest('[data-testid="button-model-picker"]') && !target.closest('[data-testid^="option-model-"]')) {
        setShowModelPicker(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  async function load() {
    try {
      const [d, up, ap, cp] = await Promise.all([
        fcApi.listDecks(),
        fcApi.listUserProviders(),
        fcApi.listAllProviders(),
        fcApi.listConfiguredProviders().catch(() => ({ default_provider: "", providers: [], fallback_chain: [] })),
      ]);
      setDecks(d.decks);
      setUserProviders(up);
      setAllProviders(ap);
      setConfiguredProviders(cp.providers);
      const storedProvider = fcStore.getProvider();
      const storedModel = fcStore.getModel();
      const defaultProv = up.find(x => x.is_default);
      let activeProv = "";
      if (storedProvider && up.find(x => x.provider === storedProvider)) {
        activeProv = storedProvider;
      } else if (defaultProv) {
        activeProv = defaultProv.provider;
        fcStore.setProvider(activeProv);
      } else if (up.length > 0) {
        activeProv = up[0].provider;
        fcStore.setProvider(activeProv);
      }
      setSelectedProvider(activeProv);
      // Restore or set default model for the active provider
      const provModels = cp.providers.find(p => p.id === activeProv)?.models || [];
      if (storedModel && provModels.find(m => m.id === storedModel)) {
        setSelectedModel(storedModel);
      } else if (provModels.length > 0) {
        const defaultModel = DEFAULT_MODELS[activeProv] || provModels[0].id;
        const resolved = provModels.find(m => m.id === defaultModel) ? defaultModel : provModels[0].id;
        setSelectedModel(resolved);
        fcStore.setModel(resolved);
      } else {
        const fallback = DEFAULT_MODELS[activeProv] || "";
        setSelectedModel(fallback);
        if (fallback) fcStore.setModel(fallback);
      }
      setAuthChecked(true);
    } catch (e: any) {
      if (String(e).includes("401")) { setLocation("/login"); return; }
      setAuthChecked(true);
    }
  }

  function pickProvider(prov: string) {
    setSelectedProvider(prov);
    fcStore.setProvider(prov);
    // Set model to default for this provider
    const provModels = configuredProviders.find(p => p.id === prov)?.models || [];
    const defaultModel = DEFAULT_MODELS[prov] || "";
    const resolved = provModels.find(m => m.id === defaultModel) ? defaultModel : (provModels[0]?.id || defaultModel);
    setSelectedModel(resolved);
    if (resolved) fcStore.setModel(resolved);
    setShowProviderPicker(false);
    setShowModelPicker(false);
  }

  function pickModel(modelId: string) {
    setSelectedModel(modelId);
    fcStore.setModel(modelId);
    setShowModelPicker(false);
  }

  const currentModels = configuredProviders.find(p => p.id === selectedProvider)?.models || [];
  const currentModelName = currentModels.find(m => m.id === selectedModel)?.name || selectedModel.split("/").pop()?.replace(/-/g, " ") || "Default";

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2_000_000) { setError("File too large (>2MB)"); return; }
    const txt = await f.text();
    setText(txt);
    setMode("text");
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
  }

  async function generate() {
    setError(null);
    if (!name.trim()) { setError("Give your deck a name"); return; }
    if (mode === "topic" && !topic.trim()) { setError("Describe the topic"); return; }
    if (mode === "text" && !text.trim()) { setError("Paste or upload some source text"); return; }
    if (userProviders.length === 0) {
      setShowSettings(true);
      return;
    }
    setGenerating(true);
    setSuccess(null);
    try {
      if (mode === "manual") {
        const d = await fcApi.createManualDeck(name.trim());
        setSuccess(`Created empty deck "${d.name}". Card editor coming next.`);
        setName(""); setTopic(""); setText("");
        await load();
        return;
      }
      const result = await fcApi.generateDeck({
        name: name.trim(),
        mode,
        topic: mode === "topic" ? topic : undefined,
        text: mode === "text" ? text : undefined,
        count,
        difficulty,
      });
      setSuccess(`Generated ${result.cards.length} cards for "${result.deck.name}" with ${result.deck.provider_used}.`);
      setName(""); setTopic(""); setText("");
      await load();
    } catch (e: any) {
      setError(String(e.message || e).replace(/^\d+:\s*/, ""));
    } finally {
      setGenerating(false);
    }
  }

  async function deleteDeck(id: string) {
    if (!confirm("Delete this deck and all its cards?")) return;
    try {
      await fcApi.deleteDeck(id);
      setDecks(decks.filter(d => d.id !== id));
    } catch (e: any) { setError(String(e.message || e)); }
  }

  const noKeys = authChecked && userProviders.length === 0;

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <div className="absolute inset-0 pointer-events-none opacity-40"
           style={{ backgroundImage: "radial-gradient(circle at 20% 0%, rgba(16,185,129,0.10), transparent 50%), radial-gradient(circle at 80% 0%, rgba(245,158,11,0.06), transparent 50%)" }} />

      <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard" data-testid="link-back-dashboard">
            <button className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </button>
          </Link>
          <div className="flex items-center gap-2">
            {userProviders.length > 0 ? (
              <div className="flex items-center gap-1.5">
                {/* Provider picker */}
                <div className="relative">
                  <button
                    onClick={() => { setShowProviderPicker(!showProviderPicker); setShowModelPicker(false); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] transition-colors text-xs"
                    data-testid="button-provider-picker">
                    <span className={`w-2 h-2 rounded-full ${PROVIDER_DOTS[selectedProvider] || 'bg-zinc-400'}`} />
                    <span className="text-zinc-300">{PROVIDER_LABELS[selectedProvider] || selectedProvider || "Pick provider"}</span>
                    <ChevronDown className="w-3 h-3 text-zinc-500" />
                  </button>
                  {showProviderPicker && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-[#13131a] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl z-50">
                      {userProviders.map(p => (
                        <button key={p.provider} onClick={() => pickProvider(p.provider)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/[0.05] transition-colors text-xs"
                          data-testid={`option-provider-${p.provider}`}>
                          <span className={`w-2 h-2 rounded-full ${PROVIDER_DOTS[p.provider] || 'bg-zinc-400'}`} />
                          <span className="flex-1 text-zinc-200">{PROVIDER_LABELS[p.provider] || p.provider}</span>
                          <span className="text-[10px] text-zinc-600 font-mono">{p.key_prefix}</span>
                          {p.provider === selectedProvider && <Check className="w-3 h-3 text-emerald-400" />}
                        </button>
                      ))}
                      <button onClick={() => { setShowProviderPicker(false); setShowSettings(true); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-zinc-400 hover:bg-white/[0.05] border-t border-white/[0.06]"
                        data-testid="button-open-settings-from-picker">
                        <Settings className="w-3 h-3" /> Manage keys
                      </button>
                    </div>
                  )}
                </div>
                {/* Model picker */}
                {currentModels.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => { setShowModelPicker(!showModelPicker); setShowProviderPicker(false); }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] transition-colors text-xs max-w-[180px]"
                      data-testid="button-model-picker">
                      <span className="text-zinc-400 truncate">{currentModelName}</span>
                      <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
                    </button>
                    {showModelPicker && (
                      <div className="absolute right-0 top-full mt-2 w-72 bg-[#13131a] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl z-50 max-h-[320px] overflow-y-auto">
                        <div className="px-3 py-2 border-b border-white/[0.06]">
                          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                            {PROVIDER_LABELS[selectedProvider] || selectedProvider} models
                          </span>
                        </div>
                        {currentModels.map(m => (
                          <button key={m.id} onClick={() => pickModel(m.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/[0.05] transition-colors text-xs ${
                              m.id === selectedModel ? "bg-emerald-500/5" : ""
                            }`}
                            data-testid={`option-model-${m.id}`}>
                            <div className="flex-1 min-w-0">
                              <div className="text-zinc-200 truncate">{m.name}</div>
                              <div className="text-[10px] text-zinc-600 font-mono truncate">{m.id}</div>
                            </div>
                            <div className="text-[9px] text-zinc-600 shrink-0 text-right">
                              {m.context_window >= 1000000 ? `${(m.context_window / 1000000).toFixed(0)}M` : `${(m.context_window / 1000).toFixed(0)}k`} ctx
                            </div>
                            {m.id === selectedModel && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : authChecked && (
              <button onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs"
                data-testid="button-add-key">
                <Key className="w-3 h-3" /> Add a provider key
              </button>
            )}
            <button onClick={() => setShowSettings(true)}
              className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] transition-colors text-zinc-400 hover:text-white"
              data-testid="button-settings">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span className="text-[11px] uppercase tracking-wider text-emerald-300 font-semibold">AI flashcards · BYOK</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3 bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
            Study like the popup is the point.
          </h1>
          <p className="text-sm md:text-base text-zinc-500 max-w-xl mx-auto">
            Every card becomes a multiple-choice quiz with AI-generated distractors.
            Your keys, your models, your memory.
          </p>
        </div>

        {/* No-keys gate */}
        {noKeys && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-amber-200 mb-1">Add a provider key to start generating</div>
              <div className="text-xs text-amber-300/70">
                FlashCards uses your own LLM key — Groq, OpenAI, Anthropic, Gemini, Mistral.{" "}
                <button onClick={() => setShowSettings(true)} className="underline cursor-pointer" data-testid="link-open-settings-gate">
                  Add one now
                </button>.
              </div>
            </div>
          </div>
        )}

        {/* Composer */}
        <div className="mb-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
          <div className="flex border-b border-white/[0.06]">
            {([
              { id: "topic", label: "From topic", icon: Brain },
              { id: "text", label: "From text", icon: FileText },
              { id: "manual", label: "Manual", icon: Edit3 },
            ] as { id: Mode; label: string; icon: any }[]).map(t => {
              const Icon = t.icon;
              const active = mode === t.id;
              return (
                <button key={t.id} onClick={() => setMode(t.id)} data-testid={`tab-mode-${t.id}`}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs md:text-sm font-medium transition-colors ${
                    active ? "text-white bg-white/[0.04] border-b-2 border-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                  }`}>
                  <Icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              );
            })}
          </div>

          <div className="p-4 md:p-5">
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Deck name (e.g. Photosynthesis basics)"
              className="w-full px-4 py-3 mb-3 rounded-xl bg-black/30 border border-white/[0.06] focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 text-sm text-white placeholder-zinc-600 outline-none transition-all"
              data-testid="input-deck-name" />

            {mode === "topic" && (
              <>
                <textarea ref={textareaRef} value={topic} onChange={e => setTopic(e.target.value)} rows={3}
                  placeholder="Describe the topic. The more specific, the better cards you get."
                  className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/[0.06] focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 text-sm text-white placeholder-zinc-600 outline-none resize-none transition-all"
                  data-testid="input-topic" />
                <div className="flex flex-wrap gap-3 mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-zinc-500">Cards</span>
                    <select value={count} onChange={e => setCount(Number(e.target.value))}
                      className="px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/[0.06] text-xs text-white outline-none"
                      data-testid="select-count">
                      {[5, 10, 12, 15, 20, 25, 30, 40].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-zinc-500">Level</span>
                    <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/[0.06] text-xs text-white outline-none"
                      data-testid="select-difficulty">
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {mode === "text" && (
              <>
                <textarea value={text} onChange={e => setText(e.target.value)} rows={6}
                  placeholder="Paste textbook chapter, lecture notes, transcript, or any source material…"
                  className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/[0.06] focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 text-sm text-white placeholder-zinc-600 outline-none resize-none transition-all font-mono leading-relaxed"
                  data-testid="input-text" />
                <div className="flex items-center gap-3 mt-3">
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-zinc-300 hover:bg-white/[0.06]"
                    data-testid="button-upload-doc">
                    <FileText className="w-3.5 h-3.5" /> Upload document
                  </button>
                  <input ref={fileInputRef} type="file" accept=".txt,.md,.csv,.json,.html"
                    onChange={onFile} className="hidden" data-testid="input-file" />
                  <span className="text-[11px] text-zinc-600">{text.length.toLocaleString()} chars</span>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-zinc-500">Cards</span>
                    <select value={count} onChange={e => setCount(Number(e.target.value))}
                      className="px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/[0.06] text-xs text-white outline-none"
                      data-testid="select-count-text">
                      {[5, 10, 12, 15, 20, 25, 30, 40].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            {mode === "manual" && (
              <div className="px-1 py-3 text-xs text-zinc-500">
                Create an empty deck — you'll add cards by hand. Distractors auto-generate when you save each card.
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="mt-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1">{error}</span>
                    <button onClick={() => setError(null)}><X className="w-3 h-3" /></button>
                  </div>
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="mt-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1">{success}</span>
                    <button onClick={() => setSuccess(null)}><X className="w-3 h-3" /></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button onClick={generate} disabled={generating || noKeys}
              className="w-full mt-4 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-all"
              data-testid="button-generate-deck">
              {generating ? (<><Loader2 className="w-4 h-4 animate-spin" /> Generating cards…</>) :
                mode === "manual" ? (<><Plus className="w-4 h-4" /> Create empty deck</>) :
                (<><Wand2 className="w-4 h-4" /> Generate deck</>)}
            </button>
          </div>
        </div>

        {/* Marquee starter prompts */}
        {mode !== "manual" && (
          <div className="mb-8">
            <div className="text-[11px] uppercase tracking-widest text-zinc-600 mb-3 font-semibold flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> Try one
            </div>
            <div className="flex flex-col gap-2 overflow-hidden marquee-container">
              {MARQUEE_ROWS.map((row, rowIdx) => (
                <div key={rowIdx} className="relative overflow-hidden w-full"
                     style={{ maskImage: "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)", WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)" }}>
                  <div className={`marquee-track marquee-row-${rowIdx}`}
                       style={{ ['--marquee-duration' as string]: `${110 + rowIdx * 18}s`, animationDirection: rowIdx % 2 === 0 ? 'normal' : 'reverse' } as React.CSSProperties}>
                    {[...row, ...row].map((s, i) => (
                      <button key={`${rowIdx}-${i}`}
                              onClick={() => {
                                const m = s.match(/,\s*(\d+)\s*cards?/i);
                                const titleMatch = s.split(",")[0];
                                setMode("topic");
                                setName(titleMatch.trim());
                                setTopic(s);
                                if (m) setCount(Math.min(40, Math.max(1, Number(m[1]))));
                                textareaRef.current?.focus();
                              }}
                              className="marquee-pill group shrink-0"
                              data-testid={`button-starter-${rowIdx}-${i % row.length}`}>
                        <span className="marquee-pill-border" />
                        <span className="relative z-10 px-3 py-1.5 text-[11px] md:text-xs text-zinc-400 group-hover:text-white transition-colors whitespace-nowrap">
                          {s}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Decks grid */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm uppercase tracking-widest text-zinc-500 font-semibold">Your decks</h2>
            <span className="text-xs text-zinc-600">{decks.length}</span>
          </div>
          {decks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.08] p-10 text-center">
              <BookOpen className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
              <div className="text-sm text-zinc-500">No decks yet. Generate your first one above.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {decks.map(d => (
                <motion.div key={d.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => setLocation(`/flashcards/${d.id}`)}
                  className="group relative rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/30 hover:bg-white/[0.04] transition-all overflow-hidden cursor-pointer"
                  data-testid={`deck-card-${d.id}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-xs uppercase tracking-wider text-emerald-400/70 font-semibold">
                        {d.mode === "topic" ? "AI · Topic" : d.mode === "text" ? "AI · Text" : "Manual"}
                      </div>
                      <div className="text-xs text-zinc-600">{d.card_count ?? 0} cards</div>
                    </div>
                    <div className="font-medium text-white mb-1 line-clamp-1">{d.name}</div>
                    <div className="text-xs text-zinc-500 line-clamp-2 min-h-[2rem]">{d.description || " "}</div>
                    {d.provider_used && (
                      <div className="mt-3 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${PROVIDER_DOTS[d.provider_used] || 'bg-zinc-500'}`} />
                        <span className="text-[10px] text-zinc-600">{PROVIDER_LABELS[d.provider_used] || d.provider_used}</span>
                      </div>
                    )}
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); deleteDeck(d.id); }}
                      className="p-1 rounded-lg bg-black/40 border border-white/[0.08] text-zinc-500 hover:text-red-400 hover:border-red-500/30"
                      data-testid={`button-delete-${d.id}`}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Settings modal */}
      <AnimatePresence>
        {showSettings && (
          <ProviderSettingsModal
            userProviders={userProviders}
            allProviders={allProviders}
            selectedProvider={selectedProvider}
            onSelect={pickProvider}
            onClose={() => setShowSettings(false)}
            onRefresh={load}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


function ProviderSettingsModal({
  userProviders,
  allProviders,
  selectedProvider,
  onSelect,
  onClose,
  onRefresh,
}: {
  userProviders: FCProvider[];
  allProviders: FCAvailableProvider[];
  selectedProvider: string;
  onSelect: (p: string) => void;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  const configuredIds = new Set(userProviders.map(p => p.provider));

  async function addKey() {
    if (!addingFor || !keyInput.trim()) return;
    setSaving(true);
    setModalError(null);
    try {
      await fcApi.addProviderKey(addingFor, keyInput.trim());
      setModalSuccess(`${PROVIDER_LABELS[addingFor] || addingFor} key saved`);
      setKeyInput("");
      setShowKey(false);
      setAddingFor(null);
      onRefresh();
    } catch (e: any) {
      setModalError(String(e.message || e).replace(/^\d+:\s*/, ""));
    } finally {
      setSaving(false);
    }
  }

  async function removeKey(provider: string) {
    setRemoving(provider);
    setModalError(null);
    try {
      await fcApi.removeProviderKey(provider);
      setModalSuccess(`${PROVIDER_LABELS[provider] || provider} key removed`);
      onRefresh();
    } catch (e: any) {
      setModalError(String(e.message || e).replace(/^\d+:\s*/, ""));
    } finally {
      setRemoving(null);
    }
  }

  async function makeDefault(provider: string) {
    setModalError(null);
    try {
      await fcApi.setDefaultProvider(provider);
      onSelect(provider);
      onRefresh();
    } catch (e: any) {
      setModalError(String(e.message || e).replace(/^\d+:\s*/, ""));
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="modal-provider-settings"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#111118] border border-white/[0.08] rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold">Provider Keys</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/[0.05] text-zinc-400 hover:text-white" data-testid="button-close-settings">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <AnimatePresence>
            {modalError && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1">{modalError}</span>
                  <button onClick={() => setModalError(null)}><X className="w-3 h-3" /></button>
                </div>
              </motion.div>
            )}
            {modalSuccess && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1">{modalSuccess}</span>
                  <button onClick={() => setModalSuccess(null)}><X className="w-3 h-3" /></button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Configured providers */}
          {userProviders.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 font-semibold">Your keys</div>
              <div className="space-y-2">
                {userProviders.map(p => (
                  <div key={p.provider}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                      p.provider === selectedProvider
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-white/[0.02] border-white/[0.06]"
                    }`}
                    data-testid={`configured-provider-${p.provider}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${PROVIDER_DOTS[p.provider] || 'bg-zinc-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-white">{PROVIDER_LABELS[p.provider] || p.provider}</div>
                      <div className="text-[10px] text-zinc-600 font-mono">{p.key_prefix}</div>
                    </div>
                    {p.provider === selectedProvider ? (
                      <span className="text-[10px] text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10">Active</span>
                    ) : (
                      <button onClick={() => makeDefault(p.provider)}
                        className="text-[10px] text-zinc-500 hover:text-white px-2 py-0.5 rounded-full hover:bg-white/[0.05]"
                        data-testid={`button-use-${p.provider}`}>
                        Use
                      </button>
                    )}
                    <button onClick={() => removeKey(p.provider)}
                      disabled={removing === p.provider}
                      className="p-1 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                      data-testid={`button-remove-${p.provider}`}>
                      {removing === p.provider ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new key */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 font-semibold">
              {userProviders.length > 0 ? "Add another provider" : "Add a provider key to get started"}
            </div>

            {addingFor ? (
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2 h-2 rounded-full ${PROVIDER_DOTS[addingFor] || 'bg-zinc-400'}`} />
                  <span className="text-xs font-medium text-white">{PROVIDER_LABELS[addingFor] || addingFor}</span>
                  {(() => {
                    const prov = allProviders.find(p => p.id === addingFor);
                    return prov ? (
                      <a href={prov.console_url} target="_blank" rel="noopener noreferrer"
                        className="ml-auto flex items-center gap-1 text-[10px] text-zinc-500 hover:text-cyan-400">
                        Get API key <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : null;
                  })()}
                </div>
                <div className="relative mb-3">
                  <input
                    type={showKey ? "text" : "password"}
                    value={keyInput}
                    onChange={e => setKeyInput(e.target.value)}
                    placeholder="Paste your API key"
                    className="w-full px-3 py-2.5 pr-10 rounded-lg bg-black/30 border border-white/[0.06] focus:border-emerald-500/40 text-xs text-white placeholder-zinc-600 outline-none font-mono"
                    data-testid="input-api-key"
                    onKeyDown={e => { if (e.key === "Enter") addKey(); }}
                    autoFocus
                  />
                  <button onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white"
                    data-testid="button-toggle-key-visibility">
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={addKey} disabled={saving || !keyInput.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-xs font-medium text-white transition-colors"
                    data-testid="button-save-key">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Save key
                  </button>
                  <button onClick={() => { setAddingFor(null); setKeyInput(""); setShowKey(false); }}
                    className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                    data-testid="button-cancel-add">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {allProviders
                  .filter(p => !configuredIds.has(p.id))
                  .map(p => (
                    <button key={p.id} onClick={() => { setAddingFor(p.id); setModalError(null); setModalSuccess(null); }}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all text-left"
                      data-testid={`button-add-${p.id}`}>
                      <span className={`w-2 h-2 rounded-full ${PROVIDER_DOTS[p.id] || 'bg-zinc-400'}`} />
                      <span className="text-xs text-zinc-300">{p.name}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between">
          <div className="text-[10px] text-zinc-600">
            {userProviders.length === 0
              ? "Add at least one key to generate flashcards"
              : `${userProviders.length} provider${userProviders.length !== 1 ? "s" : ""} configured`}
          </div>
          <button onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-xs text-zinc-300 transition-colors"
            data-testid="button-done-settings">
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
