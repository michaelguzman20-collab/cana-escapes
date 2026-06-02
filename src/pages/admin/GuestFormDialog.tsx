import { useState, useEffect, useMemo } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useCreateGuest, useUpdateGuest, useGuests } from "@/hooks/useGuests";
import { useProperties } from "@/hooks/useProperties";
import type { Guest } from "@/types/database";

// ── Country phone detection ──────────────────────────────────────────────────
const DIAL_CODES: { prefix: string; flag: string; name: string }[] = [
  { prefix: "+1809", flag: "🇩🇴", name: "Rep. Dominicana" },
  { prefix: "+1829", flag: "🇩🇴", name: "Rep. Dominicana" },
  { prefix: "+1849", flag: "🇩🇴", name: "Rep. Dominicana" },
  { prefix: "+1787", flag: "🇵🇷", name: "Puerto Rico"     },
  { prefix: "+1939", flag: "🇵🇷", name: "Puerto Rico"     },
  { prefix: "+1876", flag: "🇯🇲", name: "Jamaica"         },
  { prefix: "+1868", flag: "🇹🇹", name: "Trinidad"        },
  { prefix: "+1246", flag: "🇧🇧", name: "Barbados"        },
  { prefix: "+1242", flag: "🇧🇸", name: "Bahamas"         },
  { prefix: "+507", flag: "🇵🇦", name: "Panamá"       },
  { prefix: "+506", flag: "🇨🇷", name: "Costa Rica"   },
  { prefix: "+505", flag: "🇳🇮", name: "Nicaragua"    },
  { prefix: "+504", flag: "🇭🇳", name: "Honduras"     },
  { prefix: "+503", flag: "🇸🇻", name: "El Salvador"  },
  { prefix: "+502", flag: "🇬🇹", name: "Guatemala"    },
  { prefix: "+593", flag: "🇪🇨", name: "Ecuador"      },
  { prefix: "+598", flag: "🇺🇾", name: "Uruguay"      },
  { prefix: "+595", flag: "🇵🇾", name: "Paraguay"     },
  { prefix: "+591", flag: "🇧🇴", name: "Bolivia"      },
  { prefix: "+52",  flag: "🇲🇽", name: "México"       },
  { prefix: "+54",  flag: "🇦🇷", name: "Argentina"    },
  { prefix: "+55",  flag: "🇧🇷", name: "Brasil"       },
  { prefix: "+56",  flag: "🇨🇱", name: "Chile"        },
  { prefix: "+57",  flag: "🇨🇴", name: "Colombia"     },
  { prefix: "+58",  flag: "🇻🇪", name: "Venezuela"    },
  { prefix: "+51",  flag: "🇵🇪", name: "Perú"         },
  { prefix: "+53",  flag: "🇨🇺", name: "Cuba"         },
  { prefix: "+351", flag: "🇵🇹", name: "Portugal"        },
  { prefix: "+34",  flag: "🇪🇸", name: "España"          },
  { prefix: "+33",  flag: "🇫🇷", name: "Francia"         },
  { prefix: "+39",  flag: "🇮🇹", name: "Italia"          },
  { prefix: "+44",  flag: "🇬🇧", name: "Reino Unido"     },
  { prefix: "+49",  flag: "🇩🇪", name: "Alemania"        },
  { prefix: "+31",  flag: "🇳🇱", name: "Países Bajos"    },
  { prefix: "+32",  flag: "🇧🇪", name: "Bélgica"         },
  { prefix: "+41",  flag: "🇨🇭", name: "Suiza"           },
  { prefix: "+43",  flag: "🇦🇹", name: "Austria"         },
  { prefix: "+46",  flag: "🇸🇪", name: "Suecia"          },
  { prefix: "+47",  flag: "🇳🇴", name: "Noruega"         },
  { prefix: "+45",  flag: "🇩🇰", name: "Dinamarca"       },
  { prefix: "+48",  flag: "🇵🇱", name: "Polonia"         },
  { prefix: "+7",   flag: "🇷🇺", name: "Rusia"           },
  { prefix: "+971", flag: "🇦🇪", name: "Emiratos Árabes" },
  { prefix: "+972", flag: "🇮🇱", name: "Israel"          },
  { prefix: "+86",  flag: "🇨🇳", name: "China"           },
  { prefix: "+81",  flag: "🇯🇵", name: "Japón"           },
  { prefix: "+82",  flag: "🇰🇷", name: "Corea del Sur"   },
  { prefix: "+91",  flag: "🇮🇳", name: "India"           },
  { prefix: "+61",  flag: "🇦🇺", name: "Australia"       },
  { prefix: "+64",  flag: "🇳🇿", name: "Nueva Zelanda"   },
  { prefix: "+1",   flag: "🇺🇸", name: "USA / Canadá"    },
];

