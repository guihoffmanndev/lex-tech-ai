import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useRecentes } from "@/hooks/useRecentes";
import { usePlanPermissions, type Feature } from "@/hooks/usePlanPermissions";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Home,
  Brain,
  FolderOpen,
  Zap,
  BarChart3,
  Users,
  FileText,
  ChevronLeft,
  DollarSign,
  LogOut,
  Moon,
  Sun,
  Stamp,
  Calculator,
  UserCircle,
  GitBranch,
  Bot,
  ArrowUpCircle,
  Lock,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";

const topMenuItems = [
{ id: "inicio", label: "Início", icon: Home, path: "/dashboard" },
{ id: "assistente", label: "Assistente IA", icon: Brain, path: "/assistente" },
{ id: "vault", label: "Vault", icon: FolderOpen, path: "/vault" },
{ id: "workflows", label: "Workflows", icon: Zap, path: "/workflows" },
{ id: "tarefas", label: "Tarefas", icon: ClipboardList, path: "/tarefas" }];

const gestaoMenuItems = [
{ id: "financeiro", label: "Hub Financeiro", icon: DollarSign, path: "/financeiro" },
{ id: "relatorios", label: "Relatórios", icon: BarChart3, path: "/relatorios" },
{ id: "colaboradores", label: "Colaboradores", icon: Users, path: "/colaboradores" },
{ id: "clientes", label: "Clientes", icon: UserCircle, path: "/clientes" },
{ id: "lex-pilot", label: "Lex Pilot", icon: Stamp, path: "/lex-pilot" },
{ id: "calculadora", label: "Calculadora", icon: Calculator, path: "/calculadora" }];


const recentTypeIcons: Record<string, any> = {
  documento: FileText,
  conversa_ia: Bot,
  workflow: GitBranch,
  honorario: DollarSign,
  relatorio: BarChart3,
  colaborador: Users,
};


interface AppSidebarProps {
  activePage: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function AppSidebar({ activePage, collapsed, onToggleCollapse }: AppSidebarProps) {
  const navigate = useNavigate();
  const { user, logout, subscription } = useAuth();
  const { recentesQuery } = useRecentes();
  const { hasAccess } = usePlanPermissions();
  const { isTrialActive, isPaid } = useTrialStatus();
  // Free users: trial expired or never activated, no paid plan
  const isFreeUser = subscription._loaded && !isTrialActive && !isPaid;
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    toast.success(next ? "Modo escuro ativado" : "Modo claro ativado");
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Sessão encerrada");
    navigate("/");
  };

