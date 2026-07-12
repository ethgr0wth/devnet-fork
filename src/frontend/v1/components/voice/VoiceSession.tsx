/**
 * v1 runtime — VoiceSession placeholder.
 *
 * The REAL v1 VoiceSession is 1,119 lines riding the full Three.js /
 * react-three-fiber / postprocessing stack (the ElectricOrb scene). It ships
 * with the dedicated Voice app port; pulling the 3D stack in as a side
 * effect of Playground would balloon the bundle for a feature behind one
 * button. Same swap discipline as v1's own lightweight fallbacks.
 */
import React from "react";
import { motion } from "framer-motion";
import { Mic, X } from "lucide-react";

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
          Live voice arrives with the Voice app port — the full session orb
          runs there, on your production account.
        </p>
      </div>
    </div>
  );
}

export default VoiceSession;