function detectCountry(phone: string): { flag: string; name: string } | null {
  const clean = phone.replace(/[\s\-().]/g, "");
  if (clean.length < 2) return null;
  const sorted = [...DIAL_CODES].sort((a, b) => b.prefix.length - a.prefix.length);
  const withPlus = clean.startsWith("+") ? clean : "+" + clean;
  return sorted.find(({ prefix }) => withPlus.startsWith(prefix)) ?? null;
}

// ── Constants ────────────────────────────────────────────────────────────────
const DOC_TYPES    = ["Pasaporte", "Cédula", "DNI", "Licencia", "Otro"];
const NATIONALITIES = [
  "Dominicana", "Estadounidense", "Canadiense", "Española", "Colombiana",
  "Venezolana", "Puertorriqueña", "Cubana", "Mexicana", "Panameña",
  "Costarricense", "Argentina", "Brasileña", "Chilena", "Peruana",
  "Francesa", "Italiana", "Alemana", "Inglesa", "Otra",
];

// ── Form blank ────────────────────────────────────────────────────────────────
const blank = {
  name: "", email: "", phone: "",
  nationality: "", document_type: "", document_number: "",
  notes: "",
  tags:              [] as string[],
  property_ids:      [] as string[],
  related_guest_ids: [] as string[],
};

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  guest?: Guest | null;
  prefill?: { name?: string; email?: string; phone?: string };
}

