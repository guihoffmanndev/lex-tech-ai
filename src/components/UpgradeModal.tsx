import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    name: "Free",
    key: "free",
    price: "Grátis",
    description: "Trial de 7 dias para explorar a plataforma",
    badge: "Experimente grátis",
    cta: "Começar Trial",
    highlighted: false,
    features: ["Lex AI", "Vault – 15 GB", "Workflows"],
  },
  {
    name: "Starter",
    key: "starter",
    price: "R$ 89,90",
    period: "/mês",
    description:
      "Plano de entrada ideal para advogados que desejam sair do operacional e começar a estruturar o escritório com tecnologia, sem comprometer o orçamento.",
    badge: "Mais popular",
    cta: "Assinar Starter",
    highlighted: true,
    features: ["Lex AI", "Vault – 15 GB", "Workflows"],
  },
  {
    name: "Plus+",
    key: "plus+",
    price: "R$ 159,90",
    period: "/mês",
    description:
      "Ideal para escritórios que estão crescendo e precisam de organização interna, delegação eficiente e controle operacional claro.",
    badge: "Para times",
    cta: "Assinar Plus+",
    highlighted: false,
    features: ["Lex AI", "Vault – 50 GB", "Workflows", "Financeiro", "Colaboradores"],
  },
  {
    name: "Pro",
    key: "pro",
    price: "R$ 299,90",
    period: "/mês",
    description:
      "O Lex Pro é o centro de comando do escritório moderno. Integra estratégia jurídica, gestão financeira e controle de equipe em um único ecossistema de alta performance.",
    badge: "Completo",
    cta: "Assinar Pro",
    highlighted: false,
    features: ["Lex AI", "Vault – 100 GB", "Workflows", "Financeiro", "Colaboradores", "Lex Pilot", "Lex Scanner"],
  },
];

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const { subscription, refreshSubscription } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSelectPlan = async (plan: Plan) => {
    if (plan.key === "free") return;
    if (subscription.plan === plan.key) {
      // Already on this plan — open customer portal
      try {
        setLoadingPlan(plan.key);
        const { data, error } = await supabase.functions.invoke("customer-portal");
        if (error) throw error;
        if (data?.url) window.open(data.url, "_blank");
      } catch {
        toast.error("Erro ao abrir portal de gerenciamento");
      } finally {
        setLoadingPlan(null);
      }
      return;
    }

    try {
      setLoadingPlan(plan.key);
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan: plan.key },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch {
      toast.error("Erro ao iniciar checkout");
    } finally {
      setLoadingPlan(null);
    }
  };

  const getCtaLabel = (plan: Plan) => {
    if (subscription.plan === plan.key) return "Seu plano atual";
    return plan.cta;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[960px] w-[95vw] max-h-[90vh] overflow-y-auto p-0">
        <div className="p-6 pb-2 text-center">
          <DialogHeader className="items-center">
            <DialogTitle className="text-2xl font-bold">Escolha seu plano</DialogTitle>
            <DialogDescription className="text-base">
              Comece gratuitamente e evolua conforme sua necessidade
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 pt-2 items-stretch">
          {plans.map((plan) => {
            const isCurrent = subscription.plan === plan.key;
            const isLoading = loadingPlan === plan.key;

            return (
              <div
                key={plan.name}
                className={cn(
                  "relative flex flex-col rounded-xl border p-5 transition-shadow",
                  isCurrent
                    ? "border-primary bg-primary/[0.03] shadow-md ring-2 ring-primary/20"
                    : plan.highlighted
                      ? "border-primary bg-primary/[0.03] shadow-md ring-2 ring-primary/20"
                      : "border-border bg-card hover:shadow-sm",
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

                <div className="mb-4 mt-1">
                  <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-0.5">
                    <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                    {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{plan.description}</p>
                </div>

                <ul className="flex-1 space-y-2 mb-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isCurrent ? "outline" : plan.highlighted ? "default" : "outline"}
                  className={cn("w-full", plan.highlighted && !isCurrent && "gap-1.5")}
                  disabled={plan.key === "free" || isLoading}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      {plan.highlighted && !isCurrent && <Sparkles className="h-3.5 w-3.5" />}
                      {getCtaLabel(plan)}
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
