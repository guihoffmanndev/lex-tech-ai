import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function RecuperarSenha() {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const ok = await resetPassword(email);
    setLoading(false);
    if (ok) {
      setSent(true);
    } else {
      toast.error("Erro ao enviar email de recuperação");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-sm">
        <div className="bg-card rounded-2xl shadow-lg border border-border p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold mb-2">Email enviado</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Email enviado para <strong>{email}</strong>. Verifique sua caixa de entrada.
              </p>
              <button onClick={() => navigate("/")} className="text-sm text-primary hover:underline font-medium">
                ← Voltar ao login
              </button>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-center mb-1">Recuperar senha</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Digite seu email e enviaremos as instruções
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@escritorio.com.br"
                  className="w-full px-3 py-2.5 bg-secondary rounded-lg text-sm border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Enviando..." : "Enviar instruções"}
                </button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-4">
                <button onClick={() => navigate("/")} className="text-primary hover:underline">← Voltar ao login</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
