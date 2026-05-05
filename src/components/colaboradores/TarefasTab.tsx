import { useState } from "react";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Calendar as CalendarIcon, MoreHorizontal, Plus, Trash2, Loader2, ClipboardList } from "lucide-react";
import { AtlasIcon } from "@/components/ui/atlas-icon";
import { useCollaboratorTasks, CollaboratorTask } from "@/hooks/useCollaboratorTasks";
import { useCollaborators } from "@/hooks/useCollaborators";
import { TaskDetailSidebar } from "./TaskDetailSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface ColunaConfig {
  id: string;
  label: string;
  iconName: string;
}

const defaultColunas: ColunaConfig[] = [
  { id: "afazer", label: "A Fazer", iconName: "clipboard" },
  { id: "andamento", label: "Em Andamento", iconName: "rotate-arrow-right" },
  { id: "revisao", label: "Revisão", iconName: "eye" },
  { id: "concluido", label: "Concluído", iconName: "check-circle" },
];

const prioridadeConfig: Record<string, { label: string; bg: string }> = {
  urgente: { label: "Urgente", bg: "bg-red-50 text-red-700 border-l-red-500 dark:bg-red-950 dark:text-red-400" },
  alta: { label: "Alta", bg: "bg-amber-50 text-amber-700 border-l-amber-500 dark:bg-amber-950 dark:text-amber-400" },
  normal: { label: "Normal", bg: "bg-emerald-50 text-emerald-700 border-l-emerald-500 dark:bg-emerald-950 dark:text-emerald-400" },
};

