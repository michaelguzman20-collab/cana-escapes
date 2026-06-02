import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface GuestUser {
  id: string;
  email: string;
  property_id: string | null;
  property_name: string | null;
}

export function useGuestUsers() {
  return useQuery({
    queryKey: ["guest-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_guest_users");
      if (error) throw error;
      return data as GuestUser[];
    },
  });
}

export function useUnlinkGuestProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (propertyId: string) => {
      const { error } = await supabase
        .from("properties")
        .update({ owner_profile_id: null } as any)
        .eq("id", propertyId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guest-users"] });
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}
