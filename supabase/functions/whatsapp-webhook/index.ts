// ============================================================================
//  CanaEscapes — Webhook de WhatsApp (el "cerebro" del bot)
// ----------------------------------------------------------------------------
//  Qué hace, en simple:
//   1. Meta llama a esta función cada vez que entra un mensaje de un cliente.
//   2. Revisa si el bot está ENCENDIDO (config.bot_activo) y si ese cliente
//      no está en "modo humano" (contactos.modo_humano).
//   3. Arma el contexto con la Base de Conocimiento + FAQs.
//   4. Le pregunta a Claude y obtiene una respuesta.
//   5. La envía por WhatsApp y guarda todo en la tabla "conversaciones".
//
//  Coexistence: si TÚ respondes manualmente desde el teléfono, Meta nos avisa
//  con un "echo". Cuando eso pasa, ponemos al cliente en modo_humano para que
//  el bot no te pise la respuesta.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Variables de entorno (se configuran como "secrets" en Supabase) --------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN")!;
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN")!;

const GRAPH_VERSION = "v21.0";
const CLAUDE_MODEL = "claude-haiku-4-5-20251001";

const db = createClient(SUPABASE_URL, SERVICE_ROLE);

// ----------------------------------------------------------------------------
Deno.serve(async (req) => {
  const url = new URL(req.url);

  // === 1) Verificación del webhook (Meta hace un GET la primera vez) =========
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge ?? "", { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // === 2) Mensajes entrantes (Meta hace POST) ===============================
  if (req.method === "POST") {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response("ok", { status: 200 });
    }

    // Procesamos en segundo plano y respondemos 200 de inmediato a Meta,
    // para que no reintente ni marque el webhook como lento.
    const work = handleEvent(body).catch((e) =>
      console.error("Error procesando evento:", e)
    );
    // @ts-ignore  EdgeRuntime existe en el entorno de Supabase
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(work);
    else await work;

    return new Response("ok", { status: 200 });
  }

  return new Response("Method not allowed", { status: 405 });
});

// ============================================================================
//  Procesa un evento de webhook de WhatsApp
// ============================================================================
async function handleEvent(body: any) {
  const entry = body?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  if (!value) return;

  // --- (A) Mensajes que TÚ enviaste manualmente desde el teléfono ----------
  //     En coexistence llegan como "echoes". Activamos modo humano.
  const echoes = value?.message_echoes ?? value?.smb_message_echoes;
  if (Array.isArray(echoes)) {
    for (const echo of echoes) {
      const to = echo?.to;
      const text = extractText(echo);
      if (!to) continue;
      await ensureContacto(to, null);
      await db.from("contactos").update({ modo_humano: true }).eq("telefono", to);
      await db.from("conversaciones").insert({
        telefono: to,
        mensaje: "",
        respuesta: text ?? "[mensaje manual]",
        tipo: "humano",
        wa_message_id: echo?.id ?? null,
      });
    }
    return;
  }

  // --- (B) Mensajes entrantes de clientes ----------------------------------
  const messages = value?.messages;
  if (!Array.isArray(messages)) return;

  // Número de teléfono que recibió el mensaje (sirve para responder por el
  // mismo número, sea el de prueba o el real). Cae al env var si no viene.
  const phoneNumberId = value?.metadata?.phone_number_id ?? PHONE_NUMBER_ID;

  const contacts = value?.contacts ?? [];
  const profileName = contacts?.[0]?.profile?.name ?? null;

  for (const msg of messages) {
    const from = msg?.from;
    const waId = msg?.id;
    const text = extractText(msg);
    if (!from || !text) continue;

    const nombre = profileName ?? "Desconocido";

    // ── Anti-duplicados ATÓMICO ──────────────────────────────────────────
    // Meta a veces entrega el MISMO mensaje por dos rutas casi a la vez.
    // Insertamos primero, usando wa_message_id como "candado" (índice único).
    // Si otra copia ya lo insertó, este insert falla y la ignoramos. Así el
    // bot responde UNA sola vez.
    if (waId) {
      const { error: claimErr } = await db.from("conversaciones").insert({
        telefono: from, nombre, mensaje: text, respuesta: "",
        tipo: "ia", para_revisar: false, wa_message_id: waId,
      });
      if (claimErr) continue; // duplicado: ya lo está atendiendo otra copia
    }

    const contacto = await ensureContacto(from, profileName);
    const botActivo = (await getConfig("bot_activo")) === "true";
    const modoHumano = contacto?.modo_humano === true;

    // Apagado o en modo humano: registramos el mensaje pero NO respondemos.
    if (!botActivo || modoHumano) {
      if (waId) {
        await db.from("conversaciones").update({ tipo: "humano" }).eq("wa_message_id", waId);
      } else {
        await db.from("conversaciones").insert({
          telefono: from, nombre, mensaje: text, respuesta: "",
          tipo: "humano", para_revisar: false, wa_message_id: null,
        });
      }
      continue;
    }

    // El bot responde
    const { reply, tipo } = await generarRespuesta(text, from);
    await enviarWhatsApp(from, reply, phoneNumberId);

    if (waId) {
      await db.from("conversaciones").update({ respuesta: reply, tipo }).eq("wa_message_id", waId);
    } else {
      await db.from("conversaciones").insert({
        telefono: from, nombre, mensaje: text, respuesta: reply,
        tipo, para_revisar: false, wa_message_id: null,
      });
    }
  }
}

