import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Recibe la actualización semanal de Cana DNA (rutina en la nube de Claude Code).
// Solo escribe en market_indicators, market_updates y market_notes.
// Autorización: header `x-cana-dna-token` = secreto CANA_DNA_INGEST_TOKEN.
// Desplegar con: npx supabase functions deploy cana-dna-ingest --no-verify-jwt

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const str = (v: unknown, max: number, required = false): string | null => {
  if (v == null || v === "") {
    if (required) throw new Error("Falta un campo de texto obligatorio");
    return null;
  }
  if (typeof v !== "string") throw new Error("Campo de texto inválido");
  const s = v.trim();
  if (s.length > max) throw new Error(`Texto demasiado largo (máx. ${max})`);
  return s;
};

const url = (v: unknown) => {
  const s = str(v, 500);
  if (s && !/^https:\/\//.test(s)) throw new Error("Las URLs deben empezar con https://");
  return s;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const expected = Deno.env.get("CANA_DNA_INGEST_TOKEN") ?? "";
  const got = req.headers.get("x-cana-dna-token") ?? "";
  if (!expected || !safeEqual(got, expected)) return json({ error: "No autorizado" }, 401);

  try {
    const body = await req.json();

    const indicators = (Array.isArray(body.indicators) ? body.indicators : []).slice(0, 20).map((i: Record<string, unknown>) => {
      const key = str(i.key, 40, true)!;
      if (!/^[a-z0-9_]+$/.test(key)) throw new Error(`key inválida: ${key}`);
      const period = str(i.period, 10, true)!;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(period)) throw new Error(`period inválido: ${period}`);
      const value = Number(i.value);
      if (!Number.isFinite(value)) throw new Error(`value inválido en ${key}`);
      return {
        key, period, value,
        period_label_es: str(i.period_label_es, 40),
        period_label_en: str(i.period_label_en, 40),
        unit: str(i.unit, 20, true),
        label_es: str(i.label_es, 80, true),
        label_en: str(i.label_en, 80, true),
        source: str(i.source, 120),
        source_url: url(i.source_url),
        updated_at: new Date().toISOString(),
      };
    });

    const notes = (Array.isArray(body.notes) ? body.notes : []).slice(0, 5).map((n: Record<string, unknown>) => {
      const kind = str(n.kind, 20, true)!;
      if (!["alert", "opportunity", "stat"].includes(kind)) throw new Error(`kind inválido: ${kind}`);
      return {
        kind,
        value: str(n.value, 30),
        title_es: str(n.title_es, 120, true),
        title_en: str(n.title_en, 120, true),
        body_es: str(n.body_es, 400),
        body_en: str(n.body_en, 400),
        source: str(n.source, 120, true),
        source_url: url(n.source_url),
        sort_order: Number.isFinite(Number(n.sort_order)) ? Number(n.sort_order) : 50,
      };
    });

    const update = {
      summary_es: str(body.summary_es, 1200, true),
      summary_en: str(body.summary_en, 1200, true),
      sources: (Array.isArray(body.sources) ? body.sources : []).slice(0, 15).map((s: unknown) => url(s)).filter(Boolean),
    };

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (indicators.length) {
      const { error } = await db.from("market_indicators").upsert(indicators, { onConflict: "key,period" });
      if (error) throw error;
    }
    if (notes.length) {
      const { error } = await db.from("market_notes").insert(notes);
      if (error) throw error;
    }
    const { data, error } = await db.from("market_updates").insert(update).select("id, ran_at").single();
    if (error) throw error;

    return json({ ok: true, update: data, indicators: indicators.length, notes: notes.length });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 400);
  }
});
