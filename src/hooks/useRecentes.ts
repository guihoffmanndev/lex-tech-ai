import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback } from "react";

export type RecentItemType = "documento" | "conversa_ia" | "workflow" | "honorario" | "relatorio" | "colaborador";

export interface RecentItem {
  id: string;
  user_id: string;
  tipo: RecentItemType;
  item_id: string;
  item_nome: string;
  item_path: string;
  acessado_em: string;
}

export function useRecentes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const recentesQuery = useQuery({
    queryKey: ["recentes", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_recentes")
        .select("*")
        .eq("user_id", user!.id)
        .order("acessado_em", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Deduplicate by item_id, keep most recent
      const seen = new Set<string>();
      const unique: RecentItem[] = [];
      for (const item of (data ?? []) as RecentItem[]) {
        if (!seen.has(item.item_id)) {
          seen.add(item.item_id);
          unique.push(item);
        }
      }
      return unique.slice(0, 3);
    },
  });

  const registrarAcesso = useMutation({
    mutationFn: async (params: {
      tipo: RecentItemType;
      item_id: string;
      item_nome: string;
      item_path: string;
    }) => {
      if (!user?.id) return;

      // Delete old entry for same item
      await supabase
        .from("historico_recentes")
        .delete()
        .eq("user_id", user.id)
        .eq("item_id", params.item_id);

      // Insert new
      const { error } = await supabase.from("historico_recentes").insert({
        user_id: user.id,
        tipo: params.tipo,
        item_id: params.item_id,
        item_nome: params.item_nome,
        item_path: params.item_path,
      });
      if (error) throw error;

      // Cleanup: keep max 10
      const { data: all } = await supabase
        .from("historico_recentes")
        .select("id, acessado_em")
        .eq("user_id", user.id)
        .order("acessado_em", { ascending: false });

      if (all && all.length > 10) {
        const idsToDelete = all.slice(10).map((i) => i.id);
        await supabase.from("historico_recentes").delete().in("id", idsToDelete);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recentes", user?.id] });
    },
  });

  return { recentesQuery, registrarAcesso };
}
