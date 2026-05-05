import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VaultFolder {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  item_count?: number;
}

export function useVaultFolders() {
  const queryClient = useQueryClient();

  const foldersQuery = useQuery({
    queryKey: ["vault-folders"],
    queryFn: async () => {
      const { data: folders, error } = await supabase
        .from("vault_folders")
        .select("*")
        .order("name");
      if (error) throw error;
      if (!folders || folders.length === 0) return [];

      // Count files and subfolders for each folder in parallel
      const counts = await Promise.all(
        folders.map(async (folder) => {
          const [filesRes, subfoldersRes] = await Promise.all([
            supabase
              .from("vault_files")
              .select("*", { count: "exact", head: true })
              .eq("folder_id", folder.id),
            supabase
              .from("vault_folders")
              .select("*", { count: "exact", head: true })
              .eq("parent_id", folder.id),
          ]);
          return (filesRes.count ?? 0) + (subfoldersRes.count ?? 0);
        })
      );

      return folders.map((f, i) => ({ ...f, item_count: counts[i] }));
    },
  });

  const createFolder = useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("vault_folders")
        .insert({ name, user_id: user.id, parent_id: parentId ?? null })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-folders"] });
    },
  });

  const updateFolder = useMutation({
    mutationFn: async ({ id, name, parentId }: { id: string; name?: string; parentId?: string | null }) => {
      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (parentId !== undefined) updates.parent_id = parentId;

      const { error } = await supabase
        .from("vault_folders")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-folders"] });
    },
  });

  const deleteFolder = useMutation({
    mutationFn: async (folderId: string) => {
      const { error } = await supabase
        .from("vault_folders")
        .delete()
        .eq("id", folderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-folders"] });
      queryClient.invalidateQueries({ queryKey: ["vault-files"] });
    },
  });

  return { foldersQuery, createFolder, updateFolder, deleteFolder };
}
