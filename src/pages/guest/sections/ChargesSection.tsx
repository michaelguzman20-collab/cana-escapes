import { Receipt, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { Charge } from "@/types/database";
import { useMyChargeItems } from "@/hooks/useOwnerPortal";

function fmt(n: number, cur = "$") {
  return `${cur}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ChargeCard({ charge }: { charge: Charge }) {
  const [open, setOpen] = useState(false);
  const { data: items = [] } = useMyChargeItems(open ? charge.id : null);
  const cur = charge.currency === "RD$" ? "RD$" : "$";

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-[#0F2B4C]/[0.02] transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-[#F0A030]/10 flex items-center justify-center shrink-0">
          <Receipt size={15} className="text-[#F0A030]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#0F2B4C] truncate">{charge.description}</p>
          <p className="text-[11px] text-[#0F2B4C]/40">
            {charge.category} · {charge.date} · {charge.status}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-mono font-semibold text-[#0F2B4C]">{fmt(charge.amount, cur)}</p>
          {charge.amount_usd > 0 && charge.currency === "RD$" && (
            <p className="text-[10px] text-[#0F2B4C]/30 font-mono">${charge.amount_usd.toFixed(2)}</p>
          )}
        </div>
        <div className="text-[#0F2B4C]/30 shrink-0">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>
      {open && items.length > 0 && (
        <div className="border-t px-4 py-2 bg-[#0F2B4C]/[0.015]">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between py-1.5 text-[11px]">
              <span className="text-[#0F2B4C]/60">{it.description}</span>
              <span className="font-mono text-[#0F2B4C]/50">
                {it.quantity > 1 && `${it.quantity} × ${fmt(it.unit_price, cur)} = `}
                {fmt(it.total, cur)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  charges: Charge[];
}

export function ChargesSection({ charges }: Props) {
  const totalUSD = charges.reduce((s, c) => s + c.amount_usd, 0);

  return (
    <div id="cargos" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#0F2B4C]/60 uppercase tracking-wider flex items-center gap-2">
          <Receipt size={14} />
          Cargos
        </h2>
        {charges.length > 0 && (
          <span className="text-[10px] text-[#0F2B4C]/40">
            {charges.length} cargo{charges.length !== 1 ? "s" : ""} · Total ${totalUSD.toFixed(2)}
          </span>
        )}
      </div>

      {charges.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center">
          <Receipt size={28} className="mx-auto text-[#0F2B4C]/10 mb-2" />
          <p className="text-sm text-[#0F2B4C]/40">No hay cargos registrados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {charges.map((c) => (
            <ChargeCard key={c.id} charge={c} />
          ))}
        </div>
      )}
    </div>
  );
}
