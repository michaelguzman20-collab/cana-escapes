import { CalendarDays, Moon, Users, CheckCircle2, Clock, XCircle, CreditCard } from "lucide-react";
import type { Reservation } from "@/types/database";
import type { ViewMode } from "./PortalHeader";

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; bg: string; text: string }> = {
  Completada: { label: "Completada", icon: CheckCircle2, bg: "bg-emerald-50", text: "text-emerald-700" },
  Confirmada: { label: "Confirmada", icon: CheckCircle2, bg: "bg-blue-50", text: "text-blue-700" },
  Pendiente:  { label: "Pendiente",  icon: Clock,        bg: "bg-amber-50", text: "text-amber-700" },
  Cancelada:  { label: "Cancelada",  icon: XCircle,      bg: "bg-red-50", text: "text-red-700" },
};

function fmt(n: number, cur = "$") {
  return `${cur}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string) {
  const date = new Date(d + "T12:00:00");
  return date.toLocaleDateString("es-DO", { day: "numeric", month: "short" });
}

interface Props {
  reservations: Reservation[];
  month: number;
  year: number;
  viewMode?: ViewMode;
}

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const QUARTERS_LABEL = ["Q1", "Q2", "Q3", "Q4"];

export function ReservationsList({ reservations, month, year, viewMode = "month" }: Props) {
  const active = reservations.filter((r) => r.status !== "Cancelada");
  const totalGross = active.reduce((s, r) => s + r.gross_amount, 0);
  const totalOwner = active.reduce((s, r) => s + r.owner_amount, 0);

  return (
    <div id="reservas" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#0F2B4C]/60 uppercase tracking-wider flex items-center gap-2">
          <CalendarDays size={14} />
          Reservas — {viewMode === "month" ? `${MONTHS_ES[month - 1]} ${year}` : `${QUARTERS_LABEL[Math.ceil(month / 3) - 1]} ${year}`}
        </h2>
        <span className="text-xs text-[#0F2B4C]/40">
          {active.length} reserva{active.length !== 1 ? "s" : ""}
        </span>
      </div>

      {reservations.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 sm:p-12 text-center">
          <Moon size={28} className="mx-auto text-[#0F2B4C]/15 mb-3" />
          <p className="text-sm text-[#0F2B4C]/40">No hay reservas registradas este mes.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reservations.map((r) => {
            const st = STATUS_CONFIG[r.status] ?? STATUS_CONFIG["Pendiente"];
            const Icon = st.icon;
            const cur = r.currency === "RD$" ? "RD$" : "$";
            return (
              <div key={r.id} className="bg-white rounded-xl border shadow-sm p-3 sm:p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  {/* Date + platform row on mobile */}
                  <div className="flex items-center gap-2 sm:gap-3 sm:min-w-[180px]">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#0F2B4C]/5 flex flex-col items-center justify-center shrink-0">
                      <CalendarDays size={14} className="text-[#0F2B4C]/40" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] sm:text-sm font-medium text-[#0F2B4C]">
                        {formatDate(r.checkin)} → {formatDate(r.checkout)}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-[#0F2B4C]/40">
                        <span className="flex items-center gap-0.5"><Moon size={10} /> {r.nights} noches</span>
                        <span className="flex items-center gap-0.5"><Users size={10} /> {r.guests}</span>
                      </div>
                    </div>
                  </div>

                  {/* Platform + status + amounts — wraps on mobile */}
                  <div className="flex items-center justify-between gap-2 sm:flex-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0F2B4C]/8 text-[#0F2B4C]/60 whitespace-nowrap">
                        {r.platform}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.text} whitespace-nowrap`}>
                        <Icon size={10} />
                        {st.label}
                      </span>
                      {r.payment_type && (
                        <span className="hidden sm:flex items-center gap-0.5 text-[10px] text-[#0F2B4C]/30">
                          <CreditCard size={9} />
                          {r.payment_type}
                        </span>
                      )}
                    </div>

                    {/* Amounts */}
                    <div className="flex items-center gap-3 sm:gap-6 text-right shrink-0">
                      <div>
                        <p className="text-[10px] text-[#0F2B4C]/40">Bruto</p>
                        <p className="text-xs sm:text-sm font-mono text-[#0F2B4C]/70">{fmt(r.gross_amount, cur)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-emerald-600/70">Tu ingreso</p>
                        <p className="text-xs sm:text-sm font-mono font-semibold text-emerald-700">{fmt(r.owner_amount, cur)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Totals bar */}
          <div className="bg-[#0F2B4C]/5 rounded-xl px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-medium text-[#0F2B4C]/50 shrink-0">
              Total ({active.length})
            </span>
            <div className="flex items-center gap-3 sm:gap-6 text-right">
              <div>
                <p className="text-[11px] sm:text-xs font-mono text-[#0F2B4C]/60">${totalGross.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-mono font-bold text-emerald-700">${totalOwner.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
