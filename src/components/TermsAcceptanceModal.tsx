import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { termsOfUse, privacyPolicy } from "@/lib/legalContent";

export function TermsAcceptanceModal() {
  const { isAuthenticated, needsTermsAcceptance, acceptTerms, logout } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated || !needsTermsAcceptance) return null;

  const handleAccept = async () => {
    setLoading(true);
    try {
      await acceptTerms();
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    await logout();
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-2xl flex flex-col gap-0 p-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Termos de Uso e Política de Privacidade</DialogTitle>
          <DialogDescription>
            Para continuar usando o Lex.ai, leia e aceite os documentos abaixo.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="termos" className="flex flex-col min-h-0 px-6">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="termos">Termos de Uso</TabsTrigger>
            <TabsTrigger value="privacidade">Política de Privacidade</TabsTrigger>
          </TabsList>

          <TabsContent value="termos" className="mt-2">
            <div className="h-[50vh] overflow-y-auto rounded-md border bg-muted/30 p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {termsOfUse}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="privacidade" className="mt-2">
            <div className="h-[50vh] overflow-y-auto rounded-md border bg-muted/30 p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {privacyPolicy}
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col gap-4 px-6 py-5 border-t mt-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="accept-terms"
              checked={accepted}
              onCheckedChange={(v) => setAccepted(v === true)}
            />
            <label
              htmlFor="accept-terms"
              className="text-sm cursor-pointer leading-snug"
            >
              Li e aceito os Termos de Uso e a Política de Privacidade da Lex.ai
            </label>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={loading}
            >
              Não aceitar
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!accepted || loading}
            >
              {loading ? "Salvando..." : "Aceitar e continuar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
