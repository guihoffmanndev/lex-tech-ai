import { useRef } from "react";
import { Paperclip, FileText, ImageIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const DOC_ACCEPT = ".pdf,.doc,.docx,.txt,.csv,.xlsx";
const IMG_ACCEPT = "image/*";

interface AttachmentMenuProps {
  disabled: boolean;
  onFilesSelected: (files: File[]) => void;
  showLabel?: boolean;
}

export default function AttachmentMenu({ disabled, onFilesSelected, showLabel }: AttachmentMenuProps) {
  const docInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const valid: File[] = [];
    for (const f of Array.from(fileList)) {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`"${f.name}" excede o limite de 10MB.`);
        continue;
      }
      valid.push(f);
    }
    if (valid.length > 0) onFilesSelected(valid);
  };

  return (
    <>
      <input
        ref={docInputRef}
        type="file"
        accept={DOC_ACCEPT}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={imgInputRef}
        type="file"
        accept={IMG_ACCEPT}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            <Paperclip className="h-4 w-4" />
            {showLabel && <span>Arquivos</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          sideOffset={8}
          className="w-48 p-1.5 animate-in fade-in-0 slide-in-from-bottom-2"
        >
          <button
            type="button"
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm hover:bg-secondary transition-colors text-foreground"
            onClick={() => docInputRef.current?.click()}
          >
            <FileText className="h-4 w-4 text-muted-foreground" />
            Documento
          </button>
          <button
            type="button"
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm hover:bg-secondary transition-colors text-foreground"
            onClick={() => imgInputRef.current?.click()}
          >
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            Foto
          </button>
        </PopoverContent>
      </Popover>
    </>
  );
}
