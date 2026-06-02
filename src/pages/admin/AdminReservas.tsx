import { useState, useEffect } from "react";
import {
  Plus, Pencil, Trash2, AlertTriangle, Calendar,
  ChevronLeft, ChevronRight, CheckCircle2, Clock, XCircle,
  TrendingUp, Filter, Search, DollarSign,
  Moon, BookOpen, Wallet, Download, RotateCcw, Archive,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useProperty } from "@/contexts/PropertyContext";
import {
  useReservations, useCreateReservation,
  useUpdateReservation, useDeleteReservation,
  useDeletedReservations, useRestoreReservation,
} from "@/hooks/useReservations";
import { useBrackets, getActiveBracket } from "@/hooks/useBrackets";
import { usePlatformConfigs } from "@/hooks/usePlatformConfigs";
import { useMaintenanceTickets } from "@/hooks/useMaintenance";
import { ReservationFormDialog } from "./ReservationFormDialog";
import type { Reservation } from "@/types/database";
import { cn } from "@/lib/utils";

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const STATUS_BADGE: Record<string, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  Completada: { label: "Completada", icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  Pendiente:  { label: "Reservado",  icon: Clock,        cls: "bg-blue-100 text-blue-800 border-blue-200"         },
  Cancelada:  { label: "Cancelada",  icon: XCircle,      cls: "bg-red-100 text-red-800 border-red-200"            },
};

// ── Day-of-week helper ────────────────────────────────────────────────────────
const DAYS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
function dayLabel(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return DAYS_ES[new Date(y, m - 1, d).getDay()];
}

// ── Platform logo ─────────────────────────────────────────────────────────────
const PLATFORM_DOMAINS: Record<string, string> = {
  "Airbnb":      "airbnb.com",
  "Booking.com": "booking.com",
  "VRBO":        "vrbo.com",
  "Expedia":     "expedia.com",
  "HomeAway":    "homeaway.com",
  "Trivago":     "trivago.com",
};

