import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface AccessLog {
  id: string;
  user_id: string | null;
  user_email: string;
  user_role: string | null;
  action: string;
  page: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useAccessLogs(limit = 300) {
  return useQuery({
    queryKey: ["access_logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AccessLog[];
    },
    refetchInterval: 30_000, // auto-refresh every 30 s
    retry: false,            // don't retry if table doesn't exist yet
  });
}
