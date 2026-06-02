import { Landmark, CheckCircle2 } from "lucide-react";
import type { OwnerPayment } from "@/types/database";

const MONTHS_ES = [
  "Ene","Feb","Mar","Abr","May","Jun",
  "Jul","Ago","Sep","Oct","Nov","Dic",
];

function fmt(n: number, cur = "$") {
  return `${cur}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Props {
  payments: OwnerPayment[];
}

export function PaymentStatus({ payments }: Props) {
  const totalUSD = payments.reduce((s, p) => s + p.amount_paid_usd, 0);
  const totalRD = payments.reduce((s, p) => s + p.amount_paid_rd, 0);

  return (
    <div id="pagos" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#0F2B4C]/60 uppercase tracking-wider flex items-center gap-2">
          <Landmark size={14} />
          Pagos Recibidos
        </h2>
        {payments.length > 0 && (
          <span className="text-[10px] text-[#0F2B4C]/40">
            {payments.length} pago{payments.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {payments.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center">
          <Landmark size={28} className="mx-auto text-[#0F2B4C]/10 mb-2" />
          <p className="text-sm text-[#0F2B4C]/40">No hay pagos registrados aún.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={15} className="text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0F2B4C]">
                    {MONTHS_ES[p.period_month - 1]} {p.period_year}
                  </p>
                  <p className="text-[11px] text-[#0F2B4C]/40">
                    {p.payment_method} · {p.payment_date}
                    {p.reference && ` · Ref: ${p.reference}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {p.amount_paid_usd > 0 && (
                    <p className="text-sm font-mono font-semibold text-emerald-700">{fmt(p.amount_paid_usd)}</p>
                  )}
                  {p.amount_paid_rd > 0 && (
                    <p className="text-[11px] font-mono text-[#0F2B4C]/50">{fmt(p.amount_paid_rd, "RD$")}</p>
                  )}
                </div>
              </div>
              {p.notes && (
                <p className="text-[11px] text-[#0F2B4C]/35 mt-2 pl-12">{p.notes}</p>
              )}
            </div>
          ))}

          {/* Totals */}
          <div className="bg-emerald-50/50 rounded-xl border border-emerald-100 px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700/60">Total pagado</span>
            <div className="flex items-center gap-4 text-right">
              {totalUSD > 0 && <span className="text-xs font-mono font-bold text-emerald-700">{fmt(totalUSD)}</span>}
              {totalRD > 0 && <span className="text-xs font-mono text-emerald-600">{fmt(totalRD, "RD$")}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
