import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Scale, Check, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import posthog from "posthog-js";

export default function Registro() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);
    const result = await signup(email, password, name);
    setLoading(false);
    if (result.ok) {
      posthog.capture("user_signed_up", { name, email });
      posthog.identify(email, { name, email });
      setSuccess(true);
      toast.success("Conta criada com sucesso!");
    } else {
      toast.error(result.error || "Erro ao criar conta");
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

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background overflow-y-auto">
        <div className="w-full max-w-sm">
          {success ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Conta criada!</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Você já pode fazer login com suas credenciais.
              </p>
              <button onClick={() => navigate("/")} className="text-sm text-primary hover:underline font-medium">
                Ir para o login
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-semibold mb-1">Criar conta no Lex.ai</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Preencha seus dados para começar
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Nome completo</label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full px-3 py-2.5 bg-secondary rounded-lg text-sm border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Email profissional</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@escritorio.com.br"
                    className="w-full px-3 py-2.5 bg-secondary rounded-lg text-sm border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Senha</label>
                  <div className="relative">
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-3 py-2.5 bg-secondary rounded-lg text-sm border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/30 pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2 mt-2 active:scale-[0.98] transition-all"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Criando conta..." : "Criar conta"}
                </button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-6">
                Já tem conta?{" "}
                <button onClick={() => navigate("/")} className="text-primary hover:underline font-medium">Fazer login</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
