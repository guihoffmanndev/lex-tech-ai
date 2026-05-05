import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { X, Send, Trash2, Loader2, MessageSquare, Pencil, CalendarIcon } from "lucide-react";
import { CollaboratorTask } from "@/hooks/useCollaboratorTasks";
import { useTaskComments } from "@/hooks/useTaskComments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  task: CollaboratorTask | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (payload: { id: string; [key: string]: any }) => Promise<any>;
  collaborators: { id: string; name: string }[];
}

const prioridadeConfig: Record<string, { label: string; class: string }> = {
  urgente: { label: "Urgente", class: "bg-destructive/10 text-destructive" },
  alta: { label: "Alta", class: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  normal: { label: "Normal", class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

export function TaskDetailSidebar({ task, open, onClose, onUpdate, collaborators }: Props) {
  const [form, setForm] = useState({ title: "", description: "", case_name: "", collaborator_id: "", due_date: "", priority: "normal", status: "" });
  const [saving, setSaving] = useState(false);
  const [newComment, setNewComment] = useState("");
  const { commentsQuery, addComment, deleteComment } = useTaskComments(task?.id ?? null);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title ?? "",
        description: task.description ?? "",
        case_name: task.case_name ?? "",
        collaborator_id: task.collaborator_id ?? "",
        due_date: task.due_date ?? "",
        priority: task.priority ?? "normal",
        status: task.status ?? "afazer",
      });
    }
  }, [task]);

  const handleSave = async () => {
    if (!task || !form.title.trim()) return;
    setSaving(true);
    try {
      await onUpdate({
        id: task.id,
        title: form.title,
        description: form.description || null,
        case_name: form.case_name || null,
        collaborator_id: form.collaborator_id || null,
        due_date: form.due_date || null,
        priority: form.priority,
        status: form.status,
      });
      toast.success("Tarefa atualizada");
    } catch {
      toast.error("Erro ao atualizar tarefa");
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!task || !newComment.trim()) return;
    try {
      await addComment.mutateAsync({ taskId: task.id, content: newComment.trim() });
      setNewComment("");
    } catch {
      toast.error("Erro ao adicionar comentário");
    }
  };

  const comments = commentsQuery.data ?? [];

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        <SheetHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">Detalhes da Tarefa</SheetTitle>
          </div>
        </SheetHeader>

        <Tabs defaultValue="detalhes" className="px-6 pb-6">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="detalhes" className="flex-1 gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Detalhes
            </TabsTrigger>
            <TabsTrigger value="comentarios" className="flex-1 gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Comentários
              {comments.length > 0 && (
                <span className="ml-1 text-[10px] bg-muted rounded-full px-1.5">{comments.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Detalhes Tab ── */}
          <TabsContent value="detalhes" className="space-y-4 mt-0">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Título *</label>
              <Input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} className="text-sm" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Descrição</label>
              <Textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} rows={3} className="text-sm resize-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Caso / Cliente</label>
              <Input value={form.case_name} onChange={(e) => setForm(p => ({ ...p, case_name: e.target.value }))} className="text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Prioridade</label>
                <Select value={form.priority} onValueChange={(v) => setForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={form.status} onValueChange={(v) => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="afazer">A Fazer</SelectItem>
                    <SelectItem value="andamento">Em Andamento</SelectItem>
                    <SelectItem value="revisao">Revisão</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Prazo</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm", !form.due_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.due_date ? format(parseISO(form.due_date), "dd/MM/yyyy") : "Selecionar data…"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.due_date ? parseISO(form.due_date) : undefined}
                      onSelect={(d) => setForm(p => ({ ...p, due_date: d ? format(d, "yyyy-MM-dd") : "" }))}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Responsável</label>
                <Select value={form.collaborator_id || "none"} onValueChange={(v) => setForm(p => ({ ...p, collaborator_id: v === "none" ? "" : v }))}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Não atribuído" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não atribuído</SelectItem>
                    {collaborators.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <Button onClick={handleSave} disabled={saving || !form.title.trim()} className="w-full" size="sm">
              {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Salvando...</> : "Salvar alterações"}
            </Button>
          </TabsContent>

          {/* ── Comentários Tab ── */}
          <TabsContent value="comentarios" className="mt-0">
            <div className="space-y-3">
              {/* Comment input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Escreva um comentário..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                  className="text-sm flex-1"
                />
                <Button size="icon" variant="outline" onClick={handleAddComment} disabled={!newComment.trim() || addComment.isPending}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Separator />

              {/* Comments list */}
              {commentsQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum comentário ainda</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {comments.map((c) => (
                    <div key={c.id} className="bg-muted/40 rounded-lg p-3 group relative">
                      <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(c.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <button
                          onClick={() => deleteComment.mutate(c.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
