import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
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
  },
});
