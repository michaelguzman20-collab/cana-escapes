import { useState, useMemo } from "react";
import {
  Users, UserCheck, CalendarDays, TrendingUp,
  Search, Plus, SlidersHorizontal, X,
  Phone, Mail, Globe, FileText, Pencil, Trash2,
  UserPlus, Download, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useGuests, useDeleteGuest } from "@/hooks/useGuests";
import { useAllReservations } from "@/hooks/useReservations";
import { useProperty } from "@/contexts/PropertyContext";
import { GuestFormDialog } from "./GuestFormDialog";
import type { Guest, Reservation } from "@/types/database";

// ── helpers ──────────────────────────────────────────────────────────────────
function normName(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-DO", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(n);
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

// ── stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, accent: _accent }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; accent: string;
}) {
  // Map gradient colors to solid color classes for header
  const headerCls = color.includes("from-[#0F2B4C]") ? "bg-[#0F2B4C]"
    : color.includes("from-[#1E5F99]") || color.includes("blue") ? "bg-[#2D6A9F]"
    : color.includes("emerald") || color.includes("green") ? "bg-emerald-600"
    : color.includes("violet") || color.includes("purple") ? "bg-violet-600"
    : color.includes("amber") || color.includes("orange") ? "bg-amber-600"
    : color.includes("red") ? "bg-red-600"
    : color.includes("teal") ? "bg-teal-600"
    : "bg-[#0F2B4C]";
  const valCls = headerCls.replace("bg-", "text-").replace("600", "700");
  return (
    <div className="rounded-xl overflow-hidden shadow-sm border border-black/[0.08]">
      <div className={`${headerCls} px-4 py-2.5 flex items-center justify-between`}>
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/75">{label}</span>
        <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
          <Icon size={15} strokeWidth={2} className="text-white" />
        </div>
      </div>
      <div className="bg-white px-4 pt-3 pb-3">
        <p className={`text-xl font-serif font-bold truncate ${valCls}`}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ── platform badge ────────────────────────────────────────────────────────────
const PLAT_COLORS: Record<string, string> = {
  Airbnb:  "bg-rose-100 text-rose-700",
  Booking: "bg-blue-100 text-blue-700",
  Directo: "bg-emerald-100 text-emerald-700",
  Vrbo:    "bg-orange-100 text-orange-700",
  Expedia: "bg-yellow-100 text-yellow-700",
};
function PlatBadge({ p }: { p: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${PLAT_COLORS[p] ?? "bg-slate-100 text-slate-600"}`}>{p}</span>;
}

// ── CSV export ────────────────────────────────────────────────────────────────
function downloadCSV(guests: Guest[], guestStats: Map<string, any>) {
  const headers = [
    "Nombre","Email","Teléfono","Nacionalidad","Tipo Doc.","Nº Documento",
    "Etiquetas","Notas","Reservas","Noches totales","Ingresos totales (USD)","Última estadía","Registrado",
  ];
  const rows = guests.map((g) => {
    const s = guestStats.get(g.id);
    return [
      g.name, g.email ?? "", g.phone ?? "",
      g.nationality ?? "", g.document_type ?? "", g.document_number ?? "",
      (g.tags ?? []).join("; "), g.notes ?? "",
      s?.reservations?.length ?? 0,
      s?.totalNights ?? 0,
      (s?.totalGross ?? 0).toFixed(2),
      s?.lastStay ? fmtDate(s.lastStay) : "",
      new Date(g.created_at).toLocaleDateString("es-DO"),
    ];
  });
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `huespedes_${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ── types ─────────────────────────────────────────────────────────────────────
interface UnregGuest {
  guestName: string;
  reservations: Reservation[];
  totalNights: number;
  totalGross: number;
  lastStay: string | null;
  favPlatform: string | null;
  email: string | null;
  phone: string | null;
}

// ── main ──────────────────────────────────────────────────────────────────────
export function AdminHuespedes() {
  const { selectedPropertyId, properties } = useProperty();
  const { data: guests     = [], isLoading: gLoading } = useGuests();
  const { data: allRes     = [], isLoading: rLoading } = useAllReservations(selectedPropertyId);
  const deleteGuest = useDeleteGuest();

  // Build property name map for quick lookup
  const propNameMap = useMemo(
    () => new Map(properties.map((p) => [p.id, p.name])),
    [properties]
  );

  const [tab, setTab]               = useState<"registered" | "from_res">("registered");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGuest,  setEditGuest]  = useState<Guest | null>(null);
  const [prefill,    setPrefill]    = useState<{ name?: string; email?: string; phone?: string } | undefined>();
  const [confirmDel, setConfirmDel] = useState<Guest | null>(null);
  const [search,     setSearch]     = useState("");
  const [filterNat,  setFilterNat]  = useState("");
  const [filterHas,  setFilterHas]  = useState<"all"|"yes"|"no">("all");
  const [filterTag,  setFilterTag]  = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [resSearch,  setResSearch]  = useState("");

  // ── aggregate stats for registered guests ───────────────────────────────
  const guestStats = useMemo(() => {
    const map = new Map<string, {
      reservations: Reservation[]; totalNights: number;
      totalGross: number; lastStay: string | null; favPlatform: string | null;
    }>();
    for (const g of guests) {
      const key = normName(g.name);
      const res = (allRes as Reservation[]).filter((r) => normName(r.guest_name) === key);
      const totalNights = res.reduce((s, r) => s + r.nights, 0);
      const totalGross  = res.reduce((s, r) => s + r.gross_amount, 0);
      const sorted = [...res].sort((a, b) => b.checkin.localeCompare(a.checkin));
      const lastStay = sorted[0]?.checkin ?? null;
      const platCount = res.reduce<Record<string,number>>((acc, r) => { acc[r.platform] = (acc[r.platform]??0)+1; return acc; }, {});
      const favPlatform = Object.entries(platCount).sort((a, b) => b[1]-a[1])[0]?.[0] ?? null;
      map.set(g.id, { reservations: res, totalNights, totalGross, lastStay, favPlatform });
    }
    return map;
  }, [guests, allRes]);

  // ── guests from reservations NOT yet in guests table ────────────────────
  const unregGuests = useMemo<UnregGuest[]>(() => {
    const regNames = new Set(guests.map((g) => normName(g.name)));
    const nameMap  = new Map<string, UnregGuest>();
    for (const r of allRes as Reservation[]) {
      const key = normName(r.guest_name);
      if (regNames.has(key)) continue;
      if (!nameMap.has(key)) {
        nameMap.set(key, {
          guestName: r.guest_name, reservations: [],
          totalNights: 0, totalGross: 0, lastStay: null, favPlatform: null,
          email: r.guest_email ?? null, phone: r.guest_phone ?? null,
        });
      }
      const e = nameMap.get(key)!;
      e.reservations.push(r);
      e.totalNights += r.nights;
      e.totalGross  += r.gross_amount;
      if (!e.lastStay || r.checkin > e.lastStay) e.lastStay = r.checkin;
      if (!e.email && r.guest_email) e.email = r.guest_email;
      if (!e.phone && r.guest_phone) e.phone = r.guest_phone;
    }
    // compute fav platform
    for (const e of nameMap.values()) {
      const pc = e.reservations.reduce<Record<string,number>>((acc, r) => { acc[r.platform]=(acc[r.platform]??0)+1; return acc; }, {});
      e.favPlatform = Object.entries(pc).sort((a,b) => b[1]-a[1])[0]?.[0] ?? null;
    }
    return [...nameMap.values()].sort((a, b) => {
      if (!a.lastStay) return 1;
      if (!b.lastStay) return -1;
      return b.lastStay.localeCompare(a.lastStay);
    });
  }, [guests, allRes]);

  // ── summary numbers ──────────────────────────────────────────────────────
  const totalRegistered = guests.length;
  const totalFromRes    = unregGuests.length;
  const guestsWithRes   = guests.filter((g) => (guestStats.get(g.id)?.reservations.length ?? 0) > 0).length;
  const allResCount     = guests.reduce((s, g) => s + (guestStats.get(g.id)?.reservations.length ?? 0), 0) + unregGuests.reduce((s, u) => s + u.reservations.length, 0);
  const allNights       = guests.reduce((s, g) => s + (guestStats.get(g.id)?.totalNights ?? 0), 0) + unregGuests.reduce((s, u) => s + u.totalNights, 0);
  const avgNights       = allResCount > 0 ? Math.round(allNights / allResCount) : 0;

  // ── unique filter values ─────────────────────────────────────────────────
  const allNats = useMemo(() => { const s = new Set<string>(); guests.forEach((g) => g.nationality && s.add(g.nationality)); return [...s].sort(); }, [guests]);
  const allTags = useMemo(() => { const s = new Set<string>(); guests.forEach((g) => g.tags?.forEach((t) => s.add(t))); return [...s].sort(); }, [guests]);
  const activeF = (filterNat ? 1 : 0) + (filterHas !== "all" ? 1 : 0) + (filterTag ? 1 : 0);

  // ── filtered registered guests ───────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return guests.filter((g) => {
      if (q && !g.name.toLowerCase().includes(q) &&
          !(g.email??"").toLowerCase().includes(q) &&
          !(g.phone??"").toLowerCase().includes(q) &&
          !(g.nationality??"").toLowerCase().includes(q)) return false;
      if (filterNat && g.nationality !== filterNat) return false;
      if (filterTag && !(g.tags??[]).includes(filterTag)) return false;
      if (filterHas === "yes" && (guestStats.get(g.id)?.reservations.length ?? 0) === 0) return false;
      if (filterHas === "no"  && (guestStats.get(g.id)?.reservations.length ?? 0) > 0)  return false;
      return true;
    });
  }, [guests, search, filterNat, filterTag, filterHas, guestStats]);

  // ── filtered unregistered ────────────────────────────────────────────────
  const filteredUnreg = useMemo(() => {
    const q = resSearch.toLowerCase();
    if (!q) return unregGuests;
    return unregGuests.filter((u) =>
      u.guestName.toLowerCase().includes(q) ||
      (u.email??"").toLowerCase().includes(q) ||
      (u.phone??"").toLowerCase().includes(q)
    );
  }, [unregGuests, resSearch]);

  // ── actions ──────────────────────────────────────────────────────────────
  function openNew() { setEditGuest(null); setPrefill(undefined); setDialogOpen(true); }
  function openEdit(g: Guest) { setEditGuest(g); setPrefill(undefined); setDialogOpen(true); }
  function openImport(u: UnregGuest) {
    setEditGuest(null);
    setPrefill({ name: u.guestName, email: u.email ?? undefined, phone: u.phone ?? undefined });
    setDialogOpen(true);
  }

  async function handleDelete(g: Guest) {
    try {
      await deleteGuest.mutateAsync(g.id);
      toast({ title: "Huésped eliminado" });
      setConfirmDel(null);
    } catch (err: any) {
      toast({ title: "Error al eliminar", description: err.message, variant: "destructive" });
    }
  }

  const isLoading = gLoading || rLoading;

  // ── table col grid ────────────────────────────────────────────────────────
  const regCols  = "grid-cols-1 lg:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto]";
  const unregCols = "grid-cols-1 lg:grid-cols-[2fr_1.5fr_1fr_1fr_auto]";

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8] text-sm">
    <div className="max-w-screen-2xl w-full mx-auto">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#0F2B4C]">Huéspedes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Base de datos de clientes</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-white/80 border-white shadow-sm"
            onClick={() => downloadCSV(guests, guestStats)}
            disabled={guests.length === 0}
          >
            <Download size={13} />
            Exportar CSV
          </Button>
          <Button
            onClick={openNew}
            className="bg-[#0F2B4C] hover:bg-[#0F2B4C]/90 text-white gap-2"
          >
            <Plus size={15} />
            Nuevo huésped
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="px-6 grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <StatCard label="Total registrados" value={totalRegistered}
          sub={`+${totalFromRes} en reservas sin registrar`}
          icon={Users} color="bg-[#0F2B4C]" accent="bg-[#F0A030]" />
        <StatCard label="Con reservas" value={guestsWithRes}
          sub={`${totalRegistered > 0 ? Math.round(guestsWithRes/totalRegistered*100) : 0}% del total registrado`}
          icon={UserCheck} color="bg-[#2D6A9F]" accent="bg-[#F0A030]" />
        <StatCard label="Reservas totales" value={allResCount}
          sub="entre registrados y pendientes"
          icon={CalendarDays} color="bg-teal-700" accent="bg-teal-400" />
        <StatCard label="Promedio estadía" value={`${avgNights} noche${avgNights!==1?"s":""}`}
          sub="por reserva (todos los huéspedes)"
          icon={TrendingUp} color="bg-violet-700" accent="bg-violet-400" />
      </div>

      {/* Tabs */}
      <div className="px-6 mb-4">
        <div className="flex gap-1 bg-white/60 rounded-xl p-1 w-fit shadow-sm border border-white">
          <button
            onClick={() => setTab("registered")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              tab === "registered"
                ? "bg-[#0F2B4C] text-white shadow-sm"
                : "text-muted-foreground hover:text-[#0F2B4C]"
            }`}
          >
            <Users size={13} />
            Registrados
            <span className={`px-1.5 py-0 rounded-full text-[10px] font-bold ${tab==="registered" ? "bg-white/20 text-white" : "bg-[#0F2B4C]/10 text-[#0F2B4C]"}`}>
              {totalRegistered}
            </span>
          </button>
          <button
            onClick={() => setTab("from_res")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              tab === "from_res"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-muted-foreground hover:text-amber-600"
            }`}
          >
            <UserPlus size={13} />
            Desde reservas
            {totalFromRes > 0 && (
              <span className={`px-1.5 py-0 rounded-full text-[10px] font-bold ${tab==="from_res" ? "bg-white/20 text-white" : "bg-amber-500/15 text-amber-600"}`}>
                {totalFromRes}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── TAB: Registered ── */}
      {tab === "registered" && (
        <>
          {/* Search + filter bar */}
          <div className="px-6 mb-3 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8 bg-white/80 border-white shadow-sm h-9 text-sm"
                placeholder="Buscar por nombre, email, teléfono…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              )}
            </div>
            <Button
              variant={filterOpen ? "default" : "outline"} size="sm"
              className={`gap-2 h-9 shadow-sm ${filterOpen ? "bg-[#0F2B4C] text-white border-[#0F2B4C]" : "bg-white/80 border-white"}`}
              onClick={() => setFilterOpen((v) => !v)}
            >
              <SlidersHorizontal size={13} />
              Filtros
              {activeF > 0 && (
                <span className="ml-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-[#F0A030] text-[#0F2B4C] text-[10px] font-bold">{activeF}</span>
              )}
            </Button>
            {activeF > 0 && (
              <button onClick={() => { setFilterNat(""); setFilterHas("all"); setFilterTag(""); }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <X size={11} /> Limpiar
              </button>
            )}
          </div>

          {/* Filter panel */}
          {filterOpen && (
            <div className="mx-6 mb-4 p-4 bg-white/80 rounded-xl border border-white shadow-sm space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Reservas</p>
                <div className="flex gap-1.5 flex-wrap">
                  {([["all","Todos"],["yes","Con reservas"],["no","Sin reservas"]] as const).map(([v,l]) => (
                    <button key={v} onClick={() => setFilterHas(v)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${filterHas===v ? "bg-[#0F2B4C] text-white border-[#0F2B4C]" : "bg-white text-muted-foreground border-border hover:border-[#2D6A9F] hover:text-[#2D6A9F]"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {allNats.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Nacionalidad</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {["", ...allNats].map((n) => (
                      <button key={n||"_all"} onClick={() => setFilterNat(n)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${filterNat===n ? (n ? "bg-[#2D6A9F] text-white border-[#2D6A9F]" : "bg-[#0F2B4C] text-white border-[#0F2B4C]") : "bg-white text-muted-foreground border-border hover:border-[#2D6A9F] hover:text-[#2D6A9F]"}`}>
                        {n || "Todas"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {allTags.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Etiquetas</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {["", ...allTags].map((t) => (
                      <button key={t||"_all"} onClick={() => setFilterTag(t)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${filterTag===t ? (t ? "bg-amber-500 text-white border-amber-500" : "bg-[#0F2B4C] text-white border-[#0F2B4C]") : "bg-white text-muted-foreground border-border hover:border-amber-400 hover:text-amber-600"}`}>
                        {t || "Todas"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Table */}
          <div className="flex-1 px-6 pb-6 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Cargando…</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                <Users size={32} className="opacity-25" />
                <p className="text-sm">{guests.length === 0 ? "Aún no hay huéspedes registrados. ¡Agrega el primero!" : "Ningún huésped coincide con los filtros."}</p>
                {guests.length === 0 && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={openNew} className="bg-[#0F2B4C] hover:bg-[#0F2B4C]/90 text-white">
                      <Plus size={13} className="mr-1" /> Nuevo huésped
                    </Button>
                    {totalFromRes > 0 && (
                      <Button size="sm" variant="outline" onClick={() => setTab("from_res")} className="gap-1">
                        <ChevronRight size={13} /> Ver desde reservas ({totalFromRes})
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/80 rounded-xl border border-white shadow-sm overflow-hidden">
                <div className={`hidden lg:grid ${regCols} gap-4 px-4 py-2.5 bg-[#0F2B4C]/5 border-b border-border`}>
                  {["Huésped","Contacto / Propiedades","Documento","Reservas","Última estadía",""].map((h) => (
                    <span key={h} className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{h}</span>
                  ))}
                </div>
                <div className="divide-y divide-border/60">
                  {filtered.map((g) => {
                    const s = guestStats.get(g.id);
                    const resCount = s?.reservations.length ?? 0;
                    return (
                      <div key={g.id} className={`grid ${regCols} gap-4 px-4 py-3 items-center hover:bg-[#2D6A9F]/5 transition-colors group`}>
                        {/* Huésped */}
                        <div className="min-w-0 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#0F2B4C]/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-[#0F2B4C]">{initials(g.name)}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#0F2B4C] truncate">{g.name}</p>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              {g.nationality && <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Globe size={9}/> {g.nationality}</span>}
                              {(g.tags??[]).map((t) => (
                                <span key={t} className="px-1.5 rounded-full text-[9px] bg-[#F0A030]/20 text-[#0F2B4C] font-semibold">{t}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                        {/* Contacto + Propiedades + Asociados */}
                        <div className="space-y-1 min-w-0">
                          {g.email && <p className="flex items-center gap-1 text-xs text-muted-foreground truncate"><Mail size={10} className="shrink-0"/> {g.email}</p>}
                          {g.phone && <p className="flex items-center gap-1 text-xs text-muted-foreground truncate"><Phone size={10} className="shrink-0"/> {g.phone}</p>}
                          {!g.email && !g.phone && <span className="text-xs text-muted-foreground/50 italic">Sin contacto</span>}
                          {/* Properties from reservation history */}
                          {(() => {
                            const fromRes = [...new Set((guestStats.get(g.id)?.reservations ?? []).map((r: any) => r.property_id))];
                            const manual  = (g.property_ids ?? []);
                            const allIds  = [...new Set([...fromRes, ...manual])];
                            return allIds.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {allIds.map((pid) => {
                                  const name = propNameMap.get(pid as string);
                                  return name ? (
                                    <span key={pid as string} className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[9px] font-semibold bg-[#0F2B4C]/8 text-[#0F2B4C] border border-[#0F2B4C]/15">
                                      🏠 {name}
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            ) : null;
                          })()}
                          {/* Related guests */}
                          {(g.related_guest_ids ?? []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {(g.related_guest_ids ?? []).map((rid) => {
                                const rel = guests.find((x) => x.id === rid);
                                return rel ? (
                                  <span key={rid} className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[9px] font-medium bg-violet-100 text-violet-700">
                                    👥 {rel.name.split(" ")[0]}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                        {/* Documento */}
                        <div>
                          {g.document_type || g.document_number ? (
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              <FileText size={10} className="shrink-0"/>
                              {g.document_type && <span className="font-medium">{g.document_type} </span>}{g.document_number}
                            </p>
                          ) : <span className="text-xs text-muted-foreground/50 italic">—</span>}
                        </div>
                        {/* Reservas */}
                        <div>
                          {resCount > 0 ? (
                            <div className="space-y-0.5">
                              <p className="text-sm font-bold text-[#0F2B4C]">{resCount} <span className="text-xs font-normal text-muted-foreground">reserva{resCount!==1?"s":""}</span></p>
                              <p className="text-[10px] text-muted-foreground">{s!.totalNights} noches</p>
                              {s!.favPlatform && <PlatBadge p={s!.favPlatform}/>}
                            </div>
                          ) : <span className="text-xs text-muted-foreground/50 italic">Sin reservas</span>}
                        </div>
                        {/* Última estadía */}
                        <div>
                          {s?.lastStay ? (
                            <div className="space-y-0.5">
                              <p className="text-xs font-medium">{fmtDate(s.lastStay)}</p>
                              {(s.totalGross??0)>0 && <p className="text-[10px] text-muted-foreground">{fmtCurrency(s.totalGross)} total</p>}
                            </div>
                          ) : <span className="text-xs text-muted-foreground/50 italic">—</span>}
                        </div>
                        {/* Acciones — always visible on mobile, hover on desktop */}
                        <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(g)} className="p-2 lg:p-1.5 rounded-lg hover:bg-[#2D6A9F]/10 text-[#2D6A9F] transition-colors" title="Editar"><Pencil size={15} className="lg:w-[13px] lg:h-[13px]"/></button>
                          <button onClick={() => setConfirmDel(g)} className="p-2 lg:p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors" title="Eliminar"><Trash2 size={15} className="lg:w-[13px] lg:h-[13px]"/></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="px-4 py-2 border-t border-border/60 bg-muted/20">
                  <p className="text-[11px] text-muted-foreground">{filtered.length} de {guests.length} huésped{guests.length!==1?"es":""}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TAB: Desde reservas ── */}
      {tab === "from_res" && (
        <>
          <div className="px-6 mb-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <UserPlus size={16} className="text-amber-600 shrink-0 mt-0.5"/>
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {totalFromRes} cliente{totalFromRes!==1?"s":""} encontrado{totalFromRes!==1?"s":""} en las reservas sin perfil completo
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Haz clic en <strong>Registrar</strong> para añadir su información completa a la base de datos.
                  El email y teléfono capturados en la reserva se pre-llenan automáticamente.
                </p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="px-6 mb-3">
            <div className="relative max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <Input
                className="pl-8 bg-white/80 border-white shadow-sm h-9 text-sm"
                placeholder="Buscar por nombre, email…"
                value={resSearch}
                onChange={(e) => setResSearch(e.target.value)}
              />
              {resSearch && (
                <button onClick={() => setResSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={13}/></button>
              )}
            </div>
          </div>

          <div className="flex-1 px-6 pb-6 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Cargando…</div>
            ) : filteredUnreg.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                <UserCheck size={32} className="opacity-25"/>
                <p className="text-sm">
                  {unregGuests.length === 0
                    ? "¡Todos los clientes de las reservas ya están registrados!"
                    : "Ninguno coincide con la búsqueda."}
                </p>
              </div>
            ) : (
              <div className="bg-white/80 rounded-xl border border-white shadow-sm overflow-hidden">
                <div className={`hidden lg:grid ${unregCols} gap-4 px-4 py-2.5 bg-amber-50/80 border-b border-amber-100`}>
                  {["Nombre en reservas","Contacto","Reservas","Última estadía",""].map((h) => (
                    <span key={h} className="text-[10px] font-semibold uppercase tracking-widest text-amber-700/70">{h}</span>
                  ))}
                </div>
                <div className="divide-y divide-border/60">
                  {filteredUnreg.map((u) => (
                    <div key={u.guestName} className={`grid ${unregCols} gap-4 px-4 py-3 items-center hover:bg-amber-50/50 transition-colors group`}>
                      {/* Nombre */}
                      <div className="min-w-0 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-amber-700">{initials(u.guestName)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#0F2B4C] truncate">{u.guestName}</p>
                          <p className="text-[10px] text-amber-600 font-medium mt-0.5">Sin perfil completo</p>
                        </div>
                      </div>
                      {/* Contacto */}
                      <div className="space-y-0.5 min-w-0">
                        {u.email && <p className="flex items-center gap-1 text-xs text-muted-foreground truncate"><Mail size={10} className="shrink-0"/> {u.email}</p>}
                        {u.phone && <p className="flex items-center gap-1 text-xs text-muted-foreground truncate"><Phone size={10} className="shrink-0"/> {u.phone}</p>}
                        {!u.email && !u.phone && <span className="text-xs text-muted-foreground/50 italic">No capturado</span>}
                      </div>
                      {/* Reservas */}
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-[#0F2B4C]">{u.reservations.length} <span className="text-xs font-normal text-muted-foreground">reserva{u.reservations.length!==1?"s":""}</span></p>
                        <p className="text-[10px] text-muted-foreground">{u.totalNights} noches · {fmtCurrency(u.totalGross)}</p>
                        {u.favPlatform && <PlatBadge p={u.favPlatform}/>}
                      </div>
                      {/* Última estadía */}
                      <div>
                        {u.lastStay
                          ? <p className="text-xs font-medium">{fmtDate(u.lastStay)}</p>
                          : <span className="text-xs text-muted-foreground/50 italic">—</span>}
                      </div>
                      {/* Registrar */}
                      <div>
                        <Button
                          size="sm"
                          className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5 text-xs h-8 opacity-70 group-hover:opacity-100 transition-opacity"
                          onClick={() => openImport(u)}
                        >
                          <UserPlus size={12}/>
                          Registrar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-border/60 bg-amber-50/30">
                  <p className="text-[11px] text-muted-foreground">{filteredUnreg.length} de {unregGuests.length} pendiente{unregGuests.length!==1?"s":""}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Delete confirmation */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-500"/>
              </div>
              <div>
                <h3 className="font-semibold text-[#0F2B4C]">Eliminar huésped</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  ¿Eliminar a <span className="font-medium">{confirmDel.name}</span>? Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setConfirmDel(null)}>Cancelar</Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleDelete(confirmDel)} disabled={deleteGuest.isPending}>
                {deleteGuest.isPending ? "Eliminando…" : "Sí, eliminar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Form dialog */}
      <GuestFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditGuest(null); setPrefill(undefined); }}
        guest={editGuest}
        prefill={prefill}
      />
    </div>
    </div>
  );
}
