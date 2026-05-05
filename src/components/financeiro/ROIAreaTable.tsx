import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLegalCases } from "@/hooks/useLegalCases";
import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface AreaROI {
  area: string;
  receita: number;
  custos: number;
  custoMensal: number;
  roi: number;
  casesCount: number;
}

export function ROIAreaTable() {
  const { casesQuery } = useLegalCases();
  const cases = useMemo(() => casesQuery.data ?? [], [casesQuery.data]);

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["roi-area-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("type, amount, area, status");
      if (error) throw error;
      return data ?? [];
    },
  });

  const areaData = useMemo((): AreaROI[] => {
    const areas = new Map<string, AreaROI>();

    // Revenue from transactions
    transactions
      .filter((t) => t.type === "receita" && t.area)
      .forEach((t) => {
        const existing = areas.get(t.area!) ?? { area: t.area!, receita: 0, custos: 0, custoMensal: 0, roi: 0, casesCount: 0 };
        existing.receita += Number(t.amount);
        areas.set(t.area!, existing);
      });

    // Costs from transactions
    transactions
      .filter((t) => t.type === "despesa" && t.area)
      .forEach((t) => {
        const existing = areas.get(t.area!) ?? { area: t.area!, receita: 0, custos: 0, custoMensal: 0, roi: 0, casesCount: 0 };
        existing.custos += Number(t.amount);
        areas.set(t.area!, existing);
      });

    // Monthly costs + cases count from legal_cases
    cases
      .filter((c) => c.status === "ativa")
      .forEach((c) => {
        const existing = areas.get(c.area) ?? { area: c.area, receita: 0, custos: 0, custoMensal: 0, roi: 0, casesCount: 0 };
        existing.custoMensal += Number(c.custo_mensal);
        existing.custos += Number(c.custas_adiantadas);
        existing.casesCount += 1;
        areas.set(c.area, existing);
      });

    // Calculate ROI
    return Array.from(areas.values())
      .map((a) => ({
        ...a,
        roi: a.custos > 0 ? ((a.receita - a.custos) / a.custos) * 100 : a.receita > 0 ? 100 : 0,
      }))
      .sort((a, b) => b.roi - a.roi);
  }, [transactions, cases]);

  const isLoading = casesQuery.isLoading || txLoading;

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="font-semibold text-lg mb-4">ROI por Área Jurídica</h2>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : areaData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
            <BarChart3 className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">Sem dados para calcular ROI</p>
            <p className="text-xs mt-1">Cadastre transações com área definida</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Área</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Custos</TableHead>
                  <TableHead className="text-right">Custo/Mês</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {areaData.map((a) => (
                  <TableRow key={a.area}>
                    <TableCell className="font-medium">{a.area}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{a.casesCount}</TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400 tabular-nums">
                      {formatCurrency(a.receita)}
                    </TableCell>
                    <TableCell className="text-right text-red-600 dark:text-red-400 tabular-nums">
                      {formatCurrency(a.custos)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {formatCurrency(a.custoMensal)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-medium tabular-nums",
                          a.roi > 0
                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
                            : a.roi < 0
                            ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {a.roi > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : a.roi < 0 ? <TrendingDown className="h-3 w-3 mr-1" /> : <Minus className="h-3 w-3 mr-1" />}
                        {a.roi.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
