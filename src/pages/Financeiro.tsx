import { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRecentes } from "@/hooks/useRecentes";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DollarSign, TrendingUp, TrendingDown, Clock, Plus, Eye,
  MoreHorizontal, ChevronLeft, ChevronRight, Building2, Monitor,
  Smartphone, Plane, BookOpen, Scale, Users, Pencil, Trash2,
  AlertCircle, CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import type { TooltipProps } from "recharts";
import { useFinancialTransactions, FinancialTransaction } from "@/hooks/useFinancialTransactions";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { useUpcomingPayments } from "@/hooks/useUpcomingPayments";
import { useLegalCases } from "@/hooks/useLegalCases";
import { HubKpiCards } from "@/components/financeiro/HubKpiCards";
import { LegalCasesManager } from "@/components/financeiro/LegalCasesManager";
import { DelinquencyDashboard } from "@/components/financeiro/DelinquencyDashboard";
import { CustasProvisao } from "@/components/financeiro/CustasProvisao";
import { CashFlowComparison } from "@/components/financeiro/CashFlowComparison";
import { RecebimentosCalendario } from "@/components/financeiro/RecebimentosCalendario";
import { ReceitaTipoDonut } from "@/components/financeiro/ReceitaTipoDonut";
import { ROIAreaTable } from "@/components/financeiro/ROIAreaTable";

// ── Constants ─────────────────────────────────────────
const AREAS = ["Trabalhista", "Cível", "Criminal", "Tributário", "Empresarial", "Família", "Previdenciário", "Outro"];
const CATEGORIES_RECEITA = ["Honorários", "Consultoria", "Êxito", "Retainer", "Outro"];
const CATEGORIES_DESPESA = ["Aluguel", "Salários", "Software", "Marketing", "Cartório", "Deslocamento", "Custas", "Telecom", "Viagens", "Cursos", "RH", "Outros"];
const PIE_COLORS = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#2563EB", "#8B5CF6", "#EC4899", "#14B8A6"];
const CATEGORIA_ICONS: Record<string, typeof Building2> = { Aluguel: Building2, Software: Monitor, Telecom: Smartphone, Viagens: Plane, Cursos: BookOpen, Custas: Scale, RH: Users };
const ITEMS_PER_PAGE = 8;

const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const parseCurrency = (s: string) => {
  const cleaned = s.replace(/[^\d,.-]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
};

// ── Helpers ───────────────────────────────────────────
function getDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  let s: Date, e: Date;
  switch (period) {
    case "mes_anterior": s = startOfMonth(subMonths(now, 1)); e = endOfMonth(subMonths(now, 1)); break;
    case "trimestre": s = startOfMonth(subMonths(now, 2)); e = endOfMonth(now); break;
    case "ano": s = startOfYear(now); e = endOfYear(now); break;
    case "todos": s = new Date(2000, 0, 1); e = new Date(2100, 0, 1); break;
    case "mes": default: s = startOfMonth(now); e = endOfMonth(now); break;
  }
  return { start: format(s, "yyyy-MM-dd"), end: format(e, "yyyy-MM-dd") };
}

