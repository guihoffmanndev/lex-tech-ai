import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Loader2, Scale, Check } from "lucide-react";
import lexLogo from "@/assets/lex-logo.svg";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const { login } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "Email é obrigatório";
    if (!password.trim()) e.password = "Senha é obrigatória";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.ok) {
      navigate("/dashboard");
    } else if (result.errorCode === "email_not_confirmed") {
      toast.error("Confirme seu email antes de fazer login. Verifique sua caixa de entrada.");
    } else {
      toast.error("Credenciais inválidas. Verifique seu email e senha.");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[55%] bg-black text-white flex-col justify-between p-12">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-semibold tracking-tight">Lex</span>
        </div>
        <div className="max-w-lg">
          <h1 className="text-4xl font-bold leading-tight mb-4 text-primary-foreground">
            Inteligência jurídica<br />para escritórios modernos.
          </h1>
          <p className="text-gray-400">
            Automatize tarefas, analise documentos e gerencie seu escritório com IA.
          </p>
        </div>
        <div />
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background overflow-y-auto">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold mb-1">Bem-vindo de volta</h2>
          <p className="text-sm text-muted-foreground mb-6">Entre com suas credenciais para acessar o painel</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Email profissional</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((p) => ({ ...p, email: undefined }));
                }}
                placeholder="seu@escritorio.com.br"
                className="w-full px-3 py-2.5 bg-secondary rounded-lg text-sm border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((p) => ({ ...p, password: undefined }));
                  }}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-secondary rounded-lg text-sm border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/30 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate("/recuperar-senha")}
                className="text-xs text-primary hover:underline"
              >
                Esqueceu sua senha?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2 mt-2 active:scale-[0.98] transition-all"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            type="button"
            onClick={async () => {
              const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: window.location.origin + "/dashboard" },
              });
              if (error) toast.error("Erro ao entrar com Google");
            }}
            className="w-full h-11 border border-border rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-secondary transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Entrar com Google
          </button>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Não tem conta?{" "}
            <button onClick={() => navigate("/registro")} className="text-primary hover:underline font-medium">
              Criar conta
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
