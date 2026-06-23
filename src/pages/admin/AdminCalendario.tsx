import { useState, useEffect, useCallback } from "react";
import {
  Plus, ChevronLeft, ChevronRight, SlidersHorizontal,
  Moon, BookOpen, Wallet, DollarSign, CalendarDays, TrendingUp, X, Download,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";
import { useProperty } from "@/contexts/PropertyContext";
import {
  useReservations,
  useCreateReservation,
  useUpdateReservation,
} from "@/hooks/useReservations";
import { useBrackets, getActiveBracket, resolveBracketsForProperty } from "@/hooks/useBrackets";
import { usePlatformConfigs } from "@/hooks/usePlatformConfigs";
import { useMaintenanceTickets } from "@/hooks/useMaintenance";
import { ReservationFormDialog } from "./ReservationFormDialog";
import type { Reservation } from "@/types/database";

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const DAYS_SHORT = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

// ── Status bar colors ─────────────────────────────────────────────────────────
const STATUS_BAR = {
  Pendiente:  { bg: "bg-[#2D6A9F]",  text: "text-white",     border: "border-[#1d5a8a]"   },
  Confirmada: { bg: "bg-sky-500",     text: "text-white",     border: "border-sky-600"     },
  Completada: { bg: "bg-emerald-600", text: "text-white",     border: "border-emerald-700" },
  Cancelada:  { bg: "bg-slate-300",   text: "text-slate-500", border: "border-slate-400"   },
};
function getBarStyle(r: Reservation) {
  return STATUS_BAR[r.status as keyof typeof STATUS_BAR] ?? STATUS_BAR.Pendiente;
}

/** Opacity class for a reservation bar based on status + whether it's in the past */
function barOpacityCls(r: Reservation, todayStr: string): string {
  const isPast = r.checkout < todayStr; // all nights already passed
  if (r.status === "Cancelada") return isPast ? "opacity-20" : "opacity-35";
  return isPast ? "opacity-40" : "";
}

// ── Platform mini-logo ────────────────────────────────────────────────────────
const PLATFORM_DOMAINS: Record<string, string> = {
  "Airbnb":      "airbnb.com",
  "Booking.com": "booking.com",
  "VRBO":        "vrbo.com",
  "Expedia":     "expedia.com",
  "HomeAway":    "homeaway.com",
  "Trivago":     "trivago.com",
};
function PlatformMiniLogo({ platform }: { platform: string }) {
  const key = platform.trim();
  if (key.toLowerCase() === "directo" || key.toLowerCase() === "direct") {
    return (
      <span className="inline-flex items-center justify-center w-[13px] h-[13px] rounded-[2px] bg-white/20 shrink-0">
        <svg width="9" height="8" viewBox="0 0 52 44" fill="none" aria-hidden="true">
          <path d="M 5 30 A 21 21 0 0 1 47 30" stroke="#F0A030" strokeWidth="4" fill="none" strokeLinecap="round"/>
          <path d="M 11 30 A 15 15 0 0 1 41 30 Z" fill="#F0A030"/>
          <line x1="2" y1="30" x2="50" y2="30" stroke="white" strokeWidth="5" strokeLinecap="round"/>
        </svg>
      </span>
    );
  }
  const domain = PLATFORM_DOMAINS[key];
  if (domain) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
        alt={key}
        className="w-[13px] h-[13px] rounded-[2px] shrink-0 object-contain"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-[13px] h-[13px] rounded-[2px] bg-white/25 text-[8px] font-bold shrink-0">
      {key.charAt(0).toUpperCase()}
    </span>
  );
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month - 1, 1);
  const firstDow = (firstDay.getDay() + 6) % 7;
  const days: Date[] = [];
  for (let i = firstDow - 1; i >= 0; i--) {
    const d = new Date(firstDay); d.setDate(d.getDate() - (i + 1)); days.push(d);
  }
  const lastDate = new Date(year, month, 0).getDate();
  for (let d = 1; d <= lastDate; d++) days.push(new Date(year, month - 1, d));
  while (days.length < 42) {
    const last = days[days.length - 1];
    const next = new Date(last); next.setDate(next.getDate() + 1); days.push(next);
  }
  return days;
}

