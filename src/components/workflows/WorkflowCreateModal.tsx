import { useState, useEffect } from "react";
import { AtlasIcon } from "@/components/ui/atlas-icon";
import {
  Upload, RefreshCw, FolderPlus, CheckSquare, ArrowRightLeft,
  Clock, Users, Plus, Tag, FolderInput, UserCheck, Bell,
  MessageCircle, ArrowLeft, ArrowRight, X
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollaborators } from "@/hooks/useCollaborators";
import { useVaultFolders } from "@/hooks/useVaultFolders";
import type { TriggerType, ActionType, WorkflowAction, TriggerConditions, Workflow } from "@/types/workflow";
import { TRIGGER_OPTIONS, ACTION_OPTIONS } from "@/types/workflow";

const triggerIcons: Record<string, React.ReactNode> = {
  Upload: <Upload className="h-5 w-5" />,
  RefreshCw: <RefreshCw className="h-5 w-5" />,
  FolderPlus: <FolderPlus className="h-5 w-5" />,
  CheckSquare: <CheckSquare className="h-5 w-5" />,
  ArrowRightLeft: <ArrowRightLeft className="h-5 w-5" />,
  Clock: <Clock className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
};

const actionIcons: Record<string, React.ReactNode> = {
  Plus: <Plus className="h-5 w-5" />,
  Tag: <Tag className="h-5 w-5" />,
  FolderInput: <FolderInput className="h-5 w-5" />,
  UserCheck: <UserCheck className="h-5 w-5" />,
  Bell: <Bell className="h-5 w-5" />,
  MessageCircle: <MessageCircle className="h-5 w-5" />,
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description?: string;
    trigger_type: TriggerType;
    trigger_conditions: TriggerConditions;
    actions: WorkflowAction[];
  }) => void;
  submitting?: boolean;
  initialData?: Workflow | null;
}

