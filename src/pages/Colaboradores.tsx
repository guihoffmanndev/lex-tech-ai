import { useState } from "react";
import { Search, Users, Scale, GraduationCap, Clock, ClipboardList, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollaborators, Collaborator } from "@/hooks/useCollaborators";
import { useRecentes } from "@/hooks/useRecentes";
import { EquipeTab } from "@/components/colaboradores/EquipeTab";
import { DocumentosRHTab } from "@/components/colaboradores/DocumentosRHTab";
import { PerfilColaborador } from "@/components/colaboradores/PerfilColaborador";
import { ColaboradorForm } from "@/components/colaboradores/ColaboradorForm";
import { toast } from "sonner";

export default function Colaboradores() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Collaborator | null>(null);

  const { collaboratorsQuery, createCollaborator, updateCollaborator, deleteCollaborator } = useCollaborators();
  const { registrarAcesso } = useRecentes();
  const lista = collaboratorsQuery.data ?? [];

  const handleViewProfile = (id: string) => {
    setProfileId(id);
    const collab = lista.find((c) => c.id === id);
    if (collab) {
      registrarAcesso.mutate({
        tipo: "colaborador",
        item_id: collab.id,
        item_nome: collab.name,
        item_path: "/colaboradores",
      });
    }
  };

  const filtered = lista.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    if (filter === "todos") return matchSearch;
    if (filter === "socios") return matchSearch && c.role.toLowerCase().includes("sóci");
    if (filter === "advogados") return matchSearch && c.role.toLowerCase().includes("advogad");
    if (filter === "estagiarios") return matchSearch && c.role.toLowerCase().includes("estagiári");
    if (filter === "administrativo") return matchSearch && (c.role.toLowerCase().includes("admin") || c.role.toLowerCase().includes("assistente"));
    return matchSearch;
  });

  const handleSave = async (data: {
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
    department: string | null;
    status: string;
    hire_date: string | null;
    bio: string | null;
  }, id?: string) => {
    try {
      if (id) {
        await updateCollaborator.mutateAsync({ id, ...data });
        toast.success("Colaborador atualizado");
      } else {
        await createCollaborator.mutateAsync(data as any);
        toast.success("Colaborador adicionado");
      }
      setEditing(null);
      setFormOpen(false);
    } catch {
      toast.error("Erro ao salvar colaborador");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCollaborator.mutateAsync(id);
      toast.success("Colaborador excluído");
    } catch {
      toast.error("Erro ao excluir colaborador");
    }
  };

  const handleEdit = (c: Collaborator) => {
    setEditing(c);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const kpis = [
    { label: "Total de Colaboradores", value: String(lista.length), icon: Users, iconColor: "text-primary" },
    { label: "Advogados Ativos", value: String(lista.filter(c => c.role.toLowerCase().includes("advogad") && c.status === "Ativo").length), icon: Scale, iconColor: "text-emerald-600" },
    { label: "Estagiários", value: String(lista.filter(c => c.role.toLowerCase().includes("estagiári") || c.role.toLowerCase().includes("estagiário") || c.role.toLowerCase().includes("estagiária")).length), icon: GraduationCap, iconColor: "text-amber-500" },
    { label: "Em Férias", value: String(lista.filter(c => c.status === "Férias").length), icon: Clock, iconColor: "text-purple-500" },
    { label: "Inativos", value: String(lista.filter(c => c.status === "Inativo").length), icon: ClipboardList, iconColor: "text-destructive" },
  ];

  if (profileId) {
    const collab = lista.find((c) => c.id === profileId);
    if (collab) return <PerfilColaborador colaborador={collab} onBack={() => setProfileId(null)} onEdit={() => { setEditing(collab); setFormOpen(true); setProfileId(null); }} />;
  }

  if (collaboratorsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl">Colaboradores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie sua equipe, desempenho e acesso ao sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar colaborador..." className="pl-8 h-8 text-xs w-52" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">Todos</SelectItem>
              <SelectItem value="socios" className="text-xs">Sócios</SelectItem>
              <SelectItem value="advogados" className="text-xs">Advogados</SelectItem>
              <SelectItem value="estagiarios" className="text-xs">Estagiários</SelectItem>
              <SelectItem value="administrativo" className="text-xs">Administrativo</SelectItem>
            </SelectContent>
          </Select>
          <button onClick={handleNew} className="bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-md hover:bg-primary/90 whitespace-nowrap">+ Novo Colaborador</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-card rounded-xl border border-border p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <k.icon className={`h-4 w-4 ${k.iconColor}`} />
              <span className="text-xs text-muted-foreground">{k.label}</span>
            </div>
            <p className="text-xl font-semibold">{k.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="equipe">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="equipe" className="text-xs">Equipe</TabsTrigger>
          <TabsTrigger value="documentos" className="text-xs">Documentos RH</TabsTrigger>
        </TabsList>

        <TabsContent value="equipe"><EquipeTab colaboradores={filtered} onViewProfile={handleViewProfile} onEdit={handleEdit} onDelete={handleDelete} /></TabsContent>
        <TabsContent value="documentos"><DocumentosRHTab /></TabsContent>
      </Tabs>

      <ColaboradorForm open={formOpen} onOpenChange={setFormOpen} colaborador={editing} onSave={handleSave} />
    </div>
  );
}
