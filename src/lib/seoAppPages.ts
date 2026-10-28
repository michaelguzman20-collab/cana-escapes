// SEO de las guías y políticas de privacidad de las apps, y la lista completa de rutas públicas.
// Importes relativos (no "@/"): este archivo también lo carga vite.config.ts.
import { APP_GUIDES } from "../content/appGuides";
import { APP_POLICIES } from "../content/appPolicies";
import { SEO_PAGES, type SeoMeta } from "./seoPages";

export function guideSeo(slug: string): SeoMeta | null {
  const g = APP_GUIDES[slug];
  return g
    ? {
        title: `Guía de uso de ${g.name} — Cana Escapes`,
        description: `Cómo usar ${g.name} paso a paso: ${g.tagline.es} Disponible también en PDF.`,
      }
    : null;
}

export function privacySeo(slug: string): SeoMeta | null {
  const name = APP_GUIDES[slug]?.name;
  return APP_POLICIES[slug] && name
    ? {
        title: `Política de privacidad de ${name} — Cana Escapes`,
        description: `Qué datos usa ${name}, quién los ve, cuánto tiempo se guardan y cómo borrarlos.`,
      }
    : null;
}

/** Todas las rutas públicas fijas con su SEO (para generar su HTML y el mapa del sitio) */
export function allSeoRoutes(): ({ path: string } & SeoMeta)[] {
  const routes: ({ path: string } & SeoMeta)[] = Object.entries(SEO_PAGES).map(([path, m]) => ({ path, ...m }));
  for (const slug of Object.keys(APP_GUIDES)) {
    const g = guideSeo(slug);
    if (g) routes.push({ path: `/apps/${slug}/guia`, ...g });
    const p = privacySeo(slug);
    if (p) routes.push({ path: `/apps/${slug}/privacidad`, ...p });
  }
  return routes;
}
