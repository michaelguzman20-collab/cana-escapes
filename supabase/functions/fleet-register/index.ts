// Registro automático de choferes en Cana Flota: si el correo no tiene cuenta,
// la crea (ya confirmada) como chofer activo. La app entra justo después con
// signInWithPassword. El administrador puede desactivar choferes desde la app.
// Body: { email, password }
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
    const { email: rawEmail, password } = await req.json();
    const email = String(rawEmail ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Escribe un correo válido." }, 400);
    }
    if (String(password ?? "").length < 6) {
      return json({ error: "La contraseña debe tener al menos 6 caracteres." }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    if (createErr) {
      // El correo ya tiene cuenta: la contraseña que escribió no es la correcta
      if (/already|registered|exists/i.test(createErr.message)) {
        return json({ error: "exists" }, 409);
      }
      throw createErr;
    }

    const userId = created.user!.id;

    const { error: profErr } = await admin
      .from("profiles")
      .upsert({ id: userId, email, role: "driver" });
    if (profErr) throw profErr;

    const { error: drvErr } = await admin
      .from("fleet_drivers")
      .insert({ user_id: userId, name: email.split("@")[0] });
    if (drvErr) throw drvErr;

    return json({ success: true });
  } catch (err) {
    return json({ error: (err as Error).message }, 400);
  }
});
