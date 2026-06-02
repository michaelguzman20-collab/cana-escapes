import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { OwnerPaymentInsert } from "@/types/database";

export function useOwnerPayments() {
  return useQuery({
    queryKey: ["owner_payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owner_payments")
        .select("*")
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateOwnerPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (insert: OwnerPaymentInsert) => {
      const { data, error } = await supabase
        .from("owner_payments")
        .insert(insert as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["owner_payments"] }),
  });
}

export function useUpdateOwnerPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<OwnerPaymentInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("owner_payments")
        .update(update as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["owner_payments"] }),
  });
}

export function useDeleteOwnerPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("owner_payments")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["owner_payments"] }),
  });
}
