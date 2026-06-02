import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/database";

interface RequireAuthProps {
  role?: UserRole;
}

export function RequireAuth({ role }: RequireAuthProps) {
  const { session, role: userRole, loading, profileReady } = useAuth();

  // Show spinner while auth is initialising OR while we have a session but
  // the profile hasn't been loaded yet (prevents premature role redirects).
  if (loading || (session && !profileReady)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando…</p>
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (role && userRole !== role) {
    return <Navigate to={userRole === "admin" ? "/admin/dashboard" : "/guest/dashboard"} replace />;
  }

  return <Outlet />;
}
