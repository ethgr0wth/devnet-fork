import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Zap, Check, ArrowRight } from "lucide-react";
import { Link } from "wouter";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
}

const BENEFITS = [
  "Unlimited AI chat completions",
  "Enterprise-grade security model",
  "Domain scoped AI security",
  "Usage & rate limits",
  "Code generation tools",
  "Blog content generation",
  "API key access",
  "Priority support"
];

export function UpgradeModal({ isOpen, onClose, feature }: UpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
          >
            <div className="relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-violet-500/20 blur-3xl" />
              
              <div className="relative p-6">
                <button
                  onClick={onClose}
                  data-testid="button-close-upgrade-modal"
                  className="absolute top-4 right-4 p-2 text-white/40 hover:text-white/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center text-center mb-6">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-violet-500/30 blur-xl rounded-full" />
                    <div className="relative p-4 bg-gradient-to-br from-violet-500/20 to-cyan-500/20 rounded-2xl border border-white/10">
                      <Sparkles className="w-8 h-8 text-violet-400" />
                    </div>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Upgrade to Unlock
                  </h2>
                  
                  {feature && (
                    <p className="text-white/60 text-sm mb-2">
                      <span className="text-violet-400 font-medium">{feature}</span> requires a paid subscription
                    </p>
                  )}
                  
                  <p className="text-white/50 text-sm">
                    Get full access to all AI features and tools
                  </p>
                </div>

                <div className="flex flex-col items-center space-y-3 mb-6">
                  {BENEFITS.map((benefit, i) => (
                    <motion.div
                      key={benefit}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 text-white/80"
                    >
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-emerald-400" />
                      </div>
                      <span className="text-sm">{benefit}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="space-y-3">
                  <Link href="/pricing">
                    <button
                      onClick={onClose}
                      data-testid="button-view-plans"
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-violet-600 hover:to-cyan-600 transition-all shadow-lg shadow-violet-500/20"
                    >
                      <Zap className="w-5 h-5" />
                      View Plans
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                  
                  <button
                    onClick={onClose}
                    data-testid="button-maybe-later"
                    className="w-full px-6 py-3 text-white/50 hover:text-white/70 text-sm transition-colors"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function useUpgradeModal() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [feature, setFeature] = React.useState<string | undefined>();

  const showUpgradeModal = React.useCallback((featureName?: string) => {
    setFeature(featureName);
    setIsOpen(true);
  }, []);

  const closeUpgradeModal = React.useCallback(() => {
    setIsOpen(false);
    setFeature(undefined);
  }, []);

  return {
    isOpen,
    feature,
    showUpgradeModal,
    closeUpgradeModal,
    UpgradeModalComponent: () => (
      <UpgradeModal
        isOpen={isOpen}
        onClose={closeUpgradeModal}
        feature={feature}
      />
    )
  };
}
