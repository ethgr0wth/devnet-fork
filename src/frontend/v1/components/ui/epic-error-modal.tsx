import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, XCircle, AlertOctagon, Bug, X, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

type ErrorSeverity = "error" | "warning" | "critical";

interface EpicErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  technicalDetails?: string;
  severity?: ErrorSeverity;
}

const severityConfig = {
  error: {
    gradient: "from-red-500/20 via-red-600/10 to-transparent",
    border: "border-red-500/30",
    glow: "shadow-[0_0_60px_rgba(239,68,68,0.15)]",
    buttonBg: "bg-red-500/20 hover:bg-red-500/30 border-red-500/40 hover:border-red-500/60",
    buttonText: "text-red-400",
    iconColor: "text-red-400",
    ring: "from-red-500/20 to-red-600/5",
    Icon: XCircle,
  },
  warning: {
    gradient: "from-amber-500/20 via-amber-600/10 to-transparent",
    border: "border-amber-500/30",
    glow: "shadow-[0_0_60px_rgba(245,158,11,0.15)]",
    buttonBg: "bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 hover:border-amber-500/60",
    buttonText: "text-amber-400",
    iconColor: "text-amber-400",
    ring: "from-amber-500/20 to-amber-600/5",
    Icon: AlertTriangle,
  },
  critical: {
    gradient: "from-rose-600/25 via-red-700/15 to-transparent",
    border: "border-rose-500/40",
    glow: "shadow-[0_0_80px_rgba(225,29,72,0.2)]",
    buttonBg: "bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/40 hover:border-rose-500/60",
    buttonText: "text-rose-400",
    iconColor: "text-rose-400",
    ring: "from-rose-500/25 to-rose-600/10",
    Icon: AlertOctagon,
  },
};

export function EpicErrorModal({
  isOpen,
  onClose,
  title,
  message,
  technicalDetails,
  severity = "error",
}: EpicErrorModalProps) {
  const [showDetails, setShowDetails] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const config = severityConfig[severity];
  const IconComponent = config.Icon;

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (!isOpen) {
      setShowDetails(false);
      setCopied(false);
    }
  }, [isOpen]);

  const copyToClipboard = async () => {
    if (technicalDetails) {
      try {
        await navigator.clipboard.writeText(technicalDetails);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`relative z-10 w-full max-w-lg mx-4 ${config.glow}`}
          >
            <div className={`relative overflow-hidden rounded-2xl border ${config.border} bg-[#0a0f1a]`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} pointer-events-none`} />
              
              <div className="absolute inset-0 opacity-[0.02]" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }} />

              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-all duration-200 z-20"
                data-testid="error-modal-close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="relative p-8">
                <div className="flex flex-col items-center text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", damping: 15 }}
                    className="relative mb-6"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${config.ring} rounded-full blur-xl scale-150`} />
                    <div className={`relative w-16 h-16 rounded-full border ${config.border} bg-black/40 flex items-center justify-center`}>
                      <IconComponent className={`w-8 h-8 ${config.iconColor}`} />
                    </div>
                    
                    <motion.div
                      className={`absolute inset-0 rounded-full border ${config.border}`}
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-xl font-semibold text-white mb-3"
                  >
                    {title}
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-white/70 text-sm leading-relaxed max-w-md"
                  >
                    {message}
                  </motion.p>

                  {technicalDetails && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="w-full mt-6"
                    >
                      <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="flex items-center justify-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors mx-auto group"
                        data-testid="error-modal-toggle-details"
                      >
                        <Bug className="w-3.5 h-3.5" />
                        <span>{showDetails ? "Hide" : "Show"} Technical Details</span>
                        {showDetails ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <AnimatePresence>
                        {showDetails && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 relative">
                              <div className="bg-black/40 border border-white/10 rounded-lg p-4 text-left">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] uppercase tracking-wider text-white/30 font-medium">
                                    Error Details for Developers
                                  </span>
                                  <button
                                    onClick={copyToClipboard}
                                    className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                                    data-testid="error-modal-copy"
                                  >
                                    {copied ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-400" />
                                        <span className="text-emerald-400">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <pre className="text-xs text-white/50 font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                                  {technicalDetails}
                                </pre>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex justify-center mt-8"
                >
                  <button
                    onClick={onClose}
                    className={`px-8 py-3 rounded-xl border ${config.buttonBg} ${config.buttonText} text-sm font-medium transition-all duration-200`}
                    data-testid="error-modal-dismiss"
                  >
                    Dismiss
                  </button>
                </motion.div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface ErrorModalState {
  isOpen: boolean;
  title: string;
  message: string;
  technicalDetails?: string;
  severity: ErrorSeverity;
}

export function useEpicErrorModal() {
  const [state, setState] = React.useState<ErrorModalState>({
    isOpen: false,
    title: "",
    message: "",
    technicalDetails: undefined,
    severity: "error",
  });

  const showError = React.useCallback((options: {
    title?: string;
    message: string;
    technicalDetails?: string;
    severity?: ErrorSeverity;
  }) => {
    setState({
      isOpen: true,
      title: options.title || "Something went wrong",
      message: options.message,
      technicalDetails: options.technicalDetails,
      severity: options.severity || "error",
    });
  }, []);

  const closeError = React.useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const ErrorModalComponent = React.useCallback(() => (
    <EpicErrorModal
      isOpen={state.isOpen}
      onClose={closeError}
      title={state.title}
      message={state.message}
      technicalDetails={state.technicalDetails}
      severity={state.severity}
    />
  ), [state, closeError]);

  return { showError, closeError, ErrorModalComponent };
}

export type { ErrorSeverity, EpicErrorModalProps };
