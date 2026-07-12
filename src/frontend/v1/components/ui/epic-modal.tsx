import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, Archive, Power, XCircle, CheckCircle, Info, X } from "lucide-react";

type ModalVariant = "danger" | "warning" | "info" | "success";

interface EpicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ModalVariant;
  icon?: "trash" | "archive" | "power" | "warning" | "info" | "success";
  isLoading?: boolean;
}

const variantConfig = {
  danger: {
    gradient: "from-red-500/20 via-red-600/10 to-transparent",
    border: "border-red-500/30",
    glow: "shadow-[0_0_60px_rgba(239,68,68,0.15)]",
    buttonBg: "bg-red-500/20 hover:bg-red-500/30 border-red-500/40 hover:border-red-500/60",
    buttonText: "text-red-400",
    iconColor: "text-red-400",
    ring: "from-red-500/20 to-red-600/5",
  },
  warning: {
    gradient: "from-amber-500/20 via-amber-600/10 to-transparent",
    border: "border-amber-500/30",
    glow: "shadow-[0_0_60px_rgba(245,158,11,0.15)]",
    buttonBg: "bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 hover:border-amber-500/60",
    buttonText: "text-amber-400",
    iconColor: "text-amber-400",
    ring: "from-amber-500/20 to-amber-600/5",
  },
  info: {
    gradient: "from-cyan-500/20 via-cyan-600/10 to-transparent",
    border: "border-cyan-500/30",
    glow: "shadow-[0_0_60px_rgba(34,211,238,0.15)]",
    buttonBg: "bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/40 hover:border-cyan-500/60",
    buttonText: "text-cyan-400",
    iconColor: "text-cyan-400",
    ring: "from-cyan-500/20 to-cyan-600/5",
  },
  success: {
    gradient: "from-emerald-500/20 via-emerald-600/10 to-transparent",
    border: "border-emerald-500/30",
    glow: "shadow-[0_0_60px_rgba(16,185,129,0.15)]",
    buttonBg: "bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40 hover:border-emerald-500/60",
    buttonText: "text-emerald-400",
    iconColor: "text-emerald-400",
    ring: "from-emerald-500/20 to-emerald-600/5",
  },
};

const iconComponents = {
  trash: Trash2,
  archive: Archive,
  power: Power,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
};

export function EpicModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  icon = "warning",
  isLoading = false,
}: EpicModalProps) {
  const config = variantConfig[variant];
  const IconComponent = iconComponents[icon];

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

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
            className={`relative z-10 w-full max-w-md mx-4 ${config.glow}`}
          >
            <div className={`relative overflow-hidden rounded-2xl border ${config.border} bg-[#0a0f1a]`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} pointer-events-none`} />
              
              <div className="absolute inset-0 opacity-[0.02]" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }} />

              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-all duration-200 z-20"
                data-testid="modal-close"
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
                    className="text-xl font-semibold text-white mb-2"
                  >
                    {title}
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-white/60 text-sm leading-relaxed max-w-sm"
                  >
                    {description}
                  </motion.p>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="flex gap-3 mt-8"
                >
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="flex-1 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/10 hover:border-white/20 hover:text-white transition-all duration-200 disabled:opacity-50"
                    data-testid="modal-cancel"
                  >
                    {cancelText}
                  </button>
                  <button
                    onClick={onConfirm}
                    disabled={isLoading}
                    className={`flex-1 px-5 py-3 rounded-xl border ${config.buttonBg} ${config.buttonText} text-sm font-medium transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2`}
                    data-testid="modal-confirm"
                  >
                    {isLoading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                        />
                        Processing...
                      </>
                    ) : (
                      confirmText
                    )}
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

export function useEpicModal() {
  const [modalState, setModalState] = React.useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
    variant: ModalVariant;
    icon: "trash" | "archive" | "power" | "warning" | "info" | "success";
    onConfirm: () => void;
    isLoading: boolean;
  }>({
    isOpen: false,
    title: "",
    description: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    variant: "danger",
    icon: "warning",
    onConfirm: () => {},
    isLoading: false,
  });

  const showModal = React.useCallback((options: {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ModalVariant;
    icon?: "trash" | "archive" | "power" | "warning" | "info" | "success";
    onConfirm: () => void;
  }) => {
    setModalState({
      isOpen: true,
      title: options.title,
      description: options.description,
      confirmText: options.confirmText || "Confirm",
      cancelText: options.cancelText || "Cancel",
      variant: options.variant || "danger",
      icon: options.icon || "warning",
      onConfirm: options.onConfirm,
      isLoading: false,
    });
  }, []);

  const closeModal = React.useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const setLoading = React.useCallback((loading: boolean) => {
    setModalState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const ModalComponent = React.useCallback(() => (
    <EpicModal
      isOpen={modalState.isOpen}
      onClose={closeModal}
      onConfirm={() => {
        modalState.onConfirm();
      }}
      title={modalState.title}
      description={modalState.description}
      confirmText={modalState.confirmText}
      cancelText={modalState.cancelText}
      variant={modalState.variant}
      icon={modalState.icon}
      isLoading={modalState.isLoading}
    />
  ), [modalState, closeModal]);

  return { showModal, closeModal, setLoading, ModalComponent };
}
