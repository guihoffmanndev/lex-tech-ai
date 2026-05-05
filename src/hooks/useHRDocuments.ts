import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const HR_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];
const HR_MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export interface HRFolder {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface HRDocument {
  id: string;
  user_id: string;
  collaborator_id: string | null;
  folder_id: string | null;
  name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export function useHRDocuments() {
  const queryClient = useQueryClient();

  const foldersQuery = useQuery({
    queryKey: ["hr-folders"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("hr_folders")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      return (data ?? []) as HRFolder[];
    },
  });

  const documentsQuery = useQuery({
    queryKey: ["hr-documents"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("hr_documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as HRDocument[];
    },
  });

  const createFolder = useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("hr_folders")
        .insert({ name, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as HRFolder;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hr-folders"] }),
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_folders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hr-folders"] }),
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ file, folderId, collaboratorId }: { file: File; folderId?: string | null; collaboratorId?: string | null }) => {
      // Validate file type and size
      if (!HR_ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new Error("Tipo de arquivo não permitido. Aceitos: PDF, DOC, DOCX, JPG, PNG.");
      }
      if (file.size > HR_MAX_FILE_SIZE) {
        throw new Error("Arquivo muito grande. Tamanho máximo: 20 MB.");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const fileId = crypto.randomUUID();
      const extension = file.name.split(".").pop();
      const storagePath = `${user.id}/${fileId}.${extension}`;

      const { error: storageError } = await supabase.storage
        .from("hr-documents")
        .upload(storagePath, file, { upsert: false });

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("hr_documents")
        .insert({
          id: fileId,
          user_id: user.id,
          collaborator_id: collaboratorId ?? null,
          folder_id: folderId ?? null,
          name: file.name.replace(/\.[^/.]+$/, ""),
          file_path: storagePath,
          file_size: file.size,
          mime_type: file.type,
        });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-documents"] });
      queryClient.invalidateQueries({ queryKey: ["hr-folders"] });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      await supabase.storage.from("hr-documents").remove([filePath]);
      const { error } = await supabase.from("hr_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-documents"] });
      queryClient.invalidateQueries({ queryKey: ["hr-folders"] });
    },
  });

  return { foldersQuery, documentsQuery, createFolder, deleteFolder, uploadDocument, deleteDocument };
}
