import { useState, useEffect, useMemo } from "react";
import { Loader2, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Reservation, PlatformConfig, MaintenanceTicket } from "@/types/database";

// ── Extra guest type ─────────────────────────────────────────────────────────
type GuestLine = { name: string; type: "adulto" | "niño" };

// ── Country phone detection ──────────────────────────────────────────────────
const DIAL_CODES: { prefix: string; flag: string; name: string }[] = [
  // Caribbean (specific area codes first for longest-prefix match)
  { prefix: "+1809", flag: "🇩🇴", name: "Rep. Dominicana" },
  { prefix: "+1829", flag: "🇩🇴", name: "Rep. Dominicana" },
  { prefix: "+1849", flag: "🇩🇴", name: "Rep. Dominicana" },
  { prefix: "+1787", flag: "🇵🇷", name: "Puerto Rico"     },
  { prefix: "+1939", flag: "🇵🇷", name: "Puerto Rico"     },
  { prefix: "+1876", flag: "🇯🇲", name: "Jamaica"         },
  { prefix: "+1868", flag: "🇹🇹", name: "Trinidad"        },
  { prefix: "+1246", flag: "🇧🇧", name: "Barbados"        },
  { prefix: "+1242", flag: "🇧🇸", name: "Bahamas"         },
  // Latin America
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
  // Europe
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
  // Asia-Pacific
  { prefix: "+971", flag: "🇦🇪", name: "Emiratos Árabes" },
  { prefix: "+972", flag: "🇮🇱", name: "Israel"          },
  { prefix: "+86",  flag: "🇨🇳", name: "China"           },
  { prefix: "+81",  flag: "🇯🇵", name: "Japón"           },
  { prefix: "+82",  flag: "🇰🇷", name: "Corea del Sur"   },
  { prefix: "+91",  flag: "🇮🇳", name: "India"           },
  { prefix: "+61",  flag: "🇦🇺", name: "Australia"       },
  { prefix: "+64",  flag: "🇳🇿", name: "Nueva Zelanda"   },
  // USA / Canada (broad +1 last — fallback after specific Caribbean codes)
  { prefix: "+1",   flag: "🇺🇸", name: "USA / Canadá"    },
];

function detectCountry(phone: string): { flag: string; name: string } | null {
  const clean = phone.replace(/[\s\-().]/g, "");
  if (clean.length < 2) return null;
  // Sort longest prefix first for greedy match (e.g. +1809 before +1)
  const sorted = [...DIAL_CODES].sort((a, b) => b.prefix.length - a.prefix.length);
  // Support both "+1809…" and "1809…" (without explicit +)
  const withPlus = clean.startsWith("+") ? clean : "+" + clean;
  return sorted.find(({ prefix }) => withPlus.startsWith(prefix)) ?? null;
}

const STATUSES = ["Pendiente", "Confirmada", "Completada", "Cancelada"];
const STATUS_LABELS: Record<string, string> = {
  Pendiente:  "Reservado",
  Confirmada: "Confirmada",
  Completada: "Completada",
  Cancelada:  "Cancelada",
};
const CURRENCIES  = ["USD", "RD$"];
const PAYMENTS    = ["Tarjeta", "Transferencia", "Efectivo"];
const CARD_FEE_PCT = 4;

// ── Extra line type ──────────────────────────────────────────────────────────
type ExtraLine = { label: string; pct: string; usd: string };

function makeBlankExtra(): ExtraLine {
  return { label: "", pct: "0", usd: "0" };
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Reservation | null;
  prefillCheckin?: string;
  prefillCheckout?: string;
  propertyId: string;
  month: number;
  year: number;
  platforms: PlatformConfig[];
  defaultRate: number;
  onSave: (data: Omit<Reservation, "id" | "created_at" | "deleted_at">) => Promise<void>;
  saving: boolean;
  maintenanceTickets?: MaintenanceTicket[];
}