// ── Sub-components ────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pago: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
    recebido: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
    pendente: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800",
    vencido: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
    cancelado: "bg-muted text-muted-foreground border-border",
  };
  return (
    <Badge variant="outline" className={`text-xs font-medium capitalize ${map[status] ?? ""}`}>
      {status}
    </Badge>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function DatePickerField({ label, value, onChange }: { label: string; value: Date | undefined; onChange: (d: Date | undefined) => void }) {
  return (
    <Field label={label}>
      <Popover modal={false}>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}>
            <Clock className="mr-2 h-4 w-4" />
            {value ? format(value, "dd/MM/yyyy") : "Selecionar data…"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[9999] pointer-events-auto" align="start">
          <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className={cn("p-3 pointer-events-auto")} />
        </PopoverContent>
      </Popover>
    </Field>
  );
}

function ClientAutocompleteField({ value, onChange, clientId, onClientIdChange }: { value: string; onChange: (v: string) => void; clientId: string | null; onClientIdChange: (id: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<{ id: string; nome_completo: string }[]>([]);

  useEffect(() => {
    supabase
      .from("lex_clients")
      .select("id, nome_completo")
      .order("nome_completo")
      .then(({ data }) => setClients(data ?? []));
  }, []);

  const trimmed = value.trim();
  const filtered = trimmed
    ? clients.filter(c => c.nome_completo.toLowerCase().includes(trimmed.toLowerCase()))
    : clients;

  const exactMatch = trimmed && clients.some(c => c.nome_completo.toLowerCase() === trimmed.toLowerCase());
  const selectedClient = clientId ? clients.find(c => c.id === clientId) : null;

  return (
    <Field label="Cliente / Fornecedor">
      <div className="relative">
        <Input
          value={value}
          onChange={e => { onChange(e.target.value); onClientIdChange(null); if (!open) setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => { setTimeout(() => setOpen(false), 150); }}
          placeholder="Buscar cadastrado ou digitar nome livre..."
          autoComplete="off"
        />
        {open && (
          <div className="absolute left-0 right-0 top-full mt-1 z-[9999] rounded-md border border-border bg-popover shadow-md">
            <ul className="max-h-52 overflow-y-auto">
              {trimmed && !exactMatch && (
                <li
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border flex items-center gap-2"
                  onMouseDown={e => { e.preventDefault(); onChange(trimmed); onClientIdChange(null); setOpen(false); }}
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>Usar: <span className="font-medium text-foreground">"{trimmed}"</span></span>
                </li>
              )}
              {filtered.slice(0, 20).map(c => (
                <li
                  key={c.id}
                  className={cn(
                    "px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors",
                    clientId === c.id && "bg-accent"
                  )}
                  onMouseDown={e => { e.preventDefault(); onChange(c.nome_completo); onClientIdChange(c.id); setOpen(false); }}
                >
                  {c.nome_completo}
                </li>
              ))}
              {filtered.length === 0 && !trimmed && (
                <li className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente cadastrado</li>
              )}
            </ul>
          </div>
        )}
      </div>
      {selectedClient ? (
        <p className="text-xs text-muted-foreground mt-1">
          Vinculado ao cliente: <span className="font-medium text-foreground">{selectedClient.nome_completo}</span>
        </p>
      ) : trimmed && !clientId ? (
        <p className="text-xs text-muted-foreground mt-1">Nome livre (sem vínculo a cadastro)</p>
      ) : null}
    </Field>
  );
}

function PaginatedTable<T>({ items, renderRow, headers }: { items: T[]; renderRow: (item: T, index: number) => React.ReactNode; headers: React.ReactNode }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const pageItems = items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  if (page > totalPages) setPage(1);

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>{headers}</TableRow></TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Nenhum registro encontrado</TableCell></TableRow>
            ) : pageItems.map(renderRow)}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button key={p} variant={p === page ? "default" : "ghost"} size="icon" className="h-8 w-8 text-xs" onClick={() => setPage(p)}>{p}</Button>
          ))}
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}
    </>
  );
}

