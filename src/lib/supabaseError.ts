import type { PostgrestError } from "@supabase/supabase-js";

const ERROR_MESSAGES: Record<string, string> = {
  "23505": "Este registro já existe.",
  "23503": "Referência inválida — registro relacionado não encontrado.",
  "42501": "Você não tem permissão para realizar esta ação.",
  "PGRST116": "Nenhum registro encontrado.",
  "PGRST301": "Sessão expirada. Faça login novamente.",
};

export function getSupabaseErrorMessage(error: PostgrestError): string {
  return (
    ERROR_MESSAGES[error.code] ??
    "Ocorreu um erro inesperado. Tente novamente."
  );
}
