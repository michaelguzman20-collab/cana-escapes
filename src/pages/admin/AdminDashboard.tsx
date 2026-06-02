import { useState, useMemo, useCallback } from "react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Building2,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Home,
  Briefcase,
  Moon,
  Award,
  Banknote,
  Target,
  AlertTriangle,
  Globe,
  Users,
  Star,
  Clock,
  GripVertical,
  RotateCcw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
  AreaChart, Area,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useProperties } from "@/hooks/useProperties";
import { useReservations, useCreateReservation, useUpdateReservation, useDeleteReservation, useAllReservations } from "@/hooks/useReservations";
import { useProperty } from "@/contexts/PropertyContext";
import { useBrackets, getActiveBracket } from "@/hooks/useBrackets";
import { usePlatformConfigs } from "@/hooks/usePlatformConfigs";
import { useMaintenanceTickets } from "@/hooks/useMaintenance";
import { ReservationFormDialog } from "./ReservationFormDialog";
import type { Reservation, Bracket } from "@/types/database";

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

// ── Formatters ───────────────────────────────────────────────────────────────
function fmtUSD(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);
}
function fmtRDS(n: number) {
  return `RD$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)}`;
}

// ── Brand colors ─────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  Completada: "#059669",  // emerald-600
  Pendiente:  "#2D6A9F",  // ocean blue
  Cancelada:  "#ef4444",  // red-500
};
const STATUS_LABEL: Record<string, string> = {
  Completada: "Completada",
  Pendiente:  "Reservado",
  Cancelada:  "Cancelada",
};

// ── Accent palette ───────────────────────────────────────────────────────────
type Accent = "navy" | "ocean" | "emerald" | "amber" | "teal" | "rose";
const ACCENT: Record<Accent, { top: string; val: string; pill: string }> = {
  navy:    { top: "bg-[#0F2B4C]",   val: "text-[#0F2B4C]",  pill: "bg-[#0F2B4C]/10 text-[#0F2B4C]"  },
  ocean:   { top: "bg-[#2D6A9F]",   val: "text-[#2D6A9F]",  pill: "bg-[#2D6A9F]/10 text-[#2D6A9F]"  },
  emerald: { top: "bg-emerald-600", val: "text-emerald-700", pill: "bg-emerald-50 text-emerald-700" },
  amber:   { top: "bg-amber-600",   val: "text-amber-700",   pill: "bg-amber-50 text-amber-700"     },
  teal:    { top: "bg-teal-600",    val: "text-teal-700",    pill: "bg-teal-50 text-teal-700"       },
  rose:    { top: "bg-rose-600",    val: "text-rose-700",    pill: "bg-rose-50 text-rose-700"       },
};

