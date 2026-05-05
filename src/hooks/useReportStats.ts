import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PeriodFilter = "7d" | "30d" | "month" | "all";

function getDateFrom(period: PeriodFilter): Date | null {
  const now = new Date();
  switch (period) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "all":
      return null;
  }
}

export function useReportStats(period: PeriodFilter = "all") {
  return useQuery({
    queryKey: ["report-stats", period],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const dateFrom = getDateFrom(period);

      let filesQuery = supabase
        .from("vault_files")
        .select("type, status, client, created_at")
        .eq("user_id", user.id);

      let countQuery = supabase
        .from("vault_files")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (dateFrom) {
        const iso = dateFrom.toISOString();
        filesQuery = filesQuery.gte("created_at", iso);
        countQuery = countQuery.gte("created_at", iso);
      }

      const [
        { data: allFiles },
        { count: totalFiles },
        { count: totalFolders },
      ] = await Promise.all([
        filesQuery,
        countQuery,
        supabase
          .from("vault_folders")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      const files = allFiles ?? [];
      const total = totalFiles ?? 0;

      const typeCounts: Record<string, number> = {};
      files.forEach(f => { typeCounts[f.type] = (typeCounts[f.type] ?? 0) + 1; });

      const statusCounts: Record<string, number> = {};
      files.forEach(f => { statusCounts[f.status] = (statusCounts[f.status] ?? 0) + 1; });

      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const monthCounts: Record<string, number> = {};
      files.forEach(f => {
        const d = new Date(f.created_at);
        if (d >= sixMonthsAgo) {
          const key = `${monthNames[d.getMonth()]}/${d.getFullYear().toString().slice(2)}`;
          monthCounts[key] = (monthCounts[key] ?? 0) + 1;
        }
      });

      const clientCounts: Record<string, number> = {};
      files.forEach(f => {
        if (f.client) clientCounts[f.client] = (clientCounts[f.client] ?? 0) + 1;
      });
      const topClients = Object.entries(clientCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, count]) => ({
          name,
          count,
          percentage: total ? ((count / total) * 100).toFixed(1) : "0",
        }));

      return {
        totalFiles: total,
        totalFolders: totalFolders ?? 0,
        byType: Object.entries(typeCounts).map(([name, value]) => ({ name, value })),
        byStatus: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
        byMonth: Object.entries(monthCounts).map(([month, total]) => ({ month, total })),
        topClients,
      };
    },
  });
}