// ============================================================================
//  Genera la respuesta: primero busca FAQ exacta, si no, usa Claude
// ============================================================================
async function generarRespuesta(
  mensaje: string,
  telefono: string
): Promise<{ reply: string; tipo: "ia" | "faq" }> {
  // 1) ¿Hay una FAQ que calce por palabra clave?
  const faq = await buscarFAQ(mensaje);
  if (faq) {
    await db
      .from("faqs")
      .update({ usos: (faq.usos ?? 0) + 1 })
      .eq("id", faq.id);
    return { reply: faq.respuesta, tipo: "faq" };
  }

  // 2) Construir el contexto para Claude
  const [kb, cfg, historial] = await Promise.all([
    db.from("base_conocimiento").select("categoria,titulo,contenido").eq("activo", true),
    getAllConfig(),
    db
      .from("conversaciones")
      .select("mensaje,respuesta")
      .eq("telefono", telefono)
      .neq("respuesta", "")
      .order("fecha", { ascending: false })
      .limit(6),
  ]);

  const kbTexto = (kb.data ?? [])
    .map((k) => `### ${k.categoria} — ${k.titulo}\n${k.contenido}`)
    .join("\n\n");

  const nombreBot = cfg["bot_nombre"] ?? "Asistente Virtual";
  const tono = cfg["bot_tono"] ?? "amable y profesional";
  const instrucciones = cfg["bot_instrucciones"] ?? "";
  const descripcion = cfg["bot_descripcion"] ?? "CanaEscapes es una empresa de gestión y alquiler de propiedades de lujo en Punta Cana, República Dominicana.";
  const ahora = new Intl.DateTimeFormat("es-DO", {
    timeZone: "America/Santo_Domingo", weekday: "long", day: "numeric",
    month: "long", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date());

  const system = `Eres "${nombreBot}" de CanaEscapes.
${descripcion}

CONTEXTO TEMPORAL (hora de República Dominicana): ${ahora}. Usa esto para saludar acorde al día de la semana y al momento del día.

TONO: ${tono}. Estilo cálido, cercano y servicial, pero profesional. Mensajes cortos y claros (es WhatsApp).

IDIOMA: Responde SIEMPRE en el mismo idioma en que te escribe el cliente (español o inglés). Detéctalo automáticamente.

REGLAS:
- Usa ÚNICAMENTE la información de la BASE DE CONOCIMIENTO de abajo para datos concretos (precios, propiedades, políticas, disponibilidad).
- Si no sabes algo o no está en la base de conocimiento, NO lo inventes. Di amablemente que un asesor humano le confirmará en breve.
- Nunca prometas precios o fechas que no estén confirmados en la base de conocimiento.
- Si el cliente quiere reservar o hablar con una persona, dile que con gusto un asesor le atenderá.
${instrucciones ? `\nINSTRUCCIONES DEL NEGOCIO:\n${instrucciones}\n` : ""}
BASE DE CONOCIMIENTO:
${kbTexto || "(sin información cargada todavía)"}`;

  // Historial reciente (más antiguo primero)
  const previos = (historial.data ?? []).reverse();
  const messages: { role: "user" | "assistant"; content: string }[] = [];
  for (const h of previos) {
    if (h.mensaje) messages.push({ role: "user", content: h.mensaje });
    if (h.respuesta) messages.push({ role: "assistant", content: h.respuesta });
  }
  messages.push({ role: "user", content: mensaje });

  // 3) Llamar a Claude
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 600,
        system,
        messages,
      }),
    });
    const data = await res.json();
    const reply = data?.content?.[0]?.text?.trim();
    if (reply) return { reply, tipo: "ia" };
    console.error("Respuesta de Claude sin texto:", JSON.stringify(data));
  } catch (e) {
    console.error("Error llamando a Claude:", e);
  }

  return {
    reply:
      "¡Gracias por escribir a CanaEscapes! 🌴 En un momento un asesor te atiende personalmente.",
    tipo: "ia",
  };
}

