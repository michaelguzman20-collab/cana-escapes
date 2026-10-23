import { createContext, lazy, Suspense, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer, ComposedChart, AreaChart, BarChart, Area, Line, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine, Cell,
} from "recharts";
import {
  Dna, TrendingUp, TrendingDown, Minus, MapPin, CalendarDays, LineChart as LineIcon, Calculator,
  AlertTriangle, Lightbulb, BarChart3, RefreshCw, ExternalLink, Home, Building2, Info,
  ChevronLeft, ChevronRight, Hand, CalendarClock, Zap, Landmark, Plane, Hotel, DollarSign, Trophy, BedDouble,
} from "lucide-react";
import { LangProvider, useLang } from "@/lib/LangContext";
import { useSeo } from "@/lib/useSeo";
import { LandingNavbar } from "@/components/cana/LandingNavbar";
import { LandingFooter } from "@/components/cana/LandingFooter";
import { WhatsAppIcon } from "@/components/cana/WhatsAppIcon";
import {
  fetchCanaDna, monthlySeries, trailingSummary, seasonalProfile, seasonalityScore, projectNext12,
  canaScore, netIncome, latestIndicator, MONTHS, MONTHS_LONG, BEDROOMS, SCORE_WEIGHTS,
  TOP_PERFORMER, type CanaDnaData, type MarketZone, type MonthPoint,
} from "@/lib/canaDna";

// MapLibre pesa bastante: se carga solo cuando se abre Cana DNA
const ZoneMap = lazy(() => import("@/components/canadna/ZoneMap"));

const WA_URL = "https://wa.me/18092102773";
const NAVY = "#0F2B4C";
const AMBER = "#F0A030";
const SKY = "#7FA0C8";
// La rutina semanal en la nube corre los lunes 00:00 UTC = domingo 8:00 pm en RD (cron `0 0 * * 1`)
function nextWeeklyRun(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7)); // próximo lunes UTC (hoy si es lunes)
  if (d.getTime() + 15 * 60 * 1000 <= now.getTime()) d.setUTCDate(d.getUTCDate() + 7); // ya corrió esta semana
  return d;
}
// Si la base aún no tiene el dato de la luz/dólar, se usan estos (CEPM RBT-1 y BCRD, oct-2026)
const FALLBACK_KWH_RD = 22.9;
const FALLBACK_USD_DOP = 61.83;

