import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot, Boxes, Check, Code, Cpu, LayoutGrid, MessageSquare, Mic, Plus, Search,
  Send, ShieldCheck, User, Users,
} from "lucide-react";
import { aias } from "../aias";
import { toast } from "sonner";
import { useAvailableModels } from "@/hooks/use-available-models";
import {
  ensurePortalSession,
  isPlaygroundProvider,
  updatePortalSessionModel,
  type PortalModelSelection,
} from "@/lib/portalSession";

export interface PortalApp {
  id: string;
  label: string;
  blurb?: string;
  icon: React.ComponentType<any>;
  gradient: string;
  kind: "component" | "classic";
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
}

type Depth = "home" | "chat" | "directory";

export function PromptPortalHome({
  displayName,
  apps,
  onOpen,
  onClassic,
}: {
  displayName: string;
  apps: PortalApp[];
  onOpen: (id: string) => void;
  onClassic: (view: "feed" | "workspaces" | "messages") => void;
}) {
  const [depth, setDepth] = useState<Depth>("home");
  const [prompt, setPrompt] = useState("");
  const [doorsOpen, setDoorsOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [sending, setSending] = useState(false);

  // model binding — same tech Keystone uses (/api/providers/all, federated)
  const { providers, provider: defaultProvider, getModelsForProvider } = useAvailableModels();
  const [selection, setSelection] = useState<PortalModelSelection | null>(null);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);

  useEffect(() => {
    if (selection || providers.length === 0) return;
    const pick = (id: string): boolean => {
      const models = getModelsForProvider(id);
      if (models.length > 0) {
        setSelection({ provider: id, model: models[0].id });
        return true;
      }
      return false;
    };
    if (defaultProvider && isPlaygroundProvider(defaultProvider) && pick(defaultProvider)) return;
    for (const p of providers) {
      if (isPlaygroundProvider(p.id) && pick(p.id)) return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providers, defaultProvider, selection]);

  // Schema defaults are the last resort (PlaygroundSessionCreate defaults).
  const effectiveSelection: PortalModelSelection =
    selection ?? { provider: "groq", model: "llama-3.3-70b-versatile" };

  const pickModel = (provider: string, model: string) => {
    const next = { provider, model };
    setSelection(next);
    setModelPickerOpen(false);
    // The system session follows the user's model — adjust in place.
    if (sessionId) {
      void updatePortalSessionModel(aias, sessionId, next).then((ok) => {
        if (ok) toast.success(`Portal model → ${model}`);
        else toast.error("Could not update the session model");
      });
    }
  };
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") || (event.key === "/" && !typing)) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ensureSession = async (): Promise<string> => {
    if (sessionId) return sessionId;
    // Idempotent system-session bootstrap (lib/portalSession, tested):
    // adopt the existing non-expired "AiAS Portal" session, else create it
    // with ttl_hours: 0 (never expires) and the user's selected model.
    const found = await ensurePortalSession(aias, effectiveSelection);
    if (!found.created) {
      setMessages(
        (found.messages || []).map((m: any) => ({
          id: String(m.id), role: m.role, content: String(m.content || ""), timestamp: m.timestamp,
        }))
      );
    }
    setSessionId(found.id);
    return found.id;
  };

  const routePrompt = (value: string): boolean => {
    const q = value.toLowerCase().trim();
    const app = apps.find((entry) =>
      q === entry.label.toLowerCase() ||
      q === `open ${entry.label.toLowerCase()}` ||
      (q.startsWith("open ") && entry.label.toLowerCase().includes(q.slice(5)))
    );
    if (app) {
      onOpen(app.id);
      return true;
    }
    if (/\b(group|people|messages|dm|team|conversation)\b/.test(q)) {
      onClassic("messages");
      return true;
    }
    if (/\b(workspaces|communities|fleet)\b/.test(q)) {
      onClassic("workspaces");
      return true;
    }
    if (/\b(feed|network)\b/.test(q)) {
      onClassic("feed");
      return true;
    }
    if (/\b(keystone|code|editor|ide)\b/.test(q)) {
      onOpen("keystone");
      return true;
    }
    if (/\b(tool|apps|capability|directory)\b/.test(q)) {
      setDepth("directory");
      return true;
    }
    if (/\b(back|home|exit)\b/.test(q)) {
      setDepth("home");
      return true;
    }
    return false;
  };

  const sendChat = async (value: string) => {
    setDepth("chat");
    const user: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: value, timestamp: new Date().toISOString() };
    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [...prev, user, { id: assistantId, role: "assistant", content: "", timestamp: new Date().toISOString() }]);
    setSending(true);
    try {
      const sid = await ensureSession();
      const response = await aias.api(`/api/playground/sessions/${sid}/chat/stream`, {
        method: "POST",
        body: JSON.stringify({
          message: value,
          include_knowledge: true,
          include_directives: true,
          web_tool: "none",
          reasoning: false,
        }),
      });
      if (!response.ok || !response.body) throw new Error(`Portal chat failed (${response.status})`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      for (;;) {
        const { done, value: bytes } = await reader.read();
        if (done) break;
        buffer += decoder.decode(bytes, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        for (const event of events) {
          const line = event.split("\n").find((part) => part.startsWith("data: "));
          if (!line) continue;
          let data: any;
          try { data = JSON.parse(line.slice(6)); } catch { continue; }
          if (data.type === "chunk" && data.content) {
            acc += data.content;
            setMessages((prev) => prev.map((message) => message.id === assistantId ? { ...message, content: acc } : message));
          }
          if (data.type === "done") {
            const content = data.message?.content || acc;
            setMessages((prev) => prev.map((message) => message.id === assistantId ? {
              ...message,
              id: data.message?.id || message.id,
              content,
              timestamp: data.message?.timestamp || message.timestamp,
            } : message));
          }
          if (data.type === "error") throw new Error(data.detail || "Portal chat failed");
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Portal chat failed";
      setMessages((prev) => prev.map((item) => item.id === assistantId ? { ...item, role: "system", content: message } : item));
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const submit = async () => {
    const value = prompt.trim();
    if (!value || sending) return;
    setPrompt("");
    if (!routePrompt(value)) await sendChat(value);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f3f6fa] text-[#132238] [color-scheme:light]">
      <div className="pointer-events-none absolute left-[8%] right-[8%] top-[27%] h-px bg-gradient-to-r from-transparent via-blue-500/15 to-transparent" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.section
          key={depth}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 0.94, y: 30, filter: "blur(9px)" }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 1.035, y: -20, filter: "blur(9px)" }}
          transition={{ duration: 0.36, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {depth === "home" && (
            <div className="flex h-full flex-col overflow-y-auto px-5 pb-24 pt-12">
              <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center pb-40 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-white/80 px-2.5 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-teal-700">
                  <ShieldCheck className="h-3 w-3" /> context encrypted · federated identity
                </span>
                <h1 className="mt-6 text-[clamp(2rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.055em] text-[#061426]">
                  What do you want<br />to move, {displayName}?
                </h1>
                <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-slate-500">
                  Speak to the platform. Bring in people, open KeyStone, run a tool, or move into any existing AiOS capability without navigating a desktop.
                </p>
              </div>
              <div className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-2 md:grid-cols-5">
                <LedgerButton icon={Bot} label="Private chat" sub="streaming playground" onClick={() => setDepth("chat")} />
                <LedgerButton icon={Users} label="Group chat" sub="community messages" onClick={() => onClassic("messages")} />
                <LedgerButton icon={Code} label="KeyStone" sub="workspace + runtime" onClick={() => onOpen("keystone")} />
                <LedgerButton icon={Boxes} label="Workspaces" sub="community fleet" onClick={() => onClassic("workspaces")} />
                <LedgerButton icon={LayoutGrid} label="All capabilities" sub={`${apps.length} live surfaces`} onClick={() => setDepth("directory")} />
              </div>
            </div>
          )}
          {depth === "chat" && (
            <div className="h-full overflow-y-auto px-[clamp(1rem,7vw,7rem)] pb-36 pt-8">
              <div className="mx-auto max-w-4xl">
                <div className="mb-7 flex items-center gap-2 border-b border-slate-200 pb-3">
                  <button onClick={() => setDepth("home")} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">← Back</button>
                  <div><strong className="block text-sm">Private conversation</strong><span className="font-mono text-[8px] text-slate-500">PLAYGROUND STREAM · FEDERATED SESSION · BYOK</span></div>
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-1 font-mono text-[8px] text-teal-700"><ShieldCheck className="h-3 w-3" /> isolated</span>
                </div>
                {messages.length === 0 && <div className="py-24 text-center text-sm text-slate-500">The conversation starts at the portal.</div>}
                {messages.map((message) => (
                  <article key={message.id} className={`mb-5 grid grid-cols-[30px_minmax(0,1fr)] gap-2.5 ${message.role === "user" ? "ml-auto max-w-2xl" : "max-w-4xl"}`}>
                    <span className={`grid h-[30px] w-[30px] place-items-center rounded-full text-white ${message.role === "assistant" ? "bg-blue-600" : message.role === "system" ? "bg-teal-700" : "bg-[#0a1d35]"}`}>
                      {message.role === "assistant" ? <Bot className="h-3.5 w-3.5" /> : message.role === "user" ? <User className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    </span>
                    <div><div className="flex items-center gap-2 font-mono text-[8px] text-slate-400"><strong className="font-sans text-[10px] text-slate-800">{message.role === "assistant" ? "AiAS" : message.role === "user" ? "You" : "System"}</strong><span>{message.timestamp?.slice(11, 19) || "now"}</span></div><div className={`mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-slate-700 ${message.role === "user" ? "rounded-lg border border-blue-200 bg-blue-50 px-3 py-2" : ""}`}>{message.content || (sending && message.role === "assistant" ? "Establishing response…" : "")}</div></div>
                  </article>
                ))}
              </div>
            </div>
          )}
          {depth === "directory" && (
            <div className="h-full overflow-y-auto px-5 pb-36 pt-7">
              <div className="mx-auto max-w-6xl">
                <div className="mb-4 flex items-center gap-2"><button onClick={() => setDepth("home")} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">← Back</button><div><strong className="block text-sm">Capability directory</strong><span className="font-mono text-[8px] text-slate-500">LIVE AIOS COMPONENT REGISTRY</span></div></div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                  {apps.map((app) => { const Icon = app.icon; return <button key={app.id} onClick={() => onOpen(app.id)} className="min-h-[108px] rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"><span className="grid h-8 w-8 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600"><Icon className="h-4 w-4" /></span><strong className="mt-2.5 block text-[11px] text-slate-800">{app.label}</strong><p className="mt-1 text-[9px] leading-snug text-slate-500">{app.blurb}</p><span className="mt-2 block font-mono text-[7px] uppercase text-teal-700">{app.kind} · ready</span></button>; })}
                </div>
              </div>
            </div>
          )}
        </motion.section>
      </AnimatePresence>

      <section className={`absolute left-1/2 z-30 w-[min(860px,calc(100%_-_24px))] -translate-x-1/2 transition-all duration-500 ${depth === "home" ? "top-[46%] -translate-y-1" : "bottom-4"}`}>
        <div className="mb-1.5 flex px-1 font-mono text-[8px] font-semibold uppercase tracking-wider text-slate-500"><strong className="text-[#123054]">{depth === "home" ? "DEPTH 00 · CHAT" : depth === "chat" ? "DEPTH 01 · PRIVATE CHAT" : "DEPTH 01 · CAPABILITIES"}</strong><span className="ml-auto text-teal-700">PORTAL READY</span></div>
        <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white/95 shadow-[0_24px_70px_rgba(10,29,53,.16)] backdrop-blur-xl">
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-[8px] text-slate-500"><span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-1 text-teal-700"><ShieldCheck className="h-3 w-3" /> VERIFIED</span><span className="rounded-full border border-slate-200 bg-white px-2 py-1">AiAS Portal</span><span className="rounded-full border border-slate-200 bg-white px-2 py-1">federated session</span><span className="rounded-full border border-slate-200 bg-white px-2 py-1">BYOK · policy active</span></div>
          <div className="grid min-h-[66px] grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-end gap-1.5 p-2.5">
            <button onClick={() => setDoorsOpen((open) => !open)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-slate-100 text-[#123054] hover:bg-blue-50"><Plus className="h-4 w-4" /></button>
            <textarea ref={inputRef} value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); } }} rows={1} placeholder={depth === "home" ? "Ask, bring people in, open KeyStone, run something…" : "Continue here or open another capability…"} className="max-h-28 min-h-[40px] resize-none bg-transparent px-1 py-2 text-[14px] text-[#061426] outline-none placeholder:text-slate-400" />
            <button onClick={() => setModelPickerOpen((v) => !v)} title={`Model: ${effectiveSelection.model} — the portal session follows this`} data-testid="portal-model-chip" className={`flex h-10 max-w-[150px] items-center gap-1.5 rounded-xl border px-2.5 font-mono text-[10px] ${modelPickerOpen ? "border-teal-300 bg-teal-50 text-teal-700" : "border-slate-200 bg-white text-slate-600 hover:border-teal-300"}`}>
              <Cpu className="h-3.5 w-3.5 shrink-0 text-teal-600" />
              <span className="truncate">{effectiveSelection.model}</span>
            </button>
            <button title="Voice control" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><Mic className="h-4 w-4" /></button>
            <button onClick={() => void submit()} disabled={!prompt.trim() || sending} className="grid h-10 w-10 place-items-center rounded-xl bg-[#0a1d35] text-white shadow disabled:opacity-40"><Send className="h-4 w-4" /></button>
          </div>
          {modelPickerOpen && (
            <div className="max-h-72 overflow-y-auto border-t border-slate-200 bg-white p-2" data-testid="portal-model-picker">
              <div className="px-2 pb-1 font-mono text-[8px] font-semibold uppercase tracking-wider text-slate-400">
                MODEL — THE PORTAL SESSION FOLLOWS YOUR PICK
              </div>
              {providers.filter((p) => isPlaygroundProvider(p.id)).map((p) => (
                <div key={p.id} className="mb-1">
                  <div className="px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-slate-400">{p.name}</div>
                  {getModelsForProvider(p.id).map((m) => {
                    const active = effectiveSelection.provider === p.id && effectiveSelection.model === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => pickModel(p.id, m.id)}
                        data-testid={`portal-model-${p.id}-${m.id}`}
                        className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[12px] ${active ? "bg-teal-50 text-teal-700" : "text-slate-700 hover:bg-slate-50"}`}
                      >
                        <span className="truncate">{m.name}</span>
                        {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))}
              {providers.filter((p) => isPlaygroundProvider(p.id)).length === 0 && (
                <div className="px-2 py-3 text-center text-[12px] text-slate-400">No chat providers configured yet</div>
              )}
            </div>
          )}
          <div className={`grid grid-cols-4 overflow-hidden border-slate-200 bg-slate-50 transition-all ${doorsOpen ? "max-h-16 border-t opacity-100" : "max-h-0 opacity-0"}`}>
            <Door label="Group chat" icon={MessageSquare} onClick={() => onClassic("messages")} />
            <Door label="KeyStone" icon={Code} onClick={() => onOpen("keystone")} />
            <Door label="All apps" icon={LayoutGrid} onClick={() => setDepth("directory")} />
            <Door label="Search" icon={Search} onClick={() => onOpen("tools")} />
          </div>
        </div>
        <div className="mt-1.5 text-center font-mono text-[8px] text-slate-400">/ or ⌘K focuses the portal · natural language changes depth</div>
      </section>
    </div>
  );
}

function LedgerButton({ icon: Icon, label, sub, onClick }: { icon: React.ComponentType<any>; label: string; sub: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex min-h-[56px] items-center gap-2 rounded-lg border border-slate-200 bg-white/70 p-2 text-left text-blue-600 hover:bg-white"><Icon className="h-4 w-4 shrink-0" /><div><strong className="block text-[9px] text-slate-700">{label}</strong><span className="mt-0.5 block font-mono text-[7px] text-slate-500">{sub}</span></div></button>;
}

function Door({ icon: Icon, label, onClick }: { icon: React.ComponentType<any>; label: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex h-12 items-center justify-center gap-1.5 border-r border-slate-200 text-[9px] font-semibold text-slate-600 last:border-r-0 hover:bg-blue-50 hover:text-blue-600"><span className="grid h-5 w-5 place-items-center rounded-md border border-slate-200 bg-white"><Icon className="h-3 w-3" /></span>{label}</button>;
}