function PlatformLogo({ platform }: { platform: string }) {
  const key = platform.trim();
  const lower = key.toLowerCase();

  // Directo → mini Cana Escapes compass logo
  if (lower === "directo" || lower === "direct") {
    return (
      <span
        title="Directo · Cana Escapes"
        className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-[3px] bg-[#0F2B4C] shrink-0"
      >
        <svg width="11" height="9" viewBox="0 0 52 44" fill="none" aria-hidden="true">
          {/* Compass arc */}
          <path d="M 5 30 A 21 21 0 0 1 47 30" stroke="#F0A030" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
          {/* Sun half-circle */}
          <path d="M 11 30 A 15 15 0 0 1 41 30 Z" fill="#F0A030"/>
          {/* Horizon */}
          <line x1="2" y1="30" x2="50" y2="30" stroke="white" strokeWidth="4" strokeLinecap="round"/>
          <line x1="10" y1="34" x2="42" y2="34" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </span>
    );
  }

  // Known OTA → Google favicon service
  const domain = PLATFORM_DOMAINS[key];
  if (domain) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
        alt={key}
        className="w-[18px] h-[18px] rounded-[3px] shrink-0 object-contain"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    );
  }

  // Unknown platform → first-letter badge
  return (
    <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-[3px] bg-slate-500 text-white text-[9px] font-bold shrink-0">
      {key.charAt(0).toUpperCase()}
    </span>
  );
}

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtUSD(n: number, decimals = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(n);
}
function fmtRDS(n: number) {
  return `RD$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)}`;
}
function fmtRDSd(n: number) {
  return `RD$${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
}
function fmtNum(n: number) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function fmtCur(n: number, currency: string) {
  return currency === "RD$" ? fmtRDS(n) : fmtUSD(n);
}
function ceRDS(r: Reservation) {
  return r.currency === "USD" ? r.ce_amount * r.exchange_rate : r.ce_amount;
}
function ownerRDS(r: Reservation) {
  // owner_amount for USD reservations is in USD → convert to RD$
  // owner_amount for RD$ reservations is already in RD$
  return r.currency === "USD" ? r.owner_amount * r.exchange_rate : r.owner_amount;
}

// ── CSV Export ───────────────────────────────────────────────────────────────
const MONTHS_ES_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function exportReservationsCSV(reservations: Reservation[], propName: string, month: number, year: number) {
  const headers = [
    "Huésped","Check-in","Check-out","Noches","Plataforma","Moneda",
    "Bruto","Com. Plataforma","Marketing","Com. Tarjeta","Extras","Neto",
    "% Propietario","Propietario USD","% CE","CE USD","Tipo cambio","Propietario RD$",
    "Estado","Notas",
  ];
  const rows = reservations.map((r) => [
    r.guest_name,
    r.checkin, r.checkout, r.nights,
    r.platform, r.currency,
    r.gross_amount, r.platform_comm_usd, r.marketing_usd ?? 0, r.card_fee_usd, r.extra_usd, r.net_amount,
    `${r.owner_pct}%`, r.owner_amount,
    `${r.ce_pct}%`, r.ce_amount,
    r.exchange_rate, r.owner_rds,
    r.status, r.notes ?? "",
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `reservas_${propName}_${MONTHS_ES_SHORT[month-1]}${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Helper: compute unified USD totals for a set of reservations ─────────────
function computeUnifiedUSD(arr: Reservation[]) {
  const toUSD = (r: Reservation, v: number) => r.currency === "RD$" && r.exchange_rate > 0 ? v / r.exchange_rate : v;
  return {
    noches:      arr.reduce((s, r) => s + r.nights, 0),
    bruto:       arr.reduce((s, r) => s + toUSD(r, r.gross_amount), 0),
    comPlat:     arr.reduce((s, r) => s + toUSD(r, r.platform_comm_usd), 0),
    marketing:   arr.reduce((s, r) => s + toUSD(r, r.marketing_usd ?? 0), 0),
    tarjeta:     arr.reduce((s, r) => s + toUSD(r, r.card_fee_usd), 0),
    extra:       arr.reduce((s, r) => s + toUSD(r, r.extra_usd), 0),
    neto:        arr.reduce((s, r) => s + toUSD(r, r.net_amount), 0),
    propietario: arr.reduce((s, r) => s + toUSD(r, r.owner_amount), 0),
    ce:          arr.reduce((s, r) => s + toUSD(r, r.ce_amount), 0),
  };
}

// ── Reusable totals table row ────────────────────────────────────────────────
function TotalsTableRow({ t }: { t: ReturnType<typeof computeUnifiedUSD> }) {
  return (
    <tr className="bg-white">
      <td className="px-4 py-3 text-center font-bold text-lg font-serif text-[#0F2B4C]">{t.noches}</td>
      <td className="px-4 py-3 text-right font-mono font-bold text-base">{fmtNum(t.bruto)}</td>
      <td className="px-4 py-3 text-right font-mono text-red-600 font-semibold">{fmtNum(t.comPlat)}</td>
      <td className="px-4 py-3 text-right font-mono text-red-600 font-semibold">{fmtNum(t.tarjeta)}</td>
      <td className="px-4 py-3 text-right font-mono text-red-600 font-semibold">{fmtNum(t.extra)}</td>
      <td className="px-4 py-3 text-right font-mono font-bold text-[#2D6A9F] text-base">{fmtNum(t.neto)}</td>
      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 text-base">{fmtNum(t.propietario)}</td>
      <td className="px-4 py-3 text-right font-mono font-bold text-amber-700 text-base">{fmtNum(t.ce)}</td>
    </tr>
  );
}

const TOTALS_HEADERS = ["Noches","Ingreso Bruto","Com. Plataforma","Tarjeta","Deduc. Extra","Monto Neto","Propietario","Cana Escapes"];

// ── Total General Summary ─────────────────────────────────────────────────────
function TotalGeneralSection({
  reservations,
  month,
  year,
  daysInMonth,
  defaultPayoutRate,
}: {
  reservations: Reservation[];
  month: number;
  year: number;
  daysInMonth: number;
  defaultPayoutRate: number;
}) {
  const confirmed = reservations.filter((r) => r.status === "Completada" || r.status === "Confirmada");
  const pending   = reservations.filter((r) => r.status === "Pendiente");
  const active    = reservations.filter((r) => r.status !== "Cancelada");

  const confirmedT = computeUnifiedUSD(confirmed);
  const pendingT   = computeUnifiedUSD(pending);

  // RD$ reservations among confirmed (for payout rate)
  const confirmedRDS = confirmed.filter((r) => r.currency === "RD$" && r.exchange_rate > 0);

  // Weighted average exchange rate used for RD$ confirmed reservations
  const totalRDSBruto = confirmedRDS.reduce((s, r) => s + r.gross_amount, 0);
  const weightedAvgRate = totalRDSBruto > 0
    ? confirmedRDS.reduce((s, r) => s + r.gross_amount * r.exchange_rate, 0) / totalRDSBruto
    : 0;

  // Min/Max rates for reference
  const minRate = confirmedRDS.length > 0
    ? Math.min(...confirmedRDS.map((r) => r.exchange_rate))
    : 0;
  const maxRate = confirmedRDS.length > 0
    ? Math.max(...confirmedRDS.map((r) => r.exchange_rate))
    : 0;

  // Pre-load payoutRate with weighted avg when available, fallback to defaultPayoutRate
  const initialRate = weightedAvgRate > 0
    ? weightedAvgRate.toFixed(2)
    : (defaultPayoutRate > 0 ? String(defaultPayoutRate) : "");
  const [payoutRate, setPayoutRate] = useState(initialRate);
  const [manuallyEdited, setManuallyEdited] = useState(false);

  // Auto-update payoutRate when weighted avg changes (unless user manually edited)
  useEffect(() => {
    if (manuallyEdited) return;
    if (weightedAvgRate > 0) setPayoutRate(weightedAvgRate.toFixed(2));
    else if (defaultPayoutRate > 0) setPayoutRate(String(defaultPayoutRate));
  }, [weightedAvgRate, defaultPayoutRate, manuallyEdited]);

  function resetToWeightedAvg() {
    if (weightedAvgRate > 0) {
      setPayoutRate(weightedAvgRate.toFixed(2));
      setManuallyEdited(false);
    }
  }

  // Payout rate impact (only confirmed RD$)
  const payoutRateNum = parseFloat(payoutRate) || 0;
  const rdsNetAtPayout = payoutRateNum > 0
    ? confirmedRDS.reduce((s, r) => s + r.net_amount, 0) / payoutRateNum
    : 0;
  const rdsNetAtOriginal = confirmedRDS.reduce((s, r) =>
    s + (r.exchange_rate > 0 ? r.net_amount / r.exchange_rate : 0), 0);
  const rateDiff = rdsNetAtPayout - rdsNetAtOriginal;

  const totalNoches   = confirmedT.noches + pendingT.noches;
  const ocupacionPct  = daysInMonth > 0 ? ((totalNoches / daysInMonth) * 100).toFixed(1) : "0.0";

  if (active.length === 0) return null;

  return (
    <div className="space-y-4">

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* CONFIRMADAS                                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {confirmed.length > 0 && (
        <div className="rounded-xl border border-emerald-200 overflow-hidden shadow-sm">
          <div className="bg-emerald-700 px-5 py-3 flex items-center gap-3">
            <CheckCircle2 size={15} className="text-white/80" />
            <span className="text-white font-bold text-sm tracking-wide">TOTALES CONFIRMADOS (USD)</span>
            <span className="ml-auto text-white/50 text-xs">
              {confirmed.length} confirmada{confirmed.length !== 1 ? "s" : ""} · {MONTHS_ES[month - 1]} {year}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-emerald-50 border-b border-emerald-200">
                  {TOTALS_HEADERS.map((h) => (
                    <th key={h} className={`px-4 py-2 font-bold uppercase tracking-wider text-emerald-900 ${h === "Noches" ? "text-center" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <TotalsTableRow t={confirmedT} />
              </tbody>
            </table>
          </div>

          {/* ── IMPACTO TASA DE PAGO ─────────────────────────────────────── */}
          {confirmedRDS.length > 0 && (
            <div className="border-t-2 border-emerald-200">
              <div className="bg-gradient-to-r from-[#0F2B4C] to-[#1a3d66] px-5 py-2 flex items-center gap-2">
                <Wallet size={13} className="text-amber-300" />
                <span className="text-white font-bold text-xs tracking-wide uppercase">
                  Impacto Tasa de Pago
                </span>
                <span className="text-white/40 text-[10px] ml-2">
                  Compara la tasa de cada reserva RD$ vs. la tasa al momento de pagar
                </span>
              </div>
              <div className="bg-[#0F2B4C]/[0.03] px-5 py-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Tasa de pago del mes (RD$ por USD)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" step="0.01" min="0"
                        placeholder={weightedAvgRate > 0 ? weightedAvgRate.toFixed(2) : "59.00"}
                        value={payoutRate}
                        onChange={(e) => { setPayoutRate(e.target.value); setManuallyEdited(true); }}
                        className="w-32 h-9 rounded-md border border-input bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2D6A9F]/30"
                      />
                      {weightedAvgRate > 0 && manuallyEdited && Math.abs(parseFloat(payoutRate || "0") - weightedAvgRate) > 0.01 && (
                        <button
                          type="button"
                          onClick={resetToWeightedAvg}
                          className="text-[10px] font-medium px-2 py-1.5 rounded-md border border-[#2D6A9F]/30 bg-white text-[#2D6A9F] hover:bg-[#2D6A9F]/10 transition-colors flex items-center gap-1"
                          title="Usar promedio ponderado del mes"
                        >
                          ↻ Auto
                        </button>
                      )}
                    </div>
                    {confirmedRDS.length > 0 && (
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground font-mono">
                        <span>Mín: <span className="font-bold text-[#0F2B4C]">{minRate.toFixed(2)}</span></span>
                        <span className="text-[#2D6A9F]/40">·</span>
                        <span>Prom: <span className="font-bold text-emerald-700">{weightedAvgRate.toFixed(2)}</span></span>
                        <span className="text-[#2D6A9F]/40">·</span>
                        <span>Máx: <span className="font-bold text-[#0F2B4C]">{maxRate.toFixed(2)}</span></span>
                      </div>
                    )}
                  </div>

                  {payoutRateNum > 0 && (
                    <div className="flex flex-wrap gap-4 text-xs">
                      <div className="space-y-1">
                        {confirmedRDS.map((r, i) => {
                          const origUSD = r.exchange_rate > 0 ? r.net_amount / r.exchange_rate : 0;
                          const payUSD  = r.net_amount / payoutRateNum;
                          const diff    = payUSD - origUSD;
                          return (
                            <div key={r.id ?? i} className="flex items-center gap-3 text-[11px]">
                              <span className="text-muted-foreground w-28 truncate">{r.guest_name}</span>
                              <span className="font-mono text-muted-foreground">tasa {r.exchange_rate.toFixed(2)}</span>
                              <span className="font-mono">${origUSD.toFixed(2)}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-mono">${payUSD.toFixed(2)}</span>
                              <span className={`font-mono font-bold ${diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                {diff >= 0 ? "+" : ""}{diff.toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="ml-auto flex flex-col items-end gap-1.5 min-w-[200px]">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-[10px] uppercase">Neto a tasas originales</span>
                          <span className="font-mono font-semibold">${rdsNetAtOriginal.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-[10px] uppercase">Neto a tasa de pago ({payoutRateNum.toFixed(2)})</span>
                          <span className="font-mono font-semibold">${rdsNetAtPayout.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2 border-t border-[#0F2B4C]/15 pt-1.5">
                          <span className={`text-[10px] font-bold uppercase ${rateDiff >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                            {rateDiff >= 0 ? "Ganancia" : "Pérdida"} por cambio
                          </span>
                          <span className={`font-mono font-bold text-sm ${rateDiff >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                            {rateDiff >= 0 ? "+" : ""}${rateDiff.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {payoutRateNum <= 0 && weightedAvgRate <= 0 && (
                    <p className="text-[11px] text-muted-foreground italic">
                      Ingresa la tasa a la que vas a comprar/vender dólares para ver si ganas o pierdes en el cambio este mes.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="bg-emerald-50 border-t-2 border-emerald-200 px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
            {[
              { label: "Confirmadas",     value: String(confirmed.length),      bold: false },
              { label: "Noches",          value: String(confirmedT.noches),     bold: false },
              { label: "Propietario USD", value: fmtUSD(confirmedT.propietario), bold: true  },
              { label: "Cana Escapes USD",value: fmtUSD(confirmedT.ce),          bold: true  },
            ].map(({ label, value, bold }) => (
              <span key={label} className="whitespace-nowrap">
                <span className="text-muted-foreground">{label}: </span>
                <span className={bold ? "font-bold text-[#0F2B4C] text-sm" : "font-semibold text-foreground"}>{value}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* PROYECCIONES (Pendientes)                                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {pending.length > 0 && (
        <div className="rounded-xl border border-blue-200 overflow-hidden shadow-sm">
          <div className="bg-blue-600 px-5 py-3 flex items-center gap-3">
            <Clock size={15} className="text-white/80" />
            <span className="text-white font-bold text-sm tracking-wide">PROYECCIONES — Reservas Pendientes (USD)</span>
            <span className="ml-auto text-white/50 text-xs">
              {pending.length} pendiente{pending.length !== 1 ? "s" : ""} · {MONTHS_ES[month - 1]} {year}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-blue-50 border-b border-blue-200">
                  {TOTALS_HEADERS.map((h) => (
                    <th key={h} className={`px-4 py-2 font-bold uppercase tracking-wider text-blue-900 ${h === "Noches" ? "text-center" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <TotalsTableRow t={pendingT} />
              </tbody>
            </table>
          </div>

          {/* If confirmed, show combined projection */}
          {confirmed.length > 0 && (
            <div className="bg-blue-50/60 border-t border-blue-200 px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
              <span className="text-blue-700 font-bold text-[10px] uppercase tracking-wider">Si se confirman todas:</span>
              {[
                { label: "Bruto total",      value: fmtUSD(confirmedT.bruto + pendingT.bruto) },
                { label: "Neto total",        value: fmtUSD(confirmedT.neto + pendingT.neto) },
                { label: "Propietario total", value: fmtUSD(confirmedT.propietario + pendingT.propietario) },
                { label: "CE total",          value: fmtUSD(confirmedT.ce + pendingT.ce) },
              ].map(({ label, value }) => (
                <span key={label} className="whitespace-nowrap">
                  <span className="text-blue-500">{label}: </span>
                  <span className="font-bold text-[#0F2B4C] text-sm">{value}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* RESUMEN GENERAL                                                   */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-amber-200 overflow-hidden shadow-sm">
        <div className="bg-amber-50 px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
          {[
            { label: "Total reservas",  value: String(active.length),              bold: false },
            { label: "Confirmadas",     value: String(confirmed.length),           bold: false },
            { label: "Pendientes",      value: String(pending.length),             bold: false },
            { label: "Noches total",    value: String(totalNoches),                bold: false },
            { label: "Ocupación",       value: `${ocupacionPct}%`,                 bold: false },
          ].map(({ label, value, bold }) => (
            <span key={label} className="whitespace-nowrap">
              <span className="text-muted-foreground">{label}: </span>
              <span className={bold ? "font-bold text-[#0F2B4C] text-sm" : "font-semibold text-foreground"}>{value}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Reservation hover tooltip ─────────────────────────────────────────────────
function ReservationTooltip({
  r, x, y,
}: { r: Reservation; x: number; y: number }) {
  const st       = STATUS_BADGE[r.status] ?? STATUS_BADGE["Pendiente"];
  const cur      = r.currency === "RD$" ? "RD$" : "$";
  const fmtN     = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalDed = r.platform_comm_usd + (r.marketing_usd ?? 0) + r.card_fee_usd + r.extra_usd;

  // Propietario & CE always in USD
  const ownerUSD = r.currency === "RD$" && r.exchange_rate > 0
    ? r.owner_amount / r.exchange_rate : r.owner_amount;
  const ceUSD    = r.currency === "RD$" && r.exchange_rate > 0
    ? r.ce_amount / r.exchange_rate : r.ce_amount;

  // Smart positioning — flip left if near right edge
  const screenW = window.innerWidth;
  const tipW    = 260;
  const left    = x + 16 + tipW > screenW ? x - tipW - 8 : x + 16;
  const top     = Math.min(y - 10, window.innerHeight - 420);

  return (
    <div
      style={{ position: "fixed", left, top, zIndex: 9999, width: tipW, pointerEvents: "none" }}
      className="bg-[#0B1F38] text-white rounded-xl shadow-2xl overflow-hidden text-[11px] border border-white/10"
    >
      {/* Header */}
      <div className="px-3 py-2.5 bg-[#0F2B4C] flex items-center gap-2 border-b border-white/10">
        <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${st.cls}`}>
          {st.label}
        </span>
        <span className="font-semibold truncate flex-1">{r.guest_name}</span>
        {(r.guests ?? 0) > 0 && (
          <span className="text-white/60 text-[9px] whitespace-nowrap">👤 {r.guests}</span>
        )}
      </div>

      <div className="px-3 py-2 space-y-2">
        {/* Dates */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-b border-white/10 pb-2">
          <div>
            <p className="text-white/50 text-[9px] uppercase tracking-wider mb-0.5">Entrada</p>
            <p className="font-semibold">{r.checkin}</p>
            <p className="text-[#F0A030] text-[9px]">{dayLabel(r.checkin)}</p>
          </div>
          <div>
            <p className="text-white/50 text-[9px] uppercase tracking-wider mb-0.5">Salida</p>
            <p className="font-semibold">{r.checkout}</p>
            <p className="text-white/50 text-[9px]">{dayLabel(r.checkout)}</p>
          </div>
          <div className="col-span-2 flex gap-4 mt-0.5">
            <span className="text-white/60">🌙 <span className="text-white font-bold">{r.nights}</span> noche{r.nights !== 1 ? "s" : ""}</span>
            <span className="text-white/60">🏦 {r.platform}</span>
            <span className="text-white/60">💳 {r.payment_type}</span>
          </div>
        </div>

        {/* Financials */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-white/60">Bruto</span>
            <span className="font-mono font-semibold">{cur}{fmtN(r.gross_amount)}</span>
          </div>
          {r.platform_comm_usd > 0 && (
            <div className="flex justify-between text-red-300">
              <span className="text-white/50">Com. plataforma ({r.platform_comm_pct}%)</span>
              <span className="font-mono">−{fmtN(r.platform_comm_usd)}</span>
            </div>
          )}
          {(r.marketing_usd ?? 0) > 0 && (
            <div className="flex justify-between text-red-300">
              <span className="text-white/50">
                Marketing ({r.gross_amount > 0 ? ((r.marketing_usd / r.gross_amount) * 100).toFixed(1) : 0}%)
              </span>
              <span className="font-mono">−{fmtN(r.marketing_usd ?? 0)}</span>
            </div>
          )}
          {r.card_fee_usd > 0 && (
            <div className="flex justify-between text-red-300">
              <span className="text-white/50">Com. tarjeta ({r.card_fee_pct}%)</span>
              <span className="font-mono">−{fmtN(r.card_fee_usd)}</span>
            </div>
          )}
          {r.extra_usd > 0 && (
            <div className="flex justify-between text-red-300">
              <span className="text-white/50">Extras</span>
              <span className="font-mono">−{fmtN(r.extra_usd)}</span>
            </div>
          )}
          {totalDed > 0 && (
            <div className="flex justify-between text-red-400 border-t border-white/10 pt-1 text-[10px]">
              <span>Total deducciones</span>
              <span className="font-mono font-semibold">−{fmtN(totalDed)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-white/20 pt-1">
            <span className="font-semibold text-[#7EC8E3]">Neto</span>
            <span className="font-mono font-bold text-[#7EC8E3]">{cur}{fmtN(r.net_amount)}</span>
          </div>
        </div>

        {/* Owner / CE */}
        <div className="border-t border-white/10 pt-2 grid grid-cols-2 gap-x-3">
          <div>
            <p className="text-white/50 text-[9px] uppercase tracking-wider">Propietario</p>
            <p className="font-mono font-bold text-emerald-300">${fmtN(ownerUSD)}</p>
            {r.currency === "RD$" && (
              <p className="text-[9px] text-white/40">RD${(r.owner_amount).toLocaleString("en-US", {maximumFractionDigits: 0})}</p>
            )}
          </div>
          <div>
            <p className="text-white/50 text-[9px] uppercase tracking-wider">Cana Escapes</p>
            <p className="font-mono font-bold text-[#F0A030]">${fmtN(ceUSD)}</p>
            {r.currency === "RD$" && (
              <p className="text-[9px] text-white/40">RD${(r.ce_amount).toLocaleString("en-US", {maximumFractionDigits: 0})}</p>
            )}
          </div>
        </div>

        {/* Rate if RD$ */}
        {r.currency === "RD$" && r.exchange_rate > 0 && (
          <div className="border-t border-white/10 pt-1.5 flex justify-between text-white/50">
            <span>Tasa del día</span>
            <span className="font-mono">RD${r.exchange_rate.toFixed(2)}</span>
          </div>
        )}

        {/* Observaciones */}
        {r.notes && (
          <div className="border-t border-white/10 pt-1.5">
            <p className="text-white/40 text-[9px] uppercase tracking-wider mb-0.5">Observaciones</p>
            <p className="text-white/70 leading-snug">{r.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AdminReservas() {
  const now = new Date();
  const [month, setMonth]  = useState(now.getMonth() + 1);
  const [year,  setYear]   = useState(now.getFullYear());
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");

  const [resFormOpen,  setResFormOpen]  = useState(false);
  const [editingRes,   setEditingRes]   = useState<Reservation | null>(null);
  const [deletingRes,  setDeletingRes]  = useState<Reservation | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);

  // ── Hover tooltip state ────────────────────────────────────────────────────
  const [hoveredRes,  setHoveredRes]  = useState<Reservation | null>(null);
  const [tooltipPos,  setTooltipPos]  = useState({ x: 0, y: 0 });

  const { selectedPropertyId, selectedProperty: selectedProp } = useProperty();
  const propId = selectedPropertyId;

  const { data: platforms  = [] } = usePlatformConfigs();
  const { data: brackets   = [] } = useBrackets();
  const { data: maintenanceTickets = [] } = useMaintenanceTickets();

  const { data: reservations = [], isLoading } = useReservations(propId, month, year);
  const { data: deletedReservations = [] } = useDeletedReservations(propId);
  const createRes = useCreateReservation();
  const updateRes = useUpdateReservation();
  const deleteRes = useDeleteReservation();
  const restoreRes = useRestoreReservation();

  const daysInMonth = new Date(year, month, 0).getDate();

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  async function handleSaveRes(data: Omit<Reservation, "id" | "created_at" | "deleted_at">) {
    const grossUSD  = reservations.filter(r => r.status !== "Cancelada").reduce((s, r) => {
      const fx = r.currency === "RD$" && r.exchange_rate > 0 ? r.exchange_rate : 1;
      return s + r.gross_amount / fx;
    }, 0);
    const newGrossUSD = data.currency === "RD$" && data.exchange_rate > 0 ? data.gross_amount / data.exchange_rate : data.gross_amount;
    const bracket   = getActiveBracket(brackets, grossUSD + newGrossUSD);
    const ownerPct  = bracket?.owner_pct ?? 70;
    const cePct     = bracket?.ce_pct    ?? 30;
    const finalData = {
      ...data,
      owner_pct:    ownerPct,
      owner_amount: data.net_amount * (ownerPct / 100),
      ce_pct:       cePct,
      ce_amount:    data.net_amount * (cePct / 100),
      // USD reservations: convert owner amount to RD$
      // RD$ reservations: net is already in RD$, no conversion needed
      owner_rds:    data.currency === "USD"
        ? data.net_amount * (ownerPct / 100) * data.exchange_rate
        : data.net_amount * (ownerPct / 100),
    };

    const runMutation = async (payload: typeof finalData) => {
      if (editingRes) {
        return updateRes.mutateAsync({ id: editingRes.id, ...payload });
      } else {
        return createRes.mutateAsync(payload);
      }
    };

    try {
      await runMutation(finalData);
      setResFormOpen(false);
      setEditingRes(null);
      toast({ title: editingRes ? "Reserva actualizada" : "Reserva creada", variant: "success" });
    } catch (err: any) {
      const msg: string = err?.message ?? err?.error_description ?? String(err);

      // If the "guests" column doesn't exist yet (migration not run), retry without it
      if (msg.toLowerCase().includes("guests") || msg.toLowerCase().includes("column")) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { guests: _g, ...payloadWithoutGuests } = finalData as any;
          await runMutation(payloadWithoutGuests);
          setResFormOpen(false);
          setEditingRes(null);
          toast({
            title: editingRes ? "Reserva actualizada" : "Reserva creada",
            description: "⚠️ Ejecuta la migración SQL para guardar la cantidad de personas.",
            variant: "default",
          });
        } catch (err2: any) {
          toast({
            title: "Error al guardar",
            description: err2?.message ?? "Error desconocido",
            variant: "destructive",
          });
          throw err2;
        }
      } else {
        toast({
          title: "Error al guardar",
          description: msg,
          variant: "destructive",
        });
        throw err; // re-throw → keeps dialog open
      }
    }
  }

  async function handleDeleteRes() {
    if (!deletingRes) return;
    const name = deletingRes.guest_name;
    try {
      await deleteRes.mutateAsync({
        id: deletingRes.id,
        property_id:  deletingRes.property_id,
        period_month: deletingRes.period_month,
        period_year:  deletingRes.period_year,
      });
      setDeletingRes(null);
      toast({ title: "Reserva eliminada", description: `Reserva de ${name} eliminada correctamente.`, variant: "default" });
    } catch (err: any) {
      toast({ title: "Error al eliminar", description: err?.message ?? "Error desconocido", variant: "destructive" });
    }
  }

  const filtered = reservations.filter((r) => {
    const matchStatus = filterStatus === "Todos" || r.status === filterStatus;
    const matchSearch = search === "" ||
      r.guest_name.toLowerCase().includes(search.toLowerCase()) ||
      r.platform.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Strip totals (active only, filtered)
  const stripActive  = filtered.filter((r) => r.status !== "Cancelada");
  const stripGross   = stripActive.filter(r => r.currency === "USD").reduce((s, r) => s + r.gross_amount,   0);
  const stripNet     = stripActive.filter(r => r.currency === "USD").reduce((s, r) => s + r.net_amount,     0);
  const stripDeduct  = stripActive.filter(r => r.currency === "USD").reduce((s, r) => s + r.platform_comm_usd + (r.marketing_usd ?? 0) + r.card_fee_usd + r.extra_usd, 0);
  const stripNights  = stripActive.reduce((s, r) => s + r.nights, 0);

  // Table footer totals — unified USD (Completada only)
  const footConfirmed = filtered.filter(r => r.status === "Completada" || r.status === "Confirmada");
  const toUSDVal     = (r: Reservation, val: number) => r.currency === "RD$" && r.exchange_rate > 0 ? val / r.exchange_rate : val;
  const footGross    = footConfirmed.reduce((s, r) => s + toUSDVal(r, r.gross_amount), 0);
  const footNet      = footConfirmed.reduce((s, r) => s + toUSDVal(r, r.net_amount), 0);
  const footOwner    = footConfirmed.reduce((s, r) => s + toUSDVal(r, r.owner_amount), 0);
  const footCE       = footConfirmed.reduce((s, r) => s + toUSDVal(r, r.ce_amount), 0);
  const footDeduct   = footConfirmed.reduce((s, r) => s + toUSDVal(r, r.platform_comm_usd + (r.marketing_usd ?? 0) + r.card_fee_usd + r.extra_usd), 0);

  const resSaving = createRes.isPending || updateRes.isPending;

  // Column header helper
  const TH = ({ children, right = false, center = false }: { children?: React.ReactNode; right?: boolean; center?: boolean }) => (
    <th className={`px-3 py-2.5 text-[9px] font-bold uppercase tracking-wider opacity-80 whitespace-nowrap
      ${right ? "text-right" : center ? "text-center" : "text-left"}`}>
      {children}
    </th>
  );

  return (
    <div className="px-3 sm:px-6 pt-6 pb-8 min-h-screen bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8]">
    <div className="max-w-screen-2xl mx-auto animate-fade-in space-y-5 text-sm">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-[#0F2B4C]">Reservas</h1>
          <p className="text-muted-foreground mt-0.5">Gestión detallada de reservas por propiedad y período</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-white/80 border-border shadow-sm"
            onClick={() => exportReservationsCSV(filtered, selectedProp?.name ?? "propiedad", month, year)}
            disabled={filtered.length === 0}
          >
            <Download size={13} />
            Exportar CSV
          </Button>
          <Button variant="outline" size="sm"
            className="gap-2 bg-white/80 border-white shadow-sm relative"
            onClick={() => setShowDeleted(true)}>
            <Archive size={13} />
            Eliminadas
            {deletedReservations.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {deletedReservations.length}
              </span>
            )}
          </Button>
          <Button onClick={() => { setEditingRes(null); setResFormOpen(true); }}>
            <Plus size={15} className="mr-2" />
            Nueva reserva
          </Button>
        </div>
      </div>

      {/* ── Controls ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 border rounded-lg px-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}><ChevronLeft size={15} /></Button>
          <span className="text-sm font-semibold min-w-[120px] text-center text-[#0F2B4C]">
            {MONTHS_ES[month - 1]} {year}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}><ChevronRight size={15} /></Button>
        </div>

        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar huésped o plataforma…" value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>

        <div className="flex items-center gap-1.5 border rounded-lg px-3 py-1.5">
          <Filter size={12} className="text-muted-foreground shrink-0" />
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="border-0 p-0 h-auto text-sm bg-transparent focus:ring-0">
            <option value="Todos">Todos</option>
            <option value="Pendiente">Reservado</option>
            <option value="Completada">Completada</option>
            <option value="Cancelada">Cancelada</option>
          </Select>
        </div>
      </div>

      {selectedProp && (
        <p className="text-xs text-muted-foreground -mt-2">
          <span className="font-semibold text-foreground">{selectedProp.name}</span>
          {" · "}Propietario: <span className="font-semibold text-foreground">{selectedProp.owner_name}</span>
          {" · "}Tasa ref: <span className="font-semibold text-foreground">RD${selectedProp.reference_rate}</span>
        </p>
      )}

      {/* ── Summary strips ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {([
          {
            label: "Reservas activas", value: String(stripActive.length),
            sub: `${MONTHS_ES[month - 1]} ${year}`,
            Icon: BookOpen,
            topCls: "bg-[#0F2B4C]", valCls: "text-[#0F2B4C]",
          },
          {
            label: "Noches ocupadas", value: String(stripNights),
            sub: `de ${daysInMonth} días · ${daysInMonth > 0 ? ((stripNights / daysInMonth) * 100).toFixed(0) : 0}% ocup.`,
            Icon: Moon,
            topCls: "bg-[#2D6A9F]", valCls: "text-[#2D6A9F]",
          },
          {
            label: "Ingreso bruto", value: fmtUSD(stripGross),
            sub: "Solo reservas USD",
            Icon: DollarSign,
            topCls: "bg-amber-600", valCls: "text-amber-700",
          },
          {
            label: "Total deducciones", value: fmtUSD(stripDeduct),
            sub: stripGross > 0 ? `${((stripDeduct / stripGross) * 100).toFixed(1)}% del bruto` : "—",
            Icon: TrendingUp,
            topCls: "bg-red-600", valCls: "text-red-700",
          },
          {
            label: "Monto neto", value: fmtUSD(stripNet),
            sub: stripGross > 0 ? `${((stripNet / stripGross) * 100).toFixed(1)}% del bruto` : "—",
            Icon: Wallet,
            topCls: "bg-teal-600", valCls: "text-teal-700",
          },
        ] as const).map(({ label, value, sub, Icon, topCls, valCls }) => (
          <div key={label} className="rounded-xl overflow-hidden shadow-sm border border-black/8">
            {/* Colored header bar with label + icon */}
            <div className={`${topCls} px-4 py-2.5 flex items-center justify-between`}>
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/75">{label}</span>
              <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <Icon size={15} strokeWidth={2} className="text-white" />
              </div>
            </div>
            {/* Value + subtitle */}
            <div className="bg-white px-4 pt-3 pb-3">
              <p className={`text-xl font-serif font-bold truncate ${valCls}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Reservations Table ────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="h-14" /></Card>)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <Calendar size={28} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">
              {reservations.length === 0 ? "No hay reservas este mes." : "Ninguna reserva coincide con los filtros."}
            </p>
            {reservations.length === 0 && (
              <Button size="sm" className="mt-3" onClick={() => setResFormOpen(true)}>
                <Plus size={13} className="mr-1" />Agregar primera reserva
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
        {/* ── MOBILE CARDS (< lg) ─────────────────────────────── */}
        <div className="lg:hidden space-y-2">
          {filtered.map((r, i) => {
            const st = STATUS_BADGE[r.status] ?? STATUS_BADGE["Pendiente"];
            const Icon = st.icon;
            const isCancelled = r.status === "Cancelada";
            return (
              <div
                key={r.id}
                className={cn(
                  "rounded-xl border bg-white shadow-sm p-3 space-y-2",
                  isCancelled && "opacity-50 bg-red-50/30",
                )}
              >
                {/* Header: # + status + platform */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-mono">#{i + 1}</span>
                    <span className={cn("inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium", st.cls)}>
                      <Icon size={10} />{st.label}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full bg-[#2D6A9F]/10 text-[#2D6A9F] font-semibold">
                    <PlatformLogo platform={r.platform} /> {r.platform}
                  </span>
                </div>

                {/* Guest + dates */}
                <div className="border-b pb-2">
                  <p className="font-bold text-[#0F2B4C] text-sm">{r.guest_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.guests} pax · {r.payment_type}
                  </p>
                  <p className="text-xs text-[#2D6A9F] mt-1">
                    {new Date(r.checkin + "T12:00:00").toLocaleDateString("es-DO", { day: "2-digit", month: "short" })}
                    {" → "}
                    {new Date(r.checkout + "T12:00:00").toLocaleDateString("es-DO", { day: "2-digit", month: "short" })}
                    {" · "}
                    <span className="font-semibold">{r.nights} {r.nights === 1 ? "noche" : "noches"}</span>
                  </p>
                </div>

                {/* Amounts */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Bruto</p>
                    <p className="font-semibold text-[#0F2B4C]">
                      {r.currency === "USD" ? `$${r.gross_amount.toLocaleString()}` : `RD$${r.gross_amount.toLocaleString()}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Neto</p>
                    <p className="font-semibold text-emerald-700">
                      {r.currency === "USD" ? `$${r.net_amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `RD$${r.net_amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Propietario</p>
                    <p className="font-bold text-[#2D6A9F]">
                      {r.currency === "USD" ? `$${r.owner_amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `RD$${r.owner_amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-1">
                    <input
                      type="checkbox"
                      checked={r.status === "Completada"}
                      disabled={isCancelled}
                      onChange={async () => {
                        const newStatus = r.status === "Completada" ? "Pendiente" : "Completada";
                        try {
                          await updateRes.mutateAsync({ id: r.id, status: newStatus } as any);
                          toast({ title: newStatus === "Completada" ? "Reserva confirmada" : "Reserva pendiente", variant: "success" });
                        } catch (err: any) {
                          toast({ title: "Error", description: err?.message ?? "Error desconocido", variant: "destructive" });
                        }
                      }}
                      className="w-5 h-5 rounded border-2 border-[#0F2B4C]/30 text-emerald-600 accent-emerald-600"
                    />
                    Completada
                  </label>
                  <Button variant="outline" size="sm" className="h-9"
                    onClick={() => { setEditingRes(r); setResFormOpen(true); }}>
                    <Pencil size={13} className="mr-1" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 text-red-600 hover:bg-red-50"
                    onClick={() => setDeletingRes(r)}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── DESKTOP TABLE (lg+) ─────────────────────────────── */}
        <div className="hidden lg:block overflow-x-auto rounded-xl border border-[#0F2B4C]/10 shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#0F2B4C] text-white">
                <TH center></TH>
                <TH>#</TH>
                <TH>Estado</TH>
                <TH>Plataforma</TH>
                <TH>Entrada</TH>
                <TH>Salida</TH>
                <TH center>Noches</TH>
                <TH>Huésped</TH>
                <TH center>#Pax</TH>
                <TH>Pago</TH>
                <TH right>Tasa</TH>
                <TH right>Bruto</TH>
                <TH right>Com. Plat.</TH>
                <TH right>Marketing</TH>
                <TH right>Com. Tarjeta</TH>
                <TH right>Extras</TH>
                <TH right>Neto</TH>
                <TH right>Propietario</TH>
                <TH right>Cana Escapes</TH>
                <TH right>RD$ Prop.</TH>
                <TH right>RD$ CE</TH>
                <TH>Observaciones</TH>
                <TH></TH>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const st   = STATUS_BADGE[r.status] ?? STATUS_BADGE["Pendiente"];
                const Icon = st.icon;
                const rCE  = ceRDS(r);
                const isCancelled = r.status === "Cancelada";
                return (
                  <tr key={r.id}
                    className={`border-b last:border-0 transition-colors cursor-default ${
                      isCancelled ? "opacity-50 bg-red-50/30" : "hover:bg-[#2D6A9F]/10"
                    }`}
                    onMouseEnter={(e) => {
                      setHoveredRes(r);
                      setTooltipPos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setHoveredRes(null)}
                  >
                    {/* Checkbox — toggle Pendiente ↔ Completada */}
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={r.status === "Completada"}
                        disabled={isCancelled}
                        onChange={async () => {
                          const newStatus = r.status === "Completada" ? "Pendiente" : "Completada";
                          try {
                            await updateRes.mutateAsync({ id: r.id, status: newStatus } as any);
                            toast({ title: newStatus === "Completada" ? "Reserva confirmada" : "Reserva pendiente", variant: "success" });
                          } catch (err: any) {
                            toast({ title: "Error", description: err?.message ?? "Error desconocido", variant: "destructive" });
                          }
                        }}
                        className="w-4 h-4 rounded border-2 border-[#0F2B4C]/30 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed accent-emerald-600"
                        title={isCancelled ? "Cancelada" : r.status === "Completada" ? "Desmarcar → Pendiente" : "Confirmar → Completada"}
                      />
                    </td>

                    <td className="px-3 py-2.5 text-muted-foreground font-mono">{i + 1}</td>

                    {/* Estado — antes de plataforma */}
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${st.cls}`}>
                        <Icon size={9} />{st.label}
                      </span>
                    </td>

                    {/* Plataforma + logo */}
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[#2D6A9F]/10 text-[#2D6A9F] font-semibold whitespace-nowrap">
                        <PlatformLogo platform={r.platform} />
                        {r.platform}
                      </span>
                    </td>

                    {/* Entrada */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="font-medium leading-tight">{r.checkin}</div>
                      <div className="text-[10px] text-[#2D6A9F] font-semibold mt-0.5">{dayLabel(r.checkin)}</div>
                    </td>

                    {/* Salida */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="font-medium leading-tight">{r.checkout}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{dayLabel(r.checkout)}</div>
                    </td>

                    {/* Noches */}
                    <td className="px-3 py-2.5 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#0F2B4C]/8 text-[#0F2B4C] font-bold text-xs">
                        {r.nights}
                      </span>
                    </td>

                    {/* Huésped */}
                    <td className="px-3 py-2.5 max-w-[120px] truncate font-medium" title={r.guest_name}>
                      {r.guest_name}
                    </td>

                    {/* #Pax */}
                    <td className="px-3 py-2.5 text-center">
                      {(r.guests ?? 0) > 0 ? (
                        <span className="inline-flex items-center justify-center gap-0.5 text-xs font-bold text-[#0F2B4C]">
                          {r.guests}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.payment_type}</td>

                    {/* Tasa */}
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">
                      {r.exchange_rate > 0 ? r.exchange_rate.toFixed(2) : "—"}
                    </td>

                    {/* Bruto */}
                    <td className="px-3 py-2.5 text-right font-mono font-semibold">
                      {fmtCur(r.gross_amount, r.currency)}
                    </td>

                    {/* Com. Plat. + % */}
                    <td className="px-3 py-2.5 text-right">
                      {r.platform_comm_usd > 0 ? (
                        <>
                          <div className="font-mono text-red-500 font-semibold">
                            −{fmtNum(r.platform_comm_usd)}
                          </div>
                          <div className="text-[9px] text-muted-foreground">
                            {(() => {
                              const effPct = r.gross_amount > 0
                                ? (r.platform_comm_usd / r.gross_amount) * 100
                                : 0;
                              const hasFijo = effPct - r.platform_comm_pct > 0.05;
                              return hasFijo
                                ? `${r.platform_comm_pct}% + fijo`
                                : `${r.platform_comm_pct}%`;
                            })()}
                          </div>
                        </>
                      ) : <span className="text-muted-foreground/40">—</span>}
                    </td>

                    {/* Marketing */}
                    <td className="px-3 py-2.5 text-right">
                      {(r.marketing_usd ?? 0) > 0 ? (
                        <>
                          <div className="font-mono text-red-500 font-semibold">
                            −{fmtNum(r.marketing_usd ?? 0)}
                          </div>
                          <div className="text-[9px] text-muted-foreground">
                            {r.gross_amount > 0
                              ? ((r.marketing_usd / r.gross_amount) * 100).toFixed(1)
                              : "0.0"}%
                          </div>
                        </>
                      ) : <span className="text-muted-foreground/40">—</span>}
                    </td>

                    {/* Com. Tarjeta + % */}
                    <td className="px-3 py-2.5 text-right">
                      {r.card_fee_usd > 0 ? (
                        <>
                          <div className="font-mono text-red-500 font-semibold">
                            −{fmtNum(r.card_fee_usd)}
                          </div>
                          <div className="text-[9px] text-muted-foreground">{r.card_fee_pct}%</div>
                        </>
                      ) : <span className="text-muted-foreground/40">—</span>}
                    </td>

                    {/* Extras + % equivalente */}
                    <td className="px-3 py-2.5 text-right">
                      {r.extra_usd > 0 ? (
                        <>
                          <div className="font-mono text-red-500 font-semibold">
                            −{fmtNum(r.extra_usd)}
                          </div>
                          <div className="text-[9px] text-muted-foreground">
                            {r.gross_amount > 0
                              ? ((r.extra_usd / r.gross_amount) * 100).toFixed(1)
                              : "0.0"}%
                          </div>
                        </>
                      ) : <span className="text-muted-foreground/40">—</span>}
                    </td>

                    {/* Neto */}
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-[#2D6A9F]">
                      {fmtCur(r.net_amount, r.currency)}
                    </td>

                    {/* Propietario — siempre en USD */}
                    <td className="px-3 py-2.5 text-right">
                      <div className="font-mono font-bold text-emerald-700">
                        {fmtUSD(r.currency === "RD$" && r.exchange_rate > 0
                          ? r.owner_amount / r.exchange_rate
                          : r.owner_amount)}
                      </div>
                      <div className="text-[9px] text-muted-foreground">{r.owner_pct}% del neto</div>
                    </td>

                    {/* CE — siempre en USD */}
                    <td className="px-3 py-2.5 text-right">
                      <div className="font-mono font-bold text-amber-700">
                        {fmtUSD(r.currency === "RD$" && r.exchange_rate > 0
                          ? r.ce_amount / r.exchange_rate
                          : r.ce_amount)}
                      </div>
                      <div className="text-[9px] text-muted-foreground">{r.ce_pct}% del neto</div>
                    </td>

                    {/* RD$ Propietario */}
                    <td className="px-3 py-2.5 text-right font-mono text-[#0F2B4C] font-semibold">
                      {ownerRDS(r) > 0 ? fmtRDSd(ownerRDS(r)) : "—"}
                    </td>

                    {/* RD$ CE */}
                    <td className="px-3 py-2.5 text-right font-mono text-amber-800 font-semibold">
                      {rCE > 0 ? fmtRDSd(rCE) : "—"}
                    </td>

                    {/* Observaciones */}
                    <td className="px-3 py-2.5 max-w-[160px]">
                      {r.notes ? (
                        <span
                          className="block text-[10px] text-muted-foreground leading-snug truncate"
                          title={r.notes}
                        >
                          {r.notes}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/30 text-[10px]">—</span>
                      )}
                    </td>

                    {/* Acciones — suprime el tooltip al pasar el cursor */}
                    <td
                      className="px-3 py-2.5"
                      onMouseEnter={(e) => { e.stopPropagation(); setHoveredRes(null); }}
                    >
                      <div className="flex gap-0.5 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => { setEditingRes(r); setResFormOpen(true); }}>
                          <Pencil size={11} />
                        </Button>
                        <Button variant="ghost" size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeletingRes(r)}>
                          <Trash2 size={11} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Table footer totals */}
            <tfoot>
              <tr className="border-t-2 border-[#0F2B4C]/15 bg-[#0F2B4C]/5">
                <td colSpan={11} className="px-3 py-2.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-[#2D6A9F]" />
                    {footConfirmed.length} confirmada{footConfirmed.length !== 1 ? "s" : ""}
                    {filtered.length !== reservations.length && (
                      <span className="text-amber-600 font-medium ml-1">· {filtered.length} mostradas</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-bold">{fmtUSD(footGross)}</td>
                <td colSpan={4} className="px-3 py-2.5 text-center font-mono text-red-500 text-[10px] bg-red-50/60">
                  <span className="text-muted-foreground/50 font-normal">total deducciones </span>−{fmtUSD(footDeduct)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-bold text-[#2D6A9F]">{fmtUSD(footNet)}</td>
                <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">{fmtUSD(footOwner)}</td>
                <td className="px-3 py-2.5 text-right font-mono font-bold text-amber-700">{fmtUSD(footCE)}</td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          </table>
        </div>
        </>
      )}

      {/* ── Total General Summary ─────────────────────────────────────────── */}
      <TotalGeneralSection
        reservations={filtered}
        month={month}
        year={year}
        daysInMonth={daysInMonth}
        defaultPayoutRate={selectedProp?.reference_rate ?? 0}
      />

      {/* ── Dialogs ───────────────────────────────────────────────────────── */}
      {propId && (
        <ReservationFormDialog
          open={resFormOpen}
          onOpenChange={(v) => { setResFormOpen(v); if (!v) setEditingRes(null); }}
          editing={editingRes} propertyId={propId} month={month} year={year}
          platforms={platforms} defaultRate={selectedProp?.reference_rate ?? 60}
          onSave={handleSaveRes} saving={resSaving}
          maintenanceTickets={maintenanceTickets}
        />
      )}

      <Dialog open={!!deletingRes} onOpenChange={() => setDeletingRes(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-destructive" />Eliminar reserva
            </DialogTitle>
            <DialogDescription>
              ¿Eliminar la reserva de <strong>{deletingRes?.guest_name}</strong> del {deletingRes?.checkin}?
              La reserva se movera a la seccion de eliminadas y podra ser restaurada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingRes(null)} disabled={deleteRes.isPending}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteRes} disabled={deleteRes.isPending}>
              {deleteRes.isPending ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Deleted reservations panel ─────────────────────────────────────── */}
      <Dialog open={showDeleted} onOpenChange={setShowDeleted}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive size={18} className="text-slate-500" />
              Reservas eliminadas
            </DialogTitle>
            <DialogDescription>
              {deletedReservations.length === 0
                ? "No hay reservas eliminadas para esta propiedad."
                : `${deletedReservations.length} reserva${deletedReservations.length !== 1 ? "s" : ""} eliminada${deletedReservations.length !== 1 ? "s" : ""}. Puedes restaurarlas para que vuelvan a aparecer.`}
            </DialogDescription>
          </DialogHeader>
          {deletedReservations.length > 0 && (
            <div className="overflow-y-auto flex-1 -mx-6 px-6">
              <div className="space-y-2">
                {deletedReservations.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-slate-50/80">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0F2B4C] truncate">{r.guest_name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span>{r.checkin} → {r.checkout}</span>
                        <span>{r.platform}</span>
                        <span className="font-mono">${r.gross_amount.toLocaleString()}</span>
                        <span className="text-red-500">
                          Eliminada: {new Date(r.deleted_at!).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      disabled={restoreRes.isPending}
                      onClick={() => {
                        restoreRes.mutate(
                          { id: r.id, property_id: r.property_id, period_month: r.period_month, period_year: r.period_year },
                          {
                            onSuccess: () => toast({ title: "Reserva restaurada", description: `Reserva de ${r.guest_name} restaurada correctamente.` }),
                            onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
                          }
                        );
                      }}
                    >
                      <RotateCcw size={12} />
                      Restaurar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Hover tooltip ─────────────────────────────────────────────────── */}
      {hoveredRes && !resFormOpen && !deletingRes && (
        <ReservationTooltip r={hoveredRes} x={tooltipPos.x} y={tooltipPos.y} />
      )}
    </div>
    </div>
  );
}
