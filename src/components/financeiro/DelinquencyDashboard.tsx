import { AlertTriangle, MessageCircle, Mail } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpcomingPayments } from "@/hooks/useUpcomingPayments";

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function DelinquencyDashboard() {
  const { data: payments = [], isLoading } = useUpcomingPayments(365);

  const overdue = payments.filter(p => p.is_overdue && p.type === "receita");
  const totalOverdue = overdue.reduce((s, p) => s + Number(p.amount), 0);

  const generateWhatsApp = (p: typeof overdue[0]) => {
    const msg = encodeURIComponent(
      `Olá! Gostaríamos de informar que a parcela referente a "${p.description}" no valor de ${formatCurrency(Number(p.amount))}, com vencimento em ${p.due_date ? format(new Date(p.due_date + "T12:00:00"), "dd/MM/yyyy") : ""}, encontra-se em aberto. Podemos ajudar?`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const generateEmail = (p: typeof overdue[0]) => {
    const subject = encodeURIComponent(`Lembrete de pagamento - ${p.description}`);
    const body = encodeURIComponent(
      `Prezado(a) cliente,\n\nGostaríamos de informar que a parcela referente a "${p.description}" no valor de ${formatCurrency(Number(p.amount))}, com vencimento em ${p.due_date ? format(new Date(p.due_date + "T12:00:00"), "dd/MM/yyyy") : ""}, encontra-se em aberto.\n\nFicamos à disposição.\n\nAtenciosamente.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> Inadimplência
          </h2>
          {overdue.length > 0 && (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
              {overdue.length} atrasado{overdue.length > 1 ? "s" : ""} • {formatCurrency(totalOverdue)}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : overdue.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-sm">Nenhum honorário em atraso</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {overdue.map(p => (
              <li key={p.id} className="group flex items-center justify-between rounded-lg border border-destructive/20 p-3 hover:bg-destructive/5 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{p.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.client && <span>{p.client} • </span>}
                    Vencido há {Math.abs(p.days_until_due)} dia(s)
                    {p.due_date && ` • ${format(new Date(p.due_date + "T12:00:00"), "dd/MM/yyyy")}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-sm font-semibold text-destructive">{formatCurrency(Number(p.amount))}</span>
                  <Button variant="outline" size="sm" className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => generateWhatsApp(p)}>
                    <MessageCircle className="h-3.5 w-3.5 mr-1" />WhatsApp
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => generateEmail(p)}>
                    <Mail className="h-3.5 w-3.5 mr-1" />E-mail
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
