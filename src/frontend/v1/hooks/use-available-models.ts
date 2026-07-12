import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/queryClient";

interface AvailableModel {
  id: string;
  name: string;
  context_window?: number;
  max_output?: number;
  reasoning_efforts?: string[];
  default_reasoning_effort?: string;
}

interface ProviderWithModels {
  id: string;
  name: string;
  is_default: boolean;
  models: AvailableModel[];
}

interface UseAvailableModelsResult {
  models: AvailableModel[];
  provider: string;
  providers: ProviderWithModels[];
  allModels: AvailableModel[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getModelsForProvider: (providerId: string) => AvailableModel[];
}

const KNOWN_MODELS: Record<string, AvailableModel[]> = {
  pin: [],
  groq: [
    {
      id: "groq/compound",
      name: "GroqCompound",
      context_window: 131072,
      max_output: 8192,
    },
    {
      id: "groq/compound-mini",
      name: "GroqCompound Mini",
      context_window: 131072,
      max_output: 8192,
    },
    {
      id: "llama-3.1-8b-instant",
      name: "Llama 3.1 8B",
      context_window: 131072,
      max_output: 131072,
    },
    {
      id: "llama-3.3-70b-versatile",
      name: "Llama 3.3 70B",
      context_window: 131072,
      max_output: 32768,
    },
    {
      id: "meta-llama/llama-4-scout-17b-16e-instruct",
      name: "Llama 4 Scout",
      context_window: 131072,
      max_output: 8192,
    },
    {
      id: "meta-llama/llama-guard-4-12b",
      name: "Llama Guard 4 12B",
      context_window: 131072,
      max_output: 8192,
    },
    {
      id: "meta-llama/llama-prompt-guard-2-22m",
      name: "Llama Prompt Guard 2 22M",
      context_window: 131072,
      max_output: 8192,
    },
    {
      id: "meta-llama/llama-prompt-guard-2-86m",
      name: "Llama Prompt Guard 2 86M",
      context_window: 131072,
      max_output: 8192,
    },
    {
      id: "openai/gpt-oss-120b",
      name: "GPT OSS 120B",
      context_window: 131072,
      max_output: 65536,
    },
    {
      id: "openai/gpt-oss-20b",
      name: "GPT OSS 20B",
      context_window: 131072,
      max_output: 65536,
    },
    {
      id: "openai/gpt-oss-safeguard-20b",
      name: "GPT OSS Safeguard 20B",
      context_window: 131072,
      max_output: 65536,
    },
    {
      id: "qwen/qwen3-32b",
      name: "Qwen3 32B",
      context_window: 131072,
      max_output: 8192,
    },
  ],
  openai: [
    {
      id: "gpt-5.6-sol",
      name: "GPT-5.6 Sol",
      context_window: 1050000,
      max_output: 128000,
      reasoning_efforts: ["light", "medium", "high", "xhigh"],
      default_reasoning_effort: "medium",
    },
    {
      id: "gpt-5.5",
      name: "GPT-5.5",
      context_window: 1050000,
      max_output: 128000,
    },
    {
      id: "gpt-5.5-pro",
      name: "GPT-5.5 Pro",
      context_window: 1050000,
      max_output: 128000,
    },
    {
      id: "gpt-5.4",
      name: "GPT-5.4",
      context_window: 1050000,
      max_output: 128000,
    },
    {
      id: "gpt-5.4-pro",
      name: "GPT-5.4 Pro",
      context_window: 1050000,
      max_output: 128000,
    },
    {
      id: "gpt-5.4-2026-03-05",
      name: "GPT-5.4 (03-05)",
      context_window: 1050000,
      max_output: 128000,
    },
    {
      id: "gpt-5.4-mini",
      name: "GPT-5.4 Mini",
      context_window: 400000,
      max_output: 128000,
    },
    {
      id: "gpt-5.4-nano",
      name: "GPT-5.4 Nano",
      context_window: 400000,
      max_output: 128000,
    },
    {
      id: "gpt-5.3-codex",
      name: "GPT-5.3 Codex",
      context_window: 400000,
      max_output: 128000,
    },
    {
      id: "gpt-5.3-chat-latest",
      name: "GPT-5.3 Chat Latest",
      context_window: 128000,
      max_output: 16384,
    },
    {
      id: "gpt-5-mini",
      name: "GPT-5 Mini",
      context_window: 400000,
      max_output: 128000,
    },
    {
      id: "gpt-5.2",
      name: "GPT-5.2",
      context_window: 200000,
      max_output: 128000,
    },
    {
      id: "gpt-5.2-pro",
      name: "GPT-5.2 Pro",
      context_window: 200000,
      max_output: 32768,
    },
    {
      id: "gpt-4.1",
      name: "GPT-4.1",
      context_window: 1000000,
      max_output: 32768,
    },
    {
      id: "gpt-4.1-mini",
      name: "GPT-4.1 Mini",
      context_window: 1000000,
      max_output: 32768,
    },
    {
      id: "gpt-4.1-nano",
      name: "GPT-4.1 Nano",
      context_window: 1000000,
      max_output: 32768,
    },
    { id: "gpt-4o", name: "GPT-4o", context_window: 128000, max_output: 16384 },
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini",
      context_window: 128000,
      max_output: 16384,
    },
    {
      id: "gpt-3.5-turbo",
      name: "GPT-3.5 Turbo",
      context_window: 1050000,
      max_output: 128000,
    },
    { id: "o3", name: "o3", context_window: 200000, max_output: 100000 },
    {
      id: "o3-pro",
      name: "o3 Pro",
      context_window: 200000,
      max_output: 100000,
    },
    {
      id: "o4-mini",
      name: "o4 Mini",
      context_window: 128000,
      max_output: 65536,
    },
  ],
  anthropic: [
    {
      id: "claude-fable-5",
      name: "Claude Fable 5",
      context_window: 1000000,
      max_output: 128000,
    },
    {
      id: "claude-sonnet-5",
      name: "Claude Sonnet 5",
      context_window: 1000000,
      max_output: 128000,
    },
    {
      id: "claude-opus-4-8",
      name: "Claude Opus 4.8",
      context_window: 1000000,
      max_output: 128000,
    },
    {
      id: "claude-opus-4-7",
      name: "Claude Opus 4.7",
      context_window: 1000000,
      max_output: 128000,
    },
    {
      id: "claude-opus-4-6",
      name: "Claude Opus 4.6",
      context_window: 1000000,
      max_output: 128000,
    },
    {
      id: "claude-sonnet-4-6",
      name: "Claude Sonnet 4.6",
      context_window: 1000000,
      max_output: 64000,
    },
    {
      id: "claude-opus-4-5-20251101",
      name: "Claude Opus 4.5",
      context_window: 200000,
      max_output: 64000,
    },
    {
      id: "claude-sonnet-4-5-20250929",
      name: "Claude Sonnet 4.5",
      context_window: 1000000,
      max_output: 64000,
    },
    {
      id: "claude-haiku-4-5-20251001",
      name: "Claude Haiku 4.5",
      context_window: 200000,
      max_output: 64000,
    },
    {
      id: "claude-opus-4-1-20250805",
      name: "Claude Opus 4.1",
      context_window: 200000,
      max_output: 32000,
    },
    {
      id: "claude-opus-4-20250514",
      name: "Claude Opus 4",
      context_window: 200000,
      max_output: 32000,
    },
    {
      id: "claude-sonnet-4-20250514",
      name: "Claude Sonnet 4",
      context_window: 1000000,
      max_output: 64000,
    },
    {
      id: "claude-3-haiku-20240307",
      name: "Claude 3 Haiku",
      context_window: 200000,
      max_output: 4096,
    },
  ],
  gemini: [
    {
      id: "gemini-3.1-pro-preview",
      name: "Gemini 3.1 Pro Preview",
      context_window: 2000000,
      max_output: 65536,
    },
    {
      id: "gemini-3-flash-preview",
      name: "Gemini 3 Flash Preview",
      context_window: 1000000,
      max_output: 65536,
    },
    {
      id: "gemini-3.1-flash-lite-preview",
      name: "Gemini 3.1 Flash-Lite Preview",
      context_window: 1000000,
      max_output: 65536,
    },
    {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      context_window: 1000000,
      max_output: 65536,
    },
    {
      id: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      context_window: 2000000,
      max_output: 65536,
    },
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      context_window: 1000000,
      max_output: 8192,
    },
    {
      id: "gemini-2.0-flash-lite",
      name: "Gemini 2.0 Flash-Lite",
      context_window: 1000000,
      max_output: 8192,
    },
  ],
  mistral: [
    {
      id: "mistral-large-latest",
      name: "Mistral Large 3",
      context_window: 128000,
      max_output: 8192,
    },
    {
      id: "codestral-latest",
      name: "Codestral",
      context_window: 256000,
      max_output: 8192,
    },
    {
      id: "mistral-small-latest",
      name: "Mistral Small 3.2",
      context_window: 128000,
      max_output: 8192,
    },
    {
      id: "pixtral-large-latest",
      name: "Pixtral Large",
      context_window: 128000,
      max_output: 8192,
    },
    {
      id: "pixtral-12b-2409",
      name: "Pixtral 12B",
      context_window: 128000,
      max_output: 8192,
    },
    {
      id: "ministral-8b-latest",
      name: "Ministral 8B",
      context_window: 128000,
      max_output: 8192,
    },
    {
      id: "ministral-3b-latest",
      name: "Ministral 3B",
      context_window: 128000,
      max_output: 8192,
    },
  ],
  xai: [
    {
      id: "grok-4.1",
      name: "Grok 4.1",
      context_window: 256000,
      max_output: 8192,
    },
    {
      id: "grok-4.1-fast",
      name: "Grok 4.1 Fast",
      context_window: 2000000,
      max_output: 8192,
    },
    { id: "grok-4", name: "Grok 4", context_window: 256000, max_output: 8192 },
    {
      id: "grok-4-fast",
      name: "Grok 4 Fast",
      context_window: 2000000,
      max_output: 8192,
    },
    { id: "grok-3", name: "Grok 3", context_window: 131072, max_output: 8192 },
    {
      id: "grok-3-mini",
      name: "Grok 3 Mini",
      context_window: 131072,
      max_output: 8192,
    },
    {
      id: "grok-2-vision-1212",
      name: "Grok 2 Vision",
      context_window: 32768,
      max_output: 8192,
    },
  ],
  together: [
    {
      id: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
      name: "Llama 4 Maverick",
      context_window: 131072,
      max_output: 8192,
    },
    {
      id: "meta-llama/Llama-4-Scout-17B-16E-Instruct",
      name: "Llama 4 Scout",
      context_window: 131072,
      max_output: 8192,
    },
    {
      id: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      name: "Llama 3.3 70B Turbo",
      context_window: 131072,
      max_output: 8192,
    },
    {
      id: "deepseek-ai/DeepSeek-R1",
      name: "DeepSeek R1",
      context_window: 128000,
      max_output: 8192,
    },
    {
      id: "deepseek-ai/DeepSeek-V3",
      name: "DeepSeek V3",
      context_window: 128000,
      max_output: 8192,
    },
    {
      id: "Qwen/Qwen2.5-72B-Instruct-Turbo",
      name: "Qwen 2.5 72B Turbo",
      context_window: 131072,
      max_output: 8192,
    },
    {
      id: "Qwen/Qwen3-235B-A22B-fp8-tput",
      name: "Qwen 3 235B",
      context_window: 262144,
      max_output: 8192,
    },
    {
      id: "deepseek-ai/DeepSeek-R1-Distill-Llama-70B",
      name: "DeepSeek R1 Distill 70B",
      context_window: 131072,
      max_output: 8192,
    },
    {
      id: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
      name: "Llama 3.1 405B Turbo",
      context_window: 131072,
      max_output: 4096,
    },
  ],
  openrouter: [
    {
      id: "anthropic/claude-fable-5",
      name: "Claude Fable 5 (via OpenRouter)",
      context_window: 1000000,
      max_output: 128000,
    },
    {
      id: "anthropic/claude-sonnet-5",
      name: "Claude Sonnet 5 (via OpenRouter)",
      context_window: 1000000,
      max_output: 128000,
    },
    {
      id: "anthropic/claude-opus-4-8",
      name: "Claude Opus 4.8 (via OpenRouter)",
      context_window: 1000000,
      max_output: 128000,
    },
    {
      id: "anthropic/claude-opus-4-6",
      name: "Claude Opus 4.6 (via OpenRouter)",
      context_window: 1000000,
      max_output: 128000,
    },
    {
      id: "anthropic/claude-sonnet-4-6",
      name: "Claude Sonnet 4.6 (via OpenRouter)",
      context_window: 1000000,
      max_output: 64000,
    },
    {
      id: "anthropic/claude-opus-4-5",
      name: "Claude Opus 4.5 (via OpenRouter)",
      context_window: 200000,
      max_output: 64000,
    },
    {
      id: "anthropic/claude-sonnet-4-5",
      name: "Claude Sonnet 4.5 (via OpenRouter)",
      context_window: 200000,
      max_output: 64000,
    },
    {
      id: "openai/gpt-5.4",
      name: "GPT-5.4 (via OpenRouter)",
      context_window: 1050000,
      max_output: 128000,
    },
    {
      id: "openai/gpt-5.3-codex",
      name: "GPT-5.3 Codex (via OpenRouter)",
      context_window: 400000,
      max_output: 128000,
    },
    {
      id: "openai/gpt-5.2",
      name: "GPT-5.2 (via OpenRouter)",
      context_window: 200000,
      max_output: 32768,
    },
    {
      id: "openai/gpt-4.1",
      name: "GPT-4.1 (via OpenRouter)",
      context_window: 1000000,
      max_output: 32768,
    },
    {
      id: "openai/gpt-4o",
      name: "GPT-4o (via OpenRouter)",
      context_window: 128000,
      max_output: 16384,
    },
    {
      id: "google/gemini-3.1-pro-preview",
      name: "Gemini 3.1 Pro (via OpenRouter)",
      context_window: 2000000,
      max_output: 65536,
    },
    {
      id: "google/gemini-3-flash-preview",
      name: "Gemini 3 Flash (via OpenRouter)",
      context_window: 1000000,
      max_output: 65536,
    },
    {
      id: "google/gemini-2.5-flash",
      name: "Gemini 2.5 Flash (via OpenRouter)",
      context_window: 1000000,
      max_output: 65536,
    },
    {
      id: "deepseek/deepseek-chat",
      name: "DeepSeek V3 (via OpenRouter)",
      context_window: 128000,
      max_output: 8192,
    },
    {
      id: "deepseek/deepseek-reasoner",
      name: "DeepSeek R1 (via OpenRouter)",
      context_window: 128000,
      max_output: 8192,
    },
    {
      id: "meta-llama/llama-4-maverick",
      name: "Llama 4 Maverick (via OpenRouter)",
      context_window: 131072,
      max_output: 8192,
    },
    {
      id: "meta-llama/llama-3.3-70b-instruct",
      name: "Llama 3.3 70B (via OpenRouter)",
      context_window: 131072,
      max_output: 8192,
    },
  ],
  deepseek: [
    {
      id: "deepseek-chat",
      name: "DeepSeek Chat (V3)",
      context_window: 128000,
      max_output: 8192,
    },
    {
      id: "deepseek-reasoner",
      name: "DeepSeek Reasoner (R1)",
      context_window: 128000,
      max_output: 8192,
    },
  ],
  fireworks: [
    {
      id: "accounts/fireworks/models/llama4-maverick-instruct-basic",
      name: "Llama 4 Maverick",
      context_window: 131072,
      max_output: 8192,
    },
    {
      id: "accounts/fireworks/models/llama4-scout-instruct-basic",
      name: "Llama 4 Scout",
      context_window: 131072,
      max_output: 8192,
    },
    {
      id: "accounts/fireworks/models/llama-v3p3-70b-instruct",
      name: "Llama 3.3 70B",
      context_window: 131072,
      max_output: 8192,
    },
    {
      id: "accounts/fireworks/models/deepseek-v3",
      name: "DeepSeek V3",
      context_window: 128000,
      max_output: 8192,
    },
    {
      id: "accounts/fireworks/models/deepseek-r1",
      name: "DeepSeek R1",
      context_window: 128000,
      max_output: 8192,
    },
    {
      id: "accounts/fireworks/models/qwen2p5-72b-instruct",
      name: "Qwen 2.5 72B",
      context_window: 131072,
      max_output: 8192,
    },
    {
      id: "accounts/fireworks/models/qwen3-235b-a22b",
      name: "Qwen 3 235B",
      context_window: 131072,
      max_output: 8192,
    },
  ],
  perplexity: [
    {
      id: "sonar-pro",
      name: "Sonar Pro (Search)",
      context_window: 200000,
      max_output: 8192,
    },
    {
      id: "sonar",
      name: "Sonar (Search)",
      context_window: 128000,
      max_output: 8192,
    },
    {
      id: "sonar-reasoning-pro",
      name: "Sonar Reasoning Pro",
      context_window: 128000,
      max_output: 8192,
    },
    {
      id: "sonar-reasoning",
      name: "Sonar Reasoning",
      context_window: 128000,
      max_output: 8192,
    },
    {
      id: "sonar-deep-research",
      name: "Sonar Deep Research",
      context_window: 128000,
      max_output: 8192,
    },
  ],
};

