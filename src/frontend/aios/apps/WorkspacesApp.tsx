/**
 * Workspaces — your v1 AiAS workspaces as GROUPS/COMMUNITIES, routed
 * through the production API on the federated token.
 *
 * The vocabulary map made real: AiAS workspaces = devnet groups. The rail
 * reads like a community list (avatar, preview, unread heat); the pane is
 * the live conversation (client / AI / you), with send + clear-attention.
 *
 * Endpoints (all v1 production, all existing):
 *   GET  /api/user/workspaces?limit=50            — fast preview list
 *   GET  /api/workspaces/{id}/messages?limit=80   — thread
 *   POST /api/workspaces/{id}/messages            — send as you
 *   POST /api/workspaces/{id}/clear-attention     — "handled it"
 *   POST /api/workspaces                          — new community
 */
import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle, Bot, Check, Loader2, Plus, RefreshCw, Search, Send, User, Users,
} from "lucide-react";
import { aias } from "../../aias";

interface Ws {
  id: string;
  title?: string;
  mode?: string;
  status?: string;
  needs_human_attention?: boolean | string;
  last_message_preview?: string;
  first_message?: string;
  message_count?: number;
  updated_at?: string;
  created_at?: string;
  is_recently_active?: boolean;
}
interface Msg {
  id: string;
  role: string;
  content: string;
  created_at?: string;
  sender_name?: string;
}

