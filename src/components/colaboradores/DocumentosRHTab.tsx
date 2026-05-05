import { useState } from "react";
import { Folder, Trash2, Plus, Loader2, FileText, FolderPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useHRDocuments } from "@/hooks/useHRDocuments";
import { useCollaborators } from "@/hooks/useCollaborators";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import HRUploadSidebar from "./HRUploadSidebar";

export function DocumentosRHTab() {
  const { foldersQuery, documentsQuery, createFolder, uploadDocument, deleteFolder, deleteDocument } = useHRDocuments();
  const { collaboratorsQuery } = useCollaborators();
  const folders = foldersQuery.data ?? [];
  const documents = documentsQuery.data ?? [];
  const collaborators = collaboratorsQuery.data ?? [];

  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>("all");
  const [deletingDoc, setDeletingDoc] = useState<{ id: string; filePath: string } | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Count documents per folder
  const folderDocCount = (folderId: string) =>
    documents.filter((d) => d.folder_id === folderId).length;

  // Count docs without folder
  const totalDocCount = documents.length;

  const filtered = documents.filter((d) => {
    if (activeFolder && d.folder_id !== activeFolder) return false;
    if (selectedCollaborator !== "all" && d.collaborator_id !== selectedCollaborator) return false;
    return true;
  });

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      await createFolder.mutateAsync(name);
      setNewFolderName("");
      setIsCreatingFolder(false);
      toast.success("Pasta criada!");
    } catch {
      toast.error("Erro ao criar pasta");
    }
  };

  const handleUpload = async (files: File[], customName: string, folderId: string | null) => {
    let successCount = 0;
    for (const file of files) {
      try {
        const nameOverride = files.length === 1 && customName.trim() ? customName.trim() : undefined;
        // We upload with the original file but override the name in the DB
        const fileToUpload = nameOverride
          ? new File([file], nameOverride + "." + file.name.split(".").pop(), { type: file.type })
          : file;
        await uploadDocument.mutateAsync({
          file: fileToUpload,
          folderId,
          collaboratorId: selectedCollaborator !== "all" ? selectedCollaborator : null,
        });
        successCount++;
      } catch {
        toast.error(`Erro ao enviar ${file.name}`);
      }
    }
    if (successCount > 0) {
      toast.success(`${successCount} documento(s) enviado(s)!`);
    }
  };

  const handleDeleteDoc = async () => {
    if (!deletingDoc) return;
    try {
      await deleteDocument.mutateAsync(deletingDoc);
      setDeletingDoc(null);
      toast.success("Documento excluído");
    } catch {
      toast.error("Erro ao excluir documento");
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const isLoading = foldersQuery.isLoading || documentsQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {/* Folders */}
      <div className="w-52 shrink-0 space-y-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase">Pastas</span>
          <button
            onClick={() => setIsCreatingFolder(true)}
            className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {isCreatingFolder && (
          <div className="flex items-center gap-1 mb-1">
            <FolderPlus className="h-3.5 w-3.5 text-primary shrink-0" />
            <Input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
                if (e.key === "Escape") setIsCreatingFolder(false);
              }}
              onBlur={() => { if (!newFolderName.trim()) setIsCreatingFolder(false); }}
              placeholder="Nome da pasta..."
              className="h-7 text-xs"
            />
          </div>
        )}

        <button
          onClick={() => setActiveFolder(null)}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${!activeFolder ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent"}`}
        >
          <Folder className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Todos</span>
          <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-[10px] font-medium">
            {totalDocCount}
          </Badge>
        </button>
        {folders.map((f) => {
          const count = folderDocCount(f.id);
          return (
            <button
              key={f.id}
              onClick={() => setActiveFolder(f.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${activeFolder === f.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent"}`}
            >
              <Folder className="h-3.5 w-3.5" />
              <span className="flex-1 text-left truncate">{f.name}</span>
              <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-[10px] font-medium">
                {count}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">{activeFolder ? folders.find(f => f.id === activeFolder)?.name : "Todos os Documentos"}</h3>
          <div className="flex items-center gap-2">
            <Select value={selectedCollaborator} onValueChange={setSelectedCollaborator}>
              <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Colaborador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos</SelectItem>
                {collaborators.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="text-xs gap-1.5" onClick={() => setUploadOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Upload
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum documento encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">Faça upload de documentos para começar</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Pasta</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => {
                const collab = collaborators.find(c => c.id === d.collaborator_id);
                const folder = folders.find(f => f.id === d.folder_id);
                return (
                  <TableRow key={d.id}>
                    <TableCell className="text-sm font-medium">{d.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{collab?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{folder?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatSize(d.file_size)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(d.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <button onClick={() => setDeletingDoc({ id: d.id, filePath: d.file_path })} className="p-1 hover:bg-accent rounded">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Upload Sidebar */}
      <HRUploadSidebar
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        folders={folders}
        defaultFolderId={activeFolder}
        onUpload={handleUpload}
        uploading={uploadDocument.isPending}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingDoc} onOpenChange={(o) => { if (!o) setDeletingDoc(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>O documento será removido permanentemente do sistema.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDoc} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
