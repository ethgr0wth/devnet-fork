import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Settings, Lightbulb, FileText, ListChecks, Target } from "lucide-react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial, Environment, Float } from "@react-three/drei";
import { EffectComposer, Bloom, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { apiFetch } from "@/lib/queryClient";
import { getClientId } from "@/lib/clientId";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type AIAssistAction = "explain" | "summarize" | "extract-actions" | "decision";
type AIAssistScope = "off" | "next_only" | "all_future";


interface VoiceSessionProps {
  onClose: () => void;
  workspaceId?: string;
}

interface OrbProps {
  audioLevel: number;
  isSpeaking: boolean;
  isListening: boolean;
}

function ElectricOrb({ audioLevel, isSpeaking, isListening }: OrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hue, setHue] = useState(0);
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2;
      meshRef.current.rotation.x += delta * 0.1;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z -= delta * 0.5;
    }
    setHue((prev) => (prev + delta * 0.1) % 1);
  });

  const distortAmount = useMemo(() => {
    if (isSpeaking) return 0.3 + audioLevel * 0.5;
    if (isListening) return 0.2 + audioLevel * 0.3;
    return 0.15;
  }, [audioLevel, isSpeaking, isListening]);

  const glowIntensity = useMemo(() => {
    if (isSpeaking) return 2 + audioLevel * 3;
    if (isListening) return 1.5 + audioLevel * 2;
    return 1;
  }, [audioLevel, isSpeaking, isListening]);

  const coreColor = useMemo(() => {
    if (isSpeaking) return "#8B5CF6";
    if (isListening) return "#06B6D4";
    return "#6366F1";
  }, [isSpeaking, isListening]);

  return (
    <group>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <Sphere ref={meshRef} args={[1.5, 64, 64]}>
          <MeshDistortMaterial
            color={coreColor}
            emissive={coreColor}
            emissiveIntensity={glowIntensity}
            roughness={0.1}
            metalness={0.8}
            distort={distortAmount}
            speed={isSpeaking ? 4 : isListening ? 3 : 2}
          />
        </Sphere>
      </Float>

      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.2, 0.02, 16, 100]} />
        <meshBasicMaterial color="#D4AF37" transparent opacity={0.6 + audioLevel * 0.4} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, Math.PI / 4]}>
        <torusGeometry args={[2.4, 0.015, 16, 100]} />
        <meshBasicMaterial color="#8B5CF6" transparent opacity={0.4 + audioLevel * 0.3} />
      </mesh>
      <mesh rotation={[Math.PI / 3, Math.PI / 6, 0]}>
        <torusGeometry args={[2.6, 0.01, 16, 100]} />
        <meshBasicMaterial color="#06B6D4" transparent opacity={0.3 + audioLevel * 0.2} />
      </mesh>

      {isSpeaking && Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 2.8 + audioLevel * 0.5;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return (
          <mesh key={i} position={[x, y, 0]}>
            <sphereGeometry args={[0.05 + audioLevel * 0.1, 16, 16]} />
            <meshBasicMaterial color="#D4AF37" transparent opacity={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}

function Scene({ audioLevel, isSpeaking, isListening }: OrbProps) {
  return (
    <>
      <color attach="background" args={["#030712"]} />
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#8B5CF6" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#06B6D4" />
      
      <ElectricOrb audioLevel={audioLevel} isSpeaking={isSpeaking} isListening={isListening} />
      
      <Environment preset="night" />
      
      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          blendFunction={BlendFunction.ADD}
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.002, 0.002)}
        />
      </EffectComposer>
    </>
  );
}

