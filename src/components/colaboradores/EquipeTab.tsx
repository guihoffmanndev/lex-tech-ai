import { useState } from "react";
import { LayoutGrid, List, Mail, Phone, Pencil, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collaborator } from "@/hooks/useCollaborators";

const statusConfig: Record<string, { label: string; dotClass: string }> = {
  "Ativo": { label: "Ativo", dotClass: "bg-emerald-500" },
  "Férias": { label: "Férias", dotClass: "bg-amber-400" },
  "Afastado": { label: "Afastado", dotClass: "bg-destructive" },
  "Inativo": { label: "Inativo", dotClass: "bg-muted-foreground" },
};

const areaColors: Record<string, string> = {
  Empresarial: "bg-primary/10 text-primary",
  Trabalhista: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  Cível: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  Tributário: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  Administrativo: "bg-muted text-muted-foreground",
};

const avatarColors = [
  "bg-primary", "bg-purple-500", "bg-emerald-500", "bg-amber-500",
  "bg-sky-500", "bg-rose-400", "bg-indigo-400", "bg-teal-400",
];

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

interface Props {
  colaboradores: Collaborator[];
  onViewProfile: (id: string) => void;
  onEdit: (colaborador: Collaborator) => void;
  onDelete: (id: string) => void;
}

export function EquipeTab({ colaboradores, onViewProfile, onEdit, onDelete }: Props) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const confirmDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  if (colaboradores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-medium">Nenhum colaborador cadastrado</h3>
        <p className="text-sm text-muted-foreground mt-1">Clique em "+ Novo Colaborador" para começar</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setView("grid")} className={`p-2 rounded-md ${view === "grid" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          <LayoutGrid className="h-4 w-4" />
        </button>
        <button onClick={() => setView("list")} className={`p-2 rounded-md ${view === "list" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          <List className="h-4 w-4" />
        </button>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {colaboradores.map((c) => {
            const st = statusConfig[c.status] ?? { label: c.status, dotClass: "bg-muted-foreground" };
            const initials = getInitials(c.name);
            const color = getAvatarColor(c.name);
            return (
              <div key={c.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow relative">
                <div className="absolute top-4 right-4 flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${st.dotClass}`} />
                  <span className="text-xs text-muted-foreground">{st.label}</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`h-11 w-11 rounded-full ${color} text-white flex items-center justify-center text-sm font-medium shrink-0`}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.role}</p>
                  </div>
                </div>
                {c.department && <Badge className={`text-[10px] font-medium ${areaColors[c.department] || "bg-muted text-muted-foreground"} border-0`}>{c.department}</Badge>}
                <div className="border-t border-border mt-3 pt-3 space-y-1.5 text-xs text-muted-foreground">
                  {c.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{c.email}</div>}
                  {c.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{c.phone}</div>}
                </div>
                <div className="border-t border-border mt-3 pt-3 flex gap-2">
                  <button onClick={() => onViewProfile(c.id)} className="flex-1 text-xs py-1.5 rounded-md border border-border hover:bg-accent text-foreground transition-colors">Ver Perfil</button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="text-xs py-1.5 px-2 rounded-md border border-border hover:bg-accent text-muted-foreground">•••</button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(c)} className="text-xs gap-2">
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteId(c.id)} className="text-xs gap-2 text-destructive focus:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {colaboradores.map((c) => {
                const st = statusConfig[c.status] ?? { label: c.status, dotClass: "bg-muted-foreground" };
                const initials = getInitials(c.name);
                const color = getAvatarColor(c.name);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`h-7 w-7 rounded-full ${color} text-white flex items-center justify-center text-[10px] font-medium`}>{initials}</div>
                        <span className="text-sm font-medium">{c.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{c.role}</TableCell>
                    <TableCell>{c.department ? <Badge className={`text-[10px] ${areaColors[c.department] || ""} border-0`}>{c.department}</Badge> : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.email || "—"}</TableCell>
                    <TableCell><span className="flex items-center gap-1.5 text-xs"><span className={`h-2 w-2 rounded-full ${st.dotClass}`} />{st.label}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button onClick={() => onViewProfile(c.id)} className="text-xs text-primary hover:underline">Ver</button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-xs text-muted-foreground hover:text-foreground ml-2">•••</button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(c)} className="text-xs gap-2">
                              <Pencil className="h-3.5 w-3.5" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteId(c.id)} className="text-xs gap-2 text-destructive focus:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" /> Excluir
                            </DropdownMenuItem>
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
      )}

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Colaborador</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este colaborador? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirmar exclusão</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