// ── KPI Card (Reservas style) ────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, accent = "navy", badge,
}: {
  label: string; value: string; sub?: string;
  icon?: React.ElementType; accent?: Accent; badge?: string;
}) {
  const a = ACCENT[accent];
  return (
    <div className="rounded-xl overflow-hidden shadow-sm border border-black/[0.08]">
      <div className={`${a.top} px-4 py-2.5 flex items-center justify-between`}>
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/75">{label}</span>
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <Icon size={15} strokeWidth={2} className="text-white" />
          </div>
        )}
      </div>
      <div className="bg-white px-4 pt-3 pb-3">
        <p className={`text-xl font-serif font-bold truncate ${a.val}`}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
        {badge && (
          <span className={`mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${a.pill}`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Next Bracket Progress ─────────────────────────────────────────────────────
function NextBracketCard({ currentGross, brackets }: { currentGross: number; brackets: Bracket[] }) {
  if (!brackets.length) return null;
  const sorted = [...brackets].sort((a, b) => a.sort_order - b.sort_order);
  const currentBracket = getActiveBracket(brackets, currentGross);
  const currentIdx = currentBracket ? sorted.findIndex((b) => b.id === currentBracket.id) : -1;
  const nextBracket = currentIdx >= 0 && currentIdx < sorted.length - 1 ? sorted[currentIdx + 1] : null;

  if (!nextBracket) {
    return (
      <Card className="overflow-hidden border border-amber-200">
        <div className="h-[3px] w-full bg-gradient-to-r from-amber-400 to-emerald-500" />
        <CardContent className="px-5 pt-4 pb-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Award size={16} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Bracket máximo</p>
            <p className="text-sm font-semibold text-emerald-700 mt-0.5">¡Estás en el bracket más alto! 🏆</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const toNext = Math.max(0, nextBracket.range_min - currentGross);
  const pct    = nextBracket.range_min > 0 ? Math.min(100, (currentGross / nextBracket.range_min) * 100) : 100;

  return (
    <Card className="overflow-hidden border border-[#2D6A9F]/20 col-span-2 sm:col-span-2">
      <div className="h-[3px] w-full bg-gradient-to-r from-[#2D6A9F] to-amber-400" />
      <CardContent className="px-5 pt-4 pb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#2D6A9F]/10 text-[#2D6A9F] flex items-center justify-center shrink-0 mt-0.5">
              <Target size={16} strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Próximo bracket</p>
              <p className="text-[1.35rem] font-serif font-bold text-foreground mt-1 leading-none">
                {fmtUSD(toNext)}{" "}
                <span className="text-sm font-normal text-muted-foreground">por recaudar</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Al llegar: <strong className="text-foreground">Prop. {nextBracket.owner_pct}%</strong>
                {" · "}<strong className="text-[#2D6A9F]">CE {nextBracket.ce_pct}%</strong>
                {nextBracket.description && <span className="ml-1">— {nextBracket.description}</span>}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Umbral</p>
            <p className="text-sm font-mono font-bold text-[#0F2B4C] mt-0.5">{fmtUSD(nextBracket.range_min)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{pct.toFixed(1)}% alcanzado</p>
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2D6A9F] to-amber-400 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>{fmtUSD(currentGross)} actual</span>
            <span>{fmtUSD(nextBracket.range_min)} objetivo</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Bracket Table ─────────────────────────────────────────────────────────────
function BracketTable({ brackets, grossUSD, activeBracket }: {
  brackets: Bracket[]; grossUSD: number; activeBracket: Bracket | null;
}) {
  if (!brackets.length) return null;
  const sorted = [...brackets].sort((a, b) => a.sort_order - b.sort_order);

  function rangeLabel(b: Bracket) {
    const min = b.range_min === 0 ? "$0" : fmtUSD(b.range_min);
    const max = b.range_max != null ? fmtUSD(b.range_max) : null;
    return max ? `${min} — ${max}` : `${min}+`;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#0F2B4C]/15 shadow-sm">
      <div className="bg-[#0F2B4C] px-3 sm:px-5 py-2.5 sm:py-3 flex flex-wrap items-center gap-2 sm:gap-3">
        <BarChart3 size={15} className="text-white/70 shrink-0" />
        <span className="text-white font-bold text-xs sm:text-sm tracking-wide">BRACKETS — ESTADO ACTUAL</span>
        <span className="ml-auto text-white/40 text-[10px] sm:text-xs font-mono">{fmtUSD(grossUSD)}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#0F2B4C]/8 border-b border-[#0F2B4C]/10">
            <th className="text-left   px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0F2B4C]">Rango mensual (USD)</th>
            <th className="text-center px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0F2B4C]">Propietario %</th>
            <th className="text-center px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0F2B4C]">Cana Escapes %</th>
            <th className="text-right  px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0F2B4C]">Total mensual</th>
            <th className="text-center px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0F2B4C]">Estado</th>
            <th className="text-right  px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0F2B4C]">CE ganaría (USD)</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((b) => {
            const isActive = activeBracket?.id === b.id;
            const ceWould  = grossUSD * (b.ce_pct / 100);
            return (
              <tr key={b.id} className={`border-b last:border-0 transition-colors ${isActive ? "bg-amber-50/80 border-amber-200" : "hover:bg-[#0F2B4C]/[0.025]"}`}>
                <td className="px-5 py-3 font-mono text-sm font-medium">{rangeLabel(b)}</td>
                <td className="px-4 py-3 text-center"><span className="text-base font-bold text-emerald-700">{b.owner_pct}%</span></td>
                <td className="px-4 py-3 text-center"><span className="text-base font-bold text-[#2D6A9F]">{b.ce_pct}%</span></td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">{grossUSD > 0 ? fmtUSD(grossUSD) : "—"}</td>
                <td className="px-4 py-3 text-center">
                  {isActive
                    ? <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-full px-3 py-0.5 text-xs font-bold whitespace-nowrap">◄ ACTIVO</span>
                    : <span className="text-muted-foreground/30 text-xs">—</span>}
                </td>
                <td className={`px-5 py-3 text-right font-mono font-bold ${isActive ? "text-[#2D6A9F] text-base" : "text-muted-foreground"}`}>
                  {grossUSD > 0 ? fmtUSD(ceWould) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-[#0F2B4C]/5 border-t-2 border-[#0F2B4C]/15">
            <td colSpan={3} className="px-5 py-3 text-xs text-muted-foreground font-semibold">Total mensual equiv. USD actual:</td>
            <td className="px-4 py-3 text-right font-mono font-bold text-[#0F2B4C] text-[1.1rem]">{fmtUSD(grossUSD)}</td>
            <td colSpan={2} className="px-5 py-3 text-xs text-muted-foreground italic">← Este monto determina el bracket activo</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Efficiency Chart ──────────────────────────────────────────────────────────
function EfficiencyChart({ reservations }: { reservations: Reservation[] }) {
  const sorted = [...reservations]
    .filter((r) => r.currency === "USD")
    .sort((a, b) => a.checkin.localeCompare(b.checkin));

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Sin reservas para mostrar en la gráfica
      </div>
    );
  }

  const chartData = sorted.map((r) => ({
    name: r.guest_name.split(" ")[0],
    checkin: r.checkin.slice(5),          // MM-DD
    bruto: r.gross_amount,
    neto: r.net_amount,
    propietario: r.owner_amount,
    ce: r.ce_amount,
    status: r.status,
    fullName: r.guest_name,
    platform: r.platform,
  }));

  // Status breakdown for pie
  const countByStatus = reservations.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(countByStatus).map(([status, count]) => ({
    name: STATUS_LABEL[status] ?? status,
    value: count,
    color: STATUS_COLOR[status] ?? "#999",
  }));

  // Custom tooltip
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    const color = STATUS_COLOR[d.status] ?? "#999";
    return (
      <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-xs space-y-1 min-w-[160px]">
        <p className="font-bold text-foreground">{d.fullName}</p>
        <p className="text-muted-foreground">{d.platform} · Check-in {d.checkin}</p>
        <div className="border-t pt-1 space-y-0.5">
          <p>Bruto: <span className="font-mono font-semibold">{fmtUSD(d.bruto)}</span></p>
          <p>Neto: <span className="font-mono font-semibold text-[#2D6A9F]">{fmtUSD(d.neto)}</span></p>
          <p>Propietario: <span className="font-mono font-semibold text-emerald-700">{fmtUSD(d.propietario)}</span></p>
          <p>Cana Escapes: <span className="font-mono font-semibold text-amber-700">{fmtUSD(d.ce)}</span></p>
        </div>
        <div className="border-t pt-1 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span style={{ color }}>{STATUS_LABEL[d.status]}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px] gap-4">
      {/* Bar chart */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">
          Ingreso por reserva (USD)
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="checkin"
              tick={{ fontSize: 10, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 10, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#0F2B4C08" }} />
            <Bar dataKey="bruto" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={STATUS_COLOR[entry.status] ?? "#2D6A9F"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 justify-center">
          {Object.entries(STATUS_COLOR).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
              {STATUS_LABEL[status]}
            </div>
          ))}
        </div>
      </div>

      {/* Pie chart - status distribution */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">
          Estado
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={68}
              paddingAngle={3}
              dataKey="value"
            >
              {pieData.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [value, name]}
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-1 mt-1">
          {pieData.map((d) => (
            <div key={d.name} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-muted-foreground">{d.name}</span>
              </div>
              <span className="font-bold text-foreground">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Platform palette (consistent colors per platform name) ───────────────────
const PLATFORM_COLORS = [
  "#0F2B4C","#2D6A9F","#F0A030","#059669","#8b5cf6","#ef4444",
  "#0891b2","#d97706","#7c3aed","#dc2626","#0284c7","#16a34a",
];
function platformColor(_name: string, index: number) {
  return PLATFORM_COLORS[index % PLATFORM_COLORS.length];
}

// ── Platform Performance Chart ────────────────────────────────────────────────
type PlatformStat = {
  platform: string; gross: number; net: number;
  count: number; avgNights: number; color: string;
};

function PlatformChart({ data }: { data: PlatformStat[] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Sin datos de reservas para mostrar
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.gross - a.gross);
  const totalCount = data.reduce((s, d) => s + d.count, 0);
  const pieData = sorted.map((d) => ({ name: d.platform, value: d.count, color: d.color }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BarTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload as PlatformStat;
    return (
      <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-xs space-y-1 min-w-[155px]">
        <p className="font-bold text-foreground">{d.platform}</p>
        <div className="border-t pt-1 space-y-0.5">
          <p>Bruto: <span className="font-mono font-semibold">{fmtUSD(d.gross)}</span></p>
          <p>Neto: <span className="font-mono font-semibold text-[#2D6A9F]">{fmtUSD(d.net)}</span></p>
          <p>Reservas: <span className="font-semibold">{d.count}</span></p>
          <p>Prom. noches: <span className="font-semibold">{d.avgNights.toFixed(1)}</span></p>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-6">
      {/* Horizontal bar chart */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">
          Ingreso bruto por plataforma (USD)
        </p>
        <ResponsiveContainer width="100%" height={Math.max(160, sorted.length * 44)}>
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            barSize={20}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 10, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="platform"
              tick={{ fontSize: 11, fill: "#374151", fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip content={<BarTooltip />} cursor={{ fill: "#0F2B4C06" }} />
            <Bar dataKey="gross" radius={[0, 4, 4, 0]}>
              {sorted.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Donut + table */}
      <div className="flex flex-col gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Distribución de reservas
        </p>
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={60}
              paddingAngle={3}
              dataKey="value"
            >
              {pieData.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value} reservas`, name]}
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-1.5">
          {sorted.map((d) => (
            <div key={d.platform} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-muted-foreground truncate">{d.platform}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-foreground">{d.count}</span>
                <span className="text-muted-foreground/60">
                  ({totalCount > 0 ? ((d.count / totalCount) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tendencia 12 meses ────────────────────────────────────────────────────────
type TrendPoint = { label: string; bruto: number; neto: number; reservas: number };

function TrendChart({ data }: { data: TrendPoint[] }) {
  if (!data.length || data.every((d) => d.bruto === 0)) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Sin historial suficiente para mostrar la tendencia
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TrendTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-xs space-y-1 min-w-[150px]">
        <p className="font-bold text-foreground">{label}</p>
        <div className="border-t pt-1 space-y-0.5">
          <p>Bruto: <span className="font-mono font-semibold text-[#0F2B4C]">{fmtUSD(payload[0]?.value ?? 0)}</span></p>
          <p>Neto: <span className="font-mono font-semibold text-[#2D6A9F]">{fmtUSD(payload[1]?.value ?? 0)}</span></p>
          <p>Reservas: <span className="font-semibold">{payload[0]?.payload?.reservas}</span></p>
        </div>
      </div>
    );
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradBruto" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#0F2B4C" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#0F2B4C" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="gradNeto" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#2D6A9F" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#2D6A9F" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 10, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <Tooltip content={<TrendTooltip />} />
          <Area
            type="monotone"
            dataKey="bruto"
            stroke="#0F2B4C"
            strokeWidth={2}
            fill="url(#gradBruto)"
            dot={{ r: 3, fill: "#0F2B4C", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            name="Bruto"
          />
          <Area
            type="monotone"
            dataKey="neto"
            stroke="#2D6A9F"
            strokeWidth={2}
            fill="url(#gradNeto)"
            dot={{ r: 3, fill: "#2D6A9F", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            name="Neto"
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-5 mt-2 justify-center">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="w-3 h-0.5 bg-[#0F2B4C] rounded-full" />
          Bruto
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="w-3 h-0.5 bg-[#2D6A9F] rounded-full" />
          Neto
        </div>
      </div>
    </div>
  );
}

// ── Sortable dashboard sections ───────────────────────────────────────────────
type SectionId =
  | "resumen"
  | "rendimiento"
  | "plataformas_chart"
  | "tendencia"
  | "eficiencia"
  | "bracket_info";

const SECTION_LABELS: Record<SectionId, string> = {
  resumen:          "Resumen financiero",
  rendimiento:      "Métricas de rendimiento",
  plataformas_chart:"Desempeño por plataforma",
  tendencia:        "Tendencia 12 meses",
  eficiencia:       "Eficiencia del mes",
  bracket_info:     "Ocupación y Brackets",
};

const DEFAULT_ORDER: SectionId[] = [
  "resumen",
  "rendimiento",
  "plataformas_chart",
  "tendencia",
  "eficiencia",
  "bracket_info",
];

const STORAGE_KEY = "cana_dashboard_order";

function loadOrder(): SectionId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SectionId[];
      if (DEFAULT_ORDER.every((id) => parsed.includes(id)) && parsed.length === DEFAULT_ORDER.length) {
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_ORDER;
}

function SortableSection({ id, children }: { id: SectionId; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="group relative">
      {/* Drag handle — floats at top-right, visible on hover */}
      <div
        {...attributes}
        {...listeners}
        title={`Mover: ${SECTION_LABELS[id]}`}
        className="absolute -top-2.5 right-0 z-20 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing bg-white/95 border border-[#0F2B4C]/15 shadow-sm rounded-full px-2.5 py-1 flex items-center gap-1.5 text-[10px] font-medium text-[#0F2B4C]/50 hover:text-[#0F2B4C] select-none transition-all"
      >
        <GripVertical size={11} strokeWidth={2.5} />
        mover
      </div>
      {children}
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export function AdminDashboard() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const [resFormOpen,  setResFormOpen]  = useState(false);
  const [editingRes,   setEditingRes]   = useState<Reservation | null>(null);
  const [deletingRes,  setDeletingRes]  = useState<Reservation | null>(null);

  // ── Global property context ──────────────────────────────────────────────
  const { selectedPropertyId, selectedProperty: selectedProp } = useProperty();
  const propId = selectedPropertyId;

  const { data: properties = [], isLoading: propsLoading } = useProperties();
  const { data: platforms  = [] } = usePlatformConfigs();
  const { data: brackets   = [] } = useBrackets();
  const { data: maintenanceTickets = [] } = useMaintenanceTickets();
  const { data: allGlobalRes = [] } = useAllReservations(propId);

  const { data: reservations = [] } = useReservations(propId, month, year);
  const createRes  = useCreateReservation();
  const updateRes  = useUpdateReservation();
  const deleteRes  = useDeleteReservation();

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const confirmed    = reservations.filter((r) => r.status === "Completada" || r.status === "Confirmada");
    const pending      = reservations.filter((r) => r.status === "Pendiente");
    const active       = reservations.filter((r) => r.status !== "Cancelada");
    const toUSD        = (r: Reservation, val: number) =>
      r.currency === "RD$" && r.exchange_rate > 0 ? val / r.exchange_rate : val;
    const sumConf      = (fn: (r: Reservation) => number) =>
      confirmed.reduce((s, r) => s + fn(r), 0);
    const sumPend      = (fn: (r: Reservation) => number) =>
      pending.reduce((s, r) => s + fn(r), 0);

    const grossUSD     = sumConf((r) => toUSD(r, r.gross_amount));
    const netUSD       = sumConf((r) => toUSD(r, r.net_amount));
    const ownerUSD     = sumConf((r) => toUSD(r, r.owner_amount));
    const ceUSD        = sumConf((r) => toUSD(r, r.ce_amount));
    const ownerRDS     = confirmed.reduce((s, r) => s + r.owner_rds, 0);
    const nightsTotal  = confirmed.reduce((s, r) => s + r.nights, 0);

    const projGrossUSD = sumPend((r) => toUSD(r, r.gross_amount));
    const projNetUSD   = sumPend((r) => toUSD(r, r.net_amount));
    const projOwnerUSD = sumPend((r) => toUSD(r, r.owner_amount));

    const daysInMonth  = new Date(year, month, 0).getDate();
    const bracket      = getActiveBracket(brackets, grossUSD);
    const sortedBkt    = [...brackets].sort((a, b) => a.sort_order - b.sort_order);
    const currIdx      = bracket ? sortedBkt.findIndex((b) => b.id === bracket.id) : -1;
    const nextBracket  = currIdx >= 0 && currIdx < sortedBkt.length - 1 ? sortedBkt[currIdx + 1] : null;

    const completadas  = confirmed.length;
    const reservadas   = pending.length;
    const canceladas   = reservations.filter((r) => r.status === "Cancelada").length;
    const eficiencia   = active.length > 0
      ? Math.round((completadas / (active.length + canceladas)) * 100)
      : 0;

    const confirmedRDS = confirmed.filter((r) => r.currency === "RD$" && r.exchange_rate > 0);
    const totalRDSBruto = confirmedRDS.reduce((s, r) => s + r.gross_amount, 0);
    const weightedAvgRate = totalRDSBruto > 0
      ? confirmedRDS.reduce((s, r) => s + r.gross_amount * r.exchange_rate, 0) / totalRDSBruto
      : 0;
    const payoutRate = weightedAvgRate > 0
      ? Math.round(weightedAvgRate * 100) / 100
      : (selectedProp?.reference_rate ?? 0);
    const ownerAtPayout = payoutRate > 0
      ? confirmedRDS.reduce((s, r) => s + r.owner_amount / payoutRate, 0)
        + confirmed.filter((r) => r.currency !== "RD$").reduce((s, r) => s + r.owner_amount, 0)
      : ownerUSD;
    const payoutDiff = ownerAtPayout - ownerUSD;

    return {
      grossUSD, netUSD, ownerUSD, ceUSD, ownerRDS,
      projGrossUSD, projNetUSD, projOwnerUSD,
      nightsTotal, daysInMonth, bracket, nextBracket,
      count: active.length, completadas, reservadas, canceladas, eficiencia,
      payoutRate, ownerAtPayout, payoutDiff,
    };
  }, [reservations, brackets, month, year, selectedProp]);

  // ── Platform stats (all-time, all properties, unified USD) ──────────────
  const platformData = useMemo<PlatformStat[]>(() => {
    const map = new Map<string, { gross: number; net: number; count: number; nights: number }>();
    for (const r of allGlobalRes) {
      if (r.status !== "Completada" && r.status !== "Confirmada") continue;
      const fx   = r.currency === "RD$" && r.exchange_rate > 0 ? r.exchange_rate : 1;
      const prev = map.get(r.platform) ?? { gross: 0, net: 0, count: 0, nights: 0 };
      map.set(r.platform, {
        gross:  prev.gross  + r.gross_amount / fx,
        net:    prev.net    + r.net_amount   / fx,
        count:  prev.count  + 1,
        nights: prev.nights + r.nights,
      });
    }
    return Array.from(map.entries()).map(([platform, stats], idx) => ({
      platform,
      gross:     stats.gross,
      net:       stats.net,
      count:     stats.count,
      avgNights: stats.count > 0 ? stats.nights / stats.count : 0,
      color:     platformColor(platform, idx),
    }));
  }, [allGlobalRes]);

  // ── 12-month trend (all properties, unified USD) ───────────────────────────
  const trendData = useMemo<TrendPoint[]>(() => {
    const points: TrendPoint[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const label = `${["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][m - 1]} ${String(y).slice(2)}`;
      const slice = allGlobalRes.filter(
        (r) => r.period_month === m && r.period_year === y && (r.status === "Completada" || r.status === "Confirmada")
      );
      points.push({
        label,
        bruto:    slice.reduce((s, r) => { const fx = r.currency === "RD$" && r.exchange_rate > 0 ? r.exchange_rate : 1; return s + r.gross_amount / fx; }, 0),
        neto:     slice.reduce((s, r) => { const fx = r.currency === "RD$" && r.exchange_rate > 0 ? r.exchange_rate : 1; return s + r.net_amount / fx; }, 0),
        reservas: slice.length,
      });
    }
    return points;
  }, [allGlobalRes]);

  // ── Performance KPIs (current property + month) ───────────────────────────
  const perfKpis = useMemo(() => {
    const active = reservations.filter((r) => r.status === "Completada" || r.status === "Confirmada");
    const totalNights = active.reduce((s, r) => s + r.nights, 0);
    const grossUSDAll = active.reduce((s, r) => {
      const fx = r.currency === "RD$" && r.exchange_rate > 0 ? r.exchange_rate : 1;
      return s + r.gross_amount / fx;
    }, 0);
    const adr = (active.length > 0 && totalNights > 0) ? grossUSDAll / totalNights : 0;
    const avgStay = active.length > 0 ? totalNights / active.length : 0;

    // unique guest names (approx) for this month
    const uniqueGuests = new Set(active.map((r) => r.guest_name.trim().toLowerCase())).size;

    // best platform by gross
    const byPlatform = new Map<string, number>();
    for (const r of active) {
      const fx = r.currency === "RD$" && r.exchange_rate > 0 ? r.exchange_rate : 1;
      byPlatform.set(r.platform, (byPlatform.get(r.platform) ?? 0) + r.gross_amount / fx);
    }
    let bestPlatform = "—";
    let bestGross    = 0;
    byPlatform.forEach((g, p) => { if (g > bestGross) { bestGross = g; bestPlatform = p; } });

    return { adr, avgStay, uniqueGuests, bestPlatform };
  }, [reservations]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  async function handleSaveRes(data: Omit<Reservation, "id" | "created_at" | "deleted_at">) {
    const newGrossUSD = data.currency === "RD$" && data.exchange_rate > 0 ? data.gross_amount / data.exchange_rate : data.gross_amount;
    const bracket  = getActiveBracket(brackets, kpis.grossUSD + newGrossUSD);
    const ownerPct = bracket?.owner_pct ?? 70;
    const cePct    = bracket?.ce_pct    ?? 30;
    const finalData = {
      ...data,
      owner_pct:    ownerPct,
      owner_amount: data.net_amount * (ownerPct / 100),
      ce_pct:       cePct,
      ce_amount:    data.net_amount * (cePct / 100),
      owner_rds:    data.net_amount * (ownerPct / 100) * data.exchange_rate,
    };
    if (editingRes) {
      await updateRes.mutateAsync({ id: editingRes.id, ...finalData });
    } else {
      await createRes.mutateAsync(finalData);
    }
    setResFormOpen(false);
    setEditingRes(null);
  }

  async function handleDeleteRes() {
    if (!deletingRes) return;
    await deleteRes.mutateAsync({
      id: deletingRes.id, property_id: deletingRes.property_id,
      period_month: deletingRes.period_month, period_year: deletingRes.period_year,
    });
    setDeletingRes(null);
  }

  const resSaving = createRes.isPending  || updateRes.isPending;

  // ── Drag-and-drop section order ───────────────────────────────────────────
  const [sectionOrder, setSectionOrder] = useState<SectionId[]>(loadOrder);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSectionOrder((prev) => {
        const oldIdx = prev.indexOf(active.id as SectionId);
        const newIdx = prev.indexOf(over.id as SectionId);
        const next   = arrayMove(prev, oldIdx, newIdx);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }
  }, []);

  function resetOrder() {
    localStorage.removeItem(STORAGE_KEY);
    setSectionOrder(DEFAULT_ORDER);
  }

  // ── Section renderer ──────────────────────────────────────────────────────
  function renderSection(id: SectionId) {
    switch (id) {

      case "resumen":
        return (
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2D6A9F] mb-3">Resumen financiero</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <KpiCard label="Ingreso bruto"     value={fmtUSD(kpis.grossUSD)}               sub={`${kpis.count} reserva${kpis.count !== 1 ? "s" : ""} activas`}   icon={TrendingUp} accent="navy"    />
              <KpiCard label="Total deducciones" value={fmtUSD(kpis.grossUSD - kpis.netUSD)} sub="Com. plataforma + tarjeta + extras"                              icon={BarChart3}  accent="rose"    />
              <KpiCard label="Neto disponible"   value={fmtUSD(kpis.netUSD)}                 sub="Después de todas las deducciones"                               icon={BarChart3}  accent="ocean"   />
              <KpiCard label="Propietario"       value={fmtUSD(kpis.ownerUSD)}               sub={kpis.bracket ? `${kpis.bracket.owner_pct}% del neto` : undefined} icon={Home}       accent="emerald" />
              <div className="col-span-2 sm:col-span-1">
                <KpiCard label="Cana Escapes"      value={fmtUSD(kpis.ceUSD)}                  sub={kpis.bracket ? `${kpis.bracket.ce_pct}% del neto` : undefined}   icon={Briefcase}  accent="amber"   />
              </div>
            </div>
            {kpis.payoutRate > 0 && (
              <div className="rounded-lg border border-[#0F2B4C]/15 bg-[#0F2B4C]/[0.03] p-3 flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tasa de pago</span>
                  <span className="font-mono font-semibold text-[#0F2B4C]">RD${kpis.payoutRate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase text-muted-foreground">Propietario a tasa de pago</span>
                  <span className="font-mono font-semibold">{fmtUSD(kpis.ownerAtPayout)}</span>
                </div>
                {kpis.payoutDiff !== 0 && (
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase ${kpis.payoutDiff >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {kpis.payoutDiff >= 0 ? "Ganancia" : "Pérdida"}
                    </span>
                    <span className={`font-mono font-bold ${kpis.payoutDiff >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {kpis.payoutDiff >= 0 ? "+" : ""}{fmtUSD(kpis.payoutDiff)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case "rendimiento":
        return (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2D6A9F] mb-3">Métricas de rendimiento</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="ADR (tarifa diaria)"   value={perfKpis.adr > 0 ? fmtUSD(perfKpis.adr) : "—"}                           sub="Ingreso bruto ÷ noches"          icon={Banknote} accent="navy"    />
              <KpiCard label="Estancia promedio"     value={perfKpis.avgStay > 0 ? `${perfKpis.avgStay.toFixed(1)} noches` : "—"}     sub="Duración media por reserva"      icon={Clock}    accent="ocean"   />
              <KpiCard label="Huéspedes únicos"      value={perfKpis.uniqueGuests > 0 ? String(perfKpis.uniqueGuests) : "—"}           sub="Este mes en esta propiedad"      icon={Users}    accent="teal"    />
              <KpiCard label="Plataforma líder"      value={perfKpis.bestPlatform}                                                     sub="Mayor ingreso bruto del mes"     icon={Star}     accent="amber"   />
            </div>
          </div>
        );

      case "plataformas_chart":
        return (
          <Card className="overflow-hidden border border-[#0F2B4C]/10">
            <div className="bg-[#0F2B4C] px-3 sm:px-5 py-2.5 sm:py-3 flex flex-wrap items-center gap-2 sm:gap-3">
              <Globe size={15} className="text-white/70 shrink-0" />
              <span className="text-white font-bold text-xs sm:text-sm tracking-wide">DESEMPEÑO POR PLATAFORMA</span>
              <span className="ml-auto text-white/40 text-[10px] sm:text-xs font-mono">
                {platformData.reduce((s, d) => s + d.count, 0)} reservas · {fmtUSD(platformData.reduce((s, d) => s + d.gross, 0))}
              </span>
            </div>
            <CardContent className="px-5 pt-5 pb-4">
              <PlatformChart data={platformData} />
            </CardContent>
          </Card>
        );

      case "tendencia":
        return (
          <Card className="overflow-hidden border border-[#0F2B4C]/10">
            <div className="bg-[#0F2B4C] px-3 sm:px-5 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
              <TrendingUp size={15} className="text-white/70 shrink-0" />
              <span className="text-white font-bold text-xs sm:text-sm tracking-wide">TENDENCIA 12 MESES (USD)</span>
            </div>
            <CardContent className="px-5 pt-5 pb-4">
              <TrendChart data={trendData} />
            </CardContent>
          </Card>
        );

      case "eficiencia":
        return (
          <Card className="overflow-hidden border border-[#0F2B4C]/10">
            <div className="bg-[#0F2B4C] px-3 sm:px-5 py-2.5 sm:py-3 flex flex-wrap items-center gap-2 sm:gap-3">
              <BarChart3 size={15} className="text-white/70 shrink-0" />
              <span className="text-white font-bold text-xs sm:text-sm tracking-wide">
                EFICIENCIA — {MONTHS_ES[month - 1].toUpperCase()} {year}
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-white/60">
                <span>✓ {kpis.completadas}</span>
                <span>○ {kpis.reservadas}</span>
                {kpis.canceladas > 0 && <span>✗ {kpis.canceladas}</span>}
                <span className="text-white/80 font-semibold">{kpis.eficiencia}%</span>
              </div>
            </div>
            <CardContent className="px-5 pt-5 pb-4">
              <EfficiencyChart reservations={reservations} />
            </CardContent>
          </Card>
        );

      case "bracket_info":
        return (
          <div className="space-y-6">
            {/* Ocupación y bracket KPIs */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2D6A9F] mb-3">Ocupación y bracket</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard
                  label="Noches ocupadas"
                  value={`${kpis.nightsTotal} / ${kpis.daysInMonth}`}
                  sub={`${((kpis.nightsTotal / kpis.daysInMonth) * 100).toFixed(1)}% ocupación`}
                  icon={Moon} accent="teal"
                />
                <KpiCard
                  label="Bracket activo"
                  value={kpis.bracket ? `${kpis.bracket.owner_pct}% / ${kpis.bracket.ce_pct}%` : "—"}
                  sub={kpis.bracket ? `CE gana ${fmtUSD(kpis.ceUSD)}${kpis.bracket.description ? ` · ${kpis.bracket.description}` : ""}` : "Sin bracket"}
                  icon={Award} accent="amber"
                  badge={kpis.bracket ? `Desde ${fmtUSD(kpis.bracket.range_min)}` : undefined}
                />
                <KpiCard label="Propietario RD$" value={fmtRDS(kpis.ownerRDS)} sub="En pesos dominicanos" icon={Banknote} accent="emerald" />
                {(() => {
                  const sortedBkt = [...brackets].sort((a, b) => a.sort_order - b.sort_order);
                  const currIdx   = kpis.bracket ? sortedBkt.findIndex((b) => b.id === kpis.bracket!.id) : -1;
                  const next      = currIdx >= 0 && currIdx < sortedBkt.length - 1 ? sortedBkt[currIdx + 1] : null;
                  if (!next) return <KpiCard label="Nivel alcanzado" value="Máximo 🏆" sub="¡Estás en el bracket más alto!" icon={Award} accent="amber" />;
                  const toNext = Math.max(0, next.range_min - kpis.grossUSD);
                  return (
                    <KpiCard
                      label="CE próx. bracket"
                      value={fmtUSD(kpis.ceUSD + (kpis.netUSD * ((next.ce_pct - (kpis.bracket?.ce_pct ?? 0)) / 100)))}
                      sub={`CE subiría a ${next.ce_pct}% · Falta ${fmtUSD(toNext)}`}
                      icon={Target} accent="ocean"
                    />
                  );
                })()}
              </div>
            </div>
            {/* Next Bracket progress */}
            {brackets.length > 0 && <NextBracketCard currentGross={kpis.grossUSD} brackets={brackets} />}
            {/* Bracket table */}
            {brackets.length > 0 && <BracketTable brackets={brackets} grossUSD={kpis.grossUSD} activeBracket={kpis.bracket} />}
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="px-3 sm:px-6 pt-6 pb-8 min-h-screen bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8]">
    <div className="max-w-screen-2xl mx-auto animate-fade-in space-y-4 sm:space-y-6 text-sm">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-[#0F2B4C]">Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Resumen ejecutivo del período</p>
        </div>
        <div className="flex gap-2">
          {sectionOrder.join(",") !== DEFAULT_ORDER.join(",") && (
            <Button variant="ghost" size="sm" onClick={resetOrder} className="text-muted-foreground gap-1.5">
              <RotateCcw size={13} />
              Restaurar orden
            </Button>
          )}
          <Button onClick={() => { setEditingRes(null); setResFormOpen(true); }}>
            <Plus size={15} className="mr-2" />
            Nueva reserva
          </Button>
        </div>
      </div>

      {propsLoading ? (
        <div className="h-40 flex items-center justify-center text-muted-foreground">Cargando…</div>
      ) : properties.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <Building2 size={32} className="text-muted-foreground/40" />
            <p className="text-muted-foreground">No hay propiedades configuradas.</p>
            <p className="text-xs text-muted-foreground">Crea una propiedad usando el selector en el menú lateral.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Period navigator ───────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0F2B4C]/5 rounded-xl px-4 py-2.5 -mt-2">
            {selectedProp && (
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-[#0F2B4C]/60" />
                <span className="text-sm font-semibold text-[#0F2B4C]">{selectedProp.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}><ChevronLeft size={16} /></Button>
              <span className="text-sm font-semibold min-w-36 text-center text-[#0F2B4C]">
                {MONTHS_ES[month - 1]} {year}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}><ChevronRight size={16} /></Button>
            </div>
          </div>


          {/* ── Sortable sections ─────────────────────────────────────────── */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
              <div className="space-y-6">
                {sectionOrder.map((id) => (
                  <SortableSection key={id} id={id}>
                    {renderSection(id)}
                  </SortableSection>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}

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
              <AlertTriangle size={18} className="text-destructive" />
              Eliminar reserva
            </DialogTitle>
            <DialogDescription>
              ¿Eliminar la reserva de <strong>{deletingRes?.guest_name}</strong> del {deletingRes?.checkin}?
              Esta acción no se puede deshacer.
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
    </div>
    </div>
  );
}
