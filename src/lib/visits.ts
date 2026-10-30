import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";

// Registro de visitas del sitio y de los Tours 360 (tablas site_visits y site_events).
// Sin datos personales: un identificador al azar por navegador, el tipo de dispositivo, el idioma,
// de qué sitio llegó la persona, cuánto tiempo se quedó, hasta dónde bajó y qué botones tocó.
// También país y ciudad (Vercel los deduce de la conexión; la IP no se guarda) y la fuente del enlace
// (utm_source / ?src=, o la app de Instagram/Facebook). Los navegadores del equipo se marcan al abrir el panel
// (mark_internal_visitor) y sus visitas no cuentan en las estadísticas.
// En localhost no se registra nada (para probar: localStorage "ce-track-test" = "1").

const VISITOR_KEY = "ce-visitor";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

function enabled() {
  if (location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return true;
  try { return localStorage.getItem("ce-track-test") === "1"; } catch { return false; }
}

function visitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID(); // sin almacenamiento: cuenta como visitante nuevo
  }
}
const visitor = typeof window !== "undefined" ? visitorId() : "";

/** Marca este navegador como del equipo (lo llama el panel; el servidor solo lo acepta de un administrador) */
export function markInternalVisitor() {
  try {
    const ua = navigator.userAgent;
    const os = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Otro";
    const br = /Edg\//.test(ua) ? "Edge" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /FxiOS|Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navegador";
    rpc("mark_internal_visitor", { p_visitor: visitor, p_label: `${br} · ${os}` }).then(undefined, () => undefined);
  } catch {
    /* sin importancia */
  }
}

// País y ciudad: una consulta por sesión a /api/geo (en local no existe y queda vacío)
type Geo = { country: string | null; city: string | null };
let geoPromise: Promise<Geo> | null = null;
function geo(): Promise<Geo> {
  if (geoPromise) return geoPromise;
  const empty: Geo = { country: null, city: null };
  try {
    const saved = sessionStorage.getItem("ce-geo");
    if (saved) return (geoPromise = Promise.resolve(JSON.parse(saved) as Geo));
  } catch { /* sigue */ }
  geoPromise = Promise.race([
    fetch("/api/geo").then((r) => (r.ok ? r.json() : empty)).then((g: Geo) => {
      const v = { country: typeof g?.country === "string" ? g.country : null, city: typeof g?.city === "string" ? g.city : null };
      try { sessionStorage.setItem("ce-geo", JSON.stringify(v)); } catch { /* sin almacenamiento */ }
      return v;
    }),
    new Promise<Geo>((res) => setTimeout(() => res(empty), 2500)),
  ]).catch(() => empty);
  return geoPromise;
}

// Fuente del enlace: ?utm_source= o ?src= (por ejemplo ?src=whatsapp), o la app que lo abrió.
// Se guarda para toda la sesión: las páginas siguientes vienen de la misma fuente.
function linkSource(): { source: string | null; campaign: string | null } {
  try {
    const saved = sessionStorage.getItem("ce-src");
    if (saved) return JSON.parse(saved);
    const q = new URLSearchParams(location.search);
    const ua = navigator.userAgent;
    const app = /Instagram/i.test(ua) ? "instagram" : /FBAN|FBAV|FB_IAB/i.test(ua) ? "facebook" : /TikTok|musical_ly/i.test(ua) ? "tiktok" : null;
    const v = {
      source: (q.get("utm_source") || q.get("src") || (q.has("fbclid") ? "facebook" : q.has("gclid") ? "google" : null) || app)?.slice(0, 40) ?? null,
      campaign: q.get("utm_campaign")?.slice(0, 60) ?? null,
    };
    sessionStorage.setItem("ce-src", JSON.stringify(v));
    return v;
  } catch {
    return { source: null, campaign: null };
  }
}

function device() {
  if (!window.matchMedia("(pointer: coarse)").matches) return "desktop";
  return Math.min(screen.width, screen.height) < 768 ? "phone" : "tablet";
}

// Sitio de donde llegó (solo la primera página de la visita y solo si es otro sitio)
let referrerSent = false;
function externalReferrer() {
  if (referrerSent) return null;
  referrerSent = true;
  try {
    const host = document.referrer ? new URL(document.referrer).hostname : "";
    return host && host !== location.hostname ? host : null;
  } catch {
    return null;
  }
}

type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;

// Una visita sin registrar no debe molestar a nadie: cualquier error queda aquí y la página sigue
function insertVisit(path: string, opts: { tourId?: string; sceneId?: string }): PromiseLike<number | null> {
  try {
    const referrer = externalReferrer();
    const src = linkSource();
    return geo().then((g) => rpc("record_visit", {
      p_visitor: visitor,
      p_path: path,
      p_device: device(),
      p_tour_id: opts.tourId ?? null,
      p_scene_id: opts.sceneId ?? null,
      p_referrer: referrer,
      p_lang: (navigator.language || "").slice(0, 2),
      p_country: g.country,
      p_city: g.city,
      p_source: src.source,
      p_campaign: src.campaign,
    })).then(
      ({ data }) => (typeof data === "number" ? data : null),
      () => null
    );
  } catch {
    return Promise.resolve(null);
  }
}

