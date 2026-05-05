export type TriggerType =
  | "file_uploaded"
  | "file_status_changed"
  | "folder_created"
  | "task_created"
  | "task_status_changed"
  | "task_due_date_approaching"
  | "collaborator_status_changed";

export interface TriggerConditions {
  file_type?: string;
  from_status?: string;
  to_status?: string;
  task_from_status?: string;
  task_to_status?: string;
  days_before?: number;
  collaborator_to_status?: string;
}

export type ActionType =
  | "create_task"
  | "update_file_status"
  | "move_file_to_folder"
  | "assign_task"
  | "send_notification"
  | "add_comment";

export interface WorkflowAction {
  type: ActionType;
  config: {
    task_title?: string;
    task_priority?: string;
    task_assignee_id?: string;
    new_status?: string;
    target_folder_id?: string;
    notification_message?: string;
    comment_text?: string;
  };
}

export interface Workflow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_type: TriggerType;
  trigger_conditions: TriggerConditions;
  actions: WorkflowAction[];
  run_count: number;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  user_id: string;
  status: "success" | "failed" | "skipped";
  trigger_data: Record<string, any> | null;
  actions_executed: WorkflowAction[] | null;
  error_message: string | null;
  executed_at: string;
}

export const TRIGGER_OPTIONS: {
  value: TriggerType;
  label: string;
  description: string;
  icon: string;
}[] = [
  { value: "file_uploaded", label: "Upload de arquivo", description: "Quando um arquivo for enviado ao Vault", icon: "Upload" },
  { value: "file_status_changed", label: "Status do documento", description: "Quando o status de um documento mudar", icon: "RefreshCw" },
  { value: "folder_created", label: "Nova pasta criada", description: "Quando uma nova pasta for criada no Vault", icon: "FolderPlus" },
  { value: "task_created", label: "Nova tarefa", description: "Quando uma nova tarefa for criada", icon: "CheckSquare" },
  { value: "task_status_changed", label: "Status da tarefa", description: "Quando o status de uma tarefa mudar", icon: "ArrowRightLeft" },
  { value: "task_due_date_approaching", label: "Prazo se aproximando", description: "Quando o prazo de uma tarefa se aproximar", icon: "Clock" },
  { value: "collaborator_status_changed", label: "Status do colaborador", description: "Quando o status de um colaborador mudar", icon: "Users" },
];

export const ACTION_OPTIONS: {
  value: ActionType;
  label: string;
  description: string;
  icon: string;
}[] = [
  { value: "create_task", label: "Criar tarefa", description: "Criar uma tarefa automaticamente", icon: "Plus" },
  { value: "update_file_status", label: "Alterar status", description: "Alterar o status de um arquivo", icon: "Tag" },
  { value: "move_file_to_folder", label: "Mover arquivo", description: "Mover arquivo para uma pasta", icon: "FolderInput" },
  { value: "assign_task", label: "Atribuir tarefa", description: "Atribuir tarefa a um colaborador", icon: "UserCheck" },
  { value: "send_notification", label: "Notificação", description: "Enviar notificação no app", icon: "Bell" },
  { value: "add_comment", label: "Comentário", description: "Adicionar comentário automático", icon: "MessageCircle" },
];

export const WORKFLOW_TEMPLATES = [
  {
    name: "Revisão automática de contratos",
    description: "Cria uma tarefa de revisão toda vez que um contrato é enviado",
    trigger_type: "file_uploaded" as TriggerType,
    trigger_conditions: { file_type: "Contrato" },
    actions: [{
      type: "create_task" as ActionType,
      config: { task_title: "Revisar: {{file_name}}", task_priority: "alta" },
    }],
  },
  {
    name: "Arquivar documentos revisados",
    description: "Altera o status do documento quando ele é revisado",
    trigger_type: "file_status_changed" as TriggerType,
    trigger_conditions: { to_status: "Revisado" },
    actions: [{
      type: "update_file_status" as ActionType,
      config: { new_status: "Arquivado" },
    }],
  },
  {
    name: "Notificar conclusão de tarefa",
    description: "Adiciona um comentário quando uma tarefa é concluída",
    trigger_type: "task_status_changed" as TriggerType,
    trigger_conditions: { task_to_status: "concluida" },
    actions: [{
      type: "add_comment" as ActionType,
      config: { comment_text: "Tarefa '{{task_title}}' concluída em {{date}}" },
    }],
  },
];
