import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Zap } from "lucide-react";
import { useTrialStatus } from "@/hooks/useTrialStatus";

const DISMISSED_KEY = "lex-trial-expired-dismissed";

export function TrialExpiredModal() {
  const navigate = useNavigate();
  const { trialExpired, isPaid } = useTrialStatus();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isPaid || !trialExpired) return;
    const dismissed = sessionStorage.getItem(DISMISSED_KEY);
    if (!dismissed) {
      setOpen(true);
    }
  }, [trialExpired, isPaid]);

  const handleClose = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setOpen(false);
  };

  const handleUpgrade = () => {
    handleClose();
    navigate("/upgrade");
  };

  if (isPaid || !trialExpired) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md text-center space-y-5 p-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Lock className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <DialogTitle className="text-xl font-bold text-foreground">Seu trial gratuito expirou</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Os 7 dias de avaliação terminaram. Faça upgrade agora para
            continuar usando todas as funcionalidades premium da plataforma.
          </DialogDescription>
        </div>
        <Button onClick={handleUpgrade} size="lg" className="gap-2 w-full">
          <Zap className="h-4 w-4" />
          Ver planos e fazer upgrade
        </Button>
        <button onClick={handleClose} className="text-xs text-muted-foreground hover:underline">
          Continuar com funcionalidades limitadas
        </button>
      </DialogContent>
    </Dialog>
  );
}
