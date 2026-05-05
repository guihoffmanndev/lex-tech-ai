import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useVaultFiles(folderId?: string | null, searchQuery?: string) {
  return useQuery({
    queryKey: ["vault-files", folderId, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("vault_files")
        .select("*, vault_folders(id, name)")
        .order("created_at", { ascending: false });

      // When searching, ignore folder filter to search across all folders
      if (searchQuery && searchQuery.trim()) {
        const q = `%${searchQuery.trim()}%`;
        query = query.or(`name.ilike.${q},client.ilike.${q},type.ilike.${q}`);
      } else if (folderId) {
        query = query.eq("folder_id", folderId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}
