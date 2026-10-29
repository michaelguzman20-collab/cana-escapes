import { supabase } from "@/lib/supabase";

// Tours 360 (canaescapes.com/tours y /tour/:slug). Tablas: tours, tour_scenes, tour_hotspots.
// Ángulos (yaw/pitch) en radianes, como los usa Photo Sphere Viewer.

export interface Tour {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  description_en: string | null;
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
  brand_logo_url: string | null; // logo del propietario (marca de agua en todas las fotos)
  brand_logo_path: string | null;
  brand_link: string | null; // al tocar el logo se abre esta página
  brand_position: BrandPosition;
  brand_size: number; // ancho en px
  whatsapp: string | null; // WhatsApp del propietario (el botón verde le escribe)
  instagram: string | null; // usuario de Instagram del propietario (sin @)
  music_style: "zen" | "lounge" | "tropical" | "bossa"; // música de fondo (ambientMusic.ts)
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type BrandPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";

/** Solo dígitos, con código de país. Números dominicanos de 10 dígitos (809/829/849) → 1 delante */
export function normalizeWhatsapp(raw: string | null | undefined) {
  const d = (raw ?? "").replace(/\D/g, "");
  if (d.length === 10 && /^(809|829|849)/.test(d)) return "1" + d;
  return d.length >= 8 ? d : "";
}

/** Enlace para escribir por WhatsApp a un número con un mensaje ya escrito */
export function whatsappLink(phone: string, text: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/**
 * Usuario de Instagram a partir de lo que se escriba: "@villa.azul", "villa.azul" o el enlace del perfil
 * ("instagram.com/villa.azul/?hl=es"). "" si no es válido.
 */
export function instagramUser(raw: string | null | undefined) {
  let u = (raw ?? "").trim();
  const m = u.match(/instagram\.com\/([^/?#\s]+)/i);
  if (m) u = m[1];
  u = u.replace(/^@+/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(u) ? u : "";
}

export function instagramLink(user: string) {
  return `https://www.instagram.com/${user}/`;
}

/** Enlace externo seguro (añade https:// si falta) */
export function externalUrl(raw: string | null | undefined) {
  const u = (raw ?? "").trim();
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

// La etiqueta "Nuevo" del botón flotante de Tours 360 deja de salir cuando la persona ya vio los tours
const TOURS_SEEN_KEY = "ce-tours-seen";
export function markToursSeen() {
  try { localStorage.setItem(TOURS_SEEN_KEY, "1"); } catch { /* sin almacenamiento */ }
}
export function toursSeen() {
  try { return !!localStorage.getItem(TOURS_SEEN_KEY); } catch { return false; }
}

/**
 * Foto que carga el visor: en teléfonos, la versión de 5760 px si existe (se ve igual, porque el visor del
 * teléfono reduce las fotos a ese tamaño, y pesa menos); en tabletas y computadoras, la original de 8K.
 * Mismo criterio de teléfono que limitTexturesOnPhones (viewerSetup.ts).
 */
export function viewerImage(s: Pick<TourScene, "image_url" | "mobile_url">) {
  const phone = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 768;
  return phone && s.mobile_url ? s.mobile_url : s.image_url;
}

/** Pantalla de teléfono (por debajo del punto `sm` de Tailwind): ahí el visor empieza con los botones y las fotos ocultos */
export function isPhoneWidth() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;
}

export interface TourScene {
  id: string;
  tour_id: string;
  title: string; // normalmente el nombre del tour
  area: string | null; // Entrada, Comedor, Habitación… → se muestra "Título (Área)"
  area_en: string | null; // área en inglés (si falta se traduce sola con translateArea)
  image_url: string;
  thumb_url: string | null;
  storage_path: string | null;
  mobile_url: string | null; // versión para teléfono (5760 px); null = usar image_url
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
  auto?: boolean; // flecha creada por "Generar recorrido" que el admin aún no ha revisado
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

// Tour + fotos + addons en una sola consulta (antes eran 3 viajes seguidos al servidor)
export async function fetchTourBySlug(slug: string): Promise<FullTour | null> {
  const { data, error } = await db
    .from("tours")
    .select("*, scenes:tour_scenes!tour_scenes_tour_id_fkey(*, hotspots:tour_hotspots!tour_hotspots_scene_id_fkey(*))")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { scenes = [], ...tour } = data as Tour & { scenes?: (TourScene & { hotspots?: TourHotspot[] })[] };
  scenes.sort((a, b) => a.sort_order - b.sort_order);
  return {
    tour: tour as Tour,
    scenes: scenes.map(({ hotspots: _h, ...s }) => s as TourScene),
    hotspots: scenes.flatMap((s) => s.hotspots ?? []),
  };
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

/** Nombre visible de una foto: "Cocotal (Entrada)"; en inglés usa el área traducida */
export function sceneLabel(s: Pick<TourScene, "title" | "area"> & { area_en?: string | null }, lang: Lang = "es") {
  const t = s.title?.trim() || "Escena";
  const a = areaIn(s, lang);
  return a ? `${t} (${a})` : t;
}

type Lang = string; // "es" | "en" (LangContext)

// Áreas en inglés para el botón ES/EN del tour. Se compara sin acentos ni mayúsculas,
// así "Entrada principal" → "Main entrance" y "Habitación 2" → "Bedroom 2".
const AREA_EN: Record<string, string> = {
  "entrada principal": "Main entrance", "entrada": "Entrance", "fachada": "Facade", "recibidor": "Foyer",
  "vestibulo": "Foyer", "sala de estar": "Living room", "sala": "Living room", "living": "Living room",
  "comedor": "Dining room", "cocina": "Kitchen", "area comun": "Common area", "areas comunes": "Common areas",
  "habitacion principal": "Master bedroom", "dormitorio principal": "Master bedroom", "habitacion": "Bedroom",
  "dormitorio": "Bedroom", "recamara": "Bedroom", "cuarto": "Room", "bano principal": "Master bathroom",
  "medio bano": "Half bathroom", "bano de visitas": "Guest bathroom", "bano": "Bathroom", "terraza": "Terrace",
  "balcon": "Balcony", "piscina": "Pool", "jacuzzi": "Hot tub", "jardin": "Garden", "patio": "Patio",
  "patio trasero": "Backyard", "lobby": "Lobby", "pasillo": "Hallway", "lavanderia": "Laundry room",
  "parqueo": "Parking", "estacionamiento": "Parking", "garaje": "Garage", "marquesina": "Carport",
  "escalera": "Stairs", "escaleras": "Stairs", "oficina": "Office", "estudio": "Studio", "gimnasio": "Gym",
  "rooftop": "Rooftop", "azotea": "Rooftop", "bbq": "BBQ area", "area de bbq": "BBQ area", "gazebo": "Gazebo",
  "playa": "Beach", "vista": "View", "vista al mar": "Ocean view", "closet": "Closet", "vestidor": "Walk-in closet",
  "deposito": "Storage", "cuarto de servicio": "Service room", "area de servicio": "Service area",
  "recepcion": "Reception", "primer piso": "First floor", "segundo piso": "Second floor", "planta alta": "Upstairs",
  "planta baja": "Downstairs", "exterior": "Exterior", "interior": "Interior", "frente": "Front",
};
const ADJ_EN: Record<string, string> = {
  principal: "main", secundaria: "second", secundario: "second", superior: "upper", inferior: "lower",
  exterior: "outdoor", interior: "indoor", trasera: "back", trasero: "back", frontal: "front",
};
const fold = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const AREA_KEYS = Object.keys(AREA_EN).sort((x, y) => y.length - x.length);

/** Traducción automática de un área (null si no se reconoce) */
export function translateArea(area: string): string | null {
  const a = fold(area);
  if (!a) return null;
  if (AREA_EN[a]) return AREA_EN[a];
  // "Habitación 2", "Baño #3"…
  const num = a.match(/^(.*?)\s*(#?\d+)$/);
  if (num && AREA_EN[num[1]]) return `${AREA_EN[num[1]]} ${num[2]}`;
  // Área conocida + adjetivo ("Terraza superior" → "Upper terrace")
  const k = AREA_KEYS.find((key) => a.startsWith(key + " "));
  const adj = k ? ADJ_EN[a.slice(k.length).trim()] : undefined;
  if (k && adj) return `${adj[0].toUpperCase()}${adj.slice(1)} ${AREA_EN[k].toLowerCase()}`;
  return null;
}

/** Área de la foto en el idioma pedido (en inglés: la escrita a mano o la traducción automática) */
export function areaIn(s: { area?: string | null; area_en?: string | null }, lang: Lang) {
  const es = s.area?.trim() || "";
  if (lang !== "en" || !es) return es;
  return s.area_en?.trim() || translateArea(es) || es;
}

/** Descripción del tour en el idioma pedido */
export function descriptionIn(t: Pick<Tour, "description" | "description_en">, lang: Lang) {
  return (lang === "en" ? t.description_en?.trim() || t.description?.trim() : t.description?.trim()) || "";
}

/** Descripción genérica (español e inglés) para empezar y luego ajustar los detalles */
export function genericDescription(t: Pick<Tour, "title" | "property_name" | "location" | "bedrooms" | "bathrooms">, areas: string[]) {
  const name = t.property_name?.trim() || t.title.trim();
  const where = t.location?.trim() || "Punta Cana";
  const uniq = [...new Set(areas.map((a) => a.trim()).filter(Boolean))].slice(0, 6);
  const list = (xs: string[], and: string) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} ${and} ${xs[xs.length - 1]}` : xs[0] ?? "");
  const n = (v: number | null, one: string, many: string) => (v != null ? `${v} ${v === 1 ? one : many}` : "");
  const roomsEs = [n(t.bedrooms, "habitación", "habitaciones"), n(t.bathrooms, "baño", "baños")].filter(Boolean);
  const roomsEn = [n(t.bedrooms, "bedroom", "bedrooms"), n(t.bathrooms, "bathroom", "bathrooms")].filter(Boolean);
  const es = [
    `Recorre ${name} en ${where} con este tour virtual 360°, como si estuvieras allí.`,
    roomsEs.length
      ? `Cuenta con ${list(roomsEs, "y")}, con espacios cómodos y luminosos para disfrutar del Caribe.`
      : "Espacios cómodos y luminosos para disfrutar del Caribe.",
    uniq.length ? `En el recorrido verás: ${list(uniq.map((a) => a.toLowerCase()), "y")}.` : "",
    "Gestionada por Cana Escapes: reserva o escríbenos por WhatsApp para más información.",
  ].filter(Boolean).join(" ");
  const enAreas = uniq.map((a) => (translateArea(a) ?? a).toLowerCase());
  const en = [
    `Walk through ${name} in ${where} with this 360° virtual tour, as if you were there.`,
    roomsEn.length
      ? `It features ${list(roomsEn, "and")}, with comfortable, bright spaces to enjoy the Caribbean.`
      : "Comfortable, bright spaces to enjoy the Caribbean.",
    enAreas.length ? `In the tour you will see: ${list(enAreas, "and")}.` : "",
    "Managed by Cana Escapes: book now or message us on WhatsApp for more information.",
  ].filter(Boolean).join(" ");
  return { es, en };
}

// ── Entrega de fotos ─────────────────────────────────────────────────────────
// El enlace público r2.dev de Cloudflare está limitado y corta conexiones al azar (por eso una foto
// "no se pudo cargar"). En producción las fotos se piden a canaescapes.com/media/…, que Vercel reenvía
// a R2 y guarda en su caché (ver vercel.json; en local, el proxy de vite.config.ts). Además evita el CORS
// de R2, que solo acepta https://canaescapes.com. En la BD se sigue guardando la URL original.
const R2_DEV = /^https:\/\/pub-[a-f0-9]+\.r2\.dev\//;

export function mediaUrl<T extends string | null | undefined>(url: T): T {
  if (!url) return url;
  return url.replace(R2_DEV, "/media/") as T;
}

/**
 * URL para reintentar una foto que falló. Si R2 falló un momento, Vercel y el navegador pueden haber
 * guardado ese error (las fotos se guardan un año): con un parámetro nuevo ninguno de los dos lo reutiliza.
 */
export function mediaRetryUrl(url: string): string {
  const u = mediaUrl(url);
  return `${u}${u.includes("?") ? "&" : "?"}r=${Date.now()}`;
}

/** fetch con tiempo máximo y reintentos (la red del teléfono o el almacenamiento pueden fallar un momento) */
export async function fetchRetry(url: string, init: RequestInit = {}, tries = 3, timeoutMs = 60000): Promise<Response> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok || (res.status < 500 && res.status !== 429)) return res;
      last = new Error(`Error ${res.status}`);
    } catch (e) {
      last = e;
    }
    if (i < tries - 1) await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
  throw last instanceof Error && last.name === "TimeoutError" ? new Error("La conexión tardó demasiado. Inténtalo de nuevo.") : last;
}

/** Corta una espera que no termina, para que un botón no se quede "cargando" para siempre */
export function withTimeout<T>(p: PromiseLike<T>, ms: number, msg = "Tardó demasiado. Revisa la conexión e inténtalo de nuevo."): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(msg)), ms);
    Promise.resolve(p).then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
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
