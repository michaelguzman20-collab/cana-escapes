import { createContext, useContext, useState, type ReactNode } from "react";
import { useProperties } from "@/hooks/useProperties";
import type { Property } from "@/types/database";

const STORAGE_KEY = "cana_selected_property_id";

interface PropertyContextValue {
  selectedPropertyId: string;
  selectedProperty: Property | null;
  properties: Property[];
  setSelectedPropertyId: (id: string) => void;
}

const PropertyContext = createContext<PropertyContextValue | null>(null);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const { data: properties = [] } = useProperties();

  const [_selectedId, _setSelectedId] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY) ?? ""; } catch { return ""; }
  });

  function setSelectedPropertyId(id: string) {
    _setSelectedId(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
  }

  // If stored id no longer exists, fall back to first property
  const validId =
    properties.find((p) => p.id === _selectedId)?.id ??
    properties[0]?.id ??
    "";

  const selectedProperty = properties.find((p) => p.id === validId) ?? null;

  return (
    <PropertyContext.Provider
      value={{ selectedPropertyId: validId, selectedProperty, properties, setSelectedPropertyId }}
    >
      {children}
    </PropertyContext.Provider>
  );
}

export function useProperty() {
  const ctx = useContext(PropertyContext);
  if (!ctx) throw new Error("useProperty must be used within PropertyProvider");
  return ctx;
}
