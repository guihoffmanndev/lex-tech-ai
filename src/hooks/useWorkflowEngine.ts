import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { WorkflowAction } from "@/types/workflow";
import { useTrialStatus } from "@/hooks/useTrialStatus";

export function useWorkflowEngine() {
  const queryClient = useQueryClient();
  const { isTrialActive, isPaid } = useTrialStatus();

  const executeWorkflows = useCallback(async (
    triggerType: string,
    triggerData: Record<string, unknown>
  ) => {
    // Free users (expired trial, no paid plan) cannot run workflows
    if (!isTrialActive && !isPaid) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: workflows } = await supabase
      .from("workflows")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .eq("trigger_type", triggerType);

    if (!workflows || workflows.length === 0) return;

    for (const workflow of workflows) {
      const conditions = workflow.trigger_conditions as Record<string, unknown> | null;
      const shouldRun = evaluateConditions(conditions ?? {}, triggerData);

      if (!shouldRun) {
        await supabase.from("workflow_runs").insert({
          workflow_id: workflow.id,
          user_id: user.id,
          status: "skipped",
          trigger_data: triggerData,
        });
        continue;
      }

      try {
        const actions = (workflow.actions as WorkflowAction[]) ?? [];
        await executeActions(actions, triggerData, user.id);

        await supabase.from("workflow_runs").insert({
          workflow_id: workflow.id,
          user_id: user.id,
          status: "success",
          trigger_data: triggerData,
          actions_executed: workflow.actions,
        });

        await supabase
          .from("workflows")
          .update({
            run_count: (workflow.run_count ?? 0) + 1,
            last_run_at: new Date().toISOString(),
          })
          .eq("id", workflow.id);

        toast.info(`Workflow "${workflow.name}" executado`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        await supabase.from("workflow_runs").insert({
          workflow_id: workflow.id,
          user_id: user.id,
          status: "failed",
          trigger_data: triggerData,
          error_message: errorMessage,
        });
      }
    }

    queryClient.invalidateQueries({ queryKey: ["workflows"] });
    queryClient.invalidateQueries({ queryKey: ["collaborator-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["vault-files"] });
  }, [queryClient, isTrialActive, isPaid]);

  return { executeWorkflows };
}

function evaluateConditions(
  conditions: Record<string, unknown>,
  data: Record<string, unknown>
): boolean {
  if (!conditions || Object.keys(conditions).length === 0) return true;
  if (conditions.file_type && data.file_type !== conditions.file_type) return false;
  if (conditions.to_status && data.to_status !== conditions.to_status) return false;
  if (conditions.from_status && data.from_status !== conditions.from_status) return false;
  if (conditions.task_to_status && data.task_to_status !== conditions.task_to_status) return false;
  if (conditions.task_from_status && data.task_from_status !== conditions.task_from_status) return false;
  if (conditions.collaborator_to_status && data.collaborator_to_status !== conditions.collaborator_to_status) return false;
  return true;
}

async function executeActions(
  actions: WorkflowAction[],
  triggerData: Record<string, unknown>,
  userId: string
) {
  for (const action of actions) {
    const config = interpolateVariables(action.config ?? {}, triggerData);

    switch (action.type) {
      case "create_task":
        await supabase.from("collaborator_tasks").insert({
          user_id: userId,
          collaborator_id: config.task_assignee_id || null,
          title: config.task_title ?? "Tarefa automática",
          priority: config.task_priority ?? "normal",
          status: "afazer",
        });
        break;

      case "update_file_status":
        if (triggerData.file_id) {
          await supabase
            .from("vault_files")
            .update({ status: config.new_status })
            .eq("id", triggerData.file_id);
        }
        break;

      case "move_file_to_folder":
        if (triggerData.file_id && config.target_folder_id) {
          await supabase
            .from("vault_files")
            .update({ folder_id: config.target_folder_id })
            .eq("id", triggerData.file_id);
        }
        break;

      case "add_comment":
        if (triggerData.task_id) {
          await supabase.from("task_comments").insert({
            user_id: userId,
            task_id: triggerData.task_id,
            content: config.comment_text ?? "Ação automática executada.",
          });
        }
        break;
    }
  }
}

function interpolateVariables(
  config: WorkflowAction["config"],
  data: Record<string, unknown>
): WorkflowAction["config"] {
  const str = (v: unknown) => String(v ?? "");
  return Object.fromEntries(
    Object.entries(config).map(([key, value]) => [
      key,
      typeof value === "string"
        ? value
            .replace(/\{\{file_name\}\}/g, str(data.file_name))
            .replace(/\{\{file_type\}\}/g, str(data.file_type))
            .replace(/\{\{file_status\}\}/g, str(data.file_status))
            .replace(/\{\{task_title\}\}/g, str(data.task_title))
            .replace(/\{\{collaborator_name\}\}/g, str(data.collaborator_name))
            .replace(/\{\{date\}\}/g, new Date().toLocaleDateString("pt-BR"))
        : value,
    ])
  ) as WorkflowAction["config"];
}
