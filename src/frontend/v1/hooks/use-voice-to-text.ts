import { useState, useCallback, useRef, useEffect } from "react";

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  onstart: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export type VoiceStatus = "idle" | "listening" | "error" | "unsupported";

interface UseVoiceToTextOptions {
  onTranscript?: (text: string) => void;
  continuous?: boolean;
  lang?: string;
  autoStopOnFinal?: boolean;
}

interface UseVoiceToTextReturn {
  status: VoiceStatus;
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
}

export function useVoiceToText(options: UseVoiceToTextOptions = {}): UseVoiceToTextReturn {
  const { onTranscript, continuous = false, lang = "en-US", autoStopOnFinal = true } = options;

  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const isListeningRef = useRef(false);
  const autoStopRef = useRef(autoStopOnFinal);
  
  const isSupported = typeof window !== "undefined" && 
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    autoStopRef.current = autoStopOnFinal;
  }, [autoStopOnFinal]);

  useEffect(() => {
    if (!isSupported) {
      setStatus("unsupported");
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      isListeningRef.current = true;
      setStatus("listening");
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      setTranscript(currentTranscript);

      if (finalTranscript && onTranscriptRef.current) {
        onTranscriptRef.current(finalTranscript);
        
        if (autoStopRef.current && !continuous) {
          recognition.stop();
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      isListeningRef.current = false;
      
      if (event.error === "aborted" || event.error === "no-speech") {
        setStatus("idle");
        return;
      }
      
      setStatus("error");
      
      const errorMessages: Record<string, string> = {
        "not-allowed": "Microphone access denied. Please allow microphone access in your browser settings.",
        "no-speech": "No speech detected. Please try again.",
        "audio-capture": "No microphone found. Please check your audio settings.",
        "network": "Network error occurred. Please check your connection.",
      };
      
      setError(errorMessages[event.error] || `Speech recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      setStatus("idle");
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [continuous, lang, isSupported]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setStatus("unsupported");
      setError("Speech recognition is not supported in this browser. Try Chrome, Edge, or Safari.");
      return;
    }

    if (isListeningRef.current) {
      return;
    }

    setTranscript("");
    setError(null);

    try {
      recognitionRef.current?.start();
    } catch (e) {
      const errorMessage = (e as Error).message;
      if (errorMessage.includes("already started")) {
        recognitionRef.current?.stop();
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch {
          }
        }, 100);
      }
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      recognitionRef.current.stop();
    }
    isListeningRef.current = false;
    setStatus("idle");
  }, []);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  return {
    status,
    isListening: status === "listening",
    isSupported: !!isSupported,
    transcript,
    error,
    startListening,
    stopListening,
    toggleListening,
  };
}
