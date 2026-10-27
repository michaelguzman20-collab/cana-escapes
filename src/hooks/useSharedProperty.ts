import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Bracket, Property, Reservation } from "@/types/database";

// Public share link (/compartir/:token). Anonymous access goes only through
// SECURITY DEFINER RPCs that require the token — there are no anon RLS policies.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SharedProperty = Pick<Property, "id" | "name" | "owner_name" | "reference_rate" | "share_enabled">;
export type SharedReservation = Pick<
  Reservation,
  | "id" | "checkin" | "checkout" | "nights" | "platform" | "currency" | "payment_type" | "status"
  | "gross_amount" | "net_amount" | "owner_amount" | "owner_rds"
  | "platform_comm_usd" | "card_fee_usd" | "extra_usd"
>;

// Fetch a property by its share_token (public, no auth required)
export function useSharedProperty(token: string) {
  return useQuery({
    queryKey: ["shared-property", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_shared_property", { p_token: token } as never);
      if (error) return null;
      return ((data as SharedProperty[] | null)?.[0] ?? null);
    },
    enabled: UUID_RE.test(token),
    retry: false,
  });
}

// Fetch reservations for a shared property (public, no auth required)
export function useSharedReservations(token: string, month: number, year: number) {
  return useQuery({
    queryKey: ["shared-reservations", token, month, year],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_shared_reservations", {
        p_token: token, p_month: month, p_year: year,
      } as never);
      if (error) throw error;
      return (data ?? []) as SharedReservation[];
    },
    enabled: UUID_RE.test(token),
  });
}

// Fetch brackets for a shared property (public, no auth required)
export function useSharedBrackets(token: string) {
  return useQuery({
    queryKey: ["shared-brackets", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_shared_brackets", { p_token: token } as never);
      if (error) throw error;
      return (data ?? []) as Bracket[];
    },
    enabled: UUID_RE.test(token),
  });
}
