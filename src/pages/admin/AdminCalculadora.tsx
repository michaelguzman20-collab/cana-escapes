import { useState, useMemo } from "react";
import {
  Calculator, DollarSign, Percent, Moon, TrendingUp,
  BedDouble, Info, RotateCcw, CalendarDays, UserCheck, Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrackets, resolveBracketsForProperty } from "@/hooks/useBrackets";
import { useProperty } from "@/contexts/PropertyContext";

// ── Owner/CE revenue split brackets (by MONTHLY gross, USD) ───────────────────
// Live values come from the `brackets` table (per property or default template);
// this mirrors the $2,000 default template so the calculator still works if the
// query is loading or empty.
type SplitBracket = { range_min: number; range_max: number | null; owner_pct: number; ce_pct: number };
const FALLBACK_BRACKETS: SplitBracket[] = [
  { range_min: 0,    range_max: 500,  owner_pct: 80, ce_pct: 20 },
  { range_min: 500,  range_max: 1000, owner_pct: 78, ce_pct: 22 },
  { range_min: 1000, range_max: 1500, owner_pct: 75, ce_pct: 25 },
  { range_min: 1500, range_max: 2000, owner_pct: 73, ce_pct: 27 },
  { range_min: 2000, range_max: null, owner_pct: 70, ce_pct: 30 },
];

function pickBracket(brackets: SplitBracket[], monthlyGross: number): SplitBracket {
  const sorted = [...brackets].sort((a, b) => a.range_min - b.range_min);
  let chosen = sorted[0];
  for (const b of sorted) if (monthlyGross >= b.range_min) chosen = b;
  return chosen;
}

