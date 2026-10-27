import { useEffect, useRef, useState } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import { MarkersPlugin, type MarkerConfig } from "@photo-sphere-viewer/markers-plugin";
import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/markers-plugin/index.css";
import "./tours.css";
import { LOADER_IMG, nadirLogoUrl, nadirMarker } from "./markerHtml";
import { addonElement, addonMarker } from "./tourAddons";
import { clampPitch, fovForLevel, sphereCorrection, zoomLevelFor, type TourHotspot, type TourScene } from "@/lib/tours";

// Visor del editor de /admin/tours: muestra una escena con sus addons, avisa dónde se hizo clic
// (para colocar uno nuevo) y deja arrastrar el addon seleccionado para moverlo. Aplica en vivo
// nivelación, zoom, límite vertical, vista previa de filtros y el logo del suelo.

export interface EditorViewerApi {
  getPosition(): { yaw: number; pitch: number };
  /** Campo de visión actual en grados */
  getFov(): number;
  lookAt(pos: { yaw: number; pitch: number; fov?: number }): void;
}

interface Props {
  scene: TourScene;
  addons: TourHotspot[];
  sceneTitles: Map<string, string>;
  /** Addon que se está editando (puede ser nuevo, aún sin guardar) */
  editing?: TourHotspot | null;
  nadir: { enabled: boolean; size: number; opacity: number };
  /** Punto de inicio de la foto (se marca con una bandera) */
  start?: { yaw: number; pitch: number } | null;
  cssFilter?: string;
  onPanoClick(pos: { yaw: number; pitch: number }): void;
  onAddonClick(h: TourHotspot): void;
  onAddonMoved(pos: { yaw: number; pitch: number }): void;
  onApi?(api: EditorViewerApi | null): void;
}

const levelOf = (s: TourScene) => zoomLevelFor(s.fov_initial, s.fov_min, s.fov_max);