function mergeModels(
  dynamicModels: AvailableModel[],
  staticModels: AvailableModel[],
): AvailableModel[] {
  const modelMap = new Map<string, AvailableModel>();

  for (const model of staticModels) {
    modelMap.set(model.id, model);
  }

  for (const model of dynamicModels) {
    modelMap.set(model.id, model);
  }

  return Array.from(modelMap.values());
}

const PIN_MODELS_CACHE_KEY = "pin_models_cache";
const PIN_MODELS_CACHE_TTL = 60000;

interface PinModelsCache {
  models: AvailableModel[];
  timestamp: number;
}

function getPinModelsFromCache(): AvailableModel[] | null {
  try {
    const cached = localStorage.getItem(PIN_MODELS_CACHE_KEY);
    if (!cached) return null;
    const data: PinModelsCache = JSON.parse(cached);
    if (Date.now() - data.timestamp > PIN_MODELS_CACHE_TTL) {
      localStorage.removeItem(PIN_MODELS_CACHE_KEY);
      return null;
    }
    return data.models;
  } catch {
    return null;
  }
}

function setPinModelsCache(models: AvailableModel[]) {
  try {
    localStorage.setItem(
      PIN_MODELS_CACHE_KEY,
      JSON.stringify({
        models,
        timestamp: Date.now(),
      }),
    );
  } catch {}
}

