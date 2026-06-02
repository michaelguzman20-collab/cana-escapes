import { DollarSign, TrendingDown, Wallet, Banknote, BarChart3 } from "lucide-react";
import type { Reservation, Bracket } from "@/types/database";

function fmt(n: number, cur = "$") {
  return `${cur}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface KpiProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
  iconBg: string;
}

function KpiCard({ icon: Icon, label, value, sub, color, iconBg }: KpiProps) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className={`h-1.5 ${color}`} />
      <div className="p-3 sm:p-5">
        <div className="sm:flex sm:items-center sm:gap-3">
          <div className={`shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2 sm:mb-0 ${iconBg}`}>
            <Icon size={14} className="text-white sm:w-[18px] sm:h-[18px]" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[11px] font-semibold text-[#0F2B4C]/40 uppercase tracking-wider leading-tight">{label}</p>
            <p className="text-base sm:text-2xl font-serif font-bold text-[#0F2B4C] tabular-nums leading-tight mt-0.5 sm:mt-1 truncate">{value}</p>
            {sub && <p className="text-[9px] sm:text-[11px] text-[#0F2B4C]/35 mt-1 sm:mt-1.5 truncate">{sub}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

interface Props {
  reservations: Reservation[];
  bracket: Bracket | null;
  referenceRate: number;
}

export function FinancialSummary({ reservations, bracket }: Props) {
  const confirmed = reservations.filter((r) => r.status === "Completada" || r.status === "Confirmada");
  const active = reservations.filter((r) => r.status !== "Cancelada");

  const toUSD = (r: Reservation, val: number) =>
    r.currency === "RD$" && r.exchange_rate > 0 ? val / r.exchange_rate : val;

  const grossUSD = confirmed.reduce((s, r) => s + toUSD(r, r.gross_amount), 0);
  const netUSD = confirmed.reduce((s, r) => s + toUSD(r, r.net_amount), 0);
  const ownerUSD = confirmed.reduce((s, r) => s + toUSD(r, r.owner_amount), 0);
  const deductions = grossUSD - netUSD;

  return (
    <div id="financiero" className="space-y-3">
      <h2 className="text-sm font-semibold text-[#0F2B4C]/60 uppercase tracking-wider flex items-center gap-2">
        <BarChart3 size={14} />
        Resumen Financiero
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={DollarSign}
          label="Ingreso bruto"
          value={fmt(grossUSD)}
          sub={`${active.length} reserva${active.length !== 1 ? "s" : ""} activas`}
          color="bg-[#2D6A9F]"
          iconBg="bg-[#2D6A9F]"
        />
        <KpiCard
          icon={TrendingDown}
          label="Deducciones"
          value={fmt(deductions)}
          sub="comisiones + fees"
          color="bg-rose-400"
          iconBg="bg-rose-400"
        />
        <KpiCard
          icon={Wallet}
          label="Neto"
          value={fmt(netUSD)}
          sub={bracket ? `Bracket: ${bracket.description}` : undefined}
          color="bg-[#0F2B4C]"
          iconBg="bg-[#0F2B4C]"
        />
        <KpiCard
          icon={Banknote}
          label="Tu ingreso"
          value={fmt(ownerUSD)}
          sub={bracket ? `${bracket.owner_pct}% del reparto` : undefined}
          color="bg-emerald-500"
          iconBg="bg-emerald-500"
        />
      </div>
    </div>
  );
}
