import { useState } from "react";
import { Plus, Trash2, MessageSquare, Trash } from "lucide-react";
import { Conversation } from "@/hooks/useChatConversations";
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

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

function groupByDate(conversations: Conversation[]) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const groups: Record<string, Conversation[]> = {
    Hoje: [],
    Ontem: [],
    "Esta semana": [],
    Anteriores: [],
  };

  for (const c of conversations) {
    const date = c.updated_at.slice(0, 10);
    if (date === fmt(today)) groups["Hoje"].push(c);
    else if (date === fmt(yesterday)) groups["Ontem"].push(c);
    else {
      const diff = (today.getTime() - new Date(date).getTime()) / 86400000;
      if (diff <= 7) groups["Esta semana"].push(c);
      else groups["Anteriores"].push(c);
    }
  }

  return groups;
}

export default function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onClearAll,
}: ChatSidebarProps) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);

  const grouped = groupByDate(conversations);

  return (
    <div className="w-72 border-r border-border bg-card flex flex-col shrink-0 hidden md:flex">
      <div className="p-3 border-b border-border space-y-2">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Nova conversa
        </button>
        {conversations.length > 0 && (
          <button
            onClick={() => setClearAllOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash className="h-3 w-3" />
            Limpar todo o histórico
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-2">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-3">
            <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              Nenhuma conversa ainda.
              <br />
              Inicie uma nova conversa!
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([group, chats]) =>
            chats.length > 0 ? (
              <div key={group} className="mb-4">
                <p className="px-2 mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {group}
                </p>
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`group relative w-full text-left px-2 py-2 rounded-md text-sm transition-colors cursor-pointer ${
                      activeId === chat.id
                        ? "bg-secondary text-foreground font-medium"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                    onClick={() => onSelect(chat.id)}
                  >
                    <p className="truncate pr-6">{chat.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(chat.updated_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(chat.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null
          )
        )}
      </div>

      {/* Delete single conversation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja excluir esta conversa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) onDelete(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear all */}
      <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar todo o histórico</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as conversas serão excluídas permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onClearAll();
                setClearAllOpen(false);
              }}
            >
              Excluir tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
