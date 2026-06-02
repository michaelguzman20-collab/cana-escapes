import { Wrench, AlertTriangle, CheckCircle2, Clock, AlertCircle, Calendar, DollarSign } from "lucide-react";
import type { MaintenanceTicket } from "@/types/database";

const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Alta: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  Media: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  Baja: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
};

const STATUS_CONFIG: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
  Pendiente: { icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
  "En Proceso": { icon: AlertCircle, color: "text-blue-500", bg: "bg-blue-50" },
  Resuelto: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
  Cancelado: { icon: AlertTriangle, color: "text-gray-400", bg: "bg-gray-50" },
};

function fmtCost(n: number, currency: string) {
  const cur = currency === "DOP" ? "RD$" : "$";
  return `${cur}${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

interface Props {
  tickets: MaintenanceTicket[];
}

export function MaintenanceStatus({ tickets }: Props) {
  const activeTickets = tickets.filter((t) => t.estado !== "Resuelto");
  const resolvedTickets = tickets.filter((t) => t.estado === "Resuelto");
  const totalCostReal = tickets.reduce((s, t) => s + t.costo_real, 0);
  const totalCostEst = tickets.filter(t => t.costo_real === 0).reduce((s, t) => s + t.costo_estimado, 0);

  return (
    <div id="mantenimiento" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#0F2B4C]/60 uppercase tracking-wider flex items-center gap-2">
          <Wrench size={14} />
          Mantenimiento
        </h2>
        <span className="text-[10px] text-[#0F2B4C]/40">
          {activeTickets.length} activos · {resolvedTickets.length} resueltos
        </span>
      </div>

      {tickets.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center">
          <CheckCircle2 size={28} className="mx-auto text-emerald-300 mb-2" />
          <p className="text-sm text-[#0F2B4C]/40">No hay tickets de mantenimiento registrados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl border p-3 text-center">
              <p className="text-lg font-serif font-bold text-amber-600">{activeTickets.length}</p>
              <p className="text-[10px] text-[#0F2B4C]/40 font-medium">Activos</p>
            </div>
            <div className="bg-white rounded-xl border p-3 text-center">
              <p className="text-lg font-serif font-bold text-emerald-600">{resolvedTickets.length}</p>
              <p className="text-[10px] text-[#0F2B4C]/40 font-medium">Resueltos</p>
            </div>
            <div className="bg-white rounded-xl border p-3 text-center">
              <p className="text-lg font-serif font-bold text-[#0F2B4C]">
                {totalCostReal > 0 ? fmtCost(totalCostReal, "USD") : fmtCost(totalCostEst, "USD")}
              </p>
              <p className="text-[10px] text-[#0F2B4C]/40 font-medium">{totalCostReal > 0 ? "Costo real" : "Estimado"}</p>
            </div>
          </div>

          {/* Ticket list */}
          <div className="space-y-2">
            {tickets.map((t) => {
              const st = STATUS_CONFIG[t.estado] ?? STATUS_CONFIG["Pendiente"];
              const StIcon = st.icon;
              const prio = PRIORITY_COLORS[t.prioridad] ?? PRIORITY_COLORS["Media"];
              const cost = t.costo_real > 0 ? t.costo_real : t.costo_estimado;
              const costLabel = t.costo_real > 0 ? "Real" : "Est.";

              return (
                <div key={t.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${t.estado === "Resuelto" ? "opacity-60" : ""}`}>
                  <div className="flex items-stretch">
                    {/* Status indicator */}
                    <div className={`w-1 shrink-0 ${t.prioridad === "Alta" ? "bg-red-400" : t.prioridad === "Media" ? "bg-amber-400" : "bg-blue-300"}`} />

                    <div className="flex-1 p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-start gap-2.5">
                          <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${st.bg}`}>
                            <StIcon size={14} className={st.color} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#0F2B4C]">{t.titulo}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${prio.bg} ${prio.text} ${prio.border}`}>
                                {t.prioridad}
                              </span>
                              <span className="text-[10px] text-[#0F2B4C]/40">{t.categoria}</span>
                              <span className="text-[10px] text-[#0F2B4C]/40">{t.estado}</span>
                            </div>
                          </div>
                        </div>
                        {cost > 0 && (
                          <div className="text-right shrink-0">
                            <p className="text-sm font-mono font-semibold text-[#0F2B4C]">{fmtCost(cost, t.currency)}</p>
                            <p className="text-[9px] text-[#0F2B4C]/30">{costLabel}</p>
                          </div>
                        )}
                      </div>

                      {t.descripcion && (
                        <p className="text-[11px] text-[#0F2B4C]/45 mb-2 line-clamp-2 pl-9">{t.descripcion}</p>
                      )}

                      <div className="flex items-center gap-3 text-[10px] text-[#0F2B4C]/35 pl-9">
                        <span className="flex items-center gap-1">
                          <Calendar size={9} />
                          Reportado: {t.fecha_reporte}
                        </span>
                        {t.fecha_programada && (
                          <span className="flex items-center gap-1">
                            <Clock size={9} />
                            Programado: {t.fecha_programada}
                          </span>
                        )}
                        {t.fecha_resuelto && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 size={9} />
                            Resuelto: {t.fecha_resuelto}
                          </span>
                        )}
                        {t.tecnico_nombre && (
                          <span className="hidden sm:inline">Técnico: {t.tecnico_nombre}</span>
                        )}
                      </div>

                      {t.asignacion_costo && (
                        <div className="flex items-center gap-1 text-[10px] mt-1.5 pl-9">
                          <DollarSign size={9} className="text-[#0F2B4C]/25" />
                          <span className="text-[#0F2B4C]/30">
                            Cargo a: {t.asignacion_costo === "cana_escapes" ? "Cana Escapes" : "Propietario"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