// ── Main Component ────────────────────────────────────
export default function Financeiro() {
  const [periodo, setPeriodo] = useState("mes");
  const [activeTab, setActiveTab] = useState("visao-geral");
  const range = useMemo(() => getDateRange(periodo), [periodo]);

  // Data hooks
  const { transactionsQuery, createTransaction, updateTransaction, deleteTransaction } = useFinancialTransactions({
    dateFrom: range.start,
    dateTo: range.end,
  });
  const { data: summary, isLoading: summaryLoading } = useFinancialSummary(range.start, range.end);
  const { data: upcomingPayments = [], isLoading: upcomingLoading } = useUpcomingPayments(30);
  const { potencialExito, burnRate } = useLegalCases();
  const { registrarAcesso } = useRecentes();

  // All-time financial data for saldo
  const { data: allTimeSummary } = useFinancialSummary("2000-01-01", "2100-01-01");

  const transactions = transactionsQuery.data ?? [];
  const receitas = transactions.filter(t => t.type === "receita");
  const despesas = transactions.filter(t => t.type === "despesa");

  // Hub KPI data
  const saldoConta = (allTimeSummary?.receitasRecebidas ?? 0) - (allTimeSummary?.totalDespesas ?? 0);
  const previsaoRecebimento = summary?.aReceber ?? 0;

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [viewModal, setViewModal] = useState<FinancialTransaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formType, setFormType] = useState<"receita" | "despesa">("receita");
  const [formDesc, setFormDesc] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formArea, setFormArea] = useState("");
  const [formClient, setFormClient] = useState("");
  const [formClientId, setFormClientId] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState("pendente");
  const [formDueDate, setFormDueDate] = useState<Date>();
  const [formPaidAt, setFormPaidAt] = useState<Date>();
  const [formNotes, setFormNotes] = useState("");

  const resetForm = () => {
    setFormType("receita"); setFormDesc(""); setFormAmount(""); setFormCategory("");
    setFormArea(""); setFormClient(""); setFormClientId(null); setFormStatus("pendente");
    setFormDueDate(undefined); setFormPaidAt(undefined); setFormNotes("");
    setEditingTransaction(null);
  };

  const openCreate = (type: "receita" | "despesa") => {
    resetForm();
    setFormType(type);
    setModalOpen(true);
  };

  const openEdit = (t: FinancialTransaction) => {
    setEditingTransaction(t);
    setFormType(t.type as "receita" | "despesa");
    setFormDesc(t.description);
    setFormAmount(String(Number(t.amount)));
    setFormCategory(t.category);
    setFormArea(t.area ?? "");
    setFormClient(t.client ?? "");
    setFormClientId(t.client_id ?? null);
    setFormStatus(t.status);
    setFormDueDate(t.due_date ? new Date(t.due_date + "T12:00:00") : undefined);
    setFormPaidAt(t.paid_at ? new Date(t.paid_at + "T12:00:00") : undefined);
    setFormNotes(t.notes ?? "");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formDesc || !formAmount) { toast.error("Preencha descrição e valor"); return; }
    const payload = {
      description: formDesc,
      type: formType,
      amount: parseFloat(formAmount) || 0,
      category: formCategory || (formType === "receita" ? "Honorários" : "Outros"),
      area: formArea || undefined,
      client: formClient || undefined,
      client_id: formClientId || undefined,
      status: formStatus,
      due_date: formDueDate ? format(formDueDate, "yyyy-MM-dd") : undefined,
      paid_at: formPaidAt ? format(formPaidAt, "yyyy-MM-dd") : undefined,
      notes: formNotes || undefined,
    };

    try {
      if (editingTransaction) {
        await updateTransaction.mutateAsync({ id: editingTransaction.id, ...payload });
        toast.success("Transação atualizada!");
      } else {
        await createTransaction.mutateAsync(payload);
        toast.success(formType === "receita" ? "Receita adicionada!" : "Despesa adicionada!");
      }
      setModalOpen(false);
      resetForm();
    } catch {
      toast.error("Erro ao salvar transação");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteTransaction.mutateAsync(deleteConfirm);
      toast.success("Transação excluída!");
    } catch {
      toast.error("Erro ao excluir");
    }
    setDeleteConfirm(null);
  };

  const handleMarkPaid = async (t: FinancialTransaction) => {
    const newStatus = t.type === "receita" ? "recebido" : "pago";
    try {
      await updateTransaction.mutateAsync({
        id: t.id,
        status: newStatus,
        paid_at: format(new Date(), "yyyy-MM-dd"),
      });
      toast.success(`Marcado como ${newStatus}!`);
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  // Charts data
  const receitaAreaData = summary?.areaChartData ?? [];
  const despesasCategoriaChart = summary?.despesasChartData ?? [];
  const cashFlowData = summary?.cashFlowData ?? [];

  const categories = formType === "receita" ? CATEGORIES_RECEITA : CATEGORIES_DESPESA;

  const actionButtons = (t: FinancialTransaction) => (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setViewModal(t); registrarAcesso.mutate({ tipo: "honorario", item_id: t.id, item_nome: t.description, item_path: "/financeiro" }); }}><Eye className="h-3.5 w-3.5" /></Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5 mr-2" />Editar</DropdownMenuItem>
          {!["recebido", "pago"].includes(t.status) && (
            <DropdownMenuItem onClick={() => handleMarkPaid(t)}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-2" />{t.type === "receita" ? "Marcar recebido" : "Marcar pago"}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirm(t.id)}>
            <Trash2 className="h-3.5 w-3.5 mr-2" />Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const isLoading = transactionsQuery.isLoading || summaryLoading;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* TOP BAR */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-semibold text-2xl text-foreground">Hub Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestão financeira e jurídica integrada</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-44 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Este mês</SelectItem>
              <SelectItem value="mes_anterior">Mês anterior</SelectItem>
              <SelectItem value="trimestre">Últimos 3 meses</SelectItem>
              <SelectItem value="ano">Este ano</SelectItem>
              <SelectItem value="todos">Visão Geral</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => openCreate("receita")}><Plus className="h-4 w-4" /> Nova Receita</Button>
          <Button size="sm" variant="outline" onClick={() => openCreate("despesa")}><Plus className="h-4 w-4" /> Nova Despesa</Button>
        </div>
      </div>

      {/* HUB KPI CARDS */}
      <HubKpiCards
        data={{ saldoConta, previsaoRecebimento, potencialExito, burnRate }}
        isLoading={isLoading}
      />

      {/* MAIN TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="acoes">Ações Judiciais</TabsTrigger>
          <TabsTrigger value="transacoes">Transações</TabsTrigger>
          <TabsTrigger value="inadimplencia">Inadimplência</TabsTrigger>
        </TabsList>

        {/* TAB: Visão Geral */}
        <TabsContent value="visao-geral" className="space-y-6 mt-6">
          {/* Charts Row */}
          {/* Fluxo Projetado vs Realizado + Donut Tipo Honorário */}
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <CashFlowComparison />
            </div>
            <div className="lg:col-span-2">
              <ReceitaTipoDonut />
            </div>
          </div>

          {/* Receita por Área + Despesas por Categoria */}
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardContent className="pt-6">
                <h2 className="font-semibold text-lg mb-4">Receita por Área</h2>
                {receitaAreaData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[320px] text-muted-foreground">
                    <DollarSign className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">Sem dados de receita no período</p>
                  </div>
                ) : (() => {
                  const areaTotal = receitaAreaData.reduce((s: number, d: { value: number }) => s + d.value, 0);
                  return (
                    <div className="flex flex-col items-center gap-4">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={receitaAreaData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270} cornerRadius={6}>
                            {receitaAreaData.map((_: unknown, i: number) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                          </Pie>
                          <Tooltip content={({ active, payload }: TooltipProps<number, string>) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload as { name: string; value: number };
                            const pct = areaTotal > 0 ? ((d.value / areaTotal) * 100).toFixed(1) : "0";
                            return (
                              <div className="rounded-lg border border-border/50 bg-background px-3 py-2 shadow-xl text-xs">
                                <p className="font-medium text-foreground">{d.name}</p>
                                <p className="text-muted-foreground">{formatCurrency(d.value)}</p>
                                <p className="text-muted-foreground">{pct}% do total</p>
                              </div>
                            );
                          }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="w-full space-y-1.5 px-2">
                        {receitaAreaData.map((d: { name: string; value: number }, i: number) => {
                          const pct = areaTotal > 0 ? ((d.value / areaTotal) * 100).toFixed(1) : "0";
                          return (
                            <div key={d.name} className="flex items-center gap-2 text-sm">
                              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                              <span className="flex-1 text-foreground truncate">{d.name}</span>
                              <span className="text-muted-foreground tabular-nums">{formatCurrency(d.value)}</span>
                              <span className="text-muted-foreground tabular-nums w-12 text-right">{pct}%</span>
                            </div>
                          );
                        })}
                        <div className="border-t border-border my-1.5" />
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-foreground" />
                          <span className="flex-1 text-foreground">Valor total</span>
                          <span className="tabular-nums text-foreground">{formatCurrency(areaTotal)}</span>
                          <span className="tabular-nums w-12 text-right text-foreground">100%</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
            <div className="lg:col-span-2 space-y-6">
              <CustasProvisao />
              <Card>
                <CardContent className="pt-6">
                  <h2 className="font-semibold text-lg mb-4">Despesas por Categoria</h2>
                  {despesasCategoriaChart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                      <TrendingDown className="h-10 w-10 mb-2 opacity-30" />
                      <p className="text-sm">Sem despesas no período</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={despesasCategoriaChart} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" tickFormatter={(v: number) => `${v / 1000}k`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Valor" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Calendário de Recebimentos */}
          <RecebimentosCalendario />

          {/* ROI por Área */}
          <ROIAreaTable />

          {/* Vencimentos Próximos */}
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardContent className="pt-6">
                <h2 className="font-semibold text-lg mb-4">Vencimentos Próximos</h2>
                {upcomingLoading ? (
                  <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
                ) : upcomingPayments.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">Nenhum vencimento nos próximos 30 dias</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {upcomingPayments.map((v) => (
                      <li key={v.id} className="group flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn("rounded-full p-1.5", v.is_overdue ? "bg-destructive/10" : (v.days_until_due ?? 99) <= 7 ? "bg-warning/10" : "bg-muted")}>
                            {v.is_overdue ? <AlertCircle className="h-4 w-4 text-destructive" /> : <Clock className="h-4 w-4 text-warning" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{v.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {v.is_overdue
                                ? `Vencido há ${Math.abs(v.days_until_due)} dia(s)`
                                : v.days_until_due === 0
                                  ? "Vence hoje"
                                  : `Vence em ${v.days_until_due} dia(s)`}
                              {v.client && ` • ${v.client}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={cn("text-xs font-medium", v.is_overdue ? "text-destructive" : (v.days_until_due ?? 99) <= 7 ? "text-warning" : "text-muted-foreground")}>
                            {v.due_date ? format(new Date(v.due_date + "T12:00:00"), "dd/MM/yyyy") : ""}
                          </span>
                          <span className="text-sm font-semibold text-primary">{formatCurrency(Number(v.amount))}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => openEdit(v as FinancialTransaction)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 text-xs h-7"
                            onClick={() => handleMarkPaid(v as FinancialTransaction)}
                            disabled={updateTransaction.isPending}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            {v.type === "receita" ? "Recebido" : "Pago"}
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: Ações Judiciais */}
        <TabsContent value="acoes" className="mt-6">
          <LegalCasesManager />
        </TabsContent>

        {/* TAB: Transações */}
        <TabsContent value="transacoes" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="receitas">
                <TabsList>
                  <TabsTrigger value="receitas">Receitas</TabsTrigger>
                  <TabsTrigger value="despesas">Despesas</TabsTrigger>
                  <TabsTrigger value="todas">Todas</TabsTrigger>
                </TabsList>

                <TabsContent value="receitas">
                  <div className="flex justify-end mb-3">
                    <Button size="sm" variant="outline" onClick={() => openCreate("receita")}><Plus className="h-4 w-4 mr-1" />Nova Receita</Button>
                  </div>
                  <PaginatedTable
                    items={receitas}
                    headers={<><TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead>Área</TableHead><TableHead>Cliente</TableHead><TableHead>Valor</TableHead><TableHead>Vencimento</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></>}
                    renderRow={(t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.description}</TableCell>
                        <TableCell>{t.category}</TableCell>
                        <TableCell className="text-muted-foreground">{t.area ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{t.client ?? "—"}</TableCell>
                        <TableCell>{formatCurrency(Number(t.amount))}</TableCell>
                        <TableCell>{t.due_date ? format(new Date(t.due_date + "T12:00:00"), "dd/MM/yyyy") : "—"}</TableCell>
                        <TableCell><StatusBadge status={t.status} /></TableCell>
                        <TableCell>{actionButtons(t)}</TableCell>
                      </TableRow>
                    )}
                  />
                </TabsContent>

                <TabsContent value="despesas">
                  <div className="flex justify-end mb-3">
                    <Button size="sm" variant="outline" onClick={() => openCreate("despesa")}><Plus className="h-4 w-4 mr-1" />Nova Despesa</Button>
                  </div>
                  <PaginatedTable
                    items={despesas}
                    headers={<><TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead>Cliente/Fornecedor</TableHead><TableHead>Valor</TableHead><TableHead>Vencimento</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></>}
                    renderRow={(t) => {
                      const CatIcon = CATEGORIA_ICONS[t.category] || DollarSign;
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.description}</TableCell>
                          <TableCell><span className="inline-flex items-center gap-1.5 text-sm"><CatIcon className="h-3.5 w-3.5 text-muted-foreground" />{t.category}</span></TableCell>
                          <TableCell className="text-muted-foreground">{t.client ?? "—"}</TableCell>
                          <TableCell>{formatCurrency(Number(t.amount))}</TableCell>
                          <TableCell>{t.due_date ? format(new Date(t.due_date + "T12:00:00"), "dd/MM/yyyy") : "—"}</TableCell>
                          <TableCell><StatusBadge status={t.status} /></TableCell>
                          <TableCell>{actionButtons(t)}</TableCell>
                        </TableRow>
                      );
                    }}
                  />
                </TabsContent>

                <TabsContent value="todas">
                  <PaginatedTable
                    items={transactions}
                    headers={<><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead>Valor</TableHead><TableHead>Vencimento</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></>}
                    renderRow={(t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Badge variant="outline" className={t.type === "receita" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800" : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800"}>
                            {t.type === "receita" ? "Receita" : "Despesa"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{t.description}</TableCell>
                        <TableCell>{t.category}</TableCell>
                        <TableCell>{formatCurrency(Number(t.amount))}</TableCell>
                        <TableCell>{t.due_date ? format(new Date(t.due_date + "T12:00:00"), "dd/MM/yyyy") : "—"}</TableCell>
                        <TableCell><StatusBadge status={t.status} /></TableCell>
                        <TableCell>{actionButtons(t)}</TableCell>
                      </TableRow>
                    )}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Inadimplência */}
        <TabsContent value="inadimplencia" className="mt-6">
          <DelinquencyDashboard />
        </TabsContent>
      </Tabs>

      {/* ── CREATE/EDIT MODAL ── */}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) { setModalOpen(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? "Editar Transação" : formType === "receita" ? "Nova Receita" : "Nova Despesa"}</DialogTitle>
            <DialogDescription>Preencha os dados abaixo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 px-1 -mx-1 max-h-[60vh] overflow-y-auto overflow-x-visible">
            <div className="flex gap-2">
              {(["receita", "despesa"] as const).map(t => (
                <Button
                  key={t}
                  type="button"
                  variant={formType === t ? "default" : "outline"}
                  className={cn("flex-1 capitalize", formType === t && t === "receita" && "bg-success hover:bg-success/90", formType === t && t === "despesa" && "bg-destructive hover:bg-destructive/90")}
                  onClick={() => setFormType(t)}
                >
                  {t === "receita" ? "Receita" : "Despesa"}
                </Button>
              ))}
            </div>

            <Field label="Descrição *"><Input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Ex: Honorários — Processo Trabalhista" /></Field>
            <Field label="Valor (R$) *"><CurrencyInput value={formAmount} onChange={setFormAmount} /></Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Categoria">
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent className="z-[9999]">{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value={formType === "receita" ? "recebido" : "pago"}>{formType === "receita" ? "Recebido" : "Pago"}</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {formType === "receita" && (
              <Field label="Área Jurídica">
                <Select value={formArea} onValueChange={setFormArea}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent className="z-[9999]">{AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            )}

            <ClientAutocompleteField value={formClient} onChange={setFormClient} clientId={formClientId} onClientIdChange={setFormClientId} />

            <div className="grid grid-cols-2 gap-4">
              <DatePickerField label="Vencimento" value={formDueDate} onChange={setFormDueDate} />
              <DatePickerField label="Data de Pagamento" value={formPaidAt} onChange={setFormPaidAt} />
            </div>

            <Field label="Observações"><Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Opcional" /></Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setModalOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createTransaction.isPending || updateTransaction.isPending}>
              {(createTransaction.isPending || updateTransaction.isPending) ? "Salvando..." : editingTransaction ? "Salvar Alterações" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Detail Modal */}
      <Dialog open={!!viewModal} onOpenChange={(open) => { if (!open) setViewModal(null); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Transação</DialogTitle>
            <DialogDescription>Visualização somente leitura.</DialogDescription>
          </DialogHeader>
          {viewModal && (
            <div className="space-y-3 py-2">
              {[
                ["Tipo", viewModal.type === "receita" ? "Receita" : "Despesa"],
                ["Descrição", viewModal.description],
                ["Valor", formatCurrency(Number(viewModal.amount))],
                ["Categoria", viewModal.category],
                ["Área", viewModal.area ?? "—"],
                ["Cliente", viewModal.client ?? "—"],
                ["Status", viewModal.status],
                ["Vencimento", viewModal.due_date ? format(new Date(viewModal.due_date + "T12:00:00"), "dd/MM/yyyy") : "—"],
                ["Data Pagamento", viewModal.paid_at ? format(new Date(viewModal.paid_at + "T12:00:00"), "dd/MM/yyyy") : "—"],
                ["Observações", viewModal.notes ?? "—"],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium text-right max-w-[60%] capitalize">{val}</span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter><Button variant="ghost" onClick={() => setViewModal(null)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir esta transação?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
