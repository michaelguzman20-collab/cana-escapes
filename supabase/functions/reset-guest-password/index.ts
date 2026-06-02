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

    const { user_id, new_password } = await req.json();
    if (!user_id || !new_password) {
      throw new Error("user_id y new_password requeridos");
    }
    if (new_password.length < 8) {
      throw new Error("La contraseña debe tener al menos 8 caracteres");
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: updateErr } = await admin.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    );
    if (updateErr) throw updateErr;

    return new Response(
      JSON.stringify({ success: true }),
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
