import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkflowEngine } from "@/hooks/useWorkflowEngine";

export interface Collaborator {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  department: string | null;
  avatar_url: string | null;
  status: string;
  hire_date: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export function useCollaborators() {
  const queryClient = useQueryClient();
  const { executeWorkflows } = useWorkflowEngine();

  const collaboratorsQuery = useQuery({
    queryKey: ["collaborators"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("collaborators")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      return (data ?? []) as Collaborator[];
    },
  });

  const createCollaborator = useMutation({
    mutationFn: async (payload: Omit<Collaborator, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("collaborators")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as Collaborator;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["collaborators"] }),
  });

  const updateCollaborator = useMutation({
    mutationFn: async ({ id, previousStatus, ...payload }: Partial<Collaborator> & { id: string; previousStatus?: string }) => {
      const { data, error } = await supabase
        .from("collaborators")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { ...(data as Collaborator), previousStatus };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["collaborators"] });

      if (result.previousStatus && result.status !== result.previousStatus) {
        executeWorkflows("collaborator_status_changed", {
          collaborator_id: result.id,
          collaborator_name: result.name,
          collaborator_to_status: result.status,
        });
      }
    },
  });

  const deleteCollaborator = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("collaborators").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["collaborators"] }),
  });

  return { collaboratorsQuery, createCollaborator, updateCollaborator, deleteCollaborator };
}
