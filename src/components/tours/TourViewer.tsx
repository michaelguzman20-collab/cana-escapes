import { useEffect, useRef, useState } from "react";
import { Crosshair, X } from "lucide-react";
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
import {
  addonsForScene, clampPitch, sceneLabel, sphereCorrection, startScene, zoomLevelFor, type FullTour, type TourHotspot, type TourScene,
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
}

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

export default function TourViewer({ full, loadingText, startLabel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tourRef = useRef<VirtualTourPlugin | null>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const first = startScene(full);
  const [current, setCurrent] = useState(first?.id ?? "");
  const [card, setCard] = useState<TourHotspot | null>(null);

  useEffect(() => {
    if (!containerRef.current || !first) return;
    const titles = new Map(full.scenes.map((s) => [s.id, s.area?.trim() || s.title]));
    const sceneById = new Map(full.scenes.map((s) => [s.id, s]));
    const addonById = new Map(full.hotspots.map((h) => [h.id, h]));

    const buildNodes = (logo: string | null): VirtualTourNode[] =>
      full.scenes.map((s) => {
        const markers: MarkerConfig[] = addonsForScene(full.hotspots, s.id)
          .filter((h) => h.action !== "scene" || (h.target_scene_id && titles.has(h.target_scene_id)))
          .map((h) => addonMarker(h, addonElement(h, { label: h.action === "scene" ? titles.get(h.target_scene_id!) : undefined })));
        if (logo && full.tour.nadir_logo) markers.push(nadirMarker(logo, full.tour.nadir_size, full.tour.nadir_opacity));
        return {
          id: s.id,
          panorama: s.image_url,
          name: s.title,
          caption: sceneLabel(s),
          thumbnail: s.thumb_url ?? undefined,
          sphereCorrection: sphereCorrection(s),
          links: [],
          markers: markers as VirtualTourNode["markers"],
        };
      });

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
        if (t) new Image().src = t.image_url;
      });
    };

    const timer = setTimeout(async () => {
      const logo = full.tour.nadir_logo ? await nadirLogoUrl() : null;
      if (cancelled) return;
      const viewer = (created = new Viewer({
        container: containerRef.current!,
        defaultYaw: first.initial_yaw,
        defaultPitch: first.initial_pitch,
        minFov: Math.min(first.fov_min, first.fov_max),
        maxFov: Math.max(first.fov_min, first.fov_max),
        defaultZoomLvl: levelOf(first),
        loadingImg: LOADER_IMG,
        loadingTxt: loadingText ?? "Cargando…",
        touchmoveTwoFingers: false,
        mousewheelCtrlKey: false,
        navbar: ["autorotate", "zoom", "caption", "gyroscope", "fullscreen"],
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
      viewerRef.current = viewer;
      tour.addEventListener("node-changed", ({ node }) => {
        setCurrent(node.id);
        const s = sceneById.get(node.id);
        if (s) preload(s);
      });
      preload(first);
      // Límite vertical de la escena actual
      viewer.addEventListener("before-rotate", (e) => {
        e.position.pitch = clampPitch(e.position.pitch, currentScene.pitch_limit);
      });
      // Acción de cada addon al tocarlo
      const markers = viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
      markers.addEventListener("select-marker", ({ marker }) => {
        const h = addonById.get(marker.id);
        if (!h) return;
        if (h.action === "scene" && h.target_scene_id) tour.setCurrentNode(h.target_scene_id);
        else if (h.action === "card") setCard(h);
        else if (h.action === "url" && h.url) window.open(h.url, "_blank", "noopener");
      });
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      tourRef.current = null;
      viewerRef.current = null;
      (created as Viewer | null)?.destroy();
    };
    // El tour no cambia mientras la página está abierta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" />
      {card && <Card addon={card} onClose={() => setCard(null)} />}
      <button
        onClick={() => {
          const s = full.scenes.find((x) => x.id === current);
          if (s) viewerRef.current?.animate({ yaw: s.initial_yaw, pitch: s.initial_pitch, zoom: levelOf(s), speed: "4rpm" });
        }}
        className="absolute left-3 bottom-[8.5rem] z-10 flex items-center gap-1.5 h-9 px-3 rounded-full bg-black/45 backdrop-blur-sm text-white text-xs font-semibold hover:bg-black/65"
        title={startLabel ?? "Punto de inicio"}
      >
        <Crosshair size={15} /> <span className="hidden sm:inline">{startLabel ?? "Punto de inicio"}</span>
      </button>
      {full.scenes.length > 1 && (
        <div className="absolute left-0 right-0 bottom-12 z-10 flex justify-center px-3 pointer-events-none">
          <div className="flex gap-2 overflow-x-auto max-w-full p-1.5 rounded-xl bg-black/35 backdrop-blur-sm pointer-events-auto" style={{ scrollbarWidth: "none" }}>
            {full.scenes.map((s) => (
              <button
                key={s.id}
                onClick={() => s.id !== current && tourRef.current?.setCurrentNode(s.id)}
                className={cn(
                  "shrink-0 w-20 sm:w-24 rounded-lg overflow-hidden border-2 text-left transition-colors",
                  s.id === current ? "border-[#F0A030]" : "border-transparent opacity-80 hover:opacity-100"
                )}
              >
                <div className="aspect-[2/1] bg-black/40">
                  {s.thumb_url && <img src={s.thumb_url} alt="" className="w-full h-full object-cover" loading="lazy" />}
                </div>
                <div className="px-1.5 py-0.5 text-[10px] sm:text-[11px] font-medium text-white truncate bg-black/50">{s.area?.trim() || s.title || "—"}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