// ── Component ─────────────────────────────────────────────────────────────────
export function GuestFormDialog({ open, onClose, guest, prefill }: Props) {
  const createGuest = useCreateGuest();
  const updateGuest = useUpdateGuest();
  const { data: allGuests  = [] } = useGuests();
  const { data: properties = [] } = useProperties();

  const [f,         setF]         = useState(blank);
  const [tagInput,  setTagInput]  = useState("");
  const [guestSearch, setGuestSearch] = useState("");

  // ── Populate form ────────────────────────────────────────────────────────
  useEffect(() => {
    if (guest) {
      setF({
        name:              guest.name ?? "",
        email:             guest.email ?? "",
        phone:             guest.phone ?? "",
        nationality:       guest.nationality ?? "",
        document_type:     guest.document_type ?? "",
        document_number:   guest.document_number ?? "",
        notes:             guest.notes ?? "",
        tags:              guest.tags ?? [],
        property_ids:      guest.property_ids ?? [],
        related_guest_ids: guest.related_guest_ids ?? [],
      });
    } else {
      setF({
        ...blank,
        name:  prefill?.name  ?? "",
        email: prefill?.email ?? "",
        phone: prefill?.phone ?? "",
      });
      setTagInput("");
      setGuestSearch("");
    }
  }, [guest, prefill, open]);

  // ── Tag handling ─────────────────────────────────────────────────────────
  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim().replace(/,$/, "");
      if (tag && !f.tags.includes(tag)) setF((p) => ({ ...p, tags: [...p.tags, tag] }));
      setTagInput("");
    }
    if (e.key === "Backspace" && !tagInput && f.tags.length > 0)
      setF((p) => ({ ...p, tags: p.tags.slice(0, -1) }));
  }

  // ── Property toggle ───────────────────────────────────────────────────────
  function toggleProperty(id: string) {
    setF((p) => ({
      ...p,
      property_ids: p.property_ids.includes(id)
        ? p.property_ids.filter((x) => x !== id)
        : [...p.property_ids, id],
    }));
  }

  // ── Related guest toggle ──────────────────────────────────────────────────
  function toggleRelated(id: string) {
    setF((p) => ({
      ...p,
      related_guest_ids: p.related_guest_ids.includes(id)
        ? p.related_guest_ids.filter((x) => x !== id)
        : [...p.related_guest_ids, id],
    }));
  }

  // ── Filtered guest list for picker ────────────────────────────────────────
  const guestPickerList = useMemo(() => {
    const q = guestSearch.toLowerCase();
    return allGuests.filter((g) =>
      g.id !== guest?.id &&    // exclude self
      (q === "" || g.name.toLowerCase().includes(q))
    );
  }, [allGuests, guestSearch, guest]);

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!f.name.trim()) {
      toast({ title: "El nombre es obligatorio", variant: "destructive" });
      return;
    }
    try {
      const payload = {
        name:              f.name.trim(),
        email:             f.email || null,
        phone:             f.phone || null,
        nationality:       f.nationality || null,
        document_type:     f.document_type || null,
        document_number:   f.document_number || null,
        notes:             f.notes || null,
        tags:              f.tags.length > 0 ? f.tags : null,
        property_ids:      f.property_ids.length > 0 ? f.property_ids : null,
        related_guest_ids: f.related_guest_ids.length > 0 ? f.related_guest_ids : null,
      };
      if (guest) {
        await updateGuest.mutateAsync({ id: guest.id, ...payload });
        toast({ title: "Huésped actualizado" });
      } else {
        await createGuest.mutateAsync(payload);
        toast({ title: "Huésped registrado" });
      }
      onClose();
    } catch (err: any) {
      toast({ title: "Error al guardar", description: err.message, variant: "destructive" });
    }
  }

  const detectedCountry = detectCountry(f.phone);
  const isLoading       = createGuest.isPending || updateGuest.isPending;

  // ── Label helper ─────────────────────────────────────────────────────────
  const FL = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs font-semibold uppercase tracking-wide text-[#0F2B4C]">{children}</p>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg text-[#0F2B4C]">
            {guest ? "Editar huésped" : "Nuevo huésped"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* ── Nombre ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-[#0F2B4C]">
              Nombre completo <span className="text-red-500">*</span>
            </Label>
            <Input placeholder="Nombre del huésped" value={f.name}
              onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))} />
          </div>

          {/* ── Email ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-[#0F2B4C]">Correo electrónico</Label>
            <Input type="email" placeholder="correo@ejemplo.com" value={f.email}
              onChange={(e) => setF((p) => ({ ...p, email: e.target.value }))} />
          </div>

          {/* ── Teléfono ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-[#0F2B4C]">Teléfono</Label>
            <div className={`flex h-10 rounded-md border overflow-hidden focus-within:ring-2 focus-within:ring-[#2D6A9F]/40 focus-within:border-[#2D6A9F] transition-all
              ${detectedCountry ? "border-emerald-400" : "border-input"}`}>
              <div className={`flex items-center justify-center shrink-0 border-r px-3 ${detectedCountry ? "bg-emerald-50 border-emerald-200" : "bg-muted/40 border-input"}`}>
                <span className="text-lg leading-none">{detectedCountry ? detectedCountry.flag : "🌐"}</span>
              </div>
              <input type="tel" placeholder="+1 809 000 0000" value={f.phone}
                onChange={(e) => setF((p) => ({ ...p, phone: e.target.value }))}
                className="flex-1 px-3 h-full text-sm bg-transparent outline-none" />
            </div>
            {detectedCountry && <p className="text-[10px] text-emerald-600 font-medium">✓ {detectedCountry.name}</p>}
          </div>

          {/* ── Propiedades ── */}
          {properties.length > 0 && (
            <div className="space-y-1.5">
              <FL>Propiedad(es)</FL>
              <p className="text-[10px] text-muted-foreground -mt-1">Selecciona las propiedades donde se hospedó o se hospedará</p>
              <div className="flex gap-2 flex-wrap">
                {properties.map((p) => {
                  const sel = f.property_ids.includes(p.id);
                  return (
                    <button key={p.id} type="button" onClick={() => toggleProperty(p.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        sel
                          ? "bg-[#0F2B4C] text-white border-[#0F2B4C] shadow-sm"
                          : "bg-white text-muted-foreground border-border hover:border-[#2D6A9F] hover:text-[#2D6A9F]"
                      }`}>
                      {sel && <span className="mr-1">✓</span>}{p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Huéspedes asociados ── */}
          {allGuests.filter((g) => g.id !== guest?.id).length > 0 && (
            <div className="space-y-1.5">
              <FL>Huéspedes asociados</FL>
              <p className="text-[10px] text-muted-foreground -mt-1">Conecta con otros huéspedes que viajaron o se hospedaron juntos</p>

              {/* Selected chips */}
              {f.related_guest_ids.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {f.related_guest_ids.map((id) => {
                    const g = allGuests.find((x) => x.id === id);
                    if (!g) return null;
                    return (
                      <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#2D6A9F]/15 text-[#0F2B4C] font-medium border border-[#2D6A9F]/20">
                        {g.name}
                        <button type="button" onClick={() => toggleRelated(id)} className="hover:text-red-500 transition-colors">
                          <X size={10} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Search input */}
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="w-full pl-8 pr-3 h-9 rounded-md border border-input text-sm bg-background outline-none focus:ring-2 focus:ring-[#2D6A9F]/40 focus:border-[#2D6A9F] transition-all"
                  placeholder="Buscar huésped por nombre…"
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                />
              </div>

              {/* Dropdown list */}
              {guestSearch && guestPickerList.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden bg-white shadow-md max-h-40 overflow-y-auto">
                  {guestPickerList.map((g) => {
                    const selected = f.related_guest_ids.includes(g.id);
                    return (
                      <button key={g.id} type="button"
                        onClick={() => { toggleRelated(g.id); setGuestSearch(""); }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[#2D6A9F]/5 transition-colors text-left ${selected ? "bg-[#2D6A9F]/10" : ""}`}>
                        <span className="font-medium text-[#0F2B4C]">{g.name}</span>
                        {selected
                          ? <span className="text-[10px] text-[#2D6A9F] font-semibold">✓ Asociado</span>
                          : <span className="text-[10px] text-muted-foreground">Asociar</span>}
                      </button>
                    );
                  })}
                </div>
              )}
              {guestSearch && guestPickerList.length === 0 && (
                <p className="text-xs text-muted-foreground italic px-1">No se encontraron huéspedes.</p>
              )}
            </div>
          )}

          {/* ── Nacionalidad ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-[#0F2B4C]">Nacionalidad</Label>
            <div className="relative">
              <select value={f.nationality} onChange={(e) => setF((p) => ({ ...p, nationality: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A9F]/40 focus:border-[#2D6A9F] appearance-none cursor-pointer">
                <option value="">Seleccionar…</option>
                {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">▾</span>
            </div>
          </div>

          {/* ── Documento ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-[#0F2B4C]">Tipo de documento</Label>
              <div className="relative">
                <select value={f.document_type} onChange={(e) => setF((p) => ({ ...p, document_type: e.target.value }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A9F]/40 focus:border-[#2D6A9F] appearance-none cursor-pointer">
                  <option value="">Tipo…</option>
                  {DOC_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">▾</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-[#0F2B4C]">Número</Label>
              <Input placeholder="AB123456" value={f.document_number}
                onChange={(e) => setF((p) => ({ ...p, document_number: e.target.value }))} />
            </div>
          </div>

          {/* ── Tags ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-[#0F2B4C]">
              Etiquetas
              <span className="ml-1 font-normal text-muted-foreground normal-case tracking-normal">(Enter o coma para agregar)</span>
            </Label>
            <div className="min-h-10 flex flex-wrap gap-1.5 items-center rounded-md border border-input px-2 py-1.5 focus-within:ring-2 focus-within:ring-[#2D6A9F]/40 focus-within:border-[#2D6A9F]">
              {f.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#0F2B4C]/10 text-[#0F2B4C] font-medium">
                  {tag}
                  <button type="button" onClick={() => setF((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }))} className="hover:text-red-500 transition-colors">×</button>
                </span>
              ))}
              <input className="flex-1 min-w-[120px] text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                placeholder={f.tags.length === 0 ? "VIP, Repetido, Corporativo…" : ""}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown} />
            </div>
          </div>

          {/* ── Notas ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-[#0F2B4C]">Notas internas</Label>
            <Textarea placeholder="Preferencias, alergias, notas de servicio…" className="min-h-[80px] resize-none text-sm"
              value={f.notes} onChange={(e) => setF((p) => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="bg-[#0F2B4C] hover:bg-[#0F2B4C]/90 text-white">
            {isLoading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…</>
              : guest ? "Actualizar" : "Registrar huésped"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
