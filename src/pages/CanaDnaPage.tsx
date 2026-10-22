import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer, ComposedChart, LineChart, AreaChart, Area, Line, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";
import {
  Dna, TrendingUp, TrendingDown, Minus, MapPin, CalendarDays, LineChart as LineIcon, Calculator,
  AlertTriangle, Lightbulb, BarChart3, RefreshCw, Info, ExternalLink, Home, Building2, Radio,
} from "lucide-react";
import { LangProvider, useLang } from "@/lib/LangContext";
import { useSeo } from "@/lib/useSeo";
import { LandingNavbar } from "@/components/cana/LandingNavbar";
import { LandingFooter } from "@/components/cana/LandingFooter";
import { WhatsAppIcon } from "@/components/cana/WhatsAppIcon";
import { ZoneMap } from "@/components/canadna/ZoneMap";
import {
  fetchCanaDna, monthlySeries, trailingSummary, seasonalProfile, seasonalityScore, projectNext12,
  canaScore, netIncome, fmtUsd, fmtCompactUsd, MONTHS, MONTHS_LONG, BEDROOMS, SCORE_WEIGHTS,
  type CanaDnaData, type MarketZone, type MonthPoint,
} from "@/lib/canaDna";

const WA_URL = "https://wa.me/18092102773";
const NAVY = "#0F2B4C";
const AMBER = "#F0A030";
const SKY = "#7FA0C8";

