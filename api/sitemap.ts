// /sitemap.xml → esta función (rewrite en vercel.json). Junta las páginas públicas fijas
// (dist/seo-routes.json, que genera la compilación) con los tours 360 publicados, así cada tour nuevo
// aparece solo en el mapa del sitio.
// Variables de entorno: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
// La carpeta que se publica en Vercel no lleva @types/node: solo se usa process.env
declare const process: { env: Record<string, string | undefined> };


const SITE = "https://canaescapes.com";

const PRIORITY: Record<string, string> = { "/": "1.0", "/propietarios": "0.8", "/servicios": "0.8", "/tours": "0.8", "/cana-dna": "0.7" };

async function publishedTours(): Promise<{ slug: string; updated_at: string }[]> {
  const url = process.env.VITE_SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) return [];
  try {
    const r = await fetch(`${url}/rest/v1/tours?published=eq.true&select=slug,updated_at&order=sort_order`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      signal: AbortSignal.timeout(4000),
    });
    return r.ok ? await r.json() : [];
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const [paths, tours] = await Promise.all([
    fetch(`${origin}/seo-routes.json`).then((r) => (r.ok ? (r.json() as Promise<string[]>) : ["/"])).catch(() => ["/"]),
    publishedTours(),
  ]);
  const urls = [
    ...paths.map((p) => `  <url><loc>${SITE}${p}</loc><priority>${PRIORITY[p] ?? "0.5"}</priority></url>`),
    ...tours.map((t) => `  <url><loc>${SITE}/tour/${t.slug}</loc><lastmod>${t.updated_at.slice(0, 10)}</lastmod><priority>0.7</priority></url>`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=3600" },
  });
}
