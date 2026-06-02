import { useMemo } from "react";
import { Calendar, Moon, Wrench, Plane, LogOut as CheckOut } from "lucide-react";
import type { Reservation, MaintenanceTicket } from "@/types/database";

const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

interface Props {
  reservations: Reservation[];
  tickets: MaintenanceTicket[];
  month: number;
  year: number;
}

interface DayInfo {
  day: number;
  isCurrentMonth: boolean;
  reservation: Reservation | null;
  isCheckin: boolean;
  isCheckout: boolean;
  maintenance: MaintenanceTicket[];
}

const PLATFORM_COLORS: Record<string, string> = {
  "Airbnb": "bg-[#FF5A5F]",
  "Booking.com": "bg-[#003580]",
  "Expedia": "bg-[#FBAF17]",
  "VRBO": "bg-[#3B5998]",
  "Directo": "bg-emerald-500",
};

export function CalendarSection({ reservations, tickets, month, year }: Props) {
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    let startDow = firstDay.getDay();
    if (startDow === 0) startDow = 7;

    const active = reservations.filter((r) => r.status !== "Cancelada");

    const days: DayInfo[] = [];

    for (let i = 1; i < startDow; i++) {
      days.push({ day: 0, isCurrentMonth: false, reservation: null, isCheckin: false, isCheckout: false, maintenance: [] });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dateObj = new Date(year, month - 1, d);

      let matchedRes: Reservation | null = null;
      let isCheckin = false;
      let isCheckout = false;

      for (const r of active) {
        const cin = new Date(r.checkin + "T12:00:00");
        const cout = new Date(r.checkout + "T12:00:00");
        if (dateObj >= cin && dateObj < cout) {
          matchedRes = r;
          if (r.checkin === dateStr) isCheckin = true;
        }
        if (r.checkout === dateStr) {
          isCheckout = true;
          if (!matchedRes) matchedRes = r;
        }
      }

      const dayTickets = tickets.filter((t) => {
        if (t.fecha_programada === dateStr) return true;
        if (t.fecha_reporte === dateStr) return true;
        return false;
      });

      days.push({ day: d, isCurrentMonth: true, reservation: matchedRes, isCheckin, isCheckout, maintenance: dayTickets });
    }

    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 0; i < remaining; i++) {
        days.push({ day: 0, isCurrentMonth: false, reservation: null, isCheckin: false, isCheckout: false, maintenance: [] });
      }
    }

    return days;
  }, [reservations, tickets, month, year]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const occupiedDays = calendarDays.filter((d) => d.isCurrentMonth && d.reservation && !d.isCheckout).length;

  return (
    <div id="calendario" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#0F2B4C]/60 uppercase tracking-wider flex items-center gap-2">
          <Calendar size={14} />
          Calendario — {MONTHS_ES[month - 1]} {year}
        </h2>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-[#0F2B4C]">
          {DAYS_ES.map((d) => (
            <div key={d} className="py-2.5 text-center text-[11px] font-semibold text-white/70 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((info, i) => {
            if (!info.isCurrentMonth) {
              return <div key={i} className="h-16 sm:h-20 border-b border-r border-[#0F2B4C]/[0.06] bg-[#f8f9fb]" />;
            }

            const hasRes = !!info.reservation && !info.isCheckout;
            const hasMaint = info.maintenance.length > 0;
            const highPrioMaint = info.maintenance.some((t) => t.prioridad === "Alta" || t.prioridad === "Urgente");
            const today = new Date();
            const isToday = info.day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();
            const isWeekend = (i % 7) >= 5;
            const platformColor = info.reservation ? (PLATFORM_COLORS[info.reservation.platform] ?? "bg-[#2D6A9F]") : "";

            return (
              <div
                key={i}
                className={`relative h-16 sm:h-20 border-b border-r border-[#0F2B4C]/[0.06] p-1 sm:p-1.5 transition-colors
                  ${hasRes ? "bg-[#2D6A9F]/[0.07]" : isWeekend ? "bg-[#0F2B4C]/[0.015]" : ""}
                  ${info.isCheckin ? "ring-inset ring-1 ring-[#2D6A9F]/30" : ""}
                `}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-xs sm:text-sm font-semibold leading-none
                    ${isToday
                      ? "bg-[#2D6A9F] text-white rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-[11px] sm:text-xs"
                      : hasRes ? "text-[#2D6A9F]" : "text-[#0F2B4C]/60"
                    }
                  `}>
                    {info.day}
                  </span>
                </div>

                {/* Icons area */}
                <div className="flex flex-col items-center gap-0.5 mt-0.5">
                  {info.isCheckin && info.reservation && (
                    <div className={`w-full flex items-center justify-center gap-0.5 rounded-md py-0.5 ${platformColor} bg-opacity-15`}>
                      <Plane size={11} className="text-[#2D6A9F] sm:w-3.5 sm:h-3.5 rotate-[-45deg]" />
                      <span className="text-[7px] sm:text-[9px] font-bold text-[#2D6A9F] truncate max-w-[90%]">
                        {info.reservation.platform.replace("Booking.com", "Bkg")}
                      </span>
                    </div>
                  )}

                  {info.isCheckout && (
                    <div className="flex items-center justify-center">
                      <CheckOut size={11} className="text-[#0F2B4C]/30 sm:w-3.5 sm:h-3.5" />
                    </div>
                  )}

                  {hasRes && !info.isCheckin && !info.isCheckout && (
                    <Moon size={12} className="text-[#2D6A9F]/40 sm:w-4 sm:h-4" />
                  )}

                  {hasMaint && (
                    <div className={`flex items-center justify-center rounded-full w-5 h-5 sm:w-6 sm:h-6 ${highPrioMaint ? "bg-red-100" : "bg-amber-100"}`}>
                      <Wrench size={11} className={`sm:w-3.5 sm:h-3.5 ${highPrioMaint ? "text-red-500" : "text-amber-500"}`} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend + Summary footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-gradient-to-r from-[#0F2B4C]/[0.03] to-transparent border-t gap-2">
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-[#0F2B4C]/40">
              <strong className="text-[#0F2B4C]/70 text-sm">{occupiedDays}</strong> / {daysInMonth} noches ocupadas
            </span>
            <span className="text-[#0F2B4C]/40">
              <strong className="text-[#2D6A9F] text-sm">{((occupiedDays / daysInMonth) * 100).toFixed(0)}%</strong> ocupación
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-[#0F2B4C]/40">
            <span className="flex items-center gap-1"><Plane size={10} className="text-[#2D6A9F] rotate-[-45deg]" /> Check-in</span>
            <span className="flex items-center gap-1"><Moon size={10} className="text-[#2D6A9F]/40" /> Ocupado</span>
            <span className="flex items-center gap-1"><CheckOut size={10} className="text-[#0F2B4C]/30" /> Check-out</span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-amber-100 flex items-center justify-center"><Wrench size={7} className="text-amber-500" /></span>
              Mant.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