// ── Textos (ES/EN) ──────────────────────────────────────────────────────────
const TX = {
  es: {
    badge: "Cana DNA · Inteligencia de mercado",
    title: "El ADN de la renta corta en Punta Cana",
    desc: "Ocupación, precios, ingresos, temporadas y proyecciones de cada zona de Bávaro y Punta Cana, explicados de forma sencilla.",
    weekly: "Se actualiza cada semana",
    lastUpdate: "Última actualización",
    nextUpdate: "Próxima",
    estimateNote: "Las cifras por zona son estimados de referencia de Cana Escapes.",
    pick: "Elige una zona",
    currency: "Moneda",
    rateNote: (rate: string, date: string) => `Tasa BCRD: ${rate} por US$1 · ${date}`,
    rateShort: (rate: string) => `BCRD ${rate}`,
    pickHint: "Toca una zona para ver sus datos",
    all: "Todo el mercado",
    tabs: { overview: "Resumen", week: "Esta semana", perf: "Rendimiento", map: "Mapa", trends: "Mes a mes", season: "Temporadas", forecast: "Proyección", calc: "Calculadora", market: "Mercado" },
    score: "Cana Score",
    scoreQ: "¿Qué tan buena es esta zona para rentar?",
    comps: { score_demand: "Demanda de huéspedes", score_investability: "Retorno de inversión", score_growth: "Crecimiento", score_seasonality: "Ingreso parejo todo el año", score_regulation: "Reglas y permisos" },
    simple: (zone: string, occ: number, adr: string, rev: string) =>
      `En ${zone}, de cada 10 noches se reservan ${occ}, a un precio promedio de ${adr} la noche. Una propiedad típica genera unos ${rev} al año.`,
    kRevenue: "Ingreso al año", kRevenueSub: "propiedad típica, antes de gastos",
    kOcc: "Noches reservadas", kOccSub: "ocupación",
    kAdr: "Precio por noche", kAdrSub: "promedio (ADR)",
    kRevpar: "Ganancia por noche disponible", kRevparSub: "RevPAR",
    kListings: "Propiedades en renta", vsLast: "vs. año pasado", pts: "pts",
    nights: "noches",
    help: {
      score: "Nota de 0 a 100 que resume si la zona es buena para invertir en renta corta. Combina demanda, retorno, crecimiento, estabilidad y regulación.",
      occ: "Porcentaje de noches que estuvieron reservadas. 60 % significa 18 de cada 30 noches.",
      adr: "Lo que paga el huésped en promedio por cada noche reservada (ADR). No cuenta las noches vacías.",
      revpar: "Lo que deja cada noche del año, contando también las vacías (RevPAR = ocupación × precio). Es la mejor medida para comparar zonas.",
      revenue: "Ingreso bruto de una propiedad típica en 12 meses, antes de comisiones, impuestos y gastos.",
      listings: "Cantidad aproximada de propiedades anunciadas en renta corta en la zona y cuánto creció la oferta en el último año.",
    },
    weekTitle: "Novedades de esta semana", weekDesc: "Indicadores oficiales que revisamos cada semana.",
    history: "Actualizaciones anteriores",
    perfTitle: "¿Cuánto rinde una propiedad aquí?", perfDesc: "Ingreso anual estimado según el tamaño, y la diferencia que hace una buena gestión.",
    bySize: "Ingreso al año por tamaño",
    topTitle: "Promedio vs. propiedad bien gestionada",
    topDesc: "Las propiedades del 25 % superior se reservan más y cobran mejor gracias a fotos, precios dinámicos, reseñas y atención rápida.",
    avg: "Promedio de la zona", top: "Top 25 %", more: "más al año",
    mapTitle: "Mapa de rendimiento por zona", mapHint: "Toca una burbuja para ver esa zona. En el celular, mueve el mapa con dos dedos.",
    metric: "Ver en el mapa",
    metrics: { score: "Cana Score", occupancy: "Noches reservadas", adr: "Precio por noche", revpar: "Ganancia por noche", revenue: "Ingreso al año" },
    ranking: "Ranking de zonas", listings: "propiedades", growth: "oferta",
    loadingMap: "Cargando mapa…",
    trendsTitle: "Mes a mes", trendsDesc: "Cómo se movieron las reservas, los precios y los ingresos en los últimos 24 meses.",
    series: { occupancy: "Noches reservadas", adr: "Precio por noche", revenue: "Ingreso del mes" },
    seriesHelp: {
      occupancy: "De cada 100 noches del mes, cuántas se reservaron.",
      adr: "Precio promedio que pagaron los huéspedes por noche.",
      revenue: "Lo que generó una propiedad típica en el mes, antes de gastos.",
    },
    average: "Promedio",
    insightBest: (m: string, occ: number, adr: string) => `${m} es el mes más fuerte: se reservan ${occ} de cada 10 noches a ${adr}.`,
    insightWorst: (m: string, occ: number) => `${m} es el más flojo: solo ${occ} de cada 10 noches. Buen momento para promociones y mantenimiento.`,
    insightYoy: (up: boolean, p: string) => (up ? `Este año se generó ${p} más que el año pasado.` : `Este año se generó ${p} menos que el año pasado: hay más competencia.`),
    yoyTitle: "Este año vs. año pasado", yoyDesc: "Ingreso de una propiedad típica en cada mes.",
    thisYear: "Últimos 12 meses", lastYear: "12 meses anteriores",
    seasonTitle: "Calendario de temporadas", seasonDesc: "Qué esperar cada mes: cuánto se gana, a qué precio, el clima, los eventos y qué hacer con tu precio.",
    seasonHow: "Cómo leer cada mes: la cifra grande es lo que gana una propiedad típica de la zona en ese mes (estimado, antes de gastos). Debajo verás el precio promedio por noche y cuántas de cada 10 noches se reservan. Cuanto más oscuro el cuadro, más rentable es el mes.",
    perMonthLabel: "al mes", perNightShort: "/noche",
    best: "Mejor mes", worst: "Mes más flojo", seasonScore: "Estabilidad del ingreso", seasonScoreHint: "100 = gana lo mismo todo el año",
    advice: { up: "Sube precios", normal: "Precio normal", down: "Promociones" },
    perNight: "por noche disponible",
    fcTitle: "Proyección de ingresos — próximos 12 meses", fcDesc: "Basada en el mismo mes del año pasado y la tendencia de la zona. La franja muestra el rango entre un escenario conservador y uno optimista.",
    conservative: "Conservador", base: "Esperado", optimistic: "Optimista", fcTotal: "en 12 meses", range: "Rango posible", cumulative: "Acumulado",
    fcAvg: "Promedio al mes", fcBest: "Mejor mes", fcWorst: "Mes más bajo",
    fcMonthsTitle: "Detalle de cada mes (escenario esperado)",
    fcMonthsDesc: "Cuánto podría ganar una propiedad típica en cada uno de los próximos 12 meses y cuántas noches se reservarían. La barra compara cada mes con el mejor.",
    calcTitle: "Calculadora de ingreso neto RD", calcDesc: "Lo que te queda de verdad después de ITBIS, gestión de la propiedad, mantenimiento del condominio y luz.",
    bedrooms: "Tamaño", occ: "Noches reservadas (ocupación)", adr: "Precio por noche", price: "Precio de compra",
    mgmt: "Gestión de propiedad", mgmtHint: "comisiones de plataformas, gestión y limpieza", itbis: "ITBIS",
    hoa: "Mantenimiento del condominio", hoaHint: "cuota mensual", perMonthShort: "/mes",
    power: "Luz", kwh: "Consumo", kwhPrice: "Tarifa", rate: "Tasa del dólar",
    powerSource: (rd: string, date: string) => `Tarifa CEPM ${rd}/kWh (${date}). Con huéspedes y aire acondicionado, la luz es uno de los gastos más altos.`,
    gross: "Ingreso bruto al año", net: "Te queda al año", roi: "Retorno neto", payback: "Recuperas la inversión en", years: "años", nightsSold: "noches vendidas",
    useZone: "Usar datos de la zona",
    calcNote: "El neto no incluye ISR ni hipoteca.",
    marketTitle: "Lo que mueve el mercado", stats: "Turismo en cifras", alerts: "Alertas", opps: "Oportunidades", source: "Fuente",
    ctaTitle: "¿Tienes una propiedad en esta zona?", ctaDesc: "Te decimos cuánto puede generar y la gestionamos por ti.",
    ctaOwners: "Soy propietario", ctaWa: "Escríbenos por WhatsApp",
    loadError: "No pudimos cargar los datos del mercado.", retry: "Reintentar",
    perMonth: "/mes",
    grossShort: "bruto",
  },
  en: {
    badge: "Cana DNA · Market intelligence",
    title: "The DNA of short-term rentals in Punta Cana",
    desc: "Occupancy, prices, revenue, seasons and forecasts for every area of Bávaro and Punta Cana, explained simply.",
    weekly: "Updated every week",
    lastUpdate: "Last update",
    nextUpdate: "Next",
    estimateNote: "Area figures are Cana Escapes reference estimates.",
    pick: "Pick an area",
    currency: "Currency",
    rateNote: (rate: string, date: string) => `BCRD rate: ${rate} per US$1 · ${date}`,
    rateShort: (rate: string) => `BCRD ${rate}`,
    pickHint: "Tap an area to see its data",
    all: "Whole market",
    tabs: { overview: "Overview", week: "This week", perf: "Performance", map: "Map", trends: "Month by month", season: "Seasons", forecast: "Forecast", calc: "Calculator", market: "Market" },
    score: "Cana Score",
    scoreQ: "How good is this area for rentals?",
    comps: { score_demand: "Guest demand", score_investability: "Return on investment", score_growth: "Growth", score_seasonality: "Even income all year", score_regulation: "Rules and permits" },
    simple: (zone: string, occ: number, adr: string, rev: string) =>
      `In ${zone}, ${occ} out of every 10 nights get booked, at an average of ${adr} per night. A typical listing earns about ${rev} a year.`,
    kRevenue: "Revenue per year", kRevenueSub: "typical listing, before costs",
    kOcc: "Nights booked", kOccSub: "occupancy",
    kAdr: "Price per night", kAdrSub: "average (ADR)",
    kRevpar: "Earnings per available night", kRevparSub: "RevPAR",
    kListings: "Listings for rent", vsLast: "vs. last year", pts: "pts",
    nights: "nights",
    help: {
      score: "A 0–100 grade that sums up whether the area is good for short-term rental investment. It combines demand, return, growth, stability and regulation.",
      occ: "Share of nights that were booked. 60% means 18 out of 30 nights.",
      adr: "What guests pay on average for each booked night (ADR). Empty nights don't count.",
      revpar: "What each night of the year earns, counting empty nights too (RevPAR = occupancy × price). The best way to compare areas.",
      revenue: "Gross revenue of a typical listing over 12 months, before fees, taxes and costs.",
      listings: "Approximate number of short-term rental listings in the area and how much supply grew over the last year.",
    },
    weekTitle: "This week's update", weekDesc: "Official indicators we review every week.",
    history: "Previous updates",
    perfTitle: "How much does a property earn here?", perfDesc: "Estimated annual revenue by size, and the difference good management makes.",
    bySize: "Revenue per year by size",
    topTitle: "Average vs. well-managed property",
    topDesc: "Top-25% listings get more bookings and better rates thanks to photos, dynamic pricing, reviews and fast replies.",
    avg: "Area average", top: "Top 25%", more: "more per year",
    mapTitle: "Performance map by area", mapHint: "Tap a bubble to see that area. On your phone, move the map with two fingers.",
    metric: "Show on map",
    metrics: { score: "Cana Score", occupancy: "Nights booked", adr: "Price per night", revpar: "Earnings per night", revenue: "Revenue per year" },
    ranking: "Area ranking", listings: "listings", growth: "supply",
    loadingMap: "Loading map…",
    trendsTitle: "Month by month", trendsDesc: "How bookings, prices and revenue moved over the last 24 months.",
    series: { occupancy: "Nights booked", adr: "Price per night", revenue: "Monthly revenue" },
    seriesHelp: {
      occupancy: "Out of every 100 nights in the month, how many were booked.",
      adr: "Average price guests paid per night.",
      revenue: "What a typical listing earned in the month, before costs.",
    },
    average: "Average",
    insightBest: (m: string, occ: number, adr: string) => `${m} is the strongest month: ${occ} out of 10 nights are booked at ${adr}.`,
    insightWorst: (m: string, occ: number) => `${m} is the weakest: only ${occ} out of 10 nights. A good time for promotions and maintenance.`,
    insightYoy: (up: boolean, p: string) => (up ? `This year earned ${p} more than last year.` : `This year earned ${p} less than last year: there is more competition.`),
    yoyTitle: "This year vs. last year", yoyDesc: "Revenue of a typical listing each month.",
    thisYear: "Last 12 months", lastYear: "Previous 12 months",
    seasonTitle: "Season calendar", seasonDesc: "What to expect each month: how much you earn, at what price, the weather, events and what to do with your price.",
    seasonHow: "How to read each month: the big number is what a typical listing in the area earns that month (estimate, before costs). Below it you'll see the average price per night and how many out of 10 nights get booked. The darker the box, the more profitable the month.",
    perMonthLabel: "per month", perNightShort: "/night",
    best: "Best month", worst: "Weakest month", seasonScore: "Income stability", seasonScoreHint: "100 = earns the same all year",
    advice: { up: "Raise prices", normal: "Normal price", down: "Promotions" },
    perNight: "per available night",
    fcTitle: "Revenue forecast — next 12 months", fcDesc: "Based on the same month last year and the area's trend. The band shows the range between a conservative and an optimistic scenario.",
    conservative: "Conservative", base: "Expected", optimistic: "Optimistic", fcTotal: "over 12 months", range: "Possible range", cumulative: "Cumulative",
    fcAvg: "Monthly average", fcBest: "Best month", fcWorst: "Lowest month",
    fcMonthsTitle: "Month-by-month detail (expected scenario)",
    fcMonthsDesc: "What a typical listing could earn in each of the next 12 months and how many nights would be booked. The bar compares each month with the best one.",
    calcTitle: "DR net income calculator", calcDesc: "What you really keep after ITBIS, property management, condo maintenance and electricity.",
    bedrooms: "Size", occ: "Nights booked (occupancy)", adr: "Price per night", price: "Purchase price",
    mgmt: "Property management", mgmtHint: "platform fees, management and cleaning", itbis: "ITBIS (VAT)",
    hoa: "Condo maintenance fee", hoaHint: "monthly fee", perMonthShort: "/mo",
    power: "Electricity", kwh: "Usage", kwhPrice: "Rate", rate: "Dollar rate",
    powerSource: (rd: string, date: string) => `CEPM rate ${rd}/kWh (${date}). With guests and air conditioning, power is one of the biggest costs.`,
    gross: "Gross revenue per year", net: "You keep per year", roi: "Net return", payback: "Payback in", years: "years", nightsSold: "nights sold",
    useZone: "Use area data",
    calcNote: "Net excludes income tax (ISR) and mortgage.",
    marketTitle: "What moves the market", stats: "Tourism in numbers", alerts: "Alerts", opps: "Opportunities", source: "Source",
    ctaTitle: "Own a property in this area?", ctaDesc: "We'll tell you what it can earn and manage it for you.",
    ctaOwners: "I'm an owner", ctaWa: "Message us on WhatsApp",
    loadError: "We couldn't load the market data.", retry: "Retry",
    perMonth: "/mo",
    grossShort: "gross",
  },
};
type Tx = typeof TX.es;
type MetricKey = keyof Tx["metrics"];
type SeriesKey = keyof Tx["series"];

const INDICATOR_ICONS = { hotel_occ_bavaro: Hotel, arrivals_puj: Plane, usd_dop: DollarSign, kwh_cepm: Zap } as const;

// Clima aproximado de Punta Cana y eventos que mueven la demanda, por mes
const SEASON_INFO: { icon: string; temp: number; es: string; en: string }[] = [
  { icon: "☀️", temp: 29, es: "Año Nuevo y Día de Reyes", en: "New Year & Three Kings Day" },
  { icon: "☀️", temp: 29, es: "Carnaval · Independencia (27 feb)", en: "Carnival · Independence Day" },
  { icon: "☀️", temp: 29, es: "Spring break · Semana Santa 2027 (21–28 mar)", en: "Spring break · Easter 2027 (Mar 21–28)" },
  { icon: "☀️", temp: 30, es: "Spring break y feriados de Pascua", en: "Spring break & Easter holidays" },
  { icon: "🌦️", temp: 30, es: "Temporada media, lluvias cortas", en: "Shoulder season, short showers" },
  { icon: "🌦️", temp: 31, es: "Inicia temporada de huracanes", en: "Hurricane season starts" },
  { icon: "☀️", temp: 31, es: "Vacaciones de verano · 4 de julio", en: "Summer holidays · July 4" },
  { icon: "☀️", temp: 31, es: "Verano · Restauración (16 ago)", en: "Summer · Restoration Day" },
  { icon: "🌀", temp: 31, es: "Pico de huracanes, temporada baja", en: "Hurricane peak, low season" },
  { icon: "🌀", temp: 31, es: "Temporada baja · Thanksgiving Canadá", en: "Low season · Canadian Thanksgiving" },
  { icon: "🌦️", temp: 30, es: "Thanksgiving EE. UU.: arranca la alta", en: "US Thanksgiving: high season starts" },
  { icon: "☀️", temp: 29, es: "Navidad y fin de año", en: "Christmas & New Year" },
];

