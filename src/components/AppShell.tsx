import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { PlanGate } from "@/components/PlanGate";
import { TrialExpiredModal } from "@/components/TrialExpiredModal";
import type { Feature } from "@/hooks/usePlanPermissions";
import Dashboard from "@/pages/Dashboard";
import AssistenteIA from "@/pages/AssistenteIA";
import Vault from "@/pages/Vault";
import Workflows from "@/pages/Workflows";
import Financeiro from "@/pages/Financeiro";
import Relatorios from "@/pages/Relatorios";
import Colaboradores from "@/pages/Colaboradores";
import LexPilot from "@/pages/LexPilot";
import Calculadora from "@/pages/Calculadora";
import Clientes from "@/pages/Clientes";
import Perfil from "@/pages/Perfil";
import Tarefas from "@/pages/Tarefas";

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
          {gatedFeature ? (
            <PlanGate feature={gatedFeature}>
              <PageComponent />
            </PlanGate>
          ) : (
            <PageComponent />
          )}
        </div>
      </main>
      <TrialExpiredModal />
    </div>
  );
}
