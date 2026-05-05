import { DollarSign, TrendingUp, Flame, Target, type LucideProps } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { FC } from "react";

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface KpiData {
  saldoConta: number;
  previsaoRecebimento: number;
  potencialExito: number;
  burnRate: number;
}

function KpiCard({ icon: Icon, label, value, subtitle, color }: {
  icon: FC<LucideProps>; label: string; value: string; subtitle: string; color: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="flex items-start gap-4 pt-5 pb-4">
        <div className={`rounded-lg p-2.5 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function HubKpiCards({ data, isLoading }: { data?: KpiData; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="pt-5 pb-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        icon={DollarSign}
        label="Saldo em Conta"
        value={formatCurrency(data.saldoConta)}
        subtitle="Receitas recebidas − Despesas pagas"
        color="bg-primary/10 text-primary"
      />
      <KpiCard
        icon={TrendingUp}
        label="Previsão de Recebimento"
        value={formatCurrency(data.previsaoRecebimento)}
        subtitle="Honorários pendentes no mês"
        color="bg-success/10 text-success"
      />
      <KpiCard
        icon={Target}
        label="Potencial de Êxito"
        value={formatCurrency(data.potencialExito)}
        subtitle="Ponderado pelo score de risco"
        color="bg-warning/10 text-warning"
      />
      <KpiCard
        icon={Flame}
        label="Burn Rate Mensal"
        value={formatCurrency(data.burnRate)}
        subtitle="Custos fixos + variáveis"
        color="bg-destructive/10 text-destructive"
      />
    </div>
  );
}
