// Cana DNA — datos y cálculos del mercado de renta corta de Bávaro / Punta Cana.
// Las tablas `market_zones`, `market_monthly` y `market_notes` son de lectura pública;
// se editan desde /admin/cana-dna.

export interface MarketZone {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  description_es: string | null;
  description_en: string | null;
  highlights_es: string[];
  highlights_en: string[];
  active_listings: number | null;
  listings_growth_pct: number | null;
  avg_property_price: number | null;
  score_demand: number;
  score_growth: number;
  score_seasonality: number;
  score_regulation: number;
  score_investability: number;
  sort_order: number;
  active: boolean;
  is_estimate: boolean;
  updated_at: string;
}

export interface MarketMonth {
  id: string;
  zone_slug: string;
  year: number;
  month: number; // 1–12
  occupancy: number; // %
  adr: number; // USD
  active_listings: number | null;
  is_estimate: boolean;
  source: string | null;
  updated_at: string;
}

export interface MarketNote {
  id: string;
  kind: "alert" | "opportunity" | "stat";
  value: string | null;
  title_es: string;
  title_en: string;
  body_es: string | null;
  body_en: string | null;
  source: string | null;
  source_url: string | null;
  sort_order: number;
  active: boolean;
  updated_at: string;
}

export interface MarketIndicator {
  id: string;
  key: string; // 'usd_dop' | 'kwh_cepm' | 'hotel_occ_bavaro' | 'arrivals_puj' | …
  period: string;
  period_label_es: string | null;
  period_label_en: string | null;
  value: number;
  unit: string;
  label_es: string;
  label_en: string;
  source: string | null;
  source_url: string | null;
  updated_at: string;
}

export interface MarketUpdate {
  id: string;
  ran_at: string;
  summary_es: string;
  summary_en: string;
  sources: string[];
}

export interface CanaDnaData {
  zones: MarketZone[];
  months: MarketMonth[];
  notes: MarketNote[];
  indicators: MarketIndicator[]; // el más reciente de cada key primero
  updates: MarketUpdate[]; // más reciente primero
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Lectura pública con la llave anónima, sin pasar por la sesión del cliente de Supabase
// (una sesión vieja de /admin puede dejar colgado el refresco del token; ver AppsPage).
async function getPublic<T>(path: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    cache: "no-store",
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchCanaDna(): Promise<CanaDnaData> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 12000);
  try {
    const [zones, months, notes, indicators, updates] = await Promise.all([
      getPublic<MarketZone[]>("market_zones?select=*&active=eq.true&order=sort_order", ctrl.signal),
      getPublic<MarketMonth[]>("market_monthly?select=*&order=year,month", ctrl.signal),
      getPublic<MarketNote[]>("market_notes?select=*&active=eq.true&order=sort_order", ctrl.signal),
      getPublic<MarketIndicator[]>("market_indicators?select=*&order=key,period.desc", ctrl.signal),
      getPublic<MarketUpdate[]>("market_updates?select=*&order=ran_at.desc&limit=10", ctrl.signal),
    ]);
    const num = (v: unknown) => (v == null ? null : Number(v));
    return {
      zones: zones.map((z) => ({
        ...z,
        lat: Number(z.lat),
        lng: Number(z.lng),
        listings_growth_pct: num(z.listings_growth_pct),
        avg_property_price: num(z.avg_property_price),
      })),
      months: months.map((m) => ({ ...m, occupancy: Number(m.occupancy), adr: Number(m.adr) })),
      notes,
      indicators: indicators.map((i) => ({ ...i, value: Number(i.value) })),
      updates,
    };
  } finally {
    window.clearTimeout(timer);
  }
}

// ── Cálculos ─────────────────────────────────────────────────────────────────

