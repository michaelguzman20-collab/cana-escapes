import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ReservationInsert } from "@/types/database";

function qk(propertyId: string, month: number, year: number) {
  return ["reservations", propertyId, month, year];
}

export function useReservations(propertyId: string, month: number, year: number) {
  return useQuery({
    queryKey: qk(propertyId, month, year),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("property_id", propertyId)
        .eq("period_month", month)
        .eq("period_year", year)
        .is("deleted_at", null)
        .order("checkin");
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });
}

export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (insert: ReservationInsert) => {
      const { data, error } = await supabase
        .from("reservations")
        .insert(insert as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({
        queryKey: qk(vars.property_id, vars.period_month, vars.period_year),
      }),
  });
}

export function useUpdateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...update
    }: Partial<ReservationInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("reservations")
        .update(update as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) =>
      qc.invalidateQueries({
        queryKey: qk(data.property_id, data.period_month, data.period_year),
      }),
  });
}

export function useAllReservationsGlobal() {
  return useQuery({
    queryKey: ["reservations", "global"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .is("deleted_at", null)
        .order("checkin", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAllReservations(propertyId: string) {
  return useQuery({
    queryKey: ["reservations", "all", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("property_id", propertyId)
        .is("deleted_at", null)
        .order("checkin", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });
}

export function useDeleteReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      property_id,
      period_month,
      period_year,
    }: {
      id: string;
      property_id: string;
      period_month: number;
      period_year: number;
    }) => {
      const { error } = await supabase
        .from("reservations")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
      return { property_id, period_month, period_year };
    },
    onSuccess: ({ property_id, period_month, period_year }) => {
      qc.invalidateQueries({ queryKey: qk(property_id, period_month, period_year) });
      qc.invalidateQueries({ queryKey: ["reservations", "deleted"] });
    },
  });
}

export function useDeletedReservations(propertyId: string) {
  return useQuery({
    queryKey: ["reservations", "deleted", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("property_id", propertyId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useRestoreReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      property_id,
      period_month,
      period_year,
    }: {
      id: string;
      property_id: string;
      period_month: number;
      period_year: number;
    }) => {
      const { error } = await supabase
        .from("reservations")
        .update({ deleted_at: null } as any)
        .eq("id", id);
      if (error) throw error;
      return { property_id, period_month, period_year };
    },
    onSuccess: ({ property_id, period_month, period_year }) => {
      qc.invalidateQueries({ queryKey: qk(property_id, period_month, period_year) });
      qc.invalidateQueries({ queryKey: ["reservations", "deleted"] });
    },
  });
}