async function fetchPinModels(): Promise<AvailableModel[]> {
  const cached = getPinModelsFromCache();
  if (cached && cached.length > 0) return cached;

  try {
    const res = await apiFetch("/v1/pin/network/models");
    if (!res.ok) return [];

    const data = await res.json();
    const models: AvailableModel[] = (data.models || []).map(
      (modelId: string) => ({
        id: modelId,
        name: modelId,
        context_window: 128000,
        max_output: 8192,
      }),
    );

    if (models.length > 0) {
      setPinModelsCache(models);
    }
    return models;
  } catch {
    return [];
  }
}

export function useAvailableModels(): UseAvailableModelsResult {
  const [models, setModels] = useState<AvailableModel[]>([]);
  const [provider, setProvider] = useState<string>("groq");
  const [providers, setProviders] = useState<ProviderWithModels[]>([]);
  const [allModels, setAllModels] = useState<AvailableModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await apiFetch("/api/providers/all");

      if (!res.ok) {
        throw new Error("Failed to fetch providers.");
      }

      const data = await res.json();
      const defaultProvider = data.default_provider || "groq";
      const providerList: ProviderWithModels[] = (data.providers || []).map(
        (p: any) => {
          const staticModels = KNOWN_MODELS[p.id] || [];
          const serverModels: AvailableModel[] = (p.models || []).map(
            (m: any) => ({
              id: m.id || m.name,
              name: m.name || m.id,
              context_window: m.context_window,
              max_output: m.max_output,
              reasoning_efforts: m.reasoning_efforts || undefined,
              default_reasoning_effort: m.default_reasoning_effort || undefined,
            }),
          );
          return {
            id: p.id,
            name: p.name,
            is_default: p.is_default,
            models: mergeModels(serverModels, staticModels),
          };
        },
      );

      if (providerList.some((p: ProviderWithModels) => p.id === "pin")) {
        const pinModels = await fetchPinModels();
        const pinProvider = providerList.find(
          (p: ProviderWithModels) => p.id === "pin",
        );
        if (pinProvider) {
          pinProvider.models = pinModels;
        }
      }

      setProviders(providerList);

      const defaultP =
        providerList.find((p: ProviderWithModels) => p.is_default) ||
        providerList[0];
      if (defaultP) {
        setProvider(defaultP.id);
        setModels(defaultP.models);
      }

      const all = providerList.flatMap((p: ProviderWithModels) => p.models);
      setAllModels(all);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to load models.";
      setError(errorMessage);
      setModels(KNOWN_MODELS.groq);
      setProviders([
        {
          id: "groq",
          name: "Groq",
          is_default: true,
          models: KNOWN_MODELS.groq,
        },
      ]);
      setAllModels(KNOWN_MODELS.groq);
    } finally {
      setIsLoading(false);
    }
  };

  const getModelsForProvider = (providerId: string): AvailableModel[] => {
    const p = providers.find((p) => p.id === providerId);
    if (p) return p.models;
    return KNOWN_MODELS[providerId] || [];
  };

  useEffect(() => {
    fetchModels();
  }, []);

  return {
    models,
    provider,
    providers,
    allModels,
    isLoading,
    error,
    refetch: fetchModels,
    getModelsForProvider,
  };
}
