import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, FileIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { type HRFolder } from "@/hooks/useHRDocuments";

interface HRUploadSidebarProps {
  open: boolean;
  onClose: () => void;
  folders: HRFolder[];
  defaultFolderId?: string | null;
  onUpload: (files: File[], customName: string, folderId: string | null) => Promise<void>;
  uploading: boolean;
}

export default function HRUploadSidebar({
  open,
  onClose,
  folders,
  defaultFolderId,
  onUpload,
  uploading,
}: HRUploadSidebarProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [customName, setCustomName] = useState("");
  const [folderId, setFolderId] = useState<string | null>(defaultFolderId ?? null);

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
    await onUpload(files, customName, folderId);
    setFiles([]);
    setCustomName("");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-[420px] bg-background border-l shadow-xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-lg">Upload de Documento RH</h2>
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

          {/* Custom name */}
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

          {/* Folder */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Pasta</label>
            <select
              value={folderId ?? ""}
              onChange={(e) => setFolderId(e.target.value || null)}
              className="w-full px-3 py-2.5 bg-secondary rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">— Sem pasta —</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
          </div>

          {/* Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Enviando...</span>
              </div>
              <Progress value={100} className="h-2 animate-pulse" />
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
              ? "Enviando..."
              : `Enviar${files.length > 1 ? ` (${files.length})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
