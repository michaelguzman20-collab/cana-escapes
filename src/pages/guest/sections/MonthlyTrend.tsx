import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";
import type { Reservation } from "@/types/database";

const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

interface Props {
  allReservations: Reservation[];
  ownerPct: number;
}

export function MonthlyTrend({ allReservations, ownerPct }: Props) {
  const data = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; month: number; year: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth() + 1}`,
        label: `${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        month: d.getMonth() + 1,
        year: d.getFullYear(),
      });
    }

    return months.map((m) => {
      const monthRes = allReservations.filter(
        (r) => r.period_month === m.month && r.period_year === m.year
          && r.status !== "Cancelada"
      );
      const toUSD = (r: Reservation, val: number) =>
        r.currency === "RD$" && r.exchange_rate > 0 ? val / r.exchange_rate : val;
      const bruto = monthRes.reduce((s, r) => s + toUSD(r, r.gross_amount), 0);
      const neto = monthRes.reduce((s, r) => s + toUSD(r, r.net_amount), 0);
      const tuIngreso = monthRes.reduce((s, r) => s + toUSD(r, r.owner_amount), 0);
      return { name: m.label, Bruto: +bruto.toFixed(2), Neto: +neto.toFixed(2), "Tu Ingreso": +tuIngreso.toFixed(2) };
    });
  }, [allReservations, ownerPct]);

  const hasData = data.some((d) => d.Bruto > 0);

  return (
    <div id="tendencia" className="space-y-3">
      <h2 className="text-sm font-semibold text-[#0F2B4C]/60 uppercase tracking-wider flex items-center gap-2">
        <TrendingUp size={14} />
        Tendencia 12 Meses
      </h2>
      <div className="bg-white rounded-xl border shadow-sm p-4 sm:p-6">
        {!hasData ? (
          <div className="h-48 flex items-center justify-center text-sm text-[#0F2B4C]/30">
            Sin datos suficientes para mostrar tendencia
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gBruto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2D6A9F" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2D6A9F" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gNeto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0F2B4C" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#0F2B4C" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOwner" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#0F2B4C10" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#0F2B4C80" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#0F2B4C60" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #0F2B4C15", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                formatter={(val: any) => [`$${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, undefined]}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="Bruto" stroke="#2D6A9F" strokeWidth={2} fill="url(#gBruto)" />
              <Area type="monotone" dataKey="Neto" stroke="#0F2B4C" strokeWidth={1.5} fill="url(#gNeto)" strokeDasharray="4 2" />
              <Area type="monotone" dataKey="Tu Ingreso" stroke="#059669" strokeWidth={2.5} fill="url(#gOwner)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