function bracketRange(b: SplitBracket) {
  const min = b.range_min === 0 ? "$0" : `$${b.range_min.toLocaleString("en-US")}`;
  return b.range_max == null ? `${min}+` : `${min}–$${b.range_max.toLocaleString("en-US")}`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtUsd(n: number, decimals = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(n);
}

// ── Property type presets (from Cana Rock STR analysis, jun 2026) ─────────────
// ADR = weighted average annual rate · price = reference acquisition price (USD)
const TYPES = [
  { id: "1br", label: "1BR / Studio", adr: 110, price: 220_000 },
  { id: "2br", label: "2BR Estándar", adr: 148, price: 250_000 },
  { id: "ph",  label: "2BR Penthouse", adr: 188, price: 320_000 },
] as const;

// ADR phase presets for the 1BR ramp-up strategy
const ADR_PHASES = [
  { adr: 95,  label: "Fase 1 · Lanzamiento" },
  { adr: 110, label: "Fase 2 · Crecimiento" },
  { adr: 125, label: "Fase 3 · Optimizado" },
  { adr: 140, label: "Fase 4 · Top Performer" },
] as const;

const DEFAULTS = { typeId: "1br", occupancy: 65, adr: 110, price: 220_000, itbis: 18, commission: 12, opex: 30 };

export function AdminCalculadora() {
  const [typeId, setTypeId] = useState<string>(DEFAULTS.typeId);
  const [occupancy, setOccupancy] = useState(DEFAULTS.occupancy); // %
  const [adr, setAdr] = useState(DEFAULTS.adr);                   // USD/night
  const [price, setPrice] = useState(DEFAULTS.price);             // USD property
  const [itbis, setItbis] = useState(DEFAULTS.itbis);             // %
  const [commission, setCommission] = useState(DEFAULTS.commission); // %
  const [opex, setOpex] = useState(DEFAULTS.opex);               // %
  const [splitBase, setSplitBase] = useState<"net" | "gross">("net");
  const [bracketPropId, setBracketPropId] = useState<string>(""); // "" = plantilla por defecto

  const { data: dbBrackets } = useBrackets();
  const { properties } = useProperty();
  const brackets: SplitBracket[] = dbBrackets?.length
    ? (resolveBracketsForProperty(dbBrackets, bracketPropId || null) as SplitBracket[])
    : FALLBACK_BRACKETS;

  function applyType(id: string) {
    const t = TYPES.find((x) => x.id === id);
    if (!t) return;
    setTypeId(id);
    setAdr(t.adr);
    setPrice(t.price);
  }

  function reset() {
    setTypeId(DEFAULTS.typeId);
    setOccupancy(DEFAULTS.occupancy);
    setAdr(DEFAULTS.adr);
    setPrice(DEFAULTS.price);
    setItbis(DEFAULTS.itbis);
    setCommission(DEFAULTS.commission);
    setOpex(DEFAULTS.opex);
  }

  const r = useMemo(() => {
    const occ = occupancy / 100;
    const nights = Math.round(365 * occ);
    const gross = adr * 365 * occ;
    const itbisAmt = gross * (itbis / 100);
    const commAmt = gross * (commission / 100);
    const opexAmt = gross * (opex / 100);
    const net = gross - itbisAmt - commAmt - opexAmt;
    const roiGross = price > 0 ? (gross / price) * 100 : 0;
    const roiNet = price > 0 ? (net / price) * 100 : 0;
    return { nights, gross, itbisAmt, commAmt, opexAmt, net, roiGross, roiNet };
  }, [occupancy, adr, price, itbis, commission, opex]);

  // Monthly figures + owner/administrator split (progressive bracket by monthly gross)
  const m = useMemo(() => {
    const grossMonth = r.gross / 12;
    const netMonth = r.net / 12;
    const bracket = pickBracket(brackets, grossMonth);
    const baseMonth = splitBase === "net" ? netMonth : grossMonth;
    const ownerMonth = baseMonth * (bracket.owner_pct / 100);
    const adminMonth = baseMonth * (bracket.ce_pct / 100);
    return {
      grossMonth, netMonth, bracket, baseMonth,
      ownerMonth, adminMonth,
      ownerYear: ownerMonth * 12, adminYear: adminMonth * 12,
    };
  }, [r.gross, r.net, brackets, splitBase]);

  return (
    <div className="px-3 sm:px-6 pt-6 pb-8 min-h-screen bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8] overflow-x-hidden">
      <div className="max-w-screen-2xl mx-auto space-y-4 text-sm">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Calculator size={20} className="text-[#0F2B4C]" />
            <div>
              <h1 className="text-xl font-bold text-[#0F2B4C]">Calculadora de Ingresos STR</h1>
              <p className="text-xs text-gray-500">Modelo Cana Rock / Hard Rock — proyección de ingresos brutos, netos y ROI</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw size={14} className="mr-1" /> Reiniciar
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* ── Inputs ─────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-6">
            {/* Property type */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#0F2B4C] uppercase tracking-wide mb-2">
                <BedDouble size={13} /> Tipo de propiedad
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyType(t.id)}
                    className={`px-2 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      typeId === t.id
                        ? "bg-[#0F2B4C] text-white border-[#0F2B4C]"
                        : "bg-white text-[#0F2B4C] border-gray-200 hover:border-[#0F2B4C]/40"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Occupancy slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#0F2B4C] uppercase tracking-wide">
                  <Percent size={13} /> Ocupación anual
                </label>
                <span className="text-lg font-bold text-[#F0A030]">{occupancy}%</span>
              </div>
              <input
                type="range" min={40} max={85} step={1}
                value={occupancy}
                onChange={(e) => setOccupancy(Number(e.target.value))}
                className="w-full accent-[#F0A030] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>40% (baja)</span>
                <span>Mercado 48–52% · Top 65–75%</span>
                <span>85%</span>
              </div>
            </div>

            {/* ADR slider + phase chips */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#0F2B4C] uppercase tracking-wide">
                  <DollarSign size={13} /> ADR promedio / noche
                </label>
                <span className="text-lg font-bold text-[#F0A030]">{fmtUsd(adr)}</span>
              </div>
              <input
                type="range" min={65} max={260} step={5}
                value={adr}
                onChange={(e) => setAdr(Number(e.target.value))}
                className="w-full accent-[#F0A030] cursor-pointer"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {ADR_PHASES.map((p) => (
                  <button
                    key={p.adr}
                    onClick={() => setAdr(p.adr)}
                    className={`px-2 py-1 rounded-md border text-[10px] font-medium transition-colors ${
                      adr === p.adr
                        ? "bg-[#F0A030] text-[#0F2B4C] border-[#F0A030]"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:border-[#F0A030]/50"
                    }`}
                  >
                    {fmtUsd(p.adr)} · {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Property price */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#0F2B4C] uppercase tracking-wide mb-1.5">
                <TrendingUp size={13} /> Precio de la propiedad (USD)
              </label>
              <input
                type="number" min={0} step={5000}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-[#0F2B4C] font-medium focus:outline-none focus:border-[#0F2B4C]/50"
              />
              <p className="text-[10px] text-gray-400 mt-1">Referencia: 1BR ~$220K · 2BR ~$250K. Se usa para el ROI bruto.</p>
            </div>

            {/* Deduction rates */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Deducciones (referencia editable)
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "ITBIS", val: itbis, set: setItbis, hint: "18% RD" },
                  { label: "Comisión OTA", val: commission, set: setCommission, hint: "~12% mix" },
                  { label: "Gastos op.", val: opex, set: setOpex, hint: "~30%" },
                ].map((d) => (
                  <div key={d.label}>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">{d.label}</label>
                    <div className="relative">
                      <input
                        type="number" min={0} max={100} step={1}
                        value={d.val}
                        onChange={(e) => d.set(Number(e.target.value))}
                        className="w-full pl-2 pr-6 py-1.5 rounded-lg border border-gray-200 text-sm text-[#0F2B4C] font-medium focus:outline-none focus:border-[#0F2B4C]/50"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                    </div>
                    <p className="text-[9px] text-gray-400 mt-0.5">{d.hint}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Results ────────────────────────────────────────────────────── */}
          <div className="space-y-4">
            {/* Headline KPIs */}
            <div className="grid grid-cols-2 gap-4">
              <ResultCard
                icon={<DollarSign size={18} />}
                value={fmtUsd(r.gross)}
                label="Ingresos brutos / año"
                accent="navy"
              />
              <ResultCard
                icon={<DollarSign size={18} />}
                value={fmtUsd(r.net)}
                label="Ingreso neto estimado"
                accent="amber"
              />
              <ResultCard
                icon={<TrendingUp size={18} />}
                value={`${r.roiGross.toFixed(1)}%`}
                label="ROI bruto"
                sub={`Neto ~${r.roiNet.toFixed(1)}%`}
                accent="green"
              />
              <ResultCard
                icon={<Moon size={18} />}
                value={String(r.nights)}
                label="Noches reservadas / año"
                sub={`${fmtUsd(r.gross / 12)} / mes`}
                accent="blue"
              />
            </div>

            {/* Deductions breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-bold text-[#0F2B4C] mb-3">Desglose Bruto → Neto</h2>
              <div className="space-y-2 text-sm">
                <Row label="Ingresos brutos" value={fmtUsd(r.gross)} bold />
                <Row label={`ITBIS (${itbis}%)`} value={`− ${fmtUsd(r.itbisAmt)}`} red />
                <Row label={`Comisión OTA (${commission}%)`} value={`− ${fmtUsd(r.commAmt)}`} red />
                <Row label={`Gastos operativos (${opex}%)`} value={`− ${fmtUsd(r.opexAmt)}`} red />
                <div className="border-t border-gray-100 pt-2 mt-2">
                  <Row label="Ingreso neto estimado" value={fmtUsd(r.net)} bold accent />
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
                Neto = Bruto − ITBIS − Comisión OTA − Gastos operativos. <strong>No incluye ISR ni hipoteca.</strong> Estimación informativa; consultar contador especializado en STR.
              </p>
            </div>
          </div>
        </div>

        {/* ── Monthly + owner/administrator split ──────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-[#0F2B4C] mb-4">
            <CalendarDays size={15} /> Por Mes y Reparto Propietario / Administrador
          </h2>

          {/* Monthly figures */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-gray-50 rounded-lg p-4 border-b-4 border-b-[#0F2B4C]">
              <p className="text-2xl font-serif font-bold text-[#0F2B4C] leading-tight">{fmtUsd(m.grossMonth)}</p>
              <p className="text-[11px] text-gray-500 uppercase tracking-wide mt-1">Ingreso bruto / mes</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border-b-4 border-b-[#F0A030]">
              <p className="text-2xl font-serif font-bold text-[#0F2B4C] leading-tight">{fmtUsd(m.netMonth)}</p>
              <p className="text-[11px] text-gray-500 uppercase tracking-wide mt-1">Ingreso neto estimado / mes</p>
            </div>
          </div>

          {/* Brackets source selector */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-500">Brackets de:</span>
            <select
              value={bracketPropId}
              onChange={(e) => setBracketPropId(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-[#0F2B4C] font-medium focus:outline-none focus:border-[#0F2B4C]/50"
            >
              <option value="">Plantilla por defecto ($2,000)</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Split controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Repartir sobre:</span>
              <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
                {(["net", "gross"] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setSplitBase(b)}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      splitBase === b ? "bg-[#0F2B4C] text-white" : "text-gray-500 hover:text-[#0F2B4C]"
                    }`}
                  >
                    {b === "net" ? "Neto" : "Bruto"}
                  </button>
                ))}
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F2B4C] bg-[#0F2B4C]/5 rounded-full px-3 py-1">
              Tramo aplicado: {bracketRange(m.bracket)} · {m.bracket.owner_pct}/{m.bracket.ce_pct}
            </span>
          </div>

          {/* Owner vs Administrator */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                  <UserCheck size={16} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-[#0F2B4C]">Propietario</p>
                  <p className="text-[10px] text-emerald-700/80">{m.bracket.owner_pct}% del reparto</p>
                </div>
              </div>
              <p className="text-2xl font-serif font-bold text-emerald-600 leading-tight">{fmtUsd(m.ownerMonth)}<span className="text-sm font-sans text-gray-400"> /mes</span></p>
              <p className="text-xs text-gray-500 mt-0.5">{fmtUsd(m.ownerYear)} / año</p>
            </div>
            <div className="rounded-xl border border-[#F0A030]/30 bg-[#F0A030]/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-8 rounded-lg bg-[#F0A030]/15 text-[#F0A030] flex items-center justify-center">
                  <Briefcase size={16} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-[#0F2B4C]">Administrador · Cana Escapes</p>
                  <p className="text-[10px] text-[#F0A030]">{m.bracket.ce_pct}% del reparto</p>
                </div>
              </div>
              <p className="text-2xl font-serif font-bold text-[#F0A030] leading-tight">{fmtUsd(m.adminMonth)}<span className="text-sm font-sans text-gray-400"> /mes</span></p>
              <p className="text-xs text-gray-500 mt-0.5">{fmtUsd(m.adminYear)} / año</p>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
            Reparto progresivo según el bruto mensual (esquema de tramos {brackets[0]?.owner_pct ?? 80}/{brackets[0]?.ce_pct ?? 20} → {brackets[brackets.length - 1]?.owner_pct ?? 70}/{brackets[brackets.length - 1]?.ce_pct ?? 30}). Por defecto se reparte sobre el <strong>neto estimado</strong>, igual que en el portal del propietario. Cambia a "Bruto" para ver el reparto sobre ingresos brutos.
          </p>
        </div>

        {/* ── References ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-[#0F2B4C] mb-3">
            <Info size={15} /> Referencias de mercado — Cana Rock / Punta Cana (jun 2026)
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { k: "ADR mercado", v: "$119 – $166", d: "Amplio (Airbtics) a estrecho (AirROI)" },
              { k: "Ocupación media", v: "48 – 52%", d: "Top performers / Superhost: 65 – 75%" },
              { k: "Yield bruto 1BR", v: "~9.1%", d: "El 1BR es el sweet spot de ROI" },
              { k: "Crecimiento oferta 2025", v: "+47%", d: "Mayor del Caribe — exige diferenciación" },
            ].map((b) => (
              <div key={b.k} className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{b.k}</p>
                <p className="text-lg font-bold text-[#0F2B4C]">{b.v}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{b.d}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-3">
            Estacionalidad ~3× (baja ~$65 → pico ~$185 para 1BR). Fuentes: AirDNA · AirROI · Airbtics · PriceLabs · MITUR · DGII. Datos jun 2026.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ResultCard({
  icon, value, label, sub, accent,
}: {
  icon: React.ReactNode; value: string; label: string; sub?: string;
  accent: "navy" | "amber" | "green" | "blue";
}) {
  const accents = {
    navy:  "border-b-[#0F2B4C] text-[#0F2B4C]",
    amber: "border-b-[#F0A030] text-[#F0A030]",
    green: "border-b-emerald-500 text-emerald-600",
    blue:  "border-b-blue-500 text-blue-600",
  } as const;
  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-b-4 ${accents[accent]} shadow-sm p-4`}>
      <div className={`mb-2 ${accents[accent].split(" ")[1]}`}>{icon}</div>
      <p className="text-2xl font-serif font-bold text-[#0F2B4C] leading-tight">{value}</p>
      <p className="text-[11px] text-gray-500 uppercase tracking-wide mt-1">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Row({
  label, value, bold, red, accent,
}: {
  label: string; value: string; bold?: boolean; red?: boolean; accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`${bold ? "font-semibold text-[#0F2B4C]" : "text-gray-600"}`}>{label}</span>
      <span className={`${bold ? "font-bold" : "font-medium"} ${red ? "text-red-500" : accent ? "text-[#F0A030]" : "text-[#0F2B4C]"}`}>
        {value}
      </span>
    </div>
  );
}
