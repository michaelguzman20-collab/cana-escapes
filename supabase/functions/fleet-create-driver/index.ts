// Crea la cuenta de un chofer para la app Cana Flota (solo administradores).
// Body: { name, email, password, phone?, vehicle? }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const authHeader = req.headers.get("Authorization")!;

    // Verify caller is admin
    const caller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authErr,
    } = await caller.auth.getUser();
    if (authErr || !user) throw new Error("No autorizado");

    const { data: profile } = await caller
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") throw new Error("Solo administradores");

    const { name, email, password, phone, vehicle } = await req.json();
    if (!name || !email || !password) {
      throw new Error("Nombre, email y contraseña requeridos");
    }
    if (String(password).length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres");
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
    if (createErr) throw createErr;

    const newUserId = created.user!.id;

    const { error: profErr } = await admin
      .from("profiles")
      .upsert({ id: newUserId, email, role: "driver" });
    if (profErr) throw profErr;

    const { data: driver, error: drvErr } = await admin
      .from("fleet_drivers")
      .insert({
        user_id: newUserId,
        name,
        phone: phone || null,
        vehicle: vehicle || null,
      })
      .select()
      .single();
    if (drvErr) throw drvErr;

    return new Response(JSON.stringify({ success: true, driver }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }
});
