import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, ChevronDown, ChevronUp, Hand, Info, Link2, Music, Rotate3d, VolumeX, X, Instagram } from "lucide-react";
import { cn } from "@/lib/utils";
import { LangProvider, useLang } from "@/lib/LangContext";
import { useSeo } from "@/lib/useSeo";
import { WhatsAppIcon } from "@/components/cana/WhatsAppIcon";
import { descriptionIn, fetchTourBySlug, isPhoneWidth, markToursSeen, mediaUrl, viewerImage, normalizeWhatsapp, instagramUser, instagramLink, startScene, tourUrl, whatsappLink, type FullTour } from "@/lib/tours";
import { BrandLogo } from "@/components/tours/BrandLogo";
import { recordSceneView, startPageVisit } from "@/lib/visits";
import { AmbientMusic } from "@/components/tours/ambientMusic";
import { LOADER_IMG } from "@/components/tours/markerHtml";
import "@/components/tours/tours.css";

// Recorrido 360 público a pantalla completa: canaescapes.com/tour/:slug
// El visor (three.js) se descarga solo aquí.
// El código del visor se empieza a descargar a la vez que los datos del tour (no después)
const loadViewer = () => import("@/components/tours/TourViewer");
const TourViewer = lazy(loadViewer);

const MUSIC_KEY = "ce-tour-music";
const HINT_KEY = "ce-tour-hint";

// Primera visita: una mano que se desliza indica que la foto se mueve. Se quita al primer toque o a los 7 s
// y no vuelve a salir en ese navegador.
function FirstVisitHint({ text }: { text: string }) {
  const [show, setShow] = useState(() => {
    try { return !localStorage.getItem(HINT_KEY); } catch { return false; }
  });
  useEffect(() => {
    if (!show) return;
    const hide = () => {
      setShow(false);
      try { localStorage.setItem(HINT_KEY, "seen"); } catch { /* sin almacenamiento */ }
    };
    const timer = setTimeout(hide, 7000);
    window.addEventListener("pointerdown", hide, { once: true });
    window.addEventListener("wheel", hide, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", hide);
      window.removeEventListener("wheel", hide);
    };
  }, [show]);
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
      <div className="ce-hint flex flex-col items-center gap-3 px-6 py-5 rounded-2xl bg-black/50 backdrop-blur-sm text-white">
        <Hand size={40} strokeWidth={1.6} className="ce-hint-hand" />
        <p className="text-sm font-semibold">{text}</p>
      </div>
    </div>
  );
}

