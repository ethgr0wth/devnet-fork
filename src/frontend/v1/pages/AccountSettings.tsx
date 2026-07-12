import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  Sparkles, ArrowLeft, User, Mail, Lock, Shield, 
  Save, Eye, EyeOff, Check, AlertCircle, Loader2,
  Send, Link2 as Linkedin, GitBranch as Github  // V2 EDIT: brand icons removed from lucide; stand-ins
} from "lucide-react";
import TOTPSetupModal from "../components/TOTPSetupModal";
import { apiFetch } from "@/lib/queryClient";

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  plan: string;
  telegram_username?: string;
  twitter_handle?: string;
  linkedin_url?: string;
  github_url?: string;
}

export default function AccountSettings() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  
  const [telegramUsername, setTelegramUsername] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [isSavingSocial, setIsSavingSocial] = useState(false);
  const [socialMessage, setSocialMessage] = useState("");
  const [socialError, setSocialError] = useState("");
  
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [showTOTPModal, setShowTOTPModal] = useState(false);
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const res = await apiFetch("/api/user/me");
      if (!res.ok) {
        setLocation("/login");
        return;
      }
      const data = await res.json();
      setUser(data.user);
      setDisplayName(data.user.display_name || "");
      setEmail(data.user.email || "");
      setTelegramUsername(data.user.telegram_username || "");
      setTwitterHandle(data.user.twitter_handle || "");
      setLinkedinUrl(data.user.linkedin_url || "");
      setGithubUrl(data.user.github_url || "");
      
      const totpRes = await apiFetch("/api/user/totp/status");
      if (totpRes.ok) {
        const totpData = await totpRes.json();
        setTotpEnabled(totpData.enabled);
      }
      
    } catch (error) {
      console.error("Failed to load user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileMessage("");
    setProfileError("");
    
    try {
      const res = await apiFetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName, email })
      });
      
      if (res.ok) {
        setProfileMessage("Profile updated successfully");
        loadUser();
      } else {
        const data = await res.json();
        setProfileError(data.detail || "Failed to update profile");
      }
    } catch (error) {
      setProfileError("Connection error. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    
    setIsSavingPassword(true);
    setPasswordMessage("");
    setPasswordError("");
    
    try {
      const res = await apiFetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });
      
      if (res.ok) {
        setPasswordMessage("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json();
        setPasswordError(data.detail || "Failed to change password");
      }
    } catch (error) {
      setPasswordError("Connection error. Please try again.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSaveSocial = async () => {
    setIsSavingSocial(true);
    setSocialMessage("");
    setSocialError("");
    
    try {
      const res = await apiFetch("/api/user/social", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          telegram_username: telegramUsername,
          twitter_handle: twitterHandle,
          linkedin_url: linkedinUrl,
          github_url: githubUrl
        })
      });
      
      if (res.ok) {
        setSocialMessage("Social profiles updated");
        loadUser();
      } else {
        const data = await res.json();
        setSocialError(data.detail || "Failed to update social profiles");
      }
    } catch (error) {
      setSocialError("Connection error. Please try again.");
    } finally {
      setIsSavingSocial(false);
    }
  };

  const handleDisable2FA = async () => {
    setIsDisabling2FA(true);
    try {
      const res = await apiFetch("/api/user/totp/disable", {
        method: "POST"
      });
      if (res.ok) {
        setTotpEnabled(false);
      }
    } catch (error) {
      console.error("Failed to disable 2FA:", error);
    } finally {
      setIsDisabling2FA(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-white/10 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors" data-testid="link-back">
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
            </Link>
          </div>
          <Link href="/" className="flex items-center gap-2" data-testid="link-home">
              <img src="/favicon.png" alt="AiAssist" className="w-8 h-8 object-contain" />
              <span className="font-display font-bold">AiAssist <span className="text-cyan-400">SECURE</span></span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
          <p className="text-white/60">Manage your profile, security, and preferences</p>
        </motion.div>

        <div className="space-y-8">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <User className="w-5 h-5 text-cyan-400" />
              </div>
              <h2 className="text-xl font-semibold">Profile Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  data-testid="input-display-name"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500/50"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="input-email"
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500/50"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              
              {profileMessage && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                  <Check className="w-4 h-4" />
                  {profileMessage}
                </div>
              )}
              {profileError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {profileError}
                </div>
              )}
              
              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                data-testid="button-save-profile"
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-50"
              >
                {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Profile
              </button>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-violet-500/20 rounded-lg">
                <Lock className="w-5 h-5 text-violet-400" />
              </div>
              <h2 className="text-xl font-semibold">Change Password</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    data-testid="input-current-password"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500/50 pr-12"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    data-testid="input-new-password"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500/50 pr-12"
                    placeholder="Enter new password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  data-testid="input-confirm-password"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500/50"
                  placeholder="Confirm new password"
                />
              </div>
              
              {passwordMessage && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                  <Check className="w-4 h-4" />
                  {passwordMessage}
                </div>
              )}
              {passwordError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {passwordError}
                </div>
              )}
              
              <button
                onClick={handleChangePassword}
                disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
                data-testid="button-change-password"
                className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white font-semibold rounded-lg hover:bg-violet-400 transition-colors disabled:opacity-50"
              >
                {isSavingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Change Password
              </button>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-xl font-semibold">Two-Factor Authentication</h2>
            </div>

            <div className="space-y-4">
              <p className="text-white/60">
                Add an extra layer of security to your account by requiring a code from your authenticator app when signing in.
              </p>
              
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                <div className={`w-3 h-3 rounded-full ${totpEnabled ? "bg-emerald-400" : "bg-white/30"}`} />
                <div className="flex-1">
                  <p className="font-medium">{totpEnabled ? "2FA is enabled" : "2FA is not enabled"}</p>
                  <p className="text-sm text-white/60">
                    {totpEnabled 
                      ? "Your account is protected with two-factor authentication"
                      : "Enable 2FA to secure your account"
                    }
                  </p>
                </div>
                {totpEnabled ? (
                  <button
                    onClick={handleDisable2FA}
                    disabled={isDisabling2FA}
                    data-testid="button-disable-2fa"
                    className="px-4 py-2 bg-red-500/20 text-red-400 font-medium rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                  >
                    {isDisabling2FA ? <Loader2 className="w-4 h-4 animate-spin" /> : "Disable"}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowTOTPModal(true)}
                    data-testid="button-enable-2fa"
                    className="px-4 py-2 bg-emerald-500 text-black font-medium rounded-lg hover:bg-emerald-400 transition-colors"
                  >
                    Enable 2FA
                  </button>
                )}
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Send className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold">Social Profiles</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Telegram Username</label>
                <div className="relative">
                  <Send className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="text"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    data-testid="input-telegram"
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500/50"
                    placeholder="@username"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">X (Twitter) Handle</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 font-bold text-center">𝕏</span>
                  <input
                    type="text"
                    value={twitterHandle}
                    onChange={(e) => setTwitterHandle(e.target.value)}
                    data-testid="input-twitter"
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500/50"
                    placeholder="@handle"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">LinkedIn URL</label>
                <div className="relative">
                  <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    data-testid="input-linkedin"
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500/50"
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">GitHub URL</label>
                <div className="relative">
                  <Github className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    data-testid="input-github"
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500/50"
                    placeholder="https://github.com/username"
                  />
                </div>
              </div>
              
              {socialMessage && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                  <Check className="w-4 h-4" />
                  {socialMessage}
                </div>
              )}
              {socialError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {socialError}
                </div>
              )}
              
              <button
                onClick={handleSaveSocial}
                disabled={isSavingSocial}
                data-testid="button-save-social"
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-400 transition-colors disabled:opacity-50"
              >
                {isSavingSocial ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Social Profiles
              </button>
            </div>
          </motion.section>
        </div>
      </main>

      <TOTPSetupModal
        isOpen={showTOTPModal}
        onClose={() => setShowTOTPModal(false)}
        onComplete={() => {
          setShowTOTPModal(false);
          setTotpEnabled(true);
        }}
        userEmail={user?.email || ""}
      />
    </div>
  );
}
