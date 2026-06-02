import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { logAccess } from "@/lib/logAccess";
import type { Profile, UserRole } from "@/types/database";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  profileReady: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Only enable DEV_ADMIN bypass on localhost — when accessing from network IP
// (e.g., phone testing), require normal login so a real Supabase session is created.
const isLocalhost = typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
const DEV_ADMIN = import.meta.env.DEV && import.meta.env.VITE_DEV_ADMIN === "true" && isLocalhost;

const DEV_SESSION = {
  user: { id: "5749a3e0-3737-40d9-9dc3-b74362aa51eb", email: "michael@canaescapes.com" },
  access_token: "dev-token",
} as unknown as Session;

const DEV_PROFILE = {
  id: "5749a3e0-3737-40d9-9dc3-b74362aa51eb",
  email: "michael@canaescapes.com",
  role: "admin" as const,
  created_at: new Date().toISOString(),
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(DEV_ADMIN ? DEV_SESSION : null);
  const [profile, setProfile] = useState<Profile | null>(DEV_ADMIN ? DEV_PROFILE : null);
  // Always start loading=true so the Supabase client finishes token validation
  // (via getSession()) before any data queries run. This prevents the race where
  // an expired token is sent and PostgREST returns empty rows as anon.
  const [loading, setLoading] = useState(!DEV_ADMIN);
  const [profileReady, setProfileReady] = useState(DEV_ADMIN);

  async function fetchProfile(userId: string, email?: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error && error.code === "PGRST116" && email) {
      // Profile doesn't exist yet — create it (guest by default)
      const { data: newProfile, error: insertError } = await supabase
        .from("profiles")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert({ id: userId, email, role: "guest" } as any)
        .select()
        .single();
      if (insertError) {
        console.error("Error creating profile:", insertError.message);
        return null;
      }
      return newProfile;
    }

    if (error) {
      console.error("Error fetching profile:", error.message);
      return null;
    }
    return data;
  }

  useEffect(() => {
    // In dev admin mode, skip all Supabase auth
    if (DEV_ADMIN) return;

    // ── Step 1: subscribe to future auth changes (login / logout / token refresh)
    // This MUST be registered before getSession() so we never miss an event.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Only handle post-init events here; INITIAL_SESSION is handled by getSession() below.
      // TOKEN_REFRESHED, SIGNED_IN, SIGNED_OUT, etc.
      if (_event === "INITIAL_SESSION") return;

      setSession(session);
      if (session?.user) {
        const p = await fetchProfile(session.user.id, session.user.email);
        setProfile(p);
        setProfileReady(true);
        if (_event === "SIGNED_IN") {
          logAccess({
            user_id:    session.user.id,
            user_email: session.user.email ?? "",
            user_role:  p?.role ?? null,
            action:     "login",
          });
        }
      } else {
        setProfileReady(true);
        if (_event === "SIGNED_OUT") {
          setProfile((prev) => {
            if (prev) {
              logAccess({
                user_id:    prev.id,
                user_email: prev.email,
                user_role:  prev.role,
                action:     "logout",
              });
            }
            return null;
          });
        } else {
          setProfile(null);
        }
      }
    });

    // ── Step 2: getSession() validates + refreshes the stored token.
    // We ALWAYS call this (no hasStoredSession shortcut) so the Supabase client
    // has a confirmed, fresh JWT before any data queries run.
    // loading stays true until this resolves → RequireAuth shows a spinner →
    // useProperties never fires with a stale/expired token.
    const timeout = setTimeout(() => {
      supabase.auth.signOut({ scope: "local" }).catch(() => {});
      setSession(null);
      setProfile(null);
      setLoading(false);
      setProfileReady(true);
    }, 3000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        try {
          const p = await fetchProfile(session.user.id, session.user.email);
          setProfile(p);
        } catch {
          // Profile fetch failed — continue without it
        }
      }
      setProfileReady(true);
      setLoading(false);
    }).catch(() => {
      supabase.auth.signOut({ scope: "local" }).catch(() => {});
      setSession(null);
      setProfile(null);
      setProfileReady(true);
      setLoading(false);
    }).finally(() => {
      clearTimeout(timeout);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const timeoutPromise = new Promise<{ error: string }>((_res, rej) =>
      setTimeout(() => rej(new Error("timeout")), 10000)
    );
    try {
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeoutPromise,
      ]) as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;
      if (result.error) return { error: result.error.message };
      return { error: null };
    } catch {
      return { error: "No se pudo conectar. Desactiva tu VPN e intenta de nuevo." };
    }
  }

  async function signOut() {
    if (DEV_ADMIN) return;
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        role: profile?.role ?? null,
        loading,
        profileReady,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
