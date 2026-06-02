import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { PropertyInsert } from "@/types/database";

export function useProperties() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["properties", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (insert: PropertyInsert) => {
      const { data, error } = await supabase
        .from("properties")
        .insert(insert as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<PropertyInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("properties")
        .update(update as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}
