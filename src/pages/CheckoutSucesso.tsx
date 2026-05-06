import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import posthog from "posthog-js";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  "plus+": "Plus+",
  pro: "Pro",
};

export default function CheckoutSucesso() {
  const navigate = useNavigate();
  const { subscription, refreshSubscription } = useAuth();
  const [refreshing, setRefreshing] = useState(true);
  const capturedRef = useRef(false);

  useEffect(() => {
    // The Stripe webhook is the source of truth for plan changes. Refresh
    // immediately, then once more after a short delay to catch the case
    // where the webhook lands a beat after the redirect.
    let cancelled = false;

    (async () => {
      await refreshSubscription();
      if (cancelled) return;
      setRefreshing(false);
      setTimeout(() => {
        if (!cancelled) refreshSubscription();
      }, 2500);
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshSubscription]);

  useEffect(() => {
    if (!refreshing && !capturedRef.current) {
      capturedRef.current = true;
      posthog.capture("checkout_completed", { plan: subscription.plan });
    }
  }, [refreshing, subscription.plan]);

  const planLabel = PLAN_LABELS[subscription.plan] ?? subscription.plan;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Assinatura confirmada!
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Seu plano foi atualizado com sucesso. Todas as funcionalidades do seu novo plano já estão disponíveis.
          </p>
        </div>

        {refreshing ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Sincronizando plano...
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary font-semibold text-sm">
            Plano ativo: {planLabel}
          </div>
        )}

        <Button
          onClick={() => navigate("/dashboard")}
          className="gap-2"
          size="lg"
        >
          Ir para o Dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
