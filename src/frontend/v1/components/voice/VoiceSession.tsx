/**
 * v1 runtime — VoiceSession bridge.
 *
 * The REAL v1 VoiceSession is 1,119 lines riding the full Three.js /
 * react-three-fiber / postprocessing stack (the ElectricOrb scene). Pulling
 * that 3D stack into this window as a side effect of one button would
 * balloon the bundle for every AiOS user, not just the ones who use voice.
 *
 * 2026-07-13 (Mark): a prior version of this card described that tradeoff to
 * END USERS instead of solving it for them — internal roadmap language
 * ("arrives with the Voice app port") leaking into production copy on a live
 * app. Never again: this is a real, honest bridge. It opens the ACTUAL,
 * fully-working v1 voice session on the user's production account in a new
 * tab — a working feature, not a description of a missing one. The native
 * in-window orb is still real future work; it is not this card's job to
 * apologize for that to a user just trying to talk to their assistant.
 */
import React from "react";
import { motion } from "framer-motion";
import { Mic, X, ArrowUpRight } from "lucide-react";
import { aias } from "../../../aias";

export function VoiceSession({ onClose }: { onClose: () => void; workspaceId?: string }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-8 text-center">
        <button onClick={onClose} className="absolute right-3 top-3 p-1.5 text-zinc-500 hover:text-white">
          <X className="h-4 w-4" />
        </button>
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-purple-700 shadow-[0_0_60px_rgba(139,92,246,0.4)]"
        >
          <Mic className="h-8 w-8 text-white" />
        </motion.div>
        <h3 className="text-lg font-bold text-white">Voice sessions</h3>
        <p className="mt-1.5 text-sm text-zinc-400">
          The full voice experience opens in its own tab, on your account.
        </p>
        <button
          onClick={() => {
            window.open(`${aias.appBase}/dashboard/voice-chat`, "_blank", "noopener,noreferrer");
            onClose();
          }}
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
        >
          Open Voice Chat <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default VoiceSession;
