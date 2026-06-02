import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function useMyOwner() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my_owner", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owners")
        .select("*")
        .eq("profile_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMyCharges(propertyId: string) {
  return useQuery({
    queryKey: ["my_charges", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("charges")
        .select("*")
        .eq("property_id", propertyId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useMyChargeItems(chargeId: string | null) {
  return useQuery({
    queryKey: ["my_charge_items", chargeId],
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

export function useMyMaintenanceTickets(propertyId: string) {
  return useQuery({
    queryKey: ["my_maintenance_tickets", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_tickets")
        .select("*")
        .eq("property_id", propertyId)
        .order("fecha_reporte", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useMyOwnerPayments(ownerId: string | null) {
  return useQuery({
    queryKey: ["my_owner_payments", ownerId],
    enabled: !!ownerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owner_payments")
        .select("*")
        .eq("owner_id", ownerId!)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
