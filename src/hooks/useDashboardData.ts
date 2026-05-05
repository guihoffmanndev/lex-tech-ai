import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard-data"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const uid = user.id;

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        { count: totalDocs },
        { data: recentDocs },
        { count: totalWorkflows },
        { data: activeWorkflows },
        { data: recentRuns },
        { data: monthFinancials },
        { data: pendingFinancials },
        { data: overdueFinancials },
        { count: totalCollabs },
        { data: recentCollabs },
        { data: recentFinActivity },
      ] = await Promise.all([
        // Vault - total docs
        supabase.from("vault_files").select("*", { count: "exact", head: true }).eq("user_id", uid),
        // Vault - 3 most recent (also used for activity feed)
        supabase.from("vault_files").select("id, name, type, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(3),
        // Workflows - total
        supabase.from("workflows").select("*", { count: "exact", head: true }).eq("user_id", uid),
        // Workflows - active
        supabase.from("workflows").select("id, name, is_active").eq("user_id", uid).eq("is_active", true),
        // Workflow runs - 3 most recent (also used for activity feed)
        supabase.from("workflow_runs").select("id, status, executed_at, workflow_id").eq("user_id", uid).order("executed_at", { ascending: false }).limit(3),
        // Financial - current month (paid receitas)
        supabase.from("financial_transactions").select("id, type, amount, status, description, created_at").eq("user_id", uid).eq("type", "receita").eq("status", "pago").gte("created_at", monthStart),
        // Financial - all pending receitas
        supabase.from("financial_transactions").select("id, amount").eq("user_id", uid).eq("type", "receita").eq("status", "pendente"),
        // Financial - all overdue receitas
        supabase.from("financial_transactions").select("id, amount").eq("user_id", uid).eq("type", "receita").eq("status", "atrasado"),
        // Collaborators - total active
        supabase.from("collaborators").select("*", { count: "exact", head: true }).eq("user_id", uid).eq("status", "Ativo"),
        // Collaborators - 3 most recent
        supabase.from("collaborators").select("id, name, role, avatar_url").eq("user_id", uid).order("created_at", { ascending: false }).limit(3),
        // Activity: recent financial
        supabase.from("financial_transactions").select("id, description, amount, status, type, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(3),
      ]);

      // Financial calculations (already filtered server-side)
      const recebido = (monthFinancials ?? [])
        .reduce((s, f) => s + Number(f.amount), 0);
      const pendente = (pendingFinancials ?? [])
        .reduce((s, f) => s + Number(f.amount), 0);
      const atrasado = (overdueFinancials ?? [])
        .reduce((s, f) => s + Number(f.amount), 0);

      // Merge activity feed (reuse recentDocs and recentRuns — no duplicate queries)
      type ActivityItem = { id: string; type: "doc" | "financial" | "workflow"; description: string; date: string };
      const activity: ActivityItem[] = [];

      (recentDocs ?? []).forEach(d => activity.push({
        id: d.id, type: "doc", description: `Documento enviado: ${d.name}`, date: d.created_at,
      }));
      (recentFinActivity ?? []).forEach(f => activity.push({
        id: f.id, type: "financial", description: `${f.type === "receita" ? "Receita" : "Despesa"}: ${f.description}`, date: f.created_at,
      }));
      (recentRuns ?? []).forEach(w => activity.push({
        id: w.id, type: "workflow", description: `Workflow executado (${w.status})`, date: w.executed_at,
      }));

      activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        vault: { total: totalDocs ?? 0, recent: recentDocs ?? [] },
        workflows: {
          total: totalWorkflows ?? 0,
          active: activeWorkflows?.length ?? 0,
          recentRuns: recentRuns ?? [],
        },
        financial: { recebido, pendente, atrasado },
        collaborators: { total: totalCollabs ?? 0, recent: recentCollabs ?? [] },
        activity: activity.slice(0, 8),
      };
    },
  });
}
