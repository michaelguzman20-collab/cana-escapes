import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// En local, vite no ejecuta las funciones de /api (eso lo hace Vercel). Este middleware sirve
// /api/tours-upload (firma de subidas a Cloudflare R2) durante `npm run dev`.
function localApi(): Plugin {
  return {
    name: "local-api",
    configureServer(server) {
      Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), ""));
      server.middlewares.use("/api/tours-upload", async (req, res) => {
        try {
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const mod = await server.ssrLoadModule("/api/tours-upload.ts");
          const handler = req.method === "POST" ? mod.POST : null;
          if (!handler) {
            res.statusCode = 405;
            return res.end();
          }
          const r: Response = await handler(
            new Request("http://localhost/api/tours-upload", {
              method: "POST",
              headers: req.headers as Record<string, string>,
              body: Buffer.concat(chunks),
            })
          );
          res.statusCode = r.status;
          res.setHeader("Content-Type", r.headers.get("content-type") ?? "application/json");
          res.end(Buffer.from(await r.arrayBuffer()));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApi()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // El worker de MapLibre (ver ZoneMap.tsx) es un módulo ES
  worker: {
    format: "es",
  },
  server: {
    host: true, // listen on all network interfaces (0.0.0.0)
    port: 5173,
    // Fotos 360 por /media, como en producción. Se piden a canaescapes.com/media (caché de Vercel
    // delante de R2) porque r2.dev corta conexiones con frecuencia.
    proxy: {
      "/media": { target: "https://canaescapes.com", changeOrigin: true },
    },
  },
});
