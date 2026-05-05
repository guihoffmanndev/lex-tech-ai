import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  Search,
  Upload,
  Grid3X3,
  List,
  Folder,
  MoreHorizontal,
  FileText,
  Download,
  Trash2,
  Loader2,
  FolderOpen,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import FolderPanel, { type FolderNode } from "@/components/vault/FolderPanel";
import UploadSidebar from "@/components/vault/UploadSidebar";
import DocumentPreviewSidebar from "@/components/vault/DocumentPreviewSidebar";
import HighlightText from "@/components/vault/HighlightText";
import { useVaultFiles } from "@/hooks/useVaultFiles";
import { useVaultFolders } from "@/hooks/useVaultFolders";
import { useVaultActions } from "@/hooks/useVaultActions";
import { useRecentes } from "@/hooks/useRecentes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusColors: Record<string, string> = {
  "Em análise": "bg-warning/10 text-warning",
  Revisado: "bg-success/10 text-success",
  Arquivado: "bg-muted text-muted-foreground",
};

const SIDEBAR_WIDTH_KEY = "lex-vault-sidebar-width";
const MIN_SIDEBAR = 180;
const MAX_SIDEBAR = 480;
const DEFAULT_SIDEBAR = 224; // w-56 = 14rem = 224px

export default function Vault() {
  const [view, setView] = useState<"list" | "grid">("list");
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [deleteFilePath, setDeleteFilePath] = useState<string | null>(null);
  const { registrarAcesso } = useRecentes();

  // Resizable sidebar
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, Number(saved))) : DEFAULT_SIDEBAR;
  });
  const isResizing = useRef(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startW = sidebarWidth;

    const onMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const newW = Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, startW + ev.clientX - startX));
      setSidebarWidth(newW);
    };
    const onUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [sidebarWidth]);

  const handleSelectDoc = (id: string) => {
    setSelectedDoc(id);
    const file = files.find((f) => f.id === id);
    if (file) {
      registrarAcesso.mutate({
        tipo: "documento",
        item_id: file.id,
        item_nome: file.name,
        item_path: "/vault",
      });
    }
  };

  // Real data from DB
  const { data: files = [], isLoading } = useVaultFiles(selectedFolderId, searchQuery);
  const { foldersQuery, createFolder, updateFolder, deleteFolder } = useVaultFolders();
  const { deleteFile, updateStatus, downloadFile, moveFileToFolder } = useVaultActions();

  // Drag-and-drop file upload
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("application/vault-file-id")) return;
    dragCounter.current++;
    if (dragCounter.current === 1) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.types.includes("application/vault-file-id")) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setDroppedFiles(files);
      setUploadOpen(true);
    }
  }, []);

  // Build FolderNode[] for FolderPanel from DB data
  const folderNodes: FolderNode[] = useMemo(() => {
    const dbFolders = foldersQuery.data ?? [];
    return dbFolders.map((f) => ({
      id: f.id,
      name: f.name,
      parentId: f.parent_id,
      children: [],
      count: f.item_count ?? 0,
    }));
  }, [foldersQuery.data]);

  // Omni-search: also match folders
  const matchedFolderIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase();
    return new Set(folderNodes.filter((f) => f.name.toLowerCase().includes(q)).map((f) => f.id));
  }, [searchQuery, folderNodes]);

  const filtered = files;
  const doc = filtered.find((d) => d.id === selectedDoc) ?? null;

  // Folder panel callbacks
  const handleFoldersChange = (newFolders: FolderNode[]) => {
    const dbFolders = foldersQuery.data ?? [];
    const dbMap = new Map(dbFolders.map((f) => [f.id, f]));

    for (const nf of newFolders) {
      const existing = dbMap.get(nf.id);
      if (!existing) {
        createFolder.mutate({ name: nf.name, parentId: nf.parentId });
      } else if (existing.name !== nf.name || existing.parent_id !== nf.parentId) {
        updateFolder.mutate({ id: nf.id, name: nf.name, parentId: nf.parentId });
      }
    }

    const newIds = new Set(newFolders.map((f) => f.id));
    for (const dbf of dbFolders) {
      if (!newIds.has(dbf.id)) {
        deleteFolder.mutate(dbf.id);
      }
    }
  };

  const confirmDeleteFile = () => {
    if (deleteFileId && deleteFilePath) {
      deleteFile.mutate({ fileId: deleteFileId, filePath: deleteFilePath });
      if (selectedDoc === deleteFileId) setSelectedDoc(null);
    }
    setDeleteFileId(null);
    setDeleteFilePath(null);
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("pt-BR");

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const trimmedSearch = searchQuery.trim();

  // Build breadcrumb path from selected folder to root
  const breadcrumbPath = useMemo(() => {
    if (!selectedFolderId) return [];
    const folderMap = new Map(folderNodes.map((f) => [f.id, f]));
    const path: { label: string; folderId: string }[] = [];
    let current = folderMap.get(selectedFolderId);
    while (current) {
      path.unshift({ label: current.name, folderId: current.id });
      current = current.parentId ? folderMap.get(current.parentId) : undefined;
    }
    return path;
  }, [selectedFolderId, folderNodes]);

  return (
    <div className="animate-fade-in flex h-[calc(100vh-3.5rem)] -m-6 lg:-m-8">
      {/* Folder Panel — resizable */}
      <div
        className="relative shrink-0 hidden lg:flex"
        style={{ width: sidebarWidth }}
      >
        <FolderPanel
          folders={folderNodes}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onFoldersChange={handleFoldersChange}
          onCreateFolder={(name, parentId) => {
            createFolder.mutate({ name, parentId });
          }}
          onFileDropToFolder={(fileId, folderId) => {
            moveFileToFolder.mutate({ fileId, folderId });
          }}
        />
        {/* Resize handle */}
        <div
          onMouseDown={startResize}
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 group hover:bg-primary/10 active:bg-primary/20 transition-colors"
        >
          <div className="absolute right-0 top-0 bottom-0 w-px bg-border group-hover:bg-primary/30" />
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar — Omni-Search + view toggle + upload */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar em pastas, arquivos e conteúdo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-secondary border-0 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setView("list")}
              className={`p-1.5 rounded-md ${view === "list" ? "bg-secondary" : "hover:bg-secondary"}`}
            >
              <List className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => setView("grid")}
              className={`p-1.5 rounded-md ${view === "grid" ? "bg-secondary" : "hover:bg-secondary"}`}
            >
              <Grid3X3 className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>
        </div>

        {/* Breadcrumb navigation */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border text-sm min-h-[36px] overflow-x-auto">
          <button
            onClick={() => setSelectedFolderId(null)}
            className={`shrink-0 transition-colors ${
              breadcrumbPath.length === 0
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:underline"
            }`}
          >
            Vault
          </button>
          {breadcrumbPath.map((item, idx) => {
            const isLast = idx === breadcrumbPath.length - 1;
            return (
              <span key={item.folderId} className="flex items-center gap-1 min-w-0">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {isLast ? (
                  <span className="text-foreground font-medium truncate">{item.label}</span>
                ) : (
                  <button
                    onClick={() => setSelectedFolderId(item.folderId)}
                    className="text-muted-foreground hover:text-foreground hover:underline truncate transition-colors"
                  >
                    {item.label}
                  </button>
                )}
              </span>
            );
          })}
        </div>
        {trimmedSearch && matchedFolderIds.size > 0 && (
          <div className="px-4 py-2 border-b border-border bg-primary/5">
            <p className="text-xs text-muted-foreground mb-1">Pastas encontradas:</p>
            <div className="flex flex-wrap gap-1.5">
              {folderNodes
                .filter((f) => matchedFolderIds.has(f.id))
                .map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setSelectedFolderId(f.id);
                      setSearchQuery("");
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    <Folder className="h-3 w-3" />
                    <HighlightText text={f.name} query={trimmedSearch} />
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto p-4 relative"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg m-2 transition-all animate-fade-in">
              <div className="flex flex-col items-center gap-2 text-primary">
                <Upload className="h-10 w-10" />
                <p className="text-sm font-medium">Solte os arquivos aqui para fazer upload</p>
                <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, PNG, JPG</p>
              </div>
            </div>
          )}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p className="text-sm">Carregando documentos...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">
                {trimmedSearch ? "Nenhum resultado encontrado" : "Nenhum documento encontrado"}
              </p>
              <p className="text-xs mt-1">
                {trimmedSearch
                  ? `Nenhum arquivo corresponde a "${trimmedSearch}"`
                  : 'Clique em "Upload" para adicionar seu primeiro documento'}
              </p>
            </div>
          ) : view === "list" ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                  <th className="pb-2 font-medium">Nome</th>
                  <th className="pb-2 font-medium">Tipo</th>
                  <th className="pb-2 font-medium hidden md:table-cell">Cliente</th>
                  <th className="pb-2 font-medium hidden md:table-cell">Pasta</th>
                  <th className="pb-2 font-medium hidden md:table-cell">Data</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  return (
                    <tr
                      key={d.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/vault-file-id", d.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => handleSelectDoc(d.id)}
                      className="border-b border-border hover:bg-secondary cursor-pointer transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <HighlightText text={d.name} query={trimmedSearch} className="truncate block" />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{d.type}</td>
                      <td className="py-3 pr-4 text-muted-foreground hidden md:table-cell">{d.client || "—"}</td>
                      <td className="py-3 pr-4 hidden md:table-cell">
                        {(d as any).vault_folders ? (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Folder className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate max-w-[120px]">{(d as any).vault_folders.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground hidden md:table-cell">{formatDate(d.created_at)}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[d.status] || ""}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded hover:bg-accent">
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => downloadFile(d.file_path, d.name)}>
                              <Download className="h-3.5 w-3.5 mr-2" /> Download
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateStatus.mutate({ fileId: d.id, status: d.status === "Revisado" ? "Em análise" : "Revisado" })}
                            >
                              Marcar como {d.status === "Revisado" ? "Em análise" : "Revisado"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                setDeleteFileId(d.id);
                                setDeleteFilePath(d.file_path);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((d) => {
                return (
                  <div
                    key={d.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/vault-file-id", d.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => handleSelectDoc(d.id)}
                    className="p-4 rounded-lg border border-border hover:bg-secondary cursor-pointer transition-colors"
                  >
                    <FileText className="h-8 w-8 text-muted-foreground mb-3" />
                    <HighlightText text={d.name} query={trimmedSearch} className="text-sm font-medium truncate block mb-1" />
                    <p className="text-xs text-muted-foreground">{formatDate(d.created_at)}</p>
                    <p className="text-xs text-muted-foreground">{d.client || "—"}</p>
                    <span className={`mt-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[d.status] || ""}`}>
                      {d.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Document Preview Sidebar */}
      <DocumentPreviewSidebar
        doc={doc}
        open={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
      />

      {/* Upload Sidebar */}
      <UploadSidebar
        open={uploadOpen}
        onClose={() => { setUploadOpen(false); setDroppedFiles([]); }}
        defaultFolderId={selectedFolderId}
        initialFiles={droppedFiles}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteFileId} onOpenChange={(open) => { if (!open) { setDeleteFileId(null); setDeleteFilePath(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteFile}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