const VOICE_OPTIONS = [
  { id: "en-US-Wavenet-D", name: "David", gender: "Male", accent: "American", type: "Wavenet" },
  { id: "en-US-Wavenet-F", name: "Fiona", gender: "Female", accent: "American", type: "Wavenet" },
  { id: "en-US-Wavenet-A", name: "Adam", gender: "Male", accent: "American", type: "Wavenet" },
  { id: "en-US-Wavenet-B", name: "Brian", gender: "Male", accent: "American", type: "Wavenet" },
  { id: "en-US-Wavenet-C", name: "Claire", gender: "Female", accent: "American", type: "Wavenet" },
  { id: "en-US-Wavenet-E", name: "Emily", gender: "Female", accent: "American", type: "Wavenet" },
  { id: "en-US-Wavenet-J", name: "Jack", gender: "Male", accent: "American", type: "Wavenet" },
  { id: "en-GB-Wavenet-A", name: "Alice", gender: "Female", accent: "British", type: "Wavenet" },
  { id: "en-GB-Wavenet-B", name: "Benjamin", gender: "Male", accent: "British", type: "Wavenet" },
  { id: "en-AU-Wavenet-A", name: "Amelia", gender: "Female", accent: "Australian", type: "Wavenet" },
  { id: "en-AU-Wavenet-B", name: "Oscar", gender: "Male", accent: "Australian", type: "Wavenet" },
  { id: "en-US-Chirp3-HD-Puck", name: "Puck", gender: "Male", accent: "American", type: "Chirp 3 HD" },
  { id: "en-US-Chirp3-HD-Charon", name: "Charon", gender: "Male", accent: "American", type: "Chirp 3 HD" },
  { id: "en-US-Chirp3-HD-Fenrir", name: "Fenrir", gender: "Male", accent: "American", type: "Chirp 3 HD" },
  { id: "en-US-Chirp3-HD-Kore", name: "Kore", gender: "Female", accent: "American", type: "Chirp 3 HD" },
  { id: "en-US-Chirp3-HD-Aoede", name: "Aoede", gender: "Female", accent: "American", type: "Chirp 3 HD" },
  { id: "en-US-Chirp3-HD-Zephyr", name: "Zephyr", gender: "Female", accent: "American", type: "Chirp 3 HD" },
  { id: "en-US-Chirp3-HD-Achernar", name: "Achernar", gender: "Neutral", accent: "American", type: "Chirp 3 HD" },
  { id: "en-GB-Chirp3-HD-Leda", name: "Leda", gender: "Female", accent: "British", type: "Chirp 3 HD" },
  { id: "en-AU-Chirp3-HD-Sulafat", name: "Sulafat", gender: "Female", accent: "Australian", type: "Chirp 3 HD" },
];

