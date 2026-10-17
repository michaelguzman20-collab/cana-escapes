// Borra un usuario o un administrador de equipo de Cana Track (solo el administrador principal).
// Body: { driver_id } o { admin_id }
// Se borra su ficha (con historial y recorridos) y su cuenta de acceso, pero nunca
// una cuenta de administrador principal ni de propietario.
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
    const caller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "No autorizado" }, 401);
    const { data: me } = await caller.from("profiles").select("role").eq("id", user.id).single();
    if (me?.role !== "admin") return json({ error: "Solo el administrador principal" }, 403);

    const { driver_id, admin_id } = await req.json();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const table = driver_id ? "fleet_drivers" : admin_id ? "fleet_admins" : null;
    if (!table) return json({ error: "Falta driver_id o admin_id" }, 400);
    const id = driver_id ?? admin_id;

    const { data: row, error: getErr } = await admin.from(table).select("user_id").eq("id", id).maybeSingle();
    if (getErr) throw getErr;
    if (!row) return json({ error: "No existe" }, 404);

    const { error: delErr } = await admin.from(table).delete().eq("id", id);
    if (delErr) throw delErr;

    // Borra la cuenta de acceso solo si es exclusiva de Cana Track
    if (row.user_id) {
      const { data: prof } = await admin.from("profiles").select("role").eq("id", row.user_id).maybeSingle();
      const expected = driver_id ? "driver" : "track_admin";
      if (prof?.role === expected) {
        await admin.auth.admin.deleteUser(row.user_id);
      }
    }

    return json({ success: true });
  } catch (err) {
    return json({ error: (err as Error).message }, 400);
  }
});
