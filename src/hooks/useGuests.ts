import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { GuestInsert } from "@/types/database";

const QK = ["guests"] as const;

export function useGuests() {
  return useQuery({
    queryKey: [...QK],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guests")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateGuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (insert: GuestInsert) => {
      const { data, error } = await supabase
        .from("guests")
        .insert(insert as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...QK] }),
  });
}

export function useUpdateGuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<GuestInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("guests")
        .update(update as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...QK] }),
  });
}

export function useDeleteGuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("guests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...QK] }),
  });
}
