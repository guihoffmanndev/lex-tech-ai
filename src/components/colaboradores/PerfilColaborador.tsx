import { useState } from "react";
import { ArrowLeft, Mail, Phone, MapPin, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collaborator } from "@/hooks/useCollaborators";

const statusConfig: Record<string, { label: string; class: string }> = {
  "Ativo": { label: "Ativo", class: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" },
  "Férias": { label: "Férias", class: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
  "Afastado": { label: "Afastado", class: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400" },
  "Inativo": { label: "Inativo", class: "bg-muted text-muted-foreground" },
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
  colaborador: Collaborator;
  onBack: () => void;
  onEdit: () => void;
}

export function PerfilColaborador({ colaborador: c, onBack, onEdit }: Props) {
  const st = statusConfig[c.status] ?? { label: c.status, class: "bg-muted text-muted-foreground" };
  const initials = getInitials(c.name);
  const color = getAvatarColor(c.name);

  return (
    <div className="space-y-6 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar para Colaboradores
      </button>

      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-6 flex items-center gap-5">
        <div className={`h-16 w-16 rounded-full ${color} text-white flex items-center justify-center text-xl font-medium`}>
          {initials}
        </div>
        <div className="flex-1">
          <h2 className="text-xl">{c.name}</h2>
          <p className="text-sm text-muted-foreground">{c.role}{c.department ? ` — ${c.department}` : ""}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={`text-[10px] border-0 ${st.class}`}>{st.label}</Badge>
          </div>
        </div>
        <button onClick={onEdit} className="flex items-center gap-1.5 text-xs border border-border px-3 py-1.5 rounded-md hover:bg-accent">
          <Pencil className="h-3.5 w-3.5" /> Editar Perfil
        </button>
      </div>

      {/* Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <h3 className="text-sm font-medium mb-3">Informações</h3>
          <div className="space-y-2 text-sm">
            {c.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" />{c.email}</div>}
            {c.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{c.phone}</div>}
          </div>
          {c.hire_date && (
            <div className="border-t border-border pt-3 text-sm">
              <p><span className="text-muted-foreground">Admissão:</span> {new Date(c.hire_date).toLocaleDateString("pt-BR")}</p>
            </div>
          )}
        </div>

        {c.bio && (
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-medium mb-3">Sobre</h3>
            <p className="text-sm text-muted-foreground">{c.bio}</p>
          </div>
        )}
      </div>
    </div>
  );
}
