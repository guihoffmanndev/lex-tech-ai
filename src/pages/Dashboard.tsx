import { useNavigate } from "react-router-dom";
import { FileText, MessageSquare, Zap, DollarSign, Users, Upload, Clock, FileCheck, TrendingUp, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrialBanner } from "@/components/dashboard/TrialBanner";

function timeAgo(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
}

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const activityIcons: Record<string, any> = {
  doc: FileCheck,
  financial: DollarSign,
  workflow: Zap,
};

function CardSkeleton() {
  return (
    <div className="p-5 rounded-lg border border-border bg-card space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-muted-foreground text-sm">{message}</p>;
}

function ErrorState() {
  return <p className="text-destructive text-sm">Erro ao carregar dados. Tente novamente.</p>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading, isError } = useDashboardData();

  const firstName = user?.name?.split(" ")[0] ?? "Usuário";

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-1">Olá, {firstName}</h1>
        <p className="text-muted-foreground">Aqui está o resumo do seu escritório.</p>
      </div>

      <TrialBanner />

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Ações rápidas</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Nova consulta IA", icon: MessageSquare, action: () => navigate("/assistente") },
            { label: "Enviar documento", icon: Upload, action: () => navigate("/vault") },
            { label: "Criar workflow", icon: Zap, action: () => navigate("/workflows") },
          ].map((a) => (
            <button
              key={a.label}
              onClick={a.action}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-secondary text-sm transition-colors active:scale-[0.98]"
            >
              <a.icon className="h-4 w-4 text-primary" />
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {isError && <ErrorState />}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border border-border bg-card space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))
        ) : data ? (
          <>
            <div className="p-4 rounded-lg border border-border bg-card">
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Documentos</p>
              <p className="text-2xl font-semibold">{data.vault.total}</p>
              <p className="text-xs text-muted-foreground mt-1">Total no Vault</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card">
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Workflows</p>
              <p className="text-2xl font-semibold">{data.workflows.active}</p>
              <p className="text-xs text-muted-foreground mt-1">{data.workflows.total} total</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card">
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Equipe</p>
              <p className="text-2xl font-semibold">{data.collaborators.total}</p>
              <p className="text-xs text-muted-foreground mt-1">Colaboradores ativos</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card">
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Recebido (mês)</p>
              <p className="text-2xl font-semibold">{currency(data.financial.recebido)}</p>
              <p className="text-xs text-muted-foreground mt-1">{currency(data.financial.pendente)} pendente</p>
            </div>
          </>
        ) : null}
      </div>

      {/* Detail Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Vault */}
        <div className="p-5 rounded-lg border border-border bg-card">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Documentos recentes</h3>
          {isLoading ? <CardSkeleton /> : !data || data.vault.recent.length === 0 ? (
            <EmptyState message="Nenhum documento ainda. Envie arquivos pelo Vault." />
          ) : (
            <div className="space-y-2">
              {data.vault.recent.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary transition-colors cursor-pointer" onClick={() => navigate("/vault")}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.type}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{timeAgo(doc.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Financial */}
        <div className="p-5 rounded-lg border border-border bg-card">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Financeiro</h3>
          {isLoading ? <CardSkeleton /> : !data ? (
            <EmptyState message="Nenhum dado financeiro." />
          ) : data.financial.recebido === 0 && data.financial.pendente === 0 && data.financial.atrasado === 0 ? (
            <EmptyState message="Nenhum lançamento financeiro ainda. Registre pelo módulo Financeiro." />
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 rounded-md bg-secondary/50">
                <span className="text-sm">Recebido (mês)</span>
                <span className="text-sm font-semibold text-green-600">{currency(data.financial.recebido)}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-md bg-secondary/50">
                <span className="text-sm">Pendente</span>
                <span className="text-sm font-semibold text-yellow-600">{currency(data.financial.pendente)}</span>
              </div>
              {data.financial.atrasado > 0 && (
                <div className="flex justify-between items-center p-2 rounded-md bg-destructive/10">
                  <span className="text-sm flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Em atraso</span>
                  <span className="text-sm font-semibold text-destructive">{currency(data.financial.atrasado)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Workflows */}
        <div className="p-5 rounded-lg border border-border bg-card">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Workflows recentes</h3>
          {isLoading ? <CardSkeleton /> : !data || data.workflows.recentRuns.length === 0 ? (
            <EmptyState message="Nenhuma execução de workflow ainda. Crie workflows para automatizar tarefas." />
          ) : (
            <div className="space-y-2">
              {data.workflows.recentRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary transition-colors cursor-pointer" onClick={() => navigate("/workflows")}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${run.status === "success" ? "bg-green-500" : run.status === "error" ? "bg-destructive" : "bg-yellow-500"}`} />
                    <p className="text-sm">{run.status === "success" ? "Concluído" : run.status === "error" ? "Erro" : "Executando"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{timeAgo(run.executed_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Collaborators */}
        <div className="p-5 rounded-lg border border-border bg-card">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Equipe</h3>
          {isLoading ? <CardSkeleton /> : !data || data.collaborators.recent.length === 0 ? (
            <EmptyState message="Nenhum colaborador cadastrado. Adicione pela aba Colaboradores." />
          ) : (
            <div className="space-y-2">
              {data.collaborators.recent.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary transition-colors cursor-pointer" onClick={() => navigate("/colaboradores")}>
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {c.name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.role}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Atividade recente</h2>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-3">
                <Skeleton className="h-8 w-8 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : !data || data.activity.length === 0 ? (
          <EmptyState message="Nenhuma atividade recente. Comece usando as funcionalidades do sistema." />
        ) : (
          <div className="space-y-1">
            {data.activity.map((item) => {
              const Icon = activityIcons[item.type] ?? Clock;
              return (
                <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary transition-colors">
                  <div className="mt-0.5 p-1.5 rounded-md bg-secondary">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(item.date)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
