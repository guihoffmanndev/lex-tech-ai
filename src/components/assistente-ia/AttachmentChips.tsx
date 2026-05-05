import { useMemo } from "react";
import { FileText, ImageIcon, X } from "lucide-react";

export interface ChatFile {
  file: File;
  preview?: string; // object URL for images
}

interface AttachmentChipsProps {
  files: ChatFile[];
  onRemove: (index: number) => void;
}

function truncateName(name: string, max = 20): string {
  const dotIdx = name.lastIndexOf(".");
  if (dotIdx === -1) return name.length > max ? name.slice(0, max) + "…" : name;
  const ext = name.slice(dotIdx);
  const base = name.slice(0, dotIdx);
  if (base.length <= max) return name;
  return base.slice(0, max) + "…" + ext;
}

function isImage(file: File) {
  return file.type.startsWith("image/");
}

export default function AttachmentChips({ files, onRemove }: AttachmentChipsProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2">
      {files.map((cf, i) => (
        <div
          key={`${cf.file.name}-${i}`}
          className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md bg-secondary border border-border text-xs text-foreground animate-in fade-in-0 slide-in-from-bottom-1"
        >
          {isImage(cf.file) && cf.preview ? (
            <img
              src={cf.preview}
              alt={cf.file.name}
              className="h-5 w-5 rounded object-cover shrink-0"
            />
          ) : isImage(cf.file) ? (
            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="max-w-[140px] truncate">{truncateName(cf.file.name)}</span>
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
