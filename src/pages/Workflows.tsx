import { useState } from "react";
import { Plus, Zap, Sparkles } from "lucide-react";
import { useWorkflows } from "@/hooks/useWorkflows";
import { useRecentes } from "@/hooks/useRecentes";
import { WORKFLOW_TEMPLATES } from "@/types/workflow";
import type { TriggerType, TriggerConditions, WorkflowAction, Workflow } from "@/types/workflow";
import WorkflowCard from "@/components/workflows/WorkflowCard";
import WorkflowCreateModal from "@/components/workflows/WorkflowCreateModal";
import { toast } from "sonner";

export default function Workflows() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const { workflowsQuery, createWorkflow, updateWorkflow, toggleWorkflow, deleteWorkflow } = useWorkflows();
  const { registrarAcesso } = useRecentes();

  const workflows = workflowsQuery.data ?? [];
  const loading = workflowsQuery.isLoading;

  const handleSubmit = async (data: {
    name: string;
    description?: string;
    trigger_type: TriggerType;
    trigger_conditions: TriggerConditions;
    actions: WorkflowAction[];
  }) => {
    try {
      if (editingWorkflow) {
        await updateWorkflow.mutateAsync({
          id: editingWorkflow.id,
          name: data.name,
          description: data.description || null,
          trigger_type: data.trigger_type,
          trigger_conditions: data.trigger_conditions as any,
          actions: data.actions as any,
        });
        toast.success("Workflow atualizado!");
      } else {
        await createWorkflow.mutateAsync(data);
        toast.success("Workflow criado com sucesso!");
      }
      setModalOpen(false);
      setEditingWorkflow(null);
    } catch {
      toast.error(editingWorkflow ? "Erro ao atualizar workflow" : "Erro ao criar workflow");
    }
  };

  const handleEdit = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setModalOpen(true);
    registrarAcesso.mutate({
      tipo: "workflow",
      item_id: workflow.id,
      item_nome: workflow.name,
      item_path: "/workflows",
    });
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingWorkflow(null);
  };

  const handleUseTemplate = async (template: typeof WORKFLOW_TEMPLATES[number]) => {
    try {
      await createWorkflow.mutateAsync({
        name: template.name,
        description: template.description,
        trigger_type: template.trigger_type,
        trigger_conditions: template.trigger_conditions,
        actions: template.actions,
      });
      toast.success(`Workflow "${template.name}" criado!`);
    } catch {
      toast.error("Erro ao criar workflow");
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold">Workflows</h1>
        <button
          onClick={() => { setEditingWorkflow(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Novo Workflow
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Automatize tarefas repetitivas do seu escritório
      </p>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && workflows.length > 0 && (
        <div className="space-y-3">
          {workflows.map(wf => (
            <WorkflowCard
              key={wf.id}
              workflow={wf}
              onToggle={(id, is_active) => toggleWorkflow.mutate({ id, is_active })}
              onDelete={(id) => deleteWorkflow.mutate(id)}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Empty state + Templates */}
      {!loading && workflows.length === 0 && (
        <div className="space-y-8">
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h2 className="text-lg font-medium">Nenhum workflow criado</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Crie seu primeiro workflow para automatizar tarefas
            </p>
            <button
              onClick={() => { setEditingWorkflow(null); setModalOpen(true); }}
              className="mt-4 text-primary text-sm hover:underline"
            >
              Criar workflow →
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">Templates prontos para usar</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {WORKFLOW_TEMPLATES.map((template, i) => (
                <div key={i} className="border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                  <h4 className="text-sm font-medium mb-1">{template.name}</h4>
                  <p className="text-xs text-muted-foreground mb-3">{template.description}</p>
                  <button
                    onClick={() => handleUseTemplate(template)}
                    disabled={createWorkflow.isPending}
                    className="text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    Usar este template →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Templates section when workflows exist */}
      {!loading && workflows.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Templates</h3>
          </div>
          <div className="flex gap-2 flex-wrap">
            {WORKFLOW_TEMPLATES.map((template, i) => (
              <button
                key={i}
                onClick={() => handleUseTemplate(template)}
                disabled={createWorkflow.isPending}
                className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-secondary transition-colors disabled:opacity-50"
              >
                + {template.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <WorkflowCreateModal
        open={modalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        submitting={createWorkflow.isPending || updateWorkflow.isPending}
        initialData={editingWorkflow}
      />
    </div>
  );
}