// ============================================================================
//  Helpers
// ============================================================================
function extractText(msg: any): string | null {
  if (!msg) return null;
  if (msg.type === "text" || msg.text) return msg.text?.body ?? null;
  if (msg.type === "button") return msg.button?.text ?? null;
  if (msg.type === "interactive") {
    return (
      msg.interactive?.button_reply?.title ??
      msg.interactive?.list_reply?.title ??
      null
    );
  }
  return null;
}

async function ensureContacto(telefono: string, nombre: string | null) {
  const { data: existing } = await db
    .from("contactos")
    .select("*")
    .eq("telefono", telefono)
    .maybeSingle();

  if (existing) {
    await db
      .from("contactos")
      .update({
        ultimo_contacto: new Date().toISOString(),
        total_mensajes: (existing.total_mensajes ?? 0) + 1,
        ...(nombre && existing.nombre === "Desconocido" ? { nombre } : {}),
      })
      .eq("telefono", telefono);
    return existing;
  }

  const { data: created } = await db
    .from("contactos")
    .insert({
      telefono,
      nombre: nombre ?? "Desconocido",
      total_mensajes: 1,
    })
    .select()
    .maybeSingle();
  return created;
}

async function buscarFAQ(mensaje: string) {
  const { data } = await db.from("faqs").select("*").eq("activo", true);
  if (!data?.length) return null;
  const texto = mensaje.toLowerCase();
  for (const faq of data) {
    const keys = (faq.keywords ?? "")
      .toLowerCase()
      .split(",")
      .map((k: string) => k.trim())
      .filter(Boolean);
    if (keys.some((k: string) => k.length > 2 && texto.includes(k))) {
      return faq;
    }
  }
  return null;
}

async function getConfig(clave: string): Promise<string | null> {
  const { data } = await db
    .from("config")
    .select("valor")
    .eq("clave", clave)
    .maybeSingle();
  return data?.valor ?? null;
}

async function getAllConfig(): Promise<Record<string, string>> {
  const { data } = await db.from("config").select("clave,valor");
  const out: Record<string, string> = {};
  for (const row of data ?? []) out[row.clave] = row.valor;
  return out;
}

async function enviarWhatsApp(to: string, text: string, phoneNumberId = PHONE_NUMBER_ID) {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    }
  );
  if (!res.ok) {
    console.error("Error enviando WhatsApp:", await res.text());
  }
}
