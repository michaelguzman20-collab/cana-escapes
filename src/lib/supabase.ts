import { createClient, processLock } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined;

export const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

const isLocalhost = typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
const useServiceRole = import.meta.env.DEV &&
  import.meta.env.VITE_DEV_ADMIN === "true" &&
  isLocalhost &&
  !!serviceRoleKey;

export const supabase = createClient<Database>(
  supabaseUrl ?? "https://placeholder.supabase.co",
  useServiceRole ? serviceRoleKey! : (supabaseAnonKey ?? "placeholder"),
  {
    auth: {
      // Por defecto Supabase usa un candado del navegador compartido entre pestañas para renovar
      // la sesión. Tras un rato sin usar la página (pestaña dormida u otra pestaña abierta) ese
      // candado podía quedarse trabado para siempre: la página no cargaba ni al actualizar y había
      // que borrar los datos del sitio. processLock es por pestaña y con tiempo máximo de espera.
      lock: processLock,
    },
  }
);