// Textos propios de la página (ES/EN)
const TX = {
  es: {
    badge: "Cana DNA · Inteligencia de mercado",
    title: "El ADN de la renta corta en Punta Cana",
    desc: "Ocupación, tarifas, ingresos, estacionalidad y proyecciones de cada zona de Bávaro y Punta Cana. Gratis y sin registro.",
    all: "Todo el mercado",
    estimate: "Datos estimados de referencia",
    real: "Datos verificados",
    updated: "Actualizado",
    tabs: { overview: "Resumen", map: "Zonas", trends: "Ocupación y tarifas", season: "Estacionalidad", forecast: "Proyección", calc: "Calculadora", market: "Mercado" },
    score: "Cana Score",
    scoreQ: "¿Cómo está rindiendo esta zona?",
    comps: { score_demand: "Demanda", score_investability: "Inversión", score_growth: "Crecimiento", score_seasonality: "Estabilidad todo el año", score_regulation: "Regulación" },
    kRevenue: "Ingreso anual", kRevenueSub: "propiedad típica",
    kOcc: "Ocupación", kAdr: "Tarifa media (ADR)", kAdrSub: "por noche", kRevpar: "RevPAR", kRevparSub: "ingreso por noche disponible",
    kListings: "Propiedades activas", vsLast: "vs. año anterior", pts: "pts",
    mapTitle: "Mapa de rendimiento por zona", mapHint: "Toca una zona para filtrar toda la página.",
    metric: "Ver en el mapa",
    metrics: { score: "Cana Score", occupancy: "Ocupación", adr: "Tarifa (ADR)", revpar: "RevPAR", revenue: "Ingreso anual" },
    ranking: "Ranking de zonas", zone: "Zona", listings: "Propiedades", growth: "Oferta",
    trendsTitle: "Ocupación y tarifa mes a mes", trendsDesc: "Últimos 24 meses. Las barras son la tarifa media por noche y la línea es la ocupación.",
    yoyTitle: "Este año vs. año anterior", yoyDesc: "Ingreso mensual de una propiedad típica, por mes del calendario.",
    thisYear: "Últimos 12 meses", lastYear: "12 meses anteriores",
    seasonTitle: "Calendario de temporadas", seasonDesc: "RevPAR promedio por mes: el color más oscuro es el mes en que más se gana.",
    best: "Mejor mes", worst: "Mes más flojo", seasonScore: "Estabilidad", seasonScoreHint: "100 = ingreso parejo todo el año",
    events: [
      ["Dic – Abr", "Temporada alta: invierno en EE. UU., Canadá y Europa, Navidad y Semana Santa."],
      ["Jul – Ago", "Vacaciones de verano y turismo local: buena ocupación, tarifas medias."],
      ["Sep – Oct", "Temporada baja y pico de huracanes: momento para mantenimiento y promociones."],
    ],
    fcTitle: "Proyección de ingresos — próximos 12 meses", fcDesc: "Mismo mes del último año ajustado por la tendencia anual de la zona.",
    conservative: "Conservador", base: "Base", optimistic: "Optimista", fcTotal: "Total proyectado 12 meses",
    calcTitle: "Calculadora de ingreso neto RD", calcDesc: "Calcula lo que te queda después de ITBIS, comisiones y gastos, con los datos de la zona.",
    bedrooms: "Tamaño", occ: "Ocupación", adr: "Tarifa por noche", price: "Precio de compra", commission: "Comisión plataformas", opex: "Gastos operativos", itbis: "ITBIS",
    gross: "Ingreso bruto anual", net: "Ingreso neto anual", roi: "Retorno neto", payback: "Recuperas la inversión en", years: "años", nights: "noches vendidas",
    useZone: "Usar datos de la zona",
    calcNote: "El neto no incluye ISR ni hipoteca. Gestión, limpieza y mantenimiento van dentro de gastos operativos.",
    marketTitle: "Lo que mueve el mercado", stats: "Turismo en cifras", alerts: "Alertas", opps: "Oportunidades", source: "Fuente",
    liveTitle: "¿Y los datos en tiempo real?",
    liveBody: "Airbnb, Booking.com y Expedia no publican datos de mercado abiertos: sus API son solo para socios aprobados y para tus propias propiedades, y copiar sus páginas va contra sus condiciones. Cana DNA se actualiza mes a mes con datos públicos (Banco Central, MITUR), con el rendimiento real de las propiedades que gestionamos y, cuando se active, con un proveedor de datos con licencia.",
    methodTitle: "Metodología",
    method: [
      "Cana Score = 30 % demanda + 25 % inversión + 15 % crecimiento + 15 % estabilidad + 15 % regulación.",
      "Ocupación y tarifa por zona y mes. 'Todo el mercado' pondera cada zona por su número de propiedades.",
      "RevPAR = ocupación × tarifa. Ingreso anual = suma de 12 meses de RevPAR × días del mes.",
      "Las cifras marcadas como estimadas son referencias de Cana Escapes y se reemplazan por datos verificados a medida que llegan.",
    ],
    ctaTitle: "¿Tienes una propiedad en esta zona?", ctaDesc: "Te decimos cuánto puede generar y la gestionamos por ti.",
    ctaOwners: "Soy propietario", ctaWa: "Escríbenos por WhatsApp",
    loadError: "No pudimos cargar los datos del mercado.", retry: "Reintentar",
    perMonth: "/mes",
  },
  en: {
    badge: "Cana DNA · Market intelligence",
    title: "The DNA of short-term rentals in Punta Cana",
    desc: "Occupancy, rates, revenue, seasonality and forecasts for every area of Bávaro and Punta Cana. Free, no sign-up.",
    all: "Whole market",
    estimate: "Estimated reference data",
    real: "Verified data",
    updated: "Updated",
    tabs: { overview: "Overview", map: "Areas", trends: "Occupancy & rates", season: "Seasonality", forecast: "Forecast", calc: "Calculator", market: "Market" },
    score: "Cana Score",
    scoreQ: "How is this area performing?",
    comps: { score_demand: "Demand", score_investability: "Investability", score_growth: "Growth", score_seasonality: "Year-round stability", score_regulation: "Regulation" },
    kRevenue: "Annual revenue", kRevenueSub: "typical listing",
    kOcc: "Occupancy", kAdr: "Average daily rate", kAdrSub: "per night", kRevpar: "RevPAR", kRevparSub: "revenue per available night",
    kListings: "Active listings", vsLast: "vs. last year", pts: "pts",
    mapTitle: "Performance map by area", mapHint: "Tap an area to filter the whole page.",
    metric: "Show on map",
    metrics: { score: "Cana Score", occupancy: "Occupancy", adr: "Rate (ADR)", revpar: "RevPAR", revenue: "Annual revenue" },
    ranking: "Area ranking", zone: "Area", listings: "Listings", growth: "Supply",
    trendsTitle: "Occupancy and rate by month", trendsDesc: "Last 24 months. Bars are the average nightly rate; the line is occupancy.",
    yoyTitle: "This year vs. last year", yoyDesc: "Monthly revenue of a typical listing, by calendar month.",
    thisYear: "Last 12 months", lastYear: "Previous 12 months",
    seasonTitle: "Season calendar", seasonDesc: "Average RevPAR by month: the darker the colour, the more you earn.",
    best: "Best month", worst: "Weakest month", seasonScore: "Stability", seasonScoreHint: "100 = even income all year",
    events: [
      ["Dec – Apr", "High season: US, Canada and Europe winter, Christmas and Easter."],
      ["Jul – Aug", "Summer holidays and local tourism: good occupancy, mid rates."],
      ["Sep – Oct", "Low season and hurricane peak: time for maintenance and promotions."],
    ],
    fcTitle: "Revenue forecast — next 12 months", fcDesc: "Same month last year adjusted by the area's annual trend.",
    conservative: "Conservative", base: "Base", optimistic: "Optimistic", fcTotal: "12-month projected total",
    calcTitle: "DR net income calculator", calcDesc: "See what you keep after ITBIS, platform fees and expenses, using the area's data.",
    bedrooms: "Size", occ: "Occupancy", adr: "Nightly rate", price: "Purchase price", commission: "Platform fees", opex: "Operating costs", itbis: "ITBIS (VAT)",
    gross: "Annual gross revenue", net: "Annual net income", roi: "Net return", payback: "Payback in", years: "years", nights: "nights sold",
    useZone: "Use area data",
    calcNote: "Net excludes income tax (ISR) and mortgage. Management, cleaning and maintenance are inside operating costs.",
    marketTitle: "What moves the market", stats: "Tourism in numbers", alerts: "Alerts", opps: "Opportunities", source: "Source",
    liveTitle: "What about real-time data?",
    liveBody: "Airbnb, Booking.com and Expedia don't publish open market data: their APIs are only for approved partners and for your own listings, and copying their pages breaks their terms. Cana DNA is updated monthly with public data (Central Bank, MITUR), with the real performance of the properties we manage and, once enabled, with a licensed data provider.",
    methodTitle: "Methodology",
    method: [
      "Cana Score = 30% demand + 25% investability + 15% growth + 15% stability + 15% regulation.",
      "Occupancy and rate by area and month. 'Whole market' weights each area by its number of listings.",
      "RevPAR = occupancy × rate. Annual revenue = sum of 12 months of RevPAR × days in month.",
      "Figures marked as estimates are Cana Escapes references and are replaced with verified data as it comes in.",
    ],
    ctaTitle: "Own a property in this area?", ctaDesc: "We'll tell you what it can earn and manage it for you.",
    ctaOwners: "I'm an owner", ctaWa: "Message us on WhatsApp",
    loadError: "We couldn't load the market data.", retry: "Retry",
    perMonth: "/mo",
  },
};
type Tx = typeof TX.es;
type MetricKey = keyof Tx["metrics"];

