import { useState, useEffect, useCallback } from "react";
import { formatCNJ } from "@/lib/formatCNJ";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, Loader2,
  Users, UserCheck, Scale, CalendarPlus, ChevronLeft, ChevronRight, Settings2,
} from "lucide-react";
import ClienteForm from "@/components/lex-pilot/ClienteForm";
import StatusBadge from "@/components/clientes/StatusBadge";
import StatusSettings from "@/components/clientes/StatusSettings";
import { useClientStatuses } from "@/hooks/useClientStatuses";
import type { LexClient } from "@/components/lex-pilot/types";
import { useRecentes } from "@/hooks/useRecentes";

type FilterStatus = "todos" | string;

function formatCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
}

function formatDoc(c: LexClient & { tipo_pessoa?: string }): string {
  if (c.tipo_pessoa === "pj" && c.cnpj) return formatCnpj(c.cnpj);
  return c.cpf ? formatCpf(c.cpf) : "—";
}

export default function Clientes() {
  const [clients, setClients] = useState<(LexClient & { status?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("todos");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<LexClient | null>(null);
  const [viewClient, setViewClient] = useState<LexClient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LexClient | null>(null);
  const { registrarAcesso } = useRecentes();
  const { statuses, renameStatus, changeColor, addStatus, deleteStatus } = useClientStatuses();

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lex_clients" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar clientes");
    } else {
      setClients((data as any[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // Metrics
  const totalClientes = clients.length;
  const clientesAtivos = clients.filter((c) => (c.status || "Ativo") === "Ativo").length;
  const now = new Date();
  const novosEsteMes = clients.filter((c) => {
    const d = c.created_at ? new Date(c.created_at) : null;
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.nome_completo.toLowerCase().includes(q) ||
      c.cpf.includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.telefone || "").includes(q);
    const matchesStatus =
      statusFilter === "todos" || (c.status || "Ativo") === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedClients = filtered.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("lex_clients" as any)
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      toast.error("Erro ao excluir cliente");
    } else {
      toast.success("Cliente excluído");
      setClients((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  const handleSaved = () => {
    setDrawerOpen(false);
    setEditingClient(null);
    fetchClients();
  };

  const handleStatusChanged = (clientId: string, newStatus: string) => {
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, status: newStatus } : c)));
  };

  const openEdit = (c: LexClient) => {
    setEditingClient(c);
    setDrawerOpen(true);
  };

  const openNew = () => {
    setEditingClient(null);
    setDrawerOpen(true);
  };

  const metrics = [
    { label: "Total de Clientes", value: totalClientes, icon: Users, color: "text-primary" },
    { label: "Clientes Ativos", value: clientesAtivos, icon: UserCheck, color: "text-emerald-500" },
    { label: "Com Processos Ativos", value: "—", icon: Scale, color: "text-amber-500" },
    { label: "Novos este Mês", value: novosEsteMes, icon: CalendarPlus, color: "text-foreground" },
  ];

  const filterButtons = [
    { label: "Todos", value: "todos" },
    ...statuses.map((s) => ({ label: s.name, value: s.name })),
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie seus clientes e acompanhe seus processos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <StatusSettings statuses={statuses} onRename={renameStatus} onChangeColor={changeColor} onDelete={deleteStatus} onAdd={addStatus} />
            </PopoverContent>
          </Popover>
          <Button onClick={openNew} className="gap-1.5">
            <Plus className="h-4 w-4" /> Novo Cliente
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${m.color}`}>
                <m.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-xl font-semibold">{m.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF, e-mail ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {filterButtons.map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">
          {search ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado. Clique em 'Novo Cliente' para começar."}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>CPF / CNPJ</TableHead>
                <TableHead className="hidden md:table-cell">E-mail</TableHead>
                <TableHead className="hidden md:table-cell">Telefone</TableHead>
                <TableHead className="hidden lg:table-cell">Cidade</TableHead>
                <TableHead className="hidden lg:table-cell">Cadastro</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome_completo}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {(c as any).tipo_pessoa === "pj" ? "PJ" : "PF"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{formatDoc(c)}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{c.email || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{c.telefone || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{c.cidade || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      clientId={c.id}
                      currentStatus={c.status || "Ativo"}
                      statuses={statuses}
                      onStatusChanged={handleStatusChanged}
                      onStatusCreated={addStatus}
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setViewClient(c);
                          registrarAcesso.mutate({ tipo: "colaborador", item_id: c.id, item_nome: c.nome_completo, item_path: "/clientes" });
                        }}>
                          <Eye className="h-4 w-4 mr-2" /> Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(c)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Mostrando {(safeCurrentPage - 1) * pageSize + 1}–{Math.min(safeCurrentPage * pageSize, filtered.length)} de {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={safeCurrentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)} className="gap-1">
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <span className="px-3 text-sm text-muted-foreground">{safeCurrentPage} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={safeCurrentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="gap-1">
                  Próximo <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Drawer — New/Edit */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setDrawerOpen(false); setEditingClient(null); }} />
          <div className="relative w-full max-w-lg bg-background border-l border-border shadow-xl animate-slide-in-right overflow-y-auto">
            <ClienteForm
              client={editingClient}
              onSaved={handleSaved}
              onCancel={() => { setDrawerOpen(false); setEditingClient(null); }}
            />
          </div>
        </div>
      )}

      {/* View modal */}
      <Dialog open={!!viewClient} onOpenChange={() => setViewClient(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewClient?.nome_completo}</DialogTitle>
            <DialogDescription>Detalhes do cliente</DialogDescription>
          </DialogHeader>
          {viewClient && <ClientDetailView client={viewClient} />}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir cliente</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.nome_completo}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClientDetailView({ client }: { client: LexClient & { status?: string; tipo_pessoa?: string } }) {
  const [cases, setCases] = useState<any[]>([]);
  useEffect(() => {
    if (!client?.id) return;
    supabase
      .from("legal_cases")
      .select("*")
      .eq("client_id", client.id)
      .then(({ data }) => { if (data) setCases(data); });
  }, [client?.id]);

  const isPJ = (client as any).tipo_pessoa === "pj";
  const fields: [string, string][] = [
    ["Tipo", isPJ ? "Pessoa Jurídica" : "Pessoa Física"],
    ["Status", (client as any).status || "Ativo"],
    ...(isPJ
      ? [
          ["Razão Social", (client as any).razao_social || "—"] as [string, string],
          ["CNPJ", (client as any).cnpj ? formatCnpj((client as any).cnpj) : "—"] as [string, string],
        ]
      : [
          ["CPF", client.cpf ? formatCpf(client.cpf) : "—"] as [string, string],
          ["RG", [client.rg, client.rg_emissor, client.rg_uf].filter(Boolean).join(" / ") || "—"] as [string, string],
        ]),
    [isPJ ? "Data de fundação" : "Data de nascimento", client.data_nascimento ? new Date(client.data_nascimento + "T12:00:00").toLocaleDateString("pt-BR") : "—"],
    ...(!isPJ
      ? [
          ["Estado civil", client.estado_civil || "—"] as [string, string],
          ["Profissão", client.profissao || "—"] as [string, string],
          ["Nacionalidade", client.nacionalidade || "—"] as [string, string],
        ]
      : []),
    ["E-mail", client.email || "—"],
    ["Telefone", client.telefone || "—"],
    ["Endereço", [client.rua, client.numero, client.complemento, client.bairro, client.cidade, client.estado].filter(Boolean).join(", ") || "—"],
    ["CEP", client.cep || "—"],
    ["Observações", client.observacoes || "—"],
  ];
  return (
    <div className="space-y-3">
      {fields.map(([label, value]) => (
        <div key={label}>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm">{value}</p>
        </div>
      ))}

      {cases.length > 0 && (
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-2">Processos vinculados</p>
          <div className="space-y-2">
            {cases.map((c: any) => (
              <div key={c.id} className="flex items-center gap-2 text-sm">
                <span className="font-mono text-xs">{formatCNJ(c.numero_processo)}</span>
                <Badge variant="secondary" className="text-[10px]">{c.area}</Badge>
                <Badge variant={c.status === "ativa" ? "default" : "outline"} className="text-[10px]">
                  {c.status === "ativa" ? "Ativo" : c.status === "encerrada" ? "Encerrado" : "Suspenso"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
