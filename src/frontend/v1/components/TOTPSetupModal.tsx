import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Smartphone, Check, Copy, AlertCircle, Delete } from "lucide-react";
import { apiFetch } from "@/lib/queryClient";

interface TOTPSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (backupCodes: string[]) => void;
  userEmail: string;
}

export default function TOTPSetupModal({ isOpen, onClose, onComplete, userEmail }: TOTPSetupModalProps) {
  const [step, setStep] = useState<"intro" | "scan" | "verify" | "backup">("intro");
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [secret, setSecret] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);

  useEffect(() => {
    if (isOpen && step === "scan" && !secret) {
      generateSecret();
    }
  }, [isOpen, step]);

  const generateSecret = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/user/totp/setup", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setSecret(data.secret);
        setQrCode(data.qr_code);
        setBackupCodes(data.backup_codes || []);
      } else {
        setError("Failed to generate 2FA secret");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = useCallback((digit: string) => {
    if (verifySuccess) return;
    
    setError("");
    setCode(prev => {
      const newCode = [...prev];
      const emptyIndex = newCode.findIndex(d => d === "");
      if (emptyIndex !== -1) {
        newCode[emptyIndex] = digit;
      }
      return newCode;
    });
  }, [verifySuccess]);

  const handleBackspace = useCallback(() => {
    if (verifySuccess) return;
    
    setCode(prev => {
      const newCode = [...prev];
      const lastFilledIndex = newCode.map((d, i) => d !== "" ? i : -1).filter(i => i !== -1).pop();
      if (lastFilledIndex !== undefined && lastFilledIndex >= 0) {
        newCode[lastFilledIndex] = "";
      }
      return newCode;
    });
  }, [verifySuccess]);

  useEffect(() => {
    const fullCode = code.join("");
    if (fullCode.length === 6 && step === "verify" && !isVerifying && !verifySuccess) {
      verifyCode(fullCode);
    }
  }, [code, step, isVerifying, verifySuccess]);

  const verifyCode = async (fullCode: string) => {
    setIsVerifying(true);
    setError("");
    
    try {
      const res = await apiFetch("/api/user/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: fullCode }),
      });
      
      if (res.ok) {
        setVerifySuccess(true);
        setTimeout(() => {
          setStep("backup");
        }, 1000);
      } else {
        setError("Invalid code. Please try again.");
        setCode(["", "", "", "", "", ""]);
      }
    } catch (err) {
      setError("Connection error. Please try again.");
      setCode(["", "", "", "", "", ""]);
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = async (text: string, type: "secret" | "backup") => {
    await navigator.clipboard.writeText(text);
    if (type === "secret") {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2000);
    }
  };

  const handleComplete = () => {
    onComplete(backupCodes);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-6 pb-4 border-b border-white/10">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
              data-testid="button-close-totp"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Two-Factor Authentication</h2>
                <p className="text-sm text-white/60">Secure your account</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {step === "intro" && (
                <motion.div
                  key="intro"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                      <Smartphone className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Add Extra Security</h3>
                    <p className="text-white/60 text-sm">
                      Use an authenticator app like Google Authenticator or Authy to generate verification codes.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {["Protect against unauthorized access", "Required for sensitive actions", "Works even without internet"].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <Check className="w-3 h-3 text-emerald-400" />
                        </div>
                        <span className="text-white/70">{item}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setStep("scan")}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-2xl hover:opacity-90 transition-opacity"
                    data-testid="button-start-2fa"
                  >
                    Get Started
                  </button>
                </motion.div>
              )}

              {step === "scan" && (
                <motion.div
                  key="scan"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-white/60 mt-4">Generating your secret...</p>
                    </div>
                  ) : (
                    <>
                      <div className="text-center space-y-4">
                        <p className="text-white/60 text-sm">
                          Scan this QR code with your authenticator app
                        </p>
                        
                        {qrCode && (
                          <div className="bg-white p-4 rounded-2xl mx-auto w-fit">
                            <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs text-white/40 text-center">Or enter this code manually:</p>
                        <div className="flex items-center gap-2 bg-white/5 rounded-xl p-3">
                          <code className="flex-1 text-sm text-emerald-400 font-mono break-all">{secret}</code>
                          <button
                            onClick={() => copyToClipboard(secret, "secret")}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            data-testid="button-copy-secret"
                          >
                            {copiedSecret ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/60" />}
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => setStep("verify")}
                        className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-2xl hover:opacity-90 transition-opacity"
                        data-testid="button-continue-verify"
                      >
                        Continue
                      </button>
                    </>
                  )}
                </motion.div>
              )}

              {step === "verify" && (
                <motion.div
                  key="verify"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-white">Enter Verification Code</h3>
                    <p className="text-white/60 text-sm">
                      Enter the 6-digit code from your authenticator app
                    </p>
                  </div>

                  {/* Code Display */}
                  <div className="flex justify-center gap-2">
                    {code.map((digit, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          scale: digit ? 1.05 : 1,
                          borderColor: verifySuccess ? "rgb(52, 211, 153)" : digit ? "rgb(6, 182, 212)" : "rgba(255,255,255,0.1)"
                        }}
                        className="w-12 h-14 rounded-xl border-2 bg-white/5 flex items-center justify-center"
                      >
                        <span className="text-2xl font-bold text-white">
                          {digit || (
                            <span className="text-white/20">•</span>
                          )}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm justify-center">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  {verifySuccess && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-2 text-emerald-400 text-sm justify-center"
                    >
                      <Check className="w-5 h-5" />
                      <span className="font-medium">Verified successfully!</span>
                    </motion.div>
                  )}

                  {/* iPhone-style Keypad */}
                  <div className="space-y-3">
                    {/* Row 1: 1-2-3 */}
                    <div className="flex justify-center gap-4">
                      {["1", "2", "3"].map((digit) => (
                        <KeypadButton key={digit} digit={digit} onPress={handleKeyPress} disabled={isVerifying || verifySuccess} />
                      ))}
                    </div>
                    {/* Row 2: 4-5-6 */}
                    <div className="flex justify-center gap-4">
                      {["4", "5", "6"].map((digit) => (
                        <KeypadButton key={digit} digit={digit} onPress={handleKeyPress} disabled={isVerifying || verifySuccess} />
                      ))}
                    </div>
                    {/* Row 3: 7-8-9 */}
                    <div className="flex justify-center gap-4">
                      {["7", "8", "9"].map((digit) => (
                        <KeypadButton key={digit} digit={digit} onPress={handleKeyPress} disabled={isVerifying || verifySuccess} />
                      ))}
                    </div>
                    {/* Row 4: (empty) - 0 - (backspace) */}
                    <div className="flex justify-center gap-4">
                      <div className="w-20 h-14" /> {/* Empty spacer */}
                      <KeypadButton digit="0" onPress={handleKeyPress} disabled={isVerifying || verifySuccess} />
                      <button
                        onClick={handleBackspace}
                        disabled={isVerifying || verifySuccess}
                        className="w-20 h-14 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                        data-testid="button-keypad-backspace"
                      >
                        <Delete className="w-6 h-6 text-white/60" />
                      </button>
                    </div>
                  </div>

                  {isVerifying && (
                    <div className="flex justify-center">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </motion.div>
              )}

              {step === "backup" && (
                <motion.div
                  key="backup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                      <Check className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">2FA Enabled!</h3>
                    <p className="text-white/60 text-sm">
                      Save these backup codes in a safe place. You'll need them if you lose access to your authenticator.
                    </p>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-4 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {backupCodes.map((code, i) => (
                        <div key={i} className="font-mono text-sm text-white/80 bg-white/5 rounded-lg px-3 py-2 text-center">
                          {code}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => copyToClipboard(backupCodes.join("\n"), "backup")}
                      className="w-full mt-3 py-2 bg-white/10 rounded-xl text-sm text-white/70 hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                      data-testid="button-copy-backup"
                    >
                      {copiedBackup ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copiedBackup ? "Copied!" : "Copy All Codes"}
                    </button>
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-sm text-amber-400">
                    <strong>Important:</strong> Each backup code can only be used once. Store them securely!
                  </div>

                  <button
                    onClick={handleComplete}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-2xl hover:opacity-90 transition-opacity"
                    data-testid="button-complete-2fa"
                  >
                    Done
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function KeypadButton({ digit, onPress, disabled }: { digit: string; onPress: (d: string) => void; disabled?: boolean }) {
  return (
    <motion.button
      onClick={() => onPress(digit)}
      disabled={disabled}
      whileTap={{ scale: 0.9 }}
      className="w-20 h-14 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-2xl font-semibold transition-all active:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
      data-testid={`button-keypad-${digit}`}
    >
      {digit}
    </motion.button>
  );
}
