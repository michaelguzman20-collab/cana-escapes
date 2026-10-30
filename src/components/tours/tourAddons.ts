import type { MarkerConfig } from "@photo-sphere-viewer/markers-plugin";
import type { AddonStyle, TourHotspot } from "@/lib/tours";
import { mediaUrl } from "@/lib/tours";
import { escapeHtml } from "./markerHtml";

// Addons del tour 360 (como en Kuula): ícono, texto o imagen, en 2D (siempre de frente) o pegados en
// 3D a la pared, el piso o el techo. Lo usan el visor público y el editor.

// ── Galería de íconos (viewBox 24) ───────────────────────────────────────────
export const ICONS: Record<string, { label: string; d: string; fill?: boolean; circle?: boolean }> = {
  chevron: { label: "Flecha", d: "M5 15l7-7 7 7" },
  chevron2: { label: "Flecha doble", d: "M5 18l7-7 7 7M5 11l7-7 7 7" },
  arrowUp: { label: "Flecha recta", d: "M12 20V4M5 11l7-7 7 7" },
  arrowRight: { label: "Derecha", d: "M4 12h16M13 5l7 7-7 7" },
  arrowLeft: { label: "Izquierda", d: "M20 12H4M11 5l-7 7 7 7" },
  target: { label: "Punto", d: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", circle: true, fill: true },
  ring: { label: "Anillo", d: "", circle: true },
  info: { label: "Info", d: "M12 11v6M12 7.5v.01", circle: true },
  question: { label: "Pregunta", d: "M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01", circle: true },
  plus: { label: "Más", d: "M12 5v14M5 12h14" },
  star: { label: "Estrella", d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z", fill: true },
  link: { label: "Enlace", d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" },
  camera: { label: "Cámara", d: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
  play: { label: "Video", d: "M8 5v14l11-7z", fill: true },
  chat: { label: "Mensaje", d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
  pin: { label: "Ubicación", d: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
  home: { label: "Casa", d: "M3 10l9-7 9 7v11H3zM9 21v-6h6v6" },
  door: { label: "Puerta", d: "M5 21V3h11v18M3 21h18M13 12h.01" },
  bed: { label: "Habitación", d: "M2 20V8M2 16h20v4M22 16v-3a3 3 0 0 0-3-3H10v6M6 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" },
  pool: { label: "Piscina", d: "M2 12c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 18c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" },
  wifi: { label: "WiFi", d: "M5 12.55a11 11 0 0 1 14 0M8.5 16.4a6 6 0 0 1 7 0M12 20h.01M2 8.82a15 15 0 0 1 20 0" },
  eye: { label: "Ver", d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
  cart: { label: "Tienda", d: "M6 6h15l-1.5 9h-12zM6 6L5 3H2M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" },
  music: { label: "Música", d: "M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" },
  sound: { label: "Sonido", d: "M11 5L6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" },
};

export function iconSvg(id: string, color: string) {
  const ic = ICONS[id] ?? ICONS.target;
  const circle = ic.circle ? `<circle cx="12" cy="12" r="9.5" fill="none" stroke="${color}" stroke-width="2.2"/>` : "";
  const path = ic.d
    ? `<path d="${ic.d}" ${ic.fill ? `fill="${color}" stroke="none"` : `fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"`}/>`
    : "";
  return `<svg viewBox="0 0 24 24" width="100%" height="100%">${circle}${path}</svg>`;
}

// ── Estilos por defecto ─────────────────────────────────────────────────────
export const PRESETS: Record<"arrow" | "info" | "icon" | "text" | "image", Partial<TourHotspot>> = {
  arrow: { kind: "icon", icon: "chevron", action: "scene", style: { size: 30, fontSize: 8, opacity: 85, tint: "#ffffff", bg: "rgba(0,0,0,0.25)", placement: "2d", shadow: true } },
  info: { kind: "icon", icon: "info", action: "card", style: { size: 30, fontSize: 8, opacity: 100, tint: "#0F2B4C", bg: "#ffffff", placement: "2d", shadow: true } },
  icon: { kind: "icon", icon: "target", action: "none", style: { size: 30, fontSize: 8, opacity: 100, tint: "#ffffff", bg: "rgba(15,43,76,0.6)", placement: "2d", shadow: true } },
  text: { kind: "text", action: "none", style: { label: "Texto", fontSize: 8, color: "#ffffff", labelBg: "rgba(0,0,0,0.45)", placement: "2d", shadow: true } },
  image: { kind: "image", action: "none", style: { size: 220, fontSize: 8, opacity: 100, placement: "2d" } },
};

const is3D = (s: AddonStyle) => s.placement === "wall" || s.placement === "floor" || s.placement === "ceiling";
// En 3D el elemento se dibuja a ~1000 unidades del centro: se agranda para que se vea de tamaño parecido
const SCALE_3D = 4;

/** Elemento HTML del addon */
export function addonElement(h: TourHotspot, opts: { label?: string; selected?: boolean; pending?: boolean } = {}) {
  const s = h.style ?? {};
  const k = is3D(s) ? SCALE_3D : 1;
  const size = (s.size ?? 30) * k;
  const el = document.createElement("div");
  el.className = [
    "ce-addon",
    s.animation && s.animation !== "none" ? `ce-anim-${s.animation}` : "",
    opts.selected ? "ce-addon-selected" : "",
    opts.pending ? "ce-addon-pending" : "", // flecha generada sin revisar (solo en el editor)
    h.action !== "none" ? "ce-addon-clickable" : "",
  ].join(" ");
  el.dataset.addon = h.id;
  el.style.opacity = String((s.opacity ?? 100) / 100);
  const rot = !is3D(s) && s.rotation ? `transform: rotate(${s.rotation}deg);` : "";
  const shadow = s.shadow ? "filter: drop-shadow(0 3px 6px rgba(0,0,0,.45));" : "";
  const labelText = h.kind === "text" || s.noLabel ? "" : s.label || opts.label || "";
  const label = labelText
    ? `<div class="ce-addon-label${s.onlyHover ? " ce-only-hover" : ""}" style="font-size:${(s.fontSize ?? 13) * k}px;color:${s.color ?? "#fff"};${s.labelBg !== "" ? `background:${s.labelBg ?? "rgba(15,43,76,0.85)"};` : ""}${s.bold ? "font-weight:700;" : ""}">${escapeHtml(labelText)}</div>`
    : "";

  let body = "";
  if (h.kind === "text") {
    body = `<div class="ce-addon-text" style="${rot}${shadow}font-size:${(s.fontSize ?? 22) * k}px;color:${s.color ?? "#fff"};${s.labelBg ? `background:${s.labelBg};` : ""}${s.bold ? "font-weight:700;" : ""}">${escapeHtml(s.label || "Texto").replace(/\n/g, "<br>")}</div>`;
  } else if (h.kind === "image" && h.image_url) {
    body = `<img class="ce-addon-img" src="${escapeHtml(mediaUrl(h.image_url))}" style="width:${size}px;${rot}${shadow}" draggable="false" alt="">`;
  } else if (h.image_url) {
    body = `<img class="ce-addon-icon" src="${escapeHtml(mediaUrl(h.image_url))}" style="width:${size}px;height:${size}px;object-fit:contain;${rot}${shadow}" draggable="false" alt="">`;
  } else {
    const pad = s.bg ? size * 0.2 : 0;
    body = `<div class="ce-addon-icon" style="width:${size}px;height:${size}px;padding:${pad}px;${s.bg ? `background:${s.bg};border-radius:9999px;` : ""}${rot}${shadow}">${iconSvg(h.icon ?? "target", s.tint ?? "#fff")}</div>`;
  }
  el.innerHTML = body + label;
  return el;
}

/** Configuración del marcador de Photo Sphere Viewer para un addon */
export function addonMarker(h: TourHotspot, el: HTMLElement): MarkerConfig {
  const s = h.style ?? {};
  const RAD = Math.PI / 180;
  // Nunca exactamente en el polo (la orientación 3D se indefine)
  const position = { yaw: h.yaw, pitch: Math.max(-89.5 * RAD, Math.min(89.5 * RAD, h.pitch)) };
  if (is3D(s)) {
    return {
      id: h.id,
      elementLayer: el,
      position,
      rotation: {
        yaw: (s.wallAngle ?? 0) * RAD,
        // Piso/techo: el plano se acuesta con su cara hacia la cámara y "arriba" apuntando hacia adelante
        pitch: s.placement === "floor" ? Math.PI / 2 : s.placement === "ceiling" ? -Math.PI / 2 : 0,
        roll: (s.rotation ?? 0) * RAD,
      },
      data: { addon: true },
    };
  }
  return {
    id: h.id,
    element: el,
    position,
    anchor: "center center",
    ...(s.scaleOnZoom ? { scale: { zoom: [0.5, 2] as [number, number] } } : {}),
    data: { addon: true },
  };
}
