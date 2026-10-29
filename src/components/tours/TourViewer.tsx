import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Crosshair, GalleryHorizontal, Smartphone, X } from "lucide-react";
import { Viewer } from "@photo-sphere-viewer/core";
import { MarkersPlugin, type MarkerConfig } from "@photo-sphere-viewer/markers-plugin";
import { VirtualTourPlugin, type VirtualTourNode } from "@photo-sphere-viewer/virtual-tour-plugin";
import { AutorotatePlugin } from "@photo-sphere-viewer/autorotate-plugin";
import { GyroscopePlugin } from "@photo-sphere-viewer/gyroscope-plugin";
import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/markers-plugin/index.css";
import "@photo-sphere-viewer/virtual-tour-plugin/index.css";
import "./tours.css";
import { LOADER_IMG, nadirLogoUrl, nadirMarker } from "./markerHtml";
import { addonElement, addonMarker } from "./tourAddons";
import { PanoThumb } from "./PanoThumb";
import { limitTexturesOnPhones, PSV_LANG_EN, PSV_LANG_ES } from "./viewerSetup";
import {
  addonsForScene, areaIn, clampPitch, isPhoneWidth, mediaRetryUrl, mediaUrl, sphereCorrection, startScene, zoomLevelFor, type FullTour, type TourHotspot, type TourScene,
} from "@/lib/tours";
import { cn } from "@/lib/utils";

// Visor público del tour 360 (Photo Sphere Viewer + virtual tour para cambiar de foto con transición).
// Se carga con lazy() porque three.js pesa: solo se descarga al abrir /tour/:slug.
// Los addons (íconos, textos, imágenes) son marcadores; al tocarlos ejecutan su acción.

interface Props {
  full: FullTour;
  loadingText?: string;
  /** Texto del botón para volver a la vista inicial de la foto */
  startLabel?: string;
  /** Idioma del botón ES/EN: cambia el nombre de las áreas y los botones del visor */
  lang?: string;
  /** Texto del botón del giroscopio (mover la vista girando el teléfono) */
  gyroLabel?: string;
  /** Textos de los botones para ocultar / mostrar la tira de fotos (teléfono) */
  stripLabels?: { hide: string; show: string };
  /** Avisa cuando la tira de fotos se oculta o se muestra (para recolocar el logo) */
  onStripToggle?(open: boolean): void;
  /** Avisa cada vez que se muestra una foto (para contar qué fotos se miran) */
  onSceneView?(sceneId: string): void;
}

// Pie de foto: solo el área (Sala, Cocina…); el nombre del tour ya está arriba
const captionOf = (s: TourScene, lang: string) => areaIn(s, lang) || s.title;

const levelOf = (s: TourScene) => zoomLevelFor(s.fov_initial, s.fov_min, s.fov_max);

function youtubeId(url: string) {
  return url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)?.[1] ?? null;
}

