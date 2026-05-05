import { useAuth } from "@/contexts/AuthContext";

export function useTrialStatus() {
  const { subscription } = useAuth();

  // Paid users skip all trial logic
  const isPaid = ["starter", "plus+", "pro"].includes(subscription.plan);
  if (isPaid) {
    return { isTrialActive: false, daysRemaining: 0, trialExpired: false, isPaid: true };
  }

  const trialEnd = subscription.trial_ends_at;
  if (!trialEnd) {
    // No trial date set — treat as expired for safety
    return { isTrialActive: false, daysRemaining: 0, trialExpired: true, isPaid: false };
  }

  // Client-side approximation — server-side RLS enforces the actual trial boundary
  const end = new Date(trialEnd);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isTrialActive = daysRemaining > 0;

  return {
    isTrialActive,
    daysRemaining,
    trialExpired: !isTrialActive,
    isPaid: false,
  };
}
