import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FinancialTransaction {
  id: string;
  user_id: string;
  description: string;
  type: "receita" | "despesa";
  amount: number;
  category: string;
  area: string | null;
  client: string | null;
  client_id: string | null;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useFinancialTransactions(filters?: {
  type?: "receita" | "despesa";
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const queryClient = useQueryClient();

  const transactionsQuery = useQuery({
    queryKey: ["financial-transactions", filters],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      let query = supabase
        .from("financial_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (filters?.type) query = query.eq("type", filters.type);
      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.dateFrom) query = query.gte("created_at", filters.dateFrom);
      if (filters?.dateTo) query = query.lte("created_at", filters.dateTo + "T23:59:59");

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as FinancialTransaction[];
    },
  });

  const createTransaction = useMutation({
    mutationFn: async (payload: {
      description: string;
      type: "receita" | "despesa";
      amount: number;
      category: string;
      area?: string;
      client?: string;
      client_id?: string;
      status?: string;
      due_date?: string;
      paid_at?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("financial_transactions")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-payments"] });
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<FinancialTransaction> & { id: string }) => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-payments"] });
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_transactions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-payments"] });
    },
  });

  return { transactionsQuery, createTransaction, updateTransaction, deleteTransaction };
}
