import { Banknote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLegalCases } from "@/hooks/useLegalCases";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCNJ } from "@/lib/formatCNJ";

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CustasProvisao() {
  const { casesQuery, totalCustasAdiantadas } = useLegalCases();
  const cases = (casesQuery.data ?? []).filter(c => c.status === "ativa" && Number(c.custas_adiantadas) > 0);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Banknote className="h-5 w-5 text-warning" /> Provisão de Custas
          </h2>
          <span className="text-sm font-semibold text-warning">{formatCurrency(totalCustasAdiantadas)}</span>
        </div>

        {casesQuery.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : cases.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma custa adiantada registrada.</p>
        ) : (
          <ul className="space-y-2">
            {cases.map(c => (
              <li key={c.id} className="flex items-center justify-between p-2 rounded-md border border-border hover:bg-accent/50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate font-mono">{formatCNJ(c.numero_processo)}</p>
                  <p className="text-xs text-muted-foreground">{c.cliente ?? c.area}</p>
                </div>
                <span className="text-sm font-semibold text-warning shrink-0 ml-3">{formatCurrency(Number(c.custas_adiantadas))}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
