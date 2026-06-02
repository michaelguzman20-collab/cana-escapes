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

    // Parse body
    const { email, password, property_id } = await req.json();
    if (!email || !password) throw new Error("Email y contraseña requeridos");

    // Use service role to create the auth user
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

    // Insert profile with guest role
    await admin
      .from("profiles")
      .upsert({ id: newUserId, email, role: "guest" });

    // Link property if provided
    if (property_id) {
      await admin
        .from("properties")
        .update({ owner_profile_id: newUserId })
        .eq("id", property_id);
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUserId }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
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
