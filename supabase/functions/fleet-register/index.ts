// Reemplazada por fleet-join (Cana Track entra con nombre y WhatsApp, sin correo).
Deno.serve(() =>
  new Response(JSON.stringify({ error: "Actualiza la app desde canaescapes.com/apps" }), {
    status: 410,
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
  })
);
