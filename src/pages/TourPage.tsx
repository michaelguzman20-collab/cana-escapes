import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Link2, Rotate3d } from "lucide-react";
import { LangProvider, useLang } from "@/lib/LangContext";
import { useSeo } from "@/lib/useSeo";
import { WhatsAppIcon } from "@/components/cana/WhatsAppIcon";
import { fetchTourBySlug, tourUrl, type FullTour } from "@/lib/tours";
import { LOADER_IMG } from "@/components/tours/markerHtml";
import "@/components/tours/tours.css";

// Recorrido 360 público a pantalla completa: canaescapes.com/tour/:slug
// El visor (three.js) se descarga solo aquí.
const TourViewer = lazy(() => import("@/components/tours/TourViewer"));

// Misma pantalla de carga que el visor: círculo de Cana Escapes con el ícono 360 girando
function Tours360Loader({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="ce-loader">
        <img src={LOADER_IMG} alt="" className="ce-loader-icon" />
      </div>
      <p className="text-sm font-medium text-white/80">{text}</p>
    </div>
  );
}

function TourContent() {
  const { slug = "" } = useParams();
  const { t, lang, setLang } = useLang();
  const [full, setFull] = useState<FullTour | null | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchTourBySlug(slug)
      .then(setFull)
      .catch(() => setFull(null));
  }, [slug]);

  useSeo({
    title: full ? `${full.tour.title} — Tour 360 | Cana Escapes` : "Tour 360 | Cana Escapes",
    description: full?.tour.description || t("tours_seo_desc"),
    path: `/tour/${slug}`,
  });

  if (full === undefined) {
    return (
      <div className="fixed inset-0 bg-[radial-gradient(circle,#173a63_0%,#0b1f38_75%)] flex items-center justify-center">
        <Tours360Loader text={t("tours_loading")} />
      </div>
    );
  }
  if (!full || !full.scenes.length) {
    return (
      <div className="fixed inset-0 bg-[#0F2B4C] flex flex-col items-center justify-center gap-4 text-white px-6 text-center">
        <Rotate3d size={40} className="text-[#F0A030]" />
        <p className="text-lg font-semibold">{t("tours_not_found")}</p>
        <Link to="/tours" className="px-5 py-2.5 rounded-lg bg-[#F0A030] text-[#0F2B4C] font-semibold">{t("tours_see_all")}</Link>
      </div>
    );
  }

  const url = tourUrl(full.tour.slug);
  const waText = encodeURIComponent(`${full.tour.title} — ${t("tours_wa_text")} ${url}`);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle,#173a63_0%,#0b1f38_75%)]">
            <Tours360Loader text={t("tours_loading")} />
          </div>
        }
      >
        <TourViewer full={full} loadingText={t("tours_loading")} startLabel={t("tours_start_view")} />
      </Suspense>

      {/* Logo + título */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between gap-3 p-3 sm:p-4 pointer-events-none bg-gradient-to-b from-black/55 to-transparent">
        <div className="flex items-center gap-3 min-w-0 pointer-events-auto">
          {/* Distintivo Tours 360: promociona el servicio de recorridos 360 de Cana Escapes */}
          <Link to="/tours" aria-label="Cana Escapes Tours 360" title="Cana Escapes · Tours 360°" className="shrink-0">
            <span className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0F2B4C] border-[3px] border-[#F0A030] shadow-lg">
              <Rotate3d size={24} className="text-[#F0A030]" strokeWidth={1.8} />
            </span>
          </Link>
          <div className="min-w-0 text-white drop-shadow">
            <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#F0A030] leading-none mb-1">
              <span className="font-serif italic normal-case tracking-normal font-semibold text-white">Cana Escapes</span> · Tours 360°
            </p>
            <h1 className="font-serif font-bold text-base sm:text-xl leading-tight truncate">{full.tour.title}</h1>
            {(full.tour.location || full.tour.bedrooms != null) && (
              <p className="text-[11px] sm:text-xs text-white/80 truncate">
                {[full.tour.location, full.tour.bedrooms != null ? `${full.tour.bedrooms} ${t("tours_bedrooms")}` : null, full.tour.bathrooms != null ? `${full.tour.bathrooms} ${t("tours_bathrooms")}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {!full.tour.published && <span className="inline-block mt-1 text-[10px] font-bold uppercase bg-amber-400 text-black px-2 rounded">{t("tours_draft")}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
          <button
            onClick={() => setLang(lang === "es" ? "en" : "es")}
            className="h-9 px-2.5 rounded-full bg-black/40 text-white text-xs font-semibold uppercase hover:bg-black/60"
          >
            {lang === "es" ? "EN" : "ES"}
          </button>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              } catch {
                /* sin portapapeles */
              }
            }}
            aria-label={t("tours_copy")}
            title={t("tours_copy")}
            className="h-9 px-3 rounded-full bg-black/40 text-white flex items-center gap-1.5 text-xs font-semibold hover:bg-black/60"
          >
            <Link2 size={15} /> <span className="hidden sm:inline">{copied ? t("tours_copied") : t("tours_copy")}</span>
          </button>
          <a
            href={`https://wa.me/?text=${waText}`}
            target="_blank"
            rel="noreferrer"
            aria-label={t("tours_share_wa")}
            className="h-9 px-3 rounded-full bg-[#25D366] text-white flex items-center gap-1.5 text-xs font-semibold hover:brightness-110"
          >
            <WhatsAppIcon size={16} /> <span className="hidden sm:inline">{t("tours_share_wa")}</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export function TourPage() {
  return (
    <LangProvider>
      <TourContent />
    </LangProvider>
  );
}