export default function TourEditorViewer(props: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const loadedUrl = useRef<string | null>(null);
  const loadedScene = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const cb = useRef(props);
  cb.current = props;
  const { scene } = props;

  useEffect(() => {
    nadirLogoUrl().then(setLogo);
  }, []);

  useEffect(() => {
    // Se crea en el siguiente tick: en desarrollo React monta→desmonta→monta y destruir un visor
    // mientras carga deja la foto "Cargando…" para siempre en el segundo.
    let viewer: Viewer | null = null;
    let dragging: { id: string } | null = null;
    const container = containerRef.current!;

    const toSpherical = (e: { clientX: number; clientY: number }) => {
      const r = container.getBoundingClientRect();
      return viewer!.dataHelper.viewerCoordsToSphericalCoords({ x: e.clientX - r.left, y: e.clientY - r.top });
    };
    // Arrastrar el addon seleccionado: se intercepta antes de que el visor gire la vista
    const onDown = (e: MouseEvent | TouchEvent) => {
      const editing = cb.current.editing;
      if (!viewer || !editing) return;
      const target = e.target as HTMLElement;
      if (!target.closest?.(".ce-addon-selected")) return;
      e.stopPropagation();
      e.preventDefault();
      dragging = { id: editing.id };
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging || !viewer) return;
      const p = "touches" in e ? e.touches[0] : e;
      if (!p) return;
      const pos = toSpherical(p);
      const markers = viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
      try {
        markers.updateMarker({ id: dragging.id, position: pos });
      } catch {
        /* el marcador puede haberse redibujado */
      }
      (dragging as { id: string; pos?: typeof pos }).pos = pos;
    };
    const onUp = () => {
      const d = dragging as { id: string; pos?: { yaw: number; pitch: number } } | null;
      dragging = null;
      if (d?.pos) cb.current.onAddonMoved(d.pos);
    };
    container.addEventListener("mousedown", onDown, true);
    container.addEventListener("touchstart", onDown, { capture: true, passive: false });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);

    const timer = setTimeout(() => {
      const s = cb.current.scene;
      const v = new Viewer({
        container,
        panorama: s.image_url,
        sphereCorrection: sphereCorrection(s),
        defaultYaw: s.initial_yaw,
        defaultPitch: s.initial_pitch,
        minFov: Math.min(s.fov_min, s.fov_max),
        maxFov: Math.max(s.fov_min, s.fov_max),
        defaultZoomLvl: levelOf(s),
        loadingImg: LOADER_IMG,
        loadingTxt: "Cargando…",
        touchmoveTwoFingers: false,
        mousewheelCtrlKey: false,
        navbar: ["zoom", "move", "fullscreen"],
        plugins: [MarkersPlugin],
      });
      viewer = v;
      loadedUrl.current = s.image_url;
      loadedScene.current = s.id;
      viewerRef.current = v;
      v.addEventListener("click", ({ data }) => {
        if (data.rightclick || data.marker) return;
        cb.current.onPanoClick({ yaw: data.yaw, pitch: data.pitch });
      });
      // Límite vertical: arrastrar/girar no pasa del ángulo configurado
      v.addEventListener("before-rotate", (e) => {
        e.position.pitch = clampPitch(e.position.pitch, cb.current.scene.pitch_limit);
      });
      const markers = v.getPlugin(MarkersPlugin) as MarkersPlugin;
      markers.addEventListener("select-marker", ({ marker }) => {
        const h = cb.current.addons.find((x) => x.id === marker.id) ?? (cb.current.editing?.id === marker.id ? cb.current.editing : null);
        if (h) cb.current.onAddonClick(h);
      });
      cb.current.onApi?.({
        getPosition: () => {
          const p = v.getPosition();
          return { yaw: p.yaw, pitch: p.pitch };
        },
        getFov: () => {
          const sc = cb.current.scene;
          return fovForLevel(v.getZoomLevel(), sc.fov_min, sc.fov_max);
        },
        lookAt: ({ yaw, pitch, fov }) => {
          v.rotate({ yaw, pitch });
          const sc = cb.current.scene;
          if (fov != null) v.zoom(zoomLevelFor(fov, sc.fov_min, sc.fov_max));
        },
      });
      setReady(true);
    });
    return () => {
      clearTimeout(timer);
      container.removeEventListener("mousedown", onDown, true);
      container.removeEventListener("touchstart", onDown, true);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
      if (!viewer) return;
      cb.current.onApi?.(null);
      viewerRef.current = null;
      (viewer as Viewer).destroy();
    };
  }, []);

  // Cambio de foto (otra escena, foto reemplazada o con filtros)
  useEffect(() => {
    const v = viewerRef.current;
    if (!v || loadedUrl.current === scene.image_url) return;
    // Misma escena con foto nueva (filtros o reemplazo): se conserva hacia dónde se está mirando
    const sameScene = loadedScene.current === scene.id;
    loadedUrl.current = scene.image_url;
    loadedScene.current = scene.id;
    v.setOptions({ minFov: Math.min(scene.fov_min, scene.fov_max), maxFov: Math.max(scene.fov_min, scene.fov_max) });
    v.setPanorama(scene.image_url, {
      position: sameScene ? v.getPosition() : { yaw: scene.initial_yaw, pitch: scene.initial_pitch },
      zoom: sameScene ? v.getZoomLevel() : levelOf(scene),
      sphereCorrection: sphereCorrection(scene),
      transition: false,
      showLoader: true,
    });
  }, [ready, scene.id, scene.image_url]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nivelación y límites de zoom en vivo (manteniendo el campo de visión actual)
  useEffect(() => {
    const v = viewerRef.current;
    // Antes de que cargue la primera foto no hay esfera que corregir (el constructor ya la aplica)
    if (!v || !v.state.ready) return;
    v.setOptions({
      sphereCorrection: sphereCorrection(scene),
      minFov: Math.min(scene.fov_min, scene.fov_max),
      maxFov: Math.max(scene.fov_min, scene.fov_max),
    });
    const p = v.getPosition();
    const clamped = clampPitch(p.pitch, scene.pitch_limit);
    if (clamped !== p.pitch) v.rotate({ yaw: p.yaw, pitch: clamped });
  }, [ready, scene.correction_roll, scene.correction_tilt, scene.fov_min, scene.fov_max, scene.pitch_limit]);

  // Vista previa de filtros (CSS) sobre el lienzo del visor
  useEffect(() => {
    const canvas = containerRef.current?.querySelector<HTMLElement>(".psv-canvas-container");
    if (canvas) canvas.style.filter = props.cssFilter ?? "";
  }, [ready, props.cssFilter]);

  // Addons de la escena (el que se edita, resaltado) + logo del suelo
  useEffect(() => {
    const v = viewerRef.current;
    if (!v) return;
    const markers = v.getPlugin(MarkersPlugin) as MarkersPlugin;
    const label = (h: TourHotspot) => (h.action === "scene" ? props.sceneTitles.get(h.target_scene_id ?? "") : undefined);
    const list: MarkerConfig[] = props.addons
      .filter((h) => h.id !== props.editing?.id)
      .map((h) => addonMarker(h, addonElement(h, { label: label(h) })));
    if (props.editing) list.push(addonMarker(props.editing, addonElement(props.editing, { label: label(props.editing), selected: true })));
    if (props.nadir.enabled && logo) list.push(nadirMarker(logo, props.nadir.size, props.nadir.opacity));
    if (props.start) {
      list.push({
        id: "__start",
        // Mirilla: hacia donde mira la cámara al entrar a la foto
        html:
          '<svg class="ce-start-reticle" viewBox="0 0 48 48" fill="none" stroke-linecap="round">' +
          '<circle cx="24" cy="24" r="15" stroke="#F0A030" stroke-width="3"/>' +
          '<circle cx="24" cy="24" r="3" fill="#F0A030"/>' +
          '<path d="M24 2v11M24 35v11M2 24h11M35 24h11" stroke="#fff" stroke-width="3"/></svg>',
        size: { width: 46, height: 46 },
        position: props.start,
        anchor: "center center",
        data: { start: true },
      });
    }
    markers.setMarkers(list);
  }, [ready, logo, props.addons, props.editing, props.sceneTitles, scene.id, props.nadir.enabled, props.nadir.size, props.nadir.opacity, props.start?.yaw, props.start?.pitch]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className="absolute inset-0" />;
}