export function VoiceSession({ onClose, workspaceId }: VoiceSessionProps) {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0]);
  const [showSettings, setShowSettings] = useState(false);
  const [status, setStatus] = useState<"idle" | "connecting" | "active" | "error">("idle");
  const [aiName, setAiName] = useState("Assistant");
  
  const [aiResponse, setAiResponse] = useState("");
  const [conversationHistory, setConversationHistory] = useState<{role: string, content: string}[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | undefined>(workspaceId);
  
  // AI Assist state
  const [aiAssistAction, setAiAssistAction] = useState<AIAssistAction | null>(null);
  const [aiAssistScope, setAiAssistScope] = useState<AIAssistScope>("off");
  const [showAiAssist, setShowAiAssist] = useState(false);
  
  // Web Tool state
  type WebToolType = "none" | "search" | "visit";
  const [webTool, setWebTool] = useState<WebToolType>("none");
  
  const recognitionRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const speakingAnimationRef = useRef<number | null>(null);
  const targetLevelRef = useRef(0.5);
  const currentLevelRef = useRef(0);
  const isActiveRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const shouldRestartRef = useRef(false);
  const handleUserMessageRef = useRef<(message: string) => Promise<void>>();
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const responseContainerRef = useRef<HTMLDivElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const audio = document.createElement('audio');
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.setAttribute('x-webkit-airplay', 'allow');
    audio.preload = 'auto';
    audio.volume = 1.0;
    audio.style.display = 'none';
    document.body.appendChild(audio);
    audioElementRef.current = audio;
    
    return () => {
      if (currentAudioUrlRef.current) {
        URL.revokeObjectURL(currentAudioUrlRef.current);
      }
      if (audio.parentNode) {
        audio.parentNode.removeChild(audio);
      }
    };
  }, []);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    if (!isSpeaking || !responseContainerRef.current) return;
    
    const container = responseContainerRef.current;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const maxScroll = scrollHeight - clientHeight;
    
    if (maxScroll <= 0) return;
    
    const audio = audioElementRef.current;
    if (!audio || !audio.duration || audio.duration === Infinity) return;
    
    let animationId: number;
    const scrollStep = () => {
      if (!audio || audio.paused || audio.ended) return;
      
      const progress = audio.currentTime / audio.duration;
      const targetScroll = progress * maxScroll;
      container.scrollTop = targetScroll;
      
      animationId = requestAnimationFrame(scrollStep);
    };
    
    animationId = requestAnimationFrame(scrollStep);
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isSpeaking, aiResponse]);

  const startAudioAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const updateLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(average / 255);
        }
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
    } catch (error) {
      console.error("Failed to start audio analysis:", error);
    }
  }, []);

  const simulateSpeakingAudio = useCallback(() => {
    let lastTargetChange = 0;
    
    const animate = (timestamp: number) => {
      if (timestamp - lastTargetChange > 300) {
        targetLevelRef.current = 0.3 + Math.random() * 0.4;
        lastTargetChange = timestamp;
      }
      
      currentLevelRef.current += (targetLevelRef.current - currentLevelRef.current) * 0.15;
      setAudioLevel(currentLevelRef.current);
      
      speakingAnimationRef.current = requestAnimationFrame(animate);
    };
    
    speakingAnimationRef.current = requestAnimationFrame(animate);
  }, []);

  const stopSpeakingSimulation = useCallback(() => {
    if (speakingAnimationRef.current) {
      cancelAnimationFrame(speakingAnimationRef.current);
      speakingAnimationRef.current = null;
    }
    currentLevelRef.current = 0;
    targetLevelRef.current = 0.5;
  }, []);

  const stopAudioAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    stopSpeakingSimulation();
  }, [stopSpeakingSimulation]);

  const startListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      console.error("Speech recognition not supported");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = "en-US";

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);
      
      if (finalTranscript) {
        handleUserMessageRef.current?.(finalTranscript);
        setTranscript("");
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setIsListening(false);
      }
    };

    recognitionRef.current.onend = () => {
      if (isActiveRef.current && !isSpeakingRef.current && shouldRestartRef.current) {
        shouldRestartRef.current = false;
        setTimeout(() => {
          if (isActiveRef.current && !isSpeakingRef.current) {
            startListening();
          }
        }, 100);
      }
    };

    shouldRestartRef.current = true;
    recognitionRef.current.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
  }, []);

  const stripMarkdown = useCallback((markdown: string): string => {
    return markdown
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Remove headers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italic
      .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/___([^_]+)___/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Remove links but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove images
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      // Remove blockquotes
      .replace(/^>\s+/gm, '')
      // Remove horizontal rules
      .replace(/^[-*_]{3,}$/gm, '')
      // Remove list markers
      .replace(/^[\s]*[-*+]\s+/gm, '')
      .replace(/^[\s]*\d+\.\s+/gm, '')
      // Clean up extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }, []);

  const synthesizeAndPlayAudio = useCallback(async (text: string): Promise<{ audioUrl: string; duration: number } | { quotaExceeded: true } | null> => {
    try {
      const plainText = stripMarkdown(text);
      
      const response = await apiFetch("/api/tts/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: plainText,
          voice_id: selectedVoice.id,
          speaking_rate: 1.0,
          pitch: 0.0
        })
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn("[VoiceSession] TTS quota exceeded (429)");
          return { quotaExceeded: true };
        }
        console.error("TTS synthesis failed");
        return null;
      }
      
      const data = await response.json();
      console.log("[VoiceSession] TTS response:", { hasAudio: !!data.audio_content, duration: data.duration_seconds });
      
      if (!data.audio_content) {
        console.error("[VoiceSession] No audio content in TTS response");
        return null;
      }
      
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audio_content), c => c.charCodeAt(0))],
        { type: "audio/mp3" }
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log("[VoiceSession] Audio blob created, URL:", audioUrl);
      
      return { audioUrl, duration: data.duration_seconds || 3 };
    } catch (error) {
      console.error("TTS error:", error);
      return null;
    }
  }, [selectedVoice.id, stripMarkdown]);

  const processAIAssist = useCallback(async (content: string, action: AIAssistAction): Promise<string | null> => {
    try {
      const actionEndpoint = action === "extract-actions" ? "extract-actions" : action;
      const res = await apiFetch(`/api/voice/actions/${actionEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.result?.text || null;
    } catch (error) {
      console.error("AI Assist error:", error);
      return null;
    }
  }, []);

  const getAIResponse = useCallback(async (message: string) => {
    try {
      const clientId = getClientId();
      
      let wsId = activeWorkspaceId;
      if (!wsId) {
        const checkRes = await apiFetch(`/api/workspaces/by-client/${clientId}`);
        if (checkRes.ok) {
          const data = await checkRes.json();
          if (data.exists && data.workspace) {
            wsId = data.workspace.id;
            setActiveWorkspaceId(wsId);
            if (data.workspace.mode !== "ai") {
              await apiFetch(`/api/workspaces/${wsId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "ai" })
              });
            }
          }
        }
      } else {
        const wsRes = await apiFetch(`/api/workspaces/${wsId}`);
        if (wsRes.ok) {
          const wsData = await wsRes.json();
          if (wsData.mode !== "ai") {
            await apiFetch(`/api/workspaces/${wsId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mode: "ai" })
            });
          }
        } else {
          console.log("[VoiceSession] Workspace not found, will create new one");
          wsId = undefined;
          setActiveWorkspaceId(undefined);
        }
      }
      
      const updatedHistory = [...conversationHistory, { role: "user", content: message }];
      setConversationHistory(updatedHistory);
      
      let response;
      let aiMessage: string;
      
      if (wsId) {
        response = await apiFetch(`/api/workspaces/${wsId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: message, web_tool: webTool !== "none" ? webTool : null })
        });
        
        if (!response.ok) {
          throw new Error("Failed to get AI response");
        }
        
        const data = await response.json();
        const responses = data.responses || [];
        const lastResponse = responses[responses.length - 1];
        aiMessage = lastResponse?.content || data.ai_response?.content || data.response || "I'm sorry, I couldn't process that.";
        console.log("[VoiceSession] Send message response:", { data, aiMessage });
      } else {
        response = await apiFetch("/api/workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            initial_message: message,
            client_id: clientId
          })
        });
        
        if (!response.ok) {
          throw new Error("Failed to get AI response");
        }
        
        const data = await response.json();
        if (data.workspace?.id) {
          setActiveWorkspaceId(data.workspace.id);
          console.log("[VoiceSession] Created new workspace:", data.workspace.id);
        }
        const messages = data.messages || [];
        const aiMessages = messages.filter((m: any) => m.role === "ai" || m.role === "assistant");
        const lastAiMsg = aiMessages[aiMessages.length - 1];
        aiMessage = lastAiMsg?.content || "I'm sorry, I couldn't process that.";
        console.log("[VoiceSession] Create workspace response:", { messages, aiMessage });
      }
      
      setConversationHistory(prev => [...prev, { role: "assistant", content: aiMessage }]);
      
      return aiMessage;
    } catch (error) {
      console.error("AI response error:", error);
      return "I'm having trouble connecting right now. Please try again.";
    }
  }, [activeWorkspaceId, conversationHistory, webTool]);

  const handleUserMessage = useCallback(async (message: string) => {
    setIsListening(false);
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    
    try {
      let aiMessage: string;
      
      // If AI Assist is active, ONLY call the action endpoint (single completion)
      if (aiAssistAction && aiAssistScope !== "off") {
        console.log("[VoiceSession] AI Assist direct mode:", aiAssistAction);
        const assistResult = await processAIAssist(message, aiAssistAction);
        if (assistResult) {
          const actionLabel = aiAssistAction.charAt(0).toUpperCase() + aiAssistAction.slice(1);
          aiMessage = `🎯 ${actionLabel}:\n\n${assistResult}`;
        } else {
          aiMessage = "I couldn't process that request. Please try again.";
        }
        // Reset scope if "next_only"
        if (aiAssistScope === "next_only") {
          setAiAssistScope("off");
          setAiAssistAction(null);
        }
      } else {
        // Regular chat flow (no action active)
        aiMessage = await getAIResponse(message);
      }
      
      setAiResponse(aiMessage);
      
      const audioResult = await synthesizeAndPlayAudio(aiMessage);
      
      // Check if voice service quota is exceeded - show friendly message and continue in text mode
      if (audioResult && 'quotaExceeded' in audioResult) {
        console.log("[VoiceSession] Voice service quota exceeded, continuing in text-only mode");
        setAiResponse("🎤 Oops! Our voice assistant is taking a quick coffee break due to high demand. Here's your answer in text form instead! Check back soon for voice mode. ☕\n\n" + aiMessage);
        // Keep the text response visible longer, then restart listening
        setTimeout(() => {
          setAiResponse("");
          if (isActiveRef.current) {
            startListening();
          }
        }, 8000); // Give user time to read
        return;
      }
      
      if (audioResult && 'audioUrl' in audioResult && audioElementRef.current) {
        console.log("[VoiceSession] Audio result received, using persistent audio element");
        
        const audio = audioElementRef.current;
        
        if (currentAudioUrlRef.current) {
          URL.revokeObjectURL(currentAudioUrlRef.current);
        }
        currentAudioUrlRef.current = audioResult.audioUrl;
        
        audio.onplay = () => {
          console.log("[VoiceSession] Audio playing via speaker");
          setIsSpeaking(true);
          simulateSpeakingAudio();
        };
        
        audio.onended = () => {
          console.log("[VoiceSession] Audio ended");
          stopSpeakingSimulation();
          setIsSpeaking(false);
          setAudioLevel(0);
          setAiResponse("");
          
          if (isActiveRef.current) {
            setTimeout(() => {
              startListening();
            }, 300);
          }
        };
        
        audio.onerror = (e) => {
          console.error("[VoiceSession] Audio error:", e);
          stopSpeakingSimulation();
          setIsSpeaking(false);
          setAudioLevel(0);
          setAiResponse("");
          if (isActiveRef.current) {
            setTimeout(() => startListening(), 200);
          }
        };
        
        audio.src = audioResult.audioUrl;
        audio.load();
        
        try {
          await audio.play();
          console.log("[VoiceSession] Audio play started via speaker");
        } catch (playError) {
          console.error("[VoiceSession] Audio play failed:", playError);
          stopSpeakingSimulation();
          setIsSpeaking(false);
          setAudioLevel(0);
          setAiResponse("");
          if (isActiveRef.current) {
            setTimeout(() => startListening(), 300);
          }
        }
      } else {
        setAiResponse("");
        if (isActiveRef.current) {
          setTimeout(() => startListening(), 200);
        }
      }
    } catch (error) {
      console.error("Voice conversation error:", error);
      stopSpeakingSimulation();
      setIsSpeaking(false);
      setAudioLevel(0);
      setAiResponse("");
      
      if (isActiveRef.current) {
        setTimeout(() => startListening(), 200);
      }
    }
  }, [simulateSpeakingAudio, stopSpeakingSimulation, startListening, getAIResponse, synthesizeAndPlayAudio, aiAssistAction, aiAssistScope, processAIAssist]);

  useEffect(() => {
    handleUserMessageRef.current = handleUserMessage;
  }, [handleUserMessage]);

  const unlockAudioForMobile = useCallback(() => {
    if (audioElementRef.current) {
      const audio = audioElementRef.current;
      audio.src = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYbMcf/NAAAAAAAAAAAAAAAAAAAAAP/7kGQAAAAAAGkAAAAAAAANIAAAAAXAAAEAAAAA0gAAABJkNiAAAAAAAANIAAAAAEXxz//+//kQz//+8+CPgkKBn//kQz/wQFAz//8cMH///xz//+OGf/8c///5D////gg//+Qgg//IhICAoGf/+CGf/8EBhP/+RAz/wiIf/xz////Hf/+Q/8c+n5EM//+OGf/8gg//+CAg//kPxwAAAAAP/7UGQKgAEqK1NxwYACKsXqfiBgAATgoZHgPAAAk5AyOAAAADWL7Qv8QYP8SP/kQ//8EM///HBQM/8EM//+CAZ/+Of//hg//5AIf/8cFAz///EP//+Qf/wz//+QRAz//8EP//4Y//5EP//BH//+Q/+Og//8h//4J/8cP//gj/+Q//8c/+Q//8E//5D//4I//+Q//+O/HBQMiJ//kH//+CAg//+Of//4J//kQ///jooGf/4IO//8gD/+Of//gn8cFI//wQ//84f/+O//wQf/8E//8cB//+CHJwU5n/wQ//4I//8cP//8cP/+CH/5D/wQf//HLP5AAAAAAA";
      audio.volume = 0.01;
      audio.load();
      audio.play().then(() => {
        console.log("[VoiceSession] Persistent audio element unlocked for mobile speaker");
        audio.volume = 1.0;
      }).catch(e => {
        console.log("[VoiceSession] Audio unlock attempt:", e.message);
        audio.volume = 1.0;
      });
    }
    
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  const startSession = async () => {
    setStatus("connecting");
    
    // Unlock audio for mobile browsers
    unlockAudioForMobile();
    
    await startAudioAnalysis();
    
    setTimeout(() => {
      setIsActive(true);
      setStatus("active");
      startListening();
    }, 1000);
  };

  const endSession = () => {
    setIsActive(false);
    setStatus("idle");
    setIsSpeaking(false);
    setIsListening(false);
    stopListening();
    stopAudioAnalysis();
    setAudioLevel(0);
    setAiResponse("");
    setTranscript("");
    setConversationHistory([]);
    
    if (speakingAnimationRef.current) {
      cancelAnimationFrame(speakingAnimationRef.current);
      speakingAnimationRef.current = null;
    }
    
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    
    if (currentAudioUrlRef.current) {
      URL.revokeObjectURL(currentAudioUrlRef.current);
      currentAudioUrlRef.current = null;
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (isMuted) {
      startListening();
    } else {
      stopListening();
    }
  };

  const toggleAudioMute = () => {
    if (audioElementRef.current) {
      const newMuted = !isAudioMuted;
      audioElementRef.current.muted = newMuted;
      setIsAudioMuted(newMuted);
    }
  };

  useEffect(() => {
    return () => {
      stopListening();
      stopAudioAnalysis();
    };
  }, [stopListening, stopAudioAnalysis]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gray-950"
      data-testid="voice-session-container"
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        data-testid="button-close-voice"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      <div className="absolute top-6 left-6 z-50 flex items-center gap-3">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          data-testid="button-voice-settings"
        >
          <Settings className="w-6 h-6 text-white" />
        </button>
        <button
          onClick={() => setShowAiAssist(!showAiAssist)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
            showAiAssist || aiAssistAction
              ? 'bg-purple-600 text-white'
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
          data-testid="button-ai-assist-toggle"
        >
          <Lightbulb className="w-4 h-4" />
          AI Assist
          {aiAssistAction && aiAssistScope !== "off" && (
            <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">ON</span>
          )}
        </button>
      </div>

      <AnimatePresence>
        {showAiAssist && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-6 z-50 p-4 rounded-xl bg-gray-900/90 backdrop-blur border border-white/10 w-80"
          >
            <h3 className="text-white font-medium mb-3">AI Assist</h3>
            <p className="text-white/50 text-xs mb-4">Automatically analyze AI responses</p>
            
            <div className="grid grid-cols-2 gap-2 mb-4">
              {([
                { action: "explain" as AIAssistAction, icon: Lightbulb, label: "Explain" },
                { action: "summarize" as AIAssistAction, icon: FileText, label: "Summarize" },
                { action: "extract-actions" as AIAssistAction, icon: ListChecks, label: "Actions" },
                { action: "decision" as AIAssistAction, icon: Target, label: "Decide" }
              ]).map(({ action, icon: Icon, label }) => (
                <button
                  key={action}
                  onClick={() => {
                    if (aiAssistAction === action) {
                      setAiAssistAction(null);
                      setAiAssistScope("off");
                    } else {
                      setAiAssistAction(action);
                      if (aiAssistScope === "off") setAiAssistScope("next_only");
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    aiAssistAction === action
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                  }`}
                  data-testid={`button-voice-ai-assist-${action}`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Apply to:</span>
              <div className="flex gap-1">
                {([
                  { scope: "off" as AIAssistScope, label: "Off" },
                  { scope: "next_only" as AIAssistScope, label: "Next" },
                  { scope: "all_future" as AIAssistScope, label: "Always" }
                ]).map(({ scope, label }) => (
                  <button
                    key={scope}
                    onClick={() => {
                      setAiAssistScope(scope);
                      if (scope === "off") setAiAssistAction(null);
                    }}
                    className={`px-3 py-1 rounded-md text-xs transition-colors ${
                      aiAssistScope === scope
                        ? scope === "off" 
                          ? 'bg-slate-600 text-white'
                          : scope === "next_only"
                          ? 'bg-amber-600 text-white'
                          : 'bg-green-600 text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                    data-testid={`button-voice-scope-${scope}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Web Tools */}
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">Web Tools:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setWebTool("none")}
                    className={`px-3 py-1 rounded-md text-xs transition-colors ${
                      webTool === "none"
                        ? 'bg-slate-600 text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                    data-testid="button-voice-web-off"
                  >
                    Off
                  </button>
                  <button
                    onClick={() => setWebTool("search")}
                    className={`px-3 py-1 rounded-md text-xs transition-colors ${
                      webTool === "search"
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                    data-testid="button-voice-web-search"
                  >
                    Search
                  </button>
                  <button
                    onClick={() => setWebTool("visit")}
                    className={`px-3 py-1 rounded-md text-xs transition-colors ${
                      webTool === "visit"
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                    data-testid="button-voice-web-visit"
                  >
                    Visit
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute top-20 left-6 z-50 p-4 rounded-xl bg-gray-900/90 backdrop-blur border border-white/10 w-72"
          >
            <h3 className="text-white font-medium mb-4">Voice Settings</h3>
            
            <div className="mb-4">
              <label className="text-white/60 text-sm mb-2 block">AI Name</label>
              <input
                type="text"
                value={aiName}
                onChange={(e) => setAiName(e.target.value)}
                placeholder="Give your AI a name..."
                className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-violet-500/50"
                data-testid="input-ai-name"
              />
            </div>
            
            <div>
              <label className="text-white/60 text-sm mb-2 block">Voice Style</label>
              <select
                value={selectedVoice.id}
                onChange={(e) => setSelectedVoice(VOICE_OPTIONS.find(v => v.id === e.target.value) || VOICE_OPTIONS[0])}
                className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm [&>option]:bg-slate-900 [&>option]:text-white"
                data-testid="select-voice"
              >
                {VOICE_OPTIONS.map((voice) => (
                  <option key={voice.id} value={voice.id} className="bg-gray-900">
                    {voice.name} ({voice.gender}, {voice.accent})
                  </option>
                ))}
              </select>
              <p className="text-white/40 text-xs mt-1">Choose the voice style for {aiName || "your AI"}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
          <Scene 
            audioLevel={audioLevel} 
            isSpeaking={isSpeaking} 
            isListening={isListening && !isMuted} 
          />
        </Canvas>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-8">
        <div className="max-w-xl mx-auto text-center">
          <AnimatePresence mode="wait">
            {transcript && (
              <motion.div
                key="user-transcript"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-4 rounded-xl bg-cyan-500/20 backdrop-blur border border-cyan-500/30"
              >
                <p className="text-xs text-cyan-400 mb-1">You</p>
                <p className="text-white/90 text-lg">{transcript}</p>
              </motion.div>
            )}
            {aiResponse && isSpeaking && (
              <motion.div
                ref={responseContainerRef}
                key="ai-response"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-4 rounded-xl bg-violet-500/20 backdrop-blur border border-violet-500/30 max-h-[40vh] overflow-y-auto scroll-smooth"
              >
                <p className="text-xs text-violet-400 mb-2 sticky top-0 bg-violet-500/20 backdrop-blur py-1">{aiName || "Assistant"}</p>
                <div className="text-white/90 text-base prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {aiResponse}
                  </ReactMarkdown>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.p
            key={status}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-white/60 mb-6 text-sm"
          >
            {status === "idle" && "Press the button to start a voice conversation"}
            {status === "connecting" && "Connecting..."}
            {status === "active" && (isSpeaking ? `${aiName || "Assistant"} is speaking...` : isListening ? "Listening..." : "Ready")}
          </motion.p>

          <div className="flex items-center justify-center gap-4">
            {isActive && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={toggleMute}
                className={`p-4 rounded-full transition-colors ${
                  isMuted 
                    ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                    : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                }`}
                data-testid="button-toggle-mute"
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isActive ? endSession : startSession}
              className={`p-6 rounded-full transition-all ${
                isActive
                  ? "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_30px_rgba(239,68,68,0.5)]"
                  : "bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-[0_0_30px_rgba(139,92,246,0.5)]"
              }`}
              data-testid="button-toggle-session"
            >
              {isActive ? <PhoneOff className="w-8 h-8" /> : <Phone className="w-8 h-8" />}
            </motion.button>

            {isActive && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={toggleAudioMute}
                className={`p-4 rounded-full transition-colors ${
                  isAudioMuted 
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" 
                    : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                }`}
                title={isAudioMuted ? "Unmute speaker" : "Mute speaker"}
                data-testid="button-toggle-speaker"
              >
                {isAudioMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
