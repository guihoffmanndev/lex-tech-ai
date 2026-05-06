import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useWorkflowEngine } from "@/hooks/useWorkflowEngine";
import posthog from "posthog-js";

export function useVaultActions() {
  const queryClient = useQueryClient();
  const { executeWorkflows } = useWorkflowEngine();

  const moveFileToFolder = useMutation({
    mutationFn: async ({ fileId, folderId }: { fileId: string; folderId: string | null }) => {
      const { error } = await supabase
        .from("vault_files")
        .update({ folder_id: folderId })
        .eq("id", fileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-files"] });
      queryClient.invalidateQueries({ queryKey: ["vault-folders"] });
      toast.success("Arquivo movido com sucesso");
    },
    onError: () => toast.error("Erro ao mover arquivo"),
  });

  const deleteFile = useMutation({
    mutationFn: async ({ fileId, filePath }: { fileId: string; filePath: string }) => {
      await supabase.storage.from("vault-files").remove([filePath]);
      const { error } = await supabase.from("vault_files").delete().eq("id", fileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-files"] });
      queryClient.invalidateQueries({ queryKey: ["vault-folders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Documento excluído");
    },
    onError: () => toast.error("Erro ao excluir documento"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ fileId, status, fileName, previousStatus }: {
      fileId: string;
      status: string;
      fileName?: string;
      previousStatus?: string;
    }) => {
      const { error } = await supabase
        .from("vault_files")
        .update({ status })
        .eq("id", fileId);
      if (error) throw error;
      return { fileId, status, fileName, previousStatus };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["vault-files"] });
      toast.success("Status atualizado");

      if (result) {
        posthog.capture("vault_document_status_changed", {
          from_status: result.previousStatus ?? "",
          to_status: result.status,
        });
        executeWorkflows("file_status_changed", {
          file_id: result.fileId,
          file_name: result.fileName ?? "",
          from_status: result.previousStatus ?? "",
          to_status: result.status,
        });
      }
    },
  });

  const downloadFile = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from("vault-files").download(filePath);
    if (error || !data) {
      toast.error("Erro ao baixar arquivo");
      return;
    }
    posthog.capture("vault_document_downloaded", { file_name: fileName });
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return { deleteFile, updateStatus, downloadFile, moveFileToFolder };
}
