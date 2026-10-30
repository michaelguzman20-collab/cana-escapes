import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Clock, Copy, Download, ExternalLink, Image as Images, Loader2, MessageCircle, Monitor, MousePointerClick, MoveDown, RefreshCw, Rotate3d, Share2, Smartphone, Tablet, Trash2, UserCheck, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { buildVisitsPdf, deliverPdf, type VisitsReport } from "@/lib/visitsPdf";

// Visitas del sitio público y de los Tours 360 (tablas site_visits y site_events; resumen con visit_stats).
// "Visitas" = páginas abiertas; "visitantes" = navegadores distintos; las fotos de cada tour se cuentan aparte.
// Se puede ver todo el sitio o una sola página, con su detalle: tiempo, hasta dónde bajan, horas y qué tocan,
// de dónde llegan (canal, país, ciudad) y exportarlo a PDF. Las visitas del equipo (internal_visitors) no cuentan.

interface RecentVisit {
  visited_at: string;
  path: string;
  device: "phone" | "tablet" | "desktop";
  referrer: string | null;
  channel: string;
  campaign: string | null;
  country: string | null;
  city: string | null;
  internal: boolean;
  lang: string | null;
  duration: number | null;
  scroll: number | null;
  events: string[];
  photos: number;
}

interface Stats {
  visits: number;
  visitors: number;
  new_visitors: number;
  internal_hidden: number;
  tour_visits: number;
  photo_views: number;
  contacts: Partial<Record<"whatsapp" | "phone" | "email", number>>;
  langs: { lang: string; visits: number }[];
  channels: { channel: string; visits: number }[];
  campaigns: { campaign: string; visits: number }[];
  countries: { country: string; visits: number }[];
  cities: { city: string; country: string | null; visits: number }[];
  avg_duration: number | null;
  avg_scroll: number | null;
  interacted: number;
  devices: Partial<Record<"phone" | "tablet" | "desktop", number>>;
  daily: { day: string; visits: number; visitors: number }[];
  hours: { hour: number; visits: number }[];
  top_pages: { path: string; visits: number }[];
  referrers: { host: string; visits: number }[];
  events: { kind: string; label: string | null; count: number }[];
  recent: RecentVisit[];
  tours: {
    id: string;
    title: string;
    slug: string;
    visits: number;
    visitors: number;
    photo_views: number;
    avg_duration: number | null;
    contacts: number;
    scenes: { title: string; views: number }[];
  }[];
}

type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;

const PERIODS = [
  { days: 7, label: "7 días" },
  { days: 30, label: "30 días" },
  { days: 90, label: "90 días" },
  { days: 365, label: "1 año" },
];

const PAGE_NAMES: Record<string, string> = {
  "/": "Inicio",
  "/propietarios": "Propietarios",
  "/servicios": "Servicios",
  "/tours": "Tours 360",
  "/apps": "Apps",
  "/cana-dna": "Cana DNA",
};
const pageName = (path: string) => (PAGE_NAMES[path] ? `${PAGE_NAMES[path]} (${path})` : path);

const KIND_NAMES: Record<string, string> = { whatsapp: "WhatsApp", phone: "Llamada", email: "Correo", link: "Enlace externo", click: "Botón" };
const DEVICE_ICON = { phone: Smartphone, tablet: Tablet, desktop: Monitor };
const DEVICE_NAMES = { phone: "Teléfono", tablet: "Tableta", desktop: "Computadora" };

const CHANNEL_NAMES: Record<string, string> = {
  directo: "Directo o sin marca",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  google: "Google",
  buscadores: "Otros buscadores",
  tiktok: "TikTok",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  plataformas: "Airbnb / Booking / Vrbo",
  correo: "Correo",
  qr: "Código QR",
};
const channelName = (c: string) => CHANNEL_NAMES[c] ?? c;

