// Registro de administradores de equipo de Cana Track (desde la app).
// La cuenta queda PENDIENTE: el administrador principal la activa en
// canaescapes.com/admin/track y le asigna usuarios.
// Body: { name, phone, email, password }
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
    const { name: rawName, phone: rawPhone, email: rawEmail, password } = await req.json();
    const name = String(rawName ?? "").trim().slice(0, 60);
    const email = String(rawEmail ?? "").trim().toLowerCase();
    let phone = String(rawPhone ?? "").replace(/\D/g, "");
    if (phone.length === 10) phone = `1${phone}`;

    if (!name) return json({ error: "Escribe tu nombre." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Escribe un correo válido." }, 400);
    if (String(password ?? "").length < 6) return json({ error: "La contraseña debe tener al menos 6 caracteres." }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, source: "cana-track-admin" },
    });
    if (createErr) {
      if (/already|registered|exists/i.test(createErr.message)) {
        return json({ error: "Este correo ya tiene una cuenta. Usa «Entrar»." }, 409);
      }
      throw createErr;
    }
    const userId = created.user!.id;

    const { error: profErr } = await admin
      .from("profiles")
      .upsert({ id: userId, email, role: "track_admin" });
    if (profErr) throw profErr;

    const { error: admErr } = await admin
      .from("fleet_admins")
      .insert({ user_id: userId, name, email, phone: phone || null, active: false });
    if (admErr) throw admErr;

    return json({ success: true });
  } catch (err) {
    return json({ error: (err as Error).message }, 400);
  }
});
