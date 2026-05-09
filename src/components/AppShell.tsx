import { lazy, Suspense, useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { PlanGate } from "@/components/PlanGate";
import { TrialExpiredModal } from "@/components/TrialExpiredModal";
import type { Feature } from "@/hooks/usePlanPermissions";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const AssistenteIA = lazy(() => import("@/pages/AssistenteIA"));
const Vault = lazy(() => import("@/pages/Vault"));
const Workflows = lazy(() => import("@/pages/Workflows"));
const Financeiro = lazy(() => import("@/pages/Financeiro"));
const Relatorios = lazy(() => import("@/pages/Relatorios"));
const Colaboradores = lazy(() => import("@/pages/Colaboradores"));
const LexPilot = lazy(() => import("@/pages/LexPilot"));
const Calculadora = lazy(() => import("@/pages/Calculadora"));
const Clientes = lazy(() => import("@/pages/Clientes"));
const Perfil = lazy(() => import("@/pages/Perfil"));
const Tarefas = lazy(() => import("@/pages/Tarefas"));

const pages: Record<string, React.ComponentType> = {
  inicio: Dashboard,
  assistente: AssistenteIA,
  vault: Vault,
  workflows: Workflows,
  financeiro: Financeiro,
  relatorios: Relatorios,
  colaboradores: Colaboradores,
  clientes: Clientes,
  "lex-pilot": LexPilot,
  calculadora: Calculadora,
  perfil: Perfil,
  tarefas: Tarefas,
};

const GATED_PAGES: Record<string, Feature> = {
  assistente: "assistente",
  vault: "vault",
  workflows: "workflows",
  financeiro: "financeiro",
  relatorios: "relatorios",
  colaboradores: "colaboradores",
  clientes: "clientes",
  "lex-pilot": "lex-pilot",
  calculadora: "calculadora",
  tarefas: "tarefas",
};

export default function AppShell({ page }: { page: string }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const PageComponent = pages[page] || Dashboard;
  const gatedFeature = GATED_PAGES[page];

  return (
    <div className="min-h-screen flex w-full">
      <AppSidebar
        activePage={page}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main
        className={`flex-1 min-w-0 overflow-x-hidden min-h-screen flex flex-col transition-all duration-200 ${
          sidebarCollapsed ? "ml-14" : "ml-60"
        }`}
      >
        <div className="p-6 lg:p-8 flex-1 flex flex-col">
          <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
            {gatedFeature ? (
              <PlanGate feature={gatedFeature}>
                <PageComponent />
              </PlanGate>
            ) : (
              <PageComponent />
            )}
          </Suspense>
        </div>
      </main>
      <TrialExpiredModal />
    </div>
  );
}
