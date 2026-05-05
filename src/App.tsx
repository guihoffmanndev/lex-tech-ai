import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "@/pages/Login";
import Registro from "@/pages/Registro";
import RecuperarSenha from "@/pages/RecuperarSenha";
import AppShell from "@/components/AppShell";
import CheckoutSucesso from "@/pages/CheckoutSucesso";
import Upgrade from "@/pages/Upgrade";
import { TermsAcceptanceModal } from "@/components/TermsAcceptanceModal";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      retry: (failureCount, error: any) => {
        if (error?.code === "42501" || error?.code === "PGRST301") return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/assistente": "Assistente IA",
  "/vault": "Vault",
  "/workflows": "Workflows",
  "/financeiro": "Financeiro",
  "/relatorios": "Relatórios",
  "/colaboradores": "Colaboradores",
  "/tarefas": "Tarefas",
  "/clientes": "Clientes",
  "/lex-pilot": "Lex Pilot",
  "/calculadora": "Calculadora Jurídica",
  "/perfil": "Meu Perfil",
};

function TitleUpdater() {
  const location = useLocation();
  useEffect(() => {
    const title = pageTitles[location.pathname] || "Lex.ai";
    document.title = `${title} — Lex.ai`;
  }, [location.pathname]);
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <TermsAcceptanceModal />
        <Sonner />
        <TitleUpdater />
        <Routes>
          <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/registro" element={<PublicRoute><Registro /></PublicRoute>} />
          <Route path="/recuperar-senha" element={<PublicRoute><RecuperarSenha /></PublicRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><AppShell page="inicio" /></ProtectedRoute>} />
          <Route path="/assistente" element={<ProtectedRoute><AppShell page="assistente" /></ProtectedRoute>} />
          <Route path="/vault" element={<ProtectedRoute><AppShell page="vault" /></ProtectedRoute>} />
          <Route path="/workflows" element={<ProtectedRoute><AppShell page="workflows" /></ProtectedRoute>} />
          <Route path="/financeiro" element={<ProtectedRoute><AppShell page="financeiro" /></ProtectedRoute>} />
          <Route path="/relatorios" element={<ProtectedRoute><AppShell page="relatorios" /></ProtectedRoute>} />
          <Route path="/colaboradores" element={<ProtectedRoute><AppShell page="colaboradores" /></ProtectedRoute>} />
          <Route path="/tarefas" element={<ProtectedRoute><AppShell page="tarefas" /></ProtectedRoute>} />
          <Route path="/clientes" element={<ProtectedRoute><AppShell page="clientes" /></ProtectedRoute>} />
          <Route path="/lex-pilot" element={<ProtectedRoute><AppShell page="lex-pilot" /></ProtectedRoute>} />
          <Route path="/calculadora" element={<ProtectedRoute><AppShell page="calculadora" /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><AppShell page="perfil" /></ProtectedRoute>} />
          <Route path="/checkout-sucesso" element={<ProtectedRoute><CheckoutSucesso /></ProtectedRoute>} />
          <Route path="/upgrade" element={<ProtectedRoute><Upgrade /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
