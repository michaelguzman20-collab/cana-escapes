import { createClient } from "@supabase/supabase-js";
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
  useServiceRole ? serviceRoleKey! : (supabaseAnonKey ?? "placeholder")
);
