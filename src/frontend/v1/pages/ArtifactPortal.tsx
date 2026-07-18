import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Send, Bot, User, Cpu, Rocket, Download, Play,
  FileCode2, Sparkles, Loader2, ChevronDown, Globe, ScanSearch,
  Copy, Check, Terminal, Braces, Package, Zap, AlertCircle,
  History, Clock, Trash2, Eye, ChevronRight
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAvailableModels } from "../hooks/use-available-models";
import aiasLogo from "../assets/logo.png";
import { apiFetch } from "@/lib/queryClient";

interface ArtifactDetails {
  agentId: string;
  status: "generating" | "ready" | "deployed";
  targetStack: string;
  sourceCode: string;
  description: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ArtifactHistoryItem {
  id: string;
  name: string;
  prompt: string;
  target_stack: string;
  provider: string;
  model: string;
  status: string;
  deployed_agent_id: string;
  created_at: string;
}

const EXAMPLE_PROMPTS = [
  { icon: "🕷️", label: "Web Scraper", text: "A Python web scraper that extracts news headlines from specific URLs, cleans the text, and saves it to a structured CSV file every 24 hours" },
  { icon: "🎧", label: "Support Agent", text: "A customer support agent that handles refund requests, checks order status, and escalates complex issues to human agents" },
  { icon: "📚", label: "Research Agent", text: "A research agent that monitors arxiv.org for new papers in machine learning, summarizes findings, and sends weekly digest emails" },
  { icon: "🔍", label: "Code Reviewer", text: "A code review agent that analyzes pull requests, identifies bugs and security issues, and suggests improvements with inline comments" },
  { icon: "📧", label: "Email Outreach", text: "A cold email outreach agent that personalizes emails based on prospect LinkedIn data, sends follow-ups on a schedule, and tracks open rates" },
  { icon: "📊", label: "SEO Analyzer", text: "An SEO audit agent that crawls a website, checks meta tags, page speed, broken links, and keyword density, then generates an actionable report" },
  { icon: "🛡️", label: "Security Scanner", text: "A security scanner agent that checks API endpoints for common vulnerabilities like SQL injection, XSS, and CORS misconfigurations" },
  { icon: "💬", label: "Slack Bot", text: "A Slack bot agent that summarizes long threads, answers FAQs from a knowledge base, and creates Jira tickets from conversations" },
  { icon: "📈", label: "Stock Tracker", text: "A stock monitoring agent that tracks price movements, detects unusual volume, and sends alerts when user-defined thresholds are crossed" },
  { icon: "🌐", label: "API Gateway", text: "An API aggregation agent that combines data from multiple REST APIs, normalizes the response format, and caches results with configurable TTL" },
  { icon: "📝", label: "Content Writer", text: "A blog content agent that generates SEO-optimized articles from a topic and keywords, includes internal linking suggestions, and outputs markdown" },
  { icon: "🤖", label: "Discord Moderator", text: "A Discord moderation bot that detects toxic messages, warns users, auto-mutes repeat offenders, and logs incidents to a dashboard" },
  { icon: "📋", label: "Meeting Notes", text: "A meeting summarizer agent that takes raw transcript text, extracts action items, decisions, and owners, and formats them into structured notes" },
  { icon: "🔄", label: "Data Pipeline", text: "A data pipeline agent that extracts records from a PostgreSQL database, transforms and cleans them, then loads into a data warehouse on a schedule" },
  { icon: "💳", label: "Invoice Agent", text: "An invoice processing agent that reads PDF invoices via OCR, extracts line items and totals, validates against POs, and flags discrepancies" },
  { icon: "🧪", label: "Test Generator", text: "A test generation agent that reads source code files, identifies untested functions, and generates unit tests with edge cases and mocks" },
  { icon: "📱", label: "Social Listener", text: "A social media monitoring agent that tracks brand mentions across Twitter, Reddit, and HackerNews, performs sentiment analysis, and sends daily digests" },
  { icon: "🗂️", label: "Doc Classifier", text: "A document classification agent that ingests files from a folder, categorizes them by type and topic using NLP, and organizes them into labeled directories" },
  { icon: "🚀", label: "Churn Predictor", text: "A churn prediction agent that analyzes user login frequency, feature usage, and support tickets to score accounts by churn risk and trigger re-engagement emails" },
  { icon: "💡", label: "Feature Request Ranker", text: "A feature request agent that pulls feedback from Canny, Intercom, and support emails, groups duplicates, scores by revenue impact, and outputs a prioritized roadmap" },
  { icon: "📣", label: "Launch Announcer", text: "A product launch agent that drafts Product Hunt copy, generates social media threads, writes changelog entries, and schedules announcement emails for new feature releases" },
  { icon: "💰", label: "MRR Dashboard", text: "An MRR tracking agent that connects to Stripe, calculates monthly recurring revenue, net new vs churned, and generates a weekly founder metrics digest with trend alerts" },
];

export default function ArtifactPortal() {
  const { models: availableModels, provider: modelProvider, providers, isLoading: modelsLoading } = useAvailableModels();
  const [selectedProvider, setSelectedProvider] = useState(modelProvider);
  const [selectedModel, setSelectedModel] = useState("");
  const [agentName, setAgentName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState(0);
  const [artifact, setArtifact] = useState<ArtifactDetails | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedAgentId, setDeployedAgentId] = useState<string | null>(null);
  const [metadataStatus, setMetadataStatus] = useState<"idle" | "loading" | "done" | "failed">("idle");
  const [artifactHistory, setArtifactHistory] = useState<ArtifactHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentArtifactId, setCurrentArtifactId] = useState<string | null>(null);
  const [streamingCode, setStreamingCode] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const codeViewerRef = useRef<HTMLDivElement>(null);

