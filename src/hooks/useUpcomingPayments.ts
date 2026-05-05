import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUpcomingPayments(daysAhead: number = 30) {
  return useQuery({
    queryKey: ["upcoming-payments", daysAhead],
    queryFn: async () => {
      const today = new Date();
      const future = new Date();
      future.setDate(today.getDate() + daysAhead);

      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .in("status", ["pendente", "vencido"])
        .not("due_date", "is", null)
        .lte("due_date", future.toISOString().split("T")[0])
        .order("due_date", { ascending: true });

      if (error) throw error;

      const todayStr = today.toISOString().split("T")[0];
      return (data ?? []).map(t => ({
        ...t,
        is_overdue: t.due_date! < todayStr,
        days_until_due: Math.ceil(
          (new Date(t.due_date!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }));
    },
    refetchInterval: 1000 * 60 * 5,
  });
}