// ── Página abierta ahora: tiempo a la vista y hasta dónde bajó ──────────────
interface PageVisit {
  path: string;
  id: PromiseLike<number | null>;
  activeMs: number;
  shownAt: number | null; // null mientras la pestaña está oculta
  maxScroll: number;
  startedAt: number;
}
let current: PageVisit | null = null;

function scrollPct() {
  const doc = document.documentElement;
  const total = doc.scrollHeight;
  if (total <= window.innerHeight + 10) return null; // página sin desplazamiento (por ejemplo un tour)
  return Math.min(100, Math.round(((window.scrollY + window.innerHeight) / total) * 100));
}

// Se envía con keepalive para que llegue aunque la persona cierre la pestaña
function sendEnd(v: PageVisit) {
  const ms = v.activeMs + (v.shownAt != null ? Date.now() - v.shownAt : 0);
  v.id.then((id) => {
    if (id == null) return;
    fetch(`${SUPABASE_URL}/rest/v1/rpc/end_visit`, {
      method: "POST",
      keepalive: true,
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_id: id, p_visitor: visitor, p_seconds: Math.round(ms / 1000), p_scroll: v.maxScroll || null }),
    }).catch(() => undefined);
  });
}

function endCurrent() {
  if (current) sendEnd(current);
  current = null;
}

/** Empieza a contar una página (cierra la anterior) */
export function startPageVisit(path: string, opts: { tourId?: string } = {}) {
  try {
    if (!enabled()) return;
    // La misma página dos veces seguidas (React la monta dos veces en desarrollo) cuenta una sola vez
    if (current?.path === path && Date.now() - current.startedAt < 1500) return;
    endCurrent();
    current = { path, id: insertVisit(path, opts), activeMs: 0, shownAt: document.hidden ? null : Date.now(), maxScroll: scrollPct() ?? 0, startedAt: Date.now() };
  } catch {
    current = null; // el registro nunca debe romper la página
  }
}

/** Cada foto que se mira dentro de un tour */
export function recordSceneView(path: string, tourId: string, sceneId: string) {
  if (enabled()) insertVisit(path, { tourId, sceneId });
}

// ── Interacciones: botones y enlaces que se tocan ──────────────────────────
function describe(el: Element): { kind: string; label: string } {
  const href = el instanceof HTMLAnchorElement ? el.href : "";
  const text =
    el.getAttribute("data-track") ||
    el.getAttribute("aria-label") ||
    el.getAttribute("title") ||
    (el.textContent || "").replace(/\s+/g, " ").trim();
  let kind = "click";
  if (/wa\.me|whatsapp\.com/i.test(href)) kind = "whatsapp";
  else if (href.startsWith("tel:")) kind = "phone";
  else if (href.startsWith("mailto:")) kind = "email";
  else if (href && !href.startsWith(location.origin)) kind = "link";
  const label = (text || (kind === "link" ? new URL(href).hostname : kind)).slice(0, 80);
  return { kind, label };
}

function onClick(e: MouseEvent) {
  const v = current;
  if (!v) return;
  try {
    const el = (e.target as Element | null)?.closest?.("a, button, [role=button]");
    if (!el) return;
    const { kind, label } = describe(el);
    v.id.then((id) => {
      if (id == null) return;
      rpc("record_event", { p_visit: id, p_visitor: visitor, p_kind: kind, p_label: label }).then(undefined, () => undefined);
    });
  } catch {
    /* el registro nunca debe romper la página */
  }
}

if (typeof window !== "undefined") {
  document.addEventListener("click", onClick, { capture: true, passive: true });
  window.addEventListener("scroll", () => {
    if (!current) return;
    const p = scrollPct();
    if (p != null && p > current.maxScroll) current.maxScroll = p;
  }, { passive: true });
  // Al ocultar la pestaña (cambiar de app, cerrar) se guarda el tiempo; si vuelve, sigue contando
  document.addEventListener("visibilitychange", () => {
    const v = current;
    if (!v) return;
    if (document.hidden) {
      if (v.shownAt != null) v.activeMs += Date.now() - v.shownAt;
      v.shownAt = null;
      sendEnd(v);
    } else {
      v.shownAt = Date.now();
    }
  });
}

// Páginas que no se cuentan: panel, inicio de sesión, huéspedes y Cana Track.
// Los tours (/tour/…) los registra TourPage con su id.
const SKIP = /^\/(admin|login|update-password|compartir|guest|track|tour\/)/;

/** Registra cada página pública que se abre (va dentro del router) */
export function VisitTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!SKIP.test(pathname)) startPageVisit(pathname);
    // Al salir hacia el panel u otra página no contada se cierra la visita anterior
    // (un tour ya la cerró al empezar la suya: TourPage corre antes que este efecto)
    else if (current && current.path !== pathname) endCurrent();
  }, [pathname]);
  return null;
}