const GRADS = [
  "from-teal-500 to-emerald-600", "from-cyan-500 to-blue-600",
  "from-violet-500 to-purple-600", "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-600", "from-emerald-400 to-green-600",
];
const grad = (id: string) =>
  GRADS[(id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % GRADS.length];

const title = (w: Ws) => w.title || w.first_message?.slice(0, 40) || `Workspace ${w.id.slice(0, 6)}`;
const needsYou = (w: Ws) => w.needs_human_attention === true || w.needs_human_attention === "true";

function ago(iso?: string): string {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function WorkspacesApp() {
  const [rows, setRows] = useState<Ws[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [q, setQ] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selRef = useRef<string | null>(null);
  selRef.current = sel;

  const loadList = async (spin = false) => {
    if (spin) setRefreshing(true);
    const r = await aias.json<any>("/api/user/workspaces?limit=50");
    setRefreshing(false);
    if (r.status === 401) { setErr("Session expired on v1 — sign in again."); return; }
    if (!r.ok) { setErr(`Workspaces unavailable (${r.status}).`); return; }
    setErr(null);
    setRows(r.data?.workspaces || []);
  };

  const loadThread = async (id: string) => {
    const r = await aias.json<any>(`/api/workspaces/${id}/messages?limit=80`);
    if (r.ok && selRef.current === id) setMsgs(r.data?.messages || []);
  };

  useEffect(() => {
    void loadList();
    const t = setInterval(() => void loadList(), 15_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!sel) return;
    setMsgs(null);
    void loadThread(sel);
    const t = setInterval(() => void loadThread(sel), 8_000);
    return () => clearInterval(t);
  }, [sel]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs?.length]);

  const send = async () => {
    if (!sel || sending) return;
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    setSending(true);
    setMsgs((m) => [...(m || []), { id: `tmp-${Date.now()}`, role: "user", content }]);
    try {
      await aias.api(`/api/workspaces/${sel}/messages`, {
        method: "POST", body: JSON.stringify({ content }),
      });
      await loadThread(sel);
      void loadList();
    } finally {
      setSending(false);
    }
  };

  const clearAttention = async () => {
    if (!sel) return;
    await aias.api(`/api/workspaces/${sel}/clear-attention`, { method: "POST" });
    void loadList();
  };

  const createWs = async () => {
    const r = await aias.json<any>("/api/workspaces", {
      method: "POST", body: JSON.stringify({ title: `Community ${new Date().toLocaleTimeString()}` }),
    });
    const id = r.data?.workspace?.id || r.data?.id;
    if (id) { await loadList(); setSel(id); }
  };

  const needle = q.trim().toLowerCase();
  const filtered = (rows || []).filter((w) =>
    !needle || title(w).toLowerCase().includes(needle) || w.id.includes(needle));
  const attention = (rows || []).filter(needsYou).length;
  const current = (rows || []).find((w) => w.id === sel) || null;

  return (
    <div className="flex h-full bg-zinc-950 text-zinc-100">
      {/* ── community rail ── */}
      <div className="flex w-72 shrink-0 flex-col border-r border-white/10">
        <div className="flex items-center gap-2 border-b border-white/10 p-3">
          <Users className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-bold">Workspaces</span>
          {attention > 0 && (
            <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-400/30">
              {attention} need you
            </span>
          )}
          <span className="flex-1" />
          <button onClick={() => void loadList(true)} title="Refresh"
                  className="rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-200">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => void createWs()} title="New community"
                  className="rounded-md border border-emerald-500/30 bg-emerald-500/15 p-1 text-emerald-400 hover:bg-emerald-500/25">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="border-b border-white/10 p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search communities"
                   className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 pl-8 pr-3 text-[13px] outline-none placeholder:text-zinc-600 focus:border-emerald-500/40" />
          </div>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto p-1.5">
          {rows === null && !err && (
            <div className="space-y-1.5 p-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
              ))}
            </div>
          )}
          {err && (
            <div className="m-2 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-200">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {err}
            </div>
          )}
          {rows !== null && !err && filtered.length === 0 && (
            <p className="px-3 py-8 text-center text-xs text-zinc-500">
              {needle ? "Nothing matches." : "No workspaces yet — start one with +"}
            </p>
          )}
          {filtered.map((w) => (
            <button key={w.id} onClick={() => setSel(w.id)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                      sel === w.id ? "bg-white/10" : "hover:bg-white/5"}`}>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${grad(w.id)} text-[13px] font-bold text-white`}>
                {title(w)[0]?.toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className={`truncate text-[13px] ${needsYou(w) ? "font-semibold" : "font-medium"}`}>{title(w)}</span>
                  {needsYou(w) && <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-400" />}
                </span>
                <span className="block truncate text-[11px] text-zinc-500">
                  {w.last_message_preview || `${w.message_count ?? 0} messages`}
                </span>
              </span>
              <span className="shrink-0 text-[10px] text-zinc-600">{ago(w.updated_at)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── conversation pane ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {!sel && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <Users className="mb-3 h-8 w-8 text-zinc-700" />
            <p className="text-sm text-zinc-400">Your v1 workspaces, as communities.</p>
            <p className="mt-1 text-xs text-zinc-600">Pick one from the rail — the conversation opens here.</p>
          </div>
        )}
        {sel && (
          <>
            <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-2.5">
              <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${grad(sel)} text-xs font-bold text-white`}>
                {current ? title(current)[0]?.toUpperCase() : "·"}
              </span>
              <span className="truncate text-sm font-semibold">{current ? title(current) : sel.slice(0, 8)}</span>
              {current?.mode && (
                <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                  {current.mode}
                </span>
              )}
              <span className="flex-1" />
              {current && needsYou(current) && (
                <button onClick={() => void clearAttention()}
                        className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[11.5px] font-semibold text-amber-300 hover:bg-amber-500/25">
                  <Check className="h-3.5 w-3.5" /> Handled — clear flag
                </button>
              )}
            </div>

            <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
              {msgs === null && (
                <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-white/25" /></div>
              )}
              {msgs !== null && msgs.length === 0 && (
                <p className="py-10 text-center text-sm text-zinc-500">Quiet room — say something.</p>
              )}
              {(msgs || []).map((m) => {
                const mine = m.role === "user" || m.role === "agent" || m.role === "admin";
                const isAi = m.role === "assistant";
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] rounded-xl border px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
                      mine ? "border-emerald-600/30 bg-emerald-600/15"
                           : isAi ? "border-violet-500/25 bg-violet-500/10"
                                  : "border-white/10 bg-white/5"}`}>
                      <span className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                        {isAi ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        {isAi ? "AI" : mine ? "You" : m.sender_name || "Client"}
                        {m.created_at && <span className="font-normal normal-case">· {ago(m.created_at)}</span>}
                      </span>
                      {m.content}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-white/10 p-2.5">
              <div className="flex gap-2">
                <textarea value={draft} rows={1} placeholder="Message this community…"
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                          className="flex-1 resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-emerald-500/40" />
                <button onClick={() => void send()} disabled={sending}
                        className="rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 px-3.5 text-white disabled:opacity-50">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-zinc-600">Routed through v1 production · you're speaking as the workspace operator</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
