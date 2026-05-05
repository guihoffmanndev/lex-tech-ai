import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ClientStatus } from "@/hooks/useClientStatuses";

const PALETTE = ["#22c55e", "#ef4444", "#f59e0b", "#6366f1", "#ec4899", "#14b8a6", "#f97316", "#8b5cf6", "#06b6d4", "#84cc16", "#64748b"];

interface Props {
  statuses: ClientStatus[];
  onRename: (id: string, newName: string) => Promise<boolean>;
  onChangeColor: (id: string, newColor: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onAdd: (name: string, color: string) => Promise<ClientStatus | null>;
}

export default function StatusSettings({ statuses, onRename, onChangeColor, onDelete, onAdd }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editColor, setEditColor] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ClientStatus | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PALETTE[0]);

  const startEdit = (s: ClientStatus) => {
    setEditingId(s.id);
    setEditValue(s.name);
    setEditColor(s.color);
  };

  const confirmEdit = async () => {
    if (!editingId || !editValue.trim()) return;
    const status = statuses.find((s) => s.id === editingId);
    if (!status) return;
    let ok = true;
    if (editValue.trim() !== status.name) {
      ok = await onRename(editingId, editValue.trim());
    }
    if (ok && editColor !== status.color) {
      ok = await onChangeColor(editingId, editColor);
    }
    if (ok) setEditingId(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await onDelete(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const result = await onAdd(newName.trim(), newColor);
    if (result) {
      setAdding(false);
      setNewName("");
      setNewColor(PALETTE[0]);
    }
  };

  return (
    <>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground mb-2">Gerenciar status</p>
        {statuses.map((s) => (
          <div key={s.id}>
            {editingId === s.id ? (
              <div className="rounded-md px-2 py-2 bg-accent/50 space-y-2">
                <div className="flex gap-1 flex-wrap">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      className="h-4 w-4 rounded-full border-2 transition-all"
                      style={{ backgroundColor: c, borderColor: editColor === c ? "hsl(var(--foreground))" : "transparent" }}
                      onClick={() => setEditColor(c)}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-7 text-sm flex-1 min-w-0"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") setEditingId(null); }}
                  />
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={confirmEdit}>
                    <Check className="h-3.5 w-3.5 text-primary" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setEditingId(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 group rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-sm flex-1">{s.name}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => startEdit(s)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {statuses.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    onClick={() => setDeleteTarget(s)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Add new status */}
        {adding ? (
          <div className="rounded-md px-2 py-2 bg-accent/50 space-y-2">
            <div className="flex gap-1 flex-wrap">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  className="h-4 w-4 rounded-full border-2 transition-all"
                  style={{ backgroundColor: c, borderColor: newColor === c ? "hsl(var(--foreground))" : "transparent" }}
                  onClick={() => setNewColor(c)}
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome do status"
                className="h-7 text-sm flex-1 min-w-0"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
              />
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleAdd}>
                <Check className="h-3.5 w-3.5 text-primary" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setAdding(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="w-full justify-start gap-1.5 text-xs text-muted-foreground" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" /> Novo status
          </Button>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir status</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.is_default ? (
                <>Este é um <strong>status padrão do sistema</strong>. Excluí-lo afetará todos os clientes que o utilizam. Todos serão movidos para o primeiro status disponível. Deseja continuar?</>
              ) : (
                <>Tem certeza que deseja excluir o status <strong>"{deleteTarget?.name}"</strong>? Todos os clientes com esse status serão movidos para "Ativo".</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
