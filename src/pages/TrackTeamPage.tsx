import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { AdminTrack } from "@/pages/admin/AdminTrack";

// Panel de un administrador de equipo de Cana Track: solo ve a los usuarios que
// el administrador principal le asignó (lo filtra Supabase con RLS).
export function TrackTeamPage() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <header className="bg-[#0F2B4C] h-14 px-4 flex items-center justify-between">
        <Logo size="sm" variant="light" compact />
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-xs text-white/60">{profile?.email}</span>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-white/70 hover:text-white hover:bg-white/10">
            <LogOut size={15} className="mr-1.5" /> Salir
          </Button>
        </div>
      </header>
      <AdminTrack mode="team" />
    </div>
  );
}
