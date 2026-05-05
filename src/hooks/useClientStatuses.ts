import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ClientStatus {
  id: string;
  name: string;
  color: string;
  is_default: boolean;
}

const DEFAULT_STATUSES: Omit<ClientStatus, "id">[] = [
  { name: "Ativo", color: "#22c55e", is_default: true },
  { name: "Inativo", color: "#ef4444", is_default: true },
  { name: "Pendente", color: "#f59e0b", is_default: true },
];

export function useClientStatuses() {
  const [statuses, setStatuses] = useState<ClientStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatuses = useCallback(async () => {
    const { data, error } = await supabase
      .from("client_statuses")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar status");
      return;
    }

    const rows = data || [];

    // Seed defaults if none exist
    if (rows.length === 0) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const toInsert = DEFAULT_STATUSES.map((s) => ({
        ...s,
        user_id: userData.user!.id,
      }));

      const { data: inserted, error: insertErr } = await supabase
        .from("client_statuses")
        .insert(toInsert)
        .select("*");

      if (insertErr) {
        toast.error("Erro ao criar status padrão");
        return;
      }
      setStatuses(inserted || []);
    } else {
      setStatuses(rows);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const renameStatus = async (id: string, newName: string) => {
    const { error } = await supabase
      .from("client_statuses")
      .update({ name: newName })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao renomear status");
      return false;
    }

    // Update all clients that had the old name
    const old = statuses.find((s) => s.id === id);
    if (old) {
      await supabase
        .from("lex_clients")
        .update({ status: newName })
        .eq("status", old.name);
    }

    setStatuses((prev) => prev.map((s) => (s.id === id ? { ...s, name: newName } : s)));
    toast.success("Status renomeado");
    return true;
  };

  const addStatus = async (name: string, color: string) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const { data, error } = await supabase
      .from("client_statuses")
      .insert({ name, color, user_id: userData.user.id, is_default: false })
      .select("*")
      .single();

    if (error) {
      toast.error("Erro ao criar status");
      return null;
    }
    const newStatus = data as ClientStatus;
    setStatuses((prev) => [...prev, newStatus]);
    toast.success("Status criado");
    return newStatus;
  };

  const deleteStatus = async (id: string) => {
    const status = statuses.find((s) => s.id === id);
    if (statuses.length <= 1) {
      toast.error("É necessário ter pelo menos um status");
      return false;
    }

    // Move clients with this status to the first remaining status
    const fallback = statuses.find((s) => s.id !== id);
    if (status && fallback) {
      await supabase
        .from("lex_clients")
        .update({ status: fallback.name })
        .eq("status", status.name);
    }

    const { error } = await supabase
      .from("client_statuses")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir status");
      return false;
    }

    setStatuses((prev) => prev.filter((s) => s.id !== id));
    toast.success("Status excluído");
    return true;
  };

  const changeColor = async (id: string, newColor: string) => {
    const { error } = await supabase
      .from("client_statuses")
      .update({ color: newColor })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao alterar cor");
      return false;
    }
    setStatuses((prev) => prev.map((s) => (s.id === id ? { ...s, color: newColor } : s)));
    return true;
  };

  return { statuses, loading, renameStatus, changeColor, addStatus, deleteStatus, refetch: fetchStatuses };
}
