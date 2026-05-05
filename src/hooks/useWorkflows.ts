import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Workflow, WorkflowAction, TriggerConditions, TriggerType } from "@/types/workflow";

export function useWorkflows() {
  const queryClient = useQueryClient();

  const workflowsQuery = useQuery({
    queryKey: ["workflows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflows")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((w: any) => ({
        ...w,
        trigger_conditions: w.trigger_conditions as TriggerConditions,
        actions: w.actions as WorkflowAction[],
      })) as Workflow[];
    },
  });

  const createWorkflow = useMutation({
    mutationFn: async (payload: {
      name: string;
      description?: string;
      trigger_type: TriggerType;
      trigger_conditions: TriggerConditions;
      actions: WorkflowAction[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("workflows")
        .insert({
          ...payload,
          user_id: user.id,
          trigger_conditions: payload.trigger_conditions as any,
          actions: payload.actions as any,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflows"] }),
  });

  const updateWorkflow = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; [key: string]: any }) => {
      const { error } = await supabase
        .from("workflows")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflows"] }),
  });

  const toggleWorkflow = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("workflows")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflows"] }),
  });

  const deleteWorkflow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workflows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflows"] }),
  });

  return { workflowsQuery, createWorkflow, updateWorkflow, toggleWorkflow, deleteWorkflow };
}
