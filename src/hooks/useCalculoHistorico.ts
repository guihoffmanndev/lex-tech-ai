import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalculoHistorico {
  id: string;
  user_id: string;
  area: string;
  tipo: string;
  titulo: string | null;
  inputs_json: Record<string, unknown>;
  resultado_json: Record<string, unknown>;
  steps_json: unknown[] | null;
  created_at: string;
}

export interface CalculoHistoricoInsert {
  area: string;
  tipo: string;
  titulo?: string | null;
  inputs_json: Record<string, unknown>;
  resultado_json: Record<string, unknown>;
  steps_json?: unknown[] | null;
}

export interface HistoricoFilters {
  area?: string; // "" or undefined = all
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
}

// ─── Query key ────────────────────────────────────────────────────────────────

export const historicoKeys = {
  all: ["calculos_historico"] as const,
  filtered: (filters: HistoricoFilters) =>
    ["calculos_historico", filters] as const,
};

// calculos_historico exists in the DB but was added after types were generated.
// The table name cast is the minimum needed to use this table until types are regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const historicoTable = () => supabase.from("calculos_historico" as any);

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** List the authenticated user's saved calculations, optionally filtered. */
export function useCalculosHistorico(filters: HistoricoFilters = {}) {
  return useQuery({
    queryKey: historicoKeys.filtered(filters),
    queryFn: async (): Promise<CalculoHistorico[]> => {
      let q = historicoTable()
        .select("*")
        .order("created_at", { ascending: false });

      if (filters.area) q = q.eq("area", filters.area);
      if (filters.dateFrom) q = q.gte("created_at", filters.dateFrom);
      if (filters.dateTo) q = q.lte("created_at", filters.dateTo + "T23:59:59");

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CalculoHistorico[];
    },
    staleTime: 30_000,
  });
}

/** Delete a calculation from history. */
export function useDeleteCalculo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await historicoTable().delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: historicoKeys.all });
      toast.success("Cálculo removido do histórico.");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao excluir cálculo.");
    },
  });
}

/** Save a new calculation to history. Returns the inserted row id. */
export function useSalvarCalculo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CalculoHistoricoInsert): Promise<string> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await historicoTable()
        .insert({ ...payload, user_id: user.id })
        .select("id")
        .single();

      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: historicoKeys.all });
      toast.success("Cálculo salvo no histórico!");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao salvar cálculo.");
    },
  });
}