// Nombre del país en español a partir del código (DO → República Dominicana) y su bandera
let regionNames: Intl.DisplayNames | null = null;
try {
  regionNames = new Intl.DisplayNames(["es"], { type: "region" });
} catch {
  regionNames = null;
}
const countryName = (c: string | null) => (c ? regionNames?.of(c) ?? c : "");
const flag = (c: string | null) => (c && /^[A-Z]{2}$/.test(c) ? String.fromCodePoint(...[...c].map((ch) => 0x1f1a5 + ch.charCodeAt(0))) : "");
const LANG_NAMES: Record<string, string> = { es: "Español", en: "Inglés", fr: "Francés", de: "Alemán", it: "Italiano", pt: "Portugués", ru: "Ruso", nl: "Neerlandés" };

// Enlaces marcados para saber por dónde llega cada visita (?src=…)
const SHARE_SOURCES = [
  { src: "whatsapp", label: "WhatsApp" },
  { src: "instagram", label: "Instagram" },
  { src: "facebook", label: "Facebook" },
  { src: "qr", label: "Código QR" },
  { src: "correo", label: "Correo" },
];

const fmt = (n: number) => n.toLocaleString("es-DO");
function fmtDuration(s: number | null | undefined) {
  if (s == null) return "—";
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min ${s % 60} s` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

function Card({ icon: Icon, label, value, note }: { icon: typeof Users; label: string; value: string; note?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Icon size={14} /> {label}
      </div>
      <p className="mt-1 text-2xl font-bold text-[#0F2B4C]">{value}</p>
      {note && <p className="text-[11px] text-gray-400">{note}</p>}
    </div>
  );
}

function Bars({ title, bars, footer }: { title: string; bars: { key: string; label: string; value: number }[]; footer: [string, string] }) {
  const max = Math.max(1, ...bars.map((d) => d.value));
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="font-semibold text-[#0F2B4C] mb-3">{title}</h2>
      <div className="flex items-end gap-[2px] h-32">
        {bars.map((d) => (
          <div key={d.key} className="group relative flex-1 h-full flex items-end" title={`${d.label}: ${d.value}`}>
            <div className="w-full rounded-t bg-[#F0A030]/80 group-hover:bg-[#F0A030]" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 2 : 0 }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{footer[0]}</span>
        <span>{footer[1]}</span>
      </div>
    </div>
  );
}

// Barras por día del periodo (los días sin visitas aparecen en cero)
function DailyChart({ daily, days }: { daily: Stats["daily"]; days: number }) {
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const shown = Math.min(days, 90);
  const bars = Array.from({ length: shown }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (shown - 1 - i));
    const key = d.toLocaleDateString("en-CA", { timeZone: "America/Santo_Domingo" });
    return { key, label: d.toLocaleDateString("es-DO", { day: "numeric", month: "short" }), value: byDay.get(key)?.visits ?? 0 };
  });
  return <Bars title={`Visitas por día${days > 90 ? " (últimos 90 días)" : ""}`} bars={bars} footer={[bars[0]?.label ?? "", bars[bars.length - 1]?.label ?? ""]} />;
}

// A qué hora entran (hora de República Dominicana)
function HoursChart({ hours }: { hours: Stats["hours"] }) {
  const byHour = new Map(hours.map((h) => [h.hour, h.visits]));
  const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? "a. m." : "p. m."}`;
  const bars = Array.from({ length: 24 }, (_, h) => ({ key: String(h), label: hourLabel(h), value: byHour.get(h) ?? 0 }));
  const peak = hours.length ? hours.reduce((a, b) => (b.visits > a.visits ? b : a)) : null;
  return (
    <Bars
      title={`A qué hora entran${peak ? ` · más visitas a las ${hourLabel(peak.hour)}` : ""}`}
      bars={bars}
      footer={["12 a. m.", "11 p. m."]}
    />
  );
}

