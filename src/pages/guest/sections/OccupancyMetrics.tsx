import { Moon, TrendingUp, Clock, Globe } from "lucide-react";
import type { Reservation } from "@/types/database";
import type { ViewMode } from "./PortalHeader";

interface Props {
  reservations: Reservation[];
  month: number;
  year: number;
  viewMode?: ViewMode;
}

function MetricCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-3 sm:p-4">
      <div className="sm:flex sm:items-start sm:gap-3">
        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 mb-2 sm:mb-0 ${accent ?? "bg-[#0F2B4C]/5"}`}>
          <Icon size={14} className={`sm:w-4 sm:h-4 ${accent ? "text-white" : "text-[#0F2B4C]/40"}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] sm:text-[11px] font-medium text-[#0F2B4C]/50 uppercase tracking-wider leading-tight">{label}</p>
          <p className="text-sm sm:text-xl font-serif font-bold text-[#0F2B4C] mt-0.5 sm:mt-1 truncate">{value}</p>
          {sub && <p className="text-[9px] sm:text-[11px] text-[#0F2B4C]/40 mt-1 sm:mt-1.5 truncate">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export function OccupancyMetrics({ reservations, month, year, viewMode = "month" }: Props) {
  const confirmed = reservations.filter((r) => r.status === "Completada" || r.status === "Confirmada");

  const totalDays = viewMode === "month"
    ? new Date(year, month, 0).getDate()
    : (() => {
        const q = Math.ceil(month / 3);
        let d = 0;
        for (let m = (q - 1) * 3 + 1; m <= q * 3; m++) d += new Date(year, m, 0).getDate();
        return d;
      })();

  const nights = confirmed.reduce((s, r) => s + r.nights, 0);
  const occupancy = totalDays > 0 ? (nights / totalDays) * 100 : 0;

  const toUSD = (r: Reservation, val: number) =>
    r.currency === "RD$" && r.exchange_rate > 0 ? val / r.exchange_rate : val;
  const totalGrossUSD = confirmed.reduce((s, r) => s + toUSD(r, r.gross_amount), 0);
  const adr = nights > 0 ? totalGrossUSD / nights : 0;
  const avgStay = confirmed.length > 0
    ? confirmed.reduce((s, r) => s + r.nights, 0) / confirmed.length
    : 0;

  const platformCounts: Record<string, number> = {};
  for (const r of confirmed) {
    platformCounts[r.platform] = (platformCounts[r.platform] ?? 0) + 1;
  }
  const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div id="ocupacion" className="space-y-3">
      <h2 className="text-sm font-semibold text-[#0F2B4C]/60 uppercase tracking-wider flex items-center gap-2">
        <Moon size={14} />
        Métricas de Ocupación
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={Moon}
          label="Noches ocupadas"
          value={`${nights} / ${totalDays}`}
          sub={`${occupancy.toFixed(1)}% ocupación`}
          accent="bg-[#2D6A9F]"
        />
        <MetricCard
          icon={TrendingUp}
          label="ADR"
          value={`$${adr.toFixed(0)}`}
          sub="tarifa promedio / noche"
          accent="bg-[#0F2B4C]"
        />
        <MetricCard
          icon={Clock}
          label="Estancia promedio"
          value={`${avgStay.toFixed(1)} noches`}
          sub={`${confirmed.length} reservas confirmadas`}
        />
        <MetricCard
          icon={Globe}
          label="Plataforma líder"
          value={topPlatform ? topPlatform[0] : "—"}
          sub={topPlatform ? `${topPlatform[1]} reservas` : "sin datos"}
        />
      </div>
    </div>
  );
}
