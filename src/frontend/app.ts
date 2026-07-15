import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { mountAios, unmountAios } from './aios/AiosShell';
import { pickLandingEcosystem, ACTIVE_ECOSYSTEM_KEY } from './ecosystem-landing';
import {
  normalizeMode, composerPlaceholder, renderOperatorBar, renderDrafts, renderWsSettings,
} from './aiasConsole';

marked.setOptions({
  breaks: true,
  gfm: true
});

function parseContent(content: string): string {
  const codeBlocks: string[] = [];
  let preserved = content.replace(/```[\s\S]*?```/g, (m) => {
    codeBlocks.push(m);
    return `%%CODEBLOCK_${codeBlocks.length - 1}%%`;
  });
  const inlineCodes: string[] = [];
  preserved = preserved.replace(/`[^`]+`/g, (m) => {
    inlineCodes.push(m);
    return `%%INLINECODE_${inlineCodes.length - 1}%%`;
  });

  preserved = preserved
    .replace(/@([a-zA-Z0-9_]+)/g, '<a href="#" class="mention" data-mention="$1">@$1</a>')
    .replace(/#([a-zA-Z0-9_]+)/g, '<a href="#" class="hashtag" data-tag="$1">#$1</a>');

  inlineCodes.forEach((code, i) => {
    preserved = preserved.replace(`%%INLINECODE_${i}%%`, code);
  });
  codeBlocks.forEach((code, i) => {
    preserved = preserved.replace(`%%CODEBLOCK_${i}%%`, code);
  });

  const html = marked.parse(preserved) as string;
  return DOMPurify.sanitize(html, { ADD_ATTR: ['data-mention', 'data-tag'], ADD_TAGS: ['img'], ADD_URI_SAFE_ATTR: ['src'] });
}

function showToast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
  const toast = document.createElement('div');
  const colors = {
    success: { bg: 'rgba(16,185,129,0.15)', border: '#10b981', text: '#34d399', icon: 'M5 13l4 4L19 7' },
    error: { bg: 'rgba(16,185,129,0.15)', border: '#059669', text: '#f87171', icon: 'M6 18L18 6M6 6l12 12' },
    info: { bg: 'rgba(59,130,246,0.15)', border: '#3b82f6', text: '#60a5fa', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
  };
  const c = colors[type];
  toast.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 99999;
    background: ${c.bg}; backdrop-filter: blur(20px);
    border: 1px solid ${c.border}; border-radius: 12px;
    padding: 12px 20px; display: flex; align-items: center; gap: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4); max-width: 400px;
    animation: toastSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    font-family: system-ui, -apple-system, sans-serif;
  `;
  toast.innerHTML = `
    <style>
      @keyframes toastSlideIn { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes toastSlideOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100px); } }
    </style>
    <svg width="18" height="18" fill="none" stroke="${c.text}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="${c.icon}"/></svg>
    <span style="color: ${c.text}; font-size: 13px; font-weight: 600;">${message}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastSlideOut 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

type ModalType = 'error' | 'success' | 'warning' | 'info';

function showEpicModal(message: string, type: ModalType = 'info', title?: string): void {
  const existingModal = document.getElementById('epic-modal-overlay');
  if (existingModal) existingModal.remove();

  const colors = {
    error: { bg: '#059669', glow: 'rgba(16,185,129,0.5)', icon: 'M6 18L18 6M6 6l12 12' },
    success: { bg: '#10b981', glow: 'rgba(16,185,129,0.5)', icon: 'M5 13l4 4L19 7' },
    warning: { bg: '#f59e0b', glow: 'rgba(245,158,11,0.5)', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    info: { bg: '#3b82f6', glow: 'rgba(59,130,246,0.5)', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
  };

  const config = colors[type];
  const modalTitle = title || (type === 'error' ? 'Error' : type === 'success' ? 'Success' : type === 'warning' ? 'Warning' : 'Notice');

  const overlay = document.createElement('div');
  overlay.id = 'epic-modal-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center; z-index: 9999;
    animation: epicFadeIn 0.3s ease-out;
  `;

  overlay.innerHTML = `
    <style>
      @keyframes epicFadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes epicSlideUp { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes epicPulse { 0%, 100% { box-shadow: 0 0 20px ${config.glow}; } 50% { box-shadow: 0 0 40px ${config.glow}, 0 0 60px ${config.glow}; } }
      @keyframes epicIconPop { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
    </style>
    <div style="
      background: linear-gradient(145deg, #1f1f23, #18181b);
      border: 1px solid #3f3f46;
      border-radius: 24px;
      padding: 32px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      animation: epicSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5), 0 0 30px ${config.glow};
    ">
      <div style="
        width: 72px; height: 72px; border-radius: 50%; margin: 0 auto 20px;
        background: linear-gradient(135deg, ${config.bg}, ${config.bg}cc);
        display: flex; align-items: center; justify-content: center;
        animation: epicIconPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both, epicPulse 2s ease-in-out infinite;
        box-shadow: 0 8px 32px ${config.glow};
      ">
        <svg width="36" height="36" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
          <path d="${config.icon}"/>
        </svg>
      </div>
      <h3 style="color: #fafafa; font-size: 22px; font-weight: 700; margin: 0 0 12px; letter-spacing: -0.5px;">${modalTitle}</h3>
      <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">${message}</p>
      <button id="epic-modal-close" style="
        background: linear-gradient(135deg, ${config.bg}, ${config.bg}dd);
        color: white; border: none; padding: 14px 48px; border-radius: 12px;
        font-size: 15px; font-weight: 600; cursor: pointer;
        transition: all 0.2s ease; box-shadow: 0 4px 20px ${config.glow};
      " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 30px ${config.glow}';"
         onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 20px ${config.glow}';">
        Got it
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeBtn = document.getElementById('epic-modal-close');
  const closeModal = () => {
    overlay.style.animation = 'epicFadeIn 0.2s ease-out reverse';
    setTimeout(() => overlay.remove(), 200);
  };
  closeBtn?.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); }
  });
}

interface AppState {
  mode: "loading" | "wizard" | "app";
  user: User | null;
  hash: string | null;
}

interface User {
  id: string;
  displayName: string;
  bio: string;
  field: string;
  experience: string;
  skills: string[];
  focus: string;
  teamPreference: string;
  talents: string[];
  createdAt: string;
}

interface WizardState {
  sessionId: string;
  phase: "intro" | "qualifier" | "challenge" | "complete";
  qualifierStep: number;
  challengeStep: number;
  profile: UserProfile;
  talents: string[];
  answers: string[];
}

interface UserProfile {
  field: string;
  experience: string;
  skills: string[];
  focus: string;
  interests: string[];
  teamSize: string;
}

interface QualifierQuestion {
  id: string;
  question: string;
  options: { label: string; value: string }[];
  multiSelect?: boolean;
}

const STORAGE_KEY = "devnetwork_hash";
const DEVICE_TOKEN_KEY = "devnetwork_device_token";

const QUALIFIER_QUESTIONS: QualifierQuestion[] = [
  {
    id: "field",
    question: "What best describes you?",
    options: [
      { label: "Founder / CEO", value: "founder" },
      { label: "Developer / Engineer", value: "developer" },
      { label: "Designer / Creative", value: "designer" },
      { label: "Marketer / Growth", value: "marketer" },
      { label: "Product Manager", value: "product" },
      { label: "Freelancer / Agency", value: "freelancer" }
    ]
  },
  {
    id: "experience",
    question: "Where are you on your journey?",
    options: [
      { label: "Just getting started — exploring ideas", value: "exploring" },
      { label: "Building my first product", value: "building" },
      { label: "Shipped something, finding PMF", value: "shipped" },
      { label: "Scaling — revenue or team growing", value: "scaling" }
    ]
  },
  {
    id: "skills",
    question: "What's in your toolkit? (pick all that apply)",
    multiSelect: true,
    options: [
      { label: "Full-Stack Development", value: "fullstack" },
      { label: "Frontend / UI", value: "frontend" },
      { label: "Backend / APIs", value: "backend" },
      { label: "Mobile Apps", value: "mobile" },
      { label: "AI / Machine Learning", value: "ai" },
      { label: "UI/UX Design", value: "design" },
      { label: "No-Code / Low-Code", value: "nocode" },
      { label: "Growth & Marketing", value: "growth" },
      { label: "Sales & Biz Dev", value: "sales" },
      { label: "Content & Copywriting", value: "content" },
      { label: "DevOps / Cloud", value: "devops" },
      { label: "Data & Analytics", value: "data" }
    ]
  },
  {
    id: "focus",
    question: "What are you here for?",
    options: [
      { label: "Find a co-founder or teammates", value: "cofounder" },
      { label: "Get feedback on what I'm building", value: "feedback" },
      { label: "Connect with other builders", value: "network" },
      { label: "Find clients or freelance gigs", value: "clients" }
    ]
  },
  {
    id: "interests",
    question: "What fires you up? (pick all that apply)",
    multiSelect: true,
    options: [
      { label: "SaaS & Micro-SaaS", value: "saas" },
      { label: "Indie Hacking", value: "indiehacking" },
      { label: "AI Products & Tools", value: "ai-products" },
      { label: "Developer Tools", value: "devtools" },
      { label: "E-Commerce / DTC", value: "ecommerce" },
      { label: "Content Creation", value: "content" },
      { label: "Open Source", value: "opensource" },
      { label: "Web3 / Crypto", value: "web3" },
      { label: "Building in Public", value: "buildinpublic" },
      { label: "Revenue & Monetization", value: "revenue" },
      { label: "Fundraising & VCs", value: "fundraising" },
      { label: "Remote & Async Work", value: "remote" }
    ]
  },
  {
    id: "teamSize",
    question: "How do you like to build?",
    options: [
      { label: "Solo — I do everything myself", value: "solo" },
      { label: "Small crew (2-4 people)", value: "small" },
      { label: "Growing team (5-15)", value: "medium" },
      { label: "I'm flexible", value: "any" }
    ]
  }
];

const DEV_PUZZLES = [
  {
    question: "You have a startup idea at 2am. First thing you do?",
    options: ["Open VS Code and start building a prototype 💻", "Write down the value prop and target market 📝", "Search if someone already built it 🔍"],
    hint: "This reveals how you think...",
    forFields: ["software", "design", "marketing", "data", "product", "devops"]
  },
  {
    question: "Your MVP is ready but the code is messy. You...",
    options: ["Ship it now, refactor later — users first 🚀", "Clean the codebase before anyone sees it 🧹", "Get 5 users to test it while I fix things in parallel ⚡"],
    hint: "Speed vs. craft...",
    forFields: ["software", "design", "marketing", "data", "product", "devops"]
  },
  {
    question: "A co-founder disagrees on the product direction. You...",
    options: ["Show them the data and let numbers decide 📊", "Prototype both ideas and A/B test with users 🧪", "Have a deep conversation about the vision and align 🤝"],
    hint: "How you resolve conflict matters...",
    forFields: ["software", "design", "marketing", "data", "product", "devops"]
  },
  {
    question: "You just got your first 100 users. Next move?",
    options: ["Talk to every single user to understand their pain 🎯", "Build the features they're asking for ASAP 🏗️", "Write a launch thread and start building in public 📣"],
    hint: "Growth mode activated...",
    forFields: ["software", "design", "marketing", "data", "product", "devops"]
  },
  {
    question: "What's your unfair advantage as a builder?",
    options: ["I can ship a full product solo — design to deploy 🛠️", "I understand users better than most engineers do 🧠", "I can get people excited about anything I'm building 🔥"],
    hint: "Everyone's got one...",
    forFields: ["software", "design", "marketing", "data", "product", "devops"]
  }
];

const MARKETING_PUZZLES = DEV_PUZZLES;

const PRODUCT_PUZZLES = DEV_PUZZLES;

const DATA_PUZZLES = DEV_PUZZLES;

class DevNetwork {
  private appState: AppState;
  private wizardState: WizardState | null = null;
  private container: HTMLElement;
  private selectedSkills: string[] = [];
  private feedSocket: WebSocket | null = null;
  private posts: any[] = [];
  private _notifDebounce: ReturnType<typeof setTimeout> | null = null;
  private _currentView: string = "";
  private activeEcosystem: { id: string; name: string; slug: string; icon: string; accent_color: string; description: string } | null = null;
  private userEcosystems: any[] = [];
  private defaultEcosystemId: string = "";

  constructor() {
    this.appState = {
      mode: "loading",
      user: null,
      hash: null
    };
    this.container = document.getElementById("wizard-container") || document.getElementById("main-content")!;
    this.init();
  }

  private setContent(html: string, viewName?: string): void {
    if (viewName) this._currentView = viewName;
    this.container.scrollTop = 0;
    this.container.innerHTML = html;
  }

  private async init(): Promise<void> {
    try {
      const cfgRes = await fetch("/api/config");
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        this.defaultEcosystemId = cfg.default_ecosystem_id || "";
      }
    } catch {}
    const storedHash = localStorage.getItem(STORAGE_KEY);
    
    if (storedHash) {
      const result = await this.validateHash(storedHash);
      if (result.requires_2fa) {
        this.showLogin2FA(storedHash);
        return;
      }
      if (result.user) {
        this.appState = { mode: "app", user: result.user, hash: storedHash };
        this.showApp();
        this.showAiosDesktop();
        return;
      }
      localStorage.removeItem(STORAGE_KEY);
    }

    // AiAS v1.2: the entry flow is the v1-style auth landing, not the
    // fingerprint questionnaire (wizard code kept dormant for parity).
    this.appState.mode = "wizard";
    this.showAuthLanding("login");
  }

  private async validateHash(hash: string, totpCode?: string): Promise<{user: User | null, requires_2fa?: boolean}> {
    try {
      const deviceToken = localStorage.getItem(DEVICE_TOKEN_KEY);
      const res = await fetch("/api/auth/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash, totp_code: totpCode, device_token: deviceToken })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.requires_2fa) {
          return { user: null, requires_2fa: true };
        }
        return { user: data.user };
      }
    } catch (e) {
      console.error("Auth validation failed:", e);
    }
    return { user: null };
  }

  private showLogin2FA(hash: string): void {
    this.container.innerHTML = `
      <div class="max-w-md mx-auto px-3 sm:px-4 py-6 sm:py-12" style="height:100dvh;height:100vh;overflow-y:auto;-webkit-overflow-scrolling:touch;">
        <div class="card slide-up holo-outline">
          <div class="text-center mb-4 sm:mb-6">
            <img src="/static/favicon.png" alt="AiAssist Secure" style="height:48px;object-fit:contain;margin:0 auto 10px;display:block;filter:drop-shadow(0 0 16px rgba(6,182,212,0.5)) drop-shadow(0 0 6px rgba(139,92,246,0.3));">
            <div class="mb-1" style="letter-spacing:-0.02em;">
              <span class="text-xl sm:text-2xl font-bold text-white">Ai</span><span class="text-xl sm:text-2xl ace-text-shimmer-load" style="font-weight:300;">Assist</span>
            </div>
            <div class="flex items-center justify-center gap-2 mb-3">
              <span style="height:1px;width:40px;background:linear-gradient(90deg,transparent,rgba(6,182,212,0.4),transparent);"></span>
              <span class="ace-text-shimmer-load text-[10px] font-semibold uppercase" style="letter-spacing:0.35em;">Secure</span>
              <span style="height:1px;width:40px;background:linear-gradient(90deg,transparent,rgba(139,92,246,0.4),transparent);"></span>
            </div>
            <h2 class="text-xl sm:text-2xl font-bold gradient-text">Welcome Back</h2>
            <p class="text-zinc-400 mt-1 text-sm">Enter your 2FA code to continue</p>
          </div>
          
          <form id="login-2fa-form" class="space-y-3 sm:space-y-4">
            <div>
              <label class="block text-sm font-medium text-zinc-400 mb-2">6-digit code from your authenticator app</label>
              <input type="text" id="login-totp-code" name="code" 
                class="input text-center text-xl sm:text-2xl tracking-[0.4em] sm:tracking-[0.5em] font-mono" 
                placeholder="000000" maxlength="6" pattern="[0-9]{6}" 
                autocomplete="one-time-code" inputmode="numeric" required>
            </div>
            <p id="login-2fa-error" class="text-sm text-red-400 hidden"></p>
            <button type="submit" class="btn btn-primary w-full py-2.5 sm:py-3">
              Sign In
            </button>
          </form>
          
          <div class="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-zinc-700/50 text-center">
            <button id="use-different-device" class="text-sm text-zinc-500 hover:text-zinc-300">
              Use a different account
            </button>
          </div>
        </div>
        <div style="height:2rem;"></div>
      </div>
    `;

    const form = document.getElementById("login-2fa-form") as HTMLFormElement;
    const codeInput = document.getElementById("login-totp-code") as HTMLInputElement;
    
    codeInput.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      target.value = target.value.replace(/\D/g, "").slice(0, 6);
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = codeInput.value;
      const errorEl = document.getElementById("login-2fa-error")!;
      const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      
      if (code.length !== 6) {
        errorEl.textContent = "Please enter a 6-digit code";
        errorEl.classList.remove("hidden");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<svg class="w-5 h-5 animate-spin mx-auto" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>`;
      errorEl.classList.add("hidden");

      try {
        const response = await fetch("/api/auth/verify-login-2fa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hash, code })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          // Store device token to skip 2FA on page refresh
          if (data.device_token) {
            localStorage.setItem(DEVICE_TOKEN_KEY, data.device_token);
          }
          this.appState = { mode: "app", user: data.user, hash };
          this.showApp();
        } else {
          throw new Error(data.error || "Invalid code");
        }
      } catch (err: any) {
        errorEl.textContent = err.message || "Invalid code. Please try again.";
        errorEl.classList.remove("hidden");
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg> Sign In`;
        codeInput.value = "";
        codeInput.focus();
      }
    });

    document.getElementById("use-different-device")?.addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(DEVICE_TOKEN_KEY);
      this.appState.mode = "wizard";
      this.showAuthLanding("login");
    });

    codeInput.focus();
  }

  private generateSessionId(): string {
    return "session_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }

  private async getFingerprint(): Promise<string> {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("DevNetwork fingerprint", 2, 2);
    const canvasData = canvas.toDataURL();

    const screenData = `${screen.width}x${screen.height}x${screen.colorDepth}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    const platform = navigator.platform;

    const raw = `${canvasData}|${screenData}|${timezone}|${language}|${platform}`;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── AiAS v1.2 front door: email + password (+ TOTP) sessions ──────────────
  // Replaces the fingerprint questionnaire as the entry flow (Mark,
  // 2026-07-12). Session tokens ride the same X-Auth-Hash header the whole
  // app already sends, so nothing beyond auth changes.

  private showAuthLanding(mode: "login" | "signup" = "login"): void {
    const isLogin = mode === "login";
    this.container.innerHTML = `
      <div class="relative flex items-center justify-center px-3 sm:px-4" style="height:100dvh;height:100vh;overflow-y:auto;-webkit-overflow-scrolling:touch;">
        <video autoplay muted loop playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;"></video>
        <div class="absolute inset-0 bg-zinc-950/80" style="z-index:1;"></div>

        <div class="max-w-md w-full relative py-4 sm:py-6" style="z-index:3;">
          <div class="slide-up relative overflow-hidden backdrop-blur-md rounded-xl p-5 sm:p-7 holo-outline">
            <div class="text-center mb-5">
              <div class="relative inline-flex items-center justify-center mb-3">
                <div class="absolute bg-cyan-500 rounded-2xl blur-xl opacity-25 animate-pulse" style="width:72px;height:72px;"></div>
                <img src="/static/favicon.png" alt="AiAssist Secure" class="relative" style="height:56px;object-fit:contain;filter:drop-shadow(0 0 16px rgba(6,182,212,0.5)) drop-shadow(0 0 6px rgba(139,92,246,0.3));">
              </div>
              <h1 class="text-2xl sm:text-3xl mb-1" style="letter-spacing:-0.02em;">
                <span class="font-bold text-white">Ai</span><span class="ace-text-shimmer-load" style="font-weight:300;">Assist</span>
              </h1>
              <div class="flex items-center justify-center gap-2 mb-2">
                <span style="height:1px;width:40px;background:linear-gradient(90deg,transparent,rgba(6,182,212,0.4),transparent);"></span>
                <span class="ace-text-shimmer-load text-[10px] font-semibold uppercase" style="letter-spacing:0.35em;">Secure</span>
                <span style="height:1px;width:40px;background:linear-gradient(90deg,transparent,rgba(139,92,246,0.4),transparent);"></span>
              </div>
              <p class="text-zinc-400 text-sm">Your team — human and AI — in one space.</p>
            </div>

            <div class="grid grid-cols-2 gap-1 mb-5 p-1 rounded-lg bg-zinc-800/60 border border-zinc-700/40">
              <button id="auth-tab-login" class="py-2 rounded-md text-sm font-semibold transition-colors ${isLogin ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-200"}">Sign in</button>
              <button id="auth-tab-signup" class="py-2 rounded-md text-sm font-semibold transition-colors ${!isLogin ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-200"}">Create account</button>
            </div>

            <form id="auth-form" class="space-y-3 text-left">
              ${!isLogin ? `
              <div>
                <label class="block text-xs font-medium text-zinc-400 mb-1">Display name</label>
                <input type="text" name="display_name" class="input" placeholder="How should the team know you?" required minlength="2" maxlength="32" autocomplete="nickname" />
              </div>` : ""}
              <div>
                <label class="block text-xs font-medium text-zinc-400 mb-1">Email</label>
                <input type="email" name="email" class="input" placeholder="you@company.com" required autocomplete="${isLogin ? "email" : "email"}" />
              </div>
              <div>
                <label class="block text-xs font-medium text-zinc-400 mb-1">Password</label>
                <input type="password" name="password" class="input" placeholder="${isLogin ? "Your password" : "At least 8 characters"}" required minlength="8" autocomplete="${isLogin ? "current-password" : "new-password"}" />
              </div>
              <p id="auth-error" class="hidden text-sm text-red-400"></p>
              <button type="submit" id="auth-submit" class="btn btn-gradient w-full text-base py-3">
                ${isLogin ? "Sign in" : "Create account"}
              </button>
            </form>

            <p class="mt-4 text-center text-[11px] text-zinc-500">AiAS v1.2 · powered by NEDB · Interchained</p>
          </div>
        </div>
      </div>
    `;

    const bgVideo = this.container.querySelector("video");
    if (bgVideo) {
      const s = document.createElement("source");
      s.src = "/static/devnet-intro.mp4";
      s.type = "video/mp4";
      bgVideo.appendChild(s);
      bgVideo.load();
    }

    document.getElementById("auth-tab-login")!.addEventListener("click", () => this.showAuthLanding("login"));
    document.getElementById("auth-tab-signup")!.addEventListener("click", () => this.showAuthLanding("signup"));

    document.getElementById("auth-form")!.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const fd = new FormData(form);
      const btn = document.getElementById("auth-submit") as HTMLButtonElement;
      btn.disabled = true;
      btn.textContent = isLogin ? "Signing in…" : "Creating account…";
      try {
        const body: Record<string, string> = {
          email: String(fd.get("email") || ""),
          password: String(fd.get("password") || ""),
        };
        if (!isLogin) body.display_name = String(fd.get("display_name") || "");
        const res = await fetch(isLogin ? "/api/auth/login" : "/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.requires_2fa && data.pending_token) {
          this.showAuthTwoFactor(data.pending_token);
          return;
        }
        if (res.ok && data.success && data.session_token) {
          localStorage.setItem(STORAGE_KEY, data.session_token);
          this.appState = { mode: "app", user: data.user, hash: data.session_token };
          this.showApp();
          this.showAiosDesktop();
          return;
        }
        this.showAuthError(data.error || "Something went wrong. Please try again.");
      } catch {
        this.showAuthError("Network error. Please try again.");
      } finally {
        btn.disabled = false;
        btn.textContent = isLogin ? "Sign in" : "Create account";
      }
    });
  }

  private showAuthError(message: string): void {
    const el = document.getElementById("auth-error");
    if (el) {
      el.textContent = message;
      el.classList.remove("hidden");
    }
  }

  private showAuthTwoFactor(pendingToken: string): void {
    this.container.innerHTML = `
      <div class="relative flex items-center justify-center px-3 sm:px-4" style="height:100dvh;height:100vh;">
        <div class="absolute inset-0 bg-zinc-950" style="z-index:0;"></div>
        <div class="max-w-sm w-full relative" style="z-index:2;">
          <div class="slide-up backdrop-blur-md bg-zinc-900/70 border border-zinc-700/50 rounded-xl p-6 text-center">
            <h2 class="text-xl font-bold mb-1">Two-factor code</h2>
            <p class="text-zinc-400 text-sm mb-4">Enter the 6-digit code from your authenticator app.</p>
            <form id="auth-2fa-form" class="space-y-3">
              <input type="text" name="code" class="input font-mono text-center text-xl tracking-widest" placeholder="000000" maxlength="6" pattern="[0-9]{6}" inputmode="numeric" autocomplete="one-time-code" required />
              <p id="auth-error" class="hidden text-sm text-red-400"></p>
              <button type="submit" class="btn btn-gradient w-full py-3">Verify</button>
            </form>
            <button id="auth-2fa-back" class="mt-3 text-xs text-zinc-500 hover:text-zinc-300">← Back to sign in</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById("auth-2fa-back")!.addEventListener("click", () => this.showAuthLanding("login"));
    document.getElementById("auth-2fa-form")!.addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = String(new FormData(e.target as HTMLFormElement).get("code") || "");
      try {
        const res = await fetch("/api/auth/login-2fa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pending_token: pendingToken, code }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.session_token) {
          localStorage.setItem(STORAGE_KEY, data.session_token);
          this.appState = { mode: "app", user: data.user, hash: data.session_token };
          this.showApp();
          this.showAiosDesktop();
          return;
        }
        this.showAuthError(data.error || "Invalid code.");
      } catch {
        this.showAuthError("Network error. Please try again.");
      }
    });
  }

  private startWizard(): void {
    this.wizardState = {
      sessionId: this.generateSessionId(),
      phase: "intro",
      qualifierStep: 0,
      challengeStep: 0,
      profile: { field: "", experience: "", skills: [], focus: "", interests: [], teamSize: "" },
      talents: [],
      answers: []
    };
    this.showWizardIntro();
  }

  private showWizardIntro(): void {
    this.container.innerHTML = `
      <div class="relative flex items-center justify-center px-3 sm:px-4" style="height:100dvh;height:100vh;overflow-y:auto;-webkit-overflow-scrolling:touch;">
        <video autoplay muted loop playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;"></video>
        <div class="absolute inset-0 bg-zinc-950/75" style="z-index:1;"></div>
        <canvas id="wizard-glitter-canvas" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;"></canvas>
        
        <div class="max-w-md w-full relative py-4 sm:py-6" style="z-index:3;">
          <div class="text-center slide-up relative overflow-hidden backdrop-blur-md rounded-xl p-4 sm:p-6 holo-outline">
            <div class="mb-4 sm:mb-5">
              <div class="relative inline-flex items-center justify-center mb-3">
                <div class="absolute bg-cyan-500 rounded-2xl blur-xl opacity-30 animate-pulse" style="width:80px;height:80px;"></div>
                <img src="/static/favicon.png" alt="AiAssist Secure" class="relative animate-float" style="height:64px;object-fit:contain;filter:drop-shadow(0 0 16px rgba(6,182,212,0.5)) drop-shadow(0 0 6px rgba(139,92,246,0.3));">
              </div>
              <h1 class="text-2xl sm:text-3xl mb-1" style="letter-spacing:-0.02em;">
                <span class="font-bold text-white">Ai</span><span class="ace-text-shimmer-load" style="font-weight:300;">Assist</span>
              </h1>
              <div class="flex items-center justify-center gap-2 mb-2">
                <span style="height:1px;width:40px;background:linear-gradient(90deg,transparent,rgba(6,182,212,0.4),transparent);"></span>
                <span class="ace-text-shimmer-load text-[10px] font-semibold uppercase" style="letter-spacing:0.35em;">Secure</span>
                <span style="height:1px;width:40px;background:linear-gradient(90deg,transparent,rgba(139,92,246,0.4),transparent);"></span>
              </div>
              <p class="text-zinc-300 text-sm sm:text-base">Where builders connect. No paywalls. No gatekeeping.</p>
            </div>

            <div class="flex items-center justify-center gap-4 sm:gap-6 mb-4 sm:mb-5 text-xs sm:text-sm text-zinc-400">
              <span class="flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">1</span> Tell us about you</span>
              <span class="flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">2</span> Quick match</span>
              <span class="flex items-center gap-1.5"><span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">3</span> Start building</span>
            </div>
              
            <button id="start-wizard-btn" class="btn btn-gradient w-full text-base sm:text-lg py-3 sm:py-4 glow-border animate-pulse-glow mb-3">
              <span class="flex items-center justify-center gap-2">
                🚀 Let's Go
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
              </span>
            </button>
              
            <button id="link-device-btn" class="text-xs sm:text-sm text-zinc-400 hover:text-emerald-400 transition-colors flex items-center justify-center gap-1.5 mx-auto pt-2">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              Already have an account? Link this device
            </button>
          </div>
        </div>
      </div>
    `;

    const bgVideo = this.container.querySelector('video');
    if (bgVideo) {
      const s = document.createElement('source');
      s.src = '/static/devnet-intro.mp4';
      s.type = 'video/mp4';
      bgVideo.appendChild(s);
      bgVideo.load();
    }

    document.getElementById("start-wizard-btn")!.addEventListener("click", () => {
      this.wizardState!.phase = "qualifier";
      this.showQualifier();
    });

    document.getElementById("link-device-btn")!.addEventListener("click", () => {
      this.showLinkDevice();
    });

    const gc = document.getElementById('wizard-glitter-canvas') as HTMLCanvasElement;
    if (gc) {
      const ctx = gc.getContext('2d')!;
      let w: number, h: number;
      const particles: any[] = [];
      const resize = () => { if (!gc.parentElement) return; w = gc.width = gc.parentElement.offsetWidth; h = gc.height = gc.parentElement.offsetHeight; };
      resize();
      window.addEventListener('resize', resize);
      for (let i = 0; i < 300; i++) {
        particles.push({
          x: Math.random() * (w || 800), y: Math.random() * (h || 600),
          r: Math.random() * 2 + 0.5,
          dx: (Math.random() - 0.5) * 0.4,
          dy: (Math.random() - 0.5) * 0.4,
          twinkle: Math.random() * Math.PI * 2,
          speed: 0.02 + Math.random() * 0.04,
          green: Math.random() > 0.5
        });
      }
      const draw = () => {
        if (!document.getElementById('wizard-glitter-canvas')) return;
        ctx.clearRect(0, 0, w, h);
        for (const p of particles) {
          p.x += p.dx; p.y += p.dy;
          p.twinkle += p.speed;
          if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
          const alpha = 0.3 + Math.abs(Math.sin(p.twinkle)) * 0.7;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = p.green ? `rgba(16,185,129,${alpha})` : `rgba(255,255,255,${alpha})`;
          ctx.fill();
        }
        requestAnimationFrame(draw);
      };
      draw();
    }
  }

  private showLinkDevice(): void {
    this.container.innerHTML = `
      <div class="max-w-lg mx-auto px-4 py-8">
        <div class="card-elevated slide-up holo-outline">
          <button id="back-to-intro" class="text-zinc-400 hover:text-emerald-400 mb-4 flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Back
          </button>

          <div class="text-center mb-4">
            <img src="/static/favicon.png" alt="AiAssist Secure" style="height:40px;object-fit:contain;margin:0 auto 8px;display:block;filter:drop-shadow(0 0 16px rgba(6,182,212,0.5)) drop-shadow(0 0 6px rgba(139,92,246,0.3));">
            <div style="letter-spacing:-0.02em;">
              <span class="text-lg font-bold text-white">Ai</span><span class="text-lg ace-text-shimmer-load" style="font-weight:300;">Assist</span>
            </div>
            <div class="flex items-center justify-center gap-2 mt-1">
              <span style="height:1px;width:32px;background:linear-gradient(90deg,transparent,rgba(6,182,212,0.4),transparent);"></span>
              <span class="ace-text-shimmer-load text-[9px] font-semibold uppercase" style="letter-spacing:0.35em;">Secure</span>
              <span style="height:1px;width:32px;background:linear-gradient(90deg,transparent,rgba(139,92,246,0.4),transparent);"></span>
            </div>
          </div>

          <h2 class="text-xl font-bold text-zinc-100 mb-2">Link This Device</h2>
          <p class="text-zinc-400 mb-6">Enter your login hash and 2FA code to link this device to your account.</p>
          
          <div class="bg-zinc-800/50 rounded-xl p-4 mb-4 border border-zinc-700">
            <p class="text-sm text-zinc-400">
              <strong class="text-zinc-200">Where to find your hash:</strong> Go to your profile on a linked device and copy your login hash from there.
            </p>
          </div>
          
          <form id="link-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-zinc-300 mb-1">Your Login Hash</label>
              <input type="text" name="hash" class="input font-mono text-sm" placeholder="Paste your hash here..." required />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-zinc-300 mb-1">2FA Code from Authenticator App</label>
              <input type="text" name="totp_code" class="input font-mono text-center text-xl tracking-widest" placeholder="000000" maxlength="6" pattern="[0-9]{6}" required />
            </div>
            
            <button type="submit" class="btn btn-primary w-full py-3">
              Link Device
            </button>
            
            <p id="link-error" class="text-red-500 text-sm text-center hidden"></p>
          </form>
        </div>
      </div>
    `;

    document.getElementById("back-to-intro")!.addEventListener("click", () => {
      this.showWizardIntro();
    });

    document.getElementById("link-form")!.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.linkDevice();
    });
  }

  private async linkDevice(): Promise<void> {
    const form = document.getElementById("link-form") as HTMLFormElement;
    const formData = new FormData(form);
    const existingHash = (formData.get("hash") as string).trim();
    const totpCode = (formData.get("totp_code") as string).trim();
    const fingerprint = await this.getFingerprint();

    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    const errorEl = document.getElementById("link-error")!;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="w-5 h-5 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
    `;
    errorEl.classList.add("hidden");

    try {
      const response = await fetch("/api/auth/link-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          existing_hash: existingHash,
          fingerprint,
          totp_code: totpCode
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        localStorage.setItem(STORAGE_KEY, data.hash);
        this.appState = {
          mode: "app",
          user: data.user,
          hash: data.hash
        };
        this.showApp();
      } else {
        throw new Error(data.detail || data.error || "Invalid hash, 2FA code, or account not found");
      }
    } catch (error) {
      errorEl.textContent = "Could not link device. Please check your hash and try again.";
      errorEl.classList.remove("hidden");
      submitBtn.disabled = false;
      submitBtn.textContent = "Try Again";
    }
  }

  private showQualifier(): void {
    if (!this.wizardState) return;
    
    if (this.wizardState.qualifierStep >= QUALIFIER_QUESTIONS.length) {
      this.transitionToChallenge();
      return;
    }

    const q = QUALIFIER_QUESTIONS[this.wizardState.qualifierStep];
    this.selectedSkills = [];
    const progress = ((this.wizardState.qualifierStep) / QUALIFIER_QUESTIONS.length) * 100;

    const emojis: Record<string, string[]> = {
      field: ['💻', '📱', '🎨', '📊', '🚀', '🎯'],
      experience: ['🌱', '📚', '💪', '⭐', '🏆', '👑'],
      skills: ['💻', '🐍', '⚛️', '🔧', '📱', '☁️', '🤖', '🎨', '🗄️', '⛓️', '🔩', '🎮', '🔒', '✍️', '📊', '🌐'],
      interests: ['🚀', '🌐', '🔍', '🏗️', '📈', '🛠️', '📰', '🏆', '🔧', '💡', '🏠', '👥'],
      focus: ['🎯', '🚀', '💰', '🌍', '🤝', '📈'],
      teamSize: ['🧑', '👥', '🏢', '🌐', '🤷', '💫']
    };
    const optionEmojis = emojis[q.id] || ['✨', '⚡', '🎯', '💡', '🔥', '🚀'];

    this.container.innerHTML = `
      <div class="max-w-lg mx-auto px-4 py-8" style="max-height:100vh;overflow-y:auto;">
        <div class="card slide-up">
          <div class="mb-8">
            <div class="flex items-center justify-between text-sm text-zinc-400 mb-3">
              <span class="flex items-center gap-2">
                <span class="text-lg">🎯</span>
                Profile Setup
              </span>
              <span class="bg-zinc-800 px-3 py-1 rounded-full font-medium text-emerald-400">
                ${this.wizardState.qualifierStep + 1} / ${QUALIFIER_QUESTIONS.length}
              </span>
            </div>
            <div class="wizard-progress-bar">
              <div class="wizard-progress-fill" style="width: ${progress}%"></div>
            </div>
          </div>
          
          <h2 class="text-2xl font-bold text-zinc-100 mb-2 gradient-text">${q.question}</h2>
          <p class="text-zinc-500 mb-6 text-sm">Select the option that best describes you</p>
          
          <div class="space-y-3" id="options-container">
            ${q.options.map((opt, i) => `
              <button class="wizard-option touch-bounce flex items-center gap-4 stagger-${Math.min(i + 1, 5)}" data-value="${opt.value}" data-index="${i}" style="animation: slide-in-right 0.4s ease-out backwards; animation-delay: ${i * 0.08}s">
                <span class="option-emoji text-2xl">${optionEmojis[i] || '✨'}</span>
                ${q.multiSelect ? `
                  <div class="w-6 h-6 rounded-lg border-2 border-zinc-600 flex items-center justify-center checkbox-box transition-all duration-300">
                    <svg class="w-4 h-4 text-white hidden check-icon" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                  </div>
                ` : ''}
                <span class="text-zinc-200 font-medium flex-1 text-left">${opt.label}</span>
                <svg class="w-5 h-5 text-zinc-600 group-hover:text-emerald-400 transition-colors arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            `).join("")}
          </div>
          
          ${q.multiSelect ? `
            <button id="continue-btn" class="btn btn-gradient w-full mt-8 py-4 text-lg font-semibold" disabled>
              <span class="flex items-center justify-center gap-2">
                Continue
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
              </span>
            </button>
          ` : ''}
        </div>
      </div>
    `;

    if (q.multiSelect) {
      this.container.querySelectorAll(".wizard-option").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const target = e.currentTarget as HTMLElement;
          const value = target.dataset.value!;
          const checkIcon = target.querySelector(".check-icon");
          const checkBox = target.querySelector(".checkbox-box");
          
          if (this.selectedSkills.includes(value)) {
            this.selectedSkills = this.selectedSkills.filter(s => s !== value);
            target.classList.remove("selected");
            checkIcon?.classList.add("hidden");
            checkBox?.classList.remove("bg-emerald-500", "border-emerald-500");
          } else {
            this.selectedSkills.push(value);
            target.classList.add("selected");
            checkIcon?.classList.remove("hidden");
            checkBox?.classList.add("bg-emerald-500", "border-emerald-500");
          }
          
          const continueBtn = document.getElementById("continue-btn") as HTMLButtonElement;
          continueBtn.disabled = this.selectedSkills.length === 0;
        });
      });

      document.getElementById("continue-btn")!.addEventListener("click", () => {
        this.saveQualifierAnswer(q.id, this.selectedSkills);
      });
    } else {
      this.container.querySelectorAll(".wizard-option").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const target = e.currentTarget as HTMLElement;
          const value = target.dataset.value!;
          
          this.container.querySelectorAll(".wizard-option").forEach(b => b.classList.remove("selected"));
          target.classList.add("selected");
          
          setTimeout(() => this.saveQualifierAnswer(q.id, value), 200);
        });
      });
    }
  }

  private async saveQualifierAnswer(id: string, value: string | string[]): Promise<void> {
    if (!this.wizardState) return;

    if (id === "field") this.wizardState.profile.field = value as string;
    else if (id === "experience") this.wizardState.profile.experience = value as string;
    else if (id === "skills") this.wizardState.profile.skills = value as string[];
    else if (id === "focus") this.wizardState.profile.focus = value as string;
    else if (id === "interests") this.wizardState.profile.interests = value as string[];
    else if (id === "teamSize") this.wizardState.profile.teamSize = value as string;

    try {
      await fetch("/api/wizard/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: this.wizardState.sessionId,
          step: this.wizardState.qualifierStep + 1,
          answer: { [id]: value },
          phase: "qualifier"
        })
      });
    } catch (e) {
      console.error("Failed to save step:", e);
    }

    this.wizardState.qualifierStep++;
    this.showQualifier();
  }

  private async transitionToChallenge(): Promise<void> {
    if (!this.wizardState) return;

    this.container.innerHTML = `
      <div class="max-w-lg mx-auto px-4 py-8">
        <div class="card-elevated text-center slide-up">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 mb-4">
            <svg class="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2 class="text-xl font-bold text-warm-gray-800 mb-2">Profile Captured</h2>
          <p class="text-warm-gray-600 mb-4">
            <span class="font-medium text-emerald-600">${this.getFieldLabel()}</span> with 
            <span class="font-medium">${this.getExperienceLabel()}</span> experience
          </p>
          <p class="text-warm-gray-500 text-sm mb-4">Now let's discover your unique talents...</p>
          <div class="flex items-center justify-center gap-1">
            <div class="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
            <div class="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
            <div class="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
          </div>
        </div>
      </div>
    `;

    await this.delay(2000);
    this.wizardState.phase = "challenge";
    this.showCurrentPuzzle();
  }

  private getFieldLabel(): string {
    const map: Record<string, string> = {
      founder: "Founder",
      developer: "Developer",
      designer: "Designer",
      marketer: "Growth Marketer",
      product: "Product Manager",
      freelancer: "Freelancer"
    };
    return map[this.wizardState?.profile.field || ""] || "Builder";
  }

  private getExperienceLabel(): string {
    const map: Record<string, string> = {
      exploring: "exploring ideas",
      building: "building first product",
      shipped: "finding product-market fit",
      scaling: "scaling up"
    };
    return map[this.wizardState?.profile.experience || ""] || "";
  }

  private getRelevantPuzzles() {
    return [...DEV_PUZZLES].slice(0, 5);
  }

  private showCurrentPuzzle(): void {
    if (!this.wizardState) return;

    const puzzles = this.getRelevantPuzzles();
    if (this.wizardState.challengeStep >= puzzles.length) {
      this.showCompletion();
      return;
    }

    const puzzle = puzzles[this.wizardState.challengeStep];
    const progress = (this.wizardState.challengeStep / puzzles.length) * 100;

    this.container.innerHTML = `
      <div class="max-w-lg mx-auto px-4 py-8">
        <div class="card-elevated slide-up">
          <div class="mb-6">
            <div class="flex items-center justify-between text-sm text-warm-gray-500 mb-2">
              <span class="flex items-center gap-2">
                <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                Challenge Mode
              </span>
              <span>${this.wizardState.challengeStep + 1} of ${puzzles.length}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
          </div>
          
          <div class="bg-warm-gray-800 rounded-xl p-4 mb-4 font-mono text-sm">
            <pre class="text-emerald-400 whitespace-pre-wrap">${puzzle.question}</pre>
          </div>
          
          <p class="text-warm-gray-500 text-sm mb-4 italic">${puzzle.hint}</p>
          
          <div class="space-y-3" id="puzzle-options">
            ${puzzle.options.map((opt, i) => `
              <button class="wizard-option flex items-center gap-3" data-option="${i}">
                <span class="w-8 h-8 rounded-lg bg-warm-gray-100 flex items-center justify-center font-mono text-warm-gray-600 font-medium">
                  ${String.fromCharCode(65 + i)}
                </span>
                <span class="text-warm-gray-700">${opt}</span>
              </button>
            `).join("")}
          </div>
          
          ${this.wizardState.talents.length > 0 ? `
            <div class="mt-6 pt-4 border-t border-warm-gray-100">
              <p class="text-xs text-warm-gray-400 mb-2">Talents discovered:</p>
              <div class="flex flex-wrap gap-2">
                ${this.wizardState.talents.map(t => `
                  <span class="badge badge-talent">${t}</span>
                `).join("")}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    this.container.querySelectorAll(".wizard-option").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        const optionIndex = parseInt(target.dataset.option!);
        this.selectPuzzleOption(optionIndex);
      });
    });

    const keyHandler = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (key >= "A" && key <= "C") {
        const index = key.charCodeAt(0) - 65;
        if (index < puzzle.options.length) {
          this.selectPuzzleOption(index);
          document.removeEventListener("keydown", keyHandler);
        }
      }
    };
    document.addEventListener("keydown", keyHandler);
  }

  private async selectPuzzleOption(index: number): Promise<void> {
    if (!this.wizardState) return;

    const puzzles = this.getRelevantPuzzles();
    const puzzle = puzzles[this.wizardState.challengeStep];
    const answer = puzzle.options[index];

    this.wizardState.answers.push(answer);

    const btn = this.container.querySelector(`[data-option="${index}"]`) as HTMLElement;
    btn.classList.add("selected");

    try {
      const response = await fetch("/api/wizard/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: this.wizardState.sessionId,
          step: this.wizardState.challengeStep + 1,
          answer: answer,
          phase: "challenge"
        })
      });

      const result = await response.json();

      if (result.talent_discovered) {
        this.wizardState.talents.push(result.talent_discovered);
        await this.showTalentReveal(result.talent_discovered);
      }
    } catch (error) {
      console.error("Failed to submit:", error);
    }

    this.wizardState.challengeStep++;
    await this.delay(300);
    this.showCurrentPuzzle();
  }

  private async showTalentReveal(talent: string): Promise<void> {
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 bg-black/50 flex items-center justify-center z-50 fade-in";
    overlay.innerHTML = `
      <div class="bg-zinc-900 border border-emerald-500/30 rounded-2xl p-8 text-center shadow-elevated slide-up max-w-sm mx-4">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 mb-4">
          <span class="text-3xl">🏷️</span>
        </div>
        <h3 class="text-lg font-bold text-zinc-100 mb-2">Talent Discovered!</h3>
        <p class="badge badge-talent text-base px-4 py-2">${talent}</p>
      </div>
    `;
    document.body.appendChild(overlay);

    await this.delay(1500);
    overlay.remove();
  }

  private showCompletion(): void {
    if (!this.wizardState) return;

    this.container.innerHTML = `
      <div class="max-w-lg mx-auto px-3 sm:px-4 py-4 sm:py-8" style="height:100dvh;height:100vh;overflow-y:auto;-webkit-overflow-scrolling:touch;">
        <div class="card-elevated slide-up">
          <div class="text-center mb-6">
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 mb-4">
              <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-warm-gray-800 mb-2">Challenge Complete!</h2>
            <p class="text-warm-gray-500">You've proven yourself. Now join the network.</p>
          </div>
          
          <div class="bg-warm-gray-50 rounded-xl p-4 mb-6">
            <h3 class="font-semibold text-warm-gray-700 mb-3">Your Profile</h3>
            <div class="flex flex-wrap gap-2 mb-3">
              <span class="badge badge-field">${this.getFieldLabel()}</span>
              <span class="badge bg-warm-gray-200 text-warm-gray-700">${this.getExperienceLabel()}</span>
            </div>
            <div class="flex flex-wrap gap-2 mb-3">
              ${this.wizardState.profile.skills.map(s => `
                <span class="badge badge-skill">${s}</span>
              `).join("")}
            </div>
            ${this.wizardState.talents.length > 0 ? `
              <div class="pt-3 border-t border-warm-gray-200">
                <p class="text-xs text-warm-gray-500 mb-2">Talents Discovered</p>
                <div class="flex flex-wrap gap-2">
                  ${this.wizardState.talents.map(t => `
                    <span class="badge badge-talent">${t}</span>
                  `).join("")}
                </div>
              </div>
            ` : ''}
          </div>
          
          <form id="complete-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-warm-gray-700 mb-1">Display Name</label>
              <input type="text" name="displayName" class="input" placeholder="How should we call you?" required />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-warm-gray-700 mb-1">One-liner Bio</label>
              <input type="text" name="bio" class="input" placeholder="What do you do in 10 words or less?" maxlength="100" />
            </div>
            
            <div><label class="block text-sm font-medium text-warm-gray-700 mb-1">Email Address <span class="text-zinc-500">(optional)</span></label><input type="email" name="email" class="input" placeholder="your@email.com" /></div>
            <div><label class="block text-sm font-medium text-warm-gray-700 mb-1">LinkedIn or Portfolio <span class="text-emerald-400">*</span></label><input type="url" name="portfolio" class="input" placeholder="https://linkedin.com/in/you or https://yoursite.com" required /><p class="text-xs text-zinc-500 mt-1">Must start with https://</p></div>
            <button type="submit" class="btn btn-primary w-full py-2.5 sm:py-3 text-base sm:text-lg">
              Join AiAssist Secure
            </button>
          </form>
        </div>
        <div style="height:2rem;"></div>
      </div>
    `;

    document.getElementById("complete-form")!.addEventListener("submit", (e) => {
      e.preventDefault();
      this.completeWizard();
    });
  }

  private async completeWizard(): Promise<void> {
    if (!this.wizardState) return;

    const form = document.getElementById("complete-form") as HTMLFormElement;
    const formData = new FormData(form);
    const fingerprint = await this.getFingerprint();
    const displayName = formData.get("displayName") as string;

    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    const errorEl = form.querySelector(".error-message") as HTMLElement;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="w-5 h-5 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
    `;

    try {
      // Pre-check username availability BEFORE registration
      const checkRes = await fetch("/api/auth/check-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: displayName })
      });
      const checkData = await checkRes.json();
      
      if (!checkData.available) {
        throw new Error(checkData.error || "Username already taken. Please choose a different name.");
      }
      
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fingerprint,
          session_id: this.wizardState.sessionId,
          profile: {
            displayName: formData.get("displayName"),
            bio: formData.get("bio") || "",
            email: formData.get("email") || "",
            portfolio: formData.get("portfolio"),
            ...this.wizardState.profile
          },
          age_confirmed: true,
          talents: this.wizardState.talents
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.requires_2fa) {
          this.show2FASetup(data.user, data.hash, data.totp_secret);
        } else {
          localStorage.setItem(STORAGE_KEY, data.hash);
          this.appState = {
            mode: "app",
            user: data.user,
            hash: data.hash
          };
          this.showWelcome(data.user);
        }
      } else {
        const errData = await response.json();
        throw new Error(errData.error || "Registration failed");
      }
    } catch (error: any) {
      console.error("Registration failed:", error);
      submitBtn.disabled = false;
      submitBtn.textContent = "Try Again";
      if (errorEl) {
        errorEl.textContent = error.message || "Registration failed";
        errorEl.classList.remove("hidden");
      }
    }
  }

  private show2FASetup(user: User, hash: string, totpSecret: string): void {
    const otpauthUrl = `otpauth://totp/${encodeURIComponent("AiAssist Secure")}:${encodeURIComponent(user.displayName)}?secret=${totpSecret}&issuer=${encodeURIComponent("AiAssist Secure")}`;
    
    this.container.innerHTML = `
      <div class="max-w-lg mx-auto px-3 sm:px-4 py-3 sm:py-6" style="height:100dvh;height:100vh;overflow-y:auto;-webkit-overflow-scrolling:touch;">
        <div class="card slide-up">
          <div class="text-center mb-4 sm:mb-6">
            <div class="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 mb-3 shadow-lg shadow-emerald-500/25">
              <svg class="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <h2 class="text-xl sm:text-2xl font-bold gradient-text">Secure Your Account</h2>
            <p class="text-zinc-400 mt-1 text-sm">Two-factor authentication is required</p>
          </div>
          
          <div class="space-y-3 sm:space-y-4">
            <div class="bg-zinc-800/50 rounded-xl p-3 sm:p-4 border border-zinc-700/50">
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Your Login Hash</p>
                <button id="copy-hash-btn" class="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                  </svg>
                  Copy
                </button>
              </div>
              <code id="hash-display" class="text-[10px] sm:text-xs text-zinc-300 font-mono break-all block bg-zinc-900/50 p-2 sm:p-3 rounded-lg select-all">${hash}</code>
              <p class="text-[10px] sm:text-xs text-amber-400 mt-2 flex items-center gap-1">
                <svg class="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                Save this hash! You'll need it to log in from other devices.
              </p>
            </div>
            
            <div class="bg-zinc-800/50 rounded-xl p-3 sm:p-4 border border-zinc-700/50">
              <h3 class="text-sm font-semibold text-zinc-100 mb-2 flex items-center gap-2">
                <span class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                Install Google Authenticator
              </h3>
              <p class="text-xs sm:text-sm text-zinc-400 mb-2">Download from your app store if you haven't already.</p>
              <div class="flex gap-2">
                <a href="https://apps.apple.com/app/google-authenticator/id388497605" target="_blank" class="flex-1 btn btn-secondary text-xs py-2">
                  iOS
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" target="_blank" class="flex-1 btn btn-secondary text-xs py-2">
                  Android
                </a>
              </div>
            </div>
            
            <div class="bg-zinc-800/50 rounded-xl p-3 sm:p-4 border border-zinc-700/50">
              <h3 class="text-sm font-semibold text-zinc-100 mb-2 flex items-center gap-2">
                <span class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                Add Your Account
              </h3>
              <p class="text-xs sm:text-sm text-zinc-400 mb-2">Scan the QR code or enter the setup key manually:</p>
              
              <div id="qr-container" class="hidden mb-3">
                <div class="bg-white p-3 rounded-xl inline-block mx-auto">
                  <img id="qr-code-img" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(otpauthUrl)}" alt="QR Code" class="w-36 h-36 sm:w-44 sm:h-44">
                </div>
              </div>
              
              <button id="toggle-qr-btn" class="btn btn-secondary w-full mb-2 text-xs sm:text-sm py-2">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                </svg>
                <span id="qr-btn-text">Show QR Code</span>
              </button>
              
              <div class="relative">
                <code id="totp-secret-display" class="text-[10px] sm:text-sm text-emerald-400 font-mono tracking-wide block bg-zinc-900/50 p-2 sm:p-3 rounded-lg text-center break-all select-all">${totpSecret}</code>
                <button id="copy-secret-btn" class="absolute right-1 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-emerald-400 p-1.5">
                  <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                  </svg>
                </button>
              </div>
              <p class="text-[10px] sm:text-xs text-zinc-500 mt-1">Account: AiAssist Secure (${user.displayName})</p>
            </div>
            
            <div class="bg-zinc-800/50 rounded-xl p-3 sm:p-4 border border-zinc-700/50">
              <h3 class="text-sm font-semibold text-zinc-100 mb-2 flex items-center gap-2">
                <span class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                Verify Your Code
              </h3>
              <p class="text-xs sm:text-sm text-zinc-400 mb-2">Enter the 6-digit code from your authenticator app.</p>
              <form id="verify-2fa-form" class="space-y-2 sm:space-y-3">
                <input type="text" id="totp-code" name="code" 
                  class="input text-center text-xl sm:text-2xl tracking-[0.4em] sm:tracking-[0.5em] font-mono" 
                  placeholder="000000" maxlength="6" pattern="[0-9]{6}" 
                  autocomplete="one-time-code" inputmode="numeric" required>
                <p id="2fa-error" class="text-sm text-red-400 hidden"></p>
                <button type="submit" class="btn btn-primary w-full py-2.5 sm:py-3 text-sm sm:text-base">
                  Enable 2FA & Continue
                </button>
              </form>
            </div>
          </div>
        </div>
        <div style="height:2rem;"></div>
      </div>
    `;

    document.getElementById("copy-hash-btn")?.addEventListener("click", () => {
      navigator.clipboard.writeText(hash);
      const btn = document.getElementById("copy-hash-btn")!;
      btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Copied!`;
      setTimeout(() => {
        btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg> Copy`;
      }, 2000);
    });

    document.getElementById("copy-secret-btn")?.addEventListener("click", () => {
      navigator.clipboard.writeText(totpSecret);
      const btn = document.getElementById("copy-secret-btn")!;
      btn.innerHTML = `<svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
      setTimeout(() => {
        btn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>`;
      }, 2000);
    });

    document.getElementById("toggle-qr-btn")?.addEventListener("click", () => {
      const qrContainer = document.getElementById("qr-container");
      const btnText = document.getElementById("qr-btn-text");
      if (qrContainer && btnText) {
        const isHidden = qrContainer.classList.contains("hidden");
        qrContainer.classList.toggle("hidden");
        btnText.textContent = isHidden ? "Hide QR Code" : "Show QR Code";
      }
    });

    const form = document.getElementById("verify-2fa-form") as HTMLFormElement;
    const codeInput = document.getElementById("totp-code") as HTMLInputElement;
    
    codeInput.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      target.value = target.value.replace(/\D/g, "").slice(0, 6);
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = codeInput.value;
      const errorEl = document.getElementById("2fa-error")!;
      const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      
      if (code.length !== 6) {
        errorEl.textContent = "Please enter a 6-digit code";
        errorEl.classList.remove("hidden");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<svg class="w-5 h-5 animate-spin mx-auto" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>`;
      errorEl.classList.add("hidden");

      try {
        const response = await fetch("/api/auth/verify-2fa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.id, code })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          localStorage.setItem(STORAGE_KEY, hash);
          // Store device token to skip 2FA on page refresh
          if (data.device_token) {
            localStorage.setItem(DEVICE_TOKEN_KEY, data.device_token);
          }
          this.appState = { mode: "app", user, hash };
          this.showNetworkReveal(user, data.matched_groups || []);
        } else {
          throw new Error(data.error || "Verification failed");
        }
      } catch (error: any) {
        errorEl.textContent = error.message || "Invalid code. Please try again.";
        errorEl.classList.remove("hidden");
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg> Enable 2FA & Continue`;
        codeInput.value = "";
        codeInput.focus();
      }
    });

    codeInput.focus();
  }

  private async showWelcome(user: User): Promise<void> {
    this.container.innerHTML = `
      <div class="max-w-lg mx-auto px-4 py-8">
        <div class="card text-center slide-up">
          <div class="relative inline-block mb-4">
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600">
              <span class="text-3xl font-bold text-white">${user.displayName.charAt(0).toUpperCase()}</span>
            </div>
            <div class="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-emerald-500 rounded-full blur opacity-30 -z-10"></div>
          </div>
          <h2 class="text-2xl font-bold text-zinc-100 mb-2">Welcome, ${user.displayName}!</h2>
          <p class="text-zinc-400 mb-6">Your account is secured with 2FA. You're ready to go!</p>
          
          <div class="flex items-center justify-center gap-2 text-sm text-emerald-400 mb-6">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
            Two-factor authentication enabled
          </div>
          
          <button id="enter-app-btn" class="btn btn-primary w-full py-3 text-lg">
            Enter AiAssist Secure
          </button>
        </div>
      </div>
    `;

    document.getElementById("enter-app-btn")!.addEventListener("click", () => {
      this.showApp();
    });
  }

  private showNetworkReveal(user: User, matchedGroups: Array<{id: string, name: string, slug: string, description: string}>): void {
    const groupCount = matchedGroups.length;
    
    this.container.innerHTML = `
      <style>
        @keyframes countUp { 0% { opacity: 0; transform: scale(0.5); } 50% { transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes groupReveal { 0% { opacity: 0; transform: translateY(20px) scale(0.9); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.3); } 50% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.6); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .network-count { animation: countUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .group-chip { animation: groupReveal 0.4s ease-out backwards; }
        .pulse-glow { animation: pulseGlow 2s ease-in-out infinite; }
        .shimmer-text { background: linear-gradient(90deg, #10b981, #34d399, #6ee7b7, #10b981); background-size: 200% 100%; animation: shimmer 3s linear infinite; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      </style>
      <div class="max-w-2xl mx-auto px-4 py-8">
        <div class="card text-center slide-up">
          <div class="mb-6">
            <img src="/static/favicon.png" alt="AiAssist Secure" style="height: 64px; object-fit: contain; margin: 0 auto 16px; display: block; filter: drop-shadow(0 0 16px rgba(6, 182, 212, 0.5)) drop-shadow(0 0 6px rgba(139, 92, 246, 0.3));" class="pulse-glow">
            <h2 class="text-3xl font-bold mb-2">
              <span class="shimmer-text">Network Activated</span>
            </h2>
            <p class="text-zinc-400">Welcome, ${user.displayName}!</p>
          </div>
          
          <div class="bg-zinc-900/50 rounded-2xl p-6 mb-6 border border-zinc-800">
            <div class="text-6xl font-bold text-emerald-400 network-count mb-2">${groupCount}</div>
            <p class="text-zinc-400 text-lg">Communities matched to your profile</p>
          </div>
          
          ${groupCount > 0 ? `
            <div class="mb-6">
              <p class="text-sm text-zinc-500 mb-4">You've been auto-joined to:</p>
              <div class="flex flex-wrap justify-center gap-2 max-h-48 overflow-y-auto">
                ${matchedGroups.map((g, i) => `
                  <div class="group-chip inline-flex items-center gap-2 px-3 py-2 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg border border-zinc-700 hover:border-emerald-500/50 transition-all cursor-pointer" style="animation-delay: ${i * 0.05}s" title="${g.description || ''}">
                    <div class="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500/20 to-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
                      ${g.name.charAt(0)}
                    </div>
                    <span class="text-sm text-zinc-200">${g.name}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <div class="flex items-center justify-center gap-2 text-sm text-emerald-400 mb-6">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
            2FA secured account
          </div>
          
          <button id="enter-network-btn" class="btn btn-gradient w-full py-4 text-lg font-semibold glow-border">
            <span class="flex items-center justify-center gap-2">
              Enter Your Network
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
            </span>
          </button>
        </div>
      </div>
    `;

    document.getElementById("enter-network-btn")!.addEventListener("click", () => {
      this.showApp();
    });
  }

  private showApp(): void {
    const user = this.appState.user;
    if (!user) return;

    document.getElementById("sidebar")?.classList.remove("hidden");
    
    // Initialize Lucide icons
    if ((window as any).lucide) {
      (window as any).lucide.createIcons();
    }
    
    const navAvatarContainer = document.getElementById("nav-avatar-container");
    const navProfileName = document.getElementById("nav-profile-name");
    if (navAvatarContainer) {
      if (user.avatar) {
        navAvatarContainer.innerHTML = `<img src="${user.avatar}" alt="${user.displayName}" class="w-full h-full object-cover">`;
      } else {
        navAvatarContainer.innerHTML = `<span>${user.displayName.charAt(0).toUpperCase()}</span>`;
      }
    }
    if (navProfileName) {
      navProfileName.textContent = user.displayName;
    }
    
    if (user.is_admin || user.is_superadmin) {
      document.getElementById("nav-admin")?.classList.remove("hidden");
    }

    this.loadUserEcosystems();

    const statusUser = document.getElementById("status-user");
    if (statusUser) {
      statusUser.textContent = `@${user.displayName}`;
      statusUser.classList.remove("hidden");
    }

    this.setActiveNav("nav-feed");

    this.setContent(`
      <div class="h-full w-full flex flex-col">
        <div class="panel flex-1">
          <div class="panel-header">
            <div class="flex items-center gap-3">
              <span class="panel-title">Feed</span>
              <span class="text-xs text-zinc-500">Stay connected with your network</span>
            </div>
            <button id="new-post-btn" class="btn btn-primary text-xs py-1.5 px-3">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              New Post
            </button>
          </div>
          <div class="panel-body p-4">
            <div id="compose-area" class="hidden bg-zinc-800/50 rounded-lg p-4 mb-4 border border-zinc-700">
              <textarea id="post-content" class="input resize-none bg-zinc-900 text-sm" rows="3" placeholder="What's on your mind? Use @mentions and #hashtags!"></textarea>
              <div id="image-preview-container" class="hidden mt-3 relative">
                <img id="image-preview" class="max-h-32 rounded-lg object-cover" alt="Preview">
                <button id="remove-image" class="absolute top-2 right-2 bg-zinc-900/80 text-zinc-300 hover:text-white rounded-full p-1">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div class="flex items-center justify-between mt-3">
                <label class="btn btn-ghost text-xs cursor-pointer py-1 px-2">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  Image
                  <input type="file" id="post-image-input" accept="image/jpeg,image/png,image/gif,image/webp" class="hidden">
                </label>
                <button id="post-gif-btn" class="btn btn-ghost text-xs py-1 px-2" type="button">
                  <svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="2" width="20" height="20" rx="2"/>
                    <text x="12" y="16" text-anchor="middle" fill="currentColor" stroke="none" font-size="10" font-weight="bold">GIF</text>
                  </svg>
                  GIF
                </button>
                <div class="flex gap-2">
                  <button id="cancel-post" class="btn btn-ghost text-xs py-1 px-2">Cancel</button>
                  <button id="submit-post" class="btn btn-primary text-xs py-1 px-2">Post</button>
                </div>
              </div>
              <p id="upload-error" class="text-red-400 text-xs mt-2 hidden"></p>
            </div>
            
            <div id="feed-container" class="space-y-3">
              ${this.renderFeedShimmers()}
            </div>
          </div>
        </div>
      </div>
    `, "feed");

    this.setupFeedListeners();
    this.loadFeed();
  }

  private pendingImageUrl: string | null = null;

  private toggleSidebar(): void {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;
    
    if (sidebar.classList.contains("sidebar-expanded")) {
      this.collapseSidebar();
    } else {
      this.expandSidebar();
    }
  }
  
  private collapseSidebar(): void {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;
    
    sidebar.classList.remove("sidebar-expanded");
    sidebar.classList.add("sidebar-collapsed");
    
    // Toggle icons
    document.querySelector(".sidebar-collapse-icon")?.classList.add("hidden");
    document.querySelector(".sidebar-expand-icon")?.classList.remove("hidden");
    
    // Update toggle button title
    const toggleBtn = document.getElementById("sidebar-toggle");
    if (toggleBtn) toggleBtn.title = "Expand sidebar";
    
    localStorage.setItem("sidebar-collapsed", "true");
  }
  
  private expandSidebar(): void {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;
    
    sidebar.classList.remove("sidebar-collapsed");
    sidebar.classList.add("sidebar-expanded");
    
    // Toggle icons
    document.querySelector(".sidebar-collapse-icon")?.classList.remove("hidden");
    document.querySelector(".sidebar-expand-icon")?.classList.add("hidden");
    
    // Update toggle button title
    const toggleBtn = document.getElementById("sidebar-toggle");
    if (toggleBtn) toggleBtn.title = "Collapse sidebar";
    
    localStorage.setItem("sidebar-collapsed", "false");
  }

  private setActiveNav(activeId: string): void {
    const navIds = ["nav-feed", "nav-explore", "nav-groups", "nav-messages", "nav-notifications", "nav-geppetto", "nav-docs", "nav-admin", "nav-profile",
      "nav-aios-desktop", "nav-aias-playground", "nav-aias-keystone", "nav-aias-artifacts", "nav-aias-image", "nav-aias-agents"];
    navIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (id === activeId) {
          el.classList.add("active");
        } else {
          el.classList.remove("active");
        }
      }
    });
  }

  private setupFeedListeners(): void {
    document.getElementById("new-post-btn")?.addEventListener("click", () => {
      document.getElementById("compose-area")?.classList.remove("hidden");
      (document.getElementById("post-content") as HTMLTextAreaElement)?.focus();
    });

    document.getElementById("cancel-post")?.addEventListener("click", () => {
      document.getElementById("compose-area")?.classList.add("hidden");
      (document.getElementById("post-content") as HTMLTextAreaElement).value = "";
      this.clearImagePreview();
    });

    document.getElementById("submit-post")?.addEventListener("click", () => this.submitPost());
    
    // Image upload handling
    document.getElementById("post-image-input")?.addEventListener("change", (e) => {
      const input = e.target as HTMLInputElement;
      if (input.files && input.files[0]) {
        this.handleImageSelect(input.files[0]);
      }
    });
    
    document.getElementById("remove-image")?.addEventListener("click", () => this.clearImagePreview());

    document.getElementById("post-gif-btn")?.addEventListener("click", (e) => {
      const btn = e.currentTarget as HTMLElement;
      this.openGifDrawer('post', btn);
    });
    
    document.getElementById("nav-feed")?.addEventListener("click", () => this.showApp());
    document.getElementById("nav-explore")?.addEventListener("click", () => this.showExplore());
    document.getElementById("nav-groups")?.addEventListener("click", () => this.showGroups());
    document.getElementById("nav-messages")?.addEventListener("click", () => this.showMessages());
    document.getElementById("nav-admin")?.addEventListener("click", () => this.showAdmin());
    document.getElementById("nav-notifications")?.addEventListener("click", () => this.showNotifications());
    document.getElementById("nav-geppetto")?.addEventListener("click", () => this.showGeppetto());
    document.getElementById("nav-docs")?.addEventListener("click", () => this.showDocs());
    document.getElementById("nav-profile")?.addEventListener("click", () => this.showProfile());

    // AiAS constellation — sidebar entries DEEP-LINK into AiOS windows
    document.getElementById("nav-aios-desktop")?.addEventListener("click", () => this.showAiosDesktop());
    const deepLinks: Record<string, string> = {
      playground: "playground", keystone: "keystone", artifacts: "artifacts",
      image: "images", agents: "agents",
    };
    Object.entries(deepLinks).forEach(([nav, appId]) => {
      document.getElementById(`nav-aias-${nav}`)?.addEventListener("click", () => this.showAiosDesktop(appId));
    });
    
    // Sidebar toggle
    document.getElementById("sidebar-toggle")?.addEventListener("click", () => this.toggleSidebar());
    
    // Restore sidebar state from localStorage
    const sidebarCollapsed = localStorage.getItem("sidebar-collapsed") === "true";
    if (sidebarCollapsed) {
      this.collapseSidebar();
    }
    
    this.setupContentClickHandlers();
    this.loadNotificationCount();
    
    // Handle group redirect from /g/{slug} URL
    this.handleGroupRedirect();
  }

  private async handleGroupRedirect(): Promise<void> {
    const redirectSlug = (window as any).REDIRECT_GROUP;
    if (!redirectSlug) return;
    
    (window as any).REDIRECT_GROUP = "";
    
    const safeSlug = this.escapeHtml(redirectSlug);
    this.container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:400px;gap:24px;padding:24px;">
        <div style="position:relative;width:80px;height:80px;">
          <div style="position:absolute;inset:0;border-radius:50%;border:3px solid #27272a;"></div>
          <div style="position:absolute;inset:0;border-radius:50%;border:3px solid transparent;border-top-color:#10b981;animation:communitySpinner 0.8s linear infinite;"></div>
          <div style="position:absolute;inset:12px;border-radius:50%;background:linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.1));display:flex;align-items:center;justify-content:center;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
        </div>
        <div style="text-align:center;">
          <h2 style="font-size:20px;font-weight:700;color:#fafafa;margin:0 0 8px 0;">Joining Community</h2>
          <p style="font-size:14px;color:#a1a1aa;margin:0;">Loading <span style="color:#10b981;font-weight:600;">/g/${safeSlug}</span></p>
        </div>
        <div style="display:flex;gap:6px;margin-top:8px;">
          <div style="width:8px;height:8px;border-radius:50%;background:#10b981;animation:communityDot 1.2s ease-in-out infinite;"></div>
          <div style="width:8px;height:8px;border-radius:50%;background:#10b981;animation:communityDot 1.2s ease-in-out infinite;animation-delay:0.2s;"></div>
          <div style="width:8px;height:8px;border-radius:50%;background:#10b981;animation:communityDot 1.2s ease-in-out infinite;animation-delay:0.4s;"></div>
        </div>
      </div>
      <style>
        @keyframes communitySpinner { to { transform: rotate(360deg); } }
        @keyframes communityDot { 0%,80%,100% { opacity:0.3;transform:scale(0.8); } 40% { opacity:1;transform:scale(1.2); } }
      </style>
    `;
    
    try {
      const res = await fetch(`/api/groups/by-slug/${redirectSlug}`, {
        headers: { "X-Auth-Hash": this.appState.hash || "" }
      });
      
      if (res.ok) {
        const group = await res.json();
        if (group.id) {
          if (!group.is_member) {
            await this.joinGroup(group.id);
          }
          this.openGroup(group.id);
          return;
        }
      }
      showToast("Community not found", "error");
      this.showApp();
    } catch (e) {
      console.error("Group redirect failed:", e);
      showToast("Failed to load community", "error");
      this.showApp();
    }
  }

  private setupContentClickHandlers(): void {
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      
      if (target.classList.contains("mention")) {
        e.preventDefault();
        const username = target.dataset.mention;
        if (username) this.showUserProfile(username);
      }
      
      if (target.classList.contains("hashtag")) {
        e.preventDefault();
        const tag = target.dataset.tag;
        if (tag) this.showHashtagFeed(tag);
      }
    });
  }

  private async loadNotificationCount(): Promise<void> {
    if (this._notifDebounce) clearTimeout(this._notifDebounce);
    this._notifDebounce = setTimeout(async () => {
      try {
        const res = await fetch("/api/notifications", {
          headers: { "X-Auth-Hash": this.appState.hash || "" }
        });
        if (res.ok) {
          const data = await res.json();
          const badge = document.getElementById("notification-badge");
          if (badge) {
            if (data.unread_count > 0) {
              badge.textContent = data.unread_count > 99 ? "99+" : String(data.unread_count);
              badge.classList.remove("hidden");
            } else {
              badge.classList.add("hidden");
            }
          }
        }
      } catch (e) {
        console.error("Failed to load notifications:", e);
      }
    }, 500);
  }

  private async showNotifications(): Promise<void> {
    this.setActiveNav("nav-notifications");
    const res = await fetch("/api/notifications", {
      headers: { "X-Auth-Hash": this.appState.hash || "" }
    });
    const data = res.ok ? await res.json() : { notifications: [], unread_count: 0 };

    this.setContent(`
      <div class="h-full w-full flex flex-col">
        <div class="panel flex-1">
          <div class="panel-header">
            <div class="flex items-center gap-3">
              <span class="panel-title">Notifications</span>
              <span class="text-xs text-zinc-500">${data.unread_count} unread</span>
            </div>
            <div class="flex items-center gap-2">
              ${data.unread_count > 0 ? `
                <button id="mark-read-btn" class="btn btn-secondary text-xs py-1 px-2">Mark all read</button>
              ` : ''}
              ${data.notifications.length > 0 ? `
                <button id="clear-all-notifs-btn" class="btn btn-secondary text-xs py-1 px-2 text-emerald-400 hover:text-emerald-300">Clear all</button>
              ` : ''}
            </div>
          </div>
          <div class="panel-body">
            ${data.notifications.length === 0 ? `
              <div class="text-center py-12 text-zinc-500">
                <div class="inline-flex items-center justify-center w-12 h-12 bg-zinc-800 rounded-xl mb-3">
                  <svg class="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                  </svg>
                </div>
                <p class="text-sm">No notifications yet</p>
              </div>
            ` : data.notifications.map((n: any) => {
              const fromName = n.data?.from_user_name || n.data?.from_user || n.from_user?.displayName || n.last_sender || 'Someone';
              const fromId = n.data?.from_id || n.data?.from_user_id || n.from_user?.id || '';
              const preview = n.data?.preview || n.preview || '';
              const isGroupMessage = n.type === 'group_message';
              const groupId = n.group_id || '';
              const groupName = n.group_name || 'Group';
              const msgCount = n.count || 1;
              
              return `
              <div class="notification-item cursor-pointer hover:bg-zinc-800/50 transition-colors ${n.read ? '' : 'unread'}" data-notification-id="${n.id}" ${isGroupMessage ? `data-group-id="${groupId}"` : `data-from-id="${fromId}"`} data-type="${n.type || 'dm'}">
                <div class="flex items-start gap-3">
                  <div class="relative w-8 h-8 rounded-lg ${isGroupMessage ? 'bg-blue-500/20' : n.type === 'bot_approved' ? 'bg-purple-500/20' : 'bg-emerald-500/20'} flex items-center justify-center flex-shrink-0">
                    ${isGroupMessage ? `
                      <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"/>
                      </svg>
                      ${msgCount > 1 ? `<span class="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">${msgCount > 9 ? '9+' : msgCount}</span>` : ''}
                    ` : n.type === 'bot_approved' ? `
                      <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    ` : `
                      <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                      </svg>
                    `}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-zinc-100">
                      ${isGroupMessage 
                        ? `<span class="font-semibold text-blue-400">${msgCount > 1 ? msgCount + ' messages' : '1 message'}</span> in <span class="font-semibold text-zinc-300">${this.escapeHtml(groupName)}</span>`
                        : n.type === 'bot_approved' 
                          ? `Your bot <span class="font-semibold text-emerald-400">${this.escapeHtml(n.data?.bot_name || n.message?.match(/\*\*(.*?)\*\*/)?.[1] || 'your bot')}</span> was approved${n.data?.group_id ? ` for a group` : ''}`
                          : n.type === 'mention' 
                            ? `<span class="font-semibold text-emerald-400">@${this.escapeHtml(fromName)}</span> mentioned you`
                            : n.type === 'dm' 
                              ? `<span class="font-semibold text-emerald-400">@${this.escapeHtml(fromName)}</span> sent you a message`
                              : n.message 
                                ? `${n.message.replace(/\*\*(.*?)\*\*/g, '<span class="font-semibold text-emerald-400">$1</span>')}`
                                : `<span class="font-semibold text-emerald-400">@${this.escapeHtml(fromName)}</span> interacted with you`
                      }
                    </p>
                    <div class="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                      ${isGroupMessage && msgCount > 1 ? `<span>Latest from ${this.escapeHtml(fromName)}:</span>` : ''}
                      ${(n.data?.image_url || n.image_url) ? `<img src="${n.data?.image_url || n.image_url}" style="max-width: 32px; max-height: 32px; border-radius: 4px; flex-shrink: 0;" />` : ''}
                      <span class="truncate">${this.parseMarkdownPreview(preview)}</span>
                    </div>
                    <p class="text-xs text-zinc-500 mt-1">${this.formatTime(n.created_at)}</p>
                  </div>
                </div>
              </div>
            `}).join("")}
          </div>
        </div>
      </div>
    `, "notifications");

    document.getElementById("mark-read-btn")?.addEventListener("click", async () => {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "X-Auth-Hash": this.appState.hash || "" }
      });
      const badge = document.getElementById("notification-badge");
      if (badge) badge.classList.add("hidden");
      this.showNotifications();
    });

    document.getElementById("clear-all-notifs-btn")?.addEventListener("click", async () => {
      await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "X-Auth-Hash": this.appState.hash || "" }
      });
      const badge = document.getElementById("notification-badge");
      if (badge) badge.classList.add("hidden");
      this.loadNotificationCount();
      this.showNotifications();
    });
    
    // Click handlers - mark as read then navigate
    document.querySelectorAll(".notification-item").forEach(item => {
      item.addEventListener("click", async () => {
        const el = item as HTMLElement;
        const notifId = el.dataset.notificationId;
        const groupId = el.dataset.groupId;
        const fromId = el.dataset.fromId;

        if (notifId && el.classList.contains("unread")) {
          el.classList.remove("unread");
          fetch(`/api/notifications/${notifId}/read`, {
            method: "POST",
            headers: { "X-Auth-Hash": this.appState.hash || "" }
          }).then(() => this.loadNotificationCount());
        }

        if (groupId) {
          this.openGroup(groupId);
        } else if (fromId) {
          this.openDM(fromId);
        }
      });
    });
  }

  private async showMessages(): Promise<void> {
    this.setActiveNav("nav-messages");
    
    const res = await fetch("/api/dm/conversations", {
      headers: { "X-Auth-Hash": this.appState.hash || "" }
    });
    const conversations = res.ok ? await res.json() : [];
    
    this.setContent(`
      <div class="h-full w-full flex flex-col">
        <div class="flex-1 flex flex-col overflow-hidden bg-zinc-900 border-l border-zinc-800">
          <div class="panel-header">
            <span class="panel-title">Direct Messages</span>
            <span class="text-xs text-zinc-500">${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="panel-body flex-1 overflow-y-auto">
            ${conversations.length === 0 ? `
              <div class="text-center py-12 text-zinc-500">
                <div class="inline-flex items-center justify-center w-12 h-12 bg-zinc-800 rounded-xl mb-3">
                  <svg class="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                </div>
                <p class="text-sm">No conversations yet</p>
                <p class="text-xs text-zinc-600 mt-1">Start a chat from someone's profile</p>
              </div>
            ` : conversations.map((c: any) => `
              <div class="dm-conversation-item p-3 hover:bg-zinc-800/50 rounded-lg cursor-pointer transition-colors border-b border-zinc-800/50" data-conv-id="${c.id}" data-other-id="${c.other_user?.id}" data-other-name="${this.escapeHtml(c.other_user?.displayName || 'Unknown')}">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                    ${c.other_user?.avatar ? `<img src="${c.other_user.avatar}" class="w-full h-full object-cover"/>` : `<span class="text-emerald-400 font-bold">${(c.other_user?.displayName || '?')[0].toUpperCase()}</span>`}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <span class="font-medium text-zinc-100">${this.escapeHtml(c.other_user?.displayName || 'Unknown')}</span>
                      <span class="text-xs text-zinc-500">${c.last_message ? this.formatTime(c.last_message.created_at) : ''}</span>
                    </div>
                    <p class="text-sm text-zinc-400 truncate mt-0.5 dm-preview-content flex items-center gap-1">
                      ${c.last_message?.image_url ? `<img src="${c.last_message.image_url}" style="max-width: 24px; max-height: 24px; border-radius: 4px; flex-shrink: 0;" />` : ''}
                      <span>${c.last_message ? this.parseMarkdownPreview(c.last_message.content || '') || '[Image]' : 'No messages yet'}</span>
                    </p>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `);
    
    // Initialize Lucide icons
    if ((window as any).lucide) {
      (window as any).lucide.createIcons();
    }
    
    document.querySelectorAll(".dm-conversation-item").forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const convId = (el as HTMLElement).dataset.convId || "";
        const otherId = (el as HTMLElement).dataset.otherId || "";
        const otherName = (el as HTMLElement).dataset.otherName || "User";
        if (convId && otherId) {
          this.openDMChat(convId, otherId, otherName);
        }
      });
    });
  }

  private async openDM(userId: string): Promise<void> {
    if (!userId) return;
    
    const res = await fetch("/api/dm/conversations", {
      headers: { "X-Auth-Hash": this.appState.hash || "" }
    });
    const conversations = res.ok ? await res.json() : [];
    
    const existing = conversations.find((c: any) => c.other_user?.id === userId);
    if (existing) {
      this.openDMChat(existing.id, existing.other_user.id, existing.other_user.displayName);
    } else {
      const createRes = await fetch("/api/dm/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Hash": this.appState.hash || ""
        },
        body: JSON.stringify({ user_id: userId })
      });
      if (createRes.ok) {
        const conv = await createRes.json();
        this.openDMChat(conv.id, conv.other_user.id, conv.other_user.displayName);
      }
    }
  }

  private async openDMChat(convId: string, otherId: string, otherName: string): Promise<void> {
    const res = await fetch(`/api/dm/${convId}/messages`, {
      headers: { "X-Auth-Hash": this.appState.hash || "" }
    });
    const messages = res.ok ? await res.json() : [];
    
    // Store current conversation state for WebSocket push
    (window as any).dmPanelInstance = {
      currentConversation: { id: convId, otherId, otherName },
      addMessageToUI: (msg: any) => {
        if (msg.type === 'dm_reaction_update') {
          const container = document.querySelector(`.dm-reactions-display[data-dm-msg-id="${msg.message_id}"]`);
          if (container) this.renderReactionBadges(container as HTMLElement, msg.reactions, 'dm', msg.message_id, msg.conv_id);
          return;
        }
        const messagesDiv = document.getElementById("dm-messages");
        if (messagesDiv) {
          const emptyDiv = messagesDiv.querySelector(".text-center");
          if (emptyDiv) emptyDiv.remove();
          messagesDiv.insertAdjacentHTML("beforeend", this.renderDMMessage(msg));
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
          this.attachDMReactionListeners(convId);
        }
      }
    };
    
    this.setContent(`
      <div class="h-full w-full flex flex-col">
        <div class="flex-1 flex flex-col overflow-hidden bg-zinc-900 border-l border-zinc-800">
          <div class="panel-header">
            <div class="flex items-center gap-3">
              <button id="dm-back-btn" class="text-zinc-400 hover:text-zinc-100 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <span class="panel-title">${this.escapeHtml(otherName)}</span>
            </div>
            <button id="view-dm-profile" class="btn btn-secondary text-xs py-1 px-2" data-user-id="${otherId}">View Profile</button>
          </div>
          <div id="dm-messages" class="panel-body flex-1 overflow-y-auto flex flex-col gap-2 p-4">
            ${messages.length === 0 ? `
              <div class="text-center py-8 text-zinc-500">
                <p class="text-sm">Start a conversation with ${this.escapeHtml(otherName)}</p>
              </div>
            ` : messages.map((m: any) => this.renderDMMessage(m)).join("")}
          </div>
          <div class="border-t border-zinc-800 p-3">
            <div id="dm-image-preview" class="hidden mb-2 relative inline-block">
              <img id="dm-image-preview-img" style="max-width: 80px !important; max-height: 80px !important; width: auto; height: auto; object-fit: contain;" class="rounded-lg" />
              <button id="dm-image-remove" class="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs">&times;</button>
            </div>
            <div class="flex gap-2">
              <button id="dm-image-btn" class="btn btn-secondary px-3" title="Attach image">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </button>
              <button id="dm-gif-btn" class="btn btn-secondary px-3" title="Send GIF" type="button">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2"/><text x="12" y="16" text-anchor="middle" fill="currentColor" stroke="none" font-size="9" font-weight="bold">GIF</text></svg>
              </button>
              <input type="file" id="dm-image-input" accept="image/*" class="hidden">
              <input type="text" id="dm-input" class="input flex-1" placeholder="Type a message... (Markdown supported)">
              <button id="dm-send-btn" class="btn btn-primary">Send</button>
            </div>
          </div>
        </div>
      </div>
    `);
    
    const messagesDiv = document.getElementById("dm-messages");
    if (messagesDiv) messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    this.attachDMReactionListeners(convId);
    
    document.getElementById("dm-back-btn")?.addEventListener("click", () => this.showMessages());
    document.getElementById("view-dm-profile")?.addEventListener("click", () => this.viewUserProfile(otherId));
    
    let pendingImageUrl: string | null = null;
    
    document.getElementById("dm-image-btn")?.addEventListener("click", () => {
      document.getElementById("dm-image-input")?.click();
    });
    
    document.getElementById("dm-image-input")?.addEventListener("change", async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const btn = document.getElementById("dm-image-btn");
      if (btn) btn.innerHTML = '<div class="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>';
      
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload/image", {
          method: "POST",
          headers: { "X-Auth-Hash": this.appState.hash || "" },
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          pendingImageUrl = data.url;
          const preview = document.getElementById("dm-image-preview");
          const previewImg = document.getElementById("dm-image-preview-img") as HTMLImageElement;
          if (preview && previewImg) {
            previewImg.src = data.url;
            preview.classList.remove("hidden");
          }
        }
      } catch (err) {
        console.error("Image upload failed", err);
      }
      
      if (btn) btn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>';
    });
    
    document.getElementById("dm-image-remove")?.addEventListener("click", () => {
      pendingImageUrl = null;
      document.getElementById("dm-image-preview")?.classList.add("hidden");
    });

    document.getElementById("dm-gif-btn")?.addEventListener("click", (e) => {
      const btn = e.currentTarget as HTMLElement;
      this.openGifDrawer('dm', btn, { convId, setPendingImage: (url: string) => { pendingImageUrl = url; } });
    });
    
    const sendMessage = async () => {
      const input = document.getElementById("dm-input") as HTMLInputElement;
      const content = input?.value.trim();
      if (!content && !pendingImageUrl) return;
      
      input.value = "";
      const imageUrl = pendingImageUrl;
      pendingImageUrl = null;
      document.getElementById("dm-image-preview")?.classList.add("hidden");
      
      const res = await fetch(`/api/dm/${convId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Hash": this.appState.hash || ""
        },
        body: JSON.stringify({ content, image_url: imageUrl })
      });
      
      if (res.ok) {
        const data = await res.json();
        const messagesDiv = document.getElementById("dm-messages");
        if (messagesDiv) {
          const emptyDiv = messagesDiv.querySelector(".text-center");
          if (emptyDiv) emptyDiv.remove();
          
          if (data.user_message && data.bot_reply) {
            messagesDiv.insertAdjacentHTML("beforeend", this.renderDMMessage(data.user_message));
            messagesDiv.insertAdjacentHTML("beforeend", this.renderDMMessage(data.bot_reply));
          } else {
            messagesDiv.insertAdjacentHTML("beforeend", this.renderDMMessage(data));
          }
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
      }
    };
    
    document.getElementById("dm-send-btn")?.addEventListener("click", sendMessage);
    document.getElementById("dm-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  }

  private renderDMMessage(msg: any): string {
    const isMe = msg.user_id === this.appState.user?.id;
    const parsedContent = this.parseMarkdown(msg.content || '');
    const safeId = this.escapeHtml(msg.id || '');
    return `
      <div class="dm-msg-wrapper flex ${isMe ? 'justify-end' : 'justify-start'}" data-dm-msg-id="${safeId}" style="position:relative;">
        <div style="max-width:70%;position:relative;">
          <div class="max-w-full ${isMe ? 'bg-emerald-600 text-white' : 'bg-white text-zinc-900'} rounded-xl px-4 py-2 shadow">
            ${msg.image_url ? `<img src="${msg.image_url}" style="max-width: 200px !important; max-height: 200px !important; width: auto !important; height: auto !important; object-fit: contain !important; display: block !important;" class="rounded-lg mb-2 cursor-pointer dm-msg-image" onclick="window.open('${msg.image_url}', '_blank')" />` : ''}
            ${msg.content ? `<div class="text-sm prose prose-sm ${isMe ? 'prose-invert' : ''} max-w-none dm-markdown">${parsedContent}</div>` : ''}
            <p class="text-[10px] ${isMe ? 'text-emerald-200' : 'text-zinc-500'} mt-1">${this.formatTime(msg.created_at)}</p>
          </div>
          <div class="dm-reactions-display" data-dm-msg-id="${safeId}" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;${isMe ? 'justify-content:flex-end;' : ''}"></div>
          <button class="dm-reaction-btn" data-dm-msg-id="${safeId}" style="display:none;position:absolute;${isMe ? 'left:-28px;' : 'right:-28px;'}bottom:4px;width:24px;height:24px;border-radius:50%;background:#27272a;border:1px solid #3f3f46;cursor:pointer;align-items:center;justify-content:center;font-size:12px;z-index:10;transition:all 0.15s;" title="React">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  public async startDM(userId: string): Promise<void> {
    const res = await fetch(`/api/dm/start/${userId}`, {
      method: "POST",
      headers: { "X-Auth-Hash": this.appState.hash || "" }
    });
    
    if (res.ok) {
      const conv = await res.json();
      this.openDMChat(conv.id, conv.other_user.id, conv.other_user.displayName);
    }
  }

  private async viewUserProfile(userId: string): Promise<void> {
    const res = await fetch(`/api/users/${userId}`, {
      headers: { "X-Auth-Hash": this.appState.hash || "" }
    });
    
    if (!res.ok) {
      alert("Could not load user profile");
      return;
    }
    
    const user = await res.json();
    const isOwnProfile = userId === this.appState.user?.id;
    
    this.setContent(`
      <div class="h-full w-full flex flex-col">
        <div class="panel flex-1 max-w-2xl mx-auto w-full">
          <div class="panel-header">
            <button id="profile-back-btn" class="text-zinc-400 hover:text-zinc-100 transition-colors mr-3">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <span class="panel-title">${this.escapeHtml(user.displayName || 'User Profile')}</span>
          </div>
          <div class="panel-body p-6">
            <div class="flex items-start gap-6 mb-6">
              <div class="w-24 h-24 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                ${user.avatar ? `<img src="${user.avatar}" class="w-full h-full object-cover"/>` : `<span class="text-emerald-400 font-bold text-3xl">${(user.displayName || '?')[0].toUpperCase()}</span>`}
              </div>
              <div class="flex-1">
                <h2 class="text-xl font-bold text-zinc-100">${this.escapeHtml(user.displayName || 'Unknown')}</h2>
                <p class="text-zinc-400">${this.escapeHtml(user.field || 'Explorer')}</p>
                ${user.skills?.length > 0 ? `
                  <div class="flex flex-wrap gap-1 mt-2">
                    ${user.skills.map((s: string) => `<span class="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded text-xs text-emerald-400">${this.escapeHtml(s)}</span>`).join('')}
                  </div>
                ` : ''}
              </div>
            </div>
            
            ${user.bio ? `<p class="text-zinc-300 mb-4">${this.escapeHtml(user.bio)}</p>` : ''}
            
            ${!isOwnProfile ? `
              <div class="flex gap-2 mt-6">
                <button id="send-dm-btn" class="btn btn-primary flex-1" data-user-id="${userId}">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                  Send Message
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `);
    
    document.getElementById("profile-back-btn")?.addEventListener("click", () => {
      if (this.currentGroupId) {
        this.openGroup(this.currentGroupId);
      } else {
        this.showFeed();
      }
    });
    document.getElementById("send-dm-btn")?.addEventListener("click", () => this.startDM(userId));
  }

  private async showExplore(): Promise<void> {
    this.setActiveNav("nav-explore");
    const [trendingRes, ecosystemsRes] = await Promise.all([
      fetch("/api/hashtags/trending"),
      fetch("/api/ecosystems/explore", { headers: { "X-Auth-Hash": this.appState.hash || "" } })
    ]);
    const trending = trendingRes.ok ? await trendingRes.json() : [];
    const ecosystems = ecosystemsRes.ok ? await ecosystemsRes.json() : [];

    this.setContent(`
      <div class="h-full w-full flex flex-col">
        <div class="panel flex-1">
          <div class="panel-header">
            <span class="panel-title">Explore</span>
            <span class="text-xs text-zinc-500">Ecosystems & discover</span>
          </div>
          <div class="panel-body p-4">
            <div class="relative mb-4">
              <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input type="text" id="explore-search" placeholder="Search users, bots, hashtags, groups..." 
                  class="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all">
              </div>
              <div id="search-results" class="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl hidden overflow-hidden max-h-96 overflow-y-auto"></div>
            </div>

            <div class="bg-zinc-800/50 rounded-lg p-4 mb-4 border border-zinc-700">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <i data-lucide="globe" class="w-4 h-4 text-emerald-400"></i>
                  Ecosystems
                </h3>
                <div class="flex items-center gap-2">
                  <input type="text" id="eco-filter" placeholder="Filter..." class="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 w-32">
                  <button id="create-eco-btn" class="btn btn-primary text-xs py-1 px-3">
                    <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Create
                  </button>
                </div>
              </div>
              <div id="eco-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                ${ecosystems.length === 0 ? `
                  <div class="col-span-full text-center py-6 text-zinc-500 text-sm">No ecosystems found</div>
                ` : ecosystems.map((eco: any) => {
                  const isMember = this.userEcosystems.some((ue: any) => ue.id === eco.id);
                  return `
                  <div class="eco-card bg-zinc-900 border border-zinc-700 rounded-xl p-4 hover:border-zinc-600 transition-all" data-eco-id="${eco.id}" data-eco-name="${this.escapeHtml(eco.name).toLowerCase()}">
                    <div class="flex items-start gap-3 mb-3">
                      ${eco.icon ? `<img src="${eco.icon}" class="w-10 h-10 rounded-lg flex-shrink-0" alt="">` :
                        `<div class="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-lg font-bold text-white" style="background-color: ${eco.accent_color || '#10b981'}">${eco.name.charAt(0).toUpperCase()}</div>`}
                      <div class="flex-1 min-w-0">
                        <h4 class="text-sm font-semibold text-zinc-100 truncate">${this.escapeHtml(eco.name)}</h4>
                        <p class="text-[11px] text-zinc-500">${eco.member_count || 0} members</p>
                      </div>
                    </div>
                    <p class="text-xs text-zinc-400 mb-3 line-clamp-2">${this.escapeHtml(eco.description || '')}</p>
                    <button class="eco-join-btn w-full text-xs py-1.5 rounded-lg font-medium transition-all ${isMember 
                      ? 'bg-zinc-800 text-zinc-400 hover:bg-red-500/20 hover:text-red-400' 
                      : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}" data-eco-id="${eco.id}" data-is-member="${isMember}">
                      ${isMember ? 'Joined' : 'Join'}
                    </button>
                  </div>`;
                }).join("")}
              </div>
            </div>
            
            <div class="bg-zinc-800/50 rounded-lg p-4 mb-4 border border-zinc-700">
              <h3 class="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2">
                <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
                </svg>
                Trending Hashtags
              </h3>
              <div class="flex flex-wrap gap-2">
                ${trending.length === 0 ? `
                  <p class="text-zinc-500 text-xs">No trending hashtags yet</p>
                ` : trending.map((t: any) => `
                  <button class="trending-tag text-xs" data-tag="${t.tag}">
                    <span class="text-purple-400">#${t.tag}</span>
                    <span class="text-zinc-500">${t.count}</span>
                  </button>
                `).join("")}
              </div>
            </div>
            
            <div class="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <h3 class="text-sm font-semibold text-zinc-100 mb-3">Quick Tips</h3>
              <div class="space-y-2 text-xs text-zinc-400">
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">@</span>
                  <span><code class="text-emerald-400">@username</code> to mention</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold">#</span>
                  <span><code class="text-purple-400">#topic</code> to tag</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold">*</span>
                  <span>Markdown supported</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);

    if ((window as any).lucide) (window as any).lucide.createIcons();

    document.querySelectorAll(".trending-tag").forEach(btn => {
      btn.addEventListener("click", () => {
        const tag = (btn as HTMLElement).dataset.tag;
        if (tag) this.showHashtagFeed(tag);
      });
    });

    document.getElementById("create-eco-btn")?.addEventListener("click", () => this.showCreateEcosystem());

    const ecoFilter = document.getElementById("eco-filter") as HTMLInputElement;
    if (ecoFilter) {
      ecoFilter.addEventListener("input", () => {
        const q = ecoFilter.value.trim().toLowerCase();
        document.querySelectorAll(".eco-card").forEach(card => {
          const name = (card as HTMLElement).dataset.ecoName || "";
          (card as HTMLElement).style.display = !q || name.includes(q) ? "" : "none";
        });
      });
    }

    document.querySelectorAll(".eco-join-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const ecoId = (btn as HTMLElement).dataset.ecoId;
        const isMember = (btn as HTMLElement).dataset.isMember === "true";
        if (!ecoId) return;
        const endpoint = isMember ? `/api/ecosystems/${ecoId}/leave` : `/api/ecosystems/${ecoId}/join`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "X-Auth-Hash": this.appState.hash || "" }
        });
        if (res.ok) {
          await this.loadUserEcosystems();
          this.showExplore();
        } else {
          const data = await res.json().catch(() => ({ detail: "Failed" }));
          showToast(data.detail || "Action failed", "error");
        }
      });
    });
    
    this.setupExploreSearch();
  }

  private async showEcosystemExplore(): Promise<void> {
    this.showExplore();
  }
  
  private setupExploreSearch(): void {
    const input = document.getElementById("explore-search") as HTMLInputElement;
    const resultsDiv = document.getElementById("search-results");
    if (!input || !resultsDiv) return;
    
    let debounceTimer: any = null;
    
    input.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      const query = input.value.trim();
      
      if (query.length < 2) {
        resultsDiv.classList.add("hidden");
        resultsDiv.innerHTML = "";
        return;
      }
      
      debounceTimer = setTimeout(async () => {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) return;
        const data = await res.json();
        
        const hasResults = data.users.length || data.bots.length || data.hashtags.length || data.groups.length;
        
        if (!hasResults) {
          resultsDiv.innerHTML = `<div class="p-4 text-center text-zinc-500 text-sm">No results found</div>`;
          resultsDiv.classList.remove("hidden");
          return;
        }
        
        let html = "";
        
        if (data.users.length) {
          html += `<div class="px-3 py-2 bg-zinc-800/50 text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-2">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            Users
          </div>`;
          data.users.forEach((u: any) => {
            html += `<button class="search-result-user w-full px-3 py-2 flex items-center gap-3 hover:bg-zinc-800 transition-colors text-left" data-id="${u.id}" data-name="${this.escapeHtml(u.displayName)}">
              ${u.avatar ? `<img src="${u.avatar}" class="w-8 h-8 rounded-full object-cover border border-zinc-700">` : 
                `<div class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">${u.displayName?.charAt(0) || "?"}</div>`}
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-zinc-100 truncate">${this.escapeHtml(u.displayName)}</div>
                <div class="text-xs text-zinc-500 truncate">@${this.escapeHtml(u.username)} · ${this.escapeHtml(u.field || "Member")}</div>
              </div>
            </button>`;
          });
        }
        
        if (data.bots.length) {
          html += `<div class="px-3 py-2 bg-zinc-800/50 text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-2">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            Bots
          </div>`;
          data.bots.forEach((b: any) => {
            html += `<button class="search-result-user w-full px-3 py-2 flex items-center gap-3 hover:bg-zinc-800 transition-colors text-left" data-id="${b.id}" data-name="${this.escapeHtml(b.displayName)}">
              ${b.avatar ? `<img src="${b.avatar}" class="w-8 h-8 rounded-full object-cover border border-purple-500/50">` : 
                `<div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-sm font-bold">${b.displayName?.charAt(0) || "?"}</div>`}
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-zinc-100 truncate flex items-center gap-1">${this.escapeHtml(b.displayName)} <span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">BOT</span></div>
                <div class="text-xs text-zinc-500 truncate">${this.escapeHtml(b.purpose || "Bot")}</div>
              </div>
            </button>`;
          });
        }
        
        if (data.hashtags.length) {
          html += `<div class="px-3 py-2 bg-zinc-800/50 text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-2">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/></svg>
            Hashtags
          </div>`;
          data.hashtags.forEach((h: any) => {
            html += `<button class="search-result-tag w-full px-3 py-2 flex items-center gap-3 hover:bg-zinc-800 transition-colors text-left" data-tag="${h.tag}">
              <div class="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-lg font-bold">#</div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-purple-400">#${this.escapeHtml(h.tag)}</div>
                <div class="text-xs text-zinc-500">${h.count} posts</div>
              </div>
            </button>`;
          });
        }
        
        if (data.groups.length) {
          html += `<div class="px-3 py-2 bg-zinc-800/50 text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-2">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            Groups
          </div>`;
          data.groups.forEach((g: any) => {
            const ecoLabel = g.ecosystem_name ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-medium border border-emerald-500/20">${this.escapeHtml(g.ecosystem_name)}</span>` : '';
            html += `<button class="search-result-group w-full px-3 py-2 flex items-center gap-3 hover:bg-zinc-800 transition-colors text-left" data-id="${g.id}" data-slug="${g.slug}">
              <div class="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm font-bold">${g.name?.charAt(0) || "G"}</div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-zinc-100 truncate flex items-center gap-2">${this.escapeHtml(g.name)} ${ecoLabel}</div>
                <div class="text-xs text-zinc-500 truncate">${this.escapeHtml(g.description || g.slug)}</div>
              </div>
            </button>`;
          });
        }
        
        resultsDiv.innerHTML = html;
        resultsDiv.classList.remove("hidden");
        
        resultsDiv.querySelectorAll(".search-result-user").forEach(btn => {
          btn.addEventListener("click", () => {
            const userId = (btn as HTMLElement).dataset.id;
            const userName = (btn as HTMLElement).dataset.name;
            if (userId) {
              resultsDiv.classList.add("hidden");
              input.value = "";
              this.showUserProfile(userName || userId);
            }
          });
        });
        
        resultsDiv.querySelectorAll(".search-result-tag").forEach(btn => {
          btn.addEventListener("click", () => {
            const tag = (btn as HTMLElement).dataset.tag;
            if (tag) {
              resultsDiv.classList.add("hidden");
              input.value = "";
              this.showHashtagFeed(tag);
            }
          });
        });
        
        resultsDiv.querySelectorAll(".search-result-group").forEach(btn => {
          btn.addEventListener("click", () => {
            const groupId = (btn as HTMLElement).dataset.id;
            if (groupId) {
              resultsDiv.classList.add("hidden");
              input.value = "";
              this.openGroup(groupId);
            }
          });
        });
      }, 200);
    });
    
    input.addEventListener("blur", () => {
      setTimeout(() => resultsDiv.classList.add("hidden"), 200);
    });
    
    input.addEventListener("focus", () => {
      if (input.value.trim().length >= 2 && resultsDiv.innerHTML) {
        resultsDiv.classList.remove("hidden");
      }
    });
  }

  private async showHashtagFeed(tag: string): Promise<void> {
    const res = await fetch(`/api/hashtags/${tag}`, {
      headers: { "X-Auth-Hash": this.appState.hash || "" }
    });
    const data = res.ok ? await res.json() : { tag, posts: [], total: 0 };

    this.setContent(`
      <div class="max-w-2xl mx-auto px-4 py-8">
        <div class="flex items-center gap-4 mb-8">
          <button id="back-to-explore" class="text-zinc-400 hover:text-zinc-100 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 class="text-2xl font-bold gradient-text">#${this.escapeHtml(tag)}</h1>
            <p class="text-sm text-zinc-500">${data.total} posts</p>
          </div>
        </div>
        
        <div id="hashtag-posts" class="space-y-4">
          ${data.posts.length === 0 ? `
            <div class="text-center py-16 text-zinc-500">
              <p>No posts with this hashtag yet</p>
            </div>
          ` : data.posts.map((post: any) => `
            <div class="post-card">
              <div class="flex items-start gap-4">
                ${post.author?.avatar ? `
                  <img src="${post.author.avatar}" alt="${post.author.displayName}" class="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-zinc-700">
                ` : `
                  <div class="avatar avatar-md flex-shrink-0">
                    <span>${post.author?.displayName?.charAt(0) || "?"}</span>
                  </div>
                `}
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="font-semibold text-zinc-100">${post.author?.displayName || "Anonymous"}</span>
                    <span class="text-zinc-600">·</span>
                    <span class="text-sm text-zinc-500">${this.formatTime(post.created_at)}</span>
                  </div>
                  <div class="text-zinc-300 leading-relaxed prose prose-sm prose-invert">${parseContent(post.content)}</div>
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `);

    document.getElementById("back-to-explore")?.addEventListener("click", () => this.showExplore());
  }

  private async showUserProfile(username: string): Promise<void> {
    const searchRes = await fetch(`/api/users/search/${username}`);
    const users = searchRes.ok ? await searchRes.json() : [];
    
    const user = users.find((u: any) => 
      u.displayName.toLowerCase() === username.toLowerCase() ||
      (u.username && u.username.toLowerCase() === username.toLowerCase())
    );
    if (!user) {
      showEpicModal("User not found", "error");
      return;
    }

    const userRes = await fetch(`/api/users/${user.id}`);
    const userData = userRes.ok ? await userRes.json() : null;
    
    if (!userData) {
      showEpicModal("User not found", "error");
      return;
    }

    this.setContent(`
      <div class="max-w-2xl mx-auto px-4 py-8">
        <button id="back-btn" class="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 mb-6 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        
        <div class="card">
          <div class="flex items-center gap-5 mb-6">
            <div class="relative">
              ${userData.avatar ? `
                <img src="${userData.avatar}" alt="${userData.displayName}" class="w-20 h-20 rounded-full object-cover border-2 border-zinc-700">
              ` : `
                <div class="avatar avatar-xl">
                  <span>${userData.displayName.charAt(0).toUpperCase()}</span>
                </div>
              `}
              <div class="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-emerald-500 rounded-full blur opacity-30 -z-10"></div>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-zinc-100">${this.escapeHtml(userData.displayName)}</h2>
              <p class="text-zinc-400">${this.escapeHtml(userData.bio || "No bio")}</p>
            </div>
          </div>
          
          <div class="grid gap-4">
            ${userData.skills?.length > 0 ? `
              <div class="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                <h3 class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Skills</h3>
                <div class="flex flex-wrap gap-2">
                  ${userData.skills.map((s: string) => `<span class="badge badge-skill">${this.escapeHtml(s)}</span>`).join("")}
                </div>
              </div>
            ` : ''}
            
            ${userData.talents?.length > 0 ? `
              <div class="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                <h3 class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Talents</h3>
                <div class="flex flex-wrap gap-2">
                  ${userData.talents.map((t: string) => `<span class="badge badge-talent">${this.escapeHtml(t)}</span>`).join("")}
                </div>
              </div>
            ` : ''}
          </div>
          
          ${user.id !== this.appState.user?.id ? `
            <div class="mt-6">
              <button id="profile-dm-btn" class="btn btn-primary w-full">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
                Send Message
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `);

    document.getElementById("back-btn")?.addEventListener("click", () => this.showApp());
    document.getElementById("profile-dm-btn")?.addEventListener("click", () => this.startDM(user.id));
  }

  private async handleImageSelect(file: File): Promise<void> {
    const errorEl = document.getElementById("upload-error");
    const previewContainer = document.getElementById("image-preview-container");
    const preview = document.getElementById("image-preview") as HTMLImageElement;
    
    // Validate
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      if (errorEl) {
        errorEl.textContent = "Invalid file type. Use JPEG, PNG, GIF, or WebP.";
        errorEl.classList.remove("hidden");
      }
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      if (errorEl) {
        errorEl.textContent = "File too large. Maximum 5MB.";
        errorEl.classList.remove("hidden");
      }
      return;
    }
    
    errorEl?.classList.add("hidden");
    
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      if (preview && previewContainer) {
        preview.src = e.target?.result as string;
        previewContainer.classList.remove("hidden");
      }
    };
    reader.readAsDataURL(file);
    
    // Upload to ImgBB
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/upload/image", {
        method: "POST",
        headers: { "X-Auth-Hash": this.appState.hash || "" },
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        this.pendingImageUrl = data.url;
      } else {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }
    } catch (e: any) {
      if (errorEl) {
        errorEl.textContent = e.message || "Failed to upload image";
        errorEl.classList.remove("hidden");
      }
      this.clearImagePreview();
    }
  }

  private clearImagePreview(): void {
    this.pendingImageUrl = null;
    document.getElementById("image-preview-container")?.classList.add("hidden");
    (document.getElementById("post-image-input") as HTMLInputElement).value = "";
    document.getElementById("upload-error")?.classList.add("hidden");
  }

  private async submitPost(): Promise<void> {
    const content = (document.getElementById("post-content") as HTMLTextAreaElement).value.trim();
    if (!content && !this.pendingImageUrl) return;

    const submitBtn = document.getElementById("submit-post") as HTMLButtonElement;
    submitBtn.disabled = true;
    submitBtn.textContent = "Posting...";

    try {
      await fetch("/api/posts", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Auth-Hash": this.appState.hash || ""
        },
        body: JSON.stringify({ 
          content,
          image_url: this.pendingImageUrl 
        })
      });

      document.getElementById("compose-area")?.classList.add("hidden");
      (document.getElementById("post-content") as HTMLTextAreaElement).value = "";
      this.clearImagePreview();
    } catch (e) {
      console.error("Failed to post:", e);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Post";
    }
  }

  private async loadFeed(): Promise<void> {
    try {
      const res = await fetch("/api/feed", {
        headers: { "X-Auth-Hash": this.appState.hash || "" }
      });
      if (res.ok) {
        this.posts = await res.json();
        this.renderFeed(this.posts);
        this.connectFeedSocket();
      }
    } catch (e) {
      console.error("Failed to load feed:", e);
    }
  }

  private connectFeedSocket(): void {
    if (this.feedSocket && this.feedSocket.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const authHash = this.appState.hash || "";
    const wsUrl = `${protocol}//${window.location.host}/ws/feed?auth=${encodeURIComponent(authHash)}`;
    
    this.feedSocket = new WebSocket(wsUrl);
    
    this.feedSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_post") {
          const newPost = { ...data.post, liked: false };
          this.posts.unshift(newPost);
          this.renderFeed(this.posts);
        } else if (data.type === "dm_message") {
          const dmPanel = (window as any).dmPanelInstance;
          if (dmPanel && dmPanel.currentConversation) {
            const msg = data.message;
            if (msg.conv_id === dmPanel.currentConversation.id) {
              dmPanel.addMessageToUI(msg);
            }
          }
          this.loadNotificationCount();
        } else if (data.type === "dm_reaction_update") {
          const dmPanel = (window as any).dmPanelInstance;
          if (dmPanel && dmPanel.currentConversation && dmPanel.currentConversation.id === data.conv_id) {
            dmPanel.addMessageToUI(data);
          }
        } else if (data.type === "notification_update") {
          const badge = document.getElementById("notification-badge");
          if (badge && data.unread_count > 0) {
            badge.textContent = data.unread_count > 99 ? "99+" : String(data.unread_count);
            badge.classList.remove("hidden");
          }
        } else if (data.type === "reaction_update") {
          if (data.target_type === "post") {
            const container = document.querySelector(`.reactions-display[data-post-id="${data.target_id}"]`);
            if (container) this.renderReactionBadges(container as HTMLElement, data.reactions, 'post', data.target_id);
          }
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };

    this.feedSocket.onerror = (e) => {
      console.error("WebSocket error:", e);
    };

    this.feedSocket.onclose = () => {
      setTimeout(() => this.connectFeedSocket(), 3000);
    };
  }

  private renderFeedShimmers(): string {
    const shimmer = `
      <div class="post-card mx-0 sm:mx-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
        <div class="flex items-start gap-3 sm:gap-4">
          <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 bg-zinc-800 shimmer-block"></div>
          <div class="flex-1 min-w-0 space-y-3">
            <div class="flex items-center gap-2">
              <div class="h-4 w-24 rounded bg-zinc-800 shimmer-block"></div>
              <div class="h-3 w-16 rounded bg-zinc-800/60 shimmer-block"></div>
            </div>
            <div class="space-y-2">
              <div class="h-3.5 w-full rounded bg-zinc-800 shimmer-block"></div>
              <div class="h-3.5 w-4/5 rounded bg-zinc-800 shimmer-block"></div>
              <div class="h-3.5 w-3/5 rounded bg-zinc-800/70 shimmer-block"></div>
            </div>
            <div class="flex items-center gap-4 pt-1">
              <div class="h-7 w-14 rounded-lg bg-zinc-800/50 shimmer-block"></div>
              <div class="h-7 w-14 rounded-lg bg-zinc-800/50 shimmer-block"></div>
              <div class="h-7 w-14 rounded-lg bg-zinc-800/50 shimmer-block"></div>
            </div>
          </div>
        </div>
      </div>`;
    return shimmer.repeat(4);
  }

  private renderFeed(posts: any[]): void {
    const container = document.getElementById("feed-container");
    if (!container) return;

    if (posts.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12">
          <div class="inline-flex items-center justify-center w-12 h-12 bg-zinc-800 rounded-xl mb-3">
            <svg class="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
            </svg>
          </div>
          <p class="text-sm text-zinc-500">No posts yet</p>
        </div>
      `;
      return;
    }

    container.innerHTML = posts.map(post => `
      <div class="post-card mx-0 sm:mx-0 rounded-none sm:rounded-xl border-x-0 sm:border-x" data-post-id="${post.id}">
        <div class="flex items-start gap-3 sm:gap-4">
          ${post.author?.avatar ? `
            <img src="${post.author.avatar}" alt="${post.author.displayName}" class="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0 border border-zinc-700">
          ` : `
            <div class="avatar avatar-md flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12">
              <span class="text-sm sm:text-base">${post.author?.displayName?.charAt(0) || "?"}</span>
            </div>
          `}
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-1 sm:gap-2 mb-1.5 sm:mb-2">
              <span class="font-semibold text-zinc-100 text-sm sm:text-base">${post.author?.displayName || "Anonymous"}</span>
              <span class="text-zinc-600 text-xs sm:text-base">·</span>
              <span class="text-xs sm:text-sm text-zinc-500">${this.formatTime(post.created_at)}${post.edited_at ? ' (edited)' : ''}</span>
              ${post.author?.id === this.appState.user?.id ? `
                <div class="ml-auto flex items-center gap-2">
                  ${this.isWithinEditWindow(post.created_at) ? `
                    <button class="edit-post-btn text-zinc-500 hover:text-blue-400 text-xs transition-colors" data-post-id="${post.id}" data-content="${this.escapeHtml(post.content).replace(/"/g, '&quot;')}" title="Edit (${this.getRemainingTime(post.created_at, 180)})">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                  ` : ''}
                  ${this.isWithinDeleteWindow(post.created_at) ? `
                    <button class="delete-post-btn text-zinc-500 hover:text-emerald-400 text-xs transition-colors" data-post-id="${post.id}" title="Delete (${this.getRemainingTime(post.created_at, 60)})">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  ` : ''}
                </div>
              ` : ''}
            </div>
            <div class="text-zinc-300 leading-relaxed text-sm sm:text-base prose prose-sm prose-invert prose-p:my-1 prose-a:text-emerald-400 prose-code:bg-zinc-800 prose-code:px-1 prose-code:rounded break-words">${parseContent(post.content)}</div>
            ${post.image_url ? `
              <div class="mt-3 rounded-lg overflow-hidden">
                <img src="${post.image_url}" alt="Post image" class="max-w-full max-h-96 object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity" onclick="window.open('${post.image_url}', '_blank')">
              </div>
            ` : ''}
            <div class="reactions-display" data-post-id="${post.id}" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;min-height:0;"></div>
            <div class="flex items-center gap-4 sm:gap-6 mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-zinc-800/50">
              <button class="like-btn ${post.liked ? 'text-emerald-400' : 'text-zinc-500'} hover:text-emerald-400 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-colors active:scale-95" data-post-id="${post.id}">
                <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="${post.liked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                </svg>
                <span class="like-count">${post.likes_count || 0}</span>
              </button>
              <button class="comment-toggle-btn text-zinc-500 hover:text-zinc-300 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-colors active:scale-95" data-post-id="${post.id}">
                <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
                <span class="replies-count">${post.replies_count || 0}</span>
              </button>
              <button class="reaction-btn text-zinc-500 hover:text-yellow-400 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-colors active:scale-95" data-post-id="${post.id}" style="position:relative;">
                <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </button>
            </div>
            <div class="comments-section hidden mt-3 pt-3 border-t border-zinc-800/50" data-post-id="${post.id}">
              <div class="comments-list space-y-2 mb-3"></div>
              <div class="flex gap-2">
                <input type="text" class="comment-input flex-1 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50" placeholder="Write a comment..." data-post-id="${post.id}">
                <button class="send-comment-btn px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors text-sm" data-post-id="${post.id}">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join("");

    container.querySelectorAll(".like-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const postId = (e.currentTarget as HTMLElement).dataset.postId;
        if (postId) this.likePost(postId);
      });
    });

    container.querySelectorAll(".edit-post-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const el = e.currentTarget as HTMLElement;
        const postId = el.dataset.postId;
        const content = el.dataset.content || "";
        if (postId) this.editPost(postId, content);
      });
    });

    container.querySelectorAll(".delete-post-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const postId = (e.currentTarget as HTMLElement).dataset.postId;
        if (postId) this.deletePost(postId);
      });
    });

    container.querySelectorAll(".comment-toggle-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const postId = (e.currentTarget as HTMLElement).dataset.postId;
        if (postId) await this.toggleComments(postId);
      });
    });

    container.querySelectorAll(".send-comment-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const postId = (e.currentTarget as HTMLElement).dataset.postId;
        if (postId) await this.sendComment(postId);
      });
    });

    container.querySelectorAll(".comment-input").forEach(input => {
      input.addEventListener("keypress", async (e) => {
        if ((e as KeyboardEvent).key === "Enter") {
          const postId = (e.currentTarget as HTMLElement).dataset.postId;
          if (postId) await this.sendComment(postId);
        }
      });
    });

    container.querySelectorAll(".reaction-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const el = e.currentTarget as HTMLElement;
        const postId = el.dataset.postId;
        if (postId) this.openEmojiDrawer('post', postId, el);
      });
    });

    container.querySelectorAll(".reactions-display[data-post-id]").forEach(el => {
      const postId = (el as HTMLElement).dataset.postId;
      if (postId) this.loadReactions('post', postId);
    });
  }

  private async likePost(postId: string): Promise<void> {
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: { "X-Auth-Hash": this.appState.hash || "" }
      });
      if (res.ok) {
        const data = await res.json();
        
        const postIdx = this.posts.findIndex(p => p.id === postId);
        if (postIdx !== -1) {
          this.posts[postIdx].liked = data.liked;
          this.posts[postIdx].likes_count = data.likes_count;
        }
        
        const btn = document.querySelector(`.like-btn[data-post-id="${postId}"]`);
        if (btn) {
          const countEl = btn.querySelector(".like-count");
          if (countEl) countEl.textContent = String(data.likes_count);
          
          const svg = btn.querySelector("svg");
          if (svg) {
            svg.setAttribute("fill", data.liked ? "currentColor" : "none");
          }
          
          if (data.liked) {
            btn.classList.add("text-emerald-500");
            btn.classList.remove("text-warm-gray-400");
          } else {
            btn.classList.remove("text-emerald-500");
            btn.classList.add("text-warm-gray-400");
          }
        }
      }
    } catch (e) {
      console.error("Failed to like post:", e);
    }
  }

  private async toggleComments(postId: string): Promise<void> {
    const section = document.querySelector(`.comments-section[data-post-id="${postId}"]`);
    if (!section) return;

    const isHidden = section.classList.contains("hidden");
    if (isHidden) {
      section.classList.remove("hidden");
      await this.loadComments(postId);
    } else {
      section.classList.add("hidden");
    }
  }

  private async loadComments(postId: string): Promise<void> {
    const section = document.querySelector(`.comments-section[data-post-id="${postId}"]`);
    const list = section?.querySelector(".comments-list");
    if (!list) return;

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        headers: { "X-Auth-Hash": this.appState.hash || "" }
      });
      if (res.ok) {
        const comments = await res.json();
        if (comments.length === 0) {
          list.innerHTML = `<p class="text-zinc-500 text-sm italic">No comments yet</p>`;
        } else {
          list.innerHTML = comments.map((c: any) => `
            <div class="flex items-start gap-2 p-2 bg-zinc-800/30 rounded-lg" data-comment-id="${c.id}">
              ${c.author?.avatar ? `
                <img src="${c.author.avatar}" alt="" class="w-6 h-6 rounded-full object-cover">
              ` : `
                <div class="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-300">${c.author?.displayName?.charAt(0) || "?"}</div>
              `}
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-medium text-zinc-200">${c.author?.displayName || "Anonymous"}</span>
                  <span class="text-xs text-zinc-500">${this.formatTime(c.created_at)}</span>
                  ${c.user_id === this.appState.user?.id ? `
                    <button class="delete-comment-btn ml-auto text-zinc-500 hover:text-emerald-400 text-xs" data-comment-id="${c.id}">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  ` : ''}
                </div>
                <p class="text-sm text-zinc-300 mt-0.5">${this.escapeHtml(c.content)}</p>
              </div>
            </div>
          `).join("");

          list.querySelectorAll(".delete-comment-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
              const commentId = (e.currentTarget as HTMLElement).dataset.commentId;
              if (commentId) await this.deleteComment(commentId, postId);
            });
          });
        }
      }
    } catch (e) {
      console.error("Failed to load comments:", e);
    }
  }

  private async sendComment(postId: string): Promise<void> {
    const input = document.querySelector(`.comment-input[data-post-id="${postId}"]`) as HTMLInputElement;
    if (!input) return;

    const content = input.value.trim();
    if (!content) return;

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Hash": this.appState.hash || ""
        },
        body: JSON.stringify({ content })
      });

      if (res.ok) {
        input.value = "";
        await this.loadComments(postId);
        
        const countEl = document.querySelector(`.comment-toggle-btn[data-post-id="${postId}"] .replies-count`);
        if (countEl) {
          const current = parseInt(countEl.textContent || "0", 10);
          countEl.textContent = String(current + 1);
        }
      }
    } catch (e) {
      console.error("Failed to send comment:", e);
    }
  }

  private async deleteComment(commentId: string, postId: string): Promise<void> {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        headers: { "X-Auth-Hash": this.appState.hash || "" }
      });

      if (res.ok) {
        await this.loadComments(postId);
        
        const countEl = document.querySelector(`.comment-toggle-btn[data-post-id="${postId}"] .replies-count`);
        if (countEl) {
          const current = parseInt(countEl.textContent || "0", 10);
          countEl.textContent = String(Math.max(0, current - 1));
        }
      }
    } catch (e) {
      console.error("Failed to delete comment:", e);
    }
  }

  private showProfile(): void {
    const user = this.appState.user;
    if (!user) return;

    this.setActiveNav("nav-profile");

    this.setContent(`
      <div class="h-full w-full flex flex-col">
        <div class="panel flex-1">
          <div class="panel-header">
            <div class="flex items-center gap-3">
              <span class="panel-title">Profile</span>
              <span class="text-xs text-zinc-500">@${user.displayName}</span>
            </div>
            <button id="logout-btn" class="btn btn-destructive text-xs py-1 px-2">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              Logout
            </button>
          </div>
          <div class="panel-body p-4">
            <div class="flex items-center gap-4 mb-4">
              <div class="relative group">
                <label for="avatar-upload" class="cursor-pointer block">
                  ${user.avatar ? `
                    <img src="${user.avatar}" alt="${user.displayName}" class="w-14 h-14 rounded-xl object-cover border border-zinc-700 group-hover:border-emerald-500 transition-colors">
                  ` : `
                    <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg group-hover:ring-2 group-hover:ring-emerald-500 transition-all">
                      ${user.displayName.charAt(0).toUpperCase()}
                    </div>
                  `}
                  <div class="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                  </div>
                </label>
                <input type="file" id="avatar-upload" accept="image/jpeg,image/png,image/gif,image/webp" class="hidden">
              </div>
              <div>
                <h2 class="text-lg font-bold text-zinc-100">${user.displayName}</h2>
                <p class="text-xs text-zinc-400">${user.bio || "No bio"}</p>
                ${user.is_admin ? '<span class="badge badge-approved text-xs mt-1">Admin</span>' : ''}
              </div>
            </div>
            <div id="avatar-upload-status" class="hidden mb-3 p-2 rounded-lg text-xs"></div>
            
            <div class="space-y-3">
              <div class="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                <h3 class="text-xs font-semibold text-zinc-500 mb-2">Profile</h3>
                <div class="flex flex-wrap gap-1">
                  <span class="badge badge-field text-xs">${this.getFieldLabelFromUser(user)}</span>
                  <span class="badge bg-zinc-700 text-zinc-300 border-zinc-600 text-xs">${user.experience}</span>
                </div>
              </div>
              
              <div class="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                <h3 class="text-xs font-semibold text-zinc-500 mb-2">Skills</h3>
                <div class="flex flex-wrap gap-1">
                  ${user.skills.map(s => `<span class="badge badge-skill text-xs">${s}</span>`).join("")}
                </div>
              </div>
              
              ${user.talents.length > 0 ? `
                <div class="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                  <h3 class="text-xs font-semibold text-zinc-500 mb-2">Talents</h3>
                  <div class="flex flex-wrap gap-1">
                    ${user.talents.map(t => `<span class="badge badge-talent text-xs">${t}</span>`).join("")}
                  </div>
                </div>
              ` : ''}
              
              <div class="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                <h3 class="text-xs font-semibold text-zinc-500 mb-2">Login Hash</h3>
                <div class="flex items-center gap-2">
                  <code class="flex-1 text-[10px] font-mono bg-zinc-900 rounded px-2 py-1.5 text-zinc-400 truncate border border-zinc-700" id="hash-display">${this.appState.hash}</code>
                  <button id="copy-hash-btn" class="btn btn-secondary text-xs py-1 px-2">Copy</button>
                </div>
                <p class="text-[10px] text-zinc-500 mt-2">Use this to log in on other devices</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);

    document.getElementById("copy-hash-btn")?.addEventListener("click", async () => {
      const hash = this.appState.hash || "";
      await navigator.clipboard.writeText(hash);
      const btn = document.getElementById("copy-hash-btn")!;
      btn.innerHTML = '<svg class="w-4 h-4 mr-2 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>Copied!';
      setTimeout(() => btn.innerHTML = '<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy', 2000);
    });

    document.getElementById("logout-btn")?.addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(DEVICE_TOKEN_KEY);
      location.reload();
    });

    document.getElementById("avatar-upload")?.addEventListener("change", async (e) => {
      const input = e.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;

      const statusEl = document.getElementById("avatar-upload-status")!;
      statusEl.className = "mb-4 p-3 rounded-lg text-sm bg-zinc-800 text-zinc-300 border border-zinc-700";
      statusEl.textContent = "Uploading...";
      statusEl.classList.remove("hidden");

      try {
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch("/api/upload/image", {
          method: "POST",
          headers: { "X-Auth-Hash": this.appState.hash || "" },
          body: formData
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.detail || "Upload failed");
        }

        const { url } = await uploadRes.json();

        const avatarRes = await fetch("/api/users/me/avatar", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Auth-Hash": this.appState.hash || ""
          },
          body: JSON.stringify({ avatar_url: url })
        });

        if (!avatarRes.ok) {
          throw new Error("Failed to update avatar");
        }

        const updatedUser = await avatarRes.json();
        this.appState.user = updatedUser;

        statusEl.className = "mb-4 p-3 rounded-lg text-sm bg-emerald-900/50 text-emerald-300 border border-emerald-700";
        statusEl.textContent = "Avatar updated!";
        
        setTimeout(() => this.showProfile(), 1000);
      } catch (err: any) {
        statusEl.className = "mb-4 p-3 rounded-lg text-sm bg-emerald-900/50 text-emerald-300 border border-emerald-700";
        statusEl.textContent = err.message || "Upload failed";
      }
    });
  }


  /** AiOS — the v2 surface. Default home after sign-in; the classic views
   *  stay one click away (dock + sidebar). */
  /** The Bridge (P-A): pull v1 environments/workspaces into devnet twins.
   *  Fire-and-forget with the caller's own federated token; 60s throttle.
   *  Resolves true when the pass created or archived twins (callers may
   *  refresh their view), false when throttled, failed, or a no-op. */
  private bridgeSync(): Promise<boolean> {
    try {
      const last = Number(localStorage.getItem("bridge-synced-at") || 0);
      if (Date.now() - last < 60_000) return Promise.resolve(false);
      localStorage.setItem("bridge-synced-at", String(Date.now()));
      return fetch("/api/bridge/sync-workspaces", {
        method: "POST",
        headers: { "X-Auth-Hash": this.appState.hash || "" },
      }).then(async (r) => {
        if (!r.ok) return false;
        const c = await r.json();
        return ((c.communities_created || 0) + (c.archived || 0)) > 0;
      }).catch(() => false);
    } catch { return Promise.resolve(false); /* never block the desktop on the bridge */ }
  }

  private showAiosDesktop(initialApp?: string): void {
    unmountAios();
    this.setActiveNav("nav-aios-desktop");
    this._currentView = "aios";
    // Bridge sync is a background reconcile, not a paint dependency — and it
    // fires the single heaviest upstream call (workspaces?limit=100). Defer
    // it well past first paint so the desktop and its light briefing render
    // first and never queue behind it upstream. (Governed server-side too.)
    // When the pass changed anything, refresh the ecosystems so the bridged
    // twin lands in the switcher (and the landing pick can upgrade off the
    // DevOne fallback) without a reload.
    setTimeout(() => {
      void this.bridgeSync().then((changed) => {
        if (changed) void this.loadUserEcosystems();
      });
    }, 4000);
    void mountAios(this.container, {
      displayName: this.appState.user?.displayName || "there",
      initialApp,
      onClassic: (view) => {
        unmountAios();
        if (view === "workspaces") this.showGroups();
        else if (view === "messages") this.showMessages();
        else this.showApp();
      },
      onSignOut: () => {
        unmountAios();
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem("aias_session_token");
        window.location.reload();
      },
    });
  }

  private showDocs(initialSection?: string): void {
    this.setActiveNav("nav-docs");

    const sections: { id: string; title: string; icon: string; children?: { id: string; title: string }[] }[] = [
      { id: "getting-started", title: "Getting Started", icon: "rocket", children: [
        { id: "gs-overview", title: "What is AiAssist Secure?" },
        { id: "gs-signup", title: "Creating Your Account" },
        { id: "gs-2fa", title: "Two-Factor Authentication" },
        { id: "gs-wizard", title: "Onboarding Wizard" },
        { id: "gs-matchmaking", title: "Matchmaking & Network Reveal" }
      ]},
      { id: "feed", title: "Feed & Posts", icon: "rss", children: [
        { id: "feed-overview", title: "Global Feed" },
        { id: "feed-posting", title: "Creating Posts" },
        { id: "feed-markdown", title: "Markdown & Formatting" },
        { id: "feed-mentions", title: "@Mentions" },
        { id: "feed-hashtags", title: "#Hashtags" },
        { id: "feed-images", title: "Image Uploads" }
      ]},
      { id: "communities", title: "Communities", icon: "users", children: [
        { id: "comm-overview", title: "Overview" },
        { id: "comm-joining", title: "Joining Communities" },
        { id: "comm-creating", title: "Creating a Community" },
        { id: "comm-messaging", title: "Messaging" },
        { id: "comm-moderation", title: "Moderation & Approval" },
        { id: "comm-sharing", title: "External Sharing" }
      ]},
      { id: "dm", title: "Direct Messages", icon: "message-square", children: [
        { id: "dm-overview", title: "Overview" },
        { id: "dm-starting", title: "Starting a Conversation" },
        { id: "dm-features", title: "Features" }
      ]},
      { id: "notifications", title: "Notifications", icon: "bell", children: [
        { id: "notif-overview", title: "Overview" },
        { id: "notif-types", title: "Notification Types" }
      ]},
      { id: "profile", title: "Your Profile", icon: "user", children: [
        { id: "profile-overview", title: "Overview" },
        { id: "profile-editing", title: "Editing Your Profile" }
      ]},
      { id: "geppetto", title: "Bot API (Geppetto)", icon: "bot", children: [
        { id: "gep-overview", title: "What is Geppetto?" },
        { id: "gep-creating", title: "Creating a Bot" },
        { id: "gep-commands", title: "Geppetto Commands" },
        { id: "gep-capabilities", title: "Capabilities" },
        { id: "gep-tokens", title: "Authentication & Tokens" },
        { id: "gep-groups", title: "Group Messaging" },
        { id: "gep-approval", title: "Approval System" }
      ]},
      { id: "bot-api", title: "Bot REST API", icon: "code", children: [
        { id: "api-auth", title: "Authentication" },
        { id: "api-profile", title: "Bot Profile" },
        { id: "api-feed", title: "Feed Endpoints" },
        { id: "api-posts", title: "Creating Posts" },
        { id: "api-comments", title: "Comments" },
        { id: "api-groups", title: "Group Messaging" },
        { id: "api-dm", title: "Direct Messages" },
        { id: "api-audit", title: "Audit Log" }
      ]},
      { id: "sdk", title: "SDK Packages", icon: "package", children: [
        { id: "sdk-python", title: "Python SDK" },
        { id: "sdk-node", title: "Node.js SDK" },
        { id: "sdk-websocket", title: "WebSocket Events" }
      ]},
    ];

    const user = this.appState.user;
    if (user && (user.is_admin || user.isSuperAdmin)) {
      sections.push({ id: "admin", title: "Admin Panel", icon: "shield", children: [
        { id: "admin-overview", title: "Overview" },
        { id: "admin-groups", title: "Community Approval" },
        { id: "admin-bots", title: "Bot Management" }
      ]});
    }

    const contentMap: Record<string, string> = {
      "gs-overview": `
        <h1>What is AiAssist Secure?</h1>
        <p>AiAssist Secure is a professional networking platform built for developers, designers, and builders looking to connect, collaborate, and grow. Think of it as a modern dev hub — real-time conversations and networking without the paywall.</p>
        <h3>Core Philosophy</h3>
        <ul>
          <li>Works seamlessly on mobile and desktop</li>
          <li>Automated matchmaking based on your skills and interests</li>
          <li>Real-time messaging with WebSocket support</li>
          <li>Security-first with mandatory two-factor authentication</li>
          <li>Full Markdown support across the platform</li>
        </ul>
        <h3>Key Features</h3>
        <table>
          <thead><tr><th>Feature</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>Global Feed</td><td>Post updates, share images, use @mentions and #hashtags</td></tr>
            <tr><td>Communities</td><td>Real-time group messaging rooms organized by topic</td></tr>
            <tr><td>Direct Messages</td><td>Private 1-on-1 conversations</td></tr>
            <tr><td>Bot API</td><td>Create and deploy bots via Geppetto</td></tr>
            <tr><td>Matchmaking</td><td>Auto-join communities based on your profile</td></tr>
          </tbody>
        </table>
      `,
      "gs-signup": `
        <h1>Creating Your Account</h1>
        <p>Registration on AiAssist Secure uses a unique device fingerprint combined with a username and two-factor authentication.</p>
        <h3>Step-by-Step</h3>
        <ol>
          <li>Visit the platform — your device fingerprint is generated automatically</li>
          <li>Choose a unique display name (will be normalized to lowercase, no spaces)</li>
          <li>Set up mandatory Google Authenticator 2FA</li>
          <li>Complete the onboarding wizard to build your profile</li>
        </ol>
        <div class="doc-callout doc-callout-info">
          <strong>Username Rules</strong>
          <p>Usernames are automatically normalized: converted to lowercase, spaces removed, and trimmed. This prevents impersonation. For example, "John Doe" becomes "johndoe".</p>
        </div>
        <div class="doc-callout doc-callout-warning">
          <strong>Important</strong>
          <p>You must complete 2FA setup within 1 hour. Incomplete registrations are automatically deleted for security.</p>
        </div>
      `,
      "gs-2fa": `
        <h1>Two-Factor Authentication</h1>
        <p>AiAssist Secure requires Google TOTP (Time-based One-Time Password) for all accounts. This is mandatory and cannot be skipped.</p>
        <h3>Setup Process</h3>
        <ol>
          <li>Install <strong>Google Authenticator</strong> on your phone (iOS or Android)</li>
          <li>During registration, scan the QR code shown on screen</li>
          <li>Enter the 6-digit code from the app to verify</li>
          <li>Your 2FA is now active — you'll need a code each time you log in</li>
        </ol>
        <h3>Logging In</h3>
        <p>Each login requires your device fingerprint plus a valid 2FA code from Google Authenticator. If you lose access to your authenticator app, contact an admin for account recovery.</p>
      `,
      "gs-wizard": `
        <h1>Onboarding Wizard</h1>
        <p>After creating your account, the onboarding wizard collects information to build your professional profile and match you with relevant communities.</p>
        <h3>Wizard Steps</h3>
        <table>
          <thead><tr><th>Step</th><th>What You Choose</th><th>Example Options</th></tr></thead>
          <tbody>
            <tr><td>1. Field</td><td>Your primary professional area</td><td>Development, Marketing, Product, Data, DevOps</td></tr>
            <tr><td>2. Experience</td><td>Your experience level</td><td>Junior, Mid-level, Senior, Expert</td></tr>
            <tr><td>3. Skills</td><td>Your technical or professional skills</td><td>React, Python, SEO, Figma, Docker</td></tr>
            <tr><td>4. Focus</td><td>Your work orientation</td><td>Product, Technical, Growth, Design, Systems</td></tr>
            <tr><td>5. Team Preference</td><td>Your ideal team size</td><td>Solo, Small (2-5), Medium (5-15), Large (15+)</td></tr>
            <tr><td>6. Talents</td><td>Hidden talents discovered through questions</td><td>Leadership, Mentoring, Public Speaking</td></tr>
            <tr><td>7. Interests</td><td>Topics you care about</td><td>Startups, Open Source, Freelance, AI</td></tr>
          </tbody>
        </table>
      `,
      "gs-matchmaking": `
        <h1>Matchmaking & Network Reveal</h1>
        <p>After completing the wizard, AiAssist Secure's matchmaking engine automatically connects you to relevant communities.</p>
        <h3>How Matchmaking Works</h3>
        <ol>
          <li>Your wizard answers are analyzed against 70+ pre-built communities</li>
          <li>You're auto-joined to every community that matches your field, skills, interests, or talents</li>
          <li>The <strong>Network Reveal</strong> screen shows all your matched communities with animated cards</li>
        </ol>
        <div class="doc-callout doc-callout-info">
          <strong>Tip</strong>
          <p>The more detailed your wizard answers, the more communities you'll be matched with. You can always join additional communities later from the Communities page.</p>
        </div>
      `,
      "feed-overview": `
        <h1>Global Feed</h1>
        <p>The global feed is the main timeline — similar to X (Twitter). All posts from all users appear here in reverse chronological order.</p>
        <h3>What You'll See</h3>
        <ul>
          <li>Posts from all users across the platform</li>
          <li>Embedded images with click-to-expand</li>
          <li>Rendered Markdown formatting</li>
          <li>Clickable @mentions and #hashtags</li>
          <li>Like and comment counts</li>
          <li>Real-time updates via WebSocket (new posts appear automatically)</li>
        </ul>
      `,
      "feed-posting": `
        <h1>Creating Posts</h1>
        <p>Share updates, thoughts, and content with the entire AiAssist Secure community.</p>
        <h3>How to Post</h3>
        <ol>
          <li>Click the text area at the top of the Feed page</li>
          <li>Write your content (Markdown supported)</li>
          <li>Optionally attach an image using the camera icon</li>
          <li>Click <strong>Post</strong> to publish</li>
        </ol>
        <h3>Post Features</h3>
        <ul>
          <li><strong>Markdown</strong> — Bold, italic, code blocks, links, lists, and more</li>
          <li><strong>@Mentions</strong> — Tag other users with <code>@username</code></li>
          <li><strong>#Hashtags</strong> — Add topic tags with <code>#topic</code></li>
          <li><strong>Images</strong> — Upload images (max 10MB, JPG/PNG/GIF/WebP)</li>
        </ul>
      `,
      "feed-markdown": `
        <h1>Markdown & Formatting</h1>
        <p>AiAssist Secure supports full GitHub Flavored Markdown (GFM) across posts, comments, community messages, and direct messages.</p>
        <h3>Supported Syntax</h3>
        <table>
          <thead><tr><th>Format</th><th>Syntax</th><th>Result</th></tr></thead>
          <tbody>
            <tr><td>Bold</td><td><code>**text**</code></td><td><strong>text</strong></td></tr>
            <tr><td>Italic</td><td><code>*text*</code></td><td><em>text</em></td></tr>
            <tr><td>Code (inline)</td><td><code>\`code\`</code></td><td><code>code</code></td></tr>
            <tr><td>Code Block</td><td><code>\`\`\`lang\\ncode\\n\`\`\`</code></td><td>Syntax-highlighted block</td></tr>
            <tr><td>Link</td><td><code>[text](url)</code></td><td>Clickable link</td></tr>
            <tr><td>List</td><td><code>- item</code></td><td>Bullet list</td></tr>
            <tr><td>Numbered List</td><td><code>1. item</code></td><td>Ordered list</td></tr>
            <tr><td>Heading</td><td><code># Heading</code></td><td>Large heading</td></tr>
            <tr><td>Blockquote</td><td><code>&gt; quote</code></td><td>Indented quote</td></tr>
            <tr><td>Strikethrough</td><td><code>~~text~~</code></td><td><del>text</del></td></tr>
          </tbody>
        </table>
      `,
      "feed-mentions": `
        <h1>@Mentions</h1>
        <p>Tag other users in posts and messages to get their attention.</p>
        <h3>How to Mention</h3>
        <p>Type <code>@</code> followed by the username: <code>@johndoe</code></p>
        <h3>What Happens</h3>
        <ul>
          <li>The mentioned user receives a real-time notification</li>
          <li>The @mention is highlighted and clickable in the post</li>
          <li>Clicking a mention navigates to that user's profile</li>
          <li>Mentions work in posts, comments, community messages, and DMs</li>
        </ul>
      `,
      "feed-hashtags": `
        <h1>#Hashtags</h1>
        <p>Organize content by topic with hashtags.</p>
        <h3>How to Use</h3>
        <p>Add <code>#</code> before a word: <code>#react</code>, <code>#devlife</code>, <code>#launch</code></p>
        <h3>Discoverability</h3>
        <ul>
          <li>Hashtags are automatically extracted and indexed</li>
          <li>Click any hashtag to see all posts with that tag</li>
          <li>Trending hashtags appear on the <strong>Explore</strong> page</li>
          <li>The trending algorithm ranks tags by usage count</li>
        </ul>
      `,
      "feed-images": `
        <h1>Image Uploads</h1>
        <p>Share images in posts, community messages, and direct messages.</p>
        <h3>Supported Formats</h3>
        <ul>
          <li>JPEG, PNG, GIF, WebP</li>
          <li>Maximum file size: 10MB</li>
          <li>Images are hosted via ImgBB CDN</li>
        </ul>
        <h3>How to Upload</h3>
        <ol>
          <li>Click the camera/image icon in the compose area</li>
          <li>Select an image from your device</li>
          <li>A preview appears — click the X to remove it</li>
          <li>Submit your post/message to upload</li>
        </ol>
      `,
      "comm-overview": `
        <h1>Communities</h1>
        <p>Communities are real-time messaging rooms organized by topic — similar to Slack channels or Telegram groups. They're the heart of AiAssist Secure's collaboration features.</p>
        <h3>Features</h3>
        <ul>
          <li>Real-time messaging via WebSocket</li>
          <li>Full Markdown support</li>
          <li>Image sharing</li>
          <li>Member lists</li>
          <li>Owner moderation controls</li>
          <li>Bot integration support</li>
          <li>External invite links</li>
        </ul>
      `,
      "comm-joining": `
        <h1>Joining Communities</h1>
        <p>There are several ways to join a community:</p>
        <h3>1. Automatic Matchmaking</h3>
        <p>When you complete the onboarding wizard, you're auto-joined to communities matching your profile.</p>
        <h3>2. Browse & Join</h3>
        <p>From the Communities page, browse all available communities and click <strong>Join</strong> on any that interest you.</p>
        <h3>3. Invite Links</h3>
        <p>Communities have shareable links in the format <code>/g/{slug}</code>. Opening an invite link auto-joins you to that community.</p>
        <h3>Leaving a Community</h3>
        <p>You can leave any community at any time. However, community owners must transfer ownership before leaving.</p>
      `,
      "comm-creating": `
        <h1>Creating a Community</h1>
        <p>Any user can create a new community. However, new communities require admin approval before going live.</p>
        <h3>Steps</h3>
        <ol>
          <li>Go to the Communities page</li>
          <li>Click <strong>Create Community</strong></li>
          <li>Enter a name, slug (URL-friendly identifier), and description</li>
          <li>Submit — your community enters the moderation queue</li>
          <li>An admin will review and approve or reject it</li>
        </ol>
        <div class="doc-callout doc-callout-info">
          <strong>Slug Format</strong>
          <p>The slug becomes part of the shareable URL, e.g., <code>/g/react-devs</code>. Keep it short, lowercase, and use hyphens for spaces.</p>
        </div>
      `,
      "comm-messaging": `
        <h1>Community Messaging</h1>
        <p>Once you've joined a community, you can send and receive messages in real time.</p>
        <h3>Features</h3>
        <ul>
          <li><strong>Real-time delivery</strong> — Messages appear instantly for all members</li>
          <li><strong>Markdown</strong> — Full GFM formatting support</li>
          <li><strong>Images</strong> — Upload and share images inline</li>
          <li><strong>@Mentions</strong> — Tag specific members</li>
          <li><strong>Message history</strong> — Scroll up to load older messages (50 at a time)</li>
        </ul>
      `,
      "comm-moderation": `
        <h1>Moderation & Approval</h1>
        <p>Communities go through a moderation pipeline to ensure quality.</p>
        <h3>Status Flow</h3>
        <table>
          <thead><tr><th>Status</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>pending</code></td><td>Awaiting admin review — shown with "In Moderation" badge</td></tr>
            <tr><td><code>approved</code></td><td>Live and visible to all users</td></tr>
            <tr><td><code>rejected</code></td><td>Denied by admin — not visible</td></tr>
          </tbody>
        </table>
        <h3>Owner Responsibilities</h3>
        <ul>
          <li>Manage community members</li>
          <li>Approve or reject bot applications for the community</li>
          <li>Transfer ownership if needed before leaving</li>
        </ul>
      `,
      "comm-sharing": `
        <h1>External Sharing</h1>
        <p>Every community has a shareable URL that can be distributed outside of AiAssist Secure.</p>
        <h3>Share Link Format</h3>
        <p><code>https://your-domain/g/{slug}</code></p>
        <h3>What Happens</h3>
        <ul>
          <li>If the user is logged in, they auto-join and are taken to the community</li>
          <li>If not logged in, they're prompted to register first</li>
        </ul>
      `,
      "dm-overview": `
        <h1>Direct Messages</h1>
        <p>Private 1-on-1 conversations between users. Messages are only visible to the two participants.</p>
        <h3>Features</h3>
        <ul>
          <li>Full Markdown support</li>
          <li>Image sharing</li>
          <li>Real-time delivery via WebSocket</li>
          <li>Unread message count</li>
          <li>Notification alerts with message preview</li>
        </ul>
      `,
      "dm-starting": `
        <h1>Starting a Conversation</h1>
        <p>There are multiple ways to start a DM:</p>
        <ol>
          <li><strong>From a profile</strong> — Click the message icon on any user's profile</li>
          <li><strong>From the Messages page</strong> — Search for a user and start a conversation</li>
          <li><strong>From a mention</strong> — Click a user's name in the feed</li>
        </ol>
      `,
      "dm-features": `
        <h1>DM Features</h1>
        <h3>Formatting</h3>
        <p>DMs support full GitHub Flavored Markdown — bold, italic, code blocks, links, and more.</p>
        <h3>Images</h3>
        <p>Upload and share images directly in DM conversations.</p>
        <h3>Notifications</h3>
        <p>You receive a real-time notification for each new DM. Click the notification to jump directly to the conversation.</p>
        <h3>Bot Messages</h3>
        <p>Bots (like Geppetto) can also send you DMs. Bot messages appear with a bot badge.</p>
      `,
      "notif-overview": `
        <h1>Notifications</h1>
        <p>AiAssist Secure's notification system keeps you informed about activity that involves you.</p>
        <h3>How It Works</h3>
        <ul>
          <li>Notifications appear in real time via WebSocket</li>
          <li>The bell icon in the sidebar shows your unread count</li>
          <li>Click a notification to navigate to the relevant content</li>
          <li>Mark notifications as read individually or view all</li>
        </ul>
      `,
      "notif-types": `
        <h1>Notification Types</h1>
        <table>
          <thead><tr><th>Type</th><th>Trigger</th><th>Action on Click</th></tr></thead>
          <tbody>
            <tr><td>Mention</td><td>Someone @mentions you in a post or comment</td><td>Opens the post</td></tr>
            <tr><td>Comment</td><td>Someone comments on your post</td><td>Opens the post</td></tr>
            <tr><td>DM</td><td>You receive a direct message</td><td>Opens the conversation</td></tr>
            <tr><td>Community Message</td><td>New messages in your communities (batched)</td><td>Opens the community</td></tr>
            <tr><td>Bot Approved</td><td>Your bot application is approved</td><td>Shows approval details</td></tr>
          </tbody>
        </table>
        <div class="doc-callout doc-callout-info">
          <strong>Batched Notifications</strong>
          <p>Community messages are batched to avoid notification spam. Instead of one notification per message, you'll see "5 new messages in react-devs".</p>
        </div>
      `,
      "profile-overview": `
        <h1>Your Profile</h1>
        <p>Your profile showcases your professional identity on AiAssist Secure — built from your wizard answers and customizable fields.</p>
        <h3>Profile Fields</h3>
        <ul>
          <li><strong>Display Name</strong> — Your unique username</li>
          <li><strong>Avatar</strong> — Upload a profile photo</li>
          <li><strong>Bio</strong> — A short description of yourself</li>
          <li><strong>Field</strong> — Your professional area (from wizard)</li>
          <li><strong>Experience</strong> — Your level (from wizard)</li>
          <li><strong>Skills</strong> — Technical and professional skills</li>
          <li><strong>Talents</strong> — Discovered through the wizard</li>
          <li><strong>Facebook</strong> — Link to your Facebook profile</li>
        </ul>
      `,
      "profile-editing": `
        <h1>Editing Your Profile</h1>
        <p>Click the <strong>Edit</strong> button on your profile page to update:</p>
        <ul>
          <li>Avatar (upload a new photo)</li>
          <li>Bio text</li>
          <li>Facebook Profile URL</li>
          <li>Social links</li>
        </ul>
        <div class="doc-callout doc-callout-warning">
          <strong>Note</strong>
          <p>Your display name cannot be changed after registration to prevent impersonation.</p>
        </div>
      `,
      "gep-overview": `
        <h1>What is Geppetto?</h1>
        <p>Geppetto is AiAssist Secure's bot orchestration system. It's a system bot that helps you create, manage, and deploy bots through conversational commands in your DMs.</p>
        <h3>How It Works</h3>
        <ol>
          <li>Open a DM with <strong>Geppetto</strong> (find it in your messages or the Bots page)</li>
          <li>Use slash commands to create and manage bots</li>
          <li>Geppetto walks you through each step conversationally</li>
          <li>Your bots get API tokens and can interact with the platform programmatically</li>
        </ol>
        <div class="doc-callout doc-callout-info">
          <strong>Geppetto is automatic</strong>
          <p>Geppetto is a system bot initialized on platform startup. You don't need to create it — just DM it to get started.</p>
        </div>
      `,
      "gep-creating": `
        <h1>Creating a Bot</h1>
        <p>Use the <code>/newbot</code> command in your DM with Geppetto to create a new bot.</p>
        <h3>Process</h3>
        <ol>
          <li>Send <code>/newbot</code> to Geppetto</li>
          <li>Geppetto asks for a bot name</li>
          <li>Provide a description of what your bot does</li>
          <li>Select capabilities (what your bot can do)</li>
          <li>Geppetto creates the bot and provides your API token</li>
        </ol>
        <div class="doc-callout doc-callout-warning">
          <strong>Save Your Token</strong>
          <p>The API token is only shown once. Store it securely — you'll need it for all API requests. If you lose it, use <code>/token</code> to regenerate (invalidates the old one).</p>
        </div>
      `,
      "gep-commands": `
        <h1>Geppetto Commands</h1>
        <table>
          <thead><tr><th>Command</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>/newbot</code></td><td>Start the bot creation wizard</td></tr>
            <tr><td><code>/mybots</code></td><td>List all your bots and their status</td></tr>
            <tr><td><code>/token</code></td><td>Regenerate API token for a bot (invalidates old token)</td></tr>
            <tr><td><code>/deletebot</code></td><td>Delete one of your bots permanently</td></tr>
            <tr><td><code>/apply</code></td><td>Apply for a bot to join a community</td></tr>
          </tbody>
        </table>
        <div class="doc-callout doc-callout-info">
          <strong>Conversational Flow</strong>
          <p>Geppetto commands aren't one-shot — they start a conversation. Geppetto will ask follow-up questions and guide you through each step.</p>
        </div>
      `,
      "gep-capabilities": `
        <h1>Bot Capabilities</h1>
        <p>Bots operate with a capability-based permission system. Each capability grants access to specific API endpoints.</p>
        <table>
          <thead><tr><th>Capability</th><th>Allows</th></tr></thead>
          <tbody>
            <tr><td><code>post</code></td><td>Create posts on the global feed</td></tr>
            <tr><td><code>comment</code></td><td>Comment on existing posts</td></tr>
            <tr><td><code>group_message</code></td><td>Send messages in approved communities</td></tr>
            <tr><td><code>send_dm</code></td><td>Send direct messages to users (respects opt-out)</td></tr>
            <tr><td><code>react</code></td><td>React to posts and messages</td></tr>
          </tbody>
        </table>
        <div class="doc-callout doc-callout-warning">
          <strong>Scope Enforcement</strong>
          <p>API requests outside a bot's granted capabilities will be rejected with a <code>403 Forbidden</code> response.</p>
        </div>
      `,
      "gep-tokens": `
        <h1>Authentication & Tokens</h1>
        <p>Bots authenticate using bearer tokens in the format <code>dvn_bot_*</code>.</p>
        <h3>Token Format</h3>
        <p>Tokens are prefixed with <code>dvn_bot_</code> followed by a random string. They are SHA-256 hashed before storage — AiAssist Secure never stores raw tokens.</p>
        <h3>Using Your Token</h3>
        <p>Include the token in the <code>Authorization</code> header:</p>
        <pre><code>Authorization: Bearer dvn_bot_abc123xyz...</code></pre>
        <h3>Regenerating Tokens</h3>
        <p>Use <code>/token</code> in your DM with Geppetto. This immediately invalidates the old token and issues a new one.</p>
      `,
      "gep-groups": `
        <h1>Bot Group Messaging</h1>
        <p>Bots can send messages to communities, but they need per-community approval from the community owner.</p>
        <h3>Process</h3>
        <ol>
          <li>Your bot must have the <code>group_message</code> capability</li>
          <li>Use <code>/apply</code> in Geppetto or call the API to apply to a community</li>
          <li>The community owner reviews and approves/rejects the application</li>
          <li>Once approved, your bot can send messages to that community</li>
        </ol>
      `,
      "gep-approval": `
        <h1>Approval System</h1>
        <p>AiAssist Secure uses a two-tier approval system for bots:</p>
        <h3>Tier 1: Global Approval</h3>
        <p>When you create a bot via Geppetto, it is auto-approved globally with the requested capabilities. There's no waiting period for basic bot creation.</p>
        <h3>Tier 2: Community Approval</h3>
        <p>For community messaging, each community owner must individually approve bots. This gives community owners full control over which bots can participate.</p>
        <h3>Community Owner Actions</h3>
        <table>
          <thead><tr><th>Action</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>View Applications</td><td>See pending bot applications for your community</td></tr>
            <tr><td>Approve</td><td>Allow the bot to send messages</td></tr>
            <tr><td>Reject</td><td>Deny the application</td></tr>
            <tr><td>Remove</td><td>Revoke a previously approved bot</td></tr>
          </tbody>
        </table>
      `,
      "api-auth": `
        <h1>API Authentication</h1>
        <p>All Bot API endpoints require a bearer token in the <code>Authorization</code> header.</p>
        <pre><code>curl -H "Authorization: Bearer dvn_bot_your_token_here" \\
  https://your-domain/api/bots/me</code></pre>
        <div class="doc-callout doc-callout-warning">
          <strong>Token Security</strong>
          <p>Never share your bot token publicly. If compromised, use <code>/token</code> in Geppetto to regenerate immediately.</p>
        </div>
      `,
      "api-profile": `
        <h1>Bot Profile</h1>
        <h3>GET /api/bots/me</h3>
        <p>Retrieve your bot's profile information.</p>
        <pre><code>curl -H "Authorization: Bearer dvn_bot_xxx" \\
  https://your-domain/api/bots/me</code></pre>
        <h3>Response</h3>
        <pre><code>{
  "id": "bot-uuid",
  "displayName": "my-bot",
  "description": "A helpful bot",
  "capabilities": ["post", "comment"],
  "owner_id": "user-uuid",
  "created_at": "2026-02-05T12:00:00Z"
}</code></pre>
      `,
      "api-feed": `
        <h1>Feed Endpoints</h1>
        <h3>GET /api/bots/feed</h3>
        <p>Read the global feed. No special capability required.</p>
        <pre><code>curl -H "Authorization: Bearer dvn_bot_xxx" \\
  https://your-domain/api/bots/feed</code></pre>
        <h3>Response</h3>
        <pre><code>[
  {
    "id": "post-uuid",
    "content": "Hello world!",
    "author": { "id": "uuid", "displayName": "johndoe" },
    "created_at": "2026-02-05T12:00:00Z",
    "likes_count": 5
  }
]</code></pre>
      `,
      "api-posts": `
        <h1>Creating Posts</h1>
        <p>Requires the <code>post</code> capability.</p>
        <h3>POST /api/bots/posts</h3>
        <pre><code>curl -X POST \\
  -H "Authorization: Bearer dvn_bot_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Hello from my bot! #automated"}' \\
  https://your-domain/api/bots/posts</code></pre>
        <h3>Request Body</h3>
        <table>
          <thead><tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>content</code></td><td>string</td><td>Yes</td><td>Post content (Markdown, @mentions, #hashtags supported)</td></tr>
            <tr><td><code>image_url</code></td><td>string</td><td>No</td><td>ImgBB URL for image attachment</td></tr>
          </tbody>
        </table>
      `,
      "api-comments": `
        <h1>Comments</h1>
        <p>Requires the <code>comment</code> capability.</p>
        <h3>POST /api/bots/posts/{post_id}/comments</h3>
        <pre><code>curl -X POST \\
  -H "Authorization: Bearer dvn_bot_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Great post!"}' \\
  https://your-domain/api/bots/posts/POST_ID/comments</code></pre>
      `,
      "api-groups": `
        <h1>Community Messaging (Bot API)</h1>
        <p>Requires the <code>group_message</code> capability plus community-level approval.</p>
        <h3>GET /api/bots/groups</h3>
        <p>List communities the bot belongs to.</p>
        <h3>POST /api/bots/groups/{id}/apply</h3>
        <p>Apply to join a community. The community owner will be notified.</p>
        <h3>POST /api/bots/groups/{id}/messages</h3>
        <p>Send a message to an approved community.</p>
        <pre><code>curl -X POST \\
  -H "Authorization: Bearer dvn_bot_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Automated update: build passed!"}' \\
  https://your-domain/api/bots/groups/GROUP_ID/messages</code></pre>
        <div class="doc-callout doc-callout-warning">
          <strong>Approval Required</strong>
          <p>Sending messages to a community before approval returns <code>403 Forbidden</code>.</p>
        </div>
      `,
      "api-dm": `
        <h1>Bot Direct Messages</h1>
        <p>Requires the <code>send_dm</code> capability.</p>
        <h3>POST /api/bots/dm/{user_id}</h3>
        <p>Send a DM to a user.</p>
        <pre><code>curl -X POST \\
  -H "Authorization: Bearer dvn_bot_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Hello! I have an update for you."}' \\
  https://your-domain/api/bots/dm/USER_ID</code></pre>
        <div class="doc-callout doc-callout-info">
          <strong>User Opt-Out</strong>
          <p>Users can opt out of receiving bot DMs. If a user has opted out, the API returns <code>403</code>.</p>
        </div>
      `,
      "api-audit": `
        <h1>Audit Log</h1>
        <p>Every bot action is recorded in an immutable audit log.</p>
        <h3>GET /api/bots/audit</h3>
        <p>Retrieve your bot's audit trail.</p>
        <pre><code>curl -H "Authorization: Bearer dvn_bot_xxx" \\
  https://your-domain/api/bots/audit</code></pre>
        <h3>Logged Actions</h3>
        <ul>
          <li>Post creation</li>
          <li>Comments</li>
          <li>Community messages</li>
          <li>DMs sent</li>
          <li>Community applications</li>
          <li>Token regeneration</li>
        </ul>
      `,
      "sdk-python": `
        <h1>Python SDK</h1>
        <p>Official Python client for the AiAssist Secure Bot API.</p>
        <h3>Installation</h3>
        <pre><code>pip install devnetwork-bot</code></pre>
        <h3>Quick Start</h3>
        <pre><code>from devnetwork import DevNetworkBot

bot = DevNetworkBot(
    token="dvn_bot_your_token",
    base_url="https://your-domain"
)

# Get bot profile
profile = bot.me()
print(f"Bot: {profile['displayName']}")

# Create a post
bot.create_post("Hello from Python! #automated")

# Read the feed
feed = bot.get_feed()
for post in feed:
    print(f"{post['author']['displayName']}: {post['content']}")

# Send a DM
bot.send_dm(user_id="uuid", content="Hey there!")

# Comment on a post
bot.create_comment(post_id="uuid", content="Nice!")

# Send community message
bot.send_group_message(group_id="uuid", content="Update!")</code></pre>
        <h3>WebSocket (Real-time)</h3>
        <pre><code>import asyncio
from devnetwork import DevNetworkBot

bot = DevNetworkBot(token="dvn_bot_xxx", base_url="https://your-domain")

async def on_message(data):
    print(f"New event: {data}")

asyncio.run(bot.connect_ws(on_message))</code></pre>
      `,
      "sdk-node": `
        <h1>Node.js SDK</h1>
        <p>Official Node.js/TypeScript client for the AiAssist Secure Bot API.</p>
        <h3>Installation</h3>
        <pre><code>npm install devnetwork-bot</code></pre>
        <h3>Quick Start</h3>
        <pre><code>import { DevNetworkBot } from 'devnetwork-bot';

const bot = new DevNetworkBot({
  token: 'dvn_bot_your_token',
  baseUrl: 'https://your-domain'
});

// Get bot profile
const profile = await bot.me();
console.log(\`Bot: \${profile.displayName}\`);

// Create a post
await bot.createPost('Hello from Node.js! #automated');

// Read the feed
const feed = await bot.getFeed();
feed.forEach(post =>
  console.log(\`\${post.author.displayName}: \${post.content}\`)
);

// Send a DM
await bot.sendDM('user-uuid', 'Hey there!');

// Send community message
await bot.sendGroupMessage('group-uuid', 'Build passed!');</code></pre>
        <h3>WebSocket (Real-time)</h3>
        <pre><code>bot.connectWebSocket((data) => {
  console.log('New event:', data);
});</code></pre>
      `,
      "sdk-websocket": `
        <h1>WebSocket Events</h1>
        <p>AiAssist Secure supports real-time communication via WebSocket connections.</p>
        <h3>Endpoints</h3>
        <table>
          <thead><tr><th>Endpoint</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>ws://host/ws/feed</code></td><td>Real-time feed updates (new posts)</td></tr>
            <tr><td><code>ws://host/ws/group/{group_id}</code></td><td>Real-time community messages</td></tr>
          </tbody>
        </table>
        <h3>Event Types</h3>
        <table>
          <thead><tr><th>Event</th><th>Payload</th></tr></thead>
          <tbody>
            <tr><td><code>new_post</code></td><td>Full post object with author info</td></tr>
            <tr><td><code>new_message</code></td><td>Full message object with sender info</td></tr>
          </tbody>
        </table>
        <h3>Example (JavaScript)</h3>
        <pre><code>const ws = new WebSocket('wss://your-domain/ws/feed');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'new_post') {
    console.log('New post:', data.post.content);
  }
};</code></pre>
      `,
      "admin-overview": `
        <h1>Admin Panel</h1>
        <p>The admin panel is available to users with admin or super admin privileges. Access it via the shield icon in the sidebar.</p>
        <h3>Dashboard Stats</h3>
        <ul>
          <li>Total users</li>
          <li>Total posts</li>
          <li>Total communities</li>
          <li>Pending community approvals</li>
          <li>Pending bot applications</li>
        </ul>
        <h3>Becoming an Admin</h3>
        <p>A super admin can promote users to admin status. The first super admin is created via the command-line script:</p>
        <pre><code>python scripts/create_superadmin.py &lt;username&gt;</code></pre>
      `,
      "admin-groups": `
        <h1>Community Approval (Admin)</h1>
        <p>Admins review and manage community creation requests.</p>
        <h3>Approval Queue</h3>
        <ul>
          <li>View all pending community requests</li>
          <li>See the community name, description, and creator</li>
          <li>Approve to make it live, or reject to deny</li>
        </ul>
        <h3>Endpoints</h3>
        <table>
          <thead><tr><th>Method</th><th>Endpoint</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>GET</td><td><code>/api/admin/groups/pending</code></td><td>List pending communities</td></tr>
            <tr><td>POST</td><td><code>/api/admin/groups/{id}/approve</code></td><td>Approve a community</td></tr>
            <tr><td>POST</td><td><code>/api/admin/groups/{id}/reject</code></td><td>Reject a community</td></tr>
          </tbody>
        </table>
      `,
      "admin-bots": `
        <h1>Bot Management (Admin)</h1>
        <p>Admins can manage all bots on the platform.</p>
        <h3>Admin Bot Actions</h3>
        <table>
          <thead><tr><th>Action</th><th>Endpoint</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>List All Bots</td><td><code>GET /api/admin/bots</code></td><td>See all registered bots</td></tr>
            <tr><td>Pending Applications</td><td><code>GET /api/admin/bots/applications</code></td><td>Review pending bot applications</td></tr>
            <tr><td>Approve</td><td><code>POST /api/admin/bots/{id}/approve</code></td><td>Approve with capabilities</td></tr>
            <tr><td>Reject</td><td><code>POST /api/admin/bots/{id}/reject</code></td><td>Reject application</td></tr>
            <tr><td>Revoke</td><td><code>POST /api/admin/bots/{id}/revoke</code></td><td>Revoke capabilities</td></tr>
          </tbody>
        </table>
      `
    };

    const activeSection = initialSection || "gs-overview";

    this.setContent(`
      <div class="h-full w-full flex flex-col md:flex-row bg-zinc-950" style="max-height:100%;overflow:hidden;">
        <div class="hidden md:flex w-72 flex-shrink-0 border-r border-zinc-800 flex-col bg-zinc-900/50" style="overflow:hidden;">
          <div class="p-4 border-b border-zinc-800">
            <div class="flex items-center gap-2 mb-3">
              <i data-lucide="book-open" class="w-5 h-5 text-emerald-400"></i>
              <span class="text-sm font-bold text-zinc-100">Documentation</span>
            </div>
            <div class="relative">
              <i data-lucide="search" class="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"></i>
              <input type="text" id="docs-search" placeholder="Search docs..." class="input text-xs py-1.5 pl-8 pr-3 w-full" />
            </div>
          </div>
          <div class="flex-1 overflow-y-auto custom-scrollbar py-2" id="docs-sidebar-nav">
            ${sections.map(s => `
              <div class="docs-section-group" data-section-id="${s.id}">
                <button class="docs-section-toggle w-full text-left px-4 py-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors">
                  <i data-lucide="${s.icon}" class="w-3.5 h-3.5"></i>
                  <span class="flex-1">${s.title}</span>
                  <i data-lucide="chevron-right" class="w-3 h-3 docs-chevron transition-transform ${s.children?.some(c => c.id === activeSection) ? 'rotate-90' : ''}"></i>
                </button>
                <div class="docs-section-children ${s.children?.some(c => c.id === activeSection) ? '' : 'hidden'}">
                  ${(s.children || []).map(c => `
                    <button class="docs-nav-item w-full text-left px-4 pl-10 py-1.5 text-sm transition-colors ${c.id === activeSection ? 'text-emerald-400 bg-emerald-500/10 border-r-2 border-emerald-500' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}" data-doc-id="${c.id}">
                      ${c.title}
                    </button>
                  `).join("")}
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="md:hidden border-b border-zinc-800 bg-zinc-900 p-3">
          <div class="flex items-center gap-2 mb-2">
            <i data-lucide="book-open" class="w-4 h-4 text-emerald-400"></i>
            <span class="text-sm font-bold text-zinc-100">Docs</span>
          </div>
          <select id="docs-mobile-nav" class="input w-full text-sm py-2">
            ${sections.map(s => `
              <optgroup label="${s.title}">
                ${(s.children || []).map(c => `
                  <option value="${c.id}" ${c.id === activeSection ? 'selected' : ''}>${c.title}</option>
                `).join("")}
              </optgroup>
            `).join("")}
          </select>
        </div>

        <div class="flex-1 overflow-y-auto custom-scrollbar" id="docs-content-area">
          <div class="max-w-3xl mx-auto p-6 md:p-10">
            <div id="docs-content" class="docs-content">
              ${contentMap[activeSection] || '<p class="text-zinc-400">Select a section from the sidebar.</p>'}
            </div>
          </div>
        </div>
      </div>
    `);

    if ((window as any).lucide) (window as any).lucide.createIcons();

    document.querySelectorAll(".docs-section-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        const group = btn.closest(".docs-section-group");
        const children = group?.querySelector(".docs-section-children");
        const chevron = btn.querySelector(".docs-chevron");
        if (children) {
          children.classList.toggle("hidden");
          chevron?.classList.toggle("rotate-90");
        }
      });
    });

    document.querySelectorAll(".docs-nav-item").forEach(btn => {
      btn.addEventListener("click", () => {
        const docId = (btn as HTMLElement).dataset.docId;
        if (docId && contentMap[docId]) {
          this.renderDocSection(docId, contentMap, sections);
        }
      });
    });

    const mobileNav = document.getElementById("docs-mobile-nav") as HTMLSelectElement;
    mobileNav?.addEventListener("change", () => {
      const docId = mobileNav.value;
      if (docId && contentMap[docId]) {
        this.renderDocSection(docId, contentMap, sections);
      }
    });

    const searchInput = document.getElementById("docs-search") as HTMLInputElement;
    searchInput?.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase().trim();
      document.querySelectorAll(".docs-section-group").forEach(group => {
        const items = group.querySelectorAll(".docs-nav-item");
        let hasMatch = false;
        items.forEach(item => {
          const text = (item as HTMLElement).textContent?.toLowerCase() || "";
          const matches = !query || text.includes(query);
          (item as HTMLElement).style.display = matches ? "" : "none";
          if (matches) hasMatch = true;
        });
        const children = group.querySelector(".docs-section-children");
        const chevron = group.querySelector(".docs-chevron");
        if (query && hasMatch) {
          children?.classList.remove("hidden");
          chevron?.classList.add("rotate-90");
        }
        (group as HTMLElement).style.display = hasMatch || !query ? "" : "none";
      });
    });
  }

  private renderDocSection(docId: string, contentMap: Record<string, string>, sections: any[]): void {
    const contentDiv = document.getElementById("docs-content");
    if (contentDiv && contentMap[docId]) {
      contentDiv.innerHTML = contentMap[docId];
      document.getElementById("docs-content-area")?.scrollTo(0, 0);
    }

    document.querySelectorAll(".docs-nav-item").forEach(item => {
      const id = (item as HTMLElement).dataset.docId;
      if (id === docId) {
        item.classList.add("text-emerald-400", "bg-emerald-500/10", "border-r-2", "border-emerald-500");
        item.classList.remove("text-zinc-400", "hover:text-zinc-200", "hover:bg-zinc-800/50");
      } else {
        item.classList.remove("text-emerald-400", "bg-emerald-500/10", "border-r-2", "border-emerald-500");
        item.classList.add("text-zinc-400", "hover:text-zinc-200", "hover:bg-zinc-800/50");
      }
    });

    for (const s of sections) {
      if (s.children?.some((c: any) => c.id === docId)) {
        const group = document.querySelector(`[data-section-id="${s.id}"]`);
        const children = group?.querySelector(".docs-section-children");
        const chevron = group?.querySelector(".docs-chevron");
        children?.classList.remove("hidden");
        chevron?.classList.add("rotate-90");
      }
    }

    const mobileNav = document.getElementById("docs-mobile-nav") as HTMLSelectElement;
    if (mobileNav) mobileNav.value = docId;
  }

  private async showGeppetto(): Promise<void> {
    this.setActiveNav("nav-geppetto");
    const user = this.appState.user;
    if (!user) {
      this.showApp();
      return;
    }

    const botsRes = await fetch("/api/my-bots", {
      headers: { "X-Auth-Hash": this.appState.hash || "" }
    });
    const myBots = botsRes.ok ? await botsRes.json() : [];

    this.setContent(`
      <div class="h-full w-full flex flex-col">
        <div class="panel flex-1">
          <div class="panel-header">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <span class="panel-title">Geppetto Bot Console</span>
            </div>
          </div>
          <div class="panel-body space-y-6">
            <!-- Chat with Geppetto -->
            <div class="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                    <span class="text-white font-bold text-sm">G</span>
                  </div>
                  <div>
                    <p class="text-zinc-100 font-medium">Geppetto</p>
                    <p class="text-zinc-500 text-xs">Bot Management Assistant</p>
                  </div>
                </div>
                <button id="open-geppetto-dm" class="btn btn-primary text-sm">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                  Chat with Geppetto
                </button>
              </div>
              <p class="text-zinc-400 text-sm">Create and manage bots through conversational commands. Say hi to get started!</p>
            </div>

            <!-- Quick Commands -->
            <div>
              <h3 class="text-zinc-300 font-medium mb-3">Quick Commands</h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button class="geppetto-cmd bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg p-3 text-left transition-colors" data-cmd="/newbot">
                  <p class="text-zinc-100 font-medium text-sm">/newbot</p>
                  <p class="text-zinc-500 text-xs mt-1">Create a new bot</p>
                </button>
                <button class="geppetto-cmd bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg p-3 text-left transition-colors" data-cmd="/mybots">
                  <p class="text-zinc-100 font-medium text-sm">/mybots</p>
                  <p class="text-zinc-500 text-xs mt-1">List your bots</p>
                </button>
                <button class="geppetto-cmd bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg p-3 text-left transition-colors" data-cmd="/help">
                  <p class="text-zinc-100 font-medium text-sm">/help</p>
                  <p class="text-zinc-500 text-xs mt-1">Show all commands</p>
                </button>
                <button class="geppetto-cmd bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg p-3 text-left transition-colors" data-cmd="/token">
                  <p class="text-zinc-100 font-medium text-sm">/token</p>
                  <p class="text-zinc-500 text-xs mt-1">Regenerate API token</p>
                </button>
              </div>
            </div>

            <!-- My Bots -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-zinc-300 font-medium">Your Bots</h3>
                <span class="text-zinc-500 text-sm">${myBots.length} bot${myBots.length !== 1 ? 's' : ''}</span>
              </div>
              ${myBots.length === 0 ? `
                <div class="bg-zinc-800/30 rounded-xl p-8 text-center border border-zinc-700/50">
                  <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-800 flex items-center justify-center">
                    <svg class="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <p class="text-zinc-400 text-sm mb-3">No bots yet</p>
                  <button id="create-first-bot" class="btn btn-primary text-sm">Create your first bot</button>
                </div>
              ` : `
                <div class="space-y-2">
                  ${myBots.map((b: any) => `
                    <div class="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                          <span class="text-white font-bold text-sm">${(b.displayName || 'B').charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p class="text-zinc-100 font-medium">${this.escapeHtml(b.displayName)}</p>
                          <div class="flex items-center gap-2 mt-1">
                            <span class="text-zinc-500 text-xs">@${this.escapeHtml(b.username || b.displayName?.toLowerCase())}</span>
                            <span class="px-1.5 py-0.5 rounded text-[10px] ${b.bot_data?.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : b.bot_data?.status === 'active' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}">${b.bot_data?.status || 'pending'}</span>
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        ${b.bot_data?.capabilities_granted_global?.length > 0 ? `
                          <div class="flex gap-1">
                            ${b.bot_data.capabilities_granted_global.slice(0, 3).map((c: string) => `
                              <span class="px-1.5 py-0.5 bg-zinc-700 text-zinc-300 rounded text-[10px]">${c}</span>
                            `).join('')}
                          </div>
                        ` : ''}
                        <span class="text-zinc-500 text-xs">...${b.bot_data?.api_token_suffix || '????'}</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>

            <!-- API Documentation -->
            <div class="bg-zinc-800/30 rounded-xl p-4 border border-zinc-700/50">
              <h3 class="text-zinc-300 font-medium mb-3">Bot API Endpoints</h3>
              <div class="font-mono text-xs space-y-2 text-zinc-400">
                <p><span class="text-emerald-400">GET</span> /api/bots/me - Bot profile</p>
                <p><span class="text-emerald-400">GET</span> /api/bots/feed - Read global feed</p>
                <p><span class="text-cyan-400">POST</span> /api/bots/posts - Create post</p>
                <p><span class="text-cyan-400">POST</span> /api/bots/posts/:id/comments - Comment</p>
                <p><span class="text-cyan-400">POST</span> /api/bots/dm/:user_id - Send DM</p>
                <p><span class="text-emerald-400">GET</span> /api/bots/audit - Audit log</p>
              </div>
              <p class="text-zinc-500 text-xs mt-3">Authenticate with: <code class="text-zinc-300">Authorization: Bearer YOUR_TOKEN</code></p>
            </div>
          </div>
        </div>
      </div>
    `);

    document.getElementById("open-geppetto-dm")?.addEventListener("click", () => this.openGeppettoDM());
    document.getElementById("create-first-bot")?.addEventListener("click", () => this.openGeppettoDM("/newbot"));

    document.querySelectorAll(".geppetto-cmd").forEach(btn => {
      btn.addEventListener("click", () => {
        const cmd = (btn as HTMLElement).dataset.cmd;
        if (cmd) this.openGeppettoDM(cmd);
      });
    });
  }

  private async openGeppettoDM(initialMessage?: string): Promise<void> {
    const geppettoId = "geppetto-system-bot";
    
    const res = await fetch(`/api/dm/start/${geppettoId}`, {
      method: "POST",
      headers: { "X-Auth-Hash": this.appState.hash || "" }
    });
    
    if (res.ok) {
      const data = await res.json();
      const convId = data.id;
      this.appState.currentDMConversation = convId;
      
      if (initialMessage) {
        await fetch(`/api/dm/${convId}/messages`, {
          method: "POST",
          headers: { 
            "X-Auth-Hash": this.appState.hash || "",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ content: initialMessage })
        });
      }
      
      this.openDMChat(convId, geppettoId, "Geppetto");
    }
  }

  private async showAdmin(): Promise<void> {
    this.setActiveNav("nav-admin");
    const user = this.appState.user;
    const isEcoAdmin = this.activeEcosystem && this.userEcosystems.find(
      (e: any) => e.id === this.activeEcosystem?.id && e.user_role === "admin"
    );
    if (!user?.is_admin && !user?.is_superadmin && !isEcoAdmin) {
      this.showApp();
      return;
    }

    const ecoId = this.activeEcosystem?.id || this.defaultEcosystemId;
    const ecoName = this.activeEcosystem?.name?.toUpperCase() || 'DEVNET';

    const adminHeaders = { "X-Auth-Hash": this.appState.hash || "" };
    const [statsRes, pendingRes, activityRes, usersRes, botAppsRes, botsRes, ecoRes] = await Promise.all([
      fetch(`/api/admin/stats?ecosystem_id=${ecoId}`, { headers: adminHeaders }),
      fetch(`/api/admin/groups/pending?ecosystem_id=${ecoId}`, { headers: adminHeaders }),
      fetch(`/api/admin/activity/summary?ecosystem_id=${ecoId}`, { headers: adminHeaders }),
      fetch(`/api/admin/users?ecosystem_id=${ecoId}`, { headers: adminHeaders }),
      fetch(`/api/admin/bots/applications?ecosystem_id=${ecoId}`, { headers: adminHeaders }),
      fetch(`/api/admin/bots?ecosystem_id=${ecoId}`, { headers: adminHeaders }),
      fetch(`/api/ecosystems/${ecoId}`, { headers: adminHeaders })
    ]);
    
    const stats = statsRes.ok ? await statsRes.json() : { users: 0, posts: 0, groups: 0, pending_groups: 0 };
    const pendingGroups = pendingRes.ok ? await pendingRes.json() : [];
    const activity = activityRes.ok ? await activityRes.json() : { total_events: 0, action_counts: {}, recent: [] };
    const allUsers = usersRes.ok ? await usersRes.json() : [];
    const pendingBotApps = botAppsRes.ok ? await botAppsRes.json() : [];
    const allBots = botsRes.ok ? await botsRes.json() : [];
    const ecoMeta = ecoRes.ok ? await ecoRes.json() : {};

    const isSuperAdmin = stats.admin_role === "super_admin";
    const now = new Date();
    const uptime = Math.floor(Math.random() * 99999) + 10000;
    
    this.setContent(`
      <div class="h-full w-full flex flex-col bg-black overflow-hidden font-mono">
        <!-- Terminal Header -->
        <div class="bg-black border-b border-emerald-500/30 px-4 py-2 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <span class="text-emerald-500 text-lg font-bold tracking-wider animate-pulse">▶ ${ecoName} COMMAND CENTER</span>
            <span class="text-emerald-400/60 text-xs">v2.2.2</span>
            <span class="${isSuperAdmin ? 'text-amber-400 bg-amber-500/20 px-2 py-0.5' : 'text-cyan-400 bg-cyan-500/20 px-2 py-0.5'} text-[10px] uppercase tracking-wider">${isSuperAdmin ? 'PLATFORM ADMIN' : 'ECO ADMIN'}</span>
          </div>
          <div class="flex items-center gap-6 text-xs">
            <span class="text-emerald-400/80">SYS_UPTIME: <span class="text-emerald-300">${uptime}s</span></span>
            <span class="text-emerald-400/80">ADMIN: <span class="text-emerald-300">@${user?.displayName}</span></span>
            <span class="text-amber-400 animate-pulse">${pendingGroups.length > 0 ? '⚠ ' + pendingGroups.length + ' PENDING' : '● NOMINAL'}</span>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          <!-- Stats Grid - Bloomberg Style -->
          <div class="grid grid-cols-4 gap-3">
            <div class="bg-black border border-emerald-500/40 p-4 relative overflow-hidden group hover:border-emerald-400 transition-colors">
              <div class="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent"></div>
              <div class="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl"></div>
              <p class="text-emerald-500/60 text-[10px] uppercase tracking-widest mb-1">${isSuperAdmin ? 'USERS.TOTAL' : 'ECO.MEMBERS'}</p>
              <p class="text-4xl font-bold text-emerald-400 tabular-nums">${String(stats.users).padStart(4, '0')}</p>
              <div class="flex items-center gap-1 mt-2">
                <span class="text-emerald-400/60 text-xs">${isSuperAdmin ? '● registered' : '● in ecosystem'}</span>
              </div>
            </div>
            <div class="bg-black border border-cyan-500/40 p-4 relative overflow-hidden group hover:border-cyan-400 transition-colors">
              <div class="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent"></div>
              <div class="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-2xl"></div>
              <p class="text-cyan-500/60 text-[10px] uppercase tracking-widest mb-1">POSTS.FEED</p>
              <p class="text-4xl font-bold text-cyan-400 tabular-nums">${String(stats.posts).padStart(4, '0')}</p>
              <div class="flex items-center gap-1 mt-2">
                <span class="text-cyan-500 text-xs">▲</span>
                <span class="text-cyan-400/60 text-xs">${activity.action_counts?.post_create || 0} new</span>
              </div>
            </div>
            <div class="bg-black border border-purple-500/40 p-4 relative overflow-hidden group hover:border-purple-400 transition-colors">
              <div class="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
              <div class="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl"></div>
              <p class="text-purple-500/60 text-[10px] uppercase tracking-widest mb-1">GROUPS.ACTIVE</p>
              <p class="text-4xl font-bold text-purple-400 tabular-nums">${String(stats.groups).padStart(4, '0')}</p>
              <div class="flex items-center gap-1 mt-2">
                <span class="text-purple-400/60 text-xs">● online</span>
              </div>
            </div>
            <div class="bg-black border ${pendingGroups.length > 0 ? 'border-amber-500/60 animate-pulse' : 'border-zinc-700'} p-4 relative overflow-hidden">
              <div class="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent"></div>
              <p class="text-amber-500/60 text-[10px] uppercase tracking-widest mb-1">QUEUE.PENDING</p>
              <p class="text-4xl font-bold ${pendingGroups.length > 0 ? 'text-amber-400' : 'text-zinc-600'} tabular-nums">${String(stats.pending_groups).padStart(4, '0')}</p>
              <div class="flex items-center gap-1 mt-2">
                <span class="${pendingGroups.length > 0 ? 'text-amber-400' : 'text-zinc-600'} text-xs">${pendingGroups.length > 0 ? '⚠ REVIEW' : '✓ CLEAR'}</span>
              </div>
            </div>
          </div>

          <!-- Secondary Stats Row -->
          <div class="grid grid-cols-4 gap-3">
            <div class="bg-black border border-emerald-500/20 p-3">
              <p class="text-emerald-500/50 text-[10px] uppercase tracking-widest">TODAY.EVENTS</p>
              <p class="text-2xl font-bold text-emerald-400 tabular-nums">${activity.today_events || 0}</p>
            </div>
            <div class="bg-black border border-cyan-500/20 p-3">
              <p class="text-cyan-500/50 text-[10px] uppercase tracking-widest">PEAK.HOUR</p>
              <p class="text-2xl font-bold text-cyan-400 tabular-nums">${activity.peak_hour && activity.peak_hour !== 'N/A' ? activity.peak_hour + ':00' : '—'}</p>
            </div>
            <div class="bg-black border border-purple-500/20 p-3">
              <p class="text-purple-500/50 text-[10px] uppercase tracking-widest">ACTIVE.USERS</p>
              <p class="text-2xl font-bold text-purple-400 tabular-nums">${activity.top_users?.length || 0}</p>
            </div>
            <div class="bg-black border border-amber-500/20 p-3">
              <p class="text-amber-500/50 text-[10px] uppercase tracking-widest">ACTIONS.LOGGED</p>
              <p class="text-2xl font-bold text-amber-400 tabular-nums">${Object.keys(activity.action_counts || {}).length}</p>
            </div>
          </div>

          <!-- Main Grid -->
          <div class="grid grid-cols-3 gap-4">
            <!-- Activity Feed - Terminal Style -->
            <div class="col-span-2 bg-black border border-emerald-500/30 overflow-hidden">
              <div class="bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-2 flex items-center justify-between">
                <span class="text-emerald-400 text-sm font-bold tracking-wider">◉ ${isSuperAdmin ? 'LIVE_ACTIVITY_STREAM' : 'ECO_ACTIVITY_STREAM'}</span>
                <div class="flex items-center gap-4">
                  <span class="text-emerald-500/60 text-xs">TODAY: <span class="text-emerald-400">${activity.today_events || 0}</span></span>
                  <span class="text-emerald-500/60 text-xs">TOTAL: <span class="text-emerald-400 tabular-nums">${activity.total_events}</span></span>
                </div>
              </div>
              <div class="p-2 space-y-0.5 max-h-72 overflow-y-auto custom-scrollbar font-mono text-xs">
                ${activity.recent.length === 0 ? `
                  <p class="text-emerald-500/40 text-center py-8">[ NO ACTIVITY LOGGED ]</p>
                ` : activity.recent.slice(0, 20).map((e: any, i: number) => `
                  <div class="flex items-center gap-2 px-2 py-1.5 hover:bg-emerald-500/5 border-l-2 ${i === 0 ? 'border-emerald-400 bg-emerald-500/10' : 'border-transparent'} group">
                    <span class="text-emerald-600/80 w-14 text-[10px]">${this.formatTime(e.timestamp)}</span>
                    <span class="text-emerald-300 w-20 truncate font-medium">@${e.user_name || 'unknown'}</span>
                    <span class="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[9px] uppercase tracking-wider w-28 text-center">${e.action}</span>
                    <span class="text-emerald-300/50 flex-1 truncate text-[10px]">${e.details?.content_preview?.slice(0, 40) || e.details?.target_name || e.details?.post_id?.slice(0, 8) || '—'}</span>
                    <span class="text-emerald-600/40 text-[9px] opacity-0 group-hover:opacity-100">${e.user_id?.slice(0, 6)}</span>
                  </div>
                `).join("")}
              </div>
            </div>

            <!-- Right Column - Metrics + Top Users -->
            <div class="space-y-4">
              <!-- Action Metrics -->
              <div class="bg-black border border-cyan-500/30 overflow-hidden">
                <div class="bg-cyan-500/10 border-b border-cyan-500/30 px-4 py-2 flex items-center justify-between">
                  <span class="text-cyan-400 text-sm font-bold tracking-wider">◉ ACTION_METRICS</span>
                  <span class="text-cyan-500/50 text-[10px]">ALL TIME</span>
                </div>
                <div class="p-2 space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                  ${Object.entries(activity.action_counts || {}).length === 0 ? `
                    <p class="text-cyan-500/40 text-center py-4 text-xs">[ AWAITING DATA ]</p>
                  ` : Object.entries(activity.action_counts).map(([action, count]) => `
                    <div class="flex items-center justify-between py-1 px-2 hover:bg-cyan-500/5">
                      <span class="text-cyan-400/70 text-[10px] uppercase font-mono">${action.replace(/_/g, '.')}</span>
                      <span class="text-cyan-300 font-bold tabular-nums text-sm">${count}</span>
                    </div>
                  `).join("")}
                </div>
              </div>

              <!-- Top Active Users -->
              <div class="bg-black border border-purple-500/30 overflow-hidden">
                <div class="bg-purple-500/10 border-b border-purple-500/30 px-4 py-2">
                  <span class="text-purple-400 text-sm font-bold tracking-wider">◉ TOP_ACTIVE_USERS</span>
                </div>
                <div class="p-2 space-y-1">
                  ${(activity.top_users || []).length === 0 ? `
                    <p class="text-purple-500/40 text-center py-4 text-xs">[ NO DATA ]</p>
                  ` : (activity.top_users || []).map((u: any, i: number) => `
                    <div class="flex items-center gap-2 py-1.5 px-2 hover:bg-purple-500/5">
                      <span class="text-purple-500/60 text-xs w-4">${i + 1}.</span>
                      ${u.avatar ? `<img src="${u.avatar}" class="w-5 h-5 rounded-sm object-cover border border-purple-500/30">` : `<div class="w-5 h-5 rounded-sm bg-purple-500/20 flex items-center justify-center text-purple-300 text-[10px]">${u.name?.charAt(0) || '?'}</div>`}
                      <span class="text-purple-200 text-xs font-medium flex-1 truncate">${u.name}</span>
                      <span class="text-purple-500/50 text-[9px]">${this.formatTime(u.last_active)}</span>
                    </div>
                  `).join("")}
                </div>
              </div>
            </div>
          </div>

          <!-- Pending Approvals -->
          ${pendingGroups.length > 0 ? `
            <div class="bg-black border border-amber-500/40 overflow-hidden">
              <div class="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center gap-2">
                <span class="text-amber-400 animate-pulse">⚠</span>
                <span class="text-amber-400 text-sm font-bold tracking-wider">PENDING_APPROVAL_QUEUE</span>
              </div>
              <div class="p-3 space-y-2">
                ${pendingGroups.map((g: any) => `
                  <div class="flex items-center justify-between px-3 py-2 bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/40 transition-colors" data-group-id="${g.id}">
                    <div>
                      <p class="text-amber-100 font-medium">${this.escapeHtml(g.name)}</p>
                      <p class="text-amber-500/60 text-xs">/${g.slug} • ${this.formatTime(g.created_at)}</p>
                    </div>
                    <div class="flex gap-2">
                      <button class="approve-btn px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold tracking-wider transition-colors" data-group-id="${g.id}">APPROVE</button>
                      <button class="reject-btn px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold tracking-wider transition-colors" data-group-id="${g.id}">REJECT</button>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          ` : ''}

          <!-- Bot Applications (Super Admin Only) -->
          ${isSuperAdmin && pendingBotApps.length > 0 ? `
            <div class="bg-black border border-pink-500/40 overflow-hidden">
              <div class="bg-pink-500/10 border-b border-pink-500/30 px-4 py-2 flex items-center gap-2">
                <span class="text-pink-400 animate-pulse">🤖</span>
                <span class="text-pink-400 text-sm font-bold tracking-wider">PENDING_BOT_APPLICATIONS</span>
                <span class="text-pink-500/60 text-xs ml-auto">${pendingBotApps.length} PENDING</span>
              </div>
              <div class="p-3 space-y-2">
                ${pendingBotApps.map((app: any) => `
                  <div class="px-3 py-3 bg-pink-500/5 border border-pink-500/20 hover:border-pink-500/40 transition-colors" data-bot-app-id="${app.bot_id}">
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="text-pink-100 font-medium">${this.escapeHtml(app.bot_name)}</p>
                        <p class="text-pink-500/60 text-xs">by @${this.escapeHtml(app.operator_name)} • ${this.formatTime(app.created_at)}</p>
                        <p class="text-pink-400/80 text-xs mt-1">${this.escapeHtml(app.purpose?.slice(0, 100) || 'No description')}</p>
                        <div class="flex gap-1 mt-2">
                          ${(app.capabilities_requested || []).map((c: string) => `
                            <span class="px-1.5 py-0.5 bg-pink-500/20 text-pink-300 text-[10px] uppercase">${c}</span>
                          `).join("")}
                        </div>
                      </div>
                      <div class="flex gap-2">
                        <button class="approve-bot-btn px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold tracking-wider transition-colors" data-bot-id="${app.bot_id}" data-caps="${(app.capabilities_requested || []).join(',')}">APPROVE</button>
                        <button class="reject-bot-btn px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold tracking-wider transition-colors" data-bot-id="${app.bot_id}">REJECT</button>
                      </div>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          ` : ''}

          <!-- All Bots (Super Admin Only) -->
          ${isSuperAdmin && allBots.length > 0 ? `
            <div class="bg-black border border-pink-500/30 overflow-hidden">
              <div class="bg-pink-500/10 border-b border-pink-500/30 px-4 py-2 flex items-center justify-between">
                <span class="text-pink-400 text-sm font-bold tracking-wider">◉ BOT_REGISTRY</span>
                <span class="text-pink-500/60 text-xs tabular-nums">${allBots.length} BOTS</span>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-xs">
                  <thead class="bg-pink-500/5 border-b border-pink-500/20">
                    <tr>
                      <th class="text-left py-2 px-4 text-pink-400/80 font-medium uppercase tracking-wider">BOT_NAME</th>
                      <th class="text-left py-2 px-4 text-pink-400/80 font-medium uppercase tracking-wider">STATUS</th>
                      <th class="text-left py-2 px-4 text-pink-400/80 font-medium uppercase tracking-wider">CAPABILITIES</th>
                      <th class="text-right py-2 px-4 text-pink-400/80 font-medium uppercase tracking-wider">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${allBots.map((b: any) => `
                      <tr class="border-b border-pink-500/10 hover:bg-pink-500/5 transition-colors">
                        <td class="py-2 px-4 text-pink-100 font-medium">${this.escapeHtml(b.displayName)}</td>
                        <td class="py-2 px-4">
                          ${b.status === 'approved' ? `<span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] uppercase">APPROVED</span>` : ''}
                          ${b.status === 'active' ? `<span class="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] uppercase">ACTIVE</span>` : ''}
                          ${b.status === 'revoked' ? `<span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] uppercase">REVOKED</span>` : ''}
                          ${!b.status || b.status === 'pending' ? `<span class="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] uppercase">PENDING</span>` : ''}
                        </td>
                        <td class="py-2 px-4 text-pink-400/70">
                          ${(b.capabilities_granted || []).join(', ') || '—'}
                        </td>
                        <td class="py-2 px-4 text-right">
                          ${b.status === 'approved' || (b.capabilities_granted || []).length > 0 ? `
                            <button class="revoke-bot-btn px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold tracking-wider transition-colors" data-bot-id="${b.id}">REVOKE</button>
                          ` : '—'}
                        </td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}

          <!-- Eco Bot Management (Eco Admin) -->
          ${!isSuperAdmin && allBots.length > 0 ? `
            <div class="bg-black border border-pink-500/30 overflow-hidden">
              <div class="bg-pink-500/10 border-b border-pink-500/30 px-4 py-2 flex items-center justify-between">
                <span class="text-pink-400 text-sm font-bold tracking-wider">◉ ECO_BOT_CONTROL</span>
                <span class="text-pink-500/60 text-xs tabular-nums">${allBots.length} BOTS</span>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-xs">
                  <thead class="bg-pink-500/5 border-b border-pink-500/20">
                    <tr>
                      <th class="text-left py-2 px-4 text-pink-400/80 font-medium uppercase tracking-wider">BOT_NAME</th>
                      <th class="text-left py-2 px-4 text-pink-400/80 font-medium uppercase tracking-wider">PLATFORM_STATUS</th>
                      <th class="text-left py-2 px-4 text-pink-400/80 font-medium uppercase tracking-wider">ECO_STATUS</th>
                      <th class="text-right py-2 px-4 text-pink-400/80 font-medium uppercase tracking-wider">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${allBots.map((b: any) => `
                      <tr class="border-b border-pink-500/10 hover:bg-pink-500/5 transition-colors">
                        <td class="py-2 px-4 text-pink-100 font-medium">${this.escapeHtml(b.displayName)}</td>
                        <td class="py-2 px-4">
                          ${b.status === 'approved' ? `<span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] uppercase">APPROVED</span>` : ''}
                          ${b.status === 'active' ? `<span class="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] uppercase">ACTIVE</span>` : ''}
                          ${b.status === 'revoked' ? `<span class="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] uppercase">REVOKED</span>` : ''}
                          ${!b.status || b.status === 'pending' ? `<span class="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] uppercase">PENDING</span>` : ''}
                        </td>
                        <td class="py-2 px-4">
                          ${b.eco_banned ? `<span class="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] uppercase">BLOCKED</span>` : `<span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] uppercase">ALLOWED</span>`}
                        </td>
                        <td class="py-2 px-4 text-right">
                          ${b.id === 'geppetto-system-bot' ? `<span class="px-2 py-0.5 text-zinc-500 text-[10px] uppercase tracking-wider">SYSTEM</span>` : b.eco_banned ? `
                            <button class="eco-unban-bot-btn px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold tracking-wider transition-colors" data-bot-id="${b.id}">UNBLOCK</button>
                          ` : `
                            <button class="eco-ban-bot-btn px-2 py-1 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 text-[10px] font-bold tracking-wider transition-colors" data-bot-id="${b.id}">BLOCK</button>
                          `}
                        </td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}

          <!-- User Management -->
          <div class="bg-black border border-purple-500/30 overflow-hidden">
            <div class="bg-purple-500/10 border-b border-purple-500/30 px-4 py-2 flex items-center justify-between">
              <span class="text-purple-400 text-sm font-bold tracking-wider">◉ ${isSuperAdmin ? 'USER_DATABASE' : 'ECO_MEMBERS'}</span>
              <span class="text-purple-500/60 text-xs tabular-nums">${allUsers.length} RECORDS</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead class="bg-purple-500/5 border-b border-purple-500/20">
                  <tr>
                    <th class="text-left py-2 px-4 text-purple-400/80 font-medium uppercase tracking-wider">USER_ID</th>
                    <th class="text-left py-2 px-4 text-purple-400/80 font-medium uppercase tracking-wider">DISPLAY_NAME</th>
                    <th class="text-left py-2 px-4 text-purple-400/80 font-medium uppercase tracking-wider">FIELD</th>
                    <th class="text-left py-2 px-4 text-purple-400/80 font-medium uppercase tracking-wider">STATUS</th>
                    <th class="text-right py-2 px-4 text-purple-400/80 font-medium uppercase tracking-wider">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  ${allUsers.length === 0 ? `
                    <tr><td colspan="5" class="text-center py-8 text-purple-500/40">[ NO USERS FOUND ]</td></tr>
                  ` : allUsers.slice(0, 25).map((u: any) => `
                    <tr class="border-b border-purple-500/10 hover:bg-purple-500/5 transition-colors" data-user-id="${u.id}">
                      <td class="py-2 px-4 text-purple-400/60 font-mono">${u.id.slice(0, 8)}</td>
                      <td class="py-2 px-4">
                        <div class="flex items-center gap-2">
                          ${u.avatar ? `<img src="${u.avatar}" class="w-6 h-6 rounded-sm object-cover border border-purple-500/30">` : `<div class="w-6 h-6 rounded-sm bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs border border-purple-500/30">${u.displayName?.charAt(0) || '?'}</div>`}
                          <span class="text-purple-100 font-medium">${this.escapeHtml(u.displayName || 'NULL')}</span>
                        </div>
                      </td>
                      <td class="py-2 px-4 text-purple-400/70">${this.escapeHtml(u.field || '—')}</td>
                      <td class="py-2 px-4">
                        ${u.is_admin ? `<span class="px-2 py-0.5 bg-purple-500/30 text-purple-300 text-[10px] uppercase tracking-wider">ADMIN</span>` : ''}
                        ${u.is_banned ? `<span class="px-2 py-0.5 bg-emerald-500/30 text-emerald-300 text-[10px] uppercase tracking-wider">BANNED</span>` : ''}
                        ${!u.is_admin && !u.is_banned ? `<span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] uppercase tracking-wider">ACTIVE</span>` : ''}
                      </td>
                      <td class="py-2 px-4 text-right">
                        <div class="flex items-center justify-end gap-1">
                          ${!u.is_admin ? `
                            ${u.is_banned ? `
                              <button class="unban-user-btn px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold tracking-wider transition-colors" data-user-id="${u.id}">UNBAN</button>
                            ` : `
                              <button class="ban-user-btn px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold tracking-wider transition-colors" data-user-id="${u.id}">${isSuperAdmin ? 'BAN' : 'ECO BAN'}</button>
                            `}
                            ${isSuperAdmin ? `
                              <button class="make-admin-btn px-2 py-1 bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 text-[10px] font-bold tracking-wider transition-colors" data-user-id="${u.id}">↑ ADMIN</button>
                            ` : ''}
                          ` : `
                            ${isSuperAdmin ? `
                              ${u.id !== this.appState.user?.id ? `
                                <button class="remove-admin-btn px-2 py-1 bg-zinc-700/50 border border-zinc-600 text-zinc-400 hover:bg-zinc-600 text-[10px] font-bold tracking-wider transition-colors" data-user-id="${u.id}">↓ DEMOTE</button>
                              ` : `<span class="text-purple-500/40 text-[10px]">[ SELF ]</span>`}
                            ` : `<span class="text-purple-500/40 text-[10px]">[ ADMIN ]</span>`}
                          `}
                        </div>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
            ${allUsers.length > 25 ? `<div class="px-4 py-2 border-t border-purple-500/20 text-purple-500/60 text-xs">Showing 25 of ${allUsers.length} records</div>` : ''}
          </div>

          <!-- Ecosystem Settings -->
          <div class="bg-black border border-teal-500/30 overflow-hidden">
            <div class="bg-teal-500/10 border-b border-teal-500/30 px-4 py-2 flex items-center justify-between">
              <span class="text-teal-400 text-sm font-bold tracking-wider">◉ ECO_SETTINGS</span>
              <span class="text-teal-500/60 text-xs">${this.escapeHtml(ecoMeta.slug || ecoId.slice(0,8))}</span>
            </div>
            <div class="p-4 space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="text-teal-400/80 text-[10px] uppercase tracking-wider block">ECOSYSTEM NAME</label>
                  <input id="eco-name" type="text" value="${this.escapeHtml(ecoMeta.name || '')}" class="w-full bg-black border border-teal-500/30 text-teal-100 px-3 py-2 text-xs font-mono focus:border-teal-400 focus:outline-none transition-colors" />
                </div>
                <div class="space-y-1">
                  <label class="text-teal-400/80 text-[10px] uppercase tracking-wider block">TAGLINE</label>
                  <input id="eco-tagline" type="text" value="${this.escapeHtml(ecoMeta.tagline || '')}" placeholder="Short tagline..." class="w-full bg-black border border-teal-500/30 text-teal-100 px-3 py-2 text-xs font-mono focus:border-teal-400 focus:outline-none transition-colors placeholder-teal-500/30" />
                </div>
              </div>
              <div class="space-y-1">
                <label class="text-teal-400/80 text-[10px] uppercase tracking-wider block">DESCRIPTION</label>
                <textarea id="eco-description" rows="3" class="w-full bg-black border border-teal-500/30 text-teal-100 px-3 py-2 text-xs font-mono focus:border-teal-400 focus:outline-none transition-colors resize-none placeholder-teal-500/30" placeholder="Ecosystem description...">${this.escapeHtml(ecoMeta.description || '')}</textarea>
              </div>
              <div class="space-y-1">
                <label class="text-teal-400/80 text-[10px] uppercase tracking-wider block">WEBSITE</label>
                <input id="eco-website" type="url" value="${this.escapeHtml(ecoMeta.website || '')}" placeholder="https://..." class="w-full bg-black border border-teal-500/30 text-teal-100 px-3 py-2 text-xs font-mono focus:border-teal-400 focus:outline-none transition-colors placeholder-teal-500/30" />
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div class="space-y-1">
                  <label class="text-teal-400/80 text-[10px] uppercase tracking-wider block">ACCENT COLOR</label>
                  <div class="flex items-center gap-2">
                    <input id="eco-accent-color" type="color" value="${ecoMeta.accent_color || '#10b981'}" class="w-8 h-8 bg-transparent border border-teal-500/30 cursor-pointer" />
                    <input id="eco-accent-hex" type="text" value="${ecoMeta.accent_color || '#10b981'}" class="flex-1 bg-black border border-teal-500/30 text-teal-100 px-3 py-2 text-xs font-mono focus:border-teal-400 focus:outline-none transition-colors" />
                  </div>
                </div>
                <div class="space-y-1">
                  <label class="text-teal-400/80 text-[10px] uppercase tracking-wider block">SECONDARY COLOR</label>
                  <div class="flex items-center gap-2">
                    <input id="eco-secondary-color" type="color" value="${ecoMeta.secondary_color || '#6366f1'}" class="w-8 h-8 bg-transparent border border-teal-500/30 cursor-pointer" />
                    <input id="eco-secondary-hex" type="text" value="${ecoMeta.secondary_color || '#6366f1'}" class="flex-1 bg-black border border-teal-500/30 text-teal-100 px-3 py-2 text-xs font-mono focus:border-teal-400 focus:outline-none transition-colors" />
                  </div>
                </div>
                <div class="space-y-1">
                  <label class="text-teal-400/80 text-[10px] uppercase tracking-wider block">THEME</label>
                  <select id="eco-theme" class="w-full bg-black border border-teal-500/30 text-teal-100 px-3 py-2 text-xs font-mono focus:border-teal-400 focus:outline-none transition-colors">
                    <option value="dark" ${(ecoMeta.theme || 'dark') === 'dark' ? 'selected' : ''}>DARK</option>
                    <option value="light" ${ecoMeta.theme === 'light' ? 'selected' : ''}>LIGHT</option>
                    <option value="cyber" ${ecoMeta.theme === 'cyber' ? 'selected' : ''}>CYBER</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="text-teal-400/80 text-[10px] uppercase tracking-wider block">LOGO / ICON</label>
                  <div class="flex items-center gap-3">
                    ${ecoMeta.icon ? `<img src="${ecoMeta.icon}" class="w-12 h-12 rounded border border-teal-500/30 object-cover" />` : `<div class="w-12 h-12 rounded border border-teal-500/20 bg-teal-500/5 flex items-center justify-center text-teal-500/40 text-lg">${(ecoMeta.name || 'E').charAt(0)}</div>`}
                    <div class="flex-1">
                      <label class="block px-3 py-2 bg-teal-500/10 border border-teal-500/30 text-teal-400 text-[10px] font-bold tracking-wider text-center cursor-pointer hover:bg-teal-500/20 transition-colors">
                        UPLOAD LOGO
                        <input id="eco-icon-upload" type="file" accept="image/*" class="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
                <div class="space-y-2">
                  <label class="text-teal-400/80 text-[10px] uppercase tracking-wider block">BANNER IMAGE</label>
                  <div class="flex items-center gap-3">
                    ${ecoMeta.banner ? `<img src="${ecoMeta.banner}" class="w-20 h-12 rounded border border-teal-500/30 object-cover" />` : `<div class="w-20 h-12 rounded border border-teal-500/20 bg-teal-500/5 flex items-center justify-center text-teal-500/40 text-[10px]">NO BANNER</div>`}
                    <div class="flex-1">
                      <label class="block px-3 py-2 bg-teal-500/10 border border-teal-500/30 text-teal-400 text-[10px] font-bold tracking-wider text-center cursor-pointer hover:bg-teal-500/20 transition-colors">
                        UPLOAD BANNER
                        <input id="eco-banner-upload" type="file" accept="image/*" class="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-4 pt-2">
                <div class="flex items-center gap-3">
                  <label class="text-teal-400/80 text-[10px] uppercase tracking-wider">VISIBILITY</label>
                  <select id="eco-visibility" class="bg-black border border-teal-500/30 text-teal-100 px-3 py-1.5 text-xs font-mono focus:border-teal-400 focus:outline-none transition-colors">
                    <option value="public" ${(ecoMeta.visibility || 'public') === 'public' ? 'selected' : ''}>PUBLIC</option>
                    <option value="unlisted" ${ecoMeta.visibility === 'unlisted' ? 'selected' : ''}>UNLISTED</option>
                    <option value="private" ${ecoMeta.visibility === 'private' ? 'selected' : ''}>PRIVATE</option>
                  </select>
                </div>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input id="eco-invite-only" type="checkbox" ${ecoMeta.invite_only ? 'checked' : ''} class="w-4 h-4 accent-teal-500 cursor-pointer" />
                  <span class="text-teal-400/80 text-[10px] uppercase tracking-wider">INVITE ONLY</span>
                </label>
              </div>
              <div class="flex items-center justify-end gap-3 pt-2 border-t border-teal-500/20">
                <button id="eco-settings-save" class="px-6 py-2 bg-teal-500/20 border border-teal-500/40 text-teal-400 text-[10px] font-bold tracking-wider hover:bg-teal-500/30 transition-colors">SAVE CHANGES</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Terminal Footer -->
        <div class="bg-black border-t border-emerald-500/30 px-4 py-1.5 flex items-center justify-between text-xs">
          <span class="text-emerald-500/60">DEVNET_ADMIN_TERMINAL_v2.2.2 // WSB_EDITION</span>
          <span class="text-emerald-400/60">${now.toISOString()}</span>
        </div>
      </div>
    `);

    document.querySelectorAll(".approve-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const groupId = (e.currentTarget as HTMLElement).dataset.groupId;
        if (groupId) await this.adminAction(groupId, "approve");
      });
    });

    document.querySelectorAll(".reject-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const groupId = (e.currentTarget as HTMLElement).dataset.groupId;
        if (groupId && confirm("Are you sure you want to reject this group?")) {
          await this.adminAction(groupId, "reject");
        }
      });
    });

    document.querySelectorAll(".ban-user-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const userId = (e.currentTarget as HTMLElement).dataset.userId;
        if (userId && confirm("Ban this user?")) await this.userAction(userId, "ban");
      });
    });

    document.querySelectorAll(".unban-user-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const userId = (e.currentTarget as HTMLElement).dataset.userId;
        if (userId) await this.userAction(userId, "unban");
      });
    });

    document.querySelectorAll(".make-admin-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const userId = (e.currentTarget as HTMLElement).dataset.userId;
        if (userId && confirm("Grant admin privileges to this user?")) await this.userAction(userId, "make-admin");
      });
    });

    document.querySelectorAll(".remove-admin-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const userId = (e.currentTarget as HTMLElement).dataset.userId;
        if (userId && confirm("Remove admin privileges from this user?")) await this.userAction(userId, "remove-admin");
      });
    });

    document.querySelectorAll(".approve-bot-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const botId = (e.currentTarget as HTMLElement).dataset.botId;
        const caps = (e.currentTarget as HTMLElement).dataset.caps?.split(",").filter(c => c) || [];
        if (botId && confirm(`Approve this bot with capabilities: ${caps.join(", ")}?`)) {
          await this.botAction(botId, "approve", caps);
        }
      });
    });

    document.querySelectorAll(".reject-bot-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const botId = (e.currentTarget as HTMLElement).dataset.botId;
        if (botId && confirm("Reject this bot application?")) {
          await this.botAction(botId, "reject");
        }
      });
    });

    document.querySelectorAll(".revoke-bot-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const botId = (e.currentTarget as HTMLElement).dataset.botId;
        if (botId && confirm("Revoke this bot's capabilities?")) {
          await this.botAction(botId, "revoke");
        }
      });
    });

    document.querySelectorAll(".eco-ban-bot-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const botId = (e.currentTarget as HTMLElement).dataset.botId;
        if (botId && confirm("Block this bot from your ecosystem? It will be unable to post or apply to groups.")) {
          await this.ecoBotAction(botId, "eco-ban");
        }
      });
    });

    document.querySelectorAll(".eco-unban-bot-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const botId = (e.currentTarget as HTMLElement).dataset.botId;
        if (botId) {
          await this.ecoBotAction(botId, "eco-unban");
        }
      });
    });

    const accentPicker = document.getElementById("eco-accent-color") as HTMLInputElement;
    const accentHex = document.getElementById("eco-accent-hex") as HTMLInputElement;
    if (accentPicker && accentHex) {
      accentPicker.addEventListener("input", () => { accentHex.value = accentPicker.value; });
      accentHex.addEventListener("input", () => { if (/^#[0-9a-fA-F]{6}$/.test(accentHex.value)) accentPicker.value = accentHex.value; });
    }
    const secPicker = document.getElementById("eco-secondary-color") as HTMLInputElement;
    const secHex = document.getElementById("eco-secondary-hex") as HTMLInputElement;
    if (secPicker && secHex) {
      secPicker.addEventListener("input", () => { secHex.value = secPicker.value; });
      secHex.addEventListener("input", () => { if (/^#[0-9a-fA-F]{6}$/.test(secHex.value)) secPicker.value = secHex.value; });
    }

    const uploadImage = async (file: File): Promise<string | null> => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", headers: { "X-Auth-Hash": this.appState.hash || "" }, body: form });
      if (res.ok) { const data = await res.json(); return data.url || null; }
      showToast("Image upload failed", "error");
      return null;
    };

    document.getElementById("eco-icon-upload")?.addEventListener("change", async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      showToast("Uploading logo...", "info");
      const url = await uploadImage(file);
      if (url) {
        await this.saveEcoSettings(ecoId, { icon: url });
      }
    });

    document.getElementById("eco-banner-upload")?.addEventListener("change", async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      showToast("Uploading banner...", "info");
      const url = await uploadImage(file);
      if (url) {
        await this.saveEcoSettings(ecoId, { banner: url });
      }
    });

    document.getElementById("eco-settings-save")?.addEventListener("click", async () => {
      const payload: Record<string, any> = {};
      const nameEl = document.getElementById("eco-name") as HTMLInputElement;
      const taglineEl = document.getElementById("eco-tagline") as HTMLInputElement;
      const descEl = document.getElementById("eco-description") as HTMLTextAreaElement;
      const websiteEl = document.getElementById("eco-website") as HTMLInputElement;
      const themeEl = document.getElementById("eco-theme") as HTMLSelectElement;
      const inviteOnlyEl = document.getElementById("eco-invite-only") as HTMLInputElement;

      const visibilityEl = document.getElementById("eco-visibility") as HTMLSelectElement;

      if (nameEl) payload.name = nameEl.value;
      if (taglineEl) payload.tagline = taglineEl.value;
      if (descEl) payload.description = descEl.value;
      if (websiteEl) payload.website = websiteEl.value;
      if (accentHex) payload.accent_color = accentHex.value;
      if (secHex) payload.secondary_color = secHex.value;
      if (themeEl) payload.theme = themeEl.value;
      if (visibilityEl) payload.visibility = visibilityEl.value;
      if (inviteOnlyEl) payload.invite_only = inviteOnlyEl.checked;

      await this.saveEcoSettings(ecoId, payload);
    });
  }

  private async botAction(botId: string, action: string, capabilities?: string[]): Promise<void> {
    const body = action === "approve" ? JSON.stringify({ capabilities }) : JSON.stringify({ reason: "Admin action" });
    const res = await fetch(`/api/admin/bots/${botId}/${action}`, {
      method: "POST",
      headers: { 
        "X-Auth-Hash": this.appState.hash || "",
        "Content-Type": "application/json"
      },
      body
    });
    
    if (res.ok) {
      const row = document.querySelector(`[data-bot-app-id="${botId}"]`);
      if (row) {
        (row as HTMLElement).style.transition = 'all 0.3s ease';
        (row as HTMLElement).style.opacity = '0.3';
        (row as HTMLElement).style.transform = 'translateX(20px)';
      }
      const actionLabel = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'revoked';
      showToast(`Bot ${actionLabel} successfully`, action === 'approve' ? 'success' : 'info');
      setTimeout(() => this.showAdmin(), 600);
    } else {
      showToast(`Failed to ${action} bot`, 'error');
    }
  }

  private async ecoBotAction(botId: string, action: string): Promise<void> {
    const ecoId = this.activeEcosystem?.id || this.defaultEcosystemId;
    const res = await fetch(`/api/admin/bots/${botId}/${action}?ecosystem_id=${ecoId}`, {
      method: "POST",
      headers: { 
        "X-Auth-Hash": this.appState.hash || "",
        "Content-Type": "application/json"
      }
    });
    
    if (res.ok) {
      const label = action === 'eco-ban' ? 'blocked from ecosystem' : 'unblocked in ecosystem';
      showToast(`Bot ${label}`, action === 'eco-ban' ? 'info' : 'success');
      setTimeout(() => this.showAdmin(), 600);
    } else {
      showToast(`Failed to ${action} bot`, 'error');
    }
  }

  private async saveEcoSettings(ecoId: string, payload: Record<string, any>): Promise<void> {
    const res = await fetch(`/api/ecosystems/${ecoId}`, {
      method: "PATCH",
      headers: {
        "X-Auth-Hash": this.appState.hash || "",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const updated = await res.json();
      if (this.activeEcosystem && this.activeEcosystem.id === ecoId) {
        this.activeEcosystem = { ...this.activeEcosystem, ...updated };
        this.applyEcosystemColors(this.activeEcosystem);
      }
      const idx = this.userEcosystems.findIndex((e: any) => e.id === ecoId);
      if (idx >= 0) {
        this.userEcosystems[idx] = { ...this.userEcosystems[idx], ...updated };
      }
      showToast("Ecosystem settings saved", "success");
      setTimeout(() => this.showAdmin(), 400);
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.detail || "Failed to save settings", "error");
    }
  }

  private async userAction(userId: string, action: string): Promise<void> {
    const ecoId = this.activeEcosystem?.id || this.defaultEcosystemId;
    const res = await fetch(`/api/admin/users/${userId}/${action}?ecosystem_id=${ecoId}`, {
      method: "POST",
      headers: { "X-Auth-Hash": this.appState.hash || "" }
    });
    
    if (!res.ok) {
      showToast(`Failed to ${action.replace('-', ' ')} user`, 'error');
      return;
    }
    const row = document.querySelector(`tr[data-user-id="${userId}"]`);
    if (row) {
      (row as HTMLElement).style.transition = 'all 0.3s ease';
      (row as HTMLElement).style.background = 'rgba(16,185,129,0.1)';
    }
    const actionLabels: Record<string, string> = { 'ban': 'banned', 'unban': 'unbanned', 'make-admin': 'promoted to admin', 'remove-admin': 'demoted' };
    showToast(`User ${actionLabels[action] || action} successfully`, 'success');
    setTimeout(() => this.showAdmin(), 600);
  }

  private async adminAction(groupId: string, action: "approve" | "reject"): Promise<void> {
    const res = await fetch(`/api/admin/groups/${groupId}/${action}`, {
      method: "POST",
      headers: { "X-Auth-Hash": this.appState.hash || "" }
    });
    
    if (res.ok) {
      const row = document.querySelector(`[data-group-id="${groupId}"]`);
      if (row) {
        (row as HTMLElement).style.transition = 'all 0.3s ease';
        (row as HTMLElement).style.opacity = '0.3';
        (row as HTMLElement).style.transform = 'translateX(20px)';
      }
      showToast(`Group ${action === 'approve' ? 'approved' : 'rejected'} successfully`, action === 'approve' ? 'success' : 'info');
      setTimeout(() => this.showAdmin(), 600);
    } else {
      showToast(`Failed to ${action} group`, 'error');
    }
  }

  private currentGroup: any = null;
  private groupSocket: WebSocket | null = null;
  private groupMessages: any[] = [];
  private currentGroupId: string | null = null;
  // Bridged-workspace operator console (origin "aias_v1"): v1 config + drafts
  private aiasWs: any = null;
  private aiasDrafts: any[] = [];
  private replyingTo: { messageId: string; userId: string; displayName: string; content: string } | null = null;
  private viewingThreadId: string | null = null;
  private isOpeningGroup: boolean = false;
  private hasMoreMessages: boolean = false;
  private nextBefore: number | null = null;
  private isLoadingMore: boolean = false;
  private scrollObserver: IntersectionObserver | null = null;

  private async showGroups(): Promise<void> {
    this.setActiveNav("nav-groups");
    // Communities view is a bridge trigger too (per-environment sync
    // experience): visiting it reconciles the ACTIVE v1 environment's
    // workspaces. Fire-and-forget behind the same 60s throttle; when the
    // pass actually created/archived twins, re-render once to show them.
    void this.bridgeSync().then((changed) => {
      if (changed && document.getElementById("groups-container")) {
        void this.showGroups();
      }
    });
    const res = await fetch(`/api/groups?ecosystem_id=${this.activeEcosystem?.id || this.defaultEcosystemId}`, {
      headers: { "X-Auth-Hash": this.appState.hash || "" }
    });
    const groups = res.ok ? await res.json() : [];

    this.setContent(`
      <div class="h-full w-full flex flex-col">
        <div class="panel flex-1">
          <div class="panel-header">
            <div class="flex items-center gap-3">
              <span class="panel-title">${this.escapeHtml(this.activeEcosystem?.name || 'Communities')}</span>
              <span class="text-xs text-zinc-500">${groups.length} groups</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="relative">
                <input type="text" id="groups-search" placeholder="Search groups..." class="input text-sm py-1.5 pl-8 pr-3 w-48" />
                <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
              <button id="create-group-btn" class="btn btn-primary text-xs py-1.5 px-3">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Create
              </button>
            </div>
          </div>
          <div class="panel-body p-4 overflow-y-auto">
            <div id="groups-container" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          ${groups.length === 0 ? `
            <div class="col-span-full text-center py-16">
              <div class="relative inline-flex items-center justify-center w-16 h-16 mb-4">
                <div class="absolute inset-0 bg-zinc-800 rounded-2xl"></div>
                <svg class="relative w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <h3 class="font-medium text-zinc-400 mb-1">No groups yet</h3>
              <p class="text-sm text-zinc-600">Create a group to start chatting</p>
            </div>
          ` : groups.map((g: any) => `
            <div class="group-card relative group/card rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1" data-group-id="${g.id}" data-status="${g.status || 'approved'}">
              <div class="absolute -inset-[1px] rounded-xl ${g.status === 'pending' ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500' : g.is_member ? 'bg-gradient-to-r from-emerald-500 via-red-400 to-emerald-500' : 'bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-700'} opacity-${g.is_member ? '100' : '50'} group-hover/card:opacity-100 transition-opacity duration-300 animate-gradient-x"></div>
              <div class="relative bg-zinc-900 rounded-xl p-4 h-full flex flex-col">
                <div class="flex flex-col items-center text-center mb-3">
                  ${g.avatar ? `
                    <div class="relative mb-3">
                      <div class="absolute -inset-1 rounded-xl ${g.status === 'pending' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'} opacity-75 blur-sm"></div>
                      <img src="${g.avatar}" alt="${g.name}" class="relative w-16 h-16 rounded-xl object-cover ring-2 ${g.status === 'pending' ? 'ring-amber-500' : 'ring-emerald-500'}">
                    </div>
                  ` : `
                    <div class="relative mb-3">
                      <div class="absolute -inset-1 rounded-xl ${g.status === 'pending' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'} opacity-50 blur-sm group-hover/card:opacity-75 transition-opacity"></div>
                      <div class="relative w-16 h-16 rounded-xl ${g.status === 'pending' ? 'bg-gradient-to-br from-amber-500/30 to-orange-500/30' : 'bg-gradient-to-br from-emerald-500/30 to-emerald-500/30'} flex items-center justify-center backdrop-blur-sm">
                        <span class="text-2xl font-bold ${g.status === 'pending' ? 'text-amber-400' : 'text-emerald-400'} drop-shadow-glow">${g.name.charAt(0).toUpperCase()}</span>
                      </div>
                    </div>
                  `}
                  <h3 class="font-semibold text-zinc-100 truncate w-full group-hover/card:text-white transition-colors flex items-center justify-center gap-1.5">
                    ${g.privacy === 'private' ? '<i data-lucide="lock" class="w-3.5 h-3.5 text-amber-400 flex-shrink-0"></i>' : ''}
                    <span class="truncate">${this.escapeHtml(g.name)}</span>
                    ${g.origin === "aias_v1" ? '<span class="ml-1 shrink-0 rounded bg-cyan-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-400 ring-1 ring-cyan-500/30" title="Bridged from your AiAS v1 workspace — same id, same entity">AiAS</span>' : ''}
                  </h3>
                  <p class="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                    ${g.status === 'pending' ? `
                      <svg class="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
                      <span class="text-amber-400">Pending</span>
                    ` : g.privacy === 'private' ? `
                      <i data-lucide="lock" class="w-3 h-3 text-amber-400"></i>
                      <span class="text-amber-400">Private</span>
                      <span class="text-zinc-600 mx-1">&bull;</span>
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
                      ${g.member_count || 0}
                    ` : `
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
                      ${g.member_count || 0} members
                    `}
                  </p>
                </div>
                <div class="mt-auto pt-2">
                  ${g.status === 'pending' ? `
                    <span class="block text-center text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg py-2 backdrop-blur-sm">Awaiting Approval</span>
                  ` : g.is_member ? `
                    <button class="enter-group-btn w-full text-xs py-2 px-4 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-600 hover:from-emerald-500 hover:to-emerald-500 text-white font-medium transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40" data-group-id="${g.id}">
                      <span class="flex items-center justify-center gap-1.5">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                        Enter
                      </span>
                    </button>
                  ` : `
                    <button class="join-group-btn w-full text-xs py-2 px-4 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-medium transition-all duration-200 border border-zinc-600" data-group-id="${g.id}">
                      <span class="flex items-center justify-center gap-1.5">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
                        Join
                      </span>
                    </button>
                  `}
                </div>
              </div>
            </div>
          `).join("")}
            </div>
          </div>
        </div>
      </div>
      
      <div id="create-group-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm hidden items-center justify-center z-50">
        <div class="card max-w-md w-full mx-4 slide-up max-h-[90vh] overflow-y-auto">
          <h2 class="text-xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
            <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            Create Community
          </h2>
          <form id="create-group-form" class="space-y-4">
            <div class="flex justify-center">
              <div class="relative group">
                <div id="group-avatar-preview" style="width: 80px; height: 80px; border-radius: 16px; background: linear-gradient(135deg, #3f3f46, #27272a); display: flex; align-items: center; justify-content: center; cursor: pointer; border: 2px dashed #52525b; transition: all 0.2s;" class="hover:border-emerald-500">
                  <svg class="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <input type="file" id="group-avatar-input" accept="image/*" class="hidden">
                <p class="text-xs text-zinc-500 text-center mt-2">Community Photo</p>
              </div>
            </div>
            <input type="hidden" name="avatar" id="group-avatar-url" value="">
            <div>
              <label class="block text-sm font-medium text-zinc-300 mb-2">Privacy</label>
              <div class="flex rounded-lg overflow-hidden border border-zinc-700">
                <button type="button" id="privacy-public-btn" class="flex-1 py-2.5 text-sm font-medium transition-colors bg-emerald-500/20 text-emerald-400 border-r border-zinc-700" data-privacy="public">
                  <i data-lucide="globe" class="w-4 h-4 inline-block mr-1"></i>Public
                </button>
                <button type="button" id="privacy-private-btn" class="flex-1 py-2.5 text-sm font-medium transition-colors text-zinc-400 hover:text-zinc-200" data-privacy="private">
                  <i data-lucide="lock" class="w-4 h-4 inline-block mr-1"></i>Private
                </button>
              </div>
              <input type="hidden" name="privacy" id="group-privacy-input" value="public">
            </div>
            <div>
              <label class="block text-sm font-medium text-zinc-300 mb-2">Name</label>
              <input type="text" name="name" class="input" placeholder="My Awesome Community" required />
            </div>
            <div id="slug-field">
              <label class="block text-sm font-medium text-zinc-300 mb-2">Slug</label>
              <input type="text" name="slug" class="input font-mono" placeholder="my-community" pattern="[a-z0-9\\-]{3,30}" />
              <p class="text-xs text-zinc-500 mt-2">3-30 lowercase letters, numbers, and hyphens</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-zinc-300 mb-2">What is this community for? <span class="text-emerald-400">*</span></label>
              <textarea name="description" class="input resize-none" rows="3" placeholder="Describe the purpose of this community..." required></textarea>
              <p id="create-group-approval-hint" class="text-xs text-zinc-500 mt-1">This helps admins understand and approve your community faster</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-zinc-300 mb-2">Terms (optional)</label>
              <textarea name="terms" class="input resize-none" rows="2" placeholder="Rules members must agree to"></textarea>
            </div>
            <div class="flex gap-3 pt-2">
              <button type="button" id="cancel-create-group" class="btn btn-secondary flex-1">Cancel</button>
              <button type="submit" class="btn btn-primary flex-1">Create</button>
            </div>
            <p id="create-group-error" class="text-red-400 text-sm text-center hidden"></p>
            <p id="create-group-status-hint" class="text-xs text-zinc-500 text-center pt-2">Public communities require admin approval before going live</p>
          </form>
        </div>
      </div>
    `);

    document.getElementById("create-group-btn")?.addEventListener("click", () => {
      document.getElementById("create-group-modal")?.classList.remove("hidden");
      document.getElementById("create-group-modal")?.classList.add("flex");
    });

    document.getElementById("cancel-create-group")?.addEventListener("click", () => {
      document.getElementById("create-group-modal")?.classList.add("hidden");
      document.getElementById("create-group-modal")?.classList.remove("flex");
    });

    document.getElementById("group-avatar-preview")?.addEventListener("click", () => {
      document.getElementById("group-avatar-input")?.click();
    });

    document.getElementById("group-avatar-input")?.addEventListener("change", async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const preview = document.getElementById("group-avatar-preview");
      if (preview) {
        preview.innerHTML = '<div class="animate-pulse w-full h-full rounded-2xl bg-zinc-700"></div>';
      }
      
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload/image", { 
          method: "POST", 
          headers: { "X-Auth-Hash": this.appState.hash || "" },
          body: formData 
        });
        if (res.ok) {
          const data = await res.json();
          (document.getElementById("group-avatar-url") as HTMLInputElement).value = data.url;
          if (preview) {
            preview.innerHTML = `<img src="${data.url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 16px;">`;
            preview.style.border = "2px solid #10b981";
          }
          showEpicModal("Photo uploaded!", "success");
        } else {
          showEpicModal("Failed to upload photo", "error");
        }
      } catch (err) {
        if (preview) {
          preview.innerHTML = '<svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
        }
        showEpicModal("Failed to upload photo", "error");
      }
    });

    const privacyPublicBtn = document.getElementById("privacy-public-btn");
    const privacyPrivateBtn = document.getElementById("privacy-private-btn");
    const privacyInput = document.getElementById("group-privacy-input") as HTMLInputElement;
    const slugField = document.getElementById("slug-field");
    const approvalHint = document.getElementById("create-group-approval-hint");
    const statusHint = document.getElementById("create-group-status-hint");

    const setPrivacy = (mode: string) => {
      privacyInput.value = mode;
      if (mode === "private") {
        privacyPrivateBtn?.classList.add("bg-amber-500/20", "text-amber-400");
        privacyPrivateBtn?.classList.remove("text-zinc-400", "hover:text-zinc-200");
        privacyPublicBtn?.classList.remove("bg-emerald-500/20", "text-emerald-400");
        privacyPublicBtn?.classList.add("text-zinc-400", "hover:text-zinc-200");
        if (slugField) slugField.style.display = "none";
        if (approvalHint) approvalHint.textContent = "Private communities are approved instantly";
        if (statusHint) statusHint.textContent = "Invite-only — members join via private link";
      } else {
        privacyPublicBtn?.classList.add("bg-emerald-500/20", "text-emerald-400");
        privacyPublicBtn?.classList.remove("text-zinc-400", "hover:text-zinc-200");
        privacyPrivateBtn?.classList.remove("bg-amber-500/20", "text-amber-400");
        privacyPrivateBtn?.classList.add("text-zinc-400", "hover:text-zinc-200");
        if (slugField) slugField.style.display = "";
        if (approvalHint) approvalHint.textContent = "This helps admins understand and approve your community faster";
        if (statusHint) statusHint.textContent = "Public communities require admin approval before going live";
      }
      if ((window as any).lucide) (window as any).lucide.createIcons();
    };

    privacyPublicBtn?.addEventListener("click", () => setPrivacy("public"));
    privacyPrivateBtn?.addEventListener("click", () => setPrivacy("private"));

    document.getElementById("create-group-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.createGroup();
    });

    document.querySelectorAll(".group-card").forEach(card => {
      card.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        if (target.closest(".join-group-btn") || target.closest(".enter-group-btn")) return;
        const groupId = (card as HTMLElement).dataset.groupId;
        const status = (card as HTMLElement).dataset.status;
        if (status === 'pending') return;
        if (groupId) this.openGroup(groupId);
      });
    });

    document.querySelectorAll(".enter-group-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const groupId = (btn as HTMLElement).dataset.groupId;
        if (groupId) this.openGroup(groupId, true);
      });
    });

    document.querySelectorAll(".join-group-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const groupId = (btn as HTMLElement).dataset.groupId;
        if (groupId) await this.joinGroup(groupId);
      });
    });

    const searchInput = document.getElementById("groups-search") as HTMLInputElement;
    searchInput?.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase().trim();
      document.querySelectorAll(".group-card").forEach(card => {
        const name = (card.querySelector("h3")?.textContent || "").toLowerCase();
        (card as HTMLElement).style.display = name.includes(query) ? "" : "none";
      });
    });
  }

  private async createGroup(): Promise<void> {
    const form = document.getElementById("create-group-form") as HTMLFormElement;
    const formData = new FormData(form);
    const errorEl = document.getElementById("create-group-error")!;
    errorEl.classList.add("hidden");

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Hash": this.appState.hash || ""
        },
        body: JSON.stringify({
          name: formData.get("name"),
          slug: formData.get("slug") || "",
          description: formData.get("description"),
          terms: formData.get("terms"),
          avatar: formData.get("avatar"),
          privacy: formData.get("privacy") || "public",
          ecosystem_id: this.activeEcosystem?.id || this.defaultEcosystemId
        })
      });

      if (res.ok) {
        document.getElementById("create-group-modal")?.classList.add("hidden");
        document.getElementById("create-group-modal")?.classList.remove("flex");
        const privacy = (formData.get("privacy") as string) || "public";
        this.showGroupCreatedSuccess(formData.get("name") as string, privacy);
      } else {
        const data = await res.json();
        errorEl.textContent = data.detail || "Failed to create group";
        errorEl.classList.remove("hidden");
      }
    } catch (e) {
      errorEl.textContent = "Failed to create group";
      errorEl.classList.remove("hidden");
    }
  }

  private showGroupCreatedSuccess(groupName: string, privacy: string = "public"): void {
    const isPrivate = privacy === "private";
    this.setContent(`
      <div class="max-w-lg mx-auto px-4 py-12">
        <div class="card text-center slide-up">
          <div class="relative inline-block mb-6">
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${isPrivate ? 'from-emerald-500/20 to-emerald-500/20 border-emerald-500/30' : 'from-amber-500/20 to-orange-500/20 border-amber-500/30'} border">
              <svg class="w-10 h-10 ${isPrivate ? 'text-emerald-400' : 'text-amber-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                ${isPrivate ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>' : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>'}
              </svg>
            </div>
          </div>
          
          <h2 class="text-2xl font-bold text-zinc-100 mb-2">Community Created!</h2>
          <p class="text-zinc-400 mb-6">"${this.escapeHtml(groupName)}" ${isPrivate ? 'is ready to use' : 'is now in moderation'}</p>
          
          <div class="${isPrivate ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'} border rounded-xl p-4 mb-6 text-left">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 ${isPrivate ? 'text-emerald-400' : 'text-amber-400'} mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div>
                ${isPrivate ? `
                <p class="text-sm font-medium text-emerald-300 mb-1">Private Community Active</p>
                <p class="text-sm text-zinc-400">Your private community is live. Share the invite link with people you want to join.</p>
                ` : `
                <p class="text-sm font-medium text-amber-300 mb-1">Awaiting Admin Approval</p>
                <p class="text-sm text-zinc-400">An admin will review your community description and approve it shortly. You'll see it appear in your communities list once approved.</p>
                `}
              </div>
            </div>
          </div>
          
          <button id="back-to-groups-btn" class="btn btn-primary w-full py-3">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 17l-5-5m0 0l5-5m-5 5h12"/>
            </svg>
            Back to Communities
          </button>
        </div>
      </div>
    `);

    document.getElementById("back-to-groups-btn")?.addEventListener("click", () => {
      this.showGroups();
    });
  }

  private async joinGroup(groupId: string): Promise<void> {
    const groupRes = await fetch(`/api/groups/${groupId}`, {
      headers: { "X-Auth-Hash": this.appState.hash || "" }
    });
    if (!groupRes.ok) return;

    const group = await groupRes.json();
    
    if (group.terms) {
      if (!confirm(`Terms for ${group.name}:\n\n${group.terms}\n\nDo you agree?`)) {
        return;
      }
    }

    const btn = document.querySelector(`.join-group-btn[data-group-id="${groupId}"]`) as HTMLElement;
    if (btn) {
      btn.innerHTML = '<span class="flex items-center justify-center gap-1.5"><svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Joining...</span>';
      btn.classList.add("pointer-events-none", "opacity-70");
    }

    const res = await fetch(`/api/groups/${groupId}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Hash": this.appState.hash || ""
      },
      body: JSON.stringify({ agreed_to_terms: true })
    });

    if (res.ok) {
      showToast(`Joined "${group.name}" successfully!`, 'success');
      this.showGroups();
    } else {
      const data = await res.json().catch(() => ({ detail: "Failed to join" }));
      showToast(data.detail || "Failed to join group", 'error');
      if (btn) {
        btn.innerHTML = '<span class="flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>Join</span>';
        btn.classList.remove("pointer-events-none", "opacity-70");
      }
    }
  }

  private async openGroup(groupId: string, skipMemberCheck: boolean = false): Promise<void> {
    if (this.isOpeningGroup) return;
    this.isOpeningGroup = true;
    this.currentGroupId = groupId;
    
    try {
    // Fetch group, messages, all groups, and members in parallel
    const [groupRes, allGroupsRes] = await Promise.all([
      fetch(`/api/groups/${groupId}`, { headers: { "X-Auth-Hash": this.appState.hash || "" } }),
      fetch("/api/groups", { headers: { "X-Auth-Hash": this.appState.hash || "" } })
    ]);
    
    if (!groupRes.ok) return;
    const group = await groupRes.json();
    const allGroupsData = allGroupsRes.ok ? await allGroupsRes.json() : [];
    const allGroups = Array.isArray(allGroupsData) ? allGroupsData : [];
    
    if (!skipMemberCheck && !group.is_member) {
      await this.joinGroup(groupId);
      return;
    }

    this.currentGroup = group;
    
    // Fetch messages and members
    const [messagesRes, membersRes] = await Promise.all([
      fetch(`/api/groups/${groupId}/messages`, { headers: { "X-Auth-Hash": this.appState.hash || "" } }),
      fetch(`/api/groups/${groupId}/members`, { headers: { "X-Auth-Hash": this.appState.hash || "" } })
    ]);
    const messagesData = messagesRes.ok ? await messagesRes.json() : { messages: [], has_more: false, next_before: null };
    if (messagesData && messagesData.messages) {
      this.groupMessages = Array.isArray(messagesData.messages) ? messagesData.messages : [];
      this.hasMoreMessages = messagesData.has_more || false;
      this.nextBefore = messagesData.next_before ?? null;
    } else {
      this.groupMessages = Array.isArray(messagesData) ? messagesData : [];
      this.hasMoreMessages = false;
      this.nextBefore = null;
    }
    const membersData = membersRes.ok ? await membersRes.json() : { members: [] };
    const members = Array.isArray(membersData.members) ? membersData.members : (Array.isArray(membersData) ? membersData : []);

    this.setActiveNav("nav-groups");
    
    this.setContent(`
      <div class="h-full w-full flex flex-col md:flex-row bg-zinc-950" style="max-height: 100%; overflow: hidden;">
        <!-- MOBILE TABS -->
        <div class="md:hidden flex border-b border-zinc-800 bg-zinc-900">
          <button id="mobile-tab-groups" class="mobile-tab flex-1 py-3 text-center text-sm font-medium text-zinc-400 border-b-2 border-transparent" data-tab="groups">
            <i data-lucide="hash" class="w-4 h-4 inline-block mr-1"></i>Communities
          </button>
          <button id="mobile-tab-chat" class="mobile-tab flex-1 py-3 text-center text-sm font-medium text-emerald-400 border-b-2 border-emerald-500" data-tab="chat">
            <i data-lucide="message-square" class="w-4 h-4 inline-block mr-1"></i>Chat
          </button>
          <button id="mobile-tab-threads" class="mobile-tab flex-1 py-3 text-center text-sm font-medium text-zinc-400 border-b-2 border-transparent" data-tab="threads">
            <i data-lucide="git-branch" class="w-4 h-4 inline-block mr-1"></i>Threads
          </button>
          <button id="mobile-tab-members" class="mobile-tab flex-1 py-3 text-center text-sm font-medium text-zinc-400 border-b-2 border-transparent" data-tab="members">
            <i data-lucide="users" class="w-4 h-4 inline-block mr-1"></i>Members
          </button>
        </div>
        
        <!-- LEFT SIDEBAR: Groups/Threads List -->
        <div id="panel-groups" class="hidden md:flex w-full md:w-64 flex-shrink-0 border-r border-zinc-800 flex-col bg-zinc-900/50 overflow-hidden transition-all duration-200" style="min-height:0;flex:1 1 0%;">
          <div class="flex items-center border-b border-zinc-800 flex-shrink-0">
            <button id="left-tab-communities" class="left-sidebar-tab flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-emerald-400 border-b-2 border-emerald-500 transition-colors" data-tab="communities">
              <i data-lucide="hash" class="w-3.5 h-3.5 inline-block mr-1"></i>Communities
            </button>
            <button id="left-tab-threads" class="left-sidebar-tab flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-zinc-500 border-b-2 border-transparent hover:text-zinc-300 transition-colors" data-tab="threads">
              <i data-lucide="git-branch" class="w-3.5 h-3.5 inline-block mr-1"></i>Threads
            </button>
            <button id="left-sidebar-collapse" class="hidden md:flex p-2 text-zinc-500 hover:text-zinc-200 transition-colors flex-shrink-0" title="Collapse sidebar">
              <i data-lucide="panel-left-close" class="w-4 h-4"></i>
            </button>
          </div>
          <div id="left-tab-content-communities" class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1" style="-webkit-overflow-scrolling:touch;min-height:0;max-height:100%;">
            ${allGroups.filter((g: any) => g.status !== 'pending').map((g: any) => `
              <button class="group-nav-item w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all ${g.id === groupId ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'}" data-group-id="${g.id}">
                ${g.avatar ? `
                  <img src="${g.avatar}" class="w-8 h-8 rounded-lg object-cover flex-shrink-0">
                ` : `
                  <div class="w-8 h-8 rounded-lg bg-zinc-700/50 flex items-center justify-center flex-shrink-0">
                    <span class="text-sm font-bold ${g.id === groupId ? 'text-emerald-400' : 'text-zinc-500'}">${g.name.charAt(0).toUpperCase()}</span>
                  </div>
                `}
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate flex items-center gap-1">${g.privacy === 'private' ? '<i data-lucide="lock" class="w-3 h-3 text-amber-400 flex-shrink-0"></i>' : ''}${this.escapeHtml(g.name)}</p>
                  <p class="text-xs text-zinc-600 truncate">${g.privacy === 'private' ? 'Private' : (g.member_count || 0) + ' members'}</p>
                </div>
              </button>
            `).join("")}
          </div>
          <div id="left-tab-content-threads" class="hidden flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2" style="-webkit-overflow-scrolling:touch;min-height:0;max-height:100%;">
            <div class="flex items-center justify-center h-32 text-zinc-500 text-sm">
              <div class="text-center">
                <i data-lucide="git-branch" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                <p>No threads yet</p>
                <p class="text-xs text-zinc-600 mt-1">Reply to a message to start a thread</p>
              </div>
            </div>
          </div>
          <div class="p-3 border-t border-zinc-800">
            <button id="back-to-groups-list" class="w-full text-left px-3 py-2 rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/50 flex items-center gap-2 text-sm transition-colors">
              <i data-lucide="plus" class="w-4 h-4"></i>
              Browse All Communities
            </button>
          </div>
        </div>
        <!-- LEFT SIDEBAR EXPAND BUTTON (when collapsed) -->
        <div id="left-sidebar-expand" class="hidden flex-shrink-0 border-r border-zinc-800 bg-zinc-900/50 flex-col items-center py-2">
          <button id="left-sidebar-expand-btn" class="p-2 text-zinc-500 hover:text-zinc-200 transition-colors" title="Expand sidebar">
            <i data-lucide="panel-left-open" class="w-4 h-4"></i>
          </button>
        </div>
        
        <!-- CENTER: Chat Area -->
        <div id="panel-chat" class="flex md:flex flex-1 flex-col min-w-0" style="min-height: 0; overflow: hidden;">
          <!-- Group Header -->
          <div class="group-header-epic relative overflow-hidden border-b border-zinc-800 flex-shrink-0">
            <div class="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-zinc-900/90"></div>
            ${group.avatar ? `<div class="absolute inset-0 opacity-10 blur-2xl" style="background-image: url('${group.avatar}'); background-size: cover; background-position: center;"></div>` : ''}
            
            <div class="relative px-4 py-3 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="relative">
                  ${group.avatar ? `
                    <img src="${group.avatar}" alt="${group.name}" class="w-10 h-10 rounded-xl object-cover border border-emerald-500/50">
                  ` : `
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                      <span class="text-lg font-bold text-emerald-400">${group.name.charAt(0).toUpperCase()}</span>
                    </div>
                  `}
                </div>
                <div>
                  <h2 class="font-bold text-zinc-100 flex items-center gap-1.5">${group.privacy === 'private' ? '<i data-lucide="lock" class="w-4 h-4 text-amber-400"></i>' : ''}${this.escapeHtml(group.name)}</h2>
                  <p class="text-xs text-zinc-500">${group.privacy === 'private' ? '<span class="text-amber-400">Private</span> • ' : '/g/' + group.slug + ' • '}${members.length} members</p>
                </div>
              </div>
              
              <div class="flex items-center gap-1">
                ${group.user_role === 'owner' || group.user_role === 'admin' || this.appState.user?.is_admin ? `
                  <button id="group-members-manage-btn" class="text-zinc-400 hover:text-zinc-100 transition-colors p-2 rounded-lg hover:bg-zinc-800/50" title="Manage Members">
                    <i data-lucide="users-round" class="w-4 h-4"></i>
                  </button>
                  <button id="group-settings-btn" class="text-zinc-400 hover:text-zinc-100 transition-colors p-2 rounded-lg hover:bg-zinc-800/50" title="Settings">
                    <i data-lucide="settings" class="w-4 h-4"></i>
                  </button>
                ` : ''}
                ${group.creator_id !== this.appState.user?.id ? `
                  <button id="leave-group-btn" class="text-zinc-400 hover:text-emerald-400 transition-colors p-2 rounded-lg hover:bg-emerald-500/10" title="Leave Group" data-group-id="${group.id}">
                    <i data-lucide="log-out" class="w-4 h-4"></i>
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
          
          <!-- Messages -->
          <div id="messages-container" class="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-3 bg-zinc-950">
            ${this.renderMessages()}
          </div>
          
          <!-- Message Input -->
          <div class="px-4 py-3 border-t border-zinc-800 bg-zinc-900 flex-shrink-0">
            <div id="reply-preview" class="hidden mb-2 px-3 py-2 rounded-lg bg-zinc-800/80 border-l-2 border-emerald-500 flex items-center gap-2" style="animation: slideDown 0.15s ease-out;">
              <div class="flex-1 min-w-0">
                <p class="text-[11px] font-semibold text-emerald-400" id="reply-to-name"></p>
                <p class="text-xs text-zinc-400 truncate" id="reply-to-content"></p>
              </div>
              <button id="cancel-reply" class="text-zinc-500 hover:text-zinc-200 transition-colors p-1 rounded hover:bg-zinc-700/50 flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div id="chat-image-preview" class="hidden mb-3 relative inline-block">
              <img id="chat-preview-img" class="h-20 rounded-lg object-cover" alt="Preview">
              <button id="chat-remove-image" class="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1 hover:bg-emerald-600">
                <i data-lucide="x" class="w-3 h-3"></i>
              </button>
            </div>
            <form id="send-message-form" class="flex gap-3 items-center">
              <label class="text-zinc-400 hover:text-zinc-100 cursor-pointer p-2 rounded-lg hover:bg-zinc-800 transition-colors flex-shrink-0">
                <i data-lucide="image" class="w-5 h-5"></i>
                <input type="file" id="chat-image-input" accept="image/jpeg,image/png,image/gif,image/webp" class="hidden">
              </label>
              <button type="button" id="chat-gif-btn" class="text-zinc-400 hover:text-zinc-100 p-2 rounded-lg hover:bg-zinc-800 transition-colors flex-shrink-0" title="Send GIF">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2"/><text x="12" y="16" text-anchor="middle" fill="currentColor" stroke="none" font-size="9" font-weight="bold">GIF</text></svg>
              </button>
              <input type="text" name="content" class="input flex-1 bg-zinc-800 border-zinc-700" placeholder="Type a message..." autocomplete="off" />
              <button type="submit" class="btn btn-primary p-2.5 rounded-lg">
                <i data-lucide="send" class="w-5 h-5"></i>
              </button>
            </form>
            <p id="chat-upload-error" class="text-emerald-400 text-xs mt-2 hidden"></p>
          </div>
        </div>
        
        <!-- THREADS PANEL -->
        <div id="panel-threads" class="hidden flex-1 flex-col min-w-0" style="min-height: 0; overflow: hidden;">
          <div class="p-3 border-b border-zinc-800 flex-shrink-0 flex items-center gap-2">
            <i data-lucide="git-branch" class="w-4 h-4 text-emerald-400"></i>
            <h3 class="text-sm font-bold text-zinc-200">Threads</h3>
          </div>
          <div id="threads-list" class="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2" style="-webkit-overflow-scrolling:touch;">
            <div class="flex items-center justify-center h-32 text-zinc-500 text-sm">
              <div class="text-center">
                <i data-lucide="git-branch" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                <p>No threads yet</p>
                <p class="text-xs text-zinc-600 mt-1">Reply to a message to start a thread</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- RIGHT SIDEBAR: Members Panel -->
        <div id="panel-members" class="hidden md:flex w-full md:w-64 flex-shrink-0 border-l border-zinc-800 flex-col bg-zinc-900/50">
          ${(() => {
            const humanMembers = members.filter((m: any) => !m.is_bot);
            const botMembers = members.filter((m: any) => m.is_bot);
            const renderSidebarMember = (m: any) => `
              <div class="member-item flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer" data-user-id="${m.id}">
                <div class="relative">
                  ${m.avatar ? `
                    <img src="${m.avatar}" class="w-8 h-8 rounded-full object-cover border ${m.is_bot ? 'border-purple-500/50' : 'border-zinc-700'}">
                  ` : `
                    <div class="w-8 h-8 rounded-full ${m.is_bot ? 'bg-purple-500/20 border-purple-500/30' : 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/20 border-zinc-700'} flex items-center justify-center border">
                      ${m.is_bot ? '<svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-1.5 4.5H6.5L5 14.5m14 0H5"/></svg>' : `<span class="text-sm font-bold text-emerald-400">${(m.displayName || m.display_name || '?').charAt(0).toUpperCase()}</span>`}
                    </div>
                  `}
                  ${m.is_bot ? '<div class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-purple-500 rounded-full flex items-center justify-center"><span class="text-[7px] font-bold text-white">B</span></div>' : ''}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-zinc-200 truncate">${this.escapeHtml(m.displayName || m.display_name || 'Unknown')}${m.is_bot ? ' <span class="text-[9px] px-1 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full">BOT</span>' : ''}</p>
                  <p class="text-xs text-zinc-500">${m.is_bot ? '🤖 Bot' : m.role === 'owner' ? '👑 Owner' : m.role === 'admin' ? '⚡ Admin' : 'Member'}</p>
                </div>
              </div>
            `;
            const inviteUrl = window.location.origin + '/g/' + encodeURIComponent(group.slug);
            return `
              <div class="p-3 border-b border-zinc-800">
                <h3 class="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <i data-lucide="users" class="w-4 h-4"></i>
                  Members <span class="text-zinc-600">(${humanMembers.length + botMembers.length})</span>
                </h3>
              </div>
              <div class="p-3 border-b border-zinc-800">
                <p class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <i data-lucide="link" class="w-3 h-3"></i>
                  Invite Link
                </p>
                <div class="flex items-center gap-1.5">
                  <input type="text" readonly value="${this.escapeHtml(inviteUrl)}" class="flex-1 bg-zinc-800/50 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-mono select-all cursor-text min-w-0" id="invite-link-input">
                  <button id="copy-invite-link-btn" class="shrink-0 px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-medium transition-colors flex items-center gap-1" title="Copy invite link">
                    <i data-lucide="copy" class="w-3 h-3"></i>
                  </button>
                </div>
                <p class="text-[10px] text-zinc-600 mt-1.5">${group.privacy === 'private' ? '🔒 Private — only share with trusted people' : 'Anyone with this link can join'}</p>
              </div>
              <div class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                ${humanMembers.length === 0 && botMembers.length === 0 ? '<p class="text-center text-zinc-600 text-sm py-4">No members yet</p>' : ''}
                ${humanMembers.map(renderSidebarMember).join("")}
                ${botMembers.length > 0 ? `
                  <div class="pt-3 mt-2 border-t border-zinc-800">
                    <p class="text-[10px] font-bold text-purple-400 uppercase tracking-wider px-3 mb-1 flex items-center gap-1.5">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-1.5 4.5H6.5L5 14.5m14 0H5"/></svg>
                      Bots (${botMembers.length})
                    </p>
                    ${botMembers.map(renderSidebarMember).join("")}
                  </div>
                ` : ''}
              </div>
            `;
          })()}
        </div>
        
        <!-- Settings Modal -->
        <div id="group-settings-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm hidden items-center justify-center z-50">
          <div class="card max-w-lg w-full mx-4 slide-up max-h-[90vh] overflow-y-auto">
            <h2 class="text-xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
              <i data-lucide="settings" class="w-5 h-5 text-emerald-400"></i>
              Group Settings
            </h2>
            <!-- Bridged AiAS workspace settings (filled in for origin=aias_v1 twins) -->
            <div id="aias-ws-settings-slot"></div>
            <form id="group-settings-form" class="space-y-4">
              <div class="flex justify-center">
                <div class="relative">
                  <div id="edit-group-avatar-preview" style="width: 80px; height: 80px; border-radius: 16px; background: linear-gradient(135deg, #3f3f46, #27272a); display: flex; align-items: center; justify-content: center; cursor: pointer; border: 2px solid #10b981; transition: all 0.2s; overflow: hidden;">
                    ${group.avatar ? `<img src="${group.avatar}" style="width: 100%; height: 100%; object-fit: cover;">` : `<span class="text-2xl font-bold text-emerald-400">${group.name.charAt(0).toUpperCase()}</span>`}
                  </div>
                  <input type="file" id="edit-group-avatar-input" accept="image/*" class="hidden">
                  <p class="text-xs text-zinc-500 text-center mt-2">Click to change</p>
                </div>
              </div>
              <input type="hidden" name="avatar" id="edit-group-avatar-url" value="${group.avatar || ''}">
              <div>
                <label class="block text-sm font-medium text-zinc-300 mb-2">Name</label>
                <input type="text" name="name" class="input" value="${this.escapeHtml(group.name)}" required />
              </div>
              <div>
                <label class="block text-sm font-medium text-zinc-300 mb-2">Description</label>
                <textarea name="description" class="input resize-none" rows="3">${this.escapeHtml(group.description || '')}</textarea>
              </div>
              <div>
                <label class="block text-sm font-medium text-zinc-300 mb-2">Terms</label>
                <textarea name="terms" class="input resize-none" rows="2">${this.escapeHtml(group.terms || '')}</textarea>
              </div>
              <div class="flex gap-3 pt-2">
                <button type="button" id="cancel-group-settings" class="btn btn-secondary flex-1">Cancel</button>
                <button type="submit" class="btn btn-primary flex-1">Save</button>
              </div>
              <p id="group-settings-error" class="text-emerald-400 text-sm text-center hidden"></p>
            </form>

            ${group.privacy === 'private' && group.user_role === 'owner' ? `
            <div class="mt-6 pt-6 border-t border-zinc-700">
              <h3 class="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
                <i data-lucide="globe" class="w-4 h-4 text-emerald-400"></i>
                Convert to Public
              </h3>
              <p class="text-xs text-zinc-500 mb-3">Make this community publicly visible and browseable. This action cannot be undone — public communities cannot be made private again.</p>
              <div id="convert-public-section">
                <div class="space-y-3">
                  <div>
                    <label class="block text-xs font-medium text-zinc-400 mb-1">Custom Slug</label>
                    <input type="text" id="convert-slug-input" class="input font-mono text-sm" placeholder="my-community" pattern="[a-z0-9\\-]{3,30}" />
                    <p class="text-xs text-zinc-600 mt-1">3-30 lowercase letters, numbers, and hyphens. This becomes your shareable link: /g/your-slug</p>
                  </div>
                  <button type="button" id="convert-public-btn" class="btn w-full py-2.5 text-sm font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors rounded-lg">
                    <i data-lucide="globe" class="w-4 h-4 inline-block mr-1"></i>Convert to Public Community
                  </button>
                  <p id="convert-public-error" class="text-emerald-400 text-xs text-center hidden"></p>
                </div>
              </div>
            </div>
            ` : ''}

            <!-- Bot Management Section -->
            <div id="group-bot-management" class="mt-6 pt-6 border-t border-zinc-700">
              <h3 class="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
                <span class="text-pink-400">🤖</span> Bot Management
              </h3>
              <div id="group-bot-apps-container" class="space-y-2">
                <p class="text-xs text-zinc-500">Loading bot applications...</p>
              </div>
              <div id="group-approved-bots-container" class="mt-4 space-y-2">
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
    
    // Initialize Lucide icons for the chat
    if ((window as any).lucide) {
      (window as any).lucide.createIcons();
    }
    
    // Copy invite link handler
    document.getElementById("copy-invite-link-btn")?.addEventListener("click", async () => {
      const input = document.getElementById("invite-link-input") as HTMLInputElement;
      if (input) {
        try {
          await navigator.clipboard.writeText(input.value);
          const btn = document.getElementById("copy-invite-link-btn");
          if (btn) {
            btn.innerHTML = '<i data-lucide="check" class="w-3 h-3"></i>';
            btn.classList.add("text-emerald-300", "bg-emerald-500/30");
            if ((window as any).lucide) (window as any).lucide.createIcons();
            setTimeout(() => {
              btn.innerHTML = '<i data-lucide="copy" class="w-3 h-3"></i>';
              btn.classList.remove("text-emerald-300", "bg-emerald-500/30");
              if ((window as any).lucide) (window as any).lucide.createIcons();
            }, 2000);
          }
        } catch {
          input.select();
        }
      }
    });

    // Mobile tab switching
    document.querySelectorAll(".mobile-tab").forEach(tab => {
      tab.addEventListener("click", (e) => {
        const targetTab = (e.currentTarget as HTMLElement).dataset.tab;
        const panelGroups = document.getElementById("panel-groups");
        const panelChat = document.getElementById("panel-chat");
        const panelMembers = document.getElementById("panel-members");
        const panelThreads = document.getElementById("panel-threads");
        
        document.querySelectorAll(".mobile-tab").forEach(t => {
          t.classList.remove("text-emerald-400", "border-emerald-500");
          t.classList.add("text-zinc-400", "border-transparent");
        });
        (e.currentTarget as HTMLElement).classList.remove("text-zinc-400", "border-transparent");
        (e.currentTarget as HTMLElement).classList.add("text-emerald-400", "border-emerald-500");
        
        panelGroups?.classList.add("hidden");
        panelChat?.classList.add("hidden");
        panelMembers?.classList.add("hidden");
        panelThreads?.classList.add("hidden");
        panelGroups?.classList.remove("flex");
        panelChat?.classList.remove("flex");
        panelMembers?.classList.remove("flex");
        panelThreads?.classList.remove("flex");
        
        if (targetTab === "groups") {
          panelGroups?.classList.remove("hidden");
          panelGroups?.classList.add("flex");
        } else if (targetTab === "chat") {
          panelChat?.classList.remove("hidden");
          panelChat?.classList.add("flex");
        } else if (targetTab === "threads") {
          panelThreads?.classList.remove("hidden");
          panelThreads?.classList.add("flex");
          (this as any).loadThreadsList();
        } else if (targetTab === "members") {
          panelMembers?.classList.remove("hidden");
          panelMembers?.classList.add("flex");
        }
      });
    });

    document.querySelectorAll(".left-sidebar-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        const targetTab = (tab as HTMLElement).dataset.tab;
        document.querySelectorAll(".left-sidebar-tab").forEach(t => {
          t.classList.remove("text-emerald-400", "border-emerald-500");
          t.classList.add("text-zinc-500", "border-transparent");
        });
        (tab as HTMLElement).classList.remove("text-zinc-500", "border-transparent");
        (tab as HTMLElement).classList.add("text-emerald-400", "border-emerald-500");

        const commContent = document.getElementById("left-tab-content-communities");
        const threadContent = document.getElementById("left-tab-content-threads");
        if (targetTab === "communities") {
          commContent?.classList.remove("hidden");
          threadContent?.classList.add("hidden");
        } else if (targetTab === "threads") {
          commContent?.classList.add("hidden");
          threadContent?.classList.remove("hidden");
          (this as any).loadThreadsList();
        }
      });
    });

    document.getElementById("left-sidebar-collapse")?.addEventListener("click", () => {
      const panel = document.getElementById("panel-groups");
      const expandBtn = document.getElementById("left-sidebar-expand");
      if (panel) {
        panel.classList.add("hidden");
        panel.classList.remove("md:flex");
      }
      if (expandBtn) {
        expandBtn.classList.remove("hidden");
        expandBtn.classList.add("flex");
      }
    });

    document.getElementById("left-sidebar-expand-btn")?.addEventListener("click", () => {
      const panel = document.getElementById("panel-groups");
      const expandBtn = document.getElementById("left-sidebar-expand");
      if (panel) {
        panel.classList.remove("hidden");
        panel.classList.add("md:flex");
      }
      if (expandBtn) {
        expandBtn.classList.add("hidden");
        expandBtn.classList.remove("flex");
      }
    });

    document.getElementById("back-to-groups-list")?.addEventListener("click", () => {
      this.disconnectGroupSocket();
      this.showGroups();
    });
    
    // Group sidebar navigation
    document.querySelectorAll(".group-nav-item").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const gid = (e.currentTarget as HTMLElement).dataset.groupId;
        if (gid && gid !== groupId) {
          this.disconnectGroupSocket();
          this.openGroup(gid);
        }
      });
    });
    
    // Member profile clicks
    document.querySelectorAll(".member-item").forEach(item => {
      item.addEventListener("click", (e) => {
        const userId = (e.currentTarget as HTMLElement).dataset.userId;
        if (userId) {
          this.viewUserProfile(userId);
        }
      });
    });

    (window as any).__scrollToMessage = (messageId: string) => {
      const target = document.querySelector(`[data-msg-id="${messageId}"]`) as HTMLElement;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('msg-highlight-pulse');
        setTimeout(() => target.classList.remove('msg-highlight-pulse'), 1500);
      }
    };

    const msgContainer = document.getElementById("messages-container");
    if (msgContainer) {
      msgContainer.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        const peekBar = target.closest('.reply-peek-bar') as HTMLElement;
        if (peekBar) {
          const scrollTo = peekBar.dataset.scrollTo;
          if (scrollTo) {
            (window as any).__scrollToMessage(scrollTo);
          }
          return;
        }
        if (target.classList.contains('chat-img-open') && target.tagName === 'IMG') {
          const src = (target as HTMLImageElement).src;
          if (src && src.startsWith('https://i.ibb.co/')) {
            window.open(src, '_blank');
          }
        }
      });

      msgContainer.addEventListener("dblclick", (e) => {
        const wrapper = (e.target as HTMLElement).closest('.chat-msg-wrapper') as HTMLElement;
        if (wrapper) {
          const msgId = wrapper.dataset.msgId || '';
          const userId = wrapper.dataset.replyUserId || '';
          const sender = wrapper.dataset.replySender || '';
          const preview = wrapper.dataset.replyPreview || '';
          if (msgId && userId) {
            (window as any).__replyToMessage(msgId, userId, sender, preview);
          }
        }
      });
    }

    (window as any).__replyToMessage = (messageId: string, userId: string, displayName: string, contentPreview: string) => {
      this.replyingTo = { messageId, userId, displayName, content: contentPreview };
      const replyPreview = document.getElementById("reply-preview");
      const replyName = document.getElementById("reply-to-name");
      const replyContent = document.getElementById("reply-to-content");
      if (replyPreview && replyName && replyContent) {
        replyName.textContent = `Replying to ${displayName}`;
        replyContent.textContent = contentPreview || '📷 Image';
        replyPreview.classList.remove("hidden");
        replyPreview.style.animation = 'none';
        replyPreview.offsetHeight;
        replyPreview.style.animation = 'slideDown 0.15s ease-out';
      }
      const input = document.querySelector('#send-message-form input[name="content"]') as HTMLInputElement;
      if (input) input.focus();
    };

    document.getElementById("cancel-reply")?.addEventListener("click", () => {
      this.replyingTo = null;
      document.getElementById("reply-preview")?.classList.add("hidden");
    });

    document.getElementById("send-message-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.sendMessage();
    });
    
    document.getElementById("chat-gif-btn")?.addEventListener("click", (e) => {
      const btn = e.currentTarget as HTMLElement;
      this.openGifDrawer('group', btn, { groupId: this.currentGroup?.id });
    });

    // Chat image upload
    document.getElementById("chat-image-input")?.addEventListener("change", (e) => {
      const input = e.target as HTMLInputElement;
      if (input.files && input.files[0]) {
        this.handleChatImageSelect(input.files[0]);
      }
    });
    
    document.getElementById("chat-remove-image")?.addEventListener("click", () => this.clearChatImagePreview());

    document.getElementById("group-members-manage-btn")?.addEventListener("click", () => {
      this.showMembersPanel(groupId);
    });

    document.getElementById("group-settings-btn")?.addEventListener("click", () => {
      document.getElementById("group-settings-modal")?.classList.remove("hidden");
      document.getElementById("group-settings-modal")?.classList.add("flex");
      this.loadGroupBotManagement(groupId);
      // Bridged twin: surface the v1 workspace settings + directives up top.
      if (this.currentGroup?.origin === "aias_v1") this.refreshAiasSettings(groupId);
    });
    
    // Leave group button
    document.getElementById("leave-group-btn")?.addEventListener("click", async () => {
      if (!confirm("Are you sure you want to leave this group?")) return;
      
      const res = await fetch(`/api/groups/${groupId}/leave`, {
        method: "POST",
        headers: { "X-Auth-Hash": this.appState.hash || "" }
      });
      
      if (res.ok) {
        this.disconnectGroupSocket();
        this.showGroups();
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to leave group");
      }
    });

    document.getElementById("cancel-group-settings")?.addEventListener("click", () => {
      document.getElementById("group-settings-modal")?.classList.add("hidden");
      document.getElementById("group-settings-modal")?.classList.remove("flex");
    });

    document.getElementById("convert-slug-input")?.addEventListener("input", () => {
      document.getElementById("convert-public-error")?.classList.add("hidden");
    });

    document.getElementById("convert-public-btn")?.addEventListener("click", async () => {
      const slugInput = document.getElementById("convert-slug-input") as HTMLInputElement;
      const errorEl = document.getElementById("convert-public-error");
      if (!slugInput || !errorEl) return;
      
      const newSlug = slugInput.value.trim().toLowerCase();
      if (!newSlug || newSlug.length < 3 || newSlug.length > 30) {
        errorEl.textContent = "Slug must be 3-30 characters";
        errorEl.classList.remove("hidden");
        return;
      }
      if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(newSlug) && newSlug.length > 2 || !/^[a-z0-9-]+$/.test(newSlug)) {
        errorEl.textContent = "Only lowercase letters, numbers, and hyphens allowed";
        errorEl.classList.remove("hidden");
        return;
      }
      if (newSlug.startsWith("dnprv-")) {
        errorEl.textContent = "Slug cannot start with 'dnprv-' (reserved for private communities)";
        errorEl.classList.remove("hidden");
        return;
      }
      
      if (!confirm("Convert this community to public? This cannot be undone.")) return;
      
      try {
        const res = await fetch(`/api/groups/${groupId}/convert-public`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Auth-Hash": this.appState.hash || ""
          },
          body: JSON.stringify({ slug: newSlug })
        });
        
        if (res.ok) {
          document.getElementById("group-settings-modal")?.classList.add("hidden");
          document.getElementById("group-settings-modal")?.classList.remove("flex");
          this.openGroup(groupId);
        } else {
          const data = await res.json();
          errorEl.textContent = data.detail || "Failed to convert";
          errorEl.classList.remove("hidden");
        }
      } catch (e) {
        errorEl.textContent = "Failed to convert";
        errorEl.classList.remove("hidden");
      }
    });

    document.getElementById("edit-group-avatar-preview")?.addEventListener("click", () => {
      document.getElementById("edit-group-avatar-input")?.click();
    });

    document.getElementById("edit-group-avatar-input")?.addEventListener("change", async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const preview = document.getElementById("edit-group-avatar-preview");
      if (preview) {
        preview.innerHTML = '<div class="animate-pulse w-full h-full bg-zinc-700"></div>';
      }
      
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload/image", { 
          method: "POST", 
          headers: { "X-Auth-Hash": this.appState.hash || "" },
          body: formData 
        });
        if (res.ok) {
          const data = await res.json();
          (document.getElementById("edit-group-avatar-url") as HTMLInputElement).value = data.url;
          if (preview) {
            preview.innerHTML = `<img src="${data.url}" style="width: 100%; height: 100%; object-fit: cover;">`;
          }
          showEpicModal("Photo uploaded!", "success");
        } else {
          showEpicModal("Failed to upload photo", "error");
        }
      } catch (err) {
        console.error("Failed to upload avatar:", err);
        showEpicModal("Failed to upload photo", "error");
      }
    });

    document.getElementById("group-settings-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.saveGroupSettings(groupId);
    });

    this.connectGroupSocket(groupId);
    this.attachMsgReactionListeners();
    (this as any).loadThreadsList();
    this.attachThreadBadgeListeners();
    this.forceScrollBottom(() => this.setupScrollPagination(groupId));

    // Bridged twin: paint the v1 operator console (mode + drafts) over the room.
    this.aiasWs = null;
    this.aiasDrafts = [];
    if (group.origin === "aias_v1") {
      await this.mountAiasConsole(groupId);
    }
    } finally {
      this.isOpeningGroup = false;
    }
  }

  // ── Bridged-workspace operator console (origin "aias_v1") ──────────────────
  // A bridged community IS a v1 AiAS workspace. These handlers add the v1
  // manager controls (mode switch, human reply, shadow drafts, settings,
  // directives) on top of the proxied history. Every path below is forwarded
  // to v1 by the devnet catch-all proxy (main.py v1_same_origin_proxy).

  private aiasHeaders(json = false): Record<string, string> {
    const h: Record<string, string> = { "X-Auth-Hash": this.appState.hash || "" };
    if (json) h["Content-Type"] = "application/json";
    return h;
  }

  /** Fetch v1 config + pending drafts, then paint the operator controls. */
  private async mountAiasConsole(groupId: string): Promise<void> {
    try {
      const [wsRes, drRes] = await Promise.all([
        fetch(`/api/workspaces/${groupId}`, { headers: this.aiasHeaders() }),
        fetch(`/api/workspaces/${groupId}/drafts`, { headers: this.aiasHeaders() }),
      ]);
      this.aiasWs = wsRes.ok ? ((await wsRes.json()).workspace || {}) : {};
      this.aiasDrafts = drRes.ok ? ((await drRes.json()).drafts || []) : [];
    } catch {
      this.aiasWs = this.aiasWs || {};
      this.aiasDrafts = [];
    }
    this.renderAiasConsole(groupId);
  }

  /** (Re)paint the operator bar (+ shadow drafts) directly above the composer. */
  private renderAiasConsole(groupId: string): void {
    const form = document.getElementById("send-message-form") as HTMLFormElement | null;
    const composerWrap = form?.parentElement;
    if (!form || !composerWrap) return;
    const mode = normalizeMode(this.aiasWs?.mode);

    let slot = document.getElementById("aias-console-slot");
    if (!slot) {
      slot = document.createElement("div");
      slot.id = "aias-console-slot";
      composerWrap.insertBefore(slot, form);
    }
    slot.innerHTML = renderOperatorBar(mode) + (mode === "shadow" ? renderDrafts(this.aiasDrafts) : "");

    const input = form.querySelector('input[name="content"]') as HTMLInputElement | null;
    if (input) input.placeholder = composerPlaceholder(mode);

    if ((window as any).lucide) (window as any).lucide.createIcons();
    this.bindAiasConsole(groupId);
  }

  private bindAiasConsole(groupId: string): void {
    const slot = document.getElementById("aias-console-slot");
    if (!slot) return;

    slot.querySelectorAll(".aias-mode-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const mode = (btn as HTMLElement).dataset.wsMode;
        if (mode && normalizeMode(this.aiasWs?.mode) !== mode) await this.aiasSetMode(groupId, mode);
      });
    });
    slot.querySelectorAll(".aias-draft-approve").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = (btn as HTMLElement).dataset.draftId!;
        const card = slot.querySelector(`.aias-draft[data-draft-id="${id}"]`);
        const edited = (card?.querySelector(".aias-draft-text") as HTMLTextAreaElement | null)?.value;
        await this.aiasDraftAction(groupId, `drafts/${id}/approve`, { edited_content: edited });
      });
    });
    slot.querySelectorAll(".aias-draft-reject").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await this.aiasDraftAction(groupId, `drafts/${(btn as HTMLElement).dataset.draftId}/reject`, null);
      });
    });
    slot.querySelectorAll(".aias-draft-regen").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const directive = window.prompt("How should the assistant revise this draft?");
        if (!directive) return;
        await this.aiasDraftAction(groupId, `drafts/${(btn as HTMLElement).dataset.draftId}/regenerate`, { directive });
      });
    });
  }

  private async aiasSetMode(groupId: string, mode: string): Promise<void> {
    const res = await fetch(`/api/workspaces/${groupId}`, {
      method: "PATCH", headers: this.aiasHeaders(true), body: JSON.stringify({ mode }),
    });
    if (!res.ok) { console.error("Failed to switch workspace mode:", res.status); return; }
    const data = await res.json().catch(() => ({} as any));
    this.aiasWs = data.workspace || { ...(this.aiasWs || {}), mode };
    if (normalizeMode(mode) === "shadow") await this.aiasReloadDrafts(groupId);
    this.renderAiasConsole(groupId);
    this.refreshAiasSettings(groupId);
  }

  private async aiasReloadDrafts(groupId: string): Promise<void> {
    try {
      const r = await fetch(`/api/workspaces/${groupId}/drafts`, { headers: this.aiasHeaders() });
      this.aiasDrafts = r.ok ? ((await r.json()).drafts || []) : [];
    } catch { this.aiasDrafts = []; }
  }

  private async aiasDraftAction(groupId: string, path: string, body: any): Promise<void> {
    const res = await fetch(`/api/workspaces/${path}`, {
      method: "POST", headers: this.aiasHeaders(!!body),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) { console.error("Draft action failed:", path, res.status); return; }
    await this.aiasReloadDrafts(groupId);
    this.renderAiasConsole(groupId);
    await this.refreshBridgedMessages(groupId);
  }

  /** Re-fetch the proxied v1 history and repaint the message list. */
  private async refreshBridgedMessages(groupId: string): Promise<void> {
    try {
      const r = await fetch(`/api/groups/${groupId}/messages`, { headers: this.aiasHeaders() });
      if (!r.ok) return;
      const data = await r.json();
      this.groupMessages = Array.isArray(data.messages) ? data.messages : [];
      const container = document.getElementById("messages-container");
      if (container) {
        container.innerHTML = this.renderMessages();
        this.attachMsgReactionListeners();
        this.scrollToBottom();
      }
    } catch { /* keep existing render on transient failure */ }
  }

  /** Fill the settings-modal slot with the v1 workspace settings + directives. */
  private async refreshAiasSettings(groupId: string): Promise<void> {
    const slot = document.getElementById("aias-ws-settings-slot");
    if (!slot) return;
    let directives: any[] = [];
    try {
      const r = await fetch(`/api/workspaces/${groupId}/directives`, { headers: this.aiasHeaders() });
      if (r.ok) directives = (await r.json()).directives || [];
    } catch { /* directives are best-effort */ }
    slot.innerHTML = `<div class="mb-6 pb-6 border-b border-zinc-700">
        <h3 class="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
          <i data-lucide="sliders" class="w-4 h-4 text-emerald-400"></i> Workspace (AiAS)
        </h3>
        ${renderWsSettings(this.aiasWs || {}, directives)}
      </div>`;
    if ((window as any).lucide) (window as any).lucide.createIcons();
    this.bindAiasSettings(groupId);
  }

  private bindAiasSettings(groupId: string): void {
    const slot = document.getElementById("aias-ws-settings-slot");
    if (!slot) return;

    const patchField = async (field: string, value: any) => {
      const res = await fetch(`/api/workspaces/${groupId}`, {
        method: "PATCH", headers: this.aiasHeaders(true), body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) { console.error("Failed to update workspace setting:", field, res.status); return; }
      const data = await res.json().catch(() => ({} as any));
      this.aiasWs = data.workspace || { ...(this.aiasWs || {}), [field]: value };
      this.renderAiasConsole(groupId);
    };

    slot.querySelectorAll(".aias-mode-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const mode = (btn as HTMLElement).dataset.wsMode;
        if (mode) await this.aiasSetMode(groupId, mode);
      });
    });
    slot.querySelectorAll(".aias-ws-toggle").forEach((el) => {
      el.addEventListener("change", () =>
        patchField((el as HTMLElement).dataset.wsField!, (el as HTMLInputElement).checked));
    });
    slot.querySelectorAll(".aias-ws-select").forEach((el) => {
      el.addEventListener("change", () =>
        patchField((el as HTMLElement).dataset.wsField!, (el as HTMLSelectElement).value));
    });
    slot.querySelectorAll(".aias-ws-number").forEach((el) => {
      el.addEventListener("change", () => {
        const n = parseInt((el as HTMLInputElement).value, 10);
        if (Number.isFinite(n)) patchField((el as HTMLElement).dataset.wsField!, Math.max(1, Math.min(50, n)));
      });
    });
    slot.querySelectorAll(".aias-ws-text").forEach((el) => {
      el.addEventListener("change", () =>
        patchField((el as HTMLElement).dataset.wsField!, (el as HTMLInputElement).value));
    });
    slot.querySelectorAll(".aias-dir-toggle").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = (btn as HTMLElement).dataset.directiveId!;
        const active = (btn as HTMLElement).dataset.active === "1";
        await fetch(`/api/directives/${id}`, {
          method: "PATCH", headers: this.aiasHeaders(true), body: JSON.stringify({ is_active: !active }),
        });
        await this.refreshAiasSettings(groupId);
      });
    });
    const addForm = slot.querySelector(".aias-directive-add") as HTMLFormElement | null;
    addForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = addForm.querySelector('input[name="content"]') as HTMLInputElement;
      const content = input.value.trim();
      if (!content) return;
      input.value = "";
      await fetch(`/api/workspaces/${groupId}/directives`, {
        method: "POST", headers: this.aiasHeaders(true), body: JSON.stringify({ content, type: "guidance" }),
      });
      await this.refreshAiasSettings(groupId);
    });
  }

  private async saveGroupSettings(groupId: string): Promise<void> {
    const form = document.getElementById("group-settings-form") as HTMLFormElement;
    const formData = new FormData(form);
    const errorEl = document.getElementById("group-settings-error");

    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Hash": this.appState.hash || ""
        },
        body: JSON.stringify({
          name: formData.get("name"),
          description: formData.get("description"),
          terms: formData.get("terms"),
          avatar: formData.get("avatar")
        })
      });

      if (res.ok) {
        document.getElementById("group-settings-modal")?.classList.add("hidden");
        document.getElementById("group-settings-modal")?.classList.remove("flex");
        this.openGroup(groupId);
      } else {
        const data = await res.json();
        if (errorEl) {
          errorEl.textContent = data.detail || "Failed to save settings";
          errorEl.classList.remove("hidden");
        }
      }
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = "Failed to save settings";
        errorEl.classList.remove("hidden");
      }
    }
  }

  private async loadGroupBotManagement(groupId: string): Promise<void> {
    const appsContainer = document.getElementById("group-bot-apps-container");
    const approvedContainer = document.getElementById("group-approved-bots-container");
    if (!appsContainer || !approvedContainer) return;

    try {
      const [appsRes, approvedRes] = await Promise.all([
        fetch(`/api/groups/${groupId}/bot-applications`, { headers: { "X-Auth-Hash": this.appState.hash || "" } }),
        fetch(`/api/groups/${groupId}/approved-bots`, { headers: { "X-Auth-Hash": this.appState.hash || "" } })
      ]);

      const apps = appsRes.ok ? await appsRes.json() : [];
      const approved = approvedRes.ok ? await approvedRes.json() : [];

      if (apps.length === 0 && approved.length === 0) {
        appsContainer.innerHTML = '<p class="text-xs text-zinc-500">No bot applications or approved bots for this group.</p>';
        approvedContainer.innerHTML = '';
        return;
      }

      if (apps.length > 0) {
        appsContainer.innerHTML = `
          <p class="text-xs text-amber-400 font-medium mb-2">${apps.length} Pending Application${apps.length > 1 ? 's' : ''}</p>
          ${apps.map((app: any) => `
            <div class="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg" data-bot-group-app="${app.bot_id}">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-zinc-200">${this.escapeHtml(app.bot_name || 'Unknown Bot')}</p>
                <p class="text-xs text-zinc-500 truncate">${this.escapeHtml(app.purpose || 'No description')}</p>
              </div>
              <div class="flex gap-2 ml-3 flex-shrink-0">
                <button class="group-approve-bot-btn px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold rounded-lg transition-colors" data-bot-id="${app.bot_id}">Approve</button>
                <button class="group-reject-bot-btn px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold rounded-lg transition-colors" data-bot-id="${app.bot_id}">Reject</button>
              </div>
            </div>
          `).join("")}
        `;

        appsContainer.querySelectorAll(".group-approve-bot-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            const botId = (btn as HTMLElement).dataset.botId;
            if (!botId) return;
            const res = await fetch(`/api/groups/${groupId}/bot-applications/${botId}/approve`, {
              method: "POST",
              headers: { "X-Auth-Hash": this.appState.hash || "" }
            });
            if (res.ok) {
              showToast("Bot approved for this group!", "success");
              const row = (btn as HTMLElement).closest("[data-bot-group-app]");
              if (row) {
                (row as HTMLElement).style.transition = 'all 0.3s ease';
                (row as HTMLElement).style.opacity = '0';
                setTimeout(() => row.remove(), 300);
              }
              setTimeout(() => this.loadGroupBotManagement(groupId), 500);
            } else {
              showToast("Failed to approve bot", "error");
            }
          });
        });

        appsContainer.querySelectorAll(".group-reject-bot-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            const botId = (btn as HTMLElement).dataset.botId;
            if (!botId) return;
            const res = await fetch(`/api/groups/${groupId}/bot-applications/${botId}/reject`, {
              method: "POST",
              headers: { "X-Auth-Hash": this.appState.hash || "" }
            });
            if (res.ok) {
              showToast("Bot rejected", "info");
              const row = (btn as HTMLElement).closest("[data-bot-group-app]");
              if (row) {
                (row as HTMLElement).style.transition = 'all 0.3s ease';
                (row as HTMLElement).style.opacity = '0';
                setTimeout(() => row.remove(), 300);
              }
              setTimeout(() => this.loadGroupBotManagement(groupId), 500);
            } else {
              showToast("Failed to reject bot", "error");
            }
          });
        });
      } else {
        appsContainer.innerHTML = '<p class="text-xs text-zinc-500">No pending bot applications.</p>';
      }

      if (approved.length > 0) {
        approvedContainer.innerHTML = `
          <p class="text-xs text-emerald-400 font-medium mb-2">${approved.length} Approved Bot${approved.length > 1 ? 's' : ''}</p>
          ${approved.map((bot: any) => `
            <div class="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg" data-approved-bot="${bot.id}">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-zinc-200">${this.escapeHtml(bot.displayName || bot.username || 'Bot')}</p>
                <p class="text-xs text-zinc-500 truncate">${this.escapeHtml(bot.purpose || '')}</p>
              </div>
              <button class="group-remove-bot-btn px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold rounded-lg transition-colors ml-3 flex-shrink-0" data-bot-id="${bot.id}">Remove</button>
            </div>
          `).join("")}
        `;

        approvedContainer.querySelectorAll(".group-remove-bot-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            const botId = (btn as HTMLElement).dataset.botId;
            if (!botId || !confirm("Remove this bot from the group?")) return;
            const res = await fetch(`/api/groups/${groupId}/bots/${botId}/remove`, {
              method: "POST",
              headers: { "X-Auth-Hash": this.appState.hash || "" }
            });
            if (res.ok) {
              showToast("Bot removed from group", "info");
              const row = (btn as HTMLElement).closest("[data-approved-bot]");
              if (row) {
                (row as HTMLElement).style.transition = 'all 0.3s ease';
                (row as HTMLElement).style.opacity = '0';
                setTimeout(() => row.remove(), 300);
              }
            } else {
              showToast("Failed to remove bot", "error");
            }
          });
        });
      }
    } catch (err) {
      appsContainer.innerHTML = '<p class="text-xs text-zinc-500">Could not load bot management data.</p>';
    }
  }

  private renderMessages(): string {
    if (this.groupMessages.length === 0) {
      return `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; opacity: 0.6;">
          <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(145deg, #1a1a1d, #0d0d0f); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);">
            <svg width="32" height="32" fill="none" stroke="#f87171" stroke-width="1.5" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
          </div>
          <p style="color: #52525b; font-size: 15px; margin: 0;">No messages yet</p>
          <p style="color: #3f3f46; font-size: 13px; margin: 4px 0 0 0;">Be the first to say something</p>
        </div>
      `;
    }

    const loadMoreIndicator = this.hasMoreMessages ? `
      <div id="load-more-trigger" style="display: flex; align-items: center; justify-content: center; padding: 16px; gap: 8px;">
        <div id="load-more-spinner" style="display: none; width: 20px; height: 20px; border: 2px solid #3f3f46; border-top-color: #10b981; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        <span style="color: #52525b; font-size: 12px;">Scroll up for older messages</span>
      </div>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    ` : '';

    return loadMoreIndicator + this.groupMessages.map(msg => {
      const isMe = msg.user_id === this.appState.user?.id;
      const time = this.formatTimeLocal(msg.created_at || msg.timestamp);
      
      const senderName = isMe ? (this.appState.user?.displayName || 'You') : (msg.author?.displayName || 'Unknown');
      const preview = (msg.content || '').substring(0, 80);
      const safeId = this.escapeHtml(msg.id || '');
      const safeUserId = this.escapeHtml(msg.user_id || '');
      const safeSenderName = this.escapeHtml(senderName);
      const safePreview = this.escapeHtml(preview);
      
      const replyBar = msg.reply_to ? (() => {
        const rAuthor = this.escapeHtml(msg.reply_to.author_name || 'Unknown');
        const rContent = this.escapeHtml((msg.reply_to.content_preview || '').substring(0, 60));
        const rId = this.escapeHtml(msg.reply_to.message_id || '');
        return `
          <div class="reply-peek-bar" data-scroll-to="${rId}" style="display: flex; align-items: center; gap: 6px; padding: 4px 10px; margin-bottom: 4px; border-radius: 8px; background: rgba(16,185,129,0.06); border-left: 2px solid #10b981; cursor: pointer; transition: all 0.2s; position: relative;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" style="flex-shrink:0; opacity: 0.7;"><path d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4"/></svg>
            <span style="font-size: 11px; font-weight: 600; color: #10b981; white-space: nowrap;">${rAuthor}</span>
            <span style="font-size: 11px; color: #a1a1aa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${rContent || '📷 Image'}</span>
            <div class="reply-flip-panel" style="display: none; position: absolute; bottom: calc(100% + 6px); left: 0; right: 0; z-index: 50; padding: 10px 12px; background: #1c1c20; border: 1px solid #3f3f46; border-radius: 10px; box-shadow: 0 -4px 20px rgba(0,0,0,0.5); animation: replyFlipUp 0.2s ease-out;">
              <div style="font-size: 11px; font-weight: 600; color: #10b981; margin-bottom: 3px;">${rAuthor}</div>
              <div style="font-size: 12px; color: #d4d4d8; line-height: 1.4; word-wrap: break-word;">${rContent || '📷 Image'}</div>
              <div style="position: absolute; bottom: -5px; left: 16px; width: 10px; height: 10px; background: #1c1c20; border-right: 1px solid #3f3f46; border-bottom: 1px solid #3f3f46; transform: rotate(45deg);"></div>
            </div>
          </div>`;
      })() : '';

      if (isMe) {
        return `
          <div class="chat-msg-wrapper" data-msg-id="${safeId}" data-reply-user-id="${safeUserId}" data-reply-sender="${safeSenderName}" data-reply-preview="${safePreview}" style="display: flex; justify-content: flex-end; padding: 2px 0;" title="Double-click to reply">
            <div style="max-width: 70%; position: relative; cursor: default;">
              ${replyBar}
              <div class="chat-bubble-reply" style="background: rgba(255, 255, 255, 0.95); color: #0f0f0f; padding: 10px 14px; border-radius: 18px 18px 4px 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.3); transition: all 0.15s; position: relative;">
                ${msg.content ? `<div style="font-size: 14px; line-height: 1.45; word-wrap: break-word; font-weight: 500;">${parseContent(msg.content)}</div>` : ''}
                ${msg.image_url ? `<img src="${this.escapeHtml(msg.image_url)}" alt="Shared" class="chat-img-open" style="max-width: 100%; max-height: 200px; border-radius: 10px; margin-top: 8px; cursor: pointer; display: block;">` : ''}
                <button class="msg-reaction-btn" data-msg-id="${safeId}" data-group-id="${this.currentGroup?.id || ''}" style="position:absolute;bottom:-8px;right:4px;width:22px;height:22px;border-radius:50%;background:#27272a;border:1px solid #3f3f46;display:none;align-items:center;justify-content:center;cursor:pointer;font-size:12px;line-height:1;padding:0;z-index:5;">
                  <svg width="12" height="12" fill="none" stroke="#a1a1aa" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </button>
              </div>
              <div class="msg-reactions-display" data-msg-id="${safeId}" style="display:flex;flex-wrap:wrap;gap:3px;margin-top:2px;justify-content:flex-end;"></div>
              ${msg.thread_reply_count ? `
                <button class="thread-badge-btn" data-thread-root="${safeId}" style="display:flex;align-items:center;gap:4px;margin-top:4px;padding:4px 8px;border-radius:8px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);cursor:pointer;transition:all 0.2s;justify-content:flex-end;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M6 3v12"/><path d="M18 9a3 3 0 0 0-3-3H7"/><path d="M6 15a3 3 0 0 0 3 3h8"/></svg>
                  <span style="font-size:11px;color:#10b981;font-weight:600;">${msg.thread_reply_count} ${msg.thread_reply_count === 1 ? 'reply' : 'replies'}</span>
                  <span style="font-size:10px;color:#52525b;">· ${msg.thread_last_reply_by || ''}</span>
                </button>
              ` : ''}
              <div style="font-size: 10px; color: #71717a; text-align: right; margin-top: 3px; padding-right: 4px;">${time}</div>
            </div>
          </div>
        `;
      } else {
        const initial = msg.author?.displayName?.charAt(0).toUpperCase() || '?';
        const avatarColors = ['#f97316', '#a855f7', '#ec4899', '#14b8a6', '#facc15', '#10b981', '#3b82f6', '#8b5cf6'];
        const colorIndex = msg.author?.displayName?.charCodeAt(0) % avatarColors.length || 0;
        const avatarColor = avatarColors[colorIndex];
        
        return `
          <div class="chat-msg-wrapper" data-msg-id="${safeId}" data-reply-user-id="${safeUserId}" data-reply-sender="${safeSenderName}" data-reply-preview="${safePreview}" style="display: flex; align-items: flex-end; gap: 8px; padding: 2px 0;" title="Double-click to reply">
            ${msg.author?.avatar ? `
              <img src="${msg.author.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.4); border: 2px solid #3f3f46;">
            ` : `
              <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, ${avatarColor}, ${avatarColor}dd); display: flex; align-items: center; justify-content: center; color: white; font-size: 13px; font-weight: 700; flex-shrink: 0; box-shadow: 0 2px 8px ${avatarColor}66; border: 2px solid ${avatarColor};">
                ${initial}
              </div>
            `}
            <div style="max-width: 70%; cursor: default;">
              <div style="font-size: 11px; font-weight: 600; color: ${avatarColor}; margin-bottom: 3px; margin-left: 2px;">${this.escapeHtml(msg.author?.displayName || 'Unknown')}</div>
              ${replyBar}
              <div class="chat-bubble-reply" style="background: linear-gradient(135deg, #2a2a2e, #1f1f23); color: #fafafa; padding: 10px 14px; border-radius: 18px 18px 18px 4px; border: 1px solid #404045; box-shadow: 0 2px 6px rgba(0,0,0,0.25); transition: all 0.15s; position: relative;">
                ${msg.content ? `<div style="font-size: 14px; line-height: 1.45; word-wrap: break-word;">${parseContent(msg.content)}</div>` : ''}
                ${msg.image_url ? `<img src="${this.escapeHtml(msg.image_url)}" alt="Shared" class="chat-img-open" style="max-width: 100%; max-height: 200px; border-radius: 10px; margin-top: 8px; cursor: pointer; display: block;">` : ''}
                <button class="msg-reaction-btn" data-msg-id="${safeId}" data-group-id="${this.currentGroup?.id || ''}" style="position:absolute;bottom:-8px;left:4px;width:22px;height:22px;border-radius:50%;background:#27272a;border:1px solid #3f3f46;display:none;align-items:center;justify-content:center;cursor:pointer;font-size:12px;line-height:1;padding:0;z-index:5;">
                  <svg width="12" height="12" fill="none" stroke="#a1a1aa" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </button>
              </div>
              <div class="msg-reactions-display" data-msg-id="${safeId}" style="display:flex;flex-wrap:wrap;gap:3px;margin-top:2px;margin-left:2px;"></div>
              ${msg.thread_reply_count ? `
                <button class="thread-badge-btn" data-thread-root="${safeId}" style="display:flex;align-items:center;gap:4px;margin-top:4px;padding:4px 8px;border-radius:8px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);cursor:pointer;transition:all 0.2s;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M6 3v12"/><path d="M18 9a3 3 0 0 0-3-3H7"/><path d="M6 15a3 3 0 0 0 3 3h8"/></svg>
                  <span style="font-size:11px;color:#10b981;font-weight:600;">${msg.thread_reply_count} ${msg.thread_reply_count === 1 ? 'reply' : 'replies'}</span>
                  <span style="font-size:10px;color:#52525b;">· ${msg.thread_last_reply_by || ''}</span>
                </button>
              ` : ''}
              <div style="font-size: 10px; color: #71717a; margin-top: 3px; margin-left: 2px;">${time}</div>
            </div>
          </div>
        `;
      }
    }).join("");
  }

  private renderGroupMessage(msg: any): string {
    const isMe = msg.user_id === this.appState.user?.id;
    const time = this.formatTimeLocal(msg.created_at || msg.timestamp);
    const senderName = isMe ? (this.appState.user?.displayName || 'You') : (msg.author?.displayName || 'Unknown');
    const preview = (msg.content || '').substring(0, 80);
    const safeId = this.escapeHtml(msg.id || '');
    const safeUserId = this.escapeHtml(msg.user_id || '');
    const safeSenderName = this.escapeHtml(senderName);
    const safePreview = this.escapeHtml(preview);

    const replyBar = msg.reply_to ? (() => {
      const rAuthor = this.escapeHtml(msg.reply_to.author_name || 'Unknown');
      const rContent = this.escapeHtml((msg.reply_to.content_preview || '').substring(0, 60));
      const rId = this.escapeHtml(msg.reply_to.message_id || '');
      return `
        <div class="reply-peek-bar" data-scroll-to="${rId}" style="display: flex; align-items: center; gap: 6px; padding: 4px 10px; margin-bottom: 4px; border-radius: 8px; background: rgba(16,185,129,0.06); border-left: 2px solid #10b981; cursor: pointer; transition: all 0.2s; position: relative;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" style="flex-shrink:0; opacity: 0.7;"><path d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4"/></svg>
          <span style="font-size: 11px; font-weight: 600; color: #10b981; white-space: nowrap;">${rAuthor}</span>
          <span style="font-size: 11px; color: #a1a1aa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${rContent || '📷 Image'}</span>
          <div class="reply-flip-panel" style="display: none; position: absolute; bottom: calc(100% + 6px); left: 0; right: 0; z-index: 50; padding: 10px 12px; background: #1c1c20; border: 1px solid #3f3f46; border-radius: 10px; box-shadow: 0 -4px 20px rgba(0,0,0,0.5); animation: replyFlipUp 0.2s ease-out;">
            <div style="font-size: 11px; font-weight: 600; color: #10b981; margin-bottom: 3px;">${rAuthor}</div>
            <div style="font-size: 12px; color: #d4d4d8; line-height: 1.4; word-wrap: break-word;">${rContent || '📷 Image'}</div>
            <div style="position: absolute; bottom: -5px; left: 16px; width: 10px; height: 10px; background: #1c1c20; border-right: 1px solid #3f3f46; border-bottom: 1px solid #3f3f46; transform: rotate(45deg);"></div>
          </div>
        </div>`;
    })() : '';

    if (isMe) {
      return `
        <div class="chat-msg-wrapper" data-msg-id="${safeId}" data-reply-user-id="${safeUserId}" data-reply-sender="${safeSenderName}" data-reply-preview="${safePreview}" style="display: flex; justify-content: flex-end; padding: 2px 0;" title="Double-click to reply">
          <div style="max-width: 70%; position: relative; cursor: default;">
            ${replyBar}
            <div class="chat-bubble-reply" style="background: rgba(255, 255, 255, 0.95); color: #0f0f0f; padding: 10px 14px; border-radius: 18px 18px 4px 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.3); transition: all 0.15s; position: relative;">
              ${msg.content ? `<div style="font-size: 14px; line-height: 1.45; word-wrap: break-word; font-weight: 500;">${parseContent(msg.content)}</div>` : ''}
              ${msg.image_url ? `<img src="${this.escapeHtml(msg.image_url)}" alt="Shared" class="chat-img-open" style="max-width: 100%; max-height: 200px; border-radius: 10px; margin-top: 8px; cursor: pointer; display: block;">` : ''}
              <button class="msg-reaction-btn" data-msg-id="${safeId}" data-group-id="${this.currentGroup?.id || ''}" style="position:absolute;bottom:-8px;right:4px;width:22px;height:22px;border-radius:50%;background:#27272a;border:1px solid #3f3f46;display:none;align-items:center;justify-content:center;cursor:pointer;font-size:12px;line-height:1;padding:0;z-index:5;">
                <svg width="12" height="12" fill="none" stroke="#a1a1aa" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </button>
            </div>
            <div class="msg-reactions-display" data-msg-id="${safeId}" style="display:flex;flex-wrap:wrap;gap:3px;margin-top:2px;justify-content:flex-end;"></div>
            <div style="font-size: 10px; color: #71717a; text-align: right; margin-top: 3px; padding-right: 4px;">${time}</div>
          </div>
        </div>
      `;
    } else {
      const initial = msg.author?.displayName?.charAt(0).toUpperCase() || '?';
      const avatarColors = ['#f97316', '#a855f7', '#ec4899', '#14b8a6', '#facc15', '#10b981', '#3b82f6', '#8b5cf6'];
      const colorIndex = msg.author?.displayName?.charCodeAt(0) % avatarColors.length || 0;
      const avatarColor = avatarColors[colorIndex];

      return `
        <div class="chat-msg-wrapper" data-msg-id="${safeId}" data-reply-user-id="${safeUserId}" data-reply-sender="${safeSenderName}" data-reply-preview="${safePreview}" style="display: flex; align-items: flex-end; gap: 8px; padding: 2px 0;" title="Double-click to reply">
          ${msg.author?.avatar ? `
            <img src="${msg.author.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.4); border: 2px solid #3f3f46;">
          ` : `
            <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, ${avatarColor}, ${avatarColor}dd); display: flex; align-items: center; justify-content: center; color: white; font-size: 13px; font-weight: 700; flex-shrink: 0; box-shadow: 0 2px 8px ${avatarColor}66; border: 2px solid ${avatarColor};">
              ${initial}
            </div>
          `}
          <div style="max-width: 70%; cursor: default;">
            <div style="font-size: 11px; font-weight: 600; color: ${avatarColor}; margin-bottom: 3px; margin-left: 2px;">${this.escapeHtml(msg.author?.displayName || 'Unknown')}</div>
            ${replyBar}
            <div class="chat-bubble-reply" style="background: linear-gradient(135deg, #2a2a2e, #1f1f23); color: #fafafa; padding: 10px 14px; border-radius: 18px 18px 18px 4px; border: 1px solid #404045; box-shadow: 0 2px 6px rgba(0,0,0,0.25); transition: all 0.15s; position: relative;">
              ${msg.content ? `<div style="font-size: 14px; line-height: 1.45; word-wrap: break-word;">${parseContent(msg.content)}</div>` : ''}
              ${msg.image_url ? `<img src="${this.escapeHtml(msg.image_url)}" alt="Shared" class="chat-img-open" style="max-width: 100%; max-height: 200px; border-radius: 10px; margin-top: 8px; cursor: pointer; display: block;">` : ''}
              <button class="msg-reaction-btn" data-msg-id="${safeId}" data-group-id="${this.currentGroup?.id || ''}" style="position:absolute;bottom:-8px;left:4px;width:22px;height:22px;border-radius:50%;background:#27272a;border:1px solid #3f3f46;display:none;align-items:center;justify-content:center;cursor:pointer;font-size:12px;line-height:1;padding:0;z-index:5;">
                <svg width="12" height="12" fill="none" stroke="#a1a1aa" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </button>
            </div>
            <div class="msg-reactions-display" data-msg-id="${safeId}" style="display:flex;flex-wrap:wrap;gap:3px;margin-top:2px;margin-left:2px;"></div>
            <div style="font-size: 10px; color: #71717a; margin-top: 3px; margin-left: 2px;">${time}</div>
          </div>
        </div>
      `;
    }
  }

  private async loadThreadsList(): Promise<void> {
    if (!this.currentGroupId) return;
    const container = document.getElementById("threads-list");
    const desktopContainer = document.getElementById("left-tab-content-threads");
    if (!container && !desktopContainer) return;

    try {
      const res = await fetch(`/api/groups/${this.currentGroupId}/threads`, {
        headers: { "X-Auth-Hash": this.appState.hash || "" }
      });
      if (!res.ok) return;
      const threads = await res.json();

      const emptyHtml = `
        <div class="flex items-center justify-center h-32 text-zinc-500 text-sm">
          <div class="text-center">
            <i data-lucide="git-branch" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
            <p>No threads yet</p>
            <p class="text-xs text-zinc-600 mt-1">Reply to a message to start a thread</p>
          </div>
        </div>
      `;

      let threadsHtml = emptyHtml;
      if (threads.length) {
        threadsHtml = threads.map((t: any) => {
          const timeAgo = this.formatTimeAgo(t.last_reply_at || t.created_at);
          return `
            <button class="thread-item w-full text-left p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/30 hover:bg-zinc-800/50 transition-all" data-thread-id="${this.escapeHtml(t.root_message_id)}">
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  ${t.root_author_avatar ? `<img src="${t.root_author_avatar}" class="w-8 h-8 rounded-full object-cover">` : `<span class="text-sm font-bold text-emerald-400">${(t.root_author || '?').charAt(0).toUpperCase()}</span>`}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <span class="text-xs font-semibold text-zinc-300">${this.escapeHtml(t.root_author || 'Unknown')}</span>
                    <span class="text-[10px] text-zinc-600">${timeAgo}</span>
                  </div>
                  <p class="text-sm text-zinc-400 truncate mb-1.5">${this.escapeHtml(t.root_content || '')}</p>
                  <div class="flex items-center gap-3">
                    <span class="text-xs text-emerald-400 font-medium flex items-center gap-1">
                      <i data-lucide="message-circle" class="w-3 h-3"></i>
                      ${t.reply_count || 0} ${(t.reply_count || 0) === 1 ? 'reply' : 'replies'}
                    </span>
                    <span class="text-[10px] text-zinc-600">Last reply by ${this.escapeHtml(t.last_reply_by || 'Unknown')}</span>
                  </div>
                </div>
              </div>
            </button>
          `;
        }).join("");
      }

      const targets = [container, desktopContainer].filter(Boolean) as HTMLElement[];
      targets.forEach(el => {
        el.innerHTML = threadsHtml;
      });
      if ((window as any).lucide) (window as any).lucide.createIcons();

      document.querySelectorAll(".thread-item").forEach(item => {
        item.addEventListener("click", (e) => {
          const threadId = (e.currentTarget as HTMLElement).dataset.threadId;
          if (threadId) this.openThreadView(threadId);
        });
      });
    } catch (err) {
      console.error("Failed to load threads:", err);
    }
  }

  private async openThreadView(rootMessageId: string): Promise<void> {
    if (!this.currentGroupId) return;
    this.viewingThreadId = rootMessageId;

    try {
      const res = await fetch(`/api/groups/${this.currentGroupId}/threads/${rootMessageId}`, {
        headers: { "X-Auth-Hash": this.appState.hash || "" }
      });
      if (!res.ok) { this.viewingThreadId = null; return; }
      const data = await res.json();

      const panelChat = document.getElementById("panel-chat");
      const panelThreads = document.getElementById("panel-threads");
      const panelGroups = document.getElementById("panel-groups");
      const panelMembers = document.getElementById("panel-members");

      [panelThreads, panelGroups, panelMembers].forEach(p => {
        p?.classList.add("hidden");
        p?.classList.remove("flex");
      });
      panelChat?.classList.remove("hidden");
      panelChat?.classList.add("flex");

      document.querySelectorAll(".mobile-tab").forEach(t => {
        t.classList.remove("text-emerald-400", "border-emerald-500");
        t.classList.add("text-zinc-400", "border-transparent");
      });

      const messagesContainer = document.getElementById("messages-container");
      if (!messagesContainer) return;

      const groupHeader = panelChat?.querySelector(".group-header-epic");
      if (groupHeader) {
        (groupHeader as HTMLElement).innerHTML = `
          <div class="relative px-4 py-3 flex items-center gap-3">
            <button id="back-from-thread" class="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors flex-shrink-0">
              <i data-lucide="arrow-left" class="w-5 h-5"></i>
            </button>
            <div class="flex-1 min-w-0">
              <h2 class="font-bold text-zinc-100 text-sm flex items-center gap-1.5">
                <i data-lucide="git-branch" class="w-4 h-4 text-emerald-400"></i>
                Thread
              </h2>
              <p class="text-xs text-zinc-500 truncate">${this.escapeHtml((data.root?.content || '').substring(0, 60))}</p>
            </div>
            <span class="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">${(data.replies || []).length} ${(data.replies || []).length === 1 ? 'reply' : 'replies'}</span>
          </div>
        `;
      }

      let html = '';
      const allMessages = [data.root, ...(data.replies || [])];
      allMessages.forEach((msg: any, idx: number) => {
        if (!msg) return;
        const isRoot = idx === 0;
        html += this.renderGroupMessage(msg);
        if (isRoot && (data.replies || []).length > 0) {
          html += `
            <div class="flex items-center gap-3 py-2 px-2">
              <div class="flex-1 h-px bg-emerald-500/20"></div>
              <span class="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">${(data.replies || []).length} ${(data.replies || []).length === 1 ? 'reply' : 'replies'}</span>
              <div class="flex-1 h-px bg-emerald-500/20"></div>
            </div>
          `;
        }
      });

      messagesContainer.innerHTML = html;
      if ((window as any).lucide) (window as any).lucide.createIcons();
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      const messageInput = panelChat?.querySelector('input[name="content"]') as HTMLInputElement;
      if (messageInput) {
        messageInput.placeholder = "Reply to thread...";
      }

      this.replyingTo = {
        messageId: rootMessageId,
        userId: data.root?.user_id || '',
        displayName: data.root?.author?.displayName || 'Unknown',
        content: (data.root?.content || '').substring(0, 80)
      };
      const replyPreview = document.getElementById("reply-preview");
      if (replyPreview) replyPreview.classList.add("hidden");

      document.getElementById("back-from-thread")?.addEventListener("click", () => {
        this.exitThreadView();
      });

      this.setupThreadMessageHandlers(messagesContainer);
      this.attachMsgReactionListeners();

    } catch (err) {
      console.error("Failed to open thread:", err);
      this.viewingThreadId = null;
    }
  }

  private exitThreadView(): void {
    this.viewingThreadId = null;
    this.replyingTo = null;
    if (this.currentGroupId) {
      this.openGroup(this.currentGroupId, true);
    }
  }

  private setupThreadMessageHandlers(container: HTMLElement): void {
    container.querySelectorAll(".chat-msg-wrapper").forEach(wrapper => {
      wrapper.addEventListener("dblclick", (e) => {
        const el = e.currentTarget as HTMLElement;
        const msgId = el.dataset.msgId || '';
        const userId = el.dataset.replyUserId || '';
        const sender = el.dataset.replySender || '';
        const preview = el.dataset.replyPreview || '';
        if (msgId && (window as any).__replyToMessage) {
          (window as any).__replyToMessage(msgId, userId, sender, preview);
        }
      });
    });

    container.querySelectorAll(".reply-peek-bar").forEach(bar => {
      bar.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        const scrollTo = target.dataset.scrollTo;
        if (scrollTo && (window as any).__scrollToMessage) {
          (window as any).__scrollToMessage(scrollTo);
        }
      });
    });
  }

  private formatTimeAgo(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diff < 60) return 'just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  }

  private pendingChatImageUrl: string | null = null;

  private emojiDrawer: {
    visible: boolean;
    targetType: 'post' | 'message';
    targetId: string;
    groupId?: string;
    pack: string;
    category: string;
    search: string;
    page: number;
    emoji: any[];
    loading: boolean;
    hasMore: boolean;
    element: HTMLElement | null;
  } = {
    visible: false, targetType: 'post', targetId: '', pack: 'twemoji',
    category: '', search: '', page: 0, emoji: [], loading: false,
    hasMore: true, element: null
  };

  private async handleChatImageSelect(file: File): Promise<void> {
    const errorEl = document.getElementById("chat-upload-error");
    const previewContainer = document.getElementById("chat-image-preview");
    const preview = document.getElementById("chat-preview-img") as HTMLImageElement;
    
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      if (errorEl) {
        errorEl.textContent = "Invalid file type. Use JPEG, PNG, GIF, or WebP.";
        errorEl.classList.remove("hidden");
      }
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      if (errorEl) {
        errorEl.textContent = "File too large. Maximum 5MB.";
        errorEl.classList.remove("hidden");
      }
      return;
    }
    
    errorEl?.classList.add("hidden");
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (preview && previewContainer) {
        preview.src = e.target?.result as string;
        previewContainer.classList.remove("hidden");
      }
    };
    reader.readAsDataURL(file);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/upload/image", {
        method: "POST",
        headers: { "X-Auth-Hash": this.appState.hash || "" },
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        this.pendingChatImageUrl = data.url;
      } else {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }
    } catch (e: any) {
      if (errorEl) {
        errorEl.textContent = e.message || "Failed to upload image";
        errorEl.classList.remove("hidden");
      }
      this.clearChatImagePreview();
    }
  }

  private clearChatImagePreview(): void {
    this.pendingChatImageUrl = null;
    document.getElementById("chat-image-preview")?.classList.add("hidden");
    const input = document.getElementById("chat-image-input") as HTMLInputElement;
    if (input) input.value = "";
    document.getElementById("chat-upload-error")?.classList.add("hidden");
  }

  private async sendMessage(): Promise<void> {
    const form = document.getElementById("send-message-form") as HTMLFormElement;
    const input = form.querySelector('input[name="content"]') as HTMLInputElement;
    let content = input.value.trim();
    
    if (!content && !this.pendingChatImageUrl) return;
    if (!this.currentGroup) return;

    // Bridged twin: the composer is the operator's HUMAN reply into the v1
    // workspace (POST /admin-message), mirroring the v1 manager console. Mode
    // (ai/shadow/takeover) governs what the assistant does with the client's
    // turns and is controlled by the operator bar, not the composer.
    if (this.currentGroup.origin === "aias_v1") {
      if (!content) return;
      input.value = "";
      const res = await fetch(`/api/workspaces/${this.currentGroup.id}/admin-message`, {
        method: "POST", headers: this.aiasHeaders(true), body: JSON.stringify({ content }),
      });
      if (res.ok) await this.refreshBridgedMessages(this.currentGroup.id);
      else console.error("Failed to send human reply:", res.status);
      return;
    }

    let replyToData: any = null;
    if (this.replyingTo) {
      replyToData = {
        message_id: this.replyingTo.messageId,
        author_name: this.replyingTo.displayName,
        content_preview: this.replyingTo.content
      };
      if (content && !this.viewingThreadId) {
        const mention = `@${this.replyingTo.displayName}`;
        if (!content.toLowerCase().startsWith(mention.toLowerCase())) {
          content = `${mention} ${content}`;
        }
      }
    }
    if (this.viewingThreadId) {
      const threadRootReply = {
        messageId: this.viewingThreadId,
        userId: this.replyingTo?.userId || '',
        displayName: this.replyingTo?.displayName || 'Unknown',
        content: this.replyingTo?.content || ''
      };
      this.replyingTo = null;
      document.getElementById("reply-preview")?.classList.add("hidden");
      this.replyingTo = threadRootReply;
    } else {
      this.replyingTo = null;
      document.getElementById("reply-preview")?.classList.add("hidden");
    }

    input.value = "";
    const imageUrl = this.pendingChatImageUrl;
    this.clearChatImagePreview();

    const res = await fetch(`/api/groups/${this.currentGroup.id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Hash": this.appState.hash || ""
      },
      body: JSON.stringify({ content, image_url: imageUrl, reply_to: replyToData })
    });

    if (!res.ok) {
      console.error("Failed to send message:", res.status);
    }
  }

  private connectGroupSocket(groupId: string): void {
    this.disconnectGroupSocket();
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/group/${groupId}`;
    
    this.groupSocket = new WebSocket(wsUrl);
    
    this.groupSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_message") {
          if (data.message?.thread_root_id && this.viewingThreadId === data.message.thread_root_id) {
            const messagesContainer = document.getElementById("messages-container");
            if (messagesContainer) {
              const msgHtml = this.renderGroupMessage(data.message);
              messagesContainer.insertAdjacentHTML("beforeend", msgHtml);
              if ((window as any).lucide) (window as any).lucide.createIcons();
              this.attachMsgReactionListeners();
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
          } else {
            this.groupMessages.push(data.message);
            const container = document.getElementById("messages-container");
            if (container) {
              container.innerHTML = this.renderMessages();
              this.attachMsgReactionListeners();
              this.scrollToBottom();
            }
          }
          if (data.message?.thread_root_id) {
            const threadsPanel = document.getElementById("panel-threads");
            if (threadsPanel && !threadsPanel.classList.contains("hidden")) {
              this.loadThreadsList();
            }
          }
        } else if (data.type === "reaction_update") {
          if (data.target_type === "message") {
            const container = document.querySelector(`.msg-reactions-display[data-msg-id="${data.target_id}"]`);
            if (container) this.renderReactionBadges(container as HTMLElement, data.reactions, 'message', data.target_id, data.group_id);
          }
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };
  }

  private disconnectGroupSocket(): void {
    if (this.groupSocket) {
      this.groupSocket.close();
      this.groupSocket = null;
    }
    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
      this.scrollObserver = null;
    }
    this.isLoadingMore = false;
  }

  private setupScrollPagination(groupId: string): void {
    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
      this.scrollObserver = null;
    }
    
    this.observeLoadMoreTrigger(groupId);
    
    const loadMoreEl = document.getElementById("load-more-trigger");
    if (loadMoreEl) {
      loadMoreEl.style.cursor = "pointer";
      loadMoreEl.addEventListener("click", () => this.loadMoreMessages(groupId));
    }
  }
  
  private observeLoadMoreTrigger(groupId: string): void {
    const container = document.getElementById("messages-container");
    const trigger = document.getElementById("load-more-trigger");
    if (!container || !trigger) return;
    
    this.scrollObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && this.hasMoreMessages && !this.isLoadingMore) {
          this.loadMoreMessages(groupId);
        }
      }
    }, { root: container, threshold: 0.1 });
    
    this.scrollObserver.observe(trigger);
  }

  private async loadMoreMessages(groupId: string): Promise<void> {
    if (this.isLoadingMore || !this.hasMoreMessages || this.nextBefore === null) return;
    this.isLoadingMore = true;

    const spinner = document.getElementById("load-more-spinner");
    const spinnerText = spinner?.parentElement?.querySelector("span");
    if (spinner) spinner.style.display = "block";
    if (spinnerText) spinnerText.textContent = "Loading older messages...";
    
    try {
      const res = await fetch(`/api/groups/${groupId}/messages?before=${this.nextBefore}&limit=50`, {
        headers: { "X-Auth-Hash": this.appState.hash || "" }
      });
      if (!res.ok) return;
      
      const data = await res.json();
      const olderMessages = Array.isArray(data.messages) ? data.messages : [];
      this.hasMoreMessages = data.has_more || false;
      this.nextBefore = data.next_before ?? null;
      
      if (olderMessages.length > 0) {
        const container = document.getElementById("messages-container");
        if (!container) return;
        
        const prevScrollHeight = container.scrollHeight;
        const prevScrollTop = container.scrollTop;
        this.groupMessages = [...olderMessages, ...this.groupMessages];
        
        if (this.scrollObserver) {
          this.scrollObserver.disconnect();
          this.scrollObserver = null;
        }
        
        container.innerHTML = this.renderMessages();
        this.attachMsgReactionListeners();
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
        
        if (this.hasMoreMessages) {
          this.observeLoadMoreTrigger(groupId);
        }
      }
    } catch (e) {
      console.error("Failed to load more messages:", e);
    } finally {
      this.isLoadingMore = false;
      const s = document.getElementById("load-more-spinner");
      if (s) s.style.display = "none";
    }
  }

  private scrollToBottom(): void {
    const container = document.getElementById("messages-container");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  private forceScrollBottom(onSettled?: () => void): void {
    const container = document.getElementById("messages-container");
    if (!container) return;
    
    const doScroll = () => { container.scrollTop = container.scrollHeight; };
    
    doScroll();
    requestAnimationFrame(() => {
      doScroll();
      requestAnimationFrame(() => {
        doScroll();
        setTimeout(() => {
          doScroll();
          if (onSettled) onSettled();
        }, 200);
      });
    });
  }

  private getFieldLabelFromUser(user: User): string {
    const map: Record<string, string> = {
      founder: "Founder",
      developer: "Developer",
      designer: "Designer",
      marketer: "Growth",
      product: "Product",
      freelancer: "Freelancer",
      software: "Developer",
      design: "Designer",
      marketing: "Marketer",
      data: "Data",
      devops: "DevOps",
      development: "Developer",
      other: "Builder"
    };
    return map[user.field] || user.field;
  }

  private async showMembersPanel(groupId: string, tab: string = 'members'): Promise<void> {
    const res = await fetch(`/api/groups/${groupId}/members`, {
      headers: { "X-Auth-Hash": this.appState.hash || "" }
    });
    
    if (!res.ok) {
      showEpicModal("Failed to load members", "error");
      return;
    }
    
    const data = await res.json();
    const { members, my_role, is_superadmin } = data;
    const isPlatformAdmin = is_superadmin || data.is_admin || this.appState.user?.is_admin;
    
    const canManageRoles = my_role === "owner" || isPlatformAdmin;
    const canBan = ["owner", "admin"].includes(my_role) || isPlatformAdmin;
    const canKick = ["owner", "admin", "moderator"].includes(my_role) || isPlatformAdmin;
    const isOwner = my_role === "owner" || isPlatformAdmin;
    
    let botApps: any[] = [];
    let approvedBots: any[] = [];
    if (isOwner) {
      const appsRes = await fetch(`/api/groups/${groupId}/bot-applications`, {
        headers: { "X-Auth-Hash": this.appState.hash || "" }
      });
      if (appsRes.ok) botApps = await appsRes.json();
      
      const botsRes = await fetch(`/api/groups/${groupId}/approved-bots`, {
        headers: { "X-Auth-Hash": this.appState.hash || "" }
      });
      if (botsRes.ok) approvedBots = await botsRes.json();
    }
    
    const roleColors: Record<string, string> = {
      owner: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      admin: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      moderator: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      member: "bg-zinc-700/50 text-zinc-400 border-zinc-600/30"
    };
    
    const modal = document.createElement("div");
    modal.className = "fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4";
    modal.id = "members-modal";
    modal.innerHTML = `
      <div class="bg-zinc-900 rounded-2xl border border-zinc-700 max-w-lg w-full max-h-[80vh] flex flex-col">
        <div class="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-zinc-100">Group Management</h2>
          <button id="close-members-modal" class="text-zinc-400 hover:text-zinc-100">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        ${isOwner ? `
        <div class="flex border-b border-zinc-800">
          <button class="members-tab flex-1 py-2 text-sm font-medium ${tab === 'members' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-zinc-400 hover:text-zinc-200'}" data-tab="members">
            Members (${members.length})
          </button>
          <button class="members-tab flex-1 py-2 text-sm font-medium ${tab === 'bots' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-zinc-400 hover:text-zinc-200'}" data-tab="bots">
            Bots ${botApps.length > 0 ? `<span class="ml-1 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">${botApps.length}</span>` : `(${approvedBots.length})`}
          </button>
        </div>
        ` : ''}
        <div class="p-4 text-sm text-zinc-500 border-b border-zinc-800">
          Your role: <span class="font-medium ${roleColors[my_role || 'member']?.split(' ')[1] || 'text-zinc-400'}">${my_role || 'member'}</span>
          ${isPlatformAdmin ? ' <span class="text-purple-400">(Platform Admin)</span>' : ''}
        </div>
        <div id="tab-members" class="flex-1 overflow-y-auto p-4 space-y-2 ${tab !== 'members' ? 'hidden' : ''}">
          ${(() => {
            const humans = members.filter((m: any) => !m.is_bot);
            const bots = members.filter((m: any) => m.is_bot);
            const renderMember = (m: any) => `
              <div class="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                <div class="relative flex-shrink-0" style="width:40px;height:40px;">
                  ${m.avatar ? `
                    <img src="${m.avatar}" alt="${m.displayName}" style="width:40px;height:40px;" class="rounded-full object-cover border ${m.is_bot ? 'border-purple-500/50' : 'border-zinc-600'}">
                  ` : `
                    <div style="width:40px;height:40px;" class="rounded-full ${m.is_bot ? 'bg-purple-500/20' : 'bg-zinc-700'} flex items-center justify-center text-zinc-300 text-sm font-medium">
                      ${m.is_bot ? '<svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-1.5 4.5H6.5L5 14.5m14 0H5"/></svg>' : m.displayName.charAt(0).toUpperCase()}
                    </div>
                  `}
                  ${m.is_bot ? '<div class="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center"><span class="text-[8px] font-bold text-white">B</span></div>' : ''}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-zinc-100 truncate">${this.escapeHtml(m.displayName)} ${m.is_bot ? '<span class="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full ml-1">BOT</span>' : ''}</p>
                  <span class="text-xs px-2 py-0.5 rounded-full border ${roleColors[m.role] || roleColors.member}">
                    ${m.role}${m.is_banned ? ' (BANNED)' : ''}
                  </span>
                </div>
                ${m.id !== this.appState.user?.id && !m.is_bot ? `
                  <div class="flex items-center gap-1">
                    ${canManageRoles && m.role !== 'owner' ? `
                      <select class="role-select bg-zinc-700 border border-zinc-600 text-zinc-100 text-xs rounded px-2 py-1" data-user-id="${m.id}">
                        <option value="admin" ${m.role === 'admin' ? 'selected' : ''}>Admin</option>
                        <option value="moderator" ${m.role === 'moderator' ? 'selected' : ''}>Mod</option>
                        <option value="member" ${m.role === 'member' ? 'selected' : ''}>Member</option>
                      </select>
                    ` : ''}
                    ${canKick && m.role !== 'owner' && !m.is_banned ? `
                      <button class="kick-btn text-orange-400 hover:text-orange-300 p-1" data-user-id="${m.id}" title="Kick">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"/>
                        </svg>
                      </button>
                    ` : ''}
                    ${canBan && m.role !== 'owner' ? `
                      ${m.is_banned ? `
                        <button class="unban-btn text-emerald-400 hover:text-emerald-300 p-1" data-user-id="${m.id}" title="Unban">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                        </button>
                      ` : `
                        <button class="ban-btn text-emerald-400 hover:text-emerald-300 p-1" data-user-id="${m.id}" title="Ban">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                          </svg>
                        </button>
                      `}
                    ` : ''}
                  </div>
                ` : ''}
              </div>
            `;
            let html = '';
            if (humans.length > 0) {
              html += `<div class="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2"><svg style="width:14px;height:14px;min-width:14px;min-height:14px;max-width:14px;max-height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>Members (${humans.length})</div>`;
              html += humans.map(renderMember).join('');
            }
            if (bots.length > 0) {
              html += `<div class="text-xs font-bold text-purple-400 uppercase tracking-wider mt-4 mb-2 flex items-center gap-2"><svg style="width:14px;height:14px;min-width:14px;min-height:14px;max-width:14px;max-height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-1.5 4.5H6.5L5 14.5m14 0H5"/></svg>Bots (${bots.length})</div>`;
              html += bots.map(renderMember).join('');
            }
            if (members.length === 0) html = '<p class="text-zinc-500 text-center py-4">No members yet</p>';
            return html;
          })()}
        </div>
        ${isOwner ? `
        <div id="tab-bots" class="flex-1 overflow-y-auto p-4 space-y-4 ${tab !== 'bots' ? 'hidden' : ''}">
          ${botApps.length > 0 ? `
            <div class="space-y-2">
              <h3 class="text-sm font-medium text-yellow-400 flex items-center gap-2">
                <span class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                Pending Applications
              </h3>
              ${botApps.map((app: any) => `
                <div class="p-3 bg-zinc-800/50 rounded-xl border border-yellow-500/30">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg">
                      🤖
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-zinc-100">${this.escapeHtml(app.bot_name)}</p>
                      <p class="text-xs text-zinc-400">@${this.escapeHtml(app.bot_username)}</p>
                    </div>
                  </div>
                  <p class="mt-2 text-sm text-zinc-400">${this.escapeHtml(app.bot_purpose || 'No purpose specified')}</p>
                  <div class="mt-3 flex gap-2">
                    <button class="approve-bot-btn flex-1 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30 transition-colors" data-bot-id="${app.bot_id}">
                      Approve
                    </button>
                    <button class="reject-bot-btn flex-1 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30 transition-colors" data-bot-id="${app.bot_id}">
                      Reject
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <div class="space-y-2">
            <h3 class="text-sm font-medium text-emerald-400">Approved Bots (${approvedBots.length})</h3>
            ${approvedBots.length === 0 ? '<p class="text-zinc-500 text-sm">No bots approved yet</p>' : ''}
            ${approvedBots.map((bot: any) => `
              <div class="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-lg">
                  🤖
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-zinc-100">${this.escapeHtml(bot.displayName)}</p>
                  <p class="text-xs text-zinc-400">@${this.escapeHtml(bot.username)}</p>
                </div>
                <button class="remove-bot-btn text-emerald-400 hover:text-emerald-300 p-2 hover:bg-emerald-500/10 rounded-lg transition-colors" data-bot-id="${bot.id}" title="Remove bot">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById("close-members-modal")?.addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });
    
    modal.querySelectorAll(".members-tab").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const newTab = (e.currentTarget as HTMLElement).dataset.tab;
        modal.remove();
        this.showMembersPanel(groupId, newTab);
      });
    });
    
    modal.querySelectorAll(".approve-bot-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const botId = (e.currentTarget as HTMLElement).dataset.botId;
        const res = await fetch(`/api/groups/${groupId}/bot-applications/${botId}/approve`, {
          method: "POST",
          headers: { "X-Auth-Hash": this.appState.hash || "" }
        });
        if (res.ok) {
          showEpicModal("Bot approved!", "success");
          modal.remove();
          this.showMembersPanel(groupId, 'bots');
        }
      });
    });
    
    modal.querySelectorAll(".reject-bot-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const botId = (e.currentTarget as HTMLElement).dataset.botId;
        const res = await fetch(`/api/groups/${groupId}/bot-applications/${botId}/reject`, {
          method: "POST",
          headers: { "X-Auth-Hash": this.appState.hash || "" }
        });
        if (res.ok) {
          showEpicModal("Bot rejected", "info");
          modal.remove();
          this.showMembersPanel(groupId, 'bots');
        }
      });
    });
    
    modal.querySelectorAll(".remove-bot-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const botId = (e.currentTarget as HTMLElement).dataset.botId;
        if (confirm("Remove this bot from the group?")) {
          const res = await fetch(`/api/groups/${groupId}/bots/${botId}/remove`, {
            method: "POST",
            headers: { "X-Auth-Hash": this.appState.hash || "" }
          });
          if (res.ok) {
            showEpicModal("Bot removed", "info");
            modal.remove();
            this.showMembersPanel(groupId, 'bots');
          }
        }
      });
    });
    
    modal.querySelectorAll(".role-select").forEach(select => {
      select.addEventListener("change", async (e) => {
        const el = e.target as HTMLSelectElement;
        const userId = el.dataset.userId;
        const newRole = el.value;
        await this.setMemberRole(groupId, userId!, newRole);
      });
    });
    
    modal.querySelectorAll(".kick-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const userId = (e.currentTarget as HTMLElement).dataset.userId;
        if (confirm("Kick this member from the group?")) {
          await this.kickMember(groupId, userId!);
          modal.remove();
          this.showMembersPanel(groupId);
        }
      });
    });
    
    modal.querySelectorAll(".ban-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const userId = (e.currentTarget as HTMLElement).dataset.userId;
        if (confirm("Ban this member? They won't be able to rejoin.")) {
          await this.banMember(groupId, userId!);
          modal.remove();
          this.showMembersPanel(groupId);
        }
      });
    });
    
    modal.querySelectorAll(".unban-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const userId = (e.currentTarget as HTMLElement).dataset.userId;
        await this.unbanMember(groupId, userId!);
        modal.remove();
        this.showMembersPanel(groupId);
      });
    });
  }

  private async setMemberRole(groupId: string, userId: string, role: string): Promise<void> {
    const res = await fetch(`/api/groups/${groupId}/roles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Hash": this.appState.hash || ""
      },
      body: JSON.stringify({ user_id: userId, role })
    });
    
    if (!res.ok) {
      const err = await res.json();
      showEpicModal(err.detail || "Failed to update role", "error");
    }
  }

  private async kickMember(groupId: string, userId: string): Promise<void> {
    const res = await fetch(`/api/groups/${groupId}/kick`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Hash": this.appState.hash || ""
      },
      body: JSON.stringify({ user_id: userId })
    });
    
    if (!res.ok) {
      const err = await res.json();
      showEpicModal(err.detail || "Failed to kick member", "error");
    }
  }

  private async banMember(groupId: string, userId: string): Promise<void> {
    const res = await fetch(`/api/groups/${groupId}/ban`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Hash": this.appState.hash || ""
      },
      body: JSON.stringify({ user_id: userId })
    });
    
    if (!res.ok) {
      const err = await res.json();
      showEpicModal(err.detail || "Failed to ban member", "error");
    }
  }

  private async unbanMember(groupId: string, userId: string): Promise<void> {
    const res = await fetch(`/api/groups/${groupId}/unban`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Hash": this.appState.hash || ""
      },
      body: JSON.stringify({ user_id: userId })
    });
    
    if (!res.ok) {
      const err = await res.json();
      showEpicModal(err.detail || "Failed to unban member", "error");
    }
  }

  private parseTimestamp(timestamp: string): Date {
    if (!timestamp) return new Date();
    try {
      let ts = timestamp;
      if (!ts.endsWith('Z') && !ts.includes('+') && ts.indexOf('-', 10) === -1) {
        ts += 'Z';
      }
      const date = new Date(ts);
      if (isNaN(date.getTime())) return new Date();
      return date;
    } catch {
      return new Date();
    }
  }

  private formatTime(timestamp: string): string {
    const date = this.parseTimestamp(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  }

  private formatTimeLocal(timestamp: string): string {
    const date = this.parseTimestamp(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private formatDateTimeLocal(timestamp: string): string {
    const date = this.parseTimestamp(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (isToday) return time;
    if (isYesterday) return `Yesterday ${time}`;
    return `${date.toLocaleDateString()} ${time}`;
  }

  private renderGroupDetail(g: any): string {
    return `
      <div class="panel-header border-b border-zinc-800">
        <div class="flex items-center gap-3">
          ${g.avatar ? `
            <img src="${g.avatar}" alt="${g.name}" class="w-10 h-10 rounded-lg object-cover" />
          ` : `
            <div class="w-10 h-10 rounded-lg ${g.status === 'pending' ? 'bg-amber-500/20' : 'bg-emerald-500/20'} flex items-center justify-center">
              <span class="text-lg font-bold ${g.status === 'pending' ? 'text-amber-400' : 'text-emerald-400'}">${g.name.charAt(0).toUpperCase()}</span>
            </div>
          `}
          <div>
            <h2 class="font-semibold text-zinc-100">${this.escapeHtml(g.name)}</h2>
            <p class="text-xs text-zinc-500">${g.status === 'pending' ? 'Awaiting Approval' : `${g.member_count || 0} members`}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          ${g.status === 'pending' ? `
            <span class="text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-1.5">In Moderation</span>
          ` : g.is_member ? `
            <button id="open-group-chat-btn" class="btn btn-primary text-xs py-1.5 px-3" data-group-id="${g.id}">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              Open Chat
            </button>
          ` : `
            <button id="join-group-detail-btn" class="btn btn-primary text-xs py-1.5 px-3" data-group-id="${g.id}">Join Group</button>
          `}
        </div>
      </div>
      <div class="panel-body p-6 flex-1 overflow-y-auto">
        <div class="space-y-6">
          ${g.description ? `
            <div>
              <h3 class="text-sm font-medium text-zinc-400 mb-2">About</h3>
              <p class="text-zinc-300">${this.escapeHtml(g.description)}</p>
            </div>
          ` : ''}
          ${g.terms ? `
            <div>
              <h3 class="text-sm font-medium text-zinc-400 mb-2">Terms</h3>
              <p class="text-zinc-300 text-sm">${this.escapeHtml(g.terms)}</p>
            </div>
          ` : ''}
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-zinc-800/50 rounded-lg p-4">
              <p class="text-2xl font-bold text-emerald-400">${g.member_count || 0}</p>
              <p class="text-xs text-zinc-500">Members</p>
            </div>
            <div class="bg-zinc-800/50 rounded-lg p-4">
              <p class="text-2xl font-bold text-zinc-300">${g.slug || 'N/A'}</p>
              <p class="text-xs text-zinc-500">Slug</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private gifDrawerCleanup: (() => void) | null = null;

  private async openGifDrawer(context: 'post' | 'group' | 'dm', anchorEl: HTMLElement, extraData?: any): Promise<void> {
    const existingDrawer = document.getElementById('gif-drawer-popup');
    if (existingDrawer) {
      existingDrawer.remove();
      if (this.gifDrawerCleanup) { this.gifDrawerCleanup(); this.gifDrawerCleanup = null; }
      return;
    }

    const drawer = document.createElement('div');
    drawer.id = 'gif-drawer-popup';
    drawer.style.cssText = `
      position: fixed; z-index: 9999; width: 460px; bottom: 60px; top: 60px;
      background: #18181b; border: 1px solid #3f3f46; border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6); display: flex; flex-direction: column;
      overflow: hidden; animation: gifDrawerIn 0.2s ease-out;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes gifDrawerIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      #gif-drawer-popup .gif-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 6px; align-content: start; }
      #gif-drawer-popup .gif-item { cursor: pointer; border-radius: 8px; overflow: hidden; position: relative; background: #27272a; }
      #gif-drawer-popup .gif-item:hover { outline: 2px solid #10b981; }
      #gif-drawer-popup .gif-item img { width: 100%; height: auto; display: block; }
      #gif-drawer-popup .gif-search { background: #27272a; border: 1px solid #3f3f46; color: #fafafa; padding: 8px 12px; border-radius: 8px; width: 100%; font-size: 13px; outline: none; }
      #gif-drawer-popup .gif-search:focus { border-color: #10b981; }
      #gif-drawer-popup .gif-search::placeholder { color: #71717a; }
      #gif-drawer-popup .gif-loading { display: flex; align-items: center; justify-content: center; padding: 32px; color: #71717a; font-size: 13px; }
    `;
    drawer.appendChild(style);

    drawer.innerHTML += `
      <div style="padding: 10px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #3f3f46; flex-shrink: 0;">
        <input type="text" class="gif-search" placeholder="Search GIFs..." id="gif-search-input" style="flex:1;">
        <button id="gif-close-btn" style="background: none; border: none; color: #a1a1aa; cursor: pointer; font-size: 20px; line-height: 1; padding: 4px 8px; border-radius: 6px; flex-shrink: 0;">&times;</button>
      </div>
      <div id="gif-scroll-wrap" style="flex: 1; overflow-y: auto; min-height: 0;">
        <div class="gif-grid" id="gif-grid">
          <div class="gif-loading" style="grid-column: 1/-1;">Loading trending GIFs...</div>
        </div>
      </div>
      <div style="padding: 6px 10px; text-align: center; border-top: 1px solid #3f3f46; flex-shrink: 0;">
        <span style="color: #52525b; font-size: 11px;">Powered by <span style="color: #10b981; font-weight: 600;">KLIPY</span></span>
      </div>
    `;

    document.body.appendChild(drawer);

    const rect = anchorEl.getBoundingClientRect();
    let left = rect.left;
    if (left + 460 > window.innerWidth) left = window.innerWidth - 468;
    if (left < 8) left = 8;
    drawer.style.left = left + 'px';

    const grid = document.getElementById('gif-grid')!;
    const searchInput = document.getElementById('gif-search-input') as HTMLInputElement;
    let debounceTimer: any = null;
    let allGifs: any[] = [];
    let displayedCount = 0;
    let currentQuery = '';
    let currentPage = 1;
    let loadingMore = false;
    let hasMore = true;
    const PAGE_SIZE = 8;

    const renderGifs = (gifs: any[], append = false) => {
      if (!append) grid.innerHTML = '';
      gifs.forEach((gif: any) => {
        const item = document.createElement('div');
        item.className = 'gif-item';
        item.title = this.escapeHtml(gif.title || '');
        const img = document.createElement('img');
        img.src = gif.preview_url || gif.url;
        img.alt = this.escapeHtml(gif.title || 'GIF');
        img.loading = 'lazy';
        item.appendChild(img);
        item.addEventListener('click', () => {
          this.handleGifSelect(context, gif.url, extraData);
          closeDrawer();
        });
        grid.appendChild(item);
      });
    };

    const loadMore = () => {
      if (loadingMore) return;
      const next = allGifs.slice(displayedCount, displayedCount + PAGE_SIZE);
      if (next.length > 0) {
        renderGifs(next, true);
        displayedCount += next.length;
      }
      if (displayedCount >= allGifs.length && hasMore) {
        loadingMore = true;
        currentPage++;
        fetchFromApi(currentQuery, currentPage, true);
      }
    };

    const fetchFromApi = async (query: string, page: number, append = false) => {
      if (!append) {
        grid.innerHTML = '<div class="gif-loading" style="grid-column: 1/-1;">Searching...</div>';
      }
      try {
        const params = new URLSearchParams({ q: query, page: String(page) });
        const res = await fetch(`/api/gifs?${params.toString()}`, {
          headers: { 'X-Auth-Hash': this.appState.hash || '' }
        });
        if (!res.ok) throw new Error('Failed');
        const gifs = await res.json();
        if (!gifs.length && !append) {
          grid.innerHTML = '<div class="gif-loading" style="grid-column: 1/-1;">No GIFs found</div>';
          hasMore = false;
          return;
        }
        if (gifs.length === 0) {
          hasMore = false;
          loadingMore = false;
          return;
        }
        if (append) {
          allGifs = allGifs.concat(gifs);
        } else {
          allGifs = gifs;
          displayedCount = 0;
        }
        hasMore = gifs.length >= 10;
        loadingMore = false;
        const batch = allGifs.slice(displayedCount, displayedCount + PAGE_SIZE);
        renderGifs(batch, append);
        displayedCount += batch.length;
      } catch {
        if (!append) grid.innerHTML = '<div class="gif-loading" style="grid-column: 1/-1;">Failed to load GIFs</div>';
        loadingMore = false;
      }
    };

    const scrollWrap = document.getElementById('gif-scroll-wrap')!;
    scrollWrap.addEventListener('scroll', () => {
      if (scrollWrap.scrollTop + scrollWrap.clientHeight >= scrollWrap.scrollHeight - 50) {
        loadMore();
      }
    });

    const fetchGifs = (query: string) => {
      currentQuery = query;
      currentPage = 1;
      allGifs = [];
      displayedCount = 0;
      hasMore = true;
      loadingMore = false;
      fetchFromApi(query, 1, false);
    };

    searchInput.addEventListener('input', () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchGifs(searchInput.value.trim()), 300);
    });

    const closeDrawer = () => {
      const el = document.getElementById('gif-drawer-popup');
      if (el) el.remove();
      if (this.gifDrawerCleanup) { this.gifDrawerCleanup(); this.gifDrawerCleanup = null; }
    };

    document.getElementById('gif-close-btn')!.addEventListener('click', (e) => {
      e.stopPropagation();
      closeDrawer();
    });

    const outsideClickHandler = (e: MouseEvent) => {
      if (!drawer.contains(e.target as Node) && e.target !== anchorEl) closeDrawer();
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer(); };

    setTimeout(() => document.addEventListener('click', outsideClickHandler), 10);
    document.addEventListener('keydown', escHandler);

    this.gifDrawerCleanup = () => {
      document.removeEventListener('click', outsideClickHandler);
      document.removeEventListener('keydown', escHandler);
      if (debounceTimer) clearTimeout(debounceTimer);
    };

    fetchGifs('');
    searchInput.focus();
  }

  private handleGifSelect(context: 'post' | 'group' | 'dm', hdUrl: string, extraData?: any): void {
    if (context === 'post') {
      this.pendingImageUrl = hdUrl;
      const preview = document.getElementById('image-preview') as HTMLImageElement;
      const container = document.getElementById('image-preview-container');
      if (preview && container) {
        preview.src = hdUrl;
        container.classList.remove('hidden');
      }
    } else if (context === 'group') {
      this.pendingChatImageUrl = hdUrl;
      const preview = document.getElementById('chat-preview-img') as HTMLImageElement;
      const container = document.getElementById('chat-image-preview');
      if (preview && container) {
        preview.src = hdUrl;
        container.classList.remove('hidden');
      }
    } else if (context === 'dm') {
      if (extraData?.setPendingImage) {
        extraData.setPendingImage(hdUrl);
      }
      const preview = document.getElementById('dm-image-preview-img') as HTMLImageElement;
      const container = document.getElementById('dm-image-preview');
      if (preview && container) {
        preview.src = hdUrl;
        container.classList.remove('hidden');
      }
    }
  }

  private async loadUserEcosystems(): Promise<void> {
    const res = await fetch("/api/ecosystems", {
      headers: { "X-Auth-Hash": this.appState.hash || "" }
    });
    this.userEcosystems = res.ok ? await res.json() : [];
    let persisted: string | null = null;
    try { persisted = localStorage.getItem(ACTIVE_ECOSYSTEM_KEY); } catch { /* private mode */ }
    if (this.userEcosystems.length > 0) {
      if (!this.activeEcosystem) {
        // Deterministic landing: persisted choice → freshest aias_v1 twin →
        // first. Never the unordered-SMEMBERS lottery that landed on DevOne.
        this.activeEcosystem = pickLandingEcosystem(this.userEcosystems, persisted);
      } else if (!persisted && this.activeEcosystem.origin !== "aias_v1") {
        // Late bridge sync: the twin appeared after login. Upgrade the
        // default landing — but never override an explicit user choice.
        const pick = pickLandingEcosystem(this.userEcosystems, null);
        if (pick && pick.origin === "aias_v1" && pick.id !== this.activeEcosystem.id) {
          this.activeEcosystem = pick;
        }
      }
    }
    if (this.activeEcosystem) {
      this.applyEcosystemColors(this.activeEcosystem);
    }
    this.renderEcosystemSwitcher();
    this.updateAdminNavVisibility();
  }

  private updateAdminNavVisibility(): void {
    const user = this.appState.user;
    if (!user) return;
    const adminNav = document.getElementById("nav-admin");
    if (!adminNav) return;
    const isSuper = user.is_admin || user.is_superadmin;
    const isEcoAdmin = this.activeEcosystem && this.userEcosystems.find(
      (e: any) => e.id === this.activeEcosystem?.id && e.user_role === "admin"
    );
    if (isSuper || isEcoAdmin) {
      adminNav.classList.remove("hidden");
    } else {
      adminNav.classList.add("hidden");
    }
  }

  private renderEcosystemSwitcher(): void {
    const container = document.getElementById("ecosystem-list");
    const switcher = document.getElementById("ecosystem-switcher");
    if (!container || !switcher) return;

    switcher.classList.remove("hidden");

    container.innerHTML = this.userEcosystems.map((eco: any) => `
      <button class="eco-switch-btn sidebar-btn ${this.activeEcosystem?.id === eco.id ? 'active' : ''}"
              data-eco-id="${eco.id}" title="${this.escapeHtml(eco.name)}">
        ${eco.icon ? `<img src="${eco.icon}" class="w-5 h-5 rounded flex-shrink-0" alt="">` :
          `<div class="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
               style="background-color: ${eco.accent_color || '#10b981'}">${eco.name.charAt(0).toUpperCase()}</div>`}
        <span class="sidebar-label truncate">${this.escapeHtml(eco.name)}</span>
      </button>
    `).join("");

    container.querySelectorAll(".eco-switch-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const ecoId = (btn as HTMLElement).dataset.ecoId;
        const eco = this.userEcosystems.find((e: any) => e.id === ecoId);
        if (eco) this.switchEcosystem(eco);
      });
    });

    document.getElementById("eco-explore-btn")?.addEventListener("click", () => this.showEcosystemExplore());

    if ((window as any).lucide) (window as any).lucide.createIcons();
  }

  private switchEcosystem(eco: any): void {
    this.activeEcosystem = eco;
    // The switcher is an explicit choice — persist it so landings honor it.
    try { localStorage.setItem(ACTIVE_ECOSYSTEM_KEY, String(eco?.id || "")); } catch { /* private mode */ }
    this.applyEcosystemColors(eco);
    this.renderEcosystemSwitcher();
    this.updateAdminNavVisibility();
    this.showGroups();
  }

  private applyEcosystemColors(eco: any): void {
    if (!eco) return;
    const accent = eco.accent_color || '#10b981';
    const secondary = eco.secondary_color || '#6366f1';
    const root = document.documentElement;
    root.style.setProperty('--eco-accent', accent);
    root.style.setProperty('--eco-accent-rgb', this.hexToRgb(accent));
    root.style.setProperty('--eco-secondary', secondary);
    root.style.setProperty('--eco-secondary-rgb', this.hexToRgb(secondary));
  }

  private hexToRgb(hex: string): string {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return '16, 185, 129';
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }

  private showCreateEcosystem(): void {
    const accentColors = [
      { name: "Emerald", value: "#10b981" },
      { name: "Red", value: "#ef4444" },
      { name: "Blue", value: "#3b82f6" },
      { name: "Purple", value: "#8b5cf6" },
      { name: "Amber", value: "#f59e0b" },
      { name: "Cyan", value: "#06b6d4" },
      { name: "Pink", value: "#ec4899" }
    ];

    this.setContent(`
      <div class="h-full w-full flex flex-col">
        <div class="panel flex-1">
          <div class="panel-header">
            <div class="flex items-center gap-3">
              <button id="eco-back-btn" class="text-zinc-400 hover:text-zinc-100 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <span class="panel-title">Create Ecosystem</span>
            </div>
          </div>
          <div class="panel-body p-4">
            <form id="create-eco-form" class="max-w-lg mx-auto space-y-4">
              <div>
                <label class="text-xs text-zinc-400 mb-1 block">Name</label>
                <input type="text" name="name" required maxlength="50" placeholder="My Ecosystem" class="input text-sm w-full">
              </div>
              <div>
                <label class="text-xs text-zinc-400 mb-1 block">Slug</label>
                <input type="text" name="slug" required maxlength="30" placeholder="my-ecosystem" class="input text-sm w-full" pattern="[a-z0-9\\-]+">
                <p class="text-[10px] text-zinc-600 mt-1">Lowercase letters, numbers, and hyphens only</p>
              </div>
              <div>
                <label class="text-xs text-zinc-400 mb-1 block">Description</label>
                <textarea name="description" rows="3" maxlength="500" placeholder="What is this ecosystem about?" class="input text-sm w-full resize-none"></textarea>
              </div>
              <div>
                <label class="text-xs text-zinc-400 mb-2 block">Accent Color</label>
                <div class="flex gap-2 flex-wrap" id="color-picker">
                  ${accentColors.map((c, i) => `
                    <button type="button" class="color-swatch w-8 h-8 rounded-lg border-2 transition-all ${i === 0 ? 'border-white scale-110' : 'border-transparent hover:border-zinc-500'}" 
                            data-color="${c.value}" style="background-color: ${c.value}" title="${c.name}"></button>
                  `).join("")}
                </div>
                <input type="hidden" name="accent_color" value="${accentColors[0].value}">
              </div>
              <div>
                <label class="text-xs text-zinc-400 mb-2 block">Icon</label>
                <div class="flex items-center gap-4">
                  <div id="eco-icon-preview" class="w-16 h-16 rounded-xl bg-zinc-800 border-2 border-dashed border-zinc-600 hover:border-emerald-500 flex items-center justify-center cursor-pointer transition-all overflow-hidden flex-shrink-0" title="Click to upload icon">
                    <div class="text-center">
                      <i data-lucide="image-plus" class="w-5 h-5 text-zinc-500 mx-auto"></i>
                      <p class="text-[9px] text-zinc-600 mt-0.5">Upload</p>
                    </div>
                  </div>
                  <div class="flex-1">
                    <p class="text-[11px] text-zinc-500">Click to upload an icon for your ecosystem. Square images work best.</p>
                    <p id="eco-icon-status" class="text-[11px] text-emerald-400 mt-1 hidden"></p>
                  </div>
                </div>
                <input type="file" id="eco-icon-input" accept="image/jpeg,image/png,image/gif,image/webp" class="hidden">
                <input type="hidden" name="icon" id="eco-icon-url" value="">
              </div>
              <div id="eco-create-error" class="text-red-400 text-xs hidden"></div>
              <button type="submit" class="btn btn-primary w-full py-2.5">Create Ecosystem</button>
            </form>
          </div>
        </div>
      </div>
    `);

    document.getElementById("eco-back-btn")?.addEventListener("click", () => this.showExplore());

    const nameInput = document.querySelector('#create-eco-form input[name="name"]') as HTMLInputElement;
    const slugInput = document.querySelector('#create-eco-form input[name="slug"]') as HTMLInputElement;
    if (nameInput && slugInput) {
      nameInput.addEventListener("input", () => {
        if (!slugInput.dataset.manual) {
          slugInput.value = nameInput.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        }
      });
      slugInput.addEventListener("input", () => { slugInput.dataset.manual = "1"; });
    }

    document.querySelectorAll(".color-swatch").forEach(swatch => {
      swatch.addEventListener("click", () => {
        document.querySelectorAll(".color-swatch").forEach(s => {
          s.classList.remove("border-white", "scale-110");
          s.classList.add("border-transparent");
        });
        swatch.classList.add("border-white", "scale-110");
        swatch.classList.remove("border-transparent");
        const colorInput = document.querySelector('#create-eco-form input[name="accent_color"]') as HTMLInputElement;
        if (colorInput) colorInput.value = (swatch as HTMLElement).dataset.color || "";
      });
    });

    document.getElementById("eco-icon-preview")?.addEventListener("click", () => {
      document.getElementById("eco-icon-input")?.click();
    });

    document.getElementById("eco-icon-input")?.addEventListener("change", async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const preview = document.getElementById("eco-icon-preview");
      const statusEl = document.getElementById("eco-icon-status");
      if (preview) {
        preview.innerHTML = '<div class="animate-pulse w-full h-full bg-zinc-700 rounded-xl"></div>';
      }

      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload/image", {
          method: "POST",
          headers: { "X-Auth-Hash": this.appState.hash || "" },
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          (document.getElementById("eco-icon-url") as HTMLInputElement).value = data.url;
          if (preview) {
            preview.innerHTML = `<img src="${data.url}" class="w-full h-full object-cover">`;
            preview.classList.remove("border-dashed", "border-zinc-600");
            preview.classList.add("border-solid", "border-emerald-500");
          }
          if (statusEl) {
            statusEl.textContent = "Icon uploaded";
            statusEl.classList.remove("hidden");
          }
        } else {
          if (preview) {
            preview.innerHTML = `<div class="text-center"><i data-lucide="image-plus" class="w-5 h-5 text-red-400 mx-auto"></i><p class="text-[9px] text-red-400 mt-0.5">Failed</p></div>`;
            if ((window as any).lucide) (window as any).lucide.createIcons();
          }
          showToast("Failed to upload icon", "error");
        }
      } catch {
        showToast("Failed to upload icon", "error");
      }
    });

    document.getElementById("create-eco-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      const errorEl = document.getElementById("eco-create-error")!;
      errorEl.classList.add("hidden");

      try {
        const res = await fetch("/api/ecosystems", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Auth-Hash": this.appState.hash || ""
          },
          body: JSON.stringify({
            name: formData.get("name"),
            slug: formData.get("slug"),
            description: formData.get("description"),
            accent_color: formData.get("accent_color"),
            icon: formData.get("icon") || ""
          })
        });

        if (res.ok) {
          const newEco = await res.json();
          await this.loadUserEcosystems();
          if (newEco.id) {
            const eco = this.userEcosystems.find((e: any) => e.id === newEco.id);
            if (eco) this.switchEcosystem(eco);
            else this.showExplore();
          } else {
            this.showExplore();
          }
          showToast("Ecosystem created!", "success");
        } else {
          const data = await res.json().catch(() => ({ detail: "Failed to create ecosystem" }));
          errorEl.textContent = data.detail || "Failed to create ecosystem";
          errorEl.classList.remove("hidden");
        }
      } catch {
        errorEl.textContent = "Failed to create ecosystem";
        errorEl.classList.remove("hidden");
      }
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  private parseMarkdown(content: string): string {
    return parseContent(content);
  }

  private parseMarkdownPreview(content: string): string {
    const html = parseContent(content);
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || content;
  }

  private isWithinEditWindow(createdAt: string): boolean {
    const elapsed = (Date.now() - new Date(createdAt).getTime()) / 1000;
    return elapsed <= 180;
  }

  private isWithinDeleteWindow(createdAt: string): boolean {
    const elapsed = (Date.now() - new Date(createdAt).getTime()) / 1000;
    return elapsed <= 60;
  }

  private getRemainingTime(createdAt: string, windowSeconds: number): string {
    const elapsed = (Date.now() - new Date(createdAt).getTime()) / 1000;
    const remaining = Math.max(0, windowSeconds - elapsed);
    if (remaining <= 0) return "expired";
    const mins = Math.floor(remaining / 60);
    const secs = Math.floor(remaining % 60);
    return mins > 0 ? `${mins}m ${secs}s left` : `${secs}s left`;
  }

  private async editPost(postId: string, currentContent: string): Promise<void> {
    const newContent = prompt("Edit your post:", currentContent);
    if (newContent === null || newContent.trim() === currentContent.trim()) return;
    
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Hash": this.appState.hash || ""
        },
        body: JSON.stringify({ content: newContent.trim() })
      });
      
      if (!res.ok) {
        const err = await res.json();
        showEpicModal(err.detail || "Failed to edit post", "error");
        return;
      }
      
      this.loadFeed();
    } catch (e) {
      console.error("Edit error:", e);
      showEpicModal("Failed to edit post", "error");
    }
  }

  private async deletePost(postId: string): Promise<void> {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        headers: { "X-Auth-Hash": this.appState.hash || "" }
      });
      
      if (!res.ok) {
        const err = await res.json();
        showEpicModal(err.detail || "Failed to delete post", "error");
        return;
      }
      
      const postCard = document.querySelector(`[data-post-id="${postId}"]`);
      if (postCard) {
        postCard.remove();
      }
    } catch (e) {
      console.error("Delete error:", e);
      showEpicModal("Failed to delete post", "error");
    }
  }

  private async openEmojiDrawer(targetType: 'post' | 'message' | 'dm', targetId: string, anchorEl: HTMLElement, groupId?: string): Promise<void> {
    if (this.emojiDrawer.visible && this.emojiDrawer.targetId === targetId && this.emojiDrawer.targetType === targetType) {
      this.closeEmojiDrawer();
      return;
    }
    this.closeEmojiDrawer();
    this.emojiDrawer.visible = true;
    this.emojiDrawer.targetType = targetType;
    this.emojiDrawer.targetId = targetId;
    this.emojiDrawer.groupId = groupId;
    this.emojiDrawer.pack = 'twemoji';
    this.emojiDrawer.category = '';
    this.emojiDrawer.search = '';
    this.emojiDrawer.page = 0;
    this.emojiDrawer.emoji = [];
    this.emojiDrawer.hasMore = true;

    const drawer = document.createElement('div');
    drawer.id = 'emoji-drawer';
    drawer.style.cssText = 'position:absolute;z-index:9999;width:300px;background:#18181b;border:1px solid #3f3f46;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5);padding:8px;';
    this.emojiDrawer.element = drawer;

    const rect = anchorEl.getBoundingClientRect();
    document.body.appendChild(drawer);
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 250) {
      drawer.style.top = (rect.top + window.scrollY - 220) + 'px';
    } else {
      drawer.style.top = (rect.bottom + window.scrollY + 4) + 'px';
    }
    drawer.style.left = Math.max(4, Math.min(rect.left + window.scrollX - 100, window.innerWidth - 310)) + 'px';

    this.renderEmojiDrawer();
    await this.loadEmoji(true);

    this.emojiDrawerOutsideHandler = (e: MouseEvent) => {
      if (this.emojiDrawer.element && !this.emojiDrawer.element.contains(e.target as Node) && e.target !== anchorEl) {
        this.closeEmojiDrawer();
      }
    };
    setTimeout(() => {
      if (this.emojiDrawerOutsideHandler) document.addEventListener('click', this.emojiDrawerOutsideHandler);
    }, 10);

    this.emojiDrawerScrollHandler = () => {
      this.closeEmojiDrawer();
    };
    window.addEventListener('scroll', this.emojiDrawerScrollHandler, true);
  }

  private emojiDrawerOutsideHandler: ((e: MouseEvent) => void) | null = null;
  private emojiDrawerScrollHandler: (() => void) | null = null;

  private closeEmojiDrawer(): void {
    if (this.emojiDrawerOutsideHandler) {
      document.removeEventListener('click', this.emojiDrawerOutsideHandler);
      this.emojiDrawerOutsideHandler = null;
    }
    if (this.emojiDrawerScrollHandler) {
      window.removeEventListener('scroll', this.emojiDrawerScrollHandler, true);
      this.emojiDrawerScrollHandler = null;
    }
    if (this.emojiDrawer.element) {
      this.emojiDrawer.element.remove();
      this.emojiDrawer.element = null;
    }
    this.emojiDrawer.visible = false;
    this.emojiDrawer.emoji = [];
  }

  private async loadEmoji(reset?: boolean): Promise<void> {
    if (this.emojiDrawer.loading) return;
    if (!reset && !this.emojiDrawer.hasMore) return;
    this.emojiDrawer.loading = true;
    if (reset) {
      this.emojiDrawer.page = 0;
      this.emojiDrawer.emoji = [];
      this.emojiDrawer.hasMore = true;
    }
    try {
      const params = new URLSearchParams({
        pack: this.emojiDrawer.pack,
        page: String(this.emojiDrawer.page),
        per_page: '30'
      });
      if (this.emojiDrawer.category) params.set('category', this.emojiDrawer.category);
      if (this.emojiDrawer.search) params.set('search', this.emojiDrawer.search);
      const res = await fetch(`/api/emoji?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        this.emojiDrawer.emoji = reset ? data.emoji : [...this.emojiDrawer.emoji, ...data.emoji];
        this.emojiDrawer.hasMore = data.has_more;
        this.emojiDrawer.page = data.page + 1;
        this.renderEmojiDrawer();
      }
    } catch (e) {
      console.error('Failed to load emoji:', e);
    } finally {
      this.emojiDrawer.loading = false;
    }
  }

  private renderEmojiDrawer(): void {
    const el = this.emojiDrawer.element;
    if (!el) return;
    const packs = ['twemoji', 'openmoji', 'noto'];
    const categories = ['smileys','people','animals','food','travel','activities','objects','symbols','flags','hands','hearts','other'];
    const packTabs = packs.map(p => `<button class="ed-pack-tab" data-pack="${p}" style="padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;border:none;cursor:pointer;background:${this.emojiDrawer.pack===p?'#10b981':'#27272a'};color:${this.emojiDrawer.pack===p?'#fff':'#a1a1aa'};transition:all 0.15s;">${p.charAt(0).toUpperCase()+p.slice(1)}</button>`).join('');
    const catPills = `<button class="ed-cat-pill" data-cat="" style="padding:2px 6px;border-radius:8px;font-size:10px;border:none;cursor:pointer;white-space:nowrap;background:${!this.emojiDrawer.category?'#10b981':'#27272a'};color:${!this.emojiDrawer.category?'#fff':'#a1a1aa'};">All</button>` + categories.map(c => `<button class="ed-cat-pill" data-cat="${c}" style="padding:2px 6px;border-radius:8px;font-size:10px;border:none;cursor:pointer;white-space:nowrap;background:${this.emojiDrawer.category===c?'#10b981':'#27272a'};color:${this.emojiDrawer.category===c?'#fff':'#a1a1aa'};">${c}</button>`).join('');
    const emojiGrid = this.emojiDrawer.emoji.map(em => {
      const safeC = this.escapeHtml(em.c || '');
      const safePack = this.escapeHtml(em.pack || this.emojiDrawer.pack);
      const safeF = this.escapeHtml(em.f || '');
      const safeTitle = this.escapeHtml(em.e || em.c || '');
      return `<button class="ed-emoji-btn" data-codepoint="${safeC}" data-pack="${safePack}" style="width:28px;height:28px;padding:0;border:none;background:transparent;cursor:pointer;border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0;" title="${safeTitle}"><img src="/static/emoji/${safePack}/${safeF}" width="24" height="24" loading="lazy" style="pointer-events:none;"></button>`;
    }).join('');

    el.innerHTML = `
      <div style="display:flex;gap:4px;margin-bottom:6px;">${packTabs}</div>
      <input class="ed-search" type="text" placeholder="Search emoji..." value="${this.emojiDrawer.search}" style="width:100%;padding:4px 8px;border-radius:6px;border:1px solid #3f3f46;background:#27272a;color:#fafafa;font-size:12px;outline:none;margin-bottom:6px;box-sizing:border-box;">
      <div style="display:flex;gap:3px;overflow-x:auto;padding-bottom:4px;margin-bottom:6px;" class="custom-scrollbar">${catPills}</div>
      <div class="ed-grid" style="display:grid;grid-template-rows:repeat(5,28px);grid-auto-flow:column;grid-auto-columns:28px;gap:2px;overflow-x:auto;overflow-y:hidden;max-height:152px;padding:2px;" class="custom-scrollbar">${emojiGrid}${this.emojiDrawer.loading ? '<div style="display:flex;align-items:center;justify-content:center;width:60px;grid-row:1/-1;color:#71717a;font-size:11px;">...</div>' : ''}</div>
    `;

    el.querySelectorAll('.ed-pack-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.emojiDrawer.pack = (e.currentTarget as HTMLElement).dataset.pack || 'twemoji';
        this.loadEmoji(true);
      });
    });

    el.querySelectorAll('.ed-cat-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.emojiDrawer.category = (e.currentTarget as HTMLElement).dataset.cat || '';
        this.loadEmoji(true);
      });
    });

    const searchInput = el.querySelector('.ed-search') as HTMLInputElement;
    if (searchInput) {
      let debounce: any;
      searchInput.addEventListener('input', (e) => {
        e.stopPropagation();
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          this.emojiDrawer.search = searchInput.value;
          this.loadEmoji(true);
        }, 300);
      });
      searchInput.addEventListener('click', (e) => e.stopPropagation());
    }

    el.querySelectorAll('.ed-emoji-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const el2 = e.currentTarget as HTMLElement;
        const codepoint = el2.dataset.codepoint || '';
        const pack = el2.dataset.pack || this.emojiDrawer.pack;
        this.toggleReaction(this.emojiDrawer.targetType as any, this.emojiDrawer.targetId, pack, codepoint, this.emojiDrawer.groupId);
        this.closeEmojiDrawer();
      });
    });

    const grid = el.querySelector('.ed-grid');
    if (grid) {
      grid.addEventListener('scroll', () => {
        if (this.emojiDrawer.hasMore && !this.emojiDrawer.loading) {
          const g = grid as HTMLElement;
          if (g.scrollLeft + g.clientWidth >= g.scrollWidth - 50) {
            this.loadEmoji();
          }
        }
      });
    }
  }

  private async toggleReaction(targetType: 'post' | 'message' | 'dm', targetId: string, pack: string, codepoint: string, groupId?: string): Promise<void> {
    try {
      let url: string;
      if (targetType === 'post') {
        url = `/api/posts/${targetId}/reactions`;
      } else if (targetType === 'dm') {
        url = `/api/dm/${groupId}/messages/${targetId}/reactions`;
      } else {
        url = `/api/groups/${groupId}/messages/${targetId}/reactions`;
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Hash': this.appState.hash || ''
        },
        body: JSON.stringify({ emoji: codepoint, pack })
      });
      if (res.ok) {
        const data = await res.json();
        if (targetType === 'post') {
          const container = document.querySelector(`.reactions-display[data-post-id="${targetId}"]`);
          if (container) this.renderReactionBadges(container as HTMLElement, data.reactions, 'post', targetId);
        } else if (targetType === 'dm') {
          const container = document.querySelector(`.dm-reactions-display[data-dm-msg-id="${targetId}"]`);
          if (container) this.renderReactionBadges(container as HTMLElement, data.reactions, 'dm', targetId, groupId);
        } else {
          const container = document.querySelector(`.msg-reactions-display[data-msg-id="${targetId}"]`);
          if (container) this.renderReactionBadges(container as HTMLElement, data.reactions, 'message', targetId, groupId);
        }
      }
    } catch (e) {
      console.error('Failed to toggle reaction:', e);
    }
  }

  private async loadReactions(targetType: 'post' | 'message' | 'dm', targetId: string, groupId?: string): Promise<void> {
    try {
      let url: string;
      if (targetType === 'post') {
        url = `/api/posts/${targetId}/reactions`;
      } else if (targetType === 'dm') {
        url = `/api/dm/${groupId}/messages/${targetId}/reactions`;
      } else {
        url = `/api/groups/${groupId}/messages/${targetId}/reactions`;
      }
      const res = await fetch(url, {
        headers: { 'X-Auth-Hash': this.appState.hash || '' }
      });
      if (res.ok) {
        const data = await res.json();
        let container: Element | null;
        if (targetType === 'post') {
          container = document.querySelector(`.reactions-display[data-post-id="${targetId}"]`);
        } else if (targetType === 'dm') {
          container = document.querySelector(`.dm-reactions-display[data-dm-msg-id="${targetId}"]`);
        } else {
          container = document.querySelector(`.msg-reactions-display[data-msg-id="${targetId}"]`);
        }
        if (container) this.renderReactionBadges(container as HTMLElement, data.reactions, targetType, targetId, groupId);
      }
    } catch (e) {
      // silently fail
    }
  }

  private renderReactionBadges(container: HTMLElement, reactions: any, targetType: 'post' | 'message' | 'dm', targetId: string, groupId?: string): void {
    if (!reactions || typeof reactions !== 'object') {
      container.innerHTML = '';
      return;
    }
    const userId = this.appState.user?.id || '';
    const badges: string[] = [];
    for (const [key, data] of Object.entries(reactions) as [string, any][]) {
      if (!data || !data.count || data.count <= 0) continue;
      const userReacted = data.users && Array.isArray(data.users) && data.users.includes(userId);
      const bg = userReacted ? 'rgba(16,185,129,0.1)' : 'rgba(63,63,70,0.3)';
      const border = userReacted ? '#10b981' : '#3f3f46';
      const safePack = this.escapeHtml(data.pack || 'twemoji');
      const safeFilename = this.escapeHtml(data.filename || data.f || '');
      const safeKey = this.escapeHtml(key);
      const safeTargetId = this.escapeHtml(targetId);
      const safeGroupId = groupId ? this.escapeHtml(groupId) : '';
      const imgUrl = safeFilename ? `/static/emoji/${safePack}/${safeFilename}` : '';
      const namesList = (data.user_names && Array.isArray(data.user_names)) ? data.user_names.map((n: string) => this.escapeHtml(n)).join(', ') : '';
      badges.push(`<button class="rxn-badge" data-codepoint="${safeKey}" data-pack="${safePack}" data-target-type="${targetType}" data-target-id="${safeTargetId}" data-user-names="${this.escapeHtml(namesList)}" ${safeGroupId ? `data-group-id="${safeGroupId}"` : ''} style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:999px;border:1px solid ${border};background:${bg};cursor:pointer;font-size:11px;color:#d4d4d8;transition:all 0.15s;line-height:1;">${imgUrl ? `<img src="${imgUrl}" width="16" height="16" style="pointer-events:none;">` : safeKey} <span>${data.count}</span></button>`);
    }
    container.innerHTML = badges.join('');
    container.querySelectorAll('.rxn-badge').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const el = e.currentTarget as HTMLElement;
        const names = el.dataset.userNames || '';
        document.querySelectorAll('.rxn-tooltip').forEach(t => t.remove());
        if (!names) return;
        const tooltip = document.createElement('div');
        tooltip.className = 'rxn-tooltip';
        tooltip.style.cssText = 'position:absolute;z-index:9999;background:#1c1c20;border:1px solid #3f3f46;border-radius:8px;padding:6px 10px;box-shadow:0 4px 16px rgba(0,0,0,0.5);font-size:12px;color:#d4d4d8;white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis;';
        tooltip.textContent = names;
        document.body.appendChild(tooltip);
        const rect = el.getBoundingClientRect();
        tooltip.style.top = (rect.top + window.scrollY - tooltip.offsetHeight - 6) + 'px';
        tooltip.style.left = Math.max(4, Math.min(rect.left + window.scrollX + rect.width / 2 - tooltip.offsetWidth / 2, window.innerWidth - tooltip.offsetWidth - 4)) + 'px';
        const closeTooltip = (ev: MouseEvent) => {
          if (!tooltip.contains(ev.target as Node)) {
            tooltip.remove();
            document.removeEventListener('click', closeTooltip);
          }
        };
        setTimeout(() => document.addEventListener('click', closeTooltip), 10);
      });
    });
  }

  private attachDMReactionListeners(convId: string): void {
    const container = document.getElementById('dm-messages');
    if (!container) return;

    container.querySelectorAll('.dm-msg-wrapper').forEach(wrapper => {
      if ((wrapper as any)._dmReactionBound) return;
      (wrapper as any)._dmReactionBound = true;
      wrapper.addEventListener('mouseenter', () => {
        const btn = wrapper.querySelector('.dm-reaction-btn') as HTMLElement;
        if (btn) btn.style.display = 'flex';
      });
      wrapper.addEventListener('mouseleave', () => {
        const btn = wrapper.querySelector('.dm-reaction-btn') as HTMLElement;
        if (btn) btn.style.display = 'none';
      });
    });

    container.querySelectorAll('.dm-reaction-btn').forEach(btn => {
      if ((btn as any)._dmReactionClickBound) return;
      (btn as any)._dmReactionClickBound = true;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const el = e.currentTarget as HTMLElement;
        const msgId = el.dataset.dmMsgId || '';
        if (msgId) this.openEmojiDrawer('dm', msgId, el, convId);
      });
    });

    container.querySelectorAll('.dm-reactions-display[data-dm-msg-id]').forEach(el => {
      if ((el as any)._dmReactionLoadBound) return;
      (el as any)._dmReactionLoadBound = true;
      const msgId = (el as HTMLElement).dataset.dmMsgId;
      if (msgId) this.loadReactions('dm', msgId, convId);
    });
  }

  private attachThreadBadgeListeners(): void {
    const container = document.getElementById('messages-container');
    if (!container) return;
    if ((container as any).__threadDelegationAttached) return;
    (container as any).__threadDelegationAttached = true;
    container.addEventListener('click', (e) => {
      const badge = (e.target as HTMLElement).closest('.thread-badge-btn') as HTMLElement;
      if (badge) {
        e.stopPropagation();
        const threadId = badge.dataset.threadRoot;
        if (threadId) this.openThreadView(threadId);
      }
    });
  }

  private attachMsgReactionListeners(): void {
    const container = document.getElementById('messages-container');
    if (!container) return;

    container.querySelectorAll('.chat-msg-wrapper').forEach(wrapper => {
      wrapper.addEventListener('mouseenter', () => {
        const btn = wrapper.querySelector('.msg-reaction-btn') as HTMLElement;
        if (btn) btn.style.display = 'flex';
      });
      wrapper.addEventListener('mouseleave', () => {
        const btn = wrapper.querySelector('.msg-reaction-btn') as HTMLElement;
        if (btn) btn.style.display = 'none';
      });
    });

    container.querySelectorAll('.msg-reaction-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const el = e.currentTarget as HTMLElement;
        const msgId = el.dataset.msgId || '';
        const gId = el.dataset.groupId || this.currentGroup?.id || '';
        if (msgId) this.openEmojiDrawer('message', msgId, el, gId);
      });
    });

    container.querySelectorAll('.msg-reactions-display[data-msg-id]').forEach(el => {
      const msgId = (el as HTMLElement).dataset.msgId;
      const gId = this.currentGroup?.id;
      if (msgId && gId) this.loadReactions('message', msgId, gId);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new DevNetwork();
});