// ── Calendar segment ──────────────────────────────────────────────────────────
interface CalSeg {
  reservation: Reservation;
  colStart: number; colEnd: number;
  isStart: boolean; isEnd: boolean;
  slot: number;
}
function getWeekSegments(weekDays: Date[], reservations: Reservation[]): CalSeg[] {
  const wStartStr = toDateStr(weekDays[0]);
  const wEndStr   = toDateStr(weekDays[6]);
  const raw: Omit<CalSeg, "slot">[] = [];
  for (const r of reservations) {
    if (r.checkin > wEndStr || r.checkout < wStartStr) continue;
    const segStart = r.checkin  < wStartStr ? wStartStr : r.checkin;
    const segEnd   = r.checkout > wEndStr   ? wEndStr   : r.checkout;
    const colStart = weekDays.findIndex((d) => toDateStr(d) === segStart);
    const colEnd   = weekDays.findIndex((d) => toDateStr(d) === segEnd);
    raw.push({
      reservation: r,
      colStart: colStart === -1 ? 0 : colStart,
      colEnd:   colEnd   === -1 ? 6 : colEnd,
      isStart: r.checkin  >= wStartStr,
      isEnd:   r.checkout <= wEndStr,
    });
  }
  raw.sort((a, b) => a.colStart - b.colStart);
  const slotEnds: number[] = [];
  return raw.map((seg) => {
    let slot = 0;
    while (slotEnds[slot] !== undefined && seg.colStart <= slotEnds[slot]) slot++;
    slotEnds[slot] = seg.colEnd;
    return { ...seg, slot };
  });
}

