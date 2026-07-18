import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mic, Sparkles, Lock } from "lucide-react";
import { VoiceSession } from "../components/voice/VoiceSession";
import { apiFetch } from "@/lib/queryClient";

interface SubscriptionInfo {
  is_active: boolean;
  status: string;
  plan_code: string;
}

export default function VoiceChat() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [showVoiceSession, setShowVoiceSession] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const res = await apiFetch("/api/subscription/status");
        if (res.ok) {
          const data: SubscriptionInfo = await res.json();
          setIsSubscriber(data.is_active);
        }
      } catch (error) {
        console.error("Failed to check subscription:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSubscriber) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <button
            onClick={() => setLocation("/dashboard")}
            className="flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors"
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center">
              <Lock className="w-12 h-12 text-violet-400" />
            </div>
            <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              AI Voice Chat
            </h1>
            <p className="text-white/60 text-lg mb-8 max-w-md mx-auto">
              Have natural voice conversations with your AI assistant. This premium feature is available to subscribers only.
            </p>
            <button
              onClick={() => setLocation("/pricing")}
              className="px-8 py-4 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity flex items-center gap-3 mx-auto"
              data-testid="button-upgrade-voice"
            >
              <Sparkles className="w-5 h-5" />
              Upgrade to Access
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <AnimatePresence>
        {showVoiceSession ? (
          <VoiceSession onClose={() => setShowVoiceSession(false)} />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-4xl mx-auto px-6 py-12"
          >
            <button
              onClick={() => setLocation("/dashboard")}
              className="flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors"
              data-testid="button-back-dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="flex items-center justify-center gap-3 mb-6">
                <Sparkles className="w-8 h-8 text-violet-400" />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                  AI Voice Chat
                </h1>
              </div>
              <p className="text-white/60 text-lg mb-12 max-w-md mx-auto">
                Have natural voice conversations with your AI assistant. Just tap to start talking.
              </p>

              <motion.button
                onClick={() => setShowVoiceSession(true)}
                className="group relative w-48 h-48 mx-auto"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                data-testid="button-start-voice"
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 opacity-20 group-hover:opacity-30 transition-opacity animate-pulse" />
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-violet-500/30 to-purple-500/30 border-2 border-violet-500/50 group-hover:border-violet-400 transition-colors flex items-center justify-center">
                  <div className="text-center">
                    <Mic className="w-16 h-16 text-violet-400 mx-auto mb-2" />
                    <span className="text-violet-300 font-semibold">Tap to Start</span>
                  </div>
                </div>
              </motion.button>

              <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center mb-4 mx-auto">
                    <Mic className="w-6 h-6 text-violet-400" />
                  </div>
                  <h3 className="font-semibold mb-2">Natural Speech</h3>
                  <p className="text-sm text-white/60">Speak naturally and the AI will understand your intent</p>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 mx-auto">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="font-semibold mb-2">HD Voices</h3>
                  <p className="text-sm text-white/60">Choose from multiple premium HD voice options</p>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
                  <div className="w-12 h-12 rounded-xl bg-fuchsia-500/20 flex items-center justify-center mb-4 mx-auto">
                    <Lock className="w-6 h-6 text-fuchsia-400" />
                  </div>
                  <h3 className="font-semibold mb-2">Private & Secure</h3>
                  <p className="text-sm text-white/60">Your conversations stay private and encrypted</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
