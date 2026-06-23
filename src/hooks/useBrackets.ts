import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Bracket } from "@/types/database";

export function useBrackets() {
  return useQuery({
    queryKey: ["brackets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brackets")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Bracket[];
    },
  });
}

export function useUpdateBracket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      range_min: number;
      range_max: number | null;
      owner_pct: number;
      ce_pct: number;
      description: string | null;
    }) => {
      const { id, ...rest } = payload;
      const { data, error } = await supabase
        .from("brackets")
        .update(rest)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Bracket;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brackets"] }),
  });
}

export function getActiveBracket(brackets: Bracket[], grossUSD: number): Bracket | null {
  if (!brackets.length) return null;
  const sorted = [...brackets].sort((a, b) => a.sort_order - b.sort_order);
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (grossUSD >= sorted[i].range_min) return sorted[i];
  }
  return sorted[0];
}

// Pick the brackets that apply to a property: its own rows if it has any,
// otherwise the shared default template (property_id === null).
export function resolveBracketsForProperty(
  all: Bracket[],
  propertyId: string | null | undefined,
): Bracket[] {
  const own = propertyId ? all.filter((b) => b.property_id === propertyId) : [];
  const rows = own.length ? own : all.filter((b) => b.property_id == null);
  return [...rows].sort((a, b) => a.sort_order - b.sort_order);
}

// Does this property have its own (customized) brackets?
export function hasCustomBrackets(all: Bracket[], propertyId: string | null | undefined): boolean {
  return !!propertyId && all.some((b) => b.property_id === propertyId);
}

// Clone the default template into property-specific rows so the property can
// have its own (independently editable) ranges. Percentages are copied as-is.
export function useCustomizePropertyBrackets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (propertyId: string) => {
      const { data: template, error: tErr } = await supabase
        .from("brackets")
        .select("*")
        .is("property_id", null)
        .order("sort_order");
      if (tErr) throw tErr;
      const rows = (template as Bracket[]).map((b) => ({
        range_min: b.range_min,
        range_max: b.range_max,
        owner_pct: b.owner_pct,
        ce_pct: b.ce_pct,
        description: b.description,
        sort_order: b.sort_order,
        property_id: propertyId,
      }));
      const { error } = await supabase.from("brackets").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brackets"] }),
  });
}

// Remove a property's custom rows so it falls back to the default template.
export function useResetPropertyBrackets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (propertyId: string) => {
      const { error } = await supabase.from("brackets").delete().eq("property_id", propertyId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brackets"] }),
  });
}
