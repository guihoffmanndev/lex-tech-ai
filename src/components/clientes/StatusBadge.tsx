import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Check, Plus } from "lucide-react";
import type { ClientStatus } from "@/hooks/useClientStatuses";

interface Props {
  clientId: string;
  currentStatus: string;
  statuses: ClientStatus[];
  onStatusChanged: (clientId: string, newStatus: string) => void;
  onStatusCreated: (name: string, color: string) => Promise<ClientStatus | null>;
}

const PALETTE = [
  "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6",
  "#f97316", "#6366f1", "#84cc16", "#a855f7",
];

function getStatusColor(name: string, statuses: ClientStatus[]): string {
  const found = statuses.find((s) => s.name === name);
  return found?.color || "#6b7280";
}

export default function StatusBadge({ clientId, currentStatus, statuses, onStatusChanged, onStatusCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saveGlobal, setSaveGlobal] = useState(true);
  const color = getStatusColor(currentStatus, statuses);

  const handleSelect = async (statusName: string) => {
    const { error } = await supabase
      .from("lex_clients" as any)
      .update({ status: statusName } as any)
      .eq("id", clientId);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    onStatusChanged(clientId, statusName);
    setOpen(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const randomColor = PALETTE[Math.floor(Math.random() * PALETTE.length)];

    if (saveGlobal) {
      const created = await onStatusCreated(newName.trim(), randomColor);
      if (!created) return;
    }

    await handleSelect(newName.trim());
    setNewName("");
    setCreating(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-opacity hover:opacity-80 border"
          style={{ backgroundColor: color + "18", color, borderColor: color + "40" }}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          {currentStatus}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <p className="text-xs font-medium text-muted-foreground px-2 py-1">Alterar status</p>
        <div className="space-y-0.5">
          {statuses.map((s) => (
            <button
              key={s.id}
              className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
              onClick={() => handleSelect(s.name)}
            >
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="flex-1 text-left">{s.name}</span>
              {currentStatus === s.name && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
        </div>

        <div className="border-t mt-1.5 pt-1.5">
          {creating ? (
            <div className="space-y-2 px-1">
              <Input
                placeholder="Nome do status"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <Checkbox checked={saveGlobal} onCheckedChange={(v) => setSaveGlobal(!!v)} />
                Salvar como status global?
              </label>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => { setCreating(false); setNewName(""); }}>
                  Cancelar
                </Button>
                <Button size="sm" className="h-7 text-xs flex-1" onClick={handleCreate} disabled={!newName.trim()}>
                  Criar
                </Button>
              </div>
            </div>
          ) : (
            <button
              className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent transition-colors"
              onClick={() => setCreating(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Criar novo status
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
