import { useState, useMemo, useCallback } from "react";
import {
  Globe, BarChart3, Percent, RotateCcw,
  Star, Hash, DollarSign, Calculator,
  ChevronLeft, ChevronRight, Receipt,
  GripVertical, Download,
} from "lucide-react";
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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAllReservations } from "@/hooks/useReservations";
import { useProperty } from "@/contexts/PropertyContext";
import { usePlatformConfigs } from "@/hooks/usePlatformConfigs";

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtUSD(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);
}
function fmtPct(n: number) {
  return `${n.toFixed(2).replace(/\.?0+$/, "")}%`;
}

// ── Platform color palette ────────────────────────────────────────────────────
const PALETTE = [
  "#0F2B4C","#2D6A9F","#F0A030","#059669","#8b5cf6","#ef4444",
  "#0891b2","#d97706","#7c3aed","#dc2626","#0284c7","#16a34a",
];

// ── KPI mini-card (Reservas style) ────────────────────────────────────────────
function MiniKpi({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string;
  icon?: React.ElementType; color?: string;
}) {
  const c = color ?? "#2D6A9F";
  return (
    <div className="rounded-xl overflow-hidden shadow-sm border border-black/[0.08]">
      <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: c }}>
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/75">{label}</span>
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <Icon size={15} strokeWidth={2} className="text-white" />
          </div>
        )}
      </div>
      <div className="bg-white px-4 pt-3 pb-3">
        <p className="text-xl font-serif font-bold truncate" style={{ color: c }}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ── Percentage Calculator ─────────────────────────────────────────────────────
const QUICK_PCTS = [5, 10, 12, 15, 18, 20, 25, 30];

