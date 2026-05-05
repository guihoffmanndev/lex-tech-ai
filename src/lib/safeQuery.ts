import { getSupabaseErrorMessage } from "./supabaseError";
import type { PostgrestError } from "@supabase/supabase-js";

export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>
): Promise<T> {
  const { data, error } = await queryFn();

  if (error) {
    const message = getSupabaseErrorMessage(error);
    throw new Error(message);
  }

  if (data === null) {
    throw new Error("Nenhum dado retornado.");
  }

  return data;
}
