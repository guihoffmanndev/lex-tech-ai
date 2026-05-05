import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useFinancialSummary(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ["financial-summary", dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("type, amount, status, area, category, created_at")
        .gte("created_at", dateFrom)
        .lte("created_at", dateTo + "T23:59:59");

      if (error) throw error;
      const transactions = data ?? [];

      const totalReceitas = transactions
        .filter(t => t.type === "receita")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalDespesas = transactions
        .filter(t => t.type === "despesa")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const receitasRecebidas = transactions
        .filter(t => t.type === "receita" && t.status === "recebido")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const saldoLiquido = totalReceitas - totalDespesas;

      const receitasPorArea = transactions
        .filter(t => t.type === "receita" && t.area)
        .reduce((acc: Record<string, number>, t) => {
          acc[t.area!] = (acc[t.area!] ?? 0) + Number(t.amount);
          return acc;
        }, {});

      const areaChartData = Object.entries(receitasPorArea)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value }));

      const despesasPorCategoria = transactions
        .filter(t => t.type === "despesa")
        .reduce((acc: Record<string, number>, t) => {
          acc[t.category] = (acc[t.category] ?? 0) + Number(t.amount);
          return acc;
        }, {});

      const despesasChartData = Object.entries(despesasPorCategoria)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value }));

      // Cash flow by month (for the full year)
      const cashFlowByMonth: Record<number, { receitas: number; despesas: number }> = {};
      transactions.forEach(t => {
        const month = new Date(t.created_at as string).getMonth();
        if (!cashFlowByMonth[month]) cashFlowByMonth[month] = { receitas: 0, despesas: 0 };
        if (t.type === "receita") cashFlowByMonth[month].receitas += Number(t.amount);
        else cashFlowByMonth[month].despesas += Number(t.amount);
      });

      const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const cashFlowData = months.map((month, i) => ({
        month,
        receitas: cashFlowByMonth[i]?.receitas ?? 0,
        despesas: cashFlowByMonth[i]?.despesas ?? 0,
      }));

      const pendentesCount = transactions.filter(
        t => t.type === "receita" && (t.status === "pendente" || t.status === "vencido")
      ).length;

      const aReceber = transactions
        .filter(t => t.type === "receita" && (t.status === "pendente" || t.status === "vencido"))
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        totalReceitas,
        totalDespesas,
        receitasRecebidas,
        saldoLiquido,
        areaChartData,
        despesasChartData,
        cashFlowData,
        pendentesCount,
        aReceber,
      };
    },
  });
}