function calcNights(checkin: string, checkout: string): number {
  if (!checkin || !checkout) return 0;
  const diff = new Date(checkout).getTime() - new Date(checkin).getTime();
  return Math.max(0, Math.round(diff / 86_400_000));
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ReservationFormDialog({
  open,
  onOpenChange,
  editing,
  prefillCheckin,
  prefillCheckout,
  propertyId,
  month,
  year,
  platforms,
  defaultRate,
  onSave,
  saving,
  maintenanceTickets = [],
}: Props) {

  const blankForm = () => ({
    checkin:           "",
    checkout:          "",
    guest_name:        "",
    guests:            "1" as string,
    guest_phone:       "" as string,
    guest_email:       "" as string,
    extra_guests:      [] as GuestLine[],
    platform:          platforms[0]?.platform ?? "",
    currency:          "USD" as string,
    payment_type:      "Tarjeta" as string,
    gross_amount:      "" as string,
    platform_comm_pct:       platforms[0] ? String(platforms[0].commission_pct)        : "0",
    platform_comm_fixed:     platforms[0] ? String(platforms[0].fixed_amount_usd)      : "0",
    platform_marketing_pct:  platforms[0] ? String(platforms[0].marketing_pct ?? 0)    : "0",
    card_fee_pct:        String(CARD_FEE_PCT),
    extras:            [makeBlankExtra()] as ExtraLine[],
    exchange_rate:     String(defaultRate),
    status:            "Pendiente" as string,
    notes:             "" as string,
  });

  const [f, setF] = useState(blankForm());

  useEffect(() => {
    if (!open) return;
    if (editing) {
      // Reconstruct extras: stored extra_usd = fixed + gross * pct/100
      const storedPct   = editing.extra_pct;
      const storedTotal = editing.extra_usd;
      const fixedPart   = Math.max(0, storedTotal - editing.gross_amount * storedPct / 100);
      const editExtras: ExtraLine[] = [];
      if (storedPct > 0 || storedTotal > 0) {
        editExtras.push({
          label: "",
          pct:   String(storedPct),
          usd:   fixedPart > 0.001 ? fixedPart.toFixed(2) : "0",
        });
      }
      editExtras.push(makeBlankExtra());

      const storedExtraGuests: GuestLine[] = (() => {
        if (!editing.extra_guests) return [];
        try {
          const parsed = typeof editing.extra_guests === "string"
            ? JSON.parse(editing.extra_guests)
            : editing.extra_guests;
          return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
      })();

      setF({
        checkin:           editing.checkin,
        checkout:          editing.checkout,
        guest_name:        editing.guest_name,
        guests:            String(editing.guests ?? 1),
        guest_phone:       editing.guest_phone ?? "",
        guest_email:       editing.guest_email ?? "",
        extra_guests:      storedExtraGuests,
        platform:          editing.platform,
        currency:          editing.currency,
        payment_type:      editing.payment_type,
        gross_amount:      String(editing.gross_amount),
        platform_comm_pct: String(editing.platform_comm_pct),
        platform_marketing_pct: editing.gross_amount > 0
          ? String(+((editing.marketing_usd / editing.gross_amount) * 100).toFixed(2))
          : "0",
        // back-calculate fixed: platform_comm_usd - gross * platform_comm_pct/100
        platform_comm_fixed: String(
          Math.max(0, +(editing.platform_comm_usd - editing.gross_amount * editing.platform_comm_pct / 100).toFixed(2))
        ),
        card_fee_pct:        String(editing.card_fee_pct),
        extras:            editExtras,
        exchange_rate:     String(editing.exchange_rate),
        status:            editing.status,
        notes:             editing.notes ?? "",
      });
    } else {
      const blank = blankForm();
      setF(prefillCheckin
        ? { ...blank, checkin: prefillCheckin, checkout: prefillCheckout ?? "" }
        : blank);
    }
  }, [editing, open, prefillCheckin, prefillCheckout]);

  // ── Platform / payment handlers ──────────────────────────────────────────
  function handlePlatformChange(platform: string) {
    const cfg = platforms.find((p) => p.platform === platform);
    setF((prev) => ({
      ...prev,
      platform,
      platform_comm_pct:      cfg ? String(cfg.commission_pct)       : "0",
      platform_comm_fixed:    cfg ? String(cfg.fixed_amount_usd)     : "0",
      platform_marketing_pct: cfg ? String(cfg.marketing_pct ?? 0)  : "0",
    }));
  }

  function handlePaymentChange(payment_type: string) {
    setF((prev) => ({
      ...prev,
      payment_type,
      card_fee_pct: payment_type === "Tarjeta" ? String(CARD_FEE_PCT) : "0",
    }));
  }

  const set = (k: keyof Omit<typeof f, "extras" | "extra_guests">) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setF((prev) => ({ ...prev, [k]: e.target.value }));

  // ── Guests count — sync extra_guests array length ────────────────────────
  function handleGuestsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const n = Math.max(1, parseInt(e.target.value) || 1);
    setF((prev) => {
      const additionalCount = Math.max(0, n - 1);
      const newExtras: GuestLine[] = Array.from({ length: additionalCount }, (_, i) =>
        prev.extra_guests[i] ?? { name: "", type: "adulto" }
      );
      return { ...prev, guests: String(n), extra_guests: newExtras };
    });
  }

  // ── Extra guest row handlers ─────────────────────────────────────────────
  function handleExtraGuestChange(idx: number, field: keyof GuestLine, value: string) {
    setF((prev) => {
      const updated = [...prev.extra_guests];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, extra_guests: updated };
    });
  }

  // ── Phone country detection ──────────────────────────────────────────────
  const detectedCountry = detectCountry(f.guest_phone);

  // ── Extras handlers ──────────────────────────────────────────────────────
  function handleExtraChange(idx: number, field: keyof ExtraLine, value: string) {
    setF((prev) => {
      const newExtras = [...prev.extras];
      newExtras[idx] = { ...newExtras[idx], [field]: value };

      // If this was the last row and now has any real content → add a new blank row
      const isLast = idx === newExtras.length - 1;
      const { pct, usd, label } = newExtras[idx];
      const hasContent =
        (parseFloat(pct) || 0) !== 0 ||
        (parseFloat(usd) || 0) !== 0 ||
        label.trim() !== "";

      if (isLast && hasContent) {
        newExtras.push(makeBlankExtra());
      }

      return { ...prev, extras: newExtras };
    });
  }

  function removeExtra(idx: number) {
    setF((prev) => {
      const newExtras = prev.extras.filter((_, i) => i !== idx);
      if (newExtras.length === 0) newExtras.push(makeBlankExtra());
      return { ...prev, extras: newExtras };
    });
  }

  // ── Maintenance conflict detection ───────────────────────────────────────
  const conflictingMaint = useMemo(() => {
    if (!f.checkin || !f.checkout || !maintenanceTickets.length) return [];
    return maintenanceTickets.filter((t) => {
      if (t.property_id !== propertyId) return false;
      if (t.estado === "Resuelto" || t.estado === "Cancelado") return false;
      const tDate = t.fecha_programada || t.fecha_reporte;
      if (!tDate) return false;
      return tDate >= f.checkin && tDate < f.checkout;
    });
  }, [f.checkin, f.checkout, maintenanceTickets, propertyId]);

  // ── Live calculations ────────────────────────────────────────────────────
  const nights  = calcNights(f.checkin, f.checkout);
  const gross   = parseFloat(f.gross_amount) || 0;
  const platPct        = parseFloat(f.platform_comm_pct)      || 0;
  const platFixed      = parseFloat(f.platform_comm_fixed)    || 0;
  const platMarketPct  = parseFloat(f.platform_marketing_pct) || 0;
  const cardPct   = parseFloat(f.card_fee_pct) || 0;
  const rate      = parseFloat(f.exchange_rate) || defaultRate;
  const cur       = f.currency === "RD$" ? "RD$" : "$";

  function extraLineAmt(ex: ExtraLine): number {
    return gross * ((parseFloat(ex.pct) || 0) / 100) + (parseFloat(ex.usd) || 0);
  }

  // Platform base commission (% of gross + fixed) — stored separately from marketing
  const platAmtPct    = gross * (platPct / 100);
  const platAmt       = platAmtPct + platFixed;           // base + fixed only
  const platMarketAmt = gross * (platMarketPct / 100);   // marketing — separate deduction
  const cardAmt     = gross * (cardPct / 100);
  const totalXtraPct = f.extras.reduce((s, ex) => s + (parseFloat(ex.pct) || 0), 0);
  const totalXtra   = f.extras.reduce((s, ex) => s + extraLineAmt(ex), 0);
  const totalDed    = platAmt + platMarketAmt + cardAmt + totalXtra;
  const net         = gross - totalDed;
  const ownerRDS    = net * 0.7 * rate;

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ownerPct = 70;
    const cePct    = 30;
    try {
      await onSave({
        property_id:        propertyId,
        period_month:       month,
        period_year:        year,
        checkin:            f.checkin,
        checkout:           f.checkout,
        nights,
        guest_name:         f.guest_name,
        guests:             parseInt(f.guests) || 1,
        guest_phone:        f.guest_phone || null,
        guest_email:        f.guest_email || null,
        extra_guests:       f.extra_guests.length > 0 ? f.extra_guests : null,
        platform:           f.platform,
        currency:           f.currency,
        payment_type:       f.payment_type,
        gross_amount:       gross,
        platform_comm_pct:  platPct,         // base commission % only
        platform_comm_usd:  platAmt,         // base + fixed only (not marketing)
        marketing_usd:      platMarketAmt,   // marketing as separate field
        card_fee_pct:       cardPct,
        card_fee_usd:       cardAmt,
        extra_pct:          totalXtraPct,
        extra_usd:          totalXtra,
        net_amount:         net,
        owner_pct:          ownerPct,
        owner_amount:       net * (ownerPct / 100),
        ce_pct:             cePct,
        ce_amount:          net * (cePct / 100),
        exchange_rate:      rate,
        // USD: multiply by rate to get RD$ · RD$: net already in pesos
        owner_rds:          f.currency === "USD"
          ? net * (ownerPct / 100) * rate
          : net * (ownerPct / 100),
        status:             f.status,
        notes:              f.notes || null,
      });
      // onSave (handleSaveRes) closes the dialog on success — this is a safety net
      onOpenChange(false);
    } catch {
      // Parent (handleSaveRes) shows a toast with the error — keep dialog open
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {editing ? "Editar reserva" : "Nueva reserva"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">

          {/* ── Fechas ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Entrada</Label>
              <Input type="date" value={f.checkin} onChange={set("checkin")} required />
            </div>
            <div className="space-y-1">
              <Label>Salida</Label>
              <Input type="date" value={f.checkout} onChange={set("checkout")} required />
            </div>
          </div>
          {nights > 0 && (
            <p className="text-xs text-muted-foreground -mt-3 flex items-center gap-1">
              <span className="font-medium text-foreground">{nights}</span> noche{nights !== 1 ? "s" : ""}
            </p>
          )}

          {/* Maintenance conflict warning */}
          {conflictingMaint.length > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 -mt-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">Conflicto con mantenimiento</p>
                <p className="mt-0.5 text-amber-700">
                  {conflictingMaint.length === 1
                    ? `El ticket "${conflictingMaint[0].titulo}" (${conflictingMaint[0].fecha_programada ?? conflictingMaint[0].fecha_reporte}) coincide con estas fechas.`
                    : `${conflictingMaint.length} tickets de mantenimiento coinciden con estas fechas.`}
                  {" "}Las reservas tienen prioridad — recuerda mover los tickets desde el calendario de mantenimiento.
                </p>
                {conflictingMaint.length > 1 && (
                  <ul className="mt-1 space-y-0.5 text-[11px] text-amber-600">
                    {conflictingMaint.map((t) => (
                      <li key={t.id}>• {t.titulo} ({t.fecha_programada ?? t.fecha_reporte})</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ── Nombre del huésped + Personas ───────────────────────────── */}
          <div className="grid grid-cols-[1fr_110px] gap-3">
            <div className="space-y-1">
              <Label>Nombre del huésped</Label>
              <Input placeholder="Nombre completo" value={f.guest_name} onChange={set("guest_name")} required />
            </div>
            <div className="space-y-1">
              <Label>Personas</Label>
              <Input
                type="number" min="1" max="20" placeholder="1"
                value={f.guests}
                onChange={handleGuestsChange}
              />
            </div>
          </div>

          {/* ── Acompañantes (aparece si personas > 1) ───────────────────── */}
          {f.extra_guests.length > 0 && (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#2D6A9F]/15 text-[#2D6A9F] text-[9px] font-bold">
                  {f.extra_guests.length}
                </span>
                Acompañante{f.extra_guests.length !== 1 ? "s" : ""}
              </p>

              {f.extra_guests.map((g, idx) => (
                <div key={idx} className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-medium w-5 text-right shrink-0">
                    #{idx + 2}
                  </span>
                  <Input
                    placeholder={`Nombre del acompañante ${idx + 2} (opcional)`}
                    value={g.name}
                    onChange={(e) => handleExtraGuestChange(idx, "name", e.target.value)}
                    className="h-9 text-xs"
                  />
                  <div className="flex gap-1 shrink-0">
                    {(["adulto", "niño"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleExtraGuestChange(idx, "type", t)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all
                          ${g.type === t
                            ? t === "adulto"
                              ? "bg-[#0F2B4C] text-white border-[#0F2B4C]"
                              : "bg-violet-600 text-white border-violet-600"
                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                          }`}
                      >
                        {t === "adulto" ? "👤 Adulto" : "🧒 Niño"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Correo + Teléfono ────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Correo electrónico</Label>
              <Input
                type="email" placeholder="correo@ejemplo.com"
                value={f.guest_email} onChange={set("guest_email")}
              />
            </div>

            <div className="space-y-1">
              <Label>Teléfono</Label>
              {/* Flag-prefix input: always shows globe icon, switches to country flag on detection */}
              <div className="flex h-10 rounded-md border border-input overflow-hidden
                focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <div className={`flex items-center justify-center shrink-0 border-r border-input px-3
                  transition-colors ${detectedCountry ? "bg-emerald-50" : "bg-muted/40"}`}>
                  <span className="text-lg leading-none select-none"
                    title={detectedCountry?.name}>
                    {detectedCountry ? detectedCountry.flag : "🌐"}
                  </span>
                </div>
                <input
                  type="tel"
                  placeholder="+1 809 000 0000"
                  value={f.guest_phone}
                  onChange={(e) => setF((prev) => ({ ...prev, guest_phone: e.target.value }))}
                  className="flex-1 px-3 h-full text-sm bg-transparent outline-none
                    placeholder:text-muted-foreground"
                />
              </div>
              {detectedCountry && (
                <p className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                  ✓ {detectedCountry.name}
                </p>
              )}
              {!detectedCountry && f.guest_phone.trim() !== "" && (
                <p className="text-[10px] text-muted-foreground">
                  Agrega el código de país (ej: +1 809…)
                </p>
              )}
            </div>
          </div>

          {/* ── Plataforma / Moneda / Pago ──────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Plataforma</Label>
              <Select value={f.platform} onChange={(e) => handlePlatformChange(e.target.value)}>
                {platforms.length > 0
                  ? platforms.map((p) => <option key={p.id} value={p.platform}>{p.platform}</option>)
                  : <option value="">Sin plataformas</option>}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Moneda</Label>
              <Select value={f.currency} onChange={set("currency")}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo de pago</Label>
              <Select value={f.payment_type} onChange={(e) => handlePaymentChange(e.target.value)}>
                {PAYMENTS.map((p) => <option key={p}>{p}</option>)}
              </Select>
            </div>
          </div>

          {/* ── Monto bruto + Tasa ──────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Monto bruto ({f.currency})</Label>
              <Input
                type="number" step="0.01" min="0" placeholder="0.00"
                value={f.gross_amount} onChange={set("gross_amount")} required
              />
            </div>
            <div className="space-y-1">
              <Label>Tasa del día (RD$ por USD)</Label>
              <Input
                type="number" step="0.01" min="0"
                value={f.exchange_rate} onChange={set("exchange_rate")}
              />
            </div>
          </div>

          {/* ── Deducciones ─────────────────────────────────────────────── */}
          <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Deducciones
            </p>

            {/* Comisión plataforma */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Comisión de plataforma</Label>
              <div className="grid grid-cols-3 gap-2">
                {/* % */}
                <div className="relative">
                  <Input
                    type="number" step="0.1" min="0" max="100"
                    value={f.platform_comm_pct} onChange={set("platform_comm_pct")}
                    className="pr-6"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
                {/* Fijo USD */}
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  <Input
                    type="number" step="0.01" min="0"
                    value={f.platform_comm_fixed} onChange={set("platform_comm_fixed")}
                    className="pl-6"
                    placeholder="0 fijo"
                  />
                </div>
                {/* Sub-total sin marketing (read-only) */}
                <div className="flex items-center h-10 px-3 rounded-md border bg-muted/40 text-sm font-mono">
                  <span className="text-muted-foreground mr-1">−{cur}</span>
                  <span className="font-medium text-red-600">{fmt(platAmtPct + platFixed)}</span>
                </div>
              </div>
            </div>

            {/* Marketing / Promo (auto-filled from platform config, editable) */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Marketing / Promo</Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="relative">
                  <Input
                    type="number" step="0.1" min="0" max="100"
                    value={f.platform_marketing_pct} onChange={set("platform_marketing_pct")}
                    className="pr-6"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
                <div className="col-span-2 flex items-center h-10 px-3 rounded-md border bg-muted/40 text-sm font-mono">
                  <span className="text-muted-foreground mr-1">−{cur}</span>
                  <span className="font-medium text-red-600">{fmt(platMarketAmt)}</span>
                </div>
              </div>
            </div>

            {/* Combined platform total */}
            {(platPct > 0 || platMarketPct > 0 || platFixed > 0) && gross > 0 && (
              <div className="rounded-md border border-red-100 bg-red-50/50 px-3 py-2 text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                <span className="font-medium text-foreground">Total deducciones plataforma:</span>
                {platPct > 0 && <span>{platPct}% = {cur}{fmt(platAmtPct)}</span>}
                {platFixed > 0 && <span>+ fijo {cur}{fmt(platFixed)}</span>}
                {platMarketPct > 0 && <span>+ mkt {platMarketPct}% = {cur}{fmt(platMarketAmt)}</span>}
                <span className="font-bold text-red-600">= {cur}{fmt(platAmt + platMarketAmt)}</span>
              </div>
            )}

            {/* Comisión tarjeta */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Comisión tarjeta
                {f.payment_type !== "Tarjeta" && (
                  <span className="ml-1 text-[10px] text-amber-600">
                    (no aplica — pago {f.payment_type.toLowerCase()})
                  </span>
                )}
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Input
                    type="number" step="0.1" min="0" max="100"
                    value={f.card_fee_pct} onChange={set("card_fee_pct")}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
                <div className="flex items-center h-10 px-3 rounded-md border bg-muted/40 text-sm font-mono">
                  <span className="text-muted-foreground mr-1">−{cur}</span>
                  <span className="font-medium text-red-600">{fmt(cardAmt)}</span>
                  {cardPct > 0 && (
                    <span className="ml-auto text-[10px] text-muted-foreground">{cardPct}%</span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Extras dinámicos ────────────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Extras / Otros cargos</Label>
                <span className="text-[10px] text-muted-foreground">% del bruto + monto fijo</span>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-[1fr_72px_90px_90px_28px] gap-2">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Descripción</span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide text-center">%</span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide text-right">Monto fijo</span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide text-right">Total</span>
                <span />
              </div>

              {f.extras.map((ex, idx) => {
                const lineAmt    = extraLineAmt(ex);
                const isLast     = idx === f.extras.length - 1;
                const hasContent =
                  (parseFloat(ex.pct) || 0) !== 0 ||
                  (parseFloat(ex.usd) || 0) !== 0 ||
                  ex.label.trim() !== "";
                const isLastEmpty = isLast && !hasContent;

                return (
                  <div
                    key={idx}
                    className={`grid grid-cols-[1fr_72px_90px_90px_28px] gap-2 items-center transition-opacity ${
                      isLastEmpty ? "opacity-50" : ""
                    }`}
                  >
                    {/* Label */}
                    <Input
                      placeholder={isLastEmpty ? `Extra ${idx + 1}…` : `Extra ${idx + 1}`}
                      value={ex.label}
                      onChange={(e) => handleExtraChange(idx, "label", e.target.value)}
                      className="h-9 text-xs"
                    />

                    {/* % */}
                    <div className="relative">
                      <Input
                        type="number" step="0.1" min="0" max="100"
                        value={ex.pct}
                        onChange={(e) => handleExtraChange(idx, "pct", e.target.value)}
                        className="h-9 text-xs pr-6 text-center"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
                    </div>

                    {/* Fixed USD */}
                    <div className="relative">
                      <Input
                        type="number" step="0.01" min="0" placeholder="0.00"
                        value={ex.usd}
                        onChange={(e) => handleExtraChange(idx, "usd", e.target.value)}
                        className="h-9 text-xs pr-6"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{cur}</span>
                    </div>

                    {/* Total (read-only) */}
                    <div className="flex items-center justify-end h-9 px-2 rounded-md border bg-muted/40 text-xs font-mono">
                      {hasContent ? (
                        <span className="font-medium text-red-600">−{fmt(lineAmt)}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeExtra(idx)}
                      className={`flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors ${
                        isLastEmpty || f.extras.length <= 1 ? "invisible" : ""
                      }`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })}

              {/* Total extras summary */}
              {totalXtra > 0 && (
                <div className="flex items-center justify-between text-xs border-t border-dashed pt-2 mt-1">
                  <span className="text-muted-foreground">
                    Total extras
                    {totalXtraPct > 0 && (
                      <span className="ml-1 text-[10px]">({totalXtraPct}% del bruto)</span>
                    )}
                  </span>
                  <span className="font-mono font-semibold text-red-600">−{cur}{fmt(totalXtra)}</span>
                </div>
              )}
            </div>

            {/* ── Resumen neto ─────────────────────────────────────────── */}
            {gross > 0 && (
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total deducciones</span>
                  <span className="font-mono font-medium text-red-600">−{cur}{fmt(totalDed)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Neto disponible</span>
                  <span className="font-mono font-bold text-emerald-700 text-lg">{cur}{fmt(net)}</span>
                </div>
                {f.currency === "RD$" && rate > 0 && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 mt-2 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Equivalente en USD (tasa {rate.toFixed(2)})</p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Bruto USD</span>
                      <span className="font-mono font-semibold">${(gross / rate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Neto USD</span>
                      <span className="font-mono font-semibold text-emerald-700">${(net / rate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-blue-200 pt-1.5">
                      <span className="text-muted-foreground">Propietario USD ≈ (70%)</span>
                      <span className="font-mono font-bold text-emerald-700">${(net * 0.7 / rate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Cana Escapes USD ≈ (30%)</span>
                      <span className="font-mono font-bold text-amber-700">${(net * 0.3 / rate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}
                {f.currency === "USD" && (
                  <div className="flex justify-between items-center text-xs text-muted-foreground border-t pt-2">
                    <span>Equiv. propietario ≈ (70%) en RD$</span>
                    <span className="font-mono font-medium text-[#0F2B4C]">
                      RD${ownerRDS.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Estado + notas ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={f.status} onChange={set("status")}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea placeholder="Notas adicionales…" value={f.notes} onChange={set("notes")} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className={editing
                ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
                : ""}
            >
              {saving && <Loader2 size={14} className="mr-2 animate-spin" />}
              {saving
                ? (editing ? "Aplicando cambios…" : "Guardando…")
                : editing
                  ? "✓ Aplicar cambios"
                  : "Agregar reserva"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
