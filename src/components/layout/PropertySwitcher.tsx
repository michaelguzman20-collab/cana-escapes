import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus, Building2, Loader2 } from "lucide-react";
import { useProperty } from "@/contexts/PropertyContext";
import { useCreateProperty } from "@/hooks/useProperties";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── Property color palette ────────────────────────────────────────────────────
const PROP_COLORS = [
  "#F0A030", // gold (brand)
  "#2D6A9F", // ocean blue
  "#059669", // emerald
  "#7C3AED", // violet
  "#DC2626", // red
  "#0891B2", // cyan
];
function propColor(idx: number) { return PROP_COLORS[idx % PROP_COLORS.length]; }

// ── PropertySwitcher ─────────────────────────────────────────────────────────
export function PropertySwitcher() {
  const { properties, selectedPropertyId, selectedProperty, setSelectedPropertyId } = useProperty();
  const createProp = useCreateProperty();

  const [dropOpen, setDropOpen]   = useState(false);
  const [creating, setCreating]   = useState(false);

  // Create form state
  const [name,      setName]      = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [rate,      setRate]      = useState("60");

  const dropRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropOpen) return;
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropOpen]);

  const selectedIdx   = properties.findIndex((p) => p.id === selectedPropertyId);
  const currentColor  = selectedIdx >= 0 ? propColor(selectedIdx) : PROP_COLORS[0];

  function openCreate() {
    setDropOpen(false);
    setName(""); setOwnerName(""); setRate("60");
    setCreating(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const created = await createProp.mutateAsync({
      name,
      owner_name: ownerName,
      reference_rate: parseFloat(rate) || 60,
    });
    setSelectedPropertyId(created.id);
    setCreating(false);
  }

  return (
    <>
      <div ref={dropRef} className="relative px-3 py-1.5 md:px-3 md:py-2">
        {/* ── Trigger button ──────────────────────────────────────────────── */}
        <button
          onClick={() => setDropOpen((o) => !o)}
          className="w-full flex items-center gap-2 md:gap-2.5 px-2.5 py-1.5 md:px-3 md:py-2.5 rounded-lg bg-white/8 hover:bg-white/12 border border-white/10 hover:border-white/20 transition-all text-left group"
        >
          {/* Color dot */}
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white/20"
            style={{ background: currentColor }}
          />

          {/* Name + owner */}
          <div className="flex-1 min-w-0">
            {selectedProperty ? (
              <>
                <p className="text-[12px] md:text-[13px] font-semibold text-white truncate leading-tight">
                  {selectedProperty.name}
                </p>
                <p className="text-[10px] text-white/50 truncate leading-tight">
                  {selectedProperty.owner_name}
                </p>
              </>
            ) : properties.length === 0 ? (
              <p className="text-xs text-white/50 italic">Sin propiedades</p>
            ) : (
              <p className="text-xs text-white/50 italic">Selecciona una…</p>
            )}
          </div>

          <ChevronDown
            size={14}
            className={`text-white/40 shrink-0 transition-transform duration-200 ${dropOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* ── Dropdown ────────────────────────────────────────────────────── */}
        {dropOpen && (
          <div className="absolute left-3 right-3 top-[calc(100%-4px)] mt-1 bg-[#112f50] border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
            {properties.length === 0 ? (
              <div className="px-4 py-3 text-center">
                <Building2 size={20} className="mx-auto text-white/20 mb-1" />
                <p className="text-xs text-white/40">No hay propiedades</p>
              </div>
            ) : (
              <div className="max-h-52 overflow-y-auto">
                {properties.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPropertyId(p.id); setDropOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors ${
                      p.id === selectedPropertyId
                        ? "bg-white/15"
                        : "hover:bg-white/8"
                    }`}
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: propColor(idx) }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-white/40 truncate">{p.owner_name}</p>
                    </div>
                    {p.id === selectedPropertyId && (
                      <Check size={12} className="shrink-0" style={{ color: currentColor }} />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Add new property */}
            <div className="border-t border-white/10">
              <button
                onClick={openCreate}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[#F0A030] hover:bg-white/8 transition-colors"
              >
                <Plus size={12} />
                <span className="text-xs font-medium">Nueva propiedad</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create property dialog ──────────────────────────────────────────── */}
      <Dialog open={creating} onOpenChange={(v) => { if (!v) setCreating(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Building2 size={16} className="text-[#2D6A9F]" />
              Nueva propiedad
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nombre de la propiedad</Label>
              <Input
                placeholder="Ej. Villa Coral"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label>Nombre del propietario</Label>
              <Input
                placeholder="Nombre completo"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Tasa de referencia USD→RD$</Label>
              <Input
                type="number" step="0.01" min="1"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createProp.isPending}>
                {createProp.isPending
                  ? <><Loader2 size={13} className="mr-1.5 animate-spin" />Creando…</>
                  : "Crear propiedad"
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
