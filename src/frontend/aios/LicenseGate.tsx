/**
 * LicenseGate — AiOS main license gate, transplanted from the v1 Dashboard
 * (aiassistsecure/aias @ march_2026, client/src/pages/Dashboard.tsx).
 *
 * The v1 Dashboard shows an inline activation banner whenever the caller has
 * no active license (or the subscription is in grace/expired). AiOS main in
 * devnet-fork had no equivalent — a federated user could roam the desktop with
 * no license surfaced. This gate ports that exact check + activation flow to
 * the AiOS shell so the gate lives on the main surface, cleanly.
 *
 * Behavior matches the v1 source:
 *   - GET /api/licenses/me        → { has_license, is_active, license }
 *   - GET /api/subscription/status → { status: active|grace|expired|… }
 *   - showInput = !has_license || inactive || sub needs renewal
 *   - POST /api/licenses/activate { license_key } → activate / renew / reactivate
 *
 * It is a NON-BLOCKING banner (like v1) — the desktop stays usable; the gate
 * just makes the missing license loud and actionable. Auth rides the same
 * session/cookie apiFetch uses everywhere else.
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, X, ExternalLink } from "lucide-react";
import { apiFetch } from "@/lib/queryClient";
import { friendlyError } from "@/lib/errorMessages";

interface LicenseInfo {
  license: {
    id: string;
    key?: string;
    plan?: string;
    plan_type?: string;
    plan_code?: string;
    status: string;
    expires_at?: string | null;
    valid_until?: string | null;
    seat_count?: number;
  } | null;
  has_license: boolean;
  is_active: boolean;
}

interface SubscriptionInfo {
  subscription: {
    id: string;
    user_id: string;
    plan_code: string;
    status: string;
    started_at: string | null;
    expires_at: string | null;
    cancelled_at: string | null;
    auto_renew: boolean;
    stripe_subscription_id?: string;
    license_id?: string | null;
  } | null;
  is_active: boolean;
  days_remaining: number | null;
  plan_code: string;
  status: string;
  message: string;
}

type GateState = "loading" | "ok" | "gate";

/**
 * Props:
 *  - onActivated: optional callback after a successful activation (e.g. to
 *    reload user/briefing data in the host shell).
 *  - pricingHref: where the "view pricing plans" link points. Defaults to the
 *    AiAS production pricing page (devnet has no pricing route of its own).
 *  - dismissible: if true, the user can close the banner for the session
 *    (stored in sessionStorage so it doesn't nag on every navigation). The v1
 *    Dashboard is non-dismissible; we default to false to match it.
 */
