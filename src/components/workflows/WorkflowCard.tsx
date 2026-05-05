import { Zap, Trash2, Activity, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { Workflow } from "@/types/workflow";
import { TRIGGER_OPTIONS } from "@/types/workflow";

interface Props {
  workflow: Workflow;
  onToggle: (id: string, is_active: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (workflow: Workflow) => void;
}

export default function WorkflowCard({ workflow, onToggle, onDelete, onEdit }: Props) {
  const trigger = TRIGGER_OPTIONS.find(t => t.value === workflow.trigger_type);

  return (
    <div className="border border-border rounded-xl p-4 hover:border-primary/30 transition-colors bg-card">
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer"
          onClick={() => onEdit(workflow)}
        >
          <div className={`p-2 rounded-lg shrink-0 ${workflow.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
            <Zap className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm truncate">{workflow.name}</h3>
            {workflow.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{workflow.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {trigger && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {trigger.label}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Activity className="h-3 w-3" />
                {workflow.run_count} execuções
              </span>
              {workflow.last_run_at && (
                <span className="text-[11px] text-muted-foreground">
                  Última: {new Date(workflow.last_run_at).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onEdit(workflow)}
            className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-primary/10"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <Switch
            checked={workflow.is_active}
            onCheckedChange={(checked) => onToggle(workflow.id, checked)}
          />
          <button
            onClick={() => onDelete(workflow.id)}
            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
