import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LegalCase {
  id: string;
  user_id: string;
  numero_processo: string;
  area: string;
  valor_causa: number;
  percentual_honorarios: number;
  custo_mensal: number;
  custas_adiantadas: number;
  data_prevista_encerramento: string | null;
  score_risco: "baixa" | "media" | "alta";
  status: "ativa" | "encerrada" | "suspensa";
  cliente: string | null;
  client_id: string | null;
  descricao: string | null;
  tipo_honorario: "contratual" | "sucumbencial" | "consultivo";
  created_at: string;
  updated_at: string;
}

const RISK_WEIGHTS: Record<string, number> = {
  baixa: 0.25,
  media: 0.5,
  alta: 0.8,
};

export function getRiskWeight(score: string) {
  return RISK_WEIGHTS[score] ?? 0.5;
}

export function useLegalCases(filters?: { status?: string; area?: string }) {
  const queryClient = useQueryClient();

  const casesQuery = useQuery({
    queryKey: ["legal-cases", filters],
    queryFn: async () => {
      let query = supabase
        .from("legal_cases")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.area) query = query.eq("area", filters.area);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as LegalCase[];
    },
  });

  const createCase = useMutation({
    mutationFn: async (payload: Omit<LegalCase, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("legal_cases")
        .insert({ ...payload, user_id: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal-cases"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
  });

  const updateCase = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("legal_cases")
        .update(payload as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal-cases"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
  });

  const deleteCase = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("legal_cases")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal-cases"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
  });

  // Derived metrics
  const cases = casesQuery.data ?? [];
  const activeCases = cases.filter(c => c.status === "ativa");

  const potencialExito = activeCases.reduce((sum, c) => {
    const weight = getRiskWeight(c.score_risco);
    return sum + (Number(c.valor_causa) * (Number(c.percentual_honorarios) / 100) * weight);
  }, 0);

  const burnRate = activeCases.reduce((sum, c) => sum + Number(c.custo_mensal), 0);
  const totalCustasAdiantadas = activeCases.reduce((sum, c) => sum + Number(c.custas_adiantadas), 0);

  return {
    casesQuery,
    createCase,
    updateCase,
    deleteCase,
    potencialExito,
    burnRate,
    totalCustasAdiantadas,
  };
}
