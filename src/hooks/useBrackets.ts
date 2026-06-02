import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Bracket } from "@/types/database";

export function useBrackets() {
  return useQuery({
    queryKey: ["brackets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brackets")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Bracket[];
    },
  });
}

export function useUpdateBracket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      range_min: number;
      range_max: number | null;
      owner_pct: number;
      ce_pct: number;
      description: string | null;
    }) => {
      const { id, ...rest } = payload;
      const { data, error } = await supabase
        .from("brackets")
        .update(rest)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Bracket;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brackets"] }),
  });
}

export function getActiveBracket(brackets: Bracket[], grossUSD: number): Bracket | null {
  if (!brackets.length) return null;
  const sorted = [...brackets].sort((a, b) => a.sort_order - b.sort_order);
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (grossUSD >= sorted[i].range_min) return sorted[i];
  }
  return sorted[0];
}
