import { useState, useEffect, useRef } from "react";
import { Plus, Scale, Eye, Pencil, Trash2, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useLegalCases, LegalCase, getRiskWeight } from "@/hooks/useLegalCases";
import { formatCNJ } from "@/lib/formatCNJ";

const AREAS = ["Trabalhista", "Cível", "Criminal", "Tributário", "Empresarial", "Família", "Previdenciário", "Outro"];
const ITEMS_PER_PAGE = 8;
const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function RiskBadge({ risk }: { risk: string }) {
  const styles: Record<string, string> = {
    baixa: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
    media: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800",
    alta: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
  };
  const labels: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };
  return <Badge variant="outline" className={`text-xs font-medium ${styles[risk] ?? ""}`}>{labels[risk] ?? risk}</Badge>;
}

function StatusCaseBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ativa: "bg-primary/10 text-primary border-primary/30",
    encerrada: "bg-muted text-muted-foreground border-border",
    suspensa: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800",
  };
  return <Badge variant="outline" className={`text-xs font-medium capitalize ${styles[status] ?? ""}`}>{status}</Badge>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export function LegalCasesManager() {
  const { casesQuery, createCase, updateCase, deleteCase } = useLegalCases();
  const cases = casesQuery.data ?? [];

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LegalCase | null>(null);
  const [viewCase, setViewCase] = useState<LegalCase | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterArea, setFilterArea] = useState("__all__");
  const [filterStatus, setFilterStatus] = useState("__all__");

  // Form
  const [fNumero, setFNumero] = useState("");
  const [fArea, setFArea] = useState("Cível");
  const [fValor, setFValor] = useState("");
  const [fPercentual, setFPercentual] = useState("");
  const [fCusto, setFCusto] = useState("");
  const [fCustas, setFCustas] = useState("");
  const [fData, setFData] = useState<Date>();
  const [fRisco, setFRisco] = useState("media");
  const [fStatus, setFStatus] = useState("ativa");
  const [fCliente, setFCliente] = useState("");
  const [fClientId, setFClientId] = useState<string | null>(null);
  const [fDescricao, setFDescricao] = useState("");
  const [fTipoHon, setFTipoHon] = useState("contratual");

  // Client autocomplete
  const [clientOpen, setClientOpen] = useState(false);
  const [clients, setClients] = useState<{ id: string; nome_completo: string }[]>([]);
  useEffect(() => {
    supabase.from("lex_clients").select("id, nome_completo").order("nome_completo")
      .then(({ data }) => setClients((data as []) ?? []));
  }, []);

  const resetForm = () => {
    setFNumero(""); setFArea("Cível"); setFValor(""); setFPercentual("");
    setFCusto(""); setFCustas(""); setFData(undefined); setFRisco("media");
    setFStatus("ativa"); setFCliente(""); setFClientId(null); setFDescricao("");
    setFTipoHon("contratual"); setEditing(null);
  };

  const openCreate = () => { resetForm(); setModalOpen(true); };
  const openEdit = (c: LegalCase) => {
    setEditing(c);
    setFNumero(c.numero_processo); setFArea(c.area);
    setFValor(String(c.valor_causa)); setFPercentual(String(c.percentual_honorarios));
    setFCusto(String(c.custo_mensal)); setFCustas(String(c.custas_adiantadas));
    setFData(c.data_prevista_encerramento ? new Date(c.data_prevista_encerramento + "T12:00:00") : undefined);
    setFRisco(c.score_risco); setFStatus(c.status);
    setFCliente(c.cliente ?? ""); setFClientId(c.client_id);
    setFDescricao(c.descricao ?? ""); setFTipoHon(c.tipo_honorario);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!fNumero) { toast.error("Número do processo é obrigatório"); return; }
    const payload = {
      numero_processo: fNumero,
      area: fArea,
      valor_causa: parseFloat(fValor) || 0,
      percentual_honorarios: parseFloat(fPercentual.replace(",", ".")) || 0,
      custo_mensal: parseFloat(fCusto) || 0,
      custas_adiantadas: parseFloat(fCustas) || 0,
      data_prevista_encerramento: fData ? format(fData, "yyyy-MM-dd") : null,
      score_risco: fRisco,
      status: fStatus,
      cliente: fCliente || null,
      client_id: fClientId,
      descricao: fDescricao || null,
      tipo_honorario: fTipoHon,
    };
    try {
      if (editing) {
        await updateCase.mutateAsync({ id: editing.id, ...payload });
        toast.success("Ação atualizada!");
      } else {
        await createCase.mutateAsync(payload as any);
        toast.success("Ação cadastrada!");
      }
      setModalOpen(false); resetForm();
    } catch { toast.error("Erro ao salvar"); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteCase.mutateAsync(deleteId); toast.success("Ação excluída!"); }
    catch { toast.error("Erro ao excluir"); }
    setDeleteId(null);
  };

  // Filters
  const filtered = cases.filter(c =>
    (filterArea === "__all__" || c.area === filterArea) &&
    (filterStatus === "__all__" || c.status === filterStatus)
  );

  // Pagination
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  if (page > totalPages && totalPages > 0) setPage(1);

  const filteredClients = fCliente.trim()
    ? clients.filter(c => c.nome_completo.toLowerCase().includes(fCliente.trim().toLowerCase()))
    : clients;

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" /> Ações Judiciais
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filterArea} onValueChange={v => { setFilterArea(v); setPage(1); }}>
                <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as áreas</SelectItem>
                  {AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
                <SelectTrigger className="w-32 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  <SelectItem value="ativa">Ativas</SelectItem>
                  <SelectItem value="encerrada">Encerradas</SelectItem>
                  <SelectItem value="suspensa">Suspensas</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Nova Ação</Button>
            </div>
          </div>

          {casesQuery.isLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Processo</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Valor da Causa</TableHead>
                      <TableHead>% Hon.</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead>Potencial</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageItems.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma ação cadastrada</TableCell></TableRow>
                    ) : pageItems.map(c => {
                      const potencial = Number(c.valor_causa) * (Number(c.percentual_honorarios) / 100) * getRiskWeight(c.score_risco);
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium font-mono text-sm">{formatCNJ(c.numero_processo)}</TableCell>
                          <TableCell>{c.area}</TableCell>
                          <TableCell className="text-muted-foreground">{c.cliente ?? "—"}</TableCell>
                          <TableCell>{formatCurrency(Number(c.valor_causa))}</TableCell>
                          <TableCell>{c.percentual_honorarios}%</TableCell>
                          <TableCell><RiskBadge risk={c.score_risco} /></TableCell>
                          <TableCell className="font-medium">{formatCurrency(potencial)}</TableCell>
                          <TableCell><StatusCaseBadge status={c.status} /></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewCase(c)}><Eye className="h-3.5 w-3.5" /></Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5 mr-2" />Editar</DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5 mr-2" />Excluir</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 pt-4">
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <Button key={p} variant={p === page ? "default" : "ghost"} size="icon" className="h-8 w-8 text-xs" onClick={() => setPage(p)}>{p}</Button>
                  ))}
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={o => { if (!o) { setModalOpen(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Ação" : "Nova Ação Judicial"}</DialogTitle>
            <DialogDescription>Cadastre os dados do processo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto overflow-x-visible px-1 -mx-1">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Número do Processo *"><Input value={formatCNJ(fNumero)} onChange={e => setFNumero(e.target.value.replace(/\D/g, "").slice(0, 20))} placeholder="0000000-00.0000.0.00.0000" /></Field>
              <Field label="Área Jurídica">
                <Select value={fArea} onValueChange={setFArea}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[9999]">{AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Valor da Causa (R$)"><CurrencyInput value={fValor} onChange={setFValor} /></Field>
              <Field label="% Honorários de Êxito"><Input value={fPercentual} onChange={e => setFPercentual(e.target.value)} placeholder="20" /></Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Custo Mensal Estimado (R$)"><CurrencyInput value={fCusto} onChange={setFCusto} /></Field>
              <Field label="Custas Adiantadas (R$)"><CurrencyInput value={fCustas} onChange={setFCustas} /></Field>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Score de Risco">
                <Select value={fRisco} onValueChange={setFRisco}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="baixa">Baixa (25%)</SelectItem>
                    <SelectItem value="media">Média (50%)</SelectItem>
                    <SelectItem value="alta">Alta (80%)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tipo de Honorário">
                <Select value={fTipoHon} onValueChange={setFTipoHon}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="contratual">Contratual</SelectItem>
                    <SelectItem value="sucumbencial">Sucumbencial</SelectItem>
                    <SelectItem value="consultivo">Consultivo</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={fStatus} onValueChange={setFStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="encerrada">Encerrada</SelectItem>
                    <SelectItem value="suspensa">Suspensa</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Data Prevista de Encerramento">
              <Popover modal={false}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !fData && "text-muted-foreground")}>
                    {fData ? format(fData, "dd/MM/yyyy") : "Selecionar data…"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                  <Calendar mode="single" selected={fData} onSelect={setFData} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </Field>

            {/* Client autocomplete */}
            <Field label="Cliente">
              <div className="relative">
                <Input
                  value={fCliente}
                  onChange={e => { setFCliente(e.target.value); setFClientId(null); if (!clientOpen) setClientOpen(true); }}
                  onFocus={() => setClientOpen(true)}
                  onBlur={() => setTimeout(() => setClientOpen(false), 150)}
                  placeholder="Buscar cliente cadastrado ou digitar..."
                  autoComplete="off"
                />
                {clientOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-[9999] rounded-md border border-border bg-popover shadow-md">
                    <ul className="max-h-40 overflow-y-auto">
                      {filteredClients.slice(0, 15).map(c => (
                        <li
                          key={c.id}
                          className={cn("px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors", fClientId === c.id && "bg-accent")}
                          onMouseDown={e => { e.preventDefault(); setFCliente(c.nome_completo); setFClientId(c.id); setClientOpen(false); }}
                        >{c.nome_completo}</li>
                      ))}
                      {filteredClients.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado</li>}
                    </ul>
                  </div>
                )}
              </div>
            </Field>

            <Field label="Descrição"><Textarea value={fDescricao} onChange={e => setFDescricao(e.target.value)} placeholder="Detalhes da ação..." /></Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setModalOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createCase.isPending || updateCase.isPending}>
              {(createCase.isPending || updateCase.isPending) ? "Salvando..." : editing ? "Salvar Alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Detail */}
      <Dialog open={!!viewCase} onOpenChange={o => { if (!o) setViewCase(null); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Ação</DialogTitle>
            <DialogDescription>Visualização somente leitura.</DialogDescription>
          </DialogHeader>
          {viewCase && (
            <div className="space-y-3 py-2">
              {([
                ["Processo", formatCNJ(viewCase.numero_processo)],
                ["Área", viewCase.area],
                ["Cliente", viewCase.cliente ?? "—"],
                ["Valor da Causa", formatCurrency(Number(viewCase.valor_causa))],
                ["% Honorários", `${viewCase.percentual_honorarios}%`],
                ["Tipo Honorário", viewCase.tipo_honorario],
                ["Score de Risco", { baixa: "Baixa (25%)", media: "Média (50%)", alta: "Alta (80%)" }[viewCase.score_risco] ?? viewCase.score_risco],
                ["Potencial de Êxito", formatCurrency(Number(viewCase.valor_causa) * (Number(viewCase.percentual_honorarios) / 100) * getRiskWeight(viewCase.score_risco))],
                ["Custo Mensal", formatCurrency(Number(viewCase.custo_mensal))],
                ["Custas Adiantadas", formatCurrency(Number(viewCase.custas_adiantadas))],
                ["Data Prevista", viewCase.data_prevista_encerramento ? format(new Date(viewCase.data_prevista_encerramento + "T12:00:00"), "dd/MM/yyyy") : "—"],
                ["Status", viewCase.status],
                ["Descrição", viewCase.descricao ?? "—"],
              ] as [string, string][]).map(([label, val]) => (
                <div key={label} className="flex justify-between border-b border-border pb-2">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium text-right max-w-[60%] capitalize">{val}</span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter><Button variant="ghost" onClick={() => setViewCase(null)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta ação judicial?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
