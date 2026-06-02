import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  PlatformConfig,
  PlatformConfigInsert,
  PlatformConfigUpdate,
} from "@/types/database";
import { toast } from "@/hooks/use-toast";

const QUERY_KEY = ["platform_configs"] as const;

export function usePlatformConfigs() {
  return useQuery<PlatformConfig[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_configs")
        .select("*")
        .order("platform");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePlatformConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PlatformConfigInsert) => {
      const { data, error } = await supabase
        .from("platform_configs")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "Plataforma creada", variant: "success" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

export function useUpdatePlatformConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: PlatformConfigUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("platform_configs")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(payload as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "Cambios guardados", variant: "success" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

export function useDeletePlatformConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("platform_configs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "Plataforma eliminada", variant: "default" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}
