import { useState, useRef, useEffect } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, CalendarDays, CalendarRange, Settings, LogOut, User, Users, Globe, UserCheck, Receipt, TrendingUp, Landmark, Wrench, Banknote, Bell, CheckCheck, KeyRound, MessageCircle } from "lucide-react";
import { Logo } from "./Logo";
import { PropertySwitcher } from "./PropertySwitcher";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminNotifications, useMarkNotificationRead, useMarkAllRead } from "@/hooks/useAdminNotifications";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin/dashboard",     icon: LayoutDashboard, label: "Dashboard"       },
  { to: "/admin/reservas",      icon: CalendarDays,    label: "Reservas"        },
  { to: "/admin/huespedes",     icon: Users,           label: "Huéspedes"       },
  { to: "/admin/calendario",    icon: CalendarRange,   label: "Calendario"      },
  { to: "/admin/mantenimiento", icon: Wrench,          label: "Mantenimiento"   },
  { to: "/admin/plataformas",   icon: Globe,           label: "Plataformas"     },
  { to: "/admin/propietarios",  icon: UserCheck,       label: "Propietarios"    },
  { to: "/admin/cargos",        icon: Receipt,         label: "Cargos Prop."    },
  { to: "/admin/pagos-propietarios", icon: Banknote,   label: "Pagos Prop."     },
  { to: "/admin/cana-escapes",  icon: TrendingUp,      label: "Cana Escapes"    },
  { to: "/admin/contabilidad",  icon: Landmark,        label: "Financiero"      },
  { to: "/admin/whatsapp",      icon: MessageCircle,   label: "WhatsApp Bot"    },
  { to: "/admin/configuracion", icon: Settings,        label: "Configuración"   },
];

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

function NotificationBell({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const { data: notifications = [] } = useAdminNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "relative flex items-center justify-center rounded-full transition-colors",
          variant === "desktop"
            ? "w-9 h-9 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
            : "w-8 h-8 bg-white/10 hover:bg-white/15 text-white/60 hover:text-white"
        )}
      >
        <Bell size={variant === "desktop" ? 16 : 15} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden",
            variant === "desktop"
              ? "right-0 top-11 w-80"
              : "right-0 top-10 w-[calc(100vw-24px)] max-w-sm"
          )}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h3 className="text-sm font-semibold text-[#0F2B4C]">Notificaciones</h3>
            {unread > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium"
              >
                <CheckCheck size={12} />
                Marcar todo leído
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-xs text-gray-400">Sin notificaciones</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { if (!n.read) markRead.mutate(n.id); }}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3",
                    !n.read && "bg-blue-50/50"
                  )}
                >
                  <div className={cn(
                    "mt-0.5 flex items-center justify-center w-7 h-7 rounded-full shrink-0",
                    n.type === "password_reset" ? "bg-amber-100" : "bg-blue-100"
                  )}>
                    <KeyRound size={13} className={n.type === "password_reset" ? "text-amber-600" : "text-blue-600"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs", !n.read ? "font-semibold text-[#0F2B4C]" : "font-medium text-gray-600")}>
                      {n.title}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && (
                    <div className="mt-2 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminNav() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <>
      {/* ══ DESKTOP SIDEBAR (md+) ══════════════════════════════════════════ */}
      <aside className="hidden md:flex w-64 min-h-screen bg-[#0F2B4C] flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-6 flex justify-center border-b border-white/10">
          <Link
            to="/admin/dashboard"
            className="block transition-opacity hover:opacity-85 focus:outline-none"
            aria-label="Ir al dashboard"
          >
            <Logo size="sm" variant="light" />
          </Link>
        </div>

        {/* Notification bell */}
        <div className="flex justify-end px-4 py-2 border-b border-white/10">
          <NotificationBell variant="desktop" />
        </div>

        {/* Property switcher */}
        <div className="border-b border-white/10 pb-1 pt-1">
          <p className="px-6 pt-2 pb-1 text-[9px] font-bold text-white/30 uppercase tracking-widest">
            Propiedad activa
          </p>
          <PropertySwitcher />
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#F0A030] text-[#0F2B4C]"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/5">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F0A030]/20">
              <User size={13} className="text-[#F0A030]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{profile?.email}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Administrador</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-white/60 hover:text-white hover:bg-white/10"
            onClick={handleSignOut}
          >
            <LogOut size={13} className="mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* ══ MOBILE TOP HEADER (< md) ══════════════════════════════════════ */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0F2B4C] border-b border-white/10">
        {/* Logo row — compact horizontal layout for mobile */}
        <div className="h-12 px-3 flex items-center justify-between">
          <Link to="/admin/dashboard" aria-label="Ir al dashboard" className="min-w-0">
            <Logo size="sm" variant="light" compact />
          </Link>
          <div className="flex items-center gap-1 shrink-0">
            <NotificationBell variant="mobile" />
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F0A030]/15">
              <User size={14} className="text-[#F0A030]" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-white/60 hover:text-white hover:bg-white/10 h-9 w-9 p-0"
            >
              <LogOut size={16} />
            </Button>
          </div>
        </div>
        {/* Property switcher row */}
        <PropertySwitcher />
      </header>

      {/* ══ MOBILE BOTTOM NAV (< md) ══════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0F2B4C] border-t border-white/10">
        <div className="flex overflow-x-auto scrollbar-none" style={{ scrollbarWidth: "none" }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "shrink-0 min-w-[72px] flex flex-col items-center justify-center py-2 px-2 gap-1 transition-colors",
                  "text-[10px] font-medium",
                  isActive ? "text-[#F0A030] bg-white/5" : "text-white/60 hover:text-white/90"
                )
              }
            >
              <Icon size={20} />
              <span className="whitespace-nowrap">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