  return (
    <>
      <aside
        className={`fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200 z-30 ${
        collapsed ? "w-14" : "w-60"}`
        }>
        
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2 min-w-0">
            
            {!collapsed &&
            <span className="text-lg font-semibold tracking-tight text-foreground">Lex</span>
            }
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-md hover:bg-accent text-muted-foreground shrink-0">
            
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {!collapsed &&
          <p className="px-2 mb-1 text-[11px] font-medium uppercase tracking-wider text-sidebar-muted">
              Menu
            </p>
          }
          <ul className="space-y-0.5">
            {topMenuItems.map((item) => {
              const isActive = activePage === item.id;
              const featureKey = item.id === "inicio" ? null : item.id as Feature;
              const locked = !featureKey ? false
                : isFreeUser ? true
                : featureKey === "assistente" ? !isPaid
                : isTrialActive ? false
                : !hasAccess(featureKey);
              return (
                <li key={item.id}>
                  <button
                    onClick={() => locked ? setShowUpgrade(true) : navigate(item.path)}
                    className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[15px] transition-colors ${
                    isActive ?
                    "bg-sidebar-accent text-sidebar-foreground font-medium" :
                    locked ? "text-muted-foreground/50 hover:bg-accent" :
                    "text-sidebar-foreground/60 hover:bg-accent"} ${
                    collapsed ? "justify-center" : ""}`}
                    title={collapsed ? item.label : undefined}>
                    
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <span className="flex-1 text-left flex items-center gap-1.5">
                        {item.label}
                        {locked && <Lock className="h-3 w-3 text-muted-foreground/50" />}
                      </span>
                    )}
                  </button>
                </li>);
            })}
          </ul>

          <div className="my-7" />

          {!collapsed &&
          <p className="px-2 mb-1 text-[11px] font-medium uppercase tracking-wider text-sidebar-muted">
              Gestão
            </p>
          }
          <ul className="space-y-0.5">
            {gestaoMenuItems.map((item) => {
              const isActive = activePage === item.id;
              const featureKey = item.id as Feature;
              const locked = isFreeUser ? true
                : isTrialActive ? false
                : !hasAccess(featureKey);
              return (
                <li key={item.id}>
                  <button
                    onClick={() => locked ? setShowUpgrade(true) : navigate(item.path)}
                    className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[15px] transition-colors ${
                    isActive ?
                    "bg-sidebar-accent text-sidebar-foreground font-medium" :
                    locked ? "text-muted-foreground/50 hover:bg-accent" :
                    "text-sidebar-foreground/60 hover:bg-accent"} ${
                    collapsed ? "justify-center" : ""}`}
                    title={collapsed ? item.label : undefined}>

                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <span className="flex-1 text-left flex items-center gap-1.5">
                        {item.label}
                        {item.id === "calculadora" && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary leading-none">
                            BETA
                          </span>
                        )}
                        {locked && <Lock className="h-3 w-3 text-muted-foreground/50" />}
                      </span>
                    )}
                  </button>
                </li>);
            })}
          </ul>

          {!collapsed &&
          <>
              <div className="mt-6 mb-1 px-2">
                <p className="text-[11px] font-medium uppercase tracking-wider text-sidebar-muted">
                  Recentes
                </p>
              </div>
              {recentesQuery.isLoading ? (
                <div className="space-y-1.5 px-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-7 w-full" />)}
                </div>
              ) : !recentesQuery.data || recentesQuery.data.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2">
                  Nenhum item acessado ainda.
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {recentesQuery.data.map((item) => {
                    const Icon = recentTypeIcons[item.tipo] ?? FileText;
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => navigate(item.item_path)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground truncate"
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{item.item_nome}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          }
        </nav>

        {/* Bottom — User info + Logout */}
        <div className="border-t border-sidebar-border py-2 px-2 space-y-0.5">
          {!collapsed && user &&
          <button
              onClick={() => navigate("/perfil")}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium shrink-0">
                {user.iniciais}
              </div>
              <div className="min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide shrink-0 ${
                    subscription.plan === "pro" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                    subscription.plan === "plus+" ? "bg-primary/10 text-primary" :
                    subscription.plan === "starter" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {subscription.plan === "plus+" ? "Plus+" : subscription.plan}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
              </div>
            </button>
          }
          {collapsed &&
          <button
              onClick={() => navigate("/perfil")}
              className="w-full flex items-center justify-center px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
              title="Meu Perfil"
            >
              <UserCircle className="h-4 w-4 text-muted-foreground" />
            </button>
          }
          <button
            onClick={() => setShowUpgrade(true)}
            className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm font-medium text-primary hover:bg-primary/10 ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? "Fazer Upgrade" : undefined}>
            <ArrowUpCircle className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Fazer Upgrade</span>}
          </button>
          <button
            onClick={toggleDark}
            className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? isDark ? "Modo claro" : "Modo escuro" : undefined}>
            {isDark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            {!collapsed && <span>{isDark ? "Modo claro" : "Modo escuro"}</span>}
          </button>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-destructive ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? "Sair" : undefined}>
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Upgrade modal */}
      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />

      {/* Logout confirmation */}
      {showLogoutConfirm &&
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-card rounded-xl border border-border shadow-lg p-6 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-2">Deseja sair do Lex.ai?</h3>
            <p className="text-sm text-muted-foreground mb-4">Sua sessão será encerrada.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowLogoutConfirm(false)} className="px-3 py-1.5 text-sm rounded-lg hover:bg-secondary">Cancelar</button>
              <button onClick={handleLogout} className="px-3 py-1.5 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90">Sair</button>
            </div>
          </div>
        </div>
      }
    </>);

}