export const MONTHS = {
  es: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

export const MONTHS_LONG = {
  es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

const daysIn = (year: number, month: number) => new Date(year, month, 0).getDate();
const key = (year: number, month: number) => year * 12 + (month - 1);

/** Pesos del Cana Score (suman 1). */
export const SCORE_WEIGHTS = {
  score_demand: 0.3,
  score_investability: 0.25,
  score_growth: 0.15,
  score_seasonality: 0.15,
  score_regulation: 0.15,
} as const;

export function canaScore(z: MarketZone) {
  return Math.round(
    (Object.keys(SCORE_WEIGHTS) as (keyof typeof SCORE_WEIGHTS)[]).reduce((s, k) => s + z[k] * SCORE_WEIGHTS[k], 0)
  );
}

/** Un punto mensual ya agregado (una zona o todo el mercado). */
export interface MonthPoint {
  year: number;
  month: number;
  occupancy: number;
  adr: number;
  revpar: number;
  revenue: number; // ingreso mensual de una propiedad típica
  is_estimate: boolean;
}

/**
 * Serie mensual de una zona, o de todo el mercado (`zone = null`) ponderando cada zona
 * por sus propiedades activas.
 */
export function monthlySeries(data: CanaDnaData, zone: string | null): MonthPoint[] {
  const weight = new Map(data.zones.map((z) => [z.slug, Math.max(1, z.active_listings ?? 1)]));
  const rows = data.months.filter((m) => (zone ? m.zone_slug === zone : weight.has(m.zone_slug)));
  const byPeriod = new Map<number, MarketMonth[]>();
  for (const r of rows) {
    const k = key(r.year, r.month);
    byPeriod.set(k, [...(byPeriod.get(k) ?? []), r]);
  }
  return [...byPeriod.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, list]) => {
      const { year, month } = list[0];
      let w = 0, occ = 0, rev = 0;
      for (const r of list) {
        const wi = zone ? 1 : weight.get(r.zone_slug) ?? 1;
        w += wi;
        occ += r.occupancy * wi;
        rev += r.occupancy * r.adr * wi; // ingreso por noche disponible × peso
      }
      const occupancy = occ / w;
      const revpar = rev / w / 100;
      // ADR coherente con la ocupación agregada (noches vendidas ponderadas)
      const adr = occupancy > 0 ? (revpar * 100) / occupancy : 0;
      return {
        year, month, occupancy, adr, revpar,
        revenue: revpar * daysIn(year, month),
        is_estimate: list.some((r) => r.is_estimate),
      };
    });
}

export interface PeriodSummary {
  occupancy: number;
  adr: number;
  revpar: number;
  revenue: number; // ingreso anual de una propiedad típica
  months: number;
}

function summarize(points: MonthPoint[]): PeriodSummary | null {
  if (!points.length) return null;
  const nights = points.reduce((s, p) => s + daysIn(p.year, p.month), 0);
  const sold = points.reduce((s, p) => s + (p.occupancy / 100) * daysIn(p.year, p.month), 0);
  const revenue = points.reduce((s, p) => s + p.revenue, 0);
  return {
    occupancy: (sold / nights) * 100,
    adr: sold > 0 ? revenue / sold : 0,
    revpar: revenue / nights,
    revenue: (revenue / points.length) * 12,
    months: points.length,
  };
}

/** Últimos 12 meses vs. los 12 anteriores. */
export function trailingSummary(series: MonthPoint[]) {
  const last = series.slice(-12);
  const prev = series.slice(-24, -12);
  const cur = summarize(last);
  const before = prev.length === 12 ? summarize(prev) : null;
  const pct = (a?: number, b?: number) => (a != null && b ? ((a - b) / b) * 100 : null);
  return {
    current: cur,
    previous: before,
    change: {
      occupancy: cur && before ? cur.occupancy - before.occupancy : null, // puntos
      adr: pct(cur?.adr, before?.adr),
      revpar: pct(cur?.revpar, before?.revpar),
      revenue: pct(cur?.revenue, before?.revenue),
    },
    lastPoint: series[series.length - 1] ?? null,
  };
}

/** Promedio por mes del calendario (1–12) usando todo el historial disponible. */
export function seasonalProfile(series: MonthPoint[]) {
  return Array.from({ length: 12 }, (_, i) => {
    const ms = series.filter((p) => p.month === i + 1);
    const avg = (f: (p: MonthPoint) => number) => (ms.length ? ms.reduce((s, p) => s + f(p), 0) / ms.length : 0);
    return { month: i + 1, occupancy: avg((p) => p.occupancy), adr: avg((p) => p.adr), revpar: avg((p) => p.revpar) };
  });
}

/** 100 = ingreso estable todo el año; 0 = muy concentrado en pocos meses. */
export function seasonalityScore(profile: ReturnType<typeof seasonalProfile>) {
  const v = profile.map((p) => p.revpar).filter((x) => x > 0);
  if (!v.length) return 0;
  const max = Math.max(...v);
  const min = Math.min(...v);
  return Math.round((min / max) * 100);
}

