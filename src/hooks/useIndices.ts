import { useQuery } from "@tanstack/react-query";
import {
  fetchIndices,
  fetchUltimoIndice,
  fetchTaxasAtuais,
  type NomeIndice,
} from "@/lib/calculators/indices";
import { supabase } from "@/integrations/supabase/client";

/** Hook for fetching a range of index values */
export function useIndices(
  indice: NomeIndice,
  dataInicial: Date,
  dataFinal: Date,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["indices", indice, dataInicial.toISOString(), dataFinal.toISOString()],
    queryFn: () => fetchIndices(indice, dataInicial, dataFinal),
    staleTime: 1000 * 60 * 60, // 1 hour — indices change infrequently
    enabled: options?.enabled ?? true,
  });
}

/** Hook for fetching the latest value of an index */
export function useUltimoIndice(indice: NomeIndice) {
  return useQuery({
    queryKey: ["indices", indice, "ultimo"],
    queryFn: () => fetchUltimoIndice(indice),
    staleTime: 1000 * 60 * 60,
  });
}

/** Hook for fetching current rates for all indices (dashboard display) */
export function useTaxasAtuais() {
  return useQuery({
    queryKey: ["indices", "taxas-atuais"],
    queryFn: fetchTaxasAtuais,
    staleTime: 1000 * 60 * 60,
  });
}

export interface IndiceRecente {
  indice: string;
  data_referencia: string;
  valor: number;
  atualizado_em: string;
}

// indices_economicos exists in the DB but was added after types were generated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const indicesTable = () => supabase.from("indices_economicos" as any);

/** Fetch the latest record for each available index (for the ticker banner). */
export function useIndicesRecentes() {
  return useQuery<IndiceRecente[]>({
    queryKey: ["indices", "recentes"],
    queryFn: async (): Promise<IndiceRecente[]> => {
      const { data, error } = await indicesTable()
        .select("indice, data_referencia, valor, atualizado_em")
        .order("data_referencia", { ascending: false })
        .limit(60);

      if (error) return [];

      // Deduplicate: keep the first (most recent) row per indice
      const seen = new Set<string>();
      return (data as IndiceRecente[]).filter((row) => {
        if (seen.has(row.indice)) return false;
        seen.add(row.indice);
        return true;
      });
    },
    staleTime: 5 * 60 * 1000,
  });
}
