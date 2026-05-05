import { useState, useEffect } from "react";
import { X, Download, FileText, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface VaultFile {
  id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  type: string;
  status: string;
  client: string | null;
  created_at: string;
}

interface DocumentPreviewSidebarProps {
  doc: VaultFile | null;
  open: boolean;
  onClose: () => void;
}

const getFileCategory = (mimeType: string | null, name: string) => {
  if (mimeType === "application/pdf" || name.toLowerCase().endsWith(".pdf")) return "pdf";
  if (mimeType?.startsWith("image/")) return "image";
  const ext = name.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext || "")) return "image";
  return "other";
};

export default function DocumentPreviewSidebar({ doc, open, onClose }: DocumentPreviewSidebarProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !doc) {
      setSignedUrl(null);
      setError(null);
      return;
    }

    const fetchUrl = async () => {
      setLoadingUrl(true);
      setError(null);
      try {
        const { data, error: urlError } = await supabase.storage
          .from("vault-files")
          .createSignedUrl(doc.file_path, 3600);
        if (urlError) throw urlError;
        setSignedUrl(data.signedUrl);
      } catch {
        setError("Não foi possível carregar o arquivo.");
        setSignedUrl(null);
      } finally {
        setLoadingUrl(false);
      }
    };

    fetchUrl();
  }, [open, doc]);

  const handleDownload = async () => {
    if (!doc) return;
    try {
      const { data, error } = await supabase.storage
        .from("vault-files")
        .createSignedUrl(doc.file_path, 60);
      if (error) throw error;
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = doc.name;
      a.click();
    } catch {
      // fallback: use existing signed url
      if (signedUrl) {
        const a = document.createElement("a");
        a.href = signedUrl;
        a.download = doc.name;
        a.click();
      }
    }
  };

  const category = doc ? getFileCategory(doc.mime_type, doc.name) : "other";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] flex flex-col p-0 gap-0">
        {/* Header */}
        <SheetHeader className="p-4 border-b border-border shrink-0">
          <SheetTitle className="truncate pr-8 text-base">{doc?.name ?? ""}</SheetTitle>
        </SheetHeader>

        {/* Preview Area */}
        <div className="flex-1 overflow-hidden flex items-center justify-center p-4 min-h-0">
          {loadingUrl ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Carregando preview...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-8 w-8" />
              <p className="text-sm">{error}</p>
            </div>
          ) : category === "pdf" && signedUrl ? (
            <iframe
              src={signedUrl}
              className="w-full h-full rounded-lg border border-border"
              title={doc?.name}
            />
          ) : category === "image" && signedUrl ? (
            <img
              src={signedUrl}
              alt={doc?.name}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <FileText className="h-16 w-16 opacity-30" />
              <p className="text-sm font-medium">Pré-visualização não disponível para este formato</p>
              <p className="text-xs">Faça o download para visualizar o arquivo</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-4 border-t border-border shrink-0">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors"
          >
            Fechar
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
