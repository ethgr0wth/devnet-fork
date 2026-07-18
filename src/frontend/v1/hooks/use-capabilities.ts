import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/queryClient";

interface User {
  id: string;
  email: string;
  display_name: string;
  plan: string;
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
  } | null;
  is_active: boolean;
  days_remaining: number | null;
  plan_code: string;
  status: string;
  message: string;
}

export interface Capabilities {
  user: User | null;
  subscription: SubscriptionInfo | null;
  isLoading: boolean;
  isPaidUser: boolean;
  canUsePremiumFeatures: boolean;
  planLabel: string;
  refresh: () => Promise<void>;
}

const PAID_PLANS = ["basic", "pro", "enterprise"];

export function useCapabilities(): Capabilities {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [userRes, subscriptionRes] = await Promise.all([
        apiFetch("/api/user/me"),
        apiFetch("/api/subscription/status")
      ]);

      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData.user);
      }

      if (subscriptionRes.ok) {
        const subData = await subscriptionRes.json();
        setSubscription(subData);
      }
    } catch (error) {
      console.error("Failed to load capabilities:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isPaidUser = user ? PAID_PLANS.includes(user.plan) : false;
  const canUsePremiumFeatures = isPaidUser || (subscription?.is_active ?? false);

  const planLabel = user?.plan === "free" 
    ? "Free" 
    : user?.plan === "basic" 
      ? "Basic" 
      : user?.plan === "pro" 
        ? "Pro" 
        : user?.plan === "enterprise" 
          ? "Enterprise" 
          : "Unknown";

  return {
    user,
    subscription,
    isLoading,
    isPaidUser,
    canUsePremiumFeatures,
    planLabel,
    refresh: loadData
  };
}
