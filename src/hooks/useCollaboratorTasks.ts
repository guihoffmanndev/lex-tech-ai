import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkflowEngine } from "@/hooks/useWorkflowEngine";

export interface CollaboratorTask {
  id: string;
  user_id: string;
  collaborator_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  case_name: string | null;
  created_at: string;
}

export function useCollaboratorTasks() {
  const queryClient = useQueryClient();
  const { executeWorkflows } = useWorkflowEngine();

  const tasksQuery = useQuery({
    queryKey: ["collaborator-tasks"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("collaborator_tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as CollaboratorTask[];
    },
  });

  const createTask = useMutation({
    mutationFn: async (payload: {
      title: string;
      collaborator_id?: string | null;
      description?: string;
      status?: string;
      priority?: string;
      due_date?: string | null;
      case_name?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("collaborator_tasks")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as CollaboratorTask;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ["collaborator-tasks"] });
      executeWorkflows("task_created", {
        task_id: task.id,
        task_title: task.title,
      });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, previousStatus, ...payload }: { id: string; previousStatus?: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("collaborator_tasks")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { ...(data as CollaboratorTask), previousStatus };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["collaborator-tasks"] });

      if (result.previousStatus && result.status !== result.previousStatus) {
        executeWorkflows("task_status_changed", {
          task_id: result.id,
          task_title: result.title,
          task_from_status: result.previousStatus,
          task_to_status: result.status,
        });
      }
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("collaborator_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["collaborator-tasks"] }),
  });

  return { tasksQuery, createTask, updateTask, deleteTask };
}
