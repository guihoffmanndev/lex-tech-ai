import { useState, useRef, useEffect, useCallback } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Trash2,
  Move,
  FolderInput,
  Pencil,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import MoveFolderModal from "./MoveFolderModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  children: FolderNode[];
  count: number;
}

interface FolderPanelProps {
  folders: FolderNode[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onFoldersChange: (folders: FolderNode[]) => void;
  onCreateFolder?: (name: string, parentId: string | null) => void;
  onFileDropToFolder?: (fileId: string, folderId: string) => void;
}

/* ───── helpers ───── */

function buildTree(flat: FolderNode[]): FolderNode[] {
  const map = new Map<string, FolderNode>();
  flat.forEach((f) => map.set(f.id, { ...f, children: [] }));
  const roots: FolderNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function flattenTree(roots: FolderNode[]): FolderNode[] {
  const result: FolderNode[] = [];
  const walk = (nodes: FolderNode[]) => {
    nodes.forEach((n) => {
      result.push({ ...n, children: [] });
      walk(n.children);
    });
  };
  walk(roots);
  return result;
}

function getDescendantIds(tree: FolderNode[], id: string): string[] {
  const ids: string[] = [];
  const find = (nodes: FolderNode[]) => {
    for (const n of nodes) {
      if (n.id === id) {
        const collect = (children: FolderNode[]) => {
          children.forEach((c) => {
            ids.push(c.id);
            collect(c.children);
          });
        };
        collect(n.children);
        return;
      }
      find(n.children);
    }
  };
  find(tree);
  return ids;
}

function hasContent(tree: FolderNode[], id: string): boolean {
  const find = (nodes: FolderNode[]): FolderNode | null => {
    for (const n of nodes) {
      if (n.id === id) return n;
      const r = find(n.children);
      if (r) return r;
    }
    return null;
  };
  const node = find(tree);
  if (!node) return false;
  return node.children.length > 0 || node.count > 0;
}

/* ───── Draggable Folder Item ───── */

function DraggableFolderItem({
  node,
  depth,
  expanded,
  selected,
  dragOverId,
  onToggle,
  onSelect,
  onDelete,
  onMoveRequest,
  onRename,
  siblingNames,
  onFileDropToFolder,
  children,
}: {
  node: FolderNode;
  depth: number;
  expanded: boolean;
  selected: boolean;
  dragOverId: string | null;
  onToggle: () => void;
  onSelect: () => void;
  onDelete: (id: string) => void;
  onMoveRequest: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  siblingNames: string[];
  onFileDropToFolder?: (fileId: string, folderId: string) => void;
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: `drag-${node.id}` });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `drop-${node.id}` });
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.name);
  const [editError, setEditError] = useState("");
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDropTarget = isOver || dragOverId === node.id || isFileDragOver;

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const submitRename = () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === node.name) {
      setIsEditing(false);
      setEditValue(node.name);
      setEditError("");
      return;
    }
    if (siblingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase() && n.toLowerCase() !== node.name.toLowerCase())) {
      setEditError("Já existe uma pasta com esse nome");
      return;
    }
    onRename(node.id, trimmed);
    setIsEditing(false);
    setEditError("");
  };

  const startEditing = () => {
    setEditValue(node.name);
    setEditError("");
    setIsEditing(true);
  };

  return (
    <li ref={setDropRef}>
      <div
        className={`group flex items-center gap-1 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
          selected ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary"
        } ${isDropTarget ? "ring-2 ring-primary bg-primary/5" : ""} ${isDragging ? "opacity-40" : ""}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={onSelect}
        onDoubleClick={(e) => {
          e.stopPropagation();
          startEditing();
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("application/vault-file-id")) {
            e.preventDefault();
            setIsFileDragOver(true);
          }
        }}
        onDragLeave={() => setIsFileDragOver(false)}
        onDrop={(e) => {
          setIsFileDragOver(false);
          const fileId = e.dataTransfer.getData("application/vault-file-id");
          if (fileId && onFileDropToFolder) {
            e.preventDefault();
            onFileDropToFolder(fileId, node.id);
          }
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="p-0.5 rounded hover:bg-accent shrink-0"
        >
          {node.children.length > 0 ? (
            expanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )
          ) : (
            <span className="w-3" />
          )}
        </button>

        <span
          ref={setDragRef}
          {...attributes}
          {...listeners}
          className="flex items-center gap-2 flex-1 min-w-0 cursor-grab active:cursor-grabbing"
        >
          {expanded && node.children.length > 0 ? (
            <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          {isEditing ? (
            <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => { setEditValue(e.target.value); setEditError(""); }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") submitRename();
                  if (e.key === "Escape") { setIsEditing(false); setEditValue(node.name); setEditError(""); }
                }}
                onBlur={submitRename}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full bg-secondary rounded px-1.5 py-0.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {editError && <p className="text-[10px] text-destructive mt-0.5">{editError}</p>}
            </div>
          ) : (
            <span className="flex-1 truncate">{node.name}</span>
          )}
        </span>

        <span className="text-xs text-muted-foreground mr-1">{node.count}</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-0.5 rounded hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            >
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => startEditing()}>
              <Pencil className="h-3.5 w-3.5 mr-2" />
              Renomear
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMoveRequest(node.id)}>
              <Move className="h-3.5 w-3.5 mr-2" />
              Mover para...
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(node.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {expanded && children}
    </li>
  );
}

/* ───── Inline New Folder Input ───── */

function InlineNewFolder({
  depth,
  onConfirm,
  onCancel,
  siblingNames,
}: {
  depth: number;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  siblingNames: string[];
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      onCancel();
      return;
    }
    if (siblingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      setError("Já existe uma pasta com esse nome");
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <li
      className="flex items-center gap-2 px-2 py-1"
      style={{ paddingLeft: `${depth * 16 + 8 + 20}px` }}
    >
      <FolderInput className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <input
          ref={ref}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onCancel();
          }}
          onBlur={submit}
          className="w-full bg-secondary rounded px-2 py-1 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Nome da pasta"
        />
        {error && <p className="text-[10px] text-destructive mt-0.5">{error}</p>}
      </div>
    </li>
  );
}

/* ───── Main Component ───── */

export default function FolderPanel({ folders, selectedFolderId, onSelectFolder, onFoldersChange, onCreateFolder, onFileDropToFolder }: FolderPanelProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const tree = buildTree(folders);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ── Create ── */
  const handleCreate = (name: string) => {
    if (onCreateFolder) {
      onCreateFolder(name, selectedFolderId);
    } else {
      const newFolder: FolderNode = {
        id: `f-${Date.now()}`,
        name,
        parentId: selectedFolderId,
        children: [],
        count: 0,
      };
      onFoldersChange([...folders, newFolder]);
    }
    if (selectedFolderId) {
      setExpanded((prev) => new Set(prev).add(selectedFolderId));
    }
    setCreating(false);
    toast.success(`Pasta "${name}" criada`);
  };

  /* ── Delete ── */
  const requestDelete = (id: string) => {
    if (hasContent(tree, id)) {
      setDeleteTargetId(id);
      setShowDeleteConfirm(true);
    } else {
      executeDelete(id);
    }
  };

  const executeDelete = (id: string) => {
    const descendants = getDescendantIds(tree, id);
    const idsToRemove = new Set([id, ...descendants]);
    const deletedFolders = folders.filter((f) => idsToRemove.has(f.id));
    const remaining = folders.filter((f) => !idsToRemove.has(f.id));
    onFoldersChange(remaining);
    if (selectedFolderId && idsToRemove.has(selectedFolderId)) {
      onSelectFolder(null);
    }
    toast.success("Pasta excluída", {
      action: {
        label: "Desfazer",
        onClick: () => {
          onFoldersChange([...remaining, ...deletedFolders]);
          toast.success("Exclusão desfeita");
        },
      },
      duration: 5000,
    });
  };

  /* ── Move (DnD) ── */
  const handleDragStart = (e: DragStartEvent) => {
    const id = (e.active.id as string).replace("drag-", "");
    setDragActiveId(id);
  };

  const handleDragOver = (e: DragOverEvent) => {
    const overId = e.over?.id as string | null;
    setDragOverId(overId ? overId.replace("drop-", "").replace("drag-", "") : null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setDragActiveId(null);
    setDragOverId(null);

    if (!over || active.id === over.id) return;

    const sourceId = (active.id as string).replace("drag-", "");
    const targetId = (over.id as string).replace("drop-", "").replace("drag-", "");

    // Prevent moving into self or descendant
    const descendants = getDescendantIds(tree, sourceId);
    if (descendants.includes(targetId)) {
      toast.error("Não é possível mover uma pasta para dentro de si mesma");
      return;
    }

    const updated = folders.map((f) =>
      f.id === sourceId ? { ...f, parentId: targetId } : f
    );
    onFoldersChange(updated);
    setExpanded((prev) => new Set(prev).add(targetId));
    const movedName = folders.find((f) => f.id === sourceId)?.name;
    const targetName = folders.find((f) => f.id === targetId)?.name;
    toast.success(`"${movedName}" movida para "${targetName}"`);
  };

  /* ── Move via modal ── */
  const handleMoveViaModal = (sourceId: string, targetId: string | null) => {
    const updated = folders.map((f) =>
      f.id === sourceId ? { ...f, parentId: targetId } : f
    );
    onFoldersChange(updated);
    if (targetId) {
      setExpanded((prev) => new Set(prev).add(targetId));
    }
    const movedName = folders.find((f) => f.id === sourceId)?.name;
    const targetName = targetId ? folders.find((f) => f.id === targetId)?.name : "raiz";
    toast.success(`"${movedName}" movida para "${targetName}"`);
    setMoveTargetId(null);
  };

  /* ── Rename ── */
  const handleRename = (id: string, newName: string) => {
    const updated = folders.map((f) => (f.id === id ? { ...f, name: newName } : f));
    onFoldersChange(updated);
    toast.success(`Pasta renomeada para "${newName}"`);
  };

  /* ── Render tree recursively ── */
  const renderNodes = (nodes: FolderNode[], depth: number, parentId: string | null): React.ReactNode => {
    return nodes.map((node) => {
      const isExpanded = expanded.has(node.id);
      const siblings = nodes.filter((n) => n.id !== node.id).map((n) => n.name);
      return (
        <DraggableFolderItem
          key={node.id}
          node={node}
          depth={depth}
          expanded={isExpanded}
          selected={selectedFolderId === node.id}
          dragOverId={dragOverId}
          onToggle={() => toggle(node.id)}
          onSelect={() => onSelectFolder(selectedFolderId === node.id ? null : node.id)}
          onDelete={requestDelete}
          onMoveRequest={(id) => setMoveTargetId(id)}
          onRename={handleRename}
          siblingNames={siblings}
          onFileDropToFolder={onFileDropToFolder}
        >
          {isExpanded && node.children.length > 0 && (
            <ul className="space-y-0.5">{renderNodes(node.children, depth + 1, node.id)}</ul>
          )}
        </DraggableFolderItem>
      );
    });
  };

  const creatingDepth = selectedFolderId
    ? (function getDepth(id: string, nodes: FolderNode[], d: number): number {
        for (const n of nodes) {
          if (n.id === id) return d + 1;
          const r = getDepth(id, n.children, d + 1);
          if (r >= 0) return r;
        }
        return -1;
      })(selectedFolderId, tree, 0)
    : 0;

  const siblingNames = selectedFolderId
    ? folders.filter((f) => f.parentId === selectedFolderId).map((f) => f.name)
    : folders.filter((f) => !f.parentId).map((f) => f.name);

  // Root drop zone
  const { setNodeRef: setRootDropRef, isOver: isRootOver } = useDroppable({ id: "__root__" });

  const handleRootDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      setDragActiveId(null);
      setDragOverId(null);

      if (!over) return;
      if (over.id === "__root__") {
        const sourceId = (active.id as string).replace("drag-", "");
        const source = folders.find((f) => f.id === sourceId);
        if (source && source.parentId !== null) {
          const updated = folders.map((f) =>
            f.id === sourceId ? { ...f, parentId: null } : f
          );
          onFoldersChange(updated);
          toast.success(`"${source.name}" movida para raiz`);
        }
        return;
      }
      handleDragEnd(e);
    },
    [folders, onFoldersChange]
  );

  const draggedFolder = dragActiveId ? folders.find((f) => f.id === dragActiveId) : null;

  return (
    <>
      <div className="w-full border-r border-border bg-card flex flex-col shrink-0">
        <div className="flex items-center justify-between p-3 pb-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-1">
            Pastas
          </p>
          <button
            onClick={() => setCreating(true)}
            className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Nova Pasta"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleRootDragEnd}
        >
          <div ref={setRootDropRef} className={`flex-1 overflow-y-auto px-2 pb-2 ${isRootOver ? "bg-primary/5" : ""}`}>
            <ul className="space-y-0.5">
              {renderNodes(tree, 0, null)}
              {creating && (
                <InlineNewFolder
                  depth={creatingDepth}
                  onConfirm={handleCreate}
                  onCancel={() => setCreating(false)}
                  siblingNames={siblingNames}
                />
              )}
            </ul>
          </div>

          <DragOverlay>
            {draggedFolder && (
              <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-md shadow-lg text-sm">
                <Folder className="h-4 w-4 text-muted-foreground" />
                <span>{draggedFolder.name}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta</AlertDialogTitle>
            <AlertDialogDescription>
              Esta pasta contém itens. Excluir também removerá todo o conteúdo dentro dela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTargetId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTargetId) executeDelete(deleteTargetId);
                setDeleteTargetId(null);
                setShowDeleteConfirm(false);
              }}
            >
              Excluir tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move folder modal */}
      {moveTargetId && (
        <MoveFolderModal
          folders={folders}
          sourceId={moveTargetId}
          onMove={(targetId) => handleMoveViaModal(moveTargetId, targetId)}
          onClose={() => setMoveTargetId(null)}
        />
      )}
    </>
  );
}