// ── Single-month calendar grid ────────────────────────────────────────────────
interface MonthGridProps {
  year: number; month: number;
  reservations: Reservation[];
  todayStr: string;
  dragStart: string | null;
  dragEnd:   string | null;
  isDragging: boolean;
  onDayMouseDown:  (dateStr: string) => void;
  onDayMouseEnter: (dateStr: string) => void;
  onReservationClick: (r: Reservation) => void;
}
function MonthCalendarGrid({
  year, month, reservations, todayStr,
  dragStart, dragEnd, isDragging,
  onDayMouseDown, onDayMouseEnter, onReservationClick,
}: MonthGridProps) {
  const calDays = getCalendarDays(year, month);
  const weeks: Date[][] = [];
  for (let i = 0; i < 42; i += 7) weeks.push(calDays.slice(i, i + 7));
  const BAR_H = 22, BAR_GAP = 3;

  // Normalise drag range for comparison
  const selMin = dragStart && dragEnd ? (dragStart <= dragEnd ? dragStart : dragEnd) : null;
  const selMax = dragStart && dragEnd ? (dragStart >= dragEnd ? dragStart : dragEnd) : null;

  return (
    <div className="flex flex-col select-none">
      {/* Month title */}
      <div className="px-4 py-2.5 text-center bg-[#0F2B4C]/[0.04] border-b border-slate-100">
        <span className="text-sm font-bold tracking-wide text-[#0F2B4C]">
          {MONTHS_ES[month - 1]} {year}
        </span>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-white">
        {DAYS_SHORT.map((d, di) => (
          <div key={d} className={`py-2 text-center text-[9px] font-bold uppercase tracking-wider
            border-r border-slate-100 last:border-r-0
            ${di >= 5 ? "text-[#F0A030]" : "text-slate-400"}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((weekDays, wi) => {
        const segments = getWeekSegments(weekDays, reservations);
        const maxSlot  = segments.reduce((m, s) => Math.max(m, s.slot), -1);
        const eventsH  = maxSlot >= 0 ? (maxSlot + 1) * (BAR_H + BAR_GAP) + BAR_GAP : 4;

        return (
          <div key={wi} className="border-b border-slate-100 last:border-0">
            {/* Day cells */}
            <div className="grid grid-cols-7">
              {weekDays.map((day) => {
                const dayStr    = toDateStr(day);
                const isToday   = dayStr === todayStr;
                const isCurMo   = day.getMonth() + 1 === month && day.getFullYear() === year;
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const checkins  = reservations.filter(
                  (r) => r.checkin === dayStr && r.status !== "Cancelada"
                ).length;

                // Drag range highlight
                const inSel      = !!(selMin && selMax && dayStr >= selMin && dayStr <= selMax);
                const isSelStart = !!(selMin && dayStr === selMin);
                const isSelEnd   = !!(selMax && dayStr === selMax);

                return (
                  <div
                    key={dayStr}
                    onMouseDown={(e) => { e.preventDefault(); if (isCurMo) onDayMouseDown(dayStr); }}
                    onMouseEnter={() => { if (isDragging && isCurMo) onDayMouseEnter(dayStr); }}
                    className={`group relative flex items-start justify-between px-1.5 pt-1.5 pb-1
                      min-h-[42px] transition-colors
                      border-r border-slate-100 last:border-r-0
                      ${isCurMo ? "cursor-crosshair" : "cursor-default"}
                      ${inSel
                        ? "bg-[#2D6A9F]/10"
                        : isWeekend && isCurMo
                          ? "bg-amber-50/80 hover:bg-amber-100/60"
                          : isCurMo
                            ? "bg-white hover:bg-[#2D6A9F]/[0.04]"
                            : "bg-slate-50/50"
                      }
                    `}
                  >
                    {/* Selection endpoint indicators */}
                    {(isSelStart || isSelEnd) && isCurMo && (
                      <span className="absolute inset-0 bg-[#2D6A9F]/15 pointer-events-none" />
                    )}

                    {/* Day number */}
                    <span className={`relative inline-flex items-center justify-center w-6 h-6 rounded-full
                      text-xs font-semibold z-10
                      ${isToday
                        ? "bg-[#F0A030] text-white shadow-sm"
                        : (isSelStart || isSelEnd) && isCurMo
                          ? "bg-[#2D6A9F] text-white"
                          : isCurMo
                            ? isWeekend ? "text-amber-700 font-bold" : "text-[#0F2B4C]"
                            : "text-slate-300"
                      }
                    `}>
                      {day.getDate()}
                    </span>

                    {/* Right badge: check-ins or drag hint */}
                    {checkins > 0 ? (
                      <span className="relative z-10 inline-flex items-center justify-center w-4 h-4
                        rounded-full bg-emerald-500 text-white text-[9px] font-bold shadow-sm mt-0.5">
                        {checkins}
                      </span>
                    ) : isCurMo && !isDragging ? (
                      <span className="mt-0.5 text-sm font-bold text-[#2D6A9F]
                        opacity-0 group-hover:opacity-30 transition-opacity select-none z-10">
                        +
                      </span>
                    ) : null}

                    {/* Drag range: show night count above the cell */}
                    {inSel && isSelEnd && selMin && selMax && selMin !== selMax && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 z-20
                        bg-[#0F2B4C] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
                        {Math.round((new Date(selMax).getTime() - new Date(selMin).getTime()) / 86400000)}n
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Reservation bars */}
            <div className="relative bg-white" style={{ height: eventsH }}>
              {segments.map((seg, si) => {
                const r     = seg.reservation;
                const style = getBarStyle(r);
                const opCls = barOpacityCls(r, todayStr);
                const top   = seg.slot * (BAR_H + BAR_GAP) + BAR_GAP;
                const colW  = 100 / 7;

                return (
                  <div
                    key={`${r.id}-${si}`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onReservationClick(r); }}
                    title={`${r.guest_name} · ${r.checkin} → ${r.checkout} · ${r.nights}n · ${r.platform}${r.checkout < todayStr ? " · Pasada" : ""}`}
                    className={`absolute flex items-center gap-1.5 border overflow-hidden
                      cursor-pointer hover:brightness-110 active:brightness-90 transition-all
                      ${style.bg} ${style.text} ${style.border} ${opCls}
                      ${seg.isStart ? "rounded-l-full pl-2" : "border-l-0"}
                      ${seg.isEnd   ? "rounded-r-full pr-2" : "border-r-0"}
                    `}
                    style={{
                      left:   `calc(${seg.colStart * colW}% + ${seg.isStart ? 3 : 0}px)`,
                      width:  `calc(${(seg.colEnd - seg.colStart + 1) * colW}% - ${(seg.isStart ? 3 : 0) + (seg.isEnd ? 3 : 0)}px)`,
                      top:    `${top}px`,
                      height: `${BAR_H}px`,
                      fontSize: "10px",
                      fontWeight: 500,
                      lineHeight: "1",
                    }}
                  >
                    {seg.isStart && (
                      <>
                        <PlatformMiniLogo platform={r.platform} />
                        <span className="truncate leading-none">{r.guest_name}</span>
                        <span className="ml-auto shrink-0 flex items-center gap-0.5 opacity-80 pr-0.5">
                          <span className="text-[9px]">{r.nights}n</span>
                          {r.status === "Completada" && <span className="text-[9px]">✓</span>}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── CSV Export ───────────────────────────────────────────────────────────────
const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function exportCalendarCSV(left: Reservation[], right: Reservation[], propName: string, monthL: number, monthR: number, year: number) {
  const all = [...left, ...right].sort((a, b) => a.checkin.localeCompare(b.checkin));
  const headers = [
    "Huésped","Check-in","Check-out","Noches","Plataforma","Moneda",
    "Bruto","Neto","Propietario USD","CE USD","Propietario RD$","Estado",
  ];
  const rows = all.map((r) => [
    r.guest_name, r.checkin, r.checkout, r.nights, r.platform, r.currency,
    r.gross_amount, r.net_amount, r.owner_amount, r.ce_amount, r.owner_rds, r.status,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `calendario_${propName}_${MONTHS_SHORT[monthL-1]}-${MONTHS_SHORT[monthR-1]}${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AdminCalendario() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [resFormOpen,      setResFormOpen]      = useState(false);
  const [editingRes,       setEditingRes]        = useState<Reservation | null>(null);
  const [prefillDate,      setPrefillDate]       = useState("");
  const [prefillCheckout,  setPrefillCheckout]   = useState("");
  const [formMonth,        setFormMonth]         = useState(month);
  const [formYear,         setFormYear]          = useState(year);

  // Drag-to-select state
  const [dragStart,  setDragStart]  = useState<string | null>(null);
  const [dragEnd,    setDragEnd]    = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Filter state
  const ALL_STATUS   = ["Pendiente", "Confirmada", "Completada", "Cancelada"] as const;
const [filterOpen,     setFilterOpen]     = useState(false);
  const [filterStatus,   setFilterStatus]   = useState<string[]>([...ALL_STATUS]);
  const [filterPlatform, setFilterPlatform] = useState<string[]>([]);   // empty = all
  const [filterCurrency, setFilterCurrency] = useState<string[]>([]);   // empty = all
  const [filterDuration, setFilterDuration] = useState<string[]>([]);   // empty = all
  const [filterShowPast, setFilterShowPast] = useState(true);

  function toggleItem(arr: string[], setArr: (v: string[]) => void, item: string) {
    setArr(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  }
  function clearFilters() {
    setFilterStatus([...ALL_STATUS]);
    setFilterPlatform([]);
    setFilterCurrency([]);
    setFilterDuration([]);
    setFilterShowPast(true);
  }
  const activeFilterCount =
    (filterStatus.length < ALL_STATUS.length ? 1 : 0) +
    (filterPlatform.length > 0 ? 1 : 0) +
    (filterCurrency.length > 0 ? 1 : 0) +
    (filterDuration.length > 0 ? 1 : 0) +
    (!filterShowPast ? 1 : 0);

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear  = month === 12 ? year + 1 : year;

  const { selectedPropertyId, selectedProperty: selectedProp } = useProperty();
  const propId = selectedPropertyId;

  const { data: platforms  = [] } = usePlatformConfigs();
  const { data: allBrackets = [] } = useBrackets();
  const brackets = resolveBracketsForProperty(allBrackets, propId);
  const { data: maintenanceTickets = [] } = useMaintenanceTickets();

  const { data: resLeft  = [], isLoading: loadLeft  } = useReservations(propId, month,     year);
  const { data: resRight = [], isLoading: loadRight } = useReservations(propId, nextMonth, nextYear);

  const createRes = useCreateReservation();
  const updateRes = useUpdateReservation();

  const isLoading = loadLeft || loadRight;
  const todayStr  = toDateStr(now);

  // ── Global mouseup: commit or cancel drag ────────────────────────────────
  const commitDrag = useCallback(() => {
    if (!isDragging || !dragStart) return;
    const end = dragEnd ?? dragStart;

    // Determine checkin/checkout from the drag range
    const checkin  = dragStart <= end ? dragStart : end;
    const checkout = dragStart <= end ? end       : dragStart;

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);

    if (!checkin) return;

    const [cy, cm] = checkin.split("-").map(Number);
    setEditingRes(null);
    setPrefillDate(checkin);
    // checkout = last selected day (= departure day in the form)
    setPrefillCheckout(checkout);
    setFormMonth(cm);
    setFormYear(cy);
    setResFormOpen(true);
  }, [isDragging, dragStart, dragEnd]);

  useEffect(() => {
    const handleMouseUp = () => commitDrag();
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [commitDrag]);

  function prevMonthNav() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonthNav() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  async function handleSave(data: Omit<Reservation, "id" | "created_at" | "deleted_at">) {
    const allRes = [...resLeft, ...resRight];
    const grossSoFar = allRes
      .filter((r) => r.status !== "Cancelada" && r.currency === "USD")
      .reduce((s, r) => s + r.gross_amount, 0);
    const bracket  = getActiveBracket(brackets, grossSoFar + (data.currency === "USD" ? data.gross_amount : 0));
    const ownerPct = bracket?.owner_pct ?? 70;
    const cePct    = bracket?.ce_pct    ?? 30;
    const finalData = {
      ...data,
      owner_pct:    ownerPct,
      owner_amount: data.net_amount * (ownerPct / 100),
      ce_pct:       cePct,
      ce_amount:    data.net_amount * (cePct / 100),
      owner_rds:    data.currency === "USD"
        ? data.net_amount * (ownerPct / 100) * data.exchange_rate
        : data.net_amount * (ownerPct / 100),
    };
    try {
      if (editingRes) {
        await updateRes.mutateAsync({ id: editingRes.id, ...finalData });
      } else {
        await createRes.mutateAsync(finalData);
      }
      setResFormOpen(false);
      setEditingRes(null);
      setPrefillDate(""); setPrefillCheckout("");
      toast({ title: editingRes ? "Reserva actualizada" : "Reserva creada", variant: "success" });
    } catch (err: any) {
      toast({ title: "Error al guardar", description: err?.message ?? "Error desconocido", variant: "destructive" });
      throw err;
    }
  }

  function openEdit(r: Reservation) {
    setEditingRes(r);
    setPrefillDate(""); setPrefillCheckout("");
    setFormMonth(r.period_month); setFormYear(r.period_year);
    setResFormOpen(true);
  }

  // Available platforms for filter pills (derived from loaded data)
  const availablePlatforms = (() => {
    const fromRes = [...new Set([...resLeft, ...resRight].map((r) => r.platform))];
    const fromCfg = platforms.map((p: any) => p.name as string);
    return [...new Set([...fromCfg, ...fromRes])].sort();
  })();

  // Apply all active filters to a reservation array
  function applyFilters(list: Reservation[]): Reservation[] {
    return list.filter((r) => {
      if (!filterStatus.includes(r.status)) return false;
      if (filterPlatform.length > 0 && !filterPlatform.includes(r.platform)) return false;
      if (filterCurrency.length > 0 && !filterCurrency.includes(r.currency)) return false;
      if (!filterShowPast && r.checkout < todayStr) return false;
      if (filterDuration.length > 0) {
        const bucket =
          r.nights <= 3 ? "Corta (1–3n)" : r.nights <= 7 ? "Media (4–7n)" : "Larga (8+n)";
        if (!filterDuration.includes(bucket)) return false;
      }
      return true;
    });
  }

  const filteredLeft  = applyFilters(resLeft);
  const filteredRight = applyFilters(resRight);

  // Stats
  const activeLeft  = filteredLeft.filter((r)  => r.status !== "Cancelada");
  const activeRight = filteredRight.filter((r) => r.status !== "Cancelada");
  const allActive   = [...activeLeft, ...activeRight];
  const completadas = allActive.filter((r) => r.status === "Completada" || r.status === "Confirmada").length;
  const pendientes  = allActive.filter((r) => r.status === "Pendiente").length;
  const nightsLeft  = activeLeft.reduce((s, r)  => s + r.nights, 0);
  const nightsRight = activeRight.reduce((s, r) => s + r.nights, 0);
  const nights      = nightsLeft + nightsRight;
  const usdRes      = allActive.filter((r) => r.currency === "USD");
  const grossUSD    = usdRes.reduce((s, r) => s + r.gross_amount, 0);
  const netUSD      = usdRes.reduce((s, r) => s + r.net_amount,   0);

  // Bracket max card
  const maxBracket   = brackets.length > 0
    ? brackets.reduce((best, b) => (b.range_min > best.range_min ? b : best))
    : null;
  const toMaxBracket = maxBracket ? Math.max(0, maxBracket.range_min - grossUSD) : null;

  const resSaving = createRes.isPending || updateRes.isPending;

  return (
    <div className="px-3 sm:px-6 pt-6 pb-8 min-h-screen bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8]">
    <div className="max-w-screen-2xl mx-auto animate-fade-in space-y-5 text-sm">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-[#0F2B4C]">Calendario</h1>
          <p className="text-muted-foreground mt-0.5">
            Vista de dos meses · Arrastra para seleccionar días
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-white/80 border-border shadow-sm"
            onClick={() => exportCalendarCSV(filteredLeft, filteredRight, selectedProp?.name ?? "propiedad", month, nextMonth, year)}
            disabled={filteredLeft.length === 0 && filteredRight.length === 0}
          >
            <Download size={13} />
            Exportar CSV
          </Button>
          <Button onClick={() => {
            setEditingRes(null); setPrefillDate(""); setPrefillCheckout("");
            setFormMonth(month); setFormYear(year); setResFormOpen(true);
          }}>
            <Plus size={15} className="mr-2" />Nueva reserva
          </Button>
        </div>
      </div>

      {/* ── Controls ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Two-month navigator */}
        <div className="flex items-center gap-0 border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
          <button onClick={prevMonthNav}
            className="px-3 py-2 hover:bg-slate-50 transition-colors text-[#0F2B4C] border-r border-slate-200">
            <ChevronLeft size={15} />
          </button>
          <div className="px-4 py-2 bg-[#0F2B4C]/[0.03] md:border-r border-slate-200">
            <span className="text-xs font-bold text-[#0F2B4C] whitespace-nowrap">
              {MONTHS_ES[month - 1]} {year}
            </span>
          </div>
          <div className="hidden md:block px-2 text-slate-300 text-xs select-none">→</div>
          <div className="hidden md:block px-4 py-2 bg-[#2D6A9F]/[0.04] border-l border-slate-200">
            <span className="text-xs font-bold text-[#2D6A9F] whitespace-nowrap">
              {MONTHS_ES[nextMonth - 1]} {nextYear}
            </span>
          </div>
          <button onClick={nextMonthNav}
            className="px-3 py-2 hover:bg-slate-50 transition-colors text-[#0F2B4C] border-l border-slate-200">
            <ChevronRight size={15} />
          </button>
        </div>

        <Button variant="outline" size="sm"
          onClick={() => { setMonth(now.getMonth() + 1); setYear(now.getFullYear()); }}>
          <CalendarDays size={13} className="mr-1.5" />Hoy
        </Button>

        {/* Filter toggle button */}
        <button
          onClick={() => setFilterOpen((v) => !v)}
          className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium
            transition-all shadow-sm
            ${filterOpen || activeFilterCount > 0
              ? "bg-[#0F2B4C] text-white border-[#0F2B4C]"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-800"
            }`}
        >
          <SlidersHorizontal size={13} />
          Filtros
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full
              bg-[#F0A030] text-[#0F2B4C] text-[9px] font-bold leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>

        {selectedProp && (
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{selectedProp.name}</span>
            {" · "}Propietario:{" "}
            <span className="font-semibold text-foreground">{selectedProp.owner_name}</span>
          </p>
        )}
      </div>

      {/* ── Filter panel ──────────────────────────────────────────────────── */}
      {filterOpen && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-md p-4 space-y-4 animate-fade-in">

          {/* Header row */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#0F2B4C] uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal size={12} />Filtros
            </span>
            <div className="flex items-center gap-3">
              {activeFilterCount > 0 && (
                <button onClick={clearFilters}
                  className="text-[11px] text-[#2D6A9F] hover:text-[#0F2B4C] font-medium underline underline-offset-2 transition-colors">
                  Limpiar filtros
                </button>
              )}
              <button onClick={() => setFilterOpen(false)}
                className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={13} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">

            {/* Estado */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Estado</p>
              <div className="flex flex-wrap gap-1.5">
                {(["Pendiente", "Confirmada", "Completada", "Cancelada"] as const).map((s) => {
                  const active = filterStatus.includes(s);
                  const activeCls =
                    s === "Pendiente"  ? "bg-[#2D6A9F] text-white border-[#2D6A9F]" :
                    s === "Confirmada" ? "bg-sky-500 text-white border-sky-500" :
                    s === "Completada" ? "bg-emerald-600 text-white border-emerald-600" :
                                        "bg-slate-500 text-white border-slate-500";
                  return (
                    <button key={s}
                      onClick={() => toggleItem(filterStatus, setFilterStatus, s)}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all
                        ${active ? activeCls : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"}`}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Plataforma */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Plataforma
                {filterPlatform.length === 0 && (
                  <span className="ml-1.5 font-normal normal-case tracking-normal text-slate-400">(todas)</span>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {availablePlatforms.map((pl) => {
                  const active = filterPlatform.includes(pl);
                  return (
                    <button key={pl}
                      onClick={() => toggleItem(filterPlatform, setFilterPlatform, pl)}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all
                        ${active
                          ? "bg-[#0F2B4C] text-white border-[#0F2B4C]"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"}`}>
                      {pl}
                    </button>
                  );
                })}
                {availablePlatforms.length === 0 && (
                  <span className="text-[11px] text-muted-foreground italic">Sin reservas aún</span>
                )}
              </div>
            </div>

            {/* Moneda */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Moneda
                {filterCurrency.length === 0 && (
                  <span className="ml-1.5 font-normal normal-case tracking-normal text-slate-400">(todas)</span>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(["USD", "RD$"] as const).map((cur) => {
                  const active = filterCurrency.includes(cur);
                  return (
                    <button key={cur}
                      onClick={() => toggleItem(filterCurrency, setFilterCurrency, cur)}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all
                        ${active
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"}`}>
                      {cur}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duración */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Duración
                {filterDuration.length === 0 && (
                  <span className="ml-1.5 font-normal normal-case tracking-normal text-slate-400">(todas)</span>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(["Corta (1–3n)", "Media (4–7n)", "Larga (8+n)"] as const).map((dur) => {
                  const active = filterDuration.includes(dur);
                  return (
                    <button key={dur}
                      onClick={() => toggleItem(filterDuration, setFilterDuration, dur)}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all
                        ${active
                          ? "bg-violet-700 text-white border-violet-700"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"}`}>
                      {dur}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visibilidad pasadas */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Reservas pasadas</p>
              <div className="flex flex-wrap gap-1.5">
                {([true, false] as const).map((val) => {
                  const active = filterShowPast === val;
                  return (
                    <button key={String(val)}
                      onClick={() => setFilterShowPast(val)}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all
                        ${active
                          ? val
                            ? "bg-teal-600 text-white border-teal-600"
                            : "bg-slate-500 text-white border-slate-500"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"}`}>
                      {val ? "Mostrar pasadas" : "Ocultar pasadas"}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Active filter summary */}
          {activeFilterCount > 0 && (
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground font-medium">Activos:</span>
              {filterStatus.length < ALL_STATUS.length && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-medium text-slate-600">
                  Estado: {filterStatus.join(", ")}
                </span>
              )}
              {filterPlatform.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-medium text-slate-600">
                  Plataforma: {filterPlatform.join(", ")}
                </span>
              )}
              {filterCurrency.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-medium text-slate-600">
                  Moneda: {filterCurrency.join(", ")}
                </span>
              )}
              {filterDuration.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-medium text-slate-600">
                  Duración: {filterDuration.join(", ")}
                </span>
              )}
              {!filterShowPast && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-medium text-slate-600">
                  Ocultar pasadas
                </span>
              )}
            </div>
          )}

        </div>
      )}

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">

        {/* 1 · Reservas activas */}
        <div className="rounded-xl overflow-hidden shadow-sm border border-black/[0.08]">
          <div className="bg-[#0F2B4C] px-4 py-2.5 flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/75">Reservas activas</span>
            <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
              <BookOpen size={14} strokeWidth={2} className="text-white" />
            </div>
          </div>
          <div className="bg-white px-4 pt-3 pb-3">
            <p className="text-xl font-serif font-bold text-[#0F2B4C]">{allActive.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              <span className="text-emerald-600 font-semibold">{completadas}</span>
              {" completadas · "}
              <span className="text-[#2D6A9F] font-semibold">{pendientes}</span>
              {" pendientes"}
            </p>
          </div>
        </div>

        {/* 2 · Noches ocupadas */}
        <div className="rounded-xl overflow-hidden shadow-sm border border-black/[0.08]">
          <div className="bg-[#2D6A9F] px-4 py-2.5 flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/75">Noches ocupadas</span>
            <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
              <Moon size={14} strokeWidth={2} className="text-white" />
            </div>
          </div>
          <div className="bg-white px-4 pt-3 pb-3">
            <p className="text-xl font-serif font-bold text-[#2D6A9F]">{nights}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {MONTHS_ES[month - 1].slice(0, 3)}: <span className="font-semibold text-foreground">{nightsLeft}</span>
              {" · "}
              {MONTHS_ES[nextMonth - 1].slice(0, 3)}: <span className="font-semibold text-foreground">{nightsRight}</span>
            </p>
          </div>
        </div>

        {/* 3 · Ingreso bruto */}
        <div className="rounded-xl overflow-hidden shadow-sm border border-black/[0.08]">
          <div className="bg-amber-600 px-4 py-2.5 flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/75">Ingreso bruto</span>
            <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
              <DollarSign size={14} strokeWidth={2} className="text-white" />
            </div>
          </div>
          <div className="bg-white px-4 pt-3 pb-3">
            <p className="text-xl font-serif font-bold text-amber-700 truncate">
              ${grossUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Solo USD · ambos meses</p>
          </div>
        </div>

        {/* 4 · Monto neto */}
        <div className="rounded-xl overflow-hidden shadow-sm border border-black/[0.08]">
          <div className="bg-teal-600 px-4 py-2.5 flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/75">Monto neto</span>
            <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
              <Wallet size={14} strokeWidth={2} className="text-white" />
            </div>
          </div>
          <div className="bg-white px-4 pt-3 pb-3">
            <p className="text-xl font-serif font-bold text-teal-700 truncate">
              ${netUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {grossUSD > 0 ? `${((netUSD / grossUSD) * 100).toFixed(1)}% del bruto` : "—"}
            </p>
          </div>
        </div>

        {/* 5 · Bracket máximo */}
        <div className="rounded-xl overflow-hidden shadow-sm border border-black/[0.08]">
          <div className="bg-violet-700 px-4 py-2.5 flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/75">Bracket máximo</span>
            <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
              <TrendingUp size={14} strokeWidth={2} className="text-white" />
            </div>
          </div>
          <div className="bg-white px-4 pt-3 pb-3">
            {toMaxBracket === null ? (
              <>
                <p className="text-xl font-serif font-bold text-violet-700">—</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Sin brackets configurados</p>
              </>
            ) : toMaxBracket === 0 ? (
              <>
                <p className="text-xl font-serif font-bold text-emerald-600">✓ Máximo</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Bracket más alto alcanzado</p>
              </>
            ) : (
              <>
                <p className="text-xl font-serif font-bold text-violet-700 truncate">
                  ${toMaxBracket.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  Falta para tier ${maxBracket!.range_min.toLocaleString("en-US")}+
                </p>
              </>
            )}
          </div>
        </div>

      </div>

      {/* ── Two-month calendar ────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => <Card key={i} className="animate-pulse"><CardContent className="h-96" /></Card>)}
        </div>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 rounded-xl border border-slate-200 overflow-hidden shadow-sm"
          onMouseLeave={() => { if (isDragging) { setIsDragging(false); setDragStart(null); setDragEnd(null); } }}
        >
          <div className="md:border-r md:border-b-0 border-b border-slate-200">
            <MonthCalendarGrid
              year={year} month={month} reservations={filteredLeft} todayStr={todayStr}
              dragStart={dragStart} dragEnd={dragEnd} isDragging={isDragging}
              onDayMouseDown={(d) => { setDragStart(d); setDragEnd(d); setIsDragging(true); }}
              onDayMouseEnter={(d) => setDragEnd(d)}
              onReservationClick={openEdit}
            />
          </div>
          <div className="hidden md:block">
            <MonthCalendarGrid
              year={nextYear} month={nextMonth} reservations={filteredRight} todayStr={todayStr}
              dragStart={dragStart} dragEnd={dragEnd} isDragging={isDragging}
              onDayMouseDown={(d) => { setDragStart(d); setDragEnd(d); setIsDragging(true); }}
              onDayMouseEnter={(d) => setDragEnd(d)}
              onReservationClick={openEdit}
            />
          </div>
        </div>
      )}

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground
        border-t border-slate-100 pt-3">
        <span className="font-semibold text-foreground text-xs">Estado:</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-8 h-3 rounded-full bg-[#2D6A9F]" />Reservado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-8 h-3 rounded-full bg-sky-500" />Confirmada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-8 h-3 rounded-full bg-emerald-600" />Completada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-8 h-3 rounded-full bg-slate-300 opacity-60" />Cancelada
        </span>
        <span className="ml-auto flex items-center gap-5">
          <span className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full
              bg-[#F0A030] text-white text-[9px] font-bold">H</span>
            Hoy
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full
              bg-emerald-500 text-white text-[9px] font-bold">1</span>
            Check-ins
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-4 rounded-sm bg-amber-50 border border-amber-200" />
            Fin de semana
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-4 rounded-sm bg-[#2D6A9F]/10 border border-[#2D6A9F]/30" />
            Arrastra para crear
          </span>
        </span>
      </div>

      {/* ── Form dialog ───────────────────────────────────────────────────── */}
      {propId && (
        <ReservationFormDialog
          open={resFormOpen}
          onOpenChange={(v) => {
            setResFormOpen(v);
            if (!v) { setEditingRes(null); setPrefillDate(""); setPrefillCheckout(""); }
          }}
          editing={editingRes}
          prefillCheckin={prefillDate}
          prefillCheckout={prefillCheckout}
          propertyId={propId}
          month={formMonth} year={formYear}
          platforms={platforms}
          defaultRate={selectedProp?.reference_rate ?? 60}
          onSave={handleSave}
          saving={resSaving}
          maintenanceTickets={maintenanceTickets}
        />
      )}
    </div>
    </div>
  );
}