function PctCalculator() {
  const [base, setBase]    = useState("");
  const [pct,  setPct]     = useState("");
  const [rows, setRows]    = useState<{ label: string; pct: number }[]>([
    { label: "Comisión plataforma", pct: 15 },
    { label: "Cana Escapes (30%)",  pct: 30 },
    { label: "Propietario (70%)",   pct: 70 },
  ]);
  const [newLabel, setNewLabel] = useState("");
  const [newPct,   setNewPct]   = useState("");

  const baseNum = parseFloat(base.replace(/,/g, "")) || 0;
  const pctNum  = parseFloat(pct)  || 0;
  const result  = baseNum * (pctNum / 100);

  function addRow() {
    const p = parseFloat(newPct);
    if (!newLabel.trim() || isNaN(p) || p <= 0) return;
    setRows((r) => [...r, { label: newLabel.trim(), pct: p }]);
    setNewLabel(""); setNewPct("");
  }

  function removeRow(idx: number) {
    setRows((r) => r.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-[#0F2B4C]/10 text-[#0F2B4C] flex items-center justify-center shrink-0">
          <Calculator size={15} strokeWidth={2.2} />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">Calculadora de porcentajes</p>
          <p className="text-[10px] text-muted-foreground">Calcula distribuciones sobre cualquier monto</p>
        </div>
      </div>

      {/* Base amount */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Monto base (USD)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            className="pl-7 font-mono text-base"
          />
        </div>
      </div>

      {/* Single % calculator */}
      <div className="rounded-xl border border-[#2D6A9F]/20 bg-[#2D6A9F]/[0.03] p-4 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#2D6A9F]">Cálculo rápido</p>
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="0"
              value={pct}
              onChange={(e) => setPct(e.target.value)}
              className="pr-7 font-mono"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
          </div>
          <span className="text-muted-foreground text-sm">de</span>
          <span className="font-mono text-sm font-semibold text-foreground">{baseNum > 0 ? fmtUSD(baseNum) : "$—"}</span>
        </div>
        {/* Quick pct buttons */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PCTS.map((p) => (
            <button
              key={p}
              onClick={() => setPct(String(p))}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                pct === String(p)
                  ? "bg-[#0F2B4C] text-white border-[#0F2B4C]"
                  : "border-[#0F2B4C]/20 text-[#0F2B4C]/70 hover:bg-[#0F2B4C]/5"
              }`}
            >
              {p}%
            </button>
          ))}
        </div>
        {/* Result */}
        <div className="bg-white rounded-lg border border-[#2D6A9F]/20 overflow-hidden">
          {/* Percentage amount */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-[#2D6A9F]/10">
            <span className="text-sm text-muted-foreground">
              {pctNum > 0 ? fmtPct(pctNum) : "—"} de {baseNum > 0 ? fmtUSD(baseNum) : "$—"}
            </span>
            <span className="text-[1.3rem] font-serif font-bold text-[#2D6A9F]">
              {baseNum > 0 && pctNum > 0 ? fmtUSD(result) : "—"}
            </span>
          </div>
          {/* Remainder: base - result */}
          <div className="px-4 py-3 flex items-center justify-between bg-[#0F2B4C]/[0.03]">
            <span className="text-sm text-muted-foreground">
              {baseNum > 0 && pctNum > 0
                ? <>{fmtUSD(baseNum)} <span className="text-[#0F2B4C]/50">−</span> {fmtPct(pctNum)}</>
                : "Base − porcentaje"}
            </span>
            <span className="text-[1.3rem] font-serif font-bold text-[#0F2B4C]">
              {baseNum > 0 && pctNum > 0 ? fmtUSD(baseNum - result) : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Multi-row breakdown */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Desglose múltiple</p>
        <div className="space-y-2">
          {rows.map((row, idx) => {
            const amount = baseNum * (row.pct / 100);
            return (
              <div key={idx} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 group">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                  />
                  <span className="text-[12px] text-foreground truncate">{row.label}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0">({fmtPct(row.pct)})</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {baseNum > 0 ? fmtUSD(amount) : "—"}
                  </span>
                  <button
                    onClick={() => removeRow(idx)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive transition-all text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {/* Total check */}
        {rows.length > 0 && baseNum > 0 && (
          <div className="flex items-center justify-between text-[11px] px-3 pt-1 border-t">
            <span className="text-muted-foreground">Total desglose</span>
            <span className="font-mono font-bold text-foreground">
              {fmtUSD(rows.reduce((s, r) => s + baseNum * (r.pct / 100), 0))}
            </span>
          </div>
        )}
        {/* Add row */}
        <div className="flex gap-1.5 pt-1">
          <Input
            placeholder="Concepto"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="flex-1 text-xs h-8"
            onKeyDown={(e) => e.key === "Enter" && addRow()}
          />
          <div className="relative w-20">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="0"
              value={newPct}
              onChange={(e) => setNewPct(e.target.value)}
              className="pr-6 text-xs h-8"
              onKeyDown={(e) => e.key === "Enter" && addRow()}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[11px]">%</span>
          </div>
          <Button size="sm" variant="outline" onClick={addRow} className="h-8 px-3 text-xs">+ Añadir</Button>
        </div>
        {rows.length > 0 && (
          <button
            onClick={() => setRows([])}
            className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <RotateCcw size={10} /> limpiar todo
          </button>
        )}
      </div>
    </div>
  );
}

// ── Sortable sections ─────────────────────────────────────────────────────────
type PlatSectionId =
  | "resumen_kpis"
  | "pagos_mes"
  | "grafica_historica"
  | "grafica_marketing"
  | "detalle_plataformas"
  | "config_comisiones";

const PLAT_SECTION_LABELS: Record<PlatSectionId, string> = {
  resumen_kpis:        "Resumen general",
  pagos_mes:           "Pago a plataformas por mes",
  grafica_historica:   "Gráfica histórica",
  grafica_marketing:   "Gráfica de marketing",
  detalle_plataformas: "Detalle por plataforma",
  config_comisiones:   "Configuración de comisiones",
};

const PLAT_DEFAULT_ORDER: PlatSectionId[] = [
  "resumen_kpis",
  "pagos_mes",
  "grafica_historica",
  "grafica_marketing",
  "detalle_plataformas",
  "config_comisiones",
];

const PLAT_STORAGE_KEY = "cana_plataformas_order";

function loadPlatOrder(): PlatSectionId[] {
  try {
    const raw = localStorage.getItem(PLAT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PlatSectionId[];
      if (
        PLAT_DEFAULT_ORDER.every((id) => parsed.includes(id)) &&
        parsed.length === PLAT_DEFAULT_ORDER.length
      ) return parsed;
    }
  } catch { /* ignore */ }
  return PLAT_DEFAULT_ORDER;
}

function PlatSortableSection({ id, children }: { id: PlatSectionId; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <div
        {...attributes}
        {...listeners}
        title={`Mover: ${PLAT_SECTION_LABELS[id]}`}
        className="absolute -top-2.5 right-0 z-20 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing bg-white/95 border border-[#0F2B4C]/15 shadow-sm rounded-full px-2.5 py-1 flex items-center gap-1.5 text-[10px] font-medium text-[#0F2B4C]/50 hover:text-[#0F2B4C] select-none transition-all"
      >
        <GripVertical size={11} strokeWidth={2.5} />
        mover
      </div>
      {children}
    </div>
  );
}

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

// ── Main page ─────────────────────────────────────────────────────────────────
export function AdminPlataformas() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const { selectedPropertyId } = useProperty();
  const { data: allRes    = [] } = useAllReservations(selectedPropertyId);
  const { data: configs   = [] } = usePlatformConfigs();

  // ── Platform stats from reservation history ───────────────────────────────
  const platformStats = useMemo(() => {
    const map = new Map<string, {
      gross: number; net: number; count: number;
      nights: number; completadas: number; canceladas: number;
      marketing: number;
    }>();
    for (const r of allRes) {
      const prev = map.get(r.platform) ?? { gross: 0, net: 0, count: 0, nights: 0, completadas: 0, canceladas: 0, marketing: 0 };
      const fx   = r.currency === "RD$" && r.exchange_rate > 0 ? r.exchange_rate : 1;
      map.set(r.platform, {
        gross:       prev.gross       + (r.status === "Completada" || r.status === "Confirmada" ? r.gross_amount / fx         : 0),
        net:         prev.net         + (r.status === "Completada" || r.status === "Confirmada" ? r.net_amount / fx            : 0),
        count:       prev.count       + (r.status === "Completada" || r.status === "Confirmada" ? 1                           : 0),
        nights:      prev.nights      + (r.status === "Completada" || r.status === "Confirmada" ? r.nights                    : 0),
        completadas: prev.completadas + (r.status === "Completada" || r.status === "Confirmada" ? 1                          : 0),
        canceladas:  prev.canceladas  + (r.status === "Cancelada"  ? 1                          : 0),
        marketing:   prev.marketing   + (r.status === "Completada" || r.status === "Confirmada" ? (r.marketing_usd ?? 0) / fx : 0),
      });
    }
    return Array.from(map.entries())
      .map(([platform, s], idx) => ({
        platform,
        ...s,
        adr:       s.nights > 0 ? s.gross / s.nights : 0,
        avgStay:   s.count  > 0 ? s.nights / s.count : 0,
        avgGross:  s.count  > 0 ? s.gross  / s.count : 0,
        color:     PALETTE[idx % PALETTE.length],
      }))
      .sort((a, b) => b.gross - a.gross);
  }, [allRes]);

  const totalGross = platformStats.reduce((s, p) => s + p.gross, 0);
  const totalRes   = platformStats.reduce((s, p) => s + p.count, 0);
  const bestPlatform = platformStats[0];

  // ── Monthly platform fees ─────────────────────────────────────────────────
  const monthlyFees = useMemo(() => {
    const map = new Map<string, { fee: number; gross: number; count: number; color: string; comm: number; marketing: number }>();
    const activeRes = allRes.filter(
      (r) => r.period_month === month && r.period_year === year &&
             (r.status === "Completada" || r.status === "Confirmada")
    );
    activeRes.forEach((r) => {
      const fx        = r.currency === "RD$" && r.exchange_rate > 0 ? r.exchange_rate : 1;
      const fee       = Math.max(0, (r.gross_amount - r.net_amount) / fx);
      const comm      = (r.platform_comm_usd ?? 0) / fx;
      const marketing = (r.marketing_usd ?? 0) / fx;
      const prev = map.get(r.platform) ?? { fee: 0, gross: 0, count: 0, color: "", comm: 0, marketing: 0 };
      map.set(r.platform, {
        fee:       prev.fee       + fee,
        gross:     prev.gross     + r.gross_amount / fx,
        count:     prev.count     + 1,
        color:     "",
        comm:      prev.comm      + comm,
        marketing: prev.marketing + marketing,
      });
    });
    const sorted = Array.from(map.entries())
      .map(([platform, s]) => ({
        platform,
        fee:          s.fee,
        gross:        s.gross,
        count:        s.count,
        comm:         s.comm,
        marketing:    s.marketing,
        feePct:       s.gross > 0 ? (s.fee       / s.gross) * 100 : 0,
        commPct:      s.gross > 0 ? (s.comm      / s.gross) * 100 : 0,
        marketingPct: s.gross > 0 ? (s.marketing / s.gross) * 100 : 0,
        color: platformStats.find((p) => p.platform === platform)?.color ?? "#2D6A9F",
      }))
      .sort((a, b) => b.fee - a.fee);
    const total           = sorted.reduce((s, p) => s + p.fee,       0);
    const totalGrossMonth = sorted.reduce((s, p) => s + p.gross,     0);
    const totalMarketing  = sorted.reduce((s, p) => s + p.marketing, 0);
    return { platforms: sorted, total, totalGrossMonth, totalMarketing };
  }, [allRes, month, year, platformStats]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  // ── Drag-and-drop section order ───────────────────────────────────────────
  const [sectionOrder, setSectionOrder] = useState<PlatSectionId[]>(loadPlatOrder);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSectionOrder((prev) => {
        const oldIdx = prev.indexOf(active.id as PlatSectionId);
        const newIdx = prev.indexOf(over.id as PlatSectionId);
        const next   = arrayMove(prev, oldIdx, newIdx);
        localStorage.setItem(PLAT_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }
  }, []);

  function resetPlatOrder() {
    localStorage.removeItem(PLAT_STORAGE_KEY);
    setSectionOrder(PLAT_DEFAULT_ORDER);
  }

  // ── CSV export ────────────────────────────────────────────────────────────
  function exportCSV() {
    const monthLabel = `${MONTHS_ES[month - 1]} ${year}`;
    const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

    const BOM = "﻿";

    // Section 1: monthly fees
    const feeRows = monthlyFees.platforms.map((p) =>
      [p.platform, p.count, p.gross.toFixed(2), p.fee.toFixed(2), `${p.feePct.toFixed(2)}%`].join(",")
    );
    const feeTotals = [
      "TOTAL",
      monthlyFees.platforms.reduce((s, p) => s + p.count, 0),
      monthlyFees.totalGrossMonth.toFixed(2),
      monthlyFees.total.toFixed(2),
      monthlyFees.totalGrossMonth > 0
        ? `${((monthlyFees.total / monthlyFees.totalGrossMonth) * 100).toFixed(2)}%`
        : "0%",
    ].join(",");

    // Section 2: all-time stats
    const statsRows = platformStats.map((p) =>
      [
        p.platform,
        p.count,
        p.gross.toFixed(2),
        p.net.toFixed(2),
        (p.gross - p.net).toFixed(2),
        p.adr.toFixed(2),
        p.avgStay.toFixed(2),
        p.completadas,
        p.canceladas,
      ].join(",")
    );

    const lines = [
      `REPORTE DE PLATAFORMAS - ${monthLabel.toUpperCase()}`,
      "",
      `PAGO A PLATAFORMAS - ${monthLabel}`,
      "Plataforma,Reservas,Bruto (USD),Comisión (USD),% del bruto",
      ...feeRows,
      feeTotals,
      "",
      "ESTADÍSTICAS HISTÓRICAS (todo el período)",
      "Plataforma,Reservas,Bruto total,Neto total,Comisiones total,ADR,Estancia prom.,Completadas,Canceladas",
      ...statsRows,
    ];

    const blob = new Blob([BOM + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `plataformas_${MONTHS_SHORT[month - 1]}${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Chart data
  const chartData = platformStats.map((p) => ({
    platform: p.platform,
    bruto:    p.gross,
    neto:     p.net,
    color:    p.color,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BarTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const idx = platformStats.findIndex((p) => p.platform === payload[0]?.payload?.platform);
    const d   = platformStats[idx];
    if (!d) return null;
    return (
      <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-xs space-y-1 min-w-[160px]">
        <p className="font-bold">{d.platform}</p>
        <div className="border-t pt-1 space-y-0.5">
          <p>Bruto: <span className="font-mono font-semibold">{fmtUSD(d.gross)}</span></p>
          <p>Neto: <span className="font-mono font-semibold text-[#2D6A9F]">{fmtUSD(d.net)}</span></p>
          <p>Reservas: <span className="font-semibold">{d.count}</span></p>
          <p>ADR: <span className="font-mono font-semibold">{fmtUSD(d.adr)}</span></p>
          <p>Estancia prom.: <span className="font-semibold">{d.avgStay.toFixed(1)} noches</span></p>
        </div>
      </div>
    );
  };

  // ── Section renderer ──────────────────────────────────────────────────────
  function renderPlatSection(id: PlatSectionId) {
    switch (id) {

      case "resumen_kpis":
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniKpi label="Plataformas activas" value={String(platformStats.length)} sub="Con reservas en historial"     icon={Globe}     color="#0F2B4C" />
            <MiniKpi label="Total reservas"      value={String(totalRes)}             sub="Todas las propiedades (USD)"   icon={Hash}      color="#2D6A9F" />
            <MiniKpi label="Ingreso bruto total" value={fmtUSD(totalGross)}           sub="Historial completo"            icon={DollarSign} color="#059669" />
            <MiniKpi label="Plataforma líder"    value={bestPlatform?.platform ?? "—"} sub={bestPlatform ? fmtUSD(bestPlatform.gross) : "Sin datos"} icon={Star} color="#F0A030" />
          </div>
        );

      case "pagos_mes":
        return (
          <Card className="overflow-hidden border border-[#0F2B4C]/15 shadow-sm">
            <div className="bg-[#0F2B4C] px-5 py-3 flex items-center gap-3">
              <Receipt size={15} className="text-white/70 shrink-0" />
              <span className="text-white font-bold text-sm tracking-wide">PAGO A PLATAFORMAS POR MES</span>
              <div className="ml-auto flex items-center gap-1">
                <button onClick={prevMonth} className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                  <ChevronLeft size={15} />
                </button>
                <span className="text-white/90 text-xs font-semibold min-w-[130px] text-center">
                  {MONTHS_ES[month - 1]} {year}
                </span>
                <button onClick={nextMonth} className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
            <CardContent className="px-5 pt-5 pb-5">
              {monthlyFees.platforms.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
                  Sin reservas activas en {MONTHS_ES[month - 1]} {year}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {[...monthlyFees.platforms].sort((a, b) => b.fee - a.fee).map((p) => (
                      <div key={p.platform} className="flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium shadow-sm" style={{ borderColor: `${p.color}35`, backgroundColor: `${p.color}0D` }}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="text-foreground/80">{p.platform}</span>
                        <span className="font-mono font-bold" style={{ color: p.color }}>{fmtUSD(p.fee)}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${p.color}20`, color: p.color }}>{p.feePct.toFixed(1)}%</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 rounded-full border-2 border-[#0F2B4C]/25 bg-[#0F2B4C]/5 px-3.5 py-2 text-sm font-bold shadow-sm">
                      <span className="text-[#0F2B4C]/60">∑ Total</span>
                      <span className="font-mono font-bold text-[#0F2B4C] text-[1rem]">{fmtUSD(monthlyFees.total)}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border overflow-x-auto">
                    <table className="w-full text-sm min-w-[500px]">
                      <thead>
                        <tr className="bg-muted/40 border-b">
                          <th className="text-left   px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Plataforma</th>
                          <th className="text-center px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reservas</th>
                          <th className="text-right  px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bruto mes</th>
                          <th className="text-right  px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Comisión</th>
                          <th className="text-right  px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-700">Marketing</th>
                          <th className="text-right  px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total fees</th>
                          <th className="text-right  px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">% bruto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...monthlyFees.platforms].sort((a, b) => b.fee - a.fee).map((p) => (
                          <tr key={p.platform} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                <span className="font-semibold">{p.platform}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center text-muted-foreground">{p.count}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{fmtUSD(p.gross)}</td>
                            <td className="px-3 py-2.5 text-right font-mono font-semibold" style={{ color: p.color }}>
                              <div>{fmtUSD(p.comm)}</div>
                              <div className="text-[9px] opacity-60">{p.commPct.toFixed(1)}%</div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono">
                              {p.marketing > 0 ? (
                                <>
                                  <div className="font-semibold text-amber-700">{fmtUSD(p.marketing)}</div>
                                  <div className="text-[9px] text-amber-600/70">{p.marketingPct.toFixed(1)}%</div>
                                </>
                              ) : <span className="text-muted-foreground/40 text-xs">—</span>}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold" style={{ color: p.color }}>{fmtUSD(p.fee)}</td>
                            <td className="px-4 py-2.5 text-right">
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${p.color}18`, color: p.color }}>{p.feePct.toFixed(1)}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#0F2B4C]/5 border-t-2 border-[#0F2B4C]/15">
                          <td className="px-4 py-2.5 font-bold text-[#0F2B4C]">Total</td>
                          <td className="px-3 py-2.5 text-center font-bold text-muted-foreground">{monthlyFees.platforms.reduce((s, p) => s + p.count, 0)}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-[#0F2B4C]">{fmtUSD(monthlyFees.totalGrossMonth)}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-[#0F2B4C]">
                            {fmtUSD(monthlyFees.platforms.reduce((s, p) => s + p.comm, 0))}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-amber-700">
                            {monthlyFees.totalMarketing > 0 ? fmtUSD(monthlyFees.totalMarketing) : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-[#0F2B4C] text-[1rem]">{fmtUSD(monthlyFees.total)}</td>
                          <td className="px-4 py-2.5 text-right text-[11px] font-bold text-[#0F2B4C]">
                            {monthlyFees.totalGrossMonth > 0 ? `${((monthlyFees.total / monthlyFees.totalGrossMonth) * 100).toFixed(1)}%` : "—"}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case "grafica_historica":
        return (
          <Card className="overflow-hidden border border-[#0F2B4C]/10">
            <div className="bg-[#0F2B4C] px-5 py-3 flex items-center gap-3">
              <BarChart3 size={15} className="text-white/70 shrink-0" />
              <span className="text-white font-bold text-sm tracking-wide">INGRESO BRUTO POR PLATAFORMA (USD)</span>
            </div>
            <CardContent className="px-5 pt-5 pb-4">
              {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Sin datos de reservas</div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 52)}>
                  <BarChart data={chartData} layout="vertical" barSize={22} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="platform" tick={{ fontSize: 12, fill: "#374151", fontWeight: 600 }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: "#0F2B4C06" }} />
                    <Bar dataKey="bruto" radius={[0, 5, 5, 0]}>
                      {chartData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        );

      case "detalle_plataformas":
        return platformStats.length === 0 ? null : (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2D6A9F] mb-3">Detalle por plataforma</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {platformStats.map((p) => {
                const sharePct = totalGross > 0 ? (p.gross / totalGross) * 100 : 0;
                return (
                  <Card key={p.platform} className="overflow-hidden border" style={{ borderColor: `${p.color}25` }}>
                    <div className="h-[3px] w-full" style={{ backgroundColor: p.color }} />
                    <CardContent className="px-4 pt-4 pb-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="font-bold text-sm text-foreground">{p.platform}</span>
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: `${p.color}15`, color: p.color }}>
                          {sharePct.toFixed(1)}% del total
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          { label: "Reservas",   value: String(p.count)               },
                          { label: "Bruto",      value: fmtUSD(p.gross)              },
                          { label: "Neto",       value: fmtUSD(p.net)                },
                          { label: "ADR",        value: fmtUSD(p.adr)                },
                          { label: "Estancia",   value: `${p.avgStay.toFixed(1)} n.` },
                          { label: "Prom. res.", value: fmtUSD(p.avgGross)           },
                        ].map((s) => (
                          <div key={s.label} className="bg-muted/30 rounded-lg px-2 py-2">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                            <p className="text-[12px] font-mono font-bold text-foreground mt-0.5">{s.value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1">
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${sharePct}%`, backgroundColor: p.color }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{p.completadas} completadas</span>
                          {p.canceladas > 0 && <span className="text-rose-400">{p.canceladas} canceladas</span>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );

      case "config_comisiones":
        return configs.length === 0 ? null : (
          <div className="overflow-x-auto rounded-xl border border-[#0F2B4C]/15 shadow-sm">
            <div className="bg-[#0F2B4C] px-5 py-3 flex items-center gap-3">
              <Percent size={15} className="text-white/70 shrink-0" />
              <span className="text-white font-bold text-sm tracking-wide">CONFIGURACIÓN DE COMISIONES</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0F2B4C]/5 border-b border-[#0F2B4C]/10">
                  <th className="text-left   px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0F2B4C]">Plataforma</th>
                  <th className="text-center px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0F2B4C]">Comisión %</th>
                  <th className="text-center px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0F2B4C]">Marketing %</th>
                  <th className="text-center px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0F2B4C]">Fijo USD</th>
                  <th className="text-center px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0F2B4C]">Total ef.</th>
                  <th className="text-center px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0F2B4C]">Estado</th>
                  <th className="text-right  px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0F2B4C]">Notas</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((c, idx) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-[#0F2B4C]/[0.025] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
                        <span className="font-semibold">{c.platform}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center"><span className="text-base font-bold text-[#2D6A9F]">{c.commission_pct}%</span></td>
                    <td className="px-4 py-3 text-center">
                      {(c.marketing_pct ?? 0) > 0
                        ? <span className="text-base font-bold text-[#2D6A9F]">{c.marketing_pct}%</span>
                        : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-muted-foreground">{c.fixed_amount_usd > 0 ? fmtUSD(c.fixed_amount_usd) : "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-bold text-[#0F2B4C]">
                        {c.commission_pct + (c.marketing_pct ?? 0)}%
                        {c.fixed_amount_usd > 0 && <span className="text-[11px] text-amber-600 font-normal ml-1">+ {fmtUSD(c.fixed_amount_usd)}</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.active
                        ? <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5 text-[11px] font-bold">● Activa</span>
                        : <span className="inline-flex items-center gap-1 bg-muted text-muted-foreground border border-border rounded-full px-2.5 py-0.5 text-[11px] font-bold">● Inactiva</span>
                      }
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-muted-foreground">{c.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "grafica_marketing": {
        const mktData = platformStats
          .filter((p) => p.marketing > 0)
          .map((p) => ({
            platform:  p.platform,
            marketing: p.marketing,
            color:     p.color,
            pct:       p.gross > 0 ? (p.marketing / p.gross) * 100 : 0,
          }));
        const totalMktHistorical = mktData.reduce((s, p) => s + p.marketing, 0);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const MktTooltip = ({ active, payload }: any) => {
          if (!active || !payload?.length) return null;
          const d = mktData.find((p) => p.platform === payload[0]?.payload?.platform);
          if (!d) return null;
          return (
            <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-xs space-y-1 min-w-[170px]">
              <p className="font-bold">{d.platform}</p>
              <div className="border-t pt-1 space-y-0.5">
                <p>Marketing: <span className="font-mono font-semibold text-amber-700">{fmtUSD(d.marketing)}</span></p>
                <p>% del bruto: <span className="font-semibold">{d.pct.toFixed(2)}%</span></p>
              </div>
            </div>
          );
        };

        return (
          <Card className="overflow-hidden border border-amber-200/60 shadow-sm">
            <div className="bg-amber-600 px-5 py-3 flex items-center gap-3">
              <BarChart3 size={15} className="text-white/80 shrink-0" />
              <span className="text-white font-bold text-sm tracking-wide">GASTO DE MARKETING POR PLATAFORMA (USD)</span>
              {totalMktHistorical > 0 && (
                <span className="ml-auto text-white/70 text-xs font-mono">
                  Total histórico: {fmtUSD(totalMktHistorical)}
                </span>
              )}
            </div>
            <CardContent className="px-5 pt-5 pb-4">
              {mktData.length === 0 ? (
                <div className="flex items-center justify-center h-28 text-muted-foreground text-sm">
                  Sin gasto de marketing registrado
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary chips */}
                  <div className="flex flex-wrap gap-2">
                    {mktData.map((p) => (
                      <div
                        key={p.platform}
                        className="flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium shadow-sm"
                        style={{ borderColor: `${p.color}35`, backgroundColor: `${p.color}0D` }}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="text-foreground/80">{p.platform}</span>
                        <span className="font-mono font-bold text-amber-700">{fmtUSD(p.marketing)}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          {p.pct.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Bar chart */}
                  <ResponsiveContainer width="100%" height={Math.max(160, mktData.length * 52)}>
                    <BarChart data={mktData} layout="vertical" barSize={22} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                      <XAxis
                        type="number"
                        tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                        tick={{ fontSize: 10, fill: "#6b7280" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="platform"
                        tick={{ fontSize: 12, fill: "#374151", fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        width={90}
                      />
                      <Tooltip content={<MktTooltip />} cursor={{ fill: "#F0A03008" }} />
                      <Bar dataKey="marketing" radius={[0, 5, 5, 0]}>
                        {mktData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} fillOpacity={0.75} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Monthly breakdown for selected month */}
                  {monthlyFees.totalMarketing > 0 && (
                    <div className="border-t pt-3 space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                        Marketing en {MONTHS_ES[month - 1]} {year}
                      </p>
                      {monthlyFees.platforms
                        .filter((p) => p.marketing > 0)
                        .map((p) => (
                          <div key={p.platform} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                              <span className="text-muted-foreground">{p.platform}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground/60">{p.marketingPct.toFixed(1)}% del bruto</span>
                              <span className="font-mono font-bold text-amber-700">{fmtUSD(p.marketing)}</span>
                            </div>
                          </div>
                        ))}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-100">
                        <span className="font-bold text-amber-700">Total mes</span>
                        <span className="font-mono font-bold text-amber-700">{fmtUSD(monthlyFees.totalMarketing)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      }

      default:
        return null;
    }
  }

  return (
    <div className="px-3 sm:px-6 pt-6 pb-8 min-h-screen bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8] overflow-x-hidden">
    <div className="max-w-screen-2xl mx-auto animate-fade-in text-sm overflow-hidden">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-3xl font-serif font-semibold text-[#0F2B4C]">Plataformas</h1>
        <p className="text-muted-foreground mt-0.5">Rendimiento por canal de venta y herramientas de cálculo</p>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ── LEFT: main content ──────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 w-full overflow-hidden">
          {/* Action bar */}
          <div className="flex items-center justify-end gap-2 mb-4">
            {sectionOrder.join(",") !== PLAT_DEFAULT_ORDER.join(",") && (
              <Button variant="ghost" size="sm" onClick={resetPlatOrder} className="text-muted-foreground gap-1.5">
                <RotateCcw size={13} />
                Restaurar orden
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={platformStats.length === 0}
              className="gap-1.5"
            >
              <Download size={14} />
              Exportar CSV
            </Button>
          </div>

          {/* Sortable sections */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
              <div className="space-y-6">
                {sectionOrder.map((id) => (
                  <PlatSortableSection key={id} id={id}>
                    {renderPlatSection(id)}
                  </PlatSortableSection>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* ── RIGHT: sticky calculator sidebar (stacks below on mobile/tablet) ── */}
        <div className="w-full lg:w-80 shrink-0 lg:sticky lg:top-6">
          <Card className="overflow-hidden border border-[#0F2B4C]/15 shadow-md">
            <div className="h-[3px] w-full bg-gradient-to-r from-[#0F2B4C] to-[#2D6A9F]" />
            <CardContent className="px-5 pt-5 pb-5">
              <PctCalculator />
            </CardContent>
          </Card>

          {/* Quick reference */}
          <Card className="overflow-hidden border border-amber-200 mt-4">
            <div className="h-[3px] w-full bg-amber-400" />
            <CardContent className="px-4 pt-4 pb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  Referencia rápida
                </p>
                <p className="text-[10px] text-muted-foreground">{MONTHS_ES[month - 1]}</p>
              </div>
              <div className="space-y-2">
                {[...configs.filter((c) => c.active)]
                  .sort((a, b) => {
                    // Sort by actual monthly fee first (if available), then by commission_pct
                    const feeA = monthlyFees.platforms.find((p) => p.platform === a.platform)?.fee ?? -1;
                    const feeB = monthlyFees.platforms.find((p) => p.platform === b.platform)?.fee ?? -1;
                    if (feeA !== feeB) return feeB - feeA;
                    return b.commission_pct - a.commission_pct;
                  })
                  .map((c) => {
                    const monthlyFee = monthlyFees.platforms.find((p) => p.platform === c.platform);
                    const color = platformStats.find((p) => p.platform === c.platform)?.color ?? "#2D6A9F";
                    return (
                      <div key={c.id} className="space-y-0.5">
                        <div className="flex items-center justify-between text-[12px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-muted-foreground truncate">{c.platform}</span>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="font-bold text-[#2D6A9F]">{c.commission_pct}%</span>
                            {(c.marketing_pct ?? 0) > 0 && (
                              <span className="ml-1 text-[10px] font-semibold text-[#2D6A9F]/70">
                                +{c.marketing_pct}% mkt
                              </span>
                            )}
                            {c.fixed_amount_usd > 0 && (
                              <span className="ml-1 text-[10px] font-semibold text-amber-600">
                                + {fmtUSD(c.fixed_amount_usd)}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Monthly fee for this platform */}
                        {monthlyFee && monthlyFee.fee > 0 && (
                          <div className="flex items-center justify-between pl-3">
                            <span className="text-[10px] text-muted-foreground/60">Mes actual</span>
                            <span className="text-[11px] font-mono font-bold" style={{ color }}>
                              {fmtUSD(monthlyFee.fee)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                {configs.filter((c) => c.active).length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Sin plataformas configuradas</p>
                )}
              </div>
              {/* Monthly total */}
              {monthlyFees.total > 0 && (
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-700">Total del mes</span>
                  <span className="font-mono font-bold text-[#0F2B4C] text-sm">{fmtUSD(monthlyFees.total)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </div>
  );
}
