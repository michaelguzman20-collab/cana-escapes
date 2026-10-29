// Consulta mínima a Supabase para que el plan gratuito no pause el proyecto por inactividad
// (lo pausa tras ~7 días sin uso). La llama el cron de vercel.json una vez al día.
// La carpeta que se publica en Vercel no lleva @types/node: solo se usa process.env
declare const process: { env: Record<string, string | undefined> };

export async function GET() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return Response.json({ ok: false, error: "Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY" }, { status: 500 });
  }

  const res = await fetch(`${url}/rest/v1/app_releases?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });

  return Response.json({ ok: res.ok, status: res.status, at: new Date().toISOString() }, { status: res.ok ? 200 : 502 });
}
