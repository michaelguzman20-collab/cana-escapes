import { supabase } from "@/lib/supabase";

// Tours 360 (canaescapes.com/tours y /tour/:slug). Tablas: tours, tour_scenes, tour_hotspots.
// Ángulos (yaw/pitch) en radianes, como los usa Photo Sphere Viewer.

export interface Tour {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  published: boolean;
  property_name: string | null;
  location: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  start_scene_id: string | null;
  autorotate: boolean;
  nadir_logo: boolean;
  nadir_size: number; // grados desde el suelo
  nadir_opacity: number; // 10-100
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TourScene {
  id: string;
  tour_id: string;
  title: string; // normalmente el nombre del tour
  area: string | null; // Entrada, Comedor, Habitación… → se muestra "Título (Área)"
  image_url: string;
  thumb_url: string | null;
  storage_path: string | null;
  sort_order: number;
  initial_yaw: number;
  initial_pitch: number;
  correction_roll: number; // grados
  correction_tilt: number; // grados
  fov_initial: number; // grados de campo de visión al entrar (menos = más cerca)
  fov_min: number; // grados (lo más cerca que se puede acercar)
  fov_max: number; // grados (lo más lejos que se puede alejar)
  pitch_limit: number; // grados, 90 = sin límite
  filters: PanoFilters;
  base_url: string | null; // foto sin filtros
  base_path: string | null;
  created_at: string;
}

export interface PanoFilters {
  brightness?: number; // -100..100
  contrast?: number; // -100..100
  saturation?: number; // -100..100
  hdr?: number; // 0..100
  sharpness?: number; // 0..100
}

export const FILTER_KEYS = ["brightness", "contrast", "saturation", "hdr", "sharpness"] as const;

export function hasFilters(f: PanoFilters | null | undefined) {
  return !!f && FILTER_KEYS.some((k) => (f[k] ?? 0) !== 0);
}

const RAD = Math.PI / 180;

/** Corrección de nivel para Photo Sphere Viewer (radianes) */
export function sphereCorrection(s: Pick<TourScene, "correction_roll" | "correction_tilt">) {
  return { pan: 0, tilt: (s.correction_tilt ?? 0) * RAD, roll: (s.correction_roll ?? 0) * RAD };
}

/** Limita la inclinación vertical de la cámara (pitch_limit en grados) */
export function clampPitch(pitch: number, limitDeg: number | null | undefined) {
  const lim = (limitDeg ?? 90) * RAD;
  return Math.max(-lim, Math.min(lim, pitch));
}

// Addon (punto) dentro de una escena, como en Kuula: ícono, texto o imagen, con acción al tocar
export type AddonKind = "icon" | "text" | "image";
export type AddonAction = "none" | "scene" | "card" | "url";
export type AddonPlacement = "2d" | "wall" | "floor" | "ceiling";

export interface AddonStyle {
  size?: number; // px del ícono/imagen (o ancho de imagen)
  opacity?: number; // 0-100
  rotation?: number; // grados (giro en su plano)
  tint?: string; // color del ícono
  bg?: string; // color de fondo del ícono
  placement?: AddonPlacement;
  wallAngle?: number; // grados, para orientar en pared
  scaleOnZoom?: boolean; // 2D: crece/encoge con el zoom
  label?: string; // texto de la etiqueta (o del addon texto)
  fontSize?: number;
  color?: string; // color del texto
  labelBg?: string; // fondo de la etiqueta ("" = sin fondo)
  bold?: boolean;
  shadow?: boolean;
  onlyHover?: boolean; // etiqueta solo al pasar el ratón
  animation?: "none" | "bounce" | "pulse" | "wave";
}

export interface TourHotspot {
  id: string;
  scene_id: string;
  kind: AddonKind;
  icon: string | null;
  image_url: string | null;
  image_path: string | null;
  action: AddonAction;
  target_scene_id: string | null;
  url: string | null;
  title: string | null; // título de la tarjeta
  text: string | null; // texto de la tarjeta
  yaw: number;
  pitch: number;
  style: AddonStyle;
  master: boolean;
  hide_in: string[];
}

/** Addons que se ven en una escena: los suyos + los "master" del tour (salvo que estén ocultos ahí) */
export function addonsForScene(all: TourHotspot[], sceneId: string) {
  return all.filter((h) => (h.scene_id === sceneId || h.master) && !h.hide_in?.includes(sceneId));
}

/** Nivel de zoom de Photo Sphere Viewer (0-100) para un campo de visión dentro de los límites */
export function zoomLevelFor(fov: number, fovMin: number, fovMax: number) {
  const lo = Math.min(fovMin, fovMax), hi = Math.max(fovMin, fovMax);
  if (hi === lo) return 50;
  const f = Math.max(lo, Math.min(hi, fov));
  return ((hi - f) / (hi - lo)) * 100;
}

export function fovForLevel(level: number, fovMin: number, fovMax: number) {
  const lo = Math.min(fovMin, fovMax), hi = Math.max(fovMin, fovMax);
  return hi - (level / 100) * (hi - lo);
}

export interface FullTour {
  tour: Tour;
  scenes: TourScene[];
  hotspots: TourHotspot[];
}

// Tablas aún sin tipos generados en Database: se consultan sin tipar
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;

export async function fetchTourBySlug(slug: string): Promise<FullTour | null> {
  const { data: tour, error } = await db.from("tours").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!tour) return null;
  return fetchTourContent(tour as Tour);
}

export async function fetchTourContent(tour: Tour): Promise<FullTour> {
  const { data: scenes, error: e1 } = await db
    .from("tour_scenes")
    .select("*")
    .eq("tour_id", tour.id)
    .order("sort_order");
  if (e1) throw e1;
  const ids = (scenes ?? []).map((s: TourScene) => s.id);
  let hotspots: TourHotspot[] = [];
  if (ids.length) {
    const { data, error: e2 } = await db.from("tour_hotspots").select("*").in("scene_id", ids);
    if (e2) throw e2;
    hotspots = data ?? [];
  }
  return { tour, scenes: scenes ?? [], hotspots };
}

/** Tour de la galería con la vista inicial de su escena de portada (para recortar la miniatura) */
export type TourCard = Tour & { start: Pick<TourScene, "initial_yaw" | "initial_pitch" | "fov_initial"> | null };

export async function fetchPublishedTours(): Promise<TourCard[]> {
  const { data, error } = await db
    .from("tours")
    .select("*, start:tour_scenes!tours_start_scene_fk(initial_yaw, initial_pitch, fov_initial)")
    .eq("published", true)
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Nombre visible de una foto: "Cocotal (Entrada)" */
export function sceneLabel(s: Pick<TourScene, "title" | "area">) {
  const t = s.title?.trim() || "Escena";
  return s.area?.trim() ? `${t} (${s.area.trim()})` : t;
}

/** Áreas sugeridas al nombrar las fotos */
export const AREA_SUGGESTIONS = [
  "Entrada", "Fachada", "Sala", "Comedor", "Cocina", "Área común", "Habitación principal", "Habitación",
  "Dormitorio", "Baño", "Terraza", "Balcón", "Piscina", "Jardín", "Lobby", "Pasillo", "Lavandería", "Parqueo",
];

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function tourUrl(slug: string) {
  return `${window.location.origin}/tour/${slug}`;
}

export function startScene(full: FullTour) {
  return full.scenes.find((s) => s.id === full.tour.start_scene_id) ?? full.scenes[0] ?? null;
}
