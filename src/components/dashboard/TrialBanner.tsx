import { useNavigate } from "react-router-dom";
import { Clock, Zap, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrialStatus } from "@/hooks/useTrialStatus";

export function TrialBanner() {
  const navigate = useNavigate();
  const { isTrialActive, daysRemaining, trialExpired, isPaid } = useTrialStatus();

  // Paid users or no trial state — don't show
  if (isPaid) return null;
  if (!isTrialActive && !trialExpired) return null;

  if (trialExpired) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-5 py-4 flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-md bg-background/60">
            <Clock className="h-5 w-5 text-destructive" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-destructive">Seu período de avaliação expirou</p>
            <p className="text-xs text-destructive/80 mt-0.5">
              Faça upgrade para continuar usando todos os recursos premium.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="destructive"
          className="gap-1.5 shrink-0"
          onClick={() => navigate("/upgrade")}
        >
          <Zap className="h-3.5 w-3.5" />
          Fazer upgrade
        </Button>
      </div>
    );
  }

  const urgency = daysRemaining <= 2
    ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300"
    : "bg-primary/5 border-primary/20 text-foreground";

  return (
    <div className={`rounded-lg border px-5 py-4 flex items-center justify-between gap-4 mb-6 ${urgency}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-md bg-background/60">
          <PartyPopper className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            Free Trial — {daysRemaining} dia{daysRemaining !== 1 ? "s" : ""} restante{daysRemaining !== 1 ? "s" : ""}
          </p>
          <p className="text-xs opacity-80 mt-0.5">
            Todas as funcionalidades estão desbloqueadas. Faça upgrade para manter o acesso.
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="default"
        className="gap-1.5 shrink-0"
        onClick={() => navigate("/upgrade")}
      >
        <Zap className="h-3.5 w-3.5" />
        Fazer upgrade
      </Button>
    </div>
  );
}
