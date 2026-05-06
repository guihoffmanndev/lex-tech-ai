import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Sparkles, Loader2, ArrowLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import posthog from "posthog-js";

interface Plan {
  name: string;
  key: string;
  price: string;
  period?: string;
  description: string;
  badge: string;
  cta: string;
  highlighted: boolean;
  features: string[];
}

const plans: Plan[] = [
  {
    name: "Starter",
    key: "starter",
    price: "R$ 89,90",
    period: "/mês",
    description: "Ideal para advogados que querem estruturar o escritório com tecnologia.",
    badge: "Mais popular",
    cta: "Assinar Starter",
    highlighted: true,
    features: ["Lex AI ilimitado", "Vault — 15 GB", "Workflows ilimitados"],
  },
  {
    name: "Plus+",
    key: "plus+",
    price: "R$ 159,90",
    period: "/mês",
    description: "Para escritórios em crescimento que precisam de organização e delegação.",
    badge: "Para times",
    cta: "Assinar Plus+",
    highlighted: false,
    features: ["Tudo do Starter", "Vault — 50 GB", "Financeiro", "Colaboradores", "Clientes", "Relatórios"],
  },
  {
    name: "Pro",
    key: "pro",
    price: "R$ 299,90",
    period: "/mês",
    description: "Centro de comando completo do escritório moderno.",
    badge: "Completo",
    cta: "Assinar Pro",
    highlighted: false,
    features: ["Tudo do Plus+", "Vault — 100 GB", "Lex Pilot", "Lex Scanner", "Suporte prioritário"],
  },
];

export default function Upgrade() {
  const navigate = useNavigate();
  const { subscription } = useAuth();
  const { trialExpired, daysRemaining, isTrialActive } = useTrialStatus();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    posthog.capture("upgrade_page_viewed", {
      current_plan: subscription.plan,
      trial_expired: trialExpired,
    });
  }, []);

  const handleSelectPlan = async (plan: Plan) => {
    if (subscription.plan === plan.key) {
      try {
        setLoadingPlan(plan.key);
        const { data, error } = await supabase.functions.invoke("customer-portal");
        if (error) throw error;
        if (data?.url) window.open(data.url, "_blank");
      } catch (err) {
        posthog.captureException(err, { flow: "customer_portal", plan: plan.key });
        toast.error("Erro ao abrir portal de gerenciamento");
      } finally {
        setLoadingPlan(null);
      }
      return;
    }
    try {
      setLoadingPlan(plan.key);
      posthog.capture("checkout_initiated", {
        plan: plan.key,
        plan_name: plan.name,
        plan_price: plan.price,
        current_plan: subscription.plan,
      });
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan: plan.key },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err) {
      posthog.captureException(err, { flow: "create_checkout", plan: plan.key });
      toast.error("Erro ao iniciar checkout");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Dashboard
        </button>

        <div className="text-center mb-10 space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            {trialExpired ? "Seu trial expirou — escolha um plano" : "Escolha o plano ideal"}
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {trialExpired
              ? "Para continuar acessando todas as funcionalidades, selecione um dos planos abaixo."
              : isTrialActive
                ? `Você ainda tem ${daysRemaining} dia${daysRemaining !== 1 ? "s" : ""} de trial. Faça upgrade a qualquer momento.`
                : "Desbloqueie todo o potencial do seu escritório."}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => {
            const isCurrent = subscription.plan === plan.key;
            const isLoading = loadingPlan === plan.key;
            return (
              <div
                key={plan.key}
                className={cn(
                  "relative flex flex-col rounded-xl border p-6 transition-shadow",
                  isCurrent
                    ? "border-primary bg-primary/[0.03] shadow-lg ring-2 ring-primary/20"
                    : plan.highlighted
                      ? "border-primary bg-primary/[0.03] shadow-lg ring-2 ring-primary/20"
                      : "border-border bg-card hover:shadow-md",
                )}
              >
                <Badge
                  className={cn(
                    "absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] px-2.5 whitespace-nowrap",
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : plan.highlighted
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {isCurrent ? "Seu plano" : plan.badge}
                </Badge>

                <div className="mb-5 mt-2">
                  <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-0.5">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{plan.description}</p>
                </div>

                <ul className="flex-1 space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.highlighted && !isCurrent ? "default" : "outline"}
                  className={cn("w-full", plan.highlighted && !isCurrent && "gap-1.5")}
                  disabled={isLoading}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      {plan.highlighted && !isCurrent && <Sparkles className="h-3.5 w-3.5" />}
                      {isCurrent ? "Gerenciar plano" : plan.cta}
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
