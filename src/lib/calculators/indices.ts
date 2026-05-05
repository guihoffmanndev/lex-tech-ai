import { supabase } from "@/integrations/supabase/client";
import Decimal from "decimal.js";

export type NomeIndice =
  | "IPCA"
  | "IPCA-E"
  | "IPCA-15"
  | "INPC"
  | "IGP-M"
  | "TR"
  | "SELIC"
  | "SELIC_META"
  | "CDI"
  | "SALARIO_MINIMO";

// BCB SGS series codes
export const SGS_CODES: Record<NomeIndice, number> = {
  IPCA: 433,
  "IPCA-E": 10764,
  "IPCA-15": 7478,
  INPC: 188,
  "IGP-M": 189,
  TR: 226,
  SELIC: 11,
  SELIC_META: 4390,
  CDI: 12,
  SALARIO_MINIMO: 1619,
};

export interface IndiceRecord {
  data_referencia: string; // YYYY-MM-DD
  valor: Decimal;
}

/**
 * Fetch indices from Supabase cache for a given series and date range.
 * Returns records sorted by date ascending.
 */
export async function fetchIndices(
  indice: NomeIndice,
  dataInicial: Date,
  dataFinal: Date
): Promise<IndiceRecord[]> {
  const codigoSgs = SGS_CODES[indice];

  const { data, error } = await supabase
    .from("indices_economicos")
    .select("data_referencia, valor")
    .eq("codigo_sgs", codigoSgs)
    .gte("data_referencia", dataInicial.toISOString().split("T")[0])
    .lte("data_referencia", dataFinal.toISOString().split("T")[0])
    .order("data_referencia", { ascending: true });

  if (error) throw new Error(`Erro ao buscar índice ${indice}: ${error.message}`);

  return (data ?? []).map((row) => ({
    data_referencia: row.data_referencia,
    valor: new Decimal(row.valor),
  }));
}

/**
 * Fetch the most recent value of an index.
 */
export async function fetchUltimoIndice(indice: NomeIndice): Promise<IndiceRecord | null> {
  const codigoSgs = SGS_CODES[indice];

  const { data, error } = await supabase
    .from("indices_economicos")
    .select("data_referencia, valor")
    .eq("codigo_sgs", codigoSgs)
    .order("data_referencia", { ascending: false })
    .limit(1)
    .single();

  if (error) return null;

  return {
    data_referencia: data.data_referencia,
    valor: new Decimal(data.valor),
  };
}

/**
 * Fetch all available indices (latest value for each) for dashboard display.
 */
export async function fetchTaxasAtuais(): Promise<Record<NomeIndice, IndiceRecord | null>> {
  const results = await Promise.all(
    (Object.keys(SGS_CODES) as NomeIndice[]).map(async (indice) => ({
      indice,
      record: await fetchUltimoIndice(indice),
    }))
  );

  return Object.fromEntries(
    results.map(({ indice, record }) => [indice, record])
  ) as Record<NomeIndice, IndiceRecord | null>;
}
