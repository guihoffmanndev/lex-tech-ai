import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export function useChatConversations() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const conversations = useQuery({
    queryKey: ["chat_conversations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Conversation[];
    },
  });

  const createConversation = useMutation({
    mutationFn: async (title: string) => {
      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({ user_id: user!.id, title })
        .select()
        .single();
      if (error) throw error;
      return data as Conversation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat_conversations"] }),
  });

  const deleteConversation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("chat_conversations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat_conversations"] }),
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("chat_conversations")
        .delete()
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat_conversations"] }),
  });

  const loadMessages = async (conversationId: string): Promise<ChatMessage[]> => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as ChatMessage[];
  };

  const saveMessage = async (conversationId: string, role: "user" | "assistant", content: string) => {
    const { error } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: conversationId,
        user_id: user!.id,
        role,
        content,
      });
    if (error) throw error;
  };

  const updateTitle = async (id: string, title: string) => {
    await supabase
      .from("chat_conversations")
      .update({ title })
      .eq("id", id);
    qc.invalidateQueries({ queryKey: ["chat_conversations"] });
  };

  return {
    conversations: conversations.data ?? [],
    isLoading: conversations.isLoading,
    createConversation,
    deleteConversation,
    clearAll,
    loadMessages,
    saveMessage,
    updateTitle,
  };
}
