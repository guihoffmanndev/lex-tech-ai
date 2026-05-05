import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Eye, Trash2, Loader2 } from "lucide-react";
import ClienteForm from "./ClienteForm";
import type { LexClient } from "./types";
import { useRecentes } from "@/hooks/useRecentes";

export default function ClientesTab() {
  const [clients, setClients] = useState<LexClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<LexClient | null>(null);
  const [viewClient, setViewClient] = useState<LexClient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LexClient | null>(null);
  const { registrarAcesso } = useRecentes();

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

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return c.nome_completo.toLowerCase().includes(q) || c.cpf.includes(q);
  });

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

  const openEdit = (c: LexClient) => {
    setEditingClient(c);
    setDrawerOpen(true);
    registrarAcesso.mutate({ tipo: "colaborador", item_id: c.id, item_nome: c.nome_completo, item_path: "/lex-pilot" });
  };

  const openNew = () => {
    setEditingClient(null);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo Cliente
        </Button>
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
                <TableHead>CPF</TableHead>
                <TableHead className="hidden md:table-cell">Cidade</TableHead>
                <TableHead className="hidden md:table-cell">Telefone</TableHead>
                <TableHead className="hidden lg:table-cell">Cadastro</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome_completo}</TableCell>
                  <TableCell className="font-mono text-xs">{formatCpf(c.cpf)}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{c.cidade || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{c.telefone || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewClient(c); registrarAcesso.mutate({ tipo: "colaborador", item_id: c.id, item_nome: c.nome_completo, item_path: "/lex-pilot" }); }} title="Visualizar">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)} title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(c)} title="Excluir">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

function ClientDetailView({ client }: { client: LexClient }) {
  const fields = [
    ["CPF", formatCpf(client.cpf)],
    ["RG", [client.rg, client.rg_emissor, client.rg_uf].filter(Boolean).join(" / ") || "—"],
    ["Data de nascimento", client.data_nascimento ? new Date(client.data_nascimento + "T12:00:00").toLocaleDateString("pt-BR") : "—"],
    ["Estado civil", client.estado_civil || "—"],
    ["Profissão", client.profissao || "—"],
    ["Nacionalidade", client.nacionalidade || "—"],
    ["E-mail", client.email || "—"],
    ["Telefone", client.telefone || "—"],
    ["Endereço", [client.rua, client.numero, client.complemento, client.bairro, client.cidade, client.estado].filter(Boolean).join(", ") || "—"],
    ["CEP", client.cep || "—"],
    ["Observações", client.observacoes || "—"],
  ];
  return (
    <div className="space-y-3">
      {fields.map(([label, value]) => (
        <div key={label as string}>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm">{value}</p>
        </div>
      ))}
    </div>
  );
}

function formatCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}