export default function WorkflowCreateModal({ open, onClose, onSubmit, submitting, initialData }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType | null>(null);
  const [conditions, setConditions] = useState<TriggerConditions>({});
  const [actions, setActions] = useState<WorkflowAction[]>([]);

  const isEditing = !!initialData;

  const { collaboratorsQuery } = useCollaborators();
  const { foldersQuery } = useVaultFolders();
  const collaborators = collaboratorsQuery.data ?? [];
  const folders = foldersQuery.data ?? [];

  // Populate form when editing
  useEffect(() => {
    if (initialData && open) {
      setName(initialData.name);
      setDescription(initialData.description ?? "");
      setTriggerType(initialData.trigger_type);
      setConditions(initialData.trigger_conditions ?? {});
      setActions(initialData.actions ?? []);
      setStep(0);
    }
  }, [initialData, open]);

  const reset = () => {
    setStep(0);
    setName("");
    setDescription("");
    setTriggerType(null);
    setConditions({});
    setActions([]);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = () => {
    if (!triggerType || !name.trim() || actions.length === 0) return;
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      trigger_type: triggerType,
      trigger_conditions: conditions,
      actions,
    });
    reset();
  };

  const addAction = (type: ActionType) => {
    setActions(prev => [...prev, { type, config: {} }]);
  };

  const removeAction = (index: number) => {
    setActions(prev => prev.filter((_, i) => i !== index));
  };

  const updateActionConfig = (index: number, key: string, value: string) => {
    setActions(prev => prev.map((a, i) =>
      i === index ? { ...a, config: { ...a.config, [key]: value } } : a
    ));
  };

  const canNext = step === 0 ? name.trim().length > 0
    : step === 1 ? triggerType !== null
    : actions.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? (step === 0 ? "Editar Workflow" : step === 1 ? "Editar Gatilho" : "Editar Ações")
              : (step === 0 ? "Novo Workflow" : step === 1 ? "Escolha o Gatilho" : "Adicionar Ações")}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-4">
          {[0, 1, 2].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {/* Step 0: Name */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <Label>Nome do workflow *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Revisão automática de contratos" />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="O que esse workflow faz?" />
            </div>
          </div>
        )}

        {/* Step 1: Trigger */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Quando isso acontecer:</p>
            <div className="grid grid-cols-1 gap-2">
              {TRIGGER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setTriggerType(opt.value); setConditions({}); }}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    triggerType === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-secondary/50"
                  }`}
                >
                  <div className="text-primary">{triggerIcons[opt.icon]}</div>
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Conditional filters */}
            {triggerType === "file_uploaded" && (
              <div className="mt-3 p-3 rounded-lg border border-border bg-secondary/30">
                <Label className="text-xs">Filtrar por tipo de arquivo (opcional)</Label>
                <select
                  value={conditions.file_type ?? ""}
                  onChange={e => setConditions({ ...conditions, file_type: e.target.value || undefined })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Qualquer tipo</option>
                  <option value="Contrato">Contrato</option>
                  <option value="Petição">Petição</option>
                  <option value="Parecer">Parecer</option>
                  <option value="Procuração">Procuração</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            )}

            {triggerType === "file_status_changed" && (
              <div className="mt-3 p-3 rounded-lg border border-border bg-secondary/30 space-y-2">
                <div>
                  <Label className="text-xs">De (opcional)</Label>
                  <Input value={conditions.from_status ?? ""} onChange={e => setConditions({ ...conditions, from_status: e.target.value || undefined })} placeholder="Ex: Em análise" />
                </div>
                <div>
                  <Label className="text-xs">Para</Label>
                  <Input value={conditions.to_status ?? ""} onChange={e => setConditions({ ...conditions, to_status: e.target.value || undefined })} placeholder="Ex: Revisado" />
                </div>
              </div>
            )}

            {triggerType === "task_status_changed" && (
              <div className="mt-3 p-3 rounded-lg border border-border bg-secondary/30 space-y-2">
                <div>
                  <Label className="text-xs">De (opcional)</Label>
                  <Input value={conditions.task_from_status ?? ""} onChange={e => setConditions({ ...conditions, task_from_status: e.target.value || undefined })} placeholder="Ex: afazer" />
                </div>
                <div>
                  <Label className="text-xs">Para</Label>
                  <Input value={conditions.task_to_status ?? ""} onChange={e => setConditions({ ...conditions, task_to_status: e.target.value || undefined })} placeholder="Ex: concluida" />
                </div>
              </div>
            )}

            {triggerType === "task_due_date_approaching" && (
              <div className="mt-3 p-3 rounded-lg border border-border bg-secondary/30">
                <Label className="text-xs">Dias antes do prazo</Label>
                <Input type="number" min={1} value={conditions.days_before ?? 3} onChange={e => setConditions({ ...conditions, days_before: Number(e.target.value) })} />
              </div>
            )}

            {triggerType === "collaborator_status_changed" && (
              <div className="mt-3 p-3 rounded-lg border border-border bg-secondary/30">
                <Label className="text-xs">Novo status do colaborador</Label>
                <Input value={conditions.collaborator_to_status ?? ""} onChange={e => setConditions({ ...conditions, collaborator_to_status: e.target.value || undefined })} placeholder="Ex: Férias" />
              </div>
            )}
          </div>
        )}

        {/* Step 2: Actions */}
        {step === 2 && (
          <div className="space-y-4">
            {actions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações adicionadas</p>
                {actions.map((action, i) => {
                  const opt = ACTION_OPTIONS.find(a => a.value === action.type)!;
                  return (
                    <div key={i} className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="text-primary">{actionIcons[opt.icon]}</div>
                          <span className="text-sm font-medium">{opt.label}</span>
                        </div>
                        <button onClick={() => removeAction(i)} className="text-muted-foreground hover:text-destructive">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {/* Config fields */}
                      {action.type === "create_task" && (
                        <div className="space-y-2">
                          <Input placeholder="Título da tarefa (ex: Revisar {{file_name}})" value={action.config.task_title ?? ""} onChange={e => updateActionConfig(i, "task_title", e.target.value)} />
                          <Select value={action.config.task_priority ?? "normal"} onValueChange={v => updateActionConfig(i, "task_priority", v)}>
                            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="alta">Alta</SelectItem>
                              <SelectItem value="urgente">Urgente</SelectItem>
                            </SelectContent>
                          </Select>
                          {collaborators.length > 0 && (
                            <Select value={action.config.task_assignee_id ?? "__none__"} onValueChange={v => updateActionConfig(i, "task_assignee_id", v === "__none__" ? "" : v)}>
                              <SelectTrigger className="text-sm"><SelectValue placeholder="Sem atribuição" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Sem atribuição</SelectItem>
                                {collaborators.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      )}
                      {action.type === "update_file_status" && (
                        <Input placeholder="Novo status (ex: Revisado)" value={action.config.new_status ?? ""} onChange={e => updateActionConfig(i, "new_status", e.target.value)} />
                      )}
                      {action.type === "move_file_to_folder" && (
                        <Select value={action.config.target_folder_id ?? "__none__"} onValueChange={v => updateActionConfig(i, "target_folder_id", v === "__none__" ? "" : v)}>
                          <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione a pasta" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Selecione a pasta</SelectItem>
                            {folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                      {action.type === "assign_task" && collaborators.length > 0 && (
                        <Select value={action.config.task_assignee_id ?? "__none__"} onValueChange={v => updateActionConfig(i, "task_assignee_id", v === "__none__" ? "" : v)}>
                          <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione o colaborador" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Selecione o colaborador</SelectItem>
                            {collaborators.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                      {action.type === "send_notification" && (
                        <Input placeholder="Mensagem (ex: Documento {{file_name}} revisado)" value={action.config.notification_message ?? ""} onChange={e => updateActionConfig(i, "notification_message", e.target.value)} />
                      )}
                      {action.type === "add_comment" && (
                        <Input placeholder="Comentário (ex: Concluído em {{date}})" value={action.config.comment_text ?? ""} onChange={e => updateActionConfig(i, "comment_text", e.target.value)} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Adicionar ação</p>
              <div className="grid grid-cols-2 gap-2">
                {ACTION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => addAction(opt.value)}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-border text-left hover:bg-secondary/50 transition-colors"
                  >
                    <div className="text-primary">{actionIcons[opt.icon]}</div>
                    <div>
                      <p className="text-xs font-medium">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground">{opt.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AtlasIcon name="electric-lightbulb" className="shrink-0" /> Use variáveis: <code className="bg-muted px-1 rounded">{"{{file_name}}"}</code>, <code className="bg-muted px-1 rounded">{"{{task_title}}"}</code>, <code className="bg-muted px-1 rounded">{"{{date}}"}</code>
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : handleClose()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm hover:bg-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 0 ? "Cancelar" : "Voltar"}
          </button>

          {step < 2 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              Próximo
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canNext || submitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? (isEditing ? "Salvando..." : "Criando...") : (isEditing ? "Salvar Workflow" : "Criar Workflow")}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