const pct = (n: number, d = 0) => `${n.toFixed(d)}%`;
// Fechas siempre en hora de RD, para que el domingo 8 pm no se vea como lunes fuera del país
const fmtDate = (iso: string, l: "es" | "en") =>
  new Date(iso).toLocaleDateString(l === "en" ? "en-US" : "es-DO", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Santo_Domingo" });
const tenths = (occ: number) => Math.round(occ / 10);
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ── Moneda: todos los montos se guardan en US$ y se muestran en US$ o RD$ ────
type Currency = "usd" | "dop";
interface Money {
  cur: Currency;
  rate: number; // RD$ por US$1 (Banco Central)
  fmt: (usd: number) => string;
  compact: (usd: number) => string;
}
const CURRENCY_KEY = "cdna_currency";
const formatUsd = (n: number) => `US$${Math.round(n).toLocaleString("en-US")}`;
const formatDop = (n: number) => `RD$${Math.round(n).toLocaleString("en-US")}`;

function makeMoney(cur: Currency, rate: number): Money {
  const prefix = cur === "usd" ? "US$" : "RD$";
  const conv = (usd: number) => (cur === "usd" ? usd : usd * rate);
  return {
    cur,
    rate,
    fmt: (usd) => `${prefix}${Math.round(conv(usd)).toLocaleString("en-US")}`,
    compact: (usd) => {
      const n = conv(usd);
      const a = Math.abs(n);
      if (a >= 1e6) return `${prefix}${(n / 1e6).toFixed(1)}M`;
      if (a >= 1000) return `${prefix}${(n / 1000).toFixed(a >= 1e5 ? 0 : 1)}K`;
      return `${prefix}${Math.round(n)}`;
    },
  };
}

const MoneyCtx = createContext<Money>(makeMoney("usd", FALLBACK_USD_DOP));
const useMoney = () => useContext(MoneyCtx);

function readCurrency(): Currency {
  try {
    return window.localStorage.getItem(CURRENCY_KEY) === "dop" ? "dop" : "usd";
  } catch {
    return "usd";
  }
}

// ── Piezas ───────────────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-white border border-[#0F2B4C]/10 shadow-xl shadow-[#0F2B4C]/5 ${className}`}>{children}</div>;
}

function SectionTitle({ id, icon, title, desc }: { id: string; icon: ReactNode; title: string; desc?: string }) {
  return (
    <div id={id} className="scroll-mt-52 mb-5">
      <h2 className="flex items-center gap-2.5 text-2xl sm:text-3xl font-serif font-bold text-[#0F2B4C]">
        <span className="text-[#F0A030]">{icon}</span>
        {title}
      </h2>
      {desc && <p className="mt-1.5 text-[#0F2B4C]/60 max-w-3xl">{desc}</p>}
    </div>
  );
}

/** Explicación sencilla de un término (hover en escritorio, toque en el celular). */
function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={text}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        className="ml-1 text-[#0F2B4C]/35 hover:text-[#b8761a]"
      >
        <Info size={14} />
      </button>
      {open && (
        <span className="absolute z-40 left-1/2 -translate-x-1/2 bottom-6 w-60 rounded-xl bg-[#0F2B4C] text-white text-xs font-normal leading-relaxed p-3 shadow-xl">
          {text}
        </span>
      )}
    </span>
  );
}

function Delta({ value, unit = "%", tx }: { value: number | null; unit?: string; tx: Tx }) {
  if (value == null) return <span className="text-xs text-[#0F2B4C]/40">—</span>;
  const up = value > 0.05;
  const down = value < -0.05;
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  const color = up ? "text-emerald-700 bg-emerald-50" : down ? "text-rose-700 bg-rose-50" : "text-[#0F2B4C]/60 bg-[#F5F7FA]";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      <Icon size={12} />
      {value > 0 ? "+" : ""}{value.toFixed(1)}{unit === "pts" ? ` ${tx.pts}` : unit} {tx.vsLast}
    </span>
  );
}

function Kpi({ label, value, sub, help, delta, extra }: { label: string; value: string; sub?: string; help: string; delta: ReactNode; extra?: ReactNode }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-[#0F2B4C]/60">{label}<InfoTip text={help} /></p>
      <p className="mt-1 text-3xl font-bold text-[#0F2B4C] tabular-nums">{value}</p>
      {sub && <p className="text-xs text-[#0F2B4C]/45">{sub}</p>}
      {extra}
      <div className="mt-3">{delta}</div>
    </Card>
  );
}

/** Diez barritas: cuántas noches de cada 10 se reservan. */
function NightDots({ occ }: { occ: number }) {
  const n = tenths(occ);
  return (
    <div className="mt-2 flex gap-1" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={`h-2.5 flex-1 rounded-full ${i < n ? "bg-[#F0A030]" : "bg-[#0F2B4C]/10"}`} />
      ))}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 128 128" className="w-36 h-36">
      <circle cx="64" cy="64" r={r} fill="none" stroke={AMBER} strokeOpacity="0.15" strokeWidth="12" />
      <circle
        cx="64" cy="64" r={r} fill="none" stroke={AMBER} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 64 64)"
        style={{ transition: "stroke-dasharray .8s ease" }}
      />
      <text x="64" y="74" textAnchor="middle" fontSize="34" fontWeight="700" fill={NAVY}>{score}</text>
    </svg>
  );
}

