import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { GuestNav } from "./GuestNav";
import { useAuth } from "@/contexts/AuthContext";
import { logAccess } from "@/lib/logAccess";

export function GuestLayout() {
  const { user, profile } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      logAccess({
        user_id:    user.id,
        user_email: user.email ?? "",
        user_role:  profile?.role ?? null,
        action:     "page_visit",
        page:       location.pathname,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, user?.id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8]">
      <GuestNav />
      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <Outlet />
      </main>
    </div>
  );
}