export interface ProjectionPoint {
  year: number;
  month: number;
  conservative: number;
  base: number;
  optimistic: number;
  occupancy: number;
  adr: number;
}

/**
 * Proyección de ingreso mensual de una propiedad típica para los próximos 12 meses:
 * mismo mes del último año × tendencia anual (acotada a ±10 %). Escenarios: −12 % / +10 %.
 */
export function projectNext12(series: MonthPoint[]): ProjectionPoint[] {
  if (!series.length) return [];
  const { change } = trailingSummary(series);
  const trend = Math.max(-0.1, Math.min(0.1, (change.revpar ?? 0) / 100));
  const last = series[series.length - 1];
  const byKey = new Map(series.map((p) => [key(p.year, p.month), p]));
  return Array.from({ length: 12 }, (_, i) => {
    const k = key(last.year, last.month) + i + 1;
    const year = Math.floor(k / 12);
    const month = (k % 12) + 1;
    const ref = byKey.get(k - 12) ?? last;
    const base = ref.revpar * (1 + trend) * daysIn(year, month);
    return {
      year, month,
      base,
      conservative: base * 0.88,
      optimistic: base * 1.1,
      occupancy: ref.occupancy,
      adr: ref.adr * (1 + trend),
    };
  });
}

/** Indicador más reciente por key. */
export function latestIndicator(data: CanaDnaData, key: string) {
  return data.indicators.filter((i) => i.key === key).sort((a, b) => (a.period < b.period ? 1 : -1))[0] ?? null;
}

// ── Rendimiento por tamaño y propiedades top ────────────────────────────────

/**
 * Multiplicadores de referencia sobre la propiedad típica de la zona (≈ 1–2 hab.):
 * las unidades grandes cobran más por noche pero se llenan algo menos.
 * kwh y hoa son consumo de luz al mes y cuota de mantenimiento (USD/mes) típicos.
 */
export const BEDROOMS = [
  { id: "studio", es: "Estudio", en: "Studio", adr: 0.8, occ: 1.04, kwh: 300, hoa: 120 },
  { id: "1", es: "1 habitación", en: "1 bedroom", adr: 1, occ: 1, kwh: 450, hoa: 180 },
  { id: "2", es: "2 habitaciones", en: "2 bedrooms", adr: 1.4, occ: 0.97, kwh: 650, hoa: 250 },
  { id: "3", es: "3 habitaciones", en: "3 bedrooms", adr: 1.85, occ: 0.92, kwh: 900, hoa: 350 },
  { id: "4", es: "4+ habitaciones", en: "4+ bedrooms", adr: 2.6, occ: 0.85, kwh: 1300, hoa: 500 },
] as const;

/** Una propiedad bien gestionada (top 25 %) frente al promedio de la zona. */
export const TOP_PERFORMER = { occPts: 15, adr: 1.15 };

// ── Calculadora de ingreso neto (modelo de /admin/calculadora + luz y mantenimiento) ──

export function netIncome(p: {
  adr: number; occupancy: number; price: number; itbis: number; commission: number; opex: number;
  hoaMonthly: number; kwhMonthly: number; kwhPriceUsd: number;
}) {
  const occ = p.occupancy / 100;
  const nights = Math.round(365 * occ);
  const gross = p.adr * 365 * occ;
  const itbisAmt = gross * (p.itbis / 100);
  const commAmt = gross * (p.commission / 100);
  const opexAmt = gross * (p.opex / 100);
  const hoaAmt = p.hoaMonthly * 12;
  const powerAmt = p.kwhMonthly * p.kwhPriceUsd * 12;
  const net = gross - itbisAmt - commAmt - opexAmt - hoaAmt - powerAmt;
  return {
    nights, gross, itbisAmt, commAmt, opexAmt, hoaAmt, powerAmt, net,
    roiGross: p.price > 0 ? (gross / p.price) * 100 : 0,
    roiNet: p.price > 0 ? (net / p.price) * 100 : 0,
    payback: net > 0 ? p.price / net : null,
  };
}

export function fmtUsd(n: number, decimals = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(n);
}

export function fmtCompactUsd(n: number) {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}K`;
  return fmtUsd(n);
}