export function LicenseGate({
  onActivated,
  pricingHref = "https://aiassist.net/pricing",
  dismissible = false,
}: {
  onActivated?: () => void;
  pricingHref?: string;
  dismissible?: boolean;
}) {
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [licenseKey, setLicenseKey] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [licenseError, setLicenseError] = useState("");
  const [licenseSuccess, setLicenseSuccess] = useState("");
  const [gateState, setGateState] = useState<GateState>("loading");
  const [dismissed, setDismissed] = useState(false);

  const load = useCallback(async () => {
    try {
      const [licenseRes, subscriptionRes] = await Promise.all([
        apiFetch("/api/licenses/me"),
        apiFetch("/api/subscription/status"),
      ]);
      let li: LicenseInfo | null = null;
      let si: SubscriptionInfo | null = null;
      if (licenseRes.ok) li = await licenseRes.json();
      if (subscriptionRes.ok) si = await subscriptionRes.json();
      setLicenseInfo(li);
      setSubscriptionInfo(si);
      const subNeedsRenewal =
        si?.status === "grace" || si?.status === "expired";
      const licenseInactive = li?.has_license && !li?.is_active;
      const showInput =
        !li?.has_license || licenseInactive || subNeedsRenewal;
      setGateState(showInput ? "gate" : "ok");
    } catch {
      // Never hard-block the desktop on a license probe failure — v1 treats a
      // failed /api/licenses/me as "no data", not "locked out". Same here.
      setGateState("ok");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // v1 Dashboard is non-dismissible; honor that by default. When a host opts
  // into dismissible, persist the dismissal for the session so it doesn't
  // re-mount on every navigation.
  useEffect(() => {
    if (dismissible && sessionStorage.getItem("aios-license-gate-dismissed") === "1") {
      setDismissed(true);
    }
  }, [dismissible]);

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;
    setIsActivating(true);
    setLicenseError("");
    setLicenseSuccess("");
    try {
      const res = await apiFetch("/api/licenses/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ license_key: licenseKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to activate license");
      }
      setLicenseSuccess(data.message || "License activated.");
      setLicenseKey("");
      void load();
      onActivated?.();
    } catch (err: any) {
      setLicenseError(
        friendlyError(err, "License activation failed. Please check your key and try again."),
      );
    } finally {
      setIsActivating(false);
    }
  };

  if (gateState !== "gate" || dismissed) return null;

  const subNeedsRenewal =
    subscriptionInfo?.status === "grace" || subscriptionInfo?.status === "expired";
  const licenseInactive = licenseInfo?.has_license && !licenseInfo?.is_active;
  const warn = licenseInactive || subNeedsRenewal;

  const title = subscriptionInfo?.status === "grace"
    ? "Subscription in Grace Period"
    : subscriptionInfo?.status === "expired" || licenseInactive
      ? "License Expired"
      : "Get Started — Activate Your License";
  const subtitle = subscriptionInfo?.status === "grace"
    ? "Your subscription has expired and is in its grace period. Enter a new license key to extend your access."
    : subscriptionInfo?.status === "expired" || licenseInactive
      ? "Your previous license has expired. Enter a new license key to restore access."
      : "Enter your license key to unlock premium features, higher rate limits, and more AI models.";
  const cta = subscriptionInfo?.status === "grace"
    ? "Renew"
    : licenseInactive || subscriptionInfo?.status === "expired"
      ? "Reactivate"
      : "Activate";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className={`relative mx-3 mt-3 p-4 sm:p-5 rounded-xl border ${
          warn
            ? "bg-gradient-to-r from-amber-500/10 to-red-500/10 border-amber-500/20"
            : "bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border-violet-500/20"
        }`}
        data-testid="aios-license-gate"
      >
        {dismissible && (
          <button
            onClick={() => {
              setDismissed(true);
              sessionStorage.setItem("aios-license-gate-dismissed", "1");
            }}
            title="Dismiss for this session"
            className="absolute right-2 top-2 rounded p-1 text-white/40 hover:bg-white/10 hover:text-white/70"
            data-testid="aios-license-gate-dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
              warn ? "bg-amber-500/20" : "bg-violet-500/20"
            }`}
          >
            <Key className={`h-5 w-5 ${warn ? "text-amber-400" : "text-violet-400"}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 text-base font-bold sm:text-lg">
              <span className={warn ? "text-amber-400" : "text-white"}>
                {title}
              </span>
            </h3>
            <p className="mb-3 text-xs text-white/60 sm:text-sm">{subtitle}</p>

            {licenseError && (
              <div
                className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-400 sm:text-sm"
                data-testid="aios-license-gate-error"
              >
                {licenseError}
              </div>
            )}
            {licenseSuccess && (
              <div
                className="mb-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs text-emerald-400 sm:text-sm"
                data-testid="aios-license-gate-success"
              >
                {licenseSuccess}
              </div>
            )}

            <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && licenseKey.trim() && !isActivating) {
                    void handleActivate();
                  }
                }}
                placeholder="LIC-XXXX-XXXX-XXXX"
                data-testid="input-license-key-aios"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 font-mono uppercase text-sm focus:border-violet-500/50 focus:outline-none sm:px-4 sm:py-3"
              />
              <button
                onClick={handleActivate}
                disabled={!licenseKey.trim() || isActivating}
                data-testid="button-activate-license-aios"
                className={`flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-medium text-white transition-colors disabled:opacity-50 sm:px-6 sm:py-3 ${
                  warn
                    ? "bg-amber-500 hover:bg-amber-400"
                    : "bg-violet-500 hover:bg-violet-400"
                }`}
              >
                {isActivating ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  cta
                )}
              </button>
            </div>
            <p className="mt-2.5 text-xs text-white/40">
              Don't have a license key?{" "}
              <a
                href={pricingHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-violet-400 hover:underline"
              >
                View pricing plans <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