const pct = (n: number, d = 0) => `${n.toFixed(d)}%`;

// ── Piezas ───────────────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-white border border-[#0F2B4C]/10 shadow-xl shadow-[#0F2B4C]/5 ${className}`}>{children}</div>;
}

function SectionTitle({ id, icon, title, desc }: { id: string; icon: ReactNode; title: string; desc?: string }) {
  return (
    <div id={id} className="scroll-mt-36 mb-5">
      <h2 className="flex items-center gap-2.5 text-2xl sm:text-3xl font-serif font-bold text-[#0F2B4C]">
        <span className="text-[#F0A030]">{icon}</span>
        {title}
      </h2>
      {desc && <p className="mt-1.5 text-[#0F2B4C]/60">{desc}</p>}
    </div>
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

function Kpi({ label, value, sub, delta }: { label: string; value: string; sub?: string; delta: ReactNode }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-[#0F2B4C]/60">{label}</p>
      <p className="mt-1 text-3xl font-bold text-[#0F2B4C] tabular-nums">{value}</p>
      {sub && <p className="text-xs text-[#0F2B4C]/45">{sub}</p>}
      <div className="mt-3">{delta}</div>
    </Card>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 128 128" className="w-36 h-36">
      <circle cx="64" cy="64" r={r} fill="none" stroke="#F0A030" strokeOpacity="0.15" strokeWidth="12" />
      <circle
        cx="64" cy="64" r={r} fill="none" stroke={AMBER} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 64 64)"
      />
      <text x="64" y="74" textAnchor="middle" fontSize="34" fontWeight="700" fill={NAVY}>{score}</text>
    </svg>
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
  const [metric, setMetric] = useState<MetricKey>("score");

  function load() {
    setFailed(false);
    fetchCanaDna().then(setData).catch(() => setFailed(true));
  }
  useEffect(() => {
    window.scrollTo(0, 0);
    load();
  }, []);

  const selectedZone = data?.zones.find((z) => z.slug === zone) ?? null;

  // Métricas de los últimos 12 meses por zona (para mapa y ranking)
  const zoneStats = useMemo(() => {
    if (!data) return [];
    return data.zones.map((z) => {
      const s = trailingSummary(monthlySeries(data, z.slug));
      return { zone: z, score: canaScore(z), ...s };
    });
  }, [data]);

  const series = useMemo(() => (data ? monthlySeries(data, zone) : []), [data, zone]);
  const summary = useMemo(() => trailingSummary(series), [series]);
  const profile = useMemo(() => seasonalProfile(series), [series]);
  const forecast = useMemo(() => projectNext12(series), [series]);

  if (failed) {
    return (
      <Shell tx={tx}>
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
      <Shell tx={tx}>
        <div className="grid sm:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-40 rounded-3xl bg-white animate-pulse" />)}
        </div>
      </Shell>
    );
  }

  const isEstimate = series.some((p) => p.is_estimate) || (selectedZone?.is_estimate ?? data.zones.some((z) => z.is_estimate));
  const lastUpdate = [...data.months, ...data.zones].reduce((m, r) => (r.updated_at > m ? r.updated_at : m), "");

  // Score del mercado completo = promedio ponderado por propiedades
  const totalListings = data.zones.reduce((s, z) => s + (z.active_listings ?? 0), 0);
  const weighted = (f: (z: MarketZone) => number) =>
    Math.round(data.zones.reduce((s, z) => s + f(z) * (z.active_listings ?? 0), 0) / Math.max(1, totalListings));
  const scoreSource = selectedZone ?? null;
  const compValue = (k: keyof typeof SCORE_WEIGHTS) => (scoreSource ? scoreSource[k] : weighted((z) => z[k]));
  const score = scoreSource ? canaScore(scoreSource) : weighted(canaScore);
  const listings = selectedZone ? selectedZone.active_listings ?? 0 : totalListings;
  const listingsGrowth = selectedZone
    ? selectedZone.listings_growth_pct
    : weighted((z) => z.listings_growth_pct ?? 0);

  const zoneLabel = selectedZone?.name ?? tx.all;
  const cur = summary.current;

  return (
    <Shell tx={tx} badge={isEstimate ? tx.estimate : tx.real} updated={lastUpdate} lang={l}>
      {/* Selector de zona */}
      <div className="sticky top-16 sm:top-20 z-30 rounded-2xl bg-white/95 backdrop-blur shadow-lg shadow-[#0F2B4C]/10 border border-[#0F2B4C]/10 px-3 sm:px-4 py-3">
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          <ZoneChip active={!zone} onClick={() => setZone(null)}>{tx.all}</ZoneChip>
          {data.zones.map((z) => (
            <ZoneChip key={z.slug} active={zone === z.slug} onClick={() => setZone(z.slug)}>{z.name}</ZoneChip>
          ))}
        </div>
        <nav className="mt-2.5 flex gap-4 overflow-x-auto [scrollbar-width:none] text-sm font-medium text-[#0F2B4C]/60">
          {(Object.keys(tx.tabs) as (keyof Tx["tabs"])[]).map((k) => (
            <a key={k} href={`#${k}`} className="whitespace-nowrap hover:text-[#b8761a]">{tx.tabs[k]}</a>
          ))}
        </nav>
      </div>

      {/* ── Resumen ── */}
      <section className="mt-6">
        <SectionTitle id="overview" icon={<Dna size={26} />} title={`${tx.tabs.overview}: ${zoneLabel}`} />
        <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-4">
          <Card className="p-6">
            <p className="font-semibold text-[#0F2B4C]">{tx.scoreQ}</p>
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
                    <div className="mt-1 h-2 rounded-full bg-[#0F2B4C]/8 overflow-hidden bg-[#F5F7FA]">
                      <div className="h-full rounded-full bg-[#0F2B4C]" style={{ width: `${compValue(k)}%` }} />
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
                    <li key={h} className="px-3 py-1 rounded-full bg-[#F0A030]/12 text-[#8a5a14] text-xs font-medium bg-amber-50">{h}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Kpi label={tx.kRevenue} value={cur ? fmtUsd(cur.revenue) : "—"} sub={tx.kRevenueSub} delta={<Delta value={summary.change.revenue} tx={tx} />} />
            <Kpi label={tx.kOcc} value={cur ? pct(cur.occupancy) : "—"} delta={<Delta value={summary.change.occupancy} unit="pts" tx={tx} />} />
            <Kpi label={tx.kAdr} value={cur ? fmtUsd(cur.adr) : "—"} sub={tx.kAdrSub} delta={<Delta value={summary.change.adr} tx={tx} />} />
            <Kpi label={tx.kListings} value={listings.toLocaleString("en-US")} sub={`RevPAR ${cur ? fmtUsd(cur.revpar) : "—"}`} delta={<Delta value={listingsGrowth} tx={tx} />} />
          </div>
        </div>
      </section>

      {/* ── Mapa + ranking ── */}
      <section className="mt-14">
        <SectionTitle id="map" icon={<MapPin size={26} />} title={tx.mapTitle} desc={tx.mapHint} />
        <div className="grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] gap-4">
          <Card className="p-4 overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-sm text-[#0F2B4C]/60">{tx.metric}:</span>
              {(Object.keys(tx.metrics) as MetricKey[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${metric === m ? "bg-[#0F2B4C] text-white" : "bg-[#F5F7FA] text-[#0F2B4C]/70 hover:bg-[#0F2B4C]/10"}`}
                >
                  {tx.metrics[m]}
                </button>
              ))}
            </div>
            <div className="rounded-2xl overflow-hidden">
              <ZoneMap
                zones={data.zones}
                values={Object.fromEntries(zoneStats.map((s) => [s.zone.slug, metricValue(s, metric)]))}
                format={(v) => formatMetric(metric, v)}
                selected={zone}
                onSelect={setZone}
                lang={l}
              />
            </div>
          </Card>
          <Card className="p-4 sm:p-5 overflow-x-auto">
            <h3 className="font-semibold text-[#0F2B4C] mb-3">{tx.ranking}</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#0F2B4C]/50 text-xs">
                  <th className="py-2 pr-2 font-medium">{tx.zone}</th>
                  <th className="py-2 px-2 font-medium text-right">Score</th>
                  <th className="py-2 px-2 font-medium text-right">{tx.metrics.occupancy}</th>
                  <th className="py-2 px-2 font-medium text-right">ADR</th>
                  <th className="py-2 pl-2 font-medium text-right">{tx.metrics.revenue}</th>
                </tr>
              </thead>
              <tbody>
                {[...zoneStats].sort((a, b) => metricValue(b, metric) - metricValue(a, metric)).map((s, i) => (
                  <tr
                    key={s.zone.slug}
                    onClick={() => setZone(zone === s.zone.slug ? null : s.zone.slug)}
                    className={`border-t border-[#0F2B4C]/5 cursor-pointer hover:bg-[#F5F7FA] ${zone === s.zone.slug ? "bg-amber-50" : ""}`}
                  >
                    <td className="py-2.5 pr-2 font-medium text-[#0F2B4C]">
                      <span className="text-[#0F2B4C]/35 mr-1.5 tabular-nums">{i + 1}</span>{s.zone.name}
                      <div className="text-[11px] text-[#0F2B4C]/45">
                        {(s.zone.active_listings ?? 0).toLocaleString("en-US")} {tx.listings.toLowerCase()} · {tx.growth} {s.zone.listings_growth_pct != null ? `+${s.zone.listings_growth_pct}%` : "—"}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-[#0F2B4C] tabular-nums">{s.score}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums">{s.current ? pct(s.current.occupancy) : "—"}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums">{s.current ? fmtUsd(s.current.adr) : "—"}</td>
                    <td className="py-2.5 pl-2 text-right tabular-nums">{s.current ? fmtCompactUsd(s.current.revenue) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </section>

      {/* ── Tendencias ── */}
      <section className="mt-14">
        <SectionTitle id="trends" icon={<LineIcon size={26} />} title={`${tx.trendsTitle} · ${zoneLabel}`} desc={tx.trendsDesc} />
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-4 sm:p-5">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={series.slice(-24).map((p) => ({ ...p, label: `${MONTHS[l][p.month - 1]} ${String(p.year).slice(2)}` }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0F2B4C" strokeOpacity={0.08} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: NAVY }} interval={2} />
                  <YAxis yAxisId="adr" tick={{ fontSize: 11, fill: NAVY }} tickFormatter={(v) => `$${v}`} width={48} />
                  <YAxis yAxisId="occ" orientation="right" domain={[0, 100]} tick={{ fontSize: 11, fill: NAVY }} tickFormatter={(v) => `${v}%`} width={40} />
                  <Tooltip formatter={(v, name) => (name === tx.kOcc ? pct(Number(v), 1) : fmtUsd(Number(v)))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="adr" dataKey="adr" name="ADR" fill={SKY} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="occ" dataKey="occupancy" name={tx.kOcc} stroke={AMBER} strokeWidth={3} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-4 sm:p-5">
            <h3 className="font-semibold text-[#0F2B4C]">{tx.yoyTitle}</h3>
            <p className="text-xs text-[#0F2B4C]/50">{tx.yoyDesc}</p>
            <div className="h-64 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yoyRows(series, l)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0F2B4C" strokeOpacity={0.08} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: NAVY }} />
                  <YAxis tick={{ fontSize: 11, fill: NAVY }} tickFormatter={(v) => fmtCompactUsd(v)} width={52} />
                  <Tooltip formatter={(v) => fmtUsd(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line dataKey="prev" name={tx.lastYear} stroke={SKY} strokeWidth={2} strokeDasharray="5 4" dot={false} />
                  <Line dataKey="cur" name={tx.thisYear} stroke={NAVY} strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </section>

      {/* ── Estacionalidad ── */}
      <section className="mt-14">
        <SectionTitle id="season" icon={<CalendarDays size={26} />} title={`${tx.seasonTitle} · ${zoneLabel}`} desc={tx.seasonDesc} />
        <SeasonBlock profile={profile} tx={tx} l={l} />
      </section>

      {/* ── Proyección ── */}
      <section className="mt-14">
        <SectionTitle id="forecast" icon={<BarChart3 size={26} />} title={`${tx.fcTitle} · ${zoneLabel}`} desc={tx.fcDesc} />
        <Card className="p-4 sm:p-6">
          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            {(["conservative", "base", "optimistic"] as const).map((k) => (
              <div key={k} className={`rounded-2xl p-4 ${k === "base" ? "bg-[#0F2B4C] text-white" : "bg-[#F5F7FA] text-[#0F2B4C]"}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${k === "base" ? "text-[#F0A030]" : "text-[#0F2B4C]/50"}`}>{tx[k]}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{fmtUsd(forecast.reduce((s, p) => s + p[k], 0))}</p>
                <p className={`text-xs ${k === "base" ? "text-white/60" : "text-[#0F2B4C]/50"}`}>{tx.fcTotal}</p>
              </div>
            ))}
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecast.map((p) => ({ ...p, label: `${MONTHS[l][p.month - 1]} ${String(p.year).slice(2)}` }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0F2B4C" strokeOpacity={0.08} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: NAVY }} />
                <YAxis tick={{ fontSize: 11, fill: NAVY }} tickFormatter={(v) => fmtCompactUsd(v)} width={52} />
                <Tooltip formatter={(v) => fmtUsd(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area dataKey="optimistic" name={tx.optimistic} stroke={AMBER} fill={AMBER} fillOpacity={0.15} strokeWidth={2} />
                <Area dataKey="base" name={tx.base} stroke={NAVY} fill={NAVY} fillOpacity={0.15} strokeWidth={3} />
                <Area dataKey="conservative" name={tx.conservative} stroke={SKY} fill={SKY} fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
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
        />
      </section>

      {/* ── Mercado ── */}
      <section className="mt-14">
        <SectionTitle id="market" icon={<Building2 size={26} />} title={tx.marketTitle} />
        <MarketNotes data={data} tx={tx} l={l} />
      </section>

      {/* ── Tiempo real + metodología ── */}
      <section className="mt-14 grid lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="flex items-center gap-2 font-semibold text-[#0F2B4C]"><Radio size={18} className="text-[#F0A030]" />{tx.liveTitle}</h3>
          <p className="mt-2 text-sm text-[#0F2B4C]/70 leading-relaxed">{tx.liveBody}</p>
        </Card>
        <Card className="p-6">
          <h3 className="flex items-center gap-2 font-semibold text-[#0F2B4C]"><Info size={18} className="text-[#F0A030]" />{tx.methodTitle}</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-[#0F2B4C]/70 list-disc pl-5">
            {tx.method.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </Card>
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
  );
}

// ── Helpers de presentación ─────────────────────────────────────────────────

type ZoneStat = { zone: MarketZone; score: number } & ReturnType<typeof trailingSummary>;

function metricValue(s: ZoneStat, m: MetricKey): number {
  if (m === "score") return s.score;
  return s.current ? s.current[m] : 0;
}

function formatMetric(m: MetricKey, v: number) {
  if (m === "score") return String(Math.round(v));
  if (m === "occupancy") return pct(v);
  if (m === "revenue") return fmtCompactUsd(v);
  return fmtUsd(v);
}

function yoyRows(series: MonthPoint[], l: "es" | "en") {
  const last = series.slice(-12);
  const prev = series.slice(-24, -12);
  return last.map((p, i) => ({ label: MONTHS[l][p.month - 1], cur: Math.round(p.revenue), prev: prev[i] ? Math.round(prev[i].revenue) : null }));
}

function ZoneChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors border ${
        active ? "bg-[#0F2B4C] text-white border-[#0F2B4C]" : "bg-white text-[#0F2B4C]/75 border-[#0F2B4C]/15 hover:border-[#0F2B4C]/40"
      }`}
    >
      {children}
    </button>
  );
}

function SeasonBlock({ profile, tx, l }: { profile: ReturnType<typeof seasonalProfile>; tx: Tx; l: "es" | "en" }) {
  const vals = profile.map((p) => p.revpar);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const best = profile.reduce((a, b) => (b.revpar > a.revpar ? b : a));
  const worst = profile.reduce((a, b) => (b.revpar < a.revpar ? b : a));
  const shade = (v: number) => (max === min ? 0.5 : (v - min) / (max - min));
  return (
    <div className="grid lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] gap-4">
      <Card className="p-4 sm:p-6">
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {profile.map((p) => {
            const s = shade(p.revpar);
            return (
              <div
                key={p.month}
                className="rounded-2xl p-3"
                style={{ background: `rgba(15, 43, 76, ${0.08 + s * 0.9})`, color: s > 0.45 ? "#fff" : NAVY }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{MONTHS[l][p.month - 1]}</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{fmtUsd(p.revpar)}</p>
                <p className="text-[11px] opacity-75">{pct(p.occupancy)} · {fmtUsd(p.adr)}</p>
              </div>
            );
          })}
        </div>
        <ul className="mt-5 space-y-2">
          {tx.events.map(([when, what]) => (
            <li key={when} className="flex gap-3 text-sm">
              <span className="flex-shrink-0 w-24 font-semibold text-[#0F2B4C]">{when}</span>
              <span className="text-[#0F2B4C]/65">{what}</span>
            </li>
          ))}
        </ul>
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
        <Card className="p-5">
          <p className="text-sm text-[#0F2B4C]/60">{tx.best}</p>
          <p className="mt-1 text-2xl font-bold text-[#0F2B4C] capitalize">{MONTHS_LONG[l][best.month - 1]}</p>
          <p className="text-xs text-[#0F2B4C]/50">RevPAR {fmtUsd(best.revpar)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-[#0F2B4C]/60">{tx.worst}</p>
          <p className="mt-1 text-2xl font-bold text-[#0F2B4C] capitalize">{MONTHS_LONG[l][worst.month - 1]}</p>
          <p className="text-xs text-[#0F2B4C]/50">RevPAR {fmtUsd(worst.revpar)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-[#0F2B4C]/60">{tx.seasonScore}</p>
          <p className="mt-1 text-2xl font-bold text-[#0F2B4C]">{seasonalityScore(profile)}<span className="text-base text-[#0F2B4C]/40">/100</span></p>
          <p className="text-xs text-[#0F2B4C]/50">{tx.seasonScoreHint}</p>
        </Card>
      </div>
    </div>
  );
}

function NetCalculator({ tx, l, defaultAdr, defaultOcc, defaultPrice }: { tx: Tx; l: "es" | "en"; defaultAdr: number; defaultOcc: number; defaultPrice: number }) {
  const [bed, setBed] = useState<string>("1");
  const [occupancy, setOccupancy] = useState(Math.round(defaultOcc));
  const [adr, setAdr] = useState(Math.round(defaultAdr));
  const [price, setPrice] = useState(defaultPrice);
  const [commission, setCommission] = useState(12);
  const [opex, setOpex] = useState(30);
  const itbis = 18;
  const r = netIncome({ adr, occupancy, price, itbis, commission, opex });

  function pickBed(id: string) {
    const b = BEDROOMS.find((x) => x.id === id);
    if (!b) return;
    setBed(id);
    setAdr(Math.round(defaultAdr * b.adr));
  }
  function useZone() {
    const b = BEDROOMS.find((x) => x.id === bed) ?? BEDROOMS[1];
    setAdr(Math.round(defaultAdr * b.adr));
    setOccupancy(Math.round(defaultOcc));
    setPrice(defaultPrice);
  }

  const slider = (label: string, value: number, set: (n: number) => void, min: number, max: number, stepN: number, fmt: (n: number) => string) => (
    <label className="block">
      <div className="flex justify-between text-sm">
        <span className="text-[#0F2B4C]/70">{label}</span>
        <span className="font-semibold text-[#0F2B4C] tabular-nums">{fmt(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={stepN} value={value} onChange={(e) => set(Number(e.target.value))} className="mt-1.5 w-full accent-[#F0A030]" />
    </label>
  );

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
        {slider(tx.adr, adr, setAdr, 40, 1200, 5, (n) => fmtUsd(n))}
        {slider(tx.occ, occupancy, setOccupancy, 10, 95, 1, (n) => pct(n))}
        {slider(tx.price, price, setPrice, 50000, 1500000, 5000, (n) => fmtUsd(n))}
        {slider(tx.commission, commission, setCommission, 0, 25, 0.5, (n) => pct(n, 1))}
        {slider(tx.opex, opex, setOpex, 10, 50, 1, (n) => pct(n))}
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
            <p className="text-2xl font-bold text-[#0F2B4C] tabular-nums">{fmtUsd(r.gross)}</p>
            <p className="text-xs text-[#0F2B4C]/45">{r.nights} {tx.nights}</p>
          </div>
          <div className="rounded-2xl bg-[#0F2B4C] p-4">
            <p className="text-xs text-white/60">{tx.net}</p>
            <p className="text-2xl font-bold text-[#F0A030] tabular-nums">{fmtUsd(r.net)}</p>
            <p className="text-xs text-white/50">{fmtUsd(r.net / 12)}{tx.perMonth}</p>
          </div>
          <div className="rounded-2xl bg-[#F5F7FA] p-4">
            <p className="text-xs text-[#0F2B4C]/55">{tx.roi}</p>
            <p className="text-2xl font-bold text-[#0F2B4C] tabular-nums">{pct(r.roiNet, 1)}</p>
            <p className="text-xs text-[#0F2B4C]/45">bruto {pct(r.roiGross, 1)}</p>
          </div>
          <div className="rounded-2xl bg-[#F5F7FA] p-4">
            <p className="text-xs text-[#0F2B4C]/55">{tx.payback}</p>
            <p className="text-2xl font-bold text-[#0F2B4C] tabular-nums">{r.payback ? r.payback.toFixed(1) : "—"}</p>
            <p className="text-xs text-[#0F2B4C]/45">{tx.years}</p>
          </div>
        </div>
        <ul className="mt-5 space-y-2 text-sm">
          {[
            [tx.gross, r.gross, false],
            [`− ${tx.itbis} (${itbis}%)`, r.itbisAmt, true],
            [`− ${tx.commission} (${commission}%)`, r.commAmt, true],
            [`− ${tx.opex} (${opex}%)`, r.opexAmt, true],
          ].map(([label, v, neg]) => (
            <li key={String(label)} className="flex justify-between">
              <span className="text-[#0F2B4C]/65">{label}</span>
              <span className={`tabular-nums ${neg ? "text-rose-700" : "font-semibold text-[#0F2B4C]"}`}>{fmtUsd(Number(v))}</span>
            </li>
          ))}
          <li className="flex justify-between border-t border-[#0F2B4C]/10 pt-2 font-semibold text-[#0F2B4C]">
            <span>= {tx.net}</span>
            <span className="tabular-nums">{fmtUsd(r.net)}</span>
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
    ["stat", tx.stats, <BarChart3 key="s" size={18} />, "text-[#0F2B4C]"],
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

function Shell({ tx, badge, updated, lang, children }: { tx: Tx; badge?: string; updated?: string; lang?: "es" | "en"; children: ReactNode }) {
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
          {badge && (
            <p className="mt-6 inline-flex items-center gap-2 text-xs text-white/60">
              <span className="w-2 h-2 rounded-full bg-[#F0A030]" />
              {badge}
              {updated && ` · ${tx.updated} ${new Date(updated).toLocaleDateString(lang === "en" ? "en-US" : "es-DO", { day: "numeric", month: "long", year: "numeric" })}`}
            </p>
          )}
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
      "Ocupación, tarifa media, ingresos, estacionalidad y proyecciones de alquiler vacacional por zona en Bávaro, Punta Cana, Cap Cana, Cana Bay y Bayahibe. Gratis, sin registro.",
    path: "/cana-dna",
  });

  return (
    <LangProvider>
      <CanaDnaContent />
    </LangProvider>
  );
}
