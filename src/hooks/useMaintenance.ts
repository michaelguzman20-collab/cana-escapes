import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { MaintenanceTicketInsert, MaintenanceScheduleInsert, MaintenanceTicket } from "@/types/database";

// ── Tickets ──────────────────────────────────────────────────────
export function useMaintenanceTickets() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["maintenance_tickets", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_tickets")
        .select("*")
        .order("fecha_reporte", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateMaintenanceTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (insert: MaintenanceTicketInsert) => {
      const { data, error } = await supabase
        .from("maintenance_tickets")
        .insert(insert as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance_tickets"] }),
  });
}

export function useUpdateMaintenanceTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<MaintenanceTicketInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("maintenance_tickets")
        .update(update as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance_tickets"] }),
  });
}

export function useDeleteMaintenanceTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("maintenance_tickets")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance_tickets"] }),
  });
}

// ── Schedules (Preventive) ───────────────────────────────────────
export function useMaintenanceSchedules() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["maintenance_schedules", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_schedules")
        .select("*")
        .order("proxima_ejecucion");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateMaintenanceSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (insert: MaintenanceScheduleInsert) => {
      const { data, error } = await supabase
        .from("maintenance_schedules")
        .insert(insert as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance_schedules"] }),
  });
}

export function useUpdateMaintenanceSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<MaintenanceScheduleInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("maintenance_schedules")
        .update(update as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance_schedules"] }),
  });
}

export function useDeleteMaintenanceSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("maintenance_schedules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance_schedules"] }),
  });
}

// ── Sync ticket → charge ────────────────────────────────────────
export function useSyncTicketToCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ticket,
      ownerId,
    }: {
      ticket: MaintenanceTicket;
      ownerId: string | null;
    }) => {
      const chargeType =
        ticket.asignacion_costo === "cana_escapes" ? "ce" : "propietario";

      // 1. Create the charge
      const { data: charge, error: chargeErr } = await supabase
        .from("charges")
        .insert({
          property_id: ticket.property_id,
          owner_id: chargeType === "propietario" ? ownerId : null,
          category: "Mantenimiento",
          description: `${ticket.categoria}: ${ticket.titulo}`,
          currency: ticket.currency === "DOP" ? "RD$" : "USD",
          amount: ticket.costo_real > 0 ? ticket.costo_real : ticket.costo_estimado,
          exchange_rate: ticket.currency === "DOP" ? 1 : 1,
          amount_usd:
            ticket.currency === "USD"
              ? (ticket.costo_real > 0 ? ticket.costo_real : ticket.costo_estimado)
              : 0,
          date: ticket.fecha_resuelto ?? ticket.fecha_reporte,
          status: "Pendiente",
          charge_type: chargeType,
          notes: `Sincronizado desde mantenimiento: ${ticket.titulo}${
            ticket.notas ? " — " + ticket.notas : ""
          }`,
        } as any)
        .select()
        .single();
      if (chargeErr) throw chargeErr;

      // 2. Create one charge_item line
      const { error: itemErr } = await supabase
        .from("charge_items")
        .insert({
          charge_id: charge.id,
          description: `${ticket.categoria}: ${ticket.titulo}`,
          quantity: 1,
          unit_price: ticket.costo_real > 0 ? ticket.costo_real : ticket.costo_estimado,
          total: ticket.costo_real > 0 ? ticket.costo_real : ticket.costo_estimado,
          sort_order: 0,
        } as any);
      if (itemErr) throw itemErr;

      // 3. Link the charge back to the ticket
      const { error: linkErr } = await supabase
        .from("maintenance_tickets")
        .update({
          charge_id: charge.id,
          synced_at: new Date().toISOString(),
        } as any)
        .eq("id", ticket.id);
      if (linkErr) throw linkErr;

      return charge;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance_tickets"] });
      qc.invalidateQueries({ queryKey: ["charges"] });
      qc.invalidateQueries({ queryKey: ["charge_items"] });
    },
  });
}
