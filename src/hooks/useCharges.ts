import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { ChargeInsert, ChargeItemInsert } from "@/types/database";

export function useCharges(chargeType: string = "propietario") {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["charges", chargeType, user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("charges")
        .select("*")
        .eq("charge_type", chargeType)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useChargeItems(chargeId: string | null) {
  return useQuery({
    queryKey: ["charge_items", chargeId],
    enabled: !!chargeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("charge_items")
        .select("*")
        .eq("charge_id", chargeId!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      charge,
      items,
    }: {
      charge: ChargeInsert;
      items: Omit<ChargeItemInsert, "charge_id">[];
    }) => {
      const { data, error } = await supabase
        .from("charges")
        .insert(charge as any)
        .select()
        .single();
      if (error) throw error;

      if (items.length > 0) {
        const rows = items.map((it, i) => ({
          ...it,
          charge_id: data.id,
          sort_order: i,
        }));
        const { error: itemErr } = await supabase
          .from("charge_items")
          .insert(rows as any);
        if (itemErr) throw itemErr;
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["charges"] });
      qc.invalidateQueries({ queryKey: ["charge_items"] });
    },
  });
}

export function useUpdateCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      charge,
      items,
    }: {
      id: string;
      charge: Partial<ChargeInsert>;
      items: Omit<ChargeItemInsert, "charge_id">[];
    }) => {
      const { data, error } = await supabase
        .from("charges")
        .update(charge as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      const { error: delErr } = await supabase
        .from("charge_items")
        .delete()
        .eq("charge_id", id);
      if (delErr) throw delErr;

      if (items.length > 0) {
        const rows = items.map((it, i) => ({
          ...it,
          charge_id: id,
          sort_order: i,
        }));
        const { error: itemErr } = await supabase
          .from("charge_items")
          .insert(rows as any);
        if (itemErr) throw itemErr;
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["charges"] });
      qc.invalidateQueries({ queryKey: ["charge_items"] });
    },
  });
}

export function useDeleteCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("charges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["charges"] });
      qc.invalidateQueries({ queryKey: ["charge_items"] });
    },
  });
}

export function useCeSettings() {
  return useQuery({
    queryKey: ["ce_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ce_settings")
        .select("*");
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data) map[row.key] = row.value;
      return map;
    },
  });
}

export function useUpdateCeSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("ce_settings")
        .upsert({ key, value } as any, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ce_settings"] }),
  });
}
