import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameDay, isSameMonth, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight, Clock, DollarSign, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Recebimento {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: string;
  client: string | null;
  type: string;
}

export function RecebimentosCalendario() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const { data: recebimentos = [], isLoading } = useQuery({
    queryKey: ["recebimentos-calendario", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("id, description, amount, due_date, status, client, type")
        .not("due_date", "is", null)
        .gte("due_date", start)
        .lte("due_date", end)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Recebimento[];
    },
  });

  const dueDatesSet = useMemo(() => {
    const set = new Map<string, { total: number; count: number; hasOverdue: boolean }>();
    recebimentos.forEach((r) => {
      const key = r.due_date;
      const existing = set.get(key) ?? { total: 0, count: 0, hasOverdue: false };
      existing.total += Number(r.amount);
      existing.count += 1;
      if (r.status === "vencido") existing.hasOverdue = true;
      set.set(key, existing);
    });
    return set;
  }, [recebimentos]);

  const selectedDayItems = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return recebimentos.filter((r) => r.due_date === key);
  }, [selectedDate, recebimentos]);

  const timelineItems = useMemo(() => {
    return recebimentos.sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [recebimentos]);

  const monthTotal = recebimentos.reduce((s, r) => s + Number(r.amount), 0);
  const monthReceitas = recebimentos.filter(r => r.type === "receita").reduce((s, r) => s + Number(r.amount), 0);
  const monthDespesas = recebimentos.filter(r => r.type === "despesa").reduce((s, r) => s + Number(r.amount), 0);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Calendário de Recebimentos</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline" className="text-xs">
            <DollarSign className="h-3 w-3 mr-1" />
            Total: {formatCurrency(monthTotal)}
          </Badge>
          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
            Receitas: {formatCurrency(monthReceitas)}
          </Badge>
          <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
            Despesas: {formatCurrency(monthDespesas)}
          </Badge>
        </div>

        {isLoading ? (
          <Skeleton className="h-[350px] w-full" />
        ) : (
          <Tabs defaultValue="calendario">
            <TabsList className="mb-4">
              <TabsTrigger value="calendario">
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                Calendário
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Timeline
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendario">
              <div className="grid gap-4 lg:grid-cols-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  locale={ptBR}
                  className="p-3 pointer-events-auto rounded-lg border"
                  modifiers={{
                    hasDue: (date) => dueDatesSet.has(format(date, "yyyy-MM-dd")),
                    hasOverdue: (date) => dueDatesSet.get(format(date, "yyyy-MM-dd"))?.hasOverdue ?? false,
                  }}
                  modifiersStyles={{
                    hasDue: {
                      fontWeight: 700,
                      backgroundColor: "hsl(var(--primary) / 0.1)",
                      borderRadius: "6px",
                    },
                    hasOverdue: {
                      backgroundColor: "hsl(var(--destructive) / 0.1)",
                      borderRadius: "6px",
                    },
                  }}
                />
                <div className="min-h-[200px]">
                  {selectedDate ? (
                    <>
                      <p className="text-sm font-medium mb-3">
                        {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                      </p>
                      {selectedDayItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum vencimento neste dia</p>
                      ) : (
                        <ul className="space-y-2">
                          {selectedDayItems.map((item) => (
                            <li key={item.id} className="rounded-lg border p-3 text-sm space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium truncate">{item.description}</span>
                                <span className={cn("font-semibold tabular-nums", item.type === "receita" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                  {item.type === "despesa" ? "-" : "+"}{formatCurrency(Number(item.amount))}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {item.client && <span className="text-xs text-muted-foreground">{item.client}</span>}
                                <Badge variant="outline" className={cn("text-[10px]", item.status === "vencido" && "text-destructive border-destructive")}>
                                  {item.status}
                                </Badge>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <CalendarIcon className="h-8 w-8 mb-2 opacity-30" />
                      <p className="text-sm">Selecione um dia para ver detalhes</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="timeline">
              {timelineItems.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <Clock className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm">Nenhum vencimento neste mês</p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-0">
                  <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />
                  {timelineItems.map((item, idx) => {
                    const showDateHeader = idx === 0 || item.due_date !== timelineItems[idx - 1].due_date;
                    const isOverdue = item.status === "vencido";
                    return (
                      <div key={item.id}>
                        {showDateHeader && (
                          <div className="flex items-center gap-2 py-2">
                            <div className={cn("absolute left-1 w-4 h-4 rounded-full border-2 bg-background", isOverdue ? "border-destructive" : "border-primary")} />
                            <span className="text-xs font-semibold text-muted-foreground">
                              {format(new Date(item.due_date + "T12:00:00"), "dd/MM — EEEE", { locale: ptBR })}
                            </span>
                          </div>
                        )}
                        <div className="ml-4 mb-2 rounded-lg border p-3 text-sm hover:bg-accent/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              {isOverdue && <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                              <span className="font-medium truncate">{item.description}</span>
                            </div>
                            <span className={cn("font-semibold tabular-nums shrink-0", item.type === "receita" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                              {item.type === "despesa" ? "-" : "+"}{formatCurrency(Number(item.amount))}
                            </span>
                          </div>
                          {item.client && <p className="text-xs text-muted-foreground mt-0.5">{item.client}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
