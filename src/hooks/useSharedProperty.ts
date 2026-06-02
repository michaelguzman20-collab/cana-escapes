import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Fetch a property by its share_token (public, no auth required)
export function useSharedProperty(token: string) {
  return useQuery({
    queryKey: ["shared-property", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("share_token", token)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!token,
    retry: false,
  });
}

// Fetch reservations for a shared property (public, no auth required)
export function useSharedReservations(
  propertyId: string,
  month: number,
  year: number
) {
  return useQuery({
    queryKey: ["shared-reservations", propertyId, month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("property_id", propertyId)
        .eq("period_month", month)
        .eq("period_year", year)
        .order("checkin");
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });
}

// Fetch brackets (public, no auth required)
export function useSharedBrackets() {
  return useQuery({
    queryKey: ["shared-brackets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brackets")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}
