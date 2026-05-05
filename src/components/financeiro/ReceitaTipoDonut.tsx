import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { TooltipProps } from "recharts";
import { useLegalCases } from "@/hooks/useLegalCases";
import { Scale } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const TIPO_LABELS: Record<string, string> = {
  contratual: "Contratuais",
  sucumbencial: "Sucumbenciais",
  consultivo: "Consultivos",
};

const TIPO_COLORS: Record<string, string> = {
  contratual: "hsl(var(--primary))",
  sucumbencial: "hsl(142, 71%, 45%)",
  consultivo: "hsl(38, 92%, 50%)",
};

const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ReceitaTipoDonut() {
  const { casesQuery } = useLegalCases();
  const cases = casesQuery.data ?? [];

  const chartData = useMemo(() => {
    const byTipo: Record<string, number> = {};
    cases
      .filter((c) => c.status === "ativa")
      .forEach((c) => {
        const tipo = c.tipo_honorario || "contratual";
        const valor = Number(c.valor_causa) * (Number(c.percentual_honorarios) / 100);
        byTipo[tipo] = (byTipo[tipo] ?? 0) + valor;
      });

    return Object.entries(byTipo)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name: TIPO_LABELS[name] ?? name,
        value,
        key: name,
      }));
  }, [cases]);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="font-semibold text-lg mb-4">Receita por Tipo de Honorário</h2>
        {casesQuery.isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <Scale className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">Sem ações judiciais ativas</p>
            <p className="text-xs mt-1">Cadastre ações na aba "Ações Judiciais"</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  paddingAngle={4}
                  cornerRadius={6}
                  startAngle={90}
                  endAngle={-270}
                >
                  {chartData.map((d) => (
                    <Cell key={d.key} fill={TIPO_COLORS[d.key] ?? "hsl(var(--muted))"} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }: TooltipProps<number, string>) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0";
                    return (
                      <div className="rounded-lg border border-border/50 bg-background px-3 py-2 shadow-xl text-xs">
                        <p className="font-medium text-foreground">{d.name}</p>
                        <p className="text-muted-foreground">{formatCurrency(d.value)}</p>
                        <p className="text-muted-foreground">{pct}%</p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-1.5 px-2">
              {chartData.map((d) => {
                const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0";
                return (
                  <div key={d.key} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: TIPO_COLORS[d.key] }} />
                    <span className="flex-1 text-foreground">{d.name}</span>
                    <span className="text-muted-foreground tabular-nums">{formatCurrency(d.value)}</span>
                    <span className="text-muted-foreground tabular-nums w-12 text-right">{pct}%</span>
                  </div>
                );
              })}
              <div className="border-t border-border my-1.5" />
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-foreground" />
                <span className="flex-1 text-foreground">Total potencial</span>
                <span className="tabular-nums text-foreground">{formatCurrency(total)}</span>
                <span className="tabular-nums w-12 text-right text-foreground">100%</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
