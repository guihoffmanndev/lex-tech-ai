import { Lock, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanPermissions, type Feature } from "@/hooks/usePlanPermissions";
import { useTrialStatus } from "@/hooks/useTrialStatus";

interface PlanGateProps {
  feature: Feature;
  children: React.ReactNode;
}

export function PlanGate({ feature, children }: PlanGateProps) {
  const navigate = useNavigate();
  const { subscription } = useAuth();
  const { hasAccess, getRequiredPlan } = usePlanPermissions();
  const { isTrialActive, trialExpired, isPaid } = useTrialStatus();

  // Don't block while subscription data is still loading
  if (!subscription._loaded) return <>{children}</>;

  // Assistente IA requires a paid plan even during trial
  const trialGrantsAccess = isTrialActive && feature !== "assistente";

  // Active trial (non-AI), paid plan with access, or plan-based access → allow
  if (isPaid || trialGrantsAccess || hasAccess(feature)) return <>{children}</>;

  // Trial expired, trial but AI feature, or no access — show locked overlay
  const requiredPlan = getRequiredPlan(feature);
  const isExpiredTrial = trialExpired;
  const isTrialRestricted = isTrialActive && feature === "assistente";

  return (
    <div className="flex-1 flex items-center justify-center p-8 relative">
      {/* Blurred background hint */}
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <div className="w-full h-full bg-muted/30 backdrop-blur-sm" />
      </div>

      <div className="text-center max-w-md space-y-4 relative z-10">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Lock className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          {isExpiredTrial
            ? "Seu trial gratuito expirou"
            : isTrialRestricted
            ? "Assistente IA não incluso no trial"
            : "Funcionalidade bloqueada"}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isExpiredTrial
            ? "Os 7 dias de avaliação terminaram. Faça upgrade para continuar acessando este módulo."
            : isTrialRestricted
            ? (
              <>
                O Assistente IA está disponível a partir do plano{" "}
                <span className="font-semibold text-primary">Starter</span>.
                Assine um plano para desbloquear.
              </>
            )
            : (
              <>
                Este módulo está disponível a partir do plano{" "}
                <span className="font-semibold text-primary">{requiredPlan}</span>.
                Faça upgrade para desbloquear.
              </>
            )}
        </p>
        <Button
          onClick={() => navigate("/upgrade")}
          className="gap-2"
        >
          <ArrowUpCircle className="h-4 w-4" />
          Ver planos
        </Button>
      </div>
    </div>
  );
}