function Toggle<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl bg-[#F5F7FA] p-1">
      {options.map(([k, label]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all ${value === k ? "bg-[#0F2B4C] text-white shadow" : "text-[#0F2B4C]/65 hover:text-[#0F2B4C]"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────

function CanaDnaContent() {
  const { lang } = useLang();
  const l = lang === "en" ? "en" : "es";
  const tx = TX[l];
  const [data, setData] = useState<CanaDnaData | null>(null);
  const [failed, setFailed] = useState(false);
  const [zone, setZone] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [metric, setMetric] = useState<MetricKey>("score");
  const [trendKey, setTrendKey] = useState<SeriesKey>("occupancy");
  const [currency, setCurrencyState] = useState<Currency>(readCurrency);
  const usdInd = data ? latestIndicator(data, "usd_dop") : null;
  const rate = usdInd?.value ?? FALLBACK_USD_DOP;
  const money = useMemo(() => makeMoney(currency, rate), [currency, rate]);
  function setCurrency(c: Currency) {
    setCurrencyState(c);
    try {
      window.localStorage.setItem(CURRENCY_KEY, c);
    } catch {
      /* sin almacenamiento: la elección vale solo para esta visita */
    }
  }

  function load() {
    setFailed(false);
    fetchCanaDna().then(setData).catch(() => setFailed(true));
  }
  useEffect(() => {
    window.scrollTo(0, 0);
    load();
  }, []);

  function pickZone(slug: string | null) {
    setZone(slug);
    setTouched(true);
  }

  const selectedZone = data?.zones.find((z) => z.slug === zone) ?? null;

  // Últimos 12 meses por zona (mapa, ranking y selector)
  const zoneStats = useMemo(() => {
    if (!data) return [];
    return data.zones.map((z) => ({ zone: z, score: canaScore(z), ...trailingSummary(monthlySeries(data, z.slug)) }));
  }, [data]);

  const series = useMemo(() => (data ? monthlySeries(data, zone) : []), [data, zone]);
  const summary = useMemo(() => trailingSummary(series), [series]);
  const profile = useMemo(() => seasonalProfile(series), [series]);
  const forecast = useMemo(() => projectNext12(series), [series]);
  const mapValues = useMemo(() => Object.fromEntries(zoneStats.map((s) => [s.zone.slug, metricValue(s, metric)])), [zoneStats, metric]);
  const mapFormat = useMemo(() => (v: number) => formatMetric(metric, v, money), [metric, money]);

  if (failed) {
    return (
      <Shell tx={tx} l={l}>
        <Card className="p-8 text-center">
          <p className="font-semibold text-[#0F2B4C]">{tx.loadError}</p>
          <button onClick={load} className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 font-semibold text-[#0F2B4C] bg-[#F0A030] hover:bg-[#e5952a] rounded-xl">
            <RefreshCw size={16} /> {tx.retry}
          </button>
        </Card>
      </Shell>
    );
  }
  if (!data) {
    return (
      <Shell tx={tx} l={l}>
        <div className="grid sm:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-40 rounded-3xl bg-white animate-pulse" />)}
        </div>
      </Shell>
    );
  }

  const lastRun = data.updates[0]?.ran_at ?? null;

  // Score y propiedades del mercado completo = promedio ponderado por propiedades
  const totalListings = data.zones.reduce((s, z) => s + (z.active_listings ?? 0), 0);
  const weighted = (f: (z: MarketZone) => number) =>
    Math.round(data.zones.reduce((s, z) => s + f(z) * (z.active_listings ?? 0), 0) / Math.max(1, totalListings));
  const compValue = (k: keyof typeof SCORE_WEIGHTS) => (selectedZone ? selectedZone[k] : weighted((z) => z[k]));
  const score = selectedZone ? canaScore(selectedZone) : weighted(canaScore);
  const listings = selectedZone ? selectedZone.active_listings ?? 0 : totalListings;
  const listingsGrowth = selectedZone ? selectedZone.listings_growth_pct : weighted((z) => z.listings_growth_pct ?? 0);
  const zoneLabel = selectedZone?.name ?? tx.all;
  const cur = summary.current;
  const kwhInd = latestIndicator(data, "kwh_cepm");

  return (
    <MoneyCtx.Provider value={money}>
    <Shell tx={tx} l={l} lastRun={lastRun}>
      {/* ── Selector de zona ── */}
      <ZonePicker
        tx={tx}
        zones={zoneStats.map((s) => ({ slug: s.zone.slug, name: s.zone.name, score: s.score }))}
        allScore={weighted(canaScore)}
        selected={zone}
        onSelect={pickZone}
        pulse={!touched}
        currency={currency}
        onCurrency={setCurrency}
        rateLabel={tx.rateNote(`RD$${rate.toFixed(2)}`, (l === "es" ? usdInd?.period_label_es : usdInd?.period_label_en) ?? "")}
        rateShort={tx.rateShort(`RD$${rate.toFixed(2)}`)}
      />

      {/* ── Resumen ── */}
      <section className="mt-8">
        <SectionTitle id="overview" icon={<Dna size={26} />} title={`${tx.tabs.overview}: ${zoneLabel}`} />
        {cur && (
          <p className="mb-4 rounded-2xl bg-amber-50 border border-[#F0A030]/30 px-5 py-3.5 text-[#0F2B4C] leading-relaxed">
            💡 {tx.simple(zoneLabel, tenths(cur.occupancy), money.fmt(cur.adr), money.fmt(cur.revenue))}
          </p>
        )}
        <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-4">
          <Card className="p-6">
            <p className="font-semibold text-[#0F2B4C]">{tx.scoreQ}<InfoTip text={tx.help.score} /></p>
            <div className="mt-3 flex flex-col sm:flex-row items-center gap-6">
              <div className="text-center">
                <ScoreRing score={score} />
                <p className="text-sm font-semibold text-[#0F2B4C]/70">{tx.score}</p>
              </div>
              <ul className="flex-1 w-full space-y-2.5">
                {(Object.keys(SCORE_WEIGHTS) as (keyof typeof SCORE_WEIGHTS)[]).map((k) => (
                  <li key={k}>
                    <div className="flex justify-between text-sm text-[#0F2B4C]/75">
                      <span>{tx.comps[k]}</span>
                      <span className="font-semibold tabular-nums">{compValue(k)}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full overflow-hidden bg-[#F5F7FA]">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#0F2B4C] to-[#3A6A9E] transition-all duration-700" style={{ width: `${compValue(k)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {selectedZone && (
              <div className="mt-5 pt-5 border-t border-[#0F2B4C]/10">
                <p className="text-sm text-[#0F2B4C]/75">{l === "es" ? selectedZone.description_es : selectedZone.description_en}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {(l === "es" ? selectedZone.highlights_es : selectedZone.highlights_en).map((h) => (
                    <li key={h} className="px-3 py-1 rounded-full bg-amber-50 text-[#8a5a14] text-xs font-medium">{h}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Kpi label={tx.kRevenue} value={cur ? money.fmt(cur.revenue) : "—"} sub={tx.kRevenueSub} help={tx.help.revenue} delta={<Delta value={summary.change.revenue} tx={tx} />} />
            <Kpi
              label={tx.kOcc} value={cur ? pct(cur.occupancy) : "—"} sub={cur ? `${tenths(cur.occupancy)} / 10 ${tx.nights}` : tx.kOccSub}
              help={tx.help.occ} delta={<Delta value={summary.change.occupancy} unit="pts" tx={tx} />} extra={cur && <NightDots occ={cur.occupancy} />}
            />
            <Kpi label={tx.kAdr} value={cur ? money.fmt(cur.adr) : "—"} sub={tx.kAdrSub} help={tx.help.adr} delta={<Delta value={summary.change.adr} tx={tx} />} />
            <Kpi label={tx.kRevpar} value={cur ? money.fmt(cur.revpar) : "—"} sub={tx.kRevparSub} help={tx.help.revpar} delta={<Delta value={summary.change.revpar} tx={tx} />} />
          </div>
        </div>
        <Card className="mt-4 p-5 flex flex-wrap items-center gap-x-8 gap-y-2">
          <p className="text-sm text-[#0F2B4C]/60">{tx.kListings}<InfoTip text={tx.help.listings} /></p>
          <p className="text-2xl font-bold text-[#0F2B4C] tabular-nums">{listings.toLocaleString("en-US")}</p>
          <Delta value={listingsGrowth} tx={tx} />
          <p className="text-xs text-[#0F2B4C]/45 sm:ml-auto">{tx.estimateNote}</p>
        </Card>
      </section>

      {/* ── Esta semana ── */}
      <section className="mt-14">
        <SectionTitle id="week" icon={<CalendarClock size={26} />} title={tx.weekTitle} desc={tx.weekDesc} />
        <WeeklyBlock data={data} tx={tx} l={l} />
      </section>

      {/* ── Rendimiento ── */}
      <section className="mt-14">
        <SectionTitle id="perf" icon={<Trophy size={26} />} title={`${tx.perfTitle} · ${zoneLabel}`} desc={tx.perfDesc} />
        {cur && <PerformanceBlock cur={cur} tx={tx} l={l} />}
      </section>

      {/* ── Mapa + ranking ── */}
      <section className="mt-14">
        <SectionTitle id="map" icon={<MapPin size={26} />} title={tx.mapTitle} desc={tx.mapHint} />
        <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-4">
          <Card className="p-3 sm:p-4 overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-sm text-[#0F2B4C]/60">{tx.metric}:</span>
              <Toggle value={metric} onChange={setMetric} options={(Object.keys(tx.metrics) as MetricKey[]).map((m) => [m, tx.metrics[m]])} />
            </div>
            <Suspense fallback={<div className="h-[420px] sm:h-[520px] rounded-2xl bg-[#E8F1F8] animate-pulse flex items-center justify-center text-sm text-[#0F2B4C]/50">{tx.loadingMap}</div>}>
              <ZoneMap zones={data.zones} values={mapValues} format={mapFormat} selected={zone} onSelect={pickZone} lang={l} />
            </Suspense>
          </Card>
          <Card className="p-4 sm:p-5">
            <h3 className="font-semibold text-[#0F2B4C]">{tx.ranking}</h3>
            <p className="text-xs text-[#0F2B4C]/50 mb-3">{tx.metrics[metric]}</p>
            <ol className="space-y-1.5">
              {[...zoneStats].sort((a, b) => metricValue(b, metric) - metricValue(a, metric)).map((s, i, arr) => {
                const v = metricValue(s, metric);
                const max = metricValue(arr[0], metric) || 1;
                return (
                  <li key={s.zone.slug}>
                    <button
                      onClick={() => pickZone(zone === s.zone.slug ? null : s.zone.slug)}
                      className={`w-full text-left rounded-xl px-3 py-2 transition-colors ${zone === s.zone.slug ? "bg-amber-50 ring-1 ring-[#F0A030]" : "hover:bg-[#F5F7FA]"}`}
                    >
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-[#0F2B4C]"><span className="text-[#0F2B4C]/35 mr-1.5 tabular-nums">{i + 1}</span>{s.zone.name}</span>
                        <span className="font-bold text-[#0F2B4C] tabular-nums">{formatMetric(metric, v, money)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-[#F5F7FA] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#F0A030] to-[#e5952a] transition-all duration-700" style={{ width: `${(v / max) * 100}%` }} />
                      </div>
                      <div className="mt-1 text-[11px] text-[#0F2B4C]/45">
                        {(s.zone.active_listings ?? 0).toLocaleString("en-US")} {tx.listings} · {tx.growth} {s.zone.listings_growth_pct != null ? `+${s.zone.listings_growth_pct}%` : "—"}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>
      </section>

      {/* ── Mes a mes ── */}
      <section className="mt-14">
        <SectionTitle id="trends" icon={<LineIcon size={26} />} title={`${tx.trendsTitle} · ${zoneLabel}`} desc={tx.trendsDesc} />
        <TrendsBlock series={series} revenueChange={summary.change.revenue} tx={tx} l={l} trendKey={trendKey} setTrendKey={setTrendKey} />
      </section>

      {/* ── Temporadas ── */}
      <section className="mt-14">
        <SectionTitle id="season" icon={<CalendarDays size={26} />} title={`${tx.seasonTitle} · ${zoneLabel}`} desc={tx.seasonDesc} />
        <SeasonBlock profile={profile} tx={tx} l={l} />
      </section>

      {/* ── Proyección ── */}
      <section className="mt-14">
        <SectionTitle id="forecast" icon={<BarChart3 size={26} />} title={`${tx.fcTitle} · ${zoneLabel}`} desc={tx.fcDesc} />
        <ForecastBlock forecast={forecast} tx={tx} l={l} />
      </section>

      {/* ── Calculadora ── */}
      <section className="mt-14">
        <SectionTitle id="calc" icon={<Calculator size={26} />} title={tx.calcTitle} desc={tx.calcDesc} />
        <NetCalculator
          key={zone ?? "all"}
          tx={tx}
          l={l}
          defaultAdr={cur?.adr ?? 120}
          defaultOcc={cur?.occupancy ?? 55}
          defaultPrice={selectedZone?.avg_property_price ?? 180000}
          kwhRd={kwhInd?.value ?? FALLBACK_KWH_RD}
          kwhDate={(l === "es" ? kwhInd?.period_label_es : kwhInd?.period_label_en) ?? "oct 2026"}
          usdDop={latestIndicator(data, "usd_dop")?.value ?? FALLBACK_USD_DOP}
        />
      </section>

      {/* ── Mercado ── */}
      <section className="mt-14">
        <SectionTitle id="market" icon={<Building2 size={26} />} title={tx.marketTitle} />
        <MarketNotes data={data} tx={tx} l={l} />
      </section>

      {/* ── CTA ── */}
      <section className="mt-14 mb-20">
        <div className="rounded-3xl bg-[#0F2B4C] p-8 sm:p-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">{tx.ctaTitle}</h2>
          <p className="mt-2 text-white/70">{tx.ctaDesc}</p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/propietarios" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 font-semibold text-[#0F2B4C] bg-[#F0A030] hover:bg-[#e5952a] rounded-xl">
              <Home size={18} /> {tx.ctaOwners}
            </Link>
            <a href={WA_URL} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 font-semibold text-white border border-white/25 hover:bg-white/10 rounded-xl">
              <WhatsAppIcon size={20} /> {tx.ctaWa}
            </a>
          </div>
        </div>
      </section>
    </Shell>
    </MoneyCtx.Provider>
  );
}

// ── Helpers de presentación ─────────────────────────────────────────────────

type ZoneStat = { zone: MarketZone; score: number } & ReturnType<typeof trailingSummary>;

function metricValue(s: ZoneStat, m: MetricKey): number {
  if (m === "score") return s.score;
  return s.current ? s.current[m] : 0;
}

function formatMetric(m: MetricKey, v: number, money: Money) {
  if (m === "score") return String(Math.round(v));
  if (m === "occupancy") return pct(v);
  if (m === "revenue") return money.compact(v);
  return money.fmt(v);
}

function ZonePicker({ tx, zones, allScore, selected, onSelect, pulse, currency, onCurrency, rateLabel, rateShort }: {
  tx: Tx; zones: { slug: string; name: string; score: number }[]; allScore: number;
  selected: string | null; onSelect: (s: string | null) => void; pulse: boolean;
  currency: Currency; onCurrency: (c: Currency) => void; rateLabel: string; rateShort: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const scrollBy = (dx: number) => scroller.current?.scrollBy({ left: dx, behavior: "smooth" });
  const chip = (slug: string | null, name: string, score: number) => {
    const active = selected === slug;
    return (
      <button
        key={slug ?? "all"}
        onClick={() => onSelect(slug)}
        className={`flex-shrink-0 flex items-center gap-2 pl-3 pr-2 py-2 rounded-2xl text-sm font-semibold border-2 transition-all ${
          active
            ? "bg-gradient-to-r from-[#F0A030] to-[#e5952a] text-[#0F2B4C] border-[#F0A030] shadow-lg shadow-[#F0A030]/30"
            : "bg-white text-[#0F2B4C] border-[#0F2B4C]/10 hover:border-[#F0A030] hover:-translate-y-0.5 hover:shadow-md"
        }`}
      >
        <MapPin size={15} className={active ? "text-[#0F2B4C]" : "text-[#F0A030]"} />
        <span className="whitespace-nowrap">{name}</span>
        <span className={`min-w-[2rem] px-1.5 py-0.5 rounded-lg text-xs font-bold tabular-nums ${active ? "bg-[#0F2B4C] text-white" : "bg-[#F5F7FA] text-[#0F2B4C]"}`}>{score}</span>
      </button>
    );
  };
  return (
    <div className="sticky top-16 sm:top-20 z-30 rounded-3xl bg-white/95 backdrop-blur shadow-xl shadow-[#0F2B4C]/10 border border-[#0F2B4C]/10 px-3 sm:px-5 py-3 sm:py-4">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <p className="flex items-center gap-2 whitespace-nowrap text-sm font-bold text-[#0F2B4C]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F0A030]/15 text-[#b8761a]"><MapPin size={15} /></span>
          {tx.pick}
        </p>
        <div className="flex items-center gap-3">
          <p className={`hidden md:flex items-center gap-1.5 text-xs font-semibold text-[#b8761a] ${pulse ? "animate-pulse" : ""}`}>
            <Hand size={14} /> {tx.pickHint}
          </p>
          {/* Moneda de toda la página + tasa del Banco Central que se usa para convertir */}
          <div className="flex items-center gap-2">
            <span className="hidden lg:inline text-[11px] text-[#0F2B4C]/45" title={rateLabel}>{rateLabel}</span>
            <span className="lg:hidden text-[10px] text-[#0F2B4C]/45" title={rateLabel}>{rateShort}</span>
            <span className="hidden sm:inline text-xs font-semibold text-[#0F2B4C]/60">{tx.currency}</span>
            <div className="inline-flex rounded-xl bg-[#F5F7FA] border border-[#0F2B4C]/10 p-0.5 text-sm font-bold" role="group" aria-label={tx.currency}>
              {(["usd", "dop"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => onCurrency(c)}
                  aria-pressed={currency === c}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${currency === c ? "bg-[#F0A030] text-[#0F2B4C] shadow" : "text-[#0F2B4C]/60 hover:text-[#0F2B4C]"}`}
                >
                  {c === "usd" ? "US$" : "RD$"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="relative">
        <button onClick={() => scrollBy(-260)} aria-label="←" className="hidden sm:flex absolute -left-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-[#0F2B4C] text-white shadow-lg hover:bg-[#F0A030] hover:text-[#0F2B4C]">
          <ChevronLeft size={18} />
        </button>
        <div ref={scroller} className="flex gap-2 overflow-x-auto [scrollbar-width:none] sm:px-9 py-1">
          {chip(null, tx.all, allScore)}
          {zones.map((z) => chip(z.slug, z.name, z.score))}
        </div>
        <div className="pointer-events-none absolute right-0 sm:right-7 top-0 bottom-0 w-10 bg-gradient-to-l from-white to-transparent" />
        <button onClick={() => scrollBy(260)} aria-label="→" className="hidden sm:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-[#0F2B4C] text-white shadow-lg hover:bg-[#F0A030] hover:text-[#0F2B4C]">
          <ChevronRight size={18} />
        </button>
      </div>
      <nav className="mt-2.5 flex gap-4 overflow-x-auto [scrollbar-width:none] text-xs sm:text-sm font-medium text-[#0F2B4C]/55 border-t border-[#0F2B4C]/5 pt-2.5">
        {(Object.keys(tx.tabs) as (keyof Tx["tabs"])[]).map((k) => (
          <a key={k} href={`#${k}`} className="whitespace-nowrap hover:text-[#b8761a]">{tx.tabs[k]}</a>
        ))}
      </nav>
    </div>
  );
}

function WeeklyBlock({ data, tx, l }: { data: CanaDnaData; tx: Tx; l: "es" | "en" }) {
  const keys = ["hotel_occ_bavaro", "arrivals_puj", "usd_dop", "kwh_cepm"] as const;
  const latest = data.updates[0];
  const fmtVal = (unit: string, v: number) =>
    unit === "%" ? pct(v, 1) : unit === "turistas" ? (v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v.toLocaleString("en-US")) : `RD$${v.toFixed(2)}`;
  // La tarifa de luz se ve en la moneda elegida, con la otra entre paréntesis
  const money = useMoney();
  const kwhUsd = (rd: number) => `US$${(money.rate > 0 ? rd / money.rate : 0).toFixed(2)}`;
  const kwhMain = (rd: number) => (money.cur === "usd" ? kwhUsd(rd) : `RD$${rd.toFixed(2)}`);
  const kwhOther = (rd: number) => (money.cur === "usd" ? `RD$${rd.toFixed(2)}` : `≈ ${kwhUsd(rd)}`);
  return (
    <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-4">
      <div className="rounded-3xl p-6 bg-gradient-to-br from-[#0F2B4C] to-[#1d4470] text-white shadow-xl">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#F0A030]">
          <RefreshCw size={13} /> {tx.weekly}
        </p>
        {latest && (
          <>
            <p className="mt-2 text-sm text-white/60">{fmtDate(latest.ran_at, l)}</p>
            <p className="mt-3 leading-relaxed text-white/90">{l === "es" ? latest.summary_es : latest.summary_en}</p>
          </>
        )}
        {data.updates.length > 1 && (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-white/60 hover:text-white">{tx.history}</summary>
            <ul className="mt-2 space-y-2">
              {data.updates.slice(1).map((u) => (
                <li key={u.id} className="text-white/70"><span className="font-semibold text-white/90">{fmtDate(u.ran_at, l)}:</span> {l === "es" ? u.summary_es : u.summary_en}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {keys.map((k) => {
          const ind = latestIndicator(data, k);
          if (!ind) return null;
          const Icon = INDICATOR_ICONS[k];
          return (
            <Card key={k} className="p-5">
              <p className="flex items-center gap-2 text-sm font-medium text-[#0F2B4C]/60">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F0A030]/15 text-[#b8761a]"><Icon size={16} /></span>
                {l === "es" ? ind.label_es : ind.label_en}
              </p>
              {k === "kwh_cepm" ? (
                <p className="mt-2 text-3xl font-bold text-[#0F2B4C] tabular-nums">
                  {kwhMain(ind.value)}
                  <span className="text-sm font-medium text-[#0F2B4C]/50"> /kWh ({kwhOther(ind.value)})</span>
                </p>
              ) : (
                <p className="mt-2 text-3xl font-bold text-[#0F2B4C] tabular-nums">{fmtVal(ind.unit, ind.value)}</p>
              )}
              <p className="text-xs text-[#0F2B4C]/50">{l === "es" ? ind.period_label_es : ind.period_label_en}</p>
              {ind.source && (
                <p className="mt-2 text-[11px] text-[#0F2B4C]/45">
                  {tx.source}:{" "}
                  {ind.source_url ? (
                    <a href={ind.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-[#b8761a]">{ind.source} <ExternalLink size={10} /></a>
                  ) : ind.source}
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function PerformanceBlock({ cur, tx, l }: { cur: NonNullable<ReturnType<typeof trailingSummary>["current"]>; tx: Tx; l: "es" | "en" }) {
  const money = useMoney();
  const bySize = BEDROOMS.map((b) => {
    const occ = Math.min(95, cur.occupancy * b.occ);
    return { name: b[l], revenue: Math.round((occ / 100) * cur.adr * b.adr * 365) };
  });
  const topOcc = Math.min(92, cur.occupancy + TOP_PERFORMER.occPts);
  const topAdr = cur.adr * TOP_PERFORMER.adr;
  const topRev = (topOcc / 100) * topAdr * 365;
  const rows: [string, string, string][] = [
    [tx.kOcc, pct(cur.occupancy), pct(topOcc)],
    [tx.kAdr, money.fmt(cur.adr), money.fmt(topAdr)],
    [tx.kRevenue, money.fmt(cur.revenue), money.fmt(topRev)],
  ];
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="p-5 sm:p-6">
        <h3 className="flex items-center gap-2 font-semibold text-[#0F2B4C]"><BedDouble size={18} className="text-[#F0A030]" />{tx.bySize}</h3>
        <div className="h-64 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bySize} layout="vertical" margin={{ left: 0, right: 56 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: NAVY }} width={110} />
              <Tooltip formatter={(v) => money.fmt(Number(v))} cursor={{ fill: "#F5F7FA" }} />
              <Bar dataKey="revenue" name={tx.kRevenue} radius={[0, 8, 8, 0]} animationDuration={900}
                label={{ position: "right", fill: NAVY, fontSize: 12, fontWeight: 700, formatter: (v: unknown) => money.compact(Number(v)) }}>
                {bySize.map((_, i) => <Cell key={i} fill={["#9DB7D8", "#5F86B6", "#3A6A9E", "#1d4470", NAVY][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-5 sm:p-6">
        <h3 className="flex items-center gap-2 font-semibold text-[#0F2B4C]"><Trophy size={18} className="text-[#F0A030]" />{tx.topTitle}</h3>
        <p className="mt-1 text-sm text-[#0F2B4C]/60">{tx.topDesc}</p>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-xs text-[#0F2B4C]/50">
              <th className="text-left font-medium py-1.5" />
              <th className="text-right font-medium py-1.5">{tx.avg}</th>
              <th className="text-right font-semibold py-1.5 text-[#b8761a]">{tx.top}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, a, b]) => (
              <tr key={label} className="border-t border-[#0F2B4C]/5">
                <td className="py-2.5 text-[#0F2B4C]/70">{label}</td>
                <td className="py-2.5 text-right tabular-nums text-[#0F2B4C]">{a}</td>
                <td className="py-2.5 text-right tabular-nums font-bold text-[#0F2B4C]">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-800">
          <span className="text-2xl font-bold tabular-nums">+{money.fmt(topRev - cur.revenue)}</span> <span className="text-sm">{tx.more}</span>
        </div>
      </Card>
    </div>
  );
}

function TrendsBlock({ series, revenueChange, tx, l, trendKey, setTrendKey }: {
  series: MonthPoint[]; revenueChange: number | null; tx: Tx; l: "es" | "en"; trendKey: SeriesKey; setTrendKey: (k: SeriesKey) => void;
}) {
  const money = useMoney();
  const last24 = series.slice(-24).map((p) => ({ ...p, label: `${MONTHS[l][p.month - 1]} ${String(p.year).slice(2)}` }));
  const vals = last24.map((p) => p[trendKey]);
  const avg = vals.reduce((s, v) => s + v, 0) / Math.max(1, vals.length);
  const fmt = (v: number) => (trendKey === "occupancy" ? pct(v) : money.fmt(v));
  const last12 = series.slice(-12);
  const prev12 = series.slice(-24, -12);
  const best = last12.length ? last12.reduce((a, b) => (b.revpar > a.revpar ? b : a)) : null;
  const worst = last12.length ? last12.reduce((a, b) => (b.revpar < a.revpar ? b : a)) : null;
  const colors: Record<SeriesKey, string> = { occupancy: AMBER, adr: "#3A6A9E", revenue: NAVY };
  const c = colors[trendKey];
  const yoy = last12.map((p, i) => ({ label: MONTHS[l][p.month - 1], cur: Math.round(p.revenue), prev: prev12[i] ? Math.round(prev12[i].revenue) : null }));

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Toggle value={trendKey} onChange={setTrendKey} options={(Object.keys(tx.series) as SeriesKey[]).map((k) => [k, tx.series[k]])} />
          <p className="text-sm text-[#0F2B4C]/60">{tx.seriesHelp[trendKey]}</p>
        </div>
        <div className="h-80 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={last24} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`trendFill-${trendKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={c} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={NAVY} strokeOpacity={0.08} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: NAVY }} interval={2} />
              <YAxis tick={{ fontSize: 11, fill: NAVY }} tickFormatter={(v) => (trendKey === "occupancy" ? `${v}%` : money.compact(v))} width={52} domain={trendKey === "occupancy" ? [0, 100] : ["auto", "auto"]} />
              <Tooltip formatter={(v) => fmt(Number(v))} labelStyle={{ color: NAVY, fontWeight: 700 }} />
              <ReferenceLine y={avg} stroke={NAVY} strokeDasharray="6 4" strokeOpacity={0.5} label={{ value: `${tx.average} ${fmt(avg)}`, position: "insideTopLeft", fill: NAVY, fontSize: 11 }} />
              <Area key={trendKey} type="monotone" dataKey={trendKey} name={tx.series[trendKey]} stroke={c} strokeWidth={3} fill={`url(#trendFill-${trendKey})`} animationDuration={900} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {best && worst && (
          <div className="mt-4 grid sm:grid-cols-3 gap-3 text-sm">
            <p className="rounded-2xl bg-emerald-50 text-emerald-900 px-4 py-3">📈 {tx.insightBest(capitalize(MONTHS_LONG[l][best.month - 1]), tenths(best.occupancy), money.fmt(best.adr))}</p>
            <p className="rounded-2xl bg-rose-50 text-rose-900 px-4 py-3">📉 {tx.insightWorst(capitalize(MONTHS_LONG[l][worst.month - 1]), tenths(worst.occupancy))}</p>
            {revenueChange != null && (
              <p className="rounded-2xl bg-[#F5F7FA] text-[#0F2B4C] px-4 py-3">{revenueChange >= 0 ? "🟢" : "🟠"} {tx.insightYoy(revenueChange >= 0, pct(Math.abs(revenueChange), 1))}</p>
            )}
          </div>
        )}
      </Card>
      <Card className="p-4 sm:p-6">
        <h3 className="font-semibold text-[#0F2B4C]">{tx.yoyTitle}</h3>
        <p className="text-xs text-[#0F2B4C]/50">{tx.yoyDesc}</p>
        <div className="h-64 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={yoy}>
              <CartesianGrid strokeDasharray="3 3" stroke={NAVY} strokeOpacity={0.08} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: NAVY }} />
              <YAxis tick={{ fontSize: 11, fill: NAVY }} tickFormatter={(v) => money.compact(v)} width={52} />
              <Tooltip formatter={(v) => money.fmt(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="prev" name={tx.lastYear} fill={SKY} fillOpacity={0.5} radius={[6, 6, 0, 0]} />
              <Line dataKey="cur" name={tx.thisYear} stroke={AMBER} strokeWidth={3} dot={{ r: 4, fill: AMBER }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function SeasonBlock({ profile, tx, l }: { profile: ReturnType<typeof seasonalProfile>; tx: Tx; l: "es" | "en" }) {
  const money = useMoney();
  // Todo se compara por lo que gana la propiedad en el mes (la cifra grande de cada cuadro)
  const vals = profile.map(monthRevenue);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  const best = profile.reduce((a, b) => (monthRevenue(b) > monthRevenue(a) ? b : a));
  const worst = profile.reduce((a, b) => (monthRevenue(b) < monthRevenue(a) ? b : a));
  const shade = (v: number) => (max === min ? 0.5 : (v - min) / (max - min));
  const advice = (v: number): keyof Tx["advice"] => (v > mean * 1.12 ? "up" : v < mean * 0.88 ? "down" : "normal");
  const adviceStyle = { up: "bg-emerald-100 text-emerald-800", normal: "bg-white/80 text-[#0F2B4C]", down: "bg-rose-100 text-rose-800" };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-sm text-[#0F2B4C]/60">{tx.best}</p>
          <p className="mt-1 text-2xl font-bold text-[#0F2B4C] capitalize">{MONTHS_LONG[l][best.month - 1]}</p>
          <p className="text-xs text-[#0F2B4C]/50">≈ {money.fmt(monthRevenue(best))} {tx.perMonthLabel} · {money.fmt(best.adr)}{tx.perNightShort}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-[#0F2B4C]/60">{tx.worst}</p>
          <p className="mt-1 text-2xl font-bold text-[#0F2B4C] capitalize">{MONTHS_LONG[l][worst.month - 1]}</p>
          <p className="text-xs text-[#0F2B4C]/50">≈ {money.fmt(monthRevenue(worst))} {tx.perMonthLabel} · {money.fmt(worst.adr)}{tx.perNightShort}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-[#0F2B4C]/60">{tx.seasonScore}</p>
          <p className="mt-1 text-2xl font-bold text-[#0F2B4C]">{seasonalityScore(profile)}<span className="text-base text-[#0F2B4C]/40">/100</span></p>
          <p className="text-xs text-[#0F2B4C]/50">{tx.seasonScoreHint}</p>
        </Card>
      </div>
      <Card className="p-3 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
          {profile.map((p) => {
            const s = shade(monthRevenue(p));
            const info = SEASON_INFO[p.month - 1];
            const a = advice(monthRevenue(p));
            return (
              <div
                key={p.month}
                className="rounded-2xl p-3 flex flex-col transition-transform hover:-translate-y-0.5"
                style={{ background: `rgba(15, 43, 76, ${0.07 + s * 0.88})`, color: s > 0.45 ? "#fff" : NAVY }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider">{MONTHS[l][p.month - 1]}</p>
                  <span className="text-sm" title={`${info.temp}°C`}>{info.icon} <span className="text-[11px] opacity-75">{info.temp}°</span></span>
                </div>
                <p className="mt-1 text-xl font-bold tabular-nums">{money.fmt(monthRevenue(p))}<span className="text-[11px] font-medium opacity-75"> {tx.perMonthLabel}</span></p>
                <p className="text-[11px] opacity-80">{money.fmt(p.adr)}{tx.perNightShort} · {tenths(p.occupancy)}/10 {tx.nights}</p>
                <p className="mt-2 text-[11px] leading-snug opacity-90 min-h-[2.5em]">{info[l]}</p>
                <span className={`mt-2 self-start px-2 py-0.5 rounded-full text-[10px] font-bold ${adviceStyle[a]}`}>{tx.advice[a]}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-4 flex gap-2 rounded-2xl bg-[#F5F7FA] px-4 py-3 text-sm text-[#0F2B4C]/75">
          <Info size={16} className="flex-shrink-0 mt-0.5 text-[#b8761a]" />
          {tx.seasonHow}
        </p>
      </Card>
    </div>
  );
}

/** Ingreso de una propiedad típica en un mes del calendario (RevPAR × días del mes). */
const monthRevenue = (p: { month: number; revpar: number }) => p.revpar * new Date(2026, p.month, 0).getDate();

function ForecastBlock({ forecast, tx, l }: { forecast: ReturnType<typeof projectNext12>; tx: Tx; l: "es" | "en" }) {
  const money = useMoney();
  if (!forecast.length) return null;
  let acc = 0;
  const rows = forecast.map((p) => {
    acc += p.base;
    return {
      label: `${MONTHS[l][p.month - 1]} ${String(p.year).slice(2)}`,
      range: [Math.round(p.conservative), Math.round(p.optimistic)],
      base: Math.round(p.base),
      cumulative: Math.round(acc),
      nights: Math.round((p.occupancy / 100) * 30),
    };
  });
  const total = (k: "conservative" | "base" | "optimistic") => forecast.reduce((s, p) => s + p[k], 0);
  const best = rows.reduce((a, b) => (b.base > a.base ? b : a));
  const worst = rows.reduce((a, b) => (b.base < a.base ? b : a));
  const maxBase = Math.max(...rows.map((r) => r.base));
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        {(["conservative", "base", "optimistic"] as const).map((k) => (
          <div key={k} className={`rounded-3xl p-5 ${k === "base" ? "bg-gradient-to-br from-[#0F2B4C] to-[#1d4470] text-white shadow-xl" : "bg-white border border-[#0F2B4C]/10 text-[#0F2B4C]"}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider ${k === "base" ? "text-[#F0A030]" : "text-[#0F2B4C]/50"}`}>{tx[k]}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{money.fmt(total(k))}</p>
            <p className={`text-xs ${k === "base" ? "text-white/60" : "text-[#0F2B4C]/50"}`}>{tx.fcTotal} · {money.fmt(total(k) / 12)}{tx.perMonth}</p>
          </div>
        ))}
      </div>
      <Card className="p-4 sm:p-6">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fcBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={AMBER} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={AMBER} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={NAVY} strokeOpacity={0.08} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: NAVY }} />
              <YAxis yAxisId="m" tick={{ fontSize: 11, fill: NAVY }} tickFormatter={(v) => money.compact(v)} width={52} />
              <YAxis yAxisId="c" orientation="right" tick={{ fontSize: 11, fill: SKY }} tickFormatter={(v) => money.compact(v)} width={52} />
              <Tooltip
                formatter={(v) => (Array.isArray(v) ? `${money.fmt(Number(v[0]))} – ${money.fmt(Number(v[1]))}` : money.fmt(Number(v)))}
                labelStyle={{ color: NAVY, fontWeight: 700 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area yAxisId="m" type="monotone" dataKey="range" name={tx.range} stroke="none" fill="url(#fcBand)" animationDuration={900} />
              <Line yAxisId="m" type="monotone" dataKey="base" name={tx.base} stroke={NAVY} strokeWidth={3} dot={{ r: 4, fill: NAVY }} activeDot={{ r: 7, fill: AMBER }} animationDuration={1100} />
              <Line yAxisId="c" type="monotone" dataKey="cumulative" name={tx.cumulative} stroke={SKY} strokeWidth={2} strokeDasharray="6 4" dot={false} animationDuration={1300} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid sm:grid-cols-3 gap-3 text-sm">
          <p className="rounded-2xl bg-[#F5F7FA] px-4 py-3 text-[#0F2B4C]"><span className="text-[#0F2B4C]/55">{tx.fcAvg}</span><br /><span className="text-lg font-bold">{money.fmt(total("base") / 12)}</span></p>
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-900"><span className="opacity-70">{tx.fcBest}</span><br /><span className="text-lg font-bold">{best.label} · {money.fmt(best.base)}</span></p>
          <p className="rounded-2xl bg-rose-50 px-4 py-3 text-rose-900"><span className="opacity-70">{tx.fcWorst}</span><br /><span className="text-lg font-bold">{worst.label} · {money.fmt(worst.base)}</span></p>
        </div>
      </Card>
      <Card className="p-4 sm:p-6">
        <h3 className="font-semibold text-[#0F2B4C]">{tx.fcMonthsTitle}</h3>
        <p className="text-xs text-[#0F2B4C]/55">{tx.fcMonthsDesc}</p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {rows.map((r) => (
            <div key={r.label} className="rounded-2xl bg-[#F5F7FA] p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#0F2B4C]/60">{r.label}</p>
              <p className="mt-1 text-lg font-bold text-[#0F2B4C] tabular-nums">{money.fmt(r.base)}</p>
              <p className="text-[11px] text-[#0F2B4C]/50">≈ {r.nights} {tx.nights} {l === "es" ? "reservadas" : "booked"}</p>
              <div className="mt-2 h-1.5 rounded-full bg-white overflow-hidden">
                <div className="h-full rounded-full bg-[#F0A030]" style={{ width: `${(r.base / maxBase) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function NetCalculator({ tx, l, defaultAdr, defaultOcc, defaultPrice, kwhRd, kwhDate, usdDop }: {
  tx: Tx; l: "es" | "en"; defaultAdr: number; defaultOcc: number; defaultPrice: number; kwhRd: number; kwhDate: string; usdDop: number;
}) {
  const money = useMoney();
  const [bed, setBed] = useState<string>("1");
  const [occupancy, setOccupancy] = useState(Math.round(defaultOcc));
  const [adr, setAdr] = useState(Math.round(defaultAdr));
  const [price, setPrice] = useState(defaultPrice);
  const [management, setManagement] = useState(30);
  const [hoa, setHoa] = useState<number>(BEDROOMS[1].hoa);
  const [kwh, setKwh] = useState<number>(BEDROOMS[1].kwh);
  const [kwhPriceRd, setKwhPriceRd] = useState(kwhRd);
  const [rate, setRate] = useState(Math.round(usdDop * 100) / 100);
  const itbis = 18;
  const kwhPriceUsd = rate > 0 ? kwhPriceRd / rate : 0;
  const r = netIncome({ adr, occupancy, price, itbis, management, hoaMonthly: hoa, kwhMonthly: kwh, kwhPriceUsd });
  // El precio se guarda en US$ y se mueve en la moneda elegida arriba (en RD$ hasta 30 millones)
  const priceCur = money.cur;
  const priceShown = priceCur === "usd" ? price : price * money.rate;
  const setPriceShown = (n: number) => setPrice(priceCur === "usd" ? n : money.rate > 0 ? n / money.rate : n);
  const priceRange = priceCur === "usd" ? { min: 50000, max: 1500000, step: 5000 } : { min: 3000000, max: 30000000, step: 100000 };

  function pickBed(id: string) {
    const b = BEDROOMS.find((x) => x.id === id);
    if (!b) return;
    setBed(id);
    setAdr(Math.round(defaultAdr * b.adr));
    setOccupancy(Math.round(Math.min(95, defaultOcc * b.occ)));
    setHoa(b.hoa);
    setKwh(b.kwh);
  }
  function useZone() {
    pickBed(bed);
    setPrice(defaultPrice);
    setKwhPriceRd(kwhRd);
    setRate(Math.round(usdDop * 100) / 100);
  }

  const slider = (label: string, value: number, set: (n: number) => void, min: number, max: number, stepN: number, show: (n: number) => string, hint?: string) => (
    <label className="block">
      <div className="flex justify-between gap-2 text-sm">
        <span className="text-[#0F2B4C]/70">{label}{hint && <span className="text-[#0F2B4C]/40"> · {hint}</span>}</span>
        <span className="font-semibold text-[#0F2B4C] tabular-nums text-right">{show(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={stepN} value={value} onChange={(e) => set(Number(e.target.value))} className="mt-1.5 w-full accent-[#F0A030]" />
    </label>
  );

  const costs: [string, number, string][] = [
    [`${tx.itbis} (${itbis}%)`, r.itbisAmt, "#e11d48"],
    [`${tx.mgmt} (${management}%)`, r.mgmtAmt, "#a855f7"],
    [tx.hoa, r.hoaAmt, "#0ea5e9"],
    [tx.power, r.powerAmt, "#eab308"],
  ];
  const netShare = r.gross > 0 ? Math.max(0, r.net / r.gross) : 0;

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="p-6 space-y-5">
        <div>
          <p className="text-sm text-[#0F2B4C]/70 mb-2">{tx.bedrooms}</p>
          <div className="flex flex-wrap gap-2">
            {BEDROOMS.map((b) => (
              <button
                key={b.id}
                onClick={() => pickBed(b.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${bed === b.id ? "bg-[#0F2B4C] text-white" : "bg-[#F5F7FA] text-[#0F2B4C]/70 hover:bg-[#0F2B4C]/10"}`}
              >
                {b[l]}
              </button>
            ))}
          </div>
        </div>
        {slider(tx.adr, adr, setAdr, 40, 1200, 5, (n) => money.fmt(n))}
        {slider(tx.occ, occupancy, setOccupancy, 10, 95, 1, (n) => `${pct(n)} · ${Math.round(3.65 * n)} ${tx.nights}`)}
        <div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-[#0F2B4C]/70">{tx.price}</span>
            <b className="text-[#0F2B4C] tabular-nums">{money.fmt(price)}</b>
          </div>
          <input
            type="range" min={priceRange.min} max={priceRange.max} step={priceRange.step}
            value={Math.min(priceRange.max, Math.max(priceRange.min, priceShown))}
            onChange={(e) => setPriceShown(Number(e.target.value))}
            className="mt-1.5 w-full accent-[#F0A030]"
          />
          <div className="mt-1 flex items-center justify-between gap-3">
            <input
              type="number" min={0} step={priceCur === "usd" ? 1000 : 50000} value={Math.round(priceShown)}
              onChange={(e) => setPriceShown(Number(e.target.value))}
              className="w-40 rounded-lg border border-[#0F2B4C]/15 bg-white px-3 py-1.5 text-sm font-semibold text-[#0F2B4C] tabular-nums"
            />
            <span className="text-xs text-[#0F2B4C]/50 tabular-nums">≈ {priceCur === "usd" ? formatDop(price * money.rate) : formatUsd(price)}</span>
          </div>
        </div>
        {slider(tx.mgmt, management, setManagement, 0, 50, 1, (n) => pct(n), tx.mgmtHint)}
        {slider(tx.hoa, hoa, setHoa, 0, 1500, 10, (n) => `${money.fmt(n)}${tx.perMonthShort}`, tx.hoaHint)}

        <div className="rounded-2xl bg-amber-50 border border-[#F0A030]/25 p-4 space-y-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#0F2B4C]"><Zap size={16} className="text-[#F0A030]" />{tx.power}: {money.fmt(kwh * kwhPriceUsd)}{tx.perMonthShort}</p>
          {slider(tx.kwh, kwh, setKwh, 100, 3000, 25, (n) => `${n} kWh${tx.perMonthShort}`)}
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-[#0F2B4C]/70">{tx.kwhPrice} (RD$/kWh)</span>
              <input type="number" step="0.01" min={0} value={kwhPriceRd} onChange={(e) => setKwhPriceRd(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-[#0F2B4C]/15 bg-white px-3 py-1.5 tabular-nums" />
            </label>
            <label className="block text-sm">
              <span className="text-[#0F2B4C]/70">{tx.rate} (RD$/US$)</span>
              <input type="number" step="0.01" min={1} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-[#0F2B4C]/15 bg-white px-3 py-1.5 tabular-nums" />
            </label>
          </div>
          <p className="text-[11px] text-[#0F2B4C]/55">{tx.powerSource(`RD$${kwhRd.toFixed(2)}`, kwhDate)} ≈ US${kwhPriceUsd.toFixed(3)}/kWh.</p>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-[#0F2B4C]/70">{tx.itbis}</span>
          <span className="font-semibold text-[#0F2B4C]">{itbis}%</span>
        </div>
        <button onClick={useZone} className="text-sm font-semibold text-[#b8761a] hover:text-[#0F2B4C]">↺ {tx.useZone}</button>
      </Card>
      <Card className="p-6 flex flex-col">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#F5F7FA] p-4">
            <p className="text-xs text-[#0F2B4C]/55">{tx.gross}</p>
            <p className="text-2xl font-bold text-[#0F2B4C] tabular-nums">{money.fmt(r.gross)}</p>
            <p className="text-xs text-[#0F2B4C]/45">{r.nights} {tx.nightsSold}</p>
          </div>
          <div className={`rounded-2xl p-4 ${r.net >= 0 ? "bg-[#0F2B4C]" : "bg-rose-700"}`}>
            <p className="text-xs text-white/60">{tx.net}</p>
            <p className="text-2xl font-bold text-[#F0A030] tabular-nums">{money.fmt(r.net)}</p>
            <p className="text-xs text-white/50">{money.fmt(r.net / 12)}{tx.perMonth}</p>
          </div>
          <div className="rounded-2xl bg-[#F5F7FA] p-4">
            <p className="text-xs text-[#0F2B4C]/55">{tx.roi}</p>
            <p className="text-2xl font-bold text-[#0F2B4C] tabular-nums">{pct(r.roiNet, 1)}</p>
            <p className="text-xs text-[#0F2B4C]/45">{tx.grossShort} {pct(r.roiGross, 1)}</p>
          </div>
          <div className="rounded-2xl bg-[#F5F7FA] p-4">
            <p className="text-xs text-[#0F2B4C]/55">{tx.payback}</p>
            <p className="text-2xl font-bold text-[#0F2B4C] tabular-nums">{r.payback ? r.payback.toFixed(1) : "—"}</p>
            <p className="text-xs text-[#0F2B4C]/45">{tx.years}</p>
          </div>
        </div>

        {/* De cada dólar bruto, a dónde va */}
        <div className="mt-5 flex h-4 rounded-full overflow-hidden bg-[#F5F7FA]">
          {costs.map(([label, v, color]) => (
            <div key={label} title={`${label}: ${money.fmt(v)}`} style={{ width: `${r.gross > 0 ? (v / r.gross) * 100 : 0}%`, background: color }} className="transition-all duration-500" />
          ))}
          <div title={`${tx.net}: ${money.fmt(r.net)}`} style={{ width: `${netShare * 100}%` }} className="bg-emerald-500 transition-all duration-500" />
        </div>

        <ul className="mt-4 space-y-2 text-sm">
          <li className="flex justify-between">
            <span className="text-[#0F2B4C]/65">{tx.gross}</span>
            <span className="tabular-nums font-semibold text-[#0F2B4C]">{money.fmt(r.gross)}</span>
          </li>
          {costs.map(([label, v, color]) => (
            <li key={label} className="flex justify-between items-center gap-2">
              <span className="flex items-center gap-2 text-[#0F2B4C]/65"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />− {label}</span>
              <span className="tabular-nums text-rose-700">{money.fmt(v)}</span>
            </li>
          ))}
          <li className="flex justify-between border-t border-[#0F2B4C]/10 pt-2 font-semibold text-[#0F2B4C]">
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />= {tx.net}</span>
            <span className="tabular-nums">{money.fmt(r.net)}</span>
          </li>
        </ul>
        <p className="mt-auto pt-5 text-xs text-[#0F2B4C]/50">{tx.calcNote}</p>
      </Card>
    </div>
  );
}

function MarketNotes({ data, tx, l }: { data: CanaDnaData; tx: Tx; l: "es" | "en" }) {
  const group = (k: string) => data.notes.filter((n) => n.kind === k);
  const cols: [string, string, ReactNode, string][] = [
    ["stat", tx.stats, <Landmark key="s" size={18} />, "text-[#0F2B4C]"],
    ["alert", tx.alerts, <AlertTriangle key="a" size={18} />, "text-rose-700"],
    ["opportunity", tx.opps, <Lightbulb key="o" size={18} />, "text-emerald-700"],
  ];
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {cols.map(([kind, title, icon, color]) => (
        <Card key={kind} className="p-5">
          <h3 className={`flex items-center gap-2 font-semibold ${color}`}>{icon}{title}</h3>
          <ul className="mt-3 space-y-4">
            {group(kind).map((n) => (
              <li key={n.id}>
                {n.value && <p className={`text-2xl font-bold tabular-nums ${color}`}>{n.value}</p>}
                <p className="font-semibold text-[#0F2B4C]">{l === "es" ? n.title_es : n.title_en}</p>
                {(l === "es" ? n.body_es : n.body_en) && <p className="text-sm text-[#0F2B4C]/65">{l === "es" ? n.body_es : n.body_en}</p>}
                {n.source && (
                  <p className="mt-1 text-[11px] text-[#0F2B4C]/45">
                    {tx.source}:{" "}
                    {n.source_url ? (
                      <a href={n.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-[#b8761a]">
                        {n.source} <ExternalLink size={10} />
                      </a>
                    ) : n.source}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

function Shell({ tx, l, lastRun, children }: { tx: Tx; l: "es" | "en"; lastRun?: string | null; children: ReactNode }) {
  // Próxima actualización: el próximo domingo a las 8 pm (hora RD), cuando corre la rutina semanal
  const next = lastRun ? nextWeeklyRun().toISOString() : null;
  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <LandingNavbar />
      <section className="bg-[#0F2B4C] pt-32 pb-24 sm:pt-40 sm:pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#F0A030]/40 text-[#F0A030] text-xs font-semibold uppercase tracking-[0.18em]">
            <Dna size={14} />
            {tx.badge}
          </span>
          <h1 className="mt-6 text-4xl sm:text-5xl font-serif font-bold text-white">{tx.title}</h1>
          <p className="mt-5 text-lg text-white/70 leading-relaxed max-w-2xl mx-auto">{tx.desc}</p>
          <div className="mt-7 inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl bg-white/5 border border-white/10 px-5 py-3 text-sm text-white/80">
            <span className="inline-flex items-center gap-2 font-semibold text-[#F0A030]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#F0A030] opacity-75 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#F0A030]" />
              </span>
              {tx.weekly}
            </span>
            {lastRun && next && (
              <>
                <span>{tx.lastUpdate}: <b className="text-white">{fmtDate(lastRun, l)}</b></span>
                <span>{tx.nextUpdate}: <b className="text-white">{fmtDate(next, l)}</b></span>
              </>
            )}
          </div>
        </div>
      </section>
      <div className="-mt-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
      <LandingFooter />
    </div>
  );
}

export function CanaDnaPage() {
  useSeo({
    title: "Cana DNA — Datos del mercado de renta corta en Punta Cana y Bávaro",
    description:
      "Ocupación, precio por noche, ingresos, temporadas y proyecciones de alquiler vacacional por zona en Bávaro, Punta Cana, Cap Cana, Cana Bay y Bayahibe. Actualizado cada semana.",
    path: "/cana-dna",
  });

  return (
    <LangProvider>
      <CanaDnaContent />
    </LangProvider>
  );
}
