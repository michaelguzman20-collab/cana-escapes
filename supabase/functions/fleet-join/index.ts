// Entrada rápida a Cana Track: el usuario solo pone nombre, WhatsApp y (opcional) vehículo.
// Se crea una cuenta interna para ese teléfono (correo generado + contraseña que inventa
// la app) y la app entra con ella. Si ese WhatsApp ya estaba registrado (teléfono nuevo
// o app reinstalada), se reutiliza su ficha para conservar el historial.
// Body: { name, phone, vehicle?, password }  →  { email }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const body = await req.json();
    const { name: rawName, phone: rawPhone, vehicle: rawVehicle, password } = body;
    const name = String(rawName ?? "").trim().slice(0, 60);
    let phone = String(rawPhone ?? "").replace(/\D/g, "");
    if (phone.length === 10) phone = `1${phone}`; // número dominicano sin el 1
    const vehicle = String(rawVehicle ?? "").trim().slice(0, 60) || null;
    const vehicleType = String(body.vehicle_type ?? "carro").trim().slice(0, 20) || "carro";

    if (!name) return json({ error: "Escribe tu nombre." }, 400);
    if (phone.length < 10 || phone.length > 15) return json({ error: "Escribe un WhatsApp válido." }, 400);
    if (String(password ?? "").length < 20) return json({ error: "Solicitud inválida." }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Freno contra registros masivos con un script: máximo 20 usuarios nuevos por hora en total
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count: recent } = await admin
      .from("fleet_drivers")
      .select("id", { count: "exact", head: true })
      .gte("created_at", hourAgo);
    if ((recent ?? 0) >= 20) return json({ error: "Demasiados registros en este momento. Inténtalo en un rato." }, 429);

    const email = `${crypto.randomUUID()}@track.canaescapes.com`;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone, source: "cana-track" },
    });
    if (createErr) throw createErr;
    const userId = created.user!.id;

    const { error: profErr } = await admin
      .from("profiles")
      .upsert({ id: userId, email, role: "driver" });
    if (profErr) throw profErr;

    const { data: existing } = await admin
      .from("fleet_drivers")
      .select("id, user_id")
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      const { error } = await admin
        .from("fleet_drivers")
        .update({ user_id: userId, name, vehicle, vehicle_type: vehicleType })
        .eq("id", existing.id);
      if (error) throw error;
      // La cuenta interna anterior ya no se usa (nunca se borran cuentas con correo real)
      if (existing.user_id && existing.user_id !== userId) {
        const { data: old } = await admin.auth.admin.getUserById(existing.user_id);
        if (old?.user?.email?.endsWith("@track.canaescapes.com")) {
          await admin.auth.admin.deleteUser(existing.user_id).catch(() => {});
        }
      }
    } else {
      const { error } = await admin
        .from("fleet_drivers")
        .insert({ user_id: userId, name, phone, vehicle, vehicle_type: vehicleType });
      if (error) throw error;
    }

    return json({ email });
  } catch (err) {
    return json({ error: (err as Error).message }, 400);
  }
});
