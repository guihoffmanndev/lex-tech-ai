import { useState } from "react";
import { Folder, FolderOpen, ChevronRight, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { FolderNode } from "./FolderPanel";

interface MoveFolderModalProps {
  folders: FolderNode[];
  sourceId: string;
  onMove: (targetId: string | null) => void;
  onClose: () => void;
}

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

export default function MoveFolderModal({ folders, sourceId, onMove, onClose }: MoveFolderModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const tree = buildTree(folders);

  const disabledIds = new Set([sourceId, ...getDescendantIds(tree, sourceId)]);
  const sourceName = folders.find((f) => f.id === sourceId)?.name ?? "";

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderNodes = (nodes: FolderNode[], depth: number): React.ReactNode => {
    return nodes.map((node) => {
      const disabled = disabledIds.has(node.id);
      const isExpanded = expanded.has(node.id);
      const isSelected = selected === node.id;

      return (
        <li key={node.id}>
          <button
            disabled={disabled}
            onClick={() => !disabled && setSelected(isSelected ? null : node.id)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
              disabled
                ? "opacity-40 cursor-not-allowed"
                : isSelected
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-secondary text-foreground"
            }`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            {node.children.length > 0 ? (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  if (!disabled) toggle(node.id);
                }}
                className="p-0.5"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </span>
            ) : (
              <span className="w-4" />
            )}
            {isExpanded && node.children.length > 0 ? (
              <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
          </button>
          {isExpanded && node.children.length > 0 && (
            <ul className="space-y-0.5">{renderNodes(node.children, depth + 1)}</ul>
          )}
        </li>
      );
    });
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mover "{sourceName}"</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {/* Root option */}
          <button
            onClick={() => setSelected(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm mb-1 transition-colors ${
              selected === null ? "bg-primary/10 text-primary font-medium" : "hover:bg-secondary text-foreground"
            }`}
          >
            <Folder className="h-4 w-4 text-muted-foreground" />
            <span>Raiz (nível principal)</span>
          </button>

          <ul className="space-y-0.5 max-h-64 overflow-y-auto">
            {renderNodes(tree, 0)}
          </ul>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              Cancelar
            </Button>
          </DialogClose>
          <Button size="sm" onClick={() => onMove(selected)}>
            Mover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
