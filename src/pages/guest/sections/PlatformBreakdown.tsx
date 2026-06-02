import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import type { Reservation } from "@/types/database";

const COLORS = ["#2D6A9F", "#0F2B4C", "#F0A030", "#059669", "#8b5cf6", "#ec4899"];

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

interface Props {
  reservations: Reservation[];
  allReservations: Reservation[];
}

export function PlatformBreakdown({ reservations, allReservations }: Props) {
  const platformData = useMemo(() => {
    const active = reservations.filter((r) => r.status !== "Cancelada");
    const map: Record<string, { count: number; gross: number; nights: number }> = {};
    for (const r of active) {
      if (!map[r.platform]) map[r.platform] = { count: 0, gross: 0, nights: 0 };
      const toUSD = r.currency === "RD$" && r.exchange_rate > 0 ? r.gross_amount / r.exchange_rate : r.gross_amount;
      map[r.platform].count += 1;
      map[r.platform].gross += toUSD;
      map[r.platform].nights += r.nights;
    }
    return Object.entries(map)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.gross - a.gross);
  }, [reservations]);

  const monthlyByPlatform = useMemo(() => {
    const now = new Date();
    const months: { label: string; month: number; year: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const shortMonth = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
      months.push({ label: shortMonth[d.getMonth()], month: d.getMonth() + 1, year: d.getFullYear() });
    }

    const platforms = [...new Set(allReservations.filter(r => r.status !== "Cancelada").map(r => r.platform))];

    return months.map((m) => {
      const entry: Record<string, any> = { name: m.label };
      for (const p of platforms) {
        const pRes = allReservations.filter(
          (r) => r.period_month === m.month && r.period_year === m.year && r.platform === p && r.status !== "Cancelada"
        );
        const toUSD = (r: Reservation) => r.currency === "RD$" && r.exchange_rate > 0 ? r.gross_amount / r.exchange_rate : r.gross_amount;
        entry[p] = +pRes.reduce((s, r) => s + toUSD(r), 0).toFixed(0);
      }
      return entry;
    });
  }, [allReservations]);

  const platforms = [...new Set(allReservations.filter(r => r.status !== "Cancelada").map(r => r.platform))];
  const hasPlatformData = platformData.length > 0;
  const hasMonthlyData = monthlyByPlatform.some((m) => platforms.some((p) => (m[p] ?? 0) > 0));

  return (
    <div id="plataformas" className="space-y-3">
      <h2 className="text-sm font-semibold text-[#0F2B4C]/60 uppercase tracking-wider flex items-center gap-2">
        <PieIcon size={14} />
        Distribución por Plataforma
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Pie chart */}
        <div className="bg-white rounded-xl border shadow-sm p-4 sm:p-5">
          <p className="text-[11px] font-medium text-[#0F2B4C]/40 uppercase mb-3">Ingresos del mes</p>
          {!hasPlatformData ? (
            <div className="h-48 flex items-center justify-center text-sm text-[#0F2B4C]/20">Sin datos</div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <ResponsiveContainer width="100%" height={160} className="sm:!w-1/2">
                <PieChart>
                  <Pie
                    data={platformData}
                    dataKey="gross"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {platformData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [fmt(Number(val)), "Ingreso"]} contentStyle={{ fontSize: 11, borderRadius: 10 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full sm:flex-1 space-y-2">
                {platformData.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#0F2B4C] truncate">{p.name}</p>
                      <p className="text-[10px] text-[#0F2B4C]/35">{p.count} reservas · {p.nights} noches</p>
                    </div>
                    <span className="text-xs font-mono font-semibold text-[#0F2B4C]/70 shrink-0">{fmt(p.gross)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stacked bar chart - last 6 months by platform */}
        <div className="bg-white rounded-xl border shadow-sm p-4 sm:p-5">
          <p className="text-[11px] font-medium text-[#0F2B4C]/40 uppercase mb-3">Ingresos por plataforma (6 meses)</p>
          {!hasMonthlyData ? (
            <div className="h-48 flex items-center justify-center text-sm text-[#0F2B4C]/20">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyByPlatform} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0F2B4C08" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#0F2B4C80" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#0F2B4C50" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10 }} formatter={(val: any) => [fmt(Number(val)), undefined]} />
                {platforms.map((p, i) => (
                  <Bar key={p} dataKey={p} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === platforms.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
