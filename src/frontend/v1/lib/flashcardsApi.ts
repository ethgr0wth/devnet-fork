import { apiFetch } from "@/lib/queryClient";

export interface FCProvider {
  provider: string;
  key_prefix: string;
  is_default: boolean;
  status: string;
}

export interface FCAvailableProvider {
  id: string;
  name: string;
  docs_url: string;
  console_url: string;
  models: FCModelInfo[];
}

export interface FCModelInfo {
  id: string;
  name: string;
  context_window: number;
  max_output: number;
}

export interface FCConfiguredProvider {
  id: string;
  name: string;
  is_default: boolean;
  models: FCModelInfo[];
}

export interface FCDeck {
  id: string;
  user_id: string;
  name: string;
  description: string;
  mode: string;
  created_at: string;
  card_count?: number;
  provider_used?: string;
  model_used?: string;
}

export interface FCCard {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  explanation: string;
  distractors: string[];
  srs: { ease: number; interval: number; reps: number; due_at: number; last_reviewed: number | null };
  created_at: string;
}

export interface FCStudyCard {
  id: string;
  front: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

const PROVIDER_KEY = "fc:selected_provider";
const MODEL_KEY = "fc:selected_model";

export const fcStore = {
  getProvider: (): string | null => localStorage.getItem(PROVIDER_KEY),
  setProvider: (p: string) => localStorage.setItem(PROVIDER_KEY, p),
  getModel: (): string | null => localStorage.getItem(MODEL_KEY),
  setModel: (m: string) => localStorage.setItem(MODEL_KEY, m),
};

function byokHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const p = fcStore.getProvider();
  const m = fcStore.getModel();
  if (p) h["X-AiAssist-Provider"] = p;
  if (m) h["X-AiAssist-Model"] = m;
  return h;
}

async function jget<T = any>(url: string): Promise<T> {
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

async function jpost<T = any>(url: string, body?: any, withByok = false): Promise<T> {
  const res = await apiFetch(url, {
    method: "POST",
    headers: withByok ? byokHeaders() : { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

async function jpatch<T = any>(url: string, body: any): Promise<T> {
  const res = await apiFetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

async function jdel<T = any>(url: string): Promise<T> {
  const res = await apiFetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

async function jput<T = any>(url: string, body: any): Promise<T> {
  const res = await apiFetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

export const fcApi = {
  listUserProviders: () => jget<FCProvider[]>("/api/providers/user"),
  listAllProviders: () => jget<FCAvailableProvider[]>("/api/providers"),
  addProviderKey: (provider: string, apiKey: string, label?: string) =>
    jpost<{ message: string; id: string; provider: string; key_prefix: string }>(
      `/api/providers/user/${provider}`,
      { api_key: apiKey, label },
    ),
  removeProviderKey: (provider: string) => jdel(`/api/providers/user/${provider}`),
  setDefaultProvider: (provider: string) => jput(`/api/providers/user/default`, { provider }),
  listConfiguredProviders: () => jget<{ default_provider: string; providers: FCConfiguredProvider[]; fallback_chain: string[] }>("/api/providers/all"),

  listDecks: () => jget<{ decks: FCDeck[] }>("/api/flashcards/decks"),
  getDeck: (id: string) => jget<{ deck: FCDeck; cards: FCCard[] }>(`/api/flashcards/decks/${id}`),
  generateDeck: (data: {
    name: string;
    mode: "topic" | "text";
    topic?: string;
    text?: string;
    count: number;
    difficulty?: string;
    description?: string;
  }) => jpost<{ deck: FCDeck; cards: FCCard[]; tokens_used: number }>(
    "/api/flashcards/decks/generate",
    data,
    true,
  ),
  createManualDeck: (name: string, description?: string) =>
    jpost<FCDeck>("/api/flashcards/decks/manual", { name, description }, false),
  patchDeck: (id: string, data: { name?: string; description?: string }) =>
    jpatch<FCDeck>(`/api/flashcards/decks/${id}`, data),
  deleteDeck: (id: string) => jdel(`/api/flashcards/decks/${id}`),
  addCard: (deckId: string, data: { front: string; back: string; explanation?: string; distractors?: string[] }) =>
    jpost<FCCard>(`/api/flashcards/decks/${deckId}/cards`, data, true),
  patchCard: (id: string, data: Partial<{ front: string; back: string; explanation: string; distractors: string[] }>) =>
    jpatch<FCCard>(`/api/flashcards/cards/${id}`, data),
  deleteCard: (id: string) => jdel(`/api/flashcards/cards/${id}`),
  regenerateDistractors: (id: string) => jpost<FCCard>(`/api/flashcards/cards/${id}/regenerate-distractors`, undefined, true),
  studyNext: (deckId: string) => jget<{
    done: boolean;
    card: FCStudyCard | null;
    next_due_at?: number;
    stats: { due: number; total: number };
  }>(`/api/flashcards/decks/${deckId}/study/next`),
  reviewCard: (cardId: string, rating: "again" | "hard" | "good" | "easy") =>
    jpost(`/api/flashcards/cards/${cardId}/review`, { rating }, false),
};

export const PROVIDER_LABELS: Record<string, string> = {
  groq: "Groq",
  openai: "OpenAI",
  anthropic: "Anthropic",
  mistral: "Mistral",
  gemini: "Gemini",
  openrouter: "OpenRouter",
  deepseek: "DeepSeek",
  together: "Together",
  perplexity: "Perplexity",
  xai: "xAI",
  fireworks: "Fireworks",
};

export const PROVIDER_DOTS: Record<string, string> = {
  groq: "bg-orange-400",
  openai: "bg-emerald-400",
  anthropic: "bg-amber-400",
  mistral: "bg-orange-300",
  gemini: "bg-blue-400",
  openrouter: "bg-violet-400",
  deepseek: "bg-cyan-400",
  together: "bg-pink-400",
  perplexity: "bg-teal-400",
  xai: "bg-zinc-300",
  fireworks: "bg-rose-400",
};

export const DEFAULT_MODELS: Record<string, string> = {
  groq: "llama-3.3-70b-versatile",
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-20250514",
  gemini: "gemini-2.0-flash",
  mistral: "mistral-large-latest",
  openrouter: "meta-llama/llama-3.3-70b-instruct",
  deepseek: "deepseek-chat",
  together: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  perplexity: "sonar",
  xai: "grok-3-mini-fast",
  fireworks: "accounts/fireworks/models/llama-v3p3-70b-instruct",
};