export function TarefasTab() {
  const { tasksQuery, createTask, updateTask, deleteTask } = useCollaboratorTasks();
  const { collaboratorsQuery } = useCollaborators();
  const tasks = tasksQuery.data ?? [];
  const collaborators = collaboratorsQuery.data ?? [];

  const [colunas] = useState<ColunaConfig[]>(defaultColunas);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [addToColumn, setAddToColumn] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<CollaboratorTask | null>(null);
  const [newTask, setNewTask] = useState({ titulo: "", caso: "", collaborator_id: "", prazo: "", prioridade: "normal" });

  const queryClient = useQueryClient();

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newCol = result.destination.droppableId;
    const taskId = result.draggableId;
    if (tasks.find(t => t.id === taskId)?.status === newCol) return;

    // Optimistic update: patch cache immediately
    queryClient.setQueryData<CollaboratorTask[]>(["collaborator-tasks"], (old) =>
      (old ?? []).map(t => t.id === taskId ? { ...t, status: newCol } : t)
    );

    updateTask.mutate(
      { id: taskId, status: newCol },
      {
        onError: () => {
          // Rollback on failure
          queryClient.invalidateQueries({ queryKey: ["collaborator-tasks"] });
          toast.error("Erro ao mover tarefa");
        },
      }
    );
  };

  const handleDeleteTask = async () => {
    if (!deleteTaskId) return;
    try {
      await deleteTask.mutateAsync(deleteTaskId);
      setDeleteTaskId(null);
      toast.success("Tarefa excluída");
    } catch {
      toast.error("Erro ao excluir tarefa");
    }
  };

  const handleAddTask = async () => {
    if (!addToColumn || !newTask.titulo.trim()) return;
    try {
      await createTask.mutateAsync({
        title: newTask.titulo,
        case_name: newTask.caso || undefined,
        collaborator_id: newTask.collaborator_id || null,
        due_date: newTask.prazo || null,
        priority: newTask.prioridade,
        status: addToColumn,
      });
      setAddToColumn(null);
      setNewTask({ titulo: "", caso: "", collaborator_id: "", prazo: "", prioridade: "normal" });
      toast.success("Tarefa criada");
    } catch {
      toast.error("Erro ao criar tarefa");
    }
  };

  if (tasksQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tasks.length === 0 && !addToColumn) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium">Nenhuma tarefa cadastrada</h3>
          <p className="text-sm text-muted-foreground mt-1">Crie tarefas no quadro Kanban abaixo</p>
        </div>
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {colunas.map((col) => (
              <div key={col.id} className="min-w-[280px] flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium flex items-center gap-1.5">
                    <AtlasIcon name={col.iconName} className="text-muted-foreground" /> {col.label}
                    <span className="ml-1 text-xs text-muted-foreground bg-muted rounded-full px-1.5">0</span>
                  </h4>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAddToColumn(col.id)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Droppable droppableId={col.id}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[200px] rounded-lg p-2 bg-muted/30">
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>

        {/* Add task dialog */}
        <Dialog open={!!addToColumn} onOpenChange={(o) => { if (!o) setAddToColumn(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle className="text-base">Nova Tarefa</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Título da tarefa *" value={newTask.titulo} onChange={(e) => setNewTask((p) => ({ ...p, titulo: e.target.value }))} className="text-sm" />
              <Input placeholder="Caso / Cliente" value={newTask.caso} onChange={(e) => setNewTask((p) => ({ ...p, caso: e.target.value }))} className="text-sm" />
              <Select value={newTask.collaborator_id || "none"} onValueChange={(v) => setNewTask((p) => ({ ...p, collaborator_id: v === "none" ? "" : v }))}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Responsável" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não atribuído</SelectItem>
                  {collaborators.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm", !newTask.prazo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newTask.prazo ? format(parseISO(newTask.prazo), "dd/MM/yyyy") : "Prazo"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newTask.prazo ? parseISO(newTask.prazo) : undefined}
                    onSelect={(d) => setNewTask((p) => ({ ...p, prazo: d ? format(d, "yyyy-MM-dd") : "" }))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <Select value={newTask.prioridade} onValueChange={(v) => setNewTask((p) => ({ ...p, prioridade: v }))}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setAddToColumn(null)}>Cancelar</Button>
              <Button size="sm" onClick={handleAddTask} disabled={!newTask.titulo.trim() || createTask.isPending}>Criar Tarefa</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {colunas.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div key={col.id} className="min-w-[280px] flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium flex items-center gap-1.5">
                    <AtlasIcon name={col.iconName} className="text-muted-foreground" /> {col.label}
                    <span className="ml-1 text-xs text-muted-foreground bg-muted rounded-full px-1.5">{colTasks.length}</span>
                  </h4>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAddToColumn(col.id)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2 min-h-[200px] rounded-lg p-2 transition-colors ${snapshot.isDraggingOver ? "bg-primary/5" : "bg-muted/30"}`}
                    >
                      {colTasks.map((task, index) => {
                        const prio = prioridadeConfig[task.priority] ?? prioridadeConfig.normal;
                        const assignee = collaborators.find(c => c.id === task.collaborator_id);
                        return (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-card rounded-lg border border-border p-3 border-l-[3px] ${prio.bg.split(" ").pop()} hover:shadow-sm transition-shadow cursor-pointer ${snapshot.isDragging ? "shadow-md" : ""}`}
                                onClick={() => setSelectedTask(task)}
                              >
                                <div className="flex items-start justify-between">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${prio.bg}`}>{prio.label}</span>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="p-0.5 rounded hover:bg-muted/60 -mt-0.5 -mr-1" onClick={(e) => e.stopPropagation()}>
                                        <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="text-xs">
                                      <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTaskId(task.id); }}>
                                        <Trash2 className="h-3 w-3 mr-1.5" /> Excluir
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <p className="text-sm font-medium mt-2">{task.title}</p>
                                {task.case_name && <p className="text-xs text-muted-foreground mt-0.5">{task.case_name}</p>}
                                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                                  {task.due_date && <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{new Date(task.due_date).toLocaleDateString("pt-BR")}</span>}
                                </div>
                                {assignee && <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1"><AtlasIcon name="user" /> {assignee.name}</p>}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={(o) => { if (!o) setDeleteTaskId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add task dialog */}
      <Dialog open={!!addToColumn} onOpenChange={(o) => { if (!o) setAddToColumn(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-base">Nova Tarefa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título da tarefa *" value={newTask.titulo} onChange={(e) => setNewTask((p) => ({ ...p, titulo: e.target.value }))} className="text-sm" />
            <Input placeholder="Caso / Cliente" value={newTask.caso} onChange={(e) => setNewTask((p) => ({ ...p, caso: e.target.value }))} className="text-sm" />
            <Select value={newTask.collaborator_id || "none"} onValueChange={(v) => setNewTask((p) => ({ ...p, collaborator_id: v === "none" ? "" : v }))}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Responsável" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não atribuído</SelectItem>
                {collaborators.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm", !newTask.prazo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newTask.prazo ? format(parseISO(newTask.prazo), "dd/MM/yyyy") : "Prazo"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newTask.prazo ? parseISO(newTask.prazo) : undefined}
                  onSelect={(d) => setNewTask((p) => ({ ...p, prazo: d ? format(d, "yyyy-MM-dd") : "" }))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Select value={newTask.prioridade} onValueChange={(v) => setNewTask((p) => ({ ...p, prioridade: v }))}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddToColumn(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleAddTask} disabled={!newTask.titulo.trim() || createTask.isPending}>Criar Tarefa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task detail sidebar */}
      <TaskDetailSidebar
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={(payload) => updateTask.mutateAsync(payload)}
        collaborators={collaborators}
      />
    </>
  );
}
