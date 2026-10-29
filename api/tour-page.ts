// /tour/:slug → esta función (rewrite en vercel.json). Devuelve el index.html del sitio con el SEO del
// tour (nombre, descripción, foto de portada), para que al compartir el enlace por WhatsApp/Facebook
// se vea la vista previa del tour y no la de la portada. React carga igual que siempre.
// Variables de entorno: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (solo se leen tours publicados).

import { injectSeo } from "./_seo";
// La carpeta que se publica en Vercel no lleva @types/node: solo se usa process.env
declare const process: { env: Record<string, string | undefined> };


const SITE = "https://canaescapes.com";
const DEFAULT_DESC = "Recorrido virtual 360° de una propiedad gestionada por Cana Escapes en Punta Cana.";

interface TourRow {
  title: string;
  description: string | null;
  cover_url: string | null;
  location: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
}

async function fetchTour(slug: string): Promise<TourRow | null> {
  const url = process.env.VITE_SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon || !/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  try {
    const r = await fetch(
      `${url}/rest/v1/tours?slug=eq.${slug}&published=eq.true&select=title,description,cover_url,location,bedrooms,bathrooms&limit=1`,
      { headers: { apikey: anon, Authorization: `Bearer ${anon}` }, signal: AbortSignal.timeout(4000) }
    );
    if (!r.ok) return null;
    const rows = (await r.json()) as TourRow[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

// Fotos en R2: por canaescapes.com/media (igual que el visor)
const imageUrl = (u: string | null) => (u ? u.replace(/^https:\/\/pub-[a-f0-9]+\.r2\.dev\//, `${SITE}/media/`) : undefined);

function summary(t: TourRow) {
  const facts = [t.location, t.bedrooms != null ? `${t.bedrooms} hab.` : null, t.bathrooms != null ? `${t.bathrooms} baños` : null]
    .filter(Boolean)
    .join(" · ");
  const desc = t.description?.trim() || DEFAULT_DESC;
  const text = facts ? `${facts}. ${desc}` : desc;
  return text.length > 300 ? text.slice(0, 297).trimEnd() + "…" : text;
}

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const slug = (new URL(req.url).searchParams.get("slug") ?? "").toLowerCase();
  // index.html del mismo despliegue (los nombres de los archivos JS cambian en cada versión)
  const [page, tour] = await Promise.all([fetch(`${origin}/index.html`).then((r) => r.text()), fetchTour(slug)]);
  const html = tour
    ? injectSeo(page, {
        title: `${tour.title} — Tour 360 | Cana Escapes`,
        description: summary(tour),
        url: `${SITE}/tour/${slug}`,
        image: imageUrl(tour.cover_url),
        imageAlt: `${tour.title} — recorrido virtual 360°`,
      })
    : injectSeo(page, {
        title: "Tour 360 | Cana Escapes",
        description: DEFAULT_DESC,
        url: `${SITE}/tour/${slug}`,
        noindex: true, // borrador o inexistente: que no aparezca en buscadores
      });
  return new Response(html, {
    status: tour ? 200 : 404,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
