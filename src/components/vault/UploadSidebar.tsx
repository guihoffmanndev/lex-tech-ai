import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, FileIcon } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useVaultFolders } from "@/hooks/useVaultFolders";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

const DOCUMENT_TYPES = ["Contrato", "Petição", "Parecer", "Procuração", "Outro"] as const;

interface UploadSidebarProps {
  open: boolean;
  onClose: () => void;
  defaultFolderId?: string | null;
  initialFiles?: File[];
}

export default function UploadSidebar({ open, onClose, defaultFolderId, initialFiles }: UploadSidebarProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [customName, setCustomName] = useState("");
  const [docType, setDocType] = useState<typeof DOCUMENT_TYPES[number]>("Contrato");
  const [clientName, setClientName] = useState("");
  const [folderId, setFolderId] = useState<string | null>(defaultFolderId ?? null);

  const { uploadFile, uploading, progress } = useFileUpload();
  const { foldersQuery } = useVaultFolders();

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [...prev, ...accepted]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "image/*": [".png", ".jpg", ".jpeg"],
    },
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    let successCount = 0;
    for (const file of files) {
      const ok = await uploadFile(file, {
        type: docType,
        client: clientName || undefined,
        folderId,
        customName: files.length === 1 ? customName : undefined,
      });
      if (ok) successCount++;
    }

    if (successCount > 0) {
      toast.success(`${successCount} arquivo(s) enviado(s) com sucesso!`);
      setFiles([]);
      setCustomName("");
      setClientName("");
      onClose();
    }
  };

  // Load initial files from drag-and-drop
  useState(() => {
    if (initialFiles && initialFiles.length > 0) {
      setFiles(initialFiles);
    }
  });

  // Sync initialFiles when they change
  const prevInitialFiles = useRef<File[]>();
  if (initialFiles && initialFiles !== prevInitialFiles.current && initialFiles.length > 0) {
    prevInitialFiles.current = initialFiles;
    setFiles(initialFiles);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-[420px] bg-background border-l shadow-xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-lg">Upload de Documento</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {isDragActive ? "Solte aqui!" : "Arraste arquivos ou clique para selecionar"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, PNG, JPG</p>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-secondary text-sm">
                  <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
                  <button onClick={() => removeFile(i)} className="text-destructive hover:text-destructive/80 ml-1">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* File name */}
          {files.length === 1 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome do arquivo</label>
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={files[0].name.replace(/\.[^/.]+$/, "")}
                className="w-full px-3 py-2.5 bg-secondary rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">Deixe vazio para usar o nome original</p>
            </div>
          )}

          {/* Document type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tipo de documento</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-secondary rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Client */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Cliente (opcional)</label>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nome do cliente"
              className="w-full px-3 py-2.5 bg-secondary rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Folder */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Pasta (opcional)</label>
            <select
              value={folderId ?? ""}
              onChange={(e) => setFolderId(e.target.value || null)}
              className="w-full px-3 py-2.5 bg-secondary rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">— Sem pasta —</option>
              {foldersQuery.data?.map((folder) => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
          </div>

          {/* Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Enviando...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-secondary">
            Cancelar
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {uploading
              ? `Enviando... ${progress}%`
              : `Enviar${files.length > 1 ? ` (${files.length})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
