import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, User, BarChart3, CalendarDays, TrendingUp, Wrench, Receipt, Landmark, Moon, Calendar, PieChart } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const SECTIONS = [
  { id: "financiero", label: "Financiero", icon: BarChart3 },
  { id: "ocupacion", label: "Ocupación", icon: Moon },
  { id: "reservas", label: "Reservas", icon: CalendarDays },
  { id: "calendario", label: "Calendario", icon: Calendar },
  { id: "tendencia", label: "Tendencia", icon: TrendingUp },
  { id: "plataformas", label: "Plataformas", icon: PieChart },
  { id: "mantenimiento", label: "Mant.", icon: Wrench },
  { id: "cargos", label: "Cargos", icon: Receipt },
  { id: "pagos", label: "Pagos", icon: Landmark },
];

export function GuestNav() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === "/guest/dashboard" || location.pathname === "/dev/portal";

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <header className="sticky top-0 z-10">
      <div className="bg-[#0F2B4C] border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Logo size="sm" variant="light" compact />

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white/10">
                <User size={12} className="text-white/70" />
              </div>
              <span className="text-xs text-white/60 hidden sm:block max-w-[140px] truncate">
                {profile?.email}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-white/50 hover:text-white hover:bg-white/10 h-8 px-2 text-xs"
            >
              <LogOut size={13} className="mr-1" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </div>

      {isDashboard && (
        <div className="bg-[#0F2B4C]/95 backdrop-blur border-b border-white/5">
          <div className="max-w-5xl mx-auto px-2 sm:px-6">
            <div
              className="flex gap-0.5 overflow-x-auto py-1.5"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