  const currentProviderModels = providers.find(p => p.id === selectedProvider)?.models || availableModels;

  useEffect(() => {
    if (modelProvider && !selectedProvider) {
      setSelectedProvider(modelProvider);
    }
  }, [modelProvider]);

  useEffect(() => {
    if (currentProviderModels.length > 0 && !currentProviderModels.some(m => m.id === selectedModel)) {
      setSelectedModel(currentProviderModels[0].id);
    }
    setSessionId(null);
  }, [selectedProvider, currentProviderModels]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await apiFetch("/api/artifacts");
      if (res.ok) {
        const data = await res.json();
        setArtifactHistory(data.artifacts || []);
      }
    } catch {} finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  const loadArtifactFromHistory = async (id: string) => {
    try {
      const res = await apiFetch(`/api/artifacts/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setAgentName(data.name || "");
      setPrompt(data.prompt || "");
      setArtifact({
        agentId: `${data.name}-v1.0`,
        status: data.deployed_agent_id ? "deployed" : "ready",
        targetStack: data.target_stack || "",
        sourceCode: data.source_code || "",
        description: data.prompt || "",
      });
      setChatMessages(data.chat_messages || []);
      setSessionId(data.session_id || null);
      setCurrentArtifactId(id);
      setDeployedAgentId(data.deployed_agent_id || null);
      setShowHistory(false);
    } catch {}
  };

  const deleteArtifact = async (id: string) => {
    try {
      const res = await apiFetch(`/api/artifacts/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setArtifactHistory(prev => prev.filter(a => a.id !== id));
      if (currentArtifactId === id) {
        setCurrentArtifactId(null);
        setArtifact(null);
        setChatMessages([]);
        setPrompt("");
        setAgentName("");
      }
    } catch {}
  };

  const saveArtifact = async (artifactData: {
    name: string; prompt: string; source_code: string; target_stack: string;
    provider: string; model: string; session_id: string; chat_messages: ChatMessage[];
  }) => {
    try {
      const res = await apiFetch("/api/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...artifactData, description: artifactData.prompt })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentArtifactId(data.id);
        loadHistory();
        return data.id;
      }
    } catch {}
    return null;
  };

  const createSession = async () => {
    try {
      const modelInfo = currentProviderModels.find(m => m.id === selectedModel);
      const maxTokens = modelInfo?.max_output || 4096;
      const res = await apiFetch("/api/playground/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Artifact Generator",
          model_provider: selectedProvider,
          model_name: selectedModel,
          temperature: 0.5,
          max_tokens: maxTokens,
          persona: `You are an expert AI agent architect on the AiAS (AiAssist Secure) platform. You build programmable AI agents — not standard scripts or plain programs.

AGENTIC ARCHITECTURE — every agent you generate MUST include:
1. **Event loop or scheduler** — agents run continuously or on a cron, not just once. Use asyncio event loops, APScheduler, or schedule library.
2. **LLM reasoning core** — agents MUST call the AiAS API for decision-making, NOT hardcoded if/else:
   - POST https://api.aiassist.net/v1/chat/completions
   - Headers: Authorization: Bearer {AIAS_API_KEY}, X-Agent-Id: {AGENT_ID}, X-AiAssist-Provider: {PROVIDER}
   - The X-AiAssist-Provider header routes to the user's configured provider (e.g. "groq", "openai", "anthropic", "gemini", "mistral"). Read from env var AIAS_PROVIDER, default "groq".
   - Body: { "messages": [...], "model": "auto" }
3. **Tool/action layer** — agents take real actions based on LLM decisions: call APIs, send alerts, write data, transform content.
4. **Memory via AiAS Workspaces** — agents store and retrieve state through the AiAS workspace API. NO external databases, NO Redis, NO setup required:
   - POST https://api.aiassist.net/api/workspaces/{WORKSPACE_ID}/messages — save agent output/state as messages
   - GET https://api.aiassist.net/api/workspaces/{WORKSPACE_ID}/messages — retrieve previous state/history
   - POST https://api.aiassist.net/api/workspaces/{WORKSPACE_ID}/memory/facts — store key facts the agent learned
   - GET https://api.aiassist.net/api/workspaces/{WORKSPACE_ID}/memory/facts — recall stored facts
   - All workspace calls use the same Authorization: Bearer {AIAS_API_KEY} header
   - For lightweight local caching only, use SQLite (zero setup, built into Python) — never require the user to install or configure a database
5. **Structured I/O** — agents accept input (webhooks, API params, file watches) and produce structured output (JSON logs, webhook callbacks, status reports).

ZERO-SETUP PHILOSOPHY — users should run the agent with ONLY:
  pip install requests (or httpx) and python agent.py
- NO Docker, NO Redis, NO Postgres, NO external services to configure
- ALL persistence goes through AiAS workspaces or local SQLite (stdlib)
- Only standard library + requests/httpx as dependencies. If absolutely needed, keep pip installs to 1-2 common packages
- Environment variables: AIAS_API_KEY (required), WORKSPACE_ID (required — the user's workspace), AGENT_ID (from deploy), AIAS_PROVIDER (default: "groq" — the user's BYOK provider)

CODE REQUIREMENTS:
- Output the FULL source code in a single code block — no pseudocode, no placeholders
- All config via environment variables with sensible defaults
- Structured logging with Python logging module
- Graceful shutdown (SIGTERM/SIGINT)
- Exponential backoff on API calls
- Clear docstring: what it does, env vars needed, how to run

After generating, briefly explain: the agent's loop, when it calls the LLM, how it uses the workspace for memory, and the one-liner to run it.`
        })
      });
      if (res.ok) {
        const session = await res.json();
        return session.id;
      }
      return null;
    } catch {
      return null;
    }
  };

  const populateSessionMetadata = async (sid: string, agentPrompt: string) => {
    setMetadataStatus("loading");
    try {
      const tempSession = await createSession();
      if (!tempSession) throw new Error("No temp session");

      const metaRes = await apiFetch(`/api/playground/sessions/${tempSession}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-AiAssist-Provider": selectedProvider },
        body: JSON.stringify({
          message: `An AI agent was just generated for this use case: "${agentPrompt}"

Produce ONLY a valid JSON object (no markdown fences, no explanation) with this exact structure:
{
  "directives": [
    { "content": "...", "directive_type": "guidance", "priority": 5 }
  ],
  "knowledge_items": [
    { "title": "...", "content": "...", "category": "product" }
  ]
}
Generate 3-5 directives covering: the agent's communication tone, key behavioral guidelines, operational constraints, and domain context. Use directive_type values from: guidance, tone, context, constraint.
Generate 2-3 knowledge base items covering: what the agent does, its capabilities, and usage instructions. Use category values from: product, faq, custom.
Output ONLY valid JSON.`,
          web_tool: "none"
        })
      });
      if (!metaRes.ok) throw new Error("Metadata call failed");
      const metaData = await metaRes.json();
      const metaContent = metaData.message?.content || "";
      const jsonMatch = metaContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      const parsed = JSON.parse(jsonMatch[0]);

      let dSuccess = 0;
      let kSuccess = 0;

      for (const d of (parsed.directives || [])) {
        try {
          const r = await apiFetch(`/api/playground/sessions/${sid}/directives`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: d.content,
              directive_type: d.directive_type || "context",
              priority: d.priority || 5,
            })
          });
          if (r.ok) dSuccess++;
        } catch {}
      }

      for (const k of (parsed.knowledge_items || [])) {
        try {
          const r = await apiFetch(`/api/playground/sessions/${sid}/knowledge`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: k.title,
              content: k.content,
              category: k.category || "custom",
            })
          });
          if (r.ok) kSuccess++;
        } catch {}
      }

      setMetadataStatus("done");
      setChatMessages(prev => [...prev, {
        id: `meta-${Date.now()}`,
        role: "assistant",
        content: `Agent configuration loaded: **${dSuccess} directives** and **${kSuccess} knowledge base items** added. These will be included when you deploy.`,
        timestamp: new Date().toISOString()
      }]);
    } catch {
      setMetadataStatus("failed");
      setChatMessages(prev => [...prev, {
        id: `meta-${Date.now()}`,
        role: "assistant",
        content: "⚠️ Could not auto-generate directives and knowledge base. You can still deploy — add them manually from the Deployed Agents page.",
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !agentName.trim() || isGenerating) return;
    setIsGenerating(true);
    setGenerationStage(0);
    setArtifact(null);
    setError(null);
    setDeployedAgentId(null);
    setCurrentArtifactId(null);
    setMetadataStatus("idle");
    setStreamingCode("");

    const stageTimer = setInterval(() => {
      setGenerationStage(prev => Math.min(prev + 1, 4));
    }, 3000);

    try {
      let sid = sessionId;
      if (!sid) {
        sid = await createSession();
        if (!sid) throw new Error("Failed to create session");
        setSessionId(sid);
      }

      const displayName = agentName.trim().replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-");
      const userPromptMsg: ChatMessage = { id: "1", role: "user", content: prompt, timestamp: new Date().toISOString() };
      setChatMessages([userPromptMsg]);
      setStreamingCode("");

      const streamRes = await apiFetch(`/api/playground/sessions/${sid}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AiAssist-Provider": selectedProvider
        },
        body: JSON.stringify({
          message: `Generate a complete, production-ready programmable AI agent for the following use case. Output the FULL working source code. Include all imports, configuration, error handling, and a main entry point.\n\nYou MUST wrap code using these markers — code outside markers will be IGNORED:\n<<<FILE agent.py>>>\nyour complete code here\n<<<END>>>\n\nDo NOT use markdown code fences. Use <<<FILE>>> and <<<END>>> ONLY. Keep explanation to 1-2 sentences, then write the code block.\n\nUse case: ${prompt}`,
          web_tool: "none"
        })
      });

      if (!streamRes.ok) throw new Error("Generation failed");

      const reader = streamRes.body?.getReader();
      if (!reader) throw new Error("No stream reader");
      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === "chunk" && evt.content) {
              fullContent += evt.content;
              const fileMarkerMatch = fullContent.match(/<<<FILE\s+[^>]+>>>\n?([\s\S]*?)(?:<<<END>>>|$)/);
              const fenceMatch = !fileMarkerMatch ? fullContent.match(/```[\w]*\n([\s\S]*?)(?:```|$)/) : null;
              const extracted = fileMarkerMatch ? fileMarkerMatch[1] : fenceMatch ? fenceMatch[1] : null;
              if (extracted) {
                setStreamingCode(extracted);
                if (codeViewerRef.current) {
                  codeViewerRef.current.scrollTop = codeViewerRef.current.scrollHeight;
                }
              }
            } else if (evt.type === "error") {
              throw new Error(evt.detail || "Stream error");
            }
          } catch (parseErr: any) {
            if (parseErr.message === "Stream error" || parseErr.message?.includes("Stream")) throw parseErr;
          }
        }
      }

      const content = fullContent;
      const fileMarkerFinal = content.match(/<<<FILE\s+[^>]+>>>\n?([\s\S]*?)<<<END>>>/);
      const codeFenceFinal = !fileMarkerFinal ? content.match(/```[\w]*\n([\s\S]*?)```/) : null;
      const sourceCode = fileMarkerFinal ? fileMarkerFinal[1].trim() : codeFenceFinal ? codeFenceFinal[1].trim() : content;
      const detectedStack = detectStack(sourceCode);

      setArtifact({
        agentId: `${displayName}-v1.0`,
        status: "ready",
        targetStack: detectedStack,
        sourceCode,
        description: prompt.trim(),
      });

      const initialMessages: ChatMessage[] = [
        userPromptMsg,
        { id: "2", role: "assistant", content, timestamp: new Date().toISOString() },
      ];
      setChatMessages(initialMessages);

      await saveArtifact({
        name: displayName,
        prompt,
        source_code: sourceCode,
        target_stack: detectedStack,
        provider: selectedProvider,
        model: selectedModel,
        session_id: sid,
        chat_messages: initialMessages,
      });

      populateSessionMetadata(sid, prompt);
    } catch (err: any) {
      console.error("Generation failed:", err);
      setError("Generation failed. Try a different model or check your provider API key.");
    } finally {
      clearInterval(stageTimer);
      setIsGenerating(false);
      setGenerationStage(0);
      setStreamingCode("");
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || isChatting || !sessionId) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsChatting(true);

    try {
      const res = await apiFetch(`/api/playground/sessions/${sessionId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AiAssist-Provider": selectedProvider
        },
        body: JSON.stringify({ message: chatInput, web_tool: "none" })
      });

      if (res.ok) {
        const chatResponse = await res.json();
        const assistantMsg = chatResponse.message;
        if (assistantMsg) {
          setChatMessages(prev => [...prev, {
            id: assistantMsg.id || Date.now().toString(),
            role: "assistant",
            content: assistantMsg.content,
            timestamp: assistantMsg.timestamp || new Date().toISOString()
          }]);

          const codeMatch = assistantMsg.content.match(/```[\w]*\n([\s\S]*?)```/);
          if (codeMatch) {
            setArtifact(prev => prev ? {
              ...prev,
              sourceCode: codeMatch[1].trim(),
              status: "ready",
              targetStack: detectStack(codeMatch[1])
            } : prev);
          }
        }
      } else {
        const errBody = await res.json().catch(() => null);
        const detail = errBody?.detail || "Request failed — your provider may be rate-limited. Wait a moment and try again.";
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: "assistant",
          content: `⚠️ ${detail}`,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: "⚠️ Request failed — check your connection and try again.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsChatting(false);
      if (currentArtifactId) {
        setChatMessages(latest => {
          apiFetch(`/api/artifacts/${currentArtifactId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_messages: latest })
          }).catch(() => {});
          return latest;
        });
      }
    }
  };

  const detectStack = (code: string): string => {
    const indicators: Record<string, string[]> = {
      "Python (Requests, BeautifulSoup)": ["import requests", "from bs4", "BeautifulSoup"],
      "Python (FastAPI, Pydantic)": ["from fastapi", "FastAPI()", "pydantic"],
      "Python (LangChain)": ["from langchain", "LangChain"],
      "Python (OpenAI SDK)": ["from openai", "import openai"],
      "Python (Standard Library)": ["import os", "import sys", "import json"],
      "TypeScript (Node.js)": ["import {", "from '", "export default"],
      "JavaScript (Node.js)": ["require(", "module.exports", "const express"],
      "Rust": ["fn main()", "use std::"],
    };
    for (const [stack, patterns] of Object.entries(indicators)) {
      if (patterns.some(p => code.includes(p))) return stack;
    }
    return "Python";
  };

  const handleCopy = () => {
    if (artifact?.sourceCode) {
      navigator.clipboard.writeText(artifact.sourceCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!artifact) return;
    const ext = artifact.targetStack.toLowerCase().includes("python") ? ".py"
      : artifact.targetStack.toLowerCase().includes("typescript") ? ".ts"
      : artifact.targetStack.toLowerCase().includes("rust") ? ".rs" : ".js";
    const blob = new Blob([artifact.sourceCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.agentId}${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stageLabels = [
    "Initializing agent framework...",
    "Analyzing use case requirements...",
    "Designing agent architecture...",
    "Writing production code...",
    "Finalizing & packaging...",
  ];

  const stageIcons = ["🧠", "🔍", "📐", "⚡", "✨"];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <nav className="border-b border-white/10 bg-black/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* V2 EDIT (Mark): back-to-dashboard link removed — this page
                lives inside an AiOS window; the window chrome is the nav. */}
            <div className="flex items-center gap-2">
              <img src={aiasLogo} alt="AiAS" className="w-8 h-8 rounded-lg object-cover" />
              <div>
                <h1 className="font-bold text-sm sm:text-base">Artifact Generator</h1>
                <p className="text-[10px] text-white/40 hidden sm:block">Programmable AI Agents</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadHistory(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                showHistory ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30" : "bg-white/5 border border-white/10 hover:bg-white/10"
              }`}
              data-testid="button-toggle-history"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">History</span>
              {artifactHistory.length > 0 && (
                <span className="bg-white/10 text-white/60 px-1.5 py-0.5 rounded-full text-[10px] leading-none">{artifactHistory.length}</span>
              )}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs hover:bg-white/10 transition-colors"
                data-testid="button-provider-select"
              >
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">{providers.find(p => p.id === selectedProvider)?.name || selectedProvider}</span>
                <span className="text-white/40">•</span>
                <span className="text-cyan-400 max-w-[120px] truncate">{currentProviderModels.find(m => m.id === selectedModel)?.name || selectedModel}</span>
                <ChevronDown className="w-3 h-3 text-white/40" />
              </button>

              <AnimatePresence>
                {showProviderDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-72 bg-[#14141f] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="p-3 border-b border-white/5">
                      <label className="text-[10px] uppercase tracking-wider text-white/30 mb-1.5 block">Provider</label>
                      <div className="flex flex-wrap gap-1">
                        {providers.map(p => (
                          <button
                            key={p.id}
                            onClick={() => setSelectedProvider(p.id)}
                            className={`px-2 py-1 text-xs rounded-md transition-colors ${
                              selectedProvider === p.id
                                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                : "bg-white/5 text-white/60 hover:bg-white/10 border border-transparent"
                            }`}
                            data-testid={`button-provider-${p.id}`}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="p-3 max-h-48 overflow-y-auto">
                      <label className="text-[10px] uppercase tracking-wider text-white/30 mb-1.5 block">Model</label>
                      <div className="space-y-1">
                        {currentProviderModels.map(m => (
                          <button
                            key={m.id}
                            onClick={() => { setSelectedModel(m.id); setShowProviderDropdown(false); }}
                            className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                              selectedModel === m.id
                                ? "bg-cyan-500/15 text-cyan-300"
                                : "text-white/60 hover:bg-white/5 hover:text-white"
                            }`}
                            data-testid={`button-model-${m.id}`}
                          >
                            {m.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      {showProviderDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setShowProviderDropdown(false)} />
      )}

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
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 z-50 flex flex-col"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <History className="w-4 h-4 text-cyan-400" />
                  Artifact History
                </h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-white/40 hover:text-white transition-colors text-sm"
                  data-testid="button-close-history"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                  </div>
                ) : artifactHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <FileCode2 className="w-10 h-10 text-white/10 mx-auto mb-3" />
                    <p className="text-sm text-white/30">No artifacts yet</p>
                    <p className="text-xs text-white/20 mt-1">Generate your first agent to see it here</p>
                  </div>
                ) : (
                  artifactHistory.map(item => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-xl border transition-colors cursor-pointer group ${
                        currentArtifactId === item.id
                          ? "bg-cyan-500/10 border-cyan-500/30"
                          : "bg-white/[0.03] border-white/5 hover:border-white/15"
                      }`}
                      data-testid={`history-item-${item.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0" onClick={() => loadArtifactFromHistory(item.id)}>
                          <p className="text-sm font-medium text-white truncate">{item.name}-v1.0</p>
                          <p className="text-xs text-white/40 mt-1 line-clamp-2">{item.prompt}</p>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30">
                            <span className="flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              {item.target_stack || "Unknown"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(item.created_at).toLocaleDateString()}
                            </span>
                            {item.deployed_agent_id && (
                              <span className="flex items-center gap-1 text-emerald-400/60">
                                <Rocket className="w-3 h-3" />
                                Deployed
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); loadArtifactFromHistory(item.id); }}
                            className="p-1.5 text-white/30 hover:text-cyan-400 transition-colors"
                            title="Load artifact"
                            data-testid={`button-load-artifact-${item.id}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteArtifact(item.id); }}
                            className="p-1.5 text-white/30 hover:text-red-400 transition-colors"
                            title="Delete artifact"
                            data-testid={`button-delete-artifact-${item.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {!artifact && !isGenerating && chatMessages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <div className="text-center mb-8">
              <motion.div
                className="w-16 h-16 mx-auto mb-4 rounded-2xl overflow-hidden"
                animate={{ boxShadow: ["0 0 20px rgba(6,182,212,0.1)", "0 0 40px rgba(6,182,212,0.3)", "0 0 20px rgba(6,182,212,0.1)"] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <img src={aiasLogo} alt="AiAS" className="w-full h-full object-cover" />
              </motion.div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent" data-testid="text-portal-title">
                Prompt & Artifact Generator
              </h2>
              <p className="text-white/50 text-sm sm:text-base">
                Create support agents, research agents, internal copilots, workflow agents, and more.
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 sm:p-6 mb-6">
              <div className="mb-4">
                <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Agent Name</label>
                <input
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="e.g., News-Scraper, Code-Reviewer, Support-Bot"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 outline-none focus:border-cyan-500/30 transition-colors text-sm sm:text-base"
                  data-testid="input-agent-name"
                />
              </div>
              <label className="text-xs text-white/40 uppercase tracking-wider mb-3 block">Agent Prompt</label>
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
                placeholder="e.g., A Python web scraper that extracts news headlines from specific URLs, cleans the text, and saves it to a structured CSV file every 24 hours"
                className="w-full bg-transparent border-none outline-none text-white placeholder-white/20 resize-none text-sm sm:text-base min-h-[80px]"
                rows={3}
                data-testid="textarea-agent-prompt"
              />
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-xs text-white/30">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Shift+Enter for new line</span>
                </div>
                <motion.button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || !agentName.trim() || isGenerating}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  data-testid="button-generate-agent"
                >
                  <Zap className="w-4 h-4" />
                  Generate Programmable Agent
                </motion.button>
              </div>
            </div>

            <div className="relative overflow-hidden mt-2 -mx-4 sm:-mx-6 space-y-3">
              <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#0a0a0f] to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#0a0a0f] to-transparent z-10 pointer-events-none" />

              {[0, 1, 2].map(row => {
                const rowSize = Math.ceil(EXAMPLE_PROMPTS.length / 3);
                const rowItems = EXAMPLE_PROMPTS.slice(row * rowSize, (row + 1) * rowSize);
                const doubled = [...rowItems, ...rowItems];
                const isReverse = row === 1;
                return (
                  <div
                    key={row}
                    className={`flex gap-3 ${isReverse ? "animate-marquee-reverse" : "animate-marquee"} hover:[animation-play-state:paused]`}
                    style={{ width: "max-content" }}
                  >
                    {doubled.map((ex, i) => (
                      <button
                        key={`${row}-${i}`}
                        onClick={() => setPrompt(ex.text)}
                        className="flex-shrink-0 w-60 sm:w-68 text-left p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs text-white/40 hover:text-white/70 hover:border-cyan-500/20 hover:bg-cyan-500/5 transition-all group"
                        data-testid={`button-example-prompt-${row * rowSize + (i % rowItems.length)}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">{ex.icon}</span>
                          <span className="text-white/70 font-medium text-[11px] group-hover:text-cyan-400 transition-colors">{ex.label}</span>
                        </div>
                        <p className="line-clamp-2 leading-relaxed text-[11px]">{ex.text}</p>
                      </button>
                    ))}
                  </div>
                );
              })}

              <style>{`
                @keyframes marquee {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-50%); }
                }
                @keyframes marquee-reverse {
                  0% { transform: translateX(-50%); }
                  100% { transform: translateX(0); }
                }
                .animate-marquee {
                  animation: marquee 60s linear infinite;
                }
                .animate-marquee-reverse {
                  animation: marquee-reverse 70s linear infinite;
                }
              `}</style>
            </div>
          </motion.div>
        )}

        {isGenerating && !artifact && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 flex flex-col">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col h-[calc(100vh-200px)] min-h-[500px]"
              >
                <div className="p-4 border-b border-white/5 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium">Agent Architect</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full ml-auto">
                    {providers.find(p => p.id === selectedProvider)?.name} • {currentProviderModels.find(m => m.id === selectedModel)?.name || selectedModel}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                    >
                      {msg.role === "user" && (
                        <div className="max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed bg-cyan-500/10 border border-cyan-500/20 text-white">
                          <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                        </div>
                      )}
                      {msg.role === "user" && (
                        <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                          <User className="w-3.5 h-3.5 text-purple-400" />
                        </div>
                      )}
                    </motion.div>
                  ))}

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                  >
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="flex-1 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
                      <div className="space-y-3">
                        {stageLabels.map((label, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: i <= generationStage ? 1 : 0.2, x: 0 }}
                            transition={{ delay: i * 0.1, duration: 0.3 }}
                            className="flex items-center gap-2.5"
                          >
                            <span className="text-base">{stageIcons[i]}</span>
                            <span className={`text-sm transition-colors duration-500 ${
                              i < generationStage ? "text-emerald-400" : i === generationStage ? "text-cyan-300" : "text-white/20"
                            }`}>
                              {i < generationStage ? label.replace("...", " ✓") : label}
                            </span>
                            {i === generationStage && (
                              <motion.div
                                className="flex gap-1 ml-1"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                              >
                                <motion.div className="w-1 h-1 bg-cyan-400 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} />
                                <motion.div className="w-1 h-1 bg-cyan-400 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} />
                                <motion.div className="w-1 h-1 bg-cyan-400 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
                              </motion.div>
                            )}
                          </motion.div>
                        ))}
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5">
                        <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full"
                            initial={{ width: "5%" }}
                            animate={{ width: `${20 + generationStage * 20}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>

            <div className="lg:col-span-3">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden h-[calc(100vh-200px)] min-h-[500px] flex flex-col"
              >
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs text-white/50">Live Preview</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.div
                      className="w-1.5 h-1.5 bg-cyan-400 rounded-full"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="text-[10px] text-cyan-400/70 uppercase tracking-wider font-medium">Coding Live</span>
                  </div>
                </div>
                <div ref={codeViewerRef} className="flex-1 overflow-y-auto p-4" data-testid="code-streaming-viewer">
                  <pre className="text-xs text-cyan-300/80 font-mono leading-relaxed whitespace-pre-wrap">
                    {streamingCode || (
                      <span className="text-white/20 italic">Waiting for code output...</span>
                    )}
                    <motion.span
                      className="inline-block w-1.5 h-3.5 bg-cyan-400 ml-0.5 align-middle"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                  </pre>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {error && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto mb-6"
          >
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-sm text-red-300 mb-4" data-testid="text-generation-error">{error}</p>
              <button
                onClick={() => { setError(null); setSessionId(null); }}
                className="px-4 py-2 text-sm bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                data-testid="button-try-again"
              >
                Try Again
              </button>
            </div>
          </motion.div>
        )}

        {(artifact || chatMessages.length > 0) && !isGenerating && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 flex flex-col">
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
                <div className="p-4 border-b border-white/5 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium">Agent Architect</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full ml-auto">
                    {providers.find(p => p.id === selectedProvider)?.name} • {currentProviderModels.find(m => m.id === selectedModel)?.name || selectedModel}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
                      )}
                      <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-cyan-500/10 border border-cyan-500/20 text-white"
                          : "bg-white/[0.03] border border-white/5 text-white/80"
                      }`}>
                        {msg.role === "assistant" ? (
                          <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-table:my-2 prose-th:px-3 prose-th:py-1.5 prose-td:px-3 prose-td:py-1.5 prose-th:bg-white/5 prose-th:text-white/70 prose-td:text-white/60 prose-tr:border-white/5">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                code({ className, children, ...props }) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  const isInline = !match && !String(children).includes('\n');
                                  if (isInline) {
                                    return (
                                      <code className="bg-white/10 px-1.5 py-0.5 rounded text-cyan-300 text-xs" {...props}>
                                        {children}
                                      </code>
                                    );
                                  }
                                  return (
                                    <div className="my-2 rounded-lg overflow-hidden border border-white/5">
                                      <div className="bg-white/5 px-3 py-1.5 text-[10px] text-white/30 border-b border-white/5 flex items-center justify-between">
                                        <span>{match?.[1] || 'code'}</span>
                                        <button
                                          onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                                          className="hover:text-white/60 transition-colors"
                                        >
                                          <Copy size={10} />
                                        </button>
                                      </div>
                                      <pre className="p-3 overflow-x-auto bg-black/40 text-xs leading-relaxed">
                                        <code className="text-cyan-300/80">{String(children).replace(/\n$/, '')}</code>
                                      </pre>
                                    </div>
                                  );
                                },
                                table({ children }) {
                                  return (
                                    <div className="overflow-x-auto my-2 rounded-lg border border-white/10">
                                      <table className="w-full text-xs">{children}</table>
                                    </div>
                                  );
                                },
                                a({ children, href, ...props }) {
                                  return <a href={href} className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
                                },
                              }}
                            >
                              {msg.content.replace(/```[\w]*\n[\s\S]*?```/g, "> *Code generated — see Source Code Viewer →*")}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                        )}
                      </div>
                      {msg.role === "user" && (
                        <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                          <User className="w-3.5 h-3.5 text-purple-400" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {isChatting && (
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                      <div className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
                        <div className="flex gap-1">
                          <motion.div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} />
                          <motion.div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} />
                          <motion.div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-3 border-t border-white/5">
                  <div className="flex gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChat(); } }}
                      placeholder="Refine your agent..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-cyan-500/30 transition-colors"
                      disabled={isChatting}
                      data-testid="input-chat-refine"
                    />
                    <motion.button
                      onClick={handleChat}
                      disabled={!chatInput.trim() || isChatting}
                      className="px-3 py-2.5 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-400 disabled:opacity-30 hover:bg-cyan-500/30 transition-colors"
                      whileTap={{ scale: 0.95 }}
                      data-testid="button-send-chat"
                    >
                      <Send className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 space-y-4">
              {artifact && (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden"
                  >
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                      <h3 className="font-semibold text-base" data-testid="text-artifact-title">
                        Generated Artifact (Programmable Agent)
                      </h3>
                      {artifact.status === "deployed" && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-[10px] font-semibold text-emerald-400 uppercase tracking-wider"
                          data-testid="badge-deployed"
                        >
                          <motion.div
                            className="w-1.5 h-1.5 bg-emerald-400 rounded-full"
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                          Live
                        </motion.span>
                      )}
                    </div>

                    <div className="p-4">
                      <div className="bg-black/40 border border-white/5 rounded-xl p-4 mb-4">
                        <h4 className="text-xs uppercase tracking-wider text-white/30 mb-3">Artifact Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-white/40 w-28">Agent ID:</span>
                            <span className="font-mono text-cyan-300" data-testid="text-agent-id">{artifact.agentId}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-white/40 w-28">Status:</span>
                            <span className={`flex items-center gap-1.5 ${
                              artifact.status === "ready" ? "text-emerald-400" : artifact.status === "deployed" ? "text-cyan-400" : "text-amber-400"
                            }`} data-testid="text-agent-status">
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                artifact.status === "ready" ? "bg-emerald-400" : artifact.status === "deployed" ? "bg-cyan-400" : "bg-amber-400"
                              }`} />
                              {artifact.status === "ready" ? "Ready to Deploy" : artifact.status === "deployed" ? "Deployed" : "Generating"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-white/40 w-28">Target Stack:</span>
                            <span className="flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-purple-400" />
                              <span data-testid="text-target-stack">{artifact.targetStack}</span>
                            </span>
                          </div>
                        </div>
                        {artifact.description && (
                          <p className="mt-3 pt-3 border-t border-white/5 text-xs text-white/50 leading-relaxed" data-testid="text-artifact-description">
                            {artifact.description}
                          </p>
                        )}
                      </div>

                      <div className="bg-black/40 border border-white/5 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                          <div className="flex items-center gap-2">
                            <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="text-xs text-white/50">Source Code Viewer</span>
                          </div>
                          <button
                            onClick={handleCopy}
                            className="flex items-center gap-1 text-xs text-white/40 hover:text-white transition-colors"
                            data-testid="button-copy-code"
                          >
                            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            {copied ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <div className="p-4 max-h-[400px] overflow-y-auto">
                          <pre className="text-xs text-white/70 font-mono leading-relaxed whitespace-pre-wrap" data-testid="code-source-viewer">
                            {artifact.sourceCode}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-wrap gap-3"
                  >
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm hover:bg-white/10 transition-colors"
                      data-testid="button-download-artifact"
                    >
                      <Download className="w-4 h-4" />
                      Download Full Artifact
                    </button>
                    <button
                      onClick={async () => {
                        if (!sessionId || isChatting) return;
                        const testMsg = "Run a self-test on the generated agent. Identify any missing dependencies, potential runtime errors, or edge cases that need handling.";
                        const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: testMsg, timestamp: new Date().toISOString() };
                        setChatMessages(prev => [...prev, userMsg]);
                        setIsChatting(true);
                        try {
                          const res = await apiFetch(`/api/playground/sessions/${sessionId}/chat`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", "X-AiAssist-Provider": selectedProvider },
                            body: JSON.stringify({ message: testMsg, web_tool: "none" })
                          });
                          if (res.ok) {
                            const chatResponse = await res.json();
                            const assistantMsg = chatResponse.message;
                            if (assistantMsg) {
                              setChatMessages(prev => [...prev, { id: assistantMsg.id || Date.now().toString(), role: "assistant", content: assistantMsg.content, timestamp: assistantMsg.timestamp || new Date().toISOString() }]);
                            }
                          } else {
                            const errBody = await res.json().catch(() => null);
                            const detail = errBody?.detail || "Test failed — your provider may be rate-limited. Wait a moment and try again.";
                            setChatMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: `⚠️ ${detail}`, timestamp: new Date().toISOString() }]);
                          }
                        } catch (err) {
                          setChatMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: "⚠️ Test request failed — check your connection and try again.", timestamp: new Date().toISOString() }]);
                        }
                        finally { setIsChatting(false); }
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm hover:bg-white/10 transition-colors"
                      data-testid="button-test-agent"
                    >
                      <Play className="w-4 h-4" />
                      Test Agent
                    </button>
                    {deployedAgentId ? (<>
                      <motion.button
                        onClick={async () => {
                          if (!deployedAgentId) return;
                          try {
                            const res = await apiFetch(`/api/deployed-agents/${deployedAgentId}/activate`, {
                              method: "POST",
                            });
                            if (res.ok) {
                              setArtifact(prev => prev ? { ...prev, status: "deployed" } : prev);
                              setChatMessages(prev => [...prev, {
                                id: Date.now().toString(),
                                role: "assistant",
                                content: `Agent is now globally active. All API requests will be routed through this agent unless overridden with X-Agent-Id.`,
                                timestamp: new Date().toISOString()
                              }]);
                            } else {
                              const errBody = await res.json().catch(() => null);
                              setChatMessages(prev => [...prev, {
                                id: Date.now().toString(),
                                role: "assistant",
                                content: `⚠️ ${errBody?.detail || "Failed to activate agent."}`,
                                timestamp: new Date().toISOString()
                              }]);
                            }
                          } catch {
                            setChatMessages(prev => [...prev, {
                              id: Date.now().toString(),
                              role: "assistant",
                              content: "⚠️ Activation request failed.",
                              timestamp: new Date().toISOString()
                            }]);
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 rounded-xl text-sm text-emerald-300 hover:border-emerald-500/50 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        data-testid="button-activate-globally"
                      >
                        <Globe className="w-4 h-4" />
                        Activate Globally
                      </motion.button>
                      <Link href="/dashboard/deployed-agents">
                        <motion.span
                          className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white/70 hover:bg-white/10 transition-colors cursor-pointer"
                          whileHover={{ scale: 1.02 }}
                          data-testid="link-view-deployed"
                        >
                          <Check className="w-4 h-4" />
                          View Deployed Agent
                        </motion.span>
                      </Link>
                    </>) : (<>
                      {metadataStatus === "loading" && (
                        <span className="flex items-center gap-2 px-3 py-2 text-xs text-amber-300/70" data-testid="status-metadata-loading">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Loading directives & KB...
                        </span>
                      )}
                      {metadataStatus === "done" && (
                        <span className="flex items-center gap-1.5 px-3 py-2 text-xs text-emerald-400/70" data-testid="status-metadata-done">
                          <Check className="w-3.5 h-3.5" />
                          Config ready
                        </span>
                      )}
                      <motion.button
                        onClick={async () => {
                          if (!sessionId || !artifact || isDeploying || metadataStatus === "loading") return;
                          setIsDeploying(true);
                          try {
                            const res = await apiFetch("/api/deployed-agents", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                session_id: sessionId,
                                name: artifact.agentId,
                                description: artifact.description || `Generated agent: ${artifact.agentId}`,
                                inherit_global_directives: true,
                                inherit_global_kb: true,
                              })
                            });
                            if (res.ok) {
                              const data = await res.json();
                              const agentId = data.agent?.id || data.id;
                              setDeployedAgentId(agentId);
                              setArtifact(prev => prev ? { ...prev, status: "deployed" } : prev);
                              if (currentArtifactId) {
                                apiFetch(`/api/artifacts/${currentArtifactId}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ status: "deployed", deployed_agent_id: agentId })
                                }).catch(() => {});
                                loadHistory();
                              }
                              setChatMessages(prev => [...prev, {
                                id: Date.now().toString(),
                                role: "assistant",
                                content: `Agent "${artifact.agentId}" deployed successfully! You can now access it via the API or manage it from the Deployed Agents page.`,
                                timestamp: new Date().toISOString()
                              }]);
                            } else {
                              const errBody = await res.json().catch(() => null);
                              const detail = errBody?.detail || "Deploy failed. Please try again.";
                              setChatMessages(prev => [...prev, {
                                id: Date.now().toString(),
                                role: "assistant",
                                content: `⚠️ ${detail}`,
                                timestamp: new Date().toISOString()
                              }]);
                            }
                          } catch (err) {
                            setChatMessages(prev => [...prev, {
                              id: Date.now().toString(),
                              role: "assistant",
                              content: "⚠️ Deploy request failed — check your connection and try again.",
                              timestamp: new Date().toISOString()
                            }]);
                          } finally {
                            setIsDeploying(false);
                          }
                        }}
                        disabled={isDeploying || metadataStatus === "loading"}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 rounded-xl text-sm text-cyan-300 hover:border-cyan-500/50 transition-colors disabled:opacity-50"
                        whileHover={{ scale: 1.02 }}
                        data-testid="button-deploy-production"
                      >
                        {isDeploying ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Rocket className="w-4 h-4" />
                        )}
                        {isDeploying ? "Deploying..." : "Deploy to Production"}
                      </motion.button>
                    </>)}
                  </motion.div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