function BarList({ title, rows, empty }: { title: string; rows: { label: string; value: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="font-semibold text-[#0F2B4C] mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r, i) => (
            <li key={`${r.label}-${i}`} className="relative flex justify-between gap-3 px-2 py-1 rounded">
              <span className="absolute inset-y-0 left-0 rounded bg-[#0F2B4C]/[0.06]" style={{ width: `${(r.value / max) * 100}%` }} />
              <span className="relative truncate">{r.label}</span>
              <span className="relative font-semibold text-[#0F2B4C]">{fmt(r.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Últimas visitas, una por una
function RecentTable({ rows, showPath, showPhotos }: { rows: RecentVisit[]; showPath: boolean; showPhotos: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="font-semibold text-[#0F2B4C] mb-3">Últimas visitas</h2>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400">Todavía no hay visitas en este periodo.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-1.5 pr-3 font-medium">Cuándo</th>
                {showPath && <th className="py-1.5 pr-3 font-medium">Página</th>}
                <th className="py-1.5 pr-3 font-medium">Dispositivo</th>
                <th className="py-1.5 pr-3 font-medium">Llegó desde</th>
                <th className="py-1.5 pr-3 font-medium">Lugar</th>
                <th className="py-1.5 pr-3 font-medium">Tiempo</th>
                <th className="py-1.5 pr-3 font-medium">Bajó</th>
                {showPhotos && <th className="py-1.5 pr-3 font-medium">Fotos vistas</th>}
                <th className="py-1.5 font-medium">Qué tocó</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const Icon = DEVICE_ICON[r.device] ?? Monitor;
                return (
                  <tr key={`${r.visited_at}-${i}`} className="border-b border-gray-50 align-top">
                    <td className="py-1.5 pr-3 whitespace-nowrap">
                      {new Date(r.visited_at).toLocaleString("es-DO", { timeZone: "America/Santo_Domingo", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                    </td>
                    {showPath && <td className="py-1.5 pr-3 whitespace-nowrap">{pageName(r.path)}</td>}
                    <td className="py-1.5 pr-3">
                      <span className="inline-flex items-center gap-1"><Icon size={13} /> {r.lang?.toUpperCase()}</span>
                    </td>
                    <td className="py-1.5 pr-3">
                      {r.channel === "directo" ? <span className="text-gray-400">directo</span> : CHANNEL_NAMES[r.channel] ?? r.referrer ?? r.channel}
                      {r.campaign && <span className="text-gray-400"> · {r.campaign}</span>}
                      {r.internal && <span className="ml-1 rounded bg-emerald-100 text-emerald-800 px-1">equipo</span>}
                    </td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">{r.country ? `${flag(r.country)} ${r.city ?? countryName(r.country)}` : <span className="text-gray-400">—</span>}</td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">{fmtDuration(r.duration)}</td>
                    <td className="py-1.5 pr-3">{r.scroll != null ? `${r.scroll}%` : "—"}</td>
                    {showPhotos && <td className="py-1.5 pr-3">{r.photos || "—"}</td>}
                    <td className="py-1.5 text-gray-600">{r.events.length ? r.events.join(" · ") : <span className="text-gray-400">nada</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminVisitas() {
  const [days, setDays] = useState(30);
  const [path, setPath] = useState("");
  const [paths, setPaths] = useState<{ path: string; visits: number; title: string | null }[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [withTeam, setWithTeam] = useState(false);
  const [team, setTeam] = useState<{ visitor: string; label: string | null; created_at: string; last_seen: string }[]>([]);
  const [showTeam, setShowTeam] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const [s, p, t] = await Promise.all([
      rpc("visit_stats", { p_days: days, p_path: path || null, p_internal: withTeam }),
      rpc("visit_paths", { p_days: days }),
      supabase.from("internal_visitors").select("visitor, label, created_at, last_seen").order("last_seen", { ascending: false }),
    ]);
    if (s.error) setError(s.error.message);
    else setStats(s.data as Stats);
    if (!p.error) setPaths(p.data as { path: string; visits: number; title: string | null }[]);
    if (!t.error) setTeam(t.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [days, path, withTeam]); // eslint-disable-line react-hooks/exhaustive-deps

  // Se mantiene al día solo: cada minuto mientras la página está a la vista
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    const t = setInterval(() => !document.hidden && loadRef.current(), 60_000);
    return () => clearInterval(t);
  }, []);

  async function removeTeamDevice(visitor: string) {
    if (!confirm("¿Volver a contar las visitas de este dispositivo?")) return;
    const { error } = await supabase.from("internal_visitors").delete().eq("visitor", visitor);
    if (error) toast({ title: "No se pudo quitar", description: error.message, variant: "destructive" });
    else load();
  }

  function copySourceLink(src: string) {
    const url = `${location.origin}${path}?src=${src}`;
    navigator.clipboard.writeText(url).then(
      () => toast({ title: "Enlace copiado", description: url }),
      () => toast({ title: "No se pudo copiar", description: url, variant: "destructive" })
    );
  }

  const dev = stats?.devices ?? {};
  const devTotal = (dev.phone ?? 0) + (dev.tablet ?? 0) + (dev.desktop ?? 0);
  const pct = (n = 0) => (devTotal ? `${Math.round((n / devTotal) * 100)}%` : "—");
  const isTour = path.startsWith("/tour/");
  // La página elegida sigue en la lista aunque no tenga visitas en el periodo nuevo
  const options = path && !paths.some((p) => p.path === path) ? [{ path, visits: 0, title: null }, ...paths] : paths;
  const selected = options.find((p) => p.path === path);
  const selectedName = selected?.title ? `Tour: ${selected.title}` : pageName(path);
  const tourRow = isTour ? stats?.tours.find((t) => `/tour/${t.slug}` === path) : undefined;
  const contacts = stats ? (stats.contacts.whatsapp ?? 0) + (stats.contacts.phone ?? 0) + (stats.contacts.email ?? 0) : 0;
  const returning = stats ? Math.max(0, stats.visitors - stats.new_visitors) : 0;
  const photosPerVisit = stats && stats.tour_visits ? (stats.photo_views / stats.tour_visits).toFixed(1).replace(".", ",") : null;

  async function exportPdf(share: boolean) {
    if (!stats) return;
    setPdfBusy(true);
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - (days - 1));
      const d = (x: Date) => x.toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" });
      const shown = Math.min(days, 90);
      const byDay = new Map(stats.daily.map((x) => [x.day, x.visits]));
      const daily = Array.from({ length: shown }, (_, i) => {
        const x = new Date();
        x.setDate(x.getDate() - (shown - 1 - i));
        return { label: x.toLocaleDateString("es-DO", { day: "numeric", month: "short" }), value: byDay.get(x.toLocaleDateString("en-CA", { timeZone: "America/Santo_Domingo" })) ?? 0 };
      });
      const peak = stats.hours.length ? stats.hours.reduce((a, b) => (b.visits > a.visits ? b : a)) : null;
      const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? "a. m." : "p. m."}`;
      const kpis: VisitsReport["kpis"] = [
        { label: "Visitas", value: fmt(stats.visits), note: isTour ? "veces que se abrió el tour" : "páginas abiertas" },
        { label: "Visitantes", value: fmt(stats.visitors), note: `${fmt(stats.new_visitors)} nuevos · ${fmt(returning)} recurrentes` },
        { label: "Tiempo promedio", value: fmtDuration(stats.avg_duration), note: "con la página a la vista" },
      ];
      if (isTour || !path) kpis.push({ label: "Fotos vistas", value: fmt(stats.photo_views), note: photosPerVisit ? `${photosPerVisit} fotos por visita` : undefined });
      kpis.push({ label: "Contactos", value: fmt(contacts), note: `WhatsApp ${stats.contacts.whatsapp ?? 0} · Llamadas ${stats.contacts.phone ?? 0} · Correo ${stats.contacts.email ?? 0}` });
      kpis.push({ label: "Interactuaron", value: stats.visits ? `${Math.round((stats.interacted / stats.visits) * 100)}%` : "—", note: peak ? `hora pico: ${hourLabel(peak.hour)}` : undefined });
      const report: VisitsReport = {
        title: path ? selectedName : "Todo el sitio",
        url: path ? `https://canaescapes.com${path}` : undefined,
        periodLabel: `${PERIODS.find((p) => p.days === days)?.label ?? `${days} días`}: ${d(start)} – ${d(end)}`,
        kpis,
        daily,
        sections: [
          ...(isTour ? [{ title: "Fotos más vistas", rows: (tourRow?.scenes ?? []).map((s) => ({ label: s.title, value: s.views })), empty: "Sin fotos vistas." }] : []),
          { title: "De dónde llegan", rows: stats.channels.map((c) => ({ label: channelName(c.channel), value: c.visits })), empty: "Sin datos." },
          { title: "Países", rows: stats.countries.map((c) => ({ label: countryName(c.country), value: c.visits })), empty: "Sin datos de país todavía." },
          { title: "Ciudades", rows: stats.cities.map((c) => ({ label: `${c.city}${c.country ? `, ${countryName(c.country)}` : ""}`, value: c.visits })), empty: "Sin datos de ciudad todavía." },
          { title: "Dispositivo", rows: (["phone", "desktop", "tablet"] as const).filter((k) => stats.devices[k]).map((k) => ({ label: DEVICE_NAMES[k], value: stats.devices[k] ?? 0 })), empty: "Sin datos." },
          { title: "Idioma del navegador", rows: stats.langs.map((l) => ({ label: LANG_NAMES[l.lang] ?? l.lang.toUpperCase(), value: l.visits })), empty: "Sin datos." },
          { title: "Qué tocan", rows: stats.events.slice(0, 10).map((e) => ({ label: e.label && e.label !== e.kind ? `${KIND_NAMES[e.kind] ?? e.kind}: ${e.label}` : KIND_NAMES[e.kind] ?? e.kind, value: e.count })), empty: "Nadie tocó botones o enlaces." },
          ...(stats.campaigns.length ? [{ title: "Campañas", rows: stats.campaigns.map((c) => ({ label: c.campaign, value: c.visits })), empty: "" }] : []),
          ...(!path ? [{ title: "Tours 360", rows: stats.tours.filter((t) => t.visits).map((t) => ({ label: t.title, value: t.visits })), empty: "Sin visitas a tours." }] : []),
        ],
      };
      const bytes = await buildVisitsPdf(report);
      const slug = (path ? (selected?.title ?? path) : "sitio").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
      await deliverPdf(bytes, `visitas-${slug}-${end.toLocaleDateString("en-CA")}.pdf`, share);
    } catch (e) {
      toast({ title: "No se pudo crear el PDF", description: (e as Error).message, variant: "destructive" });
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="px-3 sm:px-6 pt-6 pb-8 min-h-screen bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8] overflow-x-hidden">
      <div className="max-w-screen-xl mx-auto space-y-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-[#0F2B4C]" />
            <div>
              <h1 className="text-xl font-bold text-[#0F2B4C]">Visitas</h1>
              <p className="text-xs text-gray-500">Páginas públicas y Tours 360. Sin datos personales: cada navegador cuenta como un visitante.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="h-9 max-w-[16rem] rounded-lg border border-gray-300 bg-white px-2 text-xs font-semibold text-[#0F2B4C]"
              aria-label="Página"
            >
              <option value="">Todo el sitio</option>
              {options.map((p) => (
                <option key={p.path} value={p.path}>{p.title ? `Tour: ${p.title}` : pageName(p.path)} · {fmt(p.visits)}</option>
              ))}
            </select>
            <div className="flex rounded-lg border border-gray-300 bg-white overflow-hidden">
              {PERIODS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => setDays(p.days)}
                  className={cn("px-3 h-9 text-xs font-semibold", days === p.days ? "bg-[#0F2B4C] text-white" : "text-gray-600 hover:bg-gray-50")}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={load} disabled={loading} className="h-9 w-9 rounded-lg border border-gray-300 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50" title="Actualizar">
              <RefreshCw size={15} className={cn(loading && "animate-spin")} />
            </button>
            <button
              onClick={() => exportPdf(false)}
              disabled={!stats || pdfBusy}
              className="h-9 px-3 rounded-lg bg-[#0F2B4C] text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#163a63] disabled:opacity-50"
              title="Descargar el reporte de lo que estás viendo (todo el sitio o el tour elegido)"
            >
              {pdfBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF
            </button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                onClick={() => exportPdf(true)}
                disabled={!stats || pdfBusy}
                className="h-9 w-9 rounded-lg border border-gray-300 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                title="Compartir el PDF (WhatsApp, correo…)"
              >
                <Share2 size={15} />
              </button>
            )}
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2">No se pudieron cargar las visitas: {error}</p>}

        {/* Visitas del equipo: este navegador y los demás donde se abrió el panel no cuentan */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-900">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <UserCheck size={15} className="shrink-0" />
            <span>
              <b>Tus visitas no cuentan.</b> Cada dispositivo donde abres este panel queda como del equipo
              {stats && !withTeam && stats.internal_hidden > 0 && <> · {fmt(stats.internal_hidden)} {stats.internal_hidden === 1 ? "visita tuya oculta" : "visitas tuyas ocultas"} en este periodo</>}.
            </span>
            <button onClick={() => setShowTeam((v) => !v)} className="font-semibold underline underline-offset-2">
              {showTeam ? "Ocultar dispositivos" : `Dispositivos del equipo (${team.length})`}
            </button>
            <label className="ml-auto inline-flex items-center gap-1.5 font-semibold cursor-pointer">
              <input type="checkbox" checked={withTeam} onChange={(e) => setWithTeam(e.target.checked)} /> Incluir mis visitas
            </label>
          </div>
          {showTeam && (
            <div className="mt-2 space-y-1">
              <p className="text-emerald-800/80">Para que tu teléfono tampoco cuente, entra una vez al panel desde ese teléfono (en el mismo navegador con el que abres los tours).</p>
              {team.map((d) => (
                <div key={d.visitor} className="flex items-center gap-2 bg-white/70 rounded-md px-2 py-1">
                  <span className="font-semibold">{d.label ?? "Dispositivo"}</span>
                  <span className="text-emerald-800/70">
                    desde {new Date(d.created_at).toLocaleDateString("es-DO", { day: "numeric", month: "short" })} · último uso {new Date(d.last_seen).toLocaleDateString("es-DO", { day: "numeric", month: "short" })}
                  </span>
                  <button onClick={() => removeTeamDevice(d.visitor)} className="ml-auto text-red-600 hover:text-red-700" title="Volver a contar este dispositivo">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {stats && (
          <>
            {path && (
              <p className="flex items-center gap-2 text-[#0F2B4C]">
                Viendo: <b>{selectedName}</b>
                <Link to={path} target="_blank" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-[#b8761a]">abrir <ExternalLink size={12} /></Link>
              </p>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
              <Card icon={BarChart3} label="Visitas" value={fmt(stats.visits)} note="páginas abiertas" />
              <Card icon={Users} label="Visitantes" value={fmt(stats.visitors)} note={`${fmt(stats.new_visitors)} nuevos · ${fmt(returning)} recurrentes`} />
              <Card icon={Clock} label="Tiempo promedio" value={fmtDuration(stats.avg_duration)} note="con la página a la vista" />
              {isTour ? (
                <Card icon={Images} label="Fotos vistas" value={fmt(stats.photo_views)} note={photosPerVisit ? `${photosPerVisit} fotos por visita` : "dentro del tour"} />
              ) : (
                <Card icon={MoveDown} label="Bajan hasta" value={stats.avg_scroll != null ? `${stats.avg_scroll}%` : "—"} note="de la página, en promedio" />
              )}
              <Card
                icon={MessageCircle}
                label="Contactos"
                value={fmt(contacts)}
                note={`WhatsApp ${stats.contacts.whatsapp ?? 0} · Llamadas ${stats.contacts.phone ?? 0} · Correo ${stats.contacts.email ?? 0}`}
              />
              <Card
                icon={MousePointerClick}
                label="Interactuaron"
                value={stats.visits ? `${Math.round((stats.interacted / stats.visits) * 100)}%` : "—"}
                note={`${fmt(stats.interacted)} ${stats.interacted === 1 ? "visita tocó" : "visitas tocaron"} algo`}
              />
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Dispositivo</p>
                <div className="mt-2 space-y-1 text-xs">
                  <p className="flex items-center gap-2"><Smartphone size={13} /> Teléfono <span className="ml-auto font-semibold text-[#0F2B4C]">{pct(dev.phone)}</span></p>
                  <p className="flex items-center gap-2"><Tablet size={13} /> Tableta <span className="ml-auto font-semibold text-[#0F2B4C]">{pct(dev.tablet)}</span></p>
                  <p className="flex items-center gap-2"><Monitor size={13} /> Computadora <span className="ml-auto font-semibold text-[#0F2B4C]">{pct(dev.desktop)}</span></p>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <DailyChart daily={stats.daily} days={days} />
              <HoursChart hours={stats.hours} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <BarList
                title="Qué tocan"
                rows={stats.events.map((e) => ({ label: e.label && e.label !== e.kind ? `${KIND_NAMES[e.kind] ?? e.kind}: ${e.label}` : KIND_NAMES[e.kind] ?? e.kind, value: e.count }))}
                empty="Nadie ha tocado botones o enlaces en este periodo."
              />
              <BarList
                title="De dónde llegan"
                rows={stats.channels.map((c) => ({ label: channelName(c.channel), value: c.visits }))}
                empty="Todavía no hay visitas en este periodo."
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <BarList
                title="Países"
                rows={stats.countries.map((c) => ({ label: `${flag(c.country)} ${countryName(c.country)}`, value: c.visits }))}
                empty="Sin datos de país todavía (se registran desde esta versión)."
              />
              <BarList
                title="Ciudades"
                rows={stats.cities.map((c) => ({ label: `${flag(c.country)} ${c.city}`, value: c.visits }))}
                empty="Sin datos de ciudad todavía."
              />
              <BarList
                title={stats.campaigns.length ? "Campañas" : "Idioma del navegador"}
                rows={stats.campaigns.length ? stats.campaigns.map((c) => ({ label: c.campaign, value: c.visits })) : stats.langs.map((l) => ({ label: LANG_NAMES[l.lang] ?? l.lang.toUpperCase(), value: l.visits }))}
                empty="Sin datos."
              />
            </div>

            {path && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="font-semibold text-[#0F2B4C]">Enlaces marcados</h2>
                <p className="text-xs text-gray-500 mt-0.5 mb-2">
                  WhatsApp casi nunca dice de dónde viene la visita. Comparte el enlace marcado de cada lugar y aquí sabrás exactamente por dónde entró cada persona.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SHARE_SOURCES.map((s) => (
                    <button key={s.src} onClick={() => copySourceLink(s.src)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-300 text-xs font-semibold text-[#0F2B4C] hover:bg-gray-50">
                      <Copy size={12} /> {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(!path || isTour) && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="font-semibold text-[#0F2B4C] mb-3">Tours 360</h2>
                {stats.tours.length === 0 ? (
                  <p className="text-xs text-gray-400">No hay tours publicados.</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {stats.tours.map((t) => (
                      <div key={t.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <button onClick={() => setPath(`/tour/${t.slug}`)} className="font-semibold text-[#0F2B4C] hover:text-[#b8761a]" title="Ver el detalle de este tour">
                            {t.title}
                          </button>
                          <span className="text-xs text-gray-500"><b className="text-[#0F2B4C]">{fmt(t.visits)}</b> {t.visits === 1 ? "visita" : "visitas"}</span>
                          <span className="text-xs text-gray-500"><b className="text-[#0F2B4C]">{fmt(t.visitors)}</b> {t.visitors === 1 ? "visitante" : "visitantes"}</span>
                          <span className="text-xs text-gray-500"><b className="text-[#0F2B4C]">{fmt(t.photo_views)}</b> fotos vistas</span>
                          {t.avg_duration != null && <span className="text-xs text-gray-500"><b className="text-[#0F2B4C]">{fmtDuration(t.avg_duration)}</b> promedio</span>}
                          {t.contacts > 0 && <span className="text-xs text-emerald-700"><b>{fmt(t.contacts)}</b> {t.contacts === 1 ? "contacto" : "contactos"}</span>}
                        </div>
                        {t.scenes.length > 0 && (
                          <p className="mt-1 text-xs text-gray-500">
                            <Rotate3d size={12} className="inline mr-1" />
                            Fotos más vistas: {t.scenes.map((s) => `${s.title} (${fmt(s.views)})`).join(" · ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!path && (
              <BarList
                title="Páginas más vistas"
                rows={stats.top_pages.map((p) => ({ label: pageName(p.path), value: p.visits }))}
                empty="Todavía no hay visitas en este periodo."
              />
            )}

            <RecentTable rows={stats.recent} showPath={!path} showPhotos={!path || isTour} />
          </>
        )}
      </div>
    </div>
  );
}
