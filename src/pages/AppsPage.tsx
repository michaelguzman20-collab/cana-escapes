import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Smartphone, ChevronDown, ShieldCheck, Sparkles, CheckCircle2, RefreshCw, BookOpen, UserX } from "lucide-react";
import { APP_GUIDES } from "@/content/appGuides";
import { LangProvider, useLang } from "@/lib/LangContext";
import { useSeo } from "@/lib/useSeo";
import { LandingNavbar } from "@/components/cana/LandingNavbar";
import { LandingFooter } from "@/components/cana/LandingFooter";
import type { Database } from "@/types/database";

type Release = Database["public"]["Tables"]["app_releases"]["Row"];

// Catálogo de apps. Las versiones (APK, fecha, novedades) viven en la tabla
// `app_releases` de Supabase; aquí solo va la ficha de cada app.
const APPS = [
  {
    slug: "cana-scanner",
    name: "Cana Scanner",
    icon: "/apps/cana-scanner.png",
    desc: {
      es: "Convierte la cámara de tu teléfono en un escáner. Detecta los bordes del documento, lo recorta y endereza, y genera un PDF listo para compartir por WhatsApp, correo o Drive.",
      en: "Turn your phone camera into a scanner. It detects the document edges, crops and straightens it, and creates a PDF ready to share via WhatsApp, email or Drive.",
    },
    features: {
      es: ["Detección automática de bordes", "Varias páginas en un solo PDF", "Filtros para mejorar la lectura", "Comparte al instante"],
      en: ["Automatic edge detection", "Multiple pages in one PDF", "Filters for sharper text", "Share instantly"],
    },
  },
  {
    slug: "cana-track",
    name: "Cana Track",
    icon: "/apps/cana-track.png",
    desc: {
      es: "Comparte tu ubicación en tiempo real con tu equipo. Ideal para transporte, mensajería en moto y negocios con personal en la calle. Entras solo con tu nombre y WhatsApp.",
      en: "Share your real-time location with your team. Great for transport, motorbike delivery and businesses with staff on the move. Join with just your name and WhatsApp.",
    },
    features: {
      es: ["Entrada rápida con nombre y WhatsApp", "Elige tu vehículo: moto, carro, minivan…", "Un toque para compartir o dejar de compartir", "Aviso para escribir por WhatsApp"],
      en: ["Quick join with name and WhatsApp", "Pick your vehicle: motorbike, car, minivan…", "One tap to start or stop sharing", "Ping to reply on WhatsApp"],
    },
  },
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Las versiones son públicas: se leen con la llave anónima directamente, sin pasar por la
// sesión del cliente de Supabase. Una sesión vieja guardada en el teléfono (p. ej. de /admin)
// puede dejar colgado el refresco del token y la página se quedaba cargando para siempre.
async function fetchReleases(): Promise<Release[]> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/app_releases?select=*&order=version_code.desc`,
      {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        cache: "no-store",
        signal: ctrl.signal,
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as Release[];
  } finally {
    window.clearTimeout(timer);
  }
}

function formatDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang === "es" ? "es-DO" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatSize(bytes: number | null) {
  if (!bytes) return null;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function AppCard({ app, releases }: { app: (typeof APPS)[number]; releases: Release[] }) {
  const { lang, t } = useLang();
  const [showHistory, setShowHistory] = useState(false);
  const l = lang === "es" ? "es" : "en";
  const latest = releases[0];
  const older = releases.slice(1);

  return (
    <article id={app.slug} className="scroll-mt-24 bg-white rounded-3xl border border-[#0F2B4C]/10 shadow-xl shadow-[#0F2B4C]/5 overflow-hidden">
      <div className="p-6 sm:p-8">
        <div className="flex items-start gap-5">
          <img src={app.icon} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shadow-md flex-shrink-0" />
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F2B4C]">{app.name}</h2>
            {latest ? (
              <p className="mt-1 text-sm text-[#0F2B4C]/60">
                {t("apps_version")} <span className="font-semibold text-[#0F2B4C]">{latest.version_name}</span>
                {" · "}
                {t("apps_updated")} {formatDate(latest.published_at, l)}
                {formatSize(latest.apk_size) && ` · ${formatSize(latest.apk_size)}`}
              </p>
            ) : (
              <span className="inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full bg-[#F0A030]/15 text-[#b8761a]">
                {t("apps_coming")}
              </span>
            )}
          </div>
        </div>

        <p className="mt-5 text-[#0F2B4C]/75 leading-relaxed">{app.desc[l]}</p>

        <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {app.features[l].map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-[#0F2B4C]/80">
              <CheckCircle2 size={16} className="text-[#F0A030] flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        {latest?.release_notes && (
          <div className="mt-6 rounded-2xl bg-[#F5F7FA] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0F2B4C]">
              <Sparkles size={15} className="text-[#F0A030]" />
              {t("apps_whats_new")} — v{latest.version_name}
            </div>
            <p className="mt-2 text-sm text-[#0F2B4C]/70 whitespace-pre-line">{latest.release_notes}</p>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
          {latest ? (
            <a
              href={latest.apk_url}
              download
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 font-semibold text-[#0F2B4C] bg-[#F0A030] hover:bg-[#e5952a] rounded-xl transition-colors shadow-lg shadow-[#F0A030]/25"
            >
              <Download size={18} />
              {t("apps_download")} · v{latest.version_name}
            </a>
          ) : (
            <p className="text-sm text-[#0F2B4C]/60">{t("apps_no_release")}</p>
          )}
          {APP_GUIDES[app.slug] && (
            <Link
              to={`/apps/${app.slug}/guia`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 font-semibold text-[#0F2B4C] border border-[#0F2B4C]/20 hover:bg-[#0F2B4C]/5 rounded-xl transition-colors"
            >
              <BookOpen size={18} />
              {t("apps_guide")}
            </Link>
          )}
          <span className="inline-flex items-center gap-1.5 text-xs text-[#0F2B4C]/50">
            <Smartphone size={14} />
            {t("apps_android_only")}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link
            to={`/apps/${app.slug}/privacidad`}
            className="inline-flex items-center gap-1.5 text-[#0F2B4C]/60 hover:text-[#b8761a]"
          >
            <ShieldCheck size={15} />
            {l === "es" ? "Política de privacidad" : "Privacy policy"}
          </Link>
          {app.slug === "cana-track" && (
            <Link
              to="/apps/cana-track/borrar-cuenta"
              className="inline-flex items-center gap-1.5 text-[#0F2B4C]/60 hover:text-[#b8761a]"
            >
              <UserX size={15} />
              {l === "es" ? "Borrar mi cuenta" : "Delete my account"}
            </Link>
          )}
        </div>
      </div>

      {older.length > 0 && (
        <div className="border-t border-[#0F2B4C]/10">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="w-full flex items-center justify-between px-6 sm:px-8 py-4 text-sm font-semibold text-[#0F2B4C]/70 hover:text-[#0F2B4C]"
          >
            {t("apps_history")} ({older.length})
            <ChevronDown size={16} className={`transition-transform ${showHistory ? "rotate-180" : ""}`} />
          </button>
          {showHistory && (
            <ul className="px-6 sm:px-8 pb-5 space-y-3">
              {older.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-4 text-sm">
                  <div className="min-w-0">
                    <span className="font-semibold text-[#0F2B4C]">v{r.version_name}</span>
                    <span className="text-[#0F2B4C]/50"> · {formatDate(r.published_at, l)}</span>
                    {r.release_notes && (
                      <p className="text-[#0F2B4C]/60 whitespace-pre-line mt-0.5">{r.release_notes}</p>
                    )}
                  </div>
                  <a href={r.apk_url} download className="flex-shrink-0 text-[#b8761a] hover:text-[#0F2B4C] font-medium">
                    APK
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

function AppsContent() {
  const { t } = useLang();
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  function load() {
    setLoading(true);
    setFailed(false);
    fetchReleases()
      .then(setReleases)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    window.scrollTo(0, 0);
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <LandingNavbar />

      <section className="bg-[#0F2B4C] pt-32 pb-24 sm:pt-40 sm:pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#F0A030]/40 text-[#F0A030] text-xs font-semibold uppercase tracking-[0.18em]">
            <Smartphone size={14} />
            {t("apps_badge")}
          </span>
          <h1 className="mt-6 text-4xl sm:text-5xl font-serif font-bold text-white">{t("apps_title")}</h1>
          <p className="mt-5 text-lg text-white/70 leading-relaxed max-w-2xl mx-auto">{t("apps_desc")}</p>
        </div>
      </section>

      <section className="-mt-14 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
          {loading ? (
            <div className="h-72 rounded-3xl bg-white animate-pulse" />
          ) : failed ? (
            <div className="rounded-3xl bg-white border border-[#0F2B4C]/10 p-8 text-center">
              <p className="text-[#0F2B4C] font-semibold">{t("apps_load_error")}</p>
              <button
                onClick={load}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 font-semibold text-[#0F2B4C] bg-[#F0A030] hover:bg-[#e5952a] rounded-xl transition-colors"
              >
                <RefreshCw size={16} />
                {t("apps_retry")}
              </button>
            </div>
          ) : (
            APPS.map((app) => (
              <AppCard key={app.slug} app={app} releases={releases.filter((r) => r.app_slug === app.slug)} />
            ))
          )}
        </div>
      </section>

      <section className="pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="rounded-3xl bg-white border border-[#0F2B4C]/10 p-6 sm:p-8">
            <h2 className="text-xl font-serif font-bold text-[#0F2B4C]">{t("apps_install_title")}</h2>
            <ol className="mt-5 space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <li key={n} className="flex gap-3 text-[#0F2B4C]/75">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#0F2B4C] text-[#F0A030] text-sm font-bold flex items-center justify-center">
                    {n}
                  </span>
                  <span className="pt-0.5">{t(`apps_install_${n}`)}</span>
                </li>
              ))}
            </ol>
            <p className="mt-6 flex items-start gap-2 text-sm text-[#0F2B4C]/60">
              <ShieldCheck size={16} className="text-[#F0A030] flex-shrink-0 mt-0.5" />
              {t("apps_install_note")}
            </p>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

export function AppsPage() {
  useSeo({
    title: "Apps para Android — Cana Escapes",
    description:
      "Descarga gratis las apps de Cana Escapes para Android: Cana Scanner convierte tu cámara en un escáner de documentos a PDF y Cana Track comparte la ubicación de tu equipo en tiempo real.",
    path: "/apps",
  });

  return (
    <LangProvider>
      <AppsContent />
    </LangProvider>
  );
}