// Misma pantalla de carga que el visor: círculo de Tours 360 con el ícono girando
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
  const [showInfo, setShowInfo] = useState(false);
  // Teléfono: la tira de fotos y los botones de arriba empiezan ocultos para ver más imagen
  const [stripOpen, setStripOpen] = useState(false);
  const [stripLift, setStripLift] = useState(0); // px que ocupa la tira de fotos abierta
  const [controlsOpen, setControlsOpen] = useState(() => !isPhoneWidth());
  const music = useRef<AmbientMusic | null>(null);
  const [musicOn, setMusicOn] = useState(false);
  const fullRef = useRef(full);
  fullRef.current = full;

  useEffect(() => {
    loadViewer();
    fetchTourBySlug(slug)
      .then((f) => {
        // La primera foto se pide ya, mientras se prepara el visor
        const first = f && startScene(f);
        if (first) new Image().src = mediaUrl(viewerImage(first));
        setFull(f);
      })
      .catch(() => setFull(null));
  }, [slug]);

  useEffect(() => () => music.current?.stop(), []);

  // Visita al tour (una vez); cada foto que se mira se registra aparte en onSceneView
  const tourId = full?.tour.id;
  useEffect(() => {
    if (!tourId) return;
    startPageVisit(`/tour/${slug}`, { tourId });
    markToursSeen();
  }, [tourId, slug]);

  function toggleMusic() {
    if (musicOn) {
      music.current?.stop();
      setMusicOn(false);
      try { localStorage.setItem(MUSIC_KEY, "off"); } catch { /* sin almacenamiento */ }
      return;
    }
    music.current ??= new AmbientMusic(full?.tour.music_style);
    music.current.start().catch(() => setMusicOn(false));
    setMusicOn(true);
    try { localStorage.setItem(MUSIC_KEY, "on"); } catch { /* sin almacenamiento */ }
  }

  // Si la persona dejó la música encendida la vez anterior, suena al primer toque en la pantalla
  // (los navegadores no dejan reproducir sonido sin un toque)
  useEffect(() => {
    let wanted = false;
    try { wanted = localStorage.getItem(MUSIC_KEY) === "on"; } catch { /* sin almacenamiento */ }
    if (!wanted) return;
    const onFirst = () => {
      if (music.current?.playing) return;
      music.current ??= new AmbientMusic(fullRef.current?.tour.music_style);
      music.current.start().then(() => setMusicOn(true)).catch(() => undefined);
    };
    window.addEventListener("pointerdown", onFirst, { once: true });
    return () => window.removeEventListener("pointerdown", onFirst);
  }, []);

  useSeo({
    title: full ? `${full.tour.title} — Tour 360` : "Tour 360 · Punta Cana",
    description: (full && descriptionIn(full.tour, lang)) || t("tours_seo_desc"),
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
  // Con WhatsApp del propietario, el botón le escribe a él; si no, sirve para compartir el tour
  const ownerWa = normalizeWhatsapp(full.tour.whatsapp);
  const waHref = ownerWa
    ? whatsappLink(ownerWa, `${t("tours_wa_owner")} ${full.tour.title}: ${url}`)
    : `https://wa.me/?text=${encodeURIComponent(`${full.tour.title} — ${t("tours_wa_text")} ${url}`)}`;
  const waLabel = ownerWa ? t("tours_contact") : t("tours_share_wa");
  const ownerIg = instagramUser(full.tour.instagram);
  const langButton = (
    <button
      onClick={() => setLang(lang === "es" ? "en" : "es")}
      aria-label={lang === "es" ? "View in English" : "Ver en español"}
      title={lang === "es" ? "View in English" : "Ver en español"}
      className="h-9 px-2.5 rounded-full bg-black/40 text-white text-xs font-semibold uppercase hover:bg-black/60"
    >
      {lang === "es" ? "EN" : "ES"}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle,#173a63_0%,#0b1f38_75%)]">
            <Tours360Loader text={t("tours_loading")} />
          </div>
        }
      >
        <TourViewer
          full={full}
          loadingText={t("tours_loading")}
          startLabel={t("tours_start_view")}
          gyroLabel={t("tours_gyro")}
          stripLabels={{ hide: t("tours_hide_photos"), show: t("tours_show_photos") }}
          onStripToggle={setStripOpen}
          onStripLift={setStripLift}
          onSceneView={(sceneId) => recordSceneView(`/tour/${slug}`, full.tour.id, sceneId)}
          lang={lang}
        />
      </Suspense>

      {/* Logo + título */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between gap-3 p-3 sm:p-4 pointer-events-none bg-gradient-to-b from-black/55 to-transparent">
        <div className="flex items-center gap-3 min-w-0 pointer-events-auto">
          {/* Distintivo Tours 360: lleva a la página del servicio */}
          <Link to="/tours" aria-label="Tours 360°" title="Tours 360°" className="shrink-0">
            <span className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0F2B4C] border-[3px] border-[#F0A030] shadow-lg">
              <Rotate3d size={24} className="text-[#F0A030]" strokeWidth={1.8} />
            </span>
          </Link>
          <div className="min-w-0 text-white drop-shadow">
            <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#F0A030] leading-none mb-1">Tours 360°</p>
            {/* Nombre completo (hasta 2 líneas): en el teléfono los botones van en columna a la derecha */}
            <h1 className="font-serif font-bold text-[15px] sm:text-xl leading-tight line-clamp-2 break-words">{full.tour.title}</h1>
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
        <div className="flex flex-col items-end gap-2 shrink-0 pointer-events-auto">
          {/* Teléfono: el idioma queda siempre a la vista, junto a la flecha que muestra / oculta los demás botones */}
          <div className="flex items-center gap-2 sm:hidden">
            {langButton}
            <button
              onClick={() => setControlsOpen((v) => !v)}
              aria-label={controlsOpen ? t("tours_hide_buttons") : t("tours_show_buttons")}
              aria-expanded={controlsOpen}
              title={controlsOpen ? t("tours_hide_buttons") : t("tours_show_buttons")}
              className="h-9 w-9 rounded-full bg-black/40 text-white flex items-center justify-center"
            >
              {controlsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
          <div className={cn("flex-col sm:flex-row items-end sm:items-center gap-2", controlsOpen ? "flex" : "hidden sm:flex")}>
          <span className="hidden sm:contents">{langButton}</span>
          <button
            onClick={toggleMusic}
            aria-label={musicOn ? t("tours_music_off") : t("tours_music_on")}
            title={musicOn ? t("tours_music_off") : t("tours_music_on")}
            aria-pressed={musicOn}
            className={`h-9 w-9 rounded-full flex items-center justify-center ${musicOn ? "bg-[#F0A030] text-[#0F2B4C] hover:brightness-110" : "bg-black/40 text-white hover:bg-black/60"}`}
          >
            {musicOn ? <Music size={16} /> : <VolumeX size={16} />}
          </button>
          {descriptionIn(full.tour, lang) && (
            <button
              onClick={() => setShowInfo((v) => !v)}
              aria-label={t("tours_info")}
              title={t("tours_info")}
              className="h-9 w-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60"
            >
              <Info size={16} />
            </button>
          )}
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
            className={cn("h-9 w-9 rounded-full flex items-center justify-center transition-colors", copied ? "bg-[#F0A030] text-[#0F2B4C]" : "bg-black/40 text-white hover:bg-black/60")}
          >
            {copied ? <Check size={16} /> : <Link2 size={16} />}
          </button>
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            aria-label={waLabel}
            title={waLabel}
            className="h-9 w-9 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:brightness-110"
          >
            <WhatsAppIcon size={17} />
          </a>
          {ownerIg && (
            <a
              href={instagramLink(ownerIg)}
              target="_blank"
              rel="noreferrer"
              aria-label={t("tours_instagram")}
              title={`${t("tours_instagram")}: @${ownerIg}`}
              className="h-9 w-9 rounded-full text-white flex items-center justify-center hover:brightness-110 bg-[linear-gradient(45deg,#F58529,#DD2A7B,#8134AF)]"
            >
              <Instagram size={17} />
            </a>
          )}
          </div>
        </div>
      </div>
      <BrandLogo tour={full.tour} stripHidden={!stripOpen} lift={stripOpen ? stripLift : 0} />
      <FirstVisitHint text={window.matchMedia("(pointer: coarse)").matches ? t("tours_hint_touch") : t("tours_hint_mouse")} />

      {showInfo && (
        <div className="absolute top-24 right-14 left-3 sm:right-3 sm:left-auto sm:w-96 z-20 rounded-2xl bg-white/95 backdrop-blur p-4 pr-10 shadow-2xl text-sm text-gray-700">
          <button onClick={() => setShowInfo(false)} className="absolute top-2 right-2 w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center" aria-label="Cerrar">
            <X size={15} />
          </button>
          <h2 className="font-serif font-bold text-[#0F2B4C] mb-1">{full.tour.title}</h2>
          <p className="whitespace-pre-line">{descriptionIn(full.tour, lang)}</p>
        </div>
      )}
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
