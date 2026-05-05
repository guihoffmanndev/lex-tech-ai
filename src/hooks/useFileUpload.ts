import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkflowEngine } from "@/hooks/useWorkflowEngine";

type DocumentType = "Contrato" | "Petição" | "Parecer" | "Procuração" | "Outro";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

interface UploadOptions {
  folderId?: string | null;
  client?: string;
  type: DocumentType;
  customName?: string;
}

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { executeWorkflows } = useWorkflowEngine();

  const uploadFile = async (file: File, options: UploadOptions) => {
    setUploading(true);
    setError(null);
    setProgress(10);

    try {
      // Validate file type and size
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new Error("Tipo de arquivo não permitido. Aceitos: PDF, DOC, DOCX, JPG, PNG.");
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("Arquivo muito grande. Tamanho máximo: 20 MB.");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const fileId = crypto.randomUUID();
      const extension = file.name.split(".").pop();
      const storagePath = `${user.id}/${fileId}.${extension}`;

      setProgress(30);

      const { error: storageError } = await supabase.storage
        .from("vault-files")
        .upload(storagePath, file, { upsert: false });

      if (storageError) throw storageError;
      setProgress(70);

      const { error: dbError } = await supabase
        .from("vault_files")
        .insert({
          id: fileId,
          user_id: user.id,
          folder_id: options.folderId ?? null,
          name: options.customName?.trim() || file.name.replace(/\.[^/.]+$/, ""),
          type: options.type,
          client: options.client || null,
          status: "Em análise",
          file_path: storagePath,
          file_size: file.size,
          mime_type: file.type,
        });

      if (dbError) throw dbError;
      setProgress(100);

      queryClient.invalidateQueries({ queryKey: ["vault-files"] });
      queryClient.invalidateQueries({ queryKey: ["vault-folders"] });

      // Trigger workflows
      executeWorkflows("file_uploaded", {
        file_id: fileId,
        file_name: options.customName?.trim() || file.name.replace(/\.[^/.]+$/, ""),
        file_type: options.type,
        folder_id: options.folderId,
      });

      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido no upload");
      return false;
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, uploading, progress, error };
}
