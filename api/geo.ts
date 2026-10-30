// /api/geo → país y ciudad de quien visita, para las estadísticas de visitas (src/lib/visits.ts).
// Vercel los deduce de la conexión y los pasa en cabeceras; la IP no se lee ni se guarda.

export function GET(req: Request): Response {
  const h = req.headers;
  const country = h.get("x-vercel-ip-country");
  let city = h.get("x-vercel-ip-city");
  try {
    city = city ? decodeURIComponent(city) : null;
  } catch {
    city = null;
  }
  return Response.json(
    { country: country && /^[A-Z]{2}$/.test(country) ? country : null, city: city ? city.slice(0, 60) : null },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
