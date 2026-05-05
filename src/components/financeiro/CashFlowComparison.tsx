import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CashFlowComparison() {
  const { data, isLoading } = useQuery({
    queryKey: ["cashflow-projected-vs-realized"],
    queryFn: async () => {
      const { data: txs, error } = await supabase
        .from("financial_transactions")
        .select("type, amount, status, due_date, paid_at")
        .eq("type", "receita");
      if (error) throw error;
      return txs ?? [];
    },
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    const byMonth: Record<number, { projetado: number; realizado: number }> = {};

    data.forEach((t) => {
      // Projected: based on due_date
      if (t.due_date) {
        const m = new Date(t.due_date + "T12:00:00").getMonth();
        if (!byMonth[m]) byMonth[m] = { projetado: 0, realizado: 0 };
        byMonth[m].projetado += Number(t.amount);
      }
      // Realized: based on paid_at (only recebido/pago)
      if (t.paid_at && (t.status === "recebido" || t.status === "pago")) {
        const m = new Date(t.paid_at + "T12:00:00").getMonth();
        if (!byMonth[m]) byMonth[m] = { projetado: 0, realizado: 0 };
        byMonth[m].realizado += Number(t.amount);
      }
    });

    return MONTHS.map((month, i) => ({
      month,
      projetado: byMonth[i]?.projetado ?? 0,
      realizado: byMonth[i]?.realizado ?? 0,
    }));
  }, [data]);

  const hasData = chartData.some(d => d.projetado > 0 || d.realizado > 0);

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="font-semibold text-lg mb-4">Fluxo de Caixa: Projetado vs Realizado</h2>
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
            <TrendingUp className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">Sem dados de fluxo de caixa</p>
            <p className="text-xs mt-1">Cadastre receitas com data de vencimento para visualizar</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                formatter={(v: number, name: string) => [formatCurrency(v), name === "projetado" ? "Projetado" : "Realizado"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend
                formatter={(value: string) => (value === "projetado" ? "Projetado" : "Realizado")}
                wrapperStyle={{ fontSize: "12px" }}
              />
              <Bar dataKey="projetado" fill="hsl(var(--primary) / 0.4)" radius={[4, 4, 0, 0]} name="projetado" />
              <Bar dataKey="realizado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="realizado" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