function Card({ addon, onClose }: { addon: TourHotspot; onClose(): void }) {
  const url = addon.url?.trim() || "";
  const yt = url ? youtubeId(url) : null;
  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url);
  const isImage = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url);
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center" aria-label="Cerrar">
          <X size={16} />
        </button>
        {yt && (
          <div className="aspect-video bg-black">
            <iframe src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1`} className="w-full h-full" allow="autoplay; encrypted-media; fullscreen" allowFullScreen title={addon.title ?? "Video"} />
          </div>
        )}
        {isVideo && <video src={url} controls autoPlay playsInline className="w-full bg-black" />}
        {isImage && <img src={url} alt={addon.title ?? ""} className="w-full" />}
        {(addon.title || addon.text) && (
          <div className="p-5">
            {addon.title && <h2 className="font-serif font-bold text-lg text-[#0F2B4C] pr-8">{addon.title}</h2>}
            {addon.text && <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">{addon.text}</p>}
            {url && !yt && !isVideo && !isImage && (
              <a href={url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-[#b8761a] hover:underline">{url}</a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TourViewer({ full, loadingText, startLabel, lang = "es", gyroLabel, stripLabels, onStripToggle, onSceneView }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tourRef = useRef<VirtualTourPlugin | null>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const goRef = useRef<(id: string) => void>(() => undefined);
  // Vuelve a crear los marcadores con los nombres de las áreas en otro idioma
  const relabelRef = useRef<(lng: string) => void>(() => undefined);
  const langRef = useRef(lang);
  langRef.current = lang;
  const onSceneViewRef = useRef(onSceneView); // el visor se crea una sola vez
  onSceneViewRef.current = onSceneView;
  const first = startScene(full);
  const [current, setCurrent] = useState(first?.id ?? "");
  const [card, setCard] = useState<TourHotspot | null>(null);
  // Giroscopio: el botón solo aparece en teléfonos/tabletas que lo tienen
  const gyroRef = useRef<GyroscopePlugin | null>(null);
  const [gyroSupported, setGyroSupported] = useState(false);
  const [gyroOn, setGyroOn] = useState(false);
  // En el teléfono la tira de fotos empieza oculta para ver más imagen (en computadora siempre se ve)
  const [stripOpen, setStripOpen] = useState(() => !isPhoneWidth());
  const hasStrip = full.scenes.length > 1;
  const toggleStrip = (open: boolean) => {
    setStripOpen(open);
    onStripToggle?.(open);
  };

  useEffect(() => {
    if (!containerRef.current || !first) return;
    const sceneById = new Map(full.scenes.map((s) => [s.id, s]));
    const addonById = new Map(full.hotspots.map((h) => [h.id, h]));

    // Marcadores de una escena; los que llevan a otra foto muestran el nombre del área en el idioma dado
    const sceneMarkers = (s: TourScene, logo: string | null, lng: string) => {
      const markers: MarkerConfig[] = addonsForScene(full.hotspots, s.id)
        .filter((h) => h.action !== "scene" || (h.target_scene_id && sceneById.has(h.target_scene_id)))
        .map((h) => {
          const target = h.action === "scene" ? sceneById.get(h.target_scene_id!) : undefined;
          return addonMarker(h, addonElement(h, { label: target ? areaIn(target, lng) || target.title : undefined }));
        });
      if (logo && full.tour.nadir_logo) markers.push(nadirMarker(logo, full.tour.nadir_size, full.tour.nadir_opacity));
      return markers as VirtualTourNode["markers"];
    };

    const buildNodes = (logo: string | null): VirtualTourNode[] =>
      full.scenes.map((s) => ({
        id: s.id,
        panorama: mediaUrl(s.image_url),
        name: s.title,
        caption: captionOf(s, langRef.current),
        thumbnail: mediaUrl(s.thumb_url) ?? undefined,
        sphereCorrection: sphereCorrection(s),
        links: [],
        markers: sceneMarkers(s, logo, langRef.current),
      }));

    // Se crea en el siguiente tick: en desarrollo React monta→desmonta→monta y destruir un visor
    // mientras carga deja la foto "Cargando…" para siempre en el segundo.
    let created: Viewer | null = null;
    let cancelled = false;
    let currentScene: TourScene = first;
    // Zoom y límites propios de cada escena
    const applySceneLimits = (s: TourScene) => {
      currentScene = s;
      created?.setOptions({ minFov: Math.min(s.fov_min, s.fov_max), maxFov: Math.max(s.fov_min, s.fov_max) });
    };
    // Precarga (caché del navegador) de las fotos a las que se puede ir desde la escena actual
    const preload = (s: TourScene) => {
      addonsForScene(full.hotspots, s.id).forEach((h) => {
        const t = h.action === "scene" && h.target_scene_id ? sceneById.get(h.target_scene_id) : null;
        if (t) new Image().src = mediaUrl(t.image_url);
      });
    };

    const timer = setTimeout(async () => {
      const logo = full.tour.nadir_logo ? await nadirLogoUrl() : null;
      if (cancelled) return;
      limitTexturesOnPhones();
      const viewer = (created = new Viewer({
        container: containerRef.current!,
        defaultYaw: first.initial_yaw,
        defaultPitch: first.initial_pitch,
        minFov: Math.min(first.fov_min, first.fov_max),
        maxFov: Math.max(first.fov_min, first.fov_max),
        defaultZoomLvl: levelOf(first),
        loadingImg: LOADER_IMG,
        loadingTxt: loadingText ?? "Cargando…",
        lang: langRef.current === "en" ? PSV_LANG_EN : PSV_LANG_ES,
        touchmoveTwoFingers: false,
        mousewheelCtrlKey: false,
        navbar: ["autorotate", "zoom", "caption", "fullscreen"], // el giroscopio tiene su botón propio
        plugins: [
          MarkersPlugin,
          GyroscopePlugin,
          [AutorotatePlugin, { autostartDelay: full.tour.autorotate ? 8000 : null, autostartOnIdle: full.tour.autorotate, autorotatePitch: 0, autorotateSpeed: "1.2rpm" }],
          [
            VirtualTourPlugin,
            {
              positionMode: "manual",
              renderMode: "2d",
              nodes: buildNodes(logo),
              startNodeId: first.id,
              preload: false,
              // Al llegar a una escena se mira hacia su "vista inicial" con su zoom
              transitionOptions: (toNode: VirtualTourNode) => {
                const s = sceneById.get(toNode.id);
                if (s) applySceneLimits(s);
                return {
                  showLoader: true,
                  effect: "fade",
                  speed: 1500,
                  rotation: false,
                  rotateTo: s ? { yaw: s.initial_yaw, pitch: s.initial_pitch } : undefined,
                  zoomTo: s ? levelOf(s) : undefined,
                };
              },
            },
          ],
        ],
      }));
      const tour = viewer.getPlugin(VirtualTourPlugin) as VirtualTourPlugin;
      tourRef.current = tour;
      relabelRef.current = (lng) => full.scenes.forEach((s) => tour.updateNode({ id: s.id, markers: sceneMarkers(s, logo, lng) }));
      viewerRef.current = viewer;
      tour.addEventListener("node-changed", ({ node }) => {
        setCurrent(node.id);
        onSceneViewRef.current?.(node.id);
        const s = sceneById.get(node.id);
        if (s) {
          preload(s);
          viewer.setOption("caption", captionOf(s, langRef.current));
        }
      });
      // Si una foto falla (red del teléfono, almacenamiento lento) se reintenta sola 2 veces, con una
      // URL nueva: si Vercel o el navegador guardaron un error de R2, la misma URL lo seguiría devolviendo.
      let wanted = first.id;
      const fails = new Map<string, number>();
      goRef.current = (id) => {
        wanted = id;
        tour.setCurrentNode(id).catch(() => undefined);
      };
      viewer.addEventListener("panorama-error", () => {
        const id = wanted;
        const n = (fails.get(id) ?? 0) + 1;
        fails.set(id, n);
        if (n > 2) return;
        setTimeout(() => {
          if (cancelled || wanted !== id) return;
          const s = sceneById.get(id);
          if (s) {
            tour.updateNode({ id, panorama: mediaRetryUrl(s.image_url) }); // si es la escena actual, la recarga
            if (tour.getCurrentNode()?.id === id) return;
          }
          tour.setCurrentNode(id, { forceUpdate: true }).catch(() => undefined);
        }, 1200 * n);
      });
      preload(first);
      const gyro = viewer.getPlugin(GyroscopePlugin) as GyroscopePlugin;
      gyroRef.current = gyro;
      gyro.isSupported().then((ok) => !cancelled && setGyroSupported(ok));
      gyro.addEventListener("gyroscope-updated", ({ gyroscopeEnabled }) => setGyroOn(gyroscopeEnabled));
      // Límite vertical de la escena actual
      viewer.addEventListener("before-rotate", (e) => {
        e.position.pitch = clampPitch(e.position.pitch, currentScene.pitch_limit);
      });
      // Acción de cada addon al tocarlo
      const markers = viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
      markers.addEventListener("select-marker", ({ marker }) => {
        const h = addonById.get(marker.id);
        if (!h) return;
        if (h.action === "scene" && h.target_scene_id) goRef.current(h.target_scene_id);
        else if (h.action === "card") setCard(h);
        else if (h.action === "url" && h.url) window.open(h.url, "_blank", "noopener");
      });
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      tourRef.current = null;
      relabelRef.current = () => undefined;
      viewerRef.current = null;
      gyroRef.current = null;
      goRef.current = () => undefined;
      (created as Viewer | null)?.destroy();
    };
    // El tour no cambia mientras la página está abierta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cambio de idioma: botones del visor y nombre de la foto actual
  useEffect(() => {
    const v = viewerRef.current;
    const s = full.scenes.find((x) => x.id === current);
    if (!v) return;
    v.setOption("lang", lang === "en" ? PSV_LANG_EN : PSV_LANG_ES);
    if (s) v.setOption("caption", captionOf(s, lang));
    relabelRef.current(lang);
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" />
      {card && <Card addon={card} onClose={() => setCard(null)} />}
      <div className={cn("absolute left-3 z-10 flex items-center gap-2", hasStrip && stripOpen ? "bottom-[8.5rem]" : "bottom-14 sm:bottom-[8.5rem]")}>
        <button
          onClick={() => {
            const s = full.scenes.find((x) => x.id === current);
            if (gyroRef.current?.isEnabled()) gyroRef.current.stop();
            if (s) viewerRef.current?.animate({ yaw: s.initial_yaw, pitch: s.initial_pitch, zoom: levelOf(s), speed: "4rpm" });
          }}
          className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-black/45 backdrop-blur-sm text-white text-xs font-semibold hover:bg-black/65"
          title={startLabel ?? "Punto de inicio"}
        >
          <Crosshair size={15} /> <span className="hidden sm:inline">{startLabel ?? "Punto de inicio"}</span>
        </button>
        {/* Giroscopio: al activarlo, la vista se mueve girando el teléfono (en iPhone pide permiso) */}
        {gyroSupported && (
          <button
            onClick={() => {
              const g = gyroRef.current;
              if (!g) return;
              if (g.isEnabled()) g.stop();
              else g.start().catch(() => setGyroOn(false));
            }}
            aria-pressed={gyroOn}
            aria-label={gyroLabel ?? "Mover con el teléfono"}
            title={gyroLabel ?? "Mover con el teléfono"}
            className={cn(
              "flex items-center justify-center h-9 w-9 rounded-full backdrop-blur-sm",
              gyroOn ? "bg-[#F0A030] text-[#0F2B4C]" : "bg-black/45 text-white hover:bg-black/65"
            )}
          >
            <Smartphone size={16} className={cn(gyroOn && "animate-pulse")} />
          </button>
        )}
      </div>
      {hasStrip && !stripOpen && (
        <button
          onClick={() => toggleStrip(true)}
          aria-label={stripLabels?.show ?? "Ver fotos"}
          className="sm:hidden absolute left-1/2 -translate-x-1/2 bottom-14 z-10 flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-black/45 backdrop-blur-sm text-white text-xs font-semibold"
        >
          <GalleryHorizontal size={15} /> {stripLabels?.show ?? "Ver fotos"} <ChevronUp size={15} />
        </button>
      )}
      {hasStrip && (
        <div className={cn("absolute left-0 right-0 bottom-12 z-10 flex-col items-center px-3 pointer-events-none", stripOpen ? "flex" : "hidden sm:flex")}>
          {/* Pestaña para ocultar la tira (solo teléfono) */}
          <button
            onClick={() => toggleStrip(false)}
            aria-label={stripLabels?.hide ?? "Ocultar fotos"}
            title={stripLabels?.hide ?? "Ocultar fotos"}
            className="sm:hidden pointer-events-auto flex items-center justify-center w-12 h-5 rounded-t-lg bg-black/35 backdrop-blur-sm text-white/90"
          >
            <ChevronDown size={16} />
          </button>
          <div className="flex gap-2 overflow-x-auto max-w-full p-1.5 rounded-xl bg-black/35 backdrop-blur-sm pointer-events-auto" style={{ scrollbarWidth: "none" }}>
            {full.scenes.map((s) => (
              <button
                key={s.id}
                onClick={() => s.id !== current && goRef.current(s.id)}
                className={cn(
                  "shrink-0 w-16 sm:w-20 rounded-lg overflow-hidden border-2 text-left transition-colors",
                  s.id === current ? "border-[#F0A030]" : "border-transparent opacity-80 hover:opacity-100"
                )}
              >
                <PanoThumb src={s.thumb_url} yaw={s.initial_yaw} pitch={s.initial_pitch} fov={s.fov_initial} className="bg-black/40" />
                <div className="px-1.5 py-0.5 text-[10px] sm:text-[11px] font-medium text-white truncate bg-black/50">{areaIn(s, lang) || s.title || "—"}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